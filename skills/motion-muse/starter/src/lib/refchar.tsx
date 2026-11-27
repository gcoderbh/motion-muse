// Spec-driven 2.5D character drawn from a reference: parts are SVG paths authored on a 1000×1000 front-view grid
// (scripts/charref.py prep makes the grid), then turned in 3D at render time. Head parts get their depth from the head
// ellipsoid, so features slide around the face and the far side compresses when the head turns (no redrawn views).
// Paths: absolute or relative M L H V C Q Z. A part may give `ellipse: [cx, cy, rx, ry]` instead of `d`.
import React from 'react';

export type RCRole = 'eyeL' | 'eyeR' | 'pupilL' | 'pupilR' | 'lashL' | 'lashR' | 'browL' | 'browR' | 'mouth' | 'blush';
export type RCPart = {
  id?: string; d?: string; ellipse?: [number, number, number, number];
  fill?: string; stroke?: string; sw?: number; opacity?: number; blur?: number; blend?: React.CSSProperties['mixBlendMode'];
  layer?: 'back' | 'body' | 'neck' | 'head' | 'face' | 'front' | 'acc';
  on?: 'head' | 'body'; depth?: number; role?: RCRole; expr?: string; clip?: string; cull?: boolean;
};
export type RCSpec = {
  name: string; credits?: string;
  head: { cx: number; cy: number; rx: number; ry: number; rz?: number; neck: [number, number] };
  parts: RCPart[];
};
export type RCPose = { yaw?: number; pitch?: number; roll?: number; bodyYaw?: number; blink?: number; gaze?: [number, number]; brow?: number; expr?: string; talk?: number };

type Cmd = { c: string; p: number[] };
const parse = (d: string): Cmd[] => {
  const tok = d.match(/[MLHVCQZmlhvcqz]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const out: Cmd[] = []; let i = 0, cx = 0, cy = 0, sx = 0, sy = 0, cmd = 'M';
  const num = () => parseFloat(tok[i++]);
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    const ox = rel ? cx : 0, oy = rel ? cy : 0;
    if (C === 'Z') { out.push({ c: 'Z', p: [] }); cx = sx; cy = sy; continue; }
    if (C === 'H') { cx = num() + (rel ? cx : 0); out.push({ c: 'L', p: [cx, cy] }); continue; }
    if (C === 'V') { cy = num() + (rel ? cy : 0); out.push({ c: 'L', p: [cx, cy] }); continue; }
    const n = C === 'C' ? 6 : C === 'Q' ? 4 : 2;
    const p = Array.from({ length: n }, (_, k) => num() + (k % 2 ? oy : ox));
    cx = p[n - 2]; cy = p[n - 1];
    if (C === 'M') { sx = cx; sy = cy; out.push({ c: 'M', p }); cmd = rel ? 'l' : 'L'; } else out.push({ c: C, p });
  }
  return out;
};
const ellipsePath = ([x, y, rx, ry]: [number, number, number, number]) => {
  const k = 0.5523;
  return `M ${x + rx} ${y} C ${x + rx} ${y + ry * k} ${x + rx * k} ${y + ry} ${x} ${y + ry} C ${x - rx * k} ${y + ry} ${x - rx} ${y + ry * k} ${x - rx} ${y} C ${x - rx} ${y - ry * k} ${x - rx * k} ${y - ry} ${x} ${y - ry} C ${x + rx * k} ${y - ry} ${x + rx} ${y - ry * k} ${x + rx} ${y} Z`;
};
const cache = new Map<string, Cmd[]>();
const cmdsOf = (p: RCPart) => { const d = p.d ?? (p.ellipse ? ellipsePath(p.ellipse) : ''); if (!cache.has(d)) cache.set(d, parse(d)); return cache.get(d)!; };

const ORDER = ['back', 'body', 'neck', 'head', 'face', 'front', 'acc'];

/** Fill helpers: "lin(#a,#b,90)" or "rad(#a,#b)" become gradients. */
const paint = (v: string | undefined, id: string, defs: React.ReactNode[]) => {
  if (!v) return 'none';
  const m = v.match(/^(lin|rad)\(([^,]+),([^,)]+)(?:,([-\d.]+))?\)$/);
  if (!m) return v;
  const [, kind, a, b, ang] = m;
  if (kind === 'lin') { const t = ((Number(ang ?? 90) - 90) * Math.PI) / 180; defs.push(<linearGradient key={id} id={id} x1={0.5 - Math.cos(t) / 2} y1={0.5 - Math.sin(t) / 2} x2={0.5 + Math.cos(t) / 2} y2={0.5 + Math.sin(t) / 2}><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>); }
  else defs.push(<radialGradient key={id} id={id} cx="0.45" cy="0.4" r="0.7"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></radialGradient>);
  return `url(#${id})`;
};

export const RefCharacter: React.FC<{ spec: RCSpec; pose?: RCPose; x?: number; y?: number; scale?: number; uid?: string }> = ({ spec, pose = {}, x = 0, y = 0, scale = 1, uid = 'rc' }) => {
  const { yaw = 0, pitch = 0, roll = 0, bodyYaw = yaw * 0.3, blink = 0, gaze = [0, 0], brow = 0, expr = 'neutral', talk = 0 } = pose;
  const H = spec.head; const rz = H.rz ?? H.rx;
  const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const cb = Math.cos(bodyYaw), sb = Math.sin(bodyYaw);
  const rr = (roll * Math.PI) / 180, cr = Math.cos(rr), sr = Math.sin(rr);
  const zOf = (px: number, py: number, depth: number) => {
    const u = (px - H.cx) / H.rx, v = (py - H.cy) / H.ry; const s = 1 - u * u - v * v;
    return (s > 0 ? Math.sqrt(s) : 0) * rz + depth * rz;
  };
  const head3 = (px: number, py: number, depth: number, auto: boolean): [number, number, number] => {
    const X = px - H.cx, Y = py - H.cy, Z = auto ? zOf(px, py, depth) : depth * rz;
    const x1 = X * cyw + Z * syw, z1 = -X * syw + Z * cyw; // yaw
    const y2 = Y * cp - z1 * sp, z2 = Y * sp + z1 * cp;    // pitch
    let gx = H.cx + x1, gy = H.cy + y2;
    const dx = gx - H.neck[0], dy = gy - H.neck[1];        // roll about the neck
    gx = H.neck[0] + dx * cr - dy * sr; gy = H.neck[1] + dx * sr + dy * cr;
    return [gx, gy, z2];
  };
  const body3 = (px: number, py: number, depth: number): [number, number, number] => {
    const X = px - H.neck[0], Z = depth * 120; return [H.neck[0] + X * cb + Z * sb, py, -X * sb + Z * cb];
  };
  const defs: React.ReactNode[] = [];
  const parts = spec.parts
    .filter((p) => p.role !== 'mouth' || (p.expr ?? 'neutral') === (talk > 0.5 ? 'open' : expr) || (!spec.parts.some((q) => q.role === 'mouth' && q.expr === (talk > 0.5 ? 'open' : expr)) && (p.expr ?? 'neutral') === 'neutral'))
    .map((p, i) => ({ p, i }))
    .sort((a, b) => ORDER.indexOf(a.p.layer ?? 'head') - ORDER.indexOf(b.p.layer ?? 'head') || a.i - b.i);

  // eye centre lines for blinking
  // one box per side over every eye part (white, outline, lower lash), so all of them close to the same line
  const eyeBox: Record<string, [number, number, number]> = {};
  for (const side of ['L', 'R']) {
    const cs = spec.parts.filter((p) => p.role === `eye${side}`).flatMap(cmdsOf);
    if (!cs.length) continue;
    const ys = cs.flatMap((c) => c.p.filter((_, k) => k % 2)); const xs = cs.flatMap((c) => c.p.filter((_, k) => !(k % 2)));
    eyeBox[side] = [(Math.min(...ys) + Math.max(...ys)) / 2, Math.max(...ys) - Math.min(...ys), (Math.min(...xs) + Math.max(...xs)) / 2];
  }
  const els = parts.map(({ p, i }) => {
    const id = `${uid}-${p.id ?? i}`;
    const side = p.role?.slice(-1) as 'L' | 'R' | undefined;
    const eb = side ? eyeBox[side] : undefined;
    const isHead = (p.on ?? (p.layer === 'body' ? 'body' : 'head')) === 'head';
    const auto = isHead && p.layer !== 'back';
    const depth = p.depth ?? (p.layer === 'back' ? -0.9 : p.layer === 'front' ? 0.06 : p.layer === 'acc' ? 0.25 : 0);
    let zSum = 0, zN = 0;
    const map = (px: number, py: number): [number, number] => {
      if (eb && (p.role?.startsWith('eye') || p.role?.startsWith('pupil'))) py = eb[0] + (py - eb[0]) * Math.max(0.06, 1 - blink);
      if (eb && p.role?.startsWith('lash')) py += blink * eb[1] * 0.45;
      if (p.role?.startsWith('pupil')) { px += gaze[0] * 16; py += gaze[1] * 8; }
      if (p.role?.startsWith('brow')) py -= brow * 14;
      const [gx, gy, gz] = isHead ? head3(px, py, depth, auto) : body3(px, py, depth);
      zSum += gz; zN++;
      return [gx, gy];
    };
    const d = cmdsOf(p).map((c) => {
      if (c.c === 'Z') return 'Z';
      const pts: string[] = [];
      for (let k = 0; k < c.p.length; k += 2) { const [a, b] = map(c.p[k], c.p[k + 1]); pts.push(`${a.toFixed(1)} ${b.toFixed(1)}`); }
      return `${c.c} ${pts.join(' ')}`;
    }).join(' ');
    const zMean = zN ? zSum / zN : 0;
    const face = auto && (p.cull ?? (p.layer === 'face' || p.role != null));
    const vis = face ? Math.max(0, Math.min(1, (zMean / rz + 0.05) * 6)) : 1;
    if (vis <= 0) return null;
    const filt = p.blur ? `blur(${p.blur}px)` : undefined;
    return (
      <path key={id} id={p.id ? `${uid}-${p.id}` : undefined} d={d} fill={paint(p.fill, `${id}-f`, defs)} stroke={paint(p.stroke, `${id}-s`, defs)} strokeWidth={p.sw ?? (p.stroke ? 3 : 0)}
        strokeLinecap="round" strokeLinejoin="round" opacity={(p.opacity ?? 1) * vis} clipPath={p.clip ? `url(#${uid}-clip-${p.clip})` : undefined}
        style={{ filter: filt, mixBlendMode: p.blend }} />
    );
  });
  // clip paths reuse the transformed shapes of the parts they name
  const clips = [...new Set(spec.parts.map((p) => p.clip).filter(Boolean))] as string[];
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <defs>{defs}{clips.map((c) => <clipPath key={c} id={`${uid}-clip-${c}`}><use href={`#${uid}-${c}`} /></clipPath>)}</defs>
      {els}
    </g>
  );
};

/** Turnaround + expression sheet for checking a spec. */
export const RC_TURN = [-0.85, -0.45, 0, 0.45, 0.85];
