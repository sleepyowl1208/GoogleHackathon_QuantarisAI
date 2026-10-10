"use client";
import { Building2, IndianRupee, Loader2, Search, ShoppingCart, Sprout } from "lucide-react";
import { useEffect, useState } from "react";
import { PlaceAsk } from "./place-ask";
import { ClaimList } from "@/components/blueprint/claim-list";
import { formatRange, type BuildCosts } from "@/lib/costs-api";
import type { Dict } from "@/lib/i18n";

export type CostsState = { data?: BuildCosts; status?: "loading" | "error"; onRun: () => void; needsPlace?: boolean; onSetPlace?: (place: string) => void };

/** What the machines might cost, who sells them, where land can be had, and typical productivity. Prices are indicative web figures with links, never quotes. */
export function CostsPanel({ state, t }: { state: CostsState; t: Dict }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => { if (state.status !== "loading") return; const timer = setInterval(() => setPhase((n) => Math.min(n + 1, t.co.loading.length - 1)), 5000); return () => clearInterval(timer); }, [state.status, t.co.loading.length]);
  const r = state.data;
  if (!r && state.needsPlace && state.onSetPlace) return <PlaceAsk t={t} onSubmit={state.onSetPlace} />;
  if (!r) {
    if (state.status === "loading") return <div aria-busy="true" aria-label={t.loadingAria}><p className="map-loading" role="status"><Loader2 size={16} className="spin" />{t.co.loading[phase]}…</p><div className="skel-list">{Array.from({ length: 4 }, (_, i) => <span key={i} className="skel ix-skel" style={{ animationDelay: `${i * 120}ms` }} />)}</div></div>;
    return <div className="map-empty">{state.status === "error" ? <p className="bp-error">{t.co.error}</p> : <p className="muted">{t.co.intro}</p>}<button type="button" className="chip strong" onClick={state.onRun}><ShoppingCart size={15} />{state.status === "error" ? t.retry : t.co.run}</button></div>;
  }
  const link = (ids: string[]) => ids.map((id) => r.sources.find((s) => s.source_id === id)).filter((s): s is NonNullable<typeof s> => Boolean(s)).slice(0, 3);
  const total = formatRange(r.total_low_inr, r.total_high_inr);
  return (
    <div className="ix">
      <p className="ix-intro"><span className="powered"><ShoppingCart size={13} />{t.poweredBy}</span> {t.co.intro}</p>
      <section className="cost-total">
        <IndianRupee size={20} />
        <div><span className="live-label">{t.co.totalLabel}</span><strong>{total ?? t.co.noTotal}</strong><span className="muted small">{t.co.priced.replace("{n}", String(r.priced)).replace("{m}", String(r.requested))} {t.co.excludes}</span></div>
      </section>

      <h3 className="sub-title first"><ShoppingCart size={15} /> {t.co.machines}</h3>
      <div className="machine-list">
        {r.machines.map((m, i) => {
          const range = formatRange(m.price_low_inr, m.price_high_inr); const links = link(m.source_ids);
          return (
            <article key={`${m.name}-${i}`} className="machine-card" style={{ ["--i" as string]: i }}>
              <header><h4>{m.name}</h4>{m.step ? <span className="tag-soft km">{m.step}</span> : null}</header>
              <p className={`price ${range ? "" : "none"}`}>{range ?? t.co.noPrice}</p>
              {m.basis ? <p className="muted small">{m.basis}</p> : null}
              {m.suppliers.length ? <div><span className="group-label">{t.co.buyFrom}</span><ul className="suppliers">{m.suppliers.map((s) => <li key={s.name}><Building2 size={13} /><strong>{s.name}</strong>{s.place ? <span className="muted"> · {s.place}</span> : null}</li>)}</ul></div> : null}
              <div className="place-meta">{links.length ? links.map((s) => <a key={s.source_id} href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>) : <span className="unsourced">{t.unsourced}</span>}</div>
            </article>
          );
        })}
      </div>

      {r.land.length ? (
        <>
          <h3 className="sub-title"><Sprout size={15} /> {t.co.land}</h3>
          <div className="machine-list">{r.land.map((l, i) => { const links = link(l.source_ids); return (
            <article key={`${l.place}-${i}`} className="machine-card" style={{ ["--i" as string]: i }}>
              <header><h4>{l.place}</h4>{l.kind ? <span className="tag-soft">{l.kind}</span> : null}</header>
              {l.location ? <p className="muted small">{l.location}</p> : null}
              {l.price_note && !/not found/i.test(l.price_note) ? <p className="price">{l.price_note}</p> : <p className="price none">{t.co.noPrice}</p>}
              {l.how_to_get ? <p className="first-step"><span><strong>{t.co.howToGet}:</strong> {l.how_to_get}</span></p> : null}
              <div className="place-meta">{links.length ? links.map((s) => <a key={s.source_id} href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>) : <span className="unsourced">{t.unsourced}</span>}</div>
            </article>); })}</div>
        </>
      ) : null}

      {r.benchmarks.length ? (
        <>
          <h3 className="sub-title">{t.co.benchmarks}</h3>
          <table className="bench"><tbody>{r.benchmarks.map((b, i) => { const links = link(b.source_ids); return <tr key={`${b.metric}-${i}`}><th>{b.metric}</th><td><strong>{b.value}</strong>{b.applies_to ? <span className="muted small"> · {b.applies_to}</span> : null}</td><td className="small">{links.length ? <a href={links[0].url} target="_blank" rel="noopener noreferrer">{links[0].title}</a> : <span className="unsourced">{t.unsourced}</span>}</td></tr>; })}</tbody></table>
        </>
      ) : null}

      {r.search_queries.length ? <><h3 className="sub-title">{t.searchedFor}</h3><ul className="queries">{r.search_queries.map((q) => <li key={q}><Search size={13} />{q}</li>)}</ul></> : null}
      <h3 className="sub-title">{t.sourcesUsed} ({r.sources.length})</h3>
      <ul className="sources">{r.sources.map((s) => <li key={s.source_id}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a></li>)}</ul>
      <ClaimList claims={r.claims} labels={t.claimLabels} />
    </div>
  );
}
