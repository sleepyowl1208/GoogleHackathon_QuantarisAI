# QuantarisAI — Technical Architecture

> This is the canonical technical architecture for QuantarisAI. It defines
> modular boundaries and decision constraints before application code,
> persistence, cloud configuration, or deployment infrastructure is introduced.
> The canonical conceptual domain model is
> [docs/data/DOMAIN_MODEL.md](../data/DOMAIN_MODEL.md).

## 1. Architecture Goal

QuantarisAI is a modular monolith with event-driven boundaries.

> **Modular first. Distributed when justified.**

The initial system has one primary backend application with strong internal
module boundaries. Modules may later become independently deployable services
only when scale, ownership, isolation, or reliability requirements justify it.
The MVP is not a collection of microservices.

## 2. High-Level Architecture

                         QUANTARISAI
                              |
        +---------------------+---------------------+
        |                     |                     |
        v                     v                     v
 INDUSTRIAL              ENVIRONMENTAL       CIRCULARITY
 INTELLIGENCE             INTELLIGENCE        INTELLIGENCE
        |                     |                     |
        +---------------------+---------------------+
                              |
                              v
                       IMPACT ENGINE
                              |
                              v
                        ACTION ENGINE
                              |
                              v
                       SYSTEM EVOLUTION

**Industrial Intelligence** discovers and evaluates manufacturing
opportunities, locations, factories, resources, economics, sustainability, and
factory evolution.

**Environmental Intelligence** is a future, governed capability for
environmental observation, evidence validation, impact assessment, authority
routing, SLA tracking, and resolution verification. It is architected now but
is not the full MVP accountability system.

**Circularity Intelligence** characterizes waste and by-products, identifies
reuse, recovery, substitution, secondary-product, and industrial-symbiosis
opportunities, and returns those opportunities to industrial decision-making.

The **Impact Engine** assesses economic and environmental consequences. The
**Action Engine** turns validated insights into recommendations, workflows, or
appropriately governed actions. **System Evolution** feeds verified outcomes,
capability changes, and circularity learnings into the next discovery cycle.

## 3. Application Layers

Presentation
    |
Application / API
    |
Agent Orchestration
    |
Domain Services
    |
Domain Model
    |
Integration / Infrastructure

| Layer | Responsibility | Allowed dependencies |
|---|---|---|
| Presentation | User interaction and rendering of explicit facts, assumptions, recommendations, and confidence. | Application/API contracts only. |
| Application / API | Use-case coordination, input/output contracts, authorization boundary, and request lifecycle. | Agent orchestration and domain services; adapters through defined interfaces. |
| Agent Orchestration | Reasoning, planning, tool coordination, and synthesis. | Domain services, simulations, and explicit integration tools. |
| Domain Services | Deterministic business rules, validation, calculations, scenario coordination, and constraints. | Domain model and abstract ports/interfaces. |
| Domain Model | Industry concepts, invariants, and relationships. | Other domain concepts only. |
| Integration / Infrastructure | Concrete adapters for persistence, external data, model providers, messaging, logging, and deployment. | External systems and abstractions defined above it. |

Dependencies point inward. In particular, the Domain Model and Domain Services
must not depend on Next.js, React, FastAPI, Google ADK, Gemini, A2UI, AG-UI,
Google Cloud, databases, HTTP frameworks, or external APIs.

## 4. Repository Mapping

| Directory | Responsibility |
|---|---|
| apps/web | Next.js frontend boundary: React, TypeScript, Tailwind CSS, controlled components, maps, visualization, and approval surfaces. |
| apps/api | FastAPI backend boundary: HTTP/API, validation, streaming, and application entry points. |
| domain/models | Future implementation of conceptual domain entities. |
| domain/schemas | Future internal domain contracts, distinct from transport contracts. |
| domain/services | Deterministic domain use cases and calculations. |
| domain/rules | Explicit business constraints and policies. |
| domain/exceptions | Domain-specific error vocabulary. |
| agents | Future Google ADK orchestration/reasoning implementations, partitioned by intelligence plane. |
| simulation | Independent deterministic scenario-evaluation subsystem. |
| vision | Future authorized image classification, moderation, evidence, and provenance boundary. |
| data | Future data schemas, seed data, ingestion, transformation, and validation boundary. |
| integrations | Future adapters for Google, municipal, and external systems. |
| events | Explicit event contracts and future publishers/consumers. |
| infrastructure | Future deployment artifacts only when justified. |
| config | Future configuration boundary; no secrets belong here. |
| tests | Unit, integration, and evaluation test boundaries. |
| docs | Product, architecture, data, agent, and decision records. |

This mapping preserves clear module ownership without requiring every directory
to be implemented now.

## 4.1 Frontend, Backend, and Dynamic UI Foundation

The frontend foundation is Next.js 16.x, React, TypeScript, Tailwind CSS, and
shadcn/ui or an equivalent controlled component foundation. Zod is used for
client-side/runtime contract validation where appropriate. The frontend owns the
application shell, navigation, future authentication UI, interaction,
visualization, maps, scenario exploration, workflow-state presentation,
evidence presentation, and human approval surfaces. It must not contain core
industrial business rules.

The backend foundation is Python, FastAPI, Google ADK, and Google Gen AI /
Gemini / Vertex AI:

- FastAPI is the HTTP/API, validation, streaming, future authorization, and
  application-orchestration boundary.
- Google ADK is the agent runtime/orchestration layer for delegation, sessions
  or state where appropriate, tool invocation, and workflow execution.
- Gemini / Vertex AI is the model-inference layer.
- Pydantic supports backend domain/application contracts and structured-data
  validation.
- Domain services and Simulation retain deterministic business logic and
  scenario calculations.

FastAPI is the backend application boundary; ADK is not the entire backend.
Domain services remain independent of FastAPI, ADK, Gemini, and Google Cloud.

### A2UI-compatible UI Architecture

A2UI is the dynamic UI representation/protocol layer. An agent or application
describes UI declaratively, and the frontend renders it through an approved
component catalog:

User → Agent → A2UI UI description → Quantaris component catalog → React
renderer → Dynamic UI

The prohibited path is LLM → arbitrary HTML, JavaScript, or React execution.
The required path is Agent → structured A2UI description → validated approved
component catalog → controlled renderer.

The future controlled catalog includes ScenarioCard, FactoryCard, MaterialCard,
SupplierCard, LocationMap, FactoryCapabilityGraph, EconomicChart,
EnvironmentalImpactCard, WasteStreamCard, CircularityOpportunityCard,
SimulationPanel, EvidenceViewer, ConfidenceIndicator, RecommendationPanel,
ComparisonTable, WorkflowStatus, and Timeline. These are concepts, not
implemented components.

### AG-UI-compatible Interaction Architecture

AG-UI is the agent/application interaction and event/transport layer where it
adds value. It may expose streaming agent-execution events, state updates, tool
execution visibility, workflow progress, interaction events,
human-in-the-loop events, and frontend/backend communication.

It does not determine what UI to render. A2UI answers what UI should be
rendered for the current task state; AG-UI answers how the application
communicates and interacts with an agentic workflow. They are complementary,
not interchangeable. Neither protocol is required for every interaction, and
the frontend must not be prematurely coupled to a protocol implementation.

                         NEXT.JS
                    React + TypeScript
                           │
                    ┌──────┴──────┐
                    │             │
                 AG-UI          A2UI
              interaction      UI model
               /events            │
                    │             │
                    └──────┬──────┘
                           │
                        FastAPI
                           │
                       Google ADK
                           │
                      Supervisor
                           │
              ┌────────────┼────────────┐
              │            │            │
          Industrial   Circularity  Environmental
              │            │            │
              └────────────┼────────────┘
                           │
                     Domain Services
                           │
                ┌──────────┼──────────┐
                │          │          │
            Simulation    Data    Integrations

Dynamic UI is task-oriented and contextual rather than a set of permanently
visible dashboards. A location request may show comparison, cost,
environmental-impact, logistics, confidence, evidence, and scenario actions.
Factory Evolution may show capabilities, incremental equipment and investment,
products, comparison, and simulation controls. Circularity may show waste
characteristics, consumers, pathways, secondary products, and symbiosis.
Future environmental workflows may show incidents, evidence, confidence,
jurisdiction, authority, SLA, resolution, and verification.

The MVP establishes a stable Next.js application shell and controlled component
system, with A2UI and AG-UI compatibility prepared at the presentation and
agent-interaction boundaries. Dynamic rendering is introduced incrementally for
real use cases, beginning with Manufacturing Scenario → Recommendation →
Comparison → Simulation → Circularity Opportunity; it does not require a large
generic UI protocol framework before the first vertical slice works.

## 5. Agent Architecture

Agents are reasoning and orchestration components. They do not own core
deterministic business rules.

Supervisor
    |
    +-- Industrial Intelligence
    |      |
    |      +-- Opportunity
    |      +-- Location
    |      +-- Factory
    |      +-- Sustainability
    |      +-- Circularity
    |      +-- Economics
    |      +-- Evolution
    |
    +-- Environmental Intelligence
           |
           +-- Observation
           +-- Classification
           +-- Impact
           +-- Reporting

The exact runtime topology is intentionally undecided. These are conceptual
responsibilities, not a requirement for separately deployed processes or
simultaneously active agents. Agents call domain services and simulation tools;
they do not embed large amounts of deterministic business logic.

## 6. Deterministic and AI Responsibilities

AI is appropriate for reasoning, synthesis, planning, interpretation,
model-appropriate classification, opportunity discovery, scenario exploration,
and natural-language interaction.

Deterministic code is responsible for validation, calculations, business rules,
unit conversions, economic calculations, simulation, constraints, and data
transformations.

An LLM must not silently replace deterministic calculations. Outputs must
continue to distinguish observed facts, assumptions, calculations, inferences,
recommendations, and simulations as defined in the domain model.

## 7. Simulation Architecture

Simulation is an independent subsystem usable without an LLM:

simulation/
    materials/
    energy/
    water/
    emissions/
    economics/
    engine/

The simulation engine evaluates ManufacturingScenarios and produces structured,
traceable outputs. Its modules model material, energy, water, emissions, and
economics concerns. Agents may request a simulation but never perform its
mathematics themselves.

## 8. Data Architecture

The system conceptually separates:

- **Operational data**: current entities and workflow state.
- **Analytical data**: aggregated or query-oriented decision support data.
- **Reference data**: stable classifications, units, and configurable context.
- **External data**: imported source data with source and freshness metadata.
- **Evidence**: supporting artifacts and provenance for observations and claims.
- **Simulation outputs**: scenario-specific calculated or modelled results.
- **AI-generated outputs**: inferences, summaries, and recommendations with
  confidence and method.

Cloud SQL / PostgreSQL may eventually provide operational relational
persistence. BigQuery may support analytical workloads. Cloud Storage may hold
large evidence, imported, or generated artifacts. None is a committed
persistence design or an immediate MVP dependency; the first implementation may
use a simpler justified strategy.

## 9. Google Cloud Architecture

Google Cloud is the intended deployment ecosystem, but each service is adopted
only for a demonstrated requirement.

| Service | Intended responsibility | Adoption |
|---|---|---|
| Gemini / Vertex AI | Model access for approved reasoning, synthesis, and classification tasks. | Conditional MVP capability. |
| Google ADK | Agent orchestration/runtime for delegation, workflow execution, and state where appropriate. | MVP backend foundation when the first agentic workflow is implemented. |
| Cloud Run | Backend or API deployment where a managed container runtime is appropriate. | MVP deployment target when deployment begins. |
| BigQuery | Analytical data and large-scale analysis. | Future / conditional. |
| Cloud Storage | Evidence, imported artifacts, and large generated outputs. | Future / conditional. |
| Cloud SQL / PostgreSQL | Operational relational persistence. | Future / conditional. |
| Pub/Sub | Asynchronous event transport when decoupling is useful. | Future / conditional. |
| Google Maps Platform | Location intelligence and mapping capability. | Conditional MVP capability. |
| Cloud Logging / Monitoring | Production observability. | Conditional MVP capability when deployed. |

No service is required merely because it appears in this target ecosystem.

## 10. Event Architecture

Events are explicit records of meaningful state changes, not a mandate for
distributed infrastructure. Candidate conceptual events include:

- ProductBriefCreated
- ManufacturingScenarioGenerated
- SimulationCompleted
- OpportunityDiscovered
- WasteStreamIdentified
- CircularityOpportunityDiscovered
- EnvironmentalObservationCreated
- EnvironmentalIncidentCreated
- ResolutionReported
- ResolutionVerified

Event schemas should be explicit and version-aware. In-process event handling
is sufficient until asynchronous processing provides a concrete benefit. Pub/Sub
is a future option, not a mandatory MVP dependency.

## 11. Environmental Intelligence Architecture

The future accountability flow is:

Observation → Validation → Classification → Evidence → Attribution where legally
authorized → Jurisdiction → Authority → Incident → SLA → Action → Resolution →
Verification → Escalation

Observation is not attribution. Attribution is not legal responsibility.
Environmental monitoring must not become unrestricted citizen surveillance, and
facial recognition is not a required architectural component. Correlation among
environmental measurements must not automatically be interpreted as causation.
Any entity association depends on legal authorization and responsible-authority
validation; the system does not determine legal guilt.

## 12. Circularity Architecture

Factory
    |
    v
Process
    |
    v
WasteStream
    |
    v
Characterization
    |
    v
Matching
    |
    +----> Reuse
    +----> Recovery
    +----> Material substitution
    +----> Secondary product
    +----> Industrial symbiosis
    |
    v
Circularity Opportunity

Circularity Intelligence consumes industrial waste and by-product information
and, in the future, suitably validated environmental information. It produces
candidate industrial inputs or opportunities that re-enter Industrial
Intelligence. Circularity is a core differentiator, not a reporting add-on.

## 13. Factory Evolution Architecture

Current Factory State → Existing Capabilities → Available Resources →
Constraints → Candidate Capability → Incremental Requirements → Investment →
Economics → Environmental Impact → Recommendation

Factory Evolution is a core long-term capability. It uses evidence-aware,
deterministic assessments and explicitly labelled inferences to identify what a
factory could manufacture next; it must not represent potential capability as
current capability.

## 14. Evidence and Provenance

Provenance is cross-cutting. Important outputs should identify whether they are
observed, imported, calculated, inferred, simulated, or recommended, plus their
source, time, assumptions, generating model/rule/process, evidence, and
confidence where relevant. This defines an architectural requirement; it does
not implement a provenance subsystem.

## 15. Security and Trust Boundaries

The architecture requires future boundaries for:

- authentication and authorization
- tenant isolation
- secrets management
- external integration access
- model access controls
- sensitive environmental evidence
- auditability and traceability

Authentication is not implemented here, and no identity provider is selected.
Trust boundaries must preserve least privilege, prevent inappropriate exposure
of sensitive evidence, and make consequential operations auditable.

## 16. Observability

When implemented, the system needs structured logging, request tracing, agent
execution tracing, simulation-execution visibility, model-invocation
visibility, error tracking, latency monitoring, and cost monitoring.
Observability is a future architectural requirement, not an implementation in
this step.

## 17. Testing Architecture

- **Unit tests** validate deterministic domain logic without LLMs, network
  access, cloud credentials, or external APIs.
- **Integration tests** validate module boundaries and approved adapters once
  they exist.
- **Evaluation tests** assess agent correctness, groundedness, tool usage,
  reasoning outcomes, and failure handling.

Simulation must be deterministic where possible. Agent evaluation does not
substitute for deterministic domain testing.

## 18. Deployment Strategy

The initial backend/API deployment target is Google Cloud Run where appropriate.
Frontend deployment is deliberately undecided. Kubernetes is not part of the
initial architecture.

A module may eventually be extracted as an independently deployable service
only when evidence supports a need for independent scaling, ownership, fault
isolation, reliability, security isolation, or deployment cadence. Premature
extraction is avoided.

## 19. Architectural Decision Records

| Decision | Status | Rationale |
|---|---|---|
| ADR-001: Modular monolith before microservices | Accepted | Preserves simplicity while retaining extraction boundaries. |
| ADR-002: Domain-first architecture | Accepted | Prevents providers and infrastructure from defining the business model. |
| ADR-003: Agents orchestrate; they do not own deterministic rules | Accepted | Keeps validation and calculations testable and explainable. |
| ADR-004: Simulation separated from AI reasoning | Accepted | Allows deterministic, LLM-independent scenario evaluation. |
| ADR-005: Evidence/provenance is cross-cutting | Accepted | Keeps important claims traceable across intelligence planes. |
| ADR-006: Google Cloud is the primary deployment ecosystem | Accepted | Aligns with the project context while allowing justified adoption. |
| ADR-007: Environmental Intelligence is architected now, not primary MVP | Accepted | Preserves future compatibility without expanding MVP scope. |
| ADR-008: Circularity Intelligence is a core differentiator | Accepted | Makes waste-to-value part of industrial decision-making. |
| ADR-009: Next.js + React + TypeScript frontend foundation | Accepted | Establishes a typed, component-based application shell without moving business rules to the frontend. |
| ADR-010: FastAPI as backend application boundary | Accepted | Separates HTTP, validation, streaming, and application entry points from domain logic. |
| ADR-011: Google ADK as agent orchestration/runtime layer | Accepted | Supports delegation and workflow execution without becoming the backend or domain layer. |
| ADR-012: A2UI-compatible dynamic UI architecture | Accepted | Enables controlled declarative UI descriptions instead of executable agent-generated UI. |
| ADR-013: AG-UI-compatible agent interaction/event architecture | Accepted | Supports agentic streaming and interaction where useful without requiring it for every frontend interaction. |
| ADR-014: Controlled Quantaris component catalog | Accepted | Ensures agents request supported components and data, never arbitrary executable frontend code. |

A2UI and AG-UI adoption remains compatible with their evolving ecosystems and
must not introduce vendor or protocol lock-in into the domain layer.

## 20. MVP Boundary

MVP workflow:

Product Brief → Industrial Requirements → Location → Factory → Resources →
Economics → Environmental Impact → Waste → Circularity → Next Opportunity

Not MVP:

- full municipal integrations
- automated environmental enforcement
- unrestricted camera surveillance
- facial recognition
- production-grade city-wide environmental monitoring
- complex distributed microservices
- Kubernetes
- speculative infrastructure

## 21. Open Architectural Questions

The following must not be guessed yet:

- exact API framework
- frontend framework structure
- database persistence strategy
- event transport
- authentication provider
- tenant model
- agent runtime details
- ADK execution model
- model routing
- external-data ingestion strategy
- GIS implementation
- production deployment topology
