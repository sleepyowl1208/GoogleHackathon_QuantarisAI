"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, CatmullRomCurve3, Vector3, type Group } from "three";
import type { LayoutResult } from "@/lib/layout-api";
import { flowNames, formIndexAfter, kitFor, type Form } from "@/lib/material-kit";

const LOOP_SECONDS = 34;

function Piece({ form, s }: { form: Form; s: number }) {
  const [w, h, d] = form.size.map((n) => n * s) as [number, number, number];
  const accent = form.accent;
  switch (form.shape) {
    case "sphere": return <mesh position={[0, h / 2, 0]}><sphereGeometry args={[w / 2, 10, 8]} /><meshStandardMaterial color={form.color} roughness={0.6} /></mesh>;
    case "egg": return <mesh position={[0, h / 2, 0]} scale={[1, 1.25, 1]}><sphereGeometry args={[w / 2, 10, 8]} /><meshStandardMaterial color={form.color} roughness={0.7} /></mesh>;
    case "cylinder": return <group><mesh position={[0, h / 2, 0]}><cylinderGeometry args={[w / 2, w / 2, h, 12]} /><meshStandardMaterial color={form.color} metalness={0.2} roughness={0.5} /></mesh>{accent ? <mesh position={[0, h, 0]}><cylinderGeometry args={[w / 2.3, w / 2.3, h * 0.12, 12]} /><meshStandardMaterial color={accent} /></mesh> : null}</group>;
    case "roll": return <mesh position={[0, w / 2, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[w / 2, w / 2, d, 12]} /><meshStandardMaterial color={form.color} roughness={0.8} /></mesh>;
    case "bar": return <mesh position={[0, h / 2, 0]}><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={form.color} metalness={0.55} roughness={0.4} /></mesh>;
    case "sack": return <group><mesh position={[0, h / 2, 0]}><boxGeometry args={[w, h * 0.9, d]} /><meshStandardMaterial color={form.color} roughness={0.95} /></mesh><mesh position={[0, h * 0.95, 0]}><boxGeometry args={[w * 0.5, h * 0.12, d * 0.5]} /><meshStandardMaterial color={form.color} roughness={0.95} /></mesh>{accent ? <mesh position={[0, h * 0.5, d / 2 + 0.002]}><boxGeometry args={[w * 0.5, h * 0.22, 0.004]} /><meshStandardMaterial color={accent} /></mesh> : null}</group>;
    default: return <group><mesh position={[0, h / 2, 0]}><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={form.color} roughness={0.85} /></mesh>{accent ? <mesh position={[0, h / 2, 0]}><boxGeometry args={[w * 1.02, h * 0.16, d * 1.02]} /><meshStandardMaterial color={accent} /></mesh> : null}</group>;
  }
}

/** A sprite label that stays readable from any angle. */
function Tag({ text, position, size, tone }: { text: string; position: [number, number, number]; size: number; tone: "in" | "out" | "by" }) {
  const { texture, aspect } = useMemo(() => {
    const canvas = document.createElement("canvas"); const ctx = canvas.getContext("2d")!;
    ctx.font = "700 40px sans-serif";
    const w = Math.ceil(ctx.measureText(text).width) + 56; canvas.width = w; canvas.height = 76;
    const c = canvas.getContext("2d")!;
    const colour = tone === "in" ? "#138808" : tone === "out" ? "#E8780C" : "#6B5B2A";
    c.fillStyle = "rgba(255,250,240,.96)"; c.strokeStyle = colour; c.lineWidth = 5; c.beginPath(); c.roundRect(4, 4, w - 8, 68, 34); c.fill(); c.stroke();
    c.fillStyle = "#2A1A0C"; c.font = "700 36px sans-serif"; c.textBaseline = "middle"; c.fillText(text, 28, 40);
    return { texture: new CanvasTexture(canvas), aspect: w / 76 };
  }, [text, tone]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite position={position} scale={[size * aspect, size, 1]}><spriteMaterial map={texture} depthTest={false} transparent /></sprite>;
}

/** The material itself, moving through the plant: raw material comes in at the entry, changes form as it passes the steps, and the finished product leaves. By-products go to their bay. */
export function MaterialFlow({ layout, reach, byproductName }: { layout: LayoutResult; reach: number; byproductName?: string }) {
  const { width_m: W, depth_m: D } = layout;
  const s = Math.max(1.4, reach / 24); // pieces are drawn large enough to read from the overview camera
  const kit = useMemo(() => kitFor(`${layout.industry} ${layout.label}`), [layout.industry, layout.label]);
  const names = useMemo(() => flowNames(layout.zones), [layout.zones]);
  const to3 = (x: number, y: number, h: number) => new Vector3(x - W / 2, h, -(y - D / 2));
  const model = useMemo(() => {
    if (!layout.flow.length) return undefined;
    const byId = new Map(layout.zones.map((z) => [z.zone_id, z]));
    const ids = [layout.flow[0].from_id, ...layout.flow.map((e) => e.to_id)].filter((id) => byId.has(id));
    const stops = ids.map((id) => { const z = byId.get(id)!; return { kind: z.kind, p: to3(z.x + z.width_m / 2, z.y + z.depth_m / 2, z.elevation_m + 0.85 * s) }; });
    const entry = to3(layout.entry.x, layout.entry.y, 0.85 * s), exit = to3(layout.exit.x, layout.exit.y, 0.85 * s);
    const curve = new CatmullRomCurve3([entry, ...stops.map((x) => x.p), exit], false, "centripetal", 0.5);
    const samples = curve.getPoints(240);
    const at = stops.map((st) => ({ kind: st.kind, t: samples.reduce((best, p, i) => (p.distanceTo(st.p) < best.d ? { d: p.distanceTo(st.p), i } : best), { d: Infinity, i: 0 }).i / 240 }));
    return { curve, at, entry, exit };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, s]);
  const side = useMemo(() => {
    const bp = layout.zones.find((z) => z.kind === "byproduct");
    if (!bp) return undefined;
    const sources = layout.zones.filter((z) => z.step && z.kind === "process");
    const from = sources.sort((a, b) => b.area_m2 - a.area_m2)[0] ?? layout.zones.find((z) => z.step);
    if (!from) return undefined;
    const a = to3(from.x + from.width_m / 2, from.y + from.depth_m / 2, from.elevation_m + 0.6 * s), b = to3(bp.x + bp.width_m / 2, bp.y + bp.depth_m / 2, 0.6 * s);
    const mid = a.clone().lerp(b, 0.5); mid.y += 1.2 * s;
    return { curve: new CatmullRomCurve3([a, mid, b]), end: b };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, s]);
  const count = 9, sideCount = 4;
  const items = useRef<(Group | null)[]>([]), sideItems = useRef<(Group | null)[]>([]);
  const forms = useRef<(Group | null)[][]>([]);
  useFrame(({ clock }) => {
    if (!model) return;
    const base = clock.elapsedTime / LOOP_SECONDS;
    items.current.forEach((g, i) => {
      if (!g) return;
      const t = (base + i / count) % 1;
      const p = model.curve.getPointAt(t), tan = model.curve.getTangentAt(t);
      g.position.copy(p); g.rotation.y = Math.atan2(tan.x, tan.z);
      const passed = model.at.filter((a) => a.t <= t).pop();
      const idx = passed ? formIndexAfter(passed.kind) : 0;
      (forms.current[i] ?? []).forEach((f, k) => { if (f) f.visible = k === idx; });
      g.scale.setScalar(Math.min(1, t * 22, (1 - t) * 22)); // appears at the door, leaves at the dock
    });
    sideItems.current.forEach((g, i) => {
      if (!g || !side) return;
      const t = (base * 1.4 + i / sideCount) % 1;
      g.position.copy(side.curve.getPointAt(t)); g.scale.setScalar(Math.min(1, t * 10, (1 - t) * 10));
    });
  });
  if (!model) return null;
  const tag = Math.max(2.4, reach / 20);
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <group key={i} ref={(el) => { items.current[i] = el; }}>
          {[kit.raw, kit.mid, kit.product].map((f, k) => <group key={k} ref={(el) => { (forms.current[i] ??= [])[k] = el; }} visible={k === 0}><Piece form={f} s={s} /></group>)}
        </group>
      ))}
      <Tag text={`▶ ${names.raw ? `In: ${names.raw}` : "Raw material in"}`} position={[model.entry.x, model.entry.y + tag * 1.4, model.entry.z]} size={tag} tone="in" />
      <Tag text={`${names.product ? `Out: ${names.product}` : "Product out"} ▶`} position={[model.exit.x, model.exit.y + tag * 1.4, model.exit.z]} size={tag} tone="out" />
      {side ? (
        <>
          {Array.from({ length: sideCount }, (_, i) => <group key={i} ref={(el) => { sideItems.current[i] = el; }}><Piece form={{ shape: "sack", color: "#6B8E3A", accent: "#E8B923", size: [0.26, 0.3, 0.2] }} s={s} /></group>)}
          <Tag text={byproductName ? `By-product: ${byproductName.slice(0, 30)}` : "By-product"} position={[side.end.x, side.end.y + tag * 1.2, side.end.z]} size={tag * 0.85} tone="by" />
        </>
      ) : null}
    </>
  );
}
