"use client";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { CapsuleGeometry, Color, MeshStandardMaterial, SphereGeometry, BoxGeometry, type Group } from "three";
import { hash, rng } from "./life";

type Role = "operator" | "walker" | "carrier";
type Hat = "hardhat" | "cap" | "turban" | "net";
type Person = {
  x: number; z: number; tx: number; tz: number; wait: number; phase: number; role: Role; top: number; v: number; ax: number; az: number; bx: number; bz: number; toB: boolean;
  look: number; lookTo: number; lookWait: number; yaw: number;
};
type Rig = { root: Group; hips: Group; torso: Group; head: Group; shL: Group; shR: Group; elL: Group; elR: Group; hpL: Group; hpR: Group; knL: Group; knR: Group; crate: Group };
type Look = { shirt: string; pants: string; skin: string; hair: string; hat: Hat; hatColor: string; longHair: boolean; moustache: boolean; height: number };

const SKIN = ["#E7BC96", "#D9A47A", "#C68E63", "#B97C55", "#8D5A3B"];
const HAIR = ["#1B1512", "#2A1D16", "#3A2A20", "#1B1512"];
const SHIRT = ["#2F6FDB", "#5B7FA6", "#E9EEF5", "#F2C230", "#3E7C59", "#C0573A", "#7A5C99"];
const PANTS = ["#35404C", "#2F3A55", "#4A4036", "#3B3B3B"];
const HAT_COLOR = ["#FFD23F", "#F4F1EA", "#FF9933", "#E8E8E8"];
const TURBAN = ["#FF9933", "#F4F1EA", "#8E2C3F", "#2F5D3A"];
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const damp = (cur: number, target: number, rate: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

// Shared shapes and colours: dozens of people reuse one of each, so many workers stay cheap to draw.
const GEO = {
  thigh: new CapsuleGeometry(0.07, 0.34, 4, 8), shin: new CapsuleGeometry(0.058, 0.36, 4, 8), foot: new BoxGeometry(0.11, 0.07, 0.25),
  chest: new CapsuleGeometry(0.17, 0.3, 4, 12), hipBox: new BoxGeometry(0.3, 0.14, 0.2), upper: new CapsuleGeometry(0.05, 0.24, 4, 8), fore: new CapsuleGeometry(0.043, 0.24, 4, 8), hand: new SphereGeometry(0.055, 8, 8),
  head: new SphereGeometry(0.122, 16, 14), neck: new CapsuleGeometry(0.045, 0.06, 3, 8), eye: new SphereGeometry(0.014, 8, 8), nose: new SphereGeometry(0.02, 8, 8), mouth: new BoxGeometry(0.05, 0.009, 0.01), brow: new BoxGeometry(0.04, 0.008, 0.01),
  hairCap: new SphereGeometry(0.13, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), hairBack: new CapsuleGeometry(0.11, 0.18, 4, 8), dome: new SphereGeometry(0.14, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), brim: new BoxGeometry(0.2, 0.022, 0.12), turban: new SphereGeometry(0.15, 14, 10), net: new SphereGeometry(0.133, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), moustache: new BoxGeometry(0.06, 0.014, 0.014),
  crate: new BoxGeometry(0.44, 0.28, 0.34), crateLid: new BoxGeometry(0.38, 0.05, 0.28),
};
const mats = new Map<string, MeshStandardMaterial>();
const mat = (color: string, roughness = 0.8) => { const key = `${color}|${roughness}`; let m = mats.get(key); if (!m) { m = new MeshStandardMaterial({ color: new Color(color), roughness }); mats.set(key, m); } return m; };
const Part = ({ g, c, p, r, s, rough }: { g: keyof typeof GEO; c: string; p?: [number, number, number]; r?: [number, number, number]; s?: [number, number, number]; rough?: number }) => (
  <mesh geometry={GEO[g]} material={mat(c, rough)} position={p} rotation={r} scale={s} />
);

/** People with faces, hair or a hat, and a real walking gait. They are decoration, not data: operators work at their machine, walkers look about and wander, carriers move a crate between two points. */
export function Workers({ id, width, depth, count, scale, hygiene = false }: { id: string; width: number; depth: number; count: number; scale: number; hygiene?: boolean }) {
  const rand = useMemo(() => rng(hash(id)), [id]);
  const people = useMemo<Person[]>(() => Array.from({ length: count }, (_, i) => {
    const role: Role = (["operator", "walker", "carrier"] as const)[(i + (hash(id) % 3)) % 3];
    const at = () => [(rand() - 0.5) * width * 0.74, (rand() - 0.5) * depth * 0.74] as const;
    const [x, z] = at(), [bx, bz] = at();
    return { x, z, tx: x, tz: z, wait: rand() * 3, phase: rand() * 6.28, role, top: 0.95 + rand() * 0.5, v: 0, ax: x, az: z, bx, bz, toB: true, look: 0, lookTo: 0, lookWait: rand() * 2, yaw: rand() * 6.28 };
  }), [count, width, depth, rand, id]);
  const looks = useMemo<Look[]>(() => people.map((_, i) => {
    const h = hash(id) + i * 7919, pick = <T,>(a: T[], k: number) => a[(h >>> k) % a.length];
    const hat: Hat = hygiene ? "net" : (["hardhat", "hardhat", "cap", "turban"] as const)[(h >>> 3) % 4];
    return { shirt: hygiene ? "#F4F1EA" : pick(SHIRT, 5), pants: pick(PANTS, 7), skin: pick(SKIN, 9), hair: pick(HAIR, 11), hat, hatColor: hat === "turban" ? pick(TURBAN, 13) : hygiene ? "#FFFFFF" : hat === "cap" ? pick(SHIRT, 17) : pick(HAT_COLOR, 15), longHair: (h >>> 19) % 5 === 0 && hat !== "turban", moustache: (h >>> 21) % 3 === 0, height: 0.94 + ((h >>> 23) % 13) / 100 };
  }), [people, id, hygiene]);
  const rigs = useRef<(Rig | null)[]>([]);
  const reg = (i: number, key: keyof Rig) => (el: Group | null) => { if (!el) return; const r = (rigs.current[i] ??= {} as Rig); r[key] = el; };

  useFrame(({ clock }, dtRaw) => {
    const t = clock.elapsedTime, dt = Math.min(dtRaw, 0.05);
    people.forEach((w, i) => {
      const rig = rigs.current[i]; if (!rig?.root) return;
      if (!rig.crate || !rig.hips || !rig.torso || !rig.head || !rig.shL || !rig.shR || !rig.elL || !rig.elR || !rig.hpL || !rig.hpR || !rig.knL || !rig.knR) return;
      const carrying = w.role === "carrier" && w.toB;
      const base = 1.15 * scale * w.top * (carrying ? 0.8 : 1);
      if (w.role === "carrier") { w.tx = w.toB ? w.bx : w.ax; w.tz = w.toB ? w.bz : w.az; }
      const dx = w.tx - w.x, dz = w.tz - w.z, dist = Math.hypot(dx, dz), arrived = dist < 0.12 * scale;
      if (arrived) {
        w.wait -= dt;
        if (w.wait <= 0) {
          if (w.role === "carrier") { w.toB = !w.toB; w.wait = 1.2 + rand() * 1.5; }
          else if (w.role === "walker") { w.tx = (rand() - 0.5) * width * 0.78; w.tz = (rand() - 0.5) * depth * 0.78; w.wait = 2 + rand() * 5; }
          else { w.tx = w.ax + (rand() - 0.5) * 1.4 * scale; w.tz = w.az + (rand() - 0.5) * 1.4 * scale; w.wait = 6 + rand() * 8; }
        }
      }
      const target = arrived ? 0 : base * Math.min(1, 0.25 + dist / (1.1 * scale)); // eases to a stop instead of halting
      w.v = damp(w.v, target, 5, dt);
      const walk = clamp(w.v / (1.15 * scale), 0, 1.15);
      if (!arrived && dist > 1e-4) { const step = Math.min(dist, w.v * dt); w.x += (dx / dist) * step; w.z += (dz / dist) * step; }
      w.phase += (w.v / (1.5 * scale)) * Math.PI * 2 * dt; // one stride cycle per 1.5 body-scales walked, so feet match the ground speed
      const moving = walk > 0.08;
      const want = moving ? Math.atan2(dx, dz) : Math.atan2(-w.x, -w.z); // when still, face the machines in the middle of the section
      let diff = want - w.yaw; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); w.yaw += diff * (1 - Math.exp(-(moving ? 6 : 3) * dt));
      const lk = looks[i], φ = w.phase, f = Math.sin(φ), c = Math.cos(φ);
      const root = rig.root;
      root.rotation.y = w.yaw;
      root.position.set(w.x, 0.25 + walk * 0.03 * scale * (1 - Math.cos(2 * φ)) * 0.5, w.z);
      rig.hips.position.x = Math.sin(φ) * 0.012 * walk; rig.hips.rotation.z = Math.sin(φ) * 0.04 * walk;
      rig.torso.rotation.y = f * 0.13 * walk; rig.torso.rotation.x = 0.06 * walk + (carrying ? -0.1 : 0) + (!moving && w.role === "operator" ? 0.12 : 0);
      rig.torso.scale.y = 1 + Math.sin(t * 1.6 + w.phase) * 0.008; // breathing
      // legs: thighs swing opposite each other, knees bend while the leg swings forward
      const A = 0.62 * walk;
      rig.hpL.rotation.x = -f * A; rig.hpR.rotation.x = f * A;
      rig.knL.rotation.x = Math.max(0, c) * 0.95 * walk + 0.04; rig.knR.rotation.x = Math.max(0, -c) * 0.95 * walk + 0.04;
      // arms: swing against the legs with a relaxed elbow; at rest they hang, at a machine the hands work, carriers hold the crate in front
      if (carrying) {
        rig.shL.rotation.x = rig.shR.rotation.x = -1.05; rig.elL.rotation.x = rig.elR.rotation.x = -0.55; rig.shL.rotation.z = 0.12; rig.shR.rotation.z = -0.12;
      } else if (moving) {
        rig.shL.rotation.x = f * 0.5 * walk; rig.shR.rotation.x = -f * 0.5 * walk; rig.elL.rotation.x = -(0.2 + 0.35 * Math.max(0, -f)) * walk; rig.elR.rotation.x = -(0.2 + 0.35 * Math.max(0, f)) * walk; rig.shL.rotation.z = rig.shR.rotation.z = 0;
      } else if (w.role === "operator") {
        const work = Math.sin(t * 2.6 + w.phase);
        rig.shL.rotation.x = -0.85 + work * 0.14; rig.shR.rotation.x = -0.8 - work * 0.14; rig.elL.rotation.x = -0.95 + Math.sin(t * 3.1 + w.phase) * 0.2; rig.elR.rotation.x = -0.9 - Math.sin(t * 3.1 + w.phase) * 0.2; rig.shL.rotation.z = 0.1; rig.shR.rotation.z = -0.1;
      } else {
        const breathe = Math.sin(t * 1.6 + w.phase) * 0.03;
        rig.shL.rotation.x = breathe; rig.shR.rotation.x = -breathe; rig.elL.rotation.x = rig.elR.rotation.x = -0.12; rig.shL.rotation.z = 0.06; rig.shR.rotation.z = -0.06;
      }
      // head: looks ahead when walking, down at the work when operating, and glances around when idle
      w.lookWait -= dt;
      if (w.lookWait <= 0) { w.lookTo = moving ? 0 : (rand() - 0.5) * 1.5; w.lookWait = 1.4 + rand() * 3.2; }
      w.look = damp(w.look, moving ? clamp(diff * 0.6, -0.6, 0.6) : w.lookTo, 3.5, dt);
      rig.head.rotation.y = w.look; rig.head.rotation.x = (!moving && w.role === "operator" ? 0.32 + Math.max(0, Math.sin(t * 0.5 + w.phase) - 0.7) * -1.1 : 0.04) - f * 0.02 * walk;
      rig.crate.visible = carrying;
    });
  });
  return (
    <>
      {people.map((w, i) => { const lk = looks[i]; return (
        <group key={i} ref={reg(i, "root")} position={[w.x, 0.25, w.z]} scale={scale * lk.height}>
          <group ref={reg(i, "hips")} position={[0, 0.84, 0]}>
            <Part g="hipBox" c={lk.pants} p={[0, 0.02, 0]} />
            {([["hpL", "knL", -1], ["hpR", "knR", 1]] as const).map(([hp, kn, side]) => (
              <group key={hp} ref={reg(i, hp)} position={[side * 0.09, 0, 0]}>
                <Part g="thigh" c={lk.pants} p={[0, -0.22, 0]} />
                <group ref={reg(i, kn)} position={[0, -0.42, 0]}><Part g="shin" c={lk.pants} p={[0, -0.22, 0]} /><Part g="foot" c="#1E2329" p={[0, -0.47, 0.05]} /></group>
              </group>
            ))}
            <group ref={reg(i, "torso")} position={[0, 0.05, 0]}>
              <Part g="chest" c={lk.shirt} p={[0, 0.3, 0]} rough={0.7} />
              {([["shL", "elL", -1], ["shR", "elR", 1]] as const).map(([sh, el, side]) => (
                <group key={sh} ref={reg(i, sh)} position={[side * 0.235, 0.5, 0]}>
                  <Part g="upper" c={lk.shirt} p={[0, -0.16, 0]} />
                  <group ref={reg(i, el)} position={[0, -0.31, 0]}><Part g="fore" c={lk.skin} p={[0, -0.15, 0]} /><Part g="hand" c={lk.skin} p={[0, -0.32, 0]} /></group>
                </group>
              ))}
              <Part g="neck" c={lk.skin} p={[0, 0.66, 0]} />
              <group ref={reg(i, "head")} position={[0, 0.78, 0]}>
                <Part g="head" c={lk.skin} rough={0.75} />
                <Part g="eye" c="#1B1B1B" p={[-0.047, 0.018, 0.108]} /><Part g="eye" c="#1B1B1B" p={[0.047, 0.018, 0.108]} />
                <Part g="brow" c={lk.hair} p={[-0.047, 0.05, 0.112]} /><Part g="brow" c={lk.hair} p={[0.047, 0.05, 0.112]} />
                <Part g="nose" c={lk.skin} p={[0, -0.012, 0.122]} s={[1, 1.1, 1.2]} rough={0.9} />
                <Part g="mouth" c="#7A3B34" p={[0, -0.055, 0.112]} />
                {lk.moustache ? <Part g="moustache" c={lk.hair} p={[0, -0.035, 0.118]} /> : null}
                {lk.hat === "turban" ? <Part g="turban" c={lk.hatColor} p={[0, 0.045, -0.005]} s={[1, 0.78, 1.05]} /> : (
                  <>
                    {lk.hat !== "net" ? <Part g="hairCap" c={lk.hair} p={[0, 0.0, -0.012]} /> : null}
                    {lk.longHair && lk.hat !== "net" ? <Part g="hairBack" c={lk.hair} p={[0, -0.1, -0.075]} /> : null}
                    {lk.hat === "net" ? <Part g="net" c={lk.hatColor} p={[0, 0.012, -0.008]} rough={0.5} /> : <Part g="dome" c={lk.hatColor} p={[0, 0.05, 0]} s={lk.hat === "cap" ? [0.95, 0.7, 0.95] : [1, 1, 1]} />}
                    {lk.hat === "hardhat" || lk.hat === "cap" ? <Part g="brim" c={lk.hatColor} p={[0, 0.062, 0.105]} /> : null}
                  </>
                )}
              </group>
              <group ref={reg(i, "crate")} position={[0, 0.3, 0.42]} visible={false}><Part g="crate" c="#B5865A" /><Part g="crateLid" c="#D8B98A" p={[0, 0.16, 0]} /></group>
            </group>
          </group>
        </group>
      ); })}
    </>
  );
}
