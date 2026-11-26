// App and website demos: phone / laptop / browser frames, a cursor that moves, clicks and taps, a camera that zooms
// to what is being shown, and a long screenshot that scrolls. Screens are `src` images (public/) or any React children.
// Keyframes are { at: frame, ... }; values ease between them (Easing.inOut cubic) and hold after the last one.
import React from 'react';
import { Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

export type Key<T> = { at: number } & T;
const ease = Easing.inOut(Easing.cubic);
/** Value of `prop` at frame f from keyframes sorted by `at`. */
export const keyed = <T,>(f: number, ks: Key<T>[], prop: keyof T): number => {
  if (!ks.length) return 0;
  const v = (k: Key<T>) => k[prop] as unknown as number;
  if (ks.length === 1 || f <= ks[0].at) return v(ks[0]);
  for (let i = 1; i < ks.length; i++) if (f <= ks[i].at) return interpolate(f, [ks[i - 1].at, ks[i].at], [v(ks[i - 1]), v(ks[i])], { easing: ease });
  return v(ks[ks.length - 1]);
};

const Screen: React.FC<{ src?: string; children?: React.ReactNode; fit?: 'cover' | 'contain'; bg?: string }> = ({ src, children, fit = 'cover', bg = '#fff' }) => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: bg }}>
    {src && <Img src={src.startsWith('http') ? src : staticFile(src)} style={{ width: '100%', height: '100%', objectFit: fit, objectPosition: 'top' }} />}
    {children}
  </div>
);

/** Phone: `width` px wide, 9:19.5 screen, island, side buttons, soft shadow. Content coordinates: 0..width-2*bezel. */
export const Phone: React.FC<{ width: number; src?: string; children?: React.ReactNode; color?: string; tilt?: number; bg?: string; shadow?: boolean }> = ({ width, src, children, color = '#121214', tilt = 0, bg, shadow = true }) => {
  const h = width * 2.05, bz = width * 0.04, r = width * 0.16;
  return (
    <div style={{ position: 'relative', width, height: h, transform: tilt ? `perspective(${width * 6}px) rotateY(${tilt}deg)` : undefined }}>
      {[0.22, 0.32, 0.4].map((y, i) => <div key={i} style={{ position: 'absolute', left: i ? -width * 0.012 : width - width * 0.002, top: h * y, width: width * 0.014, height: h * (i ? 0.06 : 0.1), background: color, borderRadius: 4 }} />)}
      <div style={{ position: 'absolute', inset: 0, borderRadius: r, background: color, boxShadow: shadow ? `0 ${width * 0.08}px ${width * 0.2}px rgba(0,0,0,0.28), inset 0 0 0 ${width * 0.006}px rgba(255,255,255,0.18)` : undefined }} />
      <div style={{ position: 'absolute', left: bz, top: bz, right: bz, bottom: bz, borderRadius: r - bz, overflow: 'hidden' }}>
        <Screen src={src} bg={bg}>{children}</Screen>
        <div style={{ position: 'absolute', left: '50%', top: width * 0.03, width: width * 0.3, height: width * 0.085, marginLeft: -width * 0.15, borderRadius: width, background: '#000' }} />
      </div>
    </div>
  );
};

/** Browser window: traffic lights and a URL bar. `width`×`height` is the whole window. */
export const Browser: React.FC<{ width: number; height: number; url?: string; src?: string; children?: React.ReactNode; dark?: boolean; font?: string }> = ({ width, height, url = 'example.com', src, children, dark = false, font = 'Prompt, sans-serif' }) => {
  const bar = Math.max(36, width * 0.045), fg = dark ? '#2A2A2E' : '#ECEBE8';
  return (
    <div style={{ position: 'relative', width, height, borderRadius: bar * 0.35, overflow: 'hidden', background: fg, boxShadow: `0 ${bar * 0.6}px ${bar * 1.8}px rgba(0,0,0,0.25)` }}>
      <div style={{ height: bar, display: 'flex', alignItems: 'center', gap: bar * 0.2, padding: `0 ${bar * 0.4}px` }}>
        {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => <span key={c} style={{ width: bar * 0.28, height: bar * 0.28, borderRadius: '50%', background: c }} />)}
        <div style={{ flex: 1, marginLeft: bar * 0.4, height: bar * 0.6, borderRadius: bar, background: dark ? '#1C1C1F' : '#fff', color: dark ? '#ccc' : '#555', fontFamily: font, fontSize: bar * 0.34, display: 'flex', alignItems: 'center', paddingLeft: bar * 0.4, lineHeight: 1.3 }}>{url}</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: bar, bottom: 0 }}><Screen src={src}>{children}</Screen></div>
    </div>
  );
};

/** Laptop: screen (16:10) in a bezel on a thin base. `width` is the base width. */
export const Laptop: React.FC<{ width: number; src?: string; children?: React.ReactNode; color?: string }> = ({ width, src, children, color = '#1B1B1E' }) => {
  const sw = width * 0.84, sh = sw * 0.625, bz = width * 0.018;
  return (
    <div style={{ position: 'relative', width, height: sh + width * 0.05 }}>
      <div style={{ position: 'absolute', left: (width - sw) / 2, top: 0, width: sw, height: sh, borderRadius: bz * 1.4, background: color, boxShadow: `0 ${width * 0.03}px ${width * 0.08}px rgba(0,0,0,0.25)` }}>
        <div style={{ position: 'absolute', inset: bz, borderRadius: bz * 0.5, overflow: 'hidden' }}><Screen src={src}>{children}</Screen></div>
      </div>
      <div style={{ position: 'absolute', left: 0, top: sh, width, height: width * 0.03, borderRadius: `0 0 ${width * 0.03}px ${width * 0.03}px`, background: 'linear-gradient(#D6D6DA, #9C9CA3)' }} />
      <div style={{ position: 'absolute', left: width * 0.42, top: sh, width: width * 0.16, height: width * 0.01, borderRadius: `0 0 ${width}px ${width}px`, background: '#8A8A90' }} />
    </div>
  );
};

/** A tall screenshot scrolled by keyframes { at, y } (y = px of the image scrolled past the top). */
export const ScrollShot: React.FC<{ src: string; keys: Key<{ y: number }>[] }> = ({ src, keys }) => {
  const f = useCurrentFrame();
  return <Img src={src.startsWith('http') ? src : staticFile(src)} style={{ position: 'absolute', left: 0, top: -keyed(f, keys, 'y'), width: '100%' }} />;
};

export type CursorKey = Key<{ x: number; y: number; click?: boolean }>;
/** Mouse pointer (or finger: `touch`) moving through keyframes; `click: true` on a key presses and ripples there.
 *  Place it inside the same box as the screen content so x/y are screen coordinates. */
export const Cursor: React.FC<{ keys: CursorKey[]; touch?: boolean; size?: number; color?: string; ring?: string }> = ({ keys, touch = false, size = 44, color = '#111', ring = 'rgba(47,107,255,0.45)' }) => {
  const f = useCurrentFrame(), { fps } = useVideoConfig();
  const x = keyed(f, keys, 'x'), y = keyed(f, keys, 'y');
  const clicks = keys.filter((k) => k.click && f >= k.at - 4 && f < k.at + 24);
  const press = keys.filter((k) => k.click).reduce((m, k) => Math.max(m, interpolate(f, [k.at - 4, k.at, k.at + 6], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })), 0);
  const show = interpolate(f, [keys[0]?.at - 8, keys[0]?.at], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, pointerEvents: 'none', opacity: show }}>
      {clicks.map((k) => {
        const s = spring({ frame: f - k.at, fps, config: { damping: 200 }, durationInFrames: 22 });
        return <div key={k.at} style={{ position: 'absolute', left: k.x - size * 1.2, top: k.y - size * 1.2, width: size * 2.4, height: size * 2.4, borderRadius: '50%', border: `${size * 0.1}px solid ${ring}`, transform: `scale(${0.3 + s})`, opacity: f < k.at ? 0 : 1 - s }} />;
      })}
      {touch
        ? <div style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: '50%', background: 'rgba(255,255,255,0.55)', border: '3px solid rgba(0,0,0,0.25)', transform: `scale(${1 - 0.2 * press})`, boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }} />
        : <svg width={size} height={size} viewBox="0 0 24 24" style={{ position: 'absolute', left: x - size * 0.18, top: y - size * 0.1, transform: `scale(${1 - 0.15 * press})`, transformOrigin: '18% 10%', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.3))' }}>
            <path d="M4 2 L4 19 L8.6 14.9 L11.6 21.6 L14.6 20.3 L11.7 13.7 L18 13.4 Z" fill={color} stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
          </svg>}
    </div>
  );
};

/** Camera over a layout: keyframes { at, x, y, scale } bring point (x, y) of the content to the frame centre.
 *  scale 1 with x/y at the centre = no zoom. Push in on the button being tapped, pull out before the next step. */
export const ZoomTo: React.FC<{ keys: Key<{ x: number; y: number; scale: number }>[]; children: React.ReactNode }> = ({ keys, children }) => {
  const f = useCurrentFrame(), { width, height } = useVideoConfig();
  const s = keyed(f, keys, 'scale'), x = keyed(f, keys, 'x'), y = keyed(f, keys, 'y');
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${width / 2 - x * s}px, ${height / 2 - y * s}px) scale(${s})` }}>{children}</div>
    </div>
  );
};
