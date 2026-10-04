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
