#!/usr/bin/env python3
"""Motion Muse notebook: what this user likes, what they rejected, and techniques used often, kept on this machine.

  learn.py show [--brief "..."]                 # read at the start of every job
  learn.py note "<text>" [--kind like|dislike|rule|fix] [--tag flat,neck]   # feedback worth keeping
  learn.py use <technique> [--desc "..."]       # count a technique each time a video uses it
  learn.py save <technique> <file>... [--desc]  # keep reusable code once a technique is used often
  learn.py get <technique> <project>            # copy saved code into <project>/src/lib/learned/<technique>/
  learn.py forget <id|technique|text> | --all   # the user can always make it forget
  learn.py pause | resume                       # "ห้ามจำ": stop writing until resumed
  learn.py export <file.json> | import <file.json>   # move the notebook to another machine

Store: $MOTION_MUSE_HOME or ~/.motion-muse (learn.json + snippets/). Nothing leaves the machine.
"""
import argparse, datetime, json, os, re, shutil, sys

HOME = os.path.expanduser(os.environ.get("MOTION_MUSE_HOME", "~/.motion-muse"))
DB = os.path.join(HOME, "learn.json")
SNIP = os.path.join(HOME, "snippets")
PROMOTE = int(os.environ.get("MOTION_MUSE_PROMOTE", "3"))
KINDS = ("rule", "dislike", "like", "fix")
SECRET = re.compile(r"(api[_-]?key|token|secret|password|passwd|sk-[a-z0-9]{8,}|ghp_[a-z0-9]{8,})", re.I)


def today():
    return datetime.date.today().isoformat()


def load():
    if not os.path.isfile(DB):
        return {"notes": [], "uses": {}, "paused": False, "next": 1}
    d = json.load(open(DB, encoding="utf-8"))
    d.setdefault("notes", []); d.setdefault("uses", {}); d.setdefault("paused", False)
    d.setdefault("next", 1 + max([n["id"] for n in d["notes"]] or [0]))
    return d


def ensure_home():
    if not os.path.isdir(HOME):
        os.makedirs(HOME, mode=0o700); os.chmod(HOME, 0o700)


def store(d):
    ensure_home()
    tmp = DB + ".tmp"
    with os.fdopen(os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), "w", encoding="utf-8") as fh:
        fh.write(json.dumps(d, ensure_ascii=False, indent=1) + "\n")
    os.replace(tmp, DB)


def writable(d):
    if d["paused"]:
        sys.exit("paused: the user asked not to remember (learn.py resume to turn it back on)")


def words(s):
    return {w for w in re.findall(r"[a-z0-9]+|[\u0e00-\u0e7f]+", s.lower()) if len(w) > 1}


def slug(s):
    return re.sub(r"[^a-z0-9ก-๙]+", "-", s.lower()).strip("-")[:60] or "item"


def cmd_show(a):
    d = load()
    if not d["notes"] and not d["uses"]:
        print("notebook empty (" + HOME + ")"); return
    q = words(a.brief or "")
    def rank(n):
        return (KINDS.index(n["kind"]), -len(q & (words(n["text"]) | set(n.get("tags", [])))), -n.get("hits", 1))
    notes = sorted(d["notes"], key=rank)
    if q and len(notes) > a.limit:
        notes = [n for n in notes if n["kind"] in ("rule", "dislike") or q & (words(n["text"]) | set(n.get("tags", [])))]
    print(f"Motion Muse notebook ({HOME}){'  [paused]' if d['paused'] else ''}")
    for n in notes[:a.limit]:
        print(f"  #{n['id']:<3} {n['kind']:7} {n['text']}" + (f"  (x{n['hits']})" if n.get("hits", 1) > 1 else "")
              + ("  [imported: not binding until the user confirms → learn.py note the same text]" if n.get("imported") else ""))
    if d["uses"]:
        print("techniques used:")
        for k, u in sorted(d["uses"].items(), key=lambda kv: -kv[1]["count"]):
            saved = "  saved → learn.py get " + k + " <project>" if u.get("files") else ("  PROMOTE: make it reusable, then learn.py save" if u["count"] >= PROMOTE else "")
            print(f"  {k:24} x{u['count']:<3} {u.get('desc', '')}{saved}")


def cmd_note(a):
    d = load(); writable(d)
    if a.kind and a.kind not in KINDS: sys.exit(f"--kind must be one of {', '.join(KINDS)}")
    if SECRET.search(a.text): sys.exit("refused: looks like a secret; never store keys or passwords")
    tags = [t.strip().lower() for t in (a.tag or "").split(",") if t.strip()]
    for n in d["notes"]:
        if n["text"].strip().lower() == a.text.strip().lower():
            n["hits"] = n.get("hits", 1) + 1; n["last"] = today(); n.pop("imported", None); n["kind"] = a.kind or n["kind"]; n["tags"] = sorted(set(n.get("tags", [])) | set(tags))
            store(d); print(f"seen again #{n['id']} (x{n['hits']})"); return
    n = {"id": d["next"], "kind": a.kind or "rule", "text": a.text.strip(), "tags": tags, "added": today(), "last": today(), "hits": 1}
    d["next"] += 1; d["notes"].append(n); store(d); print(f"noted #{n['id']}")


def cmd_use(a):
    d = load(); writable(d)
    k = slug(a.technique)
    u = d["uses"].setdefault(k, {"count": 0, "first": today()})
    u["count"] += 1; u["last"] = today()
    if a.desc: u["desc"] = a.desc
    store(d)
    print(f"{k} x{u['count']}")
    if u["count"] >= PROMOTE and not u.get("files"):
        print(f"PROMOTE {k}: used {u['count']} times. Turn it into a reusable, parameterised component and run: learn.py save {k} <file>...")


def cmd_save(a):
    d = load(); writable(d)
    k = slug(a.technique); dst = os.path.join(SNIP, k)
    names = [os.path.basename(f) for f in a.files]
    if len(set(names)) != len(names): sys.exit("two files share a name; rename one so neither is lost")
    for f in a.files:
        if not os.path.isfile(f): sys.exit(f"no such file: {f}")
        if SECRET.search(open(f, encoding="utf-8", errors="ignore").read()): sys.exit(f"refused: {f} looks like it contains a secret")
    ensure_home(); os.makedirs(dst, exist_ok=True)
    u = d["uses"].setdefault(k, {"count": 0, "first": today()})
    u["files"] = sorted(set(u.get("files", [])) | {os.path.basename(f) for f in a.files})
    u["saved"] = today()
    if a.desc: u["desc"] = a.desc
    for f in a.files: shutil.copy(f, os.path.join(dst, os.path.basename(f)))
    store(d); print(f"saved {k}: {', '.join(u['files'])} → {dst}")


def cmd_get(a):
    d = load(); k = slug(a.technique); u = d["uses"].get(k)
    if not u or not u.get("files"): sys.exit(f"nothing saved for {k} (learn.py show)")
    dst = os.path.join(os.path.abspath(a.project), "src", "lib", "learned", k); os.makedirs(dst, exist_ok=True)
    files = [os.path.basename(f) for f in u["files"] if os.path.isfile(os.path.join(SNIP, k, os.path.basename(f)))]
    for f in files: shutil.copy(os.path.join(SNIP, k, f), os.path.join(dst, f))
    print(f"copied {', '.join(files)} → {dst}  (import from './lib/learned/{k}/...')")
    if not d["paused"]:
        u["count"] += 1; u["last"] = today(); store(d)


def cmd_forget(a):
    d = load()
    if a.all:
        if os.path.isdir(SNIP): shutil.rmtree(SNIP)
        store({"notes": [], "uses": {}, "paused": d["paused"], "next": 1}); print("forgot everything"); return
    if not a.what: sys.exit("forget what? an id, a technique, a piece of text, or --all")
    w = a.what.strip(); gone = []
    keep = []
    for n in d["notes"]:
        (gone if str(n["id"]) == w.lstrip("#") or (not w.lstrip("#").isdigit() and w.lower() in n["text"].lower()) else keep).append(n)
    d["notes"] = keep
    k = slug(w)
    if not gone and k in d["uses"]:
        d["uses"].pop(k); gone.append({"id": k, "text": "technique " + k})
        if os.path.isdir(os.path.join(SNIP, k)): shutil.rmtree(os.path.join(SNIP, k))
    store(d)
    print("forgot: " + ("; ".join(f"#{g['id']} {g['text']}" for g in gone) if gone else "nothing matched"))


def cmd_pause(a, on):
    d = load(); d["paused"] = on; store(d); print("paused (nothing new is written)" if on else "resumed")


def cmd_export(a):
    d = load(); d["snippets"] = {}
    for k, u in d["uses"].items():
        for f in map(os.path.basename, u.get("files", [])):
            if os.path.isfile(os.path.join(SNIP, k, f)):
                d["snippets"].setdefault(k, {})[f] = open(os.path.join(SNIP, k, f), encoding="utf-8").read()
    open(a.file, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=1) + "\n"); print(f"exported → {a.file}")


def cmd_import(a):
    src = json.load(open(a.file, encoding="utf-8")); d = load(); ensure_home()
    have = {n["text"].lower() for n in d["notes"]}
    for n in src.get("notes", []):
        if n["text"].lower() not in have:
            n = dict(n, id=d["next"], imported=today()); d["next"] += 1; d["notes"].append(n)
    for k, u in src.get("uses", {}).items():
        k = slug(k)
        mine = d["uses"].setdefault(k, {"count": 0, "first": u.get("first", today())})
        mine["count"] = max(mine["count"], u.get("count", 0)); mine.update({x: u[x] for x in ("desc", "saved") if x in u})
    for k, fs in src.get("snippets", {}).items():
        k = slug(k)
        os.makedirs(os.path.join(SNIP, k), exist_ok=True)
        for f, body in fs.items():
            if SECRET.search(body): print(f"skipped {k}/{f}: looks like it contains a secret"); continue
            open(os.path.join(SNIP, k, os.path.basename(f)), "w", encoding="utf-8").write(body)
            u = d["uses"].setdefault(k, {"count": 0, "first": today()})
            u["files"] = sorted(set(u.get("files", [])) | {os.path.basename(f)})
    store(d); print(f"imported {a.file}")


ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
sp = ap.add_subparsers(dest="cmd", required=True)
s = sp.add_parser("show"); s.add_argument("--brief"); s.add_argument("--limit", type=int, default=30); s.set_defaults(fn=cmd_show)
s = sp.add_parser("note"); s.add_argument("text"); s.add_argument("--kind"); s.add_argument("--tag"); s.set_defaults(fn=cmd_note)
s = sp.add_parser("use"); s.add_argument("technique"); s.add_argument("--desc"); s.set_defaults(fn=cmd_use)
s = sp.add_parser("save"); s.add_argument("technique"); s.add_argument("files", nargs="+"); s.add_argument("--desc"); s.set_defaults(fn=cmd_save)
s = sp.add_parser("get"); s.add_argument("technique"); s.add_argument("project"); s.set_defaults(fn=cmd_get)
s = sp.add_parser("forget"); s.add_argument("what", nargs="?"); s.add_argument("--all", action="store_true"); s.set_defaults(fn=cmd_forget)
s = sp.add_parser("pause"); s.set_defaults(fn=lambda a: cmd_pause(a, True))
s = sp.add_parser("resume"); s.set_defaults(fn=lambda a: cmd_pause(a, False))
s = sp.add_parser("export"); s.add_argument("file"); s.set_defaults(fn=cmd_export)
s = sp.add_parser("import"); s.add_argument("file"); s.set_defaults(fn=cmd_import)

if __name__ == "__main__":
    a = ap.parse_args(); a.fn(a)
