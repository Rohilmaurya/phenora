# Phenora

Local, zero-egress phenotype evidence workbench that extracts Human Phenotype Ontology (HPO) mentions from clinical notes, enforces clinician attestation before matching, and ranks rare-disease candidates with inspectable **WHO ICD-11**, **OMIM**, and **Orphanet** evidence trails.

> **Research Prototype Notice:** Candidate rankings reflect deterministic ontology similarity (`Lin` semantic similarity across HPO ancestry), **not** a clinical diagnosis, risk score, or disease probability.

## Key Capabilities

- **Zero-Egress Runtime:** Runs completely offline after build-time pack compilation (`GET /v1/health`, `/v1/terms/search`, `/v1/extractions`, `/v1/matches`, `/v1/documents/extract-text`).
- **WHO ICD-11 + Orphadata + HPO Hybrid Pack (`phenora-who-icd11-v1`):**
  - **7,338** unified WHO ICD-11-mapped rare diseases (`icd11_code`, `icd11_title`, `icd11_uri`, `orpha_code`, `source_id`)
  - **181,091** HPO phenotype annotations across **19,894** active HPO terms (`hp.json` `2026-09-01`, `phenotype.hpoa` `2026-09-02`, Orphadata `en_product1.json.tar.gz` `2026-06-23`)
  - Legacy lightweight seed pack (`data/packs/phenora-data-v1/`) retained for deterministic regression gates; switchable via `PHENORA_DATA_PACK` or `PHENORA_DATA_PACK_DIR`.
- **Clinician Attestation Boundary:** Phenotype extraction and disease matching are separated across API boundaries; negated, uncertain, historical, or family-history mentions stay isolated from positive matching.
- **Interactive Evidence Graph:** React Flow workbench mapping attested patient findings through Most Informative Common Ancestor (MICA) HPO nodes to candidate conditions with an inspectable evidence card displaying WHO ICD-11, OMIM, and ORPHA identifiers.

## Architecture & Repository Layout

```text
├── backend/
│   ├── app/
│   │   ├── annotation_repository/   # SQLite pack loader, MICA cache & inverted ancestor prefilter
│   │   ├── auth/                    # Local bearer JWT verification
│   │   ├── extractor/               # In-memory phrase extraction across HPO vocabulary
│   │   ├── hpo_resolver/            # Exact/synonym HPO lookup & resolution
│   │   ├── matcher/                 # Frequency-weighted bidirectional Lin matcher
│   │   ├── schemas/                 # Strict Pydantic v2 API models
│   │   └── main.py                  # FastAPI entrypoint & static SPA serving
│   ├── data_import/
│   │   ├── import_who_hybrid.py     # Offline compiler for phenora-who-icd11-v1
│   │   └── build_pack.py / seed_data.py
│   └── tests/                       # Pytest suite (unit, golden fixtures, security, WHO pack)
├── frontend/                        # React 19 + TypeScript + Vite + Tailwind CSS + @xyflow/react + GSAP
├── data/packs/
│   ├── phenora-who-icd11-v1/        # Compiled WHO ICD-11 + Orphadata + HPO SQLite pack + manifest
│   └── phenora-data-v1/             # Compact deterministic seed pack
├── models/packs/phenora-model-v1/   # Versioned extractor configuration manifest
├── contracts/                       # OpenAPI & artifact manifest JSON schemas
├── fixtures/synthetic_cases/        # Synthetic pediatric rare-disease test cases
└── scripts/                         # Air-gap gate, smoke tests, dev token & pitch utilities
```

## Quick Start

### 1. Install Dependencies

**Backend (Python 3.11+):**
```bash
pip install -r backend/requirements.txt
```

**Frontend:**
```bash
npm --prefix frontend install
npm --prefix frontend run build
```

### 2. Run Phenora Locally

FastAPI serves both the `/v1/*` API and the built React workbench from `http://127.0.0.1:8000/`:

```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

For hot-reloading UI development alongside the backend:
```bash
npm --prefix frontend run dev
```

### 3. Rebuild the WHO ICD-11 Hybrid Pack (Optional)

The compiled `phenora-who-icd11-v1` SQLite database is included. To re-fetch upstream Orphadata, HPO (`hp.json`, `phenotype.hpoa`), and NIH Clinical Tables WHO ICD-11 MMS titles into `data/raw_sources/` and rebuild `phenora_data.db`:

```bash
python backend/data_import/import_who_hybrid.py
```

## Verification

```bash
# Backend test suite
python -m pytest backend/tests

# Zero-egress runtime verification
python scripts/verify_airgap.py

# Frontend linter & type-checked production build
npm --prefix frontend run lint
npm --prefix frontend run build
```
