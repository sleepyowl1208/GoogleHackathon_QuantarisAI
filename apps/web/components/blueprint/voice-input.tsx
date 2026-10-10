"use client";
import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Language } from "@/lib/chat-api";
import type { Dict } from "@/lib/i18n";

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechEvent = { results: ArrayLike<SpeechResult> };
interface Recognizer { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: SpeechEvent) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null; start(): void; stop(): void; abort(): void }
type RecognizerConstructor = new () => Recognizer;

function recognizerConstructor(): RecognizerConstructor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognizerConstructor; webkitSpeechRecognition?: RecognizerConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}
const supported = () => Boolean(recognizerConstructor());
const noSubscription = () => () => {};
const speechLocale: Record<Language, string> = { en: "en-IN", hi: "hi-IN" };

/** Dictation for the composer. Uses the browser's own speech service (in Chrome the audio is processed by Google), so nothing passes through our servers. */
export function VoiceInput({ text, onText, lang, t, stopKey = 0 }: { text: string; onText: (next: string) => void; lang: Language; t: Dict; stopKey?: number }) {
  const available = useSyncExternalStore(noSubscription, supported, () => false);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState<string>();
  const recognizer = useRef<Recognizer | null>(null);
  const base = useRef("");
  useEffect(() => () => recognizer.current?.abort(), []);
  // Sending a message ends the dictation for good: the mic is stopped and detached so nothing it hears afterwards can refill the box.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const live = recognizer.current;
    if (!live) return;
    live.onresult = null; live.onerror = null; live.onend = null;
    try { live.abort(); } catch { /* already stopped */ }
    recognizer.current = null; base.current = ""; setListening(false); setMessage(undefined);
  }, [stopKey]);

  const errorText: Record<string, string> = { "not-allowed": t.voiceBlocked, "service-not-allowed": t.voiceBlocked, "no-speech": t.voiceNoSpeech, "audio-capture": t.voiceNoMic, network: t.voiceNetwork };

  function start() {
    const Ctor = recognizerConstructor();
    if (!Ctor) return;
    const instance = new Ctor();
    instance.lang = speechLocale[lang]; instance.continuous = true; instance.interimResults = true;
    base.current = text && !/\s$/.test(text) ? `${text} ` : text;
    instance.onresult = (event) => { if (recognizer.current !== instance) return; const spoken = Array.from(event.results).map((r) => r[0].transcript).join(" ").replace(/\s+/g, " ").trim(); onText(base.current + spoken); };
    instance.onerror = (event) => { setMessage(errorText[event.error] ?? t.voiceFail); };
    instance.onend = () => { setListening(false); recognizer.current = null; };
    recognizer.current = instance; setMessage(undefined); setListening(true);
    try { instance.start(); } catch { setListening(false); setMessage(t.voiceFail); }
  }

  return (
    <>
      <button type="button" className={`icon-btn mic ${listening ? "on" : ""}`} disabled={!available} aria-pressed={listening} title={available ? (listening ? t.stopSpeak : t.speak) : t.voiceUnsupported}
        aria-label={listening ? t.stopSpeak : t.speak} onClick={() => (listening ? recognizer.current?.stop() : start())}>
        {listening ? <Square size={16} fill="currentColor" /> : <Mic size={19} />}
      </button>
      <span className="voice-status" role="status" aria-live="polite">{listening ? t.listening : message ?? (available ? "" : t.voiceUnsupported)}</span>
    </>
  );
}
