// Footage editing in Remotion: reframed, colour-matched, speed-ramped clips + Thai captions + music ducking.
// FootageReel renders public/edit.json (written by scripts/auto-edit.py, then hand-tuned). Every piece is also usable alone:
// <Clip src="footage/a.mp4" from={3.2} dur={45} ramp={[[0, 2.2], [0.35, 1], [1, 1]]} focus={[0.6, 0.4]} look="warm" />
import React from 'react';
import { AbsoluteFill, Audio, CalculateMetadataFunction, Freeze, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { DUR, Grain, Kind, Out, Timeline } from './transitions';
import { FONT } from './theme';

export type Shot = {
  id?: string; src: string; from: number; dur: number; speed?: number; ramp?: [number, number][];
  focus?: [number, number]; track?: [number, number, number][]; srcAspect?: number; match?: { brightness: number; saturate: number };
  zoom?: [number, number]; audio?: { volume: number; lead?: number; fade?: number }; out?: Out; at?: number;
};
export type Title = { at: number; dur: number; text: string; sub?: string; y?: number; color?: string };
export type Edit = {
  fps: number; width: number; height: number; durationInFrames: number; look?: string; grain?: number;
  shots: Shot[]; overlays?: Shot[]; titles?: Title[];
  music?: { src: string; start: number; volume: number; duck?: [number, number][] };
  vo?: { src: string; volume: number; start?: number }; captions?: { words: { start: number; end: number; text: string }[]; y?: number };
};

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// Colour looks: CSS filter + optional tint layers. Per-clip `match` from footage-scan.py is applied first so shots agree.
export const LOOKS: Record<string, { filter: string; layers?: React.CSSProperties[] }> = {
  clean: { filter: 'contrast(1.05) saturate(1.05)' },
  warm: { filter: 'contrast(1.06) saturate(1.1) sepia(0.1) brightness(1.03)', layers: [{ background: 'linear-gradient(180deg, rgba(255,180,100,0.16), rgba(255,110,50,0.10))', mixBlendMode: 'soft-light' }] },
  'teal-orange': { filter: 'contrast(1.12) saturate(1.12)', layers: [{ background: 'rgba(0,110,140,0.28)', mixBlendMode: 'soft-light' }, { background: 'radial-gradient(ellipse at 50% 40%, rgba(255,150,70,0.22), transparent 60%)', mixBlendMode: 'soft-light' }] },
  film: { filter: 'contrast(1.08) saturate(0.86) sepia(0.08)', layers: [{ background: 'rgba(40,28,16,0.10)', mixBlendMode: 'lighten' }] },
  mono: { filter: 'grayscale(1) contrast(1.22) brightness(1.04)' },
  punchy: { filter: 'contrast(1.18) saturate(1.28)' },
  soft: { filter: 'contrast(0.94) saturate(0.95) brightness(1.06)', layers: [{ background: 'rgba(255,240,230,0.10)', mixBlendMode: 'screen' }] },
};

// Source frames played after `f` timeline frames for a speed curve [[progress 0–1, speed], ...] over `dur` frames.
export const rampFrames = (f: number, dur: number, ramp: [number, number][]) => {
  const sp = (p: number) => interpolate(p, ramp.map((k) => k[0]), ramp.map((k) => k[1]), clamp);
  let acc = 0;
  for (let i = 0; i < Math.floor(f); i++) acc += sp((i + 0.5) / dur);
  return acc + (f % 1) * sp(f / dur);
};

const focusAt = (t: number, focus: [number, number], track?: [number, number, number][]): [number, number] => {
  if (!track || track.length < 2) return focus;
  const ts = track.map((p) => p[0]);
  return [interpolate(t, ts, track.map((p) => p[1]), clamp), interpolate(t, ts, track.map((p) => p[2]), clamp)];
};

export const Clip: React.FC<Shot & { pre?: number; look?: string }> = ({ src, from, dur, speed = 1, ramp, focus = [0.5, 0.5], track, srcAspect = 16 / 9, match, zoom, pre = 0, look = 'clean' }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const start = Math.max(0, Math.round(from * fps - pre * speed));
  const srcF = ramp ? rampFrames(f, dur + pre, ramp) : f * speed;
  const [fx, fy] = focusAt(srcF / fps, focus, track);
  // cover the frame, then slide so the subject sits in the middle (vertical reframe of horizontal footage and vice versa)
  const vw = srcAspect > W / H ? H * srcAspect : W;
  const vh = srcAspect > W / H ? H : W / srcAspect;
  const left = Math.min(0, Math.max(W - vw, W / 2 - fx * vw));
  const top = Math.min(0, Math.max(H - vh, H / 2 - fy * vh));
  const z = zoom ? interpolate(f, [0, dur + pre], zoom, clamp) : 1;
  const ox = left + fx * vw, oy = top + fy * vh;
  const lk = LOOKS[look] ?? LOOKS.clean;
  const video = <OffthreadVideo src={staticFile(src)} trimBefore={start} playbackRate={ramp ? 1 : speed} muted style={{ position: 'absolute', left, top, width: vw, height: vh, maxWidth: 'none' }} />;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#000' }}>
      <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: `${ox}px ${oy}px`, filter: `brightness(${match?.brightness ?? 1}) saturate(${match?.saturate ?? 1}) ${lk.filter}` }}>
        {ramp ? <Freeze frame={Math.round(srcF)}>{video}</Freeze> : video}
      </AbsoluteFill>
      {lk.layers?.map((s, i) => <AbsoluteFill key={i} style={s} />)}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.32) 100%)' }} />
    </AbsoluteFill>
  );
};

// Music volume envelope: duck under speech ranges [startFrame, endFrame] with a fast attack and slower release.
export const duck = (f: number, ranges: [number, number][] = [], depth = 0.72, attack = 4, release = 12) => {
  let d = 0;
  for (const [s, e] of ranges) d = Math.max(d, interpolate(f, [s - attack, s, e, e + release], [0, 1, 1, 0], clamp));
  return 1 - depth * d;
};

const seg = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
const graph = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('th', { granularity: 'grapheme' }) : null;

// Word-by-word Thai captions. Whisper pieces are regrouped into real Thai words with Intl.Segmenter.
export const Captions: React.FC<{ words: { start: number; end: number; text: string }[]; y?: number; maxChars?: number; size?: number; hi?: string }> = ({ words, y = 0.7, maxChars = 18, size = 76, hi = '#FFD23F' }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pages: (typeof words)[] = [];
  for (const w of words) {
    const p = pages[pages.length - 1];
    const len = p ? p.map((x) => x.text).join('').trim().length : 0;
    if (!p || w.start - p[p.length - 1].end > 0.5 * fps || len + w.text.trim().length > maxChars) pages.push([w]);
    else p.push(w);
  }
  const i = pages.findIndex((p, k) => f >= p[0].start - 3 && f < (pages[k + 1] ? Math.min(pages[k + 1][0].start - 3, p[p.length - 1].end + 0.8 * fps) : p[p.length - 1].end + 0.8 * fps));
  if (i < 0) return null;
  const page = pages[i];
  const text = page.map((w) => w.text).join('').trim();
  const lead = page.map((w) => w.text).join('').length - page.map((w) => w.text).join('').trimStart().length;
  const offs: number[] = []; let o = -lead;
  for (const w of page) { offs.push(o); o += w.text.length; }
  const timeAt = (idx: number) => page[Math.max(0, offs.filter((x) => x <= idx).length - 1)].start;
  const parts = seg ? [...seg.segment(text)].map((s) => ({ t: s.segment, at: timeAt(s.index) })) : [{ t: text, at: page[0].start }];
  const pin = spring({ frame: f - (page[0].start - 3), fps, config: { damping: 14, stiffness: 180 } });
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'center' }}>
      <div style={{ position: 'absolute', top: `${y * 100}%`, width: '86%', textAlign: 'center', fontFamily: FONT, fontWeight: 800, fontSize: size, lineHeight: 1.35, color: '#fff',
        transform: `translateY(${(1 - pin) * 28}px)`, opacity: pin, textShadow: '0 4px 18px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.9)', WebkitTextStroke: '1.5px rgba(0,0,0,0.35)' }}>
        {parts.map((p, k) => {
          const on = f >= p.at;
          const pop = spring({ frame: f - p.at, fps, config: { damping: 12, stiffness: 260 } });
          return <span key={k} style={{ color: on ? hi : '#fff', display: 'inline-block', transform: `scale(${on ? 1 + 0.08 * (1 - pop) + 0.0 : 1})`, whiteSpace: 'pre' }}>{p.t}</span>;
        })}
      </div>
    </AbsoluteFill>
  );
};

// Kinetic Thai title over footage: graphemes rise in with a stagger, then hold, then clear upward.
export const FootageTitle: React.FC<Title> = ({ dur, text, sub, y = 0.42, color = '#fff' }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const g = graph ? [...graph.segment(text)].map((s) => s.segment) : [...text];
  const out = interpolate(f, [dur - 8, dur], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', top: `${y * 100}%`, width: '100%', textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 132, lineHeight: 1.3, color, textShadow: '0 8px 40px rgba(0,0,0,0.45)', transform: `translateY(${-out * 60}px)`, opacity: 1 - out }}>
        {g.map((c, i) => {
          const s = spring({ frame: f - i * 2, fps, config: { damping: 13, stiffness: 170 } });
          return <span key={i} style={{ display: 'inline-block', transform: `translateY(${(1 - s) * 90}px) rotate(${(1 - s) * 8}deg)`, opacity: s, whiteSpace: 'pre' }}>{c}</span>;
        })}
        {sub && <div style={{ fontSize: 46, fontWeight: 500, marginTop: 8, opacity: interpolate(f, [10, 22], [0, 1], clamp) }}>{sub}</div>}
      </div>
    </AbsoluteFill>
  );
};

export const FootageReel: React.FC<{ edit: Edit | null }> = ({ edit }) => {
  const { fps } = useVideoConfig();
  if (!edit || !edit.shots?.length) {
    return <AbsoluteFill style={{ background: '#16130F', color: '#fff', fontFamily: FONT, fontSize: 44, padding: 80, justifyContent: 'center' }}>Run scripts/footage-scan.py and scripts/auto-edit.py to create public/edit.json</AbsoluteFill>;
  }
  const look = edit.look ?? 'clean';
  const half = (o?: Out) => (o ? Math.floor((o.dur ?? DUR[o.kind as Kind]) / 2) : 0);
  const starts: number[] = [];
  edit.shots.reduce((s, sh) => (starts.push(s), s + sh.dur), 0);
  const total = edit.durationInFrames;
  const m = edit.music;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Timeline backdrop="#000" scenes={edit.shots.map((sh, i) => ({ dur: sh.dur, out: sh.out, el: <Clip {...sh} pre={half(edit.shots[i - 1]?.out)} look={look} /> }))} />
      {edit.overlays?.map((ov, i) => (
        <Sequence key={`ov${i}`} from={ov.at ?? 0} durationInFrames={ov.dur}><Clip {...ov} look={look} /></Sequence>
      ))}
      {edit.titles?.map((t, i) => (
        <Sequence key={`t${i}`} from={t.at} durationInFrames={t.dur}><FootageTitle {...t} /></Sequence>
      ))}
      {edit.captions && <Captions words={edit.captions.words} y={edit.captions.y} />}
      <Grain opacity={edit.grain ?? 0.06} />
      {edit.shots.map((sh, i) => {
        const a = sh.audio; if (!a || !a.volume) return null;
        const lead = a.lead ?? 0, fade = a.fade ?? 4, len = sh.dur + lead;
        return (
          <Sequence key={`a${i}`} from={Math.max(0, starts[i] - lead)} durationInFrames={len}>
            <Audio src={staticFile(sh.src)} trimBefore={Math.max(0, Math.round(sh.from * fps - lead * (sh.speed ?? 1)))} playbackRate={sh.speed ?? 1}
              volume={(f) => a.volume * interpolate(f, [0, fade, len - fade, len], [0, 1, 1, 0], clamp)} />
          </Sequence>
        );
      })}
      {m && <Audio src={staticFile(m.src)} trimBefore={Math.round(m.start * fps)} volume={(f) => m.volume * duck(f, m.duck) * interpolate(f, [0, 4, total - fps, total], [0, 1, 1, 0], clamp)} />}
      {edit.vo && <Sequence from={edit.vo.start ?? 0}><Audio src={staticFile(edit.vo.src)} volume={edit.vo.volume} /></Sequence>}
    </AbsoluteFill>
  );
};

export const footageMetadata: CalculateMetadataFunction<{ edit: Edit | null }> = async ({ props }) => {
  let edit = props.edit;
  if (!edit) {
    try { edit = (await (await fetch(staticFile('edit.json'))).json()) as Edit; } catch { edit = null; }
  }
  if (!edit) return { durationInFrames: 60, props: { edit: null } };
  return { durationInFrames: edit.durationInFrames, fps: edit.fps, width: edit.width, height: edit.height, props: { edit } };
};
