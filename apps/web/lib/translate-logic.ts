/** Which fields hold prose that should follow the chosen language. Names of places and companies, links, ids and numbers are never listed, so they cannot be changed. */
export type Piece = "design" | "improvement" | "insights" | "research" | "practices" | "costs";
const LAYOUT = ["label", "zones[].label", "zones[].note", "zones[].detail", "zones[].equipment[]", "zones[].outputs[]", "claims[].statement", "claims[].reason", "claims[].methodology"];
const WASTE = ["waste_streams[].name", "waste_streams[].description", "waste_streams[].by_product_ideas[]"];
const CLAIMS = ["claims[].statement", "claims[].reason", "claims[].methodology"];
export const PATTERNS: Record<Piece, string[]> = {
  design: ["label", "zones[].label", "zones[].note", "zones[].detail", "zones[].equipment[]", "zones[].outputs[]", ...WASTE, "utilities[]", "environment[].aspect", "environment[].impact", "environment[].mitigation", ...CLAIMS],
  improvement: [...LAYOUT.map((x) => `as_is_layout.${x}`), ...LAYOUT.map((x) => `proposed_layout.${x}`), "business", "as_is_steps[].label", "as_is_steps[].note", "opportunities[].title", "opportunities[].why_it_fits", "opportunities[].needs[]", "opportunities[].outputs[]", "opportunities[].environmental_benefit", "opportunities[].risks", "opportunities[].verify", "hotspots[].area", "hotspots[].description", "hotspots[].quick_fix", ...WASTE, "questions[]", ...CLAIMS],
  insights: ["byproduct_flows[].waste", "byproduct_flows[].treatment[]", "byproduct_flows[].benefit", "byproduct_flows[].verify", "byproduct_flows[].products[].name", "byproduct_flows[].products[].use", "byproduct_flows[].products[].buyer", "loads[].note", "water_train[].name", "water_train[].purpose", "resource_actions[].title", "resource_actions[].detail", "env_actions[].title", "env_actions[].aspect", "env_actions[].first_step", "env_actions[].verify", "operations[].what", "operations[].data_needed[]", "operations[].first_step", ...CLAIMS],
  practices: ["summary", "practices[].title", "practices[].countries", "practices[].what", "practices[].why_it_works", "practices[].example", "practices[].for_you", "standards[].name", "standards[].note", ...CLAIMS],
  costs: ["machines[].basis", "land[].how_to_get", "land[].kind", "benchmarks[].metric", "benchmarks[].value", "benchmarks[].applies_to", ...CLAIMS],
  research: ["summary", "places[].material", "places[].note", "discoveries[].title", "discoveries[].body", ...CLAIMS],
};

type Slot = { get: () => string; set: (value: string) => void };

function walk(node: unknown, parts: string[], out: Slot[]) {
  if (node === null || typeof node !== "object" || parts.length === 0) return;
  const [head, ...rest] = parts;
  const many = head.endsWith("[]");
  const key = many ? head.slice(0, -2) : head;
  const holder = node as Record<string, unknown>;
  const value = holder[key];
  if (many) {
    if (!Array.isArray(value)) return;
    if (rest.length === 0) value.forEach((item, i) => { if (typeof item === "string") out.push({ get: () => value[i] as string, set: (v) => { value[i] = v; } }); });
    else value.forEach((item) => walk(item, rest, out));
  } else if (rest.length === 0) {
    if (typeof value === "string") out.push({ get: () => holder[key] as string, set: (v) => { holder[key] = v; } });
  } else walk(value, rest, out);
}

const hasLetters = (s: string) => /\p{L}/u.test(s) && s.length <= 600; // very long texts are left in their original language rather than cut off
function collect(root: unknown, patterns: string[]): Slot[] {
  const out: Slot[] = [];
  for (const pattern of patterns) walk(root, pattern.split("."), out);
  return out.filter((slot) => hasLetters(slot.get()));
}

/** The distinct texts to translate for one piece, in a stable order. */
export function extractTexts(piece: Piece, value: unknown): string[] {
  return [...new Set(collect(value, PATTERNS[piece]).map((slot) => slot.get().trim()))];
}

/** A copy of the piece with every listed text replaced by its translation; texts without one stay as they were. */
export function applyTexts<T>(piece: Piece, value: T, translations: Map<string, string>): T {
  const copy = JSON.parse(JSON.stringify(value)) as T;
  for (const slot of collect(copy, PATTERNS[piece])) { const found = translations.get(slot.get().trim()); if (found) slot.set(found); }
  return copy;
}
