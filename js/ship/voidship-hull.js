/* voidship-hull.js: the hull at rest (side view), v12: two long blades (upper lit, lower dark) clamping a lens-shaped lit city canyon,
   a citadel, trench, fins and shadows on the upper blade, a chin, ventral fin, hangars, bay and two pods on the lower,
   and at the stern a dark gap with a spine, three stacked nacelles and three bells.
   Local frame as VoidshipArt.drawHull: origin hull centre, +x nose, +y down, units of hull length L.
   All tables are built once at load (seeded, nothing random per frame).
   Published as window.VoidshipHull { drawRest, tintRing, dressRing, stats, sprite, anchors }. */
window.VoidshipHull = (function () {
  const A = window.VoidshipArt, C = A.COLORS, { fillPoly, rgba } = A;
  const RUST_LIT = [142, 43, 39], RUST_SHADE = [87, 26, 30];
  const BLACK = [12, 14, 17], ORANGE = [214, 120, 40];
  // the pale stud discs and the bells' pale inner rims keep their own pale grey in every zone
  const STUD = [138, 150, 161], BELL_RIM = [192, 200, 210];
  // v43j-3: the purple part (ring-side plating, keel slab, chin, cap bar, fork, spike) is dark metal pushed toward purple: same luminance, G low, B a little above R, paler tones less saturated
  const tint = ([r, g, b]) => {
    const L = 0.299 * r + 0.587 * g + 0.114 * b, k = Math.min(1, Math.max(0, (L - 90) / 70)) * 0.7;
    const f = [1.05, 0.87, 1.28].map((v) => 1 + (v - 1) * (1 - k));
    const s = L / (0.299 * f[0] + 0.587 * f[1] + 0.114 * f[2]) / L;
    const p = [Math.round(L * f[0] * s), Math.round(L * f[1] * s), Math.round(L * f[2] * s)].map((v) => Math.min(255, v));
    // palette F: the purple lands on navy (hue 226 + 0.3 of its offset from 262, saturation x1.15 + 0.05, value x0.8)
    const mx = Math.max(p[0], p[1], p[2]), d = mx - Math.min(p[0], p[1], p[2]);
    if (!d) return p;
    let h = mx === p[0] ? ((p[1] - p[2]) / d + 6) % 6 : mx === p[1] ? (p[2] - p[0]) / d + 2 : (p[0] - p[1]) / d + 4;
    h *= 60;
    const sv = d / mx;
    if (h < 235 || h > 295 || sv < 0.08) return p;
    const hn = (226 + (h - 262) * 0.3) / 60, sn = Math.min(1, sv * 1.15 + 0.05), vn = mx * 0.8;
    const ch = (n) => { const k2 = (n + hn) % 6; return Math.round(vn * (1 - sn * Math.max(0, Math.min(k2, 4 - k2, 1)))); };
    return [ch(5), ch(3), ch(1)];
  };
  // v43k-3: the lighter plates and edges darkened toward the spires' metal: the grey scaled by k, then the same purple push
  const tintD = (c, k) => tint(c.map((v) => Math.round(v * k)));
  // each zone is its own metal: hi / pale / mid / dark / trench (lightest to darkest), ar1 / ar2 the armour slab bodies
  // palette F, 2026-11-19: cold white top, bronze centre, navy lower hull; names such as WG_ ("works green") are historical
  const ZONES = {
    // top: warm bone steel (lit 210,203,188, mid 172,165,150, shade 124,118,106, deep 84,80,72)
    top: { hi: [192, 200, 210], pale: [170, 180, 190], mid: [150, 160, 172], dark: [101, 112, 124], trench: [66, 73, 84] },
    // middle: old brass, hard pale-brass highlights over a mid tone and a dark core (lit 212,190,120, mid 108,90,52, shade 70,58,34, deep 44,36,22)
    middle: { hi: [84, 88, 96], pale: [84, 88, 96], mid: [58, 61, 68], dark: [40, 42, 48], trench: [24, 25, 30] },
    // heavy (the bottom): the collar's slates (SEAT_L / SEAT_M / SEAT_D / SEAT_K)
    heavy: { hi: [156, 169, 180], pale: [145, 158, 170], mid: [133, 147, 160], dark: [92, 104, 114], trench: [54, 63, 71], ar1: [133, 147, 160], ar2: [112, 126, 138] },
    // engines: blackened iron (lit 162,160,154, mid 124,122,118, shade 84,83,80, deep 56,55,54)
    engines: { hi: [147, 153, 162], pale: [127, 135, 143], mid: [108, 114, 124], dark: [70, 75, 84], trench: [46, 52, 56] }
  };
  const AR1 = ZONES.heavy.ar1, AR2 = ZONES.heavy.ar2;
  let G_HI, G_PALE, G_MID, G_DARK, TRENCH;
  // switch the zone every following fill takes its greys from
  const zone = (n) => { const z = ZONES[n]; G_HI = z.hi; G_PALE = z.pale; G_MID = z.mid; G_DARK = z.dark; TRENCH = z.trench; };
  zone('top');
  // v43y: instrument materials, flat: pale steel (aft side), mid steel (fore side), graphite, dull brass
  const STL_P = [176, 190, 204], STL_M = [112, 126, 143], GRAPH = [46, 52, 64], BRASS = [150, 122, 68];
  // v42a: lean proportions: everything drawn is scaled sx in x about px and sy in y about py (inside the 0.8 y squeeze; py = the ring's centre line -0.015 / 0.8); the nacelles get a further x stretch
  const PROP = { sx: 1.4152, sy: 0.68, px: 0.3054, py: -0.01875 };
  // v43u-1: one big knife blade of the ring's purple lying on the cream, as [pts, colour] parts in the big ship's screen px (L 590 at 640,330): a lit top bevel, a face and a shaded lower third, a hard dark strip under its lower edge, one groove and a dash pair; the root (yt..yb) sits at the hand, the blade runs len px aft, its upper edge level to half its length, then one straight cut to the point (yp); the lower edge is one straight line
  const ringBlade = (yt, yb, len, yp) => {
    const x0 = 817.5, ys = [[yb, (yb + yp) / 2, yp], [yt, yt, yp]];
    const P = (f, i) => [x0 - len * i / 2, ys[1][i] + (ys[0][i] - ys[1][i]) * f];
    const band = (f0, f1, c) => [[P(f0, 0), P(f0, 1), P(f0, 2), P(f1, 2), P(f1, 1), P(f1, 0)], c];
    // a strip 2.5 px tall on the face at fraction f, from s1 to s2 px aft of the root (inside the first half), parallel to the edges
    const strip = (f, s1, s2, c) => {
      const Y = s => P(f, 0)[1] + (P(f, 1)[1] - P(f, 0)[1]) * s / (len / 2);
      return [[[x0 - s1, Y(s1)], [x0 - s2, Y(s2)], [x0 - s2, Y(s2) + 2.5], [x0 - s1, Y(s1) + 2.5]], c];
    };
    return [band(0, 0.16, [91, 100, 136]), band(0.16, 0.64, tintD([100, 114, 126], 0.88)), band(0.64, 1, tint([66, 80, 92])),
      strip(0.26, 18, 112, [52, 62, 72]), strip(0.5, 18, 58, [91, 100, 136]), strip(0.5, 68, 92, [91, 100, 136]),
      [[P(1, 0), P(1, 1), P(1, 2), [x0 - len, ys[0][2] + 2.5], [x0 - len / 2, ys[0][1] + 2.5], [x0, yb + 2.5]], [0, 0, 0], 0.3]];
  };
  const OPS = [];
  // the part every following op belongs to ('top' | 'hull' | 'mid' | 'nose'), switched at section starts; blueprint() outlines each part
  let PART = 'mid';
  const add = (pts, c, a) => OPS.push([pts, rgba(c, a == null ? 1 : a), PART]);
  const rc = (x0, y0, x1, y1, c, a) => add([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], c, a);
  // a flat round stud, radius 0.006, eight sides
  const stud = (cx, cy, sc) => { const hx = 0.005 / PROP.sx, hy = 0.005 / 0.8 / PROP.sy; add([[cx - hx, cy - hy], [cx + hx, cy - hy], [cx + hx, cy + hy], [cx - hx, cy + hy]], sc || STUD); };
  // an armour slab: body, 0.006 lightest top edge, 0.008 darkest under-step, studs down the forward edge; yb(x) is an optional bottom line
  // (heavy zone only; seam: a 0.004 near-black seam on the aft edge)
  const slab = (x0, x1, y0, y1, c, ns, yb, seam) => {
    const b0 = yb ? yb(x0) : y1, b1 = yb ? yb(x1) : y1;
    if (seam) rc(x0 - 0.004, y0, x0, b0 + 0.008, BLACK);
    add([[x0, y0], [x1, y0], [x1, b1], [x0, b0]], c);
    add([[x0, b0 - 0.006], [x1, b1 - 0.006], [x1, b1], [x0, b0]], G_DARK);
    rc(x0, y0, x1, y0 + 0.006, G_HI);
    add([[x0, b0], [x1, b1], [x1, b1 + 0.008], [x0, b0 + 0.008]], TRENCH);
    for (let k = 0; k < (ns || 0); k++) stud(x1 - 0.009, y0 + 0.016 + k * 0.03, G_HI);
  };
  // a recessed slot 0.05 long, 0.006 tall, with a dense window row inside
  const slot = (x, y) => { rc(x, y, x + 0.05, y + 0.006, BLACK); for (let d = x + 0.002; d < x + 0.048; d += 0.0032) { rc(d, y + 0.0022, d + 0.0017, y + 0.0039, C.LAMP, 0.85); stats.lights++; } };
  // a cockpit: raked bridge block 0.012 tall, lit top plane, shade face, one dark window band with a row of lit windows
  // flip: hangs downward, y is then the base (the surface it hangs from) and the ridge sits y + 0.0192 below it
  const cockpit = (x, y, l0, flip, pal) => {
    const k = 1.6, len = l0 * k, h = 0.012 * k, [C_MID, C_HI, C_DARK] = pal || [G_MID, G_HI, G_DARK];
    const Y = (o) => flip ? y + h - o : y + o, R = (xa, oa, xb, ob, c, a) => { const ya = Y(oa), yb = Y(ob); rc(xa, Math.min(ya, yb), xb, Math.max(ya, yb), c, a); };
    add([[x, Y(h)], [x, Y(0.003 * k)], [x + 0.006 * k, Y(0)], [x + len - 0.008 * k, Y(0)], [x + len, Y(h)]], C_MID);
    add([[x, Y(0.003 * k)], [x + 0.006 * k, Y(0)], [x + len - 0.008 * k, Y(0)], [x + len - 0.008 * k, Y(0.0022 * k)], [x + 0.006 * k, Y(0.0022 * k)], [x, Y(0.0052 * k)]], C_HI);
    R(x, 0.009 * k, x + len - 0.002 * k, h, C_DARK);
    R(x + 0.004 * k, 0.0035 * k, x + len - 0.008 * k, 0.0085 * k, BLACK);
    // the window band lit end to end
    for (let d = x + 0.0055 * k; d < x + len - 0.011 * k; d += 0.0035 * k) { R(d, 0.0052 * k, d + 0.0028, 0.0069 * k, C.LAMP, 0.85); stats.lights++; }
  };
  const vol = (x0, y0, x1, y1, t) => { rc(x0, y0, x1, y1, G_MID); rc(x0, y0, x1, y0 + t, G_PALE); rc(x0, y1 - t, x1, y1, G_DARK); };
  const stats = { lights: 0, facets: 0, bells: 0, towers: 0, terraces: 0, fins: 0, pods: 0, craft: 0 };
  let seed = 20717;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  // a tiny red bit: lit upper part, shaded lower part
  const q = (x, y, w, h) => { rc(x, y, x + w, y + h * 0.45, RUST_LIT); rc(x, y + h * 0.45, x + w, y + h, RUST_SHADE); stats.facets++; };
  // a window row from xa to xb: uneven groups of 3..14 dots, gaps of mixed length, dots 0.0017 square
  const runRow = (xa, xb, y) => {
    for (let x = xa; x < xb;) {
      const n = 3 + Math.floor(rnd() * 12);
      for (let k = 0, d = x; k < n && d < xb; k++, d += 0.004) { rc(d, y, d + 0.0017, y + 0.0017, C.LAMP, 0.8); stats.lights++; x = d + 0.004; }
      x += 0.005 + rnd() * rnd() * 0.04;
    }
  };
  // tiny towers, lighter grey with warm window dots: standing on a base line or hanging from a ceiling line
  const cluster = (x0, x1, yb, n, hang) => {
    for (let i = 0; i < n; i++) {
      const w = 0.004 + rnd() * 0.004, h = 0.01 + rnd() * 0.03, x = x0 + (i + rnd() * 0.6) / n * (x1 - x0 - w), t = hang ? yb : yb - h;
      rc(x, t, x + w, t + h, G_PALE);
      rc(x + w * 0.6, t, x + w, t + h, G_MID);
      if (!hang) rc(x, t, x + w, t + 0.0015, G_HI);
      for (let d = t + 0.004; d < t + h - 0.003; d += 0.006) { rc(x + w * 0.5 - 0.00125, d, x + w * 0.5 + 0.00125, d + 0.0025, C.LAMP, 0.9); stats.lights++; }
      stats.towers++;
    }
  };

  // ---- 1. the canyon is a lens: the upper blade's underside RF bows up, the lower blade's top LF bows down; back wall, a far layer of darker towers ----
  PART = 'mid';
  const RF = [[-0.42, -0.03], [-0.27, -0.065], [-0.10, -0.085], [0.08, -0.065], [0.28, -0.03], [0.34, -0.03]];
  const LF = [[-0.42, 0.04], [-0.27, 0.062], [-0.10, 0.075], [0.08, 0.062], [0.28, 0.04], [0.34, 0.04]];
  const at = (P, x) => {
    for (let i = 0; i < P.length - 1; i++) if (x <= P[i + 1][0]) return P[i][1] + (P[i + 1][1] - P[i][1]) * (x - P[i][0]) / (P[i + 1][0] - P[i][0]);
    return P[P.length - 1][1];
  };
  // a tower with a lit side and a shaded right side, window dots up its middle
  const tower = (x, t, w, h, hang, c1, c2, da) => {
    rc(x, t, x + w, t + h, c1);
    rc(x + w * 0.6, t, x + w, t + h, c2);
    if (!hang && c1 === G_PALE) rc(x, t, x + w, t + 0.0015, G_HI);
    for (let d = t + 0.004; d < t + h - 0.003; d += 0.006) { rc(x + w * 0.5 - 0.00125, d, x + w * 0.5 + 0.00125, d + 0.0025, C.LAMP, da); stats.lights++; }
    stats.towers++;
  };
  // a blade side as four stacked terraces between the lines ya(x) and yb(x): lightest strip on each top edge, darkest sliver under its overhang,
  // raked ends (bottom shifted by rk), uneven lengths over a dark back so the stack steps back; one dot row per terrace
  const stairs = (ya, hs, runs) => {
    let off = 0;
    runs.forEach(([x0, x1], i) => {
      const t0 = off, t1 = off + hs[i], r = 0.008, fa = (x) => ya(x) + t0, fb = (x) => ya(x) + t1;
      off = t1;
      add([[x0, fa(x0)], [x1, fa(x1)], [x1 - r, fb(x1 - r)], [x0, fb(x0)]], G_MID);
      add([[x0, fa(x0)], [x1, fa(x1)], [x1, fa(x1) + 0.0018], [x0, fa(x0) + 0.0018]], G_HI);
      add([[x0, fb(x0) - 0.003], [x1 - r, fb(x1 - r) - 0.003], [x1 - r, fb(x1 - r)], [x0, fb(x0)]], G_DARK);
      add([[x1 - 0.006, fa(x1)], [x1, fa(x1)], [x1 - r, fb(x1 - r)], [x1 - r - 0.006, fb(x1 - r)]], G_DARK);
      for (let x = x0 + 0.012; x < x1 - 0.02; x += 0.03) runRow(x, Math.min(x + 0.03, x1 - 0.02), (fa(x + 0.015) + fb(x + 0.015)) / 2 - 0.0008);
      stats.terraces++;
    });
  };

  // ---- 2. the upper blade: two long ramps up aft, a raked aft face ending at x -0.42; lit above the chine, mid below, lightest strip on top ----
  PART = 'top';
  const TOP = [[0.34, -0.19], [0.10, -0.20], [-0.08, -0.23], [-0.28, -0.24], [-0.38, -0.24]];
  // v42x: the blade's body ends at the citadel's fore face (x -0.211); the waist under the citadel is drawn after the housing
  const XB = -0.211;
  add(TOP.slice(0, 3).concat([[XB, -0.239], [XB, at(RF, XB)]], RF.filter((p) => p[0] > XB)), G_MID);
  add(TOP.concat([[-0.40, -0.15], [XB, -0.15], [XB, -0.15 + 0.03 * (XB + 0.40) / 0.70], [0.30, -0.12], [0.34, -0.12]]), G_PALE);
  // three huge armour plates, each aft plate over the next forward one, raked overlap edges with a mid-grey shadow wedge on the plate below
  add([[-0.02, -0.22], [0.10, -0.20], [0.34, -0.19], [0.34, -0.12], [0.08, -0.1294]], G_PALE);
  add([[-0.02, -0.22], [-0.012, -0.2186], [0.092, -0.1289], [0.08, -0.1294]], G_MID);
  add([[-0.24, -0.238], [-0.08, -0.23], [-0.02, -0.22], [0.08, -0.1294], [-0.14, -0.1388]], G_PALE);
  add([[-0.24, -0.238], [-0.228, -0.2357], [-0.128, -0.1385], [-0.14, -0.1388]], G_MID);
  add([[-0.38, -0.24], [-0.28, -0.24], [-0.24, -0.238], [-0.14, -0.1388], [XB, at([[-0.40, -0.15], [-0.14, -0.1388]], XB)], [XB, -0.15], [-0.40, -0.15]], G_PALE);
  // the shaded band under the plates: a dark back, then four stepped terraces
  {
    const PB = [[-0.40, -0.15], [-0.14, -0.1388], [0.08, -0.1294], [0.34, -0.12]], ya = (x) => at(PB, x), yb = (x) => at(RF, x), yl = (x) => -0.15 + 0.03 * (x + 0.40) / 0.74;
    const pts = [];
    for (let k = 0; k <= 14; k++) { const x = XB + (0.34 - XB) * k / 14; pts.push([x, ya(x)]); }
    for (let k = 14; k >= 0; k--) { const x = XB + (0.34 - XB) * k / 14; pts.push([x, yb(x)]); }
    add(pts, G_DARK);
    const n0 = OPS.length;
    stairs(yl, [0.008, 0.010, 0.013, 0.016], [[-0.30, 0.19], [-0.34, 0.24], [-0.37, 0.29], [-0.40, 0.335]]);
    // the stripes start at the citadel's fore face: cut every stripe edge to it, drop the dots left of it (the dot rows still draw so the lights keep their places)
    for (let i = OPS.length - 1; i >= n0; i--) {
      const pts = OPS[i][0];
      if (pts[1][0] - pts[0][0] < 0.002 && pts[0][0] < XB) OPS.splice(i, 1);
      else pts.forEach((p) => { if (p[0] < XB) p[0] = XB; });
    }
    // v45e-1: the v45c flat faces cover the stripes from low y 361 (hull y YC) down, from the fore face to hull x 0.1985: a piece wholly below YC is cut to x >= 0.1985 (dropped if nothing is left); a piece that reaches above YC is kept whole
    {
      const YC = (361 - 407.168) / 320.96, XC = 0.1985;
      for (let i = OPS.length - 1; i >= n0; i--) {
        const pts = OPS[i][0], out = [];
        if (pts.some((p) => p[1] < YC)) continue;
        pts.forEach((p, k) => {
          const q = pts[(k + 1) % pts.length], pi = p[0] >= XC, qi = q[0] >= XC;
          if (pi) out.push(p);
          if (pi !== qi) out.push([XC, p[1] + (q[1] - p[1]) * (XC - p[0]) / (q[0] - p[0])]);
        });
        if (out.length > 2) OPS[i][0] = out; else OPS.splice(i, 1);
      }
    }
    // the bulkhead at the citadel's fore face ends the stripes: a vertical cream slab with a shaded fore edge
    rc(XB, -0.15, XB + 0.012, at(RF, XB + 0.012), G_PALE); rc(XB + 0.008, -0.15, XB + 0.012, at(RF, XB + 0.012), G_DARK);
  }
  add(TOP.concat(TOP.slice().reverse().map(([x, y]) => [x, y + 0.004])), G_HI);
  add([[-0.38, -0.27], [-0.40, -0.15], [-0.385, -0.15], [-0.368, -0.27]], G_DARK);

  // ---- 3. the lower blade: longer, darker; mid above the chine, darkest below; a long tapering chin under the ring with one armour step, a raked aft end ----
  PART = 'hull';
  zone('heavy');
  // v36: one straight underside line from the stern up to the ring, B(x)
  const CHIN = [[0.34, 0.18], [-0.33, 0.285], [-0.35, 0.16]];
  add(LF.concat(CHIN), G_MID);
  add([[0.34, 0.15]].concat(CHIN, [[-0.35, 0.15]]), G_DARK);
  add(LF.concat(LF.slice().reverse().map(([x, y]) => [x, y + 0.004])), G_PALE);
  // the side band down to the chine: a dark back, then four stepped terraces
  {
    const ya = (x) => at(LF, x) + 0.004;
    const pts = [];
    for (let k = 0; k <= 14; k++) { const x = -0.33 + 0.67 * k / 14; pts.push([x, ya(x)]); }
    pts.push([0.34, 0.15], [-0.33, 0.15]);
    add(pts, G_DARK);
    stairs(() => 0.085, [0.020, 0.016, 0.013, 0.010], [[-0.24, 0.20], [-0.31, 0.26], [-0.36, 0.31], [-0.40, 0.34]]);
  }
  // heavy armour on the lower blade
  {
    const BOT = [[-0.33, 0.285], [0.34, 0.18]];
    // v39a: few large plates from the rail down to the straight underside: four along the underside, two stepped ones in the front wedge (steps at x 0.04 and 0.12);
    // [x0, x1, top y (the rail covers its first 0.006)]; lit top strip, shade face along the underside, a thin dark seam on each fore plate's aft edge
    const B = (x) => at(BOT, x), XAFT = -0.3426;
    // v42s: the bottom is a level chin from the ring to x 0.06, one big keel block, and one long slope up to the stern
    {
      const XB = -0.33, YR = B(0.06);
      const LH2 = tintD([112, 126, 138], 0.8), LHB = tint([92, 104, 114]), LHL = tintD([156, 169, 180], 0.68);
      // a window row of dots 0.0017 square on a 0.004 pitch, lit runs of 2..10 and dark gaps of 1..9 steps, its own fixed seed; yf(x) gives the row's y
      const lrow = (xa, xb, yf, s) => {
        let r = s;
        const nx = () => (r = (r * 48271) % 2147483647) / 2147483647;
        for (let x = xa; x < xb;) {
          const n = 2 + Math.floor(nx() * 9);
          for (let j = 0; j < n && x < xb; j++, x += 0.004) { const y = yf(x); rc(x, y, x + 0.0017, y + 0.0017, C.LAMP, 0.8); stats.lights++; }
          x += 0.004 * (1 + Math.floor(nx() * nx() * 9));
        }
      };
      // v42s: one big forward block under the plating (x 0.06 back to -0.0725, bottom 0.538) with its three decks as window rows, then one long plain slope up to the stern
      // v42y: the keel is a flat slab (underside level at Y 432, one 10 px step down at X 470) with a hanging fork under its forward end (v43a)
      {
        const ux = (X) => (X - 597.2) / 719.8, uy = (Y) => (Y - 327.2) / 321;
        const c = tintD([100, 114, 126], 0.88), deep = tint([66, 80, 92]);
        const xa = -0.40, xs = ux(548);
        // v43k-1: raked wedge: a 45 degree aft slant, a level run, one raked facet landing flush on the aft spire's aft edge (shot pixels, via the fork's mapping)
        const kx = (X) => (X - 565.19) / 834.97, ky = (Y) => (Y - 327.17) / 320.96;
        const kp = ([X, Y]) => [kx(X), ky(Y)];
        const W0 = [231.2, 396.2], W1 = [260, 425], W2 = [328.5, 425], W3 = [468.5, 455];
        // v43l-2: two straight slots through the wedge near its deep end, parallel to the lower facet (slope 30/140), 20 px long, 3.5 px tall, centres 12 px apart; holes cut with zero-width bridges from the facet and between them (counter-clockwise, like the spike's slots)
        const WS = 30 / 140, wfy = (X) => W2[1] + WS * (X - W2[0]);
        const wslot = (cy) => { const x0 = 426.2, x1 = 445.8, my = (X) => cy + WS * (X - 436); return { TL: [x0, my(x0) - 1.75], TR: [x1, my(x1) - 1.75], BL: [x0, my(x0) + 1.75], BR: [x1, my(x1) + 1.75] }; };
        const S1 = wslot(434), S2 = wslot(422);
        add([W0, [508.4, 396.2], [508.4, 455], [490, 455], W3, [S1.BR[0], wfy(S1.BR[0])], S1.BR, S1.TR, S2.BR, S2.TR, S2.TL, S2.BL, S2.BR, S1.TR, S1.TL, S1.BL, S1.BR, [S1.BR[0], wfy(S1.BR[0])], W2, W1].map(kp), c);
        const strip = (a, b) => add([a, b, [b[0], b[1] - 3.9], [a[0], a[1] - 3.9]].map(kp), deep);
        strip(W1, W2);
        strip(W2, W3);
        // v43a: a hanging fork (X, Y below are current shot pixels): a plain root, a long aft blade and a short fore blade with an open slot between them, and a red stone shard floating in the slot
        const gx = (X) => (X - 565.19) / 834.97, gy = (Y) => (Y - 327.17) / 320.96;
        const poly = (pts, col) => add(pts.map(([X, Y]) => [gx(X), gy(Y)]), col);
        const GM = tint([62, 66, 72]), CH = tint([34, 36, 41]), ED = tintD([140, 152, 162], 0.68);
        // v43c: the blades spread (aft 12 px aft, fore 18 px fore) so the gap is 60 px (X 536-596) and reads on the small ships
        // v43d: both blades raked aft: fore-side edges lean 22 deg (tan 0.404), aft-side edges 8 deg (tan 0.14)
        // v43d-b: the fore-side edges lean 27 deg (tan 0.52) so the tips narrow again
        const LK = 0.52, LS = 0.14;
        const AO = (Y) => 464 - LS * (Y - 426);
        const FL = (Y) => 658 - LK * (Y - 426);
        poly([[464, 400], [658, 400], [658, 426], [464, 426]], GM);
        // aft blade: raked inner face with three stair notches near the tip, aft face leaning back
        // v43j-2: the blades become spires in the spike's family. Aft blade: medium, hooked aft, its aft edge one circle (centre 295.3,468.6, radius 174), its fore edge straight facets with one step, a knife tip at (448, 552). Fore blade: small, hooked fore toward the spike, its fore edge one circle (centre 640,460, radius 36), its aft edge straight facets with one step, a tip at (610.5, 480.6)
        const arcAt = (cx, cy, r, a0, a1, n) => { const p = []; for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return p; };
        const ACX = 295.3, ACY = 468.6, ACR = 174, AA0 = -14.2, AA1 = 28.6;
        const AF = (Y) => 536 - 0.659 * (Y - 426);
        // v43j-2b: body: the fore edge moves out as straight facets with two steps, a knife over the last 15 px
        // v43l-2: the aft edge is one flatter circle (centre 128.33,447.51, radius 336.35, sag 6.0 px instead of 12.0) between the same two ends; one straight slot through the spire, parallel to the edge (dx/dy -0.15), 26 px long, 4.5 px wide, cut with a zero-width bridge from the fore edge
        const ACX2 = 128.33, ACY2 = 447.51, ACR2 = 336.35, AB0 = 18.08, AB1 = -3.68;
        const sx = (y) => 474 - 0.15 * (y - 505), SY0 = 492, SY1 = 518;
        const aP = [512 - 7 * (SY0 - 468) / 30, SY0];
        poly([[536, 426], [518, 468], [512, 468], aP, [sx(SY0) + 2.25, SY0], [sx(SY0) - 2.25, SY0], [sx(SY1) - 2.25, SY1], [sx(SY1) + 2.25, SY1], [sx(SY0) + 2.25, SY0], aP, [505, 498], [499, 498], [472, 537], [448, 552], ...arcAt(ACX2, ACY2, ACR2, AB0, AB1, 60)], GM);
        poly([...arcAt(ACX2, ACY2, ACR2, 12.69, -2.81, 40), ...arcAt(ACX2, ACY2, ACR2 + 4, -2.81, 12.69, 40)], ED);
        poly([[515, 436], [518, 436], [496, 470], [493, 470]], CH);
        // fore blade
        const FCX = 640, FCY = 460, FCR = 36, FA0 = 251, FA1 = 145;
        // v43l-2: the hook's fore edge is one flatter circle (centre 652.10,463.93, radius 44.83, sag 10.4 px instead of 14.3) between the same two ends
        const HCX = 652.10, HCY = 463.93, HCR = 44.83, HA0 = 237.9, HA1 = 158.1;
        poly([[582, 426], [628.2, 426], ...arcAt(HCX, HCY, HCR, HA0, HA1, 50), [572, 448], [577, 448]], GM); // v43j-2b: aft edge moves out, one step
        poly([...arcAt(HCX, HCY, HCR, HA0, 173.2, 40), ...arcAt(HCX, HCY, HCR - 4, 173.2, HA0, 40)], ED);
        poly([[594, 434], [596.5, 434], [598, 458], [595.5, 458]], CH);
        // v43k-2: a dark hanging building over the crystal, drawn over the cap bar and both roots: three off-centre tiers narrowing downward (X 528-600 / 542-590 / 540-570), two uneven prongs at the foot; near-black purple faces, a lit left strip, a 1 px edge line, a few red slits
        // v43f: third spike, rooted flush under the chin (bottom row 424) at X 715-789: drops steeply, bends aft like a talon to a point at (650, 615); edge strip on the aft face, one groove
        // v43g: the spike thins steadily below row 480 and ends in a claw point at (650, 615), no flat sole; the groove stops where it is still 22 px thick
        // v43j-1: the spike is a fat crescent hooked aft: its inner edge is one circle (centre 664,511, radius 67, dense points) from the fore blade's fore edge over the top, down the fore side and under the bottom; the outer edge is straight facets from the ring plating's foot down and aft to a knife tip at (637, 595); three slots cut through near the outer edge (zero-width bridges from the edge)
        const CX = 664, CY = 511, CR = 67, D2R = Math.PI / 180;
        const arc = (r, a0, a1, n) => { const p = []; for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * D2R; p.push([CX + r * Math.cos(a), CY + r * Math.sin(a)]); } return p; };
        const xs0 = FL(446), a0 = Math.atan2(-Math.sqrt(CR * CR - (xs0 - CX) * (xs0 - CX)), xs0 - CX) / D2R;
        const arcIn = arc(CR, a0, 90, 96);
        const OUT = [[836, 423], [833, 450], [826, 484], [815, 512], [802, 538], [780, 566], [751, 592], [705, 591], [672, 590], [648, 593.5], [637, 595]];
        const slot = (cx, cy, len, h, sl) => { const f = (y, e) => cx + e * len / 2 + sl * (y - cy); return [[f(cy - h / 2, 1), cy - h / 2], [f(cy - h / 2, -1), cy - h / 2], [f(cy + h / 2, -1), cy + h / 2], [f(cy + h / 2, 1), cy + h / 2]]; };
        const SLOTS = [slot(805, 455, 40, 14, -0.21), slot(803, 484, 32, 12, -0.3), slot(792, 516, 28, 10, -0.5)];
        const body = [[658, 418], [836, 418]];
        OUT.forEach((v, i) => {
          body.push(v);
          const w = OUT[i + 1];
          if (!w) return;
          SLOTS.forEach((s) => {
            const y = s[0][1];
            if (y <= v[1] || y >= w[1]) return;
            const P = [v[0] + (w[0] - v[0]) * (y - v[1]) / (w[1] - v[1]), y];
            body.push(P, s[0], s[1], s[2], s[3], s[0], P);
          });
        });
        body.push([650, 589.5], ...arcIn.slice().reverse(), [658, 426]);
        poly(body, GM);
        poly([...arc(CR, a0, 75, 80), ...arc(CR + 4, 75, a0, 80)], ED);
        poly([...arc(96, -58, 35, 60), ...arc(93, 35, -58, 60)], CH);
      }
      // the lit top band along the whole upper edge, 0.012 tall
      add([[XB, B(XB)], [0.06, YR], [0.06, YR + 0.012], [XB, B(XB) + 0.012]], LHL);
      // v42i: the chin, in the lower hull's own material: lit top rail continuing, body, a darker foot on row 424 (0.304), landing flat on the ring's aft face
      add([[0.06, B(0.06)], [0.3055, B(0.3055)], [0.3055, 0.304], [0.06, 0.304]], LH2);
      add([[0.06, B(0.06)], [0.3055, B(0.3055)], [0.3055, B(0.3055) + 0.012], [0.06, B(0.06) + 0.012]], LHL);
      rc(0.06, 0.294, 0.3055, 0.304, LHB);
      // v42j: the lower hull's skin on the chin: its dark slat lines at the deck spacing (0.0333), flat, and one window row between them
      [1, 2].forEach((k) => rc(0.06, B(0.06) + 0.0333 * k - 0.014, 0.3055, B(0.06) + 0.0333 * k, G_DARK));
      lrow(0.07, 0.30, () => B(0.06) + 0.0333 + 0.0075, 1777);
      // v43m-4: the talon's root throws one buttress tine up over the strip, its edge a true-circle arc (shot pixels)
      {
        const gx = (X) => (X - 565.19) / 834.97, gy = (Y) => (Y - 327.17) / 320.96;
        const poly = (pts, col) => add(pts.map(([X, Y]) => [gx(X), gy(Y)]), col);
        const GM = tint([62, 66, 72]), SD = tint([54, 63, 71]), SL = tint([133, 147, 160]);
        // v43n-4: the strip is one dark plate against one light plate, split by one raked line
        poly([[593, 411], [618, 399.5], [650, 401.5], [626, 425], [601, 425]], SD);
        poly([[650, 401.5], [712, 404], [704, 425], [626, 425]], SL);
        const arcP = [];
        for (let i = 0; i <= 24; i++) { const a = (127.7 + (52.3 - 127.7) * i / 24) * Math.PI / 180; arcP.push([747 + 18 * Math.cos(a), 402 + 18 * Math.sin(a)]); }
        poly([[715, 425.5], [720, 404], ...arcP, [789, 425.5]], GM);
        poly([[715, 425.5], [720, 404], [724, 404], [719.5, 425.5]], LHL);
      }
    }
    const PL = [[XAFT, -0.30, 0.204], [-0.30, -0.18, 0.204], [-0.18, -0.07, 0.204], [-0.07, 0.04, 0.204], [0.04, 0.12, 0.174], [0.12, 0.24, 0.144]];
    PL.forEach(([x0, x1, top], i) => {
      const bl = i ? x0 : -0.33, ab = B(bl), pt = i === 5 ? [[0.20, top], [0.235, 0.079], [0.24, 0.077]] : [[x1, top]];
      add([[x0, top]].concat(pt, [[x1, B(x1)], [bl, ab]]), i % 2 ? AR2 : AR1);
      add([[bl, ab - 0.014], [x1, B(x1) - 0.014], [x1, B(x1)], [bl, ab]], G_DARK);
      rc(x0, top + 0.002, Math.min(x1, 0.20), top + 0.007, G_HI);
      if (i < 5) rc(x1 - 0.005, top, x1, B(x1), G_DARK);
    });
    // the single window row along the armour, parallel to the underside, from the aft end to the front wedge
    for (let k = 0, x = -0.325; x < 0.035; x += 0.004, k++) {
      if (k % 13 > 9 || PL.some(([x0], i) => i && Math.abs(x - x0) < 0.004)) continue;
      rc(x, 0.2155, x + 0.0017, 0.2172, C.LAMP, 0.8); stats.lights++;
    }
  }

  // blade openings: the plating cut away over the same stone, a shadow sliver on the upper edge, bolts round the rim
  zone('top');
  // (the throat and its two armour jaws are drawn last, in section 8, so nothing paints over them)


  // ---- 5. dorsal: shadows cast forward and down (light from aft-up) on the lit plane, a long trench, a stepped citadel with raked forward faces, two masts, two shallow terraces ahead, two raked fins, two window rows ----
  PART = 'top';
  // cast shadows (one step darker than the plates): citadel, then the two fins
  add([[-0.15, -0.24], [-0.10, -0.222], [-0.10, -0.212], [-0.15, -0.226]], G_DARK);
  add([[-0.02, -0.229], [0.04, -0.21], [0.04, -0.196], [-0.02, -0.215]], G_DARK);
  add([[0.11, -0.204], [0.16, -0.19], [0.16, -0.178], [0.11, -0.19]], G_DARK);
  // a terraced recess cut into the middle plate: a second, small city open to the sky
  // one dark shape 0.16 long, floor stepping down aft in three steps to 0.035 deep
  add([[-0.15, -0.205], [0.01, -0.205], [0.01, -0.193], [-0.05, -0.193], [-0.05, -0.181], [-0.10, -0.181], [-0.10, -0.170], [-0.15, -0.170]], TRENCH);
  rc(-0.15, -0.205, 0.01, -0.202, G_DARK);
  rc(-0.05, -0.1935, 0.01, -0.1915, G_MID); rc(-0.10, -0.1815, -0.05, -0.1795, G_MID); rc(-0.15, -0.1705, -0.10, -0.1685, G_MID);
  cluster(-0.145, -0.108, -0.170, 2, false); cluster(-0.095, -0.058, -0.181, 2, false); cluster(-0.045, 0.005, -0.193, 2, false);
  runRow(-0.145, 0.005, -0.1985);
  rc(-0.12, -0.17, 0.18, -0.158, TRENCH); rc(-0.12, -0.158, 0.18, -0.156, G_HI);
  runRow(-0.115, 0.175, -0.1645);
  // citadel: two separate tiers and a small bridge block, one shared vertical aft face at x -0.38, forward faces raked
  // [forward x at top, top y, base y of the raked face, base x of the raked face, dot rows]; mid grey walls, a shadow wedge cast forward onto the ledge below
  // v42r: the cream top climbs aft in level decks: tier 1 (-0.404, 23 px up) from x 0.06 to -0.08, the peak (-0.488, 50 px up) to -0.33, then one step down to -0.2385 at the engines; each a lit left part, a shaded rest, a dark riser and a cast shadow on the lower deck
  // v44c: every cream-top window light is a solid 2 x 1 px rect on the big-ship pixel grid (hull x 834.97 px per unit from 565.187, y 320.96 from 327.168), 4 px pitch (2 on, 2 off), rows a whole 3 px apart; alpha 0.85, one in ten 1.0
  const lampPx = new Set();
  const lamps = (xa, xb, y, id, n, ok) => {
    const yp = Math.round(y * 320.96 + 327.168) + (n || 0) * 3;
    for (let xp = Math.ceil(xa * 834.97 + 565.187), j = 0; xp + 2 <= xb * 834.97 + 565.187 && xp + 2 <= 560; xp += 4, j++) {
      const hx = (xp - 565.187) / 834.97, hy = (yp - 327.168) / 320.96;
      if (ok && !ok(hx, hy)) continue;
      lampPx.add(xp * 1000 + yp); lampPx.add((xp + 1) * 1000 + yp);
      rc(hx, hy, (xp + 2 - 565.187) / 834.97, (yp + 1 - 327.168) / 320.96, C.LAMP, (j * 7 + id) % 10 === 0 ? 1 : 0.85); stats.lights++;
    }
  };
  const tier = (x0, x1, yt, yb, yn, rows, xr, ov, dk) => {
    // xr: the aft wall rakes to this x at the bottom
    // ov (v42u): the citadel's overhang: roof to x -0.47, chamfer to (-0.495,-0.56), aft face to (-0.495,-0.30), underside raking to (-0.41,-0.16); tf/bf are the top and bottom edge at x
    const xa = xr == null ? x0 : xr;
    const w = x1 - x0, xl = x0 + w * 0.3, xs = x1 - w * 0.25;
    // v45a: the stern is a raked transom: level roof to x -0.5116, a brow face to (-0.5056,-0.3807), a graphite housing x -0.5056 to -0.4649, a chin from (-0.495,-0.259) raking to the old underside at (-0.4343,-0.2)
    // v45a-2: the brow rises 18 px to y -0.4835 from x -0.5164 to -0.445; the underside is two level corbels: a chin soffit at y -0.2092 (x -0.4902 to -0.4422), a riser raked to the body's level bottom at (-0.4326, yb)
    const bf = (x) => ov && x < -0.4902 ? -0.2591 + (x + 0.495) / 0.0048 * 0.05 : ov && x < -0.4422 ? -0.2092 : ov && x < -0.4326 ? -0.2092 + (x + 0.4422) / 0.0096 * 0.0592 : yb;
    const xt = ov ? -0.5164 : x0;
    const xp0 = ov ? -0.445 : xt;
    const SOA = ov ? [[-0.4326, yb], [-0.4422, -0.2092], [-0.4902, -0.2092], [-0.495, -0.2591], [-0.5056, -0.3807], [-0.5164, -0.4835], [-0.445, -0.4835], [-0.445, yt]] : null;
    const SO = ov ? [[x1, yt], [x1, yb]].concat(SOA) : null;
    // v42r-fix2: the deck's surface: lit cream left part, mid body, shaded right part, plate seams, window dash rows, small fittings on the top
    add(ov ? SO : [[x0, yt], [x1, yt], [x1, yb], [xa, yb]], G_MID);
    add(ov ? [[-0.41, yt], [-0.41, yb]].concat(SOA) : [[x0, yt], [xl, yt], [xl, yb], [xa, yb]], dk ? G_DARK : G_HI);
    rc(xs, yt, x1, yb, G_DARK);
    rc(xp0, yt, x1, yt + 0.004, G_PALE);
    if (ov) rc(xt, -0.4835, xp0, -0.4835 + 0.004, G_PALE);
    // plate seams: vertical every ~0.05, a horizontal seam between window rows
    const np = Math.max(2, Math.round(w / 0.05)), pw = w / np, ph = (yb - yt - 0.05) / rows;
    for (let k = 1; k < np; k++) rc(x0 + k * pw - 0.0015, yt + 0.004, x0 + k * pw + 0.0015, bf(x0 + k * pw - 0.0015), G_DARK);
    for (let r = 1; r < rows; r++) {
      const sy = yt + 0.026 + r * ph - 0.0045;
      let sx = x0;
      if (ov) sx = Math.max(sx, -0.46);
      rc(sx, sy, x1, sy + 0.003, G_DARK);
    }
    // fittings on the top: vent boxes with slits, a hatch, a rail
    for (let k = 0; k < np; k++) {
      const fx = x0 + k * pw + pw * 0.3;
      if (fx < xp0) continue;
      if (k % 2 === 0) { rc(fx, yt + 0.007, fx + 0.014, yt + 0.0165, G_DARK); rc(fx + 0.002, yt + 0.0095, fx + 0.012, yt + 0.0105, BLACK); rc(fx + 0.002, yt + 0.0125, fx + 0.012, yt + 0.0135, BLACK); }
      else { rc(fx, yt + 0.007, fx + 0.02, yt + 0.0165, G_PALE); rc(fx, yt + 0.0155, fx + 0.02, yt + 0.0165, G_DARK); }
    }
    rc(xp0 + 0.004, yt + 0.0195, x1 - 0.004, yt + 0.0215, G_HI);
    if (yn != null) { rc(x1 - 0.008, yt + 0.004, x1, yn, G_DARK); rc(x1, yn, x1 + 0.016, yn + 0.01, G_DARK); }
    // window dashes at full size, grouped within each plate, some dark
    for (let r = 0; r < rows; r++) {
      const y = yt + 0.03 + r * ph;
      for (let k = 0; k < np; k++) {
        // the old dashes stay only where they reach into the join's frozen box (big-ship x >= 560)
        for (let x = x0 + k * pw + 0.006, j = 0; x + 0.0085 <= x0 + (k + 1) * pw - 0.005 && x + 0.0085 <= x1 - 0.012; x += 0.011, j++) {
          if ((j + r * 2 + k) % 4 === 3 || (x + 0.0085) * 834.97 + 565.187 <= 560) continue;
          rc(x, y, x + 0.0085, y + 0.0065, C.LAMP, 0.85); stats.lights++;
        }
        for (let n = 0; n < 4; n++) lamps(x0 + k * pw + 0.006, Math.min(x0 + (k + 1) * pw - 0.005, x1 - 0.012), y, r * 2 + k + n, n, (x, yy) => !ov || !(x < -0.445 || yy < yt + 0.006 || yy + 0.0031 > bf(x) - 0.014));
      }
    }
    // the overhang's underside in shade
    if (ov) {
      // v45a-2: each riser face one tone darker; a solid 2 px graphite band under each soffit; the level seam at the old roof y across the brow; one dotted row of lights on the brow
      add([[-0.4422, -0.2092], [-0.4326, yb], [-0.4278, yb], [-0.4374, -0.2092]], G_PALE);
      rc(-0.4902, -0.2092, -0.4422, -0.2092 + 2 / 320.96, GRAPH);
      rc(-0.4326, yb, -0.41, yb + 2 / 320.96, GRAPH);
      rc(-0.508, yt, xp0, yt + 1 / 320.96, G_DARK);
      lamps(-0.5042, -0.5042 + 20 / 834.97, -0.4585, 5, 0);
      // the housing: a graphite recess set into the cream, pale steel rims on its lips, one darker inner step
      add([[-0.5056, -0.3775], [-0.4649, -0.3775], [-0.4649, -0.2592], [-0.495, -0.2592]], GRAPH);
      rc(-0.5056, -0.3775, -0.4649, -0.3713, STL_P);
      rc(-0.495, -0.2654, -0.4649, -0.2592, STL_P);
      rc(-0.4729, -0.3713, -0.4649, -0.2654, [30, 32, 38]);
    }
    stats.terraces++;
  };
  // v42t: an uneven stair: a long low deck, one short mid tier, a big jump to the tall citadel at x -0.44, no rakes
  // v43a: the mid tier drops 18 px (top y -0.4024) so the lowered podium roof still stands above it; two window rows fit
  // v43b: the mid tier's top comes down to the deck line (y -0.381), so the deck runs level to the podium's fore face, one sheer 15 px step
  // v43c: the podium roof runs on forward as a terrace to x -0.121 (Y 190), and the one 15 px step stands at its fore face; the terrace is drawn first so the deck covers the riser's cast shadow
  // v43c-b: the terrace's lit part is the podium's shade carried on (dk), so no light/dark joint at x -0.211
  tier(-0.211, -0.121, -0.4274, -0.24, -0.380, 2, null, false, true);
  tier(-0.121, 0.06, -0.381, -0.30, null, 1);
  // v42u: the citadel hangs aft over the main engine: its roof runs to x -0.47, a chamfer, an aft face at x -0.495, a raked underside
  // v42y: the citadel is a low podium (roof y -0.4835) under a stepped tower: shaft, upper shaft, crown and a mast, each stepped in unevenly, one shade strip under each stepping edge, window columns
  // v43a: the podium roof drops 18 px to y -0.4274 (Y 190), the tower and fin ride down with it
  tier(-0.495, -0.211, -0.4274, -0.15, null, 2, null, true);
  rc(-0.47, -0.4274 + 0.0215, -0.128, -0.4274 + 0.034, G_DARK);
  rc(-0.215, -0.4274 + 0.0195, -0.207, -0.4274 + 0.0215, G_HI);
  const storey = (x0, x1, yt, yb, cols, shade, keep) => {
    const w = x1 - x0;
    rc(x0, yt, x1, yb, G_MID);
    rc(x0, yt, x0 + w * 0.3, yb, G_HI);
    rc(x1 - w * 0.25, yt, x1, yb, G_DARK);
    rc(x0, yt, x1, yt + 0.004, G_PALE);
    if (cols.length) {
      // v44e: each row runs across the face between its outer ribs (cols holds the rib offsets), 2 on / 2 off, skipping the ribs; rows 3 px apart
      const rw = 0.0041, a = x0 + cols[0] + rw, b = x0 + cols[cols.length - 1];
      for (let j = 0; yt + 0.03 + j * 3 / 320.96 + 0.0032 <= yb - 0.014; j++) {
        if (j % 4 === 3) continue;
        lamps(a, b, yt + 0.03, j * 3, j, (hx) => !cols.some((o) => hx + 2 / 834.97 > x0 + o && hx < x0 + o + rw) && (!keep || keep(hx * 834.97 + 565.187, j)));
      }
    }
    if (shade) rc(x0, yt + 0.0215, x1, yt + 0.034, G_DARK);
    stats.terraces++;
  };
  storey(-0.3879, -0.2296, -0.6205, -0.4274, [0.011, 0.0455, 0.0805, 0.1155], true,
    // v44f: the lights in four uneven clusters (px box xa, xb, row ja, jb); the rest stays plain cream
    (px, j) => [[253, 330, 0, 4], [322, 337, 8, 10], [253, 337, 13, 13], [253, 264, 8, 9]].some(([xa, xb, ja, jb]) => px >= xa && px <= xb && j >= ja && j <= jb));
  // v44a: the tower slimmer: levels A and B (aft wall flush) and C, D (centred on the lamp axis -0.3585) narrow in six stages; widths 0.0709, 0.0588, 0.050, 0.042 (were 0.1028 and 0.0583)
  storey(-0.3879, -0.3170, -0.6922, -0.6205, [0.010, 0.0405, 0.0615], true);
  storey(-0.3879, -0.3291, -0.7576, -0.6922, [0.010, 0.0405], true);
  storey(-0.3835, -0.3335, -0.7826, -0.7576, [], false);
  storey(-0.3795, -0.3375, -0.8075, -0.7826, [], false);
  // v43x-1: a stepped crown on the tower: two set-back blocks and a level platform 0.05 wide, empty
  // v44e: the crown's two blocks 0.0510 and 0.0500 wide, so the platform and its stay feet (-0.3835 to -0.3340) overhang by at most 1 px
  [[-0.3840, -0.3330, -0.8165, -0.8075], [-0.3835, -0.3335, -0.8250, -0.8165]].forEach(([x0, x1, yt, yb]) => {
    const w = x1 - x0;
    rc(x0, yt, x1, yb, G_MID); rc(x0, yt, x0 + w * 0.3, yb, G_HI); rc(x1 - w * 0.25, yt, x1, yb, G_DARK); rc(x0, yt, x1, yt + 0.0025, G_PALE);
  });
  rc(-0.3835, -0.8280, -0.3335, -0.8250, G_PALE); rc(-0.3835, -0.8262, -0.3335, -0.8250, G_MID);
  // v43x-1: pilaster ribs between the window columns: a pale strip with a shadow line beside it
  const pil = (x, yt, yb) => { rc(x, yt, x + 0.0026, yb, G_PALE); rc(x + 0.0026, yt, x + 0.0041, yb, G_DARK); };
  [0.011, 0.0455, 0.0805, 0.1155].forEach((o) => pil(-0.3879 + o, -0.6205 + 0.036, -0.4274 - 0.016));
  [0.010, 0.0405, 0.0615].forEach((o) => pil(-0.3879 + o, -0.6922 + 0.036, -0.6205 - 0.016));
  [0.010, 0.0405].forEach((o) => pil(-0.3879 + o, -0.7576 + 0.036, -0.6922 - 0.016));
  // v43v: the cream top as a fortress city: set-back terraces down from the tower's foot, long level rows of lit windows, buttress fins
  // a level window row of 2 px lights, 2 on and 2 off, a dark gap now and then (the lamps helper; no rnd, so the later rows keep their seed)
  [[-0.3879, -0.2296, -0.6205, -0.4274], [-0.3879, -0.3170, -0.6922, -0.6205], [-0.3879, -0.3291, -0.7576, -0.6922]].forEach(([x0, x1, yt, yb], k) => { lamps(x0 + 0.008, x1 - 0.008, yt + 0.0105, k); lamps(x0 + 0.008, x1 - 0.008, yb - 0.0092, k + 4); });
  lamps(-0.3835 + 0.008, -0.3335 - 0.008, -0.7826 + 0.0105, 2); lamps(-0.3795 + 0.008, -0.3375 - 0.008, -0.8075 + 0.0105, 6);
  lamps(-0.115, -0.012, -0.3385, 7);
  // v44d: recess bands, deck seams and a trench, each a solid 1 or 2 px row or column on the big-ship grid, placed in the gaps between the lit rows (lampPx holds every drawn light)
  const d44 = {};
  {
    const X = (x) => Math.round(x * 834.97 + 565.187), Y = (y) => Math.round(y * 320.96 + 327.168);
    const R = (xa, ya, xb, yb, c) => rc((xa - 565.187) / 834.97, (ya - 327.168) / 320.96, (xb - 565.187) / 834.97, (yb - 327.168) / 320.96, c);
    const rowFree = (y, h, xa, xb) => { for (let yy = y; yy < y + h; yy++) for (let xx = xa; xx < xb; xx++) if (lampPx.has(xx * 1000 + yy)) return false; return true; };
    // a dark band across the faces' segments at the free row nearest the target y
    const band = (segs, yt, h, c) => {
      const ps = segs.map(([a, b]) => [X(a), X(b)]);
      for (const d of [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6]) if (ps.every(([a, b]) => rowFree(yt + d, h, a, b))) { ps.forEach(([a, b]) => R(a, yt + d, b, yt + d + h, c)); return; }
    };
    // the segments of a face between its ribs (each rib 0.0041 wide)
    const between = (x0, x1, ribs) => { const s = []; let a = x0; ribs.forEach((o) => { s.push([a, x0 + o]); a = x0 + o + 0.0041; }); s.push([a, x1]); return s; };
    band(between(-0.3879, -0.2296, [0.011, 0.0455, 0.0805, 0.1155]), 148, 2, GRAPH);
    band(between(-0.3879, -0.2296, [0.011, 0.0455, 0.0805, 0.1155]), 173, 1, GRAPH);
    band(between(-0.3879, -0.3170, [0.010, 0.0405, 0.0615]), 117, 1, GRAPH);
    band([[-0.49, -0.211]], 238, 2, GRAPH);
    const seam = (xt, ya, yb, c) => { for (const d of [0, 1, -1, 2, -2, 3, -3]) { let ok = true; for (let yy = ya; yy < yb && ok; yy++) if (lampPx.has((xt + d) * 1000 + yy)) ok = false; if (ok) { R(xt + d, ya, xt + d + 1, yb, c); return; } } };
    d44.band = band; d44.seam = seam;
    // forward deck face (px y 211 to 220) and terrace face (px y 199 to 220): 1 px seams at uneven spacing
    [[473, G_MID], [489, G_MID], [523, G_DARK], [552, G_DARK]].forEach(([x, c]) => seam(x, 211, 220, c));
    [[405, G_MID], [428, G_DARK]].forEach(([x, c]) => seam(x, 199, 220, c));
  }
  // a terrace block: lit left part, shaded right part, a lit top lip over a hard dark strip, window rows at the offsets from the top;
  // yn is the surface to its right: a cast strip lies on it
  const block = (x0, x1, yt, yb, offs, yn, id) => {
    const w = x1 - x0;
    rc(x0, yt, x1, yb, G_MID); rc(x0, yt, x0 + w * 0.3, yb, G_HI); rc(x1 - w * 0.25, yt, x1, yb, G_DARK);
    rc(x0, yt, x1 + 0.005, yt + 0.005, G_PALE); rc(x0, yt + 0.005, x1, yt + 0.012, G_DARK);
    // wide tall blocks: pilaster ribs, the window rows broken into bays between them
    const np = w >= 0.04 && yb - yt >= 0.05 ? 3 : 0, xs = [x0 + 0.006];
    for (let i = 1; i <= np; i++) { const px = x0 + w * i / (np + 1); pil(px, yt + 0.014, yb - 0.004); xs.push(px - 0.002, px + 0.0041 + 0.002); }
    xs.push(x1 - 0.006);
    // v44c: rows 3 px apart from the first offset down to a little past the last, inside the face
    if (offs.length) {
      const o1 = Math.min(offs[offs.length - 1] + 0.0125, yb - yt - 0.006);
      for (let i = 0; i < xs.length; i += 2) for (let k = 0; yt + offs[0] + k * 3 / 320.96 <= yt + o1; k++) lamps(xs[i], xs[i + 1], yt + offs[0], id + k + i, k);
    }
    if (yn != null) rc(x1, yn, x1 + 0.012, yn + 0.005, G_DARK);
    stats.terraces++;
  };
  // the staircase down from the tower's foot, lowest first so each higher block lies over the cast strip of its neighbour
  // v44a: five uneven steps: widths 0.0111, 0.0285, 0.021, 0.034 then one long terrace 0.095 (aft end, carries the big dish); drops 0.0144, 0.017, 0.019, 0.016, then one tall wall of 0.040 (the forward blocks stand on the deck, base -0.381)
  block(-0.0511, -0.040, -0.3954, -0.381, [], -0.381, 0);
  block(-0.0796, -0.0511, -0.4124, -0.381, [0.0155], -0.3954, 1);
  block(-0.1006, -0.0796, -0.4314, -0.381, [0.0175, 0.0335], -0.4124, 2);
  block(-0.1346, -0.1006, -0.4474, -0.381, [0.0175, 0.0335, 0.0495], -0.4314, 3);
  block(-0.2296, -0.1346, -0.4874, -0.4274, [0.0175, 0.0335, 0.0495], -0.4474, 4);
  // two set-backs on the tower: an aft shoulder on the podium roof and a ledge on the first storey's top
  block(-0.3170, -0.2893, -0.6705, -0.6205, [0.0175, 0.0335], -0.6205, 6);
  block(-0.445, -0.3879, -0.5274, -0.4274, [0.0175, 0.0335, 0.0495, 0.0655, 0.0815], null, 8);
  // v43x-1: stepped buttresses leaning on the tower and the terraces: the slope in three flights with two level landings, a pale strip along the top edge, two ribs on the face, a soft cast strip on the wall; aft-facing ones take the light tones, fore-facing ones the mid and dark
  const fin = (xv, yt, xb, yb) => {
    const s = xb < xv ? -1 : 1, u = Math.abs(xb - xv), H = yb - yt, lit = s < 0;
    const P = [[0, 0], [0.30, 0.34], [0.42, 0.34], [0.70, 0.68], [0.82, 0.68], [1, 1]].map(([a, b]) => [xv + s * u * a, yt + H * b]);
    rc(s < 0 ? xv : xv - 0.005, yt, s < 0 ? xv + 0.005 : xv, yb, lit ? G_MID : G_DARK, 0.6);
    add(P.concat([[xv, yb]]), lit ? G_HI : G_MID);
    for (let i = 0; i < 5; i++) { const a = P[i], b = P[i + 1]; add([a, b, [b[0], b[1] + 0.005], [a[0], a[1] + 0.005]], G_PALE); if (a[1] === b[1]) rc(Math.min(a[0], b[0]), a[1] + 0.005, Math.max(a[0], b[0]), a[1] + 0.008, G_DARK); }
    [0.2, 0.55].forEach((f) => {
      const x = xv + s * u * f - 0.0013, yr = yt + H * (f < 0.3 ? f / 0.3 * 0.34 : f < 0.42 ? 0.34 : 0.34 + (f - 0.42) / 0.28 * 0.34) + 0.009;
      rc(x, yr, x + 0.0026, yb, lit ? G_PALE : G_MID); rc(x + 0.0026, yr, x + 0.0041, yb, lit ? G_MID : G_DARK);
    });
    stats.fins++;
  };
  fin(-0.372, -0.70, -0.4379, -0.5274);
  fin(-0.2456, -0.5774, -0.190, -0.4874);
  fin(-0.3170, -0.6890, -0.2893, -0.6705);
  // v43x-2: three giant structures on the tower group (1 px = 0.0012 across, 0.00312 down): the great array on the aft shoulder, the beacon tower with its antenna bundle on the crown platform
  // a lit-aft, shaded-fore upright box: left 30% light, right 25% dark
  const lit3 = (x0, x1, yt, yb) => { const w = x1 - x0; rc(x0, yt, x1, yb, G_MID); rc(x0, yt, x0 + w * 0.3, yb, G_HI); rc(x1 - w * 0.25, yt, x1, yb, G_DARK); };
  // a straight brace of thickness t between two points (a slanted strip)
  const brace = (xa, ya, xb, yb, t, c) => add([[xa, ya], [xa + t, ya], [xb + t, yb], [xb, yb]], c);
  // v43z-2: a rect given in big-ship screen pixels (the big ship is 590 long at 640,330; hull x runs 834.97 px per unit from 565.187, hull y 320.96 px per unit from 327.168), so a 1 px part lands on one pixel column or row
  const pr = (xa, ya, xb, yb, c) => rc((xa - 565.187) / 834.97, (ya - 327.168) / 320.96, (xb - 565.187) / 834.97, (yb - 327.168) / 320.96, c);
  // v45b-1: a polygon given in low-sheet pixels (shot43: the big ship at (640,410), so hull y 320.96 px per unit from 407.168)
  const lp = (pts, c) => add(pts.map(([x, y]) => [(x - 565.187) / 834.97, (y - 407.168) / 320.96]), c);
  // v47a-1: works green, the centre's own metal (five flat tones)
  const WG_S = [45, 29, 17], WG_D = [70, 49, 29], WG_M = [103, 77, 42], WG_L = [145, 116, 61], WG_E = [194, 167, 107], WG_K = [28, 17, 8];
  // v48k-1: an in-between tone for the engines, between WG_M and WG_L
  const WG_H = [125, 97, 52];
  {
    // beacon tower: plinth, plain shaft, open lantern of four pillars round one big lamp, a cornice; on it the antenna bundle
    const bx0 = -0.3790, bx1 = -0.3478, bc = (bx0 + bx1) / 2, u = 0.0012;
    // antenna bundle: three upright masts 2 px wide with 2 px gaps (1 px pale aft, 1 px mid fore), the middle one tallest; brass collars 2 px tall; two 1 px stays from the crown platform's ends
    // v43z-2: thin; every mast, bar and collar is placed in whole screen pixels of the big ship (masts at px x 257, 261, 265; the base at row 18)
    const mpx = [257, 261, 265], mtp = [-26, -45, -10];
    brace(-0.3835, -0.8280, (257 - 565.187) / 834.97, -0.9725, 0.0012, STL_P); brace(-0.3359, -0.8280, (266 - 565.187) / 834.97, -0.9725, 0.0012, STL_M);
    lit3(-0.3820, -0.3460, -0.8436, -0.8280); rc(-0.3820, -0.8436, -0.3460, -0.8405, G_PALE);
    rc(-0.3460, -0.8280, -0.3340, -0.8250, G_DARK);
    lit3(bx0, bx1, -0.9122, -0.8436); rc(bx0, -0.9122, bx1, -0.9028, G_PALE);
    rc(bx0, -0.9559, bx1, -0.9122, BLACK);
    rc(bc - 5 * u, -0.9466, bc + 5 * u, -0.9216, C.LAMP); stats.lights++;
    [[0, 4, G_HI], [6, 10, G_MID], [16, 20, G_MID], [22, 26, G_DARK]].forEach(([a, b, c]) => rc(bx0 + a * u, -0.9559, bx0 + b * u, -0.9122, c));
    rc(-0.3805, -0.9653, -0.3463, -0.9559, G_PALE); rc(-0.3805, -0.9653, -0.3463, -0.9622, G_HI);
    mpx.forEach((x, i) => { pr(x, mtp[i], x + 1, 18, STL_P); pr(x + 1, mtp[i], x + 2, 18, STL_M); });
    [11, 1, -7].forEach((y) => pr(257, y, 267, y + 2, BRASS));
    // sideways parts: five level 1 px cross-bars on the middle mast above the others, a 1 px boom reaching aft from the aft mast with three 1 px uprights, a 4 px graphite box on the fore mast's top
    [12, 20, 28, 36, 44].forEach((w, i) => { const y = -44 + i * 4; pr(262 - w / 2, y, 262, y + 1, STL_P); pr(262, y, 262 + w / 2, y + 1, STL_M); });
    pr(217, -10, 257, -9, STL_P);
    [[220, 5], [246, 8], [255, 5]].forEach(([x, h]) => pr(x, -10 - h, x + 1, -10, STL_P));
    pr(264, -13, 268, -10, GRAPH); pr(264, -13, 268, -12, STL_P);
  }
  {
    // v43y-2: the telescope on the aft podium roof: a low cream plinth, an A trunnion support, a graphite tube 90 px long tilted 35 degrees up and aft, pivoting a third from its back end, with a pale top strip, steel bands, a dark open end with a blue glass chip, a finder tube on top and a brass counterweight (1 px = 0.0012 across, 0.00312 down)
    // v43z-1: rebuilt thin: a tube 130 px long, 5 px at the open end and 4 at the back, tilted 50 degrees, pivot a third up from the back, an A frame of two 2 px legs 36 px tall
    const ux = 0.0012, uy = 0.00312, pvx = -0.438, pvy = -0.6522, ca = Math.cos(50 * Math.PI / 180), sa = Math.sin(50 * Math.PI / 180);
    const tp = (s, h) => [pvx + (-s * ca + h * sa) * ux, pvy + (-s * sa - h * ca) * uy];
    const hh = (s) => 2 + (s + 43) / 130 * 0.5;
    lit3(pvx - 0.0100, pvx + 0.0100, -0.5399, -0.5274); rc(pvx - 0.0100, -0.5399, pvx + 0.0100, -0.5374, G_PALE);
    brace(pvx - 0.0100, -0.5399, pvx - 0.0012, pvy, 0.0024, STL_P); brace(pvx + 0.0076, -0.5399, pvx - 0.0012, pvy, 0.0024, STL_M);
    add([tp(-43, -hh(-43)), tp(87, -hh(87)), tp(87, hh(87)), tp(-43, hh(-43))], GRAPH);
    add([tp(-43, hh(-43) - 1), tp(87, hh(87) - 1), tp(87, hh(87)), tp(-43, hh(-43))], STL_P);
    [[8, 9], [38, 39], [68, 69]].forEach(([a, b]) => add([tp(a, -hh(a)), tp(b, -hh(b)), tp(b, hh(b)), tp(a, hh(a))], STL_P));
    add([tp(86, -hh(86)), tp(87, -hh(87)), tp(87, hh(87)), tp(86, hh(86))], BLACK);
    add([tp(-43, -3.5), tp(-35, -3.5), tp(-35, 3.5), tp(-43, 3.5)], STL_M);
    add([tp(-47, -2), tp(-43, -2), tp(-43, 2), tp(-47, 2)], BRASS);
  }
  {
    // v43y-2: the big dish on the first terrace: a cream two-step plinth, a tapered steel pedestal 36 px tall, a small yoke, a bowl of six straight facets 80 px across the rim and 18 px deep facing up and fore at 40 degrees, a 2 px pale rim over a graphite sliver, three struts to a brass feed 38 px out, three graphite ribs on the back shell
    // v43z-1: rebuilt as a skeleton: a lattice mast 40 px tall on a lower, narrower plinth, a graphite bowl 80 px across and 12 px deep in six facets with a pale rim line, a steel back line and four ribs to a hub, three 1 px struts to a 3 px brass feed
    const ux = 0.0012, uy = 0.00312, cx = -0.2075, ty = -0.4998 - 40 * uy, c4 = Math.cos(40 * Math.PI / 180), s4 = Math.sin(40 * Math.PI / 180);
    const cX = cx + 0.0110, cY = ty - 0.0245;
    const dp = (u, v) => [cX + (u * s4 + v * c4) * ux, cY + (u * c4 - v * s4) * uy];
    const vo = (u) => -12 + 12 * (u / 40) * (u / 40), us = [-40, -26.5, -13, 0, 13, 26.5, 40];
    lit3(cx - 0.0120, cx + 0.0120, -0.4936, -0.4874); rc(cx - 0.0120, -0.4936, cx + 0.0120, -0.4917, G_PALE);
    lit3(cx - 0.0072, cx + 0.0072, -0.4998, -0.4936); rc(cx - 0.0072, -0.4998, cx + 0.0072, -0.4979, G_PALE);
    add([[cx - 0.0048, -0.4998], [cx - 0.0036, -0.4998], [cx - 0.0012, ty], [cx - 0.0024, ty]], STL_P); add([[cx + 0.0036, -0.4998], [cx + 0.0048, -0.4998], [cx + 0.0024, ty], [cx + 0.0012, ty]], STL_M);
    [0.2, 0.4, 0.6, 0.8].forEach((t) => { const hf = 0.0048 - t * 0.0024; rc(cx - hf, -0.4998 - t * 40 * uy, cx + hf, -0.4998 - t * 40 * uy + uy, STL_M); });
    const shell = us.map((u) => dp(u, vo(u)));
    add(shell.concat([dp(40, 0), dp(-40, 0)]), GRAPH);
    for (let i = 0; i < 6; i++) add([shell[i], shell[i + 1], dp(us[i + 1], vo(us[i + 1]) + 1), dp(us[i], vo(us[i]) + 1)], STL_M);
    [-40, -20, 20, 40].forEach((u) => add([dp(u, 0), dp(u, 1), dp(0.5, -11), dp(-0.5, -11)], STL_M));
    add([dp(-40, 0), dp(40, 0), dp(40, 1), dp(-40, 1)], STL_P);
    [-38, 0, 38].forEach((u) => add([dp(u - 0.5, 1), dp(u + 0.5, 1), dp(0.5, 30), dp(-0.5, 30)], STL_M));
    add([dp(-1.5, 29.5), dp(1.5, 29.5), dp(1.5, 32.5), dp(-1.5, 32.5)], BRASS);
  }
  {
    // v43y-3: six small quiet tools on free roofs (1 px = 0.0012 across, 0.00312 down): a Yagi on the second tier's roof, a small dish on the first terrace's roof fore of the big dish, a whip pair on the cockpit's roof, a level baseline rail with five small receivers
    const ux = 0.0012, uy = 0.00312;
    {
      // Yagi: a 2 px post 28 px tall (px x 292, rows 56 to 84), a level 1 px boom 44 px long pointing forward, six 1 px upright elements 15 to 5 px
      // v44a: moved down 21 px (rows 77 to 105) onto the tower's lower level's roof
      pr(292, 77, 293, 105, STL_P); pr(293, 77, 294, 105, STL_M);
      pr(292, 77, 336, 78, STL_P);
      [15, 13, 11, 9, 7, 5].forEach((h, i) => pr(298 + i * 7, 77 - (h - 1) / 2, 299 + i * 7, 78 + (h - 1) / 2, STL_P));
    }
    {
      // small dish: a graphite bowl 24 px across in three facets tilted 40 degrees up and aft, a 1 px pale rim, two 1 px struts to a feed point, a 1 px post
      // v44e: moved 22 px fore along the same roof, 6 px or more clear of the big dish
      const cx = -0.1675 + 22 * ux, y0 = -0.4874, c4 = Math.cos(40 * Math.PI / 180), s4 = Math.sin(40 * Math.PI / 180);
      const cX = cx - 0.0055, cY = y0 - 13 * uy;
      const dp = (u, v) => [cX - (u * s4 + v * c4) * ux, cY + (u * c4 - v * s4) * uy];
      const vo = (u) => -6 + 6 * (u / 12) * (u / 12), us = [-12, -4, 4, 12];
      rc((447 - 565.187) / 834.97, y0 - 9 * uy, (448 - 565.187) / 834.97, y0, STL_P);
      add(us.map((u) => dp(u, vo(u))).concat([dp(12, 0), dp(-12, 0)]), GRAPH);
      add([dp(-12, 0), dp(12, 0), dp(12, 1), dp(-12, 1)], STL_P);
      [-11, 11].forEach((u) => add([dp(u - 0.5, 1), dp(u + 0.5, 1), dp(0.5, 12), dp(-0.5, 12)], STL_M));
    }
    {
      // whip pair: two 1 px whips 60 and 44 px tall, a 1 px tie between them, a 4 px brass box at the foot, on the cockpit's roof just forward of the stair block (moved off the horn roof, where the rail now runs)
      pr(536, 195, 540, 199, BRASS);
      pr(536, 135, 537, 195, STL_P); pr(539, 151, 540, 195, STL_P);
      pr(537, 175, 539, 176, STL_P);
    }
    {
      // baseline rail on the horn's and stair's roofs: a level 1 px mid-steel rail in two level runs (8 px above each roof) on four 1 px posts, five 1 px by 5 px pale receivers
      // v44a: the roofs below are now four steps; each run moved up (run 1 by 13 px to row 176, run 2 by 6 px to row 187), its posts reach down to the roof under them (rows 184, 195, 195, 200)
      pr(464, 176, 503, 177, STL_M); pr(503, 187, 532, 188, STL_M);
      pr(465, 177, 466, 183.6, STL_M); pr(500, 177, 501, 194.8, STL_M); pr(506, 188, 507, 194.8, STL_M); pr(530, 188, 531, 200.3, STL_M);
      [[472, 176], [484, 176], [494, 176], [514, 187], [523, 187]].forEach(([x, y]) => pr(x, y - 5, x + 1, y, STL_P));
    }
  }
  [[0.12, 0.23, -0.212], [0.23, 0.31, -0.203]].forEach(([x0, x1, y]) => {
    rc(x0, y, x1, -0.19, G_MID); rc(x0, y, x1, y + 0.004, G_HI); rc(x1 - 0.005, y + 0.004, x1, -0.19, G_DARK);
    stats.terraces++;
  });
  // v42i: the housing's top is one level line at -0.332 (the collar's top) from the citadel's front edge to the ring's aft face: a strip of housing material over the old deck, the sails, cockpits and masts raised with it by dk(x)
  const dk = (x) => -0.332 - at(TOP, x);
  add([[-0.19, -0.332], [0.3055, -0.332], [0.3055, at(TOP, 0.3055) + 0.004], [0.10, at(TOP, 0.10) + 0.004], [-0.08, at(TOP, -0.08) + 0.004], [-0.19, at(TOP, -0.19) + 0.004]], G_PALE);
  add([[0.3055, at(TOP, 0.3055) - 0.004], [0.3055, at(TOP, 0.3055) + 0.004], [0.10, at(TOP, 0.10) + 0.004], [-0.08, at(TOP, -0.08) + 0.004], [-0.19, at(TOP, -0.19) + 0.004], [-0.19, at(TOP, -0.19) - 0.004], [-0.08, at(TOP, -0.08) - 0.004], [0.10, at(TOP, 0.10) - 0.004]], G_MID);
  rc(-0.19, -0.332, 0.3055, -0.326, G_HI);
  // v44d: the plain slab under the deck (px y 221 to 252, x < 560): one low row of lights, one trench and 1 px seams, all on the big-ship grid; the trench and the last seam end together at x 552
  lamps(-0.115, -0.012, -0.3085, 9);
  d44.band([[(412 - 565.187) / 834.97, (552 - 565.187) / 834.97]], 236, 2, GRAPH);
  [[431, G_MID], [458, G_MID], [497, G_MID], [531, G_MID], [552, G_MID]].forEach(([x, c]) => d44.seam(x, 223, 250, c));
  stats.terraces++;
  // v42j: under the strip the housing is one solid mass to the collar, sitting on the rock's level top: the stacked deck bands run on, dark lines with window rows
  const seed0 = seed; seed = 4242; // its own seed, so the later window rows stay put
  add([[0.10, at(TOP, 0.10) + 0.004], [0.3055, at(TOP, 0.3055) + 0.004], [0.3055, -0.12], [0.10, -0.12]], G_PALE);
  rc(0.10, -0.186, 0.3055, -0.183, G_DARK); runRow(0.105, 0.30, -0.178);
  rc(0.10, -0.165, 0.3055, -0.162, G_MID); runRow(0.105, 0.30, -0.157);
  rc(0.10, -0.144, 0.3055, -0.141, G_DARK); runRow(0.105, 0.30, -0.136);
  rc(0.10, -0.126, 0.3055, -0.123, G_MID);
  seed = seed0;
  // v45b-1: the sloped wedge on the stern brow is gone: the brow's roof runs level to the podium's aft wall
  // v42o: the ring's slate runs aft into the bone top as three tiers of plating, each ending in an angled cut, so the seam is a stepped diagonal; two conduits dive into the bone at staggered points
  {
    const PL = [156, 169, 180], PM = [133, 147, 160], PD = [92, 104, 114], PK = [54, 63, 71], PB = [180, 192, 200];
    // v43j-3: tinted twins for the plating; the pipes, collars, vent and studs keep the grey ones
    const TM = tintD(PM, 0.8), TD = tint(PD), TK = tint(PK), TB = tintD(PB, 0.68);
    const XR = 0.3055;
    // v43n-4: one big dark tine on the cream deck between the lower pipe and the stone block, pointing aft (about 24 px tall at the root, 150 long)
    stats.terraces++;
    // v43t-3: the conduits run in under one blade of the ring's metal; the vent is painted over it
    const bx = x => 0.3054 + (x - 820.2) / 835, by = y => -0.01875 + ((y - 330) / 472 + 0.01875) / 0.68, sy = v => 330 + 472 * (0.68 * (v + 0.01875) - 0.01875);
    // a convex polygon cut to the screen-y band [lo, hi]
    const clipY = (pts, lo, hi) => [[1, lo], [-1, hi]].reduce((P, [s, e]) => P.flatMap((p, i) => {
      const q = P[(i + 1) % P.length], dp = s * (p[1] - e), dq = s * (q[1] - e), t = dp / (dp - dq), r = [];
      if (dp >= 0) r.push(p);
      if (dp * dq < 0) r.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      return r;
    }), pts);
    const bands = [[sy(-0.312), sy(-0.272)], [sy(-0.262), sy(-0.222)]];
    // the blade's cast onto a conduit: a 3 px dark strip along the slanted cut, cut to the pipe
    const cast = (p, q) => bands.forEach(([lo, hi]) => {
      const s = clipY([p, q, [q[0], q[1] - 3], [p[0], p[1] - 3]], lo, hi);
      if (s.length > 2) add(s.map(([x, y]) => [bx(x), by(y)]), BLACK, 0.6);
    });
    // two thick conduits from the ring (0.040, about 13 px), lit top, shade below, each ending in a stepped round collar where it dives into the cream
    [[-0.312, 0.07], [-0.262, 0.125]].forEach(([y, xe]) => {
      rc(xe, y, XR, y + 0.04, PM); rc(xe, y, XR, y + 0.016, PL); rc(xe, y + 0.027, XR, y + 0.04, PD);
      rc(xe - 0.008, y - 0.006, xe + 0.01, y + 0.046, PM); rc(xe - 0.016, y + 0.002, xe - 0.008, y + 0.038, PM);
      rc(xe - 0.008, y - 0.006, xe + 0.01, y + 0.006, PL); rc(xe - 0.016, y + 0.002, xe - 0.008, y + 0.011, PL);
      rc(xe - 0.008, y + 0.036, xe + 0.01, y + 0.046, PD); rc(xe - 0.016, y + 0.03, xe - 0.008, y + 0.038, PD);
      stud(xe + 0.001, y + 0.02, PB);
    });
    ringBlade(229, 275, 250, 267).forEach(([pts, c, al]) => add(pts.map(([x, y]) => [bx(x), by(y)]), c, al));
    // the cream grows over the blade's level upper edge: a plate from the hand's aft edge 150 px aft, top 14 px over the deck's top (219), one raked cut at its aft end, a hard cast strip on the purple under it, a lit top edge, one panel line and two deck dashes
    {
      const scr = pts => pts.map(([x, y]) => [bx(x), by(y)]);
      add(scr([[817.5, 234], [692.5, 234], [692.5, 237.5], [817.5, 237.5]]), BLACK, 0.5);
      add(scr([[817.5, 205], [697.5, 205], [667.5, 234], [817.5, 234]]), G_PALE);
      add(scr([[817.5, 205], [697.5, 205], [696.3, 208], [817.5, 208]]), G_HI);
      add(scr([[757, 208], [759.5, 208], [737, 234], [734.5, 234]]), G_MID);
      add(scr([[780, 218], [808, 218], [808, 220.5], [780, 220.5]]), G_MID);
      add(scr([[704, 218], [722, 218], [722, 220.5], [704, 220.5]]), G_MID);
    }
    // v45d-1: the deck grips the blade: a graphite socket the tip enters (pale steel collar bar on its forward face, 1 px pale steel top line), one 2 px graphite limit line on the cream side of the blade's raked edge, two cream clasps lapping 6 px onto the purple; low-sheet px, the edge runs from (567.5, 347) to (692.5, 309)
    {
      const ZT = ZONES.top, E = x => 347 - 0.304 * (x - 567.5);
      // a strip between two edge-parallel offsets (a, b px below the edge) from xa to xb
      const EB = (xa, xb, a, b, c) => lp([[xa, E(xa) + a], [xb, E(xb) + a], [xb, E(xb) + b], [xa, E(xa) + b]], c);
      EB(596, 676, -2, 0, GRAPH);
      lp([[556, 345], [565, 337], [596, 337], [596, 353], [556, 353]], GRAPH);
      lp([[565, 337], [595, 337], [595, 338], [565, 338]], STL_P);
      lp([[595, 336], [597, 336], [597, 354], [595, 354]], STL_P);
      [[600, 622], [634, 646]].forEach(([xa, xb]) => {
        EB(xa, xb, -3, 6, ZT.pale);
        EB(xb - 1, xb, -3, 6, ZT.dark);
        EB(xa, xb, 6, 7, GRAPH);
      });
    }
    // one big recessed vent, about 40 by 18 px, dark slits, a lit lower lip
    rc(0.228, -0.206, 0.284, -0.15, PK); rc(0.228, -0.153, 0.284, -0.15, PL);
    for (let k = 0; k < 7; k++) rc(0.233, -0.202 + k * 0.0072, 0.279, -0.1985 + k * 0.0072, BLACK);
    // a few of the ring's bolt heads
    [[0.29, -0.322], [0.29, -0.252], [0.29, -0.15]].forEach(([x, y]) => stud(x, y, PB));
  }
  // a second raked armour overlap on the forward plate, shadow wedge 0.014 deep
  zone('heavy');
  zone('top');
  // a long shallow trench aft of the recess, 0.20 long, 0.012 deep, tower stubs standing in it
  rc(-0.37, -0.215, -0.17, -0.203, TRENCH); rc(-0.37, -0.203, -0.17, -0.2015, G_HI);
  [[-0.355, 0.005, 0.009], [-0.33, 0.004, 0.011], [-0.30, 0.006, 0.008], [-0.275, 0.004, 0.010], [-0.24, 0.007, 0.009], [-0.205, 0.004, 0.007]].forEach(([x, w, h]) => tower(x, -0.203 - h, w, h, false, G_PALE, G_MID, 0.9));
  runRow(-0.365, -0.175, -0.2105);
  // one long recessed street on the plain lit plane: dense window row inside, six tiny roof blocks with shade slivers on its upper edge
  rc(-0.10, -0.1475, 0.06, -0.1415, BLACK);
  for (let x = -0.098; x < 0.058; x += 0.0034) { rc(x, -0.1448, x + 0.0017, -0.1431, C.LAMP, 0.9); stats.lights++; }
  [[-0.088, 0.006, 0.004], [-0.056, 0.008, 0.006], [-0.02, 0.005, 0.005], [0.01, 0.007, 0.004], [0.035, 0.004, 0.006], [0.05, 0.006, 0.005]].forEach(([x, w, h]) => {
    rc(x, -0.1475 - h, x + w, -0.1475, G_MID); rc(x, -0.1475 - h, x + w, -0.1475 - h + 0.0014, G_HI); rc(x + w * 0.6, -0.1475 - h + 0.0014, x + w, -0.1475, G_DARK);
  });
  // a field of small raised blocks in two uneven groups: lit top strip, forward shadow sliver
  [[-0.372, -0.185, 0.012, 0.007], [-0.352, -0.178, 0.006, 0.005], [-0.34, -0.19, 0.02, 0.008], [-0.31, -0.175, 0.009, 0.006], [-0.296, -0.186, 0.014, 0.007], [-0.278, -0.165, 0.007, 0.005], [-0.265, -0.18, 0.011, 0.006]].forEach(([x, y, w, h]) => {
    rc(x + w, y + 0.002, x + w + 0.005, y + h + 0.0015, G_DARK); rc(x, y, x + w, y + h, G_MID); rc(x, y, x + w, y + 0.002, G_HI);
  });

  // ---- 6. lower blade: one hangar slot with a dot row and craft, two pods on thick struts, one long window row ----
  PART = 'hull';
  zone('heavy');
  // (v39a: the hangar slot and the dock on the slate are gone)
  add([[-0.33, 0.135], [-0.30, 0.135], [-0.308, 0.155], [-0.338, 0.155]], TRENCH); add([[-0.33, 0.135], [-0.30, 0.135], [-0.3016, 0.1385], [-0.3316, 0.1385]], BLACK);
  add([[-0.3366, 0.153], [-0.3302, 0.153], [-0.3306, 0.156], [-0.3373, 0.156]], G_PALE); add([[-0.3373, 0.156], [-0.3306, 0.156], [-0.331, 0.1575], [-0.338, 0.1575]], G_HI); runRow(-0.325, -0.315, 0.1425);
  zone('top');
  // the three old fore-deck masts stay: they lie in the shot's frozen box next to the ring
  [[0.325, -0.19, 0.05], [0.16, -0.212, 0.035], [0.26, -0.203, 0.028]].forEach(([x, y, h]) => { const d = x < 0.3 ? dk(x) : 0; rc(x, y + d - h, x + 0.0012, y + d, G_HI); });
  zone('heavy');

  // ---- 7. stern: a dark gap behind the blades crossed by the canyon spine, three stacked nacelles with chamfered fronts, one bell each with a near-black mouth in a light rim ----
  PART = 'mid';
  zone('engines');

  // ---- 7b. the canyon is covered: plated housing down to a stepped red slit, below it the machine built round the nose's root ----
  PART = 'mid';
  {
    const XA = -0.42, XE = 0.24, MR = [128, 38, 36], DP = [70, 18, 18], BR = [164, 54, 48];
    // seam segments [x0, x1, y]: the neck, the raised step, then the long run
    const SEG = [[-0.44, -0.215, -0.005], [-0.215, 0.0, -0.05], [0.0, XE, 0.01]];
    // the zone's lower edge: 0.23 aft, then three hard steps up to 0.14
    const LEP = [[-0.44, 0.20], [-0.05, 0.20], [-0.049, 0.20], [0.04, 0.20], [0.041, 0.17], [0.12, 0.17], [0.121, 0.14], [0.20, 0.14], [0.235, 0.075], [XE, 0.073]];
    const LE = (x) => at(LEP, x);
    // the stone head right behind the ring
    [[[[0.335, -0.17], [0.36, -0.17], [0.36, -0.09], [0.335, -0.07]], BR],
      [[[0.335, -0.07], [0.36, -0.09], [0.36, 0.07], [0.335, 0.05]], MR],
      [[[0.335, 0.05], [0.36, 0.07], [0.36, 0.16], [0.335, 0.16]], RUST_SHADE]].forEach(([p, c]) => { add(p, c); stats.facets++; });
    // housing: lit plane from the old underside RF down to the seam, a shade band under the overhang, a lit lip on the seam
    zone('top');
    SEG.forEach(([xa, xb, s], si) => {
      const a = Math.max(xa, XA), n = 10, t = [];
      // v42x: the first segment is the waist under the citadel, drawn further down
      if (si) {
        for (let k = 0; k <= n; k++) { const x = a + (xb - a) * k / n; t.push([x, at(RF, x) - 0.001]); }
        add(t.concat([[xb, s], [a, s]]), G_PALE);
        const u = [], v = [];
        for (let k = 0; k <= n; k++) { const x = a + (xb - a) * k / n; u.push([x, at(RF, x) - 0.001]); v.push([x, Math.min(at(RF, x) + 0.010, s)]); }
        add(u.concat(v.reverse()), G_DARK);
      }
      rc(a, s - 0.004, xb, s, G_MID);
      stats.terraces++;
    });
    // long window strips, a dark recess with a dot row
    [[-0.40, -0.20, -0.015], [-0.30, -0.20, -0.040], [-0.175, -0.04, -0.060], [0.0, 0.23, -0.012], [0.0, 0.12, -0.040]].forEach(([x0, x1, y]) => {
      rc(x0, y, x1, y + 0.005, BLACK); runRow(x0 + 0.002, x1 - 0.002, y + 0.0017);
    });
    // ten identical small balcony blocks
    for (let i = 0; i < 10; i++) {
      const x = 0.0 + i * 0.022;
      rc(x, 0.0, x + 0.008, 0.0069, G_MID); rc(x, 0.0, x + 0.008, 0.0013, G_HI); rc(x + 0.006, 0.0013, x + 0.008, 0.0069, G_DARK);
    }

    // the middle: the nose's dark red rock as the back layer, a wall of vertical running belts over it, the tongue over their tops
    zone('middle');
    // faceted rock between yt and yb (numbers or functions of x), x0 to x1, in facets about fl long (0.065); three layers, lightest upper-left, darkest lower-right
    const rock = (x0, x1, yt, yb, sd, cols = [BR, MR, DP], fl = 0.065) => {
      const ft = typeof yt === 'function' ? yt : () => yt, fb = typeof yb === 'function' ? yb : () => yb, n = Math.max(1, Math.round((x1 - x0) / fl));
      for (let k = 0; k < n; k++) {
        const xa = x0 + (x1 - x0) * k / n, xb = x0 + (x1 - x0) * (k + 1) / n, d = ((sd + k * 3) % 5 - 2) * 0.04;
        const fa = [0, 0.38, 0.7, 1], fz = [0, 0.38 + d, 0.7 - d, 1], P = (x, f) => [x, ft(x) + (fb(x) - ft(x)) * f];
        for (let l = 0; l < 3; l++) { add([P(xa, fa[l]), P(xb, fz[l]), P(xb, fz[l + 1]), P(xa, fa[l + 1])], cols[Math.min(2, l + (k >= n * 0.6 ? 1 : 0))]); stats.facets++; }
      }
    };
    // the back layer is the nose's rock in its two darker reds, big hard facets, from the stern wall to the front rock; no black left
    add([[-0.44, -0.001], [-0.215, -0.001], [-0.215, -0.046], [0.0, -0.046], [0.0, 0.014], [XE, 0.014]].concat(LEP.slice().reverse()), DP);
    [[-0.44, -0.215, -0.001, 5], [-0.215, 0.0, -0.046, 6], [0.0, XE, 0.014, 7]].forEach(([xa, xb, s, sd]) => rock(xa, xb, s, LE, sd, [MR, DP, MR], 0.085));
    // lit top strip under the seam, stepped as the seam
    SEG.forEach(([xa, xb, s]) => rc(Math.max(xa, -0.44), s + 0.004, xb, s + 0.011, G_PALE));
    // v42x: the waist under the citadel: a dark recessed neck, three cream buttresses crossing it, a wider mid cream sill on the brass top line;
    // open background shows aft of the neck and between it and the fore face
    {
      const nA = -0.382, nB = -0.211, yU = -0.15, yS = 0.009, yN = yS - 0.025;
      zone('top');
      rc(nA, yU, nB, yN, TRENCH);
      // v48p-1: aft of the tower (x 246..363) the neck carries one fascia (y 359..372) hanging from the top and three stepped piers; low-sheet pixels
      {
        const xa = 565.187 + 834.97 * nA, xt = 363;
        lp([[xa, 372], [xt, 372], [xt, 374], [xa, 374]], [45, 51, 58]);
        lp([[xa, 359], [xt, 359], [xt, 372], [xa, 372]], G_PALE);
        lp([[xa, 371], [xt, 371], [xt, 372], [xa, 372]], G_MID);
        [[252, 288], [300, 344]].forEach(([r0, r1]) => { for (let x = r0; x <= r1; x += 4) lp([[x, 365], [x + 1, 365], [x + 1, 366], [x, 366]], C.LAMP); });
        // [x0, x1]: the pier shaft; head 2 px wider each side and 4 px tall, foot 3 px wider each side and 5 px tall with a lighter top row
        [[262, 284], [304, 316], [334, 346]].forEach(([x0, x1]) => {
          lp([[x0, 372], [x1, 372], [x1, 402], [x0, 402]], G_PALE);
          lp([[x0, 372], [x0 + 2, 372], [x0 + 2, 402], [x0, 402]], G_HI);
          lp([[x1 - 1, 372], [x1, 372], [x1, 402], [x1 - 1, 402]], G_MID);
          lp([[x0 - 2, 372], [x1 + 2, 372], [x1 + 2, 376], [x0 - 2, 376]], G_PALE);
          lp([[x0 - 3, 397], [x1 + 3, 397], [x1 + 3, 402], [x0 - 3, 402]], G_PALE);
          lp([[x0 - 3, 397], [x1 + 3, 397], [x1 + 3, 398], [x0 - 3, 398]], G_HI);
        });
      }
      // v45e-1: the old waist sill is gone: the v45b-1 graphite band is the one limit under the leg
      // v45b-1: the leg's cream foot runs aft over the engine: one straight sloped top from (246, 388) to a blunt 5 px toe at x 184, level bottom at y 405,
      // notched round the engine's collar (x 210 to 231) with a 1 px graphite gap each side; a 1 px pale edge along the slope (low-sheet pixels)
      lp([[184, 400], [209, 395.16], [209, 405], [184, 405]], G_MID);
      lp([[184, 400], [209, 395.16], [209, 396.16], [184, 401]], G_PALE);
      lp([[232, 390.71], [246, 388], [246, 405], [232, 405]], G_MID);
      lp([[232, 390.71], [246, 388], [246, 389], [232, 391.71]], G_PALE);
      // v48s-1: a lit cap 1.5 px thick along the slope, the stern's slate underside line continued to the jamb, and a plain end jamb closing the neck (x 246..250)
      lp([[184, 400], [209, 395.16], [209, 396.66], [184, 401.5]], G_HI);
      lp([[232, 390.71], [246, 388], [246, 389.5], [232, 392.21]], G_HI);
      lp([[223, 359], [246, 359], [246, 361], [223, 361]], GRAPH);
      lp([[246, 372], [250, 372], [250, 402], [246, 402]], G_PALE);
      lp([[246, 372], [248, 372], [248, 402], [246, 402]], G_HI);
      lp([[249, 372], [250, 372], [250, 402], [249, 402]], G_MID);
      lp([[209, 395.16], [210, 394.97], [210, 405], [209, 405]], GRAPH);
      lp([[231, 391.1], [232, 390.71], [232, 405], [231, 405]], GRAPH);
      zone('middle');
    }
    // v38a: the middle zone is one framed bay. Limits: top rail, step side rails, slate bottom rail, aft flange. Two bulkheads split it in three parts; belts only in the middle one.
    const P1 = -0.215, P2 = 0.0, AY = 0.100;
    const sTop = (x) => x < P1 ? -0.005 : x < P2 ? -0.05 : 0.01;
    const under = (x) => sTop(x) + 0.014, bUp = (x) => LE(x) - 0.008;
    const IB = [40, 42, 48], IL = [84, 88, 96], BACK = [24, 25, 30];
    const GB = [58, 61, 68], GL = [84, 88, 96], GS = [40, 42, 48];
    const BC = [58, 61, 68], BLT = [84, 88, 96], BSH = [40, 42, 48];
    zone('middle');
    // the backing: exactly between the upper and lower limits, from the aft flange to the ring
    add([[-0.426, under(-0.44)], [P1, under(-0.44)], [P1, under(P1)], [P2, under(P1)], [P2, under(P2)], [XE, under(XE)]]
      .concat(LEP.filter((p) => p[0] > -0.426).map(([px, py]) => [px, py - 0.008]).reverse(), [[-0.426, bUp(-0.426)]]), BACK);
    // lit walkway dots along bUp in the middle part only, under the belts
    for (let x = P1 + 0.014; x < P2 - 0.014 - 0.012; x += 0.0165) {
      rc(x, bUp(x) - 0.0045, x + 0.012, bUp(x) - 0.002, G_MID);
      if ((Math.round((x - P1) / 0.0165) * 7) % 5 < 2) { rc(x + 0.004, bUp(x) - 0.0065, x + 0.0057, bUp(x) - 0.0048, C.LAMP, 0.8); stats.lights++; }
    }
    // the bulkheads: the zone's lightest iron, from the lower rail underside beside each down to bUp
    [[-0.229, under(-0.229)], [-0.014, under(0.014)]].forEach(([bx, bt0]) => {
      const bb = bUp(bx + 0.014), bc = bx + 0.014;
      // v47d-2: works-green bulkheads: dark green body, a 1 px edge line down the aft edge, the forward third in the shadow green, dark tick rivets
      // the fore one starts at low x 557 and ends at 580, clear of the plant units' box and of the ribs' sheet
      const lx = bx > 0 - 0.02 ? (553 - 565.187) / 834.97 : bx, cl = bx > 0 - 0.02 ? lx : bc - 0.020, cr = bx > 0 - 0.02 ? (580 - 565.187) / 834.97 : bc + 0.020;
      // v48b-4: a plain buttress, no ticks: body, a 2 px lighter strip down the aft edge, a 1 px dark line down the fore edge, one seam at the trench's height
      rc(lx, bt0, bx + 0.028, bb, WG_D);
      {
        const px = (v) => 565.187 + 834.97 * v, py = (v) => 407.168 + 320.96 * v, xl = px(lx), xr = px(bx + 0.028), yt = py(bt0), yb = py(bb);
        lp([[xl, yt], [xl + 2, yt], [xl + 2, yb], [xl, yb]], WG_M);
        lp([[xr - 1, yt], [xr, yt], [xr, yb], [xr - 1, yb]], WG_S);
        lp([[xl, 438], [xr, 438], [xr, 439], [xl, 439]], WG_S);
        // v48e-1: a 4 px slot with a light column, split by the seam: upper part (8 px under the top cap to 5 px over the seam), lower part (5 px under the seam to 8 px over the bottom cap)
        const sx = bx > 0 - 0.02 ? 557 : 383, ct = py(bt0 + 0.014) + 8, cb = py(bb - 0.014) - 8;
        const slot = (y0, y1, n, skip) => {
          lp([[sx, y0], [sx + 4, y0], [sx + 4, y1], [sx, y1]], WG_S);
          lp([[sx, y0], [sx + 1, y0], [sx + 1, y1], [sx, y1]], WG_K);
          lp([[sx + 3, y0], [sx + 4, y0], [sx + 4, y1], [sx + 3, y1]], WG_M);
          for (let i = 0, y = y0 + 2; y + 1 <= y1 && i < n; i++, y += 3) if (i !== skip) lp([[sx + 1, y], [sx + 2, y], [sx + 2, y + 1], [sx + 1, y + 1]], C.LAMP);
        };
        slot(ct, 433, 99, bx > 0 - 0.02 ? 2 : -1);
        if (bx <= 0 - 0.02) slot(444, cb, 4, -1);
      }
      rc(cl, bt0, cr, bt0 + 0.014, WG_M); rc(cl, bt0, cr, bt0 + 0.003, WG_E);
      rc(cl, bb - 0.014, cr, bb, WG_M); rc(cl, bb - 0.014, cr, bb - 0.011, WG_E);
    });
    // the king post between the bays, girder look, with the two red slits
    {
      const kx = -0.115, kt = under(kx + 0.0075), kb = bUp(kx + 0.0075), kc = kx + 0.0075;
      rc(kx, kt, kx + 0.015, kb, GB); rc(kx, kt, kx + 0.006, kb, GL); rc(kx + 0.010, kt, kx + 0.015, kb, GS);
      for (let y = kt + 0.012; y < kb - 0.004; y += 0.024) rc(kc - 0.0018, y, kc + 0.0018, y + 0.0036, STUD);
      // v42b: one opening 0.014 wide and 0.05 tall on the mid-bay line
      {
        const y0 = AY - 0.025, h = 0.050;
        rc(kc - 0.0075, y0 - 0.003, kc + 0.0075, y0 + h + 0.003, [24, 25, 30]);
        add([[kc - 0.007, y0], [kc + 0.007, y0], [kc + 0.007, y0 + h * 0.4], [kc - 0.007, y0 + h * 0.5]], BR);
        add([[kc - 0.007, y0 + h * 0.5], [kc + 0.007, y0 + h * 0.4], [kc + 0.007, y0 + h * 0.75], [kc - 0.007, y0 + h]], MR);
        add([[kc + 0.007, y0 + h * 0.75], [kc + 0.007, y0 + h], [kc - 0.007, y0 + h]], DP);
        stats.facets += 3;
      }
    }
    // v48a-2: the middle is a closed hull wall in works green with one hangar mouth where ships land. Low-sheet px, wall x 397.4..553.5, y 395.6..468.8 (the band shows from y 405); the old plant (hopper, tank, compressor, gantry, rail, work lights) is deleted
    {
      const wr = (x0, y0, x1, y1, c) => lp([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], c);
      const XA = 397.4, XB = 553.5, T = 405, B = 468.8, PALE = [158, 164, 172];
      wr(XA, 395.6, XB, B, WG_M); wr(XA, T, XB, T + 3, WG_E); wr(XA, B - 6, XB, B, WG_D);
      // v48b-4: giant-scale plating like the casing: uneven sub-plates round the mouth and apron (1 px dark seams on top and fore-aft edges, about half in the lighter dark tone), one recessed panel aft of the mouth
      const WG_N = [87, 64, 36];
      // v48d-1: plates over the mouth end 3 px above its new top (y 420) and 3 px before its new fore edge (x 547)
      [[397.4, 408, 421, 429, 0], [421, 408, 458, 416, 1], [421, 416, 458, 420, 0], [458, 408, 497, 420, 0], [497, 408, 522, 420, 1], [522, 408, 553.5, 420, 0],
        [397.4, 429, 420, 446, 1], [420, 429, 444, 446, 0], [397.4, 446, 403, 462.8, 0], [432, 446, 444, 457, 1], [432, 457, 438, 462.8, 0],
        [547, 423, 553.5, 445, 1], [547, 445, 553.5, 462.8, 0]].forEach(([xa, ya, xb, yb, f]) => {
        if (f) wr(xa, ya, xb, yb, WG_N);
        wr(xa, ya, xb, ya + 1, WG_D); wr(xa, ya, xa + 1, yb, WG_D);
      });
      // v48i-1: a shut bay door aft of the mouth (the trench ends at the aft bulkhead): a deep recess (x 403..435, y 431..462, top corners cut 3), a door of two leaves with a parting line and two seams, a lit sill ledge (x 400..436, y 462..466)
      lp([[406, 431], [432, 431], [435, 434], [435, 462], [403, 462], [403, 434]], WG_K);
      lp([[407, 432], [432, 432], [435, 435], [435, 462], [404, 462], [404, 435]], WG_S);
      wr(404, 432, 435, 434, WG_K);
      wr(405, 436, 433, 462, WG_D);
      wr(405, 445, 433, 446, WG_S); wr(405, 453, 433, 454, WG_S);
      wr(419, 436, 420, 462, WG_K); wr(420, 436, 421, 462, WG_M);
      wr(400, 462, 436, 463, WG_E); wr(400, 463, 436, 465, WG_L); wr(400, 465, 436, 466, WG_S);
      for (let x = 402; x < 436; x += 4) { wr(x, 462, x + 1, 463, C.LAMP); stats.lights++; }
      // 1 px warm lights at 2 px pitch in uneven runs: three long rows above the mouth, one short row under the bay door's sill
      const run = (x, y, n) => { for (let k = 0; k < n; k++) wr(x + k * 2, y, x + k * 2 + 1, y + 1, C.LAMP); };
      run(404, 411, 18); run(450, 411, 22); run(412, 414, 26); run(480, 414, 12); run(400, 419, 11); run(430, 419, 30); run(406, 467, 8);
      // v48b-2: the hangar mouth is an opening with depth: v48d-1: outer x 444..544, y 423..460 (corners cut 4), two reveal steps, a box seen straight on inside, a projecting apron, craft of uneven size
      const reveal = (x0, y0, x1, y1, w, c, top, side, sill) => {
        const ix0 = x0 + w, iy0 = y0 + w, ix1 = x1 - w, iy1 = y1 - w;
        lp([[x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [ix1, iy0], [ix0, iy0]], top);
        lp([[x0 + c, y0], [ix0, iy0], [ix0, iy1], [x0, y1 - c], [x0, y0 + c]], side);
        lp([[x1, y0 + c], [x1, y1 - c], [ix1, iy1], [ix1, iy0]], side);
        lp([[x0, y1 - c], [x0 + c, y1], [x1 - c, y1], [x1, y1 - c], [ix1, iy1], [ix0, iy1]], sill);
      };
      reveal(444, 423, 544, 460, 3, 4, WG_S, WG_D, WG_L);
      reveal(447, 426, 541, 457, 2, 1, WG_S, WG_S, WG_M);
      // the inside (x 449..539, y 428..455): back wall x 463..525, y 431..449, ceiling, two side walls and floor, all flat
      wr(463, 431, 525, 449, WG_S);
      lp([[449, 428], [539, 428], [525, 431], [463, 431]], WG_K);
      lp([[449, 428], [463, 431], [463, 449], [449, 455]], WG_K);
      lp([[539, 428], [525, 431], [525, 449], [539, 455]], WG_K);
      lp([[463, 449], [525, 449], [539, 455], [449, 455]], WG_D);
      // one dotted light row in the lamp yellow above the lit strip
      for (let x = 465; x < 524; x += 3) wr(x, 433, x + 1, 434, C.LAMP);
      // the lit bays: a 6 px strip at the back wall's middle height, inset 4 px, in the cream top's second darkest face tone, split by 1 px WG_K posts into bays of 6 to 14 px
      {
        const x0 = 467, x1 = 521, LIT = ZONES.top.mid;
        wr(x0, 437, x1, 443, LIT);
        let x = x0;
        [9, 6, 13, 8, 14, 7, 10].forEach((w) => { x += w; if (x < x1) wr(x, 437, x + 1, 443, WG_K); x += 1; });
      }
      for (let k = 0; k < 4; k++) { const dx = 14 * (k + 0.5) / 4, y = 449 + 6 * (k + 0.5) / 4; wr(463 - dx, y, 464 - dx, y + 1, WG_E); wr(525 + dx - 1, y, 525 + dx, y + 1, WG_E); }
      wr(449, 454, 539, 455, WG_L);
      // craft: straight-edged wedges in pale steel, a warm light at each tail (aft, left); the two parked ones are dark against the lit strip
      const craft = (x, y, n, h) => { lp([[x, y + h], [x + n * 0.3, y], [x + n, y], [x + n, y + h]], PALE); wr(x, y + h - 1, x + 1, y + h, C.LAMP); stats.lights++; };
      const parked = (x, y, n, h) => lp([[x, y + h], [x + n * 0.3, y], [x + n, y], [x + n, y + h]], WG_K);
      parked(482, 440, 7, 2); parked(503, 439, 4, 2);
      craft(537, 440, 5, 2); craft(547, 452, 3, 1); craft(549, 432, 2, 1);
      // the apron: a slab projecting from the wall, x 438..550, ends cut 2 px, pale guide lights every 6 px, a shadow strip on the wall under it shifted 2 px fore
      wr(440, 464, 552, 466, WG_S);
      lp([[440, 460], [548, 460], [550, 462], [438, 462]], WG_L);
      lp([[438, 462], [550, 462], [548, 464], [440, 464]], WG_D);
      for (let x = 442; x < 548; x += 6) { wr(x, 461, x + 1, 462, WG_E); stats.lights++; }
    }
    // the limits, drawn over the bays so their corners stay clean
    zone('top');
    SEG.forEach(([xa, xb, s]) => rc(Math.max(xa, -0.44), s, xb, s + 0.014, G_DARK));
    rc(P1, -0.05, P1 + 0.014, under(P1 - 0.001), G_DARK); rc(P2 - 0.014, -0.05, P2, under(P2), G_DARK);
    add([[P1 + 0.014, -0.036], [P1 + 0.026, -0.036], [P1 + 0.014, -0.024]], G_DARK);
    add([[P2 - 0.014, -0.036], [P2 - 0.026, -0.036], [P2 - 0.014, -0.024]], G_DARK);
    const rail = [], rlit = [];
    for (let k = 0; k < LEP.length; k++) { rail.push([LEP[k][0], LEP[k][1] - 0.008]); rlit.push([LEP[k][0], LEP[k][1] - 0.005]); }
    for (let k = LEP.length - 1; k >= 0; k--) { rail.push([LEP[k][0], LEP[k][1] + 0.006]); rlit.push([LEP[k][0], LEP[k][1] - 0.008]); }
    add(rail, AR1); add(rlit, ZONES.heavy.hi);
    // v42d: a flat keel strip closes the bay's underside from the mount to the lower hull's new stern, a lit lip on its aft end
    rc(-0.42, 0.206, -0.33, 0.218, GS); rc(-0.42, 0.206, -0.417, 0.218, IL);
    // the aft flange in the engines zone's greys, a lit strip on its aft edge, six studs
    rc(-0.44, under(-0.43), -0.426, bUp(-0.43), ZONES.engines.mid); rc(-0.44, under(-0.43), -0.436, bUp(-0.43), ZONES.engines.hi);
    for (let k = 0; k < 6; k++) { const y = under(-0.43) + 0.012 + k * (bUp(-0.43) - under(-0.43) - 0.024) / 5; rc(-0.4335, y - 0.002, -0.4305, y + 0.002, STUD); }
    zone('middle');
    // v38 aft part: the engine
    {
      // v42c: the turbine is one pale iron block: its parts (blades, casing, cone) all within 12 of the block's tone
      const IL = [74, 76, 80], GL = [112, 114, 118], GB = [36, 37, 40], IB = [30, 31, 34], BC = [46, 47, 51], BSH = [44, 45, 49], BLT = [132, 133, 134], GS = [32, 33, 36];
      const XA0 = -0.426, XA1 = -0.229, XC1 = -0.2425, DX = XC1 - XA0;
      const upE = (x) => 0.020 + (x - XA0) / DX * 0.027, loE = (x) => 0.180 - (x - XA0) / DX * 0.027;
      // the casing walls are 0.018 thick, outer faces uo/lo, inner faces upE/loE; the bay behind has a darker back wall with two conduit strips
      const uo = (x) => upE(x) - 0.018, lo = (x) => loE(x) + 0.018, XT = -0.281, CX = [-0.423, -0.375, -0.325, -0.2485];
      // v43g: the bay is the darkest iron, the rotor steps are a neutral gunmetal in three flat tones, and a light iron frame outlines the housing
      const R_SH = [78, 82, 88], R_BD = [112, 116, 122], R_LT = [146, 151, 158], FRM = [158, 164, 172];
      // v47c-1: the bay behind the rotors is the green shadow tone
      add([[XA0, upE(XA0)], [XT, upE(XT)], [XT, loE(XT)], [XA0, loE(XA0)]], WG_S);
      // v42p: the stone axle shows red between the discs
      rc(XA0, AY - 0.016, XA1, AY, MR); rc(XA0, AY, XA1, AY + 0.016, DP);
      // v42q: five thick edge-on discs stepping from the full inner height at the engines down to 60% toward the fore, narrow red slits between, blade-tip teeth on the rims, a lit top edge
      // v43h-1: three bigger steps instead, laid in the part of the bay the housing leaves open (x -0.389 and fore): the aft one fills the bay to about 3 px, each next one 0.019 shorter per side, gaps 0.0035
      const RX = [[-0.388, 0.0467], [-0.3389, 0.0359], [-0.3006, 0.0205]], hh0 = (loE(-0.347) - upE(-0.347)) / 2 - 0.004;
      for (let i = 0; i < 3; i++) {
        const xl = RX[i][0], xr = xl + RX[i][1], nt = Math.round(RX[i][1] / 0.0065), tw = RX[i][1] / nt, th = 0.005;
        const hh = hh0 - 0.019 * i, t = AY - hh + th, b = AY + hh - th;
        rc(xl, t, xr, b, R_BD);
        rc(xl, t, xl + 0.008, b, R_LT);
        rc(xr - 0.003, t, xr, b, R_SH);
        rc(xl, t, xr, t + 0.006, R_LT);
        // v47d-2: blades on the face (1 px lines every 4 px, one step darker, 3 px in from the top and bottom), the aft 2 px column lighter, the forward quarter one flat step darker, a works-green retaining band (2 px, a 1 px edge line aft of it) at each end
        {
          const X0 = 565.187 + 834.97 * xl, X1 = 565.187 + 834.97 * xr, Y0 = 407.168 + 320.96 * t, Y1 = 407.168 + 320.96 * b, XQ = X1 - (X1 - X0) / 4;
          lp([[XQ, Y0], [X1, Y0], [X1, Y1], [XQ, Y1]], R_SH);
          for (let x = X0 + 4; x < X1 - 4; x += 4) lp([[x, Y0 + 3], [x + 1, Y0 + 3], [x + 1, Y1 - 3], [x, Y1 - 3]], x < XQ ? (x < X0 + 7 ? R_BD : R_SH) : [58, 62, 68]);
          lp([[X0 + 3, Y0], [X0 + 5, Y0], [X0 + 5, Y1], [X0 + 3, Y1]], [168, 173, 180]);
          lp([[X0, Y0], [X0 + 1, Y0], [X0 + 1, Y1], [X0, Y1]], WG_E); lp([[X0 + 1, Y0], [X0 + 3, Y0], [X0 + 3, Y1], [X0 + 1, Y1]], WG_M);
          lp([[X1 - 3, Y0], [X1 - 2, Y0], [X1 - 2, Y1], [X1 - 3, Y1]], WG_E); lp([[X1 - 2, Y0], [X1, Y0], [X1, Y1], [X1 - 2, Y1]], WG_M);
        }
        for (let k = 0; k < nt; k++) {
          const x0 = xl + k * tw;
          add([[x0, t], [x0 + tw, t], [x0 + tw / 2, t - th]], k === nt - 1 ? R_BD : R_LT);
          add([[x0, b], [x0 + tw, b], [x0 + tw / 2, b + th]], k === 0 ? R_BD : R_SH);
        }
      }
      // v42b: the aft trace, two red openings now in the gaps between stages
      [-0.3925, -0.3337].forEach((cx) => { rc(cx - 0.002, AY - 0.03, cx + 0.002, AY, MR); rc(cx - 0.002, AY, cx + 0.002, AY + 0.03, DP); stats.facets += 2; });
      // the walls: a lit outer strip and a shade inner strip each, a shade end-face at the aft lip
      // v47b-1: the casing walls and housing slabs take the works green (WG_M for IL, WG_L for GL / FRM, WG_D for BC / BSH, WG_S for the recess shadow); the cone and the rotors keep their greys
      add([[XA0, uo(XA0)], [XT, uo(XT)], [XT, upE(XT)], [XA0, upE(XA0)]], WG_M);
      add([[XA0, loE(XA0)], [XT, loE(XT)], [XT, lo(XT)], [XA0, lo(XA0)]], WG_M);
      add([[XA0, upE(XA0) - 0.006], [XT, upE(XT) - 0.006], [XT, upE(XT)], [XA0, upE(XA0)]], WG_D);
      add([[XA0, loE(XA0) + 0.006], [XT, loE(XT) + 0.006], [XT, loE(XT)], [XA0, loE(XA0)]], WG_D);
      rc(XA0, uo(XA0), XA0 + 0.004, upE(XA0), WG_D); rc(XA0, loE(XA0), XA0 + 0.004, lo(XA0), WG_D);
      // v43g: the frame, flat strips (0.011 tall, 0.004 wide) along the outer faces of both walls and the aft lip
      add([[XA0, uo(XA0)], [XT, uo(XT)], [XT, uo(XT) + 0.011], [XA0, uo(XA0) + 0.011]], WG_L);
      add([[XA0, lo(XA0) - 0.011], [XT, lo(XT) - 0.011], [XT, lo(XT)], [XA0, lo(XA0)]], WG_L);
      rc(XA0, uo(XA0), XA0 + 0.004, upE(XA0), WG_L); rc(XA0, loE(XA0), XA0 + 0.004, lo(XA0), WG_L);
      // the cone: three stepped rings tapering down to the axle, darker toward the tip, lit above the axis and shade below
      {
        const tu = (x) => uo(XT) + (AY - 0.016 - uo(XT)) * (x - XT) / (XA1 - XT), tl = (x) => lo(XT) + (AY + 0.016 - lo(XT)) * (x - XT) / (XA1 - XT);
        const CL = [GL, IL, BC], CS = [GB, IB, BSH];
        for (let i = 0; i < 3; i++) {
          const x0 = XT + i * (XA1 - XT) / 3, x1 = XT + (i + 1) * (XA1 - XT) / 3;
          add([[x0, tu(x0)], [x1, tu(x0)], [x1, AY], [x0, AY]], CL[i]);
          add([[x0, AY], [x1, AY], [x1, tl(x0)], [x0, tl(x0)]], CS[i]);
        }
        // base flange with a ring of bolt dots
        rc(XT - 0.005, uo(XT), XT, lo(XT), IL); rc(XT - 0.005, uo(XT), XT - 0.003, lo(XT), GL);
        for (let k = 0; k < 6; k++) { const y = uo(XT) + 0.008 + k * (lo(XT) - uo(XT) - 0.016) / 5; rc(XT - 0.0035, y - 0.0015, XT - 0.0015, y + 0.0015, STUD); }
      }
      // v47b-1: two clamp frames across the throat at low x 345 and 361 (over the cone; the rotors and the axle are not touched): a 4 px level-ended mid strap, a 1 px edge-tone line on its forward side, three 1 px dark bolt ticks; each is cut by the axle's own 0.032 band
      [345, 361].forEach((px) => {
        const hl = (px - 2 - 565.187) / 834.97, hr = (px + 2 - 565.187) / 834.97, hm = (px + 1 - 565.187) / 834.97;
        const yt = upE(hr), yb = loE(hr);
        [[yt, AY - 0.016], [AY + 0.016, yb]].forEach(([a, b]) => { rc(hl, a, hr, b, WG_M); rc(hm, a, hr, b, WG_E); });
        [yt + 0.012, yt + 0.028, yb - 0.02].forEach((ty) => rc(hl + 0.0004, ty, hl + 0.0004 + 1 / 834.97, ty + 1 / 320.96, WG_D));
      });
      // flanges 0.005 proud of the walls at both ends and each stator row, a lit left strip
      CX.forEach((cx) => {
        rc(cx - 0.007, uo(cx - 0.007) - 0.005, cx + 0.007, uo(cx + 0.007) + 0.001, WG_M); rc(cx - 0.007, uo(cx - 0.007) - 0.005, cx - 0.004, uo(cx + 0.007) + 0.001, WG_L);
        rc(cx - 0.007, lo(cx + 0.007) - 0.001, cx + 0.007, lo(cx - 0.007) + 0.005, WG_M); rc(cx - 0.007, lo(cx + 0.007) - 0.001, cx - 0.004, lo(cx - 0.007) + 0.005, WG_L);
      });
      // a short row of red slits on the bay's lower conduit
      // a short row of red slits on the bay's lower conduit
      for (let k = 0; k < 4; k++) rc(-0.412 + k * 0.011, AY + 0.050, -0.407 + k * 0.011, AY + 0.052, MR);
      // hangers from the top rail and saddles on the slate step, one per flange x
      CX.forEach((cx) => {
        const yt = under(cx), fy = uo(cx - 0.007) - 0.005;
        add([[cx - 0.008, yt], [cx + 0.008, yt], [cx + 0.005, fy], [cx - 0.005, fy]], WG_M);
        add([[cx - 0.008, yt], [cx - 0.005, yt], [cx - 0.002, fy], [cx - 0.005, fy]], WG_L);
        if (fy - yt > 0.028) add([[cx - 0.002, yt + 0.006], [cx + 0.002, yt + 0.006], [cx, fy - 0.006]], WG_S);
        const yb = bUp(cx), ft = lo(cx - 0.007) + 0.004;
        add([[cx - 0.011, yb], [cx + 0.011, yb], [cx + 0.006, ft], [cx - 0.006, ft]], WG_M);
        add([[cx - 0.011, yb], [cx - 0.008, yb], [cx - 0.003, ft], [cx - 0.006, ft]], WG_L);
        if (yb - ft > 0.028) add([[cx - 0.004, yb - 0.006], [cx + 0.004, yb - 0.006], [cx, ft + 0.008]], WG_S);
        rc(cx - 0.012, yb - 0.003, cx + 0.012, yb, WG_L);
      });
      // v48a-1: the engine section is one closed armoured casing (low x 239..374, y 410..468.8) drawn over the old inside, which stays hidden under it: the throat's shadow back, rotors, red openings, cone, clamp straps, flanges and hangers
      {
        const T = 410, B = 468.8, X0 = 239, X1 = 374, segs = [[X0, 297], [297, 341], [341, X1]];
        const Q = (xa, ya, xb, yb, c) => lp([[xa, ya], [xb, ya], [xb, yb], [xa, yb]], c);
        segs.forEach(([a, b]) => { Q(a, T, b, B, WG_M); Q(a, T, b, T + 3, WG_E); Q(a, B - 6, b, B, WG_D); });
        // v48b-3: uneven sub-plates (1 px dark seams on the top and fore-aft edges, about half in the lighter dark tone), one raised armour block on the aft segment
        const WG_N = [87, 64, 36];
        [[239, 413, 255, 448, 1], [255, 413, 294.5, 440, 0], [255, 440, 294.5, 462.8, 1], [239, 448, 255, 462.8, 0],
          [299.5, 413, 322, 430, 0], [322, 413, 338.5, 445, 1], [299.5, 430, 322, 462.8, 1], [322, 445, 338.5, 462.8, 0],
          [343.5, 413, 362, 440, 0], [362, 413, 374, 452, 1], [343.5, 440, 362, 462.8, 1], [362, 452, 374, 462.8, 0]].forEach(([xa, ya, xb, yb, f]) => {
          if (f) Q(xa, ya, xb, yb, WG_N);
          Q(xa, ya, xb, ya + 1, WG_D); Q(xa, ya, xa + 1, yb, WG_D);
        });
        lp([[246, 415], [290, 415], [290, 426], [285, 431], [246, 431]], WG_M);
        Q(246, 415, 290, 416, WG_E); Q(288, 416, 290, 426, WG_S); lp([[288, 426], [290, 426], [285, 431], [283, 431]], WG_S); Q(246, 431, 283, 432, WG_S);
        // 1 px warm lights at 2 px pitch: two fore rows, one short middle row, three short rows under the armour block
        const run = (x, y, n) => { for (let k = 0; k < n; k++) Q(x + k * 2, y, x + k * 2 + 1, y + 1, C.LAMP); };
        run(345, 418, 8); run(347, 421, 10);
        run(304, 455, 5); run(318, 455, 3); run(326, 455, 4);
        run(247, 444, 7); run(251, 447, 5); run(247, 450, 9);
        // v48d-2: one recessed panel on the middle segment (26 x 10, fore upper corner cut at 45 degrees, 5 px in from the aft ring frame, 6 px above the trench): dark face, shadow top and aft edges, light bottom edge
        lp([[304.5, 419], [318.5, 419], [322.5, 423], [322.5, 429], [304.5, 429]], WG_D);
        Q(304.5, 419, 318.5, 420, WG_S); Q(304.5, 419, 305.5, 429, WG_S); Q(304.5, 428, 322.5, 429, WG_L);
        // the fore rows run on aft across the fore ring frame (no lights on it), 8 px and 12 px, same 2 px pitch
        run(331, 418, 4); run(327, 421, 6);
        // v48c-2: the trench along the axle: 6 px, a plain shadow floor (no red), dark lip above, light lip below, a fixed uneven run of tiny blocks in the dark, close and (sparse) mid tones
        Q(X0, 435, X1, 441, WG_S);
        { const tn = [WG_D, WG_D, WG_N, WG_N, WG_N, WG_D, WG_N, WG_M]; let x = X0 + 2, i = 17;
          const hs = (n, k) => { let v = Math.imul(n * 8 + k, 2654435761) >>> 0; v ^= v >>> 15; v = Math.imul(v, 2246822519) >>> 0; v ^= v >>> 13; return v >>> 0; };
          while (x < X1 - 4) { const w = 1 + hs(i, 1) % 4, h = 2 + hs(i, 2) % 3, y = 436 + hs(i, 3) % (5 - h); Q(x, y, x + w, y + h, tn[hs(i, 4) % 8]); x += w + 1 + hs(i, 5) % 3; i++; } }
        Q(X0, 435, X1, 436, WG_D); Q(X0, 440, X1, 441, WG_L);
        // v48h-1: ring bands between the segments: 9 px, lit face, a light line down the aft edge, a shadow line down the fore edge and a shadow column on the casing fore of it, four 3 px bolt recesses (they cross the trench)
        [297, 341].forEach((cx) => {
          Q(cx - 4.5, T, cx + 4.5, B, WG_L); Q(cx - 4.5, T, cx - 3.5, B, WG_E); Q(cx + 3.5, T, cx + 4.5, B, WG_S); Q(cx + 4.5, T, cx + 5.5, B - 6, WG_S);
          [414, 428, 442, 456].forEach((by) => { Q(cx - 1.5, by, cx + 1.5, by + 3, WG_S); Q(cx - 1.5, by, cx + 1.5, by + 1, WG_K); });
        });
        // the fore rows stay drawn over the fore band
        run(331, 418, 4); run(345, 418, 8); run(327, 421, 6); run(347, 421, 10);
        // v48h-1: two louvre banks, recessed vent fields: ground, 1 px slats at 3 px pitch, a shadow along the top and aft edges, a lit lip along the bottom
        [[245, 453, 289, 464], [349, 444, 370, 464]].forEach(([xa, ya, xb, yb]) => {
          Q(xa, ya, xb, yb, WG_S);
          for (let y = ya + 2; y < yb - 2; y += 3) Q(xa + 2, y, xb - 2, y + 1, WG_K);
          Q(xa, ya, xb, ya + 1, WG_K); Q(xa, ya, xa + 1, yb, WG_K); Q(xa, yb - 1, xb, yb, WG_L);
        });
        // v48c-2: feet on the keel rail (its lower edge at y 473.29, drawn above): the ring frames and the two bulkheads run down across it, ending in shoe plates; a 2 px shadow line on the band's last rows between them
        {
          const RB = 407.168 + 320.96 * 0.206;
          [297, 341].forEach((cx) => {
            Q(cx - 4.5, B, cx + 4.5, RB - 2, WG_L); Q(cx - 4.5, B, cx - 3.5, RB - 2, WG_E); Q(cx + 3.5, B, cx + 4.5, RB - 2, WG_S);
            Q(cx - 6.5, RB - 2, cx + 6.5, RB, WG_M);
          });
          [[-0.229, 0], [-0.014, 1]].forEach(([bx, fore]) => {
            const xl = fore ? 553 : 565.187 + 834.97 * bx, xr = 565.187 + 834.97 * (bx + 0.028);
            Q(xl, B, xr, RB - 3, WG_D); Q(xl, B, xl + 2, RB - 3, WG_M); Q(xr - 1, B, xr, RB - 3, WG_S);
            const se = Math.min(xr + 2, 578);
            const sl = fore ? xl : xl - 2;
            Q(sl, RB - 3, se, RB, WG_M); Q(sl, RB - 3, se, RB - 2, WG_L);
          });
          [[X0, 294.5], [299.5, 338.5], [343.5, X1], [397.35, 553]].forEach(([a, b]) => Q(a, B - 2, b, B, WG_S));
        }
      }
    }
    // v38 fore part: the clamps
    {
      // v42b: the rock under the ribs: the stone fills the rib zone from the housing's underside to the lower hull, shade and darkest, facet lines running across the gaps
      rock(0.0, 0.20, under, LE, 4, [[128, 38, 36], [87, 26, 30], [87, 26, 30]], 0.05);
      rock(0.02, 0.198, LE, 0.2468, 3, [[128, 38, 36], [87, 26, 30], [87, 26, 30]], 0.05);
      // walkway dots along bUp
      for (let x = 0.02; x + 0.012 < 0.125; x += 0.0165) rc(x, bUp(x) - 0.0045, x + 0.012, bUp(x) - 0.002, G_MID);
      // v41b: three great ribs, the heaviest thing in the centre: bowed forward like ")", slate in three facets (lit aft band, face, fore band in a lighter shade than the bay),
      // a raised lit spine, hard seams with bolt recesses; tops run up over the housing's underside into a two-tier shoulder block, feet run down the lower hull's top band to
      // its first deck line into a foot block, and one keel beam ties the three feet; slits of 0.006 between them are all the bay shows
      // [aft edge x, width, seam facets]: all bow 0.008 so the slits stay even
      const RY1 = 0.495 - 0.03 * (0.105 + 0.40) - 0.2330;
      // v42x: big, medium, small from aft to fore; gaps 0.010; the big one has a head over its top 40 percent, the medium one chamfered top corners, the small one is plain
      [[0.014, 0.074, [3, 5, 8, 10]], [0.098, 0.054, [4, 7, 9]], [0.162, 0.038, [3, 6, 8, 10]]].forEach(([xl, w, seams], ri) => {
        const y0 = under(xl + w / 2) - 0.115, y1 = RY1 + 0.028, N = 18, fl = 0.006;
        const pos = (f) => {
          const g = f > 0.9 ? fl : 0;
          const ins = ri === 0 ? (f >= 0.4 ? 0.0083 : 0) : ri === 1 ? 0.0111 * Math.min(1, Math.max(0, 1 - (f * (y1 - y0) - 0.026) / 0.0111)) : 0;
          return [xl - g + ins, xl + w + g - ins];
        };
        const edge = (k, a, b) => {
          const f = k / N, y = y0 + (y1 - y0) * f, [l, r] = pos(f), ww = r - l;
          return [[l + ww * a, y], [l + ww * b, y]];
        };
        const band = (a, b, c) => { for (let k = 0; k < N; k++) { const [l, r] = pos((k + 0.5) / N), ww = r - l, ya = y0 + (y1 - y0) * k / N, yb = y0 + (y1 - y0) * (k + 1) / N; rc(l + ww * a, ya, l + ww * b, yb, c); } };
        // v42c2: bronze bands: lit face, body, shade
        // v42n: brass a step darker than the belts: lit band, body, shade; no dark stripe on the spine
        // v48a-3: the ribs leave the grey: works-green body, lit strip, shadow seam
        const RB = WG_D, RL = WG_E, RF = WG_S;
        // v48a-4: the clamps replace the ribs, so the rib bands are not drawn (their tops showed as pale stripes under the soffit)
        const [sl, sr] = pos(0), [fl0, fr0] = pos(1);
        // v42p: a row of four bolts across the rib where it crosses the cream's lower edge and the slate's top edge
        [under(xl + w / 2) - 0.008, bUp(xl + w / 2) + 0.010].forEach((by) => {
          const [bl, br] = pos((by - y0) / (y1 - y0));
          for (let i = 0; i < 4; i++) { const x = bl + (br - bl) * (i + 0.5) / 4; rc(x - 0.002, by - 0.002, x + 0.002, by + 0.002, STUD); }
        });
        // shoulder block of two stepped tiers on the housing's underside
        [[0.012, 0.000, 0.012], [0.006, 0.012, 0.014]].forEach(([ex, dy, h]) => {
          const xa = sl - ex, xb = sr + ex, ya = y0 + dy, yb = ya + h;
          rc(xa, ya, xb, yb, AR1); rc(xa, ya, xb, ya + 0.003, ZONES.heavy.hi); rc(xa + (xb - xa) * 0.64, ya + 0.003, xb, yb, AR2); rc(xa, yb - 0.002, xb, yb, G_DARK);
          for (let i = 0; i < 4; i++) { const x = xa + (xb - xa) * (i + 0.5) / 4; rc(x - 0.0015, ya + h * 0.5, x + 0.0015, ya + h * 0.5 + 0.003, TRENCH); }
        });
        // foot block on the lower hull
        const fa = fl0 - 0.008, fb = fr0 + 0.008, ft = y1 - 0.030;
        rc(fa, ft, fb, y1 - 0.010, AR1); rc(fa, ft, fb, ft + 0.003, ZONES.heavy.hi); rc(fa + (fb - fa) * 0.64, ft + 0.003, fb, y1 - 0.010, AR2);
        for (let i = 0; i < 4; i++) { const x = fa + (fb - fa) * (i + 0.5) / 4; rc(x - 0.0015, ft + 0.008, x + 0.0015, ft + 0.011, TRENCH); }
        stats.facets += N;
      });
      // the slate keel beam tying the three feet together
      {
        const xa = 0.020 - 0.008, xb = 0.154 + 0.040 + 0.008;
        rc(xa, RY1 - 0.012, xb, RY1, AR1); rc(xa, RY1 - 0.012, xb, RY1 - 0.009, ZONES.heavy.hi); rc(xa, RY1 - 0.003, xb, RY1, G_DARK);
        for (let x = xa + 0.008; x < xb - 0.004; x += 0.016) rc(x, RY1 - 0.007, x + 0.003, RY1 - 0.004, TRENCH);
      }
      // v48a-4: web plates in the shadow green close the whole section from the soffit to the keel beam, except a 3 px slit between the clamps where the red root shows
      {
        const hx = (n) => (n - 565.187) / 834.97, wb = RY1 - 0.012;
        [[565, 578.5], [581.5, 652], [655, 685], [688, 737]].forEach(([a, b]) => {
          const xa = hx(a), xb = hx(b);
          add([[xa, under(xa)], [xb, under(xb)], [xb, wb], [xa, wb]], a === 565 ? WG_D : WG_S);
        });
        // v48n-1: the end plate becomes a plain recess (clamp A stands off the bulkhead) crossed by two tie bars with a bolt head each
        {
          const LQ = (xa, ya, xb, yb, c) => lp([[xa, ya], [xb, ya], [xb, yb], [xa, yb]], c);
          const ly = (x) => 407.168 + 320.96 * under(hx(x)), yb = 407.168 + 320.96 * wb, ya = Math.min(ly(565), ly(578.5));
          LQ(565, ya, 578.5, yb, WG_S); LQ(565, ya, 578.5, ya + 2, WG_K); LQ(565, ya, 566, yb, WG_K); LQ(565, yb - 1, 578.5, yb, WG_M);
          [[414, 422], [457, 465]].forEach(([t, b]) => {
            LQ(565, b, 578.5, b + 1, WG_K); LQ(565, t, 578.5, b, WG_M); LQ(565, t, 578.5, t + 1, WG_L);
            LQ(570, t + 2, 573, t + 5, WG_L); LQ(570, t + 5, 573, t + 6, WG_S);
          });
          // v48t-1: the fore bulkhead pylon runs up through the gap to the slate band: shaft, a dark aft edge column, a head plate with a lit top row and a shadow row, a short run of lights
          LQ(553, 391, 565, 415, WG_D); LQ(553, 391, 554, 415, WG_K);
          LQ(554, 391, 565, 396, WG_M); LQ(554, 391, 565, 392, WG_L); LQ(554, 396, 565, 397, WG_S);
          [400, 403, 406, 409].forEach((y) => LQ(559, y, 560, y + 1, C.LAMP));
        }
      }
    }
    // v48a-5:the bulkhead ladders are removed (no ladder in the centre)
  }
  zone('engines');
  // v42r: no engine block: each zone runs aft into its own housing and bell, staggered; the middle's (main) engine is the biggest and reaches furthest aft where the turbine's red axle ends,
  // the cream's and the keel's smaller ones sit set back; bells in a darker steel, a flat lit aft part and a shade, short and wide, round collars where a bell enters its housing
  {
    const XF = -0.39, BLT_ = WG_L, BMD_ = WG_H, BSH_ = WG_D, MR = [128, 38, 36], DP = [70, 18, 18];
    // housing: [aft x, top y, bottom y], body colours lit/mid/shade/dark, and one bell: [centre y, root half, mouth half, mouth x]
    const engine = (xa, yt, yb, [lit, mid, sh, dk], cy, hr, hm, xe, nh, nf = 0.22, bd) => {
      const ch = 0.018;
      if (!nh) {
      add([[xa + ch, yt], [XF, yt], [XF, yb], [xa + ch, yb], [xa, yb - ch * 2.2], [xa, yt + ch * 2.2]], mid);
      add([[xa + ch, yt], [XF, yt], [XF, cy], [xa, cy], [xa, yt + ch * 2.2]], lit);
      add([[xa, cy], [XF, cy], [XF, yb], [xa + ch, yb], [xa, yb - ch * 2.2]], sh);
      rc(xa + ch, yt, XF, yt + 0.006, lit); rc(xa + ch, yb - 0.008, XF, yb, dk);
      rc(XF - 0.012, yt, XF, yb, dk);
      // two panel seams across the housing
      rc(xa + 0.016, yt, xa + 0.019, yb - 0.008, dk); rc(xa + 0.034, yt + 0.006, xa + 0.037, yb - 0.008, dk);
      }
      // the bell: a short wide flare out of the collar, flat lit aft part and a shade on its lower side
      const xr = xa - 0.004, len = xr - xe, x1 = xr - len * nf, h1 = hr + (hm - hr) * 0.4;
      const prof = (t, xs) => { const f = (x) => x <= x1 ? h1 + (hm - h1) * (x1 - x) / (x1 - xe) : hr + (h1 - hr) * (xr - x) / (xr - x1); return xs.map((x) => [x, cy + t * f(x)]); };
      const xs = [xr, x1, xe], xl = xe + len * 0.4;
      add(prof(-1, xs).concat(prof(1, xs).reverse()), BMD_);
      add(prof(0.25, xs).concat(prof(1, xs).reverse()), BSH_);
      // lit aft part: from the mouth to 40% of the length, full height
      { const hl = h1 + (hm - h1) * (x1 - xl) / (x1 - xe); add([[xe, cy - hm], [xl, cy - hl], [xl, cy + hl], [xe, cy + hm]], BLT_); }
      // the mouth: a lit lip a little taller than the bell's end, the dark throat a narrow sliver in it
      rc(xe, cy - hm * 1.08, xe + 0.007, cy + hm * 1.08, BLT_);
      rc(xe, cy - hm * 0.64, xe + 0.0035, cy + hm * 0.64, BLACK);
      // v48m-1: a heavy ring band standing 2 px proud of the bell and a thin plate seam; bd = low-sheet x of the band's aft edge, its fore edge and the seam
      if (bd) {
        const WN = [87, 64, 36], X = (p) => (p - 565.187) / 834.97, Y = (p) => (p - 407.168) / 320.96, px = 1 / 320.96;
        const fh = (p) => prof(1, [X(p)])[0][1] - cy;
        const [b0, b1, sx] = bd;
        const fb = fh(b0 + 0.5), sp = cy + 0.25 * fb;
        const fa = fh(b1 + 0.5), spa = cy + 0.25 * fa;
        rc(X(b0), cy - fb - 2 * px, X(b1), sp, WG_L); rc(X(b0), sp, X(b1), cy + fb + 2 * px, WN);
        rc(X(b0), cy - fb - 2 * px, X(b0 + 1), sp, WG_E); rc(X(b0), sp, X(b0 + 1), cy + fb + 2 * px, WG_M);
        rc(X(b1), cy - fa, X(b1 + 1), spa, WG_M); rc(X(b1), spa, X(b1 + 1), cy + fa, WG_S);
        const fs = fh(sx + 0.5);
        rc(X(sx), cy - fs, X(sx + 1), cy + fs, WG_H);
      }
      stats.bells++;
    };
    // the cream's: the deck's aft step ends in a cream housing
    zone('top');
    // v42u: no housing of its own: the collar and bell leave the citadel's overhang face at x -0.495
    // v42v: a cream cowl in the citadel's shade tone grows out of the aft face (chamfered top corner, lower edge on the underside rake), then a dark gunmetal collar ring, then the bell
    // v43a: the podium roof drops 18 px, so the cowl's top, the collar and the bell drop with it; the cowl's lower edge stays on the underside rake
    // v45a: the cowl is gone: the bell's throat runs into the housing
    rc(-0.515, -0.3649, -0.48, -0.3149, WG_S);
    rc(-0.515, -0.4039, -0.525, -0.2759, WG_S);
    engine(-0.521, -0.4139, -0.2639, [G_PALE, G_MID, G_DARK, G_DARK], -0.3399, 0.057, 0.0866, -0.569, true, 0.08, [113, 117, 104]);
    // v48q-1: the upper neck as a beam: a flange where it leaves the throat block, a collar where it enters the socket, a lit top row
    {
      const X = (p) => (p - 565.187) / 834.97, Y = (p) => (p - 407.168) / 320.96, px = 1 / 320.96;
      const WN = [87, 64, 36], nt = -0.3649, nb = -0.3149, nm = (nt + nb) / 2, nx1 = -0.48;
      rc(X(139), nt, nx1, nm, WG_D); rc(X(139), nm, nx1, nb, WG_S);
      rc(X(139), nt, nx1, nt + px, WN);
      rc(X(135), Y(288), X(139), nm, WG_D); rc(X(135), nm, X(139), Y(308), WG_S);
      rc(X(135), Y(288), X(136), nm, WN); rc(X(135), nm, X(136), Y(308), WG_D);
      rc(X(139), nt, X(140), nb, WG_K);
      rc(X(143), Y(287.5), X(149), nm, WN); rc(X(143), nm, X(149), Y(308.5), WG_D);
      rc(X(143), Y(287.5), X(144), nm, WG_M); rc(X(143), nm, X(144), Y(308.5), WN);
      rc(X(142), nt, X(143), nb, WG_K);
    }
    // the main one: v42v: a stepped gunmetal housing narrowing aft (root, middle, darker throat) clamped by a brass belt, on a slate cradle from the keel; the red axle runs into it
    {
      const SL = WG_D, SD = WG_S;
      add([[-0.39, 0.14], [-0.445, 0.155], [-0.455, 0.215], [-0.40, 0.245]], SL);
      add([[-0.40, 0.2], [-0.45, 0.2], [-0.455, 0.215], [-0.40, 0.245]], SD);
      rc(-0.447, 0.2, -0.40, 0.203, ZONES.heavy.trench);
      // v43h-1: the housing in a lighter neutral gunmetal ramp; the belt stays its lightest piece
      // v48k-1: the engine in the works green; the belt and collar face is one step darker than the end collar's WG_L
      const HL = WG_L, HB = WG_M, HS = WG_D, HD = WG_S, KC = WG_H, KL = WG_E, KS = WG_M;
      rc(-0.43, 0.005, -0.39, 0.105, HL); rc(-0.43, 0.105, -0.39, 0.21, HB);
      rc(-0.39, -0.01, -0.43, 0.005, HL); rc(-0.43, 0.2, -0.39, 0.21, HS);
      rc(-0.465, 0.005, -0.43, 0.10, HB); rc(-0.465, 0.10, -0.43, 0.195, HS);
      rc(-0.488, 0.025, -0.465, 0.10, HS); rc(-0.488, 0.10, -0.465, 0.175, HD);
      rc(-0.43, -0.01, -0.39, 0.0, HB); rc(-0.43, -0.01, -0.39, -0.004, HL);
      rc(-0.43, 0.2, -0.39, 0.21, HD);
      // the belt clamping the root, standing proud top and bottom, with a bolt row
      rc(-0.425, -0.018, -0.40, 0.218, KC); rc(-0.425, -0.018, -0.419, 0.218, KC); rc(-0.419, -0.018, -0.414, 0.218, KL); rc(-0.405, -0.018, -0.40, 0.218, KS);
      rc(-0.425, -0.018, -0.40, -0.014, KL);
      [0.0, 0.05, 0.10, 0.15, 0.20].forEach((y) => stud(-0.4125, y + 0.004, KS));
      // v45b-1: the collar passes up through the foot: same colours, a sloped top 3 px above the foot's sloped top, one more stud on the rhythm
      lp([[210, 391.9], [231, 387.9], [231, 402], [210, 402]], KC);
      lp([[215, 390.9], [220, 389.95], [220, 402], [215, 402]], KL);
      lp([[227, 388.7], [231, 387.9], [231, 402], [227, 402]], KS);
      lp([[210, 391.9], [231, 387.9], [231, 388.9], [210, 392.9]], KL);
      stud(-0.4125, -0.046, KS);
    }
    engine(-0.488, -0.01, 0.21, [WG_L, WG_M, WG_D, WG_S], 0.10, 0.085, 0.105, -0.548, true, undefined, [138, 143, 124]);
    // v48o-1: a stepped collar where the neck enters the housing, a head and a foot plate on the housing, a dark slot frame round the glow bar
    {
      const WN = [87, 64, 36], X = (p) => (p - 565.187) / 834.97, Y = (p) => (p - 407.168) / 320.96, px = 1 / 320.96, pw = 1 / 834.97;
      const ys = 0.10, nt = 0.025, nb = 0.175, ht = 0.005, hb = 0.195, bx0 = -0.484, bx1 = -0.44, by0 = 0.084, by1 = 0.116;
      const c0 = Y(411.5), c1 = Y(466), xc0 = X(171), xc1 = X(177);
      rc(xc0, c0, xc1, ys, WN); rc(xc0, ys, xc1, c1, WG_D);
      rc(xc0, c0, X(172), ys, WG_M); rc(xc0, ys, X(172), c1, WN);
      rc(X(170), nt, xc0, ys, WG_S); rc(X(170), ys, xc0, nb, WG_K);
      rc(-0.465, ht, -0.43, Y(412), WG_H); rc(-0.465, Y(412), -0.43, Y(413), WN);
      rc(-0.465, hb - 4 * px, -0.43, hb, WN); rc(-0.465, hb - 5 * px, -0.43, hb - 4 * px, WG_S);
      rc(bx0 - pw, by0 - 2 * px, bx1 + pw, by0, WG_K);
      rc(bx0 - pw, by0 - 2 * px, bx0, by1 + px, WG_K); rc(bx1, by0 - 2 * px, bx1 + pw, by1 + px, WG_K);
      rc(bx0, by1, bx1, by1 + px, WG_M);
    }
    rc(-0.484, 0.084, -0.44, 0.100, MR); rc(-0.484, 0.100, -0.44, 0.116, DP);
    // v45b-1: the limit under the foot and the leg's whole base: a solid 4 px graphite band from the toe (x 184) to the leg's forward end (x 390), a 1 px pale steel line under it
    lp([[184, 405], [390, 405], [390, 409], [184, 409]], GRAPH);
    lp([[184, 409], [390, 409], [390, 410], [184, 410]], STL_P);
    // v45c-1: the cream underside over the bay and the belts: a wall face, a soffit one tone darker below a level edge at y 371, uneven 1 px seams (no streaks)
    {
      const ZT = ZONES.top, LR = (xa, ya, xb, yb, c) => lp([[xa, ya], [xb, ya], [xb, yb], [xa, yb]], c);
      LR(389, 361, 730, 371, ZT.mid);
      LR(389, 371, 730, 384, ZT.dark);
      [428, 471, 502, 561, 598, 655, 697].forEach((x) => { LR(x, 361, x + 1, 371, ZT.dark); LR(x, 371, x + 1, 384, BLACK); });
      // v48r-1: the grey lower half opens into three recessed bays between the seams (the seams stay as their edges): neck-tone fill, a 2 px shadow under the top edge, a 1 px shadow column down the aft edge, a 1 px lit lip at the foot
      [[429, 471], [503, 561], [599, 655]].forEach(([x0, x1]) => {
        LR(x0, 371, x1, 384, ZT.trench);
        LR(x0, 371, x1, 373, [45, 51, 58]);
        LR(x0, 373, x0 + 1, 383, [45, 51, 58]);
        LR(x0, 383, x1, 384, ZT.dark);
      });
      // the limit girder: 2 px pale steel over a 5 px graphite band, from the leg's forward end to the last belt's forward edge, one vertical jog at x 390 down to the leg's band
      LR(390, 384, 725, 386, STL_P);
      LR(390, 386, 725, 391, GRAPH);
      LR(388, 391, 390, 405, GRAPH);
      // clamps: cream blocks with a 1 px graphite underside and a 1 px darker side face; three over the bay, one saddle on each belt with a 4 px notch at the seam
      const CL = (xa, xb, h) => { LR(xa, 391, xb, 391 + h - 1, ZT.pale); LR(xb - 1, 391, xb, 391 + h - 1, ZT.dark); LR(xa, 391 + h - 1, xb, 391 + h, GRAPH); };
      CL(404, 418, 8); CL(440, 466, 14); CL(520, 530, 6);
      // v48c-2: each tooth is seated on the wall: a 2 px shadow under its bottom edge and a 1 px line down the green along each side
      [[404, 418, 8], [440, 466, 14], [520, 530, 6]].forEach(([xa, xb, h]) => {
        LR(xa, 391 + h, xb, 393 + h, WG_S); LR(xa - 1, 395.6, xa, 391 + h, WG_S); LR(xb, 395.6, xb + 1, 391 + h, WG_S);
      });
      [[587, 608, 629], [652, 670, 688], [706, 712, 718]].forEach(([xa, c, xb]) => { CL(xa, c - 2, 10); CL(c + 2, xb, 10); });
      // v48b-1: the fore clamps grip the structure: two jaws each (y 400..490, over the cream above and the keel rail below), drawn after the soffit and teeth; a waist inset 5 px behind 45 degree chamfers
      // v48c-1: a hierarchy: A the master (x 583..650, y 394, jaws 20), B a slim collar (657..683, y 404, jaws 12), C as before (690..731, y 400, jaws 16)
      [[583, 650, 394, 20, 5, 3], [657, 683, 404, 12, 3, 1], [690, 731, 400, 16, 5, 2]].forEach(([l, r, t0, jh, ins, nb]) => {
        const t1 = t0 + jh, t2 = t1 + ins, b2 = 490 - jh, b1 = b2 - ins, b0 = 490;
        lp([[l, t0], [r, t0], [r, t1], [r - ins, t2], [r - ins, b1], [r, b2], [r, b0], [l, b0], [l, b2], [l + ins, b1], [l + ins, t2], [l, t1]], WG_M);
        LR(l + ins, t2, r - ins, b1, WG_D);
        LR(l + ins, t2, r - ins, t2 + 2, WG_S);
        [[t0, t1], [b2, b0]].forEach(([ja, jb]) => {
          LR(l, ja, r, ja + 1, WG_E); LR(l, ja + 1, r, ja + 3, WG_L); LR(l, jb - 2, r, jb, WG_D);
          const by = Math.round((ja + jb) / 2) - 1;
          (nb === 3 ? [l + 6, Math.round((l + r) / 2 - 1.5), r - 9] : nb === 1 ? [Math.round((l + r) / 2 - 1.5)] : [l + 6, r - 9]).forEach((bx) => { LR(bx, by, bx + 3, by + 3, WG_L); LR(bx, by + 3, bx + 3, by + 4, WG_S); });
        });
        // v48l-1: no shared waist seam; each clamp gets its own face (A two interlocked jaws, B a tall channel, C a recessed panel)
        if (l === 583) {
          const WG_N = [87, 64, 36], xs = [588, 599, 611, 622, 634, 645], ys = [445, 453, 445, 453, 445];
          for (let i = 0; i < 5; i++) LR(xs[i], ys[i], xs[i + 1], b1, WG_N);
          for (let i = 0; i < 5; i++) LR(xs[i] + 1, ys[i] + 1, xs[i + 1], ys[i] + 2, WG_M);
          for (let i = 0; i < 5; i++) LR(xs[i], ys[i], xs[i + 1], ys[i] + 1, WG_K);
          for (let i = 1; i < 5; i++) LR(xs[i], 445, xs[i] + 1, 454, WG_K);
          [[583, 588], [645, 650]].forEach(([xa, xb]) => { LR(xa, 448, xb, 449, WG_S); LR(xa, 449, xb, 450, WG_L); });
        } else if (l === 657) {
          LR(667, 425, 673, 470, WG_K); LR(672, 425, 673, 470, WG_M); LR(667, 470, 673, 471, WG_M);
        } else {
          lp([[700, 428], [718, 428], [721, 431], [721, 459], [718, 462], [700, 462], [697, 459], [697, 431]], WG_S);
          LR(700, 428, 718, 429, WG_K); LR(697, 431, 698, 459, WG_K); LR(700, 461, 718, 462, WG_M);
        }
      });
      // A's upper waist: one row of eight 1 px lights, 4 px apart, centred, 6 px under the top jaw's shadow
      for (let i = 0; i < 8; i++) LR(602 + 4 * i, 427, 603 + 4 * i, 428, C.LAMP);
      // v48g-1: two tie structures in the centre material, drawn last. Up tower over the aft bulkhead (seat 359..411 y 400..408, shaft 365..405 y 366..400 with the pylon slot carried up, collar y 358..366, lit cap 346..424 y 342..358, 6 px upper cuts). Down brace on the keel rail under the fore clamps (slanted body y 490..507, shoe 664..752 y 507..519 with four bolts, tooth to y 534)
      const bolt = (bx, by) => { LR(bx, by, bx + 3, by + 3, WG_L); LR(bx, by + 3, bx + 3, by + 4, WG_S); };
      LR(359, 400, 411, 408, WG_M); LR(359, 400, 411, 401, WG_E); LR(359, 407, 411, 408, WG_S);
      LR(365, 366, 405, 400, WG_M); LR(365, 383, 383, 384, WG_S); LR(387, 383, 405, 384, WG_S);
      lp([[383, 370], [387, 370], [387, 396], [383, 396]], WG_S);
      lp([[383, 370], [384, 370], [384, 396], [383, 396]], WG_K);
      lp([[386, 370], [387, 370], [387, 396], [386, 396]], WG_M);
      for (let y = 372; y + 1 <= 396; y += 3) LR(384, y, 385, y + 1, C.LAMP);
      LR(359, 358, 411, 366, WG_L); LR(359, 365, 411, 366, WG_S);
      lp([[352, 342], [418, 342], [424, 348], [424, 358], [346, 358], [346, 348]], WG_M);
      LR(352, 342, 418, 343, WG_E); lp([[346, 348], [352, 342], [353, 342], [346, 349]], WG_E); lp([[418, 342], [424, 348], [424, 349], [417, 342]], WG_E);
      LR(346, 357, 424, 358, WG_S);
      for (let x = 358; x <= 412; x += 4) LR(x, 350, x + 1, 351, C.LAMP);
      lp([[684, 490], [732, 490], [746, 507], [670, 507]], WG_M);
      lp([[685, 495], [731, 495], [737, 502], [679, 502]], WG_D); LR(685, 495, 731, 496, WG_S); LR(706, 495, 710, 502, WG_M);
      lp([[664, 507], [752, 507], [752, 514], [747, 519], [669, 519], [664, 514]], WG_M);
      LR(664, 507, 752, 508, WG_E); LR(669, 518, 747, 519, WG_S);
      bolt(680, 510); bolt(697, 510); bolt(715, 510); bolt(732, 510);
      lp([[704, 519], [734, 519], [730, 534], [714, 534]], WG_D); lp([[704, 519], [705, 519], [715, 534], [714, 534]], WG_S);
      // v48j-2: the end collar (v48j-1) is drawn here, after the grey engine block, so it shows in full
      lp([[233, 405], [236, 405], [236, 476], [233, 476], [231, 474], [231, 407]], WG_E);
      LR(232, 406, 235, 475, WG_L); LR(235, 406, 236, 475, WG_S); LR(232, 475, 236, 476, WG_S);
      [419, 451].forEach((sy) => { LR(232, sy, 235, sy + 7, WG_S); LR(232, sy, 235, sy + 1, WG_K); });
      LR(236, 408, 241, 472, WG_M); LR(236, 408, 241, 409, WG_E); LR(240, 409, 241, 472, WG_S); LR(236, 471, 241, 472, WG_S);
      LR(241, 409, 242, 469, WG_S);
    }
    stats.facets += 6;
  }

  // ---- 8. front: each blade ends at the ring in a stepped collar of two segments, the red stone filling the gap behind the ring ----
  PART = 'nose';
  // the front rock and the dead-spot chunk: hand-built facets in the nose's reds
  zone('heavy');
  {
    const BR = [164, 54, 48], MR = [128, 38, 36], DP = [70, 18, 18];
    // v40b: a backing in the stone's shade red behind the ring's lower end, so no background shows aft of it
    rc(0.30, 0.09, 0.395, 0.205, DP);
    // the front rock: twelve big facets, lightest upper left, darkest lower right, a broken aft edge
    {
      const A = [0.165, -0.02], B = [0.20, -0.07], C = [0.25, -0.065], D = [0.30, -0.07], E = [0.36, -0.07], F = [0.36, 0.10], G = [0.31, 0.10], H = [0.27, 0.085], I = [0.22, 0.10], J = [0.18, 0.06], K = [0.172, 0.02];
      const P1 = [0.21, 0.0], P2 = [0.265, -0.01], P3 = [0.32, 0.0], P4 = [0.245, 0.045], P5 = [0.30, 0.05];
      [[[A, B, P1], BR], [[B, C, P2, P1], BR], [[C, D, P3, P2], MR], [[D, E, P3], MR], [[E, F, P3], RUST_SHADE],
       [[A, P1, P4, J, K], MR], [[P1, P2, P5, P4], MR], [[P2, P3, P5], RUST_SHADE], [[P3, F, P5], DP],
       [[J, P4, H, I], MR], [[P4, P5, G, H], RUST_SHADE], [[P5, F, G], DP]].forEach(([p, c]) => { add(p, c); stats.facets++; });
    }
    // the dead-spot chunk: six facets, a pointed lower end hanging below the armour line
    {
      const c = [0.30, 0.158];
      [[[0.265, 0.14], [0.30, 0.14], BR], [[0.30, 0.14], [0.34, 0.14], MR], [[0.34, 0.14], [0.335, 0.165], RUST_SHADE],
       [[0.335, 0.165], [0.30, 0.195], DP], [[0.30, 0.195], [0.275, 0.17], RUST_SHADE], [[0.275, 0.17], [0.265, 0.14], MR]].forEach(([a, b, col]) => { add([a, b, c], col); stats.facets++; });
    }
    // two jaws only: each a thick slab with a stepped inner edge biting the rock, a stud row; 0.108 of rock between them
    slab(0.22, 0.335, -0.105, -0.07, AR1, 2); slab(0.28, 0.335, -0.07, -0.04, AR2, 1);
    slab(0.22, 0.335, 0.10, 0.135, AR1, 1); slab(0.28, 0.335, 0.07, 0.10, AR2, 1);
    // the dead-spot clamp from the aft side (the lower jaw is the one from above)
    slab(0.24, 0.262, 0.10, 0.17, AR2, 2);
    // the red area at the ring's foot: one faceted patch of the front rock between the lower jaw and the bottom armour
    {
      const c = [0.262, 0.168];
      [[[0.235, 0.14], [0.27, 0.133]], [[0.27, 0.133], [0.292, 0.15]], [[0.292, 0.15], [0.285, 0.185]],
       [[0.285, 0.185], [0.262, 0.202]], [[0.262, 0.202], [0.238, 0.185]], [[0.238, 0.185], [0.235, 0.14]]].forEach(([a, b], i) => { add([a, b, c], [BR, BR, MR, DP, RUST_SHADE, MR][i]); stats.facets++; });
    }
  }
  // the block above the throat: two stepped armour slabs with a stud row (the collars)
  // v42j: the first block above the throat is gone, the housing runs to the collar
  slab(0.30, 0.36, -0.135, -0.07, AR2, 2);
  slab(0.33, 0.36, -0.19, -0.135, AR2, 1);
  // v42b: the rock neck, the stone running aft from the collar at near the ring's bore into the hull: a lit top band, six big side facets, a jagged outline
  {
    const BR = [164, 54, 48], MR = [128, 38, 36], SH = [87, 26, 30], DP = [70, 18, 18];
    const NT = [[0.19, -0.12], [0.335, -0.12]];
    const NB = [[0.19, 0.2035], [0.335, 0.1808]];
    const T = (x) => at(NT, x), B = (x) => at(NB, x), LB = (x) => T(x) + 0.035;
    const cut = [0.19, 0.245, 0.29, 0.335], fr = [[0.45, 0.6], [0.5, 0.4], [0.6, 0.45], [0.4, 0.5]];
    add(NT.concat(NB.slice().reverse()), DP);
    add(NT.concat(NT.map(([x]) => [x, LB(x)]).reverse()), BR);
    for (let k = 0; k < 3; k++) {
      const xa = cut[k], xb = cut[k + 1], ya = LB(xa), yb2 = LB(xb);
      const ma = ya + (B(xa) - ya) * fr[k][0], mb = yb2 + (B(xb) - yb2) * fr[k][1];
      add([[xa, ya], [xb, yb2], [xb, mb], [xa, ma]], [MR, MR, SH][k]);
      add([[xa, ma], [xb, mb], [xb, B(xb)], [xa, B(xa)]], [SH, DP, DP][k]);
      stats.facets += 2;
    }
    // the housing's front tongue cut back in three ragged plate steps ending at 0.23, so the neck forward of it is bare
    [[0.23, 0.245, -0.07], [0.245, 0.256, -0.10], [0.256, 0.266, -0.125]].forEach(([xa, xb, yb2]) => {
      const yt2 = T(xa) - 0.01;
      rc(xa, yt2, xb, yb2, G_PALE); rc(xa, yb2 - 0.006, xb, yb2, G_MID); rc(xb - 0.006, yt2, xb, yb2 - 0.006, G_DARK);
    });
    // the lower hull's front meets the rock the same way
    [[0.225, 0.25, 0.19], [0.25, 0.275, 0.215]].forEach(([xa, xb, yt2]) => {
      const yb2 = B(xa) + 0.012;
      rc(xa, yt2, xb, yb2, G_PALE); rc(xa, yt2, xb, yt2 + 0.006, G_MID); rc(xb - 0.006, yt2 + 0.006, xb, yb2, G_DARK);
    });
    // v42i: the joint pieces of v42f-h are gone; the hull's own lines run level into the ring
    // the seat tones follow the ring collar's own lit, mid and dark and change with it at wiring
    const SEAT_L = [156, 169, 180], SEAT_M = [133, 147, 160], SEAT_D = [92, 104, 114], SEAT_K = [54, 63, 71], RIVET = [180, 192, 200];
  }
  // cockpits: four on the top zone, three on the bottom, one module repeated
  zone('top'); PART = 'top';
  [[0.20, -0.209, 0.040], [-0.07, -0.381 - 0.0192, 0.036]].forEach(([x, y, l]) => { cockpit(x, x === 0.20 ? y + dk(x + l) : y, l, false, x === 0.20 ? [[133, 147, 160], [156, 169, 180], [92, 104, 114]] : null); stats.towers++; });
  function drawRest(g, L) {
    // v36: the hull is squeezed to 0.80 of its height about the ring's centre axis; round things are built with their y radius divided by 0.80
    g.save(); g.scale(1, 0.8);
    g.translate(PROP.px * L, PROP.py * L); g.scale(PROP.sx, PROP.sy); g.translate(-PROP.px * L, -PROP.py * L);
    for (const it of OPS) fillPoly(g, it[0], L, it[1]);
    g.restore();
  }
  // v43k-3: run after the nose is drawn: the ring band's grey-blue pixels (inside the canvas pixel box x0..x1, y0..y1, identity transform) take the plating's purple push, luminance kept below 100 and eased down above it so the studs stay under the lilac line; red and everything else is left alone
  function tintRing(g, ox, oy, L) {
    // v43o-1: (ox, oy, L) is the ship's origin and length; the pixel box is the big ship's (L 590 at 640,330) box mapped to it
    const k = L / 590, x0 = Math.round(ox + (876 - 640) * k), y0 = Math.round(oy + (214 - 330) * k), x1 = Math.round(ox + (913 - 640) * k), y1 = Math.round(oy + (428 - 330) * k);
    const im = g.getImageData(x0, y0, x1 - x0, y1 - y0), d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      if (d[i + 3] < 255 || b < r + 6 || gg < r) continue;
      const Lm = 0.299 * r + 0.587 * gg + 0.114 * b, q = Lm > 100 ? (100 + (Lm - 100) * 0.25) / Lm : 1;
      const t = tint([r * q, gg * q, b * q].map(Math.round));
      d[i] = t[0]; d[i + 1] = t[1]; d[i + 2] = t[2];
    }
    g.putImageData(im, x0, y0);
  }
  // v43l-3: run after tintRing, same arguments: gives the ring band structure (thick top, one thick spot, two dark bars) and covers its four round studs; every tone is derived here from the band's own face, row by row
  function dressRing(g, ox, oy, L, clear) {
    // v43o-1: every pixel number below is the big ship's (L 590 at 640,330); fx/fy/X/Y map one to a ship at (ox, oy, L), R fills a mapped rect at least 1 px each way
    const sc = L / 590, fx = x => ox + (x - 640) * sc, fy = y => oy + (y - 330) * sc, X = x => Math.round(fx(x)), Y = y => Math.round(fy(y));
    // v43q-1: every part is one filled polygon in unrounded float coordinates, so the canvas smooths its edges
    const poly = (c, pts) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(fx(x), fy(y)) : g.moveTo(fx(x), fy(y))); g.closePath(); g.fill(); };
    const css = c => 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
    const mix = (c, k) => c.map(v => Math.round(v * k));
    // the stud bump above the band's top row goes back to the backdrop (clear: on the sprite it is a real clear)
    if (clear) { g.save(); g.globalCompositeOperation = 'destination-out'; poly('#000', [[884, 213], [902, 213], [902, 215], [884, 215]]); g.restore(); }
    else poly('rgb(5,6,10)', [[884, 213], [902, 213], [902, 215], [884, 215]]);
    // v43r: one ramp from the ship's own purples (the keel's lit purple, the talon's deep purple, the hand's old lavender), every plane flat
    const LIT = css([91, 100, 136]), FACE_C = tintD([100, 114, 126], 0.88), SHADE_C = tint([66, 80, 92]);
    const FACE = css(FACE_C), SHADE = css(SHADE_C), REC = css(mix(SHADE_C, 0.72)), HLOW = css(mix(SHADE_C, 0.86));
    const CAST = 'rgba(0,0,0,0.2)';
    // v43r: hard flat cast shadows on the stone, painted before the jaws and band: a slanted wedge fore of the band (wider toward the bottom), a strip under each jaw's lower edge tapering to its tip
    // v43r-2: the wedge steps round the top jaw's strip so no pixel is shadowed twice
    poly(CAST, [[920, 214], [922.1, 214], [927.6, 275.35], [920, 280], [920, 296], [928.8, 288.67], [941.6, 432], [920, 432]]);
    // v43s-2: the top section's short lip casts a short strip, stepped round the wedge's edge
    poly(CAST, [[926, 255], [938, 246], [926, 267]]);
    poly(CAST, [[920, 436], [931, 431], [926, 438], [920, 441]]);
    // v43r: the hand's outline (v43n-1), shared by its planes and its contact shadow
    const HP = [[846.4, 200.6], [817, 224], [817, 288], [808, 288], [742, 299], [808, 316], [813, 316], [817, 327], [813, 338], [808, 338], [782, 345], [808, 352], [813, 352], [817, 365], [813, 378], [808, 378], [706, 391], [808, 404], [817, 404], [817, 424], [839.75, 431.9]];
    // v43r: one narrow contact strip on the hull along the hand's aft edge and underside: the outline shifted 8 aft and 8 down, under the hand
    poly(CAST, HP.map(([x, y]) => [x - 8, y + 8]));
    // v43s-2: the upper jaw is now the top section's short lip, painted after the top plate below
    // v43s-4: the lower jaw is now the bottom section's short raked lip (14 px fore of the band): a lit top edge, a face, a dark plane under it
    poly(LIT, [[919.25, 404], [934, 408], [933.6, 411], [919.25, 407]]);
    poly(FACE, [[919.25, 407], [933.6, 411], [932, 422], [919.25, 421]]);
    poly(SHADE, [[919.25, 421], [932, 422], [930, 431], [919.25, 437]]);
    // v43p-2: the recessed gap runs from the hand's fore line to 0.75 under the band's aft edge (X 868) over the band's rows
    const xf = y => 846 - (y - 186) * 8 / 280;
    poly(REC, [[xf(198), 198], [868.75, 198], [868.75, 446], [xf(446), 446]]);
    // v43r: the band, straight aft edge, ends raked as before: FACE slab, a narrow LIT top bevel, a SHADE lower third on uneven slanted facet lines, two recessed channels each one tone darker than the plane it crosses
    const bTop = x => 198 + (x - 868) * 10 / 52, bBot = x => 446 - (x - 868) * 10 / 52;
    const bBev = x => 234 - (x - 868) * 10 / 52, bShd = x => 368 - (x - 868) * 16 / 52;
    const strip = (xa, xb, f1, f2, c) => poly(c, [[xa, f1(xa)], [xb, f1(xb)], [xb, f2(xb)], [xa, f2(xa)]]);
    strip(868, 920, bTop, bBot, FACE);
    strip(868, 920, bTop, bBev, LIT);
    strip(868, 920, bShd, bBot, SHADE);
    // v43s-1: the talon's vocabulary on the band: a groove, a rim strip under each line's aft half, an aft rim strip, a dash pair, a slot row
    const SEAM = css(mix(FACE_C, 0.8)), RIM = css(FACE_C.map(v => Math.min(255, Math.round(v * 1.2)))), SLOT = css(BLACK);
    // v43s-2: the two horizontal section lines cut the whole ring into top, middle and bottom; the next two specs reuse them
    const RING_LINE_TOP = 272, RING_LINE_BOT = 364;
    // the top and bottom sections sit 3 px proud of the middle at the fore and aft edges
    const PR = 3, pa = 868 - PR, pb = 920 + PR;
    strip(pa, pb, bTop, () => RING_LINE_TOP, FACE);
    strip(pa, pb, bTop, bBev, LIT);
    strip(pa, pb, () => RING_LINE_BOT, bBot, SHADE);
    // the top section's groove parallel to its top outline, and one dash pair
    strip(872, 916, x => bTop(x) + 44, x => bTop(x) + 46.5, SEAM);
    [52, 60].forEach(d => strip(880, 896, x => bTop(x) + d, x => bTop(x) + d + 2.5, SEAM));
    // groove 10 px in from the fore edge, from the top line down to three quarters of the band
    poly(SEAM, [[909.5, 284], [912, 284], [912, 384], [909.5, 384]]);
    // the two lines: a dark groove 2 px thick with a lit rim strip 3 px thick under its aft part, on the plate below
    [[RING_LINE_TOP, 868], [RING_LINE_BOT, pa]].forEach(([y, rx]) => {
      poly(SEAM, [[pa, y - 1], [pb, y - 1], [pb, y + 1], [pa, y + 1]]);
      poly(RIM, [[rx, y + 1], [894, y + 1], [894, y + 4], [rx, y + 4]]);
    });
    // the aft rim strip, one piece per plate
    [[pa, bBev(pa), RING_LINE_TOP - 1], [868, RING_LINE_TOP + 4, RING_LINE_BOT - 1], [pa, RING_LINE_BOT + 4, bBot(pa)]].forEach(([x, ya, yb]) => poly(RIM, [[x, ya], [x + 4, ya], [x + 4, yb], [x, yb]]));
    // the top section's lip: the top plate continued over the stone, a flat raked fore end, a dark plane under it
    poly(LIT, [[922.5, 208.3], [942, 213], [941.6, 222], [922.5, 217.5]]);
    poly(FACE, [[922.5, 217.5], [941.6, 222], [940, 236], [922.5, 238]]);
    poly(SHADE, [[922.5, 238], [940, 236], [938, 246], [922.5, 256]]);
    // three slim spikes on the top plate, each raked more than the one aft of it, each with a hard cast shadow at its foot
    const spike = (cx, len, deg, w) => {
      const a = deg * Math.PI / 180, by = bTop(cx) + 0.75, tip = [cx + len * Math.sin(a), by - len * Math.cos(a)];
      const b = f => [cx - w / 2 + w * f, by + (f - 0.5) * w * 10 / 52];
      poly(CAST, [[b(1)[0], b(1)[1] - 0.5], [b(1)[0] + 9, b(1)[1] + 9 * 10 / 52], [b(1)[0], b(1)[1] + 5.5]]);
      poly(LIT, [b(0), tip, b(0.25)]);
      poly(FACE, [b(0.25), tip, b(0.6)]);
      poly(SHADE, [b(0.6), tip, b(1)]);
    };
    spike(878, 40, 6, 9); spike(893, 52, 14, 11); spike(908, 27, 23, 6);
    // dash pair in the middle plate, off centre, slanted like the seams
    [306, 314].forEach(y => poly(SEAM, [[879, y], [895, y + 16 * 10 / 52], [895, y + 2.5 + 16 * 10 / 52], [879, y + 2.5]]));
    // v43s-3: the middle section: the talon's groove and rim contrast on its strokes, one more groove parallel to the aft edge, a rim strip on the fore edge, two stacked grip plates over the stone
    const SEAMD = css(mix(FACE_C, 0.6)), RIMS = css(FACE_C.map(v => Math.min(255, Math.round(v * 1.45))));
    poly(RIMS, [[868, RING_LINE_TOP + 1], [894, RING_LINE_TOP + 1], [894, RING_LINE_TOP + 4], [868, RING_LINE_TOP + 4]]);
    poly(SEAMD, [[873, 282], [875.5, 282], [875.5, 356], [873, 356]]);
    poly(SEAMD, [[909.5, 284], [912, 284], [912, RING_LINE_BOT - 1], [909.5, RING_LINE_BOT - 1]]);
    [306, 314].forEach(y => poly(SEAMD, [[879, y], [895, y + 16 * 10 / 52], [895, y + 2.5 + 16 * 10 / 52], [879, y + 2.5]]));
    // v43s-4: the fore rim strip runs only the upper 60% of the middle section, breaking the frame
    const rimEnd = RING_LINE_TOP + 1 + 0.6 * (RING_LINE_BOT - RING_LINE_TOP - 2);
    poly(RIMS, [[916.5, RING_LINE_TOP + 1], [920, RING_LINE_TOP + 1], [920, rimEnd], [916.5, rimEnd]]);
    // two raked grip plates over the stone (reach 10 and 6, 22 and 14 tall), slanted like the slots, each a tone darker than the plate above, a lit top edge, a hard cast shadow below
    poly(CAST, [[922, 308], [930, 308], [924, 316], [922, 316]]);
    poly(CAST, [[922, 328], [926, 328], [921.8, 334], [922, 334]]);
    poly(css(mix(FACE_C, 0.88)), [[919.25, 286], [930, 286], [923.4, 308], [919.25, 308]]);
    poly(RIMS, [[919.25, 286], [930, 286], [929.4, 288], [919.25, 288]]);
    poly(css(mix(FACE_C, 0.76)), [[919.25, 314], [926, 314], [921.8, 328], [919.25, 328]]);
    poly(RIMS, [[919.25, 314], [926, 314], [925.4, 316], [919.25, 316]]);
    // slot row in the lowest plate, graded 22x7, 18x6, 14x5, slanted like the talon's slots
    const slot = (cx, cy, len, h, sl) => { const f = (y, e) => cx + e * len / 2 + sl * (y - cy); return [[f(cy - h / 2, 1), cy - h / 2], [f(cy - h / 2, -1), cy - h / 2], [f(cy + h / 2, -1), cy + h / 2], [f(cy + h / 2, 1), cy + h / 2]]; };
    poly(SLOT, slot(890, 374, 22, 7, -0.21));
    poly(SLOT, slot(890, 388, 18, 6, -0.3));
    poly(SLOT, slot(890, 401, 14, 5, -0.5));
    // v43s-4: the bottom section: a thin groove parallel to its lower outline, and its lowest plate ends in one layered blade overlapping down and aft onto the keel, a lit rim on its upper edge, a dark plane on the keel under it
    strip(872, 916, x => bBot(x) - 12.5, x => bBot(x) - 10, SEAM);
    poly(CAST, [[865, 446.6], [838, 463], [834, 471], [868, 454]]);
    poly(SHADE, [[905, 439.2], [865, 446.6], [838, 463]]);
    poly(FACE, [[905, 439.2], [838, 463], [851.5, 454.8], [888, 442.3]]);
    poly(LIT, [[905, 439.2], [838, 463], [846, 460.5], [902, 441.4]]);
    // v43n-1: the clamp's hand, one polygon: raked blade tips, three fingers (the upper over the stone block, the lower ends at Y 404) with a short cusp between bays; fore edge the straight line (846,186) to (838,466), 0.75 over the gap
    // v43r: the hand sits behind the band, so each plane is one tone darker than the band's: SHADE body, FACE top bevel, a deeper lower plane, the planes cut by slanted facet lines inside the one outline
    poly(SHADE, HP);
    g.save(); g.beginPath(); HP.forEach(([x, y], i) => i ? g.lineTo(fx(x), fy(y)) : g.moveTo(fx(x), fy(y))); g.closePath(); g.clip();
    poly(FACE, [[690, 190], [860, 190], [860, 228.5], [690, 236]]);
    poly(HLOW, [[690, 372], [860, 352.5], [860, 480], [690, 480]]);
    // v43s-3: the two upper fingers as layered blades: a lit rim strip along the upper edge, a dark groove along the lower edge, both short of the tip; one palm plate over the roots with a slanted edge, a lit rim on it, a dark plane under it
    const f1u = x => 288 + (808 - x) / 6, f1l = x => 316 - (808 - x) * 17 / 66;
    const f2u = x => 338 + (808 - x) * 7 / 26, f2l = x => 352 - (808 - x) * 7 / 26;
    poly(css(mix(FACE_C, 1.2)), [[794, f1u(794)], [762, f1u(762)], [762, f1u(762) + 2.5], [794, f1u(794) + 2.5]]);
    poly(REC, [[794, f1l(794) - 5], [762, f1l(762) - 5], [762, f1l(762) - 3], [794, f1l(794) - 3]]);
    poly(css(mix(FACE_C, 1.2)), [[793, f2u(793)], [786, f2u(786)], [786, f2u(786) + 1.5], [793, f2u(793) + 1.5]]);
    poly(REC, [[793, f2l(793) - 2.5], [786, f2l(786) - 2.5], [786, f2l(786) - 1], [793, f2l(793) - 1]]);
    const pe = y => 802 - (y - 273) * 4 / 90;
    poly(REC, [[pe(273) - 4, 273], [pe(273), 273], [pe(363), 363], [pe(363) - 4, 363]]);
    poly(FACE, [[pe(273), 273], [870, 273], [870, 363], [pe(363), 363]]);
    poly(css(mix(FACE_C, 1.2)), [[pe(273), 273], [pe(273) + 3, 273], [pe(363) + 3, 363], [pe(363), 363]]);
    // v43s-4: the third finger gets the same rim and groove; the palm plate's slanted edge continues below the bottom line
    const f3u = x => 378 + (808 - x) * 13 / 102, f3l = x => 404 - (808 - x) * 13 / 102;
    poly(css(mix(FACE_C, 1.2)), [[794, f3u(794)], [740, f3u(740)], [740, f3u(740) + 2.5], [794, f3u(794) + 2.5]]);
    poly(REC, [[794, f3l(794) - 5], [740, f3l(740) - 5], [740, f3l(740) - 3], [794, f3l(794) - 3]]);
    poly(REC, [[pe(366) - 4, 366], [pe(366), 366], [pe(398), 398], [pe(398) - 4, 398]]);
    poly(css(mix(FACE_C, 1.2)), [[pe(366), 366], [pe(366) + 3, 366], [pe(398) + 3, 398], [pe(398), 398]]);
    // v43s-2: the two section lines continue across the hand at the same heights
    [RING_LINE_TOP, RING_LINE_BOT].forEach(y => {
      poly(REC, [[690, y - 1], [860, y - 1], [860, y + 1], [690, y + 1]]);
      poly(css(mix(SHADE_C, 1.25)), [[690, y + 1], [780, y + 1], [780, y + 4], [690, y + 4]]);
    });
    g.restore();
  }
  // the rest pose as the sketch's final hull units (origin the ship's centre, +x nose, +y down, 1 = L): drawRest's own squeeze and PROP stretch applied to a table point
  const hx = (x) => PROP.px + (x - PROP.px) * PROP.sx, hy = (y) => 0.8 * (PROP.py + (y - PROP.py) * PROP.sy);
  // the anchors come from the drawing tables: the two bells' mouths (engine() calls: x mouth, y centre), the OPS list's extents, the ring band in dressRing
  const anchors = (() => {
    let x0 = Infinity, y0 = Infinity, y1 = -Infinity;
    for (const it of OPS) for (const p of it[0]) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    return {
      nozzleUpper: { x: hx(-0.569), y: hy(-0.3399) },   // the cream bell's mouth
      nozzleMain: { x: hx(-0.548), y: hy(0.10) },       // the main bell's mouth
      stern: hx(x0), top: hy(y0), bottom: hy(y1),
      ring: { x: (894 - 640) / 590, y: (322 - 330) / 590, aft: (868 - 640) / 590, fore: (920 - 640) / 590 }   // dressRing's band: x 868..920, rows 198..446 on the big ship (L 590 at 640,330)
    };
  })();
  // the rest pose baked once per (L, dpr) onto a transparent canvas, no glow: { canvas, ox, oy, scale } with (ox, oy) the ship's origin in canvas pixels, scale = dpr (1 hull unit = L * dpr pixels)
  const cache = {};
  // the ship seen head-on: [height down the hull aft of the ring (0 top .. 1 keel), width as a fraction of the full beam], joined by straight lines
  const HEADON = [[0, 0.03], [0.07, 0.03], [0.1, 0.16], [0.56, 0.6], [0.57, 1], [0.66, 1], [0.68, 0.74], [0.97, 0.08], [1, 0.05]];
  function sprite(L, dpr) {
    const key = L + '@' + dpr;
    if (cache[key]) return cache[key];
    const s = L * dpr, ox = Math.ceil(-anchors.stern * s) + 3, oy = Math.ceil(-anchors.top * s) + 3;
    const cv = document.createElement('canvas');
    cv.width = ox + Math.ceil((window.VoidshipArt.TIP + 0.208) * s); cv.height = oy + Math.ceil(anchors.bottom * s) + 3;
    const g = cv.getContext('2d'), ship = { face: 1, thrustAmt: 0, flare: 0, strain: 0 };
    g.translate(ox, oy);
    drawRest(g, s); window.VoidshipArt.drawProw(g, ship, s, 1, true);
    g.translate(-ox, -oy);
    tintRing(g, ox, oy, s); dressRing(g, ox, oy, s, true);
    // per pixel row of the hull aft of the ring band (for the baked turn's beam): { w }, the half-width as a fraction of the full beam from HEADON (a few straight edges); null for a row with no hull
    const px = g.getImageData(0, 0, cv.width, cv.height).data, xe = Math.min(cv.width, Math.ceil(ox + anchors.ring.aft * s)), rows = [], has = [];
    for (let j = 0; j < cv.height; j++) {
      let any = false;
      for (let i = 0; i < xe; i++) if (px[(j * cv.width + i) * 4 + 3] > 127) { any = true; break; }
      has.push(any);
    }
    let j0 = -1, j1 = -1;
    for (let j = 0; j < has.length; j++) if (has[j]) { if (j0 < 0) j0 = j; j1 = j; }
    for (let j = 0; j < cv.height; j++) {
      if (!has[j]) { rows.push(null); continue; }
      const t = (j - j0) / Math.max(1, j1 - j0);
      let w = HEADON[HEADON.length - 1][1];
      for (let q = 1; q < HEADON.length; q++) if (t <= HEADON[q][0]) { const a = HEADON[q - 1], b = HEADON[q]; w = a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); break; }
      rows.push({ w });
    }
    return (cache[key] = { canvas: cv, ox, oy, scale: dpr, rows });
  }
  // a line drawing of the hull at length L, baked once per argument set: each part (cols.top / hull / mid / nose) is the outer contour of the union of its polygons, nearer parts hide the lines behind them; the prow joins the nose, the collar ring is outlined in cols.hull
  // { canvas (dpr pixels), w, h, ox, oy (css px; the hull origin in the canvas), stern, tip, top, bottom (css px from the origin), ring }
  const bpCache = {};
  function blueprint(L, dpr, cols, lw) {
    lw = lw || 1;
    const key = [L, dpr, lw, cols.top, cols.hull, cols.mid, cols.nose].join('|');
    if (bpCache[key]) return bpCache[key];
    const ship = { face: 1, thrustAmt: 0, flare: 0, strain: 0 };
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.scale(dpr, dpr); return [c, g]; };
    // the prow alone, to find where the nose really ends
    const pad = Math.ceil(2 * lw) + 2, wide = Math.ceil(2 * L), tall = Math.ceil(L);
    const [pc, pg] = mk(wide * dpr, tall * dpr);
    pg.translate(wide / 2, tall / 2); window.VoidshipArt.drawProw(pg, ship, L, 1, true); pg.setTransform(1, 0, 0, 1, 0, 0);
    const pd = pg.getImageData(0, 0, pc.width, pc.height).data;
    let tip = anchors.ring.fore * L, pt = anchors.top * L, pb = anchors.bottom * L;
    for (let y = 0; y < pc.height; y++) for (let x = 0; x < pc.width; x++) if (pd[(y * pc.width + x) * 4 + 3] > 8) {
      tip = Math.max(tip, (x + 1) / dpr - wide / 2); pt = Math.min(pt, y / dpr - tall / 2); pb = Math.max(pb, (y + 1) / dpr - tall / 2);
    }
    const ox = Math.ceil(-anchors.stern * L) + pad, oy = Math.ceil(-pt) + pad, w = ox + Math.ceil(tip) + pad, h = oy + Math.ceil(pb) + pad;
    const [cv, g] = mk(w * dpr, h * dpr), [sc, sg] = mk(w * dpr, h * dpr);
    // a polygon of the table as a closed path in canvas css px (drawRest's own transform, uniform scale)
    const path = (c, pts) => { c.beginPath(); pts.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](ox + L * hx(p[0]), oy + L * hy(p[1]))); c.closePath(); };
    const ext = (pts) => { let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity; for (const p of pts) { a = Math.min(a, L * hx(p[0])); b = Math.max(b, L * hx(p[0])); c = Math.min(c, L * hy(p[1])); d = Math.max(d, L * hy(p[1])); } return [b - a, d - c]; };
    // too small to read at this size: lights, facets, thin strips
    const keep = (pts) => { const [a, b] = ext(pts); return Math.max(a, b) >= 8 * lw && Math.min(a, b) >= 3 * lw; };
    ['top', 'hull', 'mid', 'nose'].forEach((part) => {
      const polys = OPS.filter((it) => it[2] === part && keep(it[0])).map((it) => it[0]);
      sg.clearRect(0, 0, w, h);
      sg.lineJoin = 'round'; sg.lineCap = 'round'; sg.lineWidth = 2 * lw; sg.strokeStyle = '#000'; sg.fillStyle = '#000';
      for (const p of polys) { path(sg, p); sg.stroke(); }
      if (part === 'nose') for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; sg.drawImage(pc, 0, 0, pc.width, pc.height, ox - wide / 2 + Math.cos(a) * lw, oy - tall / 2 + Math.sin(a) * lw, wide, tall); }
      sg.globalCompositeOperation = 'destination-out';
      for (const p of polys) { path(sg, p); sg.fill(); }
      if (part === 'nose') sg.drawImage(pc, 0, 0, pc.width, pc.height, ox - wide / 2, oy - tall / 2, wide, tall);
      // what is behind this part is hidden by it
      g.globalCompositeOperation = 'destination-out';
      for (const p of polys) { path(g, p); g.fill(); }
      if (part === 'nose') g.drawImage(pc, 0, 0, pc.width, pc.height, ox - wide / 2, oy - tall / 2, wide, tall);
      g.globalCompositeOperation = 'source-over';
      sg.globalCompositeOperation = 'source-in'; sg.fillStyle = cols[part]; sg.fillRect(0, 0, w, h); sg.globalCompositeOperation = 'source-over';
      g.drawImage(sc, 0, 0, sc.width, sc.height, 0, 0, w, h);
    });
    // the collar ring: the band's trapezoid on the big ship (L 590 at 640,330), cleared inside, then outlined
    const rp = [[868, 198], [920, 208], [920, 436], [868, 446]].map(([x, y]) => [ox + (x - 640) * L / 590, oy + (y - 330) * L / 590]);
    const ringPath = (c) => { c.beginPath(); rp.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](p[0], p[1])); c.closePath(); };
    g.globalCompositeOperation = 'destination-out'; ringPath(g); g.fill(); g.globalCompositeOperation = 'source-over';
    g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = cols.hull; ringPath(g); g.stroke();
    return (bpCache[key] = { canvas: cv, w, h, ox, oy, stern: anchors.stern * L, tip, top: pt, bottom: pb, ring: anchors.ring });
  }
  return { drawRest, tintRing, dressRing, stats, sprite, anchors, blueprint };
})();
