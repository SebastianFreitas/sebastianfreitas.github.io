/* genesis-vorgath.js — extra vorgath forms pushed onto GenHosts.ABOM:
   a swollen bloat, a segmented whelp echoing Obrokxus's centipede form,
   and a walking skull-jaw maw. Same painter signature as the abomination
   variants in genesis-hosts.js: (ctx, x, y, s, f, walk, lunge, pose),
   y is the foot line and s the body height. */
(function () {
  const H = window.GenHosts;
  if (!H) return;
  const { circle } = Paint;
  const { fillPoly, shadedPoly, quad } = GenFig;
  const { B_LIT, B_SHADE, FL_LIT, FL_SHADE, EYE_SOCK, EYE } = H.ABOM_PAL;

  // ---- BLOAT: swollen round flesh sack on stubby legs ----
  function drawBloat(ctx, x, y, s, f, walk, lunge, pose) {
    const sway = pose === "march" ? 0.03 * s * Math.sin(walk) : 0;
    const bob = pose === "march" ? 0.02 * s * Math.sin(walk * 2) : 0;
    const cx = x + sway, cy = y - 0.42 * s + bob;
    const rx = 0.35 * s, ry = 0.32 * s;
    const body = [];
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2;
      body.push([cx + Math.cos(ang) * rx, cy + Math.sin(ang) * ry]);
    }
    const bodyXs = (cx - rx) + 0.3 * (2 * rx);
    shadedPoly(ctx, body, bodyXs, FL_LIT, FL_SHADE);

    // stubby bone legs
    [-1, 1].forEach((side) => {
      const hipX = cx + 0.14 * s * side, hipY = y - 0.10 * s;
      fillPoly(ctx, quad(hipX, hipY, hipX, y, 0.08 * s), B_SHADE);
    });

    // bone spikes fanning off the back
    for (let i = 0; i < 4; i++) {
      const t = i / 3 - 0.5;
      const bx0 = cx + f * t * 0.24 * s, by0 = cy - ry * 0.7 + Math.abs(t) * 0.08 * s;
      fillPoly(ctx, [
        [bx0 - 0.025 * s, by0],
        [bx0 + 0.025 * s, by0],
        [bx0 + f * t * 0.06 * s, by0 - 0.14 * s],
      ], B_LIT);
    }

    // eye cluster on the front
    for (let i = 0; i < 4; i++) {
      const t = i / 3 - 0.5;
      circle(ctx, cx + f * t * 0.20 * s, cy - 0.05 * s, 0.02 * s, EYE);
    }

    // wide lipless maw with bone teeth
    const mawY = cy + ry * 0.5;
    fillPoly(ctx, [
      [cx - f * 0.16 * s, mawY],
      [cx + f * 0.16 * s, mawY],
      [cx + f * 0.14 * s, mawY + 0.08 * s],
      [cx - f * 0.14 * s, mawY + 0.08 * s],
    ], EYE_SOCK);
    for (let i = 0; i < 5; i++) {
      const tx0 = cx - f * 0.14 * s + f * i * 0.07 * s;
      fillPoly(ctx, [
        [tx0 - 0.012 * s, mawY],
        [tx0 + 0.012 * s, mawY],
        [tx0, mawY + 0.04 * s],
      ], B_LIT);
    }
  }

  // ---- WHELP: segmented crawler after Obrokxus's centipede form ----
  function drawWhelp(ctx, x, y, s, f, walk, lunge, pose) {
    const by = y - 0.20 * s;
    const nSeg = 4, L = 1.1 * s;
    for (let k = 0; k < nSeg; k++) {
      const t = k / (nSeg - 1);
      const scale = 1 - 0.35 * t;
      const cx = x + f * (0.45 * s - t * L * 0.9);
      const cy = by - 0.08 * s * (1 - t);
      const rw = 0.18 * s * scale, rh = 0.14 * s * scale;
      const seg = [];
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        seg.push([cx + Math.cos(ang) * rw, cy + Math.sin(ang) * rh]);
      }
      const segXs = (cx - rw) + 0.3 * (2 * rw);
      shadedPoly(ctx, seg, segXs, FL_LIT, FL_SHADE);
      fillPoly(ctx, [
        [cx - rw * 0.7, cy - rh * 0.3],
        [cx + rw * 0.7, cy - rh * 0.3],
        [cx + rw * 0.5, cy - rh * 0.9],
        [cx - rw * 0.5, cy - rh * 0.9],
      ], B_LIT);

      [-1, 1].forEach((side) => {
        const step = pose === "march" ? Math.sin(walk + k * 0.9) * side : side * 0.3;
        const hipY = cy + rh * 0.6;
        const footX = cx + step * 0.06 * s, footY = y;
        fillPoly(ctx, quad(cx, hipY, footX, footY, 0.02 * s), B_SHADE);
      });
    }

    // head with mandibles and one eye
    const hx = x + f * (0.45 * s + 0.10 * s), hy = by - 0.08 * s;
    circle(ctx, hx, hy, 0.10 * s, B_LIT);
    circle(ctx, hx + f * 0.02 * s, hy, 0.02 * s, EYE_SOCK);
    circle(ctx, hx + f * 0.02 * s, hy, 0.01 * s, EYE);
    fillPoly(ctx, [
      [hx + f * 0.08 * s, hy + 0.04 * s],
      [hx + f * 0.18 * s, hy + 0.02 * s],
      [hx + f * 0.10 * s, hy + 0.10 * s],
    ], B_SHADE);
    fillPoly(ctx, [
      [hx + f * 0.08 * s, hy - 0.04 * s],
      [hx + f * 0.18 * s, hy - 0.02 * s],
      [hx + f * 0.10 * s, hy - 0.10 * s],
    ], B_SHADE);
  }

  // ---- MAW: walking giant skull-jaw ----
  function drawMaw(ctx, x, y, s, f, walk, lunge, pose) {
    // two thick backward-knee flesh legs
    [-1, 1].forEach((side, idx) => {
      const swing = pose === "march" ? 0.08 * s * Math.sin(walk + idx * Math.PI) : 0;
      const hipX = x + 0.10 * s * side, hipY = y - 0.55 * s;
      const kneeX = x + 0.14 * s * side - f * 0.06 * s, kneeY = y - 0.26 * s;
      const footX = x + 0.04 * s * side + swing, footY = y;
      fillPoly(ctx, quad(hipX, hipY, kneeX, kneeY, 0.09 * s), FL_SHADE);
      fillPoly(ctx, quad(kneeX, kneeY, footX, footY, 0.08 * s), FL_LIT);
    });

    // huge bone skull, upper
    const hx = x, hy = y - 0.75 * s;
    const upper = [
      [hx - f * 0.30 * s, hy],
      [hx - f * 0.22 * s, hy - 0.22 * s],
      [hx + f * 0.05 * s, hy - 0.30 * s],
      [hx + f * 0.30 * s, hy - 0.14 * s],
      [hx + f * 0.26 * s, hy + 0.02 * s],
    ];
    const upperXs = (hx - 0.30 * s) + 0.3 * (0.60 * s);
    shadedPoly(ctx, upper, upperXs, B_LIT, B_SHADE);

    // jaw hangs open, opening grows with lunge
    const openAmt = 0.10 * s + 0.28 * s * lunge;
    const jawY = hy + openAmt;
    const jaw = [
      [hx - f * 0.24 * s, hy + 0.02 * s],
      [hx + f * 0.24 * s, hy],
      [hx + f * 0.18 * s, jawY],
      [hx - f * 0.16 * s, jawY],
    ];
    const jawXs = (hx - 0.24 * s) + 0.3 * (0.48 * s);
    shadedPoly(ctx, jaw, jawXs, B_LIT, B_SHADE);

    // flesh tongue
    fillPoly(ctx, [
      [hx - f * 0.08 * s, hy + 0.04 * s],
      [hx + f * 0.08 * s, hy + 0.02 * s],
      [hx + f * 0.04 * s, jawY - 0.03 * s],
      [hx - f * 0.04 * s, jawY - 0.02 * s],
    ], FL_LIT);

    // eye sockets with glints
    [-1, 1].forEach((side) => {
      const ex = hx + f * 0.05 * s + side * 0.10 * s, ey = hy - 0.14 * s;
      circle(ctx, ex, ey, 0.035 * s, EYE_SOCK);
      circle(ctx, ex, ey, 0.015 * s, EYE);
    });

    // stubby vestigial arms
    if (pose !== "dead") {
      [-1, 1].forEach((side) => {
        const shX = x + 0.16 * s * side, shY = y - 0.50 * s;
        const ex = shX + f * 0.10 * s, ey = shY + 0.10 * s;
        fillPoly(ctx, quad(shX, shY, ex, ey, 0.05 * s), FL_SHADE);
      });
    }
  }

  H.ABOM.push(drawBloat, drawWhelp, drawMaw);
})();
