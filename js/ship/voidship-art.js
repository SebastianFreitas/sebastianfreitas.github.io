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
   via VoidshipArt.drawProwBack/drawProw/drawProwTurn.

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

  const EMIT = [{ x: -0.615, y: -0.065 }, { x: -0.615, y: 0 }, { x: -0.615, y: 0.065 }];
  // sustainer nozzles: the engine block's rear chamfer corners (phase 2 onward)
  const SUST = [{ x: -0.585, y: 0.15 }, { x: -0.585, y: -0.15 }];
  // RCS nozzles: belly pair fires down (climb), deck pair fires up (descent)
  const JETS = { belly: [{ x: -0.30, y: 0.115 }], top: [{ x: -0.34, y: -0.125 }] };   // tail seats only: a mid-ship seat read as a third thruster beside the ring and tail jets
  // streamer roots: shard top-front corner, far wing tip, mast tip, near wing tip
  // the lower wing seen head-on: span coordinate u = (y - A_RY) / SPH along the wing, screen
  // depth WING_Z(u) off the centre line; the near wing tip (y 0.37) is at u = WING_UT
  const A_RY = 0.10, SPH = 0.574, WZ0 = 0.10, WZS = 0.43;
  const WING_UT = (0.37 - A_RY) / SPH;
  const WING_Z = (u) => WZ0 + WZS * u;
  const TRAIL_SEATS = [{ x: 1.14, y: 0.02 }, { x: -0.47, y: -0.31 }, { x: -0.239, y: -0.27 }, { x: -0.48, y: 0.37, z: WING_Z(WING_UT) }];
  const TRAIL_COL = [LAMP, COLD, DRIVE_A, DRIVE_A];

  const W_FAR = [[0.10, -0.10], [-0.16, -0.28], [-0.47, -0.31], [-0.38, -0.17], [-0.36, -0.10]];
  const ENGINE = [[-0.34, -0.13], [-0.38, -0.17], [-0.55, -0.17], [-0.58, -0.13], [-0.58, 0.13], [-0.55, 0.17], [-0.38, 0.17], [-0.34, 0.13]];
  const HULL = [[0.36, -0.13], [0.26, -0.13], [-0.04, -0.125], [-0.36, -0.125], [-0.36, 0.115], [-0.04, 0.115], [0.26, 0.10], [0.36, 0.10]];
  const BELLY = [[0.36, 0.10], [0.26, 0.10], [-0.04, 0.115], [-0.36, 0.115], [-0.36, 0.075], [-0.04, 0.08], [0.26, 0.055], [0.36, 0.055]];
  const TOP_EDGE = [[0.36, -0.13], [0.26, -0.13], [-0.04, -0.125], [-0.36, -0.125]];
  const OPANEL = [[0.06, -0.065], [0.20, -0.085], [0.17, 0.03], [0.03, 0.03]];
  const W_NEAR = [[0.16, 0.08], [-0.14, 0.35], [-0.30, 0.355], [-0.48, 0.37], [-0.38, 0.19], [-0.38, 0.10]];
  const OWING = [[0.015, 0.125], [0.115, 0.115], [-0.15, 0.285], [-0.10, 0.225]];
  // the wing's weight sits at the root: a heavy doubler plate, cut hard from the thin outer plate
  const W_ROOT = [[0.09, 0.125], [-0.03, 0.235], [-0.405, 0.235], [-0.38, 0.10], [0.0, 0.10]];
  const POD = [[0.36, 0.05], [0.36, 0.135], [0.20, 0.135], [0.20, 0.09]];
  // the keel under the pod, ahead of the wing root, with the intake let into it
  const KEEL = [[0.34, 0.135], [0.335, 0.17], [0.195, 0.17], [0.135, 0.125], [0.20, 0.125]];
  const BRIDGE = [[-0.02, -0.125], [-0.08, -0.205], [-0.28, -0.205], [-0.32, -0.125]];
  // the cockpit: a hard framed slit, small human work next to the blade
  const CANOPY = [[-0.082, -0.192], [-0.195, -0.192], [-0.195, -0.158], [-0.056, -0.158]];
  const CANOPY_F = [[-0.074, -0.202], [-0.205, -0.202], [-0.205, -0.148], [-0.038, -0.148]];
  const T1 = [[0.30, -0.13], [0.36, -0.13], [0.36, -0.095], [0.30, -0.104]];
  const T2 = [[0.10, -0.15], [0.16, -0.15], [0.16, -0.115], [0.10, -0.118]];

  const FV_BODY = [[0, -0.135], [0.13, -0.08], [0.13, 0.06], [0, 0.12], [-0.13, 0.06], [-0.13, -0.08]];
  const FV_BELLY = [[0, 0.12], [0.13, 0.06], [-0.13, 0.06]];
  const FV_BRIDGE = [[-0.07, -0.125], [-0.07, -0.175], [-0.064, -0.192], [-0.05, -0.203], [-0.035, -0.205],
    [0.035, -0.205], [0.05, -0.203], [0.064, -0.192], [0.07, -0.175], [0.07, -0.125]];
  const FV_POD = [[-0.05, 0.115], [0.05, 0.115], [0.05, 0.15], [0.02, 0.175], [-0.02, 0.175], [-0.05, 0.15]];

  const FV_KEEL = [[-0.045, 0.118], [0.045, 0.118], [0.045, 0.16], [0.02, 0.172], [-0.02, 0.172], [-0.045, 0.16]];

  // The turn (yaw 0..90 deg, mirrored past 90): `turn` = {c: cos, s: sin}. Hull volumes are
  // prisms half HW wide: the near side face is squeezed by c and slides left by HW*s, the
  // cross-section ends open up by s. The plates are real 3D: a dorsal fin on the centre line
  // (half thickness FT) and two lower wings. Head-on each is a short swept wedge rooted on the
  // hull's side at mid height (top face WY0), reaching out first and drooping WDR second,
  // TV thick at the root and tapering to TT of that at the tip. Identity at yaw 0.
  const HW = 0.13, TV = 0.14, FT = 0.05, WY0 = -0.07, WDR = 0.12, TT = 0.2;
  const W_FAR5 = [[0.10, -0.10], [-0.16, -0.28], [-0.315, -0.295], [-0.47, -0.31], [-0.38, -0.17], [-0.36, -0.10]];
  const FAR_TIP = [[-0.47, -0.31], [-0.40, -0.303], [-0.435, -0.255]];
  const FAR_EDGE = [[0.10, -0.10], [-0.16, -0.28]];
  const NEAR_EDGE = [[0.15, 0.095], [-0.145, 0.36]];
  // the hull's rear end (its last section before the engine) and the wing outlines at that station, for the 3D-turn tail jet
  const REAR = Math.min(...HULL.map(p => p[0]));
  const edgeY = (pts, x, sgn) => pts.reduce((m, a, i) => {
    const b = pts[(i + 1) % pts.length];
    if ((a[0] - x) * (b[0] - x) > 0 || a[0] === b[0]) return m;
    const y = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
    return y * sgn > m * sgn ? y : m;
  }, -sgn * 9);
  const ENG_X = -0.50;   // a station on the engine block's top/bottom edge, just behind the dorsal fin's rear edge
  const REAR_DN =edgeY(W_NEAR, REAR, 1), REAR_UP = edgeY(W_FAR5, REAR, -1);

  function drawHull(g, ship, L, t, turn) {
    const dir = (ship.face || 1) >= 0 ? 1 : -1;
    const px = Math.max(1, 0.012 * L);
    // thin lines on turning plates thin out as the part foreshortens
    const fm = turn ? 0.5 + 0.5 * turn.c : 1;
    const pxw = Math.max(0.75, px * fm);
    const th = clamp(ship.thrustAmt || 0, 0, 1);
    const flare = clamp(ship.flare || 0, 0, 1), strain = clamp(ship.strain || 0, 0, 1);
    const tf = Math.min(1, th + 0.8 * flare);
    // mid-turn: run a block on a volume's near face (w = its half width); gone when edge-on
    const open = (w, fade) => {
      if (!turn) return;
      g.save();
      const k = fade ? clamp((turn.c - 0.04) / 0.23, 0, 1) : 1;   // a fading block narrows to nothing, always opaque
      if (turn.c < 0.04 || k <= 0) { g.beginPath(); g.rect(0, 0, 0, 0); g.clip(); return; }
      g.transform(turn.c * k, 0, 0, 1, -w * turn.s * k * L, 0);   // the near side narrows with the block, so the end face always meets it
    };
    const close = () => { if (turn) g.restore(); };
    // mid-turn plates in 3D, screen x = x*c - z*s. A lower wing point (a, y) sits at span
    // (y - A_RY) / SPH along the droop; k = 0 is its top face, 1 its underside.
    // The dorsal fin sits on the centre line, half thickness FT either side.
    let wing = null, fin = null;
    if (turn) {
      const lean = clamp((ship.face || 0) / 0.7, -1, 1);   // the head-on splay keeps its screen side through the mirror: it fades to nothing at face 0, so the mirrored art never swaps it
      wing = (zs, k) => (p) => {
        const u = (p[1] - A_RY) / SPH;
        const th = k * (0.14 + 0.1 * u) * clamp(3 * turn.c, 0, 1);   // the wing's own depth, a plate not a stick; gone head-on
        return [p[0] * (turn.c + 0.3 * turn.s * turn.s * lean) - zs * WING_Z(u) * turn.s + th * turn.s, p[1]];   // yaw never moves y
      };
      fin = (zz) => (p) => [p[0] * turn.c - zz * FT * (0.3 + 0.7 * clamp((p[1] + 0.31) / 0.2, 0, 1)) * turn.s, p[1]];   // thinner toward the top: head-on it is a fin, not a block
    }
    // a plate seen from its near side: underside and rim strips dark, then the top face on it
    const slab = (pts, top, under, lit, shade, tip) => {
      const a = pts.map(under), b = pts.map(top);
      fillPoly(g, a, L, rgba(SHADE, 1));
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        fillPoly(g, [b[i], b[j], a[j], a[i]], L, rgba(i === tip ? ORANGE : SHADE, 1));
      }
      vol(g, b, L, lit, shade, dir);
    };
    // the near wing's plates and slash; m maps a flat point onto the wing mid-turn
    const breakW = Math.max(1.5 * fm, 0.018 * L * fm);
    const nearPanels = (m) => {
      vol(g, W_ROOT.map(m), L, rgba(SHADE, 1), rgba(DEEP, 1), dir);
      seg(g, [[-0.03, 0.235], [-0.405, 0.235]].map(m), L, rgba(EDGE, 0.45), pxw);
      seg(g, [[-0.27, 0.235], [-0.27, 0.345]].map(m), L, rgba(DEEP, 1), breakW);
      seg(g, [[-0.14, 0.11], [-0.14, 0.235]].map(m), L, rgba(MID, 0.6), pxw);
      vol(g, OWING.map(m), L, rgba(ORANGE, 1), rgba(ORANGE_D, 1), dir);
      seg(g, [[-0.48, 0.37], [-0.38, 0.19]].map(m), L, rgba(EDGE, 0.5), pxw);
    };
    const farPanels = (m) => {
      seg(g, [[-0.105, -0.235], [-0.40, -0.235]].map(m), L, rgba(DEEP, 1), breakW);
      seg(g, [[-0.30, -0.235], [-0.33, -0.295]].map(m), L, rgba(DEEP, 1), pxw);
    };
    const wingOf = (zs) => {
      slab(W_NEAR, wing(zs, 0), wing(zs, 1), rgba(MID, 1), rgba(SHADE, 1), -1);
      seg(g, NEAR_EDGE.map(wing(zs, 0)), L, rgba(COLD, 0.9), Math.max(0.75, 0.014 * L * fm));
      nearPanels(wing(zs, 0));
      // head-on the slash has no width on the screen: give it one that grows with the turn
      seg(g, [[0.06, 0.12], [-0.15, 0.285]].map(wing(zs, 0)), L, rgba(ORANGE, 1), 0.03 * L * turn.s * turn.s);
      // panel ribs across the thickness: seen head-on they break the wing into plates
      for (const ry of [0.14, 0.185, 0.24, 0.30]) {
        const rp = [[-0.10, ry]];
        seg(g, [rp.map(wing(zs, 0))[0], rp.map(wing(zs, 1))[0]], L, rgba(DEEP, 0.6), Math.max(1.5 * fm, 0.02 * L * fm));
      }
    };

    // the drive glow and the sustainer rings, on the axis, only foreshortened
    const drive = () => {
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
          aim(0.68, -0.015 + dn * 0.17, dn, 0, 1.7, kk);
          aim(-0.36, -dn * (dn < 0 ? 0.31 : 0.19), -dn, 0, 4.1, kk);
        }
        return;
      }
      if (flipAmp <= 0.03) return;
      // the 3D turn is a yaw: ring and tail push sideways, so their flames point straight across the screen whatever the pitch,
      // the ring's one way and the tail's the other, chosen by the turn's direction d alone (dx -1 swings the nose screen-left,
      // so the ring flame points right). Side-on they point mostly at or away from the viewer: short, full length end-on.
      const d = flip.dx, kk = 0.55 + 0.45 * flipAmp, c = turn.c, s = turn.s, pt = ship.pitch || 0;
      const rx = 0.68 * c, ry = -0.015, ro = 0.13;   // the blade ring: centre and outer radius (voidship-prow.js)
      const ls = 0.2 + 0.8 * s, endOn = 1 - ss(0.15, 0.4, c);
      const side = (sr, y, nx, seed, rk = 1) => {   // rk: the root's reach toward the viewer, in part radii
        const vx = dir * Math.cos(pt) * sr, vy = -Math.sin(pt) * sr, sg = dir * sr; if ((sg > 0) !== !!far) return;   // the near side lies toward local -x, so sg > 0 fires away from the viewer
        // end-on the base sits just outside the whole silhouette (disc, ring, hull, both wings) on its own side
        let we = -Infinity;
        for (let i = 0; i < W_NEAR.length; i++) {
          const p = W_NEAR[i], q = W_NEAR[(i + 1) % W_NEAR.length];
          if ((p[1] - y) * (q[1] - y) > 0 || p[1] === q[1]) continue;
          const x0 = p[0] + (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1]);
          for (const zs of [-1, 1]) for (const k of [0, 1]) we = Math.max(we, sg * wing(zs, k)([x0, y])[0]);
        }
        const e = Math.max(sg * rx + ro * s, HW * s, we) + 0.01;
        // side-on it sits on the nozzle itself: the part's wall on that side, which faces the viewer
        const bx = mix(nx + sg * rk * ro * s, vx * e, endOn), by = mix(y, y + vy * e, endOn);
        aim(bx, by, 1, Math.atan2(-vx, vy), seed, kk, ls);
      };
      const ty = d > 0 ? -0.08 : 0.08;
      // side-on each nozzle sits on its part (the ring's centre row, the engine's face), never on an outline in the air
      side(-d, far ? ry : ry - Math.sign(ty) * 0.8 * ro * (1 - endOn), rx, 1.7, far ? 1 : 0.6);   // facing the viewer it fires from the ring's rim (a true point on the hoop: sin 0.8, cos -0.6), off the blade
      side(d, ty, ENG_X * c, 4.1);   // on the engine's face a little off the drive, so end-on it stays clear of the ring flame
    };
    // 1. shard glow, behind everything
    open(0);
    if (window.VoidshipArt && window.VoidshipArt.drawProwBack) window.VoidshipArt.drawProwBack(g, ship, L, t);
    close();
    // mid-turn the drive sits behind the hull, so the engine and hull cover it
    if (turn) { open(0); drive(); close(); if (flip) turnJets(true); }   // the jet firing away from the viewer: the hull drawn next covers its root

    // 2. far wing
    if (turn) {
      // the far lower wing, then the dorsal fin (back face, rim, front face)
      wingOf(-1);
      // the slab's tip sits a hair low: its thickness would otherwise show bare metal 3 rows above the rest tip
      slab(W_FAR5.map(p => [p[0], Math.max(p[1], -0.30)]), fin(1), fin(-1), rgba(MID, 1), rgba(SHADE, 1));
      farPanels(fin(1));
      seg(g, FAR_EDGE.map(fin(1)), L, rgba(EDGE, 0.7), px);
      fillPoly(g, FAR_TIP.map(fin(1)), L, rgba(ORANGE, 1));
    } else {
      vol(g, W_FAR, L, rgba(MID, 1), rgba(SHADE, 1), dir);
      farPanels(p => p);
      seg(g, FAR_EDGE, L, rgba(EDGE, 0.7), px);
      fillPoly(g, FAR_TIP, L, rgba(ORANGE, 1));
    }

    // 3. engine block
    open(HW, true);
    vol(g, ENGINE, L, rgba(MID, 1), rgba(SHADE, 1), dir);
    seg(g, [[-0.38, -0.17], [-0.55, -0.17]], L, rgba(EDGE, 0.8), px);
    box(g, -0.53, -0.17, -0.45, -0.14, L, rgba(ORANGE, 1));
    for (const y of [-0.07, -0.01, 0.05]) seg(g, [[-0.54, y], [-0.40, y]], L, rgba(DEEP, 0.5), px);
    for (const cy of [-0.065, 0, 0.065]) {
      box(g, -0.615, cy - 0.02, -0.575, cy + 0.02, L, rgba(DEEP, 1));
      box(g, -0.61, cy - 0.011, -0.588, cy + 0.011, L, rgba(DRIVE_A, 0.25 + 0.75 * tf));
    }
    close();

    // 4. fuselage
    open(HW, true);
    vol(g, HULL, L, rgba(LIT, 1), rgba(MID, 1), dir);
    fillPoly(g, BELLY, L, rgba(SHADE, 1));
    seg(g, TOP_EDGE, L, rgba(EDGE, 0.9), px);
    seg(g, [[0.20, -0.105], [0.20, 0.095]], L, rgba(DEEP, 0.35), px);
    seg(g, [[-0.14, -0.125], [-0.14, 0.115]], L, rgba(DEEP, 0.35), px);
    seg(g, [[-0.36, -0.02], [0.30, -0.02]], L, rgba(DEEP, 0.35), px);
    // the belly plates: one hard seam along the top, heavy breaks across
    seg(g, [[-0.36, 0.075], [-0.04, 0.08], [0.26, 0.055]], L, rgba(DEEP, 1), Math.max(1.5, 0.016 * L));
    for (const b of [[0.11, 0.073, 0.114], [0.19, 0.066, 0.106]]) seg(g, [[b[0], b[1]], [b[0], b[2]]], L, rgba(DEEP, 1), Math.max(1.5, 0.018 * L));
    vol(g, OPANEL, L, rgba(ORANGE, 1), rgba(ORANGE_D, 1), dir);
    if (!turn) {   // mid-turn these slide out from under the blade as a stray white dash
      box(g, 0.30, -0.05, 0.315, -0.01, L, rgba(WHITE, 0.85));
      box(g, 0.335, -0.05, 0.35, -0.01, L, rgba(WHITE, 0.85));
    }
    for (let i = 0; i < 6; i++) {
      if (hash1(i * 7 + 3) > 0.25) {
        const s = Math.max(1, 0.01 * L);
        const cx = (-0.30 + 0.08 * i) * L, cy = 0.015 * L;
        g.fillStyle = rgba(LAMP, 0.7);
        g.fillRect(cx - s / 2, cy - s / 2, s, s);
      }
    }
    seg(g, [[0.36, 0.04], [-0.34, 0.04]], L, rgba(ORANGE_D, 0.9), px);
    const ember = window.VoidshipArt.emberOf ? window.VoidshipArt.emberOf(ship, t) : 0.5;
    seg(g, [[0.36, 0.04], [-0.34, 0.04]], L, rgba(RED, 0.6 * ember), px);
    close();

    // 5. near wing
    if (turn) {
      wingOf(1);
    } else {
      vol(g, W_NEAR, L, rgba(MID, 1), rgba(SHADE, 1), dir);
      nearPanels(p => p);
      seg(g, NEAR_EDGE, L, rgba(COLD, 0.9), Math.max(1, 0.014 * L));
    }

    // 6. belly pod
    open(HW);   // hangs on the hull's face, so it slides with the hull
    vol(g, POD, L, rgba(SHADE, 1), rgba(DEEP, 1), dir);
    box(g, 0.24, 0.10, 0.34, 0.115, L, rgba(DEEP, 1));
    vol(g, KEEL, L, rgba(MID, 1), rgba(SHADE, 1), dir);
    seg(g, [[0.135, 0.125], [0.195, 0.17], [0.335, 0.17]], L, rgba(COLD, 0.55), px);
    box(g, 0.215, 0.138, 0.31, 0.157, L, rgba(DEEP, 1));
    for (const x of [0.245, 0.28]) box(g, x - 0.005, 0.138, x + 0.005, 0.157, L, rgba(MID, 1));
    close();

    // 7. bridge block
    open(0.07);
    vol(g, BRIDGE, L, rgba(LIT, 1), rgba(MID, 1), dir);
    seg(g, [[-0.08, -0.205], [-0.28, -0.205]], L, rgba(EDGE, 0.9), px);
    fillPoly(g, CANOPY_F, L, rgba(SHADE, 1));
    fillPoly(g, CANOPY, L, rgba(DEEP, 1));
    box(g, -0.15, -0.187, -0.118, -0.163, L, rgba(LAMP, 1));
    for (const x of [-0.11, -0.158]) box(g, x - 0.005, -0.192, x + 0.005, -0.158, L, rgba(MID, 1));
    box(g, -0.26, -0.195, -0.20, -0.17, L, rgba(ORANGE, 1));
    if (!turn) {
      box(g, -0.245, -0.27, -0.233, -0.205, L, rgba(SHADE, 1));
      if ((t % 1.3) < 0.12) Paint.circle(g, -0.239 * L, -0.275 * L, Math.max(1, 0.012 * L), rgba(RED, 1));
    }

    close();
    if (turn) {
      // the one mast, on the centre line, not clipped so it survives head-on
      g.save();
      g.translate(-0.239 * turn.c * L, 0);
      box(g, -0.006, -0.27, 0.006, -0.205, L, rgba(SHADE, 1));
      if ((t % 1.3) < 0.12) Paint.circle(g, 0, -0.275 * L, Math.max(1, 0.012 * L), rgba(RED, 1));
      g.restore();
    }

    // 8. deck turrets
    open(0.05);
    vol(g, T1, L, rgba(MID, 1), rgba(SHADE, 1), dir);
    seg(g, [[0.30, -0.13], [0.36, -0.13]], L, rgba(EDGE, 0.7), px);
    vol(g, T2, L, rgba(MID, 1), rgba(SHADE, 1), dir);
    seg(g, [[0.10, -0.15], [0.16, -0.15]], L, rgba(EDGE, 0.7), px);
    seg(g, [[0.16, -0.138], [0.23, -0.142]], L, rgba(SHADE, 1), px);
    close();

    // the cross-section ends open up as the nose comes round
    if (turn && turn.s > 0.03) drawEnds(g, ship, L, t, turn, dir, px);

    // 9. shard
    // mid-turn the blade is one solid: the side profile with a thickness across the ship, projected
    if (turn) {
      if (window.VoidshipArt && window.VoidshipArt.drawProwTurn) window.VoidshipArt.drawProwTurn(g, ship, L, t, turn);
    } else if (window.VoidshipArt && window.VoidshipArt.drawProw) window.VoidshipArt.drawProw(g, ship, L, t);

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
      g.beginPath(); g.moveTo(0.84 * L, -0.22 * L); g.lineTo(1.10 * L, 0.02 * L); g.lineTo(0.84 * L, 0.20 * L); g.stroke();
      g.strokeStyle = rgba(WHITE, 0.22 * strain * fl);
      g.beginPath(); g.moveTo(0.90 * L, -0.17 * L); g.lineTo(1.16 * L, 0.02 * L); g.lineTo(0.90 * L, 0.14 * L); g.stroke();
    }
    close();
    if (flip) turnJets(false);   // the jet firing toward the viewer goes over the finished hull, un-squeezed by the turn, x already times c
  }

  // The cross-section faces of the hull volumes, drawn unmirrored about their own centres
  // (light stays on the left), each at the hull station it belongs to.
  function drawEnds(g, ship, L, t, turn, dir, px) {
    const at = (a, fn, kk = 1) => {
      g.save();
      g.translate(a * turn.c * kk * L, 0); g.scale(dir * turn.s, 1);
      fn();
      g.restore();
    };
    at(-0.02, () => {
      Paint.litShade(g, () => tracePts(g, FV_BRIDGE, L), 0, rgba(LIT, 1), rgba(MID, 1));
      seg(g, [[-0.064, -0.192], [-0.05, -0.203], [-0.035, -0.205], [0.035, -0.205], [0.05, -0.203], [0.064, -0.192]], L, rgba(EDGE, 0.9), px);
      box(g, -0.062, -0.185, 0.062, -0.148, L, rgba(SHADE, 1));
      box(g, -0.052, -0.18, 0.052, -0.156, L, rgba(DEEP, 1));
      box(g, -0.044, -0.175, -0.016, -0.161, L, rgba(LAMP, 1));
      box(g, -0.005, -0.18, 0.005, -0.156, L, rgba(MID, 1));
      box(g, 0.026, -0.18, 0.034, -0.156, L, rgba(MID, 1));
      box(g, 0.04, -0.195, 0.058, -0.186, L, rgba(ORANGE_D, 1));
      seg(g, [[-0.07, -0.14], [0.07, -0.14]], L, rgba(DEEP, 0.5), px);
      seg(g, [[-0.035, -0.205], [-0.035, -0.19]], L, rgba(DEEP, 0.4), px);
      seg(g, [[0.0, -0.14], [0.0, -0.125]], L, rgba(DEEP, 0.4), px);
    });
    const kf = clamp((turn.c - 0.04) / 0.23, 0, 1);   // the hull's end face narrows to nothing with the block, always opaque
    at(0.34, () => {
      const k = kf;
      if (k <= 0) return;
      g.scale(k, 1);
      Paint.litShade(g, () => tracePts(g, FV_BODY, L), 0, rgba(LIT, 1), rgba(MID, 1));
      fillPoly(g, FV_BELLY, L, rgba(SHADE, 1));
      seg(g, [[-0.13, -0.08], [0, -0.135], [0.13, -0.08]], L, rgba(EDGE, 0.8), px);
      // wing root plates and the orange slash either side, plate seams between
      box(g, -0.13, -0.03, -0.10, 0.03, L, rgba(ORANGE, 1));
      box(g, 0.10, -0.03, 0.13, 0.03, L, rgba(ORANGE_D, 1));
      box(g, -0.13, 0.03, -0.085, 0.06, L, rgba(SHADE, 1));
      box(g, 0.085, 0.03, 0.13, 0.06, L, rgba(DEEP, 1));
      box(g, -0.13, -0.065, -0.10, -0.03, L, rgba(MID, 1));
      box(g, 0.10, -0.065, 0.13, -0.03, L, rgba(SHADE, 1));
      seg(g, [[0, -0.135], [0, 0.12]], L, rgba(DEEP, 0.4), px);
      seg(g, [[-0.13, -0.02], [0.13, -0.02]], L, rgba(DEEP, 0.4), px);
      seg(g, [[-0.065, -0.108], [-0.065, 0.09]], L, rgba(DEEP, 0.3), px);
      seg(g, [[0.065, -0.108], [0.065, 0.09]], L, rgba(DEEP, 0.3), px);
      seg(g, [[-0.13, 0.06], [0.13, 0.06]], L, rgba(DEEP, 1), Math.max(1.5, 0.016 * L));
      for (const x of [-0.06, 0, 0.06]) box(g, x - 0.005, 0.005, x + 0.005, 0.015, L, rgba(LAMP, 0.7));
    }, kf);
    at(0.34, () => {   // the pod's end face sits at the hull's own station, hanging from it
      Paint.litShade(g, () => tracePts(g, FV_POD, L), 0, rgba(SHADE, 1), rgba(DEEP, 1));
      // the keel with its intake grille, let into it
      Paint.litShade(g, () => tracePts(g, FV_KEEL, L), 0, rgba(MID, 1), rgba(SHADE, 1));
      box(g, -0.036, 0.125, 0.036, 0.158, L, rgba(DEEP, 1));
      for (const x of [-0.02, 0, 0.02]) box(g, x - 0.004, 0.125, x + 0.004, 0.158, L, rgba(MID, 1));
      seg(g, [[-0.02, 0.172], [0.02, 0.172]], L, rgba(COLD, 0.55), px);
    });
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

  return { EMIT, SUST, JETS, TRAIL_SEATS, drawHull, drawFumes, drawWake, COLORS, block, tracePts, fillPoly, vol, seg, box, rgba };
})();
