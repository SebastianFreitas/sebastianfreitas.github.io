/* genesis-saga.js — the mainland and the children's war: one state
   object per frame (sagaAt) and everything drawn from it. */
(function () {
  const G = window.Gen;
  const { clamp, mix, ridge } = Util;
  const { DECK, MAIN_U, MAIN_HALF, MAIN_BANDS, troops, cityFar, cityMid, cityNear,
          spikes, sx } = G;
  const { fillRidge, gridXs, mixHex, flatGlow, mainDome, mainHeight, mainBandHeight,
          mainSurfY, standY } = GenPaint;
  const { pushTrail, drawTrail, drawOrb, drawRings, drawBeam, drawTintBeam, drawName } = GenVoid;
  const { sagaAt } = window.GenSaga;

  function drawMainland(ctx, S) {
    const rise = S && S.mainRise;
    if (!rise || rise < 0.02) return;
    const scar = S.scar || 0;
    const corrupt = S.corrupt || 0;
    const deckY = G.H * DECK;
    const bottom = G.H + 80;
    const step = 5;
    /* The land does not stop at the rim: past it the surface shears
       down and away, and that tail is still well inside the frame
       long after the rim itself has left it. Culling on the rim
       alone is what dropped the corners out in a single frame once
       the camera moved off. This is the furthest the shallowest
       tail can still reach back into view. */
    const tail = 0.16 * G.W + (G.H + 160 - deckY) / 1.1;
    const xL = sx(MAIN_U - MAIN_HALF);
    const xR = sx(MAIN_U + MAIN_HALF);
    if (xR < -tail || xL > G.W + tail) return;
    /* and sample the whole frame rather than a box around the land:
       on a wide window the old box ended the fill in a vertical wall
       partway across the screen */
    const left = -60;
    const right = G.W + 60;

    /* past the rim the land shears off downward instead of stopping
       dead, which is what made it read as a slab hanging in the dark */
    const rimY = (wu, shear, out, seed) => {
      const d = Math.max(0, Math.abs(wu - MAIN_U) - MAIN_HALF - (out || 0));
      const broken = 1 + (ridge(wu * 26, seed || 7703) - 0.5) * 0.55
                       + (ridge(wu * 62, (seed || 7703) + 11) - 0.5) * 0.22;
      return deckY + d * G.W * (shear || 2.2) * broken;
    };

    /* the two ranges behind, first
       past the rim the back ranges ride 8px under the near range's tail, otherwise
       their shallower shear left a lighter band hugging the bridge at the frame edges */
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

    /* the near range, the one everything stands on */
    const top = [];
    for (const [px, wu] of gridXs(left, right, step)) {
      const dome = mainDome(wu);
      const y = dome > 0.002 ? G.H * DECK - mainHeight(wu, scar) * G.H : rimY(wu, 2.9, 0, 7703);
      if (y > G.H + 120) continue;
      top.push([px, mix(G.H + 28, y, rise)]);
    }
    if (top.length < 3) return;

    ctx.globalAlpha = rise;
    fillRidge(ctx, top, bottom, mixHex("#1a222a", "#3a1a1e", cu), mixHex("#10161b", "#24100f", cu));
    ctx.globalAlpha = 1;

    if (corrupt > 0.06) {
      for (const sp of spikes) {
        if (sp.born > corrupt) continue;
        const wu = MAIN_U + sp.u;
        const x = sx(wu);
        /* margin is the widest the shape can be, not the anchor
           point, or tall things pop out while still half in frame */
        if (x < -90 || x > G.W + 90) continue;
        const grow = clamp((corrupt - sp.born) / 0.22, 0, 1);
        if (grow < 0.04) continue;
        const y = mainSurfY(wu, rise, scar) + 3;
        const th = sp.h * G.H * grow * mix(0.55, 1.15, corrupt);
        const tw = sp.w * mix(0.7, 1, grow);
        const lean = sp.lean * grow;
        const pulse = 0.85 + 0.15 * Math.sin(G.t * 1.3 + sp.ph);
        const sp2 = new Path2D();
        sp2.moveTo(x - tw * 0.58, y + 4);
        const n = sp.teeth.length;
        for (let i = 0; i < n; i++) {
          const u = (i + 0.55) / (n + 1);
          const jag = (sp.teeth[i] - 0.5) * tw * 0.42;
          sp2.lineTo(
            x - tw * 0.42 * (1 - u) + lean * u + jag,
            y - th * Math.pow(u, 0.62) * (0.35 + 0.65 * u) * pulse
          );
        }
        sp2.lineTo(x + lean, y - th * pulse);
        for (let i = n - 1; i >= 0; i--) {
          const u = (i + 0.55) / (n + 1);
          const jag = (sp.teeth[i] - 0.5) * tw * 0.34;
          sp2.lineTo(
            x + tw * 0.40 * (1 - u) + lean * u + jag,
            y - th * Math.pow(u, 0.66) * (0.32 + 0.68 * u) * pulse
          );
        }
        sp2.lineTo(x + tw * 0.52, y + 4);
        sp2.closePath();
        const litCol = `rgba(${sp.shade < 0.4 ? 70 : 110},8,10,${0.92 * rise})`;
        const shadeCol = `rgba(34,5,7,${0.95 * rise})`;
        ctx.fillStyle = litCol;
        ctx.fill(sp2);
        ctx.save();
        ctx.clip(sp2);
        ctx.fillStyle = shadeCol;
        ctx.fillRect(x + lean * 0.4 + tw * 0.06, -1e5, 2e5, 2e5);
        ctx.restore();
      }
    }
  }

  function drawCity(ctx, S) {
    const amt = S && S.civAmt;
    if (!amt || amt < 0.03) return;
    const rise = S.mainRise || 1;
    const scar = S.scar || 0;
    const bands = [
      { list: cityFar,  lit: "#1f282d", shade: "#141a1e", alpha: 0.55 },
      { list: cityMid,  lit: "#222c32", shade: "#161d21", alpha: 0.78 },
      { list: cityNear, lit: "#26323a", shade: "#182025", alpha: 1 },
    ];
    for (const band of bands) {
      ctx.globalAlpha = amt * rise * band.alpha;
      for (const tw of band.list) {
        if (tw.born > amt) continue;
        const wu = MAIN_U + tw.u * MAIN_HALF;
        const x = sx(wu);
        if (x < -80 || x > G.W + 80) continue;
        const grow = clamp((amt - tw.born) / 0.20, 0, 1);
        if (grow < 0.04) continue;
        const floor = mainSurfY(wu, rise, scar) + 2;
        const h = tw.h * G.H * grow * mix(0.38, 1.08, amt);
        const w = Math.max(2, tw.w * mix(0.75, 1, grow));
        ctx.fillStyle = band.lit;
        ctx.fillRect(x - w * 0.5, floor - h, w * 0.3, h);
        ctx.fillStyle = band.shade;
        ctx.fillRect(x - w * 0.5 + w * 0.3, floor - h, w * 0.7, h);
      }
      ctx.globalAlpha = 1;
    }
    for (const tw of cityNear) {
      if (tw.born > amt) continue;
      const wu = MAIN_U + tw.u * MAIN_HALF;
      const x = sx(wu);
      if (x < -80 || x > G.W + 80) continue;
      const grow = clamp((amt - tw.born) / 0.20, 0, 1);
      if (grow < 0.18) continue;
      const floor = mainSurfY(wu, rise, scar) + 2;
      const h = tw.h * G.H * grow * mix(0.38, 1.08, amt);
      const w = Math.max(2, tw.w * mix(0.75, 1, grow));
      const k = mix(0.7, 1, grow);
      for (const win of tw.windows) {
        const px = x - w * 0.5 + win.dx * k;
        const py = floor - h + win.dy * k;
        if (py > floor - 6 || py < floor - h + 4) continue;
        ctx.globalAlpha = win.a * (0.75 + 0.25 * Math.sin(G.t * 2.1 + win.fl)) * amt * grow * 0.9;
        ctx.fillStyle = win.warm ? "#f5d06b" : "#8fb0b8";
        ctx.fillRect(px, py, 2.1, 2.8);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawSpark(ctx, x, y, rgb, rad, a) {
    if (a < 0.04) return;
    flatGlow(ctx, x, y, rad * 2.4, rgb, a);
    ctx.fillStyle = `rgba(255,255,248,${0.55 * a})`;
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.6, rad * 0.32), 0, 6.283); ctx.fill();
  }

  function drawArmies(ctx, S) {
    if (!S || S.army < 0.04) return;
    const push = clamp(S.army, 0, 1);
    let motion = 1;
    if (S.stall > 0) motion = mix(1, 0.12, clamp(S.stall, 0, 1));
    if (S.lock > 0) motion = 0.12;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const c of troops) {
      if (c.born > S.army) continue;
      /* both sides charge the front line at MAIN_U and surge back and
         forth across it, so the front ranks are actually in each other */
      const front = clamp(1 - Math.abs(c.home) / 0.78, 0, 1);
      const surge = push * (0.6 + 0.4 * Math.sin(G.t * 0.9 + c.ph)) * mix(0.35, 1, front);
      const side = c.kind === "vorgath" ? 1 : -1;
      const u = MAIN_U + mix(c.home, side * -0.035 * front, clamp(surge * 0.9, 0, 1) * motion)
              + Math.sin(G.t * (0.7 + c.gait) + c.ph) * 0.018 * motion;
      const x = sx(u);
      if (x < -40 || x > G.W + 40) continue;
      const y = mainSurfY(u, S.mainRise, S.scar) - 10 - (c.lane || 0) * G.H * 0.075
              + Math.sin(G.t * 1.7 + c.ph) * 2.2 * motion;
      const a = (0.5 + 0.5 * (0.5 + 0.5 * Math.sin(G.t * 2 + c.ph))) * clamp((S.army - c.born) / 0.08, 0, 1);
      if (a < 0.05) continue;
      const rgb = c.kind === "vorgath" ? "160,24,28"
                : c.kind === "seraphin" ? "214,230,222"
                : "255,176,90";
      drawSpark(ctx, x, y, rgb, 1.5 + c.s * 1.05, a);
    }
    ctx.restore();
  }

  function drawNestPit(ctx, S) {
    if (!S || S.nestAmt < 0.04) return;
    const x = sx(S.nestU), y = mainSurfY(S.nestU, S.mainRise, S.scar) + 6;
    const R = Math.min(G.W, G.H) * 0.055 * S.nestAmt;
    ctx.fillStyle = `rgba(50,6,8,${0.6 * S.nestAmt})`;
    ctx.beginPath(); ctx.ellipse(x, y, R * 2.1, R * 0.42, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = `rgba(8,0,1,${0.96 * S.nestAmt})`;
    ctx.beginPath(); ctx.ellipse(x + R * 0.2, y + R * 0.04, R * 1.4, R * 0.28, 0, 0, 6.283); ctx.fill();
    ctx.save();
    ctx.strokeStyle = `rgba(140,16,22,${0.5 * S.nestAmt})`;
    ctx.lineWidth = 1.15;
    ctx.lineCap = "round";
    for (let i = 0; i < 7; i++) {
      const ang = Math.PI + (i - 3) * 0.22 + Math.sin(G.t * 1.4 + i) * 0.08;
      const len = R * (1.1 + 0.45 * Math.sin(G.t * 1.8 + i));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + Math.cos(ang) * len * 0.45,
        y + Math.sin(ang) * len * 0.25,
        x + Math.cos(ang) * len,
        y + Math.sin(ang) * len * 0.35
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSaga(ctx) {
    const S = sagaAt();
    if (!S) return;

    drawMainland(ctx, S);
    drawCity(ctx, S);
    drawNestPit(ctx, S);
    drawArmies(ctx, S);

    const ox = sx(S.ou), oy = S.oy;
    const mx = sx(S.mu), my = S.my;
    const ax = sx(S.au), ay = S.ay;

    if (S.oAmt > 0.02) { pushTrail(G.trailR, ox, oy); drawTrail(ctx, G.trailR, "90,12,18", S.oAmt, true); }
    if (S.mAmt > 0.02) { pushTrail(G.trailM, mx, my); drawTrail(ctx, G.trailM, "210,70,48", S.mAmt); }
    if (S.aAmt > 0.02) { pushTrail(G.trailA, ax, ay); drawTrail(ctx, G.trailA, "120,214,96", S.aAmt); }

    if (S.fightW > 0.05) {
      drawBeam(ctx, mx, my, ox, oy, S.strikeM * S.fightW * S.mAmt);
      drawTintBeam(ctx, ax, ay, ox, oy, "120,214,96", S.strikeA * S.fightW * S.aAmt);
    }

    if (S.lock > 0.40 && S.lock < 0.82 && S.mAmt > 0.08 && S.aAmt > 0.08) {
      const p = 1 - Math.abs(S.lock - 0.58) / 0.18;
      if (p > 0) {
        G.flash = Math.max(G.flash, p * 0.7);
        G.shake = Math.max(G.shake, 0.32 * p);
        drawTintBeam(ctx, mx, my, ax, ay, "220,210,180", p);
        drawTintBeam(ctx, mx, my, sx(S.mdU), S.mdY, "200,32,40", p * S.mdAmt);
        drawTintBeam(ctx, ax, ay, sx(S.mdU), S.mdY, "120,214,96", p * S.mdAmt);
      }
    }

    if (S.fifth > 0.12 && S.fifth < 0.72 && S.cAmt > 0.1) {
      const beam = Math.sin(clamp((S.fifth - 0.12) / 0.5, 0, 1) * 3.14);
      drawTintBeam(ctx, sx(S.cU), S.cY, sx(S.nestU), mainSurfY(S.nestU, S.mainRise, S.scar) + 4, "170,60,40", beam * S.cAmt * 0.85);
    }

    if (S.war > 0.08 && S.et < 0.02) {
      const clashY = standY(0, MAIN_U, S.mainRise, S.scar);
      if (Math.sin(G.t * 9.0) > 0.35 && G.clashCool <= 0 && S.army > 0.1) {
        G.clashCool = 0.12;
        const cu = MAIN_U + (Math.random() - 0.5) * 0.10;
        G.rings.push({ x: sx(cu), y: clashY - Math.random() * 18, r: 5, a: 0.75 });
        G.shake = Math.max(G.shake, 0.16);
      }
    }

    drawOrb(ctx, sx(S.mdU), S.mdY, S.mdAmt, "mordrial", 0.58);
    drawOrb(ctx, sx(S.cU), S.cY, S.cAmt, "cadmus", 0.52);
    drawOrb(ctx, sx(S.aelU), S.aelY, S.aelAmt, "aelius", 0.52);
    drawOrb(ctx, sx(S.vU), S.vY, S.vAmt, "velindra", 0.52);
    drawOrb(ctx, sx(S.hU), S.hY, S.hAmt, "hound", 0.62);

    drawOrb(ctx, ox, oy, S.oAmt, "obrokxus");
    drawOrb(ctx, mx, my, S.mAmt, "ormius");
    drawOrb(ctx, ax, ay, S.aAmt, "ava");

    const nameUp = S.et > 0 ? 0 : 1;
    drawName(ctx, sx(S.mdU), S.mdY, S.mdAmt * (1 - S.dieM) * nameUp, "MORDRIAL", 30);
    drawName(ctx, sx(S.cU), S.cY, S.cAmt * nameUp, "CADMUS", 26);
    drawName(ctx, sx(S.aelU), S.aelY, S.aelAmt * nameUp, "AELIUS", 40);
    drawName(ctx, sx(S.vU), S.vY, S.vAmt * nameUp, "VELINDRA", 26);
    drawName(ctx, sx(S.hU), S.hY, S.hAmt * nameUp, "THE HOUND", 34);
    drawName(ctx, ox, oy, S.oAmt, "OBROKXUS", 34);
    drawName(ctx, mx, my, S.mAmt, "ORMIUS", 30);
    drawName(ctx, ax, ay, S.aAmt, "AVA", 40);

    if (S.fightW > 0.3 && S.oAmt > 0.2) {
      const hits = [[mx, my, S.mAmt], [ax, ay, S.aAmt]];
      for (const hit of hits) {
        if (hit[2] < 0.2 || G.clashCool > 0) continue;
        if (Math.hypot(hit[0] - ox, hit[1] - oy) < 42) {
          G.flash = Math.max(G.flash, 0.8);
          G.shake = Math.max(G.shake, 0.6);
          G.clashCool = 0.24;
          G.rings.push({ x: (hit[0] + ox) * 0.5, y: (hit[1] + oy) * 0.5, r: 10, a: 1 });
        }
      }
    }
    if (S.fall > 0.10 && S.fall < 0.86 && S.oAmt > 0.2) {
      const five = [
        [sx(S.mdU), S.mdY, S.mdAmt, "200,32,40"],
        [sx(S.cU), S.cY, S.cAmt, "170,60,40"],
        [sx(S.aelU), S.aelY, S.aelAmt, "30,160,100"],
        [sx(S.vU), S.vY, S.vAmt, "140,70,210"],
        [sx(S.hU), S.hY, S.hAmt, "220,30,36"],
      ];
      for (let i = 0; i < five.length; i++) {
        const f = five[i];
        if (f[2] < 0.15) continue;
        drawTintBeam(ctx, f[0], f[1], ox, oy, f[3], S.fallStrikes[i] * f[2] * S.oAmt);
        if (G.clashCool <= 0 && Math.hypot(f[0] - ox, f[1] - oy) < 44) {
          G.flash = Math.max(G.flash, 0.9);
          G.shake = Math.max(G.shake, 0.9);
          G.clashCool = 0.16;
          G.rings.push({ x: (f[0] + ox) * 0.5, y: (f[1] + oy) * 0.5, r: 10, a: 1 });
        }
      }
    }
    if (S.et > 0.12 && S.oAmt > 0.2 && S.mAmt > 0.2) {
      drawBeam(ctx, mx, my, ox, oy, S.etStrike * Math.min(S.oAmt, S.mAmt));
      const dx = mx - ox, dy = my - oy;
      if (Math.hypot(dx, dy) < 40 && G.clashCool <= 0) {
        G.flash = 0.7;
        G.shake = Math.max(G.shake, 0.45);
        G.clashCool = 0.2;
        G.rings.push({ x: (mx + ox) * 0.5, y: (my + oy) * 0.5, r: 8, a: 0.85 });
      }
    }
    if (S.fleeLin > 0.08 && S.fleeLin < 0.96) G.shake = Math.max(G.shake, 0.10);
    if (S.war > 0.05 && S.war < 0.95) G.shake = Math.max(G.shake, 0.14);
    if (S.fifth > 0.2 && S.fifth < 0.8) G.shake = Math.max(G.shake, 0.22);
    if (S.fall > 0.15) G.shake = Math.max(G.shake, 0.20 + S.fall * 0.22);
    if (S.dieM > 0.05 && S.dieM < 0.7) G.shake = Math.max(G.shake, 0.55);
    drawRings(ctx);
  }

  function drawLiveWorld(ctx, amt) {
    if (amt < 0.01 || !window.World) return;
    const camX = G.thenCamX != null ? G.thenCamX : World.LAND.bridge;
    const mode = G.thenMode === "gamedev" ? "gamedev" : "void";
    ctx.save();
    ctx.globalAlpha = clamp(amt, 0, 1);
    World.draw(ctx, {
      W: G.W, H: G.H, camX, t: G.t, vel: 0,
      maxFling: 38000,
      chaos: mode === "void" ? World.chaosAt(camX) : 0,
      future: mode === "void" ? World.futureAt(camX) : 0,
      mode,
    });
    ctx.restore();
  }

  window.GenSaga = Object.assign(window.GenSaga || {}, { drawSaga, drawLiveWorld });
})();
