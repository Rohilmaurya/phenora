from abc import ABC, abstractmethod
from typing import List
from pydantic import BaseModel, ConfigDict, Field

from backend.app.schemas import Experiencer, OnsetAgeGroup, Polarity, Temporality


class RawMention(BaseModel):
    model_config = ConfigDict(extra="forbid")
    raw_term: str = Field(..., min_length=1, max_length=200)
    quote: str = Field(..., min_length=1, max_length=500)
    start_char: int = Field(..., ge=0)
    end_char: int = Field(..., ge=1)
    polarity: Polarity = Polarity.present
    temporality: Temporality = Temporality.current
    experiencer: Experiencer = Experiencer.patient
    onset_age_group: OnsetAgeGroup = OnsetAgeGroup.unknown


class ModelUnavailableException(Exception):
    pass


class ModelTimeoutException(Exception):
    pass


class BaseExtractor(ABC):
    @abstractmethod
    def extract(self, note_text: str, language: str = "en") -> List[RawMention]:
        """Extracts candidate phenotype mentions from note text."""
        pass

    @abstractmethod
    def get_provenance(self) -> dict:
        """Returns model provenance dict for ExtractionResponse."""
        pass
