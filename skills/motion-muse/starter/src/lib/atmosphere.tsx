// Cinematic light and atmosphere overlays for any scene (2D, 2.5D, 3D or footage). Put them above the scene.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { flicker, noise1, rand } from './noise';

/** Volumetric light shafts from a point (window, lamp, sun). */
export const GodRays: React.FC<{ x?: number; y?: number; color?: string; intensity?: number; count?: number; spread?: number; angle?: number; frame: number }> = ({ x = 0.5, y = -0.05, color = '255,240,210', intensity = 0.35, count = 7, spread = 50, angle = 180, frame }) => (
  <AbsoluteFill style={{ mixBlendMode: 'screen', pointerEvents: 'none', overflow: 'hidden' }}>
    {Array.from({ length: count }, (_, i) => {
      const a = angle - spread / 2 + (spread * (i + 0.5)) / count + noise1(frame / 90 + i, 3) * 3;
      const o = intensity * (0.5 + 0.5 * Math.abs(noise1(frame / 60 + i * 2, 7)));
      return <div key={i} style={{ position: 'absolute', left: `${x * 100}%`, top: `${y * 100}%`, width: 60 + (i % 3) * 50, height: '220%', transformOrigin: '50% 0', transform: `translateX(-50%) rotate(${a}deg)`,
        background: `linear-gradient(rgba(${color},${o}), rgba(${color},0) 75%)`, filter: 'blur(18px)' }} />;
    })}
  </AbsoluteFill>
);

/** Drifting fog made with SVG turbulence. density 0..1. */
export const Fog: React.FC<{ frame: number; color?: string; density?: number; speed?: number; scale?: number; seed?: number; low?: boolean }> = ({ frame, color = '#C9CFD6', density = 0.5, speed = 1, scale = 0.0025, seed = 4, low = true }) => (
  <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden', WebkitMaskImage: low ? 'linear-gradient(transparent 45%, #000 100%)' : undefined }}>
    <svg width="200%" height="100%" style={{ position: 'absolute', left: `${-((frame * speed * 0.8) % 1000)}px`, opacity: density }}>
      <filter id={`fog${seed}`}><feTurbulence type="fractalNoise" baseFrequency={`${scale} ${scale * 2.2}`} numOctaves={3} seed={seed} /><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -0.45" /></filter>
      <rect width="100%" height="100%" filter={`url(#fog${seed})`} fill={color} />
    </svg>
  </AbsoluteFill>
);

type PKind = 'dust' | 'embers' | 'ash' | 'snow' | 'rain' | 'bokeh';
/** Deterministic particles. dust/bokeh float, embers rise, ash/snow fall, rain streaks. */
export const Particles: React.FC<{ kind?: PKind; frame: number; count?: number; seed?: number; color?: string; w?: number; h?: number; opacity?: number }> = ({ kind = 'dust', frame, count = 60, seed = 11, color, w = 1080, h = 1920, opacity = 1 }) => {
  const col = color ?? { dust: '255,250,235', embers: '255,140,60', ash: '200,200,200', snow: '255,255,255', rain: '190,205,230', bokeh: '255,230,200' }[kind];
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: kind === 'ash' || kind === 'rain' ? 'normal' : 'screen', opacity }}>
      {Array.from({ length: count }, (_, i) => {
        const r = (k: number) => rand(seed, i * 7 + k);
        const sp = 0.4 + r(1);
        let x = r(2) * w, y = r(3) * h;
        const size = kind === 'bokeh' ? 20 + r(4) * 70 : kind === 'rain' ? 2 : 1.5 + r(4) * (kind === 'embers' ? 4 : 3.5);
        if (kind === 'embers') { y = (y - frame * sp * 3 + h * 10) % (h + 40); x += noise1(frame / 40 + i, seed) * 40; }
        else if (kind === 'ash' || kind === 'snow') { y = (y + frame * sp * 1.6) % (h + 40); x += noise1(frame / 50 + i, seed) * 60; }
        else if (kind === 'rain') { y = (y + frame * sp * 45) % (h + 200) - 100; x = (x - frame * 4) % w; }
        else { x += noise1(frame / 90 + i, seed) * 50; y += noise1(frame / 110 + i * 3, seed + 1) * 50; }
        const tw = kind === 'embers' ? 0.5 + 0.5 * Math.sin(frame / 4 + i) : 0.4 + 0.6 * Math.abs(noise1(frame / 30 + i, 2));
        if (kind === 'rain') return <div key={i} style={{ position: 'absolute', left: x, top: y, width: 2, height: 60 + r(5) * 40, background: `linear-gradient(rgba(${col},0), rgba(${col},0.55))`, transform: 'rotate(8deg)' }} />;
        return <div key={i} style={{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: '50%', background: kind === 'bokeh' ? `radial-gradient(circle, rgba(${col},${0.25 * tw}) 0%, rgba(${col},${0.12 * tw}) 60%, transparent 72%)` : `rgba(${col},${tw})`, boxShadow: kind === 'embers' ? `0 0 ${size * 3}px rgba(${col},0.9)` : undefined, filter: kind === 'bokeh' ? 'blur(2px)' : undefined }} />;
      })}
    </AbsoluteFill>
  );
};

/** Diagonal specular sweep across a product or title (progress 0 → 1). Mask it to the object with `mask`. */
export const LightSweep: React.FC<{ progress: number; angle?: number; width?: number; intensity?: number; mask?: string }> = ({ progress, angle = 20, width = 18, intensity = 0.7, mask }) => (
  <AbsoluteFill style={{ mixBlendMode: 'screen', pointerEvents: 'none', WebkitMaskImage: mask, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', inset: '-50%', transform: `rotate(${angle}deg) translateX(${-60 + progress * 120}%)`,
      background: `linear-gradient(90deg, transparent ${50 - width / 2}%, rgba(255,255,255,${intensity}) 50%, transparent ${50 + width / 2}%)` }} />
  </AbsoluteFill>
);

/** Flickering practical light: returns a brightness factor; use it on a glow layer or a 3D light intensity. */
export const useFlicker = flicker;

/** Light glow layer (lamp, screen, emergency light) that can flicker. */
export const Glow: React.FC<{ x: number; y: number; size: number; color: string; intensity?: number }> = ({ x, y, size, color, intensity = 1 }) => (
  <div style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: '50%', mixBlendMode: 'screen', opacity: intensity, background: `radial-gradient(circle, ${color} 0%, transparent 65%)`, pointerEvents: 'none' }} />
);

export const Vignette: React.FC<{ strength?: number; color?: string }> = ({ strength = 0.55, color = '0,0,0' }) => (
  <AbsoluteFill style={{ pointerEvents: 'none', background: `radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(${color},${strength}) 100%)` }} />
);

/** Letterbox bars for a cinematic 2.39:1 feel inside 16:9. */
export const Letterbox: React.FC<{ amount?: number; color?: string }> = ({ amount = 0.12, color = '#000' }) => (
  <AbsoluteFill style={{ pointerEvents: 'none' }}>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${amount * 100}%`, background: color }} />
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${amount * 100}%`, background: color }} />
  </AbsoluteFill>
);

/** VHS / found-footage scanlines + tracking jitter. */
export const Scanlines: React.FC<{ frame: number; opacity?: number }> = ({ frame, opacity = 0.18 }) => (
  <AbsoluteFill style={{ pointerEvents: 'none', opacity, backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.6) 0px, rgba(0,0,0,0.6) 1px, transparent 2px, transparent 4px)', transform: `translateY(${(frame * 2) % 4}px)` }} />
);

/** Colour grade wrapper: wrap a scene to push it toward a look. */
export const Grade: React.FC<{ children: React.ReactNode; filter?: string; tint?: string; tintBlend?: React.CSSProperties['mixBlendMode'] }> = ({ children, filter = 'contrast(1.08) saturate(1.05)', tint, tintBlend = 'soft-light' }) => (
  <AbsoluteFill>
    <AbsoluteFill style={{ filter }}>{children}</AbsoluteFill>
    {tint && <AbsoluteFill style={{ background: tint, mixBlendMode: tintBlend, pointerEvents: 'none' }} />}
  </AbsoluteFill>
);
