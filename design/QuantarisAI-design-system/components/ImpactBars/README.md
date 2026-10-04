# ImpactBars
Economics and environmental impact: each measure as a grey baseline bar over a scenario bar coloured by meaning.

**Provide:** `rows` (`{label, baseline, scenario, unit, better?: lower | higher, tone?}`), optional `baselineLabel`.

- The scenario bar is `viz-positive` when it improves, `viz-risk` when it worsens, `viz-opportunity` for economic upside (set `tone`).
- The change column always prints ▼/▲, the percentage and the absolute value — never colour alone.
- No rainbow: one baseline grey plus at most the three semantic colours.
