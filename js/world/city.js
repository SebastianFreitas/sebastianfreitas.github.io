/* js/world/city.js — the mainland: the city bands, the factions, the Root and the Bridge */
(function () {
  const { P, F, wx, onScreen, scale, FLOOR, BAY, DECK, MAIN_PAR, VIEW_UNITS,
          depthAlpha, rexSprite, city, swarm, LAND } = window.World;
  const { hash1 } = Util;

  function drawBand(list, par, colour, alpha) {
    const { ctx, H } = F;
    const s = scale(), floor = H * FLOOR;
    ctx.fillStyle = colour; ctx.globalAlpha = alpha;
    for (const tw of list) {
      const x = wx(tw.x, par);
      if (!onScreen(x, 200)) continue;
      ctx.fillRect(x, floor - tw.h * H, Math.max(1, tw.w * s * par), tw.h * H);
    }
    ctx.globalAlpha = 1;
  }

  function drawCityNear() {
    const { ctx, H, t } = F;
    const par = 0.66, s = scale(), k = s * par * 0.9, floor = H * FLOOR;
    for (const tw of city.near) {
      const x = wx(tw.x, par);
      if (!onScreen(x, 220)) continue;
      const w = Math.max(1, tw.w * s * par), h = tw.h * H;
      ctx.fillStyle = "#1b2327"; ctx.fillRect(x, floor - h, w, h);
      if (w > 18) {
        for (const win of tw.windows) {
          const px = x + win.dx * k, py = floor - h + win.dy * k;
          if (!onScreen(px, 6) || py > H) continue;
          ctx.globalAlpha = win.a * (0.75 + 0.25 * Math.sin(t * 2.1 + win.fl)) * 0.85;
          ctx.fillStyle = win.warm ? "#f5d06b" : "#8fb0b8";
          ctx.fillRect(px, py, 2.2, 3);
        }
        ctx.globalAlpha = 1;
      }
    }
    for (const c of swarm) {
      const x = wx(c.x + Math.sin(t * 0.5 + c.ph) * c.amp, par);
      if (!onScreen(x, 14)) continue;
      ctx.globalAlpha = c.a * (0.4 + 0.6 * Math.sin(t * 3 + c.ph));
      ctx.fillStyle = "#d8cfa8";
      ctx.beginPath();
      ctx.arc(x, c.y * H + Math.cos(t * 0.8 + c.ph) * c.amp * 0.5, c.rr, 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ---- the Mainland's factions, standing behind the city with their tops at the beacon's height ---- */
  function drawLandPlace(id, name, anchor) {
    const { ctx, W, H, t } = F;
    const art = window.LandArt && window.LandArt[name];
    if (!art) return;
    const a = depthAlpha(id);
    if (a <= 0) return;
    const u = H * (1 - anchor.oy) / art.top;
    if (!(u > 0)) return;

    const [x0, y0, x1, y1] = art.box;
    const ax = wx(anchor.x, MAIN_PAR) - (x1 + 3) * u;
    const ay = H;
    if (ax + x1 * u < -40 || ax + x0 * u > W + 40) return;

    const dpr = ctx.getTransform().a || 1;
    const sprite = rexSprite("land:" + name, art, u, dpr);

    ctx.save();
    ctx.globalAlpha = a;
    ctx.drawImage(sprite, ax + x0 * u, ay + y0 * u, sprite.width / dpr, sprite.height / dpr);
    if (art.live) {
      ctx.globalAlpha = a;
      ctx.translate(ax, ay);
      ctx.scale(u, u);
      art.live(ctx, 1 / u, t, a);
    }
    ctx.restore();
  }

  /* ---- THE ROOT ------------------------------------------
     Deliberately almost nothing: a reach of red before it, and one
     torn edge. Everything past that line is simply not passable,
     and showing more of it made it smaller.
  --------------------------------------------------------- */
  function drawRoot() {
    const { ctx, W, H, t } = F;
    const par = 0.70;
    const face = wx(LAND.root, par);
    if (face > W + 160) return;

    const breath = 0.5 + 0.5 * Math.sin(t * 0.34);

    // and past the line there is nothing to look at
    const cx = Math.max(face, -80);
    ctx.fillStyle = "#2a080c"; ctx.fillRect(cx, 0, W - cx + 80, H);

    // the edge, which is the only part worth drawing
    ctx.strokeStyle = `rgba(214,72,68,${0.34 + 0.2 * breath})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k <= 30; k++) {
      const u = k / 30, y = u * H;
      const px = face + Math.sin(u * 8 + t * 0.4) * 9 + Math.sin(u * 19 - t * 0.25) * 4;
      k ? ctx.lineTo(px, y) : ctx.moveTo(px, y);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function drawBridge() {
    const { ctx, W, H, camX } = F;
    const par = 0.94, s = scale();
    const deckY = H * DECK;
    const bayPx = Math.max(24, BAY * s * par);
    const legW  = Math.min(3, Math.max(1.2, bayPx * 0.007));
    const deckH = Math.min(6, Math.max(2.5, bayPx * 0.013));
    const rise  = bayPx * 0.20;
    const legBot = H * 1.22;

    const first = Math.floor((camX - VIEW_UNITS) / BAY) - 1;
    const last  = Math.ceil((camX + VIEW_UNITS) / BAY) + 1;

    ctx.fillStyle = "rgba(112,130,140,0.55)";
    for (let b = first; b <= last; b++) {
      const x = wx(b * BAY, par);
      if (!onScreen(x, 20)) continue;
      ctx.fillRect(x - legW / 2, deckY + deckH, legW, legBot - deckY - deckH);
    }
    const archT = Math.max(1, legW * 0.55);
    ctx.fillStyle = "rgba(112,130,140,0.30)";
    for (let b = first; b <= last; b++) {
      const x0 = wx(b * BAY, par);
      if (!onScreen(x0, bayPx + 20)) continue;
      const cx = x0 + bayPx / 2, cy = deckY + deckH + rise, rx = bayPx / 2 - legW;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, rise, 0, Math.PI, 0);
      ctx.ellipse(cx, cy, rx - archT, rise - archT, 0, 0, Math.PI, true);
      ctx.closePath(); ctx.fill();
    }
    for (let b = first; b <= last; b++) {
      const x = wx(b * BAY, par);
      if (!onScreen(x, 24)) continue;
      const r = hash1(b * 911 + 7);
      ctx.fillStyle = "rgba(120,138,147,0.4)";
      ctx.fillRect(x - legW * 0.4, deckY - deckH * 1.9, legW * 0.8, deckH * 1.9);
      if (r < 0.13) {
        const mh = deckH * (4.5 + r * 22);
        ctx.fillStyle = "rgba(120,138,147,0.34)";
        ctx.fillRect(x - legW * 0.3, deckY - mh, legW * 0.6, mh);
        ctx.fillStyle = "rgba(245,208,107,0.75)";
        ctx.fillRect(x - legW * 0.55, deckY - mh - legW * 0.7, legW * 1.1, legW * 1.1);
      }
    }
    ctx.fillStyle = "rgba(36,45,51,0.92)";
    ctx.fillRect(0, deckY, W, deckH);
    ctx.fillStyle = "rgba(245,208,107,0.62)";
    for (let b = first; b <= last; b++) {
      const x = wx(b * BAY, par);
      if (!onScreen(x, bayPx + 20)) continue;
      ctx.fillRect(x, deckY - 1.6, bayPx + 1, 2.4);
    }
  }

  P.drawBand = drawBand;
  P.drawCityNear = drawCityNear;
  P.drawLandPlace = drawLandPlace;
  P.drawRoot = drawRoot;
  P.drawBridge = drawBridge;
})();
