import { describe, expect, it } from "vitest";
import { biggestStep, byImpact, dataStatus, routeLengthM, stageRequestBody, supplyFacts } from "./insights-logic";
import type { LayoutResult } from "./layout-api";

const zone = (id: string, x: number, y: number, step: number | null, area = 100) => ({ zone_id: id, label: id, kind: "process", x, y, width_m: 10, depth_m: 10, height_m: 5, area_m2: area, step, note: "", equipment: ["a"], icon: "cog", detail: "", outputs: ["o"] });
const design = { zones: [zone("a", 0, 0, 1, 50), zone("b", 20, 0, 2, 300), zone("c", 20, 30, 3), zone("svc", 0, 40, null)], flow: [{ from_id: "a", to_id: "b" }, { from_id: "b", to_id: "c" }] } as unknown as LayoutResult;

describe("insights logic", () => {
  it("reports only what is really connected", () => {
    expect(dataStatus("supply_chain", true)).toBe("live");
    expect(dataStatus("supply_chain", false)).toBe("needs");
    expect(dataStatus("predictive_maintenance", true)).toBe("needs"); // no sensors are connected, whatever else exists
    expect(dataStatus("demand_forecasting", true)).toBe("needs");
    expect(dataStatus("waste_reduction", false)).toBe("design");
  });
  it("sorts by impact then effort", () => {
    const items: { id: number; effect: "low" | "medium" | "high"; effort: "low" | "medium" | "high" }[] = [{ id: 1, effect: "low", effort: "low" }, { id: 2, effect: "high", effort: "high" }, { id: 3, effect: "high", effort: "low" }];
    const sorted = byImpact(items);
    expect(sorted.map((x) => x.id)).toEqual([3, 2, 1]);
  });
  it("computes route length and the biggest step from the layout", () => {
    expect(routeLengthM(design)).toBe(20 + 30);
    expect(biggestStep(design)?.zone_id).toBe("b");
  });
  it("summarises research without inventing numbers", () => {
    expect(supplyFacts(undefined)).toBeUndefined();
    const r = { places: [{ role: "raw_material" }, { role: "market" }, { role: "supplier" }], flows: [{ distance_km: 120 }, { distance_km: null }, { distance_km: 300 }] } as never;
    expect(supplyFacts(r)).toEqual({ sources: 2, routes: 3, farthestKm: 300 });
    expect(supplyFacts({ places: [], flows: [{}] } as never)?.farthestKm).toBeUndefined();
  });
  it("sends only real steps, in order, to the analyst", () => {
    expect(stageRequestBody(design).map((s) => s.key)).toEqual(["a", "b", "c"]);
  });
});
