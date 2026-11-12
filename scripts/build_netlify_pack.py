#!/usr/bin/env python3
"""Compile a compact gzipped JSON index of phenora-who-icd11-v1 for Netlify Functions."""

import gzip
import hashlib
import json
import os
import sqlite3

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PACK_DIR = os.path.join(ROOT_DIR, "data", "packs", "phenora-who-icd11-v1")
DB_PATH = os.path.join(PACK_DIR, "phenora_data.db")
MANIFEST_PATH = os.path.join(PACK_DIR, "manifest.json")
OUT_PATH = os.path.join(ROOT_DIR, "frontend", "netlify", "data", "phenora_who_pack.json.gz")


def main() -> None:
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Missing pack DB: {DB_PATH}")
    with open(MANIFEST_PATH, "rb") as f:
        manifest_bytes = f.read()
    manifest = json.loads(manifest_bytes.decode("utf-8"))
    manifest_sha256 = hashlib.sha256(manifest_bytes).hexdigest()

    conn = sqlite3.connect(f"file:{os.path.abspath(DB_PATH)}?mode=ro", uri=True)
    cur = conn.cursor()

    terms = cur.execute(
        "SELECT hpo_id, label FROM hpo_term WHERE obsolete = 0 ORDER BY hpo_id"
    ).fetchall()
    tid_map = {hpo_id: i for i, (hpo_id, _) in enumerate(terms)}

    ic = {
        tid_map[hpo_id]: round(float(val), 4)
        for hpo_id, val in cur.execute("SELECT hpo_id, ic_value FROM term_information_content").fetchall()
        if hpo_id in tid_map and float(val) > 0.0
    }

    edges = [
        [tid_map[child_id], tid_map[parent_id]]
        for child_id, parent_id in cur.execute("SELECT child_id, parent_id FROM hpo_edge").fetchall()
        if child_id in tid_map and parent_id in tid_map
    ]

    syns = [
        [tid_map[hpo_id], syn, 1 if stype == "exact" else 0]
        for hpo_id, syn, stype in cur.execute("SELECT hpo_id, synonym, synonym_type FROM hpo_synonym").fetchall()
        if hpo_id in tid_map
    ]

    diseases = cur.execute(
        """
        SELECT disease_id, label, source_id, icd11_code, icd11_title, icd11_uri, orpha_code
        FROM disease
        ORDER BY disease_id
        """
    ).fetchall()
    did_map = {row[0]: i for i, row in enumerate(diseases)}

    rels: list[str] = []
    rel_idx: dict[str, int] = {}
    ann: list[list] = []
    for dis_id, hpo_id, pol, freq, ev, ref, src_rel in cur.execute(
        """
        SELECT disease_id, hpo_id, polarity, frequency, evidence_code, reference, source_release
        FROM disease_annotation
        """
    ).fetchall():
        if dis_id not in did_map or hpo_id not in tid_map:
            continue
        r_key = src_rel or ""
        if r_key not in rel_idx:
            rel_idx[r_key] = len(rels)
            rels.append(r_key)
        ann.append([
            did_map[dis_id],
            tid_map[hpo_id],
            1 if pol == "present" else 0,
            freq or "",
            ev or "",
            ref or "",
            rel_idx[r_key],
        ])

    conn.close()

    payload = {
        "manifest": {
            "pack_id": manifest.get("pack_id", "phenora-who-icd11-v1"),
            "ontology_release": manifest.get("ontology", {}).get("release", "unknown"),
            "annotation_release": manifest.get("annotations", {}).get("release", "unknown"),
            "manifest_sha256": manifest_sha256,
        },
        "terms": terms,
        "ic": ic,
        "edges": edges,
        "syns": syns,
        "diseases": diseases,
        "rels": rels,
        "ann": ann,
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    compressed = gzip.compress(raw, compresslevel=9)
    with open(OUT_PATH, "wb") as f:
        f.write(compressed)

    print(
        f"[build_netlify_pack] Wrote {OUT_PATH} "
        f"({len(compressed) / 1024 / 1024:.2f} MB gzipped, {len(raw) / 1024 / 1024:.2f} MB raw; "
        f"{len(terms)} terms, {len(diseases)} diseases, {len(ann)} annotations)"
    )


if __name__ == "__main__":
    main()
