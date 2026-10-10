import { describe, expect, it } from "vitest";
import { machinesFor, machinesForImprovement } from "./costs-logic";
import type { Improvement } from "./chat-api";
import type { LayoutResult } from "./layout-api";

const z = (id: string, step: number | null, kind: string, equipment: string[], label = id) => ({ zone_id: id, label, kind, step, equipment, x: 0, y: 0, width_m: 1, depth_m: 1, height_m: 1, area_m2: 1, note: "", icon: "cog", detail: "", outputs: [], level: 0, elevation_m: 0 });

describe("which machines to price", () => {
  it("takes each step's lead machine first, skips animals and repeats, and stops at twelve", () => {
    const layout = { zones: [z("cows", 1, "livestock", ["Feed trough"]), z("a", 2, "process", ["Pasteuriser", "Pump"]), z("b", 3, "process", ["Churn", "pasteuriser", "Scale"]), z("svc", null, "utility", ["Boiler"])] } as unknown as LayoutResult;
    expect(machinesFor(layout).map((m) => m.name)).toEqual(["Pasteuriser", "Churn", "Pump", "Scale"]);
    expect(machinesFor(layout)[0].step).toBe("a");
    const many = { zones: Array.from({ length: 10 }, (_, i) => z(`s${i}`, i + 1, "process", [`M${i}a`, `M${i}b`, `M${i}c`])) } as unknown as LayoutResult;
    expect(machinesFor(many)).toHaveLength(12);
  });
  it("for an existing factory, prices the new sections' equipment and what the ideas need", () => {
    const data = { as_is_layout: { zones: [z("asis_1", 1, "process", ["Milking machine"])] }, proposed_layout: { zones: [z("asis_1", 1, "process", ["Milking machine"]), z("new_1_1", 2, "process", ["Pasteuriser"], "Curd room")] }, opportunities: [{ title: "Biogas", needs: ["Digester", "pasteuriser"] }] } as unknown as Improvement;
    expect(machinesForImprovement(data)).toEqual([{ name: "Pasteuriser", step: "Curd room" }, { name: "Digester", step: "Biogas" }]);
  });
});
