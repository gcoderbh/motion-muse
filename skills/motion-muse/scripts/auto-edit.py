#!/usr/bin/env python3
"""Turn scanned footage into a first cut that an editor would make, as public/edit.json for the FootageReel composition.

Montage (b-roll set to music):
    auto-edit.py footage.json --music public/audio/bgm.mp3 --length 20 [--size 1080x1920] [--look warm]
Talking head / interview (cuts out pauses, hides jump cuts, adds b-roll and captions):
    auto-edit.py footage.json --mode talk --captions public/captions.json [--aroll clip-id] [--music public/audio/bgm.mp3]
Montage with a voice-over (VO file + `transcribe.py vo.mp3 --key voiceover`):
    auto-edit.py footage.json --music public/audio/bgm.mp3 --vo audio/vo.mp3 --captions public/captions.json

What it decides, and why (all printed as a seam plan + written to edit.md for you to review):
  - shot lengths on the beat, varied (never all equal), faster cuts at 65–85 % for the peak, end shot held ≥ 1.2 s
  - which shot goes where: hook = strongest moving shot, no clip twice in a row, camera direction kept across
    cuts, higher-energy shots in the peak, each window placed so the action starts just after the cut
  - transitions: hard cuts inside phrases; a designed transition only on phrase starts, chosen from the footage
    (camera pan → whip in that direction, tilt → push, into the peak → smash, into the last shot → focus/zoom)
  - a speed ramp on one hero shot, punch-ins on jump cuts, gentle push-ins on static shots, vertical reframing on
    the subject, per-clip colour matching, music ducked under speech, captions in timeline time.
It is a draft: read edit.md, look at the contact sheets, change shots/transitions in edit.json, then render.
"""
import argparse, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
THAI_MARK = re.compile(r"^[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]")
THAI_LEAD = re.compile(r"[\u0E40-\u0E44]$")


HANDLE = 0.35         # s of source kept free on both sides of a window for transition overlap
RAMP_RESERVE = 1.25   # the [[0, 2.2], [0.35, 1], [1, 1]] ramp plays ~1.21x the slot length of footage


def beat_info(music, fps):
    out = subprocess.run([sys.executable, os.path.join(HERE, "beat-grid.py"), music, "--fps", str(fps), "--dur", "90"],
                         capture_output=True, text=True, check=True).stdout
    bpm = float(re.search(r"BPM ([\d.]+)", out).group(1))
    first = float(re.search(r"first beat ([\d.]+)s", out).group(1))
    loud = [(float(t), float(v)) for t, v in re.findall(r"^\s+([\d.]+)s\s+(\d+)", out, re.M)]
    return bpm, first, loud


def music_start(first, bpm, loud):
    """Start on a phrase (8 bars) where the track is already full, so the hook lands on energy, not on an intro."""
    if not loud:
        return first
    peak = max(v for _, v in loud)
    for k in range(0, 4):
        t = first + k * 32 * 60 / bpm
        near = [v for s, v in loud if t <= s < t + 6]
        if near and min(near) >= 0.6 * peak:
            return round(t, 3)
    return round(first, 3)


def merge_thai(words):
    """Keep Thai graphemes whole: glue whisper pieces that start with a combining mark or follow a leading vowel."""
    out = []
    for w in words:
        if out and (THAI_MARK.match(w["text"]) or THAI_LEAD.search(out[-1]["text"])):
            out[-1] = {**out[-1], "text": out[-1]["text"] + w["text"], "end": w["end"]}
        else:
            out.append(dict(w))
    return out


def pattern(total, beat_s, fps):
    """Shot lengths in beats: varied, faster in the peak, long hold at the end."""
    unit = 1 if beat_s >= 0.42 else 2
    sections = [(0.2, [2, 2, 1, 1, 2]), (0.65, [2, 1, 1, 2, 1, 1, 4, 2]), (0.85, [2, 1, 1, 1, 1, 2]), (1.01, [2, 2])]
    end_hold = max(4, round(1.2 / beat_s / unit + 0.49) * unit)
    out, t, idx = [], 0, {}
    while total - t > end_hold + unit:
        frac = t / total
        k = next(i for i, (lim, _) in enumerate(sections) if frac < lim)
        cyc = sections[k][1]
        n = cyc[idx.get(k, 0) % len(cyc)] * unit
        idx[k] = idx.get(k, 0) + 1
        n = min(n, total - t - end_hold)
        out.append(n); t += n
    out.append(total - t)
    return out


def interp_track(track, t0, t1):
    pts = [p for p in track if t0 - 0.5 <= p[0] <= t1 + 0.5]
    return [[round(p[0] - t0, 2), p[1], p[2]] for p in pts]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("footage")
    ap.add_argument("--mode", choices=["montage", "talk"], default="montage")
    ap.add_argument("--music", help="BGM file (inside public/), analysed with beat-grid.py")
    ap.add_argument("--bpm", type=float); ap.add_argument("--first-beat", type=float, default=0.0)
    ap.add_argument("--music-start", type=float, help="seconds into the track where the video starts")
    ap.add_argument("--length", type=float, default=15)
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--size", default="1080x1920")
    ap.add_argument("--look", default="clean", help="clean | warm | teal-orange | film | mono | punchy | soft")
    ap.add_argument("--captions", help="captions.json from transcribe.py")
    ap.add_argument("--vo", help="voice-over file path relative to public/, e.g. audio/vo.mp3 (captions key 'voiceover')")
    ap.add_argument("--aroll", help="talk mode: clip id of the speaker (default: clip with the most speech)")
    ap.add_argument("--hook", help="shot id to open with, e.g. clip#2")
    ap.add_argument("--exclude", nargs="*", default=[], help="shot or clip ids to leave out")
    ap.add_argument("--natural", type=float, default=0.0, help="montage: natural-sound volume under the music (0–1)")
    ap.add_argument("--out", default="public/edit.json")
    a = ap.parse_args()

    rep = json.load(open(a.footage, encoding="utf-8"))
    fps = a.fps
    W, H = (int(x) for x in a.size.lower().split("x"))
    caps = json.load(open(a.captions, encoding="utf-8")) if a.captions else {}
    pub = os.path.dirname(os.path.abspath(a.out))
    clips = {c["id"]: c for c in rep["clips"] if c["id"] not in a.exclude}
    pool = [dict(s, clip=c["id"]) for c in clips.values() for s in c["shots"] if s["id"] not in a.exclude and s["dur"] >= 0.5]
    if not pool:
        sys.exit("No usable shots.")
    mmax = max(s["motion"] for s in pool) or 1

    bpm, first, loud = (a.bpm, a.first_beat, []) if a.bpm else (None, 0.0, [])
    if a.music and not a.bpm:
        bpm, first, loud = beat_info(os.path.join(pub, a.music) if not os.path.exists(a.music) else a.music, fps)
    mstart = a.music_start if a.music_start is not None else (music_start(first, bpm, loud) if bpm else 0.0)
    music_rel = os.path.relpath(os.path.abspath(a.music), pub) if a.music and os.path.exists(a.music) else a.music

    def shot_entry(s, t0, dur_f, speed=1.0, **extra):
        c = clips[s["clip"]]
        src_aspect = c["width"] / c["height"]
        e = {"id": s["id"], "src": c["proxy"], "from": round(t0, 3), "dur": dur_f, "speed": speed,
             "focus": s["focus"], "match": c["match"], "srcAspect": round(src_aspect, 4)}
        if abs(src_aspect - W / H) > 0.05 and len(s["track"]) > 1:
            e["track"] = interp_track(s["track"], t0, t0 + dur_f / fps * speed)
        e.update(extra)
        return e

    shots, plan, overlays, duck, cap_words = [], [], [], [], []
    if a.mode == "montage":
        if not bpm:
            bpm, first = 120.0, 0.0
        beat_s = 60 / bpm
        total_beats = max(4, round(a.length / beat_s))
        lens = pattern(total_beats, beat_s, fps)
        used, uses, prev = {}, {}, None
        hook_id = a.hook or max(pool, key=lambda s: s["score"] + 0.4 * s["motion"] / mmax)["id"]
        beat_pos = 0
        hero_done = False
        for i, nb in enumerate(lens):
            frac = beat_pos / total_beats
            peak_sec = 0.65 <= frac < 0.85
            dur_f = round((beat_pos + nb) * beat_s * fps) - round(beat_pos * beat_s * fps)
            def rank(s):
                r = s["score"] - 0.45 * uses.get(s["id"], 0)
                if prev:
                    if s["clip"] == prev["clip"]: r -= 0.6
                    if prev["pan"] != "static" and s["pan"] not in (prev["pan"], "static"): r -= 0.25  # keep screen direction
                    if abs(s["brightness"] - prev["brightness"]) > 0.25: r -= 0.1
                if peak_sec: r += 0.35 * s["motion"] / mmax
                if i == len(lens) - 1: r += 0.2 * (1 - s["shake"] / 4) - 0.2 * s["motion"] / mmax  # calm, steady end shot
                return r
            cands = [pool_s for pool_s in pool if pool_s["id"] == hook_id] if i == 0 else sorted(pool, key=rank, reverse=True)
            chosen = None
            for s in cands:
                speed = 1.0
                if peak_sec and s["motion"] / mmax < 0.25 and s["dur"] >= dur_f / fps * 1.8:
                    speed = 1.6  # low-energy shot in the peak: speed it up instead of letting it drag
                need = dur_f / fps * speed * RAMP_RESERVE  # room for a possible speed ramp
                lo, hi = s["start"] + HANDLE * speed, s["end"] - HANDLE * speed  # transitions show a few frames past the cut
                if hi - lo < need:
                    continue
                # put the motion peak ~35 % into the window: the action starts right after the cut
                t0 = min(max(lo, s["peak"] - 0.35 * need), hi - need)
                busy = used.get(s["id"], [])
                if any(t0 < e and t0 + need > b for b, e in busy):
                    free = [b2 for _, b2 in busy] + [lo]
                    t0 = next((f for f in sorted(free) if lo <= f and f + need <= hi and not any(f < e and f + need > b for b, e in busy)), None)
                    if t0 is None:
                        continue
                chosen = (s, t0, need, speed); break
            if not chosen:  # nothing long enough: slow the longest shot down so it fills the slot
                s = max(pool, key=lambda x: x["dur"])
                speed = round(max(0.5, min(1.0, (s["dur"] - 2 * HANDLE) / (dur_f / fps * RAMP_RESERVE))), 2)
                need = dur_f / fps * speed * RAMP_RESERVE
                chosen = (s, s["start"] + max(0.0, (s["dur"] - need) / 2), need, speed)
            s, t0, need, speed = chosen
            used.setdefault(s["id"], []).append((t0, t0 + need)); uses[s["id"]] = uses.get(s["id"], 0) + 1
            extra = {}
            why = "hook: strongest moving shot" if i == 0 else ("peak: high energy" if peak_sec else "")
            if s["panSpeed"] < 0.6 and not peak_sec:
                extra["zoom"] = [1.0, 1.06] if i % 2 == 0 else [1.08, 1.02]  # static shot: slow push-in / pull-out
            if prev and prev["clip"] == s["clip"]:
                extra["zoom"] = [1.12, 1.14]; why += " jump-cut punch-in"
            if not hero_done and peak_sec and speed == 1.0 and s["motion"] / mmax > 0.5 and dur_f >= round(2 * beat_s * fps):
                extra["ramp"] = [[0, 2.2], [0.35, 1.0], [1, 1.0]]  # fast-to-real-time ramp that lands on the beat
                hero_done = True; why += " speed ramp"
            if a.natural:
                extra["audio"] = {"volume": a.natural, "lead": 6}
            shots.append(shot_entry(s, t0, dur_f, speed, **extra))
            plan.append([i, beat_pos, nb, s["id"], why.strip()])
            prev = s; beat_pos += nb
        # seams: cuts inside phrases, a designed transition on phrase starts (every 8 beats) and into peak / end
        last_kind = None
        starts = [p[1] for p in plan]
        for i in range(len(shots) - 1):
            nxt_beat = starts[i + 1]; frac = nxt_beat / total_beats
            o_clip = next(x for x in pool if x["id"] == shots[i]["id"])
            kind, why, dirv = "cut", "inside a phrase: hard cut on the beat", None
            if i + 1 == len(shots) - 1:
                kind, why = ("focus", "into the end shot: soften") if last_kind != "focus" else ("zoom", "into the end shot")
            elif frac >= 0.65 and starts[i] / total_beats < 0.65:
                kind, why = "smash", "energy jump into the peak"
            elif nxt_beat % 8 == 0 and 0.65 > frac:
                if o_clip["pan"] in ("left", "right"):
                    kind, why, dirv = "whip", f"camera pans {o_clip['pan']}: whip carries the motion", (1 if o_clip["pan"] == "right" else -1)
                elif o_clip["tilt"] in ("up", "down"):
                    kind, why, dirv = "push", f"camera tilts {o_clip['tilt']}: push the same way", (1 if o_clip["tilt"] == "up" else -1)
                else:
                    kind, why = ("zoom" if last_kind != "zoom" else "slices"), "new phrase: mark the chapter"
            if kind == last_kind and kind != "cut":
                kind, why = "cut", "avoid repeating the same transition"
            if kind != "cut":
                shots[i]["out"] = {"kind": kind, **({"dir": dirv} if dirv else {})}
                last_kind = kind
            plan[i].append(f"{kind}: {why}")
        plan[-1].append("end: hold")
        total_f = sum(s["dur"] for s in shots)
        if a.vo and "voiceover" in caps:
            vo = caps["voiceover"]
            duck = [[round(s * fps), round(e * fps)] for s, e in vo["speech"]]
            cap_words = [{"start": round(w["start"] * fps), "end": round(w["end"] * fps), "text": w["text"]}
                         for w in merge_thai([w for sg in vo["segments"] for w in sg["words"]])]
    else:
        ar_id = a.aroll or max(clips, key=lambda k: sum(e - s for s, e in caps.get(k, {}).get("speech", [])) or 0)
        if ar_id not in caps:
            sys.exit(f"Talk mode needs captions for the speaker clip ({ar_id}): run transcribe.py --footage footage.json first.")
        ar = clips[ar_id]; spk = caps[ar_id]
        ar_shots = [s for s in pool if s["clip"] == ar_id]
        if not ar_shots:
            sys.exit(f"Every shot of the speaker clip {ar_id} is excluded.")
        speech = [(max(s, sh["start"]), min(e, sh["end"])) for s, e in spk["speech"] for sh in ar_shots if s < sh["end"] and e > sh["start"]]
        keep = []
        for s, e in sorted(speech):
            s, e = max(0, s - 0.12), min(ar["duration"], e + 0.18)
            if keep and s - keep[-1][1] < 0.25:
                keep[-1][1] = e
            else:
                keep.append([s, e])
        if a.length and a.length < sum(e - s for s, e in keep):
            out, acc = [], 0
            for s, e in keep:
                if acc + (e - s) > a.length: break
                out.append([s, e]); acc += e - s
            keep = out or keep[:1]
        ar_shot = max(ar_shots, key=lambda s: s["dur"])
        t_f = 0
        words = merge_thai([w for sg in spk["segments"] for w in sg["words"]])
        broll = sorted([s for s in pool if s["clip"] != ar_id], key=lambda s: s["score"], reverse=True)
        for i, (s, e) in enumerate(keep):
            dur_f = max(6, round((e - s) * fps))
            z = [1.0, 1.02] if i % 2 == 0 else [1.13, 1.15]  # alternate framing so jump cuts read as intentional
            sh = dict(ar_shot, clip=ar_id)
            shots.append(shot_entry(sh, s, dur_f, 1.0, zoom=z, audio={"volume": 1.0, "fade": 2}))
            plan.append([i, round(t_f / fps, 2), round(dur_f / fps, 2), f"{ar_id} {s:.2f}-{e:.2f}s", "speech kept, pause removed" + (", punch-in" if i % 2 else ""), "cut: jump cut"])
            for w in words:
                if w["start"] >= s - 0.05 and w["end"] <= e + 0.05:
                    cap_words.append({"start": t_f + round((w["start"] - s) * fps), "end": t_f + round((w["end"] - s) * fps), "text": w["text"]})
            t_f += dur_f
        total_f = t_f
        # b-roll every ~4 s for 1.5–2.5 s, never in the first 1.5 s (the face sells the hook) or the last 1 s
        t, k = round(3.0 * fps), 0
        while broll and t < total_f - round(2.5 * fps):
            s = broll[k % len(broll)]; d = min(round(2.2 * fps), round((s["dur"] - 0.2) * fps))
            if d >= round(1.2 * fps):
                t0 = min(max(s["start"] + 0.05, s["peak"] - 0.3 * d / fps), s["end"] - d / fps - 0.05)
                overlays.append(shot_entry(s, t0, d, 1.0, at=t, zoom=[1.0, 1.06]))
                plan.append(["b", round(t / fps, 2), round(d / fps, 2), s["id"], "b-roll over speech (L-cut: voice continues)", "cut"])
            t += round(4.2 * fps); k += 1
        duck, acc = [], 0
        for sh in shots:
            duck.append([acc, acc + sh["dur"]]); acc += sh["dur"]
        if not bpm:
            bpm = 120.0

    edit = {"fps": fps, "width": W, "height": H, "durationInFrames": total_f, "look": a.look, "grain": 0.06,
            "bpm": round(bpm, 2), "shots": shots, "overlays": overlays}
    if music_rel:
        edit["music"] = {"src": music_rel, "start": mstart, "volume": 0.7 if a.mode == "montage" and not a.vo else 0.3, "duck": duck}
    if a.vo:
        edit["vo"] = {"src": a.vo, "volume": 1.0}
    if cap_words:
        edit["captions"] = {"words": cap_words}
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    json.dump(edit, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    lines = [f"# Edit plan ({a.mode}, {total_f / fps:.1f}s, {bpm:.1f} BPM, music from {mstart:.2f}s, look {a.look})", "",
             "| # | at | length | shot | why | out |", "|---|---|---|---|---|---|"]
    for p in plan:
        at = f"beat {p[1]}" if a.mode == "montage" else f"{p[1]}s"
        ln = f"{p[2]} beats" if a.mode == "montage" else f"{p[2]}s"
        lines.append(f"| {p[0]} | {at} | {ln} | {p[3]} | {p[4]} | {p[5] if len(p) > 5 else ''} |")
    md = "\n".join(lines) + "\n"
    open(os.path.join(os.path.dirname(os.path.abspath(a.footage)), "edit.md"), "w", encoding="utf-8").write(md)
    print(md)
    print(f"→ {a.out}  ({len(shots)} shots, {len(overlays)} b-roll overlays, {len(cap_words)} caption words)")


if __name__ == "__main__":
    main()
