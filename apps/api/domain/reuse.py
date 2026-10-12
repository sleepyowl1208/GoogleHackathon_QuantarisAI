from typing import ClassVar, Literal

from pydantic import Field

from apps.api.domain.contracts import Claim, Contract
from apps.api.domain.insights import InsightStage
from apps.api.domain.layout import Language
from apps.api.domain.plan import UntrustedModel

LoopKind = Literal["water", "heat", "waste"]
LOOP_KINDS = ("water", "heat", "waste")
Level = Literal["low", "medium", "high"]


class ReuseRequest(Contract):
    industry: str = Field(min_length=2, max_length=100)
    location: str = Field(default="", max_length=120)
    language: Language = "en"
    stages: list[InsightStage] = Field(min_length=1, max_length=14)
    wastes: list[str] = Field(default_factory=list, max_length=8)


class ReuseLoop(Contract):
    kind: LoopKind
    headline: str
    today: str
    fix: str
    result: str
    reuse_for: str = ""
    effort: Level = "medium"
    first_step: str = ""
    ai_help: str = ""
    applies_at: list[str] = Field(default_factory=list)


class ReusePlan(Contract):
    summary: str
    loops: list[ReuseLoop]
    claims: list[Claim]


def _level(v: object) -> object:
    return v if v in ("low", "medium", "high") else "medium"


class RawLoop(UntrustedModel):
    LIST_CAPS: ClassVar[dict[str, int]] = {"applies_at": 3}
    kind: str
    headline: str = Field(min_length=2, max_length=70)
    today: str = Field(min_length=2, max_length=200)
    fix: str = Field(min_length=2, max_length=220)
    result: str = Field(min_length=2, max_length=200)
    reuse_for: str = Field(default="", max_length=100)
    effort: str = "medium"
    first_step: str = Field(default="", max_length=180)
    ai_help: str = Field(default="", max_length=200)
    applies_at: list[str] = Field(default_factory=list)


class RawReuse(UntrustedModel):
    LIST_CAPS: ClassVar[dict[str, int]] = {"loops": 6}
    summary: str = Field(min_length=2, max_length=240)
    loops: list[RawLoop] = Field(default_factory=list)
