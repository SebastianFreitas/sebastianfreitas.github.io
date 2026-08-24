/* ===========================================================
   THE BRIDGE — homepage hero traversal.

   Map:  ___________M____________________________________________________W__RP
   69 slots, one slot ≈ one mainland width.
       M  11   the mainland        W  64   the Watcher
       R  67   Rex                 P  68   Primordisentia (the wall)

   Projection:  screenX = (worldX - camX) * parallax * scale + W/2
   so an object sits at screen centre exactly when the camera
   reaches its world coordinate, at any depth.
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
    mainland: at(11.5),
    watcher:  at(64.5),
    rex:      at(67.5),
    wall:     at(68.6),
  };

  const CAM = {
    min: LAND.mainland,
    max: LAND.wall - 1600,
    baseSpeed: 3200,
    boostSpeed: 26000,
    boostRamp: 0.34,
    boostDecay: 2.2,
    accel: 2.4, drag: 3.0,
    deadzone: 0.20,
    viewUnits: 2100,
    brakeZone: 9000,
  };

  const NOTES = [
    { id: "bnote-land",    x: LAND.mainland, r: 5200, name: "The Mainland",    sub: "Libertech census in progress" },
    { id: "bnote-watcher", x: LAND.watcher,  r: 4200, name: "The Watcher",     sub: "It is no longer only watching" },
    { id: "bnote-rex",     x: LAND.rex,      r: 3600, name: "Rex Immotus",     sub: "The god that became the matter" },
    { id: "bnote-wall",    x: CAM.max,       r: 2200, name: "Primordisentia",  sub: "The past. No further" },
  ];

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
                        y: 0.08 + r() * 0.5, s: 12 + r() * 86,
                        rot: r() * 6.28, spin: (r() - 0.5) * 0.04, a: 0.16 + r() * 0.5 });
  })();

  /* ---- void ---- */
  const blobs = [], motes = [], swarm = [];
  (function () {
    const r = mulberry(4242);
    for (let i = 0; i < 10; i++)
      blobs.push({ u: r(), y: 0.2 + r() * 0.85, rad: 0.2 + r() * 0.46,
                   vy: (r() - 0.5) * 0.004, a: 0.05 + r() * 0.1,
                   hue: r() < 0.5 ? "34,52,60" : "62,40,44" });
    for (let i = 0; i < 420; i++)
      motes.push({ u: r(), y: r(), rr: 0.4 + r() * 1.5, ph: r() * 6.28, a: 0.06 + r() * 0.3 });
    for (let i = 0; i < 620; i++)
      swarm.push({ x: CITY_FROM - 900 + r() * (CITY_TO - CITY_FROM + 1800),
                   y: 0.26 + r() * 0.64, rr: 0.3 + r() * 0.95,
                   ph: r() * 6.28, amp: 6 + r() * 30, a: 0.15 + r() * 0.5 });
  })();

  /* ---- state ---- */
  let camX = LAND.rex, vel = 0, steer = 0, boost = 0, travelled = 0, t = 0;
  let catalogued = 4182993201, lastRegion = "", started = false, visible = true;

  const cursor = document.getElementById("bridge-cursor");
  const edgeL  = host.querySelector(".edge.l");
  const edgeR  = host.querySelector(".edge.r");

  const scale = () => W / CAM.viewUnits;
  const wx = (worldX, par) => (worldX - camX) * par * scale() + W * 0.5;
  const fmt = n => Math.round(n).toLocaleString("en-US");

  /* ---- input, only while the pointer is over the hero ---- */
  function onMove(e) {
    const r = host.getBoundingClientRect();
    const inside = e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) { steer = 0; cursor.classList.remove("on"); return; }

    cursor.classList.add("on");
    cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;

    const n = ((e.clientX - r.left) / r.width - 0.5) * 2, dz = CAM.deadzone;
    steer = Math.abs(n) < dz ? 0 : Math.sign(n) * Math.pow((Math.abs(n) - dz) / (1 - dz), 1.6);
    if (steer !== 0) begin();
  }
  addEventListener("pointermove", onMove, { passive: true });
  addEventListener("pointerleave", () => { steer = 0; cursor.classList.remove("on"); });

  /* the pitch fades once you actually start moving */
  const copy = document.getElementById("bridge-copy");
  function begin() {
    if (started) return;
    started = true;
    host.classList.add("live");
    copy.classList.add("faded");
  }
  const beginBtn = document.getElementById("bridge-begin");
  if (beginBtn) beginBtn.addEventListener("click", e => { e.preventDefault(); begin(); });

  /* pause when scrolled away */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.02 })
      .observe(host);
  }

  /* ---- draw ---- */
  function drawVoid() {
    const s = scale(), span = W * 2.4, off = camX * 0.06 * s;
    for (const b of blobs) {
      b.y += b.vy * 0.02;
      if (b.y > 1.3) b.y = -0.25; if (b.y < -0.3) b.y = 1.25;
      const x = ((b.u * span - off) % span + span) % span - span * 0.2;
      const y = b.y * H, rad = b.rad * Math.max(W, H);
      if (x < -rad || x > W + rad) continue;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(${b.hue},${b.a})`); g.addColorStop(1, `rgba(${b.hue},0)`);
      ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }

    const off2 = camX * 0.14 * s;
    const streak = Math.min(60, Math.abs(vel) / CAM.boostSpeed * 220);
    ctx.strokeStyle = "#c6ccc6"; ctx.fillStyle = "#c6ccc6";
    for (const m of motes) {
      const x = ((m.u * span - off2) % span + span) % span - span * 0.2;
      if (x < -80 || x > W + 80) continue;
      const y = m.y * H + Math.sin(t * 0.5 + m.ph) * 16;
      ctx.globalAlpha = m.a * (0.55 + 0.45 * Math.sin(t * 1.6 + m.ph));
      if (streak > 3) {
        ctx.lineWidth = m.rr;
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x + Math.sign(vel) * streak * (0.4 + m.rr * 0.4), y);
        ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(x, y, m.rr, 0, 6.283); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawWatcher() {
    const x = wx(LAND.watcher, 0.24);
    const R = Math.min(W, H) * 0.30;
    if (x < -R * 3.2 || x > W + R * 3.2) return;
    const y = H * 0.27;

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
    ctx.restore(); ctx.globalAlpha = 1;
  }

  function drawBand(list, par, colour, alpha) {
    const s = scale();
    ctx.fillStyle = colour; ctx.globalAlpha = alpha;
    for (const tw of list) {
      const x = wx(tw.x, par), w = Math.max(1, tw.w * s * par);
      if (x + w < -40 || x > W + 40) continue;
      const h = tw.h * H; ctx.fillRect(x, H - h, w, h);
    }
    ctx.globalAlpha = 1;
  }

  function drawCityNear() {
    const par = 0.66, s = scale(), k = s * par * 0.9;
    for (const tw of city.near) {
      const x = wx(tw.x, par), w = Math.max(1, tw.w * s * par);
      if (x + w < -90 || x > W + 90) continue;
      const h = tw.h * H;
      ctx.fillStyle = "#1b2327"; ctx.fillRect(x, H - h, w, h);
      if (w > 18) {
        for (const win of tw.windows) {
          const px = x + win.dx * k, py = H - h + win.dy * k;
          if (px < -4 || px > W + 4 || py > H) continue;
          ctx.globalAlpha = win.a * (0.75 + 0.25 * Math.sin(t * 2.1 + win.fl)) * 0.85;
          ctx.fillStyle = win.warm ? "#f5d06b" : "#8fb0b8";
          ctx.fillRect(px, py, 2.2, 3);
        }
        ctx.globalAlpha = 1;
      }
    }
    for (const c of swarm) {
      const x = wx(c.x + Math.sin(t * 0.5 + c.ph) * c.amp, par);
      if (x < -12 || x > W + 12) continue;
      ctx.globalAlpha = c.a * (0.4 + 0.6 * Math.sin(t * 3 + c.ph));
      ctx.fillStyle = "#d8cfa8";
      ctx.beginPath();
      ctx.arc(x, c.y * H + Math.cos(t * 0.8 + c.ph) * c.amp * 0.5, c.rr, 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawRex() {
    for (const sh of rex.shards) {
      const x = wx(sh.x, 0.38);
      if (x < -170 || x > W + 170) continue;
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
    const pts = rex.ridge.map(p => ({ x: wx(p.x, par), y: H - p.h * H }));
    if (pts[pts.length - 1].x < -120 || pts[0].x > W + 120) return;

    ctx.beginPath(); ctx.moveTo(pts[0].x, H + 10);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.lineTo(pts[pts.length - 1].x, H + 10); ctx.closePath();
    const g = ctx.createLinearGradient(0, H * 0.12, 0, H);
    g.addColorStop(0, "#2c363c"); g.addColorStop(1, "#141b1f");
    ctx.fillStyle = g; ctx.fill();

    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = "rgba(143,176,184,0.38)"; ctx.lineWidth = 1.5; ctx.stroke();
  }

  function drawWall() {
    const x = wx(LAND.wall, 0.7);
    if (x > W + 60) return;
    const g = ctx.createLinearGradient(x - 220, 0, x, 0);
    g.addColorStop(0, "rgba(2,4,5,0)"); g.addColorStop(1, "rgba(2,4,5,1)");
    ctx.fillStyle = g; ctx.fillRect(x - 220, 0, 220, H);
    ctx.fillStyle = "#020405"; ctx.fillRect(x, 0, W - x + 60, H);
    ctx.fillStyle = "rgba(143,176,184,0.13)"; ctx.fillRect(x - 1, 0, 1.5, H);
  }

  /* the bridge never ends, in either direction, and the legs go down forever */
  function drawBridge() {
    const par = 0.94, s = scale(), deckY = H * 0.64;

    const g = ctx.createLinearGradient(0, deckY - 110, 0, deckY + 46);
    g.addColorStop(0, "rgba(245,208,107,0)");
    g.addColorStop(0.82, "rgba(245,208,107,0.085)");
    g.addColorStop(1, "rgba(245,208,107,0)");
    ctx.fillStyle = g; ctx.fillRect(0, deckY - 110, W, 156);

    const step = 420;
    const from = Math.floor((camX - CAM.viewUnits) / step) * step;
    const legW = Math.max(1.5, 6 * s * par);
    const lg = ctx.createLinearGradient(0, deckY, 0, H);
    lg.addColorStop(0, "#151c20");
    lg.addColorStop(0.55, "rgba(21,28,32,0.75)");
    lg.addColorStop(1, "rgba(21,28,32,0)");
    ctx.fillStyle = lg;
    for (let p = from; p < camX + CAM.viewUnits * 1.4; p += step) {
      const px = wx(p, par);
      if (px < -30 || px > W + 30) continue;
      ctx.fillRect(px, deckY + 14, legW, H - deckY);
    }

    ctx.fillStyle = "#232c31"; ctx.fillRect(0, deckY, W, Math.max(6, 15 * s * par));
    ctx.fillStyle = "rgba(245,208,107,0.55)"; ctx.fillRect(0, deckY - 2, W, 3);
  }

  /* ---- notes: proximity, not clamps ---- */
  const noteEls = {};
  NOTES.forEach(n => noteEls[n.id] = document.getElementById(n.id));
  const noteCat = document.getElementById("bnote-cat");
  let noteTimer = null, shownNote = null;

  function setNote(id) {
    if (shownNote === id) return;
    shownNote = id;
    clearTimeout(noteTimer);
    for (const k in noteEls) if (noteEls[k]) noteEls[k].classList.remove("show");
    if (!id || !started) return;
    noteTimer = setTimeout(() => {
      if (noteEls[id]) noteEls[id].classList.add("show");
      if (id === "bnote-land" && noteCat) noteCat.textContent = fmt(catalogued);
    }, 520);
  }

  function checkNotes() {
    if (Math.abs(vel) > 420) { setNote(null); return; }
    let best = null, bestD = Infinity;
    for (const n of NOTES) {
      const d = Math.abs(camX - n.x);
      if (d < n.r && d < bestD) { best = n; bestD = d; }
    }
    setNote(best ? best.id : null);
  }

  /* ---- HUD ---- */
  const el = {
    vel:  document.getElementById("bvel"),  velbar: document.getElementById("bvelbar"),
    dist: document.getElementById("bdist"), pct: document.getElementById("bpct"),
    cat:  document.getElementById("bcat"),
    regname: document.getElementById("bregname"), regsub: document.getElementById("bregsub"),
    you: document.getElementById("byou"), track: document.getElementById("btrack"),
  };

  if (el.track) {
    for (const n of NOTES) {
      const d = document.createElement("div");
      d.className = "mk big";
      d.style.left = ((n.x - CAM.min) / (CAM.max - CAM.min) * 100) + "%";
      el.track.appendChild(d);
    }
    for (let i = 0; i < 24; i++) {
      const d = document.createElement("div");
      d.className = "mk"; d.style.left = (i / 23 * 100) + "%";
      el.track.appendChild(d);
    }
  }

  function updateHUD(dt) {
    if (el.vel)  el.vel.textContent = fmt(Math.abs(vel));
    if (el.velbar) el.velbar.style.width = Math.min(100, Math.abs(vel) / CAM.boostSpeed * 100) + "%";
    if (el.dist) el.dist.textContent = fmt(travelled);
    if (el.pct)  el.pct.textContent = ((CAM.max - camX) / (CAM.max - CAM.min) * 100).toFixed(1);
    if (el.you)  el.you.style.left = ((camX - CAM.min) / (CAM.max - CAM.min) * 100) + "%";

    if (Math.abs(camX - LAND.mainland) < SLOT * 1.4)
      catalogued += (160 + Math.abs(vel) * 0.02) * dt;
    if (el.cat) el.cat.textContent = fmt(catalogued);

    let near = null, nd = Infinity;
    for (const n of NOTES) {
      const d = Math.abs(camX - n.x);
      if (d < n.r * 2.4 && d < nd) { near = n; nd = d; }
    }
    const name = near ? near.name : "The Bridge";
    const sub  = near ? near.sub  : "First law. It holds because it must";
    if (name !== lastRegion) {
      lastRegion = name;
      if (el.regname) el.regname.textContent = name;
      if (el.regsub)  el.regsub.textContent = sub;
    }

    host.classList.toggle("moving", Math.abs(vel) > 200);
    const sv = Math.min(1, Math.abs(steer));
    if (edgeL) edgeL.style.opacity = steer < 0 ? sv : 0;
    if (edgeR) edgeR.style.opacity = steer > 0 ? sv : 0;
  }

  /* ---- loop ---- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    requestAnimationFrame(frame);
    if (!visible) return;
    t += dt;

    if (Math.abs(steer) > 0.55) boost = Math.min(1, boost + dt * CAM.boostRamp);
    else boost = Math.max(0, boost - dt * CAM.boostDecay);
    const cap = CAM.baseSpeed + (CAM.boostSpeed - CAM.baseSpeed) * boost * boost;

    let target = steer * cap;

    // ease down near the ends, but never fully to zero — a 4% floor
    // keeps you creeping in so you always actually reach the surface
    const toMin = camX - CAM.min, toMax = CAM.max - camX;
    if (target < 0 && toMin < CAM.brakeZone) target *= Math.max(0.04, toMin / CAM.brakeZone);
    if (target > 0 && toMax < CAM.brakeZone) target *= Math.max(0.04, toMax / CAM.brakeZone);

    vel += (target - vel) * Math.min(1, dt * (steer === 0 ? CAM.drag : CAM.accel));
    if (Math.abs(vel) < 0.5) vel = 0;

    camX += vel * dt;
    travelled += Math.abs(vel) * dt;
    if (camX < CAM.min) { camX = CAM.min; vel = 0; boost = 0; }
    if (camX > CAM.max) { camX = CAM.max; vel = 0; boost = 0; }

    ctx.fillStyle = "#0d1114"; ctx.fillRect(0, 0, W, H);
    drawVoid();
    drawWatcher();
    drawBand(city.far, 0.30, "#161d21", 0.5);
    drawRex();
    drawBand(city.mid, 0.46, "#182025", 0.78);
    drawCityNear();
    drawBridge();
    drawWall();

    updateHUD(dt);
    checkNotes();
  }

  if (!reduced) requestAnimationFrame(frame);
  else {
    ctx.fillStyle = "#0d1114"; ctx.fillRect(0, 0, W, H);
    drawVoid(); drawWatcher(); drawRex(); drawBridge();
  }
})();
