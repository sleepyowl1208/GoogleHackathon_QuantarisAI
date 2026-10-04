# Engineering handoff

> The complete V2 implementation package lives in **`handoff/`** — start at `handoff/README.md`. This page is the summary.

Everything in this system is implementable as a web application: Next.js + React + TypeScript, Three.js / React Three Fiber, Google Maps Platform, FastAPI + Google ADK + Gemini, A2UI-style controlled components and AG-UI-style workflow events.

## What ships in this package

| Path | What | Use |
|---|---|---|
| `tokens.json` | all tokens incl. `scene-*`, `flow-*`, `ai`, `simulated` | generate CSS variables / a TS theme |
| `components/bundle.js` · `bundle.css` · `index.d.ts` | reference React components (`window.Quantaris`) | port 1:1 to `.tsx`; props are the contracts |
| `components/lib/quantaris-scene.js` | the reference scene kit (`window.QuantarisScene`) | port builders to R3F components |
| `components/lib/three.min.js` | three.js r128 used by the previews | use current three / R3F in product |
| `components/Screen*/preview.html` | five interactive screens | behaviour reference |
| `assets/Scenes/*.png` | 2× reference renders (light + dark) | visual targets for QA |

## Scene kit → React Three Fiber

| Kit builder | R3F component | Notes |
|---|---|---|
| `Stage` | `<Canvas orthographic shadows dpr={[1,2]} gl={{ toneMapping: ACESFilmic }}>` + `<OrthographicCamera>` | elevation 0.6155 rad, azimuth 45°; `fitW` keeps width in narrow panels |
| hemisphere + key + fill lights | `<hemisphereLight>` `<directionalLight castShadow shadow-mapSize={2048}>` | key at (−14, 26, 10) |
| `slab` | `<Plinth>` | two materials: top / sides |
| `building({sawtooth, chimney})` | `<Factory variant>` | extruded triangle roof bays + glazing plane per bay |
| `tank`, solar rows, pylon, port | `<WaterTank>` `<SolarField share>` `<Pylon>` `<Port>` | use `<Instances>` for repeated parts |
| `edges` | `<Edges threshold={30} opacity={.22}>` (drei) | |
| `Flow` | `<FlowPath points type grow visible>` | `TubeGeometry` + `drawRange` for growth; packets as `InstancedMesh`, positions from `curve.getPoint` in `useFrame` |
| `Appear` | `<Materialise on>` | scale-Y 0 → 1, ease-in-out-cubic, ≈ 0.6s |
| `ring` | `<FocusRing tone>` | saffron = selected, green = validated |
| `anchor` + `placeOverlays` | drei `<Html>` or a projected overlay layer | keep labels as DOM for a11y/i18n |
| `ghost` | material opacity 0.22, `depthWrite=false` | layer isolation |
| `settle` | skip transitions | use for reduced motion and screenshot tests |

Performance budget: ≤ 400 draw calls, ≤ 250k triangles per scene, instancing for repeated parts, render-on-demand when no flow is active (`frameloop="demand"`), pause flows off-screen, cap DPR at 2.

## Map in production

- Host the 3D layer on **Google Maps Platform** using the Maps JavaScript API's `WebGLOverlayView` (or deck.gl's Google Maps overlay) so candidate columns, arcs and markers render in the map's own camera; style the basemap to the neutral palette (`scene-ground` land, `scene-sea` water, labels `ink-muted`, roads off).
- **Boundaries:** the design's physical crop draws no land frontiers. Production must use a basemap that renders India's boundaries as required for Indian users (Survey of India) — configure region/language for India and have this reviewed before launch.
- Keep the plinth treatment for the zoomed-out India view; switch to the live basemap below region zoom.

## State contracts

```ts
type MapState = { phase: 0|1|2|3|4|5; layers?: LayerId[]; scores?: Record<SiteId, number>; recommended?: SiteId; circular?: boolean };
type EcosystemState = { phase: number; circular?: 'none'|'analysing'|'discovered'; expanded?: boolean; renewable?: number; layers?: FlowLayer[]; ghost?: boolean; selected?: boolean };
type FactoryState = { phase: number; selected?: ProcessId; circular?: 'none'|'analysing'|'discovered' };
type ProcessId = 'raw'|'knitting'|'dyeing'|'cutting'|'sewing'|'finishing'|'product';
```

Anchor ids (for overlays and `onPick`): map — site ids (`tiruppur`, `surat`, `ludhiana`, …); ecosystem — `farms mill factory cutting energy grid water workforce warehouse logistics waste recycler factoryB`; factory — process ids + `offcuts recovery workforce`.

## Workflow events (AG-UI style)

```json
{ "type": "STEP_STARTED", "runId": "r_8f2", "step": "compare_locations", "label": "Comparing locations" }
{ "type": "STEP_FINISHED", "runId": "r_8f2", "step": "compare_locations", "result": "Tiruppur 0.86 · Surat 0.71 · Ludhiana 0.58",
  "scene": { "level": "map", "patch": { "phase": 3, "scores": { "tiruppur": 0.86, "surat": 0.71, "ludhiana": 0.58 } } } }
{ "type": "DISCOVERY", "kind": "opportunity", "anchor": "waste", "metric": 34, "unit": "t/yr",
  "title": "Recoverable cotton offcuts at Cutting", "evidence": ["ev_311", "ev_312"], "confidence": 0.72 }
{ "type": "UI_REQUEST", "component": "CapacitySelector", "version": 1, "reason": "Production capacity materially changes factory topology.",
  "props": { "options": ["100k", "500k", "1m", "custom", "auto"] } }
```

The frontend applies `scene.patch` to the level's state; discoveries become markers; `UI_REQUEST` renders only catalogued components (reject unknown names); the person's answer returns as `UI_RESPONSE`.

## A2UI catalogue (v1)

| Component | Props | Returns |
|---|---|---|
| `CapacitySelector` | options[], default | `{ unitsPerYear } \| { estimate: true }` |
| `RegionSelector` | regions[], multi | `{ regionIds[] }` |
| `MaterialSelector` | materials[] | `{ materialId, blend? }` |
| `ConstraintSelector` | constraints[] | `{ constraintIds[], limits }` |
| `PrioritySelector` | priorities[] (cost, carbon, water, speed, circularity) | `{ ranking[] }` |
| `ScenarioComparison` | scenarioIds[] | `{ chosenId }` |
| `SimulationControls` | levers[] with min/max/current | `{ values }` |

All requests render inside `ClarifyCard`; every one includes "Let Quantaris estimate".

## Accessibility & motion

- Scenes have an `aria-label` and a text summary; every interactive object is also reachable through the side panels (lists, tables) — the 3D is never the only way in.
- `prefers-reduced-motion`: flows freeze, elements appear instantly (`settle`), camera cuts instead of moving.
- Colour is never alone: flows differ by packet shape, markers by glyph, rings by label.

## Illustrative data

All demo numbers (34 t/yr offcuts, ₹27 lakh/yr, suitability scores, 1,450 ML water, etc.) are illustrative and labelled "≈ Illustrative model · not live data". Replace with sourced values before external use.
