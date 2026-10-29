/* Ceiling object kinds, family "cloud": the widest and softest, big pale lumpy masses with frayed edges, slow breathing scale; pale washed tones.
   Every part overlaps its parent back to the root, which sits on the anchor. Flat fills and strokes only; see GenCeilKinds for the draw signature. */
(function () {
  "use strict";
  const K = window.GenCeilKinds, TAU = Math.PI * 2, PALE = [10, 11, 12, 13, 14, 15, 8, 7], DN = Math.PI / 2;
  let kn = 0;

  // appends a lumpy closed outline to the current path (breathing radius, slow lump drift)
  function lump(ctx, g, cx, cy, rx, ry, sd, n) {
    n = n || 9;
    const pts = [], br = g.br;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, r = 1 + 0.5 * (g.h(sd + i * 1.7) - 0.5) + 0.05 * Math.sin(g.t * 0.6 + i + sd);
      pts.push([cx + Math.cos(a) * rx * r * br, cy + Math.sin(a) * ry * r * br]);
    }
    ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
    for (let i = 0; i < n; i++) {
      const q = pts[(i + 1) % n];
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + q[0]) / 2, (pts[i][1] + q[1]) / 2);
    }
    ctx.closePath();
  }
  function fl(ctx, g, cx, cy, rx, ry, sd, col, n) { ctx.beginPath(); lump(ctx, g, cx, cy, rx, ry, sd, n); ctx.fillStyle = col; ctx.fill(); }

  // a heap of lumps grown from the root: each new lump is set against an earlier one (the last when o.chain), so all overlap back to the root.
  // o: r0 root radius (x L), asp height/width, ang bias angle (DN = down), spr spread, dec size ratio per generation, x/y root offset (x L), sd seed, outline, fray
  function cluster(ctx, g, n, o) {
    const sd = o.sd || 0, asp = o.asp || 0.7, R = g.L * o.r0, dv = g.o.dir < 0 ? -1 : 1, ls = [];
    ls.push({ x: g.x + (o.x || 0) * g.L, y: g.y + (o.y || 0) * g.L + 0.4 * R * asp, r: R, a: DN });
    for (let i = 1; i < n; i++) {
      const par = ls[o.chain ? i - 1 : Math.floor(g.h(i + sd) * i)];
      const a = o.ang + (g.h(i * 2 + sd) - 0.5) * o.spr, r = Math.min(R * 1.3, Math.max(g.L * 0.03 + 2, par.r * o.dec * (0.65 + 0.7 * g.h(i + sd + 7))));
      ls.push({ x: par.x + Math.cos(a) * dv * (par.r + r) * 0.7, y: Math.max(g.y + 0.3 * r * asp, par.y + Math.sin(a) * (par.r + r) * asp * 0.7), r: r, a: a });
    }
    const pos = ls.map(function (l) { return [l.x + g.sw(Math.min(1, Math.max(0, (l.y - g.y) / g.L))), l.y]; });
    for (let i = 0; i < n; i++) {
      fl(ctx, g, pos[i][0], pos[i][1], ls[i].r, ls[i].r * asp, i + sd * 10, g.c(i, (o.al || 0.88) * (0.75 + 0.25 * g.h(i + sd + 3))));
    }
  }

  function reg(name, fn, opts) {
    const k = kn++;
    K.add("cloud", name, function (ctx, o, x, y, H, p, t, sc, pal) {
      const base = Math.floor(Math.abs(o.ph) * 10);
      const g = {
        o: o, x: x, y: y, L: o.len * H * p, t: t, sc: sc, H: H, p: p, pal: pal,
        br: 1 + 0.05 * Math.sin(t * 0.5 + o.ph),
        h: function (i) { return pal.hash(o.ph + i * 3.3 + k * 9.1); },
        c: function (j, a) { return pal.rgba(pal.kind[PALE[(base + k * 3 + j) % 8]], a); },
        sw: function (s) { return Math.sin(t * 0.3 + o.ph + s * 2.2) * 9 * o.amp * s * sc; }
      };
      fn(ctx, g);
    }, opts);
  }

  // 1: a wide flat pile of unequal lumps slumping downward
  reg("slumpstack", function (ctx, g) { cluster(ctx, g, g.o.n + 1, { r0: 0.5, asp: 0.35, ang: DN, spr: 1.4, dec: 0.85, chain: true, sd: 1 }); }, { len: [0.1, 0.2], n: [3, 5] });

  // 2: a wide leaning run of soft lumps swelling and thinning
  reg("swellrun", function (ctx, g) { cluster(ctx, g, 6, { r0: 0.2, asp: 0.5, ang: 0.25, spr: 1.2, dec: 0.9, chain: true, fray: false, sd: 2 }); }, { len: [0.08, 0.16] });

  // 3: a broad soft slab with unequal lumps fused on one side
  reg("poreslab", function (ctx, g) { cluster(ctx, g, 4, { r0: 0.5, asp: 0.4, ang: 0.2, spr: 1.5, dec: 0.5, fray: false, sd: 3 }); }, { len: [0.12, 0.22] });

  // 4: a wide low bank of three overlapping flat lumps
  reg("fraycrown", function (ctx, g) { cluster(ctx, g, 3, { r0: 0.5, asp: 0.22, ang: 0.1, spr: 0.8, dec: 0.75, chain: true, fray: false, sd: 4 }); }, { len: [0.08, 0.17] });

  // 5: overlapping lumps of different tones drifting aside
  reg("echoloops", function (ctx, g) { cluster(ctx, g, 5, { r0: 0.35, asp: 0.5, ang: 0.4, spr: 2, dec: 0.8, fray: false, sd: 5 }); }, { len: [0.1, 0.18] });

  // 6: three lumps pinched together, each much smaller than the last, leaning aside
  reg("pinchmass", function (ctx, g) { cluster(ctx, g, 3, { r0: 0.4, asp: 0.6, ang: 0.7, spr: 0.6, dec: 0.65, chain: true, sd: 6 }); }, { len: [0.1, 0.18] });

  // 7: a wide leaning chain of shrinking lumps
  reg("partrejoin", function (ctx, g) { cluster(ctx, g, 4, { r0: 0.35, asp: 0.45, ang: 0.5, spr: 0.8, dec: 0.75, chain: true, fray: false, sd: 7 }); }, { len: [0.09, 0.17] });

  // 8: a small wide clot of overlapping lumps
  reg("clotweb", function (ctx, g) { cluster(ctx, g, 5, { r0: 0.22, asp: 0.5, ang: 0.3, spr: 2.5, dec: 0.85, fray: false, sd: 8 }); }, { len: [0.04, 0.08] });

  // 9: a long low drift of overlapping lumps
  reg("ribbonfold", function (ctx, g) { cluster(ctx, g, 5, { r0: 0.3, asp: 0.4, ang: 0.15, spr: 1.6, dec: 0.85, chain: true, fray: false, sd: 9 }); }, { len: [0.1, 0.2] });

  // 10: a wide heap of lumps of many tones
  reg("puffheap", function (ctx, g) { cluster(ctx, g, 5, { r0: 0.3, asp: 0.45, ang: 0.3, spr: 2.5, dec: 0.85, fray: false, sd: 10, al: 0.9 }); }, { len: [0.09, 0.18] });

  // 11: soft flat lumps stepping down and aside
  reg("tiltbowls", function (ctx, g) { cluster(ctx, g, 4, { r0: 0.4, asp: 0.3, ang: 1, spr: 1, dec: 0.9, chain: true, fray: false, sd: 11 }); }, { len: [0.1, 0.18] });

  // 12: a wide soft top with heavy lumps slumped to one side
  reg("sagmass", function (ctx, g) { cluster(ctx, g, 5, { r0: 0.45, asp: 0.35, ang: 1.2, spr: 2.5, dec: 0.55, fray: false, sd: 12 }); }, { len: [0.1, 0.2] });

  // 13: a big lump with small scraps clinging all round its lower edge
  reg("crumbledge", function (ctx, g) { cluster(ctx, g, 10, { r0: 0.45, asp: 0.45, ang: DN, spr: 3, dec: 0.45, sd: 2 }); }, { len: [0.12, 0.22] });

  // 14: one huge flat lump with unequal lumps along its flank
  reg("bellymass", function (ctx, g) { cluster(ctx, g, 6, { r0: 0.5, asp: 0.3, ang: 0.1, spr: 4, dec: 0.55, fray: false, sd: 14 }); }, { len: [0.1, 0.2] });

  // 15: a winding diagonal pile of shrinking lumps
  reg("branchsmoke", function (ctx, g) { cluster(ctx, g, 7, { r0: 0.2, asp: 0.6, ang: 0.6, spr: 2.4, dec: 0.8, chain: true, fray: false, sd: 15 }); }, { len: [0.1, 0.18] });

  // 16: a streak sweeping sideways and down, thinning, with thread frays
  reg("windstreak", function (ctx, g) { cluster(ctx, g, 6, { r0: 0.2, asp: 0.5, ang: 0.3, spr: 2.2, dec: 0.9, sd: 5 }); }, { len: [0.1, 0.2] });

  // 17: two roots side by side, each grown into its own uneven heap
  reg("twinhaunch", function (ctx, g) {
    cluster(ctx, g, 4, { r0: 0.3, asp: 0.45, x: -0.18, ang: 0.5, spr: 1, dec: 0.8, chain: true, sd: 1 });
    cluster(ctx, g, 3, { r0: 0.35, asp: 0.4, x: 0.2, y: 0.03, ang: 2.2, spr: 1, dec: 0.7, chain: true, sd: 2 });
  }, { len: [0.09, 0.17] });

  // 18: a broad soft sheet of overlapping flat lumps
  reg("tattersheet", function (ctx, g) { cluster(ctx, g, 6, { r0: 0.3, asp: 0.3, ang: 0.1, spr: 3, dec: 0.75, fray: false, sd: 18 }); }, { len: [0.1, 0.2] });

  // 19: a wide pair of unequal lumps fused together
  reg("unequalpair", function (ctx, g) { cluster(ctx, g, 2, { r0: 0.5, asp: 0.5, ang: 0.1, spr: 0.4, dec: 0.6, chain: true, fray: false, sd: 19 }); }, { len: [0.05, 0.1] });

  // 20: a jam of overlapping outlined lumps
  reg("cellmass", function (ctx, g) { cluster(ctx, g, 7, { r0: 0.2, asp: 0.5, ang: 0.3, spr: 3, dec: 0.9, sd: 9 }); }, { len: [0.12, 0.2] });

  // 21: overlapping wavy bands of random width and thickness, sliding about
  reg("waveshelves", function (ctx, g) {
    let y0 = g.y + g.L * 0.03, pw = 0, px = g.x;
    for (let i = 0; i < 4; i++) {
      const w = g.L * (0.15 + 0.3 * g.h(i + 2)), th = g.L * (0.08 + 0.05 * g.h(i + 9));
      const cx = px + (i ? (g.h(i + 4) - 0.5) * 0.7 * Math.min(pw, w) : 0) + g.sw(i / 4) * 0.2;
      const wv = function (u) { return Math.sin(u * 5 + g.t * 0.4 + i * 2 + g.o.ph) * g.L * 0.03; };
      ctx.beginPath(); ctx.moveTo(cx - w, y0 + wv(-1));
      for (let k = -5; k <= 5; k++) ctx.lineTo(cx + k / 5 * w, y0 + wv(k / 5));
      for (let k = 5; k >= -5; k--) ctx.lineTo(cx + k / 5 * w, y0 + th + wv(k / 5));
      ctx.closePath(); ctx.fillStyle = g.c(i, 0.88); ctx.fill();
      y0 += th * (0.55 + 0.3 * g.h(i + 6)); pw = w; px = cx;
    }
  }, { len: [0.1, 0.18] });

  // 22: a wide filled lump, a larger lump overlapping its belly, a small lump clinging to its edge
  reg("tiltrims", function (ctx, g) {
    const sx = g.x + g.sw(0.5), dv = g.o.dir < 0 ? -1 : 1;
    fl(ctx, g, g.x, g.y + g.L * 0.1, g.L * 0.4, g.L * 0.12, 70, g.c(0, 0.9));
    fl(ctx, g, sx + dv * g.L * 0.1, g.y + g.L * 0.2, g.L * 0.34, g.L * 0.14, 71, g.c(1, 0.88), 8);
    fl(ctx, g, sx + dv * g.L * 0.38, g.y + g.L * 0.26, g.L * 0.1, g.L * 0.06, 72, g.c(3, 0.88), 7);
  }, { len: [0.09, 0.17] });

  // 23: a wide spray of attached lumps
  reg("sporedrift", function (ctx, g) { cluster(ctx, g, 9, { r0: 0.2, asp: 0.55, ang: 0.35, spr: 3.4, dec: 0.85, fray: false, sd: 23 }); }, { len: [0.05, 0.1] });

  // 24: a lopsided slab with lumps fused below it
  reg("forktails", function (ctx, g) { cluster(ctx, g, 4, { r0: 0.4, asp: 0.25, ang: 0.8, spr: 1.4, dec: 0.7, fray: false, sd: 24 }); }, { len: [0.1, 0.2] });

  // 25: low round banks piled with overlap
  reg("slabdrift", function (ctx, g) { cluster(ctx, g, 3, { r0: 0.4, asp: 0.22, ang: 0.05, spr: 0.6, dec: 1, chain: true, fray: false, sd: 25 }); }, { len: [0.1, 0.18] });
})();
