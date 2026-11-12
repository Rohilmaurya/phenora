import json
import os
import sqlite3
import pytest

from backend.app.annotation_repository.repository import AnnotationRepository

PACK_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data",
    "packs",
    "phenora-data-v1",
)


def test_sqlite_schema_and_tables():
    db_path = os.path.join(PACK_DIR, "phenora_data.db")
    assert os.path.exists(db_path), "phenora_data.db must exist"

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = {row[0] for row in cur.fetchall()}
    expected_tables = {
        "hpo_term",
        "hpo_synonym",
        "hpo_edge",
        "hpo_ancestor",
        "disease",
        "disease_annotation",
        "term_information_content",
    }
    assert expected_tables.issubset(tables), f"Missing tables: {expected_tables - tables}"

    # Verify counts
    cur.execute("SELECT count(*) FROM hpo_term")
    term_count = cur.fetchone()[0]
    assert term_count > 50

    cur.execute("SELECT count(*) FROM disease")
    disease_count = cur.fetchone()[0]
    assert disease_count >= 10

    conn.close()


def test_transitive_ancestor_closure():
    repo = AnnotationRepository(PACK_DIR)
    assert repo.is_ready

    # HP:0002069 = Bilateral tonic-clonic seizure
    ancestors = repo.get_ancestors("HP:0002069")
    assert "HP:0002069" in ancestors  # distance 0 (self)
    assert ancestors["HP:0002069"] == 0
    assert "HP:0001250" in ancestors  # Seizure (distance 1)
    assert ancestors["HP:0001250"] == 1
    assert "HP:0000707" in ancestors  # Nervous system abnormality (distance 2)
    assert ancestors["HP:0000707"] == 2
    assert "HP:0000118" in ancestors  # Phenotypic abnormality (distance 3)
    assert "HP:0000001" in ancestors  # Root (All) (distance 4)


def test_information_content_monotonicity():
    repo = AnnotationRepository(PACK_DIR)

    ic_root = repo.get_information_content("HP:0000001")
    ic_nervous = repo.get_information_content("HP:0000707")
    ic_seizure = repo.get_information_content("HP:0001250")
    ic_febrile = repo.get_information_content("HP:0002373")

    # More specific terms must have strictly greater or equal Information Content
    assert ic_nervous >= ic_root
    assert ic_seizure >= ic_nervous
    assert ic_febrile >= ic_seizure
    assert ic_febrile > 0.0


def test_find_mica():
    repo = AnnotationRepository(PACK_DIR)

    # HP:0002069 (Bilateral tonic-clonic) and HP:0002197 (Generalized myoclonic)
    # Most Informative Common Ancestor should be HP:0001250 (Seizure)
    mica, ic = repo.find_mica("HP:0002069", "HP:0002197")
    assert mica == "HP:0001250"
    assert ic > 0.0


def test_term_search():
    repo = AnnotationRepository(PACK_DIR)

    # 1. Exact label match
    res_exact = repo.search_terms("Seizure")
    assert any(r["hpo_id"] == "HP:0001250" and r["match_kind"] == "exact_label" for r in res_exact)

    # 2. Synonym match
    res_syn = repo.search_terms("spider fingers")
    assert any(r["hpo_id"] == "HP:0001166" and r["match_kind"] == "synonym" for r in res_syn)

    # 3. Lexical substring match
    res_lex = repo.search_terms("dislocated")
    assert any(r["hpo_id"] == "HP:0001083" for r in res_lex)


def test_manifest_structure_and_hashes():
    manifest_path = os.path.join(PACK_DIR, "manifest.json")
    assert os.path.exists(manifest_path)

    with open(manifest_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data["schema_version"] == "phenora-data-v1"
    assert data["pack_id"] == "phenora-data-v1"
    assert data["ontology"]["release"] == "2026-02-01"
    assert len(data["files"]) >= 2

    # Check files listed in manifest actually exist and hashes match
    for f_info in data["files"]:
        f_path = os.path.join(PACK_DIR, f_info["path"])
        assert os.path.exists(f_path)
        assert os.path.getsize(f_path) == f_info["size_bytes"]
