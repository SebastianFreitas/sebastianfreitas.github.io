/* sector-zero.js — the case-page toy for Sector Zero: the room's loose
   objects float in the free strip beside the text, thunder rolls a strength
   on a timer and shoves the losers around, and a RealityTXT terminal card
   types out each object's record file on click. Palette and box() mirror
   js/gamedev/storm.js's flat lit/shade look; nothing is imported from it. */
(function () {
  'use strict';
  const U = window.Util, P = window.Play, R = window.ZeroRecords;
  if (!U || !P || !R) return;

  const PC = ['#a09e93', '#5f5e57'], DK = ['#4a4d4a', '#2b2d2b'], MUG = ['#c3c3bf', '#71716d'];
  const METAL = ['#8e939a', '#565a60'], STEEL = ['#6e7480', '#3e424a'], HANDLE = ['#8c3a30', '#55231d'];
  const ENEMY = ['#9a2a22', '#4a100c'], SCREEN = '#0a1a10', SHAFT = '#b9bcc0', DIE = '#3a3d42';
  const GREEN = '120,255,150', LAMP = '192,255,186';
  const SC = 1.3;   // object draw/hit-test scale, so objects read at a glance in the strip
  const CRATES = ['K7Q', 'A2X', 'M0D', 'R9T'];
  const HINT_DEFAULT = 'records · click an object';

  // flat fill: lit colour on the left 30%, shade colour on the right 70% (storm.js's look)
  function box(ctx, x, y, w, h, pair) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const lw = Math.round(w * 0.3);
    ctx.fillStyle = pair[0];
    ctx.fillRect(x, y, lw, h);
    ctx.fillStyle = pair[1];
    ctx.fillRect(x + lw, y, w - lw, h);
  }

  // mix two "r,g,b" colours (as arrays) by u, back out as a "r,g,b" string
  function mixRgb(a, b, u) {
    return Math.round(U.mix(a[0], b[0], u)) + ',' + Math.round(U.mix(a[1], b[1], u)) + ',' + Math.round(U.mix(a[2], b[2], u));
  }

  const DEFS = [
    { id: 'terminal', w: 56, h: 46, thunder: false },
    { id: 'chair', w: 34, h: 50, thunder: true },
    { id: 'bucket', w: 26, h: 28, thunder: false },
    { id: 'screwdriver', w: 36, h: 8, thunder: false },
    { id: 'lantern', w: 18, h: 30, thunder: true },
    { id: 'K7Q', w: 28, h: 28, thunder: true },
    { id: 'A2X', w: 28, h: 28, thunder: true },
    { id: 'M0D', w: 28, h: 28, thunder: true },
    { id: 'R9T', w: 28, h: 28, thunder: true },
    { id: 'switch', w: 14, h: 20, thunder: true },
  ];
  const OBJS = DEFS.map((d, i) => ({
    id: d.id, w: Math.round(d.w * SC), h: Math.round(d.h * SC), thunder: d.thunder,
    home: { x: 0, y: 0 }, x: 0, y: 0, vx: 0, vy: 0, ang: 0, va: 0,
    loose: false, enemy: false, ph: i * 1.7,
  }));
  const O = {};
  OBJS.forEach(o => { O[o.id] = o; });

  // DOM, created in setup()
  let card, pre, hint;
  let typing = null;   // {text, n, acc, done}, or null when the card is closed
  let hover = null;    // the object under the pointer, or null

  let light = true;    // the wall switch
  let bulb = 1;         // the lantern's own a*b*c brightness (kept apart from the switch)
  let glow = 0.5;       // the terminal screen's flicker level
  let buffLeft = 0;     // seconds left on the lantern's post-click steady buff
  let stripX0 = 0, stripX1 = 0;   // the free strip's bounds, kept for the screwdriver's flight target

  const storm = { phase: 'wait', next: 9, power: 0, t: 0, dur: 0, blink: 0, caught: 0 };
  const scr = { phase: 'idle', charge: 0, vx: 0, vy: 0, tx: 0, ty: 0, hold: 0, back: 0 };
  const flick = { nextBurst: 5, burstLeft: 0, burstOffset: 0 };
  const A = { timer: 2, dipLeft: 0, dipDur: 0, value: 1 };
  const B = { timer: 20, left: 0, value: 1 };
  const C = { phase: 'ramp', t: 0, dur: 3, value: 0.45, strobesLeft: 0 };

  // home layout: the objects sit in a grid in the free strip right of the text
  function place(V) {
    if (V.band.w >= 100) { stripX0 = V.band.x0 + 8; stripX1 = V.band.x1 - 8; }
    else { stripX0 = V.main.x + 660; stripX1 = V.W - 24; }
    const x0 = stripX0, x1 = stripX1;
    const cols = Math.max(1, Math.floor((x1 - x0) / 96));
    const cellW = (x1 - x0) / cols;
    const rows = Math.ceil(OBJS.length / cols);
    const rowH = Math.min(96, Math.max(60, (V.H - V.top - 90) / rows));
    for (let i = 0; i < OBJS.length; i++) {
      const o = OBJS[i];
      const col = i % cols, row = Math.floor(i / cols);
      o.home.x = x0 + cellW * (col + 0.5);
      o.home.y = V.top + 60 + rowH * row + (row % 2 ? 6 : 0);
      o.x = o.home.x; o.y = o.home.y;
      o.vx = 0; o.vy = 0; o.ang = 0; o.va = 0; o.loose = false;
    }
  }

  // ---- thunder: wait -> storm -> snap -> wait ----

  function rollThunder(V) {
    const d100 = () => 1 + Math.floor(V.rnd() * 100);
    storm.power = Math.min(d100(), d100());
    const caughtList = [];
    let lowest = null, lowestRoll = 101;
    for (let i = 0; i < OBJS.length; i++) {
      const o = OBJS[i];
      if (!o.thunder) continue;
      const roll = d100();
      if (roll <= storm.power) caughtList.push(o);
      if (roll < lowestRoll) { lowestRoll = roll; lowest = o; }
    }
    if (caughtList.length === 0 && lowest) caughtList.push(lowest);
    storm.caught = caughtList.length;
    const enemyObj = caughtList[Math.floor(V.rnd() * caughtList.length)];
    for (let i = 0; i < caughtList.length; i++) {
      const o = caughtList[i];
      if (o === enemyObj) {
        o.enemy = true;
      } else {
        o.loose = true;
        o.vx = (V.rnd() * 2 - 1) * 220 * storm.power / 100;
        o.vy = -(40 + V.rnd() * 20) * 2.2 * storm.power / 100;
        o.va = (V.rnd() * 2 - 1) * (90 * Math.PI / 180) * storm.power / 100;
      }
    }
    storm.dur = U.mix(1, 5, storm.power / 100) * (0.8 + V.rnd() * 0.4);
    storm.phase = 'storm';
    storm.t = 0;
    hint.textContent = 'thunder · power ' + storm.power + ' · ' + storm.caught + ' caught';
  }

  function bounce(o, V) {
    const hw = o.w / 2, hh = o.h / 2;
    if (o.x - hw < 4) { o.x = 4 + hw; o.vx = -o.vx * 0.6; }
    else if (o.x + hw > V.W - 4) { o.x = V.W - 4 - hw; o.vx = -o.vx * 0.6; }
    if (o.y - hh < V.top + 4) { o.y = V.top + 4 + hh; o.vy = -o.vy * 0.6; }
    else if (o.y + hh > V.H - 4) { o.y = V.H - 4 - hh; o.vy = -o.vy * 0.6; }
  }

  // push o out of any overlapping page block along the axis of least penetration;
  // reflect the velocity on that axis too, unless it's the enemy creeping (no shove)
  function pushBlocks(o, V, reflect) {
    const hw = o.w / 2, hh = o.h / 2;
    for (let i = 0; i < V.vis.length; i++) {
      const b = V.vis[i];
      const ox1 = o.x - hw, ox2 = o.x + hw, oy1 = o.y - hh, oy2 = o.y + hh;
      if (ox1 >= b.x + b.w || ox2 <= b.x || oy1 >= b.y + b.h || oy2 <= b.y) continue;
      const pl = ox2 - b.x, pr = b.x + b.w - ox1, pu = oy2 - b.y, pd = b.y + b.h - oy1;
      const m = Math.min(pl, pr, pu, pd);
      if (m === pl) { o.x -= pl; if (reflect) o.vx = -o.vx * 0.5; }
      else if (m === pr) { o.x += pr; if (reflect) o.vx = -o.vx * 0.5; }
      else if (m === pu) { o.y -= pu; if (reflect) o.vy = -o.vy * 0.5; }
      else { o.y += pd; if (reflect) o.vy = -o.vy * 0.5; }
    }
  }

  function stepStorm(dt, V) {
    storm.t += dt;
    const damp = 1 - 0.02 * dt;
    for (let i = 0; i < OBJS.length; i++) {
      const o = OBJS[i];
      if (o.loose) {
        o.x += o.vx * dt; o.y += o.vy * dt; o.ang += o.va * dt;
        o.vx *= damp; o.vy *= damp; o.va *= damp;
        bounce(o, V);
        pushBlocks(o, V, true);
      } else if (o.enemy) {
        if (V.pointer.has) {
          const dx = V.pointer.x - o.x, dy = V.pointer.y - o.y;
          const d = Math.hypot(dx, dy);
          if (d > 0.01) { o.x += dx / d * 20 * dt; o.y += dy / d * 20 * dt; }
        }
        pushBlocks(o, V, false);
      }
    }
    if (storm.t >= storm.dur) { storm.phase = 'snap'; storm.t = 0; }
  }

  function stepSnap(dt, V) {
    const t0 = storm.t;
    storm.t += dt;
    for (let i = 0; i < OBJS.length; i++) {
      const o = OBJS[i];
      if (!o.loose && !o.enemy) continue;
      const ax = 30 * (o.home.x - o.x) - 11 * o.vx;
      const ay = 30 * (o.home.y - o.y) - 11 * o.vy;
      o.vx += ax * dt; o.x += o.vx * dt;
      o.vy += ay * dt; o.y += o.vy * dt;
      o.ang = U.approach(o.ang, 0, 6, dt);
      if (Math.hypot(o.home.x - o.x, o.home.y - o.y) < 2) {
        o.x = o.home.x; o.y = o.home.y; o.vx = 0; o.vy = 0; o.loose = false;
      }
    }
    // t crossing 1.9 this frame: blink once and teleport everything home
    if (t0 < 1.9 && storm.t >= 1.9) {
      storm.blink = 0.5;
      for (let i = 0; i < OBJS.length; i++) {
        const o = OBJS[i];
        o.loose = false; o.enemy = false; o.ang = 0;
        o.x = o.home.x; o.y = o.home.y; o.vx = 0; o.vy = 0;
      }
    }
    if (storm.t >= 2.4) {
      storm.phase = 'wait';
      storm.next = U.mix(40, 12, storm.power / 100);
      hint.textContent = HINT_DEFAULT;
    }
  }

  // ---- terminal screen flicker ----

  function updateGlow(dt, V) {
    const noise = U.vnoise(V.t * 0.7, 3) * 2 - 1;
    let base = 0.5 + (Math.sin(V.t * 1.0) + noise) / 2 * 0.5;
    flick.nextBurst -= dt;
    if (flick.nextBurst <= 0) {
      flick.burstLeft = 0.1 + V.rnd() * 0.2;
      flick.burstOffset = (V.rnd() < 0.5 ? -1 : 1) * (0.5 + V.rnd() * 0.5);
      flick.nextBurst = 5 + V.rnd() * 5;
    }
    if (flick.burstLeft > 0) {
      flick.burstLeft -= dt;
      base += flick.burstOffset;
    }
    glow = U.clamp(base, 0, 2);
  }

  // ---- lantern: three multiplied flicker layers ----

  function stepA(dt, V) {
    if (A.dipLeft > 0) {
      A.dipLeft -= dt;
      const u = 1 - Math.max(0, A.dipLeft) / A.dipDur;
      A.value = u < 0.5 ? U.mix(1, 0.15, u / 0.5) : U.mix(0.15, 1, (u - 0.5) / 0.5);
      if (A.dipLeft <= 0) { A.value = 1; A.timer = 2 + V.rnd() * 4; }
    } else {
      A.timer -= dt;
      if (A.timer <= 0) { A.dipDur = 0.1 + V.rnd() * 0.4; A.dipLeft = A.dipDur; }
    }
  }

  function stepB(dt, V) {
    if (B.left > 0) {
      B.left -= dt;
      const elapsed = 0.5 - Math.max(0, B.left);
      B.value = Math.floor(elapsed / 0.1) % 2 === 0 ? 0 : 1;
      if (B.left <= 0) { B.value = 1; B.timer = 20 + V.rnd() * 20; }
    } else {
      B.timer -= dt;
      if (B.timer <= 0) B.left = 0.5;
    }
  }

  function stepC(dt, V) {
    C.t += dt;
    if (C.phase === 'ramp') {
      C.value = U.mix(0.45, 1, Math.min(1, C.t / C.dur));
      if (C.t >= C.dur) { C.phase = 'hold'; C.t = 0; C.dur = 3 + V.rnd() * 7; C.value = 1; }
    } else if (C.phase === 'hold') {
      C.value = 1;
      if (C.t >= C.dur) { C.phase = 'strobe'; C.t = 0; C.strobesLeft = 1 + Math.floor(V.rnd() * 4); }
    } else {
      if (C.t >= 0.1) {
        C.t -= 0.1;
        C.value = C.value === 1 ? 0.35 : 1;
        C.strobesLeft--;
        if (C.strobesLeft <= 0) { C.phase = 'ramp'; C.t = 0; C.dur = 3 + V.rnd() * 7; C.value = 0.45; }
      }
    }
  }

  function updateLight(dt, V) {
    stepA(dt, V); stepB(dt, V); stepC(dt, V);
    if (buffLeft > 0) {
      buffLeft -= dt;
      bulb = 1.3;
    } else {
      bulb = A.value * B.value * C.value;
    }
  }

  function lanternClick(V) {
    if (V.rnd() < 0.5) buffLeft = 5 + V.rnd() * 5;
    else B.left = 0.5;
  }

  // ---- screwdriver: click, shake and glow, throw to the strip's corner, return home ----

  function startFlight(V) {
    const o = O.screwdriver;
    const tx = stripX0 + 20, ty = V.top + 20;
    const dx = tx - o.home.x, dy = ty - o.home.y;
    const d = Math.hypot(dx, dy) || 1;
    scr.vx = dx / d * 900;
    scr.vy = dy / d * 900;
    scr.tx = tx; scr.ty = ty;
    scr.phase = 'toStrip';
  }

  function updateScrewdriver(dt, V) {
    const o = O.screwdriver;
    if (scr.phase === 'charge') {
      scr.charge += dt;
      const u = Math.min(scr.charge / 3, 1);
      o.ang = Math.sin(V.t * 60) * u * (10 * Math.PI / 180);
      if (scr.charge >= 3) startFlight(V);
    } else if (scr.phase === 'toStrip') {
      o.x += scr.vx * dt; o.y += scr.vy * dt;
      o.ang += (30 * Math.PI / 180) * dt;
      if (o.x <= scr.tx) o.x = scr.tx;
      if (o.y <= scr.ty) o.y = scr.ty;
      if (o.x <= scr.tx && o.y <= scr.ty) { scr.vx = 0; scr.vy = 0; scr.phase = 'hold'; scr.hold = 0; o.ang = 0; }
    } else if (scr.phase === 'hold') {
      scr.hold += dt;
      if (scr.hold >= 2) { scr.phase = 'toHome'; scr.back = 0; }
    } else if (scr.phase === 'toHome') {
      scr.back += dt;
      const dx = o.home.x - o.x, dy = o.home.y - o.y;
      const d = Math.hypot(dx, dy);
      if (d < 5 || scr.back >= 3) { o.x = o.home.x; o.y = o.home.y; o.ang = 0; scr.phase = 'idle'; }
      else { o.x += dx / d * 1500 * dt; o.y += dy / d * 1500 * dt; }
    }
  }

  // ---- chair: click sets it spinning, decaying while it isn't loose ----

  function updateChair(dt) {
    const c = O.chair;
    if (!c.loose) {
      c.ang += c.va * dt;
      c.va *= (1 - 1.5 * dt);
    }
  }

  // ---- record card typing ----

  function updateTyping(dt, V) {
    if (!typing) return;
    typing.acc += dt;
    while (typing.acc >= 0.03 && typing.n < typing.text.length) {
      typing.n++;
      typing.acc -= 0.03;
    }
    typing.done = typing.n === typing.text.length;
    const blinkOn = Math.floor(V.t / 0.5) % 2 === 0;
    pre.textContent = typing.text.slice(0, typing.n) + ((blinkOn || !typing.done) ? '_' : ' ');
  }

  function show(id, x, y) {
    const text = R.RECORDS[id].join('\n');
    typing = { text, n: 0, acc: 0, done: false };
    card.hidden = false;
    hint.style.bottom = (card.offsetHeight + 24) + 'px';
    P.award('play-zero', 'Sector Zero records', x, y);
    hint.hidden = true;
  }

  // ---- input ----

  function special(o, V) {
    if (o.id === 'screwdriver') {
      if (scr.phase === 'idle') { scr.phase = 'charge'; scr.charge = 0; }
    } else if (o.id === 'chair') {
      o.va += 400 * Math.PI / 180;
    } else if (o.id === 'lantern') {
      lanternClick(V);
    } else if (o.id === 'switch') {
      light = !light;
    }
  }

  function hitTest(px, py) {
    for (let i = OBJS.length - 1; i >= 0; i--) {
      const o = OBJS[i];
      const hw = o.w / 2 + 6, hh = o.h / 2 + 6;
      if (px >= o.x - hw && px <= o.x + hw && py >= o.y - hh && py <= o.y + hh) return o;
    }
    return null;
  }

  function press(x, y, V) {
    const o = hitTest(x, y);
    if (!o) return false;
    special(o, V);
    show(o.id, x, y);
    return true;
  }

  function move(x, y, V) {
    const hovered = hitTest(x, y);
    V.cursor && V.cursor(hovered !== null);
  }

  function atRest(V) {
    return storm.phase === 'wait' && storm.blink <= 0 &&
      !(typing && !typing.done) && !hover &&
      scr.phase === 'idle' && Math.abs(O.chair.va) < 0.02;
  }

  // ---- per-frame ----

  function step(dt, V) {
    updateGlow(dt, V);
    updateLight(dt, V);
    updateScrewdriver(dt, V);
    updateChair(dt);
    updateTyping(dt, V);

    if (storm.blink > 0) storm.blink -= dt;

    if (storm.phase === 'wait') {
      storm.next -= dt;
      if (storm.next <= 0) rollThunder(V);
    } else if (storm.phase === 'storm') {
      stepStorm(dt, V);
    } else if (storm.phase === 'snap') {
      stepSnap(dt, V);
    }

    for (let i = 0; i < OBJS.length; i++) {
      const o = OBJS[i];
      if (o.loose || o.enemy || o.id === 'terminal') continue;
      if (o.id === 'screwdriver' && scr.phase !== 'idle') continue;
      o.x = o.home.x + Math.sin(V.t * 0.5 + o.ph) * 3;
      o.y = o.home.y + Math.cos(V.t * 0.37 + o.ph * 1.3) * 4;
    }

    hover = V.pointer.has ? hitTest(V.pointer.x, V.pointer.y) : null;
  }

  // ---- drawing: bodies are drawn relative to (0,0), the wrapper below translates/rotates ----

  function drawTerminalBody(ctx, o, V) {
    box(ctx, -28, -23, 56, 46, PC);
    const sx = -24, sy = -19, sw = 48, sh = 30;
    ctx.fillStyle = SCREEN;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = 'rgba(120,255,150,' + (0.12 + 0.5 * glow) + ')';
    ctx.fillRect(sx + 4, sy + 4, sw - 8, 2);
    ctx.fillRect(sx + 4, sy + 10, sw - 8, 2);
    ctx.fillRect(sx + 4, sy + 16, sw - 8, 2);
    ctx.fillRect(sx + 4, sy + sh - 6, 3, 2);
    ctx.fillRect(sx + 8, sy + sh - 6, 3, 2);
    if (Math.floor(V.t / 0.5) % 2 === 0) ctx.fillRect(sx + 13, sy + sh - 7, 4, 7);
    box(ctx, -10, 23, 20, 4, DK);
  }

  function drawChairBody(ctx, o) {
    const pair = o.enemy ? ENEMY : DK;
    box(ctx, -13, -25, 26, 22, pair);
    box(ctx, -15, -3, 30, 8, pair);
    box(ctx, -2, 5, 4, 12, STEEL);
    box(ctx, -15, 17, 30, 4, STEEL);
    box(ctx, -13, 21, 4, 3, DIE);
    box(ctx, -2, 21, 4, 3, DIE);
    box(ctx, 9, 21, 4, 3, DIE);
  }

  function drawBucketBody(ctx) {
    box(ctx, -13, -14, 26, 10, METAL);
    box(ctx, -11, -4, 22, 18, METAL);
    box(ctx, -12, -20, 2, 6, STEEL);
    box(ctx, 10, -20, 2, 6, STEEL);
    box(ctx, -5, -18, 10, 8, PC);
  }

  function drawScrewdriverBody(ctx) {
    box(ctx, -18, -4, 14, 8, HANDLE);
    box(ctx, -4, -2, 20, 4, SHAFT);
    box(ctx, 16, -1, 2, 2, DIE);
  }

  function drawLanternBody(ctx, o) {
    box(ctx, -9, -15, 18, 30, o.enemy ? ENEMY : DK);
    ctx.fillStyle = 'rgba(192,255,186,' + (0.25 + 0.6 * bulb) + ')';
    ctx.fillRect(-5, -7, 10, 14);
    box(ctx, -4, -18, 8, 3, METAL);
  }

  function drawCrateBody(ctx, o) {
    box(ctx, -14, -14, 28, 28, o.enemy ? ENEMY : METAL);
  }

  function drawSwitchBody(ctx, o) {
    box(ctx, -7, -10, 14, 20, o.enemy ? ENEMY : MUG);
    box(ctx, -3, light ? -8 : 2, 6, 8, DK);
  }

  const DRAW = {
    terminal: drawTerminalBody, chair: drawChairBody, bucket: drawBucketBody,
    screwdriver: drawScrewdriverBody, lantern: drawLanternBody, switch: drawSwitchBody,
  };

  function drawObj(ctx, o, V) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.ang);
    ctx.scale(SC, SC);
    if (CRATES.indexOf(o.id) !== -1) drawCrateBody(ctx, o);
    else DRAW[o.id](ctx, o, V);

    // crates are drawn upright even while the box spins: undo the rotation before the text
    if (CRATES.indexOf(o.id) !== -1) {
      ctx.rotate(-o.ang);
      ctx.fillStyle = DIE;
      ctx.font = '600 9px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(o.id, 0, 0);
    }
    ctx.restore();

    if (o.id === 'screwdriver' && scr.phase === 'charge') {
      const u = Math.min(scr.charge, 3) / 3;
      P.glow(ctx, o.x, o.y, 10 + 14 * u, mixRgb([230, 212, 58], [217, 43, 43], u), 0.35 * u);
    }
    if (o.enemy) P.glow(ctx, o.x, o.y, 26 * SC, '217,43,43', 0.25);
  }

  function draw(ctx, V) {
    const boost = light ? 1 : 1.6;
    P.glow(ctx, O.terminal.x, O.terminal.y, 40 * SC, GREEN, 0.16 * glow * boost);
    P.glow(ctx, O.lantern.x, O.lantern.y, (24 + 40 * bulb) * SC, LAMP, 0.32 * bulb * boost);

    for (let i = 0; i < OBJS.length; i++) {
      const o = OBJS[i];
      ctx.save();
      ctx.globalAlpha = (!light && o.id !== 'terminal' && o.id !== 'lantern' && !o.enemy) ? 0.4 : 1;
      drawObj(ctx, o, V);
      ctx.restore();
    }

    if (hover) P.glow(ctx, hover.x, hover.y, hover.w, GREEN, 0.10);

    if (storm.blink > 0) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, V.W, V.H); }
  }

  // ---- setup / report / mount ----

  function setup(V) {
    card = document.createElement('aside');
    card.className = 'play-ui record';
    card.hidden = true;
    card.innerHTML = '<h3>RealityTXT</h3><pre></pre><button class="minor" type="button">logout</button>';
    document.body.appendChild(card);
    pre = card.querySelector('pre');
    pre.style.cssText = 'margin:0;font:inherit;white-space:pre-wrap;min-height:6em';
    card.querySelector('button').addEventListener('click', () => { card.hidden = true; typing = null; hint.style.bottom = ''; });

    hint = document.createElement('p');
    hint.className = 'play-hint';
    hint.textContent = HINT_DEFAULT;
    document.body.appendChild(hint);

    place(V);

    flick.nextBurst = 5 + V.rnd() * 5;
    A.timer = 2 + V.rnd() * 4;
    B.timer = 20 + V.rnd() * 20;
    C.dur = 3 + V.rnd() * 7;
  }

  function report() {
    const enemyObj = OBJS.filter(o => o.enemy)[0];
    return {
      phase: storm.phase,
      power: storm.power,
      caught: storm.caught,
      enemy: enemyObj ? enemyObj.id : null,
      light,
      typing: !!(typing && !typing.done),
    };
  }

  const H = P.start({ name: 'zero', seed: 29, setup, step, draw, atRest, press, move, resize: place });

  function thunder() {
    if (H) rollThunder(H.V);
  }

  window.PlayZero = { report, thunder };
})();
