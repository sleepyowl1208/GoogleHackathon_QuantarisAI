import type { Improvement } from "./chat-api";
import type { LayoutResult } from "./layout-api";

export type MachineRef = { name: string; step: string };
const MAX = 12;
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The machines worth pricing in a design: the main equipment of each step, in process order, without repeats. Animals and land are not machines. */
export function machinesFor(layout: LayoutResult): MachineRef[] {
  const out: MachineRef[] = [];
  const steps = layout.zones.filter((z) => z.step && z.kind !== "livestock").sort((a, b) => (a.step ?? 0) - (b.step ?? 0));
  for (let pass = 0; pass < 3 && out.length < MAX; pass++)           // first the lead machine of every step, then the second, then the third
    for (const z of steps) { const name = z.equipment[pass]; if (name && out.length < MAX && !out.some((m) => same(m.name, name))) out.push({ name: name.slice(0, 80), step: z.label.slice(0, 80) }); }
  return out;
}

/** For an existing factory the new spend is the new equipment: what the added sections would hold, then what the ideas say they need. */
export function machinesForImprovement(data: Improvement): MachineRef[] {
  const out: MachineRef[] = [];
  const add = (name: string, step: string) => { if (name.trim() && out.length < MAX && !out.some((m) => same(m.name, name))) out.push({ name: name.trim().slice(0, 80), step: step.slice(0, 80) }); };
  const base = new Set((data.as_is_layout?.zones ?? []).map((z) => z.zone_id));
  for (const z of data.proposed_layout?.zones ?? []) if (z.step && !base.has(z.zone_id)) z.equipment.forEach((e) => add(e, z.label));
  for (const o of data.opportunities) o.needs.forEach((n) => add(n, o.title));
  return out;
}
