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
  const RUST_TOP = [176, 138, 128], RUST_LIT = [142, 43, 39], RUST_MID = [192, 138, 114], RUST_FRONT = [104, 30, 30], RUST_SHADE = [87, 26, 30], RUST_DARK = [70, 18, 18], RUST_DEEP = [50, 12, 14], RUST_PALE = [230, 216, 200], EMBER = [255, 190, 110];


  // the blade: a heavy slab, nearly full depth to a hard-clipped tanto point; straight spine, hooked belly
  const UPPER = [[0.30, -0.12], [0.96, -0.12], [1.14, -0.01], [0.30, -0.01]];
  const LOWER = [[0.30, -0.01], [1.14, -0.01], [1.02, 0.085], [0.90, 0.085], [0.86, 0.06], [0.82, 0.085], [0.72, 0.085], [0.68, 0.065], [0.64, 0.085], [0.30, 0.085]];
  const CLIP = [[0.96, -0.12], [1.14, -0.01], [0.99, -0.01]];
  const GRIND = [[0.34, -0.01], [1.14, -0.01]];
  const EMBER_PTS = [[0.70, 0.035], [0.86, 0.03], [1.0, 0.02]];
  // the hull's claws wrap forward over the blade root and bite into it
  const JAW_T = [[0.30, -0.12], [0.38, -0.19], [0.56, -0.195], [0.62, -0.17], [0.67, -0.085], [0.60, -0.075], [0.55, -0.12]];
  const JAW_B = [[0.30, 0.085], [0.38, 0.165], [0.56, 0.17], [0.62, 0.135], [0.67, 0.045], [0.60, 0.04], [0.55, 0.085]];
  const FV_SHARD = [[0, -0.27], [0.07, -0.17], [0.07, 0.10], [0, 0.21], [-0.07, 0.10], [-0.07, -0.17]];
  const FV_INNER = [[0, -0.09], [0.05, -0.02], [0, 0.07], [-0.05, -0.02]];


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
    // 1. blade, running back into the hull: lit upper facet, darker lower facet
    fillPoly(g, UPPER, L, rgba(RUST_LIT, 1));
    fillPoly(g, LOWER, L, rgba(RUST_SHADE, 1));
    fillPoly(g, CLIP, L, rgba(RUST_TOP, 1));
    seg(g, [[0.96, -0.12], [1.14, -0.01]], L, rgba(RUST_PALE, 0.9), px);
    seg(g, [[0.30, -0.12], [0.96, -0.12]], L, rgba(RUST_MID, 1), px);
    seg(g, GRIND, L, rgba(RUST_PALE, 0.9), px);

    // 2. ember
    seg(g, EMBER_PTS, L, rgba(C.RED, 0.35 * ember), Math.max(1.5, 0.016 * L));
    seg(g, EMBER_PTS, L, rgba(EMBER, 0.7 * ember), px);

    // 3. claws in the hull's metal, in front of the blade, with clamp bands
    vol(g, JAW_T, L, rgba(C.LIT, 1), rgba(C.MID, 1), dir);
    vol(g, JAW_B, L, rgba(C.LIT, 1), rgba(C.MID, 1), dir);
    seg(g, [[0.30, -0.12], [0.38, -0.19], [0.56, -0.195], [0.62, -0.17]], L, rgba(C.EDGE, 0.8), px);
    for (const [x0, x1] of [[0.40, 0.43], [0.47, 0.50], [0.54, 0.57]]) {
      box(g, x0, -0.18, x1, 0.15, L, rgba(C.DEEP, 1));
      box(g, x0, -0.18, x0 + 0.008, 0.15, L, rgba(C.EDGE, 0.6));
    }
  }

  function drawProwFront(g, ship, L, t, tall) {
    const px = Math.max(1, 0.012 * L);
    const ember = emberOf(ship, t);

    // tall = 1 head-on; less mid-turn, squashed about the blade's centre line
    g.save(); g.translate(0, -0.017 * L); g.scale(1, tall || 1); g.translate(0, 0.017 * L);
    // 1. the clamps either side, edge-on
    for (const sx of [-1, 1]) {
      const x0 = sx > 0 ? 0.06 : -0.12, x1 = sx > 0 ? 0.12 : -0.06;
      box(g, x0, -0.18, x1, 0.15, L, rgba(sx > 0 ? C.SHADE : C.MID, 1));
      box(g, x0, -0.10, x1, -0.07, L, rgba(C.DEEP, 1));
      box(g, x0, 0.03, x1, 0.06, L, rgba(C.DEEP, 1));
    }
    // 2. the blade seen edge-on: a tall narrow wedge with a hard centre edge
    Paint.litShade(g, () => tracePts(g, FV_SHARD, L), 0, rgba(RUST_LIT, 1), rgba(RUST_SHADE, 1));
    seg(g, [[0, -0.27], [0, 0.21]], L, rgba(RUST_PALE, 0.9), px);
    g.restore();
  }

  A.drawProwBack = drawProwBack; A.drawProw = drawProw; A.drawProwFront = drawProwFront; A.emberOf = emberOf; A.PROW = { UPPER, LOWER, CLIP, JAW_T, JAW_B };
})();
