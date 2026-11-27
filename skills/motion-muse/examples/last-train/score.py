#!/usr/bin/env python3
"""Synthesize the whole trailer soundtrack (score + sound design) from formulas. numpy only.
Times come from storyboard.json bars, so music and picture share one clock."""
import json, os, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sb = json.load(open(os.path.join(HERE, "storyboard.json"), encoding="utf-8"))
SR, FPS = 48000, sb["fps"]
BEAT = 60 / sb["music"]["bpm"]; BAR = BEAT * sb["music"]["beats"]
starts, b = {}, 0.0
for s in sb["scenes"]: starts[s["id"]] = b * BAR; b += s["bars"]
T = b * BAR
N = int(T * SR) + SR
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)
fr = lambda sid, frames=0: starts[sid] + frames / FPS

def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR); sig = sig[: max(0, N - i)]
    L[i:i + len(sig)] += sig * gain * np.sqrt(0.5 * (1 - pan)); R[i:i + len(sig)] += sig * gain * np.sqrt(0.5 * (1 + pan))

def tt(d): return np.arange(int(d * SR)) / SR
def env(d, a=0.005, rel=None):
    t = tt(d); rel = rel or d; e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / (rel / 5)); return e
def noise(d): return rng.standard_normal(int(d * SR))
def pink(d):
    w = np.fft.rfft(noise(d)); f = np.fft.rfftfreq(int(d * SR), 1 / SR); f[0] = 1; return np.fft.irfft(w / np.sqrt(f), int(d * SR)) * 30
def band(d, lo, hi):
    n = int(d * SR); w = np.fft.rfft(noise(d)); f = np.fft.rfftfreq(n, 1 / SR); w[(f < lo) | (f > hi)] = 0; x = np.fft.irfft(w, n); return x / (np.abs(x).max() + 1e-9)
def saw(freq, d, detune=0.0):
    t = tt(d); ph = np.cumsum(np.broadcast_to(freq, t.shape) * (1 + detune) / SR); return 2 * (ph % 1) - 1
def sine(freq, d):
    t = tt(d); ph = np.cumsum(np.broadcast_to(freq, t.shape) / SR); return np.sin(2 * np.pi * ph)
def spec_lp(x, fc):
    n = len(x); w = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR); w *= 1 / np.sqrt(1 + (f / fc) ** 4); return np.fft.irfft(w, n)

# ---------- instruments ----------
def braam(d=3.5, root=36.71, bright=900):
    t = tt(d); x = np.zeros_like(t)
    for m, g in [(1, 1), (2, 0.8), (3, 0.5), (4, 0.35), (6, 0.2)]:
        for dt in (-0.006, 0, 0.007): x += saw(root * m, d, dt) * g
    x = np.tanh(x * 0.6)
    e = np.minimum(1, t / 0.08) * np.exp(-t / (d / 2.2))
    # brightness falls as the note decays
    seg = int(0.05 * SR); y = np.zeros_like(x)
    for i in range(0, len(x), seg):
        fc = 120 + bright * np.exp(-(i / SR) / 0.9); y[i:i + seg] = x[i:i + seg]
    y = spec_lp(y, bright)
    return y * e * 0.5
def sub_hit(d=1.6, f0=70, f1=28):
    t = tt(d); fq = f1 + (f0 - f1) * np.exp(-t / 0.12); x = sine(fq, d) * np.exp(-t / 0.6)
    crack = band(0.12, 1500, 9000) * np.exp(-tt(0.12) / 0.02)
    x[: len(crack)] += crack * 0.6
    return np.tanh(x * 1.8) * 0.9
def taiko(d=0.9):
    t = tt(d); fq = 55 + 90 * np.exp(-t / 0.03); x = sine(fq, d) * np.exp(-t / 0.18)
    sk = band(0.05, 200, 3000) * np.exp(-tt(0.05) / 0.01); x[: len(sk)] += sk * 0.5; return x * 0.9
def tick(d=0.06, f=3200):
    t = tt(d); return (sine(f, d) * 0.5 + band(d, 2000, 8000) * 0.5) * np.exp(-t / 0.008) * 0.5
def whoosh(d=0.8, up=True):
    t = tt(d); x = band(d, 300, 7000); shape = np.sin(np.pi * np.clip(t / d, 0, 1)) ** (2 if up else 1)
    return spec_lp(x * shape, 3000) * 0.6
def riser(d=4.0):
    t = tt(d); x = band(d, 200, 12000) * (t / d) ** 2.5 * 0.5
    x += sine(110 * 2 ** (3 * t / d), d) * (t / d) ** 2 * 0.25 + saw(55 * 2 ** (2 * t / d), d) * (t / d) ** 3 * 0.15
    return x
def thunder(d=4.0):
    t = tt(d); x = spec_lp(noise(d), 180) * np.exp(-t / 1.2) * 3
    cr = band(0.4, 800, 6000) * np.exp(-tt(0.4) / 0.05); x[: len(cr)] += cr * 0.8; return np.tanh(x)
def glass(d=2.0):
    x = np.zeros(int(d * SR))
    for k in range(260):
        s = rng.random() ** 2 * 1.4; f = 2500 + rng.random() * 9000; dd = 0.05 + rng.random() * 0.4
        p = sine(f, dd) * np.exp(-tt(dd) / (dd / 4)) * (0.2 + rng.random() * 0.3); i = int(s * SR); x[i:i + len(p)] += p[: len(x) - i]
    burst = band(0.5, 2000, 14000) * np.exp(-tt(0.5) / 0.08); x[: len(burst)] += burst
    return x * 0.6
def explosion(d=5.0):
    t = tt(d); x = spec_lp(noise(d), 300) * np.exp(-t / 1.4) * 4 + spec_lp(noise(d), 2500) * np.exp(-t / 0.25) * 1.5
    x = np.tanh(x)
    for k in range(200):  # crackle
        i = int((0.2 + rng.random() ** 1.5 * 4) * SR); c = band(0.02, 1000, 8000) * np.exp(-tt(0.02) / 0.004) * rng.random() * 0.5; x[i:i + len(c)] += c[: len(x) - i]
    sh = sub_hit(2.5, 60, 22) * 0.8; x[: len(sh)] += sh; return x
def engine(d=4.0):
    t = tt(d); f = 70 + 25 * np.sin(2 * np.pi * 0.6 * t) + 30 * (t / d)
    x = saw(f, d) * 0.5 + saw(f * 2.01, d) * 0.3 + spec_lp(noise(d), 1500) * 0.3
    am = 0.7 + 0.3 * np.sin(2 * np.pi * f * 0.25 * t)
    return spec_lp(np.tanh(x * am * 1.5), 2200) * 0.35
def siren(d=4.0):
    t = tt(d); f = 750 + 180 * np.sin(2 * np.pi * 0.45 * t); return spec_lp(sine(f, d) + 0.3 * sine(2 * f, d), 1600) * 0.07
def screech(d=4.0):
    t = tt(d); f = 3100 + 300 * np.sin(2 * np.pi * 1.7 * t) + 200 * np.sin(2 * np.pi * 5.3 * t); return (sine(f, d) * 0.6 + band(d, 2500, 6000) * 0.4) * 0.08
def heart():
    t = tt(0.5); x = sine(48 + 20 * np.exp(-t / 0.03), 0.5) * np.exp(-t / 0.09); x2 = np.zeros_like(x); s = int(0.18 * SR); x2[s:] = x[: len(x) - s] * 0.7; return (x + x2) * 0.9
def clang(d=4.0):
    x = np.zeros(int(d * SR)); t = tt(d)
    for m in [1, 2.76, 5.4, 8.93, 11.34, 13.2]: x += sine(180 * m, d) * np.exp(-t / (1.6 / m ** 0.5)) / m ** 0.6
    return x * 0.25

# ---------- arrangement ----------
silence_at, title_at = starts["silence"], starts["title"]
# rain bed + distant siren
add(spec_lp(pink(silence_at), 2500) * 0.035, 0); add(siren(4.5), 0.3, 1.0, -0.4)
# clock ticks on every beat until the silence, accent on bar lines
for k in range(int(silence_at / BEAT)):
    t0 = k * BEAT; g = 0.35 + 0.65 * min(1, t0 / 30); add(tick(f=4200 if k % 4 == 0 else 3000), t0, g * (1.3 if k % 4 == 0 else 1), 0.3)
# braams
for t0, g, br in [(0.0, 0.45, 500), (starts["aerial"], 0.8, 800), (starts["case"], 0.9, 1100), (starts["highway"], 0.9, 1300), (starts["train"], 1.0, 1500)]: add(braam(4.0, bright=br), t0, g)
# string-like pulse: 16ths from the case to the silence, rising
pat = [0, 0, 12, 0, 0, 0, 10, 0, 0, 0, 7, 0, 0, 3, 5, 7]
t0 = starts["case"]; k = 0
while t0 < silence_at - 0.01:
    prog = (t0 - starts["case"]) / (silence_at - starts["case"])
    step = BEAT / 4 if t0 < starts["montage"] else BEAT / 8
    semi = pat[k % 16] + (2 if t0 >= starts["highway"] else 0) + (5 if t0 >= starts["montage"] else 0)
    f = 73.42 * 2 ** (semi / 12); d = step * 0.9
    n = (saw(f, d, 0.003) + saw(f, d, -0.004) + 0.5 * saw(2 * f, d)) * np.exp(-tt(d) / (d / 2.5))
    add(spec_lp(n, 600 + 2600 * prog), t0, 0.12 + 0.12 * prog, 0.25 if k % 2 else -0.25)
    t0 += step; k += 1
# taiko on beats 1 and 3 through act two, every beat in the montage
t0 = starts["roof"]
while t0 < silence_at - 0.01:
    add(taiko(), t0, 0.9 if (t0 - starts["roof"]) % BAR < 0.01 else 0.55); t0 += BEAT * (2 if t0 < starts["montage"] else 1)
# whooshes into cards, impacts on hits
for sid in ("card1", "card2", "card3"): add(whoosh(0.6), starts[sid] - 0.45, 0.8)
for t0, g in [(fr("open", 70), 0.7), (fr("case", 6), 0.6), (fr("case", 24), 0.9), (fr("roof", 50), 1.0), (fr("glass", 6), 1.0), (fr("highway", 46), 0.7), (fr("blast", 6), 1.0), (fr("train", 24), 1.0), (starts["card2"], 0.8), (starts["card3"], 0.8)]: add(sub_hit(), t0, g)
add(thunder(), fr("eye", 22), 0.7, 0.3); add(thunder(4.5), fr("roof", 50), 1.0, -0.2)
add(glass(), fr("glass", 6), 0.9)
add(engine(4.0), starts["highway"], 0.9, -0.3)
add(band(2.0, 2000, 7000) * 0.2 * np.exp(-tt(2.0) / 0.8), fr("highway", 46), 1.0, 0.6)  # barrier scrape
add(explosion(), fr("blast", 6), 1.1)
add(screech(4.0), starts["train"], 1.0, 0.2)
# montage: a hit on every cut
cuts = [12, 12, 8, 8, 6, 6, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 3, 3]
c = 0
for i, n in enumerate(cuts):
    add(sub_hit(0.5, 90, 40) if i % 2 else taiko(), starts["montage"] + c / FPS, 0.55); c += n
add(riser(BAR * 2), starts["montage"], 0.9)
# hard cut to silence: then two heartbeats
i0 = int(silence_at * SR); L[i0:i0 + int(BAR * SR)] *= 0; R[i0:i0 + int(BAR * SR)] *= 0
add(heart(), fr("silence", 8), 1.0); add(heart(), fr("silence", 20), 0.8)
add(whoosh(0.5), title_at - 0.35, 0.7)
# title slam
add(sub_hit(3.0, 80, 22), title_at, 1.3); add(braam(6.0, bright=1600), title_at, 1.1); add(clang(), title_at, 0.8)
add(explosion(3.0) * 0.4, title_at, 0.6)
add(whoosh(0.9), fr("title", 52) - 0.3, 0.5)
add(sub_hit(3.0, 60, 24), fr("title", 96), 0.9); add(braam(3.0, root=29.14, bright=500), fr("title", 96), 0.6)

# ---------- room + master ----------
def reverb(x, d=2.2, mix=0.22):
    ir = noise(d) * np.exp(-tt(d) / 0.45); ir = spec_lp(ir, 5000); ir /= np.abs(ir).sum() ** 0.5 * 40
    n = len(x) + len(ir); F = np.fft.rfft(x, n) * np.fft.rfft(ir, n); return x + np.fft.irfft(F, n)[: len(x)] * mix * 40
L, R = reverb(L), reverb(R)
i0, n0 = int(silence_at * SR), int(0.3 * SR); L[i0:i0 + n0] *= np.linspace(1, 0.2, n0); R[i0:i0 + n0] *= np.linspace(1, 0.2, n0)  # keep the silence clean-ish
m = max(np.abs(L).max(), np.abs(R).max()); L, R = np.tanh(L / m * 1.6) / np.tanh(1.6), np.tanh(R / m * 1.6) / np.tanh(1.6)
L, R = L[: int(T * SR)] * 0.89, R[: int(T * SR)] * 0.89
fade = int(1.2 * SR); L[-fade:] *= np.linspace(1, 0, fade); R[-fade:] *= np.linspace(1, 0, fade)
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "..", "public", "audio", "trailer", "score.wav")
os.makedirs(os.path.dirname(out), exist_ok=True)
pcm = (np.stack([L, R], 1) * 32767).astype(np.int16)
with wave.open(out, "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f"wrote {out}  {T:.1f}s")
