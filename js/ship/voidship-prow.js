/* voidship-prow.js — the red prow: an artifact the ship was built around.
   Frame as voidship-art.js: +x nose, +y down, units of L. Light from the left.
   Three layers, called from voidship-art.js:
     drawProwBack  before the hull polygon (far claw, far leg, keel collar)
     drawProw      after the superstructure (conduits, mass, clamps, column, strings, claw, leg)
     drawProwFront the head-on view, last thing in drawFront
   Polish knobs: RUST_PALE alpha (flecks), the top facet strip in drawProw, STRINGS br/br2 (branches). */
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
  const MASS = [[0.30, -0.080], [0.50, -0.072], [0.62, -0.046], [0.72, -0.006], [0.70, 0.032], [0.60, 0.072], [0.44, 0.092], [0.30, 0.092]];
  const NOSE_PLATE = [[0.66, -0.030], [0.72, -0.006], [0.70, 0.032], [0.64, 0.056]];
  const NOSE_SHINE = [[0.66, -0.030], [0.672, -0.025], [0.652, 0.052], [0.64, 0.056]];
  const COL = [[0.44, -0.060], [0.452, -0.300], [0.512, -0.310], [0.53, -0.060]];          // the dark reflective column
  const COL_SHINE = [[0.452, -0.296], [0.462, -0.298], [0.452, -0.062], [0.443, -0.062]];
  const COL_BANDS = [[[0.455, -0.200], [0.515, -0.232], [0.515, -0.214], [0.455, -0.182]],
                     [[0.455, -0.125], [0.515, -0.157], [0.515, -0.147], [0.455, -0.115]]];
  const COL_CAP = [[0.448, -0.300], [0.516, -0.310], [0.512, -0.322], [0.452, -0.314]];
  // strings: root on the column edge, tip, optional branch [u, tx, ty] = from the point at fraction u of root→tip to (tx, ty)
  const STRINGS = [
    { root: [0.447, -0.270], tip: [0.350, -0.355], br: [0.5, 0.372, -0.290], br2: [0.8, 0.352, -0.330], lamp: true },
    { root: [0.447, -0.235], tip: [0.400, -0.290], br: null, br2: null, lamp: false },
    { root: [0.447, -0.160], tip: [0.395, -0.185], br: null, br2: null, lamp: false },
    { root: [0.449, -0.110], tip: [0.395, -0.120], br: [0.5, 0.412, -0.135], br2: [0.8, 0.408, -0.100], lamp: false },
    { root: [0.520, -0.280], tip: [0.600, -0.360], br: [0.5, 0.585, -0.300], br2: [0.75, 0.608, -0.318], lamp: true },
    { root: [0.522, -0.225], tip: [0.610, -0.240], br: [0.55, 0.580, -0.262], br2: [0.3, 0.560, -0.205], lamp: true },
    { root: [0.525, -0.165], tip: [0.590, -0.190], br: [0.5, 0.575, -0.155], br2: null, lamp: false },
    { root: [0.527, -0.115], tip: [0.575, -0.095], br: null, br2: null, lamp: false },
  ];
  // claw arm: upper arm, elbow, forearm, wrist, spike
  const UA = [[0.585, -0.062], [0.635, -0.030], [0.765, -0.140], [0.725, -0.182]];
  const ELBOW = [[0.712, -0.183], [0.758, -0.183], [0.758, -0.137], [0.712, -0.137]];
  const FA = [[0.725, -0.190], [0.760, -0.138], [0.940, -0.200], [0.930, -0.240]];
  const WRIST = [[0.918, -0.246], [0.952, -0.246], [0.952, -0.194], [0.918, -0.194]];
  const SPIKE = [[0.945, -0.250], [1.040, -0.206], [0.945, -0.192]];
  const SPIKE_SHINE = [[0.945, -0.250], [1.040, -0.206], [1.032, -0.204], [0.945, -0.238]];
  const UA_MARK = [[0.655, -0.075], [0.672, -0.062], [0.700, -0.086], [0.683, -0.099]];
  const CLAW_TIP = [1.040, -0.206];
  // leg
  const HIP = [0.485, 0.086, 0.565, 0.106];                 // x0 y0 x1 y1
  const THIGH = [[0.490, 0.104], [0.560, 0.104], [0.572, 0.195], [0.502, 0.195]];
  const KNEE = [0.498, 0.192, 0.576, 0.214];
  const SHIN = [[0.508, 0.212], [0.568, 0.212], [0.578, 0.300], [0.520, 0.300]];
  const FOOT = [[0.500, 0.298], [0.600, 0.298], [0.612, 0.318], [0.590, 0.336], [0.512, 0.336], [0.500, 0.318]];
  const TOE = [[0.605, 0.312], [0.680, 0.330], [0.600, 0.334]];
  const FOOT_LAMP = [0.550, 0.340];

  // --- drawProwBack: painted before the hull polygon --------------------
  function drawProwBack(g, ship, L, t) {
    const block = A.block;
    if (!block) return;
    g.save();
    const dir = ship.face >= 0 ? 1 : -1;

    // far claw (the other arm, behind)
    for (const pts of [shift(UA, 0.012, 0.048), shift(ELBOW, 0.012, 0.048), shift(FA, 0.012, 0.048), shift(WRIST, 0.012, 0.048), shift(SPIKE, 0.012, 0.048)]) {
      fillPoly(g, L, pts, rgba(RUST_DEEP, 1));
    }

    // far leg
    for (const pts of [shift(THIGH, 0.014, 0.012), shift(SHIN, 0.014, 0.012), shift(FOOT, 0.014, 0.012)]) {
      fillPoly(g, L, pts, rgba(RUST_DEEP, 1));
    }
    const kn = [KNEE[0] + 0.014, KNEE[1] + 0.012, KNEE[2] + 0.014, KNEE[3] + 0.012];
    rectL(g, L, kn[0], kn[1], kn[2], kn[3])();
    g.fillStyle = rgba(RUST_DEEP, 1);
    g.fill();

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

    // 3. Mass panels
    fillPoly(g, L, [[0.33, -0.062], [0.42, -0.066], [0.42, 0.078], [0.33, 0.078]], rgba(RUST_MID, 1));
    fillPoly(g, L, [[0.54, -0.058], [0.63, -0.040], [0.63, 0.060], [0.54, 0.070]], rgba(RUST_DEEP, 0.55));
    // top facet catches the light
    fillPoly(g, L, [[0.42, -0.072], [0.62, -0.046], [0.62, -0.032], [0.42, -0.058]], rgba(RUST_LIT, 0.55));

    // 4. Oxide flecks
    for (const [x0, y0, x1, y1] of [[0.36, -0.03, 0.39, -0.02], [0.47, 0.03, 0.52, 0.045], [0.64, -0.02, 0.66, 0.01], [0.40, 0.06, 0.43, 0.07]]) {
      rectL(g, L, x0, y0, x1, y1)(); g.fillStyle = rgba(RUST_PALE, 0.5); g.fill();
    }

    // 5. Panel seams
    for (const [x0, y0, x1, y1] of [[0.425, -0.075, 0.429, 0.088], [0.535, -0.064, 0.539, 0.078], [0.635, -0.040, 0.639, 0.058]]) {
      rectL(g, L, x0, y0, x1, y1)(); g.fillStyle = rgba(RUST_DEEP, 0.7); g.fill();
    }

    // 6. Ember seams (power leaking between plates) — halos first, under them
    rectL(g, L, 0.470, -0.032, 0.490, 0.052)(); g.fillStyle = rgba(C.RED, 0.12 * (0.5 + pulse)); g.fill();
    rectL(g, L, 0.55, -0.004, 0.64, 0.018)(); g.fillStyle = rgba(C.RED, 0.12 * (0.5 + pulse)); g.fill();
    rectL(g, L, 0.478, -0.025, 0.482, 0.045)(); g.fillStyle = rgba(C.RED, ember); g.fill();
    rectL(g, L, 0.55, 0.005, 0.64, 0.009)(); g.fillStyle = rgba(C.RED, ember); g.fill();

    // 7. Nose plate
    fillPoly(g, L, NOSE_PLATE, rgba(OBS_DARK, 1));
    fillPoly(g, L, NOSE_SHINE, rgba(OBS_SHINE, 1));

    // 8. Clamps (the grey hull gripping the artifact)
    blockRect(g, L, 0.305, -0.090, 0.345, 0.100, C.LIT, C.MID, dir);
    blockRect(g, L, 0.385, -0.086, 0.415, 0.098, C.LIT, C.MID, dir);
    for (const [x, y] of [[0.325, -0.084], [0.325, 0.094], [0.40, -0.080], [0.40, 0.092]]) {
      dot(g, L, x, y, 0.006, rgba(C.DEEP, 1));
    }

    // 9. Column (the dark, almost reflective part)
    blockPoly(g, L, COL, OBS_MID, OBS_DARK, dir);
    fillPoly(g, L, COL_SHINE, rgba(OBS_SHINE, 1));
    lineL(g, L, 0.463, -0.290, 0.455, -0.070, rgba(OBS_GLINT, 0.75), 0.004);
    for (const band of COL_BANDS) fillPoly(g, L, band, rgba(OBS_SHINE, 0.35));
    fillPoly(g, L, COL_CAP, rgba(RUST_DEEP, 1));
    dot(g, L, 0.482, -0.328, 0.010, rgba(C.RED, 0.10 + 0.15 * pulse));
    dot(g, L, 0.482, -0.328, 0.005, rgba(C.RED, 0.4 + 0.4 * pulse));

    // 10. Strings (tendrils protruding from the column)
    for (let i = 0; i < STRINGS.length; i++) {
      const s = STRINGS[i];
      const dy = 0.006 * sway * Math.sin(t * 0.8 + i * 1.3);
      const tip = [s.tip[0], s.tip[1] + dy];
      lineL(g, L, s.root[0], s.root[1], tip[0], tip[1], rgba(RUST_MID, 0.95), 0.004);
      if (s.br) {
        const [u, tx, ty] = s.br;
        const bx = s.root[0] + u * (tip[0] - s.root[0]);
        const by = s.root[1] + u * (tip[1] - s.root[1]);
        lineL(g, L, bx, by, tx, ty + dy, rgba(RUST_MID, 0.95), 0.004);
      }
      if (s.br2) {
        const [u, tx, ty] = s.br2;
        const bx = s.root[0] + u * (tip[0] - s.root[0]);
        const by = s.root[1] + u * (tip[1] - s.root[1]);
        lineL(g, L, bx, by, tx, ty + dy, rgba(RUST_MID, 0.95), 0.004);
      }
      if (s.lamp) {
        dot(g, L, tip[0], tip[1], 0.010, rgba(C.RED, 0.10 + 0.15 * pulse));
        dot(g, L, tip[0], tip[1], 0.005, rgba(C.RED, 0.25 + 0.45 * pulse));
      }
    }

    // 11. Claw arm (near)
    blockPoly(g, L, UA, RUST_LIT, RUST_SHADE, dir);
    fillPoly(g, L, UA_MARK, rgba(C.LIT, 0.55));
    fillPoly(g, L, ELBOW, rgba(RUST_DEEP, 1));
    dot(g, L, 0.735, -0.160, 0.008, rgba(C.COLD, 1));
    blockPoly(g, L, FA, RUST_LIT, RUST_SHADE, dir);
    fillPoly(g, L, WRIST, rgba(RUST_DEEP, 1));
    dot(g, L, 0.935, -0.220, 0.007, rgba(C.COLD, 1));
    fillPoly(g, L, SPIKE, rgba(OBS_DARK, 1));
    fillPoly(g, L, SPIKE_SHINE, rgba(OBS_SHINE, 1));
    dot(g, L, CLAW_TIP[0], CLAW_TIP[1], 0.018, rgba(C.LAMP, 0.10 + 0.15 * pulse));
    dot(g, L, CLAW_TIP[0], CLAW_TIP[1], 0.006, rgba(C.LAMP, 0.9));

    // 12. Leg (near)
    rectL(g, L, HIP[0], HIP[1], HIP[2], HIP[3])(); g.fillStyle = rgba(RUST_DEEP, 1); g.fill();
    blockPoly(g, L, THIGH, RUST_LIT, RUST_SHADE, dir);
    rectL(g, L, 0.512, 0.125, 0.522, 0.175)(); g.fillStyle = rgba(C.LIT, 0.5); g.fill();
    rectL(g, L, 0.540, 0.118, 0.556, 0.126)(); g.fillStyle = rgba(C.LAMP, 0.7); g.fill();
    rectL(g, L, KNEE[0], KNEE[1], KNEE[2], KNEE[3])(); g.fillStyle = rgba(RUST_DEEP, 1); g.fill();
    dot(g, L, 0.537, 0.203, 0.007, rgba(C.COLD, 1));
    blockPoly(g, L, SHIN, RUST_LIT, RUST_SHADE, dir);
    lineL(g, L, 0.552, 0.214, 0.560, 0.298, rgba(C.COLD, 0.8), 0.004);
    blockPoly(g, L, FOOT, RUST_MID, RUST_SHADE, dir);
    fillPoly(g, L, TOE, rgba(OBS_DARK, 1));
    dot(g, L, FOOT_LAMP[0], FOOT_LAMP[1], 0.014, rgba(C.DRIVE_A, 0.10 + 0.20 * pulse));
    dot(g, L, FOOT_LAMP[0], FOOT_LAMP[1], 0.005, rgba(C.DRIVE_A, 0.9));

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

    // 1. Artifact face, an octagon
    blockPoly(g, L, [[-0.030, -0.052], [0.030, -0.052], [0.048, -0.020], [0.048, 0.040], [0.030, 0.072], [-0.030, 0.072], [-0.048, 0.040], [-0.048, -0.020]], RUST_LIT, RUST_SHADE, dir);

    // 2. Inner diamond
    fillPoly(g, L, [[0, -0.030], [0.024, 0.010], [0, 0.050], [-0.024, 0.010]], rgba(OBS_DARK, 1));
    lineL(g, L, -0.006, -0.020, -0.006, 0.030, rgba(OBS_GLINT, 0.7), 0.004);
    dot(g, L, 0, 0.010, 0.016, rgba(C.RED, 0.12 * (0.5 + pulse)));
    dot(g, L, 0, 0.010, 0.008, rgba(C.RED, ember));

    // 3. Two claw arms, mirrored
    for (const s of [-1, 1]) {
      const mir = pts => pts.map(([x, y]) => [x * s, y]);
      blockPoly(g, L, mir([[0.040, -0.030], [0.056, -0.020], [0.120, -0.150], [0.104, -0.160]]), RUST_LIT, RUST_SHADE, dir);
      const ex0 = Math.min(0.100 * s, 0.126 * s), ex1 = Math.max(0.100 * s, 0.126 * s);
      rectL(g, L, ex0, -0.168, ex1, -0.142)(); g.fillStyle = rgba(RUST_DEEP, 1); g.fill();
      blockPoly(g, L, mir([[0.104, -0.160], [0.122, -0.150], [0.110, -0.250], [0.094, -0.246]]), RUST_LIT, RUST_SHADE, dir);
      fillPoly(g, L, mir([[0.094, -0.246], [0.110, -0.250], [0.086, -0.300]]), rgba(OBS_DARK, 1));
      dot(g, L, 0.086 * s, -0.300, 0.014, rgba(C.LAMP, 0.10 + 0.15 * pulse));
      dot(g, L, 0.086 * s, -0.300, 0.005, rgba(C.LAMP, 0.9));
    }

    // 4. Column
    blockRect(g, L, -0.018, -0.310, 0.018, -0.050, OBS_MID, OBS_DARK, dir);
    lineL(g, L, -0.012, -0.300, -0.012, -0.060, rgba(OBS_GLINT, 0.6), 0.004);
    rectL(g, L, -0.022, -0.322, 0.022, -0.310)(); g.fillStyle = rgba(RUST_DEEP, 1); g.fill();
    dot(g, L, 0, -0.328, 0.005, rgba(C.RED, 0.4 + 0.4 * pulse));

    // 5. Strings, mirrored
    for (const s of [-1, 1]) {
      lineL(g, L, 0.018 * s, -0.260, 0.060 * s, -0.300, rgba(RUST_MID, 0.95), 0.004);
      lineL(g, L, 0.018 * s, -0.200, 0.055 * s, -0.210, rgba(RUST_MID, 0.95), 0.004);
      lineL(g, L, 0.018 * s, -0.140, 0.050 * s, -0.110, rgba(RUST_MID, 0.95), 0.004);
    }

    // 6. Leg
    rectL(g, L, -0.030, 0.190, 0.030, 0.215)(); g.fillStyle = rgba(RUST_DEEP, 1); g.fill();
    blockRect(g, L, -0.024, 0.200, 0.024, 0.310, RUST_LIT, RUST_SHADE, dir);
    blockRect(g, L, -0.045, 0.300, 0.045, 0.335, RUST_MID, RUST_SHADE, dir);
    dot(g, L, 0, 0.345, 0.014, rgba(C.DRIVE_A, 0.10 + 0.20 * pulse));
    dot(g, L, 0, 0.345, 0.005, rgba(C.DRIVE_A, 0.9));

    g.restore();
  }

  A.drawProwBack = drawProwBack; A.drawProw = drawProw; A.drawProwFront = drawProwFront;
  A.PROW = { MASS, COL, UA, FA, STRINGS };  // for debugging in the console
})();
