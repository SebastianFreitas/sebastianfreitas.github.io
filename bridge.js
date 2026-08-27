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
  }

  function startLoop() {
    if (loopOn) return;
    loopOn = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  document.addEventListener("site:preload", () => startLoop());

  document.addEventListener("site:enter", e => {
    startLoop();
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
  MARKS.forEach(m => noteEls[m.id] = document.getElementById(m.id));
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

  /* claiming fires when the voidship reaches the beacon */
  function selectMark(m) {
    begin();
    hintDone("beacon");
    if (!(window.XP && XP.has("beacon-" + m.id))) m.pop = 1;
    if (window.XP) {
      const p = markScreen(m), r = host.getBoundingClientRect();
      XP.award("beacon-" + m.id, m.xp, m.name, r.left + p.x, r.top + p.y);
    }
    pushLog(`filed: ${m.name.toLowerCase()} +${m.xp}`, "good");
    activeMark = m;
    showNote(m);
    if (ship) {
      Voidship.setThrusting(ship, false);
      Voidship.clearCourse(ship);
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
    for (const m of MARKS) {
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
    if (ship) Voidship.setThrusting(ship, false);
    // a tap on nothing with almost no burn dismisses a note
    if (ship && ship.arrived) clearMark();
  }

  /* while the throttle is open, the pointer's screen seat is the aim —
     holding the right edge keeps the destination ahead of the camera,
     so a long press can cross the span without the waypoint going stale. */
  function retargetFromPointer() {
    if (!ship || thrustId == null || !ship.thrusting) return;
    if (ship.courseMark) {
      const seat = courseForMark(ship.courseMark);
      Voidship.setCourse(ship, seat.worldX, seat.screenY, ship.courseMark);
      return;
    }
    const c = clientToCourse(lastPtr.x, lastPtr.y);
    Voidship.setCourse(ship, c.worldX, c.screenY, null);
  }

  host.addEventListener("pointerdown", e => {
    if (frozen || document.body.classList.contains("site-frozen")) return;
    if (e.target.closest && e.target.closest("a, button, #bridge-map, #bridge-term, .bcn")) return;
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
  if (track) {
    track.classList.add("readonly");
    for (const m of MARKS) {
      const d = document.createElement("div");
      d.className = "mk poi";
      d.style.left = ((m.cam - CAM.min) / (CAM.max - CAM.min) * 100) + "%";
      d.title = m.name;
      d.dataset.mark = m.id;
      if (window.XP && XP.has("beacon-" + m.id)) d.classList.add("read");
      track.appendChild(d);
    }
    for (let i = 0; i < 30; i++) {
      const d = document.createElement("div");
      d.className = "mk"; d.style.left = (i / 29 * 100) + "%";
      track.appendChild(d);
    }
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

  /* ---- markers ---- */
  let markDebug = 0;
  window.beaconReport = () => MARKS.map(m => {
    const p = markScreen(m);
    return `${m.id}  x=${p.x.toFixed(0)} y=${p.y.toFixed(0)} vis=${(+m.vis).toFixed(2)} onscreen=${onScreen(p.x, 60)}`;
  }).join("\n") + `\ncamX=${camX.toFixed(0)} frozen=${frozen} W=${W} H=${H}`;

  function drawMarks(dt) {
    let shown = 0;
    for (const m of MARKS) {
      const p = markScreen(m);
      m.vis = approach(m.vis, onScreen(p.x, 60) ? 1 : 0, 3.2, dt);
      if (m.pop > 0) m.pop = Math.max(0, m.pop - dt * 1.6);
      if (m.vis < 0.02 && m.pop <= 0) continue;
      shown++;
      Beacon.draw(ctx, p.x, p.y, {
        t, phase: m.phase, alpha: m.vis,
        active: activeMark === m, hover: hoverMark === m,
        claimed: window.XP && XP.has("beacon-" + m.id),
        xp: m.xp, pop: m.pop, label: m.name,
      });
    }
    // if none ever appear, say so once — beaconReport() has the detail
    if (!shown && ++markDebug === 240)
      console.warn("no beacons drawn in 4s — run beaconReport() for why");
  }

  /* ---- the readout: a log that keeps writing, instruments under it ---- */
  const el = { log: document.getElementById("btlog") };
  if (window.Instruments) {
    Instruments.mount(document.getElementById("binst"));
    const IK = "arcanis.inst.scale";
    let iscale = parseFloat(localStorage.getItem(IK) || "1") || 1;
    Instruments.setScale(iscale);
    const step = d => {
      iscale = Instruments.setScale(iscale + d);
      try { localStorage.setItem(IK, String(iscale)); } catch (e) {}
    };
    const bIn = document.getElementById("binst-in");
    const bOut = document.getElementById("binst-out");
    if (bIn)  bIn.addEventListener("pointerdown", e => { e.stopPropagation(); step(0.15); });
    if (bOut) bOut.addEventListener("pointerdown", e => { e.stopPropagation(); step(-0.15); });
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
    () => `sweep complete · ${MARKS.filter(m => Math.abs(m.cam - camX) < 22000).length} in range`,
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
    for (const m of MARKS) {
      const d = Math.abs(camX - m.cam);
      if (d < SLOT * 1.6 && d < nd) { near = m; nd = d; }
    }
    nearest = near;
    const name = near ? near.name : "open span";
    if (name === lastRegion) return;
    lastRegion = name;
    if (near) pushLog(`entering ${near.name.toLowerCase()} — ${near.sub.toLowerCase()}`, "loc");
    else pushLog("open span · nothing charted here", "loc");
  }

  /* the census only reports in, it doesn't sit on the panel */
  let filedMark = 0, filedAt = 0;
  function reportFiled(dt) {
    const inCity = Math.abs(camX - LAND.mainland) < SLOT * 1.4;
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

    if (Math.abs(camX - LAND.mainland) < SLOT * 1.4)
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
        marks: MARKS.map(m => ({
          id: m.id, cam: m.cam, oy: m.oy, name: m.name,
          claimed: !!(window.XP && XP.has("beacon-" + m.id)),
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
      const prev = camX;
      const out = Voidship.step(ship, dt, {
        camX, W, H, frozen, viewUnits: CAM.viewUnits,
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

    // a claim holds the whole scene still while the level lands
    const dt = frozen ? 0 : raw;
    t += dt;

    step(dt);

    // render behind the gate while assets warm up
    chaosNow  = approach(chaosNow,  World.chaosAt(camX),  1.4, dt);
    futureNow = approach(futureNow, World.futureAt(camX), 1.4, dt);

    World.draw(ctx, {
      W, H, camX, t, vel,
      maxFling: CAM.maxFling,
      chaos: chaosNow, future: futureNow,
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
    } catch (err) {
      if (!frame._warned) { frame._warned = 1; console.warn("beacon layer:", err); }
    }

    if (bridgeReady) updateHUD(dt);

  }
})();
