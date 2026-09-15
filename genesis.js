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
  const FORCE = /(?:[?&])genesis(?:=1)?(?:&|$)/.test(location.search);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const overlay = document.getElementById("genesis");
  const tagEl   = document.getElementById("genesis-tag");
  const lineEl  = document.getElementById("genesis-line");
  const copyEl  = overlay && overlay.querySelector(".genesis-copy");
  const ticksEl = document.getElementById("genesis-ticks");
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
      line: "Two lights tore out of it: Obrokxus, already wrong — and Rex, yellow as a new star." },
    { id: "fight", dur: 8.2, tag: "obrokxus · rex",
      line: "They met in the void. Rex broke." },
    { id: "land",  dur: 7.0, tag: "rex the surface",
      line: "His body cooled into ground. They called that ground Rex the Surface." },
    { id: "flee", dur: 11.6, tag: "obrokxus flees",
      line: "Obrokxus ran west. Two lights followed: Ormius, law in gold-red — and Ava, pale as a healing wound." },
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
  const FLEE_CAM_RATE = 2.20;
  const ET_CAM_RATE   = 2.60;
  const KINDS  = ["spindle", "cluster", "crawler", "shard", "ring", "blob", "spindle", "crawler"];
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
    { fill: ["#39485a", "#26313d"], edge: "rgba(178,204,214,0.30)",
      amp: 0.062, base: 0.30, seed: 1201, drift: 0.16, rampAt: 0.52, climb: 0.34 },
    { fill: ["#2b3742", "#1c242d"], edge: "rgba(172,198,208,0.38)",
      amp: 0.078, base: 0.18, seed: 3307, drift: 0.13, rampAt: 0.58, climb: 0.28 },
    { fill: ["#233039", "#2a2320"], edge: "rgba(186,208,214,0.55)",
      amp: 0.095, base: 0.07, seed: 5501, drift: 0.10, rampAt: 0.64, climb: 0.22 },
  ];
  const REX_WEST = ROOT_U - 0.98;
  const REX_EAST = ROOT_U - 0.02;

  const mulberry = a => () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let x = Math.imul(a ^ a >>> 15, 1 | a);
    x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  };
  function hash1(n) {
    n = (n ^ 61) ^ (n >>> 16);
    n = n + (n << 3); n = n ^ (n >>> 4);
    n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15);
    return (n >>> 0) / 4294967296;
  }
  const smooth = u => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
  const clamp  = (n, a, b) => Math.min(b, Math.max(a, n));
  const mix    = (a, b, u) => a + (b - a) * u;
  const approach = (cur, tgt, rate, dt) => cur + (tgt - cur) * Math.min(1, dt * rate);
  function vnoise(x, seed) {
    const i = Math.floor(x), f = x - i;
    const a = hash1((i * 73856093) ^ seed);
    const b = hash1(((i + 1) * 73856093) ^ seed);
    return a + (b - a) * (f * f * (3 - 2 * f));
  }
  function ridge(x, seed) {
    return vnoise(x, seed) * 0.55 + vnoise(x * 2.3, seed + 17) * 0.3
         + vnoise(x * 5.1, seed + 91) * 0.15;
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
      fill: ["#232c35", "#141b21"], edge: "rgba(178,204,214,0.14)" },
    { base: 0.172, amp: 0.052, seed: 6203, cell: 6.1, shear: 2.4, out: 0.05,
      fill: ["#1c242b", "#11171c"], edge: "rgba(178,204,214,0.18)" },
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

  const motes = [], oldones = [], souls = [], troops = [];
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
    const ph = p * 5.6;
    const cu = duelDrift(p) + Math.sin(ph * 0.83) * 0.030;
    const cy = H * 0.36 + Math.sin(ph * 0.61) * span * 0.050;
    const half = 0.132 + Math.sin(ph * 1.27) * 0.112;
    const swing = Math.sin(ph * 1.9) * span * 0.070;
    return { ou: cu - half, oy: cy - swing, mu: cu + half, my: cy + swing };
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
    if (!ticksEl) return;
    let bar = ticksEl.querySelector(".genesis-prog");
    if (!bar) {
      ticksEl.innerHTML = '<span class="genesis-prog"><i></i></span>';
      bar = ticksEl.querySelector(".genesis-prog");
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
    }
    if (BEATS[beat] && BEATS[beat].id === "eternity") {
      trailR.length = 0;
      trailM.length = 0;
      trailA.length = 0;
      trailH.length = 0;
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
    rings.length = 0;
    flash = 0;
    clashCool = 0;
  }

  function finish() {
    if (!active) return;
    active = false;
    remember();
    if (overlay) {
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");
    }
    if (tagEl) tagEl.textContent = "";
    if (lineEl) lineEl.textContent = "";
    document.documentElement.classList.remove("genesis-on");
    if (host) host.classList.remove("genesis");
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
    if (host) host.classList.add("genesis");
    try { scrollTo(0, 0); } catch (e) {}
    const jump = /[?&]gbeat=([a-z]+)/.exec(location.search);
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

  function step(dt) {
    if (!active) return false;
    t += dt;
    local += dt;
    shake = Math.max(0, shake - dt * 3.6);
    flash = Math.max(0, flash - dt * 3.2);
    clashCool = Math.max(0, clashCool - dt);
    for (let i = rings.length - 1; i >= 0; i--) {
      rings[i].r += dt * 220;
      rings[i].a -= dt * 1.35;
      if (rings[i].a <= 0) rings.splice(i, 1);
    }
    try { if (scrollY !== 0) scrollTo(0, 0); } catch (e) {}

    const uWalk  = since("walk");
    const uRoot  = since("root");
    const uSwarm = since("swarm");
    const uWomb  = since("womb");
    const uBirth = since("birth");
    const uFight = since("fight");
    const uLand  = since("land");
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
      camTarget = duelDrift(etP) + duelCamLead(etP, camRateOverride);
    }
    else if (uRet > 0.02)
      camTarget = mix(MAIN_U - 0.04, CITY_U - 0.06, smooth(uRet));
    else if (uFall > 0.02)
      camTarget = mix(MAIN_U + 0.14, MAIN_U - 0.04, smooth(uFall));
    else if (uFifth > 0.02)
      camTarget = mix(MAIN_U + 0.16, NEST_U + 0.04, smooth(uFifth));
    else if (uFour > 0.02)
      camTarget = mix(MAIN_U + 0.02, MAIN_U + 0.20, smooth(uFour));
    else if (uLock > 0.02)
      camTarget = mix(MAIN_U - 0.10, MAIN_U + 0.04, smooth(uLock));
    else if (uStall > 0.02)
      camTarget = mix(MAIN_U + 0.08, MAIN_U - 0.08, smooth(uStall));
    else if (uWar > 0.02)
      /* starts exactly where the chase left the camera, so the pull
         back onto the battlefield is a move and not a cut */
      camTarget = mix(EAST_U + 0.16, MAIN_U + 0.10, smooth(uWar));
    else if (uFlee > 0) {
      /* framed on the three of them, not on a fixed sweep — the fixed
         sweep is what pushed the two chasers off the left edge */
      const fP = linear("flee");
      camTarget = chaseAt(fP).cam + chaseCamLead(fP);
    }
    else if (uWalk < 0.001) camTarget = 0;
    else if (uLand > 0.08)
      camTarget = mix(ROOT_U - 0.48, ROOT_U - 0.30, clamp((uLand - 0.08) / 0.7, 0, 1));
    else if (uFight > 0.02)
      camTarget = mix(ROOT_U - 0.22, ROOT_U - 0.50, clamp(uFight * 1.15, 0, 1));
    else if (uBirth > 0.02)
      camTarget = mix(ROOT_U - 0.16, ROOT_U - 0.22, uBirth);
    else if (uWomb > 0.02)
      camTarget = mix(ROOT_U - 0.18, ROOT_U - 0.16, uWomb);
    else if (uSwarm > 0.02)
      camTarget = mix(ROOT_U - 0.26, ROOT_U - 0.16, uSwarm);
    else if (uRoot > 0.02)
      camTarget = mix(ROOT_U - 0.32, ROOT_U - 0.26, uRoot);
    else
      camTarget = mix(0, ROOT_U - 0.32, clamp(uWalk, 0, 1));
    let camRate = 1.55;
    if (uWalk > 0.001 && uRoot < 0.02) camRate = 2.25;
    if (uFlee > 0 && uWar < 0.02) camRate = FLEE_CAM_RATE;
    if (camRateOverride != null) camRate = camRateOverride;
    cam = approach(cam, camTarget, camRate, dt);
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
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glow);
    g.addColorStop(0, `rgba(245,208,107,${0.55 + 0.25 * amt})`);
    g.addColorStop(0.35, `rgba(176,104,90,${0.18 * amt})`);
    g.addColorStop(1, "rgba(245,208,107,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - glow, cy - glow, glow * 2, glow * 2);

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

    const gl = ctx.createLinearGradient(0, deckY - 90, 0, deckY + 40);
    gl.addColorStop(0, "rgba(245,208,107,0)");
    gl.addColorStop(0.78, `rgba(245,208,107,${0.055 * grow})`);
    gl.addColorStop(1, "rgba(245,208,107,0)");
    ctx.fillStyle = gl;
    ctx.fillRect(x0 - 20, deckY - 90, (x1 - x0) + 40, 130);

    const first = Math.floor(startU / BAY_U) - 1;
    const last  = Math.ceil(endU / BAY_U) + 1;

    const lg = ctx.createLinearGradient(0, deckY, 0, legBot);
    lg.addColorStop(0, `rgba(150,168,178,${0.62 * grow})`);
    lg.addColorStop(0.28, `rgba(112,130,140,${0.30 * grow})`);
    lg.addColorStop(0.72, `rgba(86,102,112,${0.08 * grow})`);
    lg.addColorStop(1, "rgba(70,84,92,0)");
    ctx.fillStyle = lg;
    for (let b = first; b <= last; b++) {
      const x = sx(b * BAY_U);
      if (x < x0 - 8 || x > x1 + 8) continue;
      ctx.fillRect(x - legW / 2, deckY + deckH, legW, legBot - deckY - deckH);
    }
    ctx.strokeStyle = `rgba(132,150,159,${0.26 * grow})`;
    ctx.lineWidth = Math.max(0.8, legW * 0.55);
    for (let b = first; b <= last; b++) {
      const xa = sx(b * BAY_U);
      if (xa < x0 - bayPx || xa > x1 + 8) continue;
      ctx.beginPath();
      ctx.ellipse(xa + bayPx / 2, deckY + deckH + rise, bayPx / 2 - legW, rise, 0, Math.PI, 0);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
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

    const g = ctx.createRadialGradient(x, y, 0, x, y, s * 2.2);
    g.addColorStop(0, `rgba(${o.hue},0.22)`);
    g.addColorStop(1, `rgba(${o.hue},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, s * 2.2, 0, 6.283); ctx.fill();

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
      const g = ctx.createRadialGradient(x, y, 0, x, y, 18 + o.rr * 8);
      g.addColorStop(0, `rgba(${o.hue},${0.28 * amt})`);
      g.addColorStop(1, `rgba(${o.hue},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, 22 + o.rr * 6, 0, 6.283); ctx.fill();
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
    const breath = 0.5 + 0.5 * Math.sin(t * 0.34);

    const halo = ctx.createRadialGradient(cx, cy, rx * 0.2, cx, cy, rx * 2.1);
    halo.addColorStop(0, `rgba(150,30,32,${(0.16 + 0.1 * breath) * vis * (0.45 + pain * 0.4)})`);
    halo.addColorStop(1, "rgba(150,30,32,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(cx - rx * 2.2, cy - ry * 2.2, rx * 4.4, ry * 4.4);

    if (womb > 0.08) {
      const life = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx * 1.15);
      life.addColorStop(0, `rgba(245,208,107,${0.22 * womb * vis})`);
      life.addColorStop(0.45, `rgba(176,104,90,${0.12 * womb * vis})`);
      life.addColorStop(1, "rgba(245,208,107,0)");
      ctx.fillStyle = life;
      ctx.beginPath(); ctx.arc(cx, cy, rx * 1.15, 0, 6.283); ctx.fill();
    }

    fleshPath(ctx, cx, cy, rx, ry, pain, 1);
    const body = ctx.createLinearGradient(cx - rx, cy, cx + rx, cy);
    body.addColorStop(0, "#3a0b0f");
    body.addColorStop(0.5, womb > 0.4 ? "#6a2418" : "#5c1114");
    body.addColorStop(1, "#1d060a");
    ctx.fillStyle = body;
    ctx.globalAlpha = vis;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = `rgba(214,72,68,${(0.34 + 0.2 * breath) * vis * mix(1, 0.45, womb)})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 1;
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

    const die = smooth(clamp((uFight - 0.82) / 0.18 + uLand * 1.2, 0, 1));
    const groundY = H * DECK + 10;
    yy = mix(yy, groundY, die);
    yx = mix(yx, arenaX - span * 0.02, die);

    const recede = smooth(clamp((uLand - 0.02) / 0.45, 0, 1));
    rx = mix(rx, sx(REX_U - 0.18), recede);
    ry = mix(ry, H * 0.36, recede);

    return {
      yx, yy, rx, ry,
      yAmt: emerge * (1 - die),
      rAmt: emerge * (1 - recede * 0.12),
      originX: yx,
      originY: yy,
      die, recede,
    };
  }

  function pushTrail(list, x, y) {
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
      ctx.globalCompositeOperation = "lighter";
      const halo = ctx.createRadialGradient(x, y, 0, x, y, R * 3.4);
      halo.addColorStop(0, `rgba(255,244,210,${0.95 * amt})`);
      halo.addColorStop(0.18, `rgba(245,208,107,${0.8 * amt})`);
      halo.addColorStop(0.5, `rgba(176,104,90,${0.22 * amt})`);
      halo.addColorStop(1, "rgba(245,208,107,0)");
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(x, y, R * 3.4, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(255,248,230,${0.95 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.28, 0, 6.283); ctx.fill();
    } else if (kind === "ormius") {
      ctx.globalCompositeOperation = "lighter";
      const halo = ctx.createRadialGradient(x, y, 0, x, y, R * 4.2);
      halo.addColorStop(0, `rgba(255,236,200,${0.9 * amt})`);
      halo.addColorStop(0.16, `rgba(210,64,48,${0.72 * amt})`);
      halo.addColorStop(0.42, `rgba(150,22,24,${0.32 * amt})`);
      halo.addColorStop(1, "rgba(210,80,40,0)");
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(x, y, R * 4.2, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(160,24,28,${0.88 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.7, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(255,244,220,${0.95 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.22, 0, 6.283); ctx.fill();
    } else if (kind === "ava") {
      ctx.globalCompositeOperation = "lighter";
      const halo = ctx.createRadialGradient(x, y, 0, x, y, R * 3.8);
      halo.addColorStop(0, `rgba(230,255,236,${0.9 * amt})`);
      halo.addColorStop(0.2, `rgba(168,214,178,${0.7 * amt})`);
      halo.addColorStop(0.55, `rgba(90,140,110,${0.2 * amt})`);
      halo.addColorStop(1, "rgba(168,214,178,0)");
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(x, y, R * 3.8, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(236,255,242,${0.95 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.26, 0, 6.283); ctx.fill();
    } else if (kind === "mordrial") {
      const smoke = ctx.createRadialGradient(x, y, 0, x, y, R * 4.6);
      smoke.addColorStop(0, `rgba(40,18,28,${0.9 * amt})`);
      smoke.addColorStop(0.28, `rgba(120,70,40,${0.4 * amt})`);
      smoke.addColorStop(0.55, `rgba(170,200,180,${0.18 * amt})`);
      smoke.addColorStop(1, "rgba(20,8,10,0)");
      ctx.fillStyle = smoke;
      ctx.beginPath(); ctx.arc(x, y, R * 4.6, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(18,8,12,${0.94 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.7, 0, 6.283); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, R * 0.7, 0, 6.283); ctx.clip();
      ctx.fillStyle = `rgba(212,168,90,${0.7 * amt})`;
      ctx.fillRect(x - R, y - R, R, R * 2);
      ctx.fillStyle = `rgba(186,214,198,${0.7 * amt})`;
      ctx.fillRect(x, y - R, R, R * 2);
      ctx.restore();
      ctx.fillStyle = `rgba(255,236,200,${0.75 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.16, 0, 6.283); ctx.fill();
    } else if (kind === "cadmus") {
      ctx.globalCompositeOperation = "lighter";
      const halo = ctx.createRadialGradient(x, y, 0, x, y, R * 3.6);
      halo.addColorStop(0, `rgba(255,220,150,${0.88 * amt})`);
      halo.addColorStop(0.3, `rgba(196,140,48,${0.55 * amt})`);
      halo.addColorStop(1, "rgba(196,140,48,0)");
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(x, y, R * 3.6, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(255,232,170,${0.95 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.24, 0, 6.283); ctx.fill();
    } else if (kind === "aelius") {
      ctx.globalCompositeOperation = "lighter";
      const halo = ctx.createRadialGradient(x, y, 0, x, y, R * 3.9);
      halo.addColorStop(0, `rgba(240,255,246,${0.9 * amt})`);
      halo.addColorStop(0.22, `rgba(186,224,198,${0.6 * amt})`);
      halo.addColorStop(1, "rgba(186,224,198,0)");
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(x, y, R * 3.9, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(250,255,252,${0.95 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.22, 0, 6.283); ctx.fill();
    } else if (kind === "velindra") {
      ctx.globalCompositeOperation = "lighter";
      const halo = ctx.createRadialGradient(x, y, 0, x, y, R * 3.7);
      halo.addColorStop(0, `rgba(220,170,255,${0.55 * amt})`);
      halo.addColorStop(0.25, `rgba(70,180,170,${0.5 * amt})`);
      halo.addColorStop(1, "rgba(70,180,170,0)");
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(x, y, R * 3.7, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(210,255,248,${0.9 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.2, 0, 6.283); ctx.fill();
    } else if (kind === "hound") {
      const smokeR = R * 2.8;
      const smoke = ctx.createRadialGradient(x, y, 0, x, y, smokeR);
      smoke.addColorStop(0, `rgba(50,4,8,${0.95 * amt})`);
      smoke.addColorStop(0.22, `rgba(110,10,16,${0.5 * amt})`);
      smoke.addColorStop(0.55, `rgba(30,2,4,${0.22 * amt})`);
      smoke.addColorStop(1, "rgba(8,0,2,0)");
      ctx.fillStyle = smoke;
      ctx.beginPath(); ctx.arc(x, y, smokeR, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(16,2,4,${0.96 * amt})`;
      ctx.beginPath();
      ctx.ellipse(x, y, R * 0.85, R * 0.62, Math.sin(t * 1.3) * 0.12, 0, 6.283);
      ctx.fill();
      ctx.strokeStyle = `rgba(180,24,32,${0.7 * amt})`;
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      for (let i = 0; i < 7; i++) {
        const ang = t * 0.4 + i * (6.283 / 7);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang) * R * 0.35, y + Math.sin(ang) * R * 0.28);
        ctx.lineTo(x + Math.cos(ang) * R * 0.95, y + Math.sin(ang) * R * 0.72);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(210,36,40,${0.55 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.18, 0, 6.283); ctx.fill();
    } else {
      const smokeR = R * 2.45;
      const smoke = ctx.createRadialGradient(x, y, 0, x, y, smokeR);
      smoke.addColorStop(0, `rgba(70,6,10,${0.92 * amt})`);
      smoke.addColorStop(0.18, `rgba(120,12,18,${0.55 * amt})`);
      smoke.addColorStop(0.45, `rgba(40,4,8,${0.28 * amt})`);
      smoke.addColorStop(1, "rgba(8,0,2,0)");
      ctx.fillStyle = smoke;
      ctx.beginPath(); ctx.arc(x, y, smokeR, 0, 6.283); ctx.fill();
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

  function drawRexKeeps(ctx, rise, originY) {
    const a = clamp((rise - 0.40) / 0.30, 0, 1);
    if (a < 0.04) return;
    const b = REX_BANDS[0];
    const s = Math.max(0.48, Math.min(1.05, W / 1400)) * mix(0.62, 1, a);
    const surfY = wu => mix(originY, H * 1.16 - rexLandHeight(wu, b) * H, rise);
    const onTop = y => y > H * 0.04 && y < H * 0.82;
    ctx.save();
    ctx.globalAlpha = a;

    function crenel(x, y, w, step, riseH) {
      const n = Math.max(2, Math.floor(w / step));
      const sw = w / n;
      for (let i = 0; i < n; i++) if (i % 2 === 0)
        ctx.fillRect(x + i * sw, y - riseH, sw * 0.92, riseH);
    }

    const bru = mix(REX_WEST, REX_EAST, 0.40);
    const bx0 = sx(bru);
    const bbase = surfY(bru);
    if (onTop(bbase) && bx0 > -220 && bx0 < W + 220) {
      const stone = "#a8b0aa", mortar = "#6e7872", shade = "#8e9791", warm = "#f5d06b";
      function brickBlock(cx, w, h) {
        const x = cx - w / 2, y = bbase - h;
        ctx.fillStyle = stone; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = shade; ctx.fillRect(x + w * 0.72, y, w * 0.28, h);
        ctx.strokeStyle = mortar;
        ctx.lineWidth = Math.max(1, s * 0.7);
        const rows = Math.max(3, Math.floor(h / (10 * s)));
        for (let ri = 1; ri < rows; ri++) {
          const yy = y + (h * ri) / rows;
          ctx.beginPath(); ctx.moveTo(x + 1, yy); ctx.lineTo(x + w - 1, yy); ctx.stroke();
        }
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(232,236,232,0.55)";
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        crenel(x, y, w, Math.max(8, 14 * s), Math.max(4, 8 * s));
        ctx.fillStyle = stone;
      }
      const keepW = 150 * s, keepH = 118 * s;
      brickBlock(bx0, keepW, keepH);
      brickBlock(bx0 - 92 * s, 52 * s, 152 * s);
      brickBlock(bx0 + 92 * s, 52 * s, 152 * s);
      const gw = 34 * s, gh = 48 * s;
      ctx.fillStyle = "#3a4340";
      ctx.fillRect(bx0 - gw / 2, bbase - gh, gw, gh);
      ctx.strokeStyle = "rgba(245,208,107,0.35)";
      ctx.strokeRect(bx0 - gw / 2 + 0.5, bbase - gh + 0.5, gw - 1, gh - 1);
      ctx.fillStyle = warm; ctx.globalAlpha = a * 0.55;
      ctx.fillRect(bx0 - keepW * 0.22, bbase - keepH * 0.72, Math.max(2, 5 * s), Math.max(3, 8 * s));
      ctx.fillRect(bx0 + keepW * 0.12, bbase - keepH * 0.62, Math.max(2, 5 * s), Math.max(3, 8 * s));
      ctx.globalAlpha = a;
    }

    const dru = mix(REX_WEST, REX_EAST, 0.62);
    const dx0 = sx(dru);
    const dbase = surfY(dru);
    if (onTop(dbase) && dx0 > -240 && dx0 < W + 240) {
      const body = "#1e1822", rim = "rgba(214,220,218,0.7)", slit = "#c45a52";
      const bw = 120 * s, bh = 140 * s;
      ctx.fillStyle = body;
      ctx.fillRect(dx0 - bw / 2, dbase - bh, bw, bh);
      ctx.strokeStyle = rim;
      ctx.lineWidth = Math.max(1.2, s * 1.1);
      ctx.strokeRect(dx0 - bw / 2 + 0.5, dbase - bh + 0.5, bw - 1, bh - 1);
      const towers = [
        { dx: -78, w: 28, h: 175, spire: 38 },
        { dx: -28, w: 22, h: 155, spire: 30 },
        { dx:  28, w: 22, h: 165, spire: 34 },
        { dx:  78, w: 30, h: 190, spire: 46 },
        { dx:   0, w: 36, h: 210, spire: 58 },
      ];
      for (const tw of towers) {
        const twx = dx0 + tw.dx * s;
        const twW = tw.w * s, twH = tw.h * s, sp = tw.spire * s;
        const x = twx - twW / 2, y = dbase - twH;
        ctx.fillStyle = body;
        ctx.fillRect(x, y, twW, twH);
        ctx.beginPath();
        ctx.moveTo(x - 2 * s, y);
        ctx.lineTo(twx, y - sp);
        ctx.lineTo(x + twW + 2 * s, y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = rim;
        ctx.beginPath();
        ctx.moveTo(x - 2 * s, y);
        ctx.lineTo(twx, y - sp);
        ctx.lineTo(x + twW + 2 * s, y);
        ctx.stroke();
        ctx.strokeRect(x + 0.5, y + 0.5, twW - 1, twH - 1);
        const pulse = 0.45 + 0.55 * Math.sin(t * 1.2 + tw.dx * 0.02);
        ctx.fillStyle = slit;
        ctx.globalAlpha = a * (0.35 + 0.45 * pulse);
        ctx.fillRect(twx - twW * 0.18, y + twH * 0.22, Math.max(1.5, twW * 0.22), Math.max(4, twH * 0.12));
        ctx.fillRect(twx - twW * 0.18, y + twH * 0.48, Math.max(1.5, twW * 0.22), Math.max(4, twH * 0.1));
        ctx.globalAlpha = a;
      }
      ctx.fillStyle = slit; ctx.globalAlpha = a * 0.5;
      ctx.fillRect(dx0 - bw * 0.28, dbase - bh * 0.7, Math.max(2, 4 * s), Math.max(5, 10 * s));
      ctx.fillRect(dx0 + bw * 0.12, dbase - bh * 0.55, Math.max(2, 4 * s), Math.max(5, 10 * s));
      ctx.globalAlpha = a;
      ctx.lineWidth = 1;
    }
    ctx.restore();
  }

  function drawRexLand(ctx, rise, originX, originY) {
    if (rise < 0.02) return;
    const lock = smooth(clamp((rise - 0.18) / 0.5, 0, 1));
    const xC = mix(originX, sx(mix(REX_WEST, REX_EAST, 0.72)), lock);
    const yC = mix(originY, H * 1.16, rise);
    const x0 = sx(REX_WEST) - 36;
    const x1 = sx(REX_EAST) + 80;
    if (x1 < -80 || x0 > W + 80) return;
    const bottom = H + 80;
    const baseY = H * 1.16;
    const step = 6;
    for (let bi = 0; bi < REX_BANDS.length; bi++) {
      const b = REX_BANDS[bi];
      const widen = (2 - bi) * 0.05;
      const pts = [];
      const left = Math.max(-56, sx(REX_WEST - widen) - 10);
      const right = Math.min(W + 80, sx(REX_EAST + 0.22 + widen * 0.15) + 10);
      for (let px = left; px <= right; px += step) {
        const wu = cam + (px - W * 0.5) / W;
        const h = rexLandHeight(wu, b);
        pts.push([px, mix(yC, baseY - h * H, rise)]);
      }
      if (pts.length < 2) continue;
      const path = new Path2D();
      path.moveTo(pts[0][0], bottom);
      for (const p of pts) path.lineTo(p[0], p[1]);
      path.lineTo(pts[pts.length - 1][0], bottom);
      path.closePath();
      const g = ctx.createLinearGradient(0, H * 0.08, 0, bottom);
      g.addColorStop(0, b.fill[0]);
      g.addColorStop(1, b.fill[1]);
      ctx.globalAlpha = rise;
      ctx.fillStyle = g;
      ctx.fill(path);
      ctx.strokeStyle = b.edge;
      ctx.lineWidth = bi === 2 ? 1.5 : 1.2;
      ctx.beginPath();
      let drawing = false;
      for (const p of pts) {
        if (p[1] > H + 8) { drawing = false; continue; }
        drawing ? ctx.lineTo(p[0], p[1]) : (ctx.moveTo(p[0], p[1]), drawing = true);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    drawRexKeeps(ctx, rise, originY);
    if (rise > 0.12 && rise < 0.92) {
      const glint = (1 - Math.abs(rise - 0.42) / 0.42) * (1 - rise * 0.35);
      if (glint > 0.02) {
        const g = ctx.createRadialGradient(xC, yC, 0, xC, yC, 80 + rise * 120);
        g.addColorStop(0, `rgba(245,208,107,${0.38 * glint})`);
        g.addColorStop(0.4, `rgba(245,208,107,${0.08 * glint})`);
        g.addColorStop(1, "rgba(245,208,107,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(xC, yC, 80 + rise * 120, 0, 6.283); ctx.fill();
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

    /* ---- the chase, and the flank that ends it -----------------
       Obrokxus is in front the whole way west and the two lights are
       behind him, because their positions ARE his position plus a
       gap. When the land comes up under them they do not walk past
       him on the ground: they cut up and over him and come down on
       the far side — the side their own city and their own armies
       (seraphin, malgrur) are on, with his (vorgath) left on his. */
    const C = chaseAt(fleeLin);
    let ou = C.ou, oy = yWob(0.2, 0.026), oAmt = 0;
    if (et > 0) {
      const D = duelAt(etLin);
      ou = D.ou;
      oy = D.oy;
      oAmt = mix(0, 0.84, smooth(clamp(etLin / 0.18, 0, 1)));
    } else if (ret > 0) {
      oAmt = 0;
    } else if (fall > 0) {
      const fk = keyAt(RED_KEYS, fall);
      ou = mix(EAST_U, MAIN_U - 0.14, fallIn) + fk.x * 0.13 * fallIn;
      oy = mix(yWob(0.2, 0.022), H * 0.36 + fk.y * span * 0.18, fallIn);
      oAmt = mix(1, 0, clamp((fall - 0.78) / 0.22, 0, 1));
    } else if (flee > 0) {
      oAmt = 1;
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

    let au = C.au;
    let ay = yWob(2.6, 0.018) + H * 0.04, aAmt = 0;
    if (et > 0) {
      aAmt = 0;
    } else if (ret > 0) {
      aAmt = 0;
    } else if (fleeLin > 0.06) {
      aAmt = clamp((fleeLin - 0.06) / 0.10, 0, 1) * (1 - godsOut);
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

    const born = clamp((lock - 0.42) / 0.40, 0, 1);
    const dieM = smooth(clamp((fall - 0.76) / 0.20, 0, 1));
    let mdU = mix(MAIN_U + 0.02, MAIN_U + 0.14, four);
    let mdY = gy(0.10, mdU);
    let mdAmt = born * (1 - dieM);
    if (fifth > 0) {
      mdU = mix(MAIN_U + 0.14, MAIN_U + 0.04, fifth);
      mdY = gy(0.08, mdU);
    }
    if (fall > 0) {
      const yk = keyAt(YELLOW_KEYS, fall);
      mdU = mix(MAIN_U + 0.04, MAIN_U + 0.06 + yk.x * 0.11, fallIn);
      mdY = mix(gy(0.08, mdU),
                mix(gy(0.06, mdU) + yk.y * span * 0.10,
                    mainSurfY(mdU, mainRise, scar) + 26, dieM), fallIn);
    }
    if (ret > 0) mdAmt = 0;

    const slot = (start) => clamp((four - start) / 0.22, 0, 1);
    let cU = mix(MAIN_U + 0.24, NEST_U + 0.16, fifth);
    let cAmt = slot(0.12);
    let aelU = mix(MAIN_U + 0.32, MAIN_U + 0.22, fallIn);
    let aelY = gy(mix(0.02, 0.00, fallIn), aelU);
    let aelAmt = slot(0.36);
    let vU = mix(MAIN_U + 0.17, MAIN_U + 0.10, fallIn);
    let vY = gy(mix(0.20, 0.22, fallIn), vU);
    let vAmt = slot(0.58);
    let cLane = mix(0.14, 0.06, fifth);
    if (fall > 0) {
      cU = mix(NEST_U + 0.16, MAIN_U - 0.08, fallIn);
      cLane = mix(0.06, 0.12, fallIn);
    }
    let cY = gy(cLane, cU);
    if (ret > 0) {
      /* they walk west into the city they are about to disappear into */
      const home = smooth(clamp(ret / 0.85, 0, 1));
      const fadeHome = mix(1, 0.10, clamp((ret - 0.45) / 0.55, 0, 1));
      cU = mix(MAIN_U - 0.08, CITY_U + 0.13, home);
      aelU = mix(MAIN_U + 0.22, CITY_U + 0.34, home);
      vU = mix(MAIN_U + 0.10, CITY_U - 0.08, home);
      cY = gy(0.10, cU);
      aelY = gy(0.02, aelU);
      vY = gy(0.20, vU);
      cAmt *= fadeHome;
      aelAmt *= fadeHome;
      vAmt *= fadeHome;
    }

    const nestU = NEST_U;
    const nestAmt = fifth > 0
      ? mix(0.25, 1, clamp(fifth * 2.4, 0, 1)) * (1 - clamp((fifth - 0.58) / 0.38, 0, 1))
      : 0;
    const houndBorn = clamp((fifth - 0.50) / 0.34, 0, 1);
    let hU = mix(nestU, MAIN_U - 0.18, fallIn);
    let hY = gy(mix(-0.04, -0.06, fallIn), hU);
    let hAmt = houndBorn;
    if (ret > 0) {
      hU = mix(MAIN_U - 0.18, CITY_U - 0.28, smooth(clamp(ret / 0.85, 0, 1)));
      hY = gy(-0.06, hU);
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

    /* the two ranges behind, first */
    for (const b of MAIN_BANDS) {
      const pts = [];
      for (let px = left; px <= right; px += step) {
        const wu = cam + (px - W * 0.5) / W;
        const dome = mainDome(wu);
        const y = dome > 0.002
          ? deckY - mainBandHeight(wu, b) * H
          : rimY(wu, b.shear, b.out, b.seed);
        if (y > H + 120) continue;
        pts.push([px, mix(H + 24, y, rise)]);
      }
      if (pts.length < 3) continue;
      const p = new Path2D();
      p.moveTo(pts[0][0], bottom);
      for (const q of pts) p.lineTo(q[0], q[1]);
      p.lineTo(pts[pts.length - 1][0], bottom);
      p.closePath();
      const g = ctx.createLinearGradient(0, deckY - H * 0.28, 0, bottom);
      g.addColorStop(0, b.fill[0]);
      g.addColorStop(1, b.fill[1]);
      ctx.globalAlpha = rise;
      ctx.fillStyle = g;
      ctx.fill(p);
      ctx.strokeStyle = b.edge;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      let drawing = false;
      for (const q of pts) {
        if (q[1] > H + 8) { drawing = false; continue; }
        drawing ? ctx.lineTo(q[0], q[1]) : (ctx.moveTo(q[0], q[1]), drawing = true);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /* the near range, the one everything stands on */
    const top = [];
    for (let px = left; px <= right; px += step) {
      const wu = cam + (px - W * 0.5) / W;
      const dome = mainDome(wu);
      const y = dome > 0.002 ? H * DECK - mainHeight(wu, scar) * H : rimY(wu, 2.9, 0, 7703);
      if (y > H + 120) continue;
      top.push([px, mix(H + 28, y, rise)]);
    }
    if (top.length < 3) return;

    const path = new Path2D();
    path.moveTo(top[0][0], bottom);
    for (const p of top) path.lineTo(p[0], p[1]);
    path.lineTo(top[top.length - 1][0], bottom);
    path.closePath();

    const g = ctx.createLinearGradient(0, deckY - H * 0.20, 0, bottom);
    g.addColorStop(0, "#1a222a");
    g.addColorStop(0.45, "#141b21");
    g.addColorStop(1, "#0c1216");
    ctx.globalAlpha = rise;
    ctx.fillStyle = g;
    ctx.fill(path);

    /* the war's red, laid over the east and lifting when it ends */
    if (corrupt > 0.02) {
      const tint = ctx.createLinearGradient(sx(MAIN_U - 0.22), 0, xR, 0);
      tint.addColorStop(0, "rgba(96,10,14,0)");
      tint.addColorStop(0.55, `rgba(96,10,14,${0.26 * corrupt})`);
      tint.addColorStop(1, `rgba(110,12,16,${0.46 * corrupt})`);
      ctx.fillStyle = tint;
      ctx.fill(path);
    }

    /* a few strata following the surface, fading out with depth,
       so the body reads as rock rather than a filled shape */
    ctx.save();
    ctx.clip(path);
    for (let k = 1; k <= 5; k++) {
      const drop = k * H * 0.052;
      const a = (0.10 - k * 0.014) * rise;
      if (a <= 0.004) break;
      ctx.strokeStyle = `rgba(176,200,208,${a})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      let on = false;
      for (const p of top) {
        const y = p[1] + drop + (ridge(p[0] * 0.012 + k, 9109 + k * 31) - 0.5) * 16;
        if (y > H + 8) { on = false; continue; }
        on ? ctx.lineTo(p[0], y) : (ctx.moveTo(p[0], y), on = true);
      }
      ctx.stroke();
    }
    ctx.restore();

    const edge = ctx.createLinearGradient(xL, 0, xR, 0);
    edge.addColorStop(0, "rgba(186,208,214,0.26)");
    edge.addColorStop(0.5, "rgba(186,208,214,0.24)");
    edge.addColorStop(1, `rgba(${Math.round(mix(186, 170, corrupt))},${Math.round(mix(208, 44, corrupt))},${Math.round(mix(214, 48, corrupt))},${0.26 + 0.20 * corrupt})`);
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    let drawing = false;
    for (const p of top) {
      if (p[1] > H + 8) { drawing = false; continue; }
      drawing ? ctx.lineTo(p[0], p[1]) : (ctx.moveTo(p[0], p[1]), drawing = true);
    }
    ctx.stroke();
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
        ctx.beginPath();
        ctx.moveTo(x - tw * 0.58, y + 4);
        const n = sp.teeth.length;
        for (let i = 0; i < n; i++) {
          const u = (i + 0.55) / (n + 1);
          const jag = (sp.teeth[i] - 0.5) * tw * 0.42;
          ctx.lineTo(
            x - tw * 0.42 * (1 - u) + lean * u + jag,
            y - th * Math.pow(u, 0.62) * (0.35 + 0.65 * u) * pulse
          );
        }
        ctx.lineTo(x + lean, y - th * pulse);
        for (let i = n - 1; i >= 0; i--) {
          const u = (i + 0.55) / (n + 1);
          const jag = (sp.teeth[i] - 0.5) * tw * 0.34;
          ctx.lineTo(
            x + tw * 0.40 * (1 - u) + lean * u + jag,
            y - th * Math.pow(u, 0.66) * (0.32 + 0.68 * u) * pulse
          );
        }
        ctx.lineTo(x + tw * 0.52, y + 4);
        ctx.closePath();
        const sg = ctx.createLinearGradient(x, y - th, x, y);
        sg.addColorStop(0, `rgba(${sp.shade < 0.4 ? 70 : 110},8,10,${0.92 * rise})`);
        sg.addColorStop(0.55, `rgba(42,6,8,${0.96 * rise})`);
        sg.addColorStop(1, `rgba(18,4,6,${0.9 * rise})`);
        ctx.fillStyle = sg;
        ctx.fill();
        ctx.strokeStyle = `rgba(160,24,28,${0.35 * grow * rise})`;
        ctx.lineWidth = 1.05;
        ctx.stroke();
      }
    }
  }

  function drawCity(ctx, S) {
    const amt = S && S.civAmt;
    if (!amt || amt < 0.03) return;
    const rise = S.mainRise || 1;
    const scar = S.scar || 0;
    const bands = [
      { list: cityFar,  fill: "#161d21", alpha: 0.55 },
      { list: cityMid,  fill: "#182025", alpha: 0.78 },
      { list: cityNear, fill: "#1b2327", alpha: 1 },
    ];
    for (const band of bands) {
      ctx.globalAlpha = amt * rise * band.alpha;
      ctx.fillStyle = band.fill;
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
        ctx.fillRect(x - w * 0.5, floor - h, w, h);
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "#1b2327";
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
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad * 3.2);
    g.addColorStop(0, `rgba(${rgb},${0.95 * a})`);
    g.addColorStop(0.4, `rgba(${rgb},${0.32 * a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, rad * 3.2, 0, 6.283); ctx.fill();
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
      const toward = (c.kind === "vorgath" ? push * c.reach : -push * c.reach) * motion;
      const u = MAIN_U + c.home + toward + Math.sin(t * (0.7 + c.gait) + c.ph) * 0.018 * motion;
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
    const g = ctx.createRadialGradient(x, y, 0, x, y, R * 2.4);
    g.addColorStop(0, `rgba(8,0,1,${0.96 * S.nestAmt})`);
    g.addColorStop(0.35, `rgba(50,6,8,${0.45 * S.nestAmt})`);
    g.addColorStop(1, "rgba(8,0,2,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, R * 2.1, R * 0.42, 0, 0, 6.283); ctx.fill();
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
    if (x < -80 || x > W + 80) return;
    const a = clamp((amt - 0.12) / 0.35, 0, 1) * 0.72;
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
    if (S.aAmt > 0.02) { pushTrail(trailA, ax, ay); drawTrail(ctx, trailA, "168,214,178", S.aAmt); }

    if (S.lock > 0.40 && S.lock < 0.82 && S.mAmt > 0.08 && S.aAmt > 0.08) {
      const p = 1 - Math.abs(S.lock - 0.58) / 0.18;
      if (p > 0) {
        flash = Math.max(flash, p * 0.7);
        shake = Math.max(shake, 0.32 * p);
        drawTintBeam(ctx, mx, my, ax, ay, "220,210,180", p);
        drawTintBeam(ctx, mx, my, sx(S.mdU), S.mdY, "212,168,90", p * S.mdAmt);
        drawTintBeam(ctx, ax, ay, sx(S.mdU), S.mdY, "186,224,198", p * S.mdAmt);
      }
    }

    if (S.fifth > 0.12 && S.fifth < 0.72 && S.cAmt > 0.1) {
      const beam = Math.sin(clamp((S.fifth - 0.12) / 0.5, 0, 1) * 3.14);
      drawTintBeam(ctx, sx(S.cU), S.cY, sx(S.nestU), mainSurfY(S.nestU, S.mainRise, S.scar) + 4, "196,140,48", beam * S.cAmt * 0.85);
    }

    if (S.war > 0.08 && S.et < 0.02) {
      const clashX = sx(MAIN_U);
      const clashY = standY(0, MAIN_U, S.mainRise, S.scar);
      if (Math.sin(t * 6.5) > 0.72 && clashCool <= 0) {
        clashCool = 0.18;
        rings.push({ x: clashX + (Math.random() - 0.5) * 28, y: clashY + (Math.random() - 0.5) * 16, r: 6, a: 0.7 });
        shake = Math.max(shake, 0.14);
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

    if (S.fall > 0.16 && S.fall < 0.86 && S.oAmt > 0.2 && S.mdAmt > 0.15) {
      const dx = sx(S.mdU) - ox, dy = S.mdY - oy;
      if (Math.hypot(dx, dy) < 48 && clashCool <= 0) {
        flash = 1;
        shake = Math.max(shake, 1);
        clashCool = 0.22;
        rings.push({ x: (sx(S.mdU) + ox) * 0.5, y: (S.mdY + oy) * 0.5, r: 10, a: 1 });
      }
    }
    if (S.et > 0.12 && S.oAmt > 0.2 && S.mAmt > 0.2) {
      const dx = mx - ox, dy = my - oy;
      if (Math.hypot(dx, dy) < 40 && clashCool <= 0) {
        flash = 0.7;
        shake = Math.max(shake, 0.45);
        clashCool = 0.3;
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

    const sxh = (Math.random() - 0.5) * shake * 12;
    const syh = (Math.random() - 0.5) * shake * 9;
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
    if (uBirth > 0.04 && beat < idxOf("flee")) {
      pushTrail(trailY, L.yx, L.yy);
      pushTrail(trailR, L.rx, L.ry);
      drawTrail(ctx, trailY, "245,208,107", L.yAmt);
      drawTrail(ctx, trailR, "90,12,18", L.rAmt, true);

      const dx = L.yx - L.rx, dy = L.yy - L.ry;
      const dist = Math.hypot(dx, dy);
      if (uFight > 0.05 && uLand < 0.15 && dist < 38 && clashCool <= 0) {
        flash = 1;
        shake = Math.max(shake, 0.95);
        clashCool = 0.26;
        rings.push({ x: (L.yx + L.rx) * 0.5, y: (L.yy + L.ry) * 0.5, r: 10, a: 1 });
      }
      const beamU = (uFight > 0.66 && uFight < 0.78) ? 1 - Math.abs(uFight - 0.72) / 0.12 : 0;
      drawBeam(ctx, L.yx, L.yy, L.rx, L.ry, beamU * Math.max(L.yAmt, L.rAmt));
      drawOrb(ctx, L.rx, L.ry, L.rAmt, "obrokxus");
      drawOrb(ctx, L.yx, L.yy, L.yAmt, "rex");
      drawRings(ctx);
    }

    if (uFight > 0.08 && uLand < 0.2) shake = Math.max(shake, 0.22 + uFight * 0.2);
    if (uFight > 0.82 && uLand < 0.2) shake = Math.max(shake, 0.55 + (1 - L.yAmt) * 0.45);
    if (uBirth > 0.35 && uBirth < 0.95) shake = Math.max(shake, 0.32);
    if (uSwarm > 0.1 && uWomb < 0.2) shake = Math.max(shake, 0.18);

    const landRise = clamp(uLand / 0.65, 0, 1);
    drawRexLand(ctx, landRise, L.originX, L.originY);
    drawSaga(ctx);

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
  function holdPage(e) {
    if (!active) return;
    e.preventDefault();
  }
  addEventListener("wheel", holdPage, { passive: false });
  addEventListener("touchmove", holdPage, { passive: false });

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
  addEventListener("keydown", e => {
    if (!active) return;
    if (e.key === "Escape") { e.preventDefault(); skip(); }
  }, true);

  document.addEventListener("site:enter", e => {
    const mode = e.detail && e.detail.mode;
    if (active) return;
    if (FORCE) {
      setTimeout(() => { if (!active) play({ thenMode: "void" }); }, 80);
      return;
    }
    if (pending() && mode === "void")
      play({ thenMode: "void" });
  });

  return {
    get active() { return active; },
    get pending() { return pending(); },
    play, skip, step, draw,
  };
})();
