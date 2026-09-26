window.GenChains = (function () {
  "use strict";

  let geo = null, geoKey = "";

  function hash(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function ringDull(ctx, x, y, r) {
    ctx.lineWidth = 0.28 * r;
    ctx.strokeStyle = "#5a4c4e";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#6e5e60";
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI * 0.6, Math.PI * 1.4);
    ctx.stroke();
  }

  function ringMagic(ctx, x, y, r) {
    ringDull(ctx, x, y, r);
    ctx.fillStyle = "#e8c9a0";
    const a = Math.PI * 1.25;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 0.18 * r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawP8Disc(ctx, C, R0) {
    ctx.fillStyle = "#5a4c4e";
    ctx.beginPath();
    ctx.arc(C.x, C.y, R0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(C.x, C.y, R0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#6e5e60";
    ctx.fillRect(C.x - R0, C.y - R0, 0.64 * R0, 2 * R0);
    ctx.restore();
    ctx.fillStyle = "#8e3037";
    ctx.beginPath();
    ctx.arc(C.x - 0.2 * R0, C.y - 0.1 * R0, 0.05 * R0, 0, Math.PI * 2);
    ctx.fill();
  }

  // draw a hex chain-mail field of rings directly onto ctx, x0/y0 as the
  // top-left origin, covering w x h
  function hexField(ctx, r, magicP, seed, x0, y0, w, h) {
    const spacing = 1.6 * r;
    const rowH = spacing * 0.87;
    const rows = Math.ceil(h / rowH) + 2;
    const cols = Math.ceil(w / spacing) + 2;
    for (let row = -1; row < rows; row++) {
      const y = y0 + row * rowH;
      const xOff = (((row % 2) + 2) % 2) * spacing / 2;
      for (let col = -1; col < cols; col++) {
        const x = x0 + col * spacing + xOff;
        const i = row * 1000 + col;
        const magic = hash(i * seed + 7) < magicP;
        if (magic) ringMagic(ctx, x, y, r);
        else ringDull(ctx, x, y, r);
      }
    }
  }

  function buildTile(W, H, r, magicP, seed) {
    const tileW = Math.max(1, Math.round(0.25 * W));
    const tileH = Math.max(1, Math.round(0.25 * H));
    const canvas = document.createElement("canvas");
    canvas.width = tileW;
    canvas.height = tileH;
    const tctx = canvas.getContext("2d");
    hexField(tctx, r, magicP, seed, 0, 0, tileW, tileH);
    return { canvas, w: tileW, h: tileH };
  }

  function stampAcross(ctx, tile, W, H) {
    for (let y = 0; y < H; y += tile.h) {
      for (let x = 0; x < W; x += tile.w) {
        ctx.drawImage(tile.canvas, x, y);
      }
    }
  }

  function build(W, H) {
    const m = Math.min(W, H);
    const C = { x: 0.56 * W, y: 0.50 * H };
    const R0 = 0.15 * m;
    const P = { x: 0.30 * W, y: 0.24 * H };

    // colour thread target: nearest point on ring 0 to P
    const dPx = P.x - C.x, dPy = P.y - C.y;
    const angP = Math.atan2(dPy, dPx);
    const ringPt = { x: C.x + Math.cos(angP) * R0, y: C.y + Math.sin(angP) * R0 };
    const mid = { x: (P.x + ringPt.x) / 2, y: (P.y + ringPt.y) / 2 - 0.12 * H };

    // level-0 chain line: ring 0 plus 5 linked rings, zig-zagging right and
    // slightly down, each overlapping its neighbour by about 0.2r
    const chain0 = [{ x: C.x, y: C.y }];
    const spacing = 1.8 * R0;
    const angles = [0, -0.35, 0.35, -0.35, 0.35];
    for (let k = 0; k < angles.length; k++) {
      const a = angles[k] + 0.1;
      const prev = chain0[chain0.length - 1];
      chain0.push({ x: prev.x + Math.cos(a) * spacing, y: prev.y + Math.sin(a) * spacing });
    }

    let tile2 = null, tile3 = null;
    try {
      tile2 = buildTile(W, H, 0.012 * m, 0.15, 4.1);
      tile3 = buildTile(W, H, 0.005 * m, 0.25, 9.3);
    } catch (e) {
      tile2 = null;
      tile3 = null;
    }

    geo = { m, C, R0, P, ringPt, mid, chain0, tile2, tile3 };
  }

  function drawLevel0(ctx, g, t) {
    if (t < 0.4) {
      drawP8Disc(ctx, g.C, g.R0);
      return;
    }
    const count = Math.min(6, 1 + Math.floor((t - 0.4) / 0.4));
    for (let i = 0; i < count; i++) {
      ringDull(ctx, g.chain0[i].x, g.chain0[i].y, g.R0);
    }
    ctx.strokeStyle = "#b8525a";
    ctx.lineWidth = Math.max(2, 0.005 * g.m);
    ctx.beginPath();
    ctx.moveTo(g.P.x, g.P.y);
    ctx.quadraticCurveTo(g.mid.x, g.mid.y, g.ringPt.x, g.ringPt.y);
    ctx.stroke();
    ctx.fillStyle = "#b8525a";
    ctx.beginPath();
    ctx.arc(g.P.x, g.P.y, 0.012 * g.m, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawLevel1(ctx, g, W, H) {
    hexField(ctx, 0.035 * g.m, 0.08, 1.7, 0, 0, W, H);
  }

  function drawLevel2(ctx, g, W, H) {
    if (g.tile2) stampAcross(ctx, g.tile2, W, H);
    else hexField(ctx, 0.012 * g.m, 0.15, 4.1, 0, 0, W, H);
  }

  function drawLevel3(ctx, g, W, H) {
    if (g.tile3) stampAcross(ctx, g.tile3, W, H);
    else hexField(ctx, 0.005 * g.m, 0.25, 9.3, 0, 0, W, H);
  }

  function draw(ctx, W, H, t, reduced) {
    if (!W || !H) return;
    if (reduced) t = 99;
    if (t < 0) t = 0;

    ctx.fillStyle = "#2a0a10";
    ctx.fillRect(0, 0, W, H);
    if (window.GenSoup) {
      try { GenSoup.drawBackdrop(ctx, W, H); } catch (e) { /* skip backdrop */ }
    }

    const key = W + "x" + H;
    if (key !== geoKey) { geoKey = key; build(W, H); }
    if (!geo) return;

    if (t < 3.0) drawLevel0(ctx, geo, t);
    else if (t < 4.6) drawLevel1(ctx, geo, W, H);
    else if (t < 6.2) drawLevel2(ctx, geo, W, H);
    else drawLevel3(ctx, geo, W, H);
  }

  return { draw };
})();
