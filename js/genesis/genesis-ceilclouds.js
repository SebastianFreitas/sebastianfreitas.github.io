/* Registry of the Genesis ceiling's clouds (spec 41; one hand-sketched design since spec 47). A kind is
   { name, aspect, draw(ctx, x, y, s, seed, t, before), anchors(seed) }: (x, y) the cloud's top-left, s its width in px, height s * aspect.
   The one kind, "sketch", is three big flat opaque layers like the owner's drawing: a back layer (highest, widest, lumpy top), a middle
   layer (peeks out below it over a broad strip) and a front layer (about 60% of the width, offset right, sagging lowest on its left end). Each is one flat tone
   (CEILCLOUD: [back, middle, front]) with a smooth organic outline (closed quadratic curve through hand-placed control points, nudged
   per seed by up to 1% of the size). No rim light, no ellipse, no saw-tooth.
   Each layer sways on its own: a slow offset in x and y (0.8-1.6% of the width in x, 0.6-1.1% in y, its own phase and period per
   layer and per seed). before(li, dx, dy), when given, is called just before layer li is filled with that layer's current offset in px,
   so the caller can draw the objects hanging from it (the layer then covers their roots).
   anchors(seed) -> { u, v, l } (0..1 of width / height, l the layer index) on the exposed underside of each layer, at least 0.1 of the
   height inside its fill, so a hanging object that moves with its layer's offset roots into solid fill at any t. Geometry is built once
   per seed and cached as number arrays; drawing allocates nothing. deck(seed, n) -> n kinds. */
(function () {
  "use strict";
  const KINDS = [], CAP = 48, TAU = Math.PI * 2;
  const FALL = ["#061c48", "#164436", "#382b43"];

  function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  // control points (u, v) per layer, read off the sketch; v may run past 0 (the back's top is cut by the screen edge)
  const SHAPES = [
    [0, 0.3, 0.05, 0.1, 0.3, 0, 0.6, 0.02, 0.9, 0.05, 1, 0.2, 1, 0.5, 0.95, 0.6, 0.8, 0.58, 0.5, 0.6, 0.28, 0.57, 0.1, 0.62, 0.01, 0.52],
    [0.16, 0.55, 0.25, 0.47, 0.45, 0.48, 0.65, 0.45, 0.8, 0.47, 0.9, 0.54, 0.9, 0.64, 0.8, 0.72, 0.6, 0.74, 0.42, 0.73, 0.3, 0.8, 0.2, 0.78, 0.15, 0.67],
    [0.36, 0.7, 0.5, 0.64, 0.68, 0.66, 0.84, 0.65, 0.93, 0.7, 0.92, 0.8, 0.82, 0.86, 0.66, 0.88, 0.52, 0.93, 0.4, 0.92, 0.34, 0.83]
  ];
  // two back anchors on its exposed ends, one middle anchor left of the front, three front anchors along its underside
  const ANCHORS = [{ u: 0.07, v: 0.47, l: 0 }, { u: 0.95, v: 0.46, l: 0 }, { u: 0.2, v: 0.64, l: 1 }, { u: 0.45, v: 0.8, l: 2 }, { u: 0.64, v: 0.77, l: 2 }, { u: 0.82, v: 0.75, l: 2 }];

  function build(kd, seed) {
    const layers = [];
    for (let li = 0; li < SHAPES.length; li++) {
      const sh = SHAPES[li], p = new Float32Array(sh.length), k = seed * 5.1 + li * 31.7;
      for (let i = 0; i < sh.length; i++) p[i] = sh[i] + (hash(k + i * 1.37) - 0.5) * 0.02;
      layers.push({ p: p, n: sh.length / 2, ax: 0.008 + 0.008 * hash(k + 1), ay: 0.006 + 0.005 * hash(k + 2), px: hash(k + 3) * TAU, py: hash(k + 4) * TAU,
        wx: 0.18 + 0.2 * hash(k + 5), wy: 0.18 + 0.2 * hash(k + 6) });
    }
    return { layers: layers };
  }

  function geom(kd, seed) {
    let g = kd.cache.get(seed);
    if (!g) { if (kd.cache.size >= CAP) kd.cache.clear(); g = build(kd, seed); kd.cache.set(seed, g); }
    return g;
  }

  function add(name, aspect) {
    const kd = { id: KINDS.length + 1, name: name, aspect: aspect, cache: new Map() };
    kd.anchors = function () { return ANCHORS; };
    kd.draw = function (ctx, x, y, s, seed, t, before) {
      const g = geom(kd, seed), h = s * aspect, C = (window.GenEldPal && window.GenEldPal.CEILCLOUD) || FALL;
      for (let li = 0; li < g.layers.length; li++) {
        const L = g.layers[li], p = L.p, n = L.n;
        const dx = L.ax * s * Math.sin(t * L.wx + L.px), dy = L.ay * s * Math.sin(t * L.wy + L.py);
        if (before) before(li, dx, dy);
        const ox = x + dx, oy = y + dy;
        ctx.beginPath();
        ctx.moveTo(ox + (p[2 * n - 2] + p[0]) * 0.5 * s, oy + (p[2 * n - 1] + p[1]) * 0.5 * h);
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          ctx.quadraticCurveTo(ox + p[i * 2] * s, oy + p[i * 2 + 1] * h, ox + (p[i * 2] + p[j * 2]) * 0.5 * s, oy + (p[i * 2 + 1] + p[j * 2 + 1]) * 0.5 * h);
        }
        ctx.closePath();
        ctx.fillStyle = C[li];
        ctx.fill();
      }
    };
    KINDS.push(kd);
    return kd;
  }
  function list() { return KINDS.slice(); }
  function deck(seed, n) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(KINDS[0]);
    return out;
  }

  add("sketch", 0.4);

  window.GenCeilClouds = { add: add, list: list, deck: deck };
})();
