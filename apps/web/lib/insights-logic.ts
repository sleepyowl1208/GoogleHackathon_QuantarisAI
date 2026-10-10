import type { Insights, OpsArea } from "./insights-api";
import type { LayoutResult } from "./layout-api";
import type { SiteResearch } from "./research-api";

export type DataStatus = "live" | "design" | "needs";
const RANK = { high: 0, medium: 1, low: 2 } as const;

/** Honest data status per capability: what is feeding it today. Only supply chain (research) and design-derived ideas have data now. */
export function dataStatus(area: OpsArea, hasResearch: boolean): DataStatus {
  if (area === "supply_chain") return hasResearch ? "live" : "needs";
  if (area === "waste_reduction" || area === "copilot") return "design";
  return "needs";
}

/** Most valuable and least effortful first. */
export function byImpact<T extends { effect: "low" | "medium" | "high"; effort: "low" | "medium" | "high" }>(items: T[]): T[] {
  return [...items].sort((a, b) => RANK[a.effect] - RANK[b.effect] || RANK[b.effort] - RANK[a.effort]);
}

/** Walking distance along the material route in metres: centre to centre, along the grid (how forklifts and conveyors really run). */
export function routeLengthM(design: LayoutResult): number {
  const byId = new Map(design.zones.map((z) => [z.zone_id, z]));
  let total = 0;
  for (const edge of design.flow) {
    const a = byId.get(edge.from_id), b = byId.get(edge.to_id);
    if (a && b) total += Math.abs(a.x + a.width_m / 2 - (b.x + b.width_m / 2)) + Math.abs(a.y + a.depth_m / 2 - (b.y + b.depth_m / 2));
  }
  return Math.round(total);
}

export function biggestStep(design: LayoutResult) {
  const steps = design.zones.filter((z) => z.step);
  return steps.length ? steps.reduce((m, z) => (z.area_m2 > m.area_m2 ? z : m)) : undefined;
}

export function supplyFacts(research?: SiteResearch) {
  if (!research) return undefined;
  const km = research.flows.map((f) => f.distance_km).filter((n): n is number => typeof n === "number");
  return { sources: research.places.filter((p) => p.role === "raw_material" || p.role === "supplier").length, routes: research.flows.length, farthestKm: km.length ? Math.max(...km) : undefined };
}

export function wasteFacts(insights: Insights | undefined, design: LayoutResult) {
  const flows = insights?.byproduct_flows ?? [];
  return { streams: Math.max(design.waste_streams.length, flows.length), routed: flows.filter((f) => f.products.length > 0).length };
}

export function stageRequestBody(design: LayoutResult) {
  return design.zones.filter((z) => z.step).sort((a, b) => (a.step ?? 0) - (b.step ?? 0)).slice(0, 14).map((z) => ({ key: z.zone_id.slice(0, 40), label: z.label.slice(0, 80), equipment: z.equipment.slice(0, 8), outputs: z.outputs.slice(0, 6) }));
}
