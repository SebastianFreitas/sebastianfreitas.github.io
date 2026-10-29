"""Labelled contact sheets of every GenCeilKinds kind, fully grown, on the washed ceiling colour.
usage: py -3 tools/ceilsheet.py <out_dir> [--family plant] [--seed n]
Writes <out_dir>/<family>.png per family (plant, metal, cloud, odd) and <out_dir>/all-silhouettes.png
(every kind flat dark on white, one row per family). Exit 1 on a console error or a blank cell.
Loads the page JS the way tools/jscheck.py does (same base files, nav-flows start_server).
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
fam = take("--family"); seed = int(take("--seed") or 1)
if not args: print(__doc__); sys.exit(1)
out = Path(args[0]); out.mkdir(parents=True, exist_ok=True)
FAMS = [fam] if fam else ["plant", "metal", "cloud", "odd"]
FILES = ["js/lib/util.js", "js/lib/paint.js", "js/genesis/genesis-state.js", "js/genesis/genesis-paint.js",
         "js/genesis/genesis-eldpal.js", "js/genesis/genesis-ceilkinds.js"] + \
        [f"js/genesis/genesis-ceilkinds-{f}.js" for f in ["plant", "metal", "cloud", "odd"]] + \
        ["js/genesis/genesis-ceilclouds.js"]

JS = """
([fams, seed]) => {
  const K = GenCeilKinds, pal = K.palette(), BG = GenEldPal.CEIL[2];
  const CW = 220, CH = 300, H = 900, COLS = 5, blank = [], counts = {};
  const hash = pal.hash;
  function obj(kd, i) {
    const s = hash((seed * 40 + i) * 7.7 + 2.9) * 100;
    const o = { kd: kd, i: i, len: (kd.len[0] + kd.len[1]) / 2, n: kd.n[0], w: hash(s + 31), ph: hash(s + 32) * 6.3, amp: 0.5 + hash(s + 33) * 0.9, dir: hash(s + 34) < 0.5 ? 1 : -1, th: 0.6 };
    o.rnd = (j) => hash(s + j);
    return o;
  }
  // draw one kind into a fresh CWxCH canvas (transparent), root at top centre
  function cell(kd, i) {
    const c = document.createElement("canvas"); c.width = CW; c.height = CH;
    const g = c.getContext("2d");
    kd.draw(g, obj(kd, i), CW / 2, 12, H, 1, 0, 1, pal);
    return c;
  }
  function inked(c) {
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 20) n++;
    return n;
  }
  function label(g, x, y, text, col) { g.font = "13px sans-serif"; g.textAlign = "center"; g.fillStyle = col; g.fillText(text, x, y); }
  const res = {};
  const all = [];
  for (const f of fams) {
    const ks = K.list().filter((k) => k.family === f);
    counts[f] = ks.length;
    const rows = Math.ceil(ks.length / COLS);
    const sheet = document.createElement("canvas"); sheet.width = CW * COLS; sheet.height = CH * rows;
    const g = sheet.getContext("2d");
    g.fillStyle = BG; g.fillRect(0, 0, sheet.width, sheet.height);
    ks.forEach((kd, i) => {
      const x = (i % COLS) * CW, y = Math.floor(i / COLS) * CH, c = cell(kd, i);
      if (inked(c) < 30) blank.push(f + ":" + kd.name);
      g.drawImage(c, x, y);
      g.strokeStyle = "rgba(0,0,0,0.12)"; g.strokeRect(x + 0.5, y + 0.5, CW - 1, CH - 1);
      label(g, x + CW / 2, y + CH - 10, (i + 1) + " " + kd.name, "#1c1f2e");
      all.push({ f: f, i: i, kd: kd, c: c });
    });
    res[f] = sheet.toDataURL("image/png");
  }
  // silhouettes: one row per family, half size
  const SW = CW / 2, SH = CH / 2, maxN = Math.max.apply(null, fams.map((f) => counts[f]));
  const sil = document.createElement("canvas"); sil.width = SW * maxN; sil.height = SH * fams.length;
  const sg = sil.getContext("2d");
  sg.fillStyle = "#fff"; sg.fillRect(0, 0, sil.width, sil.height);
  all.forEach((a) => {
    const c = a.c, g = c.getContext("2d"), im = g.getImageData(0, 0, CW, CH), d = im.data;
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] > 8) { d[i] = 26; d[i + 1] = 28; d[i + 2] = 38; d[i + 3] = 255; } else d[i + 3] = 0; }
    g.putImageData(im, 0, 0);
    const x = a.i * SW, y = fams.indexOf(a.f) * SH;
    sg.drawImage(c, x, y, SW, SH);
    label(sg, x + SW / 2, y + SH - 4, (a.i + 1) + " " + a.kd.name, "#555");
  });
  res.sil = sil.toDataURL("image/png");
  // clouds sheet: every GenCeilClouds kind with its anchors as dots; then the anchor-on-opaque-fill check
  const CK = GenCeilClouds.list(), KW = 260, KH = 200, KC = 5, krows = Math.ceil(CK.length / KC);
  const cs = document.createElement("canvas"); cs.width = KW * KC; cs.height = KH * krows;
  const cg = cs.getContext("2d");
  cg.fillStyle = "#7d8fa0"; cg.fillRect(0, 0, cs.width, cs.height);
  CK.forEach((k, i) => {
    const x = (i % KC) * KW, y = Math.floor(i / KC) * KH;
    k.draw(cg, x + 20, y + 10, 220, seed, 0);
    cg.fillStyle = "#ff4040";
    k.anchors(seed).forEach((a) => { cg.beginPath(); cg.arc(x + 20 + a.u * 220, y + 10 + a.v * 220 * k.aspect, 3, 0, 6.2832); cg.fill(); });
    label(cg, x + KW / 2, y + KH - 8, (i + 1) + " " + k.name, "#10141a");
  });
  res.clouds = cs.toDataURL("image/png");
  let cfail = 0, ctotal = 0;
  const tc = document.createElement("canvas"); tc.width = 240; tc.height = 240;
  const tg = tc.getContext("2d", { willReadFrequently: true });
  for (const k of CK) for (let sd = 1; sd <= 20; sd++) for (const tt of [0, 2, 5]) {
    tg.clearRect(0, 0, 240, 240); k.draw(tg, 10, 10, 200, sd, tt);
    if (k.anchors(sd).length < 2) cfail++;
    for (const a of k.anchors(sd)) {
      ctotal++;
      if (tg.getImageData(Math.round(10 + a.u * 200), Math.round(10 + a.v * 200 * k.aspect), 1, 1).data[3] !== 255) cfail++;
    }
  }
  return { res: res, counts: counts, blank: blank, cfail: cfail, ctotal: ctotal, ckinds: CK.length };
}
"""

errors = []
httpd, base = nav.start_server()
code = 0
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
        r = page.evaluate(JS, [FAMS, seed])
        page.wait_for_timeout(50)
        b.close()
finally:
    httpd.shutdown()

def save(name, url):
    path = out / name
    path.write_bytes(base64.b64decode(url.split(",", 1)[1])); print("wrote", path)
for f in FAMS: save(f + ".png", r["res"][f])
save("all-silhouettes.png", r["res"]["sil"])
save("clouds.png", r["res"]["clouds"])
print(f"clouds: {r['ckinds']} kinds, anchor checks {r['ctotal']}, failures {r['cfail']}")
if r["cfail"]: code = 1
for f in FAMS: print(f"{f}: {r['counts'][f]} kinds")
if errors: print("FAIL console errors:"); [print("  ", e) for e in errors]; code = 1
if r["blank"]: print("FAIL blank cells:", ", ".join(r["blank"])); code = 1
sys.exit(code)
