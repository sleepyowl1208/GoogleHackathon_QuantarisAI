# ProcessInspector
The panel for a selected process in the Generative Factory Twin.

**Provide:** `process` (`{label, stage, status?: {tone, label}, metrics: [{label, value, unit?, bar?, tone?}], resources: [{kind: material | energy | renewable | water | waste, label}]}`), `onEvidence`, `onSimulate`, optional children.

- Always the same six metrics in this order: capacity, utilisation, cost, emissions, waste, bottleneck.
- `tone: risk` on a metric when it is the binding constraint (e.g. Sewing utilisation 96%).
- Resource chips reuse the flow grammar colours, so the panel and the scene agree.
