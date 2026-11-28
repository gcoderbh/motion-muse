// Shared look for the trailer: canvas helper, rain, grain, letterbox, flares, impacts, chroma, grade.
import React, { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { fbm } from '../lib/noise';

export const W = 1920, H = 1080, FPS = 24;
export const BAR_H = Math.round((H - W / 2.39) / 2); // 2.39:1 scope inside 16:9

/** Small fast seeded PRNG (mulberry32); make a new one per frame for deterministic loops. */
export const prng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => { const x = clamp(t); return x * x * (3 - 2 * x); };
export const easeOut = (t: number, p = 3) => 1 - Math.pow(1 - clamp(t), p);
export const easeIn = (t: number, p = 3) => Math.pow(clamp(t), p);

export type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number, f: number) => void;

/** Full-frame canvas redrawn from the frame number. */
export const Cnv: React.FC<{ draw: Draw; style?: React.CSSProperties; frame?: number }> = ({ draw, style, frame }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const cur = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const f = frame ?? cur;
  useLayoutEffect(() => {
    const ctx = ref.current!.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, width, height);
    draw(ctx, width, height, f);
  });
  return <canvas ref={ref} width={width} height={height} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', ...style }} />;
};

/** Impact envelope: 1 on a hit frame, decaying; max over all hits. */
export const impact = (f: number, hits: number[], decay = 5) =>
  hits.reduce((m, h) => (f >= h ? Math.max(m, Math.exp(-(f - h) / decay)) : m), 0);

/** Camera shake from impacts plus a base handheld drift. */
export const Shake: React.FC<{ children: React.ReactNode; hits?: number[]; amount?: number; base?: number; decay?: number; zoom?: number }> = ({ children, hits = [], amount = 26, base = 0.4, decay = 6, zoom = 1 }) => {
  const f = useCurrentFrame();
  const k = impact(f, hits, decay);
  const x = fbm(f / 2.2, 11) * amount * k + fbm(f / 40, 3) * 10 * base;
  const y = fbm(f / 2.0, 17) * amount * k + fbm(f / 47, 5) * 7 * base;
  const r = fbm(f / 3, 23) * 0.8 * k + fbm(f / 60, 9) * 0.25 * base;
  return <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(${(1.04 + k * 0.03) * zoom})` }}>{children}</AbsoluteFill>;
};

/** Rain streaks in depth layers. angle in radians from vertical, speed px/frame for the nearest layer. */
export const rain = (ctx: CanvasRenderingContext2D, w: number, h: number, f: number, o: { count?: number; angle?: number; speed?: number; len?: number; alpha?: number; seed?: number; color?: string; light?: (x: number, y: number) => number } = {}) => {
  const { count = 900, angle = 0.18, speed = 70, len = 60, alpha = 0.5, seed = 1, color = '200,220,255', light } = o;
  const r = prng(seed);
  const sx = Math.sin(angle), cy = Math.cos(angle);
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const z = 0.15 + r() * 0.85; // depth: 1 = near
    const x0 = r() * (w + 400) - 200, y0 = r() * (h + 400);
    const v = speed * (0.35 + z * 0.65);
    const t = (y0 + f * v) % (h + 400) - 200;
    const x = x0 + (t + 200) * sx / cy;
    const l = len * (0.3 + z * 0.9);
    const a = alpha * (0.15 + z * 0.85) * (light ? 0.35 + light(x, t) : 1);
    ctx.strokeStyle = `rgba(${color},${a})`;
    ctx.lineWidth = 0.6 + z * z * 2.4;
    ctx.beginPath();
    ctx.moveTo(x, t);
    ctx.lineTo(x - sx * l, t - cy * l);
    ctx.stroke();
  }
};

/** Splash crowns on a horizontal surface band [y0, y1]. */
export const splashes = (ctx: CanvasRenderingContext2D, w: number, y0: number, y1: number, f: number, o: { count?: number; seed?: number; color?: string; scale?: number } = {}) => {
  const { count = 70, seed = 4, color = '210,225,255', scale = 1 } = o;
  const r = prng(seed);
  for (let i = 0; i < count; i++) {
    const per = 8 + Math.floor(r() * 10), ph = Math.floor(r() * per);
    const k = ((f + ph) % per) / per;
    const cyc = Math.floor((f + ph) / per);
    const rr = prng(seed * 977 + i * 131 + cyc * 7919);
    const x = rr() * w, y = lerp(y0, y1, rr());
    const s = scale * (0.4 + (y - y0) / Math.max(1, y1 - y0)) * 1.2;
    ctx.strokeStyle = `rgba(${color},${(1 - k) * 0.55})`;
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.ellipse(x, y, (4 + k * 18) * s, (1 + k * 4) * s, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (k < 0.5) {
      ctx.fillStyle = `rgba(${color},${(0.5 - k) * 1.2})`;
      for (let j = -2; j <= 2; j++) {
        const dx = j * 5 * s * (0.5 + k * 2), dy = -Math.sin(k * Math.PI * 2) * (10 + Math.abs(3 - Math.abs(j)) * 3) * s;
        ctx.beginPath(); ctx.arc(x + dx, y + dy, 1.4 * s, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
};

/** Draw a soft additive glow. */
export const glow = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a = 1) => {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(0.25, `rgba(${rgb},${a * 0.45})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
};

/** Anamorphic lens streak (horizontal) for a bright point. */
export const streak = (ctx: CanvasRenderingContext2D, x: number, y: number, len: number, rgb = '120,170,255', a = 0.8, thick = 3) => {
  const g = ctx.createLinearGradient(x - len, 0, x + len, 0);
  g.addColorStop(0, `rgba(${rgb},0)`);
  g.addColorStop(0.5, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - len, y - thick / 2, len * 2, thick);
  ctx.fillRect(x - len * 0.4, y - thick * 2, len * 0.8, thick * 4 * 0.25);
};

let grainTiles: HTMLCanvasElement[] | null = null;
const tiles = () => {
  if (grainTiles) return grainTiles;
  grainTiles = [0, 1, 2, 3].map((s) => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d')!; const d = x.createImageData(256, 256); const r = prng(99 + s);
    for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (r() + r() + r() - 1.5) * 120; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0); return c;
  });
  return grainTiles;
};
/** Moving film grain (overlay). */
export const Grain: React.FC<{ amount?: number }> = ({ amount = 0.16 }) => (
  <Cnv style={{ mixBlendMode: 'overlay', opacity: amount }} draw={(ctx, w, h, f) => {
    const t = tiles()[f % 4]; const r = prng(f * 31 + 7); const ox = -r() * 256, oy = -r() * 256;
    for (let y = oy; y < h; y += 256) for (let x = ox; x < w; x += 256) ctx.drawImage(t, x, y);
  }} />
);

export const Letterbox: React.FC<{ open?: number }> = ({ open = 1 }) => {
  const b = BAR_H + (H / 2 - BAR_H) * (1 - open);
  return (<>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: b, background: '#000' }} />
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: b, background: '#000' }} />
  </>);
};

/** RGB split for impacts: wraps children in an SVG filter only while d > 0.3 px. */
export const Chroma: React.FC<{ children: React.ReactNode; d: number; id: string }> = ({ children, d, id }) => {
  if (d < 0.3) return <AbsoluteFill>{children}</AbsoluteFill>;
  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feOffset in="SourceGraphic" dx={-d} dy={0} result="o1" />
          <feColorMatrix in="o1" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="r" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="g" />
          <feOffset in="SourceGraphic" dx={d} dy={d * 0.2} result="o3" />
          <feColorMatrix in="o3" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="b" />
          <feBlend in="r" in2="g" mode="screen" result="rg" />
          <feBlend in="rg" in2="b" mode="screen" />
        </filter>
      </svg>
      <AbsoluteFill style={{ filter: `url(#${id})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Teal shadows / warm highlights + contrast. */
export const Grade: React.FC<{ children: React.ReactNode; warm?: number; teal?: number; contrast?: number; sat?: number; bright?: number }> = ({ children, warm = 0.18, teal = 0.22, contrast = 1.12, sat = 1.08, bright = 1 }) => (
  <AbsoluteFill>
    <AbsoluteFill style={{ filter: `contrast(${contrast}) saturate(${sat}) brightness(${bright})` }}>{children}</AbsoluteFill>
    <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(0,70,90,${teal}) 0%, rgba(0,40,60,${teal}) 55%, rgba(255,140,60,${warm}) 100%)`, mixBlendMode: 'soft-light' }} />
  </AbsoluteFill>
);

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.7 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 70% at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,${strength}) 100%)` }} />
);

/** White or inverted flash frames on a hit. */
export const Flash: React.FC<{ hits: number[]; len?: number; color?: string }> = ({ hits, len = 2, color = '#fff' }) => {
  const f = useCurrentFrame();
  const on = hits.some((h) => f >= h && f < h + len);
  const fade = impact(f, hits.map((h) => h + len), 3);
  return <AbsoluteFill style={{ background: color, opacity: on ? 1 : fade * 0.5, mixBlendMode: on ? 'normal' : 'screen' }} />;
};

/** 2D tower silhouette with setbacks, a shaded side face, floor-true windows, cornices, crown/antenna/tanks. */
export const tower = (ctx: CanvasRenderingContext2D, x: number, base: number, w: number, h: number, r: () => number,
  o: { body: string; side?: string; win?: [number, number]; lit?: number; light?: number; band?: boolean; beacon?: boolean } = { body: '#0b0f18' }) => {
  const { body, side = 'rgba(0,0,0,0.45)', win = [5, 7], lit = 0.3, light = 1, band = r() < 0.35, beacon = true } = o;
  const tiers = h > 220 && r() < 0.6 ? 2 + Math.floor(r() * 2) : 1;
  let tx = x, tw = w, y = base, rest = h;
  for (let t = 0; t < tiers; t++) {
    const th = t === tiers - 1 ? rest : rest * (0.55 + r() * 0.15);
    const top = y - th;
    ctx.fillStyle = body; ctx.fillRect(tx, top, tw, th);
    const sw = tw * (0.18 + r() * 0.1);
    ctx.fillStyle = side; ctx.fillRect(tx + tw - sw, top, sw, th);
    // windows on a floor grid
    const [cw, ch] = win; const floorOn = () => r() < 0.4;
    for (let wy = top + ch * 0.8; wy < y - ch; wy += ch * 1.5) {
      const fo = band && floorOn();
      for (let wx = tx + cw * 0.6; wx < tx + tw - cw; wx += cw * 1.6) {
        const on = band ? fo && r() < 0.9 : r() < lit; if (!on) continue;
        const onSide = wx > tx + tw - sw; const a = (0.45 + r() * 0.55) * light * (onSide ? 0.45 : 1);
        ctx.fillStyle = band ? `rgba(215,232,255,${a})` : r() < 0.12 ? `rgba(130,180,255,${a})` : `rgba(255,${180 + r() * 45},${100 + r() * 50},${a})`;
        ctx.fillRect(wx, wy, cw, ch);
      }
    }
    ctx.fillStyle = 'rgba(160,175,200,0.18)'; ctx.fillRect(tx - 2, top, tw + 4, 2);
    y = top; rest -= th;
    if (t < tiers - 1) { const nw = tw * (0.68 + r() * 0.15); tx += (tw - nw) * (0.3 + r() * 0.4); tw = nw; }
  }
  ctx.fillStyle = body;
  const kind = r();
  if (kind < 0.25 && h > 200) { ctx.beginPath(); ctx.moveTo(tx, y); ctx.lineTo(tx + tw / 2, y - tw * 0.6); ctx.lineTo(tx + tw, y); ctx.closePath(); ctx.fill(); ctx.fillRect(tx + tw / 2 - 1.5, y - tw * 0.6 - 40, 3, 40); if (beacon) { ctx.fillStyle = '#ff2a2a'; ctx.fillRect(tx + tw / 2 - 3, y - tw * 0.6 - 44, 6, 6); } }
  else if (kind < 0.6) { const ax = tx + tw * (0.2 + r() * 0.6), ah = 20 + r() * 50; ctx.fillRect(ax, y - ah, 2.5, ah); ctx.fillRect(ax - 8, y - ah * 0.7, 18, 2); if (beacon) { ctx.fillStyle = '#ff2a2a'; ctx.fillRect(ax - 2, y - ah - 4, 6, 6); } }
  else { for (let k = 0; k < 2; k++) { const kx = tx + tw * (0.15 + r() * 0.6); ctx.fillRect(kx, y - 14, 16, 14); ctx.fillRect(kx + 2, y - 22, 12, 8); } }
};
