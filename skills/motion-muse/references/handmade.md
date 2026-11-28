# Handmade look: music-timed shots, turning heads, ink and paint, one motif

Use this when the brief wants something that looks drawn by a person (วาดมือ, ลายเส้น, สีน้ำ, นิทาน, อบอุ่น,
"ไม่อยากให้ดูเป็น AI"), and for any story film with characters. The parts work alone or together;
`examples/paper-plane` uses all of them (`init --caps handmade` copies and registers it).

Invent the look for each brief: palette, line weight, paper colour, how much wobble, what the motif is.
The example is a demonstration of the tools, not a house style: never reuse its story, colours or framing as is.

## 1. Cut on the music's bars (`lib/meter`)

A shot that ends on a bar line feels edited; one that ends at "3.2 s" feels placed by a timer.

- Get the BPM and first downbeat with `scripts/beat-grid.py song.mp3 --fps 30`. Start the music on that downbeat
  (`<Audio startFrom>`), so frame 0 is bar 1 beat 1.
- In the storyboard, add `"music": { "bpm": 96, "beats": 4 }` and give scenes `"bars": 1.5` instead of `"dur"`.
  `director.py check` converts bars to frames, prints each scene's length in bars and warns about cuts that are off the beat.
- In the composition, `barTimeline(meter({ bpm, fps, beats }), scenes)` gives the same frames (same rounding), and
  `M.at(bar, beat)` places keys, SFX and accents on the music. `M.pulse(f)` is a 1 → 0 decay on each beat for small things
  (a tail tick, a light flicker), never for camera shake.
- Mix lengths: ½, 1, 1½ and 2 bars. All-equal bars reads as machine-made just like all-equal seconds. Put the longest shot
  where the story breathes and the shortest just before the payoff.
- 6/8 or 12/8: count the felt beat (dotted quarter) as `bpm` and set `beats` to 2 or 4.

## 2. Heads that turn to any angle (`lib/head` `TurnHead`)

The face is designed once, front-on, on a 3D head shape, and projected for any `yaw` / `pitch` / `roll` every frame, so
the face stays the same character at every angle and turns are smooth instead of popping between drawn views.

- `yaw`: 0 front, ±π/2 profile, π back (+ turns to the viewer's right). `pitch` + looks up, `roll` tilts.
- `hairStyle` (`short`, `fringe`, `bob`, `long`, `spiky`, `bald`), `expr` (8 expressions), `blink`, `talk` (0..1 mouth open),
  `gaze` (pupils), `jaw` (chin width), `light` (cel shadow follows the turn), `skin`, `hair`, `ink`.
- Make a head look at something by computing yaw from that thing's position (the example's `Catch` follows the motif
  with `motifAt`), then blend in a few frames of the earlier value so the turn lags like a real head.
- Turn the head first, eyes slightly ahead of it, body last. Add a little roll on fast turns.
- For full bodies keep using `lib/flat` / `lib/slim`; `TurnHead` is for close-ups, mediums and characters drawn from the
  shoulders up.

## 3. Ink and paint (`lib/ink`)

| Piece | Use |
|---|---|
| `Handmade` | wrap any SVG art (flat characters, city sets, diagrams): edges wobble and "boil" every 3 frames, fills get a gouache grain |
| `Ink` | a hand stroke through points: tapered ends, pressure, tremble; `draw` 0..1 draws it on along its length |
| `DryBrush` | a brush stroke that breaks into bristles toward the end (ground lines, sills, accents) |
| `Wash` | watercolour / gouache fill with bleeding edges and pigment pooling (skies, walls, shadows) |
| `Paper` | paper base with fibres and vignette; a second, lighter `Paper` on top unifies everything |
| `onTwos(f)` | hold a value for 2 frames (animation on twos) for anything that should feel hand-animated |
| `rng(seed)` | seeded random, the only randomness allowed |

Rules: one line weight family per film (outlines 5–9 px, details 2–4 px at 1080 wide); draw lines on in the order a
person would (outline, then windows, then details), a few frames apart; let washes sit slightly outside their lines;
boil on twos or threes, not every frame (it shimmers); keep the paper still.

## 4. One motif through the whole film (`lib/motif`)

Pick one object (or sound, or colour) that belongs to this story and carry it through every scene: it is introduced,
travels, changes, and comes home in the last shot. It turns separate shots into one story and gives every cut a reason.

- In the storyboard: `"motif": { "name": "...", "what": "what it means" }` and a `"motif": "how it appears"` line on each scene.
  `check` warns if it is missing from the first or last scene or absent for more than two scenes in a row.
- `MotifLayer` draws it above all scenes on the film's own timeline from `MotifKey`s (`ease`, `linear`, `arc`, `hold`).
  A `hold` key is a cut: the motif jumps to where it is in the next framing. Keep its screen position and direction
  across a cut (exit right → enter left) and the cut becomes a match cut for free.
- The render function gets the pose (`dir`, `speed`, segment) and the frame, so the object can bank, flutter, or change
  state (folded → flying → opened).
- When the object itself cannot be on screen, echo it: its shadow, its sound, the same shape in the set.

## 5. Sound made from formulas (`scripts/synth-sfx.sh`)

`bash "$SKILL_DIR/scripts/synth-sfx.sh" public/audio/synth <bpm> <bars> [root-hz]` writes the basic set plus a handmade
set (`pencil`, `brush`, `paper`, `fold`, `knock`, `thud`, `pluck`, `bell`, `flutter`), all synthesized with ffmpeg (no
licence needed), and with a bpm also `bed.wav`: a soft plucked pulse in that tempo to cut against when there is no song yet.
`pluck` and `bell` are tuned to `root-hz` so they sit in the bed's key. Place each SFX on `M.at(bar, beat)`, not at a
time in seconds. Every sound is a formula in the script: change a number for a sound nobody else has. No synthesized
singing or voices.

## 6. Frame-count QA

`director.py render` counts the frames of every scene clip (packets, not the container's duration) and stops if one
differs from the storyboard; a cached clip with the wrong count is rendered again. The final QA prints
`frames got/want` for the whole film. A mismatch means a scene was dropped, doubled or cut short: fix it before delivery.
