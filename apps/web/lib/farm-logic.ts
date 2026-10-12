export type CropKind = "pineapple" | "tree" | "rows";
const TREES = /mango|coconut|banana|orange|citrus|lemon|guava|apple|cashew|areca|arecanut|rubber|palm|papaya|jackfruit|pomegranate|olive|coffee|cocoa|cacao|almond/i;
const ROWS = /sugarcane|cane|wheat|paddy|rice|maize|corn|cotton|tea|tomato|soy|vegetable|potato|onion|chilli|chili|turmeric|ginger|barley|millet|jowar|bajra|groundnut|mustard|sunflower/i;
/** How a crop is drawn: pineapple plants low in rows, trees spaced out, or plain crop rows. Anything unknown is drawn as rows. */
export const cropKind = (crop: string): CropKind => (/pineapple/i.test(crop) ? "pineapple" : TREES.test(crop) ? "tree" : ROWS.test(crop) ? "rows" : "rows");

export type FarmPlace = { cx: number; cz: number; width: number; depth: number; out: [number, number]; entry: [number, number]; gate: [number, number]; spanX: number; spanZ: number };
/** Where the farm goes: just outside the plot on the side the gate is on, next to the entry. Plot x runs east, plot y runs north; the scene's z is the opposite of y. */
export function farmPlace(W: number, D: number, entry: { x: number; y: number }, reach: number): FarmPlace {
  const d = { west: entry.x, east: W - entry.x, south: entry.y, north: D - entry.y };
  const side = (Object.entries(d).sort((a, b) => a[1] - b[1])[0][0]) as keyof typeof d;
  const out: [number, number] = side === "west" ? [-1, 0] : side === "east" ? [1, 0] : side === "south" ? [0, 1] : [0, -1];
  const ex = entry.x - W / 2, ez = -(entry.y - D / 2);
  const edgeLength = out[0] === 0 ? W : D;
  const length = Math.min(Math.max(reach * 0.55, 14), edgeLength * 0.95), depth = Math.max(reach * 0.3, 10), gap = Math.max(reach * 0.05, 2);
  const cx = ex + out[0] * (gap + depth / 2), cz = ez + out[1] * (gap + depth / 2);
  const width = out[0] === 0 ? length : depth, dep = out[0] === 0 ? depth : length;
  // the farm pushes the camera's frame outward on its own side only
  const spanX = out[0] !== 0 ? gap + depth : 0, spanZ = out[1] !== 0 ? gap + depth : 0;
  return { cx, cz, width, depth: dep, out, entry: [ex, ez], gate: [ex + out[0] * gap, ez + out[1] * gap], spanX, spanZ };
}
