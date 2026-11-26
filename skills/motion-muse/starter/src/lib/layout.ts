// Format-aware layout and platform safe zones. Design at the storyboard size; read sizes from here so the same
// composition renders 9:16, 1:1, 4:5 and 16:9 (director.py render --formats 9:16,1:1,16:9).
import { useVideoConfig } from 'remotion';

export type Box = { x: number; y: number; w: number; h: number };

/** Fractions of the frame that app UI covers. 9:16 values are a union of TikTok, Reels and Shorts (approximate:
 *  top bar, caption + username at the bottom, like/comment/share column on the right). Keep text and logos inside. */
export const SAFE = {
  vertical: { top: 0.12, bottom: 0.25, left: 0.06, right: 0.13 },
  feed: { top: 0.06, bottom: 0.1, left: 0.06, right: 0.06 },
  landscape: { top: 0.08, bottom: 0.12, left: 0.06, right: 0.06 },
};

export const safeFor = (w: number, h: number) => (h / w > 1.5 ? SAFE.vertical : w / h > 1.3 ? SAFE.landscape : SAFE.feed);

export const useFormat = () => {
  const { width: w, height: h } = useVideoConfig();
  const s = safeFor(w, h);
  const safe: Box = { x: w * s.left, y: h * s.top, w: w * (1 - s.left - s.right), h: h * (1 - s.top - s.bottom) };
  const short = Math.min(w, h);
  return {
    w, h, safe, short,
    portrait: h / w > 1.2, landscape: w / h > 1.2, square: Math.abs(w / h - 1) <= 0.2,
    /** scale a size designed for a 1080 px short side */
    u: (px: number) => (px * short) / 1080,
    /** pick a value per format */
    pick: <T,>(o: { portrait: T; square?: T; landscape?: T }) => (h / w > 1.2 ? o.portrait : w / h > 1.2 ? o.landscape ?? o.portrait : o.square ?? o.portrait),
  };
};
