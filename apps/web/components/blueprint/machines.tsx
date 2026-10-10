"use client";
import type { PropKind, V3 } from "@/lib/factory-geometry";

const METAL = "#9AA4AE", STEEL = "#C9D0D8", DARK = "#3B424A", BRICK = "#8F4A2C", SAFFRON = "#E8993A";

function Box({ p = [0, 0, 0], a, c, rot, glow }: { p?: V3; a: V3; c: string; rot?: V3; glow?: string }) {
  return <mesh position={p} rotation={rot} castShadow><boxGeometry args={a} /><meshStandardMaterial color={c} roughness={0.62} metalness={0.18} emissive={glow ?? "#000000"} emissiveIntensity={glow ? 0.7 : 0} /></mesh>;
}
function Cyl({ p = [0, 0, 0], r, h, c, rot, rt, seg = 22 }: { p?: V3; r: number; h: number; c: string; rot?: V3; rt?: number; seg?: number }) {
  return <mesh position={p} rotation={rot} castShadow><cylinderGeometry args={[rt ?? r, r, h, seg]} /><meshStandardMaterial color={c} roughness={0.55} metalness={0.28} /></mesh>;
}
function Dome({ p, r, c }: { p: V3; r: number; c: string }) {
  return <mesh position={p}><sphereGeometry args={[r, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={c} roughness={0.5} metalness={0.3} /></mesh>;
}

/** Recognisable stand-ins for real equipment, built from simple parts. Sizes are relative to `s` (the slot size) and `h` (the building height). */
export function Machine({ kind, s, h, color, w }: { kind: PropKind; s: number; h: number; color: string; w: number }) {
  switch (kind) {
    case "tank": { const r = s * 0.52, leg = Math.min(h * 0.14, 1.6), H = Math.min(h * 0.58, s * 1.6);
      return <group>
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => <Box key={`${x}${z}`} p={[x * r * 0.7, leg / 2, z * r * 0.7]} a={[0.16, leg, 0.16]} c={DARK} />)}
        <Cyl p={[0, leg + H / 2, 0]} r={r} h={H} c={color} />
        <Dome p={[0, leg + H, 0]} r={r} c={color} />
        {[0.28, 0.72].map((k) => <Cyl key={k} p={[0, leg + H * k, 0]} r={r * 1.025} h={0.14} c={METAL} />)}
        <Cyl p={[r * 0.95, leg + H * 0.3, 0]} r={0.12} h={r * 0.7} c={STEEL} rot={[0, 0, Math.PI / 2]} />
        <Box p={[0, leg + H + r * 0.55, 0]} a={[0.18, 0.5, 0.18]} c={DARK} />
      </group>; }
    case "silo": { const r = s * 0.4, cone = Math.min(h * 0.18, 2.6), H = Math.min(h * 0.62, s * 3.4), leg = cone + 0.5;
      return <group>
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => <Box key={`${x}${z}`} p={[x * r * 0.75, leg / 2, z * r * 0.75]} a={[0.2, leg, 0.2]} c={DARK} />)}
        <Cyl p={[0, leg - cone / 2, 0]} r={0.14} rt={r} h={cone} c={color} />
        <Cyl p={[0, leg + H / 2, 0]} r={r} h={H} c={color} />
        <Cyl p={[0, leg + H + 0.35, 0]} r={0.12} rt={r} h={0.7} c={METAL} />
        <Box p={[r + 0.12, leg + H / 2, 0]} a={[0.12, H, 0.5]} c={STEEL} />
        {[0.3, 0.6, 0.9].map((k) => <Cyl key={k} p={[0, leg + H * k, 0]} r={r * 1.02} h={0.1} c={METAL} />)}
      </group>; }
    case "boiler": { const r = s * 0.46, L = s * 1.7, y = r + 0.5;
      return <group>
        {[-0.55, 0.55].map((k) => <Box key={k} p={[k * L * 0.55, 0.25, 0]} a={[0.5, 0.5, r * 1.3]} c={DARK} />)}
        <Cyl p={[0, y, 0]} r={r} h={L} c={color} rot={[0, 0, Math.PI / 2]} />
        <Cyl p={[-L / 2 - 0.05, y, 0]} r={r * 0.92} h={0.18} c={METAL} rot={[0, 0, Math.PI / 2]} />
        <Cyl p={[L * 0.3, y + r + Math.min(h * 0.28, 3) / 2, 0]} r={r * 0.2} rt={r * 0.16} h={Math.min(h * 0.28, 3) + 0.4} c={DARK} />
        <Box p={[-L / 2 - 0.15, y - r * 0.2, 0]} a={[0.1, r * 0.8, r * 0.7]} c={DARK} glow="#FF7A1A" />
        <Cyl p={[0, y + r + 0.2, 0]} r={0.12} h={L * 0.5} c={STEEL} rot={[0, 0, Math.PI / 2]} />
      </group>; }
    case "furnace": { const L = s * 1.7, D = s * 1.15, H = Math.min(h * 0.4, s * 1.1), chim = Math.min(h * 0.5, 5) + 2.5;
      return <group>
        <Box p={[0, H / 2, 0]} a={[L, H, D]} c={BRICK} />
        <mesh position={[0, H, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 1]}><cylinderGeometry args={[D / 2, D / 2, L, 18, 1, false, 0, Math.PI]} /><meshStandardMaterial color="#7A3B22" roughness={0.8} /></mesh>
        <Box p={[-L / 2 - 0.04, H * 0.45, 0]} a={[0.1, H * 0.5, D * 0.5]} c="#FF7A1A" glow="#FF6A00" />
        <Cyl p={[L * 0.3, H + D / 2 + chim / 2 - 0.2, 0]} r={s * 0.17} rt={s * 0.13} h={chim} c="#4A3A2E" />
        {[0.2, 0.55, 0.85].map((k) => <Box key={k} p={[-L / 2 + L * k, H * 0.1, D / 2 + 0.06]} a={[0.25, H * 0.2, 0.1]} c={DARK} />)}
      </group>; }
    case "conveyor": { const L = Math.min(w * 0.8, s * 4.2), B = s * 0.42, H = 0.9;
      return <group>
        <Box p={[0, H, 0]} a={[L, 0.16, B]} c={DARK} />
        {[-1, 1].map((z) => <Box key={z} p={[0, H + 0.14, z * (B / 2)]} a={[L, 0.28, 0.08]} c={METAL} />)}
        {[-0.45, -0.15, 0.15, 0.45].map((k) => <Box key={k} p={[k * L, H / 2, 0]} a={[0.12, H, B * 0.9]} c={STEEL} />)}
        {Array.from({ length: 6 }, (_, i) => <Cyl key={i} p={[-L / 2 + (L * (i + 0.5)) / 6, H + 0.1, 0]} r={0.11} h={B * 0.96} c={STEEL} rot={[Math.PI / 2, 0, 0]} seg={10} />)}
        {[-0.25, 0.2].map((k) => <Box key={k} p={[k * L, H + 0.5, 0]} a={[B * 0.7, 0.5, B * 0.55]} c={SAFFRON} />)}
      </group>; }
    case "press": { const bw = s * 1.2, bd = s * 0.9, H = Math.min(h * 0.42, s * 1.6);
      return <group>
        <Box p={[0, 0.3, 0]} a={[bw, 0.6, bd]} c={DARK} />
        {[-1, 1].map((x) => <Cyl key={x} p={[x * bw * 0.38, H / 2 + 0.3, 0]} r={0.14} h={H} c={STEEL} seg={10} />)}
        <Box p={[0, H + 0.45, 0]} a={[bw * 0.95, 0.7, bd * 0.8]} c={color} />
        <Cyl p={[0, H - 0.4, 0]} r={0.28} h={H * 0.5} c={METAL} />
        <Box p={[0, 0.75, 0]} a={[bw * 0.6, 0.3, bd * 0.6]} c={STEEL} />
        <Box p={[bw * 0.55, H * 0.45, bd * 0.2]} a={[0.1, 0.5, 0.4]} c={DARK} glow="#33CC66" />
      </group>; }
    case "rack": { const L = s * 1.5, D = s * 0.6, H = Math.min(h * 0.5, 3.4);
      return <group>
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => <Box key={`${x}${z}`} p={[x * L / 2, H / 2, z * D / 2]} a={[0.12, H, 0.12]} c={METAL} />)}
        {[0.2, 0.55, 0.9].map((k) => <Box key={k} p={[0, H * k, 0]} a={[L, 0.1, D]} c={STEEL} />)}
        {[0.2, 0.55, 0.9].flatMap((k, i) => [-0.28, 0.2].map((x) => <Box key={`${k}${x}`} p={[x * L, H * k + 0.38, 0]} a={[L * 0.3, 0.6, D * 0.7]} c={i % 2 ? SAFFRON : "#B5865A"} />))}
      </group>; }
    case "truck": { const L = s * 1.9, W2 = s * 0.8;
      return <group>
        <Box p={[-L * 0.12, 1.15, 0]} a={[L * 0.68, 1.5, W2]} c="#F4E7D3" />
        <Box p={[L * 0.42, 0.95, 0]} a={[L * 0.26, 1.2, W2 * 0.95]} c={color} />
        <Box p={[L * 0.52, 1.2, 0]} a={[0.1, 0.55, W2 * 0.8]} c="#7FB7D8" />
        {[[-0.32, -1], [-0.32, 1], [0.38, -1], [0.38, 1]].map(([x, z]) => <Cyl key={`${x}${z}`} p={[x * L, 0.38, z * W2 * 0.5]} r={0.38} h={0.3} c="#2A2A2A" rot={[Math.PI / 2, 0, 0]} />)}
        <Box p={[-L * 0.12, 0.45, 0]} a={[L * 0.7, 0.2, W2 * 0.9]} c={DARK} />
      </group>; }
    case "filter": { const L = s * 1.1, H = Math.min(h * 0.38, s * 1.2);
      return <group>
        <Box p={[-L / 2, H / 2 + 0.3, 0]} a={[0.3, H, s * 0.9]} c={DARK} />
        <Box p={[L / 2, H / 2 + 0.3, 0]} a={[0.3, H, s * 0.9]} c={DARK} />
        {Array.from({ length: 8 }, (_, i) => <Box key={i} p={[-L / 2 + 0.3 + ((L - 0.6) * (i + 0.5)) / 8, H / 2 + 0.3, 0]} a={[0.1, H * 0.9, s * 0.8]} c={i % 2 ? STEEL : color} />)}
        <Box p={[0, 0.15, 0]} a={[L + 0.6, 0.3, s * 0.5]} c={METAL} />
        <Cyl p={[0, H + 0.6, 0]} r={0.12} h={L} c={STEEL} rot={[0, 0, Math.PI / 2]} />
      </group>; }
    default: { const H = Math.min(h * 0.4, s * 1.4);
      return <group>
        <Box p={[0, 0.25, 0]} a={[s * 1.15, 0.5, s * 0.95]} c={DARK} />
        <Box p={[0, H / 2 + 0.5, 0]} a={[s * 0.95, H, s * 0.75]} c={color} />
        <Cyl p={[0, H + 0.5 + 0.45, 0]} r={s * 0.34} rt={s * 0.14} h={0.9} c={METAL} />
        <Cyl p={[s * 0.62, H * 0.45 + 0.5, 0]} r={s * 0.16} h={s * 0.5} c={DARK} rot={[0, 0, Math.PI / 2]} />
        <Box p={[-s * 0.5, H * 0.55 + 0.5, s * 0.4]} a={[0.5, 0.7, 0.14]} c={STEEL} />
        <Box p={[-s * 0.5, H * 0.55 + 0.7, s * 0.48]} a={[0.1, 0.1, 0.06]} c="#33CC66" glow="#33CC66" />
        <Box p={[s * 0.1, H * 0.5 + 0.5, s * 0.39]} a={[s * 0.5, H * 0.35, 0.06]} c={STEEL} />
      </group>; }
  }
}
