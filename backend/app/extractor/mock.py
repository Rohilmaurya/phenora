import re
from typing import List, Tuple

from backend.app.extractor.base import BaseExtractor, RawMention
from backend.app.schemas import Experiencer, OnsetAgeGroup, Polarity, Temporality

# Curated clinical symptom keywords for high-precision deterministic NER matching
MOCK_PATTERNS = [
    # Connective tissue & Dysmorphology (e.g. Marfan, Loeys-Dietz, Ehlers-Danlos)
    ("aortic root aneurysm", "Aortic root aneurysm"),
    ("aortic root dilation", "Aortic root aneurysm"),
    ("aortic root dilatation", "Aortic root aneurysm"),
    ("sinuses of valsalva", "Aortic root aneurysm"),
    ("arachnodactyly", "Arachnodactyly"),
    ("spider fingers", "Arachnodactyly"),
    ("ectopia lentis", "Ectopia lentis"),
    ("dislocated lens", "Ectopia lentis"),
    ("lens subluxation", "Ectopia lentis"),
    ("crystalline lens subluxation", "Ectopia lentis"),
    ("pectus excavatum", "Pectus excavatum"),
    ("sunken chest", "Pectus excavatum"),
    ("pectus carinatum", "Pectus carinatum"),
    ("joint hypermobility", "Joint hypermobility"),
    ("hypermobility", "Joint hypermobility"),
    ("high-arched narrow palate", "High-arched palate"),
    ("high-arched palate", "High-arched palate"),
    ("high arched palate", "High-arched palate"),
    ("tall stature", "Tall stature"),
    ("scoliosis", "Scoliosis"),
    ("pes planus", "Pes planus"),
    ("flat feet", "Pes planus"),
    ("dolichocephaly", "Dolichocephaly"),
    ("malar hypoplasia", "Malar hypoplasia"),
    ("retrognathia", "Retrognathia"),
    ("mitral valve prolapse", "Mitral valve prolapse"),
    ("striae atrophicae", "Striae distensae"),
    ("striae", "Striae distensae"),
    
    # Neurological & Epilepsy (e.g. Dravet, Rett, Tuberous Sclerosis)
    ("febrile status epilepticus", "Status epilepticus"),
    ("status epilepticus", "Status epilepticus"),
    ("febrile seizures", "Febrile seizure (within the pediatric population)"),
    ("febrile seizure", "Febrile seizure (within the pediatric population)"),
    ("epileptic seizures", "Seizure"),
    ("seizures", "Seizure"),
    ("seizure", "Seizure"),
    ("ataxia", "Ataxia"),
    ("hypotonia", "Hypotonia"),
    ("floppy", "Hypotonia"),
    ("developmental regression", "Developmental regression"),
    ("developmental delay", "Global developmental delay"),
    ("global developmental delay", "Global developmental delay"),
    ("intellectual disability", "Intellectual disability"),
    ("hand wringing", "Hand wringing"),
    ("hand stereotypy", "Hand stereotypy"),
    ("loss of spoken language", "Absent speech"),
    ("absent speech", "Absent speech"),
    ("non-verbal", "Absent speech"),
    ("microcephaly", "Microcephaly"),
    ("macrocephaly", "Macrocephaly"),
    
    # Metabolic & Storage (e.g. Gaucher, Pompe, MPS)
    ("hepatosplenomegaly", "Hepatosplenomegaly"),
    ("hepatomegaly", "Hepatomegaly"),
    ("splenomegaly", "Splenomegaly"),
    ("coarse facial features", "Coarse facial features"),
    ("corneal clouding", "Corneal opacity"),
    
    # Neurocutaneous (e.g. NF1, TSC)
    ("cafe-au-lait spot", "Cafe-au-lait spot"),
    ("cafe-au-lait spots", "Cafe-au-lait spot"),
    ("cafe au lait spots", "Cafe-au-lait spot"),
    ("neurofibroma", "Neurofibroma"),
    ("ash leaf spot", "Hypopigmented macule"),
    ("ash leaf spots", "Hypopigmented macule"),
    ("hypopigmented macule", "Hypopigmented macule"),
]


class MockExtractor(BaseExtractor):
    """Deterministic extractor for offline testing, CI, and local fallback without active LLM daemon."""

    def __init__(self, model_id: str = "mock-phenotype-ner-v1", version: str = "1.0.0", repository=None):
        self.model_id = model_id
        self.version = version
        self.repository = repository

    def get_provenance(self) -> dict:
        return {
            "runtime": "ollama",
            "model_id": self.model_id,
            "model_version": self.version,
            "sha256": "0" * 64,
        }

    @staticmethod
    def _analyze_context(lower_note: str, start: int, end: int) -> Tuple[Polarity, Experiencer, Temporality, OnsetAgeGroup]:
        sentence_start = max(0, lower_note.rfind(".", 0, start) + 1)
        sentence_prefix = lower_note[sentence_start:start]

        polarity = Polarity.present
        if re.search(r"\b(no|not|denies|denied|without|negative for|negates|ruled out)\b", sentence_prefix):
            polarity = Polarity.negated
        elif re.search(r"\b(possible|suspected|questionable|rule out|uncertain)\b", sentence_prefix):
            polarity = Polarity.uncertain

        experiencer = Experiencer.patient
        if re.search(r"\b(mother|father|parent|sibling|brother|sister|family history|maternal|paternal|uncle|aunt)\b", sentence_prefix):
            experiencer = Experiencer.family_member

        temporality = Temporality.current
        if re.search(r"\b(history of|past|previously|resolved)\b", sentence_prefix):
            temporality = Temporality.historical

        onset_age = OnsetAgeGroup.unknown
        if re.search(r"\b(infant|infancy|baby|neonatal)\b", lower_note[:end]):
            onset_age = OnsetAgeGroup.infancy_29_days_to_1_year
        elif re.search(r"\b(toddler|early childhood)\b", lower_note[:end]):
            onset_age = OnsetAgeGroup.early_childhood_1_to_5_years
        elif re.search(r"\b(adolescent|teen|teenage)\b", lower_note[:end]):
            onset_age = OnsetAgeGroup.adolescence_12_to_17_years

        return polarity, experiencer, temporality, onset_age

    def extract(self, note_text: str, language: str = "en") -> List[RawMention]:
        mentions: List[RawMention] = []
        lower_note = note_text.lower()
        seen_spans = set()

        # 1. Curated high-precision multi-word clinical patterns first
        sorted_patterns = sorted(MOCK_PATTERNS, key=lambda x: len(x[0]), reverse=True)

        for phrase, canonical_term in sorted_patterns:
            pattern = re.compile(r"\b" + re.escape(phrase) + r"\b", re.IGNORECASE)
            for m in pattern.finditer(note_text):
                start, end = m.start(), m.end()
                if any(start < s_end and end > s_start for s_start, s_end in seen_spans):
                    continue
                seen_spans.add((start, end))
                polarity, experiencer, temporality, onset_age = self._analyze_context(lower_note, start, end)
                mentions.append(
                    RawMention(
                        raw_term=canonical_term,
                        quote=note_text[start:end],
                        start_char=start,
                        end_char=end,
                        polarity=polarity,
                        temporality=temporality,
                        experiencer=experiencer,
                        onset_age_group=onset_age,
                    )
                )

        # 2. Fast O(N) n-gram lookup against full HPO vocabulary when repository is attached
        if self.repository is not None:
            phrases = self.repository.get_extractable_phrases()
            if phrases:
                token_spans = [(m.start(), m.end(), m.group(0).lower()) for m in re.finditer(r"[A-Za-z0-9-]+", note_text)]
                n_tokens = len(token_spans)
                # Scan longest n-grams (up to 6 tokens) first
                for n_len in range(6, 0, -1):
                    for idx in range(0, max(0, n_tokens - n_len + 1)):
                        start = token_spans[idx][0]
                        end = token_spans[idx + n_len - 1][1]
                        if any(start < s_end and end > s_start for s_start, s_end in seen_spans):
                            continue
                        candidate_text = note_text[start:end].lower()
                        canonical_term = phrases.get(candidate_text)
                        if not canonical_term:
                            continue
                        seen_spans.add((start, end))
                        polarity, experiencer, temporality, onset_age = self._analyze_context(lower_note, start, end)
                        mentions.append(
                            RawMention(
                                raw_term=canonical_term,
                                quote=note_text[start:end],
                                start_char=start,
                                end_char=end,
                                polarity=polarity,
                                temporality=temporality,
                                experiencer=experiencer,
                                onset_age_group=onset_age,
                            )
                        )

        mentions.sort(key=lambda x: x.start_char)
        return mentions
