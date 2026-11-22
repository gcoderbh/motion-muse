// 2D procedural characters drawn in SVG: <Stickman> (line art) and <VectorCharacter> (flat vector cartoon).
// Both use the same skeleton and Pose (lib/pose.ts), so walk cycles, key poses and talking work the same.
// Place them inside an <svg> whose viewBox is the video size. (x, y) is the ground point under the feet.
import React from 'react';
import { Pose } from './pose';

export type Dims = { torso: number; neck: number; head: number; upperArm: number; foreArm: number; thigh: number; shin: number; shoulder: number };
export const DIMS: Dims = { torso: 62, neck: 10, head: 21, upperArm: 31, foreArm: 29, thigh: 36, shin: 34, shoulder: 3 };
type P = [number, number];
const rad = (d: number) => (d * Math.PI) / 180;
const down = (o: P, ang: number, len: number): P => [o[0] + Math.sin(rad(ang)) * len, o[1] + Math.cos(rad(ang)) * len];

/** Joint positions (character space, y down, facing +x, feet on y = 0). Use it to attach props or point labels at body parts. */
export const skeleton = (p: Pose, d: Dims = DIMS) => {
  const hip0: P = [0, 0];
  const kneeL0 = down(hip0, p.hipL, d.thigh), kneeR0 = down(hip0, p.hipR, d.thigh);
  const footL0 = down(kneeL0, p.hipL - p.knL, d.shin), footR0 = down(kneeR0, p.hipR - p.knR, d.shin);
  const lift = Math.max(footL0[1], footR0[1]) + p.bob * (d.thigh + d.shin + d.torso);
  const sh = (q: P): P => [q[0], q[1] - lift];
  const hip = sh(hip0), kneeL = sh(kneeL0), kneeR = sh(kneeR0), footL = sh(footL0), footR = sh(footR0);
  const neck: P = [hip[0] + Math.sin(rad(p.lean)) * d.torso, hip[1] - Math.cos(rad(p.lean)) * d.torso];
  const shoulder: P = down(neck, p.lean + 180, -d.shoulder);
  const elbowL = down(shoulder, p.shL - p.lean * 0.3, d.upperArm), elbowR = down(shoulder, p.shR - p.lean * 0.3, d.upperArm);
  const handL = down(elbowL, p.shL + p.elL, d.foreArm), handR = down(elbowR, p.shR + p.elR, d.foreArm);
  const ha = p.lean + p.head;
  const head: P = [neck[0] + Math.sin(rad(ha)) * (d.neck + d.head), neck[1] - Math.cos(rad(ha)) * (d.neck + d.head)];
  const chest: P = [(neck[0] * 2 + hip[0]) / 3, (neck[1] * 2 + hip[1]) / 3];
  const belly: P = [(neck[0] + hip[0] * 2) / 3, (neck[1] + hip[1] * 2) / 3];
  return { hip, kneeL, kneeR, footL, footR, neck, shoulder, elbowL, elbowR, handL, handR, head, chest, belly, headAngle: ha };
};
export type Skeleton = ReturnType<typeof skeleton>;

/** Map a joint from character space to scene space (for labels, props, camera targets). */
export const toScene = (pt: P, x: number, y: number, scale = 1, dir: 1 | -1 = 1): P => [x + pt[0] * scale * dir, y + pt[1] * scale];

export type Expression = 'neutral' | 'happy' | 'sad' | 'scared' | 'angry' | 'dead' | 'zombie' | 'surprised';

const Face: React.FC<{ c: P; r: number; ang: number; expr: Expression; mouth: number; blink: number; ink: string; eyeColor?: string }> = ({ c, r, ang, expr, mouth, blink, ink, eyeColor }) => {
  const ex = r * 0.38, ey = -r * 0.1, er = r * 0.12;
  const lid = expr === 'dead' ? 1 : blink;
  const eye = (dx: number) => {
    if (expr === 'dead') return <g key={dx}><path d={`M${dx - er} ${ey - er} L${dx + er} ${ey + er} M${dx + er} ${ey - er} L${dx - er} ${ey + er}`} stroke={ink} strokeWidth={r * 0.09} strokeLinecap="round" /></g>;
    const ry = er * (expr === 'surprised' || expr === 'scared' ? 1.35 : 1) * (1 - 0.9 * lid);
    return <ellipse key={dx} cx={dx} cy={ey} rx={er} ry={Math.max(0.6, ry)} fill={eyeColor ?? ink} />;
  };
  const brow = expr === 'angry' ? [[-ex - er, ey - er * 2.4, -ex + er, ey - er * 1.6], [ex + er, ey - er * 2.4, ex - er, ey - er * 1.6]]
    : expr === 'sad' || expr === 'scared' ? [[-ex - er, ey - er * 1.7, -ex + er, ey - er * 2.4], [ex + er, ey - er * 1.7, ex - er, ey - er * 2.4]] : null;
  const my = r * 0.42, mw = r * 0.34;
  const m = mouth > 0.05
    ? <ellipse cx={0} cy={my} rx={mw * (0.55 + 0.25 * mouth)} ry={r * 0.06 + r * 0.2 * mouth} fill={ink} />
    : expr === 'happy' ? <path d={`M${-mw} ${my - 3} Q0 ${my + r * 0.25} ${mw} ${my - 3}`} stroke={ink} strokeWidth={r * 0.08} fill="none" strokeLinecap="round" />
      : expr === 'sad' || expr === 'scared' ? <path d={`M${-mw} ${my + 3} Q0 ${my - r * 0.18} ${mw} ${my + 3}`} stroke={ink} strokeWidth={r * 0.08} fill="none" strokeLinecap="round" />
        : expr === 'zombie' ? <path d={`M${-mw} ${my} L${-mw / 2} ${my + 3} L0 ${my - 1} L${mw / 2} ${my + 4} L${mw} ${my}`} stroke={ink} strokeWidth={r * 0.07} fill="none" strokeLinejoin="round" />
          : <path d={`M${-mw * 0.7} ${my} L${mw * 0.7} ${my}`} stroke={ink} strokeWidth={r * 0.08} strokeLinecap="round" />;
  return (
    <g transform={`translate(${c[0]} ${c[1]}) rotate(${ang * 0.6}) translate(${r * 0.18} 0)`}>
      {eye(-ex)}{eye(ex)}
      {brow?.map((b, i) => <path key={i} d={`M${b[0]} ${b[1]} L${b[2]} ${b[3]}`} stroke={ink} strokeWidth={r * 0.08} strokeLinecap="round" />)}
      {m}
    </g>
  );
};

type Common = {
  x: number; y: number; pose: Pose; scale?: number; dir?: 1 | -1; expression?: Expression; mouth?: number; blink?: number;
  dims?: Dims; opacity?: number; /** draw something in the near hand (e.g. a pointer); gets hand position + forearm angle in character space */
  hand?: (pos: P, angleDeg: number) => React.ReactNode; children?: React.ReactNode;
};

/** Blink 0..1 for frame f: closes for ~4 frames every few seconds, deterministic per seed. */
export const blinkAt = (f: number, seed = 0) => {
  const period = 95 + (seed % 5) * 13;
  const t = (f + seed * 17) % period;
  return t < 4 ? Math.sin((t / 4) * Math.PI) : 0;
};

export const Stickman: React.FC<Common & { color?: string; width?: number; headFill?: string }> = ({ x, y, pose, scale = 1, dir = 1, color = '#16130F', width = 7, headFill = '#fff', expression = 'neutral', mouth = 0, blink = 0, dims = DIMS, opacity = 1, hand, children }) => {
  const s = skeleton(pose, dims);
  const line = (pts: P[], o = 1) => <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeOpacity={o} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale * dir} ${scale})`} opacity={opacity}>
      {line([s.shoulder, s.elbowL, s.handL], 0.55)}
      {line([s.hip, s.kneeL, s.footL], 0.55)}
      {line([s.hip, s.neck])}
      {line([s.hip, s.kneeR, s.footR])}
      {line([s.shoulder, s.elbowR, s.handR])}
      {hand?.(s.handR, pose.shR + pose.elR)}
      <circle cx={s.head[0]} cy={s.head[1]} r={dims.head} fill={headFill} stroke={color} strokeWidth={width} />
      <Face c={s.head} r={dims.head} ang={s.headAngle} expr={expression} mouth={mouth} blink={blink} ink={color} />
      {children}
    </g>
  );
};

export type Palette = { skin: string; shirt: string; pants: string; shoes: string; hair: string; ink: string; eye?: string };
export const PALETTES: Record<string, Palette> = {
  scientist: { skin: '#F2C7A5', shirt: '#FFFFFF', pants: '#3A4A6B', shoes: '#22252E', hair: '#3B2A20', ink: '#1A1A22' },
  kid: { skin: '#E8B48F', shirt: '#FF5A36', pants: '#2F6BFF', shoes: '#16130F', hair: '#1B1310', ink: '#16130F' },
  zombie: { skin: '#9DBF7A', shirt: '#7D8A6A', pants: '#4A4238', shoes: '#2B2620', hair: '#2E3326', ink: '#1E2418', eye: '#F4F1D0' },
  office: { skin: '#D9A07A', shirt: '#2F6BFF', pants: '#22252E', shoes: '#111', hair: '#111', ink: '#111' },
};

export const VectorCharacter: React.FC<Common & { palette?: Palette; hair?: 'short' | 'long' | 'bun' | 'messy' | 'none'; coat?: boolean; torn?: boolean; outline?: number }> = ({ x, y, pose, scale = 1, dir = 1, palette = PALETTES.kid, hair = 'short', coat = false, torn = false, outline = 3, expression = 'neutral', mouth = 0, blink = 0, dims = DIMS, opacity = 1, hand, children }) => {
  const s = skeleton(pose, dims);
  const c = palette;
  const limb = (pts: P[], w: number, col: string, dark = false) => (
    <g>
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={c.ink} strokeWidth={w + outline * 2} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={col} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={dark ? { filter: 'brightness(0.82)' } : undefined} />
    </g>
  );
  const dot = (p: P, r: number, col: string) => <circle cx={p[0]} cy={p[1]} r={r} fill={col} stroke={c.ink} strokeWidth={outline} />;
  const tw = 30; // torso width
  const nx = Math.cos(rad(pose.lean)) * tw / 2, ny = Math.sin(rad(pose.lean)) * tw / 2;
  const torsoD = `M${s.neck[0] - nx * 0.8} ${s.neck[1] - ny * 0.8} L${s.neck[0] + nx * 0.8} ${s.neck[1] + ny * 0.8} L${s.hip[0] + nx} ${s.hip[1] + ny + 6} L${s.hip[0] - nx} ${s.hip[1] - ny + 6} Z`;
  const r = dims.head * 1.12;
  const hc = s.head;
  const hairEl = hair === 'none' ? null
    : hair === 'long' ? <path d={`M${hc[0] - r} ${hc[1]} Q${hc[0] - r * 1.1} ${hc[1] - r * 1.25} ${hc[0]} ${hc[1] - r * 1.08} Q${hc[0] + r * 1.15} ${hc[1] - r * 1.2} ${hc[0] + r * 0.9} ${hc[1] - r * 0.1} L${hc[0] - r * 0.5} ${hc[1] - r * 0.55} Q${hc[0] - r * 0.9} ${hc[1] + r * 1.2} ${hc[0] - r * 1.2} ${hc[1] + r * 1.3} Z`} fill={c.hair} stroke={c.ink} strokeWidth={outline} />
      : hair === 'messy' ? <path d={`M${hc[0] - r} ${hc[1] - r * 0.1} L${hc[0] - r * 0.85} ${hc[1] - r * 0.95} L${hc[0] - r * 0.4} ${hc[1] - r * 0.75} L${hc[0] - r * 0.15} ${hc[1] - r * 1.2} L${hc[0] + r * 0.25} ${hc[1] - r * 0.85} L${hc[0] + r * 0.7} ${hc[1] - r * 1.1} L${hc[0] + r * 0.95} ${hc[1] - r * 0.3} L${hc[0] + r * 0.4} ${hc[1] - r * 0.5} Z`} fill={c.hair} stroke={c.ink} strokeWidth={outline} strokeLinejoin="round" />
        : <g>
          {hair === 'bun' && <circle cx={hc[0] - r * 0.6} cy={hc[1] - r * 0.95} r={r * 0.42} fill={c.hair} stroke={c.ink} strokeWidth={outline} />}
          <path d={`M${hc[0] - r * 1.02} ${hc[1] + r * 0.05} Q${hc[0] - r * 1.05} ${hc[1] - r * 1.15} ${hc[0] + r * 0.1} ${hc[1] - r * 1.05} Q${hc[0] + r * 1.05} ${hc[1] - r * 0.95} ${hc[0] + r * 0.98} ${hc[1] - r * 0.25} Q${hc[0] + r * 0.2} ${hc[1] - r * 0.55} ${hc[0] - r * 0.55} ${hc[1] - r * 0.45} Z`} fill={c.hair} stroke={c.ink} strokeWidth={outline} />
        </g>;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale * dir} ${scale})`} opacity={opacity}>
      {limb([s.shoulder, s.elbowL, s.handL], 12, coat ? c.shirt : c.skin, true)}
      {dot(s.handL, 6.5, c.skin)}
      {limb([s.hip, s.kneeL, s.footL], 15, c.pants, true)}
      <ellipse cx={s.footL[0] + 6} cy={s.footL[1]} rx={11} ry={6} fill={c.shoes} stroke={c.ink} strokeWidth={outline} />
      {limb([s.hip, s.kneeR, s.footR], 15, c.pants)}
      <ellipse cx={s.footR[0] + 6} cy={s.footR[1]} rx={11} ry={6} fill={c.shoes} stroke={c.ink} strokeWidth={outline} />
      <path d={torsoD} fill={c.shirt} stroke={c.ink} strokeWidth={outline} strokeLinejoin="round" />
      {coat && <path d={`M${s.neck[0]} ${s.neck[1] + 4} L${s.hip[0] + nx * 0.2} ${s.hip[1] + 6}`} stroke={c.ink} strokeWidth={outline * 0.7} />}
      {torn && <path d={`M${s.hip[0] - nx} ${s.hip[1] - ny + 6} l6 -10 l5 8 l6 -12 l5 10 l6 -7 l4 9`} fill="none" stroke={c.ink} strokeWidth={outline * 0.8} strokeLinejoin="round" />}
      {torn && <circle cx={s.chest[0] + 4} cy={s.chest[1] + 6} r={4} fill={c.skin} stroke={c.ink} strokeWidth={outline * 0.6} />}
      <path d={`M${s.neck[0]} ${s.neck[1]} L${s.neck[0] + Math.sin(rad(s.headAngle)) * dims.neck} ${s.neck[1] - Math.cos(rad(s.headAngle)) * dims.neck}`} stroke={c.ink} strokeWidth={12 + outline * 2} strokeLinecap="round" />
      <path d={`M${s.neck[0]} ${s.neck[1]} L${s.neck[0] + Math.sin(rad(s.headAngle)) * dims.neck} ${s.neck[1] - Math.cos(rad(s.headAngle)) * dims.neck}`} stroke={c.skin} strokeWidth={12} strokeLinecap="round" />
      <circle cx={hc[0]} cy={hc[1]} r={r} fill={c.skin} stroke={c.ink} strokeWidth={outline} />
      {hairEl}
      <Face c={hc} r={r} ang={s.headAngle} expr={expression} mouth={mouth} blink={blink} ink={c.ink} eyeColor={c.eye} />
      {limb([s.shoulder, s.elbowR, s.handR], 12, coat ? c.shirt : c.skin)}
      {dot(s.handR, 6.5, c.skin)}
      {hand?.(s.handR, pose.shR + pose.elR)}
      {children}
    </g>
  );
};

/** A pointer stick for the hand prop: <Stickman hand={pointer()} .../> */
export const pointer = (len = 70, color = '#8B5A2B') => (pos: P, ang: number) => {
  const end = down(pos, ang, len);
  return <line x1={pos[0]} y1={pos[1]} x2={end[0]} y2={end[1]} stroke={color} strokeWidth={4} strokeLinecap="round" />;
};
