import { describe, expect, it } from "vitest";
import { validateA2uiRequest } from "./a2ui";
describe("A2UI catalog",()=>{
  it("accepts the approved CapacitySelector contract",()=>{const result=validateA2uiRequest({type:"UI_REQUEST",requestId:"r",runId:"run",component:"CapacitySelector",version:1,reason:"Capacity matters",props:{options:[{value:"a",label:"A"},{value:"b",label:"B"}]}});expect(result.ok).toBe(true)});
  it("rejects arbitrary component requests",()=>{const result=validateA2uiRequest({component:"ArbitraryHtml",version:1});expect(result.ok).toBe(false);if(!result.ok)expect(result.code).toBe("unknown_component")});
  it("rejects unsupported versions",()=>{const result=validateA2uiRequest({component:"CapacitySelector",version:2});expect(result.ok).toBe(false);if(!result.ok)expect(result.code).toBe("unsupported_version")});
});
