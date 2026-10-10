from typing import Literal

from pydantic import Field

from apps.api.domain.contracts import Claim, Contract
from apps.api.domain.layout import Language

SignalDirection = Literal["up", "down"]
Status = Literal["ok", "watch", "critical", "scheduled"]


class OpsStage(Contract):
    key: str = Field(max_length=40)
    label: str = Field(max_length=80)
    kind: str = Field(default="process", max_length=20)
    equipment: list[str] = Field(default_factory=list, max_length=8)
    area_m2: float = Field(default=100, ge=0, le=100000)


class OpsSource(Contract):
    name: str = Field(max_length=80)
    km: float | None = Field(default=None, ge=0, le=10000)
    material: str = Field(default="", max_length=60)
    state: str = Field(default="", max_length=40)


class OpsAction(Contract):
    type: Literal["schedule_maintenance", "ai_control", "add_capacity"]
    target: str = Field(max_length=60)
    value: float | None = Field(default=None, ge=0, le=200)


class OpsRequest(Contract):
    industry: str = Field(min_length=2, max_length=100)
    location: str = Field(default="", max_length=120)
    stages: list[OpsStage] = Field(min_length=1, max_length=14)
    sources: list[OpsSource] = Field(default_factory=list, max_length=16)
    actions: list[OpsAction] = Field(default_factory=list, max_length=16)
    language: Language = "en"


class Signal(Contract):
    name: str
    unit: str
    direction: SignalDirection = "up"
    latest: float
    baseline: float
    limit: float
    z: float
    slope_per_day: float
    days_to_limit: float | None = None
    daily: list[float]      # one value per day
    recent: list[float]     # the last 72 hours


class MachineHealth(Contract):
    machine_id: str
    step_key: str
    step_label: str
    name: str
    kind: str
    risk: int
    status: Status
    finding: str
    signals: list[Signal]
    scheduled: bool = False


class Alert(Contract):
    machine_id: str
    step_key: str
    severity: Literal["watch", "critical"]
    title: str
    detail: str
    days_to_limit: float | None = None


class Station(Contract):
    step_key: str
    label: str
    capacity_uph: float
    avg_uph: float
    utilization_pct: float
    availability_pct: float
    downtime_h: float
    yield_loss_pct: float
    waste_kg: float


class WhatIf(Contract):
    label: str
    step_key: str
    throughput_uph: float
    gain_pct: float


class Production(Contract):
    stations: list[Station]
    throughput_uph: float
    design_uph: float
    bottleneck_key: str
    oee_pct: float
    availability_pct: float
    performance_pct: float
    quality_pct: float
    daily_output: list[float]
    what_if: list[WhatIf]


class DefectType(Contract):
    type: str
    count: int
    pct: float


class Drift(Contract):
    type: str
    since_day: int
    from_pct: float
    to_pct: float
    likely_step_key: str | None = None
    likely_machine_id: str | None = None


class Quality(Contract):
    inspected: int
    defect_rate_pct: float
    by_type: list[DefectType]
    daily_rate: list[float]
    drift: Drift | None = None


class ForecastPoint(Contract):
    week: int
    p50: float
    p10: float
    p90: float


class Demand(Contract):
    history: list[float]    # last 52 weeks
    forecast: list[ForecastPoint]
    mape_pct: float
    growth_pct_year: float
    peak_week: int
    peak_p50: float
    season_note: str
    unit: str = "units per week"


class SupplyRisk(Contract):
    title: str
    detail: str
    level: Literal["low", "medium", "high"]


class Supply(Contract):
    lead_time_days: int
    order_by_week: int | None
    risks: list[SupplyRisk]
    sources_used: int


class Smoke(Contract):
    baseline_opacity_pct: float
    with_ai_opacity_pct: float
    current_opacity_pct: float
    baseline_fuel_index: float
    with_ai_fuel_index: float
    fuel_saving_pct: float
    series_baseline: list[float]
    series_ai: list[float]


class Effluent(Contract):
    limit_mg_l: float
    cod_in_mg_l: float
    baseline_out_mg_l: float
    with_ai_out_mg_l: float
    current_out_mg_l: float
    baseline_exceed_hours: int
    with_ai_exceed_hours: int
    chemical_saving_pct: float
    series_baseline: list[float]
    series_ai: list[float]


class Emissions(Contract):
    smoke: Smoke
    effluent: Effluent
    combustion_ai: bool
    etp_ai: bool
    assumptions: list[str]


class OpsPack(Contract):
    data_source: Literal["simulated"] = "simulated"
    days: int
    machines: list[MachineHealth]
    alerts: list[Alert]
    production: Production
    quality: Quality
    demand: Demand
    supply: Supply
    emissions: Emissions
    actions: list[OpsAction]
    claims: list[Claim]
