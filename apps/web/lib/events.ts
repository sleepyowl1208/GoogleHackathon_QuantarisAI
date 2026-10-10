import { AguiEventSchema, EvidenceSchema, type AguiEvent, type A2uiRequest } from "./contracts";
import { validateA2uiRequest } from "./a2ui";

export type SceneState = { map: Record<string, unknown>; ecosystem: Record<string, unknown>; factory: Record<string, unknown> };
export type Discovery = { id: string; kind: string; anchor: string; title: string; body?: string; evidence: string[]; level?: string; label?: string };
export type RunState = { status: "idle" | "running" | "complete" | "error"; runId?: string; mission?: string; activeStep?: string; feed: string[]; scene: SceneState; discoveries: Discovery[]; evidence: Map<string, ReturnType<typeof EvidenceSchema.parse>>; request?: A2uiRequest; error?: string };
export const initialRunState: RunState = { status: "idle", feed: [], scene: { map: { phase: 5, recommended: "tiruppur", circular: true }, ecosystem: { phase: 99, circular: "discovered", renewable: 0.3, layers:["material","energy","water","waste","circular"] }, factory: { phase: 99, circular: "discovered", selected: "cutting" } }, discoveries: [], evidence: new Map() };
function patchScene(state: RunState, scene: { level: "map" | "ecosystem" | "factory"; patch: Record<string, unknown> }) { return { ...state.scene, [scene.level]: { ...state.scene[scene.level], ...scene.patch } }; }
export function reduceEvent(state: RunState, input: unknown): RunState {
  const parsed = AguiEventSchema.safeParse(input); if (!parsed.success) return { ...state, status: "error", error: `Invalid fixture event: ${parsed.error.issues[0]?.message ?? "unknown error"}` };
  const event = parsed.data as AguiEvent & Record<string, unknown>;
  if (event.type === "RUN_STARTED") return { ...initialRunState, status: "running", runId: event.runId as string, mission: event.mission as string };
  if (event.type === "STEP_STARTED") return { ...state, activeStep: event.step as string, feed: [...state.feed, `→ ${event.label as string}`] };
  if (event.type === "STEP_FINISHED") { const evidence = new Map(state.evidence); for (const item of ((event.evidence as unknown[]) ?? [])) { const p = EvidenceSchema.safeParse(item); if (p.success) evidence.set(p.data.id, p.data); } return { ...state, activeStep: undefined, feed: [...state.feed, `✓ ${event.result as string}`], evidence, scene: event.scene ? patchScene(state, event.scene as { level: "map" | "ecosystem" | "factory"; patch: Record<string, unknown> }) : state.scene }; }
  if (event.type === "SCENE_PATCH") return { ...state, scene: patchScene(state, event.scene as { level: "map" | "ecosystem" | "factory"; patch: Record<string, unknown> }) };
  if (event.type === "DISCOVERY") return { ...state, discoveries: [...state.discoveries, { id: event.id as string, kind: event.kind as string, anchor: event.anchor as string, title: event.title as string, body: event.body as string | undefined, evidence: event.evidence as string[], level: event.level as string | undefined, label: event.label as string | undefined }] };
  if (event.type === "UI_REQUEST") { const result = validateA2uiRequest(event); return result.ok ? { ...state, request: result.request } : { ...state, status: "error", error: result.message }; }
  if (event.type === "UI_RESPONSE") return { ...state, request: undefined, feed: [...state.feed, "✓ Clarification recorded"] };
  if (event.type === "RUN_FINISHED") return { ...state, status: "complete", activeStep: undefined, request: undefined };
  if (event.type === "RUN_ERROR") return { ...state, status: "error", error: (event.message as string | undefined) ?? "Scenario run failed." };
  return state;
}
