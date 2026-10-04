# DiscoveryCard
What a proactive discovery says when opened: the kind, the number, one-sentence meaning, evidence kinds and the next action.

**Provide:** `kind` (as `DiscoveryMarker`), `metric` + `unit`, `title`, `body`, `evidence` (kinds), `confidence` (0–1), `actions` (`{label, icon?, variant?, onClick}`; the first is primary), optional `eyebrow`, `onDismiss`, `anchor` (to float it beside its object).

- One primary action, verb first: "Explore opportunity", "Model as new industrial opportunity", "Provide value".
- Every card carries evidence kinds and a "View evidence" route into `EvidenceDrawer`. No discovery without evidence.
- Titles state the fact, not excitement. No exclamation marks.
