import unittest
from datetime import date, timedelta

from apps.api.domain.balance import BalanceRequest, DayRow, Levers
from apps.api.ops.balance import balance


def rows(n=60, water=lambda i: 50.0 + (i % 5), effluent=True):
    return [DayRow(day=date(2026, 1, 1) + timedelta(days=i), units=100, water_m3=water(i), effluent_m3=(water(i) * 0.7 if effluent else None), energy_kwh=800, waste_kg=40) for i in range(n)]


def request(levers=None, **kw):
    return BalanceRequest(industry="Switchgear manufacturing", rows=rows(**kw), levers=levers or Levers(), water_unit_cost_inr=40)


class BalanceTests(unittest.TestCase):
    def test_per_unit_intensity_is_total_over_units(self):
        w = balance(request()).resources[0]
        self.assertEqual(w.name, "water")
        self.assertAlmostEqual(w.per_unit_avg, 0.52, places=2)

    def test_gap_to_best_quartile_is_a_saving_without_any_assumption(self):
        w = balance(request()).resources[0]
        self.assertGreater(w.gap_saving_per_year, 0)
        self.assertLess(w.per_unit_best_quartile, w.per_unit_avg)

    def test_a_flat_plant_has_no_gap(self):
        w = balance(request(water=lambda i: 50.0)).resources[0]
        self.assertEqual(w.gap_saving_per_year, 0)

    def test_reuse_and_leaks_reduce_fresh_water_and_money_follows(self):
        base = balance(request()).water
        after = balance(request(Levers(reuse_pct=50, leak_pct=5))).water
        self.assertEqual(base.fresh_after_m3_year, base.intake_m3_year)
        self.assertLess(after.fresh_after_m3_year, base.intake_m3_year)
        self.assertGreater(after.saved_inr_year, 0)
        self.assertTrue(after.effluent_measured)

    def test_missing_effluent_is_assumed_and_said_so(self):
        r = balance(request(effluent=False))
        self.assertFalse(r.water.effluent_measured)
        self.assertTrue(any("assumed" in n for n in r.notes))

    def test_spike_day_is_flagged(self):
        r = balance(request(water=lambda i: 150.0 if i == 40 else 50.0 + (i % 3) * 0.2)).resources[0]
        self.assertIn(date(2026, 1, 1) + timedelta(days=40), r.anomaly_days)

    def test_waste_recovery(self):
        r = balance(request(Levers(waste_recovery_pct=60)))
        self.assertAlmostEqual(r.waste.recovered_kg_year / r.waste.waste_kg_year, 0.6, places=2)

    def test_too_little_data_is_rejected(self):
        with self.assertRaises(Exception):
            BalanceRequest(industry="x y", rows=rows(5))


if __name__ == "__main__":
    unittest.main()
