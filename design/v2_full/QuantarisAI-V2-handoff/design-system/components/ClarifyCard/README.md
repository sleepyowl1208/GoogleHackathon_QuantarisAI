# ClarifyCard
A2UI clarification: when the agent needs a decision, it asks for an APPROVED control from this catalogue — not free chat, never generated UI.

**Provide:** `control` (catalogue name), `reason` (why it matters, one sentence), `question`, `options` (`{value, label, hint?, estimate?}`), `value`, `onSelect(value)`, optional `footnote`.

- Catalogue: `CapacitySelector`, `RegionSelector`, `MaterialSelector`, `ConstraintSelector`, `PrioritySelector`, `ScenarioComparison`, `SimulationControls`. Contracts in `engineering-handoff`.
- Always offer "Let Quantaris estimate" (dashed, blue) — the agent then states its estimate as an ASSUMPTION.
- The selected option is the saffron action state. The card appears beside the construction feed and pauses only the dependent steps.
