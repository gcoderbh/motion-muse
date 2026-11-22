#!/usr/bin/env bash
# Download Thai Google Fonts (SIL OFL) into a project's public/fonts, cached in $SKILLS_DIR/fonts/google.
# Usage: bash thai-fonts.sh public/fonts Kanit "IBM Plex Sans Thai" Mali
# Families: Prompt Kanit "IBM Plex Sans Thai" "Noto Sans Thai" Anuphan Sarabun Mitr "Chakra Petch" "Bai Jamjuree" Mali Itim Sriracha Trirong "Noto Serif Thai" Charm
set -u
DEST="${1:?usage: thai-fonts.sh <dest> <family>...}"; shift
CACHE="${SKILLS_DIR:-$HOME/skills}/fonts/google"; mkdir -p "$DEST" "$CACHE"
files() {
  case "$1" in
    Prompt) echo "prompt Prompt-Light.ttf Prompt-Medium.ttf Prompt-Bold.ttf Prompt-Black.ttf";;
    Kanit) echo "kanit Kanit-ExtraLight.ttf Kanit-Light.ttf Kanit-Regular.ttf Kanit-SemiBold.ttf Kanit-ExtraBold.ttf Kanit-Black.ttf";;
    "IBM Plex Sans Thai") echo "ibmplexsansthai IBMPlexSansThai-Thin.ttf IBMPlexSansThai-ExtraLight.ttf IBMPlexSansThai-Light.ttf IBMPlexSansThai-Regular.ttf IBMPlexSansThai-Medium.ttf IBMPlexSansThai-Bold.ttf";;
    "Noto Sans Thai") echo "notosansthai NotoSansThai[wdth,wght].ttf";;
    Anuphan) echo "anuphan Anuphan[wght].ttf";;
    Sarabun) echo "sarabun Sarabun-Light.ttf Sarabun-Regular.ttf Sarabun-Bold.ttf";;
    Mitr) echo "mitr Mitr-Light.ttf Mitr-Medium.ttf Mitr-Bold.ttf";;
    "Chakra Petch") echo "chakrapetch ChakraPetch-Light.ttf ChakraPetch-Medium.ttf ChakraPetch-Bold.ttf";;
    "Bai Jamjuree") echo "baijamjuree BaiJamjuree-Light.ttf BaiJamjuree-Medium.ttf BaiJamjuree-Bold.ttf";;
    Mali) echo "mali Mali-Regular.ttf Mali-SemiBold.ttf Mali-Bold.ttf";;
    Itim) echo "itim Itim-Regular.ttf";;
    Sriracha) echo "sriracha Sriracha-Regular.ttf";;
    Trirong) echo "trirong Trirong-Light.ttf Trirong-Regular.ttf Trirong-Bold.ttf";;
    "Noto Serif Thai") echo "notoserifthai NotoSerifThai[wdth,wght].ttf";;
    Charm) echo "charm Charm-Regular.ttf Charm-Bold.ttf";;
    *) return 1;;
  esac
}
rc=0
for fam in "$@"; do
  spec=$(files "$fam") || { echo "UNKNOWN font: $fam"; rc=1; continue; }
  set -- $spec; dir=$1; shift
  for f in "$@"; do
    [ -s "$CACHE/$f" ] || curl -sfL -o "$CACHE/$f" "https://github.com/google/fonts/raw/main/ofl/$dir/$(printf %s "$f" | sed 's/\[/%5B/g; s/\]/%5D/g')" || { echo "FAIL $fam: $f"; rc=1; continue; }
    cp "$CACHE/$f" "$DEST/"
  done
  echo "OK   $fam"
done
exit $rc
