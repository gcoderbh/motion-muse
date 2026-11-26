// Brand kit: one Brand object (colours, Thai font, logo, tagline, handle) shared by every scene, so all of a client's
// videos look like one series. Keep it in src/brand.json, pass it as a prop (batch.py can override it per row).
// <BrandProvider brand={b}> … useBrand() …; BrandIntro / BrandOutro / LowerThird / Watermark use it.
import React from 'react';
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { useFormat } from './layout';
import { useThaiFont } from './typography';

export type Brand = {
  name: string; tagline?: string; handle?: string; url?: string;
  /** public/ path to a PNG/SVG logo; without one a wordmark is drawn from the name */
  logo?: string;
  colors: { bg: string; ink: string; primary: string; accent: string; onPrimary?: string };
  font?: string; headFont?: string; radius?: number;
};
export const DEFAULT_BRAND: Brand = { name: 'Motion Muse', tagline: 'วิดีโอที่คนทำ ไม่ใช่ AI', handle: '@motionmuse', colors: { bg: '#FFF7EC', ink: '#16130F', primary: '#2F6BFF', accent: '#FFD23F', onPrimary: '#FFFFFF' }, font: 'Prompt', radius: 28 };

const Ctx = React.createContext<Brand>(DEFAULT_BRAND);
export const BrandProvider: React.FC<{ brand?: Partial<Brand>; children: React.ReactNode }> = ({ brand, children }) => (
  <Ctx.Provider value={{ ...DEFAULT_BRAND, ...brand, colors: { ...DEFAULT_BRAND.colors, ...brand?.colors } }}>{children}</Ctx.Provider>
);
/** The brand plus its loaded font families (`body`, `head`). */
export const useBrand = () => {
  const b = React.useContext(Ctx);
  const body = useThaiFont(b.font ?? 'Prompt'), head = useThaiFont(b.headFont ?? b.font ?? 'Prompt');
  return { ...b, body, head };
};

const first = (s: string) => [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(s)][0]?.segment ?? '';
/** Logo image, or a round mark with the first letter + the name as a wordmark. `onPrimary` when it sits on the primary colour. */
export const Logo: React.FC<{ size: number; wordmark?: boolean; color?: string; onPrimary?: boolean }> = ({ size, wordmark = true, color, onPrimary = false }) => {
  const b = useBrand(), on = b.colors.onPrimary ?? '#fff', c = color ?? (onPrimary ? on : b.colors.ink);
  if (b.logo) return <Img src={staticFile(b.logo)} style={{ height: size, width: 'auto' }} />;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.3, fontFamily: b.head, color: c }}>
      <div style={{ width: size, height: size, borderRadius: '50%', background: onPrimary ? on : b.colors.primary, color: onPrimary ? b.colors.primary : on, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.56, fontWeight: 800, lineHeight: 1.3 }}>{first(b.name)}</div>
      {wordmark && <div style={{ fontSize: size * 0.56, fontWeight: 800, lineHeight: 1.3, whiteSpace: 'nowrap' }}>{b.name}</div>}
    </div>
  );
};

/** 1–2 s opener: colour wipe, logo pops, tagline slides up. */
export const BrandIntro: React.FC<{ dur?: number }> = ({ dur = 45 }) => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(), b = useBrand(), { u } = useFormat();
  const wipe = spring({ frame: f, fps, config: { damping: 200 }, durationInFrames: 14 });
  const pop = spring({ frame: f - 8, fps, config: { damping: 11, stiffness: 160 } });
  const tag = spring({ frame: f - 16, fps, config: { damping: 200 } });
  const out = interpolate(f, [dur - 8, dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', inset: 0, background: b.colors.bg, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: b.colors.primary, clipPath: `circle(${wipe * 75}% at 50% 50%)` }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: u(30), opacity: out }}>
        <div style={{ transform: `scale(${pop})` }}><Logo size={u(150)} onPrimary /></div>
        {b.tagline && <div style={{ fontFamily: b.body, fontSize: u(46), lineHeight: 1.4, color: b.colors.onPrimary ?? '#fff', opacity: tag, transform: `translateY(${(1 - tag) * u(30)}px)` }}>{b.tagline}</div>}
      </div>
    </div>
  );
};

/** Closing card: call to action, handle / URL and the logo, inside the safe zone. */
export const BrandOutro: React.FC<{ cta?: string; sub?: string }> = ({ cta = 'ติดตามเลย', sub }) => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(), b = useBrand(), { u, safe } = useFormat();
  const s = (d: number) => spring({ frame: f - d, fps, config: { damping: 14 } });
  return (
    <div style={{ position: 'absolute', inset: 0, background: b.colors.bg }}>
      <div style={{ position: 'absolute', left: safe.x, top: safe.y, width: safe.w, height: safe.h, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: u(40), fontFamily: b.head, color: b.colors.ink, textAlign: 'center' }}>
        <div style={{ transform: `scale(${s(0)})` }}><Logo size={u(110)} /></div>
        <div style={{ fontSize: u(96), fontWeight: 800, lineHeight: 1.3, opacity: s(6), transform: `translateY(${(1 - s(6)) * u(40)}px)` }}>{cta}</div>
        {(sub ?? b.handle ?? b.url) && <div style={{ fontFamily: b.body, fontSize: u(44), lineHeight: 1.4, padding: `${u(14)}px ${u(36)}px`, borderRadius: u(b.radius ?? 28), background: b.colors.accent, color: b.colors.ink, opacity: s(12) }}>{sub ?? b.handle ?? b.url}</div>}
      </div>
    </div>
  );
};

/** Name + role bar that slides in from the left and out again at `dur`. */
export const LowerThird: React.FC<{ title: string; sub?: string; dur?: number; y?: number }> = ({ title, sub, dur = 120, y }) => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(), b = useBrand(), { u, safe } = useFormat();
  const inn = spring({ frame: f, fps, config: { damping: 200 }, durationInFrames: 16 }), out = spring({ frame: f - dur + 14, fps, config: { damping: 200 }, durationInFrames: 14 });
  const x = (inn - out) * 1;
  return (
    <div style={{ position: 'absolute', left: safe.x, top: y ?? safe.y + safe.h - u(200), fontFamily: b.body, transform: `translateX(${(x - 1) * u(120)}px)`, opacity: x }}>
      <div style={{ display: 'inline-block', background: b.colors.primary, color: b.colors.onPrimary ?? '#fff', fontFamily: b.head, fontWeight: 800, fontSize: u(52), lineHeight: 1.35, padding: `${u(8)}px ${u(26)}px`, borderRadius: `${u(14)}px ${u(14)}px ${u(14)}px 0` }}>{title}</div>
      {sub && <div><span style={{ display: 'inline-block', background: b.colors.accent, color: b.colors.ink, fontSize: u(34), lineHeight: 1.4, padding: `${u(4)}px ${u(22)}px`, borderRadius: `0 0 ${u(12)}px ${u(12)}px` }}>{sub}</span></div>}
    </div>
  );
};

/** Small logo in a corner of the safe zone for the whole video. */
export const Watermark: React.FC<{ corner?: 'tl' | 'tr' | 'bl' | 'br'; opacity?: number; size?: number }> = ({ corner = 'tl', opacity = 0.85, size = 54 }) => {
  const { u, safe } = useFormat();
  const pos: React.CSSProperties = { position: 'absolute', opacity, [corner[0] === 't' ? 'top' : 'bottom']: corner[0] === 't' ? safe.y : undefined, left: corner[1] === 'l' ? safe.x : undefined };
  if (corner[0] === 'b') pos.top = safe.y + safe.h - u(size);
  if (corner[1] === 'r') pos.left = safe.x + safe.w - u(size * 4);
  return <div style={pos}><Logo size={u(size)} /></div>;
};
