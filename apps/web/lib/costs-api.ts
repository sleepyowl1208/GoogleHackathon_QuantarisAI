import { z } from "zod";
import { BlueprintError, ClaimSchema, ServiceUnreachableError } from "./layout-api";

export const BuildCostsSchema = z.object({
  machines: z.array(z.object({
    name: z.string(), step: z.string().default(""), price_low_inr: z.number().nullish(), price_high_inr: z.number().nullish(), basis: z.string().default(""),
    suppliers: z.array(z.object({ name: z.string(), place: z.string().default(""), source_ids: z.array(z.string()).default([]) })).default([]), source_ids: z.array(z.string()).default([]),
  })).default([]),
  land: z.array(z.object({ place: z.string(), location: z.string().default(""), price_note: z.string().default(""), how_to_get: z.string().default(""), kind: z.string().default(""), source_ids: z.array(z.string()).default([]) })).default([]),
  benchmarks: z.array(z.object({ metric: z.string(), value: z.string().default(""), applies_to: z.string().default(""), source_ids: z.array(z.string()).default([]) })).default([]),
  total_low_inr: z.number().nullish(), total_high_inr: z.number().nullish(), priced: z.number().default(0), requested: z.number().default(0),
  sources: z.array(z.object({ source_id: z.string(), title: z.string(), url: z.string(), retrieved_at: z.string() })).default([]),
  search_queries: z.array(z.string()).default([]), claims: z.array(ClaimSchema).default([]), retrieved_at: z.string(), grounded: z.boolean().default(false),
});
export type BuildCosts = z.infer<typeof BuildCostsSchema>;
export type CostsBody = { industry: string; location: string; machines: { name: string; step: string }[]; mode: "new" | "existing"; language: "en" | "hi" };

const apiBase = process.env.NEXT_PUBLIC_LAYOUT_API_URL ?? "";

export async function sendCosts(body: CostsBody): Promise<BuildCosts> {
  const response = await fetch(`${apiBase}/api/costs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, machines: body.machines.slice(0, 12).map((m) => ({ name: m.name.slice(0, 80), step: m.step.slice(0, 80) })) }) }).catch(() => { throw new ServiceUnreachableError("network"); });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as { detail?: { message?: string } | unknown[] } | undefined;
    const message = payload && !Array.isArray(payload.detail) ? payload.detail?.message : undefined;
    if (message) throw new BlueprintError(message);
    throw new ServiceUnreachableError(String(response.status));
  }
  return BuildCostsSchema.parse(await response.json());
}

/** Rupees the way people say them: 250000 is "₹2.5 lakh", 12000000 is "₹1.2 crore". */
export function formatInr(n: number): string {
  const trim = (x: number) => String(Math.round(x * 100) / 100);
  if (n >= 10_000_000) return `₹${trim(n / 10_000_000)} crore`;
  if (n >= 100_000) return `₹${trim(n / 100_000)} lakh`;
  if (n >= 1000) return `₹${n.toLocaleString("en-IN")}`;
  return `₹${n}`;
}
export const formatRange = (low?: number | null, high?: number | null): string | undefined => (low == null || high == null ? undefined : low === high ? formatInr(low) : `${formatInr(low)} – ${formatInr(high)}`);
