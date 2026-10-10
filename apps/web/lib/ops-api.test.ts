import { describe, expect, it } from "vitest";
import { toggleAction } from "./ops-api";

describe("toggleAction", () => {
  it("adds, then removes, the same action", () => {
    const a = { type: "ai_control" as const, target: "etp" };
    const on = toggleAction([], a);
    expect(on).toEqual([a]);
    expect(toggleAction(on, a)).toEqual([]);
  });
  it("keeps different targets apart", () => {
    const on = toggleAction([{ type: "schedule_maintenance", target: "a:0" }], { type: "schedule_maintenance", target: "b:0" });
    expect(on).toHaveLength(2);
  });
});
