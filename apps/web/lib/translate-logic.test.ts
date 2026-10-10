import { describe, expect, it } from "vitest";
import { applyTexts, extractTexts } from "./translate-logic";

const research = { summary: "Wheat comes from MP.", places: [{ name: "Sehore", locality: "Sehore", state: "Madhya Pradesh", material: "Sharbati wheat", note: "Premium belt.", url: "https://x.test" }, { name: "Kota", material: null, note: "" }], discoveries: [{ title: "Seasonal", body: "Buy at harvest.", place_id: "p1" }], sources: [{ title: "FCI", url: "https://fci.gov.in" }], search_queries: ["wheat madhya pradesh"], claims: [{ claim_id: "c1", statement: "Found with Google Search.", classification: "INFERENCE", reason: "Verify" }] };

describe("translation fields", () => {
  it("lists prose only, never names, links, ids or search queries", () => {
    const texts = extractTexts("research", research);
    expect(texts).toEqual(["Wheat comes from MP.", "Sharbati wheat", "Premium belt.", "Seasonal", "Buy at harvest.", "Found with Google Search.", "Verify"]);
    expect(texts).not.toContain("Sehore"); expect(texts.join()).not.toContain("http");
  });
  it("applies translations to a copy and leaves everything else untouched", () => {
    const map = new Map([["Wheat comes from MP.", "गेहूँ MP से आता है।"], ["Premium belt.", "बढ़िया इलाका।"]]);
    const out = applyTexts("research", research, map);
    expect(out.summary).toBe("गेहूँ MP से आता है।"); expect(out.places[0].note).toBe("बढ़िया इलाका।");
    expect(out.places[0].name).toBe("Sehore"); expect(out.places[0].url).toBe("https://x.test"); expect(out.sources[0].url).toBe("https://fci.gov.in");
    expect(research.summary).toBe("Wheat comes from MP."); // the original is not mutated
    expect(out.places[1].material).toBeNull();
  });
  it("walks nested lists and arrays of strings, skipping numbers and empty text", () => {
    const insights = { byproduct_flows: [{ waste: "Bran", treatment: ["Collect", "123"], products: [{ name: "Feed", use: "", buyer: "dairies" }], benefit: "Less waste", verify: "" }], loads: [{ stage_key: "mill", power: 5, water: 1, note: "Rollers" }], operations: [{ area: "copilot", what: "Ask", data_needed: ["SOPs"], first_step: "Digitise" }] };
    const texts = extractTexts("insights", insights);
    expect(texts).toEqual(["Bran", "Collect", "Less waste", "Feed", "dairies", "Rollers", "Ask", "SOPs", "Digitise"]);
    const out = applyTexts("insights", insights, new Map([["Collect", "इकट्ठा करें"], ["Feed", "चारा"]]));
    expect(out.byproduct_flows[0].treatment).toEqual(["इकट्ठा करें", "123"]); expect(out.byproduct_flows[0].products[0].name).toBe("चारा"); expect(out.loads[0].stage_key).toBe("mill");
  });
  it("keeps the design's ids and geometry", () => {
    const design = { label: "Mill", zones: [{ zone_id: "mill", label: "Milling", x: 1, equipment: ["Roller mill"], outputs: ["Flour"], detail: "d", note: "" }], waste_streams: [{ name: "Bran", description: "x", by_product_ideas: ["Feed"] }], utilities: ["Power"], environment: [{ aspect: "Air", impact: "Dust" }], claims: [] };
    const out = applyTexts("design", design, new Map([["Milling", "पिसाई"]]));
    expect(out.zones[0].zone_id).toBe("mill"); expect(out.zones[0].label).toBe("पिसाई"); expect(out.zones[0].x).toBe(1);
  });
});
