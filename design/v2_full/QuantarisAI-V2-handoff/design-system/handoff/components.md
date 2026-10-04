# Handoff · Components

25 components + 5 screens. Props contracts: `components/index.d.ts` (port 1:1 to `.tsx`). Usage rules: `components/<Name>/README.md`. Styles: `components/bundle.css` (class prefix `qa-`); port to CSS Modules or Tailwind using only `handoff/tokens/*`. Reference behaviour: `components/bundle.js`.

**Content source** column: *props* = fixed by the screen/copy; *AI* = arrives from the agent/backend (AG-UI events, APIs).

## Enterprise layer (V1, unchanged)

| Component | Layer | Content source | Depends on | Notes |
|---|---|---|---|---|
| `Logo` | STATIC | props | — | inline SVG; spokes drop under 32px; `tone="reverse"` on navy |
| `AppNav` | STATIC | props (+ scenario name AI) | `Logo` | collapses to 64px rail < 1024px |
| `Button` | STATIC | props | — | primary = saffron + navy text; one primary per region |
| `StatusTag` | STATIC | props / AI | — | glyph + colour + word |
| `EvidenceTag` | STATIC | props / AI | — | 6 kinds, mono, never filled |
| `MetricTile` | STATIC | AI | `EvidenceTag` | value pre-formatted (Indian grouping for ₹) |
| `ChakraRing` | STATIC (SVG) | props / AI | — | 24 segments; `spinning` = stepped loader |
| `MissionComposer` | STATIC | user input | `Button` | submits `POST /scenarios` → starts the run |
| `StageRail` | STATIC | AI (current stage) | — | |
| `SiteMap` | STATIC (SVG 2D) | AI | — | V1 2D fallback for the map; keep for reports/PDF |
| `ProcessFlow` | STATIC (HTML) | AI | — | 2D process diagram for reports and small screens |
| `ImpactBars` | STATIC | AI | — | baseline grey + semantic scenario bar |
| `CircularityPath` | STATIC (SVG) | AI | `ChakraRing`, `StatusTag` | 2D fallback of the signature moment |
| `EvidenceDrawer` | STATIC | AI | `EvidenceTag`, `Button` | 380px; overlay on spatial screens |
| `StateView` | STATIC | props / AI | `ChakraRing`, `Button` | loading / empty / error |

## Spatial + AI layer (V2)

| Component | Layer | Content source | Depends on | Notes |
|---|---|---|---|---|
| `Scene3D` | **R3F** (MAPS on map in production) | AI (`scene-state`) | three, R3F, drei, scene kit | declarative `state`; overlays via anchors; `onPick(id)`; `mode`; `motion` |
| `SceneLabel` | STATIC (DOM overlay) | AI | `Scene3D` anchor | drei `<Html>` or projected overlay layer |
| `DiscoveryMarker` | STATIC (DOM overlay) | AI (`DISCOVERY`) | `Scene3D` anchor | 11 kinds; max 3 visible per level |
| `DiscoveryCard` | STATIC | AI (`DISCOVERY`) | `Button`, `EvidenceTag` | first action primary |
| `ConstructionFeed` | STATIC | AI (`STEP_*`) | `ChakraRing` | `aria-live="polite"` |
| `ClarifyCard` | STATIC | AI (`UI_REQUEST`, A2UI) | — | renders only catalogued controls |
| `SimulationPanel` | STATIC | user input + AI (`SIMULATION_RESULT`) | `Button` | debounce lever changes 250ms before calling simulate |
| `LevelPath` | STATIC | router | — | |
| `ProcessInspector` | STATIC | AI | `StatusTag`, `Button` | six fixed metrics |
| `LayerPanel` | STATIC | AI (counts/availability) | — | |

## Screens (compositions — not exported components)

| Screen | Layers | Spec |
|---|---|---|
| `ScreenConstruction` | STATIC + R3F + AI (+A2UI) | `screens.md §1` |
| `ScreenIndiaMap` | STATIC + R3F + MAPS + AI | `screens.md §2` |
| `ScreenEcosystem` | STATIC + R3F + AI | `screens.md §3` |
| `ScreenFactoryTwin` | STATIC + R3F + AI | `screens.md §4` |
| `ScreenDemoWalkthrough` | STATIC + R3F (fixtures only) | `screens.md §5` |

## Porting rules

- Keep prop names and enum values exactly (`kind`, `tone`, `variant`, `state` keys) — backend events use the same vocabulary.
- Keep the `qa-` visual output pixel-equivalent; verify against each `preview.html` and the PNGs in `assets/Scenes/`.
- Every interactive element: visible 2px `focus` ring, keyboard reachable, accessible name.
- No component fetches data itself; screens own data (React Query / server components) and pass props.
- `Scene3D` is client-only (`'use client'`, dynamic import with `ssr:false`), lazy-loaded behind a `StateView` loading state.
