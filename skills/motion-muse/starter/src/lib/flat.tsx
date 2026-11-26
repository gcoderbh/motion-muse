// Flat 2D cartoon people for explainer stories (big head, outfits, many expressions).
// Views: pose.yaw 0 front, 0.5 three-quarter, 1 side, 2 back. Sit/lie/jump with flatPose('sit'), flatPose('lie'), flatJump().
// <svg viewBox="0 0 W H"><FlatCharacter x={600} y={900} look={FLAT_LOOKS.office} pose={flatPose('shocked')} expr="shocked" /></svg>
// Soft cel shading by default (finish='soft', light='left'); finish='flat' for single fills. Design rules: references/character-design.md
// (x, y) is the ground point between the feet. Everything is a pure function of props: animate with useCurrentFrame().
import React from 'react';
import { interpolate } from 'remotion';
import { noise1 } from './noise';

type P = [number, number];
const rad = (d: number) => (d * Math.PI) / 180;

// ---------- pose ----------
/** Arm angles in degrees from hanging straight down, + = out to that side (forward in side view); elbow bends the forearm (+ = further out/up, - = across the body).
 * yaw: 0 front, 0.5 three-quarter, 1 side, 1.5 three-quarter back, 2 back; turns toward +x (dir=-1 mirrors).
 * hipL/hipR: thigh swings forward (deg), kneeL/kneeR: shin folds back (deg). bob < 0 lowers the hips (sitting).
 * air: height of the feet above the ground (the ground shadow stays and shrinks), squash: vertical scale at the feet (<1 squash, >1 stretch), roll: whole-body turn (±90 = lying). */
export type FlatPose = {
  lean: number; head: number; shL: number; elL: number; shR: number; elR: number; legL: number; legR: number; bob: number; spread: number;
  yaw: number; hipL: number; hipR: number; kneeL: number; kneeR: number; air: number; squash: number; roll: number;
};
export const FLAT_REST: FlatPose = { lean: 0, head: 0, shL: 10, elL: 6, shR: 10, elR: 6, legL: 0, legR: 0, bob: 0, spread: 0, yaw: 0, hipL: 0, hipR: 0, kneeL: 0, kneeR: 0, air: 0, squash: 1, roll: 0 };
export const FLAT_VIEW = { front: 0, three: 0.5, side: 1, threeBack: 1.5, back: 2 };
const THIGH = 40, SHIN = 38;
/** bob that keeps the foot on the ground for a bent leg (hip and knee in degrees). */
export const flatPlant = (hip: number, knee: number) => -(THIGH + SHIN - THIGH * Math.cos((hip * Math.PI) / 180) - SHIN * Math.cos(((hip - knee) * Math.PI) / 180));
/** Seat height above the ground (scale 1) for flatPose('sit'): put the chair top here. */
export const FLAT_SEAT = 36;
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
  sit: { hipL: 90, hipR: 90, kneeL: 90, kneeR: 90, bob: -40, shL: 12, elL: -38, shR: 12, elR: -38 },          // on a chair, hands on the lap (seat at FLAT_SEAT)
  sitFloor: { hipL: 120, hipR: 120, kneeL: 140, kneeR: 140, bob: -62, shL: 26, elL: -70, shR: 26, elR: -70 }, // on the floor hugging the knees
  slump: { hipL: 90, hipR: 90, kneeL: 90, kneeR: 90, bob: -40, lean: 6, head: -14, shL: 4, elL: 4, shR: 4, elR: 4 }, // tired on a chair
  lie: { roll: -90, shL: 8, shR: 8, elL: 4, elR: 4 },                                       // flat on the back, head to screen-left
  lieSide: { roll: -90, hipL: 60, hipR: 50, kneeL: 90, kneeR: 80, shL: 40, elL: -90, shR: 30, elR: -80 },  // curled on the side, facing the camera
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
/** Side or three-quarter walk (yaw defaults to 1): the planted foot moves back at a constant speed, the swinging knee
 * bends, arms counter-swing, hips drop at each contact. Move x by FLAT_STRIDE * scale per cycle (phase 0..1 = two steps). */
export const FLAT_STRIDE = 127;
export const flatStride = (phase: number, over: Partial<FlatPose> = {}): FlatPose => {
  const X = FLAT_STRIDE / 4, L = THIGH + SHIN, deg = (r: number) => (r * 180) / Math.PI;
  const leg = (p: number) => {
    p -= Math.floor(p);
    if (p < 0.5) return { h: deg(Math.asin((X * (1 - 4 * p)) / L)), k: 0 }; // stance: foot x = X..-X, linear
    const q = (p - 0.5) / 0.5, k = 42 * Math.sin(Math.PI * q);
    return { h: deg(Math.asin((-X * Math.cos(Math.PI * q)) / L)) + (k * SHIN) / L, k };
  };
  const l = leg(phase), r = leg(phase + 0.5), stance = phase - Math.floor(phase) < 0.5 ? l : r, d = Math.cos(phase * Math.PI * 2);
  return { ...FLAT_REST, yaw: 1, hipL: l.h, hipR: r.h, kneeL: l.k, kneeR: r.k, bob: flatPlant(stance.h, 0), shL: 10 - 22 * d, shR: 10 + 22 * d, elL: 16, elR: 16, head: 1.5 * Math.sin(phase * Math.PI * 4), ...over };
};
/** Jump with anticipation, stretch in the air and a springy landing. t = frames since the jump started. Merge: flatPose('rest', flatJump(t)). */
export const flatJump = (t: number, dur = 30, height = 150): Partial<FlatPose> => {
  const u = Math.max(0, Math.min(1, t / dur));
  const ease = (x: number) => Math.sin(Math.max(0, Math.min(1, x)) * Math.PI / 2);
  const bend = (k: number) => ({ hipL: 30 * k, hipR: 30 * k, kneeL: 60 * k, kneeR: 60 * k, bob: flatPlant(30 * k, 60 * k) });
  if (u < 0.25) { const k = ease(u / 0.25); return { ...bend(k), squash: 1 - 0.14 * k, shL: 10 - 30 * k, shR: 10 - 30 * k, lean: 4 * k }; }
  if (u < 0.8) { // legs extend during the first frames of take-off, so every value carries on from the crouch
    const v = (u - 0.25) / 0.55, e = ease(v / 0.18), sh = -20 + (130 - 40 * v) * e;
    return { ...bend(1 - e), air: height * 4 * v * (1 - v), squash: v < 0.18 ? 0.86 + 0.26 * e : 1.12 - 0.12 * ((v - 0.18) / 0.82), shL: sh, shR: sh, elL: 6 + 14 * e, elR: 6 + 14 * e, lean: 4 * (1 - e) };
  }
  const w = (u - 0.8) / 0.2, k = w < 0.3 ? ease(w / 0.3) : Math.cos(((w - 0.3) / 0.7) * Math.PI / 2);
  return { ...bend(k), squash: 1 - 0.18 * k, shL: 110 - 100 * w + 40 * k, shR: 110 - 100 * w + 40 * k, elL: 20 - 14 * w + 20 * k, elR: 20 - 14 * w + 20 * k };
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
// Motion Muse "sticker" style: wide pebble head on a short neck that the collar wraps, bean torso,
// mitten hands, every shape outlined in a darker tone of its own colour.
const SH_Y = -176, HIP_Y = -92, UP = 50, FORE = 44, HEAD_R = 50, HW = 58, HH = 52;
const NECK_BASE = 12, NECK_L = 36, NECK_PIVOT = 14;
const dir2 = (s: number, a: number): P => [s * Math.sin(rad(a)), Math.cos(rad(a))];
/** Joint positions in character space (before x/y/scale): use them to hang a badge over the head or put a prop in a hand. */
export const flatJoints = (p: FlatPose, look: FlatLook = base) => {
  const hgt = look.height ?? 1;
  const lift = -p.bob;
  const rot = (q: P): P => { // lean around the hip
    const a = rad(p.lean), dx = q[0], dy = q[1] - HIP_Y;
    return [dx * Math.cos(a) - dy * Math.sin(a), HIP_Y + dx * Math.sin(a) + dy * Math.cos(a) + lift];
  };
  // yaw: joints sit on a cylinder; sideways arm angles swing toward where the body faces
  const ya = rad((p.yaw ?? 0) * 90), cy = Math.cos(ya), sy = Math.sin(ya);
  const arm = (s: number, sh: number, el: number) => {
    const m = Math.max(-1, Math.min(1, s * cy + sy));
    const S: P = [s * 36 * (look.build ?? 1) * cy, SH_Y * hgt + 12];
    const ua = dir2(m, sh), E: P = [S[0] + ua[0] * UP, S[1] + ua[1] * UP];
    const fa = dir2(m, sh + el), Hd: P = [E[0] + fa[0] * FORE, E[1] + fa[1] * FORE];
    return { S: rot(S), E: rot(E), H: rot(Hd), angle: sh + el, z: -s * sy };
  };
  // Neck rides the torso; the head turns on the top of the neck, and the neck only bends for big tilts.
  const turn = p.head * 0.9;
  const bend = Math.sign(turn) * Math.max(0, Math.abs(turn) - 10) * 0.25;
  const base: P = [0, SH_Y * hgt + NECK_BASE];
  const top: P = [base[0] + NECK_L * Math.sin(rad(bend)), base[1] - NECK_L * Math.cos(rad(bend))];
  const off = HH - NECK_PIVOT;
  const neck = rot(base);
  const head = rot([top[0] + off * Math.sin(rad(turn)), top[1] - off * Math.cos(rad(turn))]);
  return { neck, head, headTop: [head[0], head[1] - HH - 14] as P, headAngle: p.lean + turn, neckBend: bend, neckBase: base, L: arm(-1, p.shL, p.elL), R: arm(1, p.shR, p.elR), hip: rot([0, HIP_Y]) };
};

// ---------- parts ----------
const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0')}`;
};
const edge = (c: string) => shade(c, 0.62);
const OL = 4;
// sd = side the shadow falls on in character space (0 = flat colour, no cel shading)
const seg = (pts: P[], w: number, col: string, outline = true, sd = 0) => {
  const pp = pts.map((q) => q.join(',')).join(' ');
  const line = { fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return <g>
    {outline && <polyline points={pp} {...line} stroke={edge(col)} strokeWidth={w + OL * 2} />}
    <polyline points={pp} {...line} stroke={sd ? shade(col, 0.84) : col} strokeWidth={w} />
    {sd !== 0 && <polyline points={pp} {...line} stroke={col} strokeWidth={w * 0.6} transform={`translate(${-sd * w * 0.15} ${-w * 0.12})`} />}
  </g>;
};

// hair is drawn for a round head of radius HEAD_R and stretched to the pebble head
const Hair: React.FC<{ look: FlatLook; back?: boolean; shadow?: string; sd?: number }> = ({ look, back, shadow, sd = 0 }) => {
  const r = HEAD_R;
  if (shadow && back) return null;
  const shape = hairShape(look, !!back, shadow);
  if (back || shadow || !sd || !shape || look.hairStyle === 'bald') return shape;
  return <g>{shape}<path d={`M${-sd * r * 0.66} ${-r * 0.5} Q${-sd * r * 0.42} ${-r * 0.88} ${-sd * r * 0.02} ${-r * 0.96}`} fill="none" stroke="#fff" strokeOpacity={0.32} strokeWidth={5} strokeLinecap="round" /></g>;
};
const hairShape = (look: FlatLook, back: boolean, shadow?: string) => {
  const r = HEAD_R, c = shadow ?? look.hair, d = shadow ?? shade(c, 0.8);
  const st = shadow ? { stroke: 'none' } : { stroke: edge(c), strokeWidth: OL, strokeLinejoin: 'round' as const };
  switch (look.hairStyle) {
    case 'spiky': // three soft tufts, not spikes
      return back ? null : <path {...st} d={`M${-r - 2} 6 Q${-r - 6} ${-r * 0.9} ${-r * 0.5} ${-r - 6} Q${-r * 0.3} ${-r - 22} ${-r * 0.02} ${-r - 10} Q${r * 0.25} ${-r - 24} ${r * 0.45} ${-r - 6} Q${r + 8} ${-r * 0.9} ${r + 2} 6 Q${r * 0.85} ${-r * 0.5} ${r * 0.3} ${-r * 0.55} Q${r * 0.1} ${-r * 0.3} ${-r * 0.15} ${-r * 0.55} Q${-r * 0.8} ${-r * 0.55} ${-r - 2} 6 Z`} fill={c} />;
    case 'side':
      return back ? null : <path {...st} d={`M${-r - 1} 6 Q${-r - 4} ${-r - 10} ${r * 0.1} ${-r - 8} Q${r + 8} ${-r - 4} ${r + 1} 6 Q${r * 0.85} ${-r * 0.6} ${-r * 0.2} ${-r * 0.62} Q${-r * 0.75} ${-r * 0.5} ${-r - 1} 6 Z`} fill={c} />;
    case 'buzz':
      return back ? null : <path d={`M${-r} -2 Q${-r} ${-r - 4} 0 ${-r - 4} Q${r} ${-r - 4} ${r} -2 Q${r * 0.6} ${-r * 0.7} 0 ${-r * 0.72} Q${-r * 0.6} ${-r * 0.7} ${-r} -2 Z`} fill={c} opacity={0.92} />;
    case 'bald':
      return back ? null : <g fill={c} {...st}>
        <path d={`M${-r - 3} 10 Q${-r - 6} ${-r * 0.5} ${-r * 0.55} ${-r * 0.62} Q${-r * 0.8} ${-r * 0.2} ${-r * 0.72} 8 Z`} />
        <path d={`M${r + 3} 10 Q${r + 6} ${-r * 0.5} ${r * 0.55} ${-r * 0.62} Q${r * 0.8} ${-r * 0.2} ${r * 0.72} 8 Z`} />
      </g>;
    case 'bob':
      return back ? <path {...st} d={`M${-r - 8} ${r * 0.5} Q${-r - 12} ${-r - 8} 0 ${-r - 10} Q${r + 12} ${-r - 8} ${r + 8} ${r * 0.5} Z`} fill={d} />
        : <path {...st} d={`M${-r - 4} ${r * 0.15} Q${-r - 6} ${-r - 8} ${r * 0.1} ${-r - 9} Q${r + 6} ${-r - 6} ${r + 4} ${r * 0.15} Q${r * 0.9} ${-r * 0.45} ${r * 0.2} ${-r * 0.5} Q${-r * 0.2} ${-r * 0.3} ${-r * 0.5} ${-r * 0.55} Q${-r * 0.9} ${-r * 0.4} ${-r - 4} ${r * 0.15} Z`} fill={c} />;
    case 'long':
      return back ? <path {...st} d={`M${-r - 8} ${r * 1.5} Q${-r - 14} ${-r - 8} 0 ${-r - 10} Q${r + 14} ${-r - 8} ${r + 8} ${r * 1.5} Q0 ${r * 1.7} ${-r - 8} ${r * 1.5} Z`} fill={d} />
        : <path {...st} d={`M${-r - 4} ${r * 0.4} Q${-r - 6} ${-r - 8} ${r * 0.1} ${-r - 9} Q${r + 6} ${-r - 6} ${r + 4} ${r * 0.4} Q${r * 0.9} ${-r * 0.4} ${r * 0.15} ${-r * 0.55} Q${-r * 0.8} ${-r * 0.45} ${-r - 4} ${r * 0.4} Z`} fill={c} />;
    case 'bun':
      return back ? <circle {...st} cx={0} cy={-r - 12} r={r * 0.42} fill={d} />
        : <path {...st} d={`M${-r - 2} 6 Q${-r - 4} ${-r - 6} 0 ${-r - 6} Q${r + 4} ${-r - 6} ${r + 2} 6 Q${r * 0.8} ${-r * 0.5} 0 ${-r * 0.55} Q${-r * 0.8} ${-r * 0.5} ${-r - 2} 6 Z`} fill={c} />;
    case 'curly':
      return back ? null : <g fill={c} {...st}>{Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (1.05 + i * 0.112); return <circle key={i} cx={Math.cos(a) * r * 0.92} cy={Math.sin(a) * r * 0.92 - 4} r={r * 0.3} />; })}</g>;
    default: return null;
  }
};

// face features ride a cylinder: at yaw a they slide toward the facing side, narrow, and fade round the back
const FACE_R = 52;
const onFace = (x0: number, a: number, node: React.ReactNode) => {
  if (!a) return node;
  const t0 = Math.asin(Math.max(-1, Math.min(1, x0 / FACE_R))), t = t0 + rad(a * 0.7), z = Math.cos(t);
  const vis = Math.max(0, Math.min(1, (z - 0.05) / 0.25));
  if (vis <= 0) return null;
  return <g opacity={vis < 1 ? vis : undefined} transform={`translate(${FACE_R * Math.sin(t)} 0) scale(${Math.max(0.05, z / Math.cos(t0))} 1) translate(${-x0} 0)`}>{node}</g>;
};
const Face: React.FC<{ look: FlatLook; expr: FlatExpr; mouth: number; blink: number; gaze: P; uid: string; yaw?: number }> = ({ look, expr, mouth, blink, gaze, uid, yaw = 0 }) => {
  const F = (x0: number, node: React.ReactNode) => onFace(x0, yaw, node);
  const ink = look.ink ?? '#2A1E1E';
  const big = expr === 'shocked';
  const ex = 21, ey = -4;
  const closed = expr === 'happy' || expr === 'laugh';
  const lid = Math.max(blink, expr === 'smug' || expr === 'sleepy' ? 0.45 : 0);
  const eye = (s: number) => {
    const x = s * ex + gaze[0] * 4, y = ey + gaze[1] * 3;
    if (closed || (expr === 'wink' && s > 0)) return <path key={s} d={`M${x - 9} ${y + 3} Q${x} ${y - 8} ${x + 9} ${y + 3}`} stroke={ink} strokeWidth={5} fill="none" strokeLinecap="round" />;
    if (big) return ( // ring eyes with a pin pupil
      <g key={s}>
        <circle cx={x} cy={y} r={14 * (1 - 0.9 * blink) + 1} fill="#fff" stroke={ink} strokeWidth={3.5} />
        {blink < 0.5 && <circle cx={x + gaze[0] * 4} cy={y + gaze[1] * 4} r={3.4} fill={ink} />}
      </g>);
    const ry = 10.5 * (1 - 0.92 * blink), rx = 7;
    if (blink > 0.85) return <path key={s} d={`M${x - 7} ${y} h14`} stroke={ink} strokeWidth={4.5} strokeLinecap="round" />;
    return ( // solid capsule eyes: the house style
      <g key={s}>
        <clipPath id={`e${uid}${s}`}><rect x={x - rx - 2} y={y - ry + 2 * ry * lid} width={rx * 2 + 4} height={ry * 2 + 4} /></clipPath>
        <g clipPath={`url(#e${uid}${s})`}>
          <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={look.iris ?? ink} />
          <circle cx={x + 2.4} cy={y - ry * 0.42} r={2.6} fill="#fff" />
        </g>
        {lid > 0.05 && <path d={`M${x - rx - 2} ${y - ry + 2 * ry * lid} h${rx * 2 + 4}`} stroke={ink} strokeWidth={4} strokeLinecap="round" />}
        {look.lashes && <path d={`M${x + s * (rx - 1)} ${y - ry + 3} l${s * 6} -5`} stroke={ink} strokeWidth={3} strokeLinecap="round" />}
      </g>);
  };
  const by = big ? -32 : -25;
  const brow = (s: number) => {
    const tilt = expr === 'angry' ? 8 : expr === 'worried' || expr === 'sad' || expr === 'shocked' ? -7 : expr === 'smug' ? (s > 0 ? -5 : 2) : 0;
    const x0 = s * 12, x1 = s * 30;
    return <path key={s} d={`M${x0} ${by + tilt} L${x1} ${by - tilt * 0.5}`} stroke={look.hair === '#E9E6E1' ? '#9A948C' : look.hair} strokeWidth={6.5} fill="none" strokeLinecap="round" />;
  };
  const my = 24;
  const open = expr === 'shocked' ? Math.max(0.85, mouth) : expr === 'laugh' ? Math.max(0.7, mouth) : mouth;
  let m: React.ReactNode;
  if (open > 0.05) {
    // a D-shaped mouth that opens wide: flat top lip for talking, round for shock
    const w = expr === 'shocked' ? 10 + 3 * open : 9 + 9 * open, h = expr === 'shocked' ? 8 + 14 * open : 3 + 18 * open;
    const d = expr === 'shocked' ? `M0 ${my - h * 0.6} Q${w} ${my - h * 0.6} ${w} ${my + h * 0.3} Q${w} ${my + h} 0 ${my + h} Q${-w} ${my + h} ${-w} ${my + h * 0.3} Q${-w} ${my - h * 0.6} 0 ${my - h * 0.6} Z`
      : `M${-w} ${my - 3} Q0 ${my - 1} ${w} ${my - 3} Q${w * 0.9} ${my + h} 0 ${my + h} Q${-w * 0.9} ${my + h} ${-w} ${my - 3} Z`;
    m = (
      <g>
        <clipPath id={`m${uid}`}><path d={d} /></clipPath>
        <path d={d} fill="#5A1624" stroke={ink} strokeWidth={3.5} strokeLinejoin="round" />
        <g clipPath={`url(#m${uid})`}>
          {expr !== 'shocked' && <rect x={-w} y={my - 6} width={w * 2} height={Math.min(6, h * 0.35) + 3} fill="#fff" />}
          <ellipse cx={0} cy={my + h * 1.05} rx={w * 0.7} ry={h * 0.5} fill="#E8677A" />
        </g>
      </g>
    );
  } else if (expr === 'happy' || expr === 'wink') m = <path d={`M-13 ${my - 3} Q0 ${my - 1} 13 ${my - 3} Q11 ${my + 12} 0 ${my + 12} Q-11 ${my + 12} -13 ${my - 3} Z`} stroke={ink} strokeWidth={3.5} fill="#5A1624" strokeLinejoin="round" />;
  else if (expr === 'smug') m = <path d={`M-10 ${my + 2} Q4 ${my + 6} 14 ${my - 5}`} stroke={ink} strokeWidth={4.5} fill="none" strokeLinecap="round" />;
  else if (expr === 'sad' || expr === 'angry') m = <path d={`M-11 ${my + 5} Q0 ${my - 5} 11 ${my + 5}`} stroke={ink} strokeWidth={4.5} fill="none" strokeLinecap="round" />;
  else if (expr === 'worried') m = <path d={`M-12 ${my + 2} q6 -5 12 0 q6 5 12 0`} stroke={ink} strokeWidth={4} fill="none" strokeLinecap="round" />;
  else m = <path d={`M-9 ${my} Q0 ${my + 5} 9 ${my}`} stroke={ink} strokeWidth={4.5} fill="none" strokeLinecap="round" />;
  const ink3 = { stroke: ink, strokeWidth: 3.5, fill: 'rgba(255,255,255,0.18)' };
  const mc = look.hair === '#E9E6E1' ? '#D9D4CC' : look.hair;
  return (
    <g>
      {look.blush !== false && <g fill="#FF7E7E" opacity={expr === 'shocked' ? 0.15 : 0.38}>{F(-36, <ellipse cx={-36} cy={14} rx={10} ry={6} />)}{F(36, <ellipse cx={36} cy={14} rx={10} ry={6} />)}</g>}
      {F(-ex, eye(-1))}{F(ex, eye(1))}
      {F(-21, brow(-1))}{F(21, brow(1))}
      {F(0, <ellipse cx={0} cy={11} rx={4.5} ry={3.2} fill={shade(look.skin, 0.8)} />)}
      {look.mustache && F(0, <path d={`M-18 ${my - 6} Q-9 ${my - 13} 0 ${my - 8} Q9 ${my - 13} 18 ${my - 6} Q9 ${my - 2} 0 ${my - 6} Q-9 ${my - 2} -18 ${my - 6} Z`} fill={mc} stroke={edge(mc)} strokeWidth={2.5} />)}
      {F(0, m)}
      {look.beard && F(0, <path d={`M-34 ${my - 8} Q-30 ${HH - 2} 0 ${HH + 4} Q30 ${HH - 2} 34 ${my - 8} Q20 ${my + 20} 0 ${my + 20} Q-20 ${my + 20} -34 ${my - 8} Z`} fill={look.hair} opacity={0.9} />)}
      {look.old && <g stroke={shade(look.skin, 0.72)} strokeWidth={2.5} fill="none" strokeLinecap="round">{F(0, <path d="M-16 -40 q16 -5 32 0" />)}{F(-42, <path d="M-42 6 q-3 8 0 14" />)}{F(42, <path d="M42 6 q3 8 0 14" />)}</g>}
      {look.glasses === 'round' && <g {...ink3}>{F(-ex, <circle cx={-ex} cy={ey} r={16} />)}{F(ex, <circle cx={ex} cy={ey} r={16} />)}{F(0, <path d={`M-5 ${ey - 2} q5 -4 10 0`} fill="none" />)}</g>}
      {look.glasses === 'square' && <g {...ink3}>{F(-ex, <rect x={-ex - 16} y={ey - 13} width={32} height={26} rx={7} />)}{F(ex, <rect x={ex - 16} y={ey - 13} width={32} height={26} rx={7} />)}{F(0, <path d={`M-5 ${ey - 2} h10`} />)}</g>}
      {look.glasses === 'shades' && F(0, <g><path d={`M-40 ${ey - 10} h80 v6 q0 15 -15 15 h-7 q-13 0 -13 -13 h-10 q0 13 -13 13 h-7 q-15 0 -15 -15 Z`} fill="#18181C" /><path d="M-30 -10 l9 0" stroke="#fff" strokeOpacity={0.5} strokeWidth={3} strokeLinecap="round" /></g>)}
    </g>
  );
};

// bean torso: narrower at the shoulders, rounder at the belly; the collar is drawn after the head so the chin sits in it
const torsoPath = (look: FlatLook) => {
  const b = look.build ?? 1, hy = SH_Y * (look.height ?? 1);
  const w0 = 38 * b, w1 = 46 * b, bot = HIP_Y + 14;
  return `M${-w0 + 14} ${hy - 2} Q0 ${hy - 8} ${w0 - 14} ${hy - 2} Q${w0 + 4} ${hy + 2} ${w0 + 4} ${hy + 26} Q${w1 + 2} ${HIP_Y - 20} ${w1} ${bot - 12} Q${w1 - 2} ${bot} ${w1 - 16} ${bot} L${-w1 + 16} ${bot} Q${-w1 + 2} ${bot} ${-w1} ${bot - 12} Q${-w1 - 2} ${HIP_Y - 20} ${-w0 - 4} ${hy + 26} Q${-w0 - 4} ${hy + 2} ${-w0 + 14} ${hy - 2} Z`;
};
// yaw (degrees): front details (lapels, tie, number, badge, collar) slide toward the facing side and fold away round the back
const frontT = (a: number, r = 40) => `translate(${r * Math.sin(rad(a))} 0) scale(${Math.max(0.05, Math.cos(rad(a)))} 1)`;
const frontVis = (a: number) => Math.max(0, Math.min(1, (Math.cos(rad(a)) - 0.08) / 0.25));
const Torso: React.FC<{ look: FlatLook; badgeFont?: string; dir?: 1 | -1; uid: string; sd?: number; yaw?: number }> = ({ look, badgeFont, dir = 1, uid, sd = 0, yaw = 0 }) => {
  const fv = frontVis(yaw);
  const hy = SH_Y * (look.height ?? 1), b = look.build ?? 1;
  const body = torsoPath(look);
  const outer = look.outer ?? look.shirt;
  const main = look.outfit === 'suit' || look.outfit === 'vest' ? outer : look.shirt;
  return (
    <g>
      <path d={body} fill={main} stroke={edge(main)} strokeWidth={OL} strokeLinejoin="round" />
      <clipPath id={`t${uid}`}><path d={body} /></clipPath>
      <g clipPath={`url(#t${uid})`}>
        {sd ? <>
          <ellipse cx={sd * (46 * b + 10)} cy={HIP_Y - 30} rx={28 * b} ry={92} fill={shade(main, 0.85)} />
          <ellipse cx={0} cy={hy + 4} rx={30} ry={13} fill={shade(main, 0.78)} />
        </> : <ellipse cx={46 * b} cy={HIP_Y - 30} rx={26 * b} ry={80} fill="#000" opacity={0.1} />}
        {look.outfit === 'vest' && <rect x={-60} y={HIP_Y - 34} width={120} height={10} fill={look.trim ?? '#FFE15A'} />}
        {fv > 0 && <g transform={yaw ? frontT(yaw) : undefined} opacity={fv < 1 ? fv : undefined}>
        {look.outfit === 'suit' && <>
          <path d={`M-20 ${hy - 6} L0 ${hy + 44} L20 ${hy - 6} Z`} fill={look.shirt} />
          {look.tie && <path d={`M-6 ${hy + 4} L6 ${hy + 4} L8 ${hy + 36} L0 ${hy + 46} L-8 ${hy + 36} Z`} fill={look.tie} stroke={edge(look.tie)} strokeWidth={2.5} />}
          <path d={`M-20 ${hy - 6} L-3 ${hy + 50} L-28 ${hy + 18} Z M20 ${hy - 6} L3 ${hy + 50} L28 ${hy + 18} Z`} fill={shade(outer, 0.78)} stroke={edge(outer)} strokeWidth={2.5} strokeLinejoin="round" />
          <circle cx={0} cy={HIP_Y - 12} r={3.5} fill={shade(outer, 0.55)} />
        </>}
        {look.outfit === 'vest' && <>
          <path d={`M-18 ${hy - 6} L0 ${hy + 28} L18 ${hy - 6} Z`} fill={look.shirt} />
          <rect x={-24} y={hy + 34} width={48} height={36} rx={7} fill="#fff" stroke={edge(outer)} strokeWidth={2.5} />
          <text transform={`scale(${dir} 1)`} x={0} y={hy + 62} fontSize={23} fontWeight={800} textAnchor="middle" fill="#1A1A22" fontFamily={badgeFont}>{look.number ?? '00'}</text>
        </>}
        {look.outfit === 'apron' && <path d={`M-26 ${hy + 26} h52 l6 ${HIP_Y + 16 - hy - 26} h-64 Z`} fill={outer} stroke={edge(outer)} strokeWidth={2.5} />}
        </g>}
        {look.outfit !== 'dress' && <path d={`M-60 ${HIP_Y + 4} h120`} stroke={edge(main)} strokeWidth={3} opacity={0.6} />}
      </g>
    </g>
  );
};
// collar pieces wrap the base of the neck, so no bare neck shows outside the shirt
const Collar: React.FC<{ look: FlatLook; yaw?: number }> = ({ look, yaw = 0 }) => {
  const hy = SH_Y * (look.height ?? 1);
  if (Math.cos(rad(yaw)) < 0.35) // side and back: a band hugging the neck
    return <path d={`M-22 ${hy - 10} Q0 ${hy - 2} 22 ${hy - 10} L24 ${hy - 1} Q0 ${hy + 9} -24 ${hy - 1} Z`} fill={shade(look.outfit === 'suit' || look.outfit === 'vest' ? look.outer ?? look.shirt : look.shirt, 0.86)} stroke={edge(look.shirt)} strokeWidth={3} strokeLinejoin="round" />;
  if (yaw) return <g transform={frontT(yaw, 14)}><Collar look={look} /></g>;
  const c = look.outfit === 'suit' || look.outfit === 'vest' ? look.shirt : shade(look.shirt, 0.92);
  const st = { stroke: edge(c), strokeWidth: 3, strokeLinejoin: 'round' as const };
  if (look.outfit === 'tee' || look.outfit === 'dress' || look.outfit === 'apron')
    return <path d={`M-24 ${hy - 8} Q0 ${hy + 8} 24 ${hy - 8} L28 ${hy - 1} Q0 ${hy + 18} -28 ${hy - 1} Z`} fill={shade(look.shirt, 0.85)} {...st} stroke={edge(look.shirt)} />;
  return <g fill={c} {...st}>
    <path d={`M-1 ${hy + 4} L-22 ${hy - 5} L-25 ${hy + 9} L-9 ${hy + 19} Z`} />
    <path d={`M1 ${hy + 4} L22 ${hy - 5} L25 ${hy + 9} L9 ${hy + 19} Z`} />
  </g>;
};
const Badge: React.FC<{ look: FlatLook; font?: string; dir: 1 | -1; yaw?: number }> = ({ look, font, dir, yaw = 0 }) => {
  if (!look.badge || frontVis(yaw) <= 0) return null;
  if (yaw) return <g transform={frontT(yaw, 30)} opacity={frontVis(yaw)}><Badge look={look} font={font} dir={dir} /></g>;
  const hy = SH_Y * (look.height ?? 1);
  return <g>
    <path d={`M-16 ${hy + 6} L-7 ${hy + 54} M16 ${hy + 6} L7 ${hy + 54}`} stroke="#1E2A52" strokeWidth={4} strokeLinecap="round" />
    <rect x={-22} y={hy + 52} width={44} height={32} rx={6} fill="#fff" stroke="#1E2A52" strokeWidth={2.5} />
    <rect x={-22} y={hy + 52} width={44} height={9} rx={4} fill={look.badge.color} />
    <text transform={`scale(${dir} 1)`} x={0} y={hy + 79} fontSize={14} fontWeight={700} textAnchor="middle" fill="#1A1A22" fontFamily={font}>{look.badge.name}</text>
  </g>;
};

const Arm: React.FC<{ look: FlatLook; a: ReturnType<typeof flatJoints>['L']; sd?: number }> = ({ look, a, sd = 0 }) => {
  const sleeve = look.outfit === 'suit' ? look.outer ?? look.shirt : look.shirt;
  const mid: P = [a.S[0] + (a.E[0] - a.S[0]) * 0.65, a.S[1] + (a.E[1] - a.S[1]) * 0.65];
  const long = look.sleeves === 'long';
  const cuff: P = [a.E[0] + (a.H[0] - a.E[0]) * 0.78, a.E[1] + (a.H[1] - a.E[1]) * 0.78];
  const th = rad(a.angle + 90);
  return (
    <g>
      {seg([a.S, a.E, a.H], 17, look.skin, true, sd)}
      {long ? seg([a.S, a.E, cuff], 22, sleeve, true, sd) : seg([a.S, mid], 25, sleeve, true, sd)}
      <circle cx={a.H[0]} cy={a.H[1]} r={13} fill={sd ? shade(look.skin, 0.84) : look.skin} stroke={edge(look.skin)} strokeWidth={OL} />
      {sd !== 0 && <circle cx={a.H[0] - sd * 2.6} cy={a.H[1] - 2.6} r={9.6} fill={look.skin} />}
      <ellipse cx={a.H[0] + Math.sin(th) * 11} cy={a.H[1] + Math.cos(th) * 11} rx={6} ry={6} fill={look.skin} stroke={edge(look.skin)} strokeWidth={3} />
    </g>
  );
};

/** Flat cartoon person. pose.yaw turns it (front, three-quarter, side, back); dir=-1 mirrors (character looks the other way: also flip gaze). */
export const FlatCharacter: React.FC<{
  x: number; y: number; look: FlatLook; pose?: FlatPose; scale?: number; dir?: 1 | -1;
  expr?: FlatExpr; mouth?: number; blink?: number; gaze?: P; opacity?: number; font?: string; shadow?: boolean;
  /** 'soft' (default): two-tone cel shading, hair shine, cast shadows; 'flat': single fills. light = side the key light comes from. */
  finish?: 'soft' | 'flat'; light?: 'left' | 'right';
  /** draw a prop in the screen-right hand (phone, sign); gets the hand position and forearm angle */
  holdR?: (pos: P, angle: number) => React.ReactNode; holdL?: (pos: P, angle: number) => React.ReactNode; children?: React.ReactNode;
}> = ({ x, y, look, pose = FLAT_REST, scale = 1, dir = 1, expr = 'neutral', mouth = 0, blink = 0, gaze = [0, 0], opacity = 1, font, shadow = true, finish = 'soft', light = 'left', holdR, holdL, children }) => {
  const sd = finish === 'flat' ? 0 : (light === 'left' ? 1 : -1) * dir;
  const uid = 'fc' + React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const j = flatJoints(pose, look);
  const a = (pose.yaw ?? 0) * 90, ca = Math.cos(rad(a)), sa = Math.sin(rad(a)), af = rad(a * 0.7);
  const bent = !!(pose.hipL || pose.hipR || pose.kneeL || pose.kneeR);
  const legs = (s: number, lift: number) => {
    const hx = s * (18 + pose.spread * 0.5) * (look.build ?? 1) * ca;
    let pts: P[], foot: P;
    if (!bent) {
      const top: P = [hx, HIP_Y + 4 - pose.bob * 0.4];
      foot = [hx + s * pose.spread * 0.6 * ca, -10 - lift * 16 - Math.max(0, pose.bob) * 0.6];
      pts = [top, foot];
    } else { // two-bone leg: thigh swings forward (seen only when turned), shin folds back
      const h = s < 0 ? pose.hipL : pose.hipR, k = s < 0 ? pose.kneeL : pose.kneeR;
      const top: P = [hx, HIP_Y + 4 - pose.bob];
      const knee: P = [top[0] + THIGH * Math.sin(rad(h)) * sa + s * pose.spread * 0.3 * ca, top[1] + THIGH * Math.cos(rad(h))];
      foot = [knee[0] + SHIN * Math.sin(rad(h - k)) * sa + s * pose.spread * 0.3 * ca, knee[1] + SHIN * Math.cos(rad(h - k)) - lift * 16];
      pts = [top, knee, foot];
    }
    const toe = s * ca + sa >= 0 ? 1 : -1; // toes point where the body faces
    return (
      <g key={s}>
        {look.outfit === 'dress' ? seg([[pts[0][0] * 0.6, HIP_Y + 40 - (bent ? pose.bob : 0)], ...pts.slice(1)], 14, look.skin, true, sd) : seg(pts, 28, look.pants, true, sd)}
        <path d={`M${foot[0] - 16 + toe * 2} ${foot[1] + 10} Q${foot[0] - 16 + toe * 2} ${foot[1] - 6} ${foot[0] + toe * 4} ${foot[1] - 6} Q${foot[0] + 20 + toe * 4} ${foot[1] - 6} ${foot[0] + 20 + toe * 4} ${foot[1] + 10} Z`} fill={look.shoes} stroke={edge(look.shoes === '#111' ? '#444444' : look.shoes)} strokeWidth={3} strokeLinejoin="round" transform={toe < 0 ? `translate(${2 * foot[0]} 0) scale(-1 1)` : undefined} />
      </g>
    );
  };
  const tilt = j.headAngle;
  const torsoT = `translate(0 ${-pose.bob}) rotate(${pose.lean} 0 ${HIP_Y})`;
  const kx = 0.62 + 0.38 * Math.abs(ca); // body narrows when turned sideways
  const narrowT = kx < 0.999 ? ` scale(${kx} 1)` : '';
  const headPath = `M${-HW} -4 Q${-HW} ${-HH} 0 ${-HH} Q${HW} ${-HH} ${HW} -4 Q${HW} ${HH} 0 ${HH} Q${-HW} ${HH} ${-HW} -4 Z`;
  const hs = `scale(${HW / HEAD_R} ${HH / HEAD_R})`;
  // ears ride the face cylinder: the near ear moves onto the cheek in profile, the far one hides behind the head
  const ae = rad(a <= 90 ? a * 0.69 : 62 + (a - 90) * (118 / 90)); // slower near profile so the ear sits behind the cheek
  const ear = (s: number) => { const t = rad(s * 90) + ae; return { x: (HW - 2) * Math.sin(t), z: Math.cos(t), s }; };
  const ears = [ear(-1), ear(1)];
  const earEl = (e: { x: number; z: number; s: number }) => <ellipse key={e.s} cx={e.x} cy={8} rx={10 * (e.z > 0.3 ? 0.85 : 1)} ry={13} fill={sd * e.s > 0 && e.z < 0.3 ? shade(look.skin, 0.86) : look.skin} stroke={edge(look.skin)} strokeWidth={OL} />;
  const backHair = Math.cos(rad(a)) < -0.2; // seen from behind, the back hair covers the head
  const fringeVis = Math.max(0, Math.min(1, (Math.cos(rad(a)) + 0.45) / 0.3));
  const fringeT = a ? `translate(${HW * 0.3 * Math.sin(af)} 0) scale(${1 - 0.3 * Math.abs(Math.sin(af))} 1) ` : '';
  const bald = look.hairStyle === 'bald', noHair = look.hairStyle === 'none';
  const t = (1 - ca) / 2; // 0 front, 0.5 side, 1 back
  const cap = a > 4 && !noHair && (
    bald ? <ellipse cx={-sa * HW * 0.85} cy={HH * 0.1} rx={HW * (0.3 + 0.55 * t)} ry={HH * 0.42} fill={look.hair} stroke={edge(look.hair)} strokeWidth={OL} />
      : <ellipse cx={-sa * HW * 0.62 * (1 - Math.max(0, t - 0.5) * 1.6)} cy={-HH * (0.62 - 0.55 * t)} rx={HW * (0.7 + 0.7 * t)} ry={HH * (0.55 + 0.6 * t)} fill={look.hair} stroke={edge(look.hair)} strokeWidth={OL} opacity={look.hairStyle === 'buzz' ? 0.92 : 1} />);
  const backHairEl = <g transform={`translate(${-sa * HW * 0.35} 0) ${hs}`}><Hair look={look} back /></g>;
  const arm = (side: 'L' | 'R') => {
    const aj = side === 'L' ? j.L : j.R;
    return <g key={side}><Arm look={look} a={aj} sd={sd} />{(side === 'L' ? holdL : holdR)?.(aj.H, aj.angle)}</g>;
  };
  const far = (['L', 'R'] as const).filter((k) => j[k].z < -0.2), near = (['L', 'R'] as const).filter((k) => j[k].z >= -0.2);
  const roll = pose.roll ?? 0, air = pose.air ?? 0, sq = pose.squash ?? 1;
  const bodyT = `translate(0 ${-air})${sq !== 1 ? ` scale(${1 / Math.sqrt(sq)} ${sq})` : ''}${roll ? ` translate(0 ${(-HIP_Y - 48) * Math.abs(Math.sin(rad(roll)))}) rotate(${roll} 0 ${HIP_Y})` : ''}`;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale * dir} ${scale})`} opacity={opacity}>
      {shadow && <ellipse cx={0} cy={2} rx={(64 * (look.build ?? 1) * (1 + 0.9 * Math.abs(Math.sin(rad(roll))))) / (1 + air / 220)} ry={11 / (1 + air / 400)} fill="#000" opacity={0.16 / (1 + air / 160)} />}
      <g transform={bodyT}>
      {(sa > 0.05 ? [1, -1] : [-1, 1]).map((s) => legs(s, s < 0 ? pose.legL : pose.legR))}
      {look.outfit === 'dress' && <path transform={narrowT ? `translate(0 0)${narrowT}` : undefined} d={`M-40 ${HIP_Y - 26 - pose.bob} L40 ${HIP_Y - 26 - pose.bob} L54 ${HIP_Y + 44 - pose.bob} Q0 ${HIP_Y + 54 - pose.bob} -54 ${HIP_Y + 44 - pose.bob} Z`} fill={look.pants} stroke={edge(look.pants)} strokeWidth={OL} strokeLinejoin="round" />}
      {!backHair && <g transform={`translate(${j.head[0]} ${j.head[1]}) rotate(${tilt})`}>{backHairEl}</g>}
      {far.map(arm)}
      <g transform={torsoT + narrowT}><Torso look={look} badgeFont={font} dir={dir} uid={uid} sd={sd} yaw={a} /></g>
      <g transform={`${torsoT} rotate(${j.neckBend} ${j.neckBase[0]} ${j.neckBase[1]})`}>
        <rect x={-13} y={j.neckBase[1] - NECK_L - 6} width={26} height={NECK_L + 6} rx={6} fill={shade(look.skin, 0.9)} stroke={edge(look.skin)} strokeWidth={OL} />
        {sd !== 0 && <rect x={-11} y={j.neckBase[1] - NECK_L - 4} width={22} height={18} rx={5} fill={shade(look.skin, 0.76)} />}
      </g>
      <g transform={`translate(${j.head[0]} ${j.head[1]}) rotate(${tilt})`}>
        {ears.filter((e) => e.z <= 0.3).map(earEl)}
        <path d={headPath} fill={look.skin} stroke={edge(look.skin)} strokeWidth={OL} />
        <clipPath id={`h${uid}`}><path d={headPath} /></clipPath>
        {sd ? <g clipPath={`url(#h${uid})`}>
          <ellipse cx={sd * HW * 1.12} cy={HH * 0.3} rx={HW * 0.72} ry={HH * 1.02} fill={shade(look.skin, 0.88)} />
          {fringeVis > 0 && <g opacity={fringeVis} transform={`translate(${sd * 3} 8) ${fringeT}${hs}`}><Hair look={look} shadow={shade(look.skin, 0.8)} /></g>}
          <ellipse cx={-sd * HW * 0.5} cy={-HH * 0.56} rx={14} ry={7} fill="#fff" opacity={0.28} transform={`rotate(${-sd * 22} ${-sd * HW * 0.5} ${-HH * 0.56})`} />
        </g> : <ellipse cx={HW * 0.75} cy={HH * 0.3} rx={HW * 0.45} ry={HH} fill="#7A3A1A" opacity={0.08} clipPath={`url(#h${uid})`} />}
        {cap && <g clipPath={`url(#h${uid})`}>{cap}</g>}
        {ears.filter((e) => e.z > 0.3).map(earEl)}
        <Face look={look} expr={expr} mouth={mouth} blink={blink} gaze={gaze} uid={uid} yaw={a} />
        {fringeVis > 0 && !(bald && a > 30) && <g opacity={fringeVis < 1 ? fringeVis : undefined} transform={fringeT + hs}><Hair look={look} sd={sd} /></g>}
        {backHair && backHairEl}
        {look.glasses === 'shadesUp' && fringeVis > 0 && <g opacity={fringeVis} transform={`${fringeT}translate(0 ${-HH * 0.6})`}><path d="M-38 -6 h76 v4 q0 13 -13 13 h-7 q-11 0 -11 -11 h-6 q0 11 -11 11 h-7 q-13 0 -13 -13 Z" fill="#18181C" /><path d="M-28 -3 h8" stroke="#fff" strokeOpacity={0.5} strokeWidth={3} strokeLinecap="round" /></g>}
      </g>
      <g transform={torsoT + narrowT}><Collar look={look} yaw={a} /><Badge look={look} font={font} dir={dir} yaw={a} /></g>
      {near.map(arm)}
      {children}
      </g>
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
