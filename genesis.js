/* ===========================================================
   GENESIS — how the span began.

   Autoplay cinematic. First Setting visit (or Intro Cutscene)
   plays the record from the point: the span comes out of the
   left of the frame, the old ones walk the deck, Primordisentia
   is found and warped then bound, two lights tear out and fight
   in the void. Obrokxus wins. Rex becomes Rex the Surface.
   Then the chase, the children's war, the warlocks, the Hound,
   Mordrial's fall, and the duel that has not ended. Skip /
   Escape jumps to the fade into the live bridge.
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
    { id: "walk",  dur: 7.0, tag: "one side",
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
    { id: "flee", dur: 11.6, tag: "obrokxus flees",
      line: "Obrokxus ran west. Two lights followed: Ormius, law in gold-red — and Ava, pale as a healing wound." },
    { id: "war", dur: 9.2, tag: "their children",
      line: "The gods did not finish it. Their children did: Vorath, Malgrur, Seravim — an everlasting war." },
    { id: "stalemate", dur: 5.4, tag: "nothing won",
      line: "Even then the war led to nothing." },
    { id: "firstlock", dur: 6.8, tag: "mordrial",
      line: "They made one thing together, half Seravim, half Malgrur. Mordrial — the first warlock." },
    { id: "four", dur: 8.5, tag: "four of the void",
      line: "Four stood: Mordrial of the Void, Cadmus Baalzur, Aelius Luxent, Velindra the Chaos Binder." },
    { id: "fifth", dur: 7.8, tag: "the hound",
      line: "Cadmus made a fifth — not a person, a weapon. Eldrin walked into the nest and became the Hound." },
    { id: "fall", dur: 8.6, tag: "mordrial fell",
      line: "They met Obrokxus. The fight outlasted counting. Mordrial fell. The rest called it victory." },
    { id: "return", dur: 5.8, tag: "the mainland",
      line: "They turned home, to life and the void. Only Ormius still believed Obrokxus had survived." },
    { id: "eternity", dur: 8.8, tag: "still fighting",
      line: "No one has gone far enough to see. They fight there still." },
    { id: "now",   dur: 2.6, tag: "", line: "" },
  ];

  const ROOT_U = 4.0;
  const DECK   = 0.64;
  const BAY_U  = 0.125;
  const SPAN_START_U = -0.72;
  const REX_U  = ROOT_U - 0.52;
  const MAIN_U = ROOT_U - 5.35;
  const MAIN_HALF = 0.92;
  const LEFT_U = MAIN_U - 0.40;
  const RIGHT_U = MAIN_U + 0.38;
  const CITY_U = MAIN_U + 0.46;
  const NEST_U = MAIN_U - 0.50;
  const ET_END_U = MAIN_U - 3.85;
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
      amp: 0.028, base: 0.30, seed: 1201, cell: 980 },
    { fill: ["#2b3742", "#1c242d"], edge: "rgba(172,198,208,0.38)",
      amp: 0.036, base: 0.18, seed: 3307, cell: 760 },
    { fill: ["#233039", "#2a2320"], edge: "rgba(186,208,214,0.55)",
      amp: 0.044, base: 0.06, seed: 5501, cell: 580 },
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
  const trailY = [], trailR = [], trailM = [], trailA = [], trailH = [], rings = [];

  const motes = [], oldones = [], souls = [], troops = [], towers = [];
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
    function troop(kind, home0, home1, n) {
      for (let i = 0; i < n; i++) {
        troops.push({
          kind,
          ph: r() * 6.28,
          lane: (r() - 0.5) * 0.14,
          gait: 0.5 + r() * 1.0,
          s: 0.62 + r() * 0.55,
          born: Math.pow(r(), 0.72),
          home: home0 + r() * (home1 - home0),
          reach: 0.06 + r() * 0.16,
        });
      }
    }
    troop("vorgath",  -0.78, -0.10, 74);
    troop("seraphin",  0.10,  0.72, 52);
    troop("malgrur",   0.08,  0.64, 52);
    for (let i = 0; i < 34; i++) {
      towers.push({
        u: 0.18 + r() * 0.52,
        w: 7 + r() * 16,
        h: 0.07 + r() * 0.20,
        ph: r() * 6.28,
        lit: r(),
      });
    }
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
    let bar = ticksEl.querySelector(".genesis-prog");
    if (!bar) {
      ticksEl.innerHTML = '<span class="genesis-prog"><i></i></span>';
      bar = ticksEl.querySelector(".genesis-prog");
    }
    const fill = bar && bar.querySelector("i");
    const n = Math.max(1, BEATS.length - 1);
    const dur = Math.max(0.001, (BEATS[beat] && BEATS[beat].dur) || 1);
    const u = clamp((beat + clamp(local / dur, 0, 1)) / n, 0, 1);
    if (fill) fill.style.width = (u * 100).toFixed(2) + "%";
  }

  function go(i) {
    beat = clamp(i, 0, BEATS.length - 1);
    local = 0;
    if (BEATS[beat] && BEATS[beat].id === "flee") {
      trailY.length = 0;
    }
    if (BEATS[beat] && BEATS[beat].id === "eternity") {
      trailR.length = 0;
      trailM.length = 0;
      trailA.length = 0;
      trailH.length = 0;
    }
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
    trailM.length = 0;
    trailA.length = 0;
    trailH.length = 0;
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
    const jump = /[?&]gbeat=([a-z]+)/.exec(location.search);
    if (jump) {
      const i = idxOf(jump[1]);
      if (i > 0) {
        go(i);
        if (i >= idxOf("war")) { cam = MAIN_U; camTarget = MAIN_U; }
        else if (i >= idxOf("flee")) { cam = ROOT_U - 0.30; camTarget = cam; }
        else if (i >= idxOf("land")) { cam = ROOT_U - 0.30; camTarget = cam; }
      }
    }
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
    const uFlee  = since("flee");
    const uWar   = since("war");
    const uStall = since("stalemate");
    const uLock  = since("firstlock");
    const uFour  = since("four");
    const uFifth = since("fifth");
    const uFall  = since("fall");
    const uRet   = since("return");
    const uEt    = since("eternity");
    if (uEt > 0.02)
      camTarget = mix(MAIN_U, ET_END_U, linear("eternity"));
    else if (uRet > 0.02)
      camTarget = mix(MAIN_U, MAIN_U + 0.18, uRet);
    else if (uFall > 0.02)
      camTarget = MAIN_U;
    else if (uFifth > 0.02)
      camTarget = mix(MAIN_U + 0.06, MAIN_U - 0.10, uFifth);
    else if (uFour > 0.02)
      camTarget = mix(MAIN_U, MAIN_U + 0.08, uFour);
    else if (uLock > 0.02)
      camTarget = MAIN_U;
    else if (uStall > 0.02)
      camTarget = MAIN_U;
    else if (uWar > 0.02)
      camTarget = MAIN_U;
    else if (uFlee > 0.02)
      camTarget = mix(ROOT_U - 0.30, MAIN_U, linear("flee"));
    else if (uWalk < 0.001) camTarget = 0;
    else if (uLand > 0.08)
      camTarget = mix(ROOT_U - 0.48, ROOT_U - 0.30, clamp((uLand - 0.08) / 0.7, 0, 1));
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
    let camRate = 1.55;
    if (uWalk > 0.001 && uRoot < 0.02) camRate = 2.25;
    if (uFlee > 0.02 && uWar < 0.02) camRate = 1.05;
    if (uEt > 0.02) camRate = 1.12;
    cam = approach(cam, camTarget, camRate, dt);
    paintTicks();

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
    const inf = beat >= idxOf("flee");
    const startU = inf ? cam - 2.65 : SPAN_START_U;
    const endU = inf ? cam + 2.45 : mix(-0.48, ROOT_U + 0.22, grow);
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
    const yBurst = cy + Math.sin(o.ang) * r * H * 0.16;
    const settle = smooth(clamp((burst - 0.18) / 0.42, 0, 1));
    const splitU = o.side * (0.05 + o.gait * 0.14) * settle;
    const along = o.side < 0
      ? splitU - o.gait * walk * 2.2
      : mix(splitU, ROOT_U - 0.06 + o.lane * 0.002, clamp(walk * (0.88 + o.gait * 0.18), 0, 1));
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

    let a = o.a * clamp(burst * 4.2, 0, 1);
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
    if (burst < 0.01 && walk < 0.02) return;
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
    rx = mix(rx, sx(REX_U - 0.18), recede);
    ry = mix(ry, H * 0.36, recede);

    return {
      yx, yy, rx, ry,
      yAmt: emerge * (1 - die),
      rAmt: emerge * (1 - recede * 0.12),
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

  function drawOrb(ctx, x, y, amt, kind, scale) {
    if (amt < 0.02) return;
    const s = scale == null ? 1 : scale;
    const big = kind === "obrokxus" || kind === "hound";
    const R = Math.min(W, H) * (kind === "hound" ? 0.055 : big ? 0.072 : 0.048) * s * (0.7 + amt * 0.5);
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
    } else if (kind === "ormius") {
      ctx.globalCompositeOperation = "lighter";
      const halo = ctx.createRadialGradient(x, y, 0, x, y, R * 4.2);
      halo.addColorStop(0, `rgba(255,236,200,${0.9 * amt})`);
      halo.addColorStop(0.16, `rgba(210,64,48,${0.72 * amt})`);
      halo.addColorStop(0.42, `rgba(150,22,24,${0.32 * amt})`);
      halo.addColorStop(1, "rgba(210,80,40,0)");
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(x, y, R * 4.2, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(160,24,28,${0.88 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.7, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(255,244,220,${0.95 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.22, 0, 6.283); ctx.fill();
    } else if (kind === "ava") {
      ctx.globalCompositeOperation = "lighter";
      const halo = ctx.createRadialGradient(x, y, 0, x, y, R * 3.8);
      halo.addColorStop(0, `rgba(230,255,236,${0.9 * amt})`);
      halo.addColorStop(0.2, `rgba(168,214,178,${0.7 * amt})`);
      halo.addColorStop(0.55, `rgba(90,140,110,${0.2 * amt})`);
      halo.addColorStop(1, "rgba(168,214,178,0)");
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(x, y, R * 3.8, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(236,255,242,${0.95 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.26, 0, 6.283); ctx.fill();
    } else if (kind === "mordrial") {
      const smoke = ctx.createRadialGradient(x, y, 0, x, y, R * 4.6);
      smoke.addColorStop(0, `rgba(40,18,28,${0.9 * amt})`);
      smoke.addColorStop(0.28, `rgba(120,70,40,${0.4 * amt})`);
      smoke.addColorStop(0.55, `rgba(170,200,180,${0.18 * amt})`);
      smoke.addColorStop(1, "rgba(20,8,10,0)");
      ctx.fillStyle = smoke;
      ctx.beginPath(); ctx.arc(x, y, R * 4.6, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(18,8,12,${0.94 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.7, 0, 6.283); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, R * 0.7, 0, 6.283); ctx.clip();
      ctx.fillStyle = `rgba(212,168,90,${0.7 * amt})`;
      ctx.fillRect(x - R, y - R, R, R * 2);
      ctx.fillStyle = `rgba(186,214,198,${0.7 * amt})`;
      ctx.fillRect(x, y - R, R, R * 2);
      ctx.restore();
      ctx.fillStyle = `rgba(255,236,200,${0.75 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.16, 0, 6.283); ctx.fill();
    } else if (kind === "cadmus") {
      ctx.globalCompositeOperation = "lighter";
      const halo = ctx.createRadialGradient(x, y, 0, x, y, R * 3.6);
      halo.addColorStop(0, `rgba(255,220,150,${0.88 * amt})`);
      halo.addColorStop(0.3, `rgba(196,140,48,${0.55 * amt})`);
      halo.addColorStop(1, "rgba(196,140,48,0)");
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(x, y, R * 3.6, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(255,232,170,${0.95 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.24, 0, 6.283); ctx.fill();
    } else if (kind === "aelius") {
      ctx.globalCompositeOperation = "lighter";
      const halo = ctx.createRadialGradient(x, y, 0, x, y, R * 3.9);
      halo.addColorStop(0, `rgba(240,255,246,${0.9 * amt})`);
      halo.addColorStop(0.22, `rgba(186,224,198,${0.6 * amt})`);
      halo.addColorStop(1, "rgba(186,224,198,0)");
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(x, y, R * 3.9, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(250,255,252,${0.95 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.22, 0, 6.283); ctx.fill();
    } else if (kind === "velindra") {
      ctx.globalCompositeOperation = "lighter";
      const halo = ctx.createRadialGradient(x, y, 0, x, y, R * 3.7);
      halo.addColorStop(0, `rgba(220,170,255,${0.55 * amt})`);
      halo.addColorStop(0.25, `rgba(70,180,170,${0.5 * amt})`);
      halo.addColorStop(1, "rgba(70,180,170,0)");
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(x, y, R * 3.7, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(210,255,248,${0.9 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.2, 0, 6.283); ctx.fill();
    } else if (kind === "hound") {
      const smokeR = R * 2.8;
      const smoke = ctx.createRadialGradient(x, y, 0, x, y, smokeR);
      smoke.addColorStop(0, `rgba(50,4,8,${0.95 * amt})`);
      smoke.addColorStop(0.22, `rgba(110,10,16,${0.5 * amt})`);
      smoke.addColorStop(0.55, `rgba(30,2,4,${0.22 * amt})`);
      smoke.addColorStop(1, "rgba(8,0,2,0)");
      ctx.fillStyle = smoke;
      ctx.beginPath(); ctx.arc(x, y, smokeR, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(16,2,4,${0.96 * amt})`;
      ctx.beginPath();
      ctx.ellipse(x, y, R * 0.85, R * 0.62, Math.sin(t * 1.3) * 0.12, 0, 6.283);
      ctx.fill();
      ctx.strokeStyle = `rgba(180,24,32,${0.7 * amt})`;
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      for (let i = 0; i < 7; i++) {
        const ang = t * 0.4 + i * (6.283 / 7);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang) * R * 0.35, y + Math.sin(ang) * R * 0.28);
        ctx.lineTo(x + Math.cos(ang) * R * 0.95, y + Math.sin(ang) * R * 0.72);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(210,36,40,${0.55 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.18, 0, 6.283); ctx.fill();
    } else {
      const smokeR = R * 2.45;
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
    const lock = smooth(clamp((rise - 0.18) / 0.5, 0, 1));
    const westU = ROOT_U - 0.92;
    const eastU = ROOT_U - 0.02;
    const xC = mix(originX, sx(mix(westU, eastU, 0.72)), lock);
    const yC = mix(originY, H * DECK + 8, rise);
    const x0 = sx(westU) - 20;
    const x1 = sx(eastU) + 12;
    if (x1 < -60 || x0 > W + 60) return;
    const bottom = H + 40;
    const step = 8;
    const spanU = Math.max(0.001, eastU - westU);
    for (let bi = 0; bi < REX_BANDS.length; bi++) {
      const b = REX_BANDS[bi];
      const pts = [];
      const left = Math.max(-40, x0);
      const right = Math.min(W + 40, x1);
      for (let px = left; px <= right; px += step) {
        const wu = cam + (px - W * 0.5) / W;
        const u = (wu - westU) / spanU;
        if (u < -0.02 || u > 1.04) continue;
        const entry = smooth(clamp(u / 0.14, 0, 1));
        const against = Math.pow(clamp(u, 0, 1), 1.28);
        const n = ridge(px / b.cell, b.seed);
        const h = (0.02 + 0.045 * bi + n * b.amp + against * 0.32) * entry;
        const y = mix(yC, H * DECK - h * H, rise);
        pts.push([px, y]);
      }
      if (pts.length < 2) continue;
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
        const g = ctx.createRadialGradient(xC, yC, 0, xC, yC, 80 + rise * 120);
        g.addColorStop(0, `rgba(245,208,107,${0.38 * glint})`);
        g.addColorStop(0.4, `rgba(245,208,107,${0.08 * glint})`);
        g.addColorStop(1, "rgba(245,208,107,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(xC, yC, 80 + rise * 120, 0, 6.283); ctx.fill();
      }
    }
  }

  function drawTintBeam(ctx, ax, ay, bx, by, rgb, amt) {
    if (amt < 0.06) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(${rgb},${0.58 * amt})`;
    ctx.lineWidth = 2.1;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = `rgba(${rgb},${0.16 * amt})`;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.restore();
  }

  function yWob(ph, amp) {
    return H * 0.36 + Math.sin(t * 1.35 + ph) * H * (amp || 0.018);
  }

  function standY(lane) {
    return H * DECK - 16 - (lane || 0) * H * 0.12;
  }

  function sagaAt() {
    if (beat < idxOf("flee")) return null;
    const flee = since("flee");
    const fleeLin = linear("flee");
    const war = since("war");
    const stall = since("stalemate");
    const lock = since("firstlock");
    const four = since("four");
    const fifth = since("fifth");
    const fall = linear("fall");
    const ret = since("return");
    const et = since("eternity");
    const etLin = linear("eternity");
    const span = Math.min(W, H);
    const godsOut = clamp((lock - 0.14) / 0.62, 0, 1);
    const fallIn = clamp(fall / 0.22, 0, 1);

    let ou = mix(REX_U - 0.18, LEFT_U, fleeLin), oy = yWob(0.2, 0.026), oAmt = 0;
    if (et > 0) {
      const fk = keyAt(RED_KEYS, etLin);
      ou = mix(MAIN_U - 0.85, ET_END_U - 0.10, etLin) + fk.x * 0.10;
      oy = H * 0.37 + fk.y * span * 0.16;
      oAmt = mix(0.55, 0.82, et);
    } else if (ret > 0) {
      oAmt = 0;
    } else if (fall > 0.02) {
      const fk = keyAt(RED_KEYS, fall);
      ou = mix(LEFT_U, MAIN_U - 0.14, fallIn) + fk.x * 0.13 * fallIn;
      oy = mix(yWob(0.2, 0.022), H * 0.36 + fk.y * span * 0.18, fallIn);
      oAmt = mix(1, 0, clamp((fall - 0.78) / 0.22, 0, 1));
    } else if (flee > 0) {
      oAmt = 1;
    }

    let mu = mix(REX_U - 0.02, RIGHT_U - 0.14, clamp((fleeLin - 0.04) / 0.96, 0, 1));
    let my = yWob(1.1, 0.02) - H * 0.03, mAmt = 0;
    if (et > 0) {
      const yk = keyAt(YELLOW_KEYS, etLin);
      mu = mix(MAIN_U - 0.52, ET_END_U + 0.10, etLin) + yk.x * 0.10;
      my = H * 0.35 + yk.y * span * 0.16;
      mAmt = mix(0.5, 0.9, et);
    } else if (ret > 0) {
      mAmt = mix(0, 0.48, clamp((ret - 0.35) / 0.65, 0, 1));
      mu = mix(MAIN_U + 0.08, MAIN_U - 0.58, ret);
      my = yWob(1.4, 0.02);
    } else if (fleeLin > 0.04) {
      mAmt = 1 * (1 - godsOut);
      if (lock > 0) {
        mu = mix(RIGHT_U - 0.14, MAIN_U + 0.16, lock);
        my = mix(yWob(1.1, 0.018) - H * 0.03, yWob(0.8, 0.012), lock);
      }
    }

    let au = mix(REX_U + 0.08, RIGHT_U - 0.02, clamp((fleeLin - 0.08) / 0.92, 0, 1));
    let ay = yWob(2.6, 0.018) + H * 0.04, aAmt = 0;
    if (et > 0) {
      aAmt = 0;
    } else if (ret > 0) {
      aAmt = 0;
    } else if (fleeLin > 0.08) {
      aAmt = 1 * (1 - godsOut);
      if (lock > 0) {
        au = mix(RIGHT_U - 0.02, MAIN_U + 0.20, lock);
        ay = mix(yWob(2.6, 0.016) + H * 0.035, yWob(0.9, 0.012), lock);
      }
    }

    const born = clamp((lock - 0.42) / 0.40, 0, 1);
    const dieM = smooth(clamp((fall - 0.76) / 0.20, 0, 1));
    let mdU = mix(MAIN_U + 0.02, MAIN_U + 0.14, four);
    let mdY = standY(0.10);
    let mdAmt = born * (1 - dieM);
    if (fifth > 0) {
      mdU = mix(MAIN_U + 0.14, MAIN_U + 0.04, fifth);
      mdY = standY(0.08);
    }
    if (fall > 0.02) {
      const yk = keyAt(YELLOW_KEYS, fall);
      mdU = mix(MAIN_U + 0.04, MAIN_U + 0.06 + yk.x * 0.11, fallIn);
      mdY = mix(standY(0.08), mix(standY(0.06) + yk.y * span * 0.10, H * DECK + 22, dieM), fallIn);
    }
    if (ret > 0) mdAmt = 0;

    const slot = (start) => clamp((four - start) / 0.22, 0, 1);
    let cU = mix(MAIN_U + 0.24, NEST_U + 0.16, fifth);
    let cY = standY(mix(0.14, 0.06, fifth));
    let cAmt = slot(0.12);
    let aelU = mix(MAIN_U + 0.32, MAIN_U + 0.22, fallIn);
    let aelY = standY(mix(0.02, 0.00, fallIn));
    let aelAmt = slot(0.36);
    let vU = mix(MAIN_U + 0.17, MAIN_U + 0.10, fallIn);
    let vY = standY(mix(0.20, 0.22, fallIn));
    let vAmt = slot(0.58);
    if (fall > 0.02) {
      cU = mix(NEST_U + 0.16, MAIN_U - 0.08, fallIn);
      cY = standY(mix(0.06, 0.12, fallIn));
    }
    if (ret > 0) {
      const fadeHome = mix(1, 0.08, ret);
      cU = mix(MAIN_U - 0.08, CITY_U + 0.08, ret);
      aelU = mix(MAIN_U + 0.22, CITY_U + 0.14, ret);
      vU = mix(MAIN_U + 0.10, CITY_U + 0.02, ret);
      cAmt *= fadeHome;
      aelAmt *= fadeHome;
      vAmt *= fadeHome;
    }

    const nestU = NEST_U;
    const nestAmt = fifth > 0 && fall < 0.02
      ? mix(0.25, 1, clamp(fifth * 2.4, 0, 1)) * (1 - clamp((fifth - 0.58) / 0.38, 0, 1))
      : (fall > 0.02 && fall < 0.35 ? mix(0.2, 0, fall / 0.35) : 0);
    const houndBorn = clamp((fifth - 0.50) / 0.34, 0, 1);
    let hU = mix(nestU, MAIN_U - 0.18, fallIn);
    let hY = standY(mix(-0.04, -0.06, fallIn));
    let hAmt = houndBorn;
    if (ret > 0) {
      hU = mix(MAIN_U - 0.18, CITY_U - 0.04, ret);
      hAmt = mix(1, 0.1, ret);
    }

    let army = 0;
    if (war > 0) army = mix(0, 0.32, clamp(war, 0, 1));
    if (stall > 0) army = mix(0.32, 0.42, stall);
    if (lock > 0) army = mix(0.42, 0.55, lock);
    if (four > 0) army = mix(0.55, 0.82, four);
    if (fifth > 0) army = mix(0.82, 0.92, fifth);
    if (fall > 0) army = mix(0.92, 1, fall);
    if (ret > 0) army = mix(1, 0.28, ret);

    let civAmt = 0;
    if (lock > 0.55) civAmt = mix(0, 0.48, clamp((lock - 0.55) / 0.45, 0, 1));
    if (four > 0) civAmt = mix(0.52, 0.86, four);
    if (fifth > 0) civAmt = mix(0.86, 0.95, fifth);
    if (fall > 0) civAmt = 0.96;
    if (ret > 0) civAmt = 1;

    let mainRise = 0;
    if (fleeLin > 0.58) mainRise = clamp((fleeLin - 0.58) / 0.42, 0, 1);
    if (war > 0) mainRise = 1;

    if (et > 0) {
      mdAmt = 0;
      cAmt = 0;
      aelAmt = 0;
      vAmt = 0;
      hAmt = 0;
      aAmt = 0;
      army = 0;
      civAmt = mix(1, 0, clamp(etLin * 2.2, 0, 1));
      mainRise = mix(1, 0, clamp(etLin * 1.6, 0, 1));
    }

    return {
      ou, oy, oAmt, mu, my, mAmt, au, ay, aAmt,
      mdU, mdY, mdAmt, cU, cY, cAmt, aelU, aelY, aelAmt, vU, vY, vAmt,
      nestU, nestAmt, hU, hY, hAmt, army, civAmt, mainRise,
      flee, fleeLin, war, stall, lock, four, fifth, fall, ret, et, etLin, born, dieM, godsOut,
    };
  }

  function drawMainland(ctx, rise) {
    if (rise < 0.02) return;
    const xL = sx(MAIN_U - MAIN_HALF);
    const xR = sx(MAIN_U + MAIN_HALF);
    if (xR < -50 || xL > W + 50) return;
    const bottom = H + 40;
    const deckY = H * DECK;
    const split = sx(MAIN_U);

    function bank(fromX, toX, fills, edge, seed) {
      const pts = [];
      const left = Math.max(-40, Math.min(fromX, toX));
      const right = Math.min(W + 40, Math.max(fromX, toX));
      for (let px = left; px <= right; px += 10) {
        const wu = cam + (px - W * 0.5) / W;
        const dist = Math.abs(wu - MAIN_U) / MAIN_HALF;
        const fade = dist > 0.82 ? smooth(1 - (dist - 0.82) / 0.18) : 1;
        const swell = (vnoise(wu * 5.2, seed) - 0.5) * 0.014;
        pts.push([px, mix(H + 24, deckY - swell * H * Math.max(0, fade), rise)]);
      }
      if (pts.length < 2) return;
      const path = new Path2D();
      path.moveTo(pts[0][0], bottom);
      for (const p of pts) path.lineTo(p[0], p[1]);
      path.lineTo(pts[pts.length - 1][0], bottom);
      path.closePath();
      const g = ctx.createLinearGradient(0, deckY - H * 0.10, 0, bottom);
      g.addColorStop(0, fills[0]);
      g.addColorStop(1, fills[1]);
      ctx.globalAlpha = rise;
      ctx.fillStyle = g;
      ctx.fill(path);
      ctx.strokeStyle = edge;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++)
        i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    bank(xL, split + 1, ["#2a1416", "#140c0e"], "rgba(140,40,44,0.28)", 8801);
    bank(split - 1, xR, ["#2e383e", "#1c2428"], "rgba(186,208,214,0.28)", 4409);

    const scorch = ctx.createLinearGradient(split - 18, 0, split + 18, 0);
    scorch.addColorStop(0, "rgba(40,6,8,0)");
    scorch.addColorStop(0.5, `rgba(90,12,16,${0.34 * rise})`);
    scorch.addColorStop(1, "rgba(40,6,8,0)");
    ctx.fillStyle = scorch;
    ctx.fillRect(split - 18, deckY - 8, 36, 20);
  }

  function drawCity(ctx, amt) {
    if (amt < 0.03) return;
    const deckY = H * DECK;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const tw of towers) {
      const u = CITY_U - 0.16 + tw.u * 0.36;
      const x = sx(u);
      if (x < -20 || x > W + 20) continue;
      const y = deckY - 8 - tw.h * H * 0.10 * amt;
      const on = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.6 + tw.ph));
      const rgb = tw.lit < 0.72 ? "245,208,107" : "186,214,198";
      drawSpark(ctx, x, y, rgb, 1.2 + tw.w * 0.05, amt * on * 0.85);
    }
    ctx.restore();
  }

  function drawSpark(ctx, x, y, rgb, rad, a) {
    if (a < 0.04) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad * 3.2);
    g.addColorStop(0, `rgba(${rgb},${0.95 * a})`);
    g.addColorStop(0.4, `rgba(${rgb},${0.32 * a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, rad * 3.2, 0, 6.283); ctx.fill();
    ctx.fillStyle = `rgba(255,255,248,${0.55 * a})`;
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.6, rad * 0.32), 0, 6.283); ctx.fill();
  }

  function drawArmies(ctx, S) {
    if (!S || S.army < 0.04) return;
    const push = clamp(S.army, 0, 1);
    let motion = 1;
    if (S.stall > 0) motion = mix(1, 0.12, clamp(S.stall, 0, 1));
    if (S.lock > 0) motion = 0.12;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const c of troops) {
      if (c.born > S.army) continue;
      const toward = (c.kind === "vorgath" ? push * c.reach : -push * c.reach) * motion;
      const u = MAIN_U + c.home + toward + Math.sin(t * (0.7 + c.gait) + c.ph) * 0.018 * motion;
      const x = sx(u);
      if (x < -24 || x > W + 24) continue;
      const y = standY(c.lane) + Math.sin(t * 1.7 + c.ph) * 2.2 * motion;
      const a = (0.5 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2 + c.ph))) * clamp((S.army - c.born) / 0.08, 0, 1);
      if (a < 0.05) continue;
      const rgb = c.kind === "vorgath" ? "160,24,28"
                : c.kind === "seraphin" ? "214,230,222"
                : "255,176,90";
      drawSpark(ctx, x, y, rgb, 1.5 + c.s * 1.05, a);
    }
    ctx.restore();
  }

  function drawNestPit(ctx, S) {
    if (!S || S.nestAmt < 0.04) return;
    const x = sx(S.nestU), y = H * DECK + 8;
    const R = Math.min(W, H) * 0.055 * S.nestAmt;
    const g = ctx.createRadialGradient(x, y, 0, x, y, R * 2.4);
    g.addColorStop(0, `rgba(8,0,1,${0.96 * S.nestAmt})`);
    g.addColorStop(0.35, `rgba(50,6,8,${0.45 * S.nestAmt})`);
    g.addColorStop(1, "rgba(8,0,2,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, R * 2.1, R * 0.42, 0, 0, 6.283); ctx.fill();
    ctx.save();
    ctx.strokeStyle = `rgba(140,16,22,${0.5 * S.nestAmt})`;
    ctx.lineWidth = 1.15;
    ctx.lineCap = "round";
    for (let i = 0; i < 7; i++) {
      const ang = Math.PI + (i - 3) * 0.22 + Math.sin(t * 1.4 + i) * 0.08;
      const len = R * (1.1 + 0.45 * Math.sin(t * 1.8 + i));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + Math.cos(ang) * len * 0.45,
        y + Math.sin(ang) * len * 0.25,
        x + Math.cos(ang) * len,
        y + Math.sin(ang) * len * 0.35
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSaga(ctx) {
    const S = sagaAt();
    if (!S) return;

    drawMainland(ctx, S.mainRise);
    drawCity(ctx, S.civAmt);
    drawNestPit(ctx, S);
    drawArmies(ctx, S);

    const ox = sx(S.ou), oy = S.oy;
    const mx = sx(S.mu), my = S.my;
    const ax = sx(S.au), ay = S.ay;

    if (S.oAmt > 0.02) { pushTrail(trailR, ox, oy); drawTrail(ctx, trailR, "90,12,18", S.oAmt, true); }
    if (S.mAmt > 0.02) { pushTrail(trailM, mx, my); drawTrail(ctx, trailM, "210,70,48", S.mAmt); }
    if (S.aAmt > 0.02) { pushTrail(trailA, ax, ay); drawTrail(ctx, trailA, "168,214,178", S.aAmt); }

    if (S.lock > 0.40 && S.lock < 0.82 && S.mAmt > 0.08 && S.aAmt > 0.08) {
      const p = 1 - Math.abs(S.lock - 0.58) / 0.18;
      if (p > 0) {
        flash = Math.max(flash, p * 0.7);
        shake = Math.max(shake, 0.32 * p);
        drawTintBeam(ctx, mx, my, ax, ay, "220,210,180", p);
        drawTintBeam(ctx, mx, my, sx(S.mdU), S.mdY, "212,168,90", p * S.mdAmt);
        drawTintBeam(ctx, ax, ay, sx(S.mdU), S.mdY, "186,224,198", p * S.mdAmt);
      }
    }

    if (S.fifth > 0.12 && S.fifth < 0.72 && S.cAmt > 0.1) {
      const beam = Math.sin(clamp((S.fifth - 0.12) / 0.5, 0, 1) * 3.14);
      drawTintBeam(ctx, sx(S.cU), S.cY, sx(S.nestU), H * DECK + 4, "196,140,48", beam * S.cAmt * 0.85);
    }

    if (S.war > 0.08 && S.et < 0.02) {
      const clashX = sx(MAIN_U);
      const clashY = standY(0);
      if (Math.sin(t * 6.5) > 0.72 && clashCool <= 0) {
        clashCool = 0.18;
        rings.push({ x: clashX + (Math.random() - 0.5) * 28, y: clashY + (Math.random() - 0.5) * 16, r: 6, a: 0.7 });
        shake = Math.max(shake, 0.14);
      }
    }

    drawOrb(ctx, sx(S.mdU), S.mdY, S.mdAmt, "mordrial", 0.58);
    drawOrb(ctx, sx(S.cU), S.cY, S.cAmt, "cadmus", 0.52);
    drawOrb(ctx, sx(S.aelU), S.aelY, S.aelAmt, "aelius", 0.52);
    drawOrb(ctx, sx(S.vU), S.vY, S.vAmt, "velindra", 0.52);
    drawOrb(ctx, sx(S.hU), S.hY, S.hAmt, "hound", 0.62);

    drawOrb(ctx, ox, oy, S.oAmt, "obrokxus");
    drawOrb(ctx, mx, my, S.mAmt, "ormius");
    drawOrb(ctx, ax, ay, S.aAmt, "ava");

    if (S.fall > 0.16 && S.fall < 0.86 && S.oAmt > 0.2 && S.mdAmt > 0.15) {
      const dx = sx(S.mdU) - ox, dy = S.mdY - oy;
      if (Math.hypot(dx, dy) < 48 && clashCool <= 0) {
        flash = 1;
        shake = Math.max(shake, 1);
        clashCool = 0.22;
        rings.push({ x: (sx(S.mdU) + ox) * 0.5, y: (S.mdY + oy) * 0.5, r: 10, a: 1 });
      }
    }
    if (S.et > 0.12 && S.oAmt > 0.2 && S.mAmt > 0.2) {
      const dx = mx - ox, dy = my - oy;
      if (Math.hypot(dx, dy) < 40 && clashCool <= 0) {
        flash = 0.7;
        shake = Math.max(shake, 0.45);
        clashCool = 0.3;
        rings.push({ x: (mx + ox) * 0.5, y: (my + oy) * 0.5, r: 8, a: 0.85 });
      }
    }
    if (S.fleeLin > 0.08 && S.fleeLin < 0.96) shake = Math.max(shake, 0.10);
    if (S.war > 0.05 && S.war < 0.95) shake = Math.max(shake, 0.14);
    if (S.fifth > 0.2 && S.fifth < 0.8) shake = Math.max(shake, 0.22);
    if (S.fall > 0.15) shake = Math.max(shake, 0.20 + S.fall * 0.22);
    if (S.dieM > 0.05 && S.dieM < 0.7) shake = Math.max(shake, 0.55);
    drawRings(ctx);
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
    const uFlee  = since("flee");
    const uNow   = only("now");

    fillBg(ctx);
    const streak = uWalk * (1 - uRoot) * 52
      + uFlee * (1 - since("war")) * 70
      + since("eternity") * 84;
    drawMotes(ctx, clamp(uBreak * 0.55 + uWalk * 0.45 + uLand * 0.15 + uFlee * 0.2, 0, 1), streak);
    drawChaos(ctx, clamp((uBreak * 0.4 + uWalk * 0.55) * (1 - uLand * 0.7), 0, 1));

    const uBreakLin = linear("break");
    const leave = smooth(clamp(uBreakLin * 3.2, 0, 1));
    const burst = smooth(clamp((uBreakLin - 0.22) / 0.45, 0, 1));
    const crack = leave * (1 - leave) * 4 * (1 - clamp(linear("walk") * 8, 0, 1));
    const pointVis = (beat > idxOf("point") ? 1 : mix(0.75, 1, linear("point"))) * (1 - leave);
    drawPoint(ctx, pointVis, crack);
    drawBridgeLine(ctx, uDrawn);

    const pain = 0.4 + uRoot * 0.2 + uSwarm * 1.15 * (1 - uWomb) + uWomb * 0.12;
    const approaching = clamp((cam - (ROOT_U - 0.95)) / 0.55, 0, 1);
    const fleshVis = approaching * (1 - uLand * 0.28);
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
    if (uBirth > 0.04 && beat < idxOf("flee")) {
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
    drawSaga(ctx);

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
    if (pending() && mode === "void")
      play({ thenMode: "void" });
  });

  return {
    get active() { return active; },
    get pending() { return pending(); },
    play, skip, step, draw,
  };
})();
