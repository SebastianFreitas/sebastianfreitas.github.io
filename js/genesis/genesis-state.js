/* genesis-state.js — the one object every genesis file reads and writes:
   the script (BEATS), the world constants, the seeded scenery, the
   transport state (beat, local, cam, …) and the timeline queries. */
window.Gen = (function () {
  const { mulberry, smooth, clamp, mix } = Util;
  const G = {};

  G.FORCE = /(?:[?&])genesis(?:=1)?(?:&|$)/.test(location.search);
  G.JUMP  = /[?&]gbeat=([a-z]+)/.exec(location.search);
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
  G.reduced = Util.reduced();

  G.BEATS = [
    { id: "point", dur: 6.0, tag: "I · Before the record",
      line: "There was no place, and no time to say it in. Only a point, and all that would ever be, pressed inside it." },
    { id: "drawn", dur: 5.6, tag: "II · The first law",
      line: "Out of the dark came the span, cold and straight. It did not turn, and that was the first law." },
    { id: "break", dur: 6.0, tag: "III · The breaking",
      line: "The point broke. What came out of it we cannot name. It had no colour of its own, and no shape that would hold." },
    { id: "elements", dur: 9.0, tag: "IV · What had no body",
      line: "First came what had no body: the dust, the air, the wind, the sound, the colour and the light. No law held for long, and every law changed its mind." },
    { id: "matter", dur: 9.5, tag: "V · Matter",
      line: "Then came matter: flesh, and stone, and things that were both. It floated, it fell, it broke. Small lives crawled out of it and died where they crawled." },
    { id: "trade", dur: 10.0, tag: "VI · The old ones",
      line: "The matter drew together and would not come apart. Almost nothing in it woke, and what woke had to climb out of the stone, one by one, slowly, until a few stood." },
    { id: "walk",  dur: 7.0, tag: "VII · One side",
      line: "Some took the span west, and of them nothing is written. This record follows those who went east." },
    { id: "root",  dur: 5.8, tag: "VIII · Primordisentia",
      line: "At the far end they found a cry, and the cry was a body, greater than the sky." },
    { id: "swarm", dur: 6.8, tag: "IX · Hunger",
      line: "They fell upon it. Each remade it in the image of its own hunger, and the body screamed, and none of them heard." },
    { id: "womb",  dur: 7.0, tag: "X · Crede, ergo magica est",
      line: "Then a silence came over them, and with it the first guilt. They bound the wound in gold, and named the binding a womb." },
    { id: "birth", dur: 6.2, tag: "XI · First born",
      line: "Two lights tore out of the womb. Obrokxus, wrong from his first breath. And Rex, burning like a new star." },
    { id: "fight", dur: 8.2, tag: "XII · Obrokxus · Rex",
      line: "They met in the void, and the void shook to its roots. We are told that Rex broke. We are not told how." },
    { id: "land",  dur: 6.6, tag: "XIII · Rex the surface",
      line: "With the last of himself Rex closed about Obrokxus, and fell. His body cooled into ground, and the ground held." },
    { id: "gods", dur: 7.0, tag: "XIV · The others",
      line: "It bought time. The womb tore again, and five walked out of it, and we have only their names: Ormius, Ava, Kaeron, Kaelum, Orochronus." },
    { id: "deep", dur: 11.0, tag: "XV · Inside Rex",
      line: "They went down after him, into the deepest places of Rex. Chaos rose to meet them, answering to no one. Ten thousand years the war ran." },
    { id: "slip", dur: 7.0, tag: "XVI · His brothers",
      line: "In time Obrokxus set his brothers upon the gods, and while the gods were held, he climbed." },
    { id: "flee", dur: 11.6, tag: "XVII · Obrokxus flees",
      line: "He tore up through Rex and left a hole where he had been. Two lights followed: Ormius, the law in gold and red, and Ava, pale as a wound that heals." },
    { id: "war", dur: 9.2, tag: "XVIII · Their children",
      line: "The gods did not finish it. Their children did: Vorath, Malgrur, Seravim, and a war with no end." },
    { id: "stalemate", dur: 5.4, tag: "XIX · Nothing won",
      line: "Even so, the war led to nothing. It took everything, and gave nothing back." },
    { id: "firstlock", dur: 6.8, tag: "XX · Mordrial",
      line: "Out of the war they made one thing together, half Seravim and half Malgrur: Mordrial, the first warlock." },
    { id: "cadmus", dur: 10.0, tag: "XXI · Cadmus Baalzur",
      line: "Cadmus was a mortal, a veteran of the war and one of its few survivors. Mordrial taught him, and with that teaching he made a pact with a sinner older than any mortal, one Ormius had locked away. So rose the second warlock: the Harbinger of Domination, Mordrial's right hand." },
    { id: "aelius", dur: 8.6, tag: "XXII · Aelius Luxent",
      line: "The powers needed a balance. A child was found, one in a billion, who could receive the blessing of Ava herself. More than that, she was kind, as Cadmus was not. She became the third." },
    { id: "velindra", dur: 11.0, tag: "XXIII · Velindra",
      line: "The fourth was never chosen. Chaos touched Velindra and she lived. To bear it she gave herself to the corruption, whose soldiers felt no pain and thrived in agony, and hoped for peace there. Both sides hunted her, until Cadmus took an interest. Helped for the first time in her life, she flourished, and made weapons of ruin." },
    { id: "four", dur: 6.0, tag: "XXIV · Four of the void",
      line: "Four stood against the dark: Mordrial of the Void, Cadmus Baalzur, Aelius Luxent, and Velindra the Chaos Binder." },
    { id: "fifth", dur: 10.5, tag: "XXV · The Hound",
      line: "The fifth took all four of them. Eldrin walked into the nest, and every corrupted soul and spell around it was drawn in after him, and the red spires with them. The Hound walked out." },
    { id: "fall", dur: 8.6, tag: "XXVI · Mordrial fell",
      line: "They met Obrokxus, and the fight outlasted counting. Mordrial fell. The rest called it victory, and went home." },
    { id: "return", dur: 7.6, tag: "XXVII · The mainland",
      line: "They returned to the living and to the void. Only Ormius believed that Obrokxus had survived." },
    { id: "eternity", dur: 8.8, tag: "XXVIII · Still searching",
      line: "Obrokxus slipped past the edge of every record. Ormius went after him, and he is searching still." },
    { id: "now",   dur: 2.6, tag: "", line: "" },
  ];

  const BEAT_INDEX = {};
  G.BEATS.forEach((b, i) => { BEAT_INDEX[b.id] = i; });

  G.BEAT_START = [];
  (function () {
    let acc = 0;
    for (let i = 0; i < G.BEATS.length; i++) { G.BEAT_START[i] = acc; acc += G.BEATS[i].dur; }
  })();

  G.ROOT_U = 4.0;
  G.DECK   = 0.64;
  G.BAY_U  = 0.125;
  G.SPAN_START_U = -0.72;
  G.REX_U  = G.ROOT_U - 0.52;
  G.MAIN_U = G.ROOT_U - 5.35;
  G.MAIN_HALF = 0.92;
  /* One axis, one convention, so this never has to be guessed at
     again: u grows EAST, and east is the right of the screen. The
     record runs the other way — west, to the left. So whoever is
     running away always holds the SMALLER u of a pair, and whoever
     is chasing always holds the larger one. The two names below
     were the wrong way round, which is where the sides kept
     swapping. */
  G.EAST_U = G.MAIN_U + 0.40;   /* east rim: where Obrokxus stops */
  G.WEST_U = G.MAIN_U - 0.38;   /* west side: the gods' own ground */
  G.CITY_U = G.MAIN_U - 0.46;
  G.NEST_U = G.MAIN_U + 0.50;
  G.ET_END_U = G.MAIN_U - 3.85;
  G.ET_START_U = G.MAIN_U - 0.58;
  G.FLEE_START_U = G.REX_U - 0.18;
  G.BURY_U = G.FLEE_START_U;      /* where Rex and Obrokxus go into the ground, and where he comes out */
  G.DEEP_U = G.ROOT_U - 0.47;     /* the deepest pocket inside Rex */
  G.DEEP_Y = 1.62;              /* its centre, in screen heights below the top of the frame */
  G.DIVE_DEPTH = 1.12;          /* how far the camera sinks, in screen heights */
  G.FLEE_CAM_RATE = 2.20;
  G.ET_CAM_RATE   = 2.60;
  G.SIEGE_GODS = [
    { kind: "ormius",     name: "ORMIUS",     rgb: "210,70,48",   ang: 3.40, ph: 0.0 },
    { kind: "ava",        name: "AVA",        rgb: "120,214,96",  ang: 2.20, ph: 1.3 },
    { kind: "kaeron",     name: "KAERON",     rgb: "70,130,255",  ang: 0.35, ph: 2.6 },
    { kind: "kaelum",     name: "KAELUM",     rgb: "236,92,150",  ang: 4.60, ph: 3.9 },
    { kind: "orochronus", name: "OROCHRONUS", rgb: "196,206,226", ang: 5.70, ph: 5.2 },
  ];

  G.YELLOW_KEYS = [
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
  G.RED_KEYS = [
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

  G.REX_BANDS = [
    { lit: "#39485a", shade: "#26313d",
      amp: 0.062, base: 0.30, seed: 1201, drift: 0.16, rampAt: 0.52, climb: 0.34 },
    { lit: "#2b3742", shade: "#1c242d",
      amp: 0.078, base: 0.18, seed: 3307, drift: 0.13, rampAt: 0.58, climb: 0.28 },
    { lit: "#2a3640", shade: "#1b2228",
      amp: 0.095, base: 0.07, seed: 5501, drift: 0.10, rampAt: 0.64, climb: 0.22 },
  ];
  G.REX_WEST = G.ROOT_U - 0.98;
  G.REX_EAST = G.ROOT_U - 0.02;

  // lit/shade/glow/core colours for each flat god orb
  G.ORB_STYLE = {
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

  /* three bands, like Rex: the ones behind sit higher and paler,
     which is what stops the join from reading as a cut-out */
  G.MAIN_BANDS = [
    { base: 0.205, amp: 0.062, seed: 6101, cell: 4.4, shear: 1.9, out: 0.10,
      lit: "#232c35", shade: "#141b21" },
    { base: 0.172, amp: 0.052, seed: 6203, cell: 6.1, shear: 2.4, out: 0.05,
      lit: "#1c242b", shade: "#11171c" },
  ];

  G.active = false; G.beat = 0; G.local = 0; G.thenMode = "void"; G.thenCamX = null;
  G.W = 0; G.H = 0; G.t = 0; G.shake = 0; G.flash = 0; G.clashCool = 0;
  G.cam = 0; G.camTarget = 0;
  /* slow cinematic push/pull per beat; zoomKick is a clash punch */
  G.zoom = 1; G.zoomTarget = 1; G.zoomKick = 0;
  G.trailY = []; G.trailR = []; G.trailM = []; G.trailA = []; G.trailH = []; G.rings = [];
  G.trailG = [[], [], [], [], []];
  /* trails and shake jitter step 60 times a second, not once per frame,
     so a high-refresh screen doesn't shorten the trails or buzz the shake.
     A step this close to due still counts, or timestamp jitter would skip one at 60 Hz. */
  G.TICK_STEP = 1 / 60;
  G.TICK_SLACK = 0.002;
  G.tickAcc = 0;
  G.tick60 = false;                // set by step(): this frame is a 60 Hz step
  G.shakeRX = 0; G.shakeRY = 0;    // shake direction, re-rolled each step
  G.nameSeen = {};
  G.NAME_DELAY = 1.5;
  G.NAME_FADE = 0.8;

  G.motes = []; G.souls = []; G.troops = []; G.brothers = [];
  G.cityFar = []; G.cityMid = []; G.cityNear = []; G.spikes = [];
  (function seed() {
    const { motes, souls, troops, brothers, cityFar, cityMid, cityNear, spikes } = G;
    const r = mulberry(4242);
    for (let i = 0; i < 280; i++)
      motes.push({ u: r(), y: r(), rr: 0.4 + r() * 1.4, ph: r() * 6.28, a: 0.06 + r() * 0.28 });
    // burn the rolls the old seeded roster used, so everything seeded after keeps its values
    for (let i = 0; i < 56; i++)
      for (let k = 0; k < 18; k++) r();
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

  G.pending = function () {
    if (G.reduced && !G.FORCE) return false;
    return !(window.XP && XP.has("genesis"));
  };

  G.idxOf = function (id) {
    const i = BEAT_INDEX[id];
    return i == null ? 0 : i;
  };
  G.since = function (id) {
    const i = G.idxOf(id);
    if (G.beat < i) return 0;
    if (G.beat > i) return 1;
    return smooth(G.local / Math.max(0.001, G.BEATS[i].dur));
  };
  G.linear = function (id) {
    const i = G.idxOf(id);
    if (G.beat < i) return 0;
    if (G.beat > i) return 1;
    return clamp(G.local / Math.max(0.001, G.BEATS[i].dur), 0, 1);
  };
  G.only = function (id) {
    const i = G.idxOf(id);
    if (G.beat !== i) return 0;
    return smooth(G.local / Math.max(0.001, G.BEATS[i].dur));
  };

  G.sx = function (u) { return (u - G.cam) * G.W + G.W * 0.5; };

  G.beatDur = function (id) {
    const b = G.BEATS[G.idxOf(id)];
    return (b && b.dur) || 1;
  };

  /* seconds since beat `id` began: negative before it, still counting after it */
  G.secs = function (id) {
    return G.BEAT_START[G.beat] + G.local - G.BEAT_START[G.idxOf(id)];
  };

  return G;
})();
