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
    const p = sPlan, kh = 22, lh = 14, pw = v.W / 2;
    const cols = p.maxX - p.minX + 1, rows = p.maxY - p.minY + 1;
    const s = Math.min((pw - 24) / cols, (v.H - kh - 16 - lh) / rows, 40);
    return {
      s, kh, lh, pw,
      ox: (pw - cols * s) / 2 - p.minX * s,
      oy: lh + (v.H - kh - lh - rows * s) / 2 - p.minY * s,
    };
  }

  // the tilted view: the plan itself seen from its front edge (y squashed by SQ, x sheared by SH * y), each piece lifted by its z so the shape climbs to the boss
  const SQ = 0.5, SH = 0.3, LIFT = 0.6;
  // the pieces as the game builds them (a floor tile is 6 units, walls 5 tall and 1 thick), in cell units: ceilings left off, walls cut to half height, a low curb on the two sides facing the viewer
  const FT = 0.06, WH = 1 / 4, WT = 1 / 8, CURB = WH / 4;   // floor plate thickness, wall height, wall thickness, curb height
  const FW = { start: 0.6, room: 0.78, boss: 0.94, side: 0.6, corridor: 0.36, stairs: 0.5 };   // floor width per kind, as in the plan
  function wallCol(c, p) {   // the cut top of the wall: the piece's floor lightened (its faces are painted a little darker than the floor)
    if (c.type === "boss") return "#a83a3a";
    const m = shade(c, p).match(/\d+/g);
    return `rgb(${Math.min(255, Math.round(m[0] * 1.15))},${Math.min(255, Math.round(m[1] * 1.15))},${Math.min(255, Math.round(m[2] * 1.15))})`;
  }
  function sParts(c, p, k) {   // the pieces of one cell as boxes on the floor grid: rects in cell units, a top lift (z * k) and a thickness down from it; wall boxes are flagged
    const out = [], l = c.z * k, cx = c.x + 0.5, cy = c.y + 0.5, col = shade(c, p), wc = wallCol(c, p), w = FW[c.type], h = w / 2;
    const add = (x0, y0, x1, y1, lift, t, cl, wl) => { if (x1 - x0 > 0.004 && y1 - y0 > 0.004) out.push({ x0, y0, x1, y1, l: lift, th: t, col: cl, dS: 0, dE: 0, wall: wl }); };
    const wall = (x0, y0, x1, y1, base, south, west) => { const t = south || west ? CURB : WH; add(x0, y0, x1, y1, base + t, t, wc, true); };
    const joins = [];   // the sides this piece opens on, each as wide as the narrower of the two floors it joins
    const join = (o, dx, dy) => joins.push({ x: dx, y: dy, gw: Math.min(w, FW[o.type]) });
    const ns = [];
    if (c.type === "side") join(p.cells.find(m => m.x === c.x - c.dir.x && m.y === c.y - c.dir.y) || c, -c.dir.x, -c.dir.y);
    else {
      for (const n of [p.cells.find(m => m.main && m.mi === c.mi - 1), p.cells.find(m => m.main && m.mi === c.mi + 1)]) if (n) { ns.push(n); join(n, Math.sign(n.x - c.x), Math.sign(n.y - c.y)); }
      for (const m of p.cells) if (!m.main && m.x - m.dir.x === c.x && m.y - m.dir.y === c.y) join(m, m.dir.x, m.dir.y);
    }
    const jn = (dx, dy) => joins.find(j => j.x === dx && j.y === dy);
    const o = h + WT;
    if (c.type === "stairs" && ns.length) {   // a ramp: four steps from the top of the piece it leaves up to the top of the piece it enters, a solid wedge so nothing floats, a low wall down each side
      const d = joins[0], z1 = (ns.find(n => n.mi === c.mi + 1) || c).z, z0 = (ns.find(n => n.mi === c.mi - 1) || c).z;
      for (let j = 0; j < 4; j++) {
        const a = 0.5 - j / 4, b = 0.5 - (j + 1) / 4, xa = cx + d.x * a, xb = cx + d.x * b, ya = cy + d.y * a, yb = cy + d.y * b;
        const xl = Math.min(xa, xb), xh = Math.max(xa, xb), yl = Math.min(ya, yb), yh = Math.max(ya, yb), top = (z0 + (z1 - z0) * (j + 1) / 4) * k;
        add(xl - (d.x ? 0 : h), yl - (d.y ? 0 : h), xh + (d.x ? 0 : h), yh + (d.y ? 0 : h), top, FT + top - z0 * k, col, false);
        if (d.x) { wall(xl, cy - o, xh, cy - h, top, false, false); wall(xl, cy + h, xh, cy + o, top, true, false); }
        else { wall(cx - o, yl, cx - h, yh, top, false, true); wall(cx + h, yl, cx + o, yh, top, false, false); }
      }
      return out;
    }
    if (c.type !== "corridor" && c.type !== "stairs") {   // a room-like piece: the floor, arms to the shared edges, walls on its own edges with a gap at each door
      const X0 = cx - h, X1 = cx + h, Y0 = cy - h, Y1 = cy + h;
      add(X0, Y0, X1, Y1, l, FT, col, false);
      for (const j of joins) add(j.x < 0 ? cx - 0.5 : j.x > 0 ? X1 : cx - j.gw / 2, j.y < 0 ? cy - 0.5 : j.y > 0 ? Y1 : cy - j.gw / 2,
        j.x < 0 ? X0 : j.x > 0 ? cx + 0.5 : cx + j.gw / 2, j.y < 0 ? Y0 : j.y > 0 ? cy + 0.5 : cy + j.gw / 2, l, FT, col, false);
      const gap = (a0, a1, j, gc, put) => { if (!j) put(a0, a1); else { put(a0, Math.min(a1, gc - j.gw / 2)); put(Math.max(a0, gc + j.gw / 2), a1); } };
      gap(X0, X1, jn(0, -1), cx, (a, b) => wall(a, Y0, b, Y0 + WT, l, false, false));
      gap(X0, X1, jn(0, 1), cx, (a, b) => wall(a, Y1 - WT, b, Y1, l, true, false));
      gap(Y0 + WT, Y1 - WT, jn(-1, 0), cy, (a, b) => wall(X0, a, X0 + WT, b, l, false, true));
      gap(Y0 + WT, Y1 - WT, jn(1, 0), cy, (a, b) => wall(X1 - WT, a, X1, b, l, false, false));
      return out;
    }
    add(cx - h, cy - h, cx + h, cy + h, l, FT, col, false);   // a corridor: the strip as narrow as in the plan, low walls just outside it on both long sides, open ends
    for (const j of joins) {
      if (j.x) {
        const a = j.x < 0 ? cx - 0.5 : cx + h, b = j.x < 0 ? cx - h : cx + 0.5;
        add(a, cy - h, b, cy + h, l, FT, col, false); wall(a, cy - o, b, cy - h, l, false, false); wall(a, cy + h, b, cy + o, l, true, false);
      } else {
        const a = j.y < 0 ? cy - 0.5 : cy + h, b = j.y < 0 ? cy - h : cy + 0.5;
        add(cx - h, a, cx + h, b, l, FT, col, false); wall(cx - o, a, cx - h, b, l, false, true); wall(cx + h, a, cx + o, b, l, false, false);
      }
    }
    if (!jn(0, -1)) wall(cx - o, cy - o, cx + o, cy - h, l, false, false);
    if (!jn(0, 1)) wall(cx - o, cy + h, cx + o, cy + o, l, true, false);
    if (!jn(-1, 0)) wall(cx - o, cy - h, cx - h, cy + h, l, false, true);
    if (!jn(1, 0)) wall(cx + h, cy - h, cx + o, cy + h, l, false, false);
    return out;
  }
  function sSide(v, geo) {
    const p = sPlan;
    const zs = p.cells.map(c => c.z), zr = Math.max(...zs) - Math.min(...zs);
    const k = zr > 0 ? (LIFT / (1 - LIFT)) * (p.maxY - p.minY + 1) * SQ / zr : 0;   // the whole climb takes about LIFT of the panel's height, the footprint the rest
    const groups = p.cells.map((c, i) => {   // back to front: the cells by depth, inside each one its floors first, then its walls
      const qs = sParts(c, p, k), key = q => (q.y0 + q.y1) / 2 - SH * (q.x0 + q.x1) / 2 + SQ * q.l;
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
    const ax = geo.pw + 12, ay = geo.lh + 8, aw = geo.pw - 24, ah = v.H - geo.kh - 8 - ay;
    const f = Math.min(aw / (x1 - x0), ah / (y1 - y0), 60);
    const ox = ax + (aw - (x1 - x0) * f) / 2 - x0 * f, oy = ay + (ah - (y1 - y0) * f) / 2 - y0 * f;
    return { parts, f, k, floor, w: (x1 - x0) * f, pt: (x, y, l) => [ox + (x + SH * y) * f, oy + (y * SQ - l) * f] };
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
    const items = [["room", "#e4ddc6"], ["corridor", "#a3ab9f"], ["stairs", "#f1ecd8"], ["side room", "#8a9486"], ["boss", RED]];
    g.font = "11px 'Space Mono', monospace"; g.textBaseline = "middle";
    let w = 0;
    for (const [t] of items) w += 14 + g.measureText(t).width + 14;
    let x = (v.W - w) / 2 + 7;
    const y = v.H - geo.kh / 2 - 2;
    for (const [t, col] of items) {
      g.fillStyle = col; g.fillRect(x, y - 4, 8, 8);
      g.fillStyle = "#c9c3ae"; g.fillText(t, x + 14, y);
      x += 14 + g.measureText(t).width + 14;
    }
  }

  function sBracket(g, l, t, r, bt) {
    const L = 9, T = 2;
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
    g.fillStyle = "rgba(241,236,216,0.13)"; g.beginPath();   // the floor shadow: the footprint flat at the lowest z, one path so overlaps do not stack
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
    for (const w of p.walls) {   // wall plugs: a short bar across the door
      const cx = geo.ox + w.x * geo.s + geo.s / 2 + w.dir.x * geo.s * 0.5, cy = geo.oy + w.y * geo.s + geo.s / 2 + w.dir.y * geo.s * 0.5;
      if (w.mi > shown) continue;
      g.fillStyle = "#6f7a6f";
      g.fillRect(cx - (w.dir.x ? 1.5 : geo.s * 0.15), cy - (w.dir.y ? 1.5 : geo.s * 0.15), w.dir.x ? 3 : geo.s * 0.3, w.dir.y ? 3 : geo.s * 0.3);
    }
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
    const panels = [sClient(0, 0), sClient(geo.pw, 0)].map(o => ({ x: o.x, y: o.y, w: geo.pw, h: ph }));
    const ramps = [];   // each stair ramp's gap in px: its last step's top to the top of the piece it enters, its first step's foot to the top of the piece it leaves (0 or less = joined)
    for (const c of sPlan.cells) if (c.main && c.type === "stairs") {
      const st = sd.parts.filter(q => q.ci === sPlan.cells.indexOf(c) && !q.wall).sort((m, n) => m.l - n.l), nx = sPlan.cells.find(m => m.main && m.mi === c.mi + 1), pv = sPlan.cells.find(m => m.main && m.mi === c.mi - 1);
      if (st.length === 4 && nx && pv) ramps.push([Math.abs(st[3].l - nx.z * sd.k) * sd.f, (st[0].l - st[0].th - pv.z * sd.k) * sd.f]);
    }
    return {
      side, panels, ramps, footW: sd.w, cells, rooms: cells.filter(c => c.type === "room").length, builds: sBuilds, marker: !sBuilds, draws: sDraws,
      done: sDone(SV), targets: { generate: sClient(SV.W / 2, SV.H / 2) },
    };
  }

  if (U && P && window.ForgeMissions) {
    P.register({ name: "vs-map", seed: 29, tick: 2147483647, setup: sSetup, draw: sDraw, resize: sResize, atRest: sAtRest, press: sPress, move: sMove });
    P.stage(document.getElementById("vs-map-stage"), "vs-map");
  }

  return { report };
})();
