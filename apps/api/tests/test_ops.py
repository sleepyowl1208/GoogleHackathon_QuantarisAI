import unittest

from apps.api.domain.ops import OpsAction, OpsRequest, OpsSource, OpsStage
from apps.api.ops.engine import build_pack


def request(actions=None) -> OpsRequest:
    return OpsRequest(
        industry="Mango pickle", location="Jhansi",
        stages=[OpsStage(key="wash", label="Washing", equipment=["Washer", "Conveyor"]), OpsStage(key="cook", label="Boiling", equipment=["Boiler", "Mixer"]), OpsStage(key="pack", label="Packing", equipment=["Filler"])],
        sources=[OpsSource(name="Malihabad", km=270)], actions=actions or [])


class OpsEngineTests(unittest.TestCase):
    def test_same_plant_gives_same_data(self):
        self.assertEqual(build_pack(request()).model_dump(), build_pack(request()).model_dump())

    def test_developing_fault_is_found_and_ranked_first(self):
        pack = build_pack(request())
        self.assertTrue(pack.alerts)
        self.assertGreaterEqual(pack.machines[0].risk, 35)
        self.assertEqual([m.risk for m in pack.machines], sorted((m.risk for m in pack.machines), reverse=True))

    def test_scheduling_maintenance_clears_that_machine(self):
        before = build_pack(request())
        target = before.alerts[0].machine_id
        after = build_pack(request([OpsAction(type="schedule_maintenance", target=target)]))
        machine = next(m for m in after.machines if m.machine_id == target)
        self.assertEqual(machine.status, "scheduled")
        self.assertLess(len(after.alerts), len(before.alerts))

    def test_bottleneck_is_the_slowest_station_and_oee_is_consistent(self):
        p = build_pack(request()).production
        slowest = min(p.stations, key=lambda s: s.capacity_uph * s.availability_pct / 100)
        self.assertEqual(p.bottleneck_key, slowest.step_key)
        self.assertAlmostEqual(p.oee_pct, p.availability_pct * p.performance_pct * p.quality_pct / 10000, delta=0.2)
        self.assertGreater(p.what_if[0].gain_pct, 0)

    def test_added_capacity_at_the_bottleneck_raises_throughput(self):
        base = build_pack(request()).production
        more = build_pack(request([OpsAction(type="add_capacity", target=base.bottleneck_key, value=30)])).production
        self.assertGreater(more.throughput_uph, base.throughput_uph)

    def test_forecast_is_ordered_and_backtested(self):
        d = build_pack(request()).demand
        self.assertEqual(len(d.forecast), 13)
        self.assertTrue(all(f.p10 <= f.p50 <= f.p90 for f in d.forecast))
        self.assertLess(d.mape_pct, 15)

    def test_ai_control_cuts_smoke_and_effluent_and_toggle_switches_current(self):
        base = build_pack(request()).emissions
        self.assertLess(base.smoke.with_ai_opacity_pct, base.smoke.baseline_opacity_pct)
        self.assertLess(base.effluent.with_ai_out_mg_l, base.effluent.baseline_out_mg_l)
        self.assertLessEqual(base.effluent.with_ai_exceed_hours, base.effluent.baseline_exceed_hours)
        on = build_pack(request([OpsAction(type="ai_control", target="combustion"), OpsAction(type="ai_control", target="etp")])).emissions
        self.assertTrue(on.combustion_ai and on.etp_ai)
        self.assertEqual(on.smoke.current_opacity_pct, on.smoke.with_ai_opacity_pct)
        self.assertEqual(on.effluent.current_out_mg_l, on.effluent.with_ai_out_mg_l)

    def test_data_is_labelled_simulated(self):
        pack = build_pack(request())
        self.assertEqual(pack.data_source, "simulated")
        self.assertTrue(any(c.classification.value == "SIMULATION" for c in pack.claims))


if __name__ == "__main__":
    unittest.main()
