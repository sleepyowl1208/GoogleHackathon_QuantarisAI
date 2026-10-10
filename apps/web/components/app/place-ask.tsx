"use client";
import { MapPin } from "lucide-react";
import { useState } from "react";
import type { Dict } from "@/lib/i18n";

/** The place decides the sourcing, land and costs, so until it is known nothing is searched. This asks for it. */
export function PlaceAsk({ t, onSubmit }: { t: Dict; onSubmit: (place: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form className="place-ask" onSubmit={(e) => { e.preventDefault(); if (value.trim().length >= 2) onSubmit(value.trim()); }}>
      <span className="uc-icon"><MapPin size={18} /></span>
      <div>
        <strong>{t.place.title}</strong>
        <p>{t.place.body}</p>
        <div className="place-row">
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={t.place.placeholder} aria-label={t.place.title} maxLength={120} />
          <button type="submit" className="chip strong" disabled={value.trim().length < 2}>{t.place.go}</button>
        </div>
      </div>
    </form>
  );
}
