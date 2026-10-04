# Handoff · Interactions

Every interaction: trigger → visible result → event/API. Timings come from `handoff/tokens/motion.json`. Under `prefers-reduced-motion` all transitions settle instantly and camera moves become cuts.

## Global

| Trigger | Result | Event / API |
|---|---|---|
| Submit mission (`MissionComposer`) | navigate to Construction; feed and scene start | `POST /api/scenarios` → `RUN_STARTED` stream (SSE `GET /api/runs/{runId}/events`) |
| `LevelPath` click (lower level) | camera dives into the selected object 600–900ms, route changes | client only |
| `LevelPath` click (higher level) | camera rises, route changes | client only |
| Any "View evidence" / Σ | `EvidenceDrawer` slides in from the right (220ms); the related object keeps its saffron ring | `GET /api/evidence?subject={id}` (or `EVIDENCE` event cache) |
| Esc | closes the drawer / dismisses the top card | client |
| Theme | `data-theme="light|dark"` on `<html>`; scenes re-read tokens (no reload) | client |

## Scene (all levels)

| Trigger | Result | Notes |
|---|---|---|
| Drag | orbit azimuth ±35° around the layout's 45° | no elevation change, no pan |
| Wheel / pinch | zoom 5–24 units (orthographic) | |
| Hover object | cursor pointer on pickable objects | |
| Click object | `onPick(id)` → select (saffron ring + label) | ids = anchors in `scene-state.schema.json` |
| Keyboard | Tab moves through labels/markers (DOM overlays); Enter = click | 3D is never the only route: every object also exists in a side list/panel |
| State change | elements materialise (scale-Y 0→1, 600ms ease-in-out-cubic); flows grow, then packets start | declarative — set state, never mutate meshes |

## Construction (screen 1)

| Trigger | Result | Event |
|---|---|---|
| `STEP_STARTED` | feed row turns active with stepping ChakraRing | |
| `STEP_FINISHED` | row ✓ with mono result; apply `scene.patch` | `camera:"dive"` on `construct_factory` |
| `UI_REQUEST` | `ClarifyCard` appears over the scene top-left; only `blocksSteps` wait | |
| Option chosen | card closes; run continues | client → `POST /api/runs/{runId}/ui-response` `UI_RESPONSE` |
| "Let Quantaris estimate" | same, with `estimate:true`; agent stores an ASSUMPTION | |
| `DISCOVERY` | marker arrives on its anchor (220ms rise + fade, once) | |
| `RUN_FINISHED` | status tag "Scenario ready"; expansion card if offered | |

## Map (screen 2)

| Trigger | Result | Event |
|---|---|---|
| Toggle layer | layer elements appear/disappear (materialise) | `MapState.layers` |
| Click candidate column or comparison card | selects it: saffron column + ring, card border, title; arcs re-route | client; `recommended` stays the AI's recommendation, selection is the person's |
| "Enter … ecosystem" | camera dive to ecosystem of the selected site | route |

## Signature moment (screen 3)

| Step | Trigger | Visible result | Timing | Event |
|---|---|---|---|---|
| 0 | `DISCOVERY` opportunity on `waste` | ✦ "34 t/yr recoverable" marker; opportunity card in the right column | 220ms arrive | |
| 1 | click marker or "Explore opportunity" | marker → ◎ "Searching pathways…"; compact feed (characterise → match technology → find consumers → test economics); blue searching path from the pile | ≈ 2.6s | `POST /api/discoveries/{id}/explore` → `STEP_*` + `SCENE_PATCH {circular:"analysing"}` |
| 2 | `DISCOVERY` circular | path solid green, grows pile → recycler (1.4s); recycler rises on green ring; loop back to the mill grows; card turns circular (₹27 lakh / yr) | 1.4s grow, steps 150ms stagger | `SCENE_PATCH {circular:"discovered"}` |
| 3 | "Model as new industrial opportunity" | Factory B rises on its green ring; expansion link grows; card "Ecosystem expanded" | 600ms + 1.4s | `POST /api/opportunities` → `SCENE_PATCH {expanded:true}` |

Green never appears before step 2.

## What-if (screen 3; same panel anywhere)

| Trigger | Result | Event |
|---|---|---|
| Move a lever | value shows `current → simulated`; panel dashed; scene badge `◎ SIMULATED`; scene reacts (e.g. renewable share lights solar rows and swaps pulse colours) | debounce 250ms → `POST /api/simulations` → `SIMULATION_RESULT` |
| Result arrives | result rows ▼/▲ coloured by meaning; recommendation flip line (↻, saffron-soft) | |
| Reset | back to CURRENT; badge returns to ● CURRENT | client |
| Apply (product) | simulated values become CURRENT; new evidence version | `POST /api/scenarios/{id}/apply` |

## Factory twin (screen 4)

| Trigger | Result | Event |
|---|---|---|
| Click a zone | saffron ring on the zone, label selected, inspector updates, LevelPath → PROCESS | `GET /api/scenarios/{id}/processes/{processId}` |
| Click bottleneck marker | selects Sewing; bottleneck card | |
| Click offcut pile / Explore | recovery building rises; green path pile → recovery | as signature step 1–2 |
| Inspector "View evidence" | drawer over the twin | |
| Inspector "Simulate" | opens `SimulationPanel` scoped to the process (machine capacity, lines) | |

## Demo (screen 5)

| Trigger | Result |
|---|---|
| Next / → | next beat (scene state, labels, markers, caption) |
| Back / ← | previous beat |
| Autoplay / Space | 3.6s per beat, loops |
| Level change between beats | scene remounts for the new level (map ↔ ecosystem ↔ factory) |
