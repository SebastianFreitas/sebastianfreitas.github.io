/* genesis-flesh.js — the Primordisentia: a wall of flesh with lobes, veins,
   eyes that open, mouths that gape, the colours the old ones paint onto
   it, the souls inside, the cry it sends through the void, and the gold
   seal that becomes the womb. Screen-space; the body's centre is world
   ROOT_U at 0.5 H. */
window.GenFlesh = (function () {
  const G = window.Gen;
  const { hash1, clamp, mix, smooth, mulberry } = Util;
  const { offsetShade } = Paint;
  const { flatGlow, mixHex } = GenPaint;
  const { ROOT_U, sx, since } = G;
  const DEG = Math.PI / 180;

  // 90 gold motes drifting inside the body; the womb pulls them into orbit
  const souls = [];
  (function () {
    const r = mulberry(9003);
    for (let i = 0; i < 90; i++)
      souls.push({ ox: (r() - 0.5) * 1.04, oy: (r() - 0.5) * 1.04,
                   a: 0.2 + r() * 0.5, r: 0.5 + r() * 1.2, ph: r() * 6.28 });
  })();

  function fleshGeom(womb) {
    womb = womb == null ? 0 : womb;
    const m = Math.min(G.W, G.H);
    const vis = clamp(since("root") + 0.35, 0.35, 1);
    const cx = sx(ROOT_U), cy = 0.5 * G.H;
    const rx = m * (0.36 + 0.22 * vis) * mix(1, 0.90, womb);
    const ry = m * (0.46 + 0.26 * vis) * mix(1, 0.95, womb);
    return { cx, cy, rx, ry };
  }

  // the body's wobbling outline: an 81-point ellipse with four ripple terms
  function fleshPath(ctx, cx, cy, rx, ry, pain, seed, tt) {
    tt = tt === undefined ? G.t : tt;
    ctx.beginPath();
    const n = 80;
    for (let i = 0; i <= n; i++) {
      const u = i / n, ang = u * 6.283;
      const wob = 1
        + Math.sin(ang * 3 + tt * 0.5 + seed) * 0.08 * pain
        + Math.sin(ang * 7 - tt * 0.35) * 0.05 * pain
        + Math.sin(ang * 2 + tt * 0.22) * 0.05
        + Math.sin(ang * 11 + tt * 1.1) * 0.03 * pain;
      const x = cx + Math.cos(ang) * rx * wob;
      const y = cy + Math.sin(ang) * ry * wob;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  const EYES = [[200, 0.55], [160, 0.70], [235, 0.72], [120, 0.45], [260, 0.40], [185, 0.25]];
  const MOUTHS = [[215, 0.90], [145, 0.88], [180, 0.60]];

  function drawFlesh(ctx, vis, pain, womb, calm) {
    if (vis < 0.02) return null;
    pain = pain == null ? 0.4 : pain;
    womb = womb == null ? 0 : womb;
    calm = calm ? 1 : 0;
    const bodyPain = calm ? 0 : pain;
    const bodyTt = calm ? 0 : G.t;
    const m = Math.min(G.W, G.H);
    const flesh = fleshGeom(womb);
    const { cx, cy, rx, ry } = flesh;

    // 1. two back lobes, unclipped so they peek out from behind the body
    ctx.globalAlpha = vis;
    ctx.fillStyle = "#2e080c";
    fleshPath(ctx, cx - 0.30 * rx, cy - 0.35 * ry, rx * 0.55, ry * 0.45, bodyPain * 0.6, 11, bodyTt);
    ctx.fill();
    fleshPath(ctx, cx - 0.22 * rx, cy + 0.42 * ry, rx * 0.48, ry * 0.40, bodyPain * 0.6, 17, bodyTt);
    ctx.fill();

    // 2. the body
    const LIT = mixHex("#5c1114", "#6a2418", clamp(womb * 1.5, 0, 1));
    offsetShade(ctx, () => fleshPath(ctx, cx, cy, rx, ry, bodyPain, 0, bodyTt), -0.26 * rx, -0.10 * ry, LIT, "#2e080c");
    ctx.globalAlpha = 1;

    // 3-5. veins, eyes and mouths, all clipped to the body
    ctx.save();
    fleshPath(ctx, cx, cy, rx, ry, bodyPain, 0, bodyTt);
    ctx.clip();
    ctx.globalAlpha = vis;

    // 3. veins: six thick dark bands swaying from an inner ring to the rim
    ctx.strokeStyle = "rgba(38,6,10,0.9)";
    ctx.lineWidth = 0.022 * m;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a0 = (k * 60 + 20) * DEG, a1 = a0 + 25 * DEG;
      const x0 = cx + Math.cos(a0) * rx * 0.25, y0 = cy + Math.sin(a0) * ry * 0.25;
      const x1 = cx + Math.cos(a1) * rx, y1 = cy + Math.sin(a1) * ry;
      const sway = calm ? 0 : 0.03 * rx * Math.sin(G.t * 0.6 + k);
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) / 2 + sway, (y0 + y1) / 2, x1, y1);
    }
    ctx.stroke();

    // 4. eyes: mostly open, closing under pain or the womb, watching west
    if (!calm) {
      const look = sx(0);
      for (let k = 0; k < EYES.length; k++) {
        const ang = EYES[k][0] * DEG, rf = EYES[k][1];
        const ex = cx + Math.cos(ang) * rx * rf, ey = cy + Math.sin(ang) * ry * rf;
        const ew = m * (0.030 + 0.012 * hash1(k * 5 + 1));
        const op = clamp(1.4 * Math.sin(G.t * 0.55 + k * 1.9) + 0.6, 0, 1)
                 * (1 - clamp((pain - 0.9) * 1.5, 0, 1))
                 * (1 - womb);
        if (op < 0.02) continue;
        ctx.beginPath();
        ctx.moveTo(ex - ew, ey);
        ctx.quadraticCurveTo(ex, ey - ew * 0.8 * op, ex + ew, ey);
        ctx.quadraticCurveTo(ex, ey + ew * 0.8 * op, ex - ew, ey);
        ctx.closePath();
        ctx.fillStyle = "#d8cfc4";
        ctx.fill();
        ctx.save();
        ctx.clip();
        const lookDx = clamp((look - ex) / G.W, -1, 1) * 0.25 * ew;
        const ix = ex + lookDx, ir = 0.55 * ew * op + 0.001;
        ctx.fillStyle = "#1a0507";
        ctx.beginPath(); ctx.arc(ix, ey, ir, 0, 6.283); ctx.fill();
        ctx.fillStyle = "#000";
        ctx.fillRect(ix - 0.06 * ew, ey - ir, 0.12 * ew, ir * 2);
        ctx.restore();
      }
    }

    // 5. mouths: dark holes with a lit upper lip, teeth when they gape wide
    if (!calm) {
      for (let k = 0; k < MOUTHS.length; k++) {
        const ang = MOUTHS[k][0] * DEG, rf = MOUTHS[k][1];
        const mx = cx + Math.cos(ang) * rx * rf, my = cy + Math.sin(ang) * ry * rf;
        const gape = clamp(pain * 0.9, 0, 1) * (0.55 + 0.45 * Math.sin(G.t * 2.6 + k * 2.1));
        const mrx = m * 0.045, mry = m * 0.012 + m * 0.05 * gape;
        offsetShade(ctx, () => { ctx.beginPath(); ctx.ellipse(mx, my, mrx, mry, 0, 0, 6.283); },
          0, -0.25 * mry, "rgba(90,20,24,1)", "rgba(14,2,4,1)");
        if (gape > 0.5) {
          ctx.fillStyle = "#c8bdb0";
          const lipY = my - mry;
          for (let ti = 0; ti < 4; ti++) {
            const tx = mx + (ti - 1.5) * mrx * 0.4;
            ctx.beginPath();
            ctx.moveTo(tx - 0.09 * mrx, lipY);
            ctx.lineTo(tx + 0.09 * mrx, lipY);
            ctx.lineTo(tx, lipY + 0.4 * mry);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }

    ctx.restore();

    // the calm band: a faint darker shape across the top of the body
    if (calm) {
      ctx.save();
      ctx.globalAlpha = vis;
      fleshPath(ctx, cx, cy, rx, ry, 0, 0, 0);
      ctx.clip();
      ctx.fillStyle = "#1f0508";
      ctx.fillRect(cx - rx * 1.2, cy - ry * 1.2, rx * 2.4, ry * 0.42);
      ctx.restore();
    }

    return flesh;
  }

  // the colours the old ones paint onto the body as they feed
  function drawPatches(ctx, flesh, amt, roster) {
    if (amt < 0.01 || !flesh) return;
    const { cx, cy, rx, ry } = flesh;
    const m = Math.min(G.W, G.H);
    ctx.save();
    fleshPath(ctx, cx, cy, rx, ry, 0.4, 0);
    ctx.clip();
    for (let k = 0; k < roster.length; k++) {
      const o = roster[k];
      if (o.side < 0) continue;
      const ca = o.clingAng + G.t * o.spin * 0.4;
      const px = cx + Math.cos(ca) * rx * 0.78, py = cy + Math.sin(ca) * ry * 0.78;
      const r = m * 0.065 * o.bite * smooth(amt);
      ctx.fillStyle = `rgba(${o.hue},${0.55 * amt})`;
      fleshPath(ctx, px, py, r, r * 0.8, 0.5, k);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSouls(ctx, flesh, amt, womb) {
    if (amt < 0.01 || !flesh) return;
    womb = womb == null ? 0 : womb;
    const { cx, cy, rx, ry } = flesh;
    ctx.save();
    fleshPath(ctx, cx, cy, rx, ry, 0.4, 0);
    ctx.clip();
    for (const s of souls) {
      const x0 = cx + s.ox * rx, y0 = cy + s.oy * ry + Math.sin(G.t * 0.8 + s.ph) * 4;
      const ang = Math.atan2(s.oy, s.ox) + G.t * 0.15;
      const x1 = cx + Math.cos(ang) * rx * 0.5, y1 = cy + Math.sin(ang) * ry * 0.5;
      const x = mix(x0, x1, womb), y = mix(y0, y1, womb);
      ctx.fillStyle = `rgba(245,208,107,${s.a * amt})`;
      ctx.beginPath(); ctx.arc(x, y, s.r * (1 + 0.35 * womb), 0, 6.283); ctx.fill();
    }
    ctx.restore();
  }

  // the cry that shakes the void: thin rings expanding out from the body
  function drawCry(ctx, flesh, amt) {
    if (amt < 0.01 || !flesh) return;
    const { cx, cy, rx, ry } = flesh;
    for (let k = 0; k < 5; k++) {
      const u = ((G.t * 0.42) + k * 0.20) % 1;
      const s = 1.05 + 0.75 * u;
      ctx.strokeStyle = `rgba(190,40,46,${0.55 * amt * (1 - u)})`;
      ctx.lineWidth = 4 - 3 * u;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * s, ry * s, 0, 0, 6.283);
      ctx.stroke();
    }
  }

  // the gold binding that becomes the womb
  function drawSeal(ctx, flesh, amt) {
    if (amt < 0.01 || !flesh) return;
    const { cx, cy, rx, ry } = flesh;
    const m = Math.min(G.W, G.H);
    const gold = "245,208,107";

    flatGlow(ctx, cx, cy, rx * 1.15, gold, 0.6 * amt);

    const factors = [1.08, 1.16, 1.24], widths = [0.012 * m, 0.006 * m, 0.004 * m];
    ctx.strokeStyle = `rgba(${gold},${0.85 * amt})`;
    ctx.lineCap = "round";
    for (let k = 0; k < 3; k++) {
      const sweep = 6.283 * clamp(amt * 1.5 - k * 0.25, 0, 1);
      if (sweep <= 0) continue;
      ctx.lineWidth = widths[k];
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * factors[k], ry * factors[k], 0, -90 * DEG, -90 * DEG + sweep);
      ctx.stroke();
    }

    // ticks on the outer band only appear where that band has drawn itself in
    const sweepOuter = 6.283 * clamp(amt * 1.5 - 2 * 0.25, 0, 1);
    ctx.fillStyle = `rgba(${gold},${0.9 * amt})`;
    for (let k = 0; k < 24; k++) {
      const ang = k * 15 * DEG + G.t * 0.05;
      const rel = (((ang + 90 * DEG) % 6.283) + 6.283) % 6.283;
      if (rel > sweepOuter) continue;
      const px = cx + Math.cos(ang) * rx * 1.24, py = cy + Math.sin(ang) * ry * 1.24;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.atan2(rx * Math.sin(ang), ry * Math.cos(ang)));
      ctx.fillRect(-0.004 * m, -0.011 * m, 0.008 * m, 0.022 * m);
      ctx.restore();
    }

    // six clasps on the middle band
    const hd = 0.014 * m;
    for (let k = 0; k < 6; k++) {
      const ang = k * 60 * DEG;
      const px = cx + Math.cos(ang) * rx * 1.16, py = cy + Math.sin(ang) * ry * 1.16;
      flatGlow(ctx, px, py, 0.05 * m, gold, 0.5 * amt);
      ctx.fillStyle = `rgba(${gold},${amt})`;
      ctx.beginPath();
      ctx.moveTo(px, py - hd);
      ctx.lineTo(px + hd, py);
      ctx.lineTo(px, py + hd);
      ctx.lineTo(px - hd, py);
      ctx.closePath();
      ctx.fill();
    }
  }

  return { fleshGeom, fleshPath, drawFlesh, drawPatches, drawSouls, drawCry, drawSeal };
})();
