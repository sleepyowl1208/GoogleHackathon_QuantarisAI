import { biggestStep } from "./insights-logic";
import type { LayoutResult } from "./layout-api";
import type { Session } from "./sessions";

/** QuantarisAI-<slug>-<YYYY-MM-DD>: also used as the document title, which browsers offer as the default PDF file name. */
export function reportFileName(title: string, date: Date): string {
  const slug = title.normalize("NFKD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "report";
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return `QuantarisAI-${slug}-${day}`;
}

/** What the user asked for, in their own words: every message they sent, trimmed. */
export function requestLines(session: Session): string[] {
  return session.messages.filter((m) => m.role === "user" && m.text.trim()).map((m) => m.text.trim().replace(/\s+/g, " ").slice(0, 400)).slice(0, 8);
}

export function steps(design: LayoutResult) { return design.zones.filter((z) => z.step).sort((a, b) => (a.step ?? 0) - (b.step ?? 0)); }
export function builtAreaM2(design: LayoutResult): number { return Math.round(design.zones.reduce((sum, z) => sum + z.area_m2, 0)); }

export type Fact = { key: "plot" | "steps" | "built" | "biggest" | "waste" | "wind" | "solar" | "sourcing" | "byproduct"; value: string };

/** Short facts for the chat summary card. Only what is really known: nothing is shown for data that has not arrived. */
export function summaryFacts(session: Session): Fact[] {
  const out: Fact[] = [];
  const d = session.design;
  if (d) {
    const s = steps(d);
    out.push({ key: "plot", value: `${d.width_m} × ${d.depth_m} m` });
    out.push({ key: "steps", value: s.length ? `${s[0].label} → ${s[s.length - 1].label}` : "—" });
    out.push({ key: "built", value: `${builtAreaM2(d)} m² (${Math.round((builtAreaM2(d) / (d.width_m * d.depth_m)) * 100)}%)` });
    const big = biggestStep(d); if (big) out.push({ key: "biggest", value: `${big.label} · ${big.area_m2.toFixed(0)} m²` });
    if (d.waste_streams.length) out.push({ key: "waste", value: d.waste_streams.map((w) => w.name).slice(0, 3).join(", ") });
  }
  const flows = session.insights?.byproduct_flows.filter((f) => f.products.length) ?? [];
  if (flows.length) out.push({ key: "byproduct", value: flows.slice(0, 2).map((f) => `${f.waste} → ${f.products[0].name}`).join("; ") });
  const site = session.site;
  if (site?.prevailing_wind_label) out.push({ key: "wind", value: site.prevailing_wind_label });
  if (site?.avg_solar_kwh_m2_day != null) out.push({ key: "solar", value: `${site.avg_solar_kwh_m2_day} kWh/m²/day` });
  const places = session.research?.places.filter((p) => p.role !== "site").length;
  if (places) out.push({ key: "sourcing", value: String(places) });
  return out;
}
