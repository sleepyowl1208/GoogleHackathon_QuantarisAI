from datetime import datetime

from pydantic import Field

from apps.api.domain.contracts import Claim, Contract
from apps.api.domain.layout import Language
from apps.api.domain.siting import SourceRef


class ScoutRequest(Contract):
    place: str = Field(min_length=2, max_length=120)
    industry: str = Field(default="", max_length=100)     # may be empty: the owner might only know what they have
    assets: str = Field(default="", max_length=300)       # for example "40 cows and half an acre"
    language: Language = "en"


class ScoutArea(Contract):
    rank: int
    name: str
    locality: str = ""
    kind: str = ""
    why: str = ""
    access: str = ""
    utilities: str = ""
    supply: str = ""
    risk: str = ""
    lat: float | None = None
    lng: float | None = None
    distance_km: float | None = None
    pin_level: str = ""   # "exact" or "town" (only the village or town was found, so the pin is approximate)
    source_ids: list[str] = Field(default_factory=list)


class ScoutResult(Contract):
    place: str
    industry: str
    center_lat: float | None = None
    center_lng: float | None = None
    areas: list[ScoutArea]
    sources: list[SourceRef]
    search_queries: list[str]
    claims: list[Claim]
    retrieved_at: datetime
    grounded: bool
