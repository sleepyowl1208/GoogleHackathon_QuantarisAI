# QuantarisAI — Project Context

> This is the canonical product context for QuantarisAI. It defines product
> direction and architectural constraints; it does not prescribe implementation
> code, persistence, or infrastructure.

## 1. Identity and Mission

QuantarisAI is an AI-powered industrial and environmental intelligence platform
for Bharat. It connects manufacturing ecosystems with the real-world
environment so that industrial decisions can account for materials, processes,
resources, economics, environmental impact, waste, and circular value.

Bharat (India) is the initial strategic context. The platform must remain
globally extensible and industry-agnostic; it is not limited to a single Indian
industry, manufacturing category, or geographic problem.

The mission is to move from optimizing individual factories to intelligently
designing and evolving connected industrial ecosystems.

## 2. Product Vision

QuantarisAI helps answer:

- What should be manufactured?
- Where and how should it be manufactured?
- Which materials, suppliers, resources, and capabilities are required?
- What are the economic and environmental consequences?
- What waste and by-products are produced?
- How can outputs become new industrial inputs or opportunities?
- What can an existing factory manufacture next?

It is not a generic RAG system, chat copilot, or passive dashboard. Its
differentiation is evidence-aware industrial reasoning over structured domain
concepts, deterministic scenario evaluation, circularity, and a closed loop
between industrial decisions and real-world environmental conditions.

## 3. Intelligence Planes

### Industrial Intelligence

Industrial Intelligence is the primary MVP plane. It supports opportunity
discovery, location intelligence, factory design, materials, processes,
suppliers, resources, economics, sustainability, factory capabilities, and
factory evolution.

### Environmental Intelligence

Environmental Intelligence connects industrial decisions to observed
environmental conditions. Its future scope includes authorized camera, image,
and sensor inputs; waste detection; classification; evidence validation;
location and severity; impact assessment; authority routing; SLA tracking;
escalation; and resolution verification.

It is architected now but is not the primary MVP implementation or a general
citizen-surveillance system.

### Circularity Intelligence

Circularity Intelligence turns WasteStreams and ByProducts into candidate
industrial value through reuse, recovery, recycling, material substitution,
secondary products, industrial symbiosis, and waste-to-value opportunities.
Waste detected in the environment may eventually become a candidate industrial
input only after suitable validation and assessment.

## 4. Long-Term Lifecycle

Discover → Design → Build → Operate → Observe → Understand → Act → Verify →
Reuse → Evolve → Discover again

This closed loop connects discovery, manufacturing decisions, operational and
environmental observations, verified outcomes, circularity, and factory or
ecosystem evolution.

## 5. Industrial Ecosystem and Factory Evolution

The core unit of value is an industrial ecosystem: Products, Materials,
Processes, Machines, Factories, Locations, Suppliers, Resources, Markets,
WasteStreams, and environmental/economic assessments connected through a
ManufacturingScenario.

Factory Evolution is a long-term capability:

Current Factory State → Existing Capabilities → Available Resources → Existing
Machines and Processes → Workforce and Constraints → Candidate Capability →
Incremental Requirements → Investment → Economic Impact → Environmental Impact
→ Recommendation

Existing, derived, and potential FactoryCapabilities must remain distinct. A
potential capability is not a claim that a factory already has that capability.

## 6. Future Environmental Accountability Vision

The future Environmental Accountability Engine follows:

Environmental Observation → Validation → Classification → Evidence →
Attribution where legally authorized → Jurisdiction → Authority → Incident →
SLA → Action → Resolution → Verification → Escalation

Observation is not attribution, and attribution is not legal responsibility.
QuantarisAI must not automatically declare an individual or organization legally
responsible, use facial recognition merely for environmental monitoring, or
treat correlation as causation. User-submitted evidence requires validation and
moderation; evidence confidence must be explicit. SLA values are jurisdiction
and configuration driven.

## 7. MVP Boundary

The MVP remains:

Product Brief → Industrial Requirements → Location → Factory → Resources →
Economics → Environmental Impact → Waste → Circularity → Next Opportunity

The MVP provides industrial and circularity decision support, including
environmental-impact analysis in the manufacturing workflow. It does not
include full municipal integrations, automated environmental enforcement,
unrestricted camera surveillance, facial recognition, production-grade
city-wide monitoring, complex microservices, Kubernetes, or speculative
infrastructure.

## 8. Core Architectural Principles

- Modular first; distributed when justified.
- Keep business concepts domain-first and industry-agnostic.
- Keep domain services independent of AI providers, databases, Google Cloud,
  HTTP frameworks, and frontend frameworks.
- Separate facts, assumptions, deterministic calculations, inference,
  recommendations, and simulations.
- Preserve evidence and provenance for important outputs.
- Use deterministic services for validation, calculations, business rules,
  simulation, and transformations; use AI for reasoning, synthesis, planning,
  interpretation, and model-appropriate classification.
- Agents orchestrate reasoning and tools; they do not become the domain model,
  database, simulation engine, or source of deterministic rules.
- Adopt Google Cloud services only when their benefit is demonstrated.

## 9. Product Technology Foundations

### Frontend

The frontend foundation is Next.js 16.x, React, TypeScript, Tailwind CSS, and
shadcn/ui or an equivalent controlled component foundation. Zod may validate
client-side/runtime contracts where appropriate.

The frontend owns the application shell, navigation, authentication UI when
introduced, interaction, visualization, maps, scenario exploration, workflow
state presentation, structured/dynamic agent-generated UI rendering, evidence
presentation, and human approval/intervention surfaces. It must not own core
industrial business rules.

The frontend is prepared for A2UI-compatible dynamic UI rendering and
AG-UI-compatible agent interaction where useful. These are complementary:

- A2UI answers what approved UI should be rendered for the current task state.
- AG-UI answers how the application communicates with and observes agentic
  workflows.

Agents supply structured UI intent and data; they never generate arbitrary HTML,
JavaScript, or React code. The application renders only a controlled component
catalog.

### Backend

The backend foundation is Python, FastAPI, Google ADK, and Google Gen AI /
Gemini / Vertex AI.

- FastAPI is the backend application boundary: HTTP/API, request validation,
  streaming, application entry points, and future authentication/authorization
  boundaries.
- Google ADK is the agent runtime/orchestration layer for delegation, sessions
  or state where appropriate, tool invocation, and workflow execution.
- Gemini / Vertex AI provides model inference.
- Pydantic provides backend domain/application contracts and structured-data
  validation.
- Domain services own deterministic business logic.
- Simulation owns deterministic scenario calculations.

ADK is not the entire backend architecture. Domain services remain independent
of FastAPI, ADK, Gemini, and Google Cloud.

## 10. Dynamic UI Direction

The future Quantaris component catalog is controlled by the application.
Conceptual components include ScenarioCard, FactoryCard, MaterialCard,
SupplierCard, LocationMap, FactoryCapabilityGraph, EconomicChart,
EnvironmentalImpactCard, WasteStreamCard, CircularityOpportunityCard,
SimulationPanel, EvidenceViewer, ConfidenceIndicator, RecommendationPanel,
ComparisonTable, WorkflowStatus, and Timeline.

The first useful dynamic UI should support:

Manufacturing Scenario → Recommendation → Comparison → Simulation →
Circularity Opportunity

The MVP should have a stable Next.js shell and controlled component system with
architecture prepared for A2UI and AG-UI. Dynamic rendering is introduced
incrementally when it proves useful; no generic protocol framework is required
before a real vertical slice.

## 11. Canonical Documentation

- Technical architecture:
  [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md)
- Domain model: [docs/data/DOMAIN_MODEL.md](docs/data/DOMAIN_MODEL.md)
- Agent design: [docs/agents/AGENT_DESIGN.md](docs/agents/AGENT_DESIGN.md)
