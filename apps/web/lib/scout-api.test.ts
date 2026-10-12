import { describe, expect, it } from "vitest";
import { linksFor, pinned, type Scout } from "./scout-api";

const scout = { place: "Anand", industry: "", areas: [
  { rank: 1, name: "A", locality: "", kind: "", why: "", access: "", utilities: "", supply: "", risk: "", lat: 22.5, lng: 73, source_ids: ["s1", "s2", "gone"] },
  { rank: 2, name: "B", locality: "", kind: "", why: "", access: "", utilities: "", supply: "", risk: "", lat: null, lng: null, source_ids: [] }],
sources: [{ source_id: "s1", title: "ok", url: "https://example.com" }, { source_id: "s2", title: "bad", url: "javascript:alert(1)" }], search_queries: [], claims: [] } as unknown as Scout;

describe("scout helpers", () => {
  it("shows only https links that exist", () => expect(linksFor(scout, scout.areas[0]).map((s) => s.title)).toEqual(["ok"]));
  it("pins only areas that were found on the map", () => expect(pinned(scout).map((a) => a.name)).toEqual(["A"]));
});
