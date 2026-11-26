// Flat Thai city sets and story HUD for 2D explainers (pairs with lib/flat.tsx). All SVG, all deterministic.
// Build a street: <CityBackdrop/> <Skytrain/> <Street/> <Car/> <TrafficLight/> <RoadSign/> <Bushes/>, put it in
// lib/parallax <Layer depth> groups for a camera pan, then add <FlatCharacter>s and <TimeBadge>s on top.
import React from 'react';
import { interpolate } from 'remotion';
import { rand } from './noise';

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0')}`;
};

/** Hazy skyline of flat buildings with window grids. night = navy sky, lit windows. Width w can exceed the frame for pans. */
export const CityBackdrop: React.FC<{ w: number; h: number; ground: number; night?: boolean; seed?: number; tint?: string }> = ({ w, h, ground, night, seed = 3, tint }) => {
  const sky = night ? ['#0E1630', '#24345E'] : ['#CFE6F5', '#EEF6FB'];
  const rows = [0.55, 0.8];
  return (
    <g>
      <defs><linearGradient id={`sky${seed}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={sky[0]} /><stop offset="1" stopColor={sky[1]} /></linearGradient></defs>
      <rect x={-200} y={0} width={w + 400} height={ground} fill={`url(#sky${seed})`} />
      {rows.map((depth, ri) => {
        const col = tint ?? (night ? (ri ? '#2C3C68' : '#1F2B4D') : (ri ? '#B7CCDD' : '#D3E1EC'));
        const out: React.ReactNode[] = [];
        let x = -200, i = 0;
        while (x < w + 200) {
          const bw = 110 + rand(seed + ri * 9, i) * 160, bh = (ri ? 260 : 420) + rand(seed + ri * 9, i + 50) * (ri ? 240 : 320) * depth;
          const top = ground - bh;
          out.push(<rect key={`b${i}`} x={x} y={top} width={bw} height={bh} fill={col} />);
          for (let wy = top + 26; wy < ground - 30; wy += 38) for (let wx = x + 16; wx < x + bw - 24; wx += 30) {
            const lit = night && rand(seed + i, wx * 0.13 + wy * 0.7) > 0.55;
            out.push(<rect key={`w${i}-${wx}-${wy}`} x={wx} y={wy} width={14} height={20} rx={2} fill={lit ? '#FFD98A' : shade(col, night ? 1.25 : 1.06)} opacity={lit ? 0.9 : 0.8} />);
          }
          x += bw + 8 + rand(seed, i + 99) * 30; i++;
        }
        return <g key={ri}>{out}</g>;
      })}
      <rect x={-200} y={ground - 140} width={w + 400} height={140} fill={night ? '#24345E' : '#FFFFFF'} opacity={night ? 0.25 : 0.35} />
    </g>
  );
};

/** Elevated skytrain guideway with pillars; trainX moves a 3-car train along it (or leave undefined). */
export const Skytrain: React.FC<{ w: number; y: number; every?: number; trainX?: number; color?: string }> = ({ w, y, every = 520, trainX, color = '#E9EEF2' }) => (
  <g>
    {Array.from({ length: Math.ceil((w + 400) / every) + 1 }, (_, i) => <rect key={i} x={-200 + i * every} y={y + 40} width={46} height={2000} fill={shade(color, 0.9)} />)}
    {trainX !== undefined && <g transform={`translate(${trainX} ${y - 64})`}>
      {[0, 1, 2].map((c) => <g key={c} transform={`translate(${c * 330} 0)`}>
        <rect x={0} y={0} width={320} height={70} rx={14} fill="#F7F9FA" />
        <rect x={0} y={44} width={320} height={10} fill="#2EA44F" />
        {[0, 1, 2, 3, 4].map((k) => <rect key={k} x={18 + k * 60} y={12} width={44} height={24} rx={5} fill="#3B4B5C" />)}
      </g>)}
    </g>}
    <rect x={-200} y={y} width={w + 400} height={44} fill={color} />
    <rect x={-200} y={y + 34} width={w + 400} height={10} fill={shade(color, 0.78)} />
  </g>
);

/** Road with lane dashes, kerb with red-white stripes, pavement. ground = top of the pavement (where people stand). */
export const Street: React.FC<{ w: number; ground: number; h: number; road?: string; walk?: string }> = ({ w, ground, h, road = '#A9B1BA', walk = '#E8E2D6' }) => (
  <g>
    <rect x={-200} y={ground - 110} width={w + 400} height={110} fill={road} />
    {Array.from({ length: Math.ceil((w + 400) / 160) }, (_, i) => <rect key={i} x={-200 + i * 160} y={ground - 58} width={80} height={7} fill="#F4F4F0" opacity={0.85} />)}
    <rect x={-200} y={ground} width={w + 400} height={h - ground} fill={walk} />
    {Array.from({ length: Math.ceil((w + 400) / 60) }, (_, i) => <rect key={`k${i}`} x={-200 + i * 60} y={ground - 4} width={60} height={16} fill={i % 2 ? '#FFFFFF' : '#E0403A'} />)}
    <rect x={-200} y={h - 70} width={w + 400} height={70} fill={shade(walk, 0.92)} />
  </g>
);

/** Flat side-view car; t (frames) spins the wheels. kind: sedan | taxi (pink/green Bangkok taxi roof sign) | van. */
export const Car: React.FC<{ x: number; y: number; color?: string; kind?: 'sedan' | 'taxi' | 'van'; t?: number; dir?: 1 | -1; scale?: number }> = ({ x, y, color = '#3D7DD8', kind = 'sedan', t = 0, dir = 1, scale = 1 }) => {
  const van = kind === 'van';
  const wheel = (cx: number) => <g transform={`translate(${cx} -26) rotate(${t * 12 * dir})`}><circle r={26} fill="#22252E" /><circle r={11} fill="#C9CED6" /><rect x={-2} y={-11} width={4} height={22} fill="#8A929C" /></g>;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale * dir} ${scale})`}>
      <ellipse cx={0} cy={-2} rx={150} ry={10} fill="#000" opacity={0.15} />
      {van ? <path d="M-150 -30 L-150 -150 Q-150 -170 -130 -170 L90 -170 Q120 -170 135 -120 L150 -80 L150 -30 Z" fill={color} />
        : <path d="M-150 -30 L-150 -80 Q-150 -96 -132 -98 L-80 -104 L-40 -150 Q-30 -158 -14 -158 L60 -158 Q78 -158 90 -146 L124 -104 Q150 -98 150 -78 L150 -30 Z" fill={color} />}
      {van ? <><rect x={-130} y={-150} width={90} height={46} rx={6} fill="#CFE3F2" /><rect x={-30} y={-150} width={90} height={46} rx={6} fill="#CFE3F2" /><path d="M76 -150 L110 -150 Q122 -140 130 -104 L76 -104 Z" fill="#CFE3F2" /></>
        : <><path d="M-70 -106 L-36 -146 L10 -146 L10 -106 Z" fill="#CFE3F2" /><path d="M20 -146 L58 -146 Q70 -146 78 -136 L104 -106 L20 -106 Z" fill="#CFE3F2" /></>}
      {kind === 'taxi' && <><rect x={-30} y={-178} width={64} height={20} rx={5} fill="#FFFFFF" /><text x={2} y={-163} fontSize={14} fontWeight={800} textAnchor="middle" fill="#1A1A22">TAXI</text></>}
      <rect x={-150} y={-62} width={300} height={8} fill={shade(color, 0.8)} />
      <rect x={138} y={-84} width={14} height={12} rx={3} fill="#FFE48A" />
      {wheel(-92)}{wheel(92)}
    </g>
  );
};

/** Flat side-view scooter (motorbike taxi). t spins wheels; color is the body panel. */
export const Motorbike: React.FC<{ x: number; y: number; color?: string; t?: number; dir?: 1 | -1; scale?: number }> = ({ x, y, color = '#E4572E', t = 0, dir = 1, scale = 1 }) => {
  const wheel = (cx: number) => <g transform={`translate(${cx} -34) rotate(${t * 14 * dir})`}><circle r={34} fill="#22252E" /><circle r={15} fill="#C9CED6" /><rect x={-2} y={-15} width={4} height={30} fill="#8A929C" /></g>;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale * dir} ${scale})`}>
      <ellipse cx={0} cy={-2} rx={120} ry={9} fill="#000" opacity={0.15} />
      <path d="M-110 -50 Q-112 -110 -60 -118 L10 -118 Q30 -90 60 -76 L84 -60 L84 -46 L-110 -46 Z" fill={color} />
      <rect x={-96} y={-138} width={96} height={22} rx={11} fill="#262A33" />
      <path d="M60 -76 L92 -170" stroke="#3A3F47" strokeWidth={12} strokeLinecap="round" />
      <rect x={74} y={-182} width={46} height={12} rx={6} fill="#262A33" />
      <circle cx={104} cy={-140} r={12} fill="#FFE48A" />
      <path d="M-20 -46 L30 -46 L40 -24 L-30 -24 Z" fill={shade(color, 0.75)} />
      {wheel(-78)}{wheel(84)}
    </g>
  );
};

/** Traffic light on a pole with a red countdown box. */
export const TrafficLight: React.FC<{ x: number; y: number; state?: 'red' | 'yellow' | 'green'; count?: number; scale?: number }> = ({ x, y, state = 'red', count, scale = 1 }) => {
  const on = (s: string, c: string) => (state === s ? c : '#3A3F47');
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x={-7} y={-420} width={14} height={420} fill="#5A6270" />
      <rect x={-34} y={-560} width={68} height={176} rx={16} fill="#1E2229" />
      <circle cx={0} cy={-524} r={22} fill={on('red', '#FF3B30')} />
      <circle cx={0} cy={-472} r={22} fill={on('yellow', '#FFCC00')} />
      <circle cx={0} cy={-420} r={22} fill={on('green', '#34C759')} />
      {state === 'red' && <circle cx={0} cy={-524} r={34} fill="#FF3B30" opacity={0.25} />}
      {count !== undefined && <g transform="translate(46 -540)">
        <rect x={0} y={0} width={104} height={54} rx={8} fill="#1E2229" />
        <text x={52} y={41} fontSize={38} fontWeight={800} textAnchor="middle" fill={state === 'green' ? '#34C759' : '#FF5A5A'} fontFamily="monospace">{Math.max(0, Math.ceil(count))}</text>
      </g>}
    </g>
  );
};

/** Green Thai road sign (white text, thin white border). */
export const RoadSign: React.FC<{ x: number; y: number; w?: number; title: string; sub?: string; family: string; color?: string }> = ({ x, y, w = 560, title, sub, family, color = '#1F7A4D' }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-w / 2} y={0} width={w} height={sub ? 128 : 92} rx={10} fill={color} />
    <rect x={-w / 2 + 7} y={7} width={w - 14} height={(sub ? 128 : 92) - 14} rx={6} fill="none" stroke="#FFFFFF" strokeWidth={3} />
    <text x={0} y={60} fontSize={42} fontWeight={700} textAnchor="middle" fill="#FFFFFF" fontFamily={family}>{title}</text>
    {sub && <text x={0} y={102} fontSize={24} textAnchor="middle" fill="#E4F3EA" fontFamily={family}>{sub}</text>}
  </g>
);

/** Foreground tropical leaves (put on a near Layer with a little blur). */
export const Bushes: React.FC<{ w: number; y: number; seed?: number; color?: string; every?: number }> = ({ w, y, seed = 5, color = '#3F8F5A', every = 700 }) => (
  <g>
    {Array.from({ length: Math.ceil((w + 400) / every) + 1 }, (_, i) => {
      const cx = -200 + i * every + rand(seed, i) * 200;
      return <g key={i} transform={`translate(${cx} ${y})`}>
        {Array.from({ length: 7 }, (_, k) => {
          const a = -150 + k * 20 + rand(seed, i * 10 + k) * 10, L = 150 + rand(seed, k + i) * 90;
          return <path key={k} transform={`rotate(${a + 90})`} d={`M0 0 Q${L * 0.5} ${-L * 0.16} ${L} 0 Q${L * 0.5} ${L * 0.16} 0 0 Z`} fill={k % 2 ? color : shade(color, 0.82)} />;
        })}
      </g>;
    })}
  </g>
);

/** Rooftop / penthouse floor for night scenes: glossy floor with a gold railing line. */
export const Rooftop: React.FC<{ w: number; ground: number; h: number }> = ({ w, ground, h }) => (
  <g>
    <rect x={-200} y={ground - 70} width={w + 400} height={6} fill="#C9A45C" />
    {Array.from({ length: Math.ceil((w + 400) / 90) }, (_, i) => <rect key={i} x={-200 + i * 90} y={ground - 64} width={4} height={64} fill="#C9A45C" opacity={0.6} />)}
    <rect x={-200} y={ground} width={w + 400} height={h - ground} fill="#262B3B" />
    <rect x={-200} y={ground} width={w + 400} height={4} fill="#C9A45C" />
  </g>
);

// ---------- HUD ----------
/** Format a life-time in seconds as Thai years / days / hours: 48 ปี 121 วัน, or with hours when short. */
export const fmtLife = (sec: number, hours = false) => {
  const y = Math.floor(sec / (365 * 86400)), d = Math.floor((sec % (365 * 86400)) / 86400), h = Math.floor((sec % 86400) / 3600);
  return hours ? `${y} ปี ${d} วัน ${h} ชม.` : `${y} ปี ${d} วัน`;
};
/** Thai baht / number with thousands separators. */
export const fmtNum = (n: number) => Math.round(n).toLocaleString('en-US');

/** Floating pill over a character's head: hourglass + text (a timer, a price, a name). pop 0..1 scales it in. */
export const TimeBadge: React.FC<{ x: number; y: number; text: string; family: string; tone?: 'navy' | 'gold' | 'red'; pop?: number; size?: number }> = ({ x, y, text, family, tone = 'navy', pop = 1, size = 30 }) => {
  const bg = tone === 'gold' ? '#3A2A12' : tone === 'red' ? '#5A1414' : '#13224A', edge = tone === 'gold' ? '#E0B35A' : tone === 'red' ? '#FF6B6B' : '#7FA7FF';
  const w = size * (1.6 + [...text].length * 0.5);
  return (
    <g transform={`translate(${x} ${y}) scale(${pop})`}>
      <rect x={-w / 2} y={-size} width={w} height={size * 1.9} rx={size * 0.95} fill={bg} stroke={edge} strokeWidth={3} />
      <g transform={`translate(${-w / 2 + size * 0.85} ${-size * 0.05}) scale(${size / 30})`} fill="#FFD27A"><path d="M-9 -14 h18 l-9 13 Z M-9 14 h18 l-9 -13 Z" /><rect x={-11} y={-17} width={22} height={4} rx={2} /><rect x={-11} y={13} width={22} height={4} rx={2} /></g>
      <text x={size * 0.55} y={size * 0.38} fontSize={size} fontWeight={700} textAnchor="middle" fill="#FFFFFF" fontFamily={family}>{text}</text>
    </g>
  );
};

/** Tilted paper note card that pops in: a price, a rule, a fun fact. */
export const NoteCard: React.FC<{ x: number; y: number; title: string; big: string; family: string; rot?: number; pop?: number; accent?: string; w?: number }> = ({ x, y, title, big, family, rot = -4, pop = 1, accent = '#C8102E', w = 420 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${pop})`}>
    <rect x={-w / 2 + 8} y={10} width={w} height={150} rx={10} fill="#000" opacity={0.15} />
    <rect x={-w / 2} y={0} width={w} height={150} rx={10} fill="#FFFBF1" />
    <rect x={-w / 2} y={0} width={w} height={10} rx={4} fill={accent} />
    <text x={0} y={56} fontSize={28} textAnchor="middle" fill="#4A4038" fontFamily={family}>{title}</text>
    <text x={0} y={118} fontSize={52} fontWeight={800} textAnchor="middle" fill={accent} fontFamily={family}>{big}</text>
  </g>
);

/** Phone transfer slip (bank-app style): header, from → to, an amount that counts up, a green tick when done (t frames). */
export const TransferSlip: React.FC<{ x: number; y: number; t: number; family: string; app: string; amount: number; unit: string; to: string; note?: string; dur?: number; scale?: number }> = ({ x, y, t, family, app, amount, unit, to, note, dur = 36, scale = 1 }) => {
  const k = interpolate(t, [0, dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const done = t >= dur;
  const tick = interpolate(t, [dur, dur + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x={-230} y={-430} width={460} height={860} rx={56} fill="#15171C" />
      <rect x={-210} y={-408} width={420} height={816} rx={40} fill="#F4F7FB" />
      <rect x={-210} y={-408} width={420} height={150} rx={40} fill="#12A37F" />
      <rect x={-210} y={-300} width={420} height={42} fill="#12A37F" />
      <text x={0} y={-322} fontSize={34} fontWeight={700} textAnchor="middle" fill="#fff" fontFamily={family}>{app}</text>
      <circle cx={0} cy={-130} r={70} fill={done ? '#12A37F' : '#DDE6EE'} />
      {done ? <path d="M-30 -130 l20 22 l40 -46" stroke="#fff" strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={120} strokeDashoffset={120 * (1 - tick)} />
        : <circle cx={0} cy={-130} r={46} fill="none" stroke="#12A37F" strokeWidth={10} strokeDasharray={290} strokeDashoffset={290 * (1 - k)} />}
      <text x={0} y={0} fontSize={30} textAnchor="middle" fill="#5A6672" fontFamily={family}>{done ? 'โอนสำเร็จ' : 'กำลังโอน...'}</text>
      <text x={0} y={80} fontSize={64} fontWeight={800} textAnchor="middle" fill="#14202B" fontFamily={family}>{fmtNum(amount * k)} {unit}</text>
      <rect x={-170} y={130} width={340} height={2} fill="#D5DEE6" />
      <text x={-170} y={190} fontSize={26} fill="#5A6672" fontFamily={family}>ไปยัง</text>
      <text x={170} y={190} fontSize={26} fontWeight={700} textAnchor="end" fill="#14202B" fontFamily={family}>{to}</text>
      {note && <><text x={-170} y={240} fontSize={26} fill="#5A6672" fontFamily={family}>บันทึก</text><text x={170} y={240} fontSize={26} textAnchor="end" fill="#14202B" fontFamily={family}>{note}</text></>}
    </g>
  );
};
