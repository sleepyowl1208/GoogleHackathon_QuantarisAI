import unittest

from apps.api.application.scenario_service import ScenarioService
from apps.api.main import app
from apps.api.domain.contracts import (
    Claim,
    ClaimClassification,
    EvidenceItem,
    ScenarioRequest,
    ScenarioConstraint,
)


class PhaseOneContractsTests(unittest.TestCase):
    def setUp(self):
        self.service = ScenarioService()

    def test_parses_jhansi_pickle_intent(self):
        state = self.service.create(ScenarioRequest(user_goal="I want to establish a pickle factory in Jhansi, Uttar Pradesh."))
        self.assertEqual(state.intent.product, "pickle")
        self.assertEqual(state.geography, "Jhansi, Uttar Pradesh")

    def test_generates_material_clarifications(self):
        state = self.service.create(ScenarioRequest(user_goal="I want to establish a pickle factory in Jhansi, Uttar Pradesh."))
        self.assertEqual({question.key for question in state.clarifications}, {"product_type", "capacity", "budget", "land", "target_market"})

    def test_recommend_defaults_creates_explicit_assumptions(self):
        state = self.service.create(ScenarioRequest(user_goal="I want to establish a pickle factory in Jhansi, Uttar Pradesh."))
        updated = self.service.answer(state.scenario_id, {"recommend_defaults": True})
        self.assertFalse(updated.clarifications)
        self.assertTrue(updated.assumptions)
        self.assertTrue(all(claim.classification is ClaimClassification.ASSUMPTION for claim in updated.assumptions))

    def test_individual_clarification_becomes_a_user_constraint_and_advances(self):
        state = self.service.create(ScenarioRequest(user_goal="I want to establish a pickle factory in Jhansi, Uttar Pradesh."))
        updated = self.service.answer(state.scenario_id, {"answers": {"product_type": "Mango"}})
        self.assertIn(ScenarioConstraint(key="product_type", value="Mango", source="USER"), updated.constraints)
        self.assertNotIn("product_type", {question.key for question in updated.clarifications})
        self.assertEqual(self.service.events(updated.scenario_id)[3]["requestId"], "clarification_capacity")

    def test_every_claim_requires_a_classification(self):
        with self.assertRaises(Exception):
            Claim(claim_id="missing", statement="No classification")

    def test_evidence_rejects_invalid_confidence(self):
        with self.assertRaises(Exception):
            EvidenceItem(evidence_id="e1", claim_id="c1", source_title="Fixture", source_provider="QuantarisAI", source_url="https://example.test", retrieved_at="2026-10-04T00:00:00Z", extracted_fact="Illustrative", confidence=1.1, source_type="FIXTURE", freshness="ILLUSTRATIVE", methodology="fixture", usage_license_metadata="demo")

    def test_unavailable_fact_is_an_explicit_unknown(self):
        state = self.service.create(ScenarioRequest(user_goal="I want to establish a pickle factory in Jhansi, Uttar Pradesh."))
        unknown = next(claim for claim in state.unknowns if "electricity tariff" in claim.statement.lower())
        self.assertEqual(unknown.classification, ClaimClassification.UNKNOWN)
        self.assertEqual(unknown.reason, "No verified evidence available")

    def test_serializes_events_that_frontend_reducer_can_consume(self):
        state = self.service.create(ScenarioRequest(user_goal="I want to establish a pickle factory in Jhansi, Uttar Pradesh."))
        events = self.service.events(state.scenario_id)
        self.assertEqual(events[0]["type"], "RUN_STARTED")
        self.assertEqual(events[-1]["type"], "UI_REQUEST")  # run is paused awaiting the user
        self.assertTrue(any(event["type"] == "UI_REQUEST" for event in events))

    def test_deterministic_jhansi_state_validates(self):
        state = self.service.create(ScenarioRequest(user_goal="I want to establish a pickle factory in Jhansi, Uttar Pradesh."))
        self.assertEqual(state.freshness, "ILLUSTRATIVE")
        self.assertTrue(state.evidence)

    def test_small_fastapi_surface_exposes_the_scenario_contract(self):
        routes = {route.path for route in app.routes}
        self.assertTrue({"/api/scenarios", "/api/scenarios/{scenario_id}", "/api/scenarios/{scenario_id}/clarifications", "/api/scenarios/{scenario_id}/events"}.issubset(routes))


    def test_run_stays_open_while_a_clarification_is_pending(self):
        state = self.service.create(ScenarioRequest(user_goal="I want to establish a pickle factory in Jhansi, Uttar Pradesh."))
        pending = [event["type"] for event in self.service.events(state.scenario_id)]
        self.assertIn("UI_REQUEST", pending)
        self.assertNotIn("RUN_FINISHED", pending)
        self.service.answer(state.scenario_id, {"recommend_defaults": True})
        done = [event["type"] for event in self.service.events(state.scenario_id)]
        self.assertNotIn("UI_REQUEST", done)
        self.assertEqual(done[-1], "RUN_FINISHED")


if __name__ == "__main__":
    unittest.main()
