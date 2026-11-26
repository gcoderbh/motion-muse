// Flat 2D cartoon explainer test: "what if life-time could be transferred like PromptPay". 1920x1080, SVG only.
// Tech: lib/flat (big-head FlatCharacter, looks, poses, expressions, reaction FX), lib/city (Bangkok street sets, HUD badges,
// transfer slip), lib/parallax (camera), lib/story (script.json → timeline: subtitles, mouth flaps, SFX, music), transitions.
// Run `story.py build <project> src/life-time/script.json` first (writes timeline.json + storyboard.json).
import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame } from 'remotion';
import { Timeline, Grain, Kind } from '../transitions';
import { FLAT_LOOKS, FlatCharacter, FlatPose, Sparkles, ShockLines, Sweat, flatIdle, flatPose, flatPosesAt, flatWalk, phoneProp } from '../lib/flat';
import { Bushes, Car, CityBackdrop, Motorbike, NoteCard, RoadSign, Rooftop, Skytrain, Street, TimeBadge, TrafficLight, TransferSlip } from '../lib/city';
import { Layer, Parallax, Stars } from '../lib/parallax';
import { blinkAt } from '../lib/characters';
import { Kinetic, useThaiFont } from '../lib/typography';
import { StoryTimeline, StoryAudio, Subtitles, mouthOf, lineAt } from '../lib/story';
import timeline from './timeline.json';
import script from './script.json';

const T = timeline as StoryTimeline;
const W = 1920, H = 1080, GROUND = 900, WIDE = 2600;
const TON = FLAT_LOOKS.office, RIDER = FLAT_LOOKS.rider, TYCOON = FLAT_LOOKS.tycoon;
const TD = 12; // every transition is 12 frames, so each shot starts 6 frames early
const ease = (f: number, a: number, b: number, from: number, to: number) =>
  interpolate(f, [a, b], [from, to], { easing: Easing.bezier(0.33, 0, 0.2, 1), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

type S = { f: number; abs: number; dur: number; font: string };
const sceneStart = (id: string) => T.scenes.find((s) => s.id === id)!.from;
const lineStart = (id: string) => T.lines.find((l) => l.id === id)!.from;
const talking = (who: string, abs: number) => lineAt(T, abs, who) !== undefined;
const face = (who: string, abs: number, seed: number) => ({ mouth: mouthOf(T, who, abs), blink: blinkAt(abs, seed) });
const popIn = (f: number, at: number, fps = 30) => spring({ frame: f - at, fps, config: { damping: 11, stiffness: 160 } });

const Street1: React.FC<{ f: number; carX?: number; light?: 'red' | 'green'; count?: number }> = ({ f, carX, light = 'red', count }) => (
  <>
    <Layer depth={6}><svg width={WIDE} height={H}><CityBackdrop w={WIDE} h={H} ground={GROUND - 110} /></svg></Layer>
    <Layer depth={3}><svg width={WIDE} height={H}><Skytrain w={WIDE} y={250} trainX={-900 + f * 9} /></svg></Layer>
    <Layer depth={1}><svg width={WIDE} height={H}>
      <Street w={WIDE} ground={GROUND} h={H} />
      {carX !== undefined && <Car x={carX} y={GROUND - 30} kind="taxi" color="#E2457A" t={f} />}
      <TrafficLight x={1640} y={GROUND} state={light} count={count} />
    </svg></Layer>
  </>
);

// 1. Title: push in over the street, headline pops word by word.
const Title: React.FC<S> = ({ f, font }) => {
  const z = ease(f, 0, 96, 1.0, 1.08);
  return (<>
    <Parallax cam={{ x: 240 + f * 0.8, y: 0, zoom: z }} background="#CFE6F5"><Street1 f={f} carX={-200 + f * 14} /></Parallax>
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(19,34,74,0.0) 0%, rgba(19,34,74,0.55) 100%)' }} />
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontFamily: font, textAlign: 'center', lineHeight: 1.35 }}>
      <Kinetic text="ถ้าพรุ่งนี้" delay={4} anim="pop" style={{ fontSize: 76, fontWeight: 700, color: '#FFFFFF', WebkitTextStroke: '10px #13224A', paintOrder: 'stroke fill' }} />
      <Kinetic text="“เวลาชีวิต”" by="grapheme" delay={14} anim="pop" style={{ fontSize: 190, fontWeight: 900, color: '#FFD23F', WebkitTextStroke: '16px #13224A', paintOrder: 'stroke fill', textShadow: '0 12px 0 #13224A' }} />
      <Kinetic text="โอนซื้อขายได้!" delay={30} anim="pop" style={{ fontSize: 96, fontWeight: 800, color: '#FFFFFF', background: '#E0403A', padding: '0 34px 10px', borderRadius: 20, transform: 'rotate(-2deg)' }} />
    </AbsoluteFill>
  </>);
};

// 2. Street: Ton at the red light, life-time badge over his head, checks the phone and panics.
const StreetScene: React.FC<S> = ({ f, abs, font }) => {
  const l2 = lineStart('street-2') - sceneStart('street');
  const panic = interpolate(f, [l2, l2 + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const p: FlatPose = flatPosesAt(f, [[0, flatPose('phone')], [l2 - 4, flatPose('phone')], [l2 + 6, flatPose('shocked')]]);
  const camX = ease(f, 0, 120, 180, 420), zoom = ease(f, l2 - 6, l2 + 10, 1.0, 1.12);
  return (<>
    <Parallax cam={{ x: camX, y: 0, zoom }} background="#CFE6F5">
      <Street1 f={f + 96} carX={2200 - f * 10} count={185 - f / 30} />
      <Layer depth={1}><svg width={WIDE} height={H}>
        <FlatCharacter x={1180} y={GROUND + 120} scale={2.1} look={TON} pose={flatIdle(p, abs, 1, talking('ton', abs) ? 1 : 0)} expr={panic > 0.5 ? 'shocked' : 'worried'} {...face('ton', abs, 1)} font={font}
          holdR={panic < 0.5 ? phoneProp() : undefined} />
        {panic > 0 && <Sweat x={1290} y={420} t={f - l2} size={1.6} />}
        {panic > 0 && <ShockLines x={1180} y={480} t={f - l2} r={210} />}
        <TimeBadge x={1180} y={270 + 4 * Math.sin(abs / 12)} text="48 ปี 121 วัน" family={font} pop={popIn(f, 20)} size={34} />
      </svg></Layer>
      <Layer depth={0.6} blur={3}><svg width={WIDE} height={H}><Bushes w={WIDE} y={H + 40} /></svg></Layer>
    </Parallax>
  </>);
};

// 3. Offer: the rider walks in next to his scooter, the price card pops, Ton reacts.
const Offer: React.FC<S> = ({ f, abs, font }) => {
  const l1 = lineStart('offer-1') - sceneStart('offer'), l2 = lineStart('offer-2') - sceneStart('offer');
  const walkEnd = Math.max(1, l1);
  const rx = ease(f, 0, walkEnd, 1950, 1420);
  const rp = f < walkEnd ? flatWalk(f / 18) : flatIdle(flatPosesAt(f, [[walkEnd, flatPose('rest')], [walkEnd + 10, flatPose('offer')], [l2, flatPose('offer')], [l2 + 10, flatPose('point', { shR: 70 })]]), abs, 4, talking('rider', abs) ? 1 : 0);
  const tp = flatPosesAt(f, [[0, flatPose('rest')], [l2 - 2, flatPose('rest')], [l2 + 6, flatPose('handsUp')], [l2 + 30, flatPose('shocked')]]);
  const shock = f >= l2;
  return (<>
    <Parallax cam={{ x: 420 + (shock ? 4 * Math.sin(f * 2.1) * Math.max(0, 1 - (f - l2) / 12) : 0), y: 0, zoom: shock ? ease(f, l2, l2 + 6, 1.0, 1.06) : 1 }} background="#CFE6F5">
      <Street1 f={f + 340} count={150 - f / 30} />
      <Layer depth={1}><svg width={WIDE} height={H}>
        <Motorbike x={1720} y={GROUND + 60} scale={1.5} dir={-1} />
        <FlatCharacter x={rx} y={GROUND + 120} scale={2.0} dir={-1} look={RIDER} pose={rp} expr={f > l1 ? 'happy' : 'neutral'} {...face('rider', abs, 4)} font={font} />
        <FlatCharacter x={840} y={GROUND + 120} scale={2.1} look={TON} pose={flatIdle(tp, abs, 1, talking('ton', abs) ? 1 : 0)} expr={shock ? 'shocked' : 'neutral'} {...face('ton', abs, 1)} font={font} gaze={[1, 0]} />
        <TimeBadge x={840} y={270 + 4 * Math.sin(abs / 12)} text="48 ปี 121 วัน" family={font} size={34} />
        {shock && <><Sweat x={950} y={430} t={f - l2} size={1.6} /><ShockLines x={840} y={480} t={f - l2} r={210} /></>}
        <NoteCard x={1420} y={150} title="ค่าวิน ไปออฟฟิศ" big="3 ชม.ชีวิต" family={font} pop={popIn(f, l1 + 48)} rot={4} />
      </svg></Layer>
      <Layer depth={0.6} blur={3}><svg width={WIDE} height={H}><Bushes w={WIDE} y={H + 40} seed={9} /></svg></Layer>
    </Parallax>
  </>);
};

// 4. Pay: close two-shot, Ton and the transfer slip; his badge drops by 3 hours.
const Pay: React.FC<S> = ({ f, abs, font }) => {
  const done = 54;
  const hours = f < done ? 9 : 6;
  const k = interpolate(f, [done, done + 8], [1.25, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (<>
    <AbsoluteFill style={{ background: 'radial-gradient(circle at 35% 45%, #E9F3FB 0%, #BFD9EE 70%)' }} />
    <svg width={W} height={H} style={{ position: 'absolute' }}>
      {Array.from({ length: 14 }, (_, i) => <rect key={i} x={-200 + ((i * 180 + f * 6) % 2400)} y={120 + (i % 5) * 180} width={120} height={6} rx={3} fill="#FFFFFF" opacity={0.5} />)}
      <FlatCharacter x={620} y={1500} scale={3.4} look={TON} pose={flatIdle(flatPose(f < done ? 'think' : 'facepalm'), abs, 1)} expr={f < done ? 'worried' : 'sad'} {...face('ton', abs, 1)} font={font} gaze={[1, 0.3]} />
      <TimeBadge x={620} y={150} text={`48 ปี 121 วัน ${hours} ชม.`} family={font} size={40} tone={f < done ? 'navy' : 'red'} pop={k} />
      {f >= done && <text x={880} y={230 - ease(f, done, done + 30, 0, 60)} fontSize={64} fontWeight={800} fill="#E0403A" opacity={ease(f, done + 20, done + 40, 1, 0)} fontFamily={font} stroke="#FFFFFF" strokeWidth={8} paintOrder="stroke">-3 ชม.</text>}
      <TransferSlip x={1400} y={560} t={f - 18} family={font} app="พร้อมเพย์ชีวิต" amount={3} unit="ชม." to="วิน เบอร์ 09" note="ค่ารถไปประชุม" scale={ease(f, 0, 14, 0.8, 1.02)} />
    </svg>
  </>);
};

// 5. Rich: night rooftop, the tycoon with 312 years.
const Rich: React.FC<S> = ({ f, abs, font }) => {
  const zoom = ease(f, 0, 190, 1.0, 1.1);
  return (<>
    <Parallax cam={{ x: 340, y: 0, zoom }} background="#0E1630">
      <Layer depth={8}><svg width={WIDE} height={H}><Stars w={WIDE} h={600} frame={abs} /></svg></Layer>
      <Layer depth={5}><svg width={WIDE} height={H}><CityBackdrop w={WIDE} h={H} ground={GROUND - 60} night /></svg></Layer>
      <Layer depth={1}><svg width={WIDE} height={H}>
        <Rooftop w={WIDE} ground={GROUND} h={H} />
        <FlatCharacter x={1300} y={GROUND + 120} scale={2.2} look={TYCOON} pose={flatIdle(flatPose(talking('tycoon', abs) ? 'present' : 'hipsL'), abs, 7, talking('tycoon', abs) ? 0.6 : 0)} expr="smug" {...face('tycoon', abs, 7)} font={font} />
        <TimeBadge x={1300} y={250 + 4 * Math.sin(abs / 12)} text="312 ปี 4 วัน" family={font} tone="gold" size={38} pop={popIn(f, 10)} />
        <Sparkles x={1300} y={250} t={f} color="#FFD27A" n={8} r={240} />
      </svg></Layer>
    </Parallax>
  </>);
};

// 6. End: question card, Ton and the rider either side.
const End: React.FC<S> = ({ f, abs, font }) => (<>
  <AbsoluteFill style={{ background: '#13224A' }} />
  <svg width={W} height={H} style={{ position: 'absolute' }}>
    {Array.from({ length: 24 }, (_, i) => <path key={i} d={`M960 540 L${960 + 1400 * Math.cos(i / 24 * Math.PI * 2 + f / 120)} ${540 + 1400 * Math.sin(i / 24 * Math.PI * 2 + f / 120)} L${960 + 1400 * Math.cos((i + 0.5) / 24 * Math.PI * 2 + f / 120)} ${540 + 1400 * Math.sin((i + 0.5) / 24 * Math.PI * 2 + f / 120)} Z`} fill="#1B2E60" />)}
    <FlatCharacter x={300} y={1180} scale={2.0} look={TON} pose={flatIdle(flatPose('think'), abs, 1)} expr="worried" blink={blinkAt(abs, 1)} font={font} gaze={[1, 0]} />
    <FlatCharacter x={1620} y={1180} scale={2.0} dir={-1} look={RIDER} pose={flatIdle(flatPose('shrug'), abs, 4)} expr="smug" blink={blinkAt(abs, 4)} font={font} />
  </svg>
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontFamily: font, textAlign: 'center', lineHeight: 1.35 }}>
    <Kinetic text="ถ้าเวลาซื้อขายได้จริง" delay={4} anim="rise" style={{ fontSize: 70, fontWeight: 700, color: '#FFFFFF' }} />
    <Kinetic text="คุณจะขายไหม?" delay={18} anim="pop" style={{ fontSize: 150, fontWeight: 900, color: '#FFD23F', WebkitTextStroke: '12px #0A1430', paintOrder: 'stroke fill' }} />
  </AbsoluteFill>
</>);

const SHOTS: Record<string, React.FC<S>> = { title: Title, street: StreetScene, offer: Offer, pay: Pay, rich: Rich, end: End };
const Shot: React.FC<{ id: string; start: number; dur: number; font: string; pre: number }> = ({ id, start, dur, font, pre }) => {
  const f = useCurrentFrame() - pre; const C = SHOTS[id];
  return <C f={f} abs={start + f} dur={dur} font={font} />;
};

export const LifeTime: React.FC<{ subs?: boolean }> = ({ subs = true }) => {
  const font = useThaiFont('Prompt');
  const outs = script.scenes.map((s) => (s as { out?: string }).out);
  return (
    <AbsoluteFill style={{ background: '#13224A' }}>
      <Timeline sfx={false} backdrop="#13224A" scenes={T.scenes.map((s, i) => ({
        dur: s.dur,
        el: <Shot id={s.id} start={s.from} dur={s.dur} font={font} pre={i && outs[i - 1] && outs[i - 1] !== 'cut' ? TD / 2 : 0} />,
        out: outs[i] && outs[i] !== 'cut' ? { kind: outs[i] as Kind, dur: TD } : undefined,
      }))} />
      <Grain opacity={0.03} />
      <Subtitles tl={T} family={font} show={subs} names={script.cast} bottom={48} size={46} />
      <StoryAudio tl={T} />
    </AbsoluteFill>
  );
};
