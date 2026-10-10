"use client";
import { Globe2, Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { ClaimList } from "@/components/blueprint/claim-list";
import type { Dict } from "@/lib/i18n";
import type { BestPractices } from "@/lib/practices-api";

export type PracticesState = { data?: BestPractices; status?: "loading" | "error"; onRun: () => void };

/** What works elsewhere in the world for this industry, found with Google Search. Each idea links to the page it came from, or says it has no source. */
export function PracticesPanel({ state, t }: { state: PracticesState; t: Dict }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => { if (state.status !== "loading") return; const timer = setInterval(() => setPhase((n) => Math.min(n + 1, t.pr.loading.length - 1)), 9000); return () => clearInterval(timer); }, [state.status, t.pr.loading.length]);
  const r = state.data;
  if (!r) {
    if (state.status === "loading") return <div aria-busy="true" aria-label={t.loadingAria}><p className="map-loading" role="status"><Loader2 size={16} className="spin" />{t.pr.loading[phase]}…</p><div className="skel-list">{Array.from({ length: 4 }, (_, i) => <span key={i} className="skel ix-skel" style={{ animationDelay: `${i * 120}ms` }} />)}</div></div>;
    return <div className="map-empty">{state.status === "error" ? <p className="bp-error">{t.pr.error}</p> : <p className="muted">{t.pr.intro}</p>}<button type="button" className="chip strong" onClick={state.onRun}><Globe2 size={15} />{state.status === "error" ? t.retry : t.pr.run}</button></div>;
  }
  const link = (ids: string[]) => ids.map((id) => r.sources.find((s) => s.source_id === id)).filter((s): s is NonNullable<typeof s> => Boolean(s)).slice(0, 3);
  return (
    <div className="ix">
      <p className="ix-intro"><span className="powered"><Globe2 size={13} />{t.poweredBy}</span> {t.pr.intro}</p>
      {r.summary ? <p className="research-summary">{r.summary}</p> : null}
      <div className="practice-grid">
        {r.practices.map((p, i) => {
          const links = link(p.source_ids);
          return (
            <article key={`${p.title}-${i}`} className="practice" style={{ ["--i" as string]: i }}>
              <header><h3>{p.title}</h3>{p.countries ? <span className="tag-soft where"><Globe2 size={12} />{p.countries}</span> : null}</header>
              {p.what ? <p>{p.what}</p> : null}
              {p.why_it_works ? <p className="mitigation">{p.why_it_works}</p> : null}
              {p.example ? <p className="small"><strong>{t.pr.example}:</strong> {p.example}</p> : null}
              {p.for_you ? <p className="first-step"><span><strong>{t.pr.forYou}:</strong> {p.for_you}</span></p> : null}
              <div className="place-meta">{links.length ? links.map((s) => <a key={s.source_id} href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>) : <span className="unsourced">{t.unsourced}</span>}</div>
            </article>
          );
        })}
      </div>
      {r.standards.length ? (
        <section>
          <h3 className="sub-title">{t.pr.standards}</h3>
          <ul className="discoveries">{r.standards.map((s) => <li key={s.name} className="constraint"><strong>{s.name}</strong>{s.note ? <p>{s.note}</p> : null}{link(s.source_ids).map((x) => <a key={x.source_id} href={x.url} target="_blank" rel="noopener noreferrer">{x.title}</a>)}</li>)}</ul>
        </section>
      ) : null}
      {r.search_queries.length ? <><h3 className="sub-title">{t.searchedFor}</h3><ul className="queries">{r.search_queries.map((q) => <li key={q}><Search size={13} />{q}</li>)}</ul></> : null}
      <h3 className="sub-title">{t.sourcesUsed} ({r.sources.length})</h3>
      <ul className="sources">{r.sources.map((s) => <li key={s.source_id}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a></li>)}</ul>
      <ClaimList claims={r.claims} labels={t.claimLabels} />
    </div>
  );
}
