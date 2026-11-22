# Editing craft: transitions, scene changes, and not looking "AI-made"

Read this before planning shots. Write a seam plan (section 3) before writing code, and run the checklist (section 6) before delivering.

## 1. Why AI-made clips look cheap, and the fix

| Looks AI-made | Do this instead |
|---|---|
| Every cut is a crossfade or the same slide | Choose each seam on purpose (section 3). Use 4–6 different transition types in 30 s; never the same one 3 times in a row |
| Every shot has the same length | Vary lengths: short hits (0.5–1 beat) between longer reads (2–4 beats). Speed up toward drops; slow down before the end card |
| Linear or default ease-in-out everywhere | Fast in, slow settle (`Easing.bezier(0.16,1,0.3,1)`), springs with a small overshoot, anticipation before big moves |
| Everything enters at once, centered | Stagger 1–3 frames per element; change layout per shot (left, center, bottom, split); main motion follows one direction across cuts |
| Static frames between animations | Something always moves: slow drift 2–5 % (`Drift`), background parallax, secondary motion on accents |
| Flat, clean, plastic look | Light film grain (`Grain`, 5–10 %), paper texture, real shadows, one strong accent color per shot |
| Cuts and SFX not on the beat | Cut on the beat (±1 frame). Big changes on bar starts (every 4 beats). Whoosh starts before the cut, impact lands on it |
| Too many effects at once | One main motion per shot; one transition per seam; glitch, flash and light leak at most 1–2 times per video each |
| Small text, no time to read | Thai title ≥ 120 px in 1080×1920, captions ≥ 56 px. Hold readable text ≥ 1 s; hold the end card ≥ 1 s |
| No story arc | Hook in 0–2 s, build, peak (highest energy) at 70–80 %, calm end card |

## 2. Transition menu

All of these are in `starter/src/transitions.tsx` (`Timeline`, kind = name below). Shotcraft cards: `$SKILLS_DIR/video-shotcraft/references/shots/transition/`. Effect cards with timing: `$SKILLS_DIR/motion-cards/effects/<slug>/README.md`.

| kind | Frames @30fps | Energy | Use when | Reference |
|---|---|---|---|---|
| `cut` | 0 | any | Same energy, on a strong beat. The best default; most pro edits are 60–80 % hard cuts | motion-cards `hard-cut`, `jump-cut` |
| `smash` | 14–18 | high | Sudden contrast or punchline: quiet → loud, question → answer | motion-cards `smash-cut` |
| `whip` | 8–12 | high | Fast sequence of related scenes; keep direction the same as the motion | Shotcraft `shot-transitions` E, motion-cards `whip-pan` |
| `push` | 12–16 | mid | Next item in a list or next chapter; up = forward | Shotcraft `bottom-push-stack-wipe`, motion-cards `push-transition` |
| `zoom` | 12–16 | high | Going deeper into detail, or "inside" something | motion-cards `zoom-through`, `zoom-wipe` |
| `iris` | 14–20 | mid | Open from the point the viewer is looking at (set `origin`) | Shotcraft `circle-match-iris`, motion-cards `iris-mask` |
| `wipe` | 12–16 | mid | Topic change with direction; colored edge bar in the brand color | Shotcraft `wipe-transitions`, motion-cards `wipe` |
| `slices` | 14–18 | mid-high | New section, playful brands; strips in brand colors | Shotcraft `color-block-step-wipe` |
| `flash` | 6–10 | high | Hide a hard cut on a heavy beat / drop | Shotcraft `FlashCut.tsx`, motion-cards `flash-transition` |
| `glitch` | 4–8 | high | Tech or digital topics only; max twice per video | motion-cards `glitch-rgb-split`, `codec-glitch` |
| `leak` | 18–26 | low-mid | Warm, emotional, film look; between chapters | Shotcraft `transition-hidden-cut` C, motion-cards `light-leak-transition` |
| `focus` | 14–20 | low | Slow, soft moments; same place different detail | Shotcraft `shot-transitions` C |
| match cut / morph | 0–20 | any | Same shape/color/position in both shots (circle → logo, button → card). The most "pro" looking seam; plan it in the layout | Shotcraft `transition-travel`, `ui-to-brand-morph`; motion-cards `match-cut`, `morph-match-cut`, `shape-morph` |
| hidden cut (foreground wipe) | 10–14 | any | An object passes in front of the camera, cut while it covers the frame | Shotcraft `transition-hidden-cut` A |

## 3. Choosing the seam (write this table before coding)

For every cut, answer: what is the relation between shot A and shot B, and what is the energy change?

| A → B relation | Choose |
|---|---|
| Same subject, new detail | `zoom`, `iris` from that detail, match cut |
| Same scene, next item | hard `cut` on beat, `push`, `whip` (same direction each time) |
| New topic | `wipe`, `slices`, `push` with a color change |
| Contrast / reveal / punchline | `smash`, `flash` |
| Same shape or color in both | match cut / morph (always prefer this when possible) |
| Emotional or slow part | `focus`, `leak`, or a plain cut with a held shot |
| Chapter start | title card with `wipe` or `slices`, then hold |

Seam plan format (keep it in the project notes):

| Cut # | Frame (beat) | A → B | Relation | Transition | Why | SFX |
|---|---|---|---|---|---|---|

Rules:
- Motion direction stays continuous across a seam: if A exits left, B enters from the right.
- The transition takes its frames from both shots; plan shot lengths with that in mind.
- After a strong transition, give the next shot 0.5 s of calm so the eye can land.

## 4. Pacing guide

| Length | Shots | Hard cuts | Designed transitions | Peak |
|---|---|---|---|---|
| 15 s | 8–12 | 50–70 % | 3–5 | 10–12 s |
| 30 s | 12–20 | 60–75 % | 5–8 | 21–24 s |
| 60 s | 20–35 | 65–80 % | 8–12 | 42–48 s |

At 120–128 BPM, one beat is about 14–15 frames; one bar (4 beats) is about 2 s.

## 5. Making each shot look designed

- Three layers in every frame: background (color, texture, slow parallax), main subject, small foreground accents (shapes, lines, labels).
- One accent color per shot, from the palette; change the background color between shots so cuts read clearly.
- Big type: weight 800–900, tight letter-spacing for Latin, normal for Thai; animate Thai per grapheme.
- Shapes enter with a spring (damping 10–15) and overshoot; text enters 2–4 frames after its shape.
- Use real UI screenshots or real footage when showing a product; do not fake a product page.

## 6. Checklist before delivery (fix every "no")

1. Is every cut on a beat (±1 frame), and does each SFX land on its action?
2. Are there at least 4 different seam types, and no type 3 times in a row?
3. Is any shot completely static for more than 1 s? (should be no)
4. Do shot lengths vary?
5. Is any text unreadable on a phone (shrink a frame to 480 px wide and look)?
6. Is the highest energy at 70–80 % of the video, and the end card held ≥ 1 s?
7. Are glitch/flash/leak each used at most twice?
8. Does motion direction stay continuous across cuts?
9. Watch once at full speed with sound: does any moment feel "template-like"? Change it.
