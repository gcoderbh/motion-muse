import React from 'react';
import {
  AbsoluteFill, Audio, Easing, Sequence, interpolate, interpolateColors, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from 'remotion';
import { b, C, FONT, MUSIC_START_SEC } from './theme';

export const TOTAL = 450;
const CUTS = [b(8), b(12), b(20), b(26)];
const lb = (k0: number, k: number) => b(k0 + k) - b(k0);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const seg = new Intl.Segmenter('th', { granularity: 'grapheme' });
const graphemes = (s: string) => Array.from(seg.segment(s), (x) => x.segment);

const useSpring = (from: number, damping = 14, stiffness = 180) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - from, fps, config: { damping, stiffness } });
};

/* 1. Kinetic beats: one word slams in per beat */
const KineticBeats: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = ['ทำ', 'คลิป', 'ให้', 'มี', 'ลูก', 'เล่น', 'จัด', 'เต็ม!'];
  const bgs = [C.paper, C.ink, C.coral, C.paper, C.yellow, C.ink, C.blue, C.coral];
  const fgs = [C.ink, C.yellow, C.white, C.coral, C.ink, C.white, C.white, C.white];
  let i = 0;
  for (let k = 0; k < words.length; k++) if (f >= lb(0, k)) i = k;
  const local = f - lb(0, i);
  const s = spring({ frame: local, fps, config: { damping: 11, stiffness: 220 } });
  const scale = interpolate(s, [0, 1], [2.4, 1]);
  const rot = interpolate(s, [0, 1], [i % 2 ? 9 : -9, 0]);
  const shake = Math.max(0, 1 - local / 7) * 18;
  const sx = Math.sin(local * 2.7) * shake;
  const sy = Math.cos(local * 3.1) * shake;
  const ring = interpolate(local, [0, 14], [0.5, 1.25], { ...clamp, easing: Easing.out(Easing.cubic) });
  const ringOp = interpolate(local, [0, 14], [0.55, 0], clamp);
  const last = i === words.length - 1;
  const push = last ? interpolate(local, [0, 30], [1, 1.12], clamp) : 1;
  return (
    <AbsoluteFill style={{ background: bgs[i], justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', width: 900, height: 900, borderRadius: '50%', border: `28px solid ${fgs[i]}`, transform: `scale(${ring})`, opacity: ringOp }} />
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: i === 1 || last ? 290 : 320, lineHeight: 1.35, color: fgs[i], transform: `translate(${sx}px, ${sy}px) scale(${scale * push}) rotate(${rot}deg)`, letterSpacing: -6 }}>
        {words[i]}
      </div>
      <div style={{ position: 'absolute', bottom: 220, display: 'flex', gap: 22 }}>
        {words.map((_, k) => (
          <div key={k} style={{ width: k === i ? 64 : 22, height: 22, borderRadius: 11, background: fgs[i], opacity: k <= i ? 1 : 0.25 }} />
        ))}
      </div>
      <div style={{ position: 'absolute', top: 170, fontFamily: FONT, fontWeight: 500, fontSize: 38, letterSpacing: 8, color: fgs[i], opacity: 0.8 }}>
        KINETIC BEATS · 123 BPM
      </div>
    </AbsoluteFill>
  );
};

/* 2. Giant mask reveal + colour wipe + grapheme stagger + underline draw */
const MaskReveal: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const up = interpolate(f, [0, 12], [100, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const wipe = interpolate(f, [lb(8, 1), lb(8, 1) + 10], [0, 100], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const sub = graphemes('ขยับทุกจังหวะ');
  const subStart = lb(8, 2) - 6;
  const line = interpolate(f, [lb(8, 3) - 4, lb(8, 3) + 8], [1, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const giant = (color: string) => (
    <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 250, color, letterSpacing: -10, lineHeight: 1, transform: `translateY(${up}%)` }}>MOTION</div>
  );
  return (
    <AbsoluteFill style={{ background: C.paper, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'relative', overflow: 'hidden', padding: '40px 30px' }}>
        <div style={{ position: 'absolute', inset: 0, background: C.coral, transform: `scaleX(${wipe / 100})`, transformOrigin: 'left' }} />
        <div style={{ position: 'relative' }}>{giant(C.ink)}</div>
        <div style={{ position: 'absolute', inset: 0, padding: '40px 30px', clipPath: `inset(0 ${100 - wipe}% 0 0)` }}>{giant(C.white)}</div>
      </div>
      <div style={{ display: 'flex', marginTop: 70, fontFamily: FONT, fontWeight: 700, fontSize: 110, color: C.ink, lineHeight: 1.4 }}>
        {sub.map((g, k) => {
          const s = spring({ frame: f - subStart - k * 1.5, fps, config: { damping: 13, stiffness: 200 } });
          return (
            <span key={k} style={{ display: 'inline-block', transform: `translateY(${(1 - s) * 80}px)`, opacity: s }}>{g}</span>
          );
        })}
      </div>
      <svg width={720} height={60} viewBox="0 0 720 60" style={{ marginTop: -10 }}>
        <path d="M10 40 C 180 8, 420 8, 710 34" stroke={C.blue} strokeWidth={16} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={line} />
      </svg>
    </AbsoluteFill>
  );
};

/* 3. One shape, never cut: button → loader → check → toggle → card */
type St = { at: number; w: number; h: number; r: number; c: string };
const STATES: St[] = [
  { at: 0, w: 600, h: 170, r: 85, c: C.ink },
  { at: 1, w: 560, h: 150, r: 75, c: C.ink },
  { at: 2, w: 220, h: 220, r: 110, c: C.blue },
  { at: 4, w: 260, h: 260, r: 130, c: C.mint },
  { at: 5, w: 400, h: 200, r: 100, c: C.ink },
  { at: 6, w: 400, h: 200, r: 100, c: C.coral },
  { at: 7, w: 800, h: 980, r: 56, c: C.white },
];
const ShapeMorph: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  let i = 0;
  for (let k = 0; k < STATES.length; k++) if (f >= lb(12, STATES[k].at)) i = k;
  const cur = STATES[i];
  const prev = STATES[Math.max(0, i - 1)];
  const local = f - lb(12, cur.at);
  const p = i === 0 ? 1 : spring({ frame: local, fps, config: { damping: 15, stiffness: 190 } });
  const L = (a: number, z: number) => a + (z - a) * p;
  const bg = interpolateColors(Math.min(1, p), [0, 1], [prev.c, cur.c]);
  const blur = interpolate(local, [0, 6], [12, 0], clamp);
  const op = interpolate(local, [0, 6], [0, 1], clamp);
  const intro = spring({ frame: f, fps, config: { damping: 14, stiffness: 160 } });

  // cursor
  const cx = interpolate(f, [0, lb(12, 1) - 3], [520, 140], { ...clamp, easing: Easing.out(Easing.cubic) });
  const cy = interpolate(f, [0, lb(12, 1) - 3], [700, 40], { ...clamp, easing: Easing.out(Easing.cubic) });
  const click = f >= lb(12, 1) && f < lb(12, 1) + 5 ? 0.82 : 1;
  const cursorOp = interpolate(f, [lb(12, 2), lb(12, 2) + 6], [1, 0], clamp);
  const spin = (f - lb(12, 2)) * 14;
  const check = interpolate(f, [lb(12, 4) + 2, lb(12, 4) + 12], [1, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const knob = spring({ frame: f - lb(12, 6), fps, config: { damping: 12, stiffness: 220 } });

  let content: React.ReactNode = null;
  if (i <= 1) content = <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 64, color: C.white }}>กดเลย →</span>;
  else if (i === 2)
    content = (
      <svg width={120} height={120} viewBox="0 0 120 120" style={{ transform: `rotate(${spin}deg)` }}>
        <circle cx={60} cy={60} r={46} stroke="rgba(255,255,255,.3)" strokeWidth={14} fill="none" />
        <path d="M60 14 A46 46 0 0 1 106 60" stroke={C.white} strokeWidth={14} fill="none" strokeLinecap="round" />
      </svg>
    );
  else if (i === 3)
    content = (
      <svg width={140} height={140} viewBox="0 0 140 140">
        <path d="M30 74 L58 100 L112 42" stroke={C.ink} strokeWidth={18} fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={check} />
      </svg>
    );
  else if (i <= 5)
    content = (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 20, left: 20 + (i === 5 ? knob : 0) * 200, width: 160, height: 160, borderRadius: 80, background: C.white, boxShadow: '0 8px 20px rgba(0,0,0,.25)' }} />
      </div>
    );
  else
    content = (
      <div style={{ padding: 70, width: '100%', boxSizing: 'border-box', fontFamily: FONT, color: C.ink }}>
        <div style={{ width: 120, height: 120, borderRadius: 60, background: C.coral, marginBottom: 50 }} />
        <div style={{ fontWeight: 900, fontSize: 92, lineHeight: 1.25 }}>ลูกเล่น<br />แบบมือโปร</div>
        {[1, 0.8, 0.6].map((w, k) => (
          <div key={k} style={{ height: 34, borderRadius: 17, background: '#ECE6DC', width: `${w * 100}%`, marginTop: 36 }} />
        ))}
      </div>
    );

  return (
    <AbsoluteFill style={{ background: '#F1ECE4', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', top: 170, fontFamily: FONT, fontWeight: 500, fontSize: 40, letterSpacing: 6, color: C.ink, opacity: 0.6 }}>ONE SHAPE · ไม่ตัดภาพ</div>
      <div style={{ position: 'relative', transform: `scale(${intro * click})` }}>
        <div style={{ width: L(prev.w, cur.w), height: L(prev.h, cur.h), borderRadius: L(prev.r, cur.r), background: bg, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', boxShadow: i === 6 ? '0 40px 80px rgba(40,30,20,.18)' : '0 20px 40px rgba(40,30,20,.12)' }}>
          <div style={{ filter: `blur(${blur}px)`, opacity: op, width: i >= 4 ? '100%' : undefined, height: i >= 4 && i <= 5 ? '100%' : undefined }}>{content}</div>
        </div>
        <svg width={90} height={110} viewBox="0 0 24 30" style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(${cx}px, ${cy}px) scale(${click})`, opacity: cursorOp }}>
          <path d="M2 2 L2 24 L8 18 L12 28 L16 26 L12 17 L20 17 Z" fill={C.ink} stroke={C.white} strokeWidth={1.6} />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

/* 4. Data story: count-up + staggered bars + callout */
const DataStory: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = Math.round(interpolate(f, [2, lb(20, 3)], [0, 250], { ...clamp, easing: Easing.out(Easing.quad) }));
  const hit = spring({ frame: f - lb(20, 5), fps, config: { damping: 9, stiffness: 260 } });
  const bump = f >= lb(20, 5) ? interpolate(hit, [0, 1], [1.25, 1]) : 1;
  const bars = [0.22, 0.36, 0.5, 0.68, 1];
  const call = spring({ frame: f - lb(20, 4), fps, config: { damping: 12, stiffness: 200 } });
  return (
    <AbsoluteFill style={{ background: C.paper, alignItems: 'center', fontFamily: FONT, color: C.ink }}>
      <div style={{ marginTop: 230, fontWeight: 700, fontSize: 72 }}>ยอดวิวพุ่ง</div>
      <div style={{ fontWeight: 900, fontSize: 260, lineHeight: 1.1, color: C.coral, transform: `scale(${bump})`, fontVariantNumeric: 'tabular-nums' }}>+{n}%</div>
      <div style={{ position: 'absolute', bottom: 260, height: 760, width: 860, display: 'flex', alignItems: 'flex-end', gap: 36 }}>
        {bars.map((h, k) => {
          const s = spring({ frame: f - 6 - k * 5, fps, config: { damping: 15, stiffness: 140 } });
          return <div key={k} style={{ flex: 1, height: `${h * s * 100}%`, borderRadius: '24px 24px 0 0', background: k === 4 ? C.coral : k % 2 ? C.blue : C.ink }} />;
        })}
        <div style={{ position: 'absolute', right: 60, top: -40, transform: `translateY(${(1 - call) * 40}px) scale(${call})`, transformOrigin: 'bottom right', background: C.yellow, padding: '18px 36px', borderRadius: 40, fontWeight: 700, fontSize: 48, whiteSpace: 'nowrap', boxShadow: '0 12px 28px rgba(0,0,0,.12)' }}>
          หลังใส่ลูกเล่น ✦
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 250, width: 900, height: 8, borderRadius: 4, background: C.ink }} />
    </AbsoluteFill>
  );
};

/* 5. Poster breaks out of its frame → end card */
const Breakout: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out = spring({ frame: f - lb(26, 1), fps, config: { damping: 13, stiffness: 120 } });
  const cam = interpolate(f, [0, lb(26, 3)], [1.08, 0.9], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const end = spring({ frame: f - lb(26, 3), fps, config: { damping: 16, stiffness: 140 } });
  const posterY = interpolate(end, [0, 1], [0, -330]);
  const posterS = interpolate(end, [0, 1], [1, 0.62]);
  const shapes = [
    { x: -330, y: -420, s: 1.5, el: <div style={{ width: 260, height: 260, borderRadius: '50%', background: C.coral }} /> },
    { x: 360, y: -260, s: 1.35, el: <div style={{ width: 210, height: 210, borderRadius: 30, background: C.blue, transform: 'rotate(18deg)' }} /> },
    { x: 330, y: 470, s: 1.6, el: <div style={{ width: 240, height: 220, background: C.mint, clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }} /> },
    { x: -350, y: 400, s: 1.3, el: <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 96, color: C.ink, background: C.white, padding: '0 26px', borderRadius: 20, transform: 'rotate(-8deg)' }}>หลุดกรอบ!</div> },
  ];
  const tagline = graphemes('พร้อมทำคลิปให้คุณ');
  return (
    <AbsoluteFill style={{ background: C.paper, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: `translateY(${posterY}px) scale(${cam * posterS})`, position: 'relative' }}>
        <div style={{ width: 720, height: 1040, border: `16px solid ${C.ink}`, background: C.yellow, borderRadius: 12, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative' }}>
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 210, color: C.ink, transform: 'rotate(-90deg)', letterSpacing: -6 }}>BUZZY</div>
        </div>
        {shapes.map((sh, k) => {
          const d = Math.max(0, out - k * 0.04);
          return (
            <div key={k} style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) translate(${sh.x * d * 0.95}px, ${sh.y * d * 0.8}px) scale(${0.35 + d * (sh.s - 0.35)}) rotate(${(1 - d) * 40}deg)`, opacity: Math.min(1, out * 3) }}>
              {sh.el}
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', bottom: 330, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: FONT, color: C.ink }}>
        <div style={{ display: 'flex', fontWeight: 900, fontSize: 96, lineHeight: 1.4 }}>
          {tagline.map((g, k) => {
            const s = spring({ frame: f - lb(26, 3) - k * 1.2, fps, config: { damping: 13, stiffness: 200 } });
            return <span key={k} style={{ display: 'inline-block', opacity: s, transform: `translateY(${(1 - s) * 60}px)` }}>{g}</span>;
          })}
        </div>
        <div style={{ marginTop: 18, opacity: end, fontWeight: 500, fontSize: 40, letterSpacing: 6, color: C.coral }}>REMOTION × SHOTCRAFT</div>
      </div>
    </AbsoluteFill>
  );
};

/* Whip panel covering each cut */
const Whips: React.FC = () => {
  const f = useCurrentFrame();
  const colors = [C.yellow, C.ink, C.coral, C.blue];
  return (
    <>
      {CUTS.map((c, k) => {
        const x = interpolate(f, [c - 5, c + 5], [110, -110], { ...clamp, easing: Easing.inOut(Easing.cubic) });
        if (f < c - 5 || f > c + 5) return null;
        return <AbsoluteFill key={k} style={{ background: colors[k], transform: `translateX(${x}%) skewX(-12deg) scaleX(1.3)` }} />;
      })}
    </>
  );
};

type Sfx = { at: number; src: string; v: number };
const SFX: Sfx[] = [
  ...[0, 2, 4, 6].map((k) => ({ at: b(k), src: 'bass-hit-short.mp3', v: 0.55 })),
  { at: b(7), src: 'hit-fast-exciting.mp3', v: 0.5 },
  ...CUTS.map((c) => ({ at: c - 6, src: 'whoosh-fast.mp3', v: 0.5 })),
  { at: b(8), src: 'swoosh-quick.mp3', v: 0.4 },
  { at: b(9), src: 'transition-snap.mp3', v: 0.4 },
  { at: b(13), src: 'ui-click-tone.mp3', v: 0.6 },
  { at: b(16), src: 'ui-success-soft.mp3', v: 0.6 },
  { at: b(18), src: 'switch-click-quick.mp3', v: 0.7 },
  { at: b(19), src: 'pop.mp3', v: 0.6 },
  { at: b(20), src: 'clock-knob-spin.mp3', v: 0.35 },
  { at: b(24), src: 'pop.mp3', v: 0.6 },
  { at: b(25), src: 'impact-zoom-quick.mp3', v: 0.5 },
  { at: b(27), src: 'warp-slide.mp3', v: 0.45 },
  { at: b(29), src: 'sparkle.mp3', v: 0.5 },
];

export const Reel: React.FC = () => {
  const scenes: [number, number, React.FC][] = [
    [0, CUTS[0], KineticBeats],
    [CUTS[0], CUTS[1], MaskReveal],
    [CUTS[1], CUTS[2], ShapeMorph],
    [CUTS[2], CUTS[3], DataStory],
    [CUTS[3], TOTAL, Breakout],
  ];
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      {scenes.map(([from, to, S], k) => (
        <Sequence key={k} from={from} durationInFrames={to - from}>
          <S />
        </Sequence>
      ))}
      <Whips />
      {/* Placeholder music: replace with a new track from scripts/find-music.py for real videos */}
      <Audio
        src={staticFile('audio/house-vibez.mp3')}
        trimBefore={Math.round(MUSIC_START_SEC * 30)}
        volume={(f) => interpolate(f, [0, 4, TOTAL - 24, TOTAL], [0, 0.8, 0.8, 0], clamp)}
      />
      {SFX.map((s, k) => (
        <Sequence key={k} from={Math.max(0, s.at)}>
          <Audio src={staticFile(`audio/${s.src}`)} volume={s.v} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
