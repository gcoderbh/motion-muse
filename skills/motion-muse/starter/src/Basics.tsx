// Ready compositions for the everyday jobs. Each takes JSON props (so batch.py can render one per CSV row) and lays
// out from useFormat(), so --formats 9:16,1:1,16:9 works. Copy one and change it rather than starting empty.
//   DataReel  — title + bar / line / donut / race chart + source line
//   LyricReel — lyric or quote video from LRC text (or Line[]) over a moving gradient, optional audio
//   AppPromo  — brand intro → phone with taps and zooms per screen → outro
//   PromoCard — one product: name, price counting down from the old price, discount badge (made for batch.py)
import React from 'react';
import { AbsoluteFill, Audio, CalculateMetadataFunction, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { BarChart, BarRace, CountUp, Datum, Donut, LineChart, RaceSeries, decimals, fmtTH, raceFrames } from './lib/chart';
import { Line, LyricMode, LyricTrack, parseLRC } from './lib/lyrics';
import { Cursor, CursorKey, Phone, ZoomTo } from './lib/device';
import { Brand, BrandIntro, BrandOutro, BrandProvider, Watermark, useBrand } from './lib/brand';
import { useFormat } from './lib/layout';
import { Timeline } from './transitions';

const FPS = 30;
const Title: React.FC<{ title: string; sub?: string; delay?: number }> = ({ title, sub, delay = 0 }) => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(), b = useBrand(), { u } = useFormat();
  const s = spring({ frame: f - delay, fps, config: { damping: 200 } });
  return (
    <div style={{ fontFamily: b.head, color: b.colors.ink, opacity: s, transform: `translateY(${(1 - s) * u(30)}px)` }}>
      <div style={{ fontSize: u(78), fontWeight: 800, lineHeight: 1.3 }}>{title}</div>
      {sub && <div style={{ fontFamily: b.body, fontSize: u(38), lineHeight: 1.4, opacity: 0.7, marginTop: u(8) }}>{sub}</div>}
    </div>
  );
};

// ---------- DataReel ----------
export type DataReelProps = { brand?: Partial<Brand>; title: string; sub?: string; kind: 'bar' | 'barh' | 'line' | 'donut' | 'race'; data?: Datum[]; periods?: string[]; series?: RaceSeries[]; unit?: string; prefix?: string; compact?: boolean; source?: string; highlight?: number; perPeriod?: number };
export const dataReelMetadata: CalculateMetadataFunction<DataReelProps> = ({ props }) => ({
  durationInFrames: props.kind === 'race' ? 30 + raceFrames(props.periods?.length ?? 2, props.perPeriod ?? 30, 75) : 8 * FPS,
});
const DataBody: React.FC<DataReelProps> = (p) => {
  const b = useBrand(), { safe, u, landscape } = useFormat();
  const dg = decimals(...(p.data ?? []).map((d) => d.value), ...(p.series ?? []).flatMap((s) => s.values));
  const fmt = (n: number) => fmtTH(n, { unit: p.unit, prefix: p.prefix, compact: p.compact, digits: p.compact ? undefined : dg });
  const colors = [b.colors.primary, b.colors.accent, '#FF5A36', '#3DDC97', '#8C7AC9', '#4BC6E8', '#FF8FB1', '#A8B4C4'];
  const cw = safe.w, ch = safe.h - u(landscape ? 260 : 380), common = { font: b.body, ink: b.colors.ink, fmt, fontSize: u(30), delay: 14 };
  return (
    <AbsoluteFill style={{ background: b.colors.bg }}>
      <div style={{ position: 'absolute', left: safe.x, top: safe.y, width: safe.w }}><Title title={p.title} sub={p.sub} /></div>
      <div style={{ position: 'absolute', left: safe.x, top: safe.y + u(landscape ? 190 : 260), width: cw, height: ch, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {p.kind === 'bar' && <BarChart {...common} data={p.data ?? []} width={cw} height={ch} colors={colors} highlight={p.highlight} />}
        {p.kind === 'barh' && <BarChart {...common} data={p.data ?? []} width={cw} height={Math.min(ch, (p.data?.length ?? 1) * u(120))} colors={colors} highlight={p.highlight} horizontal />}
        {p.kind === 'line' && <LineChart {...common} data={p.data ?? []} width={cw} height={Math.min(ch, cw * 0.9)} color={b.colors.primary} every={Math.ceil((p.data?.length ?? 1) / 6)} />}
        {p.kind === 'donut' && <Donut {...common} data={p.data ?? []} size={Math.min(cw, ch) * 0.72} colors={colors} />}
        {p.kind === 'race' && <BarRace {...common} delay={30} periods={p.periods ?? []} series={p.series ?? []} width={cw} height={ch} colors={colors} perPeriod={p.perPeriod} />}
      </div>
      {p.source && <div style={{ position: 'absolute', left: safe.x, top: safe.y + safe.h - u(50), fontFamily: b.body, fontSize: u(26), lineHeight: 1.4, color: b.colors.ink, opacity: 0.55 }}>ที่มา: {p.source}</div>}
      <Watermark corner="br" size={36} />
    </AbsoluteFill>
  );
};
export const DataReel: React.FC<DataReelProps> = (p) => <BrandProvider brand={p.brand}><DataBody {...p} /></BrandProvider>;

// ---------- LyricReel ----------
export type LyricReelProps = { brand?: Partial<Brand>; lrc?: string; lines?: Line[]; mode?: LyricMode; audio?: string; audioFrom?: number; title?: string };
const linesOf = (p: LyricReelProps) => p.lines ?? parseLRC(p.lrc ?? '');
export const lyricReelMetadata: CalculateMetadataFunction<LyricReelProps> = ({ props }) => ({ durationInFrames: Math.ceil((Math.max(2, ...linesOf(props).map((l) => l.end)) + 1) * FPS) });
const LyricBody: React.FC<LyricReelProps> = (p) => {
  const f = useCurrentFrame(), b = useBrand(), { safe, u } = useFormat();
  const a = f * 0.4;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(${150 + Math.sin(f / 90) * 20}deg, ${b.colors.primary}, #16130F 120%)` }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${50 + 30 * Math.sin(a / 40)}% ${40 + 20 * Math.cos(a / 50)}%, ${b.colors.accent}55, transparent 45%)` }} />
      {p.audio && <Audio src={staticFile(p.audio)} trimBefore={Math.round((p.audioFrom ?? 0) * FPS)} />}
      {p.title && <div style={{ position: 'absolute', left: safe.x, top: safe.y, fontFamily: b.body, fontSize: u(34), lineHeight: 1.4, color: '#fff', opacity: 0.7 }}>{p.title}</div>}
      <div style={{ position: 'absolute', left: safe.x, top: safe.y, width: safe.w, height: safe.h, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LyricTrack lines={linesOf(p)} mode={p.mode ?? 'karaoke'} font={b.head} size={u(84)} width={safe.w} accent={b.colors.accent} />
      </div>
      <Watermark corner="bl" size={40} opacity={0.7} />
    </AbsoluteFill>
  );
};
export const LyricReel: React.FC<LyricReelProps> = (p) => <BrandProvider brand={p.brand}><LyricBody {...p} /></BrandProvider>;

// ---------- AppPromo ----------
/** One step: a screen (image in public/, or the built-in mock when empty), a caption, where to tap (px on a
 *  400-wide screen) and an optional gentle push-in (`zoom` 1.15–1.3; leave it off on most steps). */
export type AppStep = { src?: string; caption: string; tap?: [number, number]; zoom?: number; dur?: number };
export type AppPromoProps = { brand?: Partial<Brand>; steps: AppStep[]; cta?: string };
const STEP = 90, INTRO = 45, OUTRO = 75;
export const appPromoMetadata: CalculateMetadataFunction<AppPromoProps> = ({ props }) => ({ durationInFrames: INTRO + OUTRO + props.steps.reduce((a, s) => a + (s.dur ?? STEP), 0) });
/** Placeholder app screen drawn in code: header, a highlighted card and a list (used when a step has no src). */
const MockScreen: React.FC<{ i: number; w: number }> = ({ i, w }) => {
  const b = useBrand(), k = w / 400;
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#F6F5F2', fontFamily: b.body, padding: 20 * k, paddingTop: 70 * k, boxSizing: 'border-box' }}>
      <div style={{ fontSize: 26 * k, fontWeight: 800, color: b.colors.ink, lineHeight: 1.3 }}>{b.name}</div>
      <div style={{ marginTop: 16 * k, height: 150 * k, borderRadius: 22 * k, background: i % 2 ? b.colors.accent : b.colors.primary, color: i % 2 ? b.colors.ink : '#fff', padding: 18 * k, fontSize: 22 * k, lineHeight: 1.4, fontWeight: 700 }}>ขั้นที่ {i + 1}</div>
      {[0, 1, 2, 3].map((r) => <div key={r} style={{ marginTop: 14 * k, height: 64 * k, borderRadius: 16 * k, background: '#fff', display: 'flex', alignItems: 'center', gap: 12 * k, padding: `0 ${14 * k}px` }}><div style={{ width: 36 * k, height: 36 * k, borderRadius: '50%', background: '#E4E2DD' }} /><div style={{ flex: 1, height: 12 * k, borderRadius: 6 * k, background: '#E4E2DD' }} /></div>)}
      <div style={{ position: 'absolute', left: 20 * k, right: 20 * k, bottom: 40 * k, height: 64 * k, borderRadius: 32 * k, background: b.colors.ink, color: '#fff', fontSize: 24 * k, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1.3 }}>ต่อไป</div>
    </div>
  );
};
/** All steps in one continuous shot: the phone stays put, each new screen slides in inside it like a real app,
 *  the finger moves from tap to tap, and the camera only pushes in on steps that set `zoom`. */
const Walkthrough: React.FC<{ steps: AppStep[] }> = ({ steps }) => {
  const f = useCurrentFrame(), { fps, width, height } = useVideoConfig(), b = useBrand(), { safe, u } = useFormat();
  const pw = Math.min(safe.w * 0.62, (safe.h - u(260)) / 2.05), bz = pw * 0.04, sw = pw - 2 * bz, k = sw / 400;
  const px = width / 2 - pw / 2, py = safe.y + u(230);
  const starts: number[] = []; steps.reduce((a, st) => (starts.push(a), a + (st.dur ?? STEP)), 0);
  const durOf = (i: number) => steps[i].dur ?? STEP;
  const tapOf = (i: number): [number, number] => { const t = steps[i].tap ?? [200, (pw * 2.05 - 2 * bz) / k * 0.88]; return [t[0] * k, t[1] * k]; };
  const tapAt = (i: number) => starts[i] + Math.round(durOf(i) * 0.6);
  const cur = Math.max(0, starts.filter((st) => f >= st).length - 1);
  const keys: CursorKey[] = [{ at: 12, x: tapOf(0)[0] + sw * 0.2, y: tapOf(0)[1] + sw * 0.35 }];
  steps.forEach((_, i) => { keys.push({ at: tapAt(i) - 6, x: tapOf(i)[0], y: tapOf(i)[1] }, { at: tapAt(i), x: tapOf(i)[0], y: tapOf(i)[1], click: true }); });
  const cx = width / 2, cy = height / 2, zk: { at: number; x: number; y: number; scale: number }[] = [{ at: 0, x: cx, y: cy, scale: 1 }];
  steps.forEach((st, i) => {
    if (!st.zoom || st.zoom <= 1) return;
    const tx = px + bz + tapOf(i)[0], ty = py + bz + tapOf(i)[1], z = st.zoom, end = starts[i] + durOf(i);
    zk.push({ at: tapAt(i) - 24, x: cx, y: cy, scale: 1 }, { at: tapAt(i) - 4, x: cx + (tx - cx) * 0.6, y: cy + (ty - cy) * 0.6, scale: z }, { at: end - 18, x: cx + (tx - cx) * 0.6, y: cy + (ty - cy) * 0.6, scale: z }, { at: end + 2, x: cx, y: cy, scale: 1 });
  });
  const enter = spring({ frame: f, fps, config: { damping: 200 }, durationInFrames: 20 });
  const slide = (i: number) => (i === 0 ? 1 : interpolate(f, [starts[i], starts[i] + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }));
  const screen = (i: number) => (steps[i].src ? <Img src={staticFile(steps[i].src!)} style={{ width: '100%' }} /> : <MockScreen i={i} w={sw} />);
  const capIn = interpolate(f - starts[cur], [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const capOut = cur < steps.length - 1 ? interpolate(f, [starts[cur + 1] - 6, starts[cur + 1]], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  return (
    <AbsoluteFill style={{ background: b.colors.bg }}>
      <ZoomTo keys={zk}>
        <div style={{ position: 'absolute', left: px, top: py, opacity: enter, transform: `translateY(${(1 - enter) * u(80)}px)` }}>
          <Phone width={pw}>
            {cur > 0 && slide(cur) < 1 && <div style={{ position: 'absolute', inset: 0, transform: `translateX(${-30 * slide(cur)}%)`, filter: `brightness(${1 - 0.25 * slide(cur)})` }}>{screen(cur - 1)}</div>}
            <div style={{ position: 'absolute', inset: 0, transform: `translateX(${(1 - slide(cur)) * 100}%)`, boxShadow: cur > 0 && slide(cur) < 1 ? '-10px 0 30px rgba(0,0,0,0.15)' : undefined }}>{screen(cur)}</div>
            <Cursor keys={keys} touch size={u(54)} />
          </Phone>
        </div>
      </ZoomTo>
      <div style={{ position: 'absolute', left: safe.x, top: safe.y, width: safe.w, textAlign: 'center', fontFamily: b.head, fontSize: u(64), fontWeight: 800, lineHeight: 1.35, color: b.colors.ink, opacity: Math.min(capIn, capOut), transform: `translateY(${(1 - capIn) * u(16)}px)` }}>
        <span style={{ display: 'inline-block', padding: `${u(10)}px ${u(34)}px`, borderRadius: u(b.radius ?? 28), background: b.colors.bg, boxShadow: `0 ${u(8)}px ${u(30)}px rgba(0,0,0,0.12)` }}>
          <span style={{ color: b.colors.primary }}>{cur + 1}.</span> {steps[cur].caption}
        </span>
      </div>
    </AbsoluteFill>
  );
};
export const AppPromo: React.FC<AppPromoProps> = (p) => (
  <BrandProvider brand={p.brand}>
    <Timeline sfx={false} scenes={[
      { dur: INTRO, el: <BrandIntro dur={INTRO} /> },
      { dur: p.steps.reduce((a, s) => a + (s.dur ?? STEP), 0), el: <Walkthrough steps={p.steps} /> },
      { dur: OUTRO, el: <BrandOutro cta={p.cta ?? 'โหลดฟรีวันนี้'} /> },
    ]} />
  </BrandProvider>
);

// ---------- PromoCard ----------
/** `price` / `oldPrice` may be null (blank CSV cell): no price line / no discount. */
export type PromoCardProps = { brand?: Partial<Brand>; name: string; price: number | null; oldPrice?: number | null; tagline?: string | null; image?: string | null; badge?: string | null };
const CardBody: React.FC<PromoCardProps> = (p) => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(), b = useBrand(), { safe, u, landscape } = useFormat();
  const s = (d: number) => spring({ frame: f - d, fps, config: { damping: 14 } });
  const off = p.price != null && p.oldPrice && p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  const money = (n: number) => fmtTH(n, { prefix: '฿', digits: decimals(p.price, p.oldPrice) ? 2 : 0 });
  const strike = interpolate(f, [40, 52], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: b.colors.bg, fontFamily: b.head, color: b.colors.ink }}>
      <div style={{ position: 'absolute', left: safe.x, top: safe.y, width: safe.w, height: safe.h, display: 'flex', flexDirection: landscape ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: u(50) }}>
        <div style={{ width: u(520), height: u(520), borderRadius: u(60), background: b.colors.primary, transform: `scale(${s(0)}) rotate(${(1 - s(0)) * -8}deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
          {p.image ? <Img src={staticFile(p.image)} style={{ width: '88%', height: '88%', objectFit: 'contain' }} /> : <div style={{ fontSize: u(220), color: b.colors.onPrimary ?? '#fff', fontWeight: 800, lineHeight: 1.3 }}>{[...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(p.name)][0]?.segment}</div>}
        </div>
        <div style={{ textAlign: landscape ? 'left' : 'center' }}>
          <div style={{ fontSize: u(84), fontWeight: 800, lineHeight: 1.3, opacity: s(8) }}>{p.name}</div>
          {p.tagline && <div style={{ fontFamily: b.body, fontSize: u(40), lineHeight: 1.4, opacity: s(14) * 0.75 }}>{p.tagline}</div>}
          <div style={{ marginTop: u(26), display: 'flex', gap: u(26), alignItems: 'baseline', justifyContent: landscape ? 'flex-start' : 'center', opacity: s(20) }}>
            {off > 0 && <span style={{ position: 'relative', fontSize: u(50), opacity: 0.5 }}>{money(p.oldPrice!)}<span style={{ position: 'absolute', left: 0, top: '55%', height: u(5), width: `${strike}%`, background: '#FF3B30' }} /></span>}
            {p.price != null && <CountUp from={p.oldPrice ?? 0} to={p.price} delay={off ? 48 : 20} dur={30} fmt={money} style={{ fontSize: u(120), fontWeight: 800, color: b.colors.primary }} />}
          </div>
        </div>
      </div>
      {(off > 0 || p.badge) && <div style={{ position: 'absolute', left: safe.x + safe.w - u(250), top: safe.y + u(10), width: u(230), height: u(230), borderRadius: '50%', background: b.colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: u(off ? 66 : 44), fontWeight: 800, lineHeight: 1.3, textAlign: 'center', transform: `scale(${s(70)}) rotate(-12deg)` }}>{p.badge ?? `-${off}%`}</div>}
      <Watermark corner="tl" size={40} />
    </AbsoluteFill>
  );
};
export const PromoCard: React.FC<PromoCardProps> = (p) => <BrandProvider brand={p.brand}><CardBody {...p} /></BrandProvider>;

// ---------- demo props (used by Root and the docs) ----------
export const DEMO_DATA: DataReelProps = { title: 'คนไทยใช้แอปไหนมากที่สุด', sub: 'ผู้ใช้ต่อเดือน (ล้านคน)', kind: 'bar', unit: ' ล้าน', highlight: 0, source: 'ตัวเลขสมมติเพื่อสาธิต',
  data: [{ label: 'LINE', value: 54 }, { label: 'Facebook', value: 49 }, { label: 'YouTube', value: 44 }, { label: 'TikTok', value: 40 }, { label: 'IG', value: 19 }] };
export const DEMO_RACE: DataReelProps = { title: 'ยอดขายรายไตรมาส', sub: 'ล้านบาท', kind: 'race', source: 'ตัวเลขสมมติเพื่อสาธิต', periods: ['Q1', 'Q2', 'Q3', 'Q4'],
  series: [{ label: 'ชานม', values: [12, 18, 22, 25] }, { label: 'กาแฟ', values: [20, 21, 19, 24] }, { label: 'น้ำผลไม้', values: [8, 14, 25, 28] }, { label: 'โซดา', values: [15, 12, 10, 9] }, { label: 'ชาเขียว', values: [5, 9, 13, 20] }] };
export const DEMO_LYRIC: LyricReelProps = { mode: 'karaoke', title: 'ตัวอย่างเนื้อเพลง', lrc: '[00:00.60]วันนี้ฟ้าสดใส\n[00:03.20]เดินไปด้วยกันนะ\n[00:05.80]ไม่ต้องรีบร้อนอะไร\n[00:08.40]แค่มีเธออยู่ตรงนี้\n[00:11.00]' };
export const DEMO_APP: AppPromoProps = { steps: [{ caption: 'เปิดแอป เลือกเมนู' }, { caption: 'กดสั่งได้ในแตะเดียว', tap: [200, 230], zoom: 1.25 }, { caption: 'รอรับที่ร้านได้เลย' }] };
export const DEMO_CARD: PromoCardProps = { name: 'ชาไทยเย็น', tagline: 'หวานน้อยได้ ไม่ใส่นมข้นก็ได้', price: 39, oldPrice: 55 };
