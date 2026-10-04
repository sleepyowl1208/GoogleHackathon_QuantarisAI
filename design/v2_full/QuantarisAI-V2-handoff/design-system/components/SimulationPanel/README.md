# SimulationPanel
What-if controls. Every change is SIMULATED until applied: dashed border, hatched `SIMULATED` tag, struck-through current value, and a ghost tick on each slider marking CURRENT.

**Provide:** `params` (`{id, label, current, min, max, step?, unit?, format?}`), `values` (simulated values by id), `onChange(id, value)`, `onReset`, `results` (`{label, current, simulated, unit, better?}`), `recommendation` (`{text, changed?}`).

- Supported levers: production volume, raw-material cost, electricity price, renewable %, water availability, workforce cost, transport distance, machine capacity, recycling %, waste recovery.
- The scene reacts while the panel is dirty (`Scene3D mode="simulated"`): e.g. renewable 30 → 70% lights more solar rows and swaps grid pulses for green ones.
- When the recommendation flips, say so in one line with ↻ on `saffron-soft`.
