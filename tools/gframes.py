"""Multi-frame genesis capture for review.
usage: py -3 tools/gframes.py <run> [beat ...] [--every 1.5] [--max 12]
Plays each genesis beat headless on a faked clock and tiles a frame every
`every` seconds into snapshots/frames/<run>/<beat>.png; run it from any cwd.
Reuses tools/snap.py.
"""
import sys, importlib.util
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("snap", ROOT / "tools" / "snap.py")
snap = importlib.util.module_from_spec(spec); spec.loader.exec_module(snap)
from playwright.sync_api import sync_playwright

opts = sys.argv[1:]
skip = {opts[i + 1] for i, a in enumerate(opts) if a.startswith("--") and i + 1 < len(opts)}
args = [a for a in opts if not a.startswith("--") and a not in skip]
def opt(name, default):
    return float(opts[opts.index(name) + 1]) if name in opts else default
run = args[0]; beats = args[1:] or snap.BEAT_IDS
every = opt("--every", 1.5); mx = int(opt("--max", 12))
out = ROOT / "snapshots" / "frames" / run; out.mkdir(parents=True, exist_ok=True)

httpd, base = snap.nav.start_server()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(args=snap.CHROME)
        for bid in beats:
            page = snap.genesis_page(browser, base)
            page.goto(f"{base}/?genesis=1&gbeat={bid}")
            page.wait_for_load_state("load")
            snap.settle(page, 120)
            durs = dict(page.evaluate("Gen.BEATS.map(b => [b.id, b.dur])"))
            dur = durs[bid]
            n = min(mx, max(2, int(dur / every) + 1))
            step = dur / (n - 1) if n > 1 else dur
            frames = []
            t = 0.12
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
            sheet.save(out / f"{bid}.png")
            for _, f in frames: f.unlink()
            print(f"  {bid:12} {dur:5.1f}s x{n} -> {out / (bid + '.png')}")
        snap.close_shared(); browser.close()
finally:
    httpd.shutdown()
