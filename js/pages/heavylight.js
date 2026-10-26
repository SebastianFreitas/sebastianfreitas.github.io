/* heavylight.js — the HeavyLight case page toy. Three tile shelves sit in the gutter beside the hero,
   the Lamps clip and the journal, crates rest on them and the lamps light
   with the bridge beacon's beam: straight right/up/down, stopped at the
   first solid tile, 0.15s fade in, 0.25s fade out, a faint idle glow. */
(function () {
  'use strict';
  const U = window.Util, P = window.Play;
  if (!U || !P) return;

  const ART = 16;
  const SCALES = [3, 2];       // art scale, largest first; a smaller one when the room beside the text is short
  let S = 3, T = ART * S;      // art scale, tile screen px (48 at 3)
  const SHELF_LIFT = 4, SHELF_GAP = 10, EDGE = 10, BEAM_PAD = 24, BEAM_FADE = 16;
  let CW = 14 * S;             // crate size (14 art px)
  const CULL = 120;
  const SPREAD = Math.tan(6 * Math.PI / 180), ON_FOR = 8;
  // the bridge beacon's beam recipe (zones.js BEAM/lampGlow)
  const CONE = '110,160,240', LAMP_GLOW = '170,215,240', GLOW_R0 = 26, GLOW_LIT = .28, GLOW_IDLE = .07, GLOW_HOVER = .14, FADE_IN = .15, FADE_OUT = .25, NUDGE = 2;
  let GLOW_R = GLOW_R0;
  let VV = null;
  let clock = 0;

  // ---- pixel art (HeavyLight palette; shared with the game) ----
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

  // ---- state ----
  let SPR = null;
  let shelves = [];  // [{k,x,y,w,tiles,target,cells:[{m,v}],lamps:[{kind,x,y}],crates:[{x,y}]}] document space
  let sig = '';
  let hover = null;   // 'k:i' of the lamp under the pointer
  let stilled = '';   // layout sig the reduced-motion still was posed for

  // ---- scripted lamp/crate events ----
  const G = 1800;   // fall gravity, px/s^2
  let SLIDE_V = 32 * S;  // crate slide speed, px/s (2 tiles/s)
  const HOLD = 0.4;    // a released lamp holds lit this long before it fades
  const STILL_T = [0.9, 0.4, 2.05];   // reduced-motion pose per event, s (D82)
  const REPLAY_FADE = 0.3;   // replay: crate fades out at its end, then in at home (D54)
  const EVENTS = [
    { k: 0, steps: [
      { op: 'light', lamp: 0 },
      { op: 'wait', lamp: 0 },
      { op: 'slide', x: 65 },
      { op: 'release', lamp: 0 },
      { op: 'drop', row: 1 },
    ] },
    { k: 1, steps: [
      { op: 'light', lamp: 0 },
      { op: 'wait', lamp: 0 },
      { op: 'slide', x: 33 },
      { op: 'release', lamp: 0 },
      { op: 'light', lamp: 1 },
      { op: 'drop', row: 1 },
      { op: 'wait', lamp: 1 },
      { op: 'slide', x: 49 },
      { op: 'release', lamp: 1 },
      { op: 'light', lamp: 2 },
      { op: 'drop', row: 2 },
      { op: 'wait', lamp: 2 },
      { op: 'slide', x: 66 },
      { op: 'release', lamp: 2 },
    ] },
    { k: 2, steps: [
      { op: 'light', lamp: 0 },
      { op: 'wait', lamp: 0 },
      { op: 'slide', x: 34 },
      { op: 'release', lamp: 0 },
      { op: 'light', lamp: 1 },
      { op: 'wait', lamp: 1 },
      { op: 'lift', y: 7 },
      { op: 'light', lamp: 2 },
      { op: 'lift', y: 2 },
      { op: 'wait', lamp: 2 },
      { op: 'release', lamp: 1 },
      { op: 'slide', x: 66 },
      { op: 'release', lamp: 2 },
      { op: 'goal' },
    ] },
  ];
  let evs = [{ state: 'idle', t: 0 }, { state: 'idle', t: 0 }, { state: 'idle', t: 0 }];

  function setup(V) {
    VV = V;
    layout(V);
  }

  function buildSpr() {
    SPR = { right: P.sprite(HPAL, lamp_right, S), up: P.sprite(HPAL, lamp_up, S), box: P.sprite(HPAL, box_Box1, S) };
    SPR.down = vflip(SPR.up);   // lamp_up flipped for the down-facing lamp
    SPR.wall = P.sprite(HPAL, lamp_wall, S);
    SPR.floor = P.sprite(HPAL, lamp_floor, S);
  }

  // a fresh sprite whose canvas is s.cv drawn upside down
  function vflip(s) {
    const cv = document.createElement('canvas');
    cv.width = s.w; cv.height = s.h;
    const ctx = cv.getContext('2d');
    ctx.translate(0, s.h);
    ctx.scale(1, -1);
    ctx.drawImage(s.cv, 0, 0);
    return { cv, w: s.w, h: s.h, ox: s.ox, oy: s.oy, scale: s.scale };
  }

  // pick the sheet's autotile face from the four cardinal air neighbours
  function ringTile(solid, c, r) {
    const n = !solid(c, r - 1), e = !solid(c + 1, r), s = !solid(c, r + 1), w = !solid(c - 1, r);
    if (n && e && w) return { name: 'h_pillarTop', flip: false };
    if (s && e && w) return { name: 'h_pillarDrip', flip: false };
    if (n && w) return { name: 'h_floorL', flip: false };
    if (n && e) return { name: 'h_floorR', flip: false };
    if (n && s) return { name: 'h_plat', flip: false };
    if (s && w) return { name: 'h_dripL', flip: false };
    if (s && e) return { name: 'h_doubleFloor', flip: false };
    if (e && w) return { name: 'h_pillarBody', flip: false };
    if (n) return { name: 'h_floor1', flip: false };
    if (s) return { name: 'h_wallDrip', flip: false };
    if (w) return { name: 'h_wallL', flip: false };
    if (e) return { name: 'h_wallR', flip: false };
    return { name: 'h_wall', flip: false };
  }

  // ---- shelves, crates, lamps ----
  const TARGETS = ['.embed-shell', 'video[src*="lamps"]', 'img[src*="journal"]'];
  // built shelf "chunks": cells in tile units from the chunk origin, plus lamp mounts and the crate's home cell.
  // a cell may carry a 3rd element, a tile-name override, used instead of chunkTile's pick.
  const CHUNKS = [
    { cells: [[0,0],[1,0],[2,0],[3,0],[3,1],[3,2],[4,1]],
      lamps: [{ kind: 'right', c: 0, r: 0 }],
      crate: { c: 1, r: 0 } },
    { cells: [[0,0],[1,0],[1,1],[2,1],[2,2],[3,2],[4,2],[5,1],[5,2]],
      lamps: [{ kind: 'right', c: 0, r: 0 }, { kind: 'wall', c: 1, r: 0 }, { kind: 'wall', c: 2, r: 1 }],
      crate: { c: 1, r: 0 } },
    { cells: [[0,4],[1,4],[2,4],[3,4],[3,1],[3,2],[3,3],[4,1,'h_symbol1'],[5,1],[5,0],[1,1]],
      lamps: [{ kind: 'right', c: 0, r: 4 }, { kind: 'floor', c: 2, r: 4 }, { kind: 'right', c: 1, r: 1 }],
      crate: { c: 1, r: 4 } },
  ];

  // pick a shelf cell's tile: a flat platform face if it's open above and below, else the sheet's autotile
  function chunkTile(solid, c, r) {
    if (!solid(c, r - 1) && !solid(c, r + 1)) {
      if (!solid(c - 1, r)) return { name: 'h_platL', flip: false };
      if (!solid(c + 1, r)) return { name: 'h_airFloor1', flip: false };
      return { name: 'h_plat', flip: false };
    }
    return ringTile(solid, c, r);
  }

  function sigOf(V) {
    return V.blocks.length + '/' + V.docH + '/' + V.main.w + '/' + V.R + '/' + V.W + '/' + V.H;
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
    shelves = [];
    // largest art scale at which any shelf fits beside its text block
    const blocks = [];
    for (let k = 0; k < 3; k++) {
      const b = findBlock(V, k, blocks);
      blocks.push(b);
    }
    let sc = SCALES[SCALES.length - 1];
    for (const cand of SCALES) {
      if (blocks.some((b, k) => b && CHUNKS[k] && (1 + Math.max(...CHUNKS[k].cells.map(c => c[0]))) * ART * cand <= V.R - EDGE - (b.x + b.w + SHELF_GAP))) { sc = cand; break; }
    }
    if (sc !== S || !SPR) {
      S = sc; T = ART * S; CW = 14 * S; SLIDE_V = 32 * S; GLOW_R = GLOW_R0 * S / 3;
      buildSpr();
    }
    for (let k = 0; k < blocks.length; k++) {
      const b = blocks[k];
      if (!b) continue;
      const chunk = CHUNKS[k];
      if (!chunk) continue;
      // a built chunk of tiles
      const cols = 1 + Math.max(...chunk.cells.map(c => c[0]));
      const rows = 1 + Math.max(...chunk.cells.map(c => c[1]));
      const x = b.x + b.w + SHELF_GAP;
      const avail = V.R - EDGE - x;
      if (cols * T > avail) continue;
      const y = b.y + b.h - SHELF_LIFT - rows * T;
      const w = cols * T;
      const tiles = chunk.cells.length;
      const solidSet = new Set(chunk.cells.map(c => c[0] + ',' + c[1]));
      const solid = (c, r) => solidSet.has(c + ',' + r);
      const cells = chunk.cells.map(cell => {
        const [c, r] = cell;
        const tl = cell[2] ? { name: cell[2], flip: false } : chunkTile(solid, c, r);
        return { c, r, name: tl.name, flip: tl.flip };
      });
      const lamps = chunk.lamps.map(lm => {
        const spr = SPR[lm.kind];
        if (lm.kind === 'wall') return { kind: lm.kind, x: x + (lm.c + 1) * T - spr.w, y: y + lm.r * T + T - 12 * S - 3 * S };
        if (lm.kind === 'floor') return { kind: lm.kind, x: x + (lm.c + 1) * T - CW / 2 - 3 * S, y: y + lm.r * T };
        return { kind: lm.kind, x: x + lm.c * T + S, y: y + lm.r * T - spr.h };
      });
      for (let i = 0; i < lamps.length; i++) {
        lamps[i].on = 0;
        lamps[i].a = 0;
      }
      const cx = x + chunk.crate.c * T + S, cy = y + chunk.crate.r * T - CW;
      const crates = [{ x: cx, y: cy, hx: cx, hy: cy, mode: 'rest', al: 1 }];
      shelves.push({ k, x, y, w, tiles, cells, rows, target: TARGETS[k], lamps, crates });
    }
    // every relayout (resize, late measure) resets the events: idle, crates home, the middle third plays them again (D59)
    evs = [0, 1, 2].map(() => ({ state: 'idle', t: 0, i: 0 }));
  }

  function drawShelves(ctx, V) {
    const oy = -V.sy;
    for (const shelf of shelves) {
      if (shelf.y + oy > V.H + CULL || shelf.y + shelf.rows * T + oy < -CULL) continue;
      for (const cell of shelf.cells) {
        P.blit(ctx, P.sprite(HPAL, HSPR[cell.name], S), shelf.x + cell.c * T, shelf.y + cell.r * T + oy, cell.flip);
      }
      for (const l of shelf.lamps) {
        P.blit(ctx, SPR[l.kind], l.x, l.y + oy, false);
      }
    }
    // crates draw unculled by shelf position: a scripted crate can be off its shelf mid-event
    for (const shelf of shelves) {
      for (const c of shelf.crates) {
        if (c.mode === 'gone') continue;
        if (c.al !== undefined && c.al < 1) {
          if (c.al <= 0) continue;
          ctx.save();
          ctx.globalAlpha = c.al;
          P.blit(ctx, SPR.box, c.x, c.y + oy, false);
          ctx.restore();
          continue;
        }
        P.blit(ctx, SPR.box, c.x, c.y + oy, false);
      }
    }
  }

  // ---- beams, glows ----
  function face(l, oy) {
    if (l.kind === 'wall') return { x: l.x + SPR.wall.w, y: l.y + 3 * S + oy, dx: 1, dy: 0, half: 3 * S };
    if (l.kind === 'right') return { x: l.x + SPR.right.w, y: l.y + 3 * S + oy, dx: 1, dy: 0, half: 3 * S };
    if (l.kind === 'up') return { x: l.x + 13 * S, y: l.y + oy, dx: 0, dy: -1, half: 3 * S };
    if (l.kind === 'floor') return { x: l.x + 3 * S, y: l.y + oy, dx: 0, dy: -1, half: 3 * S };
    return { x: l.x + 13 * S, y: l.y + SPR.down.h + oy, dx: 0, dy: 1, half: 3 * S };
  }

  // beam length in px from the face to the first solid tile (a shelf, else the screen edge)
  function reach(l, V) {
    const o = face(l, -V.sy);
    let d;
    if (l.kind === 'right' || l.kind === 'wall') d = V.R - BEAM_PAD - o.x;
    else if (l.kind === 'up' || l.kind === 'floor') d = o.y - Math.round(V.top);
    else d = V.H - o.y;
    for (const s of shelves) {
      for (const cell of s.cells) {
        const cx = s.x + cell.c * T, cy = s.y + cell.r * T - V.sy;
        if (l.kind === 'right' || l.kind === 'wall') {
          if (cy <= o.y && o.y < cy + T && cx >= o.x) d = Math.min(d, cx - o.x);
        } else if (l.kind === 'up' || l.kind === 'floor') {
          if (o.x >= cx && o.x < cx + T && cy + T <= o.y) d = Math.min(d, o.y - (cy + T));
        } else {
          if (o.x >= cx && o.x < cx + T && cy >= o.y) d = Math.min(d, cy - o.y);
        }
      }
    }
    return Math.max(0, d);
  }

  // out: optional reused 4-point array, r: reach already measured; both avoid per-frame allocation
  function wedge(l, V, cut, out, r) {
    const o = face(l, -V.sy);
    const sx = o.x + o.dx * NUDGE, sy = o.y + o.dy * NUDGE;
    const d = Math.max(0, (r === undefined ? reach(l, V) : r) - NUDGE - (cut || 0));
    const h1 = o.half + d * SPREAD;
    const nx = -o.dy, ny = o.dx;
    const p = out || [[0, 0], [0, 0], [0, 0], [0, 0]];
    p[0][0] = sx + nx * o.half; p[0][1] = sy + ny * o.half;
    p[1][0] = sx + o.dx * d + nx * h1; p[1][1] = sy + o.dy * d + ny * h1;
    p[2][0] = sx + o.dx * d - nx * h1; p[2][1] = sy + o.dy * d - ny * h1;
    p[3][0] = sx - nx * o.half; p[3][1] = sy - ny * o.half;
    return p;
  }

  function drawWedgePath(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }

  const SCR = [0, 1, 2].map(() => [[0, 0], [0, 0], [0, 0], [0, 0]]);
  function drawBeams(ctx, V) {
    const ca = 0.20 + 0.03 * Math.sin(clock * 3.1);
    for (const shelf of shelves) {
      for (const l of shelf.lamps) {
        if (!l.a || l.a <= 0) continue;
        const o = face(l, -V.sy);
        if (o.y < -600 || o.y > V.H + 600) continue;
        const r = reach(l, V);
        if (r - NUDGE < 2) continue;
        // a beam that runs out at the frame instead of a shelf thins out over its last two steps
        const open = (l.kind === 'right' || l.kind === 'wall') && r >= V.R - BEAM_PAD - o.x - 0.5;
        if (open) {
          // three stacked layers; per-layer alpha so the overlapped core reads the same ca * l.a as a single fill
          ctx.fillStyle = 'rgba(' + CONE + ',' + (1 - Math.pow(1 - ca * l.a, 1 / 3)).toFixed(3) + ')';
          for (let k = 2; k >= 0; k--) { drawWedgePath(ctx, wedge(l, V, k * BEAM_FADE, SCR[k], r)); ctx.fill(); }
          continue;
        }
        ctx.fillStyle = 'rgba(' + CONE + ',' + (ca * l.a).toFixed(3) + ')';
        drawWedgePath(ctx, wedge(l, V, 0, SCR[0], r));
        ctx.fill();
      }
    }
  }

  // faint idle head glow, brighter on hover (D56) and while lit
  function drawGlows(ctx, V) {
    for (const shelf of shelves) {
      for (let i = 0; i < shelf.lamps.length; i++) {
        const l = shelf.lamps[i];
        const o = face(l, -V.sy);
        if (o.y < -60 || o.y > V.H + 60) continue;
        const base = hover === shelf.k + ':' + i ? GLOW_HOVER : GLOW_IDLE;
        P.glow(ctx, o.x + o.dx * NUDGE, o.y + o.dy * NUDGE, GLOW_R, LAMP_GLOW, base + (GLOW_LIT - base) * (l.a || 0));
      }
      if (shelf.goal) {
        P.glow(ctx, shelf.x + 4.5 * T, shelf.y + 1 * T - V.sy, 13 * S, LAMP_GLOW, .14);
      }
    }
  }

  // ---- scripted events ----
  // chunk wholly outside the viewport: its event and lamps pause (D79)
  function offscreen(s, V) {
    return s.y + s.rows * T - V.sy < 0 || s.y - V.sy > V.H;
  }

  // nothing in the chunk moves or glows: a click may replay it (D55)
  function settled(s) {
    const e = evs[s.k];
    if (e.state !== 'idle' && e.state !== 'done') return false;
    for (const l of s.lamps) if ((l.on || 0) > 0 || (l.a || 0) > 0) return false;
    return true;
  }

  function startEvent(k, V) {
    const shelf = shelves.find(s => s.k === k);
    if (!shelf) return false;
    if (!settled(shelf)) return false;
    const l = shelf.lamps[0];
    if (l) {
      const spr = SPR[l.kind];
      P.award('play-heavylight', 'HeavyLight lamp', l.x + spr.w / 2, l.y - V.sy + spr.h / 2);
    }
    shelf.goal = false;
    if (evs[k].state === 'done') {
      // crate stays at its end spot; the fade runs in stepEvents
      evs[k] = { state: 'out', t: 0, i: 0 };
    } else {
      for (const c of shelf.crates) { c.x = c.hx; c.y = c.hy; c.mode = 'rest'; c.al = 1; }
      evs[k] = { state: 'run', t: 0, i: 0 };
    }
    V.wake();
    return true;
  }

  // per-frame runner for a chunk shelf's scripted step list (EVENTS[k].steps)
  function runSteps(e, ev, s, dt) {
    e.t += dt;
    const c = s.crates[0];
    while (e.i < ev.steps.length) {
      const op = ev.steps[e.i];
      if (op.op === 'light') { s.lamps[op.lamp].on = 99; e.i++; continue; }
      if (op.op === 'release') { s.lamps[op.lamp].on = HOLD; e.i++; continue; }
      if (op.op === 'wait') {
        if (s.lamps[op.lamp].a >= 1) { e.i++; continue; }
        break;
      }
      if (op.op === 'slide') {
        c.mode = 'script';
        const target = s.x + op.x * S;   // op.x/op.y in art px
        const dir = target >= c.x ? 1 : -1;
        c.x += dir * SLIDE_V * dt;
        if ((dir > 0 && c.x >= target) || (dir < 0 && c.x <= target)) { c.x = target; c.mode = 'rest'; e.i++; continue; }
        break;
      }
      if (op.op === 'lift') {
        c.mode = 'script';
        const target = s.y + op.y * S;
        c.y -= SLIDE_V * dt;
        if (c.y <= target) { c.y = target; c.mode = 'rest'; e.i++; continue; }
        break;
      }
      if (op.op === 'goal') { s.goal = true; e.i++; continue; }
      // drop
      c.mode = 'script';
      c.vy = (c.vy || 0) + G * dt;
      c.y += c.vy * dt;
      const targetY = s.y + op.row * T - CW;
      if (c.y >= targetY) { c.y = targetY; c.vy = 0; c.mode = 'rest'; e.i++; continue; }
      break;
    }
    if (e.i >= ev.steps.length) e.state = 'end';
  }

  function stepEvents(dt, V) {
    if (dt < 0) dt = 0;
    if (dt > 0.05) dt = 0.05;
    for (const s of shelves) {
      if (offscreen(s, V)) continue;
      const e = evs[s.k];
      if (e.state === 'out') {
        e.t += dt;
        const al = Math.max(0, 1 - e.t / REPLAY_FADE);
        for (const c of s.crates) c.al = al;
        if (e.t >= REPLAY_FADE) {
          for (const c of s.crates) { c.x = c.hx; c.y = c.hy; c.vy = 0; c.mode = 'rest'; c.al = 0; }
          evs[s.k] = { state: 'in', t: 0, i: 0 };
        }
        continue;
      }
      if (e.state === 'in') {
        e.t += dt;
        const al = Math.min(1, e.t / REPLAY_FADE);
        for (const c of s.crates) c.al = al;
        if (e.t >= REPLAY_FADE) {
          for (const c of s.crates) c.al = 1;
          evs[s.k] = { state: 'run', t: 0, i: 0 };
        }
        continue;
      }
      if (e.state === 'run') runSteps(e, EVENTS[s.k], s, dt);
    }
    // end -> done
    for (const s of shelves) {
      const e = evs[s.k];
      if (e.state !== 'end') continue;
      if (s.crates.some(c => c.mode === 'drop')) continue;
      e.state = 'done';
    }
  }

  function checkTriggers(V) {
    for (const s of shelves) {
      if (evs[s.k].state !== 'idle') continue;
      const sc = s.y - V.sy;
      if (sc >= V.H / 3 && sc <= 2 * V.H / 3) startEvent(s.k, V);
    }
  }

  // hit test the lamp under (x,y); shared by press and hover
  function lampAt(x, y, V) {
    for (const s of shelves) {
      for (let i = 0; i < s.lamps.length; i++) {
        const l = s.lamps[i];
        const spr = SPR[l.kind];
        const bw = Math.max(56, spr.w), bh = Math.max(56, spr.h);
        const cx = l.x + spr.w / 2, cy = (l.y - V.sy) + spr.h / 2;
        const bx = cx - bw / 2, by = cy - bh / 2;
        if (x < bx || x > bx + bw || y < by || y > by + bh) continue;
        return { s, i };
      }
    }
    return null;
  }

  function press(x, y, V) {
    const hit = lampAt(x, y, V);
    if (!hit) return false;
    startEvent(hit.s.k, V);   // ignored unless the chunk is settled (D55)
    return true;
  }

  // lamp under the pointer brightens and swaps in a pointer cursor (D56)
  function move(x, y, V) {
    if (V.reduced) return;
    const hit = lampAt(x, y, V);
    const key = hit ? hit.s.k + ':' + hit.i : null;
    if (key !== hover) {
      hover = key;
      V.cursor(!!hit);
      V.wake();
    }
  }

  function play(k) {
    return VV ? startEvent(k, VV) : false;
  }

  // reduced motion: one still frame, each event frozen mid-push (D25, D57, D82)
  function poseStill(V) {
    for (const s of shelves) {
      for (const c of s.crates) { c.x = c.hx; c.y = c.hy; c.vy = 0; c.mode = 'rest'; c.al = 1; }
      for (const l of s.lamps) { l.on = 0; l.a = 0; }
      s.goal = false;
      evs[s.k] = { state: 'run', t: 0, i: 0 };
      const n = Math.round(STILL_T[s.k] * 60);
      const dt = 1 / 60;
      for (let t = 0; t < n; t++) {
        for (const l of s.lamps) {
          if (l.on > 0) {
            l.on = Math.max(0, l.on - dt);
            l.a = Math.min(1, (l.a || 0) + dt / FADE_IN);
          } else {
            l.a = Math.max(0, (l.a || 0) - dt / FADE_OUT);
          }
        }
        if (evs[s.k].state === 'run') runSteps(evs[s.k], EVENTS[s.k], s, dt);
      }
    }
  }

  // ---- frame functions ----
  function step(dt, V) {
    VV = V;
    if (dt > 0) clock += dt;
    if (sigOf(V) !== sig) layout(V);
    if (V.reduced) { if (stilled !== sig) { stilled = sig; poseStill(V); } return; }
    if (V.pointer.has && !V.reduced) move(V.pointer.x, V.pointer.y, V);   // scrolling moves lamps under a still pointer
    for (const s of shelves) {
      if (offscreen(s, V)) continue;
      for (const l of s.lamps) {
        if (l.on > 0) {
          l.on = Math.max(0, l.on - dt);
          l.a = Math.min(1, (l.a || 0) + dt / FADE_IN);
        } else {
          l.a = Math.max(0, (l.a || 0) - dt / FADE_OUT);
        }
      }
    }
    stepEvents(dt, V);
    if (dt > 0 && !V.reduced) checkTriggers(V);   // no XP from the setup still frame (reduced motion, phones)
  }

  function draw(ctx, V) {
    drawShelves(ctx, V);
    drawGlows(ctx, V);
    drawBeams(ctx, V);
  }

  function atRest(V) {
    for (const s of shelves) {
      if (offscreen(s, V)) continue;
      for (const l of s.lamps) if ((l.on || 0) > 0 || (l.a || 0) > 0) return false;
      const st = evs[s.k].state;
      if (st === 'run' || st === 'end' || st === 'out' || st === 'in') return false;
    }
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
        if ((l.a || 0) > 0) wedges.push({ k: s.k, i, kind: l.kind, pts: VV ? wedge(l, VV) : [], a: +l.a.toFixed(2), d: Math.round(VV ? reach(l, VV) : 0) });
      }
    }
    return {
      shelves: shelves.map(s => ({ k: s.k, x: s.x, y: s.y, w: s.w, tiles: s.tiles, rows: s.rows, cells: s.cells.map(c => ({ c: c.c, r: c.r, name: c.name })), lamps: s.lamps.map(l => l.kind), crates: s.crates.length, boxes: s.crates.map(c => ({ x: Math.round(c.x), y: Math.round(c.y), mode: c.mode, al: c.al === undefined ? 1 : +c.al.toFixed(2) })) })),
      wedges,
      events: evs.map((e, k) => ({ k, state: e.state, t: +e.t.toFixed(2) })),
      hover,
      W: VV && VV.W, H: VV && VV.H,
    };
  }

  P.register({ name: 'heavylight', seed: 11, setup, step, draw, atRest, resize, press, move });
  window.PlayHeavyLight = { report, on, play };
})();
