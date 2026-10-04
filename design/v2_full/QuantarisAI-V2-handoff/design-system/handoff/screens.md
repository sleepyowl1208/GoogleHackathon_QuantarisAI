# Handoff · Screens

Five V2 screens. Reference: `components/Screen*/preview.html` (design frame 1440 × 860). Data for every screen: `handoff/fixtures/scenario-tshirt-1m.json`. Tags: **STATIC** · **R3F** · **MAPS** · **AI** (see `handoff/README.md`).

## Shared shell (all screens except the demo)

```
┌──────────┬───────────────────────────────────────────────────────────┐
│ AppNav   │ bar: LevelPath · h1 title · spacer · status/actions        │ 16px / 24px padding
│ 224px    ├───────────────────────────────────────────────────────────┤ 16px gap
│ nav-     │ work grid (per screen)                                     │
│ surface  │                                                           │
└──────────┴───────────────────────────────────────────────────────────┘
```

| Region | Component | Tag | Notes |
|---|---|---|---|
| Navigation rail | `AppNav` | STATIC | items: 00 Command Center · Scenario: 01 Construction, 02 India Intelligence Map, 03 Living Ecosystem, 04 Factory Twin, 05 Economics & Impact, 06 Circularity · Library: Σ Evidence. Section label shows the scenario name (AI). |
| Level breadcrumb | `LevelPath` | STATIC (state from router) | INDIA › REGION › ECOSYSTEM › FACTORY › PROCESS › EVIDENCE |
| Title | `h1` (display 22/30) | STATIC + AI | scenario/site names come from the scenario |
| Scene | `Scene3D` | R3F (+ MAPS on screen 2 in production) | fills its grid cell; `≈ Illustrative model · not live data` bottom-left; CURRENT/SIMULATED badge top-right |
| Discovery markers | `DiscoveryMarker` | STATIC component · AI content | from `DISCOVERY` events; max 3 per level |
| Evidence | `EvidenceDrawer` | STATIC component · AI content | from `EVIDENCE` events / evidence API |

Routing (Next.js App Router): `/scenarios/[id]/construction`, `/map`, `/ecosystem`, `/factory`, `/factory/[processId]`, `?evidence=<subjectId>` opens the drawer on any route.

---

## 1 · AI Scenario Construction — `ScreenConstruction`

Purpose: show the scenario being built. Work grid `340px | 1fr`.

| Region | Component | Tag | Data / behaviour |
|---|---|---|---|
| Mission card | `qa-panel` + display text | STATIC · AI | `RUN_STARTED.mission` |
| Construction feed | `ConstructionFeed` | STATIC component · AI | `STEP_STARTED` / `STEP_FINISHED` (11 steps, result line each) |
| Scene | `Scene3D kind="map"` → `kind="ecosystem"` | R3F · AI | `STEP_FINISHED.scene` patches. Map phases 0→5 during steps 1–5; at step 6 (`construct_factory`, `camera:"dive"`) the scene switches to the ecosystem and continues phases 3→8; step 10 sets `circular:"analysing"` then `"discovered"` |
| Capacity question | `ClarifyCard` (CapacitySelector) | STATIC component · AI (A2UI) | `UI_REQUEST` during step 2; absolutely positioned top-left over the scene (16px); pauses only `blocksSteps` |
| Constraint marker | `DiscoveryMarker kind="constraint"` on `punjabwater` | AI | from step 5 |
| Improvement / waste markers | `DiscoveryMarker` on `energy`, `waste` | AI | steps 8, 9 |
| Opportunity card | `DiscoveryCard kind="expansion"` | STATIC component · AI | after `RUN_FINISHED`; top-right over scene; primary action "Model this opportunity" → `SCENE_PATCH {expanded:true}` |
| Status | `StatusTag` system → positive "Scenario ready" | STATIC · AI | run state |
| Replay | `Button` | STATIC | demo only |

States: running · waiting for input (clarify card visible, feed shows the waiting step active) · finished · `RUN_ERROR` → `StateView kind="error"` over the scene with what is excluded; feed keeps completed steps.
Fixture: `handoff/fixtures/agui-demo-run.json` reproduces the screen exactly (1.2–1.8s per step in demo mode).

---

## 2 · India Industrial Intelligence Map — `ScreenIndiaMap`

Purpose: WHERE to manufacture. Work grid `230px | 1fr | 320px`.

| Region | Component | Tag | Data / behaviour |
|---|---|---|---|
| Layers | `LayerPanel` | STATIC · AI (counts, availability) | 13 layers; disabled = no data for this scenario. Toggling patches `MapState.layers` |
| Map | `Scene3D kind="map"` | R3F now; **MAPS + R3F overlay in production** | `MapState {phase:5, layers, scores, recommended, circular}`; clicking a candidate column selects it (`onPick`) |
| Site labels | `SceneLabel` | STATIC · AI | recommended label = saffron with "recommended · 0.86" |
| Markers | constraint on `punjabwater`, verify on `noyyal`, circular on `panipat` (when the circularity layer is on) | AI | |
| Candidate comparison | `.qa-compare` cards | STATIC layout · AI values | name, score (display 22), meter, one-line why, "Recommended" tag; selected card = 2px saffron-strong border; click = select |
| Constraint card | `DiscoveryCard kind="constraint"` | AI | |
| Actions | `Evidence` (ghost), `Enter Tiruppur ecosystem` (primary) | STATIC | primary navigates to `/ecosystem` with a camera dive |

**Map in production:** Google Maps Platform (Maps JavaScript API, vector map, `WebGLOverlayView`) hosts the R3F layer: candidate columns, arcs, markers, constraint discs. Basemap styled to tokens (land `scene-ground`, water `scene-sea`, labels `ink-muted`, roads/POIs off). The plinth view (no basemap) stays for the zoomed-out India overview and for the demo. Boundaries: the design draws no land frontiers; a production basemap must render India's boundaries as required for users in India (Survey of India) — legal review before launch.

---

## 3 · Living Industrial Ecosystem — `ScreenEcosystem`

Purpose: HOW the system interacts; home of the signature WASTE → VALUE moment. Work grid `1fr | 340px`.

| Region | Component | Tag | Data / behaviour |
|---|---|---|---|
| Scene | `Scene3D kind="ecosystem"` | R3F · AI | `EcosystemState {phase:99, circular, expanded, renewable}`; `mode` = `simulated` while any lever differs from CURRENT |
| Labels | 9 `SceneLabel`s (+ recycler, Factory B when present) | STATIC · AI | |
| Markers | opportunity on `waste` ("34 t/yr recoverable"), verify on `water`, simulation on `energy` while simulating | AI | |
| Discovery card (right, top) | `DiscoveryCard` opportunity → compact `ConstructionFeed` (pathway search) → `DiscoveryCard` circular → `DiscoveryCard` expansion | STATIC components · AI | the right column always shows the current step of the signature moment |
| What-if | `SimulationPanel` | STATIC component · AI (results) | levers: renewable %, waste recovery %, electricity price; results from `SIMULATION_RESULT`; recommendation flip line |
| Actions | Reset, Enter factory (primary) | STATIC | |

Signature sequence (exact timings in `handoff/interactions.md`): `none` → Explore → `analysing` (~2.6s) → `discovered` → Model as new industrial opportunity → `expanded`.

---

## 4 · Generative Factory Twin — `ScreenFactoryTwin`

Purpose: HOW the factory operates. Work grid `1fr | 300px`.

| Region | Component | Tag | Data / behaviour |
|---|---|---|---|
| Scene | `Scene3D kind="factory"` | R3F · AI | `FactoryState {phase:99, selected, circular}`; click zone → select process; click offcut pile → recovery |
| Process labels | 7 `SceneLabel`s (selected = saffron) | STATIC · AI | |
| Markers | bottleneck on `workforce` (Sewing 96%), opportunity/circular on `offcuts` | AI | |
| Inspector | `ProcessInspector` | STATIC component · AI | six metrics: capacity, utilisation, cost, emissions, waste, bottleneck; resource chips; View evidence / Simulate |
| Contextual card | `DiscoveryCard` bottleneck (when Sewing) or opportunity/circular (otherwise) | AI | |
| Evidence | `EvidenceDrawer` overlay on the scene's right edge | STATIC · AI | opened from Evidence button, inspector, or card |

---

## 5 · Hackathon demo walkthrough — `ScreenDemoWalkthrough`

Purpose: present the story. Full width, no nav. Rows `1fr | auto`.

| Region | Component | Tag | Data / behaviour |
|---|---|---|---|
| Header | `Logo`, eyebrow, `LevelPath` | STATIC | level from the beat |
| Scene | `Scene3D key={kind}` | R3F | remounts when the level changes (map → ecosystem → factory → ecosystem) |
| Labels / markers | per beat | STATIC (scripted) | `handoff/fixtures/demo-walkthrough.json` |
| Caption bar | `.qa-caption` + Back / Autoplay / Next | STATIC | autoplay 3.6s per beat, loops; keyboard ← → and Space |

Demo mode must run fully offline (fixtures only) so a flaky network cannot break the presentation.

---

## Screen states (all spatial screens)

| State | Treatment |
|---|---|
| Loading scene assets | `StateView kind="loading"` centred in the scene cell ("Preparing the industrial model") |
| WebGL unavailable / low power | static reference render from `assets/Scenes/` + all overlays as a list beside it (see `responsive.md`) |
| No scenario | `StateView kind="empty"` → "Start with a mission in the Command Center" |
| Backend error | `StateView kind="error"` with what the result now excludes; completed data stays visible |
| Simulated | scene badge `◎ SIMULATED` (hatched), panel dashed |
