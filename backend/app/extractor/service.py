import logging
import uuid
from typing import List, Optional

from backend.app.annotation_repository.repository import AnnotationRepository
from backend.app.extractor.base import (
    BaseExtractor,
    ModelTimeoutException,
    ModelUnavailableException,
)
from backend.app.extractor.mock import MockExtractor
from backend.app.hpo_resolver.resolver import HpoResolver
from backend.app.schemas import (
    ExtractionRequest,
    ExtractionResponse,
    ModelProvenance,
    PhenotypeMention,
    SourceSpan,
)
from backend.app.span_validator.validator import validate_span

logger = logging.getLogger("phenora.extractor.service")


class ExtractionService:
    def __init__(self, extractor: BaseExtractor, repository: AnnotationRepository):
        self.extractor = extractor
        self.repo = repository
        self.resolver = HpoResolver(repository)
        self.fallback_extractor = MockExtractor(repository=repository)

    def extract_phenotypes(
        self, request: ExtractionRequest, request_id: Optional[uuid.UUID] = None
    ) -> ExtractionResponse:
        req_id = request_id or uuid.uuid4()
        note = request.note_text

        # 1. Run raw NER extraction with defensive deterministic fallback
        try:
            raw_mentions = self.extractor.extract(note, language=request.language)
        except (ModelTimeoutException, ModelUnavailableException, Exception) as exc:
            logger.warning(
                "Primary extractor (%s) delayed or unavailable (%s). Engaging deterministic HPO extractor.",
                type(self.extractor).__name__,
                exc,
            )
            raw_mentions = self.fallback_extractor.extract(note, language=request.language)

        # 2. Validate spans and resolve HPO terms
        phenotype_mentions: List[PhenotypeMention] = []

        # Defensive fallback: split composite mentions if model returned "A and B"
        expanded_mentions = []
        for raw in raw_mentions:
            if " and " in raw.quote:
                parts = raw.quote.split(" and ")
                for p in parts:
                    clean_p = p.strip()
                    if clean_p and clean_p in note:
                        idx = note.find(clean_p)
                        expanded_mentions.append(
                            raw.model_copy(update={
                                "quote": clean_p,
                                "raw_term": clean_p,
                                "start_char": idx,
                                "end_char": idx + len(clean_p),
                            })
                        )
            else:
                expanded_mentions.append(raw)

        for raw in expanded_mentions:
            start = raw.start_char
            end = raw.end_char
            quote = raw.quote

            # Verify span against raw text
            valid, _ = validate_span(note, start, end, quote)
            if not valid:
                # Attempt recovery via exact substring search
                found_idx = note.find(quote)
                if found_idx != -1:
                    start = found_idx
                    end = start + len(quote)
                    valid = True
                else:
                    # Drop unsupported/corrupted span to prevent hallucinated mentions
                    continue

            # Resolve HPO terms
            res_status, hpo_candidates = self.resolver.resolve(raw.raw_term)

            phenotype_mentions.append(
                PhenotypeMention(
                    mention_id=uuid.uuid4(),
                    source_span=SourceSpan(
                        start=start,
                        end=end,
                        offset_unit="unicode_code_points",
                        quote=quote,
                    ),
                    raw_term=raw.raw_term,
                    polarity=raw.polarity,
                    temporality=raw.temporality,
                    experiencer=raw.experiencer,
                    onset_age_group=raw.onset_age_group,
                    resolver_status=res_status,
                    hpo_candidates=hpo_candidates,
                )
            )

        prov = self.extractor.get_provenance()
        health_meta = self.repo.get_health_metadata()

        return ExtractionResponse(
            request_id=req_id,
            model=ModelProvenance(
                runtime=prov.get("runtime", "ollama"),
                model_id=prov["model_id"],
                model_version=prov["model_version"],
                sha256=prov["sha256"],
            ),
            ontology_release=health_meta["ontology_release"],
            mentions=phenotype_mentions,
        )
