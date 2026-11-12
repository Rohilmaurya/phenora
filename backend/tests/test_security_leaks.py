import socket
import time
import uuid
from unittest.mock import patch

import jwt
import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from backend.app.auth.bearer import (
    DEFAULT_SECRET,
    EXPECTED_AUDIENCE,
    EXPECTED_ISSUER,
    JWT_ALGORITHM,
    create_token,
    require_auth,
    verify_token,
)
from backend.app.schemas import (
    ErrorCode,
    ErrorResponse,
    ExtractionRequest,
    HpoTerm,
    MatchKind,
    MatchRequest,
    OnsetAgeGroup,
    Polarity,
    ReviewedObservation,
    ReviewStatus,
    Temporality,
    Experiencer,
)


# -------------------------------------------------------------------------
# 1. AUTHENTICATION & TOKEN VULNERABILITY TESTS
# -------------------------------------------------------------------------

def test_jwt_none_algorithm_rejected():
    """Ensure alg='none' token signature bypass is strictly blocked."""
    payload = {
        "sub": "attacker-01",
        "role": "admin",
        "iss": EXPECTED_ISSUER,
        "aud": EXPECTED_AUDIENCE,
        "exp": int(time.time()) + 3600,
    }
    # Forge token with alg="none"
    forged_token = jwt.encode(payload, key="", algorithm="none")
    with pytest.raises(HTTPException) as exc_info:
        verify_token(forged_token)
    assert exc_info.value.status_code == 401
    assert exc_info.value.headers.get("Cache-Control") == "no-store"


def test_jwt_algorithm_confusion_rejected():
    """Ensure tokens with mismatched algorithms (e.g. HS512 when expecting HS256) fail."""
    now = int(time.time())
    payload = {
        "sub": "user-01",
        "role": "clinician",
        "iss": EXPECTED_ISSUER,
        "aud": EXPECTED_AUDIENCE,
        "iat": now,
        "exp": now + 3600,
    }
    # Encode with HS512 using a 64-byte key
    hs512_secret = "a" * 64
    hs512_token = jwt.encode(payload, hs512_secret, algorithm="HS512")
    with pytest.raises(HTTPException) as exc_info:
        verify_token(hs512_token)
    assert exc_info.value.status_code == 401


def test_jwt_missing_claims_rejected():
    """Ensure tokens missing mandatory claims (iss, aud, exp, sub) are rejected."""
    now = int(time.time())

    # Missing aud
    bad_payload_1 = {"sub": "u1", "iss": EXPECTED_ISSUER, "exp": now + 3600}
    t1 = jwt.encode(bad_payload_1, DEFAULT_SECRET, algorithm=JWT_ALGORITHM)
    with pytest.raises(HTTPException) as exc1:
        verify_token(t1)
    assert exc1.value.status_code == 401

    # Missing iss
    bad_payload_2 = {"sub": "u1", "aud": EXPECTED_AUDIENCE, "exp": now + 3600}
    t2 = jwt.encode(bad_payload_2, DEFAULT_SECRET, algorithm=JWT_ALGORITHM)
    with pytest.raises(HTTPException) as exc2:
        verify_token(t2)
    assert exc2.value.status_code == 401

    # Missing sub
    bad_payload_3 = {"iss": EXPECTED_ISSUER, "aud": EXPECTED_AUDIENCE, "exp": now + 3600}
    t3 = jwt.encode(bad_payload_3, DEFAULT_SECRET, algorithm=JWT_ALGORITHM)
    with pytest.raises(HTTPException) as exc3:
        verify_token(t3)
    assert exc3.value.status_code == 401


def test_require_auth_fails_closed_without_credentials():
    """Ensure unauthenticated callers receive 401 with no-store cache header."""
    with pytest.raises(HTTPException) as exc:
        require_auth(None)
    assert exc.value.status_code == 401
    assert exc.value.headers.get("Cache-Control") == "no-store"
    assert exc.value.detail["code"] == "unauthenticated"


# -------------------------------------------------------------------------
# 2. DATA LEAKAGE & BOUNDARY DEFENSE TESTS
# -------------------------------------------------------------------------

def test_match_request_strictly_forbids_raw_note_text():
    """Ensure MatchRequest rejects raw patient text to prevent leaking unreviewed PHI to matcher."""
    obs = ReviewedObservation(
        observation_id=uuid.uuid4(),
        hpo_id="HP:0001250",
        polarity=Polarity.present,
        temporality=Temporality.current,
        experiencer=Experiencer.patient,
        onset_age_group=OnsetAgeGroup.infancy_29_days_to_1_year,
        review_status=ReviewStatus.confirmed,
    )
    # Valid match request
    valid_req = MatchRequest(observations=[obs])
    assert len(valid_req.observations) == 1

    # Attempting to inject raw note text must be blocked by extra="forbid"
    with pytest.raises(ValidationError):
        MatchRequest(observations=[obs], raw_note="Child has severe intractable seizures")

    # Attempting to inject note text into ReviewedObservation must be blocked
    with pytest.raises(ValidationError):
        ReviewedObservation(
            observation_id=uuid.uuid4(),
            hpo_id="HP:0001250",
            polarity=Polarity.present,
            temporality=Temporality.current,
            experiencer=Experiencer.patient,
            onset_age_group=OnsetAgeGroup.infancy_29_days_to_1_year,
            review_status=ReviewStatus.confirmed,
            note_excerpt="leaked clinical phrase",
        )


def test_extraction_request_dos_and_leak_boundaries():
    """Ensure note size is capped at 50,000 characters and empty notes are rejected."""
    # Min length boundary
    with pytest.raises(ValidationError):
        ExtractionRequest(note_text="")

    # Max length boundary (50,000 characters is allowed, 50,001 is rejected)
    valid_text = "A" * 50000
    req = ExtractionRequest(note_text=valid_text)
    assert len(req.note_text) == 50000

    too_large_text = "A" * 50001
    with pytest.raises(ValidationError):
        ExtractionRequest(note_text=too_large_text)


def test_error_response_blocks_arbitrary_phi_injection():
    """ErrorResponse must reject arbitrary fields to prevent echoing back patient text in errors."""
    with pytest.raises(ValidationError):
        ErrorResponse(
            request_id=uuid.uuid4(),
            code=ErrorCode.invalid_request,
            message="Invalid field",
            echoed_patient_data="Confidential pediatric history",
        )


def test_hpo_id_format_injection_prevented():
    """Verify that SQL injection or malicious strings cannot be passed as HPO IDs."""
    malicious_inputs = [
        "HP:0001250; DROP TABLE hpo_term;--",
        "HP:000125",  # Too short
        "HP:000001250",  # Too long
        "ORPHA:12345",  # Wrong prefix
        "<script>alert(1)</script>",
        "../../etc/passwd",
    ]
    for bad_id in malicious_inputs:
        with pytest.raises(ValidationError):
            HpoTerm(hpo_id=bad_id, label="Test Term", match_kind=MatchKind.exact_label)


# -------------------------------------------------------------------------
# 3. ZERO REMOTE NETWORK EGRESS TEST
# -------------------------------------------------------------------------

def test_zero_network_egress():
    """Verify that auth token creation, verification, and schema validation make ZERO network calls."""
    real_connect = socket.socket.connect

    def blocked_connect(self, address):
        # Allow loopback connections only if needed, block all WAN/LAN
        host, port = address[0], address[1]
        if host not in ("127.0.0.1", "localhost", "::1"):
            raise ConnectionRefusedError(f"Air-gap egress violation! Attempted connection to {host}:{port}")
        return real_connect(self, address)

    with patch.object(socket.socket, "connect", blocked_connect):
        # 1. Mint token
        token = create_token(actor_id="airgap-user", role="clinician")
        # 2. Verify token
        principal = verify_token(token)
        assert principal.actor_id == "airgap-user"
        # 3. Validate models
        req = ExtractionRequest(note_text="Testing zero network egress.")
        assert req.language == "en"
