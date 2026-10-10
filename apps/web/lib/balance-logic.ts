export type DayRow = { day: string; units: number; water_m3?: number; effluent_m3?: number; energy_kwh?: number; waste_kg?: number };
export type Field = "day" | "units" | "water_m3" | "effluent_m3" | "energy_kwh" | "waste_kg";
export type Parsed = { rows: DayRow[]; mapping: Partial<Record<Field, string>>; missing: Field[]; skipped: number };

// Every plant names its columns differently, so a header is matched by the words in it. Order matters: "effluent" is checked before "water".
const MATCHERS: [Field, RegExp][] = [
  ["day", /\b(date|day|dt)\b|timestamp/i],
  ["effluent_m3", /effluent|waste\s*water|wastewater|discharge/i],
  ["water_m3", /water|kl\b|m3|m³/i],
  ["energy_kwh", /energy|kwh|electric|power/i],
  ["waste_kg", /waste|scrap|reject|sludge|by.?product/i],
  ["units", /unit|production|produced|output|qty|quantity|pieces|pcs|volume|batch/i],
];

export function splitLine(line: string): string[] {
  const out: string[] = []; let cur = ""; let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) { out.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function toIsoDay(text: string): string | undefined {
  const t = text.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);   // dd/mm/yyyy, the usual Indian order
  if (m) { const [, d, mo, y] = m; const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`; return new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) === iso ? iso : undefined; }
  return undefined;
}

export function parseCsv(text: string): Parsed {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const header = splitLine(lines[0] ?? "");
  const mapping: Partial<Record<Field, string>> = {}; const index: Partial<Record<Field, number>> = {}; const scale: Partial<Record<Field, number>> = {};
  header.forEach((h, i) => {
    const hit = MATCHERS.find(([f, re]) => !(f in index) && re.test(h));
    if (!hit) return;
    index[hit[0]] = i; mapping[hit[0]] = h;
    if (/litre|liter|\(l\)|_l$/i.test(h) && hit[0].endsWith("m3")) scale[hit[0]] = 0.001;   // litres to m³
  });
  const missing = (["day", "units"] as Field[]).filter((f) => !(f in index));
  const rows: DayRow[] = []; let skipped = 0;
  if (!missing.length) for (const line of lines.slice(1)) {
    const cells = splitLine(line);
    const day = toIsoDay(cells[index.day!] ?? ""), units = Number((cells[index.units!] ?? "").replace(/,/g, ""));
    if (!day || !(units > 0)) { skipped++; continue; }
    const num = (f: Field) => { const i = index[f]; if (i === undefined) return undefined; const raw = (cells[i] ?? "").replace(/,/g, ""); if (raw === "") return undefined; const v = Number(raw); return Number.isFinite(v) && v >= 0 ? v * (scale[f] ?? 1) : undefined; };
    rows.push({ day, units, water_m3: num("water_m3"), effluent_m3: num("effluent_m3"), energy_kwh: num("energy_kwh"), waste_kg: num("waste_kg") });
  }
  return { rows, mapping, missing, skipped };
}

/** The server accepts at most this many days; a longer file keeps the latest ones. */
export const MAX_DAYS = 800;
export const latest = (rows: DayRow[]) => (rows.length > MAX_DAYS ? [...rows].sort((a, b) => a.day.localeCompare(b.day)).slice(-MAX_DAYS) : rows);
