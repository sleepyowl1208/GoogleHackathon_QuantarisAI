/** Turns hand landmarks (21 points per hand, as MediaPipe reports them) into a few clear gestures. Pure and testable: no camera, no browser. */
export type Pt = { x: number; y: number; z?: number };
export type Hand = Pt[];
export type GestureEvent =
  | { type: "pointer"; x: number; y: number; visible: boolean }
  | { type: "rotate"; dx: number; dy: number }
  | { type: "zoom"; factor: number }
  | { type: "tap"; x: number; y: number }
  | { type: "swipe"; dir: "left" | "right" }
  | { type: "reset" };

const WRIST = 0, THUMB_TIP = 4, INDEX_TIP = 8, MIDDLE_MCP = 9;
const FINGERS: [number, number][] = [[8, 6], [12, 10], [16, 14], [20, 18]]; // [tip, pip]
const PINCH_ON = 0.3, PINCH_OFF = 0.46; // thumb-to-index distance as a share of hand size; the gap stops a flickery pinch
const TAP_MS = 450, TAP_TRAVEL = 0.04, FIST_MS = 700, SWIPE_DX = 0.32, SWIPE_MS = 380, SWIPE_COOLDOWN = 900;
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

export const handSize = (h: Hand) => Math.max(1e-6, dist(h[WRIST], h[MIDDLE_MCP]));
export const pinchRatio = (h: Hand) => dist(h[THUMB_TIP], h[INDEX_TIP]) / handSize(h);
export const pinchPoint = (h: Hand): Pt => ({ x: (h[THUMB_TIP].x + h[INDEX_TIP].x) / 2, y: (h[THUMB_TIP].y + h[INDEX_TIP].y) / 2 });
export const extendedFingers = (h: Hand) => FINGERS.filter(([tip, pip]) => dist(h[WRIST], h[tip]) > dist(h[WRIST], h[pip]) * 1.12).length;
export const isFist = (h: Hand) => extendedFingers(h) === 0 && pinchRatio(h) > PINCH_OFF;
export const isOpenPalm = (h: Hand) => extendedFingers(h) >= 3;

type Pinch = { startX: number; startY: number; lastX: number; lastY: number; t0: number; travel: number };

/** Feed it the hands seen in each camera frame; it returns what the person just did. x is mirrored, so moving your hand right moves things right. */
export class GestureEngine {
  private pinch?: Pinch;
  private twoHand?: number; // distance between the two pinch points last frame
  private fistSince?: number;
  private fistFired = false;
  private wristTrail: { x: number; t: number }[] = [];
  private lastSwipe = -1e9;
  private pointer?: { x: number; y: number };

  update(hands: Hand[], now: number): GestureEvent[] {
    const out: GestureEvent[] = [];
    if (hands.length === 0) { this.endPinch(now, out, false); this.fistSince = undefined; this.fistFired = false; this.twoHand = undefined; this.wristTrail = []; this.pointer = undefined; out.push({ type: "pointer", x: 0, y: 0, visible: false }); return out; }
    const mine = hands.slice(0, 2).sort((a, b) => a[WRIST].x - b[WRIST].x);
    const pinching = mine.filter((h) => (this.pinch || this.twoHand !== undefined ? pinchRatio(h) < PINCH_OFF : pinchRatio(h) < PINCH_ON));

    if (mine.length === 2 && pinching.length === 2) {          // two hands pinched: spread = zoom in, bring together = zoom out
      this.pinch = undefined;
      const a = pinchPoint(pinching[0]), b = pinchPoint(pinching[1]); const d = Math.max(1e-6, dist(a, b));
      if (this.twoHand !== undefined && Math.abs(d - this.twoHand) > 0.002) out.push({ type: "zoom", factor: d / this.twoHand });
      this.twoHand = d; this.fistSince = undefined;
      out.push({ type: "pointer", x: 1 - (a.x + b.x) / 2, y: (a.y + b.y) / 2, visible: true });
      return out;
    }
    this.twoHand = undefined;
    const hand = pinching[0] ?? mine[0];

    if (pinching.length >= 1) {                                // one hand pinched: drag = rotate, quick pinch = tap
      const p = pinchPoint(pinching[0]); const x = 1 - p.x, y = p.y;
      if (!this.pinch) this.pinch = { startX: x, startY: y, lastX: x, lastY: y, t0: now, travel: 0 };
      else {
        const dx = x - this.pinch.lastX, dy = y - this.pinch.lastY;
        this.pinch.travel += Math.hypot(dx, dy); this.pinch.lastX = x; this.pinch.lastY = y;
        if (this.pinch.travel > TAP_TRAVEL) out.push({ type: "rotate", dx, dy });
      }
      out.push({ type: "pointer", x, y, visible: true }); this.fistSince = undefined;
      return out;
    }
    this.endPinch(now, out, true);

    const tip = hand[INDEX_TIP]; const px = 1 - tip.x, py = tip.y;
    this.pointer = this.pointer ? { x: this.pointer.x + (px - this.pointer.x) * 0.55, y: this.pointer.y + (py - this.pointer.y) * 0.55 } : { x: px, y: py };
    out.push({ type: "pointer", x: this.pointer.x, y: this.pointer.y, visible: true });

    if (isFist(hand)) {                                        // a closed fist held for a moment resets the view
      this.fistSince ??= now;
      if (!this.fistFired && now - this.fistSince >= FIST_MS) { this.fistFired = true; out.push({ type: "reset" }); }
    } else { this.fistSince = undefined; this.fistFired = false; }

    this.wristTrail.push({ x: 1 - hand[WRIST].x, t: now }); this.wristTrail = this.wristTrail.filter((s) => now - s.t <= SWIPE_MS);
    if (isOpenPalm(hand) && this.wristTrail.length > 3 && now - this.lastSwipe > SWIPE_COOLDOWN) {   // a quick sweep of an open palm = next or previous
      const dx = this.wristTrail[this.wristTrail.length - 1].x - this.wristTrail[0].x;
      if (Math.abs(dx) > SWIPE_DX) { this.lastSwipe = now; this.wristTrail = []; out.push({ type: "swipe", dir: dx > 0 ? "right" : "left" }); }
    }
    return out;
  }

  private endPinch(now: number, out: GestureEvent[], visible: boolean) {
    const p = this.pinch; this.pinch = undefined;
    if (p && now - p.t0 <= TAP_MS && p.travel <= TAP_TRAVEL) out.push({ type: "tap", x: p.startX, y: p.startY });
    void visible;
  }
}
