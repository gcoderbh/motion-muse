// Flat 2D cartoon people for explainer stories (big head, outfits, many expressions, front view).
// <svg viewBox="0 0 W H"><FlatCharacter x={600} y={900} look={FLAT_LOOKS.office} pose={flatPose('shocked')} expr="shocked" /></svg>
// (x, y) is the ground point between the feet. Everything is a pure function of props: animate with useCurrentFrame().
import React from 'react';
import { interpolate } from 'remotion';
import { noise1 } from './noise';

type P = [number, number];
const rad = (d: number) => (d * Math.PI) / 180;

// ---------- pose (front view) ----------
/** Arm angles in degrees from hanging straight down, + = out to that side; elbow bends the forearm (+ = further out/up, - = across the body). */
export type FlatPose = { lean: number; head: number; shL: number; elL: number; shR: number; elR: number; legL: number; legR: number; bob: number; spread: number };
export const FLAT_REST: FlatPose = { lean: 0, head: 0, shL: 10, elL: 6, shR: 10, elR: 6, legL: 0, legR: 0, bob: 0, spread: 0 };
export const FLAT_POSES: Record<string, Partial<FlatPose>> = {
  rest: {},
  shocked: { shL: 55, elL: 115, shR: 55, elR: 115, head: 0, bob: 6, spread: 6 },          // both hands up beside the head
  handsUp: { shL: 150, elL: 10, shR: 150, elR: 10, bob: 8 },
  point: { shR: 88, elR: 4, head: 6 },                                                   // screen-right arm points out
  pointL: { shL: 88, elL: 4, head: -6 },
  wave: { shR: 140, elR: 40 },
  shrug: { shL: 40, elL: 95, shR: 40, elR: 95, head: 8 },
  think: { shR: 18, elR: -150, head: -8 },                                               // hand to chin
  offer: { shR: 45, elR: 50, head: 4 },                                                  // palm out, selling something
  present: { shL: 70, elL: 25, shR: 70, elR: 25 },
  cheer: { shL: 160, elL: 20, shR: 160, elR: 20, bob: 14 },
  facepalm: { shR: 20, elR: -165, head: -10, lean: -3 },
  hipsL: { shL: 40, elL: -100, shR: 40, elR: -100 },                                     // hands on hips
  phone: { shR: 22, elR: -110, head: 10 },                                               // looks at a phone in the right hand
  scared: { shL: 60, elL: -130, shR: 60, elR: -130, lean: -4, bob: -4, spread: 8 },     // fists to the chest, knees in
};
export const flatPose = (name: keyof typeof FLAT_POSES | string, over: Partial<FlatPose> = {}): FlatPose => ({ ...FLAT_REST, ...(FLAT_POSES[name] ?? {}), ...over });
export const mixFlat = (a: FlatPose, b: FlatPose, t: number): FlatPose => {
  const o = {} as FlatPose;
  (Object.keys(a) as (keyof FlatPose)[]).forEach((k) => (o[k] = a[k] + (b[k] - a[k]) * t));
  return o;
};
/** Key poses over time with an overshoot ease (cartoon snap): keys = [[frame, pose], ...]. */
export const flatPosesAt = (f: number, keys: [number, FlatPose][]): FlatPose => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, p0] = keys[i], [f1, p1] = keys[i + 1];
    if (f < f1) {
      const t = (f - f0) / (f1 - f0);
      const c = 1.6, e = 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); // easeOutBack
      return mixFlat(p0, p1, e);
    }
  }
  return keys[keys.length - 1][1];
};
/** Walk in place (move x yourself, ~ 7 px per frame at scale 1): legs lift in turn, body bobs, arms swing. */
export const flatWalk = (phase: number, over: Partial<FlatPose> = {}): FlatPose => {
  const s = Math.sin(phase * Math.PI * 2);
  return { ...FLAT_REST, legL: Math.max(0, s), legR: Math.max(0, -s), bob: 6 * Math.abs(s), shL: 10 + 14 * s, shR: 10 - 14 * s, elL: 12, elR: 12, head: 2 * s, ...over };
};
/** Idle life on any pose: breathing, small weight shift, and hand gestures while talking (talk 0..1). */
export const flatIdle = (p: FlatPose, f: number, seed = 0, talk = 0): FlatPose => ({
  ...p,
  bob: p.bob + 1.6 * Math.sin(f / 16 + seed),
  head: p.head + 2.5 * noise1(f / 40, seed) + talk * 4 * Math.sin(f / 7 + seed),
  lean: p.lean + 1.2 * noise1(f / 55, seed + 3),
  shL: p.shL + 2 * Math.sin(f / 16 + seed) + talk * 10 * Math.max(0, noise1(f / 11, seed + 5)),
  shR: p.shR + 2 * Math.sin(f / 16 + seed) + talk * 14 * Math.max(0, noise1(f / 9, seed + 7)),
  elR: p.elR + talk * 25 * Math.max(0, noise1(f / 9, seed + 9)),
});

// ---------- look ----------
export type FlatHair = 'spiky' | 'side' | 'bald' | 'bob' | 'long' | 'bun' | 'curly' | 'buzz' | 'none';
export type FlatLook = {
  skin: string; hair: string; hairStyle: FlatHair; shirt: string; pants: string; shoes: string;
  outfit: 'tee' | 'shirt' | 'vest' | 'suit' | 'dress' | 'apron'; sleeves: 'short' | 'long';
  outer?: string; tie?: string; trim?: string; number?: string; badge?: { name: string; color: string };
  glasses?: 'round' | 'square' | 'shades' | 'shadesUp'; mustache?: boolean; beard?: boolean; old?: boolean;
  blush?: boolean; lashes?: boolean; height?: number; build?: number; ink?: string; iris?: string;
};
const base: FlatLook = { skin: '#F2C29B', hair: '#1E1A1A', hairStyle: 'spiky', shirt: '#5B9BD5', pants: '#2C3550', shoes: '#22252E', outfit: 'shirt', sleeves: 'short', blush: true, ink: '#2A1E1E', iris: '#2A1E1E' };
export const FLAT_LOOKS: Record<string, FlatLook> = {
  office: { ...base, badge: { name: 'ต้น', color: '#2F6BFF' } },
  rider: { ...base, skin: '#C98E62', shirt: '#2B2B2E', outer: '#FF7A1A', trim: '#FFE15A', outfit: 'vest', number: '09', glasses: 'shadesUp', pants: '#2A2A30', sleeves: 'long' },
  tycoon: { ...base, skin: '#F0C7A8', hair: '#E9E6E1', hairStyle: 'bald', shirt: '#FFFFFF', outer: '#1D1F2A', tie: '#C8102E', outfit: 'suit', sleeves: 'long', mustache: true, old: true, pants: '#1D1F2A', shoes: '#111' },
  auntie: { ...base, skin: '#EFC09A', hair: '#2B1E1A', hairStyle: 'bun', shirt: '#F28DB2', outfit: 'dress', pants: '#7A3B6B', lashes: true, glasses: 'round', old: true, build: 1.1 },
  student: { ...base, hairStyle: 'buzz', shirt: '#FFFFFF', pants: '#1F2A4A', sleeves: 'short', height: 0.86 },
  officeWoman: { ...base, hair: '#3A2620', hairStyle: 'bob', shirt: '#FFFFFF', outer: '#4F6D8A', outfit: 'suit', tie: undefined, pants: '#2E3A4D', lashes: true, sleeves: 'long', badge: { name: 'แนน', color: '#E2456F' } },
  vendor: { ...base, skin: '#C98E62', hair: '#1E1A1A', hairStyle: 'long', shirt: '#7BC67B', outer: '#F4E3C1', outfit: 'apron', lashes: true, pants: '#3A3A44' },
};
export const flatLook = (name: keyof typeof FLAT_LOOKS | string, over: Partial<FlatLook> = {}): FlatLook => ({ ...(FLAT_LOOKS[name] ?? base), ...over });

export type FlatExpr = 'neutral' | 'happy' | 'laugh' | 'shocked' | 'worried' | 'angry' | 'smug' | 'sad' | 'wink' | 'sleepy';

// ---------- body geometry ----------
const SH_Y = -188, HIP_Y = -96, UP = 52, FORE = 46, HEAD_R = 47;
const dir2 = (s: number, a: number): P => [s * Math.sin(rad(a)), Math.cos(rad(a))];
/** Joint positions in character space (before x/y/scale): use them to hang a badge over the head or put a prop in a hand. */
export const flatJoints = (p: FlatPose, look: FlatLook = base) => {
  const hgt = look.height ?? 1;
  const lift = -p.bob;
  const rot = (q: P): P => { // lean around the hip
    const a = rad(p.lean), dx = q[0], dy = q[1] - HIP_Y;
    return [dx * Math.cos(a) - dy * Math.sin(a), HIP_Y + dx * Math.sin(a) + dy * Math.cos(a) + lift];
  };
  const arm = (s: number, sh: number, el: number) => {
    const S: P = [s * 40 * (look.build ?? 1), SH_Y * hgt + 6];
    const ua = dir2(s, sh), E: P = [S[0] + ua[0] * UP, S[1] + ua[1] * UP];
    const fa = dir2(s, sh + el), Hd: P = [E[0] + fa[0] * FORE, E[1] + fa[1] * FORE];
    return { S: rot(S), E: rot(E), H: rot(Hd), angle: sh + el };
  };
  const neck = rot([0, SH_Y * hgt]);
  const head = rot([0, SH_Y * hgt - HEAD_R - 2]);
  return { neck, head, headTop: [head[0], head[1] - HEAD_R - 14] as P, L: arm(-1, p.shL, p.elL), R: arm(1, p.shR, p.elR), hip: rot([0, HIP_Y]) };
};

// ---------- parts ----------
const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0')}`;
};
const seg = (pts: P[], w: number, col: string) => <polyline points={pts.map((q) => q.join(',')).join(' ')} fill="none" stroke={col} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />;

const Hair: React.FC<{ look: FlatLook; back?: boolean }> = ({ look, back }) => {
  const r = HEAD_R, c = look.hair, d = shade(c, 0.8);
  switch (look.hairStyle) {
    case 'spiky':
      return back ? null : <path d={`M${-r - 2} 2 Q${-r - 6} ${-r * 0.9} ${-r * 0.55} ${-r - 8} L${-r * 0.42} ${-r - 22} L${-r * 0.12} ${-r - 10} L${r * 0.1} ${-r - 26} L${r * 0.32} ${-r - 9} L${r * 0.62} ${-r - 20} L${r * 0.7} ${-r - 4} Q${r + 8} ${-r * 0.7} ${r + 2} 2 Q${r * 0.7} ${-r * 0.55} ${r * 0.25} ${-r * 0.6} L${r * 0.1} ${-r * 0.42} L${-r * 0.12} ${-r * 0.62} Q${-r * 0.75} ${-r * 0.55} ${-r - 2} 2 Z`} fill={c} />;
    case 'side':
      return back ? null : <path d={`M${-r - 1} 4 Q${-r - 4} ${-r - 10} ${r * 0.1} ${-r - 8} Q${r + 8} ${-r - 4} ${r + 1} 4 Q${r * 0.85} ${-r * 0.6} ${-r * 0.2} ${-r * 0.62} Q${-r * 0.75} ${-r * 0.5} ${-r - 1} 4 Z`} fill={c} />;
    case 'buzz':
      return back ? null : <path d={`M${-r} -2 Q${-r} ${-r - 4} 0 ${-r - 4} Q${r} ${-r - 4} ${r} -2 Q${r * 0.6} ${-r * 0.7} 0 ${-r * 0.72} Q${-r * 0.6} ${-r * 0.7} ${-r} -2 Z`} fill={c} opacity={0.92} />;
    case 'bald':
      return back ? null : <g fill={c}>
        <path d={`M${-r - 3} 8 Q${-r - 6} ${-r * 0.5} ${-r * 0.55} ${-r * 0.62} Q${-r * 0.8} ${-r * 0.2} ${-r * 0.72} 6 Z`} />
        <path d={`M${r + 3} 8 Q${r + 6} ${-r * 0.5} ${r * 0.55} ${-r * 0.62} Q${r * 0.8} ${-r * 0.2} ${r * 0.72} 6 Z`} />
      </g>;
    case 'bob':
      return back ? <path d={`M${-r - 8} ${r * 0.45} Q${-r - 12} ${-r - 8} 0 ${-r - 10} Q${r + 12} ${-r - 8} ${r + 8} ${r * 0.45} Q${r * 0.6} ${r * 0.6} ${r * 0.5} ${r * 0.2} L${-r * 0.5} ${r * 0.2} Q${-r * 0.6} ${r * 0.6} ${-r - 8} ${r * 0.45} Z`} fill={d} />
        : <path d={`M${-r - 4} ${r * 0.1} Q${-r - 6} ${-r - 8} ${r * 0.1} ${-r - 9} Q${r + 6} ${-r - 6} ${r + 4} ${r * 0.1} Q${r * 0.9} ${-r * 0.45} ${r * 0.2} ${-r * 0.5} Q${-r * 0.2} ${-r * 0.3} ${-r * 0.5} ${-r * 0.55} Q${-r * 0.9} ${-r * 0.3} ${-r - 4} ${r * 0.1} Z`} fill={c} />;
    case 'long':
      return back ? <path d={`M${-r - 8} ${r * 1.5} Q${-r - 14} ${-r - 8} 0 ${-r - 10} Q${r + 14} ${-r - 8} ${r + 8} ${r * 1.5} Q0 ${r * 1.7} ${-r - 8} ${r * 1.5} Z`} fill={d} />
        : <path d={`M${-r - 4} ${r * 0.4} Q${-r - 6} ${-r - 8} ${r * 0.1} ${-r - 9} Q${r + 6} ${-r - 6} ${r + 4} ${r * 0.4} Q${r * 0.9} ${-r * 0.4} ${r * 0.15} ${-r * 0.55} Q${-r * 0.8} ${-r * 0.45} ${-r - 4} ${r * 0.4} Z`} fill={c} />;
    case 'bun':
      return back ? <circle cx={0} cy={-r - 12} r={r * 0.42} fill={d} />
        : <path d={`M${-r - 2} 4 Q${-r - 4} ${-r - 6} 0 ${-r - 6} Q${r + 4} ${-r - 6} ${r + 2} 4 Q${r * 0.8} ${-r * 0.5} 0 ${-r * 0.55} Q${-r * 0.8} ${-r * 0.5} ${-r - 2} 4 Z`} fill={c} />;
    case 'curly':
      return back ? null : <g fill={c}>{Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (1.05 + i * 0.112); return <circle key={i} cx={Math.cos(a) * r * 0.92} cy={Math.sin(a) * r * 0.92 - 4} r={r * 0.3} />; })}</g>;
    default: return null;
  }
};

const Face: React.FC<{ look: FlatLook; expr: FlatExpr; mouth: number; blink: number; gaze: P; uid: string }> = ({ look, expr, mouth, blink, gaze, uid }) => {
  const ink = look.ink ?? '#2A1E1E';
  const big = expr === 'shocked';
  const ex = 17, ey = -4;
  const closed = expr === 'happy' || expr === 'laugh';
  const lid = Math.max(blink, expr === 'smug' || expr === 'sleepy' ? 0.5 : 0);
  const eye = (s: number) => {
    const x = s * ex;
    if (closed || (expr === 'wink' && s > 0)) return <path key={s} d={`M${x - 10} ${ey + 3} Q${x} ${ey - 9} ${x + 10} ${ey + 3}`} stroke={ink} strokeWidth={4} fill="none" strokeLinecap="round" />;
    const rx = big ? 13 : 10, ry = (big ? 15 : 12) * (1 - 0.92 * blink);
    const pr = big ? 3.6 : 5.6;
    const px = x + gaze[0] * (rx - pr - 1), py = ey + gaze[1] * (ry * 0.5);
    return (
      <g key={s}>
        <ellipse cx={x} cy={ey} rx={rx} ry={Math.max(1, ry)} fill="#FFFFFF" stroke={ink} strokeOpacity={0.25} strokeWidth={1.5} />
        {ry > 3 && <><circle cx={px} cy={py} r={pr} fill={look.iris ?? ink} /><circle cx={px + pr * 0.35} cy={py - pr * 0.4} r={pr * 0.34} fill="#fff" /></>}
        {lid > 0.05 && blink < 0.5 && <g>
          <clipPath id={`e${uid}${s}`}><ellipse cx={x} cy={ey} rx={rx + 0.5} ry={ry + 0.5} /></clipPath>
          <rect x={x - rx - 1} y={ey - ry - 1} width={rx * 2 + 2} height={ry * 2 * lid + 1} fill={look.skin} clipPath={`url(#e${uid}${s})`} />
          <path d={`M${x - rx} ${ey - ry + ry * 2 * lid} L${x + rx} ${ey - ry + ry * 2 * lid}`} stroke={ink} strokeWidth={3} strokeLinecap="round" />
        </g>}
        {look.lashes && <path d={`M${x + s * (rx - 2)} ${ey - ry + 2} l${s * 6} -5`} stroke={ink} strokeWidth={2.5} strokeLinecap="round" />}
      </g>
    );
  };
  const by = big ? -30 : -22;
  const brow = (s: number) => {
    const tilt = expr === 'angry' ? 7 : expr === 'worried' || expr === 'sad' ? -6 : expr === 'smug' ? (s > 0 ? -4 : 2) : 0;
    const x0 = s * 9, x1 = s * 25;
    return <path key={s} d={`M${x0} ${by + tilt} Q${(x0 + x1) / 2} ${by - 3 + tilt * 0.3} ${x1} ${by - tilt * 0.4}`} stroke={shade(look.hair === '#E9E6E1' ? '#9A948C' : look.hair, 1)} strokeWidth={4.5} fill="none" strokeLinecap="round" />;
  };
  const my = 22;
  const open = expr === 'shocked' ? Math.max(0.85, mouth) : expr === 'laugh' ? Math.max(0.7, mouth) : mouth;
  let m: React.ReactNode;
  if (open > 0.06) {
    const w = expr === 'shocked' ? 10 + 4 * open : expr === 'laugh' ? 16 : 9 + 5 * open, h = expr === 'shocked' ? 6 + 12 * open : 3 + 11 * open;
    const d = expr === 'laugh' ? `M${-w} ${my - 3} L${w} ${my - 3} Q${w} ${my + h * 1.4} 0 ${my + h * 1.4} Q${-w} ${my + h * 1.4} ${-w} ${my - 3} Z`
      : `M${-w} ${my} Q${-w} ${my - h} 0 ${my - h} Q${w} ${my - h} ${w} ${my} Q${w} ${my + h} 0 ${my + h} Q${-w} ${my + h} ${-w} ${my} Z`;
    m = (
      <g>
        <clipPath id={`m${uid}`}><path d={d} /></clipPath>
        <path d={d} fill="#6B1E2A" />
        <g clipPath={`url(#m${uid})`}>
          <rect x={-w} y={my - h * 1.5 - 3} width={w * 2} height={h * 0.55 + 2} fill="#fff" />
          <ellipse cx={0} cy={my + h * 1.1} rx={w * 0.7} ry={h * 0.6} fill="#E76F7E" />
        </g>
      </g>
    );
  } else if (expr === 'happy' || expr === 'wink') m = <path d={`M-12 ${my - 2} Q0 ${my + 10} 12 ${my - 2}`} stroke={ink} strokeWidth={4} fill="#fff" strokeLinecap="round" strokeLinejoin="round" />;
  else if (expr === 'smug') m = <path d={`M-9 ${my + 1} Q4 ${my + 5} 13 ${my - 5}`} stroke={ink} strokeWidth={4} fill="none" strokeLinecap="round" />;
  else if (expr === 'sad' || expr === 'angry') m = <path d={`M-10 ${my + 4} Q0 ${my - 5} 10 ${my + 4}`} stroke={ink} strokeWidth={4} fill="none" strokeLinecap="round" />;
  else if (expr === 'worried') m = <path d={`M-10 ${my + 2} q5 -4 10 0 q5 4 10 0`} stroke={ink} strokeWidth={3.5} fill="none" strokeLinecap="round" />;
  else m = <path d={`M-7 ${my} Q0 ${my + 3} 7 ${my}`} stroke={ink} strokeWidth={4} fill="none" strokeLinecap="round" />;
  return (
    <g>
      {look.blush !== false && <g fill="#FF8A8A" opacity={expr === 'shocked' ? 0.2 : 0.42}><ellipse cx={-29} cy={12} rx={9} ry={5.5} /><ellipse cx={29} cy={12} rx={9} ry={5.5} /></g>}
      {eye(-1)}{eye(1)}
      {!closed && brow(-1)}{!closed && brow(1)}
      {closed && <>{brow(-1)}{brow(1)}</>}
      <path d="M-4 9 Q0 13 4 9" stroke={shade(look.skin, 0.72)} strokeWidth={3.5} fill="none" strokeLinecap="round" />
      {look.mustache && <path d={`M-16 ${my - 6} Q-8 ${my - 12} 0 ${my - 8} Q8 ${my - 12} 16 ${my - 6} Q8 ${my - 3} 0 ${my - 6} Q-8 ${my - 3} -16 ${my - 6} Z`} fill={look.hair === '#E9E6E1' ? '#D9D4CC' : look.hair} />}
      {m}
      {look.old && <g stroke={shade(look.skin, 0.75)} strokeWidth={2} fill="none" strokeLinecap="round"><path d="M-14 -36 q14 -4 28 0" /><path d="M-36 4 q-3 8 0 14" /><path d="M36 4 q3 8 0 14" /></g>}
      {look.glasses === 'round' && <g stroke={ink} strokeWidth={3} fill="rgba(255,255,255,0.15)"><circle cx={-ex} cy={ey} r={15} /><circle cx={ex} cy={ey} r={15} /><path d={`M-2 ${ey - 2} q2 -3 4 0`} fill="none" /></g>}
      {look.glasses === 'square' && <g stroke={ink} strokeWidth={3} fill="rgba(255,255,255,0.15)"><rect x={-ex - 15} y={ey - 12} width={30} height={24} rx={6} /><rect x={ex - 15} y={ey - 12} width={30} height={24} rx={6} /><path d={`M-2 ${ey - 2} h4`} /></g>}
      {look.glasses === 'shades' && <g><path d={`M-34 ${ey - 9} h68 v6 q0 14 -14 14 h-6 q-12 0 -12 -12 h-4 q0 12 -12 12 h-6 q-14 0 -14 -14 Z`} fill="#18181C" /><path d={`M-26 ${ey - 6} l8 0`} stroke="#fff" strokeOpacity={0.5} strokeWidth={3} strokeLinecap="round" /></g>}
    </g>
  );
};

const Torso: React.FC<{ look: FlatLook; badgeFont?: string; dir?: 1 | -1 }> = ({ look, badgeFont, dir = 1 }) => {
  const b = look.build ?? 1, hy = SH_Y * (look.height ?? 1);
  const w0 = 44 * b, w1 = 38 * b;
  const body = `M${-w0 + 12} ${hy - 4} Q0 ${hy - 9} ${w0 - 12} ${hy - 4} Q${w0 + 2} ${hy} ${w0 + 1} ${hy + 18} L${w1} ${HIP_Y + 4} Q${w1} ${HIP_Y + 12} ${w1 - 8} ${HIP_Y + 12} L${-w1 + 8} ${HIP_Y + 12} Q${-w1} ${HIP_Y + 12} ${-w1} ${HIP_Y + 4} L${-w0 - 1} ${hy + 18} Q${-w0 - 2} ${hy} ${-w0 + 12} ${hy - 4} Z`;
  const outer = look.outer ?? look.shirt;
  const neckV = `M-12 ${hy - 6} L0 ${hy + 12} L12 ${hy - 6} Z`;
  return (
    <g>
      <path d={body} fill={look.outfit === 'suit' || look.outfit === 'vest' ? outer : look.shirt} />
      <path d={body} fill="#000" opacity={0.08} style={{ clipPath: 'inset(0 0 0 50%)' }} />
      {look.outfit === 'suit' && <>
        <path d={`M-18 ${hy - 6} L0 ${hy + 40} L18 ${hy - 6} Z`} fill={look.shirt} />
        {look.tie && <path d={`M-5 ${hy} L5 ${hy} L7 ${hy + 34} L0 ${hy + 44} L-7 ${hy + 34} Z`} fill={look.tie} />}
        <path d={`M-18 ${hy - 6} L-4 ${hy + 46} L-24 ${hy + 16} Z M18 ${hy - 6} L4 ${hy + 46} L24 ${hy + 16} Z`} fill={shade(outer, 0.75)} />
        <circle cx={0} cy={HIP_Y - 14} r={3} fill={shade(outer, 0.6)} />
      </>}
      {look.outfit === 'vest' && <>
        <path d={`M-16 ${hy - 6} L0 ${hy + 26} L16 ${hy - 6} Z`} fill={look.shirt} />
        <rect x={-w1 - 2} y={HIP_Y - 36} width={(w1 + 2) * 2} height={9} fill={look.trim ?? '#FFE15A'} opacity={0.9} />
        <rect x={-22} y={hy + 30} width={44} height={34} rx={6} fill="#fff" />
        <rect x={-22} y={hy + 30} width={44} height={10} rx={4} fill={shade(outer, 0.8)} />
        <text transform={`scale(${dir} 1)`} x={0} y={hy + 61} fontSize={22} fontWeight={800} textAnchor="middle" fill="#1A1A22" fontFamily={badgeFont}>{look.number ?? '00'}</text>
      </>}
      {look.outfit === 'apron' && <path d={`M-24 ${hy + 22} h48 l4 ${HIP_Y + 12 - hy - 22} h-56 Z`} fill={outer} />}
      {(look.outfit === 'shirt') && <path d={`M-16 ${hy - 6} L-3 ${hy + 12} L-8 ${hy + 16} Z M16 ${hy - 6} L3 ${hy + 12} L8 ${hy + 16} Z`} fill={shade(look.shirt, 0.86)} />}
      {(look.outfit === 'tee' || look.outfit === 'dress') && <path d={neckV} fill={look.skin} />}
      {look.badge && <>
        <path d={`M-14 ${hy - 4} L-6 ${hy + 52} M14 ${hy - 4} L6 ${hy + 52}`} stroke="#1E2A52" strokeWidth={4} />
        <rect x={-20} y={hy + 50} width={40} height={30} rx={5} fill="#fff" stroke="#1E2A52" strokeWidth={2} />
        <rect x={-20} y={hy + 50} width={40} height={8} rx={3} fill={look.badge.color} />
        <text transform={`scale(${dir} 1)`} x={0} y={hy + 75} fontSize={13} fontWeight={700} textAnchor="middle" fill="#1A1A22" fontFamily={badgeFont}>{look.badge.name}</text>
      </>}
    </g>
  );
};

const Arm: React.FC<{ look: FlatLook; a: ReturnType<typeof flatJoints>['L'] }> = ({ look, a }) => {
  const sleeve = look.outfit === 'suit' ? look.outer ?? look.shirt : look.shirt;
  const mid: P = [a.S[0] + (a.E[0] - a.S[0]) * 0.6, a.S[1] + (a.E[1] - a.S[1]) * 0.6];
  const long = look.sleeves === 'long';
  return (
    <g>
      {seg([a.S, a.E, a.H], 19, look.skin)}
      {long ? seg([a.S, a.E, [a.E[0] + (a.H[0] - a.E[0]) * 0.8, a.E[1] + (a.H[1] - a.E[1]) * 0.8]], 23, sleeve) : seg([a.S, mid], 27, sleeve)}
      <circle cx={a.H[0]} cy={a.H[1]} r={13} fill={look.skin} />
      <circle cx={a.H[0] + Math.sin(rad(a.angle + 90)) * 9} cy={a.H[1] + Math.cos(rad(a.angle + 90)) * 9} r={5.5} fill={shade(look.skin, 0.93)} />
    </g>
  );
};

/** Flat cartoon person, front view. dir=-1 mirrors (character looks the other way: also flip gaze). */
export const FlatCharacter: React.FC<{
  x: number; y: number; look: FlatLook; pose?: FlatPose; scale?: number; dir?: 1 | -1;
  expr?: FlatExpr; mouth?: number; blink?: number; gaze?: P; opacity?: number; font?: string; shadow?: boolean;
  /** draw a prop in the screen-right hand (phone, sign); gets the hand position and forearm angle */
  holdR?: (pos: P, angle: number) => React.ReactNode; holdL?: (pos: P, angle: number) => React.ReactNode; children?: React.ReactNode;
}> = ({ x, y, look, pose = FLAT_REST, scale = 1, dir = 1, expr = 'neutral', mouth = 0, blink = 0, gaze = [0, 0], opacity = 1, font, shadow = true, holdR, holdL, children }) => {
  const uid = 'fc' + React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const j = flatJoints(pose, look);
  const legs = (s: number, lift: number) => {
    const hx = s * (17 + pose.spread * 0.5) * (look.build ?? 1);
    const top: P = [hx, HIP_Y + 4 - pose.bob * 0.4], foot: P = [hx + s * pose.spread * 0.6, -6 - lift * 16 - Math.max(0, pose.bob) * 0.6];
    return (
      <g key={s}>
        {look.outfit === 'dress' ? seg([[top[0] * 0.6, HIP_Y + 40], foot], 15, look.skin) : seg([top, foot], 29, look.pants)}
        <ellipse cx={foot[0] + s * 4} cy={foot[1] + 4} rx={19} ry={10} fill={look.shoes} />
      </g>
    );
  };
  const tilt = (pose.lean + pose.head) * 0.9;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale * dir} ${scale})`} opacity={opacity}>
      {shadow && <ellipse cx={0} cy={2} rx={62 * (look.build ?? 1)} ry={11} fill="#000" opacity={0.16} />}
      {legs(-1, pose.legL)}{legs(1, pose.legR)}
      {look.outfit === 'dress' && <path d={`M-38 ${HIP_Y - 26 - pose.bob} L38 ${HIP_Y - 26 - pose.bob} L50 ${HIP_Y + 44 - pose.bob} Q0 ${HIP_Y + 52 - pose.bob} -50 ${HIP_Y + 44 - pose.bob} Z`} fill={look.pants} />}
      <g transform={`translate(0 ${-pose.bob}) rotate(${pose.lean} 0 ${HIP_Y})`}>
        <Torso look={look} badgeFont={font} dir={dir} />
      </g>
      <g transform={`translate(${j.head[0]} ${j.head[1]}) rotate(${tilt})`}>
        <Hair look={look} back />
        <rect x={-10} y={HEAD_R - 8} width={20} height={16} fill={shade(look.skin, 0.9)} />
        <ellipse cx={-HEAD_R + 1} cy={6} rx={8} ry={11} fill={shade(look.skin, 0.95)} />
        <ellipse cx={HEAD_R - 1} cy={6} rx={8} ry={11} fill={shade(look.skin, 0.95)} />
        <ellipse cx={0} cy={0} rx={HEAD_R} ry={HEAD_R - 1} fill={look.skin} />
        <clipPath id={`h${uid}`}><ellipse cx={0} cy={0} rx={HEAD_R} ry={HEAD_R - 1} /></clipPath>
        <ellipse cx={HEAD_R * 0.55} cy={HEAD_R * 0.35} rx={HEAD_R * 0.8} ry={HEAD_R} fill="#7A3A1A" opacity={0.07} clipPath={`url(#h${uid})`} />
        <Face look={look} expr={expr} mouth={mouth} blink={blink} gaze={gaze} uid={uid} />
        <Hair look={look} />
        {look.glasses === 'shadesUp' && <g transform={`translate(0 ${-HEAD_R * 0.72})`}><path d="M-32 -6 h64 v4 q0 12 -12 12 h-6 q-10 0 -10 -10 h-4 q0 10 -10 10 h-6 q-12 0 -12 -12 Z" fill="#18181C" /><path d="M-24 -3 h7" stroke="#fff" strokeOpacity={0.5} strokeWidth={3} strokeLinecap="round" /></g>}
      </g>
      <Arm look={look} a={j.L} />
      <Arm look={look} a={j.R} />
      {holdL?.(j.L.H, j.L.angle)}
      {holdR?.(j.R.H, j.R.angle)}
      {children}
    </g>
  );
};

// ---------- props and cartoon FX (scene space or inside children) ----------
/** Phone in a hand: <FlatCharacter holdR={phoneProp()} /> */
export const phoneProp = (screen = '#4FD1C5') => (pos: P) => (
  <g transform={`translate(${pos[0] - 8} ${pos[1] - 44})`}>
    <rect x={0} y={0} width={28} height={50} rx={6} fill="#1C1C22" />
    <rect x={3} y={5} width={22} height={38} rx={3} fill={screen} />
  </g>
);
/** Sweat drop sliding down beside the head (t = frames since it appeared). */
export const Sweat: React.FC<{ x: number; y: number; t: number; size?: number }> = ({ x, y, t, size = 1 }) => {
  const k = interpolate(t, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <g transform={`translate(${x} ${y + Math.min(t, 40) * 0.6}) scale(${size * k})`}>
      <path d="M0 -26 Q16 0 14 10 A14 14 0 0 1 -14 10 Q-16 0 0 -26 Z" fill="#7FD3F7" stroke="#2C8FC0" strokeWidth={2.5} />
      <ellipse cx={-5} cy={6} rx={3} ry={6} fill="#fff" opacity={0.8} />
    </g>
  );
};
/** Shock / surprise lines radiating around a point (t = frames since the surprise). */
export const ShockLines: React.FC<{ x: number; y: number; t: number; r?: number; color?: string; n?: number }> = ({ x, y, t, r = 80, color = '#2A1E1E', n = 7 }) => {
  const k = interpolate(t, [0, 5, 18, 26], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <g transform={`translate(${x} ${y})`} opacity={k}>
      {Array.from({ length: n }, (_, i) => {
        const a = Math.PI * (1.12 + (i / (n - 1)) * 0.76), r0 = r * (0.95 + 0.15 * k), r1 = r0 + 22 + (i % 2) * 10;
        return <line key={i} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * r1} y2={Math.sin(a) * r1} stroke={color} strokeWidth={5} strokeLinecap="round" />;
      })}
    </g>
  );
};
/** Red anger mark (manga vein). */
export const AngerMark: React.FC<{ x: number; y: number; t: number }> = ({ x, y, t }) => {
  const s = 1 + 0.12 * Math.sin(t / 3);
  return <g transform={`translate(${x} ${y}) scale(${s})`} stroke="#E53935" strokeWidth={5} fill="none" strokeLinecap="round">{[0, 90, 180, 270].map((a) => <path key={a} transform={`rotate(${a})`} d="M4 -16 Q4 -4 16 -4" />)}</g>;
};
/** Small sparkles (money, good idea, shine). */
export const Sparkles: React.FC<{ x: number; y: number; t: number; color?: string; n?: number; r?: number }> = ({ x, y, t, color = '#FFD54A', n = 5, r = 70 }) => (
  <g transform={`translate(${x} ${y})`}>
    {Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + 0.4, ph = (t / 14 + i * 0.37) % 1, s = Math.sin(ph * Math.PI) * 12;
      return <path key={i} transform={`translate(${Math.cos(a) * r} ${Math.sin(a) * r * 0.7})`} d={`M0 ${-s} Q0 0 ${s} 0 Q0 0 0 ${s} Q0 0 ${-s} 0 Q0 0 0 ${-s} Z`} fill={color} />;
    })}
  </g>
);
