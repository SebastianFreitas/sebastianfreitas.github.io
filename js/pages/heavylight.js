/* heavylight.js — the HeavyLight case page's toy: a small dark room of the game on the inline
   stage in "The rule" (Play.stage). The player stands between a wall lamp and a lamp on the
   pillar's face; a crate stands over a floor lamp. Click a lamp: its beam runs 2.5 s (the bridge
   beacon's beam: straight, 0.15 s fade in, 0.25 s fade out). In a beam the player slides along it
   and stops dead where it ends or a wall meets him; a crate's gravity is the beam's direction. */
(function () {
  'use strict';
  const U = window.Util, P = window.Play;
  if (!U || !P) return;

  const COLS = 18, ROWS = 9, PILLAR = 9;     // the room in tiles; the pillar column spans rows 2..7
  const ON_FOR = 2.5;
  const SPREAD = Math.tan(6 * Math.PI / 180);
  // the bridge beacon's beam recipe (zones.js BEAM/lampGlow)
  const CONE = '110,160,240', LAMP_GLOW = '170,215,240', GLOW_R = 26, GLOW_LIT = .28, GLOW_IDLE = .07, GLOW_HOVER = .14, FADE_IN = .15, FADE_OUT = .25, NUDGE = 2;
  const G = 3600;            // fall gravity, px/s^2 at the 48 px tile
  const SLIDE_TILES = 2;     // player speed along a beam, tiles/s (32 art px/s)
  const MAN_W = 8, MAN_H = 14, CRATE = 14;   // art px

  const { HPAL, HSPR } = window.HeavyLightSprites;

  const lamp_right = {w:12, h:15, ox:0, oy:1, px:'........cccc.....ccccccc.....cccccc......cccccc.....cccccccc...c..cccccc..c...........c...........c...........c...........c...........c...........c..g.......cccccc.....cccccccc....'};
  // a lamp set into a wall face: lamp_right's rows 0-6, cols 3-11 (the head, no post)
  const lamp_wall = (function () {
    const rows = [];
    for (let r = 0; r < 7; r++) rows.push(lamp_right.px.slice(r * 12 + 3, r * 12 + 12));
    return { w: 9, h: 7, ox: 0, oy: 1, px: rows.join('') };
  })();
  const lamp_up = {w:16, h:16, ox:0, oy:0, px:'..........cccccc..........cccccc..........cccccc..........cccccc.....ccccc.cccc.....c......ccc.....c.......cc.....c...............c...............c...............c...............c...............c...............c..g...........cccccc.........cccccccc........'};
  // a lamp set into a floor tile: lamp_up's rows 0-6, cols 10-15 (the head, no post)
  const lamp_floor = (function () {
    const rows = [];
    for (let r = 0; r < 7; r++) rows.push(lamp_up.px.slice(r * 16 + 10, r * 16 + 16));
    return { w: 6, h: 7, ox: 0, oy: 0, px: rows.join('') };
  })();
  const box_Box1 = {w:14, h:14, ox:1, oy:1, px:'ddc.c.cc.c.cdddccccccccccccdcccccccccccccc.ccdccddccdcc.ccccddddddcccc.cccd.dd.dccc.cccddd..dddccccccddd..dddccc.cccd.dd.dccc.ccccddddddcccc.ccdccddccdcc.ccccccccccccccdccccccccccccdddc.c.cc.c.cdd'};
  // the rider: a plain small figure in the game's blue-greys (no sprite for him in the sheet)
  const man = {w: MAN_W, h: MAN_H, ox: 0, oy: 0, px: [
    '..cccc..', '.cddddc.', '.cdkdkc.', '.cddddc.', '..cccc..', '.cdddde.', 'ccddddee',
    'cdddddde', 'cd.ee.ed', 'd..ee..d', '..cddc..', '..cddc..', '..cdec..', '.ccc.ccc'].join('')};

  let V = null, S = 3, T = 48, OX = 0, OY = 0, SPR = null, bg = null, sizedFor = '';
  let lamps = [], hover = null, stamp = 0, clicks = 0, pressed = false, painted = 0, ready = false;
  const m = { u: 3.5, moving: false };           // player x, tiles from the room's left edge
  const c = { u: 0, v: 0, g: 'down', moving: false };   // crate centre y, tiles from the room's top; v in tiles/s

  const floorTop = () => (ROWS - 1) * T;
  const crateRest = () => (ROWS - 1) - CRATE / 32;       // crate centre at rest on the floor, tiles
  const crateTop = () => 1 + CRATE / 32;                 // ... and against the ceiling

  function solid(cc, r) {
    if (cc < 0 || cc >= COLS || r < 0 || r >= ROWS) return true;
    return cc === 0 || cc === COLS - 1 || r === 0 || r === ROWS - 1 || (cc === PILLAR && r >= 2 && r <= ROWS - 2);
  }

  // pick the sheet's autotile face from the four cardinal air neighbours
  function ringTile(cc, r) {
    const n = !solid(cc, r - 1), e = !solid(cc + 1, r), s = !solid(cc, r + 1), w = !solid(cc - 1, r);
    if (n && e && w) return 'h_pillarTop';
    if (s && e && w) return 'h_pillarDrip';
    if (n && w) return 'h_floorL';
    if (n && e) return 'h_floorR';
    if (n && s) return 'h_plat';
    if (s && w) return 'h_dripL';
    if (s && e) return 'h_doubleFloor';
    if (e && w) return 'h_pillarBody';
    if (n) return 'h_floor1';
    if (s) return 'h_wallDrip';
    if (w) return 'h_wallL';
    if (e) return 'h_wallR';
    return 'h_wall';
  }

  function setup(v) {
    V = v;
    layout(v);
    ready = true;
  }

  // scale 3 when the room fits the plate, else 2; the room centred; rebuilt only when it changes
  function layout(v) {
    V = v;
    S = (COLS * 48 <= v.W && ROWS * 48 <= v.H) ? 3 : 2;
    T = 16 * S;
    OX = Math.round((v.W - COLS * T) / 2);
    OY = Math.round((v.H - ROWS * T) / 2);
    const sig = S + ':' + OX + ':' + OY;
    if (sig === sizedFor && lamps.length) return;
    sizedFor = sig;
    SPR = { wall: P.sprite(HPAL, lamp_wall, S), floor: P.sprite(HPAL, lamp_floor, S), box: P.sprite(HPAL, box_Box1, S), man: P.sprite(HPAL, man, S) };
    const by = floorTop() - 7 * S;               // beam height on the player's torso
    const fx = 13.5 * T;
    const old = lamps;
    lamps = [
      { id: 'left', spr: SPR.wall, flip: false, x: T - 9 * S, y: by - 3 * S, fx: T, fy: by, dx: 1, dy: 0, reach: (PILLAR - 1) * T },
      { id: 'right', spr: SPR.wall, flip: true, x: PILLAR * T, y: by - 3 * S, fx: PILLAR * T, fy: by, dx: -1, dy: 0, reach: (PILLAR - 1) * T },
      { id: 'floor', spr: SPR.floor, flip: false, x: fx - 3 * S, y: floorTop(), fx, fy: floorTop(), dx: 0, dy: -1, reach: floorTop() - T },
    ];
    lamps.forEach((l, i) => { l.t = old[i] ? old[i].t : 0; l.a = old[i] ? old[i].a : 0; l.stamp = old[i] ? old[i].stamp : 0; });
    if (!old.length) c.u = crateRest();
    buildBg();
  }

  // the room's tiles and lamp heads, drawn once per layout
  function buildBg() {
    bg = document.createElement('canvas');
    bg.width = COLS * T; bg.height = ROWS * T;
    const g = bg.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = HPAL[0];
    g.fillRect(0, 0, bg.width, bg.height);
    for (let r = 0; r < ROWS; r++) {
      for (let cc = 0; cc < COLS; cc++) {
        if (solid(cc, r)) P.blit(g, P.sprite(HPAL, HSPR[ringTile(cc, r)], S), cc * T, r * T, false);
      }
    }
    for (const l of lamps) P.blit(g, l.spr, l.x, l.y, l.flip);
  }

  // room px (x right, y down) -> is the point inside lamp l's beam wedge
  function inBeam(l, x, y) {
    const along = (x - l.fx) * l.dx + (y - l.fy) * l.dy;
    if (along < 0 || along > l.reach) return false;
    const perp = Math.abs(l.dx ? y - l.fy : x - l.fx);
    return perp <= 3 * S + along * SPREAD;
  }

  function step(dt) {
    for (const l of lamps) {
      if (l.t > 0) l.t = Math.max(0, l.t - dt);
      l.a = l.t > 0 ? Math.min(1, l.a + dt / FADE_IN) : Math.max(0, l.a - dt / FADE_OUT);
    }
    // the player: the newest horizontal beam on him moves him at one speed; none, or a wall: stop
    const my = floorTop() - 7 * S, mx = m.u * T;
    let on = null;
    for (const l of lamps) {
      if (l.t > 0 && l.dx && inBeam(l, mx, my) && (!on || l.stamp > on.stamp)) on = l;
    }
    const was = m.u;
    if (on) m.u = Math.min(PILLAR - MAN_W / 32, Math.max(1 + MAN_W / 32, m.u + on.dx * SLIDE_TILES * dt));
    m.moving = on !== null && m.u !== was;
    // the crate: gravity is the beam direction while it is in a vertical beam, else down
    const cx = 13.5 * T;
    let up = false;
    for (const l of lamps) if (l.t > 0 && l.dy && inBeam(l, cx, c.u * T)) up = l.dy < 0;
    c.g = up ? 'up' : 'down';
    c.v += (up ? -1 : 1) * (G / 48) * dt;
    c.u += c.v * dt;
    const lo = crateTop(), hi = crateRest();
    if (c.u <= lo) { c.u = lo; if (c.v < 0) c.v = 0; }
    if (c.u >= hi) { c.u = hi; if (c.v > 0) c.v = 0; }
    c.moving = c.v !== 0;
  }

  function atRest() {
    return !m.moving && !c.moving && lamps.every(l => l.t <= 0 && l.a <= 0);
  }

  // hit test the lamp under (x,y), stage px; a 56 px box at least
  function lampAt(x, y) {
    for (const l of lamps) {
      const bw = Math.max(56, l.spr.w), bh = Math.max(56, l.spr.h);
      const cx = OX + l.x + l.spr.w / 2, cy = OY + l.y + l.spr.h / 2;
      if (x >= cx - bw / 2 && x <= cx + bw / 2 && y >= cy - bh / 2 && y <= cy + bh / 2) return l;
    }
    return null;
  }

  function client(sx, sy) {
    const r = V.canvas.getBoundingClientRect(), k = r.width / V.W;
    return { x: r.left + sx * k, y: r.top + sy * k };
  }

  function press(x, y) {
    const l = lampAt(x, y);
    if (!l) return false;
    if (l.t > 0) return true;
    l.t = ON_FOR; l.stamp = ++stamp; clicks++;
    if (!pressed) {
      pressed = true;
      const p = client(OX + l.x + l.spr.w / 2, OY + l.y + l.spr.h / 2);
      P.award('play-heavylight', 'HeavyLight lamp', p.x, p.y);
    }
    return true;
  }

  function move(x, y) {
    const l = lampAt(x, y);
    const id = l ? l.id : null;
    V.cursor(!!l);
    if (id === hover) return false;
    hover = id;
  }

  // ---- paint ----
  function drawBeam(ctx, l) {
    if (l.a <= 0 || l.reach - NUDGE < 2) return;
    const sx = OX + l.fx + l.dx * NUDGE, sy = OY + l.fy + l.dy * NUDGE;
    const d = l.reach - NUDGE, h0 = 3 * S, h1 = h0 + d * SPREAD;
    const nx = -l.dy, ny = l.dx;
    const ca = 0.20 + 0.03 * Math.sin(V.t * 3.1);
    ctx.fillStyle = 'rgba(' + CONE + ',' + (ca * l.a).toFixed(3) + ')';
    ctx.beginPath();
    ctx.moveTo(sx + nx * h0, sy + ny * h0);
    ctx.lineTo(sx + l.dx * d + nx * h1, sy + l.dy * d + ny * h1);
    ctx.lineTo(sx + l.dx * d - nx * h1, sy + l.dy * d - ny * h1);
    ctx.lineTo(sx - nx * h0, sy - ny * h0);
    ctx.closePath();
    ctx.fill();
  }

  // the cream corner marks round a target, as on the Conclusus stage
  function bracket(ctx, l, t, r, b) {
    const L = 3 * S, Th = Math.max(1, Math.round(S / 2));
    ctx.fillStyle = '#f1ecd8';
    for (const [x, y, dx, dy] of [[l, t, 1, 1], [r, t, -1, 1], [l, b, 1, -1], [r, b, -1, -1]]) {
      ctx.fillRect(dx > 0 ? x : x - L, dy > 0 ? y : y - Th, L, Th);
      ctx.fillRect(dx > 0 ? x : x - Th, dy > 0 ? y : y - L, Th, L);
    }
  }

  function draw(ctx) {
    painted++;
    ctx.drawImage(bg, OX, OY);
    for (const l of lamps) drawBeam(ctx, l);
    P.blit(ctx, SPR.box, OX + 13.5 * T - CRATE * S / 2, OY + c.u * T - CRATE * S / 2, false);
    P.blit(ctx, SPR.man, OX + m.u * T - MAN_W * S / 2, OY + floorTop() - MAN_H * S, false);
    for (const l of lamps) {
      const base = hover === l.id ? GLOW_HOVER : GLOW_IDLE;
      P.glow(ctx, OX + l.fx + l.dx * NUDGE, OY + l.fy + l.dy * NUDGE, GLOW_R, LAMP_GLOW, base + (GLOW_LIT - base) * l.a);
    }
    if (!pressed) {
      const l = lamps[0], pad = 6 * S;
      bracket(ctx, OX + l.x - pad, OY + l.y - pad, OX + l.x + l.spr.w + pad, OY + l.y + l.spr.h + pad);
    }
    const left = Math.max(...lamps.map(l => l.t));
    V.status(left > 0 ? 'Beam ' + left.toFixed(1) + ' s' : 'Lamps off');
  }

  function report() {
    if (!V || !lamps.length) return null;
    return {
      ready, painted, clicks, marker: !pressed,
      lamps: lamps.map(l => {
        const p = client(OX + l.x + l.spr.w / 2, OY + l.y + l.spr.h / 2);
        return { id: l.id, on: l.t > 0, left: l.t, cx: p.x, cy: p.y };
      }),
      man: { x: OX + m.u * T, y: OY + floorTop(), moving: m.moving },
      crate: { x: OX + 13.5 * T, y: OY + c.u * T, g: c.g },
    };
  }

  P.register({ name: 'heavylight', seed: 5, setup, step, draw, resize: layout, atRest, press, move });
  window.PlayHeavyLight = { report };
})();
