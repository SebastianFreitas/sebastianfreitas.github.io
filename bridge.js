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
    baseSpeed: 3200,
    boostSpeed: 26000,
    boostRamp: 0.34,
    boostDecay: 2.2,
    accel: 2.4, drag: 3.0,
    deadzone: 0.20,
    viewUnits: 2100,
    brakeZone: 9000,
  };

  const DECK  = 0.40;
  const FLOOR = 1.14;
  const BAY   = 150;

  const MARKS = [
    { id: "bnote-future",  x: LAND.future - 900,     cam: LAND.future,   oy: 0.34, par: 0.30,
      name: "The Unwritten",  sub: "West of the last recorded thing" },
    { id: "bnote-land",    x: LAND.mainland + 1900,  cam: LAND.mainland, oy: 0.55, par: 0.66,
      name: "The Mainland",   sub: "Libertech census in progress" },
    { id: "bnote-void",    x: LAND.voidmark,         cam: LAND.voidmark, oy: 0.20, par: 0.30,
      name: "Unmapped",       sub: "Nothing has been recorded here" },
    { id: "bnote-bridge",  x: LAND.bridge + 520,     cam: LAND.bridge,   oy: 0.30, par: 0.94,
      name: "The Bridge",     sub: "First law. It holds because it must" },
    { id: "bnote-watcher", x: LAND.watcher + 2600,   cam: LAND.watcher,  oy: 0.46, par: 0.24,
      name: "The Watcher",    sub: "It is no longer only watching" },
    { id: "bnote-rex",     x: LAND.rex - 1100,       cam: LAND.rex,      oy: 0.62, par: 0.62,
      name: "Rex Immotus",    sub: "The god that became the matter" },
    { id: "bnote-root",    x: CAM.max - 300,         cam: CAM.max,       oy: 0.28, par: 0.70,
      name: "The Root",       sub: "It is still growing" },
  ];
  MARKS.forEach((m, i) => { m.phase = i * 1.7; m.vis = 0; });

  const HIT = 26;

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

  /* ---- loading ---- */
  const loadEl  = document.getElementById("bridge-loading");
  const loadBar = document.getElementById("bridge-loadbar");
  const loadTxt = document.getElementById("bridge-loadtxt");
  const bootAt = performance.now();
  let loadPct = 0;
  function setLoad(p, label) {
    loadPct = Math.max(loadPct, p);
    if (loadBar) loadBar.style.width = (loadPct * 100).toFixed(1) + "%";
    if (loadTxt && label) loadTxt.textContent = label;
  }
  setLoad(0.05, "Reading the span");

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
  setLoad(0.3, "Counting the mainland");

  /* ---- Rex ---- */
  const rex = { ridge: [], shards: [] };
  (function () {
    const r = mulberry(77341);
    const from = LAND.rex - SLOT * 1.1, to = LAND.rex + SLOT * 1.0;
    for (let i = 0; i <= 70; i++) {
      const u = i / 70;
      rex.ridge.push({ x: from + u * (to - from),
        h: 0.26 + u * 0.62 + Math.sin(u * 11) * 0.045 + (r() - 0.5) * 0.05 });
    }
    for (let i = 0; i < 46; i++)
      rex.shards.push({ x: LAND.rex - SLOT * 1.6 + r() * SLOT * 3.2,
                        y: 0.14 + r() * 0.46, s: 12 + r() * 86,
                        rot: r() * 6.28, spin: (r() - 0.5) * 0.04, a: 0.16 + r() * 0.5 });
  })();
  setLoad(0.5, "Settling the matter");

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
  setLoad(0.72, "Stirring the chaos");

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
  let camX = LAND.bridge, vel = 0, steer = 0, boost = 0, travelled = 0, t = 0;
  let catalogued = 4182993201, started = false, visible = true;
  let flyTo = null, activeMark = null, hoverMark = null;
  let scrubbing = false, armed = false, armX = 0, armMoved = 0;
  let chaosNow = 0, futureNow = 0;

  const cursor = document.getElementById("bridge-cursor");
  const edgeL  = host.querySelector(".edge.l");
  const edgeR  = host.querySelector(".edge.r");

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
  if (beginBtn) beginBtn.addEventListener("click", e => { e.preventDefault(); begin(); });

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
      const sx = markScreen(mark).x;
      el2.classList.toggle("left",  sx > W * 0.5);
      el2.classList.toggle("right", sx <= W * 0.5);
      el2.classList.add("show");
      if (mark.id === "bnote-land" && noteCat) noteCat.textContent = fmt(catalogued);
    }, 280);
  }
  function selectMark(m) {
    begin();
    activeMark = m; showNote(null);
    const dist = Math.abs(m.cam - camX);
    flyTo = { from: camX, to: m.cam, elapsed: 0,
              dur: Math.min(2.4, Math.max(0.6, dist / 40000 * 2.0)),
              then: () => showNote(m) };
    vel = 0; boost = 0;
  }
  function clearMark() { if (activeMark) { activeMark = null; showNote(null); } }

  /* ---- input ---- */
  function applySteer(clientX) {
    const r = host.getBoundingClientRect();
    const n = ((clientX - r.left) / r.width - 0.5) * 2, dz = CAM.deadzone;
    steer = Math.abs(n) < dz ? 0 : Math.sign(n) * Math.pow((Math.abs(n) - dz) / (1 - dz), 1.6);
    if (steer !== 0 && flyTo && Math.abs(steer) > 0.4) { flyTo = null; clearMark(); }
  }
  function stopSteering() { steer = 0; if (cursor) cursor.classList.remove("on"); }

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

  addEventListener("pointermove", e => {
    const r = host.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom) { stopSteering(); hoverMark = null; return; }
    if (cursor) {
      cursor.classList.add("on");
      cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    }
    hoverMark = markAt(e.clientX, e.clientY);
    if (cursor) cursor.classList.toggle("over", !!hoverMark);
    if (started && !hoverMark) applySteer(e.clientX);
    else if (hoverMark) steer = 0;
  }, { passive: true });

  document.documentElement.addEventListener("mouseleave", stopSteering);
  addEventListener("blur", stopSteering);
  addEventListener("pointercancel", stopSteering);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopSteering(); });

  cv.addEventListener("pointerdown", e => {
    const m = markAt(e.clientX, e.clientY);
    if (m) selectMark(m); else { begin(); clearMark(); }
  });

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
      d.addEventListener("pointerdown", ev => { ev.stopPropagation(); selectMark(m); });
      track.appendChild(d);
    }
    for (let i = 0; i < 30; i++) {
      const d = document.createElement("div");
      d.className = "mk"; d.style.left = (i / 29 * 100) + "%";
      track.appendChild(d);
    }
    track.addEventListener("pointerdown", e => {
      begin(); armed = true; armMoved = 0; armX = e.clientX;
      track.setPointerCapture(e.pointerId); e.preventDefault();
    });
    track.addEventListener("pointermove", e => {
      if (ghost) {
        const r = track.getBoundingClientRect();
        ghost.style.left = Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100)) + "%";
      }
      if (!armed) return;
      armMoved += Math.abs(e.clientX - armX); armX = e.clientX;
      if (armMoved > 5) { scrubbing = true; flyTo = null; clearMark(); camX = posFromEvent(e); vel = 0; boost = 0; }
    });
    track.addEventListener("pointerup", e => {
      if (!armed) return;
      if (!scrubbing) {
        const to = posFromEvent(e), dist = Math.abs(to - camX);
        flyTo = { from: camX, to, elapsed: 0, dur: Math.min(2.4, Math.max(0.6, dist / 40000 * 2.0)) };
        clearMark(); vel = 0; boost = 0;
      }
      armed = false; scrubbing = false;
    });
    track.addEventListener("pointercancel", () => { armed = false; scrubbing = false; });
  }
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
    const streak = Math.min(60, Math.abs(vel) / CAM.boostSpeed * 220);
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
    for (const sh of rex.shards) {
      const x = wx(sh.x, 0.38);
      if (!onScreen(x, 180)) continue;
      sh.rot += sh.spin * 0.01;
      ctx.save();
      ctx.translate(x, sh.y * H + Math.sin(t * 0.3 + sh.x * 0.001) * 12);
      ctx.rotate(sh.rot);
      ctx.globalAlpha = sh.a * 0.72; ctx.fillStyle = "#243036";
      ctx.beginPath();
      ctx.moveTo(-sh.s * .5, -sh.s * .2); ctx.lineTo(sh.s * .4, -sh.s * .5);
      ctx.lineTo(sh.s * .5, sh.s * .3);   ctx.lineTo(-sh.s * .2, sh.s * .5);
      ctx.closePath(); ctx.fill(); ctx.restore();
    }
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
    const legW  = Math.min(4, Math.max(1.4, bayPx * 0.014));
    const deckH = Math.min(7, Math.max(2.5, bayPx * 0.028));
    const rise  = bayPx * 0.30;
    const legBot = H * 1.22;

    const gl = ctx.createLinearGradient(0, deckY - 90, 0, deckY + 40);
    gl.addColorStop(0, "rgba(245,208,107,0)");
    gl.addColorStop(0.78, "rgba(245,208,107,0.055)");
    gl.addColorStop(1, "rgba(245,208,107,0)");
    ctx.fillStyle = gl; ctx.fillRect(0, deckY - 90, W, 130);

    const sh = ctx.createLinearGradient(0, deckY + deckH, 0, H);
    sh.addColorStop(0, "rgba(4,6,8,0.55)"); sh.addColorStop(1, "rgba(4,6,8,0)");
    ctx.fillStyle = sh; ctx.fillRect(0, deckY + deckH, W, H - deckY);

    const first = Math.floor((camX - CAM.viewUnits) / BAY) - 1;
    const last  = Math.ceil((camX + CAM.viewUnits) / BAY) + 1;

    const lg = ctx.createLinearGradient(0, deckY, 0, legBot);
    lg.addColorStop(0, "rgba(126,143,152,0.55)");
    lg.addColorStop(0.35, "rgba(96,112,120,0.30)");
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
      const near = onScreen(p.x, 60);
      m.vis = approach(m.vis, near ? 1 : 0, 3.2, dt);
      if (m.vis < 0.02) continue;

      const active = activeMark === m, hover = hoverMark === m;
      const blink = active ? 1 : 0.42 + 0.58 * Math.pow(0.5 + 0.5 * Math.sin(t * 1.15 + m.phase), 2.2);
      const k = (hover ? 1.35 : 1) * (active ? 1.2 : 1);
      const A = m.vis;

      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 26 * k);
      glow.addColorStop(0, `rgba(245,208,107,${0.30 * blink * A})`);
      glow.addColorStop(1, "rgba(245,208,107,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(p.x - 30 * k, p.y - 30 * k, 60 * k, 60 * k);

      const arm = (5 + 9 * blink) * k;
      ctx.strokeStyle = `rgba(255,240,205,${0.55 * blink * A})`;
      ctx.beginPath();
      ctx.moveTo(p.x - arm, p.y); ctx.lineTo(p.x + arm, p.y);
      ctx.moveTo(p.x, p.y - arm); ctx.lineTo(p.x, p.y + arm);
      ctx.stroke();

      ctx.fillStyle = `rgba(255,245,220,${(0.6 + 0.4 * blink) * A})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.9 * k, 0, 6.283); ctx.fill();

      if (active || hover) {
        ctx.strokeStyle = `rgba(245,208,107,${(active ? 0.7 : 0.4) * A})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 13 * k, 0, 6.283); ctx.stroke();
      }
      if (!active) {
        const ring = (t * 0.5 + m.phase * 0.2) % 1;
        ctx.strokeStyle = `rgba(245,208,107,${(1 - ring) * 0.20 * A})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 8 + ring * 22, 0, 6.283); ctx.stroke();
      }
    }
  }

  /* ---- HUD, with the region name crossfading ---- */
  const el = {
    vel:  document.getElementById("bvel"),  velbar: document.getElementById("bvelbar"),
    dist: document.getElementById("bdist"), pct: document.getElementById("bpct"),
    cat:  document.getElementById("bcat"),
    regname: document.getElementById("bregname"), regsub: document.getElementById("bregsub"),
    region: document.getElementById("bridge-region"),
    you: document.getElementById("byou"),
  };
  let lastRegion = "", regionTimer = null;
  function setRegion(name, sub) {
    if (name === lastRegion) return;
    lastRegion = name;
    if (!el.region) return;
    el.region.classList.add("swapping");
    clearTimeout(regionTimer);
    regionTimer = setTimeout(() => {
      if (el.regname) el.regname.textContent = name;
      if (el.regsub)  el.regsub.textContent = sub;
      el.region.classList.remove("swapping");
    }, 260);
  }

  function updateHUD(dt) {
    if (el.vel)    el.vel.textContent = fmt(Math.abs(vel));
    if (el.velbar) el.velbar.style.width = Math.min(100, Math.abs(vel) / CAM.boostSpeed * 100) + "%";
    if (el.dist)   el.dist.textContent = fmt(travelled);
    if (el.pct)    el.pct.textContent = ((CAM.max - camX) / (CAM.max - CAM.min) * 100).toFixed(1);
    if (el.you)    el.you.style.left = ((camX - CAM.min) / (CAM.max - CAM.min) * 100) + "%";

    if (Math.abs(camX - LAND.mainland) < SLOT * 1.4)
      catalogued += (160 + Math.abs(vel) * 0.02) * dt;
    if (el.cat) el.cat.textContent = fmt(catalogued);

    let near = null, nd = Infinity;
    for (const m of MARKS) {
      const d = Math.abs(camX - m.cam);
      if (d < SLOT * 1.6 && d < nd) { near = m; nd = d; }
    }
    setRegion(near ? near.name : "The Bridge",
              near ? near.sub  : "First law. It holds because it must");

    host.classList.toggle("moving", Math.abs(vel) > 200);
    const sv = Math.min(1, Math.abs(steer));
    if (edgeL) edgeL.style.opacity = steer < 0 ? sv : 0;
    if (edgeR) edgeR.style.opacity = steer > 0 ? sv : 0;
  }

  /* ---- movement ---- */
  function step(dt) {
    if (!started || scrubbing) { vel = 0; return; }
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
    if (Math.abs(steer) > 0.55) boost = Math.min(1, boost + dt * CAM.boostRamp);
    else boost = Math.max(0, boost - dt * CAM.boostDecay);
    const cap = CAM.baseSpeed + (CAM.boostSpeed - CAM.baseSpeed) * boost * boost;

    let target = steer * cap;
    const toMin = camX - CAM.min, toMax = CAM.max - camX;
    if (target < 0 && toMin < CAM.brakeZone) target *= Math.max(0.04, toMin / CAM.brakeZone);
    if (target > 0 && toMax < CAM.brakeZone) target *= Math.max(0.04, toMax / CAM.brakeZone);

    vel += (target - vel) * Math.min(1, dt * (steer === 0 ? CAM.drag : CAM.accel));
    if (Math.abs(vel) < 0.5) vel = 0;

    const prev = camX;
    camX += vel * dt;
    travelled += Math.abs(camX - prev);
    if (activeMark && Math.abs(camX - activeMark.cam) > SLOT * 0.9) clearMark();
    if (camX < CAM.min) { camX = CAM.min; vel = 0; boost = 0; }
    if (camX > CAM.max) { camX = CAM.max; vel = 0; boost = 0; }
  }

  /* ---- loop ---- */
  let last = performance.now(), firstFrame = true;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    requestAnimationFrame(frame);
    if (!visible) return;
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

    updateHUD(dt);

    if (firstFrame) {
      firstFrame = false;
      setLoad(1, "Ready");
      const wait = Math.max(0, 700 - (performance.now() - bootAt));
      setTimeout(() => { if (loadEl) loadEl.classList.add("done"); }, wait);
    }
  }

  setLoad(0.92, "Lighting the span");
  if (!reduced) requestAnimationFrame(frame);
  else {
    ctx.fillStyle = "#0d1114"; ctx.fillRect(0, 0, W, H);
    drawVoid(); drawWatcher(); drawRex(); drawBridge(); drawMarks(0.016);
    setLoad(1, "Ready");
    if (loadEl) loadEl.classList.add("done");
  }
})();
