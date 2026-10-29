/* Ceiling object kinds, family "odd": pierced forms, one solid mass with irregular holes cut right through it so the sky shows.
   Each drawer runs in a frame translated to the root (0,0), growing down to L; g = ctx, c(k, a) = a washed CEILKIND tone, W = base width.
   Outlines mix hard corners and soft curves; holes are unequal, off-centre and never a pair, a ring or a keyhole. */
(function () {
  "use strict";
  const K = window.GenCeilKinds;
  if (!K) return;
  // any CEILKIND slot (the palette is washed already, no boosts here)
  const SAT = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

  // one mass with holes: the first shape is the outline, the rest are cut out (evenodd).
  // A shape is { p: pts } (straight edges) or { q: pts } (smooth closed curve through edge midpoints).
  function pierce(g, col, shapes) {
    g.fillStyle = col; g.beginPath();
    shapes.forEach(function (s) {
      const pts = s.p || s.q, n = pts.length;
      if (s.p) {
        g.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < n; i++) g.lineTo(pts[i][0], pts[i][1]);
      } else {
        g.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
        for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
      }
      g.closePath();
    });
    g.fill("evenodd");
  }

  function reg(name, fn, opts) {
    K.add("odd", name, function (ctx, o, x, y, H, p, t, sc, pal) {
      const L = o.len * H * p;
      if (L < 3) return;
      const sw = Math.sin(t * 0.3 + o.ph) * (0.5 + o.amp) * 5 * sc;
      const base = Math.floor(pal.hash(o.ph * 3.1) * SAT.length);
      const c = function (k, a) { return pal.rgba(pal.kind[SAT[(base + k * 2) % SAT.length]], a == null ? 0.92 : a); };
      // U maps [x in W, y in L] to pixels: mirrored by dir, lower points sway more
      const W = (9 + 8 * o.w) * sc;
      const U = function (a) { return a.map(function (q) { return [o.dir * q[0] * W + sw * q[1], q[1] * L]; }); };
      ctx.save();
      ctx.translate(x, y - 2);
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      fn(ctx, U, c);
      ctx.restore();
    }, opts);
  }

  // a soft lump with a hard wedge and a soft bean cut through it
  reg("pinchbody", function (g, U, c) {
    pierce(g, c(0), [{ q: U([[-1.2, 0], [1.0, 0], [1.5, 0.35], [0.9, 0.8], [-0.6, 0.9], [-1.4, 0.5]]) },
      { p: U([[-0.4, 0.2], [0.3, 0.25], [-0.2, 0.5]]) }, { q: U([[0.6, 0.45], [0.9, 0.55], [0.7, 0.7], [0.4, 0.6]]) }]);
  }, { len: [0.07, 0.14] });

  // a hard skewed plate, a soft hollow and a small wedge cut out of it
  reg("brokenspin", function (g, U, c) {
    pierce(g, c(3), [{ p: U([[-1.5, 0], [1.2, 0], [1.6, 0.5], [0.7, 0.95], [-1.2, 0.8]]) },
      { q: U([[-0.8, 0.3], [-0.1, 0.25], [0, 0.5], [-0.7, 0.55]]) }, { p: U([[0.5, 0.5], [1.0, 0.45], [0.8, 0.72]]) }]);
  }, { len: [0.07, 0.13] });

  // a swollen mass with a hard quad and a triangle cut out
  reg("twistrib", function (g, U, c) {
    pierce(g, c(3), [{ q: U([[-1.4, 0], [1.3, 0], [1.0, 0.5], [1.4, 0.9], [-0.5, 0.95], [-1.1, 0.5]]) },
      { p: U([[-0.5, 0.2], [0.4, 0.3], [0.1, 0.45], [-0.6, 0.5]]) }, { p: U([[0.2, 0.62], [0.8, 0.6], [0.5, 0.82]]) }]);
  }, { len: [0.07, 0.14] });

  // a hard slab with a long slanted gap and a soft round cut
  reg("rejoin", function (g, U, c) {
    pierce(g, c(0), [{ p: U([[-1.0, 0], [1.8, 0], [1.9, 0.7], [0.6, 0.95], [-1.3, 0.6]]) },
      { p: U([[-0.4, 0.25], [0.5, 0.2], [1.0, 0.4], [0.0, 0.45]]) }, { q: U([[0.7, 0.58], [1.2, 0.54], [1.3, 0.72], [0.9, 0.76]]) }]);
  }, { len: [0.07, 0.14] });

  // a ragged slab with two cuts of unrelated shape
  reg("holeslab", function (g, U, c) {
    pierce(g, c(0), [{ p: U([[-1, 0], [1.6, 0], [1.8, 0.5], [0.5, 1], [-0.8, 0.7], [-1.7, 0.3]]) },
      { p: U([[-0.7, 0.2], [0.5, 0.15], [0.2, 0.4], [-0.5, 0.45]]) }, { q: U([[0.9, 0.4], [1.2, 0.5], [1.0, 0.72], [0.6, 0.6]]) }]);
  }, { len: [0.07, 0.13] });

  // a blunt hard wedge pierced by a bean and a small triangle
  reg("shoveddiscs", function (g, U, c) {
    pierce(g, c(1), [{ p: U([[-1.4, 0], [1.4, 0], [1.0, 0.5], [-0.2, 0.85], [-1.5, 0.6]]) },
      { q: U([[-0.6, 0.15], [0.2, 0.2], [0.3, 0.4], [-0.5, 0.45]]) }, { p: U([[0.6, 0.3], [1.0, 0.28], [0.8, 0.45]]) }]);
  }, { len: [0.07, 0.14] });

  // a soft lopsided mass cut by a wedge and a small block
  reg("splitroot", function (g, U, c) {
    pierce(g, c(1), [{ q: U([[-1.6, 0], [1.0, 0], [1.5, 0.5], [0.6, 0.95], [-0.8, 0.8], [-1.7, 0.4]]) },
      { p: U([[-0.9, 0.2], [0.2, 0.25], [-0.3, 0.5]]) }, { p: U([[0.4, 0.55], [0.9, 0.5], [0.8, 0.7], [0.4, 0.72]]) }]);
  }, { len: [0.07, 0.14] });

  // a hard plate flaring to the side, an irregular five-sided cut and a small notch
  reg("knotloop", function (g, U, c) {
    pierce(g, c(1), [{ p: U([[-0.8, 0], [0.8, 0], [1.8, 0.4], [1.5, 0.9], [-0.4, 1], [-1.5, 0.6]]) },
      { p: U([[-0.6, 0.35], [0.4, 0.3], [0.9, 0.5], [0.2, 0.62], [-0.5, 0.55]]) }, { p: U([[0.3, 0.76], [0.9, 0.72], [0.6, 0.88]]) }]);
  }, { len: [0.07, 0.12] });

  // a big soft mass, a hard quad and a wedge cut out
  reg("meltslab", function (g, U, c) {
    pierce(g, c(2), [{ q: U([[-1.3, 0], [1.5, 0], [2.0, 0.5], [1.0, 0.95], [-0.5, 0.9], [-1.6, 0.5]]) },
      { p: U([[-0.8, 0.3], [0.1, 0.25], [-0.1, 0.55], [-0.7, 0.6]]) }, { p: U([[0.9, 0.4], [1.5, 0.45], [1.1, 0.7]]) }]);
  }, { len: [0.07, 0.13] });

  // a hard sideways triangle with a long wedge and a small bean cut out
  reg("wedgestrip", function (g, U, c) {
    pierce(g, c(1), [{ p: U([[-1, 0], [1, 0], [2.6, 0.5], [1.8, 0.95], [0, 0.7]]) },
      { p: U([[0.2, 0.2], [1.3, 0.35], [0.5, 0.45]]) }, { q: U([[1.2, 0.6], [1.7, 0.58], [1.6, 0.75]]) }]);
  }, { len: [0.08, 0.15] });

  // two offset blocks fused at a step, each cut through differently
  reg("wrongjoin", function (g, U, c) {
    pierce(g, c(1), [{ p: U([[-1, 0], [1, 0], [1, 0.3], [2.6, 0.5], [2.6, 1], [0.5, 1], [0.6, 0.55], [-1, 0.4]]) },
      { p: U([[-0.5, 0.1], [0.5, 0.12], [0.2, 0.3]]) }, { q: U([[1.0, 0.65], [2.1, 0.62], [1.8, 0.9], [1.1, 0.85]]) }]);
  }, { len: [0.08, 0.15] });

  // a tall soft mass cut by a slanted slot and a triangle
  reg("slumpmass", function (g, U, c) {
    pierce(g, c(0), [{ q: U([[-1.3, 0], [1.3, 0], [1.5, 0.5], [0.8, 1], [-0.9, 0.9], [-1.5, 0.45]]) },
      { p: U([[-0.6, 0.2], [0.3, 0.3], [0.1, 0.48], [-0.7, 0.4]]) }, { p: U([[0.3, 0.62], [0.9, 0.58], [0.6, 0.82]]) }]);
  }, { len: [0.07, 0.13] });

  // a leaning hard sheet with one big irregular cut and a tiny wedge
  reg("tornsheet", function (g, U, c) {
    pierce(g, c(2), [{ p: U([[-1.5, 0], [0.6, 0], [1.8, 0.5], [1.4, 1], [-0.7, 0.95], [-1.4, 0.5]]) },
      { q: U([[-0.6, 0.3], [0.3, 0.3], [0.5, 0.6], [-0.3, 0.7], [-0.8, 0.5]]) }, { p: U([[0.9, 0.7], [1.3, 0.65], [1.1, 0.85]]) }]);
  }, { len: [0.07, 0.13] });

  // a wide soft lump hung off to one side, a wedge and a quad cut out
  reg("bentlump", function (g, U, c) {
    pierce(g, c(2), [{ q: U([[-2, 0], [1.5, 0], [1.8, 0.4], [1.2, 0.95], [-0.4, 1], [-1.6, 0.5]]) },
      { p: U([[-1.2, 0.15], [-0.2, 0.2], [-0.8, 0.45]]) }, { p: U([[0.4, 0.35], [1.2, 0.4], [0.9, 0.7], [0.3, 0.6]]) }]);
  }, { len: [0.08, 0.15] });

  // a hard chopped chunk with a bent gap and a small wedge
  reg("halvesmass", function (g, U, c) {
    pierce(g, c(2), [{ p: U([[-1, 0], [1.0, 0], [1.7, 0.4], [0.6, 1], [-0.5, 0.8], [-1, 0.4]]) },
      { q: U([[-0.5, 0.2], [0.5, 0.2], [0.6, 0.35], [-0.3, 0.5]]) }, { p: U([[0.1, 0.6], [0.5, 0.55], [0.3, 0.75]]) }]);
  }, { len: [0.08, 0.14] });

  // a hard fan-shaped mass with one big triangle and a tiny bean cut out
  reg("dualfold", function (g, U, c) {
    pierce(g, c(3), [{ p: U([[-0.4, 0], [0.6, 0], [1.8, 0.5], [1.3, 0.95], [-0.6, 0.8], [-1.2, 0.4]]) },
      { p: U([[-0.5, 0.3], [0.8, 0.4], [-0.2, 0.65]]) }, { q: U([[0.9, 0.65], [1.2, 0.62], [1.1, 0.8]]) }]);
  }, { len: [0.07, 0.13] });

  // a hard stepped block with a soft bean and a small wedge cut out
  reg("splitprism", function (g, U, c) {
    pierce(g, c(0), [{ p: U([[-1.2, 0], [1.2, 0], [1.2, 0.35], [0.6, 0.35], [0.6, 0.7], [-0.8, 0.7]]) },
      { q: U([[-0.7, 0.15], [0.4, 0.12], [0.5, 0.3], [-0.5, 0.5]]) }, { p: U([[0.65, 0.1], [1.0, 0.12], [0.85, 0.27]]) }]);
  }, { len: [0.08, 0.15] });

  // a soft lump with a slanted quad and a tiny notch cut out
  reg("holeblob", function (g, U, c) {
    pierce(g, c(0), [{ q: U([[-0.7, 0], [0.7, 0], [1.4, 0.4], [1.0, 0.9], [-0.6, 1], [-1.3, 0.5]]) },
      { p: U([[-0.6, 0.3], [0.2, 0.25], [0.6, 0.5], [-0.3, 0.6]]) }, { q: U([[0.2, 0.78], [0.6, 0.75], [0.5, 0.9]]) }]);
  }, { len: [0.07, 0.13] });

  // a far-leaning hard slab with a quad and a small bean cut out
  reg("slipcolumn", function (g, U, c) {
    pierce(g, c(3), [{ p: U([[-0.7, 0], [1.0, 0], [2.4, 0.7], [1.0, 0.95], [-0.5, 0.6]]) },
      { p: U([[0, 0.2], [0.7, 0.25], [0.5, 0.5], [-0.1, 0.4]]) }, { q: U([[1.2, 0.55], [1.7, 0.6], [1.4, 0.78]]) }]);
  }, { len: [0.07, 0.14] });

  // a heavy soft knot with a wedge and a small bean cut out
  reg("stubcluster", function (g, U, c) {
    pierce(g, c(2), [{ q: U([[-1.3, 0], [1.3, 0], [2, 0.35], [1.2, 0.8], [-0.2, 1], [-1.2, 0.65]]) },
      { p: U([[-0.6, 0.2], [0.4, 0.2], [-0.1, 0.5]]) }, { q: U([[0.8, 0.5], [1.3, 0.45], [1.2, 0.65]]) }]);
  }, { len: [0.06, 0.12] });

  // a hard wedge leaning off the root with a long gap and a small notch
  reg("clamp", function (g, U, c) {
    pierce(g, c(2), [{ p: U([[-0.2, 0], [1.0, 0], [2.4, 0.4], [1.8, 0.7], [0.3, 0.65]]) },
      { p: U([[0.5, 0.15], [1.4, 0.25], [0.8, 0.4]]) }, { q: U([[1.4, 0.45], [1.8, 0.45], [1.5, 0.58]]) }]);
  }, { len: [0.08, 0.14] });

  // a hard multi-cornered chunk with a soft cut and a triangle
  reg("shardtri", function (g, U, c) {
    pierce(g, c(2), [{ p: U([[-1.6, 0], [1, 0], [1.8, 0.35], [0.8, 0.7], [0.4, 1], [-1.0, 0.6]]) },
      { q: U([[-0.8, 0.15], [0.3, 0.12], [0.4, 0.35], [-0.5, 0.4]]) }, { p: U([[0.5, 0.45], [1.0, 0.4], [0.6, 0.65]]) }]);
  }, { len: [0.08, 0.15] });

  // a bowed soft plate with a wedge and a bean cut out
  reg("shiftbars", function (g, U, c) {
    pierce(g, c(0), [{ q: U([[-1.4, 0], [1.4, 0], [1.6, 0.4], [0.6, 0.95], [-0.7, 0.8], [-1.5, 0.4]]) },
      { p: U([[-0.9, 0.15], [0.2, 0.15], [-0.4, 0.45]]) }, { q: U([[0.4, 0.5], [1.0, 0.45], [0.8, 0.7]]) }]);
  }, { len: [0.07, 0.14] });

  // a wide hard mass with one big off-centre cut and a small wedge
  reg("lumpclub", function (g, U, c) {
    pierce(g, c(1), [{ p: U([[-1.5, 0], [1.5, 0], [2.4, 0.45], [1.4, 0.85], [-0.6, 0.95], [-1.2, 0.5]]) },
      { q: U([[-0.7, 0.25], [0.6, 0.25], [0.9, 0.5], [0, 0.65], [-0.8, 0.5]]) }, { p: U([[1.4, 0.5], [1.8, 0.5], [1.5, 0.65]]) }]);
  }, { len: [0.07, 0.14] });

  // a heaped soft mass with a wedge and a bean cut out
  reg("leanmass", function (g, U, c) {
    pierce(g, c(3), [{ q: U([[-1, 0], [1, 0], [1.9, 0.4], [1.2, 0.9], [-0.8, 1], [-1.3, 0.5]]) },
      { p: U([[-0.4, 0.15], [0.6, 0.2], [0, 0.4]]) }, { q: U([[-0.9, 0.55], [-0.3, 0.5], [-0.4, 0.78]]) }]);
  }, { len: [0.07, 0.14] });
})();
