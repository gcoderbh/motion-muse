# Motion Muse

(Previously named thai-motion-video. Old links redirect here.)

Agent skill for making motion-rich videos with Thai text: Video Shotcraft + Remotion + the awesome-ai-motion gallery, beat-synced, with royalty-free music/SFX sources.

## Install

- Devin: ask Devin to "install the plugin https://github.com/peichh/motion-muse".
- Claude Code: `git clone https://github.com/peichh/motion-muse && cp -r motion-muse/skills/motion-muse ~/.claude/skills/`
- Any agent that supports `npx skills`: `npx skills add peichh/motion-muse`
- Other agents: copy `skills/motion-muse` into the agent's skills folder.

Then ask the agent: "use motion-muse to make a 15 s 9:16 reel about ...".

The first time it runs, the skill calls `scripts/setup.sh`, which checks git, Node.js ≥ 20, ffmpeg and curl, then installs whatever is missing into `~/skills`:
Video Shotcraft, Remotion skills, guanmo-ai/awesome-ai-motion, gongnyang/awesome-ai-motion, the Prompt Thai font, Remotion and headless Chrome.

## Inside

- `SKILL.md`: the workflow (brief → techniques → Remotion build → beat sync → render/QA → deliver)
- `references/sound-sources.md`: royalty-free BGM/SFX sources and licenses, and how to make your own sound
- `references/motion-sources.md`: where to get effects and techniques, and their licenses
- `scripts/find-music.py`: finds a free Mixkit track that fits the video and never reuses one
- `references/editing-craft.md`: which transition fits which scene change, pacing, and a checklist so clips do not look AI-made
- `scripts/`: `setup.sh`, `synth-sfx.sh`, `beat-grid.py`
- `starter/`: a working 15 s 9:16 Thai reel, plus `transitions.tsx` (12 ready transitions with SFX) and a `TransitionsDemo` that shows each one

ElevenLabs is optional and is only used after the agent asks you.

## License

MIT for this skill. Dependencies keep their own licenses (Shotcraft Apache-2.0, Remotion License, Prompt OFL). Remotion needs a company license for companies with more than 3 employees.
