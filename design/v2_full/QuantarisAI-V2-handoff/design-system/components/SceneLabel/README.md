# SceneLabel
A quiet name tag pinned above a 3D anchor; the label sits on its anchor's bottom-centre.

**Provide:** `anchor` (an anchor id from the scene), children (name), optional `meta` (one mono line: unit, role), `tone` (`selected` | `positive` | `muted`).

- One label per meaningful object. Never label decoration.
- `selected` (saffron) for the one object in focus; `positive` only for validated circular nodes.
