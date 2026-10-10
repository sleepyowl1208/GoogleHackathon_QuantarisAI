import { z } from "zod";
import { BlueprintError, ClaimSchema, ServiceUnreachableError } from "./layout-api";
import type { DayRow } from "./balance-logic";
import type { OpsBody } from "./ops-api";

const ResourceSchema = z.object({ name: z.enum(["water", "energy", "waste"]), unit: z.string(), per_unit_avg: z.number(), per_unit_best_quartile: z.number(), per_unit_trend_pct: z.number(), total_per_year: z.number(), gap_saving_per_year: z.number(), gap_saving_pct: z.number(), anomaly_days: z.array(z.string()), daily_per_unit: z.array(z.number()), days: z.array(z.string()) });
export const BalanceSchema = z.object({
  days: z.number(), units_per_year: z.number(), resources: z.array(ResourceSchema),
  water: z.object({ intake_m3_year: z.number(), effluent_m3_year: z.number(), effluent_measured: z.boolean(), reuse_saving_m3_year: z.number(), leak_saving_m3_year: z.number(), fresh_after_m3_year: z.number(), discharge_after_m3_year: z.number(), saved_pct: z.number(), saved_inr_year: z.number().nullish() }).nullish(),
  waste: z.object({ waste_kg_year: z.number(), recovered_kg_year: z.number(), landfill_after_kg_year: z.number() }).nullish(),
  notes: z.array(z.string()), claims: z.array(ClaimSchema).default([]),
});
export type Balance = z.infer<typeof BalanceSchema>;
export type Levers = { reuse_pct: number; leak_pct: number; waste_recovery_pct: number };
export type BalanceBody = { industry: string; rows: DayRow[]; levers: Levers; water_unit_cost_inr?: number };

export const BriefSchema = z.object({
  headline: z.string(), insights: z.array(z.object({ title: z.string(), evidence: z.string().default(""), why: z.string().default("") })),
  actions: z.array(z.object({ title: z.string(), how: z.string().default(""), effect: z.enum(["low", "medium", "high"]), based_on: z.string().default("") })), answer: z.string().default(""), facts_used: z.number(), claims: z.array(ClaimSchema).default([]),
});
export type Brief = z.infer<typeof BriefSchema>;
export const InspectSchema = z.object({ verdict: z.enum(["pass", "fail", "unclear"]), summary: z.string(), defects: z.array(z.object({ type: z.string(), where: z.string().default(""), severity: z.enum(["low", "medium", "high"]), confidence: z.number() })), next_step: z.string().default(""), claims: z.array(ClaimSchema).default([]) });
export type Inspection = z.infer<typeof InspectSchema>;
const apiBase = process.env.NEXT_PUBLIC_LAYOUT_API_URL ?? "";

async function post<T>(path: string, body: unknown, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => { throw new ServiceUnreachableError("network"); });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as { detail?: { message?: string } | unknown[] } | undefined;
    const message = payload && !Array.isArray(payload.detail) ? payload.detail?.message : undefined;
    if (message) throw new BlueprintError(message);
    throw new ServiceUnreachableError(String(response.status));
  }
  return schema.parse(await response.json());
}
export const sendBalance = (body: BalanceBody) => post("/api/balance", body, BalanceSchema);
export const sendBrief = (body: { ops: OpsBody; balance?: BalanceBody; question: string; language: "en" | "hi" }) => post("/api/ops-brief", body, BriefSchema);
export const sendInspect = (body: { product: string; industry: string; image: { name: string; mime: string; data_base64: string }; language: "en" | "hi" }) => post("/api/inspect", body, InspectSchema);

export function fileToAttachment(file: File): Promise<{ name: string; mime: string; data_base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => { const url = String(reader.result); resolve({ name: file.name.slice(0, 120), mime: file.type, data_base64: url.slice(url.indexOf(",") + 1) }); };
    reader.readAsDataURL(file);
  });
}
