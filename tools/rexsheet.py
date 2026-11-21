"""Pose sheet of Rex (js/genesis/genesis-duo.js): every pose drawn on its own, and its limb bone lengths measured.
usage: py -3 tools/rexsheet.py <run> [--mix a,b] [--venom N] [--cool N]
Writes snapshots/rexsheet/<run>/poses.png: one labelled cell per pose, Rex whole on a ground line, facing west,
one scale for every cell (the largest pose sets it), each cell fitted so no joint is cropped. --mix a,b adds a row of 5 blends a->b (mix 0, .25, .5, .75, 1). --venom / --cool (0..1)
apply to every cell. Prints per pose and blend step each limb part's two bone lengths as a ratio of the stand
pose's, then `MAX LENGTH DEVIATION: <x>% (<part> in <pose>)`. Also one line per pose: low, floorGap, hand/foot ends and core in units of h (floor 0, up +, x forward). Joints come from GenDuo.rexJoints (read-only).
Exit 1 on a console error.
"""
import sys, base64, importlib.util
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("nav", ROOT / "tools" / "nav-flows.test.py")
nav = importlib.util.module_from_spec(spec); spec.loader.exec_module(nav)
from playwright.sync_api import sync_playwright

args = sys.argv[1:]
def take(flag):
    if flag in args:
        i = args.index(flag); v = args[i + 1]; del args[i:i + 2]; return v
rz = take("--raise"); mix = take("--mix"); venom = take("--venom"); cool = take("--cool")
if not args: print(__doc__); sys.exit(1)
out = ROOT / "snapshots" / "rexsheet" / args[0]; out.mkdir(parents=True, exist_ok=True)
FILES = ["js/lib/util.js", "js/lib/paint.js", "js/genesis/genesis-titanfight.js", "js/genesis/genesis-state.js", "js/genesis/genesis-paint.js", "js/genesis/genesis-duo.js"]
POSES = ["stand", "reach", "slap", "grip", "dead", "dive", "curl", "recoil", "crawl", "crouch", "pry", "clutch", "kneel", "leap", "prone", "crawlReach", "crawlPlant", "crawlPull", "lowCurl"]
mixp = mix.split(",") if mix else None
if mixp and (len(mixp) != 2 or any(m not in POSES for m in mixp)): print("--mix wants two of", ",".join(POSES)); sys.exit(1)

JS = """
(cfg) => {
  const CW = 380, CH = 420, COLS = 3, D = GenDuo, POSES = cfg.poses;
  const BN = ["chest", "waist", "collar", "capB", "capF", "upB", "upF", "foreB", "foreF", "legB", "legF", "footB", "footF"];
  const base = { head: true, face: -1 };
  if (cfg.venom != null) base.venom = cfg.venom;
  if (cfg.cool != null) base.cool = cfg.cool;
  const cells = POSES.map((p) => ({ name: p, o: Object.assign({}, base, { pose: p }), j: D.rexJoints({ pose: p, raise: cfg.raise }) }));
  if (cfg.mix) [0, 0.25, 0.5, 0.75, 1].forEach((m) => cells.push({ name: cfg.mix[0] + ">" + cfg.mix[1] + " " + m, o: Object.assign({}, base, { pose: cfg.mix[0], pose2: cfg.mix[1], mix: m }), j: D.rexJoints({ pose: cfg.mix[0], pose2: cfg.mix[1], mix: m }), mixRow: true }));
  const rows = Math.ceil(POSES.length / COLS) + (cfg.mix ? 1 : 0);
  const c = document.createElement("canvas"); c.width = CW * COLS; c.height = CH * rows;
  const g = c.getContext("2d"); g.fillStyle = "#0d1114"; g.fillRect(0, 0, c.width, c.height);
  g.font = "15px sans-serif";
  const LEAN = (D.rexAnchors(0, 0, 1, { pose: "stand", face: 1 }, {}).collar.x - 0.001) / 0.89, MG = 0.1, TOP = 30;
  const FJ = ["chest", "waist", "collar", "capB", "capF", "upB", "upF", "foreB", "foreF", "legB", "legF", "footB", "footF"];
  cells.forEach((cl) => {
    const pts = [[0, 0]], hd = D.rexAnchors(0, 0, 1, cl.o, {}).head;
    pts.push([-hd.x, hd.y - 0.12]);
    FJ.forEach((b) => { for (let k = 0; k < 6; k += 2) pts.push([-(cl.j[b][k] - LEAN * cl.j[b][k + 1]), cl.j[b][k + 1]]); });
    cl.bx = [Math.min(...pts.map((q) => q[0])) - MG, Math.max(...pts.map((q) => q[0])) + MG, Math.min(...pts.map((q) => q[1])) - MG, Math.max(...pts.map((q) => q[1])) + MG];
  });
  const H = Math.min(...cells.map((cl) => Math.min((CW - 16) / (cl.bx[1] - cl.bx[0]), (CH - TOP - 8) / (cl.bx[3] - cl.bx[2]))));
  let n = 0;
  cells.forEach((cl) => {
    let col, row;
    if (cl.mixRow) { col = n - POSES.length; row = Math.ceil(POSES.length / COLS); } else { col = n % COLS; row = (n / COLS) | 0; }
    n++;
    const x0 = col * CW, y0 = row * CH;
    g.strokeStyle = "#2c3a44"; g.lineWidth = 1; g.strokeRect(x0 + 0.5, y0 + 0.5, CW - 1, CH - 1);
    const GY = TOP + (CH - TOP - (cl.bx[3] - cl.bx[2]) * H) / 2 - cl.bx[2] * H, AX = x0 + CW / 2 - (cl.bx[0] + cl.bx[1]) / 2 * H;
    g.strokeStyle = "#9a7a4a"; g.beginPath(); g.moveTo(x0 + 8, y0 + GY + 0.5); g.lineTo(x0 + CW - 8, y0 + GY + 0.5); g.stroke();
    g.save(); g.beginPath(); g.rect(x0 + 1, y0 + 1, CW - 2, CH - 2); g.clip();
    D.drawRex(g, AX, y0 + GY, H, cl.o); D.drawRexFingers(g, AX, y0 + GY, H, cl.o);
    g.restore();
    g.fillStyle = "#c8d2d8"; g.textAlign = "left"; g.fillText(cl.name, x0 + 10, y0 + 22);
  });
  const len = (a, k) => Math.hypot(a[k + 2] - a[k], a[k + 3] - a[k + 1]);
  const st = D.rexJoints({ pose: "stand" });
  const rep = cells.map((cl) => ({ name: cl.name, parts: BN.map((b) => [b, len(cl.j[b], 0) / len(st[b], 0), len(cl.j[b], 2) / len(st[b], 2)]) }));
  const e = (cl, b) => [cl.j[b][4], -cl.j[b][5]].map((v) => +v.toFixed(2));
  const lines = cells.map((cl) => {
    let low = Infinity, ins = true;
    FJ.forEach((b) => { for (let k = 1; k < 6; k += 2) low = Math.min(low, -cl.j[b][k]); });
    return { name: cl.name, low: low, hB: e(cl, "foreB"), hF: e(cl, "foreF"), fB: e(cl, "footB"), fF: e(cl, "footF"), core: [cl.j.chest[2], -cl.j.chest[3]].map((v) => +v.toFixed(2)), bx: cl.bx.map((v) => +v.toFixed(2)) };
  });
  return { png: c.toDataURL("image/png"), rep: rep, lines: lines, scale: H };
}
"""

errors = []
httpd, base = nav.start_server()
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); page = b.new_page(viewport={"width": 1440, "height": 900})
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
        page.goto(f"{base}/404.html"); page.wait_for_load_state("load"); errors.clear()
        for f in FILES:
            page.add_script_tag(url=f"{base}/{f}")
            page.wait_for_timeout(50)
            if errors: print(f"FAIL loading {f}:"); [print("  ", e) for e in errors]; b.close(); sys.exit(1)
        r = page.evaluate(JS, {"poses": POSES, "mix": mixp, "venom": float(venom) if venom else None, "cool": float(cool) if cool else None, "raise": float(rz) if rz else None})
        page.wait_for_timeout(50)
        b.close()
finally:
    httpd.shutdown()

png = out / "poses.png"
png.write_bytes(base64.b64decode(r["png"].split(",", 1)[1])); print("wrote", png)
worst = (0.0, "-", "-")
pt = lambda v: f"({v[0]:.2f},{v[1]:.2f})"
for l in r["lines"]:
    print(f"{l['name']}  low={l['low']:.2f}  floorGap={l['low']:.2f}  handB={pt(l['hB'])}  handF={pt(l['hF'])}  footB={pt(l['fB'])}  footF={pt(l['fF'])}  core={pt(l['core'])}")
print(f"fit scale {r['scale']:.1f} px per h; every joint inside its cell (box incl. margin fits by construction)")
for cell in r["rep"]:
    print(cell["name"] + ": " + "  ".join(f"{n} {a:.3f}/{c:.3f}" for n, a, c in cell["parts"]))
    for n, a, c in cell["parts"]:
        for v in (a, c):
            if abs(v - 1) * 100 > worst[0]: worst = (abs(v - 1) * 100, n, cell["name"])
print(f"MAX LENGTH DEVIATION: {worst[0]:.1f}% ({worst[1]} in {worst[2]})")
if errors: print("FAIL console errors:"); [print("  ", e) for e in errors]; sys.exit(1)
