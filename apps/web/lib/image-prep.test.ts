import { describe, expect, it } from "vitest";
import { planFor, sniffType, targetSize } from "./image-prep";

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)].slice(0, 16));

describe("targetSize", () => {
  it("shrinks the long side to 2000 px and keeps the shape", () => { expect(targetSize(4000, 3000)).toEqual({ w: 2000, h: 1500 }); expect(targetSize(3000, 6000)).toEqual({ w: 1000, h: 2000 }); });
  it("never enlarges a small image", () => { expect(targetSize(800, 600)).toEqual({ w: 800, h: 600 }); });
});

describe("sniffType", () => {
  it("reads the real type from the first bytes", () => {
    expect(sniffType(bytes(0x89, 0x50, 0x4e, 0x47))).toBe("image/png");
    expect(sniffType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffType(bytes(0x25, 0x50, 0x44, 0x46))).toBe("application/pdf");
    expect(sniffType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))).toBe("image/webp");
    expect(sniffType(bytes(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66))).toBe("image/avif");
    expect(sniffType(bytes(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63))).toBe("image/heic");
    expect(sniffType(bytes(1, 2, 3))).toBeUndefined();
  });
});

describe("planFor", () => {
  it("keeps a small file that is what it says it is", () => { expect(planFor("image/jpeg", "image/jpeg", 300_000)).toEqual({ do: "keep" }); });
  it("relabels a PNG that was saved as .jpg (the server would refuse the mismatch)", () => { expect(planFor("image/png", "image/jpeg", 300_000)).toEqual({ do: "retype", type: "image/png" }); });
  it("converts big images, and formats the server cannot read", () => {
    expect(planFor("image/jpeg", "image/jpeg", 6_000_000)).toEqual({ do: "convert" });
    expect(planFor("image/avif", "image/jpeg", 200_000)).toEqual({ do: "convert" });
    expect(planFor("image/heic", "image/heic", 300_000)).toEqual({ do: "convert" });
    expect(planFor("image/gif", "image/gif", 100_000)).toEqual({ do: "convert" });
  });
  it("trusts the contents over an empty or wrong label", () => { expect(planFor("image/png", "", 100_000)).toEqual({ do: "retype", type: "image/png" }); });
  it("never converts a PDF, whatever it is called", () => { expect(planFor("application/pdf", "application/pdf", 3_000_000)).toEqual({ do: "keep" }); expect(planFor("application/pdf", "image/jpeg", 3_000_000)).toEqual({ do: "retype", type: "application/pdf" }); });
});
