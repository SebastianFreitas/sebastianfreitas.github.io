/* Ceiling object kinds, family "metal": darkest and highest contrast of the four families. Hard straight edges, sharp angles,
   a dark facet, a light facet and a thin bright highlight; short to medium; stiff small sway. Every part overlaps the part above it,
   so each kind is one connected mass hung from its root. Tones from CEILKIND only. Registers with GenCeilKinds.add. */
(function () {
  "use strict";
  const K = window.GenCeilKinds;
  if (!K) return;

  // local frame: root at 0,0, +y down, sc/dir applied; e = { L, w, hi, lo, deep, hl, hw, r(i) }
  function begin(ctx, o, x, y, H, p, t, sc, pal, k) {
    ctx.save();
    ctx.translate(x, y - 2);
    ctx.rotate(Math.sin(t * 0.35 + o.ph + k) * 0.045);
    ctx.scale(o.dir > 0 ? 1 : -1, 1);
    const Q = pal.kind;
    const sets = [[Q[8], Q[7]], [Q[4], Q[9]], [Q[15], Q[14]], [Q[3], Q[6]], [Q[5], Q[6]]];
    const s = sets[(k + Math.floor(o.rnd(0) * 3)) % 5];
    const L = o.len * H * p;
    return { L: L, w: Math.max(3 * sc, L * 0.09 * (0.8 + o.w * 0.6)), hi: pal.rgba(s[0], 1), lo: pal.rgba(s[1], 1), deep: pal.rgba(Q[7], 1), hl: pal.rgba(Q[10], 1), hw: Math.max(2, sc * 1.5), r: o.rnd };
  }
  function P(ctx, a, col) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(a[0], a[1]);
    for (let i = 2; i < a.length; i += 2) ctx.lineTo(a[i], a[i + 1]);
    ctx.closePath(); ctx.fill();
  }
  function Ln(ctx, e, a) {
    ctx.strokeStyle = e.hl; ctx.lineWidth = e.hw; ctx.lineCap = "butt"; ctx.lineJoin = "miter";
    ctx.beginPath(); ctx.moveTo(a[0], a[1]);
    for (let i = 2; i < a.length; i += 2) ctx.lineTo(a[i], a[i + 1]);
    ctx.stroke();
  }
  // a skewed block centred on cx,cy: light, dark right half, highlight on the top edge
  function B(ctx, e, cx, cy, w, h, sk) {
    const x0 = cx - w / 2, x1 = cx + w / 2, y0 = Math.max(0, cy - h * 0.8), y1 = cy + h / 2;
    P(ctx, [x0 + sk, y0, x1 + sk, y0, x1, y1, x0, y1], e.hi);
    P(ctx, [cx + sk / 2, y0, x1 + sk, y0, x1, y1, cx, y1], e.lo);
    Ln(ctx, e, [x0, y1, x0 + sk, y0, x1 + sk, y0]);
  }
  // a polygon with its right part dark
  function F(ctx, e, a, dark, col) {
    P(ctx, a, col || e.hi); if (dark) P(ctx, dark, e.lo); Ln(ctx, e, [a[a.length - 2], a[a.length - 1], a[0], a[1], a[2], a[3]]);
  }
  function reg(name, k, fn, opts) {
    K.add("metal", name, function (ctx, o, x, y, H, p, t, sc, pal) {
      const e = begin(ctx, o, x, y, H, p, t, sc, pal, k);
      fn(ctx, e, e.w, e.L, t, o);
      ctx.restore();
    }, opts);
  }

  reg("fin", 25, function (ctx, e, w, L) {
    F(ctx, e, [-w * 2, 0, w * 2.4, 0, w * 3.2, 0.3 * L, w * 0.4, 0.5 * L, -w * 1.8, 0.35 * L], [w * 0.4, 0, w * 2.4, 0, w * 3.2, 0.3 * L, w * 0.4, 0.5 * L]);
    P(ctx, [w * 0.6, 0.3 * L, w * 4, 0.4 * L, w * 3, 0.8 * L, w * 1, 0.7 * L], e.lo);
    P(ctx, [-w * 1.6, 0.3 * L, w * 0.6, 0.35 * L, w * 1, 0.7 * L, -w * 1, 0.9 * L], e.deep);
  }, { len: [0.15, 0.15], n: [5, 5], big: true });

  reg("kinkbar", 0, function (ctx, e, w, L) {
    F(ctx, e, [-w * 1.8, 0, w * 2, 0, w * 3, 0.35 * L, w * 0.6, 0.55 * L, -w * 1.2, 0.3 * L], [w * 0.3, 0, w * 2, 0, w * 3, 0.35 * L, w * 0.6, 0.55 * L, w * 0.1, 0.3 * L]);
    P(ctx, [w * 0.6, 0.4 * L, w * 3, 0.3 * L, w * 2.2, 0.8 * L], e.deep);
  }, { len: [0.07, 0.13] });

  reg("splitwedge", 1, function (ctx, e, w, L) {
    F(ctx, e, [-w, 0, w * 1.4, 0, w * 0.9, 0.3 * L, -w * 0.5, 0.3 * L], [w * 0.2, 0, w * 1.4, 0, w * 0.9, 0.3 * L, w * 0.2, 0.3 * L]);
    B(ctx, e, w * 1.2, 0.5 * L, w * 2, 0.4 * L, w * 0.6);
    B(ctx, e, -w * 0.6, 0.55 * L, w * 1.8, 0.5 * L, -w * 0.4);
  }, { len: [0.08, 0.15] });

  reg("threespur", 2, function (ctx, e, w, L) {
    B(ctx, e, 0, 0.08 * L, w * 3, 0.16 * L, -w);
    B(ctx, e, w * 0.2, 0.4 * L, w * 2.2, 0.5 * L, -w * 0.4);
    B(ctx, e, w * 1.9, 0.3 * L, w * 1.8, 0.3 * L, w * 0.5);
  }, { len: [0.09, 0.16] });

  reg("slantslab", 3, function (ctx, e, w, L) {
    F(ctx, e, [-w * 0.5, 0, w * 1.6, 0, w * 2.2, 0.35 * L, w * 1.4, 0.38 * L, w * 0.9, 0.62 * L, -w * 0.2, 0.5 * L],
      [w * 0.6, 0, w * 1.6, 0, w * 2.2, 0.35 * L, w * 1.4, 0.38 * L, w * 0.9, 0.62 * L, w * 0.4, 0.4 * L]);
    B(ctx, e, w * 0.5, 0.75 * L, w * 1.8, 0.4 * L, -w * 0.4);
  }, { len: [0.07, 0.13] });

  reg("hookblade", 4, function (ctx, e, w, L) {
    F(ctx, e, [-w * 2, 0, w * 1.6, 0, w * 0.6, 0.5 * L, -w * 1.4, 0.5 * L], [w * 0.2, 0, w * 1.6, 0, w * 0.6, 0.5 * L, w * 0.2, 0.5 * L]);
    B(ctx, e, w * 1.4, 0.4 * L, w * 2.8, 0.3 * L, w * 0.5);
    B(ctx, e, w * 2.6, 0.7 * L, w * 1.4, 0.4 * L, 0);
  }, { len: [0.08, 0.14] });

  reg("tallshard", 5, function (ctx, e, w, L) {
    F(ctx, e, [-w * 2, 0, w * 2, 0, w * 2.8, 0.25 * L, w * 1.6, 0.7 * L, -w * 0.8, 0.6 * L, -w * 2.4, 0.3 * L], [w * 0.2, 0, w * 2, 0, w * 2.8, 0.25 * L, w * 1.6, 0.7 * L, w * 0.2, 0.65 * L]);
    B(ctx, e, w * 0.6, 0.78 * L, w * 3, 0.3 * L, -w * 0.5);
  }, { len: [0.1, 0.18] });

  reg("heavyblock", 6, function (ctx, e, w, L) {
    F(ctx, e, [-w * 1.4, 0, w * 1.6, 0, w * 2.2, 0.3 * L, w * 1.2, 0.55 * L, -w * 0.4, 0.5 * L, -w * 1.8, 0.25 * L],
      [w * 0.3, 0, w * 1.6, 0, w * 2.2, 0.3 * L, w * 1.2, 0.55 * L, -w * 0.4, 0.5 * L]);
    B(ctx, e, w * 0.6, 0.78 * L, w * 2.2, 0.4 * L, w * 0.5);
  }, { len: [0.05, 0.1] });

  reg("forkthree", 7, function (ctx, e, w, L) {
    F(ctx, e, [-w * 0.5, 0, w * 2, 0, w * 2.6, 0.22 * L, w * 0.6, 0.3 * L], null);
    B(ctx, e, -w * 0.4, 0.36 * L, w * 2.4, 0.14 * L, w * 0.8);
    B(ctx, e, -w * 1.2, 0.66 * L, w * 1.8, 0.5 * L, w * 0.4);
    B(ctx, e, w * 1.4, 0.7 * L, w * 1.6, 0.6 * L, -w * 0.4);
  }, { len: [0.08, 0.15] });

  reg("crackplate", 8, function (ctx, e, w, L) {
    F(ctx, e, [-w * 2, 0, w * 2.2, 0, w * 1.8, 0.3 * L, w * 0.2, 0.45 * L, -w * 1.6, 0.25 * L], [w * 0.2, 0, w * 2.2, 0, w * 1.8, 0.3 * L, w * 0.2, 0.45 * L]);
    P(ctx, [-w * 0.3, 0, w * 0.5, 0, w * 0.1, 0.28 * L], e.deep);
    B(ctx, e, -w * 0.3, 0.68 * L, w * 2, 0.5 * L, -w * 0.6);
  }, { len: [0.05, 0.1] });

  reg("lopbar", 9, function (ctx, e, w, L) {
    B(ctx, e, 0, 0.2 * L, w * 2, 0.4 * L, -w * 0.5);
    B(ctx, e, -w * 0.6, 0.55 * L, w * 3.4, 0.2 * L, -w);
    B(ctx, e, w * 0.4, 0.82 * L, w * 2, 0.36 * L, w * 0.6);
  }, { len: [0.08, 0.15] });

  reg("zagbranch", 10, function (ctx, e, w, L) {
    F(ctx, e, [-w * 1.5, 0, w * 1.2, 0, w * 2, 0.2 * L, 0, 0.32 * L, -w * 1.2, 0.18 * L], [w * 0.3, 0, w * 1.2, 0, w * 2, 0.2 * L, w * 0.3, 0.3 * L]);
    B(ctx, e, w * 2.2, 0.38 * L, w * 3, 0.3 * L, w * 0.5);
    B(ctx, e, -w * 0.2, 0.62 * L, w * 2.4, 0.5 * L, -w * 0.5);
  }, { len: [0.1, 0.17] });

  reg("shearpair", 11, function (ctx, e, w, L) {
    B(ctx, e, w * 0.3, 0.16 * L, w * 2.8, 0.32 * L, w * 0.8);
    B(ctx, e, w * 1.6, 0.6 * L, w * 1.6, 0.8 * L, -w * 0.6);
  }, { len: [0.07, 0.13] });

  reg("angledclump", 12, function (ctx, e, w, L) {
    F(ctx, e, [-w * 1.6, 0, w * 1.8, 0, w * 1.6, 0.3 * L, -w * 1.4, 0.35 * L], [w * 0.3, 0, w * 1.8, 0, w * 1.6, 0.3 * L, w * 0.3, 0.33 * L]);
    P(ctx, [-w * 2.4, 0.2 * L, -w * 0.2, 0.25 * L, w * 0.2, 0.7 * L, -w * 2, 0.6 * L], e.lo);
    P(ctx, [w * 0.2, 0.2 * L, w * 2.8, 0.3 * L, w * 2.2, 0.55 * L, w * 0.4, 0.65 * L], e.deep);
  }, { len: [0.06, 0.12] });

  reg("rootwedge", 13, function (ctx, e, w, L) {
    F(ctx, e, [-w * 1.5, 0, w * 1.8, 0, w * 1.4, 0.3 * L, -w * 0.6, 0.25 * L], [w * 0.3, 0, w * 1.8, 0, w * 1.4, 0.3 * L, w * 0.3, 0.27 * L]);
    B(ctx, e, w * 0.4, 0.5 * L, w * 2.6, 0.3 * L, w * 0.6);
    B(ctx, e, -w * 0.2, 0.85 * L, w * 1.8, 0.3 * L, -w * 0.4);
  }, { len: [0.09, 0.17] });

  reg("bentplate", 14, function (ctx, e, w, L) {
    F(ctx, e, [-w * 2, 0, w * 3, 0, w * 3.6, 0.3 * L, -w * 1.4, 0.3 * L], null);
    P(ctx, [-w * 0.6, 0.2 * L, w * 3.8, 0.25 * L, w * 2.6, 0.55 * L, -w, 0.5 * L], e.lo);
  }, { len: [0.06, 0.12] });

  reg("stackoffset", 15, function (ctx, e, w, L) {
    F(ctx, e, [-w * 1.6, 0, w * 1.8, 0, w * 3, 0.3 * L, w * 2.4, 0.8 * L, w * 0.2, 0.95 * L, -w * 1.6, 0.55 * L], [w * 0.5, 0, w * 1.8, 0, w * 3, 0.3 * L, w * 2.4, 0.8 * L, w * 0.2, 0.95 * L, w * 0.5, 0.5 * L]);
    P(ctx, [-w * 1.6, 0.55 * L, w * 0.5, 0.5 * L, w * 0.2, 0.95 * L], e.deep);
  }, { len: [0.09, 0.16] });

  reg("splinterbundle", 16, function (ctx, e, w, L) {
    B(ctx, e, 0, 0.1 * L, w * 4, 0.2 * L, w);
    B(ctx, e, -w * 1.2, 0.45 * L, w * 1.8, 0.5 * L, -w * 0.5);
    B(ctx, e, w * 1.2, 0.5 * L, w * 2, 0.6 * L, w * 0.5);
  }, { len: [0.08, 0.14] });

  reg("kneebar", 17, function (ctx, e, w, L) {
    B(ctx, e, 0, 0.08 * L, w * 2.4, 0.16 * L, w * 0.5);
    B(ctx, e, w * 0.8, 0.4 * L, w * 2.6, 0.45 * L, w * 0.8);
    B(ctx, e, -w * 0.3, 0.8 * L, w * 1.8, 0.4 * L, -w * 0.4);
  }, { len: [0.09, 0.15] });

  reg("facetrock", 18, function (ctx, e, w, L) {
    F(ctx, e, [-w * 1.5, 0, w * 1.2, 0, w * 2.4, 0.3 * L, w * 0.4, 0.6 * L, -w * 1.8, 0.35 * L], null);
    P(ctx, [w * 0.3, 0.22 * L, w * 1.2, 0, w * 2.4, 0.3 * L], e.lo);
    P(ctx, [w * 0.3, 0.22 * L, w * 2.4, 0.3 * L, w * 0.4, 0.6 * L], e.deep);
    B(ctx, e, w * 0.2, 0.8 * L, w * 2, 0.4 * L, -w * 0.5);
  }, { len: [0.05, 0.11] });

  reg("rubble", 19, function (ctx, e, w, L) {
    F(ctx, e, [-w * 3, 0, w * 3, 0, w * 3.4, 0.2 * L, w, 0.45 * L, -w * 2.6, 0.4 * L], [w * 0.4, 0, w * 3, 0, w * 3.4, 0.2 * L, w, 0.45 * L]);
    B(ctx, e, w * 1.6, 0.6 * L, w * 2.4, 0.4 * L, w * 0.8);
    B(ctx, e, -w * 1.2, 0.72 * L, w * 2.2, 0.5 * L, -w * 0.6);
  }, { len: [0.05, 0.1] });

  reg("diagslab", 20, function (ctx, e, w, L) {
    F(ctx, e, [-w, 0, w * 3, 0, w * 4.6, 0.45 * L, w * 1.2, 0.6 * L, -w * 0.4, 0.3 * L], [w, 0, w * 3, 0, w * 4.6, 0.45 * L, w * 1.2, 0.6 * L]);
  }, { len: [0.1, 0.18] });

  reg("twinblade", 21, function (ctx, e, w, L) {
    B(ctx, e, w * 0.2, 0.05 * L, w * 3.6, 0.1 * L, 0);
    B(ctx, e, -w * 0.4, 0.5 * L, w * 2, 0.8 * L, w * 0.5);
    B(ctx, e, w * 1.6, 0.35 * L, w * 1.6, 0.5 * L, w * 0.7);
  }, { len: [0.07, 0.14] });

  reg("hingearm", 22, function (ctx, e, w, L) {
    B(ctx, e, w * 0.2, 0.2 * L, w * 2.2, 0.4 * L, w * 0.6);
    B(ctx, e, w * 0.6, 0.45 * L, w * 3.2, 0.2 * L, w * 0.3);
    B(ctx, e, -w * 0.6, 0.8 * L, w * 2, 0.4 * L, -w * 0.5);
    B(ctx, e, w * 2.2, 0.7 * L, w * 1.6, 0.4 * L, w * 0.4);
  }, { len: [0.08, 0.15] });

  reg("gnarl", 23, function (ctx, e, w, L, t, o) {
    F(ctx, e, [-w * 1.4, 0, w * 1.6, 0, w * 2.4, 0.35 * L, 0, 0.45 * L, -w * 1.6, 0.25 * L], null);
    P(ctx, [0, 0.3 * L, w * 2.6, 0.3 * L, w * 1.8, 0.75 * L, -w * 0.6, 0.7 * L], e.lo);
    P(ctx, [-w * 0.6, 0.7 * L, w * 1.8, 0.75 * L, w * 0.8, 0.95 * L], e.deep);
  }, { len: [0.09, 0.16] });

  reg("cutcolumn", 24, function (ctx, e, w, L) {
    F(ctx, e, [-w * 2, 0, w * 2.4, 0, w * 1.4, 0.5 * L, -w * 1.6, 0.6 * L], [0, 0, w * 2.4, 0, w * 1.4, 0.5 * L, 0, 0.55 * L]);
    B(ctx, e, w * 0.4, 0.78 * L, w * 3, 0.36 * L, -w * 0.8);
  }, { len: [0.06, 0.12] });
})();
