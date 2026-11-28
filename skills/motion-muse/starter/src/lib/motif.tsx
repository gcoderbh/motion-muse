// One object carried through the whole film (a paper plane, a red thread, a coin, a song on a radio).
// It lives in a layer above the scenes and moves on the film's own timeline, so it crosses cuts unbroken:
// the cut changes the world, the motif keeps going. That continuity is what makes separate shots read as one story.
import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';

export type MotifKey = {
  /** frame on the whole film's timeline (use meter().at(bar, beat) so keys land on the music) */
  f: number;
  x: number;
  y: number;
  /** scale, rotation in degrees, opacity */
  s?: number;
  r?: number;
  o?: number;
  /** how to travel from the previous key: 'ease' (default), 'linear', 'hold' (jump at this key: a match cut), 'arc' (lifts by `lift` px on the way) */
  go?: 'ease' | 'linear' | 'hold' | 'arc';
  lift?: number;
};

export type MotifPose = { x: number; y: number; s: number; r: number; o: number; /** heading in degrees, from the direction of travel */ dir: number; /** px per frame */ speed: number; /** index of the key segment */ seg: number };

const ease = Easing.bezier(0.45, 0, 0.25, 1);

export const motifAt = (keys: MotifKey[], f: number): MotifPose => {
  const at = (g: number) => {
    if (!keys.length) return { x: 0, y: 0, s: 1, r: 0, o: 0, seg: 0 };
    if (g <= keys[0].f) { const k = keys[0]; return { x: k.x, y: k.y, s: k.s ?? 1, r: k.r ?? 0, o: k.o ?? 1, seg: 0 }; }
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1], b = keys[i];
      if (g > b.f) continue;
      const go = b.go ?? 'ease';
      let t = (g - a.f) / Math.max(1, b.f - a.f);
      if (go === 'hold') t = g >= b.f ? 1 : 0; else if (go !== 'linear') t = ease(t);
      const L = (p: number, q: number) => p + (q - p) * t;
      const lift = go === 'arc' ? (b.lift ?? 120) * Math.sin(Math.PI * t) : 0;
      return { x: L(a.x, b.x), y: L(a.y, b.y) - lift, s: L(a.s ?? 1, b.s ?? 1), r: L(a.r ?? 0, b.r ?? 0), o: L(a.o ?? 1, b.o ?? 1), seg: i };
    }
    const k = keys[keys.length - 1];
    return { x: k.x, y: k.y, s: k.s ?? 1, r: k.r ?? 0, o: k.o ?? 1, seg: keys.length };
  };
  // heading from the next frame, or the previous one across a 'hold' jump (a cut), so the object does not spin on the cut
  const p = at(f), JUMP = 120;
  let [a, b] = [p, at(f + 1)];
  if (Math.hypot(b.x - a.x, b.y - a.y) > JUMP) [a, b] = [at(f - 1), p];
  let sp = Math.hypot(b.x - a.x, b.y - a.y);
  if (sp > JUMP) sp = 0;
  const dir = sp > 0.05 ? (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI : 0;
  return { ...p, dir, speed: sp };
};

/**
 * Draws the motif over everything. `children` is a function of the pose so the object can bank into turns,
 * flutter faster when it is fast, or change state per segment (folded → flying → unfolded).
 * Put it after the scene <Sequence>s in the composition, at full-frame size.
 */
export const MotifLayer: React.FC<{ keys: MotifKey[]; children: (p: MotifPose, frame: number) => React.ReactNode; width: number; height: number }> = ({ keys, children, width, height }) => {
  const f = useCurrentFrame();
  const p = motifAt(keys, f);
  if (p.o <= 0.001) return null;
  return (
    <svg width={width} height={height} style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}>
      <g transform={`translate(${p.x} ${p.y}) rotate(${p.r}) scale(${p.s})`} opacity={p.o}>{children(p, f)}</g>
    </svg>
  );
};

/** A tiny echo of the motif inside a scene (a poster, a pattern, its shadow): `seen` 0..1 fades it in when it is called back. */
export const echo = (f: number, from: number, dur = 12) => interpolate(f, [from, from + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
