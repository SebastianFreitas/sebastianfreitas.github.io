"""Record a webm of genesis beats playing in real time.
usage: py -3 tools/gwebm.py <out_dir> <first_beat> [<last_beat>] [--size 1280x720]
Opens /?genesis=1&gbeat=<first_beat> in Chromium with video on, lets the cutscene
run from the start of <first_beat> to the end of <last_beat> (default: the same
beat), and writes <out_dir>/genesis-<first>-<last>.webm (genesis-<first>.webm for
one beat). The recording starts with the page, so it opens with the loading gate;
the printed lead-in is how many seconds in the beat starts. Nothing is written in
the repo. Exits 1 on a console error or if the last beat never ends.
"""
import sys, time, shutil, tempfile, importlib.util
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("snap", ROOT / "tools" / "snap.py")
snap = importlib.util.module_from_spec(spec); spec.loader.exec_module(snap)
from playwright.sync_api import sync_playwright

opts = sys.argv[1:]
if "--help" in opts or "-h" in opts or len(opts) < 2:
    print(__doc__); sys.exit(0)
size = "1280x720"
if "--size" in opts:
    i = opts.index("--size"); size = opts[i + 1]; del opts[i:i + 2]
w, h = (int(x) for x in size.lower().split("x"))
out = Path(opts[0]); first = opts[1]; last = opts[2] if len(opts) > 2 else first
out.mkdir(parents=True, exist_ok=True)
name = f"genesis-{first}.webm" if last == first else f"genesis-{first}-{last}.webm"
errors = []
fail = None
vd = Path(tempfile.mkdtemp(prefix="gwebm_"))
httpd, base = snap.nav.start_server()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(args=snap.CHROME)
        cx = browser.new_context(viewport={"width": w, "height": h}, record_video_dir=str(vd),
                                 record_video_size={"width": w, "height": h})
        page = cx.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: m.type == "error"
                and not (m.location or {}).get("url", "").endswith(".mp4")
                and errors.append(m.text))
        t0 = time.time()
        page.goto(f"{base}/?genesis=1&gbeat={first}")
        page.wait_for_load_state("load")
        try:
            # the gate opens by itself; the beat is running once Gen is on it
            page.wait_for_function(f'window.Gen && Gen.BEATS && Gen.BEATS[Gen.beat] && Gen.BEATS[Gen.beat].id === "{first}" && !Gen.paused', timeout=60000)
            lead = time.time() - t0
            ids = page.evaluate("Gen.BEATS.map(b => b.id)")
            if last not in ids:
                raise RuntimeError(f"no beat {last!r} in G.BEATS")
            li = ids.index(last)
            # wait until the last beat has played out: past it, or its local time at its duration
            page.wait_for_function(f"Gen.beat > {li} || !Gen.active || (Gen.beat === {li} && Gen.local >= Gen.BEATS[{li}].dur - 0.05)",
                                   timeout=int((sum(page.evaluate("Gen.BEATS.map(b => b.dur)")) + 30) * 1000), polling=100)
        except Exception as e:
            fail = f"genesis never reached the end of {last}: {str(e).splitlines()[0]}"
        total = time.time() - t0
        video = page.video
        cx.close()
        if fail is None and not errors:
            vp = Path(video.path())
            shutil.copyfile(vp, out / name)
        browser.close()
finally:
    httpd.shutdown()
    shutil.rmtree(vd, ignore_errors=True)
if errors:
    print("FAIL console errors:"); [print("  ", e) for e in errors]; sys.exit(1)
if fail:
    print("FAIL", fail); sys.exit(1)
print(f"wrote {out / name}  {total:.1f} s (beat starts at {lead:.1f} s)")
