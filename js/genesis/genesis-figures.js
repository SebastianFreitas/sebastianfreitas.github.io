/* genesis-figures.js — flat silhouettes for the cutscene's cast. Every
   painter takes screen coordinates: `y` is the FOOT line (hem/feet) and
   `h` the figure's full height in px. Lit left third, hard shade right.
   genesis-titans.js adds drawTitan and drawHound to the same object. */
window.GenFig = window.GenFig || {};
(function (F) {
  const G = window.Gen;
  const { clamp, mix, smooth } = Util;
  const { litShade, circle } = Paint;
  const { flatGlow, mixHex } = GenPaint;

  function tracePoly(ctx, pts) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }
  function fillPoly(ctx, pts, fill) {
    ctx.beginPath(); tracePoly(ctx, pts);
    ctx.fillStyle = fill; ctx.fill();
  }
  function shadedPoly(ctx, pts, xSplit, lit, shade) {
    litShade(ctx, () => { ctx.beginPath(); tracePoly(ctx, pts); }, xSplit, lit, shade);
  }
  function quad(ax, ay, bx, by, w) {
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len * w / 2, ny = dx / len * w / 2;
    return [[ax - nx, ay - ny], [ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny]];
  }
  function withTilt(ctx, x, y, ang, fn) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.translate(-x, -y);
    fn();
    ctx.restore();
  }
  F.fillPoly = fillPoly; F.shadedPoly = shadedPoly; F.quad = quad; F.withTilt = withTilt;

  /* ---- gods: light spill, optional wings, robe, arms (one may reach
     toward a target), head, optional crown ---- */
  F.drawGod = function drawGod(ctx, x, y, h, style, o) {
    o = o || {};
    const a = o.a ?? 1, f = o.face || 1, ph = o.ph || 0, tilt = o.tilt || 0;
    if (a < 0.01) return;
    ctx.save();
    ctx.globalAlpha = a;
    withTilt(ctx, x, y, tilt * f, () => {
      flatGlow(ctx, x, y - 0.25 * h, 0.36 * h, style.glow, 0.22);

      if (o.wings) {
        ctx.globalAlpha = a * 0.75;
        for (const s of [-1, 1]) {
          const flap = 0.05 * h * Math.sin(G.t * 2.2 + ph);
          fillPoly(ctx, [
            [x + s * 0.18 * h, y - 0.66 * h],
            [x + s * 0.55 * h, y - 0.95 * h + flap],
            [x + s * 0.66 * h, y - 0.70 * h + flap * 0.5],
            [x + s * 0.50 * h, y - 0.48 * h],
          ], style.shade);
        }
        ctx.globalAlpha = a;
      }

      const sw = 0.02 * h * Math.sin(G.t * 1.3 + ph);
      shadedPoly(ctx, [
        [x - 0.31 * h + sw, y], [x - 0.22 * h, y - 0.30 * h], [x - 0.18 * h, y - 0.66 * h],
        [x - 0.07 * h, y - 0.74 * h], [x + 0.07 * h, y - 0.74 * h], [x + 0.18 * h, y - 0.66 * h],
        [x + 0.22 * h, y - 0.30 * h], [x + 0.31 * h + sw, y],
        [x + 0.16 * h, y - 0.035 * h], [x, y], [x - 0.16 * h, y - 0.035 * h],
      ], x - 0.09 * h, style.lit, style.shade);

      const shL = [x - 0.18 * h, y - 0.66 * h], shR = [x + 0.18 * h, y - 0.66 * h];
      let hL = [x - 0.28 * h, y - 0.34 * h], hR = [x + 0.28 * h, y - 0.34 * h];
      let reachHand = null, reachAmt = 0;
      if (o.reach && o.reach.amt > 0) {
        reachAmt = o.reach.amt;
        const sh = f === 1 ? shR : shL, rest = f === 1 ? hR : hL;
        const dx = o.reach.x - sh[0], dy = o.reach.y - sh[1], len = Math.hypot(dx, dy) || 1;
        const tx = sh[0] + dx / len * 0.44 * h, ty = sh[1] + dy / len * 0.44 * h;
        reachHand = [mix(rest[0], tx, reachAmt), mix(rest[1], ty, reachAmt)];
        if (f === 1) hR = reachHand; else hL = reachHand;
      }
      fillPoly(ctx, quad(shL[0], shL[1], hL[0], hL[1], 0.075 * h), style.lit);
      fillPoly(ctx, quad(shR[0], shR[1], hR[0], hR[1], 0.075 * h), style.shade);
      if (reachHand) {
        flatGlow(ctx, reachHand[0], reachHand[1], 0.07 * h, style.glow, reachAmt);
        ctx.globalAlpha = reachAmt * a;
        circle(ctx, reachHand[0], reachHand[1], 0.025 * h, style.core);
        ctx.globalAlpha = a;
      }

      const hx = x, hy = y - 0.86 * h;
      flatGlow(ctx, hx, hy, 0.44 * h, style.glow, 0.85);
      litShade(ctx, () => { ctx.beginPath(); ctx.arc(hx, hy, 0.11 * h, 0, Math.PI * 2); },
        x + 0.02 * h, style.core, mixHex(style.core, style.lit, 0.35));

      if (o.crown) {
        ctx.globalAlpha = 0.9 * a;
        if (o.crown === "bars") {
          const sway = (3 * Math.PI / 180) * Math.sin(G.t * 0.9 + ph);
          for (const d of [-52, -26, 0, 26, 52]) {
            const ang = -Math.PI / 2 + d * Math.PI / 180 + sway;
            fillPoly(ctx, quad(
              hx + Math.cos(ang) * 0.15 * h, hy + Math.sin(ang) * 0.15 * h,
              hx + Math.cos(ang) * 0.31 * h, hy + Math.sin(ang) * 0.31 * h, 0.02 * h
            ), style.core);
          }
        } else if (o.crown === "rings") {
          const breathe = 1 + 0.25 * Math.sin(G.t * 1.1 + ph);
          ctx.globalAlpha = 0.6 * a;
          ctx.strokeStyle = style.core; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.ellipse(hx, hy, 0.20 * h, 0.06 * h * breathe, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(hx, hy, 0.29 * h, 0.09 * h * breathe, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 0.9 * a;
        } else if (o.crown === "orbit") {
          const base = G.t * 1.6 + ph;
          for (let k = 0; k < 3; k++) {
            const ang = base + k * (Math.PI * 2 / 3);
            circle(ctx, hx + Math.cos(ang) * 0.21 * h, hy + Math.sin(ang) * 0.21 * h, 0.022 * h, style.core);
          }
        } else if (o.crown === "clock") {
          ctx.globalAlpha = 0.7 * a;
          ctx.strokeStyle = style.core; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(hx, hy, 0.21 * h, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 0.9 * a;
          const hAng = G.t * 2.4;
          ctx.beginPath(); ctx.moveTo(hx, hy);
          ctx.lineTo(hx + Math.cos(hAng) * 0.19 * h, hy + Math.sin(hAng) * 0.19 * h);
          ctx.stroke();
        } else if (o.crown === "petals") {
          for (let k = 0; k < 6; k++) {
            const ang = k * (Math.PI * 2 / 6) + G.t * 0.3;
            const bx = hx + Math.cos(ang) * 0.15 * h, by = hy + Math.sin(ang) * 0.15 * h;
            const tx = hx + Math.cos(ang) * 0.30 * h, ty = hy + Math.sin(ang) * 0.30 * h;
            const px = -Math.sin(ang) * 0.02 * h, py = Math.cos(ang) * 0.02 * h;
            fillPoly(ctx, [[bx - px, by - py], [bx + px, by + py], [tx, ty]], style.core);
          }
        } else if (o.crown === "spikes") {
          for (let k = 0; k < 7; k++) {
            const ang = -Math.PI / 2 - (200 * Math.PI / 180) / 2 + (200 * Math.PI / 180) * (k / 6);
            const len = mix(0.09 * h, 0.16 * h, k / 6) * (0.8 + 0.2 * Math.sin(G.t * 9 + k));
            const bx = hx + Math.cos(ang) * 0.12 * h, by = hy + Math.sin(ang) * 0.12 * h;
            const tx = hx + Math.cos(ang) * (0.12 * h + len), ty = hy + Math.sin(ang) * (0.12 * h + len);
            const px = -Math.sin(ang) * 0.025 * h, py = Math.cos(ang) * 0.025 * h;
            fillPoly(ctx, [[bx - px, by - py], [bx + px, by + py], [tx, ty]], k % 2 === 0 ? style.core : style.lit);
          }
        }
      }
    });
    ctx.restore();
  };
  /* ---- warlocks: hooded cloaked mortal-scale figures with a staff;
     returns the staff-gem position so callers can beam from it ---- */
  F.drawWarlock = function drawWarlock(ctx, x, y, h, style, o) {
    o = o || {};
    const a = o.a ?? 1, f = o.face || 1, tilt = o.tilt || 0;
    const walk = o.walk || 0, pose = o.pose;
    const bob = 0.02 * h * Math.abs(Math.sin(walk * 0.06));
    const hs = 0.03 * h * Math.sin(walk * 0.12);
    const yy = y - bob;
    let gx = 0, gy = 0;
    if (a < 0.01) return { gx, gy };
    ctx.save();
    ctx.globalAlpha = a;
    withTilt(ctx, x, y, tilt * f, () => {
      const cloakPts = [
        [x - 0.25 * h - hs, yy], [x - 0.19 * h, yy - 0.40 * h], [x - 0.15 * h, yy - 0.72 * h],
        [x, yy - 0.78 * h], [x + 0.15 * h, yy - 0.72 * h], [x + 0.19 * h, yy - 0.40 * h],
        [x + 0.25 * h + hs, yy],
        [x + 0.12 * h, yy - 0.03 * h], [x, yy], [x - 0.12 * h, yy - 0.03 * h],
      ];
      const hoodPts = [
        [x - 0.15 * h, yy - 0.72 * h], [x - 0.06 * h, yy - 0.92 * h],
        [x + f * 0.03 * h, yy - 1.0 * h], [x + 0.06 * h, yy - 0.92 * h], [x + 0.15 * h, yy - 0.72 * h],
      ];
      const traceCloak = () => { ctx.beginPath(); tracePoly(ctx, cloakPts); tracePoly(ctx, hoodPts); };
      if (o.split) {
        ctx.save();
        traceCloak(); ctx.clip();
        ctx.fillStyle = "#c8202a"; ctx.fillRect(-1e5, -1e5, x + 1e5, 2e5);
        ctx.fillStyle = "#b8b0a6"; ctx.fillRect(x, -1e5, 2e5, 2e5);
        ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fillRect(x - 0.07 * h, -1e5, 2e5, 2e5);
        ctx.restore();
      } else {
        litShade(ctx, traceCloak, x - 0.07 * h, style.lit, style.shade);
      }

      const hdx = x + f * 0.045 * h, hdy = yy - 0.83 * h;
      flatGlow(ctx, hdx, hdy, 0.10 * h, style.glow, 0.35);
      ctx.beginPath(); ctx.ellipse(hdx, hdy, 0.065 * h, 0.085 * h, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(8,10,12,1)"; ctx.fill();
      circle(ctx, x + f * 0.03 * h - 0.02 * h, yy - 0.84 * h, 0.012 * h, style.core);
      circle(ctx, x + f * 0.03 * h + 0.02 * h, yy - 0.84 * h, 0.012 * h, style.core);

      let baseX, baseY, tipX, tipY;
      if (pose === "cast") {
        baseX = x + f * 0.16 * h; baseY = yy - 0.30 * h;
        tipX = x + f * 0.42 * h; tipY = yy - 1.05 * h;
        if (o.reach) {
          const len = Math.hypot(tipX - baseX, tipY - baseY);
          const dx = o.reach.x - baseX, dy = o.reach.y - baseY, dl = Math.hypot(dx, dy) || 1;
          tipX = baseX + dx / dl * len; tipY = baseY + dy / dl * len;
        }
      } else {
        baseX = x + f * 0.20 * h; baseY = yy;
        const rawX = x + f * 0.27 * h, rawY = yy - 0.98 * h;
        const sway = (3 * Math.PI / 180) * Math.sin(walk * 0.12);
        const dx = rawX - baseX, dy = rawY - baseY;
        tipX = baseX + dx * Math.cos(sway) - dy * Math.sin(sway);
        tipY = baseY + dx * Math.sin(sway) + dy * Math.cos(sway);
      }
      ctx.save();
      ctx.strokeStyle = "#2a2320"; ctx.lineWidth = 0.03 * h; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(baseX, baseY); ctx.lineTo(tipX, tipY); ctx.stroke();
      ctx.restore();

      gx = tipX; gy = tipY;
      if (pose !== "dead") {
        flatGlow(ctx, gx, gy, pose === "cast" ? 0.22 * h : 0.16 * h, style.glow, pose === "cast" ? 1 : 0.8);
      }
      circle(ctx, gx, gy, 0.045 * h, style.core);
    });
    ctx.restore();
    return { gx, gy };
  };
  /* ---- troops: tiny soldiers drawn by the dozen, no glow ---- */
  F.drawTroop = function drawTroop(ctx, x, y, s, rgb, o) {
    o = o || {};
    let a = o.a ?? 1;
    const f = o.face || 1, ph = o.ph || 0;
    const walk = o.walk || 0;
    let thrust = o.thrust || 0;
    const lunge = o.lunge || 0;
    const pose = o.pose || "march";
    const down = o.down ?? 1;
    if (pose === "dead") a *= 0.55;
    else if (pose === "fight") { x += f * 0.25 * s * lunge; thrust = lunge; }
    if (a < 0.01) return;
    const fill = "rgba(" + rgb + "," + a + ")";
    ctx.save();
    withTilt(ctx, x, y, pose === "dead" ? f * (Math.PI / 2) * down : 0, () => {
      circle(ctx, x, y - 0.86 * s, 0.15 * s, fill);
      ctx.fillStyle = fill;
      ctx.fillRect(x - 0.15 * s, y - 0.72 * s, 0.30 * s, 0.36 * s);

      ctx.strokeStyle = fill; ctx.lineWidth = 0.09 * s;
      ctx.beginPath();
      ctx.moveTo(x, y - 0.36 * s); ctx.lineTo(x + f * 0.16 * s * Math.sin(walk), y);
      ctx.moveTo(x, y - 0.36 * s); ctx.lineTo(x - f * 0.16 * s * Math.sin(walk), y);
      ctx.stroke();

      if (pose !== "dead") {
        const spBase = [x + f * 0.14 * s, y - 0.20 * s];
        const spEnd = [x + f * (0.26 * s + 0.18 * s * thrust), y - 1.15 * s];
        ctx.strokeStyle = fill; ctx.lineWidth = Math.max(1, 0.06 * s);
        ctx.beginPath(); ctx.moveTo(spBase[0], spBase[1]); ctx.lineTo(spEnd[0], spEnd[1]); ctx.stroke();
        const dx = spEnd[0] - spBase[0], dy = spEnd[1] - spBase[1], len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
        fillPoly(ctx, [
          [spEnd[0] - nx * 0.06 * s, spEnd[1] - ny * 0.06 * s],
          [spEnd[0] + nx * 0.06 * s, spEnd[1] + ny * 0.06 * s],
          [spEnd[0] + ux * 0.12 * s, spEnd[1] + uy * 0.12 * s],
        ], fill);
      }

      if (o.shield) {
        circle(ctx, x + f * 0.14 * s, y - 0.52 * s, 0.13 * s, "rgba(" + rgb + "," + (a * 0.55) + ")");
      }

      if (pose !== "dead" && o.banner) {
        const top = [x - f * 0.20 * s, y - 1.7 * s];
        fillPoly(ctx, quad(x - f * 0.20 * s, y, top[0], top[1], 0.06 * s), fill);
        const wv = 0.06 * s * Math.sin(G.t * 4 + ph);
        fillPoly(ctx, [
          top,
          [top[0] + f * 0.55 * s, top[1] + 0.08 * s + wv],
          [top[0] + f * 0.50 * s, top[1] + 0.38 * s + wv],
          [top[0], top[1] + 0.32 * s],
        ], fill);
      }
    });
    ctx.restore();
  };

  /* ---- a plain mortal: pale, unlit, no crown or glow ---- */
  F.drawMortal = function drawMortal(ctx, x, y, h, o) {
    o = o || {};
    const a = o.a ?? 1, f = o.face || 1, tilt = o.tilt || 0;
    if (a < 0.01) return;
    const walk = o.walk || 0;
    const LIT = "#c9c4b8", SHADE = "#8a857c";
    ctx.save();
    ctx.globalAlpha = a;
    withTilt(ctx, x, y, tilt * f, () => {
      litShade(ctx, () => {
        ctx.beginPath();
        ctx.arc(x, y - 0.90 * h, 0.09 * h, 0, Math.PI * 2);
        tracePoly(ctx, [
          [x - 0.11 * h, y - 0.80 * h], [x + 0.11 * h, y - 0.80 * h],
          [x + 0.08 * h, y - 0.45 * h], [x - 0.08 * h, y - 0.45 * h],
        ]);
      }, x - 0.03 * h, LIT, SHADE);

      const swing = f * 0.12 * h * Math.sin(walk);
      fillPoly(ctx, quad(x - 0.04 * h, y - 0.45 * h, x - swing, y, 0.06 * h), SHADE);
      fillPoly(ctx, quad(x + 0.04 * h, y - 0.45 * h, x + swing, y, 0.06 * h), SHADE);

      ctx.strokeStyle = SHADE; ctx.lineWidth = 0.05 * h;
      ctx.beginPath();
      ctx.moveTo(x - 0.11 * h, y - 0.80 * h); ctx.lineTo(x - 0.11 * h + swing, y - 0.45 * h);
      ctx.moveTo(x + 0.11 * h, y - 0.80 * h); ctx.lineTo(x + 0.11 * h - swing, y - 0.45 * h);
      ctx.stroke();
    });
    ctx.restore();
  };
})(window.GenFig);
