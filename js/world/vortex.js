/* js/world/vortex.js — drawVortex: a flat cloud mass with a swirled hole cut out for something in the void to show through; reusable */
(function () {
  const { P, F, setA } = window.World;

  function vh(n) {
    const h = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
    return h - Math.floor(h);
  }

  const VORTEX_LAYERS = [
    { hole: 0.98, reach: 0.22, lobes: 7, twist: 0.9, spin: 0.05,  lit: "#3a4866", shade: "#232d45" },
    { hole: 1.35, reach: 0.20, lobes: 6, twist: 0.8, spin: 0.035, lit: "#28324c", shade: "#1a2235" },
    { hole: 1.8,  reach: 0.18, lobes: 5, twist: 0.7, spin: 0.022, lit: "#1c2438", shade: "#141b2a" },
    { hole: 2.4,  reach: 0.16, lobes: 4, twist: 0.6, spin: 0.012, lit: "#151c2b", shade: "#101620" },
  ];

  function frac(v) {
    return v - Math.floor(v);
  }

  function layerPath(x, y, R, L, i, seed, outerR, tt) {
    const path = new Path2D();

    const N = 120;
    for (let k = 0; k < N; k++) {
      const th = (k / N) * 6.283;
      const ro = outerR * (1 - 0.05 * (VORTEX_LAYERS.length - 1 - i)) *
        (1 + 0.04 * Math.sin(5 * th + seed + i) + 0.07 * Math.abs(Math.sin(14 * th + seed * 2 + i)) + 0.035 * Math.abs(Math.sin(31 * th + seed * 3 + i)));
      const px = x + Math.cos(th) * ro;
      const py = y + Math.sin(th) * ro;
      if (k === 0) path.moveTo(px, py);
      else path.lineTo(px, py);
    }
    path.closePath();

    const M = 240;
    for (let k = 0; k < M; k++) {
      const th = 6.283 - (k / M) * 6.283;
      const s = frac((L.lobes * th) / 6.283 + vh(seed * 13 + i));
      const u = 1 - s;
      const g = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.6)), 1.5);
      const bill = 0.06 * (1 - Math.abs(Math.sin(L.lobes * 3 * th + i))) + 0.03 * (1 - Math.abs(Math.sin(L.lobes * 7 * th + i * 2)));
      const rf = L.hole * (1 + L.reach * g + bill);
      const a = th + tt * L.spin + L.twist * (rf / L.hole - 1) * 2;
      const px = x + Math.cos(a) * R * rf;
      const py = y + Math.sin(a) * R * rf;
      if (k === 0) path.moveTo(px, py);
      else path.lineTo(px, py);
    }
    path.closePath();

    return path;
  }

  function drawVortex(x, y, R, o) {
    o = o || {};
    const seed = o.seed ?? 1;
    const outer = o.outer ?? 4.6;
    const layers = o.layers ?? VORTEX_LAYERS;
    const alpha = o.alpha ?? 1;
    const puffs = o.puffs ?? 12;

    const { ctx, t } = F;
    const tt = Util.reduced() ? 0 : t;
    if (alpha <= 0) return;

    for (let i = 0; i < layers.length; i++) {
      const L = layers[i];
      const path = layerPath(x, y, R, L, i, seed, outer * R, tt);

      setA(alpha);
      ctx.fillStyle = L.lit;
      ctx.fill(path);

      ctx.save();
      ctx.clip(path);
      ctx.translate(x, y);
      ctx.scale(1.07, 1.07);
      ctx.translate(-x, -y);
      ctx.fillStyle = L.shade;
      ctx.fill(path);
      ctx.restore();

      if (i === 0) {
        for (let j = 0; j < puffs; j++) {
          const p0 = vh(seed * 31 + j);
          const a0 = vh(seed * 31 + j + 100) * 6.283;
          const ps = vh(seed * 31 + j + 200);
          const u = frac(p0 + tt * 0.04);
          const rf = layers[0].hole * (1 + 0.9 * (1 - u * u));
          const a = a0 + tt * 0.05 + 2.2 * u;
          const s = R * (0.05 + 0.05 * ps) * (1 - 0.7 * u);
          const cx = x + Math.cos(a) * R * rf;
          const cy = y + Math.sin(a) * R * rf;

          const puffPath = new Path2D();
          puffPath.moveTo(cx - s * 0.8 + s * 0.7, cy);
          puffPath.arc(cx - s * 0.8, cy, s * 0.7, 0, 6.283);
          puffPath.moveTo(cx + s, cy - s * 0.4);
          puffPath.arc(cx, cy - s * 0.4, s, 0, 6.283);
          puffPath.moveTo(cx + s * 0.9 + s * 0.65, cy + s * 0.1);
          puffPath.arc(cx + s * 0.9, cy + s * 0.1, s * 0.65, 0, 6.283);

          setA(alpha);
          ctx.fillStyle = layers[1].lit;
          ctx.fill(puffPath);
        }
      }
    }
    setA(1);
  }

  P.drawVortex = drawVortex;
  P.VORTEX_LAYERS = VORTEX_LAYERS;
})();
