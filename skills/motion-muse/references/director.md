# Universal Video Director (code-first)

Motion Muse turns a plain-language brief ("what the video is, style, mood, typography, story") into a finished MP4 using only code: React/SVG/CSS/Canvas/Three.js inside Remotion, assembled with FFmpeg.

**Never** use AI video generators, text-to-video or image-to-video APIs, and never require Blender. User-supplied or licensed images, fonts, 3D models (.glb), Lottie files and audio are fine.

## 1. Read the brief → creative plan

Pull these out of the brief (ask one question at most, only if the subject is unclear):

| Field | Example |
|---|---|
| Subject / message | "how zombie biology works" |
| Format | 9:16 social (default 1080x1920), 16:9 cinematic, 1:1 |
| Length | default 15–25 s |
| Visual style | stickman cartoon, flat vector, 2.5D paper cut-out, stylized low-poly 3D, premium product, diagram |
| Atmosphere | playful, eerie, calm, luxurious, energetic |
| Typography | Thai font by mood (section 4) |
| Story shape | explainer: hook → 3 facts → takeaway; horror: calm → unease → reveal; ad: reveal → detail → benefit → packshot/CTA |

## 2. Route capabilities → smallest toolset

```bash
python3 "$SKILL_DIR/scripts/director.py" route "<the brief>"          # prints capabilities, tech, npm to install
python3 "$SKILL_DIR/scripts/director.py" init ~/videos/<slug> --caps 3d,atmosphere,thai-type
```

`init` copies the starter (all 2D libs are plain React/SVG, no installs) and installs extra packages **only** for the capabilities that need them. Each scene can use different tech.

| Capability | Use | Packages | Pick when |
|---|---|---|---|
| `thai-type` | `lib/typography` | none | always |
| `character-2d` | `lib/characters` + `lib/pose` (Stickman, VectorCharacter, gaits, key poses, blink, talk) | none | cartoons, mascots, explainers |
| `diagram` | `lib/diagram` (Draw, Arrow, Callout, Flow, Ecg, Blob, Virus, GridPaper) | none | science, education, how-it-works |
| `parallax` | `lib/parallax` (Parallax/Layer depth, Sky, Ridge, Skyline, FogBand, Stars) | none | 2.5D worlds, side-scrollers, storybook |
| `atmosphere` | `lib/atmosphere` (GodRays, Fog, Particles, LightSweep, Glow, Vignette, Letterbox, Scanlines, Grade) | none | any mood/lighting, works over 2D, 3D and footage |
| `3d` | `lib/three` (Stage3D, CameraRig, observer, Figure, RuinedCity, Lathe, StudioLights, RoomEnv) | `@remotion/three three @react-three/fiber` | real camera moves through space, products, environments |
| `product` | `Lathe` + `StudioLights` (3D) or CSS layers with a user photo (2D) | (3d) | ads, packshots |
| `data-viz` | d3 scales/shapes, rendered as React SVG | `d3` | charts, maps |
| `canvas` | Canvas 2D redrawn from the frame number | none | thousands of particles, generative textures |
| `gsap` | paused GSAP timeline, `tl.seek(frame / fps)` | `gsap` | only if porting existing GSAP work |
| `lottie` | `@remotion/lottie` | `@remotion/lottie lottie-web` | only user-supplied/licensed Lottie files |
| `footage` | `FootageReel` + footage pipeline | none | real video (see footage-editing.md) |

Prefer SVG/CSS first; reach for 3D only when the camera must move through depth or light must wrap around an object. Canvas only for very high element counts.

## 3. Storyboard → `storyboard.json`

Write a storyboard next to the composition (`src/<slug>/storyboard.json`) and check it:

```bash
python3 "$SKILL_DIR/scripts/director.py" check src/<slug>/storyboard.json   # validates + prints the scene table
```

```json
{ "title": "...", "comp": "MyComp", "fps": 30, "width": 1080, "height": 1920,
  "style": { "look": "...", "palette": ["#..."], "thaiFont": "Mali", "music": "..." },
  "scenes": [ { "id": "hook", "dur": 96, "caps": ["character-2d", "thai-type"], "shot": "...", "motion": "...", "text": "...", "out": "zoom" } ] }
```

Rules: every scene has a `motion` (real movement: characters walk, camera travels, things draw on; never a static slide with a fade), scene lengths vary, the composition reads `dur` from the storyboard so plan and render cannot drift. Show the scene table to the user with the plan.

## 4. Thai typography

`useThaiFont(name)` loads a family from `public/fonts` and returns the CSS family; fetch files with `bash "$SKILL_DIR/scripts/thai-fonts.sh" public/fonts "<Family>"...` (all SIL OFL). Pick by mood:

| Mood | Font |
|---|---|
| default / bright promo | Prompt |
| loud headline, sale, sport | Kanit (Black/ExtraBold) |
| minimalist luxury, tech, corporate | IBM Plex Sans Thai (Thin/ExtraLight titles), Anuphan |
| cartoon / kids explainer | Mali, Itim, Mitr |
| horror, documentary, editorial | Noto Serif Thai, Trirong |
| sci-fi / HUD | Chakra Petch, Bai Jamjuree |
| handwriting / food | Sriracha · invitation accents: Charm |

Text components: `Kinetic` (word or grapheme reveal, never splits vowels/tone marks), `MaskReveal`, `Tracking` (luxury letter-spacing settle), `Typewriter`. Line height ≥ 1.3, Thai titles ≤ ~12 graphemes per line at 90 px on 1080 wide.

## 5. Animation rules (all tech)

- Everything is a pure function of `useCurrentFrame()`. No `Math.random()` (use `lib/noise` `rand/noise1/fbm`), no CSS animations, no `useFrame()` in Three, no GSAP playback.
- Characters: use `gait(frame / cycle, kind)` and move the body at `strideLength(kind, legLen) / cycle` per frame so feet do not slide; blend key poses with `posesAt`.
- Camera: always moving a little (dolly, orbit, handheld `shake`); third person = `observer()` (lagged follow, deterministic).
- Light: one motivated key light, rim to separate the subject, fog lighter than silhouettes; `flicker()` for practicals.
- Keep the existing editing rules: seam plan, transitions from `transitions.tsx` + 2–4 custom ones at key moments, beat-synced cuts, fresh music per video (find-music.py), SFX on transitions.

## 6. Render scene by scene (cached) and QA

```bash
python3 "$SKILL_DIR/scripts/director.py" render ~/videos/<slug> src/<slug>/storyboard.json
```

- Renders each scene's frame range separately to `out/scenes/<Comp>/NN-id-<hash>.mp4`. The hash covers the scene's code (by default the whole composition folder; list a scene's own files in `"files": ["src/<slug>/Hook.tsx"]` to scope it), `src/lib`, `transitions.tsx`, and the storyboard entries of the scene and its neighbours (transitions overlap them). Put each scene in its own file and list it, and editing one scene re-renders only that scene. `--force` re-renders all.
- 3D scenes render with `--gl=swangle` automatically (software WebGL; `angle` fails on CPU-only machines). Override with `--gl` or `MOTION_MUSE_GL`.
- Audio is rendered once for the full timeline, then normalised (-14 LUFS, -1.5 dBTP) and muxed.
- QA prints per-scene motion score (flags static scenes), duration vs storyboard, loudness/true peak, black stretches, and writes a contact sheet plus `<video>.safe.jpg` with the platform UI zones shaded red. Scenes with `"textY"` (0..1, top of the text) outside the safe band are warned about. Look at both sheets and fix anything clipped, unreadable, static or under the red, then re-run (cached scenes are reused).
- `--draft`: renders at half resolution (`--scale=0.5`) into its own cache and `out/<Comp>-draft.mp4`. Use it for every review round; render full size once at the end. 3D scenes render about 2× faster (measured: 8.5 s cold-brew ad, 31–39 s vs 72–83 s per scene on 8 CPU cores without GPU).
- `--formats 9:16,1:1,16:9` (or `1080x1350`): renders the same composition at each size (keeping the storyboard's short side) → `out/<Comp>-<W>x<H>.mp4`, each with its own scene cache. The audio mix is shared. Only works if the composition lays itself out from `useVideoConfig()` (section 7).
- `cover <video>`: scores frames for sharpness/contrast and stillness (skips mid-transition frames), saves the best as `<video>.cover-frame.jpg`; with `--title` it renders the `Cover` composition (`starter/src/Cover.tsx`) with the Thai title inside the safe zone → `<video>.cover.jpg`.

## 7. Layout, safe zones and formats

- Read sizes from `useFormat()` (`lib/layout.ts`): `safe` (box clear of app UI), `u(px)` (scale a size designed for a 1080 px short side), `pick({ portrait, square, landscape })` for per-format values (camera distance, where the product sits, text alignment). No hard-coded 1080/1920 in scenes.
- 9:16 safe zone (union of TikTok, Reels, Shorts): top 12 %, bottom 25 %, left 6 %, right 13 % (like/comment column). Titles, captions, logos and CTA stay inside; backgrounds and product may bleed.
- Put `<SafeGuides />` last in the composition: shows the zones in Remotion Studio (or with `--props='{"guides":true}'`), never in renders.
- In 16:9 move the hero object to one side (`pick({ landscape: -0.75 })`) and the text to the other half; in 1:1 pull the camera back so the title and object do not overlap.

## 8. Product ads (cans, bottles, jars)

Shot order: reveal (light finds the product) → detail (macro orbit, label, texture) → action (pour, drop, splash, open) → packshot + CTA. One hero object, slow camera, lots of negative space. From `kits/three/three.tsx` (see `examples/cold-brew`):
- Model with `Lathe` from a 2D profile (base dome, wall, shoulder, neck, rim); reuse one profile in every shot so proportions match.
- Label: draw it with `useCanvasTexture` (Chrome shapes the Thai text; wait for `useThaiFontReady(font).ok`) at `labelSize(R, H)` so width/height = 2πR/H and nothing stretches; `LabelWrap` puts the seam at the back. Add a roughness map so ink and paper differ.
- Materials (`MAT`): `aluminium`, `brushed`, `gold`, `glass` (low opacity + clearcoat + env reflections; no transmission, it is slow and grey in software WebGL), `ice`, `liquid`, `paper`. Always add `RoomEnv` so metals and glass have something to reflect.
- Light: `KeyLight progress={p}` swings the key around the product and shifts it warm→neutral (`kelvin(3200)`→`kelvin(5400)`) as the product turns; `useBlindsGobo()` as a spotlight `map` throws window-blind shadows on the backdrop. Keep fill lights weak so the label is not washed out.
- `Stage3D tone="agx"` for a softer, filmic roll-off on bright highlights (product whites, glass); `aces` for punchier contrast.
- Physics from `lib/physics.ts` (pure functions of seconds, deterministic): `projectile` (droplets, thrown objects; stretch along `projectileVel`), `bounce` (dropped ice/products; returns impact times → SFX and `pulse()` camera kicks), `settle` (spring overshoot for titles and landings), `buoyancy` (ice bobbing in a drink), `fillLevel` + `glug` (pour), `crown` (splash ring).
- Condensation, crema, steam, pour streams: write them per video with seeded `rand` from `lib/noise.ts`, and keep droplets off the logo.


## Examples (copy into `src/` and register in `Root.tsx`)

| Example | Tech | Shows |
|---|---|---|
| `examples/zombie-biology` | SVG only | stickman + vector characters, gaits, diagrams, parallax race, Mali |
| `examples/apocalypse-observer` | `@remotion/three` | ruined procedural city, third-person observer camera, fog/ash, flicker, silhouettes, Noto Serif Thai |
| `examples/luxury-product` | `@remotion/three` | lathe-turned bottle, studio lighting, macro orbit, packshot, IBM Plex Sans Thai |
| `examples/cold-brew` | `@remotion/three` + `lib/physics` + `lib/layout` | can with a wrapped Thai label, moving dawn key light, blinds gobo, AgX, bouncing ice with camera pulses and SFX, safe-zone text, renders 9:16 / 1:1 / 16:9, Anuphan |
| `examples/zombie-id` | `@remotion/three` + `lib/toon` + `lib/story` | toon story: cel-shaded zombie and clerk, graveyard and office sets, Thai signs, 360° orbit, subtitles + SFX + music from `script.json`, no voice, Prompt (run `story.py build` on its `script.json` first) |

Copy with `cp -r "$SKILL_DIR/examples/<name>" src/` (they import `../lib/*` and `../transitions`), set `"resolveJsonModule": true` (done by `init`), and put the example's music at the path it expects or swap it for a new track.
