/* ===========================================================
   GENESIS — how the span began.

   Autoplay cinematic. First Void visit (or Intro Cutscene)
   plays the record from the point: the span comes out of the
   left of the frame, the old ones walk the deck, Primordisentia
   is found and warped then bound, two lights tear out and fight
   in the void. Obrokxus wins. Rex becomes Rex the Surface.
   Then a full-frame fade into the live bridge. Skip / Escape
   jumps to that fade. Nothing here is click-to-continue.
   =========================================================== */

window.Genesis = (function () {
  const FORCE = /(?:[?&])genesis(?:=1)?(?:&|$)/.test(location.search);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const overlay = document.getElementById("genesis");
  const tagEl   = document.getElementById("genesis-tag");
  const lineEl  = document.getElementById("genesis-line");
  const copyEl  = overlay && overlay.querySelector(".genesis-copy");
  const ticksEl = document.getElementById("genesis-ticks");
  const skipEl  = document.getElementById("genesis-skip");
  const host    = document.getElementById("bridge-hero");

  const BEATS = [
    { id: "point", dur: 5.2, tag: "before record",
      line: "There was no place. Only a point, and the dark around it." },
    { id: "drawn", dur: 5.0, tag: "the first law",
      line: "The span came out of the dark, and it did not turn." },
    { id: "break", dur: 5.4, tag: "the old ones",
      line: "The point broke. What stepped out of it had no colour, and no name yet." },
    { id: "walk",  dur: 7.6, tag: "one side",
      line: "Some took the span west. This record follows those who went east." },
    { id: "root",  dur: 5.4, tag: "primordisentia",
      line: "At the far end they found a cry that was a body." },
    { id: "swarm", dur: 6.8, tag: "hunger",
      line: "They closed on it, and made it into what they were hungry for." },
    { id: "womb",  dur: 6.6, tag: "Crede, ergo magica est.",
      line: "They sealed the wound and named the seal a womb." },
    { id: "birth", dur: 5.8, tag: "first born",
      line: "Two lights tore out of it: Obrokxus, already wrong — and Rex, yellow as a new star." },
    { id: "fight", dur: 8.2, tag: "obrokxus · rex",
      line: "They met in the void. Rex broke." },
    { id: "land",  dur: 7.0, tag: "rex the surface",
      line: "His body cooled into ground. They called that ground Rex the Surface." },
    { id: "now",   dur: 2.6, tag: "", line: "" },
  ];

  const ROOT_U = 1.52;
  const DECK   = 0.64;
  const BAY_U  = 0.125;
  const SPAN_START_U = -0.72;
  const KINDS  = ["spindle", "cluster", "crawler", "shard", "ring", "blob", "spindle", "crawler"];
  const GREYS  = [
    [16, 18, 20],
    [44, 48, 52],
    [86, 90, 94],
    [132, 136, 140],
    [198, 200, 196],
  ];

  const YELLOW_KEYS = [
    { t: 0.00, x:  0.36, y: -0.10 },
    { t: 0.10, x:  0.36, y: -0.10 },
    { t: 0.14, x: -0.42, y: -0.34 },
    { t: 0.23, x: -0.38, y: -0.28 },
    { t: 0.27, x:  0.04, y:  0.00 },
    { t: 0.38, x:  0.44, y:  0.26 },
    { t: 0.42, x:  0.44, y:  0.26 },
    { t: 0.46, x: -0.12, y: -0.42 },
    { t: 0.52, x:  0.00, y:  0.00 },
    { t: 0.62, x: -0.46, y:  0.22 },
    { t: 0.68, x: -0.08, y: -0.06 },
    { t: 0.76, x:  0.14, y:  0.08 },
    { t: 0.84, x: -0.04, y: -0.02 },
    { t: 0.88, x:  0.06, y:  0.00 },
    { t: 1.00, x:  0.22, y: -0.14 },
  ];
  const RED_KEYS = [
    { t: 0.00, x: -0.32, y:  0.14 },
    { t: 0.14, x: -0.20, y:  0.08 },
    { t: 0.27, x: -0.02, y:  0.02 },
    { t: 0.40, x:  0.22, y: -0.16 },
    { t: 0.52, x:  0.04, y:  0.02 },
    { t: 0.64, x: -0.18, y:  0.18 },
    { t: 0.70, x:  0.08, y:  0.00 },
    { t: 0.80, x:  0.12, y:  0.06 },
    { t: 0.88, x: -0.08, y: -0.12 },
    { t: 0.94, x: -0.18, y: -0.16 },
    { t: 1.00, x: -0.14, y: -0.10 },
  ];

  const REX_BANDS = [
    { fill: ["#39485a", "#26313d"], edge: "rgba(178,204,214,0.30)",
      amp: 0.055, base: 0.30, seed: 1201, cell: 220 },
    { fill: ["#2b3742", "#1c242d"], edge: "rgba(172,198,208,0.38)",
      amp: 0.075, base: 0.18, seed: 3307, cell: 170 },
    { fill: ["#233039", "#2a2320"], edge: "rgba(186,208,214,0.55)",
      amp: 0.095, base: 0.06, seed: 5501, cell: 130 },
  ];

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
  const clamp  = (n, a, b) => Math.min(b, Math.max(a, n));
  const mix    = (a, b, u) => a + (b - a) * u;
  const approach = (cur, tgt, rate, dt) => cur + (tgt - cur) * Math.min(1, dt * rate);
  function vnoise(x, seed) {
    const i = Math.floor(x), f = x - i;
    const a = hash1((i * 73856093) ^ seed);
    const b = hash1(((i + 1) * 73856093) ^ seed);
    return a + (b - a) * (f * f * (3 - 2 * f));
  }
  function ridge(x, seed) {
    return vnoise(x, seed) * 0.55 + vnoise(x * 2.3, seed + 17) * 0.3
         + vnoise(x * 5.1, seed + 91) * 0.15;
  }

  let active = false, beat = 0, local = 0, thenMode = "void", thenCamX = null;
  let W = 0, H = 0, t = 0, shake = 0, flash = 0, clashCool = 0;
  let cam = 0, camTarget = 0;
  const trailY = [], trailR = [], rings = [];

  const motes = [], oldones = [], souls = [];
  (function seed() {
    const r = mulberry(4242);
    for (let i = 0; i < 280; i++)
      motes.push({ u: r(), y: r(), rr: 0.4 + r() * 1.4, ph: r() * 6.28, a: 0.06 + r() * 0.28 });
    for (let i = 0; i < 56; i++) {
      const ga = GREYS[Math.floor(r() * GREYS.length)];
      const gb = GREYS[Math.floor(r() * GREYS.length)];
      const gu = r();
      const sz = r();
      oldones.push({
        side: r() < 0.42 ? -1 : 1,
        ph: r() * 6.28,
        rr: 0.7 + r() * 1.5,
        hue: `${Math.round(ga[0] + (gb[0] - ga[0]) * gu)},${Math.round(ga[1] + (gb[1] - ga[1]) * gu)},${Math.round(ga[2] + (gb[2] - ga[2]) * gu)}`,
        a: 0.4 + r() * 0.5,
        gait: 0.72 + r() * 0.55,
        lane: (r() - 0.5) * 14,
        tall: sz < 0.12 ? 8 + r() * 7 : sz > 0.9 ? 44 + r() * 16 : 14 + r() * 26,
        ang: r() * 6.283,
        sp: 28 + r() * 90,
        limbs: 3 + Math.floor(r() * 4),
        holes: 1 + Math.floor(r() * 2),
        clingAng: r() * 6.283,
        spin: (r() - 0.5) * 0.55,
        kind: KINDS[Math.floor(r() * KINDS.length)],
      });
    }
    for (let i = 0; i < 90; i++)
      souls.push({ u: r(), v: r(), ph: r() * 6.28, rr: 0.5 + r() * 1.2, a: 0.2 + r() * 0.5 });
  })();

  function pending() {
    if (reduced && !FORCE) return false;
    return !(window.XP && XP.has("genesis"));
  }

  function idxOf(id) {
    for (let i = 0; i < BEATS.length; i++) if (BEATS[i].id === id) return i;
    return 0;
  }
  function since(id) {
    const i = idxOf(id);
    if (beat < i) return 0;
    if (beat > i) return 1;
    return smooth(local / Math.max(0.001, BEATS[i].dur));
  }
  function linear(id) {
    const i = idxOf(id);
    if (beat < i) return 0;
    if (beat > i) return 1;
    return clamp(local / Math.max(0.001, BEATS[i].dur), 0, 1);
  }
  function only(id) {
    const i = idxOf(id);
    if (beat !== i) return 0;
    return smooth(local / Math.max(0.001, BEATS[i].dur));
  }

  function sx(u) { return (u - cam) * W + W * 0.5; }

  function paintCopy() {
    const b = BEATS[beat];
    if (!b || !copyEl) return;
    if (overlay) overlay.dataset.beat = b.id || "";
    if (!b.line) {
      copyEl.classList.remove("on");
      copyEl.classList.add("out");
      if (tagEl) tagEl.textContent = "";
      return;
    }
    copyEl.classList.remove("on", "out");
    if (tagEl) tagEl.textContent = b.tag;
    if (lineEl) lineEl.textContent = b.line;
    requestAnimationFrame(() => copyEl.classList.add("on"));
  }

  function paintTicks() {
    if (!ticksEl) return;
    const n = BEATS.length - 1;
    if (ticksEl.childElementCount !== n) {
      ticksEl.innerHTML = "";
      for (let i = 0; i < n; i++) ticksEl.appendChild(document.createElement("i"));
    }
    const dots = ticksEl.children;
    for (let i = 0; i < dots.length; i++) {
      dots[i].classList.toggle("on", i === beat);
      dots[i].classList.toggle("done", i < beat);
    }
  }

  function go(i) {
    beat = clamp(i, 0, BEATS.length - 1);
    local = 0;
    paintCopy();
    paintTicks();
  }

  function remember() {
    if (window.XP && XP.flag) XP.flag("genesis");
  }

  function veilCanvas() {
    const cv = document.getElementById("bridge-canvas");
    if (!cv) return;
    const c = cv.getContext("2d");
    if (!c) return;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = "#0d1114";
    c.fillRect(0, 0, cv.width, cv.height);
    c.restore();
  }

  function resetFX() {
    trailY.length = 0;
    trailR.length = 0;
    rings.length = 0;
    flash = 0;
    clashCool = 0;
  }

  function finish() {
    if (!active) return;
    active = false;
    remember();
    if (overlay) {
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");
    }
    if (tagEl) tagEl.textContent = "";
    if (lineEl) lineEl.textContent = "";
    document.documentElement.classList.remove("genesis-on");
    if (host) host.classList.remove("genesis");
    document.dispatchEvent(new CustomEvent("site:genesis-done", {
      detail: { mode: thenMode, camX: thenCamX },
    }));
  }

  function play(opts) {
    if (active) return;
    if (reduced && !FORCE) return;
    thenMode = (opts && opts.thenMode) || "void";
    thenCamX = opts && opts.thenCamX;
    if (thenCamX == null && window.World && thenMode === "void")
      thenCamX = World.LAND.bridge;
    active = true;
    beat = 0;
    local = 0;
    shake = 0;
    t = 0;
    cam = 0;
    camTarget = 0;
    resetFX();
    veilCanvas();
    if (overlay) {
      overlay.hidden = false;
      overlay.setAttribute("aria-hidden", "false");
    }
    document.documentElement.classList.add("genesis-on");
    if (host) host.classList.add("genesis");
    try { scrollTo(0, 0); } catch (e) {}
    paintCopy();
    paintTicks();
    document.dispatchEvent(new CustomEvent("site:genesis-start"));
  }

  function skip() {
    if (!active) return;
    const last = idxOf("now");
    if (beat >= last && local > 0.12) { finish(); return; }
    go(last);
  }

  function step(dt) {
    if (!active) return false;
    t += dt;
    local += dt;
    shake = Math.max(0, shake - dt * 3.6);
    flash = Math.max(0, flash - dt * 3.2);
    clashCool = Math.max(0, clashCool - dt);
    for (let i = rings.length - 1; i >= 0; i--) {
      rings[i].r += dt * 220;
      rings[i].a -= dt * 1.35;
      if (rings[i].a <= 0) rings.splice(i, 1);
    }
    try { if (scrollY !== 0) scrollTo(0, 0); } catch (e) {}

    const uWalk  = since("walk");
    const uRoot  = since("root");
    const uSwarm = since("swarm");
    const uWomb  = since("womb");
    const uBirth = since("birth");
    const uFight = since("fight");
    const uLand  = since("land");
    if (uWalk < 0.001) camTarget = 0;
    else if (uLand > 0.08)
      camTarget = mix(ROOT_U - 0.48, ROOT_U - 0.62, clamp((uLand - 0.08) / 0.7, 0, 1));
    else if (uFight > 0.02)
      camTarget = mix(ROOT_U - 0.22, ROOT_U - 0.50, clamp(uFight * 1.15, 0, 1));
    else if (uBirth > 0.02)
      camTarget = mix(ROOT_U - 0.16, ROOT_U - 0.22, uBirth);
    else if (uWomb > 0.02)
      camTarget = mix(ROOT_U - 0.18, ROOT_U - 0.16, uWomb);
    else if (uSwarm > 0.02)
      camTarget = mix(ROOT_U - 0.26, ROOT_U - 0.16, uSwarm);
    else if (uRoot > 0.02)
      camTarget = mix(ROOT_U - 0.32, ROOT_U - 0.26, uRoot);
    else
      camTarget = mix(0, ROOT_U - 0.32, clamp(uWalk, 0, 1));
    cam = approach(cam, camTarget, 1.55, dt);

    const b = BEATS[beat];
    if (b && local >= b.dur) {
      if (beat >= BEATS.length - 1) { finish(); return false; }
      go(beat + 1);
    }
    return true;
  }

  /* ---- drawing ------------------------------------------- */

  function fillBg(ctx) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#0d1114";
    ctx.fillRect(0, 0, W, H);
  }

  function drawMotes(ctx, amt, streak) {
    if (amt < 0.02) return;
    const span = W * 2.2;
    const off = t * 12 + cam * W * 0.35;
    ctx.fillStyle = "#c6ccc6";
    ctx.strokeStyle = "#c6ccc6";
    for (const m of motes) {
      const x = ((m.u * span - off * (0.3 + m.rr * 0.2)) % span + span) % span - span * 0.15;
      if (x < -40 || x > W + 40) continue;
      const y = m.y * H + Math.sin(t * 0.5 + m.ph) * 14;
      ctx.globalAlpha = m.a * amt * (0.55 + 0.45 * Math.sin(t * 1.6 + m.ph));
      if (streak > 3) {
        ctx.lineWidth = m.rr;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.lineTo(x - streak * (0.4 + m.rr * 0.35), y); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(x, y, m.rr, 0, 6.283); ctx.fill();
      }
    }
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }

  function drawChaos(ctx, amt) {
    if (amt < 0.02) return;
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const baseY = H * (0.10 + i * 0.155);
      const amp = (40 + i * 22) * amt;
      ctx.beginPath();
      for (let px = -60; px <= W + 60; px += 24) {
        const u = px * 0.0018 + cam * 2.4;
        const y = baseY
          + Math.sin(u + t * 0.18 + i * 1.3) * amp
          + Math.sin(u * 2.9 - t * 0.11 + i) * amp * 0.45;
        px === -60 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
      }
      const a = amt * (0.05 + 0.05 * Math.sin(t * 0.23 + i));
      ctx.strokeStyle = i % 2 ? `rgba(96,66,74,${a})` : `rgba(58,84,92,${a})`;
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  }

  function drawPoint(ctx, amt, crack) {
    if (amt < 0.01 && crack < 0.02) return;
    const cx = sx(0), cy = H * 0.46;
    const pulse = 0.85 + 0.15 * Math.sin(t * 1.7);
    const glow = (10 + amt * 36) * pulse;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glow);
    g.addColorStop(0, `rgba(245,208,107,${0.55 + 0.25 * amt})`);
    g.addColorStop(0.35, `rgba(176,104,90,${0.18 * amt})`);
    g.addColorStop(1, "rgba(245,208,107,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - glow, cy - glow, glow * 2, glow * 2);

    const n = 7;
    for (let i = 0; i < n; i++) {
      const ang = t * 0.4 + i * (6.283 / n);
      const j = 1.2 + Math.sin(t * 2.1 + i) * 0.8;
      ctx.fillStyle = i % 2
        ? `rgba(176,104,90,${0.35 * amt})`
        : `rgba(143,176,184,${0.3 * amt})`;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * j, cy + Math.sin(ang) * j, 1.4, 0, 6.283);
      ctx.fill();
    }
    ctx.fillStyle = `rgba(245,208,107,${0.95 * amt})`;
    ctx.beginPath(); ctx.arc(cx, cy, 1.8 + amt * 0.8, 0, 6.283); ctx.fill();

    if (crack > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(245,208,107,${0.78 * crack})`;
      ctx.lineWidth = 1.15;
      ctx.lineCap = "round";
      for (let i = 0; i < n; i++) {
        const ang = i * (6.283 / n) + t * 0.05;
        const len = (16 + (i % 3) * 16) * crack;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawBridgeLine(ctx, grow) {
    if (grow < 0.02) return;
    const deckY = H * DECK;
    const startU = SPAN_START_U;
    const endU = mix(-0.48, ROOT_U + 0.22, grow);
    const x0 = sx(startU);
    const x1 = sx(endU);
    if (x1 < -40 || x0 > W + 40) return;

    const bayPx = Math.max(24, BAY_U * W);
    const legW  = Math.min(3, Math.max(1.2, bayPx * 0.007));
    const deckH = Math.min(6, Math.max(2.5, bayPx * 0.013));
    const rise  = bayPx * 0.20;
    const legBot = H * 1.22;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x0 - 2, 0, Math.max(2, x1 - x0) + 4, H);
    ctx.clip();

    const gl = ctx.createLinearGradient(0, deckY - 90, 0, deckY + 40);
    gl.addColorStop(0, "rgba(245,208,107,0)");
    gl.addColorStop(0.78, `rgba(245,208,107,${0.055 * grow})`);
    gl.addColorStop(1, "rgba(245,208,107,0)");
    ctx.fillStyle = gl;
    ctx.fillRect(x0 - 20, deckY - 90, (x1 - x0) + 40, 130);

    const first = Math.floor(startU / BAY_U) - 1;
    const last  = Math.ceil(endU / BAY_U) + 1;

    const lg = ctx.createLinearGradient(0, deckY, 0, legBot);
    lg.addColorStop(0, `rgba(150,168,178,${0.62 * grow})`);
    lg.addColorStop(0.28, `rgba(112,130,140,${0.30 * grow})`);
    lg.addColorStop(0.72, `rgba(86,102,112,${0.08 * grow})`);
    lg.addColorStop(1, "rgba(70,84,92,0)");
    ctx.fillStyle = lg;
    for (let b = first; b <= last; b++) {
      const x = sx(b * BAY_U);
      if (x < x0 - 8 || x > x1 + 8) continue;
      ctx.fillRect(x - legW / 2, deckY + deckH, legW, legBot - deckY - deckH);
    }
    ctx.strokeStyle = `rgba(132,150,159,${0.26 * grow})`;
    ctx.lineWidth = Math.max(0.8, legW * 0.55);
    for (let b = first; b <= last; b++) {
      const xa = sx(b * BAY_U);
      if (xa < x0 - bayPx || xa > x1 + 8) continue;
      ctx.beginPath();
      ctx.ellipse(xa + bayPx / 2, deckY + deckH + rise, bayPx / 2 - legW, rise, 0, Math.PI, 0);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    for (let b = first; b <= last; b++) {
      const x = sx(b * BAY_U);
      if (x < x0 - 8 || x > x1 + 8) continue;
      const r = hash1(b * 911 + 7);
      ctx.fillStyle = `rgba(120,138,147,${0.4 * grow})`;
      ctx.fillRect(x - legW * 0.4, deckY - deckH * 1.9, legW * 0.8, deckH * 1.9);
      if (r < 0.13) {
        const mh = deckH * (4.5 + r * 22);
        ctx.fillStyle = `rgba(120,138,147,${0.34 * grow})`;
        ctx.fillRect(x - legW * 0.3, deckY - mh, legW * 0.6, mh);
        ctx.fillStyle = `rgba(245,208,107,${0.75 * grow})`;
        ctx.fillRect(x - legW * 0.55, deckY - mh - legW * 0.7, legW * 1.1, legW * 1.1);
      }
    }
    ctx.fillStyle = `rgba(36,45,51,${0.92 * grow})`;
    ctx.fillRect(x0, deckY, x1 - x0, deckH);
    ctx.fillStyle = `rgba(245,208,107,${0.62 * grow})`;
    for (let b = first; b <= last; b++) {
      const x = sx(b * BAY_U);
      if (x < x0 - 4 || x > x1 + 4) continue;
      const xEnd = Math.min(x + bayPx + 1, x1);
      if (xEnd <= x) continue;
      ctx.fillRect(x, deckY - 1.6, xEnd - x, 2.4);
    }
    ctx.restore();
  }

  function fleshGeom(womb) {
    const vis = clamp(since("root") + 0.35, 0.35, 1);
    const cx = sx(ROOT_U), cy = H * 0.5;
    const rx = Math.min(W, H) * (0.26 + 0.14 * vis) * mix(1, 0.86, womb);
    const ry = Math.min(W, H) * (0.34 + 0.16 * vis) * mix(1, 0.94, womb);
    return { cx, cy, rx, ry };
  }

  function walkerPos(o, burst, walk, cling, still, watch, flesh) {
    const cy = H * 0.46;
    const deckY = H * DECK;
    const r = (0.06 + o.sp / 360) * burst;
    const xBurst = Math.cos(o.ang) * r * 0.45;
    const yBurst = mix(cy, deckY - 8 + o.lane, 0.62) + Math.sin(o.ang) * r * H * 0.16;
    const settle = smooth(clamp((burst - 0.08) / 0.32, 0, 1));
    const splitU = o.side * (0.05 + o.gait * 0.14) * settle;
    const along = o.side < 0
      ? splitU - o.gait * walk * 0.7
      : mix(splitU, ROOT_U - 0.06 + o.lane * 0.002, clamp(walk * (0.55 + o.gait * 0.5), 0, 1));
    const yDeck = deckY - 8 + o.lane + Math.sin(t * (2.1 + o.gait) + o.ph) * 2.4 * settle;
    const deckX = sx(mix(xBurst, along, settle));
    const deckYPos = mix(yBurst, yDeck, settle);

    let x = deckX, y = deckYPos;
    if (o.side > 0 && flesh && cling > 0.02) {
      const ang = o.clingAng + t * o.spin * (1 - still * 0.85);
      const bite = mix(1.08, 0.86, cling * (1 - still));
      const back = mix(1, 1.16, still);
      const watchR = mix(1, 1.22, watch);
      const rr = bite * back * watchR;
      const fx = flesh.cx + Math.cos(ang) * flesh.rx * rr;
      const fy = flesh.cy + Math.sin(ang) * flesh.ry * rr;
      const u = smooth(clamp((cling - 0.05) / 0.55, 0, 1));
      x = mix(deckX, fx, u);
      y = mix(deckYPos, fy, u);
    }

    let a = o.a * clamp(burst * 2.2, 0, 1);
    if (x < 12) a *= clamp(x / 12, 0, 1);
    a *= 1 - since("land") * 0.92;
    if (watch > 0.4) a *= mix(1, 0.55, watch);
    return { x, y, a, onDeck: settle > 0.55 && cling < 0.25 };
  }

  function drawAlien(ctx, o, x, y, a) {
    if (a < 0.03) return;
    const s = o.tall * 0.42;
    const wob = t * (0.7 + o.gait * 0.35) + o.ph;
    ctx.save();
    ctx.globalAlpha = a;

    const g = ctx.createRadialGradient(x, y, 0, x, y, s * 2.2);
    g.addColorStop(0, `rgba(${o.hue},0.22)`);
    g.addColorStop(1, `rgba(${o.hue},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, s * 2.2, 0, 6.283); ctx.fill();

    ctx.fillStyle = `rgba(${o.hue},0.92)`;
    ctx.strokeStyle = `rgba(${o.hue},0.72)`;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const kind = o.kind || "blob";
    if (kind === "spindle") {
      ctx.beginPath();
      ctx.ellipse(x, y, s * 0.28, s * 1.15, Math.sin(wob) * 0.12, 0, 6.283);
      ctx.fill();
      ctx.lineWidth = 1.05;
      const arms = 2 + (o.limbs % 3);
      for (let k = 0; k < arms; k++) {
        const ang = -0.55 + k * (1.1 / Math.max(1, arms - 1)) + Math.sin(wob + k) * 0.2;
        const len = s * (0.7 + 0.25 * Math.sin(wob * 1.2 + k));
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + Math.sin(ang) * len * 0.4, y + len * 0.35, x + Math.sin(ang) * len, y + len * 0.85);
        ctx.stroke();
      }
    } else if (kind === "cluster") {
      const n = 3 + o.holes + (o.limbs % 3);
      for (let i = 0; i < n; i++) {
        const ang = o.ang + i * (6.283 / n) + Math.sin(wob + i) * 0.18;
        const rad = s * (0.22 + (i % 3) * 0.12);
        const cx = x + Math.cos(ang) * s * 0.42;
        const cy = y + Math.sin(ang) * s * 0.34;
        ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 6.283); ctx.fill();
      }
    } else if (kind === "crawler") {
      ctx.beginPath();
      ctx.ellipse(x, y - s * 0.12, s * 0.72, s * 0.38, Math.sin(wob) * 0.08, 0, 6.283);
      ctx.fill();
      ctx.lineWidth = 1.2;
      const legs = 5 + (o.limbs % 4);
      for (let k = 0; k < legs; k++) {
        const side = k < legs / 2 ? -1 : 1;
        const u = (k % Math.ceil(legs / 2)) / Math.max(1, Math.ceil(legs / 2) - 1);
        const bx = x + side * mix(s * 0.15, s * 0.55, u);
        const gait = Math.sin(wob * 1.6 + k * 0.9) * s * 0.18;
        ctx.beginPath();
        ctx.moveTo(bx, y);
        ctx.lineTo(bx + side * s * 0.22 + gait, y + s * 0.55);
        ctx.lineTo(bx + side * s * 0.08 + gait * 0.4, y + s * 0.95);
        ctx.stroke();
      }
    } else if (kind === "shard") {
      ctx.beginPath();
      const n = 5 + (o.limbs % 3);
      for (let i = 0; i <= n; i++) {
        const ang = o.ang + (i / n) * 6.283;
        const rad = s * (i % 2 ? 0.95 : 0.38) * (1 + 0.08 * Math.sin(wob + i));
        const px = x + Math.cos(ang) * rad;
        const py = y + Math.sin(ang) * rad * 0.9;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else if (kind === "ring") {
      ctx.lineWidth = Math.max(1.4, s * 0.16);
      ctx.beginPath();
      ctx.ellipse(x, y, s * 0.78, s * 0.52, o.ang * 0.2 + Math.sin(wob) * 0.15, 0, 6.283);
      ctx.stroke();
      ctx.lineWidth = Math.max(0.8, s * 0.08);
      ctx.beginPath();
      ctx.ellipse(x, y, s * 0.42, s * 0.28, -o.ang * 0.15, 0, 6.283);
      ctx.stroke();
      ctx.fillStyle = `rgba(${o.hue},0.85)`;
      ctx.beginPath(); ctx.arc(x + Math.cos(wob) * s * 0.38, y + Math.sin(wob) * s * 0.22, 1.6, 0, 6.283); ctx.fill();
    } else {
      ctx.beginPath();
      const n = 9 + o.limbs;
      for (let i = 0; i <= n; i++) {
        const ang = (i / n) * 6.283 + o.ang * 0.35;
        const rad = s * (0.52
          + 0.28 * Math.sin(ang * 3 + wob)
          + 0.18 * Math.sin(ang * 5 - wob * 1.2)
          + ((i * 13 + Math.floor(o.sp)) % 4 === 0 ? 0.28 * Math.sin(wob * 1.4) : 0));
        const px = x + Math.cos(ang) * rad;
        const py = y + Math.sin(ang) * rad * 0.82;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(13,17,20,0.82)";
      for (let h = 0; h < o.holes; h++) {
        const ha = o.ph + h * 2.15 + Math.sin(wob + h) * 0.45;
        ctx.beginPath();
        ctx.arc(
          x + Math.cos(ha) * s * 0.22,
          y + Math.sin(ha) * s * 0.18,
          s * (0.11 + h * 0.05),
          0, 6.283
        );
        ctx.fill();
      }

      ctx.strokeStyle = `rgba(${o.hue},0.72)`;
      ctx.lineWidth = 1.15;
      for (let k = 0; k < o.limbs; k++) {
        const ang = o.ang + k * (6.283 / o.limbs) + Math.sin(wob + k) * 0.55;
        const len = s * (0.85 + 0.55 * Math.sin(wob * 1.35 + k));
        const mx = x + Math.cos(ang) * len * 0.5;
        const my = y + Math.sin(ang) * len * 0.5;
        const twist = 0.45 * Math.sin(wob + k * 1.7);
        const ex = x + Math.cos(ang + twist) * len;
        const ey = y + Math.sin(ang + twist) * len;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(mx, my, ex, ey);
        ctx.stroke();
        ctx.fillStyle = `rgba(${o.hue},0.85)`;
        ctx.beginPath(); ctx.arc(ex, ey, 1.35, 0, 6.283); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawOldOnes(ctx, burst, walk, cling, still, watch, flesh) {
    if (burst < 0.02 && walk < 0.02) return;
    for (const o of oldones) {
      const p = walkerPos(o, burst, walk, cling, still, watch, flesh);
      if (p.a < 0.03) continue;
      if (p.x < -40 || p.x > W + 40) continue;
      drawAlien(ctx, o, p.x, p.y, p.a);
    }
  }

  function drawStains(ctx, flesh, amt) {
    if (!flesh || amt < 0.04) return;
    for (const o of oldones) {
      if (o.side < 0) continue;
      const ang = o.clingAng + t * o.spin * 0.4;
      const x = flesh.cx + Math.cos(ang) * flesh.rx * 0.72;
      const y = flesh.cy + Math.sin(ang) * flesh.ry * 0.72;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 18 + o.rr * 8);
      g.addColorStop(0, `rgba(${o.hue},${0.28 * amt})`);
      g.addColorStop(1, `rgba(${o.hue},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, 22 + o.rr * 6, 0, 6.283); ctx.fill();
    }
  }

  function fleshPath(ctx, cx, cy, rx, ry, pain, seed) {
    ctx.beginPath();
    const n = 80;
    for (let i = 0; i <= n; i++) {
      const u = i / n, ang = u * 6.283;
      const wob = 1
        + Math.sin(ang * 3 + t * 0.5 + seed) * 0.08 * pain
        + Math.sin(ang * 7 - t * 0.35) * 0.05 * pain
        + Math.sin(ang * 2 + t * 0.22) * 0.05
        + Math.sin(ang * 11 + t * 1.1) * 0.03 * pain;
      const x = cx + Math.cos(ang) * rx * wob;
      const y = cy + Math.sin(ang) * ry * wob;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  function drawFlesh(ctx, vis, pain, womb) {
    if (vis < 0.02) return null;
    const { cx, cy, rx, ry } = fleshGeom(womb);
    const breath = 0.5 + 0.5 * Math.sin(t * 0.34);

    const halo = ctx.createRadialGradient(cx, cy, rx * 0.2, cx, cy, rx * 2.1);
    halo.addColorStop(0, `rgba(150,30,32,${(0.16 + 0.1 * breath) * vis * (0.45 + pain * 0.4)})`);
    halo.addColorStop(1, "rgba(150,30,32,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(cx - rx * 2.2, cy - ry * 2.2, rx * 4.4, ry * 4.4);

    if (womb > 0.08) {
      const life = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx * 1.15);
      life.addColorStop(0, `rgba(245,208,107,${0.22 * womb * vis})`);
      life.addColorStop(0.45, `rgba(176,104,90,${0.12 * womb * vis})`);
      life.addColorStop(1, "rgba(245,208,107,0)");
      ctx.fillStyle = life;
      ctx.beginPath(); ctx.arc(cx, cy, rx * 1.15, 0, 6.283); ctx.fill();
    }

    fleshPath(ctx, cx, cy, rx, ry, pain, 1);
    const body = ctx.createLinearGradient(cx - rx, cy, cx + rx, cy);
    body.addColorStop(0, "#3a0b0f");
    body.addColorStop(0.5, womb > 0.4 ? "#6a2418" : "#5c1114");
    body.addColorStop(1, "#1d060a");
    ctx.fillStyle = body;
    ctx.globalAlpha = vis;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = `rgba(214,72,68,${(0.34 + 0.2 * breath) * vis * mix(1, 0.45, womb)})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 1;
    return { cx, cy, rx, ry };
  }

  function drawSouls(ctx, flesh, amt) {
    if (!flesh || amt < 0.02) return;
    const { cx, cy, rx, ry } = flesh;
    for (const s of souls) {
      const x = cx + (s.u - 0.5) * rx * 1.05;
      const y = cy + (s.v - 0.5) * ry * 1.05 + Math.sin(t * 0.8 + s.ph) * 4;
      ctx.fillStyle = `rgba(245,208,107,${s.a * amt})`;
      ctx.beginPath(); ctx.arc(x, y, s.rr * mix(1, 1.35, since("womb")), 0, 6.283); ctx.fill();
    }
  }

  function drawRip(ctx, flesh, amt) {
    if (!flesh || amt < 0.02) return;
    const { cx, cy, rx, ry } = flesh;
    const x0 = cx - rx * 0.92;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(255,230,190,${0.85 * amt})`;
    ctx.lineWidth = 1.4 + amt * 2.2;
    ctx.beginPath();
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const x = x0 + Math.sin(u * 18 + t * 9) * (2 + amt * 5) + u * rx * 0.08;
      const y = cy - ry * 0.72 + u * ry * 1.44;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function keyAt(keys, u) {
    if (u <= keys[0].t) return { x: keys[0].x, y: keys[0].y };
    for (let i = 1; i < keys.length; i++) {
      if (u <= keys[i].t) {
        const a = keys[i - 1], b = keys[i];
        const span = Math.max(0.0001, b.t - a.t);
        const k = (u - a.t) / span;
        const s = span < 0.055 ? Math.pow(k, 0.38) : smooth(k);
        return { x: mix(a.x, b.x, s), y: mix(a.y, b.y, s) };
      }
    }
    const last = keys[keys.length - 1];
    return { x: last.x, y: last.y };
  }

  function lightsAt(uBirth, uFight, uLand, flesh) {
    const exitX = flesh ? flesh.cx - flesh.rx * 0.92 : sx(ROOT_U) - Math.min(W, H) * 0.28;
    const exitY = flesh ? flesh.cy + flesh.ry * 0.04 : H * 0.5;
    const west = flesh ? flesh.cx - flesh.rx - 22 : exitX;
    const arenaX = west - Math.min(W, H) * 0.16;
    const arenaY = H * 0.40;
    const span = Math.min(W, H);
    const emerge = clamp(uBirth * 1.35, 0, 1);
    const yK = keyAt(YELLOW_KEYS, uFight);
    const rK = keyAt(RED_KEYS, uFight);
    let yx = mix(exitX, arenaX + yK.x * span * 0.28, emerge);
    let yy = mix(exitY, arenaY + yK.y * span * 0.30, emerge);
    let rx = mix(exitX, arenaX + rK.x * span * 0.28, emerge);
    let ry = mix(exitY, arenaY + rK.y * span * 0.30, emerge);
    yx = Math.min(yx, west);
    rx = Math.min(rx, west);

    const die = smooth(clamp((uFight - 0.82) / 0.18 + uLand * 1.2, 0, 1));
    const groundY = H * DECK + 10;
    yy = mix(yy, groundY, die);
    yx = mix(yx, arenaX - span * 0.02, die);

    const recede = smooth(clamp((uLand - 0.02) / 0.45, 0, 1));
    rx = mix(rx, arenaX - span * 0.22, recede);
    ry = mix(ry, arenaY - span * 0.18, recede);

    return {
      yx, yy, rx, ry,
      yAmt: emerge * (1 - die),
      rAmt: emerge * (1 - recede * 0.92),
      originX: yx,
      originY: yy,
      die, recede,
    };
  }

  function pushTrail(list, x, y) {
    list.push({ x, y });
    if (list.length > 16) list.shift();
  }

  function drawTrail(ctx, list, rgb, amt, dark) {
    if (amt < 0.02 || list.length < 2) return;
    ctx.save();
    if (!dark) ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (let i = 1; i < list.length; i++) {
      const u = i / list.length;
      ctx.strokeStyle = `rgba(${rgb},${(dark ? 0.42 : 0.55) * u * amt})`;
      ctx.lineWidth = mix(1.2, dark ? 5.5 : 7, u);
      ctx.beginPath();
      ctx.moveTo(list[i - 1].x, list[i - 1].y);
      ctx.lineTo(list[i].x, list[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawOrb(ctx, x, y, amt, kind) {
    if (amt < 0.02) return;
    const big = kind === "obrokxus";
    const R = Math.min(W, H) * (big ? 0.085 : 0.048) * (0.7 + amt * 0.5);
    ctx.save();
    if (kind === "rex") {
      ctx.globalCompositeOperation = "lighter";
      const halo = ctx.createRadialGradient(x, y, 0, x, y, R * 3.4);
      halo.addColorStop(0, `rgba(255,244,210,${0.95 * amt})`);
      halo.addColorStop(0.18, `rgba(245,208,107,${0.8 * amt})`);
      halo.addColorStop(0.5, `rgba(176,104,90,${0.22 * amt})`);
      halo.addColorStop(1, "rgba(245,208,107,0)");
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(x, y, R * 3.4, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(255,248,230,${0.95 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.28, 0, 6.283); ctx.fill();
    } else {
      const smokeR = R * 5.6;
      const smoke = ctx.createRadialGradient(x, y, 0, x, y, smokeR);
      smoke.addColorStop(0, `rgba(70,6,10,${0.92 * amt})`);
      smoke.addColorStop(0.18, `rgba(120,12,18,${0.55 * amt})`);
      smoke.addColorStop(0.45, `rgba(40,4,8,${0.28 * amt})`);
      smoke.addColorStop(1, "rgba(8,0,2,0)");
      ctx.fillStyle = smoke;
      ctx.beginPath(); ctx.arc(x, y, smokeR, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(22,3,5,${0.96 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.72, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(150,18,24,${0.55 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.22, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(8,1,2,${0.9 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.08, 0, 6.283); ctx.fill();
    }
    ctx.restore();
  }

  function drawRings(ctx) {
    if (!rings.length) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const r of rings) {
      ctx.strokeStyle = `rgba(255,180,140,${0.7 * r.a})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.283); ctx.stroke();
    }
    ctx.restore();
  }

  function drawBeam(ctx, ax, ay, bx, by, amt) {
    if (amt < 0.08) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(255,230,170,${0.55 * amt})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = `rgba(140,20,28,${0.28 * amt})`;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.restore();
  }

  function drawRexLand(ctx, rise, originX, originY) {
    if (rise < 0.02) return;
    const bottom = H + 40;
    for (let bi = 0; bi < REX_BANDS.length; bi++) {
      const b = REX_BANDS[bi];
      const pts = [];
      for (let px = -30; px <= W + 30; px += 8) {
        const dx = (px - originX) / (W * mix(0.18, 0.72, rise));
        const mound = Math.exp(-dx * dx * 2.4);
        const n = ridge(px / b.cell, b.seed);
        const h = (b.base + n * b.amp * 2.8 + 0.12 * bi) * (0.25 + mound * 0.9);
        const y = mix(originY, H * 1.05 - h * H, rise);
        pts.push([px, y]);
      }
      const path = new Path2D();
      path.moveTo(pts[0][0], bottom);
      for (const p of pts) path.lineTo(p[0], p[1]);
      path.lineTo(pts[pts.length - 1][0], bottom);
      path.closePath();
      const g = ctx.createLinearGradient(0, H * 0.08, 0, bottom);
      g.addColorStop(0, b.fill[0]);
      g.addColorStop(1, b.fill[1]);
      ctx.globalAlpha = rise;
      ctx.fillStyle = g;
      ctx.fill(path);
      ctx.strokeStyle = b.edge;
      ctx.lineWidth = bi === 2 ? 1.5 : 1.15;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++)
        i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (rise > 0.12 && rise < 0.92) {
      const glint = (1 - Math.abs(rise - 0.42) / 0.42) * (1 - rise * 0.35);
      if (glint > 0.02) {
        const g = ctx.createRadialGradient(originX, originY, 0, originX, originY, 80 + rise * 120);
        g.addColorStop(0, `rgba(245,208,107,${0.38 * glint})`);
        g.addColorStop(0.4, `rgba(245,208,107,${0.08 * glint})`);
        g.addColorStop(1, "rgba(245,208,107,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(originX, originY, 80 + rise * 120, 0, 6.283); ctx.fill();
      }
    }
  }

  function drawLiveWorld(ctx, amt) {
    if (amt < 0.01 || !window.World) return;
    const camX = thenCamX != null ? thenCamX : World.LAND.bridge;
    const mode = thenMode === "gamedev" ? "gamedev" : "void";
    ctx.save();
    ctx.globalAlpha = clamp(amt, 0, 1);
    World.draw(ctx, {
      W, H, camX, t, vel: 0,
      maxFling: 38000,
      chaos: mode === "void" ? World.chaosAt(camX) : 0,
      future: mode === "void" ? World.futureAt(camX) : 0,
      mode,
    });
    ctx.restore();
  }

  function draw(ctx, env) {
    if (!active) return;
    W = env.W; H = env.H;
    if (env.t != null) t = env.t;

    const sxh = (Math.random() - 0.5) * shake * 12;
    const syh = (Math.random() - 0.5) * shake * 9;
    ctx.save();
    ctx.translate(sxh, syh);

    const uDrawn = since("drawn");
    const uBreak = since("break");
    const uWalk  = since("walk");
    const uRoot  = since("root");
    const uSwarm = since("swarm");
    const uWomb  = since("womb");
    const uBirth = since("birth");
    const uFight = linear("fight");
    const uLand  = since("land");
    const uNow   = only("now");

    fillBg(ctx);
    const streak = uWalk * (1 - uRoot) * 22;
    drawMotes(ctx, clamp(uBreak * 0.55 + uWalk * 0.45 + uLand * 0.15, 0, 1), streak);
    drawChaos(ctx, clamp((uBreak * 0.4 + uWalk * 0.55) * (1 - uLand * 0.7), 0, 1));

    const burst = smooth(clamp(uBreak * 1.35, 0, 1));
    const leave = smooth(clamp((burst - 0.52) / 0.38, 0, 1));
    const crack = leave * (1 - clamp(linear("walk") * 8, 0, 1));
    const pointVis = (beat > idxOf("point") ? 1 : mix(0.75, 1, linear("point"))) * (1 - leave);
    drawPoint(ctx, pointVis, crack);
    drawBridgeLine(ctx, uDrawn);

    const pain = 0.4 + uRoot * 0.2 + uSwarm * 1.15 * (1 - uWomb) + uWomb * 0.12;
    const approaching = clamp((cam - (ROOT_U - 0.95)) / 0.55, 0, 1);
    const fleshVis = approaching * (1 - uLand * 0.92);
    const flesh = drawFlesh(ctx, fleshVis, pain, uWomb);
    drawStains(ctx, flesh, uSwarm * (1 - uWomb) * fleshVis);
    const soulAmt = clamp((uRoot - 0.2) / 0.5, 0, 1) * mix(0.45, 1, uWomb) * (1 - uBirth * 0.55);
    drawSouls(ctx, flesh, soulAmt);

    const cling = clamp(uRoot * 0.25 + uSwarm * 0.9, 0, 1);
    const still = uWomb;
    const watch = clamp(uBirth * 0.4 + uFight, 0, 1);
    drawOldOnes(ctx, burst, uWalk, cling, still, watch, flesh);
    drawRip(ctx, flesh, clamp(uBirth * 2.6, 0, 1) * (1 - clamp((uBirth - 0.42) / 0.45, 0, 1)) * (1 - uFight));

    const L = lightsAt(uBirth, uFight, uLand, flesh);
    if (uBirth > 0.04 && uLand < 0.98) {
      pushTrail(trailY, L.yx, L.yy);
      pushTrail(trailR, L.rx, L.ry);
      drawTrail(ctx, trailY, "245,208,107", L.yAmt);
      drawTrail(ctx, trailR, "90,12,18", L.rAmt, true);

      const dx = L.yx - L.rx, dy = L.yy - L.ry;
      const dist = Math.hypot(dx, dy);
      if (uFight > 0.05 && uLand < 0.15 && dist < 38 && clashCool <= 0) {
        flash = 1;
        shake = Math.max(shake, 0.95);
        clashCool = 0.26;
        rings.push({ x: (L.yx + L.rx) * 0.5, y: (L.yy + L.ry) * 0.5, r: 10, a: 1 });
      }
      const beamU = (uFight > 0.66 && uFight < 0.78) ? 1 - Math.abs(uFight - 0.72) / 0.12 : 0;
      drawBeam(ctx, L.yx, L.yy, L.rx, L.ry, beamU * Math.max(L.yAmt, L.rAmt));
      drawOrb(ctx, L.rx, L.ry, L.rAmt, "obrokxus");
      drawOrb(ctx, L.yx, L.yy, L.yAmt, "rex");
      drawRings(ctx);
    }

    if (uFight > 0.08 && uLand < 0.2) shake = Math.max(shake, 0.22 + uFight * 0.2);
    if (uFight > 0.82 && uLand < 0.2) shake = Math.max(shake, 0.55 + (1 - L.yAmt) * 0.45);
    if (uBirth > 0.35 && uBirth < 0.95) shake = Math.max(shake, 0.32);
    if (uSwarm > 0.1 && uWomb < 0.2) shake = Math.max(shake, 0.18);

    const landRise = clamp(uLand / 0.65, 0, 1);
    drawRexLand(ctx, landRise, L.originX, L.originY);

    if (L.die > 0.02 && L.die < 0.55) {
      const p = 1 - Math.abs(L.die - 0.22) / 0.22;
      if (p > 0) {
        ctx.fillStyle = `rgba(40,4,8,${0.22 * p})`;
        ctx.fillRect(-20, -20, W + 40, H + 40);
      }
    }
    if (flash > 0.02) {
      ctx.fillStyle = `rgba(255,244,220,${0.18 * flash})`;
      ctx.fillRect(-20, -20, W + 40, H + 40);
    }

    ctx.restore();

    if (uNow > 0.001) {
      const fade = smooth(uNow);
      if (fade < 0.5) {
        ctx.fillStyle = `rgba(13,17,20,${fade / 0.5})`;
        ctx.fillRect(0, 0, W, H);
      } else {
        drawLiveWorld(ctx, 1);
        ctx.fillStyle = `rgba(13,17,20,${1 - (fade - 0.5) / 0.5})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
  }

  /* ---- input --------------------------------------------- */
  function holdPage(e) {
    if (!active) return;
    e.preventDefault();
  }
  addEventListener("wheel", holdPage, { passive: false });
  addEventListener("touchmove", holdPage, { passive: false });

  if (overlay) {
    overlay.addEventListener("click", e => {
      if (e.target === skipEl) return;
      e.stopPropagation();
    });
    overlay.addEventListener("pointerdown", e => {
      if (e.target === skipEl) return;
      e.stopPropagation();
    });
  }
  if (skipEl) {
    skipEl.addEventListener("click", e => {
      e.stopPropagation();
      skip();
    });
  }
  addEventListener("keydown", e => {
    if (!active) return;
    if (e.key === "Escape") { e.preventDefault(); skip(); }
  }, true);

  document.addEventListener("site:enter", e => {
    const mode = e.detail && e.detail.mode;
    if (active) return;
    if (FORCE) {
      setTimeout(() => { if (!active) play({ thenMode: "void" }); }, 80);
      return;
    }
    if (pending() && (!mode || mode === "void"))
      play({ thenMode: "void" });
  });

  return {
    get active() { return active; },
    get pending() { return pending(); },
    play, skip, step, draw,
  };
})();
