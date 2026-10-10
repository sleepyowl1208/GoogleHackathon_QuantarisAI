import { describe, expect, it } from "vitest";
import { arcPoints, boundsOf, drawableFlows, groupByRole, roleStyle, spreadPins } from "./map-logic";
import type { ResearchPlace, SiteResearch } from "./research-api";

const place = (id: string, role: ResearchPlace["role"], lat: number | null, lng: number | null, extra: Partial<ResearchPlace> = {}): ResearchPlace => ({
  place_id: id, role, name: id, locality: "", state: "", note: "", lat, lng, location_quality: lat == null ? "unknown" : "place_level", source_ids: [], ...extra,
});
const research = (places: ResearchPlace[], flows: SiteResearch["flows"] = []): SiteResearch => ({ summary: "", places, flows, discoveries: [], sources: [], search_queries: [], claims: [], retrieved_at: "2026-10-05T00:00:00Z", grounded: true, geocoder: "t" });

describe("pin spreading", () => {
  it("keeps the site fixed and spreads places that share one town coordinate", () => {
    const pins = spreadPins([place("site", "site", 25.45, 78.57), ...["a", "b", "c", "d"].map((id) => place(id, "facility", 25.45, 78.57))]);
    const site = pins.find((p) => p.place.role === "site")!;
    expect(site.spread).toBe(false); expect(site.position).toEqual([25.45, 78.57]);
    const others = pins.filter((p) => p.place.role !== "site");
    expect(others.every((p) => p.spread)).toBe(true);
    expect(new Set(others.map((p) => p.position.join(","))).size).toBe(4);  // no two pins on the same spot
    for (const p of others) expect(Math.hypot(p.position[0] - 25.45, (p.position[1] - 78.57) * Math.cos((25.45 * Math.PI) / 180))).toBeLessThan(0.06); // still within a few km of the town
  });
  it("leaves lone places and verified addresses exactly where they are, and skips places with no coordinates", () => {
    const pins = spreadPins([place("a", "facility", 10, 70), place("b", "facility", 20, 80, { location_quality: "verified" }), place("c", "facility", 20, 80, { location_quality: "verified" }), place("d", "market", null, null)]);
    expect(pins).toHaveLength(3);
    expect(pins.find((p) => p.place.place_id === "a")!.spread).toBe(false);
    expect(pins.filter((p) => p.place.location_quality === "verified").every((p) => !p.spread && p.position[0] === 20)).toBe(true);
  });
  it("copes with more than eight places in one town by using a second ring", () => {
    const many = Array.from({ length: 12 }, (_, i) => place(`p${i}`, "raw_material", 25.4, 78.5));
    const positions = spreadPins(many).map((p) => p.position.join(","));
    expect(new Set(positions).size).toBe(12);
  });
});

describe("flows and arcs", () => {
  const places = [place("site", "site", 25.45, 78.57), place("mp", "raw_material", 23.2, 77.08), place("near", "raw_material", 25.46, 78.58), place("mkt", "market", 28.6, 77.2), place("lost", "raw_material", null, null), place("fac", "facility", 25.5, 78.6)];
  const flows = [
    { from_id: "mp", to_id: "site", material: "wheat", distance_km: 290 }, { from_id: "near", to_id: "site", material: "wheat", distance_km: 2 },
    { from_id: "site", to_id: "mkt", material: "flour", distance_km: 370 }, { from_id: "lost", to_id: "site", material: "wheat", distance_km: null },
  ];
  it("draws only flows with both ends placed and a visible length", () => {
    const drawn = drawableFlows(research(places, flows));
    expect(drawn.map((f) => f.from_id)).toEqual(["mp", "site"]);          // 2 km local flow hidden, unplaced source hidden
    expect(drawn[0].role).toBe("raw_material"); expect(drawn[1].role).toBe("market");  // colour comes from the end that is not the site
    expect(drawn[0].from).toEqual([23.2, 77.08]); expect(drawn[0].to).toEqual([25.45, 78.57]);
  });
  it("makes a smooth arc that starts and ends exactly at the two places", () => {
    const pts = arcPoints([23.2, 77.08], [25.45, 78.57], 20);
    expect(pts).toHaveLength(21); expect(pts[0]).toEqual([23.2, 77.08]);
    expect(pts[20][0]).toBeCloseTo(25.45, 6); expect(pts[20][1]).toBeCloseTo(78.57, 6);
    const mid = pts[10], straight = [(23.2 + 25.45) / 2, (77.08 + 78.57) / 2];
    expect(Math.hypot(mid[0] - straight[0], mid[1] - straight[1])).toBeGreaterThan(0.05); // it actually bends
  });
});

describe("bounds, grouping and colours", () => {
  it("computes bounds, and none for no points", () => {
    expect(boundsOf([[1, 2], [5, 9], [3, 4]])).toEqual([[1, 2], [5, 9]]); expect(boundsOf([])).toBeNull();
  });
  it("groups places in a fixed role order and drops empty groups", () => {
    const g = groupByRole([place("m", "market", 1, 1), place("s", "site", 1, 1), place("f", "facility", 1, 1), place("f2", "facility", 1, 1)]);
    expect(g.map((x) => x.role)).toEqual(["site", "facility", "market"]); expect(g[1].items).toHaveLength(2);
  });
  it("shows existing facilities as red pins and uses no blue anywhere", () => {
    expect(roleStyle.facility.color).toBe("#D92D20");
    for (const style of Object.values(roleStyle)) { const hex = style.color.replace("#", ""); const [r, , b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)); expect(b > r + 40).toBe(false); }
  });
});

import { INDIA_BOUNDS, initialView } from "./map-logic";
describe("India-only map view", () => {
  it("shows all of India for spread-out pins or none, and zooms in only when every pin is close together", () => {
    expect(initialView([])).toEqual(INDIA_BOUNDS);
    expect(initialView([[25.4, 78.5], [23.2, 77.1], [28.6, 77.2], [22.8, 70.8], [9.9, 76.3]])).toEqual(INDIA_BOUNDS);
    const near = initialView([[25.4, 78.5], [25.9, 79.1]]);
    expect(near).not.toEqual(INDIA_BOUNDS);
    expect(near[0][0]).toBeGreaterThanOrEqual(INDIA_BOUNDS[0][0]); expect(near[1][0]).toBeLessThanOrEqual(INDIA_BOUNDS[1][0]);
  });
});

import { distanceOf, FAR_KM, nearestFirst } from "./map-logic";
describe("nearest first", () => {
  const research = { flows: [{ from_id: "a", to_id: "site", distance_km: 900 }, { from_id: "b", to_id: "site", distance_km: 120 }] } as unknown as SiteResearch;
  const places = [{ place_id: "a" }, { place_id: "c" }, { place_id: "b" }] as unknown as ResearchPlace[];
  it("orders by distance and puts unplaced ones last", () => {
    expect(nearestFirst(research, places).map((p) => p.place_id)).toEqual(["b", "a", "c"]); expect(distanceOf(research, places[1])).toBeUndefined(); expect(FAR_KM).toBe(600);
  });
});
