"use client";
import { ArrowRight, ChevronLeft, ChevronRight, Hammer, Hand, MessagesSquare, SkipForward, Maximize2, Minimize2, PanelBottomClose, PanelBottomOpen, Play, RotateCcw, Square, Wind } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Factory3D } from "@/components/blueprint/factory-3d";
import { GestureBus } from "@/lib/gesture-bus";
import { GestureControl } from "@/components/blueprint/gesture-control";
import type { GestureEvent } from "@/lib/gesture-logic";
import { SectionPanel } from "./section-panel";
import { LiveMode } from "./live-mode";
import { useStepCtx } from "./step-context";
import type { RouteLine } from "@/components/blueprint/water-routes";
import { defaultVehicles } from "@/lib/factory-geometry";
import type { Command } from "@/lib/voice-commands";
import type { Language } from "@/lib/chat-api";
import { PlanView } from "@/components/blueprint/plan-view";
import { StepIcon } from "@/components/blueprint/step-icon";
import { cameraSetup } from "@/lib/factory-geometry";
import { fill, type Dict } from "@/lib/i18n";
import type { LayoutResult } from "@/lib/layout-api";
import type { SiteConditions } from "@/lib/research-api";

const built = new Set<string>(); // layouts already built up on screen in this visit, so reopening a chat does not replay it
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Props = {
  design: LayoutResult; t: Dict; dark: boolean; webgl: boolean; site?: SiteConditions;
  selectedStep?: string; onSelectStep: (id?: string) => void; hoverId?: string; onHover: (id?: string) => void;
  focus: boolean; onFocus: (on: boolean) => void; onPick: (id: string) => void; onJump: (id: string) => void;
  highlightIds?: string[]; barExtra?: ReactNode; note?: ReactNode; wide?: boolean; onWide?: (on: boolean) => void; detailId?: string; onDetail: (id?: string) => void;
  lang: Language; onEdit?: (instruction: string) => Promise<{ reply: string; changes: string[] }>; onLayoutChange?: (layout: LayoutResult) => void;
};

/** The 3D / plan view of a layout with its controls, the numbered route strip and the walk-through. Shared by new designs and existing factories. */
export function LayoutViewer({ design, t, dark, webgl, site, selectedStep, onSelectStep, hoverId, onHover, focus, onFocus, onPick, onJump, highlightIds, barExtra, note, wide, onWide, detailId, onDetail, lang, onEdit, onLayoutChange }: Props) {
  const [view, setView] = useState<"3d" | "plan">("3d");
  const [solar, setSolar] = useState(true);
  const [flow, setFlow] = useState(true);
  const [labels, setLabels] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [touring, setTouring] = useState(false);
  const [hands, setHands] = useState(false);
  const [live, setLive] = useState(false);
  const [layer, setLayer] = useState(false);              // the plant-wide water and waste layer
  const [envRoutes, setEnvRoutes] = useState<RouteLine[] | undefined>();   // the route of the step being looked at
  const stepCtx = useStepCtx();
  const [cursor, setCursor] = useState<{ x: number; y: number } | undefined>();
  const [gesture] = useState(() => new GestureBus());
  const [builtCount, setBuiltCount] = useState(Infinity); // how many steps are standing; Infinity = the whole plant
  const steps = useMemo(() => design.zones.filter((z) => z.step).sort((a, b) => (a.step ?? 0) - (b.step ?? 0)), [design]);
  const effectiveView = webgl ? view : "plan";
  const shown = design.zones.find((z) => z.zone_id === (hoverId ?? selectedStep));
  const active = hoverId ?? selectedStep;
  const activeIndex = steps.findIndex((z) => z.zone_id === selectedStep);
  const building = Number.isFinite(builtCount);
  const signature = `${design.label}|${design.width_m}x${design.depth_m}`; // edits to the plant do not rebuild it from scratch
  const selectedStepRef = useRef(selectedStep);
  useEffect(() => { selectedStepRef.current = selectedStep; }, [selectedStep]);

  // A layout opens with step 1 selected, so the route, ring and details are already alive.
  useEffect(() => { if (!selectedStep && steps[0]) onSelectStep(steps[0].zone_id); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (selectedStep && !design.zones.some((z) => z.zone_id === selectedStep) && steps[0]) onSelectStep(steps[0].zone_id); }, [design, selectedStep, steps, onSelectStep]);
  useEffect(() => { if (!focus) return; const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onFocus(false); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [focus, onFocus]);
  useEffect(() => {
    if (!touring) return;
    const timer = setInterval(() => {
      const next = steps.findIndex((z) => z.zone_id === selectedStepRef.current) + 1;
      if (next >= steps.length) { setTouring(false); return; }
      onSelectStep(steps[next].zone_id);
    }, 3800);
    return () => clearInterval(timer);
  }, [touring, steps, onSelectStep]);

  const lastBuilt = useRef<string | undefined>(undefined); // the step the build itself selected last
  const select = (id?: string) => { lastBuilt.current = id; onSelectStep(id); };
  const finishBuild = () => setBuiltCount(Infinity);
  const startBuild = () => { setTouring(false); if (steps.length) { select(undefined); setBuiltCount(0); } };
  // Choosing a step yourself (in the list, on the strip, in the 3D view) ends the build and keeps your choice.
  useEffect(() => { if (building && selectedStep !== lastBuilt.current) setBuiltCount(Infinity); }, [selectedStep, building]);
  // The plant is built up on first sight: one step every moment, the camera following, until everything stands.
  useEffect(() => {
    if (built.has(signature)) return;
    if (!webgl || reducedMotion() || !steps.length) { built.add(signature); return; }
    const t0 = setTimeout(() => { built.add(signature); select(undefined); setBuiltCount(0); }, 400); // marked only when it really starts, so a repeated effect run (dev mode) still builds
    return () => clearTimeout(t0);
  }, [webgl, signature, steps.length]); // eslint-disable-line react-hooks/exhaustive-deps -- `select` only records the id and forwards it
  useEffect(() => {
    if (!building) return;
    const timer = setTimeout(() => {
      const next = builtCount + 1;
      if (next > steps.length + 1) { setBuiltCount(Infinity); return; }
      setBuiltCount(next);
      if (next >= 1 && next <= steps.length) select(steps[next - 1].zone_id);
      if (next === steps.length + 1) select(steps[0].zone_id);
    }, builtCount === 0 ? 300 : 1700);
    return () => clearTimeout(timer);
  }, [building, builtCount, steps]); // eslint-disable-line react-hooks/exhaustive-deps -- `select` only records the id and forwards it
  // The section view and the hand-control panel need room, so the 3D view makes itself tall while either is open and goes back afterwards.
  const roomBefore = useRef<boolean | undefined>(undefined);
  const needRoom = Boolean(detailId) || hands || live;
  useEffect(() => {
    if (needRoom) { if (roomBefore.current === undefined) { roomBefore.current = Boolean(wide); onWide?.(true); } }
    else if (roomBefore.current !== undefined) { onWide?.(roomBefore.current); roomBefore.current = undefined; }
  }, [needRoom]); // eslint-disable-line react-hooks/exhaustive-deps -- reacts only to opening and closing, not to the size it set itself
  const openDetail = (id?: string) => { if (!id) return; finishBuild(); setTouring(false); onSelectStep(id); onDetail(id); };
  const closeDetail = () => onDetail(undefined);
  const onGesture = (e: GestureEvent) => {
    const g = gesture;
    if (e.type === "rotate") { g.addRotate(e.dx, e.dy); finishBuild(); }
    else if (e.type === "zoom") { g.addZoom(e.factor); finishBuild(); }
    else if (e.type === "pointer") { g.setPointer(e.visible ? { x: e.x, y: e.y } : undefined); setCursor(e.visible ? { x: e.x, y: e.y } : undefined); }
    else if (e.type === "tap") g.tap(e.x, e.y);
    else if (e.type === "swipe") { finishBuild(); setTouring(false); const i = Math.min(Math.max((activeIndex < 0 ? 0 : activeIndex) + (e.dir === "right" ? 1 : -1), 0), steps.length - 1); if (steps[i]) { onSelectStep(steps[i].zone_id); if (detailId) onDetail(steps[i].zone_id); } }
    else if (e.type === "reset") { setResetKey((n) => n + 1); closeDetail(); }
  };
  // Development and tests only: lets a script send gesture events, since a real hand cannot be scripted.
  const latest = useRef(onGesture); useEffect(() => { latest.current = onGesture; });
  useEffect(() => { if (process.env.NODE_ENV === "production") return; (window as unknown as { __qaGesture?: (e: GestureEvent) => void }).__qaGesture = (e) => latest.current(e); }, []);
  useEffect(() => { if (!detailId) return; const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onDetail(undefined); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [detailId, onDetail]);
  const runCommand = (c: Command): string => {
    const a = t.live.ack;
    const move = (dir: 1 | -1): string => { const i = (activeIndex < 0 ? (dir === 1 ? -1 : steps.length) : activeIndex) + dir; if (!steps[i]) return a.edge; finishBuild(); setTouring(false); onSelectStep(steps[i].zone_id); if (detailId) onDetail(steps[i].zone_id); return dir === 1 ? a.next : a.prev; };
    switch (c.type) {
      case "zoom": gesture.addZoom(c.factor); finishBuild(); return c.factor > 1 ? a.zoomIn : a.zoomOut;
      case "rotate": gesture.addRotate(c.dx, c.dy); finishBuild(); return a.rotate;
      case "reset": setResetKey((n) => n + 1); closeDetail(); return a.reset;
      case "next": return move(1);
      case "prev": return move(-1);
      case "open": { const z = steps.find((s) => s.zone_id === c.id); if (!z) return a.missing; openDetail(z.zone_id); return fill(a.open, { name: z.label }); }
      case "missing": return a.missing;
      case "close": closeDetail(); return a.close;
      case "tour": startTour(); return a.tour;
      case "build": startBuild(); return a.build;
      case "stop": finishBuild(); setTouring(false); return a.stop;
      case "vehicle": { const base = design.vehicles.length ? design.vehicles : defaultVehicles(design); onLayoutChange?.({ ...design, vehicles: [...base, { kind: c.kind, zone_id: c.zoneId, direction: c.direction, label: "" }].slice(-4) }); return c.direction === "in" ? a.vehicleIn : a.vehicleOut; }
    }
  };
  const startTour = () => { finishBuild(); if (touring) { setTouring(false); return; } if (steps.length) { onSelectStep(steps[0].zone_id); setTouring(true); } };
  const step = (dir: 1 | -1) => { const i = Math.min(Math.max((activeIndex < 0 ? (dir === 1 ? -1 : steps.length) : activeIndex) + dir, 0), steps.length - 1); if (steps[i]) onSelectStep(steps[i].zone_id); };
  const caption = steps[activeIndex];
  const isNew = (id: string) => Boolean(highlightIds?.includes(id));
  const plantRoutes: RouteLine[] = layer && design.zones.some((z) => z.zone_id === "etp") ? (stepCtx?.waterSteps ?? []).filter((id) => design.zones.some((z) => z.zone_id === id)).map((id) => ({ from: id, to: "etp", kind: "water" as const })) : [];
  const routes = [...plantRoutes, ...(detailId ? (envRoutes ?? []) : [])].filter((r, i, all) => all.findIndex((x) => x.from === r.from && x.to === r.to && x.kind === r.kind) === i);

  return (
    <section className="viewer qa-card" aria-label="3D layout" title="">
      <div className="viewer-bar">
        {barExtra}
        <div className="seg" role="group" aria-label="View">
          {webgl ? <button type="button" aria-pressed={effectiveView === "3d"} className={effectiveView === "3d" ? "on" : ""} onClick={() => setView("3d")}>{t.viewer3d}</button> : null}
          <button type="button" aria-pressed={effectiveView === "plan"} className={effectiveView === "plan" ? "on" : ""} onClick={() => setView("plan")}>{t.viewerPlan}</button>
        </div>
        <label className="toggle"><input type="checkbox" checked={solar} onChange={(e) => setSolar(e.target.checked)} disabled={effectiveView === "plan"} />{t.solar}</label>
        <label className="toggle"><input type="checkbox" checked={flow} onChange={(e) => setFlow(e.target.checked)} disabled={effectiveView === "plan"} />{t.flow}</label>
        <label className="toggle"><input type="checkbox" checked={layer} onChange={(e) => setLayer(e.target.checked)} disabled={effectiveView === "plan"} />{t.se.layer}</label>
        <label className="toggle"><input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} disabled={effectiveView === "plan"} />{t.labels}</label>
        <button type="button" className={`chip live-btn ${live ? "on" : ""}`} onClick={() => setLive((v) => !v)} aria-pressed={live}><MessagesSquare size={13} />{live ? t.live.stop : t.live.btn}</button>
        <button type="button" className={`chip hand-btn ${hands ? "on" : ""}`} onClick={() => setHands((h) => !h)} disabled={effectiveView === "plan"} aria-pressed={hands}><Hand size={13} />{hands ? t.ix.handStop : t.ix.handBtn}</button>
        <button type="button" className={`chip build-btn ${building ? "on" : ""}`} onClick={() => (building ? finishBuild() : startBuild())} disabled={!steps.length || effectiveView === "plan"} aria-pressed={building} aria-label={building ? t.ix.skipBuild : t.ix.buildBtn} title={building ? t.ix.skipBuild : t.ix.buildBtn}>{building ? <SkipForward size={13} /> : <Hammer size={13} />}<span className="lbl">{building ? t.ix.skipBuild : t.ix.buildBtn}</span></button>
        <button type="button" className={`chip tour-btn ${touring ? "on" : ""}`} onClick={startTour} disabled={!steps.length} aria-pressed={touring} aria-label={touring ? t.ix.stopTour : t.ix.tour} title={touring ? t.ix.stopTour : t.ix.tour}>{touring ? <Square size={13} /> : <Play size={13} />}<span className="lbl">{touring ? t.ix.stopTour : t.ix.tour}</span></button>
        <button type="button" className="icon-btn ghost" onClick={() => setResetKey((n) => n + 1)} aria-label={t.resetView} title={t.resetView} disabled={effectiveView === "plan"}><RotateCcw size={16} /></button>
        <span className="viewer-size">{t.plot} {design.width_m} × {design.depth_m} m{design.size_was_suggested ? ` · ${t.suggestedSize}` : ""}</span>
        {onWide ? <button type="button" className="icon-btn ghost expand-btn" onClick={() => { onWide(!wide); setResetKey((n) => n + 1); }} aria-label={wide ? t.ix.restoreView : t.ix.expandView} title={wide ? t.ix.restoreView : t.ix.expandView} aria-pressed={Boolean(wide)}>{wide ? <PanelBottomOpen size={17} /> : <PanelBottomClose size={17} />}</button> : null}
        <button type="button" className="icon-btn ghost expand-btn" onClick={() => { onFocus(!focus); setResetKey((n) => n + 1); }} aria-label={focus ? t.ix.exitFull : t.ix.fullscreen} title={focus ? t.ix.exitFull : t.ix.fullscreen} aria-pressed={focus}>{focus ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
      </div>
      <div className={`viewer-canvas ${live ? "has-live" : ""}`} data-testid="factory-view">
        {effectiveView === "3d"
          ? <Factory3D layout={design} dark={dark} solar={solar} flow={flow} labels={labels} activeId={active} tourId={touring || building || detailId ? selectedStep : undefined} gesture={gesture} onGestureTap={openDetail} onOpen={openDetail} builtCount={builtCount} routes={routes} highlightIds={highlightIds} resetKey={resetKey} onActive={onHover} onPick={onPick} onUserMove={() => { setTouring(false); finishBuild(); }} />
          : <PlanView layout={design} activeId={active} highlightIds={highlightIds} onActive={onHover} />}
        {site?.prevailing_wind_label ? <span className="wind-chip"><Wind size={13} />{fill(t.windChip, { dir: site.prevailing_wind_label })}</span> : null}
        <span className="compass" aria-hidden="true">{effectiveView === "3d" && cameraSetup(design.width_m, design.depth_m).north === "right" ? "N →" : "N ↑"}</span>
        {shown && !(focus || touring || building || detailId) ? (
          <div className="zone-tip" aria-live="polite">
            <strong>{isNew(shown.zone_id) ? <em className="new-tag">{t.ix.newTag}</em> : null}{shown.step ? `${shown.step} · ` : ""}{shown.label}</strong>
            <span>{shown.area_m2.toFixed(0)} m² · {shown.width_m.toFixed(0)} × {shown.depth_m.toFixed(0)} m</span>
            {shown.equipment.length ? <span className="tip-equip">{shown.equipment.slice(0, 3).join(" · ")}</span> : null}
          </div>
        ) : null}
        {caption && (focus || touring || building) && !detailId ? (
          <div className="journey-card" key={caption.zone_id} aria-live="polite">
            <span className="jc-kicker">{fill(building ? t.ix.building : t.ix.tourOf, { n: activeIndex + 1, total: steps.length })}{isNew(caption.zone_id) ? <em className="new-tag">{t.ix.newTag}</em> : null}</span>
            <div className="jc-head"><StepIcon icon={caption.icon} kind={caption.kind} size={34} /><strong>{caption.label}</strong></div>
            {caption.detail || caption.note ? <p>{caption.detail || caption.note}</p> : null}
            <div className="jc-flow">
              {activeIndex > 0 && steps[activeIndex - 1].outputs.length ? <span className="jc-in">{steps[activeIndex - 1].outputs.slice(0, 2).join(" · ")}</span> : <span className="jc-in">{design.location ?? "—"}</span>}
              <ArrowRight size={14} /><span className="jc-step">{caption.label}</span><ArrowRight size={14} />
              <span className="jc-out">{caption.outputs.slice(0, 3).join(" · ") || "—"}</span>
            </div>
            <div className="jc-nav"><button type="button" className="chip strong open-section" onClick={() => openDetail(caption.zone_id)}>{t.ix.openSection}</button><button type="button" className="icon-btn ghost" onClick={() => { setTouring(false); step(-1); }} disabled={activeIndex <= 0} aria-label="Previous"><ChevronLeft size={18} /></button><button type="button" className="icon-btn ghost" onClick={() => { setTouring(false); step(1); }} disabled={activeIndex >= steps.length - 1} aria-label="Next"><ChevronRight size={18} /></button></div>
          </div>
        ) : null}
        {steps.length ? (
          <nav className="route-strip" aria-label={t.ix.journey}>
            {steps.map((z, i) => (
              <button key={z.zone_id} type="button" className={`route-stop ${z.zone_id === active ? "on" : ""} ${activeIndex > i ? "done" : ""} ${isNew(z.zone_id) ? "is-new" : ""}`} onClick={() => { finishBuild(); onJump(z.zone_id); }} onMouseEnter={() => onHover(z.zone_id)} onMouseLeave={() => onHover(undefined)} title={z.label}>
                <span className="rs-n">{z.step}</span><span className="rs-label">{z.label}</span>
              </button>
            ))}
          </nav>
        ) : null}
      {detailId && design.zones.find((z) => z.zone_id === detailId) ? <SectionPanel zone={design.zones.find((z) => z.zone_id === detailId)!} index={steps.findIndex((z) => z.zone_id === detailId)} total={steps.length} before={steps[steps.findIndex((z) => z.zone_id === detailId) - 1]} industry={design.label} isNew={isNew(detailId)} onClose={closeDetail} onRoutes={setEnvRoutes} names={Object.fromEntries(design.zones.map((z) => [z.zone_id, z.label]))} steps={steps.map((z) => ({ key: z.zone_id, label: z.label, equipment: z.equipment.slice(0, 5), outputs: z.outputs.slice(0, 4) }))} onStep={(dir) => { const i = steps.findIndex((z) => z.zone_id === detailId) + dir; if (steps[i]) { onSelectStep(steps[i].zone_id); onDetail(steps[i].zone_id); } }} t={t} /> : null}
        {hands && cursor ? <span className="hand-cursor" style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }} aria-hidden="true" /> : null}
        {live && onEdit ? <LiveMode t={t} lang={lang} steps={steps} selectedId={selectedStep} onCommand={runCommand} onEdit={onEdit} onClose={() => setLive(false)} /> : null}
        {hands ? <GestureControl onEvent={onGesture} onClose={() => { setHands(false); setCursor(undefined); }} t={t} /> : null}
      </div>
      <p className="viewer-foot"><span className="illustrative">{t.tag}</span>{routes.length ? <span className="route-legend"><i className="lg water" />{t.se.legendWater}{routes.some((r) => r.kind === "waste") ? <><i className="lg waste" />{t.se.legendWaste}</> : null}</span> : null}{note ? <span className="muted small">{note}</span> : null}<span className="muted small drag-hint">{t.dragHint}</span>{!design.fits ? <span className="warn">{t.tightPlot}</span> : null}</p>
    </section>
  );
}
