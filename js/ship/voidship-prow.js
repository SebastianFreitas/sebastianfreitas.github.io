/* voidship-prow.js — paints the shard: a broken-off chunk of the giant
   metal Libertech built the ship around. Flat facets, light from the
   top-left. +x = nose, +y = down, every coordinate a fraction of L.
   Ember cracks running through the rust pulse and brighten with strain. */
(function () {
  const A = window.VoidshipArt; if (!A) return;
  const { clamp } = window.Util;
  const Paint = window.Paint;
  const { rgba, fillPoly, vol, seg, tracePts } = A;
  const C = A.COLORS;
  const RUST_HEAD = [128, 38, 36], RUST_TOP = [176, 138, 128], RUST_LIT = [142, 43, 39], RUST_MID = [192, 138, 114], RUST_FRONT = [104, 30, 30], RUST_SHADE = [87, 26, 30], RUST_DARK = [70, 18, 18], RUST_DEEP = [50, 12, 14], RUST_PALE = [230, 216, 200], RUST_EDGE = [164, 54, 48], EMBER = [255, 190, 110];


  // the blade: a knapped stone knife the hull was built round, seen side-on like a seax: a nearly straight spine, a chipped cutting edge
  // that rises in one long sweep to a sharp point near the spine's height; long flat planes run its length, one bevel band along the edge.
  // Two long slender side blades rise from the spine and rake back toward the hull
  // the profile below was drawn at the old size; M grows it about its centre line (1.5x deep, 1.19x long from the root at x 0.30) so the blade is the biggest mass
  const NX = (x) => 0.30 + (x - 0.30) * 1.19, NY = (y) => -0.0175 + (y + 0.0175) * 1.5, M = (pts) => pts.map((p) => [NX(p[0]), NY(p[1])]);
  const RIDGE = [[0.30, -0.0475], [0.60, -0.0475], [0.80, -0.06], [1.0, -0.075], [1.15, -0.088], [1.30, -0.105]];
  const lerpY = (pts, x) => { for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; if (x >= a[0] && x <= b[0]) return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return pts[pts.length - 1][1]; };
  // an edge is a base line (x ascending) with chips bitten into it: [x, width, depth, where the deepest point sits across the width (0 hull side .. 1 tip side)]; dir -1 bites up, 1 bites down
  const knap = (base, chips, dir) => { const o = [base[0]]; base.slice(1, -1).forEach((p) => o.push(p)); chips.forEach(([x, w, d, k]) => o.push([x, lerpY(base, x)], [x + k * w, lerpY(base, x + k * w) + dir * d], [x + w, lerpY(base, x + w)])); o.push(base[base.length - 1]); return o.sort((a, b) => a[0] - b[0]); };
  // the spine falls steadily and a little unevenly from the ring (y -0.171) to the tip (y -0.105), with six chips bitten DOWN out of it (none under a slab's feet)
  const SP0 = NY(-0.12), SP1 = -0.105, SPINE = (x) => SP0 + (x - 0.30) * (SP1 - SP0) / (1.30 - 0.30);
  // (v18: runs of very different lengths on different slopes, one deep bite between the slabs, one barely there near the tip, one medium near the tip; level at both slabs' feet)
  const SPB = [[0.30, SP0], [0.46, SPINE(0.46) - 0.010], [0.52, SPINE(0.52)], [0.62, SPINE(0.62)], [0.80, SPINE(0.80) + 0.006], [0.86, SPINE(0.86)], [1.03, SPINE(1.03)], [1.12, SPINE(1.12) - 0.008], [1.20, SPINE(1.20) + 0.004], [1.30, SP1]];
  // (v29: the top edge's breaks are baby slabs: four tiny flat-topped stubs (up) and square notches (down) with near-vertical sides, [x, width, height up (negative = notch)], all different)
  const SYS = (x) => lerpY(SPB, x);
  const TOP_BITS = [[0.49, 0.028, -0.020], [0.765, 0.021, 0.040], [1.035, 0.042, -0.028], [1.17, 0.016, 0.024]];
  const TOP_EDGE = SPB.concat(...TOP_BITS.map(([x, w, h]) => [[x, SYS(x)], [x + 0.001, SYS(x) - h], [x + w - 0.001, SYS(x + w) - h + 0.002], [x + w, SYS(x + w)]])).sort((a, b) => a[0] - b[0]);
  // the cutting edge is one long shallow curve from the hull to the tip: five straight knapped cuts of different lengths, each a little steeper than the last, with two small chips far apart
  // (v16: three long straight cuts, 21.8 / 10.8 / 2.7 degrees, meeting at two shallow corners; the longest runs from the tip back past the small slab; deepest at the hull;
  // one long shallow flake break toward the hull, steep on its hull end and feathered on the other)
  // (v17: the rear corner is a little stronger, and the broken flake is twice as deep, 0.05, with a steep hull wall and a long feathered run)
  // (v26: the stone reaches the ring's lower rim: a rough lump of three short cuts at the ring, a step up to a ledge, then the long run to the tip in cuts of very different lengths)
  // (v27: the body is a slab lying on its side, like the tall one: a foot filling the ring (hidden behind it, never past its lower rim), a sweep up in three cuts into an even shaft
  // 0.17 deep, a swell to 0.20 over the last 0.12 and a flat cut end a few degrees off vertical; the underside is a few straight cuts and one small chip)
  // (v28: mined mineral under a natural top: v26's lump, ledge and straight cuts below, v27's long faces in a band 0.09 deep under the top edge, ending in a flat cut face 0.09 tall;
  // the lump stops inside the ring's lower rim (0.165) and starts at the ring, not on the hull side; the cuts rise to the cut face's bottom corner)
  const CUT_BASE = [[0.30, 0.06], [0.395, 0.07], [0.405, 0.145], [0.43, 0.157], [0.50, 0.160], [0.53, 0.138], [0.66, 0.150], [0.90, 0.075], [1.05, 0.030], [1.292, -0.015]];
  const CUT_EDGE = knap(CUT_BASE, [[0.68, 0.15, 0.025, 0.12]], -1).reverse();
  // (v26: no single ridge runs from the ring to the tip: the crest is four short ridges meeting at angles, one dropping toward the ring's lower half, one from the tall slab's foot
  // dropping toward the tip, one rising under the small slab, one running out to the tip; big flake scars of different reds meet along and across it)
  // (v27: long narrow faces run from the ring to the cut end like the tall slab's run up its height: top, two sides, a shadowed lower face, an end cap; short ridges grow under the slabs' feet)
  const BODY = TOP_EDGE.concat(CUT_EDGE);
  const EDGE_ASC = CUT_EDGE.slice().reverse();
  const run = (pts, a, b) => [[a, lerpY(pts, a)]].concat(pts.filter((p) => p[0] > a && p[0] < b), [[b, lerpY(pts, b)]]);
  const band = (up, lo, a, b) => run(up, a, b).concat(run(lo, a, b).reverse());
  // the natural top band: long faces at depths (below the spine) that wander a little; the last line BL is the band's floor, 0.09 deep, and the mined facets bite up through it at three places
  const LINE = (offs) => offs.map(([x, o]) => [x, SPINE(x) + o]);
  const LA = LINE([[0.30, 0.030], [0.46, 0.036], [0.60, 0.028], [0.75, 0.034], [0.90, 0.026], [1.10, 0.032], [1.292, 0.030]]);
  const LB = LINE([[0.30, 0.058], [0.46, 0.052], [0.62, 0.060], [0.80, 0.054], [1.02, 0.062], [1.15, 0.056], [1.292, 0.060]]);
  const BL = LINE([[0.30, 0.090], [0.46, 0.086], [0.62, 0.092], [0.80, 0.088], [1.0, 0.093], [1.15, 0.087], [1.292, 0.090]]);
  const BITES = [[0.49, 0.515, 0.57, 0.050], [0.72, 0.80, 0.855, 0.056], [1.07, 1.095, 1.165, 0.060]];
  const MB = BL.filter((p) => !BITES.some((n) => p[0] > n[0] && p[0] < n[2])).concat(...BITES.map(([a, p, b, o]) => [[a, lerpY(BL, a)], [p, SPINE(p) + o], [b, lerpY(BL, b)]])).sort((a, b) => a[0] - b[0]);
  const mined = (a, b, c, d) => run(MB, a, b).concat(run(EDGE_ASC, c, d).reverse());
  const TY =lerpY(TOP_EDGE, 1.30);
  const FACETS = [
    [band(TOP_EDGE, LA, 0.30, 1.292), RUST_LIT],
    [band(LA, LB, 0.30, 1.292), RUST_HEAD],
    [band(LB, BL, 0.30, 1.292), RUST_FRONT],
    [mined(0.30, 0.38, 0.30, 0.34), RUST_DARK],
    [mined(0.38, 0.41, 0.34, 0.41), RUST_SHADE],
    [mined(0.41, 0.52, 0.41, 0.53), RUST_DEEP],
    [mined(0.52, 0.80, 0.53, 0.794), RUST_SHADE],
    [mined(0.80, 0.93, 0.794, 0.984), RUST_DEEP],
    [mined(0.93, 1.05, 0.984, 1.124), RUST_SHADE],
    [mined(1.05, 1.292, 1.124, 1.292), RUST_DARK],
    [[[1.30, TY], [1.2965, -0.055], [1.292, -0.015], [1.280, -0.018], [1.2835, -0.058], [1.289, TY + 0.004]], RUST_EDGE],
    [[[0.57, lerpY(TOP_EDGE, 0.57)], [0.68, lerpY(TOP_EDGE, 0.68)], [0.645, lerpY(TOP_EDGE, 0.645) + 0.075], [0.59, lerpY(TOP_EDGE, 0.59) + 0.05]], RUST_HEAD],
    [[[0.905, lerpY(TOP_EDGE, 0.905)], [0.975, lerpY(TOP_EDGE, 0.975)], [0.95, lerpY(TOP_EDGE, 0.95) + 0.06], [0.915, lerpY(TOP_EDGE, 0.915) + 0.045]], RUST_HEAD]
  ];
  // (v29: the underside once had spikes like the top; they snapped off when the stone was mined, leaving three short stumps built like the tall slab turned downward: near-vertical sides,
  // long narrow faces a step darker (in shadow), a small footing, and a flat or slanted break face with a narrow lighter cap; one has a broken corner. xl, width, length, break slant, taper at the bottom [left, right], broken corner)
  const UY = (x) => lerpY(EDGE_ASC, x);
  // (v30: the stumps sweep toward the tip: straight parallel sides along an axis ang radians off straight down, no flare, no curve; len is the left side's length along the axis)
  // (v31: the stumps are level: axis exactly horizontal, pointing to the tip; the underside rises toward the tip so each leaves it at its foot and juts forward with dark space above; th is the thickness, the top face is the lit one)
  // (v32: slim level blades: a short foot at the hull end only, then the blade runs free, top edge level, bottom edge narrowing to two thirds, a slanted snapped end and chips bitten up out of the bottom; chips: [x offset, width, depth])
  // (v33: no posts: the underside itself carries on forward as a level prong from each facet corner xa, where it steps up; the bottom is level at the underside's lowest line there, the top starts at the corner
  // and slopes down a few degrees to a slanted snapped end; the root is filled in the mass's own facet colours (cb behind the corner, cf from it on) so there is no seam; chips bitten up out of the bottom: [x offset, width, depth])
  function stump(xa, len, t0, te, slant, cb, cf, chips) {
    const ya = UY(xa), yb = ya + t0, xe = xa + len;
    const yt = (x) => ya + (t0 - te) * (x - xa) / len;
    let x0 = xa; while (x0 > 0.4 && UY(x0) < yb) x0 -= 0.002;
    const low = [];
    chips.slice().reverse().forEach(([o, w, d]) => low.push([xa + o + w, yb], [xa + o + w * 0.4, yb - d], [xa + o, yb]));
    const strip = (h) => [[xa, ya], [xe, yt(xe)], [xe, yt(xe) + h], [xa, ya + h]];
    return [[run(EDGE_ASC, x0, xa).concat([[xa, yb], [x0, yb]]), cb],
      [[[xa, ya], [xe, yt(xe)], [xe + slant, yb]].concat(low, [[xa, yb]]), cf],
      [strip(0.007), RUST_HEAD]];
  }
  const STUMPS = [].concat(stump(0.794, 0.157, 0.040, 0.023, 0.008, RUST_SHADE, RUST_DEEP, [[0.05, 0.03, 0.005]]), stump(0.984, 0.086, 0.029, 0.018, -0.006, RUST_DEEP, RUST_SHADE, []), stump(1.124, 0.121, 0.035, 0.022, 0.006, RUST_SHADE, RUST_DARK, [[0.06, 0.026, 0.004]]));
  // side blades: broad flat slabs of the same stone standing straight up from the sloping spine. Each long side is 5 straight segments of small angle changes plus one flake bite
  // (L, R: [height fraction, inset in widths]), so the slab tapers a little and its sides are neither parallel nor mirrored. Flat tip cut slanted (higher at the back), a slightly lighter bevel
  // on the cut, a small stepped shoulder at each foot (hull side larger), and three planes (lit, mid, shadow) with crooked boundaries (B: [foot fraction, [height fraction, width fraction]..., tip fraction])
  // that carry on into the nose's own planes (sc: flake scars on the face, points as [fraction of width, height above the foot], colour)
  // (flat: no foot flare or step on the tip side, so that edge is one straight line into the spine)
  function slab(xl, xr, yb, h, L, R, slant, sc, B, lean, flat) {
    const w = xr - xl, yt = yb - h, s = (x) => lerpY(TOP_EDGE, x);
    const lp = L.map(([t, o]) => [xl + o * w, yb - t * h]), rp = R.map(([t, o]) => [xr - o * w, yb - t * h]);
    const tl = lp[lp.length - 1], tr = rp[rp.length - 1];
    tl[1] = yt; tr[1] = yt + (tr[0] - tl[0]) * slant;
    const ty = (x) => yt + (x - tl[0]) * slant, tx = (f) => tl[0] + f * (tr[0] - tl[0]);
    const bL = [[xl - 0.02, s(xl - 0.02) + 0.01], [xl - 0.015, s(xl - 0.015) - 0.014], [xl, s(xl) - 0.04]], bR = [[xr, s(xr) - 0.025], [xr + 0.008, s(xr + 0.008) - 0.014], [xr + 0.022, s(xr + 0.022) + 0.01]];
    if (flat > 1) { bL.length = 0; bL.push([xl - 0.012, s(xl - 0.012) + 0.004], [xl, s(xl) - 0.02]); }   // the small slab's foot has no mound
    if (flat) { const fx = xr - (flat === true ? 0.19 : 0.061) * w; bR.length = 0; bR.push([fx, s(fx) + 0.012]); }
    const left = bL.concat(lp), right = [bR[0]].concat(rp);
    const xAt = (c, y) => { for (let i = 0; i < c.length - 1; i++) if (y <= c[i][1] && y >= c[i + 1][1]) return c[i][0] + (c[i + 1][0] - c[i][0]) * (c[i][1] - y) / (c[i][1] - c[i + 1][1]); return c[c.length - 1][0]; };
    const bnd = (b) => [[xl + b[0] * w, s(xl + b[0] * w) + 0.012]].concat(b.slice(1, -1).map(([t, f]) => { const y = yb - t * h, a = xAt(left, y); return [a + f * (xAt(right, y) - a), y]; }), [[tx(b[b.length - 1]), ty(tx(b[b.length - 1]))]]);
    const out = [[left.concat(rp.slice().reverse(), bR), RUST_FRONT],
      [left.concat(bnd(B[1]).reverse()), RUST_HEAD],
      [left.concat(bnd(B[0]).reverse()), RUST_LIT],
      [[tl, tr, [tr[0] - 0.003, tr[1] + (flat > 1 ? 0.016 : 0.012)], [tl[0] + 0.002, tl[1] + (flat > 1 ? 0.016 : 0.012)]], RUST_EDGE]]
      .concat(sc.map(([pts, c]) => [pts.map((p) => [xl + p[0] * w, yb - p[1]]), c]));
    // lean toward the tip: shear about the foot so the foot stays seated on the spine
    return lean ? out.map(([pts, c]) => [pts.map((p) => [p[0] + Math.max(0, yb - p[1]) * lean, p[1]]), c]) : out;
  }
  // tall one 0.52 high and about 0.11 wide at mid-height, short one 0.16 high and about 0.058 wide and leaning about 12 degrees toward the tip, their tips cut at different slants; one bite each, on opposite sides at different heights
  const SLAB_T = slab(0.5722, 0.6778, SPINE(0.70) + 0.012, 0.47, [[0.10, 0.12], [0.16, 0.31], [0.27, 0.385], [0.30, 0.43], [0.33, 0.38], [0.55, 0.375], [0.66, 0.39], [0.79, 0.38], [0.88, 0.36], [0.94, 0.23], [1, 0.08]], [[0.12, 0.21], [0.40, 0.205], [0.72, 0.21], [0.86, 0.195], [1, 0.18]], 0,
    [[[[0.43, 0.30], [0.47, 0.345], [0.50, 0.325], [0.48, 0.26], [0.45, 0.22]], RUST_FRONT], [[[0.50, 0.40], [0.60, 0.425], [0.58, 0.385]], RUST_LIT], [[[0.67, 0.03], [0.77, 0.03], [0.785, 0.19], [0.78, 0.34], [0.805, 0.456], [0.72, 0.456]], RUST_SHADE]], [[0.30, [0.3, 0.316], [0.65, 0.36], 0.40], [0.78, [0.3, 0.738], [0.65, 0.693], 0.64]], 0, true);
  const SLAB_S = (slab(0.9055, 0.9745, SPINE(1.005) + 0.012, 0.16,[[0.22, 0.01], [0.40, 0.04], [0.58, 0.06], [1, 0.10]], [[0.15, 0.03], [0.30, 0.07], [0.40, 0.11], [0.45, 0.22], [0.52, 0.13], [0.75, 0.15], [0.89, 0.13], [1, 0.14]], 0.08,
      [[[[0.52, 0.037], [0.64, 0.056], [0.74, 0.048], [0.66, 0.033]], RUST_FRONT]], [[0.32, [0.30, 0.40], [0.65, 0.34], 0.42], [0.70, [0.35, 0.74], [0.70, 0.69], 0.72]], 0.21, 2));
  const SPURS = SLAB_T.concat(SLAB_S);
  // the lit catches only a broken, dim line on the spine and the ridge, a short glint on a facet edge each
  const GLINTS = [[M([[0.35, -0.107], [0.43, -0.107]]), RUST_MID, 0.5]];
  const REST_EMBER = [[0.97, -0.0549], [1.02, -0.0658]];   // a short ember inside the lit face
  const KY0 = -0.12, KY1 = 0.085, KX0 = 0.30;   // the hull's seat at the blade's root, late in the turn

  const ease = (v) => v * v * (3 - 2 * v);   // smoothstep: the rest-art detail and the tip change blend over several frames

  function emberOf(ship, t) {
    const pulse = window.Util.reduced() ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.7);
    return clamp(0.30 + 0.35 * pulse + 0.30 * clamp(ship.strain || 0, 0, 1), 0, 1);
  }

  function drawProwBack(g, ship, L, t) {
    const ember = emberOf(ship, t);
    g.fillStyle = Paint.rad(g, 0.86 * L, -0.01 * L, 0, 0.30 * L, [[0, rgba(C.RED, 0.20 * ember)], [1, rgba(C.RED, 0)]]);
    g.fillRect(0.38 * L, -0.33 * L, 0.90 * L, 0.62 * L);
  }

  function drawProw(g, ship, L, t) {
    const dir = (ship.face || 1) >= 0 ? 1 : -1;
    const px = Math.max(1, 0.012 * L);
    const ember = emberOf(ship, t);
    // the far half of the ring, then the blade running back into the hull (facets and side blades) and the ember, then the ring's near half
    ring(g, L, 1, 0, () => {
      fillPoly(g, BODY, L, rgba(RUST_LIT, 1));
      FACETS.forEach(([pts, c]) => fillPoly(g, pts, L, rgba(c, 1)));
      SPURS.forEach(([pts, c]) => fillPoly(g, pts, L, rgba(c, 1)));
      GLINTS.forEach(([pts, c, a]) => seg(g, pts, L, rgba(c, a), px));
      seg(g, REST_EMBER, L, rgba(C.RED, 0.2 * ember), Math.max(1.5, 0.016 * L));
      seg(g, REST_EMBER, L, rgba(EMBER, 0.45 * ember), px);
      // the hull's plating overlaps the stone's root in three uneven steps (top longest, belly shortest); a dark seam where metal meets stone;
      // the gap between the middle and lower steps shows the stone running on underneath
      PLATES.forEach(([pts, c]) => fillPoly(g, pts, L, rgba(c, 1)));
      seg(g, MY([[0.30, -0.12], [0.40, -0.12]]), L, rgba(C.EDGE, 1), px);
      SEAMS.forEach((pts) => seg(g, pts, L, rgba(C.DEEP, 1), Math.max(1.5, 0.013 * L)));
    });
  }

  const MY = (pts) => pts.map((p) => [p[0], NY(p[1])]);   // the root grows deeper with the blade: same steps, rows scaled
  const PLATES = [
    [MY([[0.30, -0.13], [0.40, -0.13], [0.395, -0.085], [0.30, -0.085]]), C.LIT],
    [MY([[0.30, -0.085], [0.372, -0.085], [0.366, -0.03], [0.30, -0.03]]), C.MID],
    [MY([[0.30, 0.0], [0.346, 0.0], [0.338, 0.10], [0.30, 0.10]]), C.SHADE]
  ];
  const SEAMS = [MY([[0.40, -0.13], [0.395, -0.085], [0.372, -0.085], [0.366, -0.03], [0.30, -0.03]]), MY([[0.30, 0.0], [0.346, 0.0], [0.338, 0.10]])];
  // long thin braces from the hull forward along the stone, uneven; each a line on the blade's surface (radius BR, angle on the near half)
  const BR = 0.15, BRACES = [[NY(-0.10), 0.43, C.LIT], [NY(-0.045), 0.43, C.MID], [NY(0.04), 0.43, C.SHADE]];

  // the ring: one 3D hoop round the blade, between the tip and the hull. u along the blade axis, r/phi round it;
  // screen x = u*c + r*cos(phi)*s, y = YM + r*sin(phi): yaw leaves y alone. Far half (cos phi > 0) paints, then the blade passes through, then the near half.
  const YM = -0.015;
  const RING_U = 0.43, RING_W = 0.06, RING_RO = 0.18, RING_RI = 0.17, RING_N = 32;
  function ring(g, L, c, s, blade, hole) {
    const px = Math.max(1, 0.012 * L), PI2 = Math.PI * 2, N = RING_N, cy = Math.sqrt(Math.max(0, 1 - s * s)), u0 = RING_U - RING_W * cy / 2, u1 = RING_U + RING_W * cy / 2, ro = RING_RO, ri = RING_RI;
    const P = (u, r, p) => [u * c + r * Math.cos(p) * s, YM + r * Math.sin(p)];
    const poly = (pts, col) => { g.beginPath(); pts.forEach((q, k) => k ? g.lineTo(q[0] * L, q[1] * L) : g.moveTo(q[0] * L, q[1] * L)); g.closePath(); g.fillStyle = rgba(col, 1); g.fill(); };
    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const ramp = (l) => { const v = clamp((l + 0.8) / 1.6, 0, 1); return v < 0.5 ? mix(C.SHADE, C.MID, 2 * v) : mix(C.MID, C.LIT, 2 * v - 1); };
    const far = [], near = [];
    for (let k = 0; k < N; k++) {
      const pa = PI2 * k / N, pb = PI2 * (k + 1) / N, pm = (pa + pb) / 2, cs = Math.cos(pm), l = -Math.sin(pm) * 0.8 - cs * s * 0.5;
      const side = () => poly([P(u1, ri, pa), P(u1, ro, pa), P(u1, ro, pb), P(u1, ri, pb)], mix(ramp(0.1 - Math.sin(pm) * 0.7 * s * s), C.SHADE, 0.2));
      if (cs > 0) {
        far.push({ d: cs * c, fn: () => poly([P(u0, ri, pa), P(u1, ri, pa), P(u1, ri, pb), P(u0, ri, pb)], mix(ramp(-l), C.DEEP, 0.35)) });
        far.push({ d: cs * c - 10, fn: side });
      } else {
        near.push({ d: cs * c, fn: side });
        near.push({ d: cs * c, fn: () => poly([P(u0, ro, pa), P(u1, ro, pa), P(u1, ro, pb), P(u0, ro, pb)], ramp(l)) });
        if (k % 4 === 2) near.push({ d: cs * c - 10, fn: () => { const q = P(RING_U, ro + 0.003, pm); g.beginPath(); g.arc(q[0] * L, q[1] * L, px * 0.8, 0, PI2); g.fillStyle = rgba(C.EDGE, 1); g.fill(); } });
      }
    }
    // the braces wrap with the yaw like the ring: only on the near side, over the ring, running forward along the stone
    for (const [by, ue, col] of BRACES) {
      const sn = (by - YM) / BR, cs = -Math.sqrt(1 - sn * sn);
      near.push({ d: -100, fn: () => seg(g, [[0.34 * c + BR * cs * s, by], [ue * c + BR * cs * s, by]], L, rgba(col, 1), Math.max(1.5, 0.014 * L)) });
    }
    const byDepth = (x, y) => y.d - x.d;
    far.sort(byDepth); near.sort(byDepth);
    if (hole > 0) { g.beginPath(); g.ellipse(RING_U * c * L, YM * L, ri * s * L, ri * L, 0, 0, PI2); g.fillStyle = rgba(C.SHADE, hole); g.fill(); }   // late in the turn the hole backs onto hull metal, never the sky
    for (const it of far) it.fn();
    if (blade) blade();
    for (const it of near) it.fn();
  }

  // mid-turn: the knife as one solid. The rest art itself (body, facets, slabs, stubs) is projected with the turn, screen x = x*c + k*z*s,
  // k = -1 the near face, +1 the far face; z is the half thickness across the ship at that point: a fat lump filling the ring, thinning to a narrow flat tip,
  // and thin fins (about half their side-view width) for the slabs and stubs. Only x moves: every part keeps its rest rows.
  const ZB = [[0.30, 0.15], [0.43, 0.17], [0.50, 0.13], [0.86, 0.07], [1.292, 0.025]];
  const FINS = [[0.54, 0.72, 0.027], [0.755, 0.795, 0.005], [0.88, 1.02, 0.017], [1.16, 1.195, 0.004]];   // [x from, x to, half thickness]: tall slab, stub, small slab, stub
  const zOf = (x, y) => {
    const xc = clamp(x, 0.30, 1.292), dy = y - YM;
    const zb = Math.min(lerpY(ZB, xc), Math.sqrt(Math.max(0, (RING_RI + 0.003) * (RING_RI + 0.003) - dy * dy)));   // never wider than the ring's hole, at any x
    const f = FINS.find((q) => x >= q[0] && x <= q[1]);
    return f ? f[2] + (zb - f[2]) * ease(clamp((y - (SYS(clamp(x, 0.30, 1.30)) - 0.004)) / 0.014, 0, 1)) : zb;
  };
  // edges cut into short steps so z can vary along them
  const dense = (pts, open) => { const o = [], n = pts.length; for (let i = 0; i < (open ? n - 1 : n); i++) { const a = pts[i], b = pts[(i + 1) % n], m = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / 0.012)); for (let j = 0; j < m; j++) o.push([a[0] + (b[0] - a[0]) * j / m, a[1] + (b[1] - a[1]) * j / m]); } if (open) o.push(pts[pts.length - 1]); return o; };
  const DB = dense(BODY), DF = FACETS.map(([p, col]) => [dense(p), col]), DT = SLAB_T.map(([p, col]) => [dense(p), col]), DS = SLAB_S.map(([p, col]) => [dense(p), col]);
  const DPL = PLATES.map(([p, col]) => [dense(p), col]), DSE = SEAMS.map((p) => dense(p, true)), DGL = GLINTS.map(([p, col, a]) => [dense(p, true), col, a]), DEM = dense(REST_EMBER, true);

  function drawProwTurn(g, ship, L, t, turn) {
    const px = Math.max(1, 0.012 * L);
    const ember = emberOf(ship, t);
    const s = turn.s, c = turn.c, yw = Math.atan2(s, c);
    const w = 1 - ease(clamp(s / 0.6, 0, 1));            // rest-art detail (plates, glints, ember) shrinks with the angle
    const sm = (v) => ease(clamp(v, 0, 1));
    const face = (pts, k) => pts.map((p) => [p[0] * c + k * zOf(p[0], p[1]) * s, p[1]]);
    // the solid's side walls: every outline edge swept from the near face to the far face, as one path (no seams)
    const solid = (outline, col) => {
      const near = face(outline, -1), far = face(outline, 1);
      fillPoly(g, far, L, rgba(col, 1));
      g.beginPath();
      for (let i = 0; i < outline.length; i++) {
        const j = (i + 1) % outline.length, q = [near[i], near[j], far[j], far[i]];
        let ar = 0; for (let k = 0; k < 4; k++) { const u = q[k], v = q[(k + 1) % 4]; ar += u[0] * v[1] - v[0] * u[1]; }
        if (ar < 0) q.reverse();
        q.forEach((p, k) => k ? g.lineTo(p[0] * L, p[1] * L) : g.moveTo(p[0] * L, p[1] * L));
        g.closePath();
      }
      g.fillStyle = rgba(col, 1); g.fill();
    };
    const stone = () => {
      // head-on the ring's hole is stone all round: the lump's own dark fills the round above and below the cut outline
      const fa = sm((yw - 1.0) / 0.3);
      if (fa > 0) { g.beginPath(); g.ellipse(RING_U * c * L, YM * L, RING_RI * s * L, RING_RI * L, 0, 0, Math.PI * 2); g.fillStyle = rgba(RUST_DARK, fa); g.fill(); }
      solid(DB, RUST_SHADE);
      fillPoly(g, face(DB, -1), L, rgba(RUST_LIT, 1));
      DF.forEach(([p, col]) => fillPoly(g, face(p, -1), L, rgba(col, 1)));
      // the flat tip: a narrow upright face that comes round to meet the eye
      { const xt = 1.292, y0 = lerpY(TOP_EDGE, 1.30), y1 = -0.015, zt = zOf(xt, y0 + 0.01) * s;
        if (zt * L > 0.5) fillPoly(g, [[xt * c - zt, y0], [xt * c + zt, y0], [xt * c + zt, y1], [xt * c - zt, y1]], L, rgba(RUST_EDGE, 1)); }
      // the tall slab, then the small one in front of it
      solid(DT[0][0], RUST_DARK); DT.forEach(([p, col]) => fillPoly(g, face(p, -1), L, rgba(col, 1)));
      solid(DS[0][0], RUST_SHADE); DS.forEach(([p, col]) => fillPoly(g, face(p, -1), L, rgba(col, 1)));
      if (w > 0.02) {
        DGL.forEach(([p, col, a]) => seg(g, face(p, -1), L, rgba(col, a * w), px));
        seg(g, face(DEM, -1), L, rgba(C.RED, 0.2 * ember * w), Math.max(1.5, 0.016 * L));
        seg(g, face(DEM, -1), L, rgba(EMBER, 0.45 * ember * w), px);
        DPL.forEach(([p, col]) => fillPoly(g, face(p, -1), L, rgba(col, w)));
        DSE.forEach((p) => seg(g, face(p, -1), L, rgba(C.DEEP, w), Math.max(1.5, 0.013 * L)));
      }
    };
    // late in the turn the hull draws in from the blade's base: a solid seat of hull metal fills what would be a black slot, then narrows away with the hull
    { const wd = 0.055 * sm((yw - 1.32) / 0.1) * (1 - sm((yw - 1.44) / 0.08)); if (wd > 0.001) { g.fillStyle = rgba(C.SHADE, 1); g.fillRect((KX0 * c - wd) * L, KY0 * L, (wd + 0.02) * L, (KY1 - KY0) * L); } }
    ring(g, L, c, s, stone, sm((yw - 1.38) / 0.08));
  }

  A.drawProwBack = drawProwBack; A.drawProw = drawProw; A.drawProwTurn = drawProwTurn; A.emberOf = emberOf; A.PROW = { BODY, FACETS, SPURS, RIDGE };
})();
