import { z } from "zod";
import { BlueprintError, ClaimSchema, ServiceUnreachableError } from "./layout-api";

export const ReuseSchema = z.object({
  summary: z.string(),
  loops: z.array(z.object({ kind: z.enum(["water", "heat", "waste"]), headline: z.string(), today: z.string(), fix: z.string(), result: z.string(), reuse_for: z.string().default(""), effort: z.enum(["low", "medium", "high"]), first_step: z.string().default(""), ai_help: z.string().default(""), applies_at: z.array(z.string()).default([]) })),
  claims: z.array(ClaimSchema).default([]),
});
export type ReusePlan = z.infer<typeof ReuseSchema>;
export type ReuseBody = { industry: string; location: string; language: "en" | "hi"; stages: { key: string; label: string; equipment: string[]; outputs: string[] }[]; wastes: string[] };
const apiBase = process.env.NEXT_PUBLIC_LAYOUT_API_URL ?? "";

export async function sendReuse(body: ReuseBody): Promise<ReusePlan> {
  const response = await fetch(`${apiBase}/api/reuse`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => { throw new ServiceUnreachableError("network"); });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as { detail?: { message?: string } | unknown[] } | undefined;
    const message = payload && !Array.isArray(payload.detail) ? payload.detail?.message : undefined;
    if (message) throw new BlueprintError(message);
    throw new ServiceUnreachableError(String(response.status));
  }
  return ReuseSchema.parse(await response.json());
}

/** One plan per plant and language, kept while the page is open, so switching tabs never asks the AI again. */
const cache = new Map<string, ReusePlan>();
export const reuseKey = (b: ReuseBody) => `${b.language}|${b.industry}|${b.location}|${b.stages.map((s) => s.key).join(",")}`;
export const cachedReuse = (key: string) => cache.get(key);
export const rememberReuse = (key: string, plan: ReusePlan) => { cache.set(key, plan); };
