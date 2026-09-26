window.GenRexIn = (function () {
  "use strict";

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

  // right shoulder/hand geometry, shared by the drawn arm and rexGeom
  function rightArmHand(cx, footY, h, reach, W, H) {
    const sx = cx + 0.22 * h, sy = footY - 0.78 * h;
    const hx0 = cx + 0.42 * h, hy0 = footY - 0.8 * h;
    if (!reach) return { sx, sy, hx: hx0, hy: hy0 };
    const dx0 = hx0 - sx, dy0 = hy0 - sy;
    const len0 = Math.sqrt(dx0 * dx0 + dy0 * dy0) || 1;
    const ang0 = Math.atan2(dy0, dx0);
    const tx = 0.93 * W - sx, ty = 0.50 * H - sy;
    const angT = Math.atan2(ty, tx);
    const ang = ang0 + (angT - ang0) * reach;
    const len = len0 * (1 + 0.4 * reach);
    return { sx, sy, hx: sx + Math.cos(ang) * len, hy: sy + Math.sin(ang) * len };
  }

  // one plain, soul-born giant: head, trapezoid torso, two leg rects, two arm quads
  function addArm(ctx, cx, footY, h, side, reach, W, H) {
    let sx, sy, hx, hy;
    if (side === 1) {
      const a = rightArmHand(cx, footY, h, reach, W, H);
      sx = a.sx; sy = a.sy; hx = a.hx; hy = a.hy;
    } else {
      sx = cx + side * 0.22 * h; sy = footY - 0.78 * h;
      hx = cx + side * 0.42 * h; hy = footY - 0.8 * h;
    }
    const dx = hx - sx, dy = hy - sy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const px = (-dy / len) * 0.04 * h, py = (dx / len) * 0.04 * h;
    ctx.moveTo(sx + px, sy + py);
    ctx.lineTo(hx + px, hy + py);
    ctx.lineTo(hx - px, hy - py);
    ctx.lineTo(sx - px, sy - py);
    ctx.closePath();
  }

  function buildRexPath(ctx, cx, footY, h, reach, W, H) {
    ctx.beginPath();
    // head
    ctx.moveTo(cx + 0.09 * h, footY - 0.9 * h);
    ctx.arc(cx, footY - 0.9 * h, 0.09 * h, 0, Math.PI * 2);
    // torso
    ctx.moveTo(cx - 0.22 * h, footY - 0.78 * h);
    ctx.lineTo(cx + 0.22 * h, footY - 0.78 * h);
    ctx.lineTo(cx + 0.15 * h, footY - 0.42 * h);
    ctx.lineTo(cx - 0.15 * h, footY - 0.42 * h);
    ctx.closePath();
    // legs
    ctx.rect(cx - 0.08 * h - 0.055 * h, footY - 0.42 * h, 0.11 * h, 0.42 * h);
    ctx.rect(cx + 0.08 * h - 0.055 * h, footY - 0.42 * h, 0.11 * h, 0.42 * h);
    // arms
    addArm(ctx, cx, footY, h, -1);
    addArm(ctx, cx, footY, h, 1, reach, W, H);
  }

  function drawRex(ctx, cx, footY, h, reach, W, H) {
    buildRexPath(ctx, cx, footY, h, reach, W, H);
    ctx.fillStyle = "#c8b49a";
    ctx.fill();

    ctx.save();
    buildRexPath(ctx, cx, footY, h, reach, W, H);
    ctx.clip();
    ctx.fillStyle = "#8a7560";
    ctx.fillRect(cx - 0.12 * h, footY - 1.2 * h, 2 * h, 1.4 * h);
    ctx.restore();
  }

  // one braided channel: bed, lit bank, and rings on the drawn prefix
  function drawChannel(ctx, m, H, pts, n) {
    const pn = Math.min(n, pts.length);
    if (pn < 2) return;

    ctx.lineWidth = 0.028 * m;
    ctx.strokeStyle = "#4a141c";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pn; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    ctx.lineWidth = 0.010 * m;
    ctx.strokeStyle = "#6b2029";
    ctx.beginPath();
    ctx.moveTo(pts[0].x - 0.006 * m, pts[0].y);
    for (let j = 1; j < pn; j++) ctx.lineTo(pts[j].x - 0.006 * m, pts[j].y);
    ctx.stroke();

    const step = 0.03 * H;
    let acc = 0, next = step;
    for (let k = 0; k < pn - 1; k++) {
      const a = pts[k], b = pts[k + 1];
      const segLen = Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y));
      while (next <= acc + segLen) {
        const frac = (next - acc) / segLen;
        const rx = a.x + (b.x - a.x) * frac;
        const ry = a.y + (b.y - a.y) * frac;
        ringDull(ctx, rx, ry, 0.006 * m);
        next += step;
      }
      acc += segLen;
    }
  }

  // three braided channels each side, hugging Rex's z4 body
  function drawRivers(ctx, W, H, m, cx, h, t) {
    let n = 1 + Math.floor((t - 5.4) / 0.3);
    if (n > 7) n = 7;
    if (n < 1) n = 1;

    const offsets = [0.30, 0.40, 0.52];
    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? -1 : 1;
      const chans = [];
      for (let ch = 0; ch < 3; ch++) {
        const pts = [];
        for (let p = 0; p < 7; p++) {
          let x = cx + sign * offsets[ch] * h;
          x += (hash(side * 50 + ch * 10 + p) - 0.5) * 0.05 * W;
          if (p >= 2 && p <= 4) x += -sign * 0.04 * W;
          if (x < 0.03 * W) x = 0.03 * W;
          if (x > 0.97 * W) x = 0.97 * W;
          const y = (p / 6) * H;
          pts.push({ x: x, y: y });
        }
        chans.push(pts);
      }
      // braid: adjacent channels share a point
      chans[1][3] = chans[0][3];
      chans[2][5] = chans[1][5];

      for (let ch2 = 0; ch2 < 3; ch2++) drawChannel(ctx, m, H, chans[ch2], n);
    }
  }

  function draw(ctx, W, H, t, reduced, reach) {
    if (!W || !H) return;
    if (reduced) t = 99;
    if (t < 0) t = 0;
    if (!reach) reach = 0;

    const m = Math.min(W, H);

    let z;
    if (t < 2.6) z = 0;
    else {
      z = 1 + Math.floor((t - 2.6) / 0.7);
      if (z > 4) z = 4;
    }
    const S = Math.pow(1.9, z);

    // background
    if (z === 0) {
      if (window.GenCorrupt) {
        try { GenCorrupt.draw(ctx, W, H, 99, reduced); } catch (e) {}
      } else {
        ctx.fillStyle = "#2a0a10";
        ctx.fillRect(0, 0, W, H);
      }
    } else {
      ctx.fillStyle = "#2a0a10";
      ctx.fillRect(0, 0, W, H);
      hexField(ctx, (m * 0.035) / S, 0.12, 13 + z, 0, 0, W, H);
    }

    // roof band, held at every zoom step
    const roofH = (H * 0.105) / Math.sqrt(S);
    ctx.fillStyle = "#7a1c22";
    ctx.fillRect(0, 0, W, roofH);
    ctx.fillStyle = "#5a1419";
    ctx.fillRect(W * 0.35, 0, W * 0.65, roofH);

    const cx = 0.5 * W, cy = 0.58 * H;
    const R0 = m * 0.035;

    // the tear: the birth ring pulled into two arcs (z0 only)
    if (z === 0 && t >= 1.0 && t < 2.6) {
      ctx.fillStyle = "#2a0a10";
      ctx.beginPath();
      ctx.arc(cx, cy, R0 * 1.2, 0, Math.PI * 2);
      ctx.fill();

      const steps = Math.min(4, Math.floor((t - 1.0) / 0.4));
      const d = R0 * 0.35 * steps;
      ctx.lineWidth = 0.28 * R0;
      ctx.strokeStyle = "#6e5e60";
      ctx.beginPath();
      ctx.arc(cx - d, cy, R0, Math.PI * 0.55, Math.PI * 1.45);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + d, cy, R0, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();
    }

    // Rex's height and stance
    let hasRex = true, h, footY;
    if (z === 0) {
      if (t < 1.0) {
        hasRex = false;
        h = 0; footY = cy;
      } else {
        const st = Math.floor((t - 1.0) / 0.4);
        h = R0 * (1.2 + 0.5 * st);
        if (h > R0 * 3.2) h = R0 * 3.2;
        footY = cy + h * 0.5;
      }
    } else {
      h = [0.22, 0.42, 0.75, 1.35][z - 1] * m;
      footY = 0.58 * H + h * 0.5;
    }

    // rivers, braided round him once he holds at z4
    if (t >= 5.4) drawRivers(ctx, W, H, m, cx, h, t);

    if (hasRex) drawRex(ctx, cx, footY, h, reach, W, H);
  }

  // where the reached right hand ends up at the final held zoom (z=4, t=99)
  function rexGeom(W, H, reach) {
    const m = Math.min(W, H);
    const cx = 0.5 * W;
    const h = 1.35 * m;
    const footY = 0.58 * H + h * 0.5;
    const a = rightArmHand(cx, footY, h, reach || 0, W, H);
    return { hand: { x: a.hx, y: a.hy } };
  }

  return { draw, rexGeom };
})();
