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
  const HIT = (window.Beacon && Beacon.HIT) || 26;
  if (!window.Beacon) {
    console.error("lamp.js did not load — canvas marks and claim flights are dead");
  }

  /* ---- the other setting: Game Dev sector -----------------
     Same ship, same bridge deck, a different span. Four bodies,
     left to right, one per shipped project. No lore geography —
     just placeholders you can fly a line through. ---- */
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
    { id: "bnote-planet-zero",       cam: GD_LAND.zero,       off: -0.06, oy: 0.34, par: 0.7,
      theme: "zero",       size: 1.00, name: "Sector Zero", sub: "Horror — the console is the weapon" },
    { id: "bnote-planet-voidscape",  cam: GD_LAND.voidscape,  off:  0.05, oy: 0.28, par: 0.7,
      theme: "voidscape",  size: 1.15, name: "VoidScape",   sub: "Roguelike — a skill-scaled loop" },
    { id: "bnote-planet-heavylight", cam: GD_LAND.heavylight, off: -0.04, oy: 0.42, par: 0.7,
      theme: "heavylight", size: 0.95, name: "HeavyLight",  sub: "Puzzle — light carries momentum" },
    { id: "bnote-planet-conclusus",  cam: GD_LAND.conclusus,  off:  0.06, oy: 0.30, par: 0.7,
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

  // nothing should begin part-way down the page
  try { scrollTo(0, 0); } catch (e) {}

  /* ---- defer interaction until the gate picks a path ---- */
  let loopOn = false, bridgeReady = false;

  function readyBridge() {
    if (bridgeReady) return;
    bridgeReady = true;
    begin();
    applyPendingMode();
  }

  function startLoop() {
    if (loopOn) return;
    loopOn = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  document.addEventListener("site:preload", () => startLoop());

  let pendingMode = null;
  document.addEventListener("site:enter", e => {
    startLoop();
    pendingMode = e.detail && e.detail.mode || null;
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
  let catalogued = 4182993201, started = false, visible = true;
  let activeMark = null, hoverMark = null;
  let chaosNow = 0, futureNow = 0;
  let frozen = false;
  let freezeGuard = null;

  /* ---- setting: which map is currently under the bridge ---- */
  let sceneMode = "void";                 // "void" | "gamedev"
  let savedVoidCamX = LAND.bridge;
  let savedGDCamX = GD_LAND.entry;
  const visitedPlanets = new Set();       // session-only "read" state for planets
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

  const scale = () => W / CAM.viewUnits;
  const wx = (worldX, par) => (worldX - camX) * par * scale() + W * 0.5;
  const fmt = n => Math.round(n).toLocaleString("en-US");
  const onScreen = (x, pad) => x > -pad && x < W + pad;
  const markScreen = m => ({ x: wx(m.x, m.par), y: m.oy * H });


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

  function showNote(mark) {
    clearTimeout(noteTimer);
    for (const k in noteEls) if (noteEls[k]) noteEls[k].classList.remove("show");
    if (!mark) return;
    const el2 = noteEls[mark.id];
    if (!el2) return;
    noteTimer = setTimeout(() => {
      placeNote(el2, mark);
      el2.classList.add("show");
      if (mark.id === "bnote-land" && noteCat) noteCat.textContent = fmt(catalogued);
    }, 280);
  }
  /* put the panel next to the beacon it belongs to, on whichever side
     has room, clamped so it never leaves the hero */
  function placeNote(el2, mark) {
    if (!el2 || !mark) return;
    const p = markScreen(mark);
    const pw = el2.offsetWidth || 380, ph = el2.offsetHeight || 260;
    const pad = 22, edge = 20;
    const right = p.x + pad + pw < W - edge;
    let left = right ? p.x + pad : p.x - pad - pw;
    left = Math.min(W - pw - edge, Math.max(edge, left));
    let top = p.y - ph * 0.45;
    top = Math.min(H - ph - edge, Math.max(edge + 40, top));
    el2.style.left = left + "px";
    el2.style.top  = top + "px";
    el2.classList.toggle("from-left", !right);
  }

  /* claiming fires when the voidship reaches the beacon (or a planet,
     in the game dev sector — same contact, no XP attached to those) */
  function selectMark(m) {
    begin();
    hintDone("beacon");
    if (sceneMode === "gamedev") {
      if (!visitedPlanets.has(m.id)) {
        m.pop = 1;
        visitedPlanets.add(m.id);
        const dot = track && track.querySelector(`[data-mark="${m.id}"]`);
        if (dot) dot.classList.add("read");
      }
      pushLog(`docking: ${m.name.toLowerCase()}`, "good");
    } else {
      if (!(window.XP && XP.has("beacon-" + m.id))) m.pop = 1;
      if (window.XP) {
        const p = markScreen(m), r = host.getBoundingClientRect();
        XP.award("beacon-" + m.id, m.xp, m.name, r.left + p.x, r.top + p.y);
      }
      pushLog(`filed: ${m.name.toLowerCase()} +${m.xp}`, "good");
    }
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
    const r = host.getBoundingClientRect();
    const px = clientX - r.left, py = clientY - r.top;
    let best = null, bestD = HIT;
    for (const m of activeMarks()) {
      const p = markScreen(m);
      const d = Math.hypot(px - p.x, py - p.y);
      if (d < bestD) { best = m; bestD = d; }
    }
    return best;
  }

  function clientToCourse(clientX, clientY) {
    const r = host.getBoundingClientRect();
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
    const r = host.getBoundingClientRect();
    return { px: lastPtr.x - r.left, py: lastPtr.y - r.top };
  }

  host.addEventListener("pointerdown", e => {
    if (frozen || xswitch || document.body.classList.contains("site-frozen")) return;
    if (e.target.closest && e.target.closest("a, button, #bridge-map, #bridge-term, #bridge-sys, #bridge-log, .bcn")) return;
    const m = markAt(e.clientX, e.clientY);
    beginBurn(e, m);
  });

  addEventListener("pointermove", e => {
    const r = host.getBoundingClientRect();
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
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(es => {
      visible = es[0].isIntersecting;
      if (!visible) { endBurn(); stopSteering(); }
    }, { threshold: 0.02 }).observe(host);
  }

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
      const done = sceneMode === "gamedev"
        ? visitedPlanets.has(m.id)
        : !!(window.XP && XP.has("beacon-" + m.id));
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
    if (!track || sceneMode !== "void" || !/^beacon-/.test(e.detail.id)) return;
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

  function drawMarks(dt) {
    let shown = 0;
    const gd = sceneMode === "gamedev";
    for (const m of activeMarks()) {
      const p = markScreen(m);
      m.vis = approach(m.vis, onScreen(p.x, 60) ? 1 : 0, 3.2, dt);
      if (m.pop > 0) m.pop = Math.max(0, m.pop - dt * 1.6);
      if (m.vis < 0.02 && m.pop <= 0) continue;
      shown++;
      if (gd && window.Planet) {
        Planet.draw(ctx, p.x, p.y, {
          t, phase: m.phase, alpha: m.vis,
          active: activeMark === m, hover: hoverMark === m,
          visited: visitedPlanets.has(m.id),
          theme: m.theme, size: m.size, pop: m.pop, label: m.name,
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
    if (!shown && ++markDebug === 240)
      console.warn("no marks drawn in 4s — run beaconReport() for why");
  }

  /* ---- the readout: a log that keeps writing, instruments under it ---- */
  const el = { log: document.getElementById("btlog") };
  if (window.Instruments) {
    Instruments.mount(document.getElementById("binst"));
    Instruments.mountSys(document.getElementById("binst-sys"));
    const IK = "arcanis.inst.scale";
    const termEl = document.getElementById("bridge-term");
    let iscale = parseFloat(localStorage.getItem(IK));
    if (!Number.isFinite(iscale)) {
      const maxW = termEl ? termEl.clientWidth : Instruments.TOTAL_W;
      iscale = Math.min(1, maxW / Instruments.TOTAL_W);
    }
    Instruments.setScale(iscale);
    const syncInstW = () => {
      const hero = document.getElementById("bridge-hero");
      if (hero) hero.style.setProperty("--inst-w", (Instruments.TOTAL_W * Instruments.getScale()) + "px");
    };
    syncInstW();
    const step = d => {
      iscale = Instruments.setScale(iscale + d);
      syncInstW();
      try { localStorage.setItem(IK, String(iscale)); } catch (e) {}
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

  function applySceneMode(target) {
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
    pushLog(target === "gamedev"
      ? "sector: game dev — four objects on approach"
      : "sector: the void — span resumes", "good");
  }

  function applyPendingMode() {
    if (!pendingMode || pendingMode === sceneMode) {
      pendingMode = null;
      return;
    }
    const mode = pendingMode;
    pendingMode = null;
    applySceneMode(mode);
  }

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
    btn.addEventListener("click", () => beginModeSwitch(btn.dataset.mode));
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
      ctx.strokeStyle = `rgba(245,208,107,${0.6 * a})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.stroke();
      ctx.strokeStyle = `rgba(176,104,90,${0.4 * a})`;
      ctx.lineWidth = 10;
      ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, 6.283); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(222,232,228,${0.32 * a})`;
      const inward = opts.dir === "in";
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * 6.283 + t * (opts.spin || 0);
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
        ctx.fillStyle = `rgba(255,250,235,${flash * 0.85})`;
        ctx.fillRect(0, 0, W, H);
      }
    } else {
      const u = smooth(Math.min(1, xt / OPEN_DUR));
      drawIris(cx, cy, rMax * u, { glow: 1 - u, dir: "out", spin: -0.6 });
    }
  }

  const LOG_MAX = 5;
  let logHead = null, logQueue = [], nextIdle = 3.5;

  function pushLog(text, kind) {
    if (!el.log) return;
    logQueue.push({ text, kind: kind || "" });
    if (logQueue.length > 3) logQueue.splice(0, logQueue.length - 3);
  }

  function commitLog(entry) {
    const line = document.createElement("div");
    line.className = "tl " + entry.kind;
    line.textContent = "";
    el.log.appendChild(line);
    while (el.log.children.length > LOG_MAX) el.log.removeChild(el.log.firstChild);
    logHead = { line, full: entry.text, shown: 0 };
  }

  function runLog(dt) {
    if (!el.log) return;
    if (logHead) {
      logHead.shown = Math.min(logHead.full.length, logHead.shown + dt * 58);
      const n = Math.floor(logHead.shown);
      logHead.line.textContent = logHead.full.slice(0, n) + (n < logHead.full.length ? "_" : "");
      if (n >= logHead.full.length) logHead = null;
      return;
    }
    if (logQueue.length) commitLog(logQueue.shift());
  }

  const READINGS = [
    () => `bearing ${fmt(camX)} · drift ${Math.abs(vel).toFixed(0)}`,
    () => `chaos ${chaosNow.toFixed(2)} · unformed ${futureNow.toFixed(2)}`,
    () => `span ${((CAM.max - camX) / (CAM.max - CAM.min) * 100).toFixed(1)}% crossed`,
    () => `structure holding · no report`,
    () => `listening · nothing answered`,
    () => `sweep complete · ${activeMarks().filter(m => Math.abs(m.cam - camX) < 22000).length} in range`,
  ];
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

  /* the census only reports in, it doesn't sit on the panel — void only */
  let filedMark = 0, filedAt = 0;
  function reportFiled(dt) {
    const inCity = sceneMode === "void" && Math.abs(camX - LAND.mainland) < SLOT * 1.4;
    if (!inCity) { filedAt = 0; return; }
    filedAt += dt;
    if (filedAt > 6) {
      filedAt = 0;
      const since = Math.round(catalogued - filedMark);
      filedMark = catalogued;
      if (since > 0) pushLog(`filed ${fmt(since)} more · remainder unknown`);
    }
  }

  function updateHUD(dt) {
    const you = document.getElementById("byou");
    if (you) you.style.left = ((camX - CAM.min) / (CAM.max - CAM.min) * 100) + "%";

    if (sceneMode === "void" && Math.abs(camX - LAND.mainland) < SLOT * 1.4)
      catalogued += (160 + Math.abs(vel) * 0.02) * dt;

    checkRegion();
    reportFiled(dt);

    readingAt += dt;
    if (readingAt > nextIdle && !logHead && !logQueue.length) {
      readingAt = 0;
      nextIdle = 3.2 + Math.random() * 3.4;
      const fuelLine = ship
        ? () => ship.infinite
            ? "drive: unlimited · tanks open"
            : `fuel ${ship.fuel.toFixed(0)}/${ship.fuelMax.toFixed(0)} · hold builds cruise`
        : null;
      const pool = fuelLine ? READINGS.concat([fuelLine]) : READINGS;
      pushLog(pool[Math.floor(Math.random() * pool.length)]());
    }
    runLog(dt);

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
          claimed: sceneMode === "gamedev"
            ? visitedPlanets.has(m.id)
            : !!(window.XP && XP.has("beacon-" + m.id)),
        })),
        ship: st,
      });
    }

    host.classList.toggle("moving", Math.abs(vel) > 200);
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
        camX, W, H, frozen, viewUnits: CAM.viewUnits, aim,
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
        if (Voidship.touchingMark(ship, camX, m, { W, x: p.x, y: p.y, hit: HIT + 10 })) {
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
  function frame(now) {
    if (!loopOn) return;
    const raw = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    requestAnimationFrame(frame);

    if (!visible) return;

    // a claim holds travel still while the level lands
    // but the world keeps animating (t advances)
    t += raw;
    const dt = raw;

    const warping = stepSwitch(dt);
    if (!warping) step(dt);

    // render behind the gate while assets warm up
    chaosNow  = approach(chaosNow,  sceneMode === "void" ? World.chaosAt(camX)  : 0, 1.4, dt);
    futureNow = approach(futureNow, sceneMode === "void" ? World.futureAt(camX) : 0, 1.4, dt);

    World.draw(ctx, {
      W, H, camX, t, vel,
      maxFling: CAM.maxFling,
      chaos: chaosNow, future: futureNow,
      mode: sceneMode,
    });
    // a claim holds travel still while the level lands — but beacon
    // fade-in must keep using real time. With dt=0 here, the first
    // entry claim left every mark at vis=0 for the whole ceremony,
    // so the span looked empty (and stayed empty if unfreeze glitched).
    try {
      drawMarks(raw);
      if (ship) {
        Voidship.draw(ship, ctx, { W, H, t, camX, viewUnits: CAM.viewUnits });
      }
      if (bridgeReady && activeMark && noteEls[activeMark.id] && noteEls[activeMark.id].classList.contains("show"))
        placeNote(noteEls[activeMark.id], activeMark);
      drawSwitchFX();
    } catch (err) {
      if (!frame._warned) { frame._warned = 1; console.warn("beacon layer:", err); }
    }

    if (bridgeReady) updateHUD(dt);

  }
})();
