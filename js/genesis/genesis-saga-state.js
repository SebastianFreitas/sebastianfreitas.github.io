/* js/genesis/genesis-saga-state.js — sagaAt: every saga-beat quantity for the current frame, consumed by genesis-saga.js */
(function () {
  const G = window.Gen;
  const { smooth, clamp, mix } = Util;
  const { MAIN_U, EAST_U, WEST_U, CITY_U, NEST_U, BURY_U, idxOf, since, linear } = G;
  const { mainSurfY, rexSurfY } = GenPaint;
  const { yWob } = GenVoid;
  const { chaseAt, chaseFightAt, escapeAt, ringFightAt } = GenRex;

  function sagaAt() {
    if (G.beat < idxOf("flee")) return null;
    const flee = since("flee");
    const fleeLin = linear("flee");
    const war = since("war");
    const stall = since("stalemate");
    const lock = since("firstlock");
    const cad = since("cadmus"), ael = since("aelius"), vel = since("velindra");
    const four = since("four");
    const fifth = since("fifth");
    const cadL = linear("cadmus"), aelL = linear("aelius"), velL = linear("velindra"), fifthL = linear("fifth");
    const mid = (cad + ael + vel + four) / 4;
    const fall = linear("fall");
    const ret = since("return");
    const et = since("eternity");
    const etLin = linear("eternity");
    const fallBeat = G.beat === idxOf("fall");
    const etBeat = G.beat === idxOf("eternity");
    const span = Math.min(G.W, G.H);
    const godsOut = clamp((lock - 0.14) / 0.62, 0, 1);
    const fallIn = clamp(fall / 0.22, 0, 1);
    const up = smooth(clamp(fall / 0.22, 0, 1));
    const down = smooth(clamp((fall - 0.80) / 0.18, 0, 1));
    const air = up * (1 - down);
    const lashM = fall > 0.74 && fall < 0.82 ? Math.pow(Math.sin((fall - 0.74) / 0.08 * Math.PI), 2) : 0;
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
    if (mid > 0) scar = mix(0.64, 0.86, mid);
    if (fifth > 0) scar = mix(0.86, 0.95, fifth);
    if (fall > 0) scar = mix(0.95, 1, fall);
    if (ret > 0 || et > 0) scar = 1;

    let corrupt = scar;
    if (ret > 0) corrupt = mix(1, 0.07, smooth(clamp(ret / 0.72, 0, 1)));
    if (et > 0) corrupt = 0.07;

    /* the city fills west to east and finishes when the war does */
    let civAmt = 0;
    if (lock > 0.12) civAmt = mix(0, 0.32, clamp((lock - 0.12) / 0.88, 0, 1));
    if (mid > 0) civAmt = mix(0.32, 0.44, mid);
    if (fifth > 0) civAmt = mix(0.44, 0.50, fifth);
    if (fall > 0) civAmt = mix(0.50, 0.55, fall);
    if (ret > 0) civAmt = mix(0.55, 1, smooth(clamp(ret / 0.82, 0, 1)));
    if (et > 0) civAmt = 1;

    /* the city modernises after the war: towers rise through the return
       and the first moments of eternity */
    const modern = 0.75 * clamp((ret - 0.2) / 0.8, 0, 1) + 0.25 * clamp(etLin / 0.2, 0, 1);

    const gy = (lane, wu) => GenMain.surfYAt(wu == null ? MAIN_U : wu, mainRise, scar) - 12 - lane * 0.075 * G.H;
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
      const E = escapeAt(etLin);
      ou = E.ou;
      oy = E.oy;
      oAmt = E.oAmt;
    } else if (ret > 0) {
      oAmt = 0;
    } else if (fall > 0) {
      ou = mix(EAST_U, DUEL_U, fallIn) + Math.sin(fall * 14) * 0.04 * up;
      oy = mix(yWob(0.2, 0.026), G.H * 0.40 + Math.sin(fall * 11 + 1) * span * 0.05, up);
      oy += 0.14 * G.H * smooth(clamp((fall - 0.78) / 0.22, 0, 1));
      oAmt = mix(1, 0, clamp((fall - 0.86) / 0.14, 0, 1));
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

    /* his forms: the blob climbs out of Rex and becomes the centipede
       horse on the run; on the mainland he lies in the ground (oHide)
       with only his head and spines out; he comes up for the fight and
       leaves it as the floating worm. The painter draws oFrom at
       oAmt*(1-oMorph) and oForm at oAmt*oMorph. */
    let oFrom = "centihorse", oForm = "centihorse", oMorph = 1, oHide = 0, oAir = 0;
    if (et > 0) {
      oFrom = oForm = "worm";
    } else if (fall > 0) {
      oForm = "worm";
      oMorph = smooth(clamp((fall - 0.80) / 0.12, 0, 1));
      oHide = 1 - up;
      oAir = air;
    } else if (war > 0) {
      oHide = smooth(clamp(war / 0.35, 0, 1));
    } else {
      oFrom = "obrokxus";
      oMorph = smooth(clamp((fleeLin - 0.03) / 0.12, 0, 1));
    }

    let mu = C.mu;
    let my = yWob(1.1, 0.02) - G.H * 0.03, mAmt = 0;
    if (et > 0) {
      /* cross-faded out of the pose the return beat left him in, so
         the chase opens from where he already was instead of cutting */
      const E = escapeAt(etLin);
      const hand = smooth(clamp(etLin / 0.10, 0, 1));
      mu = mix(MAIN_U - 0.58, E.mu, hand);
      my = mix(yWob(1.4, 0.02), E.my, hand);
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
    const mdFall = smooth(clamp((fall - 0.78) / 0.12, 0, 1));
    const mdDark = smooth(clamp((fall - 0.86) / 0.10, 0, 1));
    let mdU = mix(MAIN_U - 0.02, MAIN_U - 0.14, four);
    let mdY = gy(0.10, mdU);
    let mdAmt = born * (1 - 0.75 * mdDark);
    const walkK = smooth(clamp(fifthL / 0.34, 0, 1));
    if (fifth > 0) {
      /* all four cross to the nest together for the Hound's birth,
         not just Cadmus; blend the endpoint heights rather than
         sampling the live terrain across that whole crossing, or
         they bob over every ripple of ground on the way. */
      mdU = mix(MAIN_U - 0.14, NEST_U - 0.10, walkK);
      mdY = mix(gy(0.08, MAIN_U - 0.14), gy(0.08, NEST_U - 0.10), walkK);
    }
    if (fall > 0) {
      const R0 = ringFightAt(0, fall, ou, oy, 1 - dieM);
      fallStrikes[0] = R0.strike * up * (1 - dieM);
      const gU = NEST_U - 0.10;
      mdU = mix(gU, R0.u, up);
      const skyMd = skyY(mdU, mix(gy(0.08, gU), R0.y, up));
      mdY = mix(skyMd, gy(0.10, mdU), mdFall);
    }
    if (ret > 0) mdAmt = 0;

    const cWar = smooth(clamp((cadL - 0.56) / 0.20, 0, 1));
    const cMortal = clamp(cadL / 0.12, 0, 1) * (1 - cWar);
    const teach = Math.sin(Math.PI * clamp((cadL - 0.12) / 0.36, 0, 1));
    const pact = smooth(clamp((cadL - 0.36) / 0.14, 0, 1)) * (1 - smooth(clamp((cadL - 0.82) / 0.16, 0, 1)));
    const pactHit = cadL > 0.56 && cadL < 0.70 ? Math.sin(Math.PI * (cadL - 0.56) / 0.14) : 0;
    const aelWar = smooth(clamp((aelL - 0.54) / 0.22, 0, 1));
    const aelChild = clamp((aelL - 0.04) / 0.14, 0, 1) * (1 - aelWar);
    const bless = Math.sin(Math.PI * clamp((aelL - 0.20) / 0.52, 0, 1));
    const vCure = smooth(clamp((velL - 0.58) / 0.20, 0, 1));
    const vTaint = clamp((velL - 0.04) / 0.16, 0, 1) * (1 - vCure);
    const vHelp = Math.sin(Math.PI * clamp((velL - 0.34) / 0.40, 0, 1));
    const vForge = smooth(clamp((velL - 0.78) / 0.16, 0, 1)) * (1 - four);
    let cU = mix(MAIN_U - 0.24, NEST_U + 0.16, walkK);
    let cAmt = cWar;
    let aelU = mix(MAIN_U - 0.32, NEST_U - 0.20, walkK);
    let aelAmt = aelWar;
    let vU = mix(MAIN_U - 0.17, NEST_U - 0.34, walkK);
    let vAmt = vCure;
    /* same terrain-bob fix as Mordrial above, for all three */
    let cY = mix(gy(0.14, MAIN_U - 0.24), gy(0.06, NEST_U + 0.16), walkK);
    let aelY = mix(gy(0.02, MAIN_U - 0.32), gy(0.00, NEST_U - 0.20), walkK);
    let vY = mix(gy(0.20, MAIN_U - 0.17), gy(0.22, NEST_U - 0.34), walkK);
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
    const ritual = smooth(clamp((fifthL - 0.28) / 0.10, 0, 1)) * (1 - smooth(clamp((fifthL - 0.84) / 0.10, 0, 1)));
    const drain = smooth(clamp((fifthL - 0.46) / 0.42, 0, 1));
    const nestAmt = fifthL > 0
      ? mix(0.25, 1, clamp(fifthL * 2.4, 0, 1)) * (1 - clamp((fifthL - 0.70) / 0.25, 0, 1))
      : 0;
    const houndBorn = clamp((fifthL - 0.62) / 0.26, 0, 1);
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

    /* Eldrin, the fifth beat's mortal witness: he walks in and drops
       before the four warlocks draw everything into him */
    const elU = mix(NEST_U - 0.24, NEST_U - 0.03, smooth(clamp((fifthL - 0.08) / 0.34, 0, 1)));
    const elDrop = smooth(clamp((fifthL - 0.44) / 0.12, 0, 1));
    const elAmt = fifthL > 0.06 ? clamp((fifthL - 0.06) / 0.06, 0, 1) * (1 - elDrop) : 0;
    const elY = gy(0.05, elU) + elDrop * 0.07 * G.H;

    /* facing: figures instead of discs need a direction to look. Obrokxus
       faces whoever he's nearest once the war starts; Ormius and Ava turn
       to face him once they've landed the flank. The warlocks and the
       hound face the way they're walking, and turn to face him instead
       once the ring fight starts. */
    const inFour = G.beat === idxOf("four");
    const inFifth = G.beat === idxOf("fifth");
    const inReturn = G.beat === idxOf("return");
    const inFall = G.beat === idxOf("fall");
    const inCad = G.beat === idxOf("cadmus"), inAel = G.beat === idxOf("aelius"), inVel = G.beat === idxOf("velindra");
    const sgn = (d) => d > 0 ? 1 : -1;

    let oFace = -1;
    if (war > 0) {
      const opp = [[mu, mAmt], [au, aAmt], [mdU, mdAmt], [cU, cAmt], [aelU, aelAmt], [vU, vAmt], [hU, hAmt]];
      let nearU = null, nearD = Infinity;
      for (const o of opp) {
        if (o[1] < 0.02) continue;
        const d = Math.abs(o[0] - ou);
        if (d < nearD) { nearD = d; nearU = o[0]; }
      }
      oFace = nearU == null ? 1 : sgn(nearU - ou);
    }
    if (et > 0) oFace = -1;   /* the worm runs west, away from him */
    const mFace = (ret > 0 || et > 0) ? -1 : lock > 0 ? 1 : -1;   /* he walks west in the return and flies west after it */
    const aFace = lock > 0 ? 1 : -1;

    const ringMd = fall > 0;
    const ringOthers = fall > 0 && ret <= 0;
    const mdFace = ringMd ? sgn(ou - mdU) : (inCad || inAel || inVel || inFour) ? -1 : inFifth ? sgn(nestU - mdU) : sgn(ou - mdU);
    const cFace = ringOthers ? sgn(ou - cU) : inCad ? (cadL < 0.40 ? 1 : -1) : inVel ? 1 : inFifth ? sgn(nestU - cU) : inReturn ? -1 : sgn(ou - cU);
    const aelFace = ringOthers ? sgn(ou - aelU) : inAel ? 1 : inFifth ? sgn(nestU - aelU) : inReturn ? -1 : sgn(ou - aelU);
    const vFace = ringOthers ? sgn(ou - vU) : inVel ? -1 : inFifth ? sgn(nestU - vU) : inReturn ? -1 : sgn(ou - vU);
    const hFace = ringOthers ? sgn(ou - hU) : inReturn ? -1 : sgn(ou - hU);

    /* movement flags: true only while a figure's u target is actually
       changing this beat, so the walk/run cycle doesn't play while they
       stand still or while they're airborne in the ring fight */
    const walkingIn = inFifth && fifthL < 0.34;
    const mdWalk = inFour || walkingIn;
    const cWalk = walkingIn || inReturn;
    const aelWalk = walkingIn || inReturn;
    const vWalk = walkingIn || inReturn;
    const hRun = inFall || inReturn;

    let army = 0;
    if (war > 0) army = mix(0, 0.32, clamp(war, 0, 1));
    if (stall > 0) army = mix(0.32, 0.42, stall);
    if (lock > 0) army = mix(0.42, 0.55, lock);
    if (mid > 0) army = mix(0.55, 0.82, mid);
    if (fifth > 0) army = mix(0.82, 0.92, fifth);
    if (fall > 0) army = mix(0.92, 1, fall);
    if (ret > 0) army = mix(1, 0, clamp(ret / 0.55, 0, 1));
    if (et > 0) army = 0;

    if (et > 0) {
      /* the chase leaves. The land does not: it keeps its city and
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
      ou, oy, oAmt, oFrom, oForm, oMorph, oHide, oAir, mu, my, mAmt, au, ay, aAmt,
      mdU, mdY, mdAmt, mdFall, mdDark, cU, cY, cAmt, aelU, aelY, aelAmt, vU, vY, vAmt,
      nestU, nestAmt, hU, hY, hAmt, army, civAmt, modern, corrupt, scar, mainRise,
      flee, fleeLin, war, stall, lock, four, fifth, fall, ret, et, etLin, born, dieM, godsOut,
      cad, ael, vel, mid, cadL, aelL, velL, fifthL, cMortal, teach, pact, pactHit,
      aelChild, bless, vTaint, vHelp, vForge, ritual, drain, hBorn: houndBorn,
      fightW: war > 0 ? 0 : F.w, strikeM: F.strikeM, strikeA: F.strikeA,
      fallStrikes, etStrike: et > 0 ? escapeAt(etLin).strike : 0, etSearch: et > 0 ? escapeAt(etLin).search : 0,
      fallBeat, etBeat, lashM, elU, elDrop, elAmt, elY,
      oFace, mFace, aFace, mdFace, cFace, aelFace, vFace, hFace,
      mdWalk, cWalk, aelWalk, vWalk, hRun,
    };
  }

  window.GenSaga = Object.assign(window.GenSaga || {}, { sagaAt });
})();
