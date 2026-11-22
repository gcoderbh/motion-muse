# Motion and effect sources

Rule: take techniques and ideas, not other people's footage, covers, characters or brand assets. Rebuild the effect yourself in Remotion.

| Source | Where | What you get | License |
|---|---|---|---|
| Video Shotcraft shot cards | `$SKILLS_DIR/video-shotcraft/references/shots/` + `assets/lib/` | 152 recipe cards (timing, easing, layout) and React components ready for Remotion | Apache-2.0 |
| awesome-ai-motion gallery (guanmo-ai) | `$SKILLS_DIR/awesome-ai-motion/data/cases.json`, covers in `assets/covers/` | 2,129 AI-made motion works with summaries, categories and, for some, the author's prompt | MIT for the repo code only. The works, covers and prompts belong to their authors |
| AI Motion effect library (gongnyang) | `$SKILLS_DIR/motion-cards/` | 637 effect cards with timing/easing, 128 rendered HTML/GSAP clips, 11 scene recipes | MIT |
| Remotion skills | `$SKILLS_DIR/remotion-skills/skills/` | How to do transitions, captions, audio, 3D, Lottie, charts in Remotion | See repo |
| Remotion docs and templates | https://www.remotion.dev/docs · https://www.remotion.dev/templates | `@remotion/transitions`, `@remotion/shapes`, `@remotion/paths`, `@remotion/lottie`, `@remotion/three` | Remotion License (below) |
| GSAP | https://gsap.com | Easing ideas and HTML animations (used by motion-cards) | Free, including the plugins |
| LottieFiles | https://lottiefiles.com/free-animations | Free Lottie animations, play with `@remotion/lottie` | Lottie Simple License; check each file |
| Google Fonts | https://fonts.google.com | Thai fonts: Prompt, Kanit, Noto Sans Thai, IBM Plex Sans Thai, Mitr | SIL OFL 1.1 |
| Icons | https://lucide.dev · https://phosphoricons.com | SVG icons | ISC / MIT |

## Remotion license (important when sharing)

Remotion is free for individuals, non-profits and companies with up to 3 employees. Bigger companies need a company license: https://www.remotion.dev/license

## Finding a technique in the gallery

```bash
cd "$SKILLS_DIR/awesome-ai-motion"
# categories: 短动效 short motion · 产品宣传 product promo · 知识讲解 explainer · 叙事短片 story · 音乐与歌词 music/lyrics · 3D 与交互 · 像素与角色 pixel/character
jq -r '.cases[] | select(.category=="短动效" and .prompt.status!="unknown") | [.id,.titleEn,.summaryEn[:120]] | @tsv' data/cases.json | head -30
jq '.cases[] | select(.id=="<id>") | {titleEn, summaryEn, prompt: .prompt.text, cover: .cover.path, src: .source.url}' data/cases.json
grep -ril "<keyword>" "$SKILLS_DIR/motion-cards" | head      # effect cards with timing/easing
ls "$SKILLS_DIR/video-shotcraft/references/shots/"           # shot recipe cards
```

Then look at the cover image, write down the technique in one line (for example "kinetic words hit on each beat with a color flash"), and build it with the Shotcraft card that matches it.

## Techniques already tested in Thai (see `starter/src/Reel.tsx`)

| Technique | Notes |
|---|---|
| Kinetic beats | One word per beat, background color flash, small camera shake |
| Mask reveal + per-grapheme pop | Split Thai text with `Intl.Segmenter('th', {granularity:'grapheme'})` so vowels and tone marks stay on their letter |
| One-shape morph | Button → loader → check → toggle → card without a cut |
| Data story | Number counter, bars growing one by one, callout labels |
| Breakout | Items leave the frame border, then end card |
| Whip transitions | Fast blur slide on the downbeat with a whoosh SFX |
