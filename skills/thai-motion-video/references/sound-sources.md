# Sound sources: royalty-free music, SFX and making your own

Rule: write the title, URL, license and date into `public/audio/CREDITS.md` the moment you download a file. You cannot look it up later.
Licenses change. Open the license page and check it again before you use a file in commercial or monetized work.

## 1. Already installed (use these first)

| What | Where | License |
|---|---|---|
| 5 BGM tracks | `$SKILLS_DIR/video-shotcraft/assets/audio/bgm/` | Mixkit (see `ATTRIBUTION.md`) |
| 149 SFX in 16 categories (transition, impact, riser, ui, text, light, data, camera, counter, glass, fluid, film, mech, scifi, crowd, paper) | `$SKILLS_DIR/video-shotcraft/assets/audio/sfx/<category>/` | Mostly Mixkit. Some files have no source URL; check them in `ATTRIBUTION.md` before commercial use |
| Which sound goes with which shot | `$SKILLS_DIR/video-shotcraft/references/sound-design.md` | — |
| Beat sync rules | `$SKILLS_DIR/video-shotcraft/references/music-beat-sync.md` | — |

## 2. Free music (BGM)

| Source | Link | License in short | Credit needed |
|---|---|---|---|
| Mixkit | https://mixkit.co/free-stock-music/ | Mixkit Stock Music Free License: commercial use OK, no standalone resale | No |
| Pixabay Music | https://pixabay.com/music/ | Pixabay Content License: commercial use OK. Some tracks are registered in YouTube Content ID; keep the license certificate | No |
| YouTube Audio Library | https://studio.youtube.com (Audio Library) | Free for YouTube videos. Each track says if credit is needed | Some tracks |
| Incompetech (Kevin MacLeod) | https://incompetech.com/music/ | CC BY 4.0 | Yes |
| Free Music Archive | https://freemusicarchive.org | Each track has its own CC license. Avoid NC (non-commercial) and ND (no-derivatives) tracks for edits | Depends |
| Uppbeat | https://uppbeat.io | Free plan has monthly limits and needs a credit line | Yes (free plan) |

## 3. Free sound effects (SFX)

| Source | Link | License in short | Credit needed |
|---|---|---|---|
| Mixkit SFX | https://mixkit.co/free-sound-effects/ | Mixkit SFX Free License, commercial OK | No |
| Pixabay SFX | https://pixabay.com/sound-effects/ | Pixabay Content License | No |
| Freesound | https://freesound.org | Each sound is CC0, CC BY or CC BY-NC. Filter by license; use CC0 or CC BY | CC BY: yes |
| ZapSplat | https://www.zapsplat.com | Free account needs a credit line | Yes (free) |
| Sonniss GDC bundles | https://sonniss.com/gameaudiogdc | Royalty-free, commercial OK | No |
| OpenGameArt (audio) | https://opengameart.org | Each file has its own license (CC0/CC BY/GPL) | Depends |
| BBC Sound Effects | https://sound-effects.bbcrewind.co.uk | RemArc license: personal, educational and research use only. **Not for commercial work** | — |

## 4. Make your own sound (no third-party license needed)

| Method | How | Good for |
|---|---|---|
| `scripts/synth-sfx.sh <dir>` | ffmpeg-only synthesis: whoosh, pop, hit, riser, tick, sparkle | Quick UI/motion SFX that you own |
| ffmpeg `aevalsrc` / `anoisesrc` | Write your own formula (sine + decay = pop, filtered noise = whoosh) | Custom timing that matches a shot exactly |
| jsfxr | https://sfxr.me | Retro/game blips, coins, lasers |
| Tone.js / Web Audio | https://tonejs.github.io | Beats, arps and melodies in code |
| ElevenLabs Sound Effects / Music / TTS | https://elevenlabs.io/docs | **Ask the user first** (paid API). Commercial rights depend on the plan: the free plan needs credit and is not for commercial use |
| Stable Audio Open | https://huggingface.co/stabilityai/stable-audio-open-1.0 | Stability AI Community License; needs a GPU |
| Meta MusicGen (AudioCraft) | https://github.com/facebookresearch/audiocraft | Model weights are CC BY-NC 4.0: **non-commercial only** |

## 5. Mixing checklist

- BGM at about -18 to -14 LUFS under voice; SFX on the hit frame, not before.
- Fade BGM out over the last 0.5–1 s; do not end on silence.
- Check with `ffmpeg -i out/video.mp4 -af volumedetect -f null -` that max volume is not above 0 dB.
