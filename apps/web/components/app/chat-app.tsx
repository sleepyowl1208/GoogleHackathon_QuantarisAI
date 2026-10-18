"use client";
import { Download, Languages, Loader2, Menu } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BlueprintError, ServiceUnreachableError } from "@/lib/layout-api";
import { fileToAttachment, sendChat, type ChatResponse, type Mode } from "@/lib/chat-api";
import { sendInsights } from "@/lib/insights-api";
import { fetchSite } from "@/lib/site-api";
import { sendPractices, type PracticesBody } from "@/lib/practices-api";
import { sendCosts, type CostsBody } from "@/lib/costs-api";
import { machinesFor, machinesForImprovement } from "@/lib/costs-logic";
import type { LayoutResult } from "@/lib/layout-api";
import type { SiteConditions } from "@/lib/research-api";
import { stageRequestBody } from "@/lib/insights-logic";
import { sendResearch, type ResearchBody } from "@/lib/research-api";
import { dictionaries, fill } from "@/lib/i18n";
import {
  createSession, deleteSession, getProfile, getServerProfile, getServerSnapshot, getSnapshot, renameSession, selectSession, setProfile, subscribe, subscribeProfile, uid, updateSession,
  type Message, type Session,
} from "@/lib/sessions";
import { buildContext, shouldRelocate } from "@/lib/context-logic";
import { reportFileName } from "@/lib/report-logic";
import { displayMessages, dropVariants, localized, missingFor } from "@/lib/localize";
import { translateTexts } from "@/lib/translate-api";
import { applyTexts, extractTexts } from "@/lib/translate-logic";
import type { Language } from "@/lib/chat-api";
import { Conversation } from "./conversation";
import { ReportDocument } from "./report";
import { SummaryCard } from "./summary-card";
import { useDark, useWebgl } from "./hooks";
import { Sidebar } from "./sidebar";
import { WorkspaceSkeleton } from "./skeletons";
import { Workspace } from "./workspace";

function titleFor(s: Session, res: ChatResponse): string {
  if (res.design) return res.design.location ? `${res.design.label} · ${res.design.location}` : res.design.label;
  if (res.improvement) return res.title || res.improvement.business.slice(0, 48);
  return s.title;
}

export function ChatApp() {
  const { sessions, activeId } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const profile = useSyncExternalStore(subscribeProfile, getProfile, getServerProfile);
  const dark = useDark();
  const webgl = useWebgl();
  const t = dictionaries[profile.language];
  const active = sessions.find((s) => s.id === activeId);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState(0);
  const [selectedStep, setSelectedStep] = useState<string>();
  const [navOpen, setNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileTab, setMobileTab] = useState<"chat" | "workspace">("chat");
  const [researchStatus, setResearchStatus] = useState<Record<string, "loading" | "error">>({});
  const [reportDate, setReportDate] = useState(() => new Date());
  const [insightsStatus, setInsightsStatus] = useState<Record<string, "loading" | "error">>({});
  const [costsStatus, setCostsStatus] = useState<Record<string, "loading" | "error">>({});
  const [practicesStatus, setPracticesStatus] = useState<Record<string, "loading" | "error">>({});
  const [translateStatus, setTranslateStatus] = useState<Record<string, "loading" | "error">>({});
  const inflight = useRef(new Set<string>());
  const lang = profile.language;
  const view = active ? localized(active, lang) : undefined; // generated content in the chosen language, once translated

  // Cosmetic progress while the real request runs; it only tells the user that work is under way.
  useEffect(() => { if (!busy) return; const timer = setInterval(() => setPhase((n) => Math.min(n + 1, 3)), 3500); return () => clearInterval(timer); }, [busy]);

  const hasWorkspace = Boolean(active?.design || active?.improvement);
  const loadingWorkspace = busy && !hasWorkspace && Boolean(active?.mode);
  const showWelcome = !active || active.messages.length === 0;

  // Sourced research (Google Search + map pins) runs after the design appears, so the layout is never held up by it.
  function runResearch(sid: string, body: ResearchBody, key: string) {
    setResearchStatus((s) => ({ ...s, [sid]: "loading" }));
    sendResearch(body)
      .then((research) => { updateSession(sid, (s) => ({ ...s, research, researchKey: key, pieceLang: { ...s.pieceLang, research: body.language }, variants: dropVariants(s, ["research"]) })); setResearchStatus((s) => { const { [sid]: _done, ...rest } = s; void _done; return rest; }); })
      .catch(() => setResearchStatus((s) => ({ ...s, [sid]: "error" })));
  }
  function retryResearch(session: Session) {
    const industry = session.industry ?? session.design?.label ?? "";
    if (industry.length < 2) return;
    runResearch(session.id, { industry, location: session.location ?? "", mode: session.improvement ? "existing" : "new", language: profile.language, context: (buildContext(session) ?? "").slice(0, 1400) }, `${industry}|${session.location ?? ""}|${session.improvement ? "e" : "n"}`);
  }

  // Indicative machine prices, suppliers, land and productivity (Google Search, with links), also in the background.
  function runCosts(sid: string, body: CostsBody, key: string) {
    if (!body.machines.length) return;
    setCostsStatus((s) => ({ ...s, [sid]: "loading" }));
    sendCosts(body)
      .then((costs) => { updateSession(sid, (s) => ({ ...s, costs, costsKey: key, pieceLang: { ...s.pieceLang, costs: body.language }, variants: dropVariants(s, ["costs"]) })); setCostsStatus((s) => { const { [sid]: _done, ...rest } = s; void _done; return rest; }); })
      .catch(() => setCostsStatus((s) => ({ ...s, [sid]: "error" })));
  }
  function costsBodyFor(session: Session, language: "en" | "hi"): CostsBody | undefined {
    const industry = session.industry ?? session.design?.label ?? "";
    if (industry.length < 2) return undefined;
    const machines = session.design ? machinesFor(session.design) : session.improvement ? machinesForImprovement(session.improvement) : [];
    return { industry, location: session.location ?? session.design?.location ?? "", machines, mode: session.improvement ? "existing" : "new", language };
  }
  function retryCosts(session: Session) { const body = costsBodyFor(session, lang); if (body) runCosts(session.id, body, `${body.industry}|${body.location}|${body.mode}|${body.machines.map((m) => m.name).join(",")}`); }

  // The plant was changed by voice or text. A change to its steps makes the by-product, power and cost pages out of date, so they are made again; a change that only adds a vehicle is just saved.
  function applyLayoutEdit(sid: string, which: "design" | "asis" | "proposed", layout: LayoutResult) {
    const before = getSnapshot().sessions.find((s) => s.id === sid);
    if (!before) return;
    const old = which === "design" ? before.design : which === "asis" ? before.improvement?.as_is_layout : before.improvement?.proposed_layout;
    const sig = (l?: LayoutResult | null) => (l?.zones ?? []).map((z) => `${z.zone_id}:${z.level}`).join("|");
    const structural = sig(old) !== sig(layout);
    updateSession(sid, (s) => {
      if (which === "design") return { ...s, design: layout, ...(structural ? { insights: undefined, costs: undefined, stepEnvs: undefined } : {}), pieceLang: { ...s.pieceLang, design: lang }, variants: dropVariants(s, structural ? ["design", "insights", "costs"] : ["design"]) };
      if (!s.improvement) return s;
      const improvement = which === "asis" ? { ...s.improvement, as_is_layout: layout } : { ...s.improvement, proposed_layout: layout };
      return { ...s, improvement, ...(structural && which === "proposed" ? { costs: undefined } : {}), pieceLang: { ...s.pieceLang, improvement: lang }, variants: dropVariants(s, ["improvement"]) };
    });
    if (!structural) return;
    const now = getSnapshot().sessions.find((s) => s.id === sid);
    if (!now) return;
    if (which === "design") runInsights(sid, layout, lang, now.location ?? layout.location ?? "");
    if (which === "design" || which === "proposed") { const body = costsBodyFor(now, lang); if (body) runCosts(sid, body, `${body.industry}|${body.location}|${body.mode}|${body.machines.map((m) => m.name).join(",")}`); }
  }

  // The owner told us (or we had lost) where the factory is: everything that depends on the place is searched again for that place.
  function relocate(sid: string, place: string, site: SiteConditions | undefined) {
    updateSession(sid, (s) => ({ ...s, location: place, site: site ?? s.site, design: s.design ? { ...s.design, location: place } : s.design, research: undefined, researchKey: undefined, costs: undefined, costsKey: undefined, practices: undefined, practicesKey: undefined, stepEnvs: undefined, variants: dropVariants(s, ["research", "costs", "practices", "design"]) }));
    if (!site) void fetchSite(place).then((found) => { if (found) updateSession(sid, (x) => ({ ...x, site: found })); });
    const now = getSnapshot().sessions.find((x) => x.id === sid);
    if (!now) return;
    const industry = (now.industry ?? now.design?.label ?? "").trim();
    if (industry.length < 2) return;
    const mode = now.improvement ? "existing" : "new";
    const key = `${industry}|${place}|${mode === "existing" ? "e" : "n"}`;
    runResearch(sid, { industry, location: place, mode, language: profile.language, context: (buildContext(now) ?? "").slice(0, 1400) }, key);
    runPractices(sid, { industry, location: place, problem: problemText(now), mode, language: profile.language }, key);
    const body = costsBodyFor(now, profile.language); if (body) runCosts(sid, body, `${body.industry}|${body.location}|${body.mode}|${body.machines.map((m) => m.name).join(",")}`);
  }

  const setPlaceFor = (sid: string) => (place: string) => {
    relocate(sid, place, undefined);
    updateSession(sid, (s) => ({ ...s, messages: [...s.messages, { id: uid(), role: "assistant", text: fill(t.relocated, { place }), lang: profile.language }] }));
  };

  // What works elsewhere in the world (Google Search, with links) for this industry's pollution and waste, also in the background.
  function runPractices(sid: string, body: PracticesBody, key: string) {
    setPracticesStatus((s) => ({ ...s, [sid]: "loading" }));
    sendPractices(body)
      .then((practices) => { updateSession(sid, (s) => ({ ...s, practices, practicesKey: key, pieceLang: { ...s.pieceLang, practices: body.language }, variants: dropVariants(s, ["practices"]) })); setPracticesStatus((s) => { const { [sid]: _done, ...rest } = s; void _done; return rest; }); })
      .catch(() => setPracticesStatus((s) => ({ ...s, [sid]: "error" })));
  }
  const problemText = (s: Session) => s.messages.filter((m) => m.role === "user").map((m) => m.text).join(" ").replace(/\s+/g, " ").slice(0, 880);
  function retryPractices(session: Session) {
    const industry = session.industry ?? session.design?.label ?? "";
    if (industry.length < 2) return;
    const mode = session.improvement ? "existing" : "new";
    runPractices(session.id, { industry, location: session.location ?? "", problem: problemText(session), mode, language: lang }, `${industry}|${session.location ?? ""}|${mode}`);
  }

  // The by-product workflow, power/water profile, environment actions and operations ideas come from a second agent, also after the design appears.
  function runInsights(sid: string, design: NonNullable<Session["design"]>, language: "en" | "hi", location: string) {
    setInsightsStatus((s) => ({ ...s, [sid]: "loading" }));
    sendInsights({ industry: design.label.slice(0, 100), location: location.slice(0, 120), language, stages: stageRequestBody(design), wastes: design.waste_streams.map((w) => w.name.slice(0, 80)).slice(0, 8), context: (buildContext({ design } as Session) ?? "").slice(0, 780) })
      .then((insights) => { updateSession(sid, (s) => (s.design === design ? { ...s, insights, pieceLang: { ...s.pieceLang, insights: language }, variants: dropVariants(s, ["insights"]) } : s)); setInsightsStatus((s) => { const { [sid]: _done, ...rest } = s; void _done; return rest; }); })
      .catch(() => setInsightsStatus((s) => ({ ...s, [sid]: "error" })));
  }

  // The report is an always-present, print-only document; printing it lets the browser save a real PDF with the right fonts for any language.
  function downloadReport() {
    if (!active) return;
    const now = new Date(); setReportDate(now);
    const previous = document.title; document.title = reportFileName(active.title || active.design?.label || "report", now);
    const restore = () => { document.title = previous; window.removeEventListener("afterprint", restore); };
    window.addEventListener("afterprint", restore);
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }

  // Switching language re-expresses everything already generated (design, analysis, sourcing, chat), not only the interface.
  useEffect(() => {
    if (!active) return;
    const need = missingFor(active, lang);
    if (!need.pieces.length && !need.messages.length) return;
    const key = `${active.id}:${lang}`;
    if (inflight.current.has(key) || translateStatus[key] === "error") return;
    inflight.current.add(key);
    setTranslateStatus((s) => ({ ...s, [key]: "loading" }));
    const sid = active.id;
    const jobs = need.pieces.map((piece) => ({ piece, value: active[piece] as unknown, texts: extractTexts(piece, active[piece]) }));
    const msgTexts = need.messages.flatMap((m) => [m.text, ...(m.suggestions ?? [])]).map((x) => x.trim()).filter((x) => x && x.length <= 600);
    const all = [...new Set([...jobs.flatMap((j) => j.texts), ...msgTexts])];
    const done = (status?: "error") => setTranslateStatus((s) => { const { [key]: _old, ...rest } = s; void _old; return status ? { ...rest, [key]: status } : rest; });
    (all.length ? translateTexts(lang, all) : Promise.resolve([] as string[]))
      .then((out) => {
        const map = new Map(all.map((text, i) => [text, out[i]]));
        const ids = new Set(need.messages.map((m) => m.id));
        updateSession(sid, (s) => {
          const bucket: Record<string, unknown> = { ...(s.variants?.[lang] ?? {}) };
          for (const job of jobs) if ((s as unknown as Record<string, unknown>)[job.piece] === job.value) bucket[job.piece] = applyTexts(job.piece, job.value, map);
          const messages = s.messages.map((m) => (ids.has(m.id) ? { ...m, alt: { ...m.alt, [lang]: { text: map.get(m.text.trim()) ?? m.text, suggestions: m.suggestions?.map((x) => map.get(x.trim()) ?? x) } } } : m));
          return { ...s, variants: { ...s.variants, [lang]: bucket }, messages };
        });
        done();
      })
      .catch(() => done("error"))
      .finally(() => inflight.current.delete(key));
  }, [active, lang, translateStatus]);

  function pickMode(mode: Mode) {
    const first: Message = { id: uid(), role: "assistant", prompt: mode, lang, text: mode === "new" ? t.promptNew : t.promptExisting, suggestions: mode === "new" ? t.examplesNew : t.examplesExisting };
    createSession(first, mode); setSelectedStep(undefined); setMobileTab("chat");
  }
  function startWith(mode: Mode, text: string) { const sid = createSession(undefined, mode); setSelectedStep(undefined); void send(text, [], sid, mode); }

  async function send(text: string, files: File[], sessionId?: string, modeOverride?: Mode) {
    const clean = text.trim();
    if (busy || (!clean && !files.length)) return;
    const sid = sessionId ?? active?.id ?? createSession();
    const before = getSnapshot().sessions.find((s) => s.id === sid);
    if (!before) return;
    const shown = clean || `${t.uploadedFiles}: ${files.map((f) => f.name).join(", ")}`;
    const user: Message = { id: uid(), role: "user", text: shown, files: files.map((f) => f.name) };
    updateSession(sid, (s) => ({ ...s, title: s.title || shown.slice(0, 48), messages: [...s.messages, user] }));
    setBusy(true); setPhase(0);
    try {
      const attachments = await Promise.all(files.map(fileToAttachment));
      const history = [...before.messages, user].slice(-10).map((m) => ({ role: m.role, text: m.text.slice(0, 1900) }));
      const res = await sendChat({ messages: history, mode: modeOverride ?? before.mode ?? null, language: profile.language, attachments, last_prompt: before.lastPrompt ?? null, context: buildContext(before) });
      const reply: Message = { id: uid(), role: "assistant", text: res.assistant_text, suggestions: res.suggestions, summary: Boolean(res.design || res.improvement), lang: profile.language, sources: res.sources.length ? res.sources : undefined };
      updateSession(sid, (s) => ({
        ...s, mode: res.mode ?? s.mode, title: titleFor(s, res), messages: [...s.messages, reply],
        ...(res.design || res.improvement ? { pieceLang: { ...s.pieceLang, [res.design ? "design" : "improvement"]: profile.language }, variants: dropVariants(s, ["design", "improvement", "insights"]) } : {}),
        design: res.design ?? (res.improvement ? undefined : s.design), insights: res.design ? undefined : res.improvement ? undefined : s.insights, improvement: res.improvement ?? (res.design ? undefined : s.improvement), lastPrompt: res.prompt_used ?? s.lastPrompt,
      }));
      if (res.route === "answer" && (before.design || before.improvement) && shouldRelocate(before.location ?? before.design?.location ?? undefined, res.location, clean)) {
        relocate(sid, (res.location ?? "").trim(), res.site ?? undefined);
        updateSession(sid, (s) => ({ ...s, messages: [...s.messages, { id: uid(), role: "assistant", text: fill(t.relocated, { place: (res.location ?? "").trim() }), lang: profile.language }] }));
      }
      if (res.design || res.improvement) {
        setSelectedStep(undefined); setMobileTab("workspace");
        const industry = (res.industry ?? "").trim(); const location = (res.location ?? "").trim();
        if (res.design) runInsights(sid, res.design, profile.language, location);
        updateSession(sid, (s) => ({ ...s, site: res.site ?? undefined, industry, location }));
        const key = `${industry}|${location}|${res.improvement ? "e" : "n"}`;
        const now = getSnapshot().sessions.find((s) => s.id === sid);
        const placeKnown = location.length >= 2;
        if (now && industry.length >= 2 && placeKnown) { const body = costsBodyFor(now, profile.language); const ckey = body ? `${body.industry}|${body.location}|${body.mode}|${body.machines.map((m) => m.name).join(",")}` : ""; if (body && now.costsKey !== ckey) runCosts(sid, body, ckey); }
        if (!placeKnown) updateSession(sid, (s) => ({ ...s, messages: [...s.messages, { id: uid(), role: "assistant", text: t.place.ask, lang: profile.language, suggestions: res.suggestions }] }));   // the place decides the sourcing, so ask before searching
        if (now && industry.length >= 2 && now.practicesKey !== key) runPractices(sid, { industry, location, problem: problemText(now), mode: res.improvement ? "existing" : "new", language: profile.language }, key);
        if (now && industry.length >= 2 && placeKnown && now.researchKey !== key) runResearch(sid, { industry, location, mode: res.improvement ? "existing" : "new", language: profile.language, context: (buildContext(now) ?? "").slice(0, 1400) }, key);
      }
    } catch (error) {
      const text = error instanceof ServiceUnreachableError ? t.offline : error instanceof BlueprintError ? error.message : t.genericError;
      updateSession(sid, (s) => ({ ...s, messages: [...s.messages, { id: uid(), role: "assistant", text, error: true }] }));
    } finally { setBusy(false); }
  }

  const newChat = () => { selectSession(undefined); setSelectedStep(undefined); setNavOpen(false); setMobileTab("chat"); };

  return (
    <>
      <div lang={profile.language} className={`app ${collapsed ? "collapsed" : ""} ${navOpen ? "nav-open" : ""} ${hasWorkspace || loadingWorkspace ? "split" : ""} tab-${mobileTab}`}>
        <div className="flag-strip" aria-hidden="true" />
        <Sidebar sessions={sessions} activeId={activeId} t={t} name={profile.name} language={profile.language} onNew={newChat}
          onSelect={(id) => { selectSession(id); setSelectedStep(undefined); setNavOpen(false); setMobileTab("chat"); }} onDelete={deleteSession} onRename={renameSession}
          onName={(name) => setProfile({ name })} onLanguage={(language) => setProfile({ language })} onClose={() => { setCollapsed(true); setNavOpen(false); }} />
        {navOpen ? <button type="button" className="scrim" aria-label={t.collapse} onClick={() => setNavOpen(false)} /> : null}

        <main className="qa-main">
          <header className="chat-head">
            <button type="button" className="icon-btn ghost menu-btn" onClick={() => { setCollapsed(false); setNavOpen(true); }} aria-label={t.openMenu} title={t.openMenu}><Menu size={20} /></button>
            {/* <h1 className="chat-title">{active?.title || t.newDesign}</h1> */}
            {active && translateStatus[`${active.id}:${lang}`] === "loading" ? <span className="chip translate-chip" role="status"><Loader2 size={14} className="spin" />{t.translating}</span> : null}
            {active && translateStatus[`${active.id}:${lang}`] === "error" ? <button type="button" className="chip translate-chip fail" onClick={() => setTranslateStatus((s) => { const { [`${active.id}:${lang}`]: _x, ...rest } = s; void _x; return rest; })}><Languages size={14} />{t.translateFailed}</button> : null}
            {hasWorkspace ? <button type="button" className="chip strong head-download" onClick={downloadReport} title={t.rp.downloadHint}><Download size={15} /><span>{t.rp.download}</span></button> : null}
            {hasWorkspace ? (
              <div className="seg mobile-tabs" role="group">
                <button type="button" className={mobileTab === "chat" ? "on" : ""} aria-pressed={mobileTab === "chat"} onClick={() => setMobileTab("chat")}>{t.mobileChat}</button>
                <button type="button" className={mobileTab === "workspace" ? "on" : ""} aria-pressed={mobileTab === "workspace"} onClick={() => setMobileTab("workspace")}>{t.mobileWorkspace}</button>
              </div>
            ) : null}
          </header>
          <div className="panes">
            <Conversation t={t} lang={profile.language} name={profile.name} mode={active?.mode} messages={active ? displayMessages(active, lang, t) : []} busy={busy} phase={phase} showWelcome={showWelcome}
              summary={active && hasWorkspace ? <SummaryCard session={view ?? active} t={t} researchPending={researchStatus[active.id] === "loading"} insightsPending={insightsStatus[active.id] === "loading"} onDownload={downloadReport} /> : null}
              onPickMode={pickMode} onExample={startWith} onSend={(text, files) => void send(text, files)} />
            {loadingWorkspace ? <WorkspaceSkeleton t={t} /> : null}
            {active && hasWorkspace ? <Workspace session={view ?? active} t={t} dark={dark} webgl={webgl} selectedStep={selectedStep} onSelectStep={setSelectedStep} researchStatus={researchStatus[active.id]} onRunResearch={() => retryResearch(active)} busy={busy} costs={{ data: view?.costs, status: costsStatus[active.id], onRun: () => retryCosts(active), needsPlace: !(active.location ?? active.design?.location ?? "").trim(), onSetPlace: setPlaceFor(active.id) }} onSetPlace={setPlaceFor(active.id)} language={lang} onSaveStepEnv={(key, env) => updateSession(active.id, (s) => ({ ...s, stepEnvs: { ...s.stepEnvs, [key]: env } }))} onLayoutEdit={(which, layout) => applyLayoutEdit(active.id, which, layout)} practices={{ data: view?.practices, status: practicesStatus[active.id], onRun: () => retryPractices(active) }} insights={{ insights: active.insights, status: insightsStatus[active.id], onRun: () => { if (active.design) runInsights(active.id, active.design, profile.language, active.location ?? active.design.location ?? ""); } }} /> : null}
          </div>
        </main>
      </div>
      {active && hasWorkspace ? <ReportDocument session={view ?? active} t={t} date={reportDate} /> : null}
    </>
  );
}
