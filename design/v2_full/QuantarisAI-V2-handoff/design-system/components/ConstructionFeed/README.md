# ConstructionFeed
The visible construction of a scenario: application workflow states streamed as events (AG-UI style) while the scene materialises beside it.

**Provide:** `steps` (`{label, detail?, result?}`), `current` (index of the running step), optional `compact`.

- These are product workflow states with results, never the model's private reasoning. Each step maps to one scene change (see `ai-native-interaction`).
- Done steps keep a one-line mono result ("14 clusters") so the run reads as an audit trail.
- The running step uses the stepping `ChakraRing`, blue (`ai`). No percentages unless real.
