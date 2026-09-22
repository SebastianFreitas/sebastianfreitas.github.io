/* ===========================================================
   WORLD — the geography of Arcanis, and how it is drawn.

   Everything here is scenery: where things are, what they look
   like, and nothing about the camera, the pointer, the beacons
   or the HUD. Those live in bridge.js.

   One entry point:

     World.draw(ctx, {
       W, H, camX, t, vel, maxFling, chaos, future, dt
     })

   plus World.LAND / SLOT / BOUNDS / DECK for anyone who needs to
   place something against the map, and World.chaosAt / futureAt
   for the ambience the camera eases toward.
   =========================================================== */

window.World = (function () {

  const VIEW_UNITS = 2100;     // world units across the viewport

  /* ---- the small maths this file needs ---- */
  const { mulberry, hash1, smooth, approach, fmt, vnoise, ridge } = Util;


  /* ---- world ---- */
  const SLOT = 6000;
  const at = i => i * SLOT;
  const LAND = {
    future:   at(4.5),
    mainland: at(11.5),
    voidmark: at(30),
    bridge:   at(41),
    watcher:  at(56),
    rex:      at(61.5),    // the prime mass
    edgefall: at(65.5),    // the second
    unnamed:  at(68.2),    // the third, unsurveyed
    root:     at(70.6),    // the flesh begins here
    rootEnd:  at(80),
  };

  /* the three pieces of Rex, each a body with a surface, an underground
     and something deeper under that */
  const MASSES = [
    { key: "rexA", at: LAND.rex,      half: 2.1, crust: 0.50, deep: "hell",
      label: "REX · PRIME",      sub: "castle · warzone · hell" },
    { key: "rexB", at: LAND.edgefall, half: 1.2, crust: 0.56, deep: "cold",
      label: "REX · EDGEFALL",   sub: "surface · under · deep" },
    { key: "rexC", at: LAND.unnamed,  half: 1.1, crust: 0.58, deep: "cold",
      label: "REX · UNSURVEYED", sub: "no report filed" },
  ];


  const BOUNDS = { min: at(1.6), max: LAND.root - 2400 };

  const DECK  = 0.64;   // deck height as a fraction of the hero. Bigger = lower.
  const FLOOR = 1.14;
  const BAY   = 300;   // spacing between legs


  /* how disturbed the dark is here: worst mid-void, calm near the
     mainland, and almost nothing out west where nothing has happened */
  function chaosAt(x) {
    const fromCity = smooth((Math.abs(x - LAND.mainland) - SLOT * 1.2) / (SLOT * 5));
    const west = x < LAND.mainland ? smooth((x - BOUNDS.min) / (SLOT * 5.5)) : 1;
    const east = smooth((LAND.watcher - x) / (SLOT * 3) + 1);
    return fromCity * west * Math.min(1, east);
  }
  function futureAt(x) { return 1 - smooth((x - BOUNDS.min) / (SLOT * 7)); }

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

  /* ---- Rex ------------------------------------------------
     Not stacked layers — a run. Travelling east the ground climbs
     as three nested ranges, each smaller and further back than the
     one in front, until the surface leaves the top of the frame.
     Past that you're inside it: underground for a long while, then
     hell opening downward and to the right, and then the Root.
  --------------------------------------------------------- */
  const REX_FROM = LAND.rex - SLOT * 6.0;   // the ground starts here
  const REX_END  = LAND.rex + SLOT * 2.5;   // the surface finally leaves the frame
  const HELL_AT  = LAND.rex + SLOT * 4.4;   // and it starts turning

  /* near band is biggest and darkest; the ones behind are smaller,
     higher and paler, which is what makes the joins disappear */
  const REX_BANDS = [
    // furthest back: highest and climbs hardest, so it leaves the frame first
    { par: 0.50, seed: 1201, amp: 0.055, base: 0.34, drift: 0.16, rampAt: 0.60, climb: 2.4, cell: 2600,
      lit: "#39485a", shade: "#26313d" },
    { par: 0.59, seed: 3307, amp: 0.075, base: 0.20, drift: 0.13, rampAt: 0.70, climb: 2.1, cell: 1900,
      lit: "#2b3742", shade: "#1c242d" },
    // nearest: lowest and slowest, so the two behind stay visible over it
    { par: 0.68, seed: 5501, amp: 0.095, base: 0.06, drift: 0.10, rampAt: 0.80, climb: 1.8, cell: 1400,
      lit: "#2a3640", shade: "#1b2228" },
  ];

  /* height of a band at a world position, as a share of the hero */
  function rexHeight(worldX, b) {
    const u = (worldX - REX_FROM) / (REX_END - REX_FROM);
    if (u <= 0) return 0;
    const entry = Math.min(1, u / 0.10);          // rises out of nothing

    // a slow drift across the whole run, so the ground rolls rather
    // than only ever climbing
    const drift = u * b.drift;

    // and one ramp at the end that takes it out of the frame
    const r = Math.max(0, (u - b.rampAt) / (1 - b.rampAt + 0.0001));
    const ramp = Math.pow(r, 2.4) * b.climb;

    // two scales of relief: long swells, and the detail on top of them
    const relief = ridge(worldX / (b.cell * 3.2), b.seed + 7) * b.amp * 1.5
                 + ridge(worldX / b.cell, b.seed) * b.amp;

    return (b.base + drift + ramp + relief) * entry;
  }

  /* ---- the kingdoms of Rex ------------------------------------
     Each is painted once into its own sprite by rexart-surface.js /
     rexart-deep.js (window.RexArt) and copied every frame; only its
     moving parts are drawn live. Nothing shows until its beacon has
     landed (depthAlpha). A surface kingdom stands on a range's skyline
     at that range's parallax, so the ranges in front hide its foot; a
     deep one hangs in the rock at the beacons' own parallax.
     The Mainland factions use the same sprite cache, painted by landart.js
     (window.LandArt).
  --------------------------------------------------------- */
  const REX_ART_PAR  = 0.62;   // bnote-rex's par: deep kingdoms move with their beacons
  const REX_ART_UNIT = 26;     // world units per art unit, before parallax
  // band: index into REX_BANDS the kingdom stands on, or -1 for deep (then oy is its centre, as a share of the hero)
  const REX_PLACES = [
    { id: "bnote-rex-firstlight", art: "firstlight", x: 357516, band: 0 },
    { id: "bnote-rex-crimson",    art: "crimson",    x: 364204, band: 0 },
    { id: "bnote-rex-bonespire",  art: "bonespire",  x: 371462, band: 1 },
    { id: "bnote-rex-titans",     art: "titans",     x: 378900, band: -1, oy: 0.37 },
    { id: "bnote-rex-valkhar",    art: "valkhar",    x: 386879, band: -1, oy: 0.37 },
    { id: "bnote-rex-law",        art: "law",        x: 394368, band: -1, oy: 0.38 },
  ];
  const rexSprites = new Map();   // art name -> { key, canvas }

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
      presences.push({
        x: from + r() * (to - from),
        y: 0.16 + r() * 0.56,
        w: 260 + r() * 700, h: 130 + r() * 340,
        ph: r() * 6.28, cycle: 0.035 + r() * 0.05,
        par: 0.16 + r() * 0.22, seen: 0,
      });
    }
    /* things reaching out of the dark */
    for (let i = 0; i < 22; i++)
      tendrils.push({ x: from - SLOT + r() * (to - from + SLOT * 2),
                      y: 0.1 + r() * 0.8, len: 90 + r() * 300,
                      ph: r() * 6.28, par: 0.2 + r() * 0.3,
                      dir: r() < 0.5 ? -1 : 1, a: 0.05 + r() * 0.12 });
  })();

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

  /* ---- draw: stars ---- */
  function drawVoid() {
    const s = scale(), span = W * 2.4, off = camX * 0.06 * s;
    for (const b of blobs) {
      b.y += b.vy * 1.2 * dtNow;   // 0.02 per frame at 60 fps, now per second
      if (b.y > 1.3) b.y = -0.25; if (b.y < -0.3) b.y = 1.25;
      const x = ((b.u * span - off) % span + span) % span - span * 0.2;
      const rad = b.rad * Math.max(W, H);
      if (!onScreen(x, rad)) continue;
      const y = b.y * H;
      ctx.fillStyle = `rgba(${b.hue},${b.a * 0.3})`;
      ctx.beginPath(); ctx.arc(x, y, rad * 0.8, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, rad * 0.5, 0, 6.283); ctx.fill();
    }
    const off2 = camX * 0.14 * s;
    const streak = Math.min(60, Math.abs(vel) / V.maxFling * 220);
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
      if (!onScreen(x, p.w * 1.4)) { p.seen = approach(p.seen, 0, 2, dtNow); continue; }

      // surfaces slowly when you're near, and only during part of its cycle
      const near = 1 - Math.min(1, Math.abs(camX - p.x) / (SLOT * 2.2));
      const tide = Math.pow(0.5 + 0.5 * Math.sin(t * p.cycle * 6.283 + p.ph), 2.6);
      p.seen = approach(p.seen, smooth(near) * tide * chaosNow, 1.1, dtNow);
      if (p.seen < 0.015) continue;

      const y = p.y * H;
      const bw = p.w, bh = p.h;

      // a shape defined by what it hides
      ctx.fillStyle = `rgba(10,13,16,${0.85 * p.seen})`;
      ctx.beginPath(); ctx.ellipse(x, y, bw * 0.44, bh * 0.44, 0, 0, 6.283); ctx.fill();

      // one dim core, fading with the body — nothing that changes shape
      ctx.fillStyle = `rgba(150,72,64,${0.12 * p.seen})`;
      ctx.beginPath(); ctx.ellipse(x, y, bw * 0.14, bh * 0.14, 0, 0, 6.283); ctx.fill();
    }
  }

  /* ---- fragments of record, only out where there's nothing ---- */
  function drawFragments() {
    const s = scale();
    const i0 = Math.floor((camX - VIEW_UNITS * 1.4) / FRAG_CHUNK);
    const i1 = Math.ceil((camX + VIEW_UNITS * 1.4) / FRAG_CHUNK);
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
    ctx.fillStyle = `rgba(170,184,190,${0.03 * a})`; ctx.fillRect(0, 0, W * 0.5, H);
    ctx.fillStyle = `rgba(196,206,210,${0.05 * a})`; ctx.fillRect(0, 0, W * 0.22, H);

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

  // The red star beside the Watcher. x / oy match the beacon (NAV X / Y); the star sits `side` radii to the left so the beacon marks it rather than covering it.
  const RED_STAR = { x: 334257, oy: 0.40, side: -3.4 };

  // Hash in 0..1, used to build the Watcher's fixed reality-artifact geometry.
  function wh(n) {
    const h = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
    return h - Math.floor(h);
  }

  // Void's background flat colour, matched so torn-out chips read as reality missing rather than a patch of colour.
  const VOID_INK = "#0d1114";

  // Broken-off quad shards, floating near the disc. Fixed geometry, computed once at module load.
  const WATCHER_SHARDS = Array.from({ length: 9 }, (_, i) => ({
    a: i / 9 * 6.283 + (wh(i) - 0.5) * 0.5,
    d: 1.07 + 0.4 * wh(i + 20),
    s: 0.04 + 0.08 * wh(i + 40),
    rot: wh(i + 60) * 6.283,
    spin: (wh(i + 80) - 0.5) * 0.1,
    pts: [0, 1, 2, 3].map(k => [k / 4 * 6.283 + (wh(i * 4 + k + 100) - 0.5) * 1.1, 0.55 + 0.45 * wh(i * 4 + k + 200)]),
  }));

  // Jagged crack polylines running out from the disc's rim. Fixed geometry, computed once at module load.
  const WATCHER_CRACKS = Array.from({ length: 6 }, (_, i) => {
    const a0 = i / 6 * 6.283 + wh(i + 300) * 0.8;
    const n = 5;
    const len = 0.5 + 0.6 * wh(i + 310);
    return { pts: Array.from({ length: n + 1 }, (_, k) => [a0 + (k === 0 ? 0 : (wh(i * 10 + k + 320) - 0.5) * 0.35), 1.0 + len * k / n]) };
  });

  // The Void's peoples. x / oy is where each beacon was pinned in flight (NAV X / Y); `side` is how many radii left of the beacon the visual's centre sits so the beacon marks it rather than covering it.
  const NEPHILIM = { x: 45357, oy: 0.40, side: -2.9 };
  const ADMIN_TEAR = { x: 128000, oy: 0.34, side: -1.0 };
  const VIKINGS = { x: 292000, oy: 0.30 };
  // a node's art exists only once its beacon has landed and been seen, then fades in — same rule for every beacon
  const depthAlpha = id => (window.depthAlpha ? window.depthAlpha(id) : 0);
  let fade = 1;                                   // alpha of the node art being drawn; setA folds it into every alpha the art sets
  const setA = v => { ctx.globalAlpha = v * fade; };
  function faded(id, draw) {
    const a = depthAlpha(id);
    if (a <= 0) return;
    fade = a;
    ctx.save(); ctx.globalAlpha = a;
    draw();
    ctx.restore();
    fade = 1;
  }

  const MAIN_PAR = 0.66;
  const SHATTERED = { x: 58400, oy: 0.30 };
  const LIBERTECH = { x: 62300, oy: 0.26 };
  const FIRST_DAWN = { x: 65800, oy: 0.20 };
  const DIVINE_ACCORD = { x: 73400, oy: 0.22 };
  const GORE_LEGION = { x: 77900, oy: 0.30 };

  function drawWatcher() {
    const x = wx(LAND.watcher, 0.24);
    const R = Math.min(W, H) * 0.26;
    if (!onScreen(x, R * 3.2)) return;
    const y = H * 0.21;
    const ph = serusPhase(); const dim = 1 - 0.5 * ph.closure * ph.season;
    const step = Util.reduced() ? 0 : Math.floor(t * 1.3);

    // Glow
    const g = ctx.createRadialGradient(x, y, R * 0.5, x, y, R * 3.1);
    g.addColorStop(0, "rgba(226,226,218,0.08)");
    g.addColorStop(0.35, "rgba(170,170,166,0.03)");
    g.addColorStop(1, "rgba(226,226,218,0)");
    ctx.fillStyle = g; setA(dim); ctx.fillRect(x - R * 3.2, y - R * 3.2, R * 6.4, R * 6.4); setA(1);

    // Cracks, behind the disc -- reality splitting at the rim
    for (let i = 0; i < WATCHER_CRACKS.length; i++) {
      const on = wh(i * 7 + step * 13) > 0.25;
      if (!on) continue;
      const c = WATCHER_CRACKS[i];
      ctx.lineWidth = Math.max(1, R * 0.006);
      ctx.strokeStyle = "rgba(232,232,224,0.28)"; setA(dim);
      ctx.beginPath();
      for (let k = 0; k < c.pts.length; k++) {
        const [a2, rf] = c.pts[k];
        const px = x + Math.cos(a2) * R * rf, py = y + Math.sin(a2) * R * rf;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.strokeStyle = "rgba(200,60,70,0.18)"; setA(dim);
      ctx.beginPath();
      for (let k = 0; k < c.pts.length; k++) {
        const [a2, rf] = c.pts[k];
        const px = x + Math.cos(a2) * R * rf + R * 0.012, py = y + Math.sin(a2) * R * rf;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.lineWidth = 1; setA(1);

    // Disc, no shading -- the Watcher is a light source
    ctx.beginPath(); ctx.arc(x, y, R, 0, 6.283);
    ctx.fillStyle = "#dcdbd4"; ctx.fill();

    // Iris band, flat
    ctx.beginPath();
    ctx.arc(x, y, R * 0.9, 0, 6.283);
    ctx.arc(x, y, R * 0.62, 6.283, 0, true);
    ctx.fillStyle = "#d2d0c7"; ctx.fill();
    ctx.beginPath();
    for (let j = 0; j < 28; j++) {
      const a2 = j / 28 * 6.283 + 0.08 * Math.sin(j * 3.1);
      const r0 = R * 0.64, r1 = R * (0.8 + 0.08 * Math.sin(j * 5.3));
      ctx.moveTo(x + Math.cos(a2) * r0, y + Math.sin(a2) * r0);
      ctx.lineTo(x + Math.cos(a2) * r1, y + Math.sin(a2) * r1);
    }
    ctx.strokeStyle = "rgba(170,168,158,0.35)"; ctx.lineWidth = Math.max(1, R * 0.006); ctx.stroke();
    ctx.lineWidth = 1;

    // Rim chips -- void-coloured notches bitten out of the rim
    for (let j = 0; j < 4; j++) {
      const a2 = wh(j + 400) * 6.283 + 0.4 * Math.sin(t * 0.02 + j);
      const s = R * (0.05 + 0.05 * wh(j + 410));
      const cx = x + Math.cos(a2) * R * 1.0, cy = y + Math.sin(a2) * R * 1.0;
      const pts = WATCHER_SHARDS[j].pts;
      ctx.beginPath();
      for (let k = 0; k < pts.length; k++) {
        const [pa, rf] = pts[k];
        const px = cx + Math.cos(pa) * rf * s, py = cy + Math.sin(pa) * rf * s;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = VOID_INK; setA(1); ctx.fill();
    }

    // Floating shards -- broken-off pieces of the disc
    for (let i = 0; i < WATCHER_SHARDS.length; i++) {
      const sh = WATCHER_SHARDS[i];
      const jit = wh(i * 3 + step * 7) > 0.8 ? R * 0.03 * (wh(i + step) - 0.5) : 0;
      const a2 = sh.a + t * 0.004;
      const cx = x + Math.cos(a2) * R * sh.d + jit, cy = y + Math.sin(a2) * R * sh.d;
      const rot = sh.rot + t * sh.spin;
      ctx.beginPath();
      for (let k = 0; k < sh.pts.length; k++) {
        const [pa, rf] = sh.pts[k];
        const lx = Math.cos(pa) * rf * R * sh.s, ly = Math.sin(pa) * rf * R * sh.s;
        const px = cx + lx * Math.cos(rot) - ly * Math.sin(rot);
        const py = cy + lx * Math.sin(rot) + ly * Math.cos(rot);
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = "#dcdbd4"; setA(dim * (0.45 + 0.4 * wh(i + 500))); ctx.fill();
    }
    setA(1);

    // Broken ring fragments
    const radii = [1.3, 1.45, 1.62], starts = [0.4, 2.6, 4.4], speeds = [0.012, -0.008, 0.005];
    const spans = [1.9, 1.2, 2.6], widths = [0.012, 0.007, 0.005], alphas = [0.26, 0.18, 0.12];
    ctx.lineCap = "round";
    for (let m = 0; m < 3; m++) {
      const rad = R * radii[m];
      const s = starts[m] + t * speeds[m];
      const span = spans[m];
      ctx.lineWidth = Math.max(1, R * widths[m]);
      ctx.strokeStyle = `rgba(232,232,224,${alphas[m]})`; setA(dim);
      ctx.beginPath(); ctx.arc(x, y, rad, s, s + span); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, rad, s + span + 0.5, s + span + 0.5 + span * 0.3); ctx.stroke();
    }
    ctx.lineCap = "butt"; setA(1); ctx.lineWidth = 1;

    // Tear strips -- horizontal slices of the canvas copied back offset, like reality slipping
    for (let k = 0; k < 3; k++) {
      const on = !Util.reduced() && wh(k * 11 + step * 17) > 0.45;
      if (!on) continue;
      const sy = y + (wh(k * 5 + step * 3) - 0.5) * 2.2 * R;
      const sh = R * (0.025 + 0.05 * wh(k + step * 19));
      const off = (wh(k * 9 + step * 23) - 0.5) * 0.35 * R;
      const m = ctx.getTransform();
      let dx0 = (x - 1.6 * R) * m.a + m.e;
      let dy0 = sy * m.d + m.f;
      let dw = 3.2 * R * m.a;
      let dh = sh * m.d;
      if (dx0 < 0) { dw += dx0; dx0 = 0; }
      if (dx0 + dw > ctx.canvas.width) dw = ctx.canvas.width - dx0;
      if (dy0 < 0) { dh += dy0; dy0 = 0; }
      if (dy0 + dh > ctx.canvas.height) dh = ctx.canvas.height - dy0;
      if (dw <= 0 || dh <= 0) continue;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
      ctx.drawImage(ctx.canvas, dx0, dy0, dw, dh, dx0 + off * m.a, dy0, dw, dh);
      ctx.restore();
    }

    drawSerus(x, y, R, ph);
  }

  // Serus's closure (day/night) and season (summer/winter), both 0..1.
  // At load: winter day, matching today's look.
  function serusPhase() {
    const dn = 0.5 + 0.5 * Math.sin(t * 6.283 / 60 - 1.5708);
    const k = Math.min(1, Math.max(0, (dn - 0.25) / 0.5));
    const closure = k * k * (3 - 2 * k);
    const sn = 0.5 + 0.5 * Math.sin(t * 6.283 / 240 + 1.5708);
    const season = sn * sn * (3 - 2 * sn);
    return { closure, season };
  }

  function drawSerus(x, y, R, ph) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-t * 0.03);
    const N = 96, TURNS = 3;
    const Rout = R * (0.3 + 0.45 * ph.season);
    const pitch = Rout * 0.96 / TURNS;
    const hw0 = 0.5 * pitch * (0.42 + 0.68 * ph.closure);
    const u = Math.min(hw0 * 0.9, Rout * 0.1);
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const f = i / N;
      const a = f * TURNS * 6.283;
      const r = Rout * (0.07 + 0.93 * f) + R * 0.01 * Math.sin(t * 0.4 + f * 9);
      const hs = Math.min(1, f / 0.14);
      const neck = hw0 > 0 ? 0.62 * u / hw0 : 1;
      const head = neck + (1 - neck) * hs * hs * (3 - 2 * hs);
      const tail = f < 0.8 ? 1 : 1 - 0.85 * (f - 0.8) / 0.2;
      const hw = hw0 * head * tail;
      pts.push({ a, r, hw, f });
    }
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const p = pts[i];
      const rr = p.r + p.hw;
      const px = Math.cos(p.a) * rr, py = Math.sin(p.a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    for (let i = N; i >= 0; i--) {
      const p = pts[i];
      const rr = Math.max(0, p.r - p.hw);
      ctx.lineTo(Math.cos(p.a) * rr, Math.sin(p.a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = "#140d12"; setA(1); ctx.fill("nonzero");

    // Night core: full closure reads as a solid eclipse
    if (ph.closure > 0.8) {
      const nr = Rout * 0.96 * Math.min(1, (ph.closure - 0.8) / 0.2);
      ctx.beginPath(); ctx.arc(0, 0, nr, 0, 6.283); ctx.fill();
    }

    // Subtle scales: a row (or two, staggered) of shallow arcs bulging tailward
    const sa = depthAlpha("bnote-watcher-serus");
    ctx.strokeStyle = "rgba(125,112,118,1)";
    setA(0.2 + 0.15 * sa);
    ctx.lineWidth = Math.max(1, R * 0.004);
    ctx.beginPath();
    for (let i = 4; i <= N - 4; i += 2) {
      const p = pts[i];
      if (p.hw < R * 0.012) continue;
      const q = pts[i + 1], o = pts[i - 1];
      const tx = Math.cos(q.a) * q.r - Math.cos(o.a) * o.r;
      const ty = Math.sin(q.a) * q.r - Math.sin(o.a) * o.r;
      const th = Math.atan2(ty, tx);
      const rows = (i / 2) % 2 === 0 ? [-0.45, 0.45] : [0];
      for (let j = 0; j < rows.length; j++) {
        const v = rows[j];
        const cx = Math.cos(p.a) * (p.r + v * p.hw);
        const cy = Math.sin(p.a) * (p.r + v * p.hw);
        const s = p.hw * 0.32;
        ctx.moveTo(cx + Math.cos(th - 1.5708) * s, cy + Math.sin(th - 1.5708) * s);
        ctx.arc(cx, cy, s, th - 1.5708, th + 1.5708);
      }
    }
    ctx.stroke(); setA(1);

    // Snake head, drawn in a frame aligned to the coil's inner tangent
    const h0 = pts[0], h1 = pts[1];
    const hx = Math.cos(h0.a) * h0.r, hy = Math.sin(h0.a) * h0.r;
    const h1x = Math.cos(h1.a) * h1.r, h1y = Math.sin(h1.a) * h1.r;
    const hd = Math.atan2(hy - h1y, hx - h1x);
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(hd);

    const hpts = [
      [-0.5, 0.62], [0.3, 0.9], [1.1, 0.95], [1.8, 0.7], [2.3, 0.3], [2.45, 0],
      [2.3, -0.3], [1.8, -0.7], [1.1, -0.95], [0.3, -0.9], [-0.5, -0.62]
    ];
    ctx.fillStyle = "#140d12"; setA(1);
    ctx.beginPath();
    ctx.moveTo(hpts[0][0] * u, hpts[0][1] * u);
    ctx.lineTo((hpts[0][0] + hpts[1][0]) / 2 * u, (hpts[0][1] + hpts[1][1]) / 2 * u);
    for (let i = 1; i < hpts.length - 1; i++) {
      const p = hpts[i], n = hpts[i + 1];
      ctx.quadraticCurveTo(p[0] * u, p[1] * u, (p[0] + n[0]) / 2 * u, (p[1] + n[1]) / 2 * u);
    }
    ctx.lineTo(hpts[hpts.length - 1][0] * u, hpts[hpts.length - 1][1] * u);
    ctx.closePath(); ctx.fill();

    ctx.beginPath(); ctx.arc(1.25 * u, 0.42 * u, 0.27 * u, 0, 6.283);
    ctx.fillStyle = "#dcdbd4"; ctx.fill();
    ctx.beginPath(); ctx.ellipse(1.28 * u, 0.42 * u, 0.07 * u, 0.2 * u, 0, 0, 6.283);
    ctx.fillStyle = "#140d12"; ctx.fill();

    if (Math.sin(t * 0.9) > 0.55) {
      ctx.strokeStyle = "#140d12"; ctx.lineWidth = Math.max(1, R * 0.004); ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(2.4 * u, 0); ctx.lineTo(3.1 * u, 0);
      ctx.moveTo(3.1 * u, 0); ctx.lineTo(3.4 * u, 0.2 * u);
      ctx.moveTo(3.1 * u, 0); ctx.lineTo(3.4 * u, -0.2 * u);
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore(); setA(1); ctx.lineWidth = 1; ctx.lineCap = "butt";
  }

  function drawRedStar() {
    const r = Math.min(W, H) * 0.03;
    const x = wx(RED_STAR.x, 0.24) + r * RED_STAR.side;
    if (!onScreen(x, r * 6)) return;
    const y = H * RED_STAR.oy;
    const p = 1 + Math.sin(t * 0.8) * 0.08;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5 * p);
    g.addColorStop(0, "rgba(255,110,90,0.55)");
    g.addColorStop(0.12, "rgba(255,70,60,0.3)");
    g.addColorStop(0.45, "rgba(190,30,50,0.07)");
    g.addColorStop(1, "rgba(190,30,50,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 5 * p, y - r * 5 * p, r * 10 * p, r * 10 * p);

    // Flat 4-point star
    ctx.fillStyle = "#ff6a5a"; setA(0.55);
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const ang = k * 1.5708;
      const outR = (k % 2 === 0) ? r * 1.7 * p : r * 2.6 * p;
      const ox = x + Math.cos(ang) * outR, oy = y + Math.sin(ang) * outR;
      if (k === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
      const inAng = ang + 0.7854;
      ctx.lineTo(x + Math.cos(inAng) * r * 0.32, y + Math.sin(inAng) * r * 0.32);
    }
    ctx.closePath(); ctx.fill();

    // Smaller star, rotated 45deg
    ctx.fillStyle = "#ff8a74"; setA(0.4);
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const ang = k * 1.5708 + 0.7854;
      const ox = x + Math.cos(ang) * r * 1.0 * p, oy = y + Math.sin(ang) * r * 1.0 * p;
      if (k === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
      const inAng = ang + 0.7854;
      ctx.lineTo(x + Math.cos(inAng) * r * 0.22, y + Math.sin(inAng) * r * 0.22);
    }
    ctx.closePath(); ctx.fill();

    setA(1); ctx.fillStyle = "#ff5a48";
    ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, 6.283); ctx.fill();
    ctx.fillStyle = "rgba(255,226,214,0.95)";
    ctx.beginPath(); ctx.arc(x, y, r * 0.28, 0, 6.283); ctx.fill();
    setA(1); ctx.lineWidth = 1;
  }

  function nephRng(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let x = Math.imul(a ^ (a >>> 15), 1 | a);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  const NEPH_PAL = { lit: "#5a2230", shade: "#2a0c14", coreLit: "#6c2a38", coreShade: "#34111b", hole: "#080204" };

  const NEPH_LOBES = [[0, 0, 0.5], [-0.32, -0.22, 0.3], [0.3, -0.28, 0.32], [0.36, 0.2, 0.28], [-0.3, 0.26, 0.3], [0.02, 0.42, 0.26], [-0.05, -0.46, 0.24]];

  const NEPH_CELLS = [[-0.18, -0.12, 0.08], [0.08, -0.2, 0.07], [0.22, 0.02, 0.075], [-0.02, 0.12, 0.085], [-0.3, 0.14, 0.06], [0.3, -0.3, 0.055], [-0.28, -0.34, 0.05], [0.12, 0.34, 0.06], [0.4, 0.22, 0.05], [-0.1, -0.42, 0.045]];

  const NEPH_EYES = [0, 1, 2, 3, 4, 7];

  function buildNephArms() {
    const rnd = nephRng(7331);
    const arms = [];
    for (let i = 0; i < 18; i++) {
      const a0 = i / 18 * 6.283 + (rnd() - 0.5) * 0.25;
      const len = 2.2 + rnd() * 2.0;
      const w0 = 0.09 + rnd() * 0.05;
      const curl = (rnd() - 0.5) * 1.6;
      const sway = 0.25 + rnd() * 0.25;
      const phase = rnd() * 6.283;
      const nb = rnd() < 0.35 ? 0 : (rnd() < 0.7 ? 1 : 2);
      const branches = [];
      for (let b = 0; b < nb; b++) {
        branches.push({
          at: 0.3 + rnd() * 0.35,
          side: rnd() < 0.5 ? -1 : 1,
          len: 0.35 + rnd() * 0.3,
          curl: (rnd() - 0.5) * 2,
          phase: rnd() * 6.283
        });
      }
      const pods = rnd() < 0.5 ? [0.5 + rnd() * 0.3] : [];
      arms.push({ a0, len, w0, curl, sway, phase, branches, pods });
    }
    return arms;
  }
  const NEPH_ARMS = buildNephArms();

  function nephWalk(x, y, h0, len, w0, curl, sway, phase, n) {
    const minW = Math.max(0.6, w0 * 0.04);
    const pts = [[x, y, w0 + minW, h0]];
    const step = len / n;
    let h = h0;
    for (let k = 1; k <= n; k++) {
      const f = k / n;
      h = h0 + curl * f + Math.sin(t * 0.5 + phase + f * 3.5) * sway * f;
      x += Math.cos(h) * step; y += Math.sin(h) * step;
      const hw = w0 * Math.pow(1 - f, 0.85) + minW;
      pts.push([x, y, hw, h]);
    }
    return pts;
  }

  function nephRibbon(path, pts) {
    const last = pts.length - 1;
    const norm = k => {
      const p0 = pts[Math.max(k - 1, 0)], p1 = pts[Math.min(k + 1, last)];
      const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
      const dl = Math.hypot(dx, dy) || 1;
      return [-dy / dl, dx / dl];
    };
    const n0 = norm(0);
    path.moveTo(pts[0][0] - n0[0] * pts[0][2], pts[0][1] - n0[1] * pts[0][2]);
    for (let k = 1; k <= last; k++) {
      const n = norm(k);
      path.lineTo(pts[k][0] - n[0] * pts[k][2], pts[k][1] - n[1] * pts[k][2]);
    }
    for (let k = last; k >= 0; k--) {
      const n = norm(k);
      path.lineTo(pts[k][0] + n[0] * pts[k][2], pts[k][1] + n[1] * pts[k][2]);
    }
    path.closePath();
  }

  function flatVolume(path, lit, shade, dx, dy) {
    ctx.fillStyle = lit; ctx.fill(path);
    ctx.save(); ctx.clip(path); ctx.translate(dx, dy); ctx.fillStyle = shade; ctx.fill(path); ctx.restore();
  }

  function drawNephilim() {
    const R = Math.min(W, H) * 0.16;
    const bx = wx(NEPHILIM.x, 0.94);
    const cx = bx + R * NEPHILIM.side;
    const cy = H * NEPHILIM.oy;
    if (!onScreen(cx, R * 4.8)) return;

    setA(1);
    const arms = new Path2D();
    const holes = new Path2D();
    const bases = [];

    const addPod = (x, y, r) => {
      arms.moveTo(x + r, y); arms.arc(x, y, r, 0, 6.283);
      holes.moveTo(x - r * 0.2 + r * 0.45, y - r * 0.1); holes.arc(x - r * 0.2, y - r * 0.1, r * 0.45, 0, 6.283);
    };

    for (let i = 0; i < 18; i++) {
      const A = NEPH_ARMS[i];
      const sx = cx + Math.cos(A.a0) * R * 0.35, sy = cy + Math.sin(A.a0) * R * 0.35;
      const pts = nephWalk(sx, sy, A.a0, A.len * R, A.w0 * R, A.curl, A.sway, A.phase, 22);
      nephRibbon(arms, pts);
      bases[i] = pts;

      for (const B of A.branches) {
        const kb = Math.round(B.at * 22);
        const P = pts[kb];
        const bp = nephWalk(P[0], P[1], P[3] + B.side * 0.7, A.len * R * (1 - B.at) * B.len, P[2] * 0.85, B.curl, A.sway, B.phase, 12);
        nephRibbon(arms, bp);
        addPod(P[0], P[1], P[2] * 1.7);
      }
      for (const f of A.pods) {
        const P = pts[Math.round(f * 22)];
        addPod(P[0], P[1], P[2] * 1.7);
      }
    }

    for (let i = 0; i < 18; i += 2) {
      const j = (i + 1) % 18;
      const p = bases[i][6], q = bases[j][7];
      const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      const ccx = mx + (cx - mx) * 0.25, ccy = my + (cy - my) * 0.25;
      const bridge = [];
      for (let s = 0; s <= 4; s++) {
        const u = s / 4;
        const iu = 1 - u;
        const x = iu * iu * p[0] + 2 * iu * u * ccx + u * u * q[0];
        const y = iu * iu * p[1] + 2 * iu * u * ccy + u * u * q[1];
        bridge.push([x, y, R * 0.016]);
      }
      nephRibbon(arms, bridge);
    }

    flatVolume(arms, NEPH_PAL.lit, NEPH_PAL.shade, R * 0.06, R * 0.03);
    ctx.fillStyle = NEPH_PAL.hole; ctx.fill(holes);

    const core = new Path2D();
    for (let li = 0; li < NEPH_LOBES.length; li++) {
      const [dx, dy, r] = NEPH_LOBES[li];
      const rr = r * R * (1 + 0.03 * Math.sin(t * 0.9 + li));
      core.moveTo(cx + dx * R + rr, cy + dy * R);
      core.arc(cx + dx * R, cy + dy * R, rr, 0, 6.283);
    }
    flatVolume(core, NEPH_PAL.coreLit, NEPH_PAL.coreShade, R * 0.18, R * 0.09);

    const cells = new Path2D();
    for (const [dx, dy, r] of NEPH_CELLS) {
      const hx = cx + dx * R, hy = cy + dy * R;
      for (let v = 0; v < 6; v++) {
        const a = v / 6 * 6.283 + 0.5;
        const px = hx + Math.cos(a) * r * R, py = hy + Math.sin(a) * r * R;
        if (v === 0) cells.moveTo(px, py); else cells.lineTo(px, py);
      }
      cells.closePath();
    }
    ctx.fillStyle = NEPH_PAL.hole; ctx.fill(cells);

    for (let j = 0; j < NEPH_EYES.length; j++) {
      const c = NEPH_CELLS[NEPH_EYES[j]];
      const ex = cx + c[0] * R, ey = cy + c[1] * R;
      setA(0.4 + 0.4 * Math.max(0, Math.sin(t * 0.7 + j * 2.1)));
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, R * 0.16);
      g.addColorStop(0, "rgba(255,120,90,0.5)");
      g.addColorStop(1, "rgba(255,120,90,0)");
      ctx.fillStyle = g;
      ctx.fillRect(ex - R * 0.16, ey - R * 0.16, R * 0.32, R * 0.32);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(255,230,210,0.9)";
      ctx.beginPath(); ctx.arc(ex, ey, R * 0.03, 0, 6.283); ctx.fill();
    }

    setA(1); ctx.globalCompositeOperation = "source-over"; ctx.lineWidth = 1;
  }

  const TEAR_JAG = [0.0, 0.35, -0.2, 0.5, -0.35, 0.25, -0.45, 0.4, -0.15, 0.3, -0.4, 0.2, 0.0];

  function drawAdminTear() {
    const h = Math.min(W, H) * 0.17;
    const w = h * 0.28 * (1 + Math.sin(t * 0.7) * 0.05);
    const bx = wx(ADMIN_TEAR.x, 0.94);
    const cx = bx + h * ADMIN_TEAR.side;
    const cy = H * ADMIN_TEAR.oy;
    if (!onScreen(cx, h * 2.2)) return;

    const left = [], right = [];
    for (let i = 0; i < 13; i++) {
      const f = -1 + i / 6;
      const prof = 1 - Math.pow(Math.abs(f), 1.5);
      const drift = w * 0.25 * TEAR_JAG[(i + 4) % 13];
      const lx = cx + drift - w * prof * (1 + 0.35 * TEAR_JAG[i]);
      const rx = cx + drift + w * prof * (1 + 0.35 * TEAR_JAG[(i + 6) % 13]);
      const y = cy + f * h;
      left.push([lx, y, drift]); right.push([rx, y, drift]);
    }

    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, h * 2.2);
    g.addColorStop(0, "rgba(200,190,255,0.12)");
    g.addColorStop(0.4, "rgba(160,140,230,0.04)");
    g.addColorStop(1, "rgba(160,140,230,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - h * 2.2, cy - h * 2.2, h * 4.4, h * 4.4);

    ctx.beginPath();
    ctx.moveTo(left[0][0], left[0][1]);
    for (let i = 1; i < 13; i++) ctx.lineTo(left[i][0], left[i][1]);
    for (let i = 12; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
    ctx.closePath();
    ctx.fillStyle = "rgba(236,226,255,0.9)"; ctx.fill();

    ctx.beginPath();
    let mid = left[0][2] + cx;
    let px = mid + (left[0][0] - mid) * 0.45;
    ctx.moveTo(px, left[0][1]);
    for (let i = 1; i < 13; i++) {
      mid = left[i][2] + cx;
      px = mid + (left[i][0] - mid) * 0.45;
      ctx.lineTo(px, left[i][1]);
    }
    for (let i = 12; i >= 0; i--) {
      mid = right[i][2] + cx;
      px = mid + (right[i][0] - mid) * 0.45;
      ctx.lineTo(px, right[i][1]);
    }
    ctx.closePath();
    ctx.fillStyle = "#020104"; ctx.fill();

    ctx.beginPath();
    [-0.6, -0.36, -0.12, 0.12, 0.36, 0.6].forEach(function (f) {
      const prof = 1 - Math.pow(Math.abs(f), 1.5);
      const L = w * 1.6 * prof;
      ctx.moveTo(cx - L, cy + f * h - h * 0.03);
      ctx.lineTo(cx + L, cy + f * h + h * 0.03);
    });
    ctx.strokeStyle = "rgba(245,208,107,0.75)"; ctx.lineWidth = 1.5;
    ctx.stroke();

    setA(1); ctx.lineWidth = 1;
  }

  const VIKING_STARS = [[-10.2, -3.4], [-8.6, -2.6], [-7.9, -3.9], [-5.9, -1.2], [-4.8, -0.4], [-4.1, -1.6], [-3.3, 0.6], [-2.6, -0.9], [-1.9, 0.2], [-2.2, 1.4], [-3.9, 1.1], [-1.4, -1.8]];
  const VIKING_LINES = [[0, 1], [2, 1], [1, 3], [3, 5], [5, 4], [4, 10], [10, 6], [6, 9], [9, 8], [8, 7], [7, 5], [8, 11]];
  const VIKING_MAG = [0.7, 1.1, 0.55, 1.0, 0.8, 1.35, 0.9, 1.2, 0.75, 0.6, 1.0, 0.85];

  function drawVikings() {
    const s = Math.min(W, H) * 0.045;
    const bx = wx(VIKINGS.x, 0.94);
    const by = H * VIKINGS.oy;
    if (!onScreen(bx - 5.7 * s, s * 7)) return;

    const ng = ctx.createRadialGradient(bx - 3.6 * s, by - 0.2 * s, 0, bx - 3.6 * s, by - 0.2 * s, 6 * s);
    ng.addColorStop(0, "rgba(90,150,255,0.07)");
    ng.addColorStop(1, "rgba(90,150,255,0)");
    ctx.fillStyle = ng;
    ctx.fillRect(bx - 3.6 * s - 6 * s, by - 0.2 * s - 6 * s, 12 * s, 12 * s);

    ctx.beginPath();
    VIKING_LINES.forEach(function (l) {
      const [ax, ay] = VIKING_STARS[l[0]], [zx, zy] = VIKING_STARS[l[1]];
      ctx.moveTo(bx + ax * s, by + ay * s);
      ctx.lineTo(bx + zx * s, by + zy * s);
    });
    ctx.strokeStyle = "rgba(127,184,255,0.35)"; ctx.lineWidth = 1;
    ctx.stroke();

    VIKING_STARS.forEach(function (p, i) {
      const x = bx + p[0] * s, y = by + p[1] * s;
      const k = 0.6 + 0.4 * Math.sin(t * 1.3 + i * 2.3 + VIKING_MAG[i] * 4.1);
      setA(0.25 * k); ctx.fillStyle = "#7fb8ff";
      ctx.beginPath(); ctx.arc(x, y, s * 0.32 * VIKING_MAG[i], 0, 6.283); ctx.fill();
      setA(k); ctx.fillStyle = "#cfe6ff";
      ctx.beginPath(); ctx.arc(x, y, s * (0.09 + 0.05 * k) * VIKING_MAG[i], 0, 6.283); ctx.fill();
    });

    setA(1); ctx.lineWidth = 1;
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

  // flat fill lit from the left: the whole mass in lit, then a copy shifted down-right in shade, clipped to the mass, leaving a hard-edged lit cap on left-facing slopes (same as genesis.js fillRidge)
  function fillRidge(path, lit, shade) {
    Paint.fillRidge(ctx, path, lit, shade, H * 0.05, H * 0.035);
  }

  function drawRex() {
    const sc = scale();
    const bottom = H * 1.3;
    const toWorld = (px, par) => camX + (px - W * 0.5) / (par * sc);

    let nearPath = null;

    for (let bi = 0; bi < REX_BANDS.length; bi++) {
      const b = REX_BANDS[bi];
      if (toWorld(W + 60, b.par) < REX_FROM) continue;

      const pts = [];
      for (let px = -60; px <= W + 60; px += 7)
        pts.push([px, H * 1.06 - rexHeight(toWorld(px, b.par), b) * H]);
      if (!pts.length) continue;

      const path = new Path2D();
      path.moveTo(pts[0][0], bottom);
      for (const p of pts) path.lineTo(p[0], Math.max(-H * 0.6, p[1]));
      path.lineTo(pts[pts.length - 1][0], bottom);
      path.closePath();

      fillRidge(path, b.lit, b.shade);

      if (bi === REX_BANDS.length - 1) nearPath = path;
      drawRexPlaces(bi);  // kingdoms standing on this range, before the nearer ranges cover their feet
    }

    /* everything below is inside the nearest mass */
    if (nearPath) {
      ctx.save();
      ctx.clip(nearPath);
      rexInterior(sc, bottom);
      ctx.restore();
    }

    drawRexPlaces(-1);   // the deep kingdoms, over the rock
    drawHell(bottom);
  }

  /* ---- hell runs unbroken from its threshold into the Root ------
     Drawn outside the mass clip, or the last stretch before the Root
     falls outside the polygon and reads as void.
  --------------------------------------------------------- */
  function drawHell(bottom) {
    const par = REX_BANDS[2].par;
    const hx = wx(HELL_AT, par);
    if (hx > W + 60) return;

    const x0 = Math.max(hx, -160);
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.4);

    // one flat red from the seal on
    ctx.fillStyle = `rgba(132,26,22,${0.8 + 0.05 * pulse})`;
    ctx.fillRect(x0, 0, W - x0 + 160, H + 60);

    // one flat darkening over the whole of hell, no horizontal seam
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(x0, 0, W - x0 + 160, H + 60);

    for (let i = 0; i < 34; i++) {
      const u = hash1(i * 401), span = Math.max(90, W - x0);
      const ex = x0 + ((((u * span + t * (18 + u * 40) + hx - x0) % span) + span) % span);
      const ey = H - ((t * (26 + u * 60) + u * H) % (H * 0.95));
      ctx.fillStyle = `rgba(246,126,74,${0.14 + 0.3 * hash1(i * 77)})`;
      ctx.fillRect(ex, ey, 1.8, 1.8);
    }

    // the threshold, torn like the Root's own face
    if (hx > -60 && hx < W + 60) {
      ctx.strokeStyle = `rgba(212,72,62,${0.45 + 0.16 * pulse})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let k = 0; k <= 28; k++) {
        const u = k / 28, y = u * (H + 40);
        const px = hx + Math.sin(u * 7 + t * 0.35) * 11 + Math.sin(u * 17 - t * 0.2) * 5;
        k ? ctx.lineTo(px, y) : ctx.moveTo(px, y);
      }
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  /* ---- what the rock looks like once you're in it -------------
     Without this the underground is a flat fill and reads as void,
     which is exactly how it looked.
  --------------------------------------------------------- */
  function rexInterior(sc, bottom) {
    const nb = REX_BANDS[2], par = nb.par;

    // rubble, so it has grain rather than being a wash
    for (let i = 0; i < 90; i++) {
      const u = hash1(i * 911);
      const wxp = wx(REX_FROM + u * (LAND.root - REX_FROM), par);
      if (!onScreen(wxp, 20)) continue;
      const y = H * (0.12 + hash1(i * 337) * 1.1);
      ctx.fillStyle = `rgba(196,206,212,${0.03 + 0.05 * hash1(i * 53)})`;
      ctx.fillRect(wxp, y, 1 + hash1(i * 7) * 3, 1 + hash1(i * 13) * 2);
    }

  }

  /* ---- kingdom sprites: paint once per (unit, dpr), copy every frame ---- */
  function rexSprite(name, art, u, dpr) {
    const key = u.toFixed(4) + "@" + dpr;
    const cached = rexSprites.get(name);
    if (cached && cached.key === key) return cached.canvas;
    const c = cached ? cached.canvas : document.createElement("canvas");
    const [x0, y0, x1, y1] = art.box;
    c.width = Math.max(1, Math.ceil((x1 - x0) * u * dpr));
    c.height = Math.max(1, Math.ceil((y1 - y0) * u * dpr));
    const g = c.getContext("2d");
    g.setTransform(u * dpr, 0, 0, u * dpr, -x0 * u * dpr, -y0 * u * dpr);
    art.paint(g, 1 / u);
    rexSprites.set(name, { key, canvas: c });
    return c;
  }

  /* ---- kingdoms standing on a range, or (band === -1) deep in the rock ---- */
  function drawRexPlaces(band) {
    const lib = window.RexArt;
    if (!lib) return;
    const sc = scale();
    const dpr = ctx.getTransform().a || 1;
    for (const p of REX_PLACES) {
      if (p.band !== band) continue;
      const art = lib[p.art];
      if (!art) continue;
      const a = depthAlpha(p.id);
      if (a <= 0) continue;

      const b = band >= 0 ? REX_BANDS[band] : null;
      const par = b ? b.par : REX_ART_PAR;
      const u = sc * par * REX_ART_UNIT;
      if (!(u > 0)) continue;

      const [x0, y0, x1, y1] = art.box;
      const ax = wx(p.x, par);
      if (ax + x1 * u < -40 || ax + x0 * u > W + 40) continue;
      const ay = b ? H * 1.06 - rexHeight(p.x, b) * H : H * p.oy;

      const sprite = rexSprite(p.art, art, u, dpr);

      ctx.save();
      if (art.under) {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(ax, ay);
        ctx.scale(u, u);
        art.under(ctx, 1 / u, t, a);
        ctx.restore();
      }
      ctx.globalAlpha = a;
      ctx.drawImage(sprite, ax + x0 * u, ay + y0 * u, sprite.width / dpr, sprite.height / dpr);
      if (art.live) {
        ctx.globalAlpha = a;
        ctx.translate(ax, ay);
        ctx.scale(u, u);
        art.live(ctx, 1 / u, t, a);
      }
      ctx.restore();
    }
  }

  /* ---- the Mainland's factions, standing behind the city with their tops at the beacon's height ---- */
  function drawLandPlace(id, name, anchor) {
    const art = window.LandArt && window.LandArt[name];
    if (!art) return;
    const a = depthAlpha(id);
    if (a <= 0) return;
    const u = H * (1 - anchor.oy) / art.top;
    if (!(u > 0)) return;

    const [x0, y0, x1, y1] = art.box;
    const ax = wx(anchor.x, MAIN_PAR) - (x1 + 3) * u;
    const ay = H;
    if (ax + x1 * u < -40 || ax + x0 * u > W + 40) return;

    const dpr = ctx.getTransform().a || 1;
    const sprite = rexSprite("land:" + name, art, u, dpr);

    ctx.save();
    ctx.globalAlpha = a;
    ctx.drawImage(sprite, ax + x0 * u, ay + y0 * u, sprite.width / dpr, sprite.height / dpr);
    if (art.live) {
      ctx.globalAlpha = a;
      ctx.translate(ax, ay);
      ctx.scale(u, u);
      art.live(ctx, 1 / u, t, a);
    }
    ctx.restore();
  }

  /* ---- THE ROOT ------------------------------------------
     Deliberately almost nothing: a reach of red before it, and one
     torn edge. Everything past that line is simply not passable,
     and showing more of it made it smaller.
  --------------------------------------------------------- */
  function drawRoot() {
    const par = 0.70;
    const face = wx(LAND.root, par);
    if (face > W + 160) return;

    const breath = 0.5 + 0.5 * Math.sin(t * 0.34);

    // and past the line there is nothing to look at
    const cx = Math.max(face, -80);
    ctx.fillStyle = "#2a080c"; ctx.fillRect(cx, 0, W - cx + 80, H);

    // the edge, which is the only part worth drawing
    ctx.strokeStyle = `rgba(214,72,68,${0.34 + 0.2 * breath})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k <= 30; k++) {
      const u = k / 30, y = u * H;
      const px = face + Math.sin(u * 8 + t * 0.4) * 9 + Math.sin(u * 19 - t * 0.25) * 4;
      k ? ctx.lineTo(px, y) : ctx.moveTo(px, y);
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

    const first = Math.floor((camX - VIEW_UNITS) / BAY) - 1;
    const last  = Math.ceil((camX + VIEW_UNITS) / BAY) + 1;

    ctx.fillStyle = "rgba(112,130,140,0.55)";
    for (let b = first; b <= last; b++) {
      const x = wx(b * BAY, par);
      if (!onScreen(x, 20)) continue;
      ctx.fillRect(x - legW / 2, deckY + deckH, legW, legBot - deckY - deckH);
    }
    const archT = Math.max(1, legW * 0.55);
    ctx.fillStyle = "rgba(112,130,140,0.30)";
    for (let b = first; b <= last; b++) {
      const x0 = wx(b * BAY, par);
      if (!onScreen(x0, bayPx + 20)) continue;
      const cx = x0 + bayPx / 2, cy = deckY + deckH + rise, rx = bayPx / 2 - legW;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, rise, 0, Math.PI, 0);
      ctx.ellipse(cx, cy, rx - archT, rise - archT, 0, 0, Math.PI, true);
      ctx.closePath(); ctx.fill();
    }
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
      const x = wx(b * BAY, par);
      if (!onScreen(x, bayPx + 20)) continue;
      ctx.fillRect(x, deckY - 1.6, bayPx + 1, 2.4);
    }
  }

  /* ---- the view, set once per frame ---- */
  let ctx, W = 0, H = 0, camX = 0, t = 0, vel = 0;
  let chaosNow = 0, futureNow = 0;
  let dtNow = 1 / 60;   // seconds since the last draw; callers without it get 60 fps
  const V = { maxFling: 46000 };

  const scale = () => W / VIEW_UNITS;
  const wx = (worldX, par) => (worldX - camX) * par * scale() + W * 0.5;
  const onScreen = (x, pad) => x > -pad && x < W + pad;

  /* ---- Game Dev sector: same bridge, everything else swapped
     for a drifting nebula haze + whatever bodies bridge.js is
     currently flying past. No lore geography involved. ---- */
  function drawSectorGlow() {
    const s = scale();
    const hues = ["132,96,176", "92,150,178", "182,132,90"];
    for (let i = 0; i < 3; i++) {
      const par = 0.045 + i * 0.05;
      const off = camX * par * s;
      const span = 5400;
      const cx = ((i * 2100 - off) % span + span) % span - span * 0.18;
      const cy = H * (0.2 + i * 0.26);
      const r = Math.min(W, H) * (0.52 + i * 0.1);
      if (!onScreen(cx, r)) continue;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(${hues[i]},0.055)`);
      g.addColorStop(1, `rgba(${hues[i]},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
  }

  function draw(context, v) {
    ctx = context;
    W = v.W; H = v.H; camX = v.camX; t = v.t; vel = v.vel;
    chaosNow = v.chaos; futureNow = v.future;
    dtNow = v.dt != null ? v.dt : 1 / 60;
    if (v.maxFling) V.maxFling = v.maxFling;
    const mode = v.mode || "void";

    ctx.globalAlpha = 1; ctx.lineWidth = 1;
    ctx.fillStyle = mode === "gamedev" ? "#070910" : "#0d1114";
    ctx.fillRect(0, 0, W, H);

    drawVoid();

    if (mode === "gamedev") {
      drawSectorGlow();
    } else {
      drawChaos();
      drawPresences();
      drawTendrils();
      drawFuture();
      drawWatcher();
      faded("bnote-watcher-redstar", drawRedStar);
      faded("bnote-bridge-nephilim", drawNephilim); faded("bnote-bridge-admin", drawAdminTear); faded("bnote-bridge-vikings", drawVikings);
      drawRex();
      drawBand(city.far, 0.30, "#161d21", 0.5);
      drawBand(city.mid, 0.46, "#182025", 0.78);
      drawCityNear();
      drawLandPlace("bnote-land-shattered", "shattered", SHATTERED); drawLandPlace("bnote-land-libertech", "libertech", LIBERTECH); drawLandPlace("bnote-land-dawn", "dawn", FIRST_DAWN); drawLandPlace("bnote-land-accord", "accord", DIVINE_ACCORD); drawLandPlace("bnote-land-gore", "gore", GORE_LEGION);
      drawRoot();
      drawFragments();
    }

    drawBridge();
  }

  return {
    SLOT, LAND, BOUNDS, DECK, VIEW_UNITS,
    chaosAt, futureAt, draw,
  };
})();
