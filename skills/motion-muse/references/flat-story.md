# Flat 2D stories: side views, indoor sets, voice lip-sync, camera, FX, long episodes, thumbnails

Guidance for flat big-head episodes (`lib/flat` + `lib/city` + `lib/story`, example `examples/life-time`). There is no
ready code for the sections below: write it in the project, keep it deterministic (`useCurrentFrame()`, seeded noise),
and once a piece works and the user is happy, count it with `scripts/learn.py use <name>` (section 8). A piece used 3
times is turned into a reusable component and saved with `learn.py save`, so later videos copy it instead of rewriting it.

House style for everything new: fills with an outline in `edge(fill)` (the fill darkened to ~62 %), round joins, no
gradients on characters, sets less saturated and lighter than the characters, the same `ground` line for every set.
Invent your own shapes; never trace a reference channel's characters, sets or logos.

## 1. Side and three-quarter views

`FlatCharacter` is front-only. Add a `turn` value 0 → 1 (0 front, 0.5 three-quarter, 1 profile) instead of separate
drawings, so a character can turn smoothly and every look/outfit keeps working.

- Head: shift the face (eyes, brows, nose, mouth) towards the facing side by `turn * 0.45 * HW`; the far eye shrinks to
  ~80 % width at 0.5 and disappears at 1; the far ear disappears from 0.3; the near ear moves back to ~0.15 HW behind the
  centre at 1. Hair: shift the parting and fringe the same way; long hair falls behind the far shoulder.
- Profile mouth: half the D shape on the front edge of the head; still driven by `mouth`.
- Body: torso width × (1 − 0.35·turn); collar and badge slide with the chest and the badge is hidden past 0.7 (text
  would read squashed). The far arm is drawn behind the torso from 0.3; the near arm in front.
- Legs in profile walk forwards and back (stride along x, ±25°) instead of the front-view lift; reuse `flatWalk` phase.
- Facing left/right is still `dir`; `turn` only says how far from the camera.
- Turning: 6–8 frames with ease-in-out, blink in the middle (hides the jump), a small head lead (head turns 2 frames
  before the body). Two people talking: both at ~0.45 facing each other; the listener nods (`head` ±4°).

## 2. Indoor sets

Make each set one component like `lib/city` (`{ w, h, ground, night?, seed? }`), with 3 layers you can put in
`<Layer depth>`: back wall, furniture, foreground (desk edge, plant, shelf) so the camera can move with parallax.

| Set | Must read at a glance | Sound bed |
|---|---|---|
| Office | rows of desks, monitors, window with `CityBackdrop` behind, ceiling lights | keyboard, air-con hum |
| Condo room | bed, small window with the skytrain, fan, clothes rack | fan, distant traffic |
| Convenience store | shelves of colour blocks, fridge with glass doors, counter + till, door | door chime, fridge hum |
| Hospital | queue-number screen, rows of chairs, counter, curtain | queue ding, murmur |
| Market | stalls with striped awnings, hanging bulbs, crates of fruit | crowd, vendor calls |
| BTS station | platform, yellow line, screen doors, train arriving (`Skytrain` colours) | door chime, train hum |

- Scale: a door is ~1.3× a character's height at scale 1; counters reach the waist (`HIP_Y`), desks a bit lower.
- Brands and signs: invent shop names and logos (no real 7-Eleven, BTS or hospital marks). Thai signs in the project
  font with `lineHeight ≥ 1.3`.
- Keep the floor plane flat and the horizon at the same height across shots of the same set, so cuts match.
- Night: darken the walls ~35 %, warm the light sources, add a soft light pool on the floor.

## 3. Mouths from a recorded voice

Default is no voice. If the user records or approves voice (ElevenLabs only after asking, SKILL.md §5):

1. One audio file per line (`public/audio/vo/<line-id>.wav`). If they sent one long take, cut it per line with the word
   times from `scripts/transcribe.py`.
2. Time the lines to the audio: line `dur` = audio length + 4–8 frames, instead of the Thai reading-speed estimate.
3. After `story.py build`, add `file` and `env` to every line in `timeline.json`. `env` is one value 0–1 per frame:
   RMS loudness per frame (`ffmpeg … astats=metadata=1:reset=1` with one window per frame, or numpy), mapped from about
   −45 dB → 0 to −12 dB → 1, smoothed with fast attack (1 frame) and slower release (3 frames).
4. `mouthOf()` already uses `env` when it is there, and `StoryAudio` plays the `file`s and ducks the music.
5. Check: the mouth is closed in pauses longer than 4 frames, and opens on the first syllable, not before it.

## 4. Camera moves in 2D

Wrap the set and the characters in one camera group (or `Parallax` `cam`), and keep subtitles, HUD badges and the safe
zone outside it.

- Push-in: zoom 1.00 → 1.06–1.10 over the whole shot, ease-in-out. For calm talking shots.
- Snap zoom on a shocked face: 1.0 → 1.3–1.4 in 4–6 frames with a slight overshoot, centred between the eyes, plus
  `ShockLines` and a whoosh/hit SFX; hold, then cut away rather than zooming back.
- Pan to the speaker: target x from `speakerAt(T, f)` and that character's x, start 6 frames before the line, travel
  12–18 frames, critically damped (no bounce). Do not pan for lines shorter than 1 s; cut instead.
- Impact shake: 8–12 frames, 6–10 px, seeded noise, decaying.
- At most one camera move every 3–4 s; never crop the top of a head (keep `headTop` 6 % inside the frame).

## 5. More cartoon FX

Place every effect relative to `flatJoints(pose, look)` (`head`, `headTop`) so it follows the character.

- Blush: 3–4 short diagonal lines on each cheek + a pink oval at 40 % opacity, fade in over 8 frames.
- `?` mark: pops above `headTop` with an overshoot (0 → 1.15 → 1), wobbles ±6°.
- Idea bulb: pops above the head, rays spin in, "ding" SFX on the pop frame.
- Tears: two streams from under the eyes, drops fall with gravity and fade; for sobbing add a 2 px body shake.
- Soul leaving: a translucent white copy of the character floats up 120–200 px with a sine sway and fades out while the
  body slumps (`lean`, `bob`) and the eyes turn to spirals or X.
- Keep effects short (0.5–1.5 s) and one per character at a time.

## 6. Long episodes (5–10 min)

- Structure: cold-open hook (5–15 s) → title card (3 s) → 3–5 chapters, each opened by a 2 s chapter card → twist or
  punchline → end card with a question for the comments (5 s).
- One `script.json` per chapter (or ≤ 40 scenes per file) so `story.py build` and reviews stay small; keep the cast in one
  shared `cast.ts` so looks never drift between chapters.
- Render with `director.py render`: scenes are cached, so after a change only that scene renders again. Show the user a
  draft of the first chapter before rendering the rest.
- Pacing: 8–12 shots a minute; change framing (wide / medium / close) every 3–6 s; change the music between chapters.

## 7. Thumbnails for flat episodes

- Size 1280×720 (16:9) or 1080×1920; render a `Thumb` composition with `npx remotion still` (or `director.py cover`
  if this version has it).
- One character, big: the head fills 40–50 % of the height, an extreme expression (shocked, crying, smug).
- Headline: 2–6 Thai words in a heavy font, two colours max, thick outline (`paint-order: stroke`), `lineHeight ≥ 1.3`.
- One prop or number that tells the story (e.g. a "312 ปี" badge, a transfer slip).
- Keep text and faces out of the bottom-right corner (video length badge). Check it is still readable scaled to 320 px wide.
