import { describe, expect, it } from "vitest";
import { cropKind, farmPlace } from "./farm-logic";

describe("cropKind", () => {
  it("draws pineapple, trees and row crops differently and defaults to rows", () => {
    expect(cropKind("Pineapple")).toBe("pineapple"); expect(cropKind("mango")).toBe("tree"); expect(cropKind("coconut")).toBe("tree"); expect(cropKind("sugarcane")).toBe("rows"); expect(cropKind("quinoa")).toBe("rows");
  });
});

describe("farmPlace", () => {
  it("sits just outside the plot on the gate's side", () => {
    const south = farmPlace(80, 60, { x: 40, y: 0 }, 80);          // gate on the south edge: scene z is positive
    expect(south.out).toEqual([0, 1]);
    expect(south.cz).toBeGreaterThan(30);                          // beyond the plot's south edge (D/2 = 30)
    expect(south.spanZ).toBeGreaterThan(0); expect(south.spanX).toBe(0);
    const west = farmPlace(80, 60, { x: 0, y: 30 }, 80);
    expect(west.out).toEqual([-1, 0]);
    expect(west.cx).toBeLessThan(-40);
    const north = farmPlace(80, 60, { x: 40, y: 60 }, 80);
    expect(north.out).toEqual([0, -1]); expect(north.cz).toBeLessThan(-30);
  });
  it("never overhangs the plot's own edge and keeps a sensible size", () => {
    const p = farmPlace(30, 30, { x: 15, y: 0 }, 30);
    expect(p.width).toBeLessThanOrEqual(30 * 0.95 + 1e-9);
    expect(p.depth).toBeGreaterThanOrEqual(10);
  });
});
