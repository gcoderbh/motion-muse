// Hand-made line and paint: pressure-tapered ink strokes, lines that "boil" on twos, paper grain, painted fills.
// All deterministic (seeded), so a re-render gives the same drawing.
import React, { useId } from 'react';
import { useCurrentFrame } from 'remotion';

export type Pt = [number, number];

/** Small seeded PRNG (mulberry32). */
export const rng = (seed: number) => {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Hold each drawing for n frames, like animation shot "on twos". Use for drawn things, not for the camera. */
export const onTwos = (f: number, n = 2) => f - (((f % n) + n) % n);

/** Centripetal Catmull-Rom through the points; `n` samples per segment. */
export const spline = (P: Pt[], closed = false, n = 10): Pt[] => {
  const m = P.length;
  if (m < 3) return P.slice();
  const get = (i: number): Pt => {
    if (closed) return P[((i % m) + m) % m];
    if (i < 0) return [2 * P[0][0] - P[1][0], 2 * P[0][1] - P[1][1]];
    if (i >= m) return [2 * P[m - 1][0] - P[m - 2][0], 2 * P[m - 1][1] - P[m - 2][1]];
    return P[i];
  };
  const out: Pt[] = [];
  const segs = closed ? m : m - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const d = (a: Pt, b: Pt) => Math.max(1e-6, Math.hypot(b[0] - a[0], b[1] - a[1])) ** 0.5;
    const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
    for (let k = 0; k < n; k++) {
      const t = t1 + ((t2 - t1) * k) / n;
      const L = (a: Pt, b: Pt, ta: number, tb: number): Pt => [((tb - t) * a[0] + (t - ta) * b[0]) / (tb - ta), ((tb - t) * a[1] + (t - ta) * b[1]) / (tb - ta)];
      const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
      const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
      out.push(L(B1, B2, t1, t2));
    }
  }
  if (!closed) out.push(P[m - 1]);
  return out;
};

const lengths = (P: Pt[]) => {
  const L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  return L;
};

/** First `t` (0..1) of a polyline by length: draw-on for ink strokes. */
export const partOf = (P: Pt[], t: number): Pt[] => {
  if (t >= 1) return P;
  const L = lengths(P), end = L[L.length - 1] * Math.max(0, t), out: Pt[] = [P[0]];
  for (let i = 1; i < P.length; i++) {
    if (L[i] <= end) { out.push(P[i]); continue; }
    const k = (end - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
    out.push([P[i - 1][0] + (P[i][0] - P[i - 1][0]) * k, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * k]);
    break;
  }
  return out;
};

export type InkOpts = {
  width?: number;
  /** fraction of the length that thins at the start and the end (a brush lands and lifts) */
  taper?: [number, number];
  /** pressure wobble 0..1 along the stroke */
  pressure?: number;
  /** sideways hand tremble in px */
  tremble?: number;
  seed?: number;
  closed?: boolean;
  /** extra width factor per point, e.g. thicker on the shadow side: (t, normal) => 0.6..1.6 */
  weight?: (t: number, nx: number, ny: number) => number;
};

/** Filled outline of a variable-width brush stroke along P (already smooth; run spline() first). Returns an SVG path. */
export const inkPath = (P: Pt[], o: InkOpts = {}) => {
  const { width = 6, taper = [0.18, 0.3], pressure = 0.35, tremble = 0.6, seed = 1, closed = false, weight } = o;
  if (P.length < 2) return '';
  const L = lengths(P), total = L[L.length - 1] || 1, r = rng(seed);
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28];
  const left: Pt[] = [], right: Pt[] = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const nx = -ty, ny = tx, t = L[i] / total, s = L[i] / 40;
    const ends = closed ? 1 : Math.min(1, t / Math.max(1e-3, taper[0])) ** 0.6 * Math.min(1, (1 - t) / Math.max(1e-3, taper[1])) ** 0.8;
    const press = 1 + pressure * (0.55 * Math.sin(s * 1.3 + ph[0]) + 0.3 * Math.sin(s * 3.1 + ph[1]));
    const w = Math.max(0.15, (width / 2) * Math.max(0.05, ends) * press * (weight ? weight(t, nx, ny) : 1));
    const j = tremble * Math.sin(s * 2.2 + ph[2]);
    const cx = P[i][0] + nx * j, cy = P[i][1] + ny * j;
    left.push([cx + nx * w, cy + ny * w]);
    right.push([cx - nx * w, cy - ny * w]);
  }
  const f = (q: Pt) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
  if (closed) return `M${left.map(f).join('L')}Z M${right.reverse().map(f).join('L')}Z`;
  return `M${left.map(f).join('L')}L${right.reverse().map(f).join('L')}Z`;
};

/** An ink stroke through hand points. `draw` 0..1 draws it on. `boil` re-seeds the tremble every n frames (on twos). */
export const Ink: React.FC<InkOpts & { points: Pt[]; color?: string; draw?: number; boil?: number; opacity?: number; smooth?: boolean }> = ({
  points, color = '#1d1a17', draw = 1, boil = 0, opacity = 1, smooth = true, seed = 1, ...o
}) => {
  const f = useCurrentFrame();
  const s = boil ? seed + onTwos(f, boil) * 7 : seed;
  const P = smooth ? spline(points, o.closed) : points;
  const d = inkPath(draw < 1 ? partOf(P, draw) : P, { ...o, seed: s, closed: o.closed && draw >= 1 });
  return <path d={d} fill={color} fillRule="evenodd" opacity={opacity} />;
};

/** Dry brush: several thin bristle strokes that break up toward the end of the stroke. */
export const DryBrush: React.FC<{ points: Pt[]; width?: number; color?: string; bristles?: number; seed?: number; draw?: number; opacity?: number }> = ({
  points, width = 26, color = '#1d1a17', bristles = 7, seed = 3, draw = 1, opacity = 0.9,
}) => {
  const P = partOf(spline(points), draw);
  const r = rng(seed);
  return (
    <g opacity={opacity}>
      {Array.from({ length: bristles }, (_, k) => {
        const off = (k / (bristles - 1) - 0.5) * width;
        const cut = 0.55 + r() * 0.45;
        const Q = partOf(P, cut).map((p, i, a) => {
          const b = a[Math.min(a.length - 1, i + 1)], c = a[Math.max(0, i - 1)];
          const tx = b[0] - c[0], ty = b[1] - c[1], l = Math.hypot(tx, ty) || 1;
          return [p[0] - (ty / l) * off, p[1] + (tx / l) * off] as Pt;
        });
        return <path key={k} d={inkPath(Q, { width: (width / bristles) * (0.6 + r() * 0.8), taper: [0.05, 0.5], pressure: 0.5, seed: seed * 31 + k })} fill={color} />;
      })}
    </g>
  );
};

const cleanId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '');

/**
 * Hand-drawn wrapper for any SVG art (flat characters, city sets, diagrams): edges wobble a little and
 * "boil" every `boil` frames, fills get a gouache texture. Put it inside an <svg>.
 */
export const Handmade: React.FC<{ children: React.ReactNode; wobble?: number; boil?: number; texture?: number; seed?: number }> = ({
  children, wobble = 2.2, boil = 3, texture = 0.18, seed = 5,
}) => {
  const f = useCurrentFrame();
  const id = cleanId(useId());
  const s = seed + (boil ? onTwos(f, boil) / boil : 0) * 13;
  return (
    <g filter={`url(#hm${id})`}>
      <defs>
        <filter id={`hm${id}`} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={Math.round(s) % 997} result="wob" />
          <feDisplacementMap in="SourceGraphic" in2="wob" scale={wobble * 2} xChannelSelector="R" yChannelSelector="G" result="shape" />
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.6" numOctaves={3} seed={seed} result="grain" />
          <feColorMatrix in="grain" type="matrix" values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${texture * 2.2} ${-texture * 0.6}`} result="speck" />
          <feComposite in="speck" in2="shape" operator="in" result="tex" />
          <feBlend in="tex" in2="shape" mode="multiply" />
        </filter>
      </defs>
      {children}
    </g>
  );
};

/** Paper: warm base, fibres and grain. Static on purpose (a moving paper texture reads as video noise). */
export const Paper: React.FC<{ width: number; height: number; color?: string; grain?: number; seed?: number }> = ({
  width, height, color = '#f4ecdd', grain = 0.22, seed = 11,
}) => {
  const id = cleanId(useId());
  return (
    <svg width={width} height={height} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <filter id={`pp${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves={4} seed={seed} result="fib" />
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves={2} seed={seed + 1} result="gr" />
          <feBlend in="fib" in2="gr" mode="multiply" result="mix" />
          <feColorMatrix in="mix" type="matrix" values={`0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.2  -${grain * 2} 0 0 0 ${grain * 1.1}`} />
        </filter>
        <radialGradient id={`pv${id}`} cx="50%" cy="45%" r="75%">
          <stop offset="60%" stopColor="#000" stopOpacity={0} />
          <stop offset="100%" stopColor="#3b2a14" stopOpacity={0.18} />
        </radialGradient>
      </defs>
      <rect width={width} height={height} fill={color} />
      <rect width={width} height={height} filter={`url(#pp${id})`} />
      <rect width={width} height={height} fill={`url(#pv${id})`} />
    </svg>
  );
};

/** A painted wash (watercolour/gouache blob) for skies, shadows and backgrounds. */
export const Wash: React.FC<{ d: string; color: string; opacity?: number; bleed?: number; seed?: number }> = ({ d, color, opacity = 0.8, bleed = 14, seed = 2 }) => {
  const id = cleanId(useId());
  return (
    <g>
      <defs>
        <filter id={`ws${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves={3} seed={seed} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={bleed} xChannelSelector="R" yChannelSelector="B" result="d" />
          <feGaussianBlur in="d" stdDeviation={bleed / 10} result="b" />
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves={2} seed={seed + 3} result="t" />
          <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 1.25" result="ta" />
          <feComposite in="b" in2="ta" operator="in" result="pig" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="pig" /></feMerge>
        </filter>
      </defs>
      <path d={d} fill={color} opacity={opacity} filter={`url(#ws${id})`} />
    </g>
  );
};
