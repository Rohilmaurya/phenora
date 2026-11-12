# Phenora Backend — API Flow

**Version:** 0.2  
**Status:** Hackathon backend-only flow  
**Related docs:** [PRD](./PRD.md) · [TRD](./TRD.md) · [OpenAPI contract](./contracts/openapi.json)

## 1. Scope

This document describes backend lifecycle and API request flow only. The hackathon build has no Next.js screens, browser state, graph canvas, or clinician-facing UI. Developers and judges exercise the service with Swagger/OpenAPI, an HTTP client, and synthetic cases. A future frontend may consume the same API.

The backend does not combine extraction and matching into one call. The API consumer must inspect and review extraction output between calls. `review_status` is the caller's attestation; the backend can authenticate and audit who submitted it, but cannot prove that a human actually reviewed the term without a client workflow.

## 2. Backend lifecycle

```mermaid
stateDiagram-v2
  [*] --> LoadingConfig
  LoadingConfig --> VerifyingArtifacts
  VerifyingArtifacts --> Ready: model/data manifests valid
  VerifyingArtifacts --> Degraded: model unavailable, data usable
  VerifyingArtifacts --> Unavailable: data missing or hash mismatch
  Ready --> HandlingRequest
  Degraded --> HandlingRequest: health/manual routes
  HandlingRequest --> Ready: request complete; transient note discarded
  HandlingRequest --> Degraded: model failure; no remote fallback
  Unavailable --> VerifyingArtifacts: operator activates verified pack
```

On startup, load configuration, verify model/data manifests and checksums, validate release compatibility, build/load SQLite indexes, and publish readiness. If data integrity fails, matching is unavailable. If only the model is unavailable, manual term search and matching remain usable.

## 3. API workflow

```mermaid
sequenceDiagram
  actor Operator as Clinician / hackathon operator
  participant Client as Swagger / HTTP client / Web UI
  participant IdP as Local identity provider
  participant API as FastAPI backend
  participant OCR as Local OCR / Doc Parser
  participant Model as Local model runtime
  participant Data as Local HPO/data pack

  Client->>API: GET /v1/health (no token)
  API-->>Client: readiness + active model/data IDs + releases
  Operator->>IdP: Authenticate locally
  IdP-->>Client: Short-lived bearer token

  alt Document Ingestion (PDF / Scanned Note / Image)
    Operator->>Client: Upload document file (PDF, PNG, JPG, TIFF)
    Client->>API: POST /v1/documents/extract-text (token + multipart file)
    API->>OCR: In-memory stream parse (no disk persistence)
    OCR-->>API: Extracted text, page count, confidence warnings
    API-->>Client: Text stream (Cache-Control: no-store)
    Operator->>Client: Review & verify extracted text in note canvas
  else Direct Text Entry
    Operator->>Client: Type or paste synthetic note text
  end

  Client->>API: POST /v1/extractions (token + note text)
  API->>Model: Extract source-grounded mentions only
  Model-->>API: Structured candidate mentions
  API->>API: Validate quote/offset and output schema
  API->>Data: Resolve HPO labels and synonyms
  Data-->>API: HPO candidates + resolution status
  API-->>Client: Mentions, context, spans, HPO candidates, provenance
  Operator->>Client: Inspect output and decide corrections/confirmations
  Client->>API: POST /v1/terms/search (optional, token + JSON body)
  Data-->>API: HPO term results
  API-->>Client: Search results
  Operator->>Client: Submit only reviewed observations
  Client->>API: POST /v1/matches (token + reviewed IDs/context; no note)
  API->>Data: Validate IDs and query pinned annotations/DAG
  API->>API: Compute deterministic ordering and evidence
  API-->>Client: Candidate ranks, graph nodes/edges, paths, provenance, excluded/unmatched terms
```

## 4. Endpoint flow

### A. Readiness — `GET /v1/health`

- No bearer token; expose only readiness, API version, extractor status, active pack IDs, model ID/version, and HPO releases.
- Do not expose machine names, file paths, environment variables, or local runtime details.
- `503` means required data is absent or invalid; matching must remain blocked.

### B. Authentication

- The API consumer obtains a short-lived token from the identity provider inside the isolated network; the backend does not contact a public identity service.
- All term search, extraction, and matching routes require bearer authentication and authorization.
- Development/mock identity is restricted to synthetic fixtures and must be disabled in runtime profile.
- The backend writes an audit event containing authenticated actor, time, request ID, action, and model/data manifest IDs. It records no note, quote, or phenotype list.

### B.1 Document Ingestion & Local OCR — `POST /v1/documents/extract-text`

1. Clinician uploads an electronic referral or scanned document (`PDF`, `PNG`, `JPEG`, `TIFF`).
2. Payload is streamed directly into an in-memory buffer (`io.BytesIO`); strictly zero disk writes or `/tmp` caching.
3. Dual-engine parser:
   - If digital PDF with text layers: extracts clean text streams directly via native parser (`pypdf` / `pymupdf`).
   - If image or scanned PDF: passes in-memory image buffers to local air-gapped OCR (`pytesseract` or `rapidocr_onnxruntime`).
4. Response returns extracted raw text, detected MIME type, page count, and confidence warnings with `Cache-Control: no-store`.
5. Extracted text is presented on the client's clinical note canvas for clinician review/editing *before* triggering NER extraction.

### C. Extraction — `POST /v1/extractions`

1. Validate bearer token, content type, request size, and input schema.
2. Keep the note in memory only and send it to the configured local model adapter.
3. Normalize model output to the fixed extraction schema; reject disease suggestions, ranks, scores, extra text, and unsupported fields.
4. Verify each quote and zero-based Unicode code-point span against the submitted note.
5. Resolve proposed labels against local HPO data; return exact/synonym/ambiguous/unmapped state and candidates.
6. Return `Cache-Control: no-store`, model provenance, ontology release, mention IDs, context, and source spans.
7. Discard request buffers after response handling. Do not log request or response bodies.

The API response contains suggestions only. The client/operator must review polarity, temporality, experiencer, onset age, and term mapping before the next call.

### D. Optional manual term search — `POST /v1/terms/search`

- Validate token and bounded JSON query. Search only the pinned local ontology labels/synonyms.
- Search text is in the request body, not a URL/query string. Request-body logging remains disabled.
- Return term IDs, canonical labels, match kind, and ontology release. Empty results are valid.

### E. Matching — `POST /v1/matches`

1. Validate token, input schema, observation count, review status, and every HPO ID against the active ontology release.
2. Reject unknown/obsolete IDs; never guess.
3. Use only confirmed positive observations about the patient for v1 ranking. Return negated, uncertain, historical, unknown-experiencer, and family-history observations as excluded context.
4. Load only the active local annotation pack and compute `hpo_semantic_coverage_v1` deterministically.
5. Return ordinal candidates with matched observation IDs, disease annotation terms, ontology relationships/paths, annotation references, method ID, data release/hash, excluded observations, and unmatched observations.
6. Return `no_candidates` if no condition has positive evidence support; do not force a top candidate.
7. Do not return a numeric similarity/probability or diagnosis. Do not persist the request.

## 5. Human review boundary in a backend-only build

The backend enforces **separation of API calls**, not a visual review workflow. For the hackathon demonstration:

1. Operator submits a synthetic note through Swagger/HTTP client.
2. Operator reads the extraction response and checks source spans, negation, experiencer, age context, and HPO mapping.
3. Operator manually constructs the reviewed observation request, including `review_status` and source mention IDs.
4. Operator submits the reviewed request to `/v1/matches` and inspects the evidence response.

The test scripts must not auto-copy extracted terms into the match request without a deliberate review/confirmation step. This documents the trust boundary and demonstrates backend behavior; it is not a substitute for the future clinician review UI.

## 6. Error and recovery flow

| Condition | API result | Caller action |
|---|---|---|
| Missing/invalid token | 401/403; no processing | Authenticate with local identity provider |
| Model unavailable/timeout | Explicit 503/504; no remote fallback | Continue with manual term search and reviewed HPO IDs |
| Invalid JSON or unsupported model fields | Error; no extraction suggestions accepted | Fix pack/prompt or use manual mode |
| Quote/offset mismatch | Extraction rejected or mention flagged invalid | Do not submit that mention to matching |
| Ambiguous/unmapped term | Return status and candidate set/empty set | Choose via term search or omit |
| Unknown/obsolete ID | 422 validation error | Resolve against active HPO release |
| Missing/hash-mismatched data pack | 503; matching blocked | Operator stages and activates a verified pack |
| No evidence support | 200 with `status: no_candidates` | Report no match in this data pack |
| Capacity limit | 429 with bounded retry hint | Retry after delay or reduce request size |
| Client disconnect | Stop work where safe; discard transient input | Caller explicitly retries if needed |

## 7. Synthetic backend demo script

1. Start the backend, local model runtime, local test identity provider, and verified HPO data pack.
2. Block outbound network access and call `GET /v1/health`; confirm local readiness and active artifact IDs.
3. Obtain a test bearer token from the local identity provider.
4. Submit one short synthetic case and one longer synthetic case to `/v1/extractions`.
5. Review returned source quotes, spans, polarity, experiencer, onset-age group, and HPO mappings manually.
6. Call `/v1/terms/search` for one manual correction or addition.
7. Submit only the reviewed observations to `/v1/matches`; inspect rank evidence, annotation source, `graph.nodes`/`graph.edges`, and provenance.
8. Stop the model runtime and repeat matching using manual HPO terms; verify extraction failure does not block local matching.
9. Run the same match request again and confirm deterministic ordering under the same model/data manifests.
10. Confirm logs/audit records contain actor/request/artifact metadata only and no note content.

## 8. API-flow acceptance checklist

- Readiness works without exposing sensitive host details.
- Protected endpoints fail closed without local authentication.
- Extraction and matching remain separate; no extraction response is implicitly treated as reviewed.
- Extraction verifies exact source spans and returns context for human review.
- Manual term lookup works locally with the Internet disconnected.
- Match requests contain reviewed HPO observations only; raw note text is rejected by schema.
- Results are deterministic and include evidence paths/provenance, not probabilities.
- Model failure leaves manual matching available; data corruption blocks matching.
- No request/response body is persisted, cached, or logged.
- Larger compatible model/data manifests can be substituted without backend/API code changes and pass pack validation gates.
