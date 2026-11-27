"""One cutscene capture tool: steps the real genesis page on the faked clock.
usage: py -3 tools/cshot.py <scene> <round> --beat <id> [--t a,b] [--fps 12] [--at t1,t2,..]
         [--also beat:t ...] [--crop x0,y0,x1,y1] [--closeup x0,y0,x1,y1] [--cols 4] [--cell 480]
         [--size 1920x1080] [--eval "<js>"] [--dump "<js expr>"] [--clip] [--root <checkout>]
Times are seconds from the start of --beat and may run on into the beats after it
(--t a,b at --fps; --at explicit; neither: the whole beat). Every time is checked before the first
frame; a time at the very end is shot 0.05 s before it. A cell's label is the time shot, then the
beat and time the page really is at (the page settles a moment into the beat: 0 is shot there).
Writes snapshots/cshot/<scene>/r<round>/ (the round's old files are replaced): frames/f_<t*60>.png,
sheet.png, closeup.png (--closeup), data.json (--dump: [{t, at, value}], at = the time reached),
clip.webm (--clip, ffmpeg VP9, every frame 1/fps long). --also beat:t adds a frame of another beat
as an extra cell (frames/f_<beat>_<t*60>.png). --root serves another checkout.
Exits 1 on a console error, an unknown beat, a bad time or a time past the end of the cutscene."""
import sys, json, time, shutil, subprocess, importlib.util
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("snap", ROOT / "tools" / "snap.py")
snap = importlib.util.module_from_spec(spec); spec.loader.exec_module(snap)
from playwright.sync_api import sync_playwright

argv = sys.argv[1:]
if "--help" in argv or "-h" in argv or len(argv) < 2:
    print(__doc__); sys.exit(0)
FLAGS = {"--clip"}
def opts(name):
    return [argv[i + 1] for i, a in enumerate(argv) if a == name and i + 1 < len(argv)]
def opt(name, default=None):
    v = opts(name); return v[-1] if v else default
def die(msg):
    print("cshot:", msg); sys.exit(1)
def num(x, what):
    try: return float(x)
    except ValueError: die(f"{what}: {x!r} is not a number")
pos = [a for i, a in enumerate(argv) if not a.startswith("--") and not (i and argv[i - 1].startswith("--") and argv[i - 1] not in FLAGS)]
if len(pos) < 2: die("needs <scene> <round> first (--help)")
scene, rnd = pos[0], pos[1]
beat = opt("--beat")
def box(name):
    v = opt(name); return tuple(int(x) for x in v.split(",")) if v else None
crop, closeup = box("--crop"), box("--closeup")
fps, cols, cell = float(opt("--fps", 12)), int(opt("--cols", 4)), int(opt("--cell", 480))
if not 0 < fps <= 60: die("--fps must be above 0 and at most 60 (the page ticks 60 times a second)")
W, H = (int(x) for x in opt("--size", "1920x1080").split("x"))
dump, ev = opt("--dump"), opt("--eval")
if opt("--root"):
    snap.nav.ROOT = str(Path(opt("--root")).resolve())   # serve that checkout read-only
if beat not in snap.BEAT_IDS:
    die(f"unknown beat {beat!r}; beats: {', '.join(snap.BEAT_IDS)}")
also = []
for a in opts("--also"):
    b, _, t = a.partition(":")
    if b not in snap.BEAT_IDS: die(f"unknown beat {b!r}; beats: {', '.join(snap.BEAT_IDS)}")
    also.append((b, num(t, "--also " + a)))
at, ab = opt("--at"), None
if at is not None: at = [num(x, "--at") for x in at.split(",")]
elif opt("--t") is not None:
    ab = opt("--t").split(",")
    if len(ab) != 2: die("--t takes two times: a,b")
    ab = num(ab[0], "--t"), num(ab[1], "--t")
    if ab[1] < ab[0]: die(f"--t {ab[0]:g},{ab[1]:g}: the second time is before the first")
out = ROOT / "snapshots" / "cshot" / scene / f"r{rnd}"
WHERE = "Gen.BEATS[Gen.beat].id + ' ' + Gen.local.toFixed(2) + 's'"

def load(browser, base, bid):
    page = snap.genesis_page(browser, base)
    page.set_viewport_size({"width": W, "height": H})
    page.add_init_script("Math.random = () => 0.5")
    page.goto(f"{base}/?genesis=1&gbeat={bid}")
    page.wait_for_load_state("load")
    snap.press_gate(page, 0)
    snap.settle(page, 120)
    page._at = page.evaluate("Gen.local")          # seconds stepped since the beat began
    return page, page.evaluate("Gen.BEATS.map(b => [b.id, b.dur])")

def span(durs, bid):
    """(the beat's own length, seconds from its start to the end of the cutscene)."""
    k = [b for b, _ in durs].index(bid)
    return durs[k][1], sum(d for _, d in durs[k:])

def check(bid, end, ts):
    """Refuse a time outside the cutscene; return the times sorted, the very end pulled in 0.05 s."""
    bad = [t for t in ts if not 0 <= t <= end]
    if bad: die(f"time {bad[0]:g} s is outside the cutscene from beat {bid} (0 to {end:.2f} s)")
    return sorted({min(t, max(0, end - 0.05)) for t in ts})   # at the very end the cutscene has closed

def shoot(page, t, name):
    """Step to t s after the beat's start (17 ms before, then one 17 ms tick), then screenshot.
    Returns the file and where the page really is (beat id, seconds into it)."""
    ms = max(0, round((t - page._at) * 1000) - 17)
    if ms: page.clock.run_for(ms)
    page.clock.run_for(17)
    page._at += (ms + 17) / 1000
    f = out / "frames" / name
    page.screenshot(path=str(f), animations="disabled", caret="hide")
    return f, page.evaluate(WHERE)

t0 = time.time()
frames, extra, data = [], [], []     # (label, path)
httpd, base = snap.nav.start_server()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(args=snap.CHROME)
        page, durs = load(browser, base, beat)
        dur, end = span(durs, beat)
        if at is not None: times = at
        else:
            a, b = ab or (0, max(0, dur - 0.05))                      # whole beat: stop inside it
            times = [a + k / fps for k in range(int((b - a) * fps + 1e-9) + 1)]   # never past b
        times = check(beat, end, times)                  # every time is checked before any stepping
        also = [(b, check(b, span(durs, b)[1], [t])[0]) for b, t in also]
        if ev: page.evaluate(ev)
        for old in ("sheet.png", "closeup.png", "data.json", "clip.webm"): (out / old).unlink(missing_ok=True)
        shutil.rmtree(out / "frames", ignore_errors=True)
        (out / "frames").mkdir(parents=True)
        for t in times:
            f, where = shoot(page, t, f"f_{round(t * 60):04d}.png")
            frames.append((f"{t:.2f} {where}", f))
            if dump: data.append({"t": round(t, 4), "at": round(page._at, 4), "value": page.evaluate(dump)})
        for b, t in also:
            pg, _ = load(browser, base, b)
            if ev: pg.evaluate(ev)
            f, where = shoot(pg, t, f"f_{b}_{round(t * 60):04d}.png")
            extra.append((where, f))
        errs = list(snap.ERRORS)
        snap.close_shared(); browser.close()
finally:
    httpd.shutdown()
if errs:
    die("console errors:\n" + "\n".join(str(e) for e in errs))

written = []
def sheet(box_, name):
    cells = []
    for label, f in frames + extra:
        im = Image.open(f).convert("RGB")
        if box_: im = im.crop(box_)
        cells.append((label, im.resize((cell, max(1, round(im.height * cell / im.width))), Image.LANCZOS)))
    th = cells[0][1].height + 14; rows = (len(cells) + cols - 1) // cols
    sh = Image.new("RGB", (cols * cell, rows * th), (20, 20, 20)); d = ImageDraw.Draw(sh)
    for k, (label, im) in enumerate(cells):
        x, y = (k % cols) * cell, (k // cols) * th
        sh.paste(im, (x, y + 14)); d.text((x + 3, y + 1), label, fill=(255, 220, 120))
    sh.save(out / name); written.append(out / name)
sheet(crop, "sheet.png")
if closeup: sheet(closeup, "closeup.png")
if dump:
    (out / "data.json").write_text(json.dumps(data), encoding="utf-8"); written.append(out / "data.json")
if "--clip" in argv:
    ff = shutil.which("ffmpeg")
    if not ff:
        try:
            import imageio_ffmpeg; ff = imageio_ffmpeg.get_ffmpeg_exe()
        except Exception:
            die("ffmpeg is missing (no ffmpeg on PATH, no imageio_ffmpeg)")
    lst = out / "clip.txt"
    lst.write_text("".join(f"file 'frames/{f.name}'\nduration {1 / fps:.5f}\n" for _, f in frames), encoding="utf-8")
    vf = ["crop=%d:%d:%d:%d" % (crop[2] - crop[0], crop[3] - crop[1], crop[0], crop[1])] if crop else []
    vf.append("crop=trunc(iw/2)*2:trunc(ih/2)*2")
    r = subprocess.run([ff, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-vf", ",".join(vf),
                        "-r", str(fps), "-c:v", "libvpx-vp9", "-pix_fmt", "yuv420p", str(out / "clip.webm")], capture_output=True, text=True)
    lst.unlink()
    if r.returncode: die("ffmpeg failed: " + r.stderr[-300:])
    written.append(out / "clip.webm")
print(out / "frames", f"({len(frames) + len(extra)} png)")
for w in written: print(w)
print(f"cshot: {len(frames) + len(extra)} frames in {time.time() - t0:.1f} s")
