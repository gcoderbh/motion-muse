// Scene timeline with real transitions between scenes. Pure Remotion, no extra packages.
// <Timeline scenes={[{ dur: 60, el: <A/>, out: { kind: 'whip' } }, { dur: 45, el: <B/> }]} sfx />
// Each scene's local frame 0 = start of its incoming transition, so it is already moving when revealed.
import React from 'react';
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

export type Kind =
  | 'cut' | 'whip' | 'push' | 'zoom' | 'iris' | 'wipe' | 'slices'
  | 'flash' | 'glitch' | 'leak' | 'focus' | 'smash';
export type Out = { kind: Kind; dur?: number; dir?: 1 | -1; color?: string; colors?: string[]; origin?: [number, number] };
export type Scene = { dur: number; el: React.ReactNode; out?: Out };

export const DUR: Record<Kind, number> = {
  cut: 0, whip: 10, push: 14, zoom: 14, iris: 16, wipe: 14, slices: 16,
  flash: 8, glitch: 6, leak: 22, focus: 16, smash: 16,
};

// Shotcraft SFX (paths under assets/audio/sfx/), lead = frames before the cut it starts, len = frames played (fades out at the end).
export const SFX_FOR: Partial<Record<Kind, { file: string; lead: number; vol: number; len?: number }>> = {
  whip: { file: 'whoosh-fast.mp3', lead: 8, vol: 0.55 },
  push: { file: 'swoosh-quick.mp3', lead: 6, vol: 0.5 },
  zoom: { file: 'air-zoom-vacuum.mp3', lead: 9, vol: 0.5 },
  iris: { file: 'sparkle.mp3', lead: 4, vol: 0.35, len: 60 },
  wipe: { file: 'transition-snap.mp3', lead: 4, vol: 0.5 },
  slices: { file: 'warp-slide.mp3', lead: 8, vol: 0.45 },
  flash: { file: 'hit-fast-exciting.mp3', lead: 1, vol: 0.5 },
  glitch: { file: 'scifi-click.mp3', lead: 1, vol: 0.6 },
  leak: { file: 'light-transition-magic.mp3', lead: 10, vol: 0.4, len: 75 },
  smash: { file: 'bass-hit-short.mp3', lead: 0, vol: 0.7 },
};

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const io = Easing.bezier(0.65, 0, 0.35, 1);
const HIDE: React.CSSProperties = { opacity: 0 };
const cutAtMiddle = (p: number, role: 'in' | 'out', s: React.CSSProperties) =>
  role === 'out' ? (p >= 0.5 ? HIDE : s) : p < 0.5 ? HIDE : s;

const look = (o: Out, p: number, role: 'in' | 'out', W: number, H: number, frame: number): React.CSSProperties => {
  const e = io(p);
  const bell = Math.sin(Math.PI * p);
  const dir = o.dir ?? 1;
  const half = role === 'out' ? p * 2 : (p - 0.5) * 2; // 0→1 inside its own half
  switch (o.kind) {
    case 'whip': {
      const x = role === 'out' ? -e * W * dir : (1 - e) * W * dir;
      return { transform: `translateX(${x}px) skewX(${-bell * 6 * dir}deg)`, filter: `blur(${bell * 30}px)` };
    }
    case 'push': {
      const k = Easing.bezier(0.75, 0, 0.2, 1)(p);
      const y = role === 'out' ? -k * H * 0.35 * dir : (1 - k) * H * dir;
      return role === 'out'
        ? { transform: `translateY(${y}px) scale(${1 - 0.1 * k})`, filter: `brightness(${1 - 0.35 * k})` }
        : { transform: `translateY(${y}px)`, boxShadow: '0 -30px 80px rgba(0,0,0,0.25)' };
    }
    case 'zoom': {
      if (role === 'out') {
        if (p > 0.55) return HIDE;
        const k = Easing.in(Easing.cubic)(p / 0.55);
        return { transform: `scale(${1 + 3.5 * k})`, filter: `blur(${k * 22}px)` };
      }
      if (p < 0.45) return HIDE;
      const k = Easing.out(Easing.cubic)((p - 0.45) / 0.55);
      return { transform: `scale(${1.6 - 0.6 * k})`, filter: `blur(${(1 - k) * 18}px)` };
    }
    case 'iris': {
      if (role === 'out') return { transform: `scale(${1 + 0.06 * e})` };
      const [ox, oy] = o.origin ?? [50, 50];
      return { clipPath: `circle(${e * 150}% at ${ox}% ${oy}%)` };
    }
    case 'wipe': {
      if (role === 'out') return { transform: `translateX(${-e * 60}px)` };
      const X = e * 140;
      return { clipPath: `polygon(0 0, ${X}% 0, ${X - 40}% 100%, 0 100%)` };
    }
    case 'focus':
      return role === 'out'
        ? { filter: `blur(${e * 18}px)`, opacity: 1 - interpolate(p, [0.3, 0.8], [0, 1], clamp), transform: `scale(${1 + 0.05 * e})` }
        : { filter: `blur(${(1 - e) * 18}px)`, opacity: interpolate(p, [0.2, 0.7], [0, 1], clamp), transform: `scale(${1.05 - 0.05 * e})` };
    case 'flash':
      return cutAtMiddle(p, role, { transform: `scale(${role === 'out' ? 1 + 0.06 * half : 1.06 - 0.06 * half})` });
    case 'leak':
      return cutAtMiddle(p, role, { filter: `brightness(${1 + 0.45 * bell}) contrast(${1 - 0.35 * bell})` });
    case 'glitch': {
      const j = (random(`gx${frame}`) - 0.5) * 80;
      return cutAtMiddle(p, role, { transform: `translateX(${j}px) scale(1.1)`, filter: `hue-rotate(${random(`gh${frame}`) * 90}deg) saturate(1.6)` });
    }
    case 'smash': {
      if (role === 'out') return cutAtMiddle(p, role, { transform: `scale(${1 + 0.04 * half})` });
      const k = (1 - half) ** 2; // scale always covers the shake, ends exactly at 1
      const s = 1 + 0.15 * k;
      const sx = 18 * k * Math.sin(half * 8 * 2.6);
      return cutAtMiddle(p, role, { transform: `translateX(${sx}px) scale(${s})` });
    }
    case 'slices':
    case 'cut':
    default:
      return cutAtMiddle(p, role, {});
  }
};

const Overlay: React.FC<{ o: Out; p: number; frame: number }> = ({ o, p, frame }) => {
  const bell = Math.sin(Math.PI * p);
  const colors = o.colors ?? ['#FF5A36', '#FFD23F', '#2F6BFF', '#16130F'];
  const dir = o.dir ?? 1;
  switch (o.kind) {
    case 'flash':
      return <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, ${o.color ?? '#FFFDF7'} 0%, rgba(255,250,240,0.92) 65%, rgba(255,244,226,0.8) 100%)`, opacity: Math.pow(bell, 1.5) }} />;
    case 'leak':
      return (
        <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: bell }}>
          {[['#F6C878', 1500, 0], ['#E8A44A', 1900, 0.08], ['#FF8A5B', 2300, 0.16]].map(([c, d, lag], i) => {
            const t = io(Math.max(0, Math.min(1, p - (lag as number) + 0.08)));
            return <div key={i} style={{ position: 'absolute', width: d as number, height: d as number, borderRadius: '50%', left: `${100 - t * 130}%`, top: `${-30 + t * 90}%`, transform: 'translate(-50%,-50%)', background: `radial-gradient(circle, ${c}, transparent 65%)`, filter: 'blur(60px)' }} />;
          })}
          <AbsoluteFill style={{ background: '#FFF3DC', opacity: Math.pow(bell, 3) * 0.85 }} />
        </AbsoluteFill>
      );
    case 'slices': {
      const n = 6;
      return (
        <AbsoluteFill>
          {Array.from({ length: n }, (_, i) => {
            const a = io(interpolate(p, [i * 0.03, i * 0.03 + 0.35], [0, 1], clamp));
            const z = io(interpolate(p, [0.5 + i * 0.03, 0.5 + i * 0.03 + 0.35], [0, 1], clamp));
            const d = (i % 2 ? -1 : 1) * dir;
            const x = (1 - a) * -d * 105 + z * d * 105;
            return <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${(i * 100) / n}%`, height: `${100 / n + 0.3}%`, background: colors[i % colors.length], transform: `translateX(${x}%)` }} />;
          })}
        </AbsoluteFill>
      );
    }
    case 'wipe': {
      const X = io(p) * 140;
      return <AbsoluteFill style={{ background: o.color ?? '#FFD23F', clipPath: `polygon(${X}% 0, ${X + 7}% 0, ${X - 33}% 100%, ${X - 40}% 100%)` }} />;
    }
    case 'glitch':
      return (
        <AbsoluteFill style={{ mixBlendMode: 'multiply' }}>
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${random(`by${frame}-${i}`) * 100}%`, height: `${2 + random(`bh${frame}-${i}`) * 9}%`, background: i % 2 ? '#00E5FF' : '#FF2BD6', opacity: 0.75, transform: `translateX(${(random(`bx${frame}-${i}`) - 0.5) * 30}%)` }} />
          ))}
        </AbsoluteFill>
      );
    default:
      return null;
  }
};

export const Timeline: React.FC<{ scenes: Scene[]; sfx?: boolean; backdrop?: string }> = ({ scenes, sfx = true, backdrop = '#16130F' }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const starts: number[] = [];
  scenes.reduce((s, sc) => (starts.push(s), s + sc.dur), 0);
  const outOf = (i: number): Out | undefined => (i >= 0 && i < scenes.length - 1 ? scenes[i].out : undefined);
  const durOf = (i: number) => { const o = outOf(i); return o ? o.dur ?? DUR[o.kind] : 0; };
  const prog = (i: number) => { // progress of transition i→i+1, or null if outside its window
    const d = durOf(i); if (!d) return null;
    const c = starts[i + 1]; const a = c - d / 2;
    return frame >= a && frame < a + d ? (frame - a) / d : null;
  };
  return (
    <AbsoluteFill style={{ background: backdrop }}>
      {scenes.map((sc, i) => {
        const from = starts[i] - Math.floor(durOf(i - 1) / 2);
        const to = starts[i] + sc.dur + Math.ceil(durOf(i) / 2);
        const pin = prog(i - 1), pout = prog(i);
        const style: React.CSSProperties = {
          ...(pin !== null ? look(outOf(i - 1)!, pin, 'in', W, H, frame) : {}),
          ...(pout !== null ? look(outOf(i)!, pout, 'out', W, H, frame) : {}),
        };
        return (
          <Sequence key={i} from={from} durationInFrames={to - from}>
            <AbsoluteFill style={style}>{sc.el}</AbsoluteFill>
          </Sequence>
        );
      })}
      {scenes.map((_, i) => { const p = prog(i); return p === null ? null : <Overlay key={`o${i}`} o={outOf(i)!} p={p} frame={frame} />; })}
      {sfx && scenes.map((_, i) => {
        const o = outOf(i); const s = o && SFX_FOR[o.kind]; if (!s) return null;
        const len = s.len ?? 45;
        return (
          <Sequence key={`s${i}`} from={Math.max(0, starts[i + 1] - s.lead)} durationInFrames={len}>
            <Audio src={staticFile(`audio/${s.file}`)} volume={(f) => s.vol * interpolate(f, [len - 12, len], [1, 0], clamp)} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// Film grain on top of everything: removes the flat "AI render" look. Keep opacity 0.05–0.1.
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.08 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity, mixBlendMode: 'multiply' }}>
      <svg width="100%" height="100%">
        <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={Math.floor(f / 2)} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

// Slow camera drift so no shot is ever perfectly static (1–3% scale over the shot).
export const Drift: React.FC<{ dur: number; from?: number; to?: number; x?: number; children: React.ReactNode }> = ({ dur, from = 1, to = 1.04, x = 0, children }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, dur], [0, 1], clamp);
  return <AbsoluteFill style={{ transform: `scale(${from + (to - from) * t}) translateX(${x * t}px)` }}>{children}</AbsoluteFill>;
};
