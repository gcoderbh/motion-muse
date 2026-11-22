#!/usr/bin/env bash
# Checks and installs everything motion-muse needs. Safe to re-run.
# Usage: bash setup.sh            (installs into ~/skills)
#        SKILLS_DIR=/path bash setup.sh
set -u
SKILLS_DIR="${SKILLS_DIR:-$HOME/skills}"
ok=1
need() { command -v "$1" >/dev/null 2>&1 || { echo "MISSING: $1 — $2"; ok=0; }; }
need git  "install git"
need node "install Node.js >= 20 (https://nodejs.org)"
need npm  "comes with Node.js"
need ffmpeg "Ubuntu: sudo apt-get install -y ffmpeg · macOS: brew install ffmpeg · Windows: winget install ffmpeg"
need curl "install curl"
command -v jq >/dev/null 2>&1 || echo "optional: jq not found (gallery queries can use python3 instead)"
if command -v node >/dev/null 2>&1; then
  major=$(node -p 'process.versions.node.split(".")[0]')
  [ "$major" -ge 20 ] || { echo "MISSING: Node.js >= 20 (found $(node -v))"; ok=0; }
fi
[ "$ok" = 1 ] || { echo "Install the missing tools above, then re-run."; exit 1; }

mkdir -p "$SKILLS_DIR/fonts/prompt"
clone() { # name url
  if [ -d "$SKILLS_DIR/$1/.git" ]; then
    git -C "$SKILLS_DIR/$1" pull -q --ff-only 2>/dev/null || true; echo "OK   $1 (updated)"
  else
    git clone -q --depth 1 "$2" "$SKILLS_DIR/$1" && echo "NEW  $1" || { echo "FAIL $1 ($2)"; ok=0; }
  fi
}
clone video-shotcraft   https://github.com/dell0721/skill-
clone remotion-skills   https://github.com/remotion-dev/skills
clone awesome-ai-motion https://github.com/guanmo-ai/awesome-ai-motion
clone motion-cards      https://github.com/gongnyang/awesome-ai-motion

for w in Light Medium Bold Black; do
  f="$SKILLS_DIR/fonts/prompt/Prompt-$w.ttf"
  [ -s "$f" ] || curl -sfL -o "$f" "https://github.com/google/fonts/raw/main/ofl/prompt/Prompt-$w.ttf" || { echo "FAIL font Prompt-$w"; ok=0; }
done
[ -s "$SKILLS_DIR/fonts/prompt/OFL.txt" ] || curl -sfL -o "$SKILLS_DIR/fonts/prompt/OFL.txt" https://github.com/google/fonts/raw/main/ofl/prompt/OFL.txt || true
echo "OK   Prompt Thai font"

T="$SKILLS_DIR/video-shotcraft/template"
if [ -d "$T" ]; then
  if [ ! -d "$T/node_modules/remotion" ]; then (cd "$T" && npm install --no-audit --no-fund --loglevel=error) || ok=0; fi
  (cd "$T" && npx --yes remotion browser ensure >/dev/null 2>&1) && echo "OK   Remotion deps + headless browser" || { echo "FAIL remotion browser ensure"; ok=0; }
fi
python3 -c "import librosa" 2>/dev/null && echo "OK   librosa" || echo "optional: pip install librosa (better beat analysis; scripts/beat-grid.py works without it)"
python3 -c "import faster_whisper" 2>/dev/null && echo "OK   faster-whisper" || echo "optional: pip install faster-whisper (Thai captions from speech in footage; only needed for scripts/transcribe.py)"

[ "$ok" = 1 ] && echo "READY: $SKILLS_DIR" || { echo "Setup finished with errors (see FAIL lines)."; exit 1; }
