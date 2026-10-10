"use client";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { CatmullRomCurve3, Vector3, type Mesh } from "three";
import type { LayoutResult } from "@/lib/layout-api";

export type RouteLine = { from: string; to: string; kind: "water" | "waste" };
const COLOR = { water: { pipe: "#2B8FE8", drop: "#9BD0FF" }, waste: { pipe: "#8B5A2B", drop: "#D2A06A" } } as const;
const DROPS = 6;

/** Pipes along the floor from a step to where its used water (or solid waste) goes, with drops moving along them in the direction of flow. */
export function WaterRoutes({ layout, routes, reach }: { layout: LayoutResult; routes: RouteLine[]; reach: number }) {
  const { width_m: W, depth_m: D } = layout;
  const radius = Math.max(0.24, reach / 190), y = 0.55;
  const lines = useMemo(() => routes.map((r) => {
    const a = layout.zones.find((z) => z.zone_id === r.from), b = layout.zones.find((z) => z.zone_id === r.to);
    if (!a || !b) return undefined;
    const pt = (z: typeof a, dx = 0, dz = 0) => new Vector3(z.x + z.width_m / 2 - W / 2 + dx, y, -(z.y + z.depth_m / 2 - D / 2) + dz);
    const A = pt(a), B = pt(b), elbow = new Vector3(B.x, y, A.z);      // runs along one aisle, then the other, like real pipework
    const curve = new CatmullRomCurve3([A, A.clone().lerp(elbow, 0.5), elbow, elbow.clone().lerp(B, 0.5), B], false, "catmullrom", 0.1);
    return { r, curve };
  }).filter((x): x is NonNullable<typeof x> => Boolean(x)), [routes, layout.zones, W, D]);
  const drops = useRef<(Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    let n = 0;
    for (const l of lines) for (let k = 0; k < DROPS; k++) { const m = drops.current[n++]; if (m) { const t = (clock.elapsedTime / 7 + k / DROPS) % 1; l.curve.getPointAt(t, m.position); m.position.y = y + radius * 1.3; } }
  });
  let idx = 0;
  return (
    <>
      {lines.map((l, i) => (
        <group key={`${l.r.from}-${l.r.to}-${l.r.kind}-${i}`}>
          <mesh><tubeGeometry args={[l.curve, 90, radius, 8, false]} /><meshStandardMaterial color={COLOR[l.r.kind].pipe} roughness={0.35} metalness={0.2} emissive={COLOR[l.r.kind].pipe} emissiveIntensity={0.25} /></mesh>
          {Array.from({ length: DROPS }, (_, k) => { const slot = idx++; return <mesh key={k} ref={(el) => { drops.current[slot] = el; }}><sphereGeometry args={[radius * 1.5, 12, 12]} /><meshStandardMaterial color={COLOR[l.r.kind].drop} emissive={COLOR[l.r.kind].pipe} emissiveIntensity={0.9} /></mesh>; })}
        </group>
      ))}
    </>
  );
}
