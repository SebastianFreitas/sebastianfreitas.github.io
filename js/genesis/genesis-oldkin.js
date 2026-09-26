/* genesis-oldkin.js — the fourteen old ones that are not of the first ten
   kinds. Same contract as the painters in genesis-oldones.js: (ctx, o, x, y,
   h, p), feet (or lowest point) on y, h tall in px; they register into
   GenOld.PAINT. */
(function () {
  const G = window.Gen;
  const O = window.GenOld; if (!O || !O.PAINT) return;
  const { clamp, mix, hash1 } = Util;
  const { litShade, circle, line } = Paint;
  const { litSplit, eyeDot } = O;
  const TAU = Math.PI * 2;

  // circle/ellipse counterpart of litSplit's under-22px flat-fill fallback
  function circSplit(ctx, trace, xSplit, lit, shade, hpx) {
    if (hpx < 22) { trace(); ctx.fillStyle = lit; ctx.fill(); return; }
    litShade(ctx, trace, xSplit, lit, shade);
  }

  /* 1. tower: bare until `dress`, then a found stovepipe hat and an
     astrakhan ruff at the neck band */
  function tower(ctx, o, x, y, h, p) {
    const dressed = o.bro ? false : (o.dressed != null ? o.dressed : (O.dressNow ? O.dressNow() : false));
    if (dressed && window.GenAttire && window.GenEldPal) towerDressed(ctx, o, x, y, h, p);
    else towerBare(ctx, o, x, y, h, p);
  }

  /* 1b. tower — thin tall slab that rocks around its forward foot corner */
  function towerBare(ctx, o, x, y, h, p) {
    const w = 0.12 * h;
    const tilt = Math.sin(p.phase) * 0.12;
    const cornerX = x + o.side * 0.5 * w;
    ctx.save();
    ctx.translate(cornerX, y);
    ctx.rotate(tilt);
    const lx = x - 0.5 * w - cornerX, rx = x + 0.5 * w - cornerX;
    const taperY = -(h - 0.12 * h);
    litSplit(ctx, [
      [lx, 0], [rx, 0], [rx, taperY], [(lx + rx) * 0.5, -h], [lx, taperY],
    ], o.lit, o.shade);
    // its own eye: a flat vertical slit, not the shared eyeDot
    ctx.beginPath();
    ctx.ellipse((lx + rx) * 0.5, -0.8 * h, 0.008 * h, 0.03 * h, 0, 0, TAU);
    ctx.fillStyle = "rgba(210,214,210,0.85)";
    ctx.fill();
    ctx.restore();
  }

  /* 1c. tower, dressed — the needle transformed into a column on splayed
     feet with a neck band and a round head, a found stovepipe hat perched
     on the head top, tipped with the tower's own rock, and an astrakhan
     ruff at the neck band */
  function towerDressed(ctx, o, x, y, h, p) {
    const GA = window.GenAttire, GP = window.GenEldPal;
    const w = 0.20 * h;
    const tilt = Math.sin(p.phase) * 0.12;
    const cornerX = x + o.side * 0.5 * w;
    ctx.save();
    ctx.translate(cornerX, y);
    ctx.rotate(tilt);
    const lx = x - 0.5 * w - cornerX, rx = x + 0.5 * w - cornerX;
    const midX = (lx + rx) * 0.5;
    const footSpread = 0.18 * h, footH = 0.10 * h;
    const footOuterL = (x - footSpread) - cornerX, footOuterR = (x + footSpread) - cornerX;
    const colTopY = -0.78 * h;
    const bandTopY = -0.83 * h, bandHalfW = 0.06 * h;
    const headCy = -0.89 * h, headW = 0.16 * h, headH = 0.12 * h;

    // the column body: two splayed feet, a rising column, a neck band
    litSplit(ctx, [
      [footOuterL, 0], [lx, -footH], [lx, colTopY],
      [midX - bandHalfW, colTopY], [midX - bandHalfW, bandTopY],
      [midX + bandHalfW, bandTopY], [midX + bandHalfW, colTopY],
      [rx, colTopY], [rx, -footH], [footOuterR, 0], [midX, 0],
    ], o.lit, o.shade);

    // the squat round head, holding the tower's own slit eye
    circSplit(ctx, () => { ctx.beginPath(); ctx.ellipse(midX, headCy, 0.5 * headW, 0.5 * headH, 0, 0, TAU); },
      midX - 0.2 * headW, o.lit, o.shade, headH);
    ctx.beginPath();
    ctx.ellipse(midX, headCy, 0.008 * h, 0.03 * h, 0, 0, TAU);
    ctx.fillStyle = "rgba(210,214,210,0.85)";
    ctx.fill();

    if (!o._att) {
      const seed = (o.idx || 0) + 1;
      o._att = {
        hat: { kind: "stovepipe", fit: "found", seed, rot: 0.12, lift: 0 },
        ruff: { kind: "ruff", fit: "found", seed, rot: 0, lift: 0 },
      };
    }
    const att = o._att;
    const crownW = 0.9 * headW;
    GA.draw(ctx, "hat", midX, -0.95 * h, crownW, att.hat);
    GA.draw(ctx, "scarf", midX, (colTopY + bandTopY) * 0.5, 2 * bandHalfW, att.ruff);
    ctx.restore();
  }

  /* 2. pearl — wet rolling sphere with a turning seam and a fixed highlight */
  function pearl(ctx, o, x, y, h, p) {
    const r = 0.5 * h, cx = x, cy = y - 0.5 * h;
    circSplit(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); },
      cx + 0.1 * r, o.lit, o.shade, r * 2);
    const rot = -p.phase;
    ctx.strokeStyle = o.shade;
    ctx.lineWidth = Math.max(1, 0.06 * h);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.8, rot, rot + 2.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx - 0.35 * r, cy - 0.35 * r, 0.22 * r, 0.12 * r, 0, 0, TAU);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fill();
    const back = -o.side;
    circle(ctx, x + back * 0.65 * r, y, 0.06 * h, o.lit);
    circle(ctx, x + back * 1.0 * r, y, 0.05 * h, o.shade);
  }

  /* 3. bundle: bare until `dress`, then a sable fur muff round the core */
  function bundle(ctx, o, x, y, h, p) {
    const dressed = o.bro ? false : (o.dressed != null ? o.dressed : (O.dressNow ? O.dressNow() : false));
    if (dressed && window.GenAttire && window.GenEldPal) bundleDressed(ctx, o, x, y, h, p);
    else bundleBare(ctx, o, x, y, h, p);
  }

  /* 3b. bundle — one mind, seven jittering wet lobes */
  function bundleBare(ctx, o, x, y, h, p) {
    const cx = x, cy = y - 0.5 * h;
    let eyeX = cx, eyeY = cy;
    for (let k = 0; k < 7; k++) {
      const r = mix(0.07 * h, 0.25 * h, hash1(o.idx * 10 + k));
      const ang = hash1(o.idx * 10 + k + 50) * TAU;
      const dist = hash1(o.idx * 10 + k + 100) * 0.3 * h;
      const jitter = Math.sin(G.t * (1.3 + k * 0.2) + o.ph + k) * 0.05 * h;
      const px = cx + Math.cos(ang) * dist + jitter, py = cy + Math.sin(ang) * dist;
      circSplit(ctx, () => { ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); },
        px - 0.2 * r, o.lit, o.shade, r * 2);
      if (k === 0) { eyeX = px; eyeY = py; }
    }
    // its own eye: a pale ring, not the shared eyeDot
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 0.03 * h, 0, TAU);
    ctx.strokeStyle = "rgba(210,214,210,0.85)";
    ctx.lineWidth = Math.max(1, 0.012 * h);
    ctx.stroke();
  }

  /* 3c. bundle, dressed — the seven lobes pulled into one upright figure:
     a round core, a three-lobed crown, two stub legs, and a sable fur muff
     held across the front */
  function bundleDressed(ctx, o, x, y, h, p) {
    const GP = window.GenEldPal;
    const sable = GP.tone("sable") || { lit: o.lit, mid: o.shade, shade: o.shade };
    const cx = x, cy = y - 0.40 * h;
    const r = 0.26 * h;

    // two stub legs, core bottom to the deck
    const legW = 0.07 * h, legTop = cy + r;
    ctx.fillStyle = o.lit;
    ctx.fillRect(x - 0.10 * h - 0.5 * legW, legTop, legW, y - legTop);
    ctx.fillStyle = o.shade;
    ctx.fillRect(x + 0.10 * h - 0.5 * legW, legTop, legW, y - legTop);

    // the round core
    circSplit(ctx, () => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); },
      cx - 0.2 * r, o.lit, o.shade, r * 2);

    // the three-lobed crown, jittering atop the core
    const angles = [-2.0944, -1.5708, -1.0472]; // -120°, -90°, -60°
    for (let k = 0; k < 3; k++) {
      const lr = 0.08 * h;
      const jitter = Math.sin(G.t * 1.3 + o.ph + k) * 0.01 * h;
      const lx = cx + Math.cos(angles[k]) * 0.28 * h;
      const ly = cy + Math.sin(angles[k]) * 0.28 * h + jitter;
      circSplit(ctx, () => { ctx.beginPath(); ctx.arc(lx, ly, lr, 0, TAU); },
        lx - 0.2 * lr, o.lit, o.shade, lr * 2);
    }

    // its own eye: a pale ring, at the core centre
    const eyeY = cy - 0.06 * h;
    ctx.beginPath();
    ctx.arc(cx, eyeY, 0.03 * h, 0, TAU);
    ctx.strokeStyle = "rgba(210,214,210,0.85)";
    ctx.lineWidth = Math.max(1, 0.012 * h);
    ctx.stroke();

    // the sable muff, held across the front of the core
    const mw = 0.44 * h, mh = 0.20 * h, c = 0.4 * mh, my = y - 0.34 * h;
    const l = cx - 0.5 * mw, mr = cx + 0.5 * mw, top = my - 0.5 * mh, bot = my + 0.5 * mh;
    litSplit(ctx, [
      [l + c, top], [mr - c, top], [mr, top + c], [mr, bot - c], [mr - c, bot],
      [l + c, bot], [l, bot - c], [l, top + c],
    ], sable.lit, sable.shade);
    const endW = 0.3 * mw;
    ctx.beginPath();
    ctx.ellipse(l, my, endW * 0.5, 0.5 * mh, 0, 0, TAU);
    ctx.fillStyle = sable.shade;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(mr, my, endW * 0.5, 0.5 * mh, 0, 0, TAU);
    ctx.fillStyle = sable.shade;
    ctx.fill();

    // two arm-lobes poke out of each muff end, the outer two jittering 1px
    const armR = 0.06 * h;
    for (const sgn of [-1, 1]) {
      const ex = cx + sgn * (0.5 * mw + 0.03 * h);
      const ey = my + Math.sin(G.t * 1.7 + o.ph + sgn) * 1;
      circSplit(ctx, () => { ctx.beginPath(); ctx.arc(ex, ey, armR, 0, TAU); },
        ex - 0.2 * armR, o.lit, o.shade, armR * 2);
    }
  }

  /* 4. needle: bare until `dress`, then pitched up onto its rear barb, a
     deerstalker skewered on the front tip through a cut hole */
  function needle(ctx, o, x, y, h, p) {
    const dressed = o.bro ? false : (o.dressed != null ? o.dressed : (O.dressNow ? O.dressNow() : false));
    if (dressed && window.GenAttire && window.GenEldPal) needleDressed(ctx, o, x, y, h, p);
    else needleBare(ctx, o, x, y, h, p);
  }

  /* 4b. needle — thin double-pointed spine, flat horizontal lit/shade cut */
  function needleBare(ctx, o, x, y, h, p) {
    const cx = x, cy = y - 0.5 * h;
    const hl = 0.95 * h, th = Math.max(2, 0.07 * h);
    const pitch = Math.sin(G.t * 1.7 + o.ph) * 0.15;
    const dx = Math.cos(pitch) * o.side, dy = Math.sin(pitch);
    const nx = -dy, ny = dx;
    const tipA = [cx + dx * hl, cy + dy * hl], tipB = [cx - dx * hl, cy - dy * hl];
    const midA = [cx + nx * th * 0.5, cy + ny * th * 0.5];
    const midB = [cx - nx * th * 0.5, cy - ny * th * 0.5];
    const pts = [tipA, midA, tipB, midB];
    Paint.poly(ctx, pts);
    ctx.fillStyle = o.lit;
    ctx.fill();
    ctx.save();
    Paint.poly(ctx, pts);
    ctx.clip();
    ctx.fillStyle = o.shade;
    ctx.fillRect(cx - hl - th, cy, 2 * (hl + th), hl + th + 10);
    ctx.restore();
    const back = 35 * Math.PI / 180;
    const bx = nx * Math.cos(back) - dx * Math.sin(back);
    const by = ny * Math.cos(back) - dy * Math.sin(back);
    const bw = Math.max(1, 0.03 * h), blen = 0.26 * h;
    for (let k = 0; k < 3; k++) {
      const t = -0.3 + k * 0.3;
      const px = cx + dx * hl * t, py = cy + dy * hl * t;
      line(ctx, [[px, py], [px + bx * blen, py + by * blen]], o.lit, bw);
    }
  }

  /* 4c. needle, dressed — the spine pitched up 70 deg to stand on its rear
     barb, front tip thrust up like a beak, 3 barbs a side, a deerstalker
     skewered on the tip through a cut hole, flaps swinging loose a frame
     late */
  function needleDressed(ctx, o, x, y, h, p) {
    const GA = window.GenAttire;
    const side = o.side == null ? 1 : o.side;
    if (!o._att) {
      const seed = (o.idx || 0) + 1;
      o._att = { hat: { kind: "deerstalker", fit: "found", seed, flap: 1.2, rot: 0 } };
    }
    if (h <= 0) return;

    const elev = 70 * Math.PI / 180;
    const ux = Math.cos(elev) * side, uy = -Math.sin(elev);
    const L = 1.9 * h, th = Math.max(2, 0.07 * h);
    const rearX = x, rearY = y; // rear barb, planted on the deck
    const frontX = rearX + ux * L, frontY = rearY + uy * L; // front tip, the beak
    const nx = -uy, ny = ux;
    const midX = mix(rearX, frontX, 0.5), midY = mix(rearY, frontY, 0.5);
    const pts = [
      [frontX, frontY],
      [midX + nx * th * 0.5, midY + ny * th * 0.5],
      [rearX, rearY],
      [midX - nx * th * 0.5, midY - ny * th * 0.5],
    ];
    litSplit(ctx, pts, o.lit, o.shade);

    // 3 barbs a side along the shaft
    const back = 35 * Math.PI / 180;
    const bw = Math.max(1, 0.03 * h), blen = 0.26 * h;
    for (const sgn of [-1, 1]) {
      const bx = nx * Math.cos(back) * sgn - ux * Math.sin(back);
      const by = ny * Math.cos(back) * sgn - uy * Math.sin(back);
      for (let k = 0; k < 3; k++) {
        const t = 0.2 + k * 0.22;
        const px = mix(rearX, frontX, t), py = mix(rearY, frontY, t);
        line(ctx, [[px, py], [px + bx * blen, py + by * blen]], o.lit, bw);
      }
    }

    // the deerstalker, perched back from the tip so the beak pokes through
    // a cut hole in the crown
    const capSize = 0.3 * L;
    const capX = frontX - ux * capSize * 0.35, capY = frontY - uy * capSize * 0.35;
    GA.draw(ctx, "hat", capX, capY, capSize, o._att.hat);
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(frontX, frontY, th * 0.6, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /* 5. slab: bare until `dress`, then the found suit (D27): a frock coat cut for a
     narrower body that can't close, empty sleeves, cinched found trousers, a
     half-sprung gibus the middle spike pierces */
  function slab(ctx, o, x, y, h, p) {
    const dressed = o.dressed != null ? o.dressed : (O.dressNow ? O.dressNow() : false);
    if (dressed && window.GenAttire && window.GenEldPal) slabDressed(ctx, o, x, y, h, p);
    else slabBare(ctx, o, x, y, h, p);
  }

  /* 5b. slab — fat chamfered block that shuffles by tilting front/back */
  function slabBare(ctx, o, x, y, h, p) {
    const w = 1.45 * h, ht = 0.62 * h, c = 0.15 * h;
    const tilt = Math.sin(p.phase) * 0.06;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    const l = -0.5 * w, r = 0.5 * w, top = -ht;
    litSplit(ctx, [
      [l + c, 0], [r - c, 0], [r, -c], [r, top + c], [r - c, top],
      [l + c, top], [l, top + c], [l, -c],
    ], o.lit, o.shade);
    for (let k = 0; k < 3; k++) {
      const tx = mix(l + 0.2 * w, r - 0.2 * w, k / 2);
      Paint.poly(ctx, [[tx - 0.05 * h, top], [tx + 0.05 * h, top], [tx, top - 0.17 * h]]);
      ctx.fillStyle = o.shade;
      ctx.fill();
    }
    ctx.restore();
  }

  /* 5c. slab, dressed: the found suit — a coat that can't close, empty sleeves,
     cinched trousers, a half-sprung gibus the middle spike pierces */
  function slabDressed(ctx, o, x, y, h, p) {
    const GA = window.GenAttire, GP = window.GenEldPal;
    const phase = isFinite(p.phase) ? p.phase : 0;
    const tilt = Math.sin(phase) * 0.06;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);

    if (!o._att) {
      const seed = (o.idx || 0) + 1;
      o._att = {
        trousers: { kind: "found", fit: "found", len: 0.9, seed },
        coat: { kind: "frock", fit: "found", len: 0.7, seed },
        hat: { kind: "gibus", fit: "found", open: 0.5, rot: -0.10, lift: 0, seed },
      };
    }
    const att = o._att;

    const w = 1.45 * h, ht = 0.62 * h, c = 0.15 * h, rise = 0.16 * h;
    const l = -0.5 * w, r = 0.5 * w, bot = -rise, top = -rise - ht;
    litSplit(ctx, [
      [l + c, bot], [r - c, bot], [r, bot - c], [r, top + c], [r - c, top],
      [l + c, top], [l, top + c], [l, bot - c],
    ], o.lit, o.shade);

    for (let k = 0; k < 3; k += 2) {
      const tx = mix(l + 0.2 * w, r - 0.2 * w, k / 2);
      Paint.poly(ctx, [[tx - 0.05 * h, top], [tx + 0.05 * h, top], [tx, top - 0.17 * h]]);
      ctx.fillStyle = o.shade;
      ctx.fill();
    }

    GA.draw(ctx, "trousers", 0, -0.36 * h, 0.40 * h, att.trousers);

    const sC = 0.69 * h, neckY = top;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(side < 0 ? -2 * h : 0, top - h, 2 * h, 3 * h);
      ctx.clip();
      ctx.translate(-side * 0.03 * h, neckY);
      ctx.rotate(side * 0.14);
      ctx.translate(0, -neckY);
      GA.draw(ctx, "coat", 0, neckY, sC, att.coat);
      ctx.restore();
    }

    const tw = GP.tone("tweed") || { lit: o.lit, mid: o.shade, shade: o.shade };
    const coal = GP.tone("coal") || { lit: o.lit, mid: o.shade, shade: o.shade };
    for (const side of [-1, 1]) {
      const sx = side * 0.36 * h, sy = top + 0.04 * h;
      const bx = side * 0.44 * h, by = -0.05 * h;
      Paint.poly(ctx, [[sx - 0.04 * h, sy], [sx + 0.04 * h, sy], [bx + 0.035 * h, by], [bx - 0.035 * h, by]]);
      ctx.fillStyle = side < 0 ? tw.lit : tw.shade;
      ctx.fill();
      Paint.poly(ctx, [[bx - 0.03 * h, by - 0.012 * h], [bx + 0.03 * h, by - 0.012 * h], [bx + 0.03 * h, by], [bx - 0.03 * h, by]]);
      ctx.fillStyle = coal.shade;
      ctx.fill();
    }

    const slate = GP.tone("slate") || tw;
    Paint.poly(ctx, [[-0.26 * h, top + 0.30 * h], [-0.16 * h, top + 0.28 * h], [-0.15 * h, top + 0.38 * h], [-0.25 * h, top + 0.40 * h]]);
    ctx.fillStyle = slate.mid;
    ctx.fill();

    const sH = 0.20 * h;
    GA.draw(ctx, "hat", 0.04 * h, top, sH, att.hat);

    const crownY = top - 0.9 * sH;
    Paint.poly(ctx, [[-0.022 * h, crownY + 0.03 * h], [0.028 * h, crownY + 0.03 * h], [0.01 * h, crownY - 0.10 * h]]);
    ctx.fillStyle = o.shade;
    ctx.fill();

    ctx.restore();
  }

  /* 6. bloom: bare until `dress`, then a poke bonnet tied on the one bulb
     forced up on a stalk, with two oxblood tie tails */
  function bloom(ctx, o, x, y, h, p) {
    const dressed = o.bro ? false : (o.dressed != null ? o.dressed : (O.dressNow ? O.dressNow() : false));
    if (dressed && window.GenAttire && window.GenEldPal) bloomDressed(ctx, o, x, y, h, p);
    else bloomBare(ctx, o, x, y, h, p);
  }

  /* 6b. bloom — low wobbling blob with five pulsing wet bulbs */
  function bloomBare(ctx, o, x, y, h, p) {
    const face = o.side >= 0 ? 1 : -1;
    const len = 1.2 * h, height = 0.55 * h, N = 12;
    const raw = [];
    let vMin = Infinity, vMax = -Infinity;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * TAU;
      const u = -face * Math.cos(t) * len * 0.5;
      const v = Math.sin(t) * Math.sin(t / 2);
      raw.push([u, v]);
      if (v < vMin) vMin = v;
      if (v > vMax) vMax = v;
    }
    const vs = height / Math.max(1e-4, vMax - vMin);
    const pts = raw.map(([u, v]) => [x + u, y + (v - vMax) * vs]);
    litSplit(ctx, pts, o.lit, o.shade);
    const nearK = face > 0 ? 4 : 0;
    for (let k = 0; k < 5; k++) {
      const bx = x + (k - 2) * 0.18 * h, by = y - height * 0.75;
      const pulse = 1 + 0.08 * Math.sin(G.t * 3 + k);
      let br = mix(0.1 * h, 0.16 * h, hash1(o.idx * 7 + k)) * pulse;
      if (k === nearK) br *= 1.6;
      circSplit(ctx, () => { ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); },
        bx - 0.2 * br, o.lit, o.shade, br * 2);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillRect(bx - 0.35 * br, by - 0.35 * br, 1, 1);
    }
  }

  /* 6c. bloom, dressed — the slug shortened, four bulbs shrunk to a row on
     its back, and the one front bulb forced up on a swan-neck stalk, tied
     into a poke bonnet with two oxblood tails dropped down the stalk */
  function bloomDressed(ctx, o, x, y, h, p) {
    const GA = window.GenAttire, GP = window.GenEldPal;
    const face = o.side >= 0 ? 1 : -1;
    if (!o._att) {
      const seed = (o.idx || 0) + 1;
      o._att = { hat: { kind: "bonnet", fit: "found", seed, reach: 1.5, lift: 0 } };
    }

    // the shortened slug, same lobed silhouette formula, 0.7 hf long
    const len = 0.7 * h, height = 0.4 * h, N = 12;
    const raw = [];
    let vMin = Infinity, vMax = -Infinity;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * TAU;
      const u = -face * Math.cos(t) * len * 0.5;
      const v = Math.sin(t) * Math.sin(t / 2);
      raw.push([u, v]);
      if (v < vMin) vMin = v;
      if (v > vMax) vMax = v;
    }
    const vs = height / Math.max(1e-4, vMax - vMin);
    const pts = raw.map(([u, v]) => [x + u, y + (v - vMax) * vs]);
    litSplit(ctx, pts, o.lit, o.shade);

    // four bulbs shrunk into a row along the back, still pulsing bare
    const bulbR = 0.09 * h;
    for (let k = 0; k < 4; k++) {
      const u = k / 3;
      const bx = x - face * (0.1 * h + u * 0.35 * h);
      const by = y - height * 0.85;
      const pulse = 1 + 0.06 * Math.sin(G.t * 3 + k);
      const br = bulbR * pulse;
      circSplit(ctx, () => { ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); },
        bx - 0.2 * br, o.lit, o.shade, br * 2);
    }

    // the front bulb, forced up alone on a 0.6 hf stalk with a swan-neck
    // curve, the one tied on
    const stalkH = 0.6 * h;
    const stalkBaseX = x + face * 0.28 * h, stalkBaseY = y - height * 0.7;
    const neckX = stalkBaseX + face * 0.12 * h, neckY = stalkBaseY - stalkH * 0.55;
    const bulbX = stalkBaseX, bulbY = stalkBaseY - stalkH;
    line(ctx, [[stalkBaseX, stalkBaseY], [neckX, neckY], [bulbX, bulbY]], o.lit, Math.max(1, 0.05 * h));
    const frontR = bulbR * 1.6;
    const pulseF = 1 + 0.08 * Math.sin(G.t * 3 + 4);
    circSplit(ctx, () => { ctx.beginPath(); ctx.arc(bulbX, bulbY, frontR * pulseF, 0, TAU); },
      bulbX - 0.2 * frontR, o.lit, o.shade, frontR * 2);

    // the poke bonnet, tied on the raised bulb: too big for the bulb but
    // scaled to the body (0.55x the slug's length), camel with its inside
    // naturally dark from the tone split
    GA.draw(ctx, "hat", bulbX, bulbY, 0.55 * len, o._att.hat);

    // two oxblood tie tails, swaying a frame late, clamped above the deck
    const oxblood = GP.tone("oxblood") || { lit: o.lit, mid: o.shade, shade: o.shade };
    const tailStartY = bulbY + frontR * 0.6;
    const tailLen = Math.min(2 * stalkH, 0.45 * (y - tailStartY));
    const lag = G.t - 0.05;
    const WX = window.GenAttire && window.GenAttire.weather;
    const w = WX ? (WX.w || 0) : 0, wt = WX ? (WX.t || 0) : 0;
    for (let t = 0; t < 2; t++) {
      const tx0 = bulbX + (t === 0 ? -0.1 * h : 0.1 * h);
      const sway = Math.sin(lag * 2 + o.ph + t) * 0.05 * h;
      const tailEndY = Math.min(tailStartY + tailLen, y - 0.04 * h);
      const windX = tailLen * (w * 0.40 + 0.08 * Math.abs(w) * Math.sin(2 * Math.PI * 1.8 * wt + t));
      line(ctx, [[tx0, tailStartY], [tx0 + sway + windX, tailEndY]], oxblood.lit, Math.max(1, 0.03 * h));
    }
  }

  /* 7. comb: bare until `dress`, then linen spats on the teeth and a
     tweed capelet slid rearward on the bar */
  function comb(ctx, o, x, y, h, p) {
    const dressed = o.bro ? false : (o.dressed != null ? o.dressed : (O.dressNow ? O.dressNow() : false));
    if (dressed && window.GenAttire && window.GenEldPal) combDressed(ctx, o, x, y, h, p);
    else combBare(ctx, o, x, y, h, p);
  }

  /* 7b. comb — bar with a travelling wave of hanging teeth */
  function combBare(ctx, o, x, y, h, p) {
    const w = 1.2 * h;
    const barTop = y - 0.96 * h, barBot = y - 0.8 * h;
    litSplit(ctx, [
      [x - 0.5 * w, barTop], [x + 0.5 * w, barTop], [x + 0.5 * w, barBot], [x - 0.5 * w, barBot],
    ], o.lit, o.shade);
    const tw = Math.max(1, 0.05 * h);
    for (let k = 0; k < 9; k++) {
      const tx = mix(x - 0.5 * w + 0.05 * w, x + 0.5 * w - 0.05 * w, k / 8);
      const shift = Math.sin(p.phase + k * 0.7) * 0.05 * h;
      const col = k >= 5 ? o.shade : o.lit;
      line(ctx, [[tx, barBot], [tx + shift, y]], col, tw);
    }
  }

  /* 7c. comb, dressed — the flat bar bowed into a crescent spine on six
     jointed walking legs, linen spats at the ankles, and a tweed capelet
     slid rearward off the spine, no elbows to catch it */
  function combDressed(ctx, o, x, y, h, p) {
    const GP = window.GenEldPal;
    const linen = GP.tone("linen") || { lit: o.lit, mid: o.shade, shade: o.shade };
    const coal = GP.tone("coal") || { lit: o.lit, mid: o.shade, shade: o.shade };
    const tweed = GP.tone("tweed") || { lit: o.lit, mid: o.shade, shade: o.shade };
    const side = o.side == null ? 1 : o.side;
    const half = 0.55 * h, apexY = y - 0.82 * h, baseY = y - 0.62 * h;
    const thick = 0.12 * h;
    const a = (baseY - apexY) / (half * half);
    const n = 8;
    const topPts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const sx = x - half + u * 2 * half;
      const dx = sx - x;
      topPts.push([sx, apexY + a * dx * dx]);
    }
    const botPts = topPts.map(([sx, sy]) => [sx, sy + thick]);
    if (!o._att) o._att = { seed: (o.idx || 0) + 1 };
    litSplit(ctx, topPts.concat(botPts.slice().reverse()), o.lit, o.shade);

    // the head knob at the front (side) end, with its own pale slit eye
    const headX = x + side * half, headY = baseY + 0.5 * thick;
    const headR = 0.09 * h;
    circSplit(ctx, () => { ctx.beginPath(); ctx.arc(headX, headY, headR, 0, TAU); },
      headX - 0.2 * headR, o.lit, o.shade, headR * 2);
    ctx.beginPath();
    ctx.ellipse(headX, headY, 0.008 * h, 0.03 * h, 0, 0, TAU);
    ctx.fillStyle = "rgba(210,214,210,0.85)";
    ctx.fill();

    // six jointed legs, knee bent forward, walking with a travelling shift
    const legW = Math.max(1, 0.045 * h);
    const spatW = Math.max(1, 0.07 * h);
    for (let k = 0; k < 6; k++) {
      const u = k / 5;
      const sx = x - half + u * 2 * half;
      const dx = sx - x;
      const hipY = apexY + a * dx * dx + thick;
      const front = side > 0 ? u : (1 - u);
      const col = front > 0.5 ? o.lit : o.shade;
      const shift = Math.sin(p.phase + k * 0.7) * 0.05 * h;
      const kneeX = sx + 0.05 * h, kneeY = mix(hipY, y, 0.55);
      const footX = sx + shift, footY = y;
      line(ctx, [[sx, hipY], [kneeX, kneeY]], col, legW);
      line(ctx, [[kneeX, kneeY], [footX, footY]], col, legW);
      // linen spats on the bottom 30% of the leg, a coal button on the outer side
      const spatSx = mix(kneeX, footX, 0.7), spatSy = mix(kneeY, footY, 0.7);
      line(ctx, [[spatSx, spatSy], [footX, footY]], linen.lit, spatW);
      const bx = mix(spatSx, footX, 0.5) + 0.5 * spatW, by = mix(spatSy, footY, 0.5);
      ctx.beginPath();
      ctx.arc(bx, by, Math.max(1, 0.012 * h), 0, TAU);
      ctx.fillStyle = coal.shade;
      ctx.fill();
    }

    // the tweed capelet, slid rearward off the spine, no elbows to catch it
    const spineLen = 2 * half;
    const capW = 0.45 * spineLen, capH = 0.18 * h;
    const capCx = mix(x, x - side * half, 0.6);
    ctx.beginPath();
    ctx.ellipse(capCx, baseY, 0.5 * capW, capH, 0, 0, Math.PI);
    ctx.fillStyle = tweed.mid;
    ctx.fill();
  }

  /* 8. veil: bare until `dress`, then hung vertical from a shoulder line
     under a heavy Inverness cape, slipping off the lightest body */
  function veil(ctx, o, x, y, h, p) {
    const dressed = o.bro ? false : (o.dressed != null ? o.dressed : (O.dressNow ? O.dressNow() : false));
    if (dressed && window.GenAttire && window.GenEldPal) veilDressed(ctx, o, x, y, h, p);
    else veilBare(ctx, o, x, y, h, p);
  }

  /* 8b. veil — a rippling sheet of cloth, the one without an eye */
  function veilBare(ctx, o, x, y, h, p) {
    const half = 0.9 * h, amp = 0.08 * h;
    const topY = y - 0.82 * h, botY = y - 0.16 * h;
    const phase = G.t * 2.2 + o.ph;
    const topPts = [], botPts = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8, px = x - half + u * 2 * half;
      topPts.push([px, topY + Math.sin(phase + u * TAU) * amp]);
      botPts.push([px, botY + Math.sin(phase + 1.2 + u * TAU) * amp]);
    }
    const prevA = ctx.globalAlpha;
    ctx.globalAlpha = prevA * 0.75;
    Paint.poly(ctx, topPts.concat(botPts.slice().reverse()));
    ctx.fillStyle = o.lit;
    ctx.fill();
    const bandH = 0.25 * (botY - topY);
    const bandPts = botPts.map(([px, py]) => [px, py - bandH]).concat(botPts.slice().reverse());
    Paint.poly(ctx, bandPts);
    ctx.fillStyle = o.shade;
    ctx.fill();
    ctx.globalAlpha = prevA;
    for (let k = 0; k < 3; k++) {
      const u = (k + 0.5) / 3, bx = x - half + u * 2 * half;
      const by = botY + Math.sin(phase + 1.2 + u * TAU) * amp;
      const sway = Math.sin(G.t * 2 + k) * 0.05 * h;
      line(ctx, [[bx, by], [bx + sway, by + 0.26 * h]], o.lit, 1);
    }
  }

  /* 8c. veil, dressed — the floating band hung vertical from a shoulder
     line like a sheet dropped on a peg, under a heavy Inverness cape
     tipped and slipping off the lightest body */
  function veilDressed(ctx, o, x, y, h, p) {
    const GA = window.GenAttire;
    if (!o._att) {
      const seed = (o.idx || 0) + 1;
      o._att = { coat: { kind: "inverness", fit: "found", seed, rot: 12 * Math.PI / 180, lift: 0 } };
    }

    // the new body: a thin sheet hanging from a shoulder line, 0.9 x 0.6 hf,
    // at 0.75 alpha, still rippling
    const shoulderY = y - 0.85 * h;
    const halfW = 0.45 * h, sheetH = 0.6 * h;
    const topY = shoulderY, botY = shoulderY + sheetH;
    const phase = G.t * 2.2 + o.ph;
    const topPts = [], botPts = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8, px = x - halfW + u * 2 * halfW;
      topPts.push([px, topY + Math.sin(phase + u * TAU) * 0.02 * h]);
      botPts.push([px, botY + Math.sin(phase + 1.2 + u * TAU) * 0.02 * h]);
    }
    const prevA = ctx.globalAlpha;
    ctx.globalAlpha = prevA * 0.75;
    Paint.poly(ctx, topPts.concat(botPts.slice().reverse()));
    ctx.fillStyle = o.lit;
    ctx.fill();
    ctx.globalAlpha = prevA;

    // the garment: an opaque tweed Inverness cape from the shoulder line,
    // tipped 12 deg so its heavier right side rides low, its stepped
    // double hem the tell
    GA.draw(ctx, "coat", x, shoulderY, 0.5 * h, o._att.coat);
  }

  /* 9. knot: bare until `dress`, then the two rings uncrossed and stacked,
     the lower a wheel rolling on the deck, the upper a halo, caged in a
     crinolette of open gunmetal hoops */
  function knot(ctx, o, x, y, h, p) {
    const dressed = o.bro ? false : (o.dressed != null ? o.dressed : (O.dressNow ? O.dressNow() : false));
    if (dressed && window.GenAttire && window.GenEldPal) knotDressed(ctx, o, x, y, h, p);
    else knotBare(ctx, o, x, y, h, p);
  }

  /* 9b. knot — two overlapped rings turning against each other */
  function knotBare(ctx, o, x, y, h, p) {
    const cy = y - 0.45 * h;
    const turn = -p.phase * 0.6;
    ctx.lineWidth = 0.10 * h;
    for (let k = 0; k < 2; k++) {
      const rot = turn + (k === 0 ? 0.9 : -0.9);
      ctx.save();
      ctx.translate(x, cy);
      ctx.rotate(rot);
      ctx.strokeStyle = k === 0 ? o.lit : o.shade;
      ctx.beginPath();
      ctx.ellipse(0, 0, 0.5 * h, 0.18 * h, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* 9c. knot, dressed — the two rings uncrossed and stacked: the lower a
     wheel rolling flat on the deck, the upper a halo held above it, caged
     between them by an open crinolette of gunmetal hoops on two tapes */
  function knotDressed(ctx, o, x, y, h, p) {
    const GP = window.GenEldPal;
    if (h <= 0) return;
    const gm = GP.tone("gunmetal") || { lit: "#7c8288", mid: "#4a4e52", shade: "#2c2e30" };

    const wheelR = 0.35 * h, haloR = 0.22 * h, gap = 0.1 * h;
    const wy = y - wheelR;
    const hy = wy - wheelR - gap - haloR;

    // the lower wheel, rolling one slot per beat
    const nHoop = 5, slot = TAU / nHoop;
    const roll = Math.floor(p.phase / slot) * slot;
    ctx.save();
    ctx.translate(x, wy);
    ctx.rotate(roll);
    ctx.strokeStyle = o.lit;
    ctx.lineWidth = Math.max(1, 0.06 * h);
    ctx.beginPath();
    ctx.arc(0, 0, wheelR, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = o.shade;
    ctx.lineWidth = Math.max(1, 0.03 * h);
    for (let k = 0; k < 5; k++) {
      const a = k * slot;
      line(ctx, [[0, 0], [Math.cos(a) * wheelR, Math.sin(a) * wheelR]], o.shade, 1);
    }
    ctx.restore();

    // the upper halo, held still above
    ctx.strokeStyle = o.lit;
    ctx.lineWidth = Math.max(1, 0.05 * h);
    ctx.beginPath();
    ctx.ellipse(x, hy, haloR, haloR * 0.4, 0, 0, TAU);
    ctx.stroke();

    // the crinolette cage: 5 open gunmetal hoops between the wheel and the
    // halo, on 2 vertical tapes, the backdrop showing through
    const cageHalfW = 1.3 * wheelR;
    const cageTop = hy + haloR, cageBot = y;
    ctx.lineWidth = 1;
    for (let k = 0; k < 5; k++) {
      const u = k / 4;
      const cy2 = mix(cageBot, cageTop, u);
      const rx = cageHalfW * (1 - 0.15 * u);
      ctx.strokeStyle = gm.lit;
      ctx.beginPath();
      ctx.ellipse(x, cy2, rx, 0.06 * h, 0, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();
      ctx.strokeStyle = gm.shade;
      ctx.beginPath();
      ctx.ellipse(x, cy2, rx, 0.06 * h, 0, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();
    }
    for (const sgn of [-1, 1]) {
      line(ctx, [[x + sgn * cageHalfW * 0.6, cageBot], [x + sgn * cageHalfW * 0.45, cageTop]], gm.lit, 1);
    }
  }

  /* 10. husk — soft flesh body under four gapped stone plates, on two
     stubby stepping blocks */
  function husk(ctx, o, x, y, h, p) {
    const breathe = 1 + 0.06 * Math.sin(G.t * 2.5 + o.ph);
    const rx = 0.45 * h * breathe, ry = 0.32 * h * breathe;
    const cy = y - 0.5 * h;
    const face = o.side >= 0 ? 0 : Math.PI;
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? -1 : 1;
      const lift = side < 0 ? Math.max(0, Math.sin(p.phase)) * 0.06 * h
                            : Math.max(0, -Math.sin(p.phase)) * 0.06 * h;
      Paint.rect(ctx, x + side * 0.2 * h - 0.095 * h, y - 0.19 * h - lift, x + side * 0.2 * h + 0.095 * h, y - lift, o.shade);
    }
    ctx.beginPath();
    ctx.ellipse(x, cy, rx, ry, 0, 0, TAU);
    ctx.fillStyle = "#96404a";
    ctx.fill();
    const gap = 0.06;
    for (let k = 0; k < 4; k++) {
      const a0 = face - Math.PI * 0.25 + k * Math.PI * 0.5 + gap;
      const a1 = face - Math.PI * 0.25 + (k + 1) * Math.PI * 0.5 - gap;
      const outer = [], inner = [];
      for (let i = 0; i <= 3; i++) {
        const a = mix(a0, a1, i / 3);
        outer.push([x + Math.cos(a) * rx * 1.15, cy + Math.sin(a) * ry * 1.15]);
        inner.push([x + Math.cos(a) * rx * 0.65, cy + Math.sin(a) * ry * 0.65]);
      }
      litSplit(ctx, outer.concat(inner.reverse()), o.lit, o.shade);
      if (k === 0) eyeDot(ctx, x + Math.cos(face) * rx * 0.95, cy + Math.sin(face) * ry * 0.95, h, p.look, 0.014 * h);
    }
  }

  /* 11. chime: bare until `dress`, then the three rings fused into one bell
     with fur earmuffs and a striped comforter */
  function chime(ctx, o, x, y, h, p) {
    const dressed = o.bro ? false : (o.dressed != null ? o.dressed : (O.dressNow ? O.dressNow() : false));
    if (dressed && window.GenAttire && window.GenEldPal) chimeDressed(ctx, o, x, y, h, p);
    else chimeBare(ctx, o, x, y, h, p);
  }

  /* 11b. chime — three swaying floating rings that periodically ring out */
  function chimeBare(ctx, o, x, y, h, p) {
    const radii = [0.32 * h, 0.18 * h, 0.1 * h];
    const centers = [];
    let cy = y - 0.3 * h;
    for (let k = 0; k < 3; k++) {
      cy -= radii[k];
      const sway = Math.sin(G.t * 2 + k) * 0.04 * h;
      centers.push([x + sway, cy]);
      cy -= radii[k] + 0.06 * h;
    }
    ctx.lineWidth = Math.max(1, 0.06 * h);
    ctx.strokeStyle = o.lit;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(centers[k][0], centers[k][1], radii[k], 0, TAU);
      ctx.stroke();
    }
    const frac = ((G.t + o.ph) % 2.2) / 2.2;
    const midC = centers[1];
    const prevA = ctx.globalAlpha;
    ctx.globalAlpha = prevA * (1 - frac) * 0.5;
    ctx.lineWidth = Math.max(1, 0.02 * h);
    ctx.beginPath();
    ctx.arc(midC[0], midC[1], 0.2 * h + frac * 0.9 * h, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = prevA;
  }

  /* 11c. chime, dressed — the three rings fused into one solid bell: a
     bell body, a ringed head with a cut hole, fur earmuffs clamped on with
     no ears to hold them, and a striped comforter wrapped twice round the
     neck with two tails dropped and lying flat on the deck */
  function chimeDressed(ctx, o, x, y, h, p) {
    const GA = window.GenAttire, GP = window.GenEldPal;
    const side = o.side == null ? 1 : o.side;
    if (!o._att) {
      const seed = (o.idx || 0) + 1;
      o._att = { seed };
    }

    // the bell body: a trapezoid with a softly rounded top
    const baseHalf = 0.25 * h, topHalf = 0.13 * h;
    const baseY = y, topY = y - 0.55 * h;
    const bulge = 0.04 * h, nTop = 4;
    const bellPts = [[x - baseHalf, baseY], [x + baseHalf, baseY], [x + topHalf, topY]];
    for (let i = 1; i < nTop; i++) {
      const u = i / nTop;
      const tx = mix(topHalf, -topHalf, u);
      const ty = topY - Math.sin(u * Math.PI) * bulge;
      bellPts.push([x + tx, ty]);
    }
    bellPts.push([x - topHalf, topY]);
    litSplit(ctx, bellPts, o.lit, o.shade);

    // the ring head, swaying, with a cut hole through it
    const headY = y - 0.78 * h;
    const headX = x + Math.sin(G.t * 2 + 1) * 0.04 * h;
    const headR = 0.14 * h;
    circSplit(ctx, () => { ctx.beginPath(); ctx.arc(headX, headY, headR, 0, TAU); },
      headX - 0.2 * headR, o.lit, o.shade, headR * 2);
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(headX, headY, 0.06 * h, 0, TAU);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.restore();

    // the fading pulse ring, kept, emitted from the head centre
    const frac = ((G.t + o.ph) % 2.2) / 2.2;
    const prevA = ctx.globalAlpha;
    ctx.strokeStyle = o.lit;
    ctx.globalAlpha = prevA * (1 - frac) * 0.5;
    ctx.lineWidth = Math.max(1, 0.02 * h);
    ctx.beginPath();
    ctx.arc(headX, headY, 0.2 * h + frac * 0.9 * h, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = prevA;

    // fur earmuffs: two pads clamped on the head's edges, joined by a band
    // arcing over the top, with no ears to hold them
    const sable = GP.tone("sable") || { lit: o.lit, mid: o.shade, shade: o.shade };
    const padR = 0.05 * h;
    const padLX = headX - headR, padRX = headX + headR;
    ctx.beginPath();
    ctx.arc(padLX, headY, padR, 0, TAU);
    ctx.fillStyle = sable.mid;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(padRX, headY, padR, 0, TAU);
    ctx.fillStyle = sable.mid;
    ctx.fill();
    ctx.strokeStyle = sable.mid;
    ctx.lineWidth = Math.max(1, 0.012 * h);
    ctx.beginPath();
    ctx.arc(headX, headY, headR, Math.PI, 2 * Math.PI);
    ctx.stroke();

    // a striped comforter wrapped twice round the neck, with two tails
    // dropped to the deck on the rear side, lying flat, fringed at the ends
    const bottle = GP.tone("bottle") || { lit: o.lit, mid: o.shade, shade: o.shade };
    const camel = GP.tone("camel") || { lit: o.lit, mid: o.shade, shade: o.shade };
    const neckY = mix(headY, topY, 0.5);
    const neckW = 0.30 * h, neckH = 0.05 * h;
    Paint.rect(ctx, x - 0.5 * neckW, neckY - 0.5 * neckH, x + 0.5 * neckW, neckY + 0.5 * neckH, bottle.lit);
    Paint.rect(ctx, x - 0.5 * neckW, neckY + 0.5 * neckH, x + 0.5 * neckW, neckY + 1.5 * neckH, camel.lit);

    const rear = -side;
    const tailW = 0.06 * h, bandH = 0.5 * tailW, flatLen = 0.5 * h;
    const dropTopY = neckY + 1.5 * neckH, dropBotY = y;
    const dropLen = dropBotY - dropTopY;
    const totalLen = dropLen + flatLen;
    const WX = window.GenAttire && window.GenAttire.weather;
    const w = WX ? (WX.w || 0) : 0, wt = WX ? (WX.t || 0) : 0;
    for (let t = 0; t < 2; t++) {
      const tx = x + rear * 0.06 * h + (t === 0 ? -0.05 * h : 0.05 * h);
      const windAt = (dist) => {
        const frac = dist / totalLen;
        return frac * totalLen * (w * 0.30 + 0.06 * Math.abs(w) * Math.sin(2 * Math.PI * 1.6 * wt + t));
      };
      let by = dropTopY, bi = 0;
      while (by < dropBotY) {
        const bh = Math.min(bandH, dropBotY - by);
        const dx = windAt(by - dropTopY);
        Paint.rect(ctx, tx + dx - 0.5 * tailW, by, tx + dx + 0.5 * tailW, by + bh, bi % 2 === 0 ? bottle.lit : camel.lit);
        by += bandH; bi++;
      }
      const tipDx = windAt(totalLen);
      const flatEndX = tx + rear * flatLen;
      let fx = tx;
      while (Math.abs(fx - tx) < flatLen) {
        const seg = Math.min(bandH, flatLen - Math.abs(fx - tx));
        const fx2 = fx + rear * seg;
        const dx = windAt(dropLen + Math.abs(fx - tx));
        Paint.rect(ctx, Math.min(fx, fx2) + dx, y - 0.5 * tailW, Math.max(fx, fx2) + dx, y + 0.5 * tailW, bi % 2 === 0 ? bottle.lit : camel.lit);
        fx = fx2; bi++;
      }
      for (let f = 0; f < 4; f++) {
        const fx3 = flatEndX + tipDx - rear * f * 0.02 * h;
        line(ctx, [[fx3, y - 0.5 * tailW], [fx3, y - 0.5 * tailW - 0.03 * h]], o.shade, 1);
      }
    }
  }

  /* 12. prism — four splayed shards that flash a hue when they blink */
  function prism(ctx, o, x, y, h, p) {
    const dressed = o.bro ? false : (o.dressed != null ? o.dressed : (O.dressNow ? O.dressNow() : false));
    if (dressed && window.GenAttire && window.GenEldPal) prismDressed(ctx, o, x, y, h, p);
    else prismBare(ctx, o, x, y, h, p);
  }

  function prismBare(ctx, o, x, y, h, p) {
    const angles = [-0.35, -0.1, 0.12, 0.38];
    const hashes = angles.map((_, k) => hash1(o.idx * 13 + k));
    let tallest = 0;
    for (let k = 1; k < 4; k++) if (hashes[k] > hashes[tallest]) tallest = k;
    const heights = hashes.map((v, k) => k === tallest ? 1.25 * h : mix(0.35 * h, 0.7 * h, v));
    const baseW = 0.14 * h;
    for (let k = 0; k < 4; k++) {
      const a = angles[k];
      const dx = Math.sin(a), dy = -Math.cos(a);
      const nx = Math.cos(a), ny = Math.sin(a);
      const tipX = x + dx * heights[k], tipY = y + dy * heights[k];
      const pts = [
        [x - nx * baseW * 0.5, y - ny * baseW * 0.5],
        [x + nx * baseW * 0.5, y + ny * baseW * 0.5],
        [tipX, tipY],
      ];
      litSplit(ctx, pts, o.lit, o.shade);
      if (k === 1) {
        const lo = Math.min(pts[0][0], pts[1][0], pts[2][0]);
        const hi = Math.max(pts[0][0], pts[1][0], pts[2][0]);
        const xSplit = lo + 0.4 * (hi - lo);
        ctx.save();
        Paint.poly(ctx, pts);
        ctx.clip();
        ctx.fillStyle = `rgba(${o.hue},0.6)`;
        ctx.fillRect(lo - 1, y - heights[k] - 1, xSplit - lo + 1, heights[k] + 2);
        ctx.restore();
      }
    }
    if (p.sy < 0.15) {
      const hueFill = `rgb(${o.hue})`;
      for (let d = 0; d < 3; d++) {
        const ang = d * 2.4 + o.ph;
        circle(ctx, x + Math.cos(ang) * 0.3 * h, y - 0.4 * h + Math.sin(ang) * 0.2 * h, 0.04 * h, hueFill);
      }
    }
  }

  /* 12b. prism, dressed — the four shards fused into one upright obelisk on
     a splayed two-stub foot, one eye-facet low; a small veiled hat with one
     tall plume is perched at the tip, the mourning veil falling all the way
     to the base past the eye, not a face */
  function prismDressed(ctx, o, x, y, h, p) {
    if (h <= 0) return;
    const GA = window.GenAttire, GP = window.GenEldPal;
    const side = o.side == null ? 1 : o.side;
    if (!o._att) {
      const seed = (o.idx || 0) + 1;
      o._att = { seed };
    }

    // the obelisk: one tall thin upright shard
    const obH = 0.85 * h;
    const apexY = y - 0.1 * h - obH;
    const baseY = y - 0.1 * h;
    const halfW = 0.06 * h;
    const obeliskPts = [
      [x - halfW, baseY], [x + halfW, baseY],
      [x + halfW * 0.4, apexY + 0.1 * obH], [x, apexY], [x - halfW * 0.4, apexY + 0.1 * obH],
    ];
    litSplit(ctx, obeliskPts, o.lit, o.shade);

    // two stubs splayed at the base as a foot
    const footY = y;
    const stubs = [-1, 1];
    for (const s of stubs) {
      const stubPts = [
        [x, baseY], [x + s * 0.02 * h, baseY],
        [x + s * side * 0.22 * h, footY], [x + s * side * 0.14 * h, footY],
      ];
      litSplit(ctx, stubPts, o.lit, o.shade);
    }

    // one eye-facet low on the obelisk
    const eyeY = baseY - 0.12 * obH;
    eyeDot(ctx, x + side * 0.02 * h, eyeY, h, p.look, 0.05 * h);

    // the veiled hat, perched at the tip, sized a quarter of the obelisk;
    // the veil is misfit long, hanging all the way past the eye to the base
    const hatS = 0.25 * obH;
    const mourning = GP.tone("mourning") || { lit: o.lit, mid: o.shade, shade: o.shade };
    const veilFrac = (baseY - apexY) / hatS;
    GA.draw(ctx, "hat", x, apexY, hatS, Object.assign({}, o._att, {
      kind: "veiled", tone: "mourning", plume: 2, plumeTone: "plum", veil: veilFrac, lift: 0,
    }));
  }

  /* 13. swarmling — one mind, twelve orbiting specks */
  function swarmling(ctx, o, x, y, h, p) {
    const dressed = o.bro ? false : (o.dressed != null ? o.dressed : (O.dressNow ? O.dressNow() : false));
    if (dressed && window.GenAttire && window.GenEldPal) swarmlingDressed(ctx, o, x, y, h, p);
    else swarmlingBare(ctx, o, x, y, h, p);
  }

  function swarmlingBare(ctx, o, x, y, h, p) {
    const cx = x, cy = y - 0.55 * h;
    const r = Math.max(1.2, 0.05 * h);
    for (let k = 0; k < 12; k++) {
      const ang = G.t * (0.8 + k * 0.13) + k * 2.1;
      const rad = 0.4 * h * (0.5 + 0.5 * Math.sin(k));
      const px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
      circle(ctx, px, py, k === 0 ? r * 3 : r, o.lit);
    }
  }

  /* 13b. swarmling, dressed — the lead speck fuses four more into a mast;
     the other eleven hang still in a bell under it, one slot snapping at a
     time; a gamp umbrella, wide and bulging, held open overhead against a
     cold that never falls */
  function swarmlingDressed(ctx, o, x, y, h, p) {
    if (h <= 0) return;
    const GP = window.GenEldPal;
    if (!o._att) {
      const seed = (o.idx || 0) + 1;
      o._att = { seed };
    }

    // the mast: five specks fused into one slim shaft
    const mastH = 0.9 * h;
    const mastTopY = y - 0.85 * h - mastH;
    const mastBaseY = y - 0.85 * h;
    const mastW = 0.035 * h;
    const mastPts = [
      [x - mastW, mastBaseY], [x + mastW, mastBaseY],
      [x + mastW * 0.6, mastTopY], [x - mastW * 0.6, mastTopY],
    ];
    litSplit(ctx, mastPts, o.lit, o.shade);

    // the bell: eleven specks hanging still under the mast, one slot
    // snapping dark and back per beat
    const bellCY = mastBaseY + 0.2 * h;
    const bellW = 0.3 * h;
    const r = Math.max(1.2, 0.045 * h);
    const nSpecks = 11;
    const snapSlot = Math.floor((G.t + o.ph) / 0.6) % nSpecks;
    for (let k = 0; k < nSpecks; k++) {
      const u = k / (nSpecks - 1);
      const px = x + (u - 0.5) * bellW;
      const py = bellCY + Math.abs(u - 0.5) * 0.25 * h;
      const lit = k === snapSlot ? o.shade : o.lit;
      circle(ctx, px, py, r, lit);
    }

    // the gamp umbrella: bulgy, loosely tied, open overhead, three times the
    // swarm's own width, sagging in eight scallops with a ferrule on top
    const navy = GP.tone("navy") || { lit: o.lit, mid: o.shade, shade: o.shade };
    const canopyW = 3 * bellW;
    const canopyH = 0.35 * canopyW;
    const dip = 0.06 * canopyW;
    const canopyTopY = mastTopY - 0.1 * h;
    const canopyBotY = canopyTopY + canopyH;
    const nScallop = 8;
    const rimPts = [];
    for (let k = 0; k <= nScallop; k++) {
      const u = k / nScallop;
      const rx = x + (u - 0.5) * canopyW;
      rimPts.push([rx, canopyBotY]);
      if (k < nScallop) {
        const mu = (k + 0.5) / nScallop;
        const mx = x + (mu - 0.5) * canopyW;
        rimPts.push([mx, canopyBotY + dip]);
      }
    }
    const canopyPts = [[x, canopyTopY]].concat(rimPts);
    litSplit(ctx, canopyPts, navy.lit, navy.shade);

    // ferrule on top
    const pewter = GP.tone("pewter") || { lit: o.lit, mid: o.shade, shade: o.shade };
    line(ctx, [[x, canopyTopY], [x, canopyTopY - 0.06 * h]], pewter.lit, Math.max(1, 0.015 * h));
  }

  /* 14. mound — a huge low sliding hump with a single big eye */
  function mound(ctx, o, x, y, h, p) {
    const dressed = o.bro ? false : (o.dressed != null ? o.dressed : (O.dressNow ? O.dressNow() : false));
    if (dressed && window.GenAttire && window.GenEldPal) moundDressed(ctx, o, x, y, h, p);
    else moundBare(ctx, o, x, y, h, p);
  }

  function moundBare(ctx, o, x, y, h, p) {
    const rx = 0.95 * h, ry = 0.58 * h, N = 10;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const a = Math.PI + (i / N) * Math.PI;
      pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]);
    }
    for (let k = 2; k >= 0; k--) {
      const u = k / 2;
      pts.push([mix(x + rx, x - rx, u), y + Math.sin(G.t * 3 + k) * 0.02 * h]);
    }
    litSplit(ctx, pts, o.lit, o.shade);
    for (let k = 0; k < 3; k++) {
      const px = x - rx * 0.5 + k * 0.15 * rx, py = y - 0.15 * h - k * 0.05 * h;
      circle(ctx, px, py, mix(0.05 * h, 0.08 * h, hash1(o.idx * 17 + k)), o.shade);
    }
    const face = o.side >= 0 ? 1 : -1;
    eyeDot(ctx, x + face * 0.5 * rx, y - 0.38 * h, h, p.look, 0.07 * h);
  }

  /* 14b. mound, dressed — a hunched, hooded figure in a dolman mantle with
     an eye cut through the hood, a batwing hem pooling on the deck and
     trailing into a train on the rear side, and a sealskin band across
     the hem's foot */
  function moundDressed(ctx, o, x, y, h, p) {
    const GP = window.GenEldPal;
    const face = o.side >= 0 ? 1 : -1;
    if (!o._att) o._att = { kind: "dolman", fit: "found", seed: o.ph || 0 };

    const qb = (p0, c, p1, t) => [
      (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0],
      (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1],
    ];

    // the hunched, hooded body: base 0.9h wide on the deck, rising into a
    // tall forward-leaning hood; a convex back, a steeper concave front
    const baseHalf = 0.45 * h;
    const frontBase = [x + face * baseHalf, y];
    const backBase = [x - face * baseHalf, y];
    const peak = [x + face * 0.18 * h, y - 1.05 * h];
    const frontCtrl = [x + face * 0.06 * h, y - 0.55 * h];
    const backCtrl = [x - face * 0.7 * h, y - 0.45 * h];
    const nSeg = 8;
    const bodyPts = [];
    for (let i = 0; i <= nSeg; i++) bodyPts.push(qb(frontBase, frontCtrl, peak, i / nSeg));
    for (let i = 1; i <= nSeg; i++) bodyPts.push(qb(peak, backCtrl, backBase, i / nSeg));

    const eyeX = x + face * 0.22 * h, eyeY = y - 0.82 * h;

    litSplit(ctx, bodyPts, o.lit, o.shade);
    eyeDot(ctx, eyeX, eyeY, h, p.look, 0.07 * h);

    // the dolman mantle over the body: crown ridge, a batwing shoulder
    // drop, a hem twice the body's base width pooling on the deck, and a
    // train trailing further on the rear side
    const coal = GP.tone("coal") || { lit: o.lit, mid: o.shade, shade: o.shade };
    const hemHalf = 0.9 * h, trainHalf = hemHalf + 0.36 * h;
    const trainLen = trainHalf - hemHalf;
    const WX = window.GenAttire && window.GenAttire.weather;
    const w = WX ? (WX.w || 0) : 0;
    const trainDx = trainLen * (w * 0.12);
    const mantlePts = [
      [x, y - 0.95 * h],
      [x + face * 0.55 * h, y - 0.45 * h],
      [x + face * hemHalf, y - 0.1 * h],
      [x + face * hemHalf, y],
      [x - face * trainHalf + trainDx, y],
      [x - face * trainHalf + trainDx, y - 0.1 * h],
      [x - face * 0.55 * h, y - 0.45 * h],
    ];
    litSplit(ctx, mantlePts, coal.lit, coal.mid);

    // the eye hole cut through the mantle: the body and eye show through,
    // with a darker rim ring round the cut
    const holeR = 0.07 * h * 1.15;
    ctx.save();
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, holeR, 0, TAU);
    ctx.clip();
    litSplit(ctx, bodyPts, o.lit, o.shade);
    eyeDot(ctx, eyeX, eyeY, h, p.look, 0.07 * h);
    ctx.restore();
    ctx.lineWidth = Math.max(1, 0.01 * h);
    ctx.strokeStyle = coal.shade;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, holeR, 0, TAU);
    ctx.stroke();

    // the sealskin band across the hem's bottom 15%, with a highlight
    // along its lit (left) top edge
    const seal = GP.tone("seal") || GP.tone("sable") || { lit: o.lit, mid: o.shade, shade: o.shade };
    const mantleH = 0.95 * h;
    const bandTop = y - 0.15 * mantleH;
    const minX = Math.min(...mantlePts.map((pt) => pt[0]));
    const maxX = Math.max(...mantlePts.map((pt) => pt[0]));
    ctx.save();
    Paint.poly(ctx, mantlePts);
    ctx.clip();
    litSplit(ctx, [[minX, bandTop], [maxX, bandTop], [maxX, y + 0.05 * h], [minX, y + 0.05 * h]], seal.lit, seal.mid);
    ctx.restore();
    line(ctx, [[minX, bandTop], [x, bandTop]], seal.lit, 1);
  }

  Object.assign(O.PAINT, { tower, pearl, bundle, needle, slab, bloom, comb, veil, knot, husk, chime, prism, swarmling, mound });
})();
