"""Multi-frame genesis capture for review.
usage: py -3 tools/gframes.py <run> [beat ...] [--every 1.5] [--max 12]
       py -3 tools/gframes.py --scene <id> [<run>]   (a scene's beats, <scene>-<beat>.png)
Plays each genesis beat headless on a faked clock and tiles a frame every
`every` seconds into snapshots/frames/<run>/<beat>.png; run it from any cwd.
Reuses tools/snap.py.
       py -3 tools/gframes.py --full 12,14.5,16 [<dir>]   (2000x1009 PNGs at those secs("break")
           times, from gbeat=break, shake off, into snapshots/<dir|full>/; the matter beat is 10)
       py -3 tools/gframes.py --compare <dirA> <dirB>     (changed pixel count per same-named PNG)
"""
import sys, importlib.util
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("snap", ROOT / "tools" / "snap.py")
snap = importlib.util.module_from_spec(spec); spec.loader.exec_module(snap)
from playwright.sync_api import sync_playwright

opts = sys.argv[1:]
if "--help" in opts or "-h" in opts:
    print(__doc__); sys.exit(0)
skip = {opts[i + 1] for i, a in enumerate(opts) if a.startswith("--") and i + 1 < len(opts)}
args = [a for a in opts if not a.startswith("--") and a not in skip]
def opt(name, default):
    return float(opts[opts.index(name) + 1]) if name in opts else default
scene = opts[opts.index("--scene") + 1] if "--scene" in opts else None
if "--compare" in opts:
    # changed pixel count between the same-named PNGs of two --full sets
    import numpy as np
    da, db = (Path(x) for x in opts[opts.index("--compare") + 1:opts.index("--compare") + 3])
    tot = 0
    for f in sorted(da.glob("*.png")):
        a = np.asarray(Image.open(f).convert("RGB")).astype(int)
        b = np.asarray(Image.open(db / f.name).convert("RGB")).astype(int)
        n = int((a != b).any(axis=2).sum()); tot += n
        print(f"  {f.name:16} {n} changed px")
    print(f"  total {tot} changed px")
    sys.exit(0)
if "--full" in opts:
    # full-size 2000x1009 PNGs at secs("break") times, from gbeat=break, shake pinned to 0
    times = [float(x) for x in opts[opts.index("--full") + 1].split(",")]
    out = ROOT / "snapshots" / (args[0] if args else "full")
    out.mkdir(parents=True, exist_ok=True)
    httpd, base = snap.nav.start_server()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(args=snap.CHROME)
            page = snap.genesis_page(browser, base)
            page.set_viewport_size({"width": 2000, "height": 1009})
            page.goto(f"{base}/?genesis=1&gbeat=break")
            page.wait_for_load_state("load")
            snap.settle(page, 120)
            page.evaluate("Math.random = () => 0.5")   # shake only; the scene is seeded
            for t in sorted(times):
                cur = page.evaluate('Gen.secs("break")')
                if t > cur:
                    page.clock.run_for(round((t - cur) * 1000))
                snap.ERRORS.clear()
                f = out / f"break-{t:06.2f}s.png"
                page.screenshot(path=str(f), animations="disabled", caret="hide")
                print(f"  secs(break) {page.evaluate('Gen.secs(\"break\")'):.3f} -> {f}")
                if snap.ERRORS: print("ERR", snap.ERRORS[0])
            snap.close_shared(); browser.close()
    finally:
        httpd.shutdown()
    sys.exit(0)
if scene:
    a, b = snap.SCENE_SPANS[scene]
    beats = snap.BEAT_IDS[snap.BEAT_IDS.index(a):snap.BEAT_IDS.index(b) + 1]
    run = args[0] if args else scene
else:
    run = args[0]; beats = args[1:] or snap.BEAT_IDS
every = opt("--every", 1.5); mx = int(opt("--max", 12))
out = ROOT / "snapshots" / "frames" / run; out.mkdir(parents=True, exist_ok=True)

httpd, base = snap.nav.start_server()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(args=snap.CHROME)
        for bid in beats:
            page = snap.genesis_page(browser, base)
            page.goto(f"{base}/?genesis=1&gscene={scene}&gbeat={bid}" if scene
                      else f"{base}/?genesis=1&gbeat={bid}")
            page.wait_for_load_state("load")
            snap.settle(page, 120)
            if scene:
                snap.wait_scene(page, bid)
                print("  beat at frame 0:", page.evaluate("Gen.BEATS[Gen.beat].id"))
            durs = dict(page.evaluate("Gen.BEATS.map(b => [b.id, b.dur])"))
            dur = durs[bid]
            n = min(mx, max(2, int(dur / every) + 1))
            step = dur / (n - 1) if n > 1 else dur
            frames = []
            t = page.evaluate('Gen.local') if scene else 0.12
            for k in range(n):
                target = min(dur - 0.05, k * step) if k else 0.12
                if target > t:
                    page.clock.run_for(int((target - t) * 1000)); t = target
                snap.ERRORS.clear()
                page.screenshot(path=str(out / f"_{bid}-{k}.png"), animations="disabled", caret="hide")
                local = page.evaluate("Gen.local")
                frames.append((f"{bid} {local:.1f}s/{dur}s", out / f"_{bid}-{k}.png"))
                if snap.ERRORS: print("ERR", bid, snap.ERRORS[0])
            TW = 360; cols = 4
            ims = []
            for label, f in frames:
                im = Image.open(f).convert("RGB"); r = TW / im.width
                ims.append((label, im.resize((TW, int(im.height * r)), Image.LANCZOS)))
            TH = ims[0][1].height + 14; rows = (len(ims) + cols - 1) // cols
            sheet = Image.new("RGB", (cols * TW, rows * TH), (20, 20, 20)); d = ImageDraw.Draw(sheet)
            for k, (label, im) in enumerate(ims):
                x, y = (k % cols) * TW, (k // cols) * TH
                sheet.paste(im, (x, y + 14)); d.text((x + 3, y + 1), label, fill=(255, 220, 120))
            name = f"{scene}-{bid}" if scene else bid
            sheet.save(out / f"{name}.png")
            for _, f in frames: f.unlink()
            print(f"  {bid:12} {dur:5.1f}s x{n} -> {out / (name + '.png')}")
        snap.close_shared(); browser.close()
finally:
    httpd.shutdown()
