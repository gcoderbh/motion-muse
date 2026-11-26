// Closed-form motion for things that fall, bounce, float and splash. Pure functions of time (seconds), so every frame
// is deterministic and can be rendered on any worker in any order. t = (frame - start) / fps.

export const G = 9.81;

/** Projectile: position at time t from p0 with velocity v0 (units/s); gravity pulls -y. */
export const projectile = (t: number, p0: [number, number, number], v0: [number, number, number], g = G): [number, number, number] =>
  [p0[0] + v0[0] * t, p0[1] + v0[1] * t - 0.5 * g * t * t, p0[2] + v0[2] * t];

/** Velocity of a projectile at t (use it to stretch a droplet along its direction of travel). */
export const projectileVel = (t: number, v0: [number, number, number], g = G): [number, number, number] => [v0[0], v0[1] - g * t, v0[2]];

/** Dropped object bouncing on a floor at y = 0 with restitution e (0..1). Returns height above the floor, and the
 *  bounce index and the time of each impact (seconds) so SFX and camera pulses can land on them. */
export const bounce = (t: number, h0: number, e = 0.45, g = G, maxBounces = 6) => {
  const impacts: number[] = [];
  let tt = Math.sqrt((2 * h0) / g), v = Math.sqrt(2 * g * h0) * e;
  impacts.push(tt);
  for (let i = 1; i < maxBounces && v > 0.05; i++) { tt += (2 * v) / g; impacts.push(tt); v *= e; }
  if (t <= impacts[0]) return { y: h0 - 0.5 * g * t * t, n: 0, impacts };
  for (let i = 0; i < impacts.length - 1; i++) {
    if (t < impacts[i + 1]) {
      const v0 = Math.sqrt(2 * g * h0) * Math.pow(e, i + 1), dt = t - impacts[i];
      return { y: Math.max(0, v0 * dt - 0.5 * g * dt * dt), n: i + 1, impacts };
    }
  }
  return { y: 0, n: impacts.length, impacts };
};

/** Damped spring settle from `from` to `to`: overshoots and rings out. freq in Hz, zeta 0..1 (0.3 = bouncy). */
export const settle = (t: number, from: number, to: number, freq = 2, zeta = 0.35) => {
  if (t <= 0) return from;
  const w = 2 * Math.PI * freq, wd = w * Math.sqrt(1 - Math.min(zeta, 0.999) ** 2);
  return to + (from - to) * Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
};

/** Floating object entering liquid at `surface`: sinks past the surface, bobs back and settles at `surface - draft`. */
export const buoyancy = (t: number, surface: number, draft = 0.3, depth = 0.25, freq = 1.4, zeta = 0.3) =>
  settle(t, surface - draft - depth, surface - draft, freq, zeta);

/** Liquid fill level 0..1 over a pour of `dur` seconds: fast at first, slows as the glass fills. */
export const fillLevel = (t: number, dur: number) => (t <= 0 ? 0 : t >= dur ? 1 : 1 - Math.pow(1 - t / dur, 1.6));

/** Pour "glug": stream thickness multiplier pulsing at `rate` Hz with a little irregularity. */
export const glug = (t: number, rate = 5, depth = 0.25) => 1 + depth * Math.sin(2 * Math.PI * rate * t) * (0.6 + 0.4 * Math.sin(2 * Math.PI * rate * 0.37 * t));

/** Splash crown radius and height over time (rises, spreads, collapses) for a drop hitting liquid at t = 0. */
export const crown = (t: number, size = 1, life = 0.6) => {
  if (t < 0 || t > life) return { r: 0, h: 0, k: 0 };
  const k = t / life;
  return { r: size * (0.3 + 0.9 * Math.sqrt(k)), h: size * 0.8 * Math.sin(Math.PI * k) * (1 - 0.5 * k), k };
};

/** Short decaying kick at each impact time (seconds): use for camera pulses and impact flashes. */
export const pulse = (t: number, hits: number[], decay = 0.12, amp = 1) =>
  hits.reduce((s, h) => (t >= h ? s + amp * Math.exp(-(t - h) / decay) * Math.cos((t - h) * 40) : s), 0);
