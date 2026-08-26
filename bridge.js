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

  /* ---- world ---- */
  const SLOT = 6000;
  const at = i => i * SLOT;
  const LAND = {
    future:   at(4.5),
    mainland: at(11.5),
    voidmark: at(30),
    bridge:   at(41),
    watcher:  at(64.5),
    rex:      at(67.5),
    root:     at(68.6),
  };

  const CAM = {
    min: at(1.6),                 // keep going west, into what hasn't happened
    max: LAND.root - 1600,
    maxFling: 38000,      // ceiling on a hard flick
    glideTau: 0.95,       // seconds for a fling to fall to ~37% of its speed
    carry: 0.62,          // how much of the last throw a new one inherits
    viewUnits: 2100,
    brakeZone: 9000,
  };

  const DECK  = 0.64;   // deck height as a fraction of the hero. Bigger = lower.
  const FLOOR = 1.14;
  const BAY   = 300;   // spacing between legs

  /* off = where the beacon sits relative to the subject, as a share of
     the viewport width. Converted to world units per marker so parallax
     never throws it off screen once the camera settles. */
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
      name: "Rex",            sub: "The giant who paid for our bodies" },
    { id: "bnote-root",    cam: CAM.max,       off: -0.17, oy: 0.24, par: 0.70, xp: 1,
      name: "The Root",       sub: "It is still growing" },
  ];
  MARKS.forEach(m => { m.x = m.cam + (m.off * CAM.viewUnits) / m.par; });
  MARKS.forEach((m, i) => { m.phase = i * 1.7; m.vis = 0; });

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

  function setLoad(_p, label) { if (label) bootLines.push(label); }

  function bootTick(dt) {
    if (!bootLog || bootReady) return;
    if (bootHold > 0) { bootHold -= dt; return; }

    if (!bootLine) {
      if (bootIdx >= bootLines.length) {
        bootReady = true;
        if (bootGate) bootGate.classList.add("on");
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

  setLoad(0, "link established");
  setLoad(0, touch ? "input: touch · drag with one finger"
                   : "input: pointer · drag anywhere to travel");
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
  setLoad(0, "mainland located · census open");

  /* ---- Rex ---- */
  const rex = { ridge: [] };
  (function () {
    const r = mulberry(77341);
    const from = LAND.rex - SLOT * 1.9, to = LAND.rex + SLOT * 1.0;
    for (let i = 0; i <= 90; i++) {
      const u = i / 90;
      // ends taper to nothing, so the silhouette meets the floor instead of
      // being cut off by a vertical wall where the polygon closes
      const skirt = Math.min(1, u / 0.28);
      const body = 0.20 + u * 0.50 + Math.sin(u * 11) * 0.04 + (r() - 0.5) * 0.045;
      rex.ridge.push({ x: from + u * (to - from), h: Math.max(0, body * skirt) });
    }
  })();
  setLoad(0, "matter settled · span holding");

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
      const eyes = [];
      const n = 1 + Math.floor(r() * 5);
      for (let e = 0; e < n; e++)
        eyes.push({ dx: (r() - 0.5) * 1.5, dy: (r() - 0.5) * 0.75,
                    rr: 0.03 + r() * 0.05, ph: r() * 6.28,
                    rate: 0.10 + r() * 0.22, warm: r() < 0.35 });
      presences.push({
        x: from + r() * (to - from),
        y: 0.16 + r() * 0.56,
        w: 260 + r() * 700, h: 130 + r() * 340,
        ph: r() * 6.28, cycle: 0.035 + r() * 0.05,
        par: 0.16 + r() * 0.22, eyes, seen: 0,
      });
    }
    /* things reaching out of the dark */
    for (let i = 0; i < 22; i++)
      tendrils.push({ x: from - SLOT + r() * (to - from + SLOT * 2),
                      y: 0.1 + r() * 0.8, len: 90 + r() * 300,
                      ph: r() * 6.28, par: 0.2 + r() * 0.3,
                      dir: r() < 0.5 ? -1 : 1, a: 0.05 + r() * 0.12 });
  })();
  setLoad(0, "searching census for you ... not found");

  /* ---- fragments of record, drifting in the empty stretches ---- */
  const FRAGMENTS = [
    "no survey returned from this bearing",
    "it was counted once and never again",
    "the span predates the record of the span",
    "something below is keeping pace",
    "entry withdrawn at the request of the author",
    "the light does not reach the legs",
    "they stopped sending people out this far",
    "measured twice — the numbers disagree",
    "whatever built it did not need it",
    "the census does not extend past here",
    "a name was here. it has been removed",
    "do not look down for longer than a breath",
  ];
  const FRAG_CHUNK = 5400;

  /* ---- state ---- */
  let camX = LAND.bridge, vel = 0, travelled = 0, t = 0;
  let catalogued = 4182993201, started = false, visible = true;
  let flyTo = null, activeMark = null, hoverMark = null;
  let dragging = false, dragId = null, dragLastX = 0, dragMoved = 0, dragCarry = 0;
  const dragTrack = [];   // recent {t, x} for working out the throw
  let scrubbing = false, armed = false, armX = 0, armMoved = 0;
  let chaosNow = 0, futureNow = 0;
  let frozen = false;
  document.addEventListener("xp:freeze", e => {
    frozen = !!e.detail.on;
    host.classList.toggle("held", frozen);
    if (frozen) { vel = 0; endDrag && endDrag(); }
  });

  const cursor = document.getElementById("bridge-cursor");

  const scale = () => W / CAM.viewUnits;
  const wx = (worldX, par) => (worldX - camX) * par * scale() + W * 0.5;
  const fmt = n => Math.round(n).toLocaleString("en-US");
  const onScreen = (x, pad) => x > -pad && x < W + pad;
  const markScreen = m => ({ x: wx(m.x, m.par), y: m.oy * H });

  /* how disturbed the dark is here: worst mid-void, calm near the
     mainland, and almost nothing out west where nothing has happened */
  function chaosAt(x) {
    const fromCity = smooth((Math.abs(x - LAND.mainland) - SLOT * 1.2) / (SLOT * 5));
    const west = x < LAND.mainland ? smooth((x - CAM.min) / (SLOT * 5.5)) : 1;
    const east = smooth((LAND.watcher - x) / (SLOT * 3) + 1);
    return fromCity * west * Math.min(1, east);
  }
  function futureAt(x) { return 1 - smooth((x - CAM.min) / (SLOT * 7)); }

  /* ---- starting ---- */
  const copy = document.getElementById("bridge-copy");
  function begin() {
    if (started) return;
    started = true;
    host.classList.add("live");
    if (copy) copy.classList.add("faded");
  }
  const beginBtn = document.getElementById("bridge-begin");
  if (beginBtn) beginBtn.addEventListener("click", e => {
    e.preventDefault();
    begin();
    if (window.XP) XP.award("act-explore", 1, "Set out");
  });

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

  /* ---- draw: stars ---- */
  function drawVoid() {
    const s = scale(), span = W * 2.4, off = camX * 0.06 * s;
    for (const b of blobs) {
      b.y += b.vy * 0.02;
      if (b.y > 1.3) b.y = -0.25; if (b.y < -0.3) b.y = 1.25;
      const x = ((b.u * span - off) % span + span) % span - span * 0.2;
      const rad = b.rad * Math.max(W, H);
      if (!onScreen(x, rad)) continue;
      const y = b.y * H;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(${b.hue},${b.a})`); g.addColorStop(1, `rgba(${b.hue},0)`);
      ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    const off2 = camX * 0.14 * s;
    const streak = Math.min(60, Math.abs(vel) / CAM.maxFling * 220);
    ctx.strokeStyle = "#c6ccc6"; ctx.fillStyle = "#c6ccc6";
    for (const m of motes) {
      const x = ((m.u * span - off2) % span + span) % span - span * 0.2;
      if (!onScreen(x, 80)) continue;
      const y = m.y * H + Math.sin(t * 0.5 + m.ph) * 16;
      ctx.globalAlpha = m.a * (0.55 + 0.45 * Math.sin(t * 1.6 + m.ph));
      if (streak > 3) {
        ctx.lineWidth = m.rr;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.lineTo(x + Math.sign(vel) * streak * (0.4 + m.rr * 0.4), y); ctx.stroke();
      } else { ctx.beginPath(); ctx.arc(x, y, m.rr, 0, 6.283); ctx.fill(); }
    }
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  /* ---- chaos: warped ribbons churning through the dark ---- */
  function drawChaos() {
    if (chaosNow < 0.02) return;
    const s = scale();
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const par = 0.09 + i * 0.035;
      const off = camX * par * s * 0.6;
      const baseY = H * (0.10 + i * 0.155);
      const amp = 40 + i * 22;
      ctx.beginPath();
      for (let px = -60; px <= W + 60; px += 24) {
        const u = (px + off) * 0.0018;
        const y = baseY
          + Math.sin(u + t * 0.18 + i * 1.3) * amp
          + Math.sin(u * 2.9 - t * 0.11 + i) * amp * 0.45
          + Math.sin(u * 6.1 + t * 0.26) * amp * 0.16;
        if (px === -60) ctx.moveTo(px, y); else ctx.lineTo(px, y);
      }
      const a = chaosNow * (0.05 + 0.05 * Math.sin(t * 0.23 + i));
      ctx.strokeStyle = i % 2 ? `rgba(96,66,74,${a})` : `rgba(58,84,92,${a})`;
      ctx.stroke();
    }
  }

  /* ---- things reaching out of the dark ---- */
  function drawTendrils() {
    if (chaosNow < 0.05) return;
    ctx.lineWidth = 1.2;
    for (const d of tendrils) {
      const x = wx(d.x, d.par);
      if (!onScreen(x, 260)) continue;
      const near = 1 - Math.min(1, Math.abs(camX - d.x) / (SLOT * 2.4));
      const a = d.a * chaosNow * smooth(near) * (0.5 + 0.5 * Math.sin(t * 0.4 + d.ph));
      if (a < 0.012) continue;
      ctx.strokeStyle = `rgba(120,74,80,${a})`;
      ctx.beginPath();
      const y0 = d.y * H;
      ctx.moveTo(x, y0);
      for (let k = 1; k <= 7; k++) {
        const u = k / 7;
        ctx.lineTo(x + d.dir * d.len * u,
                   y0 + Math.sin(t * 0.6 + d.ph + u * 3.4) * 26 * u + u * 22);
      }
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  }

  /* ---- elder things: silhouettes cut out of the starfield ---- */
  function drawPresences() {
    for (const p of presences) {
      const x = wx(p.x, p.par);
      if (!onScreen(x, p.w * 1.4)) { p.seen = approach(p.seen, 0, 2, 1 / 60); continue; }

      // surfaces slowly when you're near, and only during part of its cycle
      const near = 1 - Math.min(1, Math.abs(camX - p.x) / (SLOT * 2.2));
      const tide = Math.pow(0.5 + 0.5 * Math.sin(t * p.cycle * 6.283 + p.ph), 2.6);
      p.seen = approach(p.seen, smooth(near) * tide * chaosNow, 1.1, 1 / 60);
      if (p.seen < 0.015) continue;

      const y = p.y * H;
      const bw = p.w, bh = p.h;

      // a shape defined by what it hides
      const g = ctx.createRadialGradient(x, y, 0, x, y, bw * 0.5);
      g.addColorStop(0, `rgba(9,12,14,${0.92 * p.seen})`);
      g.addColorStop(0.62, `rgba(10,13,16,${0.7 * p.seen})`);
      g.addColorStop(1, "rgba(10,13,16,0)");
      ctx.save();
      ctx.translate(x, y); ctx.scale(1, bh / bw);
      ctx.fillStyle = g;
      ctx.fillRect(-bw * 0.5, -bw * 0.5, bw, bw);
      ctx.restore();

      // a faint rim, so it reads as mass rather than a hole
      ctx.strokeStyle = `rgba(74,58,64,${0.12 * p.seen})`;
      ctx.beginPath();
      ctx.ellipse(x, y, bw * 0.44, bh * 0.44, 0, 0, 6.283);
      ctx.stroke();

      for (const e of p.eyes) {
        const open = Math.pow(0.5 + 0.5 * Math.sin(t * e.rate * 6.283 + e.ph), 3);
        const a = p.seen * open;
        if (a < 0.02) continue;
        const ex = x + e.dx * bw * 0.4, ey = y + e.dy * bh * 0.4;
        const rr = e.rr * bw;
        const col = e.warm ? "245,208,107" : "176,104,90";
        const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, rr * 4);
        eg.addColorStop(0, `rgba(${col},${0.5 * a})`);
        eg.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = eg; ctx.fillRect(ex - rr * 4, ey - rr * 4, rr * 8, rr * 8);
        ctx.fillStyle = `rgba(${col},${0.85 * a})`;
        ctx.beginPath();
        ctx.ellipse(ex, ey, rr, rr * (0.18 + 0.82 * open), 0, 0, 6.283);
        ctx.fill();
      }
    }
  }

  /* ---- fragments of record, only out where there's nothing ---- */
  function drawFragments() {
    const s = scale();
    const i0 = Math.floor((camX - CAM.viewUnits * 1.4) / FRAG_CHUNK);
    const i1 = Math.ceil((camX + CAM.viewUnits * 1.4) / FRAG_CHUNK);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let i = i0; i <= i1; i++) {
      const pick = hash1(i * 7919 + 31);
      if (pick > 0.4) continue;
      const fx = (i + 0.5) * FRAG_CHUNK + (hash1(i * 131) - 0.5) * FRAG_CHUNK * 0.5;
      if (chaosAt(fx) < 0.35) continue;                 // not near anything built
      const par = 0.42 + hash1(i * 57) * 0.34;
      const x = wx(fx, par);
      if (!onScreen(x, 420)) continue;

      const centre = 1 - Math.min(1, Math.abs(x - W * 0.5) / (W * 0.52));
      const a = smooth(centre) * 0.55 * chaosNow;
      if (a < 0.02) continue;

      const y = H * (0.14 + hash1(i * 313) * 0.7) + Math.sin(t * 0.3 + i) * 9;
      const size = Math.max(10, 13 * s * 0.8);
      ctx.font = `${size}px "IBM Plex Mono", monospace`;
      const txt = FRAGMENTS[Math.floor(hash1(i * 977) * FRAGMENTS.length)];

      // unstable: two offset ghosts under the main line
      const j = Math.sin(t * 7 + i) * 1.4;
      ctx.fillStyle = `rgba(176,104,90,${a * 0.5})`; ctx.fillText(txt, x - j, y);
      ctx.fillStyle = `rgba(143,176,184,${a * 0.5})`; ctx.fillText(txt, x + j, y);
      ctx.fillStyle = `rgba(198,204,198,${a})`;      ctx.fillText(txt, x, y);
    }
    ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
  }

  /* ---- west: what hasn't happened yet ---- */
  function drawFuture() {
    if (futureNow < 0.02) return;
    const a = futureNow;
    const g = ctx.createLinearGradient(0, 0, W * 0.75, 0);
    g.addColorStop(0, `rgba(196,206,210,${0.09 * a})`);
    g.addColorStop(0.45, `rgba(150,166,174,${0.03 * a})`);
    g.addColorStop(1, "rgba(150,166,174,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W * 0.75, H);

    // unformed vertical light, drifting
    ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      const u = hash1(i * 613);
      const x = ((u * W * 1.6 - camX * 0.08 * scale()) % (W * 1.6) + W * 1.6) % (W * 1.6) - W * 0.3;
      if (!onScreen(x, 20)) continue;
      const h = H * (0.3 + hash1(i * 71) * 0.5);
      const y = H * hash1(i * 199) * 0.5;
      ctx.strokeStyle = `rgba(210,220,224,${0.05 * a * (0.4 + 0.6 * Math.sin(t * 0.4 + i))})`;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.stroke();
    }
  }

  function drawWatcher() {
    const x = wx(LAND.watcher, 0.24);
    const R = Math.min(W, H) * 0.26;
    if (!onScreen(x, R * 3.2)) return;
    const y = H * 0.21;
    const g = ctx.createRadialGradient(x, y, R * 0.5, x, y, R * 3.1);
    g.addColorStop(0, "rgba(245,208,107,0.16)");
    g.addColorStop(0.35, "rgba(200,150,90,0.07)");
    g.addColorStop(1, "rgba(245,208,107,0)");
    ctx.fillStyle = g; ctx.fillRect(x - R * 3.2, y - R * 3.2, R * 6.4, R * 6.4);
    const d = ctx.createRadialGradient(x - R * 0.2, y - R * 0.2, R * 0.1, x, y, R);
    d.addColorStop(0, "#f7dc95"); d.addColorStop(0.72, "#c79a52"); d.addColorStop(1, "#6b4f28");
    ctx.beginPath(); ctx.arc(x, y, R, 0, 6.283); ctx.fillStyle = d; ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.06);
    ctx.globalAlpha = 0.9; ctx.fillStyle = "#161013";
    ctx.beginPath(); ctx.ellipse(0, 0, R * 0.16, R * 0.62, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 0.5; ctx.strokeStyle = "#1d1418"; ctx.lineWidth = R * 0.035;
    for (let i = 0; i < 9; i++) {
      const a2 = (i / 9) * 6.283;
      ctx.beginPath();
      ctx.arc(0, 0, R * (0.34 + (i % 3) * 0.2), a2, a2 + 0.7 + Math.sin(t * 0.3 + i) * 0.2);
      ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  function drawBand(list, par, colour, alpha) {
    const s = scale(), floor = H * FLOOR;
    ctx.fillStyle = colour; ctx.globalAlpha = alpha;
    for (const tw of list) {
      const x = wx(tw.x, par);
      if (!onScreen(x, 200)) continue;
      ctx.fillRect(x, floor - tw.h * H, Math.max(1, tw.w * s * par), tw.h * H);
    }
    ctx.globalAlpha = 1;
  }

  function drawCityNear() {
    const par = 0.66, s = scale(), k = s * par * 0.9, floor = H * FLOOR;
    for (const tw of city.near) {
      const x = wx(tw.x, par);
      if (!onScreen(x, 220)) continue;
      const w = Math.max(1, tw.w * s * par), h = tw.h * H;
      ctx.fillStyle = "#1b2327"; ctx.fillRect(x, floor - h, w, h);
      if (w > 18) {
        for (const win of tw.windows) {
          const px = x + win.dx * k, py = floor - h + win.dy * k;
          if (!onScreen(px, 6) || py > H) continue;
          ctx.globalAlpha = win.a * (0.75 + 0.25 * Math.sin(t * 2.1 + win.fl)) * 0.85;
          ctx.fillStyle = win.warm ? "#f5d06b" : "#8fb0b8";
          ctx.fillRect(px, py, 2.2, 3);
        }
        ctx.globalAlpha = 1;
      }
    }
    for (const c of swarm) {
      const x = wx(c.x + Math.sin(t * 0.5 + c.ph) * c.amp, par);
      if (!onScreen(x, 14)) continue;
      ctx.globalAlpha = c.a * (0.4 + 0.6 * Math.sin(t * 3 + c.ph));
      ctx.fillStyle = "#d8cfa8";
      ctx.beginPath();
      ctx.arc(x, c.y * H + Math.cos(t * 0.8 + c.ph) * c.amp * 0.5, c.rr, 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawRex() {
    const floor = H * FLOOR;
    ctx.globalAlpha = 1;
    const par = 0.62;
    if (wx(rex.ridge[rex.ridge.length - 1].x, par) < -160 || wx(rex.ridge[0].x, par) > W + 160) return;
    const pts = rex.ridge.map(p => ({
      x: Math.max(-400, Math.min(W + 400, wx(p.x, par))), y: floor - p.h * H }));
    ctx.beginPath(); ctx.moveTo(pts[0].x, H + 10);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.lineTo(pts[pts.length - 1].x, H + 10); ctx.closePath();
    const g = ctx.createLinearGradient(0, H * 0.2, 0, H);
    g.addColorStop(0, "#2c363c"); g.addColorStop(1, "#141b1f");
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = "rgba(143,176,184,0.38)"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.lineWidth = 1;
  }

  /* ---- THE ROOT — a wall of flesh, and it is breathing ---- */
  function drawRoot() {
    const par = 0.7;
    const x = wx(LAND.root, par);
    if (x > W + 120) return;
    const cx = Math.max(-500, x);
    const breath = 0.5 + 0.5 * Math.sin(t * 0.34);
    const near = smooth(1 - Math.min(1, Math.abs(camX - CAM.max) / (SLOT * 3)));

    // approach glow — you feel it before you see it
    const halo = ctx.createLinearGradient(cx - 460, 0, cx, 0);
    halo.addColorStop(0, "rgba(120,26,32,0)");
    halo.addColorStop(1, `rgba(132,30,36,${0.09 + 0.05 * breath})`);
    ctx.fillStyle = halo; ctx.fillRect(cx - 460, 0, 460, H);

    // the mass
    const g = ctx.createLinearGradient(cx - 60, 0, W, 0);
    g.addColorStop(0, "#3a0f14");
    g.addColorStop(0.28, "#2a0a0f");
    g.addColorStop(1, "#12060a");
    ctx.fillStyle = g; ctx.fillRect(cx - 60, 0, W - cx + 120, H);

    // sinew running down the face, drifting
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 26; i++) {
      const sx = cx + 10 + hash1(i * 811) * (W - cx + 40);
      if (sx > W + 20) continue;
      const wob = 12 + hash1(i * 97) * 26;
      ctx.strokeStyle = `rgba(190,58,62,${0.05 + 0.07 * hash1(i * 13) * (0.4 + 0.6 * breath)})`;
      ctx.beginPath();
      for (let k = 0; k <= 8; k++) {
        const u = k / 8, y = u * H;
        const px = sx + Math.sin(u * 5.2 + t * 0.5 + i) * wob;
        if (k === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
      }
      ctx.stroke();
    }
    ctx.lineWidth = 1;

    // pores, and things behind them
    for (let i = 0; i < 34; i++) {
      const px = cx + 20 + hash1(i * 331) * (W - cx + 20);
      if (px > W + 10) continue;
      const py = hash1(i * 617) * H;
      const rr = 3 + hash1(i * 43) * 13;
      const pulse = 0.5 + 0.5 * Math.sin(t * (0.3 + hash1(i * 7) * 0.5) + i);
      const pg = ctx.createRadialGradient(px, py, 0, px, py, rr * 3);
      pg.addColorStop(0, `rgba(226,74,66,${0.16 * pulse * (0.4 + 0.6 * near)})`);
      pg.addColorStop(1, "rgba(226,74,66,0)");
      ctx.fillStyle = pg; ctx.fillRect(px - rr * 3, py - rr * 3, rr * 6, rr * 6);
    }

    // the boundary: raw, not a clean edge
    ctx.strokeStyle = `rgba(214,72,68,${0.28 + 0.16 * breath})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k <= 22; k++) {
      const u = k / 22, y = u * H;
      const px = cx + Math.sin(u * 9 + t * 0.4) * 7 + Math.sin(u * 21 - t * 0.25) * 3;
      if (k === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function drawBridge() {
    const par = 0.94, s = scale();
    const deckY = H * DECK;
    const bayPx = Math.max(24, BAY * s * par);
    const legW  = Math.min(3, Math.max(1.2, bayPx * 0.007));
    const deckH = Math.min(6, Math.max(2.5, bayPx * 0.013));
    const rise  = bayPx * 0.20;
    const legBot = H * 1.22;

    const gl = ctx.createLinearGradient(0, deckY - 90, 0, deckY + 40);
    gl.addColorStop(0, "rgba(245,208,107,0)");
    gl.addColorStop(0.78, "rgba(245,208,107,0.055)");
    gl.addColorStop(1, "rgba(245,208,107,0)");
    ctx.fillStyle = gl; ctx.fillRect(0, deckY - 90, W, 130);

    const first = Math.floor((camX - CAM.viewUnits) / BAY) - 1;
    const last  = Math.ceil((camX + CAM.viewUnits) / BAY) + 1;

    const lg = ctx.createLinearGradient(0, deckY, 0, legBot);
    lg.addColorStop(0, "rgba(150,168,178,0.62)");
    lg.addColorStop(0.28, "rgba(112,130,140,0.30)");
    lg.addColorStop(0.72, "rgba(86,102,112,0.08)");
    lg.addColorStop(1, "rgba(70,84,92,0)");
    ctx.fillStyle = lg;
    for (let b = first; b <= last; b++) {
      if (hash1(b * 5701 + 17) < 0.05) continue;
      const x = wx(b * BAY, par);
      if (!onScreen(x, 20)) continue;
      ctx.fillRect(x - legW / 2, deckY + deckH, legW, legBot - deckY - deckH);
    }
    ctx.strokeStyle = "rgba(132,150,159,0.26)";
    ctx.lineWidth = Math.max(0.8, legW * 0.55);
    for (let b = first; b <= last; b++) {
      const x0 = wx(b * BAY, par);
      if (!onScreen(x0, bayPx + 20)) continue;
      ctx.beginPath();
      ctx.ellipse(x0 + bayPx / 2, deckY + deckH + rise, bayPx / 2 - legW, rise, 0, Math.PI, 0);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    for (let b = first; b <= last; b++) {
      const x = wx(b * BAY, par);
      if (!onScreen(x, 24)) continue;
      const r = hash1(b * 911 + 7);
      ctx.fillStyle = "rgba(120,138,147,0.4)";
      ctx.fillRect(x - legW * 0.4, deckY - deckH * 1.9, legW * 0.8, deckH * 1.9);
      if (r < 0.13) {
        const mh = deckH * (4.5 + r * 22);
        ctx.fillStyle = "rgba(120,138,147,0.34)";
        ctx.fillRect(x - legW * 0.3, deckY - mh, legW * 0.6, mh);
        ctx.fillStyle = "rgba(245,208,107,0.75)";
        ctx.fillRect(x - legW * 0.55, deckY - mh - legW * 0.7, legW * 1.1, legW * 1.1);
      }
    }
    ctx.fillStyle = "rgba(36,45,51,0.92)";
    ctx.fillRect(0, deckY, W, deckH);
    ctx.fillStyle = "rgba(245,208,107,0.62)";
    for (let b = first; b <= last; b++) {
      if (hash1(b * 3391 + 29) < 0.06) continue;
      const x = wx(b * BAY, par);
      if (!onScreen(x, bayPx + 20)) continue;
      ctx.fillRect(x, deckY - 1.6, bayPx + 1, 2.4);
    }
  }

  /* ---- markers ---- */
  function drawMarks(dt) {
    for (const m of MARKS) {
      const p = markScreen(m);
      m.vis = approach(m.vis, onScreen(p.x, 60) ? 1 : 0, 3.2, dt);
      if (m.vis < 0.02) continue;
      Beacon.draw(ctx, p.x, p.y, {
        t, phase: m.phase, alpha: m.vis,
        active: activeMark === m, hover: hoverMark === m,
        claimed: window.XP && XP.has("beacon-" + m.id),
        xp: m.xp,
      });
    }
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
    chaosNow  = approach(chaosNow,  chaosAt(camX),  1.4, dt);
    futureNow = approach(futureNow, futureAt(camX), 1.4, dt);

    ctx.globalAlpha = 1; ctx.lineWidth = 1;
    ctx.fillStyle = "#0d1114"; ctx.fillRect(0, 0, W, H);
    drawVoid();
    drawChaos();
    drawPresences();
    drawTendrils();
    drawFuture();
    drawWatcher();
    drawBand(city.far, 0.30, "#161d21", 0.5);
    drawRex();
    drawBand(city.mid, 0.46, "#182025", 0.78);
    drawCityNear();
    drawRoot();
    drawFragments();
    drawBridge();
    drawMarks(dt);

    if (activeMark && noteEls[activeMark.id] && noteEls[activeMark.id].classList.contains("show"))
      placeNote(noteEls[activeMark.id], activeMark);

    updateHUD(dt);

  }

  /* the log always plays through — a returning visitor still waits for
     the scene to settle rather than being dropped into a half-drawn frame */
  function finishLoading() {
    if (!loadEl) return;
    const known = !(window.XP && XP.isNew);

    if (known) {
      setLoad(0, `entry found: ${XP.name.toLowerCase()} · ref ${XP.ref}`);
      setLoad(0, `level ${XP.level} of ${XP.total} · resuming`);
    } else {
      setLoad(0, `provisional entry: ${XP.name.toLowerCase()} · ref ${XP.ref}`);
      setLoad(0, "level 0 · one unfiled beacon in reach");
    }

    const go = document.getElementById("entry-go");
    if (!go) return;

    if (known) {
      // nothing left to claim here — it's just the way in
      const lbl = go.querySelector(".bcn-lbl");
      if (lbl) lbl.textContent = "Continue";
      go.classList.add("plain");
      go.addEventListener("click", () => loadEl.classList.add("done"), { once: true });
    } else if (window.Beacon) {
      Beacon.attach(go, {
        id: "entry-beacon", xp: 1, label: "Filed",
        onClaim: () => { XP.seen(); setTimeout(() => loadEl.classList.add("done"), 900); },
      });
    }
  }

  if (!reduced) requestAnimationFrame(frame);
  else {
    ctx.fillStyle = "#0d1114"; ctx.fillRect(0, 0, W, H);
    drawVoid(); drawWatcher(); drawRex(); drawBridge(); drawMarks(0.016);
    setLoad(1, "Ready");
    if (loadEl) loadEl.classList.add("done");
  }
})();
