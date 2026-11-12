import collections
import hashlib
import json
import os
import sqlite3
from typing import Dict, List, Optional, Set, Tuple

_PACKS_ROOT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
    "data",
    "packs",
)


def resolve_default_pack_dir() -> str:
    env_dir = os.getenv("PHENORA_DATA_PACK_DIR")
    if env_dir:
        return env_dir
    env_pack = os.getenv("PHENORA_DATA_PACK")
    if env_pack:
        return os.path.join(_PACKS_ROOT, env_pack)
    who_pack = os.path.join(_PACKS_ROOT, "phenora-who-icd11-v1")
    if os.path.exists(os.path.join(who_pack, "phenora_data.db")) and os.path.exists(
        os.path.join(who_pack, "manifest.json")
    ):
        return who_pack
    return os.path.join(_PACKS_ROOT, "phenora-data-v1")


DEFAULT_PACK_DIR = resolve_default_pack_dir()


def compute_sha256(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


class AnnotationRepository:
    def __init__(self, pack_dir: Optional[str] = None):
        resolved_dir = pack_dir or resolve_default_pack_dir()
        self.pack_dir = resolved_dir
        self.manifest_path = os.path.join(resolved_dir, "manifest.json")
        self.db_path = os.path.join(resolved_dir, "phenora_data.db")
        self.is_ready = False
        self.manifest = {}
        self.manifest_sha256 = ""
        self._term_ic: Dict[str, float] = {}
        self._ancestors_map: Dict[str, Dict[str, int]] = collections.defaultdict(dict)
        self._term_labels: Dict[str, str] = {}
        self._disease_labels: Dict[str, str] = {}
        self._disease_meta: Dict[str, dict] = {}
        self._disease_annotations: Dict[str, List[dict]] = collections.defaultdict(list)
        self._ancestor_to_diseases: Dict[str, Set[str]] = collections.defaultdict(set)
        self._mica_cache: Dict[Tuple[str, str], Tuple[Optional[str], float]] = {}
        self._extractable_phrases: Optional[Dict[str, str]] = None

        self.load_pack()

    def load_pack(self):
        if not os.path.exists(self.manifest_path) or not os.path.exists(self.db_path):
            self.is_ready = False
            return

        with open(self.manifest_path, "r", encoding="utf-8") as f:
            self.manifest = json.load(f)
        self.manifest_sha256 = compute_sha256(self.manifest_path)

        # Connect to SQLite (strictly read-only)
        conn = sqlite3.connect(f"file:{os.path.abspath(self.db_path)}?mode=ro", uri=True)
        cur = conn.cursor()

        # Load IC values
        cur.execute("SELECT hpo_id, ic_value FROM term_information_content")
        self._term_ic = {row[0]: row[1] for row in cur.fetchall()}

        # Load term labels
        cur.execute("SELECT hpo_id, label FROM hpo_term WHERE obsolete = 0")
        self._term_labels = {row[0]: row[1] for row in cur.fetchall()}

        # Load ancestors map (descendant_id -> {ancestor_id: distance})
        cur.execute("SELECT descendant_id, ancestor_id, distance FROM hpo_ancestor")
        for desc, anc, dist in cur.fetchall():
            self._ancestors_map[desc][anc] = dist

        # Inspect disease columns so both legacy v1 and hybrid WHO ICD-11 packs load cleanly
        cur.execute("PRAGMA table_info(disease)")
        dis_cols = {row[1] for row in cur.fetchall()}
        if {"icd11_code", "icd11_title", "icd11_uri", "orpha_code"}.issubset(dis_cols):
            cur.execute(
                "SELECT disease_id, label, source_id, icd11_code, icd11_title, icd11_uri, orpha_code FROM disease"
            )
            for did, lbl, sid, icd11_code, icd11_title, icd11_uri, orpha_code in cur.fetchall():
                self._disease_labels[did] = lbl
                self._disease_meta[did] = {
                    "source_id": sid,
                    "icd11_code": icd11_code,
                    "icd11_title": icd11_title,
                    "icd11_uri": icd11_uri,
                    "orpha_code": orpha_code,
                }
        else:
            cur.execute("SELECT disease_id, label, source_id FROM disease")
            for did, lbl, sid in cur.fetchall():
                self._disease_labels[did] = lbl
                self._disease_meta[did] = {
                    "source_id": sid,
                    "icd11_code": None,
                    "icd11_title": None,
                    "icd11_uri": None,
                    "orpha_code": None,
                }

        # Load annotations and build inverted ancestor -> disease prefilter index
        cur.execute("""
            SELECT disease_id, hpo_id, polarity, frequency, evidence_code, reference, source_release
            FROM disease_annotation
        """)
        for dis_id, hpo_id, pol, freq, ev, ref, rel in cur.fetchall():
            self._disease_annotations[dis_id].append({
                "disease_id": dis_id,
                "hpo_id": hpo_id,
                "polarity": pol,
                "frequency": freq,
                "evidence_code": ev,
                "reference": ref,
                "source_release": rel,
            })
            if pol == "present":
                for anc_id in self._ancestors_map.get(hpo_id, {hpo_id: 0}):
                    if self._term_ic.get(anc_id, 0.0) > 0.0:
                        self._ancestor_to_diseases[anc_id].add(dis_id)

        conn.close()
        self.is_ready = True

    def get_health_metadata(self) -> dict:
        return {
            "is_ready": self.is_ready,
            "pack_id": self.manifest.get("pack_id"),
            "ontology_release": self.manifest.get("ontology", {}).get("release"),
            "annotation_release": self.manifest.get("annotations", {}).get("release"),
            "manifest_sha256": self.manifest_sha256,
        }

    def get_term_label(self, hpo_id: str) -> Optional[str]:
        return self._term_labels.get(hpo_id)

    def get_information_content(self, hpo_id: str) -> float:
        return self._term_ic.get(hpo_id, 0.0)

    def get_ancestors(self, hpo_id: str) -> Dict[str, int]:
        """Returns dict of {ancestor_id: distance_from_term}."""
        return self._ancestors_map.get(hpo_id, {hpo_id: 0})

    def find_mica(self, term_a: str, term_b: str) -> Tuple[Optional[str], float]:
        """Finds the Most Informative Common Ancestor (MICA) of two terms with symmetric caching."""
        if term_a == term_b:
            return term_a, max(0.0, self._term_ic.get(term_a, 0.0))

        cache_key = (term_a, term_b) if term_a <= term_b else (term_b, term_a)
        cached = self._mica_cache.get(cache_key)
        if cached is not None:
            return cached

        anc_a = self.get_ancestors(term_a)
        anc_b = self.get_ancestors(term_b)
        common = anc_a.keys() & anc_b.keys()
        if not common:
            res = (None, 0.0)
            self._mica_cache[cache_key] = res
            return res

        best_mica = None
        best_ic = -1.0
        for anc in sorted(common):  # Sort for deterministic tie-breaking
            ic = self._term_ic.get(anc, 0.0)
            if ic > best_ic:
                best_ic = ic
                best_mica = anc
        res = (best_mica, max(0.0, best_ic))
        if len(self._mica_cache) > 250000:
            self._mica_cache.clear()
        self._mica_cache[cache_key] = res
        return res

    def search_terms(self, query: str, limit: int = 10) -> List[dict]:
        """Searches labels and synonyms with exact, prefix, and substring matching."""
        q = query.strip().lower()
        if not q or not self.is_ready:
            return []

        conn = sqlite3.connect(f"file:{os.path.abspath(self.db_path)}?mode=ro", uri=True)
        cur = conn.cursor()

        # Query exact labels
        cur.execute("SELECT hpo_id, label FROM hpo_term WHERE LOWER(label) = ? AND obsolete = 0", (q,))
        exact_labels = cur.fetchall()

        # Query exact synonyms
        cur.execute("SELECT hpo_id, synonym FROM hpo_synonym WHERE LOWER(synonym) = ?", (q,))
        exact_synonyms = cur.fetchall()

        # Query prefix and substring (escape SQL LIKE wildcards so input cannot widen scans)
        escaped_q = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        cur.execute("""
            SELECT hpo_id, label FROM hpo_term 
            WHERE LOWER(label) LIKE ? ESCAPE '\\' AND obsolete = 0 LIMIT ?
        """, (f"%{escaped_q}%", limit * 2))
        sub_labels = cur.fetchall()

        cur.execute("""
            SELECT hpo_id, synonym FROM hpo_synonym 
            WHERE LOWER(synonym) LIKE ? ESCAPE '\\' LIMIT ?
        """, (f"%{escaped_q}%", limit * 2))
        sub_synonyms = cur.fetchall()
        conn.close()

        results = []
        seen = set()

        for hpo_id, label in exact_labels:
            if hpo_id not in seen:
                results.append({"hpo_id": hpo_id, "label": label, "match_kind": "exact_label"})
                seen.add(hpo_id)

        for hpo_id, syn in exact_synonyms:
            if hpo_id not in seen:
                label = self.get_term_label(hpo_id) or syn
                results.append({"hpo_id": hpo_id, "label": label, "match_kind": "synonym"})
                seen.add(hpo_id)

        for hpo_id, label in sub_labels:
            if hpo_id not in seen and len(results) < limit:
                results.append({"hpo_id": hpo_id, "label": label, "match_kind": "lexical"})
                seen.add(hpo_id)

        for hpo_id, syn in sub_synonyms:
            if hpo_id not in seen and len(results) < limit:
                label = self.get_term_label(hpo_id) or syn
                results.append({"hpo_id": hpo_id, "label": label, "match_kind": "synonym"})
                seen.add(hpo_id)

        return results[:limit]

    def get_all_diseases(self) -> Dict[str, str]:
        return dict(self._disease_labels)

    def get_disease_metadata(self, disease_id: str) -> dict:
        return dict(self._disease_meta.get(disease_id, {}))

    def get_candidate_diseases_for_terms(self, hpo_ids: List[str]) -> Set[str]:
        """Lossless prefilter returning diseases sharing >= 1 non-zero-IC ancestor with query terms."""
        candidates: Set[str] = set()
        for hpo_id in hpo_ids:
            for anc_id in self._ancestors_map.get(hpo_id, {hpo_id: 0}):
                if self._term_ic.get(anc_id, 0.0) > 0.0:
                    candidates.update(self._ancestor_to_diseases.get(anc_id, ()))
        return candidates

    def get_extractable_phrases(self) -> Dict[str, str]:
        """Returns {lowercase_phrase: canonical_hpo_label} for phenotypic abnormality terms (depth >= 2)."""
        if self._extractable_phrases is not None:
            return self._extractable_phrases
        if not self.is_ready:
            return {}

        stop_phrases = {
            "normal", "abnormal", "absent", "present", "severe", "mild", "moderate",
            "bilateral", "unilateral", "progressive", "congenital", "infantile",
            "childhood", "adolescent", "adult", "neonatal", "prenatal", "chronic",
            "acute", "recurrent", "episodic", "history", "family", "routine",
            "evaluation", "examination", "weakness", "delay", "syndrome", "disease",
            "disorder", "abnormality", "finding", "features", "symptom", "symptoms",
            "pain", "short", "tall", "small", "large", "increased", "decreased",
            "reduced", "elevated", "delayed", "early", "late",
        }
        valid_terms = {
            hid
            for hid in self._term_labels
            if self._ancestors_map.get(hid, {}).get("HP:0000118", 0) >= 2
        }

        phrases: Dict[str, str] = {}
        for hid in valid_terms:
            lbl = self._term_labels[hid]
            low = lbl.strip().lower()
            if len(low) >= 6 and low not in stop_phrases and "(" not in low:
                phrases[low] = lbl

        conn = sqlite3.connect(f"file:{os.path.abspath(self.db_path)}?mode=ro", uri=True)
        cur = conn.cursor()
        cur.execute("SELECT hpo_id, synonym FROM hpo_synonym WHERE synonym_type = 'exact'")
        for hid, syn in cur.fetchall():
            if hid not in valid_terms:
                continue
            low = syn.strip().lower()
            if len(low) >= 6 and low not in stop_phrases and "(" not in low and low not in phrases:
                # Only auto-index multi-word exact synonyms or distinctive clinical single words >= 8 chars
                if " " in low or "-" in low or len(low) >= 8:
                    phrases[low] = self._term_labels[hid]
        conn.close()

        self._extractable_phrases = phrases
        return phrases

    def get_disease_annotations(self, disease_id: str) -> List[dict]:
        return list(self._disease_annotations.get(disease_id, []))
