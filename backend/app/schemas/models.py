from enum import Enum
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ErrorCode(str, Enum):
    unauthenticated = "unauthenticated"
    forbidden = "forbidden"
    invalid_request = "invalid_request"
    payload_too_large = "payload_too_large"
    model_unavailable = "model_unavailable"
    model_timeout = "model_timeout"
    data_unavailable = "data_unavailable"
    rate_limited = "rate_limited"
    internal_error = "internal_error"


class Polarity(str, Enum):
    present = "present"
    negated = "negated"
    uncertain = "uncertain"


class Temporality(str, Enum):
    current = "current"
    historical = "historical"
    onset = "onset"
    unknown = "unknown"


class Experiencer(str, Enum):
    patient = "patient"
    family_member = "family_member"
    unknown = "unknown"


class OnsetAgeGroup(str, Enum):
    prenatal = "prenatal"
    congenital = "congenital"
    neonatal_0_28_days = "neonatal_0_28_days"
    infancy_29_days_to_1_year = "infancy_29_days_to_1_year"
    early_childhood_1_to_5_years = "early_childhood_1_to_5_years"
    later_childhood_6_to_11_years = "later_childhood_6_to_11_years"
    adolescence_12_to_17_years = "adolescence_12_to_17_years"
    unknown = "unknown"


class ResolverStatus(str, Enum):
    exact = "exact"
    synonym = "synonym"
    ambiguous = "ambiguous"
    unmapped = "unmapped"


class MatchKind(str, Enum):
    exact_label = "exact_label"
    synonym = "synonym"
    lexical = "lexical"


class ReviewStatus(str, Enum):
    confirmed = "confirmed"
    corrected = "corrected"
    manual = "manual"


class Relation(str, Enum):
    exact = "exact"
    annotation_ancestor = "annotation_ancestor"
    case_term_ancestor = "case_term_ancestor"
    shared_ancestor = "shared_ancestor"


class ExcludedReason(str, Enum):
    negated_not_scored_in_v1 = "negated_not_scored_in_v1"
    uncertain_not_scored_in_v1 = "uncertain_not_scored_in_v1"
    family_history_not_scored_in_v1 = "family_history_not_scored_in_v1"
    unknown_experiencer_not_scored_in_v1 = "unknown_experiencer_not_scored_in_v1"
    historical_not_scored_in_v1 = "historical_not_scored_in_v1"


# Base model with extra="forbid" matching OpenAPI additionalProperties: false
class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ErrorResponse(StrictModel):
    request_id: UUID
    code: ErrorCode
    message: str = Field(..., max_length=240)


class HealthResponse(StrictModel):
    status: Literal["ready", "degraded", "unavailable"]
    api_version: Literal["v1"] = "v1"
    extractor_status: Literal["ready", "disabled", "unavailable"]
    ontology_release: Optional[str] = Field(None, max_length=40)
    annotation_release: Optional[str] = Field(None, max_length=40)
    data_pack_id: Optional[str] = Field(None, max_length=100)
    model_pack_id: Optional[str] = Field(None, max_length=100)
    model_id: Optional[str] = Field(None, max_length=120)
    model_version: Optional[str] = Field(None, max_length=80)


class ModelProvenance(StrictModel):
    runtime: Literal["ollama", "lm_studio"]
    model_id: str = Field(..., max_length=120)
    model_version: str = Field(..., max_length=80)
    sha256: str = Field(..., pattern=r"^[a-f0-9]{64}$")


class SourceSpan(StrictModel):
    start: int = Field(..., ge=0)
    end: int = Field(..., ge=1)
    offset_unit: Literal["unicode_code_points"] = "unicode_code_points"
    quote: str = Field(..., min_length=1, max_length=500)


class HpoTerm(StrictModel):
    hpo_id: str = Field(..., pattern=r"^HP:[0-9]{7}$")
    label: str = Field(..., min_length=1, max_length=200)
    match_kind: MatchKind


class PhenotypeMention(StrictModel):
    mention_id: UUID
    source_span: SourceSpan
    raw_term: str = Field(..., min_length=1, max_length=200)
    polarity: Polarity
    temporality: Temporality
    experiencer: Experiencer
    onset_age_group: OnsetAgeGroup
    resolver_status: ResolverStatus
    hpo_candidates: List[HpoTerm] = Field(default_factory=list, max_length=5)


class ExtractionRequest(StrictModel):
    note_text: str = Field(..., min_length=1, max_length=50000)
    language: str = Field(default="en", max_length=35)


class ExtractionResponse(StrictModel):
    request_id: UUID
    model: ModelProvenance
    ontology_release: str = Field(..., max_length=40)
    mentions: List[PhenotypeMention] = Field(default_factory=list, max_length=500)


class TermSearchRequest(StrictModel):
    query: str = Field(..., min_length=2, max_length=120)
    limit: int = Field(default=10, ge=1, le=20)


class TermSearchResponse(StrictModel):
    ontology_release: str = Field(..., max_length=40)
    results: List[HpoTerm] = Field(default_factory=list, max_length=20)


class ReviewedObservation(StrictModel):
    observation_id: UUID
    hpo_id: str = Field(..., pattern=r"^HP:[0-9]{7}$")
    polarity: Polarity
    temporality: Temporality
    experiencer: Experiencer
    onset_age_group: OnsetAgeGroup
    review_status: ReviewStatus
    source_mention_ids: Optional[List[UUID]] = Field(default=None, max_length=20)


class MatchRequest(StrictModel):
    observations: List[ReviewedObservation] = Field(..., min_length=1, max_length=300)
    candidate_limit: int = Field(default=20, ge=1, le=50)


class AnnotationProvenance(StrictModel):
    source: str = Field(..., min_length=1, max_length=100)
    reference: str = Field(..., min_length=1, max_length=300)
    evidence_code: Optional[str] = Field(None, max_length=80)
    frequency: Optional[str] = Field(None, max_length=40)


class SupportingEvidence(StrictModel):
    observation_id: UUID
    case_hpo_id: str = Field(..., pattern=r"^HP:[0-9]{7}$")
    annotation_hpo_id: str = Field(..., pattern=r"^HP:[0-9]{7}$")
    relation: Relation
    shared_ancestor_ids: List[str] = Field(default_factory=list)
    ontology_paths: List[List[str]] = Field(default_factory=list, max_length=2)
    annotation: AnnotationProvenance


class Candidate(StrictModel):
    disease_id: str = Field(..., min_length=1, max_length=120)
    disease_label: str = Field(..., min_length=1, max_length=240)
    rank: int = Field(..., ge=1)
    similarity_score: Optional[float] = Field(default=None, description="Deterministic semantic similarity support ratio")
    icd11_code: Optional[str] = Field(default=None, max_length=40)
    icd11_title: Optional[str] = Field(default=None, max_length=240)
    icd11_uri: Optional[str] = Field(default=None, max_length=240)
    orpha_code: Optional[str] = Field(default=None, max_length=40)
    source_id: Optional[str] = Field(default=None, max_length=160)
    supporting_observations: List[SupportingEvidence] = Field(..., min_length=1)


class ExcludedObservation(StrictModel):
    observation_id: UUID
    reason: ExcludedReason


class EvidenceGraphNode(StrictModel):
    id: str = Field(..., min_length=1, max_length=160)
    type: Literal["phenotype", "disease"]
    label: str = Field(..., min_length=1, max_length=240)
    hpo_id: Optional[str] = Field(None, pattern=r"^HP:[0-9]{7}$")
    disease_id: Optional[str] = Field(None, max_length=120)
    icd11_code: Optional[str] = Field(default=None, max_length=40)
    candidate_rank: Optional[int] = Field(None, ge=1)


class EvidenceGraphEdge(StrictModel):
    id: str = Field(..., min_length=1, max_length=240)
    source: str = Field(..., min_length=1, max_length=160)
    target: str = Field(..., min_length=1, max_length=160)
    relation: Literal["supports_candidate"] = "supports_candidate"
    observation_id: UUID
    annotation_hpo_id: str = Field(..., pattern=r"^HP:[0-9]{7}$")
    annotation_reference: str = Field(..., min_length=1, max_length=300)


class EvidenceGraph(StrictModel):
    nodes: List[EvidenceGraphNode] = Field(default_factory=list, max_length=500)
    edges: List[EvidenceGraphEdge] = Field(default_factory=list, max_length=2000)


class DataVersion(StrictModel):
    ontology_release: str = Field(..., max_length=40)
    annotation_release: str = Field(..., max_length=40)
    manifest_sha256: str = Field(..., pattern=r"^[a-f0-9]{64}$")


class MatchResponse(StrictModel):
    request_id: UUID
    status: Literal["ranked", "no_candidates"]
    ranking_method: Literal["hpo_semantic_coverage_v1"] = "hpo_semantic_coverage_v1"
    data_version: DataVersion
    candidates: List[Candidate] = Field(default_factory=list, max_length=50)
    excluded_observations: List[ExcludedObservation] = Field(default_factory=list)
    unmatched_observation_ids: List[UUID] = Field(default_factory=list)
    graph: EvidenceGraph
    notice: Literal["Research prototype. Ranked phenotype evidence is not a diagnosis or a probability."] = (
        "Research prototype. Ranked phenotype evidence is not a diagnosis or a probability."
    )


class DocumentExtractResponse(StrictModel):
    extracted_text: str
    detected_mime_type: str
    page_count: int = Field(..., ge=1)
    extraction_method: Literal["native_pdf_stream", "local_ocr"]
    warnings: List[str] = Field(default_factory=list)
