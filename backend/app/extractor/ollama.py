import json
from typing import List
import httpx

from backend.app.extractor.base import (
    BaseExtractor,
    ModelTimeoutException,
    ModelUnavailableException,
    RawMention,
)
from backend.app.extractor.prompt import build_extraction_prompt
from backend.app.schemas import Experiencer, OnsetAgeGroup, Polarity, Temporality


class OllamaExtractor(BaseExtractor):
    def __init__(
        self,
        base_url: str = "http://127.0.0.1:11434",
        model_id: str = "llama3.2:3b",
        version: str = "3.2.0",
        sha256: str = "a" * 64,
        timeout: float = 3.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.model_id = model_id
        self.version = version
        self.sha256 = sha256
        self.timeout = timeout

    def get_provenance(self) -> dict:
        return {
            "runtime": "ollama",
            "model_id": self.model_id,
            "model_version": self.version,
            "sha256": self.sha256,
        }

    def extract(self, note_text: str, language: str = "en") -> List[RawMention]:
        if not note_text or not note_text.strip():
            return []

        prompt = build_extraction_prompt(note_text)
        payload = {
            "model": self.model_id,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.0,
                "num_predict": 512,
                "num_ctx": 2048,
            },
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.post(f"{self.base_url}/api/generate", json=payload)
                resp.raise_for_status()
                data = resp.json()
                raw_response = data.get("response", "{}")
                parsed = json.loads(raw_response)
        except httpx.TimeoutException:
            raise ModelTimeoutException(f"Ollama inference timed out after {self.timeout}s")
        except httpx.RequestError as exc:
            raise ModelUnavailableException(f"Ollama daemon unreachable at {self.base_url}: {exc}")
        except Exception as exc:
            raise ModelUnavailableException(f"Ollama response parsing error: {exc}")

        mentions_data = parsed.get("mentions", [])
        mentions: List[RawMention] = []

        for item in mentions_data:
            try:
                pol = item.get("polarity", "present").lower()
                polarity = Polarity(pol) if pol in Polarity._value2member_map_ else Polarity.present

                temp = item.get("temporality", "current").lower()
                temporality = Temporality(temp) if temp in Temporality._value2member_map_ else Temporality.current

                exp = item.get("experiencer", "patient").lower()
                experiencer = Experiencer(exp) if exp in Experiencer._value2member_map_ else Experiencer.patient

                age = item.get("onset_age_group", "unknown").lower()
                onset_age = OnsetAgeGroup(age) if age in OnsetAgeGroup._value2member_map_ else OnsetAgeGroup.unknown

                mentions.append(
                    RawMention(
                        raw_term=item["raw_term"],
                        quote=item["quote"],
                        start_char=int(item["start_char"]),
                        end_char=int(item["end_char"]),
                        polarity=polarity,
                        temporality=temporality,
                        experiencer=experiencer,
                        onset_age_group=onset_age,
                    )
                )
            except Exception:
                continue

        return mentions
