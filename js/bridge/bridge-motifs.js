/* js/bridge/bridge-motifs.js — a few moving elements lifted from the archived
   gamedev scenes (planet.js, zones.js, storm.js), drawn behind a beacon.
   No backgrounds, no fills of the sky, no images: just the things that moved.
   draw(art, ctx, x, y, {t, dt, alpha, W, H}); unknown key draws nothing.
   State per key is seeded once here; time comes from t/dt only. */
window.BridgeMotifs = (function () {
  // the archive planet themes (core lit/shadow, ring rgb)
  const THEMES = [
    { core: ["#c43a2e", "#3a0609"], ring: "104,170,32" },   // voidscape
    { core: ["#6fa8cc", "#173f5e"], ring: "93,146,181" },   // heavylight
    { core: ["#b4c788", "#3c4a30"], ring: "138,137,105" },  // conclusus
    { core: ["#5fd88a", "#123a22"], ring: "90,140,110" },   // zero
  ];

  function mulberry(a) {
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // smooth 1-D noise in 0..1 (cheap, no allocation)
  function hash(n, s) { const v = Math.sin(n * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); }
  function vnoise(x, s) {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    const a = hash(i, s);
    return a + (hash(i + 1, s) - a) * u;
  }

  const S = {};

  function seed() {
    const r = mulberry(5);
    S.embers = [];
    for (let i = 0; i < 18; i++) S.embers.push({
      bx: (r() * 2 - 1) * 1.0, sway: 0.03 + r() * 0.08, ph: r(), sp: 0.05 + r() * 0.07,
      size: r() < 0.3 ? 3 : 2, col: r() < 0.5 ? "255,132,104" : "104,170,32",
    });
    S.shards = [{ x: -0.85, y: -0.35 }, { x: 0.8, y: 0.15 }, { x: -0.3, y: 0.7 }];
    S.motes = [];
    for (let i = 0; i < 10; i++) S.motes.push({
      ang: r() * 6.28, rad: 0.5 + r() * 0.5, sp: (r() < 0.5 ? -1 : 1) * (0.1 + r() * 0.15),
      size: r() < 0.3 ? 3 : 2, ph: r() * 6.28,
    });
    S.boxes = [];
    for (let i = 0; i < 3; i++) S.boxes.push({
      x: (i - 1) * 0.7 + (r() - 0.5) * 0.2, y: (r() - 0.5) * 0.6, a: r() * 6.28, i,
    });
    S.flick = 0.7;
  }
  seed();

  function drawVoidscape(ctx, x, y, u, t, A) {
    const w = u * 0.9, top = y - u * 0.9, L = u * 1.8;
    ctx.save();
    for (let i = 0; i < S.embers.length; i++) {
      const p = S.embers[i];
      let k = (p.ph + t * p.sp) % 1; if (k < 0) k += 1;
      const a = Math.min(1, k * 4, (1 - k) * 3);
      ctx.globalAlpha = A * 0.7 * a;
      ctx.fillStyle = "rgb(" + p.col + ")";
      ctx.fillRect(Math.round(x + p.bx * w + Math.sin(t * 0.7 + p.ph * 6.28) * p.sway * u),
        Math.round(top + L - k * L), p.size, p.size);
    }
    ctx.fillStyle = "rgb(100,170,27)";
    const h = u * 0.1;
    for (let i = 0; i < S.shards.length; i++) {
      const s = S.shards[i];
      ctx.globalAlpha = A * (0.30 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.9 + i * 2.1))) * 0.8;
      const cx = x + s.x * w, cy = y + s.y * u * 0.6 + Math.sin(t * 0.5 + i) * u * 0.05;
      ctx.beginPath();
      ctx.moveTo(cx, cy - h); ctx.lineTo(cx + h * 0.75, cy); ctx.lineTo(cx, cy + h); ctx.lineTo(cx - h * 0.75, cy);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // HeavyLight: a few lamp sprites drifting and short light pushes sliding sideways
  function drawLamp(ctx, x, y, u, t, A) {
    const sp = window.HeavyLightSprites && HeavyLightSprites.HSPR && HeavyLightSprites.HSPR.h_lamp;
    const px = Math.max(2, Math.round(u / 70));
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const cx = x + (i - 1) * u * 0.75, cy = y + u * 0.35 + Math.sin(t * 0.7 + i * 2.1) * u * 0.06;
      if (!sp) break;
      const pal = HeavyLightSprites.HPAL;
      ctx.globalAlpha = A * 0.3;
      const ox = Math.round(cx - sp.w * px / 2), oy = Math.round(cy - sp.h * px / 2);
      for (let j = 0; j < sp.px.length; j++) {
        const c = sp.px.charCodeAt(j) - 97;
        if (c < 0 || c >= pal.length) continue;
        ctx.fillStyle = pal[c];
        ctx.fillRect(ox + (j % sp.w) * px, oy + Math.floor(j / sp.w) * px, px, px);
      }
    }
    ctx.fillStyle = "rgb(255,210,120)";
    for (let i = 0; i < 4; i++) {
      let k = (t * 0.12 + i * 0.25) % 1;
      ctx.globalAlpha = A * 0.3 * Math.min(1, k * 4, (1 - k) * 4);
      ctx.fillRect(Math.round(x - u * 0.9 + k * u * 1.8), Math.round(y - u * 0.4 + (i % 2 ? u * 0.55 : 0) + i * 3), Math.round(u * 0.14), 2);
    }
    ctx.restore();
  }

  // Conclusus: the hero and his planted shadow idling on small slabs, motes between
  function drawConclusus(ctx, x, y, u, t, A) {
    const px = Math.max(2, Math.round(u / 45));
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const sx = x + (i - 1) * u * 0.8 - u * 0.2, sy = y + u * 0.3 + (i === 1 ? -u * 0.12 : 0) + Math.sin(t * 0.45 + i * 1.9) * px;
      ctx.globalAlpha = A * 0.3;
      ctx.fillStyle = "#6a7a52";
      ctx.fillRect(Math.round(sx), Math.round(sy), Math.round(u * 0.4), px * 2);
      ctx.fillStyle = "rgb(247,255,197)";
      ctx.fillRect(Math.round(sx), Math.round(sy), Math.round(u * 0.4), px);   // the grass-top light
      if (i !== 1) {                                       // a figure; the shade twin is green and lags half a beat
        const bob = Math.floor(t / 0.7 + (i === 2 ? 0.5 : 0)) % 2 ? px : 0;
        ctx.fillStyle = i === 0 ? "#c9c9b8" : "#5a9a4a";
        const fx = Math.round(sx + u * 0.15), fy = Math.round(sy - px * 7 + bob);
        ctx.fillRect(fx, fy + px * 2, px * 3, px * 5 - bob);
        ctx.fillRect(fx, fy, px * 3, px * 2);
      }
    }
    ctx.fillStyle = "rgb(247,255,197)";
    for (let i = 0; i < S.motes.length; i++) {
      const m = S.motes[i], a = m.ang + t * m.sp;
      ctx.globalAlpha = A * (0.15 + 0.15 * Math.sin(t * 0.8 + m.ph));
      ctx.fillRect(Math.round(x + Math.cos(a) * m.rad * u * 0.95), Math.round(y + Math.sin(a) * m.rad * u * 0.5), 2, 2);
    }
    ctx.restore();
  }

  function drawZero(ctx, x, y, u, t, dt, A) {
    // flicker: lantern-style noise plus a little jitter
    let f = 0.5 + ((Math.sin(t * 7) + (vnoise(t * 3.5, 7) * 2 - 1)) * 0.5) * 0.5;
    S.flick += (f - S.flick) * Math.min(1, dt * 10);
    const b = Math.max(0.2, Math.min(1, S.flick));
    const sz = Math.max(8, Math.round(u * 0.2));
    for (let i = 0; i < S.boxes.length; i++) {
      const o = S.boxes[i];
      const dx = (vnoise(t * 0.15 + i * 3.7, 11 + i) * 2 - 1) * u * 0.12;
      const dy = (vnoise(t * 0.15 + i * 5.1, 41 + i) * 2 - 1) * u * 0.12;
      const bx = x + o.x * u * 0.9 + dx, by = y + o.y * u + dy;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate((vnoise(t * 0.1 + i * 2.3, 71 + i) * 2 - 1) * 0.6 + o.a * 0.1);
      ctx.globalAlpha = A * 0.6 * (0.4 + 0.6 * b);
      ctx.fillStyle = "#1d2a1e";
      ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
      ctx.strokeStyle = "rgb(192,255,186)";
      ctx.lineWidth = 2;
      ctx.strokeRect(-sz / 2, -sz / 2, sz, sz);
      ctx.restore();
    }
  }

  function draw(art, ctx, x, y, o) {
    if (!ctx || !o) return;
    const A = Number.isFinite(o.alpha) ? o.alpha : 1;
    if (!(A >= 0.02)) return;
    const t = Number.isFinite(o.t) ? o.t : 0;
    const dt = Number.isFinite(o.dt) ? Math.min(o.dt, 0.1) : 0.016;
    const base = Math.min(o.W || 1440, o.H || 900);
    const u = Math.max(80, Math.min(240, base * 0.2));   // ~ 1.5 to 2 beacon heights across
    if (art === "voidscape") drawVoidscape(ctx, x, y, u, t, A);
    else if (art === "heavylight") drawLamp(ctx, x, y, u, t, A);
    else if (art === "conclusus") drawConclusus(ctx, x, y, u, t, A);
    else if (art === "sector-zero") drawZero(ctx, x, y, u, t, dt, A);
  }

  return { draw };
})();
