/* genesis-titans.js — the two titans (Rex, Obrokxus) and the Hound, added
   to GenFig. `y` is the foot line, `h` the height in px; light from the left. */
window.GenFig = window.GenFig || {};
(function (F) {
  const G = window.Gen;
  const { clamp, mix } = Util;
  const { flatGlow, mixHex } = GenPaint;
  const { litShade, circle } = Paint;
  const TAU = Math.PI * 2;

  // ---- private copies of the genesis-figures.js kit, so this file never
  // depends on load order ----
  function tracePoly(ctx, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }
  function fillPoly(ctx, pts, fill) { tracePoly(ctx, pts); ctx.fillStyle = fill; ctx.fill(); }
  function shadedPoly(ctx, pts, xSplit, lit, shade) { litShade(ctx, () => tracePoly(ctx, pts), xSplit, lit, shade); }
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
  function angDist(a, b) { const d = Math.abs(a - b) % TAU; return d > Math.PI ? TAU - d : d; }

  /* ---- Rex the Surface ------------------------------------------- */
  const REX = { lit: "#f58a34", shade: "#b4461e", glow: "245,138,52", core: "#ffe2be" };

  function drawRex(ctx, x, y, h, f, pose, o) {
    const cool = o.cool || 0;
    const lit = mixHex(REX.lit, "#39485a", cool);
    const shade = mixHex(REX.shade, "#26313d", cool);
    const core = mixHex(REX.core, "#7c8a98", cool);
    const glowA = 1 - cool;
    const side = px => (px < x ? lit : shade);

    const body = [
      [x - 0.28 * h, y], [x - 0.24 * h, y - 0.30 * h], [x - 0.26 * h, y - 0.62 * h],
      [x - 0.10 * h, y - 0.72 * h], [x + 0.10 * h, y - 0.72 * h], [x + 0.26 * h, y - 0.62 * h],
      [x + 0.24 * h, y - 0.30 * h], [x + 0.28 * h, y], [x, y - 0.03 * h],
    ];
    shadedPoly(ctx, body, x - 0.08 * h, lit, shade);

    if (pose === "lunge") {
      const reach = o.reach || { x, y };
      const reachAmt = o.reachAmt ?? 1;
      const fS = [x + f * 0.26 * h, y - 0.62 * h];
      const dx = reach.x - fS[0], dy = reach.y - fS[1], len = Math.hypot(dx, dy) || 1;
      const hand = [fS[0] + dx / len * 0.46 * h * reachAmt, fS[1] + dy / len * 0.46 * h * reachAmt];
      fillPoly(ctx, quad(fS[0], fS[1], hand[0], hand[1], 0.11 * h), side(fS[0]));
      flatGlow(ctx, hand[0], hand[1], 0.09 * h, REX.glow, 0.9 * glowA);
      circle(ctx, hand[0], hand[1], 0.03 * h, core);
      const oS = [x - f * 0.26 * h, y - 0.62 * h], oH = [x - f * 0.34 * h, y - 0.52 * h];
      fillPoly(ctx, quad(oS[0], oS[1], oH[0], oH[1], 0.11 * h), side(oS[0]));
    } else if (pose === "grapple") {
      const reach = o.reach || { x, y };
      const lS = [x - 0.26 * h, y - 0.62 * h], rS = [x + 0.26 * h, y - 0.62 * h];
      const eU = [x + f * 0.30 * h, y - 0.70 * h], eL = [x + f * 0.30 * h, y - 0.30 * h];
      const hT = [reach.x, reach.y - 0.06 * h], hB = [reach.x, reach.y + 0.06 * h];
      const cA = side(lS[0]), cB = side(rS[0]);
      fillPoly(ctx, quad(lS[0], lS[1], eU[0], eU[1], 0.10 * h), cA);
      fillPoly(ctx, quad(eU[0], eU[1], hT[0], hT[1], 0.10 * h), cA);
      fillPoly(ctx, quad(rS[0], rS[1], eL[0], eL[1], 0.10 * h), cB);
      fillPoly(ctx, quad(eL[0], eL[1], hB[0], hB[1], 0.10 * h), cB);
    } else {
      const lS = [x - 0.26 * h, y - 0.62 * h], lH = [x - 0.36 * h, y - 0.28 * h];
      const rS = [x + 0.26 * h, y - 0.62 * h], rH = [x + 0.36 * h, y - 0.28 * h];
      fillPoly(ctx, quad(lS[0], lS[1], lH[0], lH[1], 0.11 * h), side(lS[0]));
      fillPoly(ctx, quad(rS[0], rS[1], rH[0], rH[1], 0.11 * h), side(rS[0]));
    }

    const hx = x, hy = y - 0.86 * h;
    flatGlow(ctx, hx, hy, 0.55 * h, REX.glow, 0.9 * glowA);
    const headShade = mixHex(core, lit, 0.35);
    litShade(ctx, () => { ctx.beginPath(); ctx.arc(hx, hy, 0.12 * h, 0, TAU); }, x + 0.02 * h, core, headShade);
    for (let k = 0; k < 7; k++) {
      const ang = -Math.PI / 2 - (200 * Math.PI / 180) / 2 + (200 * Math.PI / 180) * (k / 6);
      const len = mix(0.09 * h, 0.16 * h, k / 6) * (0.8 + 0.2 * Math.sin(G.t * 9 + k));
      const cx = hx + Math.cos(ang) * 0.12 * h, cy = hy + Math.sin(ang) * 0.12 * h;
      const tx = hx + Math.cos(ang) * (0.12 * h + len), ty = hy + Math.sin(ang) * (0.12 * h + len);
      const px = -Math.sin(ang) * 0.025 * h, py = Math.cos(ang) * 0.025 * h;
      fillPoly(ctx, [[cx - px, cy - py], [cx + px, cy + py], [tx, ty]], k % 2 === 0 ? core : lit);
    }
  }

  /* ---- Obrokxus, Already Wrong ------------------------------------- */
  const OBR = {
    shade: "rgba(16,3,5,0.97)", lit: "rgba(46,10,14,1)",
    iris: "rgba(150,18,24,0.92)", pupil: "rgba(8,1,2,1)", glow: "120,12,18",
  };

  function drawObrokxus(ctx, x, y, h, f, ph, pose, o) {
    const bx = x, by = y - 0.42 * h;
    const stretch = pose === "flee" ? 1.3 : 1;
    function edgeR(theta) {
      return 0.40 * h * (1 + 0.16 * Math.sin(3 * theta + ph)
        + 0.10 * Math.sin(7 * theta - G.t * 0.8) + 0.06 * Math.sin(11 * theta + G.t * 1.7));
    }
    const body = [];
    for (let i = 0; i < 16; i++) {
      const th = i * Math.PI / 8, r = edgeR(th);
      let px = bx + Math.cos(th) * r * 0.9 * stretch, py = by + Math.sin(th) * r;
      if (angDist(th, Math.PI / 2) <= 40 * Math.PI / 180) py = y;
      body.push([px, py]);
    }
    shadedPoly(ctx, body, bx - 0.12 * h, OBR.lit, OBR.shade);

    for (let k = 0; k < 4; k++) {
      const tcx = bx + (k - 1.5) * 0.16 * h, sway = 0.02 * h * Math.sin(G.t * 2 + k);
      fillPoly(ctx, [[tcx - 0.02 * h, y], [tcx + 0.02 * h, y], [tcx + sway, y + 0.10 * h]], OBR.shade);
    }

    const faceAng = Math.atan2(0, f);
    const OFFS = [-120, -80, -40, 0, 35], LENS = [0.55, 0.70, 0.62, 0.48, 0.40];
    const lenMul = pose === "lunge" ? 1.35 : 1;
    let rotDelta = 0;
    if (pose === "lunge") {
      const reach = o.reach || { x, y };
      rotDelta = Math.atan2(reach.y - by, reach.x - bx) - faceAng;
    }
    for (let c = 0; c < 5; c++) {
      let ang = faceAng + f * (OFFS[c] * Math.PI / 180) + rotDelta;
      if (pose === "flee") ang += 150 * Math.PI / 180;
      if (pose === "climb" && (c === 1 || c === 2)) ang = -Math.PI / 2;
      ang += (6 * Math.PI / 180) * Math.sin(G.t * 5 + c * 1.3);
      const clen = LENS[c] * h * lenMul, r = edgeR(ang);
      const ex = bx + Math.cos(ang) * r * 0.9 * stretch, ey = by + Math.sin(ang) * r;
      const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
      const baseL = [ex + nx * 0.045 * h, ey + ny * 0.045 * h], baseR = [ex - nx * 0.045 * h, ey - ny * 0.045 * h];
      const mid = [ex + dx * 0.55 * clen + nx * 0.05 * h, ey + dy * 0.55 * clen + ny * 0.05 * h];
      const tip = [ex + dx * clen, ey + dy * clen];
      fillPoly(ctx, [baseL, mid, tip, baseR], OBR.shade);
    }

    const ex = bx + f * 0.10 * h, ey = by - 0.08 * h;
    flatGlow(ctx, ex, ey, 0.36 * h, OBR.glow, 0.9);
    circle(ctx, ex, ey, 0.10 * h, OBR.iris);
    const look = o.look || { x: ex + f, y: ey };
    const ldx = look.x - ex, ldy = look.y - ey, llen = Math.hypot(ldx, ldy) || 1;
    circle(ctx, ex + ldx / llen * 0.02 * h, ey + ldy / llen * 0.02 * h, 0.04 * h, OBR.pupil);

    const sx2 = bx - f * 0.16 * h, sy2 = by + 0.12 * h;
    const blink = clamp(1 - 6 * Math.max(0, Math.sin(G.t * 0.7 + ph) - 0.85), 0, 1);
    ctx.save(); ctx.translate(sx2, sy2); ctx.scale(1, blink); ctx.translate(-sx2, -sy2);
    circle(ctx, sx2, sy2, 0.045 * h, OBR.iris);
    circle(ctx, sx2, sy2, 0.018 * h, OBR.pupil);
    ctx.restore();
  }

  F.drawTitan = function drawTitan(ctx, x, y, h, kind, o) {
    o = o || {};
    const a = o.a ?? 1, f = o.face || 1, ph = o.ph || 0, pose = o.pose || "stand";
    if (a < 0.01) return;
    let tilt = o.tilt || 0;
    if (kind === "rex" && pose === "lunge") tilt += 0.32;
    if (kind === "rex" && pose === "grapple") tilt += 0.18;
    ctx.save();
    ctx.globalAlpha = a;
    withTilt(ctx, x, y, tilt * f, () => {
      if (kind === "rex") drawRex(ctx, x, y, h, f, pose, o);
      else drawObrokxus(ctx, x, y, h, f, ph, pose, o);
    });
    ctx.restore();
  };
  /* ---- the Hound ---------------------------------------------------- */
  const HOUND = {
    shade: "rgba(16,2,4,1)", lit: "rgba(52,8,12,1)", spikes: "rgba(120,14,20,1)",
    far: "rgba(8,1,2,1)", eye: "rgba(220,30,36,1)", eyeGlow: "220,30,36",
  };

  F.drawHound = function drawHound(ctx, x, y, h, o) {
    o = o || {};
    const a = o.a ?? 1, f = o.face || 1, tilt = o.tilt || 0;
    if (a < 0.01) return;
    ctx.save();
    ctx.globalAlpha = a;
    withTilt(ctx, x, y, tilt * f, () => {
      const run = o.run ?? G.t * 8;
      const jaw = o.jaw ?? 0.15 + 0.15 * Math.sin(G.t * 3);

      ctx.save();
      ctx.lineWidth = 0.09 * h; ctx.lineCap = "round";
      const fh = [x + f * 0.35 * h, y - 0.55 * h], bh = [x - f * 0.55 * h, y - 0.55 * h];
      const drawLeg = (hip, off, far) => {
        const s = Math.sin(run + off);
        const knee = [hip[0] + f * 0.10 * h * s, hip[1] + 0.28 * h];
        const fy = Math.min(hip[1] + 0.55 * h - 0.08 * h * Math.max(0, s), y);
        const foot = [hip[0] + f * 0.25 * h * s, fy];
        ctx.strokeStyle = far ? HOUND.far : HOUND.lit;
        ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(knee[0], knee[1]); ctx.lineTo(foot[0], foot[1]); ctx.stroke();
      };
      drawLeg(fh, Math.PI, true); drawLeg(bh, 0, true);
      drawLeg(fh, 0, false); drawLeg(bh, Math.PI, false);
      ctx.restore();

      const body = [
        [x + f * 0.55 * h, y - 0.78 * h], [x + f * 0.40 * h, y - 1.02 * h], [x - f * 0.10 * h, y - 1.12 * h],
        [x - f * 0.72 * h, y - 0.92 * h], [x - f * 0.85 * h, y - 0.70 * h], [x - f * 0.55 * h, y - 0.48 * h],
        [x + f * 0.35 * h, y - 0.45 * h],
      ];
      shadedPoly(ctx, body, x - 0.30 * h, HOUND.lit, HOUND.shade);

      const neck = [x + f * 0.40 * h, y - 1.02 * h], arch = [x - f * 0.10 * h, y - 1.12 * h];
      const rump = [x - f * 0.72 * h, y - 0.92 * h];
      for (let i = 0; i < 6; i++) {
        const u = (i + 0.5) / 6;
        const seg = u <= 0.5 ? [neck, arch] : [arch, rump], t = u <= 0.5 ? u / 0.5 : (u - 0.5) / 0.5;
        const spx = mix(seg[0][0], seg[1][0], t), spy = mix(seg[0][1], seg[1][1], t);
        const dx = seg[1][0] - seg[0][0], dy = seg[1][1] - seg[0][1], len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const hAng = -Math.PI / 2 - f * (20 * Math.PI / 180), hLen = i % 2 === 0 ? 0.16 * h : 0.26 * h;
        const tipx = spx + Math.cos(hAng) * hLen, tipy = spy + Math.sin(hAng) * hLen;
        fillPoly(ctx, [[spx - nx * 0.05 * h, spy - ny * 0.05 * h], [spx + nx * 0.05 * h, spy + ny * 0.05 * h], [tipx, tipy]], HOUND.spikes);
      }

      const headPts = [
        [x + f * 0.55 * h, y - 0.78 * h], [x + f * 0.62 * h, y - 0.98 * h],
        [x + f * 1.05 * h, y - 0.66 * h], [x + f * 0.70 * h, y - 0.60 * h],
      ];
      fillPoly(ctx, headPts, HOUND.shade);
      const jx = x + f * 0.62 * h, jy = y - 0.62 * h;
      withTilt(ctx, jx, jy, 0.45 * jaw * f, () => {
        fillPoly(ctx, [[jx, jy], [x + f * 1.0 * h, y - 0.56 * h], [x + f * 0.66 * h, y - 0.50 * h]], HOUND.shade);
      });

      flatGlow(ctx, x + f * 0.74 * h, y - 0.80 * h, 0.22 * h, HOUND.eyeGlow, 0.9);
      circle(ctx, x + f * 0.74 * h, y - 0.80 * h, 0.05 * h, HOUND.eye);
    });
    ctx.restore();
  };
})(window.GenFig);
