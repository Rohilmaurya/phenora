# Phenora Backend — Product Requirements Document

**Version:** 0.1  
**Status:** Hackathon backend-only specification  
**Product posture:** Deployment-shaped, local-only research support; not a clinical diagnostic device or validated clinical product.

## 1. Product summary

Phenora Backend provides local APIs to extract phenotype mentions from a synthetic pediatric case, resolve reviewed findings to Human Phenotype Ontology (HPO) terms, and rank candidate conditions by documented phenotype evidence. It returns auditable evidence and graph-ready data for a future client. No frontend or graph visualization is included in this hackathon deliverable.

The local language model is used only to propose source-grounded phenotype mentions and context. Deterministic backend code resolves HPO terms, matches them to the local dataset, and orders candidates. The API never presents its ordering as a disease probability.

## 2. Problem and opportunity

Rare-disease diagnostic journeys can be long and vary by disease and population. Clinical phenotype clues may be scattered across notes and phrased inconsistently. A language model can help organize those clues, while a local, inspectable ontology-backed matcher can make the evidence trail visible without sending notes to a cloud service.

Problem statements that quote a diagnostic-delay average must name the population and source. Do not present “5–7 years” as a universal figure.

## 3. Goals

1. Deliver an authenticated local backend API for extraction, HPO resolution/search, and deterministic evidence ranking.
2. Make every candidate auditable through observation-to-annotation evidence and graph-ready nodes/edges in the API response.
3. Keep the backend, model runtime, and HPO data usable with Internet egress blocked.
4. Make larger compatible model and data packs replaceable without backend source or API changes.
5. Keep the service honest about uncertainty, dataset coverage, and intended use.

## 4. Users

- **Primary API consumer:** a future clinician-facing client that submits synthetic cases and reviewed HPO observations.
- **Hackathon operator:** developer or judge using OpenAPI/Swagger, an HTTP client, and synthetic fixtures to exercise the backend.
- **Not intended for:** patients or caregivers making care decisions, autonomous diagnosis, triage, treatment selection, or emergency use.

## 5. Product principles

- The backend enforces a review boundary: extraction and matching are separate requests; the caller must review terms before matching.
- The model proposes source-grounded mentions; it does not resolve or rank diseases.
- Unknown, ambiguous, negated, uncertain, historical, and family-history information stays distinguishable.
- “Not matched in this dataset” never means “absent in the patient.”
- API responses provide ordinal ranks and supporting evidence, never probabilities or diagnostic confidence.
- Hackathon demonstrations use synthetic cases only, while exercising the same authenticated local processing path intended for later authorized use.
- Model and data packs are versioned, checksummed, and replaceable through manifests.

## 6. Scope

### P0 — Hackathon backend

- FastAPI service implementing the existing OpenAPI contract.
- Local bearer authentication/authorization integration. A development identity is allowed only with synthetic fixtures.
- `GET /v1/health` for readiness and active artifact identifiers.
- `POST /v1/documents/extract-text` for local in-memory text parsing and OCR of clinical documents (PDF, PNG, JPEG, TIFF) with zero disk persistence.
- `POST /v1/extractions` for local model extraction with source quote/span, polarity, temporality, experiencer, and coarse onset-age group.
- `POST /v1/terms/search` for local HPO label/synonym search and manual-entry support.
- `POST /v1/matches` accepts reviewed HPO observations only; raw note text is not part of this request.
- Local HPO resolution and deterministic candidate ranking from pinned ontology and disease-phenotype annotation packs.
- Responses include matched evidence, HPO relationships/paths, provenance, excluded/unmatched observations, and graph-ready node/edge data or equivalent normalized evidence.
- Manual matching when the local model is unavailable; no remote fallback.
- Offline cold start, no Internet requests, and no telemetry.
- No raw-note persistence or body logging; no note text/quotes in URLs, logs, or audit events.
- Non-PHI audit metadata for actor, time, action, request ID, and model/data manifest IDs.
- Stable API and artifact-manifest contracts so larger packs can replace hackathon packs without code changes.
- Verification through OpenAPI/Swagger and scripted HTTP tests; no application UI is built.

### P1 — Before a controlled real-note pilot

- Site authorization to use real records and a documented data-handling/retention policy.
- Security and privacy review of the actual devices, local identity provider, network, TLS certificates, and audit process.
- Clinically reviewed evaluation set and analysis of extraction errors, ranking behavior, subgroup/data coverage, and known limitations.
- Site-specific regulatory review and intended-use approval.
- Operational packaging and recovery procedures for the actual offline environment.

P1 is not a code switch and is not part of the hackathon backend. The service should make this later work possible without rewriting backend/API code, but it must not imply clinical clearance.

## 7. Functional requirements

| ID | Requirement | Acceptance condition |
|---|---|---|
| PR-01 | Authenticate users through an identity provider reachable inside the isolated network. | Extraction, term search, and matching reject missing/invalid credentials; `/v1/health` exposes readiness only. |
| PR-02 | Accept synthetic case text through the extraction API. | HTTP client can submit synthetic text; input limits and errors are defined; no fixture UI is required. |
| PR-03 | Extract phenotype mentions locally. | Each proposed mention includes a source quote and verified source span plus polarity, temporality, experiencer, and onset-age group. |
| PR-04 | Resolve mentions to local HPO terms. | Exact/synonym results are reviewable; ambiguous/unmapped terms are never silently guessed. |
| PR-05 | Require caller review before matching. | Extraction and matching are separate requests; match schema accepts reviewed observations only and no raw note. |
| PR-06 | Support manual HPO entry through APIs. | Caller can search local HPO labels/synonyms and submit manually selected IDs if extraction is disabled. |
| PR-07 | Rank evidence deterministically. | Same reviewed observations and same manifests yield the same candidate ordering and tie-breaks. |
| PR-08 | Explain each candidate. | Every candidate has one or more linked case observations, disease annotation terms, ontology relation/path, annotation reference, and release provenance. |
| PR-09 | Avoid unsupported diagnostic claims. | No probability, diagnostic confidence, diagnosis, treatment, or urgency language appears in API output. No-candidate state is explicit. |
| PR-10 | Provide graph-ready evidence. | Match response links reviewed observations, candidate conditions, HPO annotations, and ontology paths so a future client can render the graph. |
| PR-11 | Operate without Internet access. | Backend cold start and synthetic API workflow succeed with egress blocked; model/data are local. |
| PR-12 | Protect case content. | Case text remains in volatile API memory only; backend logs, caches, URLs, and audit events contain no note text or quotes. Browser handling is a future client responsibility. |
| PR-13 | Replace model/data packs without source changes. | A second valid model manifest and data manifest can be activated without changing app/API code and passes all compatibility gates. |
| PR-14 | Return system/data provenance. | Health/extraction/match responses expose model version, ontology/annotation releases, manifest IDs, and dataset scope. |
| PR-15 | Accept clinical documents for in-memory text parsing and local OCR. | Ingests PDF or image files in volatile RAM; extracts text using native digital parser or local OCR engine; zero disk persistence; returns extracted text with page and warning metadata for pre-NER review. |

## 8. Ranking and user-visible language

V1 ranks only confirmed, positive observations about the patient. Negated, uncertain, historical, unknown-experiencer, and family-history observations remain visible but are excluded from v1 ranking. Coarse onset-age context is captured for review but does not affect v1 ranking.

The backend uses the `hpo_semantic_coverage_v1` method defined in [ARCHITECTURE_REVIEW.md](./ARCHITECTURE_REVIEW.md). Its internal value is only an ordering measure and is not returned as a probability. API responses provide rank, matched observations, evidence paths, annotation provenance, and unmatched observations. If no candidate has support, return an empty result rather than forcing a top hit.

Preferred labels:

- “Candidate conditions for review”
- “Ranked phenotype evidence”
- “Matched in this dataset”
- “Not matched in this dataset”
- `notice: "Research prototype. Ranked phenotype evidence is not a diagnosis or a probability."`

## 9. Non-functional requirements

- **Locality:** all runtime inference, ontology lookup, annotation retrieval, and assets are local or on the approved isolated network.
- **Security:** local bearer-authenticated API, TLS for runtime network traffic, exact CORS allowlist, request limits, least-privilege services, and fail-closed identity/data checks.
- **Privacy:** no note persistence by default; no request-body logging; no external telemetry; `Cache-Control: no-store`; clear request buffers after extraction. A future UI must clear its state on case clear/logout/session expiry.
- **Auditability:** log actor, timestamp, request ID, action, and artifact IDs only; do not log content or phenotype lists.
- **Reproducibility:** pin dependencies and artifact hashes; outputs include method and data/model provenance.
- **API usability:** OpenAPI examples and stable schemas; frontend-independent error codes; bounded body sizes and explicit model/data failure states.
- **Resilience:** explicit model unavailable, timeout, data unavailable, unauthorized, ambiguous-term, and no-match states.
- **Performance:** record p50/p95 extraction and matching latency and peak memory on the backend device. Final thresholds are set after target hardware is selected.

## 10. Success measures

- Four or more reviewed synthetic fixtures: three short and one longer case, each with expected mentions/HPO terms and expected evidence-supported candidates.
- For every extracted mention, source quote and offsets match the original synthetic note exactly.
- Extraction benchmark reports valid-output rate, mention precision/recall, unsupported mention rate, negation/context handling, and latency. No clinical-performance claim is inferred from this small set.
- Matcher tests cover exact and hierarchical matches, duplicate terms, broad/root terms, excluded observations, no matches, and stable tie-breaking.
- The synthetic API workflow succeeds twice consecutively with the Internet disconnected using Swagger/HTTP client scripts.
- Model/data pack swap passes without application/API code changes and outputs the new provenance.
- Security checks show no note content in backend logs, URLs, caches, or audit metadata.

## 11. Assumptions and decisions to lock during implementation

- The hackathon input set is synthetic only.
- Backend development and evaluation use synthetic fixtures and the OpenAPI contract. Any external client uses an isolated test network; runtime note transfer is allowed only inside the approved security boundary.
- The exact compact model/runtime and starter HPO/HPOA release are selected and pinned in the first implementation milestone.
- Target hardware must be sized for the later deployment model; otherwise hardware becomes another deployment delta.
- HPO/HPOA licenses, attribution, release dates, and pack hashes are recorded before packaging.

## 12. Source basis

- User-provided **Phenora Build & Orchestration Playbook**: scope, stack, data provenance, deterministic matching, API contract, team workflow, QA, and demo gates.
- [Architecture review and revised design](./ARCHITECTURE_REVIEW.md): deployment-shaped target, backend trust boundary, model/data swap invariant, scoring behavior, and failure handling.
- [OpenAPI contract](./contracts/openapi.json) and [artifact manifest schema](./contracts/artifact-manifests.schema.json): API and replaceable pack interfaces.
