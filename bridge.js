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

  const { mulberry, hash1, smooth, approach, fmt } = Util;

  // opaque: every frame starts with a full-frame fill, and an opaque canvas composites cheaper
  const ctx = cv.getContext("2d", { alpha: false });
  const reduced = Util.reduced();
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

  const { MARKS, PLANETS, GD_LAND, GD_BOUNDS, GD_SLOT } = Marks;

  /* the lamp's own radius is tuned for a mouse; a fingertip on a zoomed-out
     phone needs a wider net or you sail straight past what you were aiming at */
  const HIT_BASE = (window.Beacon && Beacon.HIT) || 26;
  let HIT = HIT_BASE;
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

  /* ---- defer interaction until the gate picks a path ---- */
  let bridgeReady = false, visible = true;
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
    log.setMax(phone ? 3 : 6);
    HIT = HIT_BASE * (phone ? 1.7 : 1);
    if (window.Voidship) window.Voidship.BASE.size = phone ? Math.round(SHIP_SIZE / PHONE_ZOOM) : SHIP_SIZE;
    if (window.Instruments) Instruments.setCompact(phone);
  }
  function onPhoneChange() { syncPhone(); if (window.__bridgeRefit) window.__bridgeRefit(); }
  if (phoneQ.addEventListener) phoneQ.addEventListener("change", onPhoneChange);
  else phoneQ.addListener(onPhoneChange);
  const rotateEl = document.getElementById("bridge-rotate");
  if (rotateEl) rotateEl.setAttribute("aria-hidden", String(!portrait));
  let entered = false, preloaded = false;   // gate lifted / first still frame drawn

  function readyBridge() {
    if (bridgeReady) return;
    bridgeReady = true;
    begin();
    applyPendingView();
    applyPendingMode();
    saveView();
  }

  const pacer = Pacer.create({ paint: render, atRest, alive: () => visible && !portrait && !document.hidden });

  function startLoop() {
    if (pacer.running) { pacer.start(); return; }   // start() on a running pacer just unparks
    if (!entered) return;
    if (!visible || portrait || document.hidden) return;
    pacer.start();
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
      log.push(`docking: ${m.name.toLowerCase()} +${m.xp}`, "good");
    } else {
      log.push(`filed: ${m.name.toLowerCase()} +${m.xp}`, "good");
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
  const HINT_KEY = Util.KEYS.HINTS;
  const HINT_STEPS = [
    { id: "burn",   text: "Hold anywhere to burn the voidship toward it" },
    { id: "beacon", text: "Click a beacon to set course — contact files it" },
    { id: "fuel",   text: "Fuel refills when you stop burning" },
  ];
  const hintEl = document.getElementById("bridge-hint");
  let hintsDone = {};
  try { hintsDone = JSON.parse(Util.read(localStorage, HINT_KEY) || "{}"); } catch (e) {}

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
    Util.write(localStorage, HINT_KEY, JSON.stringify(hintsDone));
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
      log.push(`course: ${mark.name.toLowerCase()}`, "loc");
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
    if (e.target.closest && e.target.closest("a, button, #bridge-map, #bridge-term, #bridge-sys, #bridge-log, .bnote")) return;
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
    ctx.lineDashOffset = -Math.min(m.cue, CUE_PULSE) * 14;   // dashes crawl outward, then hold once the cue settles
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
  const log = BridgeLog.create(el.log);
  if (window.Instruments) {
    Instruments.mount(document.getElementById("binst"));
    Instruments.mountSys(document.getElementById("binst-sys"));
    const IK = Util.KEYS.INST_SCALE;
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

    let stored = parseFloat(Util.read(localStorage, IK));
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
      Util.write(localStorage, IK, String(stored));
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
      log.push(target === "gamedev"
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

  const VIEW_KEY = Util.KEYS.VIEW, SECTOR_KEY = Util.KEYS.SECTOR;
  function saveView() {
    if (!entered) return;
    const view = {
      mode: xswitch ? xswitch.to : sceneMode,
      voidCamX: sceneMode === "void" ? camX : savedVoidCamX,
      gdCamX: sceneMode === "gamedev" ? camX : savedGDCamX,
    };
    Util.write(sessionStorage, VIEW_KEY, JSON.stringify(view));
    Util.write(localStorage, SECTOR_KEY, view.mode);
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
    log.push("drive: emergency fold engaged", "loc");
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
    const TIPK = Util.KEYS.GEAR_SEEN;
    let tipSeen = Util.read(localStorage, TIPK) === "1";
    if (tipSeen) modesPanel.classList.add("tip-done");
    const retireTip = () => {
      if (tipSeen) return;
      tipSeen = true;
      modesPanel.classList.add("tip-done");
      Util.write(localStorage, TIPK, "1");
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
    if (r > 0.5) {
      // one even-odd path: the full frame minus the disc, so the scene stays visible inside the iris
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.arc(cx, cy, r, 0, 6.283);
      ctx.fill("evenodd");
    } else {
      ctx.fillRect(0, 0, W, H);
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

  let nextIdle = 3.5;

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
    if (animate) log.push(`signal resolved — ${added} contact${added > 1 ? "s" : ""} in range`, "good");
  }

  revealDepths(false);
  addEventListener("pageshow", e => { if (e.persisted) revealDepths(false); });
  addEventListener("storage", () => revealDepths(false));

  /* ── the readout ───────────────────────────────────────────
     Every line is an instrument talking: gravity, pressure, air,
     temperature, field, dose, strain, range. On a surface the
     numbers sit where they should. Out on the span they don't,
     and in the worst places they leave the dial entirely and
     take a piece of the hull with them. */
  const voice = BridgeVoice.create({
    get camX() { return camX; }, get vel() { return vel; }, get chaosNow() { return chaosNow; },
    get futureNow() { return futureNow; }, get ship() { return ship; }, get sceneMode() { return sceneMode; },
    get breaches() { return breaches; }, activeMarks, LAND, SLOT, CAM,
  });
  const { pickOne, rnd, rint, f0, f1, f2, fuelPool, ANY, ZONES, ERR_RESP, DC_RESP, REPAIR_STEP, DEGRADED, zoneAt, zoneHeat } = voice;

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

    log.push(`hull sector ${sec} · ${label} · integrity ${Math.round(integrity * 100)}%`, "err");
    log.push(pickOne(DC_RESP)(sec), "rep");

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
        log.push(`sector ${b.sec} sealed · integrity ${rint(94, 99)}% · nominal`, "good");
        continue;
      }
      if (b.t >= b.next) {
        b.next = b.t + b.dur * rnd(0.26, 0.4);
        const pct = Math.round((b.integrity + (1 - b.integrity) * prog) * 100);
        log.push(pickOne(REPAIR_STEP)(b.sec, pct), "rep");
      }
    }

    degradeAt += dt;
    if (degradeAt > 11 && breaches.length) {
      degradeAt = 0;
      log.push(pickOne(DEGRADED)(pickOne(breaches)), "warn");
    }
  }

  function idleLine() {
    const z = ZONES[zoneAt(camX)] || ZONES.void;
    const heat = zoneHeat(zoneAt(camX));
    const r = Math.random();

    if (z.crit.length && r < z.p.crit * heat && damageCool <= 0 && breaches.length < MAX_BREACH) {
      const c = pickOne(z.crit);
      log.push(c.t(), "crit");
      if (!takeDamage(c.label, c.sev)) log.push(pickOne(ERR_RESP)());
      return;
    }
    if (z.err.length && r < (z.p.crit + z.p.err) * heat) {
      log.push(pickOne(z.err)(), "err");
      if (Math.random() < 0.7) log.push(pickOne(ERR_RESP)());
      return;
    }
    if (z.warn.length && r < (z.p.crit + z.p.err + z.p.warn) * heat) {
      log.push(pickOne(z.warn)(), "warn");
      return;
    }
    log.push(pickOne(z.read.concat(ANY, fuelPool()))());
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
    if (near) log.push(`${sceneMode === "gamedev" ? "approaching" : "entering"} ${near.name.toLowerCase()} — ${near.sub.toLowerCase()}`, "loc");
    else log.push("open span · nothing charted here", "loc");
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
      if (since > 0) log.push(pickOne(CENSUS)(since));
    }
  }

  let youEl, youPct = null;
  let movingNow = false;
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
    if (readingAt > nextIdle && log.idle) {
      readingAt = 0;
      nextIdle = 3.2 + Math.random() * 3.4;
      idleLine();
    }
    log.run(dt);

    const moving = Math.abs(vel) > 200;
    if (moving !== movingNow) { movingNow = moving; host.classList.toggle("moving", moving); }
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
          log.push("tanks dry · release to regen", "loc");
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
  /* a reveal keeps the loop awake until every part of it has played out:
     the flight, the landing burst, the art fade, and the pulse of a cue
     pointing at a node revealed off-screen. Parking during any of these
     would drop it to the idle 10 fps. */
  function marksSettled() {
    for (const m of activeMarks()) {
      if (m.fly || m.pop > 0) return false;
      if (m.unseen ? m.cue < CUE_PULSE : m.shown < 1) return false;
    }
    return true;
  }
  function atRest() {
    if (frozen || xswitch || thrustId != null || vel !== 0) return false;
    if (window.Genesis && Genesis.active) return false;
    if (!marksSettled()) return false;
    if (!ship) return true;
    return !ship.thrusting && ship.targetX == null
      && ship.vel === 0 && ship.vy === 0 && ship.holdT === 0
      && ship.thrustAmt < 0.01 && !ship.trail.length && !ship.sparks.length;
  }
  window.pacingReport = () => pacer.report();

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
      if (!render._warned) { render._warned = 1; console.warn("beacon layer:", err); }
    }

    if (bridgeReady) drawInstruments(dt);
  }

  /* one still picture under the gate. Fades that the running loop would
     have finished behind the gate are settled first, so nothing fades in
     when the gate lifts. */
  function paintOnce() {
    if (portrait) return;
    if (pacer.running) return;
    chaosNow  = sceneMode === "void" ? World.chaosAt(camX)  : 0;
    futureNow = sceneMode === "void" ? World.futureAt(camX) : 0;
    if (ship) ship.alpha = 1;
    for (const m of activeMarks()) m.vis = onScreen(markScreen(m).x, 60) ? 1 : 0;
    render(0);
  }

  /* the log (mid-file) and HIT (top) are phone-dependent, so settle those
     numbers here, once every declaration in the file has run. */
  syncPhone();

  // the top bar floats clear over the hero and turns solid once the hero
  // has scrolled up under it
  function watchTopbar() {
    const bar = document.querySelector('.topbar');
    const hero = document.getElementById('bridge-hero');
    if (!bar || !hero || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(([e]) => {
      bar.classList.toggle('is-solid', !e.isIntersecting);
    }, { rootMargin: `-${bar.offsetHeight || 64}px 0px 0px 0px` }).observe(hero);
  }
  watchTopbar();
})();
