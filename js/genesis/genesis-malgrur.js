/* genesis-malgrur.js — the devils of Malgrur: mostly tall, thin, crooked
   horned things (gaunt) or bat-like fliers (bat), with the old humanoid
   trident-devil kept on as a rare third form (fiend). y = foot line, s =
   body height. */
(function () {
  const GH = window.GenHosts; if (!GH) return;
  const G = window.Gen;
  const drawFiend = GH.drawDevil; // the old humanoid, kept for the rare few
  const { clamp, mix } = Util;
  const { litShade, circle } = Paint;
  const { flatGlow } = GenPaint;
  const { fillPoly, quad, withTilt, shadedPoly } = GenFig;
  const HAND = GH.HAND;

  const M_SKIN_LIT = "#b8372a", M_SKIN_SHADE = "#5e1712", M_DARK = "#1f0806";
  const M_HORN_LIT = "#e3d3aa", M_HORN_SHADE = "#8f7b52";
  const M_WING_LIT = "#5a1814", M_WING_SHADE = "#2e0908", M_WING_BONE = "#82281e";
  const M_EYE_RGB = "255,207,90"; // M_EYE #ffcf5a, as flatGlow rgb

  function lw(v) { return Math.max(1, v); }

  // a crooked tapering horn: 5 quad segments from (x,y), curling toward -f
  function horn(ctx, x, y, s, f, len, curl, lit, shade) {
    const n = 5, segLen = len / n;
    let ang = -Math.PI / 2, cx = x, cy = y;
    for (let i = 0; i < n; i++) {
      const nx = cx + Math.cos(ang) * segLen, ny = cy + Math.sin(ang) * segLen;
      const w = lw((0.06 - 0.06 * (i / n)) * s);
      fillPoly(ctx, quad(cx, cy, nx, ny, w), i === 0 ? shade : lit);
      cx = nx; cy = ny;
      ang -= f * curl;
    }
  }

  // ---- GAUNT: tall, thin, crooked, horned ----
  function drawGaunt(ctx, x, y, s, f, o) {
    const walk = o.walk || 0, ph = o.ph || 0, pose = o.pose || "march";
    const lunge = o.lunge || 0, cast = o.cast || 0;
    const hk = (Math.sin(ph * 7.3) + 1) / 2;

    const pelX = x + f * -0.04 * s, pelY = y - 0.74 * s;
    const shX = x + f * 0.16 * s, shY = y - 1.14 * s;

    // tail: thin whip from the pelvis, curving back and down
    ctx.save();
    ctx.strokeStyle = M_SKIN_SHADE; ctx.lineWidth = lw(0.035 * s);
    const tex = x - f * 0.30 * s, tey = y - 0.10 * s + 0.06 * s * Math.sin(G.t * 3 + ph);
    const tcx = x - f * 0.20 * s, tcy = y - 0.36 * s;
    ctx.beginPath();
    ctx.moveTo(pelX, pelY);
    ctx.quadraticCurveTo(tcx, tcy, tex, tey);
    ctx.stroke();
    ctx.restore();
    fillPoly(ctx, [
      [tex, tey - 0.04 * s],
      [tex - f * 0.08 * s, tey],
      [tex, tey + 0.04 * s],
    ], M_SKIN_SHADE);

    // limb segment: one flat fill, near = lit with a hard shade band on the
    // right/back ~60%, far = all shade
    function limb(ax, ay, bx, by, w, near) {
      const pts = quad(ax, ay, bx, by, lw(w));
      if (!near) { fillPoly(ctx, pts, M_SKIN_SHADE); return; }
      const xs = pts.map((p) => p[0]);
      const xSplit = Math.min(...xs) + 0.4 * (Math.max(...xs) - Math.min(...xs));
      shadedPoly(ctx, pts, xSplit, M_SKIN_LIT, M_SKIN_SHADE);
    }

    // legs: hip -> knee (fwd) -> hock (back) -> clawed foot, alternate swing
    const swAmt = pose === "march" ? 0.16 * s * walk * Math.sin(G.t * 5 + ph) : 0;
    const armSwAmt = -swAmt;
    [-1, 1].forEach((side) => {
      const near = side > 0;
      const sw = swAmt * side;
      const hipX = pelX + 0.035 * s * side, hipY = pelY;
      const kneeX = x + f * 0.08 * s + sw, kneeY = y - 0.46 * s;
      const hockX = x + f * -0.10 * s + sw * 0.5, hockY = y - 0.18 * s;
      const footX = x + f * 0.05 * s + sw * 0.3, footY = y;
      limb(hipX, hipY, kneeX, kneeY, 0.075 * s, near);
      limb(kneeX, kneeY, hockX, hockY, 0.055 * s, near);
      limb(hockX, hockY, footX, footY, 0.04 * s, near);
      fillPoly(ctx, [
        [footX, footY], [footX + f * 0.06 * s, footY + 0.02 * s], [footX + f * 0.02 * s, footY - 0.01 * s],
      ], M_DARK);
      fillPoly(ctx, [
        [footX, footY], [footX + f * 0.05 * s, footY + 0.015 * s], [footX + f * 0.01 * s, footY + 0.03 * s],
      ], M_DARK);
    });

    // torso: a solid leaning volume, waist to chest, with a hunched back
    // hump at the shoulders and the ribcage bulging forward at mid-height
    const dxT = shX - pelX, dyT = shY - pelY, lenT = Math.hypot(dxT, dyT) || 1;
    const nxT = -dyT / lenT, nyT = dxT / lenT, sxT = dxT / lenT, syT = dyT / lenT;
    const wPel = 0.09 * s, wSh = 0.17 * s, wMid = (wPel + wSh) / 2;
    const midX = pelX + dxT * 0.55, midY = pelY + dyT * 0.55;
    const torso = [
      [pelX + nxT * wPel / 2, pelY + nyT * wPel / 2],
      [midX + nxT * (wMid / 2 + 0.05 * s), midY + nyT * (wMid / 2 + 0.05 * s)],
      [shX + nxT * wSh / 2, shY + nyT * wSh / 2],
      [shX + sxT * 0.12 * s - nxT * 0.09 * s, shY + syT * 0.12 * s - nyT * 0.09 * s],
      [shX - nxT * wSh / 2, shY - nyT * wSh / 2],
      [pelX - nxT * wPel / 2, pelY - nyT * wPel / 2],
    ];
    const torXs = torso.map((p) => p[0]);
    const torXsplit = Math.min(...torXs) + 0.3 * (Math.max(...torXs) - Math.min(...torXs));
    shadedPoly(ctx, torso, torXsplit, M_SKIN_LIT, M_SKIN_SHADE);
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      circle(ctx, pelX + dxT * t - nxT * 0.03 * s, pelY + dyT * t - nyT * 0.03 * s, lw(0.018 * s), M_SKIN_SHADE);
    }

    // far arm: shoulder -> elbow -> hand hanging at knee height
    const farShY = shY, nearShY = shY + 0.05 * s;
    const farElbowX = x + f * 0.14 * s, farElbowY = y - 0.80 * s + armSwAmt * 0.4;
    const farHandX = x + f * 0.14 * s + armSwAmt, farHandY = y - 0.56 * s;
    limb(shX, farShY, farElbowX, farElbowY, 0.055 * s, false);
    limb(farElbowX, farElbowY, farHandX, farHandY, 0.04 * s, false);
    [-0.10, 0, 0.10].forEach((d) => {
      fillPoly(ctx, quad(farHandX, farHandY, farHandX + f * 0.10 * s + d * s, farHandY + 0.10 * s, lw(1)), M_DARK);
    });

    // neck + head, crooked and tilted
    const headBase = [x + f * 0.30 * s, y - 1.16 * s];
    fillPoly(ctx, quad(shX, shY, headBase[0], headBase[1], lw(0.05 * s)), M_SKIN_SHADE);
    withTilt(ctx, headBase[0], headBase[1], 0.14 * f, () => {
      // skull ~0.12s long x 0.08s tall: crown, snout tip, throat give it bulk
      const crownX = headBase[0] - f * 0.02 * s, crownY = headBase[1] - 0.08 * s;
      const snoutX = headBase[0] + f * 0.12 * s, snoutY = headBase[1] - 0.03 * s;
      const throatX = headBase[0] + f * 0.02 * s, throatY = headBase[1] + 0.03 * s;
      const jawX = snoutX - f * 0.03 * s, jawY = snoutY + 0.16 * s;
      const hornLen = 0.30 * s + 0.16 * s * hk, hornCurl = 0.10 + 0.25 * hk;

      // far horn: starts further back, sweeps back more steeply
      withTilt(ctx, crownX - f * 0.03 * s, crownY, -f * 0.5, () => {
        horn(ctx, crownX - f * 0.03 * s, crownY, s, f, hornLen, hornCurl, M_HORN_SHADE, M_HORN_SHADE);
      });

      // skull, with a long hooked jaw
      const skull = [[crownX, crownY], [snoutX, snoutY], [throatX, throatY]];
      const skXs = skull.map((p) => p[0]);
      const skXsplit = Math.min(...skXs) + 0.3 * (Math.max(...skXs) - Math.min(...skXs));
      shadedPoly(ctx, skull, skXsplit, M_SKIN_LIT, M_SKIN_SHADE);
      fillPoly(ctx, [[snoutX, snoutY], [jawX, jawY], [throatX, throatY]], M_SKIN_SHADE);

      flatGlow(ctx, headBase[0] + f * 0.05 * s, headBase[1] - 0.03 * s, Math.min(0.03 * s, 3), M_EYE_RGB, 0.85);
      flatGlow(ctx, headBase[0] + f * 0.08 * s, headBase[1] - 0.02 * s, Math.min(0.03 * s, 3), M_EYE_RGB, 0.85);

      // near horn: sweeps up and back, lit with a shaded base band
      horn(ctx, crownX, crownY, s, f, hornLen, hornCurl, M_HORN_LIT, M_HORN_SHADE);
    });

    // near arm: rakes toward the fight target and/or the cast hand
    const nearElbowX = x + f * 0.20 * s, nearElbowY = y - 0.85 * s + armSwAmt * 0.4;
    let nearHandX = x + f * 0.22 * s + armSwAmt, nearHandY = y - 0.52 * s;
    if (pose === "fight") {
      nearHandX = mix(nearHandX, x + f * 0.48 * s, lunge);
      nearHandY = mix(nearHandY, y - 1.00 * s, lunge);
    }
    if (cast > 0.01) {
      nearHandX = mix(nearHandX, x + f * HAND[0] * s, cast);
      nearHandY = mix(nearHandY, y - HAND[1] * s, cast);
    }
    limb(shX, nearShY, nearElbowX, nearElbowY, 0.055 * s, true);
    limb(nearElbowX, nearElbowY, nearHandX, nearHandY, 0.04 * s, true);
    [-0.10, 0, 0.10].forEach((d) => {
      fillPoly(ctx, quad(nearHandX, nearHandY, nearHandX + f * 0.10 * s + d * s, nearHandY + 0.10 * s, lw(1)), M_DARK);
    });
  }

  // ---- BAT: horned bat-demon flier, membrane wings ----
  function drawBat(ctx, x, y, s, f, o) {
    const pose = o.pose || "march", ph = o.ph || 0;
    const dead = pose === "dead";
    const cx = x, cy = y - 0.55 * s;

    // torso ~0.40s long x 0.18s wide
    const backX = cx - f * 0.17 * s, backY = cy + 0.085 * s;
    const frontX = cx + f * 0.19 * s, frontY = cy - 0.085 * s;
    const dxT = frontX - backX, dyT = frontY - backY, lenT = Math.hypot(dxT, dyT) || 1;
    const nxT = -dyT / lenT, nyT = dxT / lenT;
    const wBack = lw(0.13 * s), wFront = lw(0.18 * s);
    const torso = [
      [backX - nxT * wBack / 2, backY - nyT * wBack / 2],
      [backX + nxT * wBack / 2, backY + nyT * wBack / 2],
      [frontX + nxT * wFront / 2, frontY + nyT * wFront / 2],
      [frontX - nxT * wFront / 2, frontY - nyT * wFront / 2],
    ];
    const torXs = torso.map((p) => p[0]);
    const torXsplit = Math.min(...torXs) + 0.3 * (Math.max(...torXs) - Math.min(...torXs));

    const hip = [backX - f * 0.02 * s, backY + 0.02 * s];
    const wroot = [cx - f * 0.02 * s, cy - 0.08 * s];
    // elevation above horizontal; the far wing is raised further so both
    // read as a V above the body at the top of the stroke
    const elevNear = 0.35 + 0.55 * Math.sin(G.t * 7 + ph);
    const elevFar = elevNear + 0.35;
    const angFor = (elev) => Math.atan2(0, -f) + f * elev;

    function pullBack(p, target, amt) {
      const dx = target[0] - p[0], dy = target[1] - p[1], len = Math.hypot(dx, dy) || 1;
      return [p[0] + dx / len * amt, p[1] + dy / len * amt];
    }

    // hard shade band across the lower third of a poly (gravity shading,
    // not the general left/right light split)
    function lowerThird(pts, fill) {
      const ys = pts.map((p) => p[1]);
      const ySplit = Math.max(...ys) - (Math.max(...ys) - Math.min(...ys)) / 3;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = fill;
      ctx.fillRect(-1e5, ySplit, 2e5, 2e5);
      ctx.restore();
    }

    function wingShape(armAngle) {
      const wristX = wroot[0] + Math.cos(armAngle) * 0.42 * s, wristY = wroot[1] + Math.sin(armAngle) * 0.42 * s;
      // fingers fanned ~70 degrees total, always spread
      const tips = [-0.61, 0, 0.61].map((d) => {
        const ang = armAngle + d;
        return [wroot[0] + Math.cos(ang) * 0.85 * s, wroot[1] + Math.sin(ang) * 0.85 * s];
      });
      const sc01 = pullBack([(tips[0][0] + tips[1][0]) / 2, (tips[0][1] + tips[1][1]) / 2], [cx, cy], 0.12 * s);
      const sc12 = pullBack([(tips[1][0] + tips[2][0]) / 2, (tips[1][1] + tips[2][1]) / 2], [cx, cy], 0.12 * s);
      const sc2h = pullBack([(tips[2][0] + hip[0]) / 2, (tips[2][1] + hip[1]) / 2], [cx, cy], 0.12 * s);
      const membrane = [wroot, tips[0], sc01, tips[1], sc12, tips[2], sc2h, hip];
      return { wristX, wristY, tips, membrane };
    }

    function drawWing(lit, shadeBand, elev) {
      if (dead) {
        // folded and crumpled against the body, on the foot line
        fillPoly(ctx, [
          wroot, [wroot[0] - f * 0.10 * s, y - 0.06 * s], [wroot[0] - f * 0.20 * s, y - 0.02 * s],
          [wroot[0] - f * 0.06 * s, y],
        ], lit);
        return;
      }
      const armAngle = angFor(elev);
      const { wristX, wristY, tips, membrane } = wingShape(armAngle);
      fillPoly(ctx, membrane, lit);
      if (shadeBand) lowerThird(membrane, shadeBand);
      fillPoly(ctx, quad(wroot[0], wroot[1], wristX, wristY, lw(0.018 * s)), M_WING_BONE);
      tips.forEach((tip) => {
        fillPoly(ctx, quad(wristX, wristY, tip[0], tip[1], lw(0.018 * s)), M_WING_BONE);
      });
    }

    // far wing, behind the body, raised higher than the near wing
    drawWing(M_WING_SHADE, null, elevFar);

    // legs, clawed feet dangling
    ctx.save();
    ctx.strokeStyle = M_DARK; ctx.lineWidth = lw(0.03 * s);
    ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(hip[0], y - 0.32 * s); ctx.stroke();
    ctx.restore();
    fillPoly(ctx, [
      [hip[0], y - 0.32 * s], [hip[0] + 0.04 * s, y - 0.28 * s], [hip[0] - 0.03 * s, y - 0.30 * s],
    ], M_DARK);

    // tail trailing back
    ctx.save();
    ctx.strokeStyle = M_SKIN_SHADE; ctx.lineWidth = lw(0.02 * s);
    ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(x - 0.40 * s, y - 0.34 * s); ctx.stroke();
    ctx.restore();

    // torso
    shadedPoly(ctx, torso, torXsplit, M_SKIN_LIT, M_SKIN_SHADE);

    // head, bigger: snout, two tall pointed ears, two short horns clearly
    // separated from the ears, eyes
    const head = [x + f * 0.22 * s, y - 0.74 * s];
    fillPoly(ctx, [
      head, [head[0] + f * 0.10 * s, head[1] + 0.02 * s], [head[0] + f * 0.02 * s, head[1] + 0.05 * s],
    ], M_SKIN_LIT);
    fillPoly(ctx, [
      [head[0] - f * 0.05 * s, head[1] - 0.02 * s], [head[0] - f * 0.07 * s, head[1] - 0.20 * s],
      [head[0] - f * 0.01 * s, head[1] - 0.05 * s],
    ], M_SKIN_SHADE);
    fillPoly(ctx, [
      [head[0] - f * 0.01 * s, head[1] - 0.01 * s], [head[0] + f * 0.01 * s, head[1] - 0.19 * s],
      [head[0] + f * 0.05 * s, head[1] - 0.04 * s],
    ], M_SKIN_LIT);
    horn(ctx, head[0] + f * 0.05 * s, head[1] - 0.05 * s, s, f, 0.08 * s, 0.4, M_HORN_SHADE, M_HORN_SHADE);
    horn(ctx, head[0] + f * 0.07 * s, head[1] - 0.04 * s, s, f, 0.08 * s, 0.4, M_HORN_LIT, M_HORN_SHADE);
    flatGlow(ctx, head[0] + f * 0.04 * s, head[1] - 0.01 * s, Math.min(0.02 * s, 2), M_EYE_RGB, 0.85);

    // near wing, in front of the body, drawn raised and forward
    drawWing(M_WING_LIT, M_WING_SHADE, elevNear);
  }

  // ---- shared: cast glow + flicker flame, copied from the old drawDevil ----
  function castFlame(ctx, x, y, s, f, cast, ph) {
    const hx = x + f * HAND[0] * s, hy = y - HAND[1] * s;
    flatGlow(ctx, hx, hy, 0.30 * s * cast, "255,130,40", 0.85 * cast);
    const flick = 0.5 + 0.5 * Math.sin(G.t * 18 + ph);
    const fh = 0.18 * s * cast;
    fillPoly(ctx, [
      [hx - 0.05 * s * cast, hy],
      [hx + 0.05 * s * cast, hy],
      [hx, hy - fh * (0.6 + 0.2 * flick)],
    ], "#ffb24a");
    fillPoly(ctx, [
      [hx - 0.03 * s * cast, hy - fh * 0.4],
      [hx + 0.03 * s * cast, hy - fh * 0.4],
      [hx, hy - fh],
    ], "#ff6a2a");
  }

  function drawDevil(ctx, x, y, s, o) {
    o = o || {};
    if (o.form === "fiend") return drawFiend(ctx, x, y, s, o);
    let a = o.a ?? 1;
    const f = o.face < 0 ? -1 : 1;
    const ph = o.ph || 0;
    const lunge = o.lunge || 0, cast = o.cast || 0;
    const pose = o.pose || "march";
    const down = o.down ?? 1;
    if (pose === "dead") a *= 0.55;
    else if (pose === "fight") x += f * 0.22 * s * lunge;
    if (a < 0.01) return;

    ctx.save();
    ctx.globalAlpha = a;
    withTilt(ctx, x, y, pose === "dead" ? f * (Math.PI / 2) * down : 0, () => {
      if (o.form === "bat") drawBat(ctx, x, y, s, f, o);
      else drawGaunt(ctx, x, y, s, f, o);
      if (cast > 0.01 && pose !== "dead") castFlame(ctx, x, y, s, f, cast, ph);
    });
    ctx.restore();
  }

  GH.drawDevil = drawDevil;
})();
