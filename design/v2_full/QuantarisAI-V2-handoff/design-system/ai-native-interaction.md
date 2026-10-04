# AI-native interaction

QuantarisAI does not behave like "ask → answer → finished". It constructs visibly, discovers proactively, asks for decisions through approved controls, and lets people simulate — with evidence behind everything.

## 1 · Visible construction

The `ConstructionFeed` streams application workflow states (never private model reasoning). Each state drives exactly one scene change:

| # | Workflow state | Result line (example) | Scene event |
|---|---|---|---|
| 1 | Understanding industrial ambition | 1.0M cotton T-shirts / yr · India | map plinth appears |
| 2 | Identifying materials | cotton 30s yarn · reactive dyes · trims | raw-material markers emerge (+ `CapacitySelector` if missing) |
| 3 | Mapping production processes | 7 stages | — (feeds the twin) |
| 4 | Discovering industrial clusters | 14 clusters · 3 shortlisted | candidate columns appear |
| 5 | Comparing locations | Tiruppur 0.86 · Surat 0.71 · Ludhiana 0.58 | columns rise by score; constraints surface |
| 6 | Constructing factory | 6 lines · 2,140 people | recommended column → camera dives into the ecosystem; factory materialises |
| 7 | Calculating economics | ₹48 cr capex · 3.6 yr payback | energy and water connect |
| 8 | Simulating environmental impact | 6.1 kt CO₂e | `improvement` marker on energy |
| 9 | Detecting waste | cutting offcuts 34 t / yr | waste branch + `opportunity` marker |
| 10 | Searching circular pathways | 1 viable of 4 | blue dashed path searches |
| 11 | Discovering industrial opportunities | recycled-yarn mill | green path; expansion card |

Timing: 1.2–1.8s per state in demos; real runs advance on real events. A step waiting on the person pauses only the steps that depend on it.

## 2 · Proactive discovery

Discoveries appear where they matter — a `DiscoveryMarker` on the object — and open a `DiscoveryCard`.

States: OPPORTUNITY DISCOVERED (✦) · CONSTRAINT DETECTED (⚠) · BOTTLENECK DETECTED (⚠) · CIRCULAR PATHWAY DISCOVERED (♻) · ASSUMPTION REQUIRES VERIFICATION (?) · ENVIRONMENTAL RISK DETECTED (▲) · BETTER LOCATION DISCOVERED (✦) · NEW INDUSTRIAL OPPORTUNITY DISCOVERED (✦) · RECOMMENDATION CHANGED (↻) · SIMULATION (◎) · IMPROVEMENT (↗).

Rules:
- Max three markers visible per level; others go to the discovery list. Arrive once (220ms rise), never pulse or loop.
- Every discovery names a number when there is one ("34 t/yr recoverable"), carries evidence kinds and a confidence, and has one primary action.
- Discoveries can come from background agents after the run; they arrive as markers, not modals.

## 3 · The signature moment — WASTE → VALUE

1. **Liability.** Offcuts leave Cutting as a grey waste branch to a bale pile. Marker: ✦ "34 t/yr recoverable".
2. **Explore.** The person selects *Explore opportunity*. The marker becomes ◎ "Searching pathways…"; a compact feed shows characterise → match technology → find consumers → test economics; a blue dashed path searches from the pile (≈ 2.5s).
3. **Discovered.** The path turns solid `flow-circular` and **grows** from the pile to the recycler (≈ 1.4s, `--qa-ease-flow`); the recycler rises on its green ring; the loop back to the spinning mill grows; the card turns green: "Circular pathway discovered · ₹27 lakh / yr".
4. **Expansion.** *Model as new industrial opportunity* raises Factory B (recycled-yarn mill) on its own green ring and grows the link to it. The ecosystem has grown from factory → cluster.

Green is earned: nothing turns green before step 3, and only what the pathway touches turns green.

## 4 · Ecosystem expansion

Any discovered secondary material with a consumer can be modelled as a new node: Factory A → waste → recovery → secondary material → Factory B. Factory B becomes a first-class object (enterable, inspectable, simulable). Repeat to grow factory → cluster → ecosystem.

## 5 · What-if simulation

- Levers: production volume, raw-material cost, electricity price, renewable %, water availability, workforce cost, transport distance, machine capacity, recycling %, waste recovery.
- The moment a lever moves, the scene and panel switch to SIMULATED: hatched `◎ SIMULATED` badge on the scene, dashed panel border, ghost tick at the CURRENT value, struck-through current numbers.
- The scene reacts: renewable 30 → 70% lights more solar rows and replaces blue grid pulses with green ones; volume changes line count in the twin; recovery % thickens the circular path.
- Results list current → simulated with ▼/▲; when the recommendation flips, one ↻ line on `saffron-soft`. *Apply* makes it CURRENT; *Reset* returns.

## 6 · A2UI clarification

When the agent needs a decision, it requests a control from the approved catalogue (`ClarifyCard`): `CapacitySelector`, `RegionSelector`, `MaterialSelector`, `ConstraintSelector`, `PrioritySelector`, `ScenarioComparison`, `SimulationControls`. It states why the decision matters in one sentence and always offers "Let Quantaris estimate" (which then becomes an ASSUMPTION). Agents never generate arbitrary UI or executable code.

## 7 · Evidence from the scene

Every marker, label value and inspector metric opens the `EvidenceDrawer` for that number: FACT, ASSUMPTION, CALCULATION, INFERENCE, SIMULATION, RECOMMENDATION with confidence and source. The drawer slides over the scene's right edge; the scene stays visible and the related object keeps its saffron ring.
