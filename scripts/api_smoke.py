#!/usr/bin/env python3
"""End-to-end API smoke test simulating the clinician extraction, review, and matching workflow."""
import argparse
import os
import sys
import uuid
import httpx

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.auth.bearer import create_token


def run_smoke_test(base_url: str):
    print(f"=== Phenora Backend API Smoke Test against {base_url} ===")
    token = create_token(actor_id="smoke-clinician", role="clinician")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    with httpx.Client(base_url=base_url, timeout=90.0) as client:
        # 1. Health check
        print("\n[Step 1] Checking /v1/health (No Auth)...")
        r_health = client.get("/v1/health")
        assert r_health.status_code == 200, f"Health check failed: {r_health.text}"
        health = r_health.json()
        print(f"  -> Status: {health['status']}, Pack ID: {health['data_pack_id']}")
        assert health["status"] == "ready"

        # 2. Term Search
        print("\n[Step 2] Testing /v1/terms/search (Manual HPO Entry)...")
        r_search = client.post("/v1/terms/search", json={"query": "spider fingers"}, headers=headers)
        assert r_search.status_code == 200, f"Search failed: {r_search.text}"
        search_res = r_search.json()["results"]
        print(f"  -> Found {len(search_res)} matching terms. Top: {search_res[0]['label']} ({search_res[0]['hpo_id']})")
        assert search_res[0]["hpo_id"] == "HP:0001166"

        # 3. Extraction
        print("\n[Step 3] Testing /v1/extractions (Local NER)...")
        note = "14-year-old evaluated for chest deformity. Exam shows arachnodactyly, pectus excavatum, and ectopia lentis. Transthoracic echocardiogram showed aortic root aneurysm."
        r_extract = client.post("/v1/extractions", json={"note_text": note}, headers=headers)
        assert r_extract.status_code == 200, f"Extraction failed: {r_extract.text}"
        ext_res = r_extract.json()
        mentions = ext_res["mentions"]
        print(f"  -> Extracted {len(mentions)} phenotype mentions for clinician review:")
        for idx, m in enumerate(mentions, 1):
            cand = m["hpo_candidates"][0] if m["hpo_candidates"] else None
            hpo_str = f"{cand['label']} ({cand['hpo_id']})" if cand else "unmapped"
            print(f"     [{idx}] Quote: '{m['source_span']['quote']}' -> HPO: {hpo_str}")

        # 4. Clinician Review Simulation
        print("\n[Step 4] Simulating Clinician Review & Attestation...")
        reviewed_observations = []
        for m in mentions:
            if m["hpo_candidates"]:
                reviewed_observations.append({
                    "observation_id": str(uuid.uuid4()),
                    "hpo_id": m["hpo_candidates"][0]["hpo_id"],
                    "polarity": m["polarity"],
                    "temporality": m["temporality"],
                    "experiencer": m["experiencer"],
                    "onset_age_group": m["onset_age_group"],
                    "review_status": "confirmed",
                    "source_mention_ids": [m["mention_id"]],
                })
        print(f"  -> Confirmed {len(reviewed_observations)} observations for evidence matching.")

        # 5. Matching & Graph Verification
        print("\n[Step 5] Testing /v1/matches (Deterministic Evidence Ranking)...")
        r_match = client.post(
            "/v1/matches",
            json={"observations": reviewed_observations, "candidate_limit": 5},
            headers=headers,
        )
        assert r_match.status_code == 200, f"Match failed: {r_match.text}"
        match_res = r_match.json()
        assert match_res["status"] == "ranked"
        candidates = match_res["candidates"]
        print(f"  -> Returned {len(candidates)} ranked disease candidates:")
        for c in candidates:
            print(f"     Rank #{c['rank']}: {c['disease_label']} ({c['disease_id']}) - Supported by {len(c['supporting_observations'])} symptoms")

        top_candidate = candidates[0]
        assert top_candidate["disease_id"] == "OMIM:154700", f"Expected Marfan syndrome, got {top_candidate['disease_id']}"
        print(f"\n  -> Top Match Confirmed: {top_candidate['disease_label']} ({top_candidate['disease_id']})")
        print(f"  -> Evidence Graph: {len(match_res['graph']['nodes'])} nodes, {len(match_res['graph']['edges'])} edges")
        print(f"  -> Disclaimer: '{match_res['notice']}'")

    print("\n=== All Smoke Tests Passed Successfully! ===")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Phenora API smoke test")
    parser.add_argument("--url", default="http://testserver", help="API base URL (default: internal testserver)")
    args = parser.parse_args()

    if args.url == "http://testserver":
        from fastapi.testclient import TestClient
        from backend.app.main import app
        # Run in-process using TestClient wrapper
        client = TestClient(app)
        # Adapt test client to direct execution
        import scripts.verify_airgap as va
        va.run_airgap_verification()
    else:
        run_smoke_test(args.url)
