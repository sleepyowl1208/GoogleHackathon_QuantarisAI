from typing import ClassVar, Literal

from pydantic import Field, field_validator

from apps.api.domain.contracts import Claim, Contract
from apps.api.domain.layout import ICONS, LayoutResult, WasteStream
from apps.api.domain.plan import PlanPlot, PlanWaste, ProcessKind, UntrustedModel


def _short(items: list[str], limit: int) -> list[str]:
    return [item.strip()[:limit] for item in items if item.strip()]


def _clamp(value: object, low: float, high: float, default: float) -> object:
    return min(max(float(value), low), high) if isinstance(value, (int, float)) and not isinstance(value, bool) else default


class LayoutHints(UntrustedModel):
    """What the layout engine needs to draw a step as a zone. Everything is optional: a sensible default is used when the model leaves it out."""

    LIST_CAPS: ClassVar[dict[str, int]] = {"equipment": 5, "outputs": 4}
    kind: ProcessKind = "process"
    weight: float = 1.0
    height_m: float = 6.0
    equipment: list[str] = Field(default_factory=list)
    icon: str = "factory"
    outputs: list[str] = Field(default_factory=list)

    @field_validator("weight", mode="before")
    @classmethod
    def weight_range(cls, v): return _clamp(v, 0.3, 6, 1.0)

    @field_validator("height_m", mode="before")
    @classmethod
    def height_range(cls, v): return _clamp(v, 3, 30, 6.0)

    @field_validator("kind", mode="before")
    @classmethod
    def kind_known(cls, v): return v if v in ("receive", "wash", "prep", "process", "pack", "store", "dispatch", "livestock") else "process"

    @field_validator("icon", mode="before")
    @classmethod
    def icon_known(cls, v): return v if v in ICONS else "factory"

    @field_validator("equipment")
    @classmethod
    def equipment_short(cls, v): return _short(v, 60)

    @field_validator("outputs")
    @classmethod
    def outputs_short(cls, v): return _short(v, 90)


class AsIsStep(LayoutHints):
    label: str = Field(min_length=2, max_length=70)
    note: str = Field(default="", max_length=180)


class NewStep(LayoutHints):
    """A step an improvement would add to the plant, drawn as a new zone in the proposed layout."""

    label: str = Field(min_length=2, max_length=70)
    note: str = Field(default="", max_length=180)


class Opportunity(UntrustedModel):
    LIST_CAPS: ClassVar[dict[str, int]] = {"needs": 6, "outputs": 6, "adds": 2}
    title: str = Field(min_length=2, max_length=90)
    why_it_fits: str = Field(default="", max_length=320)
    needs: list[str] = Field(default_factory=list, max_length=6)
    outputs: list[str] = Field(default_factory=list, max_length=6)
    effort: Literal["low", "medium", "high"] = "medium"
    environmental_benefit: str = Field(default="", max_length=260)
    risks: str = Field(default="", max_length=260)
    verify: str = Field(default="", max_length=220)
    adds: list[NewStep] = Field(default_factory=list, max_length=2)

    @field_validator("needs", "outputs")
    @classmethod
    def items_short(cls, value: list[str]) -> list[str]:
        return _short(value, 90)


class Hotspot(UntrustedModel):
    area: str = Field(min_length=2, max_length=40)
    description: str = Field(min_length=2, max_length=260)
    quick_fix: str = Field(default="", max_length=260)


class RawImprovement(UntrustedModel):
    """What the model returns for an existing factory. Untrusted: bounded and checked before anyone sees it."""

    LIST_CAPS: ClassVar[dict[str, int]] = {"as_is_steps": 8, "opportunities": 6, "hotspots": 5, "waste_streams": 5, "questions": 4}

    business: str = Field(min_length=2, max_length=320)
    as_is_steps: list[AsIsStep] = Field(default_factory=list, max_length=8)
    opportunities: list[Opportunity] = Field(min_length=1, max_length=6)
    hotspots: list[Hotspot] = Field(default_factory=list, max_length=5)
    waste_streams: list[PlanWaste] = Field(default_factory=list, max_length=5)
    questions: list[str] = Field(default_factory=list, max_length=4)
    plot: PlanPlot | None = None

    @field_validator("plot", mode="before")
    @classmethod
    def plot_is_optional(cls, v): return v if isinstance(v, dict) and all(isinstance(v.get(k), (int, float)) for k in ("width_m", "depth_m")) else None

    @field_validator("questions")
    @classmethod
    def questions_short(cls, value: list[str]) -> list[str]:
        return _short(value, 170)


class ProposalLink(Contract):
    """Which zones of the proposed layout an opportunity adds, so the interface can point at them."""

    title: str
    zone_ids: list[str]


class ImprovementResult(Contract):
    business: str
    as_is_steps: list[AsIsStep]
    opportunities: list[Opportunity]
    hotspots: list[Hotspot]
    waste_streams: list[WasteStream]
    questions: list[str]
    claims: list[Claim]
    attachments_used: int = 0
    as_is_layout: LayoutResult | None = None
    proposed_layout: LayoutResult | None = None
    proposal_map: list[ProposalLink] = Field(default_factory=list)
    freshness: str = "ILLUSTRATIVE"
    drafted_by: str = "ai"
