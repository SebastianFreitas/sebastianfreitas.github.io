/* ===========================================================
   THE BRIDGE — homepage hero.

   Map:  ___________M____________________________________________________W__R[root]
   69 slots, one slot ~ one mainland width. West of the mainland
   the ground stops being the present and you can keep going.

   Nothing in here pops: every appearance is an eased ramp, and
   the deep void is never actually empty — chaos churns through
   it, things older than the bridge surface and submerge, and
   fragments of record drift past while you travel.

   Travel is the voidship (voidship.js): hold to burn toward a
   point, brake onto it, claim a beacon when the hull reaches it.
   The span strip is a readout, not a jump drive.
   =========================================================== */

(function () {
  const host = document.getElementById("bridge-hero");
  const cv   = document.getElementById("bridge-canvas");
  if (!host || !cv) return;

  const B = window.Bridge = {};
  B.host = host;

  const { mulberry, hash1, smooth, approach, fmt } = Util;

  // opaque: every frame starts with a full-frame fill, and an opaque canvas composites cheaper
  const ctx = cv.getContext("2d", { alpha: false });
  B.ctx = ctx;
  const reduced = Util.reduced();
  B.reduced = reduced;
  /* reduced-motion used to skip the frame loop and blank the span on
     http:// in Firefox while file:// still looked fine — same files.
     The loop always runs; we only soften travel when reduced. */

  /* ---- the map, borrowed from world.js ---- */
  const SLOT   = World.SLOT;
  B.SLOT = SLOT;
  const LAND   = World.LAND;
  B.LAND = LAND;
  const BOUNDS = World.BOUNDS;

  const CAM = {
    min: BOUNDS.min,                 // keep going west, into what hasn't happened
    max: LAND.root + SLOT * 1.6,   // far enough in to be surrounded by it
    maxFling: 38000,      // ceiling on a hard flick
    glideTau: 0.95,       // seconds for a fling to fall to ~37% of its speed
    carry: 0.62,          // how much of the last throw a new one inherits
    viewUnits: 2100,
    brakeZone: 9000,
  };
  B.CAM = CAM;
  // the void map's own bounds, saved so switching sectors and back
  // doesn't need to recompute them
  const VOID_MIN = CAM.min, VOID_MAX = CAM.max;
  B.VOID_MIN = VOID_MIN; B.VOID_MAX = VOID_MAX;

  const { MARKS, PLANETS, GD_LAND, GD_BOUNDS, GD_SLOT, GD_SPAWN } = Marks;
  B.MARKS = MARKS; B.PLANETS = PLANETS; B.GD_BOUNDS = GD_BOUNDS;

  /* the lamp's own radius is tuned for a mouse; a fingertip on a zoomed-out
     phone needs a wider net or you sail straight past what you were aiming at */
  const HIT_BASE = (window.Beacon && Beacon.HIT) || 26;
  B.HIT = HIT_BASE;
  if (!window.Beacon) {
    console.error("lamp.js did not load — canvas marks and claim flights are dead");
  }

  if (!window.Planet) {
    console.error("planet.js did not load — game dev sector has nothing to draw");
  }
  if (!window.Depths) {
    console.error("depths.js did not load — no beacon will open into further nodes");
  }

  /* ---- canvas ---- */
  B.W = 0; B.H = 0; B.dpr = 1;
  B.ship = null;
  function resize() {
    B.dpr = Math.min(devicePixelRatio || 1, 2);
    B.W = host.clientWidth; B.H = host.clientHeight;
    cv.width = B.W * B.dpr; cv.height = B.H * B.dpr;
    ctx.setTransform(B.dpr, 0, 0, B.dpr, 0, 0);
    // seat the voidship under the boot veil so it never pops in later
    if (B.ship) Voidship.resize(B.ship, B.W, B.H);
  }
  B.resize = resize;
  addEventListener("resize", resize);
  resize();

  /* ---- defer interaction until the gate picks a path ---- */
  B.bridgeReady = false; B.visible = true;
  /* Portrait on a touch device: the hero is covered by #bridge-rotate, so
     nothing behind it is worth a frame. Same gate as `visible`. */
  const portraitQ = matchMedia("(orientation: portrait) and (pointer: coarse)");
  B.portraitQ = portraitQ;
  B.portrait = portraitQ.matches;
  /* A landscape phone is WIDE — 780 to 930px — so every max-width breakpoint
     sails straight past it. Height and a coarse pointer are what actually
     name a phone here, and the stylesheet uses the same two. */
  const phoneQ = matchMedia("(max-height: 520px) and (pointer: coarse)");
  B.phone = phoneQ.matches;

  function syncPhone() {
    B.phone = phoneQ.matches;
    B.log.setMax(B.phone ? 3 : 6);
    B.HIT = HIT_BASE * (B.phone ? 1.7 : 1);
    if (window.Voidship) window.Voidship.BASE.size = B.phone ? Math.round(SHIP_SIZE / PHONE_ZOOM) : SHIP_SIZE;
    if (window.Instruments) Instruments.setCompact(B.phone);
  }
  B.syncPhone = syncPhone;
  function onPhoneChange() { syncPhone(); if (window.__bridgeRefit) window.__bridgeRefit(); }
  if (phoneQ.addEventListener) phoneQ.addEventListener("change", onPhoneChange);
  else phoneQ.addListener(onPhoneChange);
  const rotateEl = document.getElementById("bridge-rotate");
  B.rotateEl = rotateEl;
  if (rotateEl) rotateEl.setAttribute("aria-hidden", String(!B.portrait));
  B.entered = false; B.preloaded = false;   // gate lifted / first still frame drawn

  function readyBridge() {
    if (B.bridgeReady) return;
    B.bridgeReady = true;
    begin();
    B.applyPendingView();
    B.applyPendingMode();
    B.saveView();
  }

  function startLoop() {
    if (!B.pacer) return;   // an observer can fire between scripts, before bridge-loop.js has made the pacer; site:enter starts it later
    if (B.pacer.running) { B.pacer.start(); return; }   // start() on a running pacer just unparks
    if (!B.entered) return;
    if (!B.visible || B.portrait || document.hidden) return;
    B.pacer.start();
  }
  B.startLoop = startLoop;

  /* the gate sits over one still frame; the loop only starts on site:enter */
  document.addEventListener("site:preload", () => {
    B.preloaded = true;
    B.paintOnce();
  });
  function repaintUnderGate() {
    if (B.preloaded && !B.entered) B.paintOnce();
  }
  // a resize clears the canvas; late images and fonts change the picture
  addEventListener("resize", repaintUnderGate);
  addEventListener("load", repaintUnderGate);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(repaintUnderGate);

  B.pendingMode = null; B.pendingView = null; B.pendingQuiet = false;
  document.addEventListener("site:enter", e => {
    B.entered = true;
    startLoop();
    B.pendingMode = e.detail && e.detail.mode || null;
    B.pendingView = e.detail && e.detail.view || null;
    B.pendingQuiet = !!(e.detail && e.detail.entry && e.detail.entry !== "gate");
    if (e.detail.bridge !== false) readyBridge();
    else {
      const wake = () => {
        if (window.scrollY < window.innerHeight * 0.45) {
          removeEventListener("scroll", wake);
          readyBridge();
        }
      };
      addEventListener("scroll", wake, { passive: true });
    }
  });

  /* ---- state ---- */
  B.camX = LAND.bridge; B.vel = 0; B.travelled = 0; B.t = 0;
  B.catalogued = 4182993201; B.started = false;
  B.activeMark = null; B.hoverMark = null;
  B.chaosNow = 0; B.futureNow = 0;
  B.frozen = false;
  let freezeGuard = null;

  /* ---- setting: which map is currently under the bridge ---- */
  B.sceneMode = "void";                 // "void" | "gamedev"
  B.savedVoidCamX = LAND.bridge;
  B.savedGDCamX = GD_SPAWN;
  const activeMarks = () => B.sceneMode === "gamedev" ? PLANETS : MARKS;
  B.activeMarks = activeMarks;
  const ZERO_MARK = PLANETS.find(m => m.id === "bnote-planet-zero"); // the storm sits beside it
  B.ZERO_MARK = ZERO_MARK;
  const VS_MARK = PLANETS.find(m => m.id === "bnote-planet-voidscape"); // the bench and run console sit beside it
  B.VS_MARK = VS_MARK;
  const HL_MARK = PLANETS.find(m => m.id === "bnote-planet-heavylight"); // zone art sits around it (zones.js)
  B.HL_MARK = HL_MARK;
  const CONC_MARK = PLANETS.find(m => m.id === "bnote-planet-conclusus");
  B.CONC_MARK = CONC_MARK;

  /* ---- setting switch: swallowed by a black hole, then elsewhere ---- */
  const XSTAGE = { CLOSE: 0, HOLD: 1, OPEN: 2 };
  B.XSTAGE = XSTAGE;
  const CLOSE_DUR = 0.85, HOLD_DUR = 0.30, OPEN_DUR = 0.80;
  B.CLOSE_DUR = CLOSE_DUR; B.HOLD_DUR = HOLD_DUR; B.OPEN_DUR = OPEN_DUR;
  B.xswitch = null; // { stage, t, cx, cy }
  B.ship = window.Voidship ? Voidship.create() : null;
  if (!window.Voidship) {
    console.error("voidship.js did not load — travel is dead");
  } else {
    Voidship.resize(B.ship, B.W, B.H);
  }

  document.addEventListener("xp:freeze", e => {
    B.frozen = !!e.detail.on;
    clearTimeout(freezeGuard);
    // nothing is allowed to stop the world indefinitely: if a claim
    // never reports back, the scene starts itself again
    if (B.frozen) freezeGuard = setTimeout(() => {
      if (B.frozen) { B.frozen = false; host.classList.remove("held"); console.warn("scene un-held by guard"); }
    }, 5000);
    host.classList.toggle("held", B.frozen);
    if (B.frozen) {
      B.vel = 0;
      if (B.ship) Voidship.setThrusting(B.ship, false);
    }
  });

  const cursor = document.getElementById("bridge-cursor");
  B.cursor = cursor;

  /* Under 900px — and on a landscape phone, which is wide but short — the
     note is a sheet pinned by CSS, not a panel placed by us. */
  const sheetQ = matchMedia("(max-width: 900px), (max-height: 520px) and (pointer: coarse)");
  B.sheet = sheetQ.matches;
  const onSheet = e => { B.sheet = e.matches; };
  if (sheetQ.addEventListener) sheetQ.addEventListener("change", onSheet);
  else sheetQ.addListener(onSheet);

  /* CAM.viewUnits is the world's layout unit and never moves — the beacon
     offsets in MARKS are measured in it. What we PAINT eases down on narrow
     screens: at 2100 a landscape phone would be shown the scene at a third
     of desktop density. Unchanged above ~1438px, floored at 1250. A phone
     pulls the camera back again on top of that, because the ship filling
     a 390px-tall screen leaves nowhere to see what is coming. */
  const PHONE_ZOOM = 1.5;
  /* the ship is drawn at a fixed pixel length, so pulling the camera back
     by PHONE_ZOOM made it bigger relative to everything else, not smaller.
     Captured from BASE rather than written out, so a size changed there
     still decides what a phone gets. */
  const SHIP_SIZE = (window.Voidship && window.Voidship.BASE.size) || 320;
  /* The W*1.46 squeeze exists so a phone's narrow viewport still shows a
     useful slice of world either side of the ship. A desktop never needed
     it: applying it there magnified everything painted in the canvas while
     the instrument banks stayed 352x260, which read as the banks shrinking.
     Desktop goes back to the flat layout unit. */
  const viewUnitsNow = () => {
    if (!B.phone) return CAM.viewUnits;
    return Math.max(1250, Math.min(CAM.viewUnits * PHONE_ZOOM, B.W * 1.46 * PHONE_ZOOM));
  };
  B.viewUnitsNow = viewUnitsNow;
  const scale = () => B.W / viewUnitsNow();
  B.scale = scale;
  const wx = (worldX, par) => (worldX - B.camX) * par * scale() + B.W * 0.5;
  B.wx = wx;
  const onScreen = (x, pad) => x > -pad && x < B.W + pad;
  B.onScreen = onScreen;
  /* a node coming into range leaves its root beacon and steps out to
     its own spot — FLY_STEPS positions over FLY_DUR, not a smooth tween,
     so it reads as a signal jumping and costs nothing extra per frame */
  const FLY_DUR = 0.66, FLY_STEPS = 6, FLY_GAP = 0.16;
  B.FLY_DUR = FLY_DUR; B.FLY_GAP = FLY_GAP;
  /* a node revealed off-screen doesn't fly (its flight would happen out
     of view); an edge chevron points at it until it has been seen once */
  const CUE_PULSE = 6;   // seconds a direction cue pulses before settling to a steady dim mark
  B.CUE_PULSE = CUE_PULSE;
  const ART_FADE = 1.6;   // seconds a newly earned node's world art takes to fade in
  B.ART_FADE = ART_FADE;
  function flyK(m) {
    const raw = Math.min(1, Math.max(0, m.fly.t / FLY_DUR));
    const k = Math.floor(raw * FLY_STEPS) / FLY_STEPS;
    return 1 - (1 - k) * (1 - k);
  }
  B.flyK = flyK;
  const markScreen = m => {
    const x = wx(m.x, m.par), y = m.oy * B.H;
    if (!m.fly) return { x, y };
    const a = markScreen(m.fly.from), k = flyK(m);
    return { x: a.x + (x - a.x) * k, y: a.y + (y - a.y) * k };
  };
  B.markScreen = markScreen;


  /* ---- starting ---- */
  function begin() {
    if (B.started) return;
    B.started = true;
    B.visible = true;
    host.classList.add("live");
    resize();
    if (B.ship) {
      Voidship.resize(B.ship, B.W, B.H);
      B.ship.bob = 0;
    }
  }
  B.begin = begin;

  // path-projects is awarded from intro.js (click or visiting #work)
})();
