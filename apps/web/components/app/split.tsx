"use client";
import { useCallback, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type RefObject } from "react";

const KEY = "quantaris-split";
const MIN = 28, MAX = 78, DEFAULT = 50;
const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n));
function saved(): number { try { const n = Number(window.localStorage.getItem(KEY)); return Number.isFinite(n) && n >= MIN && n <= MAX ? n : DEFAULT; } catch { return DEFAULT; } }

/** How tall the 3D view is compared with the details below it. Dragging the divider changes it, and the choice is remembered. */
export function useSplit(box: RefObject<HTMLDivElement | null>) {
  const [pct, setPct] = useState(() => (typeof window === "undefined" ? DEFAULT : saved()));
  const latest = useRef(pct); // the newest size, so quick repeated key presses build on each other
  const [wide, setWide] = useState(false); // the 3D view takes the whole column height; only the tab bar stays
  const commit = useCallback((n: number) => { const v = clamp(Math.round(n)); latest.current = v; setPct(v); try { window.localStorage.setItem(KEY, String(v)); } catch { /* not remembered, still works */ } }, []);
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const host = box.current; if (!host) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = host.getBoundingClientRect();
    const move = (ev: globalThis.PointerEvent) => commit(((ev.clientY - rect.top) / rect.height) * 100);
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowUp") { e.preventDefault(); commit(latest.current - 4); }
    if (e.key === "ArrowDown") { e.preventDefault(); commit(latest.current + 4); }
    if (e.key === "Home") commit(MIN);
    if (e.key === "End") commit(MAX);
  };
  const style = { ["--split" as string]: `${pct}%` } as CSSProperties;
  return { style, pct, wide, setWide, commit, handle: { onPointerDown, onKeyDown, onDoubleClick: () => commit(latest.current > 60 ? DEFAULT : MAX - 2) } };
}

export function SplitHandle({ pct, handle, label }: { pct: number; handle: ReturnType<typeof useSplit>["handle"]; label: string }) {
  return <div className="split-handle" role="separator" aria-orientation="horizontal" aria-label={label} aria-valuenow={pct} aria-valuemin={MIN} aria-valuemax={MAX} tabIndex={0} {...handle}><span /></div>;
}
