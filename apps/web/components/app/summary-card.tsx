"use client";
import { Download, FileText, Leaf, Loader2, Recycle, Route, Search, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { fill, type Dict } from "@/lib/i18n";
import { byImpact } from "@/lib/insights-logic";
import { groupByRole } from "@/lib/map-logic";
import { requestLines, steps, summaryFacts } from "@/lib/report-logic";
import type { Session } from "@/lib/sessions";
import { UploadCta } from "./upload-cta";

function Block({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return <div className="sum-block"><h4>{icon}{title}</h4>{children}</div>;
}
const Wait = () => <div className="sum-wait" aria-hidden="true"><span className="skel line" /><span className="skel line" style={{ width: "72%" }} /></div>;

/** The written summary shown in the chat under a new design, with the report download. It is built from the real data only, and each part fills in as its research arrives. */
export function SummaryCard({ session, t, researchPending, insightsPending, onDownload }: { session: Session; t: Dict; researchPending: boolean; insightsPending: boolean; onDownload: () => void }) {
  const d = session.design, imp = session.improvement, ins = session.insights, r = session.research;
  const asked = requestLines(session)[0];
  const list = d ? steps(d) : [];
  const line = d
    ? fill(t.rp.summaryDesign, { label: d.label, where: d.location ? fill(t.rp.inLoc, { loc: d.location }) : "", w: d.width_m, d: d.depth_m, n: list.length, first: list[0]?.label ?? "—", last: list[list.length - 1]?.label ?? "—" })
    : imp ? fill(t.rp.summaryExisting, { n: imp.opportunities.length }) : "";
  const zone = (id: string) => d?.zones.find((z) => z.zone_id === id)?.label ?? id;
  const top = (key: "power" | "water") => ins?.loads.length ? [...ins.loads].sort((a, b) => b[key] - a[key])[0] : undefined;
  const solar = d?.claims.find((c) => /solar/i.test(c.statement) && c.classification === "CALCULATION");
  const flows = ins?.byproduct_flows.filter((f) => f.products.length) ?? [];
  const groups = r ? groupByRole(r.places).filter((g) => g.role !== "site" && g.items.some((p) => p.role !== "site")) : [];
  const km = r?.flows.map((f) => f.distance_km).filter((n): n is number => typeof n === "number") ?? [];
  const constraints = r?.discoveries.filter((x) => x.kind === "constraint").slice(0, 2) ?? [];
  const facts = summaryFacts(session).filter((f) => ["plot", "built", "biggest", "wind", "solar"].includes(f.key));

  return (
    <section className="summary-card" aria-label={t.rp.summaryTitle}>
      <header><FileText size={17} /><h3>{t.rp.summaryTitle}</h3></header>
      {asked ? <p className="sum-asked">{t.rp.request}: <q>{asked}</q></p> : null}
      <p>{line}</p>
      <dl className="sum-facts">{facts.map((f) => <div key={f.key} className={f.key === "biggest" ? "wide" : undefined}><dt>{t.rp.facts[f.key]}</dt><dd>{f.value}</dd></div>)}</dl>

      {d && list.length ? (
        <Block icon={<Route size={14} />} title={t.rp.secProcess}>
          <ol className="sum-steps">{list.map((z) => <li key={z.zone_id}><b>{z.label}</b>{z.outputs.length ? <span>{z.outputs.slice(0, 2).join(" · ")}</span> : null}</li>)}</ol>
        </Block>
      ) : null}

      {imp && imp.attachments_used === 0 ? <UploadCta t={t} compact /> : null}

      {imp && imp.as_is_steps.length ? (
        <Block icon={<Route size={14} />} title={t.ix.stepsToday}>
          <ol className="sum-steps">{imp.as_is_steps.map((x, i) => <li key={`${x.label}-${i}`}><b>{x.label}</b>{x.note ? <span>{x.note}</span> : null}</li>)}</ol>
        </Block>
      ) : null}

      {imp ? (
        <Block icon={<Leaf size={14} />} title={t.rp.secOpportunities}>
          <ul className="sum-list">{imp.opportunities.slice(0, 4).map((o) => <li key={o.title}><b>{o.title}</b>{o.environmental_benefit ? <span>{o.environmental_benefit}</span> : null}</li>)}</ul>
        </Block>
      ) : null}

      {d ? (
        <Block icon={<Recycle size={14} />} title={t.rp.secByproducts}>
          {insightsPending && !ins ? <Wait /> : flows.length ? (
            <ul className="sum-list">{flows.slice(0, 4).map((f) => <li key={f.waste}><b>{f.waste}</b><span>→ {f.products.map((p) => p.name).join(", ")}{f.products[0].buyer ? ` (${f.products[0].buyer})` : ""}</span></li>)}</ul>
          ) : <p className="muted small">{t.ix.noFlows}</p>}
        </Block>
      ) : null}

      {d ? (
        <Block icon={<Zap size={14} />} title={t.rp.secPower}>
          {solar ? <p className="small">Σ {solar.statement}</p> : null}
          {insightsPending && !ins ? <Wait /> : ins ? (
            <ul className="sum-list">
              {top("power") ? <li><b>{t.rp.heavyPower}</b><span>{zone(top("power")!.stage_key)}</span></li> : null}
              {top("water") ? <li><b>{t.rp.heavyWater}</b><span>{zone(top("water")!.stage_key)}</span></li> : null}
              {byImpact(ins.resource_actions).slice(0, 2).map((a) => <li key={a.title}><b>{a.title}</b>{a.detail ? <span>{a.detail}</span> : null}</li>)}
            </ul>
          ) : null}
        </Block>
      ) : null}

      {d ? (
        <Block icon={<Leaf size={14} />} title={t.rp.secEnvironment}>
          {insightsPending && !ins ? <Wait /> : ins?.env_actions.length ? (
            <ol className="sum-steps">{byImpact(ins.env_actions).slice(0, 3).map((a) => <li key={a.title}><b>{a.title}</b>{a.first_step ? <span>{a.first_step}</span> : null}</li>)}</ol>
          ) : null}
        </Block>
      ) : null}

      <Block icon={<Search size={14} />} title={t.rp.secSourcing}>
        {researchPending && !r ? <Wait /> : r ? (
          <>
            {groups.length ? <ul className="sum-chips">{groups.map(({ role, items }) => <li key={role}>{t.roles[role]} · {items.filter((p) => p.role !== "site").length}</li>)}</ul> : null}
            {km.length ? <p className="small">{t.rp.farthest}: ~{Math.max(...km)} km</p> : null}
            {constraints.length ? <ul className="sum-list">{constraints.map((c) => <li key={c.title}><b>{t.constraintLabel}: {c.title}</b>{c.body ? <span>{c.body}</span> : null}</li>)}</ul> : null}
          </>
        ) : <p className="muted small">{t.mapIntro}</p>}
      </Block>

      <p className="muted small">{t.rp.summaryFoot}</p>
      {researchPending || insightsPending ? <p className="sum-pending small"><Loader2 size={13} className="spin" />{t.rp.pending}</p> : null}
      <button type="button" className="download-btn" onClick={onDownload} title={t.rp.downloadHint}><Download size={16} />{t.rp.download} · PDF</button>
    </section>
  );
}
