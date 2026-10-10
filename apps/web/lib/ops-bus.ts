import { useSyncExternalStore } from "react";

/** How much smoke the 3D plant shows (0 clear, 1 heavy). The AI operations tab sets it from the simulated stack opacity; until then a fixed-setting plant looks mildly smoky. */
export const DEFAULT_SMOKE = 0.37;
const MAX_OPACITY_PCT = 60;
let level = DEFAULT_SMOKE;
const listeners = new Set<() => void>();
export const smokeFromOpacity = (pct: number) => Math.min(1, Math.max(0, pct / MAX_OPACITY_PCT));
export function setSmokeLevel(next: number) { if (next === level) return; level = next; listeners.forEach((l) => l()); }
export const useSmokeLevel = () => useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => level, () => DEFAULT_SMOKE);
export const burnsFuel = (text: string) => /boiler|furnace|kiln|oven|dryer|drier|fryer|roast|steam|burner|incinerat|pasteur|cooker|steriliz/i.test(text);
export const isPoultry = (text: string) => /\bhens?\b|poultry|layer|egg|chick|broiler/i.test(text);
