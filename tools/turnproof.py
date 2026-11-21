"""Proof video of the baked ship turn (js/ship/voidship-turnframes.js), ship only, at true size.
usage: py -3 tools/turnproof.py [--out <dir>] [--dpr 1]
Writes turn-normal.webm (0.72 s U-turns, as in game), turn-quarter.webm (quarter speed) and turn-sheet.png
to <dir> (default: <system temp>/turnproof), never inside the repo. Prints one line of numbers.
Exit code 1 on any page or console error, or a missing/empty output file.
"""
import sys, re, base64, shutil, tempfile, subprocess, importlib.util
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("nav", ROOT / "tools" / "nav-flows.test.py")
nav = importlib.util.module_from_spec(spec); spec.loader.exec_module(nav)
from playwright.sync_api import sync_playwright

args = sys.argv[1:]
def take(flag, default):
    if flag in args:
        i = args.index(flag); v = args[i + 1]; del args[i:i + 2]; return v
    return default
GAME = "--game" in args
if GAME: args.remove("--game")
out = Path(take("--out", str(Path(tempfile.gettempdir()) / "turnproof")))
dpr = float(take("--dpr", "1"))
if dpr > 1:
    print("turnproof: --dpr above 1 is refused: the videos are 960x540 and one sprite pixel must be one video pixel"); sys.exit(2)
out.mkdir(parents=True, exist_ok=True)
FILES = ["js/lib/util.js", "js/lib/paint.js", "js/ship/voidship-art.js", "js/ship/voidship-prow.js",
         "js/ship/voidship-hull.js", "js/ship/voidship-turnframes.js"]
BG = "#0b0d12"; L = 96
errors = []

def open_page(browser, base, **ctx_args):
    ctx = browser.new_context(viewport={"width": 960, "height": 540}, device_scale_factor=dpr, **ctx_args)
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
    # a stage page served from memory: dark, one canvas, no text, so the first recorded frame is the stage
    page.route("**/stage.html", lambda r: r.fulfill(content_type="text/html", body=
        f"<!doctype html><body style='margin:0;overflow:hidden;background:{BG}'><canvas id=cv width=960 height=540 style='display:block'></canvas>"))
    page.goto(f"{base}/stage.html"); page.wait_for_load_state("load")
    for f in FILES:
        page.add_script_tag(url=f"{base}/{f}")
    page.wait_for_timeout(100)
    return ctx, page

# draws frameAt(set, yaw) about the pivot (the sprite origin) at (cx, cy), 1 sprite px = 1 device px
DRAW = """
window.drawPose = function (g, set, yaw, cx, cy) {
  const f = VoidshipTurnFrames.frameAt(set, yaw), k = 1 / DPR;
  g.save(); g.translate(cx, cy); if (f.mirror) g.scale(-1, 1);
  g.drawImage(f.canvas, -set.ax * k, -set.ay * k, set.w * k, set.h * k); g.restore();
};
"""

def record(browser, base, name, k):
    vd = out / ("_vid_" + name); shutil.rmtree(vd, ignore_errors=True)
    ctx, page = open_page(browser, base, record_video_dir=str(vd), record_video_size={"width": 960, "height": 540})
    page.evaluate("() => { window.DPR = " + str(dpr) + "; " + DRAW + " }")
    page.evaluate("""([L, dpr, k]) => new Promise(res => {
      const set = VoidshipTurnFrames.bake(L, dpr), g = document.getElementById('cv').getContext('2d');
      const T = 0.72 * k, seg = [[0.6, 0, 0], [T, 0, 180], [0.6, 180, 180], [T, 180, 0], [0.6, 0, 0]];
      const total = seg.reduce((a, s) => a + s[0], 0);
      const t0 = performance.now();
      (function tick() {
        let t = (performance.now() - t0) / 1000, yaw = 0;
        if (t >= total) { t = total; }
        let acc = 0;
        for (const s of seg) { if (t <= acc + s[0] || s === seg[seg.length - 1]) { yaw = s[1] + (s[2] - s[1]) * Math.min(1, (t - acc) / s[0]); break; } acc += s[0]; }
        g.fillStyle = '#0b0d12'; g.fillRect(0, 0, 960, 540);
        drawPose(g, set, yaw, 480, 270);
        if (performance.now() - t0 >= total * 1000 + 200) res(); else requestAnimationFrame(tick);
      })();
    })""", [L, dpr, k])
    page.wait_for_timeout(300)
    vpath = page.video.path()
    ctx.close()
    dst = out / name
    shutil.copyfile(vpath, dst); shutil.rmtree(vd, ignore_errors=True)
    return dst

# --game: the real bridge, the ship steered by a held press through a U-turn each way; a per-frame recorder in the page crops the
# bridge canvas around the ship (true size, no scaling) and notes yaw and ship.y
REC = """
() => {
  const cv = document.getElementById('bridge-canvas'), B = window.Bridge, HX = 170, HY = 90;
  const R = window.__rec = { turns: [], cur: null, prev: null, last: null, pre: null, ups: 0, downs: 0, lastYaw: 0 };
  const grab = (s) => { const k = cv.width / B.W, c = document.createElement('canvas'); c.width = 2 * HX; c.height = 2 * HY;
    const g = c.getContext('2d'); g.drawImage(cv, Math.round(B.W / 2 * k) - HX, Math.round(s.y * k) - HY, 2 * HX, 2 * HY, 0, 0, 2 * HX, 2 * HY);
    return g.getImageData(0, 0, 2 * HX, 2 * HY); };
  (function tick() {
    const s = B.ship;
    if (s) {
      const turning = s.yaw !== s.yawTarget, f = { yaw: s.yaw, y: s.y, img: grab(s) };
      if (turning && !R.cur) { R.cur = { dir: s.yawTarget > s.yaw ? 1 : -1, pre: R.last, frames: [] }; }
      if (R.cur) { R.cur.frames.push(f);
        if (!turning) { R.cur.post = f; R.turns.push(R.cur); R.cur = null; } }
      R.last = f;
    }
    requestAnimationFrame(tick);
  })();
}
"""

def game(browser, base):
    import time
    vd = out / "_vid_game"; shutil.rmtree(vd, ignore_errors=True)
    ctx = browser.new_context(viewport=nav.DESKTOP, device_scale_factor=1, record_video_dir=str(vd), record_video_size=nav.DESKTOP)
    ctx.set_default_timeout(8000); ctx.add_init_script(nav.INIT)
    t0 = time.time(); page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
    page.goto(base + "/"); nav.pass_gate(page, 1500)
    page.wait_for_function("window.Bridge && Bridge.ship")
    page.evaluate(REC)
    t_start = time.time() - t0
    y0 = page.evaluate("Bridge.ship.y")
    W = nav.DESKTOP["width"]
    page.mouse.move(W * 0.85, y0); page.mouse.down()
    page.wait_for_timeout(1200)
    for _ in range(3):   # left, right, left, right: each flips the ship
        for tx, want in ((W * 0.12, "Math.PI"), (W * 0.88, "0")):
            page.mouse.move(tx, y0, steps=4)
            page.wait_for_function(f"Bridge.ship.yaw === {want}", timeout=6000)
            page.wait_for_timeout(700)
    page.mouse.up(); page.wait_for_timeout(500)
    t_end = time.time() - t0
    res = page.evaluate("""() => { const R = __rec; const t = R.turns; return t.map(q => ({ dir: q.dir, n: q.frames.length,
      pre: q.pre ? q.pre.y : null, y: q.frames.map(f => f.y), yaw: q.frames.map(f => f.yaw), post: q.post.y })); }""")
    ups = [i for i, q in enumerate(res) if q["dir"] > 0]; downs = [i for i, q in enumerate(res) if q["dir"] < 0]
    sheet_png = None; repeats = total = 0
    if ups:
        sh = page.evaluate("""(i) => { const q = __rec.turns[i], fr = q.pre ? [q.pre].concat(q.frames) : q.frames, HX = 170, HY = 90;
          let rep = 0; for (let k = 1; k < fr.length; k++) { const a = fr[k - 1].img.data, b = fr[k].img.data; let same = true;
            for (let j = 0; j < a.length; j++) if (a[j] !== b[j]) { same = false; break; } if (same) rep++; }
          const cols = 6, rows = Math.ceil(fr.length / cols), c = document.createElement('canvas'); c.width = cols * 2 * HX; c.height = rows * 2 * HY;
          const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height); g.font = '11px sans-serif';
          fr.forEach((f, k) => { const x = (k % cols) * 2 * HX, y = Math.floor(k / cols) * 2 * HY; g.putImageData(f.img, x, y);
            g.strokeStyle = '#333'; g.strokeRect(x + .5, y + .5, 2 * HX - 1, 2 * HY - 1);
            g.fillStyle = '#8a8f98'; g.fillText(Math.round(f.yaw * 180 / Math.PI) + '\\u00b0', x + 4, y + 12); });
          return { png: c.toDataURL('image/png'), n: fr.length, rep }; }""", ups[0])
        sheet_png = sh["png"]; repeats = sh["rep"]; total = sh["n"]
    vpath = page.video.path(); ctx.close()
    dst = out / "game-turn.webm"; shutil.copyfile(vpath, dst); shutil.rmtree(vd, ignore_errors=True)
    return dst, sheet_png, repeats, total, res, ups, downs, t_start, t_end

httpd, base = nav.start_server()
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        if GAME:
            gv, gpng, rep, tot, tr, ups, downs, ts, te = game(b, base)
            b.close()
            FF = shutil.which("ffmpeg")
            if not FF: print("turnproof: ffmpeg not on PATH"); sys.exit(2)
            # keep from 1 s before the first press to the end of the last turn (the gate and the load are cut)
            tmp = gv.with_name("_trim_game.webm")
            subprocess.run([FF, "-y", "-ss", f"{max(0, ts - 0.3):.2f}", "-i", str(gv), "-to", f"{te - ts + 0.3:.2f}", "-an", "-b:v", "0", "-crf", "8", str(tmp)], capture_output=True)
            if tmp.exists() and tmp.stat().st_size: tmp.replace(gv)
            hdr = subprocess.run([FF, "-i", str(gv)], capture_output=True, text=True).stderr
            vf = len(subprocess.run([FF, "-i", str(gv), "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout) // (nav.DESKTOP["width"] * nav.DESKTOP["height"])
            sheet = out / "game-sheet.png"
            if gpng: sheet.write_bytes(base64.b64decode(gpng.split(",")[1]))
            bad = list(errors)
            if not ups or not downs: bad.append(f"the ship did not turn both ways (turns seen: {len(tr)}, up {len(ups)}, down {len(downs)})")
            if tot < 16: bad.append(f"sheet has {tot} poses, need at least 16")
            u = tr[ups[0]] if ups else None
            j0 = abs(u["y"][0] - u["pre"]) if u and u["pre"] is not None else -1
            j1 = abs(u["post"] - u["y"][-2]) if u and len(u["y"]) > 1 else -1
            print(f"game: video-frames={vf} sheet-poses={tot} neighbour-repeats={rep} turns={len(tr)} (up {len(ups)}, down {len(downs)}) "
                  f"turn-frames={[q['n'] for q in tr]} ship-y-jump-at-start={j0:.2f}px ship-y-jump-at-end={j1:.2f}px (ship x is fixed at screen centre) console-errors={len(errors)}")
            print(f"video {gv}\nsheet {sheet}")
            if bad: print("FAIL"); [print("  ", e) for e in bad]; sys.exit(1)
            sys.exit(0)
        # numbers and the sheet, on a page without video
        ctx, page = open_page(b, base)
        page.evaluate("() => { window.DPR = " + str(dpr) + "; " + DRAW + " }")
        res = page.evaluate("""([L, dpr]) => {
          const set = VoidshipTurnFrames.bake(L, dpr), D = VoidshipTurnFrames.depth(L, dpr), w = set.w, h = set.h;
          const px = (draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g); return g.getImageData(0, 0, w, h).data; };
          const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i+1] !== b[i+1] || a[i+2] !== b[i+2] || a[i+3] !== b[i+3]) n++; return n; };
          const spr = px(g => g.drawImage(D.sprite, 0, 0));
          const f0 = px(g => g.drawImage(set.frames[0], 0, 0));
          const sprM = px(g => { g.translate(set.ax, 0); g.scale(-1, 1); g.drawImage(D.sprite, -set.ax, 0); });
          const last = px(g => { g.translate(set.ax, 0); const f = VoidshipTurnFrames.frameAt(set, 180); if (f.mirror) g.scale(-1, 1); g.drawImage(f.canvas, -set.ax, 0); });
          // sheet: 0 to 90 in 9 degree steps, then the mirrored frames back to 180
          const yaws = []; for (let y = 0; y <= 180; y += 9) yaws.push(y);
          const cols = 5, pad = 12, hx = Math.max(set.ax, w - set.ax) / dpr, cw = Math.ceil(2 * hx) + pad, ch = Math.ceil(h / dpr) + pad + 12, rows = Math.ceil(yaws.length / cols);
          // cell box: x from the cell edge, y from the cell top to the label line; pivot at hx + pad/2 across, ay down
          let outside = 0;
          yaws.forEach(y => { const m = 80, c = document.createElement('canvas'); c.width = cw + 2 * m; c.height = ch + 2 * m; const q = c.getContext('2d');
            drawPose(q, set, y, m + pad / 2 + hx, m + pad / 2 + set.ay / dpr);
            const d = q.getImageData(0, 0, c.width, c.height).data;
            for (let j = 0; j < c.height; j++) for (let i = 0; i < c.width; i++) if (d[(j * c.width + i) * 4 + 3] > 0 && (i < m || i >= m + cw || j < m || j >= m + ch - 12)) outside++; });
          const cv = document.getElementById('cv'); cv.width = cols * cw * dpr; cv.height = rows * ch * dpr; cv.style.width = cols * cw + 'px';
          const g = cv.getContext('2d'); g.scale(dpr, dpr);
          g.fillStyle = '#0b0d12'; g.fillRect(0, 0, cols * cw, rows * ch); g.font = '10px sans-serif'; g.fillStyle = '#8a8f98';
          yaws.forEach((y, i) => { const x = (i % cols) * cw, yy = Math.floor(i / cols) * ch;
            drawPose(g, set, y, x + pad / 2 + hx, yy + pad / 2 + set.ay / dpr); g.fillText(y + '\\u00b0', x + pad / 2, yy + ch - 4); });
          // rest sprite on the stage colour, rgb, over the sprite's box (as the video shows it at 480,270)
          const rc = document.createElement('canvas'); rc.width = w; rc.height = h; const rg = rc.getContext('2d');
          rg.fillStyle = '#0b0d12'; rg.fillRect(0, 0, w, h); rg.drawImage(D.sprite, 0, 0);
          const rd = rg.getImageData(0, 0, w, h).data, rest = [], bgc = [11, 13, 18]; let vis = 0;
          for (let i = 0; i < rd.length; i += 4) { rest.push(rd[i], rd[i+1], rd[i+2]); if (Math.max(Math.abs(rd[i]-11), Math.abs(rd[i+1]-13), Math.abs(rd[i+2]-18)) > 24) vis++; }
          return { rest, vis, n: set.n, w, h, ms: set.ms, mb: set.bytes / 1048576, d0: diff(f0, spr), d180: diff(last, sprM), outside, ax: set.ax, ay: set.ay, sheet: cv.toDataURL('image/png') };
        }""", [L, dpr])
        sheet = out / "turn-sheet.png"; sheet.write_bytes(base64.b64decode(res["sheet"].split(",")[1]))
        ctx.close()
        vn = record(b, base, "turn-normal.webm", 1)
        vq = record(b, base, "turn-quarter.webm", 4)
        b.close()
finally:
    httpd.shutdown()

# needs a full ffmpeg on PATH (Playwright's bundled one cannot write raw frames)
FF = shutil.which("ffmpeg")
if not FF: print("turnproof: ffmpeg not on PATH, needed to measure the videos"); sys.exit(2)
BX0, BY0 = 480 - res["ax"], 270 - res["ay"]   # the rest sprite's box in the video
def trim_empty(f):
    """Cut the leading frames of the stage before the ship is drawn (Playwright records from page open): the first kept frame is the
    first (of the first 40) whose ship box matches the rest sprite (rgb, tolerance 24, under 10% of its visible pixels off), which also
    skips the encoder's colour-starved opening frames. Re-encodes in place; returns the frames cut (-1 if none matches)."""
    fs = 960 * 540 * 3; lead = None; W = res["w"]; R = res["rest"]
    raw = subprocess.run([FF, "-i", str(f), "-fps_mode", "passthrough", "-frames:v", "40", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    for k in range(len(raw) // fs):
        fr = raw[k * fs:(k + 1) * fs]; c = 0
        for j in range(res["h"]):
            o = ((BY0 + j) * 960 + BX0) * 3; row = fr[o:o + W * 3]; rr = R[j * W * 3:(j + 1) * W * 3]
            c += sum(1 for i in range(0, W * 3, 3) if max(abs(row[i] - rr[i]), abs(row[i+1] - rr[i+1]), abs(row[i+2] - rr[i+2])) > 24)
        if c < 0.1 * res["vis"]: lead = k; break
    if lead is None: return -1
    if lead:
        tmp = f.with_name("_trim_" + f.name)
        r = subprocess.run([FF, "-y", "-i", str(f), "-vf", f"trim=start_frame={lead},setpts=PTS-STARTPTS", "-an", "-b:v", "0", "-crf", "4", str(tmp)], capture_output=True)
        if r.returncode or not tmp.exists(): return -1
        tmp.replace(f)
    return lead
def measure(f):
    """(fps, frame count, stray first-frame pixels, ship first-frame pixels, leading frames cut) read from the webm: fps from its header,
    count by decoding, stray = first-frame pixels differing from the stage colour by more than 24 outside the rest sprite's box (+3 px)
    about the pivot at 480,270, ship = pixels inside the box differing from the rest sprite on the stage by more than 24 (video compression)"""
    lead = trim_empty(f)
    hdr = subprocess.run([FF, "-i", str(f)], capture_output=True, text=True).stderr
    m = re.search(r"([\d.]+) fps", hdr); fps = float(m.group(1)) if m else 0
    n = len(subprocess.run([FF, "-i", str(f), "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout) // (960 * 540)
    raw = subprocess.run([FF, "-i", str(f), "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    ship = 0
    for j in range(res["h"]):
        for i in range(res["w"]):
            o = ((BY0 + j) * 960 + BX0 + i) * 3; r = (j * res["w"] + i) * 3
            if max(abs(raw[o + c] - res["rest"][r + c]) for c in range(3)) > 24: ship += 1
    bg = (0x0b, 0x0d, 0x12); stray = 0
    for j in range(540):
        row = raw[j * 960 * 3:(j + 1) * 960 * 3]
        for i in range(960):
            if -res["ax"] - 3 <= i - 480 <= res["w"] - res["ax"] + 3 and -res["ay"] - 3 <= j - 270 <= res["h"] - res["ay"] + 3: continue
            if max(abs(row[i*3+c] - bg[c]) for c in range(3)) > 24: stray += 1
    return fps, n, stray, ship, lead
mn, mq = measure(vn), measure(vq)

bad = list(errors)
# the ship counts as present when under 10% of the rest sprite's visible pixels differ
for nm, mm in (("normal", mn), ("quarter", mq)):
    if mm[4] < 0 or mm[3] > 0.1 * res["vis"]: bad.append(f"ship missing from frame 1 of {nm}: {mm[3]}px differ from the rest sprite (visible {res['vis']}, lead {mm[4]})")
for f in (vn, vq, sheet):
    if not f.exists() or f.stat().st_size == 0: bad.append(f"missing or empty: {f}")
print(f"n={res['n']} frame={res['w']}x{res['h']} ms={res['ms']} bytes={res['mb']:.2f}MB frame0-vs-sprite={res['d0']}px "
      f"last-pose-vs-mirrored-sprite={res['d180']}px pivot={res['ax']},{res['ay']} sheet-px-outside-cells={res['outside']} "
      f"normal={mn[0]}fps/{mn[1]}frames quarter={mq[0]}fps/{mq[1]}frames first-frame-stray-px={mn[2]},{mq[2]} "
      f"first-frame-ship-px-off-rest={mn[3]},{mq[3]} (tol 24/channel, of {res["vis"]} visible, max {int(0.1 * res["vis"])}) leading-empty-frames-cut={mn[4]},{mq[4]}")
print(f"video {vn}\nvideo {vq}\nsheet {sheet}")
if bad:
    print("FAIL"); [print("  ", e) for e in bad]; sys.exit(1)
