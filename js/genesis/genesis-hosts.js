/* genesis-hosts.js — the war's two hosts as flat figures: angels and
   devils on one side, abominations of bone and flesh on the other. Every
   painter stands on its foot line y with body height s. */
window.GenHosts = (function () {
  const G = window.Gen;
  const { clamp, mix } = Util;
  const { litShade, poly, circle } = Paint;
  const { flatGlow } = GenPaint;
  const { fillPoly, quad, withTilt } = GenFig;

  const HAND = [0.38, 0.80];

  function lw(v) { return Math.max(1, v); }

  // ---- DEVIL: broad, horned, hoofed, tail, bat wings, trident ----
  const D_SKIN_LIT = "#c0452c", D_SKIN_SHADE = "#6e1f16";
  const D_HORN_LIT = "#e8d8b0", D_HORN_SHADE = "#a8946a";
  const D_WING_LIT = "#4a1512", D_WING_SHADE = "#2c0b0a";
  const D_SHAFT = "#2a1a14", D_PRONG = "#d9c9a0";
  const D_EYE = "#ffcf5a";

  function drawDevil(ctx, x, y, s, o) {
    o = o || {};
    let a = o.a ?? 1;
    const f = o.face < 0 ? -1 : 1;
    const walk = o.walk || 0, ph = o.ph || 0;
    const lunge = o.lunge || 0, cast = o.cast || 0;
    const pose = o.pose || "march";
    const down = o.down ?? 1;
    if (pose === "dead") a *= 0.55;
    else if (pose === "fight") x += f * 0.22 * s * lunge;
    if (a < 0.01) return;

    ctx.save();
    ctx.globalAlpha = a;
    withTilt(ctx, x, y, pose === "dead" ? f * (Math.PI / 2) * down : 0, () => {
      // bat wings, folded, behind
      const wax = x - f * 0.06 * s, way = y - 0.68 * s;
      const flap = 0.10 * Math.sin(G.t * 4 + ph);
      withTilt(ctx, wax, way, flap, () => {
        fillPoly(ctx, [
          [wax, way],
          [x - f * 0.50 * s, y - 1.10 * s],
          [x - f * 0.34 * s, y - 0.86 * s],
          [x - f * 0.40 * s, y - 0.62 * s],
          [x - f * 0.22 * s, y - 0.50 * s],
        ], D_WING_SHADE);
      });
      withTilt(ctx, wax, way, flap * 0.8, () => {
        fillPoly(ctx, [
          [wax, way],
          [x - f * 0.34 * s, y - 0.94 * s],
          [x - f * 0.22 * s, y - 0.74 * s],
          [x - f * 0.16 * s, y - 0.56 * s],
        ], D_WING_LIT);
      });

      // tail
      ctx.save();
      ctx.strokeStyle = D_SKIN_SHADE; ctx.lineWidth = lw(0.05 * s);
      const tsx = x - f * 0.10 * s, tsy = y - 0.42 * s;
      const tex = x - f * 0.48 * s, tey = y - 0.30 * s + 0.08 * s * Math.sin(G.t * 3 + ph);
      const tcx = x - f * 0.30 * s, tcy = y - 0.10 * s;
      ctx.beginPath();
      ctx.moveTo(tsx, tsy);
      ctx.quadraticCurveTo(tcx, tcy, tex, tey);
      ctx.stroke();
      ctx.restore();
      fillPoly(ctx, [
        [tex, tey - 0.05 * s],
        [tex - f * 0.10 * s, tey],
        [tex, tey + 0.05 * s],
      ], D_SKIN_SHADE);

      // legs, digitigrade: hip -> knee (fwd) -> hock (back) -> hoof
      const swing = 0.16 * s * (pose === "march" ? Math.sin(walk) : 0);
      const hipY = y - 0.36 * s;
      [-1, 1].forEach((side) => {
        const sw = pose === "march" ? swing * side : 0.10 * s * side;
        const hipX = x + 0.06 * s * side;
        const kneeX = x + f * 0.08 * s + sw, kneeY = y - 0.20 * s;
        const hockX = x + f * 0.02 * s + sw * 0.4, hockY = y - 0.08 * s;
        const hoofX = x + sw * 0.5, hoofY = y;
        fillPoly(ctx, quad(hipX, hipY, kneeX, kneeY, 0.07 * s), D_SKIN_SHADE);
        fillPoly(ctx, quad(kneeX, kneeY, hockX, hockY, 0.06 * s), D_SKIN_LIT);
        fillPoly(ctx, [
          [hockX - 0.04 * s, hockY],
          [hockX + 0.04 * s, hockY],
          [hoofX + 0.05 * s, hoofY],
          [hoofX - 0.05 * s, hoofY],
        ], "#1a0f0a");
      });

      // torso: inverted trapezoid + hip block
      const torso = [
        [x - f * 0.22 * s, y - 0.74 * s],
        [x + f * 0.22 * s, y - 0.74 * s],
        [x + f * 0.10 * s, y - 0.40 * s],
        [x - f * 0.10 * s, y - 0.40 * s],
      ];
      const torXs = (x - 0.22 * s) + 0.3 * (0.44 * s);
      litShade(ctx, () => poly(ctx, torso), torXs, D_SKIN_LIT, D_SKIN_SHADE);
      fillPoly(ctx, quad(x - 0.10 * s, y - 0.40 * s, x + 0.10 * s, y - 0.34 * s, 0.20 * s), D_SKIN_SHADE);

      // head, horns, eyes
      circle(ctx, x, y - 0.84 * s, 0.09 * s, D_SKIN_LIT);
      const hornBase = [x - f * 0.03 * s, y - 0.90 * s];
      fillPoly(ctx, [
        hornBase,
        [hornBase[0] - f * 0.18 * s, hornBase[1] - 0.16 * s],
        [hornBase[0] - f * 0.06 * s, hornBase[1] - 0.02 * s],
      ], D_HORN_LIT);
      fillPoly(ctx, [
        [hornBase[0] + f * 0.06 * s, hornBase[1] + 0.02 * s],
        [hornBase[0] - f * 0.10 * s, hornBase[1] - 0.14 * s],
        [hornBase[0] + f * 0.02 * s, hornBase[1] + 0.04 * s],
      ], D_HORN_SHADE);
      circle(ctx, x + f * 0.03 * s, y - 0.85 * s, 0.012 * s, D_EYE);
      circle(ctx, x + f * 0.06 * s, y - 0.83 * s, 0.012 * s, D_EYE);

      // trident
      if (pose !== "dead") {
        const handX = x + f * 0.20 * s, handY = y - 0.40 * s;
        const topX = x + f * (0.30 * s + 0.22 * s * lunge), topY = y - 1.15 * s + 0.35 * s * lunge;
        ctx.save();
        ctx.strokeStyle = D_SHAFT; ctx.lineWidth = lw(0.05 * s);
        ctx.beginPath(); ctx.moveTo(handX, handY); ctx.lineTo(topX, topY); ctx.stroke();
        ctx.restore();
        const dxs = topX - handX, dys = topY - handY, lens = Math.hypot(dxs, dys) || 1;
        const uxs = dxs / lens, uys = dys / lens, nxs = -uys, nys = uxs;
        [-0.06, 0, 0.06].forEach((off) => {
          const bx0 = topX + nxs * off * s, by0 = topY + nys * off * s;
          fillPoly(ctx, [
            [bx0 - nxs * 0.02 * s, by0 - nys * 0.02 * s],
            [bx0 + nxs * 0.02 * s, by0 + nys * 0.02 * s],
            [bx0 + uxs * 0.14 * s, by0 + uys * 0.14 * s],
          ], D_PRONG);
        });
      }

      // cast
      if (cast > 0.01 && pose !== "dead") {
        const cShX = x + f * 0.10 * s, cShY = y - 0.68 * s;
        const hx = x + f * HAND[0] * s, hy = y - HAND[1] * s;
        fillPoly(ctx, quad(cShX, cShY, hx, hy, 0.05 * s), D_SKIN_LIT);
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
    });
    ctx.restore();
  }

  // ---- ABOMINATION: bone and flesh, lopsided, three variants ----
  const B_LIT = "#ddd2b6", B_SHADE = "#958a6d";
  const FL_LIT = "#8e3b4a", FL_SHADE = "#4a1622";
  const EYE_SOCK = "#120608", EYE = "#ff5a3a";

  function drawAbom(ctx, x, y, s, o) {
    o = o || {};
    let a = o.a ?? 1;
    const f = o.face < 0 ? -1 : 1;
    const walk = o.walk || 0, ph = o.ph || 0;
    const lunge = o.lunge || 0, cast = o.cast || 0;
    const pose = o.pose || "march";
    const down = o.down ?? 1;
    const variant = ((o.variant | 0) % 3 + 3) % 3;
    if (pose === "dead") a *= 0.55;
    else if (pose === "fight") x += f * 0.22 * s * lunge;
    if (a < 0.01) return;

    ctx.save();
    ctx.globalAlpha = a;
    withTilt(ctx, x, y, pose === "dead" ? f * (Math.PI / 2) * down : 0, () => {
      if (variant === 0) drawBrute(ctx, x, y, s, f, walk, lunge, pose);
      else if (variant === 1) drawCrawler(ctx, x, y, s, f, walk, pose);
      else drawStalker(ctx, x, y, s, f, lunge, pose);

      if (cast > 0.01 && pose !== "dead") {
        const cShX = x + f * 0.08 * s, cShY = y - 0.50 * s;
        const hx = x + f * HAND[0] * s, hy = y - HAND[1] * s;
        fillPoly(ctx, quad(cShX, cShY, hx, hy, 0.05 * s), FL_SHADE);
        flatGlow(ctx, hx, hy, 0.24 * s * cast, "200,30,50", 0.8 * cast);
        circle(ctx, hx, hy, 0.06 * s * cast, "#7a1622");
      }
    });
    ctx.restore();
  }

  function drawBrute(ctx, x, y, s, f, walk, lunge, pose) {
    const cx = x - f * 0.02 * s, cy = y - 0.50 * s;
    const body = [
      [cx - f * 0.28 * s, cy + 0.20 * s],
      [cx - f * 0.30 * s, cy - 0.06 * s],
      [cx - f * 0.16 * s, cy - 0.24 * s],
      [cx + f * 0.02 * s, cy - 0.28 * s],
      [cx + f * 0.20 * s, cy - 0.18 * s],
      [cx + f * 0.30 * s, cy + 0.02 * s],
      [cx + f * 0.24 * s, cy + 0.22 * s],
      [cx, cy + 0.27 * s],
    ];
    const bodyXs = (cx - 0.30 * s) + 0.3 * (0.60 * s);
    litShade(ctx, () => poly(ctx, body), bodyXs, FL_LIT, FL_SHADE);

    // rib bones across the flank
    for (let i = 0; i < 3; i++) {
      const ry = cy - 0.10 * s + i * 0.10 * s;
      fillPoly(ctx, quad(cx - f * 0.24 * s, ry, cx + f * 0.16 * s, ry - 0.03 * s, 0.025 * s), B_LIT);
    }
    // bone spikes along the back
    for (let i = 0; i < 3; i++) {
      const bx0 = cx - f * 0.20 * s + i * -f * 0.06 * s, by0 = cy - 0.18 * s + i * 0.04 * s;
      fillPoly(ctx, [
        [bx0 - 0.03 * s, by0],
        [bx0 + 0.03 * s, by0],
        [bx0, by0 - 0.16 * s],
      ], B_LIT);
    }

    // legs
    const sw = pose === "march" ? 0.14 * s * Math.sin(walk) : 0;
    fillPoly(ctx, quad(cx - 0.08 * s, y - 0.20 * s, x - 0.06 * s + sw, y, 0.10 * s), FL_SHADE);
    fillPoly(ctx, quad(cx + 0.06 * s, y - 0.20 * s, x + 0.06 * s - sw, y, 0.10 * s), FL_SHADE);

    // head, skull-plate, jaw
    const hx = x + f * 0.30 * s, hy = y - 0.55 * s;
    fillPoly(ctx, [
      [hx - f * 0.10 * s, hy - 0.06 * s],
      [hx + f * 0.08 * s, hy - 0.08 * s],
      [hx + f * 0.10 * s, hy + 0.02 * s],
      [hx + f * 0.02 * s, hy + 0.08 * s],
      [hx - f * 0.10 * s, hy + 0.06 * s],
    ], B_LIT);
    circle(ctx, hx + f * 0.01 * s, hy, 0.025 * s, EYE_SOCK);
    circle(ctx, hx + f * 0.01 * s, hy, 0.012 * s, EYE);
    for (let i = 0; i < 3; i++) {
      const tx0 = hx - f * 0.06 * s + f * i * 0.05 * s;
      fillPoly(ctx, [
        [tx0 - 0.015 * s, hy + 0.06 * s],
        [tx0 + 0.015 * s, hy + 0.06 * s],
        [tx0, hy + 0.11 * s],
      ], B_LIT);
    }

    // long arm ending in a bone blade
    if (pose !== "dead") {
      const shX = x + f * 0.20 * s, shY = y - 0.60 * s;
      const ang = mix(1.0, -0.4, lunge);
      const ex = shX + f * Math.cos(ang) * 0.38 * s, ey = shY + Math.sin(ang) * 0.38 * s;
      fillPoly(ctx, quad(shX, shY, ex, ey, 0.07 * s), FL_SHADE);
      const dxb = ex - shX, dyb = ey - shY, lenb = Math.hypot(dxb, dyb) || 1;
      const nxb = -dyb / lenb, nyb = dxb / lenb;
      fillPoly(ctx, [
        [ex - nxb * 0.05 * s, ey - nyb * 0.05 * s],
        [ex + nxb * 0.05 * s, ey + nyb * 0.05 * s],
        [ex + (dxb / lenb) * 0.30 * s, ey + (dyb / lenb) * 0.30 * s],
      ], B_LIT);
    }
  }

  function drawCrawler(ctx, x, y, s, f, walk, pose) {
    const by = y - 0.22 * s;
    const body = [
      [x - f * 0.42 * s, by],
      [x - f * 0.30 * s, by - 0.22 * s],
      [x + f * 0.10 * s, by - 0.30 * s],
      [x + f * 0.36 * s, by - 0.18 * s],
      [x + f * 0.42 * s, by],
      [x + f * 0.10 * s, by + 0.08 * s],
      [x - f * 0.20 * s, by + 0.08 * s],
    ];
    const bodyXs = (x - 0.42 * s) + 0.3 * (0.85 * s);
    litShade(ctx, () => poly(ctx, body), bodyXs, FL_LIT, FL_SHADE);

    // bone spine spikes
    for (let i = 0; i < 5; i++) {
      const bx0 = x - f * 0.30 * s + f * i * 0.16 * s;
      const by0 = by - 0.20 * s - 0.03 * s * Math.sin(i);
      fillPoly(ctx, [
        [bx0 - 0.025 * s, by0],
        [bx0 + 0.025 * s, by0],
        [bx0, by0 - 0.10 * s],
      ], B_LIT);
    }

    // six thin legs, alternating phase, knees raised above body line
    for (let k = 0; k < 6; k++) {
      const t = k / 5;
      const hipX = x - f * 0.36 * s + f * t * 0.72 * s;
      const hipY = by - 0.02 * s;
      const step = pose === "march" ? Math.sin(walk + k * Math.PI / 2) : (k % 2 === 0 ? 1 : -1);
      const kneeX = hipX + f * 0.05 * s, kneeY = hipY - 0.10 * s;
      const footX = hipX + step * 0.08 * s, footY = y;
      fillPoly(ctx, quad(hipX, hipY, kneeX, kneeY, 0.035 * s), B_SHADE);
      fillPoly(ctx, quad(kneeX, kneeY, footX, footY, 0.035 * s), B_LIT);
    }

    // skull at front
    const hx = x + f * 0.46 * s, hy = by - 0.12 * s;
    circle(ctx, hx, hy, 0.12 * s, B_LIT);
    circle(ctx, hx - f * 0.03 * s, hy - 0.02 * s, 0.025 * s, EYE_SOCK);
    circle(ctx, hx - f * 0.03 * s, hy - 0.02 * s, 0.012 * s, EYE);
    fillPoly(ctx, [
      [hx + f * 0.02 * s, hy + 0.08 * s],
      [hx + f * 0.12 * s, hy + 0.06 * s],
      [hx + f * 0.10 * s, hy + 0.14 * s],
    ], B_SHADE);
  }

  function drawStalker(ctx, x, y, s, f, lunge, pose) {
    // two long bone legs, backward knee
    [-1, 1].forEach((side) => {
      const hipX = x + 0.06 * s * side, hipY = y - 0.42 * s;
      const kneeX = x + 0.10 * s * side - f * 0.04 * s, kneeY = y - 0.20 * s;
      const footX = x + 0.02 * s * side, footY = y;
      fillPoly(ctx, quad(hipX, hipY, kneeX, kneeY, 0.05 * s), B_SHADE);
      fillPoly(ctx, quad(kneeX, kneeY, footX, footY, 0.05 * s), B_LIT);
    });

    // hanging flesh sack torso
    const sack = [
      [x - f * 0.14 * s, y - 0.95 * s],
      [x + f * 0.10 * s, y - 0.92 * s],
      [x + f * 0.16 * s, y - 0.66 * s],
      [x + f * 0.08 * s, y - 0.45 * s],
      [x - f * 0.10 * s, y - 0.48 * s],
      [x - f * 0.18 * s, y - 0.70 * s],
    ];
    const sackXs = (x - 0.18 * s) + 0.3 * (0.34 * s);
    litShade(ctx, () => poly(ctx, sack), sackXs, FL_LIT, FL_SHADE);

    // exposed ribcage: 4 bone arcs over the sack
    for (let i = 0; i < 4; i++) {
      const ry = y - 0.88 * s + i * 0.10 * s;
      fillPoly(ctx, quad(x - f * 0.13 * s, ry, x + f * 0.13 * s, ry - 0.02 * s, 0.02 * s), B_LIT);
    }

    // elongated bone skull
    const hx = x + f * 0.10 * s, hy = y - 1.08 * s;
    fillPoly(ctx, [
      [hx - f * 0.10 * s, hy],
      [hx - f * 0.04 * s, hy - 0.08 * s],
      [hx + f * 0.10 * s, hy - 0.04 * s],
      [hx + f * 0.10 * s, hy + 0.04 * s],
      [hx - f * 0.02 * s, hy + 0.06 * s],
    ], B_LIT);
    circle(ctx, hx - f * 0.02 * s, hy, 0.02 * s, EYE_SOCK);
    circle(ctx, hx - f * 0.02 * s, hy, 0.01 * s, EYE);

    // scythe arms: crescent bone polygons from the shoulders
    if (pose !== "dead") {
      const angFront = mix(0.8, -0.6, lunge);
      const shFx = x + f * 0.10 * s, shFy = y - 0.86 * s;
      const fex = shFx + f * Math.cos(angFront) * 0.34 * s, fey = shFy + Math.sin(angFront) * 0.34 * s;
      fillPoly(ctx, quad(shFx, shFy, fex, fey, 0.04 * s), B_LIT);
      fillPoly(ctx, [
        [fex, fey],
        [fex + f * 0.16 * s, fey - 0.08 * s],
        [fex + f * 0.06 * s, fey + 0.10 * s],
      ], B_LIT);

      const shBx = x - f * 0.10 * s, shBy = y - 0.80 * s;
      const angBack = -0.6;
      const bex = shBx + f * Math.cos(angBack) * 0.26 * s, bey = shBy + Math.sin(angBack) * 0.26 * s;
      fillPoly(ctx, quad(shBx, shBy, bex, bey, 0.035 * s), B_SHADE);
      fillPoly(ctx, [
        [bex, bey],
        [bex + f * 0.12 * s, bey - 0.06 * s],
        [bex + f * 0.04 * s, bey + 0.08 * s],
      ], B_SHADE);
    }
  }

  return { drawDevil, drawAbom, HAND };
})();
