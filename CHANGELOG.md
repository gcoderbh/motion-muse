# Changelog

## 2.1.0

Handmade look, ideas studied from code-only films and rewritten from scratch (no code, characters or style copied).

- `lib/meter`: musical time in frames (`meter`, `at(bar, beat)`, `snap`, `phase`, `pulse`, `barTimeline`). Storyboards take
  `"music": { "bpm", "beats" }` and scene `"bars"`; `director.py check` prints lengths in bars and warns about off-beat cuts.
- `lib/head` `TurnHead`: a 2D cartoon head designed once front-on and projected for any yaw / pitch / roll, with 6 hair
  styles, 8 expressions, blink, talk, gaze, jaw width and a cel shadow that follows the turn.
- `lib/ink`: `Ink` (tapered pressure strokes, draw-on), `DryBrush`, `Wash`, `Paper`, `Handmade` (wobble, boil on twos,
  gouache grain), `spline`, `onTwos`, seeded `rng`.
- `lib/motif`: `MotifLayer` / `motifAt` carry one object across cuts on the film timeline (`ease`, `linear`, `arc`, `hold`);
  storyboard `"motif"` with per-scene lines, `check` warns when it drops out.
- `director.py render` checks every scene clip's frame count (re-renders a wrong cached clip, stops on a wrong new one);
  QA prints `frames got/want`.
- `synth-sfx.sh <dir> [bpm] [bars] [root-hz]`: handmade set (pencil, brush, paper, fold, knock, thud, pluck, bell, flutter)
  and a tempo `bed.wav`.
- `examples/last-train` (`LastTrain`, 48 s action trailer, 1920×1080 @ 24 fps, 120 bpm): `City3D` / `NightSky` night city,
  `fx` (scope, grade, grain, shake, RGB split, flash, rain, flares, 2D `tower`), silhouette `figure`, numpy `score.py`.
  Router capability `trailer` (`init --caps trailer`), `references/trailer.md`.
- `examples/paper-plane` (`PaperPlane`, 22.5 s, 9 bars at 96 bpm) and router capability `handmade`
  (`init --caps handmade` copies it, synthesizes the SFX and fetches Mali). `references/handmade.md`.

## 2.0.0

First major release: everything from 1.10.0 (charts, lyric/quote videos, app demos, brand kits, CSV batches,
calm transitions by default) and the place guides below ship together.

- Place guides: `scripts/place.py fetch` geocodes (Nominatim), pulls buildings / roads / water / parks (Overpass,
  mirrors tried in turn) as metres around the pin, and fetches open-licence photos and clips from Wikimedia Commons
  (CC0, PD, CC BY, CC BY-SA; geotagged + text search), cuts clips to MP4 and writes `place.json`, `CREDITS.md` and
  `PERMISSIONS.md`. Social links (TikTok, YouTube, IG, FB, Google Maps) are refused; `place.py permission` prints a
  Thai request to the owner.
- `kits/three/map3d.tsx`: `CityMap` (extruded OSM blocks, rise-in, highlighted building), `MapPin`, `flyTo` (log
  zoom), `screenOf`, `MapLights`, `MAP_STYLES`, `OsmCredit`. `Stage3D` takes `far`.
- `examples/food-spot` `FoodSpot`: fly-in + pin card, credited photos (slow Ken Burns), one clip, end card with
  address and all credits; calm edit. Router capability `place` (`init --caps place` copies it and registers it).
- `references/place-guide.md`.

## 1.10.0

- `lib/chart`: `BarChart` (vertical / horizontal, stagger, highlight), `LineChart` (self-drawing, value on the tip),
  `Donut`, `BarRace` + `raceFrames`, `CountUp`, `fmtTH` (Thai number format, compact "ล้าน").
- `lib/lyrics`: `LyricTrack` (`karaoke` grapheme fill, `pop` words, `quote` card), `parseLRC`, `fromCaptions`
  (transcribe.py word times).
- `lib/device`: `Phone`, `Laptop`, `Browser`, `Cursor` (pointer or finger, click ripple), `ZoomTo`, `ScrollShot`, `keyed`.
- `lib/brand`: `Brand` JSON, `BrandProvider` / `useBrand`, `Logo`, `BrandIntro`, `BrandOutro`, `LowerThird`, `Watermark`.
- `Basics.tsx` compositions `DataReel`, `BarRace`, `LyricReel`, `AppPromo`, `PromoCard` (JSON props, all formats).
- `scripts/batch.py`: one video or still per CSV/JSON row, dotted columns nest, `--base` shared props, `--formats`,
  bundles once, skips finished files, `report.csv`. `examples/batch-menu`.
- Calm transitions by default (`editing-craft.md` section 0, SKILL.md step 2.5, pacing table, checklist): mostly hard cuts,
  at most one soft transition per 10 s, none between steps, slow rare camera pushes; flashy counts only if the user asks.
  `AppPromo` is one continuous shot: screens slide inside a still phone, optional gentle `zoom` per step.
- `references/basics.md`; router capabilities `chart`, `lyrics`, `device`, `brand`, `batch` (`data-viz` is now maps / d3 scales).

## 1.9.0

- `references/flat-story.md`: guidance (no example code) for flat 2D episodes: side / three-quarter views with a `turn`
  value, six indoor sets, mouths from a recorded voice (`env` per frame), 2D camera moves, blush / `?` / idea bulb /
  tears / soul FX, 5–10 min episodes, thumbnails.
- `scripts/learn.py`: a notebook on the user's machine (`~/.motion-muse`, or `$MOTION_MUSE_HOME`): `show`, `note`,
  `use` (prints `PROMOTE` after 3 uses), `save` / `get` reusable code, `forget`, `pause` / `resume`, `export` / `import`.
  Refuses text that looks like a secret. `director.py route` and `init` print it; SKILL.md section 8.

## 1.8.0

- `director.py render --draft`: half-resolution render with its own cache and `-draft` output, for quick review rounds.
- `director.py render --formats 9:16,1:1,16:9` (or `WxH`): one storyboard → one MP4 per size, separate scene caches, shared audio mix.
- `director.py cover`: picks a sharp, still frame for the thumbnail; with `--title` renders the new `Cover` composition (Thai title inside the safe zone).
- QA writes `<video>.safe.jpg` with the platform UI zones in red and warns about scenes whose `textY` is outside the safe band.
- `lib/layout.ts` (`useFormat`: safe box, `u()`, `pick()`), `lib/SafeGuides.tsx` (Studio-only guides), `lib/physics.ts` (projectile, bounce, settle, buoyancy, fill/glug, crown, pulse).
- `three.tsx` product kit: `tone="agx"`, `kelvin`, `KeyLight`, `useCanvasTexture`, `labelSize`, `LabelWrap`, `MAT`, `useBlindsGobo`; `typography.tsx` `useThaiFontReady`.
- `examples/cold-brew`; `director.md` sections 7 (layout, safe zones, formats) and 8 (product ads); SKILL.md render/QA now points to `director.py`, new file table and shorter description.

## 1.7.0

- `FlatCharacter` now has `finish: 'soft'` by default: two-tone cel shading on the head, limbs, hands and torso, a hair
  shine, cast shadows from the fringe, chin and collar, and one key light (`light: 'left' | 'right'`) that stays on the
  same side of the screen when a character is mirrored. Use `finish: 'flat'` for the old single fills.
- `references/character-design.md`: rules for designing good-looking 2D characters in code (silhouette, proportions,
  colour, lines, cel shading, faces, posing, outfits, a checklist with a rendered still).
- Flat characters turn: `pose.yaw` 0 front, 0.5 three-quarter, 1 side, 2 back (face, ears, hair, badge and arms follow).
- Two-bone legs (`hipL/hipR`, `kneeL/kneeR`) and presets `sit`, `slump`, `sitFloor`, `lie`, `lieSide`; `FLAT_SEAT`,
  `flatPlant()` keeps feet on the ground.
- Physics helpers: `flatStride()` side walk with `FLAT_STRIDE`, `flatJump()` (anticipation, stretch, springy landing),
  `pose.air` with a shrinking ground shadow, `pose.squash`, `pose.roll`.
- Guide sections on turning, sitting and lying, physics and weight, and how to invent a pose from a description.
- `starter/src/lib/slim.tsx`: `SlimCharacter`, a second body with real proportions (about 6 heads), no outlines, one
  shadow tone, finger hands (`relaxed`, `open`, `fist`, `point`, `thumb`, `peace`, `ok`, `pocket`), a face mask, and hair
  that is a cap on the skull so it covers the head at every angle. Same `FlatPose` as `FlatCharacter`; `SLIM_LOOKS`,
  `SLIM_POCKETS`, `slimReach()`, `SlimHead`, `SlimHandShape`, `SLIM_STRIDE` (walk travel per cycle). `FLAT_LEG` is exported.

## 1.6.0

- Flat 2D cartoon explainers: `starter/src/lib/flat.tsx` (`FlatCharacter`: big head, `FLAT_LOOKS` office / rider /
  tycoon / auntie / student / officeWoman / vendor, 9 hair styles, tee / shirt / vest / suit / dress / apron, ties,
  lanyard badges, vest numbers, glasses, mustache, 10 expressions, `FLAT_POSES`, `flatWalk`, `flatIdle` with talk
  gestures, held props, `Sweat` / `ShockLines` / `AngerMark` / `Sparkles`).
- `starter/src/lib/city.tsx`: Bangkok street sets (`CityBackdrop` day/night, `Skytrain`, `Street`, `Car` with taxi,
  `Motorbike`, `TrafficLight` with countdown, `RoadSign`, `Rooftop`, `Bushes`) and story HUD (`TimeBadge`, `NoteCard`,
  `TransferSlip`, `fmtLife`, `fmtNum`).
- `director.py` capability `flat`. Example `examples/life-time` (16:9, 33 s, 6 shots, subtitles + SFX + music, no voice).

## 1.4.1

- Toon people no longer look like zombies: warm, lighter cel shadows on skin (zombies keep their sickly shade),
  closed-mouth smile for every non-zombie face, a highlight in `dot` eyes, smooth elbows and rounder hands.

## 1.4.0

- Toon characters: `princess` preset; parts `hair: 'long' | 'ponytail'`, `outfit: 'skirt' | 'gown'` with `dress` and
  `trim`, `sleeves: 'puff'`, `cape`, `hat: 'crown' | 'tiara'` with `hatColor` and `gem`, `lashes`, `blush`.
- Cuter girls' faces and outfits: `eyes: 'big'` (large irises with highlights, lid line, curved smile), soft bangs
  on long and ponytail hair, bell-shaped skirts and gowns (`bell()` lathe).
- Character library: `characters/cast.json` in the skill, copied to `src/lib/cast.json` by `init --caps toon` and
  merged into `LOOKS`. `story.py cast list | pull | save | palette` saves a character made in a project, reuses it,
  and reads the main colours of a reference picture.
- `references/toon-characters.md`: making characters and outfits, from a reference picture, adding parts, saving them.

## 1.3.0

- Toon stories: `starter/kits/three/toon.tsx` (cel-shaded characters with ink outlines, presets and variants, blink,
  gaze, brows and talking mouths, 360° turns, office / shop / street / graveyard sets, Thai signs), `lib/story.tsx`
  (subtitles with name tags, SFX and music from one timeline) and `scripts/story.py build` (script.json → timeline,
  storyboard, VTT). No voice-over unless asked. `director.py` capability `toon`.
- OpenFilm: `story.py openfilm` exports a rendered storyboard as an OpenFilm project (shots, captions, SFX and music
  tracks). `skills/toon-story/` with `openfilm.json` makes the repo an OpenFilm skill.
- `director.py render` passes storyboard `props` to Remotion. `Stage3D` takes `tone="none"` for flat colours.
- Example `examples/zombie-id` (52 s, 8 shots).
