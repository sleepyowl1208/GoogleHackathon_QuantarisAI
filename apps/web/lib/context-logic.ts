import { formatRange } from "./costs-api";
import { distanceOf, nearestFirst } from "./map-logic";
import type { Session } from "./sessions";

const CAP = 5800;
const clean = (s: string, n: number) => s.replace(/\s+/g, " ").trim().slice(0, n);

/** Do two ways of writing a place mean the same place? "Jhansi" and "Jhansi, Uttar Pradesh" do. */
export function sameLocation(a?: string | null, b?: string | null): boolean {
  const norm = (x?: string | null) => (x ?? "").toLowerCase().replace(/[^\p{L}\p{N}\s,]/gu, "").split(",")[0].trim();
  const x = norm(a), y = norm(b);
  return Boolean(x) && Boolean(y) && (x === y || x.startsWith(y) || y.startsWith(x));
}

/**
 * What the assistant is told about the plan on screen with every message: the design, the place, the sourcing found (nearest first, with distances),
 * costs, best practices and measured conditions. The more of this it has, the less it has to guess when the owner asks "why is this here?".
 */
export function buildContext(s: Session): string | null {
  const parts: string[] = [];
  const where = s.location ?? s.design?.location ?? s.improvement?.as_is_layout?.location ?? "";
  if (s.design) {
    const d = s.design;
    const steps = d.zones.filter((z) => z.step).sort((a, b) => (a.step ?? 0) - (b.step ?? 0)).map((z) => z.label).join(", ");
    parts.push(`Design: ${d.label}${where ? ` in ${where}` : ""}. Plot ${d.width_m} x ${d.depth_m} m${d.levels > 1 ? ", two floors" : ""}. Steps: ${steps}. Waste: ${d.waste_streams.map((w) => w.name).join(", ")}.`);
  } else if (s.improvement) {
    parts.push(`Existing operation${where ? ` in ${where}` : ""}: ${clean(s.improvement.business, 300)}. Ideas: ${s.improvement.opportunities.map((o) => o.title).join(", ")}. Problems: ${s.improvement.hotspots.map((h) => h.area).join(", ")}.`);
  } else return null;
  if (where) parts.push(`The factory is at (or will be at): ${where}. Prefer nearby sources and local options.`);
  const site = s.site;
  if (site) parts.push(`Measured at the site: ${[site.temperature_c != null ? `${site.temperature_c} C` : "", site.prevailing_wind_label ? `wind mostly from ${site.prevailing_wind_label}` : "", site.avg_solar_kwh_m2_day != null ? `${site.avg_solar_kwh_m2_day} kWh/m2/day sunshine` : "", site.aqi_label ? `air quality ${site.aqi_label}` : ""].filter(Boolean).join(", ")}.`);
  const r = s.research;
  if (r) {
    const inputs = nearestFirst(r, r.places.filter((p) => p.role === "raw_material" || p.role === "supplier")).slice(0, 7).map((p) => { const km = distanceOf(r, p); return `${p.name}${p.state ? ` (${[p.locality, p.state].filter(Boolean).join(", ")})` : ""}${km != null ? ` ${km} km` : ""}${p.material ? ` for ${p.material}` : ""}`; });
    if (inputs.length) parts.push(`Sourcing found, nearest first: ${inputs.join("; ")}.`);
    const others = [["Existing plants", r.places.filter((p) => p.role === "facility").slice(0, 4)], ["Markets", r.places.filter((p) => p.role === "market").slice(0, 3)], ["By-product buyers", r.places.filter((p) => p.role === "byproduct_buyer").slice(0, 3)]] as const;
    for (const [label, list] of others) if (list.length) parts.push(`${label}: ${list.map((p) => `${p.name} (${[p.locality, p.state].filter(Boolean).join(", ")})`).join("; ")}.`);
    if (r.discoveries.length) parts.push(`Worth knowing: ${r.discoveries.slice(0, 4).map((d) => `${d.kind}: ${clean(d.title, 90)}${d.body ? ` - ${clean(d.body, 120)}` : ""}`).join("; ")}.`);
  }
  const c = s.costs;
  if (c) {
    const total = formatRange(c.total_low_inr, c.total_high_inr);
    parts.push(`Costs found (indicative web figures): ${total ? `machines about ${total} for ${c.priced} of ${c.requested} priced` : "no machine price found"}. Land options: ${c.land.slice(0, 3).map((l) => `${l.place}${l.price_note && !/not found/i.test(l.price_note) ? ` ${clean(l.price_note, 40)}` : ""}`).join("; ") || "none"}. Suppliers named: ${[...new Set(c.machines.flatMap((m) => m.suppliers.map((x) => x.name)))].slice(0, 5).join(", ") || "none"}.`);
  }
  const pr = s.practices;
  if (pr?.practices.length) parts.push(`Best practices found: ${pr.practices.slice(0, 5).map((p) => `${p.title} (${p.countries})`).join("; ")}.`);
  const flows = s.insights?.byproduct_flows.filter((f) => f.products.length).slice(0, 3);
  if (flows?.length) parts.push(`By-product routes: ${flows.map((f) => `${f.waste} to ${f.products[0].name}`).join("; ")}.`);
  const envs = Object.values(s.stepEnvs ?? {}).slice(0, 3);
  if (envs.length) parts.push(`Water and waste handling already explained for: ${envs.map((e) => e.step_key).join(", ")}.`);
  return parts.join("\n").slice(0, CAP);
}

/** Is the user saying where THEIR factory is or will be ("I want to start in Jhansi"), as opposed to just naming a place ("what about Andhra Pradesh?")? */
export function statesOwnLocation(text: string): boolean {
  return /\b(my|our|the)\s+(factory|plant|unit|mill|business|farm|site)\b|\b(start|starting|set\s*up|setting up|open|opening|build|building|located|based|situated)\b[^.?!]{0,30}\b(in|at|near)\b|मेरी\s*(फैक्ट्री|यूनिट)|शुरू/i.test(text);
}

/** Decide whether a place the assistant picked up in the owner's message should replace the plan's place. */
export function shouldRelocate(current: string | undefined, said: string | null | undefined, message: string): boolean {
  if (!said || said.trim().length < 3) return false;
  if (sameLocation(current, said)) return false;
  return !current?.trim() || statesOwnLocation(message);
}
