/* genesis-paint.js — the drawing helpers and the terrain profiles:
   hard-edged shading, world-anchored sample points, and the height
   fields for Rex the Surface and the mainland. */
window.GenPaint = (function () {
  const G = window.Gen;
  const { hash1, smooth, clamp, mix, ridge } = Util;
  const { litShade } = Paint;
  const { DECK, MAIN_U, MAIN_HALF, REX_BANDS, REX_WEST, REX_EAST, sx } = G;

  // a terrain silhouette lit from the left: flat fill, then a hard-edged lit
  // cap offset up-left, clipped to the shape, so the cap reads thick on
  // rising (left-facing) slopes and vanishes on steep right-facing slopes
  function fillRidge(ctx, pts, bottom, lit, shade) {
    const path = new Path2D();
    if (pts.length < 2) return path;
    path.moveTo(pts[0][0], bottom);
    for (const p of pts) path.lineTo(p[0], p[1]);
    path.lineTo(pts[pts.length - 1][0], bottom);
    path.closePath();
    Paint.fillRidge(ctx, path, lit, shade, G.H * 0.05, G.H * 0.035);
    return path;
  }
  // world-anchored sample points along [left, right] so terrain doesn't
  // slide through the noise field as the camera moves
  function gridXs(left, right, step) {
    const du = step / G.W;
    const k0 = Math.floor((G.cam + (left - G.W * 0.5) / G.W) / du);
    const k1 = Math.ceil((G.cam + (right - G.W * 0.5) / G.W) / du);
    const out = [];
    for (let k = k0; k <= k1; k++) {
      const wu = k * du;
      out.push([sx(wu), wu]);
    }
    return out;
  }
  function mixHex(a, b, u) {
    u = Math.min(1, Math.max(0, u));
    const ca = parseInt(a.slice(1), 16), cb = parseInt(b.slice(1), 16);
    const ar = (ca >> 16) & 255, ag = (ca >> 8) & 255, ab = ca & 255;
    const br = (cb >> 16) & 255, bg = (cb >> 8) & 255, bb = cb & 255;
    const r = Math.round(ar + (br - ar) * u);
    const g = Math.round(ag + (bg - ag) * u);
    const bch = Math.round(ab + (bb - ab) * u);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + bch).toString(16).slice(1);
  }
  // a hard-edged glow: three stepped flat discs instead of a gradient
  function flatGlow(ctx, x, y, r, rgb, a) {
    if (a < 0.01 || r <= 0) return;
    ctx.fillStyle = `rgba(${rgb},${a * 0.14})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    ctx.fillStyle = `rgba(${rgb},${a * 0.20})`;
    ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, 6.283); ctx.fill();
    ctx.fillStyle = `rgba(${rgb},${a * 0.30})`;
    ctx.beginPath(); ctx.arc(x, y, r * 0.34, 0, 6.283); ctx.fill();
  }

  // a flat sphere lit from the left, with a small offset highlight core
  function flatSphere(ctx, x, y, r, lit, shade, core, a) {
    ctx.globalAlpha = Math.min(1, Math.max(0, a));
    litShade(ctx, () => { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); }, x + r * 0.3, lit, shade);
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(x - r * 0.32, y - r * 0.30, r * 0.28, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1;
  }
  function rexLandHeight(wu, b) {
    const spanU = REX_EAST - REX_WEST;
    const u = (wu - REX_WEST) / spanU;
    if (u <= 0) return 0;
    const entry = smooth(clamp(u / 0.11, 0, 1));
    const drift = Math.min(u, 1.15) * b.drift;
    const r = Math.max(0, (Math.min(u, 1.08) - b.rampAt) / (1 - b.rampAt + 0.0001));
    const ramp = Math.pow(r, 2.15) * b.climb;
    const relief = ridge(wu * 2.8, b.seed + 7) * b.amp * 1.65
                 + ridge(wu * 7.6, b.seed) * b.amp
                 + ridge(wu * 18.5, b.seed + 21) * b.amp * 0.4;
    return Math.max(0, (b.base + drift + ramp + relief) * entry);
  }
  /* what the war tore into the east of the land. Driven by scar,
     which never goes back down, so nothing built on it ever moves. */
  function eastJag(wu, scar) {
    if (scar < 0.02 || wu <= MAIN_U - 0.06) return 0;
    const east = clamp((wu - MAIN_U) / MAIN_HALF, 0, 1);
    const cell = 0.038;
    const i = Math.floor(wu / cell);
    const f = wu / cell - i;
    const pk = hash1(i * 917 + 19);
    const peak = pk > 0.22 ? (pk - 0.12) : 0;
    const tent = Math.max(0, 1 - Math.abs(f - 0.48) / 0.46);
    const jag = Math.pow(tent, 1.35) * peak * 0.28;
    const n = ridge(wu * 22, 8801) * 0.07 + ridge(wu * 48, 8819) * 0.035;
    return (jag + Math.max(0, n - 0.015)) * Math.pow(east, 0.72) * scar;
  }

  function mainDome(wu) {
    const u = (wu - (MAIN_U - MAIN_HALF)) / (MAIN_HALF * 2);
    if (u <= 0 || u >= 1) return 0;
    const cap = Math.pow(Math.max(0, Math.sin(u * Math.PI)), 0.46);
    const lump = 0.78 + 0.22 * ridge(wu * 8.4, 2701) + 0.10 * (ridge(wu * 19, 2719) - 0.5);
    return Math.max(0, cap * lump);
  }
  function mainHeight(wu, scar) {
    const dome = mainDome(wu);
    if (dome <= 0) return 0;
    const n = (ridge(wu * 5.6, 4409) - 0.38) * 0.07
            + (ridge(wu * 13.2, 4417) - 0.5) * 0.036
            + (ridge(wu * 29, 4431) - 0.5) * 0.018;
    return Math.max(0, (0.138 + n) * dome + eastJag(wu, scar || 0));
  }
  function mainBandHeight(wu, b) {
    const dome = mainDome(wu);
    if (dome <= 0) return 0;
    const n = (ridge(wu * b.cell, b.seed) - 0.40) * b.amp
            + (ridge(wu * b.cell * 2.7, b.seed + 13) - 0.5) * b.amp * 0.45;
    return Math.max(0, (b.base + n) * dome);
  }
  function mainSurfY(wu, rise, scar) {
    return mix(G.H + 28, G.H * DECK - mainHeight(wu, scar) * G.H, rise);
  }

  const ease  = (p, k) => mix(p, smooth(p), k == null ? 1 : k);
  const easeV = (p, k) => mix(1, 6 * p * (1 - p), k == null ? 1 : k);

  function rexSurfY(u) { return G.H * 1.16 - rexLandHeight(u, REX_BANDS[0]) * G.H; }

  /* a figure's feet: on the surface at that point, not on a fixed line */
  function standY(lane, wu, rise, scar) {
    return mainSurfY(wu == null ? MAIN_U : wu, rise == null ? 1 : rise,
                     scar == null ? 1 : scar)
         - 12 - (lane || 0) * G.H * 0.075;
  }

  return {
    fillRidge, gridXs, mixHex, flatGlow, flatSphere, ease, easeV, rexLandHeight, eastJag,
    mainDome, mainHeight, mainBandHeight, mainSurfY, rexSurfY, standY,
  };
})();
