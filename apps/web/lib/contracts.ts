import { z } from "zod";

export const EvidenceSchema = z.object({
  id: z.string(), kind: z.enum(["fact", "assumption", "calculation", "inference", "simulation", "recommendation"]),
  claim: z.string(), source: z.string().optional(), confidence: z.number().min(0).max(1).optional(),
  illustrative: z.boolean().optional(), inputs: z.array(z.string()).optional(),
});
const ScenePatch = z.object({ level: z.enum(["map", "ecosystem", "factory"]), patch: z.record(z.unknown()), camera: z.enum(["stay", "dive", "rise"]).optional() });
const Step = z.enum(["understand_ambition", "identify_materials", "map_processes", "discover_clusters", "compare_locations", "construct_factory", "calculate_economics", "simulate_environment", "detect_waste", "search_circular", "discover_opportunities"]);
const EventBase = z.object({ type: z.string(), runId: z.string().optional() });
export const AguiEventSchema = EventBase.passthrough().superRefine((event, ctx) => {
  const need = (...keys: string[]) => keys.forEach((key) => { if (!(key in event)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${event.type} requires ${key}` }); });
  if (!["RUN_STARTED", "STEP_STARTED", "STEP_FINISHED", "SCENE_PATCH", "DISCOVERY", "DISCOVERY_RESOLVED", "EVIDENCE", "SIMULATION_RESULT", "UI_REQUEST", "UI_RESPONSE", "RUN_FINISHED", "RUN_ERROR"].includes(event.type)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Unsupported event ${event.type}` });
  if (event.type === "RUN_STARTED") need("runId", "mission");
  if (["STEP_STARTED", "STEP_FINISHED"].includes(event.type)) need("runId", "step");
  if (event.type === "SCENE_PATCH") need("runId", "scene");
  if (event.type === "DISCOVERY") need("runId", "id", "kind", "anchor", "title", "evidence");
});
export type AguiEvent = z.infer<typeof AguiEventSchema>;

const OptionSchema = z.object({ value: z.string(), label: z.string(), hint: z.string().optional(), estimate: z.boolean().optional() }).strict();
export const A2uiRequestSchema = z.object({
  type: z.literal("UI_REQUEST"), requestId: z.string(), runId: z.string(),
  component: z.enum(["CapacitySelector", "RegionSelector", "MaterialSelector", "ConstraintSelector", "PrioritySelector", "ScenarioComparison", "SimulationControls"]),
  version: z.literal(1), reason: z.string().max(140), question: z.string().max(120).optional(), blocksSteps: z.array(z.string()).optional(), props: z.record(z.unknown()),
}).superRefine((request, ctx) => {
  if (request.component === "CapacitySelector") {
    const capacity = z.object({ options: z.array(OptionSchema).min(2), default: z.string().optional(), unit: z.literal("units_per_year").optional() }).strict().safeParse(request.props);
    if (!capacity.success) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid CapacitySelector props" });
  }
});
export type A2uiRequest = z.infer<typeof A2uiRequestSchema>;

export const ScenarioSchema = z.object({
  id: z.string(), mission: z.string(), params: z.object({ unitsPerYear: z.number(), region: z.string(), horizonYears: z.number(), priority: z.string() }),
  locations: z.array(z.object({ id: z.string(), name: z.string(), score: z.number(), recommended: z.boolean().optional(), why: z.string() })),
  economics: z.object({ capexInrCrore: z.number(), paybackYears: z.number(), unitCostInr: z.number() }).passthrough(),
  environment: z.record(z.unknown()), factory: z.object({ processes: z.array(z.object({ id: z.string(), label: z.string(), stage: z.string(), status: z.object({ tone: z.string(), label: z.string() }), metrics: z.record(z.unknown()) })) }).passthrough(),
  waste: z.record(z.unknown()), circular: z.record(z.unknown()), simulation: z.record(z.unknown()), evidence: z.array(EvidenceSchema).optional(),
}).passthrough();
export type Scenario = z.infer<typeof ScenarioSchema>;
