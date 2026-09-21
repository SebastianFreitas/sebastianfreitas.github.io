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

  const ctx = cv.getContext("2d");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* reduced-motion used to skip the frame loop and blank the span on
     http:// in Firefox while file:// still looked fine — same files.
     The loop always runs; we only soften travel when reduced. */

  /* ---- the map, borrowed from world.js ---- */
  const SLOT   = World.SLOT;
  const LAND   = World.LAND;
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
  // the void map's own bounds, saved so switching sectors and back
  // doesn't need to recompute them
  const VOID_MIN = CAM.min, VOID_MAX = CAM.max;

  const MARKS = [
    { id: "bnote-future",  cam: LAND.future,   off: -0.20, oy: 0.26, par: 0.30, xp: 1,
      name: "The Unwritten",  sub: "West of the last recorded thing" },
    { id: "bnote-land",    cam: LAND.mainland, off:  0.22, oy: 0.40, par: 0.66, xp: 1,
      name: "The Mainland",   sub: "Born of a war between souls" },
    { id: "bnote-void",    cam: LAND.voidmark, off:  0.08, oy: 0.20, par: 0.30, xp: 1,
      name: "The Void",       sub: "The uncertainty of reality itself" },
    { id: "bnote-bridge",  cam: LAND.bridge,   off:  0.16, oy: 0.46, par: 0.94, xp: 1,
      name: "The Bridge",     sub: "First law. It holds because it must" },
    { id: "bnote-watcher", cam: LAND.watcher,  off:  0.23, oy: 0.30, par: 0.24, xp: 1,
      name: "The Watcher",    sub: "It holds the void off Rex" },
    { id: "bnote-rex",     cam: LAND.rex,      off: -0.21, oy: 0.42, par: 0.62, xp: 1,
      name: "Rex",            sub: "Three masses, three layers, one war" },
    { id: "bnote-root",    cam: CAM.max,       off: -0.10, oy: 0.24, par: 0.70, xp: 1,
      name: "The Root",       sub: "Every arm of it is still climbing" },
  ];
  MARKS.forEach((m, i) => {
    m.x = m.cam + (m.off * CAM.viewUnits) / m.par;
    m.phase = i * 1.7;    // so they don't all blink together
    m.vis = 0;            // eased in as they enter the frame
    m.pop = 0;            // the burst when one is claimed
  });
  /* the lamp's own radius is tuned for a mouse; a fingertip on a zoomed-out
     phone needs a wider net or you sail straight past what you were aiming at */
  const HIT_BASE = (window.Beacon && Beacon.HIT) || 26;
  let HIT = HIT_BASE;
  if (!window.Beacon) {
    console.error("lamp.js did not load — canvas marks and claim flights are dead");
  }

  /* ---- the other setting: Game Dev sector -----------------
     Same ship, same bridge deck, a different span. Four bodies,
     left to right, one per shipped project — beacons like the
     lamps on the span, filed the same way. Some of them open out
     into further nodes once reached (see depths.js). ---- */
  const GD_SLOT = SLOT;
  const gdAt = i => i * GD_SLOT;
  const GD_LAND = {
    entry:      gdAt(2),
    zero:       gdAt(10),
    voidscape:  gdAt(21),
    heavylight: gdAt(32),
    conclusus:  gdAt(43),
    exit:       gdAt(48),
  };
  const GD_BOUNDS = { min: gdAt(0.6), max: gdAt(49) };

  const PLANETS = [
    { id: "bnote-planet-zero",       cam: GD_LAND.zero,       off: -0.06, oy: 0.34, par: 0.7, xp: 1,
      theme: "zero",       size: 1.25, name: "Sector Zero", sub: "Horror — the console is the weapon" },
    { id: "bnote-planet-voidscape",  cam: GD_LAND.voidscape,  off:  0.05, oy: 0.28, par: 0.7, xp: 1,
      theme: "voidscape",  size: 1.15, name: "VoidScape",   sub: "Roguelike — a skill-scaled loop" },
    { id: "bnote-planet-heavylight", cam: GD_LAND.heavylight, off: -0.04, oy: 0.42, par: 0.7, xp: 1,
      theme: "heavylight", size: 0.95, name: "HeavyLight",  sub: "Puzzle — light carries momentum" },
    { id: "bnote-planet-conclusus",  cam: GD_LAND.conclusus,  off:  0.06, oy: 0.30, par: 0.7, xp: 1,
      theme: "conclusus",  size: 1.05, name: "Conclusus",   sub: "30 levels on the HeavyLight base" },
  ];
  PLANETS.forEach((m, i) => {
    m.x = m.cam + (m.off * CAM.viewUnits) / m.par;
    m.phase = i * 1.7 + 4;
    m.vis = 0;
    m.pop = 0;
  });
  if (!window.Planet) {
    console.error("planet.js did not load — game dev sector has nothing to draw");
  }
  if (!window.Depths) {
    console.error("depths.js did not load — no beacon will open into further nodes");
  }

  /* ---- canvas ---- */
  let W = 0, H = 0, dpr = 1;
  let ship = null;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = host.clientWidth; H = host.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // seat the voidship under the boot veil so it never pops in later
    if (ship) Voidship.resize(ship, W, H);
  }
  addEventListener("resize", resize);
  resize();

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
  const approach = (cur, tgt, rate, dt) => cur + (tgt - cur) * Math.min(1, dt * rate);

  /* ---- defer interaction until the gate picks a path ---- */
  let loopOn = false, bridgeReady = false, visible = true;
  /* Portrait on a touch device: the hero is covered by #bridge-rotate, so
     nothing behind it is worth a frame. Same gate as `visible`. */
  const portraitQ = matchMedia("(orientation: portrait) and (pointer: coarse)");
  let portrait = portraitQ.matches;
  /* A landscape phone is WIDE — 780 to 930px — so every max-width breakpoint
     sails straight past it. Height and a coarse pointer are what actually
     name a phone here, and the stylesheet uses the same two. */
  const phoneQ = matchMedia("(max-height: 520px) and (pointer: coarse)");
  let phone = phoneQ.matches;

  function syncPhone() {
    phone = phoneQ.matches;
    LOG_MAX = phone ? 3 : 6;
    HIT = HIT_BASE * (phone ? 1.7 : 1);
    if (window.Voidship) window.Voidship.BASE.size = phone ? Math.round(SHIP_SIZE / PHONE_ZOOM) : SHIP_SIZE;
    if (window.Instruments) Instruments.setCompact(phone);
  }
  function onPhoneChange() { syncPhone(); if (window.__bridgeRefit) window.__bridgeRefit(); }
  if (phoneQ.addEventListener) phoneQ.addEventListener("change", onPhoneChange);
  else phoneQ.addListener(onPhoneChange);
  const rotateEl = document.getElementById("bridge-rotate");
  if (rotateEl) rotateEl.setAttribute("aria-hidden", String(!portrait));
  let armed = false, idleTimer = 0;   // an rAF callback is pending / an idle wake is pending
  let entered = false, preloaded = false;   // gate lifted / first still frame drawn

  function readyBridge() {
    if (bridgeReady) return;
    bridgeReady = true;
    begin();
    applyPendingView();
    applyPendingMode();
    saveView();
  }

  function startLoop() {
    if (loopOn) { unpark(); return; }
    if (!entered) return;
    if (!visible || portrait || document.hidden) return;
    loopOn = true;
    last = performance.now();
    prevStamp = -1;                   // the gap while stopped isn't a refresh
    refreshCount = 2 * refreshN;      // first callback paints
    paintDue = 0;                     // and isn't a missed paint either
    armed = false;
    arm();
  }

  /* One pending callback at a time, whoever asks. Without this a wake that
     races the idle timer would leave two chains running side by side. */
  function arm() {
    if (armed) return;
    armed = true;
    requestAnimationFrame(frame);
  }
  /* Idle: let go of the frame callback entirely and come back on a timer.
     Holding an rAF chain open costs the same whether it paints or not. */
  function parkIdle() {
    if (idleTimer) return;
    idleTimer = setTimeout(() => { idleTimer = 0; arm(); }, IDLE_PARK_MS);
  }
  function unpark() {
    if (!idleTimer) return;
    clearTimeout(idleTimer);
    idleTimer = 0;
    arm();
  }

  /* the gate sits over one still frame; the loop only starts on site:enter */
  document.addEventListener("site:preload", () => {
    preloaded = true;
    paintOnce();
  });
  function repaintUnderGate() {
    if (preloaded && !entered) paintOnce();
  }
  // a resize clears the canvas; late images and fonts change the picture
  addEventListener("resize", repaintUnderGate);
  addEventListener("load", repaintUnderGate);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(repaintUnderGate);

  let pendingMode = null, pendingView = null, pendingQuiet = false;
  document.addEventListener("site:enter", e => {
    entered = true;
    startLoop();
    pendingMode = e.detail && e.detail.mode || null;
    pendingView = e.detail && e.detail.view || null;
    pendingQuiet = !!(e.detail && e.detail.entry && e.detail.entry !== "gate");
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
  let camX = LAND.bridge, vel = 0, travelled = 0, t = 0;
  let catalogued = 4182993201, started = false;
  let activeMark = null, hoverMark = null;
  let chaosNow = 0, futureNow = 0;
  let frozen = false;
  let freezeGuard = null;

  /* ---- setting: which map is currently under the bridge ---- */
  let sceneMode = "void";                 // "void" | "gamedev"
  let savedVoidCamX = LAND.bridge;
  let savedGDCamX = GD_LAND.entry;
  const activeMarks = () => sceneMode === "gamedev" ? PLANETS : MARKS;

  /* ---- setting switch: swallowed by a black hole, then elsewhere ---- */
  const XSTAGE = { CLOSE: 0, HOLD: 1, OPEN: 2 };
  const CLOSE_DUR = 0.85, HOLD_DUR = 0.30, OPEN_DUR = 0.80;
  let xswitch = null; // { stage, t, cx, cy }
  ship = window.Voidship ? Voidship.create() : null;
  if (!window.Voidship) {
    console.error("voidship.js did not load — travel is dead");
  } else {
    Voidship.resize(ship, W, H);
  }

  document.addEventListener("xp:freeze", e => {
    frozen = !!e.detail.on;
    clearTimeout(freezeGuard);
    // nothing is allowed to stop the world indefinitely: if a claim
    // never reports back, the scene starts itself again
    if (frozen) freezeGuard = setTimeout(() => {
      if (frozen) { frozen = false; host.classList.remove("held"); console.warn("scene un-held by guard"); }
    }, 5000);
    host.classList.toggle("held", frozen);
    if (frozen) {
      vel = 0;
      if (ship) Voidship.setThrusting(ship, false);
    }
  });

  const cursor = document.getElementById("bridge-cursor");

  /* Under 900px — and on a landscape phone, which is wide but short — the
     note is a sheet pinned by CSS, not a panel placed by us. */
  const sheetQ = matchMedia("(max-width: 900px), (max-height: 520px) and (pointer: coarse)");
  let sheet = sheetQ.matches;
  const onSheet = e => { sheet = e.matches; };
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
  const SHIP_SIZE = (window.Voidship && window.Voidship.BASE.size) || 72;
  /* The W*1.46 squeeze exists so a phone's narrow viewport still shows a
     useful slice of world either side of the ship. A desktop never needed
     it: applying it there magnified everything painted in the canvas while
     the instrument banks stayed 352x260, which read as the banks shrinking.
     Desktop goes back to the flat layout unit. */
  const viewUnitsNow = () => {
    if (!phone) return CAM.viewUnits;
    return Math.max(1250, Math.min(CAM.viewUnits * PHONE_ZOOM, W * 1.46 * PHONE_ZOOM));
  };
  const scale = () => W / viewUnitsNow();
  const wx = (worldX, par) => (worldX - camX) * par * scale() + W * 0.5;
  const fmt = n => Math.round(n).toLocaleString("en-US");
  const onScreen = (x, pad) => x > -pad && x < W + pad;
  /* a node coming into range leaves its root beacon and steps out to
     its own spot — FLY_STEPS positions over FLY_DUR, not a smooth tween,
     so it reads as a signal jumping and costs nothing extra per frame */
  const FLY_DUR = 0.66, FLY_STEPS = 6, FLY_GAP = 0.16;
  /* a node revealed off-screen doesn't fly (its flight would happen out
     of view); an edge chevron points at it until it has been seen once */
  const CUE_PULSE = 6;   // seconds a direction cue pulses before settling to a steady dim mark
  const ART_FADE = 1.6;   // seconds a newly earned node's world art takes to fade in
  function flyK(m) {
    const raw = Math.min(1, Math.max(0, m.fly.t / FLY_DUR));
    const k = Math.floor(raw * FLY_STEPS) / FLY_STEPS;
    return 1 - (1 - k) * (1 - k);
  }
  const markScreen = m => {
    const x = wx(m.x, m.par), y = m.oy * H;
    if (!m.fly) return { x, y };
    const a = markScreen(m.fly.from), k = flyK(m);
    return { x: a.x + (x - a.x) * k, y: a.y + (y - a.y) * k };
  };


  /* ---- starting ---- */
  function begin() {
    if (started) return;
    started = true;
    visible = true;
    host.classList.add("live");
    resize();
    if (ship) {
      Voidship.resize(ship, W, H);
      ship.bob = 0;
    }
  }

  // path-projects is awarded from intro.js (click or visiting #work)

  /* ---- notes ---- */
  const noteEls = {};
  MARKS.concat(PLANETS).forEach(m => noteEls[m.id] = document.getElementById(m.id));
  const noteCat = document.getElementById("bnote-cat");
  let noteTimer = null;

  /* the hero's page box, read once per layout change instead of per frame
     or per pointer event */
  let hostRect = null;
  function hostBox() {
    return hostRect || (hostRect = host.getBoundingClientRect());
  }
  const dropHostRect = () => { hostRect = null; };
  addEventListener("resize", dropHostRect);
  addEventListener("scroll", dropHostRect, { passive: true, capture: true });
  addEventListener("load", dropHostRect);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(dropHostRect);
  if ("ResizeObserver" in window) new ResizeObserver(dropHostRect).observe(host);

  /* a closed panel must not keep a clip decoding or a WebGL build running */
  function stopNoteMedia(el2) {
    el2.querySelectorAll("video").forEach(v => { if (!v.paused) v.pause(); });
    if (window.Embed) Embed.reset(el2);
  }
  function showNote(mark) {
    clearTimeout(noteTimer);
    for (const k in noteEls) {
      const e = noteEls[k];
      if (e && e.classList.contains("show") && k !== (mark && mark.id)) stopNoteMedia(e);
      if (e) e.classList.remove("show");
    }
    if (!mark) return;
    const el2 = noteEls[mark.id];
    if (!el2) return;
    noteTimer = setTimeout(() => {
      measureNote(el2);
      placeNote(el2, mark);
      el2.classList.add("show");
      if (mark.id === "bnote-land" && noteCat) noteCat.textContent = fmt(catalogued);
    }, 280);
  }
  /* offsetWidth/Height force layout; the panel only changes size on a
     resize or when it opens, so it's measured then */
  function measureNote(el2) {
    el2._pw = el2.offsetWidth || 380;
    el2._ph = el2.offsetHeight || 260;
  }
  addEventListener("resize", () => {
    for (const k in noteEls) if (noteEls[k]) measureNote(noteEls[k]);
  });
  /* put the panel next to the beacon it belongs to, on whichever side
     has room, clamped so it never leaves the hero */
  function placeNote(el2, mark) {
    if (!el2 || !mark) return;
    if (sheet) {
      /* CSS owns the position now; clear ours or the stale inline left/top
         would keep winning over the sheet rule. */
      if (el2._left != null) {
        el2.style.left = ""; el2.style.top = "";
        el2._left = null; el2._top = null;
      }
      el2.classList.remove("from-left");
      return;
    }
    if (el2._pw == null) measureNote(el2);
    const p = markScreen(mark);
    const pw = el2._pw, ph = el2._ph;
    const pad = 22, edge = 20;
    const right = p.x + pad + pw < W - edge;
    let left = right ? p.x + pad : p.x - pad - pw;
    left = Math.min(W - pw - edge, Math.max(edge, left));
    let top = p.y - ph * 0.45;
    top = Math.min(H - ph - edge, Math.max(edge + 40, top));
    left = Math.round(left); top = Math.round(top);
    if (el2._left !== left) { el2.style.left = left + "px"; el2._left = left; }
    if (el2._top  !== top)  { el2.style.top  = top + "px";  el2._top  = top; }
    el2.classList.toggle("from-left", !right);
  }

  /* claiming fires when the voidship reaches the beacon — both sectors
     file the same way. In the game dev sector, filing one can bring
     more into range. */
  function selectMark(m) {
    begin();
    hintDone("beacon");
    if (!(window.XP && XP.has("beacon-" + m.id))) m.pop = 1;
    if (window.XP) {
      const p = markScreen(m), r = hostBox();
      XP.award("beacon-" + m.id, m.xp, m.name, r.left + p.x, r.top + p.y);
    }
    if (sceneMode === "gamedev") {
      pushLog(`docking: ${m.name.toLowerCase()} +${m.xp}`, "good");
    } else {
      pushLog(`filed: ${m.name.toLowerCase()} +${m.xp}`, "good");
    }
    revealDepths(true);
    activeMark = m;
    showNote(m);
    if (ship) {
      Voidship.setThrusting(ship, false);
      Voidship.clearCourse(ship);
      // a real stop, not just the mirrored HUD value — otherwise residual
      // ship.vel survives the claim and the hull keeps drifting for a beat
      ship.vel = 0;
      ship.vy = 0;
    }
    vel = 0;
  }
  function clearMark() { if (activeMark) { activeMark = null; showNote(null); } }

  /* ---- the hint: names one thing at a time, then goes away ---- */
  const HINT_KEY = "arcanis.hints.v2";
  const HINT_STEPS = [
    { id: "burn",   text: "Hold anywhere to burn the voidship toward it" },
    { id: "beacon", text: "Click a beacon to set course — contact files it" },
    { id: "fuel",   text: "Fuel refills when you stop burning" },
  ];
  const hintEl = document.getElementById("bridge-hint");
  let hintsDone = {};
  try { hintsDone = JSON.parse(localStorage.getItem(HINT_KEY) || "{}"); } catch (e) {}

  function paintHint() {
    if (!hintEl) return;
    const next = HINT_STEPS.find(h => !hintsDone[h.id]);
    if (!next) { hintEl.classList.add("retired"); return; }
    if (hintEl.textContent !== next.text) {
      hintEl.classList.add("fading");
      setTimeout(() => { hintEl.textContent = next.text; hintEl.classList.remove("fading"); }, 260);
    }
  }
  function hintDone(id) {
    if (hintsDone[id]) return;
    hintsDone[id] = true;
    try { localStorage.setItem(HINT_KEY, JSON.stringify(hintsDone)); } catch (e) {}
    paintHint();
  }
  paintHint();

  /* ---- input: burn the voidship toward the pointer ----------
     Click empty space or a beacon to set course. Hold to keep
     the throttle open (speed builds). Release and the drive
     brakes onto the mark. Beacons file on hull contact.
  --------------------------------------------------------- */
  const DRAG_PAR = 0.94;
  const worldPerPx = () => 1 / (scale() * DRAG_PAR);

  function markAt(clientX, clientY) {
    const r = hostBox();
    const px = clientX - r.left, py = clientY - r.top;
    let best = null, bestD = HIT;
    for (const m of activeMarks()) {
      if (m.fly) continue;
      const p = markScreen(m);
      const d = Math.hypot(px - p.x, py - p.y);
      if (d < bestD) { best = m; bestD = d; }
    }
    return best;
  }

  function clientToCourse(clientX, clientY) {
    const r = hostBox();
    const px = clientX - r.left;
    const py = clientY - r.top;
    const worldX = camX + (px - W * 0.5) * worldPerPx();
    const mid = H * 0.42;
    const band = H * ((window.Voidship && Voidship.BASE.yBand) || 0.16);
    const screenY = Math.min(mid + band, Math.max(mid - band, py));
    return { worldX, screenY, px, py };
  }

  /* beacons are drawn at m.x (parallax), not m.cam — course must match
     the light on screen or the ship peels off toward the wrong seat. */
  function courseForMark(m) {
    const mid = H * 0.42;
    const band = H * ((window.Voidship && Voidship.BASE.yBand) || 0.24);
    // prefer the true beacon seat; clamp only if it sits outside the band
    const rawY = m.oy * H;
    const screenY = Math.min(mid + band, Math.max(mid - band, rawY));
    return { worldX: m.x, screenY };
  }

  function stopSteering() { if (cursor) cursor.classList.remove("on"); }

  let thrustId = null;
  let lastPtr = { x: 0, y: 0 };
  let fuelWarned = false;
  let courseArmAt = 0; // ignore contact briefly after locking a course

  function beginBurn(e, mark) {
    if (!ship) return;
    begin();
    clearMark();
    lastPtr.x = e.clientX;
    lastPtr.y = e.clientY;
    const c = clientToCourse(e.clientX, e.clientY);
    if (mark) {
      const seat = courseForMark(mark);
      Voidship.setCourse(ship, seat.worldX, seat.screenY, mark);
      courseArmAt = performance.now() + 180; // ship must actually move in
      pushLog(`course: ${mark.name.toLowerCase()}`, "loc");
      hintDone("beacon");
    } else {
      Voidship.setCourse(ship, c.worldX, c.screenY, null);
      courseArmAt = 0;
      hintDone("burn");
    }
    Voidship.setThrusting(ship, true);
    thrustId = e.pointerId;
    host.classList.add("burning");
    try { host.setPointerCapture(e.pointerId); } catch (err) {}
  }

  function endBurn(e) {
    if (thrustId == null) return;
    if (e && e.pointerId != null && e.pointerId !== thrustId) return;
    thrustId = null;
    host.classList.remove("burning");
    if (ship) {
      Voidship.setThrusting(ship, false);
      // free-hold at real speed is a heading, not a destination — the
      // "target" while steering is just wherever the click happened to
      // land, so seeking it on release could mean sailing past it and
      // swinging back. Above coastAbove, drop it and just coast onward
      // in whatever direction we were already going. A beacon lock or
      // a slow/quick tap still seeks its point normally.
      if (!ship.courseMark && Math.abs(ship.vel) > Voidship.BASE.coastAbove) {
        Voidship.clearCourse(ship);
      }
    }
    // a tap on nothing with almost no burn dismisses a note
    if (ship && ship.arrived) clearMark();
  }

  /* while locked on a beacon, keep re-asserting its true seat (cheap —
     the mark doesn't move) so a stale click position never wins. Free
     steering (no beacon) doesn't need this: the ship reads the live
     pointer offset directly every frame (see aimFromPointer below),
     so there's no world-space target to keep re-planting ahead of the
     camera — that was the source of the old "carrot" runaway. */
  function retargetFromPointer() {
    if (!ship || thrustId == null || !ship.thrusting || !ship.courseMark) return;
    const seat = courseForMark(ship.courseMark);
    Voidship.setCourse(ship, seat.worldX, seat.screenY, ship.courseMark);
  }

  /* live screen-space thrust stick for free-hold steering: the pointer's
     position relative to the hero, read fresh every frame. No world
     coordinates involved, so there's nothing to go stale or overshoot. */
  function aimFromPointer() {
    if (!ship || thrustId == null || !ship.thrusting || ship.courseMark) return null;
    const r = hostBox();
    return { px: lastPtr.x - r.left, py: lastPtr.y - r.top };
  }

  host.addEventListener("pointerdown", e => {
    if (frozen || xswitch || document.body.classList.contains("site-frozen")) return;
    // note panels scroll and hold clips, so a press inside one belongs to the panel, not a burn
    if (e.target.closest && e.target.closest("a, button, #bridge-map, #bridge-term, #bridge-sys, #bridge-log, .bcn, .bnote")) return;
    const m = markAt(e.clientX, e.clientY);
    beginBurn(e, m);
  });

  addEventListener("pointermove", e => {
    const r = hostBox();
    const inside = e.clientY >= r.top && e.clientY <= r.bottom;

    if (cursor) {
      if (inside || thrustId != null) {
        cursor.classList.add("on");
        cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      } else cursor.classList.remove("on");
    }

    if (thrustId != null && e.pointerId === thrustId && ship) {
      lastPtr.x = e.clientX;
      lastPtr.y = e.clientY;
      const m = markAt(e.clientX, e.clientY);
      if (m) {
        if (ship.courseMark !== m) courseArmAt = performance.now() + 180;
        const seat = courseForMark(m);
        Voidship.setCourse(ship, seat.worldX, seat.screenY, m);
      } else if (!ship.courseMark) {
        const c = clientToCourse(e.clientX, e.clientY);
        Voidship.setCourse(ship, c.worldX, c.screenY, null);
      }
      return;
    }

    if (!inside) { hoverMark = null; if (cursor) cursor.classList.remove("over"); return; }
    hoverMark = markAt(e.clientX, e.clientY);
    if (cursor) cursor.classList.toggle("over", !!hoverMark);
  }, { passive: true });

  addEventListener("pointerup", endBurn);
  addEventListener("pointercancel", () => { endBurn(); stopSteering(); });
  document.documentElement.addEventListener("mouseleave", stopSteering);
  addEventListener("blur", () => { endBurn(); stopSteering(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { endBurn(); stopSteering(); }
    else startLoop();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(es => {
      visible = es[0].isIntersecting;
      if (!visible) { endBurn(); stopSteering(); }
      else startLoop();
    }, { threshold: 0.02 }).observe(host);
  }

  /* Rotating out of portrait: the hero has a new size and a loop to restart.
     Rotating in: drop any burn or steer in progress so nothing is still held
     down behind the notice. */
  const onPortrait = e => {
    portrait = e.matches;
    if (rotateEl) rotateEl.setAttribute("aria-hidden", String(!portrait));
    if (portrait) { endBurn(); stopSteering(); }
    else { resize(); startLoop(); }
  };
  if (portraitQ.addEventListener) portraitQ.addEventListener("change", onPortrait);
  else portraitQ.addListener(onPortrait);

  /* ---- minimap: readout only — no jump, no scrub ---- */
  const track = document.getElementById("btrack");
  const trackLabels = document.querySelectorAll("#bridge-map .labels span");

  function rebuildTrack() {
    if (!track) return;
    track.classList.add("readonly");
    track.querySelectorAll(".mk").forEach(el => el.remove());
    for (const m of activeMarks()) {
      const d = document.createElement("div");
      d.className = "mk poi";
      d.style.left = ((m.cam - CAM.min) / (CAM.max - CAM.min) * 100) + "%";
      d.title = m.name;
      d.dataset.mark = m.id;
      const done = !!(window.XP && XP.has("beacon-" + m.id));
      if (done) d.classList.add("read");
      track.appendChild(d);
    }
    for (let i = 0; i < 30; i++) {
      const d = document.createElement("div");
      d.className = "mk"; d.style.left = (i / 29 * 100) + "%";
      track.appendChild(d);
    }
  }
  rebuildTrack();
  if (track) {
    // ghost follows the pointer for orientation, but never moves the camera
    track.addEventListener("pointermove", e => {
      const ghost = document.getElementById("bghost");
      if (!ghost) return;
      const r = track.getBoundingClientRect();
      ghost.style.left = Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100)) + "%";
    });
  }
  document.addEventListener("xp:award", e => {
    if (!track || !/^beacon-/.test(e.detail.id)) return;
    const id = e.detail.id.replace(/^beacon-/, "");
    const d = track.querySelector(`[data-mark="${id}"]`);
    if (d) d.classList.add("read");
  });

  function syncLabels() {
    if (trackLabels.length < 2) return;
    if (sceneMode === "gamedev") {
      trackLabels[0].textContent = "West · Sector Zero";
      trackLabels[1].textContent = "East · Conclusus";
    } else {
      trackLabels[0].textContent = "West · the future";
      trackLabels[1].textContent = "East · the past";
    }
  }

  /* ---- markers ---- */
  let markDebug = 0;
  window.beaconReport = () => activeMarks().map(m => {
    const p = markScreen(m);
    return `${m.id}  x=${p.x.toFixed(0)} y=${p.y.toFixed(0)} vis=${(+m.vis).toFixed(2)} onscreen=${onScreen(p.x, 60)}`;
  }).join("\n") + `\ncamX=${camX.toFixed(0)} mode=${sceneMode} frozen=${frozen} W=${W} H=${H}`;
  window.depthsReport = () => MARKS.concat(PLANETS).filter(m => m.root).map(m => ({
    id: m.id, root: m.root, from: m.from, off: m.off, oy: m.oy, x: m.x, flying: !!m.fly, cue: !!m.unseen,
    wide: !!(noteEls[m.id] && noteEls[m.id].classList.contains("wide")),
  }));
  window.depthsReveal = () => revealDepths(true);   // debug: replay a live reveal (fly-out) without flying the ship
  window.depthAlpha = id => { const m = depthNodes.get(id); if (!m || m.fly) return 0; const k = m.shown; return k * k * (3 - 2 * k); };   // world.js multiplies a node's art by this — 0 while it flies, then eases to 1 (off-screen reveals are already 1)

  function drawCue(m, p, stack) {
    const right = p.x >= W;
    const side = right ? "r" : "l";
    const i = stack[side]++;
    const x = right ? W - 22 : 22;
    const y = Math.min(H - 40, Math.max(40, p.y)) + i * 26;
    const a = (m.cue < CUE_PULSE ? 0.55 + 0.35 * Math.sin(m.cue * 5) : 0.35) * Math.min(1, m.cue * 4);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgb(198,204,198)";
    ctx.beginPath();
    if (right) {
      ctx.moveTo(x + 7, y);
      ctx.lineTo(x - 4, y - 7);
      ctx.lineTo(x - 4, y + 7);
    } else {
      ctx.moveTo(x - 7, y);
      ctx.lineTo(x + 4, y - 7);
      ctx.lineTo(x + 4, y + 7);
    }
    ctx.closePath();
    ctx.fill();
    ctx.font = "11px ui-monospace, monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = right ? "right" : "left";
    ctx.fillText(m.name.toLowerCase(), right ? x - 10 : x + 10, y);
    ctx.restore();
  }

  /* the dashed line from the origin beacon toward an off-screen cue —
     drawn whether or not the origin beacon is itself on screen; the
     canvas simply clips the part that would fall outside it */
  function drawCueLine(m, p) {
    const a = markScreen(m.cueFrom);
    const k = (m.cue < CUE_PULSE ? 0.35 : 0.2) * Math.min(1, m.cue * 4);
    ctx.save();
    ctx.globalAlpha = k;
    ctx.strokeStyle = "rgb(198,204,198)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.lineDashOffset = -m.cue * 14;   // dashes crawl outward toward the target
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawMarks(dt) {
    let shown = 0;
    const gd = sceneMode === "gamedev";
    const cueStack = { l: 0, r: 0 };
    for (const m of activeMarks()) {
      if (m.fly) {
        m.fly.t += dt;
        if (m.fly.t >= FLY_DUR) { m.fly = null; m.pop = 1; }   // lands with the claim burst
        else if (m.fly.t < 0) continue;                       // still waiting its turn inside the root
      }
      const p = markScreen(m);
      if (m.unseen) {
        if (p.x > 0 && p.x < W) m.unseen = false;   // first sight just drops the cue — the node was already there
        else { m.cue += dt; drawCueLine(m, p); drawCue(m, p, cueStack); }
      }
      if (!m.fly && !m.unseen && m.shown < 1) m.shown = Math.min(1, m.shown + dt / ART_FADE);
      m.vis = approach(m.vis, onScreen(p.x, 60) ? 1 : 0, 3.2, dt);
      if (m.pop > 0) m.pop = Math.max(0, m.pop - dt * 1.6);
      if (m.vis < 0.02 && m.pop <= 0) continue;
      shown++;
      if (m.fly) {
        const a = markScreen(m.fly.from);
        ctx.save();
        ctx.globalAlpha = 0.35 * m.vis;
        ctx.strokeStyle = "rgb(198,204,198)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.restore();
      }
      if (gd && window.Planet) {
        Planet.draw(ctx, p.x, p.y, {
          t, phase: m.phase, alpha: m.vis,
          active: activeMark === m, hover: hoverMark === m,
          claimed: !!(window.XP && XP.has("beacon-" + m.id)),
          xp: m.xp,
          theme: m.theme, size: m.fly ? m.size * (0.35 + 0.65 * flyK(m)) : m.size, pop: m.pop, label: m.name,
        });
      } else if (!gd) {
        Beacon.draw(ctx, p.x, p.y, {
          t, phase: m.phase, alpha: m.vis,
          active: activeMark === m, hover: hoverMark === m,
          claimed: window.XP && XP.has("beacon-" + m.id),
          xp: m.xp, pop: m.pop, label: m.name,
        });
      }
    }
    // if none ever appear, say so once — beaconReport() has the detail
    if (!shown && markDebug < 4 && (markDebug += dt) >= 4)
      console.warn("no marks drawn in 4s — run beaconReport() for why");
  }

  /* ---- the readout: a log that keeps writing, instruments under it ---- */
  const el = { log: document.getElementById("btlog") };
  if (window.Instruments) {
    Instruments.mount(document.getElementById("binst"));
    Instruments.mountSys(document.getElementById("binst-sys"));
    const IK = "arcanis.inst.scale";
    const termEl = document.getElementById("bridge-term");
    const hero = document.getElementById("bridge-hero");

    /* the compact bank is one narrow column: give it a share of the height and
       a sliver of the width, and stop at 1. Half the panels means each
       survivor can afford to be read, so the shares are generous and the
       floor is above setScale's own clamp — a bank too small to read is
       worth less than a bank that crowds the log. */
    const fitScale = () => Math.max(0.55, Math.min(1,
      (innerHeight * 0.62) / Instruments.TOTAL_H,
      (innerWidth  * 0.26) / Instruments.TOTAL_W));

    /* setScale's own clamp went down to 0.45 so a compact phone bank could
       fit. The +/- buttons are desktop-only and used to bottom out at 0.7,
       so anything stored below that is the new clamp leaking, not a choice
       anyone made. The desktop keeps its old floor. */
    const DESK_MIN = 0.7;

    let stored = parseFloat(localStorage.getItem(IK));
    const deskScale = () => {
      if (Number.isFinite(stored)) return Math.max(DESK_MIN, stored);
      const maxW = termEl ? termEl.clientWidth : Instruments.TOTAL_W;
      return Math.min(1, maxW / Instruments.TOTAL_W);
    };

    /* the phone stylesheet floats the log clear of the banks off --inst-h,
       so both dimensions go out whenever the scale moves */
    const syncInstBox = () => {
      if (!hero) return;
      const s = Instruments.getScale();
      hero.style.setProperty("--inst-w", (Instruments.TOTAL_W * s) + "px");
      hero.style.setProperty("--inst-h", (Instruments.TOTAL_H * s) + "px");
    };

    const applyScale = () => {
      Instruments.setCompact(phone);
      Instruments.setScale(phone ? fitScale() : deskScale());
      syncInstBox();
    };
    applyScale();
    addEventListener("resize", applyScale);   // a rotate re-fits the banks
    window.__bridgeRefit = applyScale;

    const step = d => {
      const lo = phone ? 0.45 : DESK_MIN;
      stored = Instruments.setScale(Math.max(lo, Instruments.getScale() + d));
      syncInstBox();
      try { localStorage.setItem(IK, String(stored)); } catch (e) {}
    };
    const bindScale = (el, delta) => {
      if (!el) return;
      el.addEventListener("pointerdown", e => {
        e.preventDefault();
        e.stopPropagation();
        step(delta);
      });
    };
    bindScale(document.getElementById("binst-in"), 0.15);
    bindScale(document.getElementById("binst-out"), -0.15);
  }

  /* ---- setting panel: swap the map under the bridge -------
     Clicking the other setting doesn't just flip a class — the
     ship gets swallowed by a black hole (an iris closing on its
     own position), the map underneath changes while the screen
     is dark, and the iris opens back around the ship somewhere
     else entirely. ---- */
  const modesPanel = document.getElementById("bridge-modes");
  const modeBtns = modesPanel ? Array.from(modesPanel.querySelectorAll(".mode-btn")) : [];

  function syncModeButtons() {
    modeBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.mode === sceneMode));
  }

  function applySceneMode(target, opts) {
    if (sceneMode === "void") savedVoidCamX = camX; else savedGDCamX = camX;
    sceneMode = target;
    if (target === "gamedev") {
      CAM.min = GD_BOUNDS.min; CAM.max = GD_BOUNDS.max;
      camX = savedGDCamX;
    } else {
      CAM.min = VOID_MIN; CAM.max = VOID_MAX;
      camX = savedVoidCamX;
    }
    vel = 0;
    if (ship) { ship.vel = 0; ship.vy = 0; Voidship.clearCourse(ship); }
    clearMark();
    lastRegion = "";
    rebuildTrack();
    syncLabels();
    syncModeButtons();
    if (!(opts && opts.quiet))
      pushLog(target === "gamedev"
        ? "sector: game dev — four objects on approach"
        : "sector: the void — span resumes", "good");
    saveView();
  }

  function applyPendingMode() {
    if (!pendingMode || pendingMode === sceneMode) {
      pendingMode = null;
      return;
    }
    const mode = pendingMode;
    pendingMode = null;
    applySceneMode(mode, { quiet: pendingQuiet });
  }

  /* camera positions saved by this tab (Back / reload / same-tab return).
     Runs before applyPendingMode, while the void map is still loaded. */
  function applyPendingView() {
    const v = pendingView;
    pendingView = null;
    if (!v) return;
    const clampTo = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
    if (Number.isFinite(v.voidCamX)) camX = clampTo(v.voidCamX, VOID_MIN, VOID_MAX);
    if (Number.isFinite(v.gdCamX)) savedGDCamX = clampTo(v.gdCamX, GD_BOUNDS.min, GD_BOUNDS.max);
  }

  /* keys must match entry.js */
  const VIEW_KEY = "arcanis.view.v1", SECTOR_KEY = "arcanis.sector.v1";
  function saveView() {
    if (!entered) return;
    const view = {
      mode: xswitch ? xswitch.to : sceneMode,
      voidCamX: sceneMode === "void" ? camX : savedVoidCamX,
      gdCamX: sceneMode === "gamedev" ? camX : savedGDCamX,
    };
    try { sessionStorage.setItem(VIEW_KEY, JSON.stringify(view)); } catch (e) {}
    try { localStorage.setItem(SECTOR_KEY, view.mode); } catch (e) {}
  }
  addEventListener("pagehide", saveView);

  function beginModeSwitch(target) {
    if (xswitch || !target || target === sceneMode) return;
    begin();
    hintDone("beacon");
    clearMark();
    endBurn();
    stopSteering();
    if (ship) { Voidship.setThrusting(ship, false); Voidship.clearCourse(ship); ship.vel = 0; ship.vy = 0; }
    vel = 0;
    const p = ship ? Voidship.screenPos(ship, W) : { x: W * 0.5, y: H * 0.42 };
    xswitch = { stage: XSTAGE.CLOSE, t: 0, to: target, cx: p.x, cy: p.y };
    host.classList.add("warping");
    pushLog("drive: emergency fold engaged", "loc");
  }

  modeBtns.forEach(btn => {
    btn.addEventListener("pointerdown", e => e.stopPropagation());
    btn.addEventListener("click", () => {
      if (btn.dataset.mode !== sceneMode && !xswitch && window.XP) {
        const r = btn.getBoundingClientRect();
        const world = btn.dataset.mode === "void";
        XP.award(world ? "path-world" : "path-projects", 1, world ? "Setting" : "Game Dev",
                 r.left + r.width / 2, r.top + r.height / 2);
      }
      if (window.Genesis && Genesis.pending && !Genesis.active && btn.dataset.mode === "void") {
        Genesis.play({ thenMode: "void", thenCamX: LAND.bridge });
        return;
      }
      beginModeSwitch(btn.dataset.mode);
    });
  });
  const genesisBtn = document.getElementById("mode-genesis");
  if (genesisBtn) {
    genesisBtn.addEventListener("pointerdown", e => e.stopPropagation());
    genesisBtn.addEventListener("click", () => {
      if (!window.Genesis || Genesis.active) return;
      Genesis.play({
        thenMode: sceneMode,
        thenCamX: sceneMode === "void" ? LAND.bridge : camX,
      });
    });
  }

  /* On a phone the setting bar is folded away behind a gear (see bridge.css).
     The buttons stay in the DOM at all times — modeBtns was queried once at
     load — so this only ever toggles a class. */
  const gearBtn = document.getElementById("modes-gear");
  if (gearBtn && modesPanel) {
    /* the gear is unlabelled furniture until someone uses it once — the tip
       beside it says so, and stops saying so for good after the first open */
    const TIPK = "arcanis.gear.seen";
    let tipSeen = false;
    try { tipSeen = localStorage.getItem(TIPK) === "1"; } catch (_) {}
    if (tipSeen) modesPanel.classList.add("tip-done");
    const retireTip = () => {
      if (tipSeen) return;
      tipSeen = true;
      modesPanel.classList.add("tip-done");
      try { localStorage.setItem(TIPK, "1"); } catch (_) {}
    };
    const setOpen = on => {
      modesPanel.classList.toggle("open", on);
      gearBtn.setAttribute("aria-expanded", on ? "true" : "false");
      if (on) retireTip();
    };
    gearBtn.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); });
    gearBtn.addEventListener("click", e => {
      e.stopPropagation();
      setOpen(!modesPanel.classList.contains("open"));
    });
    // picking anything inside closes it, and so does a tap anywhere else
    modesPanel.querySelectorAll(".modes-btn").forEach(b =>
      b.addEventListener("click", () => setOpen(false)));
    document.addEventListener("pointerdown", e => {
      if (!modesPanel.contains(e.target)) setOpen(false);
    });
    addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });
  }

  document.addEventListener("site:genesis-start", () => {
    begin();
    host.classList.add("is-cinematic");
    endBurn();
    stopSteering();
    if (ship) {
      Voidship.setThrusting(ship, false);
      Voidship.clearCourse(ship);
      ship.vel = 0; ship.vy = 0;
      ship.alpha = 0;
    }
    vel = 0;
    clearMark();
  });

  document.addEventListener("site:genesis-done", e => {
    host.classList.remove("is-cinematic");
    const mode = (e.detail && e.detail.mode) || "void";
    const destCam = e.detail && e.detail.camX;
    if (mode !== sceneMode) applySceneMode(mode);
    if (destCam != null) camX = destCam;
    else if (mode === "void") camX = LAND.bridge;
    vel = 0;
    if (ship) {
      ship.vel = 0; ship.vy = 0;
      Voidship.clearCourse(ship);
      ship.alpha = 0;
    }
  });

  /* advances the switch sequence; returns true while it owns the frame
     (normal ship physics/input should stand down until it's done) */
  function stepSwitch(dt) {
    if (!xswitch) return false;
    xswitch.t += dt;
    if (ship) {
      ship.vel = 0; ship.vy = 0;
      ship.bob += dt;
      // keep the hole centred on wherever the ship actually sits on screen
      const p = Voidship.screenPos(ship, W);
      xswitch.cx = p.x; xswitch.cy = p.y;
    }
    if (xswitch.stage === XSTAGE.CLOSE && xswitch.t >= CLOSE_DUR) {
      applySceneMode(xswitch.to);
      xswitch.stage = XSTAGE.HOLD; xswitch.t = 0;
    } else if (xswitch.stage === XSTAGE.HOLD && xswitch.t >= HOLD_DUR) {
      xswitch.stage = XSTAGE.OPEN; xswitch.t = 0;
    } else if (xswitch.stage === XSTAGE.OPEN && xswitch.t >= OPEN_DUR) {
      host.classList.remove("warping");
      xswitch = null;
    }
    return true;
  }

  /* an iris around (cx,cy): everywhere outside radius r goes black.
     Closing (dir "in") reads as the dark swallowing the scene down
     to the ship; opening (dir "out") reads as the ship arriving and
     the new scene expanding out from it. */
  function drawIris(cx, cy, r, opts) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#04050a";
    ctx.fillRect(0, 0, W, H);
    if (r > 0.5) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }
    const a = opts.glow || 0;
    if (r > 1 && a > 0.02) {
      ctx.strokeStyle = `rgba(245,208,107,${0.32 * a})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.stroke();
      ctx.strokeStyle = `rgba(176,104,90,${0.18 * a})`;
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, 6.283); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(222,232,228,${0.16 * a})`;
      const inward = opts.dir === "in";
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * 6.283 + t * (opts.spin || 0);
        const r0 = inward ? r + 46 + (i % 3) * 18 : Math.max(4, r - 40 - (i % 3) * 16);
        const r1 = inward ? r + 12 : Math.max(2, r - 8);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
        ctx.lineTo(cx + Math.cos(ang + 0.35) * r1, cy + Math.sin(ang + 0.35) * r1);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawSwitchFX() {
    if (!xswitch) return;
    const { stage, t: xt, cx, cy } = xswitch;
    const rMax = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 40;
    if (stage === XSTAGE.CLOSE) {
      const u = smooth(Math.min(1, xt / CLOSE_DUR));
      drawIris(cx, cy, rMax * (1 - u), { glow: u, dir: "in", spin: 0.6 });
    } else if (stage === XSTAGE.HOLD) {
      drawIris(cx, cy, 0, { glow: 0 });
      const u = xt / HOLD_DUR;
      const flash = u < 0.5 ? smooth(u / 0.5) : smooth(1 - (u - 0.5) / 0.5);
      if (flash > 0.02) {
        ctx.fillStyle = `rgba(255,250,235,${flash * 0.3})`;
        ctx.fillRect(0, 0, W, H);
      }
    } else {
      const u = smooth(Math.min(1, xt / OPEN_DUR));
      drawIris(cx, cy, rMax * u, { glow: 1 - u, dir: "out", spin: -0.6 });
    }
  }

  let LOG_MAX = 6;
  let logHead = null, logQueue = [], nextIdle = 3.5;

  function pushLog(text, kind) {
    if (!el.log) return;
    logQueue.push({ text, kind: kind || "" });
    if (logQueue.length > LOG_MAX + 2) logQueue.splice(0, logQueue.length - (LOG_MAX + 2));
  }

  /* ---- the depths -------------------------------------------
     Some nodes are not on the map when you arrive. They come into
     range when the ones they hang off have been filed — one node,
     or several wired together. depths.js holds the graph; all this
     does is place what the graph says has been earned. Nodes hang
     off any beacon (root), placed relative to it; they fly out of
     it when earned live.
     State is the XP ledger, so it survives a reload for free. ---- */
  const spawned = new Set();
  const depthNodes = new Map();   // id -> spawned node, for depthAlpha()
  const DEPTH_OFF_MAX = 0.44, DEPTH_OY_MIN = 0.16, DEPTH_OY_MAX = 0.66;

  function spawnDepth(def, animate, delay) {
    const root = MARKS.concat(PLANETS).find(m => m.id === def.root);
    if (!root) return false;
    const origin = MARKS.concat(PLANETS).find(m => m.id === def.from) || root;   // the beacon that unlocked it, so the line leaves from there
    const list = MARKS.includes(root) ? MARKS : PLANETS;
    let off, oy, cam;
    if (def.at) {
      cam = def.at[0];
      off = 0;
      oy = def.at[1];
    } else {
      off = Math.min(DEPTH_OFF_MAX, Math.max(-DEPTH_OFF_MAX, root.off + def.dx));
      oy = Math.min(DEPTH_OY_MAX, Math.max(DEPTH_OY_MIN, root.oy + def.dy));
      cam = root.cam;
    }
    const node = {
      id: def.id, root: def.root, from: origin.id, cam: cam, off, oy, par: def.par || root.par,
      theme: def.theme, size: def.size, xp: def.xp,
      name: def.name, sub: def.sub,
    };
    node.x = node.cam + (off * CAM.viewUnits) / node.par;
    node.phase = list.length * 1.7 + 4;
    node.vis = 0;
    node.pop = 0;
    node.shown = animate ? 0 : 1;   // world-art alpha: a restore shows it at once, a live reveal fades it in
    if (animate) {
      if (onScreen(wx(node.x, node.par), 60)) node.fly = { from: origin, t: -(delay || 0) };
      else { node.shown = 1; node.cue = 0; node.unseen = true; node.cueFrom = origin; }   // off screen: the art is simply there; a cue points the way (see drawCue)
    }
    list.push(node);
    depthNodes.set(def.id, node);

    /* the panel is built here rather than sitting in index.html,
       so the markup can't be read ahead of being earned */
    const anchor = document.getElementById(def.root);
    if (anchor && anchor.parentNode && !document.getElementById(def.id)) {
      const aside = document.createElement("aside");
      aside.className = "bnote deep" + (def.wide ? " wide" : "");
      aside.id = def.id;
      aside.innerHTML = def.html;
      anchor.parentNode.appendChild(aside);
      noteEls[def.id] = aside;
    }
    spawned.add(def.id);
    return true;
  }

  /* run to a fixed point: a wave can satisfy the next one's
     prerequisites, which matters on a reload where the whole ledger
     is already there and every wave lands in the same pass */
  function revealDepths(animate) {
    if (!window.Depths) return;
    const defs = Depths.nodes();
    let added = 0, moved = true;
    while (moved) {
      moved = false;
      for (const d of defs) {
        if (spawned.has(d.id) || document.getElementById(d.id)) continue;
        if (!window.XP) return;
        if (!d.after.every(id => XP.has("beacon-" + id))) continue;
        if (spawnDepth(d, animate, added * FLY_GAP)) { moved = true; added++; }
      }
    }
    if (!added) return;
    rebuildTrack();
    if (animate) pushLog(`signal resolved — ${added} contact${added > 1 ? "s" : ""} in range`, "good");
  }

  revealDepths(false);
  addEventListener("pageshow", e => { if (e.persisted) revealDepths(false); });
  addEventListener("storage", () => revealDepths(false));

  function commitLog(entry) {
    /* the tiles flash with the line, not when it was queued */
    if (window.Instruments && Instruments.alert) Instruments.alert(entry.kind);
    const line = document.createElement("div");
    line.className = "tl " + entry.kind;
    el.log.appendChild(line);
    while (el.log.children.length > LOG_MAX) el.log.removeChild(el.log.firstChild);

    /* split into plain / numeric runs so the digits can carry weight */
    const parts = [];
    const re = /\d[\d,]*(?:\.\d+)?%?|∞|nan/g;
    let last = 0, m;
    while ((m = re.exec(entry.text)) !== null) {
      if (m.index > last) parts.push({ text: entry.text.slice(last, m.index), num: false });
      parts.push({ text: m[0], num: true });
      last = m.index + m[0].length;
    }
    if (last < entry.text.length) parts.push({ text: entry.text.slice(last), num: false });

    const spans = parts.map(p => {
      const s = document.createElement("span");
      if (p.num) s.className = "n";
      line.appendChild(s);
      return s;
    });
    const caret = document.createElement("span");
    caret.className = "caret";
    caret.textContent = "_";
    line.appendChild(caret);

    logHead = { line, parts, spans, caret, len: entry.text.length, shown: 0 };
  }

  function runLog(dt) {
    if (!el.log) return;
    if (logHead) {
      logHead.shown = Math.min(logHead.len, logHead.shown + dt * 58);
      const n = Math.floor(logHead.shown);
      let used = 0;
      for (let i = 0; i < logHead.parts.length; i++) {
        const p = logHead.parts[i];
        const take = Math.max(0, Math.min(p.text.length, n - used));
        const next = p.text.slice(0, take);
        if (logHead.spans[i].textContent !== next) logHead.spans[i].textContent = next;
        used += p.text.length;
      }
      if (n >= logHead.len) { logHead.caret.remove(); logHead = null; }
      return;
    }
    if (logQueue.length) commitLog(logQueue.shift());
  }

  /* ── the readout ───────────────────────────────────────────
     Every line is an instrument talking: gravity, pressure, air,
     temperature, field, dose, strain, range. On a surface the
     numbers sit where they should. Out on the span they don't,
     and in the worst places they leave the dial entirely and
     take a piece of the hull with them. */
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rint = (a, b) => Math.floor(rnd(a, b + 1));
  const pickOne = arr => arr[Math.floor(Math.random() * arr.length)];
  const spanPctNow = () => (CAM.max - camX) / (CAM.max - CAM.min) * 100;
  const f1 = (a, b) => rnd(a, b).toFixed(1);
  const f2 = (a, b) => rnd(a, b).toFixed(2);
  const f0 = (a, b) => rnd(a, b).toFixed(0);

  function fuelPool() {
    if (!ship) return [];
    return [() => ship.infinite
      ? "drive: unlimited · tanks open"
      : `fuel ${ship.fuel.toFixed(0)}/${ship.fuelMax.toFixed(0)} · burn nominal`];
  }

  /* true wherever we are */
  const ANY = [
    () => `bearing ${fmt(camX)} · drift ${Math.abs(vel).toFixed(0)} m/s`,
    () => `span ${spanPctNow().toFixed(1)}% crossed`,
    () => `sweep complete · ${activeMarks().filter(m => Math.abs(m.cam - camX) < 22000).length} in range`,
    () => `cabin ${f1(20.8, 21.5)}°c · rh ${f0(38, 46)}%`,
  ];

  /* what the instruments say, per region */
  const ZONES = {
    mainland: {
      p: { warn: 0, err: 0, crit: 0 },
      read: [
        () => `gravity ${f2(0.99, 1.01)}g · drift ±0.004 over 60s`,
        () => `pressure ${f1(100.8, 101.7)} kpa · rh ${f0(38, 48)}%`,
        () => `o2 ${f2(20.85, 21.05)}% · co2 ${rint(390, 520)} ppm`,
        () => `ambient ${f1(14, 23)}°c · hull ${f1(8, 19)}°c`,
        () => `field ${f1(46.8, 47.6)} µt · declination ${f1(1.1, 3.4)}°`,
        () => `dose ${f2(0.08, 0.16)} µsv/h · background`,
        () => `lane traffic ${rint(3, 14)} hulls · all transponding`,
        () => `rf floor -${rint(96, 112)} dbm · ${rint(40, 220)} carriers`,
        () => `lidar fix ±${f2(0.02, 0.18)} m at ${fmt(rint(2000, 9000))} m`,
        () => `particulate ${rint(2, 40)}/m²·h · clean lane`,
        () => `clock sync ±${rint(2, 18)} ppb to port time`,
        () => `hull strain ${rint(20, 90)} µε · within spec`,
      ],
      warn: [], err: [], crit: [],
    },

    rex: {
      p: { warn: 0, err: 0, crit: 0 },
      read: [
        () => `gravity ${f2(1.28, 1.46)}g · gradient flat`,
        () => `pressure ${f1(88, 97)} kpa · co2 ${fmt(rint(2000, 6000))} ppm`,
        () => `surface ${f1(-14, 41)}°c · thermals steady`,
        () => `field ${f0(210, 340)} µt · ferrous crust`,
        () => `dose ${f2(0.4, 1.2)} µsv/h · shielded`,
        () => `crust density ${fmt(rint(3100, 5400))} kg/m³`,
        () => `dock beacons ${rint(2, 7)} · handshake ${rint(88, 99)}%`,
        () => `seismic ${f1(0.4, 2.8)} hz · continuous`,
        () => `bus ${f1(27.4, 28.6)} v · draw ${f1(3.1, 6.8)} kw`,
        () => `three masses ranged · Δ ${fmt(rint(4000, 9000))} m`,
        () => `strain ${rint(60, 180)} µε · loaded, in spec`,
      ],
      warn: [], err: [], crit: [],
    },

    gamedev: {
      p: { warn: 0, err: 0, crit: 0 },
      read: [
        () => `orbit stable · period ${rint(4, 90)} h`,
        () => `atmosphere ${f1(0, 4)} kpa · thin`,
        () => `surface ${f0(-120, 60)}°c · albedo 0.${rint(10, 74)}`,
        () => `optical depth ${f2(0.02, 0.9)} · clear`,
        () => `no traffic · ${rint(1, 4)} bodies charted`,
        () => `field ${f1(0.2, 9)} µt · dose ${f2(0.2, 1.4)} µsv/h`,
      ],
      warn: [], err: [], crit: [],
    },

    void: {
      p: { warn: 0.34, err: 0.16, crit: 0.035 },
      read: [
        () => `gravity ${rnd(0, 0.04).toFixed(3)}g · free span`,
        () => `pressure ${rnd(0, 0.0004).toFixed(4)} pa · hard vacuum`,
        () => `hull ${f0(-118, -62)}°c · cabin ${f1(20.9, 21.4)}°c`,
        () => `field ${f1(0.2, 3.4)} µt · no anchor`,
        () => `dose ${f2(0.8, 3.2)} µsv/h · galactic`,
        () => `particle flux ${fmt(rint(400, 9000))}/cm²·s`,
        () => `plasma density ${f1(0.2, 9)}/cm³`,
        () => `chaos ${chaosNow.toFixed(2)} · unformed ${futureNow.toFixed(2)}`,
        () => `lidar to ${fmt(rint(40, 90) * 1000)} m · no return`,
        () => `strain ${rint(40, 180)} µε · hull quiet`,
      ],
      warn: [
        () => `gravity ${f1(2.4, 9.8)}g in a ${rint(3, 40)} m pocket`,
        () => `pressure ${f1(0.4, 12)} kpa spike on open vacuum`,
        () => `hull ${f0(-260, -180)}°c · ${f0(12, 60)}° below model`,
        () => `field ${rint(400, 2600)} µt · no mass to carry it`,
        () => `dose ${f0(40, 180)} µsv/h · rising ${rint(3, 22)}%/min`,
        () => `range finder Δ ${fmt(rint(200, 9000))} m between sweeps`,
        () => `echo back ${f1(0.2, 2.6)}s early · rechecking`,
        () => `strain ${fmt(rint(900, 2400))} µε · sector ${rint(1, 8)} loading`,
        () => `clock ${f1(1.2, 40)} ms behind fleet time`,
        () => `star count ${rint(2, 40)} · was ${rint(41, 900)} last sweep`,
        () => `thermal gradient ${rint(90, 400)}°c/m across 0 mass`,
        () => `bus sag ${f1(21.2, 25.9)} v · draw flat`,
      ],
      err: [
        () => `gravity ∞ at ${fmt(camX + rint(400, 9000))} · sensor clipped`,
        () => `pressure nan · barometer reset ${rint(2, 9)}x`,
        () => `dose ${fmt(rint(1200, 9000))} µsv/h · shield at ${rint(41, 88)}%`,
        () => `field ${fmt(rint(9000, 40000))} µt · magnetometer railed`,
        () => `lidar returns ${rint(2, 9)} hulls at this bearing`,
        () => `clock lost ${f1(1.4, 22)}s · the log kept writing`,
        () => `mass nan · bearing nan · return ${f1(0.4, 3)}s`,
        () => `strain ${fmt(rint(3200, 7400))} µε · yield rated 3,000`,
      ],
      crit: [
        { t: () => `impact ${f2(1.4, 6.2)}g · ${rint(2, 40)} mm at ${fmt(rint(4, 90) * 1000)} m/s`,
          label: "plating breach", sev: 0.5 },
        { t: () => `dose ${fmt(rint(12000, 60000))} µsv/h · burst ${f1(0.2, 2)}s`,
          label: "shielding burn-through", sev: 0.4 },
        { t: () => `strain ${fmt(rint(9000, 22000))} µε · frame past yield`,
          label: "frame deformation", sev: 0.6 },
      ],
    },

    bridge: {
      p: { warn: 0.34, err: 0.16, crit: 0.05 },
      read: [
        () => `span ranged ${fmt(rint(200, 900) * 1000)} m · both ends unlit`,
        () => `gravity ${f2(0.02, 0.4)}g along the deck`,
        () => `structure ringing at ${f1(0.2, 4)} hz`,
        () => `field ${rint(40, 220)} µt · follows the deck`,
        () => `deck temp ${f0(-90, -40)}°c · ours ${f0(-60, -20)}°c`,
        () => `dose ${f2(1.2, 4)} µsv/h · deck shadows it`,
      ],
      warn: [
        () => `deck harmonic ${f1(11, 48)} hz · hull matching it`,
        () => `strain ${fmt(rint(1200, 3400))} µε · frame in sympathy`,
        () => `gravity flips sign every ${f1(1.2, 9)}s`,
        () => `range to deck ${fmt(rint(40, 900))} m · was ${fmt(rint(1000, 9000))}`,
        () => `field rotates ${rint(20, 90)}° per span section`,
      ],
      err: [
        () => `deck has no underside · ${rint(2, 9)} returns, all near`,
        () => `resonance ${fmt(rint(200, 900))} hz · frame rated 120`,
        () => `gravity ${f1(4, 18)}g reported and not felt`,
      ],
      crit: [
        { t: () => `resonance ${fmt(rint(900, 2400))} hz · welds singing`,
          label: "weld seam split", sev: 0.6 },
        { t: () => `${f1(2, 9)}g slam · deck section passed ${fmt(rint(20, 400))} m`,
          label: "plating breach", sev: 0.5 },
      ],
    },

    watcher: {
      p: { warn: 0.34, err: 0.20, crit: 0.09 },
      read: [
        () => `standing field ${rint(600, 1400)} µt · no source ranged`,
        () => `tone ${f1(41.2, 41.9)} hz · unbroken ${rint(4, 90)} h`,
        () => `optical ${rint(2, 9)} lines at ${rint(486, 656)} nm · no body`,
        () => `dose ${f1(6, 22)} µsv/h · directional`,
        () => `skin charge +${f1(0.2, 2.4)} kv · steady`,
      ],
      warn: [
        () => `rf ${f1(1.2, 9.8)} ghz · ${rint(40, 90)} db over floor`,
        () => `field rotated ${rint(40, 180)}° · the ship did not`,
        () => `skin charge +${f1(2.4, 18)} kv · rising ${rint(4, 40)}%/min`,
        () => `cabin ${f1(24.1, 29.8)}°c · no heat input`,
        () => `dose ${f0(90, 600)} µsv/h · one bearing only`,
      ],
      err: [
        () => `rf ${fmt(rint(60, 180))} db over floor · front end saturated`,
        () => `field ${fmt(rint(9000, 30000))} µt · compass useless`,
        () => `${rint(2, 9)} of ${rint(9, 14)} sensors report being addressed`,
        () => `dose ${fmt(rint(1200, 6000))} µsv/h · collimated on us`,
      ],
      crit: [
        { t: () => `rf ${fmt(rint(120, 400))} db over floor · receivers gone`,
          label: "antenna array cooked", sev: 0.55 },
        { t: () => `skin charge ${fmt(rint(90, 400))} kv · arc to frame`,
          label: "bus arc-over", sev: 0.6 },
        { t: () => `field ${fmt(rint(60000, 200000))} µt · bearing locked on us`,
          label: "magnetometer destroyed", sev: 0.7 },
      ],
    },

    root: {
      p: { warn: 0.32, err: 0.24, crit: 0.11 },
      read: [
        () => `ambient ${rint(28, 39)}°c · rh ${rint(88, 99)}%`,
        () => `organics ${fmt(rint(200, 4000))} ppm · ${rint(4, 40)} amino signatures`,
        () => `tissue mass ${fmt(rint(200, 4000))} m across · contiguous`,
        () => `pressure ${f1(4, 19)} kpa · co2 ${fmt(rint(40000, 120000))} ppm`,
        () => `field ${rint(90, 400)} µt · organic, not ferrous`,
      ],
      warn: [
        () => `pulse ${rint(11, 48)} bpm · amplitude +${rint(4, 30)}%`,
        () => `ph ${f1(1.1, 3.4)} on outer plating · etching`,
        () => `cabin o2 ${f1(14.2, 18.9)}% · scrubbers at ${rint(80, 100)}%`,
        () => `field ${rint(200, 900)} µt · modulated at ${rint(11, 48)} bpm`,
        () => `hull ${f1(31, 44)}°c · the dark here is warm`,
      ],
      err: [
        () => `ph ${f1(0.4, 1.1)} · plating loss ${f2(0.1, 0.9)} mm/min`,
        () => `co2 ${fmt(rint(120000, 200000))} ppm · seal differential falling`,
        () => `${rint(2, 9)} masses closing · ${f1(0.4, 4)} m/s, coordinated`,
        () => `scan refused · the scan was noticed`,
      ],
      crit: [
        { t: () => `ph ${f1(0.1, 0.4)} · plating loss ${f1(1.2, 9)} mm/min`,
          label: "hull corrosion", sev: 0.65 },
        { t: () => `co2 ${fmt(rint(200000, 600000))} ppm · seal differential lost`,
          label: "eclss seal breach", sev: 0.7 },
        { t: () => `mass closed to ${fmt(rint(20, 400))} m at ${f1(2, 14)} m/s`,
          label: "grapple strike", sev: 0.8 },
        { t: () => `dose ${fmt(rint(40000, 120000))} µsv/h · biological, not decay`,
          label: "shielding burn-through", sev: 0.5 },
      ],
    },

    edgefall: {
      p: { warn: 0.38, err: 0.12, crit: 0.06 },
      read: [
        () => `gravity ${f2(1.1, 1.4)}g · gradient ${rint(40, 180)} mg/m`,
        () => `cliff face ranged ${fmt(rint(9000, 40000))} m · no floor`,
        () => `shadow side ${f0(-92, -41)}°c · hull ${f0(-70, -30)}°c`,
        () => `field ${rint(120, 380)} µt · ferrous, tilting`,
        () => `dose ${f2(0.6, 2.4)} µsv/h · mass shadow`,
      ],
      warn: [
        () => `tidal shear ${fmt(rint(400, 2400))} mg/m across the hull`,
        () => `gravity ${f1(2.8, 6.4)}g bow · ${f1(0.2, 0.9)}g stern`,
        () => `strain ${fmt(rint(1400, 4000))} µε · frame twisting`,
        () => `pressure ${f1(0.2, 6)} kpa · outgassing off the face`,
        () => `debris ${fmt(rint(400, 9000))}/m²·h · falling with us`,
      ],
      err: [
        () => `shear ${fmt(rint(4000, 9000))} mg/m · trim compensating`,
        () => `the face has been falling for ${fmt(rint(200, 9000))} m`,
        () => `gravity vector ${rint(90, 180)}° off nadir`,
      ],
      crit: [
        { t: () => `shear ${fmt(rint(9000, 26000))} mg/m · ${f1(2, 9)}g bow to stern`,
          label: "spine fracture", sev: 0.7 },
        { t: () => `debris ${fmt(rint(20, 90) * 1000)}/m²·h at ${f1(2, 9)} km/s`,
          label: "plating breach", sev: 0.5 },
      ],
    },

    unnamed: {
      p: { warn: 0.36, err: 0.18, crit: 0.06 },
      read: [
        () => `no survey on file · charting from ${fmt(rint(4, 90) * 1000)} m`,
        () => `gravity ${f2(0.8, 1.3)}g · unmodelled`,
        () => `field ${rint(90, 600)} µt · unmapped`,
        () => `albedo 0.0${rint(2, 9)} · absorbs ${rint(91, 99)}%`,
        () => `surface ${f0(-160, -90)}°c · pressure ${f2(0, 0.8)} kpa`,
      ],
      warn: [
        () => `${rint(2, 40)} returns from a body charted as 1`,
        () => `surface ${f0(-190, -160)}°c · colder than its own shadow`,
        () => `dose ${f0(60, 400)} µsv/h · from the surface, not the sky`,
        () => `field ${fmt(rint(1200, 4000))} µt · no core to make it`,
        () => `strain ${fmt(rint(800, 2200))} µε · something pulling`,
      ],
      err: [
        () => `terrain moved ${fmt(rint(200, 4000))} m between sweeps`,
        () => `lidar floor at ${fmt(rint(20, 400))} m · then none`,
        () => `mass ${fmt(rint(200, 9000))} kg · and ${fmt(rint(90000, 400000))} kg`,
        () => `${rint(2, 9)} horizons · one body`,
      ],
      crit: [
        { t: () => `dust ${fmt(rint(4, 40) * 1000)}/cm²·s at ${fmt(rint(4, 40))} km/s`,
          label: "sensor mast stripped", sev: 0.5 },
        { t: () => `gravity ${f1(6, 22)}g for ${f1(0.2, 1.4)}s · unmodelled`,
          label: "frame deformation", sev: 0.6 },
      ],
    },

    future: {
      p: { warn: 0.36, err: 0.20, crit: 0 },
      read: [
        () => `all instruments nominal · none agree`,
        () => `gravity ${f2(0, 0.9)}g · reread ${f2(0, 0.9)}g`,
        () => `dose ${f2(0, 0.4)} µsv/h · no source, no shield`,
        () => `field ${f2(0, 0.4)} µt · below noise floor`,
        () => `pressure ${rnd(0, 0.0002).toFixed(4)} pa · nothing to weigh`,
      ],
      warn: [
        () => `${rint(3, 9)} sweeps · ${rint(3, 9)} different distances`,
        () => `clock +${f1(0.4, 12)}s · then -${f1(0.4, 12)}s`,
        () => `pressure ${f1(0, 90)} kpa · ${rint(2, 9)} readings, one sensor`,
        () => `temperature ${f0(-270, 40)}°c · sampled ${rint(2, 9)}x, no median`,
        () => `strain ${rint(0, 40)} µε · the frame has not decided`,
      ],
      err: [
        () => `bearing nan · the chart ends ${fmt(rint(200, 9000))} m back`,
        () => `mass ${fmt(rint(200, 9000))} kg and 0 kg · both current`,
        () => `range ∞ · range 0 · same sweep`,
      ],
      crit: [],
    },
  };

  /* what the hull says back after a reading it can't use */
  const ERR_RESP = [
    () => `reading rejected · sensor ${rint(1, 9)} flagged for recal`,
    () => `filter reset · ${rint(2, 9)} samples discarded`,
    () => `holding last good fix · ${f0(2, 40)}s stale`,
    () => `cross-check on backup · ${rint(2, 6)} of ${rint(6, 9)} agree`,
    () => `channel muted ${f1(2, 20)}s · nav unaffected`,
  ];

  const DC_RESP = [
    sec => `dc team ${rint(1, 4)} to sector ${sec} · patch underway`,
    sec => `sector ${sec} isolated · pressure held ${f1(80, 101)} kpa`,
    sec => `bus rerouted around sector ${sec} · ${f1(0.4, 3)} kw lost`,
    sec => `spares drawn · ${rint(2, 9)} plates, ${rint(2, 4)} seals`,
  ];

  const REPAIR_STEP = [
    (sec, pct) => `repair · sector ${sec} · seal ${pct}%`,
    (sec, pct) => `sector ${sec} · integrity ${pct}% and climbing`,
    (sec, pct) => `patch cured ${pct}% · ${rint(1, 9)} min to nominal`,
    (sec, pct) => `sector ${sec} · weld pass ${rint(1, 4)} · ${pct}% closed`,
  ];

  const DEGRADED = [
    b => `running ${8 - breaches.length} of 8 sectors · sector ${b.sec} open`,
    b => `sector ${b.sec} at ${Math.round(b.integrity * 100)}% · hold under ${f1(2, 6)}g`,
    b => `sector ${b.sec} leak ${f2(0.02, 0.4)} kpa/min · within reserve`,
  ];

  /* where we are, as far as the instruments are concerned */
  function zoneAt(x) {
    if (sceneMode !== "void") return "gamedev";
    if (Math.abs(x - LAND.mainland) < SLOT * 1.6) return "mainland";
    if (x > LAND.root - SLOT * 1.4) return "root";
    if (Math.abs(x - LAND.rex) < SLOT * 1.5) return "rex";
    if (Math.abs(x - LAND.watcher) < SLOT * 1.5) return "watcher";
    if (Math.abs(x - LAND.bridge) < SLOT * 1.5) return "bridge";
    if (Math.abs(x - LAND.edgefall) < SLOT * 1.3) return "edgefall";
    if (Math.abs(x - LAND.unnamed) < SLOT * 1.3) return "unnamed";
    if (Math.abs(x - LAND.future) < SLOT * 2) return "future";
    return "void";
  }

  /* open span scales with how disturbed the dark is; a named bad place
     is always as bad as it is */
  function zoneHeat(zone) {
    if (zone !== "void") return 1;
    return Math.min(1, Math.max(0.45, chaosNow));
  }

  /* ── hull damage ──────────────────────────────────────────
     A crit reading isn't just a red line: it opens a sector,
     and damage control closes it again over the next half
     minute, out loud. */
  let breaches = [], damageCool = 0, degradeAt = 0;
  const MAX_BREACH = 3;

  function takeDamage(label, sev) {
    const taken = breaches.map(b => b.sec);
    const free = [];
    for (let i = 1; i <= 8; i++) if (taken.indexOf(i) < 0) free.push(i);
    if (!free.length) return false;
    const sec = pickOne(free);
    const integrity = Math.max(0.18, Math.min(0.88, 1 - sev * rnd(0.5, 1.1)));
    const dur = 14 + sev * 22 + rnd(0, 8);

    pushLog(`hull sector ${sec} · ${label} · integrity ${Math.round(integrity * 100)}%`, "err");
    pushLog(pickOne(DC_RESP)(sec), "rep");

    if (window.Instruments && Instruments.impact) Instruments.impact(sec, 0.4 + sev * 3.2);
    if (window.Instruments && Instruments.setRepair) Instruments.setRepair(sec, true);

    breaches.push({ sec, label, integrity, t: 0, dur, next: dur * 0.34 });
    damageCool = 18 + Math.random() * 16;
    return true;
  }

  function runRepair(dt) {
    if (damageCool > 0) damageCool -= dt;
    if (!breaches.length) { degradeAt = 0; return; }

    for (let i = breaches.length - 1; i >= 0; i--) {
      const b = breaches[i];
      b.t += dt;
      const prog = Math.min(1, b.t / b.dur);
      if (prog >= 1) {
        breaches.splice(i, 1);
        if (window.Instruments && Instruments.setRepair) Instruments.setRepair(b.sec, false);
        pushLog(`sector ${b.sec} sealed · integrity ${rint(94, 99)}% · nominal`, "good");
        continue;
      }
      if (b.t >= b.next) {
        b.next = b.t + b.dur * rnd(0.26, 0.4);
        const pct = Math.round((b.integrity + (1 - b.integrity) * prog) * 100);
        pushLog(pickOne(REPAIR_STEP)(b.sec, pct), "rep");
      }
    }

    degradeAt += dt;
    if (degradeAt > 11 && breaches.length) {
      degradeAt = 0;
      pushLog(pickOne(DEGRADED)(pickOne(breaches)), "warn");
    }
  }

  function idleLine() {
    const z = ZONES[zoneAt(camX)] || ZONES.void;
    const heat = zoneHeat(zoneAt(camX));
    const r = Math.random();

    if (z.crit.length && r < z.p.crit * heat && damageCool <= 0 && breaches.length < MAX_BREACH) {
      const c = pickOne(z.crit);
      pushLog(c.t(), "crit");
      if (!takeDamage(c.label, c.sev)) pushLog(pickOne(ERR_RESP)());
      return;
    }
    if (z.err.length && r < (z.p.crit + z.p.err) * heat) {
      pushLog(pickOne(z.err)(), "err");
      if (Math.random() < 0.7) pushLog(pickOne(ERR_RESP)());
      return;
    }
    if (z.warn.length && r < (z.p.crit + z.p.err + z.p.warn) * heat) {
      pushLog(pickOne(z.warn)(), "warn");
      return;
    }
    pushLog(pickOne(z.read.concat(ANY, fuelPool()))());
  }
  let readingAt = 0;

  /* which landmark's voice the signal instrument should show */
  const VOICE_OF = {
    "bnote-land": "mainland", "bnote-rex": "rex", "bnote-root": "root",
    "bnote-watcher": "watcher", "bnote-bridge": "bridge", "bnote-future": "future",
    "bnote-void": "void",
  };

  let lastRegion = "", nearest = null;
  function checkRegion() {
    let near = null, nd = Infinity;
    for (const m of activeMarks()) {
      const d = Math.abs(camX - m.cam);
      if (d < SLOT * 1.6 && d < nd) { near = m; nd = d; }
    }
    nearest = near;
    const name = near ? near.name : "open span";
    if (name === lastRegion) return;
    lastRegion = name;
    if (near) pushLog(`${sceneMode === "gamedev" ? "approaching" : "entering"} ${near.name.toLowerCase()} — ${near.sub.toLowerCase()}`, "loc");
    else pushLog("open span · nothing charted here", "loc");
  }

  /* the census only reports in, it doesn't sit on the panel — void only.
     It syncs its mark on arrival, so the first line is a delta and not
     the whole counter, and it speaks rarely enough to stay a texture. */
  const CENSUS = [
    n => `filed ${fmt(n)} more · remainder unknown`,
    n => `census +${fmt(n)} · ${fmt(catalogued)} on record`,
    n => `${fmt(n)} new entries · ${rint(2, 40)} unresolved`,
    n => `intake ${fmt(n)} · backlog ${fmt(rint(4000, 90000))}`,
  ];
  let filedMark = 0, filedAt = 0, filedIn = false, filedGap = 16;
  function reportFiled(dt) {
    const inCity = sceneMode === "void" && Math.abs(camX - LAND.mainland) < SLOT * 1.4;
    if (!inCity) { filedAt = 0; filedIn = false; return; }
    if (!filedIn) { filedIn = true; filedMark = catalogued; filedAt = 0; filedGap = 14 + Math.random() * 12; }
    filedAt += dt;
    if (filedAt > filedGap) {
      filedAt = 0;
      filedGap = 14 + Math.random() * 12;
      const since = Math.round(catalogued - filedMark);
      filedMark = catalogued;
      if (since > 0) pushLog(pickOne(CENSUS)(since));
    }
  }

  let youEl, youPct = null;
  function updateHUD(dt) {
    if (youEl === undefined) youEl = document.getElementById("byou");
    if (youEl) {
      const pct = (camX - CAM.min) / (CAM.max - CAM.min) * 100;
      if (pct !== youPct) { youEl.style.left = pct + "%"; youPct = pct; }
    }

    if (sceneMode === "void" && Math.abs(camX - LAND.mainland) < SLOT * 1.4)
      catalogued += (160 + Math.abs(vel) * 0.02) * dt;

    checkRegion();
    reportFiled(dt);
    runRepair(dt);

    readingAt += dt;
    if (readingAt > nextIdle && !logHead && !logQueue.length) {
      readingAt = 0;
      nextIdle = 3.2 + Math.random() * 3.4;
      idleLine();
    }
    runLog(dt);

    host.classList.toggle("moving", Math.abs(vel) > 200);
  }

  /* canvas-only half of the HUD: runs after the frame's DOM writes, so the
     font sets inside don't force a second style recalculation */
  function drawInstruments(dt) {
    if (window.Instruments) {
      const st = ship ? Voidship.stats(ship) : null;
      Instruments.draw(dt, {
        camX, vel,
        speedN: st ? st.speedN : Math.min(1, Math.abs(vel) / CAM.maxFling),
        chaos: chaosNow,
        future: futureNow,
        spanPct: (CAM.max - camX) / (CAM.max - CAM.min) * 100,
        travelled,
        region: lastRegion,
        voice: nearest ? (VOICE_OF[nearest.id] || "void")
                       : (futureNow > 0.45 ? "future" : "void"),
        marks: activeMarks().map(m => ({
          id: m.id, cam: m.cam, oy: m.oy, name: m.name,
          claimed: !!(window.XP && XP.has("beacon-" + m.id)),
        })),
        ship: st,
        shipOy: ship && H ? ship.y / H : null,
      });
    }
  }

  /* ---- movement: the voidship owns travel ---- */
  function step(dt) {
    if (frozen) { vel = 0; return; }

    // keep the craft alive under the boot veil (bob only)
    if (ship && !started) {
      ship.bob += dt;
      return;
    }
    if (!started) return;

    if (ship) {
      retargetFromPointer();
      const aim = aimFromPointer();
      const prev = camX;
      const out = Voidship.step(ship, dt, {
        camX, W, H, frozen, viewUnits: viewUnitsNow(), aim,
      });
      camX = out.camX;
      vel = out.vel;
      travelled += Math.abs(camX - prev);

      if (camX < CAM.min) { camX = CAM.min; ship.vel = 0; vel = 0; }
      if (camX > CAM.max) { camX = CAM.max; ship.vel = 0; vel = 0; }

      // beacon contact → file only when the hull actually reaches it
      if (ship.courseMark && performance.now() >= courseArmAt) {
        const m = ship.courseMark;
        const p = markScreen(m);
        if (Voidship.touchingMark(ship, camX, m, { W, x: p.x, y: p.y, hit: HIT + 10, pad: phone ? 420 : 220 })) {
          selectMark(m);
          courseArmAt = 0;
        }
      }

      if (activeMark && Math.abs(camX - activeMark.cam) > SLOT * 0.9) clearMark();
      if (ship.thrustAmt > 0.15) hintDone("fuel");
      if (!ship.infinite && ship.fuel <= 0.05) {
        if (!fuelWarned) {
          fuelWarned = true;
          pushLog("tanks dry · release to regen", "loc");
        }
      } else {
        fuelWarned = false;
      }
      return;
    }

    vel *= Math.exp(-dt / CAM.glideTau);
    if (Math.abs(vel) < 8) vel = 0;
    const prev = camX;
    camX += vel * dt;
    travelled += Math.abs(camX - prev);
    if (camX < CAM.min) { camX = CAM.min; vel = 0; }
    if (camX > CAM.max) { camX = CAM.max; vel = 0; }
  }

  /* ---- loop ---- */
  let last = performance.now();
  /* pace the scene by display refreshes, not by a ms slot: paint every Nth
     refresh, N = floor(Hz / 60), so every painted frame is the same length.
     60 Hz → 60 fps, 75 → 75, 120 → 60, 144 → 72, 165 → 82.5, 240 → 60.
     The refresh interval is measured from rAF timestamps and kept up to date,
     so moving the window to another monitor re-picks N. */
  const REFRESH_WINDOW = 15;        // intervals kept for the measurement
  const REFRESH_FIRST = 5;          // intervals needed for the first measurement
  const REFRESH_MIN_MS = 2;         // intervals outside 2..50 ms aren't refreshes
  const REFRESH_MAX_MS = 50;
  const REFRESH_BAND = 0.4;         // intervals within ±40% of the median are averaged
  const refreshSamples = [];        // recent rAF intervals, ms, oldest first
  let refreshMs = 1000 / 60;        // measured refresh interval
  let refreshN = 1;                 // paint every refreshN refreshes
  let refreshMeasured = false;
  let pendingN = 0;                 // a new N waits for a second measurement to agree
  let sinceMeasure = 0;             // intervals recorded since the last measurement
  let prevStamp = -1;               // previous rAF timestamp; -1 = none yet
  let refreshCount = 0;             // refreshes since the last paint
  /* and never paint more than 60 times a second, whatever the panel runs at:
     past that a faster screen only repaints the same picture and the fans
     hear it. N keeps painted frames on refresh boundaries; this keeps their
     rate at 60 — on a panel whose refresh divides to 60 or less both gates
     agree and nothing changes. */
  const PAINT_MS = 1000 / 60;
  const PAINT_EARLY_MS = 2;   // vsync wobble: a boundary this close still paints
  let paintDue = 0;           // next paint's due stamp; 0 = paint on the next boundary
  /* at rest and untouched for a while, the scene only drifts: let the frame
     callback go and come back on a timer instead. Holding the callback open
     costs as much as painting. Any input snaps straight back. */
  const IDLE_AFTER_MS = 5000;
  const IDLE_PARK_MS = 100;         // idle wake interval, ms — 10 fps
  let lastInput = performance.now();
  let idleNow = false;
  function noteInput() {
    lastInput = performance.now();
    if (idleNow) { idleNow = false; refreshCount = 2 * refreshN; paintDue = 0; unpark(); }   // paint on the very next callback
  }
  ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"].forEach(type =>
    addEventListener(type, noteInput, { passive: true, capture: true }));
  function atRest() {
    if (frozen || xswitch || thrustId != null || vel !== 0) return false;
    if (window.Genesis && Genesis.active) return false;
    if (activeMarks().some(m => m.fly)) return false;
    if (!ship) return true;
    return !ship.thrusting && ship.targetX == null
      && ship.vel === 0 && ship.vy === 0 && ship.holdT === 0
      && ship.thrustAmt < 0.01 && !ship.trail.length && !ship.sparks.length;
  }
  function measureRefresh() {
    const sorted = refreshSamples.slice().sort((a, b) => a - b);
    const m = sorted[sorted.length >> 1];
    let sum = 0, count = 0;
    for (const x of refreshSamples) {
      if (Math.abs(x - m) <= m * REFRESH_BAND) { sum += x; count++; }
    }
    refreshMs = sum / count;
    const n = Math.max(1, Math.floor(1000 / refreshMs / 60 + 0.03));   // 3% margin: 59.94 and 119.88 Hz panels keep their N
    if (!refreshMeasured) {
      refreshN = n;
      refreshMeasured = true;
      pendingN = 0;
    } else if (n === refreshN) {
      pendingN = 0;
    } else if (n === pendingN) {
      refreshN = n;
      pendingN = 0;
    } else {
      pendingN = n;
    }
  }
  function frame(now) {
    armed = false;
    if (!loopOn) return;
    if (!visible || portrait || document.hidden) {
      loopOn = false;
      return;
    }
    let refreshes = 1;
    if (prevStamp >= 0) {
      const delta = now - prevStamp;
      if (delta >= REFRESH_MIN_MS && delta <= REFRESH_MAX_MS) {
        refreshSamples.push(delta);
        if (refreshSamples.length > REFRESH_WINDOW) refreshSamples.shift();
        sinceMeasure++;
        if (refreshMeasured ? sinceMeasure >= REFRESH_WINDOW
                            : refreshSamples.length >= REFRESH_FIRST) {
          measureRefresh();
          sinceMeasure = 0;
        }
      }
      // a janky frame that spanned several refreshes counts as all of them
      refreshes = Math.max(1, Math.round(delta / refreshMs));
    }
    prevStamp = now;
    refreshCount += refreshes;

    if (!idleNow) {
      if (now - lastInput > IDLE_AFTER_MS && atRest()) idleNow = true;
    } else if (!atRest()) {
      idleNow = false;
      refreshCount = 2 * refreshN;
      paintDue = 0;
    }
    const slot = idleNow ? 2 * PAINT_MS : PAINT_MS;
    if (refreshCount < (idleNow ? 2 * refreshN : refreshN)) {
      arm();
      return;
    }
    if (paintDue && now < paintDue - PAINT_EARLY_MS) {
      // on a refresh boundary but under the 60 fps ceiling: wait for the next one
      arm();
      return;
    }
    refreshCount = 0;   // drop the remainder: a late frame never earns a double paint
    paintDue = !paintDue || now - paintDue > slot ? now + slot : paintDue + slot;
    const raw = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    if (idleNow) parkIdle(); else arm();
    render(raw);
  }
  function pacingReport() {
    const hz = 1000 / refreshMs;
    return {
      refreshHz: +hz.toFixed(2),
      refreshMs: +refreshMs.toFixed(3),
      n: refreshN,
      measured: refreshMeasured,
      idle: idleNow,
      fps: idleNow ? +(1000 / IDLE_PARK_MS).toFixed(2)
                   : +Math.min(hz / refreshN, 1000 / PAINT_MS).toFixed(2),
      cap: idleNow ? 1000 / IDLE_PARK_MS : 60,
    };
  }
  window.pacingReport = pacingReport;

  function render(raw) {
    // a claim holds travel still while the level lands
    // but the world keeps animating (t advances)
    t += raw;
    const dt = raw;

    if (window.Genesis && Genesis.active) {
      const going = Genesis.step(dt);
      if (going) {
        Genesis.draw(ctx, { W, H, t });
        return;
      }
    }
    if (ship && ship.alpha < 1) ship.alpha = approach(ship.alpha, 1, 2.4, dt);

    const warping = stepSwitch(dt);
    if (!warping) step(dt);

    // render behind the gate while assets warm up
    chaosNow  = approach(chaosNow,  sceneMode === "void" ? World.chaosAt(camX)  : 0, 1.4, dt);
    futureNow = approach(futureNow, sceneMode === "void" ? World.futureAt(camX) : 0, 1.4, dt);

    // DOM first (HUD text, minimap marker, note position), canvas after
    if (bridgeReady) updateHUD(dt);
    if (bridgeReady && activeMark && noteEls[activeMark.id] && noteEls[activeMark.id].classList.contains("show"))
      placeNote(noteEls[activeMark.id], activeMark);

    World.draw(ctx, {
      W, H, camX, t, vel,
      maxFling: CAM.maxFling,
      chaos: chaosNow, future: futureNow,
      mode: sceneMode, dt,
    });
    // a claim holds travel still while the level lands — but beacon
    // fade-in must keep using real time. With dt=0 here, the first
    // entry claim left every mark at vis=0 for the whole ceremony,
    // so the span looked empty (and stayed empty if unfreeze glitched).
    try {
      drawMarks(raw);
      if (ship) {
        Voidship.draw(ship, ctx, { W, H, t, camX, viewUnits: viewUnitsNow() });
      }
      drawSwitchFX();
    } catch (err) {
      if (!frame._warned) { frame._warned = 1; console.warn("beacon layer:", err); }
    }

    if (bridgeReady) drawInstruments(dt);
  }

  /* one still picture under the gate. Fades that the running loop would
     have finished behind the gate are settled first, so nothing fades in
     when the gate lifts. */
  function paintOnce() {
    if (portrait) return;
    if (loopOn) return;
    chaosNow  = sceneMode === "void" ? World.chaosAt(camX)  : 0;
    futureNow = sceneMode === "void" ? World.futureAt(camX) : 0;
    if (ship) ship.alpha = 1;
    for (const m of activeMarks()) m.vis = onScreen(markScreen(m).x, 60) ? 1 : 0;
    render(0);
  }

  /* LOG_MAX and HIT are declared far below the instrument block, so settle the
     phone-dependent numbers here, once every declaration in the file has run. */
  syncPhone();
})();
