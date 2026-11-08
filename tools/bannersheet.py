"""A banner-lab sheet as a PNG, no browser window.
usage: py -3 tools/bannersheet.py <out.png> [--n 24] [--seed 1] [--set key=val ...] [--preset plate|tab] [--scale 2] [--compare ref.png]
--compare puts the ref on the left and banner seed --seed (with --preset) on the right, same height, in one PNG (ignores --n).
Loads /tools/banner-lab.html?sheet=N&seed=S&set=key:val,.. and saves the #cv canvas.
--set pairs are the locked inputs; --preset applies the lab's Plate or Tab values first (--set wins).
Numbers are clamped to the schema range and the clamp is reported. --scale resamples the shot (the lab draws at dpr 1).
Exits 1 on a console error or a blank canvas (one colour). Never writes into the repo unless you point it there.
"""

import sys
import io
import json
import base64
import time
import importlib.util
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("snap", ROOT / "tools" / "snap.py")
snap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(snap)

from playwright.sync_api import sync_playwright

USAGE = "usage: py -3 tools/bannersheet.py <out.png> [--n 24] [--seed 1] [--set key=val ...] [--preset plate|tab] [--scale 2] [--compare ref.png]"

# the lab's PRESETS (tools/banner-lab.js)
PRESETS = {
    "plate": {"w": 314, "h": 28, "fontSize": 26, "tearL": 20, "tearR": 20, "tilt": -1.2, "mode": "plate"},
    "tab": {"w": 107, "h": 48, "fontSize": 22, "tearL": 12, "tearR": 8, "tilt": 1.7, "padX": 8, "text": "BRIDGE", "mode": "tab"},
}

SCHEMA = "() => Object.fromEntries(Object.entries(Banner.schema).map(([k, s]) => [k, {kind: s.kind, min: s.min, max: s.max, def: s.def}]))"
BLANK = """() => {
  const c = document.getElementById('cv'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  for (let i = 4; i < d.length; i += 4) if (d[i] !== d[0] || d[i + 1] !== d[1] || d[i + 2] !== d[2]) return [false, c.width, c.height];
  return [true, c.width, c.height];
}"""


def parse(argv):
    a = {"out": None, "n": 24, "seed": 1, "set": [], "preset": None, "scale": 2.0, "compare": None}
    i = 0
    while i < len(argv):
        arg = argv[i]
        if arg == "--n":
            i += 1
            a["n"] = int(argv[i])
        elif arg == "--seed":
            i += 1
            a["seed"] = int(argv[i])
        elif arg == "--preset":
            i += 1
            a["preset"] = argv[i].lower()
        elif arg == "--scale":
            i += 1
            a["scale"] = float(argv[i])
        elif arg == "--compare":
            i += 1
            a["compare"] = argv[i]
        elif arg == "--set":
            while i + 1 < len(argv) and not argv[i + 1].startswith("--") and "=" in argv[i + 1]:
                i += 1
                a["set"].append(argv[i])
        elif a["out"] is None:
            a["out"] = arg
        else:
            return None
        i += 1
    if a["out"] is None or (a["preset"] is not None and a["preset"] not in PRESETS):
        return None
    return a


def compare(ref, data, out):
    """Ref on the left, the generated banner (at --scale) on the right, scaled to the same height, on the dark lab ground."""
    from PIL import Image, ImageDraw
    gen = Image.open(io.BytesIO(base64.b64decode(data.split(",", 1)[1]))).convert("RGBA")
    r = Image.open(ref).convert("RGBA")
    pad = 24
    zoom = 3
    h = max(r.height, gen.height)
    # both at their true pixel size (no resize), then a 3x crop of each right end underneath
    sheet = Image.new("RGBA", (r.width + gen.width + 3 * pad, h + 2 * pad + zoom * h), (4, 4, 5, 255))
    sheet.alpha_composite(r, (pad, pad))
    sheet.alpha_composite(gen, (r.width + 2 * pad, pad))
    for im, x in ((r, pad), (gen, r.width + 2 * pad)):
        crop = im.crop((max(0, im.width - 70), 0, im.width, im.height)).resize((min(im.width, 70) * zoom, im.height * zoom), Image.NEAREST)
        sheet.alpha_composite(crop, (x + im.width - crop.width, 2 * pad + h))
    d = ImageDraw.Draw(sheet)
    d.text((pad, 4), "OWNER", fill=(255, 255, 255))
    d.text((r.width + 2 * pad, 4), "GENERATED", fill=(255, 255, 255))
    sheet.convert("RGB").save(out)


def main(argv):
    a = parse(argv)
    if a is None:
        print(USAGE)
        return 2
    out = Path(a["out"])
    if out.suffix != ".png":
        print("out must end in .png")
        return 2
    if ROOT in out.resolve().parents:
        print("out must be outside the repo (GitHub Pages publishes committed files)")
        return 2
    out.parent.mkdir(parents=True, exist_ok=True)

    vals = dict(PRESETS.get(a["preset"], {}))
    for kv in a["set"]:
        k, v = kv.split("=", 1)
        vals[k] = v

    snap.ERRORS.clear()
    t0 = time.time()
    httpd, base = snap.nav.start_server()
    blank = None
    notes = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=snap.CHROME)
            ctx = browser.new_context(viewport={"width": 1600, "height": 900}, device_scale_factor=a["scale"])
            ctx.set_default_timeout(15000)
            page = ctx.new_page()
            snap.watch_errors(page)

            schema = None
            page.goto(f"{base}/tools/banner-lab.html")
            page.wait_for_load_state("load")
            page.wait_for_function("typeof Banner !== 'undefined'")
            schema = page.evaluate(SCHEMA)
            for k, v in list(vals.items()):
                s = schema.get(k)
                if s is None:
                    notes.append(f"unknown key {k} ignored")
                    del vals[k]
                elif s["kind"] == "num":
                    try:
                        x = float(v)
                    except ValueError:
                        x = s["def"]
                    c = min(s["max"], max(s["min"], x))
                    if c != x:
                        notes.append(f"{k}={v} clamped to {c:g} (schema {s['min']:g}..{s['max']:g})")
                    vals[k] = f"{c:g}"

            setq = quote(",".join(f"{k}:{v}" for k, v in vals.items()), safe=":,")
            page.goto(f"{base}/tools/banner-lab.html?sheet={a['n']}&seed={a['seed']}&set={setq}")
            page.wait_for_function("document.title === 'ready'")
            page.evaluate("document.fonts.ready")
            blank, cw, ch = page.evaluate(BLANK)
            if a["compare"]:
                data = page.evaluate("() => Banner.dataURL(Banner.params(%d, %s), %g)" % (a["seed"], json.dumps({k: (float(v) if schema[k]["kind"] == "num" else v) for k, v in vals.items()}), a["scale"]))
                compare(Path(a["compare"]), data, out)
            else:
                page.locator("#cv").screenshot(path=str(out))
            ctx.close()
            browser.close()
    finally:
        httpd.shutdown()

    for n in notes:
        print("NOTE " + n)
    print(f"{out}  canvas {cw}x{ch}  n={a['n']} seed={a['seed']}  {time.time() - t0:.1f}s")
    for err in snap.ERRORS:
        print("ERR " + str(err).splitlines()[0])
    if blank:
        print("FAIL blank canvas")
    return 1 if (snap.ERRORS or blank) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
