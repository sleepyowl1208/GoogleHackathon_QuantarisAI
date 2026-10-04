# QuantarisAI — Canonical Conceptual Domain Model

This is a conceptual business-domain model. It defines meanings, boundaries,
relationships, and invariants before Python, Pydantic, database, event, or API
models exist. Listed attributes are conceptual, not implementation fields.

## 1. Domain Model Principles

- Domain concepts represent the industrial ecosystem and are independent of AI
  providers, databases, and Google Cloud.
- Observed facts, imported data, assumptions, deterministic calculations, AI
  inferences, recommendations, and simulations must remain distinguishable.
- Important conclusions, assessments, and decisions retain evidence and
  provenance where appropriate.
- The model supports multiple industries. Textiles may illustrate a use case but
  must not shape the core vocabulary.
- Environmental Intelligence is architecturally compatible with this model,
  while its full accountability workflow remains outside the initial MVP.
- Circularity connects waste and by-products to potential industrial value; it
  is broader than recycling.

## 2. Core Entities

### IndustrialOpportunity

An IndustrialOpportunity is a potential manufacturing or industrial outcome
addressing a market need, operational problem, resource condition, or
circularity opportunity. It identifies the opportunity, market/problem,
candidate products, required capabilities and resources, location constraints,
and the influence of economics and sustainability.

Conceptual attributes include: id, name, description, opportunity type, target
market, products, required capabilities, required resources, location
constraints, economic assessment, environmental assessment, circularity
assessment, evidence, assumptions, confidence, and status. Confidence is an
assessment of support, never a fact; its evidence, assumptions, and inference
source remain visible.

### Product

A Product is something that can be manufactured. It has an identity,
description, category, required materials, manufacturing processes, quality
requirements, production-volume context, market context, and sustainability
constraints. It is not tied to one factory or industry.

### Material

A Material is a physical material or material class used in production. It has
an identity, category, relevant properties, possible sources and suppliers,
environmental characteristics, substitutable materials, and associated waste
streams. It can be virgin, recovered, recycled, or secondary without separate
core entity types.

### Process

A Process is a manufacturing transformation. It describes inputs, outputs,
steps, required machinery and skills, energy and water requirements, generated
waste and emissions, and process constraints. It is distinct from a Machine:
the process is the transformation; a machine is one possible means to perform
it.

### Machine

A Machine is manufacturing equipment with a type, capabilities, compatible
processes, capacity, resource requirements, operational constraints, and
investment characteristics. A machine can support multiple processes, and a
process can require multiple machines.

### Factory

A Factory is a manufacturing facility. It is associated with a Location and has
capabilities, machines, workforce, production capacity, materials, processes,
energy and water sources, waste streams, logistics access, operational
constraints, and environmental characteristics.

### FactoryCapability

A FactoryCapability describes what a specific Factory can manufacture or
perform.

- Existing capability is evidenced by current equipment, process, workforce,
  authorization, or operational state.
- Derived capability follows from evidenced conditions through transparent rules
  or calculations.
- Potential capability is contingent on incremental requirements, investment,
  approvals, or other changes.

This prevents Factory Evolution from presenting a possible capability as a
present fact.

### Location

A Location is a geographic context for industrial decisions. It can describe
geography, infrastructure, logistics, utilities, workforce availability, market
proximity, environmental and regulatory constraints, industrial ecosystem, and
risk factors. It supports geospatial information conceptually without requiring
a particular geospatial database or coordinate representation.

### Supplier

A Supplier is an organization supplying materials, machinery, services, or
other industrial inputs. Relevant concepts include supplied offerings, coverage,
capacity, reliability, commercial characteristics, and evidence for claims.

### Resource

A Resource is an industrial input or enabling condition, including energy,
water, raw materials, workforce, logistics, and infrastructure. It groups
shared planning concerns, but EnergySource, WaterSource, and Workforce retain
their specialized semantics rather than being forced into one generic form.

### EnergySource

An EnergySource represents energy available to a process or facility: source
type, availability, capacity, cost characteristics, emissions characteristics,
and reliability.

### WaterSource

A WaterSource represents a manufacturing-relevant water supply: source type,
availability, capacity, quality, cost, and sustainability characteristics.

### Workforce

A Workforce represents manufacturing-relevant human capabilities: skills,
availability, capacity, geographic relevance, and cost characteristics. It is
not an individual-person or surveillance model.

### LogisticsRoute

A LogisticsRoute represents the movement of materials or products between
locations: origin, destination, transport mode, distance, capacity, cost, time,
and environmental characteristics.

### WasteStream

A WasteStream is material generated by a process, factory, product, or other
industrial activity. It includes material characteristics, source, quantity,
composition, location, handling requirements, disposal/recycling/reuse options,
possible economic value, and environmental impact.

### ByProduct

A ByProduct is a potentially valuable output that is not the primary product.

- Waste is an output requiring handling; it may still have value.
- A by-product is a non-primary output with identified or plausible use.
- A recoverable material can be recovered from a waste stream.
- A secondary product is created by transforming a recovered material or
  by-product.

These classifications can change as characterization, market context, and
processing options change.

### Market

A Market represents demand context: demand, geography, segment, price
characteristics, growth, import/export context, and competitive context. It is
separate from Product so the same product can be assessed in multiple markets.

### EnvironmentalImpact

An EnvironmentalImpact represents an industrial activity or scenario across
emissions, energy use, water use, waste, land, transport, and other indicators.
Every value distinguishes measured/observed data from estimated, calculated, or
modelled data.

### EconomicModel

An EconomicModel is the economic assessment of an industrial scenario. It may
include capital and operating expenditure; material, energy, water, logistics,
and workforce costs; revenue assumptions; margins; payback; sensitivity; and
uncertainty. It does not prescribe a financial methodology.

### ManufacturingScenario

A ManufacturingScenario is an orchestration object for one possible
manufacturing configuration. It connects Product, Materials, Suppliers,
Location, Factory, Processes, Resources, Logistics, Economics,
EnvironmentalImpact, WasteStreams, and circularity opportunities. It supports
comparison without treating a candidate configuration as operational.

### Capability

A Capability is a generalized industrial ability: a transformation, quality
level, production function, or operational competence. It may be referenced by
opportunities, processes, machines, or factories.

It differs from FactoryCapability, which is the contextualized and evidenced
relationship between a specific Factory and a Capability, including whether it
is existing, derived, or potential.

### EnvironmentalObservation

An EnvironmentalObservation records an observed environmental condition or
event. It may include source, timestamp, location, observation type, evidence,
classification, confidence, and environmental context. It is not an
interpretation, attribution, incident, or legal conclusion.

### EnvironmentalIncident

An EnvironmentalIncident is a validated environmental event requiring action or
tracking. Its conceptual lifecycle is:

DETECTED → VALIDATED → REPORTED → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → VERIFIED

Escalation may occur when its applicable SLA is breached. An incident does not
legally determine guilt.

### Evidence

Evidence supports an observation, assessment, recommendation, or incident. It
may originate from a sensor, image, video, document, external dataset, human
observation, or system-generated process. It retains provenance: source,
collection/retrieval time, integrity or validation status, and confidence.
System-generated evidence identifies the process that generated it.

### Authority

An Authority is an organization responsible for an environmental or industrial
responsibility, such as a municipality, regulator, industrial authority, or
private responsible organization. The core model does not hardcode Indian
government structures.

### SLA

An SLA is a configurable service-level expectation for an incident or action.
It is associated with jurisdiction or operating context, responsible authority,
target response, target resolution, and escalation rules. It must not assume a
universal response period.

### Resolution

A Resolution records an action or outcome for an environmental incident or
industrial issue. A claimed resolution is an assertion; a verified resolution
requires suitable verifying Evidence and never arises automatically.

## 3. Important Relationships

Product → requires → Material and Process  
Process → requires → Machine and Resource  
Process → produces → WasteStream and ByProduct  
Factory → has → Machine and FactoryCapability  
Factory → employs → Workforce  
Factory → uses → EnergySource and WaterSource  
Factory → performs → Process  
Factory → generates → WasteStream  
Supplier → supplies → Material and Machine  
Location → hosts → Factory  
Location → connects_to → LogisticsRoute  
ManufacturingScenario → produces → Product  
ManufacturingScenario → uses → Factory, Material, and Process  
ManufacturingScenario → requires → Resource  
ManufacturingScenario → has → EconomicModel and EnvironmentalImpact  
ManufacturingScenario → produces → WasteStream  
WasteStream → may_become → ByProduct  
WasteStream → may_enable → CircularityOpportunity  
IndustrialOpportunity → may_result_in → ManufacturingScenario  
FactoryCapability → may_enable → Product  
Factory → may_evolve_to → FactoryCapability  
EnvironmentalObservation → supported_by → Evidence  
EnvironmentalObservation → may_become → EnvironmentalIncident  
EnvironmentalIncident → assigned_to → Authority  
EnvironmentalIncident → governed_by → SLA  
EnvironmentalIncident → resolved_by → Resolution  
Resolution → verified_by → Evidence

CircularityOpportunity is a conceptual match or assessment between a WasteStream
and a possible reuse, recovery, transformation, or industrial consumer. It is
named to describe the relationship, not introduced as a required persistence
entity at this stage.

## 4. Facts, Assumptions, Inference, and Recommendations

QuantarisAI must not collapse distinct information into a generic AI result.

| Kind | Meaning | Example |
|---|---|---|
| FACT | Observed or verified information | A factory has 20 machines. |
| ASSUMPTION | Explicit input when a fact is unavailable | Electricity-cost assumption. |
| CALCULATION | Deterministic result from inputs and rules | Annual energy use calculated from machine load. |
| INFERENCE | Model-supported interpretation with confidence | Factory may be capable of Product X. |
| RECOMMENDATION | Proposed decision or action | Build Product X at Factory Y. |
| SIMULATION | Modelled outcome under a scenario | Projected five-year economics under Scenario Z. |

Every kind retains inputs, provenance, confidence where applicable, and method.
An inference or recommendation never becomes a fact merely because it is
plausible.

## 5. Provenance

Important information should answer:

- Where did it originate?
- When was it observed or retrieved?
- Is it measured, imported, calculated, inferred, recommended, or modelled?
- Which assumptions were used?
- Which model, rule, or process produced it?
- How confident is the result, and what evidence supports it?

This is a provenance requirement, not a mandated framework or implementation.

## 6. Factory Evolution

Current Factory State → Existing Capabilities → Available Resources → Existing
Machines → Existing Processes → Available Workforce → Constraints → Candidate
New Capability → Incremental Requirements → Investment → Economic Impact →
Environmental Impact → Recommendation

Factory Evolution discovers what a factory could manufacture next. Its output is
an evidence-aware recommendation that identifies the incremental requirements
and assumptions separating a potential capability from an existing one.

## 7. Circularity

WasteStream → Characterize → Match → Recover → Transform → Secondary Product /
Material → Industrial Consumer

Circularity includes reuse, recovery, material substitution, secondary products,
industrial symbiosis, and waste-to-value. Industrial symbiosis means one
activity's underused output, resource, capability, or infrastructure can become
an input to another activity. It is not limited to recycling.

## 8. Environmental Intelligence

Environmental Observation → Validation → Classification → Evidence →
Attribution where legally authorized → Jurisdiction → Authority → Incident →
SLA → Action → Resolution → Verification → Escalation

Observation ≠ attribution ≠ legal responsibility. Facial recognition is not a
required environmental capability. Correlation between environmental
measurements must not be treated as causation. Attribution must be legally
authorized and subject to Authority validation; it does not establish legal
responsibility.

## 9. Industry Agnosticity

The same core entities support textiles, automotive, electronics, chemicals,
food, construction materials, renewable-energy equipment, and other
manufacturing domains. Variation belongs in product categories, material
properties, process constraints, quality requirements, regulatory context, and
specialized extensions—not a separate core entity set per industry.

## 10. Domain Invariants

- A ManufacturingScenario identifies a Product and manufacturing configuration.
- A FactoryCapability identifies whether it is existing, derived, or potential.
- A claimed Resolution is not a verified resolution.
- An EnvironmentalObservation is not automatically an EnvironmentalIncident.
- A WasteStream is not automatically without economic value.
- An AI recommendation is not a fact.
- Environmental attribution does not automatically imply legal responsibility.
- An SLA is configurable by context and jurisdiction.
- Measured/observed environmental values remain distinct from estimated or
  modelled values.
- Material, Process, and Capability concepts remain industry-agnostic.

## 11. Open Design Questions

The following are intentionally unresolved:

- Exact persistence model and aggregate boundaries
- Exact geospatial representation
- Event model and event-contract boundaries
- Identity, authorization, and multi-tenancy model
- Exact provenance implementation and evidence-integrity approach
- Economic calculation methodology
- Environmental-impact methodology
- Agent state representation
- External data-source contracts
- Jurisdiction and authority configuration model
- Circularity matching and valuation methodology
