import scenarioData from "../../../design/v2_full/QuantarisAI-V2-handoff/design-system/handoff/fixtures/scenario-tshirt-1m.json";
import eventData from "../../../design/v2_full/QuantarisAI-V2-handoff/design-system/handoff/fixtures/agui-demo-run.json";
import walkthroughData from "../../../design/v2_full/QuantarisAI-V2-handoff/design-system/handoff/fixtures/demo-walkthrough.json";
import { ScenarioSchema, AguiEventSchema } from "./contracts";

export function loadScenarioFixture() { return ScenarioSchema.safeParse(scenarioData); }
export function loadRunFixture() { const events = (eventData as { events: unknown[] }).events.map((event) => AguiEventSchema.safeParse(event)); return events; }
export type WalkthroughBeat = { n: number; kind: "map" | "ecosystem" | "factory"; state: Record<string, unknown>; caption: string };
export type Walkthrough = { beatMs: number; beats: WalkthroughBeat[] };
export function loadWalkthroughFixture(): { success: true; data: Walkthrough } | { success: false; error: string } { const value = walkthroughData as { beatMs?: unknown; beats?: unknown }; return typeof value.beatMs === "number" && Array.isArray(value.beats) ? { success: true, data: value as Walkthrough } : { success: false, error: "Invalid walkthrough fixture." }; }
export async function replayFixture(onEvent: (event: unknown) => void, interval = 340) { for (const event of (eventData as { events: unknown[] }).events) { onEvent(event); await new Promise((resolve) => setTimeout(resolve, interval)); } }
