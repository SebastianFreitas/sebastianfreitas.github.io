/* genesis-saga.js — the mainland and the children's war: one state
   object per frame (sagaAt) and everything drawn from it. */
window.GenSaga = (function () {
  const G = window.Gen;
  const { smooth, clamp, mix, ridge } = Util;
  const { DECK, MAIN_U, MAIN_HALF, EAST_U, WEST_U, CITY_U, NEST_U, BURY_U, MAIN_BANDS,
          troops, cityFar, cityMid, cityNear, spikes, idxOf, since, linear, sx } = G;
  const { fillRidge, gridXs, mixHex, flatGlow, mainDome, mainHeight, mainBandHeight,
          mainSurfY, rexSurfY, standY } = GenPaint;
  const { pushTrail, drawTrail, drawOrb, drawRings, drawBeam, drawTintBeam, yWob, drawName } = GenVoid;
  const { chaseAt, chaseFightAt, duelAt, ringFightAt } = GenRex;

  function sagaAt() {
    if (G.beat < idxOf("flee")) return null;
    const flee = since("flee");
    const fleeLin = linear("flee");
    const war = since("war");
    const stall = since("stalemate");
    const lock = since("firstlock");
    const four = since("four");
    const fifth = since("fifth");
    const fall = linear("fall");
    const ret = since("return");
    const et = since("eternity");
    const etLin = linear("eternity");
    const span = Math.min(G.W, G.H);
    const godsOut = clamp((lock - 0.14) / 0.62, 0, 1);
    const fallIn = clamp(fall / 0.22, 0, 1);
    const up = smooth(clamp(fall / 0.22, 0, 1));
    const down = smooth(clamp((fall - 0.80) / 0.18, 0, 1));
    const air = up * (1 - down);
    const fallStrikes = [0, 0, 0, 0, 0];
    /* the fight against Obrokxus happens on vorgath's own ground —
       deep in the red zone, not walked back to the middle. Nest and
       duel share that ground; the duel spot sits a little short of
       the nest so the pit doesn't read as the battlefield itself. */
    const DUEL_U = MAIN_U + 0.30;

    /* ---- the land, before anything stands on it ----------------
       scar is what the war did to the shape of the ground: it only
       ever grows, and it stays. corrupt is the red laid over it,
       and that lifts once the fighting moves west. */
    let mainRise = 0;
    if (fleeLin > 0.58) mainRise = clamp((fleeLin - 0.58) / 0.42, 0, 1);
    if (war > 0) mainRise = 1;

    let scar = 0;
    if (war > 0) scar = mix(0, 0.30, clamp(war, 0, 1));
    if (stall > 0) scar = mix(0.30, 0.44, stall);
    if (lock > 0) scar = mix(0.44, 0.64, lock);
    if (four > 0) scar = mix(0.64, 0.86, four);
    if (fifth > 0) scar = mix(0.86, 0.95, fifth);
    if (fall > 0) scar = mix(0.95, 1, fall);
    if (ret > 0 || et > 0) scar = 1;

    let corrupt = scar;
    if (ret > 0) corrupt = mix(1, 0.07, smooth(clamp(ret / 0.72, 0, 1)));
    if (et > 0) corrupt = 0.07;

    /* the city fills west to east and finishes when the war does */
    let civAmt = 0;
    if (lock > 0.12) civAmt = mix(0, 0.32, clamp((lock - 0.12) / 0.88, 0, 1));
    if (four > 0) civAmt = mix(0.32, 0.44, four);
    if (fifth > 0) civAmt = mix(0.44, 0.50, fifth);
    if (fall > 0) civAmt = mix(0.50, 0.55, fall);
    if (ret > 0) civAmt = mix(0.55, 1, smooth(clamp(ret / 0.82, 0, 1)));
    if (et > 0) civAmt = 1;

    const gy = (lane, wu) => standY(lane, wu, mainRise, scar);
    const skyY = (u, y) => Math.min(y, mainSurfY(u, mainRise, scar) - 14);

    /* ---- the chase, and the flank that ends it -----------------
       Obrokxus is in front the whole way west and the two lights are
       behind him, because their positions ARE his position plus a
       gap. When the land comes up under them they do not walk past
       him on the ground: they cut up and over him and come down on
       the far side — the side their own city and their own armies
       (seraphin, malgrur) are on, with his (vorgath) left on his. */
    const C = chaseAt(fleeLin);
    const settle = smooth(clamp(fleeLin / 0.10, 0, 1));
    const F = chaseFightAt(fleeLin);
    let ou = C.ou, oy = mix(G.H * 0.36, yWob(0.2, 0.026), settle), oAmt = 0;
    if (et > 0) {
      const D = duelAt(etLin);
      ou = D.ou;
      oy = D.oy;
      oAmt = mix(0, 0.84, smooth(clamp(etLin / 0.18, 0, 1)));
    } else if (ret > 0) {
      oAmt = 0;
    } else if (fall > 0) {
      ou = mix(EAST_U, DUEL_U, fallIn) + Math.sin(fall * 14) * 0.04 * up;
      oy = mix(yWob(0.2, 0.026), G.H * 0.30 + Math.sin(fall * 11 + 1) * span * 0.05, up);
      oAmt = mix(1, 0, clamp((fall - 0.78) / 0.22, 0, 1));
    } else {
      oAmt = mix(0.88, 1, settle);
      if (war <= 0) {
        ou = C.ou + F.ouOff * F.w;
        oy = mix(oy, F.oyAbs, F.w);
      }
    }
    if (et <= 0 && ret <= 0 && fall <= 0 && war <= 0) {
      const outO = smooth(clamp(fleeLin / 0.07, 0, 1));
      ou = mix(BURY_U, ou, outO);
      oy = mix(rexSurfY(BURY_U) + G.H * 0.03, oy, outO);
    }

    let mu = C.mu;
    let my = yWob(1.1, 0.02) - G.H * 0.03, mAmt = 0;
    if (et > 0) {
      /* cross-faded out of the pose the return beat left him in, so
         the duel opens from where he already was instead of cutting */
      const D = duelAt(etLin);
      const hand = smooth(clamp(etLin / 0.10, 0, 1));
      mu = mix(MAIN_U - 0.58, D.mu, hand);
      my = mix(yWob(1.4, 0.02), D.my, hand);
      mAmt = mix(0.48, 0.92, smooth(clamp(etLin / 0.30, 0, 1)));
    } else if (ret > 0) {
      mAmt = mix(0, 0.48, clamp((ret - 0.35) / 0.65, 0, 1));
      mu = mix(MAIN_U + 0.08, MAIN_U - 0.58, ret);
      my = yWob(1.4, 0.02);
    } else if (fleeLin > 0.02) {
      mAmt = clamp((fleeLin - 0.02) / 0.10, 0, 1) * (1 - godsOut);
      if (war <= 0) {
        mu = mix(C.mu, ou + F.mGap, F.w);
        my = mix(my, oy + F.myOff, F.w);
      }
      if (war > 0) {
        /* the flank: over the top, landing west of him */
        const k = smooth(clamp((war - 0.05) / 0.70, 0, 1));
        mu = mix(EAST_U + 0.17, WEST_U - 0.14, k);
        my -= Math.sin(k * Math.PI) * G.H * 0.17;
      }
      if (lock > 0) {
        mu = mix(WEST_U - 0.14, MAIN_U + 0.16, lock);
        my = mix(yWob(1.1, 0.018) - G.H * 0.03, yWob(0.8, 0.012), lock);
      }
    }
    if (et <= 0 && ret <= 0 && war <= 0) {
      const outM = smooth(clamp((fleeLin - 0.02) / 0.12, 0, 1));
      mu = mix(BURY_U, mu, outM);
      my = mix(rexSurfY(BURY_U) + G.H * 0.03, my, outM);
    }

    let au = C.au;
    let ay = yWob(2.6, 0.018) + G.H * 0.04, aAmt = 0;
    if (et > 0) {
      aAmt = 0;
    } else if (ret > 0) {
      aAmt = 0;
    } else if (fleeLin > 0.06) {
      aAmt = clamp((fleeLin - 0.06) / 0.10, 0, 1) * (1 - godsOut);
      if (war <= 0) {
        au = mix(C.au, ou + F.aGap, F.w);
        ay = mix(ay, oy + F.ayOff, F.w);
      }
      if (war > 0) {
        const k = smooth(clamp((war - 0.12) / 0.70, 0, 1));
        au = mix(EAST_U + 0.30, WEST_U - 0.02, k);
        ay -= Math.sin(k * Math.PI) * G.H * 0.23;
      }
      if (lock > 0) {
        au = mix(WEST_U - 0.02, MAIN_U + 0.20, lock);
        ay = mix(yWob(2.6, 0.016) + G.H * 0.035, yWob(0.9, 0.012), lock);
      }
    }
    if (et <= 0 && ret <= 0 && war <= 0) {
      const outA = smooth(clamp((fleeLin - 0.06) / 0.12, 0, 1));
      au = mix(BURY_U, au, outA);
      ay = mix(rexSurfY(BURY_U) + G.H * 0.03, ay, outA);
    }

    const born = clamp((lock - 0.42) / 0.40, 0, 1);
    const dieM = smooth(clamp((fall - 0.76) / 0.20, 0, 1));
    let mdU = mix(MAIN_U - 0.02, MAIN_U - 0.14, four);
    let mdY = gy(0.10, mdU);
    let mdAmt = born * (1 - dieM);
    if (fifth > 0) {
      /* all four cross to the nest together for the Hound's birth,
         not just Cadmus; blend the endpoint heights rather than
         sampling the live terrain across that whole crossing, or
         they bob over every ripple of ground on the way. */
      mdU = mix(MAIN_U - 0.14, NEST_U - 0.10, fifth);
      mdY = mix(gy(0.08, MAIN_U - 0.14), gy(0.08, NEST_U - 0.10), fifth);
    }
    if (fall > 0) {
      const R0 = ringFightAt(0, fall, ou, oy, 1 - dieM);
      fallStrikes[0] = R0.strike * up * (1 - dieM);
      const gU = NEST_U - 0.10;
      mdU = mix(gU, R0.u, up);
      const skyMd = skyY(mdU, mix(gy(0.08, gU), R0.y, up));
      mdY = mix(skyMd, mainSurfY(mdU, mainRise, scar) + 26, dieM);
    }
    if (ret > 0) mdAmt = 0;

    const slot = (start) => clamp((four - start) / 0.22, 0, 1);
    let cU = mix(MAIN_U - 0.24, NEST_U + 0.16, fifth);
    let cAmt = slot(0.12);
    let aelU = mix(MAIN_U - 0.32, NEST_U - 0.20, fifth);
    let aelAmt = slot(0.36);
    let vU = mix(MAIN_U - 0.17, NEST_U - 0.34, fifth);
    let vAmt = slot(0.58);
    /* same terrain-bob fix as Mordrial above, for all three */
    let cY = mix(gy(0.14, MAIN_U - 0.24), gy(0.06, NEST_U + 0.16), fifth);
    let aelY = mix(gy(0.02, MAIN_U - 0.32), gy(0.00, NEST_U - 0.20), fifth);
    let vY = mix(gy(0.20, MAIN_U - 0.17), gy(0.22, NEST_U - 0.34), fifth);
    /* through the fight itself they hold their ground at the nest
       (cU/aelU/vU keep the "fifth" end value, since `fifth` is
       already at 1 by the time `fall` starts) instead of drifting
       back toward the middle. */
    if (fall > 0 && ret <= 0) {
      const Rc = ringFightAt(1, fall, ou, oy, 1);
      const Ra = ringFightAt(2, fall, ou, oy, 1);
      const Rv = ringFightAt(3, fall, ou, oy, 1);
      fallStrikes[1] = Rc.strike * air;
      fallStrikes[2] = Ra.strike * air;
      fallStrikes[3] = Rv.strike * air;
      const cY0 = cY, aelY0 = aelY, vY0 = vY;
      cY = mix(cY0, skyY(Rc.u, Rc.y), air);
      cU = mix(cU, Rc.u, air);
      aelY = mix(aelY0, skyY(Ra.u, Ra.y), air);
      aelU = mix(aelU, Ra.u, air);
      vY = mix(vY0, skyY(Rv.u, Rv.y), air);
      vU = mix(vU, Rv.u, air);
    }
    if (ret > 0) {
      /* victory won, they walk west into the city they are about
         to disappear into */
      const home = smooth(clamp(ret / 0.85, 0, 1));
      const fadeHome = mix(1, 0.10, clamp((ret - 0.45) / 0.55, 0, 1));
      const cU0 = NEST_U + 0.16, aelU0 = NEST_U - 0.20, vU0 = NEST_U - 0.34;
      cU = mix(cU0, CITY_U + 0.13, home);
      aelU = mix(aelU0, CITY_U + 0.34, home);
      vU = mix(vU0, CITY_U - 0.08, home);
      cY = mix(gy(0.06, cU0), gy(0.10, CITY_U + 0.13), home);
      aelY = mix(gy(0.00, aelU0), gy(0.02, CITY_U + 0.34), home);
      vY = mix(gy(0.22, vU0), gy(0.20, CITY_U - 0.08), home);
      cAmt *= fadeHome;
      aelAmt *= fadeHome;
      vAmt *= fadeHome;
    }

    const nestU = NEST_U;
    const nestAmt = fifth > 0
      ? mix(0.25, 1, clamp(fifth * 2.4, 0, 1)) * (1 - clamp((fifth - 0.58) / 0.38, 0, 1))
      : 0;
    const houndBorn = clamp((fifth - 0.50) / 0.34, 0, 1);
    /* the Hound stays at the fight too, instead of already walking
       west while Mordrial and Obrokxus are still at it */
    let hU = mix(nestU, DUEL_U - 0.05, fallIn);
    let hY = mix(gy(-0.04, nestU), gy(-0.06, DUEL_U - 0.05), fallIn);
    let hAmt = houndBorn;
    if (fall > 0 && ret <= 0) {
      const Rh = ringFightAt(4, fall, ou, oy, 1);
      fallStrikes[4] = Rh.strike * air;
      hY = mix(hY, skyY(Rh.u, Rh.y), air);
      hU = mix(hU, Rh.u, air);
    }
    if (ret > 0) {
      const homeH = smooth(clamp(ret / 0.85, 0, 1));
      hU = mix(DUEL_U - 0.05, CITY_U - 0.28, homeH);
      hY = mix(gy(-0.06, DUEL_U - 0.05), gy(-0.06, CITY_U - 0.28), homeH);
      hAmt = mix(1, 0.12, clamp((ret - 0.45) / 0.55, 0, 1));
    }

    let army = 0;
    if (war > 0) army = mix(0, 0.32, clamp(war, 0, 1));
    if (stall > 0) army = mix(0.32, 0.42, stall);
    if (lock > 0) army = mix(0.42, 0.55, lock);
    if (four > 0) army = mix(0.55, 0.82, four);
    if (fifth > 0) army = mix(0.82, 0.92, fifth);
    if (fall > 0) army = mix(0.92, 1, fall);
    if (ret > 0) army = mix(1, 0, clamp(ret / 0.55, 0, 1));
    if (et > 0) army = 0;

    if (et > 0) {
      /* the duel leaves. The land does not: it keeps its city and
         slides out of frame behind the camera. Everyone still on it
         fades over the first second instead of blinking off on the
         beat change. */
      const gone = 1 - smooth(clamp(etLin / 0.12, 0, 1));
      mdAmt *= gone;
      cAmt *= gone;
      aelAmt *= gone;
      vAmt *= gone;
      hAmt *= gone;
      aAmt = 0;
    }

    return {
      ou, oy, oAmt, mu, my, mAmt, au, ay, aAmt,
      mdU, mdY, mdAmt, cU, cY, cAmt, aelU, aelY, aelAmt, vU, vY, vAmt,
      nestU, nestAmt, hU, hY, hAmt, army, civAmt, corrupt, scar, mainRise,
      flee, fleeLin, war, stall, lock, four, fifth, fall, ret, et, etLin, born, dieM, godsOut,
      fightW: war > 0 ? 0 : F.w, strikeM: F.strikeM, strikeA: F.strikeA,
      fallStrikes, etStrike: et > 0 ? duelAt(etLin).strike : 0,
    };
  }

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

  return {
    sagaAt, drawMainland, drawCity, drawSpark, drawArmies, drawNestPit, drawSaga,
    drawLiveWorld,
  };
})();
