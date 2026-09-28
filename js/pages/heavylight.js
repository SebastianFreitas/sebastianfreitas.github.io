/* heavylight.js — the HeavyLight case page toy. A viewport-fixed cave ring
   owns the border (ceiling notches, floor mounds, right-wall ledges, a
   floor spike row), three tile shelves sit in the gutter beside the hero,
   the Lamps clip and the journal, crates rest on them and the lamps light
   with the bridge beacon's beam: straight right/up/down, stopped at the
   first solid tile, 0.15s fade in, 0.25s fade out, a faint idle glow. */
(function () {
  'use strict';
  const U = window.Util, P = window.Play;
  if (!U || !P) return;

  const S = 3;                 // art scale
  const ART = 16, T = ART * S; // tile art px, tile screen px (48)
  const SHELF_LIFT = 4, SHELF_GAP = 12, EDGE = 0;
  const CW = 42;               // crate size (14 art px)
  const CULL = 120;
  const SPREAD = Math.tan(6 * Math.PI / 180), ON_FOR = 8;
  // the bridge beacon's beam recipe (zones.js BEAM/lampGlow)
  const CONE = '110,160,240', LAMP_GLOW = '170,215,240', GLOW_R = 26, GLOW_LIT = .28, GLOW_IDLE = .07, GLOW_HOVER = .14, FADE_IN = .15, FADE_OUT = .25, NUDGE = 2;
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
  const SLIDE_V = 96;  // crate slide speed, px/s (2 tiles/s)
  const HOLD = 0.4;    // a released lamp holds lit this long before it fades
  const STILL_T = [0.9, 0.4, 2.05];   // reduced-motion pose per event, s (D82)
  const REPLAY_FADE = 0.3;   // replay: crate fades out at its end, then in at home (D54)
  const EVENTS = [
    { k: 0, steps: [
      { op: 'light', lamp: 0 },
      { op: 'wait', lamp: 0 },
      { op: 'slide', x: 4 * T + 3 },
      { op: 'release', lamp: 0 },
      { op: 'drop', row: 1 },
    ] },
    { k: 1, steps: [
      { op: 'light', lamp: 0 },
      { op: 'wait', lamp: 0 },
      { op: 'slide', x: 2 * T + 3 },
      { op: 'release', lamp: 0 },
      { op: 'light', lamp: 1 },
      { op: 'drop', row: 1 },
      { op: 'wait', lamp: 1 },
      { op: 'slide', x: 3 * T + 3 },
      { op: 'release', lamp: 1 },
      { op: 'light', lamp: 2 },
      { op: 'drop', row: 2 },
      { op: 'wait', lamp: 2 },
      { op: 'slide', x: 5 * T - CW },
      { op: 'release', lamp: 2 },
    ] },
    { k: 2, steps: [
      { op: 'light', lamp: 0 },
      { op: 'wait', lamp: 0 },
      { op: 'slide', x: 3 * T - CW },
      { op: 'release', lamp: 0 },
      { op: 'light', lamp: 1 },
      { op: 'wait', lamp: 1 },
      { op: 'lift', y: T - CW + 15 },
      { op: 'light', lamp: 2 },
      { op: 'lift', y: T - CW },
      { op: 'wait', lamp: 2 },
      { op: 'release', lamp: 1 },
      { op: 'slide', x: 5 * T - CW },
      { op: 'release', lamp: 2 },
      { op: 'goal' },
    ] },
  ];
  let evs = [{ state: 'idle', t: 0 }, { state: 'idle', t: 0 }, { state: 'idle', t: 0 }];

  function setup(V) {
    VV = V;
    SPR = { right: P.sprite(HPAL, lamp_right, S), up: P.sprite(HPAL, lamp_up, S), box: P.sprite(HPAL, box_Box1, S) };
    SPR.down = vflip(SPR.up);   // lamp_up flipped for the down-facing lamp
    SPR.wall = P.sprite(HPAL, lamp_wall, S);
    SPR.floor = P.sprite(HPAL, lamp_floor, S);
    layout(V);
    buildRing(V);
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

  // ---- cave ring: one viewport-fixed border built from the game's own tiles ----
  let ring = null, ringKey = '';

  function ringGeom(V) {
    const y0 = Math.round(V.top);
    const cols = Math.ceil(V.W / T), rows = Math.ceil((V.H - y0) / T);
    const cR = Math.floor((V.W - T) / T), rB = Math.floor((V.H - y0 - T) / T);
    const extra = new Set();
    function baseSolid(c, r) { return c === 0 || r === 0 || c >= cR || r >= rB; }
    function solid(c, r) {
      if (c < 0 || r < 0 || c >= cols || r >= rows) return true;
      return baseSolid(c, r) || extra.has(c + ',' + r);
    }
    const bandX = V.main.x + V.main.w + 8;
    const spikes = placeSpikes(cR, rB, bandX, V.main.x);
    const bulges = placeBulges(V, extra, cols, rows, cR, rB, bandX, spikes);
    let cells = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (solid(c, r)) cells++;
    return { y0, cols, rows, cR, rB, solid, bulges, spikes, cells };
  }

  // one bulge per n-slot along an edge, hashed and clamped from corners and each other
  function placeBulges(V, extra, cols, rows, cR, rB, bandX, spikes) {
    const bulges = { top: [], right: [], bottom: [], left: [] };
    const reserved = new Set();
    if (spikes.length) {
      const lo = spikes[0].c - 1, hi = spikes[spikes.length - 1].c + 1;
      for (let c = lo; c <= hi; c++) reserved.add(c);
    }
    { // top: "notch + hanging drip" — 3 cols wide, 1 extra row, 1 more cell under its middle
      const hi = cols - 2, minCol = Math.max(2, Math.ceil(bandX / T));
      const n = Math.max(1, Math.round(V.W / 600)), span = hi - minCol;
      let lastEnd = -Infinity;
      for (let s = 0; s < n && span >= 3; s++) {
        const slotStart = minCol + Math.floor(s * span / n), slotEnd = minCol + Math.floor((s + 1) * span / n);
        const room = slotEnd - slotStart - 3;
        if (room < 0) continue;
        const c0 = slotStart + Math.floor(U.hash1(701 + s) * (room + 1));
        if (c0 < lastEnd + 1 || c0 + 2 >= hi) continue;
        for (let dc = 0; dc < 3; dc++) extra.add((c0 + dc) + ',1');
        extra.add((c0 + 1) + ',2');
        bulges.top.push({ c0 });
        lastEnd = c0 + 3;
      }
    }
    { // bottom: "mound" — 3-4 cols wide, 1 extra row, middle 1-2 cells 1 row higher
      const hi = cols - 2, minCol = Math.max(2, Math.ceil(bandX / T));
      const n = Math.max(1, Math.round(V.W / 600)), span = hi - minCol;
      let lastEnd = -Infinity;
      for (let s = 0; s < n && span >= 4; s++) {
        const slotStart = minCol + Math.floor(s * span / n), slotEnd = minCol + Math.floor((s + 1) * span / n);
        const w = 3 + (U.hash1(811 + s * 2) < 0.5 ? 0 : 1);
        const room = slotEnd - slotStart - w;
        if (room < 0) continue;
        const c0 = slotStart + Math.floor(U.hash1(811 + s) * (room + 1));
        if (c0 < lastEnd + 1 || c0 + w - 1 >= hi) continue;
        let blocked = false;
        for (let dc = 0; dc < w; dc++) if (reserved.has(c0 + dc)) blocked = true;
        if (blocked) continue;
        for (let dc = 0; dc < w; dc++) extra.add((c0 + dc) + ',' + (rB - 1));
        const peak = w === 3 ? 1 : 1 + Math.floor(U.hash1(811 + s * 3) * 2);
        for (let dc = 0; dc < peak; dc++) extra.add((c0 + 1 + dc) + ',' + (rB - 2));
        bulges.bottom.push({ c0, w });
        lastEnd = c0 + w;
      }
    }
    { // right: "stepped ledge" — 3 rows tall, 2-3 cols inward, only the top/bottom 20% of the window
      const topLo = 1, topHi = Math.max(3, Math.floor(rows * 0.2));
      const botLo = Math.floor(rows * 0.8), botHi = rB - 1;
      const zones = [];
      if (topHi - topLo >= 2) zones.push([topLo, topHi]);
      if (botHi - botLo >= 2) zones.push([botLo, botHi]);
      const n = Math.max(1, Math.round((V.H - Math.round(V.top)) / 600));
      let lastEnd = -Infinity;
      for (let s = 0; s < n; s++) {
        const zone = zones[zones.length > 1 ? s % zones.length : 0];
        if (!zone) continue;
        const [lo, hi] = zone, room = hi - lo - 2;
        if (room < 0) continue;
        const r0 = lo + Math.floor(U.hash1(919 + s) * (room + 1));
        if (r0 < lastEnd + 1 || r0 + 2 > hi) continue;
        for (let dr = 0; dr < 3; dr++) {
          const depth = 1 + (dr === 1 ? 1 : 0) + (U.hash1(919 + s * 5 + dr) < 0.4 ? 1 : 0);
          for (let dd = 0; dd < depth; dd++) extra.add((cR - 1 - dd) + ',' + (r0 + dr));
        }
        bulges.right.push({ r0 });
        lastEnd = r0 + 3;
      }
    }
    return bulges;
  }

  function placeSpikes(cR, rB, bandX, mainX) {
    function fits(c) { return c + 2 <= cR - 2; }
    let c0 = Math.max(2, Math.ceil(bandX / T));
    if (!fits(c0)) c0 = Math.max(2, Math.ceil((mainX + 24) / T));
    if (!fits(c0)) return [];
    return [{ c: c0, r: rB }, { c: c0 + 1, r: rB }, { c: c0 + 2, r: rB }];
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

  // a solid cell with no cardinal air but a diagonal one: the two rims meet with a gap unless patched
  function innerCorners(solid, c, r) {
    if (!solid(c, r - 1) || !solid(c + 1, r) || !solid(c, r + 1) || !solid(c - 1, r)) return [];
    const out = [];
    if (!solid(c + 1, r - 1)) out.push('ne');
    if (!solid(c + 1, r + 1)) out.push('se');
    if (!solid(c - 1, r + 1)) out.push('sw');
    if (!solid(c - 1, r - 1)) out.push('nw');
    return out;
  }

  // one art-pixel light-rim nub, the size the sheet uses for its own corner bevels
  function paintCorner(ctx, x, y, dir) {
    const cx = dir[1] === 'e' ? x + T - S : x, cy = dir[0] === 's' ? y + T - S : y;
    ctx.fillStyle = HPAL[3];
    ctx.fillRect(Math.round(cx), Math.round(cy), S, S);
  }

  function buildRing(V) {
    const key = V.W + 'x' + V.H + '@' + Math.round(V.top) + '|' + Math.round(V.main.x + V.main.w);
    if (key === ringKey && ring) return;
    ringKey = key;
    const g = ringGeom(V);
    const cv = document.createElement('canvas');
    cv.width = V.W; cv.height = V.H;
    const ctx = cv.getContext('2d');
    for (let r = 0; r < g.rows; r++) {
      for (let c = 0; c < g.cols; c++) {
        if (!g.solid(c, r)) continue;
        const x = c * T, y = g.y0 + r * T;
        const tile = ringTile(g.solid, c, r);
        P.blit(ctx, P.sprite(HPAL, HSPR[tile.name], S), x, y, tile.flip);
        for (const dir of innerCorners(g.solid, c, r)) paintCorner(ctx, x, y, dir);
      }
    }
    for (const sp of g.spikes) {
      P.blit(ctx, P.sprite(HPAL, HSPR.h_spike, S), sp.c * T, g.y0 + (sp.r - 1) * T + HSPR.h_spike.oy * S, false);
    }
    ring = cv;
    ring._g = g;
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

  // pick a shelf cell's tile: a flat platform face if it's open above and below, else the ring's own autotile
  function chunkTile(solid, c, r) {
    if (!solid(c, r - 1) && !solid(c, r + 1)) {
      if (!solid(c - 1, r)) return { name: 'h_platL', flip: false };
      if (!solid(c + 1, r)) return { name: 'h_airFloor1', flip: false };
      return { name: 'h_plat', flip: false };
    }
    return ringTile(solid, c, r);
  }

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
    shelves = [];
    const used = [];
    for (let k = 0; k < 3; k++) {
      const b = findBlock(V, k, used);
      if (!b) continue;
      used.push(b);
      const chunk = CHUNKS[k];
      if (!chunk) continue;
      // a built chunk of tiles
      const cols = 1 + Math.max(...chunk.cells.map(c => c[0]));
      const rows = 1 + Math.max(...chunk.cells.map(c => c[1]));
      const x = b.x + b.w + SHELF_GAP;
      const avail = ringGeom(V).cR * T - EDGE - x;
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
        if (lm.kind === 'wall') return { kind: lm.kind, x: x + (lm.c + 1) * T - spr.w, y: y + lm.r * T + T - 36 - 3 * S };
        if (lm.kind === 'floor') return { kind: lm.kind, x: x + (lm.c + 1) * T - CW / 2 - 3 * S, y: y + lm.r * T };
        return { kind: lm.kind, x: x + lm.c * T + 3, y: y + lm.r * T - spr.h };
      });
      for (let i = 0; i < lamps.length; i++) {
        lamps[i].on = 0;
        lamps[i].a = 0;
      }
      const cx = x + chunk.crate.c * T + 3, cy = y + chunk.crate.r * T - CW;
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

  // beam length in px from the face to the first solid tile (ring, else a shelf, else the screen edge)
  function reach(l, V) {
    const o = face(l, -V.sy), g = ring && ring._g;
    if (!g) {
      if (l.kind === 'right' || l.kind === 'wall') return Math.max(0, V.W - o.x);
      if (l.kind === 'up' || l.kind === 'floor') return Math.max(0, o.y);
      return Math.max(0, V.H - o.y);
    }
    let d;
    if (l.kind === 'right' || l.kind === 'wall') {
      let r = Math.floor((o.y - g.y0) / T), c = Math.floor((o.x + 1) / T);
      while (!g.solid(c, r)) c++;
      d = c * T - o.x;
    } else if (l.kind === 'up' || l.kind === 'floor') {
      let c = Math.floor(o.x / T), r = Math.floor((o.y - 1 - g.y0) / T);
      while (!g.solid(c, r)) r--;
      d = o.y - (g.y0 + (r + 1) * T);
    } else {
      let c = Math.floor(o.x / T), r = Math.floor((o.y + 1 - g.y0) / T);
      while (!g.solid(c, r)) r++;
      d = g.y0 + r * T - o.y;
    }
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

  function wedge(l, V) {
    const o = face(l, -V.sy);
    const sx = o.x + o.dx * NUDGE, sy = o.y + o.dy * NUDGE;
    const d = Math.max(0, reach(l, V) - NUDGE);
    const h1 = o.half + d * SPREAD;
    const nx = -o.dy, ny = o.dx;
    return [
      [sx + nx * o.half, sy + ny * o.half],
      [sx + o.dx * d + nx * h1, sy + o.dy * d + ny * h1],
      [sx + o.dx * d - nx * h1, sy + o.dy * d - ny * h1],
      [sx - nx * o.half, sy - ny * o.half],
    ];
  }

  function drawWedgePath(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }

  function drawBeams(ctx, V) {
    const ca = 0.20 + 0.03 * Math.sin(clock * 3.1);
    for (const shelf of shelves) {
      for (const l of shelf.lamps) {
        if (!l.a || l.a <= 0) continue;
        const o = face(l, -V.sy);
        if (o.y < -600 || o.y > V.H + 600) continue;
        const pts = wedge(l, V);
        if (reach(l, V) - NUDGE < 2) continue;
        ctx.fillStyle = 'rgba(' + CONE + ',' + (ca * l.a).toFixed(3) + ')';
        drawWedgePath(ctx, pts);
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
        P.glow(ctx, shelf.x + 4.5 * T, shelf.y + 1 * T - V.sy, 39, LAMP_GLOW, .14);
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
        const target = s.x + op.x;
        const dir = target >= c.x ? 1 : -1;
        c.x += dir * SLIDE_V * dt;
        if ((dir > 0 && c.x >= target) || (dir < 0 && c.x <= target)) { c.x = target; c.mode = 'rest'; e.i++; continue; }
        break;
      }
      if (op.op === 'lift') {
        c.mode = 'script';
        const target = s.y + op.y;
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
    buildRing(V);
    drawShelves(ctx, V);
    drawGlows(ctx, V);
    drawBeams(ctx, V);
    ctx.drawImage(ring, 0, 0);
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
    buildRing(V);
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
    const g = ring && ring._g;
    return {
      ring: g ? { y0: g.y0, cols: g.cols, rows: g.rows, cR: g.cR, rB: g.rB, cells: g.cells, bulges: { top: g.bulges.top.length, right: g.bulges.right.length, bottom: g.bulges.bottom.length, left: g.bulges.left.length }, spikes: g.spikes.length } : null,
      shelves: shelves.map(s => ({ k: s.k, x: s.x, y: s.y, w: s.w, tiles: s.tiles, rows: s.rows, cells: s.cells.map(c => ({ c: c.c, r: c.r, name: c.name })), lamps: s.lamps.map(l => l.kind), crates: s.crates.length, boxes: s.crates.map(c => ({ x: Math.round(c.x), y: Math.round(c.y), mode: c.mode, al: c.al === undefined ? 1 : +c.al.toFixed(2) })) })),
      wedges,
      events: evs.map((e, k) => ({ k, state: e.state, t: +e.t.toFixed(2) })),
      hover,
      W: VV && VV.W, H: VV && VV.H,
    };
  }

  P.start({ name: 'heavylight', seed: 11, setup, step, draw, atRest, resize, press, move });
  window.PlayHeavyLight = { report, on, play };
})();
