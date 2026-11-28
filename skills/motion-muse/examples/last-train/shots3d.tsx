// 3D shots (React Three Fiber, frame-driven): city flyover, glass burst, expressway chase, skytrain.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { CameraRig, Stage3D } from '../lib/three';
import { Cnv, clamp, easeOut, glow, lerp, prng, rain, smooth } from './fx';
import { City3D, NightSky } from './city3d';
import { drawFigure, joints, leapPose, runPose, type Pose2 } from './figure';

type V3 = [number, number, number];

const canvasTex = (w: number, h: number, draw: (x: CanvasRenderingContext2D) => void) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
};
const bokehTex = (seed: number) => canvasTex(2048, 512, (x) => {
  const r = prng(seed); x.fillStyle = '#04060c'; x.fillRect(0, 0, 2048, 512);
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 260; i++) { const cx = r() * 2048, cy = 200 + r() * 300, s = 8 + r() * 46; const col = ['255,170,80', '90,200,255', '255,60,130', '255,230,190'][Math.floor(r() * 4)]; const g = x.createRadialGradient(cx, cy, 0, cx, cy, s); g.addColorStop(0, `rgba(${col},0.5)`); g.addColorStop(0.7, `rgba(${col},0.25)`); g.addColorStop(1, `rgba(${col},0)`); x.fillStyle = g; x.fillRect(cx - s, cy - s, s * 2, s * 2); }
});

/** A plane in 3D showing the 2D courier silhouette (redrawn every frame). */
const FigurePlane: React.FC<{ pose: Pose2; position: V3; size: number; rim?: string; light?: [number, number]; rotY?: number; rimW?: number }> = ({ pose, position, size, rim, light, rotY = 0, rimW = 4 }) => {
  const f = useCurrentFrame();
  const { tex, cv } = useMemo(() => { const cv = document.createElement('canvas'); cv.width = cv.height = 512; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; return { tex, cv }; }, []);
  useLayoutEffect(() => { const x = cv.getContext('2d')!; x.clearRect(0, 0, 512, 512); drawFigure(x, joints(pose, 256, 300, 95, 1), f, { rim, light, rimW }); tex.needsUpdate = true; });
  return <mesh position={position} rotation={[0, rotY, 0]}><planeGeometry args={[size, size]} /><meshBasicMaterial map={tex} transparent alphaTest={0.05} toneMapped={false} fog={false} side={THREE.DoubleSide} /></mesh>;
};

/** Rain as line segments in a box around a point. */
const Rain3D: React.FC<{ center: V3; size?: V3; count?: number; speed?: number; len?: number; opacity?: number; wind?: number }> = ({ center, size = [60, 40, 60], count = 2500, speed = 1.6, len = 0.9, opacity = 0.35, wind = 0.15 }) => {
  const f = useCurrentFrame();
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 6), 3)); return g; }, [count]);
  useLayoutEffect(() => {
    const p = geo.getAttribute('position') as THREE.BufferAttribute; const a = p.array as Float32Array; const r = prng(3);
    for (let i = 0; i < count; i++) { const x = center[0] + (r() - 0.5) * size[0], z = center[2] + (r() - 0.5) * size[2]; const y0 = r() * size[1]; const y = center[1] + ((((y0 - f * speed) % size[1]) + size[1]) % size[1]) - size[1] / 2; a.set([x, y, z, x + wind * len, y + len, z], i * 6); }
    p.needsUpdate = true;
  });
  return <lineSegments geometry={geo}><lineBasicMaterial color="#9fb8d8" transparent opacity={opacity} /></lineSegments>;
};

/** Instanced boxes with per-instance matrices. */
const Boxes: React.FC<{ items: { p: V3; s: V3; c?: string }[]; mat: THREE.Material | THREE.Material[] }> = ({ items, mat }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), col = new THREE.Color();
    items.forEach((it, i) => { m.compose(new THREE.Vector3(...it.p), new THREE.Quaternion(), new THREE.Vector3(...it.s)); ref.current!.setMatrixAt(i, m); if (it.c) ref.current!.setColorAt(i, col.set(it.c)); });
    ref.current!.instanceMatrix.needsUpdate = true; if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[undefined, undefined, items.length]} material={mat}><boxGeometry args={[1, 1, 1]} /></instancedMesh>;
};


/* ---------- 2. AERIAL ---------- */
const AerialScene: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 144;
  const streets = useMemo(() => { const t = canvasTex(64, 64, (x) => { x.fillStyle = '#000'; x.fillRect(0, 0, 64, 64); const g = x.createLinearGradient(0, 0, 14, 0); g.addColorStop(0, 'rgba(255,150,60,0.9)'); g.addColorStop(1, 'rgba(255,150,60,0)'); x.fillStyle = g; x.fillRect(0, 0, 14, 64); const g2 = x.createLinearGradient(0, 0, 0, 14); g2.addColorStop(0, 'rgba(255,170,80,0.9)'); g2.addColorStop(1, 'rgba(255,170,80,0)'); x.fillStyle = g2; x.fillRect(0, 0, 64, 14); }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(89, 89); t.offset.set(0.5, 0.5); return t; }, []);
  const beaconMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff2020', toneMapped: false }), []);
  const lights = useMemo(() => { const r = prng(4); return Array.from({ length: 500 }, (_, i) => ({ lane: Math.floor(r() * 9) - 4, dir: r() > 0.5 ? 1 : -1, ph: r() * 400, v: 0.25 + r() * 0.2, i })); }, []);
  const carMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const cars = lights.map((l) => { const along = ((l.ph + f * l.v * 1.5 * l.dir) % 400 + 400) % 400 - 200; const x = l.lane * 20 + 5 + l.dir * 0.8; return { p: [x, 0.3, along] as V3, s: [0.35, 0.25, 0.8] as V3, c: l.dir > 0 ? '#ff3030' : '#fff1d6' }; });
  const heli: V3 = [lerp(30, 10, t), 60, lerp(-40, -70, t)];
  const beamYaw = Math.sin(f / 30) * 0.5, beamPitch = -1.15 + Math.sin(f / 47) * 0.12;
  const coneLen = 90;
  const dir = new THREE.Vector3(Math.sin(beamYaw) * Math.cos(beamPitch), Math.sin(beamPitch), -Math.cos(beamYaw) * Math.cos(beamPitch)).normalize();
  const coneQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  const conePos = new THREE.Vector3(...heli).addScaledVector(dir, coneLen / 2);
  const cam: V3 = [lerp(-34, -7, easeOut(t, 2)), lerp(165, 62, easeOut(t, 2)), lerp(130, 38, easeOut(t, 1.6))];
  const trainZ = lerp(160, -140, t);
  return (
    <>
      <CameraRig position={cam} target={[lerp(-2, 1, t), 0, lerp(-20, -70, t)]} fov={42} roll={lerp(0.06, -0.03, t)} shake={0.25} />
      <ambientLight intensity={0.25} color="#5a6a9a" />
      <hemisphereLight args={['#33415e', '#05060a', 0.6]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><planeGeometry args={[10 * 89, 10 * 89]} /><meshStandardMaterial color="#06080d" roughness={0.35} metalness={0.5} emissive="#ffffff" emissiveIntensity={0.4} emissiveMap={streets} /></mesh>
      <City3D seed={5} n={22} spacing={10} maxH={80} avoidX={10} />
      <NightSky />
      <Boxes items={cars} mat={carMat} />
      {/* skytrain viaduct along z at x=0 */}
      <mesh position={[0, 12, 0]}><boxGeometry args={[3.2, 1.2, 600]} /><meshStandardMaterial color="#1a1e26" roughness={0.7} /></mesh>
      <Boxes items={Array.from({ length: 30 }, (_, i) => ({ p: [0, 6, -300 + i * 20] as V3, s: [1.2, 12, 1.2] as V3 }))} mat={useMemo(() => new THREE.MeshStandardMaterial({ color: '#141820' }), [])} />
      {[0, 1, 2, 3, 4].map((c) => <group key={c} position={[0, 13.9, trainZ + c * 9.5]}><mesh><boxGeometry args={[2.8, 2.6, 9]} /><meshStandardMaterial color="#c8ced8" roughness={0.4} metalness={0.6} /></mesh><mesh position={[1.42, 0.3, 0]}><boxGeometry args={[0.02, 0.9, 8]} /><meshBasicMaterial color="#fff2cc" toneMapped={false} /></mesh><mesh position={[-1.42, 0.3, 0]}><boxGeometry args={[0.02, 0.9, 8]} /><meshBasicMaterial color="#fff2cc" toneMapped={false} /></mesh></group>)}
      {/* helicopter searchlight */}
      <mesh position={heli}><boxGeometry args={[2.5, 1.2, 5]} /><meshStandardMaterial color="#050608" /></mesh>
      <mesh position={[heli[0], heli[1] - 0.8, heli[2]]}><sphereGeometry args={[0.6, 12, 12]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
      <mesh position={[heli[0], heli[1] + 0.3, heli[2] + 2.5]}><sphereGeometry args={[0.18, 8, 8]} /><meshBasicMaterial color={Math.floor(f / 6) % 2 ? '#ff2020' : '#200000'} toneMapped={false} /></mesh>
      <mesh position={conePos} quaternion={coneQ}><cylinderGeometry args={[0.4, 9, coneLen, 32, 1, true]} /><meshBasicMaterial color="#dfe9ff" transparent opacity={0.15} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} /></mesh>
      <spotLight position={heli} angle={0.12} penumbra={0.6} intensity={9000} distance={200} decay={2} color="#e6efff" target-position={[heli[0] + dir.x * 80, heli[1] + dir.y * 80, heli[2] + dir.z * 80]} />
      <Rain3D center={[cam[0], cam[1] - 5, cam[2] - 20]} size={[40, 30, 40]} count={3000} speed={1.8} opacity={0.3} />
    </>
  );
};
export const Aerial: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Stage3D background="#0d1424" fog={['#1c1d2a', 70, 420]} far={1200} exposure={1.35} shadows={false} fov={42}><AerialScene /></Stage3D>
      <Cnv draw={(ctx, w, h) => rain(ctx, w, h, f, { count: 260, speed: 90, alpha: 0.28, len: 90, seed: 31 })} />
    </AbsoluteFill>
  );
};

/* ---------- 8. GLASS: she crashes through a window, shards hang in the air ---------- */
const GlassScene: React.FC = () => {
  const f = useCurrentFrame();
  const t = f < 8 ? f : f < 58 ? 8 + (f - 8) * 0.16 : 8 + 50 * 0.16 + (f - 58) * 0.9;
  const N = 520;
  const shards = useMemo(() => { const r = prng(77); return Array.from({ length: N }, () => { const x = (r() - 0.5) * 9, y = (r() - 0.5) * 6; return { p: [x, y + 1.5, 0] as V3, v: [x * 0.06 + (r() - 0.5) * 0.08, y * 0.05 + (r() - 0.2) * 0.07, 0.12 + r() * 0.35] as V3, w: [r() - 0.5, r() - 0.5, r() - 0.5] as V3, s: 0.12 + Math.pow(r(), 2) * 0.6 }; }); }, []);
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0.7, 0, -0.5, -0.5, 0, 0.6, -0.3, 0]), 3)); g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#cfe8ff', metalness: 1, roughness: 0.04, transparent: true, opacity: 0.85, side: THREE.DoubleSide, envMapIntensity: 2.2 }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const a = Math.max(0, t - 6);
    shards.forEach((s, i) => { const p = new THREE.Vector3(s.p[0] + s.v[0] * a, s.p[1] + s.v[1] * a - 0.004 * a * a, s.p[2] + s.v[2] * a); e.set(s.w[0] * a * 0.4 + i, s.w[1] * a * 0.4 + i * 2, s.w[2] * a * 0.4); q.setFromEuler(e); m.compose(p, q, new THREE.Vector3(s.s, s.s, s.s)); ref.current!.setMatrixAt(i, m); });
    ref.current!.instanceMatrix.needsUpdate = true;
  });
  const bok = useMemo(() => bokehTex(5), []);
  const jump = clamp((t - 2) / 16);
  return (
    <>
      <CameraRig position={[lerp(1.5, -0.8, f / 72), 1.6, 9.5 - f * 0.02]} target={[0, 1.5, 0]} fov={38} shake={0.06} roll={-0.04} />
      <ambientLight intensity={0.2} />
      <pointLight position={[-5, 4, 3]} intensity={260} color="#ff2a8a" />
      <pointLight position={[6, 2, 4]} intensity={260} color="#2ad8ff" />
      <pointLight position={[0, 6, -4]} intensity={180} color="#ffffff" />
      <mesh position={[0, 3, -30]}><planeGeometry args={[120, 30]} /><meshBasicMaterial map={bok} toneMapped={false} fog={false} /></mesh>
      {/* window frame */}
      {[[-4.7, 1.5, 0.3, 6.4], [4.7, 1.5, 0.3, 6.4]].map(([x, y, w, h], i) => <mesh key={i} position={[x, y, 0]}><boxGeometry args={[w, h, 0.3]} /><meshStandardMaterial color="#111" metalness={0.8} roughness={0.3} /></mesh>)}
      <mesh position={[0, -1.7, 0]}><boxGeometry args={[9.7, 0.3, 0.3]} /><meshStandardMaterial color="#111" metalness={0.8} roughness={0.3} /></mesh>
      <instancedMesh ref={ref} args={[geo, mat, N]} />
      <FigurePlane pose={leapPose(jump)} position={[lerp(-3.5, 2.2, jump), 1.4 + Math.sin(jump * Math.PI) * 0.6, lerp(-1.5, 3.5, jump)]} size={5} rim="rgba(255,90,170,0.95)" light={[-1, -0.3]} />
    </>
  );
};
export const Glass: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Stage3D background="#05060b" env exposure={1.1} shadows={false} fov={38}><GlassScene /></Stage3D>
      <Cnv draw={(ctx, w, h) => { ctx.globalCompositeOperation = 'lighter'; const r = prng(4); for (let i = 0; i < 90; i++) { const x = r() * w, y = r() * h, tw = Math.max(0, Math.sin(f * 0.5 + i * 1.7)); if (tw < 0.85) continue; const s = 10 + r() * 30; ctx.strokeStyle = `rgba(230,245,255,${(tw - 0.85) * 5})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s * 0.6); ctx.lineTo(x, y + s * 0.6); ctx.stroke(); glow(ctx, x, y, s * 0.6, '200,230,255', 0.4); } }} />
    </AbsoluteFill>
  );
};

/* ---------- 9. HIGHWAY: bike vs. two SUVs on the expressway ---------- */
const HighwayScene: React.FC = () => {
  const f = useCurrentFrame();
  const V = 2.4, z0 = f * V; // world scroll
  const wrap = (z: number, span: number) => ((z % span) + span) % span;
  const poleMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2e36', metalness: 0.6, roughness: 0.4 }), []);
  const headMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffb35a', toneMapped: false }), []);
  const dashMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#c9c3a8' }), []);
  const poles = Array.from({ length: 16 }, (_, i) => -wrap(-z0 + i * 24, 16 * 24) + 120);
  const dashes = Array.from({ length: 48 }, (_, i) => -wrap(-z0 + i * 8, 384) + 120);
  const bikeX = Math.sin(f / 14) * 1.6, bikeZ = -14;
  const suv1: V3 = [bikeX - 3.2 + Math.sin(f / 20) * 0.6, 0.9, bikeZ + 7 - Math.min(5, f * 0.06)];
  const suv2: V3 = [5.6 - smooth((f - 40) / 20) * 0.3, 0.9, bikeZ + 10 - f * 0.05];
  const scrape = f > 46;
  const sparkN = 220;
  const sparks = useMemo(() => { const r = prng(9); return Array.from({ length: sparkN }, () => ({ b: r() * 50, v: [0.1 + r() * 0.5, 0.1 + r() * 0.35, 0.8 + r() * 1.6] as V3 })); }, []);
  const sparkItems = scrape ? sparks.map((s) => { const age = ((f - 46 + s.b) % 14); return { p: [6.6 + s.v[0] * age * 0.4, 0.6 + s.v[1] * age - 0.03 * age * age, suv2[2] + 1 + s.v[2] * age] as V3, s: [0.05, 0.05, 0.6] as V3 }; }) : [];
  const sparkMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffcf7a', toneMapped: false }), []);
  const pool = useMemo(() => canvasTex(256, 256, (x) => { const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(255,170,80,0.55)'); g.addColorStop(1, 'rgba(255,170,80,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); }), []);
  const bok = useMemo(() => bokehTex(12), []);
  const camT = f / 96;
  return (
    <>
      <CameraRig position={[lerp(-2.6, 2.2, smooth(camT)), lerp(0.9, 1.5, camT), bikeZ - lerp(6.5, 5.2, camT)]} target={[bikeX * 0.6, 1.1, bikeZ + 8]} fov={58} shake={0.18} roll={lerp(0.08, -0.06, smooth(camT))} />
      <ambientLight intensity={0.45} color="#6070a0" />
      <mesh position={[0, 22, 200]} rotation={[0, Math.PI, 0]}><planeGeometry args={[1600, 90]} /><meshBasicMaterial map={bok} toneMapped={false} fog={false} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><planeGeometry args={[16, 500]} /><meshStandardMaterial color="#0d0f13" roughness={0.25} metalness={0.4} /></mesh>
      {[-7.2, 7.2].map((x) => <mesh key={x} position={[x, 0.55, 0]}><boxGeometry args={[0.5, 1.1, 500]} /><meshStandardMaterial color="#3a3e46" roughness={0.6} /></mesh>)}
      <Boxes items={dashes.flatMap((z) => [-2.4, 2.4].map((x) => ({ p: [x, 0.01, z] as V3, s: [0.15, 0.02, 3] as V3 })))} mat={dashMat} />
      <Boxes items={poles.flatMap((z) => [{ p: [-7.2, 5, z] as V3, s: [0.25, 10, 0.25] as V3 }, { p: [7.2, 5, z] as V3, s: [0.25, 10, 0.25] as V3 }])} mat={poleMat} />
      <Boxes items={poles.flatMap((z) => [{ p: [-5.6, 10, z] as V3, s: [1.4, 0.25, 0.6] as V3 }, { p: [5.6, 10, z] as V3, s: [1.4, 0.25, 0.6] as V3 }])} mat={headMat} />
      {poles.map((z, i) => [-4.5, 4.5].map((x) => <mesh key={`${i}${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, z]}><planeGeometry args={[9, 9]} /><meshBasicMaterial map={pool} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>))}
      {/* bike + rider */}
      <group position={[bikeX, 0, bikeZ]} rotation={[0, 0, -Math.cos(f / 14) * 0.25]}>
        <mesh position={[0, 0.7, 0]}><boxGeometry args={[0.45, 0.5, 2]} /><meshStandardMaterial color="#0a0a0c" metalness={0.8} roughness={0.25} /></mesh>
        {[-0.8, 0.8].map((z) => <mesh key={z} position={[0, 0.38, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.36, 0.36, 0.22, 18]} /><meshStandardMaterial color="#050505" /></mesh>)}
        <mesh position={[0, 1.3, 0.1]} rotation={[-0.6, 0, 0]}><boxGeometry args={[0.5, 0.95, 0.4]} /><meshStandardMaterial color="#07080a" /></mesh>
        <mesh position={[0, 1.7, -0.25]}><sphereGeometry args={[0.22, 14, 14]} /><meshStandardMaterial color="#0c0c10" metalness={0.9} roughness={0.15} /></mesh>
        <mesh position={[0, 0.85, 1.02]}><boxGeometry args={[0.3, 0.08, 0.04]} /><meshBasicMaterial color="#ff1a1a" toneMapped={false} /></mesh>
        <mesh position={[0, 0.85, 3.6]}><boxGeometry args={[0.1, 0.03, 5]} /><meshBasicMaterial color="#ff1a1a" transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
        <pointLight position={[0, 0.9, 1.4]} intensity={6} distance={6} color="#ff2020" />
        <mesh position={[0, 0.95, -1.03]}><boxGeometry args={[0.22, 0.12, 0.04]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
        <spotLight position={[0, 1, -1.1]} angle={0.35} penumbra={0.6} intensity={200} distance={30} color="#f4f7ff" target-position={[bikeX, 0, bikeZ - 15]} />
      </group>
      {/* SUVs with headlight beams */}
      {[suv1, suv2].map((p, i) => <group key={i} position={p}>
        <mesh><boxGeometry args={[2.1, 1.5, 4.6]} /><meshStandardMaterial color="#030304" metalness={0.9} roughness={0.2} /></mesh>
        <mesh position={[0, 0.65, -0.3]}><boxGeometry args={[1.9, 0.6, 2.4]} /><meshStandardMaterial color="#000" metalness={1} roughness={0.05} /></mesh>
        {[-0.7, 0.7].map((x) => <React.Fragment key={x}><mesh position={[x, -0.1, -2.31]}><boxGeometry args={[0.45, 0.16, 0.02]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
          <mesh position={[x, -0.1, -9]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[2.2, 0.2, 13, 20, 1, true]} /><meshBasicMaterial color="#cfe0ff" transparent opacity={0.06} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} /></mesh></React.Fragment>)}
        <spotLight position={[0, 0, -2.4]} angle={0.4} penumbra={0.5} intensity={400} distance={40} color="#e8f0ff" target-position={[p[0], 0, p[2] - 20]} />
      </group>)}
      <Boxes items={sparkItems} mat={sparkMat} />
      {scrape && <pointLight position={[6.5, 0.8, suv2[2]]} intensity={30 + Math.sin(f * 3) * 15} distance={10} color="#ffb050" />}
      <Rain3D center={[0, 3, bikeZ]} size={[24, 12, 30]} count={2500} speed={0.9} len={0.5} opacity={0.3} wind={-2.2} />
    </>
  );
};
export const Highway: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Stage3D background="#05070c" fog={['#0a0e18', 30, 220]} far={400} exposure={1.2} shadows={false} fov={58}><HighwayScene /></Stage3D>
      <Cnv draw={(ctx, w, h) => { // speed lines at the edges
        const r = prng(f * 13); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, d0 = 600 + r() * 300, d1 = d0 + 200 + r() * 400; ctx.strokeStyle = `rgba(200,220,255,${0.05 + r() * 0.1})`; ctx.lineWidth = 1 + r() * 2; ctx.beginPath(); ctx.moveTo(w / 2 + Math.cos(a) * d0, h / 2 + Math.sin(a) * d0 * 0.6); ctx.lineTo(w / 2 + Math.cos(a) * d1, h / 2 + Math.sin(a) * d1 * 0.6); ctx.stroke(); }
      }} />
    </AbsoluteFill>
  );
};

/* ---------- 12. TRAIN: she drops onto the last skytrain ---------- */
const TrainScene: React.FC = () => {
  const f = useCurrentFrame();
  const winTex = useMemo(() => canvasTex(512, 64, (x) => { x.fillStyle = '#1b1f27'; x.fillRect(0, 0, 512, 64); for (let i = 0; i < 8; i++) { x.fillStyle = '#fff1cf'; x.fillRect(12 + i * 62, 14, 44, 30); } }), []);
  const scroll = f * 1.8;
  const pillars = Array.from({ length: 12 }, (_, i) => ((i * 22 - scroll) % 264 + 264) % 264 - 132);
  const sparks = useMemo(() => { const r = prng(15); return Array.from({ length: 160 }, () => ({ car: Math.floor(r() * 4), b: r() * 20, v: [-(0.5 + r() * 1.5), 0.2 + r() * 0.5, (r() - 0.5) * 0.6] as V3 })); }, []);
  const sparkItems = sparks.map((s) => { const age = (f + s.b) % 10; return { p: [-14 + s.car * 10 + 3 + s.v[0] * age, 11.2 + s.v[1] * age - 0.05 * age * age, 1.4 + s.v[2] * age] as V3, s: [0.35, 0.04, 0.04] as V3 }; });
  const sparkMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd38a', toneMapped: false }), []);
  const halo = useMemo(() => canvasTex(256, 256, (x) => { const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(120,200,255,0.55)'); g.addColorStop(1, 'rgba(120,200,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); }), []);
  const land = 24;
  const dropY = f < land ? lerp(22, 14.9, easeOut(f / land, 0.6) ** 2) : 14.9;
  const pose = f < land ? leapPose(0.9) : runPose(0.6, Math.max(0.2, 1 - (f - land) / 30));
  const camT = f / 96;
  return (
    <>
      <CameraRig position={[lerp(-4, 2, camT), lerp(14, 19, smooth(camT)), lerp(16, 22, camT)]} target={[0, 13.5, 0]} fov={40} shake={0.12 + (f >= land && f < land + 8 ? 0.6 : 0)} roll={0.03} />
      <ambientLight intensity={0.35} color="#5a6a9a" />
      <directionalLight position={[-10, 30, 20]} intensity={1.6} color="#a9b9ff" />
      <pointLight position={[0, 17, -8]} intensity={600} distance={40} color="#7fdcff" />
      <group position={[-scroll * 0.3, 0, -100]}><City3D seed={21} n={6} xSpan={260} spacing={11} maxH={65} /></group>
      <NightSky haze={false} />
      <mesh position={[0, 10.4, 0]}><boxGeometry args={[400, 1.2, 3.4]} /><meshStandardMaterial color="#1c2029" roughness={0.6} /></mesh>
      <Boxes items={pillars.map((x) => ({ p: [x, 5, 0] as V3, s: [1.4, 10, 1.4] as V3 }))} mat={useMemo(() => new THREE.MeshStandardMaterial({ color: '#141820' }), [])} />
      {[0, 1, 2, 3].map((c) => <group key={c} position={[-14 + c * 10, 12.6, 0]}>
        <mesh><boxGeometry args={[9.6, 2.8, 2.9]} /><meshStandardMaterial color="#d3d9e2" roughness={0.35} metalness={0.7} /></mesh>
        <mesh position={[0, 0.2, 1.46]}><planeGeometry args={[9, 1.1]} /><meshBasicMaterial map={winTex} toneMapped={false} /></mesh>
        <mesh position={[0, -0.9, 1.46]}><planeGeometry args={[9.6, 0.15]} /><meshBasicMaterial color="#00a4e0" toneMapped={false} /></mesh>
      </group>)}
      <Boxes items={sparkItems} mat={sparkMat} />
      <pointLight position={[0, 11, 2]} intensity={40 + Math.sin(f * 2.3) * 20} distance={12} color="#ffc060" />
      <mesh position={[0.5, dropY + 1.6, -6]}><planeGeometry args={[22, 14]} /><meshBasicMaterial map={halo} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} /></mesh>
      <FigurePlane pose={pose} position={[0.5, dropY + 1.2, 0.4]} size={4.4} rim="rgba(140,230,255,1)" light={[-1, -0.6]} rimW={9} />
      <Rain3D center={[0, 14, 6]} size={[50, 24, 20]} count={2600} speed={1.4} opacity={0.3} wind={2.5} />
    </>
  );
};
export const Train: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Stage3D background="#111a2e" fog={['#1f2234', 30, 200]} far={1200} exposure={1.2} shadows={false} fov={40}><TrainScene /></Stage3D>
      <Cnv draw={(ctx, w, h) => rain(ctx, w, h, f, { count: 220, speed: 85, alpha: 0.25, angle: -0.35, seed: 41 })} />
    </AbsoluteFill>
  );
};

