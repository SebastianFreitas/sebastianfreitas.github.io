/* js/world/rex.js — Rex: the ranges, the underground, hell, and the kingdoms standing on them */
(function () {
  const { P, F, wx, onScreen, scale, depthAlpha, rexSprite, rexHeight, LAND,
          REX_BANDS, REX_FROM, HELL_AT, REX_ART_PAR, REX_ART_UNIT, REX_PLACES } = window.World;
  const { hash1 } = Util;

  // flat fill lit from the left: the whole mass in lit, then a copy shifted down-right in shade, clipped to the mass, leaving a hard-edged lit cap on left-facing slopes (same as genesis.js fillRidge)
  function fillRidge(path, lit, shade) {
    const { ctx, H } = F;
    Paint.fillRidge(ctx, path, lit, shade, H * 0.05, H * 0.035);
  }

  function drawRex() {
    const { ctx, W, H, camX } = F;
    const sc = scale();
    const bottom = H * 1.3;
    const toWorld = (px, par) => camX + (px - W * 0.5) / (par * sc);

    let nearPath = null;

    for (let bi = 0; bi < REX_BANDS.length; bi++) {
      const b = REX_BANDS[bi];
      if (toWorld(W + 60, b.par) < REX_FROM) continue;

      const pts = [];
      for (let px = -60; px <= W + 60; px += 7)
        pts.push([px, H * 1.06 - rexHeight(toWorld(px, b.par), b) * H]);
      if (!pts.length) continue;

      const path = new Path2D();
      path.moveTo(pts[0][0], bottom);
      for (const p of pts) path.lineTo(p[0], Math.max(-H * 0.6, p[1]));
      path.lineTo(pts[pts.length - 1][0], bottom);
      path.closePath();

      fillRidge(path, b.lit, b.shade);

      if (bi === REX_BANDS.length - 1) nearPath = path;
      drawRexPlaces(bi);  // kingdoms standing on this range, before the nearer ranges cover their feet
    }

    /* everything below is inside the nearest mass */
    if (nearPath) {
      ctx.save();
      ctx.clip(nearPath);
      rexInterior(sc, bottom);
      ctx.restore();
    }

    drawRexPlaces(-1);   // the deep kingdoms, over the rock
    drawHell(bottom);
  }

  /* ---- hell runs unbroken from its threshold into the Root ------
     Drawn outside the mass clip, or the last stretch before the Root
     falls outside the polygon and reads as void.
  --------------------------------------------------------- */
  function drawHell(bottom) {
    const { ctx, W, H, t } = F;
    const par = REX_BANDS[2].par;
    const hx = wx(HELL_AT, par);
    if (hx > W + 60) return;

    const x0 = Math.max(hx, -160);
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.4);

    // one flat red from the seal on
    ctx.fillStyle = `rgba(132,26,22,${0.8 + 0.05 * pulse})`;
    ctx.fillRect(x0, 0, W - x0 + 160, H + 60);

    // one flat darkening over the whole of hell, no horizontal seam
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(x0, 0, W - x0 + 160, H + 60);

    for (let i = 0; i < 34; i++) {
      const u = hash1(i * 401), span = Math.max(90, W - x0);
      const ex = x0 + ((((u * span + t * (18 + u * 40) + hx - x0) % span) + span) % span);
      const ey = H - ((t * (26 + u * 60) + u * H) % (H * 0.95));
      ctx.fillStyle = `rgba(246,126,74,${0.14 + 0.3 * hash1(i * 77)})`;
      ctx.fillRect(ex, ey, 1.8, 1.8);
    }

    // the threshold, torn like the Root's own face
    if (hx > -60 && hx < W + 60) {
      ctx.strokeStyle = `rgba(212,72,62,${0.45 + 0.16 * pulse})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let k = 0; k <= 28; k++) {
        const u = k / 28, y = u * (H + 40);
        const px = hx + Math.sin(u * 7 + t * 0.35) * 11 + Math.sin(u * 17 - t * 0.2) * 5;
        k ? ctx.lineTo(px, y) : ctx.moveTo(px, y);
      }
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  /* ---- what the rock looks like once you're in it -------------
     Without this the underground is a flat fill and reads as void,
     which is exactly how it looked.
  --------------------------------------------------------- */
  function rexInterior(sc, bottom) {
    const { ctx, H } = F;
    const nb = REX_BANDS[2], par = nb.par;

    // rubble, so it has grain rather than being a wash
    for (let i = 0; i < 90; i++) {
      const u = hash1(i * 911);
      const wxp = wx(REX_FROM + u * (LAND.root - REX_FROM), par);
      if (!onScreen(wxp, 20)) continue;
      const y = H * (0.12 + hash1(i * 337) * 1.1);
      ctx.fillStyle = `rgba(196,206,212,${0.03 + 0.05 * hash1(i * 53)})`;
      ctx.fillRect(wxp, y, 1 + hash1(i * 7) * 3, 1 + hash1(i * 13) * 2);
    }

  }

  /* ---- kingdoms standing on a range, or (band === -1) deep in the rock ---- */
  function drawRexPlaces(band) {
    const { ctx, W, H, t } = F;
    const lib = window.RexArt;
    if (!lib) return;
    const sc = scale();
    const dpr = ctx.getTransform().a || 1;
    for (const p of REX_PLACES) {
      if (p.band !== band) continue;
      const art = lib[p.art];
      if (!art) continue;
      const a = depthAlpha(p.id);
      if (a <= 0) continue;

      const b = band >= 0 ? REX_BANDS[band] : null;
      const par = b ? b.par : REX_ART_PAR;
      const u = sc * par * REX_ART_UNIT;
      if (!(u > 0)) continue;

      const [x0, y0, x1, y1] = art.box;
      const ax = wx(p.x, par);
      if (ax + x1 * u < -40 || ax + x0 * u > W + 40) continue;
      const ay = b ? H * 1.06 - rexHeight(p.x, b) * H : H * p.oy;

      const sprite = rexSprite(p.art, art, u, dpr);

      ctx.save();
      if (art.under) {
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(ax, ay);
        ctx.scale(u, u);
        art.under(ctx, 1 / u, t, a);
        ctx.restore();
      }
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
  }

  P.drawRex = drawRex;
})();
