from datetime import datetime
from typing import ClassVar, Literal

from pydantic import Field, field_validator, model_validator

from apps.api.domain.contracts import Claim, Contract
from apps.api.domain.layout import Language
from apps.api.domain.plan import UntrustedModel

PlaceRole = Literal["site", "raw_material", "supplier", "facility", "market", "byproduct_buyer", "candidate_site"]
LocationQuality = Literal["verified", "place_level", "unknown"]
ROLES = ("raw_material", "supplier", "facility", "market", "byproduct_buyer", "candidate_site")
COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]


def compass_label(degrees: float) -> str:
    return COMPASS[int((degrees % 360) / 22.5 + 0.5) % 16]


class SourceRef(Contract):
    source_id: str
    title: str
    url: str
    retrieved_at: datetime


class ResearchPlace(Contract):
    place_id: str
    role: PlaceRole
    name: str
    locality: str = ""
    state: str = ""
    material: str | None = None
    note: str = ""
    address: str | None = None
    lat: float | None = None
    lng: float | None = None
    location_quality: LocationQuality = "unknown"
    source_ids: list[str] = Field(default_factory=list)


class ResearchFlow(Contract):
    from_id: str
    to_id: str
    material: str = ""
    distance_km: float | None = None


class Discovery(Contract):
    kind: Literal["constraint", "opportunity"]
    title: str
    body: str
    place_id: str | None = None
    source_ids: list[str] = Field(default_factory=list)


class SiteConditions(Contract):
    """Measured conditions at the site (not AI output). Every value comes from `source` at `retrieved_at`."""

    location: str
    lat: float
    lng: float
    retrieved_at: datetime
    source: str
    temperature_c: float | None = None
    wind_speed_kmh: float | None = None
    wind_from_deg: float | None = None
    prevailing_wind_from_deg: float | None = None
    prevailing_wind_label: str | None = None
    avg_wind_kmh_30d: float | None = None
    avg_solar_kwh_m2_day: float | None = None
    pm2_5: float | None = None
    aqi_us: int | None = None
    aqi_label: str | None = None


class ResearchRequest(Contract):
    industry: str = Field(min_length=2, max_length=100)
    location: str = Field(default="", max_length=120)
    mode: Literal["new", "existing"] = "new"
    language: Language = "en"
    context: str = Field(default="", max_length=1500)


class SiteResearch(Contract):
    summary: str
    places: list[ResearchPlace]
    flows: list[ResearchFlow]
    discoveries: list[Discovery]
    sources: list[SourceRef]
    search_queries: list[str]
    claims: list[Claim]
    retrieved_at: datetime
    grounded: bool
    geocoder: str


# What the model returns when it turns search notes into structure. Untrusted: bounded, and unusable items are dropped.
class RawPlace(UntrustedModel):
    role: PlaceRole
    name: str = Field(min_length=2, max_length=80)
    locality: str = Field(default="", max_length=80)
    state: str = Field(default="", max_length=40)
    material: str = Field(default="", max_length=60)
    note: str = Field(default="", max_length=240)
    quote: str = Field(default="", max_length=320)


class RawDiscovery(UntrustedModel):
    kind: Literal["constraint", "opportunity"] = "constraint"
    title: str = Field(min_length=2, max_length=90)
    body: str = Field(default="", max_length=280)
    place_name: str = Field(default="", max_length=80)
    quote: str = Field(default="", max_length=320)


class RawResearch(UntrustedModel):
    LIST_CAPS: ClassVar[dict[str, int]] = {"places": 16, "discoveries": 5}
    summary: str = Field(default="", max_length=420)
    places: list[RawPlace] = Field(min_length=1)
    discoveries: list[RawDiscovery] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def drop_unusable_items(cls, data):
        """A place with an unknown role or no name is skipped rather than failing the whole answer."""
        if isinstance(data, dict) and isinstance(data.get("places"), list):
            data = {**data, "places": [p for p in data["places"] if isinstance(p, dict) and p.get("role") in ROLES and str(p.get("name", "")).strip()]}
        return data

    @field_validator("places", mode="after")
    @classmethod
    def at_most_sixteen(cls, value):
        return value[:16]
