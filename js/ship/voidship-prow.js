/* voidship-prow.js — the red prow: an artifact the ship was built around.
   Frame as voidship-art.js: +x nose, +y down, units of L. Light from the left.
   Three layers, called from voidship-art.js:
     drawProwBack  before the hull polygon (nothing behind the block any more)
     drawProw      after the superstructure (strips, fat block, nose, bars, barbs, leg)
     drawProwFront the head-on view, last thing in drawFront
   One sturdy fat structure: a rectangular block fed by two straight conduits, a dark
   vertical bar and a red bar swept up and forward, straight barbs off the rear bar,
   and one short straight leg below. Everything is a straight-edged rectangular bar —
   no triangles, no tapering points.
   Polish knobs: RUST_PALE alpha (flecks), the top facet strip in drawProw, BARBS sway. */
(function () {
  const A = window.VoidshipArt;
  if (!A) return;
  const { clamp } = window.Util;
  const Paint = window.Paint;
  const C = A.COLORS;                       // LIT MID SHADE DEEP LAMP COLD RED DRIVE_A
  const RUST_LIT = [176, 62, 46], RUST_MID = [138, 44, 34], RUST_SHADE = [92, 28, 24], RUST_DEEP = [56, 16, 16];
  const RUST_PALE = [196, 110, 64];          // oxide flecks
  const OBS_DARK = [46, 10, 14], OBS_MID = [110, 24, 32], OBS_SHINE = [214, 66, 62], OBS_GLINT = [255, 178, 166];
  function rgba(c, a) { return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

  // --- helpers ---------------------------------------------------------
  function pt(L, p) { return [p[0] * L, p[1] * L]; }

  function polyL(g, L, pts) {
    return () => Paint.poly(g, pts.map(p => pt(L, p)));
  }

  function rectL(g, L, x0, y0, x1, y1) {
    return () => { g.beginPath(); g.rect(x0 * L, y0 * L, Math.max((x1 - x0) * L, 1), Math.max((y1 - y0) * L, 1)); };
  }

  function fillPoly(g, L, pts, rgbaStr) {
    Paint.poly(g, pts.map(p => pt(L, p)));
    g.fillStyle = rgbaStr;
    g.fill();
  }

  function blockPoly(g, L, pts, lit, shade, dir) {
    let minX = Infinity, maxX = -Infinity;
    for (const p of pts) { if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0]; }
    A.block(g, polyL(g, L, pts), minX * L, maxX * L, rgba(lit, 1), rgba(shade, 1), dir);
  }

  function blockRect(g, L, x0, y0, x1, y1, lit, shade, dir) {
    A.block(g, rectL(g, L, x0, y0, x1, y1), x0 * L, x1 * L, rgba(lit, 1), rgba(shade, 1), dir);
  }

  function lineL(g, L, x0, y0, x1, y1, rgbaStr, w) {
    g.beginPath();
    g.moveTo(x0 * L, y0 * L);
    g.lineTo(x1 * L, y1 * L);
    g.strokeStyle = rgbaStr;
    g.lineWidth = Math.max(w * L, 1);
    g.lineCap = 'butt';
    g.stroke();
  }

  function dot(g, L, x, y, r, rgbaStr) {
    Paint.circle(g, x * L, y * L, Math.max(r * L, 0.6), rgbaStr);
  }

  function shift(pts, dx, dy) {
    return pts.map(p => [p[0] + dx, p[1] + dy]);
  }

  // fat rectangular bar: local rect [0,len]x[-w/2,w/2] with the far end cut at a
  // slant, rotated by deg (y is down: straight up is deg=-90) and placed at (rx,ry).
  function bar(rx, ry, deg, len, w, cut) {
    const rad = deg * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const local = [[0, -w / 2], [len, -w / 2], [len - cut, w / 2], [0, w / 2]];
    return local.map(([u, v]) => [rx + u * cos - v * sin, ry + u * sin + v * cos]);
  }

  // --- geometry tables (units of L) -------------------------------------
  const MASS = [[0.30, -0.135], [0.80, -0.135], [0.80, 0.055], [0.745, 0.105], [0.30, 0.105]];   // one fat block, front-bottom corner cut
  const MASS_SEAM = [0.30, -0.135, 0.33, 0.105];                       // dark strip where the hull enters the block (x0 y0 x1 y1)
  const NOSE = [0.765, -0.135, 0.80, 0.055];                           // dark face plate at the front
  const STRIPS = [[0.06, -0.032, 0.31, -0.006], [0.06, 0.020, 0.31, 0.046]];   // the two fat conduits feeding the block
  const BAR_DEFS = [
    [0.555, -0.09, -90, 0.345, 0.095, 0.05],   // rear: straight up
    [0.695, -0.10, -50, 0.36, 0.095, 0.05],    // front: up and forward
  ];
  const BARS = [bar(0.555, -0.09, -90, 0.345, 0.095, 0.05), bar(0.695, -0.10, -50, 0.36, 0.095, 0.05)];   // rear: straight up; front: up and forward
  const BAR_TIPS = [[0.555, -0.435], [0.695 + 0.335 * Math.cos(-50 * Math.PI / 180), -0.10 + 0.335 * Math.sin(-50 * Math.PI / 180)]];
  const LEG = [[0.46, 0.105], [0.55, 0.105], [0.55, 0.37], [0.46, 0.335]];                      // straight fat bar down, slanted foot
  const LEG_TIP = [0.505, 0.375];
  // short straight barbs off the rear bar's back edge: [x0, y0, x1, y1, lamp]
  const BARBS = [[0.508, -0.20, 0.455, -0.225, false], [0.508, -0.27, 0.45, -0.31, true], [0.508, -0.34, 0.46, -0.385, false], [0.53, -0.435, 0.50, -0.49, true]];

  // --- drawProwBack: painted before the hull polygon --------------------
  function drawProwBack(g, ship, L, t) {
    const block = A.block;
    if (!block) return;
    g.save();
    const dir = ship.face >= 0 ? 1 : -1;

    // nothing behind the block any more

    g.restore();
  }

  // --- drawProw: painted after the superstructure ------------------------
  function drawProw(g, ship, L, t) {
    const block = A.block;
    if (!block) return;
    g.save();
    const dir = ship.face >= 0 ? 1 : -1;
    const reduced = Util.reduced();
    const pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.7);      // the artifact's power breathing
    const strain = ship.strain || 0;
    const ember = clamp(0.30 + 0.35 * pulse + 0.30 * strain, 0, 1);   // glow strength of the seams
    const sway = reduced ? 0 : 1;

    // 1. Strips (the artifact's veins running back into the hull)
    for (const [x0, y0, x1, y1] of STRIPS) {
      blockRect(g, L, x0, y0, x1, y1, RUST_MID, RUST_SHADE, dir);
      for (const x of [0.12, 0.20, 0.27]) {
        rectL(g, L, x - 0.005, y0 - 0.006, x + 0.005, y1 + 0.006)(); g.fillStyle = rgba(C.DEEP, 0.7); g.fill();
      }
    }

    // 2. Bars (rear first, then front) — painted before the mass so the block covers the bar bases
    for (let i = 0; i < BARS.length; i++) {
      const [rx, ry, deg, len, w, cut] = BAR_DEFS[i];
      if (i === 0) blockPoly(g, L, BARS[i], OBS_MID, OBS_DARK, dir);
      else blockPoly(g, L, BARS[i], RUST_LIT, RUST_SHADE, dir);

      const edge = bar(rx, ry, deg, len - cut, 0.095, 0);
      const [p0, p1] = edge;
      lineL(g, L, p0[0], p0[1], p1[0], p1[1], rgba(OBS_SHINE, 1), 0.012);

      const rad = deg * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
      const c45 = [rx + 0.45 * len * cos, ry + 0.45 * len * sin];
      const c55 = [rx + 0.55 * len * cos, ry + 0.55 * len * sin];
      lineL(g, L, c45[0], c45[1], c55[0], c55[1], rgba(C.LIT, 0.55), 0.03);

      const tip = BAR_TIPS[i];
      dot(g, L, tip[0], tip[1], 0.018, rgba(C.LAMP, 0.10 + 0.15 * pulse));
      dot(g, L, tip[0], tip[1], 0.006, rgba(C.LAMP, 0.9));
    }

    // 3. Mass
    blockPoly(g, L, MASS, RUST_LIT, RUST_SHADE, dir);

    // 4. Top facet catches the light
    fillPoly(g, L, [[0.33, -0.135], [0.80, -0.135], [0.80, -0.115], [0.33, -0.115]], rgba(RUST_LIT, 0.55));

    // 5. Seam, panel seams + oxide flecks
    rectL(g, L, MASS_SEAM[0], MASS_SEAM[1], MASS_SEAM[2], MASS_SEAM[3])(); g.fillStyle = rgba(RUST_DEEP, 0.85); g.fill();
    for (const [x0, y0, x1, y1] of [[0.46, -0.125, 0.464, 0.10], [0.66, -0.125, 0.664, 0.10]]) {
      rectL(g, L, x0, y0, x1, y1)(); g.fillStyle = rgba(RUST_DEEP, 0.7); g.fill();
    }
    for (const [x0, y0, x1, y1] of [[0.37, 0.04, 0.41, 0.06], [0.60, -0.09, 0.63, -0.075]]) {
      rectL(g, L, x0, y0, x1, y1)(); g.fillStyle = rgba(RUST_PALE, 0.5); g.fill();
    }

    // 6. Ember seam (power leaking between plates)
    rectL(g, L, 0.34, -0.022, 0.75, 0.002)(); g.fillStyle = rgba(C.RED, 0.12 * (0.5 + pulse)); g.fill();
    rectL(g, L, 0.34, -0.013, 0.75, -0.007)(); g.fillStyle = rgba(C.RED, ember); g.fill();

    // 7. Nose
    rectL(g, L, NOSE[0], NOSE[1], NOSE[2], NOSE[3])(); g.fillStyle = rgba(OBS_DARK, 1); g.fill();
    rectL(g, L, 0.765, -0.135, 0.772, 0.055)(); g.fillStyle = rgba(OBS_SHINE, 1); g.fill();

    // 8. Barbs off the rear bar's back edge
    for (let i = 0; i < BARBS.length; i++) {
      const [x0, y0, x1, y1, lamp] = BARBS[i];
      const dy = 0.005 * sway * Math.sin(t * 0.8 + i * 1.3);
      lineL(g, L, x0, y0, x1, y1 + dy, rgba(RUST_MID, 0.95), 0.004);
      if (lamp) {
        dot(g, L, x1, y1 + dy, 0.010, rgba(C.RED, 0.10 + 0.15 * pulse));
        dot(g, L, x1, y1 + dy, 0.005, rgba(C.RED, 0.25 + 0.45 * pulse));
      }
    }

    // 9. Leg
    blockPoly(g, L, LEG, RUST_LIT, RUST_SHADE, dir);
    rectL(g, L, 0.535, 0.105, 0.55, 0.365)(); g.fillStyle = rgba(OBS_DARK, 1); g.fill();
    rectL(g, L, 0.48, 0.16, 0.49, 0.24)(); g.fillStyle = rgba(C.LIT, 0.55); g.fill();
    dot(g, L, LEG_TIP[0], LEG_TIP[1], 0.014, rgba(C.DRIVE_A, 0.10 + 0.20 * pulse));
    dot(g, L, LEG_TIP[0], LEG_TIP[1], 0.005, rgba(C.DRIVE_A, 0.9));

    g.restore();
  }

  // --- drawProwFront: the head-on view (translate+rotate only, x screen-right, ±x symmetric) --
  function drawProwFront(g, ship, L, t) {
    const block = A.block;
    if (!block) return;
    g.save();
    const reduced = Util.reduced();
    const pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.7);
    const strain = ship.strain || 0;
    const ember = clamp(0.30 + 0.35 * pulse + 0.30 * strain, 0, 1);
    const dir = 1;

    // 1. Face
    blockRect(g, L, -0.062, -0.135, 0.062, 0.105, RUST_LIT, RUST_SHADE, 1);
    fillPoly(g, L, [[-0.03, -0.06], [0.03, -0.06], [0.03, 0.05], [-0.03, 0.05]], rgba(OBS_DARK, 1));
    dot(g, L, 0, -0.005, 0.016, rgba(C.RED, 0.12 * (0.5 + pulse)));
    dot(g, L, 0, -0.005, 0.007, rgba(C.RED, ember));

    // 2. Two bars side by side
    blockRect(g, L, -0.052, -0.435, -0.012, -0.135, OBS_MID, OBS_DARK, 1);
    blockRect(g, L, 0.012, -0.435, 0.052, -0.135, RUST_LIT, RUST_SHADE, 1);
    dot(g, L, -0.032, -0.44, 0.014, rgba(C.LAMP, 0.10 + 0.15 * pulse));
    dot(g, L, -0.032, -0.44, 0.005, rgba(C.LAMP, 0.9));
    dot(g, L, 0.032, -0.44, 0.014, rgba(C.LAMP, 0.10 + 0.15 * pulse));
    dot(g, L, 0.032, -0.44, 0.005, rgba(C.LAMP, 0.9));

    // 3. Leg
    blockRect(g, L, -0.045, 0.105, 0.045, 0.37, RUST_LIT, RUST_SHADE, 1);
    dot(g, L, 0, 0.378, 0.014, rgba(C.DRIVE_A, 0.10 + 0.20 * pulse));
    dot(g, L, 0, 0.378, 0.005, rgba(C.DRIVE_A, 0.9));

    g.restore();
  }

  A.drawProwBack = drawProwBack; A.drawProw = drawProw; A.drawProwFront = drawProwFront;
  A.PROW = { MASS, BARS, LEG, BARBS };  // for debugging in the console
})();
