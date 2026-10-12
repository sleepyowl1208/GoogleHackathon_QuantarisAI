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
  it("the declared raw input and product beat a step's output, so processed forms are never shown entering", () => {
    const zones = [{ step: 1, kind: "receive", label: "Fruit intake", outputs: ["Graded whole pineapples"] }, { step: 5, kind: "pack", label: "Canning", outputs: ["Sealed cans"] }];
    expect(flowNames(zones, { raw_inputs: ["whole pineapples"], products: ["Canned pineapple rings"] })).toEqual({ raw: "Whole pineapples", product: "Canned pineapple rings" });
    expect(flowNames(zones, { raw_inputs: [], products: [] }).raw).toBe("Graded whole pineapples");
  });
  it("pineapple gets its own look, not a generic fruit", () => { expect(kitFor("Pineapple Processing and Canning").raw.shape).toBe("pineapple"); });
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
