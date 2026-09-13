// ============================================
// CHARTS - SVG sin librerías (rendimiento)
// ============================================

"use client";

export interface ChartSeries {
  label: string;
  color: string;
  points: number[];
}

export function Sparkline({ points, color, width, height }: { points: number[]; color: string; width?: number; height?: number }) {
  const W = width ?? 120;
  const H = height ?? 40;
  if (points.length < 2) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: W, height: H }} aria-hidden>
        <line x1={4} x2={W - 4} y1={H / 2} y2={H / 2} stroke="rgba(255,255,255,0.15)" strokeWidth={2} strokeLinecap="round" />
      </svg>
    );
  }
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = (W - 8) / (points.length - 1);
  const d = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${(4 + i * step).toFixed(1)},${(H - 4 - ((v - min) / span) * (H - 8)).toFixed(1)}`)
    .join(" ");
  const id = `sg-${color.replace("#", "")}-${points.length}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: W, height: H }} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${d} L${(W - 4).toFixed(1)},${H} L4,${H} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" className="aff-draw" />
    </svg>
  );
}

export function AreaChart({
  series,
  labels,
  height,
}: {
  series: ChartSeries[];
  labels: string[];
  height?: number;
}) {
  const W = 640;
  const H = height ?? 220;
  const PAD_L = 44;
  const PAD_B = 26;
  const PAD_T = 12;
  const max = Math.max(1, ...series.flatMap((s) => s.points));
  const n = Math.max(1, ...series.map((s) => s.points.length));
  const step = n > 1 ? (W - PAD_L - 8) / (n - 1) : 0;
  const y = (v: number): number => PAD_T + (1 - v / max) * (H - PAD_T - PAD_B);
  const x = (i: number): number => PAD_L + i * step;
  const ticks = 4;
  const labelIdx = labels.length > 1 ? labels.map((_, i) => Math.round((i * (n - 1)) / Math.min(6, labels.length - 1))) : [0];
  const shown = [...new Set(labelIdx)];
  return (
    <div>
      <div style={{ display: "flex", gap: "16px", marginBottom: "10px", fontSize: "12px", color: "#888" }}>
        {series.map((s) => (
          <span key={s.label}><span style={{ color: s.color }}>●</span> {s.label}</span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Gráfico de rendimiento">
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const v = (max * i) / ticks;
          const yy = y(v);
          return (
            <g key={i}>
              <line x1={PAD_L} x2={W - 8} y1={yy} y2={yy} stroke="rgba(255,255,255,0.06)" />
              <text x={PAD_L - 6} y={yy + 4} textAnchor="end" fontSize={10} fill="#63636b">${Math.round(v)}</text>
            </g>
          );
        })}
        {series.map((s) => {
          const d = s.points.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
          const last = s.points[s.points.length - 1] ?? 0;
          return (
            <g key={s.label}>
              <path d={`${d} L${x(s.points.length - 1).toFixed(1)},${H - PAD_B} L${x(0).toFixed(1)},${H - PAD_B} Z`} fill={s.color} opacity={0.12} />
              <path d={d} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinecap="round" className="aff-draw" />
              {s.points.length > 0 && <circle cx={x(s.points.length - 1)} cy={y(last)} r={4} fill={s.color} stroke="#050505" strokeWidth={2} />}
            </g>
          );
        })}
        {shown.map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="#63636b">
            {labels[i] ?? ""}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function Donut({ segments, size }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const S = size ?? 140;
  const R = 52;
  const CIRC = 2 * Math.PI * R;
  const total = Math.max(1, segments.reduce((n, s) => n + s.value, 0));
  const fracs = segments.map((s) => s.value / total);
  const arcs = segments.map((s, i) => ({
    ...s,
    frac: fracs[i],
    offset: fracs.slice(0, i).reduce((a, b) => a + b, 0),
  }));
  return (
    <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
      <svg viewBox="0 0 120 120" style={{ width: S, height: S }} role="img" aria-label="Distribución">
        <circle cx={60} cy={60} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={14} />
        {arcs.map((s) => (
          <circle
            key={s.label}
            cx={60}
            cy={60}
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth={14}
            strokeDasharray={`${(s.frac * CIRC).toFixed(1)} ${CIRC.toFixed(1)}`}
            strokeDashoffset={(-s.offset * CIRC).toFixed(1)}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          />
        ))}
      </svg>
      <div style={{ fontSize: "12px", color: "#888", display: "flex", flexDirection: "column", gap: "6px" }}>
        {segments.map((s) => (
          <span key={s.label}><span style={{ color: s.color }}>●</span> {s.label}: <strong style={{ color: "#fff" }}>${s.value}</strong></span>
        ))}
      </div>
    </div>
  );
}

export function bucketize(values: { t: number; v: number }[], rangeDays: number, buckets: number): { points: number[]; labels: string[] } {
  const now = Date.now();
  const span = rangeDays === 0 ? 90 * 24 * 3600 * 1000 : rangeDays * 24 * 3600 * 1000;
  const pts = new Array<number>(buckets).fill(0);
  for (const e of values) {
    if (rangeDays !== 0 && e.t < now - span) continue;
    const idx = Math.min(buckets - 1, Math.floor(((e.t - (now - span)) / span) * buckets));
    if (idx >= 0) pts[idx] = Math.round((pts[idx] + e.v) * 100) / 100;
  }
  const labels: string[] = [];
  for (let i = 0; i < buckets; i++) {
    const t = now - span + ((i + 0.5) / buckets) * span;
    labels.push(new Date(t).toLocaleDateString("es", { day: "numeric", month: "short" }));
  }
  return { points: pts, labels };
}
