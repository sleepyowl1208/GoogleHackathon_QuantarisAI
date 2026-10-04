# Implementation handoff (V2) — start here

This folder is the implementation contract for QuantarisAI V2. The design is final: build it, don't redesign it. Where something is not specified here, follow the brand book (`README.md`) and the reference components; never invent new colours, components or behaviours.

## Read in this order

1. `handoff/README.md` — this file: scope, legend, file map.
2. `handoff/implementation-plan.md` — target stack, app structure, milestones, acceptance criteria.
3. `handoff/screens.md` — every V2 screen: layout, regions, components, data, layer classification, states.
4. `handoff/components.md` — all 25 components and 5 screens: layer, props contract, dependencies, notes.
5. `handoff/interactions.md` — every interaction: trigger → result → event, keyboard, focus.
6. `handoff/3d-asset-requirements.md` — what Three.js / R3F must build, budgets, materials, anchors.
7. `handoff/responsive.md` — breakpoints and per-screen behaviour, WebGL fallback.
8. `motion.md` + `handoff/tokens/motion.json` — motion spec.
9. `handoff/contracts/*.schema.json` — A2UI, AG-UI events, scene state (JSON Schema 2020-12).
10. `handoff/fixtures/*.json` — demo data and an example event stream that reproduce the screens exactly.
11. Brand and rules: `README.md`, `spatial-intelligence.md`, `ai-native-interaction.md`, `data-and-evidence.md`, `product-surfaces.md`, `engineering-handoff.md`.

## Layer legend (used in every handoff file)

| Tag | Meaning | Built with |
|---|---|---|
| **STATIC** | Static UI: layout, chrome, components whose content is fixed or comes from props/copy | React + TypeScript + CSS variables (`handoff/tokens/quantaris-tokens.css`) |
| **R3F** | 3D / 2.5D spatial rendering | Three.js via React Three Fiber (+ drei) |
| **MAPS** | Live geographic basemap | Google Maps Platform — Maps JavaScript API with `WebGLOverlayView` (or deck.gl `GoogleMapsOverlay`) |
| **AI** | Content or state produced by the agent/backend at runtime | FastAPI + Google ADK + Gemini → AG-UI-style event stream; A2UI requests |

Most surfaces combine tags — e.g. a `DiscoveryCard` is STATIC as a component but its content is AI. Each screen in `screens.md` lists the tag for every region.

## File map

| Path | What | Consumer |
|---|---|---|
| `tokens.json` | source of truth for all tokens | build step |
| `handoff/tokens/quantaris-tokens.css` | generated CSS variables (light, dark, system dark), spacing, radius, z-index, fonts, motion, `.type-*` classes | import once in `app/layout.tsx` |
| `handoff/tokens/theme.json` | resolved per-theme values, usage notes, type scale, breakpoints | TS theme, Tailwind preset, R3F materials |
| `handoff/tokens/motion.json` | easing, durations, flow speeds, reduced-motion rules | motion utilities, `useFrame` |
| `components/index.d.ts` | props contracts for all 25 components | port to `.tsx` 1:1 |
| `components/bundle.js` + `bundle.css` | reference implementation (React 18, no build) | behaviour + style reference |
| `components/<Name>/README.md` | usage rules per component | |
| `components/<Name>/preview.html` | live reference (runs inside the design-system page) | visual QA |
| `components/Screen*/` | the five V2 screens as interactive references | visual + behaviour QA |
| `components/lib/quantaris-scene.js` | reference scene kit (procedural Three.js r128) | port builders to R3F components |
| `assets/Logos/*.svg` (uploads) | marks, app icon | `public/brand/` |
| `assets/Scenes/*.png` (uploads) | 15 reference renders, 3200×2000 | visual targets + WebGL fallback images |
| `handoff/contracts/` | `a2ui.schema.json`, `agui-events.schema.json`, `scene-state.schema.json` | backend + frontend validation |
| `handoff/fixtures/` | `scenario-tshirt-1m.json`, `agui-demo-run.json`, `demo-walkthrough.json` | mock server, Storybook, e2e tests |

Uploads (SVG, PNG) are served by the design-system artifact by id (see `design-system.json → assetGroups`). The exported zip contains them as files under `assets/`.

## Non-negotiables

- Token names and values exactly as in `tokens.json`; no hard-coded colours except inside generated token files.
- Colour is never the only signal: keep every glyph, label, dash style and packet shape.
- Green appears only for validated positive outcomes (circular pathway, recovered value, renewable share, improvements).
- Every number a person can act on links to evidence (`EvidenceDrawer`).
- AI never generates UI or code: only catalogued A2UI components (`contracts/a2ui.schema.json`).
- Workflow events are application states with results, never model chain-of-thought.
- Demo data stays labelled "≈ Illustrative model · not live data" until real data replaces it.
- India's map: the design draws no land frontiers; production basemaps must render boundaries as required for India (see `screens.md › India Industrial Intelligence Map`).
