Industrial intelligence for building the next generation of sustainable manufacturing ecosystems — a premium technology product born in Bharat, built for global industry.

QuantarisAI should read as **ambitious, intelligent, precise, industrial, responsible, optimistic, future-oriented, Indian-born and globally relevant** — never bureaucratic, nationalistic, governmental, playful, consumer, cyberpunk, crypto or generic SaaS/AI. The test: a screenshot with no flag in it should still feel like a sophisticated industrial platform from modern India, and would still be credible in Germany, Sweden, Japan, Singapore, the UAE or the US.

## India, abstracted

India is felt through **palette, radial geometry, flow, real industrial geography and typographic hierarchy** — never through literal symbols.

- Never: tricolour stripes, a saffron header + white body + green footer, flag images, a giant Ashoka Chakra behind content, map borders as decoration, "government portal" layouts.
- Saffron, white and green never appear as three equal bands anywhere — on a page, a card, a chart or a slide.
- The Chakra lives only as structure: 24 segments in `ChakraRing`, 24 spokes in the mark, 15° radial pitches in diagrams.

## Logo

Use the files in **Logos**; never redraw the mark. The mark is an open loop (the Q, and a resource cycle) around a 24-spoke hub; a saffron flow tail leaves through the gap and ends in a node — material leaving a system and becoming opportunity.

- Light grounds: `qai-mark.svg`. Navy or dark grounds: `qai-mark-reverse.svg`. One colour: `qai-mark-mono.svg`. 16–31px: `qai-mark-small.svg`. App icon / favicon: `qai-app-icon.svg`.
- In product UI use the `Logo` component (it switches ink by theme and drops spokes under 32px).
- Wordmark: **QuantarisAI** as one word in `display` — "Quantaris" bold, "AI" medium. Never "Quantaris AI", never all caps in running text. The descriptor "INDUSTRIAL INTELLIGENCE" appears only on the Command Center, cover and slides.
- Clear space = ¼ of the mark's height. Never on saffron, never rotated, never green, never with glow or gradient.

## Colour

Every colour means something. If a colour has no meaning on a surface, use a neutral.

| Role | Tokens | Means | Use for |
|---|---|---|---|
| Saffron | `saffron` fill · `saffron-strong` stroke · `saffron-ink` text · `saffron-soft` tint · `on-saffron` | opportunity, action, ambition, primary emphasis | primary button, active stage, selected scenario/site, opportunity series, key node |
| Ashoka blue | `blue`, `blue-2`, `blue-soft`; navy `ashoka`, `nav-surface` | intelligence, system, information, infrastructure | navigation, links, system data, map links, diagrams, AI activity, focus |
| India green | `green`, `green-soft`, `on-green` | success, sustainability, circularity, positive impact | recovered waste, reduced emissions, saved water, renewable energy, viable circular path, validated completion |
| Neutrals | `surface`, `surface-raised`, `surface-sunken`, `line`, `line-strong`, `ink`, `ink-muted`, `ink-subtle` | evidence, clarity, workspace | everything else |
| Amber | `amber`, `amber-soft` | assumption, uncertainty, attention | assumption tags and bands (always dashed / ≈) |
| Red | `red`, `red-soft` | environmental risk, failure, critical constraint | risk tags, worsening impact, errors (always ▲ or !) |
| Grey | `grey` | unavailable, inactive, unknown, baseline | baseline bars, disabled, unknown |

Rules:

- **Saffron is rare.** At most one saffron fill per view region. Text on saffron is always `on-saffron` (navy), never white. Use `saffron-strong` for strokes and marks (3:1), `saffron-ink` for text.
- **Green is earned.** Green appears only when something beneficial has been found or achieved. A "completed" step is blue ✓, not green — unless its outcome was a sustainability gain. Never decorative green.
- **Amber vs saffron:** amber always carries a dashed border or the ≈ glyph; saffron never does.
- **Colour is never alone.** Every state also has a glyph (↗ ◉ ✓ ≈ ▲ ○), a word, a shape or a line style. Green and red are close in lightness, so the glyph/word is mandatory.
- **Workspace is warm white.** Use `surface` (#F7F5F0) as the ground and `surface-raised` (#FFFFFF) for panels — never pure white everywhere.
- Contrast: every text token holds ≥4.5:1 on the grounds named in its usage note in both themes; `line-strong`, `saffron-strong`, `blue-2` hold ≥3:1 as marks. `ink-subtle` is for surface and surface-raised only.

## Typography

Three families, all from Google Fonts: **Archivo** (`display`), **IBM Plex Sans** (`sans`, with IBM Plex Sans Devanagari for Hindi and Indic UI), **IBM Plex Mono** (`mono`).

- `display` (Archivo): brand moments only — Command Center title (`display`), headline metrics (`metric-xl`), scenario titles (`title-1`). Never for body or labels.
- `sans` (Plex Sans): all interface text — `title-2`, `heading`, `body`, `body-sm`, `label`.
- `mono` (Plex Mono): numbers inside tiles (`metric`), coordinates, IDs, formulas, evidence kinds and sources (`data`).
- Figures are tabular (`font-variant-numeric: tabular-nums`). Rupee values use Indian grouping (₹48 crore, ₹3.1 lakh); international exports may use millions.
- `label` is uppercase with 0.08em tracking — eyebrows, stage names, tags. Nothing else is uppercase.
- No futuristic or sci-fi faces; no Inter/Roboto defaults.

## Space, shape, depth

- 4px grid: `space-1`…`space-8` (4 → 64). Panels pad `space-4`; panels sit `space-5` apart; the Command Center breathes at `space-7`/`space-8`.
- Industrial, tight corners: `radius-sm` (4) controls and tags, `radius-md` (6) panels, `radius-lg` (10) only the mission composer and sheets, `radius-full` only for circles (nodes, rings, stage dots). No pills on buttons.
- Depth is quiet: `shadow-1` for raised panels, `shadow-2` for the drawer and composer. Prefer hairlines (`line`) to shadows for structure.

## Visual language: systems, not cards

Show relationships — flows, networks, pipelines, loops, topology, geography — rather than grids of isolated cards.

- Material flows left→right with `blue-2` arrow connectors (`ProcessFlow`). Waste branches downward in dashed grey. A branch proven valuable turns green (`CircularityPath`).
- Radial structures (rings, hub-and-spoke ecosystems) use 15° (24-part) pitches.
- Diagrams are flat: 1px strokes, no 3D, no isometric glow, no particles, no holograms.

## Iconography

- Status glyphs are typographic and fixed: ↗ opportunity · ◉ system · ✓ positive · ≈ assumption · ▲ risk · ○ inactive.
- Evidence glyphs: ■ fact · ◇ assumption · Σ calculation · ◐ inference · ∿ simulation · → recommendation.
- For UI icons use one outline set at 1.5px stroke, 20px grid (e.g. Lucide), inked `ink-muted`, `blue` when interactive. No emoji, no robot heads, brains, sparkles or chat bubbles as AI signifiers.

## Voice

Precise, calm, engineering-grade, optimistic about industry.

- Talk in missions and systems: "Initiate simulation", "Building factory topology", "Viable circular pathway found".
- Numbers always with units and an evidence kind: "312 t / yr recovered · SIMULATION".
- Say what is illustrative: "≈ Illustrative data · not live". Never imply demo data is live government data.
- Sentence case for UI; "QuantarisAI" always one word; "Bharat" and "India" both fine — no slogans, no patriotic phrasing.
- No exclamation marks, no "magic", no "AI-powered" badges.

## Light and dark

Light (`light`) is primary — maps, blueprints, tables and evidence need clarity. Dark (`dark`) uses deep navy/graphite surfaces (`surface` #0B1220), never pure black; accents lighten and text on saffron/green stays dark. Switch with `data-theme="dark"` on the root.

## Focus and accessibility

Every interactive element shows a 2px solid `focus` ring at 2px offset. Respect `prefers-reduced-motion` (all durations drop to 0; loaders stop). Charts and maps carry text alternatives (`aria-label`) and a legend that names shapes.
