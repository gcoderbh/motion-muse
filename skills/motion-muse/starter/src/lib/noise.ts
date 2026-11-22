// Deterministic noise for procedural motion. Same input → same output on every render worker (never use Math.random()).
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
};
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Seeded random in [0, 1). */
export const rand = (seed: number, i = 0) => hash(seed * 1013.0 + i * 7.31);
/** Seeded random in [a, b). */
export const range = (seed: number, a: number, b: number, i = 0) => a + (b - a) * rand(seed, i);

/** 1D value noise in [-1, 1]. */
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  return (hash(i + seed * 57) * (1 - smooth(f)) + hash(i + 1 + seed * 57) * smooth(f)) * 2 - 1;
};

/** 2D value noise in [-1, 1]. */
export const noise2 = (x: number, y: number, seed = 0) => {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = smooth(x - ix), fy = smooth(y - iy);
  const h = (a: number, b: number) => hash(a * 157 + b * 113 + seed * 7.7);
  const top = h(ix, iy) * (1 - fx) + h(ix + 1, iy) * fx;
  const bot = h(ix, iy + 1) * (1 - fx) + h(ix + 1, iy + 1) * fx;
  return (top * (1 - fy) + bot * fy) * 2 - 1;
};

/** Fractal noise: several octaves of noise1, for organic drift, handheld camera, flicker. */
export const fbm = (x: number, seed = 0, octaves = 3) => {
  let v = 0, amp = 0.5, freq = 1;
  for (let o = 0; o < octaves; o++) { v += amp * noise1(x * freq, seed + o * 19); amp *= 0.5; freq *= 2; }
  return v;
};

/** Handheld camera offset for frame f: [x, y, rotationDeg]. strength 1 ≈ gentle handheld. */
export const handheld = (f: number, strength = 1, seed = 3): [number, number, number] => [
  fbm(f / 40, seed) * 14 * strength,
  fbm(f / 45, seed + 5) * 10 * strength,
  fbm(f / 60, seed + 9) * 0.6 * strength,
];

/** Light flicker 0..1 (1 = fully on). rate = flickers per second-ish, broken = how often it drops out. */
export const flicker = (f: number, seed = 1, broken = 0.25, rate = 6) => {
  const n = noise1(f / (30 / rate), seed);
  const drop = rand(seed, Math.floor(f / 3)) < broken * 0.35 ? 0.15 : 1;
  return Math.max(0, Math.min(1, (0.85 + 0.15 * n) * drop));
};
