import { describe, expect, it } from "vitest";
import { loadRunFixture, loadScenarioFixture, loadWalkthroughFixture } from "./fixture-transport";
describe("V2 fixtures",()=>{
 it("validates the scenario fixture",()=>expect(loadScenarioFixture().success).toBe(true));
 it("validates every event in the demo run",()=>expect(loadRunFixture().every((event)=>event.success)).toBe(true));
 it("validates the offline walkthrough",()=>expect(loadWalkthroughFixture().success).toBe(true));
});
