"""The computed numbers, written out as plain facts for the copilot. Gemini may only quote these."""
from apps.api.domain.balance import BalanceRequest
from apps.api.domain.ops import OpsPack
from apps.api.ops.balance import balance


def facts(pack: OpsPack, bal: BalanceRequest | None) -> list[str]:
    p, out = pack, []
    for m in p.machines[:4]:
        if m.status in ("watch", "critical"):
            out.append(f"Machine {m.name} (step {m.step_label}) is {m.status}: {m.finding}")
    healthy = sum(1 for m in p.machines if m.status == "ok")
    out.append(f"{healthy} of {len(p.machines)} machines are healthy.")
    bn = next((s for s in p.production.stations if s.step_key == p.production.bottleneck_key), None)
    if bn:
        out.append(f"Bottleneck is {bn.label} at {bn.capacity_uph * bn.availability_pct / 100:.1f} units/h; line throughput {p.production.throughput_uph} units/h; OEE {p.production.oee_pct}% (availability {p.production.availability_pct}%, performance {p.production.performance_pct}%, quality {p.production.quality_pct}%).")
    if p.production.what_if and p.production.what_if[0].gain_pct > 0:
        w = p.production.what_if[0]
        out.append(f"Best capacity what-if: {w.label} lifts throughput by {w.gain_pct}%.")
    q = p.quality
    out.append(f"Defect rate averages {q.defect_rate_pct}% over {q.inspected} inspected units.")
    if q.drift:
        out.append(f"Defect rate drifted from {q.drift.from_pct}% to {q.drift.to_pct}% since about day {q.drift.since_day}; likely step key: {q.drift.likely_step_key or 'unknown'} (correlation, not proof).")
    d = p.demand
    out.append(f"Demand forecast: trend {d.growth_pct_year}% a year, peak in week {d.peak_week} at about {d.peak_p50:.0f} {d.unit}, back-test error {d.mape_pct}%.")
    out.append(f"Supply lead time about {p.supply.lead_time_days} days; order by week {p.supply.order_by_week}. Risks: " + "; ".join(f"{r.title} ({r.level})" for r in p.supply.risks))
    e = p.emissions
    out.append(f"Stack smoke opacity averages {e.smoke.baseline_opacity_pct}% with fixed settings and {e.smoke.with_ai_opacity_pct}% with AI air-fuel control; modelled fuel saving {e.smoke.fuel_saving_pct}%.")
    out.append(f"Effluent COD: {e.effluent.baseline_exceed_hours} of 72 hours over the {e.effluent.limit_mg_l} mg/L limit with a fixed dose, {e.effluent.with_ai_exceed_hours} with AI dosing; modelled chemical saving {e.effluent.chemical_saving_pct}%.")
    out.append("All of the above are from SIMULATED plant data, not a real plant.")
    if bal:
        r = balance(bal)
        out.append(f"Own records ({r.days} days): about {r.units_per_year:.0f} units a year.")
        for x in r.resources:
            out.append(f"{x.name}: {x.per_unit_avg} {x.unit} on average, best quartile {x.per_unit_best_quartile}; matching the best quartile every day would save {x.gap_saving_per_year:.0f} a year ({x.gap_saving_pct}%); last 30 days vs before: {x.per_unit_trend_pct:+}%; unusual days: {len(x.anomaly_days)}.")
        if r.water:
            out.append(f"Water: intake {r.water.intake_m3_year:.0f} m3/year, effluent {r.water.effluent_m3_year:.0f} m3/year ({'measured' if r.water.effluent_measured else 'assumed'}); with the chosen levers fresh water falls by {r.water.saved_pct}%.")
        if r.waste:
            out.append(f"Waste: {r.waste.waste_kg_year:.0f} kg/year, {r.waste.recovered_kg_year:.0f} kg recovered with the chosen lever.")
    return out
