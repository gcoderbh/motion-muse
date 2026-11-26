# Changelog

## 1.7.0

- `director.py render --draft`: half-resolution render with its own cache and `-draft` output, for quick review rounds.
- `director.py render --formats 9:16,1:1,16:9` (or `WxH`): one storyboard → one MP4 per size, separate scene caches, shared audio mix.
- `director.py cover`: picks a sharp, still frame for the thumbnail; with `--title` renders the new `Cover` composition (Thai title inside the safe zone).
- QA writes `<video>.safe.jpg` with the platform UI zones in red and warns about scenes whose `textY` is outside the safe band.
- `lib/layout.ts` (`useFormat`: safe box, `u()`, `pick()`), `lib/SafeGuides.tsx` (Studio-only guides), `lib/physics.ts` (projectile, bounce, settle, buoyancy, fill/glug, crown, pulse).
- `three.tsx` product kit: `tone="agx"`, `kelvin`, `KeyLight`, `useCanvasTexture`, `labelSize`, `LabelWrap`, `MAT`, `useBlindsGobo`; `typography.tsx` `useThaiFontReady`.
- `examples/cold-brew`; `director.md` sections 7 (layout, safe zones, formats) and 8 (product ads); SKILL.md render/QA now points to `director.py`, new file table and shorter description.

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
