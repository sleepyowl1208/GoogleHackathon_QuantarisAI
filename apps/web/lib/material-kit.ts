/** What material looks like as it moves through a plant: the raw form that comes in, an in-process form, and the finished product that goes out. Chosen from the kind of industry; names come from the design itself. */
export type Shape = "box" | "sack" | "cylinder" | "roll" | "bar" | "sphere" | "egg";
export type Form = { shape: Shape; color: string; accent?: string; size: [number, number, number] };
export type Kit = { raw: Form; mid: Form; product: Form };

const CRATE: Kit = { raw: { shape: "box", color: "#B5865A", size: [0.5, 0.32, 0.38] }, mid: { shape: "box", color: "#8E6A45", size: [0.5, 0.32, 0.38] }, product: { shape: "box", color: "#E2C79A", accent: "#C0392B", size: [0.46, 0.36, 0.36] } };
const KITS: [RegExp, Kit][] = [
  [/milk|dairy|curd|butter|ghee|paneer|cheese|yogh?urt/i, { raw: { shape: "cylinder", color: "#C9D2D8", accent: "#7B8791", size: [0.34, 0.5, 0.34] }, mid: { shape: "cylinder", color: "#F7EBC8", size: [0.42, 0.28, 0.42] }, product: { shape: "box", color: "#F6F3EA", accent: "#FF9933", size: [0.46, 0.34, 0.34] } }],
  [/\beggs?\b|poultry|\bhens?\b/i, { raw: { shape: "egg", color: "#C58E5B", size: [0.2, 0.26, 0.2] }, mid: { shape: "box", color: "#D8D2C4", accent: "#C58E5B", size: [0.5, 0.1, 0.5] }, product: { shape: "box", color: "#D9C7A0", size: [0.5, 0.24, 0.34] } }],
  [/coconut|coir|husk|coco/i, { raw: { shape: "egg", color: "#7A5430", size: [0.3, 0.38, 0.3] }, mid: { shape: "roll", color: "#C8A66A", size: [0.18, 0.18, 0.7] }, product: { shape: "box", color: "#5B3B22", accent: "#8B6B45", size: [0.52, 0.3, 0.38] } }],
  [/steel|iron|rolling|metal|switchgear|motor|machin|fabricat|casting|foundry|forging|electrical|engineering/i, { raw: { shape: "bar", color: "#8A929A", size: [0.14, 0.14, 0.8] }, mid: { shape: "bar", color: "#B4BBC2", size: [0.1, 0.1, 0.8] }, product: { shape: "box", color: "#9AA3AB", accent: "#FF9933", size: [0.5, 0.3, 0.4] } }],
  [/textile|cloth|fabric|garment|cotton|dye|dyeing|yarn|weav/i, { raw: { shape: "box", color: "#EFE9DC", size: [0.5, 0.36, 0.4] }, mid: { shape: "roll", color: "#E07B39", size: [0.2, 0.2, 0.6] }, product: { shape: "box", color: "#F3EFE6", accent: "#E07B39", size: [0.46, 0.2, 0.36] } }],
  [/pickle|mango|fruit|vegetable|jam|juice|tomato|onion|potato/i, { raw: { shape: "sphere", color: "#E8B923", size: [0.22, 0.22, 0.22] }, mid: { shape: "sphere", color: "#E07B39", size: [0.14, 0.14, 0.14] }, product: { shape: "cylinder", color: "#7A3B1E", accent: "#C0392B", size: [0.26, 0.32, 0.26] } }],
  [/flour|wheat|grain|rice|atta|pulses|oil|seed|mill/i, { raw: { shape: "sack", color: "#C9A66B", size: [0.38, 0.5, 0.26] }, mid: { shape: "sack", color: "#E8DCC0", size: [0.34, 0.44, 0.24] }, product: { shape: "sack", color: "#F4F0E6", accent: "#138808", size: [0.34, 0.44, 0.24] } }],
];
export const kitFor = (industry: string): Kit => KITS.find(([re]) => re.test(industry))?.[1] ?? CRATE;

/** 0 raw, 1 in process, 2 finished: the form of material after it has passed a step of this kind. */
export const formIndexAfter = (kind: string): 0 | 1 | 2 => (["process"].includes(kind) ? 1 : ["pack", "store", "dispatch"].includes(kind) ? 2 : 0);

type NamedZone = { step: number | null; kind: string; label: string; outputs: string[] };
/** The words for the two ends of the line, taken from the design: what the first step receives and what the last steps hand over. */
export function flowNames(zones: NamedZone[]): { raw: string; product: string } {
  const steps = zones.filter((z) => z.step).sort((a, b) => (a.step ?? 0) - (b.step ?? 0));
  const first = steps[0];
  const last = [...steps].reverse().find((z) => z.kind === "pack") ?? [...steps].reverse().find((z) => z.kind === "dispatch") ?? steps[steps.length - 1];
  const say = (z?: NamedZone) => (z ? (z.outputs[0] ?? z.label) : "");
  return { raw: say(first).slice(0, 40), product: say(last).slice(0, 40) };
}
