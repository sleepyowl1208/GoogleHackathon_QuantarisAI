"use client";
import { AlertTriangle, ArrowRight, ChevronLeft, ChevronRight, Cog, Droplets, Eye, EyeOff, Loader2, ShieldCheck, Trash2, Wind, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { StepIcon } from "@/components/blueprint/step-icon";
import { fill, type Dict } from "@/lib/i18n";
import type { Zone } from "@/lib/layout-api";
import { StepIllustration } from "./step-illustration";
import { StepVideo } from "./step-video";
import { envKey, useStepCtx } from "./step-context";
import { routesFor, sendStepEnv, type StepEnv } from "@/lib/step-env-api";
import type { RouteLine } from "@/components/blueprint/water-routes";


function Chain({ route, names, t }: { route: string[]; names: Record<string, string>; t: Dict }) {
  return <div className="jc-flow env-route">{route.map((k, i) => <span key={k} className="env-hop">{i > 0 ? <ArrowRight size={14} /> : null}<span className={k === "etp" ? "jc-out" : i === 0 ? "jc-step" : "jc-in"}>{names[k] ?? t.se.zones[k] ?? k}</span></span>)}</div>;
}

/** Where this step's used water and waste go, how they are treated and what stops pollution. Made on request; shown as words and as pipes on the plant. */
function EnvBlock({ zone, names, steps, onRoutes, t }: { zone: Zone; names: Record<string, string>; steps: { key: string; label: string; equipment: string[]; outputs: string[] }[]; onRoutes: (r?: RouteLine[]) => void; t: Dict }) {
  const ctx = useStepCtx();
  const key = ctx ? envKey(ctx.language, zone.zone_id) : zone.zone_id;
  const saved = ctx?.envs[key];
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [show, setShow] = useState(true);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const env: StepEnv | undefined = saved;
  useEffect(() => { onRoutes(env && show ? routesFor(env) : undefined); }, [env, show, onRoutes]);
  useEffect(() => () => onRoutes(undefined), [onRoutes]);
  if (!ctx) return null;
  const run = () => {
    setStatus("loading");
    sendStepEnv({ industry: ctx.industry, location: ctx.location, stages: steps, step_key: zone.zone_id, wastes: ctx.wastes, language: ctx.language })
      .then((res) => { ctx.saveEnv(key, res); if (alive.current) setStatus("idle"); })
      .catch(() => { if (alive.current) setStatus("error"); });
  };
  return (
    <section className="env-block">
      <h4><Droplets size={13} />{t.se.title}</h4>
      {!env ? (
        status === "loading" ? <p className="map-loading" role="status"><Loader2 size={15} className="spin" />{t.se.loading}</p> : (
          <div className="video-ask">
            <button type="button" className="chip strong" onClick={run}><Droplets size={14} />{status === "error" ? `${t.se.error} · ${t.retry}` : t.se.show}</button>
          </div>
        )
      ) : (
        <div className="env-body">
          {!env.uses_water ? <p className="muted">{t.se.noWater}</p> : null}
          {env.water_in ? <div><span className="group-label">{t.se.waterIn}</span><p>{env.water_in}</p></div> : null}
          {env.wastewater ? <div><span className="group-label">{t.se.wastewater}</span><p>{env.wastewater}</p></div> : null}
          {env.outlet ? <div><span className="group-label">{t.se.outlet}</span><p>{env.outlet}</p></div> : null}
          {env.route.length ? <div><span className="group-label">{t.se.route}</span><Chain route={env.route} names={names} t={t} /></div> : null}
          {env.treatment.length ? <div><span className="group-label">{t.se.treatment}</span><ol className="treat-list">{env.treatment.map((x) => <li key={x}>{x}</li>)}</ol></div> : null}
          {env.reuse ? <p className="mitigation"><Droplets size={14} /><span><strong>{t.se.reuse}:</strong> {env.reuse}</span></p> : null}
          {env.discharge ? <p className="env-warn"><AlertTriangle size={14} /><span><strong>{t.se.discharge}:</strong> {env.discharge}</span></p> : null}
          {env.solid_waste ? <p><Trash2 size={13} className="inl" /><strong>{t.se.solid}:</strong> {env.solid_waste}{env.solid_to ? <> → <span className="jc-in">{names[env.solid_to] ?? t.se.zones[env.solid_to] ?? env.solid_to}</span></> : null}</p> : null}
          {env.air_noise ? <p><Wind size={13} className="inl" /><strong>{t.se.air}:</strong> {env.air_noise}</p> : null}
          {env.safeguards.length ? <div><span className="group-label">{t.se.safeguards}</span><ul className="safeguards">{env.safeguards.map((x) => <li key={x}><ShieldCheck size={13} />{x}</li>)}</ul></div> : null}
          {env.plant_level ? <div><span className="group-label">{t.se.plant}</span><p>{env.plant_level}</p></div> : null}
          {env.check ? <p className="first-step"><span><strong>{t.se.check}:</strong> {env.check}</span></p> : null}
          {routesFor(env).length ? <button type="button" className="chip" onClick={() => setShow((v) => !v)}>{show ? <EyeOff size={14} /> : <Eye size={14} />}{show ? t.se.offPlant : t.se.onPlant}</button> : null}
          <span className="bp-tag kind-inference-tag">◐ {t.ideasToValidate}</span>
        </div>
      )}
    </section>
  );
}

/** A closer look at one section: what comes in, the machines, what goes out, and a picture of it. Opens from a tap, a double-click or the Open section button. */
export function SectionPanel({ zone, index, total, before, industry, isNew, onClose, onStep, onRoutes, names, steps, t }: { zone: Zone; index: number; total: number; before?: Zone; industry: string; isNew: boolean; onClose: () => void; onStep: (dir: 1 | -1) => void; onRoutes: (r?: RouteLine[]) => void; names: Record<string, string>; steps: { key: string; label: string; equipment: string[]; outputs: string[] }[]; t: Dict }) {
  const ctx = useStepCtx();
  const saved = ctx?.envs[envKey(ctx.language, zone.zone_id)];
  const waterNote = saved ? [saved.outlet, saved.treatment.slice(0, 3).join(", "), saved.reuse].filter(Boolean).join(". ") : "";
  return (
    <aside className="section-panel" aria-label={zone.label}>
      <header>
        <StepIcon icon={zone.icon} kind={zone.kind} size={38} />
        <div><span className="jc-kicker">{fill(t.ix.tourOf, { n: index + 1, total })}{isNew ? <em className="new-tag">{t.ix.newTag}</em> : null}</span><h3>{zone.label}</h3></div>
        <button type="button" className="icon-btn ghost" onClick={onClose} aria-label={t.ix.closeSection} title={t.ix.closeSection}><X size={18} /></button>
      </header>
      <div className="sp-body">
        <section>
          <h4>{t.ix.processLine}</h4>
          <div className="jc-flow sp-line">
            <span className="jc-in" title={t.ix.inLabel}>{before?.outputs.slice(0, 3).join(" · ") || "—"}</span><ArrowRight size={14} />
            <span className="jc-step">{zone.label}</span><ArrowRight size={14} />
            <span className="jc-out" title={t.ix.outLabel}>{zone.outputs.slice(0, 4).join(" · ") || "—"}</span>
          </div>
        </section>
        {zone.detail || zone.note ? <section><h4>{t.ix.whatHappens}</h4><p>{zone.detail || zone.note}</p></section> : null}
        {zone.equipment.length ? <section><h4>{t.ix.machinesTitle}</h4><ul className="sp-machines">{zone.equipment.map((m) => <li key={m}><Cog size={14} />{m}</li>)}</ul></section> : null}
        <StepIllustration industry={industry} zone={zone} t={t} />
        <EnvBlock key={zone.zone_id} zone={zone} names={names} steps={steps} onRoutes={onRoutes} t={t} />
        <StepVideo industry={industry} zone={zone} waterNote={waterNote} t={t} />
        <p className="muted small">{t.zoneLabel}: {zone.width_m.toFixed(1)} × {zone.depth_m.toFixed(1)} m · {zone.area_m2.toFixed(0)} m²</p>
      </div>
      <footer><button type="button" className="icon-btn ghost" onClick={() => onStep(-1)} disabled={index <= 0} aria-label="Previous"><ChevronLeft size={18} /></button><button type="button" className="icon-btn ghost" onClick={() => onStep(1)} disabled={index >= total - 1} aria-label="Next"><ChevronRight size={18} /></button></footer>
    </aside>
  );
}
