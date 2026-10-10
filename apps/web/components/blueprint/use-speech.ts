"use client";
import { useEffect, useRef, useState } from "react";

type Result = { isFinal: boolean; 0: { transcript: string } };
type SpeechEvent = { resultIndex: number; results: ArrayLike<Result> };
interface Recognizer { lang: string; continuous: boolean; interimResults: boolean; onresult: ((e: SpeechEvent) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null; start(): void; abort(): void }
type Ctor = new () => Recognizer;
const ctor = (): Ctor | undefined => { const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor }; return w.SpeechRecognition ?? w.webkitSpeechRecognition; };
export const speechSupported = () => typeof window !== "undefined" && Boolean(ctor());

/** Continuous listening for the live mode: every finished sentence is passed on; the browser's own speech service is used, so nothing goes through our servers. */
export function useListening({ active, lang, onFinal, ignoring }: { active: boolean; lang: string; onFinal: (text: string) => void; ignoring: () => boolean }) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [denied, setDenied] = useState(false);
  const unsupported = typeof window !== "undefined" && !ctor();
  const final = useRef(onFinal), skip = useRef(ignoring);
  useEffect(() => { final.current = onFinal; skip.current = ignoring; });
  useEffect(() => {
    if (!active || unsupported) return;
    const Ctor = ctor()!;
    let stopped = false, rec: Recognizer | undefined, timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      rec = new Ctor(); rec.lang = lang; rec.continuous = true; rec.interimResults = true;
      rec.onresult = (e) => {
        let live = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const text = e.results[i][0].transcript.trim();
          if (e.results[i].isFinal) { if (text && !skip.current()) final.current(text); } else live += `${text} `;
        }
        setInterim(skip.current() ? "" : live.trim());
      };
      rec.onerror = (e) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") { setDenied(true); stopped = true; } };
      rec.onend = () => { setListening(false); setInterim(""); if (!stopped) timer = setTimeout(start, 300); }; // the browser ends a session every so often; listening simply resumes
      try { rec.start(); setListening(true); } catch { /* already started */ }
    };
    start();
    return () => { stopped = true; if (timer) clearTimeout(timer); if (rec) { rec.onresult = null; rec.onend = null; rec.onerror = null; try { rec.abort(); } catch { /* stopped */ } } setListening(false); setInterim(""); setDenied(false); };
  }, [active, lang, unsupported]);
  return { listening, interim, error: unsupported ? ("unsupported" as const) : denied ? ("denied" as const) : undefined };
}

export function speak(text: string, lang: string, done?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) { done?.(); return; }
  const u = new SpeechSynthesisUtterance(text); u.lang = lang;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  if (voice) u.voice = voice;
  u.onend = () => done?.(); u.onerror = () => done?.();
  try { window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch { done?.(); } // a speech problem must never break the page
}
export const stopSpeaking = () => { if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel(); };
