from datetime import datetime
from typing import ClassVar, Literal

from pydantic import Field

from apps.api.domain.contracts import Claim, Contract
from apps.api.domain.layout import Language
from apps.api.domain.plan import UntrustedModel
from apps.api.domain.siting import SourceRef


class PracticesRequest(Contract):
    industry: str = Field(min_length=2, max_length=100)
    location: str = Field(default="", max_length=120)
    problem: str = Field(default="", max_length=900)  # what the owner said they struggle with, in their words
    mode: Literal["new", "existing"] = "new"
    language: Language = "en"


class Practice(Contract):
    title: str
    countries: str = ""
    what: str = ""
    why_it_works: str = ""
    example: str = ""
    for_you: str = ""
    source_ids: list[str] = Field(default_factory=list)


class Standard(Contract):
    name: str
    note: str = ""
    source_ids: list[str] = Field(default_factory=list)


class BestPractices(Contract):
    summary: str
    practices: list[Practice]
    standards: list[Standard]
    sources: list[SourceRef]
    search_queries: list[str]
    claims: list[Claim]
    retrieved_at: datetime
    grounded: bool


class RawPractice(UntrustedModel):
    title: str = Field(min_length=2, max_length=100)
    countries: str = Field(default="", max_length=100)
    what: str = Field(default="", max_length=300)
    why_it_works: str = Field(default="", max_length=260)
    example: str = Field(default="", max_length=220)
    for_you: str = Field(default="", max_length=260)
    quote: str = Field(default="", max_length=320)


class RawStandard(UntrustedModel):
    name: str = Field(min_length=2, max_length=120)
    note: str = Field(default="", max_length=260)
    quote: str = Field(default="", max_length=320)


class RawPractices(UntrustedModel):
    LIST_CAPS: ClassVar[dict[str, int]] = {"practices": 8, "standards": 5}
    summary: str = Field(default="", max_length=420)
    practices: list[RawPractice] = Field(min_length=1)
    standards: list[RawStandard] = Field(default_factory=list)
