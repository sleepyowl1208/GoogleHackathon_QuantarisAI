from datetime import datetime
from enum import Enum
from typing import Protocol

from pydantic import Field

from apps.api.domain.contracts import Contract


class ResearchTopic(str, Enum):
    """Allowlist of research questions. Providers never receive free-form tasks."""

    ELECTRICITY_TARIFF = "ELECTRICITY_TARIFF"
    RAW_MATERIAL_SEASONALITY = "RAW_MATERIAL_SEASONALITY"
    FOOD_LICENSING = "FOOD_LICENSING"
    WASTEWATER_RULES = "WASTEWATER_RULES"
    INDUSTRIAL_AREAS = "INDUSTRIAL_AREAS"


class ResearchRequest(Contract):
    topic: ResearchTopic
    geography: str = Field(min_length=1, max_length=200)
    product: str = Field(min_length=1, max_length=100)


class RawFinding(Contract):
    """Untrusted provider output. Never copied into ScenarioState without validation."""

    statement: str
    source_title: str
    source_provider: str
    source_url: str
    source_type: str
    retrieved_at: datetime
    published_at: datetime | None = None
    geography: str | None = None
    units: str | None = None
    confidence: float = 0.5


class ResearchProvider(Protocol):
    def search(self, request: ResearchRequest) -> list[RawFinding]: ...
