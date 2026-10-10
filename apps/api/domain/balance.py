from datetime import date
from typing import Literal

from pydantic import Field

from apps.api.domain.contracts import Claim, Contract


class DayRow(Contract):
    day: date
    units: float = Field(gt=0, le=1e9)
    water_m3: float | None = Field(default=None, ge=0, le=1e7)
    effluent_m3: float | None = Field(default=None, ge=0, le=1e7)
    energy_kwh: float | None = Field(default=None, ge=0, le=1e9)
    waste_kg: float | None = Field(default=None, ge=0, le=1e9)


class Levers(Contract):
    reuse_pct: float = Field(default=0, ge=0, le=90)       # share of effluent treated and reused
    leak_pct: float = Field(default=0, ge=0, le=30)        # share of intake lost to leaks that can be fixed
    waste_recovery_pct: float = Field(default=0, ge=0, le=95)  # share of waste sold or recycled instead of dumped


class BalanceRequest(Contract):
    industry: str = Field(min_length=2, max_length=100)
    rows: list[DayRow] = Field(min_length=14, max_length=800)
    levers: Levers = Field(default_factory=Levers)
    water_unit_cost_inr: float | None = Field(default=None, ge=0, le=100000)  # per m3, only if the owner knows it


class Resource(Contract):
    name: Literal["water", "energy", "waste"]
    unit: str
    per_unit_avg: float
    per_unit_best_quartile: float
    per_unit_trend_pct: float          # last 30 days vs the 30 before
    total_per_year: float
    gap_saving_per_year: float         # if every day matched the best quartile
    gap_saving_pct: float
    anomaly_days: list[date]
    daily_per_unit: list[float]
    days: list[date]


class WaterBalance(Contract):
    intake_m3_year: float
    effluent_m3_year: float
    effluent_measured: bool
    reuse_saving_m3_year: float
    leak_saving_m3_year: float
    fresh_after_m3_year: float
    discharge_after_m3_year: float
    saved_pct: float
    saved_inr_year: float | None


class WasteBalance(Contract):
    waste_kg_year: float
    recovered_kg_year: float
    landfill_after_kg_year: float


class BalanceResult(Contract):
    days: int
    units_per_year: float
    resources: list[Resource]
    water: WaterBalance | None
    waste: WasteBalance | None
    notes: list[str]
    claims: list[Claim]
