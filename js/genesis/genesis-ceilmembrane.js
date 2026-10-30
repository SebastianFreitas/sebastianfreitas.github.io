// Genesis ceiling: the navy lobe cloud's body as one eldritch membrane. Two seeded painters, B2 (pinched pleat strips: strips pinch to a waist off-centre then
// splay, two swap order half-way) and B4 (nested sagging pleats: nested lobes with offset centres, one ring in front on the left and behind on the right).
// build(kind, x, y, w, h, seed) fits the body into the box (x, y, w, h) in the cloud's own px (unmirrored) and returns { p, ops, creases }: p = the one connected
// silhouette (hit tests, bounds, hang points), ops = fills and rims in paint order as Path2D, creases = fold lines that fade out inside the body.
// draw(ctx, m, rimEnd) paints it, clipped to p. Near-black fill, cold navy rims and ocean-blue fold lines.
(function () {
  const D0 = "#03050a", D1 = "#060a14", D2 = "#0a1222", D3 = "#0e1a33";
  const NAVY = "#1d3f80", OCEAN = "#3f86b5", PALE = "#8cc4dc";

  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function poly(pts, close) {
    const p = new Path2D();
    for (let i = 0; i < pts.length; i++) p[i ? 'lineTo' : 'moveTo'](pts[i][0], pts[i][1]);
    if (close) p.closePath();
    return p;
  }
  function addLine(p, pts) { for (let i = 0; i < pts.length; i++) p[i ? 'lineTo' : 'moveTo'](pts[i][0], pts[i][1]); }

  // B2: seven strips from a flat top, pinching toward x = 38 (design px, 300 wide) and splaying again; strips 3 and 4 swap order half-way down
  function B2(r, M) {
    const N = 7, px = 38, X = [], ops = [], creases = [], strips = [], sil = new Path2D();
    for (let i = 0; i <= N; i++) X.push(-150 + i * 300 / N);
    const sx = (i, t, sw) => { const a = X[i], m = px + (X[i] - px) * 0.62, b = px + (X[sw ? sw : i] - px) * 1.02; return (1 - t) * (1 - t) * a + 2 * t * (1 - t) * m + t * t * b; };
    const swp = { 3: 4, 4: 3 };
    for (let i = 0; i < N; i++) {
      const len = 112 + 34 * Math.sin(i * 1.9 + r() * 2) + (i === 5 ? 20 : 0), l = [], rr = [];
      for (let s = 0; s <= 24; s++) { const t = s / 24, y = -10 + t * (len + 10); l.push(M(sx(i, t, swp[i]), y)); rr.push(M(sx(i + 1, t, swp[i + 1]), y + (i % 2 ? 6 : -4) * t)); }
      const mid = M((l[24][0] + rr[24][0]) / 2 + (i % 2 ? 6 : -6), len + 18 + 6 * (i % 3));
      const hem = [l[24], mid, [l[24][0] + 2 * (mid[0] - l[24][0]), l[24][1]]];
      const body = poly(l.concat([mid], rr.slice().reverse()), true), rim = new Path2D();
      addLine(rim, l); addLine(rim, hem);
      sil.addPath(body);
      strips.push({ fill: body, rim, color: i % 3 === 1 ? D2 : (i % 2 ? D0 : D1) });
    }
    const topY = M(0, 50)[1], at = (i, clip) => ops.push({ fill: strips[i].fill, rim: strips[i].rim, color: strips[i].color, clip });
    strips.forEach((s, i) => { if (i !== 3 && i !== 4) at(i, null); });
    at(4, { y: -1e4, h: topY + 1e4 }); at(3, { y: -1e4, h: topY + 1e4 });
    at(3, { y: topY, h: 1e4 }); at(4, { y: topY, h: 1e4 });
    creases.push({ pts: [M(-90, 26), M(-70, 52), M(-84, 80)], col: PALE }, { pts: [M(120, 20), M(96, 46), M(106, 70)], col: OCEAN });
    return { p: sil, ops, creases, x0: -156, x1: 156, y0: -10, y1: 196 };
  }

  // B4: four nested sagging lobes (offset centres, wobbly edges); lobe 2 in front of lobe 3 on the left and behind it on the right
  function B4(r, M) {
    const R = [150, 118, 88, 58], dy = [0, 14, 22, 40], dx = [0, 18, -14, 12], fills = [D1, D2, D0, D3], lobes = [], rims = [], full = [], ops = [], creases = [], sil = new Path2D();
    const ph = r() * 6;
    for (let k = 0; k < 4; k++) {
      const o = [];
      for (let i = 0; i <= 60; i++) { const a = Math.PI * i / 60, w = 1 + 0.09 * Math.sin(5 * a + k * 1.9 + ph) + 0.05 * Math.sin(9 * a + k);
        o.push([dx[k] + Math.cos(a) * R[k] * w, dy[k] - 6 + Math.sin(a) * (R[k] * 0.62) * w]); }
      const pts = o.map((q) => M(q[0], q[1]));
      pts.unshift(M(o[0][0], -12)); pts.push(M(o[o.length - 1][0], -12));
      lobes.push(pts);
      full.push(poly(pts, true));
      const rim = new Path2D(); addLine(rim, pts.slice(2, -2)); rims.push(rim);
      sil.addPath(full[k]);
    }
    const at = (k, clip) => ops.push({ fill: full[k], rim: rims[k], color: fills[k], clip });
    const cx0 = M(0, 0)[0], big = 1e4;
    at(0, null); at(1, null); at(3, null); at(2, null);
    at(2, { x: cx0 - big, w: big, y: -big, h: 2 * big });
    at(2, { x: cx0, w: big, y: -big, h: 2 * big }); at(3, { x: cx0, w: big, y: -big, h: 2 * big });
    creases.push({ pts: [M(0, 30), M(5, 60), M(-2, 95)], col: PALE });
    for (let k = 1; k < 4; k++) creases.push({ pts: lobes[k].slice(12 + k * 4, 26 + k * 4), col: PALE });
    return { p: sil, ops, creases, x0: -176, x1: 180, y0: -12, y1: 106 };
  }

  const KINDS = { B2, B4 };

  const sm = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

  // fits the body into the box (x, y, w, h); the top rows narrow so the band's cut line crosses a soft shoulder, not a wide flat edge
  function build(kind, x, y, w, h, seed) {
    const r = rng(Math.floor(seed * 7919) + 11);
    const dims = kind === 'B4' ? { x0: -176, x1: 180, y0: -12, y1: 106 } : { x0: -156, x1: 156, y0: -10, y1: 196 };
    const kx = w / (dims.x1 - dims.x0), ky = h / (dims.y1 - dims.y0), xc = (dims.x0 + dims.x1) * 0.5;
    const m = KINDS[kind](r, (px, py) => [x + w * 0.5 + (px - xc) * kx * (0.55 + 0.45 * sm((py - dims.y0) / (dims.y1 - dims.y0) / 0.5)), y + (py - dims.y0) * ky]);
    m.k = Math.max(0.7, Math.min(1.4, h / 140));
    m.g = null;
    for (let i = 0; i < m.creases.length; i++) m.creases[i].path = poly(m.creases[i].pts, false);
    return m;
  }

  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")"; }

  // paint the body in the cloud's own px (the caller has translated / mirrored and clipped at the band); everything is clipped to the body's silhouette
  function draw(ctx, m, rimEnd) {
    const k = m.k;
    ctx.save(); ctx.clip(m.p); ctx.lineJoin = "round"; ctx.lineCap = "round";
    for (let i = 0; i < m.ops.length; i++) {
      const o = m.ops[i];
      ctx.save();
      if (o.clip) { ctx.beginPath(); ctx.rect(o.x === undefined ? -1e4 : o.x, o.y, o.w === undefined ? 2e4 : o.w, o.h); ctx.clip(); }
      ctx.fillStyle = o.color; ctx.fill(o.fill);
      ctx.strokeStyle = NAVY; ctx.globalAlpha = 0.75; ctx.lineWidth = 3.4 * k; ctx.stroke(o.rim);
      ctx.globalAlpha = 1; ctx.strokeStyle = OCEAN; ctx.lineWidth = 1.3 * k; ctx.stroke(o.rim);
      ctx.restore();
    }
    ctx.lineWidth = 1.2;
    for (let i = 0; i < m.creases.length; i++) {
      const c = m.creases[i];
      if (!c.g) { const a = c.pts[0], b = c.pts[c.pts.length - 1]; c.g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]); c.g.addColorStop(0, c.col); c.g.addColorStop(1, hexA(rimEnd || "#061c48", 0)); }
      ctx.strokeStyle = c.g; ctx.stroke(c.path);
    }
    ctx.restore();
  }

  window.GenCeilMembrane = { build, draw };
})();
