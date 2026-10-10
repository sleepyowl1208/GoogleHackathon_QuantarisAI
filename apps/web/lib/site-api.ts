import { SiteConditionsSchema, type SiteConditions } from "./research-api";

const apiBase = process.env.NEXT_PUBLIC_LAYOUT_API_URL ?? "";

/** Measured conditions at a place (weather, wind, sunshine, air), or nothing if the place can't be found. */
export async function fetchSite(place: string): Promise<SiteConditions | undefined> {
  try {
    const response = await fetch(`${apiBase}/api/site?place=${encodeURIComponent(place.slice(0, 120))}`);
    return response.ok ? SiteConditionsSchema.parse(await response.json()) : undefined;
  } catch { return undefined; }
}
