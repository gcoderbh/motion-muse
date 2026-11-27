---
name: motion-muse
description: One-call, code-first video director and editor (Remotion + Three.js + FFmpeg; no AI video generators, no Blender). Turns a natural-language brief or the user's footage into a finished, motion-rich MP4 with Thai typography, beat-synced cuts, designed transitions, fresh royalty-free music and SFX. Covers motion graphics, kinetic Thai text, stickman/vector cartoons, 2.5D parallax, procedural 3D, product ads, restaurant / place guides on a 3D OpenStreetMap with credited open-licence media, explainers and diagrams, toon story episodes with subtitles, footage editing (auto cut, speed ramps, vertical reframe, captions from speech), 9:16/1:1/16:9 from one storyboard, draft renders, safe zones, thumbnails and an OpenFilm export. Built on Video Shotcraft, the Remotion skills and the guanmo-ai awesome-ai-motion gallery. Installs its own dependencies. ElevenLabs only after asking the user.
---

# Motion Muse (Shotcraft + Remotion + awesome-ai-motion)

Use for any request to make, edit or remix a video, reel, promo, lyric video, explainer, cartoon, 3D scene, product ad or motion clip. Everything is made with code (React/SVG/CSS/Canvas/Three.js in Remotion + FFmpeg). Never use AI video generators or text/image-to-video APIs, and never require Blender; user or licensed images, fonts, models and audio are fine.
Works on any machine with bash (Linux, macOS, WSL/Git Bash). `SKILL_DIR` below means the folder that contains this file. If you do not know it:
`SKILL_DIR=$(dirname "$(find /opt/.devin ~/.claude ~/.agents ~ -path '*motion-muse/scripts/setup.sh' 2>/dev/null | head -1)")/..`

## 0. Setup check (run every time, before anything else)

Read what this user taught the skill on this machine first, and follow its rules and dislikes (section 8):
`python3 "$SKILL_DIR/scripts/learn.py" show --brief "<brief>"`

```bash
bash "$SKILL_DIR/scripts/setup.sh"          # installs into ~/skills; set SKILLS_DIR=... to change
export SKILLS_DIR="${SKILLS_DIR:-$HOME/skills}"
```
The script checks each item, installs only what is missing, and prints `OK` / `NEW` / `FAIL` / `MISSING` per line. It ends with `READY` when everything is there.
- `MISSING: ffmpeg` or `node`: install it with the command the script prints (needs admin rights; ask the user if you cannot).
- `FAIL` on a clone or download: check the network and re-run. The script is safe to re-run.
- Do not start the video until it prints `READY`. Tell the user what was installed.

| Dependency | Installed to | Source | Used for |
|---|---|---|---|
| Video Shotcraft | `$SKILLS_DIR/video-shotcraft` | https://github.com/dell0721/skill- | Workflow, 152 shot cards, React components, 5 BGM + 149 SFX, beat-sync and final-review rules |
| Remotion skills | `$SKILLS_DIR/remotion-skills` | https://github.com/remotion-dev/skills | Remotion how-to (`skills/remotion-best-practices/SKILL.md` is the router) |
| awesome-ai-motion gallery | `$SKILLS_DIR/awesome-ai-motion` | https://github.com/guanmo-ai/awesome-ai-motion | 2,129 AI motion works with summaries, covers and prompts (ideas) |
| AI Motion effect library | `$SKILLS_DIR/motion-cards` | https://github.com/gongnyang/awesome-ai-motion | 637 effect cards with timing/easing, 128 rendered HTML clips, 11 scene recipes |
| Prompt Thai font | `$SKILLS_DIR/fonts/prompt/` | Google Fonts (OFL) | Thai text; most machines have no good Thai font |
| Remotion + headless Chrome | `$SKILLS_DIR/video-shotcraft/template/node_modules` | npm | Rendering. Symlink into projects instead of reinstalling |
| git, Node.js ≥ 20, ffmpeg, curl | system | — | Required tools. `jq` and `librosa` are optional |

Files that ship with this skill:
- `scripts/setup.sh`: dependency check and install
- `scripts/synth-sfx.sh <dir> [bpm] [bars]`: makes whoosh, pop, hit, riser, tick, sparkle and a handmade set (pencil, brush, paper, fold, knock, thud, pluck, bell, flutter) with ffmpeg only (no license needed), plus a pulse bed in the given tempo
- `scripts/learn.py`: the user's notebook on this machine (`~/.motion-muse`): rules, dislikes, techniques used often and saved code (section 8)
- `scripts/beat-grid.py <song>`: BPM, first-beat offset and loudness per 2 s, without librosa
- `references/sound-sources.md`: where to get royalty-free music and SFX, the license of each, and how to make your own sound
- `references/motion-sources.md`: where to get effects and techniques, their licenses, and gallery search commands
- `references/editing-craft.md`: which transition to use for which scene change, pacing, and the anti-"AI look" checklist
- `starter/src/transitions.tsx`: `Timeline` with 12 ready transitions (whip, push, zoom, iris, wipe, slices, flash, glitch, leak, focus, smash, cut) + auto SFX, `Grain`, `Drift`
- `references/footage-editing.md`: editing real footage: shot choice, rhythm, speed ramps, reframing, colour, talking heads, Thai captions, audio mix, footage checklist
- `scripts/find-footage.py`: free Mixkit b-roll search/download (credits + no reuse)
- `scripts/footage-scan.py`: proxies, shot detection, motion/pan/shake/focus per shot, shot scores, colour match, contact sheets → `footage.json`
- `scripts/transcribe.py`: local faster-whisper speech → word-timed Thai captions + speech ranges + SRT
- `scripts/auto-edit.py`: beat-synced first cut (montage, talking head, or voice-over) → `public/edit.json` + `edit.md` seam plan
- `starter/src/footage.tsx`: `FootageReel` composition (renders `edit.json`), `Clip` (reframe, speed ramp, colour look, punch-in), `Captions`, `FootageTitle`, `duck()`
- `starter/src/`: working 9:16 Thai examples: `MotionReel` (5 techniques, beat-synced) and `TransitionsDemo` (every transition)

## 1. Brief (one question at most)

Need: topic and Thai copy, footage or screenshots, music, aspect ratio and length.
Ask once for whatever is missing, with clickable defaults (e.g. "9:16 15 s", "16:9 30 s", "you decide").
If the user says to just make it ("ทำเลย"), choose defaults and keep going.

- Product or website promo: follow Shotcraft's mode selection (template / autonomous / co-creation) in its SKILL.md.
- General reel, lyric video or motion demo: work on your own without the mode question.

## 1b. Director mode (any brief that is not just footage)

Read `references/director.md`. In short:
```bash
python3 "$SKILL_DIR/scripts/director.py" route "<brief>"                       # capabilities → smallest toolset
python3 "$SKILL_DIR/scripts/director.py" init ~/videos/<slug> --caps <caps>    # starter + only the packages those caps need
python3 "$SKILL_DIR/scripts/director.py" check src/<slug>/storyboard.json      # scene table to show the user
python3 "$SKILL_DIR/scripts/director.py" render ~/videos/<slug> src/<slug>/storyboard.json   # per-scene cached render + mix + QA
```
- Building blocks in `starter/src/lib/`: `characters` + `pose` (stickman / vector characters, gaits, key poses), `flat` + `city` (flat big-head cartoon people, Bangkok street sets, story badges), `diagram`, `parallax`, `atmosphere`, `typography` (Thai font registry + kinetic text), `noise`, `ink` + `head` + `motif` + `meter` (hand-drawn lines and washes, heads that turn to any angle, one motif across cuts, shots in bars), `physics` (fall, bounce, settle, float, pour, splash, impact pulses), `layout` + `SafeGuides` (platform safe zones, one layout for every aspect ratio); `starter/kits/three/three.tsx` for 3D (copied by `init --caps 3d`), `starter/kits/three/toon.tsx` for cel-shaded 3D cartoon characters and sets (`--caps toon`), `story.tsx` for dialogue subtitles, SFX and music on one timeline.
- Cartoon story episodes (skits, ตลกร้าย, ซอมบี้ไปทำบัตร, 30 s – 3 min, 9:16): read `references/toon-story.md`. Write `script.json`, run `scripts/story.py build`, then render. New characters or outfits (princess, king, a person from a reference picture) and saving them in the skill for the next episode: `references/toon-characters.md`, `scripts/story.py cast`. No voice-over unless the user asks: dialogue is Thai subtitles with name tags and the mouths move while each line is on screen.
- To edit the result in OpenFilm Studio (tracks for every shot, SFX and the music, editable captions): `references/openfilm.md`, `scripts/story.py openfilm`.
- Flat 2D cartoon explainers (big-head people, Thai street scenes, life-time/price badges, like Thai YouTube story channels, 16:9 or 9:16): `lib/flat` + `lib/city` with the same `script.json` → `story.py build` flow as toon stories; copy `examples/life-time`. Stay 2D (no `--gl`, renders much faster than 3D). Before designing a new character or changing how one looks, read `references/character-design.md` (silhouette, colour, lines, cel shading, faces, poses, turning, sitting/lying, physics, inventing new poses). For ordinary adults with real proportions, no outlines and finger hands, use `lib/slim` (`SlimCharacter`, same poses). Side/three-quarter views, indoor sets (office, condo, store, hospital, market, BTS), mouths from a recorded voice, 2D camera moves, more FX, long episodes and thumbnails: `references/flat-story.md`.
- Worked examples to copy from: `examples/zombie-biology` (SVG cartoon explainer), `examples/apocalypse-observer` (3D horror, third-person camera), `examples/luxury-product` (3D product ad, Thai sans), `examples/cold-brew` (can with a wrapped Thai label, moving key light, blinds gobo, bouncing ice, 3 formats), `examples/zombie-id` (toon story: zombie goes to get an ID card, 8 shots, 52 s, subtitles + SFX + music, no voice), `examples/life-time` (flat 2D explainer: life-time transferred like PromptPay, 6 shots, 33 s, 16:9).
- Everyday jobs: animated charts (bars, line, donut, bar race, count-up), lyric / quote / word-by-word caption videos, app and website demos (phone, laptop, browser, cursor, zoom), brand kits (colours, fonts, logo, intro, outro) and one video per CSV row: read `references/basics.md` and start from the compositions in `starter/src/Basics.tsx` (`DataReel`, `BarRace`, `LyricReel`, `AppPromo`, `PromoCard`); batches with `scripts/batch.py`.
- Handmade / drawn look (วาดมือ, ลายเส้น, สีน้ำ, นิทาน, "ไม่อยากให้ดูเป็น AI") and any story film with characters: read `references/handmade.md`. Shots cut on bar lines (`"bars"` in the storyboard, `lib/meter`), heads that turn to any angle (`lib/head` `TurnHead`), ink lines and gouache washes (`lib/ink`), one motif carried through every scene (`lib/motif`), formula SFX on the beats (`synth-sfx.sh`); `init --caps handmade` copies `examples/paper-plane`. Design a new look per brief; never copy another film's characters or style.
- Place guides (แนะนำร้านอาหาร, คาเฟ่, ที่เที่ยว, landmark): read `references/place-guide.md`. `scripts/place.py fetch` builds the 3D map from OpenStreetMap and fetches open-licence photos / clips from Wikimedia Commons with `CREDITS.md`; `init --caps place` adds `lib/map3d` and the `FoodSpot` composition (fly-in, pin, credited photos and clip, end card). Never download TikTok / YouTube / Instagram / Facebook / Google Maps media: tell the user to ask the owner for the file (`place.py permission` writes the Thai request) and credit it once they confirm permission.
- Pick the Thai font by mood (`director.md` section 4) and fetch it with `scripts/thai-fonts.sh`.
- Product ads (cans, bottles, jars, packshots): `director.md` section 8 (label wrap, materials, moving key light, gobo, AgX, physics).
- Steps 2–7 below still apply: gallery references, seam plan and transitions, fresh music, SFX, QA, delivery.

## 2. Pick techniques

Read `references/motion-sources.md`, then:
1. Search the gallery for references in the right category and look at the cover images to judge the style. Take the motion idea, timing and structure only. Never copy the source footage, covers, characters or brand assets; they belong to their authors.
2. Look up the matching effect in `motion-cards` for timing and easing values.
3. Build it from the matching Shotcraft shot card (`references/shots/<category>/*.md`). Read the whole card and the demo TSX it points to, and keep any "known pitfall" parameters.
4. Plan one main motion per shot, cut only on beats, and hold the end card for at least 1 s.
5. Read `references/editing-craft.md` and write the seam plan table: for every cut, the relation between the two shots, the transition kind and why. **Default is calm (guide section 0): unless the user asks for a flashy or transition-heavy edit, use hard cuts for almost every seam, at most one soft transition (`push`, `focus`, `leak`, `wipe`, `iris`) per 10 s, no transitions between steps of a sequence (keep the frame still and change what is inside), and slow, rare camera pushes.** Prefer match cuts when two shots share a shape or color. Design 1–2 custom seams from this video's content for the key moments (guide section 2b). Only when the user asks for more energy: 4–6 transition kinds and 2–4 custom seams.

## 3. Build the Remotion project

```bash
P=~/videos/<slug>; T="$SKILLS_DIR/video-shotcraft/template"
mkdir -p $P/public/fonts $P/public/audio $P/out && cd $P
cp $T/package.json $T/tsconfig.json $T/remotion.config.ts . && ln -sfn $T/node_modules node_modules
cp -r "$SKILL_DIR/starter/src" . && cp "$SKILLS_DIR"/fonts/prompt/*.ttf public/fonts/
while read -r a; do cp "$SKILLS_DIR/video-shotcraft/assets/audio/$a" public/audio/; done < "$SKILL_DIR/starter/audio.txt"
npx remotion render src/index.ts MotionReel out/starter.mp4   # optional: proves the setup works
```
`starter/src/theme.ts` already loads Prompt with `delayRender` + `FontFace`, has the bright palette and the beat helpers `BEAT` / `b(k)`. Change `BPM` for your track. `starter/src/Reel.tsx` shows each technique; replace its scenes with yours.
Join scenes with `Timeline` from `starter/src/transitions.tsx` (it places the transition SFX too), and put `<Grain />` on top:
```tsx
<Timeline scenes={[{ dur: b(4), el: <Hook />, out: { kind: 'smash' } }, { dur: b(3), el: <Feature />, out: { kind: 'whip', dir: -1 } }, { dur: b(5), el: <End /> }]} />
<Grain opacity={0.07} />
```
Wrap still layouts in `<Drift dur={...}>` so no shot is frozen.

- Per-character Thai animation: split with `Intl.Segmenter('th', { granularity: 'grapheme' })` so vowels and tone marks stay on their letter.
- Thai text needs `lineHeight` ≥ 1.3 or upper vowels get clipped. Check big words fit the frame width.
- Rendering must be deterministic: no `Math.random` / `Date.now`; use seeded random.
- Default to a light, bright palette unless the brief or brand says otherwise.
- Audio: `<Audio src={staticFile('audio/x.mp3')} trimBefore={frames} volume={...} />`; SFX go in `<Sequence from={b(k)}>`.

## 3b. Footage (when the user sends video, or the video needs b-roll)

Read `references/footage-editing.md` and follow its pipeline. In short:
```bash
python3 "$SKILL_DIR/scripts/find-footage.py" <keywords> --orientation vertical   # only if footage is missing; then --get <ids> --dir footage-raw
python3 "$SKILL_DIR/scripts/footage-scan.py" <user files or footage-raw/> [--stabilize]   # proxies + footage.json + out/sheets/*.jpg
python3 "$SKILL_DIR/scripts/transcribe.py" --footage footage.json                     # if any clip has speech (pip install faster-whisper)
python3 "$SKILL_DIR/scripts/auto-edit.py" footage.json --music audio/bgm.mp3 --length 20 --look warm   # or --mode talk / --vo audio/vo.mp3
npx remotion render src/index.ts FootageReel out/video.mp4 --timeout=120000
```
- Look at every contact sheet before cutting, and read `edit.md`. The draft is a starting point: swap weak shots, add Thai `titles`, design 2–4 custom seams, and fix the captions by hand.
- Edit the proxies in `public/footage/`, never the originals (VFR/HEVC phone video drifts out of sync).
- Slow motion only on 50 fps+ sources; at most one or two speed ramps per video; one colour look per video.
- Only use footage the user owns or has the rights to; stock clips go into CREDITS.md.

## 4. Music, SFX and beat sync

Read `references/sound-sources.md`.

**Music (BGM): find a new track for every video.** Do not reuse a track from an earlier video, and do not use Shotcraft's 5 bundled BGM tracks or the starter's `house-vibez.mp3` unless the user asks. Everyone who installs this skill has those tracks, so videos made with them sound the same.
1. If the user sent a track, use it and skip the rest.
2. Write 3 English keywords for the music from the brief: mood, genre and topic (use the mood table in `sound-sources.md` section 2b), plus the BPM range.
3. Search: `python3 "$SKILL_DIR/scripts/find-music.py" <keyword1> <keyword2> <keyword3>`. It lists unused Mixkit tracks with their tags, and skips tracks used before on this machine and Shotcraft's bundled tracks.
4. Pick 2–3 candidates whose tags match the brief. Check each one with `beat-grid.py`: is the BPM in range, is it at least as long as the video, and is there a phrase start where the hook can sit?
5. Download the best one: `python3 "$SKILL_DIR/scripts/find-music.py" --get <id> --title "<title>" --out public/audio/bgm.mp3`. This writes `CREDITS.md` and marks the track as used.
6. If Mixkit has nothing that fits, use another source from `sound-sources.md` (Pixabay Music, YouTube Audio Library, Incompetech, FMA, Uppbeat). Open the page in the browser, check the license, download the track, and add it to `CREDITS.md` and the used-music log yourself.
7. Tell the user which track you picked and why it fits, so they can ask for another one.

**SFX:** Shotcraft's bundled SFX (`assets/audio/sfx/`, license in `assets/audio/ATTRIBUTION.md`; read `references/sound-design.md`) are fine to reuse. You can also use free SFX sources from `sound-sources.md`, or make your own with `bash "$SKILL_DIR/scripts/synth-sfx.sh" public/audio/synth`.

ElevenLabs only after asking (section 5).

Write every outside file into `public/audio/CREDITS.md` (title, URL, license, date) when you download it, and put the needed credit lines in the delivery message.

Beat sync: follow Shotcraft's `references/music-beat-sync.md`. Run `python3 "$SKILL_DIR/scripts/beat-grid.py" song.mp3 --fps 30` (or librosa if installed) to get the BPM and first-beat offset, start the music on a phrase boundary, and keep each cut within 3 frames of a beat.

## 5. ElevenLabs (always ask first)

Never call ElevenLabs without asking. Ask first, e.g. "ใส่เสียงพากย์/เพลงจาก ElevenLabs ไหม (มีค่าใช้จ่าย API)" with options "ใส่เสียงพากย์ไทย", "ใส่เพลง/เสียงเอฟเฟกต์", "ไม่ใส่".
Only after a yes for this video: use the user's `ELEVENLABS_API_KEY` from their secret store or environment (never print it or write it to a file), read the official API docs (https://elevenlabs.io/docs), generate the audio and save it into `public/audio/`.
Tell the user that commercial use depends on their ElevenLabs plan. If the answer is no or there is no answer, use sources 1–4 above.

## 6. Render and QA

```bash
npx tsc --noEmit -p .
python3 "$SKILL_DIR/scripts/director.py" render . src/<slug>/storyboard.json --draft     # half resolution, about 2× faster per 3D scene: check this first
python3 "$SKILL_DIR/scripts/director.py" render . src/<slug>/storyboard.json [--formats 9:16,1:1,16:9]
python3 "$SKILL_DIR/scripts/director.py" qa out/<file>.mp4          # any MP4 (e.g. FootageReel): metadata, loudness, black frames, sheets
```
`render` renders scene by scene with a cache, mixes and normalises the audio (-14 LUFS), then runs QA: motion per scene, duration, loudness/true peak, black stretches, `out/<Comp>.sheet.jpg` and `out/<Comp>.safe.jpg` (app-UI zones in red). Details: `references/director.md` section 6.
Look at both sheets and at single frames around each cut. Fix clipping, overflow, text in the red zones, leftover text, unreadable Thai and static shots, then render again (unchanged scenes come from the cache).
Run the checklist in `references/editing-craft.md` section 6 (and section 9 of `footage-editing.md` for footage). For full promos, run Shotcraft's independent final review (`references/final-review.md`).
If the video has BGM, also offer a version with SFX only.

## 7. Deliver

Send the final MP4 (and the other formats if rendered) to the user, as attachments if you work on a remote machine.
Make a cover for the platform upload: `director.py cover out/<Comp>.mp4 --title "หัวข้อ\\nบรรทัดสอง" --font Prompt` picks a sharp, still frame (or `--at 6.5`) and puts the Thai title on a card inside the safe zone (the card hides text already in the frame; `--card` colour) → `out/<Comp>.cover.jpg` (needs `Cover` in `Root.tsx`; the starter has it).
Include a short Thai table of time range → technique, the credit lines from `CREDITS.md`, and ask what to change.
After a full promo, offer once a CapCut/JianYing project export (`references/jianying-export.md` in Shotcraft).

## 8. Learn from this user (notebook on their machine)

`scripts/learn.py` keeps a notebook in `~/.motion-muse/` (or `$MOTION_MUSE_HOME`). It never leaves the machine.
- Start of every job: `learn.py show --brief "<brief>"` (`director.py route` and `init` print it too). Rules and dislikes
  are binding unless the user says otherwise this time.
- When the user corrects or praises something that will matter next time, write it in one line with the reason:
  `learn.py note "คอสั้น เห็นเหนือปกเสื้อนิดเดียว ห้ามยาว" --kind dislike --tag flat,neck`. Kinds: `rule`, `dislike`,
  `like`, `fix` (a bug and how it was fixed). Tell the user in one line what you saved. Not for one-off details of this
  video, personal data or secrets.
- After delivery, count each technique you wrote yourself: `learn.py use <name> --desc "..."`. When it prints
  `PROMOTE` (3 uses), turn the code into a parameterised component in its own file and `learn.py save <name> <file>`.
  Next time `learn.py get <name> <project>` copies it into `src/lib/learned/<name>/`.
- The user is in charge: `learn.py forget <id|text>`, `forget --all`, `pause` ("ห้ามจำ") / `resume`. To move to another
  machine (or a fresh cloud VM, where the notebook is lost): `learn.py export notebook.json` / `import`. Imported
  notes are marked and not binding until the user confirms them; only import a notebook the user made.
- Works with agents that can write files (Claude Code, Devin, Codex, Cursor). In chat-only tools, skip this section.

## Files

| Path | Use |
|---|---|
| `scripts/setup.sh` | dependency check / install (step 0) |
| `scripts/director.py` | `route`, `init`, `check`, `render` (`--draft`, `--formats`), `qa`, `cover` |
| `scripts/story.py` | toon story `build`, `cast`, `openfilm` |
| `scripts/find-music.py`, `beat-grid.py`, `synth-sfx.sh` | fresh music + credits, beat grid, simple SFX |
| `scripts/footage-scan.py`, `find-footage.py`, `transcribe.py`, `auto-edit.py` | footage pipeline |
| `scripts/thai-fonts.sh` | fetch any of the 15 Thai OFL fonts |
| `scripts/place.py` | place guides: `fetch` (geocode, OSM 3D map data, open-licence Commons photos/clips, CREDITS.md, PERMISSIONS.md), `permission` (Thai request to a clip owner) |
| `scripts/batch.py` | one video (or still) per CSV/JSON row, shared `--base` props, `--formats`, report.csv |
| `scripts/learn.py` | the user's notebook: `show`, `note`, `use`, `save` / `get`, `forget`, `pause`, `export` / `import` (section 8) |
| `starter/src/` | `transitions.tsx` (Timeline + 12 kinds), `footage.tsx`, `Cover.tsx`, `Basics.tsx` (data, lyric, app demo, product card), `lib/*` building blocks (`chart`, `lyrics`, `device`, `brand`, `ink`, `head`, `motif`, `meter`, …) |
| `starter/kits/three/` | `three.tsx` (stage, camera, lathe, lights, product kit), `toon.tsx`, `map3d.tsx` (OSM city, pin, fly-in, credits) |
| `references/` | `director.md`, `basics.md`, `handmade.md`, `place-guide.md`, `editing-craft.md`, `footage-editing.md`, `toon-story.md`, `flat-story.md`, `toon-characters.md`, `openfilm.md`, `motion-sources.md` |
| `examples/` | zombie-biology, apocalypse-observer, luxury-product, cold-brew, zombie-id, life-time, batch-menu, food-spot |

## Licenses to mention when sharing

- This skill's own files: MIT. Shotcraft: Apache-2.0. awesome-ai-motion and motion-cards repo code: MIT; gallery works belong to their authors.
- Remotion is free for individuals and companies with up to 3 employees; larger companies need a license (https://www.remotion.dev/license).
- Thai fonts (Prompt, Anuphan, IBM Plex Sans Thai, …): SIL OFL 1.1.
- Map data: © OpenStreetMap contributors, ODbL (https://www.openstreetmap.org/copyright). Commons media: the licence and author listed in each `CREDITS.md`.
