import { z } from "zod";
import { BlueprintError, ClaimSchema, ServiceUnreachableError } from "./layout-api";

export const PlaceRoleSchema = z.enum(["site", "raw_material", "supplier", "facility", "market", "byproduct_buyer", "candidate_site"]);
export type PlaceRole = z.infer<typeof PlaceRoleSchema>;

const PlaceSchema = z.object({
  place_id: z.string(), role: PlaceRoleSchema, name: z.string(), locality: z.string().default(""), state: z.string().default(""), material: z.string().nullish(), note: z.string().default(""),
  address: z.string().nullish(), lat: z.number().nullish(), lng: z.number().nullish(), location_quality: z.enum(["verified", "place_level", "unknown"]).default("unknown"), source_ids: z.array(z.string()).default([]),
});
export const SiteResearchSchema = z.object({
  summary: z.string().default(""),
  places: z.array(PlaceSchema).default([]),
  flows: z.array(z.object({ from_id: z.string(), to_id: z.string(), material: z.string().default(""), distance_km: z.number().nullish() })).default([]),
  discoveries: z.array(z.object({ kind: z.enum(["constraint", "opportunity"]), title: z.string(), body: z.string().default(""), place_id: z.string().nullish(), source_ids: z.array(z.string()).default([]) })).default([]),
  sources: z.array(z.object({ source_id: z.string(), title: z.string(), url: z.string(), retrieved_at: z.string() })).default([]),
  search_queries: z.array(z.string()).default([]),
  claims: z.array(ClaimSchema).default([]),
  retrieved_at: z.string(), grounded: z.boolean().default(false), geocoder: z.string().default(""),
});
export const SiteConditionsSchema = z.object({
  location: z.string(), lat: z.number(), lng: z.number(), retrieved_at: z.string(), source: z.string(),
  temperature_c: z.number().nullish(), wind_speed_kmh: z.number().nullish(), wind_from_deg: z.number().nullish(), prevailing_wind_from_deg: z.number().nullish(), prevailing_wind_label: z.string().nullish(),
  avg_wind_kmh_30d: z.number().nullish(), avg_solar_kwh_m2_day: z.number().nullish(), pm2_5: z.number().nullish(), aqi_us: z.number().nullish(), aqi_label: z.string().nullish(),
});

export type ResearchPlace = z.infer<typeof PlaceSchema>;
export type SiteResearch = z.infer<typeof SiteResearchSchema>;
export type SiteConditions = z.infer<typeof SiteConditionsSchema>;
export type ResearchBody = { industry: string; location: string; mode: "new" | "existing"; language: "en" | "hi"; context: string };

const apiBase = process.env.NEXT_PUBLIC_LAYOUT_API_URL ?? "";

export async function sendResearch(body: ResearchBody): Promise<SiteResearch> {
  const response = await fetch(`${apiBase}/api/research`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => { throw new ServiceUnreachableError("network"); });
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as { detail?: { message?: string } | unknown[] } | undefined;
    const message = payload && !Array.isArray(payload.detail) ? payload.detail?.message : undefined;
    if (message) throw new BlueprintError(message);
    throw new ServiceUnreachableError(String(response.status));
  }
  return SiteResearchSchema.parse(await response.json());
}
