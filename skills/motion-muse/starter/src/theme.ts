import { continueRender, delayRender, staticFile } from 'remotion';

export const C = {
  paper: '#FFF7EC',
  ink: '#16130F',
  coral: '#FF5A36',
  blue: '#2F6BFF',
  yellow: '#FFD23F',
  mint: '#3DDC97',
  white: '#FFFFFF',
};

export const FPS = 30;
export const BEAT = (60 / 123) * FPS;
export const b = (k: number) => Math.round(k * BEAT);
export const MUSIC_START_SEC = 0.114 + 64 * (60 / 123);
export const FONT = 'Prompt, sans-serif';

const weights: [string, number][] = [
  ['Prompt-Light', 300],
  ['Prompt-Medium', 500],
  ['Prompt-Bold', 700],
  ['Prompt-Black', 900],
];

if (typeof document !== 'undefined') {
  const handle = delayRender('fonts');
  Promise.all(
    weights.map(([file, weight]) => {
      const f = new FontFace('Prompt', `url(${staticFile(`fonts/${file}.ttf`)})`, { weight: String(weight) });
      return f.load().then((loaded) => document.fonts.add(loaded));
    }),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
}
