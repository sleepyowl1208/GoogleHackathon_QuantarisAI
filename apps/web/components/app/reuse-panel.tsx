"use client";
import { ArrowDown, ArrowRight, Droplets, Flame, Loader2, Recycle, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ClaimList } from "@/components/blueprint/claim-list";
import { BlueprintError, type LayoutResult } from "@/lib/layout-api";
import { cachedReuse, rememberReuse, reuseKey, sendReuse, type ReusePlan } from "@/lib/reuse-api";
import { stageRequestBody } from "@/lib/insights-logic";
import type { Dict } from "@/lib/i18n";

const ICON = { water: Droplets, heat: Flame, waste: Recycle } as const;

export function ReusePanel({ design, location, language, t, onPickStep }: { design: LayoutResult; location: string; language: "en" | "hi"; t: Dict; onPickStep: (id: string) => void }) {
  const r = t.ru;
  const body = useMemo(() => ({ industry: design.label.slice(0, 100), location: location.slice(0, 120), language, stages: stageRequestBody(design), wastes: design.waste_streams.map((w) => w.name.slice(0, 80)).slice(0, 8) }), [design, location, language]);
  const key = reuseKey(body);
  const [results, setResults] = useState<Record<string, ReusePlan | string>>({});
  const [attempt, setAttempt] = useState(0);
  const found = cachedReuse(key) ?? results[key];
  const plan = typeof found === "object" ? found : undefined;
  const message = typeof found === "string" ? found : undefined;
  const state = plan ? "idle" : message ? "error" : "loading";
  useEffect(() => {
    if (cachedReuse(key)) return;
    let live = true;
    sendReuse(body).then((p) => { rememberReuse(key, p); if (live) setResults((prev) => ({ ...prev, [key]: p })); }).catch((e) => { if (live) setResults((prev) => ({ ...prev, [key]: e instanceof BlueprintError ? e.message : r.error })); });
    return () => { live = false; };
  }, [key, body, attempt, r.error]);
  const retry = () => { setResults((prev) => { const { [key]: _gone, ...rest } = prev; void _gone; return rest; }); setAttempt((n) => n + 1); };
  const label = (k: string) => design.zones.find((z) => z.zone_id === k)?.label ?? k;

  return (
    <div className="reuse">
      <p className="ix-intro">{r.intro}</p>
      {state === "loading" ? <p className="ix-intro"><Loader2 size={14} className="spin" /> {r.loading}</p> : null}
      {state === "error" ? <p className="ix-intro" role="alert">{message} <button type="button" className="tag-btn" onClick={retry}>{r.retry}</button></p> : null}
      {plan ? (
        <>
          <p className="reuse-summary">{plan.summary}</p>
          <div className="loop-grid">
            {plan.loops.map((l) => {
              const Icon = ICON[l.kind];
              return (
                <article key={l.kind} className={`loop loop-${l.kind}`}>
                  <header><span className="loop-icon"><Icon size={20} /></span><div><small>{r.kinds[l.kind]}</small><h3>{l.headline}</h3></div><span className="ops-pill">{r.effort}: {r.level[l.effort]}</span></header>
                  <div className="loop-steps">
                    <div><b>{r.today}</b><p>{l.today}</p></div>
                    <span className="loop-arrow" aria-hidden><ArrowRight size={16} className="h" /><ArrowDown size={16} className="v" /></span>
                    <div className="fix"><b>{r.fix}</b><p>{l.fix}</p></div>
                    <span className="loop-arrow" aria-hidden><ArrowRight size={16} className="h" /><ArrowDown size={16} className="v" /></span>
                    <div className="result"><b>{r.result}</b><p>{l.result}</p></div>
                  </div>
                  {l.reuse_for ? <p className="loop-reuse"><Recycle size={14} /> {r.reusedFor}: <b>{l.reuse_for}</b></p> : null}
                  {l.applies_at.length ? <ul className="tags">{l.applies_at.map((k) => <li key={k}><button type="button" className="tag-btn" onClick={() => onPickStep(k)}>{label(k)}</button></li>)}</ul> : null}
                  {l.first_step ? <p className="first-step"><ArrowRight size={14} /><span><strong>{r.firstStep}:</strong> {l.first_step}</span></p> : null}
                  {l.ai_help ? <p className="loop-ai"><Sparkles size={14} /> {l.ai_help}</p> : null}
                </article>
              );
            })}
          </div>
          <p className="ops-notes">{r.numbers}</p>
          <ClaimList claims={plan.claims} labels={t.claimLabels} />
        </>
      ) : null}
    </div>
  );
}
