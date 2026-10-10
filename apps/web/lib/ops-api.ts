import { z } from "zod";
import { BlueprintError, ClaimSchema, ServiceUnreachableError } from "./layout-api";

const nums = z.array(z.number());
const SignalSchema = z.object({ name: z.string(), unit: z.string(), latest: z.number(), baseline: z.number(), limit: z.number(), z: z.number(), days_to_limit: z.number().nullish(), daily: nums, recent: nums });
const MachineSchema = z.object({ machine_id: z.string(), step_key: z.string(), step_label: z.string(), name: z.string(), risk: z.number(), status: z.enum(["ok", "watch", "critical", "scheduled"]), finding: z.string(), signals: z.array(SignalSchema) });
const StationSchema = z.object({ step_key: z.string(), label: z.string(), capacity_uph: z.number(), avg_uph: z.number(), utilization_pct: z.number(), availability_pct: z.number(), downtime_h: z.number(), yield_loss_pct: z.number(), waste_kg: z.number() });
const SeriesPair = { series_baseline: nums, series_ai: nums };

export const OpsPackSchema = z.object({
  data_source: z.literal("simulated"), days: z.number(),
  machines: z.array(MachineSchema),
  alerts: z.array(z.object({ machine_id: z.string(), step_key: z.string(), severity: z.enum(["watch", "critical"]), title: z.string(), detail: z.string(), days_to_limit: z.number().nullish() })),
  production: z.object({ stations: z.array(StationSchema), throughput_uph: z.number(), design_uph: z.number(), bottleneck_key: z.string(), oee_pct: z.number(), availability_pct: z.number(), performance_pct: z.number(), quality_pct: z.number(), daily_output: nums, what_if: z.array(z.object({ label: z.string(), step_key: z.string(), throughput_uph: z.number(), gain_pct: z.number() })) }),
  quality: z.object({ inspected: z.number(), defect_rate_pct: z.number(), by_type: z.array(z.object({ type: z.string(), count: z.number(), pct: z.number() })), daily_rate: nums, drift: z.object({ type: z.string(), since_day: z.number(), from_pct: z.number(), to_pct: z.number(), likely_step_key: z.string().nullish(), likely_machine_id: z.string().nullish() }).nullish() }),
  demand: z.object({ history: nums, forecast: z.array(z.object({ week: z.number(), p50: z.number(), p10: z.number(), p90: z.number() })), mape_pct: z.number(), growth_pct_year: z.number(), peak_week: z.number(), peak_p50: z.number(), season_note: z.string(), unit: z.string() }),
  supply: z.object({ lead_time_days: z.number(), order_by_week: z.number().nullish(), risks: z.array(z.object({ title: z.string(), detail: z.string(), level: z.enum(["low", "medium", "high"]) })), sources_used: z.number() }),
  emissions: z.object({
    smoke: z.object({ baseline_opacity_pct: z.number(), with_ai_opacity_pct: z.number(), current_opacity_pct: z.number(), baseline_fuel_index: z.number(), with_ai_fuel_index: z.number(), fuel_saving_pct: z.number(), ...SeriesPair }),
    effluent: z.object({ limit_mg_l: z.number(), cod_in_mg_l: z.number(), baseline_out_mg_l: z.number(), with_ai_out_mg_l: z.number(), current_out_mg_l: z.number(), baseline_exceed_hours: z.number(), with_ai_exceed_hours: z.number(), chemical_saving_pct: z.number(), ...SeriesPair }),
    combustion_ai: z.boolean(), etp_ai: z.boolean(), assumptions: z.array(z.string()),
  }),
  claims: z.array(ClaimSchema).default([]),
});
export type OpsPack = z.infer<typeof OpsPackSchema>;
export type OpsAction = { type: "schedule_maintenance" | "ai_control" | "add_capacity"; target: string; value?: number };
export type OpsBody = { industry: string; location: string; stages: { key: string; label: string; equipment: string[]; area_m2: number }[]; sources: { name: string; km?: number }[]; actions: OpsAction[]; language: "en" | "hi" };
const apiBase = process.env.NEXT_PUBLIC_LAYOUT_API_URL ?? "";

export async function sendOps(body: OpsBody): Promise<OpsPack> {
  const response = await fetch(`${apiBase}/api/ops`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => { throw new ServiceUnreachableError("network"); });
  if (!response.ok) throw response.status === 422 ? new BlueprintError("bad request") : new ServiceUnreachableError(String(response.status));
  return OpsPackSchema.parse(await response.json());
}

/** Toggling an action twice removes it; the same maintenance target is never listed twice. */
export function toggleAction(actions: OpsAction[], next: OpsAction): OpsAction[] {
  const same = (a: OpsAction) => a.type === next.type && a.target === next.target;
  return actions.some(same) ? actions.filter((a) => !same(a)) : [...actions, next];
}
