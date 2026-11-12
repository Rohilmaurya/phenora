/**
 * Generated TypeScript interfaces corresponding 1:1 with contracts/openapi.json
 * Phenora Local Phenotype Evidence API v1.0.0
 */

export type ErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "invalid_request"
  | "payload_too_large"
  | "model_unavailable"
  | "model_timeout"
  | "data_unavailable"
  | "rate_limited"
  | "internal_error";

export interface ErrorResponse {
  request_id: string;
  code: ErrorCode;
  message: string;
}

export interface HealthResponse {
  status: "ready" | "degraded";
  api_version: string;
  extractor_status: string;
  ontology_release: string;
  annotation_release: string;
  data_pack_id: string;
  model_pack_id: string;
  model_id: string;
  model_version: string;
}

export interface DocumentExtractResponse {
  extracted_text: string;
  detected_mime_type: string;
  page_count: number;
  extraction_method: "native_pdf_stream" | "local_ocr";
  warnings: string[];
}

export interface SourceSpan {
  start: number;
  end: number;
  quote: string;
}

export type Polarity = "present" | "negated" | "uncertain";
export type Temporality = "current" | "historical" | "onset" | "unknown";
export type Experiencer = "patient" | "family_member" | "unknown";
export type OnsetAgeGroup =
  | "prenatal"
  | "congenital"
  | "neonatal_0_28_days"
  | "infancy_29_days_to_1_year"
  | "early_childhood_1_to_5_years"
  | "later_childhood_6_to_11_years"
  | "adolescence_12_to_17_years"
  | "unknown";

export type MatchKind = "exact" | "synonym" | "stem" | "embedding";
export type ResolverStatus = "exact" | "synonym" | "ambiguous" | "unmapped";

export interface HpoTerm {
  hpo_id: string;
  label: string;
  match_kind: MatchKind;
}

export interface PhenotypeMention {
  mention_id: string;
  source_span: SourceSpan;
  polarity: Polarity;
  temporality: Temporality;
  experiencer: Experiencer;
  onset_age_group: OnsetAgeGroup;
  resolver_status: ResolverStatus;
  hpo_candidates: HpoTerm[];
}

export interface ModelProvenance {
  model_id: string;
  model_version: string;
  runtime: string;
  prompt_id: string;
  digest: string;
}

export interface ExtractionRequest {
  note_text: string;
}

export interface ExtractionResponse {
  request_id: string;
  model_provenance: ModelProvenance;
  ontology_release: string;
  mentions: PhenotypeMention[];
}

export interface TermSearchRequest {
  query: string;
  limit?: number;
}

export interface TermSearchResult {
  hpo_id: string;
  label: string;
  match_kind: MatchKind;
  matched_synonym?: string | null;
}

export interface TermSearchResponse {
  results: TermSearchResult[];
}

export type ReviewStatus = "confirmed" | "rejected" | "modified";

export interface ReviewedObservation {
  observation_id: string;
  hpo_id: string;
  polarity: Polarity;
  temporality: Temporality;
  experiencer: Experiencer;
  onset_age_group: OnsetAgeGroup;
  review_status: ReviewStatus;
  source_mention_ids?: string[];
}

export interface MatchRequest {
  observations: ReviewedObservation[];
  candidate_limit?: number;
}

export interface AnnotationProvenance {
  source: string;
  reference: string;
  evidence_code?: string | null;
  frequency?: string | null;
}

export type Relation =
  | "exact"
  | "annotation_ancestor"
  | "case_term_ancestor"
  | "shared_ancestor";

export interface SupportingEvidence {
  observation_id: string;
  case_hpo_id: string;
  annotation_hpo_id: string;
  relation: Relation;
  shared_ancestor_ids: string[];
  ontology_paths: string[][];
  annotation: AnnotationProvenance;
}

export interface Candidate {
  rank: number;
  disease_id: string;
  disease_label: string;
  source?: "OMIM" | "ORPHA";
  similarity_score: number;
  icd11_code?: string | null;
  icd11_title?: string | null;
  icd11_uri?: string | null;
  orpha_code?: string | null;
  source_id?: string | null;
  supporting_observations: SupportingEvidence[];
}

export interface ExcludedObservation {
  observation_id: string;
  reason:
    | "negated_not_scored_in_v1"
    | "uncertain_not_scored_in_v1"
    | "family_history_not_scored_in_v1"
    | "unknown_experiencer_not_scored_in_v1"
    | "historical_not_scored_in_v1";
}

export interface EvidenceGraphNode {
  id: string;
  type?: "phenotype" | "disease" | "ancestor" | string;
  node_type?: "observed_phenotype" | "hpo_ancestor" | "candidate_disease" | string;
  label: string;
  hpo_id?: string | null;
  disease_id?: string | null;
  candidate_rank?: number | null;
}

export interface EvidenceGraphEdge {
  id: string;
  source: string;
  target: string;
  relation: "supports_candidate";
  observation_id: string;
  annotation_hpo_id: string;
  annotation_reference: string;
}

export interface EvidenceGraph {
  nodes: EvidenceGraphNode[];
  edges: EvidenceGraphEdge[];
}

export interface DataVersion {
  ontology_release: string;
  annotation_release: string;
  manifest_sha256: string;
}

export interface MatchResponse {
  request_id: string;
  status: "ranked" | "no_candidates";
  ranking_method: "hpo_semantic_coverage_v1";
  data_version: DataVersion;
  candidates: Candidate[];
  excluded_observations: ExcludedObservation[];
  unmatched_observation_ids: string[];
  graph: EvidenceGraph;
  notice: "Research prototype. Ranked phenotype evidence is not a diagnosis or a probability.";
}
