"use client";
import { Check, PanelLeftClose, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Language } from "@/lib/chat-api";
import type { Dict } from "@/lib/i18n";
import type { Session } from "@/lib/sessions";

export function Sidebar({ sessions, activeId, t, name, language, onNew, onSelect, onDelete, onRename, onName, onLanguage, onClose }: {
  sessions: Session[]; activeId?: string; t: Dict; name: string; language: Language;
  onNew: () => void; onSelect: (id: string) => void; onDelete: (id: string) => void; onRename: (id: string, title: string) => void;
  onName: (name: string) => void; onLanguage: (l: Language) => void; onClose: () => void;
}) {
  const [renaming, setRenaming] = useState<string>();
  const [title, setTitle] = useState("");
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const groups = [{ label: t.today, items: sessions.filter((s) => s.updatedAt >= startOfToday) }, { label: t.earlier, items: sessions.filter((s) => s.updatedAt < startOfToday) }].filter((g) => g.items.length);

  function commitRename(id: string) { if (title.trim()) onRename(id, title); setRenaming(undefined); }

  return (
    <aside className="sidebar" aria-label="Chats">
      <div className="sb-top">
        <span className="qa-brand"><span className="qa-brand-mark" aria-hidden="true">Q</span>QuantarisAI</span>
        <button type="button" className="icon-btn ghost" onClick={onClose} aria-label={t.collapse} title={t.collapse}><PanelLeftClose size={18} /></button>
      </div>
      <button type="button" className="new-btn" onClick={onNew}><Plus size={18} />{t.newDesign}</button>
      <nav className="sb-list">
        {groups.length === 0 ? <p className="sb-empty">{t.noChats}</p> : groups.map((g) => (
          <div key={g.label} className="sb-group">
            <h2 className="sb-heading">{g.label}</h2>
            <ul>
              {g.items.map((s) => (
                <li key={s.id} className={s.id === activeId ? "active" : ""}>
                  {renaming === s.id ? (
                    <span className="sb-rename">
                      <input autoFocus value={title} aria-label={t.rename} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") commitRename(s.id); if (e.key === "Escape") setRenaming(undefined); }} />
                      <button type="button" className="icon-btn ghost" onClick={() => commitRename(s.id)} aria-label={t.rename}><Check size={16} /></button>
                      <button type="button" className="icon-btn ghost" onClick={() => setRenaming(undefined)} aria-label="Cancel"><X size={16} /></button>
                    </span>
                  ) : (
                    <>
                      <button type="button" className="sb-item" onClick={() => onSelect(s.id)} aria-current={s.id === activeId ? "true" : undefined}>
                        <span className="sb-item-title">{s.title || t.untitled}</span>
                        <span className="sb-item-sub">{s.design ? "3D" : s.improvement ? "✦" : "…"}</span>
                      </button>
                      <span className="sb-actions">
                        <button type="button" className="icon-btn ghost" onClick={() => { setTitle(s.title); setRenaming(s.id); }} aria-label={t.rename} title={t.rename}><Pencil size={14} /></button>
                        <button type="button" className="icon-btn ghost" onClick={() => { if (window.confirm(t.removeConfirm)) onDelete(s.id); }} aria-label={t.remove} title={t.remove}><Trash2 size={14} /></button>
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="sb-foot">
        <div className="sb-user">
          <span className="avatar" aria-hidden="true">{(name || "Q").slice(0, 1).toUpperCase()}</span>
          <input value={name} placeholder={t.namePlaceholder} aria-label={t.yourName} maxLength={40} onChange={(e) => onName(e.target.value)} />
        </div>
        <div className="sb-controls">
          <div className="seg" role="group" aria-label="Language">
            <button type="button" aria-pressed={language === "en"} className={language === "en" ? "on" : ""} onClick={() => onLanguage("en")}>EN</button>
            <button type="button" aria-pressed={language === "hi"} className={language === "hi" ? "on" : ""} onClick={() => onLanguage("hi")} lang="hi">हिन्दी</button>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
