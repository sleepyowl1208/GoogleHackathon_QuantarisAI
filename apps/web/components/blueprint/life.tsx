"use client";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import type { LayoutResult, Vehicle } from "@/lib/layout-api";

export function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const smooth = (x: number) => x * x * (3 - 2 * x);


type Grazer = { x: number; z: number; tx: number; tz: number; wait: number; phase: number };
const COAT = [["#F5F2EA", "#2B2B2B"], ["#8B5A3C", "#F1E7D8"], ["#B98760", "#F5F2EA"], ["#2B2B2B", "#F5F2EA"]];

/** Cows in a pasture: heads down chewing grass, now and then ambling to a fresh patch. */
export function Cows({ id, width, depth, count, scale }: { id: string; width: number; depth: number; count: number; scale: number }) {
  const rand = useMemo(() => rng(hash(id) ^ 0x9e37), [id]);
  const state = useMemo<Grazer[]>(() => Array.from({ length: count }, () => { const x = (rand() - 0.5) * width * 0.7, z = (rand() - 0.5) * depth * 0.62; return { x, z, tx: x, tz: z, wait: rand() * 5, phase: rand() * 6 }; }), [count, width, depth, rand]);
  const coats = useMemo(() => state.map((_, i) => COAT[(hash(id) + i) % COAT.length]), [state, id]);
  const roots = useRef<(Group | null)[]>([]), heads = useRef<(Group | null)[]>([]), tails = useRef<(Group | null)[]>([]), legs = useRef<(Group | null)[][]>([]);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime, speed = 0.45 * scale;
    state.forEach((c, i) => {
      const g = roots.current[i]; if (!g) return;
      const dx = c.tx - c.x, dz = c.tz - c.z, dist = Math.hypot(dx, dz), walking = dist >= 0.3 * scale;
      if (!walking) { c.wait -= dt; if (c.wait <= 0) { c.tx = (rand() - 0.5) * width * 0.78; c.tz = (rand() - 0.5) * depth * 0.7; c.wait = 6 + rand() * 9; } }
      else { const step = Math.min(dist, speed * dt); c.x += (dx / dist) * step; c.z += (dz / dist) * step; const want = Math.atan2(dx, dz); let diff = want - g.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); g.rotation.y += diff * Math.min(1, dt * 2.5); }
      g.position.set(c.x, 0.25, c.z);
      const head = heads.current[i];
      if (head) head.rotation.x = walking ? 0.15 : 0.95 + Math.sin(t * 5 + c.phase) * 0.07 + Math.max(0, Math.sin(t * 0.35 + c.phase) - 0.85) * -4; // grazing: head down, jaw chewing, now and then a look up
      const tail = tails.current[i]; if (tail) tail.rotation.x = 0.3 + Math.sin(t * 2.2 + c.phase) * 0.25;
      (legs.current[i] ?? []).forEach((l, k) => { if (l) l.rotation.x = walking ? Math.sin(t * 4 + (k % 2 ? 0 : Math.PI) + (k > 1 ? 1.2 : 0)) * 0.45 : 0; });
    });
  });
  return (
    <>
      {state.map((c, i) => (
        <group key={i} ref={(el) => { roots.current[i] = el; }} position={[c.x, 0.25, c.z]} scale={scale * 1.05}>
          <mesh position={[0, 1.05, 0]} rotation={[Math.PI / 2, 0, 0]}><capsuleGeometry args={[0.36, 1.05, 6, 12]} /><meshStandardMaterial color={coats[i][0]} roughness={0.85} /></mesh>
          <mesh position={[0.1, 1.28, 0.2]}><sphereGeometry args={[0.2, 10, 8]} /><meshStandardMaterial color={coats[i][1]} roughness={0.9} /></mesh>
          <mesh position={[-0.12, 1.14, -0.35]}><sphereGeometry args={[0.17, 10, 8]} /><meshStandardMaterial color={coats[i][1]} roughness={0.9} /></mesh>
          <mesh position={[0, 0.84, 0.4]}><sphereGeometry args={[0.13, 10, 8]} /><meshStandardMaterial color="#E8A3A3" /></mesh>
          <group ref={(el) => { heads.current[i] = el; }} position={[0, 1.4, 0.82]}>
            <mesh position={[0, 0.0, 0.25]} rotation={[0.5, 0, 0]}><capsuleGeometry args={[0.15, 0.4, 4, 10]} /><meshStandardMaterial color={coats[i][0]} /></mesh>
            <mesh position={[0, -0.12, 0.52]}><boxGeometry args={[0.2, 0.17, 0.17]} /><meshStandardMaterial color="#E7B8B8" /></mesh>
            {[-1, 1].map((s) => <mesh key={s} position={[s * 0.19, 0.08, 0.14]} rotation={[0, 0, s * 0.7]}><boxGeometry args={[0.16, 0.05, 0.09]} /><meshStandardMaterial color={coats[i][0]} /></mesh>)}
            {[-1, 1].map((s) => <mesh key={`h${s}`} position={[s * 0.1, 0.17, 0.16]}><coneGeometry args={[0.035, 0.14, 6]} /><meshStandardMaterial color="#EDE5D0" /></mesh>)}
          </group>
          {[[-0.2, 0.62], [0.2, 0.62], [-0.2, -0.62], [0.2, -0.62]].map(([x, z], k) => <group key={k} ref={(el) => { (legs.current[i] ??= [])[k] = el; }} position={[x, 0.78, z]}><mesh position={[0, -0.39, 0]}><capsuleGeometry args={[0.065, 0.62, 4, 8]} /><meshStandardMaterial color={coats[i][0]} /></mesh><mesh position={[0, -0.8, 0.02]}><boxGeometry args={[0.13, 0.08, 0.15]} /><meshStandardMaterial color="#2B2B2B" /></mesh></group>)}
          <group ref={(el) => { tails.current[i] = el; }} position={[0, 1.25, -0.8]}><mesh position={[0, -0.28, -0.04]}><capsuleGeometry args={[0.025, 0.5, 3, 6]} /><meshStandardMaterial color={coats[i][0]} /></mesh></group>
        </group>
      ))}
    </>
  );
}

/** A fenced pasture: posts and two rails round the edge, a hay trough and a patch of long grass. */
export function Pasture({ width, depth, scale }: { width: number; depth: number; scale: number }) {
  const spacing = 3.2 * scale;
  const posts: [number, number][] = [];
  for (let x = -width / 2; x <= width / 2 + 0.01; x += spacing) { posts.push([x, -depth / 2], [x, depth / 2]); }
  for (let z = -depth / 2 + spacing; z < depth / 2 - 0.01; z += spacing) { posts.push([-width / 2, z], [width / 2, z]); }
  return (
    <group>
      {posts.map(([x, z], i) => <mesh key={i} position={[x, 0.65 * scale + 0.25, z]}><boxGeometry args={[0.16, 1.3 * scale, 0.16]} /><meshStandardMaterial color="#8B6B45" /></mesh>)}
      {[0.5, 1.0].map((h) => (<group key={h}><mesh position={[0, h * scale + 0.25, -depth / 2]}><boxGeometry args={[width, 0.07, 0.07]} /><meshStandardMaterial color="#A88458" /></mesh><mesh position={[0, h * scale + 0.25, depth / 2]}><boxGeometry args={[width, 0.07, 0.07]} /><meshStandardMaterial color="#A88458" /></mesh><mesh position={[-width / 2, h * scale + 0.25, 0]}><boxGeometry args={[0.07, 0.07, depth]} /><meshStandardMaterial color="#A88458" /></mesh><mesh position={[width / 2, h * scale + 0.25, 0]}><boxGeometry args={[0.07, 0.07, depth]} /><meshStandardMaterial color="#A88458" /></mesh></group>))}
      <mesh position={[width * 0.34, 0.5 * scale, -depth * 0.36]}><boxGeometry args={[Math.min(width * 0.3, 5 * scale), 0.5 * scale, 0.7 * scale]} /><meshStandardMaterial color="#9A7B52" /></mesh>
      <mesh position={[width * 0.34, 0.8 * scale, -depth * 0.36]}><boxGeometry args={[Math.min(width * 0.28, 4.6 * scale), 0.25 * scale, 0.55 * scale]} /><meshStandardMaterial color="#D8C06A" /></mesh>
    </group>
  );
}

const rectEdge = (W: number, D: number, cx: number, cy: number) => {
  const d = { west: cx, east: W - cx, south: cy, north: D - cy }; const edge = (Object.entries(d).sort((a, b) => a[1] - b[1])[0][0]) as "west" | "east" | "south" | "north";
  return edge;
};

/** A vehicle that drives in from the nearest side of the plot, stops at its section to unload (or load), and drives away. It repeats, so the plant looks busy. */
export function Vehicles({ layout, list, reach }: { layout: LayoutResult; list: Vehicle[]; reach: number }) {
  const { width_m: W, depth_m: D } = layout;
  const scale = Math.max(1.3, reach / 30);
  const trips = useMemo(() => list.map((v, index) => {
    const z = layout.zones.find((x) => x.zone_id === v.zone_id); if (!z || z.kind === "livestock") return undefined;
    const cx = z.x + z.width_m / 2, cy = z.y + z.depth_m / 2; const edge = rectEdge(W, D, cx, cy);
    const inset = 2.2 * scale;
    // plot coordinates: x east, y north. Returns the point just outside the plot and the stop point just inside the section.
    const stop = edge === "west" ? [z.x + inset, cy] : edge === "east" ? [z.x + z.width_m - inset, cy] : edge === "south" ? [cx, z.y + inset] : [cx, z.y + z.depth_m - inset];
    const out = edge === "west" ? [-reach * 0.14, cy] : edge === "east" ? [W + reach * 0.14, cy] : edge === "south" ? [cx, -reach * 0.14] : [cx, D + reach * 0.14];
    return { v, index, stop: stop as [number, number], out: out as [number, number], phase: index * 6.5 + (hash(v.zone_id) % 5) };
  }).filter((x): x is NonNullable<typeof x> => Boolean(x)), [list, layout.zones, W, D, reach, scale]);
  const roots = useRef<(Group | null)[]>([]), wheels = useRef<(Group | null)[][]>([]);
  const P = 20;
  useFrame(({ clock }) => {
    trips.forEach((tr, i) => {
      const g = roots.current[i]; if (!g) return;
      const u = (((clock.elapsedTime + tr.phase) % P) + P) % P / P;
      let k: number, heading: number;
      const ax = tr.stop[0] - tr.out[0], ay = tr.stop[1] - tr.out[1];
      if (u < 0.28) { k = smooth(u / 0.28); heading = Math.atan2(ax, -ay); }
      else if (u < 0.62) { k = 1; heading = Math.atan2(ax, -ay); }
      else if (u < 0.9) { k = 1 - smooth((u - 0.62) / 0.28); heading = Math.atan2(-ax, ay); }
      else { k = 0; heading = Math.atan2(-ax, ay); }
      const x = tr.out[0] + ax * k, y = tr.out[1] + ay * k;
      g.visible = !(u >= 0.9);
      g.position.set(x - W / 2, 0.25, -(y - D / 2)); g.rotation.y = heading;
      const spin = (u < 0.28 || (u >= 0.62 && u < 0.9)) ? clock.elapsedTime * 6 : 0;
      (wheels.current[i] ?? []).forEach((w) => { if (w) w.rotation.x = spin; });
    });
  });
  return (
    <>
      {trips.map((tr, i) => {
        const tanker = tr.v.kind === "tanker", tractor = tr.v.kind === "tractor";
        return (
          <group key={`${tr.v.zone_id}-${tr.index}`} ref={(el) => { roots.current[i] = el; }} scale={scale} visible={false}>
            {tractor ? (<>
              <mesh position={[0, 1.0, 0.6]}><boxGeometry args={[1.3, 0.9, 1.5]} /><meshStandardMaterial color="#2F8F3A" /></mesh><mesh position={[0, 1.7, 0.4]}><boxGeometry args={[1.1, 0.8, 0.9]} /><meshStandardMaterial color="#7FB7D8" transparent opacity={0.8} /></mesh>
              <mesh position={[0, 0.85, -1.6]}><boxGeometry args={[1.5, 0.9, 2.2]} /><meshStandardMaterial color="#C9A064" /></mesh>
            </>) : (<>
              <mesh position={[0, 1.0, 1.3]}><boxGeometry args={[1.5, 1.2, 1.3]} /><meshStandardMaterial color="#E8993A" /></mesh>
              <mesh position={[0, 1.2, 1.97]}><boxGeometry args={[1.2, 0.55, 0.06]} /><meshStandardMaterial color="#7FB7D8" /></mesh>
              {tanker ? <mesh position={[0, 1.35, -0.7]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.8, 0.8, 3.4, 20]} /><meshStandardMaterial color="#C9D0D8" metalness={0.5} roughness={0.35} /></mesh>
                : <><mesh position={[0, 1.35, -0.7]}><boxGeometry args={[1.7, 1.7, 3.5]} /><meshStandardMaterial color="#F4E7D3" /></mesh>{[-0.9, -0.2].map((z) => <mesh key={z} position={[0, 2.35, z]}><boxGeometry args={[1.2, 0.5, 0.6]} /><meshStandardMaterial color="#B5865A" /></mesh>)}</>}
            </>)}
            {[[-0.8, 1.2], [0.8, 1.2], [-0.8, -1.2], [0.8, -1.2]].map(([x, z], k) => (
              <group key={k} ref={(el) => { (wheels.current[i] ??= [])[k] = el; }} position={[x, tractor && z > 0 ? 0.38 : 0.45, z]}><mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[tractor && z < 0 ? 0.62 : 0.45, tractor && z < 0 ? 0.62 : 0.45, 0.32, 16]} /><meshStandardMaterial color="#222" /></mesh><mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.2, 0.2, 0.34, 8]} /><meshStandardMaterial color="#B9B9B9" /></mesh></group>
            ))}
          </group>
        );
      })}
    </>
  );
}

/** A roofed, open-sided hen barn: posts, a sloped roof, rows of nest boxes with an egg belt, and hens pecking and wandering on the floor. */
export function HenBarn({ id, width, depth, scale }: { id: string; width: number; depth: number; scale: number }) {
  const rand = useMemo(() => rng(hash(id) ^ 0x51ed), [id]);
  const count = Math.min(14, Math.max(5, Math.round((width * depth) / (28 * scale * scale))));
  const hens = useMemo(() => Array.from({ length: count }, () => { const x = (rand() - 0.5) * width * 0.78, z = (rand() - 0.1) * depth * 0.5; return { x, z, tx: x, tz: z, wait: rand() * 3, phase: rand() * 6, hue: rand() }; }), [count, width, depth, rand]);
  const roots = useRef<(Group | null)[]>([]), heads = useRef<(Group | null)[]>([]);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime, speed = 0.9 * scale;
    hens.forEach((h, i) => {
      const g = roots.current[i]; if (!g) return;
      const dx = h.tx - h.x, dz = h.tz - h.z, dist = Math.hypot(dx, dz), walking = dist > 0.15 * scale;
      if (!walking) { h.wait -= dt; if (h.wait <= 0) { h.tx = (rand() - 0.5) * width * 0.78; h.tz = (rand() - 0.1) * depth * 0.5; h.wait = 1.5 + rand() * 4; } }
      else { const step = Math.min(dist, speed * dt); h.x += (dx / dist) * step; h.z += (dz / dist) * step; const want = Math.atan2(dx, dz); let diff = want - g.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); g.rotation.y += diff * Math.min(1, dt * 6); }
      g.position.set(h.x, 0.25, h.z);
      const head = heads.current[i]; if (head) head.rotation.x = walking ? 0.1 + Math.sin(t * 9 + h.phase) * 0.12 : 0.35 + Math.max(0, Math.sin(t * 6 + h.phase)) * 0.75; // pecking the floor
    });
  });
  const roofH = 4.2 * scale, rows = Math.max(2, Math.round(width / (6 * scale)));
  return (
    <group>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <mesh key={`${sx}${sz}`} position={[sx * width / 2, roofH / 2 + 0.25, sz * depth / 2]}><boxGeometry args={[0.22 * scale, roofH, 0.22 * scale]} /><meshStandardMaterial color="#7A5B3A" /></mesh>)}
      {[-1, 1].map((s) => <mesh key={`r${s}`} position={[s * width * 0.25, roofH + 0.7 * scale, -depth * 0.22]} rotation={[0, 0, -s * 0.28]}><boxGeometry args={[width * 0.54, 0.16 * scale, depth * 0.58]} /><meshStandardMaterial color="#B5523B" /></mesh>)}
      {Array.from({ length: rows }, (_, r) => { const x = (-width / 2) + ((r + 0.5) * width) / rows; return (
        <group key={r} position={[x, 0, -depth * 0.36]}>
          <mesh position={[0, 0.85 * scale + 0.25, 0]}><boxGeometry args={[Math.min(width / rows - 0.8, 4.4 * scale), 1.0 * scale, 0.9 * scale]} /><meshStandardMaterial color="#C9A66B" /></mesh>
          <mesh position={[0, 0.3 * scale + 0.25, 0.48 * scale]}><boxGeometry args={[Math.min(width / rows - 0.8, 4.4 * scale), 0.1 * scale, 0.5 * scale]} /><meshStandardMaterial color="#8E959C" /></mesh>
          {[-1, 0, 1].map((e) => <mesh key={e} position={[e * 0.9 * scale, 0.4 * scale + 0.25, 0.5 * scale]}><sphereGeometry args={[0.12 * scale, 8, 6]} /><meshStandardMaterial color="#F6EBD3" /></mesh>)}
        </group>); })}
      {hens.map((h, i) => (
        <group key={i} ref={(el) => { roots.current[i] = el; }} position={[h.x, 0.25, h.z]} scale={scale * 0.9}>
          <mesh position={[0, 0.34, 0]} scale={[1, 0.85, 1.25]}><sphereGeometry args={[0.24, 10, 8]} /><meshStandardMaterial color={h.hue > 0.5 ? "#F2EBDD" : "#B5683A"} roughness={0.95} /></mesh>
          <mesh position={[0, 0.42, -0.3]} rotation={[0.8, 0, 0]}><coneGeometry args={[0.1, 0.28, 6]} /><meshStandardMaterial color={h.hue > 0.5 ? "#E6DCC8" : "#9A5430"} /></mesh>
          <group ref={(el) => { heads.current[i] = el; }} position={[0, 0.58, 0.2]}>
            <mesh><sphereGeometry args={[0.1, 8, 6]} /><meshStandardMaterial color={h.hue > 0.5 ? "#F2EBDD" : "#B5683A"} /></mesh>
            <mesh position={[0, 0.1, 0]}><boxGeometry args={[0.03, 0.07, 0.1]} /><meshStandardMaterial color="#C0281C" /></mesh>
            <mesh position={[0, -0.02, 0.12]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.035, 0.1, 5]} /><meshStandardMaterial color="#E0A21B" /></mesh>
          </group>
          {[-1, 1].map((sx) => <mesh key={sx} position={[sx * 0.08, 0.1, 0]}><cylinderGeometry args={[0.014, 0.014, 0.2, 5]} /><meshStandardMaterial color="#D9A21B" /></mesh>)}
        </group>
      ))}
    </group>
  );
}

/** A chimney with a plume: puffs rise, widen and fade. `level` (0 clear to 1 heavy) sets how dark and how dense the smoke is, so AI combustion control visibly thins it. */
export function Smoke({ height, level, scale }: { height: number; level: number; scale: number }) {
  const puffs = 9;
  const refs = useRef<(Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.35;
    refs.current.forEach((g, i) => {
      if (!g) return;
      const k = (t + i / puffs) % 1;
      g.position.set(k * 1.6 * scale, k * 5.5 * scale, Math.sin(k * 6 + i) * 0.35 * scale);
      const size = (0.7 + k * 2.2) * scale * (0.4 + level);
      g.scale.setScalar(size);
      const m = (g.children[0] as unknown as { material: { opacity: number } }).material;
      m.opacity = level < 0.03 ? 0 : (1 - k) * Math.min(0.78, 0.12 + level * 0.7);
    });
  });
  return (
    <group position={[0, height, 0]}>
      <mesh position={[0, -height / 2 + 0.2, 0]}><cylinderGeometry args={[0.2 * scale, 0.34 * scale, height, 12]} /><meshStandardMaterial color="#8C5A44" /></mesh>
      <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.27 * scale, 0.22 * scale, 0.25 * scale, 12]} /><meshStandardMaterial color="#3B3B3B" /></mesh>
      {Array.from({ length: puffs }, (_, i) => <group key={i} ref={(el) => { refs.current[i] = el; }} position={[0, 0.3, 0]}><mesh><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color={level > 0.5 ? "#3A3A3A" : "#8A8A8A"} transparent opacity={0.4} depthWrite={false} /></mesh></group>)}
    </group>
  );
}
