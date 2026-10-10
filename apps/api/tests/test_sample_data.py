import unittest
from datetime import date

from apps.api.domain.balance import BalanceRequest, DayRow, Levers
from apps.api.ops.balance import balance
from apps.api.ops.sample_data import PLANTS, rows


class SampleDataTests(unittest.TestCase):
    def test_same_every_time(self):
        self.assertEqual(rows("dairy-plant"), rows("dairy-plant"))

    def test_every_plant_goes_through_the_balance_and_shows_a_gap(self):
        for name in PLANTS:
            r = balance(BalanceRequest(industry=name, rows=[DayRow(day=date.fromisoformat(x["date"]), units=x["units"], water_m3=x["water_m3"], effluent_m3=x["effluent_m3"], energy_kwh=x["energy_kwh"], waste_kg=x["waste_kg"]) for x in rows(name)], levers=Levers(reuse_pct=40)))
            water = next(x for x in r.resources if x.name == "water")
            self.assertGreater(water.gap_saving_pct, 1, name)
            self.assertTrue(r.water.effluent_measured)
            self.assertGreater(r.water.saved_pct, 0)

    def test_the_planted_problems_are_visible(self):
        dairy = balance(BalanceRequest(industry="dairy plant", rows=[DayRow(day=date.fromisoformat(x["date"]), units=x["units"], water_m3=x["water_m3"]) for x in rows("dairy-plant")])).resources[0]
        self.assertGreater(dairy.per_unit_trend_pct, 5)  # the stuck valve shows as a rising trend


if __name__ == "__main__":
    unittest.main()
