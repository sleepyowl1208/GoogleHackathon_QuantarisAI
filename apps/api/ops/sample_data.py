"""Synthetic daily plant records for three kinds of plant. They are made up (seeded, repeatable) so the data features can be shown without a real customer; each has a developing problem to find."""
import csv
import math
import random
from datetime import date, timedelta
from pathlib import Path

# name: (units/day, water m3/unit, effluent share, kWh/unit, waste kg/unit, problem description)
PLANTS = {
    "dairy-plant": (18000, 0.0042, 0.82, 0.11, 0.012, "a cooling-water valve sticks open from day 120 and water use climbs"),
    "switchgear-factory": (420, 0.31, 0.55, 38.0, 4.6, "scrap and coolant waste rise after a tool change on day 100"),
    "textile-dyeing": (9000, 0.052, 0.9, 0.42, 0.045, "rinse cycles run too long on night shifts, so water use is higher at night"),
    "coconut-husk-coir": (100, 0.02, 0.7, 0.25, 0.1, "the soaking water stops being recycled from day 90, so water use per kg of husk jumps"),
    "steel-rerolling-mill": (300, 0.8, 0.35, 120.0, 12.0, "the reheating furnace loses efficiency from day 110, so energy per tonne creeps up"),
    "egg-packing": (40000, 0.0004, 0.85, 0.003, 0.002, "night-shift washing runs a long cycle, and breakages (waste) rise on Mondays"),
    "pickle-factory": (800, 0.01, 0.85, 0.6, 0.15, "brine is discharged in one batch every Friday, spiking effluent and waste"),
}
DAYS = 180


def rows(name: str, start: date = date(2026, 1, 1)) -> list[dict]:
    units0, w, eff, kwh, waste, _ = PLANTS[name]
    rng = random.Random(name)
    out = []
    for i in range(DAYS):
        d = start + timedelta(days=i)
        weekend = d.weekday() >= 6
        units = units0 * (0.45 if weekend else 1.0) * (1 + 0.08 * math.sin(i / 28)) * rng.uniform(0.94, 1.06)
        wi = w * rng.uniform(0.97, 1.03)
        ei = kwh * rng.uniform(0.97, 1.03)
        gi = waste * rng.uniform(0.9, 1.1)
        if name == "dairy-plant" and i >= 120:
            wi *= 1 + 0.004 * (i - 120)
        if name == "switchgear-factory" and i >= 100:
            gi *= 1.35
        if name == "textile-dyeing":
            wi *= 1.18 if i % 3 == 2 else 1.0
        if name == "coconut-husk-coir" and i >= 90:
            wi *= 1.55
        if name == "steel-rerolling-mill" and i >= 110:
            ei *= 1 + 0.002 * (i - 110)
        if name == "egg-packing":
            wi *= 1.25 if i % 2 == 0 else 1.0
            gi *= 1.6 if d.weekday() == 0 else 1.0
        if name == "pickle-factory" and d.weekday() == 4:
            wi *= 1.5
            gi *= 1.8
        if rng.random() < 0.012:
            wi *= 1.9  # a one-off spike (burst pipe, forgotten tap)
        water = units * wi
        out.append({"date": d.isoformat(), "units": round(units), "water_m3": round(water, 1), "effluent_m3": round(water * eff * rng.uniform(0.96, 1.04), 1), "energy_kwh": round(units * ei), "waste_kg": round(units * gi, 1)})
    return out


def write_all(folder: Path) -> list[Path]:
    folder.mkdir(parents=True, exist_ok=True)
    paths = []
    for name in PLANTS:
        path = folder / f"sample-{name}.csv"
        with path.open("w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=["date", "units", "water_m3", "effluent_m3", "energy_kwh", "waste_kg"])
            w.writeheader()
            w.writerows(rows(name))
        paths.append(path)
    return paths


if __name__ == "__main__":
    for p in write_all(Path(__file__).resolve().parents[2] / "web" / "public" / "samples"):
        print(p)
