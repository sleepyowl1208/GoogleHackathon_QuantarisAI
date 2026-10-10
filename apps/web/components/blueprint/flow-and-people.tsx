"use client";
import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { CatmullRomCurve3, Color, Quaternion, Vector3, type Group } from "three";
import type { V3 } from "@/lib/factory-geometry";

const UP = new Vector3(0, 1, 0);

/** A smooth curved route through the steps, with vivid arrows gliding along it in the direction material moves. */
export function FlowArrows({ points, colors, size, count = 7, speed = 16 }: { points: V3[]; colors: string[]; size: number; count?: number; speed?: number }) {
  const curve = useMemo(() => new CatmullRomCurve3(points.map((p) => new Vector3(...p)), false, "centripetal", 0.5), [points]);
  const samples = useMemo(() => curve.getPoints(Math.max(60, points.length * 28)), [curve, points.length]);
  const lineColors = useMemo(() => samples.map((_, i) => { const k = (i / (samples.length - 1)) * (colors.length - 1); const a = new Color(colors[Math.floor(k)] ?? "#FF9933"), b = new Color(colors[Math.min(colors.length - 1, Math.ceil(k))] ?? "#FF9933"); return a.lerp(b, k - Math.floor(k)).toArray() as [number, number, number]; }), [samples, colors]);
  const refs = useRef<(Group | null)[]>([]);
  const tmp = useMemo(() => ({ q: new Quaternion(), tangent: new Vector3(), pos: new Vector3() }), []);
  useFrame(({ clock }) => {
    refs.current.forEach((g, i) => {
      if (!g) return;
      const t = (clock.elapsedTime / speed + i / count) % 1;
      curve.getPointAt(t, tmp.pos); curve.getTangentAt(t, tmp.tangent);
      g.position.copy(tmp.pos); g.quaternion.copy(tmp.q.setFromUnitVectors(UP, tmp.tangent.normalize()));
      const fade = Math.min(1, t * 12, (1 - t) * 12); g.scale.setScalar(size * (0.55 + 0.45 * fade) * (1 + 0.08 * Math.sin(clock.elapsedTime * 5 + i)));
    });
  });
  return (
    <>
      <Line points={samples} vertexColors={lineColors} lineWidth={2.2} transparent opacity={0.55} />
      {Array.from({ length: count }, (_, i) => (
        <group key={i} ref={(el) => { refs.current[i] = el; }}>
          <mesh position={[0, 0.9, 0]}><coneGeometry args={[0.62, 1.7, 18]} /><meshStandardMaterial color="#FFB020" emissive="#FF8A00" emissiveIntensity={1.1} roughness={0.35} /></mesh>
          <mesh position={[0, -0.35, 0]}><cylinderGeometry args={[0.22, 0.34, 1.5, 12]} /><meshStandardMaterial color="#FF9933" emissive="#FF7A00" emissiveIntensity={0.8} roughness={0.4} /></mesh>
          <mesh position={[0, -1.45, 0]}><sphereGeometry args={[0.2, 10, 10]} /><meshStandardMaterial color="#FFD08A" emissive="#FF9933" emissiveIntensity={0.7} transparent opacity={0.7} /></mesh>
        </group>
      ))}
    </>
  );
}
