import { describe, expect, it } from "vitest";
import { buildContext, sameLocation, shouldRelocate, statesOwnLocation } from "./context-logic";
import type { Session } from "./sessions";

const zone = (id: string, step: number, label: string) => ({ zone_id: id, label, step });
const base = { id: "s", title: "t", createdAt: 0, updatedAt: 0, messages: [] };
const design = { label: "Mango pickle factory", width_m: 40, depth_m: 60, levels: 1, location: "Jhansi", zones: [zone("a", 1, "Receiving"), zone("b", 2, "Washing")], waste_streams: [{ name: "Peel" }] };
const research = {
  places: [{ place_id: "far", role: "raw_material", name: "Vijayawada mandi", locality: "Krishna", state: "Andhra Pradesh", material: "mango" }, { place_id: "near", role: "raw_material", name: "Malihabad orchards", locality: "Lucknow", state: "Uttar Pradesh", material: "Dasheri mango" }, { place_id: "unk", role: "raw_material", name: "Unplaced mandi", locality: "", state: "" }, { place_id: "m", role: "market", name: "Delhi", locality: "Delhi", state: "Delhi" }],
  flows: [{ from_id: "far", to_id: "site", distance_km: 1500 }, { from_id: "near", to_id: "site", distance_km: 270 }], discoveries: [{ kind: "constraint", title: "Groundwater limits", body: "Bundelkhand is water stressed." }],
};

describe("what the assistant is told", () => {
  it("states where the factory is, and lists sources nearest first with distances", () => {
    const text = buildContext({ ...base, design, research } as unknown as Session)!;
    expect(text).toContain("The factory is at (or will be at): Jhansi"); expect(text).toContain("Prefer nearby sources");
    const sourcing = text.split("\n").find((l) => l.startsWith("Sourcing found"))!;
    expect(sourcing.indexOf("Malihabad orchards")).toBeLessThan(sourcing.indexOf("Vijayawada mandi")); expect(sourcing).toContain("270 km"); expect(sourcing.endsWith("Unplaced mandi.") || sourcing.includes("Unplaced mandi")).toBe(true);
    expect(text).toContain("Groundwater limits"); expect(text).toContain("Markets: Delhi");
  });
  it("adds costs, practices and by-products only when they exist, and never goes past the limit", () => {
    expect(buildContext({ ...base, design } as unknown as Session)).not.toContain("Costs found");
    const long = { ...base, design, research: { ...research, discoveries: Array.from({ length: 4 }, (_, i) => ({ kind: "constraint", title: `T${i}`.padEnd(90, "x"), body: "b".repeat(400) })) }, costs: { total_low_inr: 250000, total_high_inr: 400000, priced: 1, requested: 3, land: [{ place: "Growth Centre", price_note: "Rs 3620 per sqmt" }], machines: [{ suppliers: [{ name: "Dairy Tech" }] }] }, practices: { practices: [{ title: "ZLD", countries: "India" }] } } as unknown as Session;
    const text = buildContext(long)!;
    expect(text).toContain("machines about ₹2.5 lakh – ₹4 lakh for 1 of 3 priced"); expect(text).toContain("Growth Centre Rs 3620 per sqmt"); expect(text).toContain("Best practices found: ZLD (India)"); expect(text.length).toBeLessThanOrEqual(5800);
  });
  it("has nothing to say when there is no plan yet", () => { expect(buildContext({ ...base } as unknown as Session)).toBeNull(); });
});

describe("same place", () => {
  it("recognises different spellings of one place, and different places", () => {
    expect(sameLocation("Jhansi", "Jhansi, Uttar Pradesh")).toBe(true); expect(sameLocation("jhansi ", "JHANSI")).toBe(true);
    expect(sameLocation("Jhansi", "Kanpur")).toBe(false); expect(sameLocation("", "Jhansi")).toBe(false); expect(sameLocation(undefined, undefined)).toBe(false);
  });
});

describe("when to change the plan's place", () => {
  it("does when there is none, or when the owner says where their factory is; not when they just name a place", () => {
    expect(shouldRelocate(undefined, "Jhansi", "why Andhra Pradesh?")).toBe(true);
    expect(shouldRelocate("Kerala", "Jhansi", "but I want to start the factory in Jhansi, why Andhra Pradesh")).toBe(true);
    expect(shouldRelocate("Jhansi", "Andhra Pradesh", "what about Andhra Pradesh mangoes?")).toBe(false);
    expect(shouldRelocate("Jhansi", "Jhansi, Uttar Pradesh", "I want to start in Jhansi")).toBe(false);
    expect(shouldRelocate("Jhansi", "", "I want to start in Jhansi")).toBe(false); expect(shouldRelocate("Jhansi", "Ab", "my factory is in Ab")).toBe(false);
    expect(statesOwnLocation("my factory is near Kanpur")).toBe(true); expect(statesOwnLocation("how far is Kanpur")).toBe(false);
  });
});
