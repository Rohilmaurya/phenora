import re
from typing import List, Tuple

from backend.app.annotation_repository.repository import AnnotationRepository
from backend.app.schemas import HpoTerm, MatchKind, ResolverStatus


class HpoResolver:
    def __init__(self, repository: AnnotationRepository):
        self.repo = repository

    def resolve(self, raw_term: str) -> Tuple[ResolverStatus, List[HpoTerm]]:
        """Resolves an extracted clinical mention text to candidate HPO terms."""
        cleaned = re.sub(r"^[^\w]+|[^\w]+$", "", raw_term.strip().lower())
        if not cleaned:
            return ResolverStatus.unmapped, []

        raw_results = self.repo.search_terms(cleaned, limit=5)
        if not raw_results:
            return ResolverStatus.unmapped, []

        candidates: List[HpoTerm] = []
        for r in raw_results:
            kind = MatchKind(r["match_kind"])
            candidates.append(HpoTerm(hpo_id=r["hpo_id"], label=r["label"], match_kind=kind))

        # Check for exact matches
        exact_matches = [c for c in candidates if c.match_kind == MatchKind.exact_label]
        synonym_matches = [c for c in candidates if c.match_kind == MatchKind.synonym]

        if len(exact_matches) == 1:
            return ResolverStatus.exact, candidates
        elif len(exact_matches) > 1:
            return ResolverStatus.ambiguous, candidates
        elif len(synonym_matches) == 1:
            return ResolverStatus.synonym, candidates
        elif len(synonym_matches) > 1:
            return ResolverStatus.ambiguous, candidates
        elif len(candidates) > 1:
            return ResolverStatus.ambiguous, candidates
        elif len(candidates) == 1:
            return ResolverStatus.synonym, candidates

        return ResolverStatus.unmapped, []
