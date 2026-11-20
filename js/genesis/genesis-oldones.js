/* genesis-oldones.js — the old ones: 24 grey beings, no two alike, in six
   ways of moving. They climb out of the mass of matter one by one, take
   the span east (or west and out of the record), halt before the body,
   climb onto it, and kneel when the seal is laid. Screen-space painters;
   feet on the deck. */
window.GenOld = (function () {
  const G = window.Gen;
  const { clamp, mix, smooth, hash1, mulberry } = Util;
  const { litShade, circle, line } = Paint;
  const { DECK, ROOT_U } = G;
  const sx = G.sx;
  const TAU = Math.PI * 2;
  function hash1a(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }
  let stumbleKey = null, stumbleXs = null;

  /* ---- roster ---------------------------------------------------- */

  /* twenty-four old ones, no two alike: the first ten are the old kinds,
     one each; the rest are painted in genesis-oldkin.js */
  // the humanoid and animal-like kinds go west and out of the record; the
  // strange ones go east, where the record follows
  const ROSTER_SPECS = [
    ["gentleman", 1, 0.26], ["strider", -1, 0.14], ["crawler", -1, 0.055], ["slider", -1, 0.07],
    ["floater", -1, 0.10], ["winged", -1, 0.07], ["blinker", 1, 0.065], ["roller", 1, 0.055],
    ["eye", 1, 0.09], ["mass", 1, 0.08],
    ["tower", 1, 0.20], ["pearl", -1, 0.06], ["bundle", 1, 0.08], ["needle", 1, 0.05],
    ["slab", 1, 0.09], ["bloom", 1, 0.07], ["comb", 1, 0.08], ["veil", 1, 0.06],
    ["knot", 1, 0.06], ["husk", -1, 0.10], ["chime", 1, 0.09], ["prism", 1, 0.08],
    ["swarmling", 1, 0.07], ["mound", 1, 0.12],
  ];
  const MOVE = {
    gentleman: "walk", strider: "walk", crawler: "walk", mass: "walk",
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

  const OLD_DIM = 0.72;   // value drop on every roster grey (owner: a bit darker); eyes are not scaled

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
      const g = Math.max(Math.round(greys[i] * OLD_DIM), 90), sg = Math.round(g * 0.45);
      o.g = g; o.lit = `rgb(${g},${g},${g})`; o.shade = `rgb(${sg},${sg},${sg})`;
      o.hue = i < 6 ? HUES[i] : hslStr((i * 0.41) % 1, 0.65, 0.6);
    });
    return list;
  })();
  // where each kind stands on the deck at the trade beat, measured so none hides another across the frame:
  // u = foot x as a fraction of the width around the centre, z = draw rank (low = behind), lane = ground row (-1 back, 0 mid, 1 front; flyers fly at their own height)
  const STAND = {
    roller: { u: -0.165, z: 13.5, lane: 1 },
    mass: { u: -0.2222, z: 1, lane: -1 },
    husk: { u: -0.07, z: 2, lane: -1 },
    prism: { u: 0.20, z: 8.6, lane: -1 },
    slab: { u: 0.245, z: 4, lane: -1 },
    comb: { u: -0.3345, z: 5, lane: 0 },
    blinker: { u: -0.2416, z: 6, lane: 0 },
    strider: { u: -0.135, z: 7, lane: 0 },
    gentleman: { u: 0.165, z: 8, lane: 0 },
    knot: { u: -0.045, z: 12.5, lane: 1 },
    tower: { u: -0.2575, z: 10, lane: 1 },
    slider: { u: -0.10, z: 5.5, lane: 1 },
    mound: { u: 0.035, z: 12, lane: 1 },
    bloom: { u: 0.125, z: 13, lane: 1 },
    crawler: { u: 0.30, z: 8.5, lane: 1 },
    pearl: { u: 0.36, z: 15, lane: 1 },
    veil: { u: -0.1426, z: 16 },
    chime: { u: 0.0785, z: 17 },
    eye: { u: -0.0045, z: 18 },
    floater: { u: 0.0627, z: 19 },
    bundle: { u: 0.22, z: 20 },
    swarmling: { u: -0.3578, z: 21 },
    winged: { u: -0.2788, z: 22 },
    needle: { u: 0.30, z: 23 },
  };
  const ORDER = ROSTER.map((o, i) => i).sort((a, b) => STAND[ROSTER[a].kind].z - STAND[ROSTER[b].kind].z);

  /* ---- birth: each grows out of its lying debris part and gets up, staggered by rank ---- */
  // GenRockTitans (loads after this file) is read at call time
  const VENT_FIRST = 2.6, VENT_STEP = 0.14, GENT_T0 = 0.4, VENT_STEP0 = 0.2, VENT_DUR0 = 1.8, GENT_DUR0 = 2.4;
  const GENT_IDX = ROSTER.findIndex(o => o.kind === "gentleman");
  const VENT_MID0 = [];
  const VENT_T0 = (function () {
    const rank = ROSTER.map((o, i) => i), sh = mulberry(9005);
    for (let i = rank.length - 1; i > 0; i--) { const j = Math.floor(sh() * (i + 1)); const t = rank[i]; rank[i] = rank[j]; rank[j] = t; }
    const t0 = [];
    if (GENT_IDX >= 0) { t0[GENT_IDX] = GENT_T0; VENT_MID0[GENT_IDX] = GENT_T0 + GENT_DUR0 * 0.5; }
    let k = 0;
    rank.forEach((idx) => {
      if (idx === GENT_IDX) return;
      t0[idx] = VENT_FIRST + k * VENT_STEP;
      VENT_MID0[idx] = VENT_FIRST + k * VENT_STEP0 + VENT_DUR0 * 0.5;
      k++;
    });
    return t0;
  })();
  function ventSteps(idx) { return idx === GENT_IDX ? 6 : 3 + Math.floor(hash1(idx * 29 + 5) * 3); }
  const BIRTH_T0 = 3.0, BIRTH_RANK = 0.12, BIRTH_STEP = 0.4;
  // rank 0 = the gentleman, then the others by their VENT_T0
  function birthRank(idx) { if (idx === GENT_IDX) return 0; let r = 0; VENT_T0.forEach((t) => { if (t < VENT_T0[idx]) r++; }); return r; }
  function birthT(idx) { return BIRTH_T0 + birthRank(idx) * BIRTH_RANK; }

  // a single fresh being of `kind`, for files that draw an old one outside the
  // roster (Obrokxus's brothers); side is always +1, tint optionally overrides
  // the grey lit/shade with {lit, shade} CSS colour strings
  function makeOne(kind, seed, tint) {
    const spec = ROSTER_SPECS.find(s => s[0] === kind);
    const o = rollBeing(kind, 1, spec[2] * 0.8, spec[2] * 1.25, mulberry(seed));
    if (tint) { o.lit = tint.lit; o.shade = tint.shade; }
    o.bro = true;
    return o;
  }

  /* ---- placement --------------------------------------------------- */

  const WALK_SPAN = 1.0;

  // where a being first stands on the deck (walk 0, scale 1): foot x, foot y and body height in px, for the rock titans' drop step
  function deckSpot(o) {
    const H = G.H, st = STAND[o.kind];
    return { x: sx(st.u), y: o.move === "fly" ? DECK * H - o.airY * H : DECK * H - 2 + st.lane * 0.012 * H, h: o.hf * H };
  }

  function place(o, env) {
    const W = G.W, H = G.H, deckY = DECK * H;
    const idx = o.idx;
    const { emerge, walk, cling, still, watch, flesh } = env;

    /* dressing: one east-goer at a time, held at the snap */
    const dt = dressT(o);
    o.dressed = (o.side > 0 && !o.bro) ? dt >= 0 : false;
    const dressHold = (o.side > 0 && !o.bro) && Math.abs(dt) < HOLD;

    /* 1. on the deck from the second its titan piece landed, grey and still until it wakes */
    const bt = birthT(idx), nst = ventSteps(idx), upT = bt + nst * BIRTH_STEP;
    const rdTrade = G.reduced && emerge >= 0;   // reduced motion: from trade 0 all stand upright and awake at their spots
    const e = (emerge >= bt || rdTrade) ? 1 : 0;
    const part = (e > 0 && !rdTrade &&emerge < upT && window.GenRockTitans && GenRockTitans.partRest) ? GenRockTitans.partRest(idx) : null;
    const growStep = part ? Math.min(nst, Math.floor((emerge - bt) / BIRTH_STEP + 1e-6) + 1) : 0;
    const held = emerge < 8.4;
    o.wake = (emerge >= upT || rdTrade) ? 1 : 0;
    // the walk is read at half the frame: they grow through it and settle back for the root
    const scale = 1 + 0.5 * smooth(G.since("walk")) * (1 - clamp(G.linear("root") / 0.1, 0, 1));   // back to 1x within ~0.6 s of root
    const rot = 0;

    /* 2. split to the deck */
    const splitU = o.side * (0.15 + 0.08 * hash1(idx * 7 + 1));
    const xd = sx(splitU), yd = deckY;
    let y;

    /* 3. walk (or slide / roll / fly): a smooth steady glide, no stops: everyone leaves the frame before the walk ends */
    const sy = 1;
    let x;
    if (o.side < 0) {
      x = sx(STAND[o.kind].u - o.gait * 2.2 * walk);
    } else {
      if (G.beat <= G.idxOf("walk")) {
        // staggered along the path and moving at one steady pace, so they read one by one and leave in a line
        const startU = STAND[o.kind].u;
        x = sx(startU + WALK_SPAN * clamp(walk, 0, 1));
      } else {
        // root and after: the e2f713b endpoint, so the root scene is unchanged
        const endU = ROOT_U - 0.06 - 0.10 * hash1(idx * 13 + 3);
        const prog = clamp(walk * (0.70 + 0.14 * o.gait), 0, 1);
        x = mix(sx(splitU), sx(endU), prog);
      }
    }
    const sd = (o.idx || 0) + 1;
    const tl = (G.t || 0) + sd * 1.37;
    const phase = Math.abs(x + G.cam * W - (splitU * W + W * 0.5)) * 0.045 * o.gait;   // world x, so the camera drift doesn't slide the feet
    const isFlyer = o.move === "fly";
    if (isFlyer) y = deckY - o.airY * H + Math.sin(G.t * 1.1 + o.ph) * 0.03 * H * (held ? 0 : o.wake < 1 ? o.wake : 1);
    else y = deckY - 2 + STAND[o.kind].lane * 0.012 * H;
    if (isFlyer) x += (G.beat === G.idxOf("walk") ? mix(0.04, 0.012, clamp(G.since("walk") / 0.8, 0, 1)) : 0.04) * W * Math.sin(G.t * 0.5 + o.ph) * (held ? 0 : o.wake < 1 ? o.wake : 1);
    if (part) {   // the cut's bottom-centre sits on the chip's pivot: the feet are offset from it by the lying rotation
      const us = part.cut.map((q) => q[0]), vs = part.cut.map((q) => q[1]), ib = part.ib;
      let ax = ib[0] + (Math.min.apply(null, us) + Math.max.apply(null, us)) / 2 * ib[2], ay = ib[1] + Math.max.apply(null, vs) * ib[3];
      if (part.mirror) ax = -ax;
      x = part.x - (ax * Math.cos(part.tilt) - ay * Math.sin(part.tilt)); y = part.y - (ax * Math.sin(part.tilt) + ay * Math.cos(part.tilt));
    }

    /* 4. cling to the body */
    if (o.side > 0 && flesh && cling > 0.05) {
      const ca = o.clingAng + G.t * o.spin * (1 - 0.85 * still);
      const bite = mix(1.08, 0.86, clamp(cling * 1.4, 0, 1));
      const back = mix(1, 1.18, still);
      let tx, ty;
      if (o.kind === "gentleman") {
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
    let a = (e > 0 ? 1 : 0) * (x < 12 ? clamp(x / 12, 0, 1) : 1) * (1 - G.since("land"));
    if (watch > 0.5) a *= 0.55;

    let pinU = -1;
    if (hasLeaveBeat() && !o.bro && !CARERS[o.kind]) {
      const ls = G.secs("land");
      const at = LEAVE_T0 + (LEAVE_T1 - LEAVE_T0) * clamp(x / W, 0, 1);
      const u = (ls - at) / PIN_DUR;
      if (u >= 0 && u < 1 && a >= 0.04) pinU = Math.floor(u * 8) / 8;
      if (ls >= at + LEAVE_HALF) a = 0; else if (ls >= at) a *= 0.5;
    }

    const p = o.p;
    p.x = x; p.y = y; p.a = a; p.rot = part ? part.tilt : rot; p.scale = scale;
    p.mirror = part ? !!part.mirror : false;
    p.clipY = (part && !isFlyer) ? deckY : null;
    if (part) {   // the part's cut unioned with a rect growing from the cut's middle (step 1) to the whole ink box (last step), in ink-box units
      const us = part.cut.map((q) => q[0]), vs = part.cut.map((q) => q[1]);
      const k = nst > 1 ? (growStep - 1) / (nst - 1) : 1;
      const cu = (Math.min.apply(null, us) + Math.max.apply(null, us)) / 2, cv = (Math.min.apply(null, vs) + Math.max.apply(null, vs)) / 2;   // step 1: the cut alone, a point inside it
      const u0 = mix(cu, 0, k), u1 = mix(cu, 1, k), v0 = mix(cv, 0, k), v1 = mix(cv, 1, k);
      p.clipBox = { ink: part.ink, ib: part.ib, cut: part.cut, rect: [u0, v0, u1, v1], fx: part.fx, fy: part.fy };
    } else p.clipBox = null;
    p.phase = part ? 0 : phase; p.sy = sy; p.kneel = still;
    p.gest = 0;
    p.pinU = pinU;
    if (o.side > 0) {
      const stillV = still || 0;
      const q = Math.min(stillV, 0.9999) * 3, n = Math.floor(q), f = q - n;
      const ss = f < 0.8 ? 0 : (f - 0.8) / 0.2;
      p.kneel = (n + ss * ss * (3 - 2 * ss)) / 3;
      p.rot += -0.12 * Math.sin(Math.PI * Math.min(1, stillV * 1.25));

      const Pt = 6 + 3 * hash1a(sd * 7.1);
      if (!dressHold && (tl % Pt) < 0.08 && p.e >= 0.85 && !held) {
        const tw = Math.sin(Math.PI * (tl % Pt) / 0.08);
        const tk = G.beat === G.idxOf("walk") ? 1 - clamp(G.since("walk") / 0.8, 0, 1) : 1;   // off while walking, faded in from the beat change
        p.x += 0.02 * H * tw * tw * tk * (hash1a(sd * 3.3) - 0.5 < 0 ? -1 : 1);
        p.rot += 0.04 * tw * tw * tk;
      }

      if (dressHold) {
        p.gest = 0;
      } else if (o.dressed ?? dressNow()) {
        const Pg = 9 + 4 * hash1a(sd * 5.9);
        const u = tl % Pg;
        p.gest = u < 0.4 ? Math.sin(Math.PI * u / 0.4) : 0;
      }
    }
    p.make = (o.side > 0 && !o.bro && dt >= -MAKE && dt < -HOLD)
      ? clamp(Math.floor((dt + MAKE) / ((MAKE - HOLD) / 3)), 0, 2)
      : -1;
    /* stumble: the comb's held step catches a walker's foot */
    if (G.BEATS[G.beat].id === "walk" && window.GenTier3 && GenTier3.tines && !G.reduced) {
      const key = G.beat + "|" + Math.floor(G.local / 0.5);
      if (key !== stumbleKey) {
        stumbleKey = key;
        stumbleXs = GenTier3.tines("comb");
      }
      if (stumbleXs) {
        let dm = Infinity;
        for (const xi of stumbleXs) dm = Math.min(dm, Math.abs(p.x - xi));
        const sw = clamp(1 - dm / (0.025 * W), 0, 1);
        const sk = sw * sw * (3 - 2 * sw);
        p.rot += 0.07 * sk * (o.side < 0 ? -1 : 1);
        p.y += 0.004 * H * sk;
      }
    }

    p.look = env.look != null ? env.look : sx(0);
    p.e = e;
    return p;
  }

  // the found cloth in the making: held above the bare body while it is cut
  // and wrapped, never laid on the skin — the change itself is a stepwise
  // snap, so this only ever shows the making, not the fitting
  function drawMaking(ctx, o, p, h) {
    if (p.make < 0) return;
    const GP = window.GenEldPal;
    const tw = GP ? GP.tone("tweed") : null;
    const col = tw ? tw.lit : "#5a4a3c";
    const edge = tw ? tw.shade : "#3a2f26";
    const cx = p.x, cy = p.y - h * 1.05;
    const w = h * 0.5, hh = h * 0.07;
    ctx.save();
    ctx.globalAlpha = p.a;
    if (p.make === 0) {
      Paint.poly(ctx, [[cx - w / 2, cy - hh / 2], [cx + w / 2, cy - hh / 2], [cx + w / 2, cy + hh / 2], [cx - w / 2, cy + hh / 2]]);
      ctx.fillStyle = col; ctx.fill();
    } else if (p.make === 1) {
      const gap = h * 0.05;
      Paint.poly(ctx, [[cx - w / 2, cy - hh / 2], [cx - gap / 2, cy - hh / 2], [cx - gap / 2, cy + hh / 2], [cx - w / 2, cy + hh / 2]]);
      ctx.fillStyle = col; ctx.fill();
      Paint.poly(ctx, [[cx + gap / 2, cy - hh / 2], [cx + w / 2, cy - hh / 2], [cx + w / 2, cy + hh / 2], [cx + gap / 2, cy + hh / 2]]);
      ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = edge; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - gap / 2, cy - hh / 2); ctx.lineTo(cx - gap / 2, cy + hh / 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + gap / 2, cy - hh / 2); ctx.lineTo(cx + gap / 2, cy + hh / 2); ctx.stroke();
    } else {
      const ww = h * 0.32;
      ctx.translate(cx, cy);
      ctx.rotate(0.35);
      Paint.poly(ctx, [[-ww / 2, -hh / 2], [ww / 2, -hh / 2], [ww / 2, hh / 2], [-ww / 2, hh / 2]]);
      ctx.fillStyle = col; ctx.fill();
    }
    ctx.restore();
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
  // the pass-6 proportions; Obrokxus's brothers (makeOne) keep the old ones
  function pu(o, old, now) { return o.bro ? old : now; }

  // a planted foot rides back at the body's own speed (phase is distance travelled), then lifts and swings
  // forward on an eased arc. Returns [dx along the facing, lift 0..1]; reduced motion keeps feet at rest.
  function foot(o, p, q, m, stance) {
    if (G.reduced) return [0, 0];
    const face = o.side >= 0 ? 1 : -1;
    const L = stance * TAU / (0.045 * o.gait * m) / 2 / (p.scale || 1);   // drawn under p.scale: keep the contact fixed in world x
    const u = (p.phase * m / TAU + q) % 1;
    if (u < stance) return [face * L * (1 - 2 * u / stance), 0];
    const w = (u - stance) / (1 - stance);
    return [face * (-L + 2 * L * w * w * (3 - 2 * w)), Math.sin(Math.PI * w)];
  }

  /* ---- kind painters -------------------------------------------------
     h = height px, foot line at y. Every filled volume is lit/shade split
     from the left; thin-line limbs (too narrow to split) take a flat lit
     or shade colour from which side of the body they fall on. */

  // true once the `dress` beat has begun: before it every old one is bare;
  // each east-goer's own moment inside the beat is set below
  function dressNow() {
    return G.BEATS.some((b) => b.id === "roles") && G.since("roles") > 0;
  }

  // one at a time: each east-goer gets its own moment inside the dress beat,
  // the gentleman (the least changed, the most deliberate) going last
  var DRESS_T0 = 0.4, DRESS_T1 = 6.2, HOLD = 0.35, MAKE = 1.8;
  var _hasDressBeat = null;
  function hasDressBeat() {
    if (_hasDressBeat === null) _hasDressBeat = G.BEATS.some((b) => b.id === "roles");
    return _hasDressBeat;
  }

  // every old one but the three carers goes out, one by one left to right,
  // leaving a pin of its own colour that runs the rim then out into the void
  const LEAVE_T0 = 0.6, LEAVE_T1 = 4.8, LEAVE_HALF = 0.25, PIN_DUR = 1.4;
  const CARERS = { eye: 1, chime: 1, mound: 1 };
  var _hasLeaveBeat = null;
  function hasLeaveBeat() {
    if (_hasLeaveBeat === null) _hasLeaveBeat = G.BEATS.some((b) => b.id === "land");
    return _hasLeaveBeat;
  }
  var _dressAt = null;
  function dressAt(o) {
    if (_dressAt === null) {
      _dressAt = {};
      const eligible = ROSTER.filter((r) => r.side > 0 && !r.bro);
      const gentleman = eligible.find((r) => r.kind === "gentleman");
      const list = eligible.filter((r) => r !== gentleman);
      if (gentleman) list.push(gentleman);
      const n = list.length;
      list.forEach((r, i) => {
        _dressAt[r.idx] = n <= 1 ? DRESS_T1 : mix(DRESS_T0, DRESS_T1, i / (n - 1));
      });
    }
    return _dressAt[o.idx] != null ? _dressAt[o.idx] : Infinity;
  }
  // seconds past this one's own snap (negative before, ~0 at the snap)
  function dressT(o) {
    return hasDressBeat() ? G.secs("roles") - dressAt(o) : -Infinity;
  }

  // the headless, tailored gentleman: replaces the colossus. Bare (rough,
  // jagged body, no head) until `dress`, then a full tailored suit built
  // from GenAttire, drawn as its own asset — never a morph between the two.
  function gentleman(ctx, o, x, y, h, p) {
    const dressed = o.dressed != null ? o.dressed : dressNow();
    if (dressed && window.GenAttire) gentlemanDressed(ctx, o, x, y, h, p);
    else gentlemanBare(ctx, o, x, y, h, p);
  }

  function gentlemanBare(ctx, o, x, y, h, p) {
    const phase = isFinite(p.phase) ? p.phase : 0;
    const kneel = p.kneel || 0;
    const lower = kneel * 0.18 * h;
    ctx.lineCap = "round"; ctx.lineJoin = "round";

    // two long thin legs, hips fixed, swinging like the colossus's did
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? -1 : 1;
      const hipX = x + side * 0.04 * h, hipY = y - 0.46 * h;
      const sw = Math.sin(phase + k * Math.PI);
      const footX = hipX + 0.06 * h * sw;
      const footY = y - 0.03 * h * Math.max(0, sw);
      litSplit(ctx, [
        [hipX - 0.045 * h, hipY], [hipX + 0.045 * h, hipY],
        [footX + 0.03 * h, footY], [footX - 0.03 * h, footY],
      ], o.lit, o.shade);
    }

    // torso: waist to a flat shoulder top, no neck, no head; jagged edges
    const waistY = y - 0.46 * h;
    const shY = y - 0.78 * h - lower;
    const topY = y - 0.80 * h - lower;
    const rEdge = (t) => [x + mix(0.045, 0.10, t) * h, mix(waistY, shY, t)];
    const lEdge = (t) => [x - mix(0.10, 0.045, t) * h, mix(shY, waistY, t)];
    const torso = [[x + 0.045 * h, waistY]];
    [0.33, 0.66].forEach((t) => {
      const [ex, ey] = rEdge(t);
      torso.push(rEdge(t - 0.06), [ex - 0.015 * h, ey], rEdge(t + 0.06));
    });
    torso.push([x + 0.10 * h, shY], [x + 0.10 * h, topY], [x - 0.10 * h, topY], [x - 0.10 * h, shY]);
    {
      const [ex, ey] = lEdge(0.5);
      torso.push(lEdge(0.5 - 0.08), [ex - 0.012 * h, ey], lEdge(0.5 + 0.08));
    }
    torso.push([x - 0.045 * h, waistY]);
    litSplit(ctx, torso, o.lit, o.shade);

    // two long thin arms from the shoulder corners, swinging opposite the legs
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? -1 : 1;
      const shX = x + side * 0.10 * h;
      const sw = -Math.sin(phase + k * Math.PI);
      const handX = shX + 0.05 * h * sw;
      const handY = y - 0.36 * h - lower;
      litSplit(ctx, [
        [shX - 0.025 * h, shY], [shX + 0.025 * h, shY],
        [handX + 0.025 * h, handY], [handX - 0.025 * h, handY],
      ], o.lit, o.shade);
    }
  }

  function gentlemanDressed(ctx, o, x, y, h, p) {
    const GA = window.GenAttire;
    const phase = isFinite(p.phase) ? p.phase : 0;
    const kneel = p.kneel || 0;
    const lower = kneel * 0.12 * h;
    const step = Math.floor(phase / Math.PI) % 2 === 1;
    const GP = window.GenEldPal;
    const coal = GP ? GP.tone("coal") : null;
    const armLit = coal ? coal.lit : o.lit, armMid = coal ? coal.mid : o.shade;

    if (!o._att) {
      const seed = (o.idx || 0) + 1;
      o._att = {
        boot: { kind: "tailored", fit: "tailored", dir: 1, snow: false, seed },
        trousers: { kind: "tailored", fit: "tailored", dir: 1, snow: false, seed },
        coat: { kind: "chesterfield", fit: "tailored", dir: 1, snow: false, seed, len: 1.8 },
        cane: { kind: "knob", fit: "tailored", dir: 1, snow: false, seed },
        glove: { kind: "kid", fit: "tailored", dir: 1, snow: false, seed },
        watch: { kind: "albert", fit: "tailored", dir: 1, snow: false, seed },
        hat: { kind: "topper", fit: "tailored", dir: 1, snow: false, seed },
      };
    }
    const att = o._att;

    // measures, derived from the landmarks so a garment's own box never
    // clips: boots on the sole line (not lowered by the kneel)
    const sBoot = 0.07 * h / 1.10;
    const backHeelX = x - 0.02 * h;
    const frontHeelX = x + 0.03 * h + (step ? 0.03 * h : 0);

    // above the boots, everything sinks by `lower` when he kneels
    const waistY = y - 0.50 * h - lower;
    const hemBootY = y - 0.06 * h - lower;
    const sTrouser = (hemBootY - waistY) / 1.4;
    const sq = (0.05 * h) / (0.5 * sTrouser);

    const neckY = y - 0.70 * h - lower;
    const coatLen = 1.8;
    const sCoat = 0.52 * h / coatLen;
    // the chesterfield body is a straight-sided polygon (no waist option in
    // GenAttire); it can't be pinched at the waist from here

    const collarTopY = neckY - 0.22 * sCoat;
    const brimY = collarTopY - 0.025 * h;
    const crownY = y - 1.0 * h - lower;
    const sHat = (brimY - crownY) / 2.3;

    const shArmY = y - 0.68 * h - lower;
    const backHandX = x - 0.09 * h, backHandY = y - 0.38 * h - lower;
    const sCane = (0.40 * h) / 1.1;
    const COAT_NARROW = 0.74, hemRightX = x + 0.6 * sCoat * COAT_NARROW; // right edge of the narrowed hem
    const caneTipX = Math.max(x + 0.20 * h, hemRightX + 0.03 * h);
    const caneTipY = y - lower;
    const gripX = caneTipX, gripY = caneTipY - 1.1 * sCane;

    // back arm, behind everything
    Paint.poly(ctx, [
      [x - 0.09 * h - 0.015 * h, shArmY], [x - 0.09 * h + 0.015 * h, shArmY],
      [backHandX + 0.015 * h, backHandY], [backHandX - 0.015 * h, backHandY],
    ]);
    ctx.fillStyle = armMid; ctx.fill();

    GA.draw(ctx, "boots", backHeelX, y, sBoot, att.boot);
    GA.draw(ctx, "boots", frontHeelX, y, sBoot, att.boot);
    GA.draw(ctx, "trousers", x, waistY, sTrouser, Object.assign({}, att.trousers, { sq }));
    ctx.save(); ctx.translate(x, 0); ctx.scale(COAT_NARROW, 1); ctx.translate(-x, 0); GA.draw(ctx, "coat", x, neckY, sCoat, att.coat); ctx.restore(); // tall and thin, not a bell
    GA.draw(ctx, "watch", x + 0.01 * h, y - 0.52 * h - lower, 0.06 * h, att.watch);
    GA.draw(ctx, "cane", caneTipX, caneTipY, sCane, att.cane);

    // front arm, reaching forward to the cane
    Paint.poly(ctx, [
      [x + 0.09 * h - 0.015 * h, shArmY], [x + 0.09 * h + 0.015 * h, shArmY],
      [gripX + 0.015 * h, gripY], [gripX - 0.015 * h, gripY],
    ]);
    ctx.fillStyle = armLit; ctx.fill();

    GA.draw(ctx, "glove", gripX, gripY, 0.045 * h, att.glove);
    if (p && p.gest > 0) {
      const k = Math.sin(Math.PI * p.gest);
      ctx.save();
      ctx.translate(x, brimY);
      ctx.rotate(-0.35 * k);
      ctx.translate(0, -h * 0.10 * k);
      ctx.translate(-x, -brimY);
      GA.draw(ctx, "hat", x, brimY, sHat, att.hat);
      ctx.restore();
    } else {
      GA.draw(ctx, "hat", x, brimY, sHat, att.hat);
    }
  }

  function strider(ctx, o, x, y, h, p) {
    // long slow legs, high-stepping; the body sinks and rises twice a stride and rocks with it
    const rd = G.reduced ? 0 : 1;
    const bob = 0.035 * h * Math.sin(p.phase * 2.8) * rd;
    const cy = y - pu(o, 0.85, 1.05) * h + bob, cx = x;
    const rx = 0.14 * h, ry = 0.09 * h;
    litShade(ctx, () => { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); },
      cx - rx + 0.4 * 2 * rx, o.lit, o.shade);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let k = 0; k < 4; k++) {
      const off = k - 1.5;
      const ft = foot(o, p, (k % 2) * 0.5, 1.4, 0.7);
      const footX = x + off * 0.22 * h + ft[0];
      const footY = y - 0.16 * h * ft[1];
      const kneeX = x + off * 0.16 * h + ft[0] * 0.4, kneeY = y - pu(o, 1.02, 1.28) * h - 0.08 * h * ft[1];
      const col = off < 0 ? o.lit : o.shade;
      line(ctx, [[cx, cy], [kneeX, kneeY], [footX, footY]], col, 0.015 * h);
    }
    const face = o.side >= 0 ? 1 : -1;
    // its own eye: a flat slit, not the shared dot
    if (o.bro) eyeDot(ctx, cx + face * 0.10 * h, cy, h, p.look, 0.012 * h);
    else {
      const dir = p.look >= (cx + face * 0.10 * h) ? 1 : -1;
      ctx.save();
      ctx.translate(cx + face * 0.10 * h + dir * 0.02 * h, cy);
      ctx.beginPath(); ctx.ellipse(0, 0, 0.03 * h, 0.009 * h, 0, 0, TAU);
      ctx.fillStyle = "rgba(210,214,210,0.85)"; ctx.fill();
      ctx.restore();
    }
  }

  function crawler(ctx, o, x, y, h, p) {
    // many short legs, a wave running front to back along them; the body ripples low
    const bodyY = y - pu(o, 0.22, 0.17) * h - (G.reduced ? 0 : 0.012 * h * Math.sin(p.phase * 2.5));
    const rx = pu(o, 0.50, 0.60) * h, ry = pu(o, 0.22, 0.16) * h;
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      pts.push([x + Math.cos(a) * rx, bodyY + Math.sin(a) * ry]);
    }
    litSplit(ctx, pts, o.lit, o.shade);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let k = 0; k < 4; k++) {
      const hipX = x + (k - 1.5) * 0.2 * h, hipY = y - pu(o, 0.2, 0.15) * h;
      for (let s = 0; s < 2; s++) {
        const side = s === 0 ? -1 : 1;
        const ft = foot(o, p, k * 0.125 + s * 0.06, 2.5, 0.75);
        const kneeX = hipX + side * pu(o, 0.18, 0.25) * h + ft[0] * 0.5, kneeY = y - pu(o, 0.42, 0.33) * h - 0.04 * h * ft[1];
        const footX = hipX + side * pu(o, 0.30, 0.42) * h + ft[0];
        const col = side < 0 ? o.lit : o.shade;
        line(ctx, [[hipX, hipY], [kneeX, kneeY], [footX, y - 0.07 * h * ft[1]]], col, 0.02 * h);
      }
    }
    const face = o.side >= 0 ? 1 : -1;
    if (o.bro) {
      eyeDot(ctx, x + face * 0.34 * h, bodyY - 0.06 * h, h, p.look, 0.012 * h);
      eyeDot(ctx, x + face * 0.34 * h, bodyY + 0.06 * h, h, p.look, 0.012 * h);
    }
  }

  function slider(ctx, o, x, y, h, p) {
    const face = o.side >= 0 ? 1 : -1;
    const breathe = 1 + pu(o, 0.08, 0.14) * Math.sin(G.t * 2 + o.ph);
    const len = 0.9 * h * breathe, height = pu(o, 0.30, 0.38) * h;
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
    // a slow ripple runs along its length, strongest at the base
    const rip = G.reduced ? 0 : 0.02 * h;
    const pts = raw.map(([u, v]) => [x + u, y + (v - vMax) * vs + rip * (1 - (v - vMin) / Math.max(1e-4, vMax - vMin)) * Math.sin(u / (0.18 * h) * face - p.phase * 1.5)]);
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
    const rd = G.reduced ? 0 : 1;
    const rx = 0.24 * h * pulse, ry = 0.16 * h * pulse;
    litShade(ctx, () => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, Math.PI, TAU); ctx.closePath(); },
      x - rx + 0.4 * 2 * rx, o.lit, o.shade);
    ctx.lineCap = "round";
    ctx.strokeStyle = o.shade;
    ctx.lineWidth = 0.02 * h;
    for (let k = 0; k < 5; k++) {
      const rimX = x + (k - 2) * (rx * 0.4), rimY = y;
      // the tendrils trail the bell in a slow wave
      const endX = x + (k - 2) * 0.05 * h + 0.08 * h * Math.sin(G.t * 1.1 + o.ph - k * 0.7) * rd;
      const endY = y + pu(o, 0.6, 0.95) * h;
      ctx.beginPath();
      ctx.moveTo(rimX, rimY);
      ctx.quadraticCurveTo(mix(rimX, endX, 0.5), mix(rimY, endY, 0.4), endX, endY);
      ctx.stroke();
    }
    if (o.bro) eyeDot(ctx, x, y - ry * 0.3, h, p.look, 0.012 * h);
  }

  function winged(ctx, o, x, y, h, p) {
    // slow, heavy beats: a long downstroke, the body lifting as the wings fall
    const wt = G.reduced ? 0 : G.t * 2 + o.ph;
    const beat = Math.sin(wt) + 0.3 * Math.sin(2 * wt);
    const yy = y + 0.04 * h * beat + (G.reduced ? 0 : 0.03 * h * Math.sin(G.t * 0.5 + o.ph));
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? -1 : 1;
      litSplit(ctx, [
        [x, yy - 0.02 * h],
        [x + side * pu(o, 0.5, 0.68) * h, yy - 0.25 * h * beat],
        [x + side * 0.28 * h, yy + 0.06 * h],
      ], o.lit, o.shade);
    }
    litShade(ctx, () => { ctx.beginPath(); ctx.ellipse(x, yy, 0.12 * h, 0.06 * h, 0, 0, TAU); },
      x - 0.12 * h + 0.4 * 0.24 * h, o.lit, o.shade);
  }

  function blinker(ctx, o, x, y, h, p) {
    // the kite rocks over its foot, pivoting from point to point as it goes
    if (G.reduced || h <= 0) return blinkerBody(ctx, o, x, y, h, p);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.1 * Math.sin(p.phase * 0.8));
    ctx.translate(-x, -y);
    blinkerBody(ctx, o, x, y - 0.02 * h * Math.abs(Math.sin(p.phase * 0.8)), h, p);
    ctx.restore();
  }

  function blinkerBody(ctx, o, x, y, h, p) {
    const dressed = o.bro ? false : (o.dressed != null ? o.dressed : dressNow());
    if (dressed && window.GenAttire && window.GenEldPal) blinkerDressed(ctx, o, x, y, h, p);
    else blinkerBare(ctx, o, x, y, h, p);
  }

  function blinkerBare(ctx, o, x, y, h, p) {
    litSplit(ctx, [
      [x, y - pu(o, 0.5, 0.64) * h], [x + pu(o, 0.12, 0.10) * h, y - pu(o, 0.25, 0.22) * h],
      [x, y], [x - pu(o, 0.12, 0.10) * h, y - pu(o, 0.25, 0.22) * h],
    ], o.lit, o.shade);
    if (p.sy < 0.15) {
      ctx.fillStyle = "rgba(220,222,220,0.6)";
      ctx.fillRect(x - 0.25 * h, y - 0.26 * h, 0.5 * h, 0.02 * h);
    }
  }

  // the kite stretched full height: a narrow neck at the top, a foot planted
  // on the deck, and a found bowler that never sits where it should — 2x too
  // wide, slipped down to mid-body, and a beat behind the hop
  function blinkerDressed(ctx, o, x, y, h, p) {
    if (h <= 0) return;
    litSplit(ctx, [
      [x, y - 1.0 * h], [x + 0.16 * h, y - 0.55 * h],
      [x, y], [x - 0.16 * h, y - 0.55 * h],
    ], o.lit, o.shade);

    // the pale blink bar, now up at 0.7h
    ctx.fillStyle = "rgba(220,222,220,0.6)";
    ctx.fillRect(x - 0.25 * h, y - 0.72 * h, 0.5 * h, 0.02 * h);

    // bowler: crown 2x the neck width, dome 0.5x the crown wide tall
    const neckW = 0.08 * h, crownW = 2 * neckW;
    const s = crownW / 0.94;
    const tall = 0.653; // solves the asset's dome to 0.5x crownW tall at this s
    const tone = window.GenEldPal.tone("coal") || { lit: "#3c3d40", mid: "#333336", shade: "#28292b" };
    if (!o._att) o._att = { kind: "bowler", fit: "found", seed: o.ph || 0 };
    // dropped to mid-body and a beat late: its bob lags the body's own phase
    const hatY = y - 0.5 * h + 0.05 * h * Math.sin(p.phase - 1.2);
    window.GenAttire.draw(ctx, "hat", x, hatY, s, Object.assign({ tall, tone: "coal" }, o._att, { lift: 0 }));
  }

  function roller(ctx, o, x, y, h, p) {
    const dressed = o.bro ? false : (o.dressed != null ? o.dressed : dressNow());
    if (dressed && window.GenAttire && window.GenEldPal) rollerDressed(ctx, o, x, y, h, p);
    else rollerBare(ctx, o, x, y, h, p);
  }

  function rollerBare(ctx, o, x, y, h, p) {
    const rBase = pu(o, 0.20, 0.17) * h, rTip = pu(o, 0.35, 0.43) * h, rDisc = pu(o, 0.12, 0.10) * h;
    // rolls on its tips: turn = distance / contact radius, the hub dipping between points
    const rot = G.reduced ? 0 : (o.side >= 0 ? 1 : -1) * (p.phase / (0.045 * o.gait)) / (0.92 * rTip * (p.scale || 1));
    const cx = x, cy = y - rTip * (G.reduced ? 1 : 0.96 + 0.04 * Math.cos(8 * rot));
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

  // the star wheel stopped: one point grown into a peg leg planted on the
  // deck, the other seven closed into a crest fan above it, and one huge
  // found boot that hops instead of rolling
  function rollerDressed(ctx, o, x, y, h, p) {
    if (h <= 0) return;
    const side = o.side != null ? o.side : 1;
    const rBase = 0.20 * h;
    const crestW = 0.14 * h;
    const cx = x, cy = y - 0.5 * h;
    const trace = () => {
      ctx.beginPath();
      // peg leg: one point stretched down to the deck
      ctx.moveTo(cx - crestW / 2, cy); ctx.lineTo(cx + crestW / 2, cy);
      ctx.lineTo(x + 0.025 * h, y); ctx.lineTo(x - 0.025 * h, y);
      ctx.closePath();
      // crest fan: the other seven, closed into a narrow upward cluster
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI / 2 + (k / 6 - 0.5) * 0.7;
        ctx.moveTo(cx + Math.cos(a - 0.05) * rBase * 0.4, cy + Math.sin(a - 0.05) * rBase * 0.4);
        ctx.lineTo(cx + Math.cos(a) * 0.35 * h, cy + Math.sin(a) * 0.35 * h);
        ctx.lineTo(cx + Math.cos(a + 0.05) * rBase * 0.4, cy + Math.sin(a + 0.05) * rBase * 0.4);
        ctx.closePath();
      }
    };
    // rolls on its tips like the bare one: the hub rides the true rolling path over its tips, driven by distance travelled
    const rTip = pu(o, 0.35, 0.43) * h;
    const rot = (side >= 0 ? 1 : -1) * (p.phase / (0.045 * o.gait)) / (0.92 * rTip * (p.scale || 1));
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(rot); ctx.translate(-cx, -cy);
    litShade(ctx, trace, cx - 0.4 * h, o.lit, o.shade);
    ctx.restore();

    const footY = G.reduced ? y : y - 0.04 * rTip * (1 + Math.cos(8 * rot));

    // one huge boot on the peg leg's foot: 3x the crest width long
    const bootLen = 3 * crestW;
    const bootS = bootLen / 1.6;
    if (!o._att) o._att = { kind: "button", fit: "found", seed: o.ph || 0 };
    window.GenAttire.draw(ctx, "boots", x, footY, bootS, Object.assign({ dir: side, tone: "boot" }, o._att, { lift: 0 }));
  }

  function eyeCreature(ctx, o, x, y, h, p) {
    const dressed = o.bro ? false : (o.dressed != null ? o.dressed : dressNow());
    if (dressed && window.GenAttire && window.GenEldPal) eyeCreatureDressed(ctx, o, x, y, h, p);
    else eyeCreatureBare(ctx, o, x, y, h, p);
  }

  function eyeCreatureBare(ctx, o, x, y, h, p) {
    const r = 0.36 * h;
    ctx.lineCap = "butt";
    ctx.lineWidth = 0.08 * h;
    ctx.strokeStyle = o.lit;
    ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
    ctx.strokeStyle = o.shade;
    ctx.beginPath(); ctx.arc(x, y, r, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    const dir = p.look >= x ? 1 : -1;
    const pupilX = x + dir * 0.10 * h;
    circle(ctx, pupilX, y, 0.16 * h, o.shade);
    ctx.lineWidth = 0.02 * h;
    ctx.strokeStyle = "rgba(200,204,200,0.7)";
    ctx.beginPath(); ctx.arc(pupilX, y, 0.17 * h, 0, TAU); ctx.stroke();
  }

  // the eye transformed: an upright almond body with a heavy drooping lid,
  // a vertical slit pupil, three stalk tendrils, and the found monocle —
  // a pewter rim clamped to the pupil, chained to the middle stalk.
  function eyeCreatureDressed(ctx, o, x, y, h, p) {
    if (h <= 0) return;
    const side = o.side != null ? o.side : 1;
    const halfH = 0.31 * h;
    // almond body, parametric: 0.44h wide, 0.62h tall
    const N = 24;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const t = (i / N) * TAU;
      const px2 = x + 0.22 * h * Math.sin(t) * (1 - 0.15 * Math.cos(t) * Math.cos(t));
      const py2 = y - 0.31 * h * Math.cos(t);
      pts.push([px2, py2]);
    }
    litSplit(ctx, pts, o.lit, o.shade);

    const dir = p.look >= x ? 1 : -1;

    // heavy lid: a cap following the almond's own top outline, closed
    // with a straight drooping lower edge
    const lidY = y - 0.13 * h;
    const cosT = 0.13 / 0.31, sinT = Math.sqrt(Math.max(0, 1 - cosT * cosT));
    const halfW = 0.22 * h * sinT * (1 - 0.15 * cosT * cosT);
    const rotated = pts.slice(N / 2).concat(pts.slice(0, N / 2));
    const lidArc = rotated.filter((pt) => pt[1] < lidY);
    const lidPoly = lidArc.concat([
      [x + halfW, lidY + 0.03 * h * dir],
      [x - halfW, lidY - 0.03 * h * dir],
    ]);
    Paint.poly(ctx, lidPoly); ctx.fillStyle = o.shade; ctx.fill();

    // pupil: a vertical slit diamond, inside the almond, below the lid
    const pupilX = x + dir * 0.08 * h, pupilY = y + 0.03 * h;
    const pw = 0.035 * h, ph2 = 0.15 * h;
    Paint.poly(ctx, [[pupilX, pupilY - ph2], [pupilX + pw, pupilY], [pupilX, pupilY + ph2], [pupilX - pw, pupilY]]);
    ctx.fillStyle = "rgba(13,17,20,0.9)"; ctx.fill();

    // three stalk tendrils from the bottom tip
    const tipX = x, tipY = y + halfH;
    const angs = [-Math.PI * 0.5, -Math.PI * 0.5 - 0.35, -Math.PI * 0.5 + 0.35];
    const lens = [0.42 * h, 0.30 * h, 0.34 * h];
    const tendrilEnds = [];
    for (let i = 0; i < 3; i++) {
      const baseAng = Math.PI * 0.5; // straight down plus offsets below
      const a = i === 0 ? Math.PI * 0.5 : (i === 1 ? Math.PI * 0.5 - 0.35 : Math.PI * 0.5 + 0.35);
      const len = lens[i];
      const sway = 0.03 * h * Math.sin(G.t * 1.1 + o.ph + i);
      const endX = tipX + Math.cos(a) * len + sway, endY = tipY + Math.sin(a) * len;
      tendrilEnds.push([endX, endY]);
      const nx = -Math.sin(a), ny = Math.cos(a);
      const hw = 0.035 * h * 0.5;
      Paint.poly(ctx, [
        [tipX + nx * hw, tipY + ny * hw], [tipX - nx * hw, tipY - ny * hw],
        [endX - nx * hw, endY - ny * hw], [endX + nx * hw, endY + ny * hw],
      ]);
      ctx.fillStyle = o.shade; ctx.fill();
    }
    const midEnd = tendrilEnds[0];

    // monocle: rim 1.3x the slit's half-height, centred on the pupil
    const rimR = 1.3 * ph2;
    const tone = window.GenEldPal.tone("pewter") || { lit: o.lit, mid: o.shade, shade: o.shade };
    if (!o._att) o._att = { kind: "ring", fit: "found", seed: o.ph || 0 };
    if (typeof window.GenAttire.draw === "function") {
      window.GenAttire.draw(ctx, "monocle", pupilX, pupilY, rimR, o._att);
    } else {
      ctx.lineCap = "butt";
      ctx.lineWidth = Math.max(1, 0.06 * rimR);
      ctx.strokeStyle = tone.lit;
      ctx.beginPath(); ctx.arc(pupilX, pupilY, rimR, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
      ctx.strokeStyle = tone.shade;
      ctx.beginPath(); ctx.arc(pupilX, pupilY, rimR, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
    }
    // sagging chain, rim to the end of the middle stalk tendril
    const chainN = 6;
    const startX = pupilX, startY = pupilY + rimR;
    for (let i = 1; i <= chainN; i++) {
      const t = i / (chainN + 1);
      const sag = Math.sin(t * Math.PI) * 0.4 * rimR;
      const dx2 = startX + (midEnd[0] - startX) * t;
      const dy2 = startY + (midEnd[1] - startY) * t + sag;
      circle(ctx, dx2, dy2, Math.max(1, 0.02 * h), tone.mid);
    }
  }

  function mass(ctx, o, x, y, h, p) {
    const dressed = o.bro ? false : (o.dressed != null ? o.dressed : dressNow());
    if (dressed && window.GenAttire && window.GenEldPal) massDressed(ctx, o, x, y, h, p);
    else massBare(ctx, o, x, y, h, p);
  }

  function massBare(ctx, o, x, y, h, p) {
    const cx = x, cy = y - 0.30 * h;
    const faceAng = o.side >= 0 ? 0 : Math.PI;
    const N = 14;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const th = (i / N) * TAU;
      const r = 0.30 * h * (1 + pu(o, 0.22, 0.30) * Math.sin(3 * th + G.t * 0.9 + o.ph) + 0.12 * Math.sin(5 * th - G.t * 1.3))
        + 0.12 * h * Math.max(0, Math.cos(th - faceAng)) * (0.5 + 0.5 * Math.sin(G.t * 2));
      const px = cx + Math.cos(th) * r;
      const py = Math.min(cy + Math.sin(th) * r, y);
      pts.push([px, py]);
    }
    litSplit(ctx, pts, o.lit, o.shade);
    if (o.bro) for (let i = 0; i < 2; i++) {
      const ha = o.ph + i * 2.4 + G.t * 0.4;
      const hx = cx + Math.cos(ha) * 0.10 * h, hy = cy + Math.sin(ha) * 0.08 * h;
      circle(ctx, hx, hy, 0.05 * h, "rgba(13,17,20,0.85)");
    }
  }

  // the mass transformed: gathered upright into a pear-shaped column, a
  // round head with two dark hollows for a face, and the found muffler
  // wrapped once round the neck, its two tails dragging flat behind it.
  // weather: wind and frost, shared with GenAttire for the dressed old ones
  let _hasDress = null;
  function frostNow() {
    if (_hasDress === null) _hasDress = G.BEATS.some(b => b.id === "roles");
    return _hasDress ? G.since("roles") : 0;
  }
  function windAt(t) {
    const WX = window.GenAttire && window.GenAttire.weather;
    if (!WX) return;
    const gust = 0.45 * Math.pow(Math.max(0, Math.sin(2 * Math.PI * t / 7.3)), 3);
    WX.g = gust / 0.45;
    WX.w = -Math.min(1, 0.35 + 0.2 * Math.sin(0.23 * t) + gust);
    WX.t = t;
    WX.frost = frostNow();
  }

  function massDressed(ctx, o, x, y, h, p) {
    if (h <= 0) return;
    const side = o.side != null ? o.side : 1;

    // pear column: 0.52h wide base, pinched to 0.26h at the neck (y-0.70h),
    // topped with a round head
    const N = 20;
    const pts = [];
    for (let i = 0; i <= 7; i++) {
      const t = i / (N / 2);
      const hw = (0.52 - (0.52 - 0.26) * (t / 0.70)) * 0.5 * h;
      const py = Math.min(y - t * h, y);
      const wob = 0.02 * h * Math.sin(3 * t + G.t * 0.9 + o.ph);
      pts.push([x - hw + wob, py]);
    }
    // round head: a semicircle-ish arc of 8 points, left neck side over
    // the top to right neck side
    const headArcCx = x, headArcCy = y - 0.84 * h, headArcR = 0.18 * h;
    for (let i = 0; i <= 7; i++) {
      const t = i / 7;
      const ang = -Math.PI + t * Math.PI;
      pts.push([headArcCx + headArcR * Math.cos(ang), headArcCy + headArcR * Math.sin(ang)]);
    }
    for (let i = 7; i >= 0; i--) {
      const t = i / (N / 2);
      const hw = (0.52 - (0.52 - 0.26) * (t / 0.70)) * 0.5 * h;
      const py = Math.min(y - t * h, y);
      const wob = 0.02 * h * Math.sin(3 * t + G.t * 0.9 + o.ph);
      pts.push([x + hw + wob, py]);
    }
    litSplit(ctx, pts, o.lit, o.shade);

    // two dark hollows on the head — its new face
    const headCx = x, headCy = y - 1.0 * h + 0.04 * h;
    circle(ctx, headCx - 0.07 * h + side * 0.02 * h, headCy, 0.035 * h, "rgba(13,17,20,0.85)");
    circle(ctx, headCx + 0.07 * h + side * 0.02 * h, headCy, 0.035 * h, "rgba(13,17,20,0.85)");

    // muffler: one band round the neck
    const neckY = y - 0.70 * h;
    const w = 0.12 * h;
    const tone = window.GenEldPal.tone("oxblood") || { lit: o.lit, mid: o.shade, shade: o.shade };
    if (!o._att) o._att = { kind: "muffler", fit: "found", seed: o.ph || 0 };
    litSplit(ctx, [
      [x - 0.17 * h, neckY - w / 2], [x + 0.17 * h, neckY - w / 2],
      [x + 0.17 * h, neckY + w / 2], [x - 0.17 * h, neckY + w / 2],
    ], tone.lit, tone.mid);

    // two tails hang behind (opposite o.side), dropping to the deck then
    // lying flat for the last 60% of their 2h length
    const behind = -side;
    const tailLen = 2 * h;
    const dropLen = tailLen * 0.4, flatLen = tailLen * 0.6;
    const half = w / 2;
    const WX = window.GenAttire && window.GenAttire.weather;
    const offsets = [[0, 0], [0.07 * h, 0.04 * h]];
    offsets.forEach((off, ti) => {
      const sx0 = x + off[0], sy0 = neckY + w / 2 + off[1];
      const kneeY = Math.min(y, sy0 + dropLen);
      const tipX = sx0 + behind * flatLen;
      const w0 = WX ? WX.w : 0;
      const wt = WX ? WX.t : 0;
      const tipOff = w0 * tailLen * 0.35 + 0.06 * tailLen * Math.abs(w0) * Math.sin(2 * Math.PI * 1.6 * wt + ti);
      const off0 = 0, offKnee = tipOff * 0.4, offTip = tipOff * 1;
      const poly = [
        [sx0 - half + off0, sy0], [sx0 + half + off0, sy0],
        [sx0 + half + offKnee, kneeY], [tipX + half + offTip, kneeY],
        [tipX - half + offTip, kneeY], [sx0 - half + offKnee, kneeY],
      ];
      litSplit(ctx, poly, tone.lit, tone.shade);
      const ribN = ti === 0 ? 3 : 4;
      for (let r = 1; r <= ribN; r++) {
        const t = r / (ribN + 1);
        const frac = 0.4 + 0.6 * t;
        const rx = sx0 + (tipX - sx0) * frac + tipOff * frac;
        Paint.poly(ctx, [[rx - half, kneeY - 0.02 * h], [rx + half, kneeY - 0.02 * h], [rx + half, kneeY + 0.02 * h], [rx - half, kneeY + 0.02 * h]]);
        ctx.fillStyle = tone.shade;
        ctx.fill();
      }
    });
  }

  const PAINT = { gentleman, strider, crawler, slider, floater, winged, blinker, roller, eye: eyeCreature, mass };

  // draws a single old one of `kind` at an arbitrary place, for other files
  // (the depths draw Obrokxus's brothers this way, outside the roster/place pipeline)
  function drawKind(ctx, kind, o, x, y, h, p) {
    const fn = PAINT[kind];
    if (!fn) return;
    fn(ctx, o, x, y, h, p);
  }

  function drawPin(ctx, o, p) {
    const W = G.W, H = G.H, u = p.pinU;
    let x = p.x - 0.08 * W * clamp(u / 0.4, 0, 1), y = p.y;
    const ang = (o.idx * 2.39996) % (Math.PI * 2);
    const d = 0.6 * H * clamp((u - 0.4) / 0.6, 0, 1);
    x += Math.cos(ang) * d; y += Math.sin(ang) * d;
    ctx.save();
    ctx.fillStyle = `rgb(${o.hue})`;
    ctx.globalAlpha = (1 - u) * 0.25;
    ctx.beginPath(); ctx.arc(x, y, Math.max(4, 0.011 * H), 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1 - u;
    ctx.beginPath(); ctx.arc(x, y, Math.max(1.5, 0.004 * H), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawOldOnes(ctx, env) {
    const W = G.W, H = G.H;
    const inside = env.layer === "inside";
    function paintOne(c, o, p) {
      c.save();
      if (p.clipY != null) { c.beginPath(); c.rect(-W, -H, 3 * W, p.clipY + H); c.clip(); }
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      if (p.mirror) c.scale(-1, 1);
      if (p.clipBox) {   // ink box from the feet (ib); the cut's polygon plus the growing rect, straight edges
        const cb = p.clipBox, ib = cb.ib, X = (u) => ib[0] + u * ib[2], Y = (v) => ib[1] + v * ib[3];
        let ar = 0; cb.cut.forEach((q, i) => { const n = cb.cut[(i + 1) % cb.cut.length]; ar += q[0] * n[1] - n[0] * q[1]; });
        const r = cb.rect, rc = [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]];
        if (ar < 0) rc.reverse();
        c.beginPath();
        cb.cut.forEach((q, i) => { i ? c.lineTo(X(q[0]), Y(q[1])) : c.moveTo(X(q[0]), Y(q[1])); }); c.closePath();
        rc.forEach((q, i) => { i ? c.lineTo(X(q[0]), Y(q[1])) : c.moveTo(X(q[0]), Y(q[1])); }); c.closePath();
        c.clip();
      }
      c.scale(p.scale, p.scale * p.sy);
      // a growing part is painted where the chip's body was measured: gaits read the world x, so the drawing there is the chip's pose
      const gx = p.clipBox ? p.clipBox.fx : p.x, gy = p.clipBox ? p.clipBox.fy : p.y;
      c.translate(-gx, -gy);
      PAINT[o.kind](c, o, gx, gy, o.hf * H, p);
      c.translate(gx - p.x, gy - p.y);
      drawMaking(c, o, p, o.hf * H);
      c.restore();
    }
    windAt(G.t || 0);
    const wantRift = !inside && G.BEATS[G.beat].id === "walk" && riftOn();
    const R = wantRift ? riftAnchor() : null;
    let nearest = null;
    ctx.save();
    for (const idx of ORDER) {
      const o = ROSTER[idx];
      const p = place(o, env);
      if (!inside && p.pinU >= 0) drawPin(ctx, o, p);
      if (inside ? !(p.e > 0 && p.e < 0.85) : p.e < 0.85) continue;
      if (p.a < 0.04 || p.x < -0.35 * H || p.x > W + 0.35 * H) continue;
      ctx.globalAlpha = p.a;
      paintOne(ctx, o, p);
      if (wantRift && p.e > 0 && p.x >= 0 && p.x <= W) {
        const ncx = p.x, ncy = p.y - 0.5 * o.hf * H;
        const dd = (ncx - R.x) * (ncx - R.x) + (ncy - R.y) * (ncy - R.y);
        if (!nearest || dd < nearest.dd) nearest = { o, p, dd };
      }
    }
    if (nearest) {
      ctx.globalAlpha = nearest.p.a;
      riftBand(ctx, nearest.p.x, nearest.p.y - 0.5 * nearest.o.hf * H, nearest.o.hf * H,
        (c) => paintOne(c, nearest.o, nearest.p));
    }
    ctx.restore();
    const WX = window.GenAttire && window.GenAttire.weather;
    if (WX) { WX.w = 0; WX.g = 0; WX.frost = 0; }
  }

  /* ---- rift light (break, walk only): a cold flat band on the side of
     the nearest silhouette that faces the rift where the point broke.
     Flat colour, held steps, no gradient — the cutscene's only second
     light. */

  const RIFT_OFF = document.createElement("canvas");
  let riftCtx = null;

  function riftAnchor() {
    return { x: Math.max(0, Math.min(G.W, sx(0))), y: 0.46 * G.H };
  }

  function riftOn() {
    const id = G.BEATS[G.beat].id;
    if (id !== "break" && id !== "walk") return false;
    if (id === "break" && G.secs("break") <= 0.20 * G.BREAK_SECS) return false;
    if (G.reduced) return true;
    return Math.floor(G.local * 3) % 7 !== 3;
  }

  function riftBand(ctx, cx, cy, h, paintFn, color) {
    if (!window.GenEldPal) return;
    const t = GenEldPal.tone("rift");
    if (!t) return;
    if (!ctx.getTransform) return;
    const w = ctx.canvas.width, hh = ctx.canvas.height;
    if (RIFT_OFF.width !== w || RIFT_OFF.height !== hh) { RIFT_OFF.width = w; RIFT_OFF.height = hh; }
    if (!riftCtx) riftCtx = RIFT_OFF.getContext("2d");
    riftCtx.setTransform(1, 0, 0, 1, 0, 0);
    riftCtx.globalCompositeOperation = "source-over";
    riftCtx.globalAlpha = 1;
    riftCtx.clearRect(0, 0, w, hh);

    riftCtx.setTransform(ctx.getTransform());
    riftCtx.globalAlpha = ctx.globalAlpha;
    paintFn(riftCtx);

    const R = riftAnchor();
    const dir = R.x >= cx ? 1 : -1;
    const d = Math.max(4, Math.round(h * 0.06));

    riftCtx.globalCompositeOperation = "destination-out";
    riftCtx.save();
    riftCtx.translate(-dir * d, 0);
    paintFn(riftCtx);
    riftCtx.restore();

    riftCtx.globalCompositeOperation = "source-in";
    riftCtx.setTransform(1, 0, 0, 1, 0, 0);
    riftCtx.globalAlpha = 1;
    riftCtx.fillStyle = color || t.lit;
    riftCtx.fillRect(0, 0, w, hh);

    riftCtx.globalCompositeOperation = "source-over";
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(RIFT_OFF, 0, 0);
    ctx.restore();
  }

  /* ---- shards --------------------------------------------------------
     Splinters flung when the point breaks open. Three groups converge in
     held steps on the edge of three old ones; then each one's whole
     silhouette (its own painter, limbs and eye kept) appears dark with a
     pale rim, the shards stay on its edge as a crust, hold, then everything
     shatters. Times are seconds into the break beat; the hit is at 0.5. */

  const FIG_N = 36, SHARD_FORM = 3 * FIG_N, CONF_N = 30, FLASH_N = 8, SHARD_N = SHARD_FORM + CONF_N + FLASH_N;
  const T_FLASH = 0.7;      // flash shards are gone this long after the hit
  const T_HIT = 0.5, T_STOP = 1.1, T_SNAP = 0.2, T_SIL = 1.5, T_HOLD = 2.4, T_END = 2.9;
  const FIG_KINDS = ["foot", "face", "hand", "eye"];
  const FIG_SIZE = [0.45, 0.45, 0.5, 0.35];      // longest side, in screen heights; each sits mostly in frame, at most slightly cut by one edge

  /* four giant fragments of flesh: a smooth closed body through lumpy points
     (clockwise, y down, in each one's own unit box), union-filled with round
     lobes (toes, fingers, bumps), then holes cut to the backdrop as
     ellipses [cx, cy, rx, ry, rot]. The eye adds sclera, iris and a slit pupil. */
  const FRAGS = {
    foot: { w: 200, h: 100,
      body: [[22,0],[90,0],[98,20],[130,26],[165,26],[186,36],[184,62],[178,84],[150,96],[110,92],[76,98],[36,100],[8,84],[0,52],[10,24]],
      lobes: [[188,40,12,15,0],[186,60,10,10,0],[181,76,9,9,0],[172,88,8,7,0],[34,16,14,16,0]],
      holes: [[191,35,4,5,0.3]] },
    face: { w: 100, h: 160,
      body: [[96,0],[100,60],[100,150],[64,160],[34,152],[28,138],[40,124],[30,116],[34,106],[42,98],[16,82],[10,72],[26,66],[36,54],[26,40],[36,20],[56,2]],
      lobes: [[44,44,16,12,-0.3]],
      holes: [[58,42,11,7,-0.2],[22,77,3,2,0.5],[54,111,16,3,0.05]] },
    hand: { w: 140, h: 206,
      body: [[44,0],[112,0],[122,40],[130,80],[122,120],[70,126],[24,120],[18,84],[24,50]],
      lobes: [[28,150,11,42,0.08],[56,160,11,46,0],[85,152,11,42,-0.06],[114,138,10,34,-0.2],[14,76,11,30,0.5]],
      holes: [] },
    eye: { w: 160, h: 130, eye: true,
      body: [[50,6],[100,0],[142,22],[158,64],[146,108],[104,128],[56,130],[16,110],[2,66],[14,26]],
      lobes: [[150,30,16,18,0],[10,96,14,16,0],[120,118,20,12,0]],
      holes: [] }
  };
  function fleshTone(name, lit, shade) {
    const GP = window.GenEldPal, t = GP ? GP.tone(name) : null;
    return t ? [t.lit, t.shade] : [lit, shade];
  }
  function paintFrag(c, kind, S) {
    const f = FRAGS[kind], k = S * 0.8 / Math.max(f.w, f.h);
    const ell = (e) => { c.moveTo(e[0] + e[2] * Math.cos(e[4]), e[1] + e[2] * Math.sin(e[4])); c.ellipse(e[0], e[1], e[2], e[3], e[4], 0, TAU); };
    const trace = () => {
      const p = f.body, n = p.length;
      c.beginPath();
      c.moveTo((p[n - 1][0] + p[0][0]) / 2, (p[n - 1][1] + p[0][1]) / 2);
      for (let i = 0; i < n; i++) {
        const q = p[(i + 1) % n];
        c.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + q[0]) / 2, (p[i][1] + q[1]) / 2);
      }
      c.closePath();
      for (const l of f.lobes) ell(l);
    };
    c.save();
    c.translate((S - f.w * k) / 2, (S - f.h * k) / 2);
    c.scale(k, k);
    const flesh = fleshTone("beaver", "#6a5a4a", "#3a3128");
    litShade(c, trace, f.w * 0.4, flesh[0], flesh[1]);
    if (f.eye) {
      const sc = fleshTone("linen", "#b8b2a4", "#6e6a62"), ir = fleshTone("oxblood", "#5c2c2e", "#331718");
      litShade(c, () => { c.beginPath(); c.ellipse(80, 64, 50, 42, 0, 0, TAU); }, 62, sc[0], sc[1]);
      litShade(c, () => { c.beginPath(); c.ellipse(88, 66, 26, 26, 0, 0, TAU); }, 80, ir[0], ir[1]);
    }
    c.globalCompositeOperation = "destination-out";
    c.fillStyle = "#000";
    c.beginPath();
    for (const h of f.holes) ell(h);
    if (f.eye) ell([90, 66, 6, 20, 0]);
    c.fill();
    c.restore();
  }
  const FIG_AT = [[-0.30, 0.42], [0.36, 0.50], [0.02, 0.58]];   // x in widths, y in heights from the point's x
  const RIM_FLAT = "rgb(78,86,92)";   // clearly above the body fill, on the lit side only
  const RIM_TONE = ["rgb(30,36,40)", "rgb(20,25,29)"];
  const SHARD_TONES = [["rgb(92,92,92)", "rgb(48,48,48)"], ["rgb(80,80,80)", "rgb(42,42,42)"], ["rgb(104,104,104)", "rgb(56,56,56)"]];

  const SHARDS = (function build() {
    const rnd = mulberry(9002);
    const list = [];
    for (let i = 0; i < SHARD_N; i++) {
      list.push({
        ang: rnd() * TAU,
        spd: mix(0.7, 1.3, rnd()),
        size: i >= SHARD_FORM + CONF_N ? mix(70, 110, rnd()) : mix(20, 60, rnd()),
        spin: (rnd() < 0.5 ? -1 : 1) * mix(2, 6, rnd()),
        tone: Math.floor(rnd() * 3),
        rs: mix(0.16, 0.34, rnd()),
        tang: rnd() * TAU,
        fig: i < SHARD_FORM ? i % 3 : -1,
        pt: i < SHARD_FORM ? Math.floor(i / 3) : 0,
        flash: i >= SHARD_FORM + CONF_N,
      });
      // flash shards fly up and out sideways, never down into the caption band
      if (i >= SHARD_FORM + CONF_N) list[i].ang = -Math.PI * (0.08 + 0.84 * ((i - SHARD_FORM - CONF_N + rnd() * 0.7) / FLASH_N));
    }
    return list;
  })();

  // per figure, built once: FIG_CV[f] is the dark silhouette with a pale rim
  // (bbox centred, padded), FIG_M[f] its longest side in px; FIG_PTS holds
  // edge points in unit coordinates (longest side = 1, centred)
  let FIG_PTS = null;
  const FIG_CV = [null, null, null, null], FIG_M = [1, 1, 1, 1];
  function sampleFigures() {
    FIG_PTS = new Float32Array(4 * FIG_N * 2);
    const S = 320, PAD = 5, cv = document.createElement("canvas");
    cv.width = cv.height = S;
    const c = cv.getContext("2d", { willReadFrequently: true });
    for (let f = 0; f < 4; f++) {
      c.clearRect(0, 0, S, S);
      paintFrag(c, FIG_KINDS[f], S);
      const d = c.getImageData(0, 0, S, S).data;
      const ex = [], ey = [];
      let x0 = S, x1 = 0, y0 = S, y1 = 0;
      const solid = (x, y) => x >= 0 && y >= 0 && x < S && y < S && d[(y * S + x) * 4 + 3] > 100;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        if (!solid(x, y)) continue;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x % 2 === 0 && y % 2 === 0 && !(solid(x - 3, y) && solid(x + 3, y) && solid(x, y - 3) && solid(x, y + 3))) { ex.push(x); ey.push(y); }
      }
      if (x1 < x0) continue;
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1, m = Math.max(bw, bh), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      FIG_M[f] = m;
      for (let k = 0; k < FIG_N && ex.length; k++) {
        const j = Math.min(ex.length - 1, Math.floor((k + 0.5) * ex.length / FIG_N));
        FIG_PTS[(f * FIG_N + k) * 2] = (ex[j] - cx) / m;
        FIG_PTS[(f * FIG_N + k) * 2 + 1] = (ey[j] - cy) / m;
      }
      // the painted fragment cropped to its box, padded
      const out = document.createElement("canvas");
      out.width = bw + PAD * 2; out.height = bh + PAD * 2;
      out.getContext("2d").drawImage(cv, x0, y0, bw, bh, PAD, PAD, bw, bh);
      FIG_CV[f] = out;
    }
  }

  // one flat-lit triangle, no arrays, no clip: shade whole, lit left half
  function paintShard(c, qx, qy, ang, sz, tone) {
    const t = tone === -1 ? RIM_TONE : SHARD_TONES[tone || 0];
    const co = Math.cos(ang), si = Math.sin(ang);
    const ax = qx - si * -sz * 0.6, ay = qy + co * -sz * 0.6;
    const bx = qx + co * sz * 0.5 - si * sz * 0.4, by = qy + si * sz * 0.5 + co * sz * 0.4;
    const dx = qx - co * sz * 0.5 - si * sz * 0.4, dy = qy - si * sz * 0.5 + co * sz * 0.4;
    c.fillStyle = t[1];
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.lineTo(dx, dy); c.closePath(); c.fill();
    c.fillStyle = t[0];
    c.beginPath(); c.moveTo(ax, ay); c.lineTo((bx + dx) * 0.5, (by + dy) * 0.5); c.lineTo(dx, dy); c.closePath(); c.fill();
  }

  const SH_NEAR = { a: 1, qx: 0, qy: 0, ang: 0, sz: 0, tone: 0, dd: 0, on: false };
  // a fragment's final centre for a box w by h: only its signature edge stays in frame
  // (foot: toe corner bottom-left; face: profile edge at the right; hand: fingertips from the top; eye: cut by the top edge)
  function figPose(f, w, h, W, H) {
    if (f === 0) return [0.46 * w, 0.7 * H + h / 2];   // foot: bottom-left, its edge just cut
    if (f === 1) return [W - 0.46 * w, 0.5 * H];   // face: right edge, profile just cut
    if (f === 3) return [0.64 * W, 0.45 * h];   // eye: the top edge just cuts it (5%), clear of the other three
    return [0.46 * w, 0.34 * H];   // hand: left edge, upper half
  }

  let CAP_BAND = null;
  // the fragments are no longer drawn, so nothing covers the dust
  function figCover() { return 0; }
  // the measured caption band in canvas px, or null
  function captionBand() { return G.inBreak() ? CAP_BAND : null; }

  const CAP_CLIP = { on: false, x0: 0, x1: 0, y0: 0, y1: 0 };

  function drawShards(ctx, burst, kick = 0) {
    const T = G.secs("break");
    const W = G.W, H = G.H;
    // the caption band in canvas px (DOM text, so measured): no shard, figure or confetti paints inside it;
    // measured every frame of the beat, before the early returns
    let bt = 0, bb = 0, capX0 = 0, capX1 = W;
    const capA = document.getElementById("genesis-tag"), capB = document.getElementById("genesis-line");
    if (capB && ctx.canvas) {
      const cr = ctx.canvas.getBoundingClientRect(), r1 = (capA || capB).getBoundingClientRect(), r2 = capB.getBoundingClientRect();
      if (cr.height > 0 && r2.height > 0) {
        bt = (r1.top - cr.top) / cr.height * H - 0.02 * H;
        bb = (r2.bottom - cr.top) / cr.height * H + 0.02 * H;
        capX0 = (Math.min(r1.left, r2.left) - cr.left) / cr.width * W - 0.02 * H;
        capX1 = (Math.max(r1.right, r2.right) - cr.left) / cr.width * W + 0.02 * H;
      }
    }
    CAP_BAND = bb > bt ? { y0: bt, y1: bb } : null;
    if (burst <= 0.001) return;
    if (T < T_HIT || T >= T_END) return;
    if (!FIG_PTS) sampleFigures();
    const ox = sx(0), oy = 0.46 * H;
    const u = T - T_HIT;
    const big = Math.max(W, H);
    const wantRift = G.BEATS[G.beat].id === "break" && riftOn();
    const R = wantRift ? riftAnchor() : null;
    const dmin = 0.03 * H;
    const yMax = 0.78 * H;
    const reduced = G.reduced;
    SH_NEAR.on = false;
    CAP_CLIP.on = bb > bt; CAP_CLIP.x0 = capX0; CAP_CLIP.x1 = capX1; CAP_CLIP.y0 = bt; CAP_CLIP.y1 = bb;
    ctx.save();
    for (const s of SHARDS) {
      let qx, qy, ang, a = 1;
      let sz = s.size, tone = s.tone;
      if (s.fig >= 0) {
        continue;
      } else {
        if (reduced) continue;
        let r;
        if (s.flash) {
          if (u > T_FLASH) continue;
          r = (0.02 * H + Math.pow(u / T_FLASH, 1.5) * 1.15 * big * s.spd) * (1 + kick);
        } else {
          if (T >= T_STOP && T < T_HOLD + 0.3) continue;
          r = (0.02 * H + (1 - Math.exp(-3.2 * u)) * 0.9 * big * s.spd) * (1 + kick);
        }
        qx = ox + Math.cos(s.ang) * r;
        qy = oy + Math.sin(s.ang) * r;
        ang = s.ang + u * s.spin;
        if (T > 2.5) a = clamp((T_END - T) / (T_END - 2.5), 0, 1);
        if (T >= T_HOLD) a *= clamp((T - T_HOLD) / 0.15, 0, 1);
        if (qy + sz * 1.05 > yMax) continue;
      }
      if (qy + sz * 1.05 > bt && qy - sz * 1.05 < bb) continue;   // full rotated radius clears the caption band
      ctx.globalAlpha = a * 0.95;
      paintShard(ctx, qx, qy, ang, sz, tone);
      if (wantRift) {
        const dd = (qx - R.x) * (qx - R.x) + (qy - R.y) * (qy - R.y);
        if (dd >= dmin * dmin && (!SH_NEAR.on || dd < SH_NEAR.dd)) {
          SH_NEAR.on = true; SH_NEAR.qx = qx; SH_NEAR.qy = qy; SH_NEAR.ang = ang; SH_NEAR.sz = sz; SH_NEAR.tone = tone; SH_NEAR.a = a; SH_NEAR.dd = dd;
        }
      }
    }
    if (SH_NEAR.on) {
      ctx.globalAlpha = 0.95 * SH_NEAR.a;
      riftBand(ctx, SH_NEAR.qx, SH_NEAR.qy, SH_NEAR.sz,
        (c) => paintShard(c, SH_NEAR.qx, SH_NEAR.qy, SH_NEAR.ang, SH_NEAR.sz, SH_NEAR.tone), SHARD_TONES[0][0]);   // break band is the shard's own dark grey
    }
    ctx.restore();
  }

  return { OLD_DIM, ROSTER, ORDER, PAINT, place, deckSpot, birthT,drawOldOnes, drawShards, figCover, captionBand, drawKind, makeOne, litSplit, eyeDot, dressNow, windAt, frostNow };
})();
