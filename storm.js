/* storm.js — the Sector Zero storm: two debris compositions parked beside
   the Sector Zero planet in the Game Dev sector, a desk to the right and a
   repair station below-left. Periodically a storm blows pieces loose, they
   roam and tumble widely, then everything gathers and springs home with a
   silent snap (the game this alludes to does exactly that). The player's
   ship can shove pieces loose. The monitor screen flickers like the game's
   terminal, and faint ghost terminal lines type themselves out in the air
   near the planet and fade. Flat fills, light from the left via
   Paint.litShade, no outlines; glow only for the screen and its LED. */
window.Storm = (function () {
  const { clamp, mix, wrapPi, vnoise } = Util;
  const rnd = Util.mulberry(Date.now() & 0x7fffffff); // not Math.random: the snapshot harness seeds that sequence and every later caller would shift; its clock is frozen, so Date.now still repeats
  const rand = (a, b) => a + (b - a) * rnd();

  // two compositions: the desk to the right of the planet, the repair station below-left.
  // y is px from the planet, or a fraction of H (yFrac) when the spot must track the deck line.
  // ox/oy is the resolved origin filled in by layout.
  const COMPS = [
    { x: 250,  y: 10, yFrac: null,  tilt: -9 * Math.PI / 180, ox: 0, oy: 0 },   // 0 = desk, right of planet
    { x: -200, y: 0,  yFrac: 0.595, tilt:  6 * Math.PI / 180, ox: 0, oy: 0 },   // 1 = repair station, below-left
  ];
  const HOLD_FIRST = 6, HOLD = [5, 8], STORM = [35, 70], GATHER = 3.0;
  const GUST = [4, 8];
  const DRIFT_ACC = 6, DAMP = 0.45, SPIN_ACC = 0.25, ADAMP = 0.3;
  const TETHER_R = 260, TETHER_K = 0.08;
  const SHIP_R = 22, SHIP_OFF = 30;
  const FLOOR = 0.62, CEIL = 0.10, BOUNCE = 0.4;   // screen fractions of H: the deck line and the top bar
  const E = 0.35;                              // restitution
  const MAX_V = 180, MAX_VA = 4;
  const LIVELY_V = 24, LIVELY_VA = 0.9, HOT = 3;

  const PC = ["#a09e93", "#5f5e57"], DK = ["#4a4d4a", "#2b2d2b"], MUG = ["#c3c3bf", "#71716d"],
        CAN = ["#8f9188", "#54554f"], BAND = ["#b3a23a", "#6e6425"], NOTE = ["#d1c65a", "#8f8738"];
  const SCREEN = "#0a1a10", INK = "#6a6530", SHUTTER = "#7d8078", SPACEBAR = "#6a6d68", CAP = "#8c3a30";
  const PCB = ["#2f4a3a", "#1b2c22"], METAL = ["#8e939a", "#565a60"], BLACK = ["#3a3d42", "#202226"],
        HANDLE = ["#8c3a30", "#55231d"];
  const PLATTER = "#a9adb2", DIE = "#6c7078", SHAFT = "#b9bcc0", GOLD = "#b3a23a";
  const GREEN = a => `rgba(120,255,150,${a})`;

  // static furniture the objects rest on: the desk (comp 0) and the shelving rack (comp 1).
  // Local px, y down, before the composition tilt. Shelf/desk "top" values are the
  // surfaces the roster bottoms sit on.
  const FURN = { wood: ["#8a6a48", "#5a4430"], steel: ["#6e7480", "#3e424a"], desk: ["#7d7266", "#4b433b"] };
  const DESK = { x0: -125, x1: 125, top: 0, thick: 8, legX: 112, legW: 6, legBot: 56, bar: 44 };
  const RACK = { x0: -93, x1: 93, top: -206, upW: 6, shelfT: 6, beamT: 2, shelves: [-200, -150, -100, -50, -6] };

  // a wrapper, not a new litShade: flat fill lit left 30%, shade right 70%
  function box(g, x0, y0, x1, y1, pal) {
    Paint.litShade(g, () => { g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); },
                   x0 + (x1 - x0) * 0.3, pal[0], pal[1]);
  }

  // draw order, back to front, and home layout relative to each composition's
  // origin (see COMPS, above) before its tilt; c picks the composition. Every
  // home puts the object's bottom edge on a DESK/RACK surface (or on another object).
  const ROSTER = [
    { id: "tower",    w: 30, h: 64, r: 26, hx: -84, hy: -32, ha: 0,   c: 0 },
    { id: "floppy",   w: 14, h: 10, r: 7,  hx: -84, hy: -69, ha: 0,   c: 0 },   // sits on the tower top
    { id: "heater",   w: 36, h: 24, r: 15, hx: 70,  hy: 44,  ha: 0,   c: 0 },   // on the floor under the desk, between the legs
    { id: "speaker",  w: 18, h: 24, r: 11, hx: 86,  hy: -12, ha: 0,   c: 0 },
    { id: "monitor",  w: 52, h: 50, r: 24, hx: 46,  hy: -27, ha: 0,   c: 0 },
    { id: "keyboard", w: 74, h: 20, r: 18, hx: -30, hy: -10, ha: 0,   c: 0 },
    { id: "can",      w: 11, h: 34, r: 13, hx: -108, hy: -15, ha: 0,  c: 0 },
    { id: "mug",      w: 19, h: 17, r: 9,  hx: 106, hy: -9,  ha: 0,   c: 0 },
    { id: "note",     w: 12, h: 10, r: 6,  hx: 64,  hy: -10, ha: 6,   c: 0 },   // stuck to the monitor's lower-right bezel
    { id: "case",     w: 30, h: 40, r: 21, hx: -36, hy: -170, ha: 0,  c: 1 },   // top shelf
    { id: "panel",    w: 26, h: 36, r: 15, hx: -68, hy: -170, ha: 12, c: 1 },   // leaning on the case
    { id: "mobo",     w: 40, h: 34, r: 22, hx: -50, hy: -117, ha: 0,  c: 1 },   // shelf 2
    { id: "gpu",      w: 44, h: 18, r: 18, hx: 10,  hy: -109, ha: 0,  c: 1 },   // shelf 2
    { id: "hdd",      w: 30, h: 22, r: 15, hx: 50,  hy: -17, ha: 0,   c: 1 },   // bottom shelf
    { id: "psu",      w: 26, h: 20, r: 14, hx: 30,  hy: -160, ha: 0,  c: 1 },   // top shelf
    { id: "ram",      w: 26, h: 6,  r: 9,  hx: -60, hy: -53, ha: 0,     c: 1 },   // shelf 3
    { id: "chip",     w: 12, h: 12, r: 7,  hx: -28, hy: -56, ha: 0,    c: 1 },   // shelf 3
    { id: "fan",      w: 18, h: 18, r: 10, hx: 60,  hy: -109, ha: 0,  c: 1 },   // shelf 2
    { id: "driver",   w: 28, h: 6,  r: 9,  hx: 20,  hy: -53, ha: 0,    c: 1 },   // shelf 3
  ];

  // module init: comp-0-style home computed with a fixed H/ay so report()
  // works before the first frame; layout() below fixes homes on the first call
  const objs = ROSTER.map(r => {
    const comp = COMPS[r.c];
    const cx = comp.x, cy = comp.yFrac == null ? comp.y : comp.yFrac * 900 - 306;
    comp.ox = cx; comp.oy = cy;
    const home = {
      x: cx + r.hx * Math.cos(comp.tilt) - r.hy * Math.sin(comp.tilt),
      y: cy + r.hx * Math.sin(comp.tilt) + r.hy * Math.cos(comp.tilt),
      a: r.ha * Math.PI / 180 + comp.tilt,
    };
    return { id: r.id, w: r.w, h: r.h, r: r.r, m: r.w * r.h, c: r.c, hx: r.hx, hy: r.hy, ha: r.ha,
             home, x: home.x, y: home.y, a: home.a, vx: 0, vy: 0, va: 0, loose: false };
  });

  // each painter is called already translated to the object's centre and
  // rotated by o.a: draw in a local frame centred on (0,0), x right, y down
  const PAINTERS = {
    tower(g, o, glow, t) {
      box(g, -15, -32, 15, 32, PC);
      Paint.rect(g, -11, -24, 9, -19, DK[1]);
      Paint.rect(g, -11, -15, 9, -10, DK[1]);
      Paint.rect(g, 7, 18, 9, 20, GREEN(0.3 + 0.5 * Math.min(1, glow)));
    },
    floppy(g, o, glow, t) {
      box(g, -7, -5, 7, 5, DK);
      Paint.rect(g, -5, -4, 3, 0, SHUTTER);
    },
    heater(g, o, glow, t) {
      box(g, -18, -12, 18, 12, PC);
      for (const x of [-13, -6, 1, 8]) Paint.rect(g, x, -8, x + 3, 8, DK[1]);
    },
    speaker(g, o, glow, t) {
      box(g, -9, -12, 9, 12, PC);
      Paint.circle(g, 0, 2, 6, DK[1]);
      Paint.circle(g, 0, -8, 2.5, DK[1]);
    },
    monitor(g, o, glow, t) {
      Paint.rect(g, -10, 23, 10, 27, PC[1]);
      box(g, -26, -23, 26, 23, PC);
      Paint.rect(g, -20, -18, 20, 12, SCREEN);
      if (glow > 0.05) {
        g.fillStyle = Paint.rad(g, 0, -3, 4, 36, [[0, GREEN(0.16 * Math.min(1.4, glow))], [1, GREEN(0)]]);
        g.fillRect(-36, -39, 72, 72);
      }
      const ROWS = [[3, 6, 2], [5, 3], [2, 2, 7], [6], [3, 4, 3]];
      const col = GREEN(0.12 + 0.5 * Math.min(1, glow));
      let x, y;
      for (let i = 0; i < ROWS.length; i++) {
        y = -15 + i * 5.4;
        x = -18;
        for (const w of ROWS[i]) {
          Paint.rect(g, x, y, x + w, y + 2, col);
          x += w + 1.5;
        }
      }
      if (Math.floor(t * 2) % 2 === 0) Paint.rect(g, x, y, x + 2, y + 2, col);
    },
    keyboard(g, o, glow, t) {
      box(g, -37, -10, 37, 10, PC);
      Paint.rect(g, -33, -7, 33, 7, DK[0]);
      Paint.rect(g, -12, 3, 12, 6, SPACEBAR);
    },
    can(g, o, glow, t) {
      box(g, -5, -12, 5, 15, CAN);
      box(g, -5, -4, 5, 4, BAND);
      Paint.rect(g, -3, -15, 3, -12, CAN[1]);
      Paint.rect(g, -2, -19, 2, -15, CAP);
    },
    mug(g, o, glow, t) {
      box(g, -7, -8, 7, 9, MUG);
      Paint.poly(g, [[7, -4], [11, -4], [12, -3], [12, 3], [11, 4], [7, 4], [7, 2], [10, 2], [10, -2], [7, -2]]);
      g.fillStyle = MUG[1];
      g.fill();
    },
    note(g, o, glow, t) {
      box(g, -6, -5, 6, 5, NOTE);
      Paint.rect(g, -4, -3, 3, -2, INK);
      Paint.rect(g, -4, 0, 1, 1, INK);
    },
    case(g, o, glow, t) {
      box(g, -15, -20, 15, 20, PC);
      Paint.rect(g, -11, -16, 11, 16, DK[1]);
      Paint.rect(g, -9, -13, 9, -9, DK[0]);
      Paint.rect(g, -9, -6, 9, -2, DK[0]);
      Paint.rect(g, -9, 6, 3, 14, PC[1]);
    },
    panel(g, o, glow, t) {
      box(g, -13, -18, 13, 18, PC);
      for (const y of [-12, -8, -4]) Paint.rect(g, -8, y, 8, y + 1.5, DK[1]);
    },
    mobo(g, o, glow, t) {
      box(g, -20, -17, 20, 17, PCB);
      Paint.rect(g, -12, -11, -2, -1, DK[0]);
      Paint.rect(g, -10, -9, -4, -3, DIE);
      for (const x of [2, 6, 10]) Paint.rect(g, x, -13, x + 2, 7, DK[0]);
      Paint.rect(g, -16, 6, 12, 9, DK[0]);
      Paint.circle(g, -16, 12, 1.5, DIE);
      Paint.circle(g, -12, 12, 1.5, DIE);
    },
    gpu(g, o, glow, t) {
      box(g, -22, -9, 22, 9, BLACK);
      Paint.rect(g, -22, 6, 22, 9, PCB[1]);
      Paint.circle(g, -9, -1, 6, DK[1]);
      Paint.circle(g, 7, -1, 6, DK[1]);
      Paint.circle(g, -9, -1, 1.5, PC[1]);
      Paint.circle(g, 7, -1, 1.5, PC[1]);
      Paint.rect(g, -24, -9, -22, 9, METAL[0]);
    },
    hdd(g, o, glow, t) {
      box(g, -15, -11, 15, 11, METAL);
      Paint.circle(g, -3, 0, 8, PLATTER);
      Paint.circle(g, -3, 0, 2, METAL[1]);
      Paint.poly(g, [[10, -8], [12, -7], [1, 2], [-1, 1]]);
      g.fillStyle = METAL[1];
      g.fill();
    },
    psu(g, o, glow, t) {
      box(g, -13, -10, 13, 10, BLACK);
      Paint.circle(g, -3, 0, 7, DK[1]);
      Paint.circle(g, -3, 0, 2, BLACK[0]);
      Paint.rect(g, 6, -6, 11, 4, PC[0]);
    },
    ram(g, o, glow, t) {
      box(g, -13, -3, 13, 3, PCB);
      for (const x of [-11, -6, -1, 4, 9]) Paint.rect(g, x, -2, x + 4, 1, BLACK[0]);
      Paint.rect(g, -12, 2, 12, 3, GOLD);
    },
    chip(g, o, glow, t) {
      box(g, -6, -6, 6, 6, METAL);
      Paint.rect(g, -3, -3, 3, 3, DIE);
    },
    fan(g, o, glow, t) {
      box(g, -9, -9, 9, 9, BLACK);
      Paint.circle(g, 0, 0, 7.5, DK[0]);
      Paint.circle(g, 0, 0, 2.5, BLACK[0]);
    },
    driver(g, o, glow, t) {
      box(g, -14, -3, -2, 3, HANDLE);
      Paint.rect(g, -2, -1, 12, 1, SHAFT);
      Paint.rect(g, 12, -1.5, 14, 1.5, SHAFT);
    },
  };

  // storm cycle state
  let t = 0;                 // storm clock, seconds (sum of dt)
  let phase = "home";        // "home" | "storm" | "gather"
  let phaseT = HOLD_FIRST;   // seconds left in the phase
  let hot = 0;               // seconds of liveliness left after a kick or a contact
  let gustT = 0;
  let gatherExtra = 0;       // extra seconds granted to gather when pieces are still far from home
  let lastH = -1, lastAy = -1;

  // recomputes every object's home from COMPS for the current env, and snaps
  // non-loose home/storm objects straight there (a no-op once env stops changing)
  function layout(env) {
    lastH = env.H; lastAy = env.ay;
    for (const o of objs) {
      const c = COMPS[o.c];
      const cx = c.x, cy = c.yFrac == null ? c.y : c.yFrac * env.H - env.ay;
      c.ox = cx; c.oy = cy;
      o.home.x = cx + o.hx * Math.cos(c.tilt) - o.hy * Math.sin(c.tilt);
      o.home.y = cy + o.hx * Math.sin(c.tilt) + o.hy * Math.cos(c.tilt);
      o.home.a = o.ha * Math.PI / 180 + c.tilt;
      if (!o.loose && (phase === "home" || phase === "storm")) {
        o.x = o.home.x; o.y = o.home.y; o.a = o.home.a;
      }
    }
  }

  function snapHome() {
    for (const o of objs) {
      o.x = o.home.x; o.y = o.home.y; o.a = o.home.a;
      o.vx = 0; o.vy = 0; o.va = 0;
      o.loose = false;
    }
  }

  function startStorm() {
    const power = 0.45 + 0.55 * Math.min(rnd(), rnd());
    const rolls = objs.map(() => rnd());
    let joined = objs.filter((o, i) => rolls[i] <= power);
    const minJoin = Math.ceil(objs.length * 0.4);
    if (joined.length < minJoin) {
      const order = objs.map((o, i) => i).sort((i, j) => rolls[i] - rolls[j]);
      joined = order.slice(0, minJoin).map(i => objs[i]);
    }
    for (const o of joined) {
      o.loose = true;
      const th = rnd() * Math.PI * 2;
      let dx = Math.cos(th), dy = Math.sin(th);
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const sp = mix(40, 110, power);
      o.vx += dx * sp; o.vy += dy * sp;
      o.va += (rnd() < 0.5 ? -1 : 1) * mix(0.3, 1.2, power);
    }
    phase = "storm";
    phaseT = rand(STORM[0], STORM[1]);
    gustT = rand(GUST[0], GUST[1]);
    hot = HOT;
  }

  function gust() {
    const count = 1 + (rnd() < 0.5 ? 1 : 0);
    let candidates = objs.filter(o => o.loose);
    if (candidates.length === 0) {
      const o = objs[Math.floor(rnd() * objs.length)];
      o.loose = true;
      candidates = [o];
    }
    for (let n = 0; n < count && candidates.length > 0; n++) {
      const o = candidates.splice(Math.floor(rnd() * candidates.length), 1)[0];
      const th = rnd() * Math.PI * 2, sp = rand(25, 50);
      o.vx += Math.cos(th) * sp; o.vy += Math.sin(th) * sp;
      o.va += (rnd() < 0.5 ? -1 : 1) * rand(0.15, 0.5);
    }
    gustT = rand(GUST[0], GUST[1]);
  }

  // flicker, modelled on the game's terminal flicker component
  let glow = 0.6, evT = rand(5, 10), evLeft = 0, evSign = 0;

  function stepFlicker(dt, reduced) {
    if (reduced) { glow = 0.6; return; }
    let f = 0.5 + ((Math.sin(t) + (vnoise(t * 0.5, 7) * 2 - 1)) * 0.5) * 0.5 + rand(-0.05, 0.05);
    evT -= dt;
    if (evLeft > 0) {
      evLeft -= dt;
      f += evSign * rand(0.5, 1.0);
    } else if (evT <= 0) {
      evLeft = rand(0.1, 0.3);
      evSign = rnd() < 0.5 ? 1 : -1;
      evT = rand(5, 10);
    }
    glow = clamp(f, 0, 2);
  }

  // ghost terminal lines
  const LINES = [
    "> ls /records", "> cat OBJ_0001.txt", "weight: 0.0", "height: 1.4", "> register OBJ_0107",
    "registered · +1", "storm incoming", "gravity: released", "> edit OBJ_0042.txt",
    "balance: 3 · reverted", "> mail read 2", "screwdriver: returning", "> cat brian.txt",
    "chair: unregistered", "record locked", "> rm OBJ_0093.txt", "reality: obeying"
  ];
  const LINE_FONT = '11px Consolas, "Courier New", monospace';
  const LINE_ALPHA = 0.16, LINE_CPS = 22, LINE_HOLD = 2.2, LINE_FADE = 1.6, LINE_MAX = 3, LINE_FIRST = 5;
  const LINE_GAP = [4, 8];
  // where a line may start, px from the planet: anywhere in a box around it, kept
  // off the beacon, its label and its chip (LINE_KEEP), and off the top bar and
  // deck line (LINE_EDGE). LINE_CH is the width of one glyph in LINE_FONT.
  const LINE_SPAN = [320, 230], LINE_KEEP = { x: 125, y0: -85, y1: 115 }, LINE_EDGE = 30, LINE_CH = 6.1;

  const lines = [];
  let lineT = LINE_FIRST;
  let lineIdx = Math.floor(rnd() * LINES.length);

  // pick a start for a ghost line: retry until the whole text clears the beacon
  // and the screen band; fall back to the old spot up-left of the planet
  function linePos(text) {
    const w = text.length * LINE_CH;
    const yMin = CEIL * lastH - lastAy + LINE_EDGE, yMax = FLOOR * lastH - lastAy - LINE_EDGE;
    for (let i = 0; i < 12; i++) {
      const x = rand(-LINE_SPAN[0], LINE_SPAN[0] - w), y = rand(-LINE_SPAN[1], LINE_SPAN[1]);
      if (y < yMin || y > yMax) continue;
      if (x < LINE_KEEP.x && x + w > -LINE_KEEP.x && y > LINE_KEEP.y0 && y < LINE_KEEP.y1) continue;
      return { x, y };
    }
    return { x: -250, y: -120 };
  }

  function stepLines(dt) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const ln = lines[i];
      ln.age += dt;
      const typeDur = ln.text.length / LINE_CPS;
      if (ln.age >= typeDur + LINE_HOLD + LINE_FADE) lines.splice(i, 1);
    }
    lineT -= dt;
    if (lineT <= 0) {
      if (lines.length < LINE_MAX) {
        const text = LINES[lineIdx++ % LINES.length], p = linePos(text);
        lines.push({ text, x: p.x, y: p.y, age: 0 });
      }
      lineT = rand(LINE_GAP[0], LINE_GAP[1]);
    }
  }

  function step(dt, env) {
    if (env.H !== lastH || env.ay !== lastAy) layout(env);
    if (!(dt > 0)) return;
    t += dt;
    stepLines(dt);
    stepFlicker(dt, env.reduced);
    if (env.reduced) {
      if (phase !== "home") { snapHome(); phase = "home"; phaseT = HOLD_FIRST; }
      hot = 0;
      return;
    }

    // cycle
    if (phase === "home") {
      phaseT -= dt;
      if (phaseT <= 0) startStorm();
    } else if (phase === "storm") {
      phaseT -= dt;
      gustT -= dt;
      if (gustT <= 0) gust();
      if (phaseT <= 0) { phase = "gather"; phaseT = GATHER; hot = Math.max(hot, GATHER + 1); }
    } else if (phase === "gather") {
      phaseT -= dt;
      if (phaseT <= 0) {
        const worst = Math.max(...objs.map(o => Math.hypot(o.x - o.home.x, o.y - o.home.y)));
        if (worst > 3 && gatherExtra < 2) {
          phaseT = 0.5;
          gatherExtra += 0.5;
        } else {
          snapHome();
          gatherExtra = 0;
          phase = "home";
          phaseT = rand(HOLD[0], HOLD[1]);
        }
      }
    }

    // forces and integration
    for (let i = 0; i < objs.length; i++) {
      const o = objs[i];
      let integrate = false;
      if (phase === "gather") {
        const ax = 24 * (o.home.x - o.x) - 8 * o.vx;
        const ay = 24 * (o.home.y - o.y) - 8 * o.vy;
        const aa = 24 * wrapPi(o.home.a - o.a) - 8 * o.va;
        o.vx += ax * dt; o.vy += ay * dt; o.va += aa * dt;
        integrate = true;
      } else if ((phase === "home" || phase === "storm") && o.loose) {
        let ax = DRIFT_ACC * (vnoise(t * 0.15 + i * 3.7, 11 + i) * 2 - 1);
        let ay = DRIFT_ACC * (vnoise(t * 0.15 + i * 5.1, 41 + i) * 2 - 1);
        const dx = o.x - o.home.x, dy = o.y - o.home.y, L = Math.hypot(dx, dy);
        if (L > TETHER_R) {
          ax -= dx / L * (L - TETHER_R) * TETHER_K;
          ay -= dy / L * (L - TETHER_R) * TETHER_K;
        }
        o.vx += ax * dt; o.vy += ay * dt;
        const k = Math.max(0, 1 - DAMP * dt);
        o.vx *= k; o.vy *= k;
        const aa = SPIN_ACC * (vnoise(t * 0.1 + i * 2.3, 71 + i) * 2 - 1);
        o.va += aa * dt;
        o.va *= Math.max(0, 1 - ADAMP * dt);
        integrate = true;
      }
      if (integrate) {
        const sp = Math.hypot(o.vx, o.vy);
        if (sp > MAX_V) { o.vx = o.vx / sp * MAX_V; o.vy = o.vy / sp * MAX_V; }
        o.va = clamp(o.va, -MAX_VA, MAX_VA);
        o.x += o.vx * dt; o.y += o.vy * dt; o.a += o.va * dt;
        const fy = env.H * FLOOR - env.ay - o.r;   // storm y is relative to the planet
        const cy = env.H * CEIL - env.ay + o.r;
        if (o.y > fy) { o.y = fy; if (o.vy > 0) o.vy = -o.vy * BOUNCE; }
        if (o.y < cy) { o.y = cy; if (o.vy < 0) o.vy = -o.vy * BOUNCE; }
      }
    }

    // collisions: the ship test always runs; object pairs skip while gathering
    // so the converging pieces pass through each other
    {
      const rsx = env.sx - env.ax, rsy = env.sy - env.ay;
      const p = env.spitch || 0;
      // a resting touch pushes out but does not wake the loop; only an impact refreshes hot
      for (const k of [-1, 0, 1]) {
        const cx = rsx + k * SHIP_OFF * Math.cos(p);
        const cy = rsy + k * SHIP_OFF * Math.sin(p);
        for (const o of objs) {
          let nx = o.x - cx, ny = o.y - cy;
          const d = Math.hypot(nx, ny);
          const pen = o.r + SHIP_R - d;
          if (pen > 0) {
            if (d < 1e-3) { nx = 1; ny = 0; } else { nx /= d; ny /= d; }
            o.x += nx * pen; o.y += ny * pen;
            const vn = (o.vx - env.svx) * nx + (o.vy - env.svy) * ny;
            if (vn < 0) {
              const j = -(1 + E) * vn;
              o.vx += nx * j; o.vy += ny * j;
              const tx = -ny, ty = nx;
              const vt = (o.vx - env.svx) * tx + (o.vy - env.svy) * ty;
              o.va -= (vt / o.r) * 0.25;
              o.loose = true;
              if (vn < -8) hot = HOT;
            }
          }
        }
      }
      if (phase !== "gather") {
        for (let i = 0; i < objs.length; i++) {
          for (let j = i + 1; j < objs.length; j++) {
            const a = objs[i], b = objs[j];
            if (!(a.loose || b.loose)) continue;
            let nx = b.x - a.x, ny = b.y - a.y;
            const d = Math.hypot(nx, ny);
            const pen = a.r + b.r - d;
            if (pen > 0) {
              if (d < 1e-3) { nx = 1; ny = 0; } else { nx /= d; ny /= d; }
              const wa = b.m / (a.m + b.m), wb = a.m / (a.m + b.m);
              a.x -= nx * pen * wa; a.y -= ny * pen * wa;
              b.x += nx * pen * wb; b.y += ny * pen * wb;
              const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
              if (vn < 0) {
                const J = -(1 + E) * vn / (1 / a.m + 1 / b.m);
                a.vx -= nx * J / a.m; a.vy -= ny * J / a.m;
                b.vx += nx * J / b.m; b.vy += ny * J / b.m;
              }
              const tx = -ny, ty = nx;
              const vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
              a.va += (vt / a.r) * 0.1; b.va -= (vt / b.r) * 0.1;
              a.loose = b.loose = true;
              if (vn < -8) hot = Math.max(hot, 1);
            }
          }
        }
      }
      for (const o of objs) o.va = clamp(o.va, -MAX_VA, MAX_VA);
    }

    hot = Math.max(0, hot - dt);
  }

  function lively() {
    if (phase === "gather" || hot > 0) return true;
    for (const o of objs) {
      if (Math.hypot(o.vx, o.vy) > LIVELY_V || Math.abs(o.va) > LIVELY_VA) return true;
    }
    return false;
  }

  // the desk: two steel legs, a cross bar, then the laminate top over them
  function drawDesk(g) {
    for (const s of [-1, 1])
      box(g, s * DESK.legX - DESK.legW / 2, DESK.top + DESK.thick, s * DESK.legX + DESK.legW / 2, DESK.legBot, FURN.steel);
    Paint.rect(g, -DESK.legX, DESK.bar, DESK.legX, DESK.bar + 3, FURN.steel[1]);
    box(g, DESK.x0, DESK.top, DESK.x1, DESK.top + DESK.thick, FURN.desk);
  }
  // the shelving rack: wooden shelves with a steel beam under each front edge,
  // then the two uprights in front of the shelf ends
  function drawRack(g) {
    for (const s of RACK.shelves) {
      box(g, RACK.x0, s, RACK.x1, s + RACK.shelfT, FURN.wood);
      Paint.rect(g, RACK.x0, s + RACK.shelfT, RACK.x1, s + RACK.shelfT + RACK.beamT, FURN.steel[1]);
    }
    box(g, RACK.x0, RACK.top, RACK.x0 + RACK.upW, 0, FURN.steel);
    box(g, RACK.x1 - RACK.upW, RACK.top, RACK.x1, 0, FURN.steel);
  }
  function drawFurniture(ctx, env) {
    COMPS.forEach((c, i) => {
      ctx.save();
      ctx.translate(env.ax + c.ox, env.ay + c.oy);
      ctx.rotate(c.tilt);
      if (i === 0) drawDesk(ctx); else drawRack(ctx);
      ctx.restore();
    });
  }

  function draw(ctx, env) {
    if (env.H !== lastH || env.ay !== lastAy) layout(env);
    if (env.ax >= -450 && env.ax <= env.W + 450) {
      drawFurniture(ctx, env);
      for (const o of objs) {
        ctx.save();
        ctx.translate(env.ax + o.x, env.ay + o.y);
        ctx.rotate(o.a);
        PAINTERS[o.id](ctx, o, glow, t);
        ctx.restore();
      }
    }
    if (env.ax >= -450 && env.ax <= env.W + 450 && lines.length > 0) {
      ctx.save();
      ctx.font = LINE_FONT;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      for (const ln of lines) {
        const typeDur = ln.text.length / LINE_CPS;
        const shown = Math.min(ln.text.length, Math.floor(ln.age * LINE_CPS));
        const alpha = ln.age < typeDur + LINE_HOLD
          ? LINE_ALPHA
          : LINE_ALPHA * (1 - (ln.age - typeDur - LINE_HOLD) / LINE_FADE);
        const s = ln.text.slice(0, shown);
        ctx.fillStyle = GREEN(alpha);
        ctx.fillText(s, env.ax + ln.x, env.ay + ln.y);
        if (ln.age < typeDur && Math.floor(ln.age * 3) % 2 === 0) {
          ctx.fillStyle = GREEN(Math.min(0.3, alpha * 1.5));
          ctx.fillRect(env.ax + ln.x + ctx.measureText(s).width + 1, env.ay + ln.y - 5, 6, 10);
        }
      }
      ctx.restore();
    }
  }

  function report() {
    return {
      phase, phaseT, hot, glow, lively: lively(), lines: lines.length,
      objects: objs.map(o => ({
        id: o.id, comp: o.c, x: o.x, y: o.y, a: o.a, vx: o.vx, vy: o.vy, loose: o.loose,
        off: Math.hypot(o.x - o.home.x, o.y - o.home.y)
      }))
    };
  }

  return { step, draw, lively, report };
})();
