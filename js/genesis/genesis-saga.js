/* genesis-saga.js — the mainland's war, drawn from one state object per
   frame (sagaAt): the ground and city come from GenMain, the armies from
   GenArmies, and the cast — Obrokxus, the three gods, the four warlocks,
   the Hound and Eldrin — are figures from GenFig, not glowing discs. */
(function () {
  const G = window.Gen;
  const { clamp } = Util;
  const { ORB_STYLE, sx } = G;
  const { pushTrail, drawTrail, drawRings, drawBeam, drawTintBeam, drawName } = GenVoid;
  const { sagaAt } = window.GenSaga;

  let lastT = 0, lastBeat = -1;
  let lashLatch = false, darkLatch = false;

  /* a reaching hand: shoulder is fixed to the body, the hand sits out
     along the shoulder-to-target direction, `amt` of the way there */
  function godHand(x, yFoot, h, face, tx, ty) {
    const shx = x + face * 0.18 * h, shy = yFoot - 0.66 * h;
    const dx = tx - shx, dy = ty - shy;
    const len = Math.hypot(dx, dy) || 1;
    return { x: shx + (dx / len) * 0.44 * h, y: shy + (dy / len) * 0.44 * h };
  }

  function drawSaga(ctx) {
    const S = sagaAt();
    if (!S) return;

    if (G.beat !== lastBeat) { lastBeat = G.beat; lastT = G.t; }
    const dt = clamp(G.t - lastT, 0, 0.05);
    lastT = G.t;

    GenMain.drawMainland(ctx, S);
    GenMain.drawCity(ctx, S);
    GenMain.drawNestPit(ctx, S);
    GenArmies.step(dt, S);
    GenArmies.draw(ctx, S);

    const F = window.GenFig;
    if (!F) return;

    /* ---- cast geometry: screen x, height, and yFoot (ground/hover y)
       for everyone. The three gods hover — their state y is the body
       CENTRE, so yFoot is that plus 0.45h; everyone else already has a
       ground-relative y from GenMain.surfYAt, used as-is. */
    const hO = 0.26 * G.H, oxS = sx(S.ou), oyFootO = S.oy + 0.45 * hO;
    const oEyeX = oxS + S.oFace * 0.10 * hO, oEyeY = oyFootO - 0.50 * hO;

    const hM = 0.17 * G.H, mX = sx(S.mu), mYFoot = S.my + 0.45 * hM;
    const hA = 0.17 * G.H, aX = sx(S.au), aYFoot = S.ay + 0.45 * hA;

    const hMd = 0.13 * G.H, mdX = sx(S.mdU), mdYFoot = S.mdY;
    const hC = 0.13 * G.H, cX = sx(S.cU), cYFoot = S.cY;
    const hAel = 0.13 * G.H, aelX = sx(S.aelU), aelYFoot = S.aelY;
    const hV = 0.13 * G.H, vX = sx(S.vU), vYFoot = S.vY;

    const hH = 0.085 * G.H, hX = sx(S.hU), hYFoot = S.hY;

    /* ---- the cast, back to front: Eldrin, the Hound, the warlocks,
       Ormius, Ava, Obrokxus */
    if (S.elAmt > 0.01) {
      F.drawMortal(ctx, sx(S.elU), S.elY, 0.09 * G.H, { a: S.elAmt, face: 1, walk: G.t * 7 });
    }

    if (S.hAmt > 0.01) {
      F.drawHound(ctx, hX, hYFoot, hH, {
        a: S.hAmt, face: S.hFace, run: S.hRun ? G.t * 9 : G.t * 2, jaw: 0.2 + 0.4 * S.fallStrikes[4],
      });
    }

    const mdStyle = { lit: "#c8202a", shade: "#7a1218", glow: "190,30,36", core: "#f2e6d8" };
    let mdPose = "stand";
    if (S.fallStrikes[0] > 0.05) mdPose = "cast";
    else if (S.mdWalk) mdPose = "walk";
    else if (S.mdFall > 0.9) mdPose = "dead";
    let mdG = { gx: 0, gy: 0 };
    if (S.mdAmt > 0.01) {
      mdG = F.drawWarlock(ctx, mdX, mdYFoot, hMd, mdStyle, {
        a: S.mdAmt, face: S.mdFace, pose: mdPose, split: true,
        tilt: S.mdFall * (Math.PI / 2) * S.mdFace, walk: G.t * 140,
      });
    }

    let cPose = "stand";
    if (S.fallStrikes[1] > 0.05 || (S.fifth > 0.12 && S.fifth < 0.72)) cPose = "cast";
    else if (S.cWalk) cPose = "walk";
    let cG = { gx: 0, gy: 0 };
    if (S.cAmt > 0.01) {
      cG = F.drawWarlock(ctx, cX, cYFoot, hC, ORB_STYLE.cadmus, {
        a: S.cAmt, face: S.cFace, pose: cPose, walk: G.t * 140,
      });
    }

    let aelPose = "stand";
    if (S.fallStrikes[2] > 0.05) aelPose = "cast";
    else if (S.aelWalk) aelPose = "walk";
    let aelG = { gx: 0, gy: 0 };
    if (S.aelAmt > 0.01) {
      aelG = F.drawWarlock(ctx, aelX, aelYFoot, hAel, ORB_STYLE.aelius, {
        a: S.aelAmt, face: S.aelFace, pose: aelPose, walk: G.t * 140,
      });
    }

    let vPose = "stand";
    if (S.fallStrikes[3] > 0.05) vPose = "cast";
    else if (S.vWalk) vPose = "walk";
    let vG = { gx: 0, gy: 0 };
    if (S.vAmt > 0.01) {
      vG = F.drawWarlock(ctx, vX, vYFoot, hV, ORB_STYLE.velindra, {
        a: S.vAmt, face: S.vFace, pose: vPose, walk: G.t * 140,
      });
    }

    const inWarArc = S.war > 0 && S.lock <= 0;
    if (S.war <= 0 && S.mAmt > 0.02) { pushTrail(G.trailM, mX, S.my); drawTrail(ctx, G.trailM, "210,70,48", S.mAmt); }
    if (S.mAmt > 0.01) {
      F.drawGod(ctx, mX, mYFoot, hM, ORB_STYLE.ormius, {
        a: S.mAmt, face: S.mFace, crown: "bars",
        reach: { x: oEyeX, y: oEyeY, amt: S.war <= 0 ? S.strikeM : S.etStrike },
        tilt: inWarArc ? -0.3 * S.mFace : 0,
      });
    }

    if (S.war <= 0 && S.aAmt > 0.02) { pushTrail(G.trailA, aX, S.ay); drawTrail(ctx, G.trailA, "120,214,96", S.aAmt); }
    if (S.aAmt > 0.01) {
      F.drawGod(ctx, aX, aYFoot, hA, ORB_STYLE.ava, {
        a: S.aAmt, face: S.aFace, crown: "rings", wings: true,
        reach: { x: oEyeX, y: oEyeY, amt: S.war <= 0 ? S.strikeA : 0 },
      });
    }

    /* Obrokxus: looks toward whoever he's nearest (excluding Eldrin,
       who isn't a combatant) */
    const foes = [
      { u: S.mu, amt: S.mAmt, x: mX, y: mYFoot },
      { u: S.au, amt: S.aAmt, x: aX, y: aYFoot },
      { u: S.mdU, amt: S.mdAmt, x: mdX, y: mdYFoot },
      { u: S.cU, amt: S.cAmt, x: cX, y: cYFoot },
      { u: S.aelU, amt: S.aelAmt, x: aelX, y: aelYFoot },
      { u: S.vU, amt: S.vAmt, x: vX, y: vYFoot },
      { u: S.hU, amt: S.hAmt, x: hX, y: hYFoot },
    ];
    let nearFoe = null, nearD = Infinity;
    for (const f of foes) {
      if (f.amt < 0.02) continue;
      const d = Math.abs(f.u - S.ou);
      if (d < nearD) { nearD = d; nearFoe = f; }
    }
    const look = nearFoe || { x: oEyeX, y: oEyeY };

    let oPose = "stand", oReach = null;
    if (S.war <= 0) {
      oPose = "flee";
    } else if (S.fallBeat) {
      const fallFigs = [
        { x: mdX, y: mdYFoot, s: S.fallStrikes[0] },
        { x: cX, y: cYFoot, s: S.fallStrikes[1] },
        { x: aelX, y: aelYFoot, s: S.fallStrikes[2] },
        { x: vX, y: vYFoot, s: S.fallStrikes[3] },
        { x: hX, y: hYFoot, s: S.fallStrikes[4] },
      ];
      let top = fallFigs[0];
      for (const f of fallFigs) if (f.s > top.s) top = f;
      if (top.s > 0.3 || S.lashM > 0) {
        oPose = "lunge";
        oReach = S.lashM > 0 ? { x: mdX, y: mdYFoot } : { x: top.x, y: top.y };
      }
    } else if (S.etBeat) {
      const oStrike = Math.pow(Math.max(0, Math.sin(19.2 * S.etLin + Math.PI)), 5);
      if (oStrike > 0) { oPose = "lunge"; oReach = { x: mX, y: mYFoot }; }
    }

    if (S.war <= 0 && S.oAmt > 0.02) { pushTrail(G.trailR, oxS, S.oy); drawTrail(ctx, G.trailR, "90,12,18", S.oAmt, true); }
    if (S.oAmt > 0.01) {
      F.drawTitan(ctx, oxS, oyFootO, hO, "obrokxus", {
        a: S.oAmt, face: S.oFace, pose: oPose, reach: oReach || look, look,
      });
    }

    /* ---- beams, from hands and staff-gems, not centres --------- */
    if (S.fightW > 0.05 && S.oAmt > 0.05) {
      const mHand = godHand(mX, mYFoot, hM, S.mFace, oEyeX, oEyeY);
      const aHand = godHand(aX, aYFoot, hA, S.aFace, oEyeX, oEyeY);
      drawBeam(ctx, mHand.x, mHand.y, oEyeX, oEyeY, S.strikeM * S.fightW * S.mAmt);
      drawTintBeam(ctx, aHand.x, aHand.y, oEyeX, oEyeY, "120,214,96", S.strikeA * S.fightW * S.aAmt);
    }

    if (S.lock > 0.40 && S.lock < 0.82 && S.mAmt > 0.08 && S.aAmt > 0.08) {
      const p = 1 - Math.abs(S.lock - 0.58) / 0.18;
      if (p > 0) {
        G.flash = Math.max(G.flash, p * 0.7);
        G.shake = Math.max(G.shake, 0.32 * p);
        const mToA = godHand(mX, mYFoot, hM, S.mFace, aX, aYFoot);
        const aToM = godHand(aX, aYFoot, hA, S.aFace, mX, mYFoot);
        const mToMd = godHand(mX, mYFoot, hM, S.mFace, mdX, mdYFoot);
        const aToMd = godHand(aX, aYFoot, hA, S.aFace, mdX, mdYFoot);
        drawTintBeam(ctx, mToA.x, mToA.y, aToM.x, aToM.y, "220,210,180", p);
        drawTintBeam(ctx, mToMd.x, mToMd.y, mdX, mdYFoot, "200,32,40", p * S.mdAmt);
        drawTintBeam(ctx, aToMd.x, aToMd.y, mdX, mdYFoot, "120,214,96", p * S.mdAmt);
      }
    }

    if (S.fifth > 0.12 && S.fifth < 0.72 && S.cAmt > 0.1) {
      const beam = Math.sin(clamp((S.fifth - 0.12) / 0.5, 0, 1) * 3.14);
      const nestX = sx(S.nestU), nestY = GenMain.surfY(nestX) + 4;
      drawTintBeam(ctx, cG.gx, cG.gy, nestX, nestY, "170,60,40", beam * S.cAmt * 0.85);
    }

    if (S.fall > 0.10 && S.fall < 0.86 && S.oAmt > 0.2) {
      const five = [
        { gx: mdG.gx, gy: mdG.gy, bx: mdX, by: mdYFoot, amt: S.mdAmt, rgb: "200,32,40", strike: S.fallStrikes[0] },
        { gx: cG.gx, gy: cG.gy, bx: cX, by: cYFoot, amt: S.cAmt, rgb: "170,60,40", strike: S.fallStrikes[1] },
        { gx: aelG.gx, gy: aelG.gy, bx: aelX, by: aelYFoot, amt: S.aelAmt, rgb: "30,160,100", strike: S.fallStrikes[2] },
        { gx: vG.gx, gy: vG.gy, bx: vX, by: vYFoot, amt: S.vAmt, rgb: "140,70,210", strike: S.fallStrikes[3] },
        { gx: hX, gy: hYFoot, bx: hX, by: hYFoot, amt: S.hAmt, rgb: "220,30,36", strike: S.fallStrikes[4] },
      ];
      for (const f of five) {
        if (f.amt < 0.15) continue;
        drawTintBeam(ctx, f.gx, f.gy, oEyeX, oEyeY, f.rgb, f.strike * f.amt * S.oAmt);
        if (G.clashCool <= 0 && Math.hypot(f.bx - oEyeX, f.by - oEyeY) < 44) {
          G.flash = Math.max(G.flash, 0.4);
          G.shake = Math.max(G.shake, 0.6);
          G.zoomKick = Math.max(G.zoomKick, 0.03);
          G.clashCool = 0.16;
          G.rings.push({ x: (f.bx + oEyeX) * 0.5, y: (f.by + oEyeY) * 0.5, r: 10, a: 1 });
        }
      }
    }

    if (S.et > 0.12 && S.oAmt > 0.2 && S.mAmt > 0.2) {
      const mHand = godHand(mX, mYFoot, hM, S.mFace, oEyeX, oEyeY);
      drawBeam(ctx, mHand.x, mHand.y, oEyeX, oEyeY, S.etStrike * Math.min(S.oAmt, S.mAmt));
      const dx = mX - oEyeX, dy = S.my - oEyeY;
      if (Math.hypot(dx, dy) < 40 && G.clashCool <= 0) {
        G.flash = 0.4;
        G.shake = Math.max(G.shake, 0.45);
        G.zoomKick = Math.max(G.zoomKick, 0.03);
        G.clashCool = 0.2;
        G.rings.push({ x: (mX + oEyeX) * 0.5, y: (S.my + oEyeY) * 0.5, r: 8, a: 0.85 });
      }
    }

    /* Obrokxus's lash: a dark bolt from his eye to Mordrial's chest,
       right before he sinks back into the ground */
    if (S.fall < 0.5) { lashLatch = false; darkLatch = false; }
    if (S.lashM > 0) {
      const mdChestX = mdX, mdChestY = mdYFoot - 0.6 * hMd;
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.lineCap = "round";
      ctx.globalAlpha = S.lashM;
      ctx.strokeStyle = "rgba(16,3,5,0.95)";
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(oEyeX, oEyeY); ctx.lineTo(mdChestX, mdChestY); ctx.stroke();
      ctx.strokeStyle = "rgba(150,18,24,0.9)";
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(oEyeX, oEyeY); ctx.lineTo(mdChestX, mdChestY); ctx.stroke();
      ctx.restore();
      if (S.lashM > 0.5 && !lashLatch) {
        lashLatch = true;
        G.flash = 0.7;
        G.shake = Math.max(G.shake, 0.9);
        G.zoomKick = Math.max(G.zoomKick, 0.04);
        G.rings.push({ x: mdChestX, y: mdChestY, r: 10, a: 1 });
      }
    }
    if (S.mdDark > 0.5 && !darkLatch) {
      darkLatch = true;
      G.rings.push({ x: mdX, y: mdYFoot, r: 10, a: 1 });
    }

    /* clash: flee's contact test lives apart from its beam draw, as
       it always has; fall's and eternity's are folded into theirs above */
    if (S.fightW > 0.3 && S.oAmt > 0.2) {
      const hits = [[mX, S.my, S.mAmt], [aX, S.ay, S.aAmt]];
      for (const hit of hits) {
        if (hit[2] < 0.2 || G.clashCool > 0) continue;
        if (Math.hypot(hit[0] - oEyeX, hit[1] - oEyeY) < 42) {
          G.flash = Math.max(G.flash, 0.5);
          G.shake = Math.max(G.shake, 0.6);
          G.zoomKick = Math.max(G.zoomKick, 0.03);
          G.clashCool = 0.24;
          G.rings.push({ x: (hit[0] + oEyeX) * 0.5, y: (hit[1] + oEyeY) * 0.5, r: 10, a: 1 });
        }
      }
    }

    if (S.fleeLin > 0.08 && S.fleeLin < 0.96) G.shake = Math.max(G.shake, 0.10);
    if (S.war > 0.05 && S.war < 0.95) G.shake = Math.max(G.shake, 0.14);
    if (S.fifth > 0.2 && S.fifth < 0.8) G.shake = Math.max(G.shake, 0.22);
    if (S.fallBeat) G.shake = Math.max(G.shake, 0.20 + S.fall * 0.22);
    if (S.etBeat) G.shake = Math.max(G.shake, 0.20 + S.etLin * 0.22);
    if (S.dieM > 0.05 && S.dieM < 0.7) G.shake = Math.max(G.shake, 0.55);

    const nameUp = S.et > 0 ? 0 : 1;
    drawName(ctx, mdX, mdYFoot + 12, S.mdAmt * (1 - S.dieM) * nameUp, "MORDRIAL", 0);
    drawName(ctx, cX, cYFoot + 12, S.cAmt * nameUp, "CADMUS", 0);
    drawName(ctx, aelX, aelYFoot + 12, S.aelAmt * nameUp, "AELIUS", 0);
    drawName(ctx, vX, vYFoot + 12, S.vAmt * nameUp, "VELINDRA", 0);
    drawName(ctx, hX, hYFoot + 12, S.hAmt * nameUp, "THE HOUND", 0);
    drawName(ctx, oxS, oyFootO + 12, S.oAmt, "OBROKXUS", 0);
    drawName(ctx, mX, mYFoot + 12, S.mAmt, "ORMIUS", 0);
    drawName(ctx, aX, aYFoot + 12, S.aAmt, "AVA", 0);

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
