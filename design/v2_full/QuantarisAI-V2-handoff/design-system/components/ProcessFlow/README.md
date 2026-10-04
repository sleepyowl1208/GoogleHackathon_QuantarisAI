# ProcessFlow
The Factory Blueprint topology: a horizontal production chain with an optional waste branch dropping from any stage.

**Provide:** `nodes` (`{id, label, meta?, tone?: current | waste | positive | risk}`), optional `branch` (`{from: nodeId, nodes: [...]}`), `label`.

- Connectors are `blue-2` arrows (material moving through the system); the waste branch is grey until it is proven valuable.
- One `current` node (saffron) = what the workspace is focused on.
- A branch node becomes `positive` only when its value is validated — this is the static form of `CircularityPath`.
- Keep `meta` in mono, with units.
