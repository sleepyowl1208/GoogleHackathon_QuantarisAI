# Motion

Motion communicates **flow** — material, decisions and value moving through a system. Never decoration.

| Name | Value | Use |
|---|---|---|
| `--qa-dur-quick` | 120ms | hover, press |
| `--qa-dur-base` | 220ms | panel and tag changes, drawer |
| `--qa-dur-flow` | 900ms | a flow path drawing, topology appearing |
| `--qa-dur-discover` | 1400ms | the waste → value transition |
| `--qa-ease-flow` | cubic-bezier(0.2, 0, 0, 1) | everything entering or resolving |
| `--qa-ease-exit` | cubic-bezier(0.4, 0, 1, 1) | leaving |

(Defined in the components stylesheet; all drop to 0 under `prefers-reduced-motion`.)

## Patterns

- **Material flow:** connectors draw left→right in production order, 80ms stagger per stage.
- **Location resolving:** candidate sites fade in; non-selected candidates settle to outline as the selected one fills saffron.
- **Factory topology appearing:** nodes appear in process order, then the waste branch drops down.
- **Scenario progress:** `ChakraRing` advances one segment at a time (stepped, not smooth).
- **Waste branching:** the branch line draws downward in dashed grey.
- **The signature moment (WASTE → VALUE):** `CircularityPath` — the analysing path moves as a blue dash; on discovery it turns solid green and the recovery steps fill green one by one (150ms stagger), ending on the value node. Played once per discovery, never looped.
- **Secondary opportunity:** appears last, with a single saffron outline pulse (one cycle).

## Never

Constant movement, idle animations, particles, glows, parallax, holograms, spinning logos, confetti on success.

## Industrial motion (spatial layer)

Motion in the scenes shows industrial activity — each movement is a real flow in the model.

| Movement | Spec |
|---|---|
| Element materialises | grows up from the ground, scale-Y 0 → 1 with ease-in-out-cubic, ≈ 0.6s; one element per workflow step |
| Material moves through production | bale packets along `flow-material`, 0.025–0.05 loops/s, in process order |
| Energy pulses toward machines | emissive pulses along `flow-energy` / `flow-renewable`, 0.11 loops/s; renewable share = share of green pulses |
| Water flows in, recovered water loops back | drop packets, 0.06–0.07 loops/s; return loop at 55–60% opacity |
| Products move to logistics | bale packets warehouse → port |
| Waste branches away | grey path appears from the process that creates it |
| Circular pathway grows | tube `drawRange` grows from the waste pile over ≈ 1.4s, then packets start |
| New opportunity materialises | Factory B rises on its green ring, then its link grows |
| AI discovery | marker rises 6px + fades in once (220ms); the affected object gets its ring; nothing loops |
| Camera moves between levels | 600–900ms, `--qa-ease-flow`; a cut under reduced motion |

Packets only move while their flow is visible and the scene is on screen. Under `prefers-reduced-motion` flows freeze, transitions settle instantly and the camera cuts. Never: random particles, idle drifting cameras, glow, holograms, game-like bounces.
