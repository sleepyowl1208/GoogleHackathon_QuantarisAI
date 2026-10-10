"use client";
import { Camera } from "lucide-react";
import type { Dict } from "@/lib/i18n";

export const ATTACH_EVENT = "qa:attach";

/** Optional invitation to show the real factory. It opens the chat's own file picker, so uploads go through the same checks as any attachment. */
export function UploadCta({ t, compact = false }: { t: Dict; compact?: boolean }) {
  return (
    <aside className={`upload-cta ${compact ? "compact" : ""}`}>
      <span className="uc-icon"><Camera size={18} /></span>
      <div>
        <strong>{t.ix.uploadTitle}</strong>
        <p>{t.ix.uploadBody}</p>
        {compact ? null : <p className="muted small">{t.ix.uploadHow}</p>}
        <button type="button" className="chip strong" onClick={() => window.dispatchEvent(new Event(ATTACH_EVENT))}><Camera size={14} />{t.ix.uploadBtn}</button>
      </div>
    </aside>
  );
}
