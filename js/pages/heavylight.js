/* heavylight.js — the HeavyLight case page toy. Phase 1: the frame. Four
   L-shaped tile masses own the viewport corners, three tile shelves sit in
   the gutter beside the hero, the Lamps clip and the journal, crates rest on
   them and the lamps stand on the shelves, off. Later phases light them. */
(function () {
  'use strict';
  const U = window.Util, P = window.Play;
  if (!U || !P) return;

  const S = 3;                 // art scale
  const ART = 16, T = ART * S; // tile art px, tile screen px (48)
  const ARM = 6, DEEP = 2;     // corner mass: tiles along each edge, tiles deep
  const SHELF_TILES = 5, SHELF_MIN = 2, SHELF_GAP = 40, SHELF_LIFT = 4, EDGE = 24;
  const CW = 42;               // crate size (14 art px)
  const CULL = 120;
  const BEAM = 'rgba(0,43,255,.20)', CORE = 'rgba(140,180,255,.12)', SHADE = 'rgba(4,21,34,.6)';
  const HALF0 = 20, SPREAD = Math.tan(6 * Math.PI / 180), OVER = 24, ON_FOR = 8;
  let VV = null;

  // ---- pixel art (HeavyLight palette) ----
  const HPAL = ['#04253c', '#143f5e', '#306082', '#5a86a5', '#2d546f', '#961a1a', '#ff0000', '#b44545', '#780b0b', '#5a0e0e', '#000000'];

  const lamp_right = {w:12, h:15, ox:0, oy:1, px:'........cccc.....ccccccc.....cccccc......cccccc.....cccccccc...c..cccccc..c...........c...........c...........c...........c...........c...........c..g.......cccccc.....cccccccc....'};
  const lamp_up = {w:16, h:16, ox:0, oy:0, px:'..........cccccc..........cccccc..........cccccc..........cccccc.....ccccc.cccc.....c......ccc.....c.......cc.....c...............c...............c...............c...............c...............c...............c..g...........cccccc.........cccccccc........'};
  const lamp_streetlamp4 = {w:16, h:16, ox:0, oy:0, px:'...........c..c............ccc............ccccc..........ccccccc.....ccccccccccc....c.....cccccc...c..............c...............c...............c...............c...............c...............c...............c..g...........cccccc.........cccccccc........'};
  const box_Box1 = {w:14, h:14, ox:1, oy:1, px:'ddc.c.cc.c.cdddccccccccccccdcccccccccccccc.ccdccddccdcc.ccccddddddcccc.cccd.dd.dccc.cccddd..dddccccccddd..dddccc.cccd.dd.dccc.ccccddddddcccc.ccdccddccdcc.ccccccccccccccdccccccccccccdddc.c.cc.c.cdd'};

  // ---- tile set (local copy of the game's autotile recipe) ----
  const C = { D:'#04253c', O:'#143f5e', M:'#306082', L:'#5a86a5', BK:'#041522', BS:'#0a2335' };
  const PRI = { D:0, O:1, M:2, L:3 };
  const FLAT = ['L','M','O'];                                  // top/bottom rim by depth 0..2
  const SIDE = [['L','L','M','M','O'], ['L','M','M','M','O'], [null,'L','M','O','O']]; // by u%3, depth 0..4
  const NUB = [[0,0,'L'],[1,0,'L'],[2,0,'L'],[0,1,'L'],[0,2,'L'],[3,0,'M'],[0,3,'M'],[1,1,'M'],[4,0,'O'],[0,4,'O'],[2,1,'O'],[1,2,'O'],[5,0,'O'],[0,5,'O']];
  const INNER = [[16,1,0],[32,1,1],[64,0,1],[128,0,0]];        // [bit, flipX, flipY]
  const tiles = new Map();
  let back = null;

  function tileCanvas(m, v) {
    const key = m * 4 + v;
    let cv = tiles.get(key);
    if (cv) return cv;
    const px = new Array(256).fill('D');
    for (let i = 0; i < 256; i++) {
      if (U.hash1(v * 4099 + i) < 0.035) px[i] = 'O';
    }
    function put(x, y, c) {
      const i = y * 16 + x;
      if (c === null) { px[i] = null; return; }
      if (px[i] === null) return;
      if (PRI[c] > PRI[px[i]]) px[i] = c;
    }
    for (let u = 0; u < 16; u++) {
      if (m & 1) for (let d = 0; d <= 2; d++) put(u, d, FLAT[d]);
      if (m & 4) for (let d = 0; d <= 2; d++) put(u, 15 - d, FLAT[d]);
      if (m & 2) for (let d = 0; d <= 4; d++) put(15 - d, u, SIDE[u % 3][d]);
      if (m & 8) for (let d = 0; d <= 4; d++) put(d, u, SIDE[u % 3][d]);
    }
    if ((m & 1) && (m & 2)) px[0 * 16 + 15] = null;
    if ((m & 2) && (m & 4)) px[15 * 16 + 15] = null;
    if ((m & 4) && (m & 8)) px[15 * 16 + 0] = null;
    if ((m & 8) && (m & 1)) px[0] = null;
    for (const [bit, fx, fy] of INNER) {
      if (m & bit) {
        for (const [dx, dy, c] of NUB) {
          put(fx ? 15 - dx : dx, fy ? 15 - dy : dy, c);
        }
      }
    }
    cv = document.createElement('canvas');
    cv.width = ART; cv.height = ART;
    const ctx = cv.getContext('2d');
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const c = px[y * 16 + x];
        if (c === null) continue;
        ctx.fillStyle = C[c];
        ctx.fillRect(x, y, 1, 1);
      }
    }
    tiles.set(key, cv);
    return cv;
  }

  function backCanvas() {
    if (back) return back;
    const cv = document.createElement('canvas');
    cv.width = ART; cv.height = ART;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = C.BK;
    ctx.fillRect(0, 0, ART, ART);
    for (let i = 0; i < 256; i++) {
      const h = U.hash1(7919 + i + 555);
      const left = i % 16 > 0 && U.hash1(7919 + (i - 1) + 555) < 0.05;
      if (h < 0.05 || (h < 0.12 && left)) {
        ctx.fillStyle = C.BS;
        ctx.fillRect(i % 16, Math.floor(i / 16), 1, 1);
      }
    }
    back = cv;
    return back;
  }

  function drawTile(ctx, m, v, x, y) {
    x = Math.round(x); y = Math.round(y);
    if (m !== 0) ctx.drawImage(backCanvas(), x, y, T, T);
    ctx.drawImage(tileCanvas(m, v), x, y, T, T);
  }

  function maskOf(solid, i, j) {
    const n = solid(i, j - 1), e = solid(i + 1, j), s = solid(i, j + 1), w = solid(i - 1, j);
    let m = (n ? 0 : 1) | (e ? 0 : 2) | (s ? 0 : 4) | (w ? 0 : 8);
    if (n && e && !solid(i + 1, j - 1)) m |= 16;
    if (s && e && !solid(i + 1, j + 1)) m |= 32;
    if (s && w && !solid(i - 1, j + 1)) m |= 64;
    if (n && w && !solid(i - 1, j - 1)) m |= 128;
    return m;
  }

  // ---- state ----
  let SPR = null;
  let masses = [];   // [{fx,fy,cells:[{i,j,m,v}]}] viewport-fixed corner Ls
  let shelves = [];  // [{k,x,y,w,tiles,target,cells:[{m,v}],lamps:[{kind,x,y}],crates:[{x,y}]}] document space
  let sig = '';

  // ---- scripted lamp/crate events ----
  const G = 1800;   // fall gravity, px/s^2
  const E = {
    lin: u => u,
    in: u => u * u,
    out: u => 1 - (1 - u) * (1 - u),
    inout: u => u * u * (3 - 2 * u),
  };
  function towerOrder(s) {
    const crates = s.crates;
    const maxHy = Math.max(...crates.map(c => c.hy));
    const bottomRow = crates.map((c, i) => i).filter(i => crates[i].hy === maxHy);
    let base = bottomRow[0];
    for (const i of bottomRow) if (crates[i].hx > crates[base].hx) base = i;
    const rest = crates.map((c, i) => i).filter(i => i !== base);
    rest.sort((a, b) => crates[a].hy - crates[b].hy || crates[b].hx - crates[a].hx);
    return [base, rest[0], rest[1]];
  }
  const EVENTS = [
    { k: 0, lamps: [[0, 0, 2.0]], moves: [
      { c: 0, t0: 0.3, t1: 1.4, to: s => ({ x: s.x + s.w, y: s.y - CW }), ex: 'in', ey: 'lin', fall: { vx: 280, vy: 0 } },
    ] },
    { k: 1, lamps: [[1, 0, 1.4], [0, 1.4, 2.9]], moves: [
      { c: 1, t0: 0.3, t1: 1.4, to: (s, c) => ({ x: c.hx - 1.5 * CW, y: c.hy - 3 * CW }), ex: 'out', ey: 'out' },
      { c: 1, t0: 1.5, t1: 2.7, to: (s, c) => ({ x: c.hx, y: c.hy }), ex: 'inout', ey: 'in' },
    ] },
    { k: 2, lamps: [[1, 0, 0.6], [0, 0.6, 1.2], [2, 1.2, 1.8], [1, 1.8, 2.4], [0, 2.4, 3.0], [2, 3.0, 3.6], [0, 4.2, 5.4]], moves: [
      { c: s => towerOrder(s)[0], t0: 0.1, t1: 0.6, to: s => ({ x: s.crates[towerOrder(s)[0]].hx, y: s.y - CW }), ex: 'inout', ey: 'inout' },
      { c: s => towerOrder(s)[1], t0: 0.6, t1: 1.8, to: s => ({ x: s.crates[towerOrder(s)[0]].hx, y: s.y - 2 * CW }), ex: 'inout', ey: 'inout', lift: 1.5 * CW },
      { c: s => towerOrder(s)[2], t0: 2.4, t1: 3.6, to: s => ({ x: s.crates[towerOrder(s)[0]].hx, y: s.y - 3 * CW }), ex: 'inout', ey: 'inout', lift: 1.5 * CW },
      { c: s => towerOrder(s)[2], t0: 4.3, t1: 4.3, to: (s, c) => ({ x: c.x, y: c.y }), ex: 'lin', ey: 'lin', fall: { vx: 360, vy: -120 } },
      { c: s => towerOrder(s)[1], t0: 4.3, t1: 4.3, to: (s, c) => ({ x: c.x, y: c.y }), ex: 'lin', ey: 'lin', fall: { vx: 300, vy: -60 } },
      { c: s => towerOrder(s)[0], t0: 4.3, t1: 4.3, to: (s, c) => ({ x: c.x, y: c.y }), ex: 'lin', ey: 'lin', fall: { vx: 240, vy: 0 } },
    ] },
  ];
  let evs = [{ state: 'idle', t: 0 }, { state: 'idle', t: 0 }, { state: 'idle', t: 0 }];

  function setup(V) {
    VV = V;
    SPR = { right: P.sprite(HPAL, lamp_right, S), up: P.sprite(HPAL, lamp_up, S), down: P.sprite(HPAL, lamp_streetlamp4, S), box: P.sprite(HPAL, box_Box1, S) };
    buildMasses();
    layout(V);
  }

  // ---- corner masses ----
  function lShape(i, j) {
    if (i < 0 || j < 0) return true;
    return (i < ARM && j < DEEP) || (i < DEEP && j < ARM);
  }

  function mirror(m, fx, fy) {
    let out = m;
    if (fx) {
      out = (out & ~(2 | 8 | 16 | 128)) | ((m & 2) ? 8 : 0) | ((m & 8) ? 2 : 0) | ((m & 16) ? 128 : 0) | ((m & 128) ? 16 : 0);
    }
    m = out;
    if (fy) {
      out = (out & ~(1 | 4 | 16 | 32 | 128 | 64)) | ((m & 1) ? 4 : 0) | ((m & 4) ? 1 : 0) | ((m & 16) ? 32 : 0) | ((m & 32) ? 16 : 0) | ((m & 128) ? 64 : 0) | ((m & 64) ? 128 : 0);
    }
    return out;
  }

  function buildMasses() {
    masses = [];
    for (let c = 0; c < 4; c++) {
      const fx = c & 1, fy = c >> 1;
      const cells = [];
      for (let j = 0; j < ARM; j++) {
        for (let i = 0; i < ARM; i++) {
          if (!lShape(i, j)) continue;
          let m = maskOf(lShape, i, j);
          m = mirror(m, fx, fy);
          const v = Math.floor(U.hash1(c * 97 + i * 13 + j * 7 + 1) * 3);
          cells.push({ i, j, m, v });
        }
      }
      masses.push({ fx, fy, cells });
    }
  }

  function drawMasses(ctx, V) {
    for (const mass of masses) {
      for (const cell of mass.cells) {
        const x = mass.fx ? V.W - (cell.i + 1) * T : cell.i * T;
        const y = mass.fy ? V.H - (cell.j + 1) * T : cell.j * T;
        drawTile(ctx, cell.m, cell.v, x, y);
      }
    }
  }

  // ---- shelves, crates, lamps ----
  const TARGETS = ['.embed-shell', 'video[src*="lamps"]', 'img[src*="journal"]'];
  const LAMPS = [ [['right','left']], [['right','left'],['up','right']], [['right','left'],['up','right'],['down','under']] ];

  function sigOf(V) {
    return V.blocks.length + '/' + V.docH + '/' + V.main.w + '/' + V.W + '/' + V.H;
  }

  function findBlock(V, k, used) {
    for (const b of V.blocks) {
      if (b.el && b.el.matches && b.el.matches(TARGETS[k])) return b;
    }
    for (const b of V.blocks) {
      if (b.media && used.indexOf(b) === -1) return b;
    }
    return null;
  }

  function layout(V) {
    sig = sigOf(V);
    const savedOn = {};
    for (const s of shelves) {
      for (let i = 0; i < s.lamps.length; i++) savedOn[s.k + ':' + i] = s.lamps[i].on;
    }
    shelves = [];
    const used = [];
    for (let k = 0; k < 3; k++) {
      const b = findBlock(V, k, used);
      if (!b) continue;
      used.push(b);
      const x = b.x + b.w + SHELF_GAP;
      const avail = V.W - EDGE - x;
      const tiles = Math.min(SHELF_TILES, Math.floor(avail / T));
      if (tiles < SHELF_MIN) continue;
      const w = tiles * T;
      const y = b.y + b.h - SHELF_LIFT - T;
      const cells = [];
      for (let i = 0; i < tiles; i++) {
        const m = 1 | 4 | (i === 0 ? 8 : 0) | (i === tiles - 1 ? 2 : 0);
        const v = Math.floor(U.hash1(k * 131 + i * 17 + 3) * 3);
        cells.push({ m, v });
      }
      const lamps = [];
      let hasLeft = false, hasRight = false;
      for (const [kind, mount] of LAMPS[k]) {
        const spr = SPR[kind];
        if (mount === 'left') { lamps.push({ kind, x: x + 3, y: y - spr.h }); hasLeft = true; }
        else if (mount === 'right') { lamps.push({ kind, x: x + w - spr.w - 3, y: y - spr.h }); hasRight = true; }
        else if (mount === 'under') { lamps.push({ kind, x: x + 3, y: y + T }); }
      }
      for (let i = 0; i < lamps.length; i++) lamps[i].on = savedOn[k + ':' + i] || 0;
      const crates = [];
      const count = k + 1;
      const x0 = x + (hasLeft ? SPR.right.w + 12 : 6);
      const xEnd = x + w - (hasRight ? SPR.up.w + 9 : 6);
      const perRow = Math.max(1, Math.floor((xEnd - x0 + 6) / (CW + 6)));
      for (let i = 0; i < count; i++) {
        const cx = x0 + (i % perRow) * (CW + 6), cy = y - CW * (1 + Math.floor(i / perRow));
        crates.push({ x: cx, y: cy, hx: cx, hy: cy, mode: 'rest' });
      }
      shelves.push({ k, x, y, w, tiles, target: TARGETS[k], cells, lamps, crates });
    }
    // relayout: scripted crates are back home, so a running/finishing event is done
    for (let k = 0; k < evs.length; k++) {
      const e = evs[k];
      if (e.state !== 'run' && e.state !== 'end') continue;
      e.state = 'done';
      const s = shelves.find(sh => sh.k === k);
      if (k === 2 && s) {
        const c = s.crates[towerOrder(s)[0]];
        if (c) P.award('play-heavylight-tower', 'HeavyLight tower', c.hx + CW / 2, c.hy - V.sy + CW / 2);
      }
    }
  }

  function drawShelves(ctx, V) {
    const oy = -V.sy;
    for (const shelf of shelves) {
      if (shelf.y + oy < -CULL || shelf.y + oy > V.H + CULL) continue;
      for (let i = 0; i < shelf.cells.length; i++) {
        const cell = shelf.cells[i];
        drawTile(ctx, cell.m, cell.v, shelf.x + i * T, shelf.y + oy);
      }
      for (const l of shelf.lamps) {
        P.blit(ctx, SPR[l.kind], l.x, l.y + oy, false);
      }
    }
    // crates draw unculled by shelf position: a scripted crate can be off its shelf mid-event
    for (const shelf of shelves) {
      for (const c of shelf.crates) {
        if (c.mode === 'gone') continue;
        P.blit(ctx, SPR.box, c.x, c.y + oy, false);
      }
    }
  }

  // ---- beams, shadows ----
  function face(l, oy) {
    if (l.kind === 'right') return { x: l.x + SPR.right.w, y: l.y + 15 + oy, dx: 1, dy: 0 };
    if (l.kind === 'up') return { x: l.x + SPR.up.w / 2, y: l.y + oy, dx: 0, dy: -1 };
    return { x: l.x + SPR.down.w / 2, y: l.y + SPR.down.h + oy, dx: 0, dy: 1 };
  }

  function wedge(l, V) {
    const o = face(l, -V.sy);
    let d;
    if (l.kind === 'right') d = V.W + OVER - o.x;
    else if (l.kind === 'up') d = o.y + OVER;
    else d = V.H + OVER - o.y;
    if (d < OVER) d = OVER;
    const h1 = HALF0 + d * SPREAD;
    const nx = -o.dy, ny = o.dx;
    return [
      [o.x + nx * HALF0, o.y + ny * HALF0],
      [o.x + o.dx * d + nx * h1, o.y + o.dy * d + ny * h1],
      [o.x + o.dx * d - nx * h1, o.y + o.dy * d - ny * h1],
      [o.x - nx * HALF0, o.y - ny * HALF0],
    ];
  }

  function drawWedgePath(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }

  function coreWedge(l, V) {
    const o = face(l, -V.sy);
    let d;
    if (l.kind === 'right') d = V.W + OVER - o.x;
    else if (l.kind === 'up') d = o.y + OVER;
    else d = V.H + OVER - o.y;
    if (d < OVER) d = OVER;
    const h1 = (HALF0 + d * SPREAD) * 0.35;
    const half0 = HALF0 * 0.35;
    const nx = -o.dy, ny = o.dx;
    return [
      [o.x + nx * half0, o.y + ny * half0],
      [o.x + o.dx * d + nx * h1, o.y + o.dy * d + ny * h1],
      [o.x + o.dx * d - nx * h1, o.y + o.dy * d - ny * h1],
      [o.x - nx * half0, o.y - ny * half0],
    ];
  }

  function drawBeams(ctx, V) {
    const oy = -V.sy;
    for (const shelf of shelves) {
      for (const l of shelf.lamps) {
        if (!l.on || l.on <= 0) continue;
        const o = face(l, oy);
        if (l.kind === 'right' && (o.y < -600 || o.y > V.H + 600)) continue;
        const alpha = Math.min(1, l.on);
        const outer = wedge(l, V);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = BEAM;
        drawWedgePath(ctx, outer);
        ctx.fill();
        ctx.fillStyle = CORE;
        drawWedgePath(ctx, coreWedge(l, V));
        ctx.fill();

        let minX = outer[0][0], maxX = outer[0][0], minY = outer[0][1], maxY = outer[0][1];
        for (const p of outer) {
          if (p[0] < minX) minX = p[0];
          if (p[0] > maxX) maxX = p[0];
          if (p[1] < minY) minY = p[1];
          if (p[1] > maxY) maxY = p[1];
        }

        drawWedgePath(ctx, outer);
        ctx.clip();
        ctx.fillStyle = SHADE;
        for (const s2 of shelves) {
          for (const c of s2.crates) {
            if (c.mode === 'gone') continue;
            const cx = c.x, cy = c.y - V.sy;
            if (cx > maxX || cx + CW < minX || cy > maxY || cy + CW < minY) continue;
            if (l.kind === 'right' && !(cx + CW > o.x)) continue;
            if (l.kind === 'up' && !(cy < o.y)) continue;
            if (l.kind === 'down' && !(cy + CW > o.y)) continue;
            if (l.kind === 'right') {
              ctx.fillRect(cx + CW, cy, (V.W + OVER) - (cx + CW), CW);
            } else if (l.kind === 'up') {
              ctx.fillRect(cx, -OVER, CW, cy - (-OVER));
            } else {
              ctx.fillRect(cx, cy + CW, CW, (V.H + OVER) - (cy + CW));
            }
          }
        }
        ctx.restore();

        P.glow(ctx, o.x, o.y, 30, '110,160,240', .45 * alpha);
      }
    }
  }

  // ---- scripted events ----
  function startEvent(k, V) {
    const shelf = shelves.find(s => s.k === k);
    if (!shelf) return false;
    if (evs[k].state === 'run' || evs[k].state === 'end') return false;
    const ev = EVENTS[k];
    const l = shelf.lamps[ev.lamps[0][0]];
    if (l) {
      const spr = SPR[l.kind];
      P.award('play-heavylight', 'HeavyLight lamp', l.x + spr.w / 2, l.y - V.sy + spr.h / 2);
    }
    for (const c of shelf.crates) { c.x = c.hx; c.y = c.hy; c.mode = 'rest'; }
    evs[k] = { state: 'run', t: 0, m: ev.moves.map(() => ({ started: false, finished: false, from: null, target: null })) };
    V.wake();
    return true;
  }

  function stepEvents(dt, V) {
    if (dt < 0) dt = 0;
    if (dt > 0.05) dt = 0.05;
    for (const s of shelves) {
      const e = evs[s.k];
      if (e.state !== 'run') continue;
      const ev = EVENTS[s.k];
      const prev = e.t;
      e.t += dt;
      const t = e.t;
      for (const [i, a, b] of ev.lamps) {
        if ((prev < a && a <= t) || (a === 0 && prev === 0)) {
          if (s.lamps[i]) s.lamps[i].on = b - a;
        }
      }
      for (let mi = 0; mi < ev.moves.length; mi++) {
        const mv = ev.moves[mi];
        const ms = e.m[mi];
        if (ms.finished) continue;
        const c = s.crates[typeof mv.c === 'function' ? mv.c(s) : mv.c];
        if (!ms.started && t >= mv.t0) {
          ms.started = true;
          ms.from = { x: c.x, y: c.y };
          ms.target = mv.to(s, c);
          c.mode = 'script';
        }
        if (ms.started) {
          const u = mv.t1 > mv.t0 ? Math.max(0, Math.min(1, (t - mv.t0) / (mv.t1 - mv.t0))) : 1;
          c.x = ms.from.x + (ms.target.x - ms.from.x) * E[mv.ex](u);
          c.y = ms.from.y + (ms.target.y - ms.from.y) * E[mv.ey](u) - (mv.lift || 0) * Math.sin(Math.PI * u);
          if (u >= 1) {
            c.x = ms.target.x; c.y = ms.target.y;
            ms.finished = true;
            if (mv.fall) { c.mode = 'fall'; c.vx = mv.fall.vx; c.vy = mv.fall.vy; c.ft = 0; }
            else c.mode = 'rest';
          }
        }
      }
    }
    // crates in free fall, any shelf
    for (const s of shelves) {
      for (const c of s.crates) {
        if (c.mode !== 'fall') continue;
        c.vy += G * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.ft += dt;
        if (c.y - V.sy > V.H + 60 || c.ft > 3) c.mode = 'gone';
      }
    }
    // run -> end: the script and any fall it started are done
    for (const s of shelves) {
      const e = evs[s.k];
      if (e.state !== 'run') continue;
      const ev = EVENTS[s.k];
      const lastLampB = ev.lamps[ev.lamps.length - 1][2];
      const lastMoveT1 = ev.moves[ev.moves.length - 1].t1;
      const active = s.crates.some(c => c.mode === 'script' || c.mode === 'fall');
      if (e.t >= lastLampB && e.t >= lastMoveT1 && !active) {
        e.state = 'end';
        for (const c of s.crates) {
          if (c.mode !== 'gone') continue;
          const sc = c.hy - V.sy;
          if (sc < -CW || sc > V.H) { c.x = c.hx; c.y = c.hy; c.mode = 'rest'; }
          else { c.mode = 'drop'; c.x = c.hx; c.y = Math.min(c.hy - 300, V.sy - CW - 20); c.vy = 0; }
        }
      }
    }
    // crates dropping back onto the shelf
    for (const s of shelves) {
      for (const c of s.crates) {
        if (c.mode !== 'drop') continue;
        c.vy += G * dt;
        c.y += c.vy * dt;
        if (c.y >= c.hy) { c.y = c.hy; c.x = c.hx; c.mode = 'rest'; }
      }
    }
    // end -> done
    for (const s of shelves) {
      const e = evs[s.k];
      if (e.state !== 'end') continue;
      if (s.crates.some(c => c.mode === 'drop')) continue;
      e.state = 'done';
      if (s.k === 2) {
        const c = s.crates[towerOrder(s)[0]];
        P.award('play-heavylight-tower', 'HeavyLight tower', c.hx + CW / 2, c.hy - V.sy + CW / 2);
      }
    }
  }

  function checkTriggers(V) {
    for (const s of shelves) {
      if (evs[s.k].state !== 'idle') continue;
      const sc = s.y - V.sy;
      if (sc >= V.H / 3 && sc <= 2 * V.H / 3) startEvent(s.k, V);
    }
  }

  function press(x, y, V) {
    for (const s of shelves) {
      for (let i = 0; i < s.lamps.length; i++) {
        const l = s.lamps[i];
        const spr = SPR[l.kind];
        const bw = Math.max(56, spr.w), bh = Math.max(56, spr.h);
        const cx = l.x + spr.w / 2, cy = (l.y - V.sy) + spr.h / 2;
        const bx = cx - bw / 2, by = cy - bh / 2;
        if (x < bx || x > bx + bw || y < by || y > by + bh) continue;
        if (evs[s.k].state === 'run' || evs[s.k].state === 'end') return true;
        startEvent(s.k, V);
        return true;
      }
    }
    return false;
  }

  function play(k) {
    return VV ? startEvent(k, VV) : false;
  }

  // ---- frame functions ----
  function step(dt, V) {
    VV = V;
    if (sigOf(V) !== sig) layout(V);
    for (const s of shelves) {
      for (const l of s.lamps) {
        l.on -= dt;
        if (l.on < 0) l.on = 0;
      }
    }
    stepEvents(dt, V);
    if (dt > 0 && !V.reduced) checkTriggers(V);   // no XP from the setup still frame (reduced motion, phones)
  }

  function draw(ctx, V) {
    drawShelves(ctx, V);
    drawBeams(ctx, V);
    drawMasses(ctx, V);
  }

  function atRest(V) {
    for (const s of shelves) {
      for (const l of s.lamps) if (l.on > 0) return false;
    }
    for (const e of evs) if (e.state === 'run' || e.state === 'end') return false;
    return true;
  }

  function resize(V) {
    layout(V);
  }

  function on(k, i) {
    for (const s of shelves) {
      if (s.k === k && s.lamps[i]) {
        s.lamps[i].on = ON_FOR;
        if (VV) VV.wake();
        return true;
      }
    }
    return false;
  }

  function report() {
    const wedges = [];
    for (const s of shelves) {
      for (let i = 0; i < s.lamps.length; i++) {
        const l = s.lamps[i];
        if (l.on > 0) wedges.push({ k: s.k, i, kind: l.kind, pts: VV ? wedge(l, VV) : [] });
      }
    }
    return {
      masses: masses.map(m => ({ fx: m.fx, fy: m.fy, cells: m.cells.length })),
      shelves: shelves.map(s => ({ k: s.k, x: s.x, y: s.y, w: s.w, tiles: s.tiles, lamps: s.lamps.map(l => l.kind), crates: s.crates.length, boxes: s.crates.map(c => ({ x: Math.round(c.x), y: Math.round(c.y), mode: c.mode })) })),
      wedges,
      events: evs.map((e, k) => ({ k, state: e.state, t: +e.t.toFixed(2) })),
      W: VV && VV.W, H: VV && VV.H,
    };
  }

  P.start({ name: 'heavylight', seed: 11, setup, step, draw, atRest, resize, press });
  window.PlayHeavyLight = { report, on, play };
})();
