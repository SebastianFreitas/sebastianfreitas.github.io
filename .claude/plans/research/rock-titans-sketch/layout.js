/* layout.js: the rock titans' sketch layout v6 (D40 rock mountains, D39 single pieces protruding) (plan rock-titans, phase 1). Units: H of the screen; x from the titan's root,
   y from the feet line (0.64 H), down positive. Pieces are roster beings drawn at m*hf*H, dx/dy the piece's foot point, rot in
   radians about that point; filler polys are flat materials behind the pieces. shears: [pusher titan, piece, struck titan, piece]
   per crash (spires>rings, rings>blocks, blocks>sheets, sheets>blocks). */
window.TitanLayout = (function () {
  const Q = Math.PI / 2;
  // snaps: 1 piece a snap for five-piece titans; the seven-piece ones push a pair in two snaps
  const S5 = [1, 2, 3, 4, 5], S4 = [1, 2, 3, 4], S7 = [1, 2, 2, 3, 4, 4, 5];
  function pcs(list, snaps) { return list.map((q, i) => ({ kind: q[0], m: q[1], dx: q[2], dy: q[3], rot: q[4], z: q[5], snap: snaps[i], cut: q[6] })); }
  // cuts: a slanted-edge box in fractions of the piece's own unrotated ink box (u across, v down); each keeps ONE part of the old one
  const box = (u0, v0, u1, v1, d) => { d = (d || 0.06) * (v1 - v0); return [[u0, v0], [u1, v0 + d], [u1, v1], [u0, v1 - d]]; };
  // ribs: uneven broken bands, never paired or even
  const ribs = (x, y, w, hs, gaps, snap) => { const out = []; let yy = y; hs.forEach((h, i) => { const a = i % 2 ? 0.012 : -0.01; const ww = w * (0.6 + 0.17 * ((i * 3) % 4)), xs = x + (i % 3 - 1) * 0.02; out.push({ kind: "rib", snap: snap, poly: [[xs - ww / 2 + a, yy], [xs + ww * 0.1, yy - 0.006], [xs + ww / 2 - a * 2, yy + 0.004], [xs + ww / 2 - 0.01, yy + h * 0.6], [xs + ww / 2 - 0.02, yy + h], [xs - ww / 2 + 0.01, yy + h - 0.003]] }); yy += h + gaps[i % gaps.length]; }); return out; };
  // body: the rock mountain the pieces stick out of; rocks drawn at size*H (sx, sy stretch), front ones over the pieces; tentacles hang from a floating mass
  const rk = (rock, x, dy, size, sx, sy, rot, front) => ({ rock: rock, x: x, dy: dy, size: size, sx: sx, sy: sy, rot: rot || 0, front: !!front });
  const tn = (x, dy, len, w, curl) => ({ x: x, dy: dy, len: len, w: w, curl: curl });
  return {
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
})();
