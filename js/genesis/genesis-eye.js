/* genesis-eye.js — the "eye" beat: a tier-3 eye, never whole: a lidless
   arc cut by the frame edge. It shows only through what happens to the
   dots: no beam, no line, no visible wave. Held steps only. The colour
   taken out of the souls reads as energy: it snaps to sparks that crackle
   and gather at a power point; the grey dust falls and piles into one
   mound at bottom centre. The four surviving blues never turn. */
window.GenEye = (function () {
  "use strict";

  const PAL = {
    arc: "#120407",
    iris: "#1c060a",
    dust: "#5a4a4c",
    dustShade: "#3e3234",
    spark: "#d8707a",
    sparkCore: "#ffb0a8",
    crackle: "#e88a90",
    flash: "#f4c6c0",
    coreLit: "#b8525a",
    coreShade: "#8e3037",
    floor: 0.84,
  };

  function hash(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  /* pileCut: the top N rows of the mound are left undrawn (for the
     genesis-circle beat, which grows a universe there instead) */
  let pileCut = 0;
  function setPileCut(k) { pileCut = Math.max(0, k | 0); }

  /* the grey pile: one squat mound centred at K = (0.5 W, 0.84 H), rows
     stacked bottom-up, row 0 (bottom, widest) holds the most dust, each
     row above tapers toward a point, floor of 1 per row; wider than tall */
  function pileLayout(n, W, H) {
    const m = Math.min(W, H);
    const s = Math.max(2, 0.012 * m);
    const maxRow0 = Math.max(1, Math.floor((0.20 * m) / s));
    let rows = Math.max(1, Math.round((0.07 * m) / s));
    let row0 = maxRow0, caps = null;
    for (;;) {
      for (let r0 = 1; r0 <= maxRow0; r0++) {
        const c = [];
        let sum = 0;
        for (let k = 0; k < rows; k++) {
          const ck = Math.max(1, Math.ceil(r0 * (1 - k / rows)));
          c.push(ck);
          sum += ck;
        }
        if (sum >= n) { row0 = r0; caps = c; break; }
      }
      if (caps) break;
      rows++;
    }
    return { s, rows, row0, caps };
  }

  function pileSlot(i, n, W, H) {
    const K = { x: W * 0.5, y: H * PAL.floor };
    const { s, caps } = pileLayout(n, W, H);
    let row = 0, before = 0;
    while (row < caps.length - 1 && before + caps[row] <= i) {
      before += caps[row];
      row++;
    }
    const cnt = caps[row] || 1;
    const pos = i - before;
    const x = K.x + (pos - (cnt - 1) / 2) * s;
    const y = K.y - row * s * 0.85;
    return { x, y };
  }

  /* which row a settled slot falls on, and how many rows the mound has;
     row 0 is the bottom (widest), the highest row index is the top */
  function pileRow(i, n, W, H) {
    const { caps } = pileLayout(n, W, H);
    let row = 0, before = 0;
    while (row < caps.length - 1 && before + caps[row] <= i) {
      before += caps[row];
      row++;
    }
    return { row, rows: caps.length };
  }

  function pile(W, H) {
    const n = window.GenSoup ? GenSoup.finalReds(W, H).length : 0;
    const K = { x: W * 0.5, y: H * PAL.floor };
    if (n === 0) return { x: K.x, y: K.y, w: 0, h: 0 };
    const { s, rows, row0 } = pileLayout(n, W, H);
    return { x: K.x, y: K.y, w: row0 * s, h: rows * s * 0.85 };
  }

  function pool(W, H) {
    return { x: W * 0.30, y: H * 0.24 };
  }

  function drawDiamond(ctx, cx, cy, h, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - h);
    ctx.lineTo(cx + h, cy);
    ctx.lineTo(cx, cy + h);
    ctx.lineTo(cx - h, cy);
    ctx.closePath();
    ctx.fill();
  }

  /* the turn-flash: two thin crossed diamonds, a hard 4-point star */
  function drawStar(ctx, cx, cy, r) {
    const hl = r * 2.2, hw = r * 0.35;
    ctx.fillStyle = PAL.flash;
    ctx.beginPath();
    ctx.moveTo(cx, cy - hl);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hl);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - hl, cy);
    ctx.lineTo(cx, cy - hw);
    ctx.lineTo(cx + hl, cy);
    ctx.lineTo(cx, cy + hw);
    ctx.closePath();
    ctx.fill();
  }

  /* short jagged crackle off a spark: 3 rays, 2 segments each, angles
     re-hashed on every 0.15s held step */
  function drawCrackle(ctx, idx, cx, cy, s, t, m) {
    const step = Math.floor(t / 0.15);
    ctx.save();
    ctx.strokeStyle = PAL.crackle;
    ctx.lineWidth = Math.max(1, m * 0.003);
    for (let k = 0; k < 3; k++) {
      const seed = idx * 7 + k * 13 + step;
      const ang = hash(seed) * Math.PI * 2;
      const total = s * (1.6 + hash(seed + 500) * 0.6);
      const bend = (hash(seed + 900) - 0.5) * 1.2;
      const mx = cx + Math.cos(ang) * total * 0.5;
      const my = cy + Math.sin(ang) * total * 0.5;
      const ex = mx + Math.cos(ang + bend) * total * 0.5;
      const ey = my + Math.sin(ang + bend) * total * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(mx, my);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* the power point: the pool where every spark's energy gathers,
     an emitter with stepped flat glow rings and hard rays */
  function drawPowerPoint(ctx, x, y, m, t) {
    if (t < 5.05) return;
    const ps = Math.min(3, Math.floor((t - 5.05) / 0.45));
    const rc = m * [0.012, 0.02, 0.028, 0.034][ps];
    const step = t >= 99 ? 0 : Math.floor(t / 0.15) % 2;

    ctx.save();
    ctx.fillStyle = PAL.spark;
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.arc(x, y, rc * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(x, y, rc * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = PAL.crackle;
    const inner = rc * 1.1, base = rc * 0.25;
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2;
      const len = rc * (k % 2 === step ? 1.1 : 0.6);
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      const ix = x + Math.cos(ang) * inner, iy = y + Math.sin(ang) * inner;
      const ox = x + Math.cos(ang) * (inner + len), oy = y + Math.sin(ang) * (inner + len);
      ctx.beginPath();
      ctx.moveTo(ix + nx * base * 0.5, iy + ny * base * 0.5);
      ctx.lineTo(ix - nx * base * 0.5, iy - ny * base * 0.5);
      ctx.lineTo(ox, oy);
      ctx.closePath();
      ctx.fill();
    }

    GenSoup.shaded(ctx, x, y, rc, PAL.coreLit, PAL.coreShade, m);

    const cs = rc * 0.3;
    ctx.fillStyle = PAL.sparkCore;
    ctx.fillRect(x - cs, y - cs, cs * 2, cs * 2);
  }

  function draw(ctx, W, H, t, reduced) {
    if (!W || !H || !window.GenSoup) return;
    if (t < 0) t = 0;

    const m = Math.min(W, H);
    GenSoup.drawBackdrop(ctx, W, H);
    const dots = GenSoup.finalReds(W, H);

    /* the eye: a lidless arc, only a sliver ever in frame */
    const E = { x: W * 1.05, y: -H * 0.35 };
    const R = H * 0.78;
    const s = t < 0.6 ? 0 : t < 1.0 ? 1 : t < 1.4 ? 2 : 3;
    const th = [0, 0.035, 0.07, 0.11][s] * H;

    if (s > 0) {
      ctx.fillStyle = PAL.arc;
      ctx.beginPath();
      ctx.arc(E.x, E.y, R, 0, Math.PI * 2);
      ctx.arc(E.x - th * 0.7, E.y - th * 0.7, R, 0, Math.PI * 2);
      ctx.fill("evenodd");
    }

    if (t >= 1.6) {
      ctx.fillStyle = PAL.iris;
      ctx.beginPath();
      ctx.arc(E.x, E.y, R - th * 0.35, 0, Math.PI * 2);
      ctx.arc(E.x - th * 0.45, E.y - th * 0.45, R - th * 0.35, 0, Math.PI * 2);
      ctx.fill("evenodd");
    }

    /* the four survivors: never turn, never change */
    const blues = GenSoup.finalBlues(W, H);
    for (let i = 0; i < blues.length; i++) {
      const b = blues[i];
      GenSoup.shaded(ctx, b.x, b.y, b.r, GenSoup.PAL.blueLit, GenSoup.PAL.blue, m);
    }

    /* dust timing: nearest dots to the eye turn first */
    let maxD = 0;
    const dists = new Array(dots.length);
    for (let i = 0; i < dots.length; i++) {
      const dx = dots[i].x - E.x, dy = dots[i].y - E.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      dists[i] = d;
      if (d > maxD) maxD = d;
    }

    const P = pool(W, H);
    const floorY = H * PAL.floor;
    const n = dots.length;

    /* per-dot turn time and landing time, computed once so the pile can
       be filled in landing order (earliest-landing dots settle lowest) */
    const items = new Array(n);
    for (let i = 0; i < n; i++) {
      const dot = dots[i];
      const ws = Math.min(4, Math.floor((dists[i] / maxD) * 5));
      const td = 2.0 + ws * 0.4;
      const dist = Math.max(0, floorY - dot.y);
      const stepsAvail = Math.max(1, Math.floor((5.2 - td) / 0.3));
      const step = Math.max(m * 0.06, dist / stepsAvail);
      const stepsToLand = dist <= 0 ? 0 : Math.ceil(dist / step);
      const tl = td + stepsToLand * 0.3;
      items[i] = { x: dot.x, y: dot.y, r: dot.r, td, tl, step, idx: i };
    }
    const order = items.slice().sort((a, b) => a.tl - b.tl || a.x - b.x);
    const rank = new Array(n);
    for (let k = 0; k < order.length; k++) rank[order[k].idx] = k;

    /* pass 1: whole dots, falling dust and the settled pile */
    for (let i = 0; i < n; i++) {
      const it = items[i];
      if (t >= 99) {
        if (pileCut > 0) {
          const pr = pileRow(rank[i], n, W, H);
          if (pr.row >= pr.rows - pileCut) continue;
        }
        const slot = pileSlot(rank[i], n, W, H);
        GenSoup.shaded(ctx, slot.x, slot.y, it.r * 0.8, PAL.dust, PAL.dustShade, m);
        continue;
      }
      if (t < it.td) {
        GenSoup.shaded(ctx, it.x, it.y, it.r, GenSoup.PAL.rose, GenSoup.PAL.mid, m);
        continue;
      }

      let gx, gy, settled = false;
      if (t < it.tl) {
        const fs = Math.floor((t - it.td) / 0.3);
        gx = it.x;
        gy = Math.min(floorY, it.y + fs * it.step);
      } else {
        const slot = pileSlot(rank[i], n, W, H);
        const ts = Math.max(it.tl, 5.2);
        const sstep = t < ts ? 0 : Math.min(4, Math.floor((t - ts) / 0.25) + 1);
        const frac = sstep / 4;
        settled = frac === 1;
        gx = it.x + (slot.x - it.x) * frac;
        gy = floorY + (slot.y - floorY) * frac;
      }
      if (settled && pileCut > 0) {
        const pr = pileRow(rank[i], n, W, H);
        if (pr.row >= pr.rows - pileCut) continue;
      }
      GenSoup.shaded(ctx, gx, gy, it.r * 0.8, PAL.dust, PAL.dustShade, m);
    }

    /* pass 2: the flash, the spark and its crackle, on top of the dust */
    for (let i = 0; i < n; i++) {
      const it = items[i];
      if (t < it.td) continue;

      if (t < it.td + 0.1) drawStar(ctx, it.x, it.y, it.r);

      const riseCy = it.y - it.r - 4 * m * 0.02;
      let f = 0;
      if (t >= 4.6) {
        const ps = Math.min(4, 1 + Math.floor((t - 4.6) / 0.45));
        f = ps / 4;
      }
      if (f === 1) continue;

      const cx = it.x + (P.x - it.x) * f;
      const cy = riseCy + (P.y - riseCy) * f;
      const pulseStep = Math.floor(t / 0.15) % 2;
      const sSize = it.r * (pulseStep === 0 ? 0.9 : 1.2);

      if (t >= 4.6) {
        ctx.save();
        const gf1 = f - 0.25;
        if (gf1 >= 0) {
          const gx1 = it.x + (P.x - it.x) * gf1;
          const gy1 = riseCy + (P.y - riseCy) * gf1;
          ctx.globalAlpha = 0.6;
          drawDiamond(ctx, gx1, gy1, sSize, PAL.spark);
        }
        const gf2 = f - 0.5;
        if (gf2 >= 0) {
          const gx2 = it.x + (P.x - it.x) * gf2;
          const gy2 = riseCy + (P.y - riseCy) * gf2;
          ctx.globalAlpha = 0.3;
          drawDiamond(ctx, gx2, gy2, sSize, PAL.spark);
        }
        ctx.restore();
      }

      drawCrackle(ctx, it.idx, cx, cy, sSize, t, m);
      drawDiamond(ctx, cx, cy, sSize, PAL.spark);
      ctx.fillStyle = PAL.sparkCore;
      const cs = sSize * 0.45;
      ctx.fillRect(cx - cs, cy - cs, cs * 2, cs * 2);
    }

    drawPowerPoint(ctx, P.x, P.y, m, t);
  }

  return { draw, drawPowerPoint, pile, pool, setPileCut };
})();
