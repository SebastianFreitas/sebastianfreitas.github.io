/* Ceiling object kinds, family "plant": the longest and thickest family, bodies that swell and taper, slow supple sway;
   deep greens, ochres, rusts, mauves from pal.kind. Invented forms only; every part overlaps the one above it, up to the root. */
(function () {
  "use strict";
  const TAU = Math.PI * 2;
  const DEEP = [0, 2, 3, 9, 5, 11, 13, 6, 14, 4];
  const col = (pal, i, a) => pal.rgba(pal.kind[DEEP[((i % 10) + 10) % 10]], a === undefined ? 0.94 : a);

  // sagging centre line from the root down, swaying with t
  function spine(o, x, y, L, t, k, sc, m, ph) {
    const pts = [];
    for (let i = 0; i <= m; i++) {
      const s = i / m;
      pts.push([x + (Math.sin(s * 3 + o.ph + (ph || 0) + t * 0.4) * k * o.amp * s + Math.sin(t * 0.25 + o.ph) * k * 0.6 * s * s) * sc, y - 3 + (L + 3) * s]);
    }
    return pts;
  }
  // centre line that turns steadily: heading grows as (s^1.6) * turn, signed by dir
  function hook(x, y, len, turn, dir, m, sway) {
    const pts = [[x, y - 3]], st = len / m;
    let px = x, py = y - 3;
    for (let q = 1; q <= m; q++) {
      const h = turn * dir * Math.pow(q / m, 1.6) + sway * q / m;
      px += Math.sin(h) * st; py += Math.cos(h) * st; pts.push([px, py]);
    }
    return pts;
  }
  // filled band along pts, width wf(s) in px
  function band(ctx, pts, wf) {
    const m = pts.length - 1;
    ctx.beginPath();
    for (let i = 0; i <= m; i++) { const h = wf(i / m) / 2; if (i) ctx.lineTo(pts[i][0] - h, pts[i][1]); else ctx.moveTo(pts[i][0] - h, pts[i][1]); }
    for (let i = m; i >= 0; i--) ctx.lineTo(pts[i][0] + wf(i / m) / 2, pts[i][1]);
    ctx.closePath(); ctx.fill();
  }
  function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), rot || 0, 0, TAU); ctx.fill(); }
  // closed smooth curve through the midpoints of pts (no straight edges); path only
  function sp(ctx, pts) {
    const n = pts.length, m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], s0 = m(pts[n - 1], pts[0]);
    ctx.moveTo(s0[0], s0[1]);
    for (let i = 0; i < n; i++) { const e = m(pts[i], pts[(i + 1) % n]); ctx.quadraticCurveTo(pts[i][0], pts[i][1], e[0], e[1]); }
    ctx.closePath();
  }
  function smooth(ctx, pts) { ctx.beginPath(); sp(ctx, pts); ctx.fill(); }
  function qb(a, c, b, m) { const r = []; for (let i = 0; i <= m; i++) { const u = i / m, v = 1 - u; r.push([v * v * a[0] + 2 * u * v * c[0] + u * u * b[0], v * v * a[1] + 2 * u * v * c[1] + u * u * b[1]]); } return r; }
  function at(pts, s) { const f = s * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), u = f - i; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u]; }
  const sway = (o, t, k, sc, d) => Math.sin(t * 0.35 + o.ph + (d || 0)) * k * o.amp * sc;

  // trunk that swells into two unequal masses, with a soft lump pushed out low
  function pinchmass(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, pts = spine(o, x, y, L, t, 14, sc, 14), w0 = (12 + L * 0.03) * sc, q = at(pts, 0.7);
    ctx.fillStyle = col(pal, 0); band(ctx, pts, (s) => w0 * (0.4 + 1.2 * Math.pow(Math.sin(s * 2.6 + o.ph), 2)) * (1 - s * 0.4) + 4);
    ctx.fillStyle = col(pal, 2, 0.9); ell(ctx, q[0] + o.dir * w0 * 0.7, q[1], w0 * 0.9, (14 + 10 * o.rnd(3)) * sc, o.dir * 0.4);
  }

  // thick stalk that wanders in a lazy S, swelling at one place, with a lump on its outer flank
  function hookbulb(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, m = 22, st = L / m, w0 = (13 + L * 0.03) * sc, pts = [[x, y - 3]], sw = sway(o, t, 0.2, 1);
    let px = x, py = y - 3;
    for (let q = 1; q <= m; q++) { const s = q / m, h = o.dir * 0.9 * Math.sin(s * 5 + o.ph) + sw * s; px += Math.sin(h) * st; py += Math.cos(h) * st; pts.push([px, py]); }
    ctx.fillStyle = col(pal, 4); band(ctx, pts, (s) => (w0 * (1 - s * 0.6) + w0 * 1.1 * Math.exp(-Math.pow((s - 0.35) / 0.1, 2))) + 2.5 * sc);
    const q = at(pts, 0.72); ctx.fillStyle = col(pal, 6); ell(ctx, q[0] - o.dir * w0 * 0.4, q[1], (8 + 5 * o.rnd(1)) * sc, (11 + 6 * o.rnd(3)) * sc, 0.3);
  }

  // solid trunk swelling at two places, a heavy lump on one flank and a smaller one lower on the other
  function forkrejoin(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, pts = spine(o, x, y, L, t, 10, sc, 14), w = (11 + L * 0.025) * sc, q = at(pts, 0.28), r = at(pts, 0.72);
    ctx.fillStyle = col(pal, 0); band(ctx, pts, (s) => w * (1 - s * 0.6) + 3 + 1.1 * w * Math.exp(-Math.pow((s - 0.27) / 0.12, 2)));
    ctx.fillStyle = col(pal, 1); ell(ctx, q[0] - 1.4 * w, q[1] + 4 * sc, w * 0.9, w * 1.4, -0.4);
    ctx.fillStyle = col(pal, 6); ell(ctx, r[0] + o.dir * w * 1.1, r[1], w * 0.8, w * 1.2, o.dir * 0.5);
  }

  // neck swelling into one sac, fused to a larger sac hung low and off to one side
  function twistband(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, d = o.dir, sw = sway(o, t, 5, sc), w = L * 0.1 + 9 * sc, pts = spine(o, x, y, L * 0.7, t, 6, sc, 8);
    ctx.fillStyle = col(pal, 0); band(ctx, pts, (s) => (7 + 22 * Math.exp(-Math.pow((s - 0.3) / 0.2, 2))) * sc + 3);
    ctx.fillStyle = col(pal, 3, 0.88); ell(ctx, x + d * w * 0.5 + sw, y + L * 0.72, w * 1.1, L * 0.26, -d * 0.3);
  }

  // tall lopsided body from the wash, swelling heavily low on one side
  function slumpmass(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, d = o.dir, sw = sway(o, t, 6, sc), w = L * 0.16 + 8 * sc;
    ctx.fillStyle = col(pal, 5); smooth(ctx, [[x - 6 * sc, y - 6], [x + 6 * sc, y - 6], [x + d * w * 0.5, y + L * 0.25], [x + d * w * 1.5 + sw * 0.6, y + L * 0.6], [x + sw, y + L], [x - d * w * 0.9 + sw * 0.6, y + L * 0.7], [x - d * w * 0.2, y + L * 0.3]]);
    ctx.fillStyle = col(pal, 6); ell(ctx, x - d * w * 0.5, y + L * 0.2, w * 0.4, L * 0.1, d * 0.4);
  }

  // two thick bands from one root that cross over each other, unequal
  function ragtongues(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, a = spine(o, x, y, L, t, 22, sc, 16, 0), b = spine(o, x, y, L * 0.8, t, 22, sc, 16, Math.PI), w = (17 + L * 0.03) * sc;
    ctx.fillStyle = col(pal, 1, 0.92); band(ctx, a, (s) => w * (1 - s * 0.5) + 3);
    ctx.fillStyle = col(pal, 7, 0.88); band(ctx, b, (s) => w * 0.8 * (1 - s * 0.5) + 3);
    const q = at(a, 0.5); ctx.fillStyle = col(pal, 5, 0.9); ell(ctx, q[0], q[1], w * 0.6, w * 0.8, 0.3);
  }

  // three unequal soft masses fused down a crooked line
  function crookedlobes(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, d = o.dir, sw = sway(o, t, 5, sc), w = L * 0.12 + 10 * sc;
    ctx.fillStyle = col(pal, 3); ell(ctx, x, y + L * 0.2, 14 * sc, L * 0.24);
    ctx.fillStyle = col(pal, 4); ell(ctx, x + d * w * 0.6, y + L * 0.52, w * 1.1, L * 0.3, d * 0.3);
    ctx.fillStyle = col(pal, 5); ell(ctx, x - d * w * 0.1 + sw, y + L * 0.84, w * 0.7, L * 0.2, -d * 0.2);
  }

  // soft slab dropping into one heavy tongue, a second tone fused low on the other side
  function webslab(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, sw = sway(o, t, 6, sc), a = 14 * sc, d = o.dir;
    ctx.fillStyle = col(pal, 9, 0.94);
    smooth(ctx, [[x - a, y - 6], [x + a, y - 6], [x + a * 2.2, y + L * 0.3], [x + a * 1.2 + sw * 0.5, y + L * 0.55], [x + a * 0.9 + sw, y + L], [x - a * 0.2 + sw, y + L * 0.7], [x - a * 1.8, y + L * 0.4]]);
    ctx.fillStyle = col(pal, 8, 0.9); ell(ctx, x - d * a * 0.8, y + L * 0.62, a * 0.8, L * 0.2, d * 0.3);
  }

  // swelling stem: width rises and falls in lumps, with one side lobe
  function swellstem(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, pts = spine(o, x, y, L, t, 12, sc, 16), w = (6 + L * 0.03) * sc;
    ctx.fillStyle = col(pal, 3); band(ctx, pts, (s) => (w + w * 1.7 * Math.pow(Math.sin(s * 8 + o.ph), 2)) * (1 - s * 0.55) + 3);
    const q = at(pts, 0.55); ctx.fillStyle = col(pal, 4); ell(ctx, q[0] + o.dir * 9 * sc, q[1] + 4 * sc, 9 * sc, 13 * sc, o.dir * 0.5);
  }

  // one bend: thick band curves hard, a lump at the bend and a soft stub pushed the other way
  function elbow(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, sw = sway(o, t, 5, sc), d = o.dir, k = [x + d * L * 0.28, y + L * 0.38];
    const pts = qb([x, y - 3], [x + d * L * 0.05, y + L * 0.3], k, 8).concat(qb(k, [k[0] - d * L * 0.02, k[1] + L * 0.2], [k[0] - d * L * 0.1 + sw, y + L], 8).slice(1));
    ctx.fillStyle = col(pal, 2); band(ctx, pts, (s) => (16 + L * 0.03) * sc * (1 - s * 0.7) + 3);
    ctx.fillStyle = col(pal, 6); ell(ctx, k[0], k[1], 12 * sc, 12 * sc);
    smooth(ctx, [[k[0], k[1] - 8 * sc], [k[0] + d * L * 0.16, k[1] - 3 * sc], [k[0] + d * L * 0.07, k[1] + 6 * sc], [k[0], k[1] + 9 * sc]]);
  }

  // pinched sack, solid, with a second tone fused on one flank
  function holesack(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, w = L * 0.3 + 6 * sc, sw = sway(o, t, 4, sc);
    ctx.fillStyle = col(pal, 7, 0.94);
    ctx.beginPath();
    ctx.moveTo(x - 4 * sc, y - 3);
    ctx.bezierCurveTo(x - w * 1.3, y + L * 0.25, x - w * 0.6 + sw, y + L * 0.55, x + sw, y + L);
    ctx.bezierCurveTo(x + w * 0.2 + sw, y + L * 0.55, x + w * 1.5, y + L * 0.3, x + 4 * sc, y - 3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = col(pal, 5, 0.85); ell(ctx, x + o.dir * w * 0.6 + sw * 0.5, y + L * 0.42, w * 0.4, L * 0.16, -o.dir * 0.5);
  }

  // broad soft fold across one root, with a heavy swelling band curling over it
  function curlpair(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, w = (15 + L * 0.03) * sc, d = o.dir, sw = sway(o, t, 5, sc), pts = hook(x, y, L, 1.8, -d, 20, sway(o, t, 0.2, 1)), e = pts[20];
    ctx.fillStyle = col(pal, 5, 0.85); smooth(ctx, [[x - 12 * sc, y - 6], [x + 12 * sc, y - 6], [x + d * L * 0.3, y + L * 0.45], [x + d * L * 0.05 + sw, y + L * 0.62], [x - d * L * 0.15, y + L * 0.3]]);
    ctx.fillStyle = col(pal, 1); band(ctx, pts, (s) => w * (0.7 + 1.1 * Math.pow(Math.sin(s * 2.4), 2)) + 3 * sc);
    ctx.fillStyle = col(pal, 3, 0.9); ell(ctx, e[0], e[1] - 6 * sc, w * 0.9, w * 0.7);
  }

  // thick band with three big unequal masses fused to its flanks
  function crustband(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, pts = spine(o, x, y, L, t, 12, sc, 12), wf = (s) => (20 - 9 * s) * sc;
    ctx.fillStyle = col(pal, 0); band(ctx, pts, wf);
    [[3, 1, 20, 14], [6, -1, 14, 20], [9, o.dir, 24, 12]].forEach((f, k) => {
      const q = pts[f[0]]; ctx.fillStyle = col(pal, 1 + k * 2, 0.92); ell(ctx, q[0] + f[1] * wf(f[0] / 12) * 0.6, q[1], f[2] * sc, f[3] * sc, f[1] * 0.4);
    });
  }

  // curving band ending in a heavy mass, one big lump pushed out of its flank
  function lumpband(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, pts = hook(x, y, L, 1.3, o.dir, 14, sway(o, t, 0.2, 1)), e = pts[14], q = at(pts, 0.4), w = (16 + L * 0.02) * sc;
    ctx.fillStyle = col(pal, 8); band(ctx, pts, (s) => w * (1 - s * 0.5) + 3);
    ctx.fillStyle = col(pal, 7); ell(ctx, q[0] - o.dir * w * 0.7, q[1], w * 0.9, w * 1.3, o.dir * 0.3);
    ctx.fillStyle = col(pal, 6, 0.9); ell(ctx, e[0], e[1] - 4 * sc, w * 1.3, w * 0.9, o.dir * 0.4);
  }

  // thick stalk with a swollen knot, a thin tail curling off the knot the other way
  function knotloop(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, pts = hook(x, y, L, 2.2, o.dir, 20, sway(o, t, 0.3, 1)), w = (12 + L * 0.03) * sc, q = at(pts, 0.45);
    ctx.fillStyle = col(pal, 6); band(ctx, pts, (s) => w * (1 - s * 0.7) + 2.5 * sc);
    ctx.fillStyle = col(pal, 5); ell(ctx, q[0], q[1], w * 0.8, w * 1.0, 0.5);
    ctx.fillStyle = col(pal, 3, 0.9); band(ctx, hook(q[0], q[1] + 3, L * 0.7, 2.4, -o.dir, 14, sway(o, t, 0.2, 1, 2)), (s) => w * 0.5 * (1 - s * 0.8) + 2.5 * sc);
  }

  // neck dividing into a big sac and a small sac hung at different heights
  function lobecluster(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, d = o.dir, sw = sway(o, t, 5, sc);
    ctx.fillStyle = col(pal, 7, 0.92); smooth(ctx, [[x - 9 * sc, y - 6], [x + 9 * sc, y - 6], [x + d * 10 * sc, y + L * 0.7], [x - d * 8 * sc, y + L * 0.7]]);
    ctx.fillStyle = col(pal, 5, 0.9); ell(ctx, x + d * 12 * sc + sw, y + L * 0.68, 15 * sc, L * 0.3, d * 0.3);
    ctx.fillStyle = col(pal, 4, 0.9); ell(ctx, x - d * 9 * sc + sw * 0.5, y + L * 0.5, 9 * sc, L * 0.2, -d * 0.3);
  }

  // soft slab with a ragged lower edge, split into two tones
  function shearslab(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, d = o.dir, sh = sway(o, t, 6, sc), a = 14 * sc, e = (i) => 0.8 + 0.5 * o.rnd(i);
    ctx.fillStyle = col(pal, 3);
    smooth(ctx, [[x - a, y - 6], [x + a, y - 6], [x + d * 22 * sc * e(1) + a, y + L * 0.4], [x + a * 0.3 + sh, y + L * 0.95], [x - a * 0.4 + sh, y + L * 0.6], [x - d * 20 * sc * e(2) - a, y + L * 0.7], [x - a * 1.5, y + L * 0.25]]);
    ctx.fillStyle = col(pal, 6); smooth(ctx, [[x + a * 0.8, y - 6], [x + d * 22 * sc * e(1) + a, y + L * 0.4], [x + a * 0.3 + sh, y + L * 0.9], [x + 2 * sc, y + L * 0.4]]);
  }

  // narrow cap with one heavy mass and a small one fused beneath it
  function mossmound(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, d = o.dir;
    ctx.fillStyle = col(pal, 0); ell(ctx, x, y + L * 0.14, 14 * sc + L * 0.05, L * 0.16);
    ctx.fillStyle = col(pal, 3, 0.92); ell(ctx, x + d * 4 * sc + sway(o, t, 3, sc), y + L * 0.5, 13 * sc, L * 0.42, d * 0.1);
    ctx.fillStyle = col(pal, 7, 0.9); ell(ctx, x - d * 15 * sc, y + L * 0.38, 8 * sc, L * 0.24, -d * 0.2);
  }

  // three unequal soft masses drifting down along an arc, tied by a thick core
  function gapring(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, d = o.dir, sw = sway(o, t, 5, sc), pts = spine(o, x, y, L * 0.8, t, 6, sc, 8);
    ctx.fillStyle = col(pal, 9, 0.9); band(ctx, pts, () => 12 * sc + 3);
    [[0, 0.16, 15, 0.3, 8], [0.12, 0.42, 12, 0.34, 9], [0.28, 0.78, 8, 0.24, 6]].forEach((f, i) => {
      ctx.fillStyle = col(pal, f[4], 0.9);
      ell(ctx, x + d * f[0] * L * 0.9 + sw * f[1], y + L * f[1] + 2, f[2] * sc + L * 0.05, L * f[3] * 0.5, d * (0.3 - i * 0.4));
    });
  }

  // fat stem with three rounded lumps on random sides, uneven in size
  function spurs(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, pts = spine(o, x, y, L, t, 10, sc, 10);
    ctx.fillStyle = col(pal, 6); band(ctx, pts, (s) => (15 - 6 * s) * sc);
    ctx.fillStyle = col(pal, 5);
    for (let k = 0; k < 3; k++) {
      const i = 2 + k * 3 + Math.floor(o.rnd(k + 60) * 2), q = pts[i], d = o.rnd(i + 40) < 0.5 ? -1 : 1, l = (10 + 16 * o.rnd(i)) * sc;
      ell(ctx, q[0] + d * l * 0.5, q[1] + l * 0.2 + Math.sin(t * 0.5 + i) * 2 * sc, l * 0.8, (7 + 6 * o.rnd(i + 5)) * sc, d * 0.5);
    }
  }

  // tall lumpy body with one heavy shoulder pushed out at mid height, on one side only
  function strands(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, d = o.dir, sw = sway(o, t, 5, sc);
    ctx.fillStyle = col(pal, 1, 0.85); smooth(ctx, [[x - 9 * sc, y - 6], [x + 9 * sc, y - 6], [x + d * 8 * sc, y + L * 0.3], [x + d * 5 * sc + sw * 0.6, y + L * 0.65], [x + sw, y + L], [x - d * 9 * sc + sw * 0.5, y + L * 0.6], [x - d * 7 * sc, y + L * 0.25]]);
    ctx.fillStyle = col(pal, 4, 0.8); smooth(ctx, [[x + d * 4 * sc, y + L * 0.28], [x + d * 26 * sc, y + L * 0.38], [x + d * 22 * sc + sw * 0.5, y + L * 0.62], [x + d * 4 * sc, y + L * 0.58]]);
  }

  // thick wave swelling and pinching, ending in a blunt lopsided mass
  function growwave(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, pts = [];
    for (let i = 0; i <= 18; i++) { const s = i / 18; pts.push([x + Math.sin(s * 6 + t * 0.5 + o.ph) * (2 + 14 * s * s) * sc * (0.5 + 0.5 * o.amp), y - 3 + (L + 3) * s]); }
    ctx.fillStyle = col(pal, 9); band(ctx, pts, (s) => (8 + L * 0.02 + 18 * Math.pow(Math.sin(s * 4.2 + o.ph * 0.5), 2)) * sc + 3);
    const e = pts[18]; ctx.fillStyle = col(pal, 3); ell(ctx, e[0] + o.dir * 6 * sc, e[1] - 6 * sc, 20 * sc, 14 * sc, o.dir * 0.5);
  }

  // wide heap of three fused masses, broad at the top
  function blobheap(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, d = o.dir, br = sway(o, t, 3, sc);
    ctx.fillStyle = col(pal, 4, 0.92); ell(ctx, x, y + L * 0.25, 26 * sc, L * 0.3);
    ctx.fillStyle = col(pal, 6, 0.9); ell(ctx, x + d * 12 * sc + br, y + L * 0.65, 16 * sc, L * 0.3, d * 0.3);
    ctx.fillStyle = col(pal, 5, 0.88); ell(ctx, x - d * 14 * sc + br * 0.6, y + L * 0.5, 9 * sc, L * 0.2, -d * 0.3);
  }

  // tall blob with a wobbling outline and three deep bites, hung from the wash
  function lumpmass(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, R = L * 0.25 + 6 * sc, cy = y + R * 1.5, sw = sway(o, t, 4, sc), bites = [0.4 + 1.2 * o.rnd(1), 2.2 + 1.0 * o.rnd(2), 3.6 + 1.2 * o.rnd(3)];
    ctx.fillStyle = col(pal, 7, 0.94); ctx.beginPath();
    for (let q = 0; q <= 40; q++) {
      const a = q / 40 * TAU;
      let r = R * (1 + 0.18 * Math.sin(3 * a + o.ph) + 0.12 * Math.sin(5 * a + o.ph * 2));
      bites.forEach((b) => { r *= 1 - 0.38 * Math.exp(-Math.pow(a - b, 2) / 0.04); });
      const px = x + Math.cos(a) * r * 0.75 + sw * (1 + Math.sin(a)) * 0.5, py = Math.max(y - 3, cy + Math.sin(a) * r * 1.5);
      if (q) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = col(pal, 1, 0.85); ell(ctx, x + sw * 0.5 - o.dir * R * 0.2, cy + R * 0.2, R * 0.2, R * 0.3, 0.4);
  }

  // thick trunk that divides low into a thick short branch and a thin long one curling away
  function twinfuse(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, pts = spine(o, x, y, L * 0.45, t, 10, sc, 10), q = pts[10], w = (16 + L * 0.02) * sc;
    ctx.fillStyle = col(pal, 0, 0.92); band(ctx, pts, (s) => w * (1 - s * 0.3) + 2);
    ctx.fillStyle = col(pal, 3, 0.92); band(ctx, hook(q[0], q[1] + 3, L * 0.4, 1.6, o.dir, 12, sway(o, t, 0.2, 1)), (s) => w * 0.7 * (1 - s * 0.7) + 2.5 * sc);
    ctx.fillStyle = col(pal, 5, 0.9); band(ctx, hook(q[0], q[1] + 3, L * 0.55, 2.4, -o.dir, 16, sway(o, t, 0.2, 1, 2)), (s) => w * 0.4 * (1 - s * 0.8) + 2.5 * sc);
  }

  const A = (n, f, l, n2) => GenCeilKinds.add("plant", n, f, { len: l, n: n2 });
  A("pinchmass", pinchmass, [0.16, 0.28]);
  A("hookbulb", hookbulb, [0.08, 0.16]);
  A("forkrejoin", forkrejoin, [0.16, 0.26]);
  A("twistband", twistband, [0.15, 0.27]);
  A("slumpmass", slumpmass, [0.05, 0.1]);
  A("ragtongues", ragtongues, [0.16, 0.28]);
  A("crookedlobes", crookedlobes, [0.08, 0.15]);
  A("webslab", webslab, [0.06, 0.12]);
  A("swellstem", swellstem, [0.16, 0.28]);
  A("elbow", elbow, [0.07, 0.14]);
  A("holesack", holesack, [0.05, 0.11]);
  A("curlpair", curlpair, [0.15, 0.27]);
  A("crustband", crustband, [0.08, 0.16]);
  A("lumpband", lumpband, [0.07, 0.15]);
  A("knotloop", knotloop, [0.06, 0.12]);
  A("lobecluster", lobecluster, [0.05, 0.1]);
  A("shearslab", shearslab, [0.05, 0.11]);
  A("mossmound", mossmound, [0.04, 0.09]);
  A("gapring", gapring, [0.06, 0.12]);
  A("spurs", spurs, [0.08, 0.16]);
  A("strands", strands, [0.16, 0.28]);
  A("growwave", growwave, [0.16, 0.28]);
  A("blobheap", blobheap, [0.06, 0.13]);
  A("lumpmass", lumpmass, [0.05, 0.11]);
  A("twinfuse", twinfuse, [0.08, 0.17]);
})();
