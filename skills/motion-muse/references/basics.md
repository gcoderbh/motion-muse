# Everyday videos: data, lyrics and quotes, app demos, brand kits, batches

Ready parts for the jobs people ask for most. All are code: SVG/CSS driven by `useCurrentFrame()`, deterministic,
laid out from `useFormat()` so `director.py render --formats 9:16,1:1,16:9` works. Start from a composition in
`starter/src/Basics.tsx` (`DataReel`, `BarRace`, `LyricReel`, `AppPromo`, `PromoCard`), change its props, and only
copy the code when the layout itself must change. Steps 2–7 of SKILL.md (seam plan, music, SFX, QA) still apply.

## 1. Animated data (`lib/chart`)

| Part | Use | Notes |
|---|---|---|
| `BarChart` | compare 3–8 things | bars grow one by one (`stagger` frames), values count with them; `horizontal` for long Thai labels; `highlight={i}` dims the rest to make the point |
| `LineChart` | change over time | draws left → right with the value riding the tip; `every` thins x labels |
| `Donut` | share of a whole | slices sweep in order; centre shows the total or any node (`center`) |
| `BarRace` | ranking over time | `periods` + `series[].values`; bars swap places smoothly; length = `raceFrames(periods, perPeriod)` |
| `CountUp` | one big number | eases out, tabular digits so it does not wobble |
| `fmtTH` | number text | `fmtTH(1250000, { compact: true })` → "1.3 ล้าน"; `prefix: '฿'`, `unit: '%'` |

Rules: one message per chart (say it in the title: "LINE ยังนำ" beats "ผู้ใช้แอป"); at most 8 bars, sort them
unless order means something; start bars at zero; always add the source (`source` prop) and say when numbers are
made up; give the viewer 2 s on the finished chart before cutting. Colours come from the brand (primary first).
Thai label font size ≥ 28 px at 1080 wide. For maps and custom scales use d3 maths (`data-viz` route) with the same
React rendering; never d3 transitions.

## 2. Lyrics, quotes, word-by-word captions (`lib/lyrics`)

Timings in seconds: `parseLRC(text)` for `.lrc` files (`[mm:ss.xx]` per line), `fromCaptions(json)` for
`scripts/transcribe.py` output (real word times), or write `{ start, end, text, words? }` by hand.
`<LyricTrack lines mode>`:
- `karaoke` – the line fills with the accent colour grapheme by grapheme as it is sung (word times if given,
  otherwise spread by length over 85 % of the line).
- `pop` – words pop in on their time; the current word is highlighted. Good for talking-head captions.
- `quote` – the line rises in and holds, with a big quote mark and `by` (speaker) under it.

Rules: one line on screen at a time, 2 lines of text at most, ≥ 72 px at 1080 wide; start lines 2–3 frames before
the sung syllable; put the line where the platform UI is not (inside `safe`). Thai is segmented with
`Intl.Segmenter`, so do not split strings yourself. Lyrics of songs you do not own need the right to use them;
original lyrics or the user's own song are fine. `LyricReel` takes `audio` (public/ path) and `audioFrom` (s).

## 3. App and website demos (`lib/device`)

- Frames: `Phone` (9:19.5, island, buttons), `Laptop` (16:10 screen on a base), `Browser` (traffic lights + URL).
  Give `src` (a screenshot in public/) or React children (a mock screen drawn in code).
- `Cursor keys={[{ at, x, y, click? }]} touch?` – pointer or finger in screen coordinates; `click` presses and
  ripples. Move in straight eased hops, stop 4–6 frames before the click, never jitter.
- `ZoomTo keys={[{ at, x, y, scale }]}` – camera over the whole layout: push in (1.4–2×) on what is tapped just
  before the tap, hold, pull out before the next step. One zoom per step.
- `ScrollShot` scrolls a long screenshot by `{ at, y }` keys. `keyed(f, keys, prop)` eases any value the same way.

Recipe (`AppPromo`): brand intro → per step: caption "1. …" at the top, phone in the middle, cursor travels → zoom
→ tap → next screen with a whip → outro with the call to action. 2.5–3.5 s per step. Take screenshots at the device
size (e.g. 1179×2556 for a phone) and crop the status bar out if it shows personal data.

## 4. Brand kit (`lib/brand`)

```json
{ "name": "ร้านชาริมทาง", "tagline": "ชงสดทุกแก้ว", "handle": "@cha.rimtang", "logo": "brand/logo.png",
  "font": "Prompt", "headFont": "Kanit", "radius": 28,
  "colors": { "bg": "#FFF7EC", "ink": "#2A1F18", "primary": "#E8743B", "accent": "#FFD23F", "onPrimary": "#FFFFFF" } }
```

Keep it in the project (`src/brand.json` or `--base` for batches) and wrap scenes in `<BrandProvider brand>`.
`useBrand()` gives the colours plus loaded `body` / `head` font families. Parts: `Logo` (image, or a round mark
with the first Thai grapheme + wordmark), `BrandIntro` (1.5 s colour wipe + logo pop + tagline), `BrandOutro`
(CTA, handle, logo), `LowerThird` (name + role), `Watermark` (corner of the safe zone). Ask the user for the logo
file and hex colours; if they only have a logo, pick primary/accent from it and show them a still first. Fonts must
be OFL (`THAI_FONTS`). Save a brand the user will reuse with `learn.py save brand-<name>`.

## 5. Many videos from one table (`scripts/batch.py`)

```bash
python3 "$SKILL_DIR/scripts/batch.py" <project> PromoCard menu.csv --base brand.json --name "{name}" --formats 9:16,1:1
python3 "$SKILL_DIR/scripts/batch.py" <project> PromoCard menu.csv --still --frame 100   # covers / check sheet first
```

Columns become props; numbers and JSON cells are parsed; dotted headers nest (`brand.colors.primary`). `--base`
holds the shared props, rows override it. It bundles once, skips files that exist (`--force` to redo) and writes
`out/batch/<Comp>/report.csv`. Always run `--still` first and look at every row (long names, missing prices), then
render. Example: `examples/batch-menu` (3 drinks, one brand, per-row colour).
