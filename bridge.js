/* ===========================================================
   THE BRIDGE — homepage hero.

   Map:  ___________M____________________________________________________W__R[root]
   69 slots, one slot ~ one mainland width. West of the mainland
   the ground stops being the present and you can keep going.

   Nothing in here pops: every appearance is an eased ramp, and
   the deep void is never actually empty — chaos churns through
   it, things older than the bridge surface and submerge, and
   fragments of record drift past while you travel.
   =========================================================== */

(function () {
  const host = document.getElementById("bridge-hero");
  const cv   = document.getElementById("bridge-canvas");
  if (!host || !cv) return;

  const ctx = cv.getContext("2d");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  /* ---- canvas ---- */
  let W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = host.clientWidth; H = host.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

  /* ---- boot: a short log, then the way in ------------------
     The old panel asked people to read a paragraph before they'd
     seen anything. This states four facts and stops.
  --------------------------------------------------------- */
  const loadEl   = document.getElementById("bridge-loading");
  const bootLog  = document.getElementById("boot-log");
  const bootGate = document.getElementById("boot-gate");
  const bootAt = performance.now();
  const touch = matchMedia("(pointer: coarse)").matches;

  const bootLines = [];
  let bootIdx = 0, bootChar = 0, bootLine = null, bootHold = 0, bootReady = false;
  // finishLoading pushes the identity lines ~900ms in. The first two
  // generic lines type out faster than that, so the gate used to open
  // and lock bootReady before those lines existed — returning visitors
  // never saw "entry found" / "Continue", and nobody got signed in.
  let bootSigned = false;

  function setLoad(_p, label) { if (label) bootLines.push(label); }

  function revealGate() {
    if (bootReady) return;
    bootReady = true;
    if (bootGate) bootGate.classList.add("on");
  }

  function bootTick(dt) {
    if (!bootLog || bootReady) return;
    if (bootHold > 0) { bootHold -= dt; return; }

    if (!bootLine) {
      if (bootIdx >= bootLines.length) {
        if (!bootSigned) return;
        revealGate();
        return;
      }
      bootLine = document.createElement("div");
      bootLine.className = "bl";
      bootLog.appendChild(bootLine);
      bootChar = 0;
    }
    const full = bootLines[bootIdx];
    bootChar = Math.min(full.length, bootChar + dt * 90);
    const n = Math.floor(bootChar);
    bootLine.textContent = full.slice(0, n) + (n < full.length ? "_" : "");
    if (n >= full.length) { bootIdx++; bootLine = null; bootHold = 0.13; }
  }

  // nothing should begin part-way down the page
  try { scrollTo(0, 0); } catch (e) {}

  /* the way in is wired once, unconditionally. Whether the visitor is
     new, known, or arriving on a different origin with empty storage,
     this button opens the site. */
  (function wireGate() {
    const go = document.getElementById("entry-go");
    if (!go) return;
    go.addEventListener("click", () => {
      if (window.XP) XP.seen();
      setTimeout(() => {
        if (loadEl) loadEl.classList.add("done");
        begin();                 // .live is what reveals the whole HUD
      }, 620);
    });
  })();

  setLoad(0, "link established");
  setLoad(0, touch ? "input: touch · drag with one finger"
                   : "input: pointer · drag anywhere to travel");
  /* ---- state ---- */
  let camX = LAND.bridge, vel = 0, travelled = 0, t = 0;
  let catalogued = 4182993201, started = false, visible = true;
  let flyTo = null, activeMark = null, hoverMark = null;
  let dragging = false, dragId = null, dragLastX = 0, dragMoved = 0, dragCarry = 0;
  const dragTrack = [];   // recent {t, x} for working out the throw
  let scrubbing = false, armed = false, armX = 0, armMoved = 0;
  let chaosNow = 0, futureNow = 0;
  let frozen = false;
  let freezeGuard = null;
  document.addEventListener("xp:freeze", e => {
    frozen = !!e.detail.on;
    clearTimeout(freezeGuard);
    // nothing is allowed to stop the world indefinitely: if a claim
    // never reports back, the scene starts itself again
    if (frozen) freezeGuard = setTimeout(() => {
      if (frozen) { frozen = false; host.classList.remove("held"); console.warn("scene un-held by guard"); }
    }, 5000);
    host.classList.toggle("held", frozen);
    if (frozen) { vel = 0; endDrag && endDrag(); }
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
    host.classList.add("live");
  }

  // reaching the work counts for something too
  const workSec = document.getElementById("work");
  if (workSec && "IntersectionObserver" in window) {
    const io2 = new IntersectionObserver(es => {
      if (es[0].isIntersecting) {
        io2.disconnect();
        if (window.XP) XP.award("act-work", 1, "Found the work");
      }
    }, { threshold: 0.25 });
    io2.observe(workSec);
  }

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

  /* travel to a landmark without touching it: what the map strip does */
  function travelTo(m) {
    begin();
    clearMark();
    const dist = Math.abs(m.cam - camX);
    flyTo = { from: camX, to: m.cam, elapsed: 0,
              dur: Math.min(2.4, Math.max(0.6, dist / 40000 * 2.0)) };
    vel = 0;
  }

  /* claiming is only ever done by clicking the beacon itself */
  function selectMark(m) {
    begin();
    hintDone("beacon");
    if (!(window.XP && XP.has("beacon-" + m.id))) m.pop = 1;
    if (window.XP) {
      const p = markScreen(m), r = host.getBoundingClientRect();
      XP.award("beacon-" + m.id, m.xp, m.name, r.left + p.x, r.top + p.y);
    }
    pushLog(`filed: ${m.name.toLowerCase()} +${m.xp}`, "good");
    activeMark = m; showNote(null);
    const dist = Math.abs(m.cam - camX);
    flyTo = { from: camX, to: m.cam, elapsed: 0,
              dur: Math.min(2.4, Math.max(0.6, dist / 40000 * 2.0)),
              then: () => showNote(m) };
    vel = 0;
  }
  function clearMark() { if (activeMark) { activeMark = null; showNote(null); } }

  /* ---- the hint: names one thing at a time, then goes away ---- */
  const HINT_KEY = "arcanis.hints.v1";
  const HINT_STEPS = [
    { id: "drag",   text: "Drag anywhere to travel the span" },
    { id: "beacon", text: "Click a beacon to inspect it — each one is a level" },
    { id: "map",    text: "Or use the span below to jump straight to anything" },
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

  /* ---- input: grab the world and move it -------------------
     No edge steering. Dragging works the same with a mouse or a
     finger, and a flick carries momentum into the normal drag.
  --------------------------------------------------------- */
  const DRAG_PAR = 0.94;                 // drag tracks the deck 1:1
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

  function stopSteering() { if (cursor) cursor.classList.remove("on"); }

  host.addEventListener("pointerdown", e => {
    // links, buttons and the map keep their own behaviour
    if (frozen) return;
    if (e.target.closest && e.target.closest("a, button, #bridge-map, #bridge-term, .bcn")) return;
    begin();
    const m = markAt(e.clientX, e.clientY);
    if (m) { selectMark(m); return; }
    dragging = true; dragId = e.pointerId;
    dragLastX = e.clientX;
    dragMoved = 0;
    // keep whatever the last throw left, so swiping again builds speed
    dragCarry = vel;
    dragTrack.length = 0;
    dragTrack.push({ t: performance.now(), x: e.clientX });
    hintDone("drag");
    flyTo = null; vel = 0;
    host.classList.add("grabbing");
    try { host.setPointerCapture(e.pointerId); } catch (err) {}
  });

  addEventListener("pointermove", e => {
    const r = host.getBoundingClientRect();
    const inside = e.clientY >= r.top && e.clientY <= r.bottom;

    if (cursor) {
      if (inside || dragging) {
        cursor.classList.add("on");
        cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      } else cursor.classList.remove("on");
    }

    if (dragging && e.pointerId === dragId) {
      const now = performance.now();
      const dx = e.clientX - dragLastX;
      dragMoved += Math.abs(dx);
      camX -= dx * worldPerPx();
      dragLastX = e.clientX;

      dragTrack.push({ t: now, x: e.clientX });
      while (dragTrack.length > 2 && now - dragTrack[0].t > 110) dragTrack.shift();

      if (camX < CAM.min) camX = CAM.min;
      if (camX > CAM.max) camX = CAM.max;
      if (activeMark && Math.abs(camX - activeMark.cam) > SLOT * 0.9) clearMark();
      return;
    }

    if (!inside) { hoverMark = null; if (cursor) cursor.classList.remove("over"); return; }
    hoverMark = markAt(e.clientX, e.clientY);
    if (cursor) cursor.classList.toggle("over", !!hoverMark);
  }, { passive: true });

  function endDrag() {
    if (!dragging) return;
    if (dragMoved < 4) clearMark();     // a tap on nothing dismisses the panel
    dragging = false; dragId = null;
    host.classList.remove("grabbing");

    // throw speed from the last ~110ms of travel, not one jittery frame
    let thrown = 0;
    if (dragTrack.length >= 2) {
      const a = dragTrack[0], b = dragTrack[dragTrack.length - 1];
      const secs = Math.max(0.016, (b.t - a.t) / 1000);
      thrown = -((b.x - a.x) * worldPerPx()) / secs;
    }

    if (dragMoved > 5 && Math.abs(thrown) > 60) {
      // a second throw in the same direction stacks on the first
      const same = dragCarry !== 0 && Math.sign(dragCarry) === Math.sign(thrown);
      const total = thrown + (same ? dragCarry * CAM.carry : 0);
      vel = Math.max(-CAM.maxFling, Math.min(CAM.maxFling, total));
    } else vel = 0;
    dragTrack.length = 0;
  }
  addEventListener("pointerup", endDrag);
  addEventListener("pointercancel", () => { endDrag(); stopSteering(); });

  document.documentElement.addEventListener("mouseleave", stopSteering);
  addEventListener("blur", () => { endDrag(); stopSteering(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { endDrag(); stopSteering(); } });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(es => {
      visible = es[0].isIntersecting;
      if (!visible) stopSteering();
    }, { threshold: 0.02 }).observe(host);
  }

  /* ---- minimap ---- */
  const track = document.getElementById("btrack");
  const ghost = document.getElementById("bghost");
  const posFromEvent = e => {
    const r = track.getBoundingClientRect();
    const u = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    return CAM.min + u * (CAM.max - CAM.min);
  };
  if (track) {
    for (const m of MARKS) {
      const d = document.createElement("div");
      d.className = "mk poi";
      d.style.left = ((m.cam - CAM.min) / (CAM.max - CAM.min) * 100) + "%";
      d.title = m.name;
      d.dataset.mark = m.id;
      if (window.XP && XP.has("beacon-" + m.id)) d.classList.add("read");
      d.addEventListener("pointerdown", ev => { ev.stopPropagation(); hintDone("map"); travelTo(m); });
      track.appendChild(d);
    }
    for (let i = 0; i < 30; i++) {
      const d = document.createElement("div");
      d.className = "mk"; d.style.left = (i / 29 * 100) + "%";
      track.appendChild(d);
    }
    track.addEventListener("pointerdown", e => {
      begin(); hintDone("map"); armed = true; armMoved = 0; armX = e.clientX;
      track.setPointerCapture(e.pointerId); e.preventDefault();
    });
    track.addEventListener("pointermove", e => {
      if (ghost) {
        const r = track.getBoundingClientRect();
        ghost.style.left = Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100)) + "%";
      }
      if (!armed) return;
      armMoved += Math.abs(e.clientX - armX); armX = e.clientX;
      if (armMoved > 5) { scrubbing = true; flyTo = null; clearMark(); camX = posFromEvent(e); vel = 0; }
    });
    track.addEventListener("pointerup", e => {
      if (!armed) return;
      if (!scrubbing) {
        const to = posFromEvent(e), dist = Math.abs(to - camX);
        flyTo = { from: camX, to, elapsed: 0, dur: Math.min(2.4, Math.max(0.6, dist / 40000 * 2.0)) };
        clearMark(); vel = 0;
      }
      armed = false; scrubbing = false;
    });
    track.addEventListener("pointercancel", () => { armed = false; scrubbing = false; });
  }
  /* a tick that's been read stops shouting, so what's left is obvious */
  document.addEventListener("xp:award", e => {
    if (!track || !/^beacon-/.test(e.detail.id)) return;
    const id = e.detail.id.replace(/^beacon-/, "");
    const d = track.querySelector(`[data-mark="${id}"]`);
    if (d) d.classList.add("read");
  });

  const easeInOut = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;

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
      pushLog(READINGS[Math.floor(Math.random() * READINGS.length)]());
    }
    runLog(dt);

    if (window.Instruments) {
      Instruments.draw(dt, {
        camX, vel,
        speedN: Math.min(1, Math.abs(vel) / CAM.maxFling),
        chaos: chaosNow,
        future: futureNow,
        spanPct: (CAM.max - camX) / (CAM.max - CAM.min) * 100,
        voice: nearest ? (VOICE_OF[nearest.id] || "void")
                       : (futureNow > 0.45 ? "future" : "void"),
        marks: MARKS.map(m => ({
          id: m.id, cam: m.cam, oy: m.oy,
          claimed: !!(window.XP && XP.has("beacon-" + m.id)),
        })),
      });
    }

    host.classList.toggle("moving", Math.abs(vel) > 200);
  }

  /* ---- movement: only a fly-to or the coast off a fling ---- */
  function step(dt) {
    if (frozen) { vel = 0; return; }
    if (!started || dragging || scrubbing) { if (dragging) vel = 0; return; }

    if (flyTo) {
      flyTo.elapsed += dt;
      const u = Math.min(1, flyTo.elapsed / flyTo.dur);
      const prev = camX;
      camX = flyTo.from + (flyTo.to - flyTo.from) * easeInOut(u);
      vel = (camX - prev) / dt;
      travelled += Math.abs(camX - prev);
      if (u >= 1) { const cb = flyTo.then; flyTo = null; vel = 0; if (cb) cb(); }
      return;
    }

    // exponential coast — a hard throw carries a long way before it settles
    vel *= Math.exp(-dt / CAM.glideTau);
    if (Math.abs(vel) < 8) vel = 0;

    const prev = camX;
    camX += vel * dt;
    travelled += Math.abs(camX - prev);
    if (activeMark && Math.abs(camX - activeMark.cam) > SLOT * 0.9) clearMark();
    if (camX < CAM.min) { camX = CAM.min; vel = 0; }
    if (camX > CAM.max) { camX = CAM.max; vel = 0; }
  }

  /* ---- loop ---- */
  let last = performance.now(), warmFrames = 0;
  function frame(now) {
    const raw = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    requestAnimationFrame(frame);

    // the sign-in runs whether or not the scene is on screen
    bootTick(raw);
    warmFrames++;
    if (warmFrames === 12) {
      const wait = Math.max(0, 900 - (performance.now() - bootAt));
      setTimeout(finishLoading, wait);
    }

    if (!visible) return;

    // a claim holds the whole scene still while the level lands
    const dt = frozen ? 0 : raw;
    t += dt;

    step(dt);

    // ambience eases toward where you are, never cuts
    chaosNow  = approach(chaosNow,  World.chaosAt(camX),  1.4, dt);
    futureNow = approach(futureNow, World.futureAt(camX), 1.4, dt);

    World.draw(ctx, {
      W, H, camX, t, vel,
      maxFling: CAM.maxFling,
      chaos: chaosNow, future: futureNow,
    });
    // a fault in the scene must not take the readout with it
    try {
      drawMarks(dt);
      if (activeMark && noteEls[activeMark.id] && noteEls[activeMark.id].classList.contains("show"))
        placeNote(noteEls[activeMark.id], activeMark);
    } catch (err) {
      if (!frame._warned) { frame._warned = 1; console.warn("beacon layer:", err); }
    }

    updateHUD(dt);

  }

  /* the log signs you in; the gate itself is already wired above */
  function finishLoading() {
    if (window.XP) {
      if (XP.isNew) {
        setLoad(0, `provisional entry: ${XP.name.toLowerCase()} · ref ${XP.ref}`);
        setLoad(0, "level 0 · claim the beacon to enter");
      } else {
        setLoad(0, `entry found: ${XP.name.toLowerCase()} · ref ${XP.ref}`);
        setLoad(0, `level ${XP.level} of ${XP.total} · resuming`);
        const lbl = document.querySelector("#entry-go .bcn-lbl");
        if (lbl) lbl.textContent = "Continue";
      }
    }
    bootSigned = true;
  }

  if (!reduced) requestAnimationFrame(frame);
  else {
    // still sign in and wait on the gate — just skip the canvas loop
    World.draw(ctx, { W, H, camX, t: 0, vel: 0, chaos: 0, future: 0 });
    drawMarks(0.016);
    finishLoading();
    if (bootLog) {
      bootLines.forEach(full => {
        const line = document.createElement("div");
        line.className = "bl";
        line.textContent = full;
        bootLog.appendChild(line);
      });
    }
    revealGate();
  }
})();
