import { describe, expect, it } from "vitest";
import { formatInr, formatRange } from "./costs-api";

describe("rupee formatting", () => {
  it("speaks in lakh and crore", () => {
    expect(formatInr(250000)).toBe("₹2.5 lakh"); expect(formatInr(12000000)).toBe("₹1.2 crore"); expect(formatInr(18500)).toBe("₹18,500"); expect(formatInr(950)).toBe("₹950"); expect(formatInr(100000)).toBe("₹1 lakh");
  });
  it("shows a range, a single value, or nothing", () => {
    expect(formatRange(95000, 225000)).toBe("₹95,000 – ₹2.25 lakh"); expect(formatRange(250000, 250000)).toBe("₹2.5 lakh"); expect(formatRange(null, null)).toBeUndefined(); expect(formatRange(undefined, 5)).toBeUndefined();
  });
});
