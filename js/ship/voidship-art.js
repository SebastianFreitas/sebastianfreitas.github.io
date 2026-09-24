/* voidship-art.js — paints the player's craft: a kilometres-long city-ship
   seen from the side, its front-on silhouette (used mid-turn), and the
   alien fumes its drive sheds. Flat 2D silhouettes only, light from
   screen-left; every hull volume is split lit/shade with Paint.litShade.

   drawHull's local frame: the caller has already applied
   translate(shipScreenX, shipScreenY), rotate(pitch) and scale(sx, 1)
   where sx carries the sign of ship.face. So here +x = toward the nose,
   +y = down, and every coordinate below is a fraction of L (the ship's
   nose-to-tail length in px). Because that scale can mirror the frame,
   "screen-right" is local-left when ship.face < 0 — the block() helper
   below is the one place that distinction is handled.

   drawFront's frame is unscaled (translate + rotate only), so there
   "screen-right" is simply +x.

   The red prow (artifact, column, claw arm, leg) lives in voidship-prow.js and is painted from drawHull/drawFront via VoidshipArt.drawProwBack/drawProw/drawProwFront.

   Published as window.VoidshipArt. */
window.VoidshipArt = (function () {
  const { clamp, mix, hash1 } = window.Util;
  const Paint = window.Paint;

  const LIT = [200, 216, 224];
  const MID = [138, 162, 174];
  const SHADE = [78, 100, 112];
  const DEEP = [40, 54, 62];
  const LAMP = [245, 208, 107];
  const COLD = [143, 176, 184];
  const RED = [255, 84, 70];
  const WHITE = [255, 255, 255];
  const DRIVE_A = [140, 255, 236];
  const DRIVE_B = [150, 100, 255];
  const DRIVE_C = [58, 32, 118];

  function rgba(c, a) { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
  function mixc(a, b, u) {
    return [Math.round(mix(a[0], b[0], u)), Math.round(mix(a[1], b[1], u)), Math.round(mix(a[2], b[2], u))];
  }

  // Shaded side = screen-right 70% of the volume spanning local x in [a, b].
  // When the frame is mirrored (dir < 0) local-left is screen-right, so the
  // lit/shade colours and the split point swap to keep the lit side on
  // screen-left.
  function block(g, trace, a, b, lit, shade, dir) {
    if (dir >= 0) Paint.litShade(g, trace, a + 0.3 * (b - a), lit, shade);
    else Paint.litShade(g, trace, b - 0.3 * (b - a), shade, lit);
  }

  const EMIT = [
    { x: -0.455, y: -0.032 },
    { x: -0.455, y: 0.008 },
    { x: -0.455, y: 0.048 }
  ];

  // sustainer nozzles at the aft spar tips (phase 2 onward)
  const SUST = [{ x: -0.52, y: 0.070 }, { x: -0.585, y: -0.076 }];
  // RCS nozzles: belly pair fires down (climb), deck pair fires up (descent). Placed on free hull edge.
  const JETS = { belly: [{ x: 0.40, y: 0.092 }, { x: -0.38, y: 0.064 }], top: [{ x: 0.36, y: -0.078 }, { x: -0.39, y: -0.049 }] };
  // streamer roots: claw tip, forward boom tip, tallest spire tip, foot lamp tip
  const TRAIL_SEATS = [{ x: 1.04, y: -0.206 }, { x: 0.41, y: -0.232 }, { x: -0.05, y: -0.349 }, { x: 0.55, y: 0.34 }];
  const TRAIL_COL = [LAMP, COLD, DRIVE_A, DRIVE_A];

  const HULL = [
    [0.66, 0.000],
    [0.44, -0.030],
    [0.16, -0.070],
    [-0.34, -0.070],
    [-0.41, -0.040],
    [-0.41, 0.050],
    [-0.34, 0.082],
    [0.02, 0.082],
    [0.30, 0.048],
    [0.52, 0.018]
  ];

  const BELLY = [
    [-0.34, 0.082], [0.02, 0.082], [0.30, 0.048], [0.52, 0.018],
    [0.52, 0.006], [0.30, 0.032], [0.02, 0.062], [-0.34, 0.062]
  ];

  const UNDER_TOWERS = [
    // x0, x1, yTop, yBottom
    [-0.30, -0.27, 0.09, 0.17],
    [-0.26, -0.21, 0.09, 0.22],
    [-0.20, -0.18, 0.09, 0.14],
    [-0.16, -0.11, 0.09, 0.26],
    [-0.10, -0.07, 0.09, 0.19],
    [-0.05, -0.02, 0.09, 0.15],
    [0.00, 0.03, 0.09, 0.13]
  ];

  const PLATES = [
    [-0.34, -0.20, -0.05, -0.01],
    [-0.12, 0.06, 0.01, 0.05],
    [0.10, 0.26, -0.04, 0.00],
    [0.28, 0.40, 0.00, 0.03]
  ];

  const AFT_TOWERS = [
    // x0, x1, top; base is fixed at -0.078
    [-0.360, -0.340, -0.125],
    [-0.335, -0.300, -0.160],
    [-0.295, -0.280, -0.110],
    [-0.270, -0.240, -0.190],
    [-0.235, -0.215, -0.140],
    [-0.205, -0.180, -0.105]
  ];

  const FWD_TOWERS = [
    [0.13, 0.16, -0.110, -0.070],
    [0.17, 0.19, -0.090, -0.066],
    [0.21, 0.24, -0.078, -0.060]
  ];

  const SPIRES = [
    // x, base, top, w
    [-0.150, -0.150, -0.235, 0.004],
    [0.070, -0.150, -0.215, 0.004],
    [0.085, -0.150, -0.185, 0.003],
    [-0.095, -0.205, -0.265, 0.004],
    [0.025, -0.205, -0.250, 0.003],
    [-0.050, -0.290, -0.345, 0.003],
    [0.000, -0.290, -0.330, 0.003],
    [-0.348, -0.125, -0.170, 0.003],
    [-0.318, -0.160, -0.215, 0.004],
    [-0.225, -0.140, -0.185, 0.003],
    [-0.192, -0.105, -0.150, 0.003],
    [0.145, -0.110, -0.150, 0.003],
    [0.180, -0.090, -0.125, 0.003]
  ];

  function drawHull(g, ship, L, t) {
    const dir = ship.face >= 0 ? 1 : -1;
    const th = clamp(ship.thrustAmt || 0, 0, 1);

    // pixel floors: nothing below 1px, whatever L shrinks to
    const P = 1 / L;
    const w1 = v => Math.max(v, P);
    const rectL = (x0, y0, x1, y1) => () => { g.beginPath(); g.rect(x0 * L, y0 * L, Math.max((x1 - x0) * L, 1), Math.max((y1 - y0) * L, 1)); };

    // 1. Underside (hanging city), painted first so the hull's belly tucks over their tops.
    for (const [x0, x1, y0, y1] of UNDER_TOWERS) {
      block(g, rectL(x0, y0, x1, y1), x0 * L, x1 * L, rgba(SHADE, 1), rgba(DEEP, 1), dir);
    }
    // keel spine
    block(g, rectL(-0.32, 0.088, 0.06, 0.118), -0.32 * L, 0.06 * L, rgba(SHADE, 1), rgba(DEEP, 1), dir);

    // short probe
    g.fillStyle = rgba(SHADE, 1);
    rectL(0.205, 0.078, 0.211, 0.160)(); g.fill();
    Paint.circle(g, 0.208 * L, 0.163 * L, Math.max(0.004 * L, 0.9), rgba(COLD, 0.6));

    // hanging antennae
    g.fillStyle = rgba(SHADE, 1);
    {
      const w = w1(0.003);
      rectL(-0.235 - w / 2, 0.22, -0.235 + w / 2, 0.30)(); g.fill();
    }
    {
      const w = w1(0.004);
      rectL(-0.135 - w / 2, 0.26, -0.135 + w / 2, 0.33)(); g.fill();
    }
    Paint.circle(g, -0.135 * L, 0.334 * L, Math.max(0.003 * L, 0.9), rgba(COLD, 0.7));
    {
      const w = w1(0.003);
      rectL(-0.060 - w / 2, 0.15, -0.060 + w / 2, 0.20)(); g.fill();
    }
    {
      const w = w1(0.003);
      rectL(-0.285 - w / 2, 0.17, -0.285 + w / 2, 0.21)(); g.fill();
    }

    // 2. Main hull
    if (window.VoidshipArt && window.VoidshipArt.drawProwBack) window.VoidshipArt.drawProwBack(g, ship, L, t);
    block(g, () => Paint.poly(g, HULL.map(([x, y]) => [x * L, y * L])), -0.41 * L, 0.66 * L, rgba(LIT, 1), rgba(MID, 1), dir);

    // deckhouse: a long low spine along the flat deck
    block(g, rectL(-0.30, -0.084, 0.10, -0.070), -0.30 * L, 0.10 * L, rgba(LIT, 1), rgba(MID, 1), dir);

    // 3. Belly band, flat shade
    Paint.poly(g, BELLY.map(([x, y]) => [x * L, y * L]));
    g.fillStyle = rgba(SHADE, 1);
    g.fill();

    // 4. Plating panels
    g.fillStyle = rgba(SHADE, 0.18);
    for (const [x0, x1, y0, y1] of PLATES) {
      rectL(x0, y0, x1, y1)(); g.fill();
    }

    // hull surface detail
    g.fillStyle = rgba(LIT, 0.25);
    rectL(-0.30, -0.062, -0.14, -0.040)(); g.fill();
    rectL(0.14, 0.010, 0.30, 0.030)(); g.fill();

    g.fillStyle = rgba(DEEP, 0.6);
    for (let vi = 0; vi < 6; vi++) {
      const vx0 = -0.22 + vi * 0.03;
      rectL(vx0, 0.054, vx0 + 0.012, 0.062)(); g.fill();
    }

    g.fillStyle = rgba(DEEP, 1);
    rectL(0.06, 0.030, 0.14, 0.062)(); g.fill();
    g.fillStyle = rgba(LAMP, 0.5);
    rectL(0.065, 0.034, 0.135, 0.038)(); g.fill();

    g.fillStyle = rgba(LAMP, 0.45);
    rectL(-0.30, -0.086, -0.02, -0.084)(); g.fill();
    g.fillStyle = rgba(LAMP, 0.35);
    rectL(0.02, -0.072, 0.30, -0.070)(); g.fill();
    g.fillStyle = rgba(COLD, 0.5);
    rectL(-0.20, 0.084, 0.10, 0.086)(); g.fill();

    // 5. Windows
    const wpx = Math.max(1, L * 0.010);
    let i = 0;
    for (let x = -0.36; x <= 0.30 + 1e-9; x += 0.032) {
      drawWindow(g, x, -0.036, L, wpx, i, t);
      i++;
    }
    for (let x = -0.34; x <= 0.40 + 1e-9; x += 0.032) {
      drawWindow(g, x, 0.030, L, wpx, i, t);
      i++;
    }
    for (let x = -0.30; x <= 0.20 + 1e-9; x += 0.032) {
      drawWindow(g, x, 0.062, L, wpx, i, t);
      i++;
    }
    // 6. Superstructure
    block(g, rectL(-0.17, -0.150, 0.10, -0.070), -0.17 * L, 0.10 * L, rgba(LIT, 1), rgba(MID, 1), dir); // C1
    block(g, rectL(-0.11, -0.205, 0.04, -0.150), -0.11 * L, 0.04 * L, rgba(LIT, 1), rgba(MID, 1), dir); // C2
    block(g, rectL(-0.06, -0.290, 0.01, -0.205), -0.06 * L, 0.01 * L, rgba(MID, 1), rgba(SHADE, 1), dir); // C3
    // C4 spire, flat shade
    g.fillStyle = rgba(SHADE, 1);
    rectL(-0.030, -0.400, -0.018, -0.290)(); g.fill();
    {
      const on = ((t % 1.3) < 0.12);
      if (on) {
        const cx = -0.024 * L, cy = -0.405 * L;
        Paint.circle(g, cx, cy, Math.max(0.016 * L, 2), rgba(RED, 0.35));
        Paint.circle(g, cx, cy, Math.max(0.007 * L, 0.9), rgba(RED, 1));
      }
    }

    // aft towers (base y = -0.078)
    for (let ti = 0; ti < AFT_TOWERS.length; ti++) {
      const [x0, x1, top] = AFT_TOWERS[ti];
      const lit = ti === 3 ? MID : LIT;
      const shade = SHADE;
      block(g, rectL(x0, top, x1, -0.078), x0 * L, x1 * L, rgba(lit, 1), rgba(shade, 1), dir);
    }

    // mast M1
    g.fillStyle = rgba(SHADE, 1);
    rectL(-0.258, -0.330, -0.252, -0.190)(); g.fill();
    rectL(-0.275, -0.300, -0.235, -0.294)(); g.fill();
    rectL(-0.270, -0.260, -0.240, -0.254)(); g.fill();
    {
      const on = ((t % 2.1) < 0.06);
      if (on) {
        const cx = -0.255 * L, cy = -0.335 * L;
        Paint.circle(g, cx, cy, Math.max(0.014 * L, 2), rgba(WHITE, 0.4));
        Paint.circle(g, cx, cy, Math.max(0.006 * L, 0.9), rgba(WHITE, 1));
      }
    }

    // forward towers
    for (const [x0, x1, y0, y1] of FWD_TOWERS) {
      block(g, rectL(x0, y0, x1, y1), x0 * L, x1 * L, rgba(LIT, 1), rgba(MID, 1), dir);
    }

    // angular sensor array (was: dish)
    block(g, rectL(-0.16, -0.166, -0.10, -0.158), -0.16 * L, -0.10 * L, rgba(MID, 1), rgba(SHADE, 1), dir);
    g.fillStyle = rgba(SHADE, 1);
    rectL(-0.132, -0.158, -0.128, -0.150)(); g.fill();

    // spire field
    g.fillStyle = rgba(SHADE, 1);
    for (const [x, base, top, w] of SPIRES) {
      const ww = w1(w);
      rectL(x - ww / 2, top, x + ww / 2, base)(); g.fill();
    }
    for (const [x, , top, w] of SPIRES) {
      if (w !== 0.004) continue;
      if (x === -0.318) {
        const on = ((t % 1.7) < 0.10);
        if (on) {
          const cx = x * L, cy = (top - 0.004) * L;
          Paint.circle(g, cx, cy, Math.max(0.012 * L, 2), rgba(RED, 0.35));
          Paint.circle(g, cx, cy, Math.max(0.005 * L, 0.9), rgba(RED, 1));
        }
      } else if (x === 0.070) {
        const on = ((t % 2.9) < 0.05);
        if (on) {
          const cx = x * L, cy = (top - 0.004) * L;
          Paint.circle(g, cx, cy, Math.max(0.012 * L, 2), rgba(WHITE, 0.4));
          Paint.circle(g, cx, cy, Math.max(0.005 * L, 0.9), rgba(WHITE, 1));
        }
      } else {
        Paint.circle(g, x * L, (top - 0.004) * L, Math.max(0.003 * L, 0.9), rgba(COLD, 0.7));
      }
    }
    // lattice bridge: mast M1 to citadel's second tier
    g.fillStyle = rgba(SHADE, 1);
    rectL(-0.252, -0.212, -0.110, -0.208)(); g.fill();
    // second forward antenna
    Paint.line(g, [[0.10 * L, -0.120 * L], [0.30 * L, -0.150 * L]], rgba(SHADE, 1), w1(0.004) * L);

    // forward sensor boom
    Paint.line(g, [[0.06 * L, -0.165 * L], [0.40 * L, -0.230 * L]], rgba(SHADE, 1), w1(0.005) * L);
    block(g, rectL(0.389, -0.241, 0.411, -0.219), 0.389 * L, 0.411 * L, rgba(MID, 1), rgba(SHADE, 1), dir);
    Paint.circle(g, 0.41 * L, -0.232 * L, Math.max(0.004 * L, 0.9), rgba(COLD, 0.9));

    // aft boom
    Paint.line(g, [[-0.40 * L, -0.040 * L], [-0.58 * L, -0.075 * L]], rgba(SHADE, 1), w1(0.005) * L);
    Paint.circle(g, -0.585 * L, -0.076 * L, Math.max(0.004 * L, 0.9), rgba(RED, 0.6));

    // aft lower spar
    Paint.line(g, [[-0.40 * L, 0.040 * L], [-0.52 * L, 0.070 * L]], rgba(SHADE, 1), w1(0.004) * L);

    if (window.VoidshipArt && window.VoidshipArt.drawProw) window.VoidshipArt.drawProw(g, ship, L, t);

    // 7. Drive at the stern
    const flare = clamp(ship.flare || 0, 0, 1), strain = clamp(ship.strain || 0, 0, 1), tf = Math.min(1, th + 0.8 * flare);
    for (const cy of [-0.032, 0.008, 0.048]) {
      g.fillStyle = rgba(SHADE, 1);
      rectL(-0.455, cy - 0.013, -0.405, cy + 0.013)(); g.fill();
      g.fillStyle = rgba(DRIVE_A, 0.25 + 0.75 * tf);
      rectL(-0.452, cy - 0.006, -0.430, cy + 0.006)(); g.fill();
    }
    {
      const shim = 0.85 + 0.15 * Math.sin(t * 9);
      if (tf > 0.05) {
        const k = 1 + 1.1 * flare;
        Paint.poly(g, [[-0.462, -0.082], [-0.440, 0.008], [-0.462, 0.098], [-0.484, 0.008]]
          .map(([x, y]) => [-0.462 + (x + 0.462) * k, 0.008 + (y - 0.008) * k])
          .map(([x, y]) => [x * L, y * L]));
        g.fillStyle = rgba(DRIVE_B, 0.08 + 0.25 * tf);
        g.fill();
      }
      Paint.poly(g, [[-0.462, -0.058], [-0.448, 0.008], [-0.462, 0.074], [-0.476, 0.008]].map(([x, y]) => [x * L, y * L]));
      g.fillStyle = rgba(DRIVE_B, 0.10 + 0.45 * tf);
      g.fill();
      g.lineWidth = 1;
      g.strokeStyle = rgba(DRIVE_A, Math.min(1, (0.25 + 0.65 * th) * shim + 0.35 * strain));
      g.stroke();
    }

    // 8. Sustainers, RCS jets, bow strain
    const su = clamp(ship.sustain || 0, 0, 1);
    if (su > 0.02) for (const s of SUST) {
      Paint.circle(g, s.x * L, s.y * L, Math.max(0.016 * L, 2) * (0.6 + 0.4 * su), rgba(DRIVE_B, 0.35 * su));
      Paint.circle(g, s.x * L, s.y * L, Math.max(0.006 * L, 1), rgba(DRIVE_A, 0.9 * su));
    }
    const jet = ship.jet || 0, ja = Math.abs(jet);
    if (ja > 0.03) {
      const seats = jet < 0 ? JETS.belly : JETS.top, sgn = jet < 0 ? 1 : -1, hw = 0.012;
      for (const s of seats) {
        const fl = 0.85 + 0.15 * Math.sin(t * 37 + s.x * 40);
        const len = (0.05 + 0.10 * ja) * fl;
        Paint.poly(g, [[s.x - hw, s.y], [s.x + hw, s.y], [s.x, s.y + sgn * len]].map(([x, y]) => [x * L, y * L]));
        g.fillStyle = rgba(DRIVE_A, 0.55 * ja); g.fill();
        Paint.poly(g, [[s.x - hw * 0.5, s.y], [s.x + hw * 0.5, s.y], [s.x, s.y + sgn * len * 0.55]].map(([x, y]) => [x * L, y * L]));
        g.fillStyle = rgba(WHITE, 0.7 * ja); g.fill();
      }
    }
    if (strain > 0.02) {
      // the void pushing back on the prow: two flat chevrons ahead of the nose
      const fl = 0.8 + 0.2 * Math.sin(t * 41);
      g.lineWidth = 1;
      g.strokeStyle = rgba(DRIVE_A, 0.45 * strain * fl);
      g.beginPath(); g.moveTo(0.60 * L, -0.24 * L); g.lineTo(0.84 * L, 0); g.lineTo(0.60 * L, 0.24 * L); g.stroke();
      g.strokeStyle = rgba(WHITE, 0.22 * strain * fl);
      g.beginPath(); g.moveTo(0.66 * L, -0.19 * L); g.lineTo(0.88 * L, 0); g.lineTo(0.66 * L, 0.19 * L); g.stroke();
    }
  }

  function drawWindow(g, x, y, L, wpx, i, t) {
    const h1 = hash1(i * 7 + 1), h2 = hash1(i * 13 + 5), h3 = hash1(i * 29 + 9), h4 = hash1(i * 3 + 2);
    let on = h2 >= 0.18;
    if (h3 < 0.10) on = ((t * 0.4 + h4 * 7) % 1) < 0.55;
    if (!on) return;
    g.fillStyle = rgba(h1 < 0.7 ? LAMP : COLD, 0.85);
    g.fillRect(x * L - wpx / 2, y * L - wpx / 2, wpx, wpx);
  }

  function drawFront(g, ship, L, t, k) {
    if (k < 0.01) return;

    // pixel floors: nothing below 1px, whatever L shrinks to
    const P = 1 / L;
    const w1 = v => Math.max(v, P);
    const rectL = (x0, y0, x1, y1) => () => { g.beginPath(); g.rect(x0 * L, y0 * L, Math.max((x1 - x0) * L, 1), Math.max((y1 - y0) * L, 1)); };

    g.save();
    g.globalAlpha *= k;

    // hull cross-section, hexagonal prism
    {
      const pts = [[0, -0.070], [0.060, -0.040], [0.060, 0.050], [0, 0.088], [-0.060, 0.050], [-0.060, -0.040]];
      const trace = () => Paint.poly(g, pts.map(([x, y]) => [x * L, y * L]));
      Paint.litShade(g, trace, (-0.060 + 0.3 * 0.120) * L, rgba(LIT, 1), rgba(MID, 1));
    }

    // belly facet
    Paint.poly(g, [[0.060, 0.050], [0, 0.088], [-0.060, 0.050], [0, 0.062]].map(([x, y]) => [x * L, y * L]));
    g.fillStyle = rgba(SHADE, 1);
    g.fill();

    // deckhouse
    {
      const trace = rectL(-0.040, -0.084, 0.040, -0.070);
      Paint.litShade(g, trace, (-0.040 + 0.3 * 0.080) * L, rgba(LIT, 1), rgba(MID, 1));
    }

    // tower stack
    {
      const trace = rectL(-0.024, -0.205, 0.024, -0.070);
      Paint.litShade(g, trace, (-0.024 + 0.3 * 0.048) * L, rgba(LIT, 1), rgba(MID, 1));
    }
    {
      const trace = rectL(-0.014, -0.290, 0.014, -0.205);
      Paint.litShade(g, trace, (-0.014 + 0.3 * 0.028) * L, rgba(MID, 1), rgba(SHADE, 1));
    }
    // spire
    g.fillStyle = rgba(SHADE, 1);
    {
      const sw = w1(0.008);
      rectL(-sw / 2, -0.400, sw / 2, -0.290)(); g.fill();
    }
    {
      const on = ((t % 1.3) < 0.12);
      if (on) {
        Paint.circle(g, 0, -0.405 * L, Math.max(0.016 * L, 2), rgba(RED, 0.35));
        Paint.circle(g, 0, -0.405 * L, Math.max(0.007 * L, 0.9), rgba(RED, 1));
      }
    }

    // two side masts
    g.fillStyle = rgba(SHADE, 1);
    {
      const mw = w1(0.004);
      rectL(-0.040 - mw / 2, -0.180, -0.040 + mw / 2, -0.070)(); g.fill();
      rectL(0.040 - mw / 2, -0.180, 0.040 + mw / 2, -0.070)(); g.fill();
    }

    // hanging block
    {
      const trace = rectL(-0.030, 0.088, 0.030, 0.220);
      Paint.litShade(g, trace, (-0.030 + 0.3 * 0.060) * L, rgba(SHADE, 1), rgba(DEEP, 1));
    }

    // three windows
    g.fillStyle = rgba(LAMP, 0.85);
    for (const wx of [-0.030, 0, 0.030]) {
      g.fillRect(wx * L - 0.5, 0.010 * L - 0.5, 1, 1);
    }

    if (window.VoidshipArt && window.VoidshipArt.drawProwFront) window.VoidshipArt.drawProwFront(g, ship, L, t);

    g.restore();
  }

  function drawFumes(g, fumes, env) {
    for (const p of fumes) {
      const f = p.age / p.life;
      if (f >= 1 || f < 0) continue;
      const r = p.r0 + p.grow * p.age;
      const sx = p.x;
      if (sx < -r || sx > env.W + r) continue;
      const sy = p.kind === 3 ? p.y : p.y + Math.sin(p.age * (1.5 + p.seed * 2.5) + p.seed * 6.283) * (4 + 10 * p.seed) * Math.min(1, p.age * 2);
      if (p.kind === 0) {
        const col = f < 0.5 ? mixc(DRIVE_A, DRIVE_B, f * 2) : mixc(DRIVE_B, DRIVE_C, (f - 0.5) * 2);
        const a = Math.pow(1 - f, 1.6) * 0.55;
        Paint.circle(g, sx, sy, r, rgba(col, a * 0.45));
        Paint.circle(g, sx, sy, r * 0.45, rgba(mixc(col, WHITE, 0.35), a * 0.9));
      } else if (p.kind === 1) {
        const col = mixc(DRIVE_A, DRIVE_B, f);
        const a = Math.pow(1 - f, 1.2) * 0.7;
        g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.lineWidth = 1.5; g.strokeStyle = rgba(col, a); g.stroke();
      } else if (p.kind === 3) {
        const col = mixc(DRIVE_B, DRIVE_A, f);
        const len = p.r0 * (0.6 + 0.8 * (1 - f)), s = p.vx < 0 ? 1 : -1;
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - s * len, sy);
        g.lineWidth = 1.2; g.strokeStyle = rgba(col, (1 - f) * 0.85); g.stroke();
      } else {
        const col = mixc(WHITE, DRIVE_A, f);
        const a = (1 - f) * 0.8;
        g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.lineWidth = 2.5; g.strokeStyle = rgba(col, a); g.stroke();
      }
    }
  }

  function drawWake(g, ship, env) {
    // streamers: per-segment taper, newest segment brightest and widest
    const life = env.trailLife || 0.34;
    const rs = env.rs || 0.48;
    for (let i = 0; i < ship.trails.length; i++) {
      const pts = ship.trails[i]; const n = pts.length;
      if (!n) continue;
      const col = TRAIL_COL[i] || DRIVE_A;
      let px = ship.heads[i][0], py = ship.heads[i][1];
      for (let j = n - 1; j >= 0; j--) {
        const q = pts[j], k = (j + 1) / n, u = q.age / life;
        const a = q.a * Math.pow(1 - u, 1.8) * 0.7 * k;
        const qy = q.y + Math.sin(q.age * 16 + q.seed * 6.283) * 14 * rs * u;
        if (a >= 0.02) {
          g.lineWidth = Math.max(1, 2.4 * k);
          g.strokeStyle = rgba(col, a);
          g.beginPath(); g.moveTo(px, py); g.lineTo(q.x, qy); g.stroke();
        }
        px = q.x; py = qy;
      }
    }
    // sparks: two batched paths (white, drive-cyan), one stroke each
    const sp = ship.sparks, strain = clamp(ship.strain || 0, 0, 1);
    if (sp.length && strain > 0.02) {
      g.lineWidth = 1;
      for (let pass = 0; pass < 2; pass++) {
        g.beginPath();
        for (const p of sp) {
          if ((p.seed < 0.5) !== (pass === 0)) continue;
          const f = p.age / p.life, len = 5 + 16 * (1 - f), s = p.vx < 0 ? 1 : -1;
          g.moveTo(p.x, p.y); g.lineTo(p.x - s * len, p.y);
        }
        g.strokeStyle = pass === 0 ? rgba(WHITE, 0.7 * strain) : rgba(DRIVE_A, 0.5 * strain);
        g.stroke();
      }
    }
  }

  const COLORS = { LIT, MID, SHADE, DEEP, LAMP, COLD, RED, DRIVE_A, DRIVE_B, DRIVE_C };

  return { EMIT, SUST, JETS, TRAIL_SEATS, drawHull, drawFront, drawFumes, drawWake, COLORS, block };
})();
