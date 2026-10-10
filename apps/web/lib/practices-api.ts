import { z } from "zod";
import { BlueprintError, ClaimSchema, ServiceUnreachableError } from "./layout-api";

export const BestPracticesSchema = z.object({
  summary: z.string().default(""),
  practices: z.array(z.object({ title: z.string(), countries: z.string().default(""), what: z.string().default(""), why_it_works: z.string().default(""), example: z.string().default(""), for_you: z.string().default(""), source_ids: z.array(z.string()).default([]) })).default([]),
  standards: z.array(z.object({ name: z.string(), note: z.string().default(""), source_ids: z.array(z.string()).default([]) })).default([]),
  sources: z.array(z.object({ source_id: z.string(), title: z.string(), url: z.string(), retrieved_at: z.string() })).default([]),
  search_queries: z.array(z.string()).default([]),
  claims: z.array(ClaimSchema).default([]),
  retrieved_at: z.string(), grounded: z.boolean().default(false),
});
export type BestPractices = z.infer<typeof BestPracticesSchema>;
export type PracticesBody = { industry: string; location: string; problem: string; mode: "new" | "existing"; language: "en" | "hi" };

const apiBase = process.env.NEXT_PUBLIC_LAYOUT_API_URL ?? "";

export async function sendPractices(body: PracticesBody): Promise<BestPractices> {
  const response = await fetch(`${apiBase}/api/practices`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, problem: body.problem.slice(0, 900) }) }).catch(() => { throw new ServiceUnreachableError("network"); });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as { detail?: { message?: string } | unknown[] } | undefined;
    const message = payload && !Array.isArray(payload.detail) ? payload.detail?.message : undefined;
    if (message) throw new BlueprintError(message);
    throw new ServiceUnreachableError(String(response.status));
  }
  return BestPracticesSchema.parse(await response.json());
}
