"use client";
import { Clapperboard, Droplets, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Dict } from "@/lib/i18n";
import type { Zone } from "@/lib/layout-api";
import { rememberedJob, rememberJob, startVideo, videoKey, videoSrc, videoStatus } from "@/lib/video-api";

type State = { status: "idle" | "making" | "done" | "failed"; url?: string; message?: string };

function Clip({ industry, zone, focus, waterNote, t }: { industry: string; zone: Zone; focus: "process" | "water"; waterNote: string; t: Dict }) {
  const key = videoKey(industry, zone.label, focus);
  const [state, setState] = useState<State>({ status: "idle" });
  const alive = useRef(true);
  const poll = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const watch = (id: string) => {
    const tick = async () => {
      try {
        const job = await videoStatus(id);
        if (!alive.current) return;
        if (job.status === "done" && job.url) { setState({ status: "done", url: videoSrc(job.url) }); return; }
        if (job.status === "failed") { setState({ status: "failed", message: job.message ?? undefined }); return; }
        poll.current = setTimeout(tick, 5000);
      } catch (error) { if (alive.current) setState({ status: "failed", message: error instanceof Error && !/^\d+$/.test(error.message) && error.message !== "network" ? error.message : undefined }); }
    };
    void tick();
  };
  useEffect(() => {
    alive.current = true;
    const id = rememberedJob(key);            // a clip made earlier is shown again without paying for a new one
    if (id) videoStatus(id).then((job) => { if (alive.current && job.status === "done" && job.url) setState({ status: "done", url: videoSrc(job.url) }); }).catch(() => {});
    return () => { alive.current = false; clearTimeout(poll.current); };
  }, [key]);
  const make = async () => {
    setState({ status: "making" });
    try {
      const job = await startVideo({ industry, label: zone.label, equipment: zone.equipment, outputs: zone.outputs, detail: zone.detail || zone.note, focus, water_note: waterNote });
      rememberJob(key, job.job_id);
      if (job.status === "done" && job.url) setState({ status: "done", url: videoSrc(job.url) }); else watch(job.job_id);
    } catch (error) { setState({ status: "failed", message: error instanceof Error && !/^\d+$/.test(error.message) && error.message !== "network" ? error.message : undefined }); }
  };
  const label = focus === "water" ? t.video.water : t.video.process;
  const Icon = focus === "water" ? Droplets : Clapperboard;
  if (state.status === "done" && state.url) return <figure className="step-figure"><video src={state.url} controls loop muted playsInline preload="metadata" aria-label={label} /><figcaption><Icon size={12} />{label} · {t.video.caption}</figcaption></figure>;
  if (state.status === "making") return <div className="step-figure loading" role="status" aria-busy="true"><span className="skel" /><span className="fig-wait"><Loader2 size={15} className="spin" />{t.video.making}</span></div>;
  return (
    <div className="video-ask">
      <button type="button" className="chip strong" onClick={() => void make()}>{state.status === "failed" ? <RotateCcw size={14} /> : <Icon size={14} />}{state.status === "failed" ? `${t.video.failed} · ${t.video.again}` : label}</button>
      {state.status === "failed" && state.message ? <p className="muted small">{state.message}</p> : null}
    </div>
  );
}

/** Short clips made with Google Veo, only when asked, because each new one is billed. */
export function StepVideo({ industry, zone, waterNote, t }: { industry: string; zone: Zone; waterNote: string; t: Dict }) {
  return (
    <section className="step-video">
      <h4>{t.video.title}</h4>
      <Clip industry={industry} zone={zone} focus="process" waterNote="" t={t} />
      <Clip industry={industry} zone={zone} focus="water" waterNote={waterNote} t={t} />
      <p className="muted small">{t.video.cost}</p>
    </section>
  );
}
