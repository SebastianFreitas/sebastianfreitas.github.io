/* The creeper: a fixed frame of dead thorn briars along the screen edges (three canvases: far, mid, near), homepage only.
   Painted once per size (seeded, so the same shapes every load); scrolling only changes each layer's transform + opacity:
   the frame starts pushed out past the edges and faint, then closes in and darkens toward the footer. */
(function () {
  const root = document.querySelector(".creep");
  if (!root) return;
  const layers = [
    { fill: "#070a0c", p: 0.7 },     /* far: slightly darker than the page, busiest */
    { fill: "#030506", p: 2.5 },     /* mid */
    { fill: "#010203", p: 6 }        /* near: near-black, fewest and biggest */
  ].map(function (L, i) { L.cv = root.children[i]; L.ctx = L.cv.getContext("2d"); return L; });
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  let W = 0, H = 0, u = 1, rnd = null;

  function seeded(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function between(a, b) { return a + (b - a) * rnd(); }

  /* ---- drawing ---- */
  /* a tapered stem as one flat polygon: walks a bending path, hooked thorns along it, side branches, an optional curling tendril tip.
     o: bend (wobble), thorn (steps between thorns, 0 = none), branch (chance per step), depth (branch generations), curl (+1 / -1 / 0), from (where the curl starts, 0-1) */
  function strand(ctx, x, y, ang, len, w, o) {
    const step = Math.max(3, 7 * u), n = Math.max(4, Math.ceil(len / step));
    const dir = o.curl || 0, from = o.from || 0.7, m = Math.max(1, n * (1 - from));
    const pts = [], thorns = [], kids = [];
    let turn = 0, since = 0, side = rnd() < 0.5 ? 1 : -1;
    for (let i = 0; i <= n; i++) {
      const t = i / n, cu = dir && t > from ? (t - from) / (1 - from) : 0;
      const wi = Math.max(0.55 * u, w * Math.pow(1 - t, 0.9));
      pts.push({ x: x, y: y, a: ang, w: wi });
      turn += (rnd() - 0.5) * o.bend;
      turn *= 0.9;
      ang += turn + (cu ? dir * (14 / m) * cu : 0);
      const st = step * (1 - 0.75 * cu);
      x += Math.cos(ang) * st; y += Math.sin(ang) * st;
      if (o.thorn && ++since >= o.thorn && wi > 0.9 * u && t < 0.92) { since = 0; thorns.push({ i: i, side: side }); side = -side; }
      if (o.depth > 0 && t > 0.15 && t < 0.85 && rnd() < o.branch) kids.push({ x: x, y: y, a: ang + (rnd() < 0.5 ? -1 : 1) * between(0.5, 1.1), t: t, w: wi });
    }
    ctx.beginPath();
    const R = [];
    pts.forEach(function (p, i) {
      const nx = -Math.sin(p.a), ny = Math.cos(p.a);
      if (i) ctx.lineTo(p.x + nx * p.w / 2, p.y + ny * p.w / 2); else ctx.moveTo(p.x + nx * p.w / 2, p.y + ny * p.w / 2);
      R.push([p.x - nx * p.w / 2, p.y - ny * p.w / 2]);
    });
    for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath();
    ctx.fill();
    thorns.forEach(function (th) {          /* hooked thorn: base on the stem, tip curling forward */
      const p = pts[th.i], tx = Math.cos(p.a), ty = Math.sin(p.a), nx = -ty * th.side, ny = tx * th.side;
      const L = Math.max(3.5 * u, p.w * 2.2), b = p.w * 0.5 + 0.3 * u;
      ctx.beginPath();
      ctx.moveTo(p.x - tx * b, p.y - ty * b);
      ctx.quadraticCurveTo(p.x + nx * L * 0.9, p.y + ny * L * 0.9, p.x + nx * L * 0.7 + tx * L * 1.1, p.y + ny * L * 0.7 + ty * L * 1.1);
      ctx.quadraticCurveTo(p.x + nx * L * 0.35 + tx * b, p.y + ny * L * 0.35 + ty * b, p.x + tx * b, p.y + ty * b);
      ctx.closePath();
      ctx.fill();
    });
    kids.forEach(function (k) {
      strand(ctx, k.x, k.y, k.a, len * between(0.25, 0.5) * (1 - k.t * 0.5), k.w * 0.6,
        { bend: o.bend * 1.3, thorn: o.thorn, branch: o.branch * 0.6, depth: o.depth - 1, curl: rnd() < 0.5 ? (rnd() < 0.5 ? 1 : -1) : 0, from: 0.6 });
    });
  }

  /* bottom-edge height profile: tall at the two corners (a bit taller on the right), low and tangled in the middle */
  function tall(x) { const t = Math.abs(2 * x / W - 1); return H * (W < 700 ? 1.5 : 1) * (0.23 + ((x < W / 2 ? 0.55 : 0.6) - 0.23) * Math.pow(t, 2)); }
  function cornerX() { return rnd() < 0.5 ? W * Math.pow(rnd(), 2) * 0.4 : W - W * Math.pow(rnd(), 2) * 0.4; }
  function curlDir() { return rnd() < 0.5 ? 1 : -1; }

  /* a dense mass of thorn briars and dead stalks packing the bottom edge, plus looping runners over the middle third.
     k: density, wm: stem width, near: hug the corners, loops: how many runners */
  function bottom(ctx, k, wm, near, loops) {
    const d = W < 700 ? 2 : 1, spikes = Math.round((W / 9) * k * d), stalks = Math.round((W / 12) * k * d), briars = Math.round((W / 55) * k);
    for (let i = 0; i < spikes; i++) {          /* short dense spikes: the top of the mass */
      const x = near ? cornerX() : rnd() * W;
      strand(ctx, x, H + 6, -Math.PI / 2 + between(-0.35, 0.35), tall(x) * between(0.75, 1.1), between(2, 3.4) * u * wm,
        { bend: 0.06, thorn: 3, branch: 0.04, depth: 1, curl: 0 });
    }
    for (let i = 0; i < stalks; i++) {
      const x = near ? cornerX() : rnd() * W, mid = 1 - Math.abs(2 * x / W - 1);
      strand(ctx, x, H + 6, -Math.PI / 2 + between(-0.4, 0.4), tall(x) * between(0.5, 1.1), between(1.8, 3) * u * wm,
        { bend: 0.1 + 0.1 * mid, thorn: 3, branch: 0.1, depth: 1, curl: 0 });
    }
    for (let i = 0; i < briars; i++) {
      const x = near ? cornerX() : rnd() * W, mid = 1 - Math.abs(2 * x / W - 1);
      strand(ctx, x, H + 8, -Math.PI / 2 + between(-0.5, 0.5), tall(x) * between(0.8, 1.15), between(4, 8) * u * wm,
        { bend: 0.14 + 0.16 * mid, thorn: 2, branch: 0.22, depth: 2, curl: rnd() < 0.6 ? curlDir() : 0, from: 0.65 });
    }
    for (let i = 0; i < loops; i++) {           /* arching runners that curl into open loops above the low middle */
      const x = W * between(0.36, 0.64);
      strand(ctx, x, H + 8, -Math.PI / 2 + between(-0.3, 0.3), H * between(0.4, 0.52), between(3.5, 5.5) * u * wm,
        { bend: 0.1, thorn: 3, branch: 0.05, depth: 1, curl: i % 2 ? 1 : -1, from: 0.5 });
    }
  }

  /* scratchy near-vertical climbers up the full height of both side edges: a narrow band on the left, a wider, busier one on the right */
  function sides(ctx, k, wm) {
    const n = Math.round(16 * k);
    for (let i = 0; i < n; i++) {
      const right = i % 3 !== 0, y = H * (1.05 - rnd() * 1.1), band = Math.max(22, W * (right ? 0.12 : 0.05)), x = between(-4, band) ;
      const len = H * between(0.18, 0.4);
      strand(ctx, right ? W - x : x, y, -Math.PI / 2 + between(-0.35, 0.35), len, between(2.2, 4) * u * wm,
        { bend: 0.2, thorn: 2, branch: 0.12, depth: 1, curl: rnd() < 0.3 ? curlDir() : 0, from: 0.7 });
    }
  }

  /* long thin shoots from the top-right corner reaching down-left (the first ends about 37% of the width in, 40% down), a few big loose loops low on the right, a few strands top-left */
  function corners(ctx, k, wm, shoots) {
    for (let i = 0; i < Math.round(4 * k); i++) {
      const far = i < shoots, x0 = W + 5, y0 = -5 + rnd() * H * 0.06;
      const tx = far ? W * (i ? between(0.66, 0.78) : 0.58) : W * between(0.8, 0.93), ty = far ? H * (i ? between(0.28, 0.38) : 0.4) : H * between(0.2, 0.4);
      const dx = tx - x0, dy = ty - y0;
      strand(ctx, x0, y0, Math.atan2(dy, dx) + (i ? between(-0.08, 0.08) : 0), Math.hypot(dx, dy) * (far ? 0.95 : between(0.8, 1)),
        (far ? between(3, 4.5) : between(5, 8)) * u * wm, { bend: 0.05, thorn: far ? 4 : 3, branch: far ? 0.06 : 0.16, depth: 1, curl: far ? 0 : curlDir(), from: 0.7 });
    }
    for (let i = 0; i < Math.round(3 * k); i++) {
      strand(ctx, W + 4, H * between(0.5, 0.92), Math.PI + between(0.1, 0.8), W * between(0.12, 0.22), between(3, 5) * u * wm,
        { bend: 0.1, thorn: 3, branch: 0, depth: 0, curl: i % 2 ? 1 : -1, from: 0.35 });
    }
    for (let i = 0; i < Math.round(2 * k); i++) {
      strand(ctx, -4, H * rnd() * 0.08 - 4, between(0.35, 1.1), W * between(0.07, 0.15), between(3, 6) * u * wm,
        { bend: 0.12, thorn: 3, branch: 0.1, depth: 1, curl: curlDir(), from: 0.6 });
    }
  }

  /* far layer only: a soft darkening into the corners and the bottom edge, so the true bottom falls away into black */
  function shade(ctx) {
    const g = ctx.createLinearGradient(0, H * 0.76, 0, H);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.92)");
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.76, W, H * 0.24);
    const r = Math.min(W * 0.32, H * 0.75);
    [[0, 0], [W, 0], [0, H], [W, H]].forEach(function (c) {
      const rg = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], r);
      rg.addColorStop(0, "rgba(0,0,0,0.75)"); rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg; ctx.fillRect(c[0] ? W - r : 0, c[1] ? H - r : 0, r, r);
    });
  }

  function paint() {
    W = window.innerWidth; H = window.innerHeight;
    u = Math.min(1.2, Math.max(0.45, W / 2000));
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    layers.forEach(function (L, i) {
      L.cv.width = Math.round(W * dpr); L.cv.height = Math.round(H * dpr);
      const ctx = L.ctx;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rnd = seeded(1234 + i * 977);
      if (i === 0) shade(ctx);
      ctx.fillStyle = L.fill;
      if (i === 0) { bottom(ctx, 1.1, 1, false, 2); sides(ctx, 1.9, 1); corners(ctx, 1.6, 1, 3); }
      else if (i === 1) { bottom(ctx, 0.5, 1.4, false, 2); sides(ctx, 1, 1.3); corners(ctx, 1, 1.3, 2); }
      else { bottom(ctx, 0.2, 2.2, true, 1); sides(ctx, 0.4, 2); corners(ctx, 0.4, 2, 0); }
    });
  }

  /* ---- scroll ---- */
  /* page strength s: 0 where the hero stops covering the viewport, 1 at the page bottom; each layer follows s^p (far gentle, near steep), so Work is faint, Experience mid-way and only the footer full.
     Landmarks are measured once (load, debounced resize, body height change), never per scroll event. */
  const hero = document.getElementById("bridge-hero");
  let raf = 0, timer = 0, start = 0, max = 0;
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function measure() {
    start = hero ? hero.getBoundingClientRect().bottom + window.scrollY - window.innerHeight : 0;
    max = document.documentElement.scrollHeight - window.innerHeight;
  }
  function update() {
    raf = 0;
    const y = window.scrollY, covered = y <= start;
    root.style.visibility = covered ? "hidden" : "visible";
    if (covered) return;
    const span = max - start, s = clamp01((y - start) / (span > 60 ? span - 60 : span || 1));
    layers.forEach(function (L) {
      const t = Math.pow(s, L.p);
      L.cv.style.opacity = t.toFixed(3);
      L.cv.style.transform = reduce.matches ? "" : "scale(" + (1.12 - 0.12 * t).toFixed(4) + ")";
    });
  }
  function queue() { if (!raf) raf = requestAnimationFrame(update); }
  function remeasure() { measure(); queue(); }
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("load", remeasure);
  window.addEventListener("resize", function () {
    clearTimeout(timer);
    timer = setTimeout(function () { paint(); remeasure(); }, 200);
  });
  if (window.ResizeObserver) {
    let h = document.body.offsetHeight;
    new ResizeObserver(function () {
      if (document.body.offsetHeight !== h) { h = document.body.offsetHeight; remeasure(); }
    }).observe(document.body);
  }
  paint();
  measure();
  update();
  window.Creep = { paint: paint, update: update };
})();
