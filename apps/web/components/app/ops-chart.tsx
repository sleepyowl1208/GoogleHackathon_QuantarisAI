"use client";

export function Line({ lines, limit, band, height = 120, markX }: { lines: { values: number[]; color: string; dash?: boolean }[]; limit?: number; band?: { lo: number[]; hi: number[]; offset: number }; height?: number; markX?: number }) {
  const w = 480;
  const all = [...lines.flatMap((l) => l.values), ...(band ? [...band.lo, ...band.hi] : []), ...(limit !== undefined ? [limit] : [])];
  const lo = Math.min(...all), hi = Math.max(...all), span = Math.max(hi - lo, 1e-6);
  const len = Math.max(...lines.map((l) => l.values.length), band ? band.offset + band.hi.length : 0);
  const x = (i: number) => (i / Math.max(len - 1, 1)) * w, y = (v: number) => height - 6 - ((v - lo) / span) * (height - 12);
  const path = (v: number[], off = 0) => v.map((d, i) => `${i ? "L" : "M"}${x(i + off).toFixed(1)},${y(d).toFixed(1)}`).join(" ");
  return (
    <svg className="ops-chart" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" role="img" aria-hidden>
      {band ? <path d={`${path(band.hi, band.offset)} L${x(band.offset + band.hi.length - 1)},${y(band.lo[band.lo.length - 1])} ${band.lo.map((d, i) => `L${x(band.offset + band.lo.length - 1 - i).toFixed(1)},${y(band.lo[band.lo.length - 1 - i]).toFixed(1)}`).join(" ")} Z`} fill="var(--saffron)" opacity="0.22" /> : null}
      {limit !== undefined ? <line x1="0" x2={w} y1={y(limit)} y2={y(limit)} stroke="var(--danger, #c0392b)" strokeDasharray="5 4" strokeWidth="1.2" /> : null}
      {markX !== undefined ? <line x1={x(markX)} x2={x(markX)} y1="0" y2={height} stroke="var(--muted, #888)" strokeDasharray="2 3" /> : null}
      {lines.map((l, i) => <path key={i} d={path(l.values)} fill="none" stroke={l.color} strokeWidth="2" strokeDasharray={l.dash ? "4 3" : undefined} vectorEffect="non-scaling-stroke" />)}
    </svg>
  );
}
