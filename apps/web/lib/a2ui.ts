import { A2uiRequestSchema, type A2uiRequest } from "./contracts";

export const A2UI_CATALOG = new Set(["CapacitySelector", "ClarificationSelector", "RegionSelector", "MaterialSelector", "ConstraintSelector", "PrioritySelector", "ScenarioComparison", "SimulationControls"]);
export type A2uiValidation = { ok: true; request: A2uiRequest } | { ok: false; code: "unknown_component" | "unsupported_version" | "invalid_props"; message: string };
export function validateA2uiRequest(value: unknown): A2uiValidation {
  const preliminary = value as { component?: string; version?: number };
  if (!A2UI_CATALOG.has(preliminary.component ?? "")) return { ok: false, code: "unknown_component", message: "This UI request is not in the approved Quantaris catalog." };
  if (preliminary.version !== 1) return { ok: false, code: "unsupported_version", message: "This UI request uses an unsupported catalog version." };
  const parsed = A2uiRequestSchema.safeParse(value);
  return parsed.success ? { ok: true, request: parsed.data } : { ok: false, code: "invalid_props", message: "This UI request has invalid structured props." };
}
