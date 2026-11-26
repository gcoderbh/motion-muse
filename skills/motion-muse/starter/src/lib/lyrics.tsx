// Timed Thai text: lyric videos, quotes and word-by-word captions. Times are seconds from the start of the composition
// (add `offset` if the audio starts later). Get timings from an .lrc file (parseLRC), from transcribe.py
// (fromCaptions, word times included) or write them by hand. Graphemes keep vowels and tone marks on their letter.
import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export type Word = { start: number; end: number; text: string };
export type Line = { start: number; end: number; text: string; words?: Word[]; by?: string };

const segs = (t: string, g: 'word' | 'grapheme') => [...new Intl.Segmenter('th', { granularity: g }).segment(t)].map((s) => s.segment);

/** "[00:12.40] เนื้อเพลง" lines → Line[]; each line ends where the next starts (last one: +4 s). Empty text = a gap. */
export const parseLRC = (lrc: string, tail = 4): Line[] => {
  const rows: { start: number; text: string }[] = [];
  for (const l of lrc.split(/\r?\n/)) {
    const tags = [...l.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    const text = l.replace(/\[[^\]]*\]/g, '').trim();
    for (const m of tags) rows.push({ start: +m[1] * 60 + +m[2], text });
  }
  rows.sort((a, b) => a.start - b.start);
  return rows.map((r, i) => ({ ...r, end: rows[i + 1]?.start ?? r.start + tail })).filter((r) => r.text);
};

/** transcribe.py output ({key: {segments}} or one entry) → Line[] with word times, shifted so `from` (s) is 0. */
export const fromCaptions = (json: unknown, key?: string, from = 0): Line[] => {
  const j = json as Record<string, { segments: { start: number; end: number; text: string; words?: Word[] }[] }>;
  const e = (j as unknown as { segments?: unknown }).segments ? (j as unknown as { segments: Line[] }) : j[key ?? Object.keys(j)[0]];
  return e.segments.map((s) => ({ start: s.start - from, end: s.end - from, text: s.text, words: s.words?.map((w) => ({ ...w, start: w.start - from, end: w.end - from })) }));
};

/** Word (or grapheme) times inside a line: real word times if present, else spread evenly by grapheme count. */
const unitsOf = (l: Line, g: 'word' | 'grapheme'): Word[] => {
  if (l.words?.length && g === 'word') return l.words;
  const parts = segs(l.text, g), n = parts.reduce((a, p) => a + segs(p, 'grapheme').length, 0) || 1;
  const sing = (l.end - l.start) * 0.85;
  let acc = 0;
  return parts.map((p) => { const k = segs(p, 'grapheme').length, s = l.start + (acc / n) * sing; acc += k; return { text: p, start: s, end: l.start + (acc / n) * sing }; });
};

export type LyricMode = 'karaoke' | 'pop' | 'quote';
/** Shows the current line. karaoke: the line fills with `accent` as it is sung. pop: words pop in on their time and the
 *  current word is highlighted. quote: the whole line rises in and holds (quotes, captions with a speaker in `by`). */
export const LyricTrack: React.FC<{ lines: Line[]; mode?: LyricMode; offset?: number; font?: string; size?: number; color?: string; accent?: string; dim?: string; width?: number; align?: 'center' | 'left'; style?: React.CSSProperties; fade?: number }> = ({
  lines, mode = 'karaoke', offset = 0, font = 'Prompt, sans-serif', size = 84, color = '#FFFFFF', accent = '#FFD23F', dim = 'rgba(255,255,255,0.38)', width = 900, align = 'center', style, fade = 6,
}) => {
  const f = useCurrentFrame(), { fps } = useVideoConfig(), t = f / fps - offset;
  const cur = lines.find((l) => t >= l.start - fade / fps && t < l.end + fade / fps);
  if (!cur) return null;
  const io = interpolate(t, [cur.start - fade / fps, cur.start, cur.end, cur.end + fade / fps], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const base: React.CSSProperties = { fontFamily: font, fontSize: size, fontWeight: 800, lineHeight: 1.4, width, textAlign: align, color, opacity: io, ...style };
  if (mode === 'quote') {
    const s = spring({ frame: f - Math.round((cur.start + offset) * fps), fps, config: { damping: 18 } });
    return (
      <div style={{ ...base, transform: `translateY(${(1 - s) * size * 0.5}px)` }}>
        <div style={{ fontSize: size * 1.8, lineHeight: 0.8, color: accent, height: size * 0.9 }}>“</div>
        {cur.text}
        {cur.by && <div style={{ marginTop: size * 0.4, fontSize: size * 0.42, fontWeight: 500, color: accent, letterSpacing: '0.04em' }}>— {cur.by}</div>}
      </div>
    );
  }
  if (mode === 'pop') {
    const units = unitsOf(cur, 'word');
    return (
      <div style={base}>
        {units.map((w, i) => {
          const s = spring({ frame: f - Math.round((w.start + offset) * fps), fps, config: { damping: 12, stiffness: 180 } });
          const on = t >= w.start && t < w.end;
          return <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', opacity: Math.min(1, s * 1.4), transform: `scale(${0.5 + 0.5 * s})`, color: on ? accent : color }}>{w.text}</span>;
        })}
      </div>
    );
  }
  const units = unitsOf(cur, 'word');
  return (
    <div style={base}>
      {units.map((w, i) => {
        const gs = segs(w.text, 'grapheme');
        return (
          <span key={i} style={{ whiteSpace: 'pre' }}>
            {gs.map((g, k) => {
              const at = w.start + ((w.end - w.start) * k) / gs.length;
              return <span key={k} style={{ color: t >= at ? accent : dim, transition: 'none' }}>{g}</span>;
            })}
          </span>
        );
      })}
    </div>
  );
};
