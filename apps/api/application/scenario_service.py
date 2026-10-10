from datetime import datetime, timezone

from apps.api.domain.contracts import (
    Claim, ClaimClassification, ClarificationQuestion, ClarificationResponse,
    EvidenceItem, ManufacturingIntent, ScenarioConstraint, ScenarioRequest, ScenarioState,
)


def _claim(identifier: str, statement: str, classification: ClaimClassification, **kwargs: object) -> Claim:
    return Claim(claim_id=identifier, statement=statement, classification=classification, **kwargs)


class ScenarioService:
    """In-memory, deterministic Phase 1 scenario service; no external research occurs here."""

    def __init__(self) -> None:
        self._scenarios: dict[str, ScenarioState] = {}

    def create(self, request: ScenarioRequest) -> ScenarioState:
        goal = request.user_goal.strip()
        intent = ManufacturingIntent(product="pickle", activity="establish_factory", geography="Jhansi, Uttar Pradesh", confidence=1.0)
        evidence = EvidenceItem(
            evidence_id="ev_fixture_jhansi_scope", claim_id="cl_product_pickle",
            source_title="Phase 1 deterministic Jhansi fixture", source_provider="QuantarisAI",
            source_url="https://example.test/quantaris/phase-1-fixture",
            retrieved_at=datetime.now(timezone.utc), extracted_fact="This is illustrative fixture data, not researched Jhansi information.",
            geography="Jhansi, Uttar Pradesh", confidence=1.0, source_type="FIXTURE", freshness="ILLUSTRATIVE",
            methodology="Deterministic test adapter", usage_license_metadata="Internal development fixture; not for decision making.",
        )
        state = ScenarioState(
            user_goal=goal, intent=intent, geography=intent.geography, constraints=request.constraints,
            clarifications=self._questions(), confidence=0.2, freshness="ILLUSTRATIVE", evidence=[evidence],
            products=[_claim("cl_product_pickle", "Pickle manufacturing is the requested product category.", ClaimClassification.FACT, confidence=1.0, evidence_ids=[evidence.evidence_id], methodology="Parsed user intent")],
            candidate_locations=[_claim("cl_location_fixture", "Candidate industrial-area comparison is unavailable until researched in a later phase.", ClaimClassification.UNKNOWN, reason="No verified evidence available")],
            raw_materials=[_claim("cl_material_fixture", "Raw-material sourcing is intentionally illustrative in Phase 1.", ClaimClassification.UNKNOWN, reason="No verified evidence available")],
            sourcing_information=[_claim("cl_sourcing_fixture", "No supplier or sourcing-region claims are available in fixture mode.", ClaimClassification.UNKNOWN, reason="No verified evidence available")],
            process_stages=[_claim("cl_process_fixture", "Illustrative process stages: receiving, preparation, mixing, curing, packing.", ClaimClassification.ASSUMPTION, methodology="Deterministic fixture")],
            facility_requirements=[_claim("cl_facility_fixture", "Facility footprint is unknown until capacity and land constraints are supplied.", ClaimClassification.UNKNOWN, reason="No verified evidence available")],
            utilities=[_claim("cl_electricity_unknown", "Electricity tariff is unavailable for this scenario.", ClaimClassification.UNKNOWN, reason="No verified evidence available")],
            environmental_profile=[_claim("cl_environment_fixture", "Wastewater and brine handling require scenario-specific assessment.", ClaimClassification.INFERENCE, confidence=0.3, methodology="Generic product-category reasoning; not a local environmental finding")],
            waste_streams=[_claim("cl_waste_fixture", "Organic residues and brine wastewater are candidate waste streams requiring validation.", ClaimClassification.INFERENCE, confidence=0.3, methodology="Generic product-category reasoning")],
            circular_opportunities=[_claim("cl_circular_unknown", "No circularity recommendation is available without validated waste quantities and local buyers.", ClaimClassification.UNKNOWN, reason="No verified evidence available")],
            compliance_research=[_claim("cl_compliance_unknown", "Regulatory requirements have not been researched and are not legal advice.", ClaimClassification.UNKNOWN, reason="No verified evidence available")],
            economics=[_claim("cl_economics_unknown", "No capex, opex, tariff, or payback estimate is available in fixture mode.", ClaimClassification.UNKNOWN, reason="No verified evidence available")],
            risks=[_claim("cl_risk_fixture", "Seasonal supply, food safety, and wastewater handling require validation.", ClaimClassification.INFERENCE, confidence=0.3, methodology="Deterministic fixture")],
            unknowns=[_claim("cl_electricity_unknown", "Electricity tariff is unavailable for this scenario.", ClaimClassification.UNKNOWN, reason="No verified evidence available")],
            metadata={"mode": "fixture", "phase": 1},
        )
        self._scenarios[state.scenario_id] = state
        return state

    def get(self, scenario_id: str) -> ScenarioState:
        return self._scenarios[scenario_id]

    def answer(self, scenario_id: str, response: ClarificationResponse | dict[str, object]) -> ScenarioState:
        if isinstance(response, dict):
            response = ClarificationResponse.model_validate(response)
        state = self.get(scenario_id)
        if response.recommend_defaults:
            state = state.model_copy(update={
                "clarifications": [], "confidence": 0.35,
                "assumptions": [
                    _claim("as_product", "Assume mixed vegetable pickle.", ClaimClassification.ASSUMPTION, methodology="Recommend-default fixture"),
                    _claim("as_capacity", "Assume a small pilot production capacity.", ClaimClassification.ASSUMPTION, methodology="Recommend-default fixture"),
                    _claim("as_budget", "Assume budget requires later user confirmation.", ClaimClassification.ASSUMPTION, methodology="Recommend-default fixture"),
                    _claim("as_land", "Assume land is not yet secured.", ClaimClassification.ASSUMPTION, methodology="Recommend-default fixture"),
                    _claim("as_market", "Assume a regional target market.", ClaimClassification.ASSUMPTION, methodology="Recommend-default fixture"),
                ],
                "capacity": _claim("as_capacity", "Assume a small pilot production capacity.", ClaimClassification.ASSUMPTION, methodology="Recommend-default fixture"),
            })
        elif response.answers:
            remaining = {question.key: question for question in state.clarifications}
            invalid = set(response.answers) - set(remaining)
            if invalid:
                raise ValueError(f"Unknown or already answered clarification: {sorted(invalid)[0]}")
            constraints = [*state.constraints, *(ScenarioConstraint(key=key, value=value, source="USER") for key, value in response.answers.items())]
            state = state.model_copy(update={"constraints": constraints, "clarifications": [question for key, question in remaining.items() if key not in response.answers]})
        self._scenarios[scenario_id] = state
        return state

    def events(self, scenario_id: str) -> list[dict[str, object]]:
        state = self.get(scenario_id)
        events: list[dict[str, object]] = [
            {"type": "RUN_STARTED", "runId": state.scenario_id, "mission": state.user_goal},
            {"type": "STEP_STARTED", "runId": state.scenario_id, "step": "understand_ambition", "label": "Parsing manufacturing mission"},
            {"type": "STEP_FINISHED", "runId": state.scenario_id, "step": "understand_ambition", "result": "Deterministic intent created", "evidence": [self._frontend_evidence(item) for item in state.evidence]},
        ]
        if state.clarifications:
            question = state.clarifications[0]
            events.append({"type": "UI_REQUEST", "requestId": f"clarification_{question.key}", "runId": state.scenario_id, "component": "ClarificationSelector", "version": 1, "reason": question.reason, "question": question.question, "blocksSteps": ["construct_factory"], "props": {"options": [{"value": option, "label": option, "estimate": option == "Recommend defaults"} for option in question.options], "default": question.options[0]}})
        else:
            # While a question is pending the run is paused awaiting the user; finishing it would clear the request in the reducer.
            events.append({"type": "RUN_FINISHED", "runId": state.scenario_id})
        return events

    @staticmethod
    def _frontend_evidence(item: EvidenceItem) -> dict[str, object]:
        return {"id": item.evidence_id, "kind": "fact", "claim": item.extracted_fact, "source": item.source_title, "confidence": item.confidence, "illustrative": item.freshness == "ILLUSTRATIVE", "sourceUrl": str(item.source_url), "retrievedAt": item.retrieved_at.isoformat(), "sourceProvider": item.source_provider, "sourceType": item.source_type, "freshness": item.freshness, "methodology": item.methodology, "usageLicenseMetadata": item.usage_license_metadata}

    @staticmethod
    def _questions() -> list[ClarificationQuestion]:
        return [
            ClarificationQuestion(key="product_type", question="Which pickle product should the scenario evaluate?", reason="Ingredients, process, and waste depend on product type.", required_for="product", options=["Mango", "Lemon", "Mixed vegetable", "Recommend defaults"]),
            ClarificationQuestion(key="capacity", question="What production capacity should be considered?", reason="Capacity changes equipment, footprint, utilities, and economics.", required_for="capacity", options=["Pilot", "Small commercial", "Medium commercial", "Recommend defaults"]),
            ClarificationQuestion(key="budget", question="What investment budget is available?", reason="Budget constrains facility and equipment options.", required_for="economics", options=["Not decided", "Under ₹1 crore", "₹1–5 crore", "Recommend defaults"]),
            ClarificationQuestion(key="land", question="Is land available for the factory?", reason="Land availability changes location and facility assumptions.", required_for="location", options=["Land available", "Need options", "Not decided", "Recommend defaults"]),
            ClarificationQuestion(key="target_market", question="Which market should be prioritized?", reason="Market choice affects capacity, packaging, and distribution.", required_for="supply_chain", options=["Local", "Regional", "Pan-India", "Recommend defaults"]),
        ]
