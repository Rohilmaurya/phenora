import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.auth.bearer import create_token
from backend.app.main import app, get_repository


@pytest.fixture
def auth_headers():
    token = create_token(actor_id="test-operator", role="clinician")
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.anyio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ready"
    assert data["api_version"] == "v1"
    assert data["extractor_status"] == "ready"
    expected_release = get_repository().manifest.get("ontology", {}).get("release")
    assert data["ontology_release"] == expected_release
    assert resp.headers.get("Cache-Control") == "no-store"
    assert "X-Request-ID" in resp.headers


@pytest.mark.anyio
async def test_terms_search_unauthenticated():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/v1/terms/search", json={"query": "seizure"})
    assert resp.status_code == 401
    assert resp.headers.get("Cache-Control") == "no-store"


@pytest.mark.anyio
async def test_terms_search_authenticated(auth_headers):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/v1/terms/search", json={"query": "seizure"}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "results" in data
    assert any(r["hpo_id"] == "HP:0001250" for r in data["results"])


@pytest.mark.anyio
async def test_extractions_pipeline(auth_headers):
    note = "7-month-old infant with recurrent febrile seizures and ataxia."
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/v1/extractions", json={"note_text": note}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "mentions" in data
    assert len(data["mentions"]) >= 2

    # Check first mention
    m = data["mentions"][0]
    assert "source_span" in m
    assert note[m["source_span"]["start"] : m["source_span"]["end"]] == m["source_span"]["quote"]
    assert len(m["hpo_candidates"]) > 0


@pytest.mark.anyio
async def test_extractions_payload_too_large(auth_headers):
    oversized_note = "A" * 50001
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/v1/extractions", json={"note_text": oversized_note}, headers=auth_headers)
    assert resp.status_code in (413, 422)


@pytest.mark.anyio
async def test_matches_pipeline(auth_headers):
    # Review round-trip simulation
    match_payload = {
        "observations": [
            {
                "observation_id": str(uuid.uuid4()),
                "hpo_id": "HP:0002373",  # Febrile seizure
                "polarity": "present",
                "temporality": "current",
                "experiencer": "patient",
                "onset_age_group": "infancy_29_days_to_1_year",
                "review_status": "confirmed",
            },
            {
                "observation_id": str(uuid.uuid4()),
                "hpo_id": "HP:0001251",  # Ataxia
                "polarity": "present",
                "temporality": "current",
                "experiencer": "patient",
                "onset_age_group": "early_childhood_1_to_5_years",
                "review_status": "confirmed",
            },
        ],
        "candidate_limit": 10,
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/v1/matches", json=match_payload, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ranked"
    assert len(data["candidates"]) > 0
    assert any(c["disease_id"] == "OMIM:607208" for c in data["candidates"][:3])  # Dravet syndrome
    assert "graph" in data
    assert len(data["graph"]["nodes"]) > 0
    assert len(data["graph"]["edges"]) > 0
    assert "not a diagnosis or a probability" in data["notice"]
