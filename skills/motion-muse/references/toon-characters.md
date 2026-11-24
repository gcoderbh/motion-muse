# Making and saving toon characters

How to make a new character or outfit for `lib/toon.tsx` (princess, king, witch, chef, a person from a reference
picture), check it from every side, and save it in the skill so the next episode gets the same character by name.
Characters are code built from simple shapes, not AI images: aim for a clear cartoon that reads as the reference
(colours, silhouette, hair, outfit, one or two signature props), not a copy of it.

## 1. Start from the closest preset

Presets in `LOOKS`: `zombie`, `clerk`, `aunty`, `guard`, `kid`, `princess`, plus every saved character
(`story.py cast list`). A new character is a preset with changes. Pick the one with the nearest body and outfit:

| Want | Start from | Change |
|---|---|---|
| princess, queen, bride | `princess` | `shirt` (dress colour), `hair`, `hairColor`, `hat`, `cape`, `trim`, `gem` |
| king, prince, hero | `clerk` or `guard` | `hat: 'crown'`, `cape`, `shirt`, `tie: undefined` |
| schoolgirl, dancer | `kid` | `outfit: 'skirt'`, `dress`, `hair: 'ponytail'`, `lashes`, `blush` |
| office worker, doctor | `clerk` | `shirt`, `tie`, `glasses`, `sleeves` |
| monster, ghoul | `zombie` | `skin`, `iris`, `torn`, `teeth` |

### Parts you can set (`ToonLook`)

- Body: `head` (head radius, 0.35 adult, 0.4 child, 0.44 big-headed), `build` (width, 0.8–1.25), `height` (0.7–1).
- Face: `eyes` (`dot` or `bulge`), `iris`, `nose`, `lashes`, `blush` (cheek colour), `teeth`, `glasses`, `bandage`.
- Hair: `hair` = `strands`, `cap` (short), `bun`, `spiky`, `bald`, `police` (cap and hat), `long` (to the shoulders
  with side locks), `ponytail`; `hairColor` also colours the brows.
- Clothes: `shirt` (top), `pants` (legs; skin colour for bare legs or tights under a skirt), `shoes`, `sole`,
  `sleeves` (`short`, `long`, `puff`), `outfit` (`pants`, `skirt` to the knee, `gown` to the floor), `dress` (skirt or
  gown colour, default `shirt`), `trim` (hem band), `cape`, `tie`, `badge`, `torn`.
- Headwear: `hat` = `crown` or `tiara`, `hatColor`, `gem`.

## 2. From a reference picture

When the person attaches a picture (their own drawing, a photo, a mascot they own):

1. Colours: `python3 scripts/story.py cast palette ref.png 8` lists the main colours with their share. Map them to
   skin, hair, top, bottom, shoes and accents. Cel shading darkens the shadow side, so pick the lit colour, slightly
   lighter and more saturated than the photo.
2. Silhouette: head size against the body (`head`), wide or slim (`build`), tall or short (`height`). Chibi
   references: `head` 0.44–0.48, `height` 0.75.
3. Hair shape: the closest `hair` value. Outfit: `outfit` + `sleeves`. Headwear and the one prop they hold
   (`handR` / `handL`, e.g. a wand built from `cyl` + `sphere`).
4. If something that defines the character is missing (cat ears, a witch hat, a beard, a tail), add it as a new part
   (section 4), not a one-off mesh in a scene, so the saved character keeps it.
5. Only use pictures the person owns or may use. A famous copyrighted character (Disney princesses, anime heroes)
   is not copied: make an original character in that genre and tell the person why.

## 3. Write it down once and check every side

Put the character in the project's `src/lib/cast.json` (made by `director.py init --caps toon`):

```json
{
  "queen": { "about": "แม่ของเจ้าหญิง ใจดีแต่ขี้บ่น", "base": "princess",
             "look": { "shirt": "#6A3FA0", "hair": "bun", "hairColor": "#3A2418", "cape": "#B0263A", "trim": "#F2C14E" } }
}
```

`base` is a preset or another saved character; `look` holds only what differs. It is then `LOOKS.queen` in every
shot (`<ToonCharacter look={LOOKS.queen} ... />`), which keeps it identical everywhere. For a one-shot variant in code:
`look('princess', { shirt: '#5B8DEF' })`.

Check a turnaround before using it in the story: a test composition with the character on a `Floor`,
`yaw={(f / 120) * Math.PI * 2}`, stills at frames 0, 30, 60, 90 (front, side, back, side), side by side with
`ffmpeg ... -filter_complex hstack=4`. Look for parts poking through others, hair that reads as a box from behind,
colours gone black in shadow, and a face that still reads at phone size (subtitle-free top two thirds of 9:16).
Compare with the reference if there is one, fix, render again. Show the person the sheet before the episode.

## 4. Adding a new part or outfit

Edit the skill's `starter/kits/three/toon.tsx` (then copy it into the project's `src/lib/`), never only the project
copy, or saved characters that use the part will not render in the next project.

- Add an optional field to `ToonLook` (`ears?: 'cat' | 'bunny'`, `beard?: string`), so characters stay data in
  `cast.json`. Old characters without the field must look the same.
- Build it from `Part` with `sphere`, `capsule`, `rbox`, `cyl`, `cone`, `tube`; the colour comes from the look.
- Attach it to the group that should move it: head parts go next to `<Hair>` / `<Hat>` (they turn with the head),
  torso parts in the lean group (they bend with the body), skirts and capes at the hip, held props through
  `handR` / `handL`. Sizes are relative to `hr` (head) and `bw` (build) so it fits every body.
- Outline (`ol`) 0.008–0.016 for small parts, 0 for flat details on the face (blush, freckles) and for thin flat parts
  (capes, flags, paper): the ink shell is thicker than they are and turns them black. Something on the far side of the
  body from the key light gets dark: give large dark-side parts `glow` 0.2–0.3 (as `cape` does).
- Everything from props and the frame number; no state, no `Math.random()`.

## 5. Save it in the skill

```bash
python3 scripts/story.py cast save ~/videos/<slug> queen --about "แม่ของเจ้าหญิง" --still out/queen-turn.png
python3 scripts/story.py cast list                      # what the library holds
python3 scripts/story.py cast pull ~/videos/<new-slug>  # copy saved characters into an existing project
```

`save` copies the entry (and a `base` that is itself a project character) into the skill's `characters/cast.json`,
and the turnaround still to `characters/<name>.png`. New projects get every saved character from
`director.py init --caps toon`. It warns if the project's `toon.tsx` has parts the skill's copy lacks.
The library lives in the installed skill folder: commit `characters/` (and any new parts in `toon.tsx`) to the skill's
repository to keep the characters on other computers and share them.
