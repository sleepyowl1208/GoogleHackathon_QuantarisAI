import { z } from "zod";
import { BlueprintError, ClaimSchema, ServiceUnreachableError } from "./layout-api";

export const StepEnvSchema = z.object({
  step_key: z.string(), uses_water: z.boolean().default(false), water_in: z.string().default(""), wastewater: z.string().default(""), outlet: z.string().default(""), route: z.array(z.string()).default([]),
  treatment: z.array(z.string()).default([]), reuse: z.string().default(""), discharge: z.string().default(""), solid_waste: z.string().default(""), solid_to: z.string().default(""), air_noise: z.string().default(""),
  safeguards: z.array(z.string()).default([]), plant_level: z.string().default(""), check: z.string().default(""), claims: z.array(ClaimSchema).default([]),
});
export type StepEnv = z.infer<typeof StepEnvSchema>;
export type StepEnvBody = { industry: string; location: string; stages: { key: string; label: string; equipment: string[]; outputs: string[] }[]; step_key: string; wastes: string[]; language: "en" | "hi" };
const apiBase = process.env.NEXT_PUBLIC_LAYOUT_API_URL ?? "";

export async function sendStepEnv(body: StepEnvBody): Promise<StepEnv> {
  const response = await fetch(`${apiBase}/api/step-environment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => { throw new ServiceUnreachableError("network"); });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as { detail?: { message?: string } | unknown[] } | undefined;
    const message = payload && !Array.isArray(payload.detail) ? payload.detail?.message : undefined;
    if (message) throw new BlueprintError(message);
    throw new ServiceUnreachableError(String(response.status));
  }
  return StepEnvSchema.parse(await response.json());
}

/** The route lines to draw on the plant for one step: used water to the treatment plant, and solid waste to the by-product bay. */
export function routesFor(env: StepEnv): { from: string; to: string; kind: "water" | "waste" }[] {
  const out: { from: string; to: string; kind: "water" | "waste" }[] = [];
  if (env.uses_water) for (let i = 0; i + 1 < env.route.length; i++) out.push({ from: env.route[i], to: env.route[i + 1], kind: "water" });
  if (env.solid_to && env.solid_to !== env.step_key) out.push({ from: env.step_key, to: env.solid_to, kind: "waste" });
  return out;
}
