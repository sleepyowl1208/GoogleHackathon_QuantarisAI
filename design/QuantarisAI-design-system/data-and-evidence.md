# Data visualization & evidence

## Charts inherit the semantic palette

| Series | Token | Mark |
|---|---|---|
| Economic opportunity, selected scenario | `viz-opportunity` | solid |
| System / reference data | `viz-system`, then `viz-system-2` | solid |
| Environmental improvement, recovered value | `viz-positive` | solid |
| Degradation, risk, increase of a harm | `viz-risk` | solid + ▲ in labels |
| Assumption ranges | `viz-assumption` | dashed band / dashed line |
| Baseline, business as usual | `viz-baseline` | solid grey, drawn first |

- No rainbow charts. A chart uses the baseline grey plus at most three semantic colours. If you need more categories, use `blue` / `blue-2` and direct labels, not new hues.
- Before/after comparisons: grey baseline beneath the scenario bar (`ImpactBars`). Change labels always print ▼/▲, percentage and absolute value.
- Uncertainty is always visible: P10–P90 as an amber dashed band; never a single bare number from a simulation.
- Axes and gridlines in `line` / `line-strong`; axis text `ink-muted` in `body-sm`; values in `mono`.
- Direct-label series where possible; legends name the shape and line style too.
- Bars use `radius-xs`; no 3D, no gradients, no donut charts for comparisons.

## Evidence language

Every decision-grade number links to the Evidence Drawer. The six kinds have one fixed treatment everywhere (`EvidenceTag`):

| Kind | Glyph | Border | Ink |
|---|---|---|---|
| FACT | ■ | solid | `ink` |
| ASSUMPTION | ◇ | dashed | `amber` |
| CALCULATION | Σ | solid | `blue` |
| INFERENCE | ◐ | dotted | `ink-muted` |
| SIMULATION | ∿ | double | `blue` |
| RECOMMENDATION | → | solid | `saffron-ink` |

- The drawer is neutral: `surface-raised`, `ink`, hairlines. No brand fills, no green — credibility over decoration.
- Show source, method and confidence (five ticks) for every claim. Sources and formulas set in `data` (mono).
- Illustrative or demo sources say so explicitly.
