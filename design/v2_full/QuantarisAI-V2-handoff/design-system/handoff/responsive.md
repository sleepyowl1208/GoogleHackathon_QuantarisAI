# Handoff · Responsive behaviour

The design frame is 1440 × 860 (desktop is the primary target: industrial planning happens at a desk). Breakpoints (`theme.json → breakpoints`): **xl ≥ 1440 · lg 1280–1439 · md 1024–1279 · sm 640–1023 · xs < 640**.

## Shell

| Breakpoint | AppNav | Bar | Right panel column |
|---|---|---|---|
| xl | 224px rail | LevelPath + title + actions | as designed (300–340px) |
| lg | 224px rail | same; title truncates with ellipsis | 300px |
| md | 64px icon rail (index numbers + tooltips; saffron active bar kept) | LevelPath collapses to current level + "›" menu | becomes a right **drawer** (380px) toggled from the bar; discovery cards float over the scene top-right |
| sm | top bar with menu button; nav in a sheet | title only + overflow menu | **bottom sheet** with tabs (Discovery · Simulate · Inspector · Evidence), 45% height, draggable |
| xs | same as sm | same | bottom sheet 55% height; one tab visible at a time |

## Scene

| Breakpoint | Scene | Interaction |
|---|---|---|
| xl–md | fills its cell; `fitW` keeps the whole layout visible at narrow widths | drag orbit, wheel zoom |
| sm | full width, min height 56vh | one-finger orbit, pinch zoom; markers ≥ 32px hit area |
| xs | full width, 50vh; labels limited to selected object + markers | orbit disabled (zoom only) to avoid scroll conflicts; "Rotate" button steps 45° |

Labels collide on small screens: show only the selected object's label, discovery markers and the top 3 labels by importance (factory, recycler/Factory B, port).

## Per screen

| Screen | md | sm / xs |
|---|---|---|
| Construction | feed column 300px; clarify card over scene | feed becomes a collapsible strip above the scene (current step + progress `ChakraRing`); clarify card as a modal sheet |
| India map | layers in a popover from the bar; comparison in the right drawer | comparison as horizontal swipe cards under the map; layers in the sheet |
| Ecosystem | discovery card floats top-right; simulation in drawer | discovery card pinned above the sheet; simulation tab |
| Factory twin | inspector in drawer, opens on zone select | inspector tab auto-opens on zone select |
| Demo | caption bar wraps to two lines | not supported below 1024px — show "Open on a larger screen" `StateView` |

## WebGL fallback

Show the static render instead of the live scene when WebGL2 is unavailable, `navigator.hardwareConcurrency < 4` with low memory, the person enables "Reduce motion & 3D" in settings, or the first frames run under 20 fps:

| Level | Fallback image | Plus |
|---|---|---|
| Map | `assets/Scenes/india-intelligence-map(-dark).png` | `SiteMap` (2D SVG) for interaction |
| Ecosystem | `assets/Scenes/ecosystem-scene(-dark).png` | object list + `CircularityPath` (2D) for the signature moment |
| Factory | `assets/Scenes/factory-twin(-dark).png` | `ProcessFlow` (2D) for process selection |

All overlays (markers, cards, inspector, evidence) keep working on the fallback because they are DOM.

## Type and touch

- Type scale is fixed (no fluid type); below sm, `display` drops to 36/40 and `metric-xl` to 32/36.
- Touch targets ≥ 44px on sm/xs (buttons grow from 36 to 44px height).
- Sheets and drawers trap focus and close with Esc / swipe down.
