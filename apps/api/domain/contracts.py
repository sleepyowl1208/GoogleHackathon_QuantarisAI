from datetime import datetime
from enum import Enum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ClaimClassification(str, Enum):
    FACT = "FACT"
    ASSUMPTION = "ASSUMPTION"
    CALCULATION = "CALCULATION"
    INFERENCE = "INFERENCE"
    RECOMMENDATION = "RECOMMENDATION"
    SIMULATION = "SIMULATION"
    UNKNOWN = "UNKNOWN"


class ManufacturingIntent(Contract):
    product: str
    activity: str
    geography: str
    confidence: float = Field(ge=0, le=1)


class ScenarioConstraint(Contract):
    key: str
    value: str | int | float | bool
    source: str = "USER"


class ClarificationQuestion(Contract):
    key: str
    question: str
    reason: str
    required_for: str
    options: list[str] = Field(min_length=2)


class Claim(Contract):
    claim_id: str
    statement: str
    classification: ClaimClassification
    reason: str | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    evidence_ids: list[str] = Field(default_factory=list)
    methodology: str | None = None

    @model_validator(mode="after")
    def unknowns_need_a_reason(self):
        if self.classification is ClaimClassification.UNKNOWN and not self.reason:
            raise ValueError("UNKNOWN claims require a reason")
        return self


class EvidenceItem(Contract):
    evidence_id: str
    claim_id: str
    source_title: str
    source_provider: str
    source_url: HttpUrl
    retrieved_at: datetime
    published_at: datetime | None = None
    extracted_fact: str
    geography: str | None = None
    units: str | None = None
    confidence: float = Field(ge=0, le=1)
    source_type: str
    freshness: str
    methodology: str
    usage_license_metadata: str


class ScenarioRequest(Contract):
    user_goal: str = Field(min_length=1, max_length=2000)
    constraints: list[ScenarioConstraint] = Field(default_factory=list)


class ClarificationResponse(Contract):
    answers: dict[str, str | int | float | bool] = Field(default_factory=dict)
    recommend_defaults: bool = False


class ScenarioState(Contract):
    scenario_id: str = Field(default_factory=lambda: f"scn_{uuid4().hex[:12]}")
    user_goal: str
    intent: ManufacturingIntent
    geography: str
    constraints: list[ScenarioConstraint] = Field(default_factory=list)
    clarifications: list[ClarificationQuestion] = Field(default_factory=list)
    assumptions: list[Claim] = Field(default_factory=list)
    products: list[Claim] = Field(default_factory=list)
    capacity: Claim | None = None
    candidate_locations: list[Claim] = Field(default_factory=list)
    raw_materials: list[Claim] = Field(default_factory=list)
    sourcing_information: list[Claim] = Field(default_factory=list)
    process_stages: list[Claim] = Field(default_factory=list)
    facility_requirements: list[Claim] = Field(default_factory=list)
    utilities: list[Claim] = Field(default_factory=list)
    environmental_profile: list[Claim] = Field(default_factory=list)
    waste_streams: list[Claim] = Field(default_factory=list)
    circular_opportunities: list[Claim] = Field(default_factory=list)
    compliance_research: list[Claim] = Field(default_factory=list)
    economics: list[Claim] = Field(default_factory=list)
    risks: list[Claim] = Field(default_factory=list)
    unknowns: list[Claim] = Field(default_factory=list)
    evidence: list[EvidenceItem] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)
    freshness: str
    metadata: dict[str, Any] = Field(default_factory=dict)
