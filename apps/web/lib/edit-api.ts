import { z } from "zod";
import { BlueprintError, LayoutResultSchema, ServiceUnreachableError, type LayoutResult } from "./layout-api";

const Schema = z.object({ design: LayoutResultSchema, reply: z.string().default(""), changes: z.array(z.string()).default([]), added_zone_ids: z.array(z.string()).default([]) });
export type EditResult = z.infer<typeof Schema>;
const apiBase = process.env.NEXT_PUBLIC_LAYOUT_API_URL ?? "";

/** Asks the planner to change the design as the user said (spoken or typed). The plant is laid out again from the model's new list of steps. */
export async function sendEdit(design: LayoutResult, instruction: string, language: "en" | "hi", site?: { solar?: number | null; windFrom?: number | null }): Promise<EditResult> {
  const response = await fetch(`${apiBase}/api/edit-design`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ design, instruction: instruction.slice(0, 600), language, solar_kwh_m2_day: site?.solar ?? null, wind_from_deg: site?.windFrom ?? null }) }).catch(() => { throw new ServiceUnreachableError("network"); });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as { detail?: { message?: string } | unknown[] } | undefined;
    const message = payload && !Array.isArray(payload.detail) ? payload.detail?.message : undefined;
    if (message) throw new BlueprintError(message);
    throw new ServiceUnreachableError(String(response.status));
  }
  return Schema.parse(await response.json());
}
