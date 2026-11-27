// "ส่งถึงเธอ": two neighbours across a soi and one paper plane. A worked example of the handmade kit:
// shots cut on bar lines (lib/meter), one motif carried across every cut (lib/motif), heads that turn
// smoothly (lib/head), ink lines and gouache washes (lib/ink), synthesized SFX on the beats (synth-sfx.sh).
// Setup: bash "$SKILL_DIR/scripts/synth-sfx.sh" public/audio/paper-plane 96 9 && bash "$SKILL_DIR/scripts/thai-fonts.sh" public/fonts Mali
import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Handmade, Ink, DryBrush, Paper, Wash, spline, type Pt } from '../lib/ink';
import { TurnHead } from '../lib/head';
import { MotifLayer, motifAt, type MotifKey, type MotifPose } from '../lib/motif';
import { barTimeline, meter } from '../lib/meter';
import { useThaiFont } from '../lib/typography';
import sb from './storyboard.json';

const W = 1080, H = 1920;
export const FPS = sb.fps;
export const M = meter({ bpm: sb.music.bpm, fps: sb.fps, beats: sb.music.beats, offset: sb.music.offset ?? 0 });
export const SHOTS = barTimeline(M, sb.scenes.map((s) => [s.id, s.bars] as [string, number]));
export const TOTAL = SHOTS[SHOTS.length - 1].from + SHOTS[SHOTS.length - 1].dur;
const S = Object.fromEntries(SHOTS.map((s) => [s.id, s])) as Record<string, { from: number; dur: number }>;
const at = M.at; // at(bar, beat): frame of bar n (0-based), beat k

const INK = '#2b211b', PAPER = '#f3ead8', RED = '#c8463a', SKY = '#9cc3c9', WALL1 = '#e3b26e', WALL2 = '#b9c99a', SHADE = '#6d5a4a';
const her = { skin: '#f0c39c', hair: '#3a2418', hairStyle: 'bob' as const };
const him = { skin: '#d9a57a', hair: '#1c1a22', hairStyle: 'short' as const };

// the plane's path on the film timeline; 'hold' keys are the cuts (it jumps to where it is in the next framing)
const KEYS: MotifKey[] = [
  { f: 0, x: 540, y: 1420, s: 2.2, r: -14, o: 0 },
  { f: 6, x: 540, y: 1410, s: 2.2, r: -14, o: 1 },
  { f: at(1), x: 560, y: 1380, s: 2.3, r: -6 },
  { f: S.fold.dur - 1, x: 600, y: 1330, s: 2.3, r: -18 },
  { f: S.throw.from, x: 300, y: 1060, s: 0.55, r: -20, go: 'hold' },
  { f: S.throw.from + 8, x: 315, y: 1050, s: 0.55, r: -20 },
  { f: S.soi.from - 1, x: 1130, y: 760, s: 0.6, r: 8, go: 'arc', lift: 260 },
  { f: S.soi.from, x: -80, y: 760, s: 1.1, r: 6, go: 'hold' },
  { f: S.soi.from + Math.round(S.soi.dur * 0.55), x: 560, y: 900, s: 1.15, r: 4, go: 'arc', lift: 90 },
  { f: S.catch.from - 1, x: 1160, y: 820, s: 1.2, r: -4, go: 'linear' },
  { f: S.catch.from, x: -90, y: 760, s: 1.5, r: 4, go: 'hold' },
  { f: at(5, 1), x: 650, y: 1150, s: 1.5, r: 18 }, // caught on bar 6, beat 2
  { f: S.read.from - 1, x: 660, y: 1170, s: 1.5, r: 16 },
  { f: S.read.from, x: 540, y: 1000, s: 3.4, r: -4, go: 'hold' },
  { f: S.reply.from - 1, x: 540, y: 990, s: 3.5, r: -3 },
  { f: S.reply.from, x: 800, y: 1060, s: 0.6, r: 200, go: 'hold' },
  { f: S.reply.from + 10, x: 790, y: 1050, s: 0.6, r: 190 },
  { f: at(8), x: 290, y: 1070, s: 0.6, r: 170, go: 'arc', lift: 300 }, // lands on the last bar line
  { f: TOTAL, x: 292, y: 1072, s: 0.6, r: 168 },
];

// ---------- drawing helpers ----------
const lineIn = (f: number, start: number, len = 14) => interpolate(f, [start, start + len], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
const rect = (x: number, y: number, w: number, h: number): Pt[] => [[x, y], [x + w, y + 2], [x + w - 2, y + h], [x + 1, y + h - 2], [x, y + 1]];
const blob = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}Z`;

const Shophouse: React.FC<{ x: number; y: number; w: number; h: number; wall: string; f: number; delay?: number; window?: Pt; seed?: number }> = ({ x, y, w, h, wall, f, delay = 0, window, seed = 1 }) => (
  <g>
    <Wash d={blob(x, y, w, h)} color={wall} opacity={0.9 * lineIn(f, delay, 10)} seed={seed} />
    <Wash d={blob(x + w * 0.72, y, w * 0.28, h)} color={SHADE} opacity={0.22 * lineIn(f, delay + 6, 10)} seed={seed + 4} />
    <Ink points={rect(x, y, w, h)} smooth={false} width={5} draw={lineIn(f, delay, 16)} seed={seed} />
    {[0, 1, 2].map((r) => [0, 1].map((c) => {
      const wx = x + 40 + c * (w / 2), wy = y + 60 + r * 230, isOpen = window && Math.abs(wx - window[0]) < 1 && Math.abs(wy - window[1]) < 1;
      return (
        <g key={`${r}${c}`}>
          <Wash d={blob(wx, wy, w / 2 - 80, 170)} color={isOpen ? '#f7dca0' : '#4c5a63'} opacity={0.8 * lineIn(f, delay + 8 + r * 3, 8)} seed={seed + r * 3 + c} bleed={8} />
          <Ink points={rect(wx, wy, w / 2 - 80, 170)} smooth={false} width={3.5} draw={lineIn(f, delay + 8 + r * 3 + c * 2, 10)} seed={seed * 9 + r * 2 + c} />
        </g>
      );
    }))}
  </g>
);

const Shoulders: React.FC<{ x: number; y: number; s: number; color: string; lean?: number }> = ({ x, y, s, color, lean = 0 }) => {
  const P: Pt[] = [[x - 1.5 * s + lean, y + 2.6 * s], [x - 1.35 * s + lean, y + 1.5 * s], [x - 0.4 * s, y + 1.05 * s], [x + 0.4 * s, y + 1.05 * s], [x + 1.35 * s + lean, y + 1.5 * s], [x + 1.5 * s + lean, y + 2.6 * s]];
  const d = `M${spline(P, false, 6).map((p) => p.join(' ')).join('L')}Z`;
  return (
    <g>
      <path d={`M${x - 0.28 * s} ${y + 0.8 * s}L${x + 0.28 * s} ${y + 0.8 * s}L${x + 0.3 * s} ${y + 1.2 * s}L${x - 0.3 * s} ${y + 1.2 * s}Z`} fill="#c9946c" />
      <path d={d} fill={color} />
      <Ink points={P} width={4.5} seed={21} />
    </g>
  );
};

/** The motif itself: a folded plane (two wings and a keel), or the opened note during the "read" shot. */
const Plane: React.FC<{ p: MotifPose; f: number; font: string }> = ({ p, f, font }) => {
  const flying = p.speed > 1.5;
  const bank = flying ? Math.sin(f * 0.35) * 0.12 : 0;
  if (f >= S.read.from && f < S.reply.from) {
    const t = f - S.read.from;
    const open = spring({ frame: t, fps: 30, config: { damping: 16, mass: 0.7 } });
    const w = 40 + 70 * open, hh = 18 + 42 * open;
    const text = sb.scenes.find((s) => s.id === 'read')!.text!;
    const chars = Math.floor(interpolate(t, [10, 52], [0, [...text].length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
    const shown = [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(text)].map((g) => g.segment).slice(0, chars).join('');
    return (
      <g>
        <path d={`M${-w} ${-hh}L${w} ${-hh + 3}L${w - 2} ${hh}L${-w + 2} ${hh - 2}Z`} fill={PAPER} stroke={INK} strokeWidth={1.4} />
        {open > 0.6 && <path d={`M${-w * 0.02} ${-hh}L${w * 0.03} ${hh}M${-w} ${-hh * 0.1}L${w} ${hh * 0.05}`} stroke={SHADE} strokeWidth={0.6} opacity={0.5} />}
        <path d={`M${-w} ${-hh}L${-w * 0.6} ${-hh}`} stroke={RED} strokeWidth={4} />
        <text x={0} y={6} textAnchor="middle" fontFamily={font} fontSize={13} fill={INK} opacity={open}>{shown}</text>
      </g>
    );
  }
  return (
    <g transform={`rotate(${flying ? p.dir - p.r * 0.5 : 0}) scale(1 ${1 - bank})`}>
      <path d="M58 0L-42 -30L-22 0Z" fill={PAPER} stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M58 0L-22 0L-44 24Z" fill="#e2d6bf" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M58 0L-22 0L-30 9Z" fill="#cdbfa6" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      <path d="M-30 -22L-38 -27" stroke={RED} strokeWidth={4} strokeLinecap="round" />
    </g>
  );
};

// ---------- shots ----------
const Fold: React.FC = () => {
  const f = useCurrentFrame();
  const look = interpolate(f, [at(0, 3), at(1, 2)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const yaw = interpolate(look, [0, 1], [-0.25, 0.85]), pitch = interpolate(look, [0, 1], [-0.42, 0.05]);
  const push = 1 + f * 0.0008; // slow push-in, far under 1.3×
  return (
    <svg width={W} height={H} style={{ position: 'absolute' }}>
      <Handmade>
        <g transform={`translate(${W / 2} ${H / 2}) scale(${push}) translate(${-W / 2} ${-H / 2})`}>
          <Wash d={blob(0, 0, W, H)} color={WALL1} opacity={0.75} seed={3} />
          <Wash d={blob(140, 260, 800, 1100)} color="#2f3a45" opacity={0.85} seed={5} />
          <Wash d={blob(160, 280, 760, 520)} color={SKY} opacity={0.7} seed={6} />
          <Shoulders x={520} y={760} s={190} color="#e9e1cf" lean={-10} />
          <TurnHead x={520} y={760} size={190} yaw={yaw} pitch={pitch} roll={-0.05 + 0.08 * look} expr={look > 0.6 ? 'smile' : 'neutral'} blink={f > 70 && f < 74 ? 1 : 0} gaze={[look * 0.7, -0.6 + look * 0.7]} {...her} />
          <Wash d={blob(80, 1300, 920, 120)} color="#8b5a3c" opacity={0.95} seed={8} />
          <Ink points={rect(140, 260, 800, 1100)} smooth={false} width={9} seed={4} />
          <DryBrush points={[[90, 1310], [500, 1300], [990, 1316]]} width={30} color="#5b3624" seed={9} />
        </g>
      </Handmade>
    </svg>
  );
};

const Street: React.FC<{ f: number; pan: number; delay?: number; herWin?: boolean; himWin?: boolean }> = ({ f, pan, delay = 0, herWin, himWin }) => (
  <g transform={`translate(${-pan} 0)`}>
    <Wash d={blob(-200, 0, W + 400, 1000)} color={SKY} opacity={0.75} seed={12} />
    <Wash d={blob(-200, 1500, W + 400, 420)} color="#9a8f80" opacity={0.85} seed={13} />
    <Shophouse x={-30} y={720} w={420} h={900} wall={WALL1} f={f} delay={delay} seed={2} window={herWin ? [10, 320 + 460] : undefined} />
    <Shophouse x={700} y={640} w={420} h={980} wall={WALL2} f={f} delay={delay + 5} seed={7} window={himWin ? [950, 700 + 0] : undefined} />
    <Ink points={[[-60, 560], [300, 640], [700, 600], [1140, 520]]} width={2.5} draw={lineIn(f, delay + 10, 20)} seed={31} />
    <Ink points={[[-60, 600], [400, 700], [1140, 580]]} width={2} draw={lineIn(f, delay + 14, 20)} seed={32} />
    <DryBrush points={[[-100, 1630], [540, 1610], [1180, 1640]]} width={40} color="#4f4339" draw={lineIn(f, delay + 4, 18)} seed={14} />
  </g>
);

const Throw: React.FC = () => {
  const f = useCurrentFrame();
  const g = S.throw.from + f;
  return (
    <svg width={W} height={H} style={{ position: 'absolute' }}>
      <Handmade>
        <Street f={f} pan={f * 0.25} />
        <TurnHead x={300} y={1020} size={46} yaw={interpolate(g, [S.throw.from, S.throw.from + 40], [0.6, 1.1], { extrapolateRight: 'clamp' })} pitch={0.15} expr="smile" {...her} />
        <TurnHead x={930} y={940} size={44} yaw={-0.5} expr="neutral" {...him} />
      </Handmade>
    </svg>
  );
};

const Soi: React.FC = () => {
  const f = useCurrentFrame();
  const pan = interpolate(f, [0, S.soi.dur], [0, 120]);
  return (
    <svg width={W} height={H} style={{ position: 'absolute' }}>
      <Handmade>
        <g transform={`translate(${-pan} 0)`}>
          <Wash d={blob(-100, 0, W + 400, H)} color="#c9b79a" opacity={0.85} seed={41} />
          <Wash d={`M260 0L820 0L980 ${H}L120 ${H}Z`} color="#8e8576" opacity={0.85} seed={42} />
          <Ink points={[[260, 0], [200, 900], [120, H]]} width={6} draw={lineIn(f, 0, 30)} seed={43} />
          <Ink points={[[820, 0], [880, 900], [980, H]]} width={6} draw={lineIn(f, 4, 30)} seed={44} />
          {[0, 1, 2, 3, 4].map((k) => <Ink key={k} points={[[520, 120 + k * 360], [530, 300 + k * 360]]} width={7} color="#efe6d2" draw={lineIn(f, 10 + k * 6, 10)} seed={50 + k} />)}
          {/* noodle cart */}
          <Wash d={blob(300, 1180, 220, 140)} color={RED} opacity={0.85} seed={46} />
          <Ink points={rect(300, 1180, 220, 140)} smooth={false} width={4} draw={lineIn(f, 24, 14)} seed={47} />
          <Wash d={blob(280, 1130, 260, 40)} color="#e9e1cf" opacity={0.9} seed={48} />
          {[0, 1].map((k) => <circle key={k} cx={330 + k * 160} cy={1335} r={22} fill="none" stroke={INK} strokeWidth={5} opacity={lineIn(f, 30, 8)} />)}
          {/* steam drawn on twos */}
          {[0, 1, 2].map((k) => <Ink key={k} points={[[360 + k * 50, 1120], [345 + k * 50 + Math.sin((f - (f % 2)) * 0.2 + k) * 12, 1060], [365 + k * 50, 1000]]} width={3} opacity={0.6} seed={60 + k} boil={2} />)}
          {/* cat on the wall, tail ticking on the beat */}
          <Wash d="M840 520 q30 -50 60 0 q10 40 -30 50 q-40 -10 -30 -50Z" color="#3b3330" opacity={0.95} seed={61} />
          <Ink points={[[895, 560], [930, 590 + 25 * M.pulse(S.soi.from + f, 6)], [960, 560]]} width={6} seed={62} />
          {/* wires */}
          <Ink points={[[-100, 300], [400, 380], [1200, 260]]} width={2.4} draw={lineIn(f, 6, 30)} seed={63} />
          <Ink points={[[-100, 340], [600, 440], [1200, 330]]} width={2} draw={lineIn(f, 12, 30)} seed={64} />
        </g>
      </Handmade>
    </svg>
  );
};

const Catch: React.FC = () => {
  const f = useCurrentFrame();
  const g = S.catch.from + f;
  // his head follows the motif: yaw from where the plane is relative to his face, smoothed by springing toward it
  const hx = 640, hy = 760;
  const lookAt = (k: number) => { const p = motifAt(KEYS, k); return Math.max(-1.25, Math.min(1.1, (p.x - hx) / 420)); };
  const yaw = lookAt(g) * 0.75 + lookAt(g - 4) * 0.25;
  const caught = g >= at(5, 1);
  const recoil = caught ? spring({ frame: g - at(5, 1), fps: 30, config: { damping: 9 } }) : 0;
  return (
    <svg width={W} height={H} style={{ position: 'absolute' }}>
      <Handmade>
        <Wash d={blob(0, 0, W, H)} color={WALL2} opacity={0.8} seed={71} />
        <Wash d={blob(170, 240, 760, 1080)} color="#2f3a45" opacity={0.85} seed={72} />
        <Wash d={blob(190, 260, 720, 600)} color="#f2c27a" opacity={0.55} seed={73} />
        <Shoulders x={hx} y={hy} s={180} color="#7a8f9c" lean={8} />
        <TurnHead x={hx} y={hy + recoil * 10 - 10 * (1 - recoil) * (caught ? 1 : 0)} size={180} yaw={yaw} pitch={caught ? -0.25 * recoil : 0.08} roll={yaw * -0.06}
          expr={caught ? 'grin' : f > 30 ? 'surprised' : 'neutral'} gaze={[Math.max(-1, Math.min(1, yaw * 0.8)), caught ? -0.5 : 0]} {...him} />
        <Wash d={blob(100, 1270, 900, 120)} color="#6b4a35" opacity={0.95} seed={74} />
        <Ink points={rect(170, 240, 760, 1080)} smooth={false} width={9} seed={75} />
        <DryBrush points={[[110, 1280], [560, 1272], [1000, 1286]]} width={30} color="#3e2a1e" seed={76} />
      </Handmade>
    </svg>
  );
};

const Read: React.FC = () => (
  <svg width={W} height={H} style={{ position: 'absolute' }}>
    <Handmade wobble={1.4}>
      <Wash d={blob(0, 0, W, H)} color="#d9c7a7" opacity={0.85} seed={81} />
      <Wash d={blob(60, 520, 960, 980)} color="#6b4a35" opacity={0.6} seed={82} />
    </Handmade>
  </svg>
);

const Reply: React.FC<{ font: string }> = ({ font }) => {
  const f = useCurrentFrame();
  const g = S.reply.from + f;
  const land = at(8);
  const title = sb.scenes.find((s) => s.id === 'reply')!.text!;
  const tIn = spring({ frame: g - land, fps: 30, config: { damping: 14 } });
  const herYaw = interpolate(g, [S.reply.from + 10, land], [0.4, 1.1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <svg width={W} height={H} style={{ position: 'absolute' }}>
      <Handmade>
        <Street f={f + 40} pan={30 - f * 0.2} />
        <TurnHead x={300} y={1020} size={46} yaw={herYaw} pitch={0.1} expr={g > land ? 'grin' : 'smile'} {...her} />
        <TurnHead x={930} y={940} size={44} yaw={interpolate(g, [S.reply.from, land], [-0.9, -0.3], { extrapolateRight: 'clamp' })} expr="smile" {...him} />
        <g opacity={tIn} transform={`translate(540 ${330 - 20 * (1 - tIn)})`}>
          <text textAnchor="middle" fontFamily={font} fontWeight={700} fontSize={150} fill={INK}>{title}</text>
          <Ink points={[[-260, 50], [-60, 62], [140, 48], [270, 58]]} width={11} color={RED} draw={lineIn(g, land + 4, 14)} seed={91} />
        </g>
      </Handmade>
    </svg>
  );
};

// SFX on musical positions: [frame, file, volume]
const SFX: [number, string, number][] = [
  [at(0, 1), 'fold', 0.8], [at(0, 2), 'paper', 0.6], [at(0, 3), 'fold', 0.8], [at(1, 1), 'fold', 0.7],
  [S.throw.from + 6, 'flutter', 0.9], [S.soi.from, 'pencil', 0.35], [S.soi.from + 10, 'flutter', 0.6], [at(3, 2), 'pluck', 0.4],
  [S.catch.from, 'flutter', 0.7], [at(5, 1), 'thud', 1], [at(5, 1), 'knock', 0.5],
  [S.read.from, 'paper', 0.9], [S.read.from + 12, 'pencil', 0.4],
  [S.reply.from + 8, 'flutter', 0.9], [at(8), 'thud', 0.8], [at(8), 'bell', 0.6],
];

export const PaperPlane: React.FC = () => {
  const font = useThaiFont('Mali');
  const { width, height } = useVideoConfig();
  const shot = (id: string, el: React.ReactNode) => <Sequence key={id} from={S[id].from} durationInFrames={S[id].dur} name={id}>{el}</Sequence>;
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <Paper width={width} height={height} />
      {shot('fold', <Fold />)}
      {shot('throw', <Throw />)}
      {shot('soi', <Soi />)}
      {shot('catch', <Catch />)}
      {shot('read', <Read />)}
      {shot('reply', <Reply font={font} />)}
      <Paper width={width} height={height} grain={0.12} color="transparent" seed={23} />
      <MotifLayer keys={KEYS} width={width} height={height}>{(p, f) => <Plane p={p} f={f} font={font} />}</MotifLayer>
      <Audio src={staticFile(sb.music.file)} volume={0.55} />
      {SFX.map(([fr, name, v], i) => <Sequence key={i} from={fr} durationInFrames={60} layout="none"><Audio src={staticFile(`audio/paper-plane/${name}.wav`)} volume={v} /></Sequence>)}
    </AbsoluteFill>
  );
};
