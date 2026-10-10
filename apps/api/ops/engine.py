"""Simulated plant data plus real analytics on it.

The numbers are generated (seeded by the factory itself, so the same plant gives the same data) and clearly labelled simulated.
Everything computed from them — trends, z-scores, time-to-limit, OEE, bottleneck, forecast, drift — is real arithmetic, not a model's guess.
"""
import hashlib
import math
import random
import re
import statistics as st

from apps.api.domain.contracts import Claim, ClaimClassification
from apps.api.domain.ops import (
    Alert, Demand, DefectType, Drift, Effluent, Emissions, ForecastPoint, MachineHealth, OpsAction, OpsPack, OpsRequest,
    Production, Quality, Signal, Smoke, Station, Supply, SupplyRisk, WhatIf,
)

DAYS = 45
BURN = re.compile(r"boiler|furnace|kiln|oven|dryer|drier|fryer|roast|steam|burner|smoke|incinerat|pasteur|cooker|steriliz", re.I)
WET = re.compile(r"wash|clean|soak|dye|bleach|scour|rinse|wet|ferment|brine|boil|pickl|slaughter|milk|dairy|tannery|pulp|etp", re.I)
HEAVY = re.compile(r"dairy|milk|food|pickle|sugar|distill|tannery|leather|textile|dye|cloth|paper|pulp|slaughter|poultry|egg|meat", re.I)
VIB_LIMIT, TEMP_LIMIT, EFFLUENT_LIMIT = 7.1, 85.0, 250.0  # ISO 10816-3 zone C/D boundary, typical motor-bearing alarm, CPCB COD discharge limit


def _rng(*parts: str) -> random.Random:
    return random.Random(int(hashlib.sha256("|".join(parts).encode()).hexdigest()[:12], 16))


def _slope(values: list[float]) -> float:
    n = len(values)
    if n < 3:
        return 0.0
    mx, my = (n - 1) / 2, st.fmean(values)
    den = sum((i - mx) ** 2 for i in range(n))
    return sum((i - mx) * (v - my) for i, v in enumerate(values)) / den


def _round(values: list[float], n: int = 2) -> list[float]:
    return [round(v, n) for v in values]


def _signal(name: str, unit: str, daily: list[float], limit: float, rng: random.Random, direction: str = "up") -> Signal:
    base = daily[:14]
    mean, sd = st.fmean(base), max(st.pstdev(base), abs(st.fmean(base)) * 0.02, 1e-6)
    latest = st.fmean(daily[-2:])
    z = (latest - mean) / sd
    slope = _slope(daily[-14:])
    left = None
    if slope > 1e-9:
        left = 0.0 if latest >= limit else min((limit - latest) / slope, 365.0)
    recent = [round(daily[-1] + rng.gauss(0, sd * 0.6) + (slope * (h - 72) / 24), 2) for h in range(72)]
    return Signal(name=name, unit=unit, direction=direction, latest=round(latest, 2), baseline=round(mean, 2), limit=limit, z=round(z, 1),
                  slope_per_day=round(slope, 3), days_to_limit=None if left is None else round(left, 1), daily=_round(daily), recent=recent)


def _machines(req: OpsRequest) -> list[tuple[str, str, str, str]]:
    out = []
    for stage in req.stages:
        for i, name in enumerate(stage.equipment[:4] or [stage.label]):
            out.append((f"{stage.key}:{i}", stage.key, stage.label, name))
    return out[:40]


def machine_health(req: OpsRequest) -> list[MachineHealth]:
    machines = _machines(req)
    scheduled = {a.target for a in req.actions if a.type == "schedule_maintenance"}
    seed = _rng("wear", req.industry, *(m[0] for m in machines))
    # Two machines are given a developing fault so the analytics have something real to find; the rest stay healthy.
    wear = {}
    if machines:
        order = list(range(len(machines)))
        seed.shuffle(order)
        for rank, idx in enumerate(order[:2]):
            wear[machines[idx][0]] = ("bearing" if rank == 0 else "heat", seed.randint(24, 30) if rank == 0 else seed.randint(30, 34))
    out = []
    for mid, key, label, name in machines:
        rng = _rng("m", mid, req.industry)
        v0, t0, c0 = rng.uniform(1.4, 2.6), rng.uniform(48, 64), rng.uniform(8, 22)
        fault, start = wear.get(mid, (None, DAYS))
        if mid in scheduled:
            fault = None
        vib, tmp, cur = [], [], []
        for d in range(DAYS):
            age = max(0, d - start)
            vib.append(v0 + rng.gauss(0, 0.07) + (0.0035 * age ** 2 if fault == "bearing" else 0))
            tmp.append(t0 + rng.gauss(0, 0.6) + (age * (1.15 if fault == "heat" else 0.45) if fault else 0))
            cur.append(c0 + rng.gauss(0, 0.15) + (age * 0.09 if fault else 0))
        signals = [_signal("Vibration", "mm/s", vib, VIB_LIMIT, rng), _signal("Bearing temperature", "°C", tmp, TEMP_LIMIT, rng), _signal("Motor current", "A", cur, c0 * 1.25, rng)]
        risk = 0
        for s in signals:
            r = min(40.0, max(0.0, s.z - 1.5) * 9) + (max(0.0, 30 - s.days_to_limit) / 30 * 55 if s.days_to_limit is not None else 0)
            risk = max(risk, int(min(100, r)))
        status = "scheduled" if mid in scheduled else "critical" if risk >= 70 else "watch" if risk >= 35 else "ok"
        worst = max(signals, key=lambda s: s.z)
        if mid in scheduled:
            finding = "Maintenance is scheduled; the developing fault is cleared in this simulation."
        elif status == "ok":
            finding = "All readings are inside their normal range."
        else:
            when = "now" if worst.days_to_limit == 0 else f"in about {worst.days_to_limit:.0f} days" if worst.days_to_limit is not None else "no limit crossing is projected yet"
            finding = f"{worst.name} moved from {worst.baseline} to {worst.latest} {worst.unit} (z = {worst.z}); at the current trend it reaches {worst.limit:.1f} {worst.unit}: {when}."
        out.append(MachineHealth(machine_id=mid, step_key=key, step_label=label, name=name, kind="rotating", risk=risk, status=status, finding=finding, signals=signals, scheduled=mid in scheduled))
    out.sort(key=lambda m: -m.risk)
    return out


def alerts(machines: list[MachineHealth]) -> list[Alert]:
    out = []
    for m in machines:
        if m.status in ("watch", "critical"):
            worst = max(m.signals, key=lambda s: s.z)
            out.append(Alert(machine_id=m.machine_id, step_key=m.step_key, severity="critical" if m.status == "critical" else "watch", title=f"{m.name}: {worst.name.lower()} rising", detail=m.finding, days_to_limit=worst.days_to_limit))
    return out


def production(req: OpsRequest, machines: list[MachineHealth]) -> Production:
    adds = {a.target: (a.value or 20) for a in req.actions if a.type == "add_capacity"}
    stations, daily = [], [0.0] * DAYS
    for s in req.stages:
        rng = _rng("cap", s.key, req.industry)
        cap = round(rng.uniform(70, 140) * (1 + adds.get(s.key, 0) / 100), 1)
        mine = [m for m in machines if m.step_key == s.key]
        stress = max((m.risk for m in mine if m.status != "scheduled"), default=0) / 100
        downtime = round(DAYS * 24 * (0.02 + 0.06 * stress + rng.uniform(0, 0.015)), 1)
        avail = 100 * (1 - downtime / (DAYS * 24))
        loss = round(rng.uniform(0.8, 2.2) + 2.5 * stress, 2)
        eff = cap * avail / 100
        stations.append(Station(step_key=s.key, label=s.label, capacity_uph=cap, avg_uph=round(eff * 0.93, 1), utilization_pct=0.0, availability_pct=round(avail, 1), downtime_h=downtime, yield_loss_pct=loss, waste_kg=round(eff * 0.93 * loss / 100 * 24 * 0.6, 1)))
    eff_caps = [s.capacity_uph * s.availability_pct / 100 for s in stations]
    thr = min(eff_caps)
    bottleneck = stations[eff_caps.index(thr)]
    for s, e in zip(stations, eff_caps):
        s.utilization_pct = round(100 * thr / e, 1)
    design = min(s.capacity_uph for s in stations)
    rng = _rng("out", req.industry)
    for d in range(DAYS):
        decay = sum(max(0, d - 26) * 0.004 * (m.risk / 100) for m in machines if m.status in ("watch", "critical"))
        daily[d] = round(thr * 20 * (1 - min(decay, 0.25)) + rng.gauss(0, thr * 0.4), 1)
    avail_pct = st.fmean(s.availability_pct for s in stations)
    perf = 93.0
    qual = 100 - st.fmean(s.yield_loss_pct for s in stations)
    oee = avail_pct * perf * qual / 10000
    what_if = []
    for i, s in enumerate(stations):
        new = list(eff_caps)
        new[i] *= 1.2
        t2 = min(new)
        what_if.append(WhatIf(label=f"+20% capacity at {s.label}", step_key=s.step_key, throughput_uph=round(t2, 1), gain_pct=round(100 * (t2 - thr) / thr, 1)))
    what_if.sort(key=lambda w: -w.gain_pct)
    return Production(stations=stations, throughput_uph=round(thr, 1), design_uph=round(design, 1), bottleneck_key=bottleneck.step_key, oee_pct=round(oee, 1), availability_pct=round(avail_pct, 1), performance_pct=perf, quality_pct=round(qual, 1), daily_output=daily, what_if=what_if[:4])


def quality(req: OpsRequest, machines: list[MachineHealth]) -> Quality:
    rng = _rng("q", req.industry)
    risky = [m for m in machines if m.status in ("watch", "critical")]
    cause = risky[0] if risky else None
    start = 31
    daily = []
    for d in range(DAYS):
        rate = 1.8 + rng.gauss(0, 0.18)
        if cause and d >= start:
            rate += (d - start) * 0.085 * (cause.risk / 100 + 0.4)
        daily.append(max(0.2, rate))
    base, sd = st.fmean(daily[:14]), max(st.pstdev(daily[:14]), 0.05)
    last = st.fmean(daily[-7:])
    z = (last - base) / (sd / math.sqrt(7))
    drift = None
    if z > 3 and last - base >= 0.5:
        since = next((d for d in range(14, DAYS) if all(x > base + 2 * sd for x in daily[d:d + 3])), DAYS - 7)
        drift = Drift(type="Process drift (defect rate above its own baseline)", since_day=since, from_pct=round(base, 2), to_pct=round(last, 2), likely_step_key=cause.step_key if cause else None, likely_machine_id=cause.machine_id if cause else None)
    inspected = int(sum(rng.uniform(1900, 2300) for _ in range(DAYS)))
    rate = st.fmean(daily)
    shares = {"Surface defect": 0.34, "Wrong size or weight": 0.27, "Contamination": 0.2, "Packaging or seal fault": 0.19}
    types = [DefectType(type=k, count=int(inspected * rate / 100 * v), pct=round(v * 100, 1)) for k, v in shares.items()]
    return Quality(inspected=inspected, defect_rate_pct=round(rate, 2), by_type=types, daily_rate=_round(daily), drift=drift)


def demand(req: OpsRequest) -> Demand:
    rng = _rng("d", req.industry, req.location)
    level, trend, amp = rng.uniform(900, 2400), rng.uniform(0.0008, 0.003), rng.uniform(0.12, 0.28)
    phase = rng.randint(0, 51)
    weeks = 104
    series = [level * (1 + trend * w) * (1 + amp * math.sin(2 * math.pi * (w + phase) / 52)) * (1 + rng.gauss(0, 0.05)) for w in range(weeks)]

    def fit(train: list[float]):
        n = len(train)
        b = _slope(train)
        a = st.fmean(train) - b * (n - 1) / 2
        idx = [[] for _ in range(52)]
        for w, v in enumerate(train):
            idx[w % 52].append(v / max(a + b * w, 1e-6))
        seas = [st.fmean(x) if x else 1.0 for x in idx]
        resid = [train[w] / max(a + b * w, 1e-6) / seas[w % 52] - 1 for w in range(n)]
        return a, b, seas, st.pstdev(resid)

    # honest back-test: fit on the first 91 weeks, score on the last 13
    a, b, seas, _ = fit(series[:91])
    apes = [abs(series[w] - (a + b * w) * seas[w % 52]) / series[w] for w in range(91, 104)]
    mape = 100 * st.fmean(apes)
    a, b, seas, sig = fit(series)
    fc = []
    for k in range(1, 14):
        w = weeks - 1 + k
        p50 = (a + b * w) * seas[w % 52]
        spread = 1.28 * sig * math.sqrt(1 + k / 13)
        fc.append(ForecastPoint(week=k, p50=round(p50, 0), p10=round(p50 * (1 - spread), 0), p90=round(p50 * (1 + spread), 0)))
    peak = max(fc, key=lambda p: p.p50)
    growth = 100 * b * 52 / max(a + b * (weeks - 1), 1e-6)
    note = f"Demand follows a yearly pattern of about ±{amp * 100:.0f}% around its trend; the next 13 weeks peak in week {peak.week}."
    return Demand(history=_round(series[-52:], 0), forecast=fc, mape_pct=round(mape, 1), growth_pct_year=round(growth, 1), peak_week=peak.week, peak_p50=peak.p50, season_note=note)


def supply(req: OpsRequest, dem: Demand) -> Supply:
    kms = [s.km for s in req.sources if s.km is not None]
    lead = 2 + math.ceil((max(kms) if kms else 150) / 350) + (1 if any(k > 600 for k in kms) else 0)
    risks = []
    far = [s for s in req.sources if s.km and s.km > 300]
    if far:
        risks.append(SupplyRisk(title="Long supply routes", detail=f"{len(far)} source(s) are over 300 km away ({', '.join(s.name for s in far[:3])}); a road delay stretches lead time.", level="medium" if len(far) < 3 else "high"))
    if len({s.name for s in req.sources}) == 1:
        risks.append(SupplyRisk(title="Single source", detail="All material comes from one source.", level="high"))
    if dem.peak_p50 > st.fmean(dem.history) * 1.15:
        risks.append(SupplyRisk(title="Peak-season squeeze", detail=f"Forecast demand in week {dem.peak_week} is {100 * (dem.peak_p50 / st.fmean(dem.history) - 1):.0f}% above the year's average; buy ahead.", level="medium"))
    if not risks:
        risks.append(SupplyRisk(title="No major supply risk found", detail="From the sources and demand pattern available, nothing stands out.", level="low"))
    order = max(1, dem.peak_week - math.ceil(lead / 7) - 1)
    return Supply(lead_time_days=lead, order_by_week=order, risks=risks, sources_used=len(req.sources))


def emissions(req: OpsRequest) -> Emissions:
    flags = {a.target for a in req.actions if a.type == "ai_control"}
    combustion = any(BURN.search(e) or BURN.search(s.label) for s in req.stages for e in s.equipment + [s.label])
    heavy = bool(HEAVY.search(req.industry)) or any(WET.search(s.label) for s in req.stages)
    rng = _rng("em", req.industry)
    hours = 72

    # Smoke: opacity rises with excess-air error. A fixed damper drifts with load and fuel; an O2-trim controller keeps it near the optimum.
    base_op, ai_op, base_fuel, ai_fuel = [], [], [], []
    for h in range(hours):
        load = 0.75 + 0.2 * math.sin(h / 24 * 2 * math.pi) + rng.gauss(0, 0.05)
        err_fixed = abs(0.18 * math.sin(h / 7) + rng.gauss(0, 0.12) + 0.1 * (load - 0.75))
        err_ai = abs(rng.gauss(0, 0.025))
        for err, op, fuel in ((err_fixed, base_op, base_fuel), (err_ai, ai_op, ai_fuel)):
            op.append(round(min(60, 8 + 95 * err) if combustion else 0.0, 1))
            fuel.append(round(100 * (1 + 0.45 * err) if combustion else 100, 1))
    smoke = Smoke(baseline_opacity_pct=round(st.fmean(base_op), 1), with_ai_opacity_pct=round(st.fmean(ai_op), 1), current_opacity_pct=round(st.fmean(ai_op if "combustion" in flags else base_op), 1),
                  baseline_fuel_index=round(st.fmean(base_fuel), 1), with_ai_fuel_index=round(st.fmean(ai_fuel), 1),
                  fuel_saving_pct=round(100 * (st.fmean(base_fuel) - st.fmean(ai_fuel)) / st.fmean(base_fuel), 1) if combustion else 0.0, series_baseline=base_op, series_ai=ai_op)

    # Effluent: a fixed chemical dose misses load surges; dosing that follows the (predicted) inlet load stays under the limit with less chemical.
    cod_in = rng.uniform(1400, 2600) if heavy else rng.uniform(300, 600)
    b_out, a_out, exc_b, exc_a = [], [], 0, 0
    for h in range(hours):
        surge = 1 + 0.45 * max(0, math.sin((h - 6) / 24 * 2 * math.pi)) + rng.gauss(0, 0.08)
        inflow = cod_in * surge
        b_out.append(round(_out(inflow, cod_in, False, rng), 1))
        a_out.append(round(_out(inflow, cod_in, True, rng), 1))
    exc_b = sum(1 for v in b_out if v > EFFLUENT_LIMIT)
    exc_a = sum(1 for v in a_out if v > EFFLUENT_LIMIT)
    eff = Effluent(limit_mg_l=EFFLUENT_LIMIT, cod_in_mg_l=round(cod_in, 0), baseline_out_mg_l=round(st.fmean(b_out), 1), with_ai_out_mg_l=round(st.fmean(a_out), 1), current_out_mg_l=round(st.fmean(a_out if "etp" in flags else b_out), 1),
                   baseline_exceed_hours=exc_b, with_ai_exceed_hours=exc_a, chemical_saving_pct=16.0 if heavy else 9.0, series_baseline=b_out, series_ai=a_out)
    notes = ["Smoke and effluent series are simulated from simple physical models (excess-air error; inlet load surges), not measured.",
             "Opacity and COD limits shown are typical reference values; check your own consent conditions.",
             "The saving percentages are modelled for this simulation and must be proven with a trial on the real plant."]
    return Emissions(smoke=smoke, effluent=eff, combustion_ai="combustion" in flags, etp_ai="etp" in flags, assumptions=notes)


def _out(inflow: float, design: float, smart: bool, rng: random.Random) -> float:
    """Outlet COD of a treatment plant: removal efficiency falls when the inlet load goes over what the dose was set for."""
    over = max(0.0, inflow / design - 1.0)
    if smart:
        removal = 0.93 - 0.08 * max(0.0, over - 0.35) + rng.gauss(0, 0.006)
    else:
        removal = 0.9 - 0.55 * over + rng.gauss(0, 0.01)
    return inflow * (1 - max(0.3, min(0.97, removal)))


def build_pack(req: OpsRequest) -> OpsPack:
    machines = machine_health(req)
    dem = demand(req)
    prod = production(req, machines)
    qual = quality(req, machines)
    n = hashlib.sha256(req.industry.encode()).hexdigest()[:6]
    claims = [
        Claim(claim_id=f"ops_{n}_1", statement="Sensor, production, quality, demand, smoke and effluent series are simulated for this plant design; no real plant is connected.", classification=ClaimClassification.SIMULATION, confidence=1.0, methodology="Seeded generator: fixed baselines plus injected faults; same plant gives the same data"),
        Claim(claim_id=f"ops_{n}_2", statement="Trends, z-scores, time-to-limit, OEE, bottleneck, drift flags and the demand forecast are computed from that data by ordinary statistics.", classification=ClaimClassification.CALCULATION, methodology="Least-squares slope, z-score against the first 14 days, back-tested trend-plus-season forecast"),
        Claim(claim_id=f"ops_{n}_3", statement="Real savings, accuracy and payback are unknown until the same analytics run on the plant's own data.", classification=ClaimClassification.UNKNOWN, reason="No operational data from a real plant has been connected yet"),
    ]
    return OpsPack(days=DAYS, machines=machines, alerts=alerts(machines), production=prod, quality=qual, demand=dem, supply=supply(req, dem), emissions=emissions(req), actions=req.actions, claims=claims)
