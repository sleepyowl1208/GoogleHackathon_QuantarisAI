"use client";
import { zoneColor, type LayoutResult } from "@/lib/layout-api";

export function PlanView({ layout, activeId, highlightIds, onActive }: { layout: LayoutResult; activeId?: string; highlightIds?: string[]; onActive: (id?: string) => void }) {
  const { width_m: W, depth_m: D } = layout;
  const flip = (y: number) => D - y; // plot y runs north; SVG y runs down
  const byId = new Map(layout.zones.map((z) => [z.zone_id, z]));
  const center = (id: string) => { const z = byId.get(id)!; return { x: z.x + z.width_m / 2, y: flip(z.y + z.depth_m / 2) }; };
  const path = layout.flow.length ? [center(layout.flow[0].from_id), ...layout.flow.map((e) => center(e.to_id))] : [];
  const unit = Math.max(W, D) / 60;
  return (
    <svg className="bp-plan" viewBox={`${-W * 0.04} ${-D * 0.04} ${W * 1.08} ${D * 1.08}`} role="img" aria-label={`Top-down plan of a ${W} by ${D} metre plot`}>
      <rect x={0} y={0} width={W} height={D} className="bp-plot" />
      {layout.zones.map((z) => (
        <g key={z.zone_id} onMouseEnter={() => onActive(z.zone_id)} onMouseLeave={() => onActive(undefined)}>
          <rect x={z.x + 0.15} y={flip(z.y + z.depth_m) + 0.15} width={z.width_m - 0.3} height={z.depth_m - 0.3} fill={zoneColor[z.kind]} opacity={activeId && activeId !== z.zone_id ? 0.45 : z.level > 0 ? 0.72 : 0.95} className="bp-zone" rx={unit * 0.3} stroke={highlightIds?.includes(z.zone_id) ? "#138808" : z.level > 0 ? "#2A1A0C" : undefined} strokeWidth={highlightIds?.includes(z.zone_id) ? unit * 0.5 : z.level > 0 ? unit * 0.3 : undefined} strokeDasharray={highlightIds?.includes(z.zone_id) ? `${unit} ${unit * 0.6}` : z.level > 0 ? `${unit * 0.8} ${unit * 0.5}` : undefined} />
          {z.step ? <text x={z.x + z.width_m / 2} y={flip(z.y + z.depth_m / 2)} className="bp-step" fontSize={unit * 2.2} textAnchor="middle" dominantBaseline="central">{z.step}</text> : null}
        </g>
      ))}
      {path.length ? <polyline points={path.map((p) => `${p.x},${p.y}`).join(" ")} className="bp-flow" strokeWidth={unit * 0.35} /> : null}
      <circle cx={layout.entry.x} cy={flip(layout.entry.y)} r={unit * 1.1} className="bp-gate" />
      <text x={layout.entry.x + unit * 1.6} y={flip(layout.entry.y) - unit * 1.6} fontSize={unit * 1.6} className="bp-gate-label">Gate</text>
    </svg>
  );
}
