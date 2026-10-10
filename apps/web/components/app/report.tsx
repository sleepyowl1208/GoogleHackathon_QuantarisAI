/* eslint-disable @next/next/no-img-element -- the report only shows small data: URL pictures made in the browser */
import { PlanView } from "@/components/blueprint/plan-view";
import { claimStyle, type Claim } from "@/lib/layout-api";
import { fill, type Dict } from "@/lib/i18n";
import { byImpact, dataStatus } from "@/lib/insights-logic";
import { builtAreaM2, requestLines, steps, summaryFacts } from "@/lib/report-logic";
import type { Session } from "@/lib/sessions";
import { groupByRole } from "@/lib/map-logic";
import { formatRange } from "@/lib/costs-api";
import { imageKey, imagesVersion, peekImage, subscribeImages } from "@/lib/image-store";
import { useSyncExternalStore } from "react";

const noop = () => {};
const dots = (n: number) => "●".repeat(n) + "○".repeat(Math.max(0, 5 - n));

/** Everything about the claim kinds in one place so the report labels evidence exactly as the app does. */
function Claims({ claims, t }: { claims: Claim[]; t: Dict }) {
  return <ul className="rp-claims">{claims.map((c) => <li key={c.claim_id}><b>{claimStyle[c.classification].glyph} {t.claimLabels[c.classification] ?? c.classification}</b> {c.statement}{c.reason ? <i> {c.reason}</i> : null}{c.methodology ? <i> {c.methodology}</i> : null}</li>)}</ul>;
}

function Sourcing({ session, t }: { session: Session; t: Dict }) {
  const r = session.research;
  if (!r) return <p className="rp-none">{t.rp.notGenerated}</p>;
  return (
    <>
      {r.summary ? <p>{r.summary}</p> : null}
      {groupByRole(r.places).map(({ role, items }) => {
        const rows = items.filter((p) => p.role !== "site");
        if (!rows.length) return null;
        return (
          <div key={role} className="rp-block">
            <h4>{t.roles[role]}</h4>
            <ul>{rows.map((p) => {
              const km = r.flows.find((f) => f.from_id === p.place_id || f.to_id === p.place_id)?.distance_km;
              const refs = p.source_ids.map((id) => r.sources.findIndex((s) => s.source_id === id) + 1).filter((n) => n > 0);
              return <li key={p.place_id}><b>{p.name}</b>{[p.locality, p.state].filter(Boolean).length ? ` — ${[p.locality, p.state].filter(Boolean).join(", ")}` : ""}{p.material ? ` · ${p.material}` : ""}{km ? ` · ~${km} km` : ""}{p.note ? `. ${p.note}` : ""}{refs.length ? <sup> [{refs.join(", ")}]</sup> : <em> ({t.unsourced})</em>}</li>;
            })}</ul>
          </div>
        );
      })}
      {r.discoveries.length ? <div className="rp-block"><h4>{t.worthKnowing}</h4><ul>{r.discoveries.map((d) => <li key={d.title}><b>{d.kind === "constraint" ? t.constraintLabel : t.opportunityLabel}: {d.title}.</b> {d.body}</li>)}</ul></div> : null}
      {r.search_queries.length ? <div className="rp-block"><h4>{t.rp.searches}</h4><p>{r.search_queries.join(" · ")}</p></div> : null}
      {r.sources.length ? <div className="rp-block"><h4>{t.rp.sources}</h4><ol className="rp-sources">{r.sources.map((s) => <li key={s.source_id}>{s.title} <span>{s.url}</span></li>)}</ol></div> : null}
    </>
  );
}

function SiteTable({ session, t }: { session: Session; t: Dict }) {
  const s = session.site;
  if (!s) return null;
  const rows: [string, string][] = [];
  if (s.temperature_c != null) rows.push([t.liveTemp, `${s.temperature_c} °C`]);
  if (s.prevailing_wind_label) rows.push([t.rp.facts.wind, `${s.prevailing_wind_label}${s.avg_wind_kmh_30d != null ? ` · ${s.avg_wind_kmh_30d} km/h` : ""}`]);
  if (s.aqi_us != null) rows.push([t.liveAir, `${s.aqi_us}${s.aqi_label ? ` (${s.aqi_label})` : ""}`]);
  if (s.avg_solar_kwh_m2_day != null) rows.push([t.liveSolar, `${s.avg_solar_kwh_m2_day} ${t.liveSolarUnit}`]);
  return <><table className="rp-table"><tbody>{rows.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody></table><p className="rp-note">{s.source} · {new Date(s.retrieved_at).toLocaleString()}</p></>;
}

/** The printable report. Hidden on screen and shown only when printing or saving as PDF, always light so it prints well. */
export function ReportDocument({ session, t, date }: { session: Session; t: Dict; date: Date }) {
  useSyncExternalStore(subscribeImages, imagesVersion, () => 0);
  const d = session.design, imp = session.improvement, ins = session.insights;
  const asked = requestLines(session);
  const facts = summaryFacts(session);
  const stepList = d ? steps(d) : [];
  const claims: Claim[] = [...(d?.claims ?? imp?.claims ?? []), ...(session.research?.claims ?? []), ...(ins?.claims ?? [])];
  const zoneName = (id?: string | null) => (id ? d?.zones.find((z) => z.zone_id === id) : undefined);
  const when = date.toLocaleDateString(t.greetAnon === "Hello" ? "en-IN" : "hi-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <article className="qa-report" data-theme="light" aria-hidden="true">
      <header className="rp-head">
        <div className="rp-brand"><span className="rp-mark">Q</span><span>QuantarisAI</span></div>
        <div className="rp-meta">{t.rp.headerTitle}<br />{t.rp.generatedOn} {when}</div>
        <div className="rp-flag" />
      </header>
      <h1>{session.title || (d?.label ?? imp?.business.slice(0, 60) ?? "")}</h1>
      {(d?.location ?? session.location) && !(session.title || "").includes((d?.location ?? session.location) as string) ? <p className="rp-sub">{d?.location ?? session.location}</p> : null}

      <section>
        <h2>{t.rp.request}</h2>
        <ul className="rp-asked">{asked.map((a, i) => <li key={i}>“{a}”</li>)}</ul>
      </section>

      <section>
        <h2>{t.rp.summaryTitle}</h2>
        {d ? <p>{fill(t.rp.summaryDesign, { label: d.label, where: d.location ? fill(t.rp.inLoc, { loc: d.location }) : "", w: d.width_m, d: d.depth_m, n: stepList.length, first: stepList[0]?.label ?? "—", last: stepList[stepList.length - 1]?.label ?? "—" })}</p> : null}
        {imp ? <><p>{imp.business}</p><p>{fill(t.rp.summaryExisting, { n: imp.opportunities.length })}</p></> : null}
        {facts.length ? <table className="rp-table"><tbody>{facts.map((f) => <tr key={f.key}><th>{t.rp.facts[f.key]}</th><td>{f.value}</td></tr>)}</tbody></table> : null}
        <p className="rp-note">{t.rp.summaryFoot}</p>
      </section>

      {d ? (
        <>
          <section>
            <h2>{t.rp.secLayout}</h2>
            <div className="rp-plan"><PlanView layout={d} onActive={noop} /></div>
            <p className="rp-note">{t.plot} {d.width_m} × {d.depth_m} m · {builtAreaM2(d)} m². {t.rp.planNote}</p>
          </section>

          <section>
            <h2>{t.rp.secProcess}</h2>
            <table className="rp-table steps">
              <thead><tr><th>{t.rp.colStep}</th><th>{t.rp.colWhat}</th><th>{t.rp.colEquipment}</th><th>{t.rp.colOutputs}</th><th>{t.rp.colArea}</th></tr></thead>
              <tbody>{stepList.map((z) => <tr key={z.zone_id}><td><b>{z.step}. {z.label}</b></td><td>{z.detail || z.note}</td><td>{z.equipment.join(", ")}</td><td>{z.outputs.join(", ")}</td><td>{z.area_m2.toFixed(0)} m²<br />{z.width_m.toFixed(0)} × {z.depth_m.toFixed(0)} m</td></tr>)}</tbody>
            </table>
          </section>

          {stepList.some((z) => peekImage(imageKey(d.label, z.label, z.equipment))) ? (
            <section>
              <h2>{t.rp.secIllustrations}</h2>
              <div className="rp-figs">{stepList.map((z) => { const src = peekImage(imageKey(d.label, z.label, z.equipment)); return src ? <figure key={z.zone_id} className="rp-fig"><img src={src} alt={z.label} /><figcaption>{z.step}. {z.label}</figcaption></figure> : null; })}</div>
              <p className="rp-note">{t.ix.illustrationNote}</p>
            </section>
          ) : null}

          {Object.entries(session.stepEnvs ?? {}).filter(([k]) => k.startsWith(t.greetAnon === "Hello" ? "en:" : "hi:")).length ? (
            <section>
              <h2>{t.rp.secWaste}</h2>
              {Object.entries(session.stepEnvs ?? {}).filter(([k]) => k.startsWith(t.greetAnon === "Hello" ? "en:" : "hi:")).map(([k, e]) => (
                <div key={k} className="rp-card">
                  <h4>{zoneName(e.step_key)?.label ?? e.step_key}</h4>
                  {!e.uses_water ? <p>{t.se.noWater}</p> : null}
                  {e.water_in ? <p><b>{t.se.waterIn}:</b> {e.water_in}</p> : null}
                  {e.wastewater ? <p><b>{t.se.wastewater}:</b> {e.wastewater}</p> : null}
                  {e.outlet ? <p><b>{t.se.outlet}:</b> {e.outlet}</p> : null}
                  {e.route.length ? <p className="rp-chain"><b>{t.se.route}:</b> {e.route.map((r, i) => <span key={r}>{i + 1}. {zoneName(r)?.label ?? t.se.zones[r] ?? r}</span>)}</p> : null}
                  {e.treatment.length ? <p><b>{t.se.treatment}:</b> {e.treatment.join(" → ")}</p> : null}
                  {e.reuse ? <p><b>{t.se.reuse}:</b> {e.reuse}</p> : null}
                  {e.discharge ? <p><b>{t.se.discharge}:</b> {e.discharge}</p> : null}
                  {e.solid_waste ? <p><b>{t.se.solid}:</b> {e.solid_waste}</p> : null}
                  {e.safeguards.length ? <p><b>{t.se.safeguards}:</b> {e.safeguards.join("; ")}</p> : null}
                  {e.check ? <p className="rp-note">{t.se.check}: {e.check}</p> : null}
                </div>
              ))}
            </section>
          ) : null}

          <section>
            <h2>{t.rp.secByproducts}</h2>
            {ins?.byproduct_flows.length ? ins.byproduct_flows.map((f) => (
              <div key={f.waste} className="rp-card">
                <h4>{f.waste}{zoneName(f.source_stage) ? <span> · {t.ix.stage}: {zoneName(f.source_stage)!.label}</span> : null}</h4>
                <p className="rp-chain">{f.treatment.map((s, i) => <span key={i}>{i + 1}. {s}</span>)}<b>→ {f.products.map((p) => `${p.name}${p.buyer ? ` (${p.buyer})` : ""} · ${t.ix.value[p.value]}`).join("; ") || "—"}</b></p>
                {f.benefit ? <p>{f.benefit}</p> : null}{f.verify ? <p className="rp-note">{t.verifyLabel}: {f.verify}</p> : null}
              </div>
            )) : <>{d.waste_streams.length ? <ul>{d.waste_streams.map((w) => <li key={w.name}><b>{w.name}.</b> {w.description}{w.by_product_ideas.length ? ` ${w.by_product_ideas.join("; ")}` : ""}</li>)}</ul> : <p className="rp-none">{t.rp.notGenerated}</p>}</>}
          </section>

          <section>
            <h2>{t.rp.secPower}</h2>
            {d.claims.filter((c) => /solar/i.test(c.statement) && c.classification === "CALCULATION").map((c) => <p key={c.claim_id}><b>Σ</b> {c.statement}</p>)}
            {ins ? (
              <>
                <table className="rp-table"><thead><tr><th>{t.rp.colStage}</th><th>{t.ix.power}</th><th>{t.ix.water}</th><th /></tr></thead>
                  <tbody>{ins.loads.map((l) => <tr key={l.stage_key}><td>{zoneName(l.stage_key)?.label ?? l.stage_key}</td><td className="rp-dots">{dots(l.power)}</td><td className="rp-dots">{dots(l.water)}</td><td>{l.note}</td></tr>)}</tbody></table>
                <p className="rp-note">{t.ix.loadIntro}</p>
                {ins.water_train.length ? <p className="rp-chain"><b>{t.ix.trainTitle}:</b> {ins.water_train.map((w, i) => <span key={w.name}>{i + 1}. {w.name}</span>)}</p> : null}
                {ins.resource_actions.length ? <ul>{byImpact(ins.resource_actions).map((a) => <li key={a.title}><b>{a.title}.</b> {a.detail} <em>({t.ix.impact}: {t.effort[a.effect]}, {t.ix.effortWord}: {t.effort[a.effort]})</em></li>)}</ul> : null}
              </>
            ) : <p className="rp-none">{t.rp.notGenerated}</p>}
            {d.utilities.length ? <ul>{d.utilities.map((u) => <li key={u}>{u}</li>)}</ul> : null}
          </section>

          <section>
            <h2>{t.rp.secEnvironment}</h2>
            {ins?.env_actions.length ? <ol>{byImpact(ins.env_actions).map((a) => <li key={a.title}><b>{a.title}</b>{a.aspect ? ` (${a.aspect})` : ""} <em>{t.ix.impact}: {t.effort[a.effect]}, {t.ix.effortWord}: {t.effort[a.effort]}</em>{a.first_step ? <><br />{t.ix.firstStep}: {a.first_step}</> : null}{a.verify ? <><br /><span className="rp-note">{t.verifyLabel}: {a.verify}</span></> : null}</li>)}</ol> : <p className="rp-none">{t.rp.notGenerated}</p>}
            {d.environment.length ? <ul>{d.environment.map((e) => <li key={e.aspect}><b>{e.aspect}.</b> {e.impact}{e.mitigation ? ` ${e.mitigation}` : ""}</li>)}</ul> : null}
          </section>

          <section>
            <h2>{t.rp.secOperations}</h2>
            {ins?.operations.length ? (
              <table className="rp-table"><thead><tr><th>{t.rp.colCapability}</th><th>{t.rp.colWhat}</th><th>{t.rp.colStatus}</th><th>{t.rp.colData}</th></tr></thead>
                <tbody>{ins.operations.map((o) => { const st = dataStatus(o.area, Boolean(session.research)); return <tr key={o.area}><td><b>{t.ix.areas[o.area]}</b></td><td>{o.what}{o.first_step ? <><br /><span className="rp-note">{t.ix.firstStep}: {o.first_step}</span></> : null}</td><td>{st === "live" ? t.ix.statusLive : st === "design" ? t.ix.statusDesign : t.ix.statusNeeds}</td><td>{o.data_needed.join(", ")}</td></tr>; })}</tbody></table>
            ) : <p className="rp-none">{t.rp.notGenerated}</p>}
          </section>
        </>
      ) : null}

      {imp ? (
        <>
          {imp.as_is_layout ? (
            <section>
              <h2>{t.rp.secLayout}</h2>
              <h4>{t.asIsTitle}</h4>
              <div className="rp-plan"><PlanView layout={imp.as_is_layout} onActive={noop} /></div>
              {imp.proposed_layout ? (
                <>
                  <h4>{t.ix.proposed}</h4>
                  <div className="rp-plan"><PlanView layout={imp.proposed_layout} highlightIds={imp.proposed_layout.zones.filter((z) => !imp.as_is_layout!.zones.some((a) => a.zone_id === z.zone_id)).map((z) => z.zone_id)} onActive={noop} /></div>
                  <p className="rp-note">{t.ix.newTag}: {imp.proposed_layout.zones.filter((z) => z.step && !imp.as_is_layout!.zones.some((a) => a.zone_id === z.zone_id)).map((z) => z.label).join(", ")}. {t.rp.planNote}</p>
                </>
              ) : <p className="rp-note">{t.ix.noProposed}</p>}
              <p className="rp-note">{t.plot} {imp.as_is_layout.width_m} × {imp.as_is_layout.depth_m} m · {t.ix.layoutNote}</p>
            </section>
          ) : null}
          <section><h2>{t.rp.secAsIs}</h2><p>{imp.business}</p>{imp.as_is_steps.length ? <ol>{imp.as_is_steps.map((s, i) => <li key={i}><b>{s.label}</b>{s.note ? ` — ${s.note}` : ""}</li>)}</ol> : null}</section>
          <section><h2>{t.rp.secOpportunities}</h2>{imp.opportunities.map((o) => <div key={o.title} className="rp-card"><h4>{o.title} <span>· {t.effort[o.effort]}</span></h4><p>{o.why_it_fits}</p>{o.needs.length ? <p><b>{t.needsLabel}:</b> {o.needs.join(", ")}</p> : null}{o.outputs.length ? <p><b>{t.producesLabel}:</b> {o.outputs.join(", ")}</p> : null}{o.environmental_benefit ? <p>{o.environmental_benefit}</p> : null}{o.risks ? <p className="rp-note">{t.risksLabel}: {o.risks}</p> : null}{o.verify ? <p className="rp-note">{t.verifyLabel}: {o.verify}</p> : null}</div>)}</section>
          {imp.hotspots.length ? <section><h2>{t.rp.secProblems}</h2><ul>{imp.hotspots.map((h) => <li key={h.area}><b>{h.area}.</b> {h.description}{h.quick_fix ? ` ${h.quick_fix}` : ""}</li>)}</ul></section> : null}
          {imp.waste_streams.length ? <section><h2>{t.tabByproducts}</h2><ul>{imp.waste_streams.map((w) => <li key={w.name}><b>{w.name}.</b> {w.description} {w.by_product_ideas.join("; ")}</li>)}</ul></section> : null}
          {imp.questions.length ? <section><h2>{t.rp.secQuestions}</h2><ul>{imp.questions.map((q) => <li key={q}>{q}</li>)}</ul></section> : null}
        </>
      ) : null}

      {session.site ? <section><h2>{t.rp.secSite}</h2><SiteTable session={session} t={t} /></section> : null}
      <section><h2>{t.rp.secSourcing}</h2><Sourcing session={session} t={t} /></section>
      {session.costs ? (
        <section>
          <h2>{t.rp.secCosts}</h2>
          <p><b>{t.co.totalLabel}: {formatRange(session.costs.total_low_inr, session.costs.total_high_inr) ?? t.co.noTotal}.</b> {t.co.priced.replace("{n}", String(session.costs.priced)).replace("{m}", String(session.costs.requested))} {t.co.excludes}</p>
          <table className="rp-table"><thead><tr><th>{t.co.machines}</th><th>{t.co.totalLabel.split(",")[0]}</th><th>{t.co.buyFrom}</th></tr></thead>
            <tbody>{session.costs.machines.map((m) => <tr key={m.name}><td><b>{m.name}</b>{m.step ? <><br /><span className="rp-note">{m.step}</span></> : null}{m.basis ? <><br /><span className="rp-note">{m.basis}</span></> : null}</td><td>{formatRange(m.price_low_inr, m.price_high_inr) ?? t.co.noPrice}</td><td>{m.suppliers.map((x) => `${x.name}${x.place ? `, ${x.place}` : ""}`).join("; ") || "—"}</td></tr>)}</tbody></table>
          {session.costs.land.length ? <><h4>{t.co.land}</h4><ul>{session.costs.land.map((l) => <li key={l.place}><b>{l.place}</b>{l.location ? ` (${l.location})` : ""}{l.price_note && !/not found/i.test(l.price_note) ? ` · ${l.price_note}` : ""}{l.how_to_get ? `. ${l.how_to_get}` : ""}</li>)}</ul></> : null}
          {session.costs.benchmarks.length ? <><h4>{t.co.benchmarks}</h4><ul>{session.costs.benchmarks.map((b) => <li key={b.metric + b.value}><b>{b.metric}:</b> {b.value}{b.applies_to ? ` (${b.applies_to})` : ""}</li>)}</ul></> : null}
          {session.costs.sources.length ? <div className="rp-block"><h4>{t.rp.sources}</h4><ol className="rp-sources">{session.costs.sources.map((x) => <li key={x.source_id}>{x.title} <span>{x.url}</span></li>)}</ol></div> : null}
        </section>
      ) : null}
      {session.practices ? (
        <section>
          <h2>{t.rp.secPractices}</h2>
          {session.practices.summary ? <p>{session.practices.summary}</p> : null}
          {session.practices.practices.map((p) => { const refs = p.source_ids.map((id) => session.practices!.sources.findIndex((x) => x.source_id === id) + 1).filter((n) => n > 0); return <div key={p.title} className="rp-card"><h4>{p.title}{p.countries ? <span> · {p.countries}</span> : null}</h4><p>{p.what}</p>{p.why_it_works ? <p>{p.why_it_works}</p> : null}{p.example ? <p className="rp-note">{t.pr.example}: {p.example}</p> : null}{p.for_you ? <p><b>{t.pr.forYou}:</b> {p.for_you}</p> : null}<p className="rp-note">{refs.length ? `[${refs.join(", ")}]` : t.unsourced}</p></div>; })}
          {session.practices.standards.length ? <><h4>{t.pr.standards}</h4><ul>{session.practices.standards.map((x) => <li key={x.name}><b>{x.name}.</b> {x.note}</li>)}</ul></> : null}
          {session.practices.sources.length ? <div className="rp-block"><h4>{t.rp.sources}</h4><ol className="rp-sources">{session.practices.sources.map((x) => <li key={x.source_id}>{x.title} <span>{x.url}</span></li>)}</ol></div> : null}
        </section>
      ) : null}
      <section><h2>{t.rp.secEvidence}</h2><Claims claims={[...claims, ...(session.practices?.claims ?? []), ...(session.costs?.claims ?? []), ...(Object.values(session.stepEnvs ?? {})[0]?.claims ?? [])]} t={t} /></section>
      <footer className="rp-foot">{t.rp.disclaimer}</footer>
    </article>
  );
}
