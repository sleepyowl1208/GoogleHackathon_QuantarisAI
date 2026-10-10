import { z } from "zod";
import { BlueprintError, ClaimSchema, ServiceUnreachableError } from "./layout-api";

const Level = z.enum(["low", "medium", "high"]);
export const OPS_AREAS = ["predictive_maintenance", "visual_inspection", "production_optimization", "supply_chain", "demand_forecasting", "waste_reduction", "copilot"] as const;
export type OpsArea = (typeof OPS_AREAS)[number];

export const InsightsSchema = z.object({
  byproduct_flows: z.array(z.object({
    waste: z.string(), source_stage: z.string().nullish(), treatment: z.array(z.string()).default([]),
    products: z.array(z.object({ name: z.string(), use: z.string().default(""), buyer: z.string().default(""), value: Level.default("medium") })).default([]),
    benefit: z.string().default(""), verify: z.string().default(""),
  })).default([]),
  loads: z.array(z.object({ stage_key: z.string(), power: z.number(), water: z.number(), note: z.string().default("") })).default([]),
  water_train: z.array(z.object({ name: z.string(), purpose: z.string().default("") })).default([]),
  resource_actions: z.array(z.object({ resource: z.enum(["power", "water"]), title: z.string(), detail: z.string().default(""), effect: Level, effort: Level })).default([]),
  env_actions: z.array(z.object({ title: z.string(), aspect: z.string().default(""), effect: Level, effort: Level, first_step: z.string().default(""), verify: z.string().default("") })).default([]),
  operations: z.array(z.object({ area: z.enum(OPS_AREAS), applies_at: z.array(z.string()).default([]), what: z.string().default(""), data_needed: z.array(z.string()).default([]), first_step: z.string().default("") })).default([]),
  claims: z.array(ClaimSchema).default([]),
});
export type Insights = z.infer<typeof InsightsSchema>;
export type InsightsBody = { industry: string; location: string; language: "en" | "hi"; stages: { key: string; label: string; equipment: string[]; outputs: string[] }[]; wastes: string[]; context: string };

const apiBase = process.env.NEXT_PUBLIC_LAYOUT_API_URL ?? "";

export async function sendInsights(body: InsightsBody): Promise<Insights> {
  const response = await fetch(`${apiBase}/api/insights`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => { throw new ServiceUnreachableError("network"); });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as { detail?: { message?: string } | unknown[] } | undefined;
    const message = payload && !Array.isArray(payload.detail) ? payload.detail?.message : undefined;
    if (message) throw new BlueprintError(message);
    throw new ServiceUnreachableError(String(response.status));
  }
  return InsightsSchema.parse(await response.json());
}
