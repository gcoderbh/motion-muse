// Test video 3: minimalist luxury product ad with Thai sans-serif typography. 1080x1920.
// Tech: @remotion/three + lib/three (Lathe, StudioLights, RoomEnv) for the hero object, CSS for type and haze.
// Fictional brand; no product claims beyond mood copy.
import React from 'react';
import { AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Grain, Timeline } from '../transitions';
import { CameraRig, Lathe, RoomEnv, Stage3D, StudioLights } from '../lib/three';
import { LightSweep, Particles } from '../lib/atmosphere';
import { prog } from '../lib/pose';
import { Kinetic, MaskReveal, Tracking, useThaiFont } from '../lib/typography';
import sb from './storyboard.json';

const dur = (id: string) => sb.scenes.find((s) => s.id === id)!.dur;
const IVORY = '#EFE9E1', INK = '#1C1A17', GOLD = '#C8A46A';
const GLASS: [number, number][] = [[0, 0], [0.4, 0], [0.44, 0.03], [0.46, 0.12], [0.46, 1.02], [0.43, 1.12], [0.3, 1.2], [0.17, 1.24], [0.15, 1.36], [0, 1.36]];
const LIQUID: [number, number][] = [[0, 0.06], [0.41, 0.06], [0.42, 0.12], [0.42, 0.86], [0, 0.86]];
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const font = "'IBM Plex Sans Thai', sans-serif";

const Bottle: React.FC<{ y?: number; rot?: number; tilt?: number }> = ({ y = 0, rot = 0, tilt = 0 }) => (
  <group position={[0, y, 0]} rotation={[tilt, rot, tilt * 0.4]}>
    <Lathe profile={LIQUID}><meshStandardMaterial color="#C98A3E" roughness={0.15} metalness={0.1} emissive="#5A3310" emissiveIntensity={0.25} /></Lathe>
    <Lathe profile={GLASS}><meshStandardMaterial color="#F6F1EA" roughness={0.04} metalness={0.15} transparent opacity={0.26} envMapIntensity={2.4} /></Lathe>
    <mesh position={[0, 1.36 + 0.26, 0]} castShadow><cylinderGeometry args={[0.2, 0.2, 0.52, 64]} /><meshStandardMaterial color={GOLD} metalness={1} roughness={0.22} /></mesh>
    <mesh position={[0, 1.36 + 0.53, 0]}><cylinderGeometry args={[0.2, 0.2, 0.02, 64]} /><meshStandardMaterial color="#E9D3A2" metalness={1} roughness={0.12} /></mesh>
    <mesh position={[0, 0.95, 0]}><cylinderGeometry args={[0.463, 0.463, 0.035, 96, 1, true]} /><meshStandardMaterial color={GOLD} metalness={1} roughness={0.25} side={2} /></mesh>
  </group>
);

const Floor: React.FC<{ color?: string }> = ({ color = IVORY }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[40, 40]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>
);

const Type: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ position: 'absolute', width: '100%', textAlign: 'center', fontFamily: font, color: INK, ...style }}>{children}</div>
);

// 1. Out of darkness.
const Reveal: React.FC = () => {
  const f = useCurrentFrame();
  const light = ease(prog(f, 0, 70));
  const z = interpolate(f, [0, 114], [9.6, 8]);
  return (
    <AbsoluteFill>
      <Stage3D background={IVORY} fog={[IVORY, 6, 16]} exposure={0.25 + light * 0.85}>
        <RoomEnv intensity={0.6 * light} />
        <CameraRig position={[0, 0.7, z]} target={[0, 0.95, 0]} fov={30} />
        <StudioLights key_={10 + light * 50} rim={70} fill={1 + light * 5} sweep={-0.4 + light * 0.4} />
        <Bottle rot={f * 0.006} />
        <Floor />
      </Stage3D>
      <AbsoluteFill style={{ background: '#0E0D0C', opacity: 1 - light, pointerEvents: 'none' }} />
      <Type style={{ top: 260 }}><Tracking text="ALUNA" delay={40} dur={55} from={1.2} to={0.5} style={{ fontSize: 92, fontWeight: 200 }} /></Type>
      <Type style={{ top: 1560 }}><MaskReveal delay={66} dur={24} style={{ fontSize: 46, fontWeight: 200, letterSpacing: '0.12em' }}>กลิ่นของแสงแรก</MaskReveal></Type>
    </AbsoluteFill>
  );
};

// 2. Macro orbit on the cap.
const Detail: React.FC = () => {
  const f = useCurrentFrame();
  const a = interpolate(f, [0, 108], [-0.9, 0.7]);
  const r = interpolate(f, [0, 108], [2.9, 2.4]);
  return (
    <AbsoluteFill>
      <Stage3D background="#E6DED3" fog={['#E6DED3', 3, 9]} exposure={1.1}>
        <RoomEnv intensity={0.9} />
        <CameraRig position={[Math.sin(a) * r, 1.62 + Math.sin(f / 40) * 0.05, Math.cos(a) * r]} target={[0, 1.3, 0]} fov={28} />
        <StudioLights key_={55} rim={90} fill={4} sweep={Math.sin(f / 30)} />
        <Bottle />
        <Floor color="#E6DED3" />
      </Stage3D>
      <LightSweep progress={prog(f, 20, 80)} angle={24} width={10} intensity={0.35} />
      <Type style={{ bottom: 300 }}>
        <div style={{ fontSize: 28, letterSpacing: '0.4em', fontWeight: 300, color: '#8C7A62', opacity: prog(f, 10, 30) }}>DETAIL</div>
        <Kinetic text="ทุกรายละเอียด ขัดเกลาด้วยมือ" by="word" anim="blur" delay={18} stagger={6} style={{ fontSize: 50, fontWeight: 200 }} />
      </Type>
    </AbsoluteFill>
  );
};

// 3. Floating in warm haze.
const Float: React.FC = () => {
  const f = useCurrentFrame();
  const y = 0.25 + Math.sin(f / 26) * 0.08;
  return (
    <AbsoluteFill>
      <Stage3D background="#E9D9C2" fog={['#E9D9C2', 4, 11]} exposure={1.05} shadows={false}>
        <RoomEnv intensity={0.8} />
        <CameraRig position={[Math.sin(f / 90) * 0.8, 1.0, 8.2 - f * 0.006]} target={[0, 1.0, 0]} fov={30} />
        <StudioLights key_={45} rim={80} fill={5} warm="#FFDDB0" />
        <Bottle y={y} rot={f * 0.012} tilt={Math.sin(f / 34) * 0.12} />
      </Stage3D>
      <AbsoluteFill style={{ background: 'radial-gradient(circle at 50% 42%, rgba(255,240,215,0.45) 0%, transparent 55%)', mixBlendMode: 'screen' }} />
      <Particles kind="bokeh" frame={f} count={26} seed={21} w={1080} h={1920} opacity={0.9} />
      <Particles kind="dust" frame={f} count={50} seed={5} w={1080} h={1920} opacity={0.7} />
      <Type style={{ top: 1430 }}><Kinetic text="หอมละมุน" by="grapheme" anim="fade" delay={14} stagger={3} style={{ fontSize: 84, fontWeight: 200, letterSpacing: '0.08em' }} /></Type>
      <Type style={{ top: 1560 }}><MaskReveal delay={44} style={{ fontSize: 44, fontWeight: 300, color: '#6E5A42' }}>อยู่กับคุณยาวนาน</MaskReveal></Type>
    </AbsoluteFill>
  );
};

// 4. Packshot on a plinth.
const Packshot: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = spring({ frame: f - 4, fps, config: { damping: 18, stiffness: 70, mass: 1.2 } });
  const camT = ease(prog(f, 0, 90));
  return (
    <AbsoluteFill>
      <Stage3D background={IVORY} fog={[IVORY, 7, 18]} exposure={1.05}>
        <RoomEnv intensity={0.7} />
        <CameraRig position={[interpolate(camT, [0, 1], [1.2, 0]), interpolate(camT, [0, 1], [1.6, 0.95]), interpolate(camT, [0, 1], [8.6, 10])]} target={[0, 1.0, 0]} fov={30} />
        <StudioLights key_={50} rim={60} fill={5} />
        <group position={[0, 0.15, 0]}>
          <mesh position={[0, 0, 0]} castShadow receiveShadow><cylinderGeometry args={[0.95, 0.95, 0.3, 96]} /><meshStandardMaterial color="#D8CFC2" roughness={0.75} /></mesh>
          <Bottle y={0.15 + (1 - drop) * 1.2} rot={0.4 + f * 0.003} />
        </group>
        <Floor />
      </Stage3D>
      <LightSweep progress={prog(f, 60, 110)} angle={18} width={8} intensity={0.3} />
      <Type style={{ top: 250 }}><Tracking text="ALUNA" delay={30} dur={50} from={1} to={0.5} style={{ fontSize: 110, fontWeight: 200 }} /></Type>
      <Type style={{ top: 400 }}><MaskReveal delay={52} style={{ fontSize: 30, letterSpacing: '0.45em', fontWeight: 300, color: '#8C7A62' }}>EAU DE PARFUM</MaskReveal></Type>
      <Type style={{ top: 1520 }}><MaskReveal delay={80} style={{ fontSize: 48, fontWeight: 300 }}>เปิดตัว 1 ธันวาคม</MaskReveal></Type>
      <div style={{ position: 'absolute', left: '50%', top: 1640, width: interpolate(prog(f, 95, 125), [0, 1], [0, 260]), height: 1, background: INK, transform: 'translateX(-50%)' }} />
      <Type style={{ top: 1665 }}><span style={{ fontSize: 28, fontWeight: 300, letterSpacing: '0.3em', opacity: prog(f, 110, 130) }}>aluna.co</span></Type>
    </AbsoluteFill>
  );
};

export const LUXURY_TOTAL = sb.scenes.reduce((a, s) => a + s.dur, 0);
export const LuxuryProduct: React.FC = () => {
  useThaiFont('IBM Plex Sans Thai');
  return (
    <AbsoluteFill style={{ background: IVORY }}>
      <Timeline backdrop={IVORY} scenes={[
        { dur: dur('reveal'), el: <Reveal />, out: { kind: 'focus' } },
        { dur: dur('detail'), el: <Detail />, out: { kind: 'leak', colors: ['#FFE2B8', '#FFF4E2'] } },
        { dur: dur('float'), el: <Float />, out: { kind: 'push', dir: -1 } },
        { dur: dur('packshot'), el: <Packshot /> },
      ]} />
      <Grain opacity={0.035} />
      <Audio src={staticFile('audio/luxury.mp3')} volume={(fr) => 0.6 * interpolate(fr, [0, 24, LUXURY_TOTAL - 40, LUXURY_TOTAL], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
    </AbsoluteFill>
  );
};
