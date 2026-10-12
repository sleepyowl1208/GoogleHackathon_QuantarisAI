import { describe, expect, it } from "vitest";
import { flowNames, formIndexAfter, kitFor } from "./material-kit";

describe("material kit", () => {
  it("looks different for different industries and falls back to crates", () => {
    expect(kitFor("Dairy Farming and Milk Processing").raw.shape).toBe("cylinder");
    expect(kitFor("Egg Production and Packing").raw.shape).toBe("egg");
    expect(kitFor("Coconut Coir Fibre and Coco Peat Processing").mid.shape).toBe("roll");
    expect(kitFor("Steel Re-Rolling Mill").raw.shape).toBe("bar");
    expect(kitFor("Something Unusual").raw.shape).toBe("box");
  });
  it("coconut oil mill is not mistaken for a flour sack plant before coconut", () => { expect(kitFor("Coconut oil mill").raw.shape).toBe("egg"); });
  it("material changes form as it passes steps", () => {
    expect(formIndexAfter("receive")).toBe(0); expect(formIndexAfter("process")).toBe(1); expect(formIndexAfter("pack")).toBe(2); expect(formIndexAfter("dispatch")).toBe(2);
  });
  it("names the two ends from the design's own steps", () => {
    const zones = [
      { step: 3, kind: "process", label: "Churning", outputs: ["Butter"] }, { step: 1, kind: "receive", label: "Milk reception", outputs: ["Chilled raw milk"] },
      { step: 4, kind: "pack", label: "Packaging", outputs: ["Packed pouches"] }, { step: 5, kind: "dispatch", label: "Dispatch", outputs: [] }, { step: null, kind: "office", label: "Office", outputs: [] },
    ];
    expect(flowNames(zones)).toEqual({ raw: "Chilled raw milk", product: "Packed pouches" });
    expect(flowNames([{ step: 1, kind: "receive", label: "Receiving", outputs: [] }]).raw).toBe("Receiving");
  });
});
