import { describe, expect, it } from "vitest";
import { GestureEngine, extendedFingers, isFist, isOpenPalm, pinchRatio, type GestureEvent, type Hand } from "./gesture-logic";

type Shape = "open" | "fist" | "pinch" | "relaxed";
/** A synthetic hand (camera coordinates, y down). Hand size is 0.1, wrist at (x, y + .15). */
function hand(shape: Shape, x = 0.5, y = 0.5): Hand {
  const h = Array.from({ length: 21 }, () => ({ x, y }));
  h[0] = { x, y: y + 0.15 }; h[9] = { x, y: y + 0.05 };
  const pips = [6, 10, 14, 18], tips = [8, 12, 16, 20], spread = [-0.04, -0.015, 0.01, 0.035];
  pips.forEach((p, i) => { h[p] = { x: x + spread[i], y: y + 0.0 }; });
  tips.forEach((t, i) => { h[t] = { x: x + spread[i], y: shape === "open" || shape === "pinch" && i > 0 ? y - 0.09 : y + 0.04 }; });
  if (shape === "pinch") { h[8] = { x, y }; h[4] = { x: x + 0.012, y: y + 0.005 }; }
  else h[4] = { x: x - 0.12, y: y + 0.02 };
  return h;
}
const run = (e: GestureEngine, frames: { hands: Hand[]; t: number }[]) => frames.flatMap((f) => e.update(f.hands, f.t));
const kinds = (ev: GestureEvent[]) => ev.filter((x) => x.type !== "pointer");

describe("hand shapes", () => {
  it("tells pinch, open palm and fist apart", () => {
    expect(pinchRatio(hand("pinch"))).toBeLessThan(0.3); expect(pinchRatio(hand("open"))).toBeGreaterThan(0.6);
    expect(isOpenPalm(hand("open"))).toBe(true); expect(extendedFingers(hand("fist"))).toBe(0); expect(isFist(hand("fist"))).toBe(true); expect(isFist(hand("open"))).toBe(false);
  });
});

describe("gestures", () => {
  it("a quick pinch with little movement is a tap where it happened (mirrored)", () => {
    const ev = kinds(run(new GestureEngine(), [{ hands: [hand("open", 0.3, 0.4)], t: 0 }, { hands: [hand("pinch", 0.3, 0.4)], t: 100 }, { hands: [hand("pinch", 0.3, 0.4)], t: 200 }, { hands: [hand("open", 0.3, 0.4)], t: 300 }]));
    expect(ev).toHaveLength(1); const tap = ev[0] as Extract<GestureEvent, { type: "tap" }>;
    expect(tap.type).toBe("tap"); expect(tap.x).toBeCloseTo(0.7, 1); expect(tap.y).toBeCloseTo(0.4, 1);
  });
  it("a held pinch that moves rotates and does not tap", () => {
    const frames = [0, 1, 2, 3, 4, 5].map((i) => ({ hands: [hand("pinch", 0.3 + i * 0.03, 0.5)], t: i * 50 })).concat([{ hands: [hand("open", 0.5, 0.5)], t: 400 }]);
    const ev = kinds(run(new GestureEngine(), frames));
    expect(ev.filter((e) => e.type === "tap")).toHaveLength(0);
    const rot = ev.filter((e) => e.type === "rotate") as Extract<GestureEvent, { type: "rotate" }>[];
    expect(rot.length).toBeGreaterThan(2); expect(rot.every((r) => r.dx < 0)).toBe(true); // hand moves right on camera, which is left in the mirror
  });
  it("a slow pinch is not a tap", () => {
    const ev = kinds(run(new GestureEngine(), [{ hands: [hand("pinch")], t: 0 }, { hands: [hand("pinch")], t: 800 }, { hands: [hand("open")], t: 900 }]));
    expect(ev).toHaveLength(0);
  });
  it("two pinched hands spreading zoom in, closing zoom out", () => {
    const e = new GestureEngine();
    const at = (gap: number, t: number) => ({ hands: [hand("pinch", 0.5 - gap / 2, 0.5), hand("pinch", 0.5 + gap / 2, 0.5)], t });
    const ev = run(e, [at(0.2, 0), at(0.3, 50), at(0.4, 100), at(0.3, 150), at(0.2, 200)]).filter((x) => x.type === "zoom") as Extract<GestureEvent, { type: "zoom" }>[];
    expect(ev[0].factor).toBeGreaterThan(1); expect(ev[1].factor).toBeGreaterThan(1); expect(ev[2].factor).toBeLessThan(1); expect(ev[3].factor).toBeLessThan(1);
    expect(kinds(run(new GestureEngine(), [at(0.2, 0), at(0.3, 50)])).some((x) => x.type === "rotate" || x.type === "tap")).toBe(false);
  });
  it("a held fist resets once, not before the hold time and not again until released", () => {
    const e = new GestureEngine();
    expect(kinds(run(e, [{ hands: [hand("fist")], t: 0 }, { hands: [hand("fist")], t: 300 }]))).toHaveLength(0);
    expect(kinds(run(e, [{ hands: [hand("fist")], t: 800 }, { hands: [hand("fist")], t: 1500 }])).map((x) => x.type)).toEqual(["reset"]);
    expect(kinds(run(e, [{ hands: [hand("open")], t: 1600 }, { hands: [hand("fist")], t: 1700 }, { hands: [hand("fist")], t: 2500 }])).map((x) => x.type)).toEqual(["reset"]);
  });
  it("a quick sweep of an open palm is a swipe, with a cooldown", () => {
    const e = new GestureEngine();
    const sweep = (from: number, to: number, t0: number) => Array.from({ length: 6 }, (_, i) => ({ hands: [hand("open", from + ((to - from) * i) / 5, 0.5)], t: t0 + i * 50 }));
    const ev = kinds(run(e, sweep(0.8, 0.3, 0)));   // moving left on camera = right in the mirror
    expect(ev.map((x) => x.type)).toEqual(["swipe"]); expect((ev[0] as Extract<GestureEvent, { type: "swipe" }>).dir).toBe("right");
    expect(kinds(run(e, sweep(0.3, 0.8, 400)))).toHaveLength(0);                 // too soon after the last one
    expect((kinds(run(e, sweep(0.3, 0.8, 1600)))[0] as Extract<GestureEvent, { type: "swipe" }>).dir).toBe("left");
    expect(kinds(run(new GestureEngine(), Array.from({ length: 8 }, (_, i) => ({ hands: [hand("open", 0.5 + i * 0.002, 0.5)], t: i * 50 }))))).toHaveLength(0); // slow drifting is not a swipe
  });
  it("shows a pointer while a hand is visible and hides it when it leaves", () => {
    const e = new GestureEngine();
    const seen = e.update([hand("open", 0.4, 0.3)], 0).find((x) => x.type === "pointer") as Extract<GestureEvent, { type: "pointer" }>;
    expect(seen.visible).toBe(true); expect(seen.x).toBeCloseTo(0.6, 1);
    expect((e.update([], 50)[0] as Extract<GestureEvent, { type: "pointer" }>).visible).toBe(false);
  });
  it("a flickery pinch around the threshold does not break a drag (hysteresis)", () => {
    const e = new GestureEngine(); const loose = hand("pinch", 0.5, 0.5); loose[4] = { x: 0.5 + 0.038, y: 0.5 }; // ratio ~0.38: between on and off
    const ev = kinds(run(e, [{ hands: [hand("pinch")], t: 0 }, { hands: [loose], t: 50 }, { hands: [hand("pinch", 0.54, 0.5)], t: 100 }, { hands: [hand("pinch", 0.58, 0.5)], t: 150 }]));
    expect(ev.filter((x) => x.type === "rotate").length).toBeGreaterThanOrEqual(1);
  });
});
