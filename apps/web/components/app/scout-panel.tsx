"use client";
import { ExternalLink, Loader2, MapPinned } from "lucide-react";
import { useState } from "react";
import { ClaimList } from "@/components/blueprint/claim-list";
import { BlueprintError } from "@/lib/layout-api";
import { linksFor, sendScout, type Scout } from "@/lib/scout-api";
import { fill, type Dict } from "@/lib/i18n";
import { ScoutMap } from "./scout-map";

export function ScoutPanel({ t, language, defaultPlace, industry }: { t: Dict; language: "en" | "hi"; defaultPlace: string; industry: string }) {
  const s = t.sc;
  const [place, setPlace] = useState(defaultPlace);
  const [assets, setAssets] = useState("");
  const [result, setResult] = useState<Scout>();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string>();
  async function run() {
    if (place.trim().length < 2) return;
    setState("loading"); setMessage(undefined);
    try { setResult(await sendScout({ place: place.trim(), industry, assets: assets.trim(), language })); setState("idle"); }
    catch (e) { setMessage(e instanceof BlueprintError ? e.message : s.error); setState("error"); }
  }
  const row = (label: string, text: string) => (text ? <p><b>{label}:</b> {text}</p> : null);
  return (
    <section className="scout">
      <p className="ix-intro">{s.intro}</p>
      <label className="lever"><span>{s.place}</span><input className="ask-line" value={place} maxLength={120} placeholder={s.placePh} onChange={(e) => setPlace(e.target.value)} /></label>
      <label className="lever"><span>{s.assets}</span><input className="ask-line" value={assets} maxLength={300} placeholder={s.assetsPh} onChange={(e) => setAssets(e.target.value)} /></label>
      <button type="button" className="ops-act primary" disabled={state === "loading" || place.trim().length < 2} onClick={run}>{state === "loading" ? <><Loader2 size={14} className="spin" /> {s.working}</> : <><MapPinned size={14} /> {s.find}</>}</button>
      {state === "error" ? <p className="ix-intro" role="alert">{message}</p> : null}
      {result ? (
        <>
          <ScoutMap scout={result} label={fill(s.centre, { place: result.place })} />
          <ol className="scout-list">
            {result.areas.map((a) => (
              <li key={a.rank}>
                <header><span className="scout-rank">{a.rank}</span><strong>{a.name}</strong>{a.kind ? <span className="ops-pill">{a.kind}</span> : null}</header>
                <small>{[a.locality, typeof a.distance_km === "number" ? fill(s.away, { km: a.distance_km }) + (a.pin_level === "town" ? ` (${s.approx})` : "") : s.notMapped].filter(Boolean).join(" · ")}</small>
                {a.why ? <p>{a.why}</p> : null}
                {row(s.access, a.access)}{row(s.utilities, a.utilities)}{row(s.supply, a.supply)}{row(s.risk, a.risk)}
                <div className="pop-links">{linksFor(result, a).slice(0, 3).map((l) => <a key={l.source_id} href={l.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} /> {l.title}</a>)}{linksFor(result, a).length === 0 ? <em className="pop-warn">{s.unsourced}</em> : null}</div>
              </li>
            ))}
          </ol>
          <p className="ops-notes">{s.poweredBy}</p>
          <ClaimList claims={result.claims} labels={t.claimLabels} />
        </>
      ) : null}
    </section>
  );
}
