/* voidscape-mapgen.js — the VoidScape map stage ("vs-map"): a level plan (left) and the same plan tilted and climbing (right) built by the game's own room rules; a press generates a fresh one. */
window.VoidMapgen = (function () {
  /* ---- the map stage ("vs-map", figure#vs-map-stage): the floor plan of one level, top-down ----
     ForgeMissions.genPlan gives the cells (start, stairs, corridor, room, boss, side rooms) and the wall plugs.
     Flat squares on a grid, corridor bars, stairs with chevrons, side rooms on a short stub; lighter = higher,
     the boss room the page's dark red. The cells pop in one by one (GENERATING LEVEL), then rest (LEVEL READY). */
  const U = window.Util, P = window.Play;
  const POP = 0.08, BUILD = 1.2;   // seconds between cells while a level builds, and the most a whole build may take
  const RED = "#6e1a1a";
  let SV = null, sBuilds = 0, sDraws = 0, sT0 = 0, sPlan = null, sPop = POP;

  function sBuild(v) {
    sPlan = ForgeMissions.genPlan({ mods: [] });
    sT0 = v.t;
    sPop = Math.min(POP, BUILD / sPlan.cells.length);
  }

  function sSetup(v) { SV = v; sBuild(v); }
  function sResize(v) { SV = v; }
  function sPress(x, y, v) { sBuilds++; sBuild(v); return true; }
  function sMove(x, y, v) { v.cursor(true); return false; }
  function sDone(v) { return v.reduced || v.t - sT0 > sPlan.cells.length * sPop + 0.2; }
  function sAtRest(v) { return sDone(v); }

  // lighter = higher: a grey-green ramp per kind, from the lowest floor to the highest
  const RAMP = {
    room: ["#4a5a4a", "#e4ddc6"], corridor: ["#2f372f", "#a3ab9f"], stairs: ["#566056", "#f1ecd8"],
    side: ["#3b433b", "#8a9486"], start: ["#2f372f", "#a3ab9f"],
  };
  function shade(c, p) {
    if (c.type === "boss") return RED;
    const r = RAMP[c.type], u = p.maxZ > p.minZ ? (c.z - p.minZ) / (p.maxZ - p.minZ) : 0;
    const a = r[0], b = r[1], ch = i => Math.round(U.mix(parseInt(a.substr(i, 2), 16), parseInt(b.substr(i, 2), 16), u));
    return `rgb(${ch(1)},${ch(3)},${ch(5)})`;
  }

  // geometry: two panels side by side (plan left, side view right) with the key strip under both; a label band tops each panel
  function sGeo(v) {
    const p = sPlan, kh = 22, lh = 14, pw = v.W * 0.4;
    const cols = p.maxX - p.minX + 1, rows = p.maxY - p.minY + 1;
    const s = Math.min((pw - 24) / cols, (v.H - kh - 16 - lh) / rows, 40);
    return {
      s, kh, lh, pw,
      ox: (pw - cols * s) / 2 - p.minX * s,
      oy: lh + (v.H - kh - lh - rows * s) / 2 - p.minY * s,
    };
  }

  // the tilted view: the plan itself seen from its front edge (y squashed by SQ, x sheared by SH * y), each piece lifted by its z so the shape climbs to the boss
  const SQ = 0.5, SH = 0.3;
  // the pieces as the game builds them (walk.html: a tile is 6 units, a cell 4 tiles, walls 5 tall and about 1 thick), in cell units: ceilings left off, a low curb on the sides facing the viewer
  const FT = 0.06, WH = 5 / 24, WT = 1 / 24, CURB = 1 / 16;   // floor plate thickness, wall height, wall thickness, curb height
  const DIRS = [{ x: 1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 1 }];
  const nearDir = d => d.y - SH * d.x > 0;   // an edge whose outer side points toward the viewer, read from the projection (screen depth grows with y - SH * x)
  function wallCol(c, p) {   // the cut top of the wall: the piece's floor lightened (its faces are painted a little darker than the floor)
    if (c.type === "boss") return "#a83a3a";
    const m = shade(c, p).match(/\d+/g);
    return `rgb(${Math.min(255, Math.round(m[0] * 1.15))},${Math.min(255, Math.round(m[1] * 1.15))},${Math.min(255, Math.round(m[2] * 1.15))})`;
  }
  function sParts(c, p, k, cm) {   // the pieces of one cell as boxes on the floor grid, laid out tile by tile as walk.html does: rects in cell units, a top lift (z * k) and a thickness down from it; wall boxes are flagged
    const out = [], col = shade(c, p), wc = wallCol(c, p);
    const add = (x0, y0, x1, y1, lift, t, cl, wl) => { if (x1 - x0 > 0.004 && y1 - y0 > 0.004) out.push({ x0, y0, x1, y1, l: lift, th: t, col: cl, dS: 0, dE: 0, wall: wl }); };
    const doors = new Set();   // the sides this cell opens on: the main chain's neighbours, or the side room sharing its mi
    DIRS.forEach((d, dk) => {
      const n = cm.get((c.x + d.x) + "," + (c.y + d.y));
      if (n && ((c.main && n.main && Math.abs(c.mi - n.mi) === 1) || (c.main !== n.main && c.mi === n.mi))) doors.add(dk);
    });
    const ad = c.dir, nxt = c.main ? p.cells.find(m => m.main && m.mi === c.mi + 1) : null;
    const dzc = c.type === "room" && nxt ? nxt.z - c.z : 0;   // a room that sits 9 higher than the cell it is entered from
    const tl = new Map();   // the tiles of this cell: { z: floor at the low end, rise: climb along the heading (0 = flat) }
    for (let u = 0; u < 4; u++) for (let v = 0; v < 4; v++) {
      const r = ad.x > 0 ? u : ad.x < 0 ? 3 - u : ad.y > 0 ? v : 3 - v, cross = ad.x ? v : u;   // row along the heading
      let t = null;
      if (c.type === "stairs") { if (cross === 1 || cross === 2) t = { z: c.z + 3 * r, rise: 3, r }; }
      else if (c.type === "corridor") {
        let open = (u === 1 || u === 2) && (v === 1 || v === 2);
        for (const dk of doors) { const d = DIRS[dk]; if ((d.x > 0 && u === 3 || d.x < 0 && u === 0) && (v === 1 || v === 2) || (d.y > 0 && v === 3 || d.y < 0 && v === 0) && (u === 1 || u === 2)) open = true; }
        if (open) t = { z: c.z, rise: 0, r };
      } else t = dzc && r === 0 ? { z: c.z, rise: dzc, r } : { z: c.z + dzc, rise: 0, r };
      if (t) tl.set(u + "," + v, t);
    }
    // floors: flat tiles merged into rects, step tiles as rows of three steps each, solid down to the low end
    const done = new Set();
    for (let v = 0; v < 4; v++) for (let u = 0; u < 4; u++) {
      const t = tl.get(u + "," + v);
      if (!t || t.rise || done.has(u + "," + v)) continue;
      let u1 = u; while (u1 < 3 && !done.has((u1 + 1) + "," + v) && tl.get((u1 + 1) + "," + v) && !tl.get((u1 + 1) + "," + v).rise && tl.get((u1 + 1) + "," + v).z === t.z) u1++;
      let v1 = v; const ok = y => { for (let i = u; i <= u1; i++) { const q = tl.get(i + "," + y); if (!q || q.rise || q.z !== t.z || done.has(i + "," + y)) return false; } return true; };
      while (v1 < 3 && ok(v1 + 1)) v1++;
      for (let j = v; j <= v1; j++) for (let i = u; i <= u1; i++) done.add(i + "," + j);
      add(c.x + u / 4, c.y + v / 4, c.x + (u1 + 1) / 4, c.y + (v1 + 1) / 4, t.z * k, FT, col, false);
    }
    for (let r = 0; r < 4; r++) {
      const row = []; for (const [key, t] of tl) if (t.rise && t.r === r) { const [u, v] = key.split(",").map(Number); row.push(ad.x ? v : u); }
      if (!row.length) continue;
      const t0 = [...tl.values()].find(t => t.rise && t.r === r), cmin = Math.min(...row), cmax = Math.max(...row);
      for (let i = 0; i < 3; i++) {
        const s0 = (r + i / 3) / 4, s1 = (r + (i + 1) / 3) / 4, top = t0.z + t0.rise * (i + 1) / 3;
        const a0 = ad.x > 0 ? c.x + s0 : ad.x < 0 ? c.x + 1 - s1 : c.x + cmin / 4, a1 = ad.x > 0 ? c.x + s1 : ad.x < 0 ? c.x + 1 - s0 : c.x + (cmax + 1) / 4;
        const b0 = ad.y > 0 ? c.y + s0 : ad.y < 0 ? c.y + 1 - s1 : c.y + cmin / 4, b1 = ad.y > 0 ? c.y + s1 : ad.y < 0 ? c.y + 1 - s0 : c.y + (cmax + 1) / 4;
        add(a0, b0, a1, b1, top * k, FT + (top - c.z) * k, col, false);
      }
    }
    // walls on every tile edge that is not inside the cell and not a doorway (the middle two tiles of a door side); a curb where the outer side faces the viewer
    const wl = new Map();
    const put = (x0, y0, x1, y1, z, d) => { const t = nearDir(d) ? CURB : WH; add(x0, y0, x1, y1, z * k + t, t, wc, true); };
    for (const [key, t] of tl) {
      const [u, v] = key.split(",").map(Number);
      DIRS.forEach((d, dk) => {
        const nu = u + d.x, nv = v + d.y, cr = d.x ? v : u;
        if (nu >= 0 && nu < 4 && nv >= 0 && nv < 4 ? tl.has(nu + "," + nv) : doors.has(dk) && (cr === 1 || cr === 2)) return;
        const along = d.x ? v : u, line = d.x ? u : v;
        const ex = d.x > 0 ? c.x + (u + 1) / 4 - WT : d.x < 0 ? c.x + u / 4 : null, ey = d.y > 0 ? c.y + (v + 1) / 4 - WT : d.y < 0 ? c.y + v / 4 : null;
        const ends = (d.x > 0 || d.y > 0) === (ad.x > 0 || ad.y > 0);   // this edge faces up the heading
        const parallel = ad.x ? d.x : d.y;   // a step tile's end edge (d along the heading) is flat at one height; its side edges follow the steps
        if (t.rise && !parallel) {
          for (let i = 0; i < 3; i++) {
            const s0 = (t.r + i / 3) / 4, s1 = (t.r + (i + 1) / 3) / 4, top = t.z + t.rise * (i + 1) / 3;
            const a0 = ad.x > 0 ? c.x + s0 : ad.x < 0 ? c.x + 1 - s1 : 0, a1 = ad.x > 0 ? c.x + s1 : ad.x < 0 ? c.x + 1 - s0 : 0;
            const b0 = ad.y > 0 ? c.y + s0 : ad.y < 0 ? c.y + 1 - s1 : 0, b1 = ad.y > 0 ? c.y + s1 : ad.y < 0 ? c.y + 1 - s0 : 0;
            put(d.x ? ex : a0, d.y ? ey : b0, d.x ? ex + WT : a1, d.y ? ey + WT : b1, top, d);
          }
        } else {
          const z = t.rise && ends ? t.z + t.rise : t.z, id = dk + "|" + line + "|" + z;
          if (!wl.has(id)) wl.set(id, { d, ex, ey, line, z, al: [] });
          wl.get(id).al.push(along);
        }
      });
    }
    for (const w of wl.values()) {   // runs of neighbouring tiles along one edge become one box
      w.al.sort((a, b) => a - b);
      for (let i = 0; i < w.al.length;) {
        let j = i; while (j + 1 < w.al.length && w.al[j + 1] === w.al[j] + 1) j++;
        const a0 = w.al[i] / 4, a1 = (w.al[j] + 1) / 4;
        put(w.d.x ? w.ex : c.x + a0, w.d.y ? w.ey : c.y + a0, w.d.x ? w.ex + WT : c.x + a1, w.d.y ? w.ey + WT : c.y + a1, w.z, w.d);
        i = j + 1;
      }
    }
    return out;
  }
  function sSide(v, geo) {
    const p = sPlan;
    const k = 1 / 24;   // the game's own slope: a cell is 24 game units, so a stairs cell (12 up) climbs half a cell
    const cm = new Map(p.cells.map(c => [c.x + "," + c.y, c]));
    const groups = p.cells.map((c, i) => {   // back to front: the cells by depth, inside each one its floors first, then its walls
      const qs = sParts(c, p, k, cm), key = q => (q.y0 + q.y1) / 2 - SH * (q.x0 + q.x1) / 2 + SQ * q.l;
      for (const q of qs) q.ci = i;
      qs.sort((m, n) => (m.wall - n.wall) || key(m) - key(n));
      return { key: c.y + 0.5 - SH * (c.x + 0.5) + SQ * c.z * k, qs };
    });
    groups.sort((m, n) => m.key - n.key);
    const parts = [].concat(...groups.map(g => g.qs));
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    const floor = Math.min(...parts.map(q => q.l - q.th - Math.max(q.dS, q.dE)));   // the ground the floor shadow lies on: under the lowest foot
    for (const q of parts) for (const [x, y, l] of [[q.x0, q.y0, q.l], [q.x1, q.y0, q.l], [q.x0, q.y1, q.l], [q.x1, q.y1, q.l],
        [q.x0, q.y1, q.l - q.th - q.dS], [q.x1, q.y1, q.l - q.th - q.dE], [q.x0, q.y1, floor], [q.x1, q.y1, floor]]) {   // the top corners and the foot of the front sides
      x0 = Math.min(x0, x + SH * y); x1 = Math.max(x1, x + SH * y); y0 = Math.min(y0, y * SQ - l); y1 = Math.max(y1, y * SQ - l);
    }
    const ax = geo.pw + 12, ay = geo.lh + 8, aw = v.W - geo.pw - 24, ah = v.H - geo.kh - 8 - ay;
    const f = Math.min(aw / (x1 - x0), ah / (y1 - y0), 60);
    const ox = ax + (aw - (x1 - x0) * f) / 2 - x0 * f, oy = ay + (ah - (y1 - y0) * f) / 2 - y0 * f;
    return { parts, f, k, floor, w: (x1 - x0) * f, h: (y1 - y0) * f, pt: (x, y, l) => [ox + (x + SH * y) * f, oy + (y * SQ - l) * f] };
  }
  function sSidePart(g, q, sd) {
    const P = sd.pt, f = sd.f, a = P(q.x0, q.y0, q.l), b = P(q.x1, q.y0, q.l), c = P(q.x1, q.y1, q.l), d = P(q.x0, q.y1, q.l);
    const face = (u, w, drop, shade) => {
      g.fillStyle = q.col; g.beginPath(); g.moveTo(u[0], u[1]); g.lineTo(w[0], w[1]); g.lineTo(w[0], w[1] + (q.th + drop) * f); g.lineTo(u[0], u[1] + (q.th + drop) * f); g.closePath(); g.fill();
      g.fillStyle = shade; g.fill();
    };
    face(d, c, q.dS, q.wall ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.5)");   // the front-left side (wall faces stay near the floor colour)
    face(a, d, q.dS, q.wall ? "rgba(0,0,0,0.22)" : "rgba(0,0,0,0.32)");   // the west side: the view recedes up and left, so west shows, east hides under the top
    g.fillStyle = q.col; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fill();
  }

  function sCell(g, c, p, k, geo) {
    const s = geo.s, cx = geo.ox + c.x * s + s / 2, cy = geo.oy + c.y * s + s / 2;
    g.fillStyle = shade(c, p);
    if (c.type === "side") {
      g.fillRect(cx - s * 0.3, cy - s * 0.3, s * 0.6, s * 0.6);
      return;
    }
    // the sides this piece joins: toward the previous and the next main cell, by grid position
    const dirs = [];
    for (const n of [p.cells.find(m => m.main && m.mi === c.mi - 1), p.cells.find(m => m.main && m.mi === c.mi + 1)])
      if (n) dirs.push({ x: Math.sign(n.x - c.x), y: Math.sign(n.y - c.y) });
    const room = c.type === "room" || c.type === "boss";
    const bw = c.type === "stairs" ? s * 0.5 : s * 0.36;
    if (room) {
      const h = c.type === "boss" ? 0.47 : 0.39;
      g.fillRect(cx - s * h, cy - s * h, s * h * 2, s * h * 2);
    }
    if (c.type === "start") g.fillRect(cx - s * 0.3, cy - s * 0.3, s * 0.6, s * 0.6);   // a pad, so the bracket has a piece to hold
    else if (!room) g.fillRect(cx - bw / 2, cy - bw / 2, bw, bw);   // fills the inside corner of an L
    for (const d of dirs) {   // an arm from the centre to the shared edge, so every join meets
      const len = s / 2;
      g.fillRect(d.x < 0 ? cx - len : cx - (d.x ? 0 : bw / 2), d.y < 0 ? cy - len : cy - (d.y ? 0 : bw / 2), d.x ? len : bw, d.y ? len : bw);
    }
    if (c.type === "stairs" && dirs.length) {
      const horiz = dirs[0].x !== 0;
      g.fillStyle = "rgba(0,0,0,0.5)";   // three rungs across the ramp, so it reads as stairs
      for (let i = 1; i < 4; i++) {
        const t = i / 4 - 0.5;
        if (horiz) g.fillRect(cx + t * s - 1, cy - bw / 2, 2, bw); else g.fillRect(cx - bw / 2, cy + t * s - 1, bw, 2);
      }
    }
  }

  function sStub(g, c, geo) {   // a door strip from the parent's centre to the side room's, drawn under both
    const s = geo.s, cx = geo.ox + c.x * s + s / 2, cy = geo.oy + c.y * s + s / 2, w = s * 0.24;
    g.fillStyle = "#4a524a";
    g.fillRect(Math.min(cx, cx - c.dir.x * s) - (c.dir.x ? 0 : w / 2), Math.min(cy, cy - c.dir.y * s) - (c.dir.y ? 0 : w / 2), c.dir.x ? s : w, c.dir.y ? s : w);
  }

  function sKey(g, v, geo) {
    const items = [["start", null], ["room","#e4ddc6"], ["corridor", "#a3ab9f"], ["stairs", "#f1ecd8"], ["side room", "#8a9486"], ["boss", RED]];
    g.font = "11px 'Space Mono', monospace"; g.textBaseline = "middle";
    let w = 0;
    for (const [t] of items) w += 14 + g.measureText(t).width + 14;
    let x = (v.W - w) / 2 + 7;
    const y = v.H - geo.kh / 2 - 2;
    for (const [t, col] of items) {
      if (col) { g.fillStyle = col; g.fillRect(x, y - 4, 8, 8); } else sBracket(g, x - 1, y - 5, x + 9, y + 5, 4);
      g.fillStyle = "#c9c3ae"; g.fillText(t, x + 14, y);
      x += 14 + g.measureText(t).width + 14;
    }
  }

  function sBracket(g, l, t, r, bt, L = 9) {
    const T = 2;
    g.fillStyle = "#f1ecd8";
    for (const [x, y, dx, dy] of [[l, t, 1, 1], [r, t, -1, 1], [l, bt, 1, -1], [r, bt, -1, -1]]) {
      g.fillRect(dx > 0 ? x : x - L, dy > 0 ? y : y - T, L, T);
      g.fillRect(dx > 0 ? x : x - T, dy > 0 ? y : y - L, T, L);
    }
  }

  let VC = null;   // the tilted view for the current level and size: its geometry, and its picture once the level has popped in
  function sViewGet(v, geo) {
    if (!VC || VC.plan !== sPlan || VC.W !== v.W || VC.H !== v.H || VC.dpr !== v.dpr) VC = { plan: sPlan, W: v.W, H: v.H, dpr: v.dpr, sd: sSide(v, geo), cv: null };
    return VC;
  }
  function sViewPaint(g, sd, shown) {
    g.fillStyle = "rgba(241,236,216,0.043)"; g.beginPath();   // the floor shadow: the footprint flat at the lowest z, one path so overlaps do not stack
    for (const q of sd.parts) if (q.ci < shown && !q.wall) {
      const a = sd.pt(q.x0, q.y0, sd.floor), b = sd.pt(q.x1, q.y0, sd.floor), c = sd.pt(q.x1, q.y1, sd.floor), d = sd.pt(q.x0, q.y1, sd.floor);
      g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath();
    }
    g.fill();
    for (const q of sd.parts) if (q.ci < shown) sSidePart(g, q, sd);
  }

  function sDraw(g, v) {
    sDraws++;
    SV = v;
    const p = sPlan, geo = sGeo(v);
    const shown = v.reduced ? p.cells.length : Math.floor((v.t - sT0) / sPop) + 1;
    for (let i = 0; i < p.cells.length && i < shown; i++) if (!p.cells[i].main) sStub(g, p.cells[i], geo);
    for (let i = 0; i < p.cells.length && i < shown; i++) sCell(g, p.cells[i], p, i, geo);
    const vc = sViewGet(v, geo), sd = vc.sd;
    if (sDone(v)) {   // the level has finished popping in: one offscreen picture of the view, drawn each frame
      if (!vc.cv) {
        vc.cv = document.createElement("canvas"); vc.cv.width = Math.round(v.W * v.dpr); vc.cv.height = Math.round(v.H * v.dpr);
        const g2 = vc.cv.getContext("2d"); g2.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
        sViewPaint(g2, sd, p.cells.length);
      }
      g.drawImage(vc.cv, 0, 0, v.W, v.H);
    } else sViewPaint(g, sd, shown);
    g.fillStyle = "rgba(201,195,174,0.25)"; g.fillRect(Math.round(geo.pw), 6, 1, v.H - geo.kh - 12);   // the hairline between the panels
    g.font = "11px 'Space Mono', monospace"; g.textBaseline = "middle"; g.fillStyle = "#c9c3ae";
    g.fillText("PLAN", 12, 14); g.fillText("VIEW", geo.pw + 12, 14);
    sKey(g, v, geo);
    if (!sBuilds && p.cells.length) {
      const c = p.cells[0], s = geo.s, m = 5;
      sBracket(g, geo.ox + c.x * s - m, geo.oy + c.y * s - m, geo.ox + (c.x + 1) * s + m, geo.oy + (c.y + 1) * s + m);
      let l = 1e9, t = 1e9, r = -1e9, b = -1e9;   // the start's own pieces, corner to corner
      for (const q of sd.parts) if (q.ci === 0) for (const [x, y, z] of [[q.x0, q.y0, q.l], [q.x1, q.y0, q.l], [q.x0, q.y1, q.l - q.th], [q.x1, q.y1, q.l - q.th]]) {
        const [px, py] = sd.pt(x, y, z);
        l = Math.min(l, px); r = Math.max(r, px); t = Math.min(t, py); b = Math.max(b, py);
      }
      sBracket(g, l - m, t - m, r + m, b + m);
    }
    v.status(sDone(v) ? "LEVEL READY" : "GENERATING LEVEL");
  }

  function sClient(px, py) {
    const r = SV.canvas.getBoundingClientRect();
    return { x: r.left + px, y: r.top + py };
  }
  function report() {
    if (!SV || !sPlan) return null;
    const geo = sGeo(SV);
    const cells = sPlan.cells.map(c => Object.assign({ type: c.type, main: c.main, gx: c.x, gy: c.y, z: c.z },
      sClient(geo.ox + c.x * geo.s + geo.s / 2, geo.oy + c.y * geo.s + geo.s / 2)));
    const sd = sViewGet(SV, geo).sd, ph = SV.H - geo.kh;
    const side = sPlan.cells.filter(c => c.main).sort((a, b) => a.mi - b.mi).map(c => sClient(...sd.pt(c.x + 0.5, c.y + 0.5, c.z * sd.k)));   // each main cell's centre in the tilted view
    const panels = [sClient(0, 0), sClient(geo.pw, 0)].map((o, i) => ({ x: o.x, y: o.y, w: i ? SV.W - geo.pw : geo.pw, h: ph }));
    return {
      side, panels, footW: sd.w, footH: sd.h, f: sd.f, cells, rooms: cells.filter(c => c.type === "room").length, builds: sBuilds, marker: !sBuilds, draws: sDraws,
      done: sDone(SV), targets: { generate: sClient(SV.W / 2, SV.H / 2) },
    };
  }

  if (U && P && window.ForgeMissions) {
    P.register({ name: "vs-map", seed: 29, tick: 2147483647, setup: sSetup, draw: sDraw, resize: sResize, atRest: sAtRest, press: sPress, move: sMove });
    P.stage(document.getElementById("vs-map-stage"), "vs-map");
  }

  return { report };
})();
