# Spatial intelligence layer

The enterprise layer (metrics, tables, evidence) stays as approved. Above it sits a spatial layer in which QuantarisAI constructs, simulates and evolves an industrial world in front of the person.

> **3D shows what is happening. AI explains what could happen. Simulation calculates what happens. Evidence explains why to trust it.**

## Three levels, one zoom stack

| Level | Surface | Answers | Scene |
|---|---|---|---|
| 1 · Geography | India Industrial Intelligence Map | WHERE should we manufacture? | `Scene3D kind="map"` |
| 2 · Ecosystem | Living Industrial Ecosystem | HOW do suppliers, resources, factories, waste and downstream industries interact? | `Scene3D kind="ecosystem"` |
| 3 · Factory | Generative Factory Twin | HOW does the factory itself operate? | `Scene3D kind="factory"` |

The person moves INDIA › REGION › ECOSYSTEM › FACTORY › PROCESS › EVIDENCE with `LevelPath`. Going down is a camera move into the selected object (600–900ms), never a page swap; EVIDENCE opens the `EvidenceDrawer` over the scene.

## Scene grammar

- **The plinth.** Every scene sits on a slab (`scene-ground` top, `scene-plinth` sides, 0.5–0.7 units thick). It makes a scene read as a model on a table, not a screenshot.
- **White-model architecture.** Buildings and machines are `scene-building` with `scene-roof` roofs, a `scene-glass` glazing band and hairline edges (`line-strong` at 22% in light, 35% in dark). Colour is reserved for meaning.
- **Archetypes.** Factory = sawtooth roof + glazing band (+ chimney for the main unit). Supplier mill = smaller sawtooth. Warehouse = flat roof. Water = tanks with a `flow-water` ring. Energy = solar rows (`scene-glass`) and a grid pylon (`scene-machine`). Port = container stacks + `ashoka` gantry crane beside `scene-sea`. Raw material = striped fields (`scene-field`, never green). Workforce = small housing blocks. Waste = grey bales. Recovery / Factory B = sawtooth buildings on a green ring.
- **Meaning colours in 3D.** Saffron ring under the selected / recommended object (one at a time). Green ring only under validated circular nodes. Red translucent disc for environmental constraints. Everything else white, ink or blue.
- **Camera.** Orthographic isometric (elevation 35.26°, azimuth 45° to the layout); the map uses a steeper 42° so geography reads. Drag rotates ±35°, wheel zooms. No perspective distortion, no fly-throughs.
- **Light.** One warm key light from the upper left with soft 2048px shadows, a cool fill from the right, sky/ground hemisphere light. ACES tone mapping. Dark theme lowers the key and lifts the edges. No bloom, no glow, no fog.
- **Labels.** HTML overlays pinned to named 3D anchors (`SceneLabel`), never text in the 3D scene, so they stay crisp, translatable and accessible.

## Flow grammar

Movement through the system is drawn as tubes with packets that move along them. Packet shape and colour carry the type, so flows read even without colour.

| Flow | Token | Packet | Motion |
|---|---|---|---|
| Material / product | `flow-material` | bale (box) | slow (0.025–0.05 loop/s), in production order |
| Grid electricity | `flow-energy` | pulse (sphere, emissive) | fast (0.11) toward machines |
| Renewable electricity | `flow-renewable` | pulse | fast; share of pulses = renewable % |
| Water in / recovered back | `flow-water` | drop | medium (0.06–0.07); the recovered loop at 55–60% opacity |
| Workforce | `ink-muted` | 3 small boxes | very slow, 50% opacity |
| Waste | `flow-waste` | bale | slow, branching away from its process |
| Circular pathway | `flow-circular` | bale | grows along its path when discovered; thicker tube |

A layer filter isolates one flow and ghosts the buildings to 22% (`state.ghost`), which is how the flow reference images were made.

## India Industrial Intelligence Map

- **A physical map, not a political one.** Land is a raised mass bounded by the coastline; the plinth crops the land to the north, so no land frontier is drawn anywhere. Sri Lanka, the Andaman & Nicobar Islands and Lakshadweep appear as islands. A dot grid marks land only.
- **Places by real coordinates.** Candidate cities are white columns whose height is suitability; the recommended city turns into the saffron column with a ring. Raw materials are blue-2 octahedra, clusters blue discs, ports outlined triangles, renewable parks green panel blocks, constraints red translucent discs.
- **Relationships as arcs.** Supply and export links lift off the ground as arcs with pulses: saffron for the recommended site's links, blue-2 for others, green for a circular link (e.g. Tiruppur offcuts → Panipat recycling).
- **Thirteen layers** via `LayerPanel`: raw materials, suppliers, industrial clusters, workforce, energy, renewable energy, water, logistics, ports, environmental constraints, waste streams, circularity opportunities.
- **Always labelled illustrative** until real data drives it. Production replaces the physical crop with a compliant basemap (see Engineering handoff).

## Living Industrial Ecosystem

Construction order, one element per workflow step: cotton farms → spinning mill (supplier) → Tiruppur knit unit (selected, saffron ring) → energy (solar + grid) → water recovery → workforce → warehouse + port → waste. Then, only when discovered: mechanical recycling (green ring) and the circular loop back to the mill; then, only when modelled: Factory B (recycled-yarn mill) and the expansion link.

## Generative Factory Twin

A cutaway floor (two back walls with clerestory glazing, no roof) with seven process zones in a U: Raw materials → Knitting → Dyeing → Cutting → Sewing → Finishing / QC → Product. An energy bus runs along the back wall and drops to each powered process; water enters Dyeing and effluent leaves to treatment; material moves along the U; offcuts leave Cutting through the side to a bale pile, and, once a pathway is confirmed, travel on to a recovery building along a green path. Selecting a zone raises a saffron ring and opens `ProcessInspector`.
