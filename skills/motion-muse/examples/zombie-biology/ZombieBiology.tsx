// Test video 1: stickman cartoon explaining zombie biology. 1080x1920, SVG only (no extra packages).
// Tech: lib/characters (Stickman + VectorCharacter), lib/pose (gaits, key poses), lib/diagram, lib/parallax, lib/typography (Mali).
import React from 'react';
import { AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Timeline } from '../transitions';
import { Grain } from '../transitions';
import { PALETTES, Stickman, VectorCharacter, blinkAt, pointer, skeleton, toScene } from '../lib/characters';
import { breathe, gait, pose, posesAt, prog, strideLength, talk } from '../lib/pose';
import { Arrow, Blob, Callout, Draw, Ecg, Flow, GridPaper, Virus, spline } from '../lib/diagram';
import { Layer, Parallax, Ridge } from '../lib/parallax';
import { Kinetic, MaskReveal, useThaiFont } from '../lib/typography';
import sb from './storyboard.json';

const W = 1080, H = 1920;
const INK = '#1A1A22', PAPER = '#FFF8EE', RED = '#FF5A36', GREEN = '#7BC950', YEL = '#FFD23F';
const dur = (id: string) => sb.scenes.find((s) => s.id === id)!.dur;
type P = [number, number];

const Paper: React.FC<{ children: React.ReactNode; pan?: number }> = ({ children, pan = 0 }) => (
  <AbsoluteFill style={{ background: PAPER }}>
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute' }}><GridPaper w={W} h={H} offset={[pan, 0]} /></svg>
    {children}
  </AbsoluteFill>
);
const Caption: React.FC<{ text: string; sub?: string; delay?: number; y?: number; color?: string }> = ({ text, sub, delay = 0, y = 210, color = INK }) => {
  const font = useThaiFont('Mali');
  return (
    <div style={{ position: 'absolute', top: y, width: '100%', textAlign: 'center', fontFamily: font, color }}>
      <Kinetic text={text} delay={delay} anim="pop" style={{ fontSize: 96, fontWeight: 700 }} />
      {sub && <MaskReveal delay={delay + 14} style={{ fontSize: 46, fontWeight: 400, marginTop: 6 }}>{sub}</MaskReveal>}
    </div>
  );
};

// 1. Hook: a human strolls in, a zombie shambles in, the human freezes.
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const leg = 70 * 1.9;
  const walkEnd = 52;
  const hx = 120 + Math.min(f, walkEnd) * (strideLength('walk', leg) / 26);
  const zx = 1120 - f * (strideLength('shamble', leg) / 40);
  const scared = f > walkEnd;
  const hp = scared ? posesAt(f, [[walkEnd, gait(walkEnd / 26, 'walk')], [walkEnd + 8, pose('scared')]]) : gait(f / 26, 'walk');
  const jump = scared ? -Math.max(0, Math.sin(((f - walkEnd) / 10) * Math.PI)) * 40 * (f - walkEnd < 10 ? 1 : 0) : 0;
  return (
    <Paper pan={f * 2}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute' }}>
        <line x1={0} y1={1420} x2={W} y2={1420} stroke={INK} strokeWidth={5} />
        <Stickman x={hx} y={1420 + jump} pose={breathe(hp, f)} scale={1.9} expression={scared ? 'scared' : 'happy'} blink={blinkAt(f)} mouth={scared ? 0.8 : 0} />
        <VectorCharacter x={zx} y={1420} dir={-1} pose={gait(f / 40, 'shamble')} scale={1.9} palette={PALETTES.zombie} hair="messy" torn expression="zombie" />
        {scared && <text x={hx + 10} y={1080} fontSize={110} fontFamily="Mali" fontWeight={700} fill={RED} textAnchor="middle" opacity={prog(f, walkEnd, walkEnd + 5)}>!</text>}
      </svg>
      <Caption text="ชีววิทยาซอมบี้" sub="ทำไมศพถึงลุกขึ้นมาเดินได้?" delay={6} />
    </Paper>
  );
};

// 2. Infection: viruses dock onto a cell and turn it green; a scientist explains with a pointer.
const Infection: React.FC = () => {
  const f = useCurrentFrame();
  const c: P = [560, 860];
  const infected = prog(f, 50, 95);
  const fill = `rgb(${255 - infected * 132},${215 - infected * 14},${194 - infected * 114})`;
  const docks = [0, 1, 2, 3, 4].map((i) => { const a = -2.4 + i * 0.95; return [c[0] + Math.cos(a) * 250, c[1] + Math.sin(a) * 250] as P; });
  return (
    <Paper>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute' }}>
        <Blob cx={c[0]} cy={c[1]} r={240} frame={f} fill={fill} stroke={INK} width={6}>
          <Blob cx={c[0] + 30} cy={c[1] + 10} r={70} frame={f} seed={5} fill={infected > 0.5 ? '#4E8A3A' : '#E7A88C'} stroke={INK} width={5} />
        </Blob>
        {docks.map((d, i) => {
          const t = prog(f, 8 + i * 6, 38 + i * 6);
          const start: P = [d[0] + (d[0] - c[0]) * 2.2, d[1] + (d[1] - c[1]) * 2.2];
          const x = start[0] + (d[0] - start[0]) * (1 - Math.pow(1 - t, 3)), y = start[1] + (d[1] - start[1]) * (1 - Math.pow(1 - t, 3));
          return <Virus key={i} cx={x} cy={y} r={34} frame={f} seed={i} color={GREEN} />;
        })}
        <Flow pts={[[c[0] - 150, c[1] - 60], [c[0] - 40, c[1] + 40], [c[0] + 120, c[1] - 20], [c[0] + 170, c[1] + 120]]} frame={f} progress={infected} color="#3E7D2A" r={7} />
        <Callout at={[c[0] + 170, c[1] - 170]} to={[640, 420]} align="end" text="ไวรัสยึดเซลล์" sub="สั่งให้สร้างไวรัสเพิ่ม" progress={prog(f, 40, 70)} font="Mali" size={44} />
        <Stickman x={190} y={1640} scale={1.55} pose={breathe(posesAt(f, [[0, pose('rest')], [20, pose('point', { shR: 125 })], [90, pose('point', { shR: 115 })]]), f)} hand={pointer(80)} expression="happy" mouth={f > 25 ? talk(f) : 0} blink={blinkAt(f, 2)} />
        <text x={540} y={1760} textAnchor="middle" fontFamily="Mali" fontSize={40} fill={INK} opacity={prog(f, 60, 75)}>ไวรัสสมมุติ: Z-virus</text>
      </svg>
    </Paper>
  );
};

// 3. Brain: the thinking part switches off, the brainstem stays on and drives the body.
const Brain: React.FC = () => {
  const f = useCurrentFrame();
  const draw = prog(f, 0, 40);
  const off = prog(f, 45, 70), on = prog(f, 70, 95);
  const brain = spline([[300, 900], [330, 700], [480, 600], [680, 610], [820, 700], [850, 880], [760, 1000], [560, 1010], [400, 990]], true);
  const folds = ['M420 700 Q470 760 430 820', 'M540 650 Q590 720 540 800', 'M660 680 Q700 760 650 840', 'M760 760 Q720 830 770 900', 'M480 880 Q560 930 640 890'];
  const front = spline([[300, 900], [330, 700], [470, 610], [520, 720], [470, 880]], true);
  return (
    <Paper>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute' }}>
        <path d={front} fill={`rgba(140,140,150,${off * 0.55})`} />
        <Draw d={brain} progress={draw} stroke={INK} width={7} fill="#FFC9C9" fillProgress={prog(f, 25, 45)} />
        {folds.map((d, i) => <Draw key={i} d={d} progress={prog(f, 15 + i * 4, 40 + i * 4)} stroke={INK} width={5} />)}
        <path d="M600 990 Q610 1080 590 1180 L560 1420" fill="none" stroke={INK} strokeWidth={20} strokeLinecap="round" />
        <path d="M600 990 Q610 1080 590 1180 L560 1420" fill="none" stroke={RED} strokeWidth={12} strokeLinecap="round" opacity={on} style={{ filter: `drop-shadow(0 0 ${12 * on}px ${RED})` }} />
        <Flow pts={[[600, 990], [606, 1080], [590, 1180], [560, 1420]]} frame={f} progress={on} color={YEL} r={9} count={10} speed={0.02} />
        <Callout at={[390, 760]} to={[200, 470]} text="สมองส่วนหน้า: ปิด" sub="ไม่คิด ไม่กลัว ไม่ยั้ง" progress={off * 1.1} font="Mali" size={42} color="#5A5A66" align="start" />
        <Callout at={[596, 1100]} to={[700, 1300]} text="ก้านสมอง: เปิด" sub="เดิน • กัด • หิว" progress={on * 1.1} font="Mali" size={42} color={RED} />
      </svg>
      <Caption text="สมองครึ่งเดียว" delay={2} y={1560} />
    </Paper>
  );
};

// 4. Body: callouts on a zombie, the heart trace goes flat.
const Body: React.FC = () => {
  const f = useCurrentFrame();
  const zp = breathe(gait(f / 60, 'shamble', { hipL: 4, hipR: -4, knL: 6, knR: 6 }), f, 2);
  const zx = 640, zy = 1500, sc = 3.2;
  const s = skeleton(zp);
  const heart = toScene(s.chest, zx, zy, sc);
  const knee = toScene(s.kneeR, zx, zy, sc);
  const head = toScene(s.head, zx, zy, sc);
  return (
    <Paper>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute' }}>
        <VectorCharacter x={zx} y={zy} pose={zp} scale={sc} palette={PALETTES.zombie} hair="messy" torn expression="zombie" blink={0} />
        <Callout at={heart} to={[60, 600]} text="หัวใจแทบไม่เต้น" progress={prog(f, 8, 30)} font="Mali" size={44} color={RED} align="start" />
        <Ecg x={70} y={430} w={420} h={80} frame={f} rate={1} flat={prog(f, 40, 80)} progress={prog(f, 12, 60)} color={RED} />
        <Callout at={knee} to={[700, 1350]} text="กล้ามเนื้อเน่า" sub="ก้าวสั้น ลากขา" progress={prog(f, 35, 60)} font="Mali" size={38} align="start" />
        <Callout at={head} to={[860, 330]} text="ตาขุ่น" sub="มองเห็นแค่การเคลื่อนไหว" progress={prog(f, 60, 85)} font="Mali" size={44} align="end" />
      </svg>
    </Paper>
  );
};

// 5. Race: 2.5D parallax track, the human outruns the zombie.
const Race: React.FC = () => {
  const f = useCurrentFrame();
  const leg = 70 * 1.5;
  const hv = strideLength('run', leg) / 16, zv = strideLength('shamble', leg) / 40;
  const cam = f * (0.55 * hv + 0.45 * zv); // camera tracks between them so both stay in frame
  const human = 600 + f * hv - cam;
  const zombie = 470 + f * zv - cam;
  return (
    <AbsoluteFill>
      <Parallax cam={{ x: cam, y: 0, zoom: 1 }} background="#BEE3F8">
        <Layer depth={8}><Ridge w={W * 3} h={H} base={1150} amp={260} seed={2} color="#9CC7DA" /></Layer>
        <Layer depth={3}><Ridge w={W * 4} h={H} base={1290} amp={160} seed={5} freq={0.006} color="#7FB069" /></Layer>
        <Layer depth={1}><div style={{ position: 'absolute', left: -400, right: -9000, top: 1420, bottom: -400, background: '#E9D8A6', borderTop: `6px solid ${INK}` }} /></Layer>
      </Parallax>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute' }}>
        <Stickman x={human} y={1420} scale={1.5} pose={gait(f / 16, 'run')} expression="scared" mouth={0.6} />
        <VectorCharacter x={zombie} y={1420} scale={1.5} pose={gait(f / 40, 'shamble')} palette={PALETTES.zombie} hair="messy" torn expression="zombie" />
        <Arrow from={[human - 60, 1180]} to={[human + 140, 1180]} progress={prog(f, 10, 30)} color={INK} bend={0} />
      </svg>
      <div style={{ position: 'absolute', top: 260, width: '100%', textAlign: 'center', fontFamily: 'Mali', color: INK }}>
        <Kinetic text="คนวิ่ง ~20 กม./ชม." delay={8} anim="rise" style={{ fontSize: 72, fontWeight: 700 }} /><br />
        <Kinetic text="ซอมบี้ลากขา ~3 กม./ชม." delay={30} anim="rise" style={{ fontSize: 60, color: '#4E8A3A', fontWeight: 600 }} />
      </div>
    </AbsoluteFill>
  );
};

// 6. End: the moral + a bounce-in card.
const End: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f - 6, fps, config: { damping: 11 } });
  return (
    <Paper>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute' }}>
        <line x1={0} y1={1500} x2={W} y2={1500} stroke={INK} strokeWidth={5} />
        <Stickman x={300 + f * 9} y={1500} scale={1.7} pose={gait(f / 16, 'run')} expression="happy" />
        <VectorCharacter x={20 + f * 4} y={1500} scale={1.7} pose={gait(f / 40, 'shamble')} palette={PALETTES.zombie} hair="messy" torn expression="zombie" />
      </svg>
      <div style={{ position: 'absolute', top: 600, left: 90, right: 90, padding: '50px 40px', background: YEL, border: `6px solid ${INK}`, borderRadius: 40, textAlign: 'center', fontFamily: 'Mali', transform: `scale(${pop}) rotate(${(1 - pop) * -8}deg)`, boxShadow: `14px 14px 0 ${INK}` }}>
        <div style={{ fontSize: 100, fontWeight: 700, lineHeight: 1.3 }}>สรุปคือ… วิ่ง!</div>
        <div style={{ fontSize: 44, lineHeight: 1.35 }}>ซอมบี้เร็วสู้คุณไม่ได้</div>
      </div>
    </Paper>
  );
};

export const ZOMBIE_TOTAL = sb.scenes.reduce((a, s) => a + s.dur, 0);

export const ZombieBiology: React.FC = () => {
  useThaiFont('Mali');
  return (
    <AbsoluteFill>
      <Timeline backdrop={PAPER} scenes={[
        { dur: dur('hook'), el: <Hook />, out: { kind: 'zoom' } },
        { dur: dur('infection'), el: <Infection />, out: { kind: 'wipe', color: GREEN } },
        { dur: dur('brain'), el: <Brain />, out: { kind: 'iris' } },
        { dur: dur('body'), el: <Body />, out: { kind: 'whip', dir: 1 } },
        { dur: dur('race'), el: <Race />, out: { kind: 'smash' } },
        { dur: dur('end'), el: <End /> },
      ]} />
      <Grain opacity={0.05} />
      <Audio src={staticFile('audio/zombie.mp3')} volume={(fr) => 0.55 * interpolate(fr, [0, 6, ZOMBIE_TOTAL - 30, ZOMBIE_TOTAL], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
    </AbsoluteFill>
  );
};
