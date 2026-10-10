"use client";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";

/** Shape-only placeholders shown while the real answer is being worked out. They carry no made-up content. */
export function WorkspaceSkeleton({ t }: { t: Dict }) {
  return (
    <div className="qa-workspace skeleton" aria-busy="true" aria-label={t.loadingAria}>
      <section className="viewer qa-card">
        <div className="viewer-bar"><span className="skel pill" /><span className="skel line short" /><span className="skel line short" /></div>
        <div className="viewer-canvas skel-canvas"><div className="skel-iso" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <span key={i} className="skel block" style={{ ["--n" as string]: i }} />)}</div></div>
      </section>
      <section className="qa-panel qa-card">
        <div className="tabs">{Array.from({ length: 4 }, (_, i) => <span key={i} className="skel pill wide" />)}</div>
        <div className="panel-body"><ul className="skel-steps">{Array.from({ length: 6 }, (_, i) => <li key={i} className="skel-row"><span className="skel dot" /><span className="skel icon" /><span className="skel line" style={{ width: `${48 + ((i * 17) % 38)}%` }} /></li>)}</ul></div>
      </section>
    </div>
  );
}

export function MapSkeleton({ t }: { t: Dict }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => { const timer = setInterval(() => setPhase((n) => Math.min(n + 1, t.mapLoading.length - 1)), 9000); return () => clearInterval(timer); }, [t.mapLoading.length]);
  return (
    <div aria-busy="true" aria-label={t.loadingAria}>
      <p className="map-loading" role="status"><Loader2 size={16} className="spin" />{t.mapLoading[phase]}…</p>
      <div className="skel skel-map" />
      <div className="skel-list">{Array.from({ length: 4 }, (_, i) => <span key={i} className="skel line" style={{ width: `${70 - i * 9}%` }} />)}</div>
    </div>
  );
}
