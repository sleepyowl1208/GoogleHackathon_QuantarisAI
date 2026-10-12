"use client";
import { Activity, MapPinned, ArrowRight, Box, ChevronDown, ImageIcon, Loader2, Gauge, Globe2, IndianRupee, Leaf, ListOrdered, Map as MapIcon, Recycle, ShieldCheck, Zap, Lightbulb, MessageCircleQuestion, TriangleAlert, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ClaimList } from "@/components/blueprint/claim-list";
import { StepIcon } from "@/components/blueprint/step-icon";
import type { Improvement } from "@/lib/chat-api";
import type { Dict } from "@/lib/i18n";
import type { LayoutResult, Waste, Zone } from "@/lib/layout-api";
import type { Session } from "@/lib/sessions";
import type { SiteConditions, SiteResearch } from "@/lib/research-api";
import { OpsPanel } from "./ops-panel";
import { ScoutPanel } from "./scout-panel";
import { ReusePanel } from "./reuse-panel";
import { EnvironmentPlan, ByproductWorkflow, OperationsIntelligence, PowerWater, type InsightsState } from "./insights-panels";
import { LayoutViewer } from "./layout-viewer";
import { PracticesPanel, type PracticesState } from "./practices-panel";
import { CostsPanel, type CostsState } from "./costs-panel";
import { sendEdit } from "@/lib/edit-api";
import { StepContext, type StepCtx } from "./step-context";
import type { StepEnv } from "@/lib/step-env-api";
import type { Language } from "@/lib/chat-api";
import { illustrate, StepIllustration } from "./step-illustration";
import { imageKey, imagesVersion, loadImages, peekImage, subscribeImages } from "@/lib/image-store";
import { SplitHandle, useSplit } from "./split";
import { UploadCta } from "./upload-cta";
import { ResearchPanel } from "./research-panel";

type Common = { t: Dict; dark: boolean; webgl: boolean; language: Language; selectedStep?: string; onSelectStep: (id?: string) => void };
export type LayoutTarget = "design" | "asis" | "proposed";
type Editing = { costs: CostsState; onLayoutEdit: (which: LayoutTarget, layout: LayoutResult) => void };
type EnvSave = { onSaveStepEnv: (key: string, env: StepEnv) => void };

/** Changing the plant by words: asks the planner, applies the new layout, and remembers which sections are new so they can be marked for a while. */
function useLayoutEditing({ layout, which, language, site, onLayoutEdit, onSelectStep }: { layout?: LayoutResult; which: LayoutTarget; language: Language; site?: SiteConditions; onLayoutEdit: Editing["onLayoutEdit"]; onSelectStep: (id?: string) => void }) {
  const [fresh, setFresh] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const edit = async (instruction: string) => {
    if (!layout) throw new Error("no layout");
    const res = await sendEdit(layout, instruction, language, { solar: site?.avg_solar_kwh_m2_day, windFrom: site?.prevailing_wind_from_deg });
    onLayoutEdit(which, res.design);
    setFresh(res.added_zone_ids); clearTimeout(timer.current); timer.current = setTimeout(() => setFresh([]), 40000);
    if (res.added_zone_ids[0]) onSelectStep(res.added_zone_ids[0]);
    return { reply: res.reply, changes: res.changes };
  };
  return { fresh, edit, change: (l: LayoutResult) => onLayoutEdit(which, l) };
}
type Research = { needsPlace?: boolean; onSetPlace?: (place: string) => void; site?: SiteConditions; research?: SiteResearch; researchStatus?: "loading" | "error"; onRunResearch: () => void; busy: boolean };

export function Workspace({ session, researchStatus, onRunResearch, busy, insights, practices, costs, onLayoutEdit, onSaveStepEnv, onSetPlace, ...rest }: Common & { onSetPlace: (place: string) => void; session: Session; researchStatus?: "loading" | "error"; onRunResearch: () => void; busy: boolean; insights: InsightsState; practices: PracticesState } & Editing & EnvSave) {
  const shared: Research = { needsPlace: !(session.location ?? session.design?.location ?? "").trim(), onSetPlace, site: session.site, research: session.research, researchStatus, onRunResearch, busy };
  const layout = session.design ?? session.improvement?.as_is_layout ?? undefined;
  const waste = (session.design?.waste_streams ?? session.improvement?.waste_streams ?? []).map((w) => w.name);
  const heavy = session.insights?.loads.filter((l) => l.water >= 3).map((l) => l.stage_key) ?? [];
  const waterSteps = heavy.length ? heavy : (layout?.zones.filter((z) => z.kind === "wash").map((z) => z.zone_id) ?? []);   // until the analysis says which steps use the most water, wash steps stand in
  const ctx: StepCtx = { language: rest.language, industry: session.industry ?? layout?.label ?? "factory", location: session.location ?? layout?.location ?? "", wastes: waste.slice(0, 8), waterSteps, envs: session.stepEnvs ?? {}, saveEnv: onSaveStepEnv };
  const inner = (() => {
  if (session.design) return <DesignWorkspace key={session.id} design={session.design} insights={insights} practices={practices} costs={costs} onLayoutEdit={onLayoutEdit} {...shared} {...rest} />;
  if (session.improvement) return <ImprovementWorkspace key={session.id} data={session.improvement} practices={practices} costs={costs} onLayoutEdit={onLayoutEdit} {...shared} {...rest} />;
  return null;
  })();
  return <StepContext.Provider value={ctx}>{inner}</StepContext.Provider>;
}

function WasteCards({ items, t }: { items: Waste[]; t: Dict }) {
  if (!items.length) return <p className="empty">{t.noWaste}</p>;
  return (
    <div className="waste-grid">
      {items.map((w) => (
        <article key={w.name} className="waste-card">
          <strong>{w.name}</strong>
          {w.description ? <p className="muted">{w.description}</p> : null}
          {w.by_product_ideas.length ? <ul>{w.by_product_ideas.map((idea) => <li key={idea}>{idea}</li>)}</ul> : null}
          <span className="bp-tag kind-inference-tag">◐ {t.ideasToValidate}</span>
        </article>
      ))}
    </div>
  );
}

type TabDef<T extends string> = { id: T; label: string; icon?: LucideIcon; group?: string };

/** Tabs are grouped (a divider separates groups), carry an icon, and wrap onto a second line rather than being cut off. */
function Tabs<T extends string>({ tabs, value, onChange }: { tabs: TabDef<T>[]; value: T; onChange: (id: T) => void }) {
  const groups: TabDef<T>[][] = [];
  for (const tab of tabs) { const last = groups[groups.length - 1]; if (last && last[0].group === tab.group) last.push(tab); else groups.push([tab]); }
  return (
    <div className="tabs" role="tablist">
      {groups.map((g, i) => (
        <div key={i} className="tab-group">
          {g.map((tab) => { const Icon = tab.icon; return <button key={tab.id} type="button" role="tab" aria-selected={value === tab.id} className={value === tab.id ? "on" : ""} onClick={() => onChange(tab.id)}>{Icon ? <Icon size={15} /> : null}<span>{tab.label}</span></button>; })}
        </div>
      ))}
    </div>
  );
}

type DesignTab = "steps" | "map" | "practices" | "costs" | "environment" | "byproducts" | "power" | "operations" | "aiops" | "scout" | "reuse" | "assumptions";

function StepsList({ steps, selectedStep, onSelectStep, onHover, newIds, t, industry, onOpenSection }: { onOpenSection?: (id: string) => void; industry: string; steps: Zone[]; selectedStep?: string; onSelectStep: (id?: string) => void; onHover: (id?: string) => void; newIds?: string[]; t: Dict }) {
  const [batch, setBatch] = useState<{ done: number; total: number }>();
  useEffect(() => { void loadImages(steps.map((z) => imageKey(industry, z.label, z.equipment))); }, [steps, industry]);
  useSyncExternalStore(subscribeImages, imagesVersion, () => 0);
  if (!steps.length) return <p className="empty">{t.noSteps}</p>;
  const totalArea = steps.reduce((sum, z) => sum + z.area_m2, 0) || 1;
  const missing = steps.filter((z) => !peekImage(imageKey(industry, z.label, z.equipment)));
  const all = async () => {
    const queue = [...missing]; setBatch({ done: 0, total: queue.length });
    let done = 0;
    const worker = async () => { for (let z = queue.shift(); z; z = queue.shift()) { try { await illustrate(industry, z); } catch { /* one failed picture does not stop the rest */ } done += 1; setBatch({ done, total: missing.length }); } };
    await Promise.all([worker(), worker()]);
    setBatch(undefined);
  };
  return (<>
    {missing.length > 1 ? <button type="button" className="chip strong illustrate-all" onClick={() => void all()} disabled={Boolean(batch)}>{batch ? <Loader2 size={14} className="spin" /> : <ImageIcon size={14} />}{batch ? `${t.ix.illustrating} ${batch.done}/${batch.total}` : t.ix.illustrateAll}</button> : null}
    <ol className="steps">
      {steps.map((z, index) => {
        const open = selectedStep === z.zone_id;
        return (
          <li key={z.zone_id} id={`step-${z.zone_id}`} className={`${open ? "open" : ""} ${newIds?.includes(z.zone_id) ? "is-new" : ""}`} style={{ ["--i" as string]: index }}>
            <button type="button" className="step-row" aria-expanded={open} onClick={() => onSelectStep(open ? undefined : z.zone_id)} onMouseEnter={() => onHover(z.zone_id)} onMouseLeave={() => onHover(undefined)}>
              <span className="step-num">{z.step}</span>
              <StepIcon icon={z.icon} kind={z.kind} size={34} />
              <span className="step-main"><span className="step-title">{z.label}{newIds?.includes(z.zone_id) ? <em className="new-tag">{t.ix.newTag}</em> : null}</span>{z.outputs.length ? <span className="step-sub"><ArrowRight size={12} />{z.outputs.slice(0, 3).join(" · ")}</span> : null}<span className="step-share" aria-hidden="true"><i style={{ width: `${Math.max(4, Math.round((z.area_m2 / totalArea) * 100))}%` }} /></span></span>
              <span className="step-area">{z.area_m2.toFixed(0)} m²</span>
              <ChevronDown size={18} className="chev" />
            </button>
            <div className="collapse" aria-hidden={!open}>
              <div className="collapse-inner">
                <div className="step-body">
                  {z.detail || z.note ? <p>{z.detail || z.note}</p> : null}
                  {z.outputs.length ? <div className="step-group"><span className="group-label">{t.outputsLabel}</span><ul className="tags out">{z.outputs.map((o) => <li key={o}>{o}</li>)}</ul></div> : null}
                  {z.equipment.length ? <div className="step-group"><span className="group-label">{t.equipmentLabel}</span><ul className="tags">{z.equipment.map((o) => <li key={o}>{o}</li>)}</ul></div> : null}
                  <p className="muted small">{t.zoneLabel}: {z.width_m.toFixed(1)} × {z.depth_m.toFixed(1)} m · {z.area_m2.toFixed(0)} m²</p>
                  {open ? <StepIllustration industry={industry} zone={z} t={t} /> : null}
                  {open && onOpenSection ? <button type="button" className="chip strong open-section" onClick={() => onOpenSection(z.zone_id)}><Box size={14} />{t.ix.openSection}</button> : null}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  </>);
}

const stepsOf = (layout: LayoutResult) => layout.zones.filter((z) => z.step).sort((a, b) => (a.step ?? 0) - (b.step ?? 0));

function DesignWorkspace({ design, t, dark, webgl, selectedStep, onSelectStep, needsPlace, onSetPlace, site, research, researchStatus, onRunResearch, busy, insights, practices, costs, onLayoutEdit, language }: Common & Research & { design: LayoutResult; insights: InsightsState; practices: PracticesState } & Editing) {
  const [tab, setTab] = useState<DesignTab>("steps");
  const [hoverId, setHoverId] = useState<string>();
  const [focus, setFocus] = useState(false);
  const [detailId, setDetailId] = useState<string>();
  const boxRef = useRef<HTMLDivElement>(null);
  const sp = useSplit(boxRef);
  const editing = useLayoutEditing({ layout: design, which: "design", language, site, onLayoutEdit, onSelectStep });
  const steps = useMemo(() => stepsOf(design), [design]);
  useEffect(() => { if (selectedStep && tab === "steps") document.getElementById(`step-${selectedStep}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [selectedStep, tab]);
  const pick = (id: string) => { setTab("steps"); onSelectStep(selectedStep === id ? undefined : id); };
  const jump = (id: string) => { setTab("steps"); onSelectStep(id); };

  return (
    <div ref={boxRef} style={sp.style} className={`qa-workspace ${busy ? "is-busy" : ""} ${focus ? "focus" : ""} ${sp.wide ? "wide" : ""}`}>
      <LayoutViewer design={design} t={t} dark={dark} webgl={webgl} site={site} selectedStep={selectedStep} onSelectStep={onSelectStep} hoverId={hoverId} onHover={setHoverId} focus={focus} onFocus={setFocus} onPick={pick} onJump={jump} wide={sp.wide} onWide={sp.setWide} detailId={detailId} onDetail={setDetailId} lang={language} onEdit={editing.edit} onLayoutChange={editing.change} highlightIds={editing.fresh} />
      <SplitHandle pct={sp.pct} handle={sp.handle} label={t.ix.resize} />

      <section className="qa-panel qa-card" aria-label="Details">
        <Tabs<DesignTab> value={tab} onChange={(id) => { sp.setWide(false); setTab(id); }} tabs={[
          { id: "steps", label: t.tabSteps, icon: ListOrdered, group: "plant" },
          { id: "map", label: t.tabMap, icon: MapIcon, group: "place" }, { id: "scout", label: t.sc.tab, icon: MapPinned, group: "place" }, { id: "practices", label: t.tabPractices, icon: Globe2, group: "place" },
          { id: "reuse", label: t.ru.tab, icon: Recycle, group: "impact" }, { id: "environment", label: t.tabEnvironment, icon: Leaf, group: "impact" }, { id: "byproducts", label: t.tabByproducts, icon: Recycle, group: "impact" }, { id: "power", label: t.tabPower, icon: Zap, group: "impact" },
          { id: "costs", label: t.tabCosts, icon: IndianRupee, group: "money" },
          { id: "operations", label: t.tabOperations, icon: Gauge, group: "run" }, { id: "aiops", label: t.ao.tabAi, icon: Activity, group: "run" },
          { id: "assumptions", label: t.tabAssumptions, icon: ShieldCheck, group: "proof" }]} />
        <div className="panel-body">
          <div className="panel-fade" role="tabpanel" key={tab}>
            {tab === "steps" ? <StepsList industry={design.label} steps={steps} selectedStep={selectedStep} onSelectStep={onSelectStep} onHover={setHoverId} onOpenSection={setDetailId} t={t} /> : null}
            {tab === "map" ? <ResearchPanel research={research} status={researchStatus} site={site} t={t} dark={dark} onRun={onRunResearch} needsPlace={needsPlace} onSetPlace={onSetPlace} /> : null}
            {tab === "practices" ? <PracticesPanel state={practices} t={t} /> : null}
            {tab === "costs" ? <CostsPanel state={costs} t={t} /> : null}
            {tab === "environment" ? <EnvironmentPlan state={insights} design={design} site={site} t={t} /> : null}
            {tab === "byproducts" ? <ByproductWorkflow state={insights} design={design} t={t} onPickStep={jump} /> : null}
            {tab === "power" ? <PowerWater state={insights} design={design} site={site} t={t} onPickStep={jump} /> : null}
            {tab === "operations" ? <OperationsIntelligence state={insights} design={design} research={research} t={t} onPickStep={jump} /> : null}
            {tab === "reuse" ? <ReusePanel design={design} location={site?.location ?? design.location ?? ""} language={language} t={t} onPickStep={jump} /> : null}
            {tab === "scout" ? <ScoutPanel t={t} language={language} defaultPlace={site?.location ?? design.location ?? ""} industry={design.label} /> : null}
            {tab === "aiops" ? <OpsPanel design={design} research={research} location={site?.location ?? design.location ?? ""} t={t} language={language} onPickStep={jump} /> : null}
            {tab === "assumptions" ? <ClaimList claims={design.claims} labels={t.claimLabels} /> : null}
          </div>
        </div>
      </section>
    </div>
  );
}

type ImproveTab = "steps" | "practices" | "costs" | "opportunities" | "map" | "problems" | "byproducts" | "questions" | "assumptions";

function ImprovementWorkspace({ data, t, dark, webgl, selectedStep, onSelectStep, needsPlace, onSetPlace, site, research, researchStatus, onRunResearch, busy, practices, costs, onLayoutEdit, language }: Research & Common & { data: Improvement; practices: PracticesState } & Editing) {
  const [tab, setTab] = useState<ImproveTab>("opportunities");
  const [which, setWhich] = useState<"asis" | "proposed">("asis");
  const [hoverId, setHoverId] = useState<string>();
  const [focus, setFocus] = useState(false);
  const [detailId, setDetailId] = useState<string>();
  const boxRef = useRef<HTMLDivElement>(null);
  const sp = useSplit(boxRef);
  const asIs = data.as_is_layout ?? undefined;
  const proposed = data.proposed_layout ?? undefined;
  const layout = which === "proposed" && proposed ? proposed : asIs;
  const editing = useLayoutEditing({ layout, which: which === "proposed" && proposed ? "proposed" : "asis", language, site, onLayoutEdit, onSelectStep });
  const newIds = useMemo(() => (which === "proposed" && proposed && asIs ? proposed.zones.filter((z) => !asIs.zones.some((a) => a.zone_id === z.zone_id)).map((z) => z.zone_id) : []), [which, proposed, asIs]);
  const steps = useMemo(() => (layout ? stepsOf(layout) : []), [layout]);
  const pick = (id: string) => { setTab("steps"); onSelectStep(selectedStep === id ? undefined : id); };
  const jump = (id: string) => { setTab("steps"); onSelectStep(id); };
  const show = (title: string) => {
    const link = data.proposal_map.find((l) => l.title === title);
    if (!link || !proposed) return;
    setWhich("proposed"); onSelectStep(link.zone_ids[0]);
  };
  const toggle = (
    <div className="seg" role="group" aria-label={t.asIsTitle}>
      <button type="button" aria-pressed={which === "asis"} className={which === "asis" ? "on" : ""} onClick={() => setWhich("asis")}>{t.asIsTitle}</button>
      <button type="button" aria-pressed={which === "proposed"} className={which === "proposed" ? "on" : ""} onClick={() => setWhich("proposed")} disabled={!proposed}>{t.ix.proposed}</button>
    </div>
  );

  return (
    <div ref={boxRef} style={sp.style} className={`qa-workspace ${busy ? "is-busy" : ""} ${focus ? "focus" : ""} ${sp.wide ? "wide" : ""} ${layout ? "" : "no-split"}`}>
      {layout ? (
        <LayoutViewer design={layout} t={t} dark={dark} webgl={webgl} site={site} selectedStep={selectedStep} onSelectStep={onSelectStep} hoverId={hoverId} onHover={setHoverId} focus={focus} onFocus={setFocus} onPick={pick} onJump={jump} highlightIds={[...newIds, ...editing.fresh]} barExtra={toggle} note={!proposed ? t.ix.noProposed : t.ix.layoutNote} wide={sp.wide} onWide={sp.setWide} detailId={detailId} onDetail={setDetailId} lang={language} onEdit={editing.edit} onLayoutChange={editing.change} />
      ) : (
        <section className="asis qa-card" aria-label={t.asIsTitle}>
          <h2 className="panel-title">{t.asIsTitle}</h2>
          <p className="asis-business">{data.business}</p>
          {data.as_is_steps.length ? (
            <ol className="asis-flow">{data.as_is_steps.map((s, i) => <li key={`${s.label}-${i}`}><span className="asis-step"><span className="step-num">{i + 1}</span><span><strong>{s.label}</strong>{s.note ? <em>{s.note}</em> : null}</span></span></li>)}</ol>
          ) : null}
          <p className="muted small">{t.asIsNote}{data.attachments_used ? ` · ${t.uploadedFiles}: ${data.attachments_used}` : ""}</p>
        </section>
      )}
      {layout ? <SplitHandle pct={sp.pct} handle={sp.handle} label={t.ix.resize} /> : null}

      <section className="qa-panel qa-card" aria-label="Details">
        <Tabs<ImproveTab> value={tab} onChange={(id) => { sp.setWide(false); setTab(id); }} tabs={[
          ...(layout ? [{ id: "steps" as const, label: t.tabSteps, icon: ListOrdered, group: "plant" }] : []),
          { id: "opportunities", label: t.tabOpportunities, icon: Lightbulb, group: "plant" },
          { id: "map", label: t.tabMap, icon: MapIcon, group: "place" }, { id: "practices", label: t.tabPractices, icon: Globe2, group: "place" },
          { id: "costs", label: t.tabCosts, icon: IndianRupee, group: "money" },
          { id: "problems", label: t.tabProblems, icon: TriangleAlert, group: "impact" }, { id: "byproducts", label: t.tabByproducts, icon: Recycle, group: "impact" },
          { id: "questions", label: t.tabQuestions, icon: MessageCircleQuestion, group: "ask" },
          { id: "assumptions", label: t.tabAssumptions, icon: ShieldCheck, group: "proof" }]} />
        <div className="panel-body"><div className="panel-fade" role="tabpanel" key={tab}>
          {data.attachments_used === 0 && (tab === "steps" || tab === "opportunities") ? <UploadCta t={t} /> : null}
          {tab === "steps" && layout ? <><p className="asis-business small-business">{data.business}</p><StepsList industry={layout.label} steps={steps} selectedStep={selectedStep} onSelectStep={onSelectStep} onHover={setHoverId} newIds={newIds} onOpenSection={setDetailId} t={t} /></> : null}
          {tab === "opportunities" ? (
            <div className="opps">
              {data.opportunities.map((o) => {
                const linked = proposed && data.proposal_map.some((l) => l.title === o.title);
                return (
                  <article key={o.title} className="opp">
                    <header><h3>{o.title}</h3><span className={`effort ${o.effort}`}>{t.effort[o.effort]}</span></header>
                    {o.why_it_fits ? <p>{o.why_it_fits}</p> : null}
                    {o.needs.length ? <div className="step-group"><span className="group-label">{t.needsLabel}</span><ul className="tags">{o.needs.map((x) => <li key={x}>{x}</li>)}</ul></div> : null}
                    {o.outputs.length ? <div className="step-group"><span className="group-label">{t.producesLabel}</span><ul className="tags out">{o.outputs.map((x) => <li key={x}>{x}</li>)}</ul></div> : null}
                    {o.environmental_benefit ? <p className="mitigation"><Leaf size={14} /> {o.environmental_benefit}</p> : null}
                    {o.risks ? <p className="muted small"><strong>{t.risksLabel}:</strong> {o.risks}</p> : null}
                    {o.verify ? <p className="muted small"><strong>{t.verifyLabel}:</strong> {o.verify}</p> : null}
                    {linked ? <button type="button" className="chip strong show-layout" onClick={() => show(o.title)}><Box size={14} />{t.ix.showInLayout}</button> : null}
                  </article>
                );
              })}
            </div>
          ) : null}
          {tab === "map" ? <ResearchPanel research={research} status={researchStatus} site={site} t={t} dark={dark} onRun={onRunResearch} needsPlace={needsPlace} onSetPlace={onSetPlace} /> : null}
          {tab === "practices" ? <PracticesPanel state={practices} t={t} /> : null}
          {tab === "costs" ? <CostsPanel state={costs} t={t} /> : null}
          {tab === "problems" ? <ul className="env-list">{data.hotspots.map((h) => <li key={h.area}><span className="env-icon warn"><Leaf size={18} /></span><div><strong>{h.area}</strong><p>{h.description}</p>{h.quick_fix ? <p className="mitigation">{h.quick_fix}</p> : null}</div></li>)}</ul> : null}
          {tab === "byproducts" ? <WasteCards items={data.waste_streams} t={t} /> : null}
          {tab === "questions" ? <ul className="plain-list">{data.questions.map((q) => <li key={q}>{q}</li>)}</ul> : null}
          {tab === "assumptions" ? <ClaimList claims={data.claims} labels={t.claimLabels} /> : null}
        </div></div>
      </section>
    </div>
  );
}
