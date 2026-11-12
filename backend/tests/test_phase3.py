import os
import uuid
import pytest

from backend.app.annotation_repository.repository import AnnotationRepository
from backend.app.hpo_resolver.resolver import HpoResolver
from backend.app.matcher.matcher import DeterministicMatcher
from backend.app.schemas import (
    Experiencer,
    MatchKind,
    MatchRequest,
    OnsetAgeGroup,
    Polarity,
    ResolverStatus,
    ReviewStatus,
    ReviewedObservation,
    Temporality,
)
from backend.app.span_validator.validator import validate_span

PACK_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data",
    "packs",
    "phenora-data-v1",
)


# -------------------------------------------------------------------------
# 1. SPAN VALIDATOR TESTS
# -------------------------------------------------------------------------

def test_span_validator_exact():
    note = "Patient has severe intractable seizures since infancy."
    start = note.index("seizures")
    end = start + len("seizures")
    valid, err = validate_span(note, start, end, "seizures")
    assert valid is True
    assert err is None


def test_span_validator_mismatch():
    note = "Patient has severe intractable seizures since infancy."
    start = note.index("seizures")
    end = start + len("seizures")
    valid, err = validate_span(note, start, end, "fevers")
    assert valid is False
    assert "Quote mismatch" in err


def test_span_validator_bounds():
    note = "Short note"
    valid, err = validate_span(note, 0, 50, "Short note")
    assert valid is False
    assert "exceeds note length" in err

    valid, err = validate_span(note, -1, 5, "Short")
    assert valid is False
    assert "cannot be negative" in err


# -------------------------------------------------------------------------
# 2. HPO RESOLVER TESTS
# -------------------------------------------------------------------------

def test_hpo_resolver_exact_and_synonyms():
    repo = AnnotationRepository(PACK_DIR)
    resolver = HpoResolver(repo)

    # Exact match
    status, candidates = resolver.resolve("Seizure")
    assert status == ResolverStatus.exact
    assert candidates[0].hpo_id == "HP:0001250"
    assert candidates[0].match_kind == MatchKind.exact_label

    # Synonym match
    status, candidates = resolver.resolve("spider fingers")
    assert status == ResolverStatus.synonym
    assert candidates[0].hpo_id == "HP:0001166"
    assert candidates[0].match_kind == MatchKind.synonym

    # Unmapped match
    status, candidates = resolver.resolve("nonexistent_rare_symptom_xyz")
    assert status == ResolverStatus.unmapped
    assert len(candidates) == 0


# -------------------------------------------------------------------------
# 3. DETERMINISTIC MATCHER TESTS
# -------------------------------------------------------------------------

def test_matcher_dravet_syndrome():
    repo = AnnotationRepository(PACK_DIR)
    matcher = DeterministicMatcher(repo)

    # Phenotype profile of Dravet syndrome: febrile seizures, status epilepticus, ataxia
    obs1 = ReviewedObservation(
        observation_id=uuid.uuid4(),
        hpo_id="HP:0002373",  # Febrile seizure
        polarity=Polarity.present,
        temporality=Temporality.current,
        experiencer=Experiencer.patient,
        onset_age_group=OnsetAgeGroup.infancy_29_days_to_1_year,
        review_status=ReviewStatus.confirmed,
    )
    obs2 = ReviewedObservation(
        observation_id=uuid.uuid4(),
        hpo_id="HP:0002133",  # Status epilepticus
        polarity=Polarity.present,
        temporality=Temporality.current,
        experiencer=Experiencer.patient,
        onset_age_group=OnsetAgeGroup.infancy_29_days_to_1_year,
        review_status=ReviewStatus.confirmed,
    )
    obs3 = ReviewedObservation(
        observation_id=uuid.uuid4(),
        hpo_id="HP:0001251",  # Ataxia
        polarity=Polarity.present,
        temporality=Temporality.current,
        experiencer=Experiencer.patient,
        onset_age_group=OnsetAgeGroup.early_childhood_1_to_5_years,
        review_status=ReviewStatus.confirmed,
    )

    req = MatchRequest(observations=[obs1, obs2, obs3])
    resp = matcher.match(req)

    assert resp.status == "ranked"
    assert len(resp.candidates) > 0
    # Top candidate should be Dravet syndrome (OMIM:607208)
    top_hit = resp.candidates[0]
    assert top_hit.disease_id == "OMIM:607208"
    assert top_hit.rank == 1
    assert "Dravet" in top_hit.disease_label

    # Verify graph output
    assert len(resp.graph.nodes) > 0
    assert len(resp.graph.edges) > 0
    disease_node = next(n for n in resp.graph.nodes if n.id == "disease:OMIM:607208")
    assert disease_node.type == "disease"
    assert disease_node.candidate_rank == 1


def test_matcher_marfan_syndrome():
    repo = AnnotationRepository(PACK_DIR)
    matcher = DeterministicMatcher(repo)

    # Marfan profile: arachnodactyly, ectopia lentis, aortic root aneurysm
    obs1 = ReviewedObservation(
        observation_id=uuid.uuid4(),
        hpo_id="HP:0001166",  # Arachnodactyly
        polarity=Polarity.present,
        temporality=Temporality.current,
        experiencer=Experiencer.patient,
        onset_age_group=OnsetAgeGroup.early_childhood_1_to_5_years,
        review_status=ReviewStatus.confirmed,
    )
    obs2 = ReviewedObservation(
        observation_id=uuid.uuid4(),
        hpo_id="HP:0001083",  # Ectopia lentis
        polarity=Polarity.present,
        temporality=Temporality.current,
        experiencer=Experiencer.patient,
        onset_age_group=OnsetAgeGroup.early_childhood_1_to_5_years,
        review_status=ReviewStatus.confirmed,
    )
    obs3 = ReviewedObservation(
        observation_id=uuid.uuid4(),
        hpo_id="HP:0002616",  # Aortic root aneurysm
        polarity=Polarity.present,
        temporality=Temporality.current,
        experiencer=Experiencer.patient,
        onset_age_group=OnsetAgeGroup.later_childhood_6_to_11_years,
        review_status=ReviewStatus.confirmed,
    )

    req = MatchRequest(observations=[obs1, obs2, obs3])
    resp = matcher.match(req)

    assert resp.status == "ranked"
    top_hit = resp.candidates[0]
    assert top_hit.disease_id == "OMIM:154700"
    assert "Marfan" in top_hit.disease_label


def test_matcher_exclusion_rules():
    repo = AnnotationRepository(PACK_DIR)
    matcher = DeterministicMatcher(repo)

    # Negated observation
    neg_obs = ReviewedObservation(
        observation_id=uuid.uuid4(),
        hpo_id="HP:0001250",
        polarity=Polarity.negated,
        temporality=Temporality.current,
        experiencer=Experiencer.patient,
        onset_age_group=OnsetAgeGroup.unknown,
        review_status=ReviewStatus.confirmed,
    )
    # Family history observation
    fam_obs = ReviewedObservation(
        observation_id=uuid.uuid4(),
        hpo_id="HP:0001166",
        polarity=Polarity.present,
        temporality=Temporality.current,
        experiencer=Experiencer.family_member,
        onset_age_group=OnsetAgeGroup.unknown,
        review_status=ReviewStatus.confirmed,
    )

    req = MatchRequest(observations=[neg_obs, fam_obs])
    resp = matcher.match(req)

    assert resp.status == "no_candidates"
    assert len(resp.candidates) == 0
    assert len(resp.excluded_observations) == 2
    reasons = {ex.reason.value for ex in resp.excluded_observations}
    assert "negated_not_scored_in_v1" in reasons
    assert "family_history_not_scored_in_v1" in reasons
