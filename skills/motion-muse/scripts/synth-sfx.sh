#!/usr/bin/env bash
# Generates SFX with ffmpeg only (your own synthesized audio, no third-party license).
# Usage: bash synth-sfx.sh <out-dir> [bpm] [bars] [root-hz]
#   with bpm, also writes bed.wav: a soft plucked pulse in that tempo (bar 1 beat 1 at 0 s) to cut against,
#   and the pitched sounds (pluck, bell) are tuned to root-hz (default 220 = A) so they sit with the bed.
# Every sound is a formula: change a number and you have a new sound nobody else has.
set -e
O="${1:-./sfx-synth}"; mkdir -p "$O"
BPM="${2:-}"; BARS="${3:-8}"; R="${4:-220}"
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
# --- handmade set (paper, pencil, brush, wood): sounds of things being made by hand ---
# pencil: fast scratchy strokes, noise through a narrow high band, gated in 4 strokes
f -f lavfi -i "anoisesrc=d=0.7:c=white:a=0.6:r=48000" -af "highpass=f=2500,lowpass=f=7000,volume='0.9*abs(sin(2*PI*5.5*t))*(1-t/0.7)':eval=frame" "$O/pencil.wav"
# brush: one soft dry swipe, pink noise with a slow swell
f -f lavfi -i "anoisesrc=d=0.5:c=pink:a=0.7" -af "bandpass=f=1800:width_type=o:w=1.5,volume='sin(PI*t/0.5)^2':eval=frame" "$O/brush.wav"
# paper: a sheet flipped, two noise flutters with a crisp edge
f -f lavfi -i "anoisesrc=d=0.35:c=white:a=0.8" -af "highpass=f=1200,volume='(exp(-25*t)+0.6*exp(-30*abs(t-0.16))*gt(t,0.12))':eval=frame" "$O/paper.wav"
# fold: a crease pressed, short low tap + paper tick
f -f lavfi -i "aevalsrc='0.6*sin(2*PI*180*t)*exp(-50*t)+0.35*(random(1)-0.5)*exp(-120*t)':d=0.15" "$O/fold.wav"
# knock: wood block, two inharmonic partials decaying fast
f -f lavfi -i "aevalsrc='0.7*sin(2*PI*820*t)*exp(-38*t)+0.4*sin(2*PI*1340*t)*exp(-55*t)+0.2*(random(2)-0.5)*exp(-200*t)':d=0.25" "$O/knock.wav"
# thud: something soft landing
f -f lavfi -i "aevalsrc='0.9*sin(2*PI*(75-25*t)*t)*exp(-11*t)':d=0.4" "$O/thud.wav"
# pluck: tuned string-ish note (harmonics that die faster the higher they are)
f -f lavfi -i "aevalsrc='0.5*sin(2*PI*$R*t)*exp(-5*t)+0.25*sin(2*PI*2*$R*t)*exp(-9*t)+0.12*sin(2*PI*3*$R*t)*exp(-14*t)':d=1.2" "$O/pluck.wav"
# bell: tuned small bell (bright inharmonic partials, long tail)
f -f lavfi -i "aevalsrc='0.35*sin(2*PI*4*$R*t)*exp(-3*t)+0.2*sin(2*PI*4*$R*2.76*t)*exp(-6*t)+0.12*sin(2*PI*4*$R*5.4*t)*exp(-10*t)':d=2" "$O/bell.wav"
# flutter: wings / paper plane passing, amplitude-modulated noise with a doppler-ish band sweep
f -f lavfi -i "anoisesrc=d=0.9:c=pink:a=0.8" -af "bandpass=f=1100:width_type=o:w=1.2,volume='sin(PI*t/0.9)*(0.6+0.4*sin(2*PI*22*t))':eval=frame" "$O/flutter.wav"
if [ -n "$BPM" ]; then
  # bed: one plucked note per beat, accent on beat 1, the root moves I-vi-IV-V every bar (4/4)
  D=$(python3 -c "print(round($BARS*4*60/$BPM, 3))")
  B="(60/$BPM)"; PH="mod(t,$B)"; BAR="mod(floor(t/$B/4),4)"
  F="$R*if(eq($BAR,0),1,if(eq($BAR,1),0.8409,if(eq($BAR,2),0.6674,0.7492)))"
  ACC="if(eq(mod(floor(t/$B),4),0),1,0.55)"
  f -f lavfi -i "aevalsrc='$ACC*(0.32*sin(2*PI*$F*t)+0.14*sin(2*PI*2*$F*t)+0.08*sin(2*PI*1.5*$F*t))*exp(-7*$PH)+0.05*sin(2*PI*$F/2*t)':d=$D" -af "lowpass=f=3000,afade=t=out:st=$(python3 -c "print(max(0, $D-1.5))"):d=1.5" "$O/bed.wav"
fi
ls "$O"
