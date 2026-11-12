#!/usr/bin/env python3
"""Builds the offline SQLite HPO data pack and manifest for Phenora.

Computes transitive DAG ancestor closures and precomputes Information Content (IC)
according to TRD.md Section 7 & 9.
"""
import collections
import hashlib
import json
import math
import os
import sqlite3
import sys
import time

# Ensure import paths work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.data_import.seed_data import DISEASES_SEED, HPO_TERMS_SEED

PACK_ID = "phenora-data-v1"
ONTOLOGY_RELEASE = "2026-02-01"
ANNOTATION_RELEASE = "2026-02-15"
SELECTION_VERSION = "pediatric-core-v1"


def compute_sha256(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def compute_ancestor_closure(terms_seed):
    """Computes all transitive ancestors for each term via BFS."""
    # Build child -> parents adjacency
    parents_map = collections.defaultdict(set)
    all_term_ids = set()
    for hpo_id, _, _, parents in terms_seed:
        all_term_ids.add(hpo_id)
        for p in parents:
            parents_map[hpo_id].add(p)
            all_term_ids.add(p)

    ancestors = []  # (descendant_id, ancestor_id, distance)
    for term_id in all_term_ids:
        # BFS
        visited = {term_id: 0}
        queue = collections.deque([(term_id, 0)])
        while queue:
            curr, dist = queue.popleft()
            ancestors.append((term_id, curr, dist))
            for parent in parents_map.get(curr, []):
                if parent not in visited:
                    visited[parent] = dist + 1
                    queue.append((parent, dist + 1))
    return ancestors


def build_pack(output_dir: str):
    os.makedirs(output_dir, exist_ok=True)
    db_path = os.path.join(output_dir, "phenora_data.db")
    if os.path.exists(db_path):
        os.remove(db_path)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # 1. Create tables
    cur.execute("""
        CREATE TABLE hpo_term (
            hpo_id TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            obsolete INTEGER DEFAULT 0,
            replacement_id TEXT
        )
    """)
    cur.execute("""
        CREATE TABLE hpo_synonym (
            hpo_id TEXT NOT NULL,
            synonym TEXT NOT NULL,
            synonym_type TEXT DEFAULT 'exact',
            FOREIGN KEY (hpo_id) REFERENCES hpo_term(hpo_id)
        )
    """)
    cur.execute("""
        CREATE TABLE hpo_edge (
            child_id TEXT NOT NULL,
            parent_id TEXT NOT NULL,
            relation TEXT NOT NULL DEFAULT 'subClassOf'
        )
    """)
    cur.execute("""
        CREATE TABLE hpo_ancestor (
            descendant_id TEXT NOT NULL,
            ancestor_id TEXT NOT NULL,
            distance INTEGER NOT NULL,
            PRIMARY KEY (descendant_id, ancestor_id)
        )
    """)
    cur.execute("""
        CREATE TABLE disease (
            disease_id TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            source_id TEXT NOT NULL
        )
    """)
    cur.execute("""
        CREATE TABLE disease_annotation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            disease_id TEXT NOT NULL,
            hpo_id TEXT NOT NULL,
            polarity TEXT NOT NULL DEFAULT 'present',
            frequency TEXT,
            evidence_code TEXT,
            reference TEXT,
            source_release TEXT NOT NULL,
            FOREIGN KEY (disease_id) REFERENCES disease(disease_id),
            FOREIGN KEY (hpo_id) REFERENCES hpo_term(hpo_id)
        )
    """)
    cur.execute("""
        CREATE TABLE term_information_content (
            hpo_id TEXT PRIMARY KEY,
            ic_value REAL NOT NULL,
            annotation_disease_count INTEGER NOT NULL,
            FOREIGN KEY (hpo_id) REFERENCES hpo_term(hpo_id)
        )
    """)

    # 2. Populate HPO terms, synonyms, and edges
    terms_to_insert = []
    synonyms_to_insert = []
    edges_to_insert = []

    for hpo_id, label, synonyms, parents in HPO_TERMS_SEED:
        terms_to_insert.append((hpo_id, label, 0, None))
        for syn in synonyms:
            synonyms_to_insert.append((hpo_id, syn, "exact"))
        for p in parents:
            edges_to_insert.append((hpo_id, p, "subClassOf"))

    cur.executemany("INSERT INTO hpo_term VALUES (?, ?, ?, ?)", terms_to_insert)
    cur.executemany("INSERT INTO hpo_synonym VALUES (?, ?, ?)", synonyms_to_insert)
    cur.executemany("INSERT INTO hpo_edge VALUES (?, ?, ?)", edges_to_insert)

    # 3. Populate Transitive Ancestors
    ancestors = compute_ancestor_closure(HPO_TERMS_SEED)
    cur.executemany("INSERT OR REPLACE INTO hpo_ancestor VALUES (?, ?, ?)", ancestors)

    # 4. Populate Diseases & Annotations
    diseases_to_insert = []
    annotations_to_insert = []

    for disease_id, label, source, annotations in DISEASES_SEED:
        diseases_to_insert.append((disease_id, label, source))
        for hpo_id, polarity, freq, evidence, ref in annotations:
            annotations_to_insert.append((
                disease_id, hpo_id, polarity, freq, evidence, ref, ANNOTATION_RELEASE
            ))

    cur.executemany("INSERT INTO disease VALUES (?, ?, ?)", diseases_to_insert)
    cur.executemany("""
        INSERT INTO disease_annotation (
            disease_id, hpo_id, polarity, frequency, evidence_code, reference, source_release
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, annotations_to_insert)

    # 5. Precompute Information Content (IC)
    # IC(t) = -ln((1 + unique_diseases_annotated_to_t_or_descendant) / (1 + total_diseases))
    total_diseases = len(DISEASES_SEED)

    # Query for all terms
    cur.execute("SELECT hpo_id FROM hpo_term")
    all_term_ids = [row[0] for row in cur.fetchall()]

    # Map ancestor -> set of descendants
    cur.execute("SELECT ancestor_id, descendant_id FROM hpo_ancestor")
    ancestor_to_descendants = collections.defaultdict(set)
    for anc, desc in cur.fetchall():
        ancestor_to_descendants[anc].add(desc)

    # Map hpo_id -> set of annotated diseases
    cur.execute("SELECT hpo_id, disease_id FROM disease_annotation WHERE polarity = 'present'")
    term_to_diseases = collections.defaultdict(set)
    for hpo_id, disease_id in cur.fetchall():
        term_to_diseases[hpo_id].add(disease_id)

    ic_records = []
    for term_id in all_term_ids:
        descendants = ancestor_to_descendants.get(term_id, {term_id})
        annotated_diseases = set()
        for desc in descendants:
            annotated_diseases.update(term_to_diseases.get(desc, set()))

        count = len(annotated_diseases)
        ic_val = -math.log((1.0 + count) / (1.0 + total_diseases))
        ic_records.append((term_id, round(ic_val, 6), count))

    cur.executemany("INSERT INTO term_information_content VALUES (?, ?, ?)", ic_records)

    # 6. Create Indexes
    cur.execute("CREATE INDEX idx_hpo_synonym_lookup ON hpo_synonym(synonym COLLATE NOCASE)")
    cur.execute("CREATE INDEX idx_hpo_term_label ON hpo_term(label COLLATE NOCASE)")
    cur.execute("CREATE INDEX idx_hpo_edge_child ON hpo_edge(child_id)")
    cur.execute("CREATE INDEX idx_hpo_edge_parent ON hpo_edge(parent_id)")
    cur.execute("CREATE INDEX idx_hpo_ancestor_desc ON hpo_ancestor(descendant_id)")
    cur.execute("CREATE INDEX idx_hpo_ancestor_anc ON hpo_ancestor(ancestor_id)")
    cur.execute("CREATE INDEX idx_annotation_disease ON disease_annotation(disease_id)")
    cur.execute("CREATE INDEX idx_annotation_hpo ON disease_annotation(hpo_id)")

    conn.commit()
    conn.close()

    # 7. Write raw seed json exports for provenance tracking and contract file validation
    ont_seed_path = os.path.join(output_dir, "ontology_seed.json")
    with open(ont_seed_path, "w", encoding="utf-8") as f:
        json.dump({"release": ONTOLOGY_RELEASE, "terms": HPO_TERMS_SEED}, f, indent=2)

    ann_seed_path = os.path.join(output_dir, "annotations_seed.json")
    with open(ann_seed_path, "w", encoding="utf-8") as f:
        json.dump({"release": ANNOTATION_RELEASE, "diseases": DISEASES_SEED}, f, indent=2)

    # 8. Generate manifest.json conforming strictly to artifact-manifests.schema.json
    db_sha256 = compute_sha256(db_path)
    ont_sha256 = compute_sha256(ont_seed_path)
    ann_sha256 = compute_sha256(ann_seed_path)

    manifest_data = {
        "schema_version": "phenora-data-v1",
        "pack_id": PACK_ID,
        "created_at": time.strftime("%Y-%m-%d"),
        "ontology": {
            "release": ONTOLOGY_RELEASE,
            "sha256": ont_sha256,
            "source": "https://hpo.jax.org",
            "license": "CC-BY-4.0"
        },
        "annotations": {
            "release": ANNOTATION_RELEASE,
            "sha256": ann_sha256,
            "source": "https://hpo.jax.org/app/data/annotations",
            "license": "CC-BY-4.0"
        },
        "selection": {
            "scope": "curated_subset",
            "method": "Curated pediatric core rare-disease phenotype cohort",
            "selection_version": SELECTION_VERSION
        },
        "counts": {
            "hpo_terms": len(HPO_TERMS_SEED),
            "diseases": len(DISEASES_SEED),
            "associations": len(annotations_to_insert)
        },
        "files": [
            {
                "role": "ontology",
                "path": "ontology_seed.json",
                "sha256": ont_sha256,
                "size_bytes": os.path.getsize(ont_seed_path),
                "license": "CC-BY-4.0"
            },
            {
                "role": "annotations",
                "path": "annotations_seed.json",
                "sha256": ann_sha256,
                "size_bytes": os.path.getsize(ann_seed_path),
                "license": "CC-BY-4.0"
            },
            {
                "role": "term_index",
                "path": "phenora_data.db",
                "sha256": db_sha256,
                "size_bytes": os.path.getsize(db_path),
                "license": "CC-BY-4.0"
            }
        ]
    }

    manifest_path = os.path.join(output_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)

    print(f"Data pack created successfully at {output_dir}")
    print(f"DB SHA256: {db_sha256}")
    print(f"Terms: {len(HPO_TERMS_SEED)}, Diseases: {len(DISEASES_SEED)}, Annotations: {len(annotations_to_insert)}")
    return manifest_data


if __name__ == "__main__":
    pack_dir = os.path.join("data", "packs", PACK_ID)
    build_pack(pack_dir)
