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

   Mid-turn drawHull gets a turn {c, s} (cos, sin of the yaw) and builds the
   hull part by part at that yaw; at rest the turn is null (plain side view).

   The shard lives in voidship-prow.js and is painted from drawHull
   via VoidshipArt.drawProwBack/drawProw.

   Published as window.VoidshipArt. */
window.VoidshipArt = (function () {
  const { clamp, mix, hash1 } = window.Util;
  const Paint = window.Paint;

  const LIT = [133, 147, 160];
  const MID = [92, 104, 114];
  const SHADE = [54, 63, 71];
  const DEEP = [30, 36, 42];
  const EDGE = [180, 192, 200];
  const ORANGE = [184, 102, 42];
  const ORANGE_D = [110, 58, 24];
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

  // the new hull's two bell mouths (VoidshipHull.anchors nozzleUpper, nozzleMain; hull file loads after this one, so the numbers are copied); main bell second: ignition and the ring puffs use EMIT[1]
  const BELL_UP = { x: -0.932, y: -0.190 }, BELL_MAIN = { x: -0.902, y: 0.050 };
  const EMIT = [BELL_UP, BELL_MAIN];
  // sustainer nozzles: the same two bell mouths (phase 2 onward)
  const SUST = [BELL_MAIN, BELL_UP];
  // RCS nozzles: the belly one fires down (climb) from under the main bell, the deck one fires up (descent) from over the upper bell
  const JETS = { belly: [{ x: -0.85, y: 0.12 }], top: [{ x: -0.85, y: -0.26 }] };
  const TRAIL_SEATS = [BELL_UP, BELL_MAIN];   // two streamers, one off each bell
  const TRAIL_COL = [DRIVE_A, DRIVE_A];

  function drawHull(g, ship, L, t, turn) {
    const dir = (ship.face || 1) >= 0 ? 1 : -1;
    const th = clamp(ship.thrustAmt || 0, 0, 1);
    const flare = clamp(ship.flare || 0, 0, 1), strain = clamp(ship.strain || 0, 0, 1);
    const tf = Math.min(1, th + 0.8 * flare);
    // mid-turn: the parts that sit on the hull (glows, strain marks) are narrowed by the turn's cosine; gone when edge-on
    const open = () => {
      if (!turn) return;
      g.save();
      if (turn.c < 0.04) { g.beginPath(); g.rect(0, 0, 0, 0); g.clip(); return; }
      g.transform(turn.c, 0, 0, 1, 0, 0);
    };
    const close = () => { if (turn) g.restore(); };
    // the drive glow and the sustainer rings, on the axis, only foreshortened
    const drive = () => {
      const shim = 0.85 + 0.15 * Math.sin(t * 9);
      // one glow in each bell mouth, a little smaller
      for (const s of [BELL_UP, BELL_MAIN]) {
        const m = 0.7, ox = s.x, oy = s.y;
        const P = (pts) => pts.map(([x, y]) => [(ox + (x + 0.625) * m) * L, (oy + y * m) * L]);
        if (tf > 0.05) {
          const k = 1 + 1.1 * flare;
          Paint.poly(g, P([[-0.625, -0.11], [-0.595, 0], [-0.625, 0.11], [-0.67, 0]]
            .map(([x, y]) => [-0.625 + (x + 0.625) * k, y * k])));
          g.fillStyle = rgba(DRIVE_B, 0.08 + 0.25 * tf);
          g.fill();
        }
        Paint.poly(g, P([[-0.625, -0.075], [-0.605, 0], [-0.625, 0.075], [-0.655, 0]]));
        g.fillStyle = rgba(DRIVE_B, 0.10 + 0.45 * tf);
        g.fill();
        g.lineWidth = 1;
        g.strokeStyle = rgba(DRIVE_A, Math.min(1, (0.25 + 0.65 * th) * shim + 0.35 * strain));
        g.stroke();
      }
      const su = turn && ship.flip ? 0 : clamp(ship.sustain || 0, 0, 1);
      if (su > 0.02) for (const s of SUST) {
        Paint.circle(g, s.x * L, s.y * L, Math.max(0.006 * L, 1), rgba(DRIVE_A, 0.9 * su));
      }
    };

    // the 3D turn fires the clock-spin jets, one steady push away from the turn the whole way through.
    const ss = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
    const flip = turn && ship.flip, fp = flip ? flip.p : 0;
    const flipAmp = flip ? 0.8 * ss(0, 0.01, fp) * (1 - ss(0.99, 1, fp)) : 0;

    // 12. RCS jets and turn flames: ragged fire tongues, orange out to a yellow-white core
    const flame = (x, y, dy, k, seed, sharp) => {
      const fl = 0.8 + 0.2 * Math.sin(t * 53 + seed) + 0.12 * Math.sin(t * 97 + seed * 3);
      const len = (0.07 + 0.25 * k) * fl, hw = (0.022 + 0.028 * k) * (0.9 + 0.1 * Math.sin(t * 71 + seed * 2));
      const tip = (j) => Math.sin(t * 61 + seed * 5 + j * 2.3) * hw * 0.5;
      const tongue = (w, l, col, a) => {
        Paint.poly(g, [[x - w, y], [x - w * 0.9, y + dy * l * 0.45], [x - w * 0.4 + tip(1), y + dy * l * 0.7], [x + tip(0) * 0.6, y + dy * l],
          [x + w * 0.35 + tip(2), y + dy * l * 0.65], [x + w * 0.9, y + dy * l * 0.4], [x + w, y]].map(([px_, py_]) => [px_ * L, py_ * L]));
        g.fillStyle = rgba(col, a); g.fill();
      };
      tongue(hw, len, ORANGE, 0.95 * k);
      tongue(hw * 0.62, len * 0.72, [255, 190, 70], k);
      tongue(hw * 0.3, len * 0.45, [255, 250, 215], k);
    };
    const turnJets = (far) => {   // far: only the jet firing away from the viewer (drawn before the hull), else only the rest
      // ls foreshortens the flame along its own axis (1 = full length)
      const aim = (x, y, dy, th, seed, kk, ls) => { g.save(); g.translate(x * L, y * L); g.rotate(th); if (ls != null) g.scale(1, ls); flame(0, 0, dy, kk, seed); g.restore(); };
      if (!flip) { if (far) return;   // the clock spin: a steady up/down pair off the ring and the tail
        const tf = ship.turnFire || 0, dn = tf > 0 ? -1 : 1, kk = 0.55 + 0.45 * Math.abs(tf);
        if (Math.abs(tf) > 0.03) {
          aim(0.43, -0.015 + dn * 0.17, dn, 0, 1.7, kk);
          aim(-0.36, -dn * (dn < 0 ? 0.31 : 0.19), -dn, 0, 4.1, kk);
        }
        return;
      }
      if (flipAmp <= 0.03) return;
      // the 3D turn is a yaw: ring and tail push sideways, so their flames point straight across the screen whatever the pitch,
      // the ring's one way and the tail's the other, chosen by the turn's direction d alone (dx -1 swings the nose screen-left,
      // so the ring flame points right). Side-on they point mostly at or away from the viewer: short, full length end-on.
      const d = flip.dx, kk = 0.55 + 0.45 * flipAmp, c = turn.c, s = turn.s, pt = ship.pitch || 0;
      const rx = 0.43 * c, ry = -0.015, ro = 0.18;   // the blade ring: centre and outer radius (voidship-prow.js)
      const ls = 0.2 + 0.8 * s, endOn = 1 - ss(0.15, 0.4, c);
      const side = (sr, y, nx, seed, rk = 1) => {   // rk: the root's reach toward the viewer, in part radii
        const vx = dir * Math.cos(pt) * sr, vy = -Math.sin(pt) * sr, sg = dir * sr; if ((sg > 0) !== !!far) return;   // the near side lies toward local -x, so sg > 0 fires away from the viewer
        // end-on the base sits just outside the ring on its own side (the hull is a sliver there)
        const e = Math.max(sg * rx + ro * s, 0) + 0.01;
        // side-on it sits on the nozzle itself: the part's wall on that side, which faces the viewer
        const bx = mix(nx + sg * rk * ro * s, vx * e, endOn), by = mix(y, y + vy * e, endOn);
        aim(bx, by, 1, Math.atan2(-vx, vy), seed, kk, ls);
      };
      const bell = d > 0 ? BELL_UP : BELL_MAIN, ty = bell.y;
      // side-on each nozzle sits on its part (the ring's centre row, the bell's mouth), never on an outline in the air
      side(-d, far ? ry : ry - Math.sign(ty) * 0.8 * ro * (1 - endOn), rx, 1.7, far ? 1 : 0.6);   // facing the viewer it fires from the ring's rim (a true point on the hoop: sin 0.8, cos -0.6), off the blade
      side(d, ty, bell.x * c, 4.1);   // on the bell mouth, squashed with the hull, so end-on it stays clear of the ring flame
    };
    // 1. shard glow, behind everything
    open(0);
    if (window.VoidshipArt && window.VoidshipArt.drawProwBack) window.VoidshipArt.drawProwBack(g, ship, L, t);
    close();
    // the new hull is one baked sprite (built once per size); facing left it is the same sprite mirrored by the caller's scale(-1, 1)
    const sp = window.VoidshipHull.sprite(L, Math.min(window.devicePixelRatio || 1, 2));
    const sx = -sp.ox / sp.scale, sy = -sp.oy / sp.scale, sw = sp.canvas.width / sp.scale, sh = sp.canvas.height / sp.scale;
    if (!turn) {
      g.drawImage(sp.canvas, sx, sy, sw, sh);
      if (window.VoidshipArt.drawEmber) window.VoidshipArt.drawEmber(g, ship, L, t);   // the rest ember is live, not baked
      // bake the turn frames a little at a time while at rest, so the first turn does not stall
      if (window.VoidshipTurnFrames) window.VoidshipTurnFrames.prepare(L, Math.min(window.devicePixelRatio || 1, 2), 2);
    } else if (window.VoidshipTurnFrames) {
      // mid-turn the drive sits behind the hull, so the hull covers it
      open(); drive(); close();
      if (flip) turnJets(true);   // the jet firing away from the viewer: the hull drawn next covers its root
      // the whole ship as baked frames, pivoting at the sprite origin; the caller's scale(sign, 1) already mirrors past 90 degrees
      const TF = window.VoidshipTurnFrames, dpr = Math.min(window.devicePixelRatio || 1, 2);
      const set = TF.prepare(L, dpr, 0) || TF.bake(L, dpr);
      g.drawImage(TF.frameAt(set, (ship.yaw || 0) * 180 / Math.PI).canvas, sx, sy, sw, sh);
    }

    // 10. drive glow, sustainers (mid-turn they were painted behind the hull, above)
    open(0);
    if (!turn) drive();

    const jet = ship.jet || 0, ja = Math.abs(jet);
    if (ja > 0.03 && !flip) {   // the 3D turn shows only its jet pair
      const seats = jet < 0 ? JETS.belly : JETS.top, sgn = jet < 0 ? 1 : -1;
      for (const s of seats) flame(s.x, s.y, sgn, ja * 0.7, s.x * 40);
    }

    if (!flip) turnJets();
    close();
    open(0);

    // 13. bow strain chevrons
    if (strain > 0.02) {
      // the void pushing back on the prow: two flat chevrons ahead of the nose
      const fl = 0.8 + 0.2 * Math.sin(t * 41);
      g.lineWidth = 1;
      g.strokeStyle = rgba(DRIVE_A, 0.45 * strain * fl);
      g.beginPath(); g.moveTo(1.31 * L, -0.10 * L); g.lineTo(1.37 * L, -0.06 * L); g.lineTo(1.31 * L, -0.02 * L); g.stroke();
      g.strokeStyle = rgba(WHITE, 0.22 * strain * fl);
      g.beginPath(); g.moveTo(1.34 * L, -0.09 * L); g.lineTo(1.39 * L, -0.06 * L); g.lineTo(1.34 * L, -0.03 * L); g.stroke();
    }
    close();
    if (flip) turnJets(false);   // the jet firing toward the viewer goes over the finished hull, un-squeezed by the turn, x already times c
  }

  function drawFumes(g, fumes, env) {
    for (const p of fumes) {
      const f = p.age / p.life;
      if (f >= 1 || f < 0) continue;
      const r = p.r0 + p.grow * p.age;
      const sx = p.x;
      if (sx < -r || sx > env.W + r) continue;
      const sy = p.kind === 3 ? p.y : p.y + Math.sin(p.age * (1.5 + p.seed * 2.5) + p.seed * 6.283) * (4 + 10 * p.seed) * Math.min(1, p.age * 2);
      if (p.rcs) {   // cold jet: a short sharp streak pointing away from the hull
        const m = Math.hypot(p.bx, p.by) || 1, len = 6 + 10 * (1 - f) + r;
        const col = mixc(WHITE, COLD, f);
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - p.bx / m * len, sy - p.by / m * len);
        g.lineWidth = 1.6; g.lineCap = 'round'; g.strokeStyle = rgba(col, 0.95 * (1 - f * 0.6)); g.stroke(); g.lineCap = 'butt';
      } else if (p.kind === 0) {
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

  /* Thrust gauge: a fixed track from d0 to d1 along the hull-to-pointer line (the pointer's
     distance sets the thrust); the fill is the live main-engine speed / top speed (0 while the
     nose swings), a tick marks the pointer's demand, a dim line carries on past d1. */
  function drawTether(g, ship, env) {
    if (!ship.thrusting) return;
    const ppu = env.W / env.viewUnits, sx = env.W * 0.5, sy = ship.y;
    let cx, cy;
    if (ship.aimPx != null && ship.aimPy != null && !ship.courseMark) { cx = ship.aimPx; cy = ship.aimPy; }
    else if (ship.targetX != null && ship.targetY != null) { cx = sx + (ship.targetX - env.camX) * ppu; cy = ship.targetY; }
    else return;
    const dx = cx - sx, dy = cy - sy, d = Math.hypot(dx, dy);
    if (d <= env.aimDead) return;
    const ux = dx / d, uy = dy / d;
    const p1 = env.holdD1 * ppu;
    const s0 = ((window.VoidshipArt && window.VoidshipArt.TIP) || 1.04) * ((window.Voidship && window.Voidship.BASE.size) || 96) + 16;   // 0% sits 16 px past the flat nose end (TIP in voidship-prow.js)
    const fill = s0 + (p1 - s0) * clamp(ship.engine || 0, 0, 1);
    const CR = "228,221,198";
    const line = (x0, x1, w, a) => {
      g.strokeStyle = "rgba(" + CR + "," + a + ")"; g.lineWidth = w; g.lineCap = "round";
      g.beginPath(); g.moveTo(sx + ux * x0, sy + uy * x0); g.lineTo(sx + ux * x1, sy + uy * x1); g.stroke();
    };
    g.save();
    line(s0, p1, 1, 0.09);
    if (d - 16 > p1) line(p1, d - 16, 1, 0.05);
    if (fill > s0 + 0.5) line(s0, fill, 1.5, 0.26);
    // 100% mark: one tiny dim tick across the line
    const ex = sx + ux * p1, ey = sy + uy * p1;
    g.strokeStyle = "rgba(" + CR + ",0.22)"; g.lineWidth = 1; g.lineCap = "butt";
    g.beginPath(); g.moveTo(ex - uy * 4, ey + ux * 4); g.lineTo(ex + uy * 4, ey - ux * 4); g.stroke();
    g.restore();
  }

  return { EMIT, SUST, JETS, TRAIL_SEATS, drawHull, drawTether, drawFumes, drawWake, COLORS, block, tracePts, fillPoly, vol, seg, box, rgba };
})();
