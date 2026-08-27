/* ===========================================================
   WORLD — the geography of Arcanis, and how it is drawn.

   Everything here is scenery: where things are, what they look
   like, and nothing about the camera, the pointer, the beacons
   or the HUD. Those live in bridge.js.

   One entry point:

     World.draw(ctx, {
       W, H, camX, t, vel, maxFling, chaos, future
     })

   plus World.LAND / SLOT / BOUNDS / DECK for anyone who needs to
   place something against the map, and World.chaosAt / futureAt
   for the ambience the camera eases toward.
   =========================================================== */

window.World = (function () {

  const VIEW_UNITS = 2100;     // world units across the viewport

  /* ---- the small maths this file needs, kept local so world.js
          stands on its own ---- */
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
  const fmt = n => Math.round(n).toLocaleString("en-US");


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

  /* value noise, so a range is stable and seamless at any zoom */
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

  /* near band is biggest and darkest; the ones behind are smaller,
     higher and paler, which is what makes the joins disappear */
  const REX_BANDS = [
    // furthest back: highest and climbs hardest, so it leaves the frame first
    { par: 0.50, seed: 1201, amp: 0.055, base: 0.34, drift: 0.16, rampAt: 0.60, climb: 2.4, cell: 2600,
      fill: ["#39485a", "#26313d"], edge: "rgba(178,204,214,0.30)" },
    { par: 0.59, seed: 3307, amp: 0.075, base: 0.20, drift: 0.13, rampAt: 0.70, climb: 2.1, cell: 1900,
      fill: ["#2b3742", "#1c242d"], edge: "rgba(172,198,208,0.38)" },
    // nearest: lowest and slowest, so the two behind stay visible over it
    { par: 0.68, seed: 5501, amp: 0.095, base: 0.06, drift: 0.10, rampAt: 0.80, climb: 1.8, cell: 1400,
      fill: ["#233039", "#2a2320"], edge: "rgba(186,208,214,0.55)" },
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

  /* what stands on the surface plateau — west of the climb-out,
     so it never reads as furniture between underground and hell */
  const REX_SURF_SPAN = REX_END - REX_FROM;
  const REX_SURF_LO   = REX_FROM + REX_SURF_SPAN * 0.12; // past the entry rise
  const REX_SURF_HI   = REX_FROM + REX_SURF_SPAN * 0.62; // before rampAt (~0.80)
  const rexProps = { wrecks: [], castle: null, kingdom: null };
  (function buildRex() {
    const r = mulberry(77341);
    for (let i = 0; i < 34; i++)
      rexProps.wrecks.push({ x: REX_SURF_LO + r() * (REX_SURF_HI - REX_SURF_LO),
                             w: 90 + r() * 460, h: 12 + r() * 54,
                             tilt: (r() - 0.5) * 0.55, mast: r() < 0.4 });
    // mountains with the uncleared castle — mid-surface, on top of Rex
    rexProps.castle = { x: LAND.rex - SLOT * 2.8, blocks: [] };
    for (let i = 0; i < 8; i++)
      rexProps.castle.blocks.push({ dx: (i - 3.5) * 44, w: 24 + r() * 32, h: 44 + r() * 104 });
    // nocturnals further east, still on the surface — not into the climb
    rexProps.kingdom = { x: LAND.rex - SLOT * 0.9, towers: [] };
    for (let i = 0; i < 16; i++)
      rexProps.kingdom.towers.push({ dx: (i - 8) * 58, w: 12 + r() * 24,
                                     h: 26 + r() * 96, lit: r() < 0.55 });
  })();

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

      // one dim core, fading with the body — nothing that changes shape
      const cg = ctx.createRadialGradient(x, y, 0, x, y, bw * 0.28);
      cg.addColorStop(0, `rgba(150,72,64,${0.16 * p.seen})`);
      cg.addColorStop(1, "rgba(150,72,64,0)");
      ctx.fillStyle = cg;
      ctx.fillRect(x - bw * 0.3, y - bh * 0.3, bw * 0.6, bh * 0.6);
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
    const sc = scale();
    const bottom = H * 1.3;
    const toWorld = (px, par) => camX + (px - W * 0.5) / (par * sc);

    let nearPath = null, nearPts = null;

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

      const g = ctx.createLinearGradient(0, H * 0.05, 0, bottom);
      g.addColorStop(0, b.fill[0]); g.addColorStop(1, b.fill[1]);
      ctx.fillStyle = g; ctx.fill(path);

      if (bi === REX_BANDS.length - 1) { nearPath = path; nearPts = pts; }
      else {
        ctx.strokeStyle = b.edge; ctx.lineWidth = 1.2;
        strokeSkyline(pts);
      }
    }

    /* everything below is inside the nearest mass */
    if (nearPath) {
      ctx.save();
      ctx.clip(nearPath);
      rexInterior(sc, bottom);
      ctx.restore();

      ctx.strokeStyle = REX_BANDS[2].edge; ctx.lineWidth = 1.5;
      strokeSkyline(nearPts);
      ctx.lineWidth = 1;

      rexSurface(sc);
    }

    drawHell(bottom);
  }

  /* ---- hell runs unbroken from its threshold into the Root ------
     Drawn outside the mass clip, or the last stretch before the Root
     falls outside the polygon and reads as void.
  --------------------------------------------------------- */
  function drawHell(bottom) {
    const par = REX_BANDS[2].par;
    const hx = wx(HELL_AT, par);
    const rx = wx(LAND.root, 0.70);
    if (hx > W + 60) return;

    const x0 = Math.max(hx, -160);
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.4);

    const rg = ctx.createLinearGradient(hx, 0, hx + Math.max(120, (rx - hx) * 0.6), 0);
    rg.addColorStop(0, "rgba(60,10,10,0)");
    rg.addColorStop(0.30, `rgba(96,18,16,${0.55 + 0.08 * pulse})`);
    rg.addColorStop(1, `rgba(132,26,22,${0.92})`);
    ctx.fillStyle = rg;
    ctx.fillRect(x0, 0, W - x0 + 160, H + 60);

    // hotter toward the floor
    const dg = ctx.createLinearGradient(0, 0, 0, bottom);
    dg.addColorStop(0, "rgba(0,0,0,0.55)");
    dg.addColorStop(0.55, "rgba(0,0,0,0.12)");
    dg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = dg;
    ctx.fillRect(x0, 0, W - x0 + 160, H + 60);

    for (let i = 0; i < 34; i++) {
      const u = hash1(i * 401), span = Math.max(90, W - x0);
      const ex = x0 + ((u * span + t * (18 + u * 40)) % span);
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

  function strokeSkyline(pts) {
    ctx.beginPath();
    let drawing = false;
    for (const p of pts) {
      if (p[1] < -30) { drawing = false; continue; }
      drawing ? ctx.lineTo(p[0], p[1]) : (ctx.moveTo(p[0], p[1]), drawing = true);
    }
    ctx.stroke();
  }

  /* ---- what the rock looks like once you're in it -------------
     Without this the underground is a flat fill and reads as void,
     which is exactly how it looked.
  --------------------------------------------------------- */
  function rexInterior(sc, bottom) {
    const nb = REX_BANDS[2], par = nb.par;

    // bedding planes, sagging the way strata do
    ctx.lineWidth = 1;
    for (let i = 0; i < 16; i++) {
      const y0 = H * (0.16 + i * 0.075);
      const off = camX * par * sc * 0.06;
      ctx.strokeStyle = `rgba(150,168,180,${0.05 + 0.03 * (i % 3)})`;
      ctx.beginPath();
      for (let px = -40; px <= W + 40; px += 26) {
        const y = y0 + Math.sin((px + off) * 0.004 + i) * 12 + Math.sin((px + off) * 0.011 + i * 2) * 5;
        px === -40 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
      }
      ctx.stroke();
    }

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

  /* ---- what stands on the surface, while there is one ----
     Only while the silhouette still reads as a ground top. Once it
     has climbed out of the frame it is a cliff into the underground,
     and props there looked like they sat between under and hell.
  --------------------------------------------------------- */
  function rexSurface(sc) {
    // tall / light band (far), not the near floor of the cutaway
    const nb = REX_BANDS[0], par = nb.par;
    const surfY = worldX => H * 1.06 - rexHeight(worldX, nb) * H;
    // upper silhouette only — never deep between under and hell
    const onTop = y => y > H * 0.04 && y < H * 0.58;
    if (camX > REX_SURF_HI + SLOT * 0.4) return;

    for (const wr of rexProps.wrecks) {
      const px = wx(wr.x, par);
      if (!onScreen(px, 280)) continue;
      const y = surfY(wr.x);
      if (!onTop(y)) continue;
      const ww = wr.w * sc * par, wh = wr.h * sc * par;
      ctx.save(); ctx.translate(px, y); ctx.rotate(wr.tilt);
      ctx.fillStyle = "#0b1014"; ctx.fillRect(-ww / 2, -wh, ww, wh);
      ctx.fillStyle = "rgba(143,176,184,0.2)"; ctx.fillRect(-ww / 2, -wh, ww, 1.2);
      if (wr.mast) ctx.fillRect(-ww * 0.12, -wh * 2.4, Math.max(1, ww * 0.04), wh * 1.4);
      ctx.restore();
    }

    const cas = rexProps.castle, cxp = wx(cas.x, par);
    if (onScreen(cxp, 460)) {
      const base = surfY(cas.x);
      if (onTop(base)) for (const b2 of cas.blocks) {
        const bx = cxp + b2.dx * sc * par;
        const bw = b2.w * sc * par, bh = b2.h * sc * par;
        ctx.fillStyle = "#161f26"; ctx.fillRect(bx, base - bh, bw, bh);
        ctx.strokeStyle = "rgba(176,104,90,0.45)";
        ctx.strokeRect(bx + 0.5, base - bh + 0.5, Math.max(1, bw - 1), bh - 1);
      }
    }

    const kg = rexProps.kingdom, kxp = wx(kg.x, par);
    if (onScreen(kxp, 560)) {
      for (const tw of kg.towers) {
        const bx = kxp + tw.dx * sc * par;
        if (!onScreen(bx, 40)) continue;
        const base = surfY(kg.x + tw.dx);
        if (!onTop(base)) continue;
        const bw = tw.w * sc * par, bh = tw.h * sc * par;
        ctx.fillStyle = "#0f171d"; ctx.fillRect(bx, base - bh, bw, bh);
        if (tw.lit) {
          ctx.fillStyle = `rgba(126,168,214,${0.35 + 0.3 * Math.sin(t * 1.4 + tw.dx)})`;
          ctx.fillRect(bx + bw * 0.25, base - bh * 0.78, Math.max(1, bw * 0.5), 2);
        }
      }
    }
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

    // you feel it before you see it
    const halo = ctx.createLinearGradient(face - 560, 0, face + 40, 0);
    halo.addColorStop(0, "rgba(120,22,26,0)");
    halo.addColorStop(1, `rgba(150,30,32,${0.12 + 0.07 * breath})`);
    ctx.fillStyle = halo;
    ctx.fillRect(face - 560, 0, 600, H);

    // and past the line there is nothing to look at
    const cx = Math.max(face, -80);
    const body = ctx.createLinearGradient(cx, 0, cx + 520, 0);
    body.addColorStop(0, "#5c1114");
    body.addColorStop(0.45, "#3a0b0f");
    body.addColorStop(1, "#1d060a");
    ctx.fillStyle = body;
    ctx.fillRect(cx, 0, W - cx + 80, H);

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

    const gl = ctx.createLinearGradient(0, deckY - 90, 0, deckY + 40);
    gl.addColorStop(0, "rgba(245,208,107,0)");
    gl.addColorStop(0.78, "rgba(245,208,107,0.055)");
    gl.addColorStop(1, "rgba(245,208,107,0)");
    ctx.fillStyle = gl; ctx.fillRect(0, deckY - 90, W, 130);

    const first = Math.floor((camX - VIEW_UNITS) / BAY) - 1;
    const last  = Math.ceil((camX + VIEW_UNITS) / BAY) + 1;

    const lg = ctx.createLinearGradient(0, deckY, 0, legBot);
    lg.addColorStop(0, "rgba(150,168,178,0.62)");
    lg.addColorStop(0.28, "rgba(112,130,140,0.30)");
    lg.addColorStop(0.72, "rgba(86,102,112,0.08)");
    lg.addColorStop(1, "rgba(70,84,92,0)");
    ctx.fillStyle = lg;
    for (let b = first; b <= last; b++) {
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
      const x = wx(b * BAY, par);
      if (!onScreen(x, bayPx + 20)) continue;
      ctx.fillRect(x, deckY - 1.6, bayPx + 1, 2.4);
    }
  }

  /* ---- the view, set once per frame ---- */
  let ctx, W = 0, H = 0, camX = 0, t = 0, vel = 0;
  let chaosNow = 0, futureNow = 0;
  const V = { maxFling: 46000 };

  const scale = () => W / VIEW_UNITS;
  const wx = (worldX, par) => (worldX - camX) * par * scale() + W * 0.5;
  const onScreen = (x, pad) => x > -pad && x < W + pad;

  function draw(context, v) {
    ctx = context;
    W = v.W; H = v.H; camX = v.camX; t = v.t; vel = v.vel;
    chaosNow = v.chaos; futureNow = v.future;
    if (v.maxFling) V.maxFling = v.maxFling;

    ctx.globalAlpha = 1; ctx.lineWidth = 1;
    ctx.fillStyle = "#0d1114"; ctx.fillRect(0, 0, W, H);

    drawVoid();
    drawChaos();
    drawPresences();
    drawTendrils();
    drawFuture();
    drawWatcher();
    drawRex();
    drawBand(city.far, 0.30, "#161d21", 0.5);
    drawBand(city.mid, 0.46, "#182025", 0.78);
    drawCityNear();
    drawRoot();
    drawFragments();
    drawBridge();
  }

  return {
    SLOT, LAND, BOUNDS, DECK, VIEW_UNITS,
    chaosAt, futureAt, draw,
  };
})();
