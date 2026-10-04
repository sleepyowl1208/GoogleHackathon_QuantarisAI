# Handoff · 3D / 2.5D asset requirements

Everything in the scenes is **procedural** (built from primitives in code) — no GLTF models are required for V2. The reference implementation is `components/lib/quantaris-scene.js` (Three.js r128); port each builder to an R3F component. Visual targets: `assets/Scenes/*.png`.

Units: 1 world unit ≈ 10 m in the ecosystem, ≈ 2 m in the factory; the map uses 0.62 units per degree of longitude and 0.66 per degree of latitude around (22°N, 82°E).

## Renderer

| Setting | Value |
|---|---|
| Camera | Orthographic; elevation 0.6155 rad (isometric) for ecosystem/factory, 0.74 rad for the map; azimuth 0 with the layout rotated 45° |
| Frustum | half-height = max(zoom, fitW / aspect). zoom: map 7.4 · ecosystem 10.5 · factory 8.4. fitW: map 7.6 · ecosystem 15.5 · factory 11.2 |
| Target | ecosystem/factory: auto-centred on the bounding box of their elements; map (−0.4, 0, 0.3) |
| Colour | sRGB output, ACES filmic tone mapping, exposure 1.05; token colours converted sRGB → linear |
| Lights | hemisphere (sky #ffffff, ground #d9d2c4 / dark #0b1220, 0.75 / 0.55) · key directional #fff6ea 1.05 / 0.8 at (−14, 26, 10), shadows PCFSoft 2048², bias −0.0004, radius 4, ortho shadow box ±30 · fill directional #dfe6ff 0.25 at (16, 10, −12) |
| Antialias | on; DPR capped at 2 |
| Background | transparent; the container shows `surface` |
| Frameloop | on demand when nothing animates; continuous only while flows are visible and the canvas is on-screen |

## Materials (all `MeshStandardMaterial`, colours from tokens, re-read on theme change)

| Material | Token | roughness / metalness | Use |
|---|---|---|---|
| Plinth top | `scene-ground` | 0.82 / 0 | every slab top |
| Plinth sides | `scene-plinth` | 0.82 / 0 | slab sides |
| Building | `scene-building` | 0.82 / 0 | white-model bodies |
| Roof | `scene-roof` | 0.82 / 0 | roofs, stacked goods |
| Glass | `scene-glass` | 0.3–0.35 / 0 | glazing bands, solar panels |
| Steel | `scene-machine` | 0.45 / 0.4 (knitting heads), else 0.82 / 0 | pylons, machine heads, chimneys |
| Field | `scene-field` | 0.82 / 0 | cotton fields — never green |
| Sea | `scene-sea` | 0.25 / 0 | sea strip, map sea |
| Edges | `line-strong` at 22% (light) / 35% (dark) | `LineBasicMaterial` | `EdgesGeometry` threshold 30° on boxes |
| Flow tube | flow token, opacity 0.9 (return water 0.55–0.6, workforce 0.5) | emissive = same colour × 0.15 | |
| Flow packet | flow token | emissive × 0.2 (pulse 0.6) | |
| Focus ring | `saffron-strong` / `green` | opacity 0.9 | `RingGeometry(r×0.86, r, 48)` flat at y 0.03–0.1 |
| Constraint zone | `red` | opacity 0.16 (soft 0.12) | `CircleGeometry` flat |
| Ghost (layer isolation) | all non-flow, non-semantic materials | opacity 0.22, depthWrite off | `state.ghost` |

## Level 2 — ecosystem objects

Layout authored in screen-aligned coordinates (u → right, v → toward viewer) × 1.3 spacing; plinth 40 × 33 × 0.6; sea strip 40 × 6 at v 11.5.

| Object | Anchor / pick id | Geometry | Appears at phase |
|---|---|---|---|
| Cotton farms | `farms` | 4 fields 3.1 × 0.12 × 2.3 with 6 white rows each | 1 |
| Spinning mill (supplier) | `mill` | building 4.2 × 3 × 2.2, 4 sawtooth bays | 2 |
| Tiruppur knit unit | `factory` (+ `cutting` anchor) | building 6.6 × 4.4 × 2.8, 6 bays, chimney; saffron ring r 4.6 | 3 |
| Solar field | `energy` | 24 panels 0.9 × 0.06 × 1.3 tilted −0.45 rad on legs; lit count = renewable share (min 4) | 4 |
| Grid substation | `grid` | 2 pylons 3.4 tall + arm + transformer box | 4 |
| Water recovery | `water` | 3 tanks (r 1 / 0.8 / 0.7, h 1.4) with `flow-water` band | 5 |
| Workforce housing | `workforce` | 6 boxes 1 × (0.8–1.4) × 1 | 6 |
| Warehouse | `warehouse` | flat-roof building 3.4 × 2.4 × 1.6 | 7 |
| Port | `logistics` | 14 containers 1.1 × 0.5 × 0.5 (neutral + blue-2), gantry crane in `ashoka` | 7 |
| Waste yard | `waste` | 7 grey bales 0.62 cube | 8 |
| Mechanical recycling | `recycler` | building 3 × 2.2 × 1.7, 3 bays, green ring r 2.0 | `circular = discovered` |
| Factory B (recycled-yarn mill) | `factoryB` | building 4.4 × 3 × 2.1, 4 bays, green ring r 2.9 | `expanded = true` |

Flows (CatmullRom centripetal, tube radius = r × 1.7, 10 radial segments): material farms→mill→factory; product factory→warehouse→port; grid pylon→factory (pulse); renewable solar→factory (pulse, packet count ∝ share); water treatment→factory and back (drops); workforce homes→factory; waste factory→yard; circular yard→recycler, recycler→mill loop; expansion recycler→Factory B.

## Level 3 — factory twin objects

Floor 26 × 14 × 0.5; back wall 22.6 × 2.6 × 0.3 with a 0.5 glazing band; no roof (cutaway). Zones (4 × 0.08 × 3.6 pads) in a U at v −2.6 and +2.6, pitch 4.6:

| Zone | Anchor | Contents |
|---|---|---|
| Raw materials | `raw` | 9 yarn/fabric rolls (cylinders r 0.38) |
| Knitting | `knitting` | 6 circular knitting machines (steel cylinders + white heads) |
| Dyeing | `dyeing` | 3 horizontal jet-dyeing vessels + `flow-water` bases |
| Cutting | `cutting` | 2 cutting tables + cutter heads |
| Sewing | `sewing` | 12 workstations + machine heads |
| Finishing / QC | `finishing` | 2 tables + pressing stack |
| Product | `product` | 6 pallets |
| Offcut pile | `offcuts` | 5 grey bales outside the cutaway edge |
| Recovery | `recovery` | small sawtooth building (appears on discovery) |

Flows: energy bus along the back wall at y 2.4 with drops to knitting, dyeing, cutting, sewing, finishing; water into dyeing and effluent out; material along the U at y 0.25; waste cutting→pile; circular pile→recovery. Selection ring r 3.1 saffron-strong.

## Level 1 — map objects

| Object | Geometry | Notes |
|---|---|---|
| Plinth | 26 × 26 × 0.7, top = `scene-sea` | the sea |
| Land | `ExtrudeGeometry` depth 0.12 + bevel from coastline polygon (Gujarat → Kanyakumari → Bengal, continuing along the Bay coast), clamped to the plinth edge; islands: Sri Lanka, Andaman, Nicobar, Lakshadweep | no land frontiers anywhere |
| Dot grid | instanced cylinders r 0.045 on a 0.5 grid, land only | `line-strong` at 45% |
| Candidate | box 0.95 wide, height 0.4 + score × 5.2, ink cap; recommended = saffron body + ring r 1.2 | `tiruppur` `surat` `ludhiana` |
| Raw material | octahedron r 0.32, `blue-2` | |
| Cluster | disc r 0.42 h 0.22, `blue` | |
| Port | 3-sided cone, white with blue edges | |
| Renewable park | 4 small green panels | |
| Constraint | translucent red disc r 1.6 / 0.9 | |
| Arcs | quadratic lift 1–5.5 units, tube + 2 pulses | saffron (recommended links), blue-2 (others), green (circular) |

Production: the same objects render inside Google Maps via `WebGLOverlayView`; convert lat/lon with the overlay's `transformer.fromLatLngAltitude`, keep heights in metres scaled for legibility.

## Budgets

| Scene | Draw calls | Triangles | Notes |
|---|---|---|---|
| Map | ≤ 150 | ≤ 60k | instanced dots |
| Ecosystem | ≤ 400 | ≤ 250k | instance repeated panels, bales, containers, homes |
| Factory | ≤ 400 | ≤ 250k | instance machines |

Target 60 fps on a 2020 integrated GPU at 1440 × 900, DPR 2. Fallback to the static renders below that (see `responsive.md`).

## If GLTF is introduced later

Keep white-model style (no textures beyond optional AO), Draco-compressed, ≤ 300 KB per model, origin at ground centre, Y-up, metres; names must match anchor ids.
