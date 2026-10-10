"use client";
import { ArrowUp, FileText, Loader2, Check, Paperclip, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Language, Mode } from "@/lib/chat-api";
import type { Dict } from "@/lib/i18n";
import type { Message } from "@/lib/sessions";
import { VoiceInput } from "@/components/blueprint/voice-input";
import { ATTACH_EVENT } from "./upload-cta";
import { Welcome } from "./welcome";

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
const MAX_BYTES = 4_000_000;

export function Conversation({ t, lang, name, mode, messages, busy, phase, showWelcome, summary, onPickMode, onExample, onSend }: {
  summary?: ReactNode; t: Dict; lang: Language; name: string; mode?: Mode; messages: Message[]; busy: boolean; phase: number; showWelcome: boolean;
  onPickMode: (mode: Mode) => void; onExample: (mode: Mode, text: string) => void; onSend: (text: string, files: File[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string>();
  const [sentCount, setSentCount] = useState(0);
  const area = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  // The "add photos" invitations elsewhere on the page open this composer's own file picker.
  useEffect(() => {
    const open = () => { setDraft((d) => d || t.ix.attachPrefill); picker.current?.click(); area.current?.focus(); };
    window.addEventListener(ATTACH_EVENT, open); return () => window.removeEventListener(ATTACH_EVENT, open);
  }, [t.ix.attachPrefill]);
  useEffect(() => { const el = area.current; if (el) { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 180)}px`; } }, [draft]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages.length, busy, phase]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files]; setFileError(undefined);
    for (const file of Array.from(list)) {
      if (!ALLOWED.includes(file.type)) { setFileError(t.fileType); continue; }
      if (file.size > MAX_BYTES) { setFileError(t.fileTooBig); continue; }
      if (next.length >= 3) { setFileError(t.tooMany); break; }
      next.push(file);
    }
    setFiles(next);
    if (picker.current) picker.current.value = "";
  }
  function submit() {
    if (busy || (!draft.trim() && !files.length)) return;
    onSend(draft, files); setDraft(""); setFiles([]); setFileError(undefined); setSentCount((n) => n + 1);
  }
  const lastSummaryId = [...messages].reverse().find((m) => m.summary)?.id; // earlier designs in the same chat do not repeat the card
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const progress = mode === "existing" ? t.busyExisting : t.busyNew;
  const placeholder = showWelcome ? t.placeholderDefault : messages.length > 1 ? t.askAbout : mode === "existing" ? t.placeholderExisting : mode === "new" ? t.placeholderNew : t.placeholderDefault;

  return (
    <div className={`conversation ${showWelcome ? "is-welcome" : ""}`}>
      <div className="thread" role="log" aria-live="polite">
        {showWelcome ? <Welcome t={t} name={name} onPick={onPickMode} onExample={onExample} /> : (
          <div className="thread-inner">
            {messages.map((m) => (
              <div key={m.id} className={`msg ${m.role}${m.error ? " error" : ""}`}>
                {m.role === "assistant" ? <span className="msg-avatar" aria-hidden="true">Q</span> : null}
                <div className="msg-main">
                  <div className="bubble">{m.text}</div>
                  {m.sources?.length ? <p className="msg-sources"><span>{t.place.sources}:</span>{m.sources.map((x) => <a key={x.url} href={x.url} target="_blank" rel="noopener noreferrer">{x.title}</a>)}</p> : null}
                  {m.id === lastSummaryId ? summary : null}
                  {m.files?.length ? <ul className="msg-files">{m.files.map((f) => <li key={f}><FileText size={14} />{f}</li>)}</ul> : null}
                  {m === lastAssistant && !busy && m.suggestions?.length ? <div className="chips">{m.suggestions.map((s) => <button key={s} type="button" className="chip" onClick={() => onSend(s, [])}>{s}</button>)}</div> : null}
                </div>
              </div>
            ))}
            {busy ? (
              <div className="msg assistant">
                <span className="msg-avatar" aria-hidden="true">Q</span>
                <div className="msg-main"><ol className="progress" aria-live="polite">
                  {progress.map((label, i) => <li key={label} className={i < phase ? "done" : i === phase ? "now" : ""}>{i < phase ? <Check size={15} /> : i === phase ? <Loader2 size={15} className="spin" /> : <span className="dot" />}{label}</li>)}
                </ol></div>
              </div>
            ) : null}
            <div ref={end} />
          </div>
        )}
      </div>

      <div className="composer-wrap">
        <div className="qa-composer">
          {files.length || fileError ? (
            <div className="file-row">
              {files.map((f) => <span key={f.name} className="file-chip"><FileText size={14} />{f.name}<button type="button" onClick={() => setFiles(files.filter((x) => x !== f))} aria-label={t.removeFile}><X size={13} /></button></span>)}
              {fileError ? <span className="file-error" role="alert">{fileError}</span> : null}
            </div>
          ) : null}
          <textarea ref={area} rows={1} value={draft} placeholder={placeholder} aria-label={placeholder} maxLength={1500} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }} />
          <div className="composer-actions">
            <input ref={picker} type="file" hidden multiple accept={ALLOWED.join(",")} onChange={(e) => addFiles(e.target.files)} data-testid="file-input" />
            <button type="button" className="icon-btn" onClick={() => picker.current?.click()} aria-label={t.attach} title={t.attach}><Paperclip size={19} /></button>
            <VoiceInput text={draft} onText={setDraft} lang={lang} t={t} stopKey={sentCount} />
            <span className="spacer" />
            <button type="button" className="send-btn" onClick={submit} disabled={busy || (!draft.trim() && !files.length)} aria-label={t.send}><ArrowUp size={20} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
