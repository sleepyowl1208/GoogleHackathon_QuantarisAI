# DiscoveryMarker
The AI discovery layer's pin: a glyph, a colour and a short label placed on the exact object it concerns.

**Provide:** `anchor`, `kind`, optional `label` (≤ 24 chars, a number if there is one), `onClick` (open the `DiscoveryCard`), `active`.

| kind | glyph | colour | use |
|---|---|---|---|
| `opportunity` / `location` / `expansion` | ✦ | saffron | value found, better site, new node |
| `constraint` / `bottleneck` / `risk` | ⚠ ▲ | red | hard limit, capacity choke, environmental risk |
| `simulation` | ◎ | blue | a simulated change is affecting this object |
| `improvement` / `circular` | ↗ ♻ | green | earned gains only |
| `verify` | ? | amber, dashed | an assumption needs a person |
| `changed` | ↻ | blue | the recommendation changed |

- At most 3 markers visible at a level; the rest collapse into the discovery list. Markers arrive once (220ms), never pulse.
