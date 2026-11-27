// Musical time in frames. Cut on bar lines and shots feel edited to the song instead of placed on a clock.
// Start the music at its first downbeat (beat-grid.py prints it; use <Audio startFrom>) so frame 0 is bar 1, beat 1.
// 6/8 or 12/8: count the felt beat (dotted quarter) in bpm and set beats to 2 or 4.

export type Meter = { bpm: number; fps: number; beats?: number; offset?: number };

export const meter = ({ bpm, fps, beats = 4, offset = 0 }: Meter) => {
  const beat = (60 / bpm) * fps;
  const bar = beat * beats;
  const at = (bars: number, plusBeats = 0) => Math.round(offset + bars * bar + plusBeats * beat);
  return {
    beat,
    bar,
    /** frame where a bar (0-based, fractions ok) and beat start */
    at,
    /** length in frames of n bars (round once, from the start, so long timelines do not drift) */
    bars: (n: number, from = 0) => at(from + n) - at(from),
    beatsLen: (n: number) => Math.round(n * beat),
    /** nearest beat, half bar or bar line */
    snap: (f: number, unit: 'beat' | 'half' | 'bar' = 'beat') => {
      const u = unit === 'bar' ? bar : unit === 'half' ? bar / 2 : beat;
      return Math.round(offset + Math.round((f - offset) / u) * u);
    },
    /** 0 on each beat rising to 1 just before the next */
    phase: (f: number) => ((((f - offset) / beat) % 1) + 1) % 1,
    /** 1 on the beat, decaying (frames) until the next: for small pulses, not for camera shake */
    pulse: (f: number, decay = 5) => Math.exp(-((((f - offset) % beat) + beat) % beat) / decay),
  };
};

export type Shot = { id: string; from: number; dur: number };

/** Shot list in bars → frames (first shot starts at frame 0; same rounding as director.py "bars"). Lengths of ½, 1, 1½ and 2 bars mixed read as cut by a person. */
export const barTimeline = (m: ReturnType<typeof meter>, shots: [string, number][]): Shot[] => {
  let b = 0;
  return shots.map(([id, n]) => {
    const a = b === 0 ? 0 : m.at(b);
    const s = { id, from: a, dur: m.at(b + n) - a };
    b += n;
    return s;
  });
};
