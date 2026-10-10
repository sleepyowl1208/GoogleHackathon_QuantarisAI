from typing import ClassVar, Literal

from pydantic import Field, field_validator

from apps.api.domain.contracts import Contract
from apps.api.domain.layout import Language, LayoutResult
from apps.api.domain.plan import PlanStage, UntrustedModel


class EditRequest(Contract):
    design: LayoutResult
    instruction: str = Field(min_length=2, max_length=600)
    language: Language = "en"
    solar_kwh_m2_day: float | None = Field(default=None, ge=0, le=12)  # measured at the site, when known
    wind_from_deg: float | None = Field(default=None, ge=0, le=360)


class EditResponse(Contract):
    design: LayoutResult
    reply: str
    changes: list[str]
    added_zone_ids: list[str]


class RawVehicle(UntrustedModel):
    kind: str = "truck"
    zone_key: str = Field(max_length=40)
    direction: str = "in"
    label: str = Field(default="", max_length=60)

    @field_validator("kind", mode="before")
    @classmethod
    def kind_known(cls, v): return v if v in ("truck", "tanker", "tractor") else "truck"

    @field_validator("direction", mode="before")
    @classmethod
    def direction_known(cls, v): return v if v in ("in", "out") else "in"


class RawEdit(UntrustedModel):
    LIST_CAPS: ClassVar[dict[str, int]] = {"changes": 6, "vehicles": 4, "stages": 14}
    reply: str = Field(default="", max_length=320)
    changes: list[str] = Field(default_factory=list)
    stages: list[PlanStage] = Field(min_length=2, max_length=14)
    vehicles: list[RawVehicle] = Field(default_factory=list)

    @field_validator("changes")
    @classmethod
    def changes_short(cls, v): return [x.strip()[:140] for x in v if isinstance(x, str) and x.strip()][:6]


Direction = Literal["in", "out"]
