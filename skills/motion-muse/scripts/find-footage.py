#!/usr/bin/env python3
"""Find free stock b-roll on Mixkit when the user has no (or not enough) footage.

Search:   find-footage.py coffee "latte art" [--orientation vertical|horizontal] [--pages 2]
Download: find-footage.py --get 209 [--get 223 ...] [--dir footage-raw] [--res 1080]

Mixkit Stock Video Free License: commercial use OK, no credit needed, no standalone resale, and no
use that implies people in the clips endorse a product. Downloads are written to CREDITS.md and to
$MOTION_MUSE_FOOTAGE_LOG (default ~/.config/motion-muse/used-footage.tsv) so later videos pick
different clips. Stdlib only. Then run footage-scan.py on the download folder.
"""
import argparse, datetime, html, os, re, sys, urllib.parse, urllib.request

BASE = "https://mixkit.co/free-stock-video/"
UA = {"User-Agent": "Mozilla/5.0 (motion-muse footage finder)"}
LOG = os.environ.get("MOTION_MUSE_FOOTAGE_LOG", os.path.expanduser("~/.config/motion-muse/used-footage.tsv"))


def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def parse(page):
    out = []
    for c in page.split('data-algolia-analytics-object-id="video-')[1:]:
        vid = c.split('"', 1)[0]
        title = re.search(r'overlay-video-title">\s*(.*?)\s*</span>', c, re.S)
        desc = re.search(r'overlay-video-description">\s*(.*?)\s*</span>', c, re.S)
        size = re.search(r'item-grid-video-player__thumb"[^>]*width="(\d+)" height="(\d+)"', c)
        if vid.isdigit() and title:
            w, h = (int(size.group(1)), int(size.group(2))) if size else (16, 9)
            out.append({"id": vid, "title": html.unescape(title.group(1)), "desc": html.unescape(desc.group(1)) if desc else "",
                        "orientation": "vertical" if h > w else "horizontal"})
    return out


def used_ids():
    if not os.path.exists(LOG):
        return set()
    return {l.split("\t", 1)[0] for l in open(LOG, encoding="utf-8") if l.strip()}


def search(a):
    urls = []
    for p in range(1, a.pages + 1):
        for q in a.query:
            urls.append(BASE + "discover/" + urllib.parse.quote(q.strip().lower()) + f"/?page={p}")
    seen, rows, used = set(), [], used_ids()
    for u in urls:
        try:
            for r in parse(fetch(u)):
                if r["id"] not in seen:
                    seen.add(r["id"]); rows.append(r)
        except Exception as e:
            print(f"WARN {u}: {e}", file=sys.stderr)
    if a.orientation:
        rows = [r for r in rows if r["orientation"] == a.orientation]
    fresh = [r for r in rows if a.all or r["id"] not in used]
    print(f"{len(fresh)} clips ({len(rows) - len(fresh)} already used, skipped)")
    print("id\torientation\ttitle\tdescription\tpreview")
    for r in fresh[: a.limit]:
        print(f"{r['id']}\t{r['orientation']}\t{r['title']}\t{r['desc'][:110]}\thttps://assets.mixkit.co/videos/{r['id']}/{r['id']}-360.mp4")


def get(a):
    os.makedirs(a.dir, exist_ok=True)
    used, today = used_ids(), datetime.date.today().isoformat()
    for vid in a.get:
        if vid in used and not a.force:
            print(f"SKIP {vid}: used in an earlier video (pass --force if the user wants it)")
            continue
        out = os.path.join(a.dir, f"mixkit-{vid}.mp4")
        data, url = None, None
        for res in dict.fromkeys([a.res, "1080", "720"]):
            url = f"https://assets.mixkit.co/videos/{vid}/{vid}-{res}.mp4"
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
                    data = r.read()
                break
            except Exception:
                continue
        if not data:  # newer clips live under active_storage/...; read the real file URLs from the clip page
            try:
                page = fetch(f"{BASE}clip-{vid}/")
                files = sorted(set(re.findall(rf"https://assets\.mixkit\.co/active_storage/video_items/{vid}/\d+/{vid}-video-(\d+)\.mp4", page)), key=int)
                res = next((r for r in reversed(files) if int(r) <= int(a.res)), files[-1] if files else None)
                if res:
                    url = re.search(rf"https://assets\.mixkit\.co/active_storage/video_items/{vid}/\d+/{vid}-video-{res}\.mp4", page).group(0)
                    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
                        data = r.read()
            except Exception as e:
                print(f"WARN {vid}: {e}", file=sys.stderr)
        if not data:
            print(f"FAIL {vid}: no downloadable size")
            continue
        with open(out, "wb") as f:
            f.write(data)
        with open(os.path.join(a.dir, "CREDITS.md"), "a", encoding="utf-8") as f:
            f.write(f"- Mixkit clip {vid} ({os.path.basename(out)}): {url}. Mixkit Stock Video Free License "
                    f"(https://mixkit.co/license/#videoFree). Downloaded {today}.\n")
        os.makedirs(os.path.dirname(LOG), exist_ok=True)
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(f"{vid}\t{today}\t{os.path.abspath(out)}\n")
        print(f"OK {out} ({len(data) // 1024} KB)")


ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("query", nargs="*", help="English keywords, each one is a separate Mixkit search")
ap.add_argument("--orientation", choices=["vertical", "horizontal"])
ap.add_argument("--pages", type=int, default=2)
ap.add_argument("--limit", type=int, default=30)
ap.add_argument("--all", action="store_true", help="also list clips used before")
ap.add_argument("--get", nargs="+", help="clip ids to download")
ap.add_argument("--dir", default="footage-raw")
ap.add_argument("--res", default="1080", help="1080 or 720 (falls back automatically)")
ap.add_argument("--force", action="store_true")
a = ap.parse_args()
if a.get:
    get(a)
elif a.query:
    search(a)
else:
    ap.print_help()
