"""Water, energy and waste balance from a plant's own daily records. Pure arithmetic: nothing here is a model's guess."""
import statistics as st

from apps.api.domain.balance import BalanceRequest, BalanceResult, Resource, WasteBalance, WaterBalance
from apps.api.domain.contracts import Claim, ClaimClassification

EFFLUENT_SHARE_ASSUMED = 0.8  # used only when the owner gave no effluent meter data


def _resource(name: str, unit: str, rows, pick) -> Resource | None:
    pairs = [(r.day, pick(r), r.units) for r in rows if pick(r) is not None]
    if len(pairs) < 14:
        return None
    per = [v / u for _, v, u in pairs]
    ordered = sorted(per)
    best = st.fmean(ordered[: max(1, len(ordered) // 4)])
    avg = sum(v for _, v, _ in pairs) / sum(u for _, _, u in pairs)
    sd = st.pstdev(per) or 1e-9
    mean = st.fmean(per)
    anomalies = [d for (d, _, _), x in zip(pairs, per) if (x - mean) / sd > 3]
    recent, before = per[-30:], per[-60:-30]
    trend = 100 * (st.fmean(recent) - st.fmean(before)) / st.fmean(before) if len(before) >= 7 else 0.0
    per_day_units = sum(u for _, _, u in pairs) / len(pairs)
    yearly_units = per_day_units * 365
    gap = max(0.0, (avg - best) * yearly_units)
    return Resource(name=name, unit=unit, per_unit_avg=round(avg, 4), per_unit_best_quartile=round(best, 4), per_unit_trend_pct=round(trend, 1), total_per_year=round(avg * yearly_units, 1),
                    gap_saving_per_year=round(gap, 1), gap_saving_pct=round(100 * gap / (avg * yearly_units), 1) if avg else 0.0, anomaly_days=anomalies[:10], daily_per_unit=[round(x, 4) for x in per], days=[d for d, _, _ in pairs])


def balance(req: BalanceRequest) -> BalanceResult:
    rows = sorted(req.rows, key=lambda r: r.day)
    resources = [x for x in (_resource("water", "m³/unit", rows, lambda r: r.water_m3), _resource("energy", "kWh/unit", rows, lambda r: r.energy_kwh), _resource("waste", "kg/unit", rows, lambda r: r.waste_kg)) if x]
    per_day = lambda pick: (sum(pick(r) for r in rows if pick(r) is not None) / max(1, sum(1 for r in rows if pick(r) is not None)))
    notes: list[str] = []
    water = waste = None
    w = next((r for r in resources if r.name == "water"), None)
    if w:
        intake = w.total_per_year
        measured = any(r.effluent_m3 is not None for r in rows)
        effluent = per_day(lambda r: r.effluent_m3) * 365 if measured else intake * EFFLUENT_SHARE_ASSUMED
        if not measured:
            notes.append("No effluent meter data was given, so effluent is assumed to be 80% of intake. Enter measured effluent to replace this.")
        leak = intake * req.levers.leak_pct / 100
        reuse = min(effluent * req.levers.reuse_pct / 100, intake - leak)
        fresh = intake - leak - reuse
        saved = intake - fresh
        water = WaterBalance(intake_m3_year=round(intake, 0), effluent_m3_year=round(effluent, 0), effluent_measured=measured, reuse_saving_m3_year=round(reuse, 0), leak_saving_m3_year=round(leak, 0), fresh_after_m3_year=round(fresh, 0),
                             discharge_after_m3_year=round(max(0.0, effluent - reuse - leak * 0.0), 0), saved_pct=round(100 * saved / intake, 1) if intake else 0.0, saved_inr_year=round(saved * req.water_unit_cost_inr, 0) if req.water_unit_cost_inr else None)
    g = next((r for r in resources if r.name == "waste"), None)
    if g:
        rec = g.total_per_year * req.levers.waste_recovery_pct / 100
        waste = WasteBalance(waste_kg_year=round(g.total_per_year, 0), recovered_kg_year=round(rec, 0), landfill_after_kg_year=round(g.total_per_year - rec, 0))
    if not resources:
        notes.append("Add at least 14 days of water, energy or waste readings beside production to get a balance.")
    units_year = sum(r.units for r in rows) / len(rows) * 365
    claims = [
        Claim(claim_id="bal_1", statement="Per-unit use, the best-quartile gap, trends and unusual days are calculated from the records you provided.", classification=ClaimClassification.CALCULATION, methodology="Totals divided by units; best quartile = mean of the lowest 25% of days; unusual = more than 3 standard deviations above the mean"),
        Claim(claim_id="bal_2", statement="Reuse, leak-fix and waste-recovery percentages are what-if levers you set, not measured results.", classification=ClaimClassification.ASSUMPTION, confidence=0.3, reason="Real achievable percentages depend on the process, water quality and equipment; trial before relying on them"),
    ]
    return BalanceResult(days=len(rows), units_per_year=round(units_year, 0), resources=resources, water=water, waste=waste, notes=notes, claims=claims)
