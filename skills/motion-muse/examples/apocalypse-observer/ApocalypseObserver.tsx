// Test video 2: stylized 3D apocalyptic psychological horror with a third-person observer camera. 1920x1080.
// Tech: @remotion/three + lib/three (RuinedCity, Figure, observer, CameraRig) + lib/atmosphere overlays + Noto Serif Thai.
// Every movement is computed from the frame number; render with --gl=swangle on CPU-only machines.
import React from 'react';
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Grain, Timeline } from '../transitions';
import { CameraRig, Figure, RuinedCity, Stage3D, observer } from '../lib/three';
import { Fog, Letterbox, Particles, Scanlines, Vignette } from '../lib/atmosphere';
import { breathe, gait, mixPose, pose, prog } from '../lib/pose';
import { flicker, noise1 } from '../lib/noise';
import { MaskReveal, Tracking, useThaiFont } from '../lib/typography';
import sb from './storyboard.json';

type V3 = [number, number, number];
const dur = (id: string) => sb.scenes.find((s) => s.id === id)!.dur;
const FOG = '#26323A'; // fog lighter than the figures so silhouettes read
const LEG = 0.95, CYCLE = 34;
const V = (2 * LEG * Math.sin((26 * Math.PI) / 180) * 1.6) / CYCLE; // walk speed (world units / frame), matches the gait stride
const X = 0.5;
const zAt = (f: number) => 2 + Math.max(0, f) * V;
const END_A = dur('approach');
const STOP = END_A + 22; // survivor stops 22 frames into scene 2
const zStop = zAt(STOP);
const WATCHER: V3 = [-0.8, 0, zStop + 15];

const World: React.FC<{ windowLight: number; red?: number; children?: React.ReactNode }> = ({ windowLight, red = 0, children }) => (
  <>
    <ambientLight intensity={0.45} color="#8FB0C0" />
    <directionalLight position={[-8, 14, -6]} intensity={0.9} color="#9FC3D6" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={30} shadow-camera-bottom={-30} />
    <pointLight position={[3.2, 2.6, zStop + 17]} intensity={windowLight * 30} distance={18} color="#FFB566" />
    <mesh position={[3.9, 2.6, zStop + 17]}><boxGeometry args={[0.05, 0.9, 0.7]} /><meshBasicMaterial color={windowLight > 0.2 ? '#FFC27A' : '#22262A'} /></mesh>
    {red > 0 && <pointLight position={[0.5, 2.5, zStop - 16]} intensity={red * 80} distance={22} color="#FF2A1A" />}
    <RuinedCity seed={7} length={70} street={4.2} color="#2B3036" lit={0.02} />
    {[...Array(9)].map((_, i) => <mesh key={i} position={[(i % 2 ? 1 : -1) * (1.5 + (i * 0.37) % 1.8), 0.12, 6 + i * 3.7]} rotation={[0, i, 0.2]} castShadow><boxGeometry args={[0.5 + (i % 3) * 0.3, 0.25, 0.4]} /><meshStandardMaterial color="#3A3D42" roughness={1} /></mesh>)}
    {children}
  </>
);

const survivorPose = (f: number) => {
  const walk = gait(f / CYCLE, 'walk', { head: -4 });
  if (f < STOP) return walk;
  const t = prog(f, STOP, STOP + 14);
  return breathe(mixPose(gait(STOP / CYCLE, 'walk'), pose('rest', { head: 4 + noise1(f / 40, 3) * 6, shL: 12, shR: -12 }), t), f, 3);
};
const survivorZ = (f: number) => zAt(Math.min(f, STOP + 6));
const Survivor: React.FC<{ f: number }> = ({ f }) => <Figure pose={survivorPose(f)} position={[X, 0, survivorZ(f)]} color="#4A4F45" skin="#B9A392" />;

const Overlays: React.FC<{ f: number; ash?: number; fog?: number }> = ({ f, ash = 1, fog = 0.22 }) => (
  <>
    <Fog frame={f} color="#9DB4BE" density={fog} speed={0.6} />
    <Particles kind="ash" frame={f} count={90} seed={4} w={1920} h={1080} opacity={0.7 * ash} />
    <Vignette strength={0.75} />
  </>
);
const Title: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ position: 'absolute', fontFamily: "'Noto Serif Thai', serif", color: '#E8E2D6', textShadow: '0 0 30px rgba(0,0,0,0.8)', ...style }}>{children}</div>
);

// 1. Observer camera follows the survivor down the street.
const Approach: React.FC = () => {
  const f = useCurrentFrame();
  const cam = observer(f, (k) => [X, 0, survivorZ(k)], () => 0.0, { back: interpolate(f, [0, 150], [6.5, 3.2]), height: interpolate(f, [0, 150], [2.6, 1.8]), side: 0.9, lag: 14, lookAhead: 4 });
  return (
    <AbsoluteFill>
      <Stage3D background={FOG} fog={[FOG, 3, 24]} exposure={1.1}><CameraRig position={cam.position} target={cam.target} shake={0.05} fov={42} /><World windowLight={0.9 * flicker(f, 2, 0.15)} /><Survivor f={f} /></Stage3D>
      <Overlays f={f} />
      <Title style={{ left: 150, bottom: 170 }}><Tracking text="วันที่ 41" delay={24} dur={50} style={{ fontSize: 64, fontWeight: 300 }} /></Title>
      <Title style={{ left: 152, bottom: 130, opacity: prog(f, 60, 90) * (1 - prog(f, 130, 148)) }}><span style={{ fontSize: 30, fontWeight: 200, letterSpacing: '0.2em' }}>ไม่มีเสียงอะไรเลย</span></Title>
    </AbsoluteFill>
  );
};

// 2. Survivor stops; the camera orbits low while a distant window flickers.
const Stop: React.FC = () => {
  const l = useCurrentFrame(); const f = END_A + l;
  const a = interpolate(l, [0, dur('stop')], [0.15, 1.15]) ;
  const h = interpolate(l, [0, dur('stop')], [1.8, 0.75]);
  const z = survivorZ(f), r = 3.4;
  return (
    <AbsoluteFill>
      <Stage3D background={FOG} fog={[FOG, 3, 24]} exposure={1.1}><CameraRig position={[X - Math.sin(a) * r, h, z - Math.cos(a) * r]} target={[X + Math.sin(a) * 1.5, 1.2, z + 3]} shake={0.03} fov={40} /><World windowLight={flicker(f, 2, 0.45, 9)} /><Survivor f={f} /></Stage3D>
      <Overlays f={f} />
    </AbsoluteFill>
  );
};

// 3. Push past the survivor: a still figure at the end of the street, it twitches, the light dies.
const Watcher: React.FC = () => {
  const l = useCurrentFrame(); const f = END_A + dur('stop') + l;
  const t = prog(l, 0, dur('figure'));
  const e = t * t * (3 - 2 * t);
  const z = survivorZ(f);
  const camZ = z - 2.4 + e * 4.5;
  const fov = interpolate(e, [0, 1], [44, 26]); // push-in + narrowing lens = vertigo-like pull
  const twitch = [44, 46, 63, 64, 65].includes(l) ? 25 : 0;
  const lightOff = l > 78 ? 0 : flicker(f, 5, 0.6, 12);
  return (
    <AbsoluteFill>
      <Stage3D background={FOG} fog={[FOG, 3, 24]} exposure={1.05}>
        <CameraRig position={[X + 0.55 - e * 0.5, 1.6 - e * 0.15, camZ]} target={[WATCHER[0], 1.25, WATCHER[2]]} shake={0.02 + e * 0.04} fov={fov} />
        <World windowLight={lightOff} />
        <Survivor f={f} />
        <Figure pose={pose('rest', { head: -12 + twitch, lean: 4, shL: 4, shR: -4 })} position={WATCHER} yaw={Math.PI} color="#08090B" skin="#101214" />
      </Stage3D>
      <Overlays f={f} fog={0.26} />
      {l > 78 && l < 84 && <AbsoluteFill style={{ background: '#000', opacity: 0.6 }} />}
      <Title style={{ width: '100%', bottom: 160, textAlign: 'center' }}><MaskReveal delay={20} dur={26} style={{ fontSize: 56, fontWeight: 300, letterSpacing: '0.06em' }}>มันไม่ได้ตามเรามา</MaskReveal></Title>
    </AbsoluteFill>
  );
};

// 4. Whip-pan 180°: the observers were behind us all along.
const Turn: React.FC = () => {
  const l = useCurrentFrame(); const f = END_A + dur('stop') + dur('figure') + l;
  const z = survivorZ(f);
  const yaw = interpolate(l, [6, 16], [0, Math.PI], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ease = (1 - Math.cos(yaw)) / 2;
  const pos: V3 = [X + 0.9 * Math.cos(yaw), 1.7, z + 1.2 - 2.4 * ease];
  const tgt: V3 = [X + Math.sin(yaw) * 0.6, 1.3, pos[2] + Math.cos(yaw) * 5];
  const red = l > 14 ? 0.6 + 0.4 * Math.abs(Math.sin(l / 5)) : 0;
  const crowd: V3[] = [[-0.4, 0, z - 6.5], [1.7, 0, z - 8], [0.6, 0, z - 10], [-2.0, 0, z - 10.8], [2.8, 0, z - 12]];
  const titleOn = l > 52;
  return (
    <AbsoluteFill>
      <Stage3D background={FOG} fog={[FOG, 3, 20]} exposure={1}>
        <CameraRig position={pos} target={tgt} shake={l > 14 ? 0.09 : 0.03} roll={(l > 6 && l < 18 ? Math.sin(((l - 6) / 12) * Math.PI) * 0.12 : 0)} fov={38} />
        <World windowLight={0} red={red} />
        <Survivor f={f} />
        {crowd.map((p, i) => <Figure key={i} pose={pose('zombie', { head: -10 + (((l + i * 7) % 23) < 2 ? 18 : 0), lean: 8 })} position={[p[0], 0, p[2] + Math.min(l, 60) * 0.012 * (i + 1)]} color="#07080A" skin="#0D0F11" emissive="#000" />)}
      </Stage3D>
      <Overlays f={f} fog={0.3} ash={1.3} />
      <Scanlines frame={f} opacity={l > 14 && l < 30 ? 0.35 : 0.08} />
      {titleOn && <AbsoluteFill style={{ background: `rgba(0,0,0,${prog(l, 52, 66) * 0.55})` }} />}
      <Title style={{ width: '100%', top: 380, textAlign: 'center' }}><MaskReveal delay={22} dur={20} style={{ fontSize: 54, fontWeight: 300 }}>มันอยู่ข้างหลังเรามาตลอด</MaskReveal></Title>
      {titleOn && <Title style={{ width: '100%', top: 480, textAlign: 'center' }}><Tracking text="เมืองที่เงียบเกินไป" delay={58} dur={40} from={0.9} to={0.18} style={{ fontSize: 92, fontWeight: 600, color: '#F2E9DC' }} /></Title>}
    </AbsoluteFill>
  );
};

export const HORROR_TOTAL = sb.scenes.reduce((a, s) => a + s.dur, 0);
export const ApocalypseObserver: React.FC = () => {
  useThaiFont('Noto Serif Thai');
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Timeline backdrop="#000" scenes={[
        { dur: dur('approach'), el: <Approach />, out: { kind: 'cut' } },
        { dur: dur('stop'), el: <Stop />, out: { kind: 'glitch' } },
        { dur: dur('figure'), el: <Watcher />, out: { kind: 'smash', color: '#000' } },
        { dur: dur('turn'), el: <Turn /> },
      ]} />
      <Letterbox amount={0.1} />
      <Grain opacity={0.09} />
      <Audio src={staticFile('audio/horror.mp3')} volume={(fr) => 0.8 * interpolate(fr, [0, 20, HORROR_TOTAL - 25, HORROR_TOTAL], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
    </AbsoluteFill>
  );
};
