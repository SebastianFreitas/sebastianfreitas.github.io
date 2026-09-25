/* voidship-prow.js — paints the shard: a broken-off chunk of the giant
   metal Libertech built the ship around. Flat facets, light from the
   top-left. +x = nose, +y = down, every coordinate a fraction of L.
   Ember cracks running through the rust pulse and brighten with strain. */
(function () {
  const A = window.VoidshipArt; if (!A) return;
  const { clamp } = window.Util;
  const Paint = window.Paint;
  const { rgba, fillPoly, vol, seg, box, tracePts } = A;
  const C = A.COLORS;
  const RUST_TOP = [200, 80, 58], RUST_LIT = [176, 58, 46], RUST_MID = [134, 40, 34], RUST_FRONT = [104, 30, 30], RUST_SHADE = [92, 26, 24], RUST_DARK = [70, 18, 18], RUST_DEEP = [50, 12, 14], RUST_PALE = [214, 120, 70], EMBER = [255, 190, 110];

  const COLLAR = [[0.36, -0.13], [0.47, -0.13], [0.47, 0.15], [0.36, 0.15]];
  // the slab: the metal's own faces (top band, big side, bottom band)
  const SLAB_TOP = [[0.38, -0.16], [0.56, -0.175], [0.58, -0.205], [0.74, -0.19], [0.70, -0.13], [0.40, -0.115]];
  const SLAB_SIDE = [[0.40, -0.115], [0.70, -0.13], [0.64, 0.06], [0.40, 0.085]];
  const SLAB_BOTTOM = [[0.40, 0.085], [0.64, 0.06], [0.62, 0.125], [0.42, 0.15]];
  // the fracture: three facets converging on the ram tip
  const FR1 = [[0.74, -0.19], [0.98, -0.02], [0.82, -0.06], [0.70, -0.13]];
  const FR2 = [[0.70, -0.13], [0.82, -0.06], [0.98, -0.02], [0.80, 0.13], [0.72, 0.08], [0.64, 0.06]];
  const FR3 = [[0.64, 0.06], [0.72, 0.08], [0.80, 0.13], [0.74, 0.11], [0.70, 0.145], [0.62, 0.125]];
  const NOTCH_T = [[0.38, -0.16], [0.46, -0.165], [0.39, -0.10]];
  const NOTCH_B = [[0.42, 0.15], [0.50, 0.14], [0.42, 0.09]];
  const CRACKS = [[[0.70, -0.13], [0.82, -0.06], [0.98, -0.02]], [[0.64, 0.06], [0.72, 0.08], [0.80, 0.13]], [[0.40, -0.115], [0.70, -0.13]], [[0.40, 0.085], [0.64, 0.06]], [[0.56, -0.175], [0.58, -0.205]]];
  const EMBER_PTS = [[0.64, -0.03], [0.74, -0.075], [0.83, -0.035], [0.95, -0.022]];
  const EMBER_LOW = [[0.62, 0.04], [0.70, 0.095], [0.78, 0.115]];
  const EMBER_TAP = [[0.42, -0.005], [0.62, -0.03]];
  // the hull's jaws, painted over the slab so they grip it
  const JAW_T = [[0.32, -0.11], [0.42, -0.20], [0.56, -0.22], [0.54, -0.165], [0.44, -0.115]];
  const JAW_B = [[0.32, 0.115], [0.42, 0.19], [0.56, 0.21], [0.54, 0.155], [0.44, 0.12]];
  const FV_JAW_T = [[-0.11, -0.20], [0.11, -0.20], [0.11, -0.15], [-0.11, -0.15]];
  const FV_JAW_B = [[-0.11, 0.15], [0.11, 0.15], [0.11, 0.20], [-0.11, 0.20]];
  const FV_SHARD = [[0, -0.19], [0.06, -0.14], [0.08, -0.02], [0.055, 0.10], [0, 0.15], [-0.06, 0.10], [-0.08, -0.02], [-0.05, -0.14]];
  const FV_INNER = [[0, -0.09], [0.035, -0.02], [0, 0.06], [-0.035, -0.02]];

  function emberOf(ship, t) {
    const pulse = window.Util.reduced() ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.7);
    return clamp(0.30 + 0.35 * pulse + 0.30 * clamp(ship.strain || 0, 0, 1), 0, 1);
  }

  function drawProwBack(g, ship, L, t) {
    const ember = emberOf(ship, t);
    g.fillStyle = Paint.rad(g, 0.68 * L, -0.03 * L, 0, 0.28 * L, [[0, rgba(C.RED, 0.20 * ember)], [1, rgba(C.RED, 0)]]);
    g.fillRect(0.38 * L, -0.33 * L, 0.62 * L, 0.62 * L);
  }

  function drawProw(g, ship, L, t) {
    const dir = (ship.face || 1) >= 0 ? 1 : -1;
    const px = Math.max(1, 0.012 * L);
    const ember = emberOf(ship, t);

    // 1. collar
    fillPoly(g, COLLAR, L, rgba(C.DEEP, 1));

    // 2. slab faces
    fillPoly(g, SLAB_TOP, L, rgba(RUST_TOP, 1));
    fillPoly(g, SLAB_SIDE, L, rgba(RUST_MID, 1));
    fillPoly(g, SLAB_BOTTOM, L, rgba(RUST_SHADE, 1));

    // 3. fracture facets
    fillPoly(g, FR1, L, rgba(RUST_LIT, 1));
    fillPoly(g, FR2, L, rgba(RUST_FRONT, 1));
    fillPoly(g, FR3, L, rgba(RUST_DARK, 1));

    // 4. notches
    fillPoly(g, NOTCH_T, L, rgba(RUST_DEEP, 1));
    fillPoly(g, NOTCH_B, L, rgba(RUST_DEEP, 1));

    // 5. facet cracks
    for (const c of CRACKS) seg(g, c, L, rgba(RUST_DEEP, 0.9), px);

    // 6. flecks
    box(g, 0.52, -0.06, 0.535, -0.048, L, rgba(RUST_PALE, 0.8));
    box(g, 0.58, 0.02, 0.595, 0.032, L, rgba(RUST_PALE, 0.8));

    // 7. ember
    seg(g, EMBER_PTS, L, rgba(C.RED, 0.40 * ember), Math.max(1.5, 0.02 * L));
    seg(g, EMBER_PTS, L, rgba(EMBER, 0.85 * ember), px);
    seg(g, EMBER_LOW, L, rgba(C.RED, 0.6 * ember), px);
    seg(g, EMBER_TAP, L, rgba(EMBER, 0.5 * ember), px);

    // 8. jaws, painted over the slab so they grip it
    vol(g, JAW_T, L, rgba(C.MID, 1), rgba(C.SHADE, 1), dir);
    seg(g, [[0.42, -0.20], [0.56, -0.22]], L, rgba(C.EDGE, 0.8), px);
    vol(g, JAW_B, L, rgba(C.MID, 1), rgba(C.SHADE, 1), dir);
    seg(g, [[0.42, 0.19], [0.56, 0.21]], L, rgba(C.EDGE, 0.5), px);
    const bs = Math.max(1.5, 0.015 * L);
    for (const [bx, by] of [[0.46, -0.16], [0.46, 0.16]]) {
      g.fillStyle = rgba(C.WHITE, 0.7);
      g.fillRect(bx * L - bs / 2, by * L - bs / 2, bs, bs);
    }
  }

  function drawProwFront(g, ship, L, t) {
    const px = Math.max(1, 0.012 * L);
    const ember = emberOf(ship, t);

    // 1. rust shard
    Paint.litShade(g, () => tracePts(g, FV_SHARD, L), 0, rgba(RUST_LIT, 1), rgba(RUST_SHADE, 1));
    fillPoly(g, FV_INNER, L, rgba(RUST_MID, 1));
    seg(g, [[0, -0.19], [0, 0.15]], L, rgba(RUST_DEEP, 0.8), px);
    Paint.circle(g, 0, -0.02 * L, Math.max(2, 0.025 * L), rgba(C.RED, ember));
    Paint.circle(g, 0, -0.02 * L, Math.max(1, 0.011 * L), rgba(EMBER, ember));

    // 2. jaw guard plates
    Paint.litShade(g, () => tracePts(g, FV_JAW_T, L), 0, rgba(C.MID, 1), rgba(C.SHADE, 1));
    Paint.litShade(g, () => tracePts(g, FV_JAW_B, L), 0, rgba(C.MID, 1), rgba(C.SHADE, 1));
  }

  A.drawProwBack = drawProwBack; A.drawProw = drawProw; A.drawProwFront = drawProwFront; A.emberOf = emberOf; A.PROW = { SLAB_TOP, SLAB_SIDE, SLAB_BOTTOM, FR1, FR2, FR3, JAW_T, JAW_B };
})();
