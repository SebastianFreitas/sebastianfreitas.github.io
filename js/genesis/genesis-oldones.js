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

  /* ---- emergence: one by one out of the mass of matter ------------- */
  const VENT_DUR = 1.8, VENT_FIRST = 2.6, VENT_STEP = 0.2, GENT_T0 = 0.4, GENT_DUR = 2.4;
  const GENT_IDX = ROSTER.findIndex(o => o.kind === "gentleman");
  const VENT_T0 = (function () {
    const rank = ROSTER.map((o, i) => i), sh = mulberry(9005);
    for (let i = rank.length - 1; i > 0; i--) { const j = Math.floor(sh() * (i + 1)); const t = rank[i]; rank[i] = rank[j]; rank[j] = t; }
    const t0 = [];
    if (GENT_IDX >= 0) t0[GENT_IDX] = GENT_T0;
    let k = 0;
    rank.forEach((idx) => {
      if (idx === GENT_IDX) return;
      t0[idx] = VENT_FIRST + k * VENT_STEP;
      k++;
    });
    return t0;
  })();

  function ventDur(idx) { return idx === GENT_IDX ? GENT_DUR : VENT_DUR; }
  function ventSteps(idx) { return idx === GENT_IDX ? 6 : 3 + Math.floor(hash1(idx * 29 + 5) * 3); }

  // upper-left rim of the mass for west-goers, upper-right for east-goers
  function ventAng(o) {
    const h = hash1(o.idx * 17 + 2);
    return o.side < 0 ? -Math.PI * (0.55 + 0.40 * h) : -Math.PI * (0.05 + 0.40 * h);
  }

  const VENT = { x0: 0, y0: 0, x1: 0, y1: 0 };
  function ventOf(o) {
    const M = window.GenMatter && GenMatter.MASS;
    const cx = sx(0);
    const cy = (M ? M.yf : 0.52) * G.H;
    const ms = window.GenMatter ? GenMatter.massScale(VENT_T0[o.idx] + ventDur(o.idx) * 0.5) : 1;
    const rx = (M ? M.rxH : 0.30) * G.H * ms;
    const ry = (M ? M.ryH : 0.12) * G.H * ms;
    const a = ventAng(o);
    VENT.x0 = cx + Math.cos(a) * rx * 0.3;
    VENT.y0 = cy + Math.sin(a) * ry * 0.3;
    VENT.x1 = cx + Math.cos(a) * rx * 1.1;
    VENT.y1 = cy + Math.sin(a) * ry * 1.1 - 0.01 * G.H;
    return VENT;
  }

  function emergeK(o, trs) { return clamp((trs - VENT_T0[o.idx]) / ventDur(o.idx), 0, 1); }

  const VENTS_OUT = [];
  function activeVents(trs) {
    VENTS_OUT.length = 0;
    for (const o of ROSTER) {
      const e = emergeK(o, trs);
      if (e > 0 && e < 1) {
        const v = ventOf(o);
        VENTS_OUT.push({ x: mix(v.x0, v.x1, 0.6), y: mix(v.y0, v.y1, 0.6), k: Math.sin(Math.PI * e) * (o.idx === GENT_IDX ? 1.8 : 1) });
      }
    }
    return VENTS_OUT;
  }

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

  function place(o, env) {
    const W = G.W, H = G.H, deckY = DECK * H;
    const idx = o.idx;
    const { emerge, walk, cling, still, watch, flesh } = env;

    /* dressing: one east-goer at a time, held at the snap */
    const dt = dressT(o);
    o.dressed = (o.side > 0 && !o.bro) ? dt >= 0 : false;
    const dressHold = (o.side > 0 && !o.bro) && Math.abs(dt) < HOLD;

    /* 1. climb out of the mass */
    const e = emergeK(o, emerge);
    const v = ventOf(o);
    const n = ventSteps(idx);
    const s = e <= 0 ? 0 : Math.min(1, (Math.floor(e * n) + 1) / n);
    const rimX = v.x1, rimY = v.y1;
    const xe = rimX, ye = rimY + (1 - s) * 1.1 * o.hf * H;
    const scale = 1;
    const rot = 0;
    const settle = smooth(clamp((emerge - VENT_T0[idx] - ventDur(idx)) / 1.2, 0, 1));

    /* 2. split to the deck */
    const splitU = o.side * (0.15 + 0.08 * hash1(idx * 7 + 1));
    const xd = sx(splitU), yd = deckY;
    let x, y;

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
    const sd = (o.idx || 0) + 1;
    const tl = (G.t || 0) + sd * 1.37;
    let phase = Math.abs(x - xd) * 0.045 * o.gait;
    if (o.side > 0) {
      const Ps = 3.2 + 2.4 * hash1a(sd);
      const held = (tl % Ps) < 0.18;
      if ((dressHold || held) && o._ph != null) phase = o._ph;
      else o._ph = phase;
      if (o.kind === "gentleman") phase = Math.round(phase / (Math.PI / 6)) * (Math.PI / 6);
    }
    const isFlyer = o.move === "fly";
    if (isFlyer) y = deckY - o.airY * H + Math.sin(G.t * 1.1 + o.ph) * 0.03 * H;
    else y = deckY - 2 + o.lane * 0.012 * H;
    if (isFlyer) x += 0.04 * W * Math.sin(G.t * 0.5 + o.ph);

    // from the rim of the mass down to the deck
    x = mix(xe, x, settle); y = mix(ye, y, settle);

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
      const ls = G.secs("leave");
      const at = LEAVE_T0 + (LEAVE_T1 - LEAVE_T0) * clamp(x / W, 0, 1);
      const u = (ls - at) / PIN_DUR;
      if (u >= 0 && u < 1 && a >= 0.04) pinU = Math.floor(u * 8) / 8;
      if (ls >= at + LEAVE_HALF) a = 0; else if (ls >= at) a *= 0.5;
    }

    const p = o.p;
    p.x = x; p.y = y; p.a = a; p.rot = rot; p.scale = scale;
    p.phase = phase; p.sy = sy; p.kneel = still;
    p.gest = 0;
    p.pinU = pinU;
    if (o.side > 0) {
      const stillV = still || 0;
      const q = Math.min(stillV, 0.9999) * 3, n = Math.floor(q), f = q - n;
      const ss = f < 0.8 ? 0 : (f - 0.8) / 0.2;
      p.kneel = (n + ss * ss * (3 - 2 * ss)) / 3;
      p.rot += -0.12 * Math.sin(Math.PI * Math.min(1, stillV * 1.25));

      const Pt = 6 + 3 * hash1a(sd * 7.1);
      if (!dressHold && (tl % Pt) < 0.08 && p.e >= 0.85) {
        p.x += 0.02 * H * (hash1a(sd * 3.3) - 0.5 < 0 ? -1 : 1);
        p.rot += 0.04;
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
      if (stumbleXs && stumbleXs.some((xi) => Math.abs(p.x - xi) < 0.025 * W)) {
        p.rot += 0.07 * (o.side < 0 ? -1 : 1);
        p.y += 0.004 * H;
      }
    }

    p.look = env.look != null ? env.look : sx(0);
    p.e = e;
    p.clipY = (e > 0 && e < 1) ? rimY : null;
    p.rimX = rimX; p.rimY = rimY; p.steps = n;
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

  /* ---- kind painters -------------------------------------------------
     h = height px, foot line at y. Every filled volume is lit/shade split
     from the left; thin-line limbs (too narrow to split) take a flat lit
     or shade colour from which side of the body they fall on. */

  // true once the `dress` beat has begun: before it every old one is bare;
  // each east-goer's own moment inside the beat is set below
  function dressNow() {
    return G.BEATS.some((b) => b.id === "dress") && G.since("dress") > 0;
  }

  // one at a time: each east-goer gets its own moment inside the dress beat,
  // the gentleman (the least changed, the most deliberate) going last
  var DRESS_T0 = 0.4, DRESS_T1 = 6.2, HOLD = 0.35, MAKE = 1.8;
  var _hasDressBeat = null;
  function hasDressBeat() {
    if (_hasDressBeat === null) _hasDressBeat = G.BEATS.some((b) => b.id === "dress");
    return _hasDressBeat;
  }

  // every old one but the three carers goes out, one by one left to right,
  // leaving a pin of its own colour that runs the rim then out into the void
  const LEAVE_T0 = 0.6, LEAVE_T1 = 4.8, LEAVE_HALF = 0.25, PIN_DUR = 1.4;
  const CARERS = { eye: 1, chime: 1, mound: 1 };
  var _hasLeaveBeat = null;
  function hasLeaveBeat() {
    if (_hasLeaveBeat === null) _hasLeaveBeat = G.BEATS.some((b) => b.id === "leave");
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
    return hasDressBeat() ? G.secs("dress") - dressAt(o) : -Infinity;
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
    const bob = 0.02 * h * Math.abs(Math.sin(p.phase));
    const cy = y - pu(o, 0.85, 1.05) * h + bob, cx = x;
    const rx = 0.14 * h, ry = 0.09 * h;
    litShade(ctx, () => { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); },
      cx - rx + 0.4 * 2 * rx, o.lit, o.shade);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let k = 0; k < 4; k++) {
      const off = k - 1.5;
      const kneeX = x + off * 0.16 * h, kneeY = y - pu(o, 1.02, 1.28) * h;
      const swing = p.phase + (k % 2) * Math.PI;
      const footX = x + off * 0.22 * h + 0.06 * h * Math.sin(swing);
      const footY = y - 0.05 * h * Math.max(0, Math.sin(swing));
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
    const bodyY = y - pu(o, 0.22, 0.17) * h;
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
        const kneeX = hipX + side * pu(o, 0.18, 0.25) * h, kneeY = y - pu(o, 0.42, 0.33) * h;
        const footX = hipX + side * pu(o, 0.30, 0.42) * h + 0.06 * h * Math.sin(p.phase * 1.6 + k * 0.8);
        const col = side < 0 ? o.lit : o.shade;
        line(ctx, [[hipX, hipY], [kneeX, kneeY], [footX, y]], col, 0.02 * h);
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
      const endY = y + pu(o, 0.6, 0.95) * h;
      ctx.beginPath();
      ctx.moveTo(rimX, rimY);
      ctx.quadraticCurveTo(mix(rimX, endX, 0.5), mix(rimY, endY, 0.4), endX, endY);
      ctx.stroke();
    }
    if (o.bro) eyeDot(ctx, x, y - ry * 0.3, h, p.look, 0.012 * h);
  }

  function winged(ctx, o, x, y, h, p) {
    const yy = y + 0.06 * h * Math.sin(G.t * 1.3 + o.ph);
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? -1 : 1;
      litSplit(ctx, [
        [x, yy - 0.02 * h],
        [x + side * pu(o, 0.5, 0.68) * h, yy - 0.25 * h * Math.sin(G.t * 6.5 + o.ph)],
        [x + side * 0.28 * h, yy + 0.06 * h],
      ], o.lit, o.shade);
    }
    litShade(ctx, () => { ctx.beginPath(); ctx.ellipse(x, yy, 0.12 * h, 0.06 * h, 0, 0, TAU); },
      x - 0.12 * h + 0.4 * 0.24 * h, o.lit, o.shade);
  }

  function blinker(ctx, o, x, y, h, p) {
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
    const cx = x, cy = y - pu(o, 0.35, 0.43) * h;
    const rot = -p.phase * 0.9;
    const rBase = pu(o, 0.20, 0.17) * h, rTip = pu(o, 0.35, 0.43) * h, rDisc = pu(o, 0.12, 0.10) * h;
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
    litShade(ctx, trace, cx - 0.4 * h, o.lit, o.shade);

    // hop every 1.2s, 0.2hf, a snap down (no in-between)
    const hopUp = (G.t % 1.2) / 1.2 < 0.5;
    const footY = hopUp ? y - 0.2 * h : y;

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
    if (_hasDress === null) _hasDress = G.BEATS.some(b => b.id === "dress");
    return _hasDress ? G.since("dress") : 0;
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

  // stone crumbs fall from the lip at each held step of the climb
  function drawFlakes(ctx, o, p, emerge) {
    if (!(emerge >= 0)) return;
    const H = G.H, t0 = VENT_T0[o.idx], d = ventDur(o.idx), n = p.steps;
    ctx.save();
    ctx.globalAlpha = 1;
    for (let k = 0; k < n; k++) {
      const tk = t0 + k * d / n;
      const age = emerge - tk;
      if (!(age >= 0 && age < 0.5)) continue;
      const aq = Math.floor(age / 0.08) * 0.08;
      for (let j = 0; j < 3; j++) {
        const h1 = hash1(o.idx * 131 + k * 7 + j);
        const h2 = hash1(o.idx * 71 + k * 13 + j * 3 + 1);
        const fx = p.rimX + (h1 - 0.5) * 0.08 * H + (h2 - 0.5) * 0.03 * H * aq * 2;
        const fy = p.rimY + 0.3 * H * aq * aq + 0.004 * H * h2;
        const sz = Math.max(1.5, (0.003 + 0.003 * h1) * H);
        ctx.fillStyle = j === 0 ? "#8d918c" : "#4b4f4c";
        ctx.fillRect(fx - sz / 2, fy - sz * 0.8 / 2, sz, sz * 0.8);
      }
    }
    ctx.restore();
  }

  function drawOldOnes(ctx, env) {
    const W = G.W, H = G.H;
    const inside = env.layer === "inside";
    windAt(G.t || 0);
    ctx.save();
    for (const idx of ORDER) {
      const o = ROSTER[idx];
      const p = place(o, env);
      if (!inside && p.pinU >= 0) drawPin(ctx, o, p);
      if (inside ? !(p.e > 0 && p.e < 0.85) : p.e < 0.85) continue;
      if (p.a < 0.04 || p.x < -0.35 * H || p.x > W + 0.35 * H) continue;
      ctx.globalAlpha = p.a;
      ctx.save();
      if (p.clipY != null) { ctx.beginPath(); ctx.rect(-W, -H, 3 * W, p.clipY + H); ctx.clip(); }
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(p.scale, p.scale * p.sy);
      ctx.translate(-p.x, -p.y);
      PAINT[o.kind](ctx, o, p.x, p.y, o.hf * H, p);
      drawMaking(ctx, o, p, o.hf * H);
      ctx.restore();
      if (p.clipY != null || (p.e >= 1 && env.emerge - VENT_T0[idx] - ventDur(idx) < 0.5)) drawFlakes(ctx, o, p, env.emerge);
    }
    ctx.restore();
    const WX = window.GenAttire && window.GenAttire.weather;
    if (WX) { WX.w = 0; WX.g = 0; WX.frost = 0; }
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

  function drawShards(ctx, burst, kick = 0) {
    if (burst <= 0.001 || burst >= 0.999) return;
    const W = G.W, H = G.H;
    const sb = smooth(burst);
    const ox = sx(0), oy = 0.46 * H;
    const a = (1 - burst) * 0.95;
    ctx.save();
    ctx.globalAlpha = a;
    for (const s of SHARDS) {
      const d = (0.04 + 0.90 * sb) * s.spd * (1 + kick);
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

  return { ROSTER, ORDER, PAINT, place, drawOldOnes, drawShards, drawKind, makeOne, litSplit, eyeDot, activeVents, VENT_DUR, dressNow, windAt, frostNow };
})();
