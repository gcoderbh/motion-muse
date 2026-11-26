#!/usr/bin/env python3
"""Render one video per row of a CSV (or JSON list): product cards, price lists, per-branch promos, quote series.

  batch.py <project> <Composition> rows.csv [--base props.json] [--name "{name}"] [--formats 9:16,1:1] [--still] [--force]

Each column becomes a prop of the composition. Values that look like numbers or JSON ([..], {..}, true) are parsed;
dotted columns nest ("brand.colors.primary" → {"brand": {"colors": {"primary": ...}}}). A blank top-level cell
is sent as null (Remotion would otherwise fill it from the composition's demo defaultProps); blank dotted cells are left out. --base gives props shared by
every row (e.g. the brand kit) and rows override it. The project is bundled once; finished files are skipped unless
--force. Output: out/batch/<Composition>/<name>[-<format>].mp4 (or .png with --still) and a report.csv.
"""
import argparse, csv, json, os, re, subprocess, sys, tempfile


def parse(v):
    s = v.strip()
    if re.fullmatch(r"-?\d+(\.\d+)?", s):
        return float(s) if "." in s else int(s)
    if s[:1] in "[{" or s in ("true", "false", "null"):
        try:
            return json.loads(s)
        except ValueError:
            pass
    return v


def nest(row):
    out = {}
    parents = {k.strip().split(".")[0] for k in row if k and "." in k}
    for k, v in row.items():
        if k is None or v is None:
            continue
        d, parts = out, k.strip().split(".")
        if v.strip() == "":
            if len(parts) == 1 and parts[0] not in parents:
                out[parts[0]] = None  # explicit null so the composition's demo defaultProps do not fill the gap
            continue
        for p in parts[:-1]:
            d = d.setdefault(p, {})
        d[parts[-1]] = parse(v)
    return out


def merge(a, b):
    r = dict(a)
    for k, v in b.items():
        r[k] = merge(r[k], v) if isinstance(v, dict) and isinstance(r.get(k), dict) else v
    return r


def slug(s, i):
    s = re.sub(r"[^\w\u0E00-\u0E7F-]+", "-", str(s)).strip("-")[:60]
    return s or f"row{i + 1}"


def size(fmt):
    if "x" in fmt:
        w, h = fmt.split("x"); return int(w), int(h)
    a, b = map(int, fmt.split(":")); short = 1080
    return (short, round(short * b / a)) if b >= a else (round(short * a / b), short)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project"); ap.add_argument("comp"); ap.add_argument("rows")
    ap.add_argument("--base"); ap.add_argument("--name", default="{name}")
    ap.add_argument("--formats"); ap.add_argument("--still", action="store_true"); ap.add_argument("--frame", type=int, default=60)
    ap.add_argument("--force", action="store_true"); ap.add_argument("--concurrency", type=int)
    a = ap.parse_args()
    P = os.path.abspath(a.project)
    rows = json.load(open(a.rows, encoding="utf-8")) if a.rows.endswith(".json") else [nest(r) for r in csv.DictReader(open(a.rows, encoding="utf-8-sig"))]
    base = json.load(open(a.base, encoding="utf-8")) if a.base else {}
    out_dir = os.path.join(P, "out", "batch", a.comp); os.makedirs(out_dir, exist_ok=True)
    bundle = os.path.join(P, "out", ".bundle")
    print(f"bundling {P} once …")
    r = subprocess.run(["npx", "remotion", "bundle", "src/index.ts", "--out-dir", bundle, "--log=error"], cwd=P)
    if r.returncode:
        sys.exit("bundle failed (run npx tsc --noEmit -p . in the project)")
    fmts = a.formats.split(",") if a.formats else [None]
    report, names = [], set()
    for i, row in enumerate(rows):
        props = merge(base, row)
        try:
            name = slug(a.name.format(i=i + 1, **{k: v for k, v in props.items() if not isinstance(v, dict)}), i)
        except KeyError as e:
            sys.exit(f"--name uses {e} but row {i + 1} has no such column")
        base_name, n = name, 2
        while name in names:
            name, n = f"{base_name}-{n}", n + 1
        names.add(name)
        for fm in fmts:
            ext = "png" if a.still else "mp4"
            dst = os.path.join(out_dir, f"{name}{'-' + fm.replace(':', 'x') if fm else ''}.{ext}")
            if os.path.exists(dst) and not a.force:
                report.append([i + 1, name, fm or "", "skipped (exists)", dst]); continue
            with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as t:
                json.dump(props, t, ensure_ascii=False); pf = t.name
            cmd = ["npx", "remotion", "still" if a.still else "render", bundle, a.comp, dst, f"--props={pf}", "--log=error"]
            if a.still: cmd.append(f"--frame={a.frame}")
            if fm:
                w, h = size(fm); cmd += [f"--width={w}", f"--height={h}"]
            if a.concurrency: cmd.append(f"--concurrency={a.concurrency}")
            print(f"[{i + 1}/{len(rows)}] {name} {fm or ''}")
            ok = subprocess.run(cmd, cwd=P).returncode == 0
            os.unlink(pf)
            report.append([i + 1, name, fm or "", "ok" if ok else "FAILED", dst])
    with open(os.path.join(out_dir, "report.csv"), "w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows([["row", "name", "format", "status", "file"], *report])
    bad = [r for r in report if r[3] == "FAILED"]
    print(f"done: {sum(r[3] == 'ok' for r in report)} rendered, {sum(r[3].startswith('skipped') for r in report)} skipped, {len(bad)} failed → {out_dir}/report.csv")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
