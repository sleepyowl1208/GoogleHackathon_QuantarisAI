# AGENTS.md — QuantarisAI V2

You are implementing QuantarisAI V2 from an approved, final design. **Do not redesign.** Build exactly what is specified; when something is unspecified, follow the brand book and reference components — never invent colours, components or behaviours.

## Start here
1. `design-system/handoff/README.md` — scope, layer legend, file map, non-negotiables.
2. `design-system/handoff/implementation-plan.md` — stack, repo layout, milestones with acceptance criteria. Work milestone by milestone.
3. Specs: `handoff/screens.md`, `handoff/components.md`, `handoff/interactions.md`, `handoff/3d-asset-requirements.md`, `handoff/responsive.md`, `motion.md`.
4. Contracts (validate against them in code and tests): `handoff/contracts/a2ui.schema.json`, `agui-events.schema.json`, `scene-state.schema.json`.
5. Fixtures for mocks and tests: `handoff/fixtures/*.json`.
6. Visual overview: `QuantarisAI-Design-System-V2.pdf`; visual targets: `design-system/assets/Scenes/*.png`.

## Layer legend
STATIC = React/TS/CSS · R3F = Three.js via React Three Fiber · MAPS = Google Maps Platform (WebGLOverlayView) · AI = runtime state from the backend (AG-UI events, A2UI requests).

## Rules
- Tokens only from `design-system/tokens.json` / `handoff/tokens/*`. No hard-coded colours.
- Port `components/index.d.ts` props 1:1 (names and enum values are shared with backend events).
- `components/bundle.js` and `components/lib/quantaris-scene.js` are reference implementations: port them, do not ship them.
- `preview.html` files run only inside the design-system page (it preloads tokens, fonts, libraries); use them and the PNG renders as visual references.
- Never render agent-generated markup or code; A2UI = catalogued components only. Never stream model reasoning to the UI.
- Colour is never the only signal; green only for validated positive outcomes; every actionable number links to evidence.
- Demo data is illustrative — keep the "≈ Illustrative model · not live data" label.
- India map: no hand-drawn land frontiers; production basemap must render India's boundaries as required for users in India (flag for legal review).

## Definition of done per milestone
Acceptance criteria in `implementation-plan.md`; visual parity with previews/renders; schemas validated; axe clean; reduced motion honoured.
