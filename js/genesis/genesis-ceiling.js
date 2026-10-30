/* The ceiling (Genesis first segment): big overlapping copies of the one sketched cloud drifting left to right across the top of the frame.
   Copies sit in three height lanes, 0.35-0.5 W wide, their tops above the screen edge so only the layered underside shows (the front
   layer's lowest sag reaches 0.19 / 0.21 / 0.225 H by lane, plus a little per copy). Each copy has its own seed and width; all drift at the same
   speed (14 px/s at 1440 W), evenly spaced with about 25-30% overlap so the top edge stays covered; each has a small bob; its three layers also sway on their own (GenCeilClouds).
   A cloud's place is a pure function of (index, t, camera): world x = start + speed * t, wrapped over a span of several screens
   (it leaves the right edge of the span and re-enters on the left), screen x = world x - Gen.cam * W. Each cloud hangs 4 objects (one per layer at least; a sprout or metal arc on the back and middle, a long tuft and
   a second front one that is rarely a dealt extra) from its anchors(seed); they are drawn each frame from the cloud's current
   position (with their layer's sway) just before their layer, so it covers the root, and the root never leaves the anchor. The band above them is symbolic wind, not water (paintGas): a flat navy base with irregular gusts of pale strokes over it (they draw on, curl, then erase from the tail, half behind the objects and half over them, with calm gaps between gusts); its lower edge rises, surges and settles with the floor sea's level; the objects sit in it with their upper third sunk. No wave bob, no ripples.
   draw(ctx, W, H, k, t): k is the sea's rise (the "started" gate); the ceiling's arrival follows GenElem.seaLevel, the floor's own level; t is 0 when reduced (still, fully grown). */
(function () {
  "use strict";
  const BASEF = 0.24;   // the band's lower edge (fraction of H) the layout passes measure from: the surge carries it to about this on screen
  const BAND = 0.19, UP = 0.01, SPAN_SCREENS = 5, NC = 16, HEAD = 24;
  const LANE = [0.19, 0.21, 0.225];     // where the front layer's lowest sag reaches, fraction of H (plus up to 0.01 per copy; the sag with bob stays under 0.24)

  function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function smooth(x) { return x * x * (3 - 2 * x); }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function mod(a, b) { return ((a % b) + b) % b; }

  const DECKS = {};
  // deck c: K.deck(c + 1), its first HEAD cards swapped for middle ones where they sit in deck c-1's last HEAD
  // cards, so the deal is one continuous no-repeat sequence over every integer card index
  function deckOf(c) {
    if (DECKS[c]) return DECKS[c];
    const K = window.GenCeilKinds, d = K.deck(c + 1), prev = K.deck(c), len = d.length, tail = prev.slice(len - HEAD);
    for (let i = 0; i < HEAD && i < len; i++) {
      if (tail.indexOf(d[i]) < 0) continue;
      for (let j = HEAD; j < len - HEAD; j++) if (tail.indexOf(d[j]) < 0) { const x = d[i]; d[i] = d[j]; d[j] = x; break; }
    }
    return (DECKS[c] = d);
  }
  function card(g) {
    const len = window.GenCeilKinds.list().length, cyc = Math.floor(g / len);
    return deckOf(cyc)[g - cyc * len];
  }

  // the clouds, built once per screen width: { kd, seed, wf (width / W), x0 (fraction of span), v (speed, fraction of W per s),
  // lane, ph, objs: [{ o, a }] }
  let CLOUDS = null, builtW = -1;
  function build(W) {
    const kinds = window.GenCeilClouds.deck(7, NC);
    CLOUDS = [];
    for (let i = 0; i < NC; i++) {
      const kd = kinds[i], seed = Math.floor(hash(i * 3.1 + 0.7) * 1000);
      const wf = 0.4 + 0.06 * hash(i * 5.3 + 1.9), an = kd.anchors(seed), L = window.GenCeilKinds.list();
      const by = (nm) => L.filter((q) => q.name === nm)[0];
      const c = { kd: kd, seed: seed, wf: wf, x0: i / NC, v: 14 / 1440, jit: 0.01 * hash(i * 4.7 + 3.3),
        lane: (i * 2) % 3, ph: hash(i * 9.7 + 2.2) * 6.283, objs: [] };
      // back, middle, front (forced tuft), second front (a dealt extra on about one copy in four, else the other original)
      const ks = [by(i % 2 ? 'sprout' : 'fin'), by(i % 2 ? 'fin' : 'sprout'), by('tuft'), hash(i * 6.1 + 5.5) < 0.25 ? card(i) : by(i % 3 ? 'sprout' : 'fin')];
      const as = [an[i % 2], an[2], an[3 + i % 3], an[3 + (i + 1) % 3]];
      for (let j = 0; j < 4; j++) {
        const kk = ks[j], s = hash((i * 40 + j) * 7.7 + 2.9) * 100, r = hash(s + 36), r2 = hash(s + 37);
        const o = { kd: kk, i: i * 40 + j, len: kk.len[0] + (kk.len[1] - kk.len[0]) * r, n: kk.n[0] + Math.floor(r2 * (kk.n[1] - kk.n[0] + 1)), w: hash(s + 31), ph: hash(s + 32) * 6.3, amp: 0.5 + hash(s + 33) * 0.9, dir: hash(s + 34) < 0.5 ? 1 : -1, th: 0.45 + 0.4 * hash(s + 35) };
        if (j === 2) o.len = 0.13 + 0.03 * r;      // long blades: at least 30 px show below the fill
        o.rnd = (q) => hash(s + q);
        c.objs.push({ o: o, a: as[j] });
      }
      CLOUDS.push(c);
    }
    builtW = W;
  }

  // the ceiling's own growth clock: starts when the sea first rises, restarts if the scene restarts
  let t0 = null, lastT = 0;

  // called by the cloud just before layer li is filled: draw the objects hanging from that layer, at its current offset
  const cur = {};
  function hang(li, dx, dy) {
    const c = cur.c;
    for (let j = 0; j < c.objs.length; j++) {
      const q = c.objs[j], o = q.o, p = clamp01(cur.kd);
      if (q.a.l !== li || p <= 0) continue;
      o.kd.draw(cur.ctx, o, cur.x + dx + q.a.u * cur.s, cur.y + dy + q.a.v * cur.h, cur.H, p, cur.t, cur.sc, cur.pal);
    }
  }

  // the owner's layers72 pool (media/genesis-ceiling/ceil72.json): pieces [file, w, h, ax, ay, hang u,v ...]; tip = random windows of the
  // whole picture (ends faded 70 px), obj = object clouds, tiny = small clouds
  const POOL = {
    tip: [["tip1", 516, 539, 258, 0, [0.1, 0.571, 0.173, 0.579, 0.245, 0.547, 0.318, 0.709, 0.391, 0.803, 0.464, 0.902, 0.536, 0.878, 0.609, 0.866, 0.682, 0.922, 0.755, 0.991, 0.827, 0.991, 0.9, 0.991]], ["tip2", 749, 546, 374, 0, [0.1, 0.438, 0.173, 0.617, 0.245, 0.586, 0.318, 0.575, 0.391, 0.738, 0.464, 0.927, 0.536, 0.899, 0.609, 0.894, 0.682, 0.991, 0.755, 0.991, 0.827, 0.991, 0.9, 0.991]], ["tip3", 529, 490, 264, 0, [0.1, 0.922, 0.173, 0.959, 0.245, 0.967, 0.318, 0.955, 0.391, 0.965, 0.464, 0.955, 0.536, 0.971, 0.609, 0.857, 0.682, 0.882, 0.755, 0.904, 0.827, 0.99, 0.9, 0.99]], ["tip4", 508, 588, 254, 0, [0.1, 0.968, 0.173, 0.983, 0.245, 0.927, 0.318, 0.896, 0.391, 0.94, 0.464, 0.991, 0.536, 0.991, 0.609, 0.974, 0.682, 0.991, 0.755, 0.99, 0.827, 0.971, 0.9, 0.67]], ["tip5", 527, 560, 263, 0, [0.1, 0.652, 0.173, 0.657, 0.245, 0.836, 0.318, 0.845, 0.391, 0.812, 0.464, 0.825, 0.536, 0.877, 0.609, 0.957, 0.682, 0.991, 0.755, 0.991, 0.827, 0.991, 0.9, 0.902]], ["tip6", 524, 577, 262, 0, [0.1, 0.991, 0.173, 0.991, 0.245, 0.938, 0.318, 0.983, 0.391, 0.991, 0.464, 0.96, 0.536, 0.899, 0.609, 0.879, 0.682, 0.898, 0.755, 0.906, 0.827, 0.965, 0.9, 0.96]]],
    obj: [["obj1", 297, 165, 159, 0, [0.25, 0.891, 0.5, 0.618, 0.75, 0.867]], ["obj2", 485, 256, 242, 0, [0.25, 0.809, 0.5, 0.996, 0.75, 0.746]], ["obj4", 304, 205, 182, 0, [0.25, 0.873, 0.5, 0.805, 0.75, 0.976]], ["obj5", 343, 188, 157, 0, [0.25, 0.883, 0.5, 0.628, 0.75, 0.888]]],
    tiny: [["tiny1", 158, 52, 123, 0], ["tiny2", 166, 57, 38, 0], ["tiny3", 160, 51, 124, 0], ["tiny4", 160, 52, 34, 0], ["tiny5", 130, 41, 102, 0], ["tiny6", 123, 42, 27, 0]]
  };
  const HANG_SCALE = 0.5;  // hangers are this share of their original length
  const SCALE = 0.7, TSCALE = 0.85;  // object / tiny piece scale = H / 900 * SCALE; tip windows H / 900 * TSCALE
  const SPAN_W = 4;                 // layout span, in screen widths
  const FADE = 70, PER_SCREEN = 12.8;  // baked fade width of a tip's ends (source px); old ceiling: 16 clouds x 4 objects over 5 screens
  const V_TIP = 11 / 1440, V_OBJ = 14 / 1440;   // drift, fraction of W per s
  // no picture is fetched: every item is a code-drawn cloud; IMG only gives each pool entry a distinct id for the layout's lookups
  const IMG = { tip: POOL.tip.map(() => ({})), obj: POOL.obj.map((q) => q[0]), tiny: POOL.tiny.map((q) => q[0]) };

  function shade(hex, f) {   // f > 0 toward white, f < 0 toward black
    const n = parseInt(hex.slice(1), 16), t = f > 0 ? 255 : 0, a = Math.abs(f);
    const c = (v) => Math.round(v + (t - v) * a);
    return "rgb(" + c(n >> 16 & 255) + "," + c(n >> 8 & 255) + "," + c(n & 255) + ")";
  }
  function spiral(p, cx, cy, R, turns, ph) {
    const N = Math.round(18 * turns);
    for (let s = 0; s <= N; s++) {
      const f = s / N, a = ph + f * turns * 6.283, r = R * (0.12 + 0.88 * f);
      if (s) p.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); else p.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
  }
  // a cloud's shape, built once per item in its own px (unmirrored): big = lumpy silhouette with lobes under its hang points, a flat top that
  // tucks into the band, lighter inner patches, spiral swirls; tiny = a spiral curl with a tail trailing sideways
  function shape(it, q, seed, noMetal, force) {
    const w = it.w, h = it.h, hs = (n) => hash(seed + n * 1.7), P = (window.GenEldPal && window.GenEldPal.CEILCLOUD) || ["#061c48", "#164436", "#382b43"];
    const base = P[0];   // lobe clouds are the deep navy only: db1eeb0's pick, and a cloud whose pick is not navy is removed (it.gone) after dress
    it.gone = false;
    it.fill = base; it.edge = shade(base, -0.45); it.hi = shade(base, 0.14); it.mark = shade(base, 0.3);
    it.lw = Math.max(1.5, h * 0.06);
    const p = new Path2D(), pt = new Path2D(), sw = new Path2D();
    it.type = 'cloud';
    if (it.tiny) {
      const R = h * 0.42, cy = h * 0.5, turns = 2 + hs(1);
      const ph = hs(3) * 6.283, ea = ph + turns * 6.283;
      spiral(sw, R + 2, cy, R, turns, ph);
      it.sp = new Path2D(sw);   // the swirl alone; tp = the tail (from, control, to) and the swirl's centre x, kept so layout can mirror or drop the tail
      it.tp = { x0: R + 2 + R * Math.cos(ea), y0: cy + R * Math.sin(ea), cx: w * 0.5, cy: cy + h * (hs(4) - 0.5) * 0.9, x1: w - 2, y1: cy + h * (hs(5) - 0.5) * 0.5, sx: R + 2 };
      sw.quadraticCurveTo(it.tp.cx, it.tp.cy, it.tp.x1, it.tp.y1);
      it.sw = sw;
      return;
    }
    // odd kinds by seed: metal about 1 in 10 (never right after another metal), the rest the soft lobe cloud
    const kz = force === 'metal' ? 0 : hs(7);
    if (kz < 0.1 && !noMetal) {
      const M = (window.GenEldPal && window.GenEldPal.CEILOBJ) || ["#8b7d57", "#555e69", "#818a96", "#434a54"], mc = [M[3], M[6]].filter(Boolean)[Math.floor(hs(2) * 2) % 2] || M[0];   // dark greys only: the ochre sheen shows on every rock
      it.fill = mc; it.edge = shade(mc, -0.45); it.hi = shade(mc, 0.3); it.mark = mc; it.metal = true; it.type = 'metal';
      const pits = new Path2D(), lips = new Path2D(), cr = new Path2D();
      it.eyes = window.GenCeilShapes.metal(w, h, hs, p, pt, pits, lips, cr, it.m);   // eye sites on the rock's face: each a crack that opens into an eye
      for (let i = 0; i < it.eyes.length; i++) { it.eyes[i].look = Math.floor(hs(i + 600) * 4) % 4; it.eyes[i].size = h * (0.18 + 0.1 * hs(i + 610)); }
      if (it.eyes.length) it.eyes[0].look = 1;   // the first eye is red and held open (drawOne) at the break beat, t 5.9
      it.p = p; it.pt = pt; it.pits = pits; it.lips = lips; it.cr = cr; it.sw = sw;
      return;
    }
    it.gone = Math.floor(hs(0) * 3) !== 0;
    const L = [], u = q[5];
    for (let a = 0; a + 1 < u.length; a += 2) { const r = h * (0.2 + 0.06 * hs(a + 10)); L.push([u[a] * w, u[a + 1] * h - 0.5 * r, r]); }
    const nh = L.length;
    for (let n = 2 +Math.floor(hs(5) * 5); n > 0; n--) {
      const r = h * (0.16 + 0.12 * hs(n + 20)); L.push([w * (0.07 + 0.86 * hs(n + 30)), Math.min(h * (0.45 + 0.25 * hs(n + 40)), h - r * 0.9), r]);
    }
    for (let n = 0; n < nh + 3; n++) { const r = h * (0.26 + 0.06 * hs(n + 90)); L.push([n < nh ? L[n][0] : w * (0.12 + 0.76 * hs(n + 95)), r * 0.92, r]); }   // top lobes: join each lobe to the band
    for (let n = 0; n < L.length; n++) { p.moveTo(L[n][0] + L[n][2], L[n][1]); p.arc(L[n][0], L[n][1], L[n][2], 0, 6.283); }
    for (let n = 0; n < 2; n++) { const l = L[Math.floor(hs(n + 50) * L.length)]; pt.moveTo(l[0] + l[2] * 0.55, l[1] - l[2] * 0.15); pt.arc(l[0], l[1] - l[2] * 0.15, l[2] * 0.55, 0, 6.283); }
    for (let n = 1 + Math.floor(hs(6) * 3); n > 0; n--) { const l = L[Math.floor(hs(n + 60) * L.length)]; spiral(sw, l[0], l[1], l[2] * 0.5, 1.5 + hs(n + 70), hs(n + 80) * 6.283); }
    it.mk = hs(8) < 0.5 ? 'B2' : 'B4'; it.ms = seed;   // the lobes above are only the cloud's outline (roots, hit tests, painted bounds); the body painted is the membrane built in paint()
    it.p = p; it.pt = pt; it.sw = sw;
  }

  // painted bounds of an item's shape in its own px (unmirrored): pt..pb rows and px0..bx1 columns with alpha > 0, read once from a scratch canvas
  function paint(it) {
    it.bt = 0; it.bh = it.h; it.bx0 = 0; it.bx1 = it.w;
    if (it.tip || it.tiny || !it.p) return;
    const ox = 10, oy = Math.ceil(it.h * 0.5) + 10, cw = Math.ceil(it.w) + 20, ch = Math.ceil(it.h * 2) + 20, c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const g = c.getContext('2d'); g.translate(ox, oy); g.fillStyle = '#000'; g.strokeStyle = '#000'; g.lineWidth = 3; g.fill(it.p); g.stroke(it.p);
    const d = g.getImageData(0, 0, cw, ch).data; let r0 = ch, r1 = -1, c0 = cw, c1 = -1;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (d[(y * cw + x) * 4 + 3] > 0) { if (y < r0) r0 = y; if (y > r1) r1 = y; if (x < c0) c0 = x; if (x > c1) c1 = x; }
    if (r1 < 0) return;
    it.bt = r0 - oy; it.bh = r1 + 1 - r0; it.bx0 = c0 - ox; it.bx1 = c1 + 1 - ox;
    if (it.mk) it.mem = window.GenCeilMembrane.build(it.mk, it.bx0, it.bt, it.bx1 - it.bx0, it.bh, it.ms);   // the membrane fills the old cloud's painted box
  }

  // the layout, built once per size: ITEMS in draw order { im, x (in the span), y, w, h, m (mirrored), v (drift), wa, wf, wp (wobble), hs: [{ o, u, v }] }
  let ITEMS = null, SPAN = 0, pW = -1, pH = -1, rs = 0, camNow = 0;
  function rnd() { return hash(++rs * 1.37 + 91.3); }
  function pick(n, a, b) { let i; do { i = Math.floor(rnd() * n); } while (i === a || i === b); return i; }

  // one resolve pass after layout (at the layout positions, base at BASEF H): the rocks, every hanger and the rocks' eyes are drawn behind the clouds, so a hanger
  // only has to keep clear of a rock's body and eyes (it stops 6 px above them or is dropped) and a cloud simply hides what is behind it; every tip stays above the red line
  // at 0.28 H; two roots closer than max(14, 0.012 W) with overlapping spans lose the later-seeded one (o.i); a big front cloud left under two hangers takes the nearest
  // spacing-dropped hanger back on a free anchor of its outline
  const RESOLVE = { shortened: 0, red: 0, space: 0, low: 0 };
  function resolveHangers(W, H) {
    const mc = (window.GenCeilMeasure = window.GenCeilMeasure || document.createElement('canvas')).getContext('2d'), N = ITEMS.length;
    const lowAt = () => BASEF * H;
    const yOf = (it) => it.tip ? 0 : lowAt(it.x + it.w * 0.5) - it.bh - it.bt;   // the drawn top of the body
    const er = (e) => 1.6 * Math.max(1.25 * e.size, 15);   // an eye's disc
    const YS = ITEMS.map(yOf), R = RESOLVE;
    R.shortened = R.red = R.space = R.low = 0; R.before = R.rerooted = R.rock = R.corner = R.own = 0;
    for (let n = 0; n < N; n++) R.before += ITEMS[n].hs.length;
    // first sample (every 4 px down from the root, then the stem's width at its tip) of the line that lies in a rock's body or eye discs other than item skip's; -1 if none
    const rockFirst = (rx, ry, len, hw, skip) => {
      let best = -1;
      for (let m = 0; m < N; m++) {
        const B = ITEMS[m];
        if (m === skip || !B.metal || !B.p) continue;
        for (let wr = -1; wr <= 1; wr++) {
          const bx = B.x + wr * SPAN, by = YS[m];
          const inside = (px, py) => {
            const lx = B.m ? B.w - (px - bx) : px - bx, ly = py - by;
            if (lx < -B.w * 0.1 || lx > B.w * 1.1 || ly < -B.h * 0.1 || ly > B.h * 1.1) return false;
            if (ly >= B.bt + B.hf * B.bh && (mc.isPointInPath(B.p, lx, ly) || mc.isPointInPath(B.lo, lx, ly))) return true;   // above its cut line the band covers the outline; the eye discs are tested at every sample
            if (B.eyes) for (let k = 0; k < B.eyes.length; k++) { const e = B.eyes[k]; if (Math.hypot(lx - e.x, ly - e.y) < er(e)) return true; }
            return false;
          };
          let hit = -1;
          for (let s = 0; s <= len && hit < 0; s += 4) if (inside(rx, ry + s)) hit = s;
          if (hit < 0) for (const [dx, dy] of [[0, hw], [hw, 0], [-hw, 0]]) if (inside(rx + dx, ry + len + dy)) { hit = len; break; }
          if (hit >= 0 && (best < 0 || hit < best)) best = hit;   // the nearest rock along the stem
        }
      }
      return best;
    };
    // a point (resolve frame) inside the body of cloud item m (not its own metal rocks) below its cut line, at any wrap; the body as the clouds are filled
    const inBody = (m, px, py) => {
      const B = ITEMS[m];
      for (let wr = -1; wr <= 1; wr++) {
        const bx = B.x + wr * SPAN, lx = B.m ? B.w - (px - bx) : px - bx, ly = py - YS[m];
        if (lx < 0 || lx > B.w || ly < B.bt + B.hf * B.bh || ly > B.h) continue;
        if (mc.isPointInPath(B.p, lx, ly)) return true;
      }
      return false;
    };
    // a hanger kept as it stands (true) or dropped (false); a kept one may be shortened (o.len)
    const settle = (A, n, q, rx, ry) => {
      const o = q.o, hw = A.h * 0.06, full = o.full * HANG_SCALE * H;   // the floor is 0.45 of the length before any cut
      let len = o.len * HANG_SCALE * H;
      for (let pass = 0; pass < 4; pass++) {   // a cut is re-tested: the shorter stem may still touch a nearer rock
        const first = rockFirst(rx, ry, len, hw, n);
        if (first === 0) { R.rock++; return false; }
        if (first < 0) break;
        len = Math.min(len, first - 6); if (len < full * 0.45) { R.rock++; return false; }
      }
      if (ry + len > 0.28 * H) {
        len = 0.28 * H - ry;
        if (len < full * 0.45) { R.red++; return false; }
      }
      if (len < o.len * HANG_SCALE * H) o.len = len / (HANG_SCALE * H);
      return true;
    };
    for (let n = 0; n < N; n++) {
      const A = ITEMS[n];
      for (let j = A.hs.length - 1; j >= 0; j--) {
        const q = A.hs[j], o = q.o;
        if (o.full == null) o.full = o.len;
        const rx = A.x + q.u * A.w, ry = A.tip ? lowAt(rx) - 4 : YS[n] + q.v * A.h, full = o.len * HANG_SCALE * H, hw = A.h * 0.06;
        let len = full, drop = false;
        if (A.metal && !A.tip && A.p) {   // a rock's own hanger: none from its left or right corner, and none curling across its own eyes
          const wd = o.kd.name === 'worm' ? hw * (1 + o.amp) : hw, lx = A.m ? A.w - q.u * A.w : q.u * A.w, ly = ry - YS[n];
          if (lx - A.bx0 < wd || A.bx1 - lx < wd) { A.hs.splice(j, 1); R.corner++; continue; }
          if (A.eyes) for (let s = 0; s <= len && !drop; s += 4) for (let k = 0; k < A.eyes.length; k++) { const e = A.eyes[k]; if (Math.hypot(lx - e.x, ly + s - e.y) < er(e) + wd) { if (s === 0 || s - 6 < full * 0.45) drop = true; else len = s - 6; break; } }
          if (drop) { A.hs.splice(j, 1); R.own++; continue; }
          o.len = len / (HANG_SCALE * H);
        }
        if (!settle(A, n, q, rx, ry)) A.hs.splice(j, 1);
      }
    }
    // spacing, in seed order (o.i): the later-seeded one of two close hangers drops
    const gap = Math.max(14, 0.012 * W), all = [], alive = [], lost = [];
    for (let n = 0; n < N; n++) for (let j = 0; j < ITEMS[n].hs.length; j++) all.push({ n: n, q: ITEMS[n].hs[j] });
    all.sort((a, b) => a.q.o.i - b.q.o.i);
    const clashes = (rx, ry, len) => alive.some((a) => Math.min(Math.abs(a.x - rx), SPAN - Math.abs(a.x - rx)) < gap && ry < a.y + a.len && a.y < ry + len);
    const where = (A, n, q) => { const rx = A.x + q.u * A.w; return [rx, A.tip ? lowAt(rx) - 4 : YS[n] + q.v * A.h]; };
    for (let k = 0; k < all.length; k++) {
      const A = ITEMS[all[k].n], q = all[k].q, w = where(A, all[k].n, q), len = q.o.len * HANG_SCALE * H;
      if (clashes(w[0], w[1], len)) { A.hs.splice(A.hs.indexOf(q), 1); lost.push({ n: all[k].n, q: q }); R.space++; }
      else { alive.push({ x: w[0], y: w[1], len: len, q: q }); if (w[1] + len > R.low) R.low = w[1] + len; }
    }
    // the cloud (any but its own: the hanger pass runs before both cloud passes) that covers the hanger's root or the point 45% along it, or -1; (dx, dy) is the root in the drawn frame (item y)
    const coverOf = (n, dx, dy, len) => {
      const A = ITEMS[n];
      for (let m = 0; m < N; m++) {
        const B = ITEMS[m];
        if (m === n || B.metal || B.tip || B.tiny || B.gone || !B.p) continue;
        if (inBody(m, dx, dy) || inBody(m, dx, dy + 0.45 * len)) return m;
      }
      return -1;
    };
    // hanger object o takes a free anchor of cloud C's outline: at least 0.2 C.w from every live root on C, the farthest of them, kept by settle; null if none
    const reroot = (C, n, o, sp) => {
      const keep = o.len, len = o.full * HANG_SCALE * H, cand = [];
      for (let c = 0; c < 24; c++) {
        const lx = C.w * (0.12 + 0.76 * c / 23), mx = C.m ? C.w - lx : lx;
        let ly = C.h; while (ly > 0 && !mc.isPointInPath(C.p, lx, ly)) ly -= C.h * 0.02;
        ly -= Math.max(3, C.h * 0.025);
        if (ly <= C.bt + C.hf * C.bh + C.h * 0.03) continue;
        const rx = C.x + mx, ry = YS[n] + ly;
        if (clashes(rx, ry, len) || coverOf(n, rx, ry, len) >= 0) continue;
        let d = Infinity;
        for (let k = 0; k < C.hs.length; k++) d = Math.min(d, Math.abs(mx - C.hs[k].u * C.w));
        if (C.hs.length && d < (sp || 0.2) * C.w) continue;
        cand.push({ mx: mx, ly: ly, rx: rx, ry: ry, d: C.hs.length ? d : -Math.abs(mx - C.w * 0.5) });
      }
      cand.sort((a, b) => b.d - a.d);
      for (let k = 0; k < cand.length; k++) {
        const cd = cand[k], q = { o: o, u: cd.mx / C.w, v: cd.ly / C.h };
        o.len = o.full;
        if (!settle(C, n, q, cd.rx, cd.ry)) continue;
        C.hs.push(q); alive.push({ x: cd.rx, y: cd.ry, len: o.len * HANG_SCALE * H, q: q });
        return q;
      }
      o.len = keep;
      return null;
    };
    // a hanger whose root or 45% point lies under a cloud drawn after its own piece is hidden: re-rooted onto that cloud, or dropped
    R.hroot = R.hdrop = R.tmir = R.tcut = 0;
    for (let n = 0; n < N; n++) {
      const A = ITEMS[n];
      if (A.metal || A.tip || A.tiny) continue;
      for (let j = A.hs.length - 1; j >= 0; j--) {
        const q = A.hs[j], len = q.o.len * HANG_SCALE * H, c = coverOf(n, A.x + q.u * A.w, YS[n] + q.v * A.h, len);
        if (c < 0) continue;
        A.hs.splice(j, 1);
        const ai = alive.findIndex((a) => a.q === q); if (ai >= 0) alive.splice(ai, 1);
        if (reroot(ITEMS[c], c, q.o)) R.hroot++; else R.hdrop++;
      }
    }
    // a big front cloud under two hangers: the nearest spacing-dropped hanger takes a free anchor of its outline
    for (let n = 0; n < N; n++) {
      const C = ITEMS[n];
      if (!C.front || C.metal || C.tip || C.tiny || !C.p || C.size !== 'big') continue;
      const cx = C.x + C.w * 0.5, near = (a) => Math.abs(ITEMS[a.n].x + ITEMS[a.n].w * 0.5 - cx);
      lost.sort((a, b) => near(a) - near(b));
      for (let l = 0; l < lost.length && C.hs.length < 2; l++) {
        if (!reroot(C, n, lost[l].q.o)) continue;
        R.rerooted++; R.space--; lost.splice(l, 1); l--;
      }
      if (C.hs.length) continue;   // a big front cloud never ends bare: a closer spacing, else its own best spacing-dropped hanger kept as it was
      for (let l = 0; l < lost.length && !C.hs.length; l++) {
        if (!reroot(C, n, lost[l].q.o, 0.1)) continue;
        R.rerooted++; R.space--; lost.splice(l, 1); l--;
      }
      for (let l = 0; l < lost.length && !C.hs.length; l++) {
        const q = lost[l].q, rx = C.x + q.u * C.w, ry = YS[n] + q.v * C.h;
        if (lost[l].n !== n || coverOf(n, rx, ry, q.o.len * HANG_SCALE * H) >= 0 || !settle(C, n, q, rx, ry)) continue;
        C.hs.push(q); alive.push({ x: rx, y: ry, len: q.o.len * HANG_SCALE * H, q: q }); R.space--; lost.splice(l, 1); l--;
      }
    }
    // tiny clouds: a tail that ends or passes inside a rock is mirrored to the other side of the swirl, or cut to the swirl alone; chosen here, drawn as it.sw
    const rockIn = (px, py) => {
      for (let m = 0; m < N; m++) {
        const B = ITEMS[m];
        if (!B.metal || !B.p) continue;
        for (let wr = -1; wr <= 1; wr++) {
          const bx = B.x + wr * SPAN, lx = B.m ? B.w - (px - bx) : px - bx, ly = py - YS[m];
          if (lx < 0 || lx > B.w || ly < B.bt + B.hf * B.bh || ly > B.h) continue;
          if (mc.isPointInPath(B.p, lx, ly)) return true;
        }
      }
      return false;
    };
    for (let n = 0; n < N; n++) {
      const T = ITEMS[n];
      if (!T.tiny || !T.tp) continue;
      const tp = T.tp, hit = (fx) => {
        const xs = [0.25 * tp.x0 + 0.5 * fx(tp.cx) + 0.25 * fx(tp.x1), fx(tp.x1)], ys = [0.25 * tp.y0 + 0.5 * tp.cy + 0.25 * tp.y1, tp.y1];
        return xs.some((x, i) => rockIn(T.m ? T.x + T.w - x : T.x + x, YS[n] + ys[i]));
      };
      T.sw = new Path2D(T.sp);
      if (!hit((x) => x)) { T.sw.quadraticCurveTo(tp.cx, tp.cy, tp.x1, tp.y1); continue; }
      const mir = (x) => 2 * tp.sx - x;
      if (!hit(mir)) { T.sw.quadraticCurveTo(mir(tp.cx), tp.cy, mir(tp.x1), tp.y1); R.tmir++; } else R.tcut++;
    }
    R.shortened = 0;
    for (let n = 0; n < N; n++) for (let j = 0; j < ITEMS[n].hs.length; j++) if (ITEMS[n].hs[j].o.len < ITEMS[n].hs[j].o.full - 1e-6) R.shortened++;
    R.lowFrac = R.low / H;
  }

  let FORCE;
  const NSET = [0, 0];   // objects placed with the rounded shapes / the real clouds (last layout)
  function prep(W, H) {
    NSET[0] = NSET[1] = 0;
    const L = window.GenCeilKinds.list(), by = (nm) => L.filter((q) => q.name === nm)[0], f = H / 900 * SCALE, ft = H / 900 * TSCALE;
    ITEMS = []; rs = 0; SPAN = W * SPAN_W;
    // one hung object at (u, v) of an item: only its seed is fixed here; dress() picks the kind once the cloud's size class is final
    function hangOne(it, u, v) {
      const s = rnd() * 100;
      it.hs.push({ o: { kd: null, s: s, i: ITEMS.length * 40 + it.hs.length, th: 0.45 + 0.4 * hash(s + 35), rnd: (q) => hash(s + q) }, u: u, v: v });
    }
    // gives every hung object its kind and seeded look. Round metal arcs only on big clouds (or metal clouds), at most one per cluster; the others
    // share the rest about evenly; a cluster gets 3-5 hangers (big) or 2-3 (mid), split over its parts by width (set in prep)
    const NEW = window.GenCeilHang.kinds, fins = {};
    function dress(it, idx) {
      if (!it.tip && !it.tiny && it.hs.length && it.want) {
        while (it.hs.length > it.want) it.hs.splice(Math.floor(rnd() * it.hs.length), 1);
        while (it.hs.length < it.want) { const b = it.hs[Math.floor(rnd() * it.hs.length)]; hangOne(it, Math.max(0.05, Math.min(0.95, b.u + (rnd() - 0.5) * 0.16)), b.v); }
      }
      const key = it.cl != null ? 'c' + it.cl : 'i' + idx;
      for (let j = 0; j < it.hs.length; j++) {
        const o = it.hs[j].o, s = o.s, names = ['bead', 'stepbar', 'teeth', 'pendulum'];
        if (((it.size === 'big' && it.type === 'cloud') || it.metal) && !fins[key]) names.push('fin', 'fin');
        // each type owns its kinds (about 60% of its hangers); the shared four (and the fin) go to any. Only lobe clouds hang tentacles (sprout)
        const own = it.type === 'metal' ? ['tuft'] : ['sprout'], h40 = hash(s + 40);
        // tips have no type: shared kinds only
        const nm = h40 < 0.6 && !it.tip ? own[Math.floor(h40 / 0.6 * own.length)] : names[Math.floor((it.tip ? h40 : (h40 - 0.6) / 0.4) * names.length)], kk = by(nm) || NEW[nm] || window.GenCeilHang3.kinds[nm], r = hash(s + 36);
        if (nm === 'fin') fins[key] = true;
        o.kd = kk; o.len = kk.len[0] + (kk.len[1] - kk.len[0]) * r; o.n = kk.n[0] + Math.floor(hash(s + 37) * (kk.n[1] - kk.n[0] + 1));
        o.w = hash(s + 31); o.ph = hash(s + 32) * 6.3; o.amp = 0.5 + hash(s + 33) * 0.9; o.dir = hash(s + 34) < 0.5 ? 1 : -1;
        o.tk = 0.5 + 1.7 * hash(s + 41); o.cv = Math.floor(hash(s + 42) * 4); o.wv = 0.3 + 1.4 * hash(s + 43); o.sp = 0.6 + 1.0 * hash(s + 44);
        o.ci = Math.floor(hash(s + 45) * 7); o.tone = Math.floor(hash(s + 46) * 3); o.ang = 0.2 + 0.3 * hash(s + 47);
        if (nm === 'tuft') o.len = 0.08 + 0.1 * r;
        if (it.type === 'metal' && j === 0) { o.kd = window.GenCeilHang3.kinds.worm; o.len = o.kd.len[0] + (o.kd.len[1] - o.kd.len[0]) * r; o.n = 2 + Math.floor(hash(s + 37) * 2); }   // every metal piece carries exactly one worm hanger of 2-3 worms
      }
    }
    function add(k, i, x, y, sj, m, sf, v, wob, nh, ww, hh, fit) {
      const q = POOL[k][i], it = { im: IMG[k][i], x: x, y: y, w: ww || q[1] * sf * sj, h: hh || q[2] * sf * sj, m: m, v: v, wa: wob ? 2 + 4 * rnd() : 0, wf: 6.283 / (4 + 5 * rnd()), wp: rnd() * 6.283, hs: [] };
      if (nh) for (let a = 0; a + 1 < q[5].length; a += 2) hangOne(it, m ? 1 - q[5][a] : q[5][a], q[5][a + 1]);
      it.tip = k === 'tip'; it.tiny = k === 'tiny'; it.fit = !!fit;
      if (!it.tip) { shape(it, q, ITEMS.length * 13.7 + 5, true, FORCE); }   // rocks only where the layout puts them (below), so the mix is the same at every width
      paint(it);
      ITEMS.push(it);
      return it;
    }
    // tip row: random windows of the picture, hung so most of each sits above the top edge, random mirror, never the same window twice in a row
    // (also across the wrap); steps leave two fade widths of overlap so the ends join without a cut. They only carry hangers (the band is the back layer)
    const nt = POOL.tip.length, xs = [], ps = [], objs = []; let gold = 0;
    let cx = 0, prev = -1;
    while (cx < SPAN) {
      let i = pick(nt, prev, -1), sj = 0.9 + 0.2 * rnd(), k = 0.7 + 0.3 * rnd();
      if (cx + (POOL.tip[i][1] - 2 * FADE - 25) * ft * sj * k >= SPAN && i === ps[0]) i = pick(nt, prev, ps[0]);   // the last one must differ from the first
      xs.push(cx); ps.push([i, sj]);
      cx += (POOL.tip[i][1] - 2 * FADE - 25) * ft * sj * k;
      prev = i;
    }
    const sx = SPAN / cx, tips = [];
    for (let n = 0; n < xs.length; n++) {
      const sj = ps[n][1], h = POOL.tip[ps[n][0]][2] * ft * sj;
      const tp = add('tip', ps[n][0], xs[n] * sx, H * (0.2 + 0.07 * rnd()) - h, sj, rnd() < 0.5, ft, V_TIP, false, false);
      tp.dp = 2; tips.push(tp);    }
    // object clouds in two rows (db1eeb0's layout: clusters of 2 (mid) or 3 (big) ordinary-sized clouds side by side, in groups of 1-2 then a gap,
    // none the same picture twice in a row, the last ends well before the span end). The back row sits at the wave line's side (deeper), the front
    // row near the screen top; each gets its depth dp (0.08 near .. 1.08 far) from its row
    const hidden = (it, row) => {
      it.front = hash(it.cl * 5.7 + 1.3) < 0.4;   // a seeded share of the groups is drawn over the band, in full colour
      if (it.front && !it.metal) { const bs = (window.GenEldPal && window.GenEldPal.CEILCLOUD || ["#061c48"])[0]; it.fill = bs; it.edge = shade(bs, 0.5); it.hi = shade(bs, 0.14); it.mark = shade(bs, 0.3); }
      return 0.45 + 0.1 * rnd();   // every object is drawn in front of the band, 0.45-0.55 of its painted height above its own cut line (drawOne)
    };
    let clN = 0;
    const fr = [], rw = 108 * H / 1009;   // the front clouds in x order; a rock is ~110 px wide at 2000x1009, sized by the viewport height alone
    for (let row = 0; row < 3; row++) {
      let first = -1, prev = -1; const mine = [];
      cx = W * (row === 2 ? 0.03 * rnd() : row * 0.09 + 0.03 * rnd());   // rows staggered in x
      for (let go = true; go;) {
        const g = row === 2 ? 1 : 1 + Math.floor(rnd() * 2);
        for (let n = 0; n < g && go; n++) {
          const np = row === 2 ? 1 : rnd() < 0.45 ? 3 : 2, parts = [], cl = clN++;
          let x = cx; const base = rnd();
          for (let k = 0; k < np; k++) {
            let i = pick(POOL.obj.length, prev, -1), sj = (0.95 + 0.15 * rnd()) * (row === 2 ? 1.05 : row === 1 ? 1.0 : 0.95), w = POOL.obj[i][1] * f * sj, h = POOL.obj[i][2] * f * sj;
            if (x + w > SPAN - W * 0.03 && prev !== 0 && x + POOL.obj[0][1] * f * sj <= SPAN - W * 0.03) { i = 0; w = POOL.obj[0][1] * f * sj; h = POOL.obj[0][2] * f * sj; }   // near the end: the narrowest picture, to fill the seam
            if (x + w > SPAN - W * 0.03) { go = false; break; }
            if (first < 0) first = i;
            const it = add('obj', i, x, 0, sj, rnd() < 0.5, f, V_OBJ, true, true);
            it.cl = cl; it.row = row; it.off = 0;
            { const tf = row === 0 ? -0.45 : row === 1 ? -0.17 : 0, bs = (window.GenEldPal && window.GenEldPal.CEILCLOUD || ["#061c48"])[0];   // back darkest, mid between, front the navy; the rim is lighter so an overlap reads
              if (!it.metal) { it.fill = tf ? shade(bs, tf) : bs; it.edge = shade(bs, 0.5 + tf); it.hi = shade(bs, tf + 0.14); it.mark = shade(bs, tf + 0.3); } }
            if (row >= 1) it.gone = false;   // no front or mid cloud is removed: they keep the rows and every third of the screen covered
            it.dp = row === 0 ? 0.7 + 0.38 * mod(++gold * 0.618034, 1) : row === 1 ? 0.38 + 0.3 * mod(++gold * 0.618034, 1) : 0.08 + 0.28 * mod(++gold * 0.618034, 1);
            it.hf = hidden(it, row);   // hidden fraction of its height by row: front 0.25-0.4, mid 0.4-0.55, back 0.55-0.7; a rock 0.3-0.5
            it.y = -(it.bt + it.bh * it.hf);   // relative to the band's lower edge: the band is drawn over the top hf of the object
            parts.push(it); prev = i;
            x += w * (1.02 + 0.12 * rnd());   // a gap between neighbours
          }
          for (let k = 0; k < parts.length; k++) { parts[k].size = parts.length === 3 ? 'big' : 'mid'; mine.push(parts[k]); }
          cx = x;
          if (row === 2 && parts.length) fr.push(parts[0]);
        }
        if (row === 2) cx += (fr.length % 2 ? rw + W * 0.02 : W * 0.03) - 18 * f;   // front clouds stand alone: a gap of 0.03 W, every second gap wide enough for a rock
        else cx += W * (0.03 + 0.07 * rnd());
      }
      if (mine.length > 1 && mine[mine.length - 1].im === IMG.obj[first]) {   // the last cloud would be the first's twin across the wrap: drop it
        const gone = mine.pop(); ITEMS.splice(ITEMS.indexOf(gone), 1);
        const left = mine.filter((q) => q.cl === gone.cl);
        for (let k = 0; k < left.length; k++) left[k].size = left.length === 3 ? 'big' : 'mid';
      }
      for (let k = 0; k < mine.length; k++) objs.push(mine[k]);
    }
    // the gaps between neighbouring front clouds: the back row's clouds are centred on them, so their darker, shorter lips show between the front ones
    const frs = fr.filter((o) => ITEMS.indexOf(o) >= 0), gaps = [];
    for (let k = 0; k + 1 < frs.length; k++) gaps.push((frs[k].x + frs[k].w + frs[k + 1].x) / 2);
    const backs = objs.filter((o) => o.row === 0).sort((a, b) => a.x - b.x);
    for (let k = 0; k < backs.length; k++) { if (k < gaps.length) backs[k].x = gaps[k] - backs[k].w / 2; else backs[k].gone = true; }   // a back cloud with no gap left is removed
    const mids = objs.filter((o) => o.row === 1).sort((a, b) => a.x - b.x);   // the mid row sits behind the front clouds' bodies, so it never fills a gap over the back lips
    for (let k = 0; k < mids.length; k++) { if (k < frs.length) mids[k].x = frs[k].x + (frs[k].w - mids[k].w) / 2; else mids[k].gone = true; }
    // two red-eyed rocks at every width, each in a gap of the first screen (the wide ones: after the first and the third front cloud), sized by the viewport alone
    for (let q = 0; q < 2; q++) {
      if (gaps.length <= q * 2) continue;
      const ri = 2, rq = POOL.obj[ri], fm = add('obj', ri, gaps[q * 2] - rw / 2, 0, 1, rnd() < 0.5, f, V_OBJ, true, true, rw, rw * rq[2] / rq[1]);
      fm.cl = clN++; fm.row = 2; fm.off = 0; fm.size = 'mid'; fm.gone = false;
      fm.dp = 0.08 + 0.28 * mod(++gold * 0.618034, 1);
      let sd = ITEMS.indexOf(fm) * 13.7 + 5 + q * 7; while (hash(sd + 5.1) < 0.85) sd += 0.91;
      fm.metal = false; shape(fm, rq, sd, false, 'metal');
      for (let tries = 0; tries < 40 && !fm.eyes.length; tries++) { sd += 0.91; shape(fm, rq, sd, false, 'metal'); }   // a rock with an eye
      paint(fm);
      fm.hf = hidden(fm, 2);
      fm.front = true;   // every placed rock is drawn in the front pass, so no cloud ever covers an eye
      if (fm.front) { fm.hf = 0.45 + 0.1 * rnd(); if (fm.eyes.length) fm.eyes[0].y = fm.bt + fm.bh * (0.62 + 0.13 * rnd()); }   // its eye sits in the lower body, well below the cut line
      else { fm.hf = 0.45 + 0.1 * rnd(); }
      if (fm.eyes.length) {   // a rock keeps every eye (its top is y - 0.6 size, the almond is size tall) below the cut line: the cut line rises (hf down to 0.25) first, then eyes still too high are all moved down together
        const top0 = Math.min.apply(null, fm.eyes.map((e) => e.y - e.size * 0.6));
        fm.hf = Math.max(0.25, Math.min(fm.hf, (top0 - fm.bt) / fm.bh - 0.04));
        const top = top0, want = fm.bt + fm.bh * (fm.hf + 0.04);
        if (top < want) for (let i = 0; i < fm.eyes.length; i++) fm.eyes[i].y += want - top;
      }
      fm.y = -(fm.bt + fm.bh * fm.hf);
    }
    // tiny clouds scattered at random
    for (let n = 0; n < 5 * SPAN_W; n++) {
      const i = Math.floor(rnd() * POOL.tiny.length), sj = 0.9 + 0.2 * rnd();
      const tn = add('tiny', i, rnd() * SPAN, 0, sj, rnd() < 0.5, f, V_OBJ, true, false);
      tn.dp = 0.1 + 0.9 * rnd(); tn.off = 0; tn.hf = 0.45 + 0.1 * clamp01((tn.dp - 0.08) / 1.0); tn.y = -tn.h * tn.hf;
    }
    // hanger targets per cluster: big 3-5, mid 2-3, handed out to the parts widest first
    const cls = {};
    for (let n = 0; n < ITEMS.length; n++) { const q = ITEMS[n]; if (q.cl != null) (cls[q.cl] = cls[q.cl] || []).push(q); }
    for (const k in cls) {
      const ps = cls[k].sort((a, b) => b.w - a.w), tot = ps[0].size === 'big' ? 3 + Math.floor(rnd() * 3) : 2 + Math.floor(rnd() * 2);
      for (let j = 0; j < ps.length; j++) { ps[j].want = Math.floor(tot / ps.length) + (j < tot % ps.length ? 1 : 0); if (ps[j].metal && !ps[j].want) ps[j].want = 1; }
    }
    // roots at random spots along each object's drawn lower outline (probed on its real path), a few px inside so the body covers the root,
    // spaced apart; the count is the cluster's share (0 leaves the object bare)
    const probe = document.createElement('canvas').getContext('2d');
    for (let n = 0; n < ITEMS.length; n++) {
      const it = ITEMS[n];
      if (it.tip || it.tiny || it.want == null) continue;
      it.hs = [];
      if (!it.want) continue;
      const cand = [], gap = it.w * 0.2;
      for (let c = 0; c < 24; c++) {
        const lx = it.w * (0.12 + 0.76 * (c + rnd() * 0.8) / 24);
        let ly = it.h; while (ly > 0 && !probe.isPointInPath(it.p, lx, ly)) ly -= it.h * 0.02;
        if (ly > 0) cand.push([lx, ly - Math.max(3, it.h * 0.025)]);
      }
      const got = [];
      while (cand.length && got.length < it.want) {
        const q = cand.splice(Math.floor(rnd() * cand.length), 1)[0];
        if (got.every((o) => Math.abs(o[0] - q[0]) >= gap)) got.push(q);
      }
      for (let j = 0; j < got.length; j++) hangOne(it, it.m ? 1 - got[j][0] / it.w : got[j][0] / it.w, got[j][1] / it.h);
    }
    for (let n = 0; n < ITEMS.length; n++) dress(ITEMS[n], n);
    // removed clouds (not navy): their tentacles go; the other hangers move onto the nearest kept object whose span holds them, else drop
    const kept = ITEMS.filter((q) => !q.gone && !q.tip && !q.tiny && q.p);
    for (let n = 0; n < ITEMS.length; n++) {
      const g = ITEMS[n];
      if (!g.gone) continue;
      for (let j = 0; j < g.hs.length; j++) {
        const q = g.hs[j];
        if (q.o.kd === by('sprout')) continue;
        const hx = g.x + q.u * g.w;
        let best = null, bd = 1e9;
        for (let k = 0; k < kept.length; k++) { const c = kept[k], d = Math.abs(c.x + c.w * 0.5 - hx); if (hx > c.x - c.w * 0.2 && hx < c.x + c.w * 1.2 && d < bd) { bd = d; best = c; } }
        if (!best) continue;
        best.hs.push({ o: q.o, u: Math.max(0.12, Math.min(0.88, (hx - best.x) / best.w)), v: 0.9 });
      }
    }
    ITEMS = ITEMS.filter((q) => !q.gone);
    // a metal rock grows a lobe down to each hanger point it does not cover (the -///- symbol drops the uncovered ones)
    for (let n = 0; n < ITEMS.length; n++) {
      const it = ITEMS[n];
      if (!it.metal) continue;
      const lo = new Path2D();   // no lobes: a hanger whose root is off the body is dropped below
      it.lo = lo;
    }
    // each body's real top (its path starts below the box top) so the waterline cuts it; each hanger's root moves up onto the body's edge, a root off the body is dropped
    const mc = (window.GenCeilMeasure = window.GenCeilMeasure || document.createElement('canvas')).getContext('2d'), G = 24;
    for (let n = 0; n < ITEMS.length; n++) {
      const it = ITEMS[n];
      if (it.tip || it.tiny || !it.p) { it.top = 0; continue; }
      it.top = 0;
      const keep = it.hs.length ? it.hs[0] : null;
      const clear = (lx, v) => !it.metal || !it.eyes || it.eyes.every((e) => Math.abs(lx - e.x) > e.size * 1.2 || v * it.h > e.y + e.size * 0.6);   // a rock's hanger never roots above or beside-and-over an eye: nothing hangs across one
      const vcut = Math.max(0.05, (it.bt + it.hf * it.bh) / it.h + 0.03);   // a hanger roots on the lower outline below the cut line, never on the hidden top half
      scan: for (let r = 0; r < G; r++) for (let c = 0; c <= G; c++) if (mc.isPointInPath(it.p, c / G * it.w, r / G * it.h)) { it.top = Math.max(0, (r - 1) / G * it.h); break scan; }
      for (let j = it.hs.length - 1; j >= 0; j--) {
        const q = it.hs[j], lx = (it.m ? 1 - q.u : q.u) * it.w;
        let v = q.v, ok = false;
        for (; v >= vcut; v -= 0.02) if (clear(lx, v) && mc.isPointInPath(it.p, lx, v * it.h) && mc.isPointInPath(it.p, lx - 0.05 * it.w, (v - 0.06) * it.h) && mc.isPointInPath(it.p, lx + 0.05 * it.w, (v - 0.06) * it.h)) { ok = true; break; }
        if (ok) {
          q.v = v;
          if (it.metal && it.eyes) for (let k = 0; k < it.eyes.length; k++) {   // a root inside an eye's rectangle, or within one eye width of it, slides along the edge to just past the eye so no rod ends on it
            const e = it.eyes[k], ew = e.size * 1.5;
            if (Math.abs(lx - e.x) >= ew || v * it.h > e.y + e.size * 0.6 + ew) continue;
            const fits = (nx) => nx > 0.05 * it.w && nx < 0.95 * it.w && mc.isPointInPath(it.p, nx, v * it.h);
            const nr = e.x + ew + 2, nl = e.x - ew - 2, nx = lx >= e.x ? (fits(nr) ? nr : fits(nl) ? nl : lx) : (fits(nl) ? nl : fits(nr) ? nr : lx);
            if (nx !== lx) { q.u = (it.m ? 1 - nx / it.w : nx / it.w); break; }
          }
        } else it.hs.splice(j, 1);
      }
      if (!it.hs.length && keep) {   // every object keeps one extra: root it on the centre column
        for (let v = 0.9; v >= Math.max(0.1, vcut); v -= 0.02) if (clear(it.w * 0.5, v) && mc.isPointInPath(it.p, it.w * 0.5, v * it.h)) { keep.u = 0.5; keep.v = Math.max(0.05, v - 0.03); it.hs.push(keep); break; }
        if (!it.hs.length && it.metal) { keep.u = 0.5; keep.v = 0.5; it.hs.push(keep); }
      }
      if (it.metal && it.hs.length && !it.hs.some((q) => q.o.kd.name === 'worm')) {   // the worm hanger was dropped: the first survivor becomes the worm
        const o = it.hs[0].o, wk = window.GenCeilHang3.kinds.worm;
        o.kd = wk; o.len = wk.len[0] + (wk.len[1] - wk.len[0]) * hash(o.s + 36); o.n = 2 + Math.floor(hash(o.s + 37) * 2);
      }
    }
    // the rest of the old ceiling's objects per screen width hang from random points along the tips' lower edge (their uncovered left part)
    let have = 0; for (let n = 0; n < ITEMS.length; n++) have += ITEMS[n].hs.length;   // counted after dress has trimmed
    for (let g = 0, need = Math.round(PER_SCREEN * SPAN_W); have < need && g < 400; g++) {
      const it = tips[Math.floor(rnd() * tips.length)], q = POOL.tip[IMG.tip.indexOf(it.im)], a = 2 * Math.floor(rnd() * (q[5].length / 2)), u = it.m ? 1 - q[5][a] : q[5][a];
      if (u > 0.55 || u < 0.15) continue;
      hangOne(it, u, q[5][a + 1]); have++;
    }
    for (let n = 0; n < tips.length; n++) dress(tips[n], ITEMS.indexOf(tips[n]));
    ITEMS.sort((p, q) => (p.metal ? 1 : 0) - (q.metal ? 1 : 0) || q.dp - p.dp);   // painter's order: far (toward the wave line) first, near (screen top) last
    // a rock beside a front cloud leaves a gap of 0.03 W or more, or overlaps the cloud by 6 px: a thinner sliver would show the back band's lip as a bar between them
    {
      const mc = (window.GenCeilMeasure = window.GenCeilMeasure || document.createElement('canvas')).getContext('2d');
      const cl = ITEMS.filter((o) => o.front && !o.metal && !o.tiny && !o.tip && o.p && !o.gone), min = 0.03 * W;
      const ins = (B, px, py) => {
        const by = BASEF * H - B.bh - B.bt, lx = B.m ? B.w - (px - B.x) : px - B.x, ly = py - by;
        return lx >= 0 && lx <= B.w && ly >= B.bt + B.hf * B.bh && ly <= B.h && mc.isPointInPath(B.p, lx, ly);
      };
      const gaps = (R) => {   // [left, right] nearest cloud outline distance in px over the lip rows; 0 where they overlap, Infinity where none shares a row
        const g = [Infinity, Infinity];
        for (let py = 0.17 * H; py <= 0.23 * H; py += 2) {
          let xl = Infinity, xr = -Infinity;
          for (let px = R.x; px <= R.x + R.w; px += 2) if (ins(R, px, py)) { xl = Math.min(xl, px); xr = px; }
          if (xr < xl) continue;
          for (const C of cl) {
            let cl0 = Infinity, cr0 = -Infinity;
            for (let px = C.x; px <= C.x + C.w; px += 2) if (ins(C, px, py)) { cl0 = Math.min(cl0, px); cr0 = px; }
            if (cr0 < cl0) continue;
            if (cl0 > xr) g[1] = Math.min(g[1], cl0 - xr);
            else if (cr0 < xl) g[0] = Math.min(g[0], xl - cr0);
            else { if (cl0 >= xl) g[1] = 0; if (cr0 <= xr) g[0] = 0; }
          }
        }
        return g;
      };
      const ok = (g) => g.every((v) => v === 0 || v >= min);
      ITEMS.forEach((R) => {
        if (!R.metal || !R.p || R.tip || R.gone) return;
        const g0 = gaps(R), x0 = R.x; let done = false;
        for (let s = 0; s < 2 && !done; s++) {
          if (!(g0[s] > 0 && g0[s] < min)) continue;
          R.x = x0 + (s ? 1 : -1) * (g0[s] + 6);
          if (R.x >= 0 && R.x + R.w <= W && ok(gaps(R))) done = true; else R.x = x0;
        }
      });
    }
    resolveHangers(W, H);
    pW = W; pH = H;
  }

  function cutClip(ctx, it, x, y, H) {
    ctx.beginPath();   // above its cut line (about hf of its painted height, a little wavy) the band shows instead of the object
    for (let k = 0; k <= 24; k++) { const cx = x - it.w + it.w * 3 * k / 24; ctx[k ? 'lineTo' : 'moveTo'](cx, y + it.bt + it.hf * it.bh + (0.006 * pH) * Math.sin(cx / pW * TAU * 3 + 1.3)); }
    ctx.lineTo(x + it.w * 2, H * 3); ctx.lineTo(x - it.w, H * 3); ctx.closePath(); ctx.clip();
  }

  function drawOne(ctx, it, x, y, H, t, kd, sc, pal, hp) {
    let wy = -H, dn = 0;
    if (!it.tip) {   // depth, the floor's view flipped: the screen top is near (1x, no tint, drawn last), the wave line is far (0.55x, water-tinted, drawn first); the object's own waterline wy sits at its depth in the band, its top sunk there and its body hangs down out of the water
      // db1eeb0's full-size objects, drawn over the sea band and shifted so only their top overlaps it (no flat cut, no depth shrink)
      const c0 = it.m ? it.w - it.bx1 : it.bx0, c1 = it.m ? it.w - it.bx0 : it.bx1; let low = 0;   // the object is drawn over the band: its painted bottom sits on the band's mean lower edge under its span
      for (let k = 0; k < 5; k++) low += shc(x + (c0 + (c1 - c0) * k / 4), pW) / 5;
      y = low - it.bh - it.bt;
    }
    y += it.wa * sc * Math.sin(it.wf * t + it.wp);
    const g = clamp01(kd);
    const hang = (over) => { for (let j = 0; j < it.hs.length; j++) {   // over: the metal's worms, drawn after the body so they crawl over it
      const q = it.hs[j];
      if ((q.o.kd.name === 'worm' && it.metal) !== over) continue;
      if (!it.tip && (x + q.u * it.w < 0 || x + q.u * it.w > pW || y + q.v * it.h < y + it.bt + it.hf * it.bh)) continue;   // a root off screen or above its body's cut line is dropped
      if (q.o.kd.name === 'fin' && x + q.u * it.w + 2 * H * q.o.len * HANG_SCALE * g > x + it.w) continue;   // a fin's arcs reach 2 R0 to the right: one that would pass its body's right edge hangs loose beside it, so it is dropped
      // a tip item has no picture: its objects hang from the band's lower edge (root a little above it, tucked in)
      const hx = x + q.u * it.w; let hy = it.tip ? shc(hx, pW) - 4 * sc : y + q.v * it.h;   // a rock's worms root on its lower outline, below its eyes, so they never cover one
      if (g > 0 && (it.tip || hy > wy + 3 * sc)) {
        const cap = (0.28 * H - hy) / (HANG_SCALE * H);   // no tip below the red line at 0.28 H, whatever the surge does to the ceiling
        if (cap <= 0) continue;
        ctx.save();   // a hanger is in the water above its own waterline and the wave line: nothing of it shows there
        const ln = q.o.len; q.o.len = Math.min(ln, cap) * HANG_SCALE;   // every hanger is HANG_SCALE of its original length
        if (q.o.kd.name === 'fin') cutClip(ctx, it, x, y, H);   // a fin shows only below its body's cut line, like the body
        q.o.kd.draw(ctx, q.o, hx, hy, H, g, t, sc, pal);
        q.o.len = ln;
        ctx.restore();
      }
    } };
    if (hp === 2) {   // the eyes' pass, after the hangers: nothing covers an eye
      if (it.tip || it.tiny || it.type !== 'metal') return;
      ctx.save(); cutClip(ctx, it, x, y, H);
      if (it.m) { ctx.translate(x + it.w, y); ctx.scale(-1, 1); } else { ctx.translate(x, y); }
      for (let i = 0; i < it.eyes.length; i++) it.eyes[i].forceOpen = mod(t - 3.9, 8) < 5 ? 1 : 0;   // open from t 3.9 to 8.9 of every 8 s: always open at the break beat's 5.9
      for (let i = 0; i < it.eyes.length; i++) {   // the eye sites: cracks that open; the scheduler only counts the ones on screen
        const e = it.eyes[i], ex = x + (it.m ? it.w - e.x : e.x);
        const z = 1, ey = pH * 0.5 + z * (y + e.y - pH * 0.5);   // the scene's zoom is about the canvas centre
        window.GenCeilHang3.eyeSite(ctx, e, e.size, t, ex > 0 && ex < pW && ey > -e.size * z && ey < pH + e.size * z, it.edge, it.hi);
      }
      ctx.restore(); return;
    }
    if (hp) return;   // the hanger pass: nothing hangs any more
    if (it.tip) return;   // the tip sprites are no longer drawn: the code band is the back layer
    ctx.save();
    if (!it.tiny) cutClip(ctx, it, x, y, H);   // a tiny cloud is drawn whole, never cut
    if (it.m) { ctx.translate(x + it.w, y); ctx.scale(-1, 1); } else { ctx.translate(x, y); }
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    if (it.tiny) {
      ctx.strokeStyle = it.mark; ctx.lineWidth = it.lw; ctx.stroke(it.sw);
    } else if (it.type === 'metal') {   // dark iron: near-black blue-grey body, deep pits with a thin bright rim on the lit side, silvery-blue edge highlights
      ctx.strokeStyle = it.edge; ctx.lineWidth = 2.4; ctx.stroke(it.p); ctx.stroke(it.lo);
      ctx.fillStyle = it.fill; ctx.fill(it.p); ctx.fill(it.lo);
      ctx.fillStyle = it.edge; ctx.fill(it.pits);
      ctx.fillStyle = shade(it.fill, 0.55); ctx.fill(it.lips);
      ctx.strokeStyle = it.edge; ctx.lineWidth = 1.2; ctx.stroke(it.cr);
      ctx.globalAlpha = 0.6; ctx.fillStyle = '#a89660'; ctx.fill(it.pt); ctx.globalAlpha = 1;
    } else {
      if (it.mem) window.GenCeilMembrane.draw(ctx, it.mem, (window.GenEldPal && window.GenEldPal.CEILCLOUD || ['#061c48'])[0]);
    }
    ctx.restore();
    ctx.restore();
  }
  // the seeded layout drifts right over its wrapped span (tips a little slower than the object and tiny clouds); every item is drawn at its wrapped place (and one span left of it)
  function drawSprites(ctx, W, H, t, kd, sc, pal, cam, front, hp, rocks) {
    if (pW !== W || pH !== H) prep(W, H);
    camNow = cam;
    const mg = 150 * sc;
    const all = front === null, q = [];   // front null: the front object clouds in one pass, the one sitting higher on screen painted last
    for (let i = 0; i < ITEMS.length; i++) {
      const it = ITEMS[i];
      if (!hp && (!!it.metal !== !!rocks || (!rocks && (all ? !it.front : !!it.front !== front)))) continue;
      const x = mod(it.x + mod(it.v * W * t - cam * W, SPAN), SPAN), y = it.y;
      for (let c = 0; c < 2; c++) {
        const xx = c ? x - SPAN : x;
        if (!(c ? xx + it.w > -mg && xx < W + mg : xx < W + mg && xx + it.w > -mg)) continue;
        if (!all) { drawOne(ctx, it, xx, y, H, t, kd, sc, pal, hp); continue; }
        const c0 = it.m ? it.w - it.bx1 : it.bx0, c1 = it.m ? it.w - it.bx0 : it.bx1; let low = 0;
        for (let k = 0; k < 5; k++) low += shc(xx + (c0 + (c1 - c0) * k / 4), pW) / 5;
        const bob = low + it.wa * sc * Math.sin(it.wf * t + it.wp); q.push({ it, x: xx, y, b: bob, tp: bob - it.bh * (1 - it.hf), i: q.length });
      }
    }
    q.sort((a, b) => (b.tp - a.tp) || (b.b - a.b) || (a.i - b.i));
    for (let i = 0; i < q.length; i++) drawOne(ctx, q[i].it, q[i].x, q[i].y, H, t, kd, sc, pal, hp);
  }

  // the back layer's lower edge (SHC, built in world x, screen x + cam * W, so it scrolls with the scene): a still, slow uneven line under the
  // wind band (paintGas). The objects hang out of the band, their tops sunk in it, and are cut at their own lines
  const NS = 120, SHC = new Float32Array(NS + 1), TAU = 6.2832;
  function shcNow(x) { return shc(x, pW); }
  function shc(x, W) {
    const u = clamp01(x / W) * NS, k = Math.min(NS - 1, Math.floor(u));
    return SHC[k] + (SHC[k + 1] - SHC[k]) * (u - k);
  }

  // the fan: thin lines racing out of the horizon centre in the 1.2 s before the ceiling's gate opens (sea level k > 0 at
  // secs("break") 1.21, found by probing SRISE), held, then faded over the first 0.8 s of the ceiling's own clock
  const FAN_N = 14, FAN_LEAD = 1.2, FAN_OUT = 0.6, FAN_FADE = 0.8;
  function drawFan(ctx, W, H, k, t) {
    const G = window.Gen;
    if (!t || !G || typeof G.secs !== "function") return;   // t === 0 is the reduced-motion still: no intro
    let grow, a;
    if (k > 0) {
      a = 1 - clamp01((t - t0) / FAN_FADE); grow = 1;
      if (!(a > 0)) return;
    } else {
      const s = G.secs("break");
      if (s < 0 || s > FAN_LEAD + 0.05) return;
      grow = clamp01(s / FAN_OUT); a = 1;
    }
    grow = 1 - (1 - grow) * (1 - grow);
    const cx = G.sx(0), sc = Math.max(0.6, W / 1440), reach = Math.hypot(W, H);
    const cy = (G.DECK || 0.64) * H;   // the visible horizon in the break beat is the span's deck line, not the 0.46 H air
    ctx.save();
    ctx.strokeStyle = "rgba(170,178,190," + (0.7 * a).toFixed(3) + ")";
    ctx.lineWidth = Math.max(1.4, (1.6 + 0.6 * hash(5.5)) * sc);
    ctx.lineCap = "round";
    for (let i = 0; i < FAN_N; i++) {
      const f = (i + 0.5) / FAN_N;
      // 15 to 165 degrees above the horizontal, none going down into the ground
      const ang = (15 + 150 * f + (hash(i * 3.3 + 1) - 0.5) * 4) * Math.PI / 180;
      const len = reach * (0.45 + 0.55 * hash(i * 5.9 + 4)) * grow;
      const r0 = (0.02 + 0.03 * hash(i * 2.3 + 6)) * H;   // starts a little above the origin so the lines do not clump
      const dx = Math.cos(ang), dy = -Math.sin(ang);
      const wob = (hash(i * 9.7 + 3) - 0.5) * 0.05 * len;
      const sx0 = cx + dx * r0, sy0 = cy + dy * r0;
      ctx.beginPath();
      ctx.moveTo(sx0, sy0);
      ctx.quadraticCurveTo(cx + dx * len * 0.5 - dy * wob, cy + dy * len * 0.5 + dx * wob, cx + dx * (r0 + len), cy + dy * (r0 + len));
      ctx.stroke();
    }
    ctx.restore();
  }

  let OFF = null, SEA = null;

  // the back band as symbolic wind: a flat navy base, and over it gusts of short fat pale strokes. A gust comes every 2.5-4 s (one per 3.25 s slot, start
  // hashed +-0.4 s) and spawns 3-6 strokes staggered over 1 s; two more trickle strokes per slot keep 1-2 alive between gusts. A stroke is a precomputed path (a
  // wave, then a curl at its head) that draws on from its head (eased), then its tail erases it (trim: only the [tail, head] slice of the point list is
  // filled, as one polygon tapering to a point at both ends). Half are drawn in the band pass (behind the objects), half over them. A pool is reused: a
  // slot's strokes are rebuilt when its index changes
  const GN = 64, GSLOT = 3.25, GJ = 8, GPOOL = 4 * GJ;
  const GP = [];
  for (let i = 0; i < GPOOL; i++) GP.push({ key: -1e9, xy: new Float32Array(GN * 2), sp: 0, life: 1, w: 1, a: 1 });
  function gustStart(s) { return s === 0 ? 0.3 : s * GSLOT + (hash(s * 3.7 + 1) * 2 - 1) * 0.4; }   // slot 0 is seeded near the ceiling's start
  function narrBox(W, H) {   // [left, right, top] of the narration copy box in canvas px (x padded); a default where it is not laid out
    const el = document.querySelector('.genesis-copy'), r = el && el.getBoundingClientRect(), vw = window.innerWidth || W, vh = window.innerHeight || H;
    const pad = 0.02 * W;
    if (!r || r.width < 10) return [0.35 * W - pad, 0.65 * W + pad, 0.07 * H];
    return [r.left / vw * W - pad, r.right / vw * W + pad, r.top / vh * H];
  }
  function buildStroke(e, s, j, W, H) {
    const h = (n) => hash(s * 31.7 + j * 5.3 + n), xy = e.xy;
    const Lx = (0.15 + 0.2 * h(1)) * W, b = (j * 3 + s * 5) % GJ;   // a slot's strokes take distinct eighths of the width (3 is coprime with 8), the start eighth turning each slot: even spread
    let x0 = ((b + 0.8 * h(2)) / GJ - 0.15) * W;
    let y0 = H * (0.04 + 0.19 * h(3));   // inside the ceiling: the lowest point (y0 + amp, plus half the width) stays above 0.28 H
    let amp = H * (0.014 + 0.014 * h(4));
    const k = TAU / (Lx * (0.45 + 0.3 * h(5))), ph = h(6) * TAU;
    let R = H * (0.025 + 0.02 * h(7));
    const turns = 1 + 0.5 * h(8), nl = 40, nc = GN - nl, sl = 0.7 * Lx;
    // over the narration span (the copy box, top centre): the stroke rides above the box, compact (curl and wave scaled down to the room between the frame top and the box)
    const bx = narrBox(W, H), hw = 0.011 * H;
    if (x0 - R < bx[1] && x0 - R + Lx + 2 * R > bx[0]) {
      const room = Math.max(0.03 * H, bx[2] - 0.006 * H);   // the lowest edge of the stroke stays this far from the frame top
      R = 0.2 * room; amp = 0.08 * room;
      y0 = room * (0.92 + 0.08 * h(3)) - amp - hw;
    }
    for (let i = 0; i < nl; i++) { const u = i / nl; xy[i * 2] = x0 + sl * u; xy[i * 2 + 1] = y0 + amp * Math.sin(k * sl * u + ph); }
    const cx = x0 + sl, cy = y0 + amp * Math.sin(k * sl + ph);
    for (let i = 0; i < nc; i++) {
      const u = (i + 1) / nc, th = turns * TAU * u, r = R * (1 - 0.4 * u);
      xy[(nl + i) * 2] = cx + 0.3 * Lx * u + r * Math.sin(th); xy[(nl + i) * 2 + 1] = cy - r + r * Math.cos(th);
    }
    e.life = 2.4 + 1.2 * h(10); e.w = H * (0.014 + 0.008 * h(11)); e.a = 0.8 + 0.15 * h(12);
    e.sp = j < 6 ? j * 1.0 / 5 * (0.8 + 0.4 * h(9)) : (j - 5) * 1.1 + 0.4 * h(9);   // gust strokes staggered; the two trickle strokes later in the slot
  }
  function paintGusts(g, W, H, u, front, yS) {   // yS squeezes the strokes toward the top so none falls below the lowest cloud bottom
    g.fillStyle = 'rgb(215,236,245)';
    const s1 = Math.floor(u / GSLOT);
    for (let s = Math.max(0, s1 - 2); s <= s1 + 1; s++) {
      const st = gustStart(s), n = 3 + Math.floor(hash(s * 9.1 + 4) * 4);
      for (let j = (front ? 1 : 0); j < GJ; j += 2) {
        if (j >= n && j < 6) continue;
        const e = GP[(s % 4) * GJ + j], key = s * 8 + j;
        if (e.key !== key) { e.key = key; buildStroke(e, s, j, W, H); }
        const p = (u - st - e.sp) / e.life;
        if (p <= 0 || p >= 1) continue;
        const hd = 1 - Math.pow(1 - clamp01(p / 0.6), 2.2), tl = smooth(clamp01((p - 0.4) / 0.6));
        const i0 = Math.floor(tl * (GN - 1)), i1 = Math.floor(hd * (GN - 1));
        if (i1 - i0 < 2) continue;
        const xy = e.xy, cn = i1 - i0;
        g.globalAlpha = e.a * Math.min(1, (1 - p) * 4);
        g.beginPath();
        for (let side = 0; side < 2; side++) {
          for (let q = 0; q <= cn; q++) {
            const i = side ? i1 - q : i0 + q, ia = Math.max(i0, i - 1), ib = Math.min(i1, i + 1);
            let nx = xy[ib * 2 + 1] - xy[ia * 2 + 1], ny = xy[ia * 2] - xy[ib * 2];
            const nl = Math.hypot(nx, ny) || 1, t = (i - i0) / cn;   // width by place in the visible slice: a point at each end, widest 35% from the head
            const wd = 0.5 * e.w * (t < 0.65 ? Math.sin(Math.PI / 2 * t / 0.65) : Math.cos(Math.PI / 2 * (t - 0.65) / 0.35)) * (side ? -1 : 1) / nl;
            const px = xy[i * 2] + nx * wd, py = (xy[i * 2 + 1] + ny * wd) * yS;
            if (side === 0 && q === 0) g.moveTo(px, py); else g.lineTo(px, py);
          }
        }
        g.closePath(); g.fill();
      }
    }
    g.globalAlpha = 1;
  }
  const BAND_UP = 0.04;   // the band's wave line sits this share of H above the clouds' painted bottoms: about half the visible height of a lobe cloud
  // the band as air: four flat storm-slate layers (back darkest) hung from the top, each lower edge the clouds' line (SHC - BAND_UP H, a share of it per
  // layer) plus an erratic offset (three unrelated frequencies, each swelling and fading on its own slow clock, plus seeded jitter). The offsets stream
  // one way at a layer's own speed, the clock surging and lulling (always forward), so the edge reshapes as it travels; nothing bobs
  const AIRC = ['rgb(36,43,53)', 'rgb(45,53,65)', 'rgb(53,63,76)', 'rgb(66,77,91)'], AIRF = [1, 0.74, 0.52, 0.3];
  const AJN = 48, AJ = new Float32Array(AJN + 1);
  for (let i = 0; i < AJN; i++) AJ[i] = hash(i * 7.7 + 2) * 2 - 1;
  AJ[AJN] = AJ[0];
  function airEdge(i, k, W, H, g, t) {
    const cap = Math.max(SHC[k] - BAND_UP * H, 0.35 * SHC[k]), base = Math.max(cap - 0.02 * H, 0.085 * H);
    const u = k / NS - W * (0.012 + 0.012 * i) * g / W;   // world position in widths, streaming right
    const m0 = 0.6 + 0.4 * Math.sin(t * 0.23 + i * 2.1), m1 = 0.6 + 0.4 * Math.sin(t * 0.37 + i * 1.3 + 2), m2 = 0.6 + 0.4 * Math.sin(t * 0.51 + i * 0.7 + 4);
    const w = ((u * 6 % AJN) + AJN) % AJN, j = Math.floor(w), jt = AJ[j] + (AJ[j + 1] - AJ[j]) * (w - j);
    const off = H * (0.024 * m0 * Math.sin(TAU * 4.1 * u + i * 1.7) + 0.016 * m1 * Math.sin(TAU * 9.7 * u + i * 3.1 + 1) + 0.007 * m2 * Math.sin(TAU * 17.3 * u + i * 2.3 + 3) + 0.018 * jt);
    return Math.max(0.005 * H, Math.min(base * AIRF[i] + off * 1.6, cap));   // never below the old band line: the band must not cover the scene's orbs and rocks under the clouds
  }
  function paintAir(g, W, H, t) {
    const gt = t + 0.25 * Math.sin(0.7 * t) + 0.15 * Math.sin(1.9 * t + 1);   // surges and lulls, never backwards
    for (let i = 0; i < 4; i++) {
      g.fillStyle = AIRC[i];
      g.beginPath();
      g.moveTo(0, -0.1 * H);
      for (let k = 0; k <= NS; k++) g.lineTo(k / NS * W, airEdge(i, k, W, H, gt, t));
      g.lineTo(W, -0.1 * H);
      g.closePath();
      g.fill();
    }
  }
  function draw(ctx, W, H, k, t) {
    if (!(k > 0)) { t0 = null; drawFan(ctx, W, H, 0, t); return; }
    if (t && (t0 === null || t < lastT || t < t0)) t0 = t;
    const kd = window.GenElem.seaLevel(W, H);   // the floor sea's own level, surge and settle included: one motion (reduced motion too)
    lastT = t;
    drawFan(ctx, W, H, k, t);
    if (!(kd > 0)) return;
    const pal = window.GenCeilKinds.palette(), sc = Math.max(0.6, W / 1440);
    const cam = window.Gen && window.Gen.cam || 0;   // screen x = world x - cam * W, the sea's rate; negative too
    // the whole ceiling is drawn into one reused offscreen canvas (the top of the frame only), then dimmed and desaturated toward the sea colour
    // only the band the ceiling can reach: -0.1 H to 0.7 H (the surge peak is about 2 x the settled depth)
    ctx.save();   // the scene's own zoom stays on, as on the floor: an object is at the same screen x as its floor piece
    const a = Math.min(2, Math.round((ctx.getTransform().a || 1) * 64) / 64), ow = Math.ceil(W * a), oh = Math.ceil(H * 0.8 * a);   // getTransform allocates one DOMMatrix a frame: the zoom changes the scale, so it cannot be cached
    if (!OFF) OFF = document.createElement('canvas');
    if (!SEA) SEA = document.createElement('canvas');
    if (OFF.width !== ow || OFF.height !== oh) { OFF.width = ow; OFF.height = oh; }
    if (SEA.width !== ow || SEA.height !== oh) { SEA.width = ow; SEA.height = oh; }
    const oc = OFF.getContext('2d'), real = ctx;
    oc.setTransform(1, 0, 0, 1, 0, 0); oc.clearRect(0, 0, ow, oh); oc.setTransform(a, 0, 0, a, 0, H * 0.1 * a);
    ctx = oc;
    const x0 = cam * W;
    const fl = window.GenElem.seaLine(W, H);
    let low = 0;
    for (let k = 0; k <= NS; k++) { SHC[k] = H - fl[k]; if (SHC[k] > low) low = SHC[k]; }   // the floor's own water line (its wave shape, level and surge) mirrored about the middle
    const yS = Math.min(1, (low + 0.02 * H) / (0.27 * H));   // the strokes stay above the clouds' lowest painted bottom (their bottoms sit on this line, plus their bob)
    oc.setTransform(1, 0, 0, 1, 0, 0);
    const sx = SEA.getContext('2d');
    sx.setTransform(1, 0, 0, 1, 0, 0); sx.clearRect(0, 0, ow, oh); sx.setTransform(a, 0, 0, a, 0, H * 0.1 * a);
    const gu = t0 === null ? t : t - t0;   // the ceiling's own clock: a gust is alive at its first frame
    paintAir(sx, W, H, t);   // the storm-slate band under the scene's own zoom and pan: erratic edges streaming sideways in gusts, not the sea's painter
    paintGusts(sx, W, H, gu, false, yS);   // the strokes behind the objects
    real.drawImage(SEA, 0, 0, ow, oh, 0, -H * 0.1, W, H * 0.8);   // the band first, then the objects over it (each cut at its own line): the rocks, every hanger and the rocks' eyes behind, the clouds over them, the ones behind first
    oc.setTransform(a, 0, 0, a, 0, H * 0.1 * a);   // under the same zoom and offset
    drawSprites(oc, W, H, t, kd, sc, pal, cam, false, 0, true);   // the rocks
    drawSprites(oc, W, H, t, kd, sc, pal, cam, false, true);   // the hangers
    drawSprites(oc, W, H, t, kd, sc, pal, cam, false, 2);   // the rocks' eyes, before the clouds
    drawSprites(oc, W, H, t, kd, sc, pal, cam, false);   // the back row and the tiny clouds, in seed order
    drawSprites(oc, W, H, t, kd, sc, pal, cam, null);   // the front object clouds, higher ones on top
    paintGusts(oc, W, H, gu, true, yS);   // the strokes over the objects
    oc.setTransform(1, 0, 0, 1, 0, 0);
    real.drawImage(OFF, 0, 0, ow, oh, 0, -H * 0.1, W, H * 0.8);
    real.restore();
  }

  window.GenCeiling = { draw, sets: NSET };
})();
