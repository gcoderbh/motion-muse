import React from 'react';
import { AbsoluteFill, Audio, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { b, C, FONT, MUSIC_START_SEC } from './theme';
import { Drift, Grain, Kind, Scene, Timeline } from './transitions';

const seg = new Intl.Segmenter('th', { granularity: 'grapheme' });
const graphemes = (s: string) => Array.from(seg.segment(s), (x) => x.segment);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

type CardP = { n: number; th: string; en: string; use: string; bg: string; fg: string; ac: string; align: 'left' | 'center' | 'bottom' };
const Card: React.FC<CardP & { dur: number }> = ({ n, th, en, use, bg, fg, ac, align, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const g = graphemes(th);
  const bar = interpolate(f, [4, 20], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const blob = spring({ frame: f - 2, fps, config: { damping: 12, stiffness: 120 } });
  const pos: React.CSSProperties =
    align === 'left' ? { left: 90, top: 640, alignItems: 'flex-start' }
    : align === 'bottom' ? { left: 90, bottom: 260, alignItems: 'flex-start' }
    : { left: 0, right: 0, top: 700, alignItems: 'center' };
  return (
    <AbsoluteFill style={{ background: bg, overflow: 'hidden' }}>
      <Drift dur={dur + 20} to={1.05} x={align === 'left' ? -30 : 30}>
        <div style={{ position: 'absolute', width: 760, height: 760, borderRadius: '50%', background: ac, right: align === 'left' ? -260 : undefined, left: align === 'left' ? undefined : -240, top: align === 'bottom' ? 120 : 1100, transform: `scale(${blob})`, opacity: 0.9 }} />
        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', ...pos }}>
          <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 40, letterSpacing: 10, color: fg, opacity: 0.75 }}>{String(n).padStart(2, '0')} / {en.toUpperCase()}</div>
          <div style={{ display: 'flex', fontFamily: FONT, fontWeight: 900, fontSize: 168, lineHeight: 1.35, color: fg, marginTop: 10 }}>
            {g.map((c, k) => {
              const s = spring({ frame: f - 3 - k * 1.2, fps, config: { damping: 14, stiffness: 210 } });
              return <span key={k} style={{ display: 'inline-block', transform: `translateY(${(1 - s) * 90}px) rotate(${(1 - s) * 8}deg)`, opacity: s }}>{c}</span>;
            })}
          </div>
          <div style={{ width: 380 * bar, height: 14, borderRadius: 7, background: fg, marginTop: 6 }} />
          <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 52, color: fg, marginTop: 34, maxWidth: 900, lineHeight: 1.4, opacity: interpolate(f, [10, 20], [0, 1], clamp), textAlign: align === 'center' ? 'center' : 'left' }}>{use}</div>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};

const CARDS: (CardP & { out?: Kind })[] = [
  { n: 1, th: 'ปัดกล้อง', en: 'whip pan', use: 'ฉากต่อเนื่อง จังหวะเร็ว', bg: C.paper, fg: C.ink, ac: C.yellow, align: 'left', out: 'whip' },
  { n: 2, th: 'ดันขึ้น', en: 'push', use: 'ไปหัวข้อถัดไป', bg: C.blue, fg: C.white, ac: '#5B8BFF', align: 'center', out: 'push' },
  { n: 3, th: 'ซูมทะลุ', en: 'zoom through', use: 'เข้าไปดูรายละเอียด', bg: C.yellow, fg: C.ink, ac: C.coral, align: 'bottom', out: 'zoom' },
  { n: 4, th: 'วงกลมเปิด', en: 'iris', use: 'เปิดจากจุดที่คนดูมองอยู่', bg: C.white, fg: C.ink, ac: C.mint, align: 'left', out: 'iris' },
  { n: 5, th: 'ปาดเฉียง', en: 'wipe', use: 'เปลี่ยนเรื่อง มีทิศทาง', bg: C.mint, fg: C.ink, ac: C.white, align: 'center', out: 'wipe' },
  { n: 6, th: 'แถบสลับ', en: 'slices', use: 'เปิดช่วงใหม่ สนุก ๆ', bg: C.coral, fg: C.white, ac: '#FF8A6B', align: 'bottom', out: 'slices' },
  { n: 7, th: 'แฟลช', en: 'flash cut', use: 'ลงบีทหนัก ๆ', bg: C.paper, fg: C.ink, ac: C.blue, align: 'left', out: 'flash' },
  { n: 8, th: 'กลิตช์', en: 'glitch', use: 'เทค ดิจิทัล (ใช้น้อย ๆ)', bg: C.ink, fg: C.yellow, ac: '#2A2622', align: 'center', out: 'glitch' },
  { n: 9, th: 'แสงรั่ว', en: 'light leak', use: 'อบอุ่น อารมณ์ฟิล์ม', bg: C.white, fg: C.coral, ac: '#FFE3D6', align: 'bottom', out: 'leak' },
  { n: 10, th: 'ละลายโฟกัส', en: 'focus pull', use: 'ช้าลง นุ่มนวล', bg: '#EAF1FF', fg: C.blue, ac: C.white, align: 'left', out: 'focus' },
  { n: 11, th: 'กระแทก', en: 'smash cut', use: 'หักมุม เน้นคำสำคัญ', bg: C.yellow, fg: C.ink, ac: C.white, align: 'center', out: 'smash' },
  { n: 12, th: 'จบสวย', en: 'end card', use: 'ค้างไว้ ≥ 1 วินาที', bg: C.paper, fg: C.ink, ac: C.coral, align: 'center' },
];

const D = b(3);
const scenes: Scene[] = CARDS.map((c, i) => ({
  dur: i === CARDS.length - 1 ? b(5) : D,
  el: <Card {...c} dur={D} />,
  out: c.out ? { kind: c.out, dir: i % 2 ? -1 : 1, origin: [72, 40] } : undefined,
}));
export const DEMO_TOTAL = scenes.reduce((s, x) => s + x.dur, 0);

export const TransitionsDemo: React.FC = () => {
  const f = useCurrentFrame();
  const fadeOut = interpolate(f, [DEMO_TOTAL - 25, DEMO_TOTAL], [0.55, 0], clamp);
  return (
    <AbsoluteFill>
      <Timeline scenes={scenes} />
      <Grain opacity={0.07} />
      <Audio src={staticFile('audio/house-vibez.mp3')} trimBefore={Math.round(MUSIC_START_SEC * 30)} volume={fadeOut} />
    </AbsoluteFill>
  );
};
