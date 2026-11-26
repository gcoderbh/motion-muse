# Designing good-looking 2D characters in code

Read this before you make a new flat (`lib/flat`) or vector (`lib/characters`) character, or change how one looks.
Characters are code built from simple shapes; nobody draws them and no AI image is used. What makes them look designed
is the set of rules below. Invent your own look each time: take ideas from a reference (colours, mood, one signature
item) but never copy another channel's or artist's characters.

## 1. Silhouette first

- Shade the character solid black at thumbnail size (about 120 px tall). You should still be able to tell who it is from
  the hair, the build and one item (cap, bun, vest, tie, bag). If two characters in a cast have the same silhouette,
  change hair, height (`height` 0.8–1.1) or build (`build` 0.85–1.25).
- Shape language: round shapes read as kind or funny, squares as solid or stubborn, triangles and points as sharp or
  villainous. Give every character one dominant shape (head, torso, hair) and repeat it in a prop.
- Contrast big, medium and small parts: big head, medium body, small hands and feet. When everything is the same size
  the character looks generic.

## 2. Proportions in the house style

- Flat big-head: the head is about 0.55–0.65 of the body height below it. Children are shorter (`height` 0.8–0.88)
  with the same head. Elderly people get a small stoop (`lean` −2 to −4) and `old` lines.
- Keep the neck short and visible, wrapped by the collar. The head turns on top of the neck, and the neck follows the
  torso (`flatJoints`).
- Hands are mittens at about 0.25 of the head width. Never draw fingers individually.

## 3. Colour

- Each character gets 3 main colours plus skin and hair: one dominant (60 %, usually the top), one secondary (30 %,
  trousers or an outer layer), one accent (10 %, tie, badge, trim, shoes). Pick the accent from the opposite side of the
  colour wheel to the dominant colour.
- Leads are more saturated than the set. Side characters and extras are a little greyer, so the eye goes to the lead.
- Use warm skin tones with some red in them (`#F2C29B`, `#EFC09A`, `#C98E62`, `#8D5A3B`) and vary them across a cast.
  Never use grey or pure-yellow skin.
- Never use pure black (`#000`) for hair or clothes; use a dark tone with some colour in it (`#1E1A1A`, `#1D1F2A`).
  Use white only for shirts and highlights.
- Squint test (or convert to grayscale): the face must be the lightest large area on the character, and the head must
  stand apart from the background in value, not only in hue.

## 4. Lines

- The outline of every part is its own fill darkened to about 62 % (`edge()`), never black. This is what makes the style
  look like a sticker and not clip-art.
- Line weight: outer edges are thickest (4 at scale 1), inner details thinner (2.5–3), and facial features drawn as
  solid shapes or 4–5 lines. Round line caps and joins everywhere.
- Keep the number of lines on the face low: eyes, brows, a small nose, the mouth, and optional blush. Every extra line
  makes the character look older or dirtier.

## 5. Cel shading (`finish: 'soft'`, the default)

- One light, from the upper left of the screen (`light: 'left'`), for every character in a scene. When a character is
  mirrored (`dir={-1}`), the shading stays on the same side of the screen. Night scenes or scenes with a lamp on the
  right: `light: 'right'`.
- Two tones per part, never gradients. The lit tone is the base colour and the shadow tone is the base darkened to
  about 84–88 %, with a hard, curved edge. On the head the terminator is curved like a crescent; limbs get a shadow
  band along the side away from the light.
- Cast shadows: the fringe on the forehead, the chin on the neck, the collar on the chest, and a soft ellipse on the
  floor. These four make the character sit in the world.
- Highlights: one white streak on the hair (about 30 % opacity) and at most one small shine on glasses or shoes. Do not
  add a rim light to every part.
- `finish: 'flat'` (single fills) only for infographic-style videos or when the user asks for it.

## 6. Faces and expressions

- Eyes carry the expression; the mouth confirms it. Change the brows on every expression; a neutral brow on a shocked
  face looks dead.
- Push expressions further than feels natural: shocked = ring eyes, a tall open mouth, brows high and the head pulled
  back. Sad = brows up in the middle, eyes looking down, the mouth small.
- Asymmetry adds life: one brow higher (`smug`), the head tilted 4–8°, the gaze slightly off centre.
- Blink every 2–4 s at irregular intervals (seeded), never on a fixed beat.

## 7. Posing

- Every key pose has a clear line of action, a single curve through head, spine and the leading arm. The torso leans
  into the action (`lean` ±3–6°) and the head counter-tilts.
- No twins: the left and right arms or legs are never mirrored exactly; offset one by 10–20°.
- Gestures go out and away from the body so they show in silhouette; hands in front of the torso disappear.
- Hold each key pose 8–15 frames and snap between poses with overshoot (`flatPosesAt`). Add `flatIdle` on top so a
  held pose still breathes.

## 8. Outfit and props tell the job

- One item says the job at a glance: lanyard + ID badge (office), numbered vest (motorbike taxi), apron (vendor), tie +
  suit (boss), scrubs + stethoscope (nurse), uniform + backpack (student). Add an item instead of a text label.
- Invent logos, shop names and badges. Never use real brands, real uniforms with insignia, or real people's faces.

## 9. Turning: front, three-quarter, side, back

`pose.yaw` turns a character: 0 front, 0.5 three-quarter, 1 side, 1.5 three-quarter back, 2 back. It turns toward +x.
Use `dir={-1}` to face the other way. `yaw` is part of the pose, so `flatPosesAt` animates a turn like any other key.

- **Which view to use:** front for talking to the viewer, three-quarter for two people talking (the default for dialogue),
  side for walking and handing things over, back for leaving or looking at something in the scene.
- **Turns are fast:** 4–6 frames from front to side, with the head leading the body by 1–2 frames. Never hold a
  half-turn on purpose.
- **What moves when it turns:** the face slides toward the facing side, the far eye folds away, the near ear moves
  behind the cheek, the hair covers the back of the head, and the body gets narrower. Badges, ties and numbers slide with
  the chest and disappear round the back. Arm angles swing forward in side view, so `point` points where the body faces.
- **New hair styles or props:** check them at all 5 yaws in one still. A shape drawn only for the front view will float
  off the head when the character turns.

## 10. Sitting, kneeling and lying

Legs are two bones: `hipL/hipR` swing the thigh forward, and `kneeL/kneeR` fold the shin back. A negative `bob` lowers
the hips. Use `flatPlant(hip, knee)` to get the `bob` that keeps the foot on the ground.

- **Presets:**
  - `sit`: on a chair. Put the seat top at `FLAT_SEAT` above the ground point.
  - `slump`: tired on a chair.
  - `sitFloor`: on the floor, hugging the knees.
  - `lie`: on the back, head to screen-left.
  - `lieSide`: curled on the side.
- **Which view:** side or three-quarter shows a sitting pose best. In front view the thighs point at the camera and look
  short, which is correct but reads less clearly.
- **Contact:** the seat, bed or floor must touch the body. Draw the chair behind the character, with its seat exactly at
  the hips. Draw the bed or floor under the lying body. Nothing may float above its support or sink into it.
- **Lying:** `roll` turns the whole body around the hips (±90 = lying). The ground shadow gets wider. Keep the face
  readable: tilt the head toward the camera with `head`.

## 11. Physics and weight

Cartoon physics exaggerates real physics. It never ignores it.

- **Feet stay planted:** a foot on the ground must not slide.
  - Front-view `flatWalk`: move x about 7 px per frame at scale 1.
  - Side-view `flatStride`: move x by `FLAT_STRIDE * scale` per cycle.
  - Turning on the spot: keep x still.
- **Gravity:** anything in the air follows a parabola. Rise and fall take the same time, and the body is slowest at the top.
  `flatJump(t, dur, height)` does anticipation, then a stretched flight, then a squashed landing.
  - `pose.air` lifts the body. The ground shadow stays on the floor, shrinks and fades as the body rises.
  - Props that are thrown use `lib/physics` if this version has it.
- **Anticipation and follow-through:** before a big move, go the opposite way for 3–6 frames (crouch before a jump, pull
  the arm back before a throw). After it, let the hair, the tie and the arms settle 2–4 frames late.
- **Squash and stretch:** use `pose.squash`, from 0.8 to 1.15. Squash on impact, stretch at speed, and keep the volume
  (the width changes the other way automatically). Faces never squash on their own.
- **Weight:**
  - Lean away from a heavy load.
  - Walk slower and bob lower when tired or carrying something.
  - Shift the hips over the standing foot when standing on one leg.
  - A light character can bounce more than a heavy one.
- **Shadows match the light:** the ground shadow sits under the feet, and the cel shading follows `light`. A character
  that jumps or lies down still has its shadow on the floor, in the same scene light as everyone else.

## 12. Inventing a pose that is not in the presets

When the script asks for a pose that has no preset (for example "เหนื่อยหมดแรง", "ยกกล่องหนัก" or "ตกใจถอยหลัง"),
build it yourself:

1. **Line of action:** decide one curve for the spine and head. Tired sags forward and down, proud arches back,
   scared pulls back and in.
2. **Joint angles:** turn the curve into `lean`, `head`, `bob`, the arm angles (`shL/elL/shR/elR`), the legs
   (`hipL/kneeL/hipR/kneeR`, `spread`) and `yaw`. Start from the closest preset, then change 3–5 values.
3. **Balance:** the head and chest must sit over the base of support (the feet, the seat or the floor). If they don't,
   add a step, a lean back or a hand on something.
4. **Silhouette:** both hands and the head must read clearly against the body, with no arm hidden in front of the torso.
5. **Timing:** add key poses with `flatPosesAt`: anticipation, the action, overshoot, then settle.
6. **Check:** render a still and run section 13. Save a pose the user liked with `learn.py use flat-pose-<name>`.

## 13. Second body: slim people (`lib/slim`)

`SlimCharacter` is a second house style for explainers that need ordinary adults instead of cartoons: about 6 heads
tall, no outlines, one shadow tone per part, small face, hands with fingers. It takes the same `FlatPose`, so every
preset, `yaw`, `sit`, `lie`, `flatStride()` and `flatJump()` work unchanged. The legs are longer, so a side walk moves x by `SLIM_STRIDE * scale` per `flatStride` cycle, not `FLAT_STRIDE`. Do not mix the two bodies in one scene.

- **Look:** `SlimLook` sets skin, hair colour and style (`wavy`, `long`, `bun`, `curly`, `buzz`), top, bottom, shoes,
  `sleeves`, `shorts`, `mask`, `lashes` and `build` (0.9 is slimmer). `SLIM_LOOKS` has four starting points; vary them.
- **Colour:** separate parts by value, not lines: the top and bottom must differ by at least 25% lightness, skin must
  differ from the background, shoes are the lightest or darkest block so the feet read.
- **Hands:** `handL` / `handR` pick `relaxed`, `open`, `fist`, `point`, `thumb`, `peace`, `ok`, `pocket`. Use a gesture
  only when the hand is the point of the shot; otherwise `relaxed`. For hands in pockets use `SLIM_POCKETS` as the arm
  pose and `pocket` as the hand. `slimReach(side, target)` gives the arm angles that put a hand on a point.
- **Hair is a cap on the skull:** each style has a hairline (forehead, temples, above the ears, nape) that turns with
  the head, so every angle is covered. When adding a style, give it a hairline and a volume, never a fixed shape that
  slides with `yaw`, or the turned head goes bald.
- **Proportions:** shoulders about 1.4 head widths, hips a little narrower, arms reach mid-thigh. Keep these when you
  change `build`; a wider build reads as a different person, not a stronger one.

## 14. Check before you use a new character

Render a still of the character on the scene background with `npx remotion still`. Show it in 3 poses (rest, a gesture,
an extreme expression), next to the other characters in the cast, plus one row of the 5 yaws and one sitting pose. Look at the still and check:

- It still reads at thumbnail size, and in grayscale the face is the lightest area.
- No part sticks out wrongly: neck outside the collar, hands detached from the arms, hair floating off the head.
- Feet touch the ground or the seat, and nothing floats or sinks.
- The cast looks like one family: same line rule, same light, same shading tones.
- It doesn't look like a copy of the reference.

Once the user likes a character and it is used again, save it: `learn.py note` for the design rules the user gave, and
`learn.py use flat-character-<name>` so it becomes a saved look after 3 uses (SKILL.md section 8, if this version has
it).
