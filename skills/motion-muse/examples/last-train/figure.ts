// 2D articulated silhouette (the courier) drawn on canvas: run cycle, leap, dive. Rim light from one side.
import { lerp } from './fx';

export type Joint = [number, number];
export type Pose2 = { lean: number; thighL: number; kneeL: number; thighR: number; kneeR: number; armL: number; elbowL: number; armR: number; elbowR: number; head: number; coat: number };

const TH = 0.92, SH = 0.88, UA = 0.6, FA = 0.58, TORSO = 1.25; // lengths in units of `u`

export const runPose = (phase: number, speed = 1): Pose2 => {
  const s = Math.sin(phase), c = Math.cos(phase);
  const sw = (p: number) => 0.2 + 1.25 * Math.max(0, Math.cos(p - 0.5)) ** 1.5; // knee folds through the swing
  return {
    lean: 0.32 * speed,
    thighL: 0.75 * s * speed + 0.1, kneeL: sw(phase) * speed + 0.1,
    thighR: -0.75 * s * speed + 0.1, kneeR: sw(phase + Math.PI) * speed + 0.1,
    armL: -0.9 * s * speed, elbowL: -1.5,
    armR: 0.9 * s * speed, elbowR: -1.35,
    head: 0.1, coat: c,
  };
};
export const leapPose = (t: number): Pose2 => ({
  lean: lerp(0.45, 0.15, t), thighL: lerp(1.25, 0.6, t), kneeL: lerp(0.5, 0.9, t), thighR: lerp(-0.85, -0.2, t), kneeR: lerp(1.6, 1.2, t),
  armL: lerp(-1.6, 1.2, t), elbowL: -0.5, armR: lerp(1.9, -0.6, t), elbowR: -0.6, head: 0.2, coat: 1,
});
export const divePose = (t: number): Pose2 => ({
  lean: lerp(0.9, 1.35, t), thighL: lerp(-0.2, -0.5, t), kneeL: lerp(0.9, 0.4, t), thighR: lerp(-0.8, -0.7, t), kneeR: lerp(1.6, 0.8, t),
  armL: lerp(2.2, 2.8, t), elbowL: -0.3, armR: lerp(1.6, 2.6, t), elbowR: -0.4, head: 0.5, coat: 1,
});

const rot = (x: number, y: number, a: number): Joint => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

/** Joints for a pose with the hip at (hx, hy); u = unit length in px; dir = 1 runs right. */
export const joints = (p: Pose2, hx: number, hy: number, u: number, dir = 1) => {
  const P = (x: number, y: number): Joint => [hx + x * u * dir, hy + y * u];
  const down = (a: number, l: number): Joint => rot(0, l, -a); // angle forward from vertical-down
  const kneeL = down(p.thighL, TH), footL = (() => { const k = down(p.thighL - p.kneeL, SH); return [kneeL[0] + k[0], kneeL[1] + k[1]] as Joint; })();
  const kneeR = down(p.thighR, TH), footR = (() => { const k = down(p.thighR - p.kneeR, SH); return [kneeR[0] + k[0], kneeR[1] + k[1]] as Joint; })();
  const neck = rot(0, -TORSO, p.lean);
  const sh: Joint = [neck[0] * 0.92, neck[1] * 0.92];
  const elL = down(p.armL, UA), haL = down(p.armL - p.elbowL, FA);
  const elR = down(p.armR, UA), haR = down(p.armR - p.elbowR, FA);
  const head = rot(0, -TORSO - 0.42, p.lean + p.head * 0.3);
  return {
    hip: P(0, 0), kneeL: P(...kneeL), footL: P(...footL), kneeR: P(...kneeR), footR: P(...footR),
    neck: P(...neck), sh: P(...sh),
    elL: P(sh[0] + elL[0], sh[1] + elL[1]), haL: P(sh[0] + elL[0] + haL[0], sh[1] + elL[1] + haL[1]),
    elR: P(sh[0] + elR[0], sh[1] + elR[1]), haR: P(sh[0] + elR[0] + haR[0], sh[1] + elR[1] + haR[1]),
    head: P(...head), u, dir, coat: p.coat,
  };
};
export type J = ReturnType<typeof joints>;

const limb = (ctx: CanvasRenderingContext2D, pts: Joint[], w0: number, w1: number) => {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const wa = lerp(w0, w1, i / (pts.length - 1)), wb = lerp(w0, w1, (i + 1) / (pts.length - 1));
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    ctx.beginPath();
    ctx.moveTo(ax + nx * wa / 2, ay + ny * wa / 2); ctx.lineTo(bx + nx * wb / 2, by + ny * wb / 2);
    ctx.lineTo(bx - nx * wb / 2, by - ny * wb / 2); ctx.lineTo(ax - nx * wa / 2, ay - ny * wa / 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(ax, ay, wa / 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx, by, wb / 2, 0, Math.PI * 2); ctx.fill();
  }
};

const body = (ctx: CanvasRenderingContext2D, j: J, f: number, withCase: boolean) => {
  const u = j.u;
  // far limbs first
  limb(ctx, [j.sh, j.elR, j.haR], u * 0.2, u * 0.14);
  limb(ctx, [j.hip, j.kneeR, j.footR], u * 0.3, u * 0.17);
  // coat: shoulders → hips, tail flaps behind
  const back = -j.dir;
  const flap = Math.sin(f * 0.9) * 0.12 + j.coat * 0.1;
  ctx.beginPath();
  ctx.moveTo(j.sh[0] + back * u * 0.18, j.sh[1]);
  ctx.quadraticCurveTo(j.hip[0] + back * u * 0.5, j.hip[1] - u * 0.2, j.hip[0] + back * u * (0.75 + flap), j.hip[1] + u * (0.45 + flap));
  ctx.lineTo(j.hip[0] + back * u * (0.35 + flap * 0.5), j.hip[1] + u * 0.62);
  ctx.lineTo(j.hip[0] - back * u * 0.2, j.hip[1] + u * 0.35);
  ctx.lineTo(j.sh[0] - back * u * 0.2, j.sh[1] + u * 0.05);
  ctx.closePath(); ctx.fill();
  limb(ctx, [j.hip, j.neck], u * 0.42, u * 0.36);
  // head + hood + ponytail
  ctx.beginPath(); ctx.arc(j.head[0], j.head[1], u * 0.24, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(j.head[0] + back * u * 0.15, j.head[1] - u * 0.05);
  ctx.quadraticCurveTo(j.head[0] + back * u * 0.6, j.head[1] + Math.sin(f * 0.7) * u * 0.12, j.head[0] + back * u * (0.75 + flap), j.head[1] + u * 0.35);
  ctx.lineTo(j.head[0] + back * u * 0.12, j.head[1] + u * 0.12); ctx.closePath(); ctx.fill();
  limb(ctx, [j.neck, j.head], u * 0.18, u * 0.18);
  // near limbs
  limb(ctx, [j.hip, j.kneeL, j.footL], u * 0.32, u * 0.18);
  limb(ctx, [j.sh, j.elL, j.haL], u * 0.21, u * 0.15);
  // boots
  for (const [k, ft] of [[j.kneeL, j.footL], [j.kneeR, j.footR]] as [Joint, Joint][]) {
    const a = Math.atan2(ft[1] - k[1], ft[0] - k[0]) - Math.PI / 2 * j.dir;
    ctx.save(); ctx.translate(ft[0], ft[1]); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(j.dir * u * 0.12, 0, u * 0.2, u * 0.09, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  if (withCase) { // the briefcase in the near hand
    ctx.save(); ctx.translate(j.haL[0], j.haL[1] + u * 0.05);
    ctx.rotate(Math.atan2(j.haL[1] - j.elL[1], j.haL[0] - j.elL[0]) - Math.PI / 2);
    ctx.fillRect(-u * 0.32, u * 0.04, u * 0.64, u * 0.46);
    ctx.restore();
  }
};

/** Draw the silhouette with a rim light. light = [dx, dy] direction the light comes from (unit-ish). */
export const drawFigure = (ctx: CanvasRenderingContext2D, j: J, f: number, o: { rim?: string; light?: [number, number]; fill?: string; withCase?: boolean; rimW?: number } = {}) => {
  const { rim = 'rgba(120,230,255,0.95)', light = [-1, -0.4], fill = '#040507', withCase = true, rimW = 3 } = o;
  ctx.save();
  ctx.fillStyle = rim;
  ctx.translate(light[0] * rimW, light[1] * rimW);
  body(ctx, j, f, withCase);
  ctx.restore();
  ctx.save(); ctx.fillStyle = fill; body(ctx, j, f, withCase); ctx.restore();
};
