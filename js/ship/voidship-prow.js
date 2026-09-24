/* voidship-prow.js — the red prow: an artifact the ship was built around.
   Frame as voidship-art.js: +x nose, +y down, units of L. Light from the left.
   Three layers, called from voidship-art.js:
     drawProwBack  before the hull polygon (keel collar)
     drawProw      after the superstructure (conduits, wedge mass, nose, clamps, blades, barbs, dagger)
     drawProwFront the head-on view, last thing in drawFront
   One sturdy sharp structure: a flat-topped wedge with a pointed nose, two identical
   blades sweeping up and forward from its top, and one short straight dagger below.
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

  // --- geometry tables (units of L) -------------------------------------
  const MASS = [[0.30, -0.078], [0.66, -0.078], [0.84, 0.0], [0.66, 0.088], [0.30, 0.088]];   // flat top and bottom, pointed nose
  const NOSE = [[0.62, -0.060], [0.84, 0.0], [0.62, 0.070]];                                    // dark chisel tip
  const NOSE_EDGE = [[0.62, -0.060], [0.84, 0.0], [0.63, -0.044]];                              // shine along the upper edge of the tip
  // two identical blades, rooted on the flat top, sweeping up and forward to a point
  const BLADE = [[0.0, 0.0], [0.075, 0.0], [0.32, -0.322], [0.26, -0.262]];                     // local shape, root at y 0
  const BLADE_ROOTS = [[0.42, -0.078], [0.58, -0.078]];                                         // rear, front
  const BLADE_SPINE = [[0.0, 0.0], [0.014, 0.0], [0.27, -0.272], [0.26, -0.262]];               // dark strip along the back edge
  const BLADE_EDGE = [[0.075, 0.0], [0.084, 0.0], [0.32, -0.322], [0.312, -0.322]];             // bright strip along the front edge
  const BLADE_TIP = [0.32, -0.322];
  const BLADES = BLADE_ROOTS.map(([x, y]) => BLADE.map(([bx, by]) => [x + bx, y + by]));
  // straight barbs off the rear blade's back edge (like the antenna spikes on the reference ship): [x0, y0, x1, y1, lamp]
  const BARBS = [[0.455, -0.045, 0.400, -0.080, false], [0.505, -0.110, 0.445, -0.150, true], [0.555, -0.175, 0.500, -0.215, false], [0.605, -0.240, 0.555, -0.290, true], [0.655, -0.305, 0.620, -0.355, false]];
  // short straight dagger under the mass
  const DAGGER = [[0.490, 0.088], [0.590, 0.088], [0.540, 0.290]];
  const DAGGER_SPINE = [[0.540, 0.088], [0.560, 0.088], [0.540, 0.290]];
  const DAGGER_LAMP = [0.540, 0.300];

  // --- drawProwBack: painted before the hull polygon --------------------
  function drawProwBack(g, ship, L, t) {
    const block = A.block;
    if (!block) return;
    g.save();
    const dir = ship.face >= 0 ? 1 : -1;

    // keel collar (grey mount under the artifact)
    blockRect(g, L, 0.30, 0.088, 0.42, 0.116, C.SHADE, C.DEEP, dir);

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

    // 1. Conduits (the artifact's veins running back into the hull)
    blockRect(g, L, 0.08, -0.014, 0.34, -0.006, RUST_MID, RUST_SHADE, dir);
    blockRect(g, L, 0.08, 0.006, 0.34, 0.014, RUST_MID, RUST_SHADE, dir);
    for (const x of [0.14, 0.22, 0.30]) {
      rectL(g, L, x - 0.004, -0.018, x + 0.004, -0.002)(); g.fillStyle = rgba(C.DEEP, 0.7); g.fill();
      rectL(g, L, x - 0.004, 0.002, x + 0.004, 0.018)(); g.fillStyle = rgba(C.DEEP, 0.7); g.fill();
    }

    // 2. Mass
    blockPoly(g, L, MASS, RUST_LIT, RUST_SHADE, dir);

    // 3. Top facet catches the light
    fillPoly(g, L, [[0.36, -0.078], [0.66, -0.078], [0.66, -0.064], [0.36, -0.064]], rgba(RUST_LIT, 0.55));

    // 4. Panel seams + oxide flecks
    for (const [x0, y0, x1, y1] of [[0.50, -0.070, 0.504, 0.082], [0.60, -0.070, 0.604, 0.082]]) {
      rectL(g, L, x0, y0, x1, y1)(); g.fillStyle = rgba(RUST_DEEP, 0.7); g.fill();
    }
    for (const [x0, y0, x1, y1] of [[0.37, 0.03, 0.40, 0.045], [0.54, -0.04, 0.57, -0.03]]) {
      rectL(g, L, x0, y0, x1, y1)(); g.fillStyle = rgba(RUST_PALE, 0.5); g.fill();
    }

    // 5. Ember seam along the centreline (power leaking between plates)
    rectL(g, L, 0.36, -0.010, 0.62, 0.014)(); g.fillStyle = rgba(C.RED, 0.12 * (0.5 + pulse)); g.fill();
    rectL(g, L, 0.36, -0.002, 0.62, 0.004)(); g.fillStyle = rgba(C.RED, ember); g.fill();

    // 6. Nose tip
    fillPoly(g, L, NOSE, rgba(OBS_DARK, 1));
    fillPoly(g, L, NOSE_EDGE, rgba(OBS_SHINE, 1));

    // 7. Clamps (the grey hull gripping the artifact)
    blockRect(g, L, 0.305, -0.090, 0.345, 0.100, C.LIT, C.MID, dir);
    blockRect(g, L, 0.385, -0.086, 0.415, 0.098, C.LIT, C.MID, dir);
    for (const [x, y] of [[0.325, -0.084], [0.325, 0.094], [0.40, -0.080], [0.40, 0.092]]) {
      dot(g, L, x, y, 0.006, rgba(C.DEEP, 1));
    }

    // 8. Blades (rear first, then front)
    for (let i = 0; i < BLADE_ROOTS.length; i++) {
      const [rx, ry] = BLADE_ROOTS[i];
      const at = pts => pts.map(([x, y]) => [rx + x, ry + y]);
      blockPoly(g, L, at(BLADE), RUST_LIT, RUST_SHADE, dir);
      fillPoly(g, L, at(BLADE_SPINE), rgba(OBS_DARK, 1));
      fillPoly(g, L, at(BLADE_EDGE), rgba(OBS_SHINE, 1));
      fillPoly(g, L, at([[0.10, -0.06], [0.125, -0.06], [0.16, -0.10], [0.135, -0.10]]), rgba(C.LIT, 0.55));
      const tip = at([BLADE_TIP])[0];
      dot(g, L, tip[0], tip[1], 0.018, rgba(C.LAMP, 0.10 + 0.15 * pulse));
      dot(g, L, tip[0], tip[1], 0.006, rgba(C.LAMP, 0.9));
    }

    // 9. Barbs off the rear blade's back edge
    for (let i = 0; i < BARBS.length; i++) {
      const [x0, y0, x1, y1, lamp] = BARBS[i];
      const dy = 0.005 * sway * Math.sin(t * 0.8 + i * 1.3);
      lineL(g, L, x0, y0, x1, y1 + dy, rgba(RUST_MID, 0.95), 0.004);
      if (lamp) {
        dot(g, L, x1, y1 + dy, 0.010, rgba(C.RED, 0.10 + 0.15 * pulse));
        dot(g, L, x1, y1 + dy, 0.005, rgba(C.RED, 0.25 + 0.45 * pulse));
      }
    }

    // 10. Dagger
    blockPoly(g, L, DAGGER, RUST_LIT, RUST_SHADE, dir);
    fillPoly(g, L, DAGGER_SPINE, rgba(OBS_DARK, 1));
    dot(g, L, DAGGER_LAMP[0], DAGGER_LAMP[1], 0.014, rgba(C.DRIVE_A, 0.10 + 0.20 * pulse));
    dot(g, L, DAGGER_LAMP[0], DAGGER_LAMP[1], 0.005, rgba(C.DRIVE_A, 0.9));

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

    // 1. Face, a sharp hexagon
    blockPoly(g, L, [[0, -0.062], [0.050, -0.020], [0.050, 0.040], [0, 0.082], [-0.050, 0.040], [-0.050, -0.020]], RUST_LIT, RUST_SHADE, 1);
    fillPoly(g, L, [[0, -0.030], [0.022, 0.010], [0, 0.050], [-0.022, 0.010]], rgba(OBS_DARK, 1));
    dot(g, L, 0, 0.010, 0.016, rgba(C.RED, 0.12 * (0.5 + pulse)));
    dot(g, L, 0, 0.010, 0.007, rgba(C.RED, ember));

    // 2. Two blades seen edge-on, side by side
    for (const s of [-1, 1]) {
      blockPoly(g, L, [[0.012 * s, -0.060], [0.040 * s, -0.060], [0.030 * s, -0.400], [0.018 * s, -0.400]], RUST_LIT, RUST_SHADE, 1);
      dot(g, L, 0.024 * s, -0.405, 0.014, rgba(C.LAMP, 0.10 + 0.15 * pulse));
      dot(g, L, 0.024 * s, -0.405, 0.005, rgba(C.LAMP, 0.9));
    }

    // 3. Dagger
    blockPoly(g, L, [[-0.030, 0.088], [0.030, 0.088], [0, 0.290]], RUST_LIT, RUST_SHADE, 1);
    dot(g, L, 0, 0.300, 0.014, rgba(C.DRIVE_A, 0.10 + 0.20 * pulse));
    dot(g, L, 0, 0.300, 0.005, rgba(C.DRIVE_A, 0.9));

    g.restore();
  }

  A.drawProwBack = drawProwBack; A.drawProw = drawProw; A.drawProwFront = drawProwFront;
  A.PROW = { MASS, BLADES, DAGGER, BARBS };  // for debugging in the console
})();
