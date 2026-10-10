import re
from typing import ClassVar, Literal, Protocol

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from apps.api.domain.layout import ICONS

ProcessKind = Literal["receive", "wash", "prep", "process", "pack", "store", "dispatch", "livestock"]
KEY_PATTERN = re.compile(r"^[a-z][a-z0-9_]{1,24}$")


class UntrustedModel(BaseModel):
    """Model output is untrusted: unknown fields are dropped and every known field is bounded."""

    model_config = ConfigDict(extra="ignore")
    # Over-long optional lists are trimmed rather than rejected, so one extra bullet never throws away a whole answer.
    LIST_CAPS: ClassVar[dict[str, int]] = {}

    @model_validator(mode="before")
    @classmethod
    def _trim(cls, data):
        if not isinstance(data, dict):
            return data
        for name, cap in cls.LIST_CAPS.items():
            if isinstance(data.get(name), list) and len(data[name]) > cap:
                data = {**data, name: data[name][:cap]}
        for name, field in cls.model_fields.items():  # text that is merely too long (Hindi runs longer than English) is shortened, not fatal
            value = data.get(name)
            limit = next((m.max_length for m in field.metadata if getattr(m, "max_length", None)), None)
            if isinstance(value, str) and limit and len(value) > limit:
                data = {**data, name: value[: limit - 1].rstrip() + "…"}
        return data


class PlanStage(UntrustedModel):
    LIST_CAPS: ClassVar[dict[str, int]] = {"equipment": 6, "outputs": 5}
    key: str
    label: str = Field(min_length=2, max_length=60)
    kind: ProcessKind
    weight: float = Field(ge=0.3, le=6)
    height_m: float = Field(ge=3, le=30)  # flour mills, silos and furnace halls are genuinely tall
    note: str = Field(default="", max_length=160)
    equipment: list[str] = Field(default_factory=list, max_length=6)
    icon: str = "factory"
    detail: str = Field(default="", max_length=420)
    outputs: list[str] = Field(default_factory=list, max_length=5)
    level: int = 0  # 0 ground floor, 1 first floor (a double-storey plant)

    @field_validator("level", mode="before")
    @classmethod
    def level_is_ground_or_first(cls, value: object) -> int:
        return 1 if isinstance(value, (int, float)) and not isinstance(value, bool) and value >= 1 else 0

    @field_validator("weight", mode="before")
    @classmethod
    def clamp_weight(cls, value: object) -> object:
        """A number slightly outside the sensible range is pulled into it; something that is not a number at all is still rejected."""
        return min(max(float(value), 0.3), 6.0) if isinstance(value, (int, float)) and not isinstance(value, bool) else value

    @field_validator("height_m", mode="before")
    @classmethod
    def clamp_height(cls, value: object) -> object:
        return min(max(float(value), 3.0), 30.0) if isinstance(value, (int, float)) and not isinstance(value, bool) else value

    @field_validator("key", mode="before")
    @classmethod
    def key_is_normalised(cls, value: object) -> str:
        """Keys are only internal ids, so tidy whatever the model sent instead of rejecting a good plan over a long or odd id."""
        key = re.sub(r"[^a-z0-9]+", "_", str(value).lower()).strip("_")
        if not key or not key[0].isalpha():
            key = f"s_{key}"
        key = key[:24].strip("_")
        return key if KEY_PATTERN.match(key) else "step"

    @field_validator("equipment")
    @classmethod
    def equipment_is_short(cls, value: list[str]) -> list[str]:
        return [item.strip()[:60] for item in value if item.strip()]

    @field_validator("outputs")
    @classmethod
    def outputs_are_short(cls, value: list[str]) -> list[str]:
        return [item.strip()[:90] for item in value if item.strip()]

    @field_validator("icon")
    @classmethod
    def icon_is_allowlisted(cls, value: str) -> str:
        return value if value in ICONS else "factory"


class PlanWaste(UntrustedModel):
    LIST_CAPS: ClassVar[dict[str, int]] = {"by_product_ideas": 5}
    name: str = Field(min_length=2, max_length=80)
    description: str = Field(default="", max_length=240)
    by_product_ideas: list[str] = Field(default_factory=list, max_length=5)

    @field_validator("by_product_ideas")
    @classmethod
    def ideas_are_short(cls, value: list[str]) -> list[str]:
        return [item.strip()[:200] for item in value if item.strip()]


class PlanEnvironment(UntrustedModel):
    aspect: str = Field(min_length=2, max_length=40)
    impact: str = Field(min_length=2, max_length=240)
    mitigation: str = Field(default="", max_length=240)


class PlanPlot(UntrustedModel):
    width_m: float
    depth_m: float
    reasoning: str = Field(default="", max_length=240)


class ProcessPlan(UntrustedModel):
    LIST_CAPS: ClassVar[dict[str, int]] = {"waste_streams": 6, "utilities": 6, "environment": 6}
    industry: str = Field(min_length=2, max_length=80)
    location: str = Field(default="", max_length=120)
    suggested_plot: PlanPlot
    stages: list[PlanStage] = Field(min_length=4, max_length=14)
    waste_streams: list[PlanWaste] = Field(default_factory=list, max_length=6)
    utilities: list[str] = Field(default_factory=list, max_length=6)
    environment: list[PlanEnvironment] = Field(default_factory=list, max_length=6)

    @field_validator("utilities")
    @classmethod
    def utilities_are_short(cls, value: list[str]) -> list[str]:
        return [item.strip()[:200] for item in value if item.strip()]


class PlanProvider(Protocol):
    def draft(self, prompt: str, language: str = "en") -> object: ...


class PlanUnavailable(Exception):
    """A user-presentable reason a plan could not be produced."""

    def __init__(self, code: str, message: str, status: int = 502) -> None:
        super().__init__(message)
        self.code, self.message, self.status = code, message, status
