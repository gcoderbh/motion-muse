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

## 9. Check before you use a new character

Render a still of the character on the scene background with `npx remotion still`. Show it in front view in 3 poses
(rest, a gesture, an extreme expression), next to the other characters in the cast. Look at the still and check:

- It still reads at thumbnail size, and in grayscale the face is the lightest area.
- No part sticks out wrongly: neck outside the collar, hands detached from the arms, hair floating off the head.
- The cast looks like one family: same line rule, same light, same shading tones.
- It doesn't look like a copy of the reference.

Once the user likes a character and it is used again, save it: `learn.py note` for the design rules the user gave, and
`learn.py use flat-character-<name>` so it becomes a saved look after 3 uses (SKILL.md section 8, if this version has
it).
