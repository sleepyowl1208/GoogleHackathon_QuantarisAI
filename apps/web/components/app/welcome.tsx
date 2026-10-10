"use client";
import { ArrowRight, Factory, Recycle } from "lucide-react";
import { fill, type Dict } from "@/lib/i18n";
import type { Mode } from "@/lib/chat-api";

export function Welcome({ t, name, onPick, onExample }: { t: Dict; name: string; onPick: (mode: Mode) => void; onExample: (mode: Mode, text: string) => void }) {
  const greeting = name.trim() ? fill(t.greetNamed, { name: name.trim() }) : t.greetAnon;
  const [before, after] = name.trim() ? greeting.split(name.trim()) : [greeting, ""];
  return (
    <section className="welcome" aria-label={t.helpTitle}>
      <h1 className="greeting">{before}{name.trim() ? <span className="greeting-name">{name.trim()}</span> : null}{after}</h1>
      <p className="help-title">{t.helpTitle}</p>
      <p className="help-body">{t.helpBody}</p>
      <div className="paths">
        <button type="button" className="path-card" onClick={() => onPick("new")}>
          <span className="path-icon new"><Factory size={26} strokeWidth={1.7} /></span>
          <span className="path-title">{t.cardNewTitle}<ArrowRight size={18} className="path-arrow" /></span>
          <span className="path-body">{t.cardNewBody}</span>
        </button>
        <button type="button" className="path-card" onClick={() => onPick("existing")}>
          <span className="path-icon existing"><Recycle size={26} strokeWidth={1.7} /></span>
          <span className="path-title">{t.cardExistingTitle}<ArrowRight size={18} className="path-arrow" /></span>
          <span className="path-body">{t.cardExistingBody}</span>
        </button>
      </div>
      <div className="try-row">
        <span className="try-label">{t.tryLabel}</span>
        {t.examplesNew.map((text) => <button key={text} type="button" className="chip" onClick={() => onExample("new", text)}>{text}</button>)}
        {t.examplesExisting.map((text) => <button key={text} type="button" className="chip" onClick={() => onExample("existing", text)}>{text}</button>)}
      </div>
    </section>
  );
}
