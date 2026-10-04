# Product surfaces

How the system is applied on each surface. Workflows and information architecture come from PRODUCT_DESIGN.md; this section only sets the visual treatment.

## Shell & navigation

`AppNav` on the left in `nav-surface`; workspace on `surface`; panels on `surface-raised`. The Evidence Drawer slides in from the right over the workspace (`z-drawer`). Navigation order mirrors the scenario stages.

## Command Center

The brand moment — no marketing hero.

- Centred column, max 760px: `Logo` at 40px with descriptor "INDUSTRIAL INTELLIGENCE", `space-7` gap, then the `MissionComposer`.
- Example mission: "Design a sustainable manufacturing ecosystem for 1 million cotton T-shirts annually in India."
- Blue establishes the system layer (eyebrow dot, parameter chips); the saffron "Initiate simulation" is the single accent.
- Below: recent scenarios as a quiet list (title-1 name, `StageRail` thumbnail, last updated). No stock imagery.

## Scenario Workspace

The strongest expression of the brand. `StageRail` pinned at the top: Ambition → Location → Factory → Economics → Environment → Waste → Circularity → Next opportunity. The current stage is the only saffron; system relationships are blue; green appears only when a positive sustainability or circularity outcome is found. Metrics sit as a single row of `MetricTile`s, each with an evidence kind.

## Location Intelligence

`SiteMap` large, comparison table beside it. Layers (raw materials, suppliers, workforce, energy, water, logistics, factories, ports, clusters, environmental constraints) toggle as a list; each layer is a shape + blue/ink, never a new hue. Water stress or protected zones are `risk` markers with labels. Always the "≈ Illustrative data · not live" caption for demo data. No borders, no state fills.

## Factory Blueprint

`ProcessFlow` across the top (Cotton → Spinning → Fabric → Cutting → Garment → Product), utilities (energy, water) as thin parallel lanes below in `blue-2`, the waste branch dropping in dashed grey. Node meta in mono with units.

## Economics / Environmental Impact

`MetricTile` row (capex, opex, margin, payback in saffron-ink when upside) + `ImpactBars` for emissions, water, waste, energy. Environmental improvements green ▼, worsening red ▲, baseline grey. Assumption ranges as amber dashed bands.

## Circularity

The home of the signature moment. Waste streams listed on the left (neutral grey, dashed); selecting one plays `CircularityPath` from analysing to discovered. A `ChakraRing` with `tone="positive"` shows the circularity score. The "Next opportunity" stage is introduced with a single saffron outline.

## Evidence Drawer

`EvidenceDrawer` — neutral panel, fixed evidence treatment, sources in mono, confidence ticks. Opened from any number via a ghost "View evidence" or the evidence tag.

## Loading, empty, error

`StateView`. Loading says what is being computed and uses the stepping ChakraRing; empty points to the Command Center; errors say what is missing and what the result now excludes.

## Slides & documents

Warm-white page, `ashoka` title slab or the cover composition, Archivo titles, Plex body. One saffron emphasis per slide. Charts follow Data visualization.
