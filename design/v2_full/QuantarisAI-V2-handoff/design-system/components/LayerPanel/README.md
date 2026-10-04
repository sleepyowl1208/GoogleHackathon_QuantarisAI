# LayerPanel
Toggles the layers of the India Industrial Intelligence Map and the ecosystem.

**Provide:** `layers` (`{id, label, glyph, swatch, count?, disabled?}`), `active` (ids), `onToggle(id)`, optional `title`.

- Thirteen layers in this order: raw materials, suppliers, industrial clusters, workforce, energy, renewable energy, water, logistics, ports, environmental constraints, waste streams, circularity opportunities.
- Every layer has a glyph and a shape in the scene; colours follow the semantic system. Disabled = data not yet available for this scenario.
