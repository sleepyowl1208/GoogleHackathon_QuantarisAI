# Scene3D
Mounts one level of the spatial layer — `map` (WHERE), `ecosystem` (HOW the system interacts) or `factory` (HOW the factory operates) — and pins React overlays to named 3D anchors.

**Provide:** `kind` (`map` | `ecosystem` | `factory`), `state` (see below), `height`, optional `onPick(id)`, `mode` (`current` | `simulated`), `motion` (`live` | `paused`), `label`, children (`SceneLabel`, `DiscoveryMarker`, `DiscoveryCard` with an `anchor`). Needs the `three` and `quantaris-scene` libraries (both shipped in `components/lib/`).

State per level:
- `map`: `{phase 0–5, layers[], scores{}, recommended, circular}` — 1 clusters/raw/ports emerge · 2 candidates appear · 3 compare (columns rise by score) · 4 recommend (saffron column + ring) · 5 supply links.
- `ecosystem`: `{phase 0–8, circular: none|analysing|discovered, expanded, renewable 0–1, layers[], selected}` — elements materialise in order farms → mill → factory → energy → water → workforce → logistics → waste.
- `factory`: `{phase 0–8, selected: processId, circular}` — zones build in process order, then resources, material flow and waste.

- Drag rotates ±35°, wheel zooms; clicking a building/zone calls `onPick` with its id (the anchor names).
- White-model architecture on a plinth; colour only where it means something (saffron = selected, green = earned, red = risk).
- Always keeps the "≈ Illustrative model · not live data" note unless the data is real.
- Respects reduced motion (flows freeze, elements appear instantly).
