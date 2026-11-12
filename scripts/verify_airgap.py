#!/usr/bin/env python3
"""Validates that Phenora starts, extracts, and matches with outbound egress strictly blocked."""
import os
import socket
import sys
import uuid
from unittest.mock import patch

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from backend.app.auth.bearer import create_token
from backend.app.main import app


def run_airgap_verification():
    real_connect = socket.socket.connect

    def blocked_connect(self, address):
        host = address[0]
        if host not in ("127.0.0.1", "localhost", "::1"):
            raise ConnectionRefusedError(
                f"Air-gap egress violation! Attempted outbound connection to: {address}"
            )
        return real_connect(self, address)

    print("[AIR-GAP GATE] Blocking all external network egress...")
    with patch.object(socket.socket, "connect", blocked_connect):
        client = TestClient(app)

        # 1. Health check (no egress)
        print("[1/4] Checking GET /v1/health...")
        resp = client.get("/v1/health")
        assert resp.status_code == 200, f"Health check failed: {resp.text}"
        data = resp.json()
        assert data["status"] == "ready"
        print(f"      OK. Pack: {data['data_pack_id']} (Release: {data['ontology_release']})")

        # 2. Token creation & Term search
        print("[2/4] Testing offline JWT & POST /v1/terms/search...")
        token = create_token(actor_id="airgap-tester", role="clinician")
        headers = {"Authorization": f"Bearer {token}"}
        resp = client.post("/v1/terms/search", json={"query": "seizure"}, headers=headers)
        assert resp.status_code == 200, f"Search failed: {resp.text}"
        print(f"      OK. Returned {len(resp.json()['results'])} results locally.")

        # 3. Extraction
        print("[3/4] Testing POST /v1/extractions...")
        note = "Infant with febrile seizures and ataxia."
        resp = client.post("/v1/extractions", json={"note_text": note}, headers=headers)
        assert resp.status_code == 200, f"Extraction failed: {resp.text}"
        mentions = resp.json()["mentions"]
        assert len(mentions) >= 2
        print(f"      OK. Extracted {len(mentions)} source-grounded mentions locally.")

        # 4. Matching
        print("[4/4] Testing POST /v1/matches...")
        obs = [
            {
                "observation_id": str(uuid.uuid4()),
                "hpo_id": m["hpo_candidates"][0]["hpo_id"],
                "polarity": "present",
                "temporality": "current",
                "experiencer": "patient",
                "onset_age_group": "infancy_29_days_to_1_year",
                "review_status": "confirmed",
            }
            for m in mentions
            if m.get("hpo_candidates")
        ]
        resp = client.post("/v1/matches", json={"observations": obs}, headers=headers)
        assert resp.status_code == 200, f"Match failed: {resp.text}"
        match_data = resp.json()
        assert match_data["status"] == "ranked"
        top_hit = match_data["candidates"][0]
        print(f"      OK. Top candidate: {top_hit['disease_label']} ({top_hit['disease_id']})")

    print("\n[AIR-GAP GATE PASSED] All operations completed with 0 external network requests.")
    return True


if __name__ == "__main__":
    success = run_airgap_verification()
    sys.exit(0 if success else 1)
