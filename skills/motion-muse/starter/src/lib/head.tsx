// A 2D cartoon head that turns to any angle. The face is authored once, front-on, on a 3D head surface;
// every frame it is projected for the current yaw/pitch/roll, so the face stays the same character from any side.
// Front coordinates: x right, y up, eye line y = 0, chin y = -1.1, crown y = +1.15 (1 unit = eye line to chin).
import React, { useId } from 'react';
import { inkPath, spline, type Pt } from './ink';

type V3 = [number, number, number];

const CROWN = 1.15, CHIN = -1.1;
/** half-width of the head at height y (convex: skull ellipse above, tapering jaw below, round chin) */
const halfW = (y: number, jaw: number) => {
  if (y >= 0.35) return 0.8 * Math.sqrt(Math.max(0, 1 - ((y - 0.35) / (CROWN - 0.35)) ** 2));
  if (y >= -0.95) return 0.8 - (0.8 - jaw) * ((0.35 - y) / 1.3) ** 2.4;
  return jaw * Math.sqrt(Math.max(0, 1 - ((-0.95 - y) / (-0.95 - CHIN)) ** 2));
};
const DEPTH = 1.06;

const surf = (u: number, y: number, jaw: number, out = 0): { p: V3; n: V3 } => {
  const w = Math.max(1e-3, halfW(Math.max(CHIN, Math.min(CROWN, y)), jaw)) * (1 + out), d = w * DEPTH;
  const th = Math.asin(Math.max(-1, Math.min(1, u / w)));
  return { p: [w * Math.sin(th), y, d * Math.cos(th)], n: norm([Math.sin(th) / w, 0, Math.cos(th) / d]) };
};
const ring = (th: number, y: number, jaw: number, out = 0): { p: V3; n: V3 } => {
  const w = Math.max(1e-3, halfW(y, jaw)) * (1 + out), d = w * DEPTH;
  return { p: [w * Math.sin(th), y, d * Math.cos(th)], n: norm([Math.sin(th) / w, 0, Math.cos(th) / d]) };
};
const norm = (v: V3): V3 => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

const hull = (P: Pt[]): Pt[] => {
  const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: Pt[] = [], up: Pt[] = [];
  for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
};
const poly = (P: Pt[], close = true) => (P.length ? `M${P.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('L')}${close ? 'Z' : ''}` : '');

export type HeadExpr = 'neutral' | 'smile' | 'grin' | 'open' | 'surprised' | 'sad' | 'angry' | 'smug';
export type HairStyle = 'short' | 'fringe' | 'bob' | 'long' | 'spiky' | 'bald';

export type TurnHeadProps = {
  x: number; y: number; size?: number;
  /** radians: yaw + turns to the viewer's right (0 front, ±π/2 profile, π back), pitch + looks up, roll + tilts clockwise */
  yaw?: number; pitch?: number; roll?: number;
  skin?: string; hair?: string; ink?: string; eye?: string; blush?: string;
  hairStyle?: HairStyle;
  expr?: HeadExpr;
  /** 0 open .. 1 closed */
  blink?: number;
  /** 0..1 mouth open for speech */
  talk?: number;
  /** pupils, -1..1 in the eye */
  gaze?: [number, number];
  /** chin half-width, 0.22 sharp .. 0.42 round */
  jaw?: number;
  /** light direction in view space (x right, y up, z to the viewer) */
  light?: V3;
  line?: number;
};

const EXPR: Record<HeadExpr, { brow: number; tilt: number; smile: number; open: number; eyeY: number }> = {
  neutral: { brow: 0, tilt: 0, smile: 0.15, open: 0, eyeY: 1 },
  smile: { brow: 0.04, tilt: 0, smile: 0.7, open: 0, eyeY: 0.85 },
  grin: { brow: 0.06, tilt: 0, smile: 1, open: 0.45, eyeY: 0.7 },
  open: { brow: 0.05, tilt: 0, smile: 0.4, open: 0.7, eyeY: 1 },
  surprised: { brow: 0.14, tilt: 0, smile: 0, open: 0.8, eyeY: 1.15 },
  sad: { brow: 0.02, tilt: -0.5, smile: -0.5, open: 0, eyeY: 0.9 },
  angry: { brow: -0.06, tilt: 0.6, smile: -0.4, open: 0.15, eyeY: 0.85 },
  smug: { brow: 0.02, tilt: 0.25, smile: 0.5, open: 0, eyeY: 0.6 },
};

/** hairline height around the head (th: 0 = forehead, ±π = nape) */
const hairline = (th: number, style: HairStyle) => {
  const c = Math.cos(th);
  const front = Math.max(0, c) ** 4;
  switch (style) {
    case 'fringe': return 0.1 + 0.5 * c - 0.05 * Math.cos(2 * th) - 0.32 * front + 0.035 * Math.sin(th * 15) * front;
    case 'bob': return -0.05 + 0.42 * c - 0.1 * Math.cos(2 * th) - 0.3 * front - 0.25 * (1 - Math.abs(c));
    case 'long': return 0.08 + 0.48 * c - 0.05 * Math.cos(2 * th) - 0.06 * front;
    case 'spiky': return 0.12 + 0.5 * c - 0.05 * Math.cos(2 * th) - 0.06 * front + 0.07 * Math.abs(Math.sin(th * 9)) * front;
    default: return 0.1 + 0.5 * c - 0.05 * Math.cos(2 * th);
  }
};

export const TurnHead: React.FC<TurnHeadProps> = ({
  x, y, size = 160, yaw = 0, pitch = 0, roll = 0,
  skin = '#f1c7a3', hair = '#2a2230', ink = '#2a1d18', eye = '#2a1d18', blush = '#ef8f86',
  hairStyle = 'short', expr = 'neutral', blink = 0, talk = 0, gaze = [0, 0], jaw = 0.32, light = [-0.5, 0.6, 0.65], line = 1,
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const E = EXPR[expr];
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  const rot = (v: V3): V3 => {
    const x1 = v[0] * cy + v[2] * sy, z1 = -v[0] * sy + v[2] * cy;
    const y2 = v[1] * cp + z1 * sp, z2 = -v[1] * sp + z1 * cp;
    return [x1 * cr - y2 * sr, x1 * sr + y2 * cr, z2];
  };
  const proj = (v: V3): Pt => { const r = rot(v), k = 1 / (1 - 0.06 * r[2]); return [x + r[0] * size * k, y - r[1] * size * k]; };
  const facing = (n: V3) => rot(n)[2];
  const L = norm(light);

  // silhouette: convex hull of the projected surface (the head is convex)
  const pts: Pt[] = [], hairPts: Pt[] = [];
  for (let i = 0; i <= 28; i++) {
    const yy = CHIN + ((CROWN - CHIN) * i) / 28;
    for (let k = 0; k < 36; k++) {
      const th = (k / 36) * Math.PI * 2 - Math.PI;
      pts.push(proj(ring(th, yy, jaw).p));
      if (hairStyle !== 'bald' && yy > hairline(th, hairStyle) - 0.02) hairPts.push(proj(ring(th, yy, jaw, 0.07).p));
    }
  }
  if (hairStyle === 'long' || hairStyle === 'bob') {
    // hair that falls behind the neck: points below the ears, behind the face plane, narrowing toward the ends
    const drop = hairStyle === 'long' ? 1.15 : 0.45, narrow = hairStyle === 'long' ? 0.72 : 0.95;
    for (let k = 0; k <= 24; k++) {
      const th = Math.PI * 0.55 + (k / 24) * Math.PI * 0.9;
      const p = ring(th, 0.1, jaw, 0.08).p;
      hairPts.push(proj([p[0] * narrow, -0.2 - drop, Math.min(p[2], -0.1) * 0.8]));
    }
  }
  const sil = hull(pts);
  const silD = poly(spline(sil, true, 3));

  // front hair: the visible part of the hairline, then over the top along the hair silhouette
  let frontHair = '';
  const backHair = hairPts.length ? poly(spline(hull(hairPts), true, 3)) : '';
  if (hairStyle !== 'bald') {
    const N = 120, loop = Array.from({ length: N }, (_, k) => { const th = (k / N) * Math.PI * 2 - Math.PI; const s = ring(th, hairline(th, hairStyle), jaw, 0.07); return { q: proj(s.p), v: facing(s.n) > 0 }; });
    let best: [number, number] = loop.every((l) => l.v) ? [0, N - 1] : [0, 0];
    for (let s = 0; s < N; s++) {
      if (!loop[s].v || loop[(s + N - 1) % N].v) continue;
      let e = s; while (loop[(e + 1) % N].v && e - s < N) e++;
      if (e - s > best[1] - best[0]) best = [s, e];
    }
    const H = hull(hairPts);
    if (best[1] > best[0] && H.length > 2) {
      const seg = Array.from({ length: best[1] - best[0] + 1 }, (_, i) => loop[(best[0] + i) % N].q);
      const near = (q: Pt) => H.reduce((bi, h, i) => (Math.hypot(h[0] - q[0], h[1] - q[1]) < Math.hypot(H[bi][0] - q[0], H[bi][1] - q[1]) ? i : bi), 0);
      const a = near(seg[seg.length - 1]), b = near(seg[0]);
      const arc = (dir: number) => { const o: Pt[] = []; for (let i = a; ; i = (i + dir + H.length) % H.length) { o.push(H[i]); if (i === b || o.length > H.length) break; } return o; };
      const top = (A: Pt[]) => Math.min(...A.map((q) => q[1]));
      const A1 = arc(1), A2 = arc(-1);
      const over = top(A1) <= top(A2) ? A1 : A2; // the arc that goes over the crown
      frontHair = poly(spline(seg, false, 2).concat(spline(over, false, 2)));
    } else if (facing([0, 1, 0]) > 0.3 || Math.abs(yaw % (Math.PI * 2)) > Math.PI / 2) frontHair = backHair;
  }

  // features: front coordinates on the surface, dropped where they turn away
  const feat = (P: [number, number, number?][]) => {
    const S = P.map(([u, v, dz = 0]) => { const s = surf(u, v, jaw); return { q: proj([s.p[0] + s.n[0] * dz, s.p[1] + s.n[1] * dz, s.p[2] + s.n[2] * dz]), f: facing(s.n) }; });
    return { q: S.map((s) => s.q), f: Math.min(...S.map((s) => s.f)) };
  };
  const vis = (f: number) => Math.max(0, Math.min(1, f / 0.22));
  const ell = (cx: number, cyy: number, rx: number, ry: number, n = 22) => Array.from({ length: n }, (_, k) => { const a = (k / n) * Math.PI * 2; return [cx + rx * Math.cos(a), cyy + ry * Math.sin(a)] as [number, number]; });
  const lw = size * 0.035 * line;

  const eyeOpen = Math.max(0.06, (1 - blink) * E.eyeY);
  const eyes = [-1, 1].map((sd) => {
    const ex = sd * 0.31, ey = 0.0;
    const white = feat(ell(ex, ey, 0.13, 0.15 * eyeOpen));
    const pupil = feat(ell(ex + gaze[0] * 0.05, ey + gaze[1] * 0.04 * eyeOpen - 0.01, 0.075, 0.095 * Math.min(1, eyeOpen * 1.1)));
    const shine = feat(ell(ex + gaze[0] * 0.05 - 0.03, ey + 0.035 * eyeOpen, 0.022, 0.025));
    const lid = feat([[ex - 0.15, ey + 0.11 * eyeOpen], [ex - 0.05, ey + 0.17 * eyeOpen], [ex + 0.08, ey + 0.165 * eyeOpen], [ex + 0.16, ey + 0.1 * eyeOpen]]);
    // tilt > 0 lowers the inner ends (angry), < 0 raises them (sad)
    const inner = 0.25 + E.brow - E.tilt * 0.06, outer = 0.25 + E.brow + E.tilt * 0.02;
    const brow = feat([[ex - 0.15, sd < 0 ? outer : inner], [ex, 0.3 + E.brow], [ex + 0.15, sd < 0 ? inner : outer]]);
    return { sd, white, pupil, shine, lid, brow };
  });
  const sm = E.smile, op = Math.max(E.open, talk * 0.8);
  const mouthTop = feat([[-0.2, -0.6 + sm * 0.05], [-0.1, -0.6 - sm * 0.04, 0.02], [0, -0.6 - sm * 0.06, 0.02], [0.1, -0.6 - sm * 0.04, 0.02], [0.2, -0.6 + sm * 0.05]]);
  const mouthIn = feat([[-0.2, -0.6 + sm * 0.05], [-0.1, -0.6 - sm * 0.04 - op * 0.13, 0.02], [0, -0.6 - sm * 0.06 - op * 0.18, 0.02], [0.1, -0.6 - sm * 0.04 - op * 0.13, 0.02], [0.2, -0.6 + sm * 0.05]]);
  const nose = feat([[0.0, -0.18, 0.02], [0.05, -0.33, 0.1], [0.0, -0.4, 0.12], [-0.06, -0.37, 0.06]]);
  const cheeks = [-1, 1].map((sd) => feat(ell(sd * 0.47, -0.36, 0.11, 0.06)));

  // ears: a little shell on each side, drawn over the head when that side faces the viewer
  const ear = (sd: number) => {
    const c = ring(sd * Math.PI / 2, -0.12, jaw).p;
    const P = Array.from({ length: 16 }, (_, k) => { const a = (k / 16) * Math.PI * 2; return proj([c[0] + sd * (0.06 + 0.07 * Math.cos(a)), c[1] + 0.2 * Math.sin(a), c[2] - 0.08 + 0.09 * Math.cos(a)]); });
    return { d: poly(spline(P, true, 3)), front: facing([sd, 0, 0]) > 0.15 };
  };
  const ears = [ear(-1), ear(1)];

  // cel shadow: the silhouette in shadow colour, the lit skin shifted toward the light on top (follows any turn)
  const off: Pt = [L[0] * size * 0.16, -L[1] * size * 0.16];
  const dark = (c: string, k: number) => { const n = parseInt(c.slice(1), 16); const m = (v: number) => Math.round(v * k); return `rgb(${m(n >> 16)},${m((n >> 8) & 255)},${m(n & 255)})`; };
  const line_ = (P: Pt[], w: number, seed: number) => <path d={inkPath(spline(P, false, 4), { width: w, taper: [0.25, 0.3], pressure: 0.25, tremble: 0.2, seed })} fill={ink} />;
  const sk = <path d={silD} fill={skin} />;

  return (
    <g>
      <defs><clipPath id={`hc${uid}`}><path d={silD} /></clipPath><clipPath id={`hh${uid}`}><path d={frontHair} /></clipPath></defs>
      {backHair && <path d={backHair} fill={dark(hair, 0.78)} />}
      {ears.map((e, i) => !e.front && <g key={i}><path d={e.d} fill={skin} /><path d={e.d} fill="none" stroke={ink} strokeWidth={lw * 0.7} /></g>)}
      {sk}
      <g clipPath={`url(#hc${uid})`}>
        <path d={silD} fill={dark(skin, 0.86)} />
        <path d={silD} fill={skin} transform={`translate(${off[0]} ${off[1]}) scale(1.0)`} />
        {cheeks.map((c, i) => <path key={i} d={poly(c.q)} fill={blush} opacity={0.45 * vis(c.f)} />)}
        {eyes.map((e) => (
          <g key={e.sd} opacity={vis(e.white.f)}>
            <path d={poly(e.white.q)} fill="#fff" />
            <path d={poly(e.pupil.q)} fill={eye} />
            <path d={poly(e.shine.q)} fill="#fff" />
            {line_(e.lid.q, lw * 1.1, 3 + e.sd)}
          </g>
        ))}
        {eyes.map((e) => <g key={`b${e.sd}`} opacity={vis(e.brow.f)}>{line_(e.brow.q, lw * 1.2, 7 + e.sd)}</g>)}
        {op > 0.05 && <path d={poly(mouthTop.q.concat(mouthIn.q.slice().reverse()))} fill="#6b2a2a" opacity={vis(mouthIn.f)} />}
        <g opacity={vis(mouthTop.f)}>{line_(mouthTop.q, lw, 11)}</g>
      </g>
      <g opacity={vis(nose.f + 0.3)}>{line_(nose.q, lw * 0.8, 13)}</g>
      <path d={silD} fill="none" stroke={ink} strokeWidth={lw} strokeLinejoin="round" />
      {ears.map((e, i) => e.front && <g key={i}><path d={e.d} fill={skin} /><path d={e.d} fill="none" stroke={ink} strokeWidth={lw * 0.7} /></g>)}
      {frontHair && (
        <g>
          <path d={frontHair} fill={hair} />
          <g clipPath={`url(#hh${uid})`}><path d={frontHair} fill={dark(hair, 1.35)} opacity={0.35} transform={`translate(${off[0] * 1.2} ${off[1] * 1.2})`} /></g>
          <path d={frontHair} fill="none" stroke={ink} strokeWidth={lw} strokeLinejoin="round" />
        </g>
      )}
    </g>
  );
};
