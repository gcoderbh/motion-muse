# Editing real footage (phone clips, b-roll, interviews)

Use this when the user sends video files, or when you add stock b-roll. Read `editing-craft.md` first: its seam rules apply here too.
Footage looks pro when the cuts are motivated. Effects come second.

## 1. Pipeline

| Step | Command | What you get |
|---|---|---|
| 1. No footage, or not enough | `find-footage.py coffee "latte art" --orientation vertical` then `--get <ids> --dir footage-raw` | Free Mixkit b-roll, written to CREDITS.md, logged so the next video uses different clips |
| 2. Scan | `footage-scan.py footage-raw/ [--stabilize]` | CFR proxies in `public/footage/`, `footage.json` (shots, scores, motion, pan, focus, colour match), contact sheets in `out/sheets/` |
| 3. Look | open every `out/sheets/*.jpg` | One labelled frame per shot. The yellow dot is the detected subject. Drop bad shots with `--exclude` |
| 4. Speech | `pip install faster-whisper` once, then `transcribe.py --footage footage.json` (or `transcribe.py vo.mp3 --key voiceover`) | `public/captions.json` with word timings + `.srt`. Fix names, brands and numbers by hand |
| 5. Music | `find-music.py ...` (SKILL.md section 4) | New matching track in `public/audio/bgm.mp3` |
| 6. Draft cut | `auto-edit.py footage.json --music audio/bgm.mp3 --length 20 --look warm` (or `--mode talk`) | `public/edit.json` + `edit.md` seam plan |
| 7. Direct | edit `edit.json`: swap shots, add `titles`, change `out` transitions, design custom seams | Your cut, not the script's |
| 8. Render | `npx remotion render src/index.ts FootageReel out/video.mp4 --timeout=120000` | MP4 |

Always edit the proxies, never the camera originals: phone footage is often variable frame rate (VFR) or HEVC, which makes Remotion seek the wrong frame and drift out of sync. The proxies are constant 30 fps H.264 with a keyframe every 0.5 s.

## 2. Choose shots like an editor

- **Hook (first 1–1.5 s):** the most striking moving shot, or the speaker's strongest line. Never open on an establishing wide shot that does nothing.
- **Score is a hint, not the choice:** `score` combines motion, sharpness, exposure and steadiness. A low-scoring shot that tells the story beats a pretty shot that does not.
- **Shot sizes:** go wide → medium → close-up inside a sequence, and cut between sizes. Two shots of the same size and angle back to back look like a mistake (a jump cut).
- **Cut on action:** start each window just before the movement peaks (auto-edit puts the motion peak ~35 % into the window). Cutting in the middle of a gesture hides the cut.
- **Screen direction:** if the camera pans or the subject moves left to right, keep the next shot moving the same way. Reverse direction only on purpose, at a section change.
- **Match cuts:** shots with the subject in the same place (similar `focus`), the same shape or colour, cut together invisibly. Look for them on the contact sheets; they are the best seams you have.
- **Leave out:** blurry, shaky (`shake` > 2.5), under-exposed (`brightness` < 0.15) and duplicate shots, and any shot with logos, faces or screens you have no right to show.

## 3. Rhythm with music

- Cut on beats, with different shot lengths (`auto-edit.py` uses 1, 2 and 4-beat lengths, never all equal).
- Fastest cutting at 65–85 % of the video (the peak), then slow down for the end. Hold the last shot at least 1.2 s.
- Start the music on a phrase where the track is already full (`auto-edit.py` finds it), not on a quiet intro.
- The big moments (drop, hit) get the hero shot, a smash cut or a speed ramp, not just another cut.
- Natural sound under music (`--natural 0.2`) makes b-roll feel real: pouring, steps, city. Bring it in a few frames before the picture (J-cut, `audio.lead`).

## 4. Speed

| Tool | When | In edit.json |
|---|---|---|
| Speed ramp fast → real time | Into a beat/drop, to land a movement exactly on the hit | `"ramp": [[0, 2.2], [0.35, 1], [1, 1]]` |
| Ramp real time → slow-mo → fast | Hero moment. **Only for 50/60/120 fps sources** (check `fps` in footage.json); slowing 24/30 fps footage makes it stutter | `"ramp": [[0, 1], [0.3, 0.35], [0.75, 0.35], [1, 1.8]]` |
| Constant speed-up 1.3–2× | Slow, low-energy shots in a fast section; time-lapse feel | `"speed": 1.6` |
| Freeze frame | A punchline or a name card | `"ramp": [[0, 1], [0.5, 1], [0.51, 0], [1, 0]]` |

One or two ramps per video. A ramp on every shot is the most common "AI edit" giveaway.

## 5. Framing, movement and colour

- **Vertical reframe:** horizontal footage in a 9:16 video follows the subject automatically (`focus` + `track` from the scan). If the yellow dot on the contact sheet is wrong, set `focus` by hand, e.g. `[0.62, 0.4]`.
- **Camera life:** static shots get a slow push-in or pull-out (`"zoom": [1, 1.06]`). Shots where the camera already moves get nothing extra.
- **Jump cuts:** two cuts in a row from the same clip need a different framing: punch in 12–15 % (`"zoom": [1.12, 1.14]`). Talk mode alternates this automatically.
- **Stabilize** shaky handheld clips with `footage-scan.py --stabilize` (vid.stab; crops a little). Do not stabilize intentional camera movement.
- **Colour:** `match` (from the scan) evens out exposure and saturation between clips first, then one `look` is applied to everything: `clean`, `warm` (food, lifestyle), `teal-orange` (travel, cinematic), `film` (story, nostalgia), `mono` (drama), `punchy` (sale, sport), `soft` (beauty, wedding). One look per video.
- Grain (`grain` 0.04–0.08) and the built-in vignette glue footage from different cameras together.

## 6. Talking head / interview (`--mode talk`)

`auto-edit.py --mode talk` cuts out pauses longer than 0.25 s (keeping 0.12 s before and 0.18 s after each phrase), alternates normal and punched-in framing on every jump cut, puts b-roll over the speech every ~4 s (the voice keeps playing: an L-cut), ducks the music under the voice, and lays word-timed captions on the timeline. Then:
- Remove false starts, "เอ่อ/อ่า" and repeated sentences by deleting their entries in `shots` (and their caption words).
- Choose b-roll that shows what is being said at that moment, not random pretty shots.
- Put the strongest sentence first as the hook if the speaker does not open with it.

## 7. Thai captions

- `Captions` regroups whisper's pieces into real Thai words (`Intl.Segmenter`), shows up to ~18 characters per line, and highlights each word as it is spoken.
- Keep captions in the safe area: `y` 0.62–0.72 for 9:16 (TikTok/Reels/Shorts put buttons on the bottom 20 % and the right edge).
- 70–80 px Prompt Bold/ExtraBold, white with a soft shadow; highlight colour from the brand.
- Proofread: whisper often gets Thai names, English loanwords and numbers wrong. Fix them in `captions.json` and re-run auto-edit.
- Titles over footage: add `"titles": [{ "at": 3, "dur": 40, "text": "กาแฟแก้วแรก", "sub": "ของวันใหม่" }]` (frames). Put them over calm shots, never over a busy, high-contrast area.

## 8. Audio mix targets

| Layer | Level |
|---|---|
| Voice / VO | loudest, around -16 to -14 LUFS for the final mix |
| Music under voice | ducked about 70 % (`duck` in edit.json; auto-edit fills it from speech) |
| Music alone (montage) | `volume` 0.8–0.9 |
| Natural sound under music | 0.15–0.3 |
| Transition SFX | quieter than the music hit; skip them when natural sound already carries the cut |

Final check: `ffmpeg -i out/video.mp4 -af ebur128 -f null -` (integrated loudness near -14 LUFS, true peak below -1 dB).

## 9. Footage checklist (add to the editing-craft checklist)

1. Does the first 1.5 s show the best moving shot or the best line?
2. Is every shot sharp, steady enough and correctly exposed, with the subject inside the 9:16 frame?
3. Do neighbouring shots differ in size or angle (or is it a deliberate match cut)?
4. Is screen direction consistent within each section?
5. One or two speed ramps at most, and slow-mo only on high-fps sources?
6. Do all clips look like one shoot (matched colour, one look, grain)?
7. Are captions correct, readable and inside the safe area?
8. Is the voice always clear over the music?
9. Are all stock clips and music in CREDITS.md, and nothing used that the user has no rights to?
