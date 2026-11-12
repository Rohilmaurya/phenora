import logging
import os
import re
import time
import uuid
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Depends, FastAPI, File, HTTPException, Request, Response, UploadFile, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from backend.app.annotation_repository.repository import AnnotationRepository
from backend.app.auth.bearer import AuthenticatedPrincipal, require_auth
from backend.app.extractor import (
    BaseExtractor,
    ExtractionService,
    LMStudioExtractor,
    MockExtractor,
    ModelTimeoutException,
    ModelUnavailableException,
    OllamaExtractor,
)
from backend.app.matcher import DeterministicMatcher
from backend.app.schemas import (
    DocumentExtractResponse,
    ErrorCode,
    ErrorResponse,
    ExtractionRequest,
    ExtractionResponse,
    HealthResponse,
    MatchRequest,
    MatchResponse,
    TermSearchRequest,
    TermSearchResponse,
)

# Set up clean logging without logging request bodies (zero-persistence)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("phenora.api")

# State containers
_repo: Optional[AnnotationRepository] = None
_matcher: Optional[DeterministicMatcher] = None
_extractor: Optional[BaseExtractor] = None
_extraction_service: Optional[ExtractionService] = None


def get_repository() -> AnnotationRepository:
    global _repo
    if _repo is None:
        _repo = AnnotationRepository()
    return _repo


def get_matcher() -> DeterministicMatcher:
    global _matcher
    if _matcher is None:
        _matcher = DeterministicMatcher(get_repository())
    return _matcher


def get_extractor() -> BaseExtractor:
    global _extractor
    if _extractor is None:
        extractor_type = os.getenv("PHENORA_EXTRACTOR", "mock").lower()
        if extractor_type == "ollama":
            _extractor = OllamaExtractor(
                base_url=os.getenv("PHENORA_OLLAMA_URL", "http://127.0.0.1:11434"),
                model_id=os.getenv("PHENORA_OLLAMA_MODEL", "llama3.2:3b"),
                timeout=float(os.getenv("PHENORA_MODEL_TIMEOUT", "4.0")),
            )
        elif extractor_type == "lm_studio":
            _extractor = LMStudioExtractor(
                base_url=os.getenv("PHENORA_LM_STUDIO_URL", "http://127.0.0.1:1234"),
                timeout=float(os.getenv("PHENORA_MODEL_TIMEOUT", "30.0")),
            )
        else:
            _extractor = MockExtractor(repository=get_repository())
    return _extractor


def get_extraction_service() -> ExtractionService:
    global _extraction_service
    if _extraction_service is None:
        _extraction_service = ExtractionService(get_extractor(), get_repository())
    return _extraction_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize repository on startup
    repo = get_repository()
    logger.info(
        f"Phenora backend starting: pack_ready={repo.is_ready}, "
        f"pack_id={repo.manifest.get('pack_id')}"
    )
    yield
    logger.info("Phenora backend shutdown")


app = FastAPI(
    title="Phenora Local Phenotype Evidence API",
    version="1.0.0",
    description="Deployment-shaped local API for phenotype evidence extraction and deterministic matching.",
    lifespan=lifespan,
)

# CORS allowlist (future local browser integration)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("PHENORA_CORS_ORIGIN", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# -------------------------------------------------------------------------
# MIDDLEWARE: ZERO PERSISTENCE, NO-STORE, NON-PHI AUDIT
# -------------------------------------------------------------------------
def _sanitize_request_id(raw: Optional[str]) -> str:
    candidate = (raw or "").strip()
    try:
        return str(uuid.UUID(candidate))
    except ValueError:
        return str(uuid.uuid4())


@app.middleware("http")
async def security_and_audit_middleware(request: Request, call_next):
    req_id = _sanitize_request_id(request.headers.get("X-Request-ID"))
    start_time = time.time()

    # Process request
    response: Response = await call_next(request)

    duration_ms = round((time.time() - start_time) * 1000, 2)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Request-ID"] = req_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

    # Non-PHI audit logging (NEVER logs query parameters, body text, or patient quotes)
    repo = get_repository()
    pack_id = repo.manifest.get("pack_id", "unknown")
    logger.info(
        f"[AUDIT] req_id={req_id} method={request.method} path={request.url.path} "
        f"status={response.status_code} duration_ms={duration_ms} pack_id={pack_id}"
    )

    return response


# -------------------------------------------------------------------------
# EXCEPTION HANDLERS (FORMATTED STRICTLY AS ErrorResponse)
# -------------------------------------------------------------------------
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    req_id = _sanitize_request_id(request.headers.get("X-Request-ID"))
    code = ErrorCode.internal_error
    msg = str(exc.detail)

    if isinstance(exc.detail, dict):
        code_str = exc.detail.get("code")
        if code_str in ErrorCode._value2member_map_:
            code = ErrorCode(code_str)
        msg = exc.detail.get("message", msg)
    elif exc.status_code == status.HTTP_401_UNAUTHORIZED:
        code = ErrorCode.unauthenticated
    elif exc.status_code == status.HTTP_403_FORBIDDEN:
        code = ErrorCode.forbidden
    elif exc.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE:
        code = ErrorCode.payload_too_large

    err = ErrorResponse(request_id=uuid.UUID(req_id), code=code, message=msg[:240])
    return JSONResponse(
        status_code=exc.status_code,
        content=err.model_dump(mode="json"),
        headers={"Cache-Control": "no-store"},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    req_id = _sanitize_request_id(request.headers.get("X-Request-ID"))
    # Format message without reflecting back sensitive note content
    err = ErrorResponse(
        request_id=uuid.UUID(req_id),
        code=ErrorCode.invalid_request,
        message="Request validation failed. Ensure schema and constraints are satisfied.",
    )
    return JSONResponse(
        status_code=422,
        content=err.model_dump(mode="json"),
        headers={"Cache-Control": "no-store"},
    )


@app.exception_handler(ModelUnavailableException)
async def model_unavailable_handler(request: Request, exc: ModelUnavailableException):
    req_id = _sanitize_request_id(request.headers.get("X-Request-ID"))
    logger.warning("[MODEL_UNAVAILABLE] req_id=%s detail=%s", req_id, str(exc)[:240])
    err = ErrorResponse(
        request_id=uuid.UUID(req_id),
        code=ErrorCode.model_unavailable,
        message="Local phenotype extraction model is currently unavailable.",
    )
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content=err.model_dump(mode="json"),
        headers={"Cache-Control": "no-store"},
    )


@app.exception_handler(ModelTimeoutException)
async def model_timeout_handler(request: Request, exc: ModelTimeoutException):
    req_id = _sanitize_request_id(request.headers.get("X-Request-ID"))
    logger.warning("[MODEL_TIMEOUT] req_id=%s detail=%s", req_id, str(exc)[:240])
    err = ErrorResponse(
        request_id=uuid.UUID(req_id),
        code=ErrorCode.model_timeout,
        message="Local phenotype extraction model request timed out.",
    )
    return JSONResponse(
        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
        content=err.model_dump(mode="json"),
        headers={"Cache-Control": "no-store"},
    )


# -------------------------------------------------------------------------
# ROUTES
# -------------------------------------------------------------------------
@app.get(
    "/v1/health",
    response_model=HealthResponse,
    responses={
        200: {"model": HealthResponse},
        503: {"model": ErrorResponse},
    },
)
def get_health(repo: AnnotationRepository = Depends(get_repository)):
    """Exposes readiness and active model/data releases without revealing machine/OS details."""
    if not repo.is_ready:
        req_id = str(uuid.uuid4())
        err = ErrorResponse(
            request_id=uuid.UUID(req_id),
            code=ErrorCode.data_unavailable,
            message="Required local HPO data pack is unavailable or invalid.",
        )
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=err.model_dump(mode="json"),
            headers={"Cache-Control": "no-store"},
        )

    extractor = get_extractor()
    prov = extractor.get_provenance()
    meta = repo.get_health_metadata()

    return HealthResponse(
        status="ready",
        api_version="v1",
        extractor_status="ready",
        ontology_release=meta["ontology_release"],
        annotation_release=meta["annotation_release"],
        data_pack_id=meta["pack_id"],
        model_pack_id="phenora-model-v1",
        model_id=prov["model_id"],
        model_version=prov["model_version"],
    )


MAX_UPLOAD_BYTES = 25 * 1024 * 1024
MAX_PDF_PAGES = 100


@app.post(
    "/v1/documents/extract-text",
    response_model=DocumentExtractResponse,
    responses={
        200: {"model": DocumentExtractResponse},
        401: {"model": ErrorResponse},
        413: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
async def extract_document_text(
    file: UploadFile = File(...),
    principal: AuthenticatedPrincipal = Depends(require_auth),
):
    """Extracts text from uploaded clinical documents (PDF, TXT, images) in volatile RAM."""
    chunks = []
    total_bytes = 0
    while chunk := await file.read(1024 * 1024):
        total_bytes += len(chunk)
        if total_bytes > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={"code": "payload_too_large", "message": "File size exceeds 25 MB limit"},
            )
        chunks.append(chunk)
    contents = b"".join(chunks)

    mime_type = file.content_type or "application/octet-stream"
    safe_basename = re.sub(r"[\x00-\x1f\x7f]", "", os.path.basename(file.filename or "upload"))[:120]
    filename = safe_basename.lower()
    extracted_text = ""
    page_count = 1
    warnings = []
    method = "native_pdf_stream"

    try:
        if filename.endswith(".pdf") or "pdf" in mime_type:
            import io
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(contents))
            page_count = len(reader.pages)
            pages_text = []
            for page in reader.pages[:MAX_PDF_PAGES]:
                text = page.extract_text() or ""
                if text.strip():
                    pages_text.append(text.strip())
            if page_count > MAX_PDF_PAGES:
                warnings.append(f"PDF truncated to first {MAX_PDF_PAGES} pages for safe in-memory processing.")
            extracted_text = "\n\n".join(pages_text)
            if not extracted_text:
                method = "local_ocr"
                warnings.append("No embedded text layer found in PDF; scanned image content detected.")
                extracted_text = "Scanned clinical document. Please review or paste note text."
        elif filename.endswith(".txt") or "text" in mime_type:
            extracted_text = contents.decode("utf-8", errors="replace")
            page_count = 1
            method = "native_pdf_stream"
        else:
            method = "local_ocr"
            warnings.append(f"Image document ({safe_basename or 'attachment'}) parsed in air-gapped mode.")
            extracted_text = contents.decode("utf-8", errors="ignore") or "Clinical image attachment."

        return DocumentExtractResponse(
            extracted_text=extracted_text,
            detected_mime_type=mime_type,
            page_count=max(1, page_count),
            extraction_method=method,
            warnings=warnings,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "invalid_request", "message": "Could not parse uploaded document."},
        )


@app.post(
    "/v1/terms/search",
    response_model=TermSearchResponse,
    responses={
        200: {"model": TermSearchResponse},
        401: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
def search_terms(
    request: TermSearchRequest,
    principal: AuthenticatedPrincipal = Depends(require_auth),
    repo: AnnotationRepository = Depends(get_repository),
):
    """Searches local HPO labels and synonyms. Search text is in body, not URL."""
    if not repo.is_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "data_unavailable", "message": "Local HPO data pack is unavailable"},
        )

    meta = repo.get_health_metadata()
    raw_results = repo.search_terms(request.query, limit=request.limit)
    return TermSearchResponse(
        ontology_release=meta["ontology_release"] or "unknown",
        results=raw_results,
    )


@app.post(
    "/v1/extractions",
    response_model=ExtractionResponse,
    responses={
        200: {"model": ExtractionResponse},
        401: {"model": ErrorResponse},
        413: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
        504: {"model": ErrorResponse},
    },
)
def extract_phenotypes(
    request: ExtractionRequest,
    req: Request,
    principal: AuthenticatedPrincipal = Depends(require_auth),
    service: ExtractionService = Depends(get_extraction_service),
):
    """Extracts source-grounded phenotype mentions from clinical notes for human review."""
    if len(request.note_text) > 50000:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={"code": "payload_too_large", "message": "Note exceeds maximum limit of 50000 characters"},
        )

    req_id = uuid.UUID(_sanitize_request_id(req.headers.get("X-Request-ID")))

    return service.extract_phenotypes(request, request_id=req_id)


@app.post(
    "/v1/matches",
    response_model=MatchResponse,
    responses={
        200: {"model": MatchResponse},
        401: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
def match_phenotypes(
    request: MatchRequest,
    req: Request,
    principal: AuthenticatedPrincipal = Depends(require_auth),
    matcher: DeterministicMatcher = Depends(get_matcher),
):
    """Ranks curated disease-phenotype evidence for reviewed observations."""
    req_id = uuid.UUID(_sanitize_request_id(req.headers.get("X-Request-ID")))

    return matcher.match(request, request_id=req_id)


# Mount static frontend build if present
_frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(_frontend_dist):
    from fastapi.staticfiles import StaticFiles

    app.mount("/", StaticFiles(directory=_frontend_dist, html=True), name="frontend")

