# QuantarisAI — Agent Architecture and Contracts

> This document defines conceptual agent boundaries and contracts. It does not
> create runtime agents, prompts, tools, schemas, or implementation code.

## 1. Agent Architecture Principle

Agents are reasoning and orchestration components.

Agents are not the domain model, database, simulation engine, or source of
truth for deterministic business rules. They coordinate domain services, tools,
data retrieval, simulation, and other agents where appropriate.

Deterministic business logic belongs in domain/services, domain/rules, and
simulation. An agent may request a calculation or apply a documented workflow,
but it must not duplicate the rule or silently perform unsupported arithmetic.

## 2. Conceptual Hierarchy

Supervisor
│
├── Industrial Intelligence
│   ├── Opportunity
│   ├── Location
│   ├── Factory
│   ├── Sustainability
│   ├── Economics
│   ├── Circularity
│   └── Evolution
│
└── Environmental Intelligence
    ├── Observation
    ├── Classification
    ├── Impact
    └── Reporting

These folders and responsibilities are architectural boundaries. They do not
mean that every boundary must immediately become an independent autonomous
agent. The MVP uses the smallest number of agents necessary.

## 3. Supervisor

The Supervisor:

- interprets user intent
- determines the appropriate workflow and intelligence plane
- maintains workflow context
- coordinates specialist agents and delegation
- handles workflow-level failures
- produces or requests final synthesis

The Supervisor must not perform domain calculations, implement economic or
environmental formulas, contain factory-capability rules, become a database
abstraction, or make unsupported factual claims.

## 4. Industrial Intelligence

Industrial Intelligence is the primary MVP intelligence plane. Its conceptual
workflow is:

Product Brief → Industrial Requirements → Location → Factory → Resources →
Economics → Environmental Impact → Waste → Circularity → Next Opportunity

It may use specialist reasoning modules, but its outputs rely on structured
domain context and deterministic services for validation and calculations.

## 5. Opportunity Boundary

The Opportunity responsibility:

- interprets an industrial opportunity
- identifies potential products and required capabilities
- identifies relevant constraints and missing information
- structures the opportunity for downstream analysis

It must not fabricate market facts, perform unsupported financial calculations,
silently invent suppliers, or perform deterministic calculations itself.

## 6. Location Boundary

The Location responsibility evaluates candidate locations, infrastructure,
logistics, workforce, resources, environmental constraints, and comparisons.
It relies on structured data and domain services for calculations; it does not
invent location facts or geospatial results.

## 7. Factory Boundary

The Factory responsibility understands factory capabilities and maps machines,
processes, and materials. It identifies existing capability, capability gaps,
and potential manufacturing configurations.

It must preserve these distinctions:

- Existing capability: currently evidenced.
- Derived capability: supported by transparent rules or calculations.
- Potential capability: conditional on incremental requirements.

It must not claim that a factory can manufacture something without sufficient
evidence.

## 8. Sustainability Boundary

The Sustainability responsibility evaluates environmental dimensions of a
ManufacturingScenario, identifies energy, water, and material impacts,
coordinates environmental calculations, identifies trade-offs, and explains
their implications. Deterministic domain or simulation services perform
calculations where possible.

## 9. Economics Boundary

The Economics responsibility structures economic assumptions, requests economic
calculations, compares scenarios, explains trade-offs, and identifies
uncertainty. It must not invent numerical outputs. Economic calculations belong
to the simulation/economics subsystem.

## 10. Circularity Boundary

The Circularity responsibility analyzes WasteStreams and ByProducts to identify
reuse, recovery, material-substitution, secondary-product, and
industrial-symbiosis opportunities. It connects waste streams to candidate
industrial consumers using structured domain information.

Circularity is a core product capability, not merely a reporting feature.

## 11. Evolution Boundary

The Evolution responsibility evaluates current factory capabilities, adjacent
capabilities, incremental equipment and material/resource requirements,
candidate products, and capability-expansion scenarios.

Its conceptual workflow is:

Current Factory → Existing Capability → Candidate Capability → Incremental
Requirements → Economics → Environmental Impact → Recommendation

The result is an evidence-aware recommendation, not a statement that a future
capability already exists.

## 12. Environmental Intelligence

Environmental Intelligence is architected now but is not the primary MVP
implementation. Its future flow is:

Observation → Validation → Classification → Evidence → Attribution where legally
authorized → Jurisdiction → Authority → Incident → SLA → Action → Resolution →
Verification → Escalation

## 13. Environmental Observation Boundary

The Observation responsibility interprets environmental observations, structures
metadata, associates evidence, identifies observation type, and estimates
classification confidence. An observation is not automatically an incident.

## 14. Environmental Classification Boundary

The Classification responsibility classifies environmental observations,
distinguishes observed characteristics from inferred interpretation, provides
confidence, and identifies uncertainty. A model classification is not an
established fact.

## 15. Environmental Impact Boundary

The Impact responsibility assesses environmental implications, correlates
relevant environmental data, requests deterministic calculations when
available, and distinguishes correlation from causation. It must not claim
causation merely because measurements correlate.

## 16. Environmental Reporting Boundary

The Reporting responsibility structures EnvironmentalIncidents, identifies
jurisdiction and responsible Authority, determines configured SLAs, prepares
reports, tracks workflow state, and supports escalation and resolution
verification.

Observation, attribution, and legal responsibility are distinct. Facial
recognition is not a required capability.

## 17. Standard Agent Contract

Every agent conceptually receives:

- task
- relevant domain context
- available evidence
- assumptions
- constraints
- previous workflow results
- allowed tools

Every agent conceptually produces:

- structured result
- reasoning summary where appropriate
- evidence references
- assumptions
- confidence
- uncertainty
- requested next action
- errors or failures where applicable

This is a conceptual contract, not a final implementation schema.

### Structured UI Intent and Interaction Events

Agents may produce structured UI intent and data compatible with the
application's A2UI layer. They must not generate arbitrary executable frontend
code, HTML, JavaScript, or React components. The frontend validates and renders
requested UI through the controlled Quantaris component catalog.

Agent workflow events may be exposed through an AG-UI-compatible interaction
layer where appropriate, including progress, tool visibility, state updates,
and human-in-the-loop events. Agents continue to return structured data and
evidence; AG-UI compatibility does not make it mandatory for every interaction.

## 18. Agent-to-Domain Boundary

The required flow is:

Agent → Domain Service → Domain Rules / Simulation → Structured Result → Agent

Not:

Agent → arbitrary business logic

Agents should not duplicate domain rules. The domain service and simulation
boundaries make deterministic behavior testable without an LLM.

## 19. Agent-to-Tool Boundary

Conceptual tool categories are:

- data retrieval
- simulation
- geospatial analysis
- market analysis
- factory analysis
- environmental analysis
- evidence retrieval
- external integrations

Tools must have explicit contracts. Agents must not receive unrestricted access
to infrastructure, credentials, data stores, or external systems.

## 20. Evidence and Provenance

Agent outputs preserve the distinctions below and reference supporting evidence
when possible:

| Output kind | Meaning |
|---|---|
| FACT | Observed or verified information |
| ASSUMPTION | Explicit input used when a fact is unavailable |
| CALCULATION | Deterministic result from rules and inputs |
| INFERENCE | Model-supported interpretation with confidence |
| RECOMMENDATION | Proposed decision or action |
| SIMULATION | Modelled scenario output |

An agent must not present an inference, recommendation, or simulation as a
fact.

## 21. Failure Handling

Agents must handle missing or conflicting data, low confidence, unavailable
tools, tool failures, invalid inputs, downstream-agent failure, timeouts, and
unsupported requests explicitly.

They must not silently fabricate missing information. Prefer: “I cannot
determine this from the available evidence.” The Supervisor may request missing
information, retry an appropriate tool, choose a safe fallback, or return a
structured failure.

## 22. Delegation

Delegation is appropriate when another specialist has the required domain
expertise, a workflow needs a separate reasoning capability, or a specialist
can produce a structured result. It is not appropriate merely to increase the
number of agents.

The Supervisor remains responsible for workflow coherence and for preserving
the evidence, assumptions, constraints, and failures produced by specialists.

## 23. MVP Agent Set

The minimum useful MVP set is:

1. **Supervisor**: owns user intent, workflow routing, context, failures, and
   final synthesis.
2. **Industrial Scenario Agent**: combines Opportunity, Location, Factory,
   Sustainability, Economics, and initial Evolution reasoning; it delegates
   deterministic work to domain services and simulation.
3. **Circularity Agent**: separately analyzes waste and by-products and returns
   circularity opportunities to the industrial workflow.

Environmental Impact in the MVP is supplied through Industrial Scenario
coordination with deterministic services, not through the future Environmental
Intelligence accountability workflow. Environmental specialist agents are not
required for the MVP.

The Supervisor remains separate because workflow control is a distinct
responsibility. Circularity remains separate because waste-to-value matching is
a core differentiator with its own evidence and decision boundary. The other
industrial responsibilities may initially be combined until scale, quality, or
ownership evidence justifies specialization.

## 24. Future Agent Evolution

The MVP structure can evolve toward specialist agents, multi-agent planning,
hierarchical delegation, event-driven workflows, Environmental Intelligence,
Factory Evolution, and circular industrial ecosystems. Such evolution is
conditional on demonstrated need; this document does not require those
capabilities to be implemented now.

## 25. Agent Evaluation

Agent evaluation should assess:

- correctness
- groundedness
- evidence usage
- tool selection
- tool correctness
- deterministic-calculation delegation
- hallucination resistance
- uncertainty handling
- workflow completion
- failure handling
- consistency

Evaluations complement, rather than replace, deterministic unit and simulation
tests.

## 26. Open Questions

The following decisions remain unresolved:

- Google ADK runtime structure
- agent state model
- session model
- tool registration
- structured output schema
- model selection and routing
- human approval boundaries
- evaluation framework
- agent observability
- long-running workflow handling
