"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { GestureBus } from "@/lib/gesture-bus";
import { FlowArrows } from "./flow-and-people";
import { Cows, HenBarn, Pasture, Smoke, Vehicles } from "./life";
import { Workers } from "./people";
import { MaterialFlow } from "./material-flow";
import { burnsFuel, isPoultry, useSmokeLevel } from "@/lib/ops-bus";
import { WaterRoutes, type RouteLine } from "./water-routes";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Machine } from "./machines";
import { CanvasTexture, Color, Raycaster, Spherical, Vector2, Vector3, type Group, type Object3D } from "three";
import { cameraSetup, defaultVehicles, propKind, type PropKind, type V3 } from "@/lib/factory-geometry";
import { zoneColor, type LayoutResult, type Zone } from "@/lib/layout-api";

const PROP_COLOR: Record<PropKind, string> = { tank: "#C9B8A3", silo: "#D9CBB5", boiler: "#9A5B38", furnace: "#6B3A24", conveyor: "#5A4A3A", press: "#7B6650", rack: "#A98C68", truck: "#E0A040", filter: "#9C8B75", machine: "#8A765F" };

function ZoneProps({ zone }: { zone: Zone }) {
  const w = zone.width_m - 0.4, d = zone.depth_m - 0.4, h = zone.height_m;
  const names = zone.equipment.length ? zone.equipment.slice(0, 4) : [zone.label];
  const unit = Math.min(w, d);
  const slots: [number, number][] = names.length === 1 ? [[0, 0]] : names.length === 2 ? [[-w * 0.2, -d * 0.15], [w * 0.2, d * 0.15]] : [[-w * 0.22, -d * 0.22], [w * 0.22, -d * 0.22], [-w * 0.22, d * 0.22], [w * 0.22, d * 0.22]];
  const s = Math.max(0.9, unit * (names.length === 1 ? 0.3 : 0.2));
  return (
    <>
      {names.map((name, i) => {
        const kind = propKind(name); const [px, pz] = slots[i];
        return <group key={`${name}-${i}`} position={[px, 0.25, pz]}><Machine kind={kind} s={s} h={h} color={PROP_COLOR[kind]} w={w * (names.length === 1 ? 0.8 : 0.45)} /></group>;
      })}
    </>
  );
}

/** A zone rises out of the floor when it is shown, so the plant can be built up one step at a time. */
function BuildIn({ show, rise = false, position, children }: { show: boolean; rise?: boolean; position: V3; children: ReactNode }) {
  const ref = useRef<Group>(null);
  const [initial] = useState(() => (show && !rise ? 1 : 0.0001)); // a newly added zone rises out of the floor; one already standing does not replay // already-shown zones do not replay their rise on a remount
  useFrame((_, dt) => {
    const g = ref.current; if (!g) return;
    const target = show ? 1 : 0.0001;
    g.scale.y += (target - g.scale.y) * (1 - Math.exp(-dt * 5.5));
    g.visible = g.scale.y > 0.012;
  });
  return <group ref={ref} position={position} scale={[1, initial, 1]}>{children}</group>;
}

function Badge({ n, label, size, y, showLabel }: { n: number; label: string; size: number; y: number; showLabel: boolean }) {
  const { texture, aspect } = useMemo(() => {
    const canvas = document.createElement("canvas"); const g = canvas.getContext("2d")!;
    g.font = "600 40px sans-serif";
    const text = showLabel ? label.slice(0, 26) : "";
    const textW = text ? g.measureText(text).width + 36 : 0;
    canvas.width = 96 + textW; canvas.height = 96;
    const c = canvas.getContext("2d")!;
    if (text) { c.fillStyle = "rgba(255,248,238,.94)"; c.strokeStyle = "#E8780C"; c.lineWidth = 4; c.beginPath(); c.roundRect(40, 14, textW + 36, 68, 34); c.fill(); c.stroke(); c.fillStyle = "#2A1A0C"; c.font = "600 38px sans-serif"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText(text, 100, 50); }
    c.beginPath(); c.arc(48, 48, 42, 0, Math.PI * 2); c.fillStyle = "#FF9933"; c.fill(); c.lineWidth = 6; c.strokeStyle = "#ffffff"; c.stroke();
    c.fillStyle = "#2A1A0C"; c.font = "700 46px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(n), 48, 51);
    return { texture: new CanvasTexture(canvas), aspect: canvas.width / canvas.height };
  }, [n, label, showLabel]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite position={[showLabel ? size * aspect * 0.32 : 0, y, 0]} scale={[size * aspect, size, 1]}><spriteMaterial map={texture} depthTest={false} transparent /></sprite>;
}

/** A soft pulsing ring on the ground under the step being looked at. */
function ActiveRing({ x, z, r }: { x: number; z: number; r: number }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => { if (ref.current) { const k = 1 + 0.07 * Math.sin(clock.elapsedTime * 3.2); ref.current.scale.set(k, 1, k); } });
  return <group ref={ref} position={[x, 0.32, z]}><mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[r * 0.96, r, 56]} /><meshBasicMaterial color="#FF9933" transparent opacity={0.9} /></mesh></group>;
}

/** During the tour the camera glides toward the active step; the user can drag at any time to take over. */
function TourRig({ target, reach }: { target?: V3; reach: number }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target: { x: number; y: number; z: number; lerp: (v: unknown, k: number) => void; set: (x: number, y: number, z: number) => void }; update: () => void } | null;
  const want = useMemo(() => new Vector3(), []);
  const aim = useMemo(() => new Vector3(), []);
  useFrame(() => {
    if (!target || !controls) return;
    aim.set(target[0], target[1] + 1, target[2]);
    controls.target.lerp(aim, 0.06);
    // keep the current viewing direction but come in closer, and a little higher
    want.copy(camera.position).sub(controls.target as unknown as Vector3);
    const len = want.length() || 1;
    want.multiplyScalar(Math.max(reach * 0.62, 12) / len).add(controls.target as unknown as Vector3);
    want.setY(Math.max(want.y, reach * 0.34));
    camera.position.lerp(want, 0.05);
    controls.update();
  });
  return null;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Applies hand-control rotation and zoom to the camera, and works out which section the pointing hand is over. */
function GestureRig({ cmd, reach, onHover, onTap }: { cmd: GestureBus; reach: number; onHover: (id?: string) => void; onTap: (id?: string) => void }) {
  const { camera, scene } = useThree();
  const controls = useThree((s) => s.controls) as unknown as { target: Vector3; update: () => void } | null;
  const tools = useMemo(() => ({ off: new Vector3(), sph: new Spherical(), ndc: new Vector2(), ray: new Raycaster(), zero: new Vector3() }), []);
  const hovered = useRef<string | undefined>(undefined);
  const since = useRef(0);
  const pick = (x: number, y: number): string | undefined => {
    const hits: Object3D[] = []; scene.traverse((o) => { if (o.userData?.zoneId) hits.push(o); });
    tools.ndc.set(x * 2 - 1, -(y * 2 - 1)); tools.ray.setFromCamera(tools.ndc, camera);
    return tools.ray.intersectObjects(hits, false)[0]?.object.userData.zoneId as string | undefined;
  };
  useFrame((_, dt) => {
    const motion = cmd.takeMotion();
    if (motion) {
      const target = controls?.target ?? tools.zero;
      const off = camera.position.clone().sub(target); const sph = new Spherical().setFromVector3(off);
      sph.theta -= motion.rotate[0] * 4.2; sph.phi = clamp(sph.phi - motion.rotate[1] * 2.6, 0.2, Math.PI / 2.05);
      sph.radius = clamp(sph.radius / motion.zoom, reach * 0.4, reach * 2.4);
      camera.position.copy(target).add(off.setFromSpherical(sph)); camera.lookAt(target); controls?.update();
    }
    since.current += dt;
    const tap = cmd.takeTap();
    if (tap) onTap(pick(tap.x, tap.y));
    if (since.current > 0.06) {
      since.current = 0;
      const p = cmd.pointer;
      const id = p ? pick(p.x, p.y) : undefined;
      if (id !== hovered.current && (p || hovered.current)) { hovered.current = id; onHover(id); }
    }
  });
  return null;
}

// Re-frames the camera in place; remounting the Canvas on a key change triggers a React render-phase unmount error.
function CameraRig({ W, D, resetKey }: { W: number; D: number; resetKey: number }) {
  const camera = useThree((state) => state.camera);
  useEffect(() => { camera.position.set(...cameraSetup(W, D).position); camera.lookAt(0, 0, 0); }, [camera, W, D, resetKey]);
  return null;
}

export function Factory3D({ layout, dark, solar, flow, labels, activeId, tourId, highlightIds, builtCount = Infinity, resetKey, onActive, onPick, onOpen, onUserMove, gesture, onGestureTap, routes }: { routes?: RouteLine[]; gesture?: GestureBus; onGestureTap?: (id?: string) => void; onOpen?: (id: string) => void; builtCount?: number; highlightIds?: string[]; layout: LayoutResult; dark: boolean; solar: boolean; flow: boolean; labels: boolean; activeId?: string; tourId?: string; resetKey: number; onActive: (id?: string) => void; onPick: (id: string) => void; onUserMove?: () => void }) {
  const { width_m: W, depth_m: D } = layout;
  const smoke = useSmokeLevel();
  const hygiene = /food|dairy|milk|egg|pickle|flour|fruit|juice|bakery|sweet|curd|butter|ghee|mango/i.test(layout.industry + " " + layout.label);
  const reach = Math.max(W, D);
  const workerCount = (z: Zone) => (z.step ? Math.min(3, Math.max(1, Math.round(z.area_m2 / 110))) : z.kind === "office" ? 2 : 0);
  const vehicles = useMemo(() => (layout.vehicles.length ? layout.vehicles : defaultVehicles(layout)), [layout]);
  const to3 = (x: number, y: number) => [x - W / 2, -(y - D / 2)] as const; // plot north -> -z, so the camera looks north from the south
  const flowPoints: V3[] = useMemo(() => {
    if (!layout.flow.length) return [];
    const byId = new Map(layout.zones.map((z) => [z.zone_id, z]));
    const ids = [layout.flow[0].from_id, ...layout.flow.map((e) => e.to_id)];
    const stops = ids.map((id) => { const z = byId.get(id)!; return [z.x + z.width_m / 2 - W / 2, z.elevation_m + Math.max(2.4, reach / 26), -(z.y + z.depth_m / 2 - D / 2)] as V3; });
    return [[layout.entry.x - W / 2, Math.max(2.4, reach / 26), -(layout.entry.y - D / 2)] as V3, ...stops];
  }, [layout, W, D, reach]);
  const flowColors = useMemo(() => {
    if (!layout.flow.length) return [];
    const byId = new Map(layout.zones.map((z) => [z.zone_id, z]));
    const ids = [layout.flow[0].from_id, ...layout.flow.map((e) => e.to_id)];
    return [zoneColor[byId.get(ids[0])!.kind], ...ids.map((id) => zoneColor[byId.get(id)!.kind])];
  }, [layout]);
  const stepsTotal = layout.zones.filter((z) => z.step).length;
  const building = builtCount <= stepsTotal;
  const activeZone = layout.zones.find((z) => z.zone_id === activeId);
  const tourZone = layout.zones.find((z) => z.zone_id === tourId);
  const tourTarget: V3 | undefined = tourZone ? [tourZone.x + tourZone.width_m / 2 - W / 2, tourZone.elevation_m, -(tourZone.y + tourZone.depth_m / 2 - D / 2)] : undefined;
  const ground = dark ? "#1B2742" : "#F0E4D0";
  const edge = dark ? "#E8EEFB" : "#3B2616";
  return (
    <Canvas camera={{ position: cameraSetup(W, D).position, fov: 34 }} dpr={[1, 2]} aria-label="3D factory layout">
      <ambientLight intensity={dark ? 0.85 : 1.1} />
      <directionalLight position={[reach, reach * 1.3, reach * 0.6]} intensity={dark ? 1.2 : 1.7} />
      <mesh position={[0, -0.25, 0]}><boxGeometry args={[W, 0.5, D]} /><meshStandardMaterial color={ground} /></mesh>
      {layout.zones.map((z) => {
        const [x, zz] = to3(z.x + z.width_m / 2, z.y + z.depth_m / 2);
        const dim = activeId && activeId !== z.zone_id;
        const hot = activeId === z.zone_id;
        const gap = Math.max(0.9, reach * 0.02); // clear aisles between zones
        const iw = z.width_m - gap, id = z.depth_m - gap;
        const shownNow = z.step ? z.step <= builtCount : builtCount > stepsTotal;
        const fresh = Boolean(highlightIds?.includes(z.zone_id)); // a step the improvements would add
        return (
          <BuildIn key={z.zone_id} show={shownNow} rise={fresh} position={[x, z.elevation_m, zz]}>
            <mesh position={[0, 0.12, 0]}><boxGeometry args={[iw, 0.25, id]} /><meshStandardMaterial color={zoneColor[z.kind]} transparent opacity={dim ? 0.35 : z.level > 0 ? 0.55 : 1} /></mesh>
            {/* an invisible box makes the whole zone hoverable and clickable; there are no glass walls, so the machines and people stay in plain view */}
            <mesh position={[0, Math.min(z.height_m, 8) / 2, 0]} onPointerOver={(e) => { e.stopPropagation(); onActive(z.zone_id); }} onPointerOut={() => onActive(undefined)} onClick={(e) => { e.stopPropagation(); onPick(z.zone_id); }} onDoubleClick={(e) => { e.stopPropagation(); onOpen?.(z.zone_id); }} userData={{ zoneId: z.zone_id }}>
              <boxGeometry args={[iw, Math.min(z.height_m, 8), id]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
            </mesh>
            {z.level > 0 ? <group>
              <mesh position={[0, -0.12, 0]}><boxGeometry args={[iw + 0.8, 0.55, id + 0.8]} /><meshStandardMaterial color="#C9C2B4" transparent opacity={0.55} /></mesh>
              {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <mesh key={`c${sx}${sz}`} position={[(sx * iw) / 2, -z.elevation_m / 2, (sz * id) / 2]}><boxGeometry args={[0.7, z.elevation_m, 0.7]} /><meshStandardMaterial color="#B8B2A5" /></mesh>)}
            </group> : null}
            {z.kind === "livestock" ? (isPoultry(`${z.label} ${z.note} ${z.equipment.join(" ")}`) ? null : <Pasture width={iw} depth={id} scale={Math.max(1.2, reach / 38)} />) : [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <mesh key={`${sx}${sz}`} position={[(sx * iw) / 2, 0.45, (sz * id) / 2]}><boxGeometry args={[0.45, 0.9, 0.45]} /><meshStandardMaterial color={fresh ? "#138808" : hot ? "#FF9933" : zoneColor[z.kind]} /></mesh>)}
            {hot ? <mesh position={[0, 0.3, 0]}><boxGeometry args={[iw + 0.4, 0.06, id + 0.4]} /><meshBasicMaterial color="#FF9933" transparent opacity={0.4} /></mesh> : null}
            {fresh ? <mesh position={[0, 0.3, 0]}><boxGeometry args={[iw + 1.2, 0.08, id + 1.2]} /><meshBasicMaterial color="#2FBF4A" transparent opacity={0.55} /></mesh> : null}
            {z.kind === "livestock" && isPoultry(`${z.label} ${z.note} ${z.equipment.join(" ")}`) ? <HenBarn id={z.zone_id} width={iw * 0.9} depth={id * 0.9} scale={Math.max(1, reach / 42)} /> : z.kind === "livestock" ? <Cows id={z.zone_id} width={iw * 0.86} depth={id * 0.86} count={Math.min(8, Math.max(2, Math.round(z.area_m2 / 85)))} scale={Math.max(1.25, reach / 36)} /> : <ZoneProps zone={z} />}
            {solar && z.step && z.kind !== "livestock" ? <group>{[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <mesh key={`${sx}${sz}`} position={[sx * iw * 0.15, z.height_m / 2, sz * id * 0.15]}><boxGeometry args={[0.18, z.height_m, 0.18]} /><meshStandardMaterial color="#8A939E" /></mesh>)}<mesh position={[0, z.height_m + 0.15, 0]}><boxGeometry args={[iw * 0.34, 0.22, id * 0.34]} /><meshStandardMaterial color="#3E5568" metalness={0.5} roughness={0.35} transparent opacity={0.62} /></mesh></group> : null}
            {workerCount(z) > 0 && z.kind !== "livestock" ? <Workers id={z.zone_id} width={iw} depth={id} count={workerCount(z)} scale={Math.max(1.4, reach / 27)} hygiene={hygiene} /> : null}
            {z.step && z.kind !== "livestock" && burnsFuel(`${z.label} ${z.equipment.join(" ")}`) ? <group position={[iw * 0.36, 0, -id * 0.36]}><Smoke height={z.height_m + Math.max(12, reach * 0.45)} level={smoke} scale={Math.max(1, reach / 40)} /></group> : null}
            {z.step ? <Badge n={z.step} label={z.label} showLabel={labels} size={Math.max(2.2, reach / 24)} y={z.height_m + Math.max(2, reach / 30)} /> : null}
          </BuildIn>
        );
      })}
      {activeZone ? <ActiveRing x={activeZone.x + activeZone.width_m / 2 - W / 2} z={-(activeZone.y + activeZone.depth_m / 2 - D / 2)} r={Math.max(activeZone.width_m, activeZone.depth_m) * 0.56} /> : null}
      {flow && !building && flowPoints.length >= 2 ? <FlowArrows points={flowPoints} colors={flowColors} size={Math.max(0.9, reach / 62)} /> : null}
      {flow && !building ? <MaterialFlow layout={layout} reach={reach} byproductName={layout.waste_streams[0]?.by_product_ideas[0]} /> : null}
      {routes?.length ? <WaterRoutes layout={layout} routes={routes} reach={reach} /> : null}
      {vehicles.length ? <Vehicles layout={layout} list={vehicles} reach={reach} /> : null}
      <CameraRig W={W} D={D} resetKey={resetKey} />
      <TourRig target={tourTarget} reach={reach} />
      {gesture ? <GestureRig cmd={gesture} reach={reach} onHover={onActive} onTap={(id) => onGestureTap?.(id)} /> : null}
      <OrbitControls makeDefault enableDamping onStart={onUserMove} maxPolarAngle={Math.PI / 2.05} minDistance={reach * 0.4} maxDistance={reach * 2.4} />
    </Canvas>
  );
}
