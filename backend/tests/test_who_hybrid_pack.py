import json
import os
import sqlite3
import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.annotation_repository.repository import AnnotationRepository, compute_sha256
from backend.app.auth.bearer import create_token
from backend.app.main import app

WHO_PACK_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data",
    "packs",
    "phenora-who-icd11-v1",
)


def test_who_hybrid_pack_manifest_and_counts():
    manifest_path = os.path.join(WHO_PACK_DIR, "manifest.json")
    assert os.path.exists(manifest_path), "phenora-who-icd11-v1 manifest.json must exist"

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    assert manifest["schema_version"] == "phenora-data-v1"
    assert manifest["pack_id"] == "phenora-who-icd11-v1"
    assert manifest["counts"]["hpo_terms"] > 15000
    assert manifest["counts"]["diseases"] > 5000
    assert manifest["counts"]["associations"] > 150000

    for file_entry in manifest["files"]:
        fp = os.path.join(WHO_PACK_DIR, file_entry["path"])
        assert os.path.exists(fp)
        assert compute_sha256(fp) == file_entry["sha256"]


def test_who_hybrid_pack_all_diseases_have_icd11_codes():
    db_path = os.path.join(WHO_PACK_DIR, "phenora_data.db")
    conn = sqlite3.connect(f"file:{os.path.abspath(db_path)}?mode=ro", uri=True)
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM disease WHERE icd11_code IS NULL OR TRIM(icd11_code) = ''")
    missing_count = cur.fetchone()[0]
    assert missing_count == 0

    cur.execute("SELECT icd11_code, orpha_code FROM disease WHERE disease_id = 'OMIM:607208'")
    row = cur.fetchone()
    assert row is not None
    assert row[0] == "8A61.11"
    assert row[1] == "ORPHA:33069"
    conn.close()


def test_who_hybrid_pack_wilson_disease_full_hpo_extraction():
    """Verifies non-seed diseases (e.g., Wilson disease) extract & match via full HPO + WHO ICD-11."""
    repo = AnnotationRepository(WHO_PACK_DIR)
    assert repo.is_ready
    meta = repo.get_disease_metadata("OMIM:277900")
    assert meta.get("icd11_code") == "5C64.00"


@pytest.mark.anyio
async def test_who_hybrid_api_wilson_end_to_end():
    token = create_token(actor_id="who-tester", role="clinician")
    headers = {"Authorization": f"Bearer {token}"}
    note = "Teenager presenting with cirrhosis, Kayser-Fleischer ring, and dysarthria."

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp_ext = await ac.post("/v1/extractions", json={"note_text": note}, headers=headers)
        assert resp_ext.status_code == 200
        mentions = resp_ext.json()["mentions"]
        extracted_hpo_ids = {m["hpo_candidates"][0]["hpo_id"] for m in mentions if m["hpo_candidates"]}
        assert {"HP:0001394", "HP:0200032", "HP:0001260"}.issubset(extracted_hpo_ids)

        obs = [
            {
                "observation_id": m["mention_id"],
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
        resp_match = await ac.post("/v1/matches", json={"observations": obs, "candidate_limit": 10}, headers=headers)
        assert resp_match.status_code == 200
        candidates = resp_match.json()["candidates"]
        assert len(candidates) > 0
        assert any(
            c["disease_id"] == "OMIM:277900" and c.get("icd11_code") == "5C64.00"
            for c in candidates[:5]
        )
