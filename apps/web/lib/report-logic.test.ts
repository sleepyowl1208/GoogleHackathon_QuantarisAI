import { describe, expect, it } from "vitest";
import { builtAreaM2, reportFileName, requestLines, summaryFacts } from "./report-logic";
import type { Session } from "./sessions";

const zone = (id: string, step: number | null, area: number) => ({ zone_id: id, label: id.toUpperCase(), kind: "process", x: 0, y: 0, width_m: 10, depth_m: 10, height_m: 5, area_m2: area, step, note: "", equipment: [], icon: "cog", detail: "", outputs: [] });
const session = (over: Partial<Session> = {}): Session => ({ id: "s", title: "t", createdAt: 0, updatedAt: 0, messages: [{ id: "1", role: "assistant", text: "hi" }, { id: "2", role: "user", text: "  coconut oil\n mill in  Kerala " }], design: { width_m: 50, depth_m: 40, zones: [zone("a", 1, 200), zone("b", 2, 600), zone("svc", null, 100)], waste_streams: [{ name: "Copra cake", description: "", by_product_ideas: [] }] } as never, ...over });

describe("report logic", () => {
  it("names the file after the design and the day", () => {
    expect(reportFileName("Coconut Oil Mill · Kerala", new Date(2026, 9, 5))).toBe("QuantarisAI-Coconut-Oil-Mill-Kerala-2026-10-05");
    expect(reportFileName("नारियल तेल मिल", new Date(2026, 0, 9))).toBe("QuantarisAI-report-2026-01-09");
    expect(reportFileName("a/b\\c:*?", new Date(2026, 0, 9))).toBe("QuantarisAI-a-b-c-2026-01-09");
  });
  it("reports what the user asked, tidied, without the assistant's words", () => {
    expect(requestLines(session())).toEqual(["coconut oil mill in Kerala"]);
  });
  it("summarises only what is known", () => {
    const facts = summaryFacts(session());
    expect(facts.map((f) => f.key)).toEqual(["plot", "steps", "built", "biggest", "waste"]);
    expect(facts.find((f) => f.key === "steps")?.value).toBe("A → B");
    expect(facts.find((f) => f.key === "built")?.value).toBe("900 m² (45%)");
    expect(builtAreaM2(session().design!)).toBe(900);
    const more = summaryFacts(session({ site: { prevailing_wind_label: "WNW", avg_solar_kwh_m2_day: 5.2 } as never, research: { places: [{ role: "site" }, { role: "market" }] } as never, insights: { byproduct_flows: [{ waste: "Cake", products: [{ name: "Feed" }] }, { waste: "Husk", products: [] }] } as never }));
    expect(more.map((f) => f.key)).toEqual(["plot", "steps", "built", "biggest", "waste", "byproduct", "wind", "solar", "sourcing"]);
    expect(more.find((f) => f.key === "byproduct")?.value).toBe("Cake → Feed");
    expect(more.find((f) => f.key === "sourcing")?.value).toBe("1");
  });
});
