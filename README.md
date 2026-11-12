<div align="center">

# Phenora

**Local, zero-egress phenotype evidence workbench pairing HPO extraction with deterministic WHO ICD-11 rare-disease matching.**

![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-Vite-3178C6?style=flat-square&logo=typescript&logoColor=white)
![WHO ICD-11](https://img.shields.io/badge/Ontology-WHO%20ICD--11%20%2B%20HPO-0F766E?style=flat-square)
![Runtime](https://img.shields.io/badge/Network-Zero%20Egress%20Runtime-1E293B?style=flat-square)

</div>

> **Research Prototype Notice:** Candidate rankings reflect deterministic ontology similarity (`Lin` semantic similarity across HPO ancestry), **not** a clinical diagnosis, risk score, or disease probability. Built for synthetic case evaluation and clinical informatics research.

---

## Why Phenora

Rare-disease phenotypes are scattered across unstructured clinical notes, making both external cloud LLM transmission (PHI exposure) and opaque neural "black-box diagnoses" unacceptable in restricted clinical environments.

Phenora separates **language extraction** from **disease ranking**:

1. **In-Memory Document & Note Ingestion** — Parses uploaded PDFs (`pypdf`), plain text, or clinical notes in volatile RAM with zero disk persistence.
2. **Source-Grounded HPO Extraction** — Extracts candidate findings with verified Unicode source spans, polarity, temporality, experiencer, and onset group using local heuristics (`mock` full-HPO n-gram matcher) or local inference servers (**Ollama** / **LM Studio**).
3. **Clinician Attestation Boundary** — Only human-reviewed, positive patient observations cross `/v1/matches`. Negated, uncertain, historical, and family-history findings remain visible for review while staying excluded from positive matching.
4. **Deterministic Evidence Ranking & Graph** — Computes frequency-weighted bidirectional Lin semantic similarity over local SQLite HPO ancestry, exposing ordinal ranks alongside **WHO ICD-11**, **OMIM**, and **Orphanet (`ORPHA`)** cross-references in an interactive React Flow evidence graph.

---

## Hybrid WHO ICD-11 + Orphadata + HPO Pack

By default, Phenora loads **`phenora-who-icd11-v1`**, compiled offline into SQLite (`data/packs/phenora-who-icd11-v1/phenora_data.db`):

| Artifact / Metric | Value | Source & Release |
|---|---|---|
| **Mapped Rare Diseases** | **7,338** | Orphadata (`2026-06-23`) + WHO ICD-11 MMS (`clinicaltables.nlm.nih.gov`) |
| **HPO Phenotype Annotations** | **181,091** | Human Phenotype Ontology `phenotype.hpoa` (`2026-09-02`) |
| **Active HPO Terms** | **19,894** | Human Phenotype Ontology `hp.json` (`2026-09-01`) |
| **Disease Metadata Exposed** | `icd11_code`, `icd11_title`, `icd11_uri`, `orpha_code`, `source_id` | Surfaced in Candidate List badges & Evidence Inspector card |

A compact deterministic seed pack (`data/packs/phenora-data-v1/`) is also included for fast offline schema and regression testing. Switch active packs at startup via `PHENORA_DATA_PACK` or `PHENORA_DATA_PACK_DIR`.

---

## Quick Start

### Prerequisites
- **Python 3.11+**
- **Node.js 20+** and **npm**

### 1. Install Dependencies & Build Frontend

```bash
pip install -r backend/requirements.txt
npm --prefix frontend install
npm --prefix frontend run build
```

### 2. Start the Local Workbench

FastAPI serves both the `/v1/*` API and the compiled frontend bundle on **`http://127.0.0.1:8000/`**:

```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

For hot-reloading UI development alongside the backend:

```bash
npm --prefix frontend run dev
```

*(Optional)* Mint a local development bearer token when exercising authenticated `/v1/*` endpoints directly:

```bash
python scripts/mint_dev_token.py --actor dev-operator-01 --role clinician
```

---

## API Endpoints

All `/v1/*` routes enforce `Cache-Control: no-store`, emit non-PHI audit logs (request ID, method, path, status, duration, active `pack_id`), and require bearer JWT auth (except `/v1/health`).

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/v1/health` | Readiness status, active `data_pack_id`, ontology/annotation release provenance |
| `POST` | `/v1/documents/extract-text` | Volatile in-memory PDF / TXT / image text extraction (25 MB limit) |
| `POST` | `/v1/extractions` | Source-grounded HPO phenotype mention extraction (`mock`, `ollama`, or `lm_studio`) |
| `POST` | `/v1/terms/search` | Local SQLite HPO label & synonym search (query sent in JSON body, never URL) |
| `POST` | `/v1/matches` | Deterministic frequency-weighted Lin similarity ranking + MICA evidence graph |

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `PHENORA_DATA_PACK` | `phenora-who-icd11-v1` | Pack folder name under `data/packs/` (`phenora-who-icd11-v1` or `phenora-data-v1`) |
| `PHENORA_DATA_PACK_DIR` | *(unset)* | Explicit path override for an external compiled data pack directory |
| `PHENORA_EXTRACTOR` | `mock` | Extractor backend: `mock` (full HPO vocabulary n-gram), `ollama`, or `lm_studio` |
| `PHENORA_OLLAMA_URL` | `http://127.0.0.1:11434` | Local Ollama endpoint when `PHENORA_EXTRACTOR=ollama` |
| `PHENORA_OLLAMA_MODEL` | `llama3.2:3b` | Ollama model tag |
| `PHENORA_LM_STUDIO_URL` | `http://127.0.0.1:1234` | Local LM Studio OpenAI-compatible endpoint |
| `PHENORA_MODEL_TIMEOUT` | `4.0` (`30.0` LM Studio) | Local inference request timeout in seconds before deterministic fallback |
| `PHENORA_CORS_ORIGIN` | `http://localhost:3000` | Allowed local dev origin |
| `PHENORA_JWT_SECRET` | *(local dev key)* | HMAC-SHA256 signing secret for local JWT verification |

---

## Verification & Pack Rebuild

```bash
# Run full backend unit, golden fixture, WHO pack, and privacy/leak suites (49 tests)
python -m pytest backend/tests

# Verify zero external network egress during cold start, extraction, term search, and matching
python scripts/verify_airgap.py

# Frontend linter and type-checked production build
npm --prefix frontend run lint
npm --prefix frontend run build
```

To re-download upstream Orphadata, HPO (`hp.json`, `phenotype.hpoa`), and NIH Clinical Tables WHO ICD-11 data into `data/raw_sources/` and recompile `phenora_data.db`:

```bash
python backend/data_import/import_who_hybrid.py
```

---

## Repository Structure

```text
├── backend/
│   ├── app/
│   │   ├── annotation_repository/   # SQLite pack loader, MICA cache & ancestor inverted index
│   │   ├── auth/                    # Local PyJWT bearer authentication
│   │   ├── extractor/               # Local HPO vocabulary n-gram, Ollama & LM Studio extractors
│   │   ├── hpo_resolver/            # Exact/synonym HPO resolution
│   │   ├── matcher/                 # Frequency-weighted bidirectional Lin matcher
│   │   ├── schemas/                 # Strict Pydantic v2 API models
│   │   ├── span_validator/          # Unicode span verification against source text
│   │   └── main.py                  # FastAPI routes, security headers & built SPA serving
│   ├── data_import/
│   │   ├── import_who_hybrid.py     # Offline WHO ICD-11 + Orphadata + HPO SQLite compiler
│   │   └── build_pack.py / seed_data.py
│   └── tests/                       # Pytest suites (unit, golden cases, WHO hybrid, leak tests)
├── frontend/
│   └── src/
│       ├── components/              # NoteEditor, MentionReviewer, CandidateList, EvidenceGraphView, EvidenceInspector
│       ├── data/goldCases.ts        # Built-in synthetic pediatric vignette cases
│       └── lib/                     # Typed API client, GSAP/Lenis motion helpers & explanations
├── data/packs/
│   ├── phenora-who-icd11-v1/        # Compiled WHO ICD-11 + Orphadata + HPO pack & manifest
│   └── phenora-data-v1/             # Compact synthetic seed pack
├── models/packs/phenora-model-v1/   # Versioned extractor configuration manifest
├── contracts/                       # OpenAPI spec & artifact manifest schemas
├── fixtures/synthetic_cases/        # Synthetic pediatric rare-disease JSON fixtures
└── scripts/                         # Air-gap verifier, API smoke test, dev token & deck scripts
```
