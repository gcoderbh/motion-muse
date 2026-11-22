#!/usr/bin/env python3
"""Find free music on Mixkit that fits the video, skipping tracks already used.

Search:   find-music.py fashion "happy pop" [--path mood/uplifting] [--pages 2]   (each keyword is one Mixkit search)
Download: find-music.py --get 839 --out public/audio/bgm.mp3

Mixkit Stock Music Free License: commercial use OK, no credit needed, no standalone resale.
Used track ids are kept in $MOTION_MUSE_MUSIC_LOG (default ~/.config/motion-muse/used-music.tsv)
so the next video gets a different track. Stdlib only.
"""
import argparse, datetime, html, os, re, subprocess, sys, urllib.parse, urllib.request

BASE = "https://mixkit.co/free-stock-music/"
UA = {"User-Agent": "Mozilla/5.0 (motion-muse music finder)"}
LOG = os.environ.get("MOTION_MUSE_MUSIC_LOG", os.path.expanduser("~/.config/motion-muse/used-music.tsv"))
SKILLS_DIR = os.environ.get("SKILLS_DIR", os.path.expanduser("~/skills"))


def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def parse(page):
    cards = page.split('data-audio-player-preview-url-value="')[1:]
    out = []
    for c in cards:
        mp3 = c.split('"', 1)[0]
        m = re.search(r"/music/(\d+)/", mp3)
        title = re.search(r'item-grid-card__title">\s*(.*?)\s*</h2>', c, re.S)
        author = re.search(r'music-preview__author">\s*by\s*(.*?)\s*</p>', c, re.S)
        tags = re.findall(r'meta-links__link"[^>]*href="/free-stock-music/[^"]*">([^<]+)</a>', c.split("item-grid__item")[0])
        if m and title:
            out.append({"id": m.group(1), "mp3": mp3, "title": html.unescape(title.group(1)),
                        "author": html.unescape(author.group(1)) if author else "", "tags": html.unescape(", ".join(tags[:6]))})
    return out


def used_ids():
    ids = set()
    if os.path.exists(LOG):
        ids |= {l.split("\t", 1)[0] for l in open(LOG, encoding="utf-8") if l.strip()}
    attr = os.path.join(SKILLS_DIR, "video-shotcraft/assets/audio/ATTRIBUTION.md")
    if os.path.exists(attr):  # Shotcraft's bundled tracks count as used: every user of the skill has them
        ids |= set(re.findall(r"mixkit\.co/music/(\d+)/", open(attr, encoding="utf-8").read()))
    return ids


def search(a):
    seen, used, rows = set(), used_ids(), []
    urls = []
    for p in range(1, a.pages + 1):
        for q in a.query:
            urls.append(BASE + "discover/" + urllib.parse.quote(q.strip().lower()) + f"/?page={p}")
        if a.path:
            urls.append(BASE + a.path.strip("/") + f"/?page={p}")
    for u in urls:
        try:
            for r in parse(fetch(u)):
                if r["id"] not in seen:
                    seen.add(r["id"]); rows.append(r)
        except Exception as e:
            print(f"WARN {u}: {e}", file=sys.stderr)
    fresh = [r for r in rows if r["id"] not in used]
    print(f"{len(fresh)} unused tracks ({len(rows) - len(fresh)} already used, skipped)")
    print("id\ttitle\tartist\ttags\tpreview")
    for r in fresh[: a.limit]:
        print(f"{r['id']}\t{r['title']}\t{r['author']}\t{r['tags']}\t{r['mp3']}")
    if not fresh:
        print("No unused match: try other keywords, a --path such as mood/cheerful or a genre like deep-house, or another source in references/sound-sources.md")


def get(a):
    if a.get in used_ids() and not a.force:
        sys.exit(f"Track {a.get} was already used in an earlier video. Pick another one (or pass --force if the user asked for it).")
    url = f"https://assets.mixkit.co/music/{a.get}/{a.get}.mp3"
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        data = r.read()  # download fully before touching a.out, so a failed download keeps the old file
    with open(a.out, "wb") as f:
        f.write(data)
    title = a.title or f"Mixkit track {a.get}"
    try:
        dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.out],
                             capture_output=True, text=True).stdout.strip()
    except FileNotFoundError:
        dur = "?"
    today = datetime.date.today().isoformat()
    credits = os.path.join(os.path.dirname(os.path.abspath(a.out)), "CREDITS.md")
    with open(credits, "a", encoding="utf-8") as f:
        f.write(f"- {title} ({os.path.basename(a.out)}): https://mixkit.co/free-stock-music/ track {a.get}, {url}. "
                f"Mixkit Stock Music Free License (https://mixkit.co/license/#musicFree). Downloaded {today}.\n")
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(f"{a.get}\t{title}\t{today}\t{os.path.abspath(a.out)}\n")
    print(f"OK {a.out} ({dur} s). Credit added to {credits}; marked as used in {LOG}")


ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("query", nargs="*", help="1–3 English keywords for the mood/genre/topic, e.g. fashion, \"happy pop\", cinematic")
ap.add_argument("--path", help="Mixkit listing path, e.g. mood/uplifting, deep-house, tag/fashion")
ap.add_argument("--pages", type=int, default=2)
ap.add_argument("--limit", type=int, default=25)
ap.add_argument("--get", help="track id to download")
ap.add_argument("--out", default="public/audio/bgm.mp3")
ap.add_argument("--title", help="track title for CREDITS.md")
ap.add_argument("--force", action="store_true")
a = ap.parse_args()
if a.get:
    get(a)
elif a.query or a.path:
    search(a)
else:
    ap.print_help()
