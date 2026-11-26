// Thai typography: font registry + loader + kinetic text components that keep vowels and tone marks attached.
// Get font files with: bash "$SKILL_DIR/scripts/thai-fonts.sh" public/fonts Kanit "IBM Plex Sans Thai" ...
import React, { useEffect, useState } from 'react';
import { continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

export type ThaiFont = { family: string; mood: string; files: Record<number, string> };
// Weights → file names in public/fonts. Variable fonts list one file for every weight.
export const THAI_FONTS: Record<string, ThaiFont> = {
  Prompt: { family: 'Prompt', mood: 'friendly geometric sans, default, bright promos', files: { 300: 'Prompt-Light.ttf', 500: 'Prompt-Medium.ttf', 700: 'Prompt-Bold.ttf', 900: 'Prompt-Black.ttf' } },
  Kanit: { family: 'Kanit', mood: 'bold loopless headline, sport, sale, energetic', files: { 200: 'Kanit-ExtraLight.ttf', 300: 'Kanit-Light.ttf', 400: 'Kanit-Regular.ttf', 600: 'Kanit-SemiBold.ttf', 800: 'Kanit-ExtraBold.ttf', 900: 'Kanit-Black.ttf' } },
  'IBM Plex Sans Thai': { family: 'IBM Plex Sans Thai', mood: 'clean modern sans, tech, corporate, minimalist luxury in Thin/ExtraLight', files: { 100: 'IBMPlexSansThai-Thin.ttf', 200: 'IBMPlexSansThai-ExtraLight.ttf', 300: 'IBMPlexSansThai-Light.ttf', 400: 'IBMPlexSansThai-Regular.ttf', 500: 'IBMPlexSansThai-Medium.ttf', 700: 'IBMPlexSansThai-Bold.ttf' } },
  'Noto Sans Thai': { family: 'Noto Sans Thai', mood: 'neutral sans, long body text, subtitles', files: { 100: 'NotoSansThai[wdth,wght].ttf', 900: 'NotoSansThai[wdth,wght].ttf' } },
  Anuphan: { family: 'Anuphan', mood: 'contemporary loopless sans, fashion, premium', files: { 100: 'Anuphan[wght].ttf', 700: 'Anuphan[wght].ttf' } },
  Sarabun: { family: 'Sarabun', mood: 'formal, government, news, documents', files: { 300: 'Sarabun-Light.ttf', 400: 'Sarabun-Regular.ttf', 700: 'Sarabun-Bold.ttf' } },
  Mitr: { family: 'Mitr', mood: 'rounded friendly headline, kids, food', files: { 300: 'Mitr-Light.ttf', 500: 'Mitr-Medium.ttf', 700: 'Mitr-Bold.ttf' } },
  'Chakra Petch': { family: 'Chakra Petch', mood: 'angular techno, gaming, sci-fi, HUD', files: { 300: 'ChakraPetch-Light.ttf', 500: 'ChakraPetch-Medium.ttf', 700: 'ChakraPetch-Bold.ttf' } },
  'Bai Jamjuree': { family: 'Bai Jamjuree', mood: 'squarish modern, automotive, tech', files: { 300: 'BaiJamjuree-Light.ttf', 500: 'BaiJamjuree-Medium.ttf', 700: 'BaiJamjuree-Bold.ttf' } },
  Mali: { family: 'Mali', mood: 'hand-drawn rounded, cartoons, explainers for kids', files: { 400: 'Mali-Regular.ttf', 600: 'Mali-SemiBold.ttf', 700: 'Mali-Bold.ttf' } },
  Itim: { family: 'Itim', mood: 'playful marker, comics, casual', files: { 400: 'Itim-Regular.ttf' } },
  Sriracha: { family: 'Sriracha', mood: 'brush handwriting, street food, personal notes', files: { 400: 'Sriracha-Regular.ttf' } },
  Trirong: { family: 'Trirong', mood: 'looped serif, heritage, literature, wedding', files: { 300: 'Trirong-Light.ttf', 400: 'Trirong-Regular.ttf', 700: 'Trirong-Bold.ttf' } },
  'Noto Serif Thai': { family: 'Noto Serif Thai', mood: 'serif, editorial, documentary, horror titles', files: { 100: 'NotoSerifThai[wdth,wght].ttf', 900: 'NotoSerifThai[wdth,wght].ttf' } },
  Charm: { family: 'Charm', mood: 'calligraphic script, invitations, luxury accents', files: { 400: 'Charm-Regular.ttf', 700: 'Charm-Bold.ttf' } },
};

const loaded = new Set<string>();
const ready = new Map<string, Promise<unknown>>();
/** Load a Thai font family from public/fonts (blocks rendering until ready). Returns a CSS font-family string. */
export const useThaiFont = (name: keyof typeof THAI_FONTS | string): string => {
  const f = THAI_FONTS[name];
  if (!f) return `'${name}', 'Prompt', sans-serif`;
  if (typeof document !== 'undefined' && !loaded.has(name)) {
    loaded.add(name);
    const variable = new Set(Object.values(f.files)).size === 1 && Object.keys(f.files).length > 1;
    const handle = delayRender(`font ${name}`);
    const jobs = variable
      ? [new FontFace(f.family, `url('${staticFile(`fonts/${Object.values(f.files)[0]}`)}')`, { weight: `${Math.min(...Object.keys(f.files).map(Number))} ${Math.max(...Object.keys(f.files).map(Number))}` })]
      : Object.entries(f.files).map(([w, file]) => new FontFace(f.family, `url('${staticFile(`fonts/${file}`)}')`, { weight: w }));
    const p = Promise.all(jobs.map((ff) => ff.load().then((l) => document.fonts.add(l))));
    ready.set(name, p.catch(() => undefined));
    p.then(() => continueRender(handle)).catch((e) => { console.error(`font ${name}`, e); continueRender(handle); });
  }
  return `'${f.family}', 'Prompt', sans-serif`;
};

/** Like useThaiFont, plus `ok` once the font is usable: Canvas 2D (3D labels, textures) must wait for it before drawing. */
export const useThaiFontReady = (name: keyof typeof THAI_FONTS | string) => {
  const family = useThaiFont(name);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const h = delayRender(`font ready ${name}`);
    (ready.get(name) ?? Promise.resolve()).then(() => { setOk(true); continueRender(h); });
  }, [name]);
  return { family, ok };
};

const seg = (text: string, by: 'word' | 'grapheme') => {
  const S = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: string }) => { segment: (t: string) => Iterable<{ segment: string }> } }).Segmenter;
  return S ? [...new S('th', { granularity: by }).segment(text)].map((s) => s.segment) : [...text];
};

type Anim = 'rise' | 'fade' | 'blur' | 'pop' | 'drop';
const unitStyle = (anim: Anim, s: number): React.CSSProperties => ({
  display: 'inline-block', whiteSpace: 'pre', opacity: s,
  transform: anim === 'rise' ? `translateY(${(1 - s) * 0.6}em)` : anim === 'pop' ? `scale(${0.4 + 0.6 * s})` : anim === 'drop' ? `translateY(${(s - 1) * 0.8}em) rotate(${(1 - s) * -8}deg)` : undefined,
  filter: anim === 'blur' ? `blur(${(1 - s) * 12}px)` : undefined,
});

/** Thai text revealed unit by unit. by='word' (Intl.Segmenter word breaks) or 'grapheme' (never splits a vowel/tone mark from its letter). */
export const Kinetic: React.FC<{ text: string; by?: 'word' | 'grapheme'; anim?: Anim; delay?: number; stagger?: number; style?: React.CSSProperties; damping?: number; out?: number }> = ({ text, by = 'word', anim = 'rise', delay = 0, stagger, style, damping = 15, out }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const units = seg(text, by);
  const st = stagger ?? (by === 'word' ? 4 : 1.5);
  const o = out !== undefined ? interpolate(f, [out, out + 10], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  return (
    <span style={{ lineHeight: 1.35, ...style, opacity: o }}>
      {units.map((u, i) => <span key={i} style={unitStyle(anim, spring({ frame: f - delay - i * st, fps, config: { damping, stiffness: 140 } }))}>{u}</span>)}
    </span>
  );
};

/** Line slides up from behind an invisible mask: the classic premium title reveal. */
export const MaskReveal: React.FC<{ children: React.ReactNode; delay?: number; dur?: number; style?: React.CSSProperties }> = ({ children, delay = 0, dur = 22, style }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [delay, delay + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const e = 1 - Math.pow(1 - t, 4);
  return (
    <div style={{ overflow: 'hidden', paddingTop: '0.25em', paddingBottom: '0.15em', lineHeight: 1.35, ...style }}>
      <div style={{ transform: `translateY(${(1 - e) * 110}%)` }}>{children}</div>
    </div>
  );
};

/** Letter-spacing settles from wide to final while fading in: quiet luxury. Thai graphemes stay intact. */
export const Tracking: React.FC<{ text: string; from?: number; to?: number; delay?: number; dur?: number; style?: React.CSSProperties }> = ({ text, from = 0.6, to = 0.08, delay = 0, dur = 45, style }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [delay, delay + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const e = 1 - Math.pow(1 - t, 3);
  return <span style={{ letterSpacing: `${from + (to - from) * e}em`, opacity: e, filter: `blur(${(1 - e) * 6}px)`, lineHeight: 1.35, whiteSpace: 'pre', ...style }}>{text}</span>;
};

/** Typewriter by grapheme, with a blinking caret. cps = graphemes per second. */
export const Typewriter: React.FC<{ text: string; delay?: number; cps?: number; caret?: boolean; style?: React.CSSProperties }> = ({ text, delay = 0, cps = 14, caret = true, style }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const g = seg(text, 'grapheme');
  const n = Math.max(0, Math.min(g.length, Math.floor(((f - delay) / fps) * cps)));
  return <span style={{ lineHeight: 1.35, whiteSpace: 'pre-wrap', ...style }}>{g.slice(0, n).join('')}{caret && <span style={{ opacity: Math.floor(f / 15) % 2 ? 0 : 1 }}>▍</span>}</span>;
};
