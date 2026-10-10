import { describe, expect, it } from "vitest";
import { findStep, parseCommand, type StepRef } from "./voice-commands";

const steps: StepRef[] = [
  { zone_id: "receive", label: "Raw material receiving", step: 1 }, { zone_id: "wash", label: "Washing & sorting", step: 2 },
  { zone_id: "cut", label: "Cutting and de-seeding", step: 3 }, { zone_id: "brine", label: "Brining and curing", step: 4 }, { zone_id: "pack", label: "Filling and packing", step: 5 },
];

describe("finding a step", () => {
  it("by number or by the words of its name", () => {
    expect(findStep("open step 3", steps)?.zone_id).toBe("cut"); expect(findStep("show me the 4th section", steps)?.zone_id).toBe("brine");
    expect(findStep("go to the packing area", steps)?.zone_id).toBe("pack"); expect(findStep("explain washing", steps)?.zone_id).toBe("wash");
    expect(findStep("take me to curing", steps)?.zone_id).toBe("brine"); expect(findStep("open step 9", steps)).toBeUndefined(); expect(findStep("hello there", steps)).toBeUndefined();
  });
});

describe("spoken commands", () => {
  it("camera moves", () => {
    expect(parseCommand("zoom in", steps)).toEqual({ type: "zoom", factor: 1.6 }); expect(parseCommand("Zoom out a bit", steps)).toEqual({ type: "zoom", factor: 0.62 });
    expect(parseCommand("rotate it to the right", steps)).toEqual({ type: "rotate", dx: 0.12, dy: 0 }); expect(parseCommand("turn left", steps)).toEqual({ type: "rotate", dx: -0.12, dy: 0 });
    expect(parseCommand("move up", steps)).toEqual({ type: "rotate", dx: 0, dy: 0.09 }); expect(parseCommand("reset the view", steps)).toEqual({ type: "reset" });
  });
  it("opening and moving between sections", () => {
    expect(parseCommand("open the cutting section", steps)).toEqual({ type: "open", id: "cut" }); expect(parseCommand("zoom into step 2", steps)).toEqual({ type: "open", id: "wash" });
    expect(parseCommand("show me packing", steps)).toEqual({ type: "open", id: "pack" }); expect(parseCommand("open this", steps, "brine")).toEqual({ type: "open", id: "brine" });
    expect(parseCommand("open the laboratory section", steps)).toEqual({ type: "missing" }); expect(parseCommand("close", steps)).toEqual({ type: "close" });
    expect(parseCommand("next", steps)).toEqual({ type: "next" }); expect(parseCommand("go back one", steps)).toEqual({ type: "prev" });
    expect(parseCommand("walk me through the route", steps)).toEqual({ type: "tour" }); expect(parseCommand("stop", steps)).toEqual({ type: "stop" });
  });
  it("a vehicle arriving or leaving is a vehicle command, not a design change", () => {
    expect(parseCommand("a vehicle is coming with the raw material", steps)).toEqual({ type: "vehicle", kind: "truck", direction: "in", zoneId: "receive" });
    expect(parseCommand("send a truck to collect the finished product", steps)).toEqual({ type: "vehicle", kind: "truck", direction: "out", zoneId: "pack" });
    expect(parseCommand("a tanker is bringing milk to washing", steps)).toEqual({ type: "vehicle", kind: "tanker", direction: "in", zoneId: "wash" });
    expect(parseCommand("a tractor is bringing the harvest", steps)).toMatchObject({ type: "vehicle", kind: "tractor", direction: "in" });
  });
  it("design changes are left for the planner", () => {
    for (const t of ["make it double storey with waste recycling upstairs", "add one more chamber for curing", "remove the washing step", "make the packing area bigger please add a truck bay", "", "hello"]) expect(parseCommand(t, steps), t).toBeUndefined();
  });
  it("understands a few Hindi commands", () => {
    expect(parseCommand("ज़ूम इन करो", steps)).toEqual({ type: "zoom", factor: 1.6 }); expect(parseCommand("अगला", steps)).toEqual({ type: "next" }); expect(parseCommand("पिछला", steps)).toEqual({ type: "prev" });
    expect(parseCommand("रीसेट", steps)).toEqual({ type: "reset" }); expect(parseCommand("बंद करो", steps)).toEqual({ type: "close" });
  });
});
