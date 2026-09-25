/* ===========================================================
   WORLD — the geography of Arcanis, and how it is drawn.

   Everything here is scenery: where things are, what they look
   like, and nothing about the camera, the pointer, the beacons
   or the HUD. Those live in bridge.js.

   One entry point:

     World.draw(ctx, {
       W, H, camX, t, vel, maxFling, chaos, future, dt
     })

   plus World.LAND / SLOT / BOUNDS / DECK for anyone who needs to
   place something against the map, and World.chaosAt / futureAt
   for the ambience the camera eases toward.

   The painting itself is split across the sibling files void.js,
   watcher.js, serus.js, nephilim.js, admin-tear.js, vikings.js,
   rex.js and city.js, each publishing its painters onto World.P.
   =========================================================== */

window.World = (function () {

  const VIEW_UNITS = 2100;     // world units across the viewport

  /* ---- the small maths this file needs ---- */
  const { mulberry, hash1, smooth, approach, ridge } = Util;


  /* ---- world ---- */
  const SLOT = 6000;
  const at = i => i * SLOT;
  const LAND = {
    future:   at(4.5),
    mainland: at(11.5),
    voidmark: at(30),
    bridge:   at(41),
    watcher:  at(56),
    rex:      at(61.5),    // the prime mass
    edgefall: at(65.5),    // the second
    unnamed:  at(68.2),    // the third, unsurveyed
    root:     at(70.6),    // the flesh begins here
    rootEnd:  at(80),
  };

  const BOUNDS = { min: at(1.6), max: LAND.root - 2400 };

  const DECK  = 0.64;   // deck height as a fraction of the hero. Bigger = lower.
  const FLOOR = 1.14;
  const BAY   = 300;   // spacing between legs


  /* how disturbed the dark is here: worst mid-void, calm near the
     mainland, and almost nothing out west where nothing has happened */
  function chaosAt(x) {
    const fromCity = smooth((Math.abs(x - LAND.mainland) - SLOT * 1.2) / (SLOT * 5));
    const west = x < LAND.mainland ? smooth((x - BOUNDS.min) / (SLOT * 5.5)) : 1;
    const east = smooth((LAND.watcher - x) / (SLOT * 3) + 1);
    return fromCity * west * Math.min(1, east);
  }
  function futureAt(x) { return 1 - smooth((x - BOUNDS.min) / (SLOT * 7)); }

  /* ---- the mainland ---- */
  const CITY_FROM = LAND.mainland - SLOT * 0.7;
  const CITY_TO   = LAND.mainland + SLOT * 0.7;
  const city = { far: [], mid: [], near: [] };
  (function () {
    const r = mulberry(20260824);
    function band(list, n, minH, maxH, minW, maxW, lit, par) {
      const pad = (CITY_TO - CITY_FROM) * (1 / par - 1) * 0.5;
      const a = CITY_FROM - pad, b = CITY_TO + pad;
      for (let i = 0; i < n; i++) {
        const tw = { x: a + r() * (b - a), w: minW + r() * (maxW - minW),
                     h: minH + r() * (maxH - minH), windows: [] };
        if (lit) {
          const cols = Math.max(1, Math.floor(tw.w / 13));
          const rows = Math.max(2, Math.floor(tw.h * 46));
          for (let cx = 0; cx < cols; cx++)
            for (let cy = 0; cy < rows; cy++)
              if (r() < 0.32)
                tw.windows.push({ dx: 5 + cx * 13, dy: 8 + cy * 16,
                                  a: 0.25 + r() * 0.6, fl: r() * 6.28, warm: r() < 0.78 });
        }
        list.push(tw);
      }
    }
    band(city.far,  520, 0.30, 0.74,  22,  62, false, 0.30);
    band(city.mid,  320, 0.22, 0.56,  30,  84, false, 0.46);
    band(city.near, 190, 0.14, 0.44,  46, 124, true,  0.66);
  })();

  /* ---- Rex ------------------------------------------------
     Not stacked layers — a run. Travelling east the ground climbs
     as three nested ranges, each smaller and further back than the
     one in front, until the surface leaves the top of the frame.
     Past that you're inside it: underground for a long while, then
     hell opening downward and to the right, and then the Root.
  --------------------------------------------------------- */
  const REX_FROM = LAND.rex - SLOT * 6.0;   // the ground starts here
  const REX_END  = LAND.rex + SLOT * 2.5;   // the surface finally leaves the frame
  const HELL_AT  = LAND.rex + SLOT * 4.4;   // and it starts turning

  /* near band is biggest and darkest; the ones behind are smaller,
     higher and paler, which is what makes the joins disappear */
  const REX_BANDS = [
    // furthest back: highest and climbs hardest, so it leaves the frame first
    { par: 0.50, seed: 1201, amp: 0.055, base: 0.34, drift: 0.16, rampAt: 0.60, climb: 2.4, cell: 2600,
      lit: "#39485a", shade: "#26313d" },
    { par: 0.59, seed: 3307, amp: 0.075, base: 0.20, drift: 0.13, rampAt: 0.70, climb: 2.1, cell: 1900,
      lit: "#2b3742", shade: "#1c242d" },
    // nearest: lowest and slowest, so the two behind stay visible over it
    { par: 0.68, seed: 5501, amp: 0.095, base: 0.06, drift: 0.10, rampAt: 0.80, climb: 1.8, cell: 1400,
      lit: "#2a3640", shade: "#1b2228" },
  ];

  /* height of a band at a world position, as a share of the hero */
  function rexHeight(worldX, b) {
    const u = (worldX - REX_FROM) / (REX_END - REX_FROM);
    if (u <= 0) return 0;
    const entry = Math.min(1, u / 0.10);          // rises out of nothing

    // a slow drift across the whole run, so the ground rolls rather
    // than only ever climbing
    const drift = u * b.drift;

    // and one ramp at the end that takes it out of the frame
    const r = Math.max(0, (u - b.rampAt) / (1 - b.rampAt + 0.0001));
    const ramp = Math.pow(r, 2.4) * b.climb;

    // two scales of relief: long swells, and the detail on top of them
    const relief = ridge(worldX / (b.cell * 3.2), b.seed + 7) * b.amp * 1.5
                 + ridge(worldX / b.cell, b.seed) * b.amp;

    return (b.base + drift + ramp + relief) * entry;
  }

  /* ---- the kingdoms of Rex ------------------------------------
     Each is painted once into its own sprite by rexart-surface.js /
     rexart-deep.js (window.RexArt) and copied every frame; only its
     moving parts are drawn live. Nothing shows until its beacon has
     landed (depthAlpha). A surface kingdom stands on a range's skyline
     at that range's parallax, so the ranges in front hide its foot; a
     deep one hangs in the rock at the beacons' own parallax.
     The Mainland factions use the same sprite cache, painted by landart.js
     (window.LandArt).
  --------------------------------------------------------- */
  const REX_ART_PAR  = 0.62;   // bnote-rex's par: deep kingdoms move with their beacons
  const REX_ART_UNIT = 26;     // world units per art unit, before parallax
  // band: index into REX_BANDS the kingdom stands on, or -1 for deep (then oy is its centre, as a share of the hero)
  const REX_PLACES = [
    { id: "bnote-rex-firstlight", art: "firstlight", x: 357516, band: 0 },
    { id: "bnote-rex-crimson",    art: "crimson",    x: 364204, band: 0 },
    { id: "bnote-rex-bonespire",  art: "bonespire",  x: 371462, band: 1 },
    { id: "bnote-rex-titans",     art: "titans",     x: 378900, band: -1, oy: 0.37 },
    { id: "bnote-rex-valkhar",    art: "valkhar",    x: 386879, band: -1, oy: 0.37 },
    { id: "bnote-rex-law",        art: "law",        x: 394368, band: -1, oy: 0.38 },
  ];
  const rexSprites = new Map();   // art name -> { key, canvas }

  /* ---- void: stars, chaos, and things older than the span ---- */
  const blobs = [], motes = [], swarm = [], presences = [], tendrils = [];
  (function () {
    const r = mulberry(4242);
    for (let i = 0; i < 10; i++)
      blobs.push({ u: r(), y: 0.2 + r() * 0.85, rad: 0.2 + r() * 0.46,
                   vy: (r() - 0.5) * 0.004, a: 0.05 + r() * 0.1,
                   hue: r() < 0.5 ? "34,52,60" : "62,40,44" });
    for (let i = 0; i < 460; i++)
      motes.push({ u: r(), y: r(), rr: 0.4 + r() * 1.5, ph: r() * 6.28, a: 0.06 + r() * 0.3 });
    for (let i = 0; i < 620; i++)
      swarm.push({ x: CITY_FROM - 900 + r() * (CITY_TO - CITY_FROM + 1800),
                   y: 0.36 + r() * 0.6, rr: 0.3 + r() * 0.95,
                   ph: r() * 6.28, amp: 6 + r() * 30, a: 0.15 + r() * 0.5 });

    /* elder things. They don't move; they surface and submerge. */
    const from = LAND.mainland + SLOT * 2.5, to = LAND.watcher - SLOT * 2;
    for (let i = 0; i < 15; i++) {
      presences.push({
        x: from + r() * (to - from),
        y: 0.16 + r() * 0.56,
        w: 260 + r() * 700, h: 130 + r() * 340,
        ph: r() * 6.28, cycle: 0.035 + r() * 0.05,
        par: 0.16 + r() * 0.22, seen: 0,
      });
    }
    /* things reaching out of the dark */
    for (let i = 0; i < 22; i++)
      tendrils.push({ x: from - SLOT + r() * (to - from + SLOT * 2),
                      y: 0.1 + r() * 0.8, len: 90 + r() * 300,
                      ph: r() * 6.28, par: 0.2 + r() * 0.3,
                      dir: r() < 0.5 ? -1 : 1, a: 0.05 + r() * 0.12 });
  })();

  // a node's art exists only once its beacon has landed and been seen, then fades in — same rule for every beacon
  const depthAlpha = id => (window.depthAlpha ? window.depthAlpha(id) : 0);
  let fade = 1;                                   // alpha of the node art being drawn; setA folds it into every alpha the art sets
  const setA = v => { F.ctx.globalAlpha = v * fade; };
  function faded(id, draw) {
    const a = depthAlpha(id);
    if (a <= 0) return;
    fade = a;
    F.ctx.save(); F.ctx.globalAlpha = a;
    draw();
    F.ctx.restore();
    fade = 1;
  }

  const MAIN_PAR = 0.66;
  const SHATTERED = { x: 58400, oy: 0.30 };
  const LIBERTECH = { x: 62300, oy: 0.26 };
  const FIRST_DAWN = { x: 65800, oy: 0.20 };
  const DIVINE_ACCORD = { x: 73400, oy: 0.22 };
  const GORE_LEGION = { x: 77900, oy: 0.30 };

  /* ---- kingdom sprites: paint once per (unit, dpr), copy every frame ---- */
  function rexSprite(name, art, u, dpr) {
    const key = u.toFixed(4) + "@" + dpr;
    const cached = rexSprites.get(name);
    if (cached && cached.key === key) return cached.canvas;
    const c = cached ? cached.canvas : document.createElement("canvas");
    const [x0, y0, x1, y1] = art.box;
    c.width = Math.max(1, Math.ceil((x1 - x0) * u * dpr));
    c.height = Math.max(1, Math.ceil((y1 - y0) * u * dpr));
    const g = c.getContext("2d");
    g.setTransform(u * dpr, 0, 0, u * dpr, -x0 * u * dpr, -y0 * u * dpr);
    art.paint(g, 1 / u);
    rexSprites.set(name, { key, canvas: c });
    return c;
  }

  /* ---- the view, set once per frame ---- */
  const F = { ctx: null, W: 0, H: 0, camX: 0, t: 0, vel: 0, chaosNow: 0, futureNow: 0, dtNow: 1 / 60, V: { maxFling: 46000 } };
  const P = {};   // painter registry: filled by void.js, watcher.js, serus.js, nephilim.js, admin-tear.js, vikings.js, rex.js, city.js

  const scale = () => F.W / VIEW_UNITS;
  const wx = (worldX, par) => (worldX - F.camX) * par * scale() + F.W * 0.5;
  const onScreen = (x, pad) => x > -pad && x < F.W + pad;

  function draw(context, v) {
    F.ctx = context;
    F.W = v.W; F.H = v.H; F.camX = v.camX; F.t = v.t; F.vel = v.vel;
    F.chaosNow = v.chaos; F.futureNow = v.future;
    F.dtNow = v.dt != null ? v.dt : 1 / 60;
    if (v.maxFling) F.V.maxFling = v.maxFling;
    const mode = v.mode || "void";
    // the Game Dev sector is its own world (js/gdworld/); only the ship is shared
    if (mode === "gamedev" && window.GdWorld) { GdWorld.draw(context, v); return; }
    const { ctx, W, H } = F;

    ctx.globalAlpha = 1; ctx.lineWidth = 1;
    ctx.fillStyle = "#0d1114";
    ctx.fillRect(0, 0, W, H);

    P.drawVoid();

    P.drawChaos();
    P.drawPresences();
    P.drawTendrils();
    P.drawFuture();
    P.drawWatcher();
    faded("bnote-watcher-redstar", P.drawRedStar);
    faded("bnote-bridge-nephilim", P.drawNephilim); faded("bnote-bridge-admin", P.drawAdminTear); faded("bnote-bridge-vikings", P.drawVikings);
    P.drawRex();
    P.drawBand(city.far, 0.30, "#161d21", 0.5);
    P.drawBand(city.mid, 0.46, "#182025", 0.78);
    P.drawCityNear();
    P.drawLandPlace("bnote-land-shattered", "shattered", SHATTERED); P.drawLandPlace("bnote-land-libertech", "libertech", LIBERTECH); P.drawLandPlace("bnote-land-dawn", "dawn", FIRST_DAWN); P.drawLandPlace("bnote-land-accord", "accord", DIVINE_ACCORD); P.drawLandPlace("bnote-land-gore", "gore", GORE_LEGION);
    P.drawRoot();
    P.drawFragments();

    P.drawBridge();
  }

  return {
    // public, unchanged
    SLOT, LAND, BOUNDS, DECK, VIEW_UNITS, chaosAt, futureAt, draw,
    // shared with the painter files
    P, F, scale, wx, onScreen, setA, faded, depthAlpha, rexSprite, rexHeight,
    FLOOR, BAY, CITY_FROM, CITY_TO, city, blobs, motes, swarm, presences, tendrils,
    REX_BANDS, REX_FROM, REX_END, HELL_AT, REX_PLACES, REX_ART_PAR, REX_ART_UNIT, MAIN_PAR,
  };
})();
