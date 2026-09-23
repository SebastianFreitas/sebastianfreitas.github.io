/* zones.js — ambient backdrop art for three Game Dev sector planets so each
   area feels like its game: Conclusus (real 32px sprites from the game,
   embedded as pixel data below), HeavyLight (hand-drawn cave tiles, spikes,
   crate, red figure, red key, blue light cone) and VoidScape (rising embers
   plus three lime shards). bridge.js draws this BEFORE the planets, storm,
   forge and ship, so it is pure backdrop and never has to hit-test. Every
   static thing is pre-rendered once to an offscreen canvas and blitted with
   drawImage; per frame there are only blits, a few dozen fillRects and two
   or three cached gradients. */
window.Zones = (function () {
  const { mix, mulberry, hash1 } = Util;

  const MIN_W = 900;   // same threshold forge.js uses: no zone art on narrow screens
  const OFF   = 900;   // skip a zone whose planet centre is further than this off the left/right screen edge
  const S     = 2;     // Conclusus sprites are 32px art drawn at 2x

  const DECK = 0.62;                                  // screen fraction of H where the bridge deck line is (same as storm.js FLOOR)
  const roomBelow = (env, at) => DECK * env.H - at.y; // px from a planet centre down to the deck line

  let T = 0;
  const canvases = new Map();   // name -> offscreen canvas (or null if it failed to build)
  let lastReport = {
    t: 0,
    zones: {
      conclusus:  { x: 0, y: 0, drawn: false },
      heavylight: { x: 0, y: 0, drawn: false },
      voidscape:  { x: 0, y: 0, drawn: false },
    },
  };

  /* ---- shared drifting-speck motion: x = bx + sin(T*w1+p1)*ax, etc ---- */
  function makeMotes(rnd, n, n2, bxr, byr, axr, ayr, avoid) {
    const arr = [];
    for (let i = 0; i < n; i++) {
      let bx, by;
      do {
        bx = mix(bxr[0], bxr[1], rnd());
        by = mix(byr[0], byr[1], rnd());
      } while (avoid && bx * bx + by * by < avoid * avoid);
      arr.push({
        bx, by,
        ax: mix(axr[0], axr[1], rnd()),
        ay: mix(ayr[0], ayr[1], rnd()),
        w1: mix(0.15, 0.40, rnd()),
        w2: mix(0.15, 0.40, rnd()),
        w3: mix(0.15, 0.40, rnd()),
        p1: rnd() * Math.PI * 2,
        p2: rnd() * Math.PI * 2,
        p3: rnd() * Math.PI * 2,
        size: i < n2 ? 2 : 3,
      });
    }
    return arr;
  }
  /* ================= Conclusus (seed 7) ================= */
  const CPAL = ["#b4c788","#62554c","#463c3c","#f7ffc5","#8b6a44","#312629","#d6f5e4","#8a8969"];
  const CSPR = {
    tileA: { w:32, h:14, ox:0, oy:12, px:"...................a..................a.............a..a....a....aa..aa..a...aa..a..a.aaa.aa...a.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaabbaabbbbaabaabbaababbbaaaaaaababbbbbabbbababbbbbabbbbabaabaacabbbbbbbbbabbbbbbbabbbbbbbabbbacbbcbbbbbbbbbbbbbbbbbbbbbbbbabbaccbcbbcbbbbbbbbbbbbbbbbbbbbbbbbaccbbcbbcbcbbbcbbbbbbbbbbbbbbbbbc.cccccbcccccbbcbbbbbbbbbbbbbbbc.c.ccccccccccccccbccccbcccbcbcc.c....c.c...cc...cc....cc..c.c.............c............c........." },
    tileB: { w:32, h:14, ox:0, oy:12, px:"...................a................................a.......a....aa......a...aa.....a.....aa.....aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaabaaababbbbbaabaaababbbaabbaaaaababbabbbabbaabbbbaabbbabbbbabacabbabbbbabbbbbbbbbabbbbbabbbbaacbbbbbbbbbbbbbbbabbbabbbabbbbbbaccbbbccbbbbbbbbbbbbbbbbbbbbbbbbaccbbccbbcbbbcbbbbbbbbbbbbbbbbbbc.cccccbcbbcccbbbbbbbbbbbbbbbbbc.c.ccccccccccccccbccccbbccbcbcc.c....ccc..ccc..ccc.cc.cc..c.c..........c..c........c............." },
    door0: { w:28, h:31, ox:2, oy:1, px:"............dddd......................ddaaaadd..................ddaa.a..aadd..............ddaa.......aaadd............aaa.........a.aa...........ddaa........a..add...........da............ad..........ddda............addd.........aa.............aaa.........dd.a..............dd.........a...............aa..........da...............d..........aa..............aa.........dda...............dd.........a................a.........dda.............aadd.......d.da............a.ad.d........da............a.ad........d.aa..............aa.d.......dda..............add.........da..............ad........dddaa............aaddd........da.a............ad.........dda..............add.......dada..............adad....dd.ada..............ada.dd....dada......a.......adad.....aaada.....a.......aadaaa...dadddaa..a..a...a...adddad...aaada..a...aa...a.aadaaaa.aaddddaaaaaaaaaaaaaaaaddddaa" },
    door1: { w:30, h:32, ox:1, oy:0, px:"..............dd...........................dddd........................ddaaaadd..................d.ddaa.a..aadd.d..............ddaa.......aaadd..............aaa.........a.aa............dddaa........a..addd............da............ad............ddda............addd...........aa.............aaa...........dd.a..............dd...........a...............aa...........eea...............e............ea..............aae..........dda...............dd.........e.a................aaa.......e.eea.............aaeea.a....a.ddd.............a..ddda......aaaea............a.aee........addd................dd........aeeea..............ae...........eaa..............aeaa.......aeeeaa............aaeee......a.aaaa.a............aaea........aeea..............aeeaa........aaa..............aaae........aaea..............aeaa........eaaa......a.......aaeee......aaaea.....a.......aaeaa......eaeeeaa..a..a...a...aeee.....eaaaaaa..a...aa...a.aaaaaaea.eeaeeaeaaaaaaaaaaaaaaaaeaeeaee" },
    idle0: { w:8, h:26, ox:11, oy:6, px:"...b.......bbbb...bbbd.....dfd......dd.....gff...hhhgfg..hhhheg..hhhheh.hh.hheh.hh.hhbh.hh.hhbh.hhhhhbhhgghhhehg.dhhheed..hhhee...hhhee..hhhh.e..hhhh.e..hhhh.e..hhh..e...e...e...e...e...e...e...b...b...b...b." },
    idle1: { w:8, h:25, ox:11, oy:7, px:"...b.......bbbb...bbbd.....dfd......dd.....gff...hhhgfg..hhhheg..hhhheh.hh.hheh.hh.hhbh.hh.hhbhhgghhhbhg.dhhhehd..hhhee...hhhee...hhhee..hhhh.e..hhhh.e..hhhh.e..hhh..e...e...e...e...e...b...b...b...b." },
    sym0:  { w:10, h:10, ox:11, oy:11, px:"....dd..................dd.......dddd...d.dddddd.dd.dddddd.d...dddd.......dd..................dd...." },
    sym1:  { w:12, h:12, ox:10, oy:10, px:".....dd...................d..........................dd.....d...dddd...dd...dddd...d.....dd..........................d...................dd....." },
  };

  function spriteCanvas(name) {
    if (canvases.has(name)) return canvases.get(name);
    if (typeof document === "undefined") { canvases.set(name, null); return null; }
    const s = CSPR[name];
    if (!s || s.px.length !== s.w * s.h) {
      console.warn("zones: bad sprite " + name);
      canvases.set(name, null);
      return null;
    }
    const cv = document.createElement("canvas");
    cv.width = s.w * S;
    cv.height = s.h * S;
    const g = cv.getContext("2d");
    for (let y = 0; y < s.h; y++) {
      let x = 0;
      while (x < s.w) {
        const c = s.px[y * s.w + x];
        if (c === ".") { x++; continue; }
        let run = 1;
        while (x + run < s.w && s.px[y * s.w + x + run] === c) run++;
        g.fillStyle = CPAL[c.charCodeAt(0) - 97];
        g.fillRect(x * S, y * S, run * S, S);
        x += run;
      }
    }
    canvases.set(name, cv);
    return cv;
  }
  // blit sprite `name` with grid origin (gx, gy) already in screen px
  function blitSprite(ctx, name, gx, gy) {
    const cv = spriteCanvas(name);
    if (!cv) return;
    const s = CSPR[name];
    ctx.drawImage(cv, Math.round(gx + s.ox * S), Math.round(gy + s.oy * S));
  }

  // platforms: grid origin (px from planet centre), row of tiles 64px wide each, bob by k
  const CPLATS = [
    { k: 0, gx: -330, gy: 126, tiles: ["tileA", "tileB"] },
    { k: 1, gx: -70,  gy: 206, tiles: ["tileB"] },
    { k: 2, gx: 140,  gy: 116, tiles: ["tileA"] },
    { k: 3, gx: 280,  gy: -50, tiles: ["tileB", "tileA"] },
  ];

  let portalGlowGrad = null, symbolGlowGrad = null;
  function portalGlow(ctx) {
    if (!portalGlowGrad) {
      portalGlowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 70);
      portalGlowGrad.addColorStop(0, "rgba(247,255,197,0.30)");
      portalGlowGrad.addColorStop(1, "rgba(247,255,197,0)");
    }
    return portalGlowGrad;
  }
  function symbolGlow(ctx) {
    if (!symbolGlowGrad) {
      symbolGlowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
      symbolGlowGrad.addColorStop(0, "rgba(247,255,197,0.35)");
      symbolGlowGrad.addColorStop(1, "rgba(247,255,197,0)");
    }
    return symbolGlowGrad;
  }

  const conclususRnd = mulberry(7);
  // 16 motes, 12 of size 2 and 4 of size 3, kept clear of the planet's own halo
  const conclususMotes = makeMotes(conclususRnd, 16, 12, [-430, 430], [-210, 300], [8, 16], [6, 12], 120);

  function drawConclusus(ctx, ax, ay, env, at) {
    const room = roomBelow(env, at);
    const lift = Math.max(0, 248 - room);
    const oy = -lift;

    for (const p of conclususMotes) {
      const x = p.bx + Math.sin(T * p.w1 + p.p1) * p.ax;
      let y = p.by + Math.sin(T * p.w2 + p.p2) * p.ay + oy;
      y = Math.min(y, room - 8);
      const a = 0.20 + (0.75 - 0.20) * (0.5 + 0.5 * Math.sin(T * p.w3 + p.p3));
      ctx.fillStyle = "rgba(247,255,197," + a + ")";
      ctx.fillRect(Math.round(ax + x), Math.round(ay + y), p.size, p.size);
    }

    ctx.save();
    ctx.translate(ax + 344, ay - 52 + oy);
    ctx.fillStyle = portalGlow(ctx);
    ctx.fillRect(-70, -70, 140, 140);
    ctx.restore();

    for (const plat of CPLATS) {
      const bob = Math.sin(T * 0.45 + plat.k * 1.9) * 3;
      let tx = ax + plat.gx;
      const ty = ay + plat.gy + bob + oy;
      for (const tname of plat.tiles) {
        blitSprite(ctx, tname, tx, ty);
        tx += 64;
      }
      if (plat.k === 0) {
        const frame = Math.floor(T / 0.7) % 2;
        blitSprite(ctx, frame === 0 ? "idle0" : "idle1", ax - 314, ay + 92 + bob + oy);
      }
      if (plat.k === 3) {
        const frame = Math.floor(T / 0.25) % 2;
        blitSprite(ctx, frame === 0 ? "door0" : "door1", ax + 312, ay - 84 + bob + oy);
      }
    }

    const symBob = Math.sin(T * 0.8) * 4;
    const sx = ax - 150, sy = ay + 40 + symBob + oy;
    ctx.save();
    ctx.translate(sx + 16 * S, sy + 16 * S);
    ctx.fillStyle = symbolGlow(ctx);
    ctx.fillRect(-18, -18, 36, 36);
    ctx.restore();
    const sframe = Math.floor(T / 0.6) % 2;
    blitSprite(ctx, sframe === 0 ? "sym0" : "sym1", sx, sy);
  }

  /* ================= HeavyLight (seed 11) ================= */
  const HL = { fill:"#031a2b", speck:"#0b3350", edge:"#5f92b8", hi:"#a9d3ee", red:"#d8302a", key:"#ff3b30", cone:"40,60,230" };

  const HL_CHUNKS = {
    hlA: {
      cells: [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1]],
      pad: 24,
      props: [
        { type: "spike", cx: 1, cy: 0 },
        { type: "spike", cx: 2, cy: 0 },
        { type: "spike", cx: 3, cy: 0 },
        { type: "crate", cx: 5, cy: 0 },
      ],
    },
    hlB: {
      cells: [[0,1],[1,1],[2,1],[3,1],[0,2],[1,2],[2,2],[3,2],[3,0]],
      pad: 24,
      props: [
        { type: "figure", cx: 1, cy: 1 },
        { type: "lamp", cx: 2, cy: 1 },
      ],
    },
    hlC: {
      cells: [[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]],
      pad: 0,
      props: [],
    },
  };

  function caveCanvas(name) {
    if (canvases.has(name)) return canvases.get(name);
    if (typeof document === "undefined") { canvases.set(name, null); return null; }
    const chunk = HL_CHUNKS[name];
    if (!chunk) { canvases.set(name, null); return null; }
    const CELL = 24, MARGIN = 4;
    const cellSet = new Set(chunk.cells.map(c => c[0] + "," + c[1]));
    let minCx = Infinity, minCy = Infinity, maxCx = -Infinity, maxCy = -Infinity;
    for (const [cx, cy] of chunk.cells) {
      minCx = Math.min(minCx, cx); maxCx = Math.max(maxCx, cx);
      minCy = Math.min(minCy, cy); maxCy = Math.max(maxCy, cy);
    }
    const cw = (maxCx - minCx + 1) * CELL + MARGIN * 2;
    const chh = (maxCy - minCy + 1) * CELL + MARGIN * 2 + chunk.pad;
    const cv = document.createElement("canvas");
    cv.width = cw; cv.height = chh;
    const g = cv.getContext("2d");
    const cellPx = (cx, cy) => ({
      x: MARGIN + (cx - minCx) * CELL,
      y: MARGIN + chunk.pad + (cy - minCy) * CELL,
    });

    chunk.cells.forEach(([cx, cy], idx) => {
      const p = cellPx(cx, cy);
      g.fillStyle = HL.fill;
      g.fillRect(p.x, p.y, CELL, CELL);

      // interior speckle: 6 dots from deterministic hashes
      for (let j = 0; j < 6; j++) {
        const hx = hash1(idx * 97 + j * 13 + 1);
        const hy = hash1(idx * 97 + j * 13 + 2);
        g.fillStyle = HL.speck;
        g.fillRect(Math.floor(p.x + 2 + hx * 20), Math.floor(p.y + 2 + hy * 20), 2, 2);
      }

      // jagged light-rim edges where a neighbour cell is missing
      const sides = [
        { has: cellSet.has((cx - 1) + "," + cy), dir: "l" },
        { has: cellSet.has((cx + 1) + "," + cy), dir: "r" },
        { has: cellSet.has(cx + "," + (cy - 1)), dir: "t" },
        { has: cellSet.has(cx + "," + (cy + 1)), dir: "b" },
      ];
      for (const side of sides) {
        if (side.has) continue;
        for (let j = 0; j < 6; j++) {
          const h = hash1(idx * 401 + side.dir.charCodeAt(0) * 31 + j * 7);
          const d = 2 + Math.floor(h * 4);
          g.fillStyle = HL.edge;
          let hix, hiy;
          if (side.dir === "t") {
            g.fillRect(p.x + j * 4, p.y - d, 4, d);
            hix = p.x + j * 4 + 1; hiy = p.y - d;
          } else if (side.dir === "b") {
            g.fillRect(p.x + j * 4, p.y + CELL, 4, d);
            hix = p.x + j * 4 + 1; hiy = p.y + CELL + d - 2;
          } else if (side.dir === "l") {
            g.fillRect(p.x - d, p.y + j * 4, d, 4);
            hix = p.x - d; hiy = p.y + j * 4 + 1;
          } else {
            g.fillRect(p.x + CELL, p.y + j * 4, d, 4);
            hix = p.x + CELL + d - 2; hiy = p.y + j * 4 + 1;
          }
          if (j % 2 === 1) {
            g.fillStyle = HL.hi;
            g.fillRect(hix, hiy, 2, 2);
          }
        }
      }
    });

    for (const prop of chunk.props) {
      const p = cellPx(prop.cx, prop.cy);
      const midx = p.x + CELL / 2;
      if (prop.type === "spike") {
        g.beginPath();
        g.moveTo(midx - 10, p.y);
        g.lineTo(midx + 10, p.y);
        g.lineTo(midx, p.y - 22);
        g.closePath();
        g.fillStyle = HL.fill;
        g.fill();
        g.strokeStyle = HL.edge;
        g.lineWidth = 1.5;
        g.stroke();
      } else if (prop.type === "crate") {
        const x0 = midx - 11, y0 = p.y - 22;
        g.fillStyle = HL.fill;
        g.fillRect(x0, y0, 22, 22);
        g.strokeStyle = HL.edge;
        g.lineWidth = 2;
        g.strokeRect(x0, y0, 22, 22);
        g.beginPath();
        g.moveTo(x0, y0); g.lineTo(x0 + 22, y0 + 22);
        g.moveTo(x0 + 22, y0); g.lineTo(x0, y0 + 22);
        g.stroke();
      } else if (prop.type === "figure") {
        const ox = midx - 4, oy = p.y - 18;
        g.fillStyle = HL.red;
        g.fillRect(ox + 1, oy + 0, 6, 6);
        g.fillRect(ox + 1, oy + 6, 6, 8);
        g.fillRect(ox + 1, oy + 14, 2, 4);
        g.fillRect(ox + 5, oy + 14, 2, 4);
      } else if (prop.type === "lamp") {
        g.fillStyle = HL.edge;
        g.fillRect(midx - 4, p.y - 6, 8, 6);
      }
    }

    cv._ox = MARGIN - minCx * CELL;
    cv._oy = MARGIN + chunk.pad - minCy * CELL;
    canvases.set(name, cv);
    return cv;
  }

  const HL_PLACE = [
    { name: "hlA", k: 0, x: -400 },
    { name: "hlB", k: 1, x: -40 },
    { name: "hlC", k: 2, x: 300, y: -60 },
  ];

  let keyGlowGrad = null;
  function keyGlow(ctx) {
    if (!keyGlowGrad) {
      keyGlowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 22);
      keyGlowGrad.addColorStop(0, "rgba(255,60,40,0.35)");
      keyGlowGrad.addColorStop(1, "rgba(255,60,40,0)");
    }
    return keyGlowGrad;
  }

  const heavylightRnd = mulberry(11);
  const hlDust = makeMotes(heavylightRnd, 10, 10, [-460, 440], [-220, 140], [6, 14], [5, 10], 120);

  function drawHeavyLight(ctx, ax, ay, env, at) {
    const room = roomBelow(env, at);
    const hlAy = Math.min(60, room - 64);
    const hlBy = Math.min(110, room - 88);

    for (const p of hlDust) {
      const x = p.bx + Math.sin(T * p.w1 + p.p1) * p.ax;
      let y = p.by + Math.sin(T * p.w2 + p.p2) * p.ay;
      y = Math.min(y, room - 8);
      const a = 0.12 + (0.35 - 0.12) * (0.5 + 0.5 * Math.sin(T * p.w3 + p.p3));
      ctx.fillStyle = "rgba(170,215,240," + a + ")";
      ctx.fillRect(Math.round(ax + x), Math.round(ay + y), p.size, p.size);
    }

    for (const name of ["hlA", "hlC", "hlB"]) {
      const place = HL_PLACE.find(pl => pl.name === name);
      const cv = caveCanvas(name);
      if (!cv) continue;
      const bob = Math.sin(T * 0.4 + place.k * 2.1) * 2;
      const py = name === "hlA" ? hlAy : name === "hlB" ? hlBy : place.y;
      ctx.drawImage(cv, Math.round(ax + place.x - cv._ox), Math.round(ay + py + bob - cv._oy));
    }

    // light cone from hlB's lamp, drawn after hlB
    const bB = Math.sin(T * 0.4 + 1 * 2.1) * 2;
    const apexX = ax + (-40) + 64;
    const apexY = ay + hlBy + 21 + bB;
    const ca = 0.28 + 0.04 * Math.sin(T * 3.1);
    ctx.beginPath();
    ctx.moveTo(apexX, apexY);
    ctx.lineTo(apexX + 175, apexY - 22);
    ctx.lineTo(apexX + 175, apexY + 42);
    ctx.closePath();
    ctx.fillStyle = "rgba(" + HL.cone + "," + ca + ")";
    ctx.fill();

    // key
    const kx = ax + 372, ky = ay - 30 + Math.sin(T * 0.9) * 4;
    ctx.save();
    ctx.translate(kx, ky);
    ctx.fillStyle = keyGlow(ctx);
    ctx.fillRect(-22, -22, 44, 44);
    ctx.restore();
    ctx.strokeStyle = HL.key;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(kx, ky, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = HL.key;
    ctx.fillRect(kx - 1, ky + 5, 2, 12);
    ctx.fillRect(kx + 1, ky + 10, 4, 2);
    ctx.fillRect(kx + 1, ky + 14, 3, 2);
  }

  /* ================= VoidScape (seed 5) ================= */
  const voidscapeRnd = mulberry(5);
  const VS_COLORS = ["255,120,60", "240,80,40", "200,30,20"];
  const vsEmbers = [];
  for (let i = 0; i < 22; i++) {
    vsEmbers.push({
      bx: mix(-620, 820, voidscapeRnd()),
      sway: mix(5, 10, voidscapeRnd()),
      speed: mix(14, 26, voidscapeRnd()),
      phase: voidscapeRnd(),
      size: i < 10 ? 3 : 2,
      col: VS_COLORS[Math.floor(voidscapeRnd() * VS_COLORS.length)],
    });
  }
  const VS_SHARDS = [ { x: -560, y: 200 }, { x: 700, y: 150 }, { x: -660, y: -60 } ];

  function drawEmbers(ctx, ax, ay, env, at) {
    const yt = -150;
    const yb = Math.min(300, roomBelow(env, at) - 8);
    const L = yb - yt;
    for (const p of vsEmbers) {
      let u = (p.phase + T * p.speed / L) % 1;
      if (u < 0) u += 1;
      const y = yb - u * L;
      const x = p.bx + Math.sin(T * 0.7 + p.phase * 6.28) * p.sway;
      const a = 1.0 * Math.min(1, u * 4, (1 - u) * 3);
      ctx.fillStyle = "rgba(" + p.col + "," + a + ")";
      ctx.fillRect(Math.round(ax + x), Math.round(ay + y), p.size, p.size);
    }
  }
  function drawShards(ctx, ax, ay) {
    for (let i = 0; i < VS_SHARDS.length; i++) {
      const s = VS_SHARDS[i];
      const bob = Math.sin(T * 0.5 + i) * 3;
      const a = 0.30 + 0.35 * (0.5 + 0.5 * Math.sin(T * 0.9 + i * 2.1));
      const cx = ax + s.x, cy = ay + s.y + bob;
      ctx.fillStyle = "rgba(100,170,27," + a + ")";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx + 6, cy);
      ctx.lineTo(cx, cy + 8);
      ctx.lineTo(cx - 6, cy);
      ctx.closePath();
      ctx.fill();
    }
  }
  function drawVoidScape(ctx, ax, ay, env, at) {
    drawEmbers(ctx, ax, ay, env, at);
    drawShards(ctx, ax, ay);
  }

  /* ================= step / draw / report ================= */
  function step(dt, env) {
    if (typeof dt !== "number" || !isFinite(dt) || dt < 0) dt = 0;
    if (!(env && env.reduced)) T += dt;
  }

  const ZONE_DRAW = { conclusus: drawConclusus, heavylight: drawHeavyLight, voidscape: drawVoidScape };

  function draw(ctx, env) {
    const zones = {
      conclusus:  { x: 0, y: 0, drawn: false },
      heavylight: { x: 0, y: 0, drawn: false },
      voidscape:  { x: 0, y: 0, drawn: false },
    };
    lastReport = { t: T, zones };
    if (!env || !(env.W >= MIN_W)) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const key in ZONE_DRAW) {
      const at = env.at && env.at[key];
      const info = zones[key];
      if (!at || !isFinite(at.x)) continue;
      info.x = at.x; info.y = at.y;
      if (at.x < -OFF || at.x > env.W + OFF) continue;
      ZONE_DRAW[key](ctx, at.x, at.y, env, at);
      info.drawn = true;
    }
    ctx.restore();
  }

  function report() { return lastReport; }

  return { step, draw, report };
})();
