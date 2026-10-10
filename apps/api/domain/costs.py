from datetime import datetime

from pydantic import Field

from apps.api.domain.contracts import Claim, Contract
from apps.api.domain.layout import Language
from apps.api.domain.siting import SourceRef


class MachineRef(Contract):
    name: str = Field(min_length=2, max_length=80)
    step: str = Field(default="", max_length=80)


class CostsRequest(Contract):
    industry: str = Field(min_length=2, max_length=100)
    location: str = Field(default="", max_length=120)
    machines: list[MachineRef] = Field(min_length=1, max_length=12)
    mode: str = "new"
    language: Language = "en"


class Supplier(Contract):
    name: str
    place: str = ""
    source_ids: list[str] = Field(default_factory=list)


class CostMachine(Contract):
    name: str
    step: str = ""
    price_low_inr: int | None = None
    price_high_inr: int | None = None
    basis: str = ""
    suppliers: list[Supplier] = Field(default_factory=list)
    source_ids: list[str] = Field(default_factory=list)


class LandOption(Contract):
    place: str
    location: str = ""
    price_note: str = ""
    how_to_get: str = ""
    kind: str = ""
    source_ids: list[str] = Field(default_factory=list)


class Benchmark(Contract):
    metric: str
    value: str = ""
    applies_to: str = ""
    source_ids: list[str] = Field(default_factory=list)


class BuildCosts(Contract):
    machines: list[CostMachine]
    land: list[LandOption]
    benchmarks: list[Benchmark]
    total_low_inr: int | None = None
    total_high_inr: int | None = None
    priced: int = 0
    requested: int = 0
    sources: list[SourceRef]
    search_queries: list[str]
    claims: list[Claim]
    retrieved_at: datetime
    grounded: bool
