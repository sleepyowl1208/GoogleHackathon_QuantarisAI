import type { PlaceRole, ResearchPlace, SiteResearch } from "./research-api";

export type LatLng = [number, number];
// Red pins for existing facilities, as asked. Greens for where materials come from, saffron for markets. No blues.
export const roleStyle: Record<PlaceRole, { color: string; ring: string }> = {
  site: { color: "#2A1A0C", ring: "#FF9933" }, facility: { color: "#D92D20", ring: "#ffffff" }, raw_material: { color: "#138808", ring: "#ffffff" }, supplier: { color: "#6DBE5E", ring: "#ffffff" },
  market: { color: "#FF9933", ring: "#ffffff" }, byproduct_buyer: { color: "#B5651D", ring: "#ffffff" }, candidate_site: { color: "#ffffff", ring: "#E8780C" },
};
export const roleOrder: PlaceRole[] = ["site", "facility", "raw_material", "supplier", "market", "byproduct_buyer", "candidate_site"];

export type Pin = { place: ResearchPlace; position: LatLng; spread: boolean };

/** Places resolved only to a town share one coordinate, so pins would stack into one. Spread them on a small ring (about 2 to 4 km) and mark them so the UI can say it is only town-level. The site itself stays put. */
export function spreadPins(places: ResearchPlace[]): Pin[] {
  const groups = new Map<string, ResearchPlace[]>();
  for (const p of places) if (p.lat != null && p.lng != null) { const key = `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`; groups.set(key, [...(groups.get(key) ?? []), p]); }
  const pins: Pin[] = [];
  for (const group of groups.values()) {
    const crowded = group.length > 1;
    const movable = group.filter((p) => p.role !== "site");
    group.forEach((p) => {
      if (!crowded || p.role === "site" || p.location_quality === "verified") { pins.push({ place: p, position: [p.lat as number, p.lng as number], spread: false }); return; }
      const i = movable.indexOf(p); const ring = 1 + Math.floor(i / 8); const angle = (2 * Math.PI * (i % 8)) / Math.min(8, movable.length - 8 * Math.floor(i / 8)) + 0.4;
      const r = 0.022 * ring; // degrees of latitude, roughly 2.4 km per ring
      pins.push({ place: p, position: [(p.lat as number) + r * Math.sin(angle), (p.lng as number) + (r * Math.cos(angle)) / Math.cos(((p.lat as number) * Math.PI) / 180)], spread: true });
    });
  }
  return pins;
}

/** Flows worth drawing: both ends placed, and long enough to see. Local ones (same town) would just be a dot. */
export function drawableFlows(research: SiteResearch) {
  const byId = new Map(research.places.map((p) => [p.place_id, p]));
  return research.flows.flatMap((f) => {
    const a = byId.get(f.from_id), b = byId.get(f.to_id);
    if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return [];
    if ((f.distance_km ?? 99) < 5) return [];
    const other = a.role === "site" ? b : a; // the end that is not the site decides the colour
    return [{ ...f, from: [a.lat, a.lng] as LatLng, to: [b.lat, b.lng] as LatLng, role: other.role }];
  });
}

/** A gentle curve between two points (a quadratic bezier bent sideways), so flows read as routes rather than ruler lines. */
export function arcPoints(a: LatLng, b: LatLng, steps = 24): LatLng[] {
  const mid: LatLng = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const dx = b[1] - a[1], dy = b[0] - a[0];
  const ctrl: LatLng = [mid[0] + dx * 0.18, mid[1] - dy * 0.18];
  return Array.from({ length: steps + 1 }, (_, i) => { const t = i / steps; const u = 1 - t; return [u * u * a[0] + 2 * u * t * ctrl[0] + t * t * b[0], u * u * a[1] + 2 * u * t * ctrl[1] + t * t * b[1]] as LatLng; });
}

export function boundsOf(points: LatLng[]): [LatLng, LatLng] | null {
  if (!points.length) return null;
  return [[Math.min(...points.map((p) => p[0])), Math.min(...points.map((p) => p[1]))], [Math.max(...points.map((p) => p[0])), Math.max(...points.map((p) => p[1]))]];
}

export function groupByRole(places: ResearchPlace[]): { role: PlaceRole; items: ResearchPlace[] }[] {
  return roleOrder.map((role) => ({ role, items: places.filter((p) => p.role === role) })).filter((g) => g.items.length);
}

/** India, with a little sea around it: the map is kept to this so it never wanders to the rest of the world. [south-west, north-east] */
export const INDIA_BOUNDS: [LatLng, LatLng] = [[6.0, 67.5], [37.8, 98.0]];

/** Whole-India view unless every pin sits in a small region, in which case that region is shown so the pins are not specks. */
export function initialView(points: LatLng[]): [LatLng, LatLng] {
  const b = boundsOf(points);
  if (!b) return INDIA_BOUNDS;
  const [[s0, w0], [n0, e0]] = INDIA_BOUNDS;
  const small = (b[1][0] - b[0][0]) < (n0 - s0) * 0.25 && (b[1][1] - b[0][1]) < (e0 - w0) * 0.25;
  return small ? [[Math.max(b[0][0] - 1.5, s0), Math.max(b[0][1] - 1.5, w0)], [Math.min(b[1][0] + 1.5, n0), Math.min(b[1][1] + 1.5, e0)]] : INDIA_BOUNDS;
}

export const FAR_KM = 600; // beyond this a source is called far, so a distant place is never mistaken for a local one

/** Straight-line distance in km from the site to this place (or from this place to the site), when both were placed on the map. */
export function distanceOf(research: SiteResearch, place: ResearchPlace): number | undefined {
  const km = research.flows.find((f) => f.from_id === place.place_id || f.to_id === place.place_id)?.distance_km;
  return typeof km === "number" ? km : undefined;
}

/** Nearest first; places with no known distance go last, in their original order. */
export function nearestFirst(research: SiteResearch, places: ResearchPlace[]): ResearchPlace[] {
  return places.map((p, i) => ({ p, i, km: distanceOf(research, p) })).sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity) || a.i - b.i).map((x) => x.p);
}
