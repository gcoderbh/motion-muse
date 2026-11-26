// Animated charts for data videos: bars, a line, a donut, count-up numbers and a bar race. Pure SVG driven by the
// frame (no d3 needed). Numbers are formatted for Thai readers. Sizes are in px of the SVG you place them in.
import React from 'react';
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export type Datum = { label: string; value: number; color?: string };
export const CHART_COLORS = ['#2F6BFF', '#FF5A36', '#FFD23F', '#3DDC97', '#8C7AC9', '#FF8FB1', '#4BC6E8', '#A8B4C4'];

/** 1234567 → "1,234,567"; compact → "1.2 ล้าน"; unit/prefix added around it ("฿", "%", " คน"). */
export const fmtTH = (n: number, o: { digits?: number; compact?: boolean; unit?: string; prefix?: string } = {}) =>
  `${o.prefix ?? ''}${new Intl.NumberFormat('th-TH', { maximumFractionDigits: o.digits ?? 0, minimumFractionDigits: o.digits ?? 0, notation: o.compact ? 'compact' : 'standard' }).format(n)}${o.unit ?? ''}`;

type Fmt = (n: number) => string;
const grow = (f: number, fps: number, delay: number) => spring({ frame: f - delay, fps, config: { damping: 200 }, durationInFrames: 28 });
const ease = Easing.out(Easing.cubic);

/** A number that counts from `from` to `to` over `dur` frames (eases out, tabular digits so it does not jitter). */
export const CountUp: React.FC<{ to: number; from?: number; delay?: number; dur?: number; fmt?: Fmt; style?: React.CSSProperties }> = ({ to, from = 0, delay = 0, dur = 40, fmt = (n) => fmtTH(n), style }) => {
  const f = useCurrentFrame();
  const v = interpolate(f - delay, [0, dur], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  return <span style={{ fontVariantNumeric: 'tabular-nums', ...style }}>{fmt(v)}</span>;
};

const niceMax = (m: number) => {
  const p = 10 ** Math.floor(Math.log10(Math.max(m, 1e-9))), k = m / p;
  return ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => k <= s) ?? 10) * p;
};

type Common = { width: number; height: number; delay?: number; font?: string; ink?: string; muted?: string; fmt?: Fmt; fontSize?: number };

/** Vertical (default) or horizontal bars that grow one after another; values count up with their bar.
 *  `highlight` dims the other bars after they have grown, to make one point. */
export const BarChart: React.FC<Common & { data: Datum[]; horizontal?: boolean; stagger?: number; max?: number; highlight?: number; colors?: string[]; grid?: boolean }> = ({
  data, width, height, delay = 0, stagger = 5, horizontal = false, max, highlight, colors = CHART_COLORS, grid = true,
  font = 'Prompt, sans-serif', ink = '#16130F', muted = 'rgba(22,19,15,0.18)', fmt = (n) => fmtTH(n), fontSize = 30,
}) => {
  const f = useCurrentFrame(), { fps } = useVideoConfig();
  const top = niceMax(max ?? Math.max(...data.map((d) => d.value)));
  const dimT = delay + stagger * data.length + 24;
  const dim = highlight === undefined ? 0 : interpolate(f, [dimT, dimT + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const n = data.length, lab = fontSize * 1.9;
  const txt = { fontFamily: font, fontSize, fill: ink } as const;
  if (horizontal) {
    const labW = width * 0.3, row = height / n, bh = row * 0.62, W = width - labW - fontSize * 4.5;
    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        {data.map((d, i) => {
          const g = grow(f, fps, delay + i * stagger), w = Math.max(0, (d.value / top) * W * g), y = i * row + (row - bh) / 2;
          const op = highlight === undefined || highlight === i ? 1 : 1 - 0.65 * dim;
          return (
            <g key={i} opacity={op}>
              <text x={labW - fontSize * 0.5} y={y + bh / 2} dominantBaseline="central" textAnchor="end" {...txt}>{d.label}</text>
              <rect x={labW} y={y} width={w} height={bh} rx={bh * 0.18} fill={d.color ?? colors[i % colors.length]} />
              <text x={labW + w + fontSize * 0.4} y={y + bh / 2} dominantBaseline="central" {...txt} fontWeight={700} opacity={g}>{fmt(d.value * g)}</text>
            </g>
          );
        })}
      </svg>
    );
  }
  const H = height - lab - fontSize * 1.6, col = width / n, bw = Math.min(col * 0.62, fontSize * 5), base = fontSize * 1.6 + H;
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      {grid && [0.25, 0.5, 0.75, 1].map((k) => <line key={k} x1={0} x2={width} y1={base - H * k} y2={base - H * k} stroke={muted} strokeWidth={2} strokeDasharray="6 10" opacity={grow(f, fps, delay - 10)} />)}
      <line x1={0} x2={width} y1={base} y2={base} stroke={ink} strokeWidth={3} opacity={grow(f, fps, delay - 10)} />
      {data.map((d, i) => {
        const g = grow(f, fps, delay + i * stagger), h = Math.max(0, (d.value / top) * H * g), x = i * col + (col - bw) / 2;
        const op = highlight === undefined || highlight === i ? 1 : 1 - 0.65 * dim;
        return (
          <g key={i} opacity={op}>
            <rect x={x} y={base - h} width={bw} height={h} rx={Math.min(bw * 0.16, 14)} fill={d.color ?? colors[i % colors.length]} />
            <text x={x + bw / 2} y={base - h - fontSize * 0.5} textAnchor="middle" {...txt} fontWeight={700} opacity={g}>{fmt(d.value * g)}</text>
            <text x={x + bw / 2} y={base + fontSize * 1.25} textAnchor="middle" {...txt}>{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
};

/** A line that draws itself left to right with a dot and value riding the tip; soft area fill under it. */
export const LineChart: React.FC<Common & { data: Datum[]; dur?: number; color?: string; min?: number; max?: number; area?: boolean; every?: number }> = ({
  data, width, height, delay = 0, dur = 60, color = CHART_COLORS[0], min, max, area = true, every = 1,
  font = 'Prompt, sans-serif', ink = '#16130F', muted = 'rgba(22,19,15,0.18)', fmt = (n) => fmtTH(n), fontSize = 28,
}) => {
  const f = useCurrentFrame();
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const lo = min ?? 0, hi = niceMax(max ?? Math.max(...data.map((d) => d.value)));
  const padB = fontSize * 2, padT = fontSize * 2.2, H = height - padB - padT;
  const pts = data.map((d, i) => [(i / Math.max(1, data.length - 1)) * width, padT + H * (1 - (d.value - lo) / (hi - lo))] as [number, number]);
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  const p = interpolate(f - delay, [0, dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  let left = p * total, k = 0;
  while (k < seg.length - 1 && left > seg[k]) left -= seg[k++];
  const u = seg.length ? Math.min(1, left / (seg[k] || 1)) : 0;
  const tip: [number, number] = seg.length ? [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * u, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * u] : pts[0];
  const shown = [...pts.slice(0, k + 1), tip];
  const val = seg.length ? data[k].value + (data[k + 1].value - data[k].value) * u : data[0].value;
  const d = shown.map((q, i) => `${i ? 'L' : 'M'}${q[0]},${q[1]}`).join(' ');
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity={0.35} /><stop offset="1" stopColor={color} stopOpacity={0} /></linearGradient></defs>
      {[0, 0.5, 1].map((g) => <line key={g} x1={0} x2={width} y1={padT + H * g} y2={padT + H * g} stroke={muted} strokeWidth={2} strokeDasharray="6 10" />)}
      {area && <path d={`${d} L${tip[0]},${padT + H} L${pts[0][0]},${padT + H} Z`} fill={`url(#${id})`} />}
      <path d={d} fill="none" stroke={color} strokeWidth={fontSize * 0.28} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={tip[0]} cy={tip[1]} r={fontSize * 0.42} fill="#fff" stroke={color} strokeWidth={fontSize * 0.2} />
      <text x={tip[0]} y={tip[1] - fontSize * 0.9} textAnchor="middle" fontFamily={font} fontSize={fontSize * 1.15} fontWeight={700} fill={ink}>{fmt(val)}</text>
      {data.map((dd, i) => (i % every === 0 || i === data.length - 1) && <text key={i} x={pts[i][0]} y={height - fontSize * 0.4} textAnchor="middle" fontFamily={font} fontSize={fontSize} fill={ink} opacity={pts[i][0] <= tip[0] + 1 ? 1 : 0.35}>{dd.label}</text>)}
    </svg>
  );
};

/** Donut whose slices sweep in one after another; the centre shows `center` (or the total, counting up). */
export const Donut: React.FC<{ data: Datum[]; size: number; delay?: number; thickness?: number; colors?: string[]; center?: React.ReactNode; font?: string; ink?: string; fmt?: Fmt; legend?: boolean; fontSize?: number }> = ({
  data, size, delay = 0, thickness = 0.26, colors = CHART_COLORS, center, font = 'Prompt, sans-serif', ink = '#16130F', fmt = (n) => fmtTH(n), legend = true, fontSize = 30,
}) => {
  const f = useCurrentFrame(), { fps } = useVideoConfig();
  const sum = data.reduce((a, d) => a + d.value, 0) || 1, r = size / 2 - (size * thickness) / 2, c = 2 * Math.PI * r;
  const g = spring({ frame: f - delay, fps, config: { damping: 200 }, durationInFrames: 50 });
  let acc = 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: fontSize * 0.8, fontFamily: font, color: ink }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {data.map((d, i) => {
            const share = d.value / sum, start = acc; acc += share;
            const shown = Math.max(0, Math.min(share, g - start));
            return <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color ?? colors[i % colors.length]} strokeWidth={size * thickness}
              strokeDasharray={`${Math.max(0, shown * c - 3)} ${c}`} strokeDashoffset={-start * c} />;
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.16, fontWeight: 800, lineHeight: 1.3 }}>
          {center ?? fmt(sum * g)}
        </div>
      </div>
      {legend && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: `${fontSize * 0.4}px ${fontSize}px`, fontSize, lineHeight: 1.35, maxWidth: size * 1.4 }}>
          {data.map((d, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: fontSize * 0.35, opacity: interpolate(g, [i / data.length, Math.min(1, (i + 1) / data.length)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
              <span style={{ width: fontSize * 0.7, height: fontSize * 0.7, borderRadius: 4, background: d.color ?? colors[i % colors.length] }} />
              {d.label} <b>{Math.round((d.value / sum) * 100)}%</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export type RaceSeries = { label: string; color?: string; values: number[] };
/** Frames a bar race needs: periods × perPeriod + a hold at the end. */
export const raceFrames = (periods: number, perPeriod = 30, hold = 45) => (periods - 1) * perPeriod + hold;
/** Bar chart race: values move between periods, bars swap places smoothly, the period label sits bottom right. */
export const BarRace: React.FC<Common & { periods: string[]; series: RaceSeries[]; perPeriod?: number; top?: number; colors?: string[] }> = ({
  periods, series, width, height, delay = 0, perPeriod = 30, top = 6, colors = CHART_COLORS,
  font = 'Prompt, sans-serif', ink = '#16130F', fmt = (n) => fmtTH(n), fontSize = 30,
}) => {
  const f = useCurrentFrame();
  const t = Math.max(0, Math.min(periods.length - 1, (f - delay) / perPeriod)), i0 = Math.floor(t), i1 = Math.min(periods.length - 1, i0 + 1);
  const u = Easing.inOut(Easing.quad)(t - i0);
  const rank = (i: number) => { const o = series.map((s, k) => [s.values[i] ?? 0, k]).sort((a, b) => b[0] - a[0]); const r: number[] = []; o.forEach(([, k], j) => (r[k] = j)); return r; };
  const r0 = rank(i0), r1 = rank(i1);
  const vals = series.map((s) => (s.values[i0] ?? 0) + ((s.values[i1] ?? 0) - (s.values[i0] ?? 0)) * u);
  const mx = Math.max(...vals) || 1, row = (height - fontSize * 3) / top, bh = row * 0.72, labW = width * 0.26, W = width - labW - fontSize * 5;
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      {series.map((s, k) => {
        const rk = r0[k] + (r1[k] - r0[k]) * u, y = rk * row;
        if (rk > top) return null;
        const w = (vals[k] / mx) * W, op = interpolate(rk, [top - 1, top], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <g key={s.label} opacity={op}>
            <text x={labW - fontSize * 0.5} y={y + bh / 2} dominantBaseline="central" textAnchor="end" fontFamily={font} fontSize={fontSize} fill={ink}>{s.label}</text>
            <rect x={labW} y={y} width={Math.max(0, w)} height={bh} rx={bh * 0.16} fill={s.color ?? colors[k % colors.length]} />
            <text x={labW + w + fontSize * 0.4} y={y + bh / 2} dominantBaseline="central" fontFamily={font} fontSize={fontSize} fontWeight={700} fill={ink} style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(vals[k])}</text>
          </g>
        );
      })}
      <text x={width} y={height - fontSize * 0.3} textAnchor="end" fontFamily={font} fontSize={fontSize * 2.6} fontWeight={800} fill={ink} opacity={0.22}>{periods[u > 0.5 ? i1 : i0]}</text>
    </svg>
  );
};
