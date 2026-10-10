import { describe, expect, it } from "vitest";
import { burnsFuel, isPoultry, smokeFromOpacity } from "./ops-bus";

describe("ops-bus", () => {
  it("maps stack opacity to a 0..1 smoke level", () => { expect(smokeFromOpacity(0)).toBe(0); expect(smokeFromOpacity(30)).toBe(0.5); expect(smokeFromOpacity(200)).toBe(1); });
  it("spots fuel-burning equipment", () => { expect(burnsFuel("Steam boiler")).toBe(true); expect(burnsFuel("Packing table")).toBe(false); });
  it("spots a poultry barn", () => { expect(isPoultry("Layer hen shed")).toBe(true); expect(isPoultry("Dairy cattle pasture")).toBe(false); });
});
