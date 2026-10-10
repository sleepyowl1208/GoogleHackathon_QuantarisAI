import { describe, expect, it } from "vitest";
import { latest, parseCsv, toIsoDay } from "./balance-logic";

describe("parseCsv", () => {
  it("reads our own sample layout", () => {
    const p = parseCsv("date,units,water_m3,effluent_m3,energy_kwh,waste_kg\n2026-01-01,100,50,40,800,12\n2026-01-02,110,55,,820,13");
    expect(p.missing).toEqual([]);
    expect(p.rows).toHaveLength(2);
    expect(p.rows[1].effluent_m3).toBeUndefined();
    expect(p.rows[0].energy_kwh).toBe(800);
  });
  it("recognises other people's column names and Indian dates, and converts litres", () => {
    const p = parseCsv('Production Date,Pieces Produced,"Water used (litres)",Electricity (kWh)\n"05/03/2026","1,200",60000,900');
    expect(p.mapping.units).toBe("Pieces Produced");
    expect(p.rows[0]).toMatchObject({ day: "2026-03-05", units: 1200, water_m3: 60, energy_kwh: 900 });
  });
  it("keeps effluent and water apart", () => {
    const p = parseCsv("date,units,effluent,water\n2026-01-01,10,3,5");
    expect(p.rows[0]).toMatchObject({ effluent_m3: 3, water_m3: 5 });
  });
  it("reports missing required columns and skips bad rows", () => {
    expect(parseCsv("water,energy\n1,2").missing).toEqual(["day", "units"]);
    const p = parseCsv("date,units\nnot-a-date,5\n2026-01-01,0\n2026-01-02,7");
    expect(p.rows).toHaveLength(1);
    expect(p.skipped).toBe(2);
  });
});

describe("helpers", () => {
  it("rejects impossible dates", () => expect(toIsoDay("31/02/2026")).toBeUndefined());
  it("keeps the newest days when a file is too long", () => {
    const rows = Array.from({ length: 900 }, (_, i) => ({ day: `2026-${String((i % 12) + 1).padStart(2, "0")}-01`, units: 1 }));
    expect(latest(rows)).toHaveLength(800);
  });
});
