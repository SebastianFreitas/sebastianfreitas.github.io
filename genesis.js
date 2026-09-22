/* ===========================================================
   GENESIS — how the span began.

   Autoplay cinematic. First Setting visit (or Intro Cutscene)
   plays the record from the point: the span comes out of the
   left of the frame, the old ones walk the deck, Primordisentia
   is found and warped then bound, two lights tear out and fight
   in the void. Obrokxus wins. Rex becomes Rex the Surface.
   Then the chase, the children's war, the warlocks, the Hound,
   Mordrial's fall, and the duel that has not ended. Skip /
   Escape jumps to the fade into the live bridge.

   Direction: u grows east, east is screen right, and the record
   runs west. Whoever is running away holds the smaller u of a pair.
   =========================================================== */

window.Genesis = (function () {
  const { mulberry, hash1, smooth, clamp, mix, approach, vnoise, ridge } = Util;
  const { litShade, offsetShade } = Paint;
  const FORCE = /(?:[?&])genesis(?:=1)?(?:&|$)/.test(location.search);
  const JUMP  = /[?&]gbeat=([a-z]+)/.exec(location.search);
  /* dev switches run once: take them out of the URL so reload and
     Back don't run them again */
  (function dropParams(names) {
    try {
      const url = new URL(location.href);
      let changed = false;
      names.forEach(n => { if (url.searchParams.has(n)) { url.searchParams.delete(n); changed = true; } });
      if (changed) history.replaceState(history.state, "", url.pathname + url.search + url.hash);
    } catch (e) {}
  })(["genesis", "gbeat"]);
  const reduced = Util.reduced();

  const overlay = document.getElementById("genesis");
  const tagEl   = document.getElementById("genesis-tag");
  const lineEl  = document.getElementById("genesis-line");
  const copyEl  = overlay && overlay.querySelector(".genesis-copy");
  const ticksEl = document.getElementById("genesis-ticks");
  const trackEl = document.getElementById("genesis-track");
  const prevEl  = document.getElementById("genesis-prev");
  const nextEl  = document.getElementById("genesis-next");
  const skipEl  = document.getElementById("genesis-skip");
  const host    = document.getElementById("bridge-hero");

  const BEATS = [
    { id: "point", dur: 5.2, tag: "before record",
      line: "There was no place. Only a point, and the dark around it." },
    { id: "drawn", dur: 5.0, tag: "the first law",
      line: "The span came out of the dark, and it did not turn." },
    { id: "break", dur: 5.4, tag: "the old ones",
      line: "The point broke. What stepped out of it had no colour, and no name yet." },
    { id: "walk",  dur: 7.0, tag: "one side",
      line: "Some took the span west. This record follows those who went east." },
    { id: "root",  dur: 5.4, tag: "primordisentia",
      line: "At the far end they found a cry that was a body." },
    { id: "swarm", dur: 6.8, tag: "hunger",
      line: "They closed on it, and made it into what they were hungry for." },
    { id: "womb",  dur: 6.6, tag: "Crede, ergo magica est.",
      line: "They sealed the wound and named the seal a womb." },
    { id: "birth", dur: 5.8, tag: "first born",
      line: "Two lights tore out of it: Obrokxus, already wrong — and Rex, orange as a new star." },
    { id: "fight", dur: 8.2, tag: "obrokxus · rex",
      line: "They met in the void. Rex broke." },
    { id: "land",  dur: 6.0, tag: "rex the surface",
      line: "With the last of himself, Rex closed around Obrokxus and fell. His body cooled into ground, and held him there." },
    { id: "gods", dur: 7.0, tag: "the others",
      line: "It bought time. The womb tore again: Ormius, Ava, Kaeron, Kaelum, Orochronus." },
    { id: "deep", dur: 11.0, tag: "inside rex",
      line: "They went down after him, into Rex's deepest places. Chaos came up to meet them, answering to no one. The war lasted almost ten thousand years." },
    { id: "slip", dur: 7.0, tag: "his brothers",
      line: "In time Obrokxus set his brothers on the gods, and while they were held, he climbed." },
    { id: "flee", dur: 11.6, tag: "obrokxus flees",
      line: "He tore out through Rex and left a hole behind. Two lights followed: Ormius, law in gold-red — and Ava, pale as a healing wound." },
    { id: "war", dur: 9.2, tag: "their children",
      line: "The gods did not finish it. Their children did: Vorath, Malgrur, Seravim — an everlasting war." },
    { id: "stalemate", dur: 5.4, tag: "nothing won",
      line: "Even then the war led to nothing." },
    { id: "firstlock", dur: 6.8, tag: "mordrial",
      line: "They made one thing together, half Seravim, half Malgrur. Mordrial — the first warlock." },
    { id: "four", dur: 8.5, tag: "four of the void",
      line: "Four stood: Mordrial of the Void, Cadmus Baalzur, Aelius Luxent, Velindra the Chaos Binder." },
    { id: "fifth", dur: 7.8, tag: "the hound",
      line: "Cadmus made a fifth — not a person, a weapon. Eldrin walked into the nest and became the Hound." },
    { id: "fall", dur: 8.6, tag: "mordrial fell",
      line: "They met Obrokxus. The fight outlasted counting. Mordrial fell. The rest called it victory." },
    { id: "return", dur: 7.6, tag: "the mainland",
      line: "They turned home, to life and the void. Only Ormius still believed Obrokxus had survived." },
    { id: "eternity", dur: 8.8, tag: "still fighting",
      line: "No one has gone far enough to see. They fight there still." },
    { id: "now",   dur: 2.6, tag: "", line: "" },
  ];

  const ROOT_U = 4.0;
  const DECK   = 0.64;
  const BAY_U  = 0.125;
  const SPAN_START_U = -0.72;
  const REX_U  = ROOT_U - 0.52;
  const MAIN_U = ROOT_U - 5.35;
  const MAIN_HALF = 0.92;
  /* One axis, one convention, so this never has to be guessed at
     again: u grows EAST, and east is the right of the screen. The
     record runs the other way — west, to the left. So whoever is
     running away always holds the SMALLER u of a pair, and whoever
     is chasing always holds the larger one. The two names below
     were the wrong way round, which is where the sides kept
     swapping. */
  const EAST_U = MAIN_U + 0.40;   /* east rim: where Obrokxus stops */
  const WEST_U = MAIN_U - 0.38;   /* west side: the gods' own ground */
  const CITY_U = MAIN_U - 0.46;
  const NEST_U = MAIN_U + 0.50;
  const ET_END_U = MAIN_U - 3.85;
  const ET_START_U = MAIN_U - 0.58;
  const FLEE_START_U = REX_U - 0.18;
  const BURY_U = FLEE_START_U;      /* where Rex and Obrokxus go into the ground, and where he comes out */
  const DEEP_U = ROOT_U - 0.47;     /* the deepest pocket inside Rex */
  const DEEP_Y = 1.62;              /* its centre, in screen heights below the top of the frame */
  const DIVE_DEPTH = 1.12;          /* how far the camera sinks, in screen heights */
  const FLEE_CAM_RATE = 2.20;
  const ET_CAM_RATE   = 2.60;
  const KINDS  = ["spindle", "cluster", "crawler", "shard", "ring", "blob", "spindle", "crawler"];
  const SIEGE_GODS = [
    { kind: "ormius",     name: "ORMIUS",     rgb: "210,70,48",   ang: 3.40, ph: 0.0 },
    { kind: "ava",        name: "AVA",        rgb: "120,214,96",  ang: 2.20, ph: 1.3 },
    { kind: "kaeron",     name: "KAERON",     rgb: "70,130,255",  ang: 0.35, ph: 2.6 },
    { kind: "kaelum",     name: "KAELUM",     rgb: "236,92,150",  ang: 4.60, ph: 3.9 },
    { kind: "orochronus", name: "OROCHRONUS", rgb: "196,206,226", ang: 5.70, ph: 5.2 },
  ];
  const GREYS  = [
    [16, 18, 20],
    [44, 48, 52],
    [86, 90, 94],
    [132, 136, 140],
    [198, 200, 196],
  ];

  const YELLOW_KEYS = [
    { t: 0.00, x:  0.36, y: -0.10 },
    { t: 0.10, x:  0.36, y: -0.10 },
    { t: 0.14, x: -0.42, y: -0.34 },
    { t: 0.23, x: -0.38, y: -0.28 },
    { t: 0.27, x:  0.04, y:  0.00 },
    { t: 0.38, x:  0.44, y:  0.26 },
    { t: 0.42, x:  0.44, y:  0.26 },
    { t: 0.46, x: -0.12, y: -0.42 },
    { t: 0.52, x:  0.00, y:  0.00 },
    { t: 0.62, x: -0.46, y:  0.22 },
    { t: 0.68, x: -0.08, y: -0.06 },
    { t: 0.76, x:  0.14, y:  0.08 },
    { t: 0.84, x: -0.04, y: -0.02 },
    { t: 0.88, x:  0.06, y:  0.00 },
    { t: 1.00, x:  0.22, y: -0.14 },
  ];
  const RED_KEYS = [
    { t: 0.00, x: -0.32, y:  0.14 },
    { t: 0.14, x: -0.20, y:  0.08 },
    { t: 0.27, x: -0.02, y:  0.02 },
    { t: 0.40, x:  0.22, y: -0.16 },
    { t: 0.52, x:  0.04, y:  0.02 },
    { t: 0.64, x: -0.18, y:  0.18 },
    { t: 0.70, x:  0.08, y:  0.00 },
    { t: 0.80, x:  0.12, y:  0.06 },
    { t: 0.88, x: -0.08, y: -0.12 },
    { t: 0.94, x: -0.18, y: -0.16 },
    { t: 1.00, x: -0.14, y: -0.10 },
  ];

  const REX_BANDS = [
    { lit: "#39485a", shade: "#26313d",
      amp: 0.062, base: 0.30, seed: 1201, drift: 0.16, rampAt: 0.52, climb: 0.34 },
    { lit: "#2b3742", shade: "#1c242d",
      amp: 0.078, base: 0.18, seed: 3307, drift: 0.13, rampAt: 0.58, climb: 0.28 },
    { lit: "#2a3640", shade: "#1b2228",
      amp: 0.095, base: 0.07, seed: 5501, drift: 0.10, rampAt: 0.64, climb: 0.22 },
  ];
  const REX_WEST = ROOT_U - 0.98;
  const REX_EAST = ROOT_U - 0.02;

  // a terrain silhouette lit from the left: flat fill, then a hard-edged lit
  // cap offset up-left, clipped to the shape, so the cap reads thick on
  // rising (left-facing) slopes and vanishes on steep right-facing slopes
  function fillRidge(ctx, pts, bottom, lit, shade) {
    const path = new Path2D();
    if (pts.length < 2) return path;
    path.moveTo(pts[0][0], bottom);
    for (const p of pts) path.lineTo(p[0], p[1]);
    path.lineTo(pts[pts.length - 1][0], bottom);
    path.closePath();
    Paint.fillRidge(ctx, path, lit, shade, H * 0.05, H * 0.035);
    return path;
  }
  // world-anchored sample points along [left, right] so terrain doesn't
  // slide through the noise field as the camera moves
  function gridXs(left, right, step) {
    const du = step / W;
    const k0 = Math.floor((cam + (left - W * 0.5) / W) / du);
    const k1 = Math.ceil((cam + (right - W * 0.5) / W) / du);
    const out = [];
    for (let k = k0; k <= k1; k++) {
      const wu = k * du;
      out.push([sx(wu), wu]);
    }
    return out;
  }
  function mixHex(a, b, u) {
    u = Math.min(1, Math.max(0, u));
    const ca = parseInt(a.slice(1), 16), cb = parseInt(b.slice(1), 16);
    const ar = (ca >> 16) & 255, ag = (ca >> 8) & 255, ab = ca & 255;
    const br = (cb >> 16) & 255, bg = (cb >> 8) & 255, bb = cb & 255;
    const r = Math.round(ar + (br - ar) * u);
    const g = Math.round(ag + (bg - ag) * u);
    const bch = Math.round(ab + (bb - ab) * u);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + bch).toString(16).slice(1);
  }
  // a hard-edged glow: three stepped flat discs instead of a gradient
  function flatGlow(ctx, x, y, r, rgb, a) {
    if (a < 0.01 || r <= 0) return;
    ctx.fillStyle = `rgba(${rgb},${a * 0.14})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    ctx.fillStyle = `rgba(${rgb},${a * 0.20})`;
    ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, 6.283); ctx.fill();
    ctx.fillStyle = `rgba(${rgb},${a * 0.30})`;
    ctx.beginPath(); ctx.arc(x, y, r * 0.34, 0, 6.283); ctx.fill();
  }
  // lit/shade/glow/core colours for each flat god orb
  const ORB_STYLE = {
    rex: { lit: "#f58a34", shade: "#b4461e", glow: "245,138,52", core: "#ffe2be" },
    ormius: { lit: "#d24030", shade: "#8e1a1c", glow: "210,64,48", core: "#fff4dc" },
    ava: { lit: "#78d660", shade: "#3f8a3a", glow: "120,214,96", core: "#eaffe2" },
    kaelum: { lit: "#ec5c96", shade: "#9a2a60", glow: "236,92,150", core: "#ffecf4" },
    orochronus: { lit: "#c4cee2", shade: "#7c869e", glow: "196,206,226", core: "#f8faff" },
    kaeron: { lit: "#4682ff", shade: "#2240a0", glow: "70,130,255", core: "#e8f2ff" },
    cadmus: { lit: "#c84a36", shade: "#7a2a1e", glow: "240,150,120", core: "#ffc8aa" },
    aelius: { lit: "#1ea064", shade: "#10603c", glow: "30,160,100", core: "#e6fff0" },
    velindra: { lit: "#8c46d2", shade: "#56288a", glow: "140,70,210", core: "#f0dcff" },
  };
  // a flat sphere lit from the left, with a small offset highlight core
  function flatSphere(ctx, x, y, r, lit, shade, core, a) {
    ctx.globalAlpha = Math.min(1, Math.max(0, a));
    litShade(ctx, () => { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); }, x + r * 0.3, lit, shade);
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(x - r * 0.32, y - r * 0.30, r * 0.28, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1;
  }
  function rexLandHeight(wu, b) {
    const spanU = REX_EAST - REX_WEST;
    const u = (wu - REX_WEST) / spanU;
    if (u <= 0) return 0;
    const entry = smooth(clamp(u / 0.11, 0, 1));
    const drift = Math.min(u, 1.15) * b.drift;
    const r = Math.max(0, (Math.min(u, 1.08) - b.rampAt) / (1 - b.rampAt + 0.0001));
    const ramp = Math.pow(r, 2.15) * b.climb;
    const relief = ridge(wu * 2.8, b.seed + 7) * b.amp * 1.65
                 + ridge(wu * 7.6, b.seed) * b.amp
                 + ridge(wu * 18.5, b.seed + 21) * b.amp * 0.4;
    return Math.max(0, (b.base + drift + ramp + relief) * entry);
  }
  /* what the war tore into the east of the land. Driven by scar,
     which never goes back down, so nothing built on it ever moves. */
  function eastJag(wu, scar) {
    if (scar < 0.02 || wu <= MAIN_U - 0.06) return 0;
    const east = clamp((wu - MAIN_U) / MAIN_HALF, 0, 1);
    const cell = 0.038;
    const i = Math.floor(wu / cell);
    const f = wu / cell - i;
    const pk = hash1(i * 917 + 19);
    const peak = pk > 0.22 ? (pk - 0.12) : 0;
    const tent = Math.max(0, 1 - Math.abs(f - 0.48) / 0.46);
    const jag = Math.pow(tent, 1.35) * peak * 0.28;
    const n = ridge(wu * 22, 8801) * 0.07 + ridge(wu * 48, 8819) * 0.035;
    return (jag + Math.max(0, n - 0.015)) * Math.pow(east, 0.72) * scar;
  }
  /* three bands, like Rex: the ones behind sit higher and paler,
     which is what stops the join from reading as a cut-out */
  const MAIN_BANDS = [
    { base: 0.205, amp: 0.062, seed: 6101, cell: 4.4, shear: 1.9, out: 0.10,
      lit: "#232c35", shade: "#141b21" },
    { base: 0.172, amp: 0.052, seed: 6203, cell: 6.1, shear: 2.4, out: 0.05,
      lit: "#1c242b", shade: "#11171c" },
  ];

  function mainDome(wu) {
    const u = (wu - (MAIN_U - MAIN_HALF)) / (MAIN_HALF * 2);
    if (u <= 0 || u >= 1) return 0;
    const cap = Math.pow(Math.max(0, Math.sin(u * Math.PI)), 0.46);
    const lump = 0.78 + 0.22 * ridge(wu * 8.4, 2701) + 0.10 * (ridge(wu * 19, 2719) - 0.5);
    return Math.max(0, cap * lump);
  }
  function mainHeight(wu, scar) {
    const dome = mainDome(wu);
    if (dome <= 0) return 0;
    const n = (ridge(wu * 5.6, 4409) - 0.38) * 0.07
            + (ridge(wu * 13.2, 4417) - 0.5) * 0.036
            + (ridge(wu * 29, 4431) - 0.5) * 0.018;
    return Math.max(0, (0.138 + n) * dome + eastJag(wu, scar || 0));
  }
  function mainBandHeight(wu, b) {
    const dome = mainDome(wu);
    if (dome <= 0) return 0;
    const n = (ridge(wu * b.cell, b.seed) - 0.40) * b.amp
            + (ridge(wu * b.cell * 2.7, b.seed + 13) - 0.5) * b.amp * 0.45;
    return Math.max(0, (b.base + n) * dome);
  }
  function mainSurfY(wu, rise, scar) {
    return mix(H + 28, H * DECK - mainHeight(wu, scar) * H, rise);
  }

  let active = false, beat = 0, local = 0, thenMode = "void", thenCamX = null;
  let W = 0, H = 0, t = 0, shake = 0, flash = 0, clashCool = 0;
  let cam = 0, camTarget = 0;
  const trailY = [], trailR = [], trailM = [], trailA = [], trailH = [], rings = [];
  const trailG = [[], [], [], [], []];
  /* trails and shake jitter step 60 times a second, not once per frame,
     so a high-refresh screen doesn't shorten the trails or buzz the shake.
     A step this close to due still counts, or timestamp jitter would skip one at 60 Hz. */
  const TICK_STEP = 1 / 60;
  const TICK_SLACK = 0.002;
  let tickAcc = 0;
  let tick60 = false;              // set by step(): this frame is a 60 Hz step
  let shakeRX = 0, shakeRY = 0;    // shake direction, re-rolled each step
  const nameSeen = {};
  const NAME_DELAY = 1.5;
  const NAME_FADE = 0.8;

  const motes = [], oldones = [], souls = [], troops = [], brothers = [];
  const cityFar = [], cityMid = [], cityNear = [], spikes = [];
  (function seed() {
    const r = mulberry(4242);
    for (let i = 0; i < 280; i++)
      motes.push({ u: r(), y: r(), rr: 0.4 + r() * 1.4, ph: r() * 6.28, a: 0.06 + r() * 0.28 });
    for (let i = 0; i < 56; i++) {
      const ga = GREYS[Math.floor(r() * GREYS.length)];
      const gb = GREYS[Math.floor(r() * GREYS.length)];
      const gu = r();
      const sz = r();
      oldones.push({
        side: r() < 0.42 ? -1 : 1,
        ph: r() * 6.28,
        rr: 0.7 + r() * 1.5,
        hue: `${Math.round(ga[0] + (gb[0] - ga[0]) * gu)},${Math.round(ga[1] + (gb[1] - ga[1]) * gu)},${Math.round(ga[2] + (gb[2] - ga[2]) * gu)}`,
        a: 0.4 + r() * 0.5,
        gait: 0.72 + r() * 0.55,
        lane: (r() - 0.5) * 14,
        tall: sz < 0.12 ? 8 + r() * 7 : sz > 0.9 ? 44 + r() * 16 : 14 + r() * 26,
        ang: r() * 6.283,
        sp: 28 + r() * 90,
        limbs: 3 + Math.floor(r() * 4),
        holes: 1 + Math.floor(r() * 2),
        clingAng: r() * 6.283,
        spin: (r() - 0.5) * 0.55,
        kind: KINDS[Math.floor(r() * KINDS.length)],
      });
    }
    for (let i = 0; i < 90; i++)
      souls.push({ u: r(), v: r(), ph: r() * 6.28, rr: 0.5 + r() * 1.2, a: 0.2 + r() * 0.5 });
    function troop(kind, home0, home1, n) {
      for (let i = 0; i < n; i++) {
        troops.push({
          kind,
          ph: r() * 6.28,
          lane: (r() - 0.5) * 0.14,
          gait: 0.5 + r() * 1.0,
          s: 0.62 + r() * 0.55,
          born: Math.pow(r(), 0.72),
          home: home0 + r() * (home1 - home0),
          reach: 0.06 + r() * 0.16,
        });
      }
    }
    troop("vorgath",   0.10,  0.78, 74);
    troop("seraphin", -0.78, -0.10, 52);
    troop("malgrur",  -0.72, -0.08, 52);
    function seedBand(list, n, minH, maxH, minW, maxW, lit) {
      for (let i = 0; i < n; i++) {
        /* -1 is the west rim, +1 the east one. The west is settled
           first and the east last, because the east is the front */
        const u = -0.88 + r() * 1.76;
        const east = (u + 0.88) / 1.76;
        const tw = {
          u,
          w: minW + r() * (maxW - minW),
          h: minH + r() * (maxH - minH),
          /* west of the front it is a city all through the war;
             east of it nothing stands until the war ends */
          born: (east < 0.5 ? mix(0.02, 0.46, east / 0.5)
                            : mix(0.60, 0.94, (east - 0.5) / 0.5)) + r() * 0.04,
          ph: r() * 6.28,
          windows: [],
        };
        if (lit) {
          const cols = Math.max(1, Math.floor(tw.w / 11));
          const rows = Math.max(2, Math.floor(tw.h * 42));
          for (let cx = 0; cx < cols; cx++)
            for (let cy = 0; cy < rows; cy++)
              if (r() < 0.30)
                tw.windows.push({
                  dx: 4 + cx * 11, dy: 7 + cy * 14,
                  a: 0.28 + r() * 0.58, fl: r() * 6.28, warm: r() < 0.78,
                });
        }
        list.push(tw);
      }
    }
    seedBand(cityFar, 128, 0.26, 0.58, 12, 34, false);
    seedBand(cityMid,  86, 0.19, 0.46, 16, 40, false);
    seedBand(cityNear, 54, 0.15, 0.38, 20, 48, true);
    for (let i = 0; i < 42; i++) {
      const west = r();
      const teeth = [];
      for (let k = 0; k < 5 + Math.floor(r() * 4); k++) teeth.push(r());
      spikes.push({
        u: 0.08 + west * 0.82,
        w: 14 + r() * 38,
        h: 0.12 + r() * 0.32,
        born: mix(0.52, 0.02, west) + r() * 0.18,
        lean: (r() - 0.5) * 34,
        teeth,
        ph: r() * 6.28,
        shade: r(),
      });
    }
    for (let i = 0; i < 110; i++)
      brothers.push({ ang: r() * 6.283, rad: r(), sp: (r() < 0.5 ? -1 : 1) * (0.25 + r() * 0.9),
                      ph: r() * 6.28, size: 5 + r() * 12, born: Math.pow(r(), 0.8), hue: r() });
  })();

  function pending() {
    if (reduced && !FORCE) return false;
    return !(window.XP && XP.has("genesis"));
  }

  function idxOf(id) {
    for (let i = 0; i < BEATS.length; i++) if (BEATS[i].id === id) return i;
    return 0;
  }
  function since(id) {
    const i = idxOf(id);
    if (beat < i) return 0;
    if (beat > i) return 1;
    return smooth(local / Math.max(0.001, BEATS[i].dur));
  }
  function linear(id) {
    const i = idxOf(id);
    if (beat < i) return 0;
    if (beat > i) return 1;
    return clamp(local / Math.max(0.001, BEATS[i].dur), 0, 1);
  }
  function only(id) {
    const i = idxOf(id);
    if (beat !== i) return 0;
    return smooth(local / Math.max(0.001, BEATS[i].dur));
  }

  function sx(u) { return (u - cam) * W + W * 0.5; }

  function beatDur(id) {
    const b = BEATS[idxOf(id)];
    return (b && b.dur) || 1;
  }

  /* ---- the two chases ---------------------------------------
     Both are written as ONE path, with the followers placed at an
     offset from the runner — never as three separate paths that
     happen to be timed to agree. That is the whole fix: an offset
     cannot overtake the thing it is measured from, so no retiming
     can put a chaser in front again.

     ease/easeV are a position curve and its exact derivative. The
     camera uses the derivative to lead its own smoothing by exactly
     the distance that smoothing lags, which is what keeps the pair
     in the middle of the frame instead of sliding to an edge. */
  const ease  = (p, k) => mix(p, smooth(p), k == null ? 1 : k);
  const easeV = (p, k) => mix(1, 6 * p * (1 - p), k == null ? 1 : k);

  /* Obrokxus west (in front), Ormius then Ava behind him, closing. */
  function chaseAt(p) {
    const e = ease(p, 0.72);
    const k = smooth(p);
    const ou = mix(FLEE_START_U, EAST_U, e);
    return {
      ou,
      mu: ou + mix(0.46, 0.17, k),
      au: ou + mix(0.62, 0.30, k),
      cam: ou + mix(0.28, 0.16, k),
    };
  }
  function chaseCamLead(p) {
    return (EAST_U - FLEE_START_U) * easeV(p, 0.72)
         / beatDur("flee") / FLEE_CAM_RATE;
  }

  /* the chase is a fight on the move: the two lights keep catching
     him and striking, and he keeps breaking away west. Sines only, so
     nothing snaps; `w` is 0 at both ends of the beat, so it opens from
     the plain chase and hands the war the plain chase back. */
  function chaseFightAt(p) {
    const span = Math.min(W, H);
    const w = smooth(clamp((p - 0.04) / 0.16, 0, 1))
            * (1 - smooth(clamp((p - 0.84) / 0.16, 0, 1)));
    const ph = p * 16;
    const strikeM = Math.pow(Math.max(0, Math.sin(ph * 1.5)), 6);
    const strikeA = Math.pow(Math.max(0, Math.sin(ph * 1.5 + 2.2)), 6);
    return {
      w, strikeM, strikeA,
      ouOff: Math.sin(ph * 0.8) * 0.030,
      oyAbs: H * 0.34 + Math.sin(ph * 0.55 + 0.4) * span * 0.06,
      mGap: mix(0.12 + Math.sin(ph * 0.6) * 0.03, 0.006, strikeM),
      myOff: Math.sin(ph * 0.9 + 0.5) * span * 0.08 * (1 - strikeM * 0.85),
      aGap: mix(0.20 + Math.sin(ph * 0.7 + 1.0) * 0.04, 0.010, strikeA),
      ayOff: Math.sin(ph * 1.1 + 2.0) * span * 0.10 * (1 - strikeA * 0.85),
    };
  }

  /* The duel that has not ended. Sines, not a key table: nothing to
     snap between. `half` never reaches zero, so the two of them
     never trade places — Obrokxus is cu - half (west, still running)
     and Ormius is cu + half (east, still behind him). */
  function duelDrift(p) { return mix(ET_START_U, ET_END_U, ease(p, 0.55)); }
  function duelCamLead(p, rate) {
    return (ET_END_U - ET_START_U) * easeV(p, 0.55)
         / beatDur("eternity") / rate;
  }
  function duelAt(p) {
    const span = Math.min(W, H);
    const ph = p * 12.0;
    const cu = duelDrift(p) + Math.sin(ph * 0.41) * 0.030;
    const cy = H * 0.36 + Math.sin(ph * 0.29) * span * 0.060;
    const strike = Math.pow(Math.max(0, Math.sin(ph * 1.6)), 5);
    const half = mix(0.13 + Math.sin(ph * 0.53) * 0.05, 0.008, strike);
    const swing = Math.sin(ph * 0.8 + 0.6) * span * 0.09 * (1 - strike * 0.85);
    return { ou: cu - half, oy: cy - swing, mu: cu + half, my: cy + swing, strike };
  }

  /* one of the five warlocks circling Obrokxus in the air, diving in
     to strike on its own rhythm. i picks the slot and the rhythm;
     calm (0..1) scales the dives down, for Mordrial as he dies. */
  function ringFightAt(i, p, cu, cy, calm) {
    const span = Math.min(W, H);
    const dir = i % 2 ? -1 : 1;
    const ang = p * 7.0 * dir + i * 1.2566;
    const strike = Math.pow(Math.max(0, Math.sin(p * 22 + i * 1.9)), 4)
                 * (calm == null ? 1 : calm);
    const rU = mix(0.15, 0.012, strike);
    const rY = mix(span * 0.19, span * 0.014, strike);
    return { u: cu + Math.cos(ang) * rU, y: cy + Math.sin(ang) * rY * 0.8, strike };
  }

  function paintCopy() {
    const b = BEATS[beat];
    if (!b || !copyEl) return;
    if (overlay) overlay.dataset.beat = b.id || "";
    if (!b.line) {
      copyEl.classList.remove("on");
      copyEl.classList.add("out");
      if (tagEl) tagEl.textContent = "";
      return;
    }
    copyEl.classList.remove("on", "out");
    if (tagEl) tagEl.textContent = b.tag;
    if (lineEl) lineEl.textContent = b.line;
    requestAnimationFrame(() => copyEl.classList.add("on"));
  }

  function paintTicks() {
    if (!trackEl) return;
    let bar = trackEl.querySelector(".genesis-prog");
    if (!bar) {
      trackEl.innerHTML = '<span class="genesis-prog"><i></i></span>';
      bar = trackEl.querySelector(".genesis-prog");
    }
    const fill = bar && bar.querySelector("i");
    const n = Math.max(1, BEATS.length - 1);
    const dur = Math.max(0.001, (BEATS[beat] && BEATS[beat].dur) || 1);
    const u = clamp((beat + clamp(local / dur, 0, 1)) / n, 0, 1);
    if (fill) fill.style.width = (u * 100).toFixed(2) + "%";
  }

  function go(i) {
    beat = clamp(i, 0, BEATS.length - 1);
    local = 0;
    if (BEATS[beat] && BEATS[beat].id === "flee") {
      trailY.length = 0;
      trailR.length = 0;
    }
    if (BEATS[beat] && BEATS[beat].id === "eternity") {
      trailR.length = 0;
      trailM.length = 0;
      trailA.length = 0;
      trailH.length = 0;
    }
    if (BEATS[beat] && BEATS[beat].id === "gods") {
      for (const tg of trailG) tg.length = 0;
    }
    paintCopy();
    paintTicks();
  }

  function remember() {
    if (window.XP && XP.flag) XP.flag("genesis");
  }

  function veilCanvas() {
    const cv = document.getElementById("bridge-canvas");
    if (!cv) return;
    const c = cv.getContext("2d");
    if (!c) return;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = "#0d1114";
    c.fillRect(0, 0, cv.width, cv.height);
    c.restore();
  }

  function resetFX() {
    trailY.length = 0;
    trailR.length = 0;
    trailM.length = 0;
    trailA.length = 0;
    trailH.length = 0;
    for (const tg of trailG) tg.length = 0;
    rings.length = 0;
    flash = 0;
    clashCool = 0;
    tickAcc = 0;
    tick60 = false;
    shakeRX = 0;
    shakeRY = 0;
    for (const k in nameSeen) delete nameSeen[k];
  }

  function finish() {
    if (!active) return;
    active = false;
    removeEventListener("wheel", holdPage, { passive: false });
    removeEventListener("touchmove", holdPage, { passive: false });
    remember();
    if (overlay) {
      // a focused Skip/Next button would keep focus inside a subtree we're
      // about to aria-hide; let it go first (it drops to the page, as before)
      if (overlay.contains(document.activeElement)) document.activeElement.blur();
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");
    }
    if (tagEl) tagEl.textContent = "";
    if (lineEl) lineEl.textContent = "";
    document.documentElement.classList.remove("genesis-on");
    if (host) host.classList.remove("is-cinematic");
    document.dispatchEvent(new CustomEvent("site:genesis-done", {
      detail: { mode: thenMode, camX: thenCamX },
    }));
  }

  function play(opts) {
    if (active) return;
    if (reduced && !FORCE) return;
    thenMode = (opts && opts.thenMode) || "void";
    thenCamX = opts && opts.thenCamX;
    if (thenCamX == null && window.World && thenMode === "void")
      thenCamX = World.LAND.bridge;
    active = true;
    remember();     // counted from the start: leaving mid-way doesn't replay it
    addEventListener("wheel", holdPage, { passive: false });
    addEventListener("touchmove", holdPage, { passive: false });
    beat = 0;
    local = 0;
    shake = 0;
    t = 0;
    cam = 0;
    camTarget = 0;
    resetFX();
    veilCanvas();
    if (overlay) {
      overlay.hidden = false;
      overlay.setAttribute("aria-hidden", "false");
    }
    document.documentElement.classList.add("genesis-on");
    if (host) host.classList.add("is-cinematic");
    try { scrollTo({ top: 0, behavior: "instant" }); } catch (e) {}
    const jump = JUMP;
    if (jump) {
      const i = idxOf(jump[1]);
      if (i > 0) {
        go(i);
        if (i >= idxOf("war")) { cam = MAIN_U; camTarget = MAIN_U; }
        else if (i >= idxOf("flee")) { cam = ROOT_U - 0.30; camTarget = cam; }
        else if (i >= idxOf("land")) { cam = ROOT_U - 0.30; camTarget = cam; }
      }
    }
    paintCopy();
    paintTicks();
    document.dispatchEvent(new CustomEvent("site:genesis-start"));
  }

  function skip() {
    if (!active) return;
    const last = idxOf("now");
    if (beat >= last && local > 0.12) { finish(); return; }
    go(last);
  }

  function seek(i, frac) {
    if (!active) return;
    i = clamp(i, 0, BEATS.length - 1);
    frac = clamp(frac, 0, 1);
    if (i === BEATS.length - 1) frac = 0;
    if (i !== beat) go(i);
    const dur = BEATS[i].dur;
    local = frac >= 1 ? dur - 0.001 : frac * dur;
    resetFX();
    shake = 0;
    const aim = camAim();
    camTarget = aim.target;
    cam = aim.target;
    paintTicks();
  }

  function stepBeat(dir) {
    if (!active) return;
    if (dir > 0) {
      if (beat >= BEATS.length - 1) { finish(); return; }
      seek(beat + 1, 0);
    } else {
      seek(local > 1.5 ? beat : beat - 1, 0);
    }
  }

  function seekFromPointer(e) {
    if (!trackEl) return;
    const r = trackEl.getBoundingClientRect();
    const u = clamp((e.clientX - r.left) / Math.max(1, r.width), 0, 1);
    const pos = u * (BEATS.length - 1);
    const i = Math.floor(pos);
    seek(i, pos - i);
  }

  function camAim() {
    let target = 0;
    const uWalk  = since("walk");
    const uRoot  = since("root");
    const uFlee  = since("flee");
    const uWar   = since("war");
    const uStall = since("stalemate");
    const uLock  = since("firstlock");
    const uFour  = since("four");
    const uFifth = since("fifth");
    const uFall  = since("fall");
    const uRet   = since("return");
    const uEt    = since("eternity");
    let camRateOverride = null;
    if (uEt > 0) {
      /* ride the duel itself instead of a canned sweep, and lead it
         by exactly the smoothing lag, so the pair stays centred all
         the way out rather than trailing a third of a screen */
      const etP = linear("eternity");
      camRateOverride = mix(1.20, ET_CAM_RATE, smooth(clamp(etP / 0.22, 0, 1)));
      target = duelDrift(etP) + duelCamLead(etP, camRateOverride);
    }
    else if (uRet > 0.02)
      target = mix(MAIN_U - 0.04, CITY_U - 0.06, smooth(uRet));
    else if (uFall > 0.02) {
      /* hold on the air fight over the duel ground, then ease back to
         where the return beat starts */
      const onFight = mix(NEST_U + 0.04, MAIN_U + 0.28, smooth(clamp(uFall / 0.25, 0, 1)));
      target = mix(onFight, MAIN_U - 0.04, smooth(clamp((uFall - 0.80) / 0.20, 0, 1)));
    }
    else if (uFifth > 0.02)
      target = mix(MAIN_U + 0.16, NEST_U + 0.04, smooth(uFifth));
    else if (uFour > 0.02)
      target = mix(MAIN_U + 0.02, MAIN_U + 0.20, smooth(uFour));
    else if (uLock > 0.02)
      target = mix(MAIN_U - 0.10, MAIN_U + 0.04, smooth(uLock));
    else if (uStall > 0.02)
      target = mix(MAIN_U + 0.08, MAIN_U - 0.08, smooth(uStall));
    else if (uWar > 0.02)
      /* starts exactly where the chase left the camera, so the pull
         back onto the battlefield is a move and not a cut */
      target = mix(EAST_U + 0.16, MAIN_U + 0.10, smooth(uWar));
    else if (uFlee > 0) {
      /* framed on the three of them, not on a fixed sweep — the fixed
         sweep is what pushed the two chasers off the left edge */
      const fP = linear("flee");
      target = chaseAt(fP).cam + chaseCamLead(fP);
    }
    else if (uWalk < 0.001) target = 0;
    else if (uRoot > 0.02)
      /* root through rex the surface hold still with half the womb
         past the right edge; panning further east shows its ragged side.
         during the surface beat it eases onto where the chase camera
         starts, so the flee beat opens on a move and not a jerk */
      target = mix(ROOT_U - 0.50, chaseAt(0).cam + chaseCamLead(0), since("land"));
    else
      target = mix(0, ROOT_U - 0.50, clamp(uWalk, 0, 1));
    let camRate = 1.55;
    if (uWalk > 0.001 && uRoot < 0.02) camRate = 2.25;
    if (uFlee > 0 && uWar < 0.02) camRate = FLEE_CAM_RATE;
    if (camRateOverride != null) camRate = camRateOverride;
    return { target, rate: camRate };
  }

  function step(dt) {
    if (!active) return false;
    t += dt;
    local += dt;
    tickAcc += dt;
    tick60 = tickAcc >= TICK_STEP - TICK_SLACK;
    if (tick60) {
      tickAcc = Math.min(tickAcc - TICK_STEP, TICK_STEP);
      shakeRX = Math.random() - 0.5;
      shakeRY = Math.random() - 0.5;
    }
    shake = Math.max(0, shake - dt * 3.6);
    flash = Math.max(0, flash - dt * 3.2);
    clashCool = Math.max(0, clashCool - dt);
    for (let i = rings.length - 1; i >= 0; i--) {
      rings[i].r += dt * 220;
      rings[i].a -= dt * 1.35;
      if (rings[i].a <= 0) rings.splice(i, 1);
    }

    const aim = camAim();
    camTarget = aim.target;
    cam = approach(cam, camTarget, aim.rate, dt);
    paintTicks();

    const b = BEATS[beat];
    if (b && local >= b.dur) {
      if (beat >= BEATS.length - 1) { finish(); return false; }
      go(beat + 1);
    }
    return true;
  }

  /* ---- drawing ------------------------------------------- */

  function fillBg(ctx) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#0d1114";
    ctx.fillRect(0, 0, W, H);
  }

  function drawMotes(ctx, amt, streak) {
    if (amt < 0.02) return;
    const span = W * 2.2;
    const off = t * 12 + cam * W * 0.35;
    ctx.fillStyle = "#c6ccc6";
    ctx.strokeStyle = "#c6ccc6";
    for (const m of motes) {
      const x = ((m.u * span - off * (0.3 + m.rr * 0.2)) % span + span) % span - span * 0.15;
      if (x < -40 || x > W + 40) continue;
      const y = m.y * H + Math.sin(t * 0.5 + m.ph) * 14;
      ctx.globalAlpha = m.a * amt * (0.55 + 0.45 * Math.sin(t * 1.6 + m.ph));
      if (streak > 3) {
        ctx.lineWidth = m.rr;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.lineTo(x - streak * (0.4 + m.rr * 0.35), y); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(x, y, m.rr, 0, 6.283); ctx.fill();
      }
    }
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  function drawChaos(ctx, amt) {
    if (amt < 0.02) return;
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const baseY = H * (0.10 + i * 0.155);
      const amp = (40 + i * 22) * amt;
      ctx.beginPath();
      for (let px = -60; px <= W + 60; px += 24) {
        const u = px * 0.0018 + cam * 2.4;
        const y = baseY
          + Math.sin(u + t * 0.18 + i * 1.3) * amp
          + Math.sin(u * 2.9 - t * 0.11 + i) * amp * 0.45;
        px === -60 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
      }
      const a = amt * (0.05 + 0.05 * Math.sin(t * 0.23 + i));
      ctx.strokeStyle = i % 2 ? `rgba(96,66,74,${a})` : `rgba(58,84,92,${a})`;
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  }

  function drawPoint(ctx, amt, crack) {
    if (amt < 0.01 && crack < 0.02) return;
    const cx = sx(0), cy = H * 0.46;
    const pulse = 0.85 + 0.15 * Math.sin(t * 1.7);
    const glow = (10 + amt * 36) * pulse;
    flatGlow(ctx, cx, cy, glow, "245,208,107", 0.55 + 0.25 * amt);

    const n = 7;
    for (let i = 0; i < n; i++) {
      const ang = t * 0.4 + i * (6.283 / n);
      const j = 1.2 + Math.sin(t * 2.1 + i) * 0.8;
      ctx.fillStyle = i % 2
        ? `rgba(176,104,90,${0.35 * amt})`
        : `rgba(143,176,184,${0.3 * amt})`;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * j, cy + Math.sin(ang) * j, 1.4, 0, 6.283);
      ctx.fill();
    }
    ctx.fillStyle = `rgba(245,208,107,${0.95 * amt})`;
    ctx.beginPath(); ctx.arc(cx, cy, 1.8 + amt * 0.8, 0, 6.283); ctx.fill();

    if (crack > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(245,208,107,${0.78 * crack})`;
      ctx.lineWidth = 1.15;
      ctx.lineCap = "round";
      for (let i = 0; i < n; i++) {
        const ang = i * (6.283 / n) + t * 0.05;
        const len = (16 + (i % 3) * 16) * crack;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawBridgeLine(ctx, grow) {
    if (grow < 0.02) return;
    const deckY = H * DECK;
    const inf = beat >= idxOf("flee");
    const startU = inf ? cam - 2.65 : SPAN_START_U;
    const endU = inf ? cam + 2.45 : mix(-0.48, ROOT_U + 0.22, grow);
    const x0 = sx(startU);
    const x1 = sx(endU);
    if (x1 < -40 || x0 > W + 40) return;

    const bayPx = Math.max(24, BAY_U * W);
    const legW  = Math.min(3, Math.max(1.2, bayPx * 0.007));
    const deckH = Math.min(6, Math.max(2.5, bayPx * 0.013));
    const rise  = bayPx * 0.20;
    const legBot = H * 1.22;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x0 - 2, 0, Math.max(2, x1 - x0) + 4, H);
    ctx.clip();

    const first = Math.floor(startU / BAY_U) - 1;
    const last  = Math.ceil(endU / BAY_U) + 1;

    ctx.fillStyle = `rgba(112,130,140,${0.55 * grow})`;
    ctx.beginPath();
    for (let b = first; b <= last; b++) {
      const x = sx(b * BAY_U);
      if (x < x0 - 8 || x > x1 + 8) continue;
      ctx.rect(x - legW / 2, deckY + deckH, legW, legBot - deckY - deckH);
    }
    ctx.fill();
    const archT = Math.max(1, legW * 0.55);
    for (let b = first; b <= last; b++) {
      const xa = sx(b * BAY_U);
      if (xa < x0 - bayPx || xa > x1 + 8) continue;
      const cx = xa + bayPx / 2, cy = deckY + deckH + rise, rx = bayPx / 2 - legW;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, rise, 0, Math.PI, 0);
      ctx.ellipse(cx, cy, Math.max(0.5, rx - archT), Math.max(0.5, rise - archT), 0, 0, Math.PI, true);
      ctx.closePath();
      ctx.fillStyle = `rgba(112,130,140,${0.30 * grow})`;
      ctx.fill();
    }
    for (let b = first; b <= last; b++) {
      const x = sx(b * BAY_U);
      if (x < x0 - 8 || x > x1 + 8) continue;
      const r = hash1(b * 911 + 7);
      ctx.fillStyle = `rgba(120,138,147,${0.4 * grow})`;
      ctx.fillRect(x - legW * 0.4, deckY - deckH * 1.9, legW * 0.8, deckH * 1.9);
      if (r < 0.13) {
        const mh = deckH * (4.5 + r * 22);
        ctx.fillStyle = `rgba(120,138,147,${0.34 * grow})`;
        ctx.fillRect(x - legW * 0.3, deckY - mh, legW * 0.6, mh);
        ctx.fillStyle = `rgba(245,208,107,${0.75 * grow})`;
        ctx.fillRect(x - legW * 0.55, deckY - mh - legW * 0.7, legW * 1.1, legW * 1.1);
      }
    }
    ctx.fillStyle = `rgba(36,45,51,${0.92 * grow})`;
    ctx.fillRect(x0, deckY, x1 - x0, deckH);
    ctx.fillStyle = `rgba(245,208,107,${0.62 * grow})`;
    for (let b = first; b <= last; b++) {
      const x = sx(b * BAY_U);
      if (x < x0 - 4 || x > x1 + 4) continue;
      const xEnd = Math.min(x + bayPx + 1, x1);
      if (xEnd <= x) continue;
      ctx.fillRect(x, deckY - 1.6, xEnd - x, 2.4);
    }
    ctx.restore();
  }

  function fleshGeom(womb) {
    const vis = clamp(since("root") + 0.35, 0.35, 1);
    const cx = sx(ROOT_U), cy = H * 0.5;
    const rx = Math.min(W, H) * (0.26 + 0.14 * vis) * mix(1, 0.86, womb);
    const ry = Math.min(W, H) * (0.34 + 0.16 * vis) * mix(1, 0.94, womb);
    return { cx, cy, rx, ry };
  }

  function walkerPos(o, burst, walk, cling, still, watch, flesh) {
    const cy = H * 0.46;
    const deckY = H * DECK;
    const r = (0.06 + o.sp / 360) * burst;
    const xBurst = Math.cos(o.ang) * r * 0.45;
    const yBurst = cy + Math.sin(o.ang) * r * H * 0.16;
    const settle = smooth(clamp((burst - 0.18) / 0.42, 0, 1));
    const splitU = o.side * (0.05 + o.gait * 0.14) * settle;
    const along = o.side < 0
      ? splitU - o.gait * walk * 2.2
      : mix(splitU, ROOT_U - 0.06 + o.lane * 0.002, clamp(walk * (0.88 + o.gait * 0.18), 0, 1));
    const yDeck = deckY - 8 + o.lane + Math.sin(t * (2.1 + o.gait) + o.ph) * 2.4 * settle;
    const deckX = sx(mix(xBurst, along, settle));
    const deckYPos = mix(yBurst, yDeck, settle);

    let x = deckX, y = deckYPos;
    if (o.side > 0 && flesh && cling > 0.02) {
      const ang = o.clingAng + t * o.spin * (1 - still * 0.85);
      const bite = mix(1.08, 0.86, cling * (1 - still));
      const back = mix(1, 1.16, still);
      const watchR = mix(1, 1.22, watch);
      const rr = bite * back * watchR;
      const fx = flesh.cx + Math.cos(ang) * flesh.rx * rr;
      const fy = flesh.cy + Math.sin(ang) * flesh.ry * rr;
      const u = smooth(clamp((cling - 0.05) / 0.55, 0, 1));
      x = mix(deckX, fx, u);
      y = mix(deckYPos, fy, u);
    }

    let a = o.a * clamp(burst * 4.2, 0, 1);
    if (x < 12) a *= clamp(x / 12, 0, 1);
    a *= 1 - since("land") * 0.92;
    if (watch > 0.4) a *= mix(1, 0.55, watch);
    return { x, y, a, onDeck: settle > 0.55 && cling < 0.25 };
  }

  function drawAlien(ctx, o, x, y, a) {
    if (a < 0.03) return;
    const s = o.tall * 0.42;
    const wob = t * (0.7 + o.gait * 0.35) + o.ph;
    ctx.save();
    ctx.globalAlpha = a;

    flatGlow(ctx, x, y, s * 1.8, o.hue, 0.5);

    ctx.fillStyle = `rgba(${o.hue},0.92)`;
    ctx.strokeStyle = `rgba(${o.hue},0.72)`;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const kind = o.kind || "blob";
    if (kind === "spindle") {
      ctx.beginPath();
      ctx.ellipse(x, y, s * 0.28, s * 1.15, Math.sin(wob) * 0.12, 0, 6.283);
      ctx.fill();
      ctx.lineWidth = 1.05;
      const arms = 2 + (o.limbs % 3);
      for (let k = 0; k < arms; k++) {
        const ang = -0.55 + k * (1.1 / Math.max(1, arms - 1)) + Math.sin(wob + k) * 0.2;
        const len = s * (0.7 + 0.25 * Math.sin(wob * 1.2 + k));
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + Math.sin(ang) * len * 0.4, y + len * 0.35, x + Math.sin(ang) * len, y + len * 0.85);
        ctx.stroke();
      }
    } else if (kind === "cluster") {
      const n = 3 + o.holes + (o.limbs % 3);
      for (let i = 0; i < n; i++) {
        const ang = o.ang + i * (6.283 / n) + Math.sin(wob + i) * 0.18;
        const rad = s * (0.22 + (i % 3) * 0.12);
        const cx = x + Math.cos(ang) * s * 0.42;
        const cy = y + Math.sin(ang) * s * 0.34;
        ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 6.283); ctx.fill();
      }
    } else if (kind === "crawler") {
      ctx.beginPath();
      ctx.ellipse(x, y - s * 0.12, s * 0.72, s * 0.38, Math.sin(wob) * 0.08, 0, 6.283);
      ctx.fill();
      ctx.lineWidth = 1.2;
      const legs = 5 + (o.limbs % 4);
      for (let k = 0; k < legs; k++) {
        const side = k < legs / 2 ? -1 : 1;
        const u = (k % Math.ceil(legs / 2)) / Math.max(1, Math.ceil(legs / 2) - 1);
        const bx = x + side * mix(s * 0.15, s * 0.55, u);
        const gait = Math.sin(wob * 1.6 + k * 0.9) * s * 0.18;
        ctx.beginPath();
        ctx.moveTo(bx, y);
        ctx.lineTo(bx + side * s * 0.22 + gait, y + s * 0.55);
        ctx.lineTo(bx + side * s * 0.08 + gait * 0.4, y + s * 0.95);
        ctx.stroke();
      }
    } else if (kind === "shard") {
      ctx.beginPath();
      const n = 5 + (o.limbs % 3);
      for (let i = 0; i <= n; i++) {
        const ang = o.ang + (i / n) * 6.283;
        const rad = s * (i % 2 ? 0.95 : 0.38) * (1 + 0.08 * Math.sin(wob + i));
        const px = x + Math.cos(ang) * rad;
        const py = y + Math.sin(ang) * rad * 0.9;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else if (kind === "ring") {
      ctx.lineWidth = Math.max(1.4, s * 0.16);
      ctx.beginPath();
      ctx.ellipse(x, y, s * 0.78, s * 0.52, o.ang * 0.2 + Math.sin(wob) * 0.15, 0, 6.283);
      ctx.stroke();
      ctx.lineWidth = Math.max(0.8, s * 0.08);
      ctx.beginPath();
      ctx.ellipse(x, y, s * 0.42, s * 0.28, -o.ang * 0.15, 0, 6.283);
      ctx.stroke();
      ctx.fillStyle = `rgba(${o.hue},0.85)`;
      ctx.beginPath(); ctx.arc(x + Math.cos(wob) * s * 0.38, y + Math.sin(wob) * s * 0.22, 1.6, 0, 6.283); ctx.fill();
    } else {
      ctx.beginPath();
      const n = 9 + o.limbs;
      for (let i = 0; i <= n; i++) {
        const ang = (i / n) * 6.283 + o.ang * 0.35;
        const rad = s * (0.52
          + 0.28 * Math.sin(ang * 3 + wob)
          + 0.18 * Math.sin(ang * 5 - wob * 1.2)
          + ((i * 13 + Math.floor(o.sp)) % 4 === 0 ? 0.28 * Math.sin(wob * 1.4) : 0));
        const px = x + Math.cos(ang) * rad;
        const py = y + Math.sin(ang) * rad * 0.82;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(13,17,20,0.82)";
      for (let h = 0; h < o.holes; h++) {
        const ha = o.ph + h * 2.15 + Math.sin(wob + h) * 0.45;
        ctx.beginPath();
        ctx.arc(
          x + Math.cos(ha) * s * 0.22,
          y + Math.sin(ha) * s * 0.18,
          s * (0.11 + h * 0.05),
          0, 6.283
        );
        ctx.fill();
      }

      ctx.strokeStyle = `rgba(${o.hue},0.72)`;
      ctx.lineWidth = 1.15;
      for (let k = 0; k < o.limbs; k++) {
        const ang = o.ang + k * (6.283 / o.limbs) + Math.sin(wob + k) * 0.55;
        const len = s * (0.85 + 0.55 * Math.sin(wob * 1.35 + k));
        const mx = x + Math.cos(ang) * len * 0.5;
        const my = y + Math.sin(ang) * len * 0.5;
        const twist = 0.45 * Math.sin(wob + k * 1.7);
        const ex = x + Math.cos(ang + twist) * len;
        const ey = y + Math.sin(ang + twist) * len;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(mx, my, ex, ey);
        ctx.stroke();
        ctx.fillStyle = `rgba(${o.hue},0.85)`;
        ctx.beginPath(); ctx.arc(ex, ey, 1.35, 0, 6.283); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawOldOnes(ctx, burst, walk, cling, still, watch, flesh) {
    if (burst < 0.01 && walk < 0.02) return;
    for (const o of oldones) {
      const p = walkerPos(o, burst, walk, cling, still, watch, flesh);
      if (p.a < 0.03) continue;
      if (p.x < -40 || p.x > W + 40) continue;
      drawAlien(ctx, o, p.x, p.y, p.a);
    }
  }

  function drawStains(ctx, flesh, amt) {
    if (!flesh || amt < 0.04) return;
    for (const o of oldones) {
      if (o.side < 0) continue;
      const ang = o.clingAng + t * o.spin * 0.4;
      const x = flesh.cx + Math.cos(ang) * flesh.rx * 0.72;
      const y = flesh.cy + Math.sin(ang) * flesh.ry * 0.72;
      ctx.fillStyle = `rgba(${o.hue},${0.2 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, 14 + o.rr * 6, 0, 6.283); ctx.fill();
    }
  }

  function fleshPath(ctx, cx, cy, rx, ry, pain, seed) {
    ctx.beginPath();
    const n = 80;
    for (let i = 0; i <= n; i++) {
      const u = i / n, ang = u * 6.283;
      const wob = 1
        + Math.sin(ang * 3 + t * 0.5 + seed) * 0.08 * pain
        + Math.sin(ang * 7 - t * 0.35) * 0.05 * pain
        + Math.sin(ang * 2 + t * 0.22) * 0.05
        + Math.sin(ang * 11 + t * 1.1) * 0.03 * pain;
      const x = cx + Math.cos(ang) * rx * wob;
      const y = cy + Math.sin(ang) * ry * wob;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  function drawFlesh(ctx, vis, pain, womb) {
    if (vis < 0.02) return null;
    const { cx, cy, rx, ry } = fleshGeom(womb);

    if (womb > 0.08) {
      flatGlow(ctx, cx, cy, rx * 1.15, "245,208,107", womb * vis);
    }

    const lit = womb > 0.4 ? "#6a2418" : "#5c1114";
    ctx.globalAlpha = vis;
    offsetShade(ctx, () => fleshPath(ctx, cx, cy, rx, ry, pain, 1), -rx * 0.28, -ry * 0.10, lit, "#2e080c");
    ctx.globalAlpha = 1;
    return { cx, cy, rx, ry };
  }

  function drawSouls(ctx, flesh, amt) {
    if (!flesh || amt < 0.02) return;
    const { cx, cy, rx, ry } = flesh;
    for (const s of souls) {
      const x = cx + (s.u - 0.5) * rx * 1.05;
      const y = cy + (s.v - 0.5) * ry * 1.05 + Math.sin(t * 0.8 + s.ph) * 4;
      ctx.fillStyle = `rgba(245,208,107,${s.a * amt})`;
      ctx.beginPath(); ctx.arc(x, y, s.rr * mix(1, 1.35, since("womb")), 0, 6.283); ctx.fill();
    }
  }

  function drawRip(ctx, flesh, amt) {
    if (!flesh || amt < 0.02) return;
    const { cx, cy, rx, ry } = flesh;
    const x0 = cx - rx * 0.92;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(255,230,190,${0.85 * amt})`;
    ctx.lineWidth = 1.4 + amt * 2.2;
    ctx.beginPath();
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const x = x0 + Math.sin(u * 18 + t * 9) * (2 + amt * 5) + u * rx * 0.08;
      const y = cy - ry * 0.72 + u * ry * 1.44;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function keyAt(keys, u) {
    if (u <= keys[0].t) return { x: keys[0].x, y: keys[0].y };
    for (let i = 1; i < keys.length; i++) {
      if (u <= keys[i].t) {
        const a = keys[i - 1], b = keys[i];
        const span = Math.max(0.0001, b.t - a.t);
        const k = (u - a.t) / span;
        const s = span < 0.055 ? Math.pow(k, 0.38) : smooth(k);
        return { x: mix(a.x, b.x, s), y: mix(a.y, b.y, s) };
      }
    }
    const last = keys[keys.length - 1];
    return { x: last.x, y: last.y };
  }

  function lightsAt(uBirth, uFight, uLand, flesh) {
    const exitX = flesh ? flesh.cx - flesh.rx * 0.92 : sx(ROOT_U) - Math.min(W, H) * 0.28;
    const exitY = flesh ? flesh.cy + flesh.ry * 0.04 : H * 0.5;
    const west = flesh ? flesh.cx - flesh.rx - 22 : exitX;
    const arenaX = west - Math.min(W, H) * 0.16;
    const arenaY = H * 0.40;
    const span = Math.min(W, H);
    const emerge = clamp(uBirth * 1.35, 0, 1);
    const yK = keyAt(YELLOW_KEYS, uFight);
    const rK = keyAt(RED_KEYS, uFight);
    let yx = mix(exitX, arenaX + yK.x * span * 0.28, emerge);
    let yy = mix(exitY, arenaY + yK.y * span * 0.30, emerge);
    let rx = mix(exitX, arenaX + rK.x * span * 0.28, emerge);
    let ry = mix(exitY, arenaY + rK.y * span * 0.30, emerge);
    yx = Math.min(yx, west);
    rx = Math.min(rx, west);

    /* Rex's last act: he closes his whole body around Obrokxus, and
       the two of them go down together into what becomes the ground */
    const wrap = smooth(clamp((uFight - 0.80) / 0.10, 0, 1));
    const landLin = linear("land");
    const dropP = clamp((uFight - 0.88) / 0.12, 0, 1) * 0.35 + clamp(landLin / 0.45, 0, 1) * 0.65;
    const bx = sx(BURY_U);
    const by = rexSurfY(BURY_U) + H * 0.10;
    rx = mix(rx, bx, smooth(dropP));
    ry = mix(ry, by, dropP * dropP);
    yx = mix(yx, rx, wrap);
    yy = mix(yy, ry, wrap);
    const bury = smooth(clamp((landLin - 0.30) / 0.30, 0, 1));

    return {
      yx, yy, rx, ry,
      yAmt: emerge * (1 - wrap * 0.35) * (1 - bury),
      rAmt: emerge * (1 - bury * 0.6),
      originX: rx,
      originY: ry,
      die: dropP, wrap, bury, recede: 0,
    };
  }

  function pushTrail(list, x, y) {
    if (!tick60) return;
    list.push({ x, y });
    if (list.length > 16) list.shift();
  }

  function drawTrail(ctx, list, rgb, amt, dark) {
    if (amt < 0.02 || list.length < 2) return;
    ctx.save();
    if (!dark) ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (let i = 1; i < list.length; i++) {
      const u = i / list.length;
      ctx.strokeStyle = `rgba(${rgb},${(dark ? 0.42 : 0.55) * u * amt})`;
      ctx.lineWidth = mix(1.2, dark ? 5.5 : 7, u);
      ctx.beginPath();
      ctx.moveTo(list[i - 1].x, list[i - 1].y);
      ctx.lineTo(list[i].x, list[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawOrb(ctx, x, y, amt, kind, scale) {
    if (amt < 0.02) return;
    const s = scale == null ? 1 : scale;
    const big = kind === "obrokxus" || kind === "hound";
    const R = Math.min(W, H) * (kind === "hound" ? 0.055 : big ? 0.072 : 0.048) * s * (0.7 + amt * 0.5);
    ctx.save();
    if (kind === "rex") {
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.rex.glow, amt);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.rex.lit, ORB_STYLE.rex.shade, ORB_STYLE.rex.core, amt);
    } else if (kind === "ormius") {
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.ormius.glow, amt);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.ormius.lit, ORB_STYLE.ormius.shade, ORB_STYLE.ormius.core, amt);
    } else if (kind === "ava") {
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.ava.glow, amt);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.ava.lit, ORB_STYLE.ava.shade, ORB_STYLE.ava.core, amt);
    } else if (kind === "kaelum") {
      const a = amt;
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.kaelum.glow, a);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.kaelum.lit, ORB_STYLE.kaelum.shade, ORB_STYLE.kaelum.core, a);
    } else if (kind === "orochronus") {
      const a = amt;
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.orochronus.glow, a);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.orochronus.lit, ORB_STYLE.orochronus.shade, ORB_STYLE.orochronus.core, a);
      ctx.strokeStyle = `rgba(226,232,244,${0.55 * a})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(x, y, R * 1.15, 0, 6.283); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(t * 2.4) * R, y + Math.sin(t * 2.4) * R);
      ctx.stroke();
    } else if (kind === "kaeron") {
      const a = amt;
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.kaeron.glow, a);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.kaeron.lit, ORB_STYLE.kaeron.shade, ORB_STYLE.kaeron.core, a);
      ctx.fillStyle = `rgba(214,232,255,${0.8 * a})`;
      for (let k = 0; k < 3; k++) {
        const ang = t * 1.6 + k * 2.094;
        ctx.beginPath();
        ctx.arc(x + Math.cos(ang) * R * 1.3, y + Math.sin(ang) * R * 1.3, 1.6, 0, 6.283);
        ctx.fill();
      }
    } else if (kind === "mordrial") {
      flatGlow(ctx, x, y, R * 2.4, "190,30,36", amt);
      ctx.fillStyle = `rgba(18,8,12,${0.94 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.7, 0, 6.283); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, R * 0.7, 0, 6.283); ctx.clip();
      ctx.fillStyle = `rgba(200,32,40,${0.78 * amt})`;
      ctx.fillRect(x - R, y - R, R, R * 2);
      ctx.fillStyle = `rgba(240,238,232,${0.78 * amt})`;
      ctx.fillRect(x, y - R, R, R * 2);
      ctx.restore();
      ctx.fillStyle = `rgba(255,250,245,${0.8 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.16, 0, 6.283); ctx.fill();
    } else if (kind === "cadmus") {
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.cadmus.glow, amt);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.cadmus.lit, ORB_STYLE.cadmus.shade, ORB_STYLE.cadmus.core, amt);
    } else if (kind === "aelius") {
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.aelius.glow, amt);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.aelius.lit, ORB_STYLE.aelius.shade, ORB_STYLE.aelius.core, amt);
    } else if (kind === "velindra") {
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.velindra.glow, amt);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.velindra.lit, ORB_STYLE.velindra.shade, ORB_STYLE.velindra.core, amt);
    } else if (kind === "hound") {
      flatGlow(ctx, x, y, R * 1.9, "110,10,16", amt);
      ctx.fillStyle = `rgba(16,2,4,${0.96 * amt})`;
      ctx.beginPath();
      ctx.ellipse(x, y, R * 0.85, R * 0.62, Math.sin(t * 1.3) * 0.12, 0, 6.283);
      ctx.fill();
      ctx.strokeStyle = `rgba(220,30,36,${0.85 * amt})`;
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      for (let i = 0; i < 7; i++) {
        const ang = t * 0.4 + i * (6.283 / 7);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang) * R * 0.35, y + Math.sin(ang) * R * 0.28);
        ctx.lineTo(x + Math.cos(ang) * R * 0.95, y + Math.sin(ang) * R * 0.72);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(235,40,44,${0.75 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.18, 0, 6.283); ctx.fill();
    } else {
      flatGlow(ctx, x, y, R * 1.7, "120,12,18", amt);
      ctx.fillStyle = `rgba(22,3,5,${0.96 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.72, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(150,18,24,${0.55 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.22, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(8,1,2,${0.9 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.08, 0, 6.283); ctx.fill();
    }
    ctx.restore();
  }

  function drawRings(ctx) {
    if (!rings.length) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const r of rings) {
      ctx.strokeStyle = `rgba(255,180,140,${0.7 * r.a})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.283); ctx.stroke();
    }
    ctx.restore();
  }

  function drawBeam(ctx, ax, ay, bx, by, amt) {
    if (amt < 0.08) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(255,230,170,${0.55 * amt})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = `rgba(140,20,28,${0.28 * amt})`;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.restore();
  }

  function rexSurfY(u) { return H * 1.16 - rexLandHeight(u, REX_BANDS[0]) * H; }

  function drawRexLand(ctx, rise, originX, originY, floorY) {
    if (rise < 0.02) return;
    const lock = smooth(clamp((rise - 0.18) / 0.5, 0, 1));
    const xC = mix(originX, sx(mix(REX_WEST, REX_EAST, 0.72)), lock);
    const yC = mix(originY, H * 1.16, rise);
    const x0 = sx(REX_WEST) - 36;
    const x1 = sx(REX_EAST) + 80;
    if (x1 < -80 || x0 > W + 80) return;
    const bottom = floorY != null ? Math.min(H * 2.5, floorY) : H * 2.5;
    const baseY = H * 1.16;
    const step = 6;
    for (let bi = 0; bi < REX_BANDS.length; bi++) {
      const b = REX_BANDS[bi];
      const widen = (2 - bi) * 0.05;
      const pts = [];
      const left = Math.max(-56, sx(REX_WEST - widen) - 10);
      const right = Math.min(W + 80, sx(REX_EAST + 0.22 + widen * 0.15) + 10);
      for (const [px, wu] of gridXs(left, right, step)) {
        const h = rexLandHeight(wu, b);
        pts.push([px, mix(yC, baseY - h * H, rise)]);
      }
      if (pts.length < 2) continue;
      const last = pts[pts.length - 1];
      if (bottom - last[1] > 0) {
        const tailW = Math.max(40, (bottom - last[1]) * 0.9);
        pts.push([last[0] + tailW * 0.35, last[1] + (bottom - last[1]) * 0.45]);
        pts.push([last[0] + tailW, bottom]);
      }
      if (left > -56) {
        const first = pts[0];
        if (bottom - first[1] > 0) {
          const tailW = Math.max(40, (bottom - first[1]) * 0.9);
          pts.unshift([first[0] - tailW * 0.35, first[1] + (bottom - first[1]) * 0.45]);
          pts.unshift([first[0] - tailW, bottom]);
        }
      }
      ctx.globalAlpha = rise;
      fillRidge(ctx, pts, bottom, b.lit, b.shade);
      ctx.globalAlpha = 1;
    }
    if (rise > 0.12 && rise < 0.92) {
      const glint = (1 - Math.abs(rise - 0.42) / 0.42) * (1 - rise * 0.35);
      if (glint > 0.02) {
        flatGlow(ctx, xC, yC, 80 + rise * 120, "245,138,52", glint);
      }
    }
  }

  function drawRexHole(ctx) {
    const iF = idxOf("flee");
    if (beat < iF) return;
    const fleeLin = beat === iF ? linear("flee") : 1;
    const hx = sx(FLEE_START_U);
    if (hx < -160 || hx > W + 160) return;
    const hy = rexSurfY(FLEE_START_U);
    const open = smooth(clamp(fleeLin / 0.05, 0, 1));
    const R = Math.min(W, H) * 0.06 * Math.max(open, 0.001);
    const erupt = beat === iF ? 1 - smooth(clamp(fleeLin / 0.14, 0, 1)) : 0;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";

    ctx.beginPath();
    ctx.moveTo(hx - R * 1.2, hy);
    ctx.lineTo(hx + R * 1.2, hy);
    ctx.lineTo(hx + R * 0.5, H * 1.45);
    ctx.lineTo(hx - R * 0.5, H * 1.45);
    ctx.closePath();
    ctx.fillStyle = `rgba(4,1,1,${0.9 * open})`;
    ctx.fill();

    ctx.fillStyle = `rgba(20,5,4,${0.85 * open})`;
    ctx.beginPath(); ctx.ellipse(hx, hy + R * 0.15, R * 1.6, R * 0.55, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = `rgba(4,1,1,${0.97 * open})`;
    ctx.beginPath(); ctx.ellipse(hx + R * 0.12, hy + R * 0.18, R * 1.1, R * 0.36, 0, 0, 6.283); ctx.fill();

    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(245,138,52,${(0.35 + 0.25 * erupt) * open})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(hx, hy + R * 0.15, R * 1.6, R * 0.55, 0, 0, 6.283); ctx.stroke();
    ctx.globalCompositeOperation = "source-over";

    if (erupt > 0.02) {
      drawTintBeam(ctx, hx, hy, hx, hy - H * 0.55, "200,40,40", erupt);
      const q = clamp(fleeLin / 0.14, 0, 1);
      for (let k = 0; k < 14; k++) {
        const vx = (k / 13 - 0.5) * 2;
        const px = hx + vx * R * 4 * q;
        const py = hy - (1.2 + (k % 3) * 0.4) * R * 3 * q + R * 6 * q * q;
        const sz = 3 + (k % 4);
        ctx.fillStyle = `rgba(60,24,12,${erupt})`;
        ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
      }
    }

    if (beat === iF && fleeLin < 0.05 && clashCool <= 0) {
      flash = Math.max(flash, 0.9);
      shake = Math.max(shake, 1.0);
      clashCool = 0.3;
      rings.push({ x: hx, y: hy, r: 10, a: 1 });
    }

    ctx.restore();
  }

  /* Rex's body closing around something, fingers of ground and ember
     curling in from all sides */
  function drawRexGrip(ctx, x, y, amt, R) {
    if (amt < 0.02) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    flatGlow(ctx, x, y, R * 1.6, "245,138,52", amt);

    for (let k = 0; k < 5; k++) {
      const a0 = k * 1.2566 + t * 0.35;
      ctx.strokeStyle = `rgba(255,176,96,${0.75 * amt})`;
      ctx.lineWidth = 3 + R * 0.06;
      ctx.beginPath();
      ctx.arc(x, y, R * (0.85 + 0.1 * Math.sin(t * 2 + k)), a0, a0 + 0.95);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255,226,190,${0.45 * amt})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(x, y, R * 0.62, a0 + 0.6, a0 + 1.4);
      ctx.stroke();
    }

    ctx.restore();
  }

  /* Obrokxus, held under the surface where Rex closed around him */
  function drawBuried(ctx) {
    const iL = idxOf("land"), iG = idxOf("gods");
    if (beat !== iL && beat !== iG) return;
    const amt = beat === iL
      ? smooth(clamp((linear("land") - 0.35) / 0.30, 0, 1))
      : 1 - smooth(clamp((linear("gods") - 0.70) / 0.30, 0, 1));
    if (amt < 0.02) return;
    const x = sx(BURY_U), y = rexSurfY(BURY_U) + H * 0.10;
    const R = Math.min(W, H) * 0.16 * (1 + 0.12 * Math.sin(t * 3.2));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    flatGlow(ctx, x, y, R, "200,36,40", amt);
    ctx.restore();
  }

  /* the womb tears again, and the five gods come out over the buried
     ground, then dive down into it to join the war */
  function drawGodsBirth(ctx, flesh) {
    if (beat !== idxOf("gods")) return;
    const p = linear("gods"), span = Math.min(W, H);
    const exitX = flesh ? flesh.cx - flesh.rx * 0.92 : sx(ROOT_U) - span * 0.28;
    const exitY = flesh ? flesh.cy + flesh.ry * 0.04 : H * 0.5;

    const rip = smooth(clamp(p / 0.08, 0, 1)) * (1 - smooth(clamp((p - 0.50) / 0.15, 0, 1)));
    drawRip(ctx, flesh, rip);
    if (rip > 0.1) shake = Math.max(shake, 0.32 * rip);

    const bx = sx(BURY_U), by = rexSurfY(BURY_U);

    for (let i = 0; i < SIEGE_GODS.length; i++) {
      const g = SIEGE_GODS[i];
      const out = smooth(clamp((p - 0.06 - i * 0.08) / 0.20, 0, 1));
      if (out <= 0) continue;
      const hoverX = exitX - span * (0.30 + i * 0.07);
      const hoverY = H * (0.22 + ((i * 37) % 5) * 0.045) + Math.sin(t * 1.3 + g.ph) * span * 0.02;
      let x = mix(exitX, hoverX, out), y = mix(exitY, hoverY, out);

      const dive = clamp((p - 0.60 - i * 0.05) / 0.25, 0, 1);
      const landX = bx + (i - 2) * span * 0.02;
      x = mix(x, landX, smooth(dive));
      y = mix(y, by + H * 0.08, dive * dive);

      const amt = clamp(out * 1.4, 0, 1) * (1 - smooth(clamp((dive - 0.85) / 0.15, 0, 1)));
      pushTrail(trailG[i], x, y);
      drawTrail(ctx, trailG[i], g.rgb, amt);
      drawOrb(ctx, x, y, amt, g.kind, 0.62);
      drawName(ctx, x, y, amt, g.name, 24);

      const fl = Math.sin(Math.PI * clamp((dive - 0.75) / 0.25, 0, 1));
      if (fl > 0.02) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        flatGlow(ctx, landX, by, span * 0.08, g.rgb, 0.5 * fl);
        ctx.restore();
        shake = Math.max(shake, 0.25 * fl);
      }
    }
  }

  function drawTintBeam(ctx, ax, ay, bx, by, rgb, amt) {
    if (amt < 0.06) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(${rgb},${0.58 * amt})`;
    ctx.lineWidth = 2.1;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = `rgba(${rgb},${0.16 * amt})`;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.restore();
  }

  function yWob(ph, amp) {
    return H * 0.36 + Math.sin(t * 1.35 + ph) * H * (amp || 0.018);
  }

  /* a figure's feet: on the surface at that point, not on a fixed line */
  function standY(lane, wu, rise, scar) {
    return mainSurfY(wu == null ? MAIN_U : wu, rise == null ? 1 : rise,
                     scar == null ? 1 : scar)
         - 12 - (lane || 0) * H * 0.075;
  }

  function sagaAt() {
    if (beat < idxOf("flee")) return null;
    const flee = since("flee");
    const fleeLin = linear("flee");
    const war = since("war");
    const stall = since("stalemate");
    const lock = since("firstlock");
    const four = since("four");
    const fifth = since("fifth");
    const fall = linear("fall");
    const ret = since("return");
    const et = since("eternity");
    const etLin = linear("eternity");
    const span = Math.min(W, H);
    const godsOut = clamp((lock - 0.14) / 0.62, 0, 1);
    const fallIn = clamp(fall / 0.22, 0, 1);
    const up = smooth(clamp(fall / 0.22, 0, 1));
    const down = smooth(clamp((fall - 0.80) / 0.18, 0, 1));
    const air = up * (1 - down);
    const fallStrikes = [0, 0, 0, 0, 0];
    /* the fight against Obrokxus happens on vorgath's own ground —
       deep in the red zone, not walked back to the middle. Nest and
       duel share that ground; the duel spot sits a little short of
       the nest so the pit doesn't read as the battlefield itself. */
    const DUEL_U = MAIN_U + 0.30;

    /* ---- the land, before anything stands on it ----------------
       scar is what the war did to the shape of the ground: it only
       ever grows, and it stays. corrupt is the red laid over it,
       and that lifts once the fighting moves west. */
    let mainRise = 0;
    if (fleeLin > 0.58) mainRise = clamp((fleeLin - 0.58) / 0.42, 0, 1);
    if (war > 0) mainRise = 1;

    let scar = 0;
    if (war > 0) scar = mix(0, 0.30, clamp(war, 0, 1));
    if (stall > 0) scar = mix(0.30, 0.44, stall);
    if (lock > 0) scar = mix(0.44, 0.64, lock);
    if (four > 0) scar = mix(0.64, 0.86, four);
    if (fifth > 0) scar = mix(0.86, 0.95, fifth);
    if (fall > 0) scar = mix(0.95, 1, fall);
    if (ret > 0 || et > 0) scar = 1;

    let corrupt = scar;
    if (ret > 0) corrupt = mix(1, 0.07, smooth(clamp(ret / 0.72, 0, 1)));
    if (et > 0) corrupt = 0.07;

    /* the city fills west to east and finishes when the war does */
    let civAmt = 0;
    if (lock > 0.12) civAmt = mix(0, 0.32, clamp((lock - 0.12) / 0.88, 0, 1));
    if (four > 0) civAmt = mix(0.32, 0.44, four);
    if (fifth > 0) civAmt = mix(0.44, 0.50, fifth);
    if (fall > 0) civAmt = mix(0.50, 0.55, fall);
    if (ret > 0) civAmt = mix(0.55, 1, smooth(clamp(ret / 0.82, 0, 1)));
    if (et > 0) civAmt = 1;

    const gy = (lane, wu) => standY(lane, wu, mainRise, scar);
    const skyY = (u, y) => Math.min(y, mainSurfY(u, mainRise, scar) - 14);

    /* ---- the chase, and the flank that ends it -----------------
       Obrokxus is in front the whole way west and the two lights are
       behind him, because their positions ARE his position plus a
       gap. When the land comes up under them they do not walk past
       him on the ground: they cut up and over him and come down on
       the far side — the side their own city and their own armies
       (seraphin, malgrur) are on, with his (vorgath) left on his. */
    const C = chaseAt(fleeLin);
    const settle = smooth(clamp(fleeLin / 0.10, 0, 1));
    const F = chaseFightAt(fleeLin);
    let ou = C.ou, oy = mix(H * 0.36, yWob(0.2, 0.026), settle), oAmt = 0;
    if (et > 0) {
      const D = duelAt(etLin);
      ou = D.ou;
      oy = D.oy;
      oAmt = mix(0, 0.84, smooth(clamp(etLin / 0.18, 0, 1)));
    } else if (ret > 0) {
      oAmt = 0;
    } else if (fall > 0) {
      ou = mix(EAST_U, DUEL_U, fallIn) + Math.sin(fall * 14) * 0.04 * up;
      oy = mix(yWob(0.2, 0.026), H * 0.30 + Math.sin(fall * 11 + 1) * span * 0.05, up);
      oAmt = mix(1, 0, clamp((fall - 0.78) / 0.22, 0, 1));
    } else {
      oAmt = mix(0.88, 1, settle);
      if (war <= 0) {
        ou = C.ou + F.ouOff * F.w;
        oy = mix(oy, F.oyAbs, F.w);
      }
    }
    if (et <= 0 && ret <= 0 && fall <= 0 && war <= 0) {
      const outO = smooth(clamp(fleeLin / 0.07, 0, 1));
      ou = mix(BURY_U, ou, outO);
      oy = mix(rexSurfY(BURY_U) + H * 0.03, oy, outO);
    }

    let mu = C.mu;
    let my = yWob(1.1, 0.02) - H * 0.03, mAmt = 0;
    if (et > 0) {
      /* cross-faded out of the pose the return beat left him in, so
         the duel opens from where he already was instead of cutting */
      const D = duelAt(etLin);
      const hand = smooth(clamp(etLin / 0.10, 0, 1));
      mu = mix(MAIN_U - 0.58, D.mu, hand);
      my = mix(yWob(1.4, 0.02), D.my, hand);
      mAmt = mix(0.48, 0.92, smooth(clamp(etLin / 0.30, 0, 1)));
    } else if (ret > 0) {
      mAmt = mix(0, 0.48, clamp((ret - 0.35) / 0.65, 0, 1));
      mu = mix(MAIN_U + 0.08, MAIN_U - 0.58, ret);
      my = yWob(1.4, 0.02);
    } else if (fleeLin > 0.02) {
      mAmt = clamp((fleeLin - 0.02) / 0.10, 0, 1) * (1 - godsOut);
      if (war <= 0) {
        mu = mix(C.mu, ou + F.mGap, F.w);
        my = mix(my, oy + F.myOff, F.w);
      }
      if (war > 0) {
        /* the flank: over the top, landing west of him */
        const k = smooth(clamp((war - 0.05) / 0.70, 0, 1));
        mu = mix(EAST_U + 0.17, WEST_U - 0.14, k);
        my -= Math.sin(k * Math.PI) * H * 0.17;
      }
      if (lock > 0) {
        mu = mix(WEST_U - 0.14, MAIN_U + 0.16, lock);
        my = mix(yWob(1.1, 0.018) - H * 0.03, yWob(0.8, 0.012), lock);
      }
    }
    if (et <= 0 && ret <= 0 && war <= 0) {
      const outM = smooth(clamp((fleeLin - 0.02) / 0.12, 0, 1));
      mu = mix(BURY_U, mu, outM);
      my = mix(rexSurfY(BURY_U) + H * 0.03, my, outM);
    }

    let au = C.au;
    let ay = yWob(2.6, 0.018) + H * 0.04, aAmt = 0;
    if (et > 0) {
      aAmt = 0;
    } else if (ret > 0) {
      aAmt = 0;
    } else if (fleeLin > 0.06) {
      aAmt = clamp((fleeLin - 0.06) / 0.10, 0, 1) * (1 - godsOut);
      if (war <= 0) {
        au = mix(C.au, ou + F.aGap, F.w);
        ay = mix(ay, oy + F.ayOff, F.w);
      }
      if (war > 0) {
        const k = smooth(clamp((war - 0.12) / 0.70, 0, 1));
        au = mix(EAST_U + 0.30, WEST_U - 0.02, k);
        ay -= Math.sin(k * Math.PI) * H * 0.23;
      }
      if (lock > 0) {
        au = mix(WEST_U - 0.02, MAIN_U + 0.20, lock);
        ay = mix(yWob(2.6, 0.016) + H * 0.035, yWob(0.9, 0.012), lock);
      }
    }
    if (et <= 0 && ret <= 0 && war <= 0) {
      const outA = smooth(clamp((fleeLin - 0.06) / 0.12, 0, 1));
      au = mix(BURY_U, au, outA);
      ay = mix(rexSurfY(BURY_U) + H * 0.03, ay, outA);
    }

    const born = clamp((lock - 0.42) / 0.40, 0, 1);
    const dieM = smooth(clamp((fall - 0.76) / 0.20, 0, 1));
    let mdU = mix(MAIN_U - 0.02, MAIN_U - 0.14, four);
    let mdY = gy(0.10, mdU);
    let mdAmt = born * (1 - dieM);
    if (fifth > 0) {
      /* all four cross to the nest together for the Hound's birth,
         not just Cadmus; blend the endpoint heights rather than
         sampling the live terrain across that whole crossing, or
         they bob over every ripple of ground on the way. */
      mdU = mix(MAIN_U - 0.14, NEST_U - 0.10, fifth);
      mdY = mix(gy(0.08, MAIN_U - 0.14), gy(0.08, NEST_U - 0.10), fifth);
    }
    if (fall > 0) {
      const R0 = ringFightAt(0, fall, ou, oy, 1 - dieM);
      fallStrikes[0] = R0.strike * up * (1 - dieM);
      const gU = NEST_U - 0.10;
      mdU = mix(gU, R0.u, up);
      const skyMd = skyY(mdU, mix(gy(0.08, gU), R0.y, up));
      mdY = mix(skyMd, mainSurfY(mdU, mainRise, scar) + 26, dieM);
    }
    if (ret > 0) mdAmt = 0;

    const slot = (start) => clamp((four - start) / 0.22, 0, 1);
    let cU = mix(MAIN_U - 0.24, NEST_U + 0.16, fifth);
    let cAmt = slot(0.12);
    let aelU = mix(MAIN_U - 0.32, NEST_U - 0.20, fifth);
    let aelAmt = slot(0.36);
    let vU = mix(MAIN_U - 0.17, NEST_U - 0.34, fifth);
    let vAmt = slot(0.58);
    /* same terrain-bob fix as Mordrial above, for all three */
    let cY = mix(gy(0.14, MAIN_U - 0.24), gy(0.06, NEST_U + 0.16), fifth);
    let aelY = mix(gy(0.02, MAIN_U - 0.32), gy(0.00, NEST_U - 0.20), fifth);
    let vY = mix(gy(0.20, MAIN_U - 0.17), gy(0.22, NEST_U - 0.34), fifth);
    /* through the fight itself they hold their ground at the nest
       (cU/aelU/vU keep the "fifth" end value, since `fifth` is
       already at 1 by the time `fall` starts) instead of drifting
       back toward the middle. */
    if (fall > 0 && ret <= 0) {
      const Rc = ringFightAt(1, fall, ou, oy, 1);
      const Ra = ringFightAt(2, fall, ou, oy, 1);
      const Rv = ringFightAt(3, fall, ou, oy, 1);
      fallStrikes[1] = Rc.strike * air;
      fallStrikes[2] = Ra.strike * air;
      fallStrikes[3] = Rv.strike * air;
      const cY0 = cY, aelY0 = aelY, vY0 = vY;
      cY = mix(cY0, skyY(Rc.u, Rc.y), air);
      cU = mix(cU, Rc.u, air);
      aelY = mix(aelY0, skyY(Ra.u, Ra.y), air);
      aelU = mix(aelU, Ra.u, air);
      vY = mix(vY0, skyY(Rv.u, Rv.y), air);
      vU = mix(vU, Rv.u, air);
    }
    if (ret > 0) {
      /* victory won, they walk west into the city they are about
         to disappear into */
      const home = smooth(clamp(ret / 0.85, 0, 1));
      const fadeHome = mix(1, 0.10, clamp((ret - 0.45) / 0.55, 0, 1));
      const cU0 = NEST_U + 0.16, aelU0 = NEST_U - 0.20, vU0 = NEST_U - 0.34;
      cU = mix(cU0, CITY_U + 0.13, home);
      aelU = mix(aelU0, CITY_U + 0.34, home);
      vU = mix(vU0, CITY_U - 0.08, home);
      cY = mix(gy(0.06, cU0), gy(0.10, CITY_U + 0.13), home);
      aelY = mix(gy(0.00, aelU0), gy(0.02, CITY_U + 0.34), home);
      vY = mix(gy(0.22, vU0), gy(0.20, CITY_U - 0.08), home);
      cAmt *= fadeHome;
      aelAmt *= fadeHome;
      vAmt *= fadeHome;
    }

    const nestU = NEST_U;
    const nestAmt = fifth > 0
      ? mix(0.25, 1, clamp(fifth * 2.4, 0, 1)) * (1 - clamp((fifth - 0.58) / 0.38, 0, 1))
      : 0;
    const houndBorn = clamp((fifth - 0.50) / 0.34, 0, 1);
    /* the Hound stays at the fight too, instead of already walking
       west while Mordrial and Obrokxus are still at it */
    let hU = mix(nestU, DUEL_U - 0.05, fallIn);
    let hY = mix(gy(-0.04, nestU), gy(-0.06, DUEL_U - 0.05), fallIn);
    let hAmt = houndBorn;
    if (fall > 0 && ret <= 0) {
      const Rh = ringFightAt(4, fall, ou, oy, 1);
      fallStrikes[4] = Rh.strike * air;
      hY = mix(hY, skyY(Rh.u, Rh.y), air);
      hU = mix(hU, Rh.u, air);
    }
    if (ret > 0) {
      const homeH = smooth(clamp(ret / 0.85, 0, 1));
      hU = mix(DUEL_U - 0.05, CITY_U - 0.28, homeH);
      hY = mix(gy(-0.06, DUEL_U - 0.05), gy(-0.06, CITY_U - 0.28), homeH);
      hAmt = mix(1, 0.12, clamp((ret - 0.45) / 0.55, 0, 1));
    }

    let army = 0;
    if (war > 0) army = mix(0, 0.32, clamp(war, 0, 1));
    if (stall > 0) army = mix(0.32, 0.42, stall);
    if (lock > 0) army = mix(0.42, 0.55, lock);
    if (four > 0) army = mix(0.55, 0.82, four);
    if (fifth > 0) army = mix(0.82, 0.92, fifth);
    if (fall > 0) army = mix(0.92, 1, fall);
    if (ret > 0) army = mix(1, 0, clamp(ret / 0.55, 0, 1));
    if (et > 0) army = 0;

    if (et > 0) {
      /* the duel leaves. The land does not: it keeps its city and
         slides out of frame behind the camera. Everyone still on it
         fades over the first second instead of blinking off on the
         beat change. */
      const gone = 1 - smooth(clamp(etLin / 0.12, 0, 1));
      mdAmt *= gone;
      cAmt *= gone;
      aelAmt *= gone;
      vAmt *= gone;
      hAmt *= gone;
      aAmt = 0;
    }

    return {
      ou, oy, oAmt, mu, my, mAmt, au, ay, aAmt,
      mdU, mdY, mdAmt, cU, cY, cAmt, aelU, aelY, aelAmt, vU, vY, vAmt,
      nestU, nestAmt, hU, hY, hAmt, army, civAmt, corrupt, scar, mainRise,
      flee, fleeLin, war, stall, lock, four, fifth, fall, ret, et, etLin, born, dieM, godsOut,
      fightW: war > 0 ? 0 : F.w, strikeM: F.strikeM, strikeA: F.strikeA,
      fallStrikes, etStrike: et > 0 ? duelAt(etLin).strike : 0,
    };
  }

  function drawMainland(ctx, S) {
    const rise = S && S.mainRise;
    if (!rise || rise < 0.02) return;
    const scar = S.scar || 0;
    const corrupt = S.corrupt || 0;
    const deckY = H * DECK;
    const bottom = H + 80;
    const step = 5;
    /* The land does not stop at the rim: past it the surface shears
       down and away, and that tail is still well inside the frame
       long after the rim itself has left it. Culling on the rim
       alone is what dropped the corners out in a single frame once
       the camera moved off. This is the furthest the shallowest
       tail can still reach back into view. */
    const tail = 0.16 * W + (H + 160 - deckY) / 1.1;
    const xL = sx(MAIN_U - MAIN_HALF);
    const xR = sx(MAIN_U + MAIN_HALF);
    if (xR < -tail || xL > W + tail) return;
    /* and sample the whole frame rather than a box around the land:
       on a wide window the old box ended the fill in a vertical wall
       partway across the screen */
    const left = -60;
    const right = W + 60;

    /* past the rim the land shears off downward instead of stopping
       dead, which is what made it read as a slab hanging in the dark */
    const rimY = (wu, shear, out, seed) => {
      const d = Math.max(0, Math.abs(wu - MAIN_U) - MAIN_HALF - (out || 0));
      const broken = 1 + (ridge(wu * 26, seed || 7703) - 0.5) * 0.55
                       + (ridge(wu * 62, (seed || 7703) + 11) - 0.5) * 0.22;
      return deckY + d * W * (shear || 2.2) * broken;
    };

    /* the two ranges behind, first
       past the rim the back ranges ride 8px under the near range's tail, otherwise
       their shallower shear left a lighter band hugging the bridge at the frame edges */
    const cu = corrupt * 0.7;
    for (const b of MAIN_BANDS) {
      const pts = [];
      for (const [px, wu] of gridXs(left, right, step)) {
        const dome = mainDome(wu);
        const y = dome > 0.002
          ? deckY - mainBandHeight(wu, b) * H
          : rimY(wu, 2.9, 0, 7703) + 8;
        if (y > H + 120) continue;
        pts.push([px, mix(H + 24, y, rise)]);
      }
      if (pts.length < 3) continue;
      ctx.globalAlpha = rise;
      fillRidge(ctx, pts, bottom, mixHex(b.lit, "#2e171a", cu * 0.6), mixHex(b.shade, "#1c0e0e", cu * 0.6));
      ctx.globalAlpha = 1;
    }

    /* the near range, the one everything stands on */
    const top = [];
    for (const [px, wu] of gridXs(left, right, step)) {
      const dome = mainDome(wu);
      const y = dome > 0.002 ? H * DECK - mainHeight(wu, scar) * H : rimY(wu, 2.9, 0, 7703);
      if (y > H + 120) continue;
      top.push([px, mix(H + 28, y, rise)]);
    }
    if (top.length < 3) return;

    ctx.globalAlpha = rise;
    fillRidge(ctx, top, bottom, mixHex("#1a222a", "#3a1a1e", cu), mixHex("#10161b", "#24100f", cu));
    ctx.globalAlpha = 1;

    if (corrupt > 0.06) {
      for (const sp of spikes) {
        if (sp.born > corrupt) continue;
        const wu = MAIN_U + sp.u;
        const x = sx(wu);
        /* margin is the widest the shape can be, not the anchor
           point, or tall things pop out while still half in frame */
        if (x < -90 || x > W + 90) continue;
        const grow = clamp((corrupt - sp.born) / 0.22, 0, 1);
        if (grow < 0.04) continue;
        const y = mainSurfY(wu, rise, scar) + 3;
        const th = sp.h * H * grow * mix(0.55, 1.15, corrupt);
        const tw = sp.w * mix(0.7, 1, grow);
        const lean = sp.lean * grow;
        const pulse = 0.85 + 0.15 * Math.sin(t * 1.3 + sp.ph);
        const sp2 = new Path2D();
        sp2.moveTo(x - tw * 0.58, y + 4);
        const n = sp.teeth.length;
        for (let i = 0; i < n; i++) {
          const u = (i + 0.55) / (n + 1);
          const jag = (sp.teeth[i] - 0.5) * tw * 0.42;
          sp2.lineTo(
            x - tw * 0.42 * (1 - u) + lean * u + jag,
            y - th * Math.pow(u, 0.62) * (0.35 + 0.65 * u) * pulse
          );
        }
        sp2.lineTo(x + lean, y - th * pulse);
        for (let i = n - 1; i >= 0; i--) {
          const u = (i + 0.55) / (n + 1);
          const jag = (sp.teeth[i] - 0.5) * tw * 0.34;
          sp2.lineTo(
            x + tw * 0.40 * (1 - u) + lean * u + jag,
            y - th * Math.pow(u, 0.66) * (0.32 + 0.68 * u) * pulse
          );
        }
        sp2.lineTo(x + tw * 0.52, y + 4);
        sp2.closePath();
        const litCol = `rgba(${sp.shade < 0.4 ? 70 : 110},8,10,${0.92 * rise})`;
        const shadeCol = `rgba(34,5,7,${0.95 * rise})`;
        ctx.fillStyle = litCol;
        ctx.fill(sp2);
        ctx.save();
        ctx.clip(sp2);
        ctx.fillStyle = shadeCol;
        ctx.fillRect(x + lean * 0.4 + tw * 0.06, -1e5, 2e5, 2e5);
        ctx.restore();
      }
    }
  }

  function drawCity(ctx, S) {
    const amt = S && S.civAmt;
    if (!amt || amt < 0.03) return;
    const rise = S.mainRise || 1;
    const scar = S.scar || 0;
    const bands = [
      { list: cityFar,  lit: "#1f282d", shade: "#141a1e", alpha: 0.55 },
      { list: cityMid,  lit: "#222c32", shade: "#161d21", alpha: 0.78 },
      { list: cityNear, lit: "#26323a", shade: "#182025", alpha: 1 },
    ];
    for (const band of bands) {
      ctx.globalAlpha = amt * rise * band.alpha;
      for (const tw of band.list) {
        if (tw.born > amt) continue;
        const wu = MAIN_U + tw.u * MAIN_HALF;
        const x = sx(wu);
        if (x < -80 || x > W + 80) continue;
        const grow = clamp((amt - tw.born) / 0.20, 0, 1);
        if (grow < 0.04) continue;
        const floor = mainSurfY(wu, rise, scar) + 2;
        const h = tw.h * H * grow * mix(0.38, 1.08, amt);
        const w = Math.max(2, tw.w * mix(0.75, 1, grow));
        ctx.fillStyle = band.lit;
        ctx.fillRect(x - w * 0.5, floor - h, w * 0.3, h);
        ctx.fillStyle = band.shade;
        ctx.fillRect(x - w * 0.5 + w * 0.3, floor - h, w * 0.7, h);
      }
      ctx.globalAlpha = 1;
    }
    for (const tw of cityNear) {
      if (tw.born > amt) continue;
      const wu = MAIN_U + tw.u * MAIN_HALF;
      const x = sx(wu);
      if (x < -80 || x > W + 80) continue;
      const grow = clamp((amt - tw.born) / 0.20, 0, 1);
      if (grow < 0.18) continue;
      const floor = mainSurfY(wu, rise, scar) + 2;
      const h = tw.h * H * grow * mix(0.38, 1.08, amt);
      const w = Math.max(2, tw.w * mix(0.75, 1, grow));
      const k = mix(0.7, 1, grow);
      for (const win of tw.windows) {
        const px = x - w * 0.5 + win.dx * k;
        const py = floor - h + win.dy * k;
        if (py > floor - 6 || py < floor - h + 4) continue;
        ctx.globalAlpha = win.a * (0.75 + 0.25 * Math.sin(t * 2.1 + win.fl)) * amt * grow * 0.9;
        ctx.fillStyle = win.warm ? "#f5d06b" : "#8fb0b8";
        ctx.fillRect(px, py, 2.1, 2.8);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawSpark(ctx, x, y, rgb, rad, a) {
    if (a < 0.04) return;
    flatGlow(ctx, x, y, rad * 2.4, rgb, a);
    ctx.fillStyle = `rgba(255,255,248,${0.55 * a})`;
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.6, rad * 0.32), 0, 6.283); ctx.fill();
  }

  function drawArmies(ctx, S) {
    if (!S || S.army < 0.04) return;
    const push = clamp(S.army, 0, 1);
    let motion = 1;
    if (S.stall > 0) motion = mix(1, 0.12, clamp(S.stall, 0, 1));
    if (S.lock > 0) motion = 0.12;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const c of troops) {
      if (c.born > S.army) continue;
      /* both sides charge the front line at MAIN_U and surge back and
         forth across it, so the front ranks are actually in each other */
      const front = clamp(1 - Math.abs(c.home) / 0.78, 0, 1);
      const surge = push * (0.6 + 0.4 * Math.sin(t * 0.9 + c.ph)) * mix(0.35, 1, front);
      const side = c.kind === "vorgath" ? 1 : -1;
      const u = MAIN_U + mix(c.home, side * -0.035 * front, clamp(surge * 0.9, 0, 1) * motion)
              + Math.sin(t * (0.7 + c.gait) + c.ph) * 0.018 * motion;
      const x = sx(u);
      if (x < -40 || x > W + 40) continue;
      const y = mainSurfY(u, S.mainRise, S.scar) - 10 - (c.lane || 0) * H * 0.075
              + Math.sin(t * 1.7 + c.ph) * 2.2 * motion;
      const a = (0.5 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2 + c.ph))) * clamp((S.army - c.born) / 0.08, 0, 1);
      if (a < 0.05) continue;
      const rgb = c.kind === "vorgath" ? "160,24,28"
                : c.kind === "seraphin" ? "214,230,222"
                : "255,176,90";
      drawSpark(ctx, x, y, rgb, 1.5 + c.s * 1.05, a);
    }
    ctx.restore();
  }

  function drawNestPit(ctx, S) {
    if (!S || S.nestAmt < 0.04) return;
    const x = sx(S.nestU), y = mainSurfY(S.nestU, S.mainRise, S.scar) + 6;
    const R = Math.min(W, H) * 0.055 * S.nestAmt;
    ctx.fillStyle = `rgba(50,6,8,${0.6 * S.nestAmt})`;
    ctx.beginPath(); ctx.ellipse(x, y, R * 2.1, R * 0.42, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = `rgba(8,0,1,${0.96 * S.nestAmt})`;
    ctx.beginPath(); ctx.ellipse(x + R * 0.2, y + R * 0.04, R * 1.4, R * 0.28, 0, 0, 6.283); ctx.fill();
    ctx.save();
    ctx.strokeStyle = `rgba(140,16,22,${0.5 * S.nestAmt})`;
    ctx.lineWidth = 1.15;
    ctx.lineCap = "round";
    for (let i = 0; i < 7; i++) {
      const ang = Math.PI + (i - 3) * 0.22 + Math.sin(t * 1.4 + i) * 0.08;
      const len = R * (1.1 + 0.45 * Math.sin(t * 1.8 + i));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + Math.cos(ang) * len * 0.45,
        y + Math.sin(ang) * len * 0.25,
        x + Math.cos(ang) * len,
        y + Math.sin(ang) * len * 0.35
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  /* who is who. The lines name them once; the labels keep naming
     them, quietly, for as long as they are on the deck. */
  function drawName(ctx, x, y, amt, text, drop) {
    if (amt < 0.12 || !text) return;
    if (amt >= 0.5 && nameSeen[text] == null) nameSeen[text] = t;
    if (nameSeen[text] == null) return;
    if (x < -80 || x > W + 80) return;
    const late = clamp((t - nameSeen[text] - NAME_DELAY) / NAME_FADE, 0, 1);
    if (late <= 0) return;
    const a = clamp((amt - 0.12) / 0.35, 0, 1) * 0.72 * late;
    const dy = y + (drop == null ? 26 : drop);
    ctx.save();
    ctx.font = '500 10px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const w = ctx.measureText(text).width;
    ctx.fillStyle = `rgba(8,11,13,${0.62 * a})`;
    ctx.fillRect(x - w * 0.5 - 5, dy - 3, w + 10, 15);
    ctx.fillStyle = `rgba(220,230,232,${a})`;
    ctx.fillText(text, x, dy);
    ctx.restore();
  }

  function drawSaga(ctx) {
    const S = sagaAt();
    if (!S) return;

    drawMainland(ctx, S);
    drawCity(ctx, S);
    drawNestPit(ctx, S);
    drawArmies(ctx, S);

    const ox = sx(S.ou), oy = S.oy;
    const mx = sx(S.mu), my = S.my;
    const ax = sx(S.au), ay = S.ay;

    if (S.oAmt > 0.02) { pushTrail(trailR, ox, oy); drawTrail(ctx, trailR, "90,12,18", S.oAmt, true); }
    if (S.mAmt > 0.02) { pushTrail(trailM, mx, my); drawTrail(ctx, trailM, "210,70,48", S.mAmt); }
    if (S.aAmt > 0.02) { pushTrail(trailA, ax, ay); drawTrail(ctx, trailA, "120,214,96", S.aAmt); }

    if (S.fightW > 0.05) {
      drawBeam(ctx, mx, my, ox, oy, S.strikeM * S.fightW * S.mAmt);
      drawTintBeam(ctx, ax, ay, ox, oy, "120,214,96", S.strikeA * S.fightW * S.aAmt);
    }

    if (S.lock > 0.40 && S.lock < 0.82 && S.mAmt > 0.08 && S.aAmt > 0.08) {
      const p = 1 - Math.abs(S.lock - 0.58) / 0.18;
      if (p > 0) {
        flash = Math.max(flash, p * 0.7);
        shake = Math.max(shake, 0.32 * p);
        drawTintBeam(ctx, mx, my, ax, ay, "220,210,180", p);
        drawTintBeam(ctx, mx, my, sx(S.mdU), S.mdY, "200,32,40", p * S.mdAmt);
        drawTintBeam(ctx, ax, ay, sx(S.mdU), S.mdY, "120,214,96", p * S.mdAmt);
      }
    }

    if (S.fifth > 0.12 && S.fifth < 0.72 && S.cAmt > 0.1) {
      const beam = Math.sin(clamp((S.fifth - 0.12) / 0.5, 0, 1) * 3.14);
      drawTintBeam(ctx, sx(S.cU), S.cY, sx(S.nestU), mainSurfY(S.nestU, S.mainRise, S.scar) + 4, "170,60,40", beam * S.cAmt * 0.85);
    }

    if (S.war > 0.08 && S.et < 0.02) {
      const clashY = standY(0, MAIN_U, S.mainRise, S.scar);
      if (Math.sin(t * 9.0) > 0.35 && clashCool <= 0 && S.army > 0.1) {
        clashCool = 0.12;
        const cu = MAIN_U + (Math.random() - 0.5) * 0.10;
        rings.push({ x: sx(cu), y: clashY - Math.random() * 18, r: 5, a: 0.75 });
        shake = Math.max(shake, 0.16);
      }
    }

    drawOrb(ctx, sx(S.mdU), S.mdY, S.mdAmt, "mordrial", 0.58);
    drawOrb(ctx, sx(S.cU), S.cY, S.cAmt, "cadmus", 0.52);
    drawOrb(ctx, sx(S.aelU), S.aelY, S.aelAmt, "aelius", 0.52);
    drawOrb(ctx, sx(S.vU), S.vY, S.vAmt, "velindra", 0.52);
    drawOrb(ctx, sx(S.hU), S.hY, S.hAmt, "hound", 0.62);

    drawOrb(ctx, ox, oy, S.oAmt, "obrokxus");
    drawOrb(ctx, mx, my, S.mAmt, "ormius");
    drawOrb(ctx, ax, ay, S.aAmt, "ava");

    const nameUp = S.et > 0 ? 0 : 1;
    drawName(ctx, sx(S.mdU), S.mdY, S.mdAmt * (1 - S.dieM) * nameUp, "MORDRIAL", 30);
    drawName(ctx, sx(S.cU), S.cY, S.cAmt * nameUp, "CADMUS", 26);
    drawName(ctx, sx(S.aelU), S.aelY, S.aelAmt * nameUp, "AELIUS", 40);
    drawName(ctx, sx(S.vU), S.vY, S.vAmt * nameUp, "VELINDRA", 26);
    drawName(ctx, sx(S.hU), S.hY, S.hAmt * nameUp, "THE HOUND", 34);
    drawName(ctx, ox, oy, S.oAmt, "OBROKXUS", 34);
    drawName(ctx, mx, my, S.mAmt, "ORMIUS", 30);
    drawName(ctx, ax, ay, S.aAmt, "AVA", 40);

    if (S.fightW > 0.3 && S.oAmt > 0.2) {
      const hits = [[mx, my, S.mAmt], [ax, ay, S.aAmt]];
      for (const hit of hits) {
        if (hit[2] < 0.2 || clashCool > 0) continue;
        if (Math.hypot(hit[0] - ox, hit[1] - oy) < 42) {
          flash = Math.max(flash, 0.8);
          shake = Math.max(shake, 0.6);
          clashCool = 0.24;
          rings.push({ x: (hit[0] + ox) * 0.5, y: (hit[1] + oy) * 0.5, r: 10, a: 1 });
        }
      }
    }
    if (S.fall > 0.10 && S.fall < 0.86 && S.oAmt > 0.2) {
      const five = [
        [sx(S.mdU), S.mdY, S.mdAmt, "200,32,40"],
        [sx(S.cU), S.cY, S.cAmt, "170,60,40"],
        [sx(S.aelU), S.aelY, S.aelAmt, "30,160,100"],
        [sx(S.vU), S.vY, S.vAmt, "140,70,210"],
        [sx(S.hU), S.hY, S.hAmt, "220,30,36"],
      ];
      for (let i = 0; i < five.length; i++) {
        const f = five[i];
        if (f[2] < 0.15) continue;
        drawTintBeam(ctx, f[0], f[1], ox, oy, f[3], S.fallStrikes[i] * f[2] * S.oAmt);
        if (clashCool <= 0 && Math.hypot(f[0] - ox, f[1] - oy) < 44) {
          flash = Math.max(flash, 0.9);
          shake = Math.max(shake, 0.9);
          clashCool = 0.16;
          rings.push({ x: (f[0] + ox) * 0.5, y: (f[1] + oy) * 0.5, r: 10, a: 1 });
        }
      }
    }
    if (S.et > 0.12 && S.oAmt > 0.2 && S.mAmt > 0.2) {
      drawBeam(ctx, mx, my, ox, oy, S.etStrike * Math.min(S.oAmt, S.mAmt));
      const dx = mx - ox, dy = my - oy;
      if (Math.hypot(dx, dy) < 40 && clashCool <= 0) {
        flash = 0.7;
        shake = Math.max(shake, 0.45);
        clashCool = 0.2;
        rings.push({ x: (mx + ox) * 0.5, y: (my + oy) * 0.5, r: 8, a: 0.85 });
      }
    }
    if (S.fleeLin > 0.08 && S.fleeLin < 0.96) shake = Math.max(shake, 0.10);
    if (S.war > 0.05 && S.war < 0.95) shake = Math.max(shake, 0.14);
    if (S.fifth > 0.2 && S.fifth < 0.8) shake = Math.max(shake, 0.22);
    if (S.fall > 0.15) shake = Math.max(shake, 0.20 + S.fall * 0.22);
    if (S.dieM > 0.05 && S.dieM < 0.7) shake = Math.max(shake, 0.55);
    drawRings(ctx);
  }

  /* the deepest pocket inside Rex, and the war fought there. Drawn in
     world space — the caller has already translated by -diveY, so
     what is here lines up with the buried scene above it. */
  function drawDepths(ctx, dive, diveY) {
    const iD = idxOf("deep"), iP = idxOf("slip");
    if ((beat !== iD && beat !== iP) || dive < 0.001) return;
    const inSlip = beat === iP;
    const deepLin = inSlip ? 1 : linear("deep");
    const slipLin = inSlip ? linear("slip") : 0;
    const span = Math.min(W, H), dx = sx(DEEP_U), dy = H * DEEP_Y;
    ctx.save();

    /* flat stepped rock, following the same surface as the land above */
    ctx.globalCompositeOperation = "source-over";
    const rock = new Path2D();
    let firstRockPx = true;
    for (const [px, wu] of gridXs(-40, W + 40, 8)) {
      const y = H * 1.16 - rexLandHeight(wu, REX_BANDS[2]) * H + H * 0.03;
      firstRockPx ? rock.moveTo(px, y) : rock.lineTo(px, y);
      firstRockPx = false;
    }
    rock.lineTo(W + 40, H * 2.6);
    rock.lineTo(-40, H * 2.6);
    rock.closePath();
    ctx.save();
    ctx.clip(rock);
    ctx.fillStyle = "#1e1f21"; ctx.fillRect(-40, -H, W + 80, H * 1.15 - (-H));
    ctx.fillStyle = "#231a17"; ctx.fillRect(-40, H * 1.15, W + 80, H * 0.40);
    ctx.fillStyle = "#2a1810"; ctx.fillRect(-40, H * 1.55, W + 80, H * 0.45);
    ctx.fillStyle = "#34170c"; ctx.fillRect(-40, H * 2.0, W + 80, H * 0.6);
    ctx.restore();

    /* molten veins */
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 1.6;
    for (let k = 0; k < 12; k++) {
      const va = k * 0.5236 + 0.3;
      const x0 = dx + Math.cos(va) * W * 0.30, y0 = dy + Math.sin(va) * H * 0.26;
      const x1 = dx + Math.cos(va) * W * 0.75, y1 = dy + Math.sin(va) * H * 0.62;
      const mx = (x0 + x1) * 0.5 + Math.sin(t * 0.5 + k) * span * 0.04;
      const my = (y0 + y1) * 0.5 + Math.sin(t * 0.5 + k) * span * 0.04;
      ctx.strokeStyle = `rgba(245,138,52,${0.16 + 0.08 * Math.sin(t * 1.1 + k)})`;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(mx, my, x1, y1);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";

    /* the pocket */
    offsetShade(ctx, () => fleshPath(ctx, dx, dy, W * 0.36, H * 0.30, 0.7, 3),
      W * 0.045, H * 0.05, "rgba(150,60,24,0.88)", "rgba(92,32,14,0.9)");

    /* Obrokxus */
    let ox = dx + Math.sin(t * 0.9) * span * 0.03, oy = dy + Math.cos(t * 1.1) * span * 0.02;
    const rise = inSlip ? smooth(clamp((slipLin - 0.40) / 0.50, 0, 1)) : 0;
    ox = mix(ox, sx(BURY_U), rise); oy = mix(oy, rexSurfY(BURY_U) + H * 0.03, rise);

    /* phases */
    const grip = inSlip ? mix(0.35, 0, smooth(clamp(slipLin / 0.40, 0, 1))) : mix(1, 0.35, deepLin);
    const bind = inSlip ? smooth(clamp(slipLin / 0.40, 0, 1)) : 0;
    const grow = clamp((deepLin - 0.22) / 0.60, 0, 1);
    const ex = sx(BURY_U), ey = rexSurfY(BURY_U) + H * 0.08;

    /* gods */
    const gods = [];
    for (let i = 0; i < SIEGE_GODS.length; i++) {
      const g = SIEGE_GODS[i];
      const desc = smooth(clamp((deepLin - i * 0.04) / 0.30, 0, 1));
      const ga = g.ang + t * 0.22 + Math.sin(t * 0.4 + g.ph) * 0.3;
      const R = mix(span * (0.30 + 0.04 * Math.sin(t * 0.5 + g.ph)), span * 0.44, bind);
      const ringX = dx + Math.cos(ga) * R * 1.3, ringY = dy + Math.sin(ga) * R * 0.85;
      const strike = Math.pow(Math.max(0, Math.sin(t * 1.7 + g.ph)), 6) * (1 - bind) * desc;
      const gx = mix(ex, mix(ringX, ox, strike * 0.88), desc), gy = mix(ey, mix(ringY, oy, strike * 0.88), desc);
      gods.push({ g, gx, gy, amt: clamp(desc * 3, 0, 1), strike });
    }

    /* brothers */
    for (let i = 0; i < brothers.length; i++) {
      const b = brothers[i];
      if (b.born > grow) continue;
      const appear = clamp((grow - b.born) / 0.08, 0, 1);
      const edgeX = dx + Math.cos(b.ang) * W * 0.36, edgeY = dy + Math.sin(b.ang) * H * 0.30;
      const ba = b.ang + t * b.sp * 0.35, fr = span * (0.10 + b.rad * 0.27);
      const orbX = ox + Math.cos(ba) * fr * 1.3 + Math.sin(t * 3.1 + b.ph) * 4;
      const orbY = oy + Math.sin(ba) * fr * 0.85 + Math.cos(t * 2.7 + b.ph) * 4;
      const freeX = mix(edgeX, orbX, smooth(appear)), freeY = mix(edgeY, orbY, smooth(appear));
      const tg = gods[i % gods.length];
      const boundX = tg.gx + Math.cos(b.ph + t * 2.2 * b.sp) * span * 0.05, boundY = tg.gy + Math.sin(b.ph + t * 2.2 * b.sp) * span * 0.05;
      const bx = mix(freeX, boundX, bind), by = mix(freeY, boundY, bind);
      const al = clamp(appear * 2, 0, 1) * (0.6 + 0.4 * Math.sin(t * 5 + b.ph));
      if (al < 0.03) continue;
      const rgb = b.hue < 0.4 ? "150,20,60" : b.hue < 0.75 ? "120,40,140" : "90,12,18";
      ctx.globalCompositeOperation = "lighter";
      const glowR = b.size * 2.4;
      flatGlow(ctx, bx, by, glowR, rgb, al);
      ctx.globalCompositeOperation = "source-over";
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const ang = k * 1.2566 + t * b.sp;
        const r = b.size * (0.6 + 0.4 * Math.sin(t * 4 + b.ph + k * 1.7));
        const px = bx + Math.cos(ang) * r, py = by + Math.sin(ang) * r;
        k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(6,2,4,${0.9 * al})`;
      ctx.fill();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(${rgb},${0.85 * al})`;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    }

    /* gods draw */
    for (const e of gods) {
      drawTintBeam(ctx, e.gx, e.gy, ox, oy, e.g.rgb, e.strike * e.amt);
      if (e.strike > 0.8 && e.amt > 0.3 && clashCool <= 0 && Math.hypot(e.gx - ox, e.gy - oy) < span * 0.12) {
        flash = Math.max(flash, 0.5);
        shake = Math.max(shake, 0.5);
        clashCool = 0.14;
        rings.push({ x: (e.gx + ox) * 0.5, y: (e.gy + oy) * 0.5, r: 10, a: 1 });
      }
      drawOrb(ctx, e.gx, e.gy, e.amt, e.g.kind, 0.62);
    }

    /* Obrokxus and names */
    drawOrb(ctx, ox, oy, 1, "obrokxus");
    drawRexGrip(ctx, ox, oy, grip, span * 0.13);
    for (const e of gods) drawName(ctx, e.gx, e.gy, e.amt, e.g.name, 24);
    drawName(ctx, ox, oy, 1, "OBROKXUS", 34);
    drawRings(ctx);

    /* year counter */
    const years = inSlip ? 9000 + slipLin * 940 : deepLin * 9000;
    const n = Math.floor(years / 10) * 10;
    ctx.font = '500 11px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = `rgba(245,190,140,${0.7 * dive})`;
    ctx.fillText("YEAR " + n.toLocaleString("en-US"), W * 0.5, H * 0.08 + diveY);

    shake = Math.max(shake, 0.16 * dive);
    if (rise > 0.02 && rise < 0.98) shake = Math.max(shake, 0.35);
    ctx.restore();
  }

  function drawLiveWorld(ctx, amt) {
    if (amt < 0.01 || !window.World) return;
    const camX = thenCamX != null ? thenCamX : World.LAND.bridge;
    const mode = thenMode === "gamedev" ? "gamedev" : "void";
    ctx.save();
    ctx.globalAlpha = clamp(amt, 0, 1);
    World.draw(ctx, {
      W, H, camX, t, vel: 0,
      maxFling: 38000,
      chaos: mode === "void" ? World.chaosAt(camX) : 0,
      future: mode === "void" ? World.futureAt(camX) : 0,
      mode,
    });
    ctx.restore();
  }

  function draw(ctx, env) {
    if (!active) return;
    W = env.W; H = env.H;
    if (env.t != null) t = env.t;

    const sxh = shakeRX * shake * 12;
    const syh = shakeRY * shake * 9;
    ctx.save();
    ctx.translate(sxh, syh);

    const uDrawn = since("drawn");
    const uBreak = since("break");
    const uWalk  = since("walk");
    const uRoot  = since("root");
    const uSwarm = since("swarm");
    const uWomb  = since("womb");
    const uBirth = since("birth");
    const uFight = linear("fight");
    const uLand  = since("land");
    const uFlee  = since("flee");
    const uNow   = only("now");

    fillBg(ctx);
    const streak = uWalk * (1 - uRoot) * 52
      + uFlee * (1 - since("war")) * 70
      + since("eternity") * 84;
    drawMotes(ctx, clamp(uBreak * 0.55 + uWalk * 0.45 + uLand * 0.15 + uFlee * 0.2, 0, 1), streak);
    drawChaos(ctx, clamp((uBreak * 0.4 + uWalk * 0.55) * (1 - uLand * 0.7), 0, 1));

    const iDeep = idxOf("deep"), iSlip = idxOf("slip");
    let dive = 0;
    if (beat === iDeep) dive = smooth(clamp(linear("deep") / 0.30, 0, 1));
    else if (beat === iSlip) dive = 1 - smooth(clamp((linear("slip") - 0.45) / 0.55, 0, 1));
    const diveY = dive * DIVE_DEPTH * H;
    ctx.save();
    ctx.translate(0, -diveY);

    const uBreakLin = linear("break");
    const leave = smooth(clamp(uBreakLin * 3.2, 0, 1));
    const burst = smooth(clamp((uBreakLin - 0.22) / 0.45, 0, 1));
    const crack = leave * (1 - leave) * 4 * (1 - clamp(linear("walk") * 8, 0, 1));
    const pointVis = (beat > idxOf("point") ? 1 : mix(0.75, 1, linear("point"))) * (1 - leave);
    drawPoint(ctx, pointVis, crack);
    drawBridgeLine(ctx, uDrawn);

    const pain = 0.4 + uRoot * 0.2 + uSwarm * 1.15 * (1 - uWomb) + uWomb * 0.12;
    const approaching = clamp((cam - (ROOT_U - 0.95)) / 0.55, 0, 1);
    const fleshVis = approaching * (1 - uLand * 0.28);
    const flesh = drawFlesh(ctx, fleshVis, pain, uWomb);
    drawStains(ctx, flesh, uSwarm * (1 - uWomb) * fleshVis);
    const soulAmt = clamp((uRoot - 0.2) / 0.5, 0, 1) * mix(0.45, 1, uWomb) * (1 - uBirth * 0.55);
    drawSouls(ctx, flesh, soulAmt);

    const cling = clamp(uRoot * 0.25 + uSwarm * 0.9, 0, 1);
    const still = uWomb;
    const watch = clamp(uBirth * 0.4 + uFight, 0, 1);
    drawOldOnes(ctx, burst, uWalk, cling, still, watch, flesh);
    drawRip(ctx, flesh, clamp(uBirth * 2.6, 0, 1) * (1 - clamp((uBirth - 0.42) / 0.45, 0, 1)) * (1 - uFight));

    const L = lightsAt(uBirth, uFight, uLand, flesh);
    if (uBirth > 0.04 && beat < idxOf("gods")) {
      pushTrail(trailY, L.yx, L.yy);
      pushTrail(trailR, L.rx, L.ry);
      drawTrail(ctx, trailY, "245,138,52", L.yAmt);
      drawTrail(ctx, trailR, "90,12,18", L.rAmt, true);

      const dx = L.yx - L.rx, dy = L.yy - L.ry;
      const dist = Math.hypot(dx, dy);
      if (uFight > 0.05 && uLand < 0.15 && dist < 38 && clashCool <= 0 && L.wrap < 0.3) {
        flash = 1;
        shake = Math.max(shake, 0.95);
        clashCool = 0.26;
        rings.push({ x: (L.yx + L.rx) * 0.5, y: (L.yy + L.ry) * 0.5, r: 10, a: 1 });
      }
      const beamU = (uFight > 0.66 && uFight < 0.78) ? 1 - Math.abs(uFight - 0.72) / 0.12 : 0;
      drawBeam(ctx, L.yx, L.yy, L.rx, L.ry, beamU * Math.max(L.yAmt, L.rAmt));
      drawOrb(ctx, L.rx, L.ry, L.rAmt, "obrokxus");
      drawRexGrip(ctx, L.rx, L.ry, L.wrap * (1 - L.bury), Math.min(W, H) * mix(0.26, 0.11, L.wrap));
      drawOrb(ctx, L.yx, L.yy, L.yAmt, "rex");
      drawName(ctx, L.rx, L.ry, L.rAmt, "OBROKXUS", 34);
      drawName(ctx, L.yx, L.yy, L.yAmt, "REX", 30);
      drawRings(ctx);
    }
    drawGodsBirth(ctx, flesh);

    if (uFight > 0.08 && uLand < 0.2) shake = Math.max(shake, 0.22 + uFight * 0.2);
    if (uFight > 0.82 && uLand < 0.2) shake = Math.max(shake, 0.55 + (1 - L.yAmt) * 0.45);
    if (uBirth > 0.35 && uBirth < 0.95) shake = Math.max(shake, 0.32);
    if (uSwarm > 0.1 && uWomb < 0.2) shake = Math.max(shake, 0.18);

    const landRise = smooth(clamp(uLand / 0.9, 0, 1));
    /* inside Rex the depths paint opaque rock over everything below
       1.69 screen heights, so the land fill can stop just under that */
    const depthsOn = (beat === iDeep || beat === iSlip) && dive >= 0.001;
    drawRexLand(ctx, landRise, L.originX, L.originY, depthsOn ? H * 1.72 : null);
    drawBuried(ctx);
    drawDepths(ctx, dive, diveY);
    drawRexHole(ctx);
    drawSaga(ctx);
    ctx.restore();

    if (L.die > 0.02 && L.die < 0.55) {
      const p = 1 - Math.abs(L.die - 0.22) / 0.22;
      if (p > 0) {
        ctx.fillStyle = `rgba(40,4,8,${0.22 * p})`;
        ctx.fillRect(-20, -20, W + 40, H + 40);
      }
    }
    if (flash > 0.02) {
      ctx.fillStyle = `rgba(255,244,220,${0.18 * flash})`;
      ctx.fillRect(-20, -20, W + 40, H + 40);
    }

    ctx.restore();

    if (uNow > 0.001) {
      const fade = smooth(uNow);
      if (fade < 0.5) {
        ctx.fillStyle = `rgba(13,17,20,${fade / 0.5})`;
        ctx.fillRect(0, 0, W, H);
      } else {
        drawLiveWorld(ctx, 1);
        ctx.fillStyle = `rgba(13,17,20,${1 - (fade - 0.5) / 0.5})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
  }

  /* ---- input --------------------------------------------- */
  // attached in play(), removed in finish(): the page scrolls freely otherwise
  function holdPage(e) {
    if (!active) return;
    e.preventDefault();
  }

  if (overlay) {
    overlay.addEventListener("click", e => {
      if (e.target === skipEl) return;
      e.stopPropagation();
    });
    overlay.addEventListener("pointerdown", e => {
      if (e.target === skipEl) return;
      e.stopPropagation();
    });
  }
  if (skipEl) {
    skipEl.addEventListener("click", e => {
      e.stopPropagation();
      skip();
    });
  }
  if (trackEl) {
    trackEl.addEventListener("pointerdown", e => {
      if (!active) return;
      e.preventDefault();
      try { trackEl.setPointerCapture(e.pointerId); } catch (err) {}
      seekFromPointer(e);
    });
    trackEl.addEventListener("pointermove", e => {
      if (!active || !trackEl.hasPointerCapture(e.pointerId)) return;
      seekFromPointer(e);
    });
  }
  if (prevEl) prevEl.addEventListener("click", e => { e.stopPropagation(); stepBeat(-1); });
  if (nextEl) nextEl.addEventListener("click", e => { e.stopPropagation(); stepBeat(1); });
  addEventListener("keydown", e => {
    if (!active) return;
    if (e.key === "Escape") { e.preventDefault(); skip(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); stepBeat(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); stepBeat(1); }
  }, true);

  document.addEventListener("site:enter", e => {
    const d = e.detail || {};
    if (active) return;
    if (FORCE) {
      setTimeout(() => { if (!active) play({ thenMode: "void" }); }, 80);
      return;
    }
    // autoplay only when Setting is picked at the gate
    if (d.entry === "gate" && d.mode === "void" && pending())
      play({ thenMode: "void" });
  });

  return {
    get active() { return active; },
    get pending() { return pending(); },
    play, skip, seek, step, draw,
  };
})();
