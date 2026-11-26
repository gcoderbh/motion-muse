#!/usr/bin/env python3
"""Place videos (restaurant / shop / landmark guides): map data, open-licence photos and clips, credits.

  place.py fetch "ร้านเจ๊ไฝ กรุงเทพ" --out <project>/public/place/jayfai [--radius 450] [--photos 6] [--videos 1]
           [--video-query "Bangkok street food"] [--lat 13.75 --lon 100.50] [--licenses cc0,pd,by,by-sa]
  place.py permission --owner "ร้าน..." --link https://... --use "คลิปแนะนำร้าน 30 วิ ลง TikTok/Reels"

fetch writes into --out:
  place.json      name, address, lat/lon, map (buildings, roads, water, parks in metres around the pin: [east, north]),
                  photos[] and videos[] with file, author, licence, licence URL and source page
  photos/*.jpg, videos/*.mp4
  CREDITS.md      every credit line to show on screen and to paste in the post caption
  PERMISSIONS.md  what may be used as-is, what needs the owner's written permission, and a Thai request template

Sources (no API key): Nominatim + Overpass (OpenStreetMap, ODbL: show "© OpenStreetMap contributors"),
Wikimedia Commons (only files whose licence is in --licenses). It never downloads from TikTok, YouTube,
Instagram, Facebook or Google Maps: their terms forbid it, and their clips are not openly licensed. Ask the
owner for the original file instead (`place.py permission`). Stdlib + ffmpeg only.
"""
import argparse, hashlib, html, json, math, os, re, subprocess, sys, time, urllib.parse, urllib.request

UA = "motion-muse/1.10 (https://github.com/peichh/motion-muse)"
OVERPASS = ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"]
COMMONS = "https://commons.wikimedia.org/w/api.php"
LICENSES = {"cc0": r"^cc0", "pd": r"^(public domain|pd)", "by": r"^cc by \d", "by-sa": r"^cc by-sa \d"}
SOCIAL = r"tiktok\.com|youtube\.com|youtu\.be|instagram\.com|facebook\.com|fb\.watch|x\.com|twitter\.com|google\.[a-z.]+/maps|goo\.gl/maps"
ROAD_W = {"motorway": 16, "trunk": 14, "primary": 12, "secondary": 10, "tertiary": 8, "unclassified": 6, "residential": 6,
          "service": 4, "living_street": 5, "pedestrian": 4, "footway": 2, "path": 2, "steps": 2, "cycleway": 2}


def get(url, data=None, timeout=60):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def getj(url, **q):
    return json.loads(get(url + "?" + urllib.parse.urlencode(q)))


def geocode(q):
    r = getj("https://nominatim.openstreetmap.org/search", q=q, format="json", limit=1, addressdetails=1, **{"accept-language": "th"})
    if not r:
        sys.exit(f"not found on OpenStreetMap: {q!r} (try another spelling, or pass --lat/--lon)")
    time.sleep(1)  # Nominatim policy: at most 1 request per second
    return r[0]


def overpass(lat, lon, radius):
    a = f"(around:{radius},{lat},{lon})"
    q = (f'[out:json][timeout:90];(way["building"]{a};way["highway"](around:{int(radius * 1.3)},{lat},{lon});'
         f'way["natural"="water"](around:{radius * 2},{lat},{lon});way["waterway"="riverbank"](around:{radius * 2},{lat},{lon});'
         f'relation["natural"="water"](around:{radius * 2},{lat},{lon});way["leisure"~"park|garden"]{a};way["landuse"="grass"]{a};);out tags geom;')
    err = None
    for url in OVERPASS:
        for wait in (0, 4):
            try:
                time.sleep(wait)
                return json.loads(get(url, urllib.parse.urlencode({"data": q}).encode(), timeout=120))["elements"]
            except Exception as e:  # busy mirrors answer 429/504 with HTML
                err = e
    sys.exit(f"Overpass failed on every mirror: {err}")


def to_map(els, lat0, lon0, pin_name):
    kx, ky = 111320 * math.cos(math.radians(lat0)), 110540
    xy = lambda g: [[round((p["lon"] - lon0) * kx, 1), round((p["lat"] - lat0) * ky, 1)] for p in g]
    out = {"buildings": [], "roads": [], "water": [], "parks": []}
    for e in els:
        t = e.get("tags", {})
        rings = [e["geometry"]] if "geometry" in e else [m["geometry"] for m in e.get("members", []) if m.get("role") == "outer" and "geometry" in m]
        for g in rings:
            pts = xy(g)
            if len(pts) < 2:
                continue
            if "building" in t and len(pts) >= 4:
                h = None
                try:
                    h = float(re.sub(r"[^0-9.]", "", t.get("height", "")) or 0) or None
                except ValueError:
                    pass
                if not h and t.get("building:levels", "").replace(".", "").isdigit():
                    h = float(t["building:levels"]) * 3.2
                if not h:  # untagged: 2–4 storeys, stable per building id
                    h = 6 + int(hashlib.md5(str(e["id"]).encode()).hexdigest(), 16) % 7
                out["buildings"].append({"p": pts[:-1], "h": round(min(h, 320), 1)})
            elif "highway" in t and t["highway"] in ROAD_W:
                out["roads"].append({"p": pts, "w": ROAD_W[t["highway"]], "k": t["highway"], **({"name": t["name"]} if "name" in t and ROAD_W[t["highway"]] >= 8 else {})})
            elif t.get("natural") == "water" or t.get("waterway") == "riverbank":
                out["water"].append({"p": pts})
            elif len(pts) >= 4:
                out["parks"].append({"p": pts})
    return out


def strip(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s or ""))).strip()


def commons_files(titles, width):
    info = {}
    for i in range(0, len(titles), 40):
        r = getj(COMMONS, action="query", format="json", prop="imageinfo", titles="|".join(titles[i:i + 40]),
                 iiprop="url|size|mime|extmetadata|mediatype", iiurlwidth=width)
        for p in r.get("query", {}).get("pages", {}).values():
            if p.get("imageinfo"):
                info[p["title"]] = p["imageinfo"][0]
    return info


def allowed(lic, keys):
    l = lic.lower()
    return any(re.search(LICENSES[k], l) for k in keys)


def credit(title, ii):
    m = ii.get("extmetadata", {})
    v = lambda k: strip(m.get(k, {}).get("value", ""))
    return {"title": title.removeprefix("File:"), "author": v("Artist") or "unknown", "license": v("LicenseShortName"),
            "licenseUrl": v("LicenseUrl"), "source": ii.get("descriptionurl", ""), "w": ii.get("width"), "h": ii.get("height")}


def search_titles(**q):
    r = getj(COMMONS, action="query", format="json", **q)
    return [x["title"] for x in r.get("query", {}).get("geosearch", r.get("query", {}).get("search", []))]


def slug(s, n):
    s = re.sub(r"\.[a-zA-Z0-9]{2,4}$", "", s)
    return f"{n:02d}-" + (re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()[:40] or "file")


def cmd_fetch(a):
    if re.search(SOCIAL, a.query):
        sys.exit("ลิงก์โซเชียล (TikTok / YouTube / IG / FB / Google Maps) โหลดไม่ได้: ขอไฟล์ต้นฉบับจากเจ้าของ ดู place.py permission")
    out = os.path.abspath(a.out); os.makedirs(out + "/photos", exist_ok=True); os.makedirs(out + "/videos", exist_ok=True)
    keys = [k.strip() for k in a.licenses.split(",") if k.strip() in LICENSES]
    if a.lat is not None and a.lon is not None:
        g = {"lat": a.lat, "lon": a.lon, "name": a.query, "display_name": a.query, "address": {}}
    else:
        g = geocode(a.query)
    lat, lon = float(g["lat"]), float(g["lon"])
    ad = g.get("address", {})
    name = a.name or g.get("name") or a.query
    print(f"pin: {name} {lat:.6f},{lon:.6f}  {g.get('display_name', '')[:90]}")
    m = to_map(overpass(lat, lon, a.radius), lat, lon, name)
    print(f"map: {len(m['buildings'])} buildings, {len(m['roads'])} roads, {len(m['water'])} water, {len(m['parks'])} parks")

    # photos: files geotagged near the pin, then a text search for the name; names that match come first
    near = search_titles(list="geosearch", gscoord=f"{lat}|{lon}", gsradius=min(10000, max(300, a.radius * 2)), gslimit=80, gsnamespace=6)
    named = search_titles(list="search", srsearch=a.photo_query or name, srnamespace=6, srlimit=30)
    titles = list(dict.fromkeys(named + near))
    info = commons_files(titles, 1600)
    words = [w for w in re.split(r"[\s,]+", (a.photo_query or name).lower()) if len(w) > 1]
    rank = lambda t: (-sum(w in t.lower() for w in words), titles.index(t))
    photos, skipped = [], []
    for t in sorted(info, key=rank):
        if len(photos) >= a.photos:
            break
        ii = info[t]
        if ii.get("mime") not in ("image/jpeg", "image/png", "image/webp") or min(ii.get("width", 0), ii.get("height", 0)) < 700:
            continue
        c = credit(t, ii)
        if not allowed(c["license"], keys):
            skipped.append(c); continue
        f = f"photos/{slug(c['title'], len(photos) + 1)}.jpg"
        open(os.path.join(out, f), "wb").write(get(ii.get("thumburl") or ii["url"]))
        photos.append({"file": f, **c})
        print(f"photo: {c['title']}  ({c['license']}, {c['author']})")

    videos = []
    if a.videos:
        vt = [t for t in near if re.search(r"\.(webm|ogv|mpg|mpeg|mp4)$", t, re.I)]
        vt += search_titles(list="search", srsearch=f"{a.video_query or name} filetype:video", srnamespace=6, srlimit=20)
        vt = list(dict.fromkeys(vt))
        vinfo = commons_files(vt, 1280)
        vwords = [w for w in re.split(r"[\s,]+", (a.video_query or name).lower()) if len(w) > 1]
        for t in sorted(vinfo, key=lambda t: (-sum(w in t.lower() for w in vwords), vt.index(t))):  # titles that match the query first
            ii = vinfo[t]
            c = credit(t, ii)
            if not ii.get("mime", "").startswith("video/") or not allowed(c["license"], keys):
                continue
            f = f"videos/{slug(c['title'], len(videos) + 1)}.mp4"
            src = os.path.join(out, f + ".src")
            open(src, "wb").write(get(ii["url"], timeout=300))
            r = subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(a.clip_from), "-i", src, "-t", str(a.clip), "-an", "-vf",
                                "scale='min(1920,iw)':-2", "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p", os.path.join(out, f)])
            os.remove(src)
            dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", os.path.join(out, f)], capture_output=True, text=True).stdout.strip()
            if r.returncode or not re.match(r"^\d", dur) or float(dur) < 0.5:  # --clip-from past the end gives an empty MP4
                if os.path.exists(os.path.join(out, f)):
                    os.remove(os.path.join(out, f))
                continue
            videos.append({"file": f, **c})
            print(f"video: {c['title']}  ({c['license']}, {c['author']})")
            if len(videos) >= a.videos:
                break

    addr = " ".join(x for x in [ad.get("road"), ad.get("suburb") or ad.get("quarter"), ad.get("city_district") or ad.get("district"), ad.get("city") or ad.get("state")] if x)
    place = {"name": name, "query": a.query, "lat": lat, "lon": lon, "address": addr or g.get("display_name", ""),
             "osm": "© OpenStreetMap contributors (ODbL)", "map": m, "photos": photos, "videos": videos}
    json.dump(place, open(os.path.join(out, "place.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    write_credits(out, place)
    write_permissions(out, place, skipped)
    print(f"OK {out}/place.json  ({len(photos)} photos, {len(videos)} videos)  credits: CREDITS.md  permissions: PERMISSIONS.md")


def line(c):
    return f"{c['title']} โดย {c['author']} · {c['license']} ({c['licenseUrl'] or 'see source'}) · {c['source']}"


def write_credits(out, p):
    L = ["# เครดิต / Credits", "", "แสดงบนจอระหว่างที่ภาพนั้นขึ้น และวางในแคปชันโพสต์ทุกครั้ง", "",
         f"- แผนที่: {p['osm']} https://www.openstreetmap.org/copyright"]
    L += [f"- ภาพ: {line(c)}" for c in p["photos"]] + [f"- วิดีโอ: {line(c)}" for c in p["videos"]]
    if any("by-sa" in c["license"].lower() for c in p["photos"] + p["videos"]):
        L += ["", "หมายเหตุ CC BY-SA: ถ้าดัดแปลงไฟล์ (ครอป ใส่ข้อความทับ ตัดต่อ) ต้องเผยแพร่ส่วนที่ดัดแปลงภายใต้ CC BY-SA ด้วย",
              "ถ้าไม่ต้องการ ให้ใช้ --licenses cc0,pd,by"]
    open(os.path.join(out, "CREDITS.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")


TEMPLATE = """สวัสดีครับ/ค่ะ {owner}
ชื่อ ... จากช่อง/เพจ ... ครับ/ค่ะ กำลังทำ{use}
อยากขออนุญาตใช้{what} {link}
- ใช้ช่วงไหน: ประมาณ ... วินาที
- ลงที่: ...
- เครดิต: ใส่ชื่อ{owner}บนคลิปตอนที่ภาพขึ้น และแท็ก/ใส่ลิงก์ในแคปชัน
- ไม่นำไปขายต่อ และจะลบออกทันทีถ้าภายหลังไม่สะดวก
ถ้าได้ ขอไฟล์ต้นฉบับ (ไม่มีลายน้ำ) ส่งทาง ... ได้ไหมครับ/คะ และตอบยืนยันการอนุญาตในแชตนี้ไว้เป็นหลักฐานครับ/ค่ะ
ขอบคุณมากครับ/ค่ะ"""


def write_permissions(out, p, skipped):
    L = ["# การขออนุญาต", "",
         "ใช้ได้เลย (สัญญาอนุญาตเปิด ใส่เครดิตตาม CREDITS.md): แผนที่ OpenStreetMap และไฟล์จาก Wikimedia Commons ที่โหลดมาในโฟลเดอร์นี้", "",
         "ต้องขออนุญาตเจ้าของเป็นลายลักษณ์อักษรก่อนใช้:",
         "- คลิปหรือรูปจาก TikTok, YouTube, Instagram, Facebook, Google Maps, รีวิวในเว็บ และเพจของร้าน (สกิลไม่โหลดจากที่เหล่านี้ ให้ขอไฟล์ต้นฉบับจากเจ้าของ)",
         "- คลิปที่ถ่ายในร้านเอง: ควรขอร้านก่อนถ่าย และขอคนที่เห็นหน้าชัดในคลิป",
         "- โลโก้ ป้ายร้าน และเมนูที่เป็นงานออกแบบของร้าน ถ้าจะใช้เป็นจุดเด่นของคลิป", "",
         "ข้อความขออนุญาต (แก้ ... ก่อนส่ง หรือสร้างใหม่ด้วย `place.py permission`):", "", "```",
         TEMPLATE.format(owner=f"{p['name']}", use="คลิปแนะนำร้าน", what="คลิป/รูป", link="(ลิงก์)"), "```"]
    if skipped:
        L += ["", "ไฟล์ใน Commons ที่ข้ามไปเพราะสัญญาอนุญาตไม่อยู่ใน --licenses (ถ้าจะใช้ต้องขอเจ้าของ):"] + [f"- {line(c)}" for c in skipped[:10]]
    open(os.path.join(out, "PERMISSIONS.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")


def cmd_permission(a):
    if a.link and re.search(SOCIAL, a.link):
        print("หมายเหตุ: ลิงก์นี้เป็นแพลตฟอร์มโซเชียล สกิลจะไม่โหลดคลิปจากลิงก์นี้ ให้ขอไฟล์ต้นฉบับจากเจ้าของ\n")
    print(TEMPLATE.format(owner=a.owner, use=a.use, what=a.what, link=a.link or ""))


ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
sp = ap.add_subparsers(dest="cmd", required=True)
f = sp.add_parser("fetch"); f.add_argument("query"); f.add_argument("--out", required=True); f.add_argument("--name", help="name to show (default: OSM name)")
f.add_argument("--lat", type=float); f.add_argument("--lon", type=float); f.add_argument("--radius", type=int, default=450)
f.add_argument("--photos", type=int, default=6); f.add_argument("--photo-query"); f.add_argument("--videos", type=int, default=1); f.add_argument("--video-query")
f.add_argument("--clip", type=float, default=8, help="seconds kept from each video"); f.add_argument("--clip-from", type=float, default=0)
f.add_argument("--licenses", default="cc0,pd,by,by-sa", help="comma list of cc0, pd, by, by-sa"); f.set_defaults(fn=cmd_fetch)
p = sp.add_parser("permission"); p.add_argument("--owner", required=True); p.add_argument("--link"); p.add_argument("--use", default="คลิปแนะนำร้าน")
p.add_argument("--what", default="คลิป"); p.set_defaults(fn=cmd_permission)
if __name__ == "__main__":
    a = ap.parse_args(); a.fn(a)
