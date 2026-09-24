/* genesis-oldones.js — the old ones: 24 grey beings, no two alike, in six
   ways of moving. They rise out of the trade wave where their blob stood,
   take the span east (or west and out of the record), halt before the
   body, climb onto it, and kneel when the seal is laid. Screen-space
   painters; feet on the deck. */
window.GenOld = (function () {
  const G = window.Gen;
  const { clamp, mix, smooth, hash1, mulberry } = Util;
  const { litShade, circle, line } = Paint;
  const { DECK, ROOT_U } = G;
  const sx = G.sx;
  const TAU = Math.PI * 2;

  /* ---- roster ---------------------------------------------------- */

  /* twenty-four old ones, no two alike: the first ten are the old kinds,
     one each; the rest are painted in genesis-oldkin.js */
  const ROSTER_SPECS = [
    ["colossus", 1, 0.27], ["strider", 1, 0.14], ["crawler", -1, 0.055], ["slider", -1, 0.07],
    ["floater", 1, 0.10], ["winged", -1, 0.07], ["blinker", 1, 0.065], ["roller", -1, 0.055],
    ["eye", 1, 0.09], ["mass", 1, 0.08],
    ["tower", 1, 0.20], ["pearl", 1, 0.06], ["bundle", 1, 0.08], ["needle", -1, 0.05],
    ["slab", 1, 0.09], ["bloom", 1, 0.07], ["comb", 1, 0.08], ["veil", -1, 0.06],
    ["knot", -1, 0.06], ["husk", 1, 0.10], ["chime", 1, 0.09], ["prism", 1, 0.08],
    ["swarmling", -1, 0.07], ["mound", 1, 0.12],
  ];
  const MOVE = {
    colossus: "walk", strider: "walk", crawler: "walk", mass: "walk",
    slider: "slide",
    floater: "fly", winged: "fly", eye: "fly",
    blinker: "blink",
    roller: "roll",
    tower: "walk", slab: "walk", comb: "walk", husk: "walk",
    pearl: "roll", knot: "roll",
    bundle: "fly", needle: "fly", veil: "fly", chime: "fly", swarmling: "fly",
    bloom: "slide", mound: "slide",
    prism: "blink",
  };
  const HUES = ["220,60,50", "70,130,255", "120,214,96", "236,92,150", "245,208,107", "140,70,210"];

  // every field a painter reads, in the fixed order the random pulls rely on;
  // shared by the roster build below and by makeOne() for a lone being
  function rollBeing(kind, side, hfLo, hfHi, rnd) {
    const g = rnd() < 0.75 ? 62 + Math.floor(rnd() * 57) : 150 + Math.floor(rnd() * 65);
    const sg = Math.round(g * 0.45);
    return {
      kind, move: MOVE[kind], side,
      hf: mix(hfLo, hfHi, rnd()),
      g, lit: `rgb(${g},${g},${g})`, shade: `rgb(${sg},${sg},${sg})`,
      gait: mix(0.7, 1.3, rnd()),
      lane: mix(-1, 1, rnd()),
      ph: rnd() * TAU,
      limbs: 3 + Math.floor(rnd() * 4),
      spin: (rnd() < 0.5 ? -1 : 1) * mix(0.1, 0.3, rnd()),
      ang: rnd() * TAU,
      sp: mix(0.6, 1.4, rnd()),
      clingAng: rnd() * TAU,
      airY: mix(0.10, 0.30, rnd()),
      blinkT: mix(1.6, 3.2, rnd()),
      bite: mix(0.7, 1.2, rnd()),
      hue: HUES[Math.floor(rnd() * 6)],
      p: {},
    };
  }

  // standard HSL -> "r,g,b" (h in 0..1), same comma format as HUES
  function hslStr(h, s, l) {
    const f = n => {
      const k = (n + h * 12) % 12;
      const a = s * Math.min(l, 1 - l);
      return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return `${Math.round(f(0) * 255)},${Math.round(f(8) * 255)},${Math.round(f(4) * 255)}`;
  }

  const ROSTER = (function build() {
    const rnd = mulberry(9001);
    const list = [];
    for (const [kind, side, hf] of ROSTER_SPECS) {
      const o = rollBeing(kind, side, hf, hf, rnd);
      o.idx = list.length;
      list.push(o);
    }
    // no two share a grey: an even spread of 24 greys, shuffled onto the roster
    const greys = list.map((o, i) => 70 + Math.round(i * 130 / 23));
    const shuffle = mulberry(9004);
    for (let i = greys.length - 1; i > 0; i--) {
      const j = Math.floor(shuffle() * (i + 1));
      const t = greys[i]; greys[i] = greys[j]; greys[j] = t;
    }
    list.forEach((o, i) => {
      const g = greys[i], sg = Math.round(g * 0.45);
      o.g = g; o.lit = `rgb(${g},${g},${g})`; o.shade = `rgb(${sg},${sg},${sg})`;
      o.hue = i < 6 ? HUES[i] : hslStr((i * 0.41) % 1, 0.65, 0.6);
    });
    return list;
  })();
  const ORDER = ROSTER.map((o, i) => i).sort((a, b) => ROSTER[a].lane - ROSTER[b].lane);

  // a single fresh being of `kind`, for files that draw an old one outside the
  // roster (Obrokxus's brothers); side is always +1, tint optionally overrides
  // the grey lit/shade with {lit, shade} CSS colour strings
  function makeOne(kind, seed, tint) {
    const spec = ROSTER_SPECS.find(s => s[0] === kind);
    const o = rollBeing(kind, 1, spec[2] * 0.8, spec[2] * 1.25, mulberry(seed));
    if (tint) { o.lit = tint.lit; o.shade = tint.shade; }
    return o;
  }

  /* ---- placement --------------------------------------------------- */

  function place(o, env) {
    const W = G.W, H = G.H, deckY = DECK * H;
    const idx = o.idx;
    const { burst, walk, cling, still, watch, flesh } = env;

    /* 1. rise out of the trade wave where their blob stood */
    const spot = window.GenTrade && GenTrade.SPOTS[o.idx];
    const ox = spot ? sx(0) + spot[0] * W : sx(0);
    const oy = spot ? spot[1] * H : 0.46 * H;
    const r = (0.01 + 0.025 * o.sp) * burst;
    const x0 = ox + Math.cos(o.ang) * r * 0.45 * W;
    const y0 = oy + Math.sin(o.ang) * r * 0.16 * H;
    const settle = smooth((burst - 0.30) / 0.55);
    const rot = (1 - settle) * (o.ang * 3 + burst * 6 * o.sp);
    const scale = mix(0.2, 1, smooth(burst * 1.3));

    /* 2. split to the deck */
    const splitU = o.side * (0.15 + 0.08 * hash1(idx * 7 + 1));
    const xd = sx(splitU), yd = deckY;
    let x = mix(x0, xd, settle);
    let y = mix(y0, yd, settle);

    /* 3. walk (or slide / roll / fly — same progress formula; blink hops) */
    const isBlinker = o.move === "blink";
    let sy = 1;
    if (o.side < 0) {
      let w = walk;
      if (isBlinker) {
        const k = w * 5, i = Math.floor(k), f = k - i;
        sy = f < 0.12 ? 1 - f / 0.12 : f < 0.24 ? (f - 0.12) / 0.12 : 1;
        w = Math.min(1, (i + (f < 0.12 ? 0 : 1)) / 5);
      }
      x = sx(splitU - o.gait * 2.2 * w);
    } else {
      const endU = ROOT_U - 0.06 - 0.10 * hash1(idx * 13 + 3);
      let prog = clamp(walk * (0.70 + 0.14 * o.gait), 0, 1);
      if (isBlinker) {
        const k = prog * 5, i = Math.floor(k), f = k - i;
        sy = f < 0.12 ? 1 - f / 0.12 : f < 0.24 ? (f - 0.12) / 0.12 : 1;
        prog = Math.min(1, (i + (f < 0.12 ? 0 : 1)) / 5);
      }
      x = mix(sx(splitU), sx(endU), prog);
    }
    const phase = Math.abs(x - xd) * 0.045 * o.gait;
    const isFlyer = o.move === "fly";
    if (isFlyer) y = deckY - o.airY * H + Math.sin(G.t * 1.1 + o.ph) * 0.03 * H;
    else y = deckY - 2 + o.lane * 0.012 * H;
    if (isFlyer) x += 0.04 * W * Math.sin(G.t * 0.5 + o.ph);

    /* 4. cling to the body */
    if (o.side > 0 && flesh && cling > 0.05) {
      const ca = o.clingAng + G.t * o.spin * (1 - 0.85 * still);
      const bite = mix(1.08, 0.86, clamp(cling * 1.4, 0, 1));
      const back = mix(1, 1.18, still);
      let tx, ty;
      if (o.kind === "colossus") {
        tx = flesh.cx - flesh.rx * 1.05 - (idx % 3) * 0.07 * W;
        ty = deckY;
      } else {
        const rr = bite * back + (isFlyer ? 0.16 : 0);
        tx = flesh.cx + Math.cos(ca) * flesh.rx * rr;
        ty = flesh.cy + Math.sin(ca) * flesh.ry * rr;
      }
      const k = smooth((cling - 0.05) / 0.55);
      x = mix(x, tx, k);
      y = mix(y, ty, k);
    }

    /* 5. kneel for the seal */
    if (isFlyer) y = mix(y, deckY - 0.05 * H, still * 0.8);

    /* 6. alpha */
    let a = clamp(4.2 * burst, 0, 1) * (x < 12 ? clamp(x / 12, 0, 1) : 1) * (1 - G.since("land"));
    if (watch > 0.5) a *= 0.55;

    const p = o.p;
    p.x = x; p.y = y; p.a = a; p.rot = rot; p.scale = scale;
    p.phase = phase; p.sy = sy; p.kneel = still;
    p.look = env.look != null ? env.look : sx(0);
    return p;
  }

  /* ---- shared paint helpers ----------------------------------------- */

  // fills a polygon lit/shade, splitting at 40% across its own bounding box.
  // under 22px tall the split would be invisible, so skip the clip and
  // just flat-fill in `lit`.
  function litSplit(ctx, pts, lit, shade) {
    let lo = Infinity, hi = -Infinity, loY = Infinity, hiY = -Infinity;
    for (const pt of pts) {
      if (pt[0] < lo) lo = pt[0]; if (pt[0] > hi) hi = pt[0];
      if (pt[1] < loY) loY = pt[1]; if (pt[1] > hiY) hiY = pt[1];
    }
    if (hiY - loY < 22) { Paint.poly(ctx, pts); ctx.fillStyle = lit; ctx.fill(); return; }
    litShade(ctx, () => Paint.poly(ctx, pts), lo + 0.4 * (hi - lo), lit, shade);
  }
  // a small pale dot nudged toward `look`, the closest thing these have to a gaze
  function eyeDot(ctx, cx, cy, h, look, r) {
    const dir = look >= cx ? 1 : -1;
    circle(ctx, cx + dir * 0.02 * h, cy, r, "rgba(210,214,210,0.85)");
  }

  /* ---- kind painters -------------------------------------------------
     h = height px, foot line at y. Every filled volume is lit/shade split
     from the left; thin-line limbs (too narrow to split) take a flat lit
     or shade colour from which side of the body they fall on. */

  function colossus(ctx, o, x, y, h, p) {
    const kneel = p.kneel;
    const bob = 0.02 * h * Math.abs(Math.sin(p.phase));
    const lower = kneel * 0.25 * h;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? -1 : 1;
      const hipX = x + side * 0.10 * h, hipY = y - 0.55 * h + lower;
      const sw = Math.sin(p.phase + k * Math.PI);
      const footX = hipX + 0.10 * h * sw;
      const footY = y - 0.04 * h * Math.max(0, sw);
      litSplit(ctx, [
        [hipX - 0.035 * h, hipY], [hipX + 0.035 * h, hipY],
        [footX + 0.035 * h, footY], [footX - 0.035 * h, footY],
      ], o.lit, o.shade);
    }
    const ty = lower - bob;
    litSplit(ctx, [
      [x - 0.11 * h, y - 0.55 * h + ty], [x + 0.11 * h, y - 0.55 * h + ty],
      [x + 0.15 * h, y - 0.90 * h + ty], [x - 0.15 * h, y - 0.90 * h + ty],
    ], o.lit, o.shade);
    const headX = x + 0.06 * h, headY = y - 0.94 * h + ty;
    litShade(ctx, () => { ctx.beginPath(); ctx.arc(headX, headY, 0.04 * h, 0, TAU); },
      headX - 0.04 * h + 0.4 * 0.08 * h, o.lit, o.shade);
    eyeDot(ctx, headX, headY, h, p.look, 0.012 * h);
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? -1 : 1;
      const shX = x + side * 0.15 * h, shY = y - 0.88 * h;
      const handX = shX - 0.10 * h * Math.sin(p.phase + k * Math.PI);
      const handY = y - 0.30 * h;
      litSplit(ctx, [
        [shX - 0.02 * h, shY], [shX + 0.02 * h, shY],
        [handX + 0.02 * h, handY], [handX - 0.02 * h, handY],
      ], o.lit, o.shade);
    }
  }

  function strider(ctx, o, x, y, h, p) {
    const bob = 0.02 * h * Math.abs(Math.sin(p.phase));
    const cx = x, cy = y - 0.85 * h + bob;
    const rx = 0.14 * h, ry = 0.09 * h;
    litShade(ctx, () => { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); },
      cx - rx + 0.4 * 2 * rx, o.lit, o.shade);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let k = 0; k < 4; k++) {
      const off = k - 1.5;
      const kneeX = x + off * 0.16 * h, kneeY = y - 1.02 * h;
      const swing = p.phase + (k % 2) * Math.PI;
      const footX = x + off * 0.22 * h + 0.06 * h * Math.sin(swing);
      const footY = y - 0.05 * h * Math.max(0, Math.sin(swing));
      const col = off < 0 ? o.lit : o.shade;
      line(ctx, [[cx, cy], [kneeX, kneeY], [footX, footY]], col, 0.015 * h);
    }
    const face = o.side >= 0 ? 1 : -1;
    eyeDot(ctx, cx + face * 0.10 * h, cy, h, p.look, 0.012 * h);
  }

  function crawler(ctx, o, x, y, h, p) {
    const bodyY = y - 0.22 * h;
    const rx = 0.50 * h, ry = 0.22 * h;
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      pts.push([x + Math.cos(a) * rx, bodyY + Math.sin(a) * ry]);
    }
    litSplit(ctx, pts, o.lit, o.shade);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let k = 0; k < 4; k++) {
      const hipX = x + (k - 1.5) * 0.2 * h, hipY = y - 0.2 * h;
      for (let s = 0; s < 2; s++) {
        const side = s === 0 ? -1 : 1;
        const kneeX = hipX + side * 0.18 * h, kneeY = y - 0.42 * h;
        const footX = hipX + side * 0.30 * h + 0.06 * h * Math.sin(p.phase * 1.6 + k * 0.8);
        const col = side < 0 ? o.lit : o.shade;
        line(ctx, [[hipX, hipY], [kneeX, kneeY], [footX, y]], col, 0.02 * h);
      }
    }
    const face = o.side >= 0 ? 1 : -1;
    eyeDot(ctx, x + face * 0.34 * h, bodyY - 0.06 * h, h, p.look, 0.012 * h);
    eyeDot(ctx, x + face * 0.34 * h, bodyY + 0.06 * h, h, p.look, 0.012 * h);
  }

  function slider(ctx, o, x, y, h, p) {
    const face = o.side >= 0 ? 1 : -1;
    const breathe = 1 + 0.08 * Math.sin(G.t * 2 + o.ph);
    const len = 0.9 * h * breathe, height = 0.30 * h;
    const N = 12;
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
    const prevA = ctx.globalAlpha;
    ctx.globalAlpha = prevA * 0.3;
    ctx.fillStyle = o.shade;
    const back = -face;
    for (let i = 0; i < 3; i++) {
      const wx = x + back * (len * 0.5 + 0.10 * h * 0.6 + i * 0.16 * h);
      ctx.fillRect(wx - 0.05 * h, y - 0.02 * h, 0.10 * h, 0.02 * h);
    }
    ctx.globalAlpha = prevA;
  }

  function floater(ctx, o, x, y, h, p) {
    const pulse = 1 + 0.05 * Math.sin(G.t * 1.1 + o.ph);
    const rx = 0.24 * h * pulse, ry = 0.16 * h * pulse;
    litShade(ctx, () => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, Math.PI, TAU); ctx.closePath(); },
      x - rx + 0.4 * 2 * rx, o.lit, o.shade);
    ctx.lineCap = "round";
    ctx.strokeStyle = o.shade;
    ctx.lineWidth = 0.02 * h;
    for (let k = 0; k < 5; k++) {
      const rimX = x + (k - 2) * (rx * 0.4), rimY = y;
      const endX = x + (k - 2) * 0.05 * h + 0.05 * h * Math.sin(G.t * 1.4 + k);
      const endY = y + 0.6 * h;
      ctx.beginPath();
      ctx.moveTo(rimX, rimY);
      ctx.quadraticCurveTo(mix(rimX, endX, 0.5), mix(rimY, endY, 0.4), endX, endY);
      ctx.stroke();
    }
    eyeDot(ctx, x, y - ry * 0.3, h, p.look, 0.012 * h);
  }

  function winged(ctx, o, x, y, h, p) {
    const yy = y + 0.06 * h * Math.sin(G.t * 1.3 + o.ph);
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? -1 : 1;
      litSplit(ctx, [
        [x, yy - 0.02 * h],
        [x + side * 0.5 * h, yy - 0.25 * h * Math.sin(G.t * 6.5 + o.ph)],
        [x + side * 0.28 * h, yy + 0.06 * h],
      ], o.lit, o.shade);
    }
    litShade(ctx, () => { ctx.beginPath(); ctx.ellipse(x, yy, 0.12 * h, 0.06 * h, 0, 0, TAU); },
      x - 0.12 * h + 0.4 * 0.24 * h, o.lit, o.shade);
  }

  function blinker(ctx, o, x, y, h, p) {
    litSplit(ctx, [
      [x, y - 0.5 * h], [x + 0.12 * h, y - 0.25 * h],
      [x, y], [x - 0.12 * h, y - 0.25 * h],
    ], o.lit, o.shade);
    if (p.sy < 0.15) {
      ctx.fillStyle = "rgba(220,222,220,0.6)";
      ctx.fillRect(x - 0.25 * h, y - 0.26 * h, 0.5 * h, 0.02 * h);
    }
  }

  function roller(ctx, o, x, y, h, p) {
    const cx = x, cy = y - 0.35 * h;
    const rot = -p.phase * 0.9;
    const rBase = 0.20 * h, rTip = 0.35 * h, rDisc = 0.12 * h;
    const halfA = Math.asin(0.3); // 0.06h base half-width on a 0.20h circle
    const trace = () => {
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = rot + (k / 8) * TAU;
        ctx.moveTo(cx + Math.cos(a - halfA) * rBase, cy + Math.sin(a - halfA) * rBase);
        ctx.lineTo(cx + Math.cos(a) * rTip, cy + Math.sin(a) * rTip);
        ctx.lineTo(cx + Math.cos(a + halfA) * rBase, cy + Math.sin(a + halfA) * rBase);
        ctx.closePath();
      }
      ctx.moveTo(cx + rDisc, cy);
      ctx.arc(cx, cy, rDisc, 0, TAU);
    };
    litShade(ctx, trace, cx - rTip + 0.4 * 2 * rTip, o.lit, o.shade);
  }

  function eyeCreature(ctx, o, x, y, h, p) {
    const r = 0.36 * h;
    ctx.lineCap = "butt";
    ctx.lineWidth = 0.10 * h;
    ctx.strokeStyle = o.lit;
    ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
    ctx.strokeStyle = o.shade;
    ctx.beginPath(); ctx.arc(x, y, r, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    const dir = p.look >= x ? 1 : -1;
    const pupilX = x + dir * 0.10 * h;
    circle(ctx, pupilX, y, 0.12 * h, o.shade);
    ctx.lineWidth = 0.02 * h;
    ctx.strokeStyle = "rgba(200,204,200,0.7)";
    ctx.beginPath(); ctx.arc(pupilX, y, 0.13 * h, 0, TAU); ctx.stroke();
  }

  function mass(ctx, o, x, y, h, p) {
    const cx = x, cy = y - 0.30 * h;
    const faceAng = o.side >= 0 ? 0 : Math.PI;
    const N = 14;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const th = (i / N) * TAU;
      const r = 0.30 * h * (1 + 0.22 * Math.sin(3 * th + G.t * 0.9 + o.ph) + 0.12 * Math.sin(5 * th - G.t * 1.3))
        + 0.12 * h * Math.max(0, Math.cos(th - faceAng)) * (0.5 + 0.5 * Math.sin(G.t * 2));
      const px = cx + Math.cos(th) * r;
      const py = Math.min(cy + Math.sin(th) * r, y);
      pts.push([px, py]);
    }
    litSplit(ctx, pts, o.lit, o.shade);
    for (let i = 0; i < 2; i++) {
      const ha = o.ph + i * 2.4 + G.t * 0.4;
      const hx = cx + Math.cos(ha) * 0.10 * h, hy = cy + Math.sin(ha) * 0.08 * h;
      circle(ctx, hx, hy, 0.05 * h, "rgba(13,17,20,0.85)");
    }
  }

  const PAINT = { colossus, strider, crawler, slider, floater, winged, blinker, roller, eye: eyeCreature, mass };

  // draws a single old one of `kind` at an arbitrary place, for other files
  // (the depths draw Obrokxus's brothers this way, outside the roster/place pipeline)
  function drawKind(ctx, kind, o, x, y, h, p) {
    const fn = PAINT[kind];
    if (!fn) return;
    fn(ctx, o, x, y, h, p);
  }

  function drawOldOnes(ctx, env) {
    const W = G.W, H = G.H;
    ctx.save();
    for (const idx of ORDER) {
      const o = ROSTER[idx];
      const p = place(o, env);
      if (p.a < 0.04 || p.x < -0.35 * H || p.x > W + 0.35 * H) continue;
      ctx.globalAlpha = p.a;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(p.scale, p.scale * p.sy);
      ctx.translate(-p.x, -p.y);
      PAINT[o.kind](ctx, o, p.x, p.y, o.hf * H, p);
      ctx.restore();
    }
    ctx.restore();
  }

  /* ---- shards --------------------------------------------------------
     26 splinters flung when the point breaks open. */

  const SHARDS = (function build() {
    const rnd = mulberry(9002);
    const list = [];
    for (let i = 0; i < 26; i++) {
      list.push({
        ang: rnd() * TAU,
        spd: mix(0.6, 1.4, rnd()),
        size: mix(12, 40, rnd()),
        spin: (rnd() < 0.5 ? -1 : 1) * mix(2, 6, rnd()),
        ph: rnd() * TAU,
      });
    }
    return list;
  })();

  function drawShards(ctx, burst) {
    if (burst <= 0.001 || burst >= 0.999) return;
    const W = G.W, H = G.H;
    const sb = smooth(burst);
    const ox = sx(0), oy = 0.46 * H;
    const a = (1 - burst) * 0.95;
    ctx.save();
    ctx.globalAlpha = a;
    for (const s of SHARDS) {
      const d = (0.04 + 0.90 * sb) * s.spd;
      const qx = ox + Math.cos(s.ang) * d * W * 0.55;
      const qy = oy + Math.sin(s.ang) * d * H * 0.35 + burst * burst * 0.35 * H;
      ctx.save();
      ctx.translate(qx, qy);
      ctx.rotate(s.ang + burst * s.spin * 3);
      const sz = s.size;
      litSplit(ctx, [[0, -sz * 0.6], [sz * 0.5, sz * 0.4], [-sz * 0.5, sz * 0.4]],
        "rgb(150,156,150)", "rgb(70,74,70)");
      ctx.restore();
    }
    ctx.restore();
  }

  return { ROSTER, ORDER, PAINT, place, drawOldOnes, drawShards, drawKind, makeOne, litSplit, eyeDot };
})();
