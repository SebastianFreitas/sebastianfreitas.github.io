/* genesis-rocktitans.js: the four rock titans at rest (plan rock-titans, phase 2), painted as tools/titansheet.py paints them.
   Old-one pieces around a rock mountain, colourless, held. LAYOUT is a literal copy of the approved sketch layout (ef65899). */
window.GenRockTitans = (function () {
  const G = window.Gen, FOOT = 0.64, TH = 40;
  const TINT = [6, 14, 30, 0.2];
  const FILT = "grayscale(1) brightness(0.23)";
  const Q = Math.PI / 2;
  function pcs(list, snaps) { return list.map((q, i) => ({ kind: q[0], m: q[1], dx: q[2], dy: q[3], rot: q[4], z: q[5], snap: snaps[i], cut: q[6] })); }
  const S5 = [1, 2, 3, 4, 5], S4 = [1, 2, 3, 4];
  const box = (u0, v0, u1, v1, d) => { d = (d || 0.06) * (v1 - v0); return [[u0, v0], [u1, v0 + d], [u1, v1], [u0, v1 - d]]; };
  const rk = (rock, x, dy, size, sx, sy, rot, front) => ({ rock: rock, x: x, dy: dy, size: size, sx: sx, sy: sy, rot: rot || 0, front: !!front });
  const tn = (x, dy, len, w, curl) => ({ x: x, dy: dy, len: len, w: w, curl: curl });
  const LAYOUT = {
    titans: [
      { family: "spires", rock: 0, root: -0.6, height: 0.48, core: { size: 0.09, dy: -0.36, rot: 0.3 },
        pieces: pcs([["gentleman", 1.1, 0.03, -0.08, -0.45, 5, [[0.05, 0.25], [0.3, 0.05], [0.5, 0.3], [0.38, 0.62], [0.12, 0.5]]], ["tower", 1.3, 0.06, -0.1, 0.3, 9, box(0, 0, 1, 0.38, 0)], ["needle", 2.4, -0.03, -0.23, 1.2, 8, box(0, 0, 0.5, 1)], ["prism", 1.5, 0.05, -0.2, 0.7, 10, [[0, 0.1], [0.55, 0], [0.8, 0.6], [0.1, 0.7]]], ["strider", 0.7, -0.01, -0.2, -0.5, 7, box(0, 0, 0.33, 1, 0.02)]], S5),
        filler: [], body: { mode: "grounded", rocks: [rk(2, -0.04, -0.08, 0.085, 1.3, 1.0, 0), rk(0, 0.05, -0.07, 0.08, 1.2, 1.0, 0.2), rk(3, -0.02, -0.2, 0.085, 1.4, 1.2, -0.15), rk(1, -0.06, -0.31, 0.07, 1.3, 1.2, -0.45), rk(2, 0.07, -0.27, 0.05, 1.3, 1.0, 0.7), rk(0, -0.05, -0.36, 0.05, 1.0, 1.2, -0.3)] } },
      { family: "rings", rock: 1, root: -0.2, height: 0.48, core: { size: 0.09, dy: -0.36, rot: -0.2 },
        pieces: pcs([["chime", 1.6, 0.0, -0.25, -0.9, 21, box(0, 0.5, 1, 1)], ["pearl", 1.8, -0.01, -0.25, -0.3, 19, box(0, 0, 0.55, 0.95, 0.02)], ["knot", 2, 0.02, -0.24, 0.9, 17, box(0, 0, 0.85, 0.8)], ["bundle", 2.5, 0.0, -0.24, 1.0, 8, box(0.45, 0, 1, 0.75)], ["swarmling", 1.8, 0.02, -0.21, -0.5, 22, box(0, 0, 0.78, 1, 0)]], S5),
        filler: [], body: { mode: "floating", rocks: [rk(2, -0.03, -0.26, 0.085, 1.3, 1.0, 0), rk(0, 0.04, -0.25, 0.08, 1.2, 1.0, 0.2), rk(3, 0.0, -0.34, 0.075, 1.1, 1.3, 0.1), rk(1, 0.01, -0.41, 0.055, 1, 1.2, 0.3, false), rk(2, -0.02, -0.19, 0.05, 1.2, 0.8, 0.4, true)], tentacles: [tn(-0.08, -0.2, 0.14, 0.03, 0.08), tn(-0.03, -0.17, 0.09, 0.03, -0.07), tn(0.03, -0.17, 0.15, 0.032, 0.09), tn(0.08, -0.2, 0.11, 0.03, -0.07)] } },
      { family: "blocks", rock: 2, root: 0.2, height: 0.48, core: { size: 0.09, dy: -0.36, rot: 0.1 },
        pieces: pcs([["husk", 1.5, -0.1, -0.07, -0.5, 13, [[0.35, 0.2], [0.85, 0.1], [0.8, 0.8], [0.45, 0.7]]], ["slab", 1.3, -0.09, -0.29, Q + 0.6, 9, [[0.45, 0.1], [1, 0], [0.85, 0.55], [0.6, 0.8]]], ["mass", 2.5, 0.04, -0.14, 0.6, 12, [[0.1, 0.15], [0.7, 0], [0.75, 0.55], [0.3, 0.7]]], ["crawler", 2.1, 0.08, -0.1, 1.0, 14, [[0.4, 0.15], [0.75, 0], [1, 0.45], [0.7, 1]]]], S4),
        filler: [], body: { mode: "grounded", rocks: [rk(2, -0.04, -0.08, 0.085, 1.3, 1.0, 0), rk(0, 0.05, -0.07, 0.08, 1.2, 1.0, 0.2), rk(3, 0.02, -0.2, 0.085, 1.4, 1.2, 0.15), rk(1, 0.06, -0.3, 0.07, 1.3, 1.2, 0.5), rk(2, -0.06, -0.25, 0.05, 1.3, 1.0, -0.7), rk(0, 0.06, -0.36, 0.05, 1.0, 1.2, 0.3)] } },
      { family: "sheets", rock: 3, root: 0.6, height: 0.48, core: { size: 0.09, dy: -0.36, rot: -0.4 },
        pieces: pcs([["comb", 2.1, -0.04, -0.17, 0.5, 4, [[0.0, 0.3], [0.2, 0.1], [0.28, 0.5], [0.4, 0.45]]], ["winged", 2.3, 0.0, -0.3, -0.8, 13, box(0, 0, 0.48, 1, 0)], ["blinker", 2.9, 0.07, -0.25, 0.7, 11, box(0, 0, 1, 0.8)], ["eye", 2.1, 0.09, -0.2, 0.9, 3, [[0.2, 0.05], [0.65, 0], [0.8, 0.35], [0.45, 0.6]]], ["floater", 1.9, -0.06, -0.27, -0.7, 7, [[0.05, 0.3], [0.3, 0.15], [0.5, 0.55], [0.2, 0.8]]]], S5),
        filler: [], body: { mode: "floating", rocks: [rk(3, 0.02, -0.27, 0.068, 1.5, 1.0, 0), rk(1, 0.09, -0.26, 0.06, 1.3, 1.0, 0.2), rk(0, -0.04, -0.29, 0.05, 1.3, 1.0, 0), rk(2, 0.03, -0.36, 0.06, 1.5, 1.3, -0.1)], tentacles: [tn(-0.05, -0.22, 0.15, 0.03, 0.08), tn(0.01, -0.2, 0.1, 0.032, -0.07), tn(0.07, -0.2, 0.16, 0.03, 0.09), tn(0.13, -0.21, 0.11, 0.028, -0.07)] } },
    ],
    shears: [[0, 3, 1, 4], [1, 0, 2, 1], [2, 2, 3, 0], [3, 0, 2, 3]],
  };

  const grey = (v) => "rgb(" + v + "," + v + "," + v + ")";
  const boxes = {};
  let scratch = null;

  function mk() { const c = document.createElement("canvas"); c.width = G.W; c.height = G.H; return c; }
  function on(tb) { return tb >= 3.45; }

  const tx = (t) => G.sx(0) + t.root * G.H;
  const order = (t) => t.pieces.map((p, i) => i).sort((a, b) => (t.pieces[a].z - t.pieces[b].z) || (a - b));

  // the piece's unrotated ink box as drawn alone, measured once per piece and size
  function inkBox(pc, oc, x, y, h, p) {
    const W = G.W, H = G.H, key = pc.kind + "|" + pc.m + "|" + pc.dx + "|" + pc.dy + "|" + H;
    if (boxes[key]) return boxes[key];
    if (!scratch) scratch = document.createElement("canvas");
    scratch.width = W; scratch.height = H;
    const g = scratch.getContext("2d", { willReadFrequently: true });
    g.filter = FILT; GenOld.drawKind(g, pc.kind, oc, x, y, h, p);
    const d = g.getImageData(0, 0, W, H).data; let x0 = W, x1 = -1, y0 = H, y1 = -1;
    for (let k = 0; k < W * H; k++) if (d[k * 4 + 3] > TH) { const yy = (k / W) | 0, xx = k % W; if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
    return (boxes[key] = [x0, y0, x1 - x0 + 1, y1 - y0 + 1]);
  }

  function drawPiece(g, t, pc, up) {
    const H = G.H, base = GenOld.ROSTER.find((o) => o.kind === pc.kind);
    const oc = Object.assign({}, base, { lit: grey(175), shade: grey(117), dressed: false });
    const x = tx(t) + pc.dx * H, y = (FOOT + pc.dy) * H, h = pc.m * base.hf * H;
    const p = { x: x, y: y, rimX: x, rimY: y, phase: 0, scale: 1, sy: 1, rot: 0, a: 1, e: 1, look: 0, gest: 0, kneel: 0, make: 0, clipY: null, pinU: -1, steps: 0, length: 0 };
    g.save(); g.filter = FILT;
    g.translate(x, y); g.rotate(up ? 0 : pc.rot || 0); g.translate(-x, -y);
    if (pc.cut) {
      const bb = inkBox(pc, oc, x, y, h, p);
      g.beginPath(); pc.cut.forEach((q, i) => { const px = bb[0] + q[0] * bb[2], py = bb[1] + q[1] * bb[3]; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.clip();
    }
    GenOld.drawKind(g, pc.kind, oc, x, y, h, p);
    g.restore();
  }

  // a piece, rendered once into a canvas cropped to the piece's bounds, per titan, piece and size
  const sprites = {};
  function sprite(t, i, up) {
    const W = G.W, H = G.H, key = t.family + "|" + i + "|" + W + "|" + H + (up ? "|u" : "");
    if (sprites[key]) return sprites[key];
    const full = mk(), fg = full.getContext("2d");
    drawPiece(fg, t, t.pieces[i], up);
    const d = fg.getImageData(0, 0, W, H).data; let x0 = W, x1 = -1, y0 = H, y1 = -1;
    for (let k = 0; k < W * H; k++) if (d[k * 4 + 3] > 0) { const yy = (k / W) | 0, xx = k % W; if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
    if (x1 < 0) { x0 = y0 = 0; x1 = y1 = 0; }
    const w = x1 - x0 + 1, h = y1 - y0 + 1, pc = document.createElement("canvas");
    pc.width = w; pc.height = h;
    pc.getContext("2d").drawImage(full, -x0, -y0);
    return (sprites[key] = { x: x0, y: y0, pc: pc });
  }

  function drawFiller(g, t, f) {
    const H = G.H, pts = f.poly.map((q) => [tx(t) + q[0] * H, (FOOT + q[1]) * H]);
    const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length;
    Paint.litShade(g, () => { g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); }, cx, "#101010", "#0e0e0e");
  }

  // drawRockAt has no stretch: scale in the rock's turned frame here
  function bodyRock(g, t, r) {
    const H = G.H;
    g.save(); g.translate(tx(t) + r.x * H, (FOOT + r.dy) * H); g.rotate(r.rot || 0); g.scale(r.sx || 1, r.sy || 1);
    GenMatter.drawRockAt(g, GenMatter.ROCKS[r.rock], 0, 0, 0, r.size * H);
    g.restore();
  }
  function drawBodyRocks(g, t, front) {
    g.save(); g.filter = "brightness(0.30)";
    t.body.rocks.forEach((r) => { if (!!r.front === front) bodyRock(g, t, r); });
    g.restore();
  }

  // tapered limb hanging from (x, dy), S bend by curl, one lit edge (left), flat shade right
  function drawTentacle(g, t, q) {
    const H = G.H, x0 = tx(t) + q.x * H, y0 = (FOOT + q.dy) * H, L = q.len * H, w = q.w * H, N = 14, lft = [], rgt = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, cx = x0 + Math.sin(u * Math.PI * 2) * q.curl * H * 0.5 * u, cy = y0 + u * L, hw = w * 0.5 * (1 - u) + 1;
      lft.push([cx - hw, cy]); rgt.push([cx + hw, cy]);
    }
    const poly = lft.concat(rgt.reverse());
    g.save(); g.filter = "brightness(0.30)";
    Paint.litShade(g, () => { g.beginPath(); poly.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); }, x0 - w * 0.2, "#2a2a2a", "#1c1c1c");
    g.restore();
  }

  function drawTitan(g, t, k, rm) {
    const H = G.H;
    t.filler.forEach((f) => drawFiller(g, t, f));
    if (t.body) {
      drawBodyRocks(g, t, false);
      if (t.body.mode === "floating") (t.body.tentacles || []).forEach((q) => drawTentacle(g, t, q));
    } else {
      g.save(); g.filter = "brightness(0.09)";
      GenMatter.drawRockAt(g, GenMatter.ROCKS[t.rock], tx(t), (FOOT + t.core.dy) * H, t.core.rot, t.core.size * H);
      g.restore();
    }
    order(t).forEach((i) => {
      if (t.pieces[i].snap > k || rm.indexOf("|" + i + "|") >= 0) return;
      const s = sprite(t, i);
      g.drawImage(s.pc, s.x, s.y);
    });
    if (t.body) drawBodyRocks(g, t, true);
  }

  // each titan painted per snap k (1..5) with a faint cool tint (D49) on its own pixels only (source-atop); only the current k is kept per titan
  const cache = {};
  function titanCache(t, k, rm) {
    const key = t.family + "|" + G.W + "|" + G.H + "|" + k + "|" + rm, cur = cache[t.family];
    if (cur && cur.key === key) return cur.c;
    const c = mk(), g = c.getContext("2d");
    drawTitan(g, t, k, rm);
    g.save(); g.globalCompositeOperation = "source-atop"; g.globalAlpha = TINT[3]; g.fillStyle = "rgb(" + TINT[0] + "," + TINT[1] + "," + TINT[2] + ")"; g.fillRect(0, 0, c.width, c.height); g.restore();
    cache[t.family] = { key: key, c: c };
    return c;
  }

  // the body rocks' bounding box (centre and height, px) as the cache paints them
  function bodyBox(t) {
    const H = G.H; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    t.body.rocks.forEach((r) => {
      const cx = tx(t) + r.x * H, cy = (FOOT + r.dy) * H, ex = r.size * H * (r.sx || 1), ey = r.size * H * (r.sy || 1);
      x0 = Math.min(x0, cx - ex); x1 = Math.max(x1, cx + ex); y0 = Math.min(y0, cy - ey); y1 = Math.max(y1, cy + ey);
    });
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, h: y1 - y0 };
  }

  // held snap count of titan i at matter time tm (offsets by landing order: east stone, west stone, flesh, meld)
  const OFF = [0.15, 0.30, 0.45, 0];
  function snaps(i, tm) {
    if (G.reduced) return 5;
    return tm < OFF[i] ? 0 : Math.min(5, Math.floor((tm - OFF[i]) / 0.4 + 1e-6) + 1);
  }

  const mixv = (a, b, t) => a + (b - a) * t;

  // plan titans-clash phase 2: the debris proper. 126 rock wedges, 8 tentacle ribbons, 24 parts (19 piece sprites + 5 crops); one cached sprite each, built once in matter
  const DEG = Math.PI / 180, FIVE = ["roller", "bloom", "mound", "veil", "slider"];
  let debris = null, debrisKey = "";
  const burstStep = (tt) => tt < 1.6 ? 0 : Math.min(3, Math.floor((tt - 1.6) / 0.4 + 1e-6) + 1);
  function crop(src, x, y, w, h) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    c.getContext("2d").drawImage(src, x, y, w, h, 0, 0, w, h);
    return c;
  }
  // the canvas cut to its ink, pivot at the ink's bottom-centre
  function trim(c) {
    const w = c.width, h = c.height, d = c.getContext("2d").getImageData(0, 0, w, h).data;
    let x0 = w, x1 = -1, y0 = h, y1 = -1;
    for (let k = 0; k < w * h; k++) if (d[k * 4 + 3] > 8) { const yy = (k / w) | 0, xx = k % w; if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
    if (x1 < 0) return { sp: crop(c, 0, 0, 1, 1), ox: 0, oy: 1 };
    const sp = crop(c, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    return { sp: sp, ox: sp.width / 2, oy: sp.height };
  }
  // the lowest visible ink below the pivot once tipped by rot (and mirrored)
  function lowInk(sp, ox, oy, rot, mirror) {
    const w = sp.width, h = sp.height, d = sp.getContext("2d").getImageData(0, 0, w, h).data, mx = mirror ? -1 : 1, sn = Math.sin(rot), cs = Math.cos(rot);
    let low = -1e9;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (d[(j * w + i) * 4 + 3] > 8) low = Math.max(low, mx * (i - ox) * sn + (j - oy) * cs);
    return low;
  }
  function buildDebris() {
    const W = G.W, H = G.H, key = W + "|" + H;
    if (debris && debrisKey === key) return;
    const cx = G.sx(0), cy = 0.46 * H, deckY = FOOT * H, list = [], pend = [];
    // 126 wedges of the 21 body rocks (6 each, cut through the rock's centre so no ring survives) and the 8 tentacles, shares still open
    let n = 0;
    LAYOUT.titans.forEach((t) => t.body.rocks.forEach((rr) => {
      const s = rr.size * H, v = GenMatter.ROCKS[rr.rock].verts, co = Math.cos(rr.rot), si = Math.sin(rr.rot);
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      v.forEach((q) => { const px = q[0] * s * rr.sx, py = q[1] * s * rr.sy, X = px * co - py * si, Y = px * si + py * co; x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); });
      const c = document.createElement("canvas"); c.width = Math.ceil(x1 - x0) + 2; c.height = Math.ceil(y1 - y0) + 2;
      const g = c.getContext("2d"); g.filter = "brightness(0.30)";
      g.translate(1 - x0, 1 - y0); g.rotate(rr.rot); g.scale(rr.sx, rr.sy);
      GenMatter.drawRockAt(g, GenMatter.ROCKS[rr.rock], 0, 0, 0, s);
      const k = 6, ox = 1 - x0, oy = 1 - y0, R = 3 * Math.max(c.width, c.height), ws = [];
      let sum = 0;
      for (let j = 0; j < k; j++) { ws.push(0.6 + Util.hash1(n * 53 + j * 7 + 3)); sum += ws[j]; }
      let a = Util.hash1(n * 53 + 1) * Math.PI * 2;
      for (let j = 0; j < k; j++) {
        const da = ws[j] / sum * Math.PI * 2, wc = document.createElement("canvas"); wc.width = c.width; wc.height = c.height;
        const wg = wc.getContext("2d");
        wg.beginPath(); wg.moveTo(ox, oy);
        for (let q = 0; q <= 4; q++) wg.lineTo(ox + Math.cos(a + da * q / 4) * R, oy + Math.sin(a + da * q / 4) * R);
        wg.closePath(); wg.clip(); wg.drawImage(c, 0, 0);
        pend.push(trim(wc)); a += da;
      }
      n++;
    }));
    LAYOUT.titans.forEach((t) => (t.body.tentacles || []).forEach((q) => {
      const L = q.len * H, w = q.w * H, pad = Math.abs(q.curl) * H * 0.5 + w * 0.5 + 2;
      const c = document.createElement("canvas"); c.width = Math.ceil(pad * 2); c.height = Math.ceil(L) + 2;
      const g = c.getContext("2d");
      g.translate(pad - (G.sx(0) + q.x * H), 1 - (FOOT + q.dy) * H);
      drawTentacle(g, { root: 0 }, q);
      pend.push({ sp: c, ox: c.width / 2, oy: c.height });
    }));
    // shares of the pend by seed (N = pend + 24 parts, 158: 24 deck, 16 float, 118 out; the parts hold 16 deck and 8 float of those places): non-part deck round(0.15 N) - 16, float round(0.10 N) - 8
    const N = pend.length + 24, nDeck = Math.round(0.15 * N) - 16, nFloat = Math.round(0.10 * N) - 8;
    const rank = pend.map((p, i) => i).sort((a, b) => Util.hash1(a * 13 + 5) - Util.hash1(b * 13 + 5)), shareOf = [], slotOf = [], reachOf = [];
    rank.forEach((i, r) => { shareOf[i] = r < nDeck ? "deck" : r < nDeck + nFloat ? "float" : "out"; });
    // out chips take a stratified slot along the top edge and both side edges (seeded order), so their ray ends spread
    const outs = pend.map((p, i) => i).filter((i) => shareOf[i] === "out").sort((a, b) => Util.hash1(a * 29 + 11) - Util.hash1(b * 29 + 11));
    outs.forEach((i, k) => { slotOf[i] = (k + Util.hash1(i * 17 + 3)) / outs.length; reachOf[i] = (k * 0.618034) % 1; });
    // one chip: its seeded path from the lump, tipped 60-90 deg head away from the centre, mirrored to -x (light from the left)
    const endCnt = {}, midCnt = {};
    const add = (sp, ox, oy, share, seed, part, slot, reach) => {
      const w = sp.width, h = sp.height, r = (k) => Util.hash1(seed + k * 17.3);
      let a = 0, x1, y1, yb = 0, sgn, sc = 1, R = 0, ex = 0, ey = 0, u1 = 0.35;
      if (part) { x1 = part.x; sgn = x1 >= cx ? 1 : -1; if (share === "deck") yb = part.y; else y1 = part.y; }
      else if (share === "out") {   // chips draw at 0.6 of their wedge; the ray goes from the lump through a point on the top edge or a side edge (sides only above the ceiling cut), ending past it by the sprite's reach so no part of it shows; slot and reach step on until at most 4 ray ends sit in a 0.1 W x 0.1 H cell and at most 4 trade-1.8 centroids in an in-frame cell
        sc = 0.6; u1 = 0.30 + 0.10 * r(10);
        const hs = h * sc, ymax = Math.max(0.02 * H, 0.28 * H - hs - 2), cw = 0.1 * W, chh = 0.1 * H, key = (x, y) => Math.floor(x / cw) + "," + Math.floor(y / chh);
        let best = null, bestN = 1e9;
        for (let t = 0; t < 400; t++) {
          const sl = (slot + t * 0.0371) % 1, rc = (reach + t * 0.137) % 1;
          R = Math.hypot(w, h) * sc + 0.06 * W + 0.4 * H * rc;
          if (sl < 0.45) { const u = sl < 0.225 ? sl / 0.225 : (sl - 0.225) / 0.225; ex = sl < 0.225 ? 0 : W; ey = ymax * (0.05 + 0.95 * u); }
          else { ex = W * (-0.12 + 1.24 * (sl - 0.45) / 0.55); ey = 0; }
          const aa = Math.atan2(cy - ey, ex - cx), d = Math.hypot(ex - cx, cy - ey) + R, xe = cx + Math.cos(aa) * d, ye = cy - Math.sin(aa) * d;
          const sg = Math.cos(aa) >= 0 ? 1 : -1, rt = sg * (60 + 30 * Util.hash1(seed)) * DEG, lx = (w / 2 - ox) * (sg < 0 ? -1 : 1) * sc, ly = (h / 2 - oy) * sc;
          const xm = cx + (xe - cx) * u1 + lx * Math.cos(rt) - ly * Math.sin(rt), ym = cy + (ye - cy) * u1 + lx * Math.sin(rt) + ly * Math.cos(rt), kE = key(xe, ye), kM = key(xm, ym);
          const inM = xm >= 0 && xm < W && ym >= 0 && ym < H, n = Math.max(endCnt[kE] || 0, inM ? midCnt[kM] || 0 : 0);
          if (n < bestN) { bestN = n; best = { a: aa, x: xe, y: ye, kE: kE, kM: inM ? kM : null }; }
          if (n < 4) break;
        }
        a = best.a; sgn = Math.cos(a) >= 0 ? 1 : -1; x1 = best.x; y1 = best.y;
        endCnt[best.kE] = (endCnt[best.kE] || 0) + 1; if (best.kM) midCnt[best.kM] = (midCnt[best.kM] || 0) + 1;
      }
      else if (share === "deck") { x1 = W * (0.05 + 0.9 * r(1)); sgn = x1 >= cx ? 1 : -1; yb = deckY; }
      else { x1 = cx + (r(1) * 2 - 1) * 0.35 * W; y1 = deckY - (0.10 + 0.20 * r(2)) * H; sgn = x1 >= cx ? 1 : -1; }
      const rot = sgn * (60 + 30 * Util.hash1(seed)) * DEG, mirror = sgn < 0;
      const ch = { sp: sp, ox: ox, oy: oy, share: share, rot: rot, mirror: mirror, x0: cx, y0: cy, x1: x1, y1: y1, yb: yb, low: share === "deck" ? lowInk(sp, ox, oy, rot, mirror) : 0, peak: (0.05 + 0.10 * r(3)) * H, m: 1, s1: 1, sc: sc, u0: 0.08 + 0.07 * r(9), u1: u1 };
      if (share === "out") {   // in flight the chip is lifted about two value steps (a pure grey shift, same alpha) so it reads against the ceiling
        const lc = document.createElement("canvas"); lc.width = w; lc.height = h;
        const lg = lc.getContext("2d"); lg.drawImage(sp, 0, 0); lg.globalCompositeOperation = "source-atop"; lg.fillStyle = "rgba(255,255,255,0.10)"; lg.fillRect(0, 0, w, h);
        ch.lift = lc;
      }
      const da = Util.hash1(seed + 91.7) * Math.PI * 2, fl = share === "float" && !part;
      ch.dx = fl ? Math.cos(da) : 0; ch.dy = fl ? Math.sin(da) : 0;
      list.push(ch);
      return ch;
    };
    pend.forEach((p, i) => add(p.sp, p.ox, p.oy, shareOf[i], i * 31 + 7, null, slotOf[i], reachOf[i]));
    // 24 parts: the 19 pieces cropped by their cut's box inside the cached ink box, plus the five's crops (m 1, cut box(0,0,1,0.35))
    // the painters move with G.t, so an ink box measured now differs from the one the titans measure later: keep none of the new ones
    const tmp = mk(), tg = tmp.getContext("2d"), had = Object.assign({}, boxes), parts = [];
    LAYOUT.titans.forEach((t) => t.pieces.map((pc) => [t, pc]).forEach((q) => parts.push(q)));
    FIVE.forEach((kind) => parts.push([LAYOUT.titans[0], { kind: kind, m: 1, dx: 0, dy: 0, rot: 0, cut: box(0, 0, 1, 0.35) }]));
    parts.forEach((q) => {
      const t = q[0], pc = q[1];
      tg.clearRect(0, 0, W, H); drawPiece(tg, t, pc, true);
      const bb = boxes[pc.kind + "|" + pc.m + "|" + pc.dx + "|" + pc.dy + "|" + H], o = GenOld.ROSTER.find((r) => r.kind === pc.kind);
      const us = pc.cut.map((p) => p[0]), vs = pc.cut.map((p) => p[1]);
      const u0 = Math.min.apply(null, us), u1 = Math.max.apply(null, us), v0 = Math.min.apply(null, vs), v1 = Math.max.apply(null, vs);
      const px = Math.floor(bb[0] + u0 * bb[2]), py = Math.floor(bb[1] + v0 * bb[3]);
      const sp = crop(tmp, px, py, Math.ceil(bb[2] * (u1 - u0)) + 2, Math.ceil(bb[3] * (v1 - v0)) + 2);
      const d = GenOld.deckSpot(o), ch = add(sp, bb[0] + (u0 + u1) / 2 * bb[2] - px, bb[1] + v1 * bb[3] - py, o.move === "fly" ? "float" : "deck", o.idx * 31 + 7, d);
      ch.idx = o.idx; ch.m = pc.m; ch.s1 = 1 / pc.m; ch.cut = pc.cut;
      const fx = tx(t) + pc.dx * G.H, fy = (FOOT + pc.dy) * G.H; tg.clearRect(0, 0, W, H); drawPiece(tg, t, Object.assign({}, pc, { m: 1 }), true);   // measured at m 1: a walker's stride is in px, so the box does not scale with m
      const b1 = boxes[pc.kind + "|1|" + pc.dx + "|" + pc.dy + "|" + H]; ch.ib = [b1[0] - fx, b1[1] - fy, b1[2], b1[3]]; ch.fx = fx; ch.fy = fy;   // the whole body's ink box at m 1, from its feet
    });
    Object.keys(boxes).forEach((q) => { if (!had[q]) delete boxes[q]; });
    debris = list; debrisKey = key;
  }
  // the lying pose of part idx at its rest (end of step 3): pivot x and y, tilt from upright (signed), mirrored, its cut, its sprite size
  function partRest(idx) {
    buildDebris();
    const ch = debris.find((c) => c.idx === idx);
    if (!ch) return null;
    return { x: ch.x1 !== undefined ? ch.x1 : 0, y: ch.share === "deck" ? ch.yb - ch.low * ch.s1 : ch.y1, tilt: ch.rot, mirror: ch.mirror, cut: ch.cut, ink: [ch.ib[2], ch.ib[3]], ib: ch.ib, fx: ch.fx, fy: ch.fy };
  }
  // one chip at held step of its path (out: step 0..5 at u seeded 0.08-0.15, seeded 0.30-0.40, then 0.38, 0.7, 0.9 of the rest, 1 every 0.2 s from 1.6; others 1..3; deck: up its peak at step 1, halfway down at step 2, landed at 3); parts shrink from m to 1 over the steps
  function drawChip(ctx, ch, step, drift) {
    const u = ch.share === "out" ? [ch.u0, ch.u1, ch.u1 + (1 - ch.u1) * 0.38, ch.u1 + (1 - ch.u1) * 0.7, ch.u1 + (1 - ch.u1) * 0.9, 1][step] : step / 3, H = G.H, x = ch.x0 + (ch.x1 - ch.x0) * u, s = (ch.m === 1 ? 1 : mixv(ch.m, 1, u) / ch.m) * ch.sc;
    let y;
    if (ch.share === "deck") { const ye = ch.yb - ch.low * s, yp = ch.y0 - ch.peak; y = step === 1 ? yp : step === 2 ? mixv(yp, ye, 0.5) : ye; }
    else y = ch.y0 + (ch.y1 - ch.y0) * u;
    ctx.save(); ctx.translate(x + ch.dx * drift, y + ch.dy * drift); ctx.rotate(ch.rot); if (ch.mirror) ctx.scale(-1, 1);
    ctx.scale(s, s); ctx.drawImage(ch.lift || ch.sp, -ch.ox, -ch.oy);
    ctx.restore();
  }
  function drawChips(ctx, tt, out) {
    if (G.reduced) {   // reduced motion: the non-part deck and float chips at their rest, from trade 0; no out or part chips
      if (!debris || out || tt < 0) return;
      debris.forEach((ch) => { if (ch.share !== "out" && !(ch.idx >= 0)) drawChip(ctx, ch, 3, 0); });
      return;
    }
    if (!debris || tt < 1.6 || (out && tt >= 9)) return;
    const step = out ? Math.min(5, Math.floor((tt - 1.6) / 0.2 + 1e-6)) : burstStep(tt);   // out chips: 0.2 s held steps from 1.6, past the edges from 2.6
    // from 2.4 the 11 non-part float chips drift 0.004 H a snap (15 snaps to 8.4); parts never move
    const drift = tt < 2.4 ? 0 : Math.min(15, Math.floor((tt - 2.4) / 0.4 + 1e-6)) * 0.004 * G.H;
    debris.forEach((ch) => {
      if ((ch.share === "out") !== out) return;
      if (ch.idx >= 0 && !out && window.GenOld && GenOld.birthT && tt >= GenOld.birthT(ch.idx)) return;   // its old one is growing: hand over
      drawChip(ctx, ch, step, drift);
    });
  }
  function drawDebris(ctx, tt) { drawChips(ctx, tt, false); }

  // grow in five held steps: snap 0 is the blast rock alone, then the body group (and the pieces whose snap has come) moves from the rock to its rest pose
  function draw(ctx, tb) {
    if (!on(tb)) return;
    const tm = tb - 3.45;

    LAYOUT.titans.forEach((t, i) => {
      const k = snaps(i, tm), rp = GenMatter.rockPose(i);
      if (k === 0) { if (rp) GenMatter.drawRockAt(ctx, GenMatter.ROCKS[t.rock], rp.x, rp.y, rp.rot, rp.size); return; }
      const tt = G.secs("trade");
      if (k === 5 && tt >= 0) {
        // the clash: held 0.4 s steps from the roots to one point, no fight; gone at the burst (reduced motion: gone from trade 0)
        if (tt < 1.6 && !G.reduced) ctx.drawImage(titanCache(t, k, ""), (G.sx(0) - tx(t)) * Math.min(3, Math.floor(tt / 0.4)) / 3, 0);
        return;
      }
      const c = titanCache(t, k, "");
      if (k === 5 || !rp) { ctx.drawImage(c, 0, 0); return; }
      const bb = bodyBox(t), u = k / 5, s = mixv(Math.max(0.35, Math.min(1, 2 * rp.size / bb.h)), 1, u);
      const gx = mixv(rp.x, bb.x, u), gy = mixv(rp.y, bb.y, u), gr = mixv(rp.rot, 0, u);
      ctx.save();
      ctx.translate(gx, gy); ctx.rotate(gr); ctx.scale(s, s); ctx.translate(-bb.x, -bb.y);
      ctx.drawImage(c, 0, 0);
      ctx.restore();
      ctx.save();
      ctx.filter = "grayscale(" + u.toFixed(3) + ") brightness(" + mixv(1, 0.23, u).toFixed(3) + ")";
      GenMatter.drawRockAt(ctx, GenMatter.ROCKS[t.rock], gx, gy, gr, rp.size);
      ctx.restore();
    });
    buildDebris();
    if (!G.reduced) drawChips(ctx, G.secs("trade"), true);
  }

  return { on, draw, LAYOUT, buildDebris, drawDebris, partRest };
})();
