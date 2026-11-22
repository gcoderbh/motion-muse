#!/usr/bin/env bash
# Generates basic SFX with ffmpeg only (your own synthesized audio, no third-party license).
# Usage: bash synth-sfx.sh <out-dir>
set -e
O="${1:-./sfx-synth}"; mkdir -p "$O"
f() { ffmpeg -hide_banner -loglevel error -y "$@"; }
# whoosh: band-passed noise sweeping up then down
f -f lavfi -i "anoisesrc=d=0.6:c=pink:a=0.9" -af "bandpass=f=900:width_type=o:w=2,volume='if(lt(t,0.3),t/0.3,(0.6-t)/0.3)':eval=frame,afade=t=out:st=0.45:d=0.15" "$O/whoosh.wav"
# pop: short sine blip with pitch drop
f -f lavfi -i "aevalsrc='sin(2*PI*(900-700*t/0.08)*t)*exp(-40*t)':d=0.12" "$O/pop.wav"
# hit: low sine thump + noise click
f -f lavfi -i "aevalsrc='0.9*sin(2*PI*(110-60*t)*t)*exp(-9*t)+0.3*(random(0)-0.5)*exp(-80*t)':d=0.5" "$O/hit.wav"
# riser: rising sine + noise for 2 s
f -f lavfi -i "aevalsrc='0.5*sin(2*PI*(200+600*t*t/4)*t)*(t/2)+0.15*(random(0)-0.5)*(t/2)':d=2" -af "afade=t=out:st=1.9:d=0.1" "$O/riser.wav"
# tick: very short click
f -f lavfi -i "aevalsrc='sin(2*PI*2500*t)*exp(-300*t)':d=0.03" "$O/tick.wav"
# sparkle: decaying high tones
f -f lavfi -i "aevalsrc='0.4*(sin(2*PI*2093*t)+sin(2*PI*2637*t)*gt(t,0.06)+sin(2*PI*3136*t)*gt(t,0.12))*exp(-6*t)':d=0.8" "$O/sparkle.wav"
ls "$O"
