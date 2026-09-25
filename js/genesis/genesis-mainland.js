/* genesis-mainland.js — the mainland: the ridge bands, the surface cache
   every figure stands on, the red spires rooted in the ground, the city
   with roofs and lamps, rising to towers after the war, and the nest pit.
   Screen-space painters fed by the saga state S
   (rise/scar/corrupt/civAmt/nestAmt...). */
window.GenMain = (function () {
  const G = window.Gen;
  const { clamp, mix, hash1, mulberry, ridge, smooth } = Util;
  const { litShade, offsetShade, merlons, poly, circle } = Paint;
  const { fillRidge, gridXs, mixHex, flatGlow, mainHeight, mainBandHeight, mainDome } = GenPaint;
  const { MAIN_U, MAIN_HALF, CITY_U, NEST_U, DECK, MAIN_BANDS, sx } = G;

  /* ---- the height field: the dome shape plus broad war-rubble mounds on
     the east half (scar-driven, never retreats) instead of the old jagged
     sawtooth eastJag, which this replaces entirely ---- */
  function rubble(wu, scar) {
    const east = clamp((wu - MAIN_U + 0.06) / MAIN_HALF, 0, 1);
    return scar * Math.pow(east, 0.8) * (0.025 + 0.045 * ridge(wu * 4.3 + 17.1)) * mainDome(wu);
  }
  function heightAt(wu, scar) {
    return mainHeight(wu, 0) + rubble(wu, scar);
  }
  function surfYAt(wu, rise, scar) {
    return mix(G.H + 28, G.H * DECK - heightAt(wu, scar) * G.H, rise);
  }

  /* ---- the screen-space cache: the near band's polyline, the same one
     the ground was actually painted with, so anything standing on it
     (spires, towers, the nest) samples the real drawn surface ---- */
  const SURF = { x0: 0, step: 5, n: 0, ys: new Float32Array(1024), rise: 0, scar: 0 };

  function surfY(px) {
    if (SURF.n < 2) return surfYAt((px - G.W * 0.5) / G.W + G.cam, SURF.rise, SURF.scar);
    const i = clamp((px - SURF.x0) / SURF.step, 0, SURF.n - 1);
    const i0 = Math.floor(i);
    const i1 = Math.min(SURF.n - 1, i0 + 1);
    const f = i - i0;
    return SURF.ys[i0] + (SURF.ys[i1] - SURF.ys[i0]) * f;
  }
  function surfSlope(px) {
    return (surfY(px + 6) - surfY(px - 6)) / 12;
  }

  /* ---- the spire roster: corruption's thorns, 40 of them, seeded once ---- */
  const SPIRES = (function () {
    const r = mulberry(9006);
    const list = [];
    for (let i = 0; i < 40; i++) {
      const u = 0.08 + r() * 0.82;
      const w = 0.010 + r() * 0.024;
      const h = 0.12 + r() * 0.34;
      const born = mix(0.52, 0.02, u / 0.9) + r() * 0.18;
      const lean = (r() - 0.5) * 0.08;
      const teeth = 5 + Math.floor(r() * 4);
      const ph = r() * 6.28;
      const barb = r() < 0.6;
      list.push({ u, w, h, born, lean, teeth, ph, barb });
    }
    return list;
  })();

  /* ---- drain: spires near the nest lose their thorns from the top as
     their pieces fly off into the newborn Hound ---- */
  function spirePull(sp, S) {
    if (!S || !(S.drain > 0)) return 0;
    const d = Math.abs(MAIN_U + sp.u * MAIN_HALF - S.nestU) / 0.24;
    if (d >= 1) return 0;
    return smooth(clamp((S.drain - 0.4 * d) / 0.6, 0, 1));
  }

  /* per-spire geometry, shared with whatever draws the flying pieces;
     callers must call this after drawMainland has run in the same frame,
     since it reads the surfY() cache drawMainland fills */
  function spireGeom(k, S) {
    const corrupt = (S && S.corrupt) || 0;
    if (corrupt <= 0.06) return null;
    const sp = SPIRES[k];
    if (sp.born > corrupt) return null;
    const grow = clamp((corrupt - sp.born) / 0.22, 0, 1);
    const x = sx(MAIN_U + sp.u * MAIN_HALF);
    const tw = sp.w * G.H * mix(0.7, 1, grow);
    const th0 = sp.h * G.H * grow * mix(0.55, 1.15, corrupt) * (0.85 + 0.15 * Math.sin(G.t * 1.3 + sp.ph));
    const ln = sp.lean * G.H * grow;
    const pulled = spirePull(sp, S);
    const th = th0 * (1 - pulled);
    const rootY = surfY(x) + 2;
    const topY = rootY - 0.10 * tw;
    const lit = hash1(k * 7) < 0.4 ? "#4a070b" : "#6e0a10";
    return { x, tw, ln, th0, th, pulled, rootY, topY, lit };
  }

  /* ---- the city roster: three bands far to near, one mulberry(9008) draw ---- */
  const CITY = (function () {
    const r = mulberry(9008);
    function band(n, hMin, hMax, wMin, wMax, isNear) {
      const list = [];
      for (let i = 0; i < n; i++) {
        const u = -0.88 + r() * 1.76;
        const w = wMin + r() * (wMax - wMin);
        const h = hMin + r() * (hMax - hMin);
        const born = u < 0 ? 0.02 + 0.48 * r() : 0.60 + 0.38 * r();
        const rr = r();
        const roof = rr < 0.25 ? 0 : rr < 0.60 ? 1 : rr < 0.85 ? 2 : 3;
        const lamp = isNear && i % 5 === 0;
        const wseed = Math.floor(r() * 1e6);
        list.push({ u, w, h, born, roof, lamp, wseed });
      }
      return list;
    }
    return {
      far:  band(90, 0.10, 0.28, 22, 54, false),
      mid:  band(60, 0.08, 0.24, 29, 64, false),
      near: band(40, 0.07, 0.20, 35, 80, true),
    };
  })();
  const CITY_BANDS = [
    { list: CITY.far,  lit: "#1f282d", shade: "#141a1e", alpha: 0.55, win: false, wall: false, tower: 0.35 },
    { list: CITY.mid,  lit: "#222c32", shade: "#161d21", alpha: 0.78, win: true,  wall: false, tower: 0.50 },
    { list: CITY.near, lit: "#26323a", shade: "#182025", alpha: 1,    win: true,  wall: true,  tower: 0.55 },
  ];

  function drawMainland(ctx, S) {
    const rise = (S && S.mainRise) || 0;
    if (rise < 0.02) return;
    const scar = (S && S.scar) || 0;
    const corrupt = (S && S.corrupt) || 0;
    const deckY = G.H * DECK;
    const bottom = G.H + 80;
    const step = 5;
    /* the land shears down and away past the rim instead of stopping dead;
       this is the furthest that tail still reaches back into frame */
    const tail = 0.16 * G.W + (G.H + 160 - deckY) / 1.1;
    const xL = sx(MAIN_U - MAIN_HALF);
    const xR = sx(MAIN_U + MAIN_HALF);
    if (xR < -tail || xL > G.W + tail) return;
    const left = -60;
    const right = G.W + 60;

    const rimY = (wu, shear, out, seed) => {
      const d = Math.max(0, Math.abs(wu - MAIN_U) - MAIN_HALF - (out || 0));
      const broken = 1 + (ridge(wu * 26, seed || 7703) - 0.5) * 0.55
                       + (ridge(wu * 62, (seed || 7703) + 11) - 0.5) * 0.22;
      return deckY + d * G.W * (shear || 2.2) * broken;
    };

    const cu = corrupt * 0.7;
    for (const b of MAIN_BANDS) {
      const pts = [];
      for (const [px, wu] of gridXs(left, right, step)) {
        const dome = mainDome(wu);
        const y = dome > 0.002
          ? deckY - mainBandHeight(wu, b) * G.H
          : rimY(wu, 2.9, 0, 7703) + 8;
        if (y > G.H + 120) continue;
        pts.push([px, mix(G.H + 24, y, rise)]);
      }
      if (pts.length < 3) continue;
      ctx.globalAlpha = rise;
      fillRidge(ctx, pts, bottom, mixHex(b.lit, "#2e171a", cu * 0.6), mixHex(b.shade, "#1c0e0e", cu * 0.6));
      ctx.globalAlpha = 1;
    }

    /* the near range: everything stands on this one, so its polyline
       (after the rise blend) is what gets cached for surfY() below */
    const top = [];
    for (const [px, wu] of gridXs(left, right, step)) {
      const dome = mainDome(wu);
      const y = dome > 0.002 ? deckY - heightAt(wu, scar) * G.H : rimY(wu, 2.9, 0, 7703);
      if (y > G.H + 120) continue;
      top.push([px, mix(G.H + 28, y, rise)]);
    }
    if (top.length < 3) return;

    ctx.globalAlpha = rise;
    fillRidge(ctx, top, bottom, mixHex("#1a222a", "#3a1a1e", cu), mixHex("#10161b", "#24100f", cu));
    ctx.globalAlpha = 1;

    if (top.length > SURF.ys.length) SURF.ys = new Float32Array(top.length);
    SURF.x0 = top[0][0];
    SURF.step = top[1][0] - top[0][0];
    SURF.n = top.length;
    for (let i = 0; i < top.length; i++) SURF.ys[i] = top[i][1];
    SURF.rise = rise;
    SURF.scar = scar;

    if (corrupt > 0.06) {
      ctx.globalAlpha = rise * 0.95;
      for (let k = 0; k < SPIRES.length; k++) {
        const sp = SPIRES[k];
        const g = spireGeom(k, S);
        if (!g) continue;
        const { x, tw, ln, th, topY, pulled, lit: litCol } = g;

        /* root: sample the ground with the polyline it was actually drawn
           with, not the height field, so nothing floats or buries itself;
           this stays put even as the thorn above it is drained away */
        const xs0 = x - 0.75 * tw, xs1 = x - 0.35 * tw, xs2 = x, xs3 = x + 0.35 * tw, xs4 = x + 0.75 * tw;
        const ys0 = surfY(xs0) + 2, ys1 = surfY(xs1) + 2, ys2 = surfY(xs2) + 2, ys3 = surfY(xs3) + 2, ys4 = surfY(xs4) + 2;
        const rootPts = [
          [xs0, ys0 + 10], [xs0, ys0],
          [xs1, ys1 - 0.06 * tw], [xs2, ys2 - 0.10 * tw], [xs3, ys3 - 0.06 * tw],
          [xs4, ys4], [xs4, ys4 + 10],
        ];
        litShade(ctx, () => poly(ctx, rootPts), x - 0.3 * tw, "#4a070b", "#2a0407");

        if (pulled >= 0.999) continue;

        /* thorn: a spine that leans, edges serrated with a per-tooth hash;
           left half and right half are filled as two separate polygons so
           the shade split follows the lean instead of a straight cut */
        const n = sp.teeth;
        const spine = [], leftEdge = [], rightEdge = [];
        for (let i = 0; i <= n; i++) {
          const q = i / n;
          const sy = topY - th * q;
          const sxp = x + ln * q;
          const edge = tw * 0.5 * Math.pow(1 - q, 0.62);
          const sign = i % 2 === 0 ? 1 : -1;
          const tooth = (hash1(k * 31 + i) - 0.5) * 0.25 * tw * sign;
          spine.push([sxp, sy]);
          leftEdge.push([sxp - edge + tooth, sy]);
          rightEdge.push([sxp + edge + tooth, sy]);
        }
        const leftPoly = leftEdge.slice();
        for (let i = n - 1; i >= 0; i--) leftPoly.push(spine[i]);
        const rightPoly = spine.slice();
        for (let i = n - 1; i >= 0; i--) rightPoly.push(rightEdge[i]);

        poly(ctx, leftPoly); ctx.fillStyle = litCol; ctx.fill();
        poly(ctx, rightPoly); ctx.fillStyle = "#2a0407"; ctx.fill();

        if (sp.barb) {
          for (const q of [0.45, 0.7]) {
            const sy = topY - th * q;
            const sxp = x + ln * q;
            const baseA = [sxp, sy - 0.125 * tw];
            const baseB = [sxp, sy + 0.125 * tw];
            const tip = [sxp - 0.5 * tw * Math.cos(Math.PI / 6), sy - 0.5 * tw * Math.sin(Math.PI / 6)];
            poly(ctx, [baseA, baseB, tip]);
            ctx.fillStyle = litCol;
            ctx.fill();
          }
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  /* one building's geometry at this frame; towers are the buildings that
     rise into skyscrapers as S.modern climbs, each on its own delay */
  function cityGeom(tw, band, amt, modern) {
    const grow = clamp((amt - tw.born) / 0.20, 0, 1);
    const x = sx(MAIN_U + tw.u * MAIN_HALF);
    const hScale = G.H / 900;
    const isTower = hash1(tw.wseed + 77) < band.tower;
    const kb = isTower ? smooth(clamp((modern - 0.55 * hash1(tw.wseed + 91)) / 0.45, 0, 1)) : 0;
    const w = tw.w * hScale * mix(1, 0.82, kb);
    const hOld = tw.h * G.H * grow * mix(0.38, 1.08, amt);
    const hTower = (0.24 + 0.16 * hash1(tw.wseed + 5)) * G.H;
    const h = mix(hOld, hTower, kb);
    const yl = surfY(x - w / 2) + 6;
    const yr = surfY(x + w / 2) + 6;
    const yt = Math.min(yl, yr) - h;
    return { x, w, h, yl, yr, yt, grow, kb };
  }

  function drawCity(ctx, S) {
    const amt = (S && S.civAmt) || 0;
    if (amt < 0.01) return;
    const rise = (S && S.mainRise) || 0;
    const ret = (S && S.ret) || 0;
    const lock = (S && S.lock) || 0;
    const modern = (S && S.modern) || 0;
    const vis = clamp(amt * 3, 0, 1);
    const winBoost = mix(0.35, 1, Math.max(ret, lock * 0.4));
    const lampA = clamp((ret - 0.25) / 0.3, 0, 1);
    const hScale = G.H / 900;

    /* pass 1: walls and roofs for all three bands, far to near; the city
       wall rampart is drawn in the near band's turn, before its towers */
    for (const band of CITY_BANDS) {
      ctx.globalAlpha = vis * rise * band.alpha;

      if (band.wall) {
        const wallH = 0.045 * G.H * amt * (1 - modern);
        if (wallH >= 1) {
          const xWallL = sx(CITY_U - 0.30);
          const xWallR = sx(CITY_U + 0.30);
          for (let x0 = xWallL; x0 < xWallR; x0 += 40) {
            const x1 = Math.min(x0 + 40, xWallR);
            const g0 = surfY(x0), g1 = surfY(x1);
            const xSplit = x0 + 0.35 * (x1 - x0);
            litShade(ctx, () => poly(ctx, [[x0, g0], [x0, g0 - wallH], [x1, g1 - wallH], [x1, g1]]),
              xSplit, band.lit, band.shade);
          }
          const wallTop = surfY((xWallL + xWallR) * 0.5) - wallH;
          merlons(ctx, xWallL, xWallR, wallTop, 8, 6, 6, band.lit, band.shade, xWallL + 0.35 * (xWallR - xWallL));
        }
      }

      for (const tw of band.list) {
        if (tw.born >= amt) continue;
        const { x, w, h, yl, yr, yt, kb } = cityGeom(tw, band, amt, modern);
        const xSplit = x - 0.15 * w;
        const litC = mixHex(band.lit, "#4a6070", 0.45 * kb);
        const shadeC = mixHex(band.shade, "#26323c", 0.45 * kb);

        litShade(ctx, () => poly(ctx, [[x - w / 2, yl], [x - w / 2, yt], [x + w / 2, yt], [x + w / 2, yr]]),
          xSplit, litC, shadeC);

        const rs = kb < 0.5 ? 1 - 2 * kb : 0;
        let roofTop = yt;
        if (rs > 0.01) {
          if (tw.roof === 1) {
            roofTop = yt - 0.45 * w * rs;
            litShade(ctx, () => poly(ctx, [[x - w / 2 - 0.08 * w, yt], [x, roofTop], [x + w / 2 + 0.08 * w, yt]]),
              xSplit, litC, shadeC);
          } else if (tw.roof === 2) {
            const rx = 0.5 * w, ry = 0.42 * w * rs;
            roofTop = yt - ry;
            litShade(ctx, () => { ctx.beginPath(); ctx.ellipse(x, yt, rx, ry, 0, Math.PI, Math.PI * 2); ctx.closePath(); },
              xSplit, litC, shadeC);
          } else if (tw.roof === 3) {
            roofTop = yt - 1.6 * w * rs;
            litShade(ctx, () => poly(ctx, [[x - 0.25 * w, yt], [x, roofTop], [x + 0.25 * w, yt]]),
              xSplit, litC, shadeC);
          } else {
            roofTop = yt - 0.06 * w * rs;
            litShade(ctx, () => poly(ctx, [[x - 0.55 * w, yt], [x - 0.55 * w, roofTop], [x + 0.55 * w, roofTop], [x + 0.55 * w, yt]]),
              xSplit, litC, shadeC);
          }
        }

        if (kb > 0.5) {
          const cs = 2 * kb - 1;
          const cbH = 0.06 * h * cs;
          const cbW = 0.62 * w;
          const setbackTop = yt - cbH;
          litShade(ctx, () => poly(ctx, [[x - cbW / 2, yt], [x - cbW / 2, setbackTop], [x + cbW / 2, setbackTop], [x + cbW / 2, yt]]),
            xSplit, litC, shadeC);
          const antW = Math.max(1, 1.5 * hScale);
          const antTop = setbackTop - 0.07 * G.H * cs;
          ctx.fillStyle = shadeC;
          ctx.fillRect(x - antW / 2, antTop, antW, setbackTop - antTop);
          roofTop = antTop;
          if (band.win) {
            ctx.globalAlpha = vis * rise * band.alpha * cs * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(G.t * 3 + tw.wseed)));
            circle(ctx, x, roofTop, 1.8 * hScale, "#ff4a3a");
            ctx.globalAlpha = vis * rise * band.alpha;
          }
        }

        if (tw.lamp && ret > 0.25) {
          ctx.globalAlpha = lampA;
          circle(ctx, x, roofTop, 2.5, "#f5d06b");
          ctx.globalAlpha = 1;
          flatGlow(ctx, x, roofTop, 22 * hScale, "245,208,107", 0.7 * lampA);
          ctx.globalAlpha = vis * rise * band.alpha;
        }
      }
    }

    /* pass 2: lit windows, mid and near bands only */
    for (const band of CITY_BANDS) {
      if (!band.win) continue;
      for (const tw of band.list) {
        if (tw.born >= amt) continue;
        const { x, w, yl, yt, grow, kb } = cityGeom(tw, band, amt, modern);
        const rowStep = 11 * hScale, colStep = 9 * hScale;
        const yBot = yl - 10;
        const xL2 = x - w / 2 + 4, xR2 = x + w / 2 - 4;
        let row = 0;
        for (let wy = yt + 0.12 * w; wy <= yBot; wy += rowStep, row++) {
          let col = 0;
          for (let wx = xL2; wx <= xR2; wx += colStep, col++) {
            const hkey = tw.wseed + row * 17 + col * 3;
            if (hash1(hkey) >= 0.30) continue;
            const warm = hash1(hkey + 401) < mix(0.78, 0.35, kb);
            const flicker = 0.75 + 0.25 * Math.sin(G.t * 2.1 + tw.wseed);
            ctx.globalAlpha = flicker * band.alpha * grow * winBoost;
            ctx.fillStyle = warm ? "#f5d06b" : "#8fb0b8";
            ctx.fillRect(wx, wy, 2.2, 3);
          }
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawNestPit(ctx, S) {
    const n = (S && S.nestAmt) || 0;
    if (n < 0.01) return;
    const x = sx(NEST_U);
    const y = surfY(x) + 4;
    const R = Math.min(G.W, G.H) * 0.06 * n;
    const slope = surfSlope(x);
    const tilt = 0.5 * Math.atan(slope);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);

    flatGlow(ctx, 0.1 * R, 0, 1.3 * R, "200,36,40", 0.45 * n * (0.8 + 0.2 * Math.sin(G.t * 2.2)));

    ctx.fillStyle = `rgba(50,6,8,${0.7 * n})`;
    ctx.beginPath(); ctx.ellipse(0, 0, 2.1 * R, 0.42 * R, 0, 0, 6.283); ctx.fill();

    const hx = 0.2 * R, hy = 0.04 * R;
    ctx.fillStyle = `rgba(8,0,1,${0.97 * n})`;
    ctx.beginPath(); ctx.ellipse(hx, hy, 1.4 * R, 0.28 * R, 0, 0, 6.283); ctx.fill();

    offsetShade(ctx, () => { ctx.beginPath(); ctx.ellipse(hx, hy, 1.4 * R, 0.28 * R, 0, 0, 6.283); ctx.closePath(); },
      0, -0.12 * R, `rgba(120,14,20,${0.8 * n})`, `rgba(8,0,1,${0.97 * n})`);

    ctx.strokeStyle = `rgba(140,16,22,${0.5 * n})`;
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";
    for (let k = 0; k < 5; k++) {
      const sign = k % 2 === 0 ? 1 : -1;
      const mag = 0.5 + 0.12 * k;
      const len = R * (1.1 + 0.45 * Math.sin(G.t * 1.8 + k));
      for (const ang of [Math.PI + sign * mag, sign * mag]) {
        const dx = Math.cos(ang), dy = Math.sin(ang) * 0.3;
        const rx0 = 2.1 * R * Math.cos(ang), ry0 = 0.42 * R * Math.sin(ang);
        ctx.beginPath();
        ctx.moveTo(rx0, ry0);
        ctx.quadraticCurveTo(rx0 + dx * len * 0.45, ry0 + dy * len * 0.45, rx0 + dx * len, ry0 + dy * len);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  return { heightAt, surfYAt, surfY, surfSlope, drawMainland, drawCity, drawNestPit, SPIRES, spireGeom };
})();
