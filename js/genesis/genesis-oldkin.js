/* genesis-oldkin.js — the fourteen old ones that are not of the first ten
   kinds. Same contract as the painters in genesis-oldones.js: (ctx, o, x, y,
   h, p), feet (or lowest point) on y, h tall in px; they register into
   GenOld.PAINT. */
(function () {
  const G = window.Gen;
  const O = window.GenOld; if (!O || !O.PAINT) return;
  const { clamp, mix, hash1 } = Util;
  const { litShade, circle, line } = Paint;
  const { litSplit, eyeDot } = O;
  const TAU = Math.PI * 2;

  // circle/ellipse counterpart of litSplit's under-22px flat-fill fallback
  function circSplit(ctx, trace, xSplit, lit, shade, hpx) {
    if (hpx < 22) { trace(); ctx.fillStyle = lit; ctx.fill(); return; }
    litShade(ctx, trace, xSplit, lit, shade);
  }

  /* 1. tower — thin tall slab that rocks around its forward foot corner */
  function tower(ctx, o, x, y, h, p) {
    const w = 0.16 * h;
    const tilt = Math.sin(p.phase) * 0.12;
    const cornerX = x + o.side * 0.5 * w;
    ctx.save();
    ctx.translate(cornerX, y);
    ctx.rotate(tilt);
    const lx = x - 0.5 * w - cornerX, rx = x + 0.5 * w - cornerX;
    const taperY = -(h - 0.18 * h);
    litSplit(ctx, [
      [lx, 0], [rx, 0], [rx, taperY], [(lx + rx) * 0.5, -h], [lx, taperY],
    ], o.lit, o.shade);
    eyeDot(ctx, (lx + rx) * 0.5, -0.8 * h, h, p.look, 0.012 * h);
    ctx.restore();
  }

  /* 2. pearl — wet rolling sphere with a turning seam and a fixed highlight */
  function pearl(ctx, o, x, y, h, p) {
    const r = 0.5 * h, cx = x, cy = y - 0.5 * h;
    circSplit(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); },
      cx + 0.1 * r, o.lit, o.shade, r * 2);
    const rot = -p.phase;
    ctx.strokeStyle = o.shade;
    ctx.lineWidth = Math.max(1, 0.06 * h);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.8, rot, rot + 2.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx - 0.35 * r, cy - 0.35 * r, 0.22 * r, 0.12 * r, 0, 0, TAU);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fill();
    const back = -o.side;
    circle(ctx, x + back * 0.65 * r, y, 0.06 * h, o.lit);
    circle(ctx, x + back * 1.0 * r, y, 0.05 * h, o.shade);
  }

  /* 3. bundle — one mind, seven jittering wet lobes */
  function bundle(ctx, o, x, y, h, p) {
    const cx = x, cy = y - 0.5 * h;
    let eyeX = cx, eyeY = cy;
    for (let k = 0; k < 7; k++) {
      const r = mix(0.12 * h, 0.2 * h, hash1(o.idx * 10 + k));
      const ang = hash1(o.idx * 10 + k + 50) * TAU;
      const dist = hash1(o.idx * 10 + k + 100) * 0.3 * h;
      const jitter = Math.sin(G.t * (1.3 + k * 0.2) + o.ph + k) * 0.05 * h;
      const px = cx + Math.cos(ang) * dist + jitter, py = cy + Math.sin(ang) * dist;
      circSplit(ctx, () => { ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); },
        px - 0.2 * r, o.lit, o.shade, r * 2);
      if (k === 0) { eyeX = px; eyeY = py; }
    }
    eyeDot(ctx, eyeX, eyeY, h, p.look, 0.012 * h);
  }

  /* 4. needle — thin double-pointed spine, flat horizontal lit/shade cut */
  function needle(ctx, o, x, y, h, p) {
    const cx = x, cy = y - 0.5 * h;
    const hl = 0.8 * h, th = Math.max(2, 0.09 * h);
    const pitch = Math.sin(G.t * 1.7 + o.ph) * 0.15;
    const dx = Math.cos(pitch) * o.side, dy = Math.sin(pitch);
    const nx = -dy, ny = dx;
    const tipA = [cx + dx * hl, cy + dy * hl], tipB = [cx - dx * hl, cy - dy * hl];
    const midA = [cx + nx * th * 0.5, cy + ny * th * 0.5];
    const midB = [cx - nx * th * 0.5, cy - ny * th * 0.5];
    const pts = [tipA, midA, tipB, midB];
    Paint.poly(ctx, pts);
    ctx.fillStyle = o.lit;
    ctx.fill();
    ctx.save();
    Paint.poly(ctx, pts);
    ctx.clip();
    ctx.fillStyle = o.shade;
    ctx.fillRect(cx - hl - th, cy, 2 * (hl + th), hl + th + 10);
    ctx.restore();
    const back = 35 * Math.PI / 180;
    const bx = nx * Math.cos(back) - dx * Math.sin(back);
    const by = ny * Math.cos(back) - dy * Math.sin(back);
    const bw = Math.max(1, 0.03 * h), blen = 0.18 * h;
    for (let k = 0; k < 3; k++) {
      const t = -0.3 + k * 0.3;
      const px = cx + dx * hl * t, py = cy + dy * hl * t;
      line(ctx, [[px, py], [px + bx * blen, py + by * blen]], o.lit, bw);
    }
  }

  /* 5. slab — fat chamfered block that shuffles by tilting front/back */
  function slab(ctx, o, x, y, h, p) {
    const w = 1.3 * h, ht = 0.75 * h, c = 0.15 * h;
    const tilt = Math.sin(p.phase) * 0.06;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    const l = -0.5 * w, r = 0.5 * w, top = -ht;
    litSplit(ctx, [
      [l + c, 0], [r - c, 0], [r, -c], [r, top + c], [r - c, top],
      [l + c, top], [l, top + c], [l, -c],
    ], o.lit, o.shade);
    for (let k = 0; k < 3; k++) {
      const tx = mix(l + 0.2 * w, r - 0.2 * w, k / 2);
      Paint.poly(ctx, [[tx - 0.05 * h, top], [tx + 0.05 * h, top], [tx, top - 0.1 * h]]);
      ctx.fillStyle = o.shade;
      ctx.fill();
    }
    const face = o.side >= 0 ? 1 : -1;
    const faceX = face * (0.5 * w - 0.15 * h), eyeY = top + ht * 0.25;
    eyeDot(ctx, faceX, eyeY, h, p.look, 0.012 * h);
    eyeDot(ctx, faceX, eyeY + 0.08 * h, h, p.look, 0.012 * h);
    ctx.restore();
  }

  /* 6. bloom — low wobbling blob with five pulsing wet bulbs */
  function bloom(ctx, o, x, y, h, p) {
    const face = o.side >= 0 ? 1 : -1;
    const len = 1.2 * h, height = 0.55 * h, N = 12;
    const raw = [];
    let vMin = Infinity, vMax = -Infinity;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * TAU;
      const u = -face * Math.cos(t) * len * 0.5;
      const v = Math.sin(t) * Math.sin(t / 2);
      raw.push([u, v]);
      if (v < vMin) vMin = v;
      if (v > vMax) vMax = v;
    }
    const vs = height / Math.max(1e-4, vMax - vMin);
    const pts = raw.map(([u, v]) => [x + u, y + (v - vMax) * vs]);
    litSplit(ctx, pts, o.lit, o.shade);
    for (let k = 0; k < 5; k++) {
      const bx = x + (k - 2) * 0.18 * h, by = y - height * 0.75;
      const pulse = 1 + 0.08 * Math.sin(G.t * 3 + k);
      const br = mix(0.1 * h, 0.16 * h, hash1(o.idx * 7 + k)) * pulse;
      circSplit(ctx, () => { ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); },
        bx - 0.2 * br, o.lit, o.shade, br * 2);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillRect(bx - 0.35 * br, by - 0.35 * br, 1, 1);
    }
    eyeDot(ctx, x + face * 0.45 * h, y - height * 0.2, h, p.look, 0.012 * h);
  }

  /* 7. comb — bar with a travelling wave of hanging teeth */
  function comb(ctx, o, x, y, h, p) {
    const w = 1.1 * h;
    const barTop = y - 0.82 * h, barBot = y - 0.6 * h;
    litSplit(ctx, [
      [x - 0.5 * w, barTop], [x + 0.5 * w, barTop], [x + 0.5 * w, barBot], [x - 0.5 * w, barBot],
    ], o.lit, o.shade);
    const tw = Math.max(1, 0.05 * h);
    for (let k = 0; k < 9; k++) {
      const tx = mix(x - 0.5 * w + 0.05 * w, x + 0.5 * w - 0.05 * w, k / 8);
      const shift = Math.sin(p.phase + k * 0.7) * 0.05 * h;
      const col = k >= 5 ? o.shade : o.lit;
      line(ctx, [[tx, barBot], [tx + shift, y]], col, tw);
    }
    const face = o.side >= 0 ? 1 : -1;
    eyeDot(ctx, x + face * 0.5 * w, mix(barTop, barBot, 0.5), h, p.look, 0.012 * h);
  }

  /* 8. veil — a rippling sheet of cloth, the one without an eye */
  function veil(ctx, o, x, y, h, p) {
    const half = 0.9 * h, amp = 0.08 * h;
    const topY = y - 0.75 * h, botY = y - 0.3 * h;
    const phase = G.t * 2.2 + o.ph;
    const topPts = [], botPts = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8, px = x - half + u * 2 * half;
      topPts.push([px, topY + Math.sin(phase + u * TAU) * amp]);
      botPts.push([px, botY + Math.sin(phase + 1.2 + u * TAU) * amp]);
    }
    const prevA = ctx.globalAlpha;
    ctx.globalAlpha = prevA * 0.75;
    Paint.poly(ctx, topPts.concat(botPts.slice().reverse()));
    ctx.fillStyle = o.lit;
    ctx.fill();
    const bandH = 0.25 * (botY - topY);
    const bandPts = botPts.map(([px, py]) => [px, py - bandH]).concat(botPts.slice().reverse());
    Paint.poly(ctx, bandPts);
    ctx.fillStyle = o.shade;
    ctx.fill();
    ctx.globalAlpha = prevA;
    for (let k = 0; k < 3; k++) {
      const u = (k + 0.5) / 3, bx = x - half + u * 2 * half;
      const by = botY + Math.sin(phase + 1.2 + u * TAU) * amp;
      const sway = Math.sin(G.t * 2 + k) * 0.05 * h;
      line(ctx, [[bx, by], [bx + sway, by + 0.15 * h]], o.lit, 1);
    }
  }

  /* 9. knot — two overlapped rings turning against each other */
  function knot(ctx, o, x, y, h, p) {
    const cy = y - 0.45 * h;
    const turn = -p.phase * 0.6;
    ctx.lineWidth = 0.12 * h;
    for (let k = 0; k < 2; k++) {
      const rot = turn + (k === 0 ? 0.9 : -0.9);
      ctx.save();
      ctx.translate(x, cy);
      ctx.rotate(rot);
      ctx.strokeStyle = k === 0 ? o.lit : o.shade;
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.4 * h, 0.22 * h, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* 10. husk — soft flesh body under four gapped stone plates, on two
     stubby stepping blocks */
  function husk(ctx, o, x, y, h, p) {
    const breathe = 1 + 0.06 * Math.sin(G.t * 2.5 + o.ph);
    const rx = 0.45 * h * breathe, ry = 0.32 * h * breathe;
    const cy = y - 0.5 * h;
    const face = o.side >= 0 ? 0 : Math.PI;
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? -1 : 1;
      const lift = side < 0 ? Math.max(0, Math.sin(p.phase)) * 0.06 * h
                            : Math.max(0, -Math.sin(p.phase)) * 0.06 * h;
      Paint.rect(ctx, x + side * 0.2 * h - 0.07 * h, y - 0.16 * h - lift, x + side * 0.2 * h + 0.07 * h, y - lift, o.shade);
    }
    ctx.beginPath();
    ctx.ellipse(x, cy, rx, ry, 0, 0, TAU);
    ctx.fillStyle = "#96404a";
    ctx.fill();
    const gap = 0.06;
    for (let k = 0; k < 4; k++) {
      const a0 = face - Math.PI * 0.25 + k * Math.PI * 0.5 + gap;
      const a1 = face - Math.PI * 0.25 + (k + 1) * Math.PI * 0.5 - gap;
      const outer = [], inner = [];
      for (let i = 0; i <= 3; i++) {
        const a = mix(a0, a1, i / 3);
        outer.push([x + Math.cos(a) * rx * 1.05, cy + Math.sin(a) * ry * 1.05]);
        inner.push([x + Math.cos(a) * rx * 0.65, cy + Math.sin(a) * ry * 0.65]);
      }
      litSplit(ctx, outer.concat(inner.reverse()), o.lit, o.shade);
      if (k === 0) eyeDot(ctx, x + Math.cos(face) * rx * 0.95, cy + Math.sin(face) * ry * 0.95, h, p.look, 0.014 * h);
    }
  }

  /* 11. chime — three swaying floating rings that periodically ring out */
  function chime(ctx, o, x, y, h, p) {
    const radii = [0.28 * h, 0.2 * h, 0.13 * h];
    const centers = [];
    let cy = y - 0.3 * h;
    for (let k = 0; k < 3; k++) {
      cy -= radii[k];
      const sway = Math.sin(G.t * 2 + k) * 0.04 * h;
      centers.push([x + sway, cy]);
      cy -= radii[k] + 0.06 * h;
    }
    ctx.lineWidth = Math.max(1, 0.06 * h);
    ctx.strokeStyle = o.lit;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(centers[k][0], centers[k][1], radii[k], 0, TAU);
      ctx.stroke();
    }
    const frac = ((G.t + o.ph) % 2.2) / 2.2;
    const midC = centers[1];
    const prevA = ctx.globalAlpha;
    ctx.globalAlpha = prevA * (1 - frac) * 0.5;
    ctx.lineWidth = Math.max(1, 0.02 * h);
    ctx.beginPath();
    ctx.arc(midC[0], midC[1], 0.2 * h + frac * 0.9 * h, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = prevA;
    eyeDot(ctx, midC[0], midC[1], h, p.look, 0.012 * h);
  }

  /* 12. prism — four splayed shards that flash a hue when they blink */
  function prism(ctx, o, x, y, h, p) {
    const angles = [-0.35, -0.1, 0.12, 0.38];
    const heights = angles.map((_, k) => mix(0.5 * h, 1.0 * h, hash1(o.idx * 13 + k)));
    let tallest = 0;
    for (let k = 1; k < 4; k++) if (heights[k] > heights[tallest]) tallest = k;
    const baseW = 0.14 * h;
    for (let k = 0; k < 4; k++) {
      const a = angles[k];
      const dx = Math.sin(a), dy = -Math.cos(a);
      const nx = Math.cos(a), ny = Math.sin(a);
      const tipX = x + dx * heights[k], tipY = y + dy * heights[k];
      const pts = [
        [x - nx * baseW * 0.5, y - ny * baseW * 0.5],
        [x + nx * baseW * 0.5, y + ny * baseW * 0.5],
        [tipX, tipY],
      ];
      litSplit(ctx, pts, o.lit, o.shade);
      if (k === 1) {
        const lo = Math.min(pts[0][0], pts[1][0], pts[2][0]);
        const hi = Math.max(pts[0][0], pts[1][0], pts[2][0]);
        const xSplit = lo + 0.4 * (hi - lo);
        ctx.save();
        Paint.poly(ctx, pts);
        ctx.clip();
        ctx.fillStyle = `rgba(${o.hue},0.6)`;
        ctx.fillRect(lo - 1, y - heights[k] - 1, xSplit - lo + 1, heights[k] + 2);
        ctx.restore();
      }
    }
    if (p.sy < 0.15) {
      const hueFill = `rgb(${o.hue})`;
      for (let d = 0; d < 3; d++) {
        const ang = d * 2.4 + o.ph;
        circle(ctx, x + Math.cos(ang) * 0.3 * h, y - 0.4 * h + Math.sin(ang) * 0.2 * h, 0.04 * h, hueFill);
      }
    }
    const ta = angles[tallest];
    eyeDot(ctx, x + Math.cos(ta) * baseW * 0.3, y + Math.sin(ta) * baseW * 0.3 - 0.05 * h, h, p.look, 0.012 * h);
  }

  /* 13. swarmling — one mind, twelve orbiting specks */
  function swarmling(ctx, o, x, y, h, p) {
    const cx = x, cy = y - 0.55 * h;
    const r = Math.max(1.2, 0.05 * h);
    for (let k = 0; k < 12; k++) {
      const ang = G.t * (0.8 + k * 0.13) + k * 2.1;
      const rad = 0.4 * h * (0.5 + 0.5 * Math.sin(k));
      const px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
      circle(ctx, px, py, k === 0 ? r * 2 : r, o.lit);
      if (k === 0) eyeDot(ctx, px, py, h, p.look, 0.012 * h);
    }
  }

  /* 14. mound — a huge low sliding hump with a single big eye */
  function mound(ctx, o, x, y, h, p) {
    const rx = 0.8 * h, ry = 0.7 * h, N = 10;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const a = Math.PI + (i / N) * Math.PI;
      pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]);
    }
    for (let k = 2; k >= 0; k--) {
      const u = k / 2;
      pts.push([mix(x + rx, x - rx, u), y + Math.sin(G.t * 3 + k) * 0.02 * h]);
    }
    litSplit(ctx, pts, o.lit, o.shade);
    for (let k = 0; k < 3; k++) {
      const px = x - rx * 0.5 + k * 0.15 * rx, py = y - 0.15 * h - k * 0.05 * h;
      circle(ctx, px, py, mix(0.05 * h, 0.08 * h, hash1(o.idx * 17 + k)), o.shade);
    }
    const face = o.side >= 0 ? 1 : -1;
    eyeDot(ctx, x + face * 0.5 * rx, y - 0.45 * h, h, p.look, 0.07 * h);
  }

  Object.assign(O.PAINT, { tower, pearl, bundle, needle, slab, bloom, comb, veil, knot, husk, chime, prism, swarmling, mound });
})();
