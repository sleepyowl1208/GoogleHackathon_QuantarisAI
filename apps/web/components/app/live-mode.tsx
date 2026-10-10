"use client";
import { Loader2, Mic, MicOff, Send, Volume2, VolumeX, X, MessagesSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { speak, speechSupported, stopSpeaking, useListening } from "@/components/blueprint/use-speech";
import type { Language } from "@/lib/chat-api";
import type { Dict } from "@/lib/i18n";
import { parseCommand, type Command, type StepRef } from "@/lib/voice-commands";

type Line = { id: number; who: "you" | "plant"; text: string; changes?: string[]; error?: boolean };

/** Talk to the plant: say or type what to change ("make it double storey") or where to look ("open the packing section"). Short commands act at once; design changes go to the planner. */
export function LiveMode({ t, lang, steps, selectedId, onCommand, onEdit, onClose }: {
  t: Dict; lang: Language; steps: StepRef[]; selectedId?: string; onCommand: (c: Command) => string; onEdit: (text: string) => Promise<{ reply: string; changes: string[] }>; onClose: () => void;
}) {
  const [lines, setLines] = useState<Line[]>([{ id: 0, who: "plant", text: t.live.hello }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [mic, setMic] = useState(speechSupported());
  const [voice, setVoice] = useState(true);
  const speaking = useRef(false), seq = useRef(1), end = useRef<HTMLDivElement>(null), busyRef = useRef(false);
  const locale = lang === "hi" ? "hi-IN" : "en-IN";

  const say = (text: string) => { setLines((l) => [...l, { id: seq.current++, who: "plant", text }]); };
  const tell = (text: string) => { if (!voice) return; speaking.current = true; speak(text, locale, () => setTimeout(() => { speaking.current = false; }, 500)); };

  async function handle(text: string) {
    const clean = text.trim(); if (!clean || busyRef.current) return;
    setLines((l) => [...l, { id: seq.current++, who: "you", text: clean }]);
    const cmd = parseCommand(clean, steps, selectedId);
    if (cmd) { const ack = onCommand(cmd); say(ack); tell(ack); return; }
    busyRef.current = true; setBusy(true);
    try {
      const res = await onEdit(clean);
      const reply = res.reply || t.live.done;
      setLines((l) => [...l, { id: seq.current++, who: "plant", text: reply, changes: res.changes }]); tell(reply);
    } catch (error) {
      const msg = error instanceof Error && error.message && !/^\d+$/.test(error.message) && error.message !== "network" ? error.message : t.live.failed;
      setLines((l) => [...l, { id: seq.current++, who: "plant", text: msg, error: true }]); tell(msg);
    } finally { busyRef.current = false; setBusy(false); }
  }

  const { listening, interim, error } = useListening({ active: mic, lang: locale, onFinal: (text) => { void handle(text); }, ignoring: () => speaking.current || busyRef.current });
  useEffect(() => { end.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [lines.length, busy]);
  useEffect(() => () => stopSpeaking(), []);
  const status = error === "denied" ? t.live.denied : error === "unsupported" ? t.live.unsupported : busy ? t.live.thinking : listening ? (interim ? `“${interim}”` : t.live.listening) : mic ? t.live.starting : t.live.micOff;

  return (
    <aside className="live-panel" aria-label={t.live.title}>
      <header>
        <MessagesSquare size={16} /><strong>{t.live.title}</strong>
        <button type="button" className={`icon-btn ghost ${mic && listening ? "live-on" : ""}`} onClick={() => setMic((m) => !m)} aria-pressed={mic} aria-label={mic ? t.live.micStop : t.live.micStart} title={mic ? t.live.micStop : t.live.micStart} disabled={!speechSupported()}>{mic ? <Mic size={16} /> : <MicOff size={16} />}</button>
        <button type="button" className="icon-btn ghost" onClick={() => { setVoice((v) => !v); stopSpeaking(); }} aria-pressed={voice} aria-label={voice ? t.live.voiceOff : t.live.voiceOn} title={voice ? t.live.voiceOff : t.live.voiceOn}>{voice ? <Volume2 size={16} /> : <VolumeX size={16} />}</button>
        <button type="button" className="icon-btn ghost" onClick={onClose} aria-label={t.live.close} title={t.live.close}><X size={16} /></button>
      </header>
      <div className="live-log" role="log" aria-live="polite">
        {lines.map((l) => (
          <div key={l.id} className={`live-line ${l.who} ${l.error ? "error" : ""}`}>
            <p>{l.text}</p>
            {l.changes?.length ? <ul>{l.changes.map((c) => <li key={c}>{c}</li>)}</ul> : null}
          </div>
        ))}
        {busy ? <div className="live-line plant"><p><Loader2 size={14} className="spin" /> {t.live.thinking}</p></div> : null}
        <div ref={end} />
      </div>
      {lines.length <= 2 ? <div className="live-chips">{t.live.examples.map((ex) => <button key={ex} type="button" className="chip" onClick={() => void handle(ex)} disabled={busy}>{ex}</button>)}</div> : null}
      <p className={`live-status ${error ? "bad" : ""}`} role="status">{status}</p>
      <form className="live-form" onSubmit={(e) => { e.preventDefault(); const text = draft; setDraft(""); void handle(text); }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t.live.placeholder} aria-label={t.live.placeholder} maxLength={500} disabled={busy} />
        <button type="submit" className="send-btn" disabled={busy || !draft.trim()} aria-label={t.send}><Send size={16} /></button>
      </form>
    </aside>
  );
}
