// Slim flat-vector people: real proportions (about 6 heads tall), no outlines, one shadow tone, hands with fingers.
// Same FlatPose as lib/flat (yaw, sit, lie, stride, jump all work): <SlimCharacter x y look={SLIM_LOOKS.mek} pose={flatPose('wave')} />
// (x, y) is the ground point between the feet. Pure function of props: animate with useCurrentFrame().
import React from 'react';
import { FLAT_REST, FlatExpr, FlatPose } from './flat';

type P = [number, number];
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16), c = (v: number) => clamp(Math.round(v * k), 0, 255);
  return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0')}`;
};
const tint = (hex: string, t: number) => {
  const n = parseInt(hex.slice(1), 16), m = (v: number) => Math.round(v + (255 - v) * t);
  return `#${((m(n >> 16) << 16) | (m((n >> 8) & 255) << 8) | m(n & 255)).toString(16).padStart(6, '0')}`;
};

export type SlimHair = 'wavy' | 'curly' | 'bun' | 'long' | 'buzz';
export type SlimHand = 'relaxed' | 'open' | 'fist' | 'point' | 'thumb' | 'peace' | 'ok' | 'pocket';
export type SlimLook = {
  skin: string; hair: string; hairStyle: SlimHair; top: string; bottom: string; shoe: string; sole: string;
  sleeves?: 'long' | 'short'; shorts?: boolean; mask?: boolean; lashes?: boolean; build?: number; ink?: string;
};
export const SLIM_LOOKS: Record<string, SlimLook> = {
  mek: { skin: '#F0BE98', hair: '#2B211D', hairStyle: 'wavy', top: '#E2674A', bottom: '#3E4A3A', shoe: '#F2F2EE', sole: '#B9B5AC', sleeves: 'long' },
  ploy: { skin: '#C98F67', hair: '#1F1714', hairStyle: 'bun', top: '#5FA8A0', bottom: '#2D3557', shoe: '#C8553D', sole: '#7A2F22', sleeves: 'short', lashes: true, build: 0.92 },
  tong: { skin: '#E7B089', hair: '#3A2A22', hairStyle: 'curly', top: '#F3C94B', bottom: '#4B5D7A', shoe: '#2E2E33', sole: '#E9E6DF', sleeves: 'short', shorts: true },
  fah: { skin: '#F4CBA8', hair: '#4A2E22', hairStyle: 'long', top: '#8C7AC9', bottom: '#2F2F3A', shoe: '#F2F2EE', sole: '#B9B5AC', sleeves: 'long', lashes: true, build: 0.9 },
};

const SH_X = 35, SH_Y = -290, HIP_Y = -186, UP = 74, FORE = 66, THIGH = 92, SHIN = 84;
const NECK_B = -292, NECK_T = -314, HEAD_OFF = 26, HRX = 25, HRY = 31;
const dir2 = (m: number, a: number): P => [m * Math.sin(rad(a)), Math.cos(rad(a))];

/** Arm angles (shL/elL or shR/elR) that put the hand at a point in character space, front view (elbow bends outward). */
export const slimReach = (s: -1 | 1, target: P, build = 1) => {
  const S: P = [s * SH_X * build, SH_Y + 8], vx = target[0] - S[0], vy = target[1] - S[1];
  const d = Math.min(UP + FORE - 0.01, Math.hypot(vx, vy)), av = deg(Math.atan2(s * vx, vy));
  const al = deg(Math.acos(clamp((UP * UP + d * d - FORE * FORE) / (2 * UP * d), -1, 1)));
  const be = deg(Math.acos(clamp((FORE * FORE + d * d - UP * UP) / (2 * FORE * d), -1, 1)));
  return { sh: av + al, el: av - be - (av + al) };
};
/** Hands in the pockets (use with handL/handR="pocket"). */
export const SLIM_POCKETS: Partial<FlatPose> = (() => {
  const l = slimReach(-1, [-28, -150]), r = slimReach(1, [28, -150]);
  return { shL: l.sh, elL: l.el, shR: r.sh, elR: r.el };
})();

export const slimJoints = (p: FlatPose, look: SlimLook) => {
  const b = look.build ?? 1, a = rad((p.yaw ?? 0) * 90), ca = Math.cos(a), sa = Math.sin(a);
  const bent = !!(p.hipL || p.hipR || p.kneeL || p.kneeR);
  const vert = (h: number, k: number) => THIGH * Math.cos(rad(h)) + SHIN * Math.cos(rad(h - k));
  const bob = bent ? -(THIGH + SHIN - Math.max(vert(p.hipL, p.kneeL), vert(p.hipR, p.kneeR))) : p.bob * 1.2;
  const rot = (q: P): P => {
    const l = rad(p.lean), dx = q[0], dy = q[1] - HIP_Y;
    return [dx * Math.cos(l) - dy * Math.sin(l), HIP_Y + dx * Math.sin(l) + dy * Math.cos(l) - bob];
  };
  const arm = (s: number, sh: number, el: number) => {
    const m = clamp(s * ca + sa, -1, 1), S: P = [s * SH_X * b * ca, SH_Y + 8];
    const u = dir2(m, sh), E: P = [S[0] + u[0] * UP, S[1] + u[1] * UP];
    const f = dir2(m, sh + el), H: P = [E[0] + f[0] * FORE, E[1] + f[1] * FORE];
    return { S: rot(S), E: rot(E), H: rot(H), z: -s * sa, s };
  };
  const leg = (s: number, h: number, k: number, lift: number) => {
    const top: P = [s * (15 + p.spread * 0.5) * b * ca, HIP_Y - bob];
    if (!bent) {
      const kb = lift * 30;
      const knee: P = [top[0] + s * p.spread * 0.3 * ca + THIGH * Math.sin(rad(kb * 0.6)) * sa, top[1] + THIGH * Math.cos(rad(kb * 0.6))];
      const foot: P = [knee[0] + s * p.spread * 0.3 * ca - SHIN * Math.sin(rad(kb)) * sa * 0.5, knee[1] + SHIN - lift * 18];
      return { top, knee, foot };
    }
    const knee: P = [top[0] + THIGH * Math.sin(rad(h)) * sa, top[1] + THIGH * Math.cos(rad(h))];
    return { top, knee, foot: [knee[0] + SHIN * Math.sin(rad(h - k)) * sa, knee[1] + SHIN * Math.cos(rad(h - k)) - lift * 18] as P };
  };
  const turn = p.head * 0.9, nt = rot([0, NECK_T]);
  const head: P = [nt[0] + HEAD_OFF * Math.sin(rad(turn + p.lean)), nt[1] - HEAD_OFF * Math.cos(rad(turn + p.lean))];
  return { a, ca, sa, bob, head, headAngle: p.lean + turn, neckB: rot([0, NECK_B]), neckT: nt,
    L: arm(-1, p.shL, p.elL), R: arm(1, p.shR, p.elR), legL: leg(-1, p.hipL, p.kneeL, p.legL), legR: leg(1, p.hipR, p.kneeR, p.legR) };
};

const line = (pts: P[], w: number, c: string, extra: React.SVGProps<SVGPolylineElement> = {}) =>
  <polyline points={pts.map((q) => q.join(',')).join(' ')} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" {...extra} />;
const lerp = (p: P, q: P, t: number): P => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];

// ---------- hand: wrist at 0,0, fingers toward +y; th = side the thumb is on ----------
const Finger: React.FC<{ x: number; ang: number; len: number; c: string }> = ({ x, ang, len, c }) =>
  line([[x, 12], [x + Math.sin(rad(ang)) * len, 12 + Math.cos(rad(ang)) * len]], 4.2, c);
export const SlimHandShape: React.FC<{ g: SlimHand; skin: string; th?: number }> = ({ g, skin, th = 1 }) => {
  if (g === 'pocket') return null;
  const dk = shade(skin, 0.86), xs = [-4.8, -1.6, 1.6, 4.8].map((x) => x * -th); // index finger nearest the thumb
  const ext = { relaxed: [8, 9, 8.5, 7], open: [11, 12, 11.5, 9.5], fist: [0, 0, 0, 0], point: [13, 0, 0, 0], thumb: [0, 0, 0, 0], peace: [12, 12.5, 0, 0], ok: [0, 11, 11, 9.5] }[g];
  const spread = g === 'open' ? [-16, -5, 6, 17] : g === 'peace' ? [-9, 9, 0, 0] : g === 'ok' ? [0, -4, 4, 12] : [0, 0, 0, 0];
  return (
    <g>
      <rect x={-7.5} y={-1} width={15} height={15.5} rx={6} fill={dk} />
      {xs.map((x, i) => ext[i] > 0
        ? <Finger key={i} x={x} ang={spread[i] * -th} len={ext[i]} c={skin} />
        : <circle key={i} cx={x} cy={14.2} r={2.6} fill={shade(skin, 0.93)} />)}
      {g === 'thumb' ? line([[th * 6, 6], [th * 16, 4]], 4.6, skin)
        : g === 'ok' ? <circle cx={th * 6.4} cy={17} r={4.2} fill="none" stroke={skin} strokeWidth={3.4} />
        : g === 'fist' || g === 'point' || g === 'peace' ? line([[th * 6, 6], [-th * 1, 11]], 4.4, skin)
        : line([[th * 6, 3], [th * (g === 'open' ? 14 : 9), g === 'open' ? 9 : 12]], 4.4, skin)}
    </g>
  );
};

// ---------- head ----------
const FACE = 'M-25 -4 C-25 -27 -13 -33 0 -33 C13 -33 25 -27 25 -4 C25 16 13 31 0 31 C-13 31 -25 16 -25 -4 Z';
// Hair is a cap on the skull: a hairline L(phi) in head space (phi 0 = front, +90 = the head's screen-right side
// at yaw 0), projected as the head turns. Everything above the visible hairline, out to the silhouette, is hair.
const SKULL = (y: number, v = 0) => { const k = y <= -4 ? (y + 4) / (29 + v) : (y + 4) / (35 + v); return (25 + v) * Math.sqrt(Math.max(0, 1 - k * k)); };
const HAIRLINE: Record<SlimHair, [number, number][]> = {
  wavy: [[0, -19], [35, -17], [70, -8], [88, -6], [105, 4], [140, 15], [180, 19]],
  long: [[0, -20], [35, -17], [70, -8], [88, -6], [105, 6], [140, 22], [180, 27]],
  bun: [[0, -22], [35, -19], [70, -10], [88, -7], [105, 1], [140, 9], [180, 12]],
  curly: [[0, -16], [35, -14], [70, -6], [88, -5], [105, 6], [140, 15], [180, 19]],
  buzz: [[0, -21], [35, -19], [70, -11], [88, -8], [105, -1], [140, 8], [180, 11]],
};
const VOLUME: Record<SlimHair, number> = { wavy: 3, long: 2.5, bun: 1.5, curly: 6, buzz: 0.6 };
const hairline = (style: SlimHair, phi: number) => {
  const k = HAIRLINE[style], f = Math.abs((((phi % 360) + 540) % 360) - 180); // 0 front .. 180 back
  let y = k[k.length - 1][1];
  for (let i = 1; i < k.length; i++) if (f <= k[i][0]) { const [p0, y0] = k[i - 1], [p1, y1] = k[i], u = (f - p0) / (p1 - p0); y = y0 + (y1 - y0) * (0.5 - 0.5 * Math.cos(Math.PI * u)); break; }
  if (style === 'wavy') { const d = ((((phi + 35) % 360 + 540) % 360) - 180) / 42; if (Math.abs(d) < 1) y += 10 * (0.5 + 0.5 * Math.cos(Math.PI * d)); }
  if (style === 'long') { const d = (((phi % 360 + 540) % 360) - 180) / 30; if (Math.abs(d) < 1) y += 4 * (0.5 + 0.5 * Math.cos(Math.PI * d)); }
  return Math.min(y, 27);
};
const hairCap = (style: SlimHair, yaw: number) => {
  const line: P[] = [], fore: boolean[] = [], v = VOLUME[style];
  for (let a = -90; a <= 90; a += 5) { const y = hairline(style, a - yaw); line.push([SKULL(y) * Math.sin(rad(a)), y]); fore.push(Math.abs((((a - yaw) % 360 + 540) % 360) - 180) < 70 && Math.abs(a) < 65); }
  const yR = line[line.length - 1][1], yL = line[0][1], rim: P[] = [], top = -33 - v;
  for (let i = 0; i <= 16; i++) { const y = yR + (top - yR) * (i / 16); rim.push([SKULL(y, v), y]); }
  for (let i = 16; i >= 0; i--) { const y = yL + (top - yL) * (i / 16); rim.push([-SKULL(y, v), y]); }
  return { line, fore, rim, d: 'M' + [...line, ...rim].map((q) => `${q[0].toFixed(2)} ${q[1].toFixed(2)}`).join(' L') + ' Z' };
};
// a curve drawn on the skull, (phi, y) pairs, clipped to the visible half
const onSkull = (pts: [number, number][], yaw: number) => {
  const out: P[][] = []; let cur: P[] = [];
  for (const [phi, y] of pts) { const a = phi + yaw; if (Math.cos(rad(a)) > 0.05) cur.push([SKULL(y) * Math.sin(rad(a)), y]); else if (cur.length) { out.push(cur); cur = []; } }
  if (cur.length) out.push(cur);
  return out.filter((c) => c.length > 1).map((c) => 'M' + c.map((q) => `${q[0].toFixed(2)} ${q[1].toFixed(2)}`).join(' L'));
};

const Hair: React.FC<{ look: SlimLook; yaw: number; part: 'back' | 'front' }> = ({ look, yaw, part }) => {
  const id = React.useId().replace(/:/g, '');
  const st = look.hairStyle, c = look.hair, hi = tint(c, 0.22), dk = shade(c, 0.72), ca = Math.cos(rad(yaw)), sa = Math.sin(rad(yaw));
  const bunZ = Math.cos(rad(180 + yaw)), bun = st === 'bun' && <g><circle cx={16 * Math.sin(rad(180 + yaw))} cy={-36} r={12.5} fill={c} /><path d={`M${16 * Math.sin(rad(180 + yaw)) - 7} -42 Q${16 * Math.sin(rad(180 + yaw))} -47 ${16 * Math.sin(rad(180 + yaw)) + 6} -43`} stroke={hi} strokeWidth={2.4} fill="none" strokeLinecap="round" /></g>;
  const drape = st === 'long' && <path d={`M${-27 - sa * 3} -6 C${-33 - sa * 3} 30 ${-30} 62 ${-21} 72 L${21} 72 C${30} 62 ${33 - sa * 3} 30 ${27 - sa * 3} -6 Z`} fill={ca < -0.1 ? c : dk} />;
  if (part === 'back') return <g>{ca >= -0.1 && drape}{bunZ < 0 && bun}</g>;
  const cap = hairCap(st, yaw);
  const front = cap.line.filter((_, i) => cap.fore[i]);
  return (
    <g>
      <defs><clipPath id={id}><path d={cap.d} /></clipPath></defs>
      {ca < -0.1 && drape}
      {front.length > 1 && <path d={'M' + front.map((q) => `${q[0].toFixed(2)} ${(q[1] + 2.6).toFixed(2)}`).join(' L')} stroke={shade(look.skin, 0.88)} strokeWidth={3.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      <path d={cap.d} fill={c} opacity={st === 'buzz' ? 0.9 : 1} />
      <g clipPath={`url(#${id})`}>
        <path d="M5 -46 C24 -40 31 -16 31 6 L44 6 L44 -50 Z" fill={dk} opacity={0.55} />
        {st === 'wavy' && onSkull([[-62, -10], [-40, -15], [-15, -24], [10, -30], [35, -32]], yaw).map((d, i) => <path key={i} d={d} stroke={dk} strokeWidth={2.2} fill="none" strokeLinecap="round" />)}
        {st === 'long' && onSkull([[0, -20], [0, -26], [0, -32], [10, -33], [180, -33]].map(([p, y]) => [p, y]) as [number, number][], yaw).map((d, i) => <path key={i} d={d} stroke={dk} strokeWidth={1.8} fill="none" strokeLinecap="round" />)}
        {st === 'bun' && [-30, 0, 30].flatMap((p) => onSkull([[p * 0.6, -21], [p, -30], [180 - p, -30], [180 - p * 0.4, -26]], yaw)).map((d, i) => <path key={i} d={d} stroke={dk} strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={0.7} />)}
      </g>
      {st === 'curly' && [...cap.line.filter((_, i) => i % 3 === 1), ...cap.rim.filter((_, i) => i % 3 === 0)].map((q, i) => <circle key={i} cx={q[0]} cy={q[1]} r={6.5 + 1.6 * Math.sin(i * 2.3)} fill={i % 3 ? c : dk} />)}
      {st !== 'buzz' && <path d="M-17 -28 C-11 -34 -1 -36 8 -34.5" stroke={hi} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.85} />}
      {bunZ >= 0 && bun}
    </g>
  );
};

const Face: React.FC<{ look: SlimLook; expr: FlatExpr; yaw: number; blink: number; mouth: number }> = ({ look, expr, yaw, blink, mouth }) => {
  const vis = clamp((Math.cos(rad(yaw)) + 0.1) / 0.3);
  if (vis <= 0) return null;
  const ink = look.ink ?? '#2A1E1E', on = (x: number) => { const t = Math.asin(clamp(x / 26, -1, 1)) + rad(yaw) * 0.8; return { x: 25 * Math.sin(t), k: Math.max(0.05, Math.cos(t)) }; };
  const at = (x: number, y: number, el: React.ReactNode, key?: string) => { const o = on(x); if (o.k < 0.3) return null; return <g key={key} transform={`translate(${o.x} ${y}) scale(${o.k} 1)`}>{el}</g>; };
  const closed = expr === 'laugh' || blink > 0.6;
  const eye = (s: number) => {
    if (closed || (expr === 'wink' && s > 0)) return line([[-3.5, 1], [0, -1.5], [3.5, 1]], 2.2, ink);
    if (expr === 'sleepy') return line([[-3.5, 0], [3.5, 0]], 2.2, ink);
    const big = expr === 'shocked' ? 1.3 : 1;
    return <g><ellipse rx={2.7 * big} ry={3.5 * big} fill={ink} /><circle cx={0.9} cy={-1.2} r={0.9} fill="#fff" />{look.lashes && line([[s * 2.4, -2.8], [s * 4.6, -4.4]], 1.4, ink)}</g>;
  };
  const brow = (s: number) => {
    const y = expr === 'shocked' ? -14 : -11, tilt = expr === 'angry' ? -s * 2.5 : expr === 'sad' || expr === 'worried' ? s * 2.2 : 0;
    return line([[-4, tilt], [4, -tilt]], 2.6, shade(look.hair, 1.1), { transform: `translate(0 ${y})` });
  };
  const m = expr === 'shocked' || mouth > 0.5 ? <ellipse cy={1} rx={3.6} ry={4.8} fill="#5A2626" />
    : expr === 'happy' || expr === 'laugh' ? <g><path d={`M-7 -1 Q0 ${expr === 'laugh' ? 11 : 8} 7 -1 Z`} fill="#6B2A2A" /><path d="M-6 -1 L6 -1 L5 1.6 L-5 1.6 Z" fill="#fff" /></g>
    : expr === 'sad' || expr === 'worried' ? line([[-5, 2], [0, -1], [5, 2]], 2.2, shade(look.skin, 0.55))
    : expr === 'angry' ? line([[-5, 0], [5, 0]], 2.4, shade(look.skin, 0.55))
    : expr === 'smug' ? line([[-4, 0], [2, 0.6], [6, -2.4]], 2.2, shade(look.skin, 0.55))
    : line([[-5, -0.6], [0, 1.8], [5, -0.6]], 2.2, shade(look.skin, 0.55));
  return (
    <g opacity={vis}>
      {[-1, 1].map((s) => at(s * 10, -9, brow(s), 'b' + s))}
      {[-1, 1].map((s) => at(s * 10, 1, eye(s), 'e' + s))}
      {[-1, 1].map((s) => at(s * 14, 11, <ellipse rx={5} ry={2.6} fill="#F07A6A" opacity={0.28} />, 'c' + s))}
      {at(1, 9, line([[0, -1], [2.4, 4], [-0.8, 5]], 2, shade(look.skin, 0.72)))}
      {look.mask
        ? at(0, 13, <g><path d="M-19 -9 Q0 -13 19 -9 L18 8 Q0 15 -18 8 Z" fill="#F3F5F7" /><path d="M-15 -2 Q0 -5 15 -2 M-15 4 Q0 1 15 4" stroke="#D5DADF" strokeWidth={1.5} fill="none" /></g>)
        : at(0, 19, m)}
    </g>
  );
};

export const SlimHead: React.FC<{ look: SlimLook; yaw?: number; expr?: FlatExpr; blink?: number; mouth?: number }> = ({ look, yaw = 0, expr = 'neutral', blink = 0, mouth = 0 }) => {
  const sa = Math.sin(rad(yaw)), ca = Math.cos(rad(yaw)), ae = rad(yaw <= 90 ? yaw * 0.7 : 63 + (yaw - 90) * (117 / 90));
  const ears = [-1, 1].map((s) => { const t = rad(s * 90) + ae; return { s, x: 24 * Math.sin(t), z: Math.cos(t) }; });
  const ear = (e: { s: number; x: number }) => <g key={e.s}><ellipse cx={e.x} cy={3} rx={4.6} ry={7} fill={look.skin} /><ellipse cx={e.x} cy={3} rx={2} ry={4} fill={shade(look.skin, 0.85)} /></g>;
  return (
    <g>
      <Hair look={look} yaw={yaw} part="back" />
      {ears.filter((e) => e.z <= 0.25).map(ear)}
      <path d={FACE} fill={look.skin} />
      <path d="M8 -30 C22 -26 26 -10 24 4 C22 18 12 29 0 31 C10 22 16 6 8 -30 Z" fill={shade(look.skin, 0.93)} opacity={Math.max(0, ca)} />
      {Math.abs(sa) > 0.6 && ca > -0.3 && <ellipse cx={Math.sign(sa) * 24.5} cy={10} rx={3.6} ry={4.2} fill={look.skin} />}
      <Face look={look} expr={expr} yaw={yaw} blink={blink} mouth={mouth} />
      {ears.filter((e) => e.z > 0.25).map(ear)}
      <Hair look={look} yaw={yaw} part="front" />
    </g>
  );
};

/** Slim flat-vector person. Same pose model as FlatCharacter; handL/handR pick finger shapes. */
export const SlimCharacter: React.FC<{
  x: number; y: number; look: SlimLook; pose?: FlatPose; scale?: number; dir?: 1 | -1; expr?: FlatExpr;
  blink?: number; mouth?: number; handL?: SlimHand; handR?: SlimHand; shadow?: boolean;
}> = ({ x, y, look, pose = FLAT_REST, scale = 1, dir = 1, expr = 'neutral', blink = 0, mouth = 0, handL = 'relaxed', handR = 'relaxed', shadow = true }) => {
  const j = slimJoints(pose, look), b = look.build ?? 1, yaw = (pose.yaw ?? 0) * 90;
  const kx = 0.58 + 0.42 * Math.abs(j.ca), top = look.top, topD = shade(top, 0.84), bot = look.bottom, botD = shade(bot, 0.82);
  const back = j.ca < -0.2;
  const torsoT = `translate(0 ${-j.bob}) rotate(${pose.lean} 0 ${HIP_Y})`;
  const legEl = (l: ReturnType<typeof slimJoints>['legL'], s: number, far: boolean) => {
    const toe = s * j.ca + j.sa >= 0 ? 1 : -1, c = far ? botD : bot, sole = l.foot[1] + 12;
    const w = 12 + 8 * Math.abs(j.sa), off = toe * 9 * Math.abs(j.sa), x0 = l.foot[0] - w + off, x1 = l.foot[0] + w + off;
    const shin = look.shorts ? look.skin : c;
    return (
      <g key={'leg' + s}>
        {line([l.top, l.knee], 31 * b, c)}
        {line([lerp(l.knee, l.top, look.shorts ? 0.25 : 0), l.knee, l.foot], 25 * b, shin)}
        {look.shorts && line([l.top, lerp(l.top, l.knee, 0.7)], 33 * b, c)}
        {!look.shorts && line([lerp(l.knee, l.top, 0.12), lerp(l.knee, l.foot, 0.12)], 2.4, shade(bot, 0.7), { opacity: 0.6, strokeDasharray: '7 30' })}
        <path d={`M${x0} ${sole} L${x0} ${sole - 7} Q${x0 + (toe > 0 ? 2 : 6)} ${sole - 17} ${x0 + w} ${sole - 17} Q${x1 - (toe > 0 ? 4 : 0)} ${sole - 17} ${x1} ${sole - 6} L${x1} ${sole} Z`} fill={far ? shade(look.shoe, 0.9) : look.shoe} />
        <rect x={x0} y={sole - 4.5} width={x1 - x0} height={4.5} rx={2} fill={look.sole} />
      </g>
    );
  };
  const armEl = (aj: ReturnType<typeof slimJoints>['L'], g: SlimHand, far: boolean) => {
    const c = far ? topD : top, longS = look.sleeves !== 'short', cuff = lerp(aj.E, aj.H, 0.86), elbowEnd = lerp(aj.S, aj.E, 0.55);
    const ang = deg(Math.atan2(-(aj.H[0] - aj.E[0]), aj.H[1] - aj.E[1]));
    const skin = far ? shade(look.skin, 0.92) : look.skin;
    return (
      <g key={'arm' + aj.s}>
        {line([aj.S, aj.E, aj.H], 15, skin)}
        {longS ? line([aj.S, aj.E, cuff], 20, c) : line([aj.S, elbowEnd], 22, c)}
        {longS && line([lerp(aj.E, aj.H, 0.8), cuff], 20, shade(c, 0.88))}
        {g === 'pocket' && <path d={`M${aj.H[0] - 10} ${aj.H[1] - 2} Q${aj.H[0]} ${aj.H[1] + 3} ${aj.H[0] + 10} ${aj.H[1] - 2}`} stroke={shade(look.bottom, 0.7)} strokeWidth={3} fill="none" strokeLinecap="round" />}
        <g transform={`translate(${aj.H[0]} ${aj.H[1]}) rotate(${ang})`}><SlimHandShape g={g} skin={skin} th={-aj.s * (j.ca >= 0 ? 1 : -1)} /></g>
      </g>
    );
  };
  const hw = 39 * b, torso = `M${-14 * b} ${SH_Y - 6} L${-hw + 8} ${SH_Y - 2} Q${-hw} ${SH_Y + 2} ${-hw} ${SH_Y + 20} L${-36 * b} ${HIP_Y + 2} Q${-36 * b} ${HIP_Y + 12} ${-30 * b} ${HIP_Y + 12} L${30 * b} ${HIP_Y + 12} Q${36 * b} ${HIP_Y + 12} ${36 * b} ${HIP_Y + 2} L${hw} ${SH_Y + 20} Q${hw} ${SH_Y + 2} ${hw - 8} ${SH_Y - 2} L${14 * b} ${SH_Y - 6} Z`;
  const uid = 'sl' + React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const roll = pose.roll ?? 0, air = pose.air ?? 0, sq = pose.squash ?? 1;
  const bodyT = `translate(0 ${-air})${sq !== 1 ? ` scale(${1 / Math.sqrt(sq)} ${sq})` : ''}${roll ? ` translate(0 ${(-HIP_Y - 40) * Math.abs(Math.sin(rad(roll)))}) rotate(${roll} 0 ${HIP_Y})` : ''}`;
  const legsOrder = j.sa > 0.05 ? [[j.legR, 1], [j.legL, -1]] as const : [[j.legL, -1], [j.legR, 1]] as const;
  const farArms = [j.L, j.R].filter((a) => a.z < -0.2), nearArms = [j.L, j.R].filter((a) => a.z >= -0.2);
  const hand = (a: { s: number }) => (a.s < 0 ? handL : handR);
  return (
    <g transform={`translate(${x} ${y}) scale(${scale * dir} ${scale})`}>
      {shadow && <ellipse cx={0} cy={2} rx={(58 * b * (1 + 1.6 * Math.abs(Math.sin(rad(roll))))) / (1 + air / 220)} ry={9 / (1 + air / 400)} fill="#000" opacity={0.12 / (1 + air / 160)} />}
      <g transform={bodyT}>
        {farArms.map((a) => armEl(a, hand(a), true))}
        {legsOrder.map(([l, s], i) => legEl(l, s, legsOrder.length > 1 && i === 0 && Math.abs(j.sa) > 0.3))}
        <g transform={torsoT}>
          <rect x={-35 * b * kx} y={HIP_Y - 6} width={70 * b * kx} height={30} rx={8} fill={bot} />
          <rect x={-7} y={NECK_B - 22} width={14} height={30} rx={6} fill={shade(look.skin, 0.88)} />
          <g transform={kx < 0.999 ? `translate(${j.sa * 4} 0) scale(${kx} 1)` : undefined}>
            <clipPath id={uid}><path d={torso} /></clipPath>
            <path d={torso} fill={top} />
            <g clipPath={`url(#${uid})`}>
              <path d={`M${16 * b} ${SH_Y - 10} Q${30 * b} ${SH_Y + 50} ${22 * b} ${HIP_Y + 20} L${60} ${HIP_Y + 20} L60 ${SH_Y - 10} Z`} fill={topD} />
              <rect x={-60} y={HIP_Y} width={120} height={14} fill={shade(top, 0.9)} />
              {line([[-hw + 10, SH_Y + 30], [-hw + 18, SH_Y + 44]], 2.4, topD)}
              {line([[-20, HIP_Y - 10], [-10, HIP_Y - 4]], 2.4, topD)}
            </g>
            {!back && <path d={`M-14 ${SH_Y - 6} Q0 ${SH_Y + 8} 14 ${SH_Y - 6} L10 ${SH_Y - 7} Q0 ${SH_Y + 2} -10 ${SH_Y - 7} Z`} fill={shade(top, 0.82)} />}
          </g>
        </g>
        <g transform={`translate(${j.head[0]} ${j.head[1]}) rotate(${j.headAngle})`}>
          <ellipse cx={0} cy={HRY - 4} rx={9} ry={5} fill={shade(look.skin, 0.8)} opacity={back ? 0 : 0.6} />
          <SlimHead look={look} yaw={yaw} expr={expr} blink={blink} mouth={mouth} />
        </g>
        {nearArms.map((a) => armEl(a, hand(a), false))}
      </g>
    </g>
  );
};
