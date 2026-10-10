import re
from typing import ClassVar, Literal

from pydantic import Field, field_validator

from apps.api.domain.contracts import Claim, Contract
from apps.api.domain.layout import Language
from apps.api.domain.plan import UntrustedModel

Level = Literal["low", "medium", "high"]
Resource = Literal["power", "water"]
OPS_AREAS = ("predictive_maintenance", "visual_inspection", "production_optimization", "supply_chain", "demand_forecasting", "waste_reduction", "copilot")
OpsArea = Literal["predictive_maintenance", "visual_inspection", "production_optimization", "supply_chain", "demand_forecasting", "waste_reduction", "copilot"]


class InsightStage(Contract):
    key: str = Field(max_length=40)
    label: str = Field(max_length=80)
    equipment: list[str] = Field(default_factory=list, max_length=8)
    outputs: list[str] = Field(default_factory=list, max_length=6)


class InsightsRequest(Contract):
    industry: str = Field(min_length=2, max_length=100)
    location: str = Field(default="", max_length=120)
    language: Language = "en"
    stages: list[InsightStage] = Field(min_length=1, max_length=14)
    wastes: list[str] = Field(default_factory=list, max_length=8)
    context: str = Field(default="", max_length=800)


# ---- what we return to the browser
class ByproductProduct(Contract):
    name: str
    use: str = ""
    buyer: str = ""
    value: Level = "medium"


class ByproductFlow(Contract):
    waste: str
    source_stage: str | None = None
    treatment: list[str] = Field(default_factory=list)
    products: list[ByproductProduct] = Field(default_factory=list)
    benefit: str = ""
    verify: str = ""


class StageLoad(Contract):
    stage_key: str
    power: int = Field(ge=1, le=5)
    water: int = Field(ge=1, le=5)
    note: str = ""


class WaterStep(Contract):
    name: str
    purpose: str = ""


class ResourceAction(Contract):
    resource: Resource
    title: str
    detail: str = ""
    effect: Level = "medium"
    effort: Level = "medium"


class EnvAction(Contract):
    title: str
    aspect: str = ""
    effect: Level = "medium"
    effort: Level = "medium"
    first_step: str = ""
    verify: str = ""


class OpsCapability(Contract):
    area: OpsArea
    applies_at: list[str] = Field(default_factory=list)
    what: str = ""
    data_needed: list[str] = Field(default_factory=list)
    first_step: str = ""


class FactoryInsights(Contract):
    byproduct_flows: list[ByproductFlow]
    loads: list[StageLoad]
    water_train: list[WaterStep]
    resource_actions: list[ResourceAction]
    env_actions: list[EnvAction]
    operations: list[OpsCapability]
    claims: list[Claim]


# ---- what the model returns: untrusted, bounded, and unusable items are dropped
def _short(value: list[str], n: int, cap: int) -> list[str]:
    return [item.strip()[:n] for item in value if isinstance(item, str) and item.strip()][:cap]


def _level(value: object) -> object:
    return value if value in ("low", "medium", "high") else "medium"


def _rating(value: object) -> object:
    return min(max(round(float(value)), 1), 5) if isinstance(value, (int, float)) and not isinstance(value, bool) else 3


class RawProduct(UntrustedModel):
    name: str = Field(min_length=2, max_length=80)
    use: str = Field(default="", max_length=160)
    buyer: str = Field(default="", max_length=120)
    value: str = "medium"

    @field_validator("value", mode="before")
    @classmethod
    def level(cls, v): return _level(v)


class RawByproduct(UntrustedModel):
    LIST_CAPS: ClassVar[dict[str, int]] = {"treatment": 5, "products": 3}
    waste: str = Field(min_length=2, max_length=80)
    source_stage: str = Field(default="", max_length=40)
    treatment: list[str] = Field(default_factory=list)
    products: list[RawProduct] = Field(default_factory=list)
    benefit: str = Field(default="", max_length=220)
    verify: str = Field(default="", max_length=200)

    @field_validator("treatment")
    @classmethod
    def treatment_short(cls, v): return _short(v, 80, 5)


class RawLoad(UntrustedModel):
    stage_key: str = Field(max_length=40)
    power: int = 3
    water: int = 3
    note: str = Field(default="", max_length=140)

    @field_validator("power", "water", mode="before")
    @classmethod
    def rating(cls, v): return _rating(v)


class RawWaterStep(UntrustedModel):
    name: str = Field(min_length=2, max_length=70)
    purpose: str = Field(default="", max_length=160)


class RawResourceAction(UntrustedModel):
    resource: str = "power"
    title: str = Field(min_length=2, max_length=90)
    detail: str = Field(default="", max_length=240)
    effect: str = "medium"
    effort: str = "medium"

    @field_validator("effect", "effort", mode="before")
    @classmethod
    def level(cls, v): return _level(v)

    @field_validator("resource", mode="before")
    @classmethod
    def resource_kind(cls, v): return v if v in ("power", "water") else "power"


class RawEnvAction(UntrustedModel):
    title: str = Field(min_length=2, max_length=90)
    aspect: str = Field(default="", max_length=40)
    effect: str = "medium"
    effort: str = "medium"
    first_step: str = Field(default="", max_length=200)
    verify: str = Field(default="", max_length=200)

    @field_validator("effect", "effort", mode="before")
    @classmethod
    def level(cls, v): return _level(v)


class RawOps(UntrustedModel):
    LIST_CAPS: ClassVar[dict[str, int]] = {"applies_at": 4, "data_needed": 4}
    area: str
    applies_at: list[str] = Field(default_factory=list)
    what: str = Field(default="", max_length=260)
    data_needed: list[str] = Field(default_factory=list)
    first_step: str = Field(default="", max_length=200)

    @field_validator("data_needed")
    @classmethod
    def data_short(cls, v): return _short(v, 100, 4)


class RawInsights(UntrustedModel):
    LIST_CAPS: ClassVar[dict[str, int]] = {"byproduct_flows": 5, "loads": 14, "water_train": 5, "resource_actions": 6, "env_actions": 6, "operations": 7}
    byproduct_flows: list[RawByproduct] = Field(default_factory=list)
    loads: list[RawLoad] = Field(default_factory=list)
    water_train: list[RawWaterStep] = Field(default_factory=list)
    resource_actions: list[RawResourceAction] = Field(default_factory=list)
    env_actions: list[RawEnvAction] = Field(default_factory=list)
    operations: list[RawOps] = Field(default_factory=list)


def norm_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", str(value).lower()).strip("_")
