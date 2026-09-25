/* heavylight.js — the HeavyLight case page toy: four wall lamps in the four
   corners of the viewport. Click one and it switches on for 8 s, its light a
   long wedge running along that edge; anything inside the wedge is carried
   along it, exactly like the game's beams set a body's velocity. Six crates
   and the small red investigator start on the floor and can be sent all the
   way round the screen with all four lamps lit. */
(function () {
  'use strict';
  const U = window.Util, P = window.Play;
  if (!U || !P) return;

  const S = 3;                        // art scale, passed to Play.sprite
  const G = 1100, VMAX = 700;          // gravity px/s², terminal
  const RIDE = 320, BEAM_ACC = 1000;   // in-beam speed cap and acceleration along the beam
  const PERP_DAMP = 6, FLOOR_FRICTION = 5, BOUNCE = 0.25;
  const ON_FOR = 8;                    // seconds a lamp stays on (the game's lamps run 2–18 s)
  const HALF0 = 20, HALF1 = 40;        // wedge half-width at the lamp and at the far end
  const BEAM = 'rgba(0,43,255,0.20)', CORE = 'rgba(140,180,255,0.12)', GLOW = '110,160,240';

  // ---- pixel art (HeavyLight palette) ----
  const HPAL = ['#04253c', '#143f5e', '#306082', '#5a86a5', '#2d546f', '#961a1a', '#ff0000', '#b44545', '#780b0b', '#5a0e0e', '#000000'];

  const lamp_right = {w:12, h:15, ox:0, oy:1, px:'........cccc.....ccccccc.....cccccc......cccccc.....cccccccc...c..cccccc..c...........c...........c...........c...........c...........c...........c..g.......cccccc.....cccccccc....'};
  const lamp_up = {w:16, h:16, ox:0, oy:0, px:'..........cccccc..........cccccc..........cccccc..........cccccc.....ccccc.cccc.....c......ccc.....c.......cc.....c...............c...............c...............c...............c...............c...............c..g...........cccccc.........cccccccc........'};
  const lamp_streetlamp4 = {w:16, h:16, ox:0, oy:0, px:'...........c..c............ccc............ccccc..........ccccccc.....ccccccccccc....c.....cccccc...c..............c...............c...............c...............c...............c...............c...............c..g...........cccccc.........cccccccc........'};
  const box_Box1 = {w:14, h:14, ox:1, oy:1, px:'ddc.c.cc.c.cdddccccccccccccdcccccccccccccc.ccdccddccdcc.ccccddddddcccc.cccd.dd.dccc.cccddd..dddccccccddd..dddccc.cccd.dd.dccc.ccccddddddcccc.ccdccddccdcc.ccccccccccccccdccccccccccccdddc.c.cc.c.cdd'};
  const idle1 = {w:6, h:13, ox:5, oy:3, px:'..fhh...fhh...fhh....j...fffiff.ffiff.ffiff.jjjfh.ffih..f.i...f.i...f.i...j.j.'};
  const idle2 = {w:6, h:13, ox:5, oy:3, px:'..fhh...fhh...fhh....j...fffiff.ffiff.ffiff.jjjf.hffih..f.i...f.i...f.i...j.j.'};
  const idle3 = {w:5, h:13, ox:6, oy:3, px:'.fhh..fhh..fhh...j..fffiffffiffffiffjjjfhffih.f.i..f.i..f.i..j.j.'};

  // ---- state ----
  let SPR = null;                     // built once in setup, from the defs above
  let lamps = [];                     // [{on, left}] x4, index order BL BR TR TL
  let bodies = [];                    // crates + the investigator
  let hover = -1, first = true, anim = 0;
  let hint = null;
  const Gm = {};                      // geometry cache, rebuilt on every geom() call

  // a 56x56 click box centred on a w x h sprite whose top-left is (x, y)
  function cbox(x, y, w, h) {
    return [x + w / 2 - 28, y + h / 2 - 28, 56, 56];
  }

  // does box [x, y, w, h] contain point (px, py)?
  function hit(b, px, py) {
    return px >= b[0] && px < b[0] + b[2] && py >= b[1] && py < b[1] + b[3];
  }

  // ---- geometry ----
  // lamp positions and beams for the current viewport; cached on Gm
  function geom(V) {
    const W = V.W, H = V.H, top = V.top;
    const floorY = H - 6, ceilY = top + 10, leftX = 4, rightX = W - 4;
    const rw = lamp_right.w * S, rh = lamp_right.h * S;                 // 36x45
    const uw = lamp_up.w * S, uh = lamp_up.h * S;                       // 48x48
    const dw = lamp_streetlamp4.w * S, dh = lamp_streetlamp4.h * S;     // 48x48
    const lamps4 = [
      { // BL — pushes right along the floor
        spr: SPR.right, x: 8, y: floorY - 45, flip: false,
        ox: 20, oy: floorY - 22, dx: 1, dy: 0, len: W - 60,
        box: cbox(8, floorY - 45, rw, rh),
      },
      { // BR — lifts up the right edge
        spr: SPR.up, x: W - 56, y: floorY - 48, flip: false,
        ox: W - 30, oy: floorY - 12, dx: 0, dy: -1, len: (floorY - 12) - (ceilY + 40),
        box: cbox(W - 56, floorY - 48, uw, uh),
      },
      { // TR — carries left along the ceiling
        spr: SPR.right, x: W - 44, y: ceilY + 2, flip: true,
        ox: W - 20, oy: ceilY + 22, dx: -1, dy: 0, len: W - 60,
        box: cbox(W - 44, ceilY + 2, rw, rh),
      },
      { // TL — drops down the left edge
        spr: SPR.down, x: 8, y: ceilY + 2, flip: false,
        ox: 30, oy: ceilY + 12, dx: 0, dy: 1, len: (floorY - 40) - (ceilY + 12),
        box: cbox(8, ceilY + 2, dw, dh),
      },
    ];
    Gm.W = W; Gm.H = H; Gm.floorY = floorY; Gm.ceilY = ceilY;
    Gm.leftX = leftX; Gm.rightX = rightX; Gm.lamps = lamps4;
    return Gm;
  }

  // is (cx, cy) inside lamp L's wedge?
  function inBeam(L, cx, cy) {
    const ax = cx - L.ox, ay = cy - L.oy;
    const along = ax * L.dx + ay * L.dy;
    const perp = ax * (-L.dy) + ay * L.dx;
    return along >= 0 && along <= L.len && Math.abs(perp) <= U.mix(HALF0, HALF1, along / L.len);
  }

  // ---- setup ----
  function setup(V) {
    SPR = {
      right: P.sprite(HPAL, lamp_right, S),
      up: P.sprite(HPAL, lamp_up, S),
      down: P.sprite(HPAL, lamp_streetlamp4, S),
      box: P.sprite(HPAL, box_Box1, S),
      idle: [idle1, idle2, idle3].map(d => P.sprite(HPAL, d, S)),
    };
    const g = geom(V);

    lamps = [{ on: false, left: 0 }, { on: false, left: 0 }, { on: false, left: 0 }, { on: false, left: 0 }];

    bodies = [];
    for (let i = 0; i < 6; i++) {
      bodies.push({ x: 120 + i * 48, y: g.floorY - 42, w: 42, h: 42, vx: 0, vy: 0, kind: 'crate', face: 1, onFloor: false });
    }
    bodies.push({ x: 80, y: g.floorY - 39, w: 18, h: 39, vx: 0, vy: 0, kind: 'man', face: 1, onFloor: false });

    hover = -1;
    first = true;
    anim = 0;

    hint = document.createElement('p');
    hint.className = 'play-hint';
    hint.textContent = 'lamps · click one';
    hint.style.right = '5rem';
    document.body.appendChild(hint);
  }

  // ---- per-frame ----
  function step(dt, V) {
    const g = geom(V);
    anim += dt;

    for (let i = 0; i < lamps.length; i++) {
      const s = lamps[i];
      if (s.on) { s.left -= dt; if (s.left <= 0) { s.on = false; s.left = 0; } }
    }

    // physics in two sub-steps, so a fast beam ride doesn't tunnel past bounds
    const h = dt / 2;
    for (let sub = 0; sub < 2; sub++) {
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
        let L = null, perpPos = 0, bestRemain = -1;
        for (let j = 0; j < g.lamps.length; j++) {
          const Lj = g.lamps[j];
          if (!lamps[j].on || !inBeam(Lj, cx, cy)) continue;
          const ax = cx - Lj.ox, ay = cy - Lj.oy;
          const remain = Lj.len - (ax * Lj.dx + ay * Lj.dy);
          if (remain > bestRemain) { bestRemain = remain; L = Lj; perpPos = ax * (-Lj.dy) + ay * Lj.dx; }
        }
        if (L) {
          let along = b.vx * L.dx + b.vy * L.dy;
          let perp = b.vx * (-L.dy) + b.vy * L.dx;
          along = Math.min(RIDE, along + BEAM_ACC * h);
          perp = perp * Math.max(0, 1 - PERP_DAMP * h) - perpPos * 25 * h;
          b.vx = along * L.dx + perp * (-L.dy);
          b.vy = along * L.dy + perp * L.dx;
        } else {
          b.vy = Math.min(VMAX, b.vy + G * h);
          if (b.onFloor) b.vx *= Math.max(0, 1 - FLOOR_FRICTION * h);
        }
        b.x += b.vx * h;
        b.y += b.vy * h;
        if (b.x < g.leftX && b.vx <= 0) { b.x = g.leftX; b.vx = -b.vx * BOUNCE; }
        if (b.x + b.w > g.rightX && b.vx >= 0) { b.x = g.rightX - b.w; b.vx = -b.vx * BOUNCE; }
        if (b.y < g.ceilY && b.vy <= 0) { b.y = g.ceilY; b.vy = -b.vy * BOUNCE; }
        b.onFloor = false;
        if (b.y + b.h >= g.floorY && b.vy >= 0) {
          b.y = g.floorY - b.h;
          b.vy = b.vy > 40 ? -b.vy * BOUNCE : 0;
          b.onFloor = true;
        }
        b.x = U.clamp(b.x, g.leftX, g.rightX - b.w);
        b.y = U.clamp(b.y, g.ceilY, g.floorY - b.h);
        if (Math.abs(b.vx) < 1) b.vx = 0;
        if (b.vx > 8) b.face = 1; else if (b.vx < -8) b.face = -1;
      }
      // resolve every body-body overlap once per sub-step
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          const a = bodies[i], b = bodies[j];
          const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          if (ox <= 0 || oy <= 0) continue;
          if (ox < oy) {
            const move = ox / 2, avg = (a.vx + b.vx) / 2;
            if (a.x < b.x) { a.x -= move; b.x += move; } else { a.x += move; b.x -= move; }
            a.vx = avg; b.vx = avg;
          } else {
            const move = oy / 2, avg = (a.vy + b.vy) / 2;
            const upper = a.y < b.y ? a : b;
            const wasFalling = upper.vy > 0;
            if (a.y < b.y) { a.y -= move; b.y += move; } else { a.y += move; b.y -= move; }
            a.vy = avg; b.vy = avg;
            if (wasFalling) upper.onFloor = true;
          }
        }
      }
    }

    hover = -1;
    if (V.pointer.has) {
      for (let i = 0; i < g.lamps.length; i++) {
        if (hit(g.lamps[i].box, V.pointer.x, V.pointer.y)) { hover = i; break; }
      }
    }
  }

  // ---- input ----
  function press(x, y, V) {
    const g = geom(V);
    let idx = -1;
    for (let i = 0; i < g.lamps.length; i++) {
      if (hit(g.lamps[i].box, x, y)) { idx = i; break; }
    }
    if (idx === -1) return false;
    const s = lamps[idx];
    if (s.on) { s.on = false; s.left = 0; } else { s.on = true; s.left = ON_FOR; }
    if (first) {
      first = false;
      hint.hidden = true;
      P.award('play-heavylight', 'HeavyLight lamps', x, y);
    }
    return true;
  }

  function move(x, y, V) {
    const g = geom(V);
    hover = -1;
    for (let i = 0; i < g.lamps.length; i++) {
      if (hit(g.lamps[i].box, x, y)) { hover = i; break; }
    }
    V.cursor && V.cursor(hover !== -1);
  }

  function atRest(V) {
    if (hover !== -1) return false;
    for (let i = 0; i < lamps.length; i++) if (lamps[i].on) return false;
    for (let i = 0; i < bodies.length; i++) if (bodies[i].vx !== 0 || bodies[i].vy !== 0) return false;
    return true;
  }

  // ---- draw ----
  // fill lamp L's wedge from its origin to its far end, half-widths h0 at the
  // origin and h1 at the far end
  function wedge(ctx, L, h0, h1, color) {
    const nx = -L.dy, ny = L.dx;
    const ex = L.ox + L.dx * L.len, ey = L.oy + L.dy * L.len;
    ctx.beginPath();
    ctx.moveTo(L.ox + nx * h0, L.oy + ny * h0);
    ctx.lineTo(ex + nx * h1, ey + ny * h1);
    ctx.lineTo(ex - nx * h1, ey - ny * h1);
    ctx.lineTo(L.ox - nx * h0, L.oy - ny * h0);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function draw(ctx, V) {
    const g = geom(V);

    // beams, brightest fading to nothing over each lamp's last second on
    for (let i = 0; i < lamps.length; i++) {
      const s = lamps[i];
      if (!s.on) continue;
      const L = g.lamps[i];
      ctx.globalAlpha = Math.min(1, s.left / 1);
      wedge(ctx, L, HALF0, HALF1, BEAM);
      wedge(ctx, L, HALF0 * 0.35, HALF1 * 0.35, CORE);
      ctx.globalAlpha = 1;
    }

    // the TR and TL lamps stand on a bracket
    const brTR = [g.W - 52, g.ceilY + 47, 48, 2];
    const brTL = [4, g.ceilY + 50, 52, 2];
    ctx.fillStyle = '#306082';
    ctx.fillRect(brTR[0], brTR[1], brTR[2], brTR[3]);
    ctx.fillRect(brTL[0], brTL[1], brTL[2], brTL[3]);

    for (let i = 0; i < g.lamps.length; i++) {
      const L = g.lamps[i], s = lamps[i];
      if (s.on) P.glow(ctx, L.ox, L.oy, 30, GLOW, 0.45);
      else if (hover === i) P.glow(ctx, L.ox, L.oy, 24, GLOW, 0.14);
      P.blit(ctx, L.spr, L.x, L.y, L.flip);
      if (s.on) {
        const len = 30 * s.left / ON_FOR;
        ctx.fillStyle = '#5a86a5';
        if (i === 0 || i === 1) ctx.fillRect(L.x, L.y - 2, len, 2);          // above the sprite
        else if (i === 2) ctx.fillRect(brTR[0], brTR[1] + brTR[3], len, 2);  // below the bracket
        else ctx.fillRect(brTL[0], brTL[1] + brTL[3], len, 2);              // below the bracket
      }
    }

    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (b.kind === 'crate') {
        P.blit(ctx, SPR.box, b.x, b.y);
      } else {
        const k = ((Math.floor(anim / 0.45) % 4) + 4) % 4;
        const f = SPR.idle[[0, 1, 2, 1][k]];
        P.blit(ctx, f, b.x + (b.w - f.w) / 2, b.y + b.h - f.h, b.face < 0);
      }
    }
  }

  function resize(V) {
    const g = geom(V);
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      b.x = U.clamp(b.x, g.leftX, g.rightX - b.w);
      b.y = U.clamp(b.y, g.ceilY, g.floorY - b.h);
    }
  }

  function report() {
    return {
      lamps: lamps.map(s => ({ on: s.on, left: s.left })),
      bodies: bodies.map(b => ({
        kind: b.kind,
        x: Math.round(b.x * 10) / 10,
        y: Math.round(b.y * 10) / 10,
        vx: Math.round(b.vx * 10) / 10,
        vy: Math.round(b.vy * 10) / 10,
      })),
      moving: bodies.filter(b => b.vx !== 0 || b.vy !== 0).length,
    };
  }

  const H = P.start({ name: 'heavylight', seed: 11, setup, step, draw, atRest, press, move, resize });
  window.PlayHeavyLight = { report };
})();
