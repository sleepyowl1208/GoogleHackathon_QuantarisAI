# Handoff · Implementation plan

## Target stack

| Concern | Choice |
|---|---|
| App | Next.js (App Router) + React + TypeScript (strict) |
| Styling | CSS variables from `handoff/tokens/quantaris-tokens.css`; CSS Modules (or Tailwind with a preset generated from `theme.json`) |
| 3D | three + @react-three/fiber + @react-three/drei |
| Maps | Google Maps Platform — Maps JavaScript API (vector map, `WebGLOverlayView`) via `@googlemaps/js-api-loader` |
| Data | TanStack Query for REST; an SSE client for the run event stream |
| Validation | Zod schemas generated from `handoff/contracts/*.schema.json` (frontend), Pydantic models (backend) |
| Backend | FastAPI + Google ADK agents + Gemini; emits AG-UI-style events; A2UI requests from the catalogue only |
| Tests | Vitest + Testing Library (components), Playwright (e2e + visual snapshots vs `assets/Scenes` and previews) |

## Suggested repository structure

```
apps/web/
  app/
    layout.tsx                  # imports quantaris-tokens.css, fonts, theme provider
    page.tsx                    # Command Center (MissionComposer)
    scenarios/[id]/
      construction/page.tsx     # Screen 1
      map/page.tsx              # Screen 2
      ecosystem/page.tsx        # Screen 3
      factory/page.tsx          # Screen 4
      factory/[processId]/page.tsx
    demo/page.tsx               # Screen 5 (fixtures only, offline)
  components/
    ui/                         # Button, StatusTag, EvidenceTag, MetricTile, ChakraRing, StateView, Logo, AppNav, LevelPath …
    enterprise/                 # MissionComposer, StageRail, ImpactBars, ProcessFlow, CircularityPath, SiteMap, EvidenceDrawer
    ai/                         # DiscoveryMarker, DiscoveryCard, ConstructionFeed, ClarifyCard, SimulationPanel, ProcessInspector, LayerPanel
    a2ui/                       # registry: CapacitySelector … SimulationControls (rendered inside ClarifyCard)
    scene/
      Scene3D.tsx               # Canvas, camera, lights, overlay layer, onPick
      primitives/               # Plinth, Factory, WaterTank, SolarField, Pylon, Port, Bales, Housing, FocusRing, Edges
      flows/                    # FlowPath (tube + instanced packets, grow/visible)
      levels/                   # MapLevel, EcosystemLevel, FactoryLevel (state → objects)
      maps/                     # GoogleMapsOverlay (WebGLOverlayView host for MapLevel)
  lib/
    tokens.ts                   # typed access to theme.json
    events.ts                   # AG-UI event types + reducer (events → screen state)
    a2ui.ts                     # catalogue + validation
  public/brand/                 # assets/Logos/*.svg
  public/scenes/                # assets/Scenes/*.png (fallbacks)
  mocks/                        # handoff/fixtures/*.json served by MSW in dev
services/api/                   # FastAPI + ADK
```

## Milestones and acceptance criteria

| # | Milestone | Done when |
|---|---|---|
| 1 | Tokens + shell | `quantaris-tokens.css` imported; light/dark/system themes switch; AppNav, LevelPath, Button, tags, StateView match previews pixel-for-pixel (±1px) |
| 2 | Enterprise components | all V1 components ported with `index.d.ts` props; Storybook/preview parity |
| 3 | Scene engine | `Scene3D` with the three levels renders `assets/Scenes/*.png` equivalents from the same states (visual diff ≤ 2% at 1600×1000); theme switch recolours without reload; budgets met |
| 4 | Overlays + picking | labels/markers pinned to anchors; picking ids match; keyboard path through overlays |
| 5 | Event pipeline | SSE client + reducer replays `fixtures/agui-demo-run.json` and reproduces Screen 1 end-to-end; A2UI CapacitySelector round-trip; unknown component → `UI_REJECTED` |
| 6 | Screens 2–4 | layouts per `screens.md`; signature moment timings per `interactions.md`; simulation CURRENT/SIMULATED rules |
| 7 | Demo | Screen 5 runs offline from `fixtures/demo-walkthrough.json`, keyboard controls, autoplay |
| 8 | Responsive + fallback | `responsive.md` behaviours; WebGL fallback path tested by disabling WebGL |
| 9 | Google Maps | MapLevel inside `WebGLOverlayView`; styled basemap; boundary compliance reviewed |
| 10 | Accessibility + QA | axe clean; focus rings everywhere; reduced motion honoured; contrast as tokens specify |

## Backend responsibilities (AI-driven state)

- Emit only events defined in `agui-events.schema.json`; validate before sending.
- Every `DISCOVERY` references ≥ 1 evidence id; every evidence item has kind, source and confidence; illustrative data flagged `illustrative:true`.
- Never stream model reasoning; `STEP_FINISHED.result` is a short factual result.
- A2UI: request only catalogued components, version 1; always include an estimate option; respect `blocksSteps`.
- Simulations are deterministic for the same inputs; return `SIMULATION_RESULT` within 1.5s or stream progress.

## Known reference-only parts

- `components/bundle.js` and `quantaris-scene.js` are reference implementations (React 18 UMD, three r128) — port, don't ship.
- Previews run inside the design-system page, which preloads tokens.css, fonts, libraries and the bundle; opened directly from disk they will not render.
- All numbers are illustrative demo data.
