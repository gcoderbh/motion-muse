#!/usr/bin/env python3
"""Look at raw footage like an editor before cutting it. Stdlib + ffmpeg only.

    footage-scan.py ~/Downloads/clips/ a.mov b.mp4 [--proxy-dir public/footage] [--report footage.json]
                    [--sheets out/sheets] [--fps 30] [--stabilize] [--no-proxy]

For every clip it:
  - reads metadata (fps, VFR, rotation, audio) and makes a CFR H.264 proxy in public/footage/ that Remotion
    can seek frame-accurately (phone footage is often VFR/HEVC; never edit it directly). --stabilize runs vid.stab.
  - finds shot changes inside the clip, and per shot measures motion, detail (sharpness), exposure, saturation,
    camera pan/tilt direction, shake, the motion peak, and a subject focus point + track for vertical reframing.
  - scores every shot (0–1) so you can pick the best ones, and computes per-clip brightness/saturation
    corrections so all shots end up with the same look.
  - writes a contact sheet per clip (one labelled frame per shot) to look at before planning the edit,
    and the active (non-silent) audio ranges so you know which clips have speech or useful natural sound.
Output: footage.json (read by auto-edit.py and the FootageReel composition) and a summary table.
"""
import argparse, concurrent.futures as cf, json, math, os, re, statistics as st, struct, subprocess, sys

VIDEO_EXT = {".mp4", ".mov", ".m4v", ".mkv", ".webm", ".avi", ".mts", ".3gp"}
AW = 64  # analysis width in px
AFPS = 10  # analysis frames per second
SKILLS_DIR = os.environ.get("SKILLS_DIR", os.path.expanduser("~/skills"))


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, **kw)


def probe(path):
    out = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", path], text=True).stdout
    j = json.loads(out or "{}")
    v = next((s for s in j.get("streams", []) if s.get("codec_type") == "video"), None)
    if not v:
        return None
    a = next((s for s in j.get("streams", []) if s.get("codec_type") == "audio"), None)
    rot = 0
    for sd in v.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(float(sd["rotation"]))
    rot = rot or int(float(v.get("tags", {}).get("rotate", 0) or 0))
    w, h = int(v["width"]), int(v["height"])
    if abs(rot) % 180 == 90:
        w, h = h, w

    def rate(r):
        n, d = (r or "0/1").split("/")
        return float(n) / float(d) if float(d) else 0.0
    rf, af = rate(v.get("r_frame_rate")), rate(v.get("avg_frame_rate"))
    dur = float(v.get("duration") or j.get("format", {}).get("duration") or 0)
    return {"width": w, "height": h, "rotation": rot, "fps": round(af or rf, 3), "vfr": bool(af and rf and abs(af - rf) > 0.05),
            "codec": v.get("codec_name"), "duration": round(dur, 3), "hasAudio": a is not None}


def frames(path, w, h):
    raw = run(["ffmpeg", "-loglevel", "error", "-i", path, "-an", "-vf", f"fps={AFPS},scale={w}:{h}:flags=area,format=rgb24",
               "-f", "rawvideo", "-"]).stdout
    n = w * h * 3
    return [raw[i:i + n] for i in range(0, len(raw) - n + 1, n)]


def luma(fr):
    return [(77 * fr[i] + 150 * fr[i + 1] + 29 * fr[i + 2]) >> 8 for i in range(0, len(fr), 3)]


def colstats(fr):
    sat = 0
    for i in range(0, len(fr), 3):
        r, g, b = fr[i], fr[i + 1], fr[i + 2]
        mx = max(r, g, b)
        if mx:
            sat += (mx - min(r, g, b)) / mx
    return sat / (len(fr) / 3)


def detail(y, w, h):
    s = 0
    for r in range(1, h - 1):
        o = r * w
        for c in range(1, w - 1):
            i = o + c
            s += abs(4 * y[i] - y[i - 1] - y[i + 1] - y[i - w] - y[i + w])
    return s / ((w - 2) * (h - 2))


def shift(p, q, maxs):
    """Shift of profile q relative to p (positive = content moved right/down)."""
    best, bs = None, 0
    n = len(p)
    for s in range(-maxs, maxs + 1):
        lo, hi = max(0, s), min(n, n + s)
        if hi - lo < n // 2:
            continue
        e = sum(abs(q[i] - p[i - s]) for i in range(lo, hi)) / (hi - lo)
        if best is None or e < best:
            best, bs = e, s
    return bs


def hist(y):
    hb = [0] * 16
    for v in y:
        hb[v >> 4] += 1
    return hb


def analyse(path, info, threshold):
    w = AW
    h = max(8, round(AW * info["height"] / info["width"] / 2) * 2)
    fr = frames(path, w, h)
    if len(fr) < 2:
        return None
    Y = [luma(f) for f in fr]
    npx = w * h
    diff = [0.0] + [sum(abs(a - b) for a, b in zip(Y[i], Y[i - 1])) / npx for i in range(1, len(Y))]
    H = [hist(y) for y in Y]
    hd = [0.0] + [sum(abs(a - b) for a, b in zip(H[i], H[i - 1])) / (2 * npx) for i in range(1, len(H))]
    cols = [[sum(y[r * w + c] for r in range(h)) / h for c in range(w)] for y in Y]
    rows = [[sum(y[r * w:(r + 1) * w]) / w for r in range(h)] for y in Y]
    dx = [0] + [shift(cols[i - 1], cols[i], 6) for i in range(1, len(Y))]
    dy = [0] + [shift(rows[i - 1], rows[i], 6) for i in range(1, len(Y))]
    # shot boundaries: a histogram jump that stands out from its neighbourhood
    cuts, last = [0], 0
    for i in range(1, len(Y)):
        local = sorted(hd[max(1, i - 15):i + 15])
        med = local[len(local) // 2] if local else 0
        if hd[i] > threshold and hd[i] > 4 * med + 0.02 and i - last >= AFPS // 2:
            cuts.append(i); last = i
    cuts.append(len(Y))
    shots = []
    for k in range(len(cuts) - 1):
        a, b = cuts[k], cuts[k + 1]
        idx = list(range(a, b))
        inner = idx[1:] or idx
        mot = [diff[i] for i in inner]
        pdx, pdy = [dx[i] for i in inner], [dy[i] for i in inner]
        mx_, my_ = st.mean(pdx), st.mean(pdy)
        jit = st.pstdev([pdx[i] - pdx[i - 1] for i in range(1, len(pdx))] or [0]) + st.pstdev([pdy[i] - pdy[i - 1] for i in range(1, len(pdy))] or [0])
        samp = idx[:: max(1, len(idx) // 12)]
        bright = st.mean(sum(Y[i]) / npx for i in samp) / 255
        satv = st.mean(colstats(fr[i]) for i in samp)
        det = st.mean(detail(Y[i], w, h) for i in samp)
        # focus: motion + edge energy with a soft centre prior, sampled every 0.5 s
        track = []
        for i in idx[:: AFPS // 2] or idx[:1]:
            j = min(i + 1, len(Y) - 1)
            sx = sy = sw = 0.0
            for r in range(1, h - 1):
                for c in range(1, w - 1):
                    p = r * w + c
                    e = abs(Y[j][p] - Y[i][p]) * 2 + abs(Y[i][p + 1] - Y[i][p - 1]) + abs(Y[i][p + w] - Y[i][p - w])
                    e *= 1.0 - 0.5 * (((c / w) - 0.5) ** 2 + ((r / h) - 0.5) ** 2) * 4
                    sx += e * c; sy += e * r; sw += e
            if sw:
                track.append([round(i / AFPS, 2), round(sx / sw / w, 3), round(sy / sw / h, 3)])
        sm = []  # smooth the track so the reframe glides instead of jittering
        for t, x, y in track:
            px, py = (sm[-1][1], sm[-1][2]) if sm else (x, y)
            sm.append([t, round(px + 0.35 * (x - px), 3), round(py + 0.35 * (y - py), 3)])
        fx = st.mean(p[1] for p in sm) if sm else 0.5
        fy = st.mean(p[2] for p in sm) if sm else 0.5
        peak = a + max(range(len(inner)), key=lambda i: mot[i]) + (1 if len(idx) > 1 else 0)
        pan = "right" if mx_ < -0.6 else "left" if mx_ > 0.6 else "static"  # camera direction (content moves the other way)
        tilt = "down" if my_ < -0.6 else "up" if my_ > 0.6 else "static"
        shots.append({
            "start": round(a / AFPS, 2), "end": round(min(b / AFPS, info["duration"] or b / AFPS), 2),
            "motion": round(st.mean(mot), 2), "detail": round(det, 2), "brightness": round(bright, 3),
            "saturation": round(satv, 3), "pan": pan, "tilt": tilt, "panSpeed": round(abs(mx_) + abs(my_), 2),
            "shake": round(jit, 2), "peak": round(peak / AFPS, 2), "focus": [round(fx, 3), round(fy, 3)], "track": sm,
            "_motionCurve": [round(diff[i], 1) for i in idx],
        })
    return shots


def audio_active(path, dur):
    err = run(["ffmpeg", "-hide_banner", "-i", path, "-vn", "-af", "silencedetect=n=-38dB:d=0.35,volumedetect", "-f", "null", "-"], text=True).stderr
    mean = re.search(r"mean_volume: (-?[\d.]+)", err)
    starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", err)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", err)]
    act, t = [], 0.0
    for i, s in enumerate(starts):
        if s - t > 0.3:
            act.append([round(max(0, t), 2), round(s, 2)])
        t = ends[i] if i < len(ends) else dur
    if dur - t > 0.3:
        act.append([round(t, 2), round(dur, 2)])
    return {"meanDb": float(mean.group(1)) if mean else None, "active": act}


def make_proxy(src, dst, fps, stabilize):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    vf = f"fps={fps},scale='if(gt(iw,ih),min(1920,iw),-2)':'if(gt(iw,ih),-2,min(1920,ih))'"
    if stabilize:
        trf = dst + ".trf"
        run(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-vf", f"vidstabdetect=shakiness=6:accuracy=12:result={trf}", "-f", "null", "-"])
        if os.path.exists(trf):
            vf = f"vidstabtransform=input={trf}:smoothing=18:optzoom=1:zoomspeed=0.2,unsharp=5:5:0.6,{vf}"
    r = run(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "17",
             "-g", str(fps // 2), "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", dst], text=True)
    if stabilize and os.path.exists(dst + ".trf"):
        os.remove(dst + ".trf")
    return r.returncode == 0, r.stderr[-300:]


def contact_sheet(src, clip, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    font = os.path.join(SKILLS_DIR, "fonts/prompt/Prompt-Medium.ttf")
    tmp = os.path.join(out_dir, f".{clip['id']}")
    os.makedirs(tmp, exist_ok=True)
    for i, s in enumerate(clip["shots"]):
        t = (s["start"] + s["end"]) / 2
        label = f"{s['id']}  {s['start']:.1f}-{s['end']:.1f}s  score {s['score']:.2f}  pan {s['pan']}"
        vf = "scale=480:-2"
        if os.path.exists(font):
            label = label.replace(":", r"\:")
            vf += f",drawtext=fontfile={font}:text='{label}':x=10:y=h-34:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=6"
            fx, fy = s["focus"]
            vf += f",drawbox=x={fx}*iw-8:y={fy}*ih-8:w=16:h=16:color=yellow@0.9:t=fill"
        run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{t:.2f}", "-i", src, "-frames:v", "1", "-vf", vf, os.path.join(tmp, f"{i:03d}.jpg")])
    n = len(clip["shots"])
    cols = min(4, n)
    rows = math.ceil(n / cols)
    sheet = os.path.join(out_dir, f"{clip['id']}.jpg")
    run(["ffmpeg", "-loglevel", "error", "-y", "-framerate", "1", "-i", os.path.join(tmp, "%03d.jpg"),
         "-vf", f"pad=480:ih+4:0:0:white,tile={cols}x{rows}:padding=4:color=white", "-frames:v", "1", sheet])
    for f in os.listdir(tmp):
        os.remove(os.path.join(tmp, f))
    os.rmdir(tmp)
    return sheet


def slug(path, taken):
    s = re.sub(r"[^a-z0-9]+", "-", os.path.splitext(os.path.basename(path))[0].lower()).strip("-") or "clip"
    base, k = s, 2
    while s in taken:
        s = f"{base}-{k}"; k += 1
    taken.add(s)
    return s


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("inputs", nargs="+", help="video files or folders")
    ap.add_argument("--proxy-dir", default="public/footage")
    ap.add_argument("--report", default="footage.json")
    ap.add_argument("--sheets", default="out/sheets")
    ap.add_argument("--fps", type=int, default=30, help="project fps; proxies are converted to it")
    ap.add_argument("--threshold", type=float, default=0.25, help="shot-change sensitivity (lower = more cuts)")
    ap.add_argument("--stabilize", action="store_true", help="stabilize shaky clips with vid.stab when making proxies")
    ap.add_argument("--no-proxy", action="store_true")
    a = ap.parse_args()

    files = []
    for p in a.inputs:
        if os.path.isdir(p):
            files += sorted(os.path.join(p, f) for f in os.listdir(p) if os.path.splitext(f)[1].lower() in VIDEO_EXT)
        elif os.path.isfile(p):
            files.append(p)
    if not files:
        sys.exit("No video files found.")
    taken, clips = set(), []
    public_root = os.path.dirname(os.path.abspath(a.proxy_dir))

    def one(path, cid):
        info = probe(path)
        if not info:
            return None, f"skip {path}: no video stream"
        proxy = os.path.join(a.proxy_dir, cid + ".mp4")
        if not a.no_proxy:
            ok, err = make_proxy(path, proxy, a.fps, a.stabilize)
            if not ok:
                return None, f"FAIL proxy {path}: {err}"
        src_for_analysis = proxy if not a.no_proxy else path
        shots = analyse(src_for_analysis, info, a.threshold) or []
        aud = audio_active(path, info["duration"]) if info["hasAudio"] else {"meanDb": None, "active": []}
        rel = os.path.relpath(os.path.abspath(proxy), public_root) if not a.no_proxy else None
        return {"id": cid, "file": os.path.abspath(path), "proxy": rel, **info, "audio": aud, "shots": shots}, None

    ids = [slug(f, taken) for f in files]
    with cf.ThreadPoolExecutor(max_workers=min(4, os.cpu_count() or 2)) as ex:
        for clip, err in ex.map(lambda t: one(*t), zip(files, ids)):
            if err:
                print(err, file=sys.stderr)
            if clip and clip["shots"]:
                clips.append(clip)
            elif clip:
                print(f"skip {clip['id']}: too short to analyse", file=sys.stderr)

    allshots = [s for c in clips for s in c["shots"]]
    if not allshots:
        sys.exit("No shots found.")

    def norm(key):
        vals = sorted(s[key] for s in allshots)
        lo, hi = vals[0], vals[-1]
        return lambda v: 0.5 if hi - lo < 1e-9 else (v - lo) / (hi - lo)
    nm, nd = norm("motion"), norm("detail")
    for c in clips:
        for i, s in enumerate(c["shots"]):
            s["id"] = f"{c['id']}#{i + 1}"
            dur = s["end"] - s["start"]
            exposure = 1 - min(1, abs(s["brightness"] - 0.5) / 0.35)
            shake = min(1, max(0, s["shake"] - 1.2) / 2.5)
            usable = min(1, dur / 1.5)
            s["score"] = round(max(0, 0.35 * nm(s["motion"]) + 0.3 * nd(s["detail"]) + 0.2 * exposure + 0.15 * usable - 0.35 * shake), 3)
            s["dur"] = round(dur, 2)
        c["brightness"] = round(st.mean(s["brightness"] for s in c["shots"]), 3)
        c["saturation"] = round(st.mean(s["saturation"] for s in c["shots"]), 3)
    tb = min(0.6, max(0.3, st.median(c["brightness"] for c in clips)))
    ts = min(0.5, max(0.2, st.median(c["saturation"] for c in clips)))
    for c in clips:  # CSS filter factors that move every clip halfway to the group's exposure/saturation (keeps the mood)
        c["match"] = {"brightness": round(min(1.2, max(0.85, math.sqrt(tb / max(c["brightness"], 0.05)))), 3),
                      "saturate": round(min(1.25, max(0.85, math.sqrt(ts / max(c["saturation"], 0.02)))), 3)}

    if not a.no_proxy:
        for c in clips:
            c["sheet"] = contact_sheet(os.path.join(public_root, c["proxy"]), c, a.sheets)
    report = {"fps": a.fps, "analysisFps": AFPS, "clips": clips}
    with open(a.report, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)

    print(f"{len(clips)} clips, {len(allshots)} shots → {a.report}" + ("" if a.no_proxy else f", proxies in {a.proxy_dir}, sheets in {a.sheets}"))
    print("clip/shot          time          score motion detail bright pan     shake focus")
    for c in clips:
        flags = (" VFR" if c["vfr"] else "") + (f" rot{c['rotation']}" if c["rotation"] else "") + (" audio" if c["audio"]["active"] else "")
        print(f"{c['id']}: {c['width']}x{c['height']} {c['fps']}fps {c['duration']}s{flags}  match b×{c['match']['brightness']} s×{c['match']['saturate']}")
        for s in c["shots"]:
            print(f"  {s['id']:<16} {s['start']:5.1f}-{s['end']:5.1f}s  {s['score']:.2f}  {s['motion']:5.1f} {s['detail']:6.1f}  {s['brightness']:.2f}  {s['pan']:<7} {s['shake']:4.1f}  {s['focus'][0]:.2f},{s['focus'][1]:.2f}")


if __name__ == "__main__":
    main()
