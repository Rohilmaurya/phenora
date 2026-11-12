import time
import uuid
import pytest
from pydantic import ValidationError
from fastapi import HTTPException

from backend.app.auth.bearer import create_token, verify_token
from backend.app.schemas import (
    ErrorCode,
    ErrorResponse,
    ExtractionRequest,
    ExtractionResponse,
    HealthResponse,
    HpoTerm,
    MatchKind,
    MatchRequest,
    MatchResponse,
    ModelProvenance,
    OnsetAgeGroup,
    PhenotypeMention,
    Polarity,
    Relation,
    ResolverStatus,
    ReviewStatus,
    ReviewedObservation,
    SourceSpan,
    Temporality,
    Experiencer,
    EvidenceGraph,
    DataVersion,
)


def test_auth_token_lifecycle():
    token = create_token(actor_id="test-clinician-1", role="clinician", expires_in_seconds=60)
    principal = verify_token(token)
    assert principal.actor_id == "test-clinician-1"
    assert principal.role == "clinician"
    assert principal.issuer == "phenora-local-idp"
    assert principal.audience == "phenora-backend"


def test_auth_expired_token():
    token = create_token(actor_id="test-user", expires_in_seconds=-10)
    with pytest.raises(HTTPException) as exc_info:
        verify_token(token)
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail["code"] == "unauthenticated"


def test_auth_tampered_token():
    token = create_token(actor_id="test-user", secret="wrong-secret-that-is-at-least-32-chars-long")
    with pytest.raises(HTTPException) as exc_info:
        verify_token(token)
    assert exc_info.value.status_code == 401


def test_hpo_term_regex():
    # Valid HPO ID
    term = HpoTerm(hpo_id="HP:0001250", label="Seizure", match_kind=MatchKind.exact_label)
    assert term.hpo_id == "HP:0001250"

    # Invalid HPO ID pattern
    with pytest.raises(ValidationError):
        HpoTerm(hpo_id="HP:1250", label="Seizure", match_kind=MatchKind.exact_label)


def test_extra_fields_forbidden():
    # StrictModel forbids additionalProperties
    with pytest.raises(ValidationError):
        ExtractionRequest(note_text="Patient has fever", unknown_field="unexpected")


def test_extraction_request_validation():
    req = ExtractionRequest(note_text="Infant with intractable seizures.")
    assert req.note_text == "Infant with intractable seizures."
    assert req.language == "en"

    # min length validation
    with pytest.raises(ValidationError):
        ExtractionRequest(note_text="")


def test_reviewed_observation_schema():
    obs = ReviewedObservation(
        observation_id=uuid.uuid4(),
        hpo_id="HP:0001250",
        polarity=Polarity.present,
        temporality=Temporality.current,
        experiencer=Experiencer.patient,
        onset_age_group=OnsetAgeGroup.infancy_29_days_to_1_year,
        review_status=ReviewStatus.confirmed,
    )
    assert obs.polarity == Polarity.present
    assert obs.review_status == ReviewStatus.confirmed


def test_match_response_notice_constant():
    resp = MatchResponse(
        request_id=uuid.uuid4(),
        status="no_candidates",
        data_version=DataVersion(
            ontology_release="2026-10-01",
            annotation_release="2026-10-15",
            manifest_sha256="a" * 64,
        ),
        graph=EvidenceGraph(nodes=[], edges=[]),
    )
    assert "not a diagnosis or a probability" in resp.notice
