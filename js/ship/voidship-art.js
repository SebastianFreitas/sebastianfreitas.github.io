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
  // RCS jets: one spot per row on plain plating at a hull edge, hull-local in units of L (+x nose, +y down; the firing finds rows by id). top/belly: only x matters (the root is the hull's edge in that column); near/far: x, y on the face
  const RCS = [
    { id: 'bowTop', bank: 1, kind: 'top', x: 0.28, y: 0 }, { id: 'bowBelly', bank: 1, kind: 'belly', x: 0.38, y: 0 },
    { id: 'bowNear', bank: 1, kind: 'near', x: 0.37, y: -0.08 }, { id: 'bowFar', bank: 1, kind: 'far', x: 0.37, y: -0.08 },
    { id: 'sternTop', bank: -1, kind: 'top', x: -0.27, y: 0 }, { id: 'sternBelly', bank: -1, kind: 'belly', x: -0.50, y: 0 },
    { id: 'sternNear', bank: -1, kind: 'near', x: -0.45, y: -0.12 }, { id: 'sternFar', bank: -1, kind: 'far', x: -0.45, y: -0.12 },
  ];
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

    // the canvas this frame blits: the rest sprite, or the baked turn frame nearest the yaw
    const dpr = Math.min(window.devicePixelRatio || 1, 2), TF = window.VoidshipTurnFrames;
    const sp = window.VoidshipHull.sprite(L, dpr);
    let img = sp.canvas, set = null, fk = 0;
    if (turn && TF) { set = TF.prepare(L, dpr, 0) || TF.bake(L, dpr); img = TF.frameAt(set, (ship.yaw || 0) * 180 / Math.PI).canvas; fk = set.frames.indexOf(img); }
    // 12. RCS turn jets: the far pass (behind the hull) comes first, the near pass after the hull
    rcsPass(g, ship, L, true, img, set, fk, sp, dpr);
    // 1. shard glow, behind everything
    open(0);
    if (window.VoidshipArt && window.VoidshipArt.drawProwBack) window.VoidshipArt.drawProwBack(g, ship, L, t);
    close();
    // the new hull is one baked sprite (built once per size); facing left it is the same sprite mirrored by the caller's scale(-1, 1)
    const sx = -sp.ox / sp.scale, sy = -sp.oy / sp.scale, sw = sp.canvas.width / sp.scale, sh = sp.canvas.height / sp.scale;
    if (!turn) {
      g.drawImage(sp.canvas, sx, sy, sw, sh);
      if (window.VoidshipArt.drawEmber) window.VoidshipArt.drawEmber(g, ship, L, t);   // the rest ember is live, not baked
      // bake the turn frames a little at a time while at rest, so the first turn does not stall
      if (TF) TF.prepare(L, dpr, 2);
    } else if (window.VoidshipTurnFrames) {
      // mid-turn the drive sits behind the hull, so the hull covers it
      open(); drive(); close();
      // the whole ship as baked frames, pivoting at the sprite origin; the caller's scale(sign, 1) already mirrors past 90 degrees
      g.drawImage(img, sx, sy, sw, sh);
    }

    rcsPass(g, ship, L, false, img, set, fk, sp, dpr);

    // 10. drive glow, sustainers (mid-turn they were painted behind the hull, above)
    open(0);
    if (!turn) drive();
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
  }

  // Turn jets: one plume per RCS row, rooted on the hull as it is drawn and painted in drawHull's own transform (far rows before the hull, near rows after).
  // The root comes from the canvas being blitted (rest sprite or turn frame): top/belly the first opaque pixel down/up the spot's projected column, near/far the spot
  // projected as the turn bake does it (column = X cos t - Z sin t, row unchanged, Z = +-half-thickness from VoidshipTurnFrames.depth). Cached per size and frame.
  const JET_LEN = 0.12, JET_W = 0.065;
  const JET_TONES = [rgba(COLD, 0.9), rgba(mixc(COLD, WHITE, 0.5), 0.92), rgba(WHITE, 1)], JET_STEP = [[1, 1], [0.72, 0.58], [0.5, 0.34]];   // [length, width] of each stepped tone
  const jetLog = { canvas: null, jets: [] }, jetPool = [];   // jetLog: the canvas just blitted and each firing row's root and plume direction in its pixels (tools/turnproof.py reads it)
  let jetKey = '', jetRoots = {};
  // The root must sit on solid plate: at least 3 px of opaque hull along the jet axis, and (top/belly) a flat edge, not a spike. A spot that fails moves along the hull (columns or rows either side, nearest first; bow stays forward of centre, stern aft).
  let jetImg = null, jetPix = null;
  function jetData(img) {
    if (jetImg !== img) { jetImg = img; jetPix = img.getContext('2d').getImageData(0, 0, img.width, img.height).data; }
    return jetPix;
  }
  function jetRoot(row, img, th, sp, L, dpr) {
    const s = L * dpr, c = Math.cos(th), sn = Math.sin(th), ox = sp.ox, oy = sp.oy, w = img.width, h = img.height, d = jetData(img), T = Math.ceil(3 * dpr), R = Math.ceil(0.06 * s);
    const A = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 127;
    const run = (x, y, ux, uy) => { let n = 0; while (n < T && A(x - ux * n, y - uy * n)) n++; return n >= T; };
    if (row.kind === 'top' || row.kind === 'belly') {
      const top = row.kind === 'top', uy = top ? -1 : 1, c0 = Math.floor(ox + row.x * s * c), side = row.x > 0 ? 1 : -1;
      const edge = col => { for (let k = 0; k < h; k++) { const y = top ? k : h - 1 - k; if (A(col, y)) return y; } return -1; };
      for (let k = 0; k <= R; k++) for (let sg = 1; sg >= -1; sg -= 2) {
        const col = c0 + k * sg;
        if (k === 0 && sg < 0) continue;
        if ((col - ox) * side <= 0) continue;
        const y = edge(col);
        if (y < 0 || !run(col, y, 0, uy)) continue;
        const a = edge(col - 2), b = edge(col + 2);
        if (a < 0 || b < 0 || Math.abs(a - y) > 2 || Math.abs(b - y) > 2) continue;
        return { cx: col, cy: y, ux: 0, uy };
      }
      return null;
    }
    const near = row.kind === 'near', TF = window.VoidshipTurnFrames, D = TF && TF.depth(L, dpr);
    if (!D) return null;
    const ux = near ? -1 : 1, j0 = Math.floor(oy + row.y * s), half = D.half[j0 * D.w + Math.floor(ox + row.x * s)], cx0 = Math.floor(ox + row.x * s * c - (near ? half : -half) * sn);
    for (let k = 0; k <= R; k++) for (let sg = 1; sg >= -1; sg -= 2) {
      if (k === 0 && sg < 0) continue;
      const j = j0 + k * sg;
      let cx = cx0;
      if (near) {   // the near nozzle sits on the hull's edge in its row: snap to the last opaque pixel along the jet
        if (A(cx, j)) { for (let n = 0; n < R && A(cx + ux, j); n++) cx += ux; }
        else { for (let n = 0; n < R && !A(cx, j); n++) cx -= ux; }
      }
      if (A(cx, j) && run(cx, j, ux, 0)) return { cx, cy: j, ux, uy: 0 };
    }
    return null;
  }
  // The baked vertical ports (top/belly rows), in units of L: plate width w and depth d, the closed slot's share of both. VoidshipHull.sprite bakes them at ventRoots' points; rcsPass lights the same slot.
  const VENT = { w: 8 / 96, d: 1 / 96, cap: 1 / 96 };
  function ventRoots(img, sp, L, dpr) {
    const out = RCS.filter(r => r.kind === 'top' || r.kind === 'belly').map(r => ({ kind: r.kind, q: jetRoot(r, img, 0, sp, L, dpr) }));
    jetImg = null;
    return out;
  }
  // The lit flame, the lit port and the soft glow are built once per size and drawn with drawImage; the plume keeps its shape and fades by alpha.
  let jetSpr = null, jetSprKey = '';
  function jetSprites(L, dpr) {
    const key = L + '|' + dpr;
    if (jetSpr && jetSprKey === key) return jetSpr;
    jetSprKey = key;
    const len = Math.max(9, JET_LEN * L), w = Math.max(5.5, JET_W * L), pad = 2, mk = (cw, ch) => { const cv = document.createElement('canvas'); cv.width = Math.ceil(cw * dpr); cv.height = Math.ceil(ch * dpr); const x = cv.getContext('2d'); x.scale(dpr, dpr); return [cv, x]; };
    // flame: along +x from x = pad (the base, 1 px inside the hull edge), three stepped tones
    const [pl, px] = mk(len + pad + 1, w + 2);
    for (let i = 0; i < 3; i++) {
      const l = len * JET_STEP[i][0], hw = w * JET_STEP[i][1] / 2;
      const cy = (w + 2) / 2; px.beginPath(); px.moveTo(0, cy - hw); px.bezierCurveTo(pad + l * 0.3, cy - hw * 1.25, pad + l * 0.7, cy - hw * 0.45, pad + l, cy); px.bezierCurveTo(pad + l * 0.7, cy + hw * 0.45, pad + l * 0.3, cy + hw * 1.25, 0, cy + hw); px.closePath();
      px.fillStyle = JET_TONES[i]; px.fill();
    }
    // port: a bright slot across the root, flush with the plating
    const pw = w * 1.4, [po, qx] = mk(4, pw);
    qx.fillStyle = JET_TONES[2]; qx.fillRect(1, 0, 2, pw);
    // glow: the foreshortened jet, a short soft glow on the hull at its nozzle
    const gr = Math.max(4, 0.05 * L), [gl, gx] = mk(gr * 2, gr * 2), gg = gx.createRadialGradient(gr, gr, 0, gr, gr, gr);
    gg.addColorStop(0, rgba(WHITE, 0.9)); gg.addColorStop(0.4, rgba(mixc(COLD, WHITE, 0.5), 0.5)); gg.addColorStop(1, rgba(COLD, 0));
    gx.fillStyle = gg; gx.fillRect(0, 0, gr * 2, gr * 2);
    return (jetSpr = { pl, po, gl, pw, gr, pad, fw: len + pad + 1, fh: w + 2 });
  }
  function rcsPass(g, ship, L, far, img, set, fk, sp, dpr) {
    const rows = ship.rcs;
    if (far) {
      jetLog.canvas = img; jetLog.jets.length = 0;
      // the tool sets jetLog.rec = []: one row per drawn frame [t s, pitch, yaw, camX, y, vy, face, each jet's level]
      if (jetLog.rec) jetLog.rec.push([performance.now() / 1000, ship.pitch, ship.yaw, ship.camX, ship.y, ship.vy, ship.face].concat(ship.rcs));
    }
    if (!rows || !ship.rcsAny) return;
    const key = L + '|' + dpr;
    if (key !== jetKey) { jetKey = key; jetRoots = {}; }
    const th = set ? fk * Math.PI / 2 / (set.n - 1) : 0, sn = Math.abs(Math.sin(th)), fr = jetRoots[fk] || (jetRoots[fk] = []);
    for (let r = 0; r < rows.length; r++) {
      const row = RCS[r], lv = rows[r];
      if (!row || !(lv > 0) || (row.kind === 'far') !== far) continue;
      const q = fr[r] === undefined ? (fr[r] = jetRoot(row, img, th, sp, L, dpr)) : fr[r];
      if (!q) continue;
      const n = jetLog.jets.length, e = jetPool[n] || (jetPool[n] = {});
      e.id = row.id; e.level = lv; e.cx = q.cx; e.cy = q.cy; e.ux = q.ux; e.uy = q.uy;
      jetLog.jets.push(e);
      // top/belly jets stay a flame; near/far crossfade from the flame (side-on) to a soft glow on the hull (foreshortened)
      const vert = row.kind === 'top' || row.kind === 'belly', side = row.kind === 'near' || far, k = side ? Math.min(1, Math.max(0, (sn - 0.15) / 0.45)) : 1, S = jetSprites(L, dpr);
      const rx = (q.cx + 0.5 - sp.ox) / dpr, ry = (q.cy + 0.5 - sp.oy) / dpr, bx = rx - q.ux * 0.5 / dpr, by = ry - q.uy * 0.5 / dpr, a0 = g.globalAlpha;
      if (k > 0) {
        g.save(); g.translate(bx, by); g.rotate(Math.atan2(q.uy, q.ux));
        g.globalAlpha = a0 * lv * k; g.drawImage(S.pl, 0, -S.fh / 2, S.fw, S.fh);
        if (!vert) { g.globalAlpha = a0 * lv; g.drawImage(S.po, -1, -S.pw / 2, 4, S.pw); }
        g.restore();
      }
      if (vert) {   // the baked slot opens: its inside takes the jet's colour, with a small soft glow on the plate round it
        const ey = (q.cy + (q.uy > 0 ? 1 : 0) - sp.oy) / dpr, hw = (VENT.w - 2 * VENT.cap) * L * Math.max(0.35, Math.cos(th)) / 2, sd = VENT.d * L, y1 = ey - q.uy * sd;
        g.globalAlpha = a0 * lv * 0.8; g.drawImage(S.gl, rx - S.gr * 1.05, (ey + y1) / 2 - S.gr * 1.05, S.gr * 2.1, S.gr * 2.1);
        g.globalAlpha = a0 * lv; g.fillStyle = JET_TONES[2]; g.beginPath(); g.moveTo(rx - hw, ey); g.lineTo(rx + hw, ey); g.lineTo(rx + hw, y1); g.lineTo(rx - hw, y1); g.closePath(); g.fill();
      } else if (k < 1) { g.globalAlpha = a0 * lv * (1 - k); g.drawImage(S.gl, rx - S.gr, ry - S.gr, S.gr * 2, S.gr * 2); }
      g.globalAlpha = a0;
    }
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
        const col = mixc(WHITE, COLD, f);   // a small pale puff off the flame tip, the turn-jet tones
        const a = (1 - f) * 0.7 * (1 - (p.fo || 0));
        Paint.circle(g, sx, sy, r, rgba(col, a));
      } else if (p.kind === 3) {
        const col = mixc(DRIVE_B, DRIVE_A, f);
        const len = p.r0 * (0.6 + 0.8 * (1 - f)), s = p.vx < 0 ? 1 : -1;
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - s * len, sy);
        g.lineWidth = 1.2; g.strokeStyle = rgba(col, (1 - f) * 0.85); g.stroke();
      }
    }
  }

  // The drive's flame: the turn-jet flame sprite, one per bell, base just inside the bell (the hull is drawn over it), pointing straight out behind.
  // ship.flameP = [bell0 x, y, bell1 x, y, tail angle, length px, brightness]
  function drawFlame(g, ship, env) {
    const fp = ship.flameP, len = fp[5], L = env.L;
    if (!(len > 0.5)) return;
    const S = jetSprites(L, Math.min(window.devicePixelRatio || 1, 2)), a0 = g.globalAlpha, ins = 0.012 * L;
    for (let i = 0; i < 2; i++) {
      const fl = (len + ins) * (1 + 0.07 * Math.sin(env.t * 41 + i * 2.3) + 0.04 * Math.sin(env.t * 67 + i));
      g.save(); g.translate(fp[i * 2], fp[i * 2 + 1]); g.rotate(fp[4]); g.translate(-ins, 0);
      g.globalAlpha = a0 * fp[6]; g.drawImage(S.pl, 0, -S.fh * 0.9, fl, S.fh * 1.8);
      g.restore();
    }
    g.globalAlpha = a0;
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

  const COLORS = { LIT, MID, SHADE, DEEP, EDGE, LAMP, COLD, RED, WHITE, DRIVE_A, DRIVE_B, DRIVE_C };

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

  return { EMIT, SUST, RCS, VENT, ventRoots, jetLog, TRAIL_SEATS, drawHull, drawTether, drawFumes, drawFlame, drawWake, COLORS, block, tracePts, fillPoly, vol, seg, box, rgba };
})();
