import { z } from "zod";
import { BlueprintError, ClaimSchema, ServiceUnreachableError } from "./layout-api";

export const ScoutSchema = z.object({
  place: z.string(), industry: z.string().default(""), center_lat: z.number().nullish(), center_lng: z.number().nullish(),
  areas: z.array(z.object({ rank: z.number(), name: z.string(), locality: z.string().default(""), kind: z.string().default(""), why: z.string().default(""), access: z.string().default(""), utilities: z.string().default(""), supply: z.string().default(""), risk: z.string().default(""), lat: z.number().nullish(), lng: z.number().nullish(), distance_km: z.number().nullish(), pin_level: z.string().default(""), source_ids: z.array(z.string()).default([]) })),
  sources: z.array(z.object({ source_id: z.string(), title: z.string(), url: z.string() })), search_queries: z.array(z.string()).default([]), claims: z.array(ClaimSchema).default([]),
});
export type Scout = z.infer<typeof ScoutSchema>;
export type ScoutArea = Scout["areas"][number];
const apiBase = process.env.NEXT_PUBLIC_LAYOUT_API_URL ?? "";

export async function sendScout(body: { place: string; industry: string; assets: string; language: "en" | "hi" }): Promise<Scout> {
  const response = await fetch(`${apiBase}/api/scout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => { throw new ServiceUnreachableError("network"); });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as { detail?: { message?: string } | unknown[] } | undefined;
    const message = payload && !Array.isArray(payload.detail) ? payload.detail?.message : undefined;
    if (message) throw new BlueprintError(message);
    throw new ServiceUnreachableError(String(response.status));
  }
  return ScoutSchema.parse(await response.json());
}

/** Only https links from the research are ever shown as links. */
export const linksFor = (scout: Scout, area: ScoutArea) => area.source_ids.map((id) => scout.sources.find((s) => s.source_id === id)).filter((s): s is Scout["sources"][number] => Boolean(s && s.url.startsWith("https://")));
export const pinned = (scout: Scout) => scout.areas.filter((a): a is ScoutArea & { lat: number; lng: number } => typeof a.lat === "number" && typeof a.lng === "number");
