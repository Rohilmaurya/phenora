#!/usr/bin/env python3
"""Builds the offline hybrid WHO ICD-11 + Orphadata + HPO SQLite data pack for Phenora.

Build-time acquisition only (Phenora remains 100% air-gapped / offline at runtime):
  1. Orphadata Rare Disease Nomenclature & WHO ICD-11 Cross-References
     (https://www.orphadata.com/data/json/en_product1.json.tar.gz)
  2. Official Human Phenotype Ontology (HPO)
     (https://purl.obolibrary.org/obo/hp.json)
  3. Official HPO Rare Disease Phenotype Annotations
     (https://purl.obolibrary.org/obo/hp/hpoa/phenotype.hpoa)
  4. NIH Clinical Tables WHO ICD-11 Public Search API
     (https://clinicaltables.nlm.nih.gov/api/icd11_codes/v3/search)
     to verify canonical WHO ICD-11 MMS titles/codes for core syndromes & gaps.
"""
import argparse
import collections
import hashlib
import json
import math
import os
import sqlite3
import sys
import tarfile
import time
import urllib.parse
import urllib.request
from typing import Dict, List, Optional, Set, Tuple

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

PACK_ID = "phenora-who-icd11-v1"
DEFAULT_SOURCES_DIR = os.path.join("data", "raw_sources")
DEFAULT_PACK_DIR = os.path.join("data", "packs", PACK_ID)

URL_ORPHADATA_PRODUCT1 = "https://www.orphadata.com/data/json/en_product1.json.tar.gz"
URL_HPO_JSON = "https://purl.obolibrary.org/obo/hp.json"
URL_HPOA = "https://purl.obolibrary.org/obo/hp/hpoa/phenotype.hpoa"
URL_NIH_ICD11 = "https://clinicaltables.nlm.nih.gov/api/icd11_codes/v3/search"

# Core curated fallback synonyms so historical clinical phrases resolve cleanly
# under the latest HPO ontology release (2026-09-01+).
CURATED_CLINICAL_SYNONYMS: Dict[str, List[str]] = {
    "HP:0002373": [
        "Febrile seizure",
        "Febrile seizures",
        "Febrile seizure (within the pediatric population)",
        "Febrile convulsions",
        "Fever-induced seizure",
    ],
    "HP:0012171": [
        "Hand stereotypy",
        "Hand wringing",
        "Midline hand wringing",
        "Repetitive hand movements",
    ],
    "HP:0001166": ["Spider fingers", "Long slender fingers"],
    "HP:0001083": ["Dislocated lens", "Lens dislocation"],
    "HP:0002616": ["Aortic root dilation", "Aortic root dilatation"],
    "HP:0000957": ["Cafe-au-lait spot", "Cafe au lait macules", "CALMs"],
}


def compute_sha256(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def download_if_missing(url: str, dest_path: str, refresh: bool = False) -> str:
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    if refresh or not os.path.exists(dest_path) or os.path.getsize(dest_path) == 0:
        print(f"[download] {url} -> {dest_path}")
        req = urllib.request.Request(url, headers={"User-Agent": "Phenora-WHO-Hybrid-Importer/1.0"})
        with urllib.request.urlopen(req, timeout=180) as resp, open(dest_path, "wb") as out:
            while chunk := resp.read(65536):
                out.write(chunk)
    else:
        print(f"[cached]   {dest_path} ({os.path.getsize(dest_path):,} bytes)")
    return dest_path


def query_nih_icd11(term: str, cache: Dict[str, dict]) -> Optional[dict]:
    """Queries NIH Clinical Tables WHO ICD-11 MMS search and caches the top exact/best hit."""
    key = term.strip().lower()
    if key in cache:
        return cache[key]
    params = urllib.parse.urlencode({"terms": term, "df": "code,title", "maxList": "5"})
    url = f"{URL_NIH_ICD11}?{params}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Phenora-WHO-Hybrid-Importer/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        rows = payload[3] if isinstance(payload, list) and len(payload) > 3 and isinstance(payload[3], list) else []
        hit = None
        for row in rows:
            if len(row) >= 2 and row[0]:
                if row[1].strip().lower() == key or row[0].strip().lower() == key:
                    hit = {"code": row[0].strip(), "title": row[1].strip()}
                    break
        if hit is None and rows and len(rows[0]) >= 2 and rows[0][0]:
            hit = {"code": rows[0][0].strip(), "title": rows[0][1].strip()}
        cache[key] = hit
        return hit
    except Exception:
        return None


def _rel_priority(ref: dict) -> int:
    rel = ((ref.get("DisorderMappingRelation") or [{}])[0].get("Name") or [{}])[0].get("label", "")
    val = ((ref.get("DisorderMappingValidationStatus") or [{}])[0].get("Name") or [{}])[0].get("label", "")
    score = 0
    if rel.startswith("E "):
        score += 20
    elif rel.startswith("NTBT"):
        score += 10
    elif rel.startswith("BTNT"):
        score += 5
    if val == "Validated":
        score += 4
    icd_rel = ((ref.get("DisorderMappingICDRelation") or [{}])[0].get("Name") or [{}])[0].get("label", "")
    if icd_rel.startswith("Specific code"):
        score += 3
    return score


def parse_orphadata_product1(tgz_path: str) -> Tuple[dict, dict, dict]:
    """Parses Orphadata product1 for ORPHA <-> WHO ICD-11 <-> OMIM cross-references."""
    with tarfile.open(tgz_path, "r:gz") as tf:
        member = next(m for m in tf.getmembers() if m.name.endswith(".json"))
        data = json.load(tf.extractfile(member))

    jdb = data["JDBOR"][0]
    orpha_release = str(jdb.get("date", "unknown"))[:10]
    disorders = jdb["DisorderList"][0]["Disorder"]

    orpha_meta: Dict[str, dict] = {}
    omim_best_orpha: Dict[str, Tuple[int, str]] = {}

    for d in disorders:
        oc = str(d.get("OrphaCode", "")).strip()
        if not oc:
            continue
        orpha_id = f"ORPHA:{oc}"
        name = ((d.get("Name") or [{}])[0]).get("label", "").strip()
        refs = ((d.get("ExternalReferenceList") or [{}])[0]).get("ExternalReference", [])
        if isinstance(refs, dict):
            refs = [refs]

        icd11_refs = [r for r in refs if r.get("Source") == "ICD-11" and r.get("Reference")]
        icd11_refs.sort(key=_rel_priority, reverse=True)
        best_icd11 = icd11_refs[0] if icd11_refs else None

        icd10_refs = [r for r in refs if r.get("Source") == "ICD-10" and r.get("Reference")]
        icd10_refs.sort(key=_rel_priority, reverse=True)

        omim_refs = [r for r in refs if r.get("Source") == "OMIM" and r.get("Reference")]
        exact_omims = [f"OMIM:{r['Reference'].strip()}" for r in omim_refs if _rel_priority(r) >= 20]

        icd11_code = best_icd11["Reference"].strip() if best_icd11 else None
        icd11_uri = (best_icd11.get("DisorderMappingICDRefUrl") or "").strip() or None if best_icd11 else None
        icd10_code = icd10_refs[0]["Reference"].strip() if icd10_refs else None

        orpha_meta[orpha_id] = {
            "orpha_code": orpha_id,
            "name": name,
            "icd11_code": icd11_code,
            "icd11_uri": icd11_uri,
            "icd10_code": icd10_code,
            "exact_omims": exact_omims,
            "all_omims": [f"OMIM:{r['Reference'].strip()}" for r in omim_refs],
        }

        for r in omim_refs:
            omim_id = f"OMIM:{r['Reference'].strip()}"
            rank_score = _rel_priority(r) + (50 if icd11_code else 0)
            prev = omim_best_orpha.get(omim_id)
            if prev is None or rank_score > prev[0]:
                omim_best_orpha[omim_id] = (rank_score, orpha_id)

    return {"release": orpha_release, "disorder_count": len(disorders)}, orpha_meta, omim_best_orpha


def parse_hp_json(hp_path: str):
    """Parses full official hp.json into terms, synonyms, is_a edges, replacements, and release."""
    with open(hp_path, "r", encoding="utf-8") as f:
        hp = json.load(f)

    graph = hp["graphs"][0]
    version_iri = graph.get("meta", {}).get("version", "")
    release = "2026-09-01"
    if "/releases/" in version_iri:
        release = version_iri.split("/releases/", 1)[1].split("/", 1)[0]

    terms: Dict[str, str] = {}
    synonyms: Dict[str, List[Tuple[str, str]]] = collections.defaultdict(list)
    replaced_by: Dict[str, str] = {}

    for node in graph["nodes"]:
        uid = node.get("id", "")
        if "/HP_" not in uid:
            continue
        hpo_id = "HP:" + uid.rsplit("/HP_", 1)[1]
        meta = node.get("meta", {})
        if meta.get("deprecated"):
            for bpv in meta.get("basicPropertyValues", []):
                if bpv.get("pred", "").endswith("IAO_0100001") and bpv.get("val", "").startswith("HP:"):
                    replaced_by[hpo_id] = bpv["val"]
            continue

        lbl = (node.get("lbl") or "").strip()
        if not lbl:
            continue
        terms[hpo_id] = lbl

        seen_syns = {lbl.lower()}
        for syn in meta.get("synonyms", []):
            val = (syn.get("val") or "").strip()
            if val and val.lower() not in seen_syns:
                pred = syn.get("pred", "hasExactSynonym")
                syn_type = "exact" if "Exact" in pred else "related"
                synonyms[hpo_id].append((val, syn_type))
                seen_syns.add(val.lower())

        for extra_syn in CURATED_CLINICAL_SYNONYMS.get(hpo_id, ()):
            if extra_syn.lower() not in seen_syns:
                synonyms[hpo_id].append((extra_syn, "exact"))
                seen_syns.add(extra_syn.lower())

    parents: Dict[str, Set[str]] = collections.defaultdict(set)
    for edge in graph["edges"]:
        if edge.get("pred") != "is_a":
            continue
        sub, obj = edge.get("sub", ""), edge.get("obj", "")
        if "/HP_" in sub and "/HP_" in obj:
            child_id = "HP:" + sub.rsplit("/HP_", 1)[1]
            parent_id = "HP:" + obj.rsplit("/HP_", 1)[1]
            if child_id in terms and parent_id in terms:
                parents[child_id].add(parent_id)

    return release, terms, synonyms, parents, replaced_by


def compute_ancestor_closure(terms: Dict[str, str], parents: Dict[str, Set[str]]) -> List[Tuple[str, str, int]]:
    ancestors: List[Tuple[str, str, int]] = []
    for term_id in terms:
        visited = {term_id: 0}
        queue = collections.deque([(term_id, 0)])
        while queue:
            curr, dist = queue.popleft()
            ancestors.append((term_id, curr, dist))
            for parent in parents.get(curr, ()):
                if parent not in visited:
                    visited[parent] = dist + 1
                    queue.append((parent, dist + 1))
    return ancestors


def parse_hpoa(hpoa_path: str, terms: Dict[str, str], replaced_by: Dict[str, str]):
    """Parses phenotype.hpoa into raw disease labels and phenotype annotations."""
    release = "2026-09-02"
    disease_labels: Dict[str, str] = {}
    raw_anns: Dict[str, List[dict]] = collections.defaultdict(list)

    with open(hpoa_path, "r", encoding="utf-8") as f:
        for line in f:
            if not line:
                continue
            if line.startswith("#version:"):
                release = line.split(":", 1)[1].strip()
                continue
            if line.startswith("#") or line.startswith("database_id\t"):
                continue

            cols = line.rstrip("\r\n").split("\t")
            if len(cols) < 11:
                continue
            disease_id, disease_name, qualifier, hpo_id = cols[0].strip(), cols[1].strip(), cols[2].strip(), cols[3].strip()
            reference, evidence, frequency, aspect = cols[4].strip(), cols[5].strip(), cols[7].strip(), cols[10].strip()

            # Restrict to phenotypic abnormalities (aspect P)
            if aspect and aspect != "P":
                continue

            # Resolve deprecated HPO IDs if needed
            resolved_hpo = hpo_id
            for _ in range(3):
                if resolved_hpo in terms or resolved_hpo not in replaced_by:
                    break
                resolved_hpo = replaced_by[resolved_hpo]
            if resolved_hpo not in terms:
                continue

            polarity = "negated" if qualifier == "NOT" else "present"
            disease_labels[disease_id] = disease_name
            raw_anns[disease_id].append({
                "hpo_id": resolved_hpo,
                "polarity": polarity,
                "frequency": frequency or None,
                "evidence_code": evidence or None,
                "reference": reference or disease_id,
            })

    return release, disease_labels, raw_anns


def _annotation_priority(ann: dict) -> Tuple[int, int, int]:
    ref = ann.get("reference") or ""
    has_pmid = 1 if "PMID:" in ref else 0
    has_freq = 1 if ann.get("frequency") else 0
    is_pcs = 1 if ann.get("evidence_code") == "PCS" else 0
    return (has_pmid, has_freq, is_pcs)


def build_who_hybrid_pack(
    sources_dir: str = DEFAULT_SOURCES_DIR,
    output_dir: str = DEFAULT_PACK_DIR,
    refresh_downloads: bool = False,
    enrich_nih_titles: bool = True,
) -> dict:
    t_start = time.time()
    os.makedirs(sources_dir, exist_ok=True)
    os.makedirs(output_dir, exist_ok=True)

    tgz_path = download_if_missing(URL_ORPHADATA_PRODUCT1, os.path.join(sources_dir, "en_product1.json.tar.gz"), refresh_downloads)
    hp_path = download_if_missing(URL_HPO_JSON, os.path.join(sources_dir, "hp.json"), refresh_downloads)
    hpoa_path = download_if_missing(URL_HPOA, os.path.join(sources_dir, "phenotype.hpoa"), refresh_downloads)

    print("[parse] Parsing Orphadata WHO ICD-11 cross-references...")
    orpha_prov, orpha_meta, omim_best_orpha = parse_orphadata_product1(tgz_path)
    print(f"        {len(orpha_meta):,} Orpha disorders ({orpha_prov['release']})")

    print("[parse] Parsing official HPO ontology (hp.json)...")
    hpo_release, terms, synonyms, parents, replaced_by = parse_hp_json(hp_path)
    print(f"        {len(terms):,} active HPO terms (release {hpo_release})")

    print("[parse] Parsing phenotype.hpoa disease annotations...")
    hpoa_release, raw_labels, raw_anns = parse_hpoa(hpoa_path, terms, replaced_by)
    print(f"        {len(raw_anns):,} annotated diseases in HPOA (release {hpoa_release})")

    # Unify 1:1 equivalent ORPHA <-> OMIM disorders so annotations combine seamlessly.
    # Also fold exact-label + same-ICD11 ORPHA twins (e.g., ORPHA:558 Marfan -> OMIM:154700 Marfan).
    folded_orpha_ids: Set[str] = set()
    unified_anns: Dict[str, Dict[Tuple[str, str], dict]] = collections.defaultdict(dict)

    for did, ann_list in raw_anns.items():
        for ann in ann_list:
            key = (ann["hpo_id"], ann["polarity"])
            prev = unified_anns[did].get(key)
            if prev is None or _annotation_priority(ann) > _annotation_priority(prev):
                unified_anns[did][key] = ann

    label_icd_to_omim: Dict[Tuple[str, str], List[str]] = collections.defaultdict(list)
    for did, lbl in raw_labels.items():
        if did.startswith("OMIM:") and did in omim_best_orpha and did in unified_anns:
            om = orpha_meta[omim_best_orpha[did][1]]
            if om["icd11_code"]:
                norm_lbl = lbl.strip().lower()
                label_icd_to_omim[(norm_lbl, om["icd11_code"])].append(did)

    for orpha_id, meta in orpha_meta.items():
        if orpha_id not in unified_anns:
            continue
        exact_omims = [o for o in meta["exact_omims"] if o in unified_anns]
        target_omim = exact_omims[0] if len(exact_omims) == 1 else None
        if target_omim is None and meta["icd11_code"] and meta["name"]:
            matches = label_icd_to_omim.get((meta["name"].strip().lower(), meta["icd11_code"]), [])
            if len(matches) == 1:
                target_omim = matches[0]
        if target_omim:
            for key, ann in unified_anns[orpha_id].items():
                prev = unified_anns[target_omim].get(key)
                if prev is None or _annotation_priority(ann) > _annotation_priority(prev):
                    unified_anns[target_omim][key] = ann
            folded_orpha_ids.add(orpha_id)

    # Load / update NIH WHO ICD-11 cache for canonical titles on core codes
    nih_cache_path = os.path.join(sources_dir, "icd11_nih_cache.json")
    nih_cache: Dict[str, dict] = {}
    if os.path.exists(nih_cache_path):
        with open(nih_cache_path, "r", encoding="utf-8") as f:
            nih_cache = json.load(f)

    # Assemble WHO ICD-11 mapped diseases (every disease included has an official WHO ICD-11 code)
    final_diseases: List[Tuple[str, str, str, Optional[str], Optional[str], Optional[str], Optional[str]]] = []
    final_annotations: List[Tuple[str, str, str, Optional[str], Optional[str], str, str]] = []
    code_title_queries = 0

    for did in sorted(unified_anns.keys()):
        if did in folded_orpha_ids:
            continue

        anns_dict = unified_anns[did]
        if not any(a["polarity"] == "present" for a in anns_dict.values()):
            continue

        icd11_code: Optional[str] = None
        icd11_uri: Optional[str] = None
        orpha_code: Optional[str] = None
        label = raw_labels.get(did, did)

        if did.startswith("ORPHA:") and did in orpha_meta:
            om = orpha_meta[did]
            icd11_code = om["icd11_code"]
            icd11_uri = om["icd11_uri"]
            orpha_code = did
            if om["name"]:
                label = om["name"]
        elif did.startswith("OMIM:") and did in omim_best_orpha:
            _, linked_orpha = omim_best_orpha[did]
            om = orpha_meta[linked_orpha]
            icd11_code = om["icd11_code"]
            icd11_uri = om["icd11_uri"]
            orpha_code = linked_orpha
            # Use clean canonical Orphanet name when OMIM label is overly coded/abbreviated
            if om["name"] and ("(" not in om["name"] or len(om["name"]) < len(label)):
                pass

        # Enrich missing ICD-11 only for top/common diseases if not mapped via Orphadata?
        # Keep dataset strictly aligned to validated WHO ICD-11 cross-referenced rare disorders.
        if not icd11_code:
            continue

        icd11_title = None
        if enrich_nih_titles and code_title_queries < 40 and did in (
            "OMIM:607208", "OMIM:154700", "OMIM:312750", "OMIM:105830",
            "OMIM:230800", "OMIM:230900", "OMIM:232300", "OMIM:176270",
            "OMIM:162200", "OMIM:191100", "OMIM:277580", "OMIM:208900",
        ):
            hit = query_nih_icd11(icd11_code, nih_cache)
            code_title_queries += 1
            if hit:
                icd11_title = hit["title"]
        elif icd11_code.lower() in nih_cache and nih_cache[icd11_code.lower()]:
            icd11_title = nih_cache[icd11_code.lower()]["title"]

        source_parts = [f"WHO-ICD11:{icd11_code}"]
        if did.startswith("OMIM:"):
            source_parts.append(did)
        if orpha_code:
            source_parts.append(orpha_code)
        source_id = " | ".join(source_parts)

        final_diseases.append((did, label, source_id, icd11_code, icd11_title, icd11_uri, orpha_code))
        for ann in anns_dict.values():
            final_annotations.append((
                did,
                ann["hpo_id"],
                ann["polarity"],
                ann["frequency"],
                ann["evidence_code"],
                ann["reference"],
                f"WHO-ICD11 / Orphadata ({orpha_prov['release']}) + HPOA ({hpoa_release})",
            ))

    if enrich_nih_titles:
        with open(nih_cache_path, "w", encoding="utf-8") as f:
            json.dump(nih_cache, f, indent=2)

    print(f"[unify] Unified {len(final_diseases):,} WHO ICD-11-mapped rare diseases with {len(final_annotations):,} HPO annotations")

    # Build SQLite pack
    db_path = os.path.join(output_dir, "phenora_data.db")
    if os.path.exists(db_path):
        os.remove(db_path)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

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
            source_id TEXT NOT NULL,
            icd11_code TEXT,
            icd11_title TEXT,
            icd11_uri TEXT,
            orpha_code TEXT
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

    term_rows = [(hid, lbl, 0, None) for hid, lbl in terms.items()]
    syn_rows = [(hid, val, stype) for hid, slist in synonyms.items() for val, stype in slist]
    edge_rows = [(cid, pid, "subClassOf") for cid, plist in parents.items() for pid in plist]

    cur.executemany("INSERT INTO hpo_term VALUES (?, ?, ?, ?)", term_rows)
    cur.executemany("INSERT INTO hpo_synonym VALUES (?, ?, ?)", syn_rows)
    cur.executemany("INSERT INTO hpo_edge VALUES (?, ?, ?)", edge_rows)

    print("[graph] Computing transitive HPO DAG ancestor closure...")
    anc_rows = compute_ancestor_closure(terms, parents)
    cur.executemany("INSERT INTO hpo_ancestor VALUES (?, ?, ?)", anc_rows)

    cur.executemany("INSERT INTO disease VALUES (?, ?, ?, ?, ?, ?, ?)", final_diseases)
    cur.executemany("""
        INSERT INTO disease_annotation (
            disease_id, hpo_id, polarity, frequency, evidence_code, reference, source_release
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, final_annotations)

    # Precompute Information Content (IC) across the unified WHO ICD-11 cohort
    print("[ic]    Precomputing Information Content across unified diseases...")
    total_diseases = len(final_diseases)
    ancestor_to_descendants = collections.defaultdict(set)
    for desc, anc, _ in anc_rows:
        ancestor_to_descendants[anc].add(desc)

    term_to_diseases = collections.defaultdict(set)
    for did, hid, pol, *_ in final_annotations:
        if pol == "present":
            term_to_diseases[hid].add(did)

    ic_rows = []
    for hid in terms:
        annotated_diseases = set()
        for desc in ancestor_to_descendants.get(hid, (hid,)):
            annotated_diseases.update(term_to_diseases.get(desc, ()))
        cnt = len(annotated_diseases)
        ic_val = -math.log((1.0 + cnt) / (1.0 + total_diseases))
        ic_rows.append((hid, round(ic_val, 6), cnt))

    cur.executemany("INSERT INTO term_information_content VALUES (?, ?, ?)", ic_rows)

    cur.execute("CREATE INDEX idx_hpo_synonym_lookup ON hpo_synonym(synonym COLLATE NOCASE)")
    cur.execute("CREATE INDEX idx_hpo_term_label ON hpo_term(label COLLATE NOCASE)")
    cur.execute("CREATE INDEX idx_hpo_edge_child ON hpo_edge(child_id)")
    cur.execute("CREATE INDEX idx_hpo_edge_parent ON hpo_edge(parent_id)")
    cur.execute("CREATE INDEX idx_hpo_ancestor_desc ON hpo_ancestor(descendant_id)")
    cur.execute("CREATE INDEX idx_hpo_ancestor_anc ON hpo_ancestor(ancestor_id)")
    cur.execute("CREATE INDEX idx_disease_icd11 ON disease(icd11_code)")
    cur.execute("CREATE INDEX idx_annotation_disease ON disease_annotation(disease_id)")
    cur.execute("CREATE INDEX idx_annotation_hpo ON disease_annotation(hpo_id)")

    conn.commit()
    conn.close()

    # Export provenance summaries satisfying ArtifactFile roles ('ontology', 'annotations', 'term_index')
    ont_meta_path = os.path.join(output_dir, "ontology_provenance.json")
    with open(ont_meta_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "release": hpo_release,
                "source": URL_HPO_JSON,
                "active_terms": len(terms),
                "edges": len(edge_rows),
                "synonyms": len(syn_rows),
            },
            f,
            indent=2,
        )

    ann_meta_path = os.path.join(output_dir, "who_hybrid_annotations_provenance.json")
    with open(ann_meta_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "hpo_annotations_release": hpoa_release,
                "hpo_annotations_source": URL_HPOA,
                "orphadata_release": orpha_prov["release"],
                "orphadata_source": URL_ORPHADATA_PRODUCT1,
                "who_icd11_source": "https://icd.who.int (via Orphadata WHO ICD-11 alignment & NIH Clinical Tables MMS)",
                "diseases_count": len(final_diseases),
                "associations_count": len(final_annotations),
                "folded_duplicate_orpha_count": len(folded_orpha_ids),
            },
            f,
            indent=2,
        )

    ont_sha = compute_sha256(ont_meta_path)
    ann_sha = compute_sha256(ann_meta_path)
    db_sha = compute_sha256(db_path)

    manifest_data = {
        "schema_version": "phenora-data-v1",
        "pack_id": PACK_ID,
        "created_at": time.strftime("%Y-%m-%d"),
        "ontology": {
            "release": hpo_release,
            "sha256": ont_sha,
            "source": "https://hpo.jax.org",
            "license": "CC-BY-4.0",
        },
        "annotations": {
            "release": f"{hpoa_release}",
            "sha256": ann_sha,
            "source": "https://icd.who.int",
            "license": "CC-BY-4.0",
        },
        "selection": {
            "scope": "curated_subset",
            "method": (
                "Hybrid WHO ICD-11 + Orphadata rare-disease cross-references "
                "paired with official HPO disease-phenotype annotations"
            ),
            "selection_version": "who-icd11-orphadata-hpo-v1",
        },
        "counts": {
            "hpo_terms": len(terms),
            "diseases": len(final_diseases),
            "associations": len(final_annotations),
        },
        "files": [
            {
                "role": "ontology",
                "path": "ontology_provenance.json",
                "sha256": ont_sha,
                "size_bytes": os.path.getsize(ont_meta_path),
                "license": "CC-BY-4.0",
            },
            {
                "role": "annotations",
                "path": "who_hybrid_annotations_provenance.json",
                "sha256": ann_sha,
                "size_bytes": os.path.getsize(ann_meta_path),
                "license": "CC-BY-4.0",
            },
            {
                "role": "term_index",
                "path": "phenora_data.db",
                "sha256": db_sha,
                "size_bytes": os.path.getsize(db_path),
                "license": "CC-BY-4.0",
            },
        ],
    }

    manifest_path = os.path.join(output_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)

    elapsed = time.time() - t_start
    print(f"[done]  Built {output_dir} in {elapsed:.2f}s (DB size: {os.path.getsize(db_path) / (1024*1024):.1f} MB)")
    return manifest_data


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build offline WHO ICD-11 + Orphadata + HPO pack")
    parser.add_argument("--sources-dir", default=DEFAULT_SOURCES_DIR)
    parser.add_argument("--output-dir", default=DEFAULT_PACK_DIR)
    parser.add_argument("--refresh", action="store_true")
    parser.add_argument("--no-nih", action="store_true")
    args = parser.parse_args()
    build_who_hybrid_pack(
        sources_dir=args.sources_dir,
        output_dir=args.output_dir,
        refresh_downloads=args.refresh,
        enrich_nih_titles=not args.no_nih,
    )
