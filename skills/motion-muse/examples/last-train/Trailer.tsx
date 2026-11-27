// LAST TRAIN example: setup is `director.py init <project> --caps trailer` (copies this folder, writes public/audio/trailer/score.wav with score.py, fetches Kanit + Chakra Petch).
// ขบวนสุดท้าย (LAST TRAIN): a code-only action trailer. 120 bpm, 24 fps → 1 bar = 48 frames.
import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import sb from './storyboard.json';
import { barTimeline, meter } from '../lib/meter';
import { Chroma, Flash, Grade, Grain, Letterbox, Shake, Vignette, impact } from './fx';
import { Card, Case, Eye, Open } from './shots-a';
import { Blast, Roof, Silence, Title } from './shots-b';
import { Aerial, Glass, Highway, Train } from './shots3d';

export const FPS = sb.fps;
export const M = meter({ bpm: sb.music.bpm, fps: sb.fps, beats: sb.music.beats, offset: sb.music.offset });
export const SHOTS = barTimeline(M, sb.scenes.map((s) => [s.id, s.bars] as [string, number]));
export const TOTAL = SHOTS[SHOTS.length - 1].from + SHOTS[SHOTS.length - 1].dur;
const at = (id: string, plus = 0) => SHOTS.find((s) => s.id === id)!.from + plus;

// accelerating montage: [shot, source frame, length]
const CUTS: [string, number, number][] = [
  ['roof', 50, 12], ['case', 38, 12], ['highway', 60, 8], ['blast', 12, 8], ['glass', 30, 6], ['train', 30, 6], ['eye', 30, 4], ['roof', 62, 4],
  ['highway', 80, 4], ['blast', 22, 4], ['case', 44, 4], ['train', 50, 3], ['glass', 46, 3], ['blast', 30, 3], ['roof', 52, 3], ['highway', 50, 3], ['train', 70, 3], ['case', 46, 3], ['eye', 24, 3],
];
const MONTAGE_STARTS = CUTS.reduce<number[]>((a, c, i) => [...a, i ? a[i - 1] + CUTS[i - 1][2] : 0], []);

const shotEl = (id: string): React.ReactNode => ({
  open: <Open />, aerial: <Aerial />, eye: <Eye />, case: <Case />, roof: <Roof />, glass: <Glass />, highway: <Highway />, blast: <Blast />, train: <Train />,
  card1: <Card text="เธอมีเวลาหนึ่งชั่วโมง" dur={48} />, card2: <Card text="ทั้งเมืองตามล่าเธอ" slam dur={24} />, card3: <Card text="ไม่มีทางถอย" slam dur={24} />,
  silence: <Silence />, title: <Title />, montage: <Montage />,
} as Record<string, React.ReactNode>)[id];

const Montage: React.FC = () => (
  <AbsoluteFill style={{ background: '#000' }}>
    {CUTS.map(([id, src, len], i) => (
      <Sequence key={i} from={MONTAGE_STARTS[i]} durationInFrames={len}>
        <Sequence from={-src}>{shotEl(id)}</Sequence>
      </Sequence>
    ))}
  </AbsoluteFill>
);

// frames where the camera takes a hit (global)
const HITS = [
  at('open', 70), at('case', 6), at('case', 24), at('roof', 50), at('glass', 6), at('highway', 46), at('blast', 6), at('train', 24),
  ...MONTAGE_STARTS.map((s) => at('montage', s)), at('title'),
];
const FLASHES = [at('roof', 50), at('blast', 6), at('title'), ...MONTAGE_STARTS.filter((_, i) => i > 5 && i % 3 === 0).map((s) => at('montage', s))];

export const LastTrain: React.FC = () => {
  const f = useCurrentFrame();
  const ca = impact(f, HITS, 4) * 9;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Chroma d={ca} id="ca">
        <Shake hits={HITS} amount={22}>
          <Grade>
            {SHOTS.map((s) => (
              <Sequence key={s.id} from={s.from} durationInFrames={s.dur} name={s.id}>{shotEl(s.id)}</Sequence>
            ))}
          </Grade>
        </Shake>
      </Chroma>
      <Flash hits={FLASHES} len={1} />
      <Vignette strength={0.65} />
      <Grain amount={0.14} />
      <Letterbox />
      <Audio src={staticFile(sb.music.file)} />
    </AbsoluteFill>
  );
};
