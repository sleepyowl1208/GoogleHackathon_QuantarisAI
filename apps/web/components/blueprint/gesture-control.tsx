"use client";
import { Eye, EyeOff, Hand as HandIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GestureEngine, type GestureEvent, type Hand } from "@/lib/gesture-logic";
import type { Dict } from "@/lib/i18n";

type Status = "loading" | "searching" | "tracking" | "denied" | "nocam" | "failed";
const BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];

/** Hand control for the 3D view. The camera picture is processed in this browser by MediaPipe (model and runtime are served from this site), and nothing is recorded or sent anywhere. */
export function GestureControl({ onEvent, onClose, t }: { onEvent: (e: GestureEvent) => void; onClose: () => void; t: Dict }) {
  const video = useRef<HTMLVideoElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [showCam, setShowCam] = useState(true);
  const emit = useRef(onEvent);
  useEffect(() => { emit.current = onEvent; }, [onEvent]);

  useEffect(() => {
    let stopped = false, raf = 0; let stream: MediaStream | undefined; let landmarker: { detectForVideo: (v: HTMLVideoElement, t: number) => { landmarks: Hand[] }; close: () => void } | undefined;
    const engine = new GestureEngine();
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) { setStatus("nocam"); return; }
        try { stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false }); }
        catch (error) { setStatus((error as DOMException).name === "NotFoundError" ? "nocam" : "denied"); return; }
        if (stopped) { stream.getTracks().forEach((x) => x.stop()); return; }
        const el = video.current!; el.srcObject = stream; await el.play().catch(() => {});
        const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
        const files = await FilesetResolver.forVisionTasks("/mediapipe");
        const make = (delegate: "GPU" | "CPU") => HandLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: "/mediapipe/hand_landmarker.task", delegate }, runningMode: "VIDEO", numHands: 2 });
        landmarker = await make("GPU").catch(() => make("CPU"));
        if (stopped) { landmarker.close(); return; }
        setStatus("searching");
        let seen = false, last = -1;
        const loop = () => {
          raf = requestAnimationFrame(loop);
          if (el.readyState < 2 || el.currentTime === last) return;
          last = el.currentTime;
          const hands = landmarker!.detectForVideo(el, performance.now()).landmarks as Hand[];
          const events = engine.update(hands, performance.now());
          for (const e of events) emit.current(e);
          if ((hands.length > 0) !== seen) { seen = hands.length > 0; setStatus(seen ? "tracking" : "searching"); }
          const c = overlay.current; const g = c?.getContext("2d");
          if (c && g) {
            g.clearRect(0, 0, c.width, c.height); g.lineWidth = 2; g.strokeStyle = "#FF9933"; g.fillStyle = "#FFFFFF";
            for (const h of hands) { for (const [a, b] of BONES) { g.beginPath(); g.moveTo(h[a].x * c.width, h[a].y * c.height); g.lineTo(h[b].x * c.width, h[b].y * c.height); g.stroke(); } for (const p of h) { g.beginPath(); g.arc(p.x * c.width, p.y * c.height, 2.5, 0, 6.3); g.fill(); } }
          }
        };
        raf = requestAnimationFrame(loop);
      } catch (error) { console.warn("hand control failed", error); if (!stopped) setStatus("failed"); }
    })();
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((x) => x.stop()); try { landmarker?.close(); } catch { /* already closed */ } emit.current({ type: "pointer", x: 0, y: 0, visible: false }); };
  }, []);

  const message: Record<Status, string> = { loading: t.ix.handLoading, searching: t.ix.handShow, tracking: t.ix.handSeen, denied: t.ix.handDenied, nocam: t.ix.handNoCam, failed: t.ix.handFail };
  const problem = status === "denied" || status === "nocam" || status === "failed";
  return (
    <aside className={`hand-panel ${status}`} aria-label={t.ix.handBtn}>
      <header><HandIcon size={15} /><strong>{t.ix.handBtn}</strong>{problem ? null : <button type="button" className="icon-btn ghost" onClick={() => setShowCam((v) => !v)} aria-pressed={!showCam} aria-label={showCam ? t.live.hideCam : t.live.showCam} title={showCam ? t.live.hideCam : t.live.showCam}>{showCam ? <EyeOff size={15} /> : <Eye size={15} />}</button>}<button type="button" className="icon-btn ghost" onClick={onClose} aria-label={t.ix.handStop} title={t.ix.handStop}><X size={15} /></button></header>
      {problem ? null : <div className={`hand-cam ${showCam ? "" : "tucked"}`}><video ref={video} muted playsInline /><canvas ref={overlay} width={320} height={240} /></div>}
      <p className={`hand-status ${problem ? "bad" : ""}`} role="status">{message[status]}</p>
      {problem ? null : <ul className="hand-help">{t.ix.handHelp.map((line) => <li key={line}>{line}</li>)}</ul>}
      <p className="muted small">{t.ix.handPrivacy}</p>
    </aside>
  );
}
