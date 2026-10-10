import { ScenarioSchema, type Scenario } from "./contracts";

type BackendClaim = { claim_id: string; statement: string; classification: string; reason?: string };
type BackendScenario = {
  scenario_id: string; user_goal: string; geography: string; freshness: string;
  candidate_locations: BackendClaim[]; process_stages: BackendClaim[]; economics: BackendClaim[];
  environmental_profile: BackendClaim[]; waste_streams: BackendClaim[]; circular_opportunities: BackendClaim[];
  evidence: { evidence_id: string; extracted_fact: string; source_title: string; confidence: number; freshness: string; source_url: string; retrieved_at: string; source_provider: string; source_type: string; methodology: string; usage_license_metadata: string }[];
};

// Next.js only inlines NEXT_PUBLIC_* values written as literal `process.env.NEXT_PUBLIC_X` accesses.
const apiBase = process.env.NEXT_PUBLIC_QUANTARIS_API_URL ?? "http://localhost:8000";
export const useBackendTransport = process.env.NEXT_PUBLIC_SCENARIO_TRANSPORT === "backend";

function location(claim: BackendClaim, index: number) { return { id: claim.claim_id, name: `Candidate ${index + 1}`, score: 0, why: claim.classification === "UNKNOWN" ? claim.reason ?? "Unknown" : claim.statement }; }
function processStage(claim: BackendClaim) { return { id: claim.claim_id, label: claim.statement, stage: claim.classification, status: { tone: claim.classification === "UNKNOWN" ? "risk" : "assumption", label: claim.reason ?? claim.classification }, metrics: {} }; }

export function adaptBackendScenario(value: unknown): Scenario {
  const backend = value as BackendScenario;
  const scenario = {
    id: backend.scenario_id, mission: backend.user_goal,
    params: { unitsPerYear: 0, region: backend.geography, horizonYears: 0, priority: "unknown" },
    locations: backend.candidate_locations.map(location),
    economics: { capexInrCrore: null, paybackYears: null, unitCostInr: null },
    environment: { claims: backend.environmental_profile, freshness: backend.freshness },
    factory: { processes: backend.process_stages.map(processStage) },
    waste: { stream: backend.waste_streams[0]?.statement ?? "Unknown" },
    circular: { pathway: backend.circular_opportunities.map((claim) => claim.statement), valueInrLakhPerYear: "Unknown" },
    simulation: {},
    evidence: backend.evidence.map((item) => ({ id: item.evidence_id, kind: "fact" as const, claim: item.extracted_fact, source: item.source_title, confidence: item.confidence, illustrative: item.freshness === "ILLUSTRATIVE", sourceUrl: item.source_url, retrievedAt: item.retrieved_at, sourceProvider: item.source_provider, sourceType: item.source_type, freshness: item.freshness, methodology: item.methodology, usageLicenseMetadata: item.usage_license_metadata })),
  };
  return ScenarioSchema.parse(scenario);
}

export async function createBackendScenario(userGoal: string): Promise<{ scenario: Scenario; scenarioId: string }> {
  const response = await fetch(`${apiBase}/api/scenarios`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_goal: userGoal }) });
  if (!response.ok) throw new Error("The scenario service could not create this fixture scenario.");
  const state = await response.json();
  return { scenario: adaptBackendScenario(state), scenarioId: state.scenario_id as string };
}

async function submitClarification(scenarioId: string, body: object): Promise<Scenario> {
  const response = await fetch(`${apiBase}/api/scenarios/${scenarioId}/clarifications`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error("The scenario service could not apply fixture defaults.");
  return adaptBackendScenario(await response.json());
}

export function respondWithDefaults(scenarioId: string): Promise<Scenario> { return submitClarification(scenarioId, { recommend_defaults: true }); }
export function respondToClarification(scenarioId: string, key: string, value: string): Promise<Scenario> { return submitClarification(scenarioId, { answers: { [key]: value } }); }

export async function replayBackendEvents(scenarioId: string, onEvent: (event: unknown) => void): Promise<void> {
  const response = await fetch(`${apiBase}/api/scenarios/${scenarioId}/events`);
  if (!response.ok) throw new Error("The scenario event stream is unavailable.");
  const payload = await response.text();
  for (const line of payload.split("\n")) if (line.startsWith("data: ")) onEvent(JSON.parse(line.slice(6)));
}
