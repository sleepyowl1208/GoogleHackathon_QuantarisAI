"use client";
import { Activity, CloudFog, Database, Sparkles, Droplets, Factory, ScanEye, TrendingUp, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { SiteResearch } from "@/lib/research-api";
import type { LayoutResult } from "@/lib/layout-api";
import { sendOps, toggleAction, type OpsAction, type OpsBody, type OpsPack } from "@/lib/ops-api";
import { supplyFacts } from "@/lib/insights-logic";
import { DEFAULT_SMOKE, setSmokeLevel, smokeFromOpacity } from "@/lib/ops-bus";
import { Line } from "./ops-chart";
import { CopilotView, DataView, InspectBox, type OwnData } from "./data-panel";
import { sendBalance, type Balance, type Levers } from "@/lib/balance-api";
import type { Dict } from "@/lib/i18n";

type View = "machines" | "production" | "quality" | "demand" | "emissions" | "data" | "copilot";
const VIEWS: { id: View; icon: typeof Wrench }[] = [{ id: "machines", icon: Wrench }, { id: "production", icon: Factory }, { id: "quality", icon: ScanEye }, { id: "demand", icon: TrendingUp }, { id: "emissions", icon: CloudFog }, { id: "data", icon: Database }, { id: "copilot", icon: Sparkles }];

const fmt = (n: number, d = 1) => n.toLocaleString(undefined, { maximumFractionDigits: d });

export function OpsPanel({ design, research, location, t, language, onPickStep }: { design: LayoutResult; research?: SiteResearch; location: string; t: Dict; language: "en" | "hi"; onPickStep: (id: string) => void }) {
  const [actions, setActions] = useState<OpsAction[]>([]);
  const [pack, setPack] = useState<OpsPack>();
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<View>("machines");
  const [own, setOwn] = useState<OwnData>();
  const [levers, setLevers] = useState<Levers>({ reuse_pct: 40, leak_pct: 5, waste_recovery_pct: 50 });
  const [price, setPrice] = useState("");
  const [balance, setBalance] = useState<Balance>();
  const [balanceFailed, setBalanceFailed] = useState(false);
  const balanceBody = useMemo(() => (own ? { industry: (design.label || own.name).slice(0, 100), rows: own.rows, levers, water_unit_cost_inr: Number(price) > 0 ? Number(price) : undefined } : undefined), [own, levers, price, design.label]);
  useEffect(() => {
    if (!balanceBody) return;
    let live = true;
    const timer = setTimeout(() => { sendBalance(balanceBody).then((b) => { if (live) { setBalance(b); setBalanceFailed(false); } }).catch(() => { if (live) setBalanceFailed(true); }); }, 250);
    return () => { live = false; clearTimeout(timer); };
  }, [balanceBody]);
  const body = useMemo<OpsBody>(() => {
    const flows = research?.flows ?? [];
    const names = new Map((research?.places ?? []).map((p) => [p.place_id, p.name]));
    return {
      industry: design.label.slice(0, 100), location: location.slice(0, 120), language, actions,
      stages: design.zones.filter((z) => z.step).sort((a, b) => (a.step ?? 0) - (b.step ?? 0)).slice(0, 14).map((z) => ({ key: z.zone_id.slice(0, 40), label: z.label.slice(0, 80), equipment: z.equipment.slice(0, 8), area_m2: Math.min(z.area_m2 ?? 100, 100000) })),
      sources: flows.filter((f) => f.to_id === "site" || !f.to_id).slice(0, 16).map((f) => ({ name: (names.get(f.from_id) ?? f.from_id).slice(0, 80), km: f.distance_km ?? undefined })),
    };
  }, [design, research, location, language, actions]);
  useEffect(() => { let live = true; sendOps(body).then((p) => { if (live) { setPack(p); setFailed(false); } }).catch(() => { if (live) setFailed(true); }); return () => { live = false; }; }, [body]);
  const smokeNow = pack?.emissions.smoke.current_opacity_pct;
  useEffect(() => { if (smokeNow !== undefined) setSmokeLevel(smokeFromOpacity(smokeNow)); }, [smokeNow]);
  useEffect(() => () => setSmokeLevel(DEFAULT_SMOKE), []);
  const a = t.ao;
  if (failed && !pack) return <p className="ix-intro">{a.error}</p>;
  if (!pack) return <p className="ix-intro">{a.loading}</p>;
  const p = pack, stepLabel = (k: string) => p.production.stations.find((s) => s.step_key === k)?.label ?? k;
  const act = (next: OpsAction) => setActions((cur) => toggleAction(cur, next));
  const has = (type: OpsAction["type"], target: string) => actions.some((x) => x.type === type && x.target === target);
  const supply = supplyFacts(research);
  const e = p.emissions;

  return (
    <div className="ix ops">
      <p className="ix-intro">{a.intro}</p>
      <span className="bp-tag kind-simulation-tag">◌ {a.simulated}</span>
      <div className="score" aria-label={t.da.scoreTitle}>
        <h4>{t.da.scoreTitle}</h4>
        <ul>
          {e.smoke.baseline_opacity_pct > 0 ? <li><span>{t.da.scoreSmoke}</span><b>{fmt(e.smoke.baseline_opacity_pct)}% → {fmt(e.smoke.with_ai_opacity_pct)}%</b></li> : null}
          {e.smoke.fuel_saving_pct > 0 ? <li><span>{t.da.scoreFuel}</span><b>−{fmt(e.smoke.fuel_saving_pct)}%</b></li> : null}
          <li><span>{t.da.scoreEff}</span><b>{e.effluent.baseline_exceed_hours} → {e.effluent.with_ai_exceed_hours}</b></li>
          <li><span>{t.da.scoreChem}</span><b>−{fmt(e.effluent.chemical_saving_pct, 0)}%</b></li>
          {balance?.water ? <li><span>{t.da.scoreWater}</span><b>−{fmt(balance.water.saved_pct)}%</b></li> : null}
        </ul>
        <small>{t.da.scoreNote}</small>
      </div>
      <div className="ops-kpis">
        <div><b>{fmt(p.production.oee_pct)}%</b><span>{a.oee}</span></div>
        <div><b>{fmt(p.production.throughput_uph)}</b><span>{a.throughput}</span></div>
        <div><b>{fmt(p.quality.defect_rate_pct, 2)}%</b><span>{a.defects}</span></div>
        <div className={p.alerts.length ? "warn" : ""}><b>{p.alerts.length}</b><span>{a.alerts}</span></div>
        <div><b>±{fmt(p.demand.mape_pct)}%</b><span>{a.forecastError}</span></div>
      </div>
      <div className="ops-views" role="tablist">
        {VIEWS.map(({ id, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={view === id} className={view === id ? "on" : ""} onClick={() => setView(id)}><Icon size={15} />{id === "data" ? t.da.tabData : id === "copilot" ? t.da.tabCopilot : a.views[id]}</button>)}
      </div>

      {view === "data" ? <DataView t={t} own={own} onOwn={(d) => { setBalance(undefined); setOwn(d); }} levers={levers} onLevers={setLevers} price={price} onPrice={setPrice} balance={own ? balance : undefined} busy={Boolean(own) && !balance && !balanceFailed} failed={balanceFailed} /> : null}
      {view === "copilot" ? <CopilotView t={t} language={language} ops={body} balanceBody={balanceBody} /> : null}
      {view === "machines" ? (
        <section>
          <h3><Wrench size={16} />{a.pmTitle}</h3><p className="ix-intro">{a.pmIntro}</p>
          <ul className="ops-list">
            {p.machines.slice(0, 8).map((m) => {
              const s = m.signals.reduce((x, y) => (y.z > x.z ? y : x));
              return (
                <li key={m.machine_id} className={`risk-${m.status}`}>
                  <header><strong>{m.name}</strong><button type="button" className="tag-btn" onClick={() => onPickStep(m.step_key)}>{m.step_label}</button><span className={`ops-pill ${m.status}`}>{a.status[m.status]}</span></header>
                  <div className="risk-bar" aria-label={`${a.risk} ${m.risk}`}><i style={{ width: `${m.risk}%` }} /></div>
                  <p>{m.finding}</p>
                  {m.status === "watch" || m.status === "critical" ? <><Line lines={[{ values: s.daily, color: "var(--saffron)" }]} limit={s.limit} height={70} /><small>{s.name} · {a.dailyMean} · {a.limitLine}: {fmt(s.limit)} {s.unit}</small></> : null}
                  {m.status !== "ok" ? <button type="button" className="ops-act" aria-pressed={has("schedule_maintenance", m.machine_id)} onClick={() => act({ type: "schedule_maintenance", target: m.machine_id })}>{has("schedule_maintenance", m.machine_id) ? a.undo : a.schedule}</button> : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {view === "production" ? (
        <section>
          <h3><Factory size={16} />{a.poTitle}</h3><p className="ix-intro">{a.poIntro}</p>
          <div className="ops-kpis small"><div><b>{fmt(p.production.availability_pct)}%</b><span>{a.availability}</span></div><div><b>{fmt(p.production.performance_pct)}%</b><span>{a.performance}</span></div><div><b>{fmt(p.production.quality_pct)}%</b><span>{a.quality}</span></div></div>
          <ul className="ops-bars">
            {p.production.stations.map((s) => (
              <li key={s.step_key} className={s.step_key === p.production.bottleneck_key ? "bottleneck" : ""}>
                <span>{s.label}{s.step_key === p.production.bottleneck_key ? ` · ${a.bottleneck}` : ""}</span>
                <div className="bar"><i style={{ width: `${Math.min(100, (s.capacity_uph * s.availability_pct / 100) / Math.max(...p.production.stations.map((x) => x.capacity_uph)) * 100)}%` }} /></div>
                <small>{fmt(s.capacity_uph * s.availability_pct / 100)} / h · {fmt(s.downtime_h)} h {a.downtime}</small>
              </li>
            ))}
          </ul>
          <h4>{a.whatIf}</h4>
          <ul className="ops-list compact">
            {p.production.what_if.map((w) => <li key={w.step_key}><span>{w.label}</span><b>{w.gain_pct > 0 ? `+${fmt(w.gain_pct)}% ${a.throughput}` : a.noGain}</b>{w.gain_pct > 0 ? <button type="button" className="ops-act" aria-pressed={has("add_capacity", w.step_key)} onClick={() => act({ type: "add_capacity", target: w.step_key, value: 20 })}>{has("add_capacity", w.step_key) ? a.undo : a.apply}</button> : null}</li>)}
          </ul>
          <Line lines={[{ values: p.production.daily_output, color: "var(--green, #2e7d32)" }]} height={80} /><small>{a.dailyOutput}</small>
        </section>
      ) : null}

      {view === "quality" ? (
        <section>
          <h3><ScanEye size={16} />{a.vqTitle}</h3><p className="ix-intro">{a.vqIntro}</p>
          {p.quality.drift ? <div className="ops-callout"><Activity size={16} /><p>{a.drift.replace("{from}", fmt(p.quality.drift.from_pct, 2)).replace("{to}", fmt(p.quality.drift.to_pct, 2)).replace("{day}", String(p.quality.drift.since_day))}{p.quality.drift.likely_step_key ? ` ${a.likely.replace("{step}", stepLabel(p.quality.drift.likely_step_key))}` : ""}</p></div> : <p className="ix-intro">{a.noDrift}</p>}
          <Line lines={[{ values: p.quality.daily_rate, color: "var(--saffron)" }]} height={90} markX={p.quality.drift?.since_day} /><small>{a.defectDaily}</small>
          <ul className="ops-bars">{p.quality.by_type.map((d) => <li key={d.type}><span>{d.type}</span><div className="bar"><i style={{ width: `${d.pct}%` }} /></div><small>{fmt(d.count, 0)}</small></li>)}</ul>
          <p className="ix-intro">{a.vqCamera}</p>
          <InspectBox t={t} language={language} industry={design.label} />
        </section>
      ) : null}

      {view === "demand" ? (
        <section>
          <h3><TrendingUp size={16} />{a.dfTitle}</h3><p className="ix-intro">{a.dfIntro}</p>
          <Line lines={[{ values: [...p.demand.history, ...p.demand.forecast.map((f) => f.p50)], color: "var(--green, #2e7d32)" }]} band={{ lo: p.demand.forecast.map((f) => f.p10), hi: p.demand.forecast.map((f) => f.p90), offset: p.demand.history.length }} height={130} markX={p.demand.history.length - 1} />
          <small>{a.history} · {a.forecast} (P10–P90) · {p.demand.unit}</small>
          <p>{p.demand.season_note} {a.growth.replace("{g}", fmt(p.demand.growth_pct_year))}</p>
          <h3><Droplets size={16} />{a.scTitle}</h3>
          <p className="ix-intro">{a.scIntro.replace("{d}", String(p.supply.lead_time_days)).replace("{n}", String(supply?.sources ?? p.supply.sources_used))}{p.supply.order_by_week ? ` ${a.orderBy.replace("{w}", String(p.supply.order_by_week))}` : ""}</p>
          <ul className="ops-list compact">{p.supply.risks.map((r) => <li key={r.title} className={`lvl-${r.level}`}><b>{r.title}</b><span>{r.detail}</span></li>)}</ul>
        </section>
      ) : null}

      {view === "emissions" ? (
        <section>
          <h3><CloudFog size={16} />{a.emTitle}</h3><p className="ix-intro">{a.emIntro}</p>
          <div className="em-grid">
            <article>
              <header><h4>{a.smoke}</h4><button type="button" className={`ops-switch ${e.combustion_ai ? "on" : ""}`} role="switch" aria-checked={e.combustion_ai} onClick={() => act({ type: "ai_control", target: "combustion" })}>{e.combustion_ai ? a.aiOn : a.aiOff}</button></header>
              <Line lines={[{ values: e.smoke.series_baseline, color: "var(--danger, #c0392b)", dash: !e.combustion_ai ? false : true }, { values: e.smoke.series_ai, color: "var(--green, #2e7d32)" }]} height={100} /><small>{a.opacity} · 72 h</small>
              <p>{a.smokeNow.replace("{now}", fmt(e.smoke.current_opacity_pct)).replace("{base}", fmt(e.smoke.baseline_opacity_pct)).replace("{ai}", fmt(e.smoke.with_ai_opacity_pct))}</p>
              {e.smoke.fuel_saving_pct > 0 ? <p>{a.fuelSave.replace("{p}", fmt(e.smoke.fuel_saving_pct))}</p> : <p>{a.noCombustion}</p>}
            </article>
            <article>
              <header><h4>{a.effluent}</h4><button type="button" className={`ops-switch ${e.etp_ai ? "on" : ""}`} role="switch" aria-checked={e.etp_ai} onClick={() => act({ type: "ai_control", target: "etp" })}>{e.etp_ai ? a.aiOn : a.aiOff}</button></header>
              <Line lines={[{ values: e.effluent.series_baseline, color: "var(--danger, #c0392b)" }, { values: e.effluent.series_ai, color: "var(--green, #2e7d32)" }]} limit={e.effluent.limit_mg_l} height={100} /><small>COD mg/L · 72 h · {a.limitLine} {e.effluent.limit_mg_l}</small>
              <p>{a.effNow.replace("{base}", String(e.effluent.baseline_exceed_hours)).replace("{ai}", String(e.effluent.with_ai_exceed_hours))}</p>
              <p>{a.chemSave.replace("{p}", fmt(e.effluent.chemical_saving_pct, 0))}</p>
            </article>
          </div>
          <ul className="ops-notes">{e.assumptions.map((n) => <li key={n}>{n}</li>)}</ul>
        </section>
      ) : null}
    </div>
  );
}
