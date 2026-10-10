import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cameraSetup, propKind } from "./factory-geometry";
import { dictionaries, fill } from "./i18n";
import { createSession, deleteSession, getProfile, getSnapshot, renameSession, selectSession, setProfile, updateSession } from "./sessions";

// This test environment has no usable localStorage, so give the stores an in-memory one (before any store is first read).
beforeAll(() => {
  const data = new Map<string, string>();
  Object.defineProperty(window, "localStorage", { configurable: true, value: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k), clear: () => data.clear() } });
});

function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]));
  return typeof value;
}

describe("translations", () => {
  it("Hindi has exactly the same keys and list lengths as English", () => {
    expect(shape(dictionaries.hi)).toEqual(shape(dictionaries.en));
    expect(dictionaries.hi.examplesNew).toHaveLength(dictionaries.en.examplesNew.length);
    expect(dictionaries.hi.busyNew).toHaveLength(dictionaries.en.busyNew.length);
    expect(dictionaries.hi.busyExisting).toHaveLength(dictionaries.en.busyExisting.length);
    expect(Object.keys(dictionaries.hi.claimLabels)).toEqual(Object.keys(dictionaries.en.claimLabels));
  });
  it("has no empty strings and keeps the {name} placeholder in both greetings", () => {
    for (const dict of Object.values(dictionaries)) {
      const empties = Object.entries(dict).filter(([, v]) => v === "");
      expect(empties).toEqual([]);
      expect(dict.greetNamed).toContain("{name}");
    }
    expect(fill(dictionaries.hi.greetNamed, { name: "Krishna" })).toBe("नमस्ते, Krishna");
    expect(fill(dictionaries.en.greetNamed, { name: "Krishna" })).toBe("Hello, Krishna");
  });
  it("greets in Devanagari for Hindi", () => { expect(dictionaries.hi.helpTitle).toMatch(/[ऀ-ॿ]/); });
});

describe("equipment shapes", () => {
  it("chooses a shape from what the equipment is", () => {
    expect(propKind("Pusher-type reheating furnace")).toBe("furnace");
    expect(propKind("Vertical steam cooker")).toBe("boiler");
    expect(propKind("Stainless steel storage silo")).toBe("silo");
    expect(propKind("Crude oil settling tank")).toBe("tank");
    expect(propKind("Belt conveyor")).toBe("conveyor");
    expect(propKind("Plate and frame filter press")).toBe("filter");
    expect(propKind("Continuous screw expellers")).toBe("press");
    expect(propKind("Heavy pallet racking")).toBe("rack");
    expect(propKind("Dispatch weighbridge")).toBe("truck");
    expect(propKind("भट्टी")).toBe("furnace");
    expect(propKind("टैंक")).toBe("tank");
  });
  it("falls back to a generic machine, and a mill with no heat equipment never shows a furnace or boiler", () => {
    expect(propKind("Auto-doffing mechanism")).toBe("machine");
    const cotton = ["Automatic bale plucker", "Carding machine", "Ring spinning frame", "Auto cone winder", "Carton strapping machine"];
    expect(cotton.map(propKind)).not.toContain("furnace");
    expect(cotton.map(propKind)).not.toContain("boiler");
  });
});

describe("camera framing", () => {
  it("views a plot that runs north-south from the east, with north to the right", () => {
    const c = cameraSetup(80, 220);
    expect(c.north).toBe("right");
    expect(c.position[0]).toBeGreaterThan(c.position[2]);
  });
  it("views a wide plot from the south, with north up", () => {
    const c = cameraSetup(220, 80);
    expect(c.north).toBe("up");
    expect(c.position[2]).toBeGreaterThan(c.position[0]);
  });
  it("moves the camera back for bigger plots so the whole plot stays in view", () => {
    const near = cameraSetup(50, 50).position, far = cameraSetup(500, 500).position;
    expect(Math.hypot(...far)).toBeGreaterThan(Math.hypot(...near) * 5);
  });
});

describe("saved chats", () => {
  beforeEach(() => { for (const s of [...getSnapshot().sessions]) deleteSession(s.id); selectSession(undefined); });
  it("creates, selects, updates, renames and deletes sessions and persists them", () => {
    const id = createSession({ id: "m1", role: "assistant", text: "hi" }, "new");
    expect(getSnapshot().activeId).toBe(id);
    expect(getSnapshot().sessions[0].mode).toBe("new");
    updateSession(id, (s) => ({ ...s, messages: [...s.messages, { id: "m2", role: "user", text: "pickles" }] }));
    expect(getSnapshot().sessions[0].messages).toHaveLength(2);
    renameSession(id, "  My pickle plant  ");
    expect(getSnapshot().sessions[0].title).toBe("My pickle plant");
    expect(JSON.parse(window.localStorage.getItem("quantaris-sessions-v2") ?? "{}").sessions[0].title).toBe("My pickle plant");
    deleteSession(id);
    expect(getSnapshot().sessions).toHaveLength(0);
    expect(getSnapshot().activeId).toBeUndefined();
  });
  it("puts the newest chat first and keeps at most 30", () => {
    for (let i = 0; i < 35; i++) createSession({ id: `m${i}`, role: "assistant", text: String(i) });
    const { sessions } = getSnapshot();
    expect(sessions).toHaveLength(30);
    expect(sessions[0].messages[0].text).toBe("34");
  });
  it("returns the same snapshot object until something changes (required for stable rendering)", () => {
    expect(getSnapshot()).toBe(getSnapshot());
    const before = getSnapshot(); createSession(); expect(getSnapshot()).not.toBe(before);
  });
  it("remembers the profile language and name", () => {
    setProfile({ language: "hi", name: "Krishna" });
    expect(getProfile()).toMatchObject({ language: "hi", name: "Krishna" });
    expect(JSON.parse(window.localStorage.getItem("quantaris-profile") ?? "{}")).toMatchObject({ language: "hi", name: "Krishna" });
    setProfile({ language: "en" });
  });
});
