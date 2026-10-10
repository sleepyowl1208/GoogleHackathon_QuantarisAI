import unittest

from pydantic import ValidationError

from apps.api.application.layout_engine import (
    SOLAR_KWH_PER_KWP_YEAR, SOLAR_KWP_PER_M2_ROOF, USABLE_ROOF_SHARE, TEMPLATES, generate_layout, list_templates,
)
from apps.api.domain.contracts import ClaimClassification
from apps.api.domain.layout import Industry, LayoutRequest, ZoneKind
from apps.api.main import app

EPS = 1e-6


def build(industry, w=None, d=None):
    return generate_layout(LayoutRequest(industry=industry, width_m=w, depth_m=d))


class LayoutEngineTests(unittest.TestCase):
    def test_zones_stay_inside_the_plot_and_do_not_overlap(self):
        for industry in Industry:
            for w, d in [(50, 50), (80, 40), (40, 90), (300, 200)]:
                result = build(industry, w, d)
                zones = result.zones
                for z in zones:
                    self.assertGreaterEqual(z.x, -EPS); self.assertGreaterEqual(z.y, -EPS)
                    self.assertLessEqual(z.x + z.width_m, w + EPS); self.assertLessEqual(z.y + z.depth_m, d + EPS)
                for i, a in enumerate(zones):
                    for b in zones[i + 1:]:
                        overlap_x = min(a.x + a.width_m, b.x + b.width_m) - max(a.x, b.x)
                        overlap_y = min(a.y + a.depth_m, b.y + b.depth_m) - max(a.y, b.y)
                        self.assertFalse(overlap_x > 1e-3 and overlap_y > 1e-3, f"{a.zone_id} overlaps {b.zone_id} on {industry} {w}x{d}")

    def test_every_template_stage_is_placed_once_and_flow_is_ordered(self):
        for industry, template in TEMPLATES.items():
            result = build(industry)
            steps = {z.zone_id: z.step for z in result.zones if z.step}
            self.assertEqual(set(steps), {s.key for s in template.stages})
            self.assertEqual(sorted(steps.values()), list(range(1, len(template.stages) + 1)))
            self.assertEqual(len(result.flow), len(template.stages) - 1)
            for edge in result.flow:
                self.assertEqual(steps[edge.to_id], steps[edge.from_id] + 1)

    def test_service_zones_are_always_present(self):
        kinds = {z.kind for z in build(Industry.PICKLE).zones}
        self.assertTrue({ZoneKind.OFFICE, ZoneKind.UTILITY, ZoneKind.EFFLUENT, ZoneKind.BYPRODUCT} <= kinds)

    def test_missing_size_uses_a_labelled_suggestion(self):
        pickle = build(Industry.PICKLE)
        self.assertEqual((pickle.width_m, pickle.depth_m, pickle.size_was_suggested), (50, 50, True))
        self.assertEqual((build(Industry.TSHIRT).width_m, build(Industry.TSHIRT).depth_m), (100, 100))
        self.assertEqual(pickle.claims[0].classification, ClaimClassification.ASSUMPTION)
        given = build(Industry.PICKLE, 60, 45)
        self.assertFalse(given.size_was_suggested)
        self.assertEqual(given.claims[0].classification, ClaimClassification.FACT)

    def test_layout_adapts_to_plot_shape_and_industry(self):
        self.assertNotEqual([(z.x, z.y) for z in build(Industry.PICKLE, 50, 50).zones], [(z.x, z.y) for z in build(Industry.PICKLE, 90, 30).zones])
        self.assertNotEqual({z.zone_id for z in build(Industry.PICKLE).zones}, {z.zone_id for z in build(Industry.TSHIRT).zones})

    def test_is_deterministic(self):
        a, b = build(Industry.TSHIRT, 120, 80), build(Industry.TSHIRT, 120, 80)
        self.assertEqual(a.zones, b.zones)

    def test_small_plot_is_flagged_and_adequate_plot_is_not(self):
        small = build(Industry.TSHIRT, 40, 40)
        self.assertFalse(small.fits)
        self.assertTrue(any("smaller than the illustrative minimum" in c.statement for c in small.claims))
        self.assertTrue(build(Industry.TSHIRT, 100, 100).fits)

    def test_solar_numbers_match_the_stated_formula(self):
        result = build(Industry.PICKLE)
        process_area = sum(z.area_m2 for z in result.zones if z.step)
        kwp = process_area * USABLE_ROOF_SHARE * SOLAR_KWP_PER_M2_ROOF
        claim = next(c for c in result.claims if "solar capacity" in c.statement)
        self.assertEqual(claim.classification, ClaimClassification.CALCULATION)
        self.assertIn(f"{kwp:,.0f} kWp", claim.statement)
        self.assertIn(f"{kwp * SOLAR_KWH_PER_KWP_YEAR:,.0f} kWh", claim.statement)
        self.assertIn("assumptions", claim.methodology)

    def test_every_claim_is_classified_and_costs_are_unknown_not_invented(self):
        result = build(Industry.PICKLE)
        self.assertTrue(all(isinstance(c.classification, ClaimClassification) for c in result.claims))
        unknowns = [c for c in result.claims if c.classification is ClaimClassification.UNKNOWN]
        self.assertTrue(any("Capital cost" in c.statement for c in unknowns))
        self.assertTrue(all(c.reason and "No verified evidence available" in c.reason for c in unknowns))
        self.assertEqual(result.freshness, "ILLUSTRATIVE")
        self.assertFalse(any(c.classification is ClaimClassification.FACT and "₹" in c.statement for c in result.claims))

    def test_invalid_requests_are_rejected(self):
        for bad in [dict(industry="steel"), dict(industry="pickle", width_m=5, depth_m=50), dict(industry="pickle", width_m=50, depth_m=99999), dict(industry="pickle", width_m=50, depth_m=50, extra=1)]:
            with self.assertRaises(ValidationError):
                LayoutRequest(**bad)

    def test_templates_listing_and_routes(self):
        self.assertEqual({t.industry for t in list_templates()}, set(Industry))
        paths = {route.path for route in app.routes}
        self.assertTrue({"/api/layouts", "/api/layouts/templates"} <= paths)


if __name__ == "__main__":
    unittest.main()
