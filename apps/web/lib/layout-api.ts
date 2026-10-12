import { z } from "zod";

export const ClaimClassificationSchema = z.enum(["FACT", "ASSUMPTION", "CALCULATION", "INFERENCE", "RECOMMENDATION", "SIMULATION", "UNKNOWN"]);
export type ClaimClassification = z.infer<typeof ClaimClassificationSchema>;

export const ClaimSchema = z.object({ claim_id: z.string(), statement: z.string(), classification: ClaimClassificationSchema, reason: z.string().nullish(), confidence: z.number().nullish(), methodology: z.string().nullish() }).passthrough();
const ZoneSchema = z.object({
  zone_id: z.string(), label: z.string(), kind: z.string(), x: z.number(), y: z.number(), width_m: z.number(), depth_m: z.number(), height_m: z.number(), area_m2: z.number(),
  step: z.number().nullable(), note: z.string(), equipment: z.array(z.string()).default([]), icon: z.string().default("factory"), detail: z.string().default(""), outputs: z.array(z.string()).default([]),
  level: z.number().default(0), elevation_m: z.number().default(0),
});
const VehicleSchema = z.object({ kind: z.enum(["truck", "tanker", "tractor"]).default("truck"), zone_id: z.string(), direction: z.enum(["in", "out"]).default("in"), label: z.string().default("") });
export type Vehicle = z.infer<typeof VehicleSchema>;
const PointSchema = z.object({ x: z.number(), y: z.number() });
export const WasteSchema = z.object({ name: z.string(), description: z.string(), by_product_ideas: z.array(z.string()) });
const EnvironmentSchema = z.object({ aspect: z.string(), impact: z.string(), mitigation: z.string().default("") });

export const LayoutResultSchema = z.object({
  industry: z.string(), label: z.string(), width_m: z.number(), depth_m: z.number(), size_was_suggested: z.boolean(), fits: z.boolean(),
  zones: z.array(ZoneSchema), flow: z.array(z.object({ from_id: z.string(), to_id: z.string() })), entry: PointSchema, exit: PointSchema,
  claims: z.array(ClaimSchema), freshness: z.string(),
  location: z.string().nullish(), waste_streams: z.array(WasteSchema).default([]), utilities: z.array(z.string()).default([]), environment: z.array(EnvironmentSchema).default([]), drafted_by: z.string().default("template"),
  levels: z.number().default(1), vehicles: z.array(VehicleSchema).default([]),
  raw_inputs: z.array(z.string()).default([]), products: z.array(z.string()).default([]), farm_crop: z.string().default(""),
});

export type Waste = z.infer<typeof WasteSchema>;
export type Zone = z.infer<typeof ZoneSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type LayoutResult = z.infer<typeof LayoutResultSchema>;
export type EnvironmentNote = z.infer<typeof EnvironmentSchema>;

/** The API can't be reached at all (down, or the dev proxy failed). */
export class ServiceUnreachableError extends Error {}
/** A failure with a message that is safe and useful to show the user as-is. */
export class BlueprintError extends Error {}

// One fixed treatment per claim kind (design-system/data-and-evidence.md). Labels are translated where they are shown.
export const claimStyle: Record<ClaimClassification, { glyph: string }> = {
  FACT: { glyph: "■" }, ASSUMPTION: { glyph: "◇" }, CALCULATION: { glyph: "Σ" }, INFERENCE: { glyph: "◐" }, SIMULATION: { glyph: "∿" }, RECOMMENDATION: { glyph: "→" }, UNKNOWN: { glyph: "?" },
};

// Earthy Bharat palette: saffron for work, greens for waste and water, clay and bronze for the rest. No blues.
export const zoneColor: Record<string, string> = {
  receive: "#8C5A2B", wash: "#2A9D8F", prep: "#C98A4B", process: "#FF9933", pack: "#F2CF9A",
  store: "#9C8B75", dispatch: "#5A3A1B", office: "#D8CFC2", utility: "#7C6A55", effluent: "#138808", byproduct: "#6DBE5E", livestock: "#7DBB5C",
};
