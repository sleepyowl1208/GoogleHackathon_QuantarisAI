"use client";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { cropKind, type FarmPlace } from "@/lib/farm-logic";
import { hash, rng } from "./life";
import { Piece, Tag } from "./material-flow";
import type { Form } from "@/lib/material-kit";

const PINE = "#E0A526", LEAF = "#3E7C2F";

function Plant({ kind, s, seed }: { kind: ReturnType<typeof cropKind>; s: number; seed: number }) {
  const lean = ((seed % 7) - 3) * 0.03;
  if (kind === "tree") return <group rotation={[0, 0, lean]}><mesh position={[0, 1.1 * s, 0]}><cylinderGeometry args={[0.16 * s, 0.24 * s, 2.2 * s, 8]} /><meshStandardMaterial color="#6B4A2B" /></mesh><mesh position={[0, 2.8 * s, 0]}><sphereGeometry args={[1.35 * s, 12, 10]} /><meshStandardMaterial color="#3F7D32" roughness={0.9} /></mesh></group>;
  if (kind === "pineapple") return (
    <group rotation={[0, (seed % 6) * 0.9, 0]}>
      {[0, 1, 2, 3, 4].map((k) => <mesh key={k} position={[Math.sin(k * 1.256) * 0.34 * s, 0.34 * s, Math.cos(k * 1.256) * 0.34 * s]} rotation={[Math.cos(k * 1.256) * 0.75, 0, -Math.sin(k * 1.256) * 0.75]}><coneGeometry args={[0.1 * s, 0.95 * s, 4]} /><meshStandardMaterial color={LEAF} /></mesh>)}
      {seed % 3 !== 0 ? <mesh position={[0, 0.34 * s, 0]} scale={[1, 1.3, 1]}><sphereGeometry args={[0.2 * s, 8, 8]} /><meshStandardMaterial color={PINE} roughness={0.7} /></mesh> : null}
    </group>
  );
  return <mesh position={[0, 0.35 * s, 0]}><boxGeometry args={[0.5 * s, 0.7 * s, 0.5 * s]} /><meshStandardMaterial color="#6FA83A" roughness={0.9} /></mesh>;
}

/** A small farm just outside the gate, drawn for the crop the raw material comes from, with a tractor that carries the harvest, whole and unprocessed, to the receiving gate. */
export function Farm({ place, crop, raw, reach }: { place: FarmPlace; crop: string; raw: Form; reach: number }) {
  const kind = cropKind(crop);
  const s = Math.max(1, reach / 34);
  const spacing = (kind === "tree" ? 3.4 : kind === "pineapple" ? 1.5 : 1.3) * s;
  const plants = useMemo(() => {
    const r = rng(hash(crop || "farm")), out: { x: number; z: number; seed: number }[] = [];
    const w = place.width - 2 * s, d = place.depth - 2 * s;
    for (let ix = 0, x = -w / 2; x <= w / 2 && out.length < 110; ix++, x += spacing) for (let iz = 0, z = -d / 2; z <= d / 2 && out.length < 110; iz++, z += spacing * (kind === "rows" ? 3 : 1)) {
      out.push({ x: x + (r() - 0.5) * 0.25 * s + (iz % 2 ? spacing * 0.25 : 0), z: z + (r() - 0.5) * 0.25 * s, seed: Math.floor(r() * 1000) + ix });
    }
    return out;
  }, [place.width, place.depth, spacing, s, crop, kind]);
  const trolley = useRef<Group>(null), cargo = useRef<Group>(null);
  const from: [number, number] = [place.cx - place.out[0] * (place.out[0] !== 0 ? place.width : 0) * 0.18, place.cz - place.out[1] * (place.out[1] !== 0 ? place.depth : 0) * 0.18];
  useFrame(({ clock }) => {
    const g = trolley.current; if (!g) return;
    const T = 28, u = (clock.elapsedTime % T) / T;
    const [fx, fz] = from, [gx, gz] = place.entry;
    let k: number, loaded: boolean;
    if (u < 0.36) { k = u / 0.36; loaded = true; }
    else if (u < 0.5) { k = 1; loaded = u < 0.43; }   // unloads at the gate halfway through the wait
    else if (u < 0.86) { k = 1 - (u - 0.5) / 0.36; loaded = false; }
    else { k = 0; loaded = u > 0.93; }                           // loads at the field before setting off
    const ease = k * k * (3 - 2 * k);
    g.position.set(fx + (gx - fx) * ease, 0.1, fz + (gz - fz) * ease);
    const going = u < 0.5 || u >= 0.93; const dx = gx - fx, dz = gz - fz;
    g.rotation.y = Math.atan2(going ? dx : -dx, going ? dz : -dz);
    if (cargo.current) cargo.current.visible = loaded;
  });
  const tag = Math.max(2.4, reach / 20);
  const soil = kind === "tree" ? "#9CB46A" : "#9A7448";
  return (
    <group>
      <mesh position={[place.cx, 0.06, place.cz]}><boxGeometry args={[place.width, 0.12, place.depth]} /><meshStandardMaterial color={soil} roughness={1} /></mesh>
      <mesh position={[(place.cx + place.entry[0]) / 2, 0.14, (place.cz + place.entry[1]) / 2]} rotation={[0, place.out[0] !== 0 ? Math.PI / 2 : 0, 0]}><boxGeometry args={[1.6 * s, 0.06, Math.hypot(place.cx - place.entry[0], place.cz - place.entry[1])]} /><meshStandardMaterial color="#C7A97B" roughness={1} /></mesh>
      <group position={[place.cx, 0.12, place.cz]}>
        {plants.map((p, i) => <group key={i} position={[p.x, 0, p.z]}><Plant kind={kind} s={s} seed={p.seed} /></group>)}
      </group>
      <group ref={trolley}>
        <mesh position={[0, 0.55 * s, -0.6 * s]}><boxGeometry args={[0.9 * s, 0.7 * s, 1.1 * s]} /><meshStandardMaterial color="#2E7D32" /></mesh>
        <mesh position={[0, 1.15 * s, -0.8 * s]}><boxGeometry args={[0.8 * s, 0.6 * s, 0.7 * s]} /><meshStandardMaterial color="#1F5E24" /></mesh>
        {[[-0.55, -0.9, 0.42], [0.55, -0.9, 0.42], [-0.5, 0.0, 0.26], [0.5, 0.0, 0.26]].map(([x, z, r], i) => <mesh key={i} position={[x * s, r * s, z * s]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[r * s, r * s, 0.2 * s, 12]} /><meshStandardMaterial color="#1E2329" /></mesh>)}
        <mesh position={[0, 0.45 * s, 1.55 * s]}><boxGeometry args={[1.5 * s, 0.14 * s, 2.0 * s]} /><meshStandardMaterial color="#8C5A2B" /></mesh>
        <group ref={cargo} position={[0, 0.5 * s, 1.55 * s]}>
          {[[-0.45, -0.6], [0.45, -0.6], [-0.45, 0.2], [0.45, 0.2], [0, -0.2], [0, 0.6]].map(([x, z], i) => <group key={i} position={[x * s, 0, z * s]} scale={0.8}><Piece form={raw} s={s * 1.1} /></group>)}
        </group>
      </group>
      <Tag text={`Farm: ${crop ? crop.charAt(0).toUpperCase() + crop.slice(1) : "crop"}`} position={[place.cx - place.out[0] * 0, tag * 3.2, place.cz]} size={tag} tone="in" />
    </group>
  );
}
