"use client";
import { ImageIcon, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { fetchStepImage } from "@/lib/image-api";
import { imageKey, imagesVersion, loadImages, peekImage, saveImage, subscribeImages } from "@/lib/image-store";
import type { Dict } from "@/lib/i18n";
import type { Zone } from "@/lib/layout-api";

const keyFor = (industry: string, z: Zone) => imageKey(industry, z.label, z.equipment);
const bodyFor = (industry: string, z: Zone) => ({ industry, label: z.label, equipment: z.equipment, outputs: z.outputs, detail: z.detail || z.note });

export async function illustrate(industry: string, z: Zone): Promise<void> {
  const key = keyFor(industry, z);
  if (peekImage(key)) return;
  await saveImage(key, await fetchStepImage(bodyFor(industry, z)));
}

/** What a step looks like: an AI illustration of its machines, made when asked and kept for next time. */
export function StepIllustration({ industry, zone, t }: { industry: string; zone: Zone; t: Dict }) {
  useSyncExternalStore(subscribeImages, imagesVersion, () => 0);
  const key = keyFor(industry, zone);
  const src = peekImage(key);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const alive = useRef(true);
  useEffect(() => { alive.current = true; void loadImages([key]); return () => { alive.current = false; }; }, [key]);
  const make = () => { setStatus("loading"); illustrate(industry, zone).then(() => alive.current && setStatus("idle")).catch(() => alive.current && setStatus("error")); };

  // eslint-disable-next-line @next/next/no-img-element -- a small data: URL made in the browser; the image optimiser adds nothing here
  if (src) return <figure className="step-figure"><img src={src} alt={`${zone.label}: ${t.ix.illustrationNote}`} loading="lazy" /><figcaption><Sparkles size={12} />{t.ix.illustrationNote}</figcaption></figure>;
  if (status === "loading") return <div className="step-figure loading" role="status" aria-busy="true"><span className="skel" /><span className="fig-wait"><Loader2 size={15} className="spin" />{t.ix.illustrating}</span></div>;
  return (
    <button type="button" className="chip strong illustrate-btn" onClick={make}>
      {status === "error" ? <RotateCcw size={14} /> : <ImageIcon size={14} />}{status === "error" ? `${t.ix.illustrationFailed} · ${t.retry}` : t.ix.illustrate}
    </button>
  );
}
