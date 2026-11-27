# Action trailers (ตัวอย่างหนังแอคชั่น)

`examples/last-train` (`LastTrain`, 48 s, 1920×1080, 24 fps, 120 bpm → 1 bar = 48 frames) is a full code-only trailer:
`director.py init <project> --caps trailer` copies it, writes the score and fetches Kanit + Chakra Petch. Use it as a
kit and a recipe; write a new story, characters and look for every brief.

## Shape (24 bars)

| Act | Bars | What happens |
|---|---|---|
| Hook | 0–6 | quiet detail (puddle, eye), one establishing shot, clock ticking on the beat |
| Rise | 6–18 | cards between shots, each shot one action beat; braam on each new location, 16th-note pulse rising |
| Peak | 18–20 | accelerating montage: cut lengths 12 → 8 → 6 → 4 → 3 frames, a hit on every cut, riser underneath |
| Drop | 20–21 | hard cut to black and silence, one line of text, two heartbeats |
| Title | 21–24 | title slam (sub hit + braam + metal clang + sparks), subtitle tracks in, release card + billing block |

Cards are black with one short line; slam cards (0.5 bar) for threats, slow cards (1 bar) for setup.

## Look

- `fx.tsx`: `Letterbox` (2.39 scope), `Grade` (teal shadows / warm highlights), `Grain`, `Vignette`, `Shake` and
  `Chroma` driven by one `HITS` list, `Flash` frames on the biggest hits, `rain`, `splashes`, `glow`, `streak`
  (anamorphic flare), `tower` (2D skyline building with setbacks, side shade, floor-true windows, crown/antenna).
- `city3d.tsx`: `City3D` night city that does not read as boxes (tiered towers, podiums, cornices, glass vs. concrete
  window atlases with UVs in metres, roof tanks/AC/antennas/helipads, Thai neon signs) and `NightSky` (light-pollution
  dome, distant skyline ring, haze).
- `figure.ts`: 2D silhouette with run / leap / dive poses and a rim light; `FigurePlane` puts it into 3D shots.
- Slow motion = remap time inside the shot (`remap(f, a, b, 0.3)`); impacts land on beats.
- The user asked for action, so energetic transitions are allowed (editing-craft section 0); keep each effect tied to a
  hit, never on every frame.

## Sound

`score.py` (numpy only) builds the whole soundtrack from the storyboard bars: ticks, braams, pulse ostinato, taiko,
sub hits, thunder, glass, engine, explosion, train screech, riser, heartbeat, title clang, simple reverb, soft clip.
Edit the arrangement block to move cues; times are `starts[scene] + frames / FPS`, so picture and sound share a clock.
Run it again after changing the storyboard: `python3 src/last-train/score.py`.
