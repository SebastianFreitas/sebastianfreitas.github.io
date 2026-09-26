window.GenCorrupt = (function () {
  "use strict";

  let geo = null, geoKey = "";

  function hash(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function ringDull(ctx, x, y, r) {
    ctx.lineWidth = 0.28 * r;
    ctx.strokeStyle = "#5a4c4e";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#6e5e60";
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI * 0.6, Math.PI * 1.4);
    ctx.stroke();
  }

  function ringMagic(ctx, x, y, r) {
    ringDull(ctx, x, y, r);
    ctx.fillStyle = "#e8c9a0";
    const a = Math.PI * 1.25;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 0.18 * r, 0, Math.PI * 2);
    ctx.fill();
  }

  // hex chain-mail field, laid out like level 1 of genesis-chains.js
  function hexField(ctx, r, magicP, seed, x0, y0, w, h) {
    const spacing = 1.6 * r;
    const rowH = spacing * 0.87;
    const rows = Math.ceil(h / rowH) + 2;
    const cols = Math.ceil(w / spacing) + 2;
    for (let row = -1; row < rows; row++) {
      const y = y0 + row * rowH;
      const xOff = (((row % 2) + 2) % 2) * spacing / 2;
      for (let col = -1; col < cols; col++) {
        const x = x0 + col * spacing + xOff;
        const i = row * 1000 + col;
        const magic = hash(i * seed + 7) < magicP;
        if (magic) ringMagic(ctx, x, y, r);
        else ringDull(ctx, x, y, r);
      }
    }
  }

  // nearest field-ring grid cell to a point, same grid math as hexField
  function nearestRing(px, py, r) {
    const spacing = 1.6 * r, rowH = spacing * 0.87;
    let best = null, bestD = Infinity;
    const rowGuess = Math.round(py / rowH);
    for (let row = rowGuess - 1; row <= rowGuess + 1; row++) {
      const xOff = (((row % 2) + 2) % 2) * spacing / 2;
      const colGuess = Math.round((px - xOff) / spacing);
      for (let col = colGuess - 1; col <= colGuess + 1; col++) {
        const x = col * spacing + xOff, y = row * rowH;
        const dx = x - px, dy = y - py, d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = { x, y, row, col }; }
      }
    }
    return best;
  }

  function build(W, H) {
    const m = Math.min(W, H);
    const r = 0.035 * m;
    const pts = [
      { x: 0.35 * W, y: 0.55 * H },
      { x: 0.58 * W, y: 0.62 * H },
      { x: 0.78 * W, y: 0.50 * H },
    ];
    const targets = [];
    for (let k = 0; k < pts.length; k++) {
      const nr = nearestRing(pts[k].x, pts[k].y, r);
      if (!nr) continue;
      if (nr.y < 0.30 * H) continue;
      const cx = nr.x, cy = nr.y;
      const i = nr.row * 1000 + nr.col;
      let dx = cx - 0.5 * W, dy = cy - 0.5 * H;
      let dlen = Math.hypot(dx, dy);
      if (dlen < 1e-6) { dx = 0; dy = -1; dlen = 1; }
      const off = { x: dx / dlen, y: dy / dlen };
      const edgeY = cy < H / 2 ? 0 : H;
      const hashes = [];
      for (let j = 0; j < 10; j++) hashes.push({ j, h: hash(i * 31 + j * 13 + 7) });
      hashes.sort((a, b) => a.h - b.h);
      const survivorJ = hashes[0].j;
      const greyOrder = hashes.slice(1).map(o => o.j);
      targets.push({ cx, cy, r, i, off, edgeY, survivorJ, greyOrder });
    }
    const roofJitter = [];
    for (let idx = 0; idx <= 12; idx++) roofJitter.push(hash(idx * 3.7 + 11) * 2 - 1);
    geo = { m, r, targets, roofJitter };
  }

  function drawBlade(ctx, g, tgt) {
    const width = 0.03 * g.m;
    const y0 = Math.min(tgt.edgeY, tgt.cy), y1 = Math.max(tgt.edgeY, tgt.cy);
    ctx.fillStyle = "#1a0e10";
    ctx.fillRect(tgt.cx - width / 2, y0, width, y1 - y0);
    ctx.fillStyle = "#3a2226";
    ctx.fillRect(tgt.cx - width / 2, y0, width * 0.35, y1 - y0);
  }

  function drawHand(ctx, ox, oy, r) {
    ctx.lineWidth = 0.8 * r;
    ctx.strokeStyle = "#1a0e10";
    ctx.beginPath();
    ctx.arc(ox, oy, 1.6 * r, Math.PI * 0.5 - 1.3, Math.PI * 0.5 + 1.3);
    ctx.stroke();
  }

  function drawTarget(ctx, g, tgt, t, k) {
    const { cx, cy, r } = tgt;
    const t0 = 0.2 + 0.4 * k;
    const tc = 2.2 + 0.35 * k;

    if (t < t0) return;

    if (t < tc) {
      const step = Math.min(6, Math.floor((t - t0) / 0.25));
      ctx.lineWidth = 0.28 * r;
      ctx.strokeStyle = "#c23a3a";
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI, Math.PI + (step / 6) * Math.PI * 2);
      ctx.stroke();
      return;
    }

    const ox = cx + tgt.off.x * 0.4 * r, oy = cy + tgt.off.y * 0.4 * r;

    // links cut: gap left behind, filled with backdrop colour
    ctx.fillStyle = "#4a141c";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    if (t < tc + 0.3) drawBlade(ctx, g, tgt);

    if (t < 3.6) {
      ctx.lineWidth = 0.28 * r;
      ctx.strokeStyle = "#c23a3a";
      ctx.beginPath();
      ctx.arc(ox, oy, r, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    // return: the ring breaks into 10 dots
    const step = Math.min(3, Math.floor((t - 3.6) / 0.3));
    const greyFrac = [0.25, 0.5, 0.75, 0.9][step];
    const radFrac = [1, 0.7, 0.4, 0.15][step];
    const greyCount = Math.min(9, Math.round(greyFrac * 10));
    const greySet = tgt.greyOrder.slice(0, greyCount);

    if (t < 5.0) drawHand(ctx, ox, oy, r);

    for (let j = 0; j < 10; j++) {
      const isGrey = greySet.indexOf(j) !== -1;
      const angle = (j / 10) * Math.PI * 2 + tgt.i * 0.001;
      let dx = ox + Math.cos(angle) * r * radFrac;
      let dy = oy + Math.sin(angle) * r * radFrac;
      if (isGrey && step === 3) dy += 0.1 * g.m;

      if (t >= 5.0 && j === tgt.survivorJ) {
        const s = Math.min(4, Math.floor((t - 5.0) / 0.3));
        const arrival = 2 + k;
        if (s >= arrival) continue;
        dy = dy * (1 - (s + 1) / (arrival + 1));
      }

      ctx.fillStyle = isGrey ? "#b3aaa6" : "#e04848";
      ctx.beginPath();
      ctx.arc(dx, dy, isGrey ? 0.24 * r : 0.22 * r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawRoof(ctx, g, t, W, H) {
    const n = g.targets.length;
    let count = 0;
    if (t >= 5.0) {
      const s = Math.min(4, Math.floor((t - 5.0) / 0.3));
      for (let k = 0; k < n; k++) if (s >= (2 + k)) count++;
    }
    if (count <= 0) return;
    const h = 0.06 * H * count;

    ctx.fillStyle = "#7a1c22";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    const N = 12;
    for (let idx = N; idx >= 0; idx--) {
      const x = W * idx / N;
      const jitter = g.roofJitter[idx] * 0.008 * H;
      ctx.lineTo(x, h + jitter);
    }
    ctx.closePath();
    ctx.fill();

    const shadeY0 = h * 0.6, shadeY1 = h;
    const shadeX0 = 0.35 * W;
    ctx.fillStyle = "#5a1419";
    ctx.fillRect(shadeX0, shadeY0, W - shadeX0, shadeY1 - shadeY0);
  }

  function draw(ctx, W, H, t, reduced) {
    if (!W || !H) return;
    if (reduced) t = 99;
    if (t < 0) t = 0;

    ctx.fillStyle = "#2a0a10";
    ctx.fillRect(0, 0, W, H);
    if (window.GenSoup) {
      try { GenSoup.drawBackdrop(ctx, W, H); } catch (e) { /* skip backdrop */ }
    }

    const key = W + "x" + H;
    if (key !== geoKey) { geoKey = key; build(W, H); }
    if (!geo) return;

    hexField(ctx, geo.r, 0.08, 1.7, 0, 0, W, H);

    for (let k = 0; k < geo.targets.length; k++) drawTarget(ctx, geo, geo.targets[k], t, k);

    drawRoof(ctx, geo, t, W, H);
  }

  return { draw };
})();
