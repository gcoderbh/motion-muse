#!/usr/bin/env python3
"""Speech → word-timed captions (Thai by default) with faster-whisper, fully local and free.

    pip install faster-whisper                       # once; the model downloads on first use
    transcribe.py --footage footage.json             # every clip that footage-scan found audio in
    transcribe.py voiceover.mp3 --key voiceover      # a separate voice-over track
    options: --lang th|en|auto  --model small|medium|large-v3-turbo  --out public/captions.json

Writes public/captions.json  {key: {language, segments:[{start,end,text,words:[{start,end,text}]}], speech:[[s,e]]}}
merged with what is already there (key = clip id from footage.json, or --key), plus one .srt per key next to it
(for CapCut/YouTube). Times are in seconds of the source file. Thai has no spaces: the captions component regroups
the words with Intl.Segmenter, so whisper's sub-word pieces are fine here.
Model choice on CPU: small = fast draft, medium = good Thai, large-v3-turbo = best (slow without a GPU).
Always read the transcript and fix names, brands and numbers by hand in captions.json before rendering.
"""
import argparse, json, os, re, subprocess, sys


def srt_time(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def load_audio(path):
    """Decode with the ffmpeg CLI (avoids PyAV version problems) to 16 kHz mono float32."""
    import numpy as np
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("inputs", nargs="*", help="audio/video files")
    ap.add_argument("--footage", help="footage.json from footage-scan.py: transcribe clips that have audio")
    ap.add_argument("--key", help="key for a single input (default: file name)")
    ap.add_argument("--lang", default="th", help="language code, or 'auto'")
    ap.add_argument("--model", default=os.environ.get("MOTION_MUSE_WHISPER", "medium"))
    ap.add_argument("--out", default="public/captions.json")
    ap.add_argument("--gap", type=float, default=0.45, help="silence (s) that splits speech ranges")
    a = ap.parse_args()
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit("faster-whisper is not installed. Run: pip install faster-whisper   (or python3 -m pip install --user faster-whisper)")

    jobs = []
    if a.footage:
        rep = json.load(open(a.footage, encoding="utf-8"))
        pub = os.path.dirname(os.path.abspath(a.out))
        for c in rep["clips"]:
            if c["audio"]["active"]:
                src = os.path.join(pub, c["proxy"]) if c.get("proxy") else c["file"]
                jobs.append((c["id"], src))
    for p in a.inputs:
        jobs.append((a.key if a.key and len(a.inputs) == 1 else re.sub(r"[^a-z0-9]+", "-", os.path.splitext(os.path.basename(p))[0].lower()).strip("-"), p))
    if not jobs:
        sys.exit("Nothing to transcribe (no inputs, or no clip with audio in footage.json).")

    model = WhisperModel(a.model, device="auto", compute_type="int8")
    data = json.load(open(a.out, encoding="utf-8")) if os.path.exists(a.out) else {}
    for key, path in jobs:
        segs, info = model.transcribe(load_audio(path), language=None if a.lang == "auto" else a.lang, word_timestamps=True,
                                      vad_filter=True, vad_parameters={"min_silence_duration_ms": 300}, beam_size=5)
        out = []
        for s in segs:
            words = [{"start": round(w.start, 3), "end": round(w.end, 3), "text": w.word} for w in (s.words or [])]
            out.append({"start": round(s.start, 3), "end": round(s.end, 3), "text": s.text.strip(), "words": words})
        speech = []
        for w in (w for s in out for w in s["words"]):
            if speech and w["start"] - speech[-1][1] <= a.gap:
                speech[-1][1] = w["end"]
            else:
                speech.append([w["start"], w["end"]])
        data[key] = {"language": info.language, "segments": out, "speech": [[round(x, 3), round(y, 3)] for x, y in speech]}
        os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
        with open(os.path.splitext(a.out)[0] + f".{key}.srt", "w", encoding="utf-8") as f:
            for i, s in enumerate(out, 1):
                f.write(f"{i}\n{srt_time(s['start'])} --> {srt_time(s['end'])}\n{s['text']}\n\n")
        print(f"OK {key}: {info.language} {len(out)} segments, {len(speech)} speech ranges, {sum(e - s for s, e in speech):.1f}s of speech")
        for s in out[:6]:
            print(f"   {s['start']:6.2f}-{s['end']:6.2f}  {s['text']}")
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"→ {a.out}")


if __name__ == "__main__":
    main()
