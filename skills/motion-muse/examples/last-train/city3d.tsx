// Procedural night city that does not read as boxes: tiered towers, podiums, cornices, glass vs. concrete facades with
// windows at true size (UVs in metres over a 32×64 window atlas), rooftop tanks/AC/antennas/helipads, Thai neon signs,
// light-pollution sky, distant skyline ring and low haze.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useCurrentFrame } from 'remotion';
import { prng } from './fx';

type V3 = [number, number, number];
const BAY = 0.75, FLOOR = 0.85, AX = 64, AY = 128;

class Buf {
  pos: number[] = []; nor: number[] = []; uv: number[] = []; idx: number[] = [];
  quad(p: V3[], n: V3, uv: [number, number][]) {
    const i = this.pos.length / 3; p.forEach((q) => this.pos.push(...q)); for (let k = 0; k < 4; k++) this.nor.push(...n); uv.forEach((t) => this.uv.push(...t)); this.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setIndex(this.idx); return g; }
}
/** Four walls with window UVs in metres (ou/ov shift where in the atlas this building reads). */
const walls = (b: Buf, cx: number, cz: number, w: number, d: number, y0: number, y1: number, ou: number, ov: number) => {
  const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2;
  const v0 = (ov + y0 / FLOOR) / AY, v1 = (ov + y1 / FLOOR) / AY;
  const U = (a: number, len: number) => [(ou + a) / AX, (ou + a + len / BAY) / AX];
  let [ua, ub] = U(0, w); b.quad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], [[ua, v0], [ub, v0], [ub, v1], [ua, v1]]);
  [ua, ub] = U(w / BAY, d); b.quad([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0], [[ua, v0], [ub, v0], [ub, v1], [ua, v1]]);
  [ua, ub] = U((w + d) / BAY, w); b.quad([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], [[ua, v0], [ub, v0], [ub, v1], [ua, v1]]);
  [ua, ub] = U((2 * w + d) / BAY, d); b.quad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], [[ua, v0], [ub, v0], [ub, v1], [ua, v1]]);
};
const lid = (b: Buf, cx: number, cz: number, w: number, d: number, y: number) =>
  b.quad([[cx - w / 2, y, cz + d / 2], [cx + w / 2, y, cz + d / 2], [cx + w / 2, y, cz - d / 2], [cx - w / 2, y, cz - d / 2]], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);

const canvas = (w: number, h: number, draw: (x: CanvasRenderingContext2D) => void, repeat = false) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
};

/** Window atlas: base (diffuse) + emissive, 32 bays × 64 floors. kind 0 glass office, 1 residential, 2 hotel/mixed. */
const atlas = (kind: number, seed: number) => {
  const cw = 32, ch = 16, W = AX * cw, H = AY * ch; const r = prng(seed);
  const lit: number[][] = []; // per cell 0..1 + hue
  for (let fy = 0; fy < AY; fy++) {
    const floorOn = r() < (kind === 0 ? 0.35 : 0.5), floorWarm = r() < 0.3;
    lit.push(Array.from({ length: AX }, () => { const on = kind === 0 ? (floorOn && r() < 0.85) || r() < 0.04 : r() < (kind === 1 ? 0.3 : 0.38); return on ? (0.45 + r() * 0.55) * (floorWarm || kind ? 1 : -1) : 0; }));
  }
  const map = canvas(W, H, (x) => {
    for (let fy = 0; fy < AY; fy++) for (let bx = 0; bx < AX; bx++) {
      const X = bx * cw, Y = H - (fy + 1) * ch;
      if (kind === 0) { x.fillStyle = `rgb(${18 + r() * 8},${26 + r() * 8},${38 + r() * 10})`; x.fillRect(X, Y, cw, ch); x.fillStyle = '#4a5464'; x.fillRect(X, Y, 2, ch); x.fillStyle = '#20262f'; x.fillRect(X, Y + ch - 4, cw, 4); }
      else if (kind === 1) { const c = 70 + r() * 18; x.fillStyle = `rgb(${c},${c - 4},${c - 10})`; x.fillRect(X, Y, cw, ch); x.fillStyle = '#15171b'; x.fillRect(X + 7, Y + 3, cw - 14, ch - 7); x.fillStyle = `rgb(${c + 25},${c + 22},${c + 16})`; x.fillRect(X, Y + ch - 2, cw, 2); if (r() < 0.25) { x.fillStyle = '#9a9a96'; x.fillRect(X + 9, Y + ch - 5, 10, 3); } }
      else { const c = 44 + r() * 14; x.fillStyle = `rgb(${c + 8},${c},${c - 6})`; x.fillRect(X, Y, cw, ch); x.fillStyle = '#100e0d'; x.fillRect(X + 5, Y + 2, cw - 10, ch - 4); }
    }
  }, true);
  const emi = canvas(W, H, (x) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    for (let fy = 0; fy < AY; fy++) for (let bx = 0; bx < AX; bx++) {
      const v = lit[fy][bx]; if (!v) continue; const a = Math.abs(v); const X = bx * cw, Y = H - (fy + 1) * ch;
      const col = kind === 0 ? (v < 0 ? `rgba(215,232,255,${a})` : `rgba(255,236,200,${a})`) : r() < 0.12 ? `rgba(120,170,255,${a})` : r() < 0.1 ? `rgba(255,120,150,${a * 0.8})` : `rgba(255,${170 + r() * 50},${90 + r() * 60},${a})`;
      x.fillStyle = col;
      if (kind === 0) x.fillRect(X + 2, Y, cw - 2, ch - 4);
      else if (kind === 1) { x.fillRect(X + 7, Y + 3, cw - 14, ch - 7); if (r() < 0.4) { x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(X + 7 + r() * 8, Y + 3, 5, ch - 7); } }
      else x.fillRect(X + 5, Y + 2, cw - 10, ch - 4);
    }
  }, true);
  return { map, emi };
};

const SIGNS: [string, string][] = [['โรงแรม', '#ff2d6f'], ['นวดแผนไทย', '#2de1ff'], ['ร้านทอง', '#ffc23a'], ['ข้าวมันไก่', '#ff6a2d'], ['คาราโอเกะ', '#c64dff'], ['24 ชม.', '#3dff8a'], ['ห้องพัก', '#ff2d6f'], ['สปา', '#2de1ff']];
const signTex = (text: string, color: string, family: string) => canvas(512, 160, (x) => {
  x.fillStyle = 'rgba(10,6,12,0.85)'; x.fillRect(0, 0, 512, 160);
  x.strokeStyle = color; x.lineWidth = 6; x.shadowColor = color; x.shadowBlur = 18; x.strokeRect(10, 10, 492, 140);
  x.font = `800 92px ${family}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = color; x.fillText(text, 256, 84); x.shadowBlur = 0; x.fillStyle = 'rgba(255,255,255,0.85)'; x.fillText(text, 256, 84);
});

export type CityOpts = { seed?: number; n?: number; spacing?: number; maxH?: number; avoidX?: number; zMax?: number; xSpan?: number; family?: string };

export const City3D: React.FC<CityOpts> = ({ seed = 5, n = 20, spacing = 10, maxH = 70, avoidX = 0, zMax = Infinity, xSpan, family = 'Kanit' }) => {
  const f = useCurrentFrame();
  const data = useMemo(() => {
    const r = prng(seed);
    const fac = [new Buf(), new Buf(), new Buf()], roofs = new Buf(), trims = new Buf();
    const details: THREE.BufferGeometry[] = []; const beacons: V3[] = []; const signs: { p: V3; ry: number; w: number; k: number }[] = []; const pads: V3[] = [];
    const tank = new THREE.CylinderGeometry(1, 1, 1, 12), box = new THREE.BoxGeometry(1, 1, 1), cone = new THREE.ConeGeometry(1, 1, 4);
    const put = (g: THREE.BufferGeometry, p: V3, s: V3, ry = 0) => { const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(...s)); details.push(g.clone().applyMatrix4(m)); };
    const nx = xSpan ? Math.ceil(xSpan / spacing) : n;
    for (let i = -nx; i <= nx; i++) for (let j = -n; j <= n; j++) {
      if (r() < 0.08) continue;
      const cx = i * spacing + (r() - 0.5) * 1.5, cz = j * spacing + (r() - 0.5) * 1.5;
      if (Math.abs(cx) < avoidX || cz > zMax) continue;
      const dist = Math.hypot(i / nx, j / n);
      const H = 8 + Math.pow(r(), 2.4) * maxH * Math.max(0.25, 1.15 - dist * 0.8);
      const kind = H > 45 ? (r() < 0.7 ? 0 : 2) : r() < 0.55 ? 1 : r() < 0.5 ? 2 : 0;
      let w = spacing * (0.5 + r() * 0.28), d = spacing * (0.5 + r() * 0.28), y = 0;
      const ou = Math.floor(r() * AX), ov = Math.floor(r() * AY);
      if (H > 25 && r() < 0.35) { // podium
        const ph = 6 + r() * 6, pw = Math.min(spacing * 0.86, w * 1.45), pd = Math.min(spacing * 0.86, d * 1.45);
        walls(fac[2], cx, cz, pw, pd, 0, ph, ou, ov); lid(roofs, cx, cz, pw, pd, ph); walls(trims, cx, cz, pw + 0.3, pd + 0.3, ph - 0.5, ph + 0.4, 0, 0);
        if (r() < 0.6) signs.push({ p: [cx, ph * 0.55, cz + pd / 2 + 0.06], ry: 0, w: Math.min(pw * 0.8, 7), k: Math.floor(r() * SIGNS.length) });
        y = ph;
      } else if (r() < 0.25 && H < 40) signs.push({ p: [cx + w / 2 + 0.06, 4 + r() * 6, cz], ry: Math.PI / 2, w: Math.min(d * 0.8, 5), k: Math.floor(r() * SIGNS.length) });
      const tiers = H > 40 ? 1 + Math.floor(r() * 3) : 1;
      let top = y;
      for (let t = 0; t < tiers; t++) {
        const th = (H - y) * (tiers === 1 ? 1 : t === 0 ? 0.55 : t === 1 ? 0.3 : 0.15) || 1;
        const y1 = top + th; walls(fac[kind], cx, cz, w, d, top, y1, ou, ov); lid(roofs, cx, cz, w, d, y1);
        walls(trims, cx, cz, w + 0.25, d + 0.25, y1 - 0.4, y1 + 0.6, 0, 0); lid(trims, cx, cz, w + 0.25, d + 0.25, y1 + 0.6);
        top = y1; if (t < tiers - 1) { w *= 0.72 + r() * 0.12; d *= 0.72 + r() * 0.12; }
      }
      const roofY = top + 0.6;
      // rooftop kit
      if (kind === 1 || r() < 0.4) for (let k = 0; k < 1 + Math.floor(r() * 3); k++) { const tx = cx + (r() - 0.5) * w * 0.6, tz = cz + (r() - 0.5) * d * 0.6; put(tank, [tx, roofY + 1.6, tz], [0.9, 1.6, 0.9]); put(box, [tx, roofY + 0.4, tz], [1.6, 0.8, 1.6]); }
      for (let k = 0; k < Math.floor(r() * 5); k++) put(box, [cx + (r() - 0.5) * w * 0.7, roofY + 0.4, cz + (r() - 0.5) * d * 0.7], [1 + r(), 0.8, 0.8 + r()]);
      if (H > 50 && r() < 0.35) { put(cone, [cx, roofY + w * 0.35, cz], [w * 0.62, w * 0.7, d * 0.62], Math.PI / 4); put(box, [cx, roofY + w * 0.7 + 4, cz], [0.25, 8, 0.25]); beacons.push([cx, roofY + w * 0.7 + 8.2, cz]); }
      else if (H > 45 && r() < 0.4) pads.push([cx, roofY + 0.05, cz]);
      else if (H > 30 && r() < 0.6) { const ax = cx + (r() - 0.5) * w * 0.5, az = cz + (r() - 0.5) * d * 0.5, ah = 4 + r() * 8; put(box, [ax, roofY + ah / 2, az], [0.2, ah, 0.2]); beacons.push([ax, roofY + ah + 0.2, az]); }
    }
    const texs = [atlas(0, seed * 3 + 1), atlas(1, seed * 3 + 2), atlas(2, seed * 3 + 3)];
    const facMats = texs.map((t, k) => new THREE.MeshStandardMaterial({ map: t.map, emissiveMap: t.emi, emissive: '#ffffff', emissiveIntensity: 1.35, roughness: k === 0 ? 0.25 : 0.9, metalness: k === 0 ? 0.55 : 0.05 }));
    return {
      facades: fac.map((b) => b.geo()), facMats,
      roofs: roofs.geo(), trims: trims.geo(), details: details.length ? mergeGeometries(details) : null, beacons, pads,
      signs, signMats: SIGNS.map(([t, c]) => new THREE.MeshBasicMaterial({ map: signTex(t, c, family), toneMapped: false, transparent: true })),
      padTex: canvas(256, 256, (x) => { x.fillStyle = '#1a1d22'; x.beginPath(); x.arc(128, 128, 124, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#d8d8d0'; x.lineWidth = 10; x.beginPath(); x.arc(128, 128, 100, 0, Math.PI * 2); x.stroke(); x.font = '900 130px sans-serif'; x.fillStyle = '#d8d8d0'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('H', 128, 136); }),
    };
  }, [seed, n, spacing, maxH, avoidX, zMax, xSpan, family]);
  const blink = Math.floor(f / 14) % 2 === 0;
  return (
    <group>
      {data.facades.map((g, k) => <mesh key={k} geometry={g} material={data.facMats[k]} />)}
      <mesh geometry={data.roofs}><meshStandardMaterial color="#2a2f38" roughness={0.8} /></mesh>
      <mesh geometry={data.trims}><meshStandardMaterial color="#2a2e36" roughness={0.6} metalness={0.3} /></mesh>
      {data.details && <mesh geometry={data.details}><meshStandardMaterial color="#3a3f48" roughness={0.7} metalness={0.2} /></mesh>}
      {data.beacons.map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.35, 8, 8]} /><meshBasicMaterial color={(blink ? i % 3 !== 0 : i % 3 === 0) ? '#ff2a2a' : '#300404'} toneMapped={false} /></mesh>)}
      {data.pads.map((p, i) => <mesh key={i} position={p} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[2.2, 32]} /><meshStandardMaterial map={data.padTex} roughness={0.8} /></mesh>)}
      {data.signs.map((s, i) => <mesh key={i} position={s.p} rotation={[0, s.ry, 0]} material={data.signMats[s.k]}><planeGeometry args={[s.w, s.w * 0.31]} /></mesh>)}
    </group>
  );
};

/** Light-pollution sky dome + distant skyline ring + low haze sheets. */
export const NightSky: React.FC<{ radius?: number; seed?: number; haze?: boolean }> = ({ radius = 520, seed = 9, haze = true }) => {
  const { sky, ring, hz } = useMemo(() => {
    const sky = canvas(16, 512, (x) => { const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#03050c'); g.addColorStop(0.35, '#0a1124'); g.addColorStop(0.47, '#2a2a3a'); g.addColorStop(0.5, '#4a3a38'); g.addColorStop(0.53, '#1a1a22'); g.addColorStop(1, '#05060a'); x.fillStyle = g; x.fillRect(0, 0, 16, 512); });
    const r = prng(seed);
    const ring = canvas(4096, 256, (x) => {
      x.clearRect(0, 0, 4096, 256);
      for (let layer = 0; layer < 2; layer++) { let px = 0; while (px < 4096) { const bw = 10 + r() * 40, bh = 20 + Math.pow(r(), 2) * (layer ? 200 : 120); x.fillStyle = layer ? '#0b0e16' : '#151a26'; x.fillRect(px, 256 - bh, bw, bh); if (r() < 0.2) x.fillRect(px + bw / 2 - 1, 256 - bh - 20, 2, 20); for (let wy = 256 - bh + 4; wy < 256; wy += 5) for (let wx = px + 2; wx < px + bw - 2; wx += 4) if (r() < 0.22) { x.fillStyle = r() < 0.7 ? 'rgba(255,200,130,0.9)' : 'rgba(170,210,255,0.9)'; x.fillRect(wx, wy, 1.5, 2); x.fillStyle = layer ? '#0b0e16' : '#151a26'; } px += bw + r() * 6; } }
    });
    const hz = canvas(512, 512, (x) => { for (let i = 0; i < 60; i++) { const cx = r() * 512, cy = r() * 512, s = 60 + r() * 140; const g = x.createRadialGradient(cx, cy, 0, cx, cy, s); g.addColorStop(0, 'rgba(255,170,110,0.10)'); g.addColorStop(1, 'rgba(255,170,110,0)'); x.fillStyle = g; x.fillRect(cx - s, cy - s, s * 2, s * 2); } }, true);
    hz.repeat.set(3, 3);
    return { sky, ring, hz };
  }, [seed]);
  return (
    <group>
      <mesh><sphereGeometry args={[radius, 32, 16]} /><meshBasicMaterial map={sky} side={THREE.BackSide} fog={false} toneMapped={false} depthWrite={false} /></mesh>
      <mesh position={[0, 30, 0]}><cylinderGeometry args={[radius * 0.8, radius * 0.8, 90, 64, 1, true]} /><meshBasicMaterial map={ring} transparent side={THREE.BackSide} fog={false} toneMapped={false} depthWrite={false} /></mesh>
      {haze && [3, 9, 16].map((y, i) => <mesh key={i} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, i]}><planeGeometry args={[900, 900]} /><meshBasicMaterial map={hz} transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>)}
    </group>
  );
};
