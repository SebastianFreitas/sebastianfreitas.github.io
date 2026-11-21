/* genesis-rocktitans.js: the four rock titans at rest (plan rock-titans, phase 2), painted as tools/titansheet.py paints them.
   Old-one pieces around a rock mountain, colourless, held. LAYOUT is a literal copy of the approved sketch layout (ef65899). */
window.GenRockTitans = (function () {
  const G = window.Gen, FOOT = 0.64, TH = 40, SURVIVOR = 1;
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

  function on(tb) { return tb >= 3.45; }

  const tx = (t) => G.sx(0) + t.root * G.H;

  // the piece's unrotated ink box as drawn alone, measured once per piece and size; only a window round the piece is painted and
  // scanned, grown until the ink stays well inside it (a window edge that is not the canvas edge), so the box equals the full scan's
  function inkBox(pc, oc, x, y, h, p) {
    const W = G.W, H = G.H, key = pc.kind + "|" + pc.m + "|" + pc.dx + "|" + pc.dy + "|" + H;
    if (boxes[key]) return boxes[key];
    if (!scratch) scratch = document.createElement("canvas");
    for (let R = 3 * h + 0.1 * H; ; R *= 2) {
      const rx0 = Math.max(0, Math.floor(x - R)), ry0 = Math.max(0, Math.floor(y - R)), rx1 = Math.min(W, Math.ceil(x + R)), ry1 = Math.min(H, Math.ceil(y + 0.5 * R));
      const w = rx1 - rx0, hh = ry1 - ry0, full = rx0 === 0 && ry0 === 0 && rx1 === W && ry1 === H;
      scratch.width = w; scratch.height = hh;
      const g = scratch.getContext("2d", { willReadFrequently: true });
      g.translate(-rx0, -ry0); g.filter = FILT; GenOld.drawKind(g, pc.kind, oc, x, y, h, p);
      const d = new Uint32Array(g.getImageData(0, 0, w, hh).data.buffer); let x0 = w, x1 = -1, y0 = hh, y1 = -1;
      for (let yy = 0; yy < hh; yy++) for (let xx = 0, k = yy * w; xx < w; xx++, k++) if ((d[k] >>> 24) > TH) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
      const mg = 0.25 * R;
      if (!full && (x1 < 0 || (rx0 > 0 && x0 < mg) || (rx1 < W && x1 >= w - mg) || (ry0 > 0 && y0 < mg) || (ry1 < H && y1 >= hh - mg))) continue;
      return (boxes[key] = [x0 + rx0, y0 + ry0, x1 - x0 + 1, y1 - y0 + 1]);
    }
  }

  // the painter's arguments for a piece standing at its place
  function pieceArgs(t, pc) {
    const H = G.H, base = GenOld.ROSTER.find((o) => o.kind === pc.kind);
    const oc = Object.assign({}, base, { lit: grey(175), shade: grey(117), dressed: false });
    const x = tx(t) + pc.dx * H, y = (FOOT + pc.dy) * H, h = pc.m * base.hf * H;
    const p = { x: x, y: y, rimX: x, rimY: y, phase: 0, scale: 1, sy: 1, rot: 0, a: 1, e: 1, look: 0, gest: 0, kneel: 0, make: 0, clipY: null, pinU: -1, steps: 0, length: 0 };
    return { oc: oc, x: x, y: y, h: h, p: p };
  }

  function drawPiece(g, t, pc, up) {
    const { oc, x, y, h, p } = pieceArgs(t, pc);
    g.save(); g.filter = FILT;
    g.translate(x, y); g.rotate(up ? 0 : pc.rot || 0); g.translate(-x, -y);
    if (pc.cut) {
      const bb = inkBox(pc, oc, x, y, h, p);
      g.beginPath(); pc.cut.forEach((q, i) => { const px = bb[0] + q[0] * bb[2], py = bb[1] + q[1] * bb[3]; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); g.clip();
    }
    GenOld.drawKind(g, pc.kind, oc, x, y, h, p);
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

  // each titan's moving body (GenTitanBodies, slot i = NAMES[i]) is painted every frame into its own layer sized from BOX, at 1x like the old cache, then blitted; no tint
  const NAMES = GenTitanBodies.NAMES;
  const layers = [];
  // wide: the angry Slime's lean needs BOX.lw of room on the left; every other layer keeps BOX.l
  function layerSize(wide) { const B = GenTitanBodies.BOX; return [Math.ceil((B.r - (wide ? B.lw : B.l)) * G.H), Math.ceil((B.top - B.bottom) * G.H)]; }
  function paintBody(c, name, t, hurt, f, wide) {
    const B = GenTitanBodies.BOX, g = c.getContext("2d");
    g.clearRect(0, 0, c.width, c.height);
    GenTitanBodies.draw(name, g, { x: -(wide ? B.lw : B.l) * G.H, footY: B.top * G.H, H: G.H, t: t, hurt: hurt, pain: f ? f.pain : 0, sad: f ? f.sad : 0, anger: f ? f.anger : 0 });
  }
  // the layer, redrawn only when the body clock or its hurt moved (so reduced motion paints once)
  function bodyLayer(i, t, hurt, f) {
    const wide = !!(f && (hurt || f.pain || f.sad || f.anger)), sz = layerSize(wide), key = sz[0] + "|" + sz[1];
    let L = layers[i];
    if (!L || L.key !== key) { const c = document.createElement("canvas"); c.width = sz[0]; c.height = sz[1]; L = layers[i] = { c: c, key: key, t: -1, h: 0, f: 0 }; }
    hurt = hurt || 0;
    const fk = f ? f.pain + f.sad * 3 + f.anger * 7 : 0;
    if (L.t !== t || L.h !== hurt || L.f !== fk) { paintBody(L.c, NAMES[i], t, hurt, f, wide); L.t = t; L.h = hurt; L.f = fk; }
    L.wide = wide;
    return L.c;
  }
  // where the layer's top left sits on the canvas for titan t at its root
  function layerPos(t, wide) { const B = GenTitanBodies.BOX; return [tx(t) + (wide ? B.lw : B.l) * G.H, (FOOT - B.top) * G.H]; }

  // the body's box (centre and height of the part above the foot line, px) for the grow-in
  function bodyBox(t) {
    const B = GenTitanBodies.BOX, H = G.H;
    return { x: tx(t) + (B.l + B.r) / 2 * H, y: (FOOT - B.top / 2) * H, h: B.top * H };
  }

  // held snap count of titan i at matter time tm (offsets by landing order: east stone, west stone, flesh, meld)
  const OFF = [0.15, 0.30, 0.45, 0];
  // body clock: seconds since the titan became whole (snaps reached 5), 0 before and in reduced motion; it runs on through the clash
  function bodyT(i, tm, k) { return G.reduced || k < 5 ? 0 : Math.max(0, tm - OFF[i] - 1.6); }
  function snaps(i, tm) {
    if (G.reduced) return 5;
    return tm < OFF[i] ? 0 : Math.min(5, Math.floor((tm - OFF[i]) / 0.4 + 1e-6) + 1);
  }

  const mixv = (a, b, t) => a + (b - a) * t;

  // the standing sway: the east stone (blocks), the flesh (rings) and the meld (sheets) shift their weight in slow held steps while they stand; the tower (0) is a rock and stays still.
  // one rigid rotation + shift of the whole body about a pivot, never a reshape; [period s, phase, lean rad, drift H, bob H, grounded]
  const SWAY = [null, [4.4, 0.3, 0.05, 0.012, 0.014, false], [3.6, 1.7, 0.06, 0.01, 0, true], [5.0, 3.1, 0.05, 0.014, 0.016, false]];
  const SWAY_END = 4.55 + G.TITAN_HOLD - 3.45;   // matter time at which the sway has eased out (the first fire step lands on the victim, which stands straight)
  function swayApply(ctx, i, t, tm) {
    const w = SWAY[i];
    if (!w || G.reduced) return false;
    const bt = Math.max(0, tm - OFF[i] - 1.6), env = Math.min(1, bt / 0.6) * Math.max(0, Math.min(1, (SWAY_END - tm) / 0.8));
    const q = Math.floor(tm / 0.25) * 0.25, ph = (q / w[0] + w[1]) * 2 * Math.PI, s = Math.sin(ph) * env;
    const bb = bodyBox(t), px = bb.x, py = w[5] ? FOOT * G.H : bb.y;
    ctx.save();
    ctx.translate(px + w[3] * G.H * s, py - w[4] * G.H * Math.cos(ph * 0.5) * env);
    ctx.rotate(w[2] * s);
    ctx.translate(-px, -py);
    return true;
  }

  // plan titans-clash phase 2: the debris proper. 126 rock wedges, 8 tentacle ribbons, 24 parts (19 piece sprites + 5 crops); one cached sprite each, built once in matter
  const DEG = Math.PI / 180, FIVE = ["roller", "bloom", "mound", "veil", "slider"];
  let debris = null, debrisKey = "";
  const BURST = GenTitanFight.BURST, ADD = GenTitanFight.ADD, D_T0 = 3.0 + ADD;   // trade secs: the burst, the shift of everything after the old 1.6, and the survivor's / births' start
  const burstStep = (tt) => tt < BURST ? 0 : Math.min(3, Math.floor((tt - BURST) / 0.4 + 1e-6) + 1);
  function crop(src, x, y, w, h) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    c.getContext("2d").drawImage(src, x, y, w, h, 0, 0, w, h);
    return c;
  }
  // the canvas cut to its ink, pivot at the ink's bottom-centre
  function trim(c) {
    const w = c.width, h = c.height, d = new Uint32Array(c.getContext("2d").getImageData(0, 0, w, h).data.buffer);
    let x0 = w, x1 = -1, y0 = h, y1 = -1;
    for (let yy = 0; yy < h; yy++) for (let xx = 0, k = yy * w; xx < w; xx++, k++) if ((d[k] >>> 24) > 8) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
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
  // the build as a plan of small steps (rocks, tentacles, the add pass, parts) that share one state; debris is set only when the last one is done
  const DEB_CHUNK = { rock: 1, tent: 2, add: 16 };
  function debrisPlan(W, H, key) {
    const cx = G.sx(0), cy = 0.46 * H, deckY = FOOT * H, list = [], pend = [];
    // 126 wedges of the 21 body rocks (6 each, cut through the rock's centre so no ring survives) and the 8 tentacles, shares still open
    let n = 0;
    const rockStep = (rr) => {
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
    };
    const tentStep = (q) => {
      const L = q.len * H, w = q.w * H, pad = Math.abs(q.curl) * H * 0.5 + w * 0.5 + 2;
      const c = document.createElement("canvas"); c.width = Math.ceil(pad * 2); c.height = Math.ceil(L) + 2;
      const g = c.getContext("2d");
      g.translate(pad - (G.sx(0) + q.x * H), 1 - (FOOT + q.dy) * H);
      drawTentacle(g, { root: 0 }, q);
      pend.push({ sp: c, ox: c.width / 2, oy: c.height });
    };
    const shareOf = [], slotOf = [], reachOf = [];
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
    const addStep = () => {
      // shares of the pend by seed (N = pend + 24 parts, 158: 24 deck, 16 float, 118 out; the parts hold 16 deck and 8 float of those places): non-part deck round(0.15 N) - 16, float round(0.10 N) - 8
      const N = pend.length + 24, nDeck = Math.round(0.15 * N) - 16, nFloat = Math.round(0.10 * N) - 8;
      const rank = pend.map((p, i) => i).sort((a, b) => Util.hash1(a * 13 + 5) - Util.hash1(b * 13 + 5));
      rank.forEach((i, r) => { shareOf[i] = r < nDeck ? "deck" : r < nDeck + nFloat ? "float" : "out"; });
      // out chips take a stratified slot along the top edge and both side edges (seeded order), so their ray ends spread
      const outs = pend.map((p, i) => i).filter((i) => shareOf[i] === "out").sort((a, b) => Util.hash1(a * 29 + 11) - Util.hash1(b * 29 + 11));
      outs.forEach((i, k) => { slotOf[i] = (k + Util.hash1(i * 17 + 3)) / outs.length; reachOf[i] = (k * 0.618034) % 1; });
    };
    const addChunk = (i0) => { pend.slice(i0, i0 + DEB_CHUNK.add).forEach((p, j) => { const i = i0 + j; add(p.sp, p.ox, p.oy, shareOf[i], i * 31 + 7, null, slotOf[i], reachOf[i]); }); };
    // 24 parts: the 19 pieces cropped by their cut's box inside the cached ink box, plus the five's crops (m 1, cut box(0,0,1,0.35))
    // the painters move with G.t, so an ink box measured now differs from the one the titans measure later: keep none of the new ones
    const parts = [];
    let had = null;
    LAYOUT.titans.forEach((t) => t.pieces.filter((pc) => !GenOld.CUT[pc.kind]).map((pc) => [t, pc]).forEach((q) => parts.push(q)));
    FIVE.filter((kind) => !GenOld.CUT[kind]).forEach((kind) => parts.push([LAYOUT.titans[0], { kind: kind, m: 1, dx: 0, dy: 0, rot: 0, cut: box(0, 0, 1, 0.35) }]));
    let cur = null;   // the part's chip between its two halves
    const partA = (q) => {
      if (!had) had = Object.assign({}, boxes);
      const t = q[0], pc = q[1], a = pieceArgs(t, pc);
      inkBox(pc, a.oc, a.x, a.y, a.h, a.p);
      const bb = boxes[pc.kind + "|" + pc.m + "|" + pc.dx + "|" + pc.dy + "|" + H], o = GenOld.ROSTER.find((r) => r.kind === pc.kind);
      const us = pc.cut.map((p) => p[0]), vs = pc.cut.map((p) => p[1]);
      const u0 = Math.min.apply(null, us), u1 = Math.max.apply(null, us), v0 = Math.min.apply(null, vs), v1 = Math.max.apply(null, vs);
      const px = Math.floor(bb[0] + u0 * bb[2]), py = Math.floor(bb[1] + v0 * bb[3]);
      // the piece is painted straight into its crop (clipped to the canvas, as the full-size canvas it was cropped from was)
      const sp = document.createElement("canvas"); sp.width = Math.ceil(bb[2] * (u1 - u0)) + 2; sp.height = Math.ceil(bb[3] * (v1 - v0)) + 2;
      const sg = sp.getContext("2d"); sg.translate(-px, -py); sg.beginPath(); sg.rect(0, 0, W, H); sg.clip();
      drawPiece(sg, t, pc, true);
      const d = GenOld.deckSpot(o), ch = add(sp, bb[0] + (u0 + u1) / 2 * bb[2] - px, bb[1] + v1 * bb[3] - py, o.move === "fly" ? "float" : "deck", o.idx * 31 + 7, d);
      ch.idx = o.idx; ch.m = pc.m; ch.s1 = 1 / pc.m; ch.cut = pc.cut;
      cur = ch;
    };
    const partB = (q) => {
      const t = q[0], pc = q[1], ch = cur;
      const fx = tx(t) + pc.dx * G.H, fy = (FOOT + pc.dy) * G.H, p1 = Object.assign({}, pc, { m: 1 }), a = pieceArgs(t, p1);   // measured at m 1: a walker's stride is in px, so the box does not scale with m
      const b1 = inkBox(p1, a.oc, a.x, a.y, a.h, a.p); ch.ib = [b1[0] - fx, b1[1] - fy, b1[2], b1[3]]; ch.fx = fx; ch.fy = fy;   // the whole body's ink box at m 1, from its feet
    };
    const rocks = [], tents = [], steps = [];
    LAYOUT.titans.forEach((t) => { t.body.rocks.forEach((rr) => rocks.push(rr)); (t.body.tentacles || []).forEach((q) => tents.push(q)); });
    const group = (items, size, fn) => { for (let i = 0; i < items.length; i += size) steps.push(() => items.slice(i, i + size).forEach(fn)); };
    group(rocks, DEB_CHUNK.rock, rockStep); group(tents, DEB_CHUNK.tent, tentStep); steps.push(addStep); for (let i = 0; i < rocks.length * 6 + tents.length; i += DEB_CHUNK.add) steps.push(() => addChunk(i)); parts.forEach((q) => { steps.push(() => partA(q), () => partB(q)); });
    const finish = () => {
      Object.keys(boxes).forEach((q) => { if (!had[q]) delete boxes[q]; });
      debris = list; debrisKey = key;
    };
    const drop = () => { if (had) Object.keys(boxes).forEach((q) => { if (!had[q]) delete boxes[q]; }); };   // a dropped partial build leaves the cache as it found it
    return { key: key, steps: steps, finish: finish, drop: drop, i: 0 };
  }
  // the plan being built; a size change drops it
  let plan = null;
  function debrisNext() {
    const key = G.W + "|" + G.H;
    if (debris && debrisKey === key) return;
    if (plan && plan.key !== key) { plan.drop(); plan = null; }
    if (!plan) plan = debrisPlan(G.W, G.H, key);
    plan.steps[plan.i]();
    plan.i++;   // after the step ran: one that throws is run again by the next call
    if (plan.i >= plan.steps.length) { const p = plan; plan = null; p.finish(); }
  }
  function buildDebris() {
    const key = G.W + "|" + G.H;
    while (!(debris && debrisKey === key)) debrisNext();
  }
  // one function per small step, for the gate's bar; each does the next piece of the build (nothing once built)
  function debrisSteps() {
    let rocks = 0, tents = 0, parts = FIVE.filter((k) => !GenOld.CUT[k]).length;
    LAYOUT.titans.forEach((x) => { rocks += x.body.rocks.length; tents += (x.body.tentacles || []).length; parts += x.pieces.filter((pc) => !GenOld.CUT[pc.kind]).length; });
    const cnt = Math.ceil(rocks / DEB_CHUNK.rock) + Math.ceil(tents / DEB_CHUNK.tent) + 1 + Math.ceil((rocks * 6 + tents) / DEB_CHUNK.add) + parts * 2;
    return Array.from({ length: cnt }, () => debrisNext);
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
  const CHIP_FADE = 3;   // s the leftover chips take to fade out
  const chipFadeT0 = () => 9 + ADD + 4;   // trade secs: 4 s into the walk, long after the last birth
  function drawChips(ctx, tt, out) {
    if (G.reduced) {   // reduced motion: the non-part deck and float chips at their rest, from trade 0; no out or part chips
      if (!debris || out || tt < 0) return;
      debris.forEach((ch) => { if (ch.share !== "out" && !(ch.idx >= 0)) drawChip(ctx, ch, 3, 0); });
      return;
    }
    if (!debris || tt < BURST || (out && tt >= 9 + ADD)) return;
    const step = out ? Math.min(5, Math.floor((tt - BURST) / 0.2 + 1e-6)) : burstStep(tt);   // out chips: 0.2 s held steps from 1.6, past the edges from 2.6
    // from 2.4 the 11 non-part float chips drift 0.004 H a snap (15 snaps to 8.4); parts never move
    const drift = tt < 2.4 + ADD ? 0 : Math.min(15, Math.floor((tt - 2.4 - ADD) / 0.4 + 1e-6)) * 0.004 * G.H;
    const fa = out ? 1 : Math.max(0, 1 - (tt - chipFadeT0()) / CHIP_FADE);
    debris.forEach((ch) => {
      if ((ch.share === "out") !== out) return;
      if (ch.idx >= 0 && !out && window.GenOld && GenOld.birthT && tt >= GenOld.birthT(ch.idx)) return;   // its old one is growing: hand over
      if (!(ch.idx >= 0) && !out) {   // the leftovers never become old ones: they fade out over CHIP_FADE s once the last old one is born
        if (fa <= 0) return;
        ctx.save(); ctx.globalAlpha *= fa; drawChip(ctx, ch, step, drift); ctx.restore();
        return;
      }
      drawChip(ctx, ch, step, drift);
    });
  }
  // the sturdy Statue: at the burst 36 more chips, the debris' own sprites, fly out of where it stood, fall and shrink to nothing in 1 s (a pure function of tt; the list of sprites is built once per debris)
  const XTRA = 36, XLIFE = 1.0;
  let xtra = null, xtraFor = null;
  function drawStatueBurst(ctx, tt) {
    if (G.reduced || !debris || tt < BURST || tt >= BURST + XLIFE) return;
    if (xtraFor !== debris) { xtra = debris.filter((ch) => ch.share === "out"); xtraFor = debris; }
    if (!xtra.length) return;
    const a = tt - BURST, u = a / XLIFE, k = u < 0.4 ? 1 : (1 - u) / 0.6, H = G.H, x = G.sx(0) - SURVIVOR * 0.4 * H, rnd = GenTitanFight.rnd;
    for (let j = 0; j < XTRA; j++) {
      const ch = xtra[(j * 7) % xtra.length], id = 200 + j;
      const x0 = x + (rnd(id, 1) - 0.5) * 0.2 * H, y0 = (FOOT - 0.05 - 0.45 * rnd(id, 2)) * H;
      const ang = (-0.1 - 0.8 * rnd(id, 3)) * Math.PI, sp = (0.5 + 0.9 * rnd(id, 4)) * H, vx = Math.cos(ang) * sp * (rnd(id, 7) < 0.7 ? 1 : -1) * 0.8 - 0.3 * H;
      const s = ch.sc * k * k * (0.7 + 0.5 * rnd(id, 5));
      if (s <= 0.001) continue;
      ctx.save();
      ctx.translate(x0 + vx * a, y0 + Math.sin(ang) * sp * a + 0.5 * 1.8 * H * a * a); ctx.rotate(rnd(id, 6) * 6.283 + a * (rnd(id, 8) - 0.5) * 8);
      ctx.scale(s, s); ctx.drawImage(ch.lift || ch.sp, -ch.ox, -ch.oy);
      ctx.restore();
    }
  }
  function drawDebris(ctx, tt) {
    drawChips(ctx, tt, false);
    if (G.reduced || tt < BURST || tt >= D_T0) return;
    // the leftover, in front of the debris: two fifths of the Hollow as it was at the burst, still, at the clash point, in lighter fills
    const t = LAYOUT.titans[SURVIVOR], lp = layerPos(t), key = SURVIVOR + "|" + G.W + "|" + G.H;
    if (!leftBody || leftKey !== key) {
      const c = document.createElement("canvas"), sz = layerSize();
      c.width = sz[0]; c.height = sz[1];
      paintBody(c, NAMES[SURVIVOR], Math.max(0, G.secs("break") - tt + BURST - 3.45 - OFF[SURVIVOR] - 1.6));
      leftBody = c; leftKey = key; leftTint = null;
    }
    const body = leftBody;
    ctx.save();
    ctx.translate(G.sx(0), FOOT * G.H); ctx.scale(0.4, 0.4); ctx.translate(-tx(t), -FOOT * G.H);
    const pal = window.GenEldPal ? GenEldPal.TIER3 : null;
    if (pal) {
      // the silhouette in giant D's body value (its lump step), built once; the body shows over it faintly
      if (!leftTint) {
        const c = document.createElement("canvas");
        c.width = body.width; c.height = body.height;
        const g = c.getContext("2d");
        g.drawImage(body, 0, 0);
        g.globalCompositeOperation = "source-in"; g.fillStyle = pal.steps[3]; g.fillRect(0, 0, c.width, c.height);
        leftTint = c;
      }
      ctx.drawImage(leftTint, lp[0], lp[1]);
      ctx.globalAlpha = 0.35;
    }
    ctx.drawImage(body, lp[0], lp[1]);
    ctx.restore();
  }
  let leftBody = null, leftKey = "", leftTint = null;

  // the titan rooted on the killer giant's side (root KILLER_SIDE * 0.6); it dies in break secs 4.65 to 5.85 and takes no part in the clash
  const victim = () => LAYOUT.titans.findIndex((t) => Math.abs(t.root - (window.GenGiants ? GenGiants.KILLER_SIDE : 1) * 0.6) < 1e-6);
  // the fire eats the titan from the top down in three held steps (4.55, 4.95, 5.35); each step the eaten third breaks into chunks of its own fills that fall in held steps to the rail
  const FIRE_T = [4.55 + G.TITAN_HOLD, 4.95 + G.TITAN_HOLD, 5.35 + G.TITAN_HOLD];
  // chunks per step: [x across the titan's width (0..1), y fraction in the eaten band, half size], in H
  const CRUMB = [[0.1, 0.2, 0.02], [0.25, 0.7, 0.028], [0.4, 0.3, 0.018], [0.55, 0.8, 0.026], [0.78, 0.4, 0.022], [0.18, 0.9, 0.016], [0.62, 0.55, 0.03], [0.9, 0.85, 0.017]];
  const FALL = [0, 0.15, 0.4, 0.75, 1];   // held 0.1 s steps of the fall toward the rail; gone at 0.5 s
  // the victim frozen on the form it shows when the first fire step lands, painted once per size into its own layer, with its ink bounds [x0, y0, x1, y1] in layer px
  let frozen = null, frozenKey = "";
  function frozenVictim(i) {
    const key = i + "|" + G.W + "|" + G.H;
    if (frozen && frozenKey === key) return frozen;
    const c = document.createElement("canvas"), sz = layerSize();
    c.width = sz[0]; c.height = sz[1];
    paintBody(c, NAMES[i], Math.max(0, FIRE_T[0] - 3.45 - OFF[i] - 1.6));
    const w = c.width, h = c.height, d = c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, w, h).data;
    let x0 = w, x1 = -1, y0 = h, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    frozen = { c: c, b: x1 < 0 ? [0, 0, 1, 1] : [x0, y0, x1, y1] }; frozenKey = key;
    return frozen;
  }
  const crumbPath = (ctx, ox, oy, r) => {
    ctx.beginPath();
    ctx.moveTo(ox - r, oy); ctx.lineTo(ox - r * 0.3, oy - r); ctx.lineTo(ox + r, oy - r * 0.4); ctx.lineTo(ox + r * 0.6, oy + r); ctx.lineTo(ox - r * 0.5, oy + r * 0.7); ctx.closePath();
  };
  function drawVictim(ctx0, t, i, ts) {
    const H = G.H, pal = window.GenEldPal ? GenEldPal.TIER3 : null;
    if (ts >= 5.85 + G.TITAN_HOLD) return;
    const fz = frozenVictim(i), c = fz.c, b = fz.b, bw = b[2] - b[0], bh3 = (b[3] - b[1]) / 3, lp = layerPos(t);
    const n = ts < FIRE_T[1] ? 1 : ts < FIRE_T[2] ? 2 : 3, yl = b[1] + bh3 * n;   // the fire's front; what is above it is eaten
    const ctx = ctx0;
    ctx.save(); ctx.translate(lp[0], lp[1]);   // everything below is in the layer's px
    if (n < 3) { ctx.save(); ctx.beginPath(); ctx.rect(-lp[0], yl, G.W, G.H - lp[1] - yl); ctx.clip(); ctx.drawImage(c, 0, 0); ctx.restore(); }
    if (pal) {
      ctx.save();
      ctx.fillStyle = pal.steps[1];   // the loom's own hull value, paler than the titan
      const x0 = b[0] - 0.03 * H, w = bw + 0.06 * H, tn = 6, dip = [0.045, 0.02, 0.055, 0.03, 0.05, 0.025];   // six tongues, each reaching a little over the titan's remaining top
      ctx.beginPath();
      ctx.moveTo(x0, -lp[1]); ctx.lineTo(x0 + w, -lp[1]);
      for (let i = tn - 1; i >= 0; i--) {
        const xm = x0 + w * (i + 0.5) / tn, hw = w / tn * 0.5;
        ctx.lineTo(xm + hw, yl - 0.01 * H); ctx.lineTo(xm + hw * 0.2 * (i % 2 ? 1 : -1), yl + dip[i] * H); ctx.lineTo(xm - hw, yl - 0.01 * H);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    for (let k = 0; k < n; k++) {
      const age = ts - FIRE_T[k], fs = Math.floor(age / 0.1 + 1e-6);
      if (fs >= 5) continue;
      const y0 = b[1] + bh3 * k;
      CRUMB.forEach((q, i) => {
        const r = q[2] * H, ox = b[0] + q[0] * bw, oy = y0 + q[1] * bh3, f = FALL[fs];
        const dx = (i % 2 ? 1 : -1) * f * 0.03 * H, dy = f * Math.max(0, b[3] - oy);
        ctx.save();
        ctx.translate(dx, dy);
        if (pal) { ctx.fillStyle = pal.steps[2]; crumbPath(ctx, ox, oy, r * 1.3); ctx.fill(); }   // a one-step lighter edge so a chunk reads against the backdrop
        crumbPath(ctx, ox, oy, r);
        ctx.clip();
        ctx.drawImage(c, 0, 0);
        ctx.restore();
      });
    }
    ctx.restore();
  }

  /* the survivor's growth (trade secs tt): from the burst (1.6) a fifth-size leftover of the SURVIVOR titan holds at the clash point to 3.0; it snaps to giant D at
     3.0 / 3.4 / 3.8 / 4.2 (heights in H below), holds to 5.4, then slides out of frame in held steps (5.4, 5.8) and is gone at 6.2. Steps 0 and 1 are smaller than a
     titan and are drawn with the titans; steps 2 and 3 and the exit are drawn behind the bridge in the giants' layer (bigD). */
  const D_STEP = [0.25, 0.45, 0.9, 1.5], D_X = [0, 0, 0.25, 0.5];
  const dStep = (tt) => (tt < D_T0 || tt >= 6.2 + ADD) ? -1 : Math.min(3, Math.floor((tt - D_T0) / 0.4 + 1e-6));
  function placeD(ctx, tt, st) {
    if (!window.GenGiants) return;
    const H = G.H, h = D_STEP[st] * H, w = h * GenGiants.D_W / GenGiants.D_H;
    let cx = G.sx(0) + D_X[st] * H;
    if (tt >= 5.4 + ADD) cx = G.W - (tt < 5.8 + ADD ? 0.7 : 0.3) * H + w / 2;
    GenGiants.drawD(ctx, cx, FOOT * H, h / GenGiants.D_H);
  }
  function bigD(ctx) {
    if (G.reduced) return;
    const tt = G.secs("trade"), st = dStep(tt);
    if (st >= 2) placeD(ctx, tt, st);
  }

  // grow in five held steps: snap 0 is the blast rock alone, then the body group (and the pieces whose snap has come) moves from the rock to its rest pose
  // reused every frame: the survivor's late paint, the Slime's lash paint (on its own scratch layer: its bites cut holes), and their draw options
  const LATE = { on: false, x: 0, t: 0, arms: 0, ff: null }, LASH = { on: false, x: 0, t: 0, ff: null };
  const LATE_O = { x: 0, footY: 0, H: 0, t: 0, arms: 0, drop: 0 };
  const LASH_O = { x: 0, footY: 0, H: 0, t: 0, hurt: 1, pain: 1, sad: 1, anger: 1, lash: 0, hx: 0 };
  let lashC = null, slimeC = null, stoneC = null;
  const STONE = { lit: "#33373b", shade: "#26292c", hi: "#33373b" };   // the Statue's own greys (PAL hi and lit), one step up from the goo's #26292c / #161a1d; no wet shine
  const STONE_O = { x: 0, footY: 0, H: 0, t: 0, hurt: 1, pain: 1, sad: 1, anger: 1, lash: 1, hx: 0, pal: STONE, angular: true };
  const EDGE = new Float64Array(13);   // the hardening front's ragged edge: fixed offsets (fractions of H) at 13 rows
  for (let i = 0; i < 13; i++) EDGE[i] = (GenTitanFight.rnd(i, 21) - 0.5) * 0.05;
  // From the lash end (8.2 s) the goo layer g (already painted live) turns to stone: the front runs from the far arm tip to the Slime's foot; behind it the body is repainted
  // with its clock stopped at 8.2 (no wobble, drips or lip motion), in stone greys, with a hard angular front and flat facets; the cracks come over it from 9.0.
  function stoneOver(g, sl, hx, tt) {
    const H = G.H, ff = sl.ff, st = ff.stone, ww = g.canvas.width, hh = g.canvas.height;
    if (!stoneC) stoneC = document.createElement("canvas");
    if (stoneC.width !== ww || stoneC.height !== hh) { stoneC.width = ww; stoneC.height = hh; }
    const h = stoneC.getContext("2d");
    h.setTransform(1, 0, 0, 1, 0, 0); h.clearRect(0, 0, ww, hh); h.setTransform(g.getTransform());
    STONE_O.x = sl.x; STONE_O.footY = FOOT * H; STONE_O.H = H; STONE_O.hx = hx; STONE_O.hollowH = 0.4 * H;STONE_O.t = Math.max(0, sl.t - (tt - GenTitanFight.T.lash[0]));
    GenTitanBodies.draw(NAMES[2], h, STONE_O);
    h.save();
    h.globalCompositeOperation = "source-atop";
    // (the mound's own shade split, offset from its outline, already makes the right side dark: no rect over it)
    for (let i = 0; i < 11; i++) {   // flat angular facets over the hood column, both arms and the base: left-facing planes lit, the rest shade
      const a = GenTitanFight.rnd(i, 31), b = GenTitanFight.rnd(i, 33), r = GenTitanFight.rnd(i, 35), c = GenTitanFight.rnd(i, 37);
      const x = i < 3 ? hx + (-0.04 + 0.08 * a) * H : hx + (-0.36 + 0.8 * a) * H, y = i < 3 ? (FOOT - 0.55 - 0.35 * i - 0.05 * b) * H : (FOOT - 0.08 - 0.6 * b) * H, w = (0.07 + 0.06 * r) * H, v = (0.05 + 0.06 * c) * H;
      h.fillStyle = (r + c > 0.9 || x < hx - 0.12 * H) ? STONE.lit : STONE.shade;
      h.beginPath(); h.moveTo(x, y); h.lineTo(x + w, y - 0.4 * v); h.lineTo(x + 0.8 * w, y + v); h.lineTo(x + 0.1 * w, y + 0.7 * v); h.closePath(); h.fill();
    }
    h.restore();
    GenTitanFight.drawCracks(h, hx, (FOOT - 0.3) * H, H, ff.crack);
    if (st >= 1 && tt >= BURST) { GenTitanFight.shards(g, stoneC, hx, (FOOT - 0.3) * H, H, tt - BURST); return; }
    if (st >= 1) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, ww, hh); g.drawImage(stoneC, 0, 0); g.restore(); return; }
    // the front rises from the base: a ragged horizontal edge sweeping up through the whole mound, so the stone covers its own outline and no vertical seam shows
    const yf = (FOOT + 0.1) * H - 1.35 * H * st * st * (3 - 2 * st), x0 = hx - 0.8 * H, dx = 1.6 * H / 12;
    g.save();
    g.beginPath(); g.moveTo(x0 - 3 * H, yf + 2 * H); g.lineTo(x0 - 3 * H, yf + EDGE[0] * H); g.lineTo(x0, yf + EDGE[0] * H);
    for (let i = 1; i < 13; i++) g.lineTo(x0 + i * dx, yf + EDGE[i] * H);
    g.lineTo(x0 + 12 * dx + 3 * H, yf + EDGE[12] * H); g.lineTo(x0 + 12 * dx + 3 * H, yf + 2 * H); g.closePath();
    g.globalCompositeOperation = "destination-out"; g.fill();   // the goo behind the front goes; the stone takes its place
    g.globalCompositeOperation = "source-over"; g.clip();
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(stoneC, 0, 0);
    g.restore();
    g.save();   // the front itself: a ragged hard band of the lit value, 3 to 5 px wide, on the stone side only
    g.globalCompositeOperation = "source-atop"; g.fillStyle = STONE.lit;
    const bw = (3 + 2 * st) / g.getTransform().a;
    g.beginPath(); g.moveTo(x0 - 3 * H, yf + EDGE[0] * H); g.lineTo(x0, yf + EDGE[0] * H);
    for (let i = 1; i < 13; i++) g.lineTo(x0 + i * dx, yf + EDGE[i] * H);
    g.lineTo(x0 + 12 * dx + 3 * H, yf + EDGE[12] * H);
    g.lineTo(x0 + 12 * dx + 3 * H, yf + EDGE[12] * H + bw);
    for (let i = 12; i >= 0; i--) g.lineTo(x0 + i * dx, yf + EDGE[i] * H + bw * (0.7 + 0.6 * ((i * 5) % 3) / 2));
    g.lineTo(x0 - 3 * H, yf + EDGE[0] * H + bw);
    g.closePath(); g.fill();
    g.restore();
  }
  function draw(ctx, tb) {
    if (!on(tb)) return;
    const tm = tb - 3.45;
    const late = LATE, slimeLash = LASH;
    late.on = false; slimeLash.on = false;

    LAYOUT.titans.forEach((t, i) => {
      const k = snaps(i, tm), rp = GenMatter.rockPose(i);
      if (i === victim() && !G.reduced) { const ts = G.secs("break"); if (ts >= FIRE_T[0]) { drawVictim(ctx, t, i, ts); return; } }
      if (k === 0) { if (rp) GenMatter.drawRockAt(ctx, GenMatter.ROCKS[t.rock], rp.x, rp.y, rp.rot, rp.size); return; }
      const tt = G.secs("trade"), tc = Math.min(tt, BURST - 0.001), frozen = tt >= BURST && tt < BURST + (i === 2 ? GenTitanFight.SHARD_LIFE : GenTitanFight.HOLD) && !G.reduced;   // frozen: the warp tears the last pose apart (the Slime's stone breaks into pieces over SHARD_LIFE)
      const hurtable = (i === 0 || i === 2) && k === 5 && tt >= 0 && (tt < BURST || frozen) && !G.reduced;
      const c = bodyLayer(i, bodyT(i, tm, k), hurtable ? GenTitanFight.level(GenTitanFight.at(tc)) : 0, hurtable && i === 2 ? GenTitanFight.at(tc) : null), lp = layerPos(t, layers[i].wide);
      if (k === 5 && tt >= 0) {
        // the close-in: one smooth move over the fight's close phase to the meet point (Hollow on it, Statue and Slime 0.4 H either side), then they stand until the burst (reduced motion: gone from trade 0)
        if ((tt < BURST || frozen) && !G.reduced && i !== victim()) {
          const ff = GenTitanFight.at(tc), f = ff.close, sm = f * f * (3 - 2 * f), dx = (G.sx(0) + (i - SURVIVOR) * 0.4 * G.H - tx(t)) * sm;
          if (i === SURVIVOR && ff.raise > 0) { late.on = true; late.x = tx(t) + dx; late.t = bodyT(i, tm, k); late.arms = ff.raise; late.ff = ff; return; }   // painted after the loop: rays go behind it, in front of the others
          if (i === 2 && ff.lash > 0) { slimeLash.on = true; slimeLash.x = tx(t) + dx; slimeLash.t = bodyT(i, tm, k); slimeLash.ff = ff; }   // painted after the loop, in front of the Hollow
          else { if (frozen) { ctx.save(); GenTitanFight.thin(ctx, tt, G.H); } ctx.drawImage(c, lp[0] + dx, lp[1]); if (frozen) ctx.restore(); }
          if (hurtable && !slimeLash.on && tt < BURST) GenTitanFight.drawChips(ctx, tt, NAMES[i], tx(t) + dx, FOOT * G.H, G.H, bodyT(i, tm, k), G.sx(0));
        }
        if (!G.reduced && tt >= BURST && tt < BURST + 0.8 && (i === 0 || i === 2)) GenTitanFight.drawChips(ctx, tt, NAMES[i], G.sx(0) + (i - SURVIVOR) * 0.4 * G.H, FOOT * G.H, G.H, bodyT(i, tm, k), G.sx(0));   // the fight's last chips finish their fall after the burst (bodies are gone)
        if (i === SURVIVOR && !G.reduced && tt >= D_T0 && dStep(tt) >= 0 && dStep(tt) < 2) placeD(ctx, tt, dStep(tt));
        return;
      }
      if (k === 5 || !rp) { const sw = k === 5 && tt < 0 && swayApply(ctx, i, t, tm); ctx.drawImage(c, lp[0], lp[1]); if (sw) ctx.restore(); return; }
      const bb = bodyBox(t), u = k / 5, s = mixv(Math.max(0.35, Math.min(1, 2 * rp.size / bb.h)), 1, u);
      const gx = mixv(rp.x, bb.x, u), gy = mixv(rp.y, bb.y, u), gr = mixv(rp.rot, 0, u);
      ctx.save();
      ctx.translate(gx, gy); ctx.rotate(gr); ctx.scale(s, s); ctx.translate(-bb.x, -bb.y);
      ctx.drawImage(c, lp[0], lp[1]);
      ctx.restore();
      ctx.save();
      ctx.filter = "grayscale(" + u.toFixed(3) + ") brightness(" + mixv(1, 0.23, u).toFixed(3) + ")";
      GenMatter.drawRockAt(ctx, GenMatter.ROCKS[t.rock], gx, gy, gr, rp.size);
      ctx.restore();
    });
    const frz = G.secs("trade") >= BURST && G.secs("trade") < BURST + GenTitanFight.HOLD;
    if (frz) { ctx.save(); GenTitanFight.thin(ctx, G.secs("trade"), G.H); }
    let hollowInLash = false;
    function drawHollow(c2, lt, ls) {
      const kb = Math.max(0, Math.min(1, (ls - 0.52) / 0.1)), ke = kb * kb * (3 - 2 * kb);   // the crash's knock-back: one rigid tilt away from the Slime (it stands on his right) and a small sink, about his foot
      c2.save();
      if (ke > 0) { c2.translate(lt.x, FOOT * G.H + 0.012 * G.H * ke); c2.rotate(-0.14 * ke); c2.translate(-lt.x, -FOOT * G.H); }
      GenTitanBodies.draw(NAMES[SURVIVOR], c2, LATE_O);
      c2.restore();
    }
    if (late.on) {   // he keeps drawing under the Slime's mound until the stone phase (the rays end themselves at cover 1)
      GenTitanFight.drawRays(ctx, late.x, (FOOT - 0.3) * G.H, 1.5 * G.H, late.ff);
      LATE_O.x = late.x; LATE_O.footY = FOOT * G.H; LATE_O.H = G.H; LATE_O.t = late.t; LATE_O.arms = late.arms;
      LATE_O.drop = Math.max(0, Math.min(1, (late.ff.lash - 0.48) / 0.12));   // the wave slams both arms down (rigid, eased inside the body draw)
      // the swallow: he stands where he is until the wave hits (0.52 to 0.62 knock-back) and holds under the goo
      const ls = late.ff.lash;
      if (slimeLash.on) hollowInLash = true;   // drawn first on the lash layer below, so the Slime's passes (and its bites) go over him
      else drawHollow(ctx, late, ls);
    }
    if (frz) ctx.restore();   // the stone pieces below are not thinned
    if (slimeLash.on) {
      const cv = ctx.canvas, tt = G.secs("trade");
      if (!lashC) lashC = document.createElement("canvas");
      if (lashC.width !== cv.width || lashC.height !== cv.height) { lashC.width = cv.width; lashC.height = cv.height; }
      const g = lashC.getContext("2d");
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, lashC.width, lashC.height); g.setTransform(ctx.getTransform());
      LASH_O.x = slimeLash.x; LASH_O.footY = FOOT * G.H; LASH_O.H = G.H; LASH_O.t = slimeLash.t - Math.max(0, tt - GenTitanFight.T.lash[0]); LASH_O.lash = slimeLash.ff.lash; LASH_O.hx = late.on ? late.x : G.sx(0); LASH_O.hollowH = 0.4 * G.H;
      if (hollowInLash) {   // the Hollow first, then the Slime on its own layer (its bites and lid cut only its own paint), over him
        drawHollow(g, late, late.ff.lash);
        if (!slimeC) slimeC = document.createElement("canvas");
        if (slimeC.width !== cv.width || slimeC.height !== cv.height) { slimeC.width = cv.width; slimeC.height = cv.height; }
        const s2 = slimeC.getContext("2d");
        s2.setTransform(1, 0, 0, 1, 0, 0); s2.clearRect(0, 0, slimeC.width, slimeC.height); s2.setTransform(ctx.getTransform());
        GenTitanBodies.draw(NAMES[2], s2, LASH_O);
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(slimeC, 0, 0); g.restore();
      } else GenTitanBodies.draw(NAMES[2], g, LASH_O);
      if (slimeLash.ff.stone > 0) stoneOver(g, slimeLash, LASH_O.hx, tt);
      if (tt >= BURST && tt < BURST + GenTitanFight.HOLD) {   // inside the span's box (from 0.58 H) the mound keeps the frozen, thinned pose it had; the pieces above it are clipped away from the box
        const yb = Math.floor(0.575 * G.H * cv.width / G.W);
        ctx.save(); GenTitanFight.thin(ctx, tt, G.H); ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.beginPath(); ctx.rect(0, yb, cv.width, cv.height - yb); ctx.clip();
        ctx.drawImage(stoneC, 0, 0); ctx.restore();
      }
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(lashC, 0, 0); ctx.restore();
      if (frz) { ctx.save(); GenTitanFight.thin(ctx, tt, G.H); }
      GenTitanFight.drawChips(ctx, G.secs("trade"), NAMES[2], slimeLash.x, FOOT * G.H, G.H, slimeLash.t, LASH_O.hx);
      if (frz) ctx.restore();
    }
    buildDebris();
    if (!G.reduced) { drawChips(ctx, G.secs("trade"), true); drawStatueBurst(ctx, G.secs("trade")); }
  }

  return { on, draw, bigD, LAYOUT, buildDebris, debrisSteps,drawDebris, partRest };
})();
