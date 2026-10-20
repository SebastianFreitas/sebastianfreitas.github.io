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
    /* a named god has its own painter (genesis-gods.js); the robed
       figure below is the fallback */
    const own = o.kind && F.GOD_PAINT && F.GOD_PAINT[o.kind];
    if (own) { own(ctx, x, y, h, style, o); return; }
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
    const a = o.a ?? 1, f = o.face || 1, tilt = (o.tilt || 0) + (style.look === "D" && o.pose !== "cast" ? 0.1 : 0);
    const walk = o.walk || 0, pose = o.pose;
    const bob = 0.02 * h * Math.abs(Math.sin(walk * 0.06));
    const hs = 0.03 * h * Math.sin(walk * 0.12);
    const yy = y - bob;
    const sx = style.gnarl ? 0.92 : 1, sy = style.gnarl ? 1.08 : 1; /* Mordrial: slimmer and taller */
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
      /* Mordrial turned toward the camera: M maps a figure-space point (lx across, ly up) to the canvas */
      const M = (lx, ly) => [x + f * lx * sx * h, yy - ly * sy * h];
      const lookB = style.look === "B", lookC = style.look === "C", lookD = style.look === "D";
      let drawD2 = null;
      let ring, strip;
      if (style.gnarl) {
        const hemY = 0.012, mp = (a) => a.map((p) => M(p[0], p[1]));
        if (lookD) {
          /* look D is drawn in its own block below: no shared cloak or hood shape */
          cloakPts.length = 0; hoodPts.length = 0;
        } else if (lookC) {
          /* look C, traced from the owner's reference: far shoulder high, near side sloping to a wide hem, a hood bag whose front is an S-curve */
          cloakPts.length = 0; hoodPts.length = 0;
          cloakPts.push(...mp([[-0.25, 0.04], [-0.25, 0.20], [-0.25, 0.45], [-0.23, 0.62], [-0.19, 0.74], [-0.12, 0.76],
            [0.0, 0.70], [0.10, 0.66], [0.19, 0.63], [0.22, 0.55], [0.24, 0.42], [0.25, 0.30], [0.26, 0.18], [0.28, 0],
            [0.12, hemY], [0, 0.01], [-0.12, 0.03]]));
          hoodPts.push(...mp([[-0.16, 0.74], [-0.13, 0.82], [-0.105, 0.91], [-0.05, 0.975], [0.07, 0.995], [0.14, 0.99],
            [0.20, 0.955], [0.24, 0.905], [0.235, 0.87], [0.215, 0.835], [0.19, 0.795], [0.17, 0.755], [0.135, 0.71],
            [0.12, 0.665], [0.05, 0.655], [-0.05, 0.665], [-0.12, 0.68]]));
        } else if (!lookB) {
          /* look A: a rounded hood hanging forward, its opening angled to the staff side */
          cloakPts.length = 0; hoodPts.length = 0;
          cloakPts.push(...mp([[-0.19, 0], [-0.185, 0.40], [-0.175, 0.66], [-0.10, 0.73], [0, 0.74], [0.11, 0.73], [0.17, 0.66], [0.18, 0.40], [0.19, 0],
            [0.10, hemY], [0, 0], [-0.10, hemY]]));
          hoodPts.push(...mp([[-0.175, 0.66], [-0.24, 0.78], [-0.21, 0.90], [-0.10, 0.97], [0.03, 0.98], [0.12, 0.94], [0.17, 0.86], [0.175, 0.76], [0.17, 0.66]]));
          ring = { cx: 0.06, cy: 0.81, rx: 0.10, ry: 0.135 };
          strip = { top: 0.69, c0: 0.07, c1: 0.04, hw0: 0.04, hw1: 0.065 };
        } else {
          /* look B: Ulden's hood, a tall rounded dome pinched at the front of the neck, flaring into the shoulder, bulging out at the far back */
          cloakPts.length = 0; hoodPts.length = 0;
          cloakPts.push(...mp([[-0.25, 0], [-0.24, 0.30], [-0.22, 0.56], [0, 0.66], [0.24, 0.56], [0.235, 0.30], [0.25, 0],
            [0.12, hemY], [0, 0], [-0.12, hemY]]));
          hoodPts.push(...mp([[-0.22, 0.56], [-0.27, 0.76], [-0.22, 0.92], [-0.11, 1.0], [0.03, 1.0], [0.12, 0.95], [0.17, 0.84], [0.17, 0.70], [0.2, 0.58]]));
          ring = { cx: 0.06, cy: 0.82, rx: 0.09, ry: 0.14 };
          strip = { top: 0.675, c0: 0.1, c1: 0.09, hw0: 0.035, hw1: 0.06 };
        }
      }
      const traceCloak = () => { ctx.beginPath(); tracePoly(ctx, cloakPts); tracePoly(ctx, hoodPts); };
      if (o.split) {
        ctx.save();
        traceCloak(); ctx.clip();
        ctx.fillStyle = "#c8202a"; ctx.fillRect(-1e5, -1e5, x + 1e5, 2e5);
        ctx.fillStyle = "#b8b0a6"; ctx.fillRect(x, -1e5, 2e5, 2e5);
        ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.fillRect(x - 0.07 * h, -1e5, 2e5, 2e5);
        ctx.restore();
      } else if (!lookD) {
        litShade(ctx, traceCloak, x - 0.07 * h, style.lit, style.shade);
      }

      const cast = pose === "cast";
      if (lookD) {
        /* look D, from the owner's sketch: a round-hemmed robe shaded by form, a tall forward hood with a deep void, a banded left sleeve holding a sword */
        const det = h >= 120, deep = "#4a080e", WH = "#e8e2d8", FOLD = "rgba(40,4,8,0.5)";
        const BODY = [[0.13,0.0,1],[0.27,0.02],[0.35,0.09],[0.33,0.17],[0.24,0.26],[0.15,0.34],[0.14,0.42],[0.135,0.52],[0.13,0.62],
          [0.05,0.68],[-0.07,0.70],[-0.15,0.66],[-0.17,0.56],[-0.165,0.43],[-0.165,0.33],[-0.26,0.25],[-0.34,0.15],
          [-0.37,0.07],[-0.30,0.01],[-0.19,0.0,1],[-0.12,0.016],[-0.06,0.0,1],[0.01,0.018],[0.07,0.0,1]];
        const HOOD = [[-0.08,0.63],[-0.135,0.72],[-0.14,0.83],[-0.09,0.925],[-0.02,0.985],[0.07,1.0],[0.15,0.975],[0.21,0.925],
          [0.24,0.88],[0.228,0.85],[0.222,0.78],[0.215,0.70],[0.20,0.635],[0.15,0.585],[0.06,0.58],[-0.04,0.59]];
        const SHADE = f > 0
          ? [[-0.02,-0.05,1],[-0.05,0.10],[-0.06,0.24],[-0.03,0.38],[-0.01,0.52],[-0.03,0.62],[-0.05,0.74],[-0.04,0.86],[0.02,0.95],[0.10,1.02],[0.16,1.1,1],[0.6,1.1,1],[0.6,-0.05,1]]
          : [[0.07,-0.05,1],[0.10,0.10],[0.09,0.24],[0.06,0.38],[0.065,0.52],[0.05,0.60],[0.0,0.70],[-0.03,0.80],[-0.02,0.90],[0.03,0.98],[0.06,1.1,1],[-0.6,1.1,1],[-0.6,-0.05,1]];
        const FOLDS = [
          [[0.09,0.50],[0.11,0.50],[0.13,0.30],[0.17,0.06],[0.135,0.035],[0.10,0.25,1]],
          [[-0.01,0.42],[0.01,0.42],[0.03,0.22],[0.04,0.03],[0.0,0.03],[-0.005,0.22,1]],
          [[-0.12,0.42],[-0.10,0.42],[-0.14,0.22],[-0.16,0.03],[-0.20,0.05],[-0.155,0.22,1]],
          [[-0.245,0.16],[-0.10,0.205],[0.06,0.20],[0.205,0.16],[0.06,0.175],[-0.10,0.18,1]]];
        const HEM_UNDER = [[-0.37,0.10],[-0.28,0.035],[-0.10,0.05],[0.04,0.05],[0.2,0.05],[0.32,0.07],[0.36,0.11],[0.37,-0.05,1],[-0.40,-0.05,1]];
        const HEM_HI = [[-0.33,0.17],[-0.28,0.25],[-0.20,0.31],[-0.25,0.24],[-0.31,0.165,1]];
        const CHIN_SHADOW = [[0.135,0.62],[0.03,0.58],[-0.08,0.59],[-0.06,0.55],[0.04,0.535],[0.14,0.555]];
        const CROWN_HI = [[-0.14,0.80],[-0.10,0.90],[-0.02,0.97],[0.07,0.99],[0.02,0.965],[-0.07,0.905],[-0.11,0.80,1]];
        const HOOD_CREASE = [[0.03,0.97],[0.05,0.965],[0.0,0.84],[0.02,0.68],[-0.005,0.68],[-0.025,0.84,1]];
        const LINING = [[0.225,0.86],[0.17,0.86],[0.13,0.82],[0.115,0.75],[0.125,0.68],[0.16,0.645],[0.20,0.64],[0.21,0.72],[0.218,0.80]];
        const VOID = [[0.212,0.835],[0.175,0.835],[0.145,0.80],[0.135,0.745],[0.14,0.69],[0.15,0.63],[0.17,0.595],[0.20,0.62],[0.205,0.74]];
        const TRIM = [[0.225,0.855],[0.17,0.85],[0.125,0.80],[0.115,0.74],[0.122,0.70]];
        const poseShift = (P) => P.map((p) => { const w = Math.max(0, Math.min(1, (p[0] + 0.10) / 0.19)); return [p[0] + 0.035 * w, p[1] + 0.065 * w].concat(p[2] ? [1] : []); });
        const sh = (P) => (cast ? poseShift(P) : P);
        const SLEEVE = sh([[-0.09,0.675],[-0.02,0.665],[0.04,0.615],[0.085,0.545,1],[0.05,0.45,1],[-0.02,0.43],[-0.10,0.46],[-0.155,0.53],[-0.165,0.61]]);
        const SLEEVE_CAST = sh([[0.05,0.45],[-0.02,0.42],[-0.10,0.45],[-0.16,0.52],[-0.11,0.43],[-0.02,0.38],[0.07,0.41,1]]);
        const SLEEVE_UNDER = sh([[-0.165,0.61],[-0.155,0.53],[-0.10,0.46],[-0.02,0.43],[0.05,0.45,1],[0.06,0.48],[-0.02,0.465],[-0.10,0.50],[-0.145,0.57]]);
        const STRIPES = sh0([[[-0.17,0.55],[-0.12,0.585],[-0.075,0.645],[-0.06,0.70]],
          [[-0.12,0.46],[-0.06,0.505],[-0.02,0.575],[-0.005,0.66]],
          [[-0.05,0.41],[0.0,0.46],[0.035,0.525],[0.05,0.60]]]);
        function sh0(A) { return A.map(sh); }
        const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const mpc = (p) => { const q = M(p[0], p[1]); if (p[2]) q.push(1); return q; };
        const smoothPath = (P, closed) => {
          const n = P.length; ctx.beginPath();
          if (!closed) ctx.moveTo(P[0][0], P[0][1]);
          for (let i = closed ? 0 : 1; i < (closed ? n : n - 1); i++) {
            const p = P[i];
            let a = mid(P[(i + n - 1) % n], p), b = mid(p, P[(i + 1) % n]);
            if (!closed && i === 1) a = P[0];
            if (!closed && i === n - 2) b = P[n - 1];
            if (p[2]) { (closed && i === 0) ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); continue; }
            (closed && i === 0) ? ctx.moveTo(a[0], a[1]) : ctx.lineTo(a[0], a[1]);
            ctx.quadraticCurveTo(p[0], p[1], b[0], b[1]);
          }
          if (closed) ctx.closePath(); else ctx.lineTo(P[n - 1][0], P[n - 1][1]);
        };
        const fillS = (pts, col) => { smoothPath(pts.map(mpc), true); ctx.fillStyle = col; ctx.fill(); };
        const strokeS = (pts, w, col) => { smoothPath(pts.map(mpc), false); ctx.lineWidth = w * h; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = col; ctx.stroke(); };
        const clipS = (pts) => { smoothPath(pts.map(mpc), true); ctx.clip(); };
        ctx.save();
        fillS(BODY, style.lit);
        ctx.save(); clipS(BODY);
        fillS(SHADE, style.shade);
        FOLDS.forEach((d, i) => { if (det || i < 2) fillS(d, FOLD); });
        fillS(HEM_UNDER, deep);
        if (det && f > 0) fillS(HEM_HI, "#de3038");
        fillS(CHIN_SHADOW, deep);
        fillS(SLEEVE_CAST, deep);
        ctx.restore();
        fillS(SLEEVE, f > 0 ? style.lit : style.shade);
        ctx.save(); clipS(SLEEVE);
        fillS(SLEEVE_UNDER, f > 0 ? style.shade : deep);
        STRIPES.forEach((d, i) => { if (det || i < 2) strokeS(d, det ? 0.03 : 0.034, f > 0 ? WH : "#bdb4a8"); });
        ctx.restore();
        fillS(HOOD, style.lit);
        ctx.save(); clipS(HOOD);
        fillS(SHADE, style.shade);
        if (det && f > 0) fillS(CROWN_HI, "#de3038");
        if (det) fillS(HOOD_CREASE, FOLD);
        ctx.restore();
        if (det) fillS(LINING, deep);
        fillS(VOID, "#000000");
        strokeS(TRIM, det ? 0.022 : 0.028, WH);
        ctx.restore();
        drawD2 = () => {
          const hx = cast ? 0.177 : 0.225;
          ctx.save();
          fillS([[0.12, 0.40], [hx - 0.02, 0.385, 1], [hx - 0.025, 0.315, 1], [0.12, 0.32]], f > 0 ? style.shade : deep);
          ctx.restore();
          if (det) fillPoly(ctx, [[hx - 0.03, 0.38], [hx + 0.03, 0.37], [hx + 0.035, 0.32], [hx - 0.02, 0.31]].map((p) => M(p[0], p[1])), "#4a3a30");
          /* the sword is built in canvas space so the squash cannot bend it */
          const hand = cast ? [0.14, 0.565] : [0.105, 0.50], [Hx, Hy] = M(hand[0], hand[1]);
          let angDeg = cast ? 30 : 58;
          if (cast && o.reach) angDeg = Math.max(10, Math.min(45, Math.atan2(Hy - o.reach.y, f * (o.reach.x - Hx)) * 180 / Math.PI));
          const ang = angDeg * Math.PI / 180, ux = f * Math.cos(ang), uy = -Math.sin(ang);
          let nx = -uy, ny = ux; if (ny > 0) { nx = -nx; ny = -ny; }
          const P = (u, n) => [Hx + (ux * u + nx * n) * h, Hy + (uy * u + ny * n) * h];
          const g0 = 0.042, L = 0.40, w = 0.013, G = 0.0475;
          fillPoly(ctx, [P(-0.05, 0.008), P(0.035, 0.008), P(0.035, -0.008), P(-0.05, -0.008)], "#3a281c");
          if (det) {
            const pm = P(-0.055, 0); circle(ctx, pm[0], pm[1], 0.012 * h, "#2b2622");
            fillPoly(ctx, [P(g0, 0), P(g0, w), P(g0 + 0.85 * L, 0.75 * w), P(g0 + L, 0)], "#d8dce2");
            fillPoly(ctx, [P(g0, 0), P(g0, -w), P(g0 + 0.85 * L, -0.75 * w), P(g0 + L, 0)], "#6a7078");
          } else fillPoly(ctx, [P(g0, w), P(g0 + 0.85 * L, 0.75 * w), P(g0 + L, 0), P(g0 + 0.85 * L, -0.75 * w), P(g0, -w)], "#c9ccd2");
          fillPoly(ctx, [P(0.030, -G), P(0.048, -0.8 * G), P(0.048, 0.8 * G), P(0.030, G), P(0.040, 0)], "#2b2622");
          fillPoly(ctx, [P(-0.03, -0.02), P(0.03, -0.022), P(0.036, 0.016), P(0, 0.026), P(-0.032, 0.018)], "#4a3a30");
        };
      } else if (lookC) {
        /* look C: folds and collar light, the black wedge void, then the white bands (near rim over the void's top edge, far rim down the silhouette) */
        const WH = "#e8e2d8", MK = "#7a1018", P = (a) => a.map((p) => M(p[0], p[1]));
        const band = (pts, w, ticks) => {
          const c = P(pts), L = [], R = [], N = [];
          c.forEach((p, i) => {
            const a0 = c[Math.max(i - 1, 0)], a1 = c[Math.min(i + 1, c.length - 1)];
            const dx = a1[0] - a0[0], dy = a1[1] - a0[1], dl = Math.hypot(dx, dy) || 1;
            N.push([-dy / dl, dx / dl]);
            L.push([p[0] + N[i][0] * w * h / 2, p[1] + N[i][1] * w * h / 2]);
            R.push([p[0] - N[i][0] * w * h / 2, p[1] - N[i][1] * w * h / 2]);
          });
          fillPoly(ctx, L.concat(R.reverse()), WH);
          if (!ticks || h < 120) return;
          let d = 0.03 * h, acc = 0;
          for (let i = 0; i < c.length - 1; i++) {
            const sl = Math.hypot(c[i + 1][0] - c[i][0], c[i + 1][1] - c[i][1]);
            while (d - acc < sl) {
              const t = (d - acc) / sl, px = mix(c[i][0], c[i + 1][0], t), py = mix(c[i][1], c[i + 1][1], t);
              const nx = mix(N[i][0], N[i + 1][0], t), ny = mix(N[i][1], N[i + 1][1], t), k = 0.3 * w * h;
              fillPoly(ctx, quad(px - nx * k, py - ny * k, px + nx * k, py + ny * k, 0.008 * h), MK);
              d += 0.05 * h;
            }
            acc += sl;
          }
        };
        ctx.save(); traceCloak(); ctx.clip();
        const folds = [[[0.05, 0.70], [0.11, 0.69], [0.17, 0.30], [0.11, 0.28]]];
        if (h >= 120) folds.push([[-0.02, 0.975], [0.0, 0.985], [-0.09, 0.84], [-0.115, 0.83]], [[-0.19, 0.64], [-0.17, 0.64], [-0.25, 0.10], [-0.27, 0.10]],
          [[-0.10, 0.62], [-0.08, 0.62], [-0.13, 0.05], [-0.15, 0.05]], [[0.22, 0.52], [0.24, 0.52], [0.30, 0.18], [0.28, 0.18]]);
        folds.forEach((d) => fillPoly(ctx, P(d), "rgba(40,4,8,0.5)"));
        ctx.save();
        ctx.beginPath(); ctx.rect(-1e5, -1e5, x - 0.07 * h + 1e5, 2e5); ctx.clip();
        fillPoly(ctx, P([[0.13, 0.705], [0.06, 0.69], [-0.02, 0.70], [-0.06, 0.725], [-0.06, 0.705], [-0.02, 0.68], [0.06, 0.67]]), "#de3038");
        ctx.restore();
        fillPoly(ctx, P([[0.215, 0.88], [0.20, 0.82], [0.18, 0.76], [0.155, 0.72], [0.12, 0.705], [0.095, 0.73],
          [0.10, 0.79], [0.13, 0.84]]), "#000000");
        band([[0.235, 0.89], [0.15, 0.86], [0.09, 0.80]], 0.012, true);
        band([[0.09, 0.985], [0.17, 0.95], [0.225, 0.89], [0.21, 0.83], [0.185, 0.78], [0.16, 0.72]], 0.012, true);
        band([[-0.16, 0.76], [0.12, 0.34]], 0.014, true);
        band(cast ? [[0.12, 0.44], [0.21, 0.40]] : [[0.15, 0.42], [0.24, 0.38]], 0.02, true);
        ctx.restore();
      } else if (style.gnarl) {
        /* flat white lining (front opening, trims with dark-red marks), diagonal folds, then the hood's deep void in its white rim; no eyes */
        const WH = "#e8e2d8", MK = "#7a1018", sc = Math.min(sx, sy);
        const mark = (cx, cy, dx, dy) => fillPoly(ctx, quad(cx - dx, cy - dy, cx + dx, cy + dy, 0.009 * h), MK);
        /* trim pattern: alternating chevron and dash; (ax, ay) is the band's direction on the canvas */
        const pat = (cx, cy, ax, ay, i) => {
          const s = 0.0135 * h, bx = -ay, by = ax;
          if (i % 2) { mark(cx, cy, bx * s, by * s); return; }
          const ap = [cx + ax * s * 0.8, cy + ay * s * 0.8];
          [-1, 1].forEach((k) => fillPoly(ctx, quad(cx - ax * s * 0.5 + bx * s * k, cy - ay * s * 0.5 + by * s * k, ap[0], ap[1], 0.009 * h), MK));
        };
        ctx.save(); traceCloak(); ctx.clip();
        if (!lookB) {
          [[-0.115, 0.62, -0.15, 0.08], [-0.145, 0.45, -0.18, 0.10], [0.11, 0.60, 0.16, 0.10], [0.14, 0.40, 0.17, 0.15]].forEach((d) => {
            fillPoly(ctx, [M(d[0], d[1]), M(d[0] + 0.016, d[1]), M(d[2] + 0.016, d[3]), M(d[2], d[3])], "rgba(70,6,12,0.55)");
          });
        }
        /* front opening, off-centre toward the staff side: lining wider on the far side, thin on the near, trim bands outside */
        const cAt = (ly) => mix(strip.c1, strip.c0, ly / strip.top), wAt = (ly) => mix(strip.hw1, strip.hw0, ly / strip.top);
        const edge = (side, off) => [strip.top, 0.0].map((ly) => M(cAt(ly) + side * (wAt(ly) * (side < 0 ? 1.4 : 0.6) + off), ly));
        const eL = edge(-1, 0), eR = edge(1, 0), bL = edge(-1, 0.03), bR = edge(1, 0.03);
        fillPoly(ctx, [eL[0], eR[0], eR[1], eL[1]], WH);
        fillPoly(ctx, [bL[0], eL[0], eL[1], bL[1]], WH);
        fillPoly(ctx, [eR[0], bR[0], bR[1], eR[1]], WH);
        for (let ly = 0.07, i = 0; ly < strip.top - 0.03; ly += 0.06, i++) {
          [-1, 1].forEach((side) => {
            const p = M(cAt(ly) + side * (wAt(ly) * (side < 0 ? 1.4 : 0.6) + 0.015), ly);
            pat(p[0], p[1], 0, -1, i);
          });
        }
        /* hem band */
        fillPoly(ctx, [M(-0.4, 0), M(0.4, 0), M(0.4, 0.05), M(-0.4, 0.05)], WH);
        for (let lx = -0.22, i = 0; lx < 0.23; lx += 0.055, i++) { const p = M(lx, 0.025); pat(p[0], p[1], 1, 0, i); }
        /* hood: far side a broad red panel with a fold, then the opening turned to the staff side under an overhanging brim */
        fillPoly(ctx, [M(-0.32, 1.1), M(-0.09, 1.1), M(-0.11, 0.84), M(-0.16, 0.68), M(-0.32, 0.68)], "rgba(70,6,12,0.3)");
        [[-0.08, 0.96, -0.12, 0.82], [-0.12, 0.82, -0.165, 0.68]].forEach((d) => {
          const p = M(d[0], d[1]), q = M(d[2], d[3]); fillPoly(ctx, quad(p[0], p[1], q[0], q[1], 0.011 * h), "rgba(70,6,12,0.75)");
        });
        const rc = M(ring.cx, ring.cy), rX = ring.rx * sx * h, rY = ring.ry * sy * h;
        ctx.save();
        ctx.beginPath(); ctx.ellipse(rc[0], rc[1], rX, rY, 0, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = WH; ctx.fillRect(rc[0] - rX, rc[1] - rY, 2 * rX, 2 * rY);
        /* the void, shifted so only a crescent of lining shows on the far side */
        const dv = 0.0135 * sx * h, sv = 0.0215 * sx * h;
        ctx.beginPath(); ctx.ellipse(rc[0] + f * dv, rc[1], rX - sv, rY, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#12040a"; ctx.fill(); ctx.clip();
        ctx.fillStyle = "#080204"; ctx.fillRect(rc[0] - f * rX, rc[1] - rY, f * 0.7 * rX, 2 * rY);
        fillPoly(ctx, [[rc[0] - f * rX, rc[1] - rY], [rc[0] + f * rX, rc[1] - rY], [rc[0] + f * 0.3 * rX, rc[1] - 0.2 * rY], [rc[0] - f * 0.4 * rX, rc[1] + 0.25 * rY]], "#2a0508");
        ctx.restore();
        /* trim band along the brim edge only */
        ctx.beginPath(); ctx.ellipse(rc[0], rc[1], rX, rY, 0, Math.PI * 1.08, Math.PI * 1.92);
        ctx.strokeStyle = WH; ctx.lineWidth = 0.03 * h; ctx.stroke();
        for (let k = 0; k < 8; k++) {
          const an = Math.PI * (1.14 + k * 0.1), ca = Math.cos(an), sa = Math.sin(an);
          const tx = -rX * sa, ty = rY * ca, tl = Math.hypot(tx, ty) || 1;
          pat(rc[0] + ca * rX, rc[1] + sa * rY, tx / tl, ty / tl, k);
        }
        ctx.restore();
      } else {
      const hdx = x + f * 0.045 * h, hdy = yy - 0.83 * h;
      flatGlow(ctx, hdx, hdy, 0.10 * h, style.glow, 0.35);
      ctx.beginPath(); ctx.ellipse(hdx, hdy, 0.065 * h, 0.085 * h, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(8,10,12,1)"; ctx.fill();
      circle(ctx, x + f * 0.03 * h - 0.02 * h, yy - 0.84 * h, 0.012 * h, style.core);
      circle(ctx, x + f * 0.03 * h + 0.02 * h, yy - 0.84 * h, 0.012 * h, style.core);
      }

      let baseX, baseY, tipX, tipY;
      if (pose === "cast") {
        baseX = x + f * 0.16 * sx * h; baseY = yy - 0.30 * h;
        tipX = x + f * 0.42 * sx * h; tipY = yy - 1.05 * sy * h;
        if (o.reach) {
          const len = Math.hypot(tipX - baseX, tipY - baseY);
          const dx = o.reach.x - baseX, dy = o.reach.y - baseY, dl = Math.hypot(dx, dy) || 1;
          tipX = baseX + dx / dl * len; tipY = baseY + dy / dl * len;
        }
      } else {
        baseX = x + f * 0.20 * sx * h; baseY = yy;
        const rawX = x + f * 0.27 * sx * h, rawY = yy - 0.98 * sy * h;
        const sway = (3 * Math.PI / 180) * Math.sin(walk * 0.12);
        const dx = rawX - baseX, dy = rawY - baseY;
        tipX = baseX + dx * Math.cos(sway) - dy * Math.sin(sway);
        tipY = baseY + dx * Math.sin(sway) + dy * Math.cos(sway);
      }
      if (style.gnarl) {
        /* gnarled wood: wobbling edges of uneven width, a few knots */
        const sl = Math.hypot(tipX - baseX, tipY - baseY) || 1;
        const ux = (tipX - baseX) / sl, uy = (tipY - baseY) / sl, nx = -uy, ny = ux;
        const L = [], R = [];
        for (let i = 0; i <= 8; i++) {
          const t = i / 8, w = (0.013 + 0.007 * Math.sin(i * 2.1 + 1) + 0.011 * (i === 2 || i === 4 || i === 6)) * h;
          const c = 0.016 * h * Math.sin(i * 1.7) * (1 - 0.5 * t);
          const px = baseX + (tipX - baseX) * t + nx * c, py = baseY + (tipY - baseY) * t + ny * c;
          L.push([px + nx * w, py + ny * w]); R.push([px - nx * w, py - ny * w]);
        }
        fillPoly(ctx, L.concat(R.reverse()), "#3a281c");
        [1.5, 3.2, 4.6, 5.5, 7].forEach((i) => {
          const t = i / 8, c = 0.016 * h * Math.sin(i * 1.7) * (1 - 0.5 * t);
          const px = baseX + (tipX - baseX) * t + nx * c, py = baseY + (tipY - baseY) * t + ny * c;
          const q = 0.012 * h, r = 0.006 * h;
          fillPoly(ctx, [[px - nx * q - ux * r, py - ny * q - uy * r], [px + nx * 0.3 * q + ux * r, py + ny * 0.3 * q + uy * r],
            [px + nx * 0.3 * q + ux * r * 1.8, py + ny * 0.3 * q + uy * r * 1.8], [px - nx * q, py - ny * q]], "#24170f");
        });
      } else {
      ctx.save();
      ctx.strokeStyle = "#2a2320"; ctx.lineWidth = 0.03 * h; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(baseX, baseY); ctx.lineTo(tipX, tipY); ctx.stroke();
      ctx.restore();
      }

      if (lookC && h >= 120) {
        const hx = cast ? 0.177 : 0.225;
        fillPoly(ctx, [[hx - 0.03, 0.38], [hx + 0.03, 0.37], [hx + 0.035, 0.32], [hx - 0.02, 0.31]].map((p) => M(p[0], p[1])), "#4a3a30");
      }
      if (drawD2) drawD2();
      const glowC = lookD ? "255,138,42" : style.glow;
      gx = tipX; gy = tipY;
      if (pose !== "dead") {
        flatGlow(ctx, gx, gy, pose === "cast" ? 0.22 * h : 0.16 * h, glowC, pose === "cast" ? 1 : 0.8);
      }
      if (style.gnarl) {
        /* wooden talons curling round the gem, over the glow */
        const sl = Math.hypot(tipX - baseX, tipY - baseY) || 1;
        const ux = (tipX - baseX) / sl, uy = (tipY - baseY) / sl, nx = -uy, ny = ux;
        [[-1, 1], [-0.45, 0.8], [0.45, 0.8], [1, 1]].forEach((d) => {
          const s = d[0], k = d[1];
          const P = (lat, fwd) => [tipX + nx * lat * h + ux * fwd * h, tipY + ny * lat * h + uy * fwd * h];
          const bx = -0.11, w = 0.014;
          fillPoly(ctx, [
            P(s * w, bx), P(s * 0.075 * k, -0.04), P(s * 0.06 * k, 0.04), P(s * 0.025, 0.115 * k),
            P(s * 0.045 * k, 0.03), P(s * 0.05 * k, -0.035), P(-s * w, bx),
          ], "#3a281c");
        });
      }
      if (lookD) {
        circle(ctx, gx, gy, 0.045 * h, "#ff8a2a");
        circle(ctx, gx - 0.012 * h, gy - 0.012 * h, 0.016 * h, "#ffe2be");
        ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = Math.max(1, 0.008 * h); ctx.lineCap = "round";
        [[0.075, 3.6, 4.9], [0.1, 5.3, 6.1]].forEach((r) => { ctx.beginPath(); ctx.arc(gx, gy, r[0] * h, r[1], r[2]); ctx.stroke(); });
        ctx.restore();
      } else circle(ctx, gx, gy, 0.045 * h, style.core);
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
