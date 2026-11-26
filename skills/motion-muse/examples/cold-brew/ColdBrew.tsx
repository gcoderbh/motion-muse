// Product-kit + multi-format example: a cold-brew can with a Thai label wrapped at the true 2πR/H ratio, a dawn key
// light that swings and warms (KeyLight + kelvin), a window-blind gobo, AgX tone mapping, ice cubes on closed-form
// physics (bounce + pulse), and text placed from useFormat().safe so 9:16, 1:1 and 16:9 all render from one file.
import React from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { Grain, Timeline } from '../transitions';
import { CameraRig, KeyLight, LabelWrap, Lathe, MAT, RoomEnv, Stage3D, labelSize, useBlindsGobo, useCanvasTexture } from '../lib/three';
import { bounce, pulse, settle } from '../lib/physics';
import { useFormat } from '../lib/layout';
import { SafeGuides } from '../lib/SafeGuides';
import { prog } from '../lib/pose';
import { useThaiFontReady } from '../lib/typography';
import sb from './storyboard.json';

const dur = (id: string) => sb.scenes.find((s) => s.id === id)!.dur;
export const COLDBREW_TOTAL = sb.scenes.reduce((a, s) => a + s.dur, 0);
const CREAM = '#EFE6D8', BROWN = '#3B2416', COPPER = '#C8874A', MILK = '#FFF7EA';
const R = 0.33, LABEL_H = 0.86, LABEL_Y = 0.6;
// slim 250 ml can: domed base, straight wall, necked shoulder, rolled rim
const CAN: [number, number][] = [[0, 0.05], [0.24, 0.02], [0.3, 0], [0.33, 0.04], [0.33, 1.08], [0.3, 1.18], [0.27, 1.23], [0.275, 1.25], [0.26, 1.26], [0, 1.25]];

const Label: React.FC = () => {
  const { family, ok } = useThaiFontReady('Anuphan');
  const { w, h } = labelSize(R, LABEL_H, 1024);
  const map = useCanvasTexture(w, h, (c) => {
    c.fillStyle = BROWN; c.fillRect(0, 0, w, h);
    c.fillStyle = COPPER; c.fillRect(0, h * 0.08, w, 6); c.fillRect(0, h * 0.92 - 6, w, 6);
    c.textAlign = 'center'; c.fillStyle = MILK;
    c.font = `700 ${h * 0.25}px ${family}`; c.fillText('ตื่นก่อน', w / 2, h * 0.5);
    c.font = `400 ${h * 0.07}px ${family}`; c.fillText('โคลด์บรูว์ · กาแฟสกัดเย็น', w / 2, h * 0.66);
    c.fillStyle = COPPER; c.font = `500 ${h * 0.055}px ${family}`; c.fillText('COLD BREW  250 ml', w / 2, h * 0.8);
  }, [ok, family]);
  const rough = useCanvasTexture(256, 256, (c) => { c.fillStyle = '#d0d0d0'; c.fillRect(0, 0, 256, 256); c.fillStyle = '#555'; c.fillRect(0, 80, 256, 70); }, [], false);
  return <LabelWrap radius={R} height={LABEL_H} y={LABEL_Y} map={map} roughnessMap={rough} roughness={1} metalness={0.15} />;
};

const Can: React.FC<{ rot: number; x?: number }> = ({ rot, x = 0 }) => (
  <group position={[x, 0, 0]} rotation={[0, rot, 0]}>
    <Lathe profile={CAN}><meshPhysicalMaterial {...MAT.aluminium} /></Lathe>
    <Label />
  </group>
);

const Ice: React.FC<{ p: [number, number, number]; s?: number; r?: number }> = ({ p, s = 0.22, r = 0 }) => (
  <mesh position={p} rotation={[r, r * 1.7, r * 0.6]} castShadow><boxGeometry args={[s, s, s]} /><meshPhysicalMaterial {...MAT.ice} opacity={0.8} color="#F4FBFF" /></mesh>
);

const Studio: React.FC<{ gobo: THREE.Texture; light: number; children: React.ReactNode }> = ({ gobo, light, children }) => (
  <>
    <RoomEnv intensity={0.35} />
    <ambientLight intensity={0.12} />
    <KeyLight progress={light} from={2.3} to={0.6} k0={3000} k1={5400} intensity={45} />
    <spotLight position={[-3.5, 4.5, 4]} angle={0.55} penumbra={0.4} intensity={260} color="#FFD9A8" castShadow map={gobo} target-position={[0.6, 1, -1.5]} />
    <mesh position={[0, 3, -1.6]} receiveShadow><planeGeometry args={[30, 12]} /><meshStandardMaterial color={CREAM} roughness={0.95} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[30, 30]} /><meshStandardMaterial color="#E6DAC6" roughness={0.9} /></mesh>
    {children}
  </>
);

const Title: React.FC<{ children: React.ReactNode; size?: number; color?: string; t: number }> = ({ children, size = 96, color = BROWN, t }) => {
  const { safe, u, pick } = useFormat();
  const { family } = useThaiFontReady('Anuphan');
  const y = settle(t, 40, 0, 1.6, 0.45);
  return (
    <div style={{ position: 'absolute', left: pick({ portrait: safe.x, landscape: safe.x + safe.w * 0.5 }), top: pick({ portrait: safe.y + u(10), landscape: safe.y + safe.h * 0.3 }), width: pick({ portrait: safe.w, landscape: safe.w * 0.5 }),
      textAlign: pick({ portrait: 'center' as const, landscape: 'left' as const }), fontFamily: family, fontWeight: 600, fontSize: u(size), lineHeight: 1.35, color, opacity: Math.min(1, t * 3), transform: `translateY(${u(y)}px)` }}>{children}</div>
  );
};

// framing per format: can x offset (landscape puts it left of the text), camera distance
const useFrame3D = () => {
  const { pick } = useFormat();
  return { x: pick({ portrait: 0, square: 0, landscape: -0.75 }), dist: pick({ portrait: 4.8, square: 5.4, landscape: 3.7 }), ty: pick({ portrait: 0.95, square: 1.1, landscape: 0.62 }) };
};

const Dawn: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const gobo = useBlindsGobo(); const fr = useFrame3D();
  const p = prog(f, 0, dur('dawn'));
  return (
    <AbsoluteFill>
      <Stage3D background={CREAM} tone="agx" exposure={1.05} fov={32}>
        <Studio gobo={gobo} light={p}>
          <Can rot={-1.3 + 1.3 * (1 - Math.pow(1 - p, 3))} x={fr.x} />
        </Studio>
        <CameraRig position={[fr.x * 0.4, 1.0, fr.dist + 0.6 * (1 - p)]} target={[fr.x * 0.4, fr.ty, 0]} shake={0.01} />
      </Stage3D>
      <Title t={(f - 14) / fps}>เช้านี้ ตื่นก่อน</Title>
    </AbsoluteFill>
  );
};

const DROPS = [{ x: 0.5, z: 0.25, h: 1.6, at: 0 }, { x: -0.48, z: 0.3, h: 1.9, at: 8 }, { x: 0.32, z: 0.55, h: 2.2, at: 15 }];
const Drop: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const gobo = useBlindsGobo(); const fr = useFrame3D();
  const hits = DROPS.flatMap((d) => bounce(0, d.h - 0.08, 0.35).impacts.slice(0, 2).map((t) => t + d.at / fps));
  const kick = pulse(f / fps, hits, 0.08, 0.02);
  return (
    <AbsoluteFill>
      <Stage3D background={CREAM} tone="agx" exposure={1.05} fov={34}>
        <Studio gobo={gobo} light={1}>
          <Can rot={0.05 * Math.sin(f / 20)} x={fr.x} />
          {DROPS.map((d, i) => { const b = bounce(Math.max(0, (f - d.at) / fps), d.h - 0.08, 0.35); return <Ice key={i} p={[fr.x + d.x, 0.08 + b.y, d.z]} r={0.4 + i + b.n * 0.3} />; })}
        </Studio>
        <CameraRig position={[fr.x * 0.4 + 0.3, 0.7 + kick, fr.dist - 0.4]} target={[fr.x * 0.4, 0.45 + kick * 0.5, 0]} />
      </Stage3D>
      <Title t={(f - 20) / fps} color={BROWN}>เย็น สดชื่น</Title>
      {hits.map((t, i) => <Sequence key={i} from={Math.round(t * fps)} durationInFrames={20}><Audio src={staticFile(i % 2 ? 'audio/pop.mp3' : 'audio/switch-click-quick.mp3')} volume={0.5} /></Sequence>)}
    </AbsoluteFill>
  );
};

const Pack: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const gobo = useBlindsGobo(9, 0.5 + 0.05 * Math.sin(f / 30)); const fr = useFrame3D();
  const { u } = useFormat();
  const a = 0.35 * Math.sin(f / 70);
  return (
    <AbsoluteFill>
      <Stage3D background={CREAM} tone="agx" exposure={1.05} fov={32}>
        <Studio gobo={gobo} light={1}>
          <Can rot={0.25 + f * 0.004} x={fr.x} />
        </Studio>
        <CameraRig position={[fr.x * 0.4 + Math.sin(a) * fr.dist, 0.95, Math.cos(a) * fr.dist]} target={[fr.x * 0.4, fr.ty, 0]} />
      </Stage3D>
      <Title t={(f - 6) / fps} size={120}>ตื่นก่อน<div style={{ fontSize: u(52), fontWeight: 400, color: COPPER, opacity: prog(f, 18, 34) }}>โคลด์บรูว์ กาแฟสกัดเย็น 250 ml</div>
        <div style={{ display: 'inline-block', marginTop: u(24), padding: `${u(14)}px ${u(44)}px`, borderRadius: u(60), background: BROWN, color: MILK, fontSize: u(44), opacity: prog(f, 30, 44) }}>ลองเลย</div></Title>
    </AbsoluteFill>
  );
};

export const ColdBrew: React.FC = () => (
  <AbsoluteFill style={{ background: CREAM }}>
    <Timeline backdrop={CREAM} scenes={[
      { dur: dur('dawn'), el: <Dawn />, out: { kind: 'focus' } },
      { dur: dur('ice'), el: <Drop />, out: { kind: 'cut' } },
      { dur: dur('pack'), el: <Pack /> },
    ]} />
    <Grain opacity={0.03} />
    <SafeGuides />
    <Audio src={staticFile('audio/coldbrew.mp3')} volume={(fr) => 0.55 * interpolate(fr, [0, 15, COLDBREW_TOTAL - 30, COLDBREW_TOTAL], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
  </AbsoluteFill>
);
