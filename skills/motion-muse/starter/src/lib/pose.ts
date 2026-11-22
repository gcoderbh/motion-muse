// Procedural body animation shared by the 2D Stickman / VectorCharacter and the 3D Figure.
// Angles are degrees. 0 = limb hanging straight down; positive = swings toward the facing direction.
import { interpolate } from 'remotion';

export type Pose = {
  lean: number; // torso lean forward (+) / back (-)
  head: number; // head tilt
  shL: number; elL: number; // left shoulder, left elbow (elbow bends forward, 0 = straight)
  shR: number; elR: number;
  hipL: number; knL: number; // hip swing, knee bend (back, 0 = straight)
  hipR: number; knR: number;
  bob: number; // vertical body offset in body units (+ = up)
};

export const REST: Pose = { lean: 0, head: 0, shL: 8, elL: 6, shR: -8, elR: 6, hipL: 3, knL: 2, hipR: -3, knR: 2, bob: 0 };

export const POSES: Record<string, Partial<Pose>> = {
  rest: {},
  point: { shR: 95, elR: 4, shL: 10, elL: 15, head: -4 },
  pointUp: { shR: 160, elR: 10, head: -12 },
  wave: { shR: 150, elR: 40, head: 5 },
  shrug: { shL: 35, elL: 110, shR: 35, elR: 110, head: 8 },
  armsUp: { shL: 165, elL: 10, shR: 165, elR: 10, head: -10, bob: 0.04 },
  think: { shR: 40, elR: 140, shL: 15, elL: 80, head: 10, lean: 3 },
  present: { shR: 70, elR: 30, shL: -30, elL: 20, lean: -2 },
  scared: { shL: 120, elL: 120, shR: 120, elR: 120, lean: -10, head: -6, knL: 18, knR: 18, hipL: 10, hipR: 10, bob: -0.05 },
  zombie: { shL: 88, elL: 8, shR: 82, elR: 14, lean: 12, head: 18 },
  sit: { hipL: 85, knL: 90, hipR: 85, knR: 90, bob: -0.32 },
  slump: { lean: 18, head: 28, shL: -5, shR: 5, elL: 15, elR: 15 },
};

export const pose = (name: keyof typeof POSES | string, over: Partial<Pose> = {}): Pose => ({ ...REST, ...(POSES[name] ?? {}), ...over });

export const mixPose = (a: Pose, b: Pose, t: number): Pose => {
  const o = {} as Pose;
  (Object.keys(a) as (keyof Pose)[]).forEach((k) => (o[k] = a[k] + (b[k] - a[k]) * t));
  return o;
};

/** Blend between key poses over time: keys = [[frame, pose], ...]. Spring-like ease between keys. */
export const posesAt = (f: number, keys: [number, Pose][]): Pose => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, p0] = keys[i], [f1, p1] = keys[i + 1];
    if (f < f1) {
      const t = (f - f0) / (f1 - f0);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      return mixPose(p0, p1, e);
    }
  }
  return keys[keys.length - 1][1];
};

export type Gait = 'walk' | 'run' | 'shamble' | 'sneak' | 'march';
const GAIT: Record<Gait, { hip: number; knee: number; arm: number; elbow: number; bob: number; lean: number; limp?: number }> = {
  walk: { hip: 26, knee: 38, arm: 24, elbow: 18, bob: 0.03, lean: 3 },
  run: { hip: 42, knee: 85, arm: 50, elbow: 80, bob: 0.06, lean: 12 },
  shamble: { hip: 16, knee: 22, arm: 6, elbow: 6, bob: 0.025, lean: 14, limp: 0.6 },
  sneak: { hip: 20, knee: 45, arm: 14, elbow: 50, bob: 0.015, lean: 18 },
  march: { hip: 38, knee: 30, arm: 40, elbow: 4, bob: 0.03, lean: 0 },
};

/** Walk cycle pose at a cycle phase (1 phase unit = one full stride). Layer it over a base pose with `over`. */
export const gait = (phase: number, kind: Gait = 'walk', over: Partial<Pose> = {}): Pose => {
  const g = GAIT[kind];
  const a = phase * Math.PI * 2;
  const s = Math.sin(a);
  const limp = g.limp ? 1 - g.limp * Math.max(0, Math.sin(a + 0.4)) : 1;
  const base: Pose = {
    lean: g.lean,
    head: kind === 'shamble' ? 18 + 6 * Math.sin(a * 0.5) : -g.lean * 0.3,
    hipL: g.hip * s * limp, knL: g.knee * Math.max(0, Math.sin(a + 1.4)),
    hipR: -g.hip * s, knR: g.knee * Math.max(0, Math.sin(a + Math.PI + 1.4)),
    shL: -g.arm * s, elL: g.elbow * (0.6 + 0.4 * Math.max(0, -s)),
    shR: g.arm * s, elR: g.elbow * (0.6 + 0.4 * Math.max(0, s)),
    bob: g.bob * Math.abs(Math.cos(a)),
  };
  if (kind === 'shamble') { base.shL = 80 + 6 * Math.sin(a); base.shR = 76 - 6 * Math.sin(a); base.elL = 10; base.elR = 16; }
  return { ...base, ...over };
};

/** Idle breathing + weight shift, layered on any pose. */
export const breathe = (p: Pose, f: number, amount = 1): Pose => ({
  ...p,
  bob: p.bob + 0.006 * amount * Math.sin(f / 18),
  head: p.head + 1.5 * amount * Math.sin(f / 33),
  shL: p.shL + 1.5 * amount * Math.sin(f / 18),
  shR: p.shR - 1.5 * amount * Math.sin(f / 18),
});

/** Ground-truth stride: distance covered per phase unit, so feet do not skate. legLen in px (or world units). */
export const strideLength = (kind: Gait, legLen: number) => 2 * legLen * Math.sin((GAIT[kind].hip * Math.PI) / 180) * 1.6;

/** Talking mouth openness 0..1 driven by frame (or pass your own from a voice envelope). */
export const talk = (f: number, seed = 0) => Math.max(0, Math.sin(f * 0.9 + seed) * 0.6 + Math.sin(f * 2.3 + seed * 3) * 0.4);

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const prog = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
