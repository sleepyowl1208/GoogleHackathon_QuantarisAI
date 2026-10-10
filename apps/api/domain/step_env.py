from typing import ClassVar

from pydantic import Field, field_validator

from apps.api.domain.contracts import Claim, Contract
from apps.api.domain.insights import InsightStage
from apps.api.domain.layout import Language
from apps.api.domain.plan import UntrustedModel

SERVICE_KEYS = ("etp", "byproduct", "utility", "office")


class StepEnvRequest(Contract):
    industry: str = Field(min_length=2, max_length=100)
    location: str = Field(default="", max_length=120)
    stages: list[InsightStage] = Field(min_length=1, max_length=14)
    step_key: str = Field(max_length=40)
    wastes: list[str] = Field(default_factory=list, max_length=8)
    language: Language = "en"


class StepEnvironment(Contract):
    step_key: str
    uses_water: bool = False
    water_in: str = ""
    wastewater: str = ""
    outlet: str = ""
    route: list[str] = Field(default_factory=list)  # plant zones the used water passes through, starting at this step
    treatment: list[str] = Field(default_factory=list)
    reuse: str = ""
    discharge: str = ""
    solid_waste: str = ""
    solid_to: str = ""  # a zone key, usually the by-product bay
    air_noise: str = ""
    safeguards: list[str] = Field(default_factory=list)
    plant_level: str = ""
    check: str = ""
    claims: list[Claim] = Field(default_factory=list)


def _short(v: list[str], n: int, cap: int) -> list[str]:
    return [x.strip()[:n] for x in v if isinstance(x, str) and x.strip()][:cap]


class RawStepEnv(UntrustedModel):
    LIST_CAPS: ClassVar[dict[str, int]] = {"route": 6, "treatment": 6, "safeguards": 6}
    uses_water: bool = False
    water_in: str = Field(default="", max_length=260)
    wastewater: str = Field(default="", max_length=260)
    outlet: str = Field(default="", max_length=240)
    route: list[str] = Field(default_factory=list)
    treatment: list[str] = Field(default_factory=list)
    reuse: str = Field(default="", max_length=240)
    discharge: str = Field(default="", max_length=240)
    solid_waste: str = Field(default="", max_length=240)
    solid_to: str = Field(default="", max_length=40)
    air_noise: str = Field(default="", max_length=240)
    safeguards: list[str] = Field(default_factory=list)
    plant_level: str = Field(default="", max_length=420)
    check: str = Field(default="", max_length=300)

    @field_validator("treatment", "safeguards")
    @classmethod
    def short_items(cls, v): return _short(v, 140, 6)

    @field_validator("route", mode="before")
    @classmethod
    def route_items(cls, v): return [str(x)[:40] for x in v][:6] if isinstance(v, list) else []
