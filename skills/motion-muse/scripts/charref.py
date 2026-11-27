#!/usr/bin/env python3
"""Reference → code character helpers (ffmpeg + numpy only).

  charref.py prep <image> <out-dir>          ref.png (1000×1000), grid.png, edges.png (both with a labelled 50 px grid),
                                             palette.json + palette.png (main colours with their share of the picture)
  charref.py compare <ref.png> <render.png> <out.png>
                                             side by side, 50 % overlay, reference edges in red over the render,
                                             prints colour-layout distance and silhouette IoU (lower / higher = closer)

Author the character's paths on grid.png coordinates (lib/refchar.tsx), render it at the reference's pose, compare,
fix the biggest difference, repeat."""
import json, os, subprocess, sys
import numpy as np

S = 1000
FONT = next((f for f in ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/TTF/DejaVuSans.ttf", "/System/Library/Fonts/Supplemental/Arial.ttf"] if os.path.exists(f)), None)

def ff(*a): r = subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *a], capture_output=True, text=True); r.returncode and sys.exit(r.stderr)
def pixels(path, w=S, h=S):
    r = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-vf", f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:white", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True)
    return np.frombuffer(r.stdout, np.uint8).reshape(h, w, 3).astype(np.float32)

def grid_vf(color="0x00A0FF"):
    vf = f"drawgrid=w=50:h=50:t=1:c={color}@0.25,drawgrid=w=100:h=100:t=2:c={color}@0.55"
    if FONT:
        for v in range(100, S, 100):
            vf += f",drawtext=fontfile={FONT}:text={v}:x={v + 3}:y=3:fontsize=16:fontcolor={color}:box=1:boxcolor=white@0.6"
            vf += f",drawtext=fontfile={FONT}:text={v}:x=3:y={v + 3}:fontsize=16:fontcolor={color}:box=1:boxcolor=white@0.6"
    return vf

def kmeans(px, k=8, it=12, seed=1):
    rng = np.random.default_rng(seed); c = px[rng.choice(len(px), k, replace=False)]
    for _ in range(it):
        lab = np.argmin(((px[:, None] - c[None]) ** 2).sum(-1), 1)
        c = np.array([px[lab == j].mean(0) if (lab == j).any() else c[j] for j in range(k)])
    return c, np.bincount(lab, minlength=k) / len(px)

def prep(img, out):
    os.makedirs(out, exist_ok=True)
    fit = f"scale={S}:{S}:force_original_aspect_ratio=decrease,pad={S}:{S}:(ow-iw)/2:(oh-ih)/2:white"
    ff("-i", img, "-vf", fit, os.path.join(out, "ref.png"))
    ff("-i", os.path.join(out, "ref.png"), "-vf", grid_vf(), os.path.join(out, "grid.png"))
    ff("-i", os.path.join(out, "ref.png"), "-vf", "edgedetect=low=0.08:high=0.2,negate," + grid_vf(), os.path.join(out, "edges.png"))
    px = pixels(os.path.join(out, "ref.png"), 200, 200).reshape(-1, 3)
    c, share = kmeans(px, 10)
    order = np.argsort(-share); pal = [{"hex": "#%02X%02X%02X" % tuple(int(v) for v in c[j]), "share": round(float(share[j]), 3)} for j in order]
    json.dump(pal, open(os.path.join(out, "palette.json"), "w"), indent=1)
    sw = np.zeros((80, 80 * len(pal), 3), np.uint8)
    for i, p in enumerate(pal): sw[:, i * 80:(i + 1) * 80] = [int(p["hex"][k:k + 2], 16) for k in (1, 3, 5)]
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{sw.shape[1]}x80", "-i", "-", os.path.join(out, "palette.png")], input=sw.tobytes())
    print("wrote", out, "→ ref.png grid.png edges.png palette.json palette.png")
    for p in pal: print(f"  {p['hex']}  {p['share'] * 100:5.1f} %")

def compare(ref, ren, out):
    a, b = pixels(ref), pixels(ren)
    small = lambda x: x.reshape(25, 40, 25, 40, 3).mean((1, 3))
    layout = float(np.abs(small(a) - small(b)).mean())
    def mask(x):
        bg = np.median(np.concatenate([x[:20, :20].reshape(-1, 3), x[:20, -20:].reshape(-1, 3)]), 0)
        return np.abs(x - bg).sum(-1) > 60
    ma, mb = mask(a), mask(b); iou = float((ma & mb).sum() / max(1, (ma | mb).sum()))
    tmp = out + ".edge.png"
    ff("-i", ref, "-vf", f"scale={S}:{S}:force_original_aspect_ratio=decrease,pad={S}:{S}:(ow-iw)/2:(oh-ih)/2:white,edgedetect=low=0.08:high=0.2,colorchannelmixer=rr=1:gg=0:bb=0", tmp)
    fit = f"scale={S}:{S}:force_original_aspect_ratio=decrease,pad={S}:{S}:(ow-iw)/2:(oh-ih)/2:white"
    ff("-i", ref, "-i", ren, "-i", tmp, "-filter_complex",
       f"[0:v]{fit},split=2[r1][r2];[1:v]{fit},split=3[n1][n2][n3];[r2][n2]blend=all_mode=average[mix];[n3][2:v]blend=all_mode=lighten[ed];"
       f"[r1][n1][mix][ed]hstack=inputs=4,{grid_vf()},scale=2000:-1", out)
    os.remove(tmp)
    print(f"colour layout distance {layout:.1f} (0 = same; < 25 is close)   silhouette IoU {iou:.2f} (1 = same)")
    print("wrote", out, "(reference | render | overlay | reference edges in red on the render)")

if __name__ == "__main__":
    if len(sys.argv) >= 4 and sys.argv[1] == "prep": prep(sys.argv[2], sys.argv[3])
    elif len(sys.argv) >= 5 and sys.argv[1] == "compare": compare(sys.argv[2], sys.argv[3], sys.argv[4])
    else: sys.exit(__doc__)
