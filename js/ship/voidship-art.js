/* voidship-art.js — paints the player's craft: a long dark wedge built
   around a rust-red shard — an indestructible chunk of energy-giving metal
   Libertech found adrift. The hull was clamped around the shard, which now
   doubles as both the ship's ram and its power core. Side view has the near
   wing swept down and the far wing swept up, a bridge block and mast aft of
   midships, and an engine block at the stern. Flat 2D silhouettes only,
   light from screen-left; every hull volume is split lit/shade with
   Paint.litShade.

   drawHull's local frame: the caller has already applied
   translate(shipScreenX, shipScreenY), rotate(pitch) and scale(sx, 1)
   where sx carries the sign of ship.face. So here +x = toward the nose,
   +y = down, and every coordinate below is a fraction of L (the ship's
   nose-to-tail length in px). Because that scale can mirror the frame,
   "screen-right" is local-left when ship.face < 0 — the block() helper
   below is the one place that distinction is handled.

   drawFront's frame is unscaled (translate + rotate only), so there
   "screen-right" is simply +x.

   The shard lives in voidship-prow.js and is painted from drawHull/drawFront
   via VoidshipArt.drawProwBack/drawProw/drawProwFront.

   Published as window.VoidshipArt. */
window.VoidshipArt = (function () {
  const { clamp, mix, hash1 } = window.Util;
  const Paint = window.Paint;

  const LIT = [150, 164, 176];
  const MID = [100, 112, 122];
  const SHADE = [62, 72, 80];
  const DEEP = [30, 36, 42];
  const EDGE = [190, 202, 212];
  const ORANGE = [240, 124, 32];
  const ORANGE_D = [168, 74, 18];
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

  // trace pts (units of L) as a closed path
  function tracePts(g, pts, L) { Paint.poly(g, pts.map(p => [p[0] * L, p[1] * L])); }
  function fillPoly(g, pts, L, color) { tracePts(g, pts, L); g.fillStyle = color; g.fill(); }
  // a lit/shade volume: split by block() over the polygon's own x-extent
  function vol(g, pts, L, lit, shade, dir) {
    let a = Infinity, b = -Infinity;
    for (const p of pts) { if (p[0] < a) a = p[0]; if (p[0] > b) b = p[0]; }
    block(g, () => tracePts(g, pts, L), a * L, b * L, lit, shade, dir);
  }
  function seg(g, pts, L, color, w) { Paint.line(g, pts.map(p => [p[0] * L, p[1] * L]), color, w); }
  function box(g, x0, y0, x1, y1, L, color) { Paint.rect(g, x0 * L, y0 * L, x1 * L, y1 * L, color); }

  const EMIT = [{ x: -0.615, y: -0.065 }, { x: -0.615, y: 0 }, { x: -0.615, y: 0.065 }];
  // sustainer nozzles: the engine block's rear chamfer corners (phase 2 onward)
  const SUST = [{ x: -0.585, y: 0.15 }, { x: -0.585, y: -0.15 }];
  // RCS nozzles: belly pair fires down (climb), deck pair fires up (descent)
  const JETS = { belly: [{ x: 0.32, y: 0.083 }, { x: -0.30, y: 0.115 }], top: [{ x: 0.32, y: -0.101 }, { x: -0.34, y: -0.125 }] };
  // streamer roots: shard top-front corner, far wing tip, mast tip, near wing tip
  const TRAIL_SEATS = [{ x: 0.74, y: -0.19 }, { x: -0.36, y: -0.28 }, { x: -0.239, y: -0.27 }, { x: -0.30, y: 0.37 }];
  const TRAIL_COL = [LAMP, COLD, DRIVE_A, DRIVE_A];

  const W_FAR = [[0.10, -0.10], [-0.16, -0.28], [-0.36, -0.28], [-0.36, -0.10]];
  const ENGINE = [[-0.34, -0.13], [-0.38, -0.17], [-0.55, -0.17], [-0.58, -0.13], [-0.58, 0.13], [-0.55, 0.17], [-0.38, 0.17], [-0.34, 0.13]];
  const HULL = [[0.46, -0.04], [0.46, -0.08], [0.26, -0.11], [-0.04, -0.125], [-0.36, -0.125], [-0.36, 0.115], [-0.04, 0.115], [0.26, 0.09], [0.46, 0.05]];
  const BELLY = [[0.46, 0.05], [0.26, 0.09], [-0.04, 0.115], [-0.36, 0.115], [-0.36, 0.075], [-0.04, 0.08], [0.26, 0.055], [0.46, 0.02]];
  const TOP_EDGE = [[0.46, -0.08], [0.26, -0.11], [-0.04, -0.125], [-0.36, -0.125]];
  const OPANEL = [[0.06, -0.065], [0.20, -0.085], [0.17, 0.03], [0.03, 0.03]];
  const W_NEAR = [[0.16, 0.08], [-0.14, 0.35], [-0.30, 0.37], [-0.38, 0.31], [-0.38, 0.10]];
  const OWING = [[0.00, 0.12], [0.10, 0.12], [-0.03, 0.24], [-0.13, 0.24]];
  const POD = [[0.44, 0.05], [0.44, 0.12], [0.36, 0.135], [0.20, 0.135], [0.20, 0.09]];
  const BRIDGE = [[-0.02, -0.125], [-0.08, -0.205], [-0.28, -0.205], [-0.32, -0.125]];
  const T1 = [[0.30, -0.13], [0.36, -0.13], [0.36, -0.095], [0.30, -0.104]];
  const T2 = [[0.10, -0.15], [0.16, -0.15], [0.16, -0.115], [0.10, -0.118]];

  const FV_WING = [[-0.46, 0.09], [-0.14, 0.02], [0.14, 0.02], [0.46, 0.09], [0.46, 0.135], [0.14, 0.075], [-0.14, 0.075], [-0.46, 0.135]];
  const FV_BODY = [[0, -0.135], [0.13, -0.08], [0.13, 0.06], [0, 0.12], [-0.13, 0.06], [-0.13, -0.08]];
  const FV_BELLY = [[0, 0.12], [0.13, 0.06], [-0.13, 0.06]];
  const FV_BRIDGE = [[-0.07, -0.205], [0.07, -0.205], [0.07, -0.125], [-0.07, -0.125]];
  const FV_POD = [[-0.05, 0.115], [0.05, 0.115], [0.05, 0.16], [-0.05, 0.16]];

  function drawHull(g, ship, L, t) {
    const dir = (ship.face || 1) >= 0 ? 1 : -1;
    const px = Math.max(1, 0.012 * L);
    const th = clamp(ship.thrustAmt || 0, 0, 1);
    const flare = clamp(ship.flare || 0, 0, 1), strain = clamp(ship.strain || 0, 0, 1);
    const tf = Math.min(1, th + 0.8 * flare);

    // 1. shard glow, behind everything
    if (window.VoidshipArt && window.VoidshipArt.drawProwBack) window.VoidshipArt.drawProwBack(g, ship, L, t);

    // 2. far wing
    vol(g, W_FAR, L, rgba(MID, 1), rgba(SHADE, 1), dir);
    seg(g, [[0.10, -0.10], [-0.16, -0.28]], L, rgba(EDGE, 0.7), px);
    fillPoly(g, [[-0.36, -0.28], [-0.29, -0.28], [-0.29, -0.25], [-0.36, -0.25]], L, rgba(ORANGE, 1));

    // 3. engine block
    vol(g, ENGINE, L, rgba(MID, 1), rgba(SHADE, 1), dir);
    seg(g, [[-0.38, -0.17], [-0.55, -0.17]], L, rgba(EDGE, 0.8), px);
    box(g, -0.53, -0.17, -0.45, -0.14, L, rgba(ORANGE, 1));
    for (const y of [-0.07, -0.01, 0.05]) seg(g, [[-0.54, y], [-0.40, y]], L, rgba(DEEP, 0.5), px);
    for (const cy of [-0.065, 0, 0.065]) {
      box(g, -0.615, cy - 0.02, -0.575, cy + 0.02, L, rgba(DEEP, 1));
      box(g, -0.61, cy - 0.011, -0.588, cy + 0.011, L, rgba(DRIVE_A, 0.25 + 0.75 * tf));
    }

    // 4. fuselage
    vol(g, HULL, L, rgba(LIT, 1), rgba(MID, 1), dir);
    fillPoly(g, BELLY, L, rgba(SHADE, 1));
    seg(g, TOP_EDGE, L, rgba(EDGE, 0.9), px);
    seg(g, [[0.20, -0.105], [0.20, 0.095]], L, rgba(DEEP, 0.35), px);
    seg(g, [[-0.14, -0.125], [-0.14, 0.115]], L, rgba(DEEP, 0.35), px);
    seg(g, [[-0.36, -0.02], [0.30, -0.02]], L, rgba(DEEP, 0.35), px);
    vol(g, OPANEL, L, rgba(ORANGE, 1), rgba(ORANGE_D, 1), dir);
    box(g, 0.30, -0.05, 0.315, -0.01, L, rgba(WHITE, 0.85));
    box(g, 0.335, -0.05, 0.35, -0.01, L, rgba(WHITE, 0.85));
    for (let i = 0; i < 6; i++) {
      if (hash1(i * 7 + 3) > 0.25) {
        const s = Math.max(1, 0.01 * L);
        const cx = (-0.30 + 0.08 * i) * L, cy = 0.015 * L;
        g.fillStyle = rgba(LAMP, 0.7);
        g.fillRect(cx - s / 2, cy - s / 2, s, s);
      }
    }
    seg(g, [[0.42, 0.04], [-0.34, 0.04]], L, rgba(ORANGE_D, 0.9), px);
    const ember = window.VoidshipArt.emberOf ? window.VoidshipArt.emberOf(ship, t) : 0.5;
    seg(g, [[0.42, 0.04], [-0.34, 0.04]], L, rgba(RED, 0.6 * ember), px);

    // 5. near wing
    vol(g, W_NEAR, L, rgba(MID, 1), rgba(SHADE, 1), dir);
    seg(g, [[0.15, 0.095], [-0.145, 0.36]], L, rgba(COLD, 0.9), Math.max(1, 0.014 * L));
    vol(g, OWING, L, rgba(ORANGE, 1), rgba(ORANGE_D, 1), dir);
    seg(g, [[-0.27, 0.11], [-0.27, 0.34]], L, rgba(DEEP, 0.4), px);
    seg(g, [[-0.30, 0.37], [-0.38, 0.31]], L, rgba(EDGE, 0.5), px);

    // 6. belly pod
    vol(g, POD, L, rgba(SHADE, 1), rgba(DEEP, 1), dir);
    box(g, 0.24, 0.10, 0.34, 0.115, L, rgba(DEEP, 1));

    // 7. bridge block
    vol(g, BRIDGE, L, rgba(LIT, 1), rgba(MID, 1), dir);
    seg(g, [[-0.08, -0.205], [-0.28, -0.205]], L, rgba(EDGE, 0.9), px);
    seg(g, [[-0.035, -0.14], [-0.075, -0.195]], L, rgba(COLD, 0.9), Math.max(1, 0.014 * L));
    box(g, -0.26, -0.195, -0.20, -0.17, L, rgba(ORANGE, 1));
    box(g, -0.245, -0.27, -0.233, -0.205, L, rgba(SHADE, 1));
    if ((t % 1.3) < 0.12) Paint.circle(g, -0.239 * L, -0.275 * L, Math.max(1, 0.012 * L), rgba(RED, 1));

    // 8. deck turrets
    vol(g, T1, L, rgba(MID, 1), rgba(SHADE, 1), dir);
    seg(g, [[0.30, -0.13], [0.36, -0.13]], L, rgba(EDGE, 0.7), px);
    seg(g, [[0.36, -0.118], [0.42, -0.122]], L, rgba(SHADE, 1), px);
    vol(g, T2, L, rgba(MID, 1), rgba(SHADE, 1), dir);
    seg(g, [[0.10, -0.15], [0.16, -0.15]], L, rgba(EDGE, 0.7), px);
    seg(g, [[0.16, -0.138], [0.23, -0.142]], L, rgba(SHADE, 1), px);

    // 9. shard
    if (window.VoidshipArt && window.VoidshipArt.drawProw) window.VoidshipArt.drawProw(g, ship, L, t);

    // 10. drive glow
    const shim = 0.85 + 0.15 * Math.sin(t * 9);
    if (tf > 0.05) {
      const k = 1 + 1.1 * flare;
      Paint.poly(g, [[-0.625, -0.11], [-0.595, 0], [-0.625, 0.11], [-0.67, 0]]
        .map(([x, y]) => [-0.625 + (x + 0.625) * k, y * k])
        .map(([x, y]) => [x * L, y * L]));
      g.fillStyle = rgba(DRIVE_B, 0.08 + 0.25 * tf);
      g.fill();
    }
    Paint.poly(g, [[-0.625, -0.075], [-0.605, 0], [-0.625, 0.075], [-0.655, 0]].map(([x, y]) => [x * L, y * L]));
    g.fillStyle = rgba(DRIVE_B, 0.10 + 0.45 * tf);
    g.fill();
    g.lineWidth = 1;
    g.strokeStyle = rgba(DRIVE_A, Math.min(1, (0.25 + 0.65 * th) * shim + 0.35 * strain));
    g.stroke();

    // 11. sustainers
    const su = clamp(ship.sustain || 0, 0, 1);
    if (su > 0.02) for (const s of SUST) {
      Paint.circle(g, s.x * L, s.y * L, Math.max(0.016 * L, 2) * (0.6 + 0.4 * su), rgba(DRIVE_B, 0.35 * su));
      Paint.circle(g, s.x * L, s.y * L, Math.max(0.006 * L, 1), rgba(DRIVE_A, 0.9 * su));
    }

    // 12. RCS jets
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

    // 13. bow strain chevrons
    if (strain > 0.02) {
      // the void pushing back on the prow: two flat chevrons ahead of the nose
      const fl = 0.8 + 0.2 * Math.sin(t * 41);
      g.lineWidth = 1;
      g.strokeStyle = rgba(DRIVE_A, 0.45 * strain * fl);
      g.beginPath(); g.moveTo(0.68 * L, -0.24 * L); g.lineTo(0.94 * L, -0.02 * L); g.lineTo(0.68 * L, 0.20 * L); g.stroke();
      g.strokeStyle = rgba(WHITE, 0.22 * strain * fl);
      g.beginPath(); g.moveTo(0.74 * L, -0.19 * L); g.lineTo(0.98 * L, -0.02 * L); g.lineTo(0.74 * L, 0.15 * L); g.stroke();
    }
  }

  function drawFront(g, ship, L, t, k) {
    if (k < 0.01) return;
    g.save();
    g.globalAlpha *= k;
    const px = Math.max(1, 0.012 * L);

    // 1. wings
    Paint.litShade(g, () => tracePts(g, FV_WING, L), 0, rgba(SHADE, 1), rgba(DEEP, 1));
    seg(g, [[-0.45, 0.095], [-0.14, 0.025]], L, rgba(COLD, 0.85), px);
    seg(g, [[0.14, 0.025], [0.45, 0.095]], L, rgba(COLD, 0.85), px);
    box(g, -0.46, 0.09, -0.40, 0.135, L, rgba(ORANGE, 1));
    box(g, 0.40, 0.09, 0.46, 0.135, L, rgba(ORANGE, 1));

    // 2. body
    Paint.litShade(g, () => tracePts(g, FV_BODY, L), 0, rgba(LIT, 1), rgba(MID, 1));
    fillPoly(g, FV_BELLY, L, rgba(SHADE, 1));
    seg(g, [[-0.13, -0.08], [0, -0.135], [0.13, -0.08]], L, rgba(EDGE, 0.8), px);
    box(g, -0.13, -0.03, -0.10, 0.03, L, rgba(ORANGE, 1));
    box(g, 0.10, -0.03, 0.13, 0.03, L, rgba(ORANGE_D, 1));

    // 3. bridge
    Paint.litShade(g, () => tracePts(g, FV_BRIDGE, L), 0, rgba(LIT, 1), rgba(MID, 1));
    box(g, -0.055, -0.175, 0.055, -0.16, L, rgba(COLD, 0.9));
    box(g, -0.006, -0.27, 0.006, -0.205, L, rgba(SHADE, 1));
    if ((t % 1.3) < 0.12) Paint.circle(g, 0, -0.275 * L, Math.max(1, 0.012 * L), rgba(RED, 1));

    // 4. pod
    Paint.litShade(g, () => tracePts(g, FV_POD, L), 0, rgba(SHADE, 1), rgba(DEEP, 1));

    // 5. shard
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

  const COLORS = { LIT, MID, SHADE, DEEP, EDGE, ORANGE, ORANGE_D, LAMP, COLD, RED, WHITE, DRIVE_A, DRIVE_B, DRIVE_C };

  return { EMIT, SUST, JETS, TRAIL_SEATS, drawHull, drawFront, drawFumes, drawWake, COLORS, block, tracePts, fillPoly, vol, seg, box, rgba };
})();
