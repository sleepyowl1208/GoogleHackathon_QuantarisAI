export type V3 = [number, number, number];
export type PropKind = "tank" | "silo" | "boiler" | "furnace" | "conveyor" | "press" | "rack" | "truck" | "filter" | "machine";

// Equipment names come from the AI, so props are chosen by what the equipment is, not by a fixed factory template.
// A furnace only appears where the plan lists one; a cotton mill without a boiler never gets a boiler.
const KEYWORDS: [PropKind, RegExp][] = [
  ["furnace", /furnace|kiln|oven|reheat|smelt|melt|roaster|dryer|भट्टी|फर्नेस|ड्रायर/i],
  ["boiler", /boiler|steam|cooker|kettle|बॉयलर|भाप/i],
  ["silo", /silo|hopper|bunker|सिलो/i],
  ["tank", /tank|vat|vessel|reactor|drum|cistern|settl|टैंक|ड्रम/i],
  ["conveyor", /conveyor|belt|roller table|elevator|feeder|कन्वेयर|बेल्ट/i],
  ["filter", /filter|separator|screen|sieve|clean|wash|scrubber|फ़िल्टर|फिल्टर|छन/i],
  ["press", /press|expeller|crusher|mill|grinder|cutter|shear|stand|roll|extruder|मिल|प्रेस|चक्की|कटर/i],
  ["rack", /rack|shelf|pallet|storage|store|racking|रैक|गोदाम/i],
  ["truck", /truck|dock|forklift|weighbridge|loader|trolley|ट्रक|फोर्कलिफ्ट/i],
];
export function propKind(name: string): PropKind { return KEYWORDS.find(([, re]) => re.test(name))?.[0] ?? "machine"; }

/** Frames the camera to the plot's shape: a long plot is viewed from the side so it spreads across the (wide) viewer instead of receding into the distance. */
export function cameraSetup(W: number, D: number): { position: V3; north: "up" | "right" } {
  const reach = Math.max(W, D);
  if (D > W * 1.25) { const k = reach * 0.8; return { position: [k * 0.95, k * 0.62, k * 0.3], north: "right" }; }
  if (W > D * 1.25) { const k = reach * 0.8; return { position: [k * 0.3, k * 0.62, k * 0.95], north: "up" }; }
  const k = reach * 1.15; return { position: [k * 0.8, k * 0.75, k * 0.95], north: "up" };
}


import type { LayoutResult, Vehicle } from "./layout-api";

/** Without an explicit list, one truck brings material to the first step and one takes product away from the last, so the plant always looks busy. */
export function defaultVehicles(layout: LayoutResult): Vehicle[] {
  const steps = layout.zones.filter((z) => z.step && z.kind !== "livestock").sort((a, b) => (a.step ?? 0) - (b.step ?? 0)); // trucks do not drive into a cattle pasture
  return steps.length > 1 ? [{ kind: "truck", zone_id: steps[0].zone_id, direction: "in", label: "" }, { kind: "truck", zone_id: steps[steps.length - 1].zone_id, direction: "out", label: "" }] : [];
}
