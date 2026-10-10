from typing import ClassVar, Literal

from pydantic import Field

from apps.api.domain.balance import BalanceRequest
from apps.api.domain.chat import Attachment
from apps.api.domain.contracts import Claim, Contract
from apps.api.domain.layout import Language
from apps.api.domain.ops import OpsRequest
from apps.api.domain.plan import UntrustedModel

Level = Literal["low", "medium", "high"]


# ---- operations copilot: Gemini explains the computed numbers and recommends actions
class BriefRequest(Contract):
    ops: OpsRequest
    balance: BalanceRequest | None = None
    question: str = Field(default="", max_length=300)
    language: Language = "en"


class BriefInsight(Contract):
    title: str
    evidence: str = ""
    why: str = ""


class BriefAction(Contract):
    title: str
    how: str = ""
    effect: Level = "medium"
    based_on: str = ""


class Brief(Contract):
    headline: str
    insights: list[BriefInsight]
    actions: list[BriefAction]
    answer: str = ""
    facts_used: int = 0
    claims: list[Claim]


def _level(v: object) -> object:
    return v if v in ("low", "medium", "high") else "medium"


class RawInsight(UntrustedModel):
    title: str = Field(min_length=2, max_length=100)
    evidence: str = Field(default="", max_length=240)
    why: str = Field(default="", max_length=240)


class RawAction(UntrustedModel):
    title: str = Field(min_length=2, max_length=100)
    how: str = Field(default="", max_length=260)
    effect: str = "medium"
    based_on: str = Field(default="", max_length=160)


class RawBrief(UntrustedModel):
    LIST_CAPS: ClassVar[dict[str, int]] = {"insights": 5, "actions": 5}
    headline: str = Field(min_length=2, max_length=200)
    insights: list[RawInsight] = Field(default_factory=list)
    actions: list[RawAction] = Field(default_factory=list)
    answer: str = Field(default="", max_length=900)


# ---- visual inspection: Gemini looks at one photo of a product
class InspectRequest(Contract):
    product: str = Field(min_length=2, max_length=100)
    industry: str = Field(default="", max_length=100)
    image: Attachment
    language: Language = "en"


class Defect(Contract):
    type: str
    where: str = ""
    severity: Level = "medium"
    confidence: float = Field(default=0.5, ge=0, le=1)


class InspectResult(Contract):
    verdict: Literal["pass", "fail", "unclear"]
    summary: str
    defects: list[Defect]
    next_step: str = ""
    claims: list[Claim]


class RawDefect(UntrustedModel):
    type: str = Field(min_length=2, max_length=80)
    where: str = Field(default="", max_length=120)
    severity: str = "medium"
    confidence: float = 0.5


class RawInspect(UntrustedModel):
    LIST_CAPS: ClassVar[dict[str, int]] = {"defects": 8}
    verdict: str = "unclear"
    summary: str = Field(default="", max_length=400)
    defects: list[RawDefect] = Field(default_factory=list)
    next_step: str = Field(default="", max_length=240)
