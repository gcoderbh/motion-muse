# Character from a reference image (ตัวละครจากภาพตัวอย่าง)

Use when the user sends a picture and wants a code-drawn character that looks like it. The character is a JSON spec of
SVG parts drawn on a 1000×1000 front-view grid; `lib/refchar.tsx` (`RefCharacter`) turns it in 3D at render time, so one
front design gives every head angle, blinks, gaze, brows and mouth shapes.

## Rights first

| Reference | What to do |
|---|---|
| Drawn by the user, commissioned by them, or open licence (CC0 / CC BY / CC BY-SA, credit it) | Match it as closely as you can |
| A copyrighted character (anime, games, mascots, film) | Do not recreate it. Design a new character that borrows only broad traits (palette mood, proportions, personality) with a new face, hair and signature item |
| A photo of a real person | Make a stylized cartoon from the look (hair, glasses, clothes, colours), not a likeness of the face. Ask that the person agreed before it is published |

## Steps

1. Needs NumPy (`pip install numpy`; `setup.sh` reports it). `python3 "$SKILL_DIR/scripts/charref.py" prep <image> work/ref` → `ref.png`, `grid.png` and `edges.png` (labelled
   50 px grid) and `palette.json`. Look at `grid.png` and write down: head centre and size, eye line, nose, mouth and
   chin heights, hair outline, signature items, and the head angle (yaw/roll) of the pose.
2. Copy `examples/ref-character` (`init --caps refchar`) and author `<name>.json`. Draw it **front-on** around
   `head: { cx: 500, cy: 400 }`, even if the reference is turned; the angle comes from the pose.
   - Layers back → front: `back` (hair mass behind the head, ponytails), `body` (torso, `on: "body"`), `neck`, `head`
     (face shape + soft shading), `face` (eyes, brows, nose, mouth, blush), `front` (fringe, side locks, sheen), `acc`
     (glasses, earrings, hats; `depth` 0.2–0.35 so they float in front of the face).
   - Roles: `eyeL/eyeR` (eye whites; give them an `id`), `pupilL/R` with `clip` = that id, `lashL/R`, `browL/R`,
     `mouth` with `expr` (`neutral`, `smile`, `open`, …). Blink, gaze, brow lift and talk then work by themselves.
   - Paths use absolute `M L C Q Z` (or `ellipse: [cx, cy, rx, ry]`); fills can be `lin(#a,#b,angle)` / `rad(#a,#b)`;
     soft shadows and blush use `blur`.
   - Take colours from `palette.json`, then adjust: skin with some red in it, no pure black.
3. Render `RefMatch` with the reference's pose and framing (`pose.yaw`, `roll`, `x`, `y`, `scale`) and run
   `charref.py compare work/ref/ref.png out/match.png work/cmp.png`. Look at the overlay and the red reference edges:
   fix the biggest difference first (head size/position → hair silhouette → eye line and spacing → mouth/nose → colours →
   details). Do at least three rounds. The numbers are a guide only; with a busy photo background trust the overlay.
4. Render `RefSheet`: every angle must still read as the same person (hair covers the head at ±0.85 yaw, nothing
   floats, far eye compresses instead of sliding off). Then use `RefCharacter` in scenes with a pose per frame.

Keep each user's characters in their project, not in the skill.
