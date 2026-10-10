import { describe, expect, it } from "vitest";
import { loadRunFixture, loadScenarioFixture, loadWalkthroughFixture } from "./fixture-transport";
import { adaptBackendScenario } from "./backend-transport";
describe("V2 fixtures",()=>{
 it("validates the scenario fixture",()=>expect(loadScenarioFixture().success).toBe(true));
 it("validates every event in the demo run",()=>expect(loadRunFixture().every((event)=>event.success)).toBe(true));
 it("adapts the Phase 1 backend scenario without bypassing the UI contract",()=>{
   const scenario=adaptBackendScenario({scenario_id:"scn_jhansi",user_goal:"Pickle factory",geography:"Jhansi, Uttar Pradesh",freshness:"ILLUSTRATIVE",candidate_locations:[{claim_id:"location",statement:"Unavailable",classification:"UNKNOWN",reason:"No verified evidence available"}],process_stages:[],economics:[],environmental_profile:[],waste_streams:[],circular_opportunities:[],evidence:[{evidence_id:"e1",extracted_fact:"Fixture",source_title:"Fixture",confidence:1,freshness:"ILLUSTRATIVE",source_url:"https://example.test",retrieved_at:"2026-10-04T00:00:00Z",source_provider:"QuantarisAI",source_type:"FIXTURE",methodology:"fixture",usage_license_metadata:"demo"}]});
   expect(scenario.id).toBe("scn_jhansi"); expect(scenario.evidence?.[0]?.sourceUrl).toBe("https://example.test");
 });
 it("validates the offline walkthrough",()=>expect(loadWalkthroughFixture().success).toBe(true));
});
