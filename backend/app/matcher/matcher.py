import re
import uuid
from typing import Dict, List, Optional, Set, Tuple

from backend.app.annotation_repository.repository import AnnotationRepository
from backend.app.schemas import (
    AnnotationProvenance,
    Candidate,
    DataVersion,
    EvidenceGraph,
    EvidenceGraphEdge,
    EvidenceGraphNode,
    ExcludedObservation,
    ExcludedReason,
    Experiencer,
    MatchRequest,
    MatchResponse,
    Polarity,
    Relation,
    ReviewedObservation,
    SupportingEvidence,
    Temporality,
)


def trace_ancestor_path(child_id: str, ancestor_id: str, repo: AnnotationRepository) -> List[str]:
    """Traces shortest path of HPO IDs from child_id up to ancestor_id."""
    if child_id == ancestor_id:
        return [child_id]

    path = [child_id]
    curr = child_id
    visited = {child_id}

    # BFS/Greedy search using distance map
    while curr != ancestor_id:
        # Find neighbors that are ancestors of child and have paths to ancestor_id
        curr_ancestors = repo.get_ancestors(curr)
        next_step = None
        min_dist_to_target = float("inf")

        for anc, dist in curr_ancestors.items():
            if anc not in visited and dist == 1:
                target_ancestors = repo.get_ancestors(anc)
                if ancestor_id in target_ancestors:
                    dist_to_target = target_ancestors[ancestor_id]
                    if dist_to_target < min_dist_to_target:
                        min_dist_to_target = dist_to_target
                        next_step = anc

        if not next_step:
            # Fallback direct link
            path.append(ancestor_id)
            break
        path.append(next_step)
        visited.add(next_step)
        curr = next_step

    return path


def _frequency_weight(freq: Optional[str]) -> float:
    """Converts HPO frequency tags (HP:004028x, %, or ratio) into a [0, 1] salience weight."""
    if not freq:
        return 0.85
    if freq == "HP:0040280":
        return 1.00
    if freq == "HP:0040281":
        return 0.96
    if freq == "HP:0040282":
        return 0.90
    if freq == "HP:0040283":
        return 0.78
    if freq == "HP:0040284":
        return 0.65
    if freq == "HP:0040285":
        return 0.0
    m = re.match(r"^(\d+)/(\d+)$", freq.strip())
    if m and int(m.group(2)) > 0:
        ratio = min(1.0, int(m.group(1)) / int(m.group(2)))
        return 0.70 + 0.30 * ratio
    if freq.strip().endswith("%"):
        try:
            ratio = min(1.0, max(0.0, float(freq.strip()[:-1]) / 100.0))
            return 0.70 + 0.30 * ratio
        except ValueError:
            pass
    return 0.85


class DeterministicMatcher:
    def __init__(self, repository: AnnotationRepository):
        self.repo = repository

    def match(self, request: MatchRequest, request_id: Optional[uuid.UUID] = None) -> MatchResponse:
        req_id = request_id or uuid.uuid4()
        health_meta = self.repo.get_health_metadata()
        data_ver = DataVersion(
            ontology_release=health_meta["ontology_release"] or "unknown",
            annotation_release=health_meta["annotation_release"] or "unknown",
            manifest_sha256=health_meta["manifest_sha256"] or "0" * 64,
        )

        excluded: List[ExcludedObservation] = []
        qualifying: List[ReviewedObservation] = []
        seen_qualifying_ids: Set[str] = set()

        # 1. Filter out observations excluded by v1 rules
        for obs in request.observations:
            if obs.polarity == Polarity.negated:
                excluded.append(ExcludedObservation(observation_id=obs.observation_id, reason=ExcludedReason.negated_not_scored_in_v1))
            elif obs.polarity == Polarity.uncertain:
                excluded.append(ExcludedObservation(observation_id=obs.observation_id, reason=ExcludedReason.uncertain_not_scored_in_v1))
            elif obs.experiencer == Experiencer.family_member:
                excluded.append(ExcludedObservation(observation_id=obs.observation_id, reason=ExcludedReason.family_history_not_scored_in_v1))
            elif obs.experiencer == Experiencer.unknown:
                excluded.append(ExcludedObservation(observation_id=obs.observation_id, reason=ExcludedReason.unknown_experiencer_not_scored_in_v1))
            elif obs.temporality == Temporality.historical:
                excluded.append(ExcludedObservation(observation_id=obs.observation_id, reason=ExcludedReason.historical_not_scored_in_v1))
            else:
                # Deduplicate identical query terms
                if obs.hpo_id not in seen_qualifying_ids:
                    seen_qualifying_ids.add(obs.hpo_id)
                    qualifying.append(obs)

        # 2. Filter zero-information query terms
        scored_observations = [
            obs for obs in qualifying if self.repo.get_information_content(obs.hpo_id) > 0.0
        ]

        if not scored_observations:
            return MatchResponse(
                request_id=req_id,
                status="no_candidates",
                data_version=data_ver,
                candidates=[],
                excluded_observations=excluded,
                unmatched_observation_ids=[obs.observation_id for obs in qualifying],
                graph=EvidenceGraph(nodes=[], edges=[]),
            )

        q_terms = [(obs, self.repo.get_information_content(obs.hpo_id)) for obs in scored_observations]
        sum_q_ic = sum(q_ic for _, q_ic in q_terms)
        all_diseases = self.repo.get_all_diseases()

        candidate_ids = self.repo.get_candidate_diseases_for_terms([obs.hpo_id for obs in scored_observations])
        if not candidate_ids:
            candidate_ids = set(all_diseases.keys())

        scored_candidates = []  # (rank_value, disease_id, disease_label, best_hits_list)
        all_supported_obs_ids: Set[uuid.UUID] = set()

        # 3. Score candidate diseases using lossless ancestor-prefiltered bidirectional Lin similarity
        for disease_id in candidate_ids:
            disease_label = all_diseases.get(disease_id)
            if not disease_label:
                continue
            annotations = self.repo.get_disease_annotations(disease_id)
            present_annotations = [a for a in annotations if a["polarity"] == "present"]
            if not present_annotations:
                continue

            q_best_sims = [0.0] * len(q_terms)
            q_best_match: List[Optional[Tuple[dict, str]]] = [None] * len(q_terms)
            a_ics = [self.repo.get_information_content(a["hpo_id"]) for a in present_annotations]
            a_fws = [_frequency_weight(a.get("frequency")) for a in present_annotations]
            a_best_sims = [0.0] * len(present_annotations)

            for qi, (obs, q_ic) in enumerate(q_terms):
                q_id = obs.hpo_id
                for ai, ann in enumerate(present_annotations):
                    fw = a_fws[ai]
                    if fw <= 0.0:
                        continue
                    a_id = ann["hpo_id"]
                    a_ic = a_ics[ai]
                    mica, mica_ic = self.repo.find_mica(q_id, a_id)
                    if mica and (q_ic + a_ic) > 0:
                        base_sim = (2.0 * mica_ic) / (q_ic + a_ic)
                        if base_sim > a_best_sims[ai]:
                            a_best_sims[ai] = base_sim
                        weighted_sim = base_sim * (0.85 + 0.15 * fw)
                        if weighted_sim > q_best_sims[qi]:
                            q_best_sims[qi] = weighted_sim
                            q_best_match[qi] = (ann, mica)

            matched_pairs = [
                (q_terms[qi][0], q_best_match[qi][0], q_best_match[qi][1])
                for qi in range(len(q_terms))
                if q_best_sims[qi] > 0.0 and q_best_match[qi] is not None
            ]
            if not matched_pairs:
                continue

            q_cov = (
                sum(q_terms[qi][1] * q_best_sims[qi] for qi in range(len(q_terms))) / sum_q_ic
                if sum_q_ic > 0.0
                else 0.0
            )
            if q_cov <= 0.0:
                continue

            sum_a_ic = sum(a_ics)
            d_cov = (
                sum(a_ics[ai] * a_best_sims[ai] for ai in range(len(present_annotations))) / sum_a_ic
                if sum_a_ic > 0.0
                else 0.0
            )
            rank_value = min(1.0, 0.85 * q_cov + 0.15 * d_cov)

            for obs, _, _ in matched_pairs:
                all_supported_obs_ids.add(obs.observation_id)

            scored_candidates.append((rank_value, disease_id, disease_label, matched_pairs))

        # 4. Deterministic sorting: rank_value DESC, disease_id ASC (tie-breaking)
        scored_candidates.sort(key=lambda x: (-x[0], x[1]))

        # Limit to candidate_limit before tracing paths
        top_candidates = scored_candidates[: request.candidate_limit]

        if not top_candidates:
            return MatchResponse(
                request_id=req_id,
                status="no_candidates",
                data_version=data_ver,
                candidates=[],
                excluded_observations=excluded,
                unmatched_observation_ids=[obs.observation_id for obs in qualifying],
                graph=EvidenceGraph(nodes=[], edges=[]),
            )

        # 5. Assemble Candidates & Graph
        final_candidates: List[Candidate] = []
        graph_nodes: List[EvidenceGraphNode] = []
        graph_edges: List[EvidenceGraphEdge] = []
        seen_phenotype_nodes: Set[str] = set()

        for rank_idx, (rank_val, dis_id, dis_label, matched_pairs) in enumerate(top_candidates, start=1):
            evidence_list: List[SupportingEvidence] = []
            for obs, best_ann, best_mica in matched_pairs:
                q_id = obs.hpo_id
                a_hpo = best_ann["hpo_id"]
                q_ancestors = self.repo.get_ancestors(q_id)
                a_ancestors = self.repo.get_ancestors(a_hpo)

                if q_id == a_hpo:
                    rel = Relation.exact
                elif a_hpo in q_ancestors:
                    rel = Relation.annotation_ancestor
                elif q_id in a_ancestors:
                    rel = Relation.case_term_ancestor
                else:
                    rel = Relation.shared_ancestor

                path_q = trace_ancestor_path(q_id, best_mica, self.repo)
                paths = [path_q]
                if a_hpo != best_mica:
                    path_a = trace_ancestor_path(a_hpo, best_mica, self.repo)
                    paths.append(path_a)

                prov = AnnotationProvenance(
                    source=best_ann["source_release"],
                    reference=best_ann["reference"] or "Curated",
                    evidence_code=best_ann["evidence_code"],
                    frequency=best_ann["frequency"],
                )

                evidence_list.append(
                    SupportingEvidence(
                        observation_id=obs.observation_id,
                        case_hpo_id=q_id,
                        annotation_hpo_id=a_hpo,
                        relation=rel,
                        shared_ancestor_ids=[best_mica],
                        ontology_paths=paths,
                        annotation=prov,
                    )
                )

            dis_meta = self.repo.get_disease_metadata(dis_id)
            final_candidates.append(
                Candidate(
                    disease_id=dis_id,
                    disease_label=dis_label,
                    rank=rank_idx,
                    similarity_score=round(float(rank_val), 4),
                    icd11_code=dis_meta.get("icd11_code"),
                    icd11_title=dis_meta.get("icd11_title"),
                    icd11_uri=dis_meta.get("icd11_uri"),
                    orpha_code=dis_meta.get("orpha_code"),
                    source_id=dis_meta.get("source_id"),
                    supporting_observations=evidence_list,
                )
            )

            # Disease graph node
            graph_nodes.append(
                EvidenceGraphNode(
                    id=f"disease:{dis_id}",
                    type="disease",
                    label=dis_label,
                    disease_id=dis_id,
                    icd11_code=dis_meta.get("icd11_code"),
                    candidate_rank=rank_idx,
                )
            )

            for ev in evidence_list:
                # Phenotype graph node
                if ev.case_hpo_id not in seen_phenotype_nodes:
                    seen_phenotype_nodes.add(ev.case_hpo_id)
                    term_label = self.repo.get_term_label(ev.case_hpo_id) or ev.case_hpo_id
                    graph_nodes.append(
                        EvidenceGraphNode(
                            id=f"hpo:{ev.case_hpo_id}",
                            type="phenotype",
                            label=term_label,
                            hpo_id=ev.case_hpo_id,
                            disease_id=None,
                            candidate_rank=None,
                        )
                    )

                # Edge connecting phenotype to candidate disease
                edge_id = f"edge:{ev.observation_id}:{dis_id}"
                graph_edges.append(
                    EvidenceGraphEdge(
                        id=edge_id,
                        source=f"hpo:{ev.case_hpo_id}",
                        target=f"disease:{dis_id}",
                        relation="supports_candidate",
                        observation_id=ev.observation_id,
                        annotation_hpo_id=ev.annotation_hpo_id,
                        annotation_reference=ev.annotation.reference,
                    )
                )

        unmatched = [
            obs.observation_id for obs in qualifying if obs.observation_id not in all_supported_obs_ids
        ]

        return MatchResponse(
            request_id=req_id,
            status="ranked",
            data_version=data_ver,
            candidates=final_candidates,
            excluded_observations=excluded,
            unmatched_observation_ids=unmatched,
            graph=EvidenceGraph(nodes=graph_nodes, edges=graph_edges),
        )
