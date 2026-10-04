# QuantarisAI — Product and UX Design Specification

> This is the canonical product and UX specification for frontend
> implementation. It defines experience intent, information hierarchy, and
> controlled dynamic UI boundaries. It does not create application code,
> components, dependencies, or implementation files.

## 1. Product Experience Principle

QuantarisAI is not a generic admin dashboard, chatbot with cards, BI dashboard,
CRUD interface, or collection of unrelated charts.

The experience communicates:

> Describe an industrial ambition and QuantarisAI models the ecosystem required
> to make it economically viable, environmentally responsible, and circular.

The user interacts with an industrial intelligence system. The primary visual
flow is:

AMBITION → INDUSTRIAL SYSTEM → LOCATION → FACTORY → RESOURCES → ECONOMICS →
ENVIRONMENTAL IMPACT → WASTE → CIRCULARITY → NEXT OPPORTUNITY

Every meaningful output should visibly identify whether it is a fact,
assumption, calculation, inference, simulation, or recommendation.

## 2. Visual Direction

The interface is premium, futuristic industrial intelligence: sophisticated,
minimal, spatial, technical, data-first, and evidence-aware. It supports high
information density through hierarchy and progressive disclosure, not clutter.
Motion is cinematic only when it explains a system transition or flow.

The visual language must be credible for industrial companies, manufacturing
strategists, sustainability teams, government and industrial planning bodies,
investors, and factory operators, while remaining memorable in a hackathon
demonstration.

Avoid excessive glassmorphism, neon cyberpunk, decorative gradients, giant empty
hero areas, uniform card grids, and gimmicky animation.

## 3. Global Application Shell

### Primary navigation

The proposed primary navigation is:

- **Command Center**: new ambition, suggested missions, and recent scenarios.
- **Scenarios**: saved or in-progress ManufacturingScenarios.
- **Industrial Map**: location exploration and comparison.
- **Factories**: factory configurations and future evolution.
- **Circularity**: waste-to-value opportunities.
- **Evidence**: cross-scenario evidence and provenance access.

**Environmental Intelligence** is a future navigation area. It is not required
for the MVP beyond Environmental Impact in a scenario.

### Persistent shell elements

- QuantarisAI identity and product area navigation.
- Global command/search surface for finding scenarios, factories, locations, or
  starting a new ambition.
- Scenario context strip when inside a scenario: scenario name, current stage,
  confidence summary, and last update.
- Workflow status indicator with safe high-level events, never raw model
  reasoning.
- Evidence/provenance entry point.
- User/profile placeholder and future authentication state.

### Responsive shell

Desktop and laptop are the demonstration priority. On tablet, primary navigation
compresses to icons plus an active label; secondary workspace navigation becomes
a horizontal rail. On mobile, navigation becomes a drawer and complex views
become focused panels rather than miniature dashboards.

## 4. Landing / Command Center

The first screen is an active command surface, not a marketing page. The
primary focus is a large but disciplined industrial-ambition composer with an
optional geographic starting point.

Suggested missions:

- I want to manufacture electric motors in India.
- I want to manufacture 1 million cotton T-shirts annually.
- What manufacturing opportunities exist in this region?
- What else could this factory manufacture?
- Find economic uses for this factory's waste.

The screen also shows recent scenarios as compact, evidence-labelled work
objects. Submitting the composer transitions directly to scenario generation,
where the user sees meaningful workflow status and can supply missing context.

## 5. Scenario Workspace

The Scenario Workspace is the core QuantarisAI screen. A ManufacturingScenario
progressively materializes as a connected industrial system:

Product → Materials → Processes → Machines → Factory → Location → Resources →
Economics → Environmental Impact → Waste → Circularity

### Workspace structure

- **Scenario header**: ambition, status, recommendation readiness, confidence,
  and primary actions.
- **System canvas**: a compact spatial summary of the connected industrial
  system; nodes are selectable, not decorative.
- **Stage rail**: Overview, Location, Factory, Economics, Impact, Circularity,
  Evidence.
- **Detail panel**: contextual metrics, comparisons, requirements, and evidence
  for the selected stage or node.
- **Evidence Drawer**: a global trust layer opened from any metric,
  recommendation, or confidence signal.

Overview starts with a legible scenario narrative and the currently most useful
decision. Other stages use progressive disclosure: an executive summary first,
then assumptions, inputs, calculations, alternatives, and source evidence on
demand.

## 6. Geo / Location Intelligence

Location Intelligence has two modes:

- **Map mode**: candidate locations on a future map surface, with surrounding
  scenario panels responding to selection.
- **Comparison mode**: a decision-oriented table or matrix for side-by-side
  evaluation.

Each candidate presents logistics, resource availability, workforce, supplier
proximity, infrastructure, environmental constraints, confidence, and evidence.
Selection changes the active Factory, Resources, Economics, and Impact context
instead of opening an isolated map page.

The first implementation may render a controlled map placeholder or schematic;
it must not assume live Google Maps integration.

## 7. Factory Blueprint

The Factory Blueprint is a visual system representation, not a realistic 3D
factory. It makes flows understandable:

Materials → Processes → Machines → Outputs → Waste

The MVP uses a 2D flow/topology with selected-node details, capacity and
constraint callouts, and visible waste branches. Future versions may introduce
interactive topology, 2D/3D layouts, resource flows, machine relationships,
and bottleneck analysis without changing the conceptual UX.

## 8. Economics Intelligence

Economics is a decision surface, not merely a chart page. It combines:

- material, energy, workforce, logistics, and operating costs
- estimated production cost and investment
- scenario comparison and uncertainty
- assumptions and sensitivity context

Every figure carries a provenance badge:

- **Known**: observed or imported source data.
- **Assumption**: explicit scenario input.
- **Calculated**: deterministic output.
- **Modelled**: simulation output.
- **Inferred**: model-supported interpretation.

The primary question is “what changes the decision?” rather than “what chart can
be shown?”

## 9. Environmental Impact

Environmental Impact presents energy, water, emissions, waste, and logistics
impact as connected scenario consequences. It visually distinguishes measured,
imported, modelled, and inferred values through text labels, icons, and
patterns—not color alone.

MVP impact values may be deterministic demonstration estimates. The interface
must label them as such and expose assumptions and calculation context in the
Evidence Drawer.

## 10. Circularity

Circularity is one of the visually distinctive QuantarisAI surfaces:

WasteStream → Characterization → Recovery → Reuse → Secondary Material →
Secondary Product → Industrial Consumer → New Opportunity

A node-and-flow view displays multiple pathways, their requirements, evidence,
economic potential, and environmental implications. The key user insight is:

> Something previously treated as waste has become an economic input.

Circularity pathways must be actionable decision objects, not passive waste
reporting.

## 11. Factory Evolution

Factory Evolution is a future experience:

Current Factory → Existing Capabilities → Candidate Capability → Required
Changes → Investment → Environmental Impact → New Products

Its core view answers:

- **What you have**
- **What you need**
- **What you could make**
- **Why it may be worth doing**

It is not required in Vertical Slice 1. Existing, derived, and potential
capabilities remain explicitly distinct.

## 12. Evidence and Trust Layer

Evidence is a cross-cutting UX pattern. Selecting a metric, scenario claim,
recommendation, confidence indicator, or flow node opens an Evidence Drawer.

The drawer identifies:

- output kind: FACT, ASSUMPTION, CALCULATION, INFERENCE, SIMULATION, or
  RECOMMENDATION
- source and timestamp
- assumptions and constraints
- calculation, model, rule, or simulation context
- confidence and uncertainty
- supporting evidence and next verification action

The drawer communicates “why should I trust this?” without exposing private
model reasoning.

## 13. Dynamic UI / A2UI

The application owns a controlled component catalog. A future agent can request
supported components and structured data through an A2UI-compatible description;
the frontend validates and renders only approved components.

Static application shell candidates:

- navigation, command surface, authentication UI, accessibility primitives,
  scenario routing, evidence drawer frame, and page layout.

Dynamic A2UI candidates:

- scenario summaries, comparisons, recommendations, simulation panels,
  controlled cards, graphs, evidence summaries, workflow modules, and
  contextual circularity pathways.

The prohibited path is agent-to-arbitrary executable HTML, JavaScript, or React
code. Dynamic composition is a controlled renderer concern, not code generation.

## 14. AG-UI Interactions

Future workflow events include:

THINKING, RETRIEVING_DATA, RUNNING_SIMULATION, COMPARING_LOCATIONS,
ANALYSING_IMPACT, FINDING_CIRCULARITY, GENERATING_RECOMMENDATION,
WAITING_FOR_APPROVAL, COMPLETED, FAILED.

The UI presents these as meaningful workflow progress: concise status text,
stage indicators, relevant active artifacts, cancellation/retry where allowed,
and clear outcomes. It never exposes private chain-of-thought or raw model
reasoning.

AG-UI compatibility is optional per interaction. It supports workflow/event
transport where valuable; it is not required for every frontend action.

## 15. Controlled Quantaris Component Catalog

P0 components are required for Vertical Slice 1. All components are controlled
application concepts, not agent-generated executable code.

| Component | Priority | Purpose and required data | States and interaction | Responsive behavior |
|---|---|---|---|---|
| CommandComposer | P0 | Ambition text, optional geography, suggested missions. | Idle, validating, generating, error; submit and select mission. | Full-width on mobile. |
| WorkflowStatus | P0 | Safe workflow event, stage, progress, errors. | Active, waiting, completed, failed; opens run summary. | Compact status rail. |
| ScenarioCard | P0 | Scenario name, ambition, status, confidence, updated time. | Recent, active, complete, error; opens scenario. | Single-column list. |
| RecommendationPanel | P0 | Recommended location/configuration, rationale, confidence, actions. | Draft, ready, low confidence; opens evidence. | Stacked action block. |
| ComparisonTable | P0 | Candidates, criteria, score provenance, selection. | Loading, comparison, insufficient data; select candidate. | Horizontal scroll or criterion drill-down. |
| LocationMap | P0 | Candidate positions or schematic, selected location, evidence. | Map placeholder, selected, unavailable; selection updates workspace. | Simplified list/map toggle. |
| FactoryBlueprint | P0 | Materials, processes, machines, outputs, waste. | Loading, selected node, constraint; node opens details. | Linear flow with detail drawer. |
| EconomicChart | P0 | Cost categories, assumptions, calculated/modelled values. | Loading, comparison, uncertainty; point opens evidence. | Summary plus drill-down. |
| EnvironmentalImpactCard | P0 | Energy, water, emissions, waste, logistics; provenance. | Estimate, measured, low confidence; opens evidence. | Stacked metric cards. |
| WasteStreamCard | P0 | Material, quantity, composition, source, handling, value. | Identified, incomplete, matched; opens paths. | Collapsible summary. |
| CircularityOpportunityCard | P0 | Pathway, consumer, value, impact, evidence, confidence. | Candidate, constrained, recommended; compare or inspect. | Stacked pathway list. |
| EvidenceViewer | P0 | Output kind, source, timestamp, assumptions, confidence. | Available, incomplete, unavailable; drawer/dialog navigation. | Full-screen dialog on mobile. |
| ConfidenceIndicator | P0 | Confidence level and explanation. | High, medium, low, unknown; always opens explanation. | Text plus icon, never color alone. |
| SimulationPanel | P1 | Inputs, scenario run state, structured outputs. | Ready, running, complete, failed; rerun/compare. | Collapsed detail section. |
| FactoryCapabilityGraph | P1 | Existing, derived, potential capabilities and constraints. | Current, candidate, gap; select node. | Simplified hierarchy. |
| SupplierCard | P1 | Supplier offering, capacity, proximity, evidence. | Available, incomplete, comparison; inspect evidence. | List item. |
| MaterialCard | P1 | Material properties, alternatives, source, impact. | Available, substitute, constrained; compare. | Collapsible item. |
| Timeline | P1 | Workflow and scenario events. | Running, complete, failed; select event. | Vertical timeline. |

## 16. Motion and Transitions

Motion is restrained, purposeful, and interruptible.

Good uses include scenario materialization, flow visualization, location
selection transitions, circularity pathway discovery, metric deltas, and
simulation progress. Avoid decorative animation, excessive parallax, constant
motion, and any animation that delays decisions. Respect reduced-motion
preferences; every workflow must remain understandable without motion.

## 17. Responsive Design

Desktop/laptop is the primary hackathon demonstration target. Tablet preserves
the scenario stage rail but collapses peripheral panels. Mobile prioritizes the
command, recommendation, selected stage, and evidence; complex industrial
visualizations simplify to a focused flow, list, or detail view rather than
shrinking mechanically.

## 18. Accessibility

- Full keyboard navigation and visible focus order.
- Semantic headings, landmarks, tables, lists, and form labels.
- Sufficient contrast and non-color-only status communication.
- Reduced-motion support.
- Readable charts with textual summaries and data tables where needed.
- Accessible tooltips, dialogs, drawers, focus management, and escape routes.
- Loading, empty, and error states announced meaningfully.

## 19. Vertical Slice 1 Design

Vertical Slice 1 is one coherent scenario experience:

Product Brief input → Scenario generation → Recommended Location → Location
Comparison → Factory Configuration → Economics → Environmental Impact → Waste
Streams → Circularity Opportunities → Recommendation → Assumptions / Evidence

### Required screens

1. Command Center
2. Scenario Workspace Overview
3. Location Intelligence, with map/schematic and comparison modes
4. Factory Blueprint
5. Economics and Impact stage
6. Circularity stage
7. Evidence Drawer

### Required interaction flow

The user enters or chooses an ambition, sees safe generation progress, receives
a coherent scenario, compares locations, selects a candidate, inspects the
factory flow and economics/impact, follows waste into circularity opportunities,
and reviews a final recommendation with evidence.

### Required states

- **Loading**: stage-specific skeletons and WorkflowStatus, not blank pages.
- **Empty**: explain what input or data is needed and offer a next action.
- **Error**: state what failed, preserve available results, and offer retry or
  return to the last stable stage.
- **Demo**: clearly labelled deterministic scenario data, assumptions, and
  evidence-ready provenance.

No Factory Evolution, full Environmental Accountability, live municipal data,
unrestricted maps, or generic dynamic-protocol platform is required in this
slice.

## 20. Demo Story

A two-to-three minute hackathon journey:

1. Enter: “I want to manufacture 1 million cotton T-shirts annually.”
2. QuantarisAI materializes the industrial system and recommends a location.
3. Compare candidates through economics, logistics, environmental impact, and
   confidence—not a single opaque score.
4. Inspect the proposed factory flow and reveal the waste stream.
5. Follow that waste into reuse or secondary-product opportunities.
6. Open evidence for the recommendation and close on the insight that the
   factory is part of an evolving circular industrial ecosystem.

The story demonstrates a decision journey, not a feature tour.

## 21. Text Wireframes

### Command Center

    ┌──────────────── QuantarisAI ─────────────── Evidence  Profile ┐
    │ Command Center   Scenarios   Industrial Map   Factories   Circularity │
    │                                                                    │
    │  What industrial ambition should we model?                         │
    │  [ Manufacture 1M cotton T-shirts annually in India            ]  │
    │  [ Optional starting region ]                     [ Generate → ]  │
    │                                                                    │
    │  Suggested missions                  Recent scenarios              │
    │  [Electric motors] [Factory reuse]   [T-shirts / Draft / 72%]      │
    └────────────────────────────────────────────────────────────────────┘

### Scenario Workspace

    ┌ Scenario: Cotton T-shirts ── Generating recommendation ── 72% ┐
    │ Overview  Location  Factory  Economics  Impact  Circularity  Evidence │
    ├────────────────────────────────────────────────────────────────────┤
    │ Product → Materials → Process → Factory → Waste → Circularity       │
    │ [Selected system node / key constraint / recommendation]            │
    ├───────────────────────────────┬────────────────────────────────────┤
    │ Stage detail                  │ Recommendation / confidence         │
    │ inputs • outputs • tradeoffs  │ [Open evidence] [Compare]           │
    └───────────────────────────────┴────────────────────────────────────┘

### Location Intelligence

    ┌ Location ─ Map | Compare ──────────────────────────────────────────┐
    │ [Map or controlled schematic] │ Candidate comparison                 │
    │        ● Selected             │ Cost  Logistics  Resources  Impact  │
    │        ○ Candidate             │ A     calc      fact       modelled │
    │                               │ B     calc      fact       modelled │
    │ Evidence • workforce • suppliers • constraints • [Select candidate] │
    └────────────────────────────────────────────────────────────────────┘

### Factory Blueprint

    ┌ Factory configuration ─────────────────────────────────────────────┐
    │ Material ──> Process ──> Machine ──> Product                        │
    │                         └──────────> WasteStream                    │
    │ Selected: Machine / capacity / constraints / evidence                │
    └────────────────────────────────────────────────────────────────────┘

### Circularity

    ┌ WasteStream: cotton offcuts ────────────────────────────────────────┐
    │ Characterize → Recover → Match ─┬→ Secondary material → Consumer    │
    │                                  ├→ Reuse pathway                   │
    │                                  └→ Symbiosis opportunity            │
    │ Value • impact • confidence • evidence • [Compare pathways]         │
    └────────────────────────────────────────────────────────────────────┘

### Evidence Drawer

    ┌ Why this recommendation                                      Close × ┐
    │ RECOMMENDATION  Confidence: Medium                              │
    │ Source / timestamp / assumptions / calculation / model             │
    │ Supporting evidence                                                 │
    │ Uncertainty and next verification action                           │
    └────────────────────────────────────────────────────────────────────┘

## 22. Design Tokens and System

- **Typography**: one clear page title, then stage and section hierarchy; dense
  data uses readable tabular numerals and concise labels.
- **Spacing**: a disciplined scale with compact workspace density and breathing
  room around decision points, not uniform oversized padding.
- **Borders and radius**: restrained radius; borders and alignment establish
  structure before shadows.
- **Elevation**: base canvas, secondary panels, transient drawers/dialogs;
  shadows are subtle and functional.
- **Surfaces**: stable application shell, active workspace, selected object,
  evidence/trust overlay.
- **Status semantics**: text, icon, shape/pattern, and color together for
  active, complete, warning, blocked, and failed states.
- **Data visualization**: compare decisions, show provenance and uncertainty,
  label axes and units, and provide accessible textual alternatives.

A final brand palette is intentionally not hardcoded here.

## 23. Implementation Priority

### P0 — Vertical Slice 1

Command Center, scenario workspace, WorkflowStatus, recommendation/evidence
patterns, location comparison plus controlled map/schematic, factory blueprint,
economics/impact surfaces, waste and circularity opportunities, responsive
desktop-first shell, and loading/empty/error/demo states.

### P1 — Hackathon Enhancement

SimulationPanel, FactoryCapabilityGraph, richer supplier/material detail,
Timeline, selected A2UI-composed workspace modules, and AG-UI-compatible
workflow progress where it creates a stronger demo.

### P2 — Future Product

Factory Evolution, live map integrations, broad dynamic UI composition,
full Environmental Intelligence/Accountability, advanced topology, persistent
multi-scenario collaboration, and expanded industrial ecosystem views.

## 24. Validation Constraints

This design preserves the existing MVP, controlled component principle, and
domain/framework boundaries. A2UI and AG-UI are prepared but not mandatory for
Vertical Slice 1. The design introduces no backend architecture beyond the
documented Next.js/FastAPI/ADK boundaries and does not turn QuantarisAI into a
generic dashboard.
