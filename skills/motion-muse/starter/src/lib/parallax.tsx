// 2.5D parallax scenes: flat layers at different depths move at different speeds under a virtual camera.
// <Parallax cam={{ x, y, zoom }}> <Layer depth={6}><Sky/></Layer> <Layer depth={1}>...</Layer> </Parallax>
// depth 1 = the focal plane (moves 1:1 with the camera); bigger = farther (slower); < 1 = foreground (faster, add blur).
import React, { createContext, useContext } from 'react';
import { AbsoluteFill } from 'remotion';
import { fbm, rand } from './noise';

type Cam = { x: number; y: number; zoom: number; rot?: number };
const CamCtx = createContext<Cam>({ x: 0, y: 0, zoom: 1 });

export const Parallax: React.FC<{ cam: Cam; children: React.ReactNode; background?: string }> = ({ cam, children, background }) => (
  <AbsoluteFill style={{ overflow: 'hidden', background }}>
    <CamCtx.Provider value={cam}>{children}</CamCtx.Provider>
  </AbsoluteFill>
);

export const Layer: React.FC<{ depth: number; children: React.ReactNode; blur?: number; style?: React.CSSProperties }> = ({ depth, children, blur, style }) => {
  const c = useContext(CamCtx);
  const k = 1 / depth;
  const z = 1 + (c.zoom - 1) * k;
  return (
    <AbsoluteFill style={{ transform: `rotate(${(c.rot ?? 0) * k}deg) scale(${z}) translate(${-c.x * k}px, ${-c.y * k}px)`, transformOrigin: '50% 50%', filter: blur ? `blur(${blur}px)` : undefined, ...style }}>
      {children}
    </AbsoluteFill>
  );
};

/** Sky gradient with optional sun/moon glow. */
export const Sky: React.FC<{ top: string; bottom: string; glow?: { x: number; y: number; color: string; size?: number } }> = ({ top, bottom, glow }) => (
  <AbsoluteFill style={{ background: `linear-gradient(${top}, ${bottom})` }}>
    {glow && <div style={{ position: 'absolute', left: `${glow.x * 100}%`, top: `${glow.y * 100}%`, width: glow.size ?? 600, height: glow.size ?? 600, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: `radial-gradient(circle, ${glow.color} 0%, transparent 65%)` }} />}
  </AbsoluteFill>
);

/** Procedural mountain / dune / hill ridge. Make layers wider than the frame (w) so the camera can pan. */
export const Ridge: React.FC<{ w: number; h: number; base: number; amp: number; freq?: number; seed?: number; color: string; x0?: number; edge?: string }> = ({ w, h, base, amp, freq = 0.004, seed = 1, color, x0 = -400, edge }) => {
  const pts: string[] = [];
  for (let x = x0; x <= w - x0; x += 12) pts.push(`${x},${base - amp * (0.5 + 0.5 * fbm(x * freq, seed, 4))}`);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      <polygon points={`${x0},${h + 400} ${pts.join(' ')} ${w - x0},${h + 400}`} fill={color} stroke={edge} strokeWidth={edge ? 3 : 0} />
    </svg>
  );
};

/** Procedural city skyline with lit windows. broken = share of dark/damaged buildings (for apocalyptic scenes). */
export const Skyline: React.FC<{ w: number; h: number; base: number; seed?: number; color: string; window?: string; minH?: number; maxH?: number; broken?: number; x0?: number; litShare?: number }> = ({ w, h, base, seed = 4, color, window = '#FFD58A', minH = 120, maxH = 420, broken = 0, x0 = -400, litShare = 0.35 }) => {
  const blds: React.ReactNode[] = [];
  let x = x0, i = 0;
  while (x < w - x0) {
    const bw = 60 + rand(seed, i) * 110, bh = minH + rand(seed, i + 50) * (maxH - minH);
    const dmg = rand(seed, i + 200) < broken;
    const top = base - bh;
    const roof = dmg ? `${x},${top + 30} ${x + bw * 0.3},${top} ${x + bw * 0.5},${top + 40} ${x + bw * 0.75},${top + 12} ${x + bw},${top + 50}` : `${x},${top} ${x + bw},${top}`;
    blds.push(<polygon key={`b${i}`} points={`${x},${h + 400} ${roof} ${x + bw},${h + 400}`} fill={color} />);
    for (let wy = top + 24; wy < base - 20; wy += 28) for (let wx = x + 10; wx < x + bw - 14; wx += 22) {
      const r = rand(seed * 3 + i, wx * 0.1 + wy);
      if (r < litShare * (dmg ? 0.25 : 1)) blds.push(<rect key={`w${i}-${wx}-${wy}`} x={wx} y={wy} width={10} height={14} fill={window} opacity={0.5 + r} />);
    }
    x += bw + 4 + rand(seed, i + 9) * 20; i++;
  }
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>{blds}</svg>;
};

/** Soft fog band (stack several at different depths for volume). */
export const FogBand: React.FC<{ y: number; height: number; color?: string; opacity?: number; frame?: number; speed?: number }> = ({ y, height, color = '255,255,255', opacity = 0.5, frame = 0, speed = 0.3 }) => (
  <div style={{ position: 'absolute', left: '-50%', width: '200%', top: y - height / 2, height, transform: `translateX(${Math.sin(frame / 120) * 40 + frame * speed * 0.2}px)`,
    background: `radial-gradient(ellipse at 30% 50%, rgba(${color},${opacity}) 0%, transparent 60%), radial-gradient(ellipse at 75% 50%, rgba(${color},${opacity * 0.8}) 0%, transparent 55%)`, filter: 'blur(20px)' }} />
);

/** Stars that twinkle. */
export const Stars: React.FC<{ w: number; h: number; count?: number; seed?: number; frame: number }> = ({ w, h, count = 120, seed = 8, frame }) => (
  <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
    {Array.from({ length: count }, (_, i) => <circle key={i} cx={rand(seed, i) * w} cy={rand(seed, i + 500) * h} r={0.6 + rand(seed, i + 900) * 1.8} fill="#fff" opacity={0.35 + 0.65 * Math.abs(Math.sin(frame / (20 + rand(seed, i + 1300) * 40) + i))} />)}
  </svg>
);
