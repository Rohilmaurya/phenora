import json
import os
import pytest

from backend.app.annotation_repository.repository import AnnotationRepository
from backend.app.extractor import (
    ExtractionService,
    LMStudioExtractor,
    MockExtractor,
    ModelTimeoutException,
    ModelUnavailableException,
    OllamaExtractor,
)
from backend.app.schemas import (
    Experiencer,
    ExtractionRequest,
    Polarity,
)

PACK_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data",
    "packs",
    "phenora-data-v1",
)
MODEL_PACK_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "models",
    "packs",
    "phenora-model-v1",
)


def test_mock_extractor_spans_and_attributes():
    extractor = MockExtractor()
    note = "7-month-old infant presents with recurrent febrile seizures. Mother has history of seizures. No ataxia observed."

    mentions = extractor.extract(note)
    assert len(mentions) >= 3

    # Check first mention (patient febrile seizures)
    m1 = mentions[0]
    assert m1.raw_term == "Febrile seizure (within the pediatric population)"
    assert note[m1.start_char : m1.end_char] == m1.quote
    assert m1.polarity == Polarity.present
    assert m1.experiencer == Experiencer.patient

    # Check second mention (mother has seizures -> family member)
    m2 = mentions[1]
    assert "seizures" in m2.quote.lower()
    assert m2.experiencer == Experiencer.family_member

    # Check third mention (no ataxia -> negated)
    m3 = mentions[2]
    assert "ataxia" in m3.quote.lower()
    assert m3.polarity == Polarity.negated


def test_extraction_service_pipeline():
    repo = AnnotationRepository(PACK_DIR)
    extractor = MockExtractor()
    service = ExtractionService(extractor, repo)

    note = "Child with arachnodactyly, dislocated lens, and pectus excavatum."
    req = ExtractionRequest(note_text=note)
    resp = service.extract_phenotypes(req)

    assert len(resp.mentions) == 3
    assert resp.model.model_id == "mock-phenotype-ner-v1"
    assert resp.ontology_release == "2026-02-01"

    # Verify each mention has valid HPO resolution
    hpo_ids = {m.hpo_candidates[0].hpo_id for m in resp.mentions if m.hpo_candidates}
    assert "HP:0001166" in hpo_ids  # Arachnodactyly
    assert "HP:0001083" in hpo_ids  # Ectopia lentis / dislocated lens
    assert "HP:0000767" in hpo_ids  # Pectus excavatum


def test_ollama_daemon_unavailable_raises_exception():
    # Connecting to non-existent port should fail safely with ModelUnavailableException or ModelTimeoutException
    extractor = OllamaExtractor(base_url="http://127.0.0.1:54321", timeout=1.0)
    with pytest.raises((ModelUnavailableException, ModelTimeoutException)):
        extractor.extract("Patient with seizures.")


def test_lm_studio_daemon_unavailable_raises_exception():
    extractor = LMStudioExtractor(base_url="http://127.0.0.1:54322", timeout=1.0)
    with pytest.raises((ModelUnavailableException, ModelTimeoutException)):
        extractor.extract("Patient with seizures.")


def test_model_manifest_conforms_to_contract():
    manifest_path = os.path.join(MODEL_PACK_DIR, "manifest.json")
    assert os.path.exists(manifest_path)

    with open(manifest_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data["schema_version"] == "phenora-model-v1"
    assert data["runtime"] == "ollama"
    assert data["extraction_schema_version"] == "phenotype-extraction-v1"
    assert len(data["files"]) >= 1
    assert data["files"][0]["role"] == "model_weights"
