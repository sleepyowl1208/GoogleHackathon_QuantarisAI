"use client";
import { ArrowRight, FileUp, Loader2, ScanEye, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BlueprintError } from "@/lib/layout-api";
import { fileToAttachment, sendBalance, sendBrief, sendInspect, type Balance, type Brief, type Inspection, type Levers } from "@/lib/balance-api";
import { latest, parseCsv, type DayRow } from "@/lib/balance-logic";
import type { OpsBody } from "@/lib/ops-api";
import type { Dict } from "@/lib/i18n";
import { ClaimList } from "../blueprint/claim-list";
import { Line } from "./ops-chart";

export type OwnData = { name: string; rows: DayRow[] };
const SAMPLES = [["coconut-husk-coir", "sampleCoir"], ["dairy-plant", "sampleDairy"], ["switchgear-factory", "sampleSwitch"], ["steel-rerolling-mill", "sampleSteel"], ["egg-packing", "sampleEgg"], ["pickle-factory", "samplePickle"], ["textile-dyeing", "sampleTextile"]] as const;
const fmt = (n: number, d = 0) => n.toLocaleString(undefined, { maximumFractionDigits: d });
const fill = (text: string, vars: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));

export function DataView({ t, own, onOwn, levers, onLevers, price, onPrice, balance, busy, failed }: { t: Dict; own?: OwnData; onOwn: (d?: OwnData) => void; levers: Levers; onLevers: (l: Levers) => void; price: string; onPrice: (p: string) => void; balance?: Balance; busy: boolean; failed: boolean }) {
  const d = t.da;
  const [note, setNote] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  function load(name: string, text: string) {
    const p = parseCsv(text);
    if (p.missing.length) return setNote(fill(d.missing, { cols: p.missing.join(", ") }));
    if (p.rows.length < 14) return setNote(d.tooFew);
    setNote([fill(d.read, { n: p.rows.length }), p.skipped ? fill(d.skipped, { n: p.skipped }) : ""].filter(Boolean).join(" · "));
    onOwn({ name, rows: latest(p.rows) });
  }
  const sample = (name: string) => fetch(`/samples/sample-${name}.csv`).then((r) => r.text()).then((x) => load(name, x)).catch(() => setNote(d.error));
  const slider = (key: keyof Levers, label: string, max: number) => (
    <label className="lever"><span>{label}: <b>{levers[key]}%</b></span><input type="range" min={0} max={max} step={5} value={levers[key]} onChange={(e) => onLevers({ ...levers, [key]: Number(e.target.value) })} /></label>
  );
  const w = balance?.water, g = balance?.waste;
  return (
    <section>
      <p className="ix-intro">{d.dataIntro}</p>
      <div className="data-load">
        <span className="group-label">{d.samples}</span>
        <div className="ops-views">{SAMPLES.map(([id, key]) => <button key={id} type="button" className={own?.name === id ? "on" : ""} onClick={() => sample(id)}>{d[key]}</button>)}</div>
        <small>{d.sampleNote}</small>
        <button type="button" className="ops-act" onClick={() => input.current?.click()}><FileUp size={14} /> {d.upload}</button>
        <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) f.text().then((x) => load(f.name, x)); e.target.value = ""; }} />
        <small>{d.uploadHint}</small>
        {note ? <p className="data-note" role="status">{note}</p> : null}
      </div>

      {own ? (
        <>
          <div className="levers">
            <h4>{d.levers}</h4>
            {slider("reuse_pct", d.reuse, 90)}{slider("leak_pct", d.leak, 30)}{slider("waste_recovery_pct", d.recover, 95)}
            <label className="lever"><span>{d.price}</span><input type="number" min={0} value={price} onChange={(e) => onPrice(e.target.value)} /></label>
          </div>
          {busy && !balance ? <p className="ix-intro"><Loader2 size={14} className="spin" /> {d.working}</p> : null}
          {failed && !balance ? <p className="ix-intro">{d.error}</p> : null}
          {balance ? (
            <>
              <div className="res-grid">
                {balance.resources.map((r) => (
                  <article key={r.name}>
                    <h4>{d.resources[r.name]}</h4>
                    <p className="big">{fmt(r.per_unit_avg, 4)} <small>{r.unit}</small></p>
                    <p>{d.best}: {fmt(r.per_unit_best_quartile, 4)}</p>
                    <p className="fact"><span className="bp-tag kind-calculation-tag">Σ</span>{fill(d.gap, { v: fmt(r.gap_saving_per_year), u: r.unit.split("/")[0], p: r.gap_saving_pct })}</p>
                    <p>{fill(d.trend, { p: `${r.per_unit_trend_pct > 0 ? "+" : ""}${r.per_unit_trend_pct}` })}</p>
                    <p>{r.anomaly_days.length ? fill(d.unusual, { d: r.anomaly_days.slice(0, 4).join(", ") }) : d.noUnusual}</p>
                    <Line lines={[{ values: r.daily_per_unit, color: r.name === "water" ? "var(--green, #2e7d32)" : "var(--saffron)" }]} height={60} /><small>{d.perUnit} · {r.unit}</small>
                  </article>
                ))}
              </div>
              {w ? (
                <article className="wb">
                  <h4>{d.waterTitle}</h4>
                  <div className="wb-cols">
                    <div><span>{d.intake}</span><div className="bar"><i style={{ width: "100%" }} /></div><b>{fmt(w.intake_m3_year)} m³</b></div>
                    <div><span>{d.effluent} {w.effluent_measured ? d.effluentMeasured : d.effluentAssumed}</span><div className="bar"><i className="brown" style={{ width: `${Math.min(100, (w.effluent_m3_year / w.intake_m3_year) * 100)}%` }} /></div><b>{fmt(w.effluent_m3_year)} m³</b></div>
                    <div><span>{d.after}: {d.freshAfter}</span><div className="bar"><i className="good" style={{ width: `${Math.min(100, (w.fresh_after_m3_year / w.intake_m3_year) * 100)}%` }} /></div><b>{fmt(w.fresh_after_m3_year)} m³</b></div>
                    <div><span>{d.after}: {d.dischargeAfter}</span><div className="bar"><i className="good brown" style={{ width: `${Math.min(100, (w.discharge_after_m3_year / w.intake_m3_year) * 100)}%` }} /></div><b>{fmt(w.discharge_after_m3_year)} m³</b></div>
                  </div>
                  <p className="saving">{fill(d.saved, { p: w.saved_pct, v: fmt(w.intake_m3_year - w.fresh_after_m3_year) })} {w.saved_inr_year ? fill(d.savedInr, { v: fmt(w.saved_inr_year) }) : ""}</p>
                </article>
              ) : null}
              {g ? <article className="wb"><h4>{d.wasteTitle}</h4><p>{fmt(g.waste_kg_year)} kg · {d.recovered}: <b>{fmt(g.recovered_kg_year)} kg</b> · {d.landfill}: <b>{fmt(g.landfill_after_kg_year)} kg</b></p></article> : null}
              {balance.notes.map((n) => <p key={n} className="ops-notes">{n}</p>)}
              <ClaimList claims={balance.claims} labels={t.claimLabels} />
            </>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

export function CopilotView({ t, language, ops, balanceBody }: { t: Dict; language: "en" | "hi"; ops: OpsBody; balanceBody?: Parameters<typeof sendBalance>[0] }) {
  const d = t.da;
  const [question, setQuestion] = useState("");
  const [brief, setBrief] = useState<Brief>();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string>();
  async function ask() {
    setState("loading"); setMessage(undefined);
    try { setBrief(await sendBrief({ ops: { ...ops, actions: ops.actions }, balance: balanceBody, question: question.trim(), language })); setState("idle"); }
    catch (e) { setMessage(e instanceof BlueprintError ? e.message : d.error); setState("error"); }
  }
  return (
    <section>
      <h3><Sparkles size={16} />{d.askTitle}</h3>
      <p className="ix-intro">{d.askIntro}</p>
      <textarea className="ask-box" rows={2} maxLength={300} value={question} placeholder={d.askPlaceholder} aria-label={d.askTitle} onChange={(e) => setQuestion(e.target.value)} />
      <button type="button" className="ops-act primary" disabled={state === "loading"} onClick={ask}>{state === "loading" ? <><Loader2 size={14} className="spin" /> {d.asking}</> : <><Sparkles size={14} /> {d.askBtn}</>}</button>
      {state === "error" ? <p className="ix-intro" role="alert">{message}</p> : null}
      {brief ? (
        <div className="brief">
          <p className="headline">{brief.headline}</p>
          {brief.answer ? <p className="answer">{brief.answer}</p> : null}
          <h4>{d.insights}</h4>
          <ul className="ops-list compact">{brief.insights.map((i) => <li key={i.title}><div><b>{i.title}</b>{i.why ? <p>{i.why}</p> : null}{i.evidence ? <small>{d.evidenceLabel}: {i.evidence}</small> : null}</div></li>)}</ul>
          <h4>{d.actions}</h4>
          <ul className="ops-list">{brief.actions.map((a) => <li key={a.title}><header><ArrowRight size={14} /><strong>{a.title}</strong><span className={`ops-pill ${a.effect === "high" ? "ok" : ""}`}>{d.effect}: {d.level[a.effect]}</span></header>{a.how ? <p>{a.how}</p> : null}{a.based_on ? <small>{d.evidenceLabel}: {a.based_on}</small> : null}</li>)}</ul>
          <ClaimList claims={brief.claims} labels={t.claimLabels} />
        </div>
      ) : null}
    </section>
  );
}

export function InspectBox({ t, language, industry }: { t: Dict; language: "en" | "hi"; industry: string }) {
  const d = t.da;
  const [product, setProduct] = useState("");
  const [result, setResult] = useState<Inspection>();
  const [preview, setPreview] = useState<string>();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  async function run(file: File) {
    if (product.trim().length < 2) return setMessage(d.product);
    setState("loading"); setMessage(undefined); setResult(undefined); setPreview(URL.createObjectURL(file));
    try { setResult(await sendInspect({ product: product.trim(), industry, image: await fileToAttachment(file), language })); setState("idle"); }
    catch (e) { setMessage(e instanceof BlueprintError ? e.message : d.inspectError); setState("error"); }
  }
  const verdictText = result ? (result.verdict === "pass" ? d.verdict.pass_ : result.verdict === "fail" ? d.verdict.fail : d.verdict.unclear) : "";
  return (
    <div className="inspect">
      <h3><ScanEye size={16} />{d.inspectTitle}</h3>
      <p className="ix-intro">{d.inspectIntro}</p>
      <input className="ask-line" value={product} maxLength={100} placeholder={d.productPh} aria-label={d.product} onChange={(e) => setProduct(e.target.value)} />
      <button type="button" className="ops-act" disabled={state === "loading"} onClick={() => input.current?.click()}>{state === "loading" ? <><Loader2 size={14} className="spin" /> {d.inspecting}</> : <><FileUp size={14} /> {d.choose}</>}</button>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void run(f); e.target.value = ""; }} />
      {message ? <p className="ix-intro" role="alert">{message}</p> : null}
      {result ? (
        <div className={`inspect-result ${result.verdict}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview ? <img src={preview} alt="" /> : null}
          <div>
            <p className="verdict"><b>{verdictText}</b></p>
            <p>{result.summary}</p>
            <ul>{result.defects.map((x, i) => <li key={i}><b>{x.type}</b> · {d.severity[x.severity]} · {d.confidence} {Math.round(x.confidence * 100)}%{x.where ? ` · ${x.where}` : ""}</li>)}</ul>
            {result.next_step ? <p><b>{d.nextStep}:</b> {result.next_step}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
