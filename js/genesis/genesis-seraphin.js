/* genesis-seraphin.js — the seraphin, winged beasts of light: tall cranes,
   sighthounds and stags with great feathered wings. y = foot line, s = body
   height. The light lives in their wings and their casting hand, not a ring. */
(function () {
  const GH = window.GenHosts; if (!GH) return;
  const G = window.Gen;
  const { mix } = Util;
  const { litShade, circle } = Paint;
  const { flatGlow } = GenPaint;
  const { fillPoly, quad, withTilt } = GenFig;

  const S_BODY_LIT = "#ece6d4", S_BODY_SHADE = "#a59d86";
  const S_WING_LIT = "#f5f0e2", S_WING_SHADE = "#a39b84", S_WING_FAR = "#7c7563";
  const S_GOLD = "#e2b85a", S_GOLD_SHADE = "#9e782c";
  const S_EYE = "#2a2418";

  function trace(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }
  function shaded(ctx, pts, xSplit, lit, shade) {
    litShade(ctx, () => trace(ctx, pts), xSplit, lit, shade);
  }
  // one flat filled volume, hard split by absolute x: litFrac of its width
  // stays lit, the rest (the "back") floods to shade
  function volumeShade(ctx, pts, lit, shade, litFrac) {
    const xs = pts.map((p) => p[0]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    shaded(ctx, pts, minX + (litFrac ?? 0.3) * (maxX - minX), lit, shade);
  }
  // a near volume gets the lit/shade split, a far volume is flat shade
  function massFill(ctx, pts, near, lit, shade) {
    if (near) volumeShade(ctx, pts, lit, shade, 0.4);
    else fillPoly(ctx, pts, shade);
  }
  // a single straight tapered strip, width wa at (ax,ay) to wb at (bx,by)
  function taper(ax, ay, bx, by, wa, wb) {
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    return [
      [ax + nx * wa / 2, ay + ny * wa / 2],
      [bx + nx * wb / 2, by + ny * wb / 2],
      [bx - nx * wb / 2, by - ny * wb / 2],
      [ax - nx * wa / 2, ay - ny * wa / 2],
    ];
  }
  // one continuous tapered, bent strip through pts[] with widths[] at each
  // joint — the whole limb/neck/antler is ONE polygon, no seams
  function bentStrip(pts, widths) {
    const segN = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1];
      const len = Math.hypot(dx, dy) || 1;
      segN.push([-dy / len, dx / len]);
    }
    const left = [], right = [];
    for (let i = 0; i < pts.length; i++) {
      let nx, ny;
      if (i === 0) [nx, ny] = segN[0];
      else if (i === pts.length - 1) [nx, ny] = segN[i - 1];
      else {
        nx = segN[i - 1][0] + segN[i][0]; ny = segN[i - 1][1] + segN[i][1];
        const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      }
      const w = widths[i] / 2;
      left.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
      right.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
    }
    return left.concat(right.reverse());
  }

  // a big feathered wing rooted at (rx, ry): local +x is the extension
  // (0 at root, len at tip), local y is thickness (- up, + down); ang=0
  // points straight back along -f, positive ang raises the wing
  function wing(ctx, rx, ry, len, ang, f, fill, shade) {
    const c = Math.cos(ang), sn = Math.sin(ang);
    function pt(lx, ly) {
      return [rx - f * (lx * c + ly * sn), ry + (-lx * sn + ly * c)];
    }
    const notch = 0.07 * len;
    const local = [
      [0, -0.10 * len],
      [0.45 * len, -0.16 * len],
      [1.0 * len, -0.02 * len],
    ];
    for (let i = 0; i < 6; i++) {
      const t = (i + 1) / 7;
      const lx = mix(1.0 * len, 0.05 * len, t);
      let ly = mix(-0.02 * len, 0.12 * len, t);
      if (i % 2 === 1) ly -= notch;
      local.push([lx, ly]);
    }
    local.push([0.05 * len, 0.12 * len]);
    fillPoly(ctx, local.map((p) => pt(p[0], p[1])), fill);
    const bandTop = 0.008 * len;
    fillPoly(ctx, local.map((p) => pt(p[0], Math.max(p[1], bandTop))), shade);
  }

  // resolve the shared wing ang/len for grounded / flight / dead poses; the
  // far wing sits +0.45 rad above the near wing so both show as a V
  function wingState(pose, fly, ph) {
    if (pose === "dead") return { ang: -0.25, len: 0.55 };
    if (fly) return { ang: 0.25 + 0.85 * Math.sin(G.t * 6 + ph), len: 1.15 };
    return { ang: 0.95 + 0.12 * Math.sin(G.t * 2.2 + ph), len: 0.85 };
  }

  // ---- BIRD: crane/heron, the tallest ----
  function drawBird(ctx, x, y, s, f, o) {
    const { walk, ph, lunge, pose, fly } = o;
    const w = wingState(pose, fly, ph);
    const wingLen = w.len * s, wingAng = w.ang;
    const rootX = x - f * 0.16 * s, rootY = y - 0.64 * s;

    wing(ctx, rootX - f * 0.03 * s, rootY, wingLen, wingAng + 0.45, f, S_WING_FAR, S_WING_FAR);

    // body: a stout teardrop with real mass, centred low when grounded,
    // recentred horizontal (but the same size) in flight
    const cx = fly ? x - f * 0.06 * s : x - f * 0.02 * s;
    const cy = fly ? y - 0.55 * s : y - 0.58 * s;
    const bLen = 0.50 * s, bH = 0.24 * s;
    const body = [
      [cx + f * bLen * 0.50, cy],
      [cx - f * bLen * 0.15, cy - bH * 0.5],
      [cx - f * bLen * 0.50, cy],
      [cx - f * bLen * 0.15, cy + bH * 0.5],
    ];

    // legs: one far (flat), one near (lit/shade), each a single bent shape
    const legTop = [cx - f * 0.02 * s, cy + bH * 0.35];
    function leg(near, extra) {
      const swing = pose === "march" ? Math.sin((walk || 0) + ph + (near ? 0 : Math.PI)) * 0.08 * s : 0;
      const hip = [legTop[0] - f * extra, legTop[1]];
      const ankle = [hip[0] - f * 0.07 * s, y - 0.24 * s];
      const foot = fly ? [x - f * 0.62 * s, y - 0.50 * s] : [x + swing - f * extra, y];
      const pts = bentStrip([hip, ankle, foot], [0.045 * s, 0.038 * s, Math.max(1, 0.026 * s)]);
      massFill(ctx, pts, near, S_GOLD, S_GOLD_SHADE);
    }
    leg(false, 0.05 * s);

    volumeShade(ctx, body, S_BODY_LIT, S_BODY_SHADE, 0.3);

    leg(true, 0);

    // tail plumes streaming back from the tail tip
    const tailBase = [cx - f * bLen * 0.50, cy];
    const tailTip = fly ? [cx - f * bLen * 0.85, cy + 0.06 * s] : [cx - f * bLen * 0.75, cy + 0.10 * s];
    [-1, 0, 1].forEach((k) => {
      const tx = tailTip[0], ty = tailTip[1] + k * 0.04 * s;
      fillPoly(ctx, taper(tailBase[0], tailBase[1], tx, ty, 0.03 * s, Math.max(1, 0.012 * s)), S_BODY_SHADE);
    });

    // neck + head + beak + crest, one bent shape for the neck
    let neckPts, headPt;
    if (fly) {
      neckPts = [[cx + f * bLen * 0.42, cy - 0.02 * s], [x + f * 0.36 * s, cy - 0.02 * s], [x + f * 0.52 * s, y - 0.60 * s]];
      headPt = neckPts[2];
    } else {
      const restHead = [x + f * 0.22 * s, y - 1.10 * s];
      const strikeHead = [x + f * 0.42 * s, y - 0.90 * s];
      headPt = [mix(restHead[0], strikeHead[0], lunge), mix(restHead[1], strikeHead[1], lunge)];
      neckPts = [[cx + f * bLen * 0.40, cy - 0.06 * s], [x + f * 0.06 * s, y - 0.88 * s], headPt];
    }
    volumeShade(ctx, bentStrip(neckPts, [0.075 * s, 0.0625 * s, 0.05 * s]), S_BODY_LIT, S_BODY_SHADE, 0.4);
    circle(ctx, headPt[0], headPt[1], 0.065 * s, S_BODY_LIT);
    circle(ctx, headPt[0] + f * 0.02 * s, headPt[1] - 0.01 * s, 0.013 * s, S_EYE);

    const beakLen = fly ? 0.22 * s : 0.26 * s;
    const beakDy = fly ? -0.03 * s : (headPt[1] - neckPts[1][1]) * 0.35;
    const beakTip = [headPt[0] + f * beakLen, headPt[1] + beakDy];
    fillPoly(ctx, taper(headPt[0], headPt[1], beakTip[0], beakTip[1], 0.03 * s, Math.max(1, 0.01 * s)), S_GOLD);

    if (!fly) {
      const crestTip = [x - f * 0.04 * s, y - 1.22 * s];
      [-1, 0, 1].forEach((k) => {
        const cx2 = crestTip[0] + f * k * 0.03 * s, cy2 = crestTip[1] + Math.abs(k) * 0.04 * s;
        fillPoly(ctx, taper(headPt[0], headPt[1], cx2, cy2, 0.02 * s, Math.max(1, 0.01 * s)), S_BODY_SHADE);
      });
    }

    wing(ctx, rootX, rootY, wingLen, wingAng, f, S_WING_LIT, S_WING_SHADE);

    return beakTip;
  }

  // ---- HOUND: sighthound ----
  function drawHound(ctx, x, y, s, f, o) {
    const { walk, ph, lunge, pose, fly } = o;
    const w = wingState(pose, fly, ph);
    const wingLen = w.len * s, wingAng = w.ang;
    const withers = [x + f * 0.14 * s, y - 0.66 * s];
    const rootX = withers[0] - f * 0.08 * s, rootY = withers[1];

    wing(ctx, rootX - f * 0.03 * s, rootY, wingLen, wingAng + 0.45, f, S_WING_FAR, S_WING_FAR);

    // body volume, grounded or recentred (same mass) for flight
    const dy = fly ? -0.11 * s : 0;
    const chest = [
      [x + f * 0.20 * s, y - 0.64 * s + dy],
      [x + f * 0.26 * s, y - 0.50 * s + dy],
      [x + f * 0.18 * s, y - 0.36 * s + dy],
      [x - f * 0.02 * s, y - 0.46 * s + dy],
    ];
    const belly = [
      [x + f * 0.02 * s, y - 0.50 * s + dy],
      [x - f * 0.08 * s, y - 0.36 * s + dy],
      [x - f * 0.20 * s, y - 0.42 * s + dy],
      [x - f * 0.12 * s, y - 0.58 * s + dy],
    ];
    const haunch = [
      [x - f * 0.16 * s, y - 0.64 * s + dy],
      [x - f * 0.32 * s, y - 0.60 * s + dy],
      [x - f * 0.34 * s, y - 0.40 * s + dy],
      [x - f * 0.18 * s, y - 0.38 * s + dy],
    ];

    // legs: front + hind pairs, each far (flat) then near (lit/shade)
    function legPair(hipX, hipY, footNear, footFar) {
      [false, true].forEach((near) => {
        const hx = hipX - (near ? 0 : f * 0.02 * s), hy = hipY;
        const hock = [hx - f * 0.02 * s, y - 0.20 * s + dy * 0.2];
        const foot = near ? footNear : footFar;
        const pts = bentStrip([[hx, hy], hock, foot], [0.05 * s, 0.045 * s, 0.035 * s]);
        massFill(ctx, pts, near, S_BODY_LIT, S_BODY_SHADE);
      });
    }
    if (fly) {
      legPair(x + f * 0.18 * s, y - 0.50 * s + dy, [x + f * 0.40 * s, y - 0.42 * s], [x + f * 0.38 * s, y - 0.40 * s]);
      legPair(x - f * 0.22 * s, y - 0.46 * s + dy, [x - f * 0.52 * s, y - 0.44 * s], [x - f * 0.50 * s, y - 0.42 * s]);
    } else {
      const gaitF = pose === "march" ? Math.sin((walk || 0) + ph) * 0.10 * s : 0;
      const gaitH = pose === "march" ? Math.sin((walk || 0) + ph + Math.PI) * 0.10 * s : 0;
      legPair(x + f * 0.18 * s, y - 0.58 * s, [x + f * 0.18 * s + gaitF, y], [x + f * 0.16 * s + gaitF, y]);
      legPair(x - f * 0.24 * s, y - 0.54 * s, [x - f * 0.24 * s + gaitH, y], [x - f * 0.26 * s + gaitH, y]);
    }

    [chest, belly, haunch].forEach((p) => volumeShade(ctx, p, S_BODY_LIT, S_BODY_SHADE, 0.3));

    // tail: a feathered plume, not a stick, widening toward the tip
    const tailRoot = [x - f * 0.28 * s, y - 0.58 * s + dy];
    const swayY = 0.05 * s * Math.sin(G.t * 3 + ph);
    const tailMid = [x - f * 0.42 * s, y - 0.50 * s + dy];
    const tailTip = fly ? [x - f * 0.62 * s, y - 0.48 * s + dy + swayY] : [x - f * 0.50 * s, y - 0.38 * s + swayY];
    volumeShade(ctx, bentStrip([tailRoot, tailMid, tailTip], [0.02 * s, 0.05 * s, 0.07 * s]), S_BODY_LIT, S_BODY_SHADE, 0.4);

    // neck + head: skull, snout wedge, folded ear
    const headRest = [x + f * 0.32 * s, y - 0.86 * s];
    const headDrop = fly ? 0 : 0.12 * s * lunge;
    const headPt = fly ? [x + f * 0.44 * s, y - 0.60 * s + dy] : [headRest[0], headRest[1] + headDrop];
    const neckBase = fly ? [x + f * 0.20 * s, y - 0.58 * s + dy] : withers;
    volumeShade(ctx, bentStrip([neckBase, [x + f * 0.24 * s, y - 0.80 * s], headPt], [0.11 * s, 0.09 * s, 0.07 * s]), S_BODY_LIT, S_BODY_SHADE, 0.4);

    const skull = [
      [headPt[0] - f * 0.045 * s, headPt[1] - 0.045 * s],
      [headPt[0] + f * 0.05 * s, headPt[1] - 0.035 * s],
      [headPt[0] + f * 0.05 * s, headPt[1] + 0.045 * s],
      [headPt[0] - f * 0.045 * s, headPt[1] + 0.035 * s],
    ];
    volumeShade(ctx, skull, S_BODY_LIT, S_BODY_SHADE, 0.4);
    const snoutTip = [headPt[0] + f * 0.21 * s, headPt[1] + 0.005 * s];
    fillPoly(ctx, [
      [headPt[0] + f * 0.05 * s, headPt[1] - 0.025 * s],
      [snoutTip[0], snoutTip[1]],
      [headPt[0] + f * 0.05 * s, headPt[1] + 0.025 * s],
    ], S_BODY_LIT);
    circle(ctx, snoutTip[0], snoutTip[1], 0.012 * s, S_EYE);
    fillPoly(ctx, [
      [headPt[0] - f * 0.02 * s, headPt[1] - 0.045 * s],
      [headPt[0] - f * 0.10 * s, headPt[1] - 0.11 * s],
      [headPt[0] + f * 0.01 * s, headPt[1] - 0.075 * s],
    ], S_BODY_SHADE);
    circle(ctx, headPt[0] + f * 0.015 * s, headPt[1] - 0.015 * s, 0.011 * s, S_EYE);

    wing(ctx, rootX, rootY, wingLen, wingAng, f, S_WING_LIT, S_WING_SHADE);

    return snoutTip;
  }

  // ---- STAG ----
  function drawStag(ctx, x, y, s, f, o) {
    const { walk, ph, lunge, pose, fly } = o;
    const w = wingState(pose, fly, ph);
    const wingLen = w.len * s, wingAng = w.ang;
    const withers = [x + f * 0.12 * s, y - 0.64 * s];
    const rootX = withers[0] - f * 0.06 * s, rootY = withers[1];

    wing(ctx, rootX - f * 0.03 * s, rootY, wingLen, wingAng + 0.45, f, S_WING_FAR, S_WING_FAR);

    const dy = fly ? -0.12 * s : 0;
    const chest = [
      [x + f * 0.16 * s, y - 0.64 * s + dy],
      [x + f * 0.22 * s, y - 0.50 * s + dy],
      [x + f * 0.14 * s, y - 0.34 * s + dy],
      [x - f * 0.04 * s, y - 0.44 * s + dy],
    ];
    const rump = [
      [x - f * 0.06 * s, y - 0.60 * s + dy],
      [x - f * 0.24 * s, y - 0.56 * s + dy],
      [x - f * 0.24 * s, y - 0.38 * s + dy],
      [x - f * 0.04 * s, y - 0.38 * s + dy],
    ];

    function leg(hipX, hipY, footNear, footFar) {
      [false, true].forEach((near) => {
        const hx = hipX - (near ? 0 : f * 0.02 * s), hy = hipY;
        const knee = [hx - f * 0.01 * s, y - 0.20 * s + dy * 0.2];
        const foot = near ? footNear : footFar;
        const pts = bentStrip([[hx, hy], knee, foot], [0.045 * s, 0.04 * s, 0.03 * s]);
        massFill(ctx, pts, near, S_BODY_LIT, S_BODY_SHADE);
        if (!fly) {
          fillPoly(ctx, [
            [foot[0] - 0.028 * s, foot[1]],
            [foot[0] + 0.028 * s, foot[1]],
            [foot[0], foot[1] - 0.05 * s],
          ], S_GOLD);
        }
      });
    }
    if (fly) {
      leg(x + f * 0.16 * s, y - 0.48 * s + dy, [x + f * 0.38 * s, y - 0.40 * s], [x + f * 0.36 * s, y - 0.38 * s]);
      leg(x - f * 0.20 * s, y - 0.44 * s + dy, [x - f * 0.50 * s, y - 0.42 * s], [x - f * 0.48 * s, y - 0.40 * s]);
    } else {
      const gaitF = pose === "march" ? Math.sin((walk || 0) + ph) * 0.09 * s : 0;
      const gaitH = pose === "march" ? Math.sin((walk || 0) + ph + Math.PI) * 0.09 * s : 0;
      leg(x + f * 0.16 * s, y - 0.56 * s, [x + f * 0.16 * s + gaitF, y], [x + f * 0.14 * s + gaitF, y]);
      leg(x - f * 0.20 * s, y - 0.52 * s, [x - f * 0.20 * s + gaitH, y], [x - f * 0.22 * s + gaitH, y]);
    }

    [chest, rump].forEach((p) => volumeShade(ctx, p, S_BODY_LIT, S_BODY_SHADE, 0.3));

    // short upturned tail
    fillPoly(ctx, [
      [x - f * 0.22 * s, y - 0.56 * s + dy],
      [x - f * 0.29 * s, y - 0.62 * s + dy],
      [x - f * 0.20 * s, y - 0.50 * s + dy],
    ], S_BODY_SHADE);

    // neck + head: skull, muzzle wedge, upright ear
    const headRest = [x + f * 0.28 * s, y - 0.90 * s];
    const headDrop = fly ? 0 : 0.22 * s * lunge;
    const headPt = fly ? [x + f * 0.42 * s, y - 0.58 * s + dy] : [headRest[0], headRest[1] + headDrop];
    const neckBase = fly ? [x + f * 0.18 * s, y - 0.56 * s + dy] : withers;
    volumeShade(ctx, bentStrip([neckBase, [x + f * 0.20 * s, y - 0.78 * s], headPt], [0.12 * s, 0.10 * s, 0.08 * s]), S_BODY_LIT, S_BODY_SHADE, 0.4);

    const skull = [
      [headPt[0] - f * 0.04 * s, headPt[1] - 0.04 * s],
      [headPt[0] + f * 0.045 * s, headPt[1] - 0.03 * s],
      [headPt[0] + f * 0.045 * s, headPt[1] + 0.04 * s],
      [headPt[0] - f * 0.04 * s, headPt[1] + 0.03 * s],
    ];
    volumeShade(ctx, skull, S_BODY_LIT, S_BODY_SHADE, 0.4);
    const muzzleTip = [headPt[0] + f * 0.18 * s, headPt[1] + 0.01 * s];
    fillPoly(ctx, [
      [headPt[0] + f * 0.045 * s, headPt[1] - 0.02 * s],
      [muzzleTip[0], muzzleTip[1]],
      [headPt[0] + f * 0.045 * s, headPt[1] + 0.02 * s],
    ], S_BODY_LIT);
    circle(ctx, muzzleTip[0], muzzleTip[1], 0.01 * s, S_EYE);
    fillPoly(ctx, [
      [headPt[0] - f * 0.01 * s, headPt[1] - 0.04 * s],
      [headPt[0] - f * 0.03 * s, headPt[1] - 0.13 * s],
      [headPt[0] + f * 0.03 * s, headPt[1] - 0.07 * s],
    ], S_BODY_SHADE);
    circle(ctx, headPt[0] + f * 0.015 * s, headPt[1] - 0.01 * s, 0.011 * s, S_EYE);

    // antlers: two beams diverging from the crown in a lyre/V, far first
    const crown = [headPt[0] - f * 0.02 * s, headPt[1] - 0.04 * s];
    function antler(root, ang, near, lit, shade) {
      const len = 0.60 * s;
      const dx = -f * Math.sin(ang), dyv = -Math.cos(ang);
      const mid = [root[0] + dx * len * 0.5, root[1] + dyv * len * 0.5];
      const tip = [root[0] + dx * len, root[1] + dyv * len];
      const beam = bentStrip([root, mid, tip], [0.03 * s, 0.022 * s, Math.max(1, 0.01 * s)]);
      massFill(ctx, beam, near, lit, shade);
      const tineN = near ? 4 : 3;
      for (let i = 1; i <= tineN; i++) {
        const t = i / (tineN + 1);
        const bx = mix(root[0], tip[0], t), by = mix(root[1], tip[1], t);
        const tx = bx + f * 0.11 * s, ty = by - 0.09 * s;
        fillPoly(ctx, taper(bx, by, tx, ty, 0.012 * s, Math.max(1, 0.006 * s)), shade === lit ? shade : lit);
      }
    }
    antler([crown[0] - f * 0.02 * s, crown[1]], 0.80, false, S_GOLD_SHADE, S_GOLD_SHADE);
    antler(crown, 0.35, true, S_GOLD, S_GOLD_SHADE);

    wing(ctx, rootX, rootY, wingLen, wingAng, f, S_WING_LIT, S_WING_SHADE);

    return muzzleTip;
  }

  // ---- dispatcher ----
  function drawAngel(ctx, x, y, s, o) {
    o = o || {};
    let a = o.a ?? 1;
    const f = o.face < 0 ? -1 : 1;
    const walk = o.walk || 0, ph = o.ph || 0;
    const lunge = o.lunge || 0, cast = o.cast || 0;
    const pose = o.pose || "march";
    const down = o.down ?? 1;
    const form = o.form === "hound" || o.form === "stag" ? o.form : "bird";
    const fly = !!o.fly && pose !== "dead";
    if (pose === "dead") a *= 0.55;
    else if (pose === "fight") x += f * 0.22 * s * lunge;
    if (a < 0.01) return;

    ctx.save();
    ctx.globalAlpha = a;
    withTilt(ctx, x, y, pose === "dead" ? f * (Math.PI / 2) * down : 0, () => {
      const fo = { walk, ph, lunge, pose, fly };
      let mouth;
      if (form === "hound") mouth = drawHound(ctx, x, y, s, f, fo);
      else if (form === "stag") mouth = drawStag(ctx, x, y, s, f, fo);
      else mouth = drawBird(ctx, x, y, s, f, fo);

      if (cast > 0.01 && pose !== "dead") {
        const hx = x + f * GH.HAND[0] * s, hy = y - GH.HAND[1] * s;
        fillPoly(ctx, quad(mouth[0], mouth[1], hx, hy, Math.max(1, 0.02 * s)), `rgba(255,246,216,${0.6 * cast})`);
        flatGlow(ctx, hx, hy, 0.22 * s * cast, "255,226,150", 0.8 * cast);
        circle(ctx, hx, hy, 0.05 * s * cast, "#fff6d8");
      }
    });
    ctx.restore();
  }

  GH.drawAngel = drawAngel;
})();
