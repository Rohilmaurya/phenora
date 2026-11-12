import json
import os
import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.auth.bearer import create_token
from backend.app.main import app

FIXTURES_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "fixtures",
    "synthetic_cases",
)


@pytest.fixture
def auth_headers():
    token = create_token(actor_id="golden-tester", role="clinician")
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.anyio
async def test_golden_case_01_dravet(auth_headers):
    with open(os.path.join(FIXTURES_DIR, "case_01_dravet.json"), "r", encoding="utf-8") as f:
        case = json.load(f)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Extraction
        resp_ext = await ac.post("/v1/extractions", json={"note_text": case["note_text"]}, headers=auth_headers)
        assert resp_ext.status_code == 200
        mentions = resp_ext.json()["mentions"]
        assert len(mentions) >= len(case["expected_mentions"])

        # 2. Review round-trip
        reviewed_obs = [
            {
                "observation_id": str(uuid.uuid4()),
                "hpo_id": m["hpo_candidates"][0]["hpo_id"],
                "polarity": m["polarity"],
                "temporality": m["temporality"],
                "experiencer": m["experiencer"],
                "onset_age_group": m["onset_age_group"],
                "review_status": "confirmed",
            }
            for m in mentions
            if m["hpo_candidates"]
        ]

        # 3. Match
        resp_match = await ac.post("/v1/matches", json={"observations": reviewed_obs}, headers=auth_headers)
        assert resp_match.status_code == 200
        match_data = resp_match.json()
        assert match_data["status"] == "ranked"
        assert match_data["candidates"][0]["disease_id"] == case["expected_disease_id"]
        assert match_data["candidates"][0].get("icd11_code") == "8A61.11"


@pytest.mark.anyio
async def test_golden_case_02_marfan(auth_headers):
    with open(os.path.join(FIXTURES_DIR, "case_02_marfan.json"), "r", encoding="utf-8") as f:
        case = json.load(f)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp_ext = await ac.post("/v1/extractions", json={"note_text": case["note_text"]}, headers=auth_headers)
        assert resp_ext.status_code == 200
        mentions = resp_ext.json()["mentions"]

        reviewed_obs = [
            {
                "observation_id": str(uuid.uuid4()),
                "hpo_id": m["hpo_candidates"][0]["hpo_id"],
                "polarity": m["polarity"],
                "temporality": m["temporality"],
                "experiencer": m["experiencer"],
                "onset_age_group": m["onset_age_group"],
                "review_status": "confirmed",
            }
            for m in mentions
            if m["hpo_candidates"]
        ]

        resp_match = await ac.post("/v1/matches", json={"observations": reviewed_obs}, headers=auth_headers)
        assert resp_match.status_code == 200
        match_data = resp_match.json()
        assert match_data["status"] == "ranked"
        top_ids = [c["disease_id"] for c in match_data["candidates"][:5]]
        assert case["expected_disease_id"] in top_ids
        marfan = next(c for c in match_data["candidates"][:5] if c["disease_id"] == case["expected_disease_id"])
        assert marfan.get("icd11_code") == "LD28.01"


@pytest.mark.anyio
async def test_golden_case_03_exclusion(auth_headers):
    with open(os.path.join(FIXTURES_DIR, "case_03_exclusion.json"), "r", encoding="utf-8") as f:
        case = json.load(f)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp_ext = await ac.post("/v1/extractions", json={"note_text": case["note_text"]}, headers=auth_headers)
        assert resp_ext.status_code == 200
        mentions = resp_ext.json()["mentions"]

        reviewed_obs = [
            {
                "observation_id": str(uuid.uuid4()),
                "hpo_id": m["hpo_candidates"][0]["hpo_id"],
                "polarity": m["polarity"],
                "temporality": m["temporality"],
                "experiencer": m["experiencer"],
                "onset_age_group": m["onset_age_group"],
                "review_status": "confirmed",
            }
            for m in mentions
            if m["hpo_candidates"]
        ]

        resp_match = await ac.post("/v1/matches", json={"observations": reviewed_obs}, headers=auth_headers)
        assert resp_match.status_code == 200
        match_data = resp_match.json()
        # All submitted terms were negated or family history -> no candidates should be forced
        assert match_data["status"] == "no_candidates"
        assert len(match_data["candidates"]) == 0
        assert len(match_data["excluded_observations"]) >= 2


@pytest.mark.anyio
async def test_golden_case_04_rett(auth_headers):
    with open(os.path.join(FIXTURES_DIR, "case_04_rett.json"), "r", encoding="utf-8") as f:
        case = json.load(f)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp_ext = await ac.post("/v1/extractions", json={"note_text": case["note_text"]}, headers=auth_headers)
        assert resp_ext.status_code == 200
        mentions = resp_ext.json()["mentions"]

        reviewed_obs = [
            {
                "observation_id": str(uuid.uuid4()),
                "hpo_id": m["hpo_candidates"][0]["hpo_id"],
                "polarity": m["polarity"],
                "temporality": m["temporality"],
                "experiencer": m["experiencer"],
                "onset_age_group": m["onset_age_group"],
                "review_status": "confirmed",
            }
            for m in mentions
            if m["hpo_candidates"]
        ]

        resp_match = await ac.post("/v1/matches", json={"observations": reviewed_obs}, headers=auth_headers)
        assert resp_match.status_code == 200
        match_data = resp_match.json()
        assert match_data["status"] == "ranked"
        assert match_data["candidates"][0]["disease_id"] == case["expected_disease_id"]
        assert match_data["candidates"][0].get("icd11_code") == "LD90.4"
