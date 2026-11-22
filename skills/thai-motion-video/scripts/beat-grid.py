#!/usr/bin/env python3
"""Find the beat phase (and optionally BPM) of a track without librosa.
Usage: python3 beat-grid.py song.mp3 [--bpm 123] [--start 0] [--dur 60] [--fps 30]
Prints BPM, first-beat offset, loudness per 2 s (to spot drops) and suggested phrase starts."""
import argparse, math, struct, subprocess

ap = argparse.ArgumentParser()
ap.add_argument('audio'); ap.add_argument('--bpm', type=float)
ap.add_argument('--start', type=float, default=0); ap.add_argument('--dur', type=float, default=60)
ap.add_argument('--fps', type=float, default=30)
a = ap.parse_args()
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', str(a.start), '-t', str(a.dur), '-i', a.audio,
                      '-ac', '1', '-ar', '4000', '-f', 's16le', '-'], capture_output=True, check=True).stdout
n = len(raw) // 2; s = struct.unpack('<%dh' % n, raw); hop = 40  # 10 ms
env = [math.sqrt(sum(x * x for x in s[i:i + hop]) / hop) for i in range(0, n - hop, hop)]
flux = [max(0.0, env[i] - env[i - 1]) for i in range(1, len(env))]

def score(period, phase):
    t, sc = phase, 0.0
    while t < len(flux) - 1: sc += flux[int(t)]; t += period
    return sc

def best_phase(bpm):
    P = 6000 / bpm
    return max((score(P, p / 10), p / 10) for p in range(int(P * 10)))

if a.bpm: bpm = a.bpm
else:
    cands = [b / 2 for b in range(140, 361)]  # 70–180 BPM in 0.5 steps
    bpm = max(cands, key=lambda b: best_phase(b)[0] / (len(flux) / (6000 / b)))
sc, ph = best_phase(bpm)
off = a.start + ph / 100; beat = 60 / bpm
print(f'BPM {bpm:.1f}  first beat {off:.3f}s  beat = {beat * a.fps:.3f} frames @ {a.fps}fps')
print('loudness per 2 s (look for jumps = drops/sections):')
for i in range(0, int(a.dur), 2):
    seg = env[i * 100:(i + 2) * 100]
    if seg: print(f'  {a.start + i:6.1f}s  {sum(seg) / len(seg):8.0f}')
print('phrase starts (every 8 bars):', ', '.join(f'{off + k * 32 * beat:.2f}s' for k in range(0, 6)))
