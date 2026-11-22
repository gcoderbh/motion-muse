// Scientific diagrams and explainers in SVG: drawn-on paths, arrows, callouts, flow particles, ECG traces, cells, viruses.
// Everything is driven by a `progress` (0..1) or the current frame, so it renders deterministically.
import React from 'react';
import { noise2, rand } from './noise';

type P = [number, number];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Smooth path through points (Catmull-Rom → cubic Bézier). */
export const spline = (pts: P[], closed = false, tension = 0.5): string => {
  if (pts.length < 2) return '';
  const n = pts.length;
  const at = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1: P = [p1[0] + ((p2[0] - p0[0]) * tension) / 3, p1[1] + ((p2[1] - p0[1]) * tension) / 3];
    const c2: P = [p2[0] - ((p3[0] - p1[0]) * tension) / 3, p2[1] - ((p3[1] - p1[1]) * tension) / 3];
    d += ` C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p2[0]} ${p2[1]}`;
  }
  return closed ? d + ' Z' : d;
};

/** Point and direction at t (0..1, by length) along the polyline through pts. */
export const pointOn = (pts: P[], t: number): [number, number, number] => {
  const seg: number[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(l); total += l; }
  let d = clamp01(t) * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) {
      const k = seg[i] ? d / seg[i] : 0;
      const a = pts[i], b = pts[i + 1];
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI];
    }
    d -= seg[i];
  }
  return [pts[0][0], pts[0][1], 0];
};

/** Any SVG path that draws itself on as progress goes 0 → 1. */
export const Draw: React.FC<{ d: string; progress: number; stroke?: string; width?: number; fill?: string; fillProgress?: number; dash?: string; opacity?: number }> = ({ d, progress, stroke = '#16130F', width = 4, fill = 'none', fillProgress = 0, dash, opacity = 1 }) => (
  <g opacity={opacity}>
    {fill !== 'none' && <path d={d} fill={fill} opacity={clamp01(fillProgress)} />}
    <path d={d} pathLength={1} fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"
      strokeDasharray={dash ?? '1 1'} strokeDashoffset={dash ? 0 : 1 - clamp01(progress)} opacity={dash ? clamp01(progress * 3) : 1} />
  </g>
);

/** Curved arrow that grows from `from` to `to`; bend > 0 curves left. */
export const Arrow: React.FC<{ from: P; to: P; progress: number; bend?: number; color?: string; width?: number; head?: number }> = ({ from, to, progress, bend = 0.2, color = '#16130F', width = 5, head = 16 }) => {
  const mx = (from[0] + to[0]) / 2, my = (from[1] + to[1]) / 2;
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const c: P = [mx - dy * bend, my + dx * bend];
  const pts: P[] = Array.from({ length: 25 }, (_, i) => { const t = i / 24; return [(1 - t) ** 2 * from[0] + 2 * (1 - t) * t * c[0] + t * t * to[0], (1 - t) ** 2 * from[1] + 2 * (1 - t) * t * c[1] + t * t * to[1]]; });
  const p = clamp01(progress);
  const [hx, hy, ang] = pointOn(pts, p);
  return (
    <g>
      <path d={`M${from[0]} ${from[1]} Q${c[0]} ${c[1]} ${to[0]} ${to[1]}`} pathLength={1} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - p} />
      {p > 0.02 && <path d={`M0 0 L${-head} ${-head * 0.55} L${-head * 0.7} 0 L${-head} ${head * 0.55} Z`} fill={color} transform={`translate(${hx} ${hy}) rotate(${ang})`} />}
    </g>
  );
};

/** Label with a leader line: dot at `at`, line to `to`, text appears after the line. Works with Thai text. */
export const Callout: React.FC<{ at: P; to: P; text: string; sub?: string; progress: number; color?: string; font?: string; size?: number; align?: 'start' | 'end' }> = ({ at, to, text, sub, progress, color = '#16130F', font = 'Prompt, sans-serif', size = 34, align }) => {
  const p = clamp01(progress);
  const line = clamp01(p / 0.5), txt = clamp01((p - 0.4) / 0.6);
  const anchor = align ?? (to[0] >= at[0] ? 'start' : 'end');
  const ex = to[0] + (anchor === 'start' ? 70 : -70) * line;
  return (
    <g>
      <circle cx={at[0]} cy={at[1]} r={7 * clamp01(p * 4)} fill={color} />
      <circle cx={at[0]} cy={at[1]} r={7 + 18 * clamp01(p * 2)} fill="none" stroke={color} strokeWidth={2} opacity={1 - clamp01(p * 2)} />
      <polyline points={`${at[0]},${at[1]} ${at[0] + (to[0] - at[0]) * line},${at[1] + (to[1] - at[1]) * line} ${line >= 1 ? `${ex},${to[1]}` : ''}`} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
      <g opacity={txt} transform={`translate(${ex + (anchor === 'start' ? 12 : -12)} ${to[1] + (1 - txt) * 12})`}>
        <text textAnchor={anchor} dominantBaseline="middle" fontFamily={font} fontSize={size} fontWeight={700} fill={color}>{text}</text>
        {sub && <text textAnchor={anchor} y={size * 1.15} dominantBaseline="middle" fontFamily={font} fontSize={size * 0.62} fontWeight={400} fill={color} opacity={0.8}>{sub}</text>}
      </g>
    </g>
  );
};

/** Particles flowing along a path (blood cells, signals, data, infection spreading). */
export const Flow: React.FC<{ pts: P[]; frame: number; count?: number; speed?: number; r?: number; color?: string; seed?: number; jitter?: number; progress?: number }> = ({ pts, frame, count = 18, speed = 0.006, r = 6, color = '#FF5A36', seed = 1, jitter = 6, progress = 1 }) => (
  <g>
    {Array.from({ length: count }, (_, i) => {
      const t = (rand(seed, i) + frame * speed * (0.7 + 0.6 * rand(seed, i + 99))) % 1;
      if (t > progress) return null;
      const [x, y] = pointOn(pts, t);
      return <circle key={i} cx={x + (rand(seed, i + 7) - 0.5) * jitter * 2} cy={y + (rand(seed, i + 13) - 0.5) * jitter * 2} r={r * (0.7 + 0.6 * rand(seed, i + 3))} fill={color} opacity={0.85} />;
    })}
  </g>
);

/** Heartbeat trace. `rate` beats per second, `flat` (0..1) flattens it, `progress` reveals it left → right. */
export const Ecg: React.FC<{ x: number; y: number; w: number; h: number; frame: number; fps?: number; rate?: number; flat?: number; progress?: number; color?: string; width?: number }> = ({ x, y, w, h, frame, fps = 30, rate = 1.2, flat = 0, progress = 1, color = '#3DDC97', width = 4 }) => {
  const n = 180;
  const beat = (u: number) => { const k = u % 1; return k < 0.08 ? 0 : k < 0.12 ? -0.15 : k < 0.15 ? 1 : k < 0.18 ? -0.35 : k < 0.3 ? 0 : k < 0.4 ? 0.18 * Math.sin(((k - 0.3) / 0.1) * Math.PI) : 0; };
  const pts = Array.from({ length: Math.max(2, Math.round(n * clamp01(progress))) }, (_, i) => {
    const u = i / n;
    const v = beat(u * rate * 3 + frame / fps * 0) * (1 - flat);
    return `${x + u * w},${y - v * h}`;
  });
  const head = pts[pts.length - 1].split(',').map(Number);
  return (
    <g>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      <circle cx={head[0]} cy={head[1]} r={width * 1.6} fill={color} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
    </g>
  );
};

/** Organic blob (cell, organ, slime). Wobbles with the frame. */
export const Blob: React.FC<{ cx: number; cy: number; r: number; frame: number; seed?: number; wobble?: number; fill?: string; stroke?: string; width?: number; points?: number; children?: React.ReactNode }> = ({ cx, cy, r, frame, seed = 1, wobble = 0.12, fill = '#FFD7C2', stroke = '#16130F', width = 4, points = 14, children }) => {
  const pts: P[] = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2;
    const rr = r * (1 + wobble * noise2(Math.cos(a) * 1.3 + frame / 50, Math.sin(a) * 1.3, seed));
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });
  return <g><path d={spline(pts, true)} fill={fill} stroke={stroke} strokeWidth={width} />{children}</g>;
};

/** Spiky virus particle. */
export const Virus: React.FC<{ cx: number; cy: number; r: number; frame: number; spikes?: number; color?: string; ink?: string; seed?: number }> = ({ cx, cy, r, frame, spikes = 12, color = '#8BD45B', ink = '#16130F', seed = 2 }) => (
  <g transform={`translate(${cx} ${cy}) rotate(${frame * 0.8 + seed * 40})`}>
    {Array.from({ length: spikes }, (_, i) => {
      const a = (i / spikes) * 360;
      const l = r * (0.42 + 0.08 * Math.sin(frame / 6 + i));
      return <g key={i} transform={`rotate(${a})`}><line x1={r * 0.9} y1={0} x2={r + l} y2={0} stroke={ink} strokeWidth={r * 0.1} strokeLinecap="round" /><circle cx={r + l} cy={0} r={r * 0.15} fill={color} stroke={ink} strokeWidth={r * 0.06} /></g>;
    })}
    <circle r={r} fill={color} stroke={ink} strokeWidth={r * 0.08} />
    {[0, 1, 2, 3].map((i) => <circle key={i} cx={Math.cos(i * 1.7 + seed) * r * 0.45} cy={Math.sin(i * 2.3 + seed) * r * 0.45} r={r * 0.14} fill={ink} opacity={0.25} />)}
  </g>
);

/** Graph-paper background for explainers. */
export const GridPaper: React.FC<{ w: number; h: number; step?: number; color?: string; offset?: P }> = ({ w, h, step = 60, color = 'rgba(22,19,15,0.07)', offset = [0, 0] }) => (
  <g>
    {Array.from({ length: Math.ceil(w / step) + 2 }, (_, i) => <line key={`v${i}`} x1={i * step - (offset[0] % step)} y1={0} x2={i * step - (offset[0] % step)} y2={h} stroke={color} strokeWidth={2} />)}
    {Array.from({ length: Math.ceil(h / step) + 2 }, (_, i) => <line key={`h${i}`} x1={0} y1={i * step - (offset[1] % step)} x2={w} y2={i * step - (offset[1] % step)} stroke={color} strokeWidth={2} />)}
  </g>
);
