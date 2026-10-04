# MetricTile
A headline industrial number with its unit, change and evidence kind.

**Provide:** `label`, `value` (pre-formatted string, Indian grouping for ₹: lakh/crore), `unit`, optional `delta` + `deltaTone` (`positive` | `risk` | `opportunity` | `neutral`), `deltaArrow`, `note`, `evidence` (an EvidenceTag kind).

- The value is set in `metric-xl` (display face, tabular figures); units in `ink-muted` sans.
- `deltaTone` follows meaning, not direction: lower emissions is `positive` ▼, higher water draw is `risk` ▲.
- Every tile that feeds a decision carries an `evidence` kind.
