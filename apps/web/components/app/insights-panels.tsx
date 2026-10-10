"use client";
import { ArrowRight, Bot, Droplet, Gauge, Leaf, Loader2, Recycle, ScanEye, Sparkles, Sun, TrendingUp, Truck, Wrench, Zap, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { ClaimList } from "@/components/blueprint/claim-list";
import { StepIcon } from "@/components/blueprint/step-icon";
import { fill, type Dict } from "@/lib/i18n";
import type { Insights, OpsArea } from "@/lib/insights-api";
import { biggestStep, byImpact, dataStatus, routeLengthM, supplyFacts, wasteFacts } from "@/lib/insights-logic";
import type { LayoutResult, Zone } from "@/lib/layout-api";
import type { SiteConditions, SiteResearch } from "@/lib/research-api";
import { LiveConditions } from "./live-conditions";

export type InsightsState = { insights?: Insights; status?: "loading" | "error"; onRun: () => void };
type Level = "low" | "medium" | "high";

/** Shows a skeleton while the analysis runs and a retry if it failed, so the tabs never show invented placeholder content. */
export function InsightsGate({ state, t, children }: { state: InsightsState; t: Dict; children: (insights: Insights) => ReactNode }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => { if (state.status !== "loading") return; const timer = setInterval(() => setPhase((n) => Math.min(n + 1, t.ix.loading.length - 1)), 3000); return () => clearInterval(timer); }, [state.status, t.ix.loading.length]);
  if (state.status === "loading" && !state.insights) {
    return (
      <div aria-busy="true" aria-label={t.loadingAria}>
        <p className="map-loading" role="status"><Loader2 size={16} className="spin" />{t.ix.loading[phase]}…</p>
        <div className="skel-list">{Array.from({ length: 4 }, (_, i) => <span key={i} className="skel ix-skel" style={{ animationDelay: `${i * 120}ms` }} />)}</div>
      </div>
    );
  }
  if (!state.insights) {
    return (
      <div className="map-empty">
        {state.status === "error" ? <p className="bp-error">{t.ix.error}</p> : <p className="muted">{t.ix.noInsights}</p>}
        <button type="button" className="chip strong" onClick={state.onRun}><Sparkles size={15} />{state.status === "error" ? t.retry : t.ix.run}</button>
      </div>
    );
  }
  return <>{children(state.insights)}</>;
}

function Meter({ value, max = 5, tone }: { value: number; max?: number; tone: "power" | "water" }) {
  return <span className={`meter ${tone}`} role="img" aria-label={`${value} / ${max}`}>{Array.from({ length: max }, (_, i) => <i key={i} className={i < value ? "on" : ""} style={{ ["--d" as string]: `${i * 70}ms` }} />)}</span>;
}
function Pips({ level, label }: { level: Level; label: string }) {
  const n = level === "high" ? 3 : level === "medium" ? 2 : 1;
  return <span className={`pips ${level}`} title={label}>{Array.from({ length: 3 }, (_, i) => <i key={i} className={i < n ? "on" : ""} />)}<span className="pip-label">{label}</span></span>;
}
const zoneBy = (design: LayoutResult) => new Map(design.zones.map((z) => [z.zone_id, z]));

/* ---------- By-products: a workflow, not a list of ideas ---------- */
export function ByproductWorkflow({ state, design, t, onPickStep }: { state: InsightsState; design: LayoutResult; t: Dict; onPickStep: (id: string) => void }) {
  return (
    <InsightsGate state={state} t={t}>
      {(ins) => {
        const zones = zoneBy(design);
        return (
          <div className="ix">
            <p className="ix-intro">{t.ix.flowIntro}</p>
            {ins.byproduct_flows.length === 0 ? <p className="empty">{t.ix.noFlows}</p> : ins.byproduct_flows.map((f, i) => {
              const src = f.source_stage ? zones.get(f.source_stage) : undefined;
              return (
                <article key={f.waste} className="flow-card" style={{ ["--i" as string]: i }}>
                  <div className="pipe">
                    <div className="pipe-col">
                      <span className="pipe-label">{t.ix.stage}</span>
                      {src ? <button type="button" className="node src" onClick={() => onPickStep(src.zone_id)}><StepIcon icon={src.icon} kind={src.kind} size={30} /><span>{src.step ? `${src.step} · ` : ""}{src.label}</span></button> : <span className="node src muted">—</span>}
                      <span className="node waste"><Recycle size={16} />{f.waste}</span>
                    </div>
                    <span className="link" aria-hidden="true"><ArrowRight size={18} /></span>
                    <div className="pipe-col">
                      <span className="pipe-label">{t.ix.treat}</span>
                      <ol className="treat">{f.treatment.map((s, k) => <li key={`${s}-${k}`} style={{ ["--k" as string]: k }}><span className="treat-n">{k + 1}</span>{s}</li>)}</ol>
                    </div>
                    <span className="link" aria-hidden="true"><ArrowRight size={18} /></span>
                    <div className="pipe-col grow">
                      <span className="pipe-label">{t.ix.product}</span>
                      {f.products.length === 0 ? <span className="node muted">—</span> : f.products.map((p) => (
                        <div key={p.name} className="node product">
                          <strong>{p.name}</strong>
                          {p.use ? <span className="muted small">{p.use}</span> : null}
                          <span className="product-meta">{p.buyer ? <span className="tag-soft">{t.ix.buyer}: {p.buyer}</span> : null}<Pips level={p.value} label={t.ix.value[p.value]} /></span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {f.benefit ? <p className="mitigation"><Leaf size={14} />{f.benefit}</p> : null}
                  {f.verify ? <p className="muted small"><strong>{t.verifyLabel}:</strong> {f.verify}</p> : null}
                </article>
              );
            })}
            <span className="bp-tag kind-inference-tag">◐ {t.ideasToValidate}</span>
          </div>
        );
      }}
    </InsightsGate>
  );
}

/* ---------- Power and water ---------- */
export function PowerWater({ state, design, site, t, onPickStep }: { state: InsightsState; design: LayoutResult; site?: SiteConditions; t: Dict; onPickStep: (id: string) => void }) {
  const solar = design.claims.find((c) => /solar/i.test(c.statement) && c.classification === "CALCULATION");
  const zones = zoneBy(design);
  return (
    <div className="ix">
      {solar ? (
        <section className="ix-card solar">
          <header><Sun size={18} /><h3>{t.ix.solarTitle}</h3><span className="bp-tag kind-calculation-tag">Σ</span></header>
          <p>{solar.statement}</p>
          {site?.avg_solar_kwh_m2_day != null ? <p className="muted small">{t.ix.solarMeasured}: {site.avg_solar_kwh_m2_day} {t.liveSolarUnit}</p> : null}
        </section>
      ) : null}
      <InsightsGate state={state} t={t}>
        {(ins) => (
          <>
            <section className="ix-card">
              <header><Zap size={18} /><h3>{t.ix.loadTitle}</h3></header>
              <p className="muted small">{t.ix.loadIntro}</p>
              <ul className="loads">
                {ins.loads.map((l, i) => {
                  const z = zones.get(l.stage_key) as Zone | undefined;
                  if (!z) return null;
                  return (
                    <li key={l.stage_key} style={{ ["--i" as string]: i }}>
                      <button type="button" className="load-name" onClick={() => onPickStep(z.zone_id)}><span className="step-num">{z.step}</span>{z.label}</button>
                      <span className="load-row"><Zap size={13} /><Meter value={l.power} tone="power" /></span>
                      <span className="load-row"><Droplet size={13} /><Meter value={l.water} tone="water" /></span>
                      {l.note ? <span className="load-note muted small">{l.note}</span> : null}
                    </li>
                  );
                })}
              </ul>
              <p className="legend-inline"><span><Zap size={12} /> {t.ix.power}</span><span><Droplet size={12} /> {t.ix.water}</span></p>
            </section>

            {ins.water_train.length ? (
              <section className="ix-card">
                <header><Droplet size={18} /><h3>{t.ix.trainTitle}</h3></header>
                <ol className="train">{ins.water_train.map((w, i) => <li key={w.name} style={{ ["--i" as string]: i }}><span className="drop">{i + 1}</span><strong>{w.name}</strong>{w.purpose ? <span className="muted small">{w.purpose}</span> : null}</li>)}</ol>
              </section>
            ) : null}

            {ins.resource_actions.length ? (
              <section className="ix-card">
                <header><Sparkles size={18} /><h3>{t.ix.savingsTitle}</h3></header>
                <ul className="actions">{byImpact(ins.resource_actions).map((a, i) => (
                  <li key={a.title} style={{ ["--i" as string]: i }}>
                    <span className={`res-icon ${a.resource}`}>{a.resource === "power" ? <Zap size={16} /> : <Droplet size={16} />}</span>
                    <div><strong>{a.title}</strong>{a.detail ? <p>{a.detail}</p> : null}<span className="rating-row"><span>{t.ix.impact}</span><Pips level={a.effect} label={t.effort[a.effect]} /><span>{t.ix.effortWord}</span><Pips level={a.effort} label={t.effort[a.effort]} /></span></div>
                  </li>
                ))}</ul>
              </section>
            ) : null}
            <span className="bp-tag kind-inference-tag">◐ {t.ideasToValidate}</span>
          </>
        )}
      </InsightsGate>
      {design.utilities.length ? <details className="ix-more"><summary>{t.ix.fromDesign}</summary><ul className="plain-list">{design.utilities.map((u) => <li key={u}>{u}</li>)}</ul></details> : null}
    </div>
  );
}

/* ---------- Environment: what to do about it ---------- */
export function EnvironmentPlan({ state, design, site, t }: { state: InsightsState; design: LayoutResult; site?: SiteConditions; t: Dict }) {
  return (
    <div className="ix">
      {site ? <section><h3 className="sub-title first">{t.ix.siteTitle}</h3><LiveConditions site={site} t={t} /></section> : null}
      <InsightsGate state={state} t={t}>
        {(ins) => (
          <section>
            <h3 className="sub-title first">{t.ix.envTitle}</h3>
            <p className="ix-intro">{t.ix.envIntro}</p>
            <ol className="env-actions">{byImpact(ins.env_actions).map((a, i) => (
              <li key={a.title} style={{ ["--i" as string]: i }}>
                <span className="rank">{i + 1}</span>
                <div>
                  <header><strong>{a.title}</strong>{a.aspect ? <span className="tag-soft">{a.aspect}</span> : null}</header>
                  <span className="rating-row"><span>{t.ix.impact}</span><Pips level={a.effect} label={t.effort[a.effect]} /><span>{t.ix.effortWord}</span><Pips level={a.effort} label={t.effort[a.effort]} /></span>
                  {a.first_step ? <p className="first-step"><ArrowRight size={14} /><span><strong>{t.ix.firstStep}:</strong> {a.first_step}</span></p> : null}
                  {a.verify ? <p className="muted small"><strong>{t.verifyLabel}:</strong> {a.verify}</p> : null}
                </div>
              </li>
            ))}</ol>
            <span className="bp-tag kind-inference-tag">◐ {t.ideasToValidate}</span>
          </section>
        )}
      </InsightsGate>
      {design.environment.length ? (
        <details className="ix-more"><summary>{t.ix.impactsTitle}</summary>
          <ul className="env-list">{design.environment.map((e) => <li key={e.aspect}><span className="env-icon"><Leaf size={18} /></span><div><strong>{e.aspect}</strong><p>{e.impact}</p>{e.mitigation ? <p className="mitigation">{e.mitigation}</p> : null}</div></li>)}</ul>
          <p className="muted small">{t.envDisclaimer}</p>
        </details>
      ) : null}
    </div>
  );
}

/* ---------- Manufacturing intelligence ---------- */
const OPS_ICON: Record<OpsArea, LucideIcon> = { predictive_maintenance: Wrench, visual_inspection: ScanEye, production_optimization: Gauge, supply_chain: Truck, demand_forecasting: TrendingUp, waste_reduction: Recycle, copilot: Bot };

export function OperationsIntelligence({ state, design, research, t, onPickStep }: { state: InsightsState; design: LayoutResult; research?: SiteResearch; t: Dict; onPickStep: (id: string) => void }) {
  const zones = zoneBy(design);
  const supply = supplyFacts(research);
  return (
    <InsightsGate state={state} t={t}>
      {(ins) => {
        const factFor = (area: OpsArea): string | undefined => {
          if (area === "supply_chain") return supply ? fill(t.ix.factSupply, { n: supply.sources, m: supply.routes, km: supply.farthestKm ?? "—" }) : t.ix.factNoResearch;
          if (area === "production_optimization") { const big = biggestStep(design); return [fill(t.ix.factRoute, { m: routeLengthM(design) }), big ? fill(t.ix.factBiggest, { name: big.label, area: big.area_m2.toFixed(0) }) : ""].filter(Boolean).join(" "); }
          if (area === "waste_reduction") { const w = wasteFacts(ins, design); return fill(t.ix.factWaste, { n: w.streams, k: w.routed }); }
          return undefined;
        };
        return (
          <div className="ix">
            <p className="ix-intro">{t.ix.opsIntro}</p>
            <div className="ops-grid">
              {ins.operations.map((o, i) => {
                const Icon = OPS_ICON[o.area];
                const status = dataStatus(o.area, Boolean(research));
                const fact = factFor(o.area);
                return (
                  <article key={o.area} className="ops-card" style={{ ["--i" as string]: i }}>
                    <header><span className="ops-icon"><Icon size={20} /></span><h3>{t.ix.areas[o.area]}</h3></header>
                    <span className={`status ${status}`}>{status === "live" ? t.ix.statusLive : status === "design" ? t.ix.statusDesign : t.ix.statusNeeds}</span>
                    {o.what ? <p>{o.what}</p> : null}
                    {fact ? <p className="fact"><span className="bp-tag kind-calculation-tag">Σ</span>{fact}</p> : null}
                    {o.applies_at.length ? <div className="step-group"><span className="group-label">{t.ix.appliesAt}</span><ul className="tags">{o.applies_at.map((k) => { const z = zones.get(k); return z ? <li key={k}><button type="button" className="tag-btn" onClick={() => onPickStep(k)}>{z.step ? `${z.step} · ` : ""}{z.label}</button></li> : null; })}</ul></div> : null}
                    {o.data_needed.length ? <div className="step-group"><span className="group-label">{t.ix.dataNeeded}</span><ul className="tags">{o.data_needed.map((d) => <li key={d}>{d}</li>)}</ul></div> : null}
                    {o.first_step ? <p className="first-step"><ArrowRight size={14} /><span><strong>{t.ix.firstStep}:</strong> {o.first_step}</span></p> : null}
                  </article>
                );
              })}
            </div>
            <span className="bp-tag kind-inference-tag">◐ {t.ideasToValidate}</span>
            <ClaimList claims={ins.claims} labels={t.claimLabels} />
          </div>
        );
      }}
    </InsightsGate>
  );
}
