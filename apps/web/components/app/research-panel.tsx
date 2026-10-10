"use client";
import { Compass, Search } from "lucide-react";
import { ClaimList } from "@/components/blueprint/claim-list";
import { fill, type Dict } from "@/lib/i18n";
import { distanceOf, FAR_KM, groupByRole, nearestFirst, roleStyle, spreadPins } from "@/lib/map-logic";
import type { SiteConditions, SiteResearch } from "@/lib/research-api";
import { LiveConditions } from "./live-conditions";
import { SiteMap } from "./site-map";
import { MapSkeleton } from "./skeletons";
import { PlaceAsk } from "./place-ask";

export function ResearchPanel({ research, status, site, t, dark, onRun, needsPlace, onSetPlace }: { research?: SiteResearch; status?: "loading" | "error"; site?: SiteConditions; t: Dict; dark: boolean; onRun: () => void; needsPlace?: boolean; onSetPlace?: (place: string) => void }) {
  if (needsPlace && !research && onSetPlace) return <PlaceAsk t={t} onSubmit={onSetPlace} />;
  if (status === "loading") return <><MapSkeleton t={t} /></>;
  if (!research) {
    return (
      <div className="map-empty">
        {site ? <LiveConditions site={site} t={t} /> : null}
        {status === "error" ? <p className="bp-error">{t.mapError}</p> : <p className="muted">{t.mapIntro}</p>}
        <button type="button" className="chip strong" onClick={onRun}><Search size={15} />{status === "error" ? t.retry : t.mapStart}</button>
      </div>
    );
  }
  const spread = spreadPins(research.places).some((p) => p.spread);
  const placeById = new Map(research.places.map((p) => [p.place_id, p]));
  const flowFor = (id: string) => research.flows.find((f) => f.from_id === id || f.to_id === id);
  return (
    <div className="research">
      <p className="map-intro">{t.mapIntro} <span className="powered"><Compass size={13} />{t.poweredBy}</span></p>
      <SiteMap research={research} t={t} dark={dark} />
      <ul className="legend">{groupByRole(research.places).map(({ role }) => <li key={role}><span className="legend-pin" style={{ background: roleStyle[role].color, borderColor: roleStyle[role].ring === "#ffffff" ? "var(--line-strong)" : roleStyle[role].ring }} />{t.roles[role]}</li>)}</ul>
      {spread ? <p className="muted small">{t.spreadNote}</p> : null}
      {research.summary ? <p className="research-summary">{research.summary}</p> : null}
      {site ? <LiveConditions site={site} t={t} /> : null}

      <h3 className="sub-title">{t.whereFrom}</h3>
      {research.places.length === 0 ? <p className="empty">{t.noPlaces}</p> : groupByRole(research.places).map(({ role, items }) => (
        <div key={role} className="place-group">
          <h4><span className="legend-pin" style={{ background: roleStyle[role].color, borderColor: roleStyle[role].ring === "#ffffff" ? "var(--line-strong)" : roleStyle[role].ring }} />{t.roles[role]}</h4>
          <ul className="places">
            {nearestFirst(research, items.filter((p) => p.role !== "site")).map((p) => {
              const flow = flowFor(p.place_id);
              const links = p.source_ids.map((id) => research.sources.find((s) => s.source_id === id)).filter((s): s is NonNullable<typeof s> => Boolean(s));
              return (
                <li key={p.place_id}>
                  <div className="place-head"><strong>{p.name}</strong><span className="muted">{[p.locality, p.state].filter(Boolean).join(", ")}</span></div>
                  {p.material ? <span className="tag-soft">{p.material}</span> : null}
                  {flow?.distance_km ? <span className={`tag-soft km ${flow.distance_km > FAR_KM ? "far" : ""}`}>{fill(t.straightLine, { km: flow.distance_km })}{flow.distance_km > FAR_KM ? ` · ${t.farTag}` : ""}</span> : null}
                  {p.note ? <p>{p.note}</p> : null}
                  {p.address ? <p className="muted small">{p.address}</p> : null}
                  <div className="place-meta">
                    <span className={`quality ${p.location_quality}`}>{p.location_quality === "verified" ? t.verifiedAddress : p.location_quality === "place_level" ? t.townLevel : "—"}</span>
                    {links.length ? links.slice(0, 3).map((s) => <a key={s.source_id} href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>) : <span className="unsourced">{t.unsourced}</span>}
                  </div>
                </li>
              );
            })}
            {items.every((p) => p.role === "site") ? <li className="muted">{placeById.get("site")?.name}</li> : null}
          </ul>
        </div>
      ))}

      {research.discoveries.length ? (
        <>
          <h3 className="sub-title">{t.worthKnowing}</h3>
          <ul className="discoveries">{research.discoveries.map((d) => (
            <li key={d.title} className={d.kind}><span className="disc-kind">{d.kind === "constraint" ? t.constraintLabel : t.opportunityLabel}</span><strong>{d.title}</strong>{d.body ? <p>{d.body}</p> : null}
              {d.source_ids.map((id) => research.sources.find((s) => s.source_id === id)).filter(Boolean).slice(0, 2).map((s) => <a key={s!.source_id} href={s!.url} target="_blank" rel="noopener noreferrer">{s!.title}</a>)}</li>
          ))}</ul>
        </>
      ) : null}

      <h3 className="sub-title">{t.searchedFor}</h3>
      <ul className="queries">{research.search_queries.map((q) => <li key={q}><Search size={13} />{q}</li>)}</ul>
      <h3 className="sub-title">{t.sourcesUsed} ({research.sources.length})</h3>
      <ul className="sources">{research.sources.map((s) => <li key={s.source_id}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a></li>)}</ul>
      <ClaimList claims={research.claims} labels={t.claimLabels} />
    </div>
  );
}
