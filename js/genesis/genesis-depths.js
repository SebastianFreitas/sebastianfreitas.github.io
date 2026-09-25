/* genesis-depths.js — inside Rex: the rock, the ribs, the pocket where
   Obrokxus lies in Rex's grip, the five gods circling and striking, and
   the brothers that climb out of the walls to bind them. Drawn under a
   -diveY translate by the conductor. */
window.GenDepths = (function () {
  const G = window.Gen;
  const { clamp, mix, smooth, hash1, mulberry } = Util;
  const { litShade } = Paint;
  const { rexLandHeight, rexSurfY, gridXs } = GenPaint;
  const { fleshPath } = GenFlesh;
  const { drawTintBeam, drawRings, drawName } = GenVoid;
  const { drawRexGrip } = GenRex;
  const { DEEP_U, DEEP_Y, BURY_U, REX_BANDS, SIEGE_GODS, ORB_STYLE, idxOf, linear, sx } = G;

  const CROWN = { ormius: "bars", ava: "rings", kaeron: "orbit", kaelum: "petals", orochronus: "clock" };
  const BROTHER_KINDS = ["crawler", "winged", "blinker", "roller", "mass", "slider", "strider", "floater"];

  // Obrokxus's brothers: 70 small old ones, built once (lazily, since
  // GenOld must be looked up at call time — see the edge-case note below)
  let DEPTH_BROTHERS = null;
  function buildBrothers(O) {
    const r = mulberry(9099);
    const list = [];
    for (let i = 0; i < 70; i++) {
      const o = O.makeOne(BROTHER_KINDS[i % 8], 9100 + i, { lit: "rgb(74,14,20)", shade: "rgb(30,5,8)" });
      o.hf *= 0.32; // small in the depths
      o.ang = r() * 6.283;
      o.rad = r();
      o.sp = (r() < 0.5 ? -1 : 1) * (0.25 + r() * 0.9);
      o.ph = r() * 6.28;
      o.birth = Math.pow(r(), 0.8);
      o.size = 5 + r() * 12;
      list.push(o);
    }
    return list;
  }

  /* the deepest pocket inside Rex, and the war fought there. Drawn in
     world space — the caller has already translated by -diveY, so
     what is here lines up with the buried scene above it. */
  function drawDepths(ctx, dive, diveY) {
    const F = window.GenFig;
    if (!F) return;
    const O = window.GenOld;
    if (!O) return;

    const iD = idxOf("deep"), iP = idxOf("slip");
    if ((G.beat !== iD && G.beat !== iP) || dive < 0.001) return;
    const inSlip = G.beat === iP;
    const deepLin = inSlip ? 1 : linear("deep");
    const slipLin = inSlip ? linear("slip") : 0;
    const span = Math.min(G.W, G.H), dx = sx(DEEP_U), dy = G.H * DEEP_Y;

    if (!DEPTH_BROTHERS) DEPTH_BROTHERS = buildBrothers(O);

    ctx.save();

    /* 1. flat stepped rock, following the same surface as the land above.
       This clip stays open through the brothers (step 8) so nothing inside
       the mountain can paint above its crest; it is restored before the
       gods, Obrokxus and the labels, which must never be clipped. */
    ctx.globalCompositeOperation = "source-over";
    const rock = new Path2D();
    let firstRockPx = true;
    for (const [px, wu] of gridXs(-40, G.W + 40, 8)) {
      const y = G.H * 1.16 - rexLandHeight(wu, REX_BANDS[2]) * G.H + G.H * 0.03;
      firstRockPx ? rock.moveTo(px, y) : rock.lineTo(px, y);
      firstRockPx = false;
    }
    rock.lineTo(G.W + 40, G.H * 2.6);
    rock.lineTo(-40, G.H * 2.6);
    rock.closePath();
    ctx.save();
    ctx.clip(rock);
    ctx.fillStyle = "#1e1f21"; ctx.fillRect(-40, -G.H, G.W + 80, G.H * 1.15 - (-G.H));
    ctx.fillStyle = "#231a17"; ctx.fillRect(-40, G.H * 1.15, G.W + 80, G.H * 0.40);
    ctx.fillStyle = "#2a1810"; ctx.fillRect(-40, G.H * 1.55, G.W + 80, G.H * 0.45);
    ctx.fillStyle = "#34170c"; ctx.fillRect(-40, G.H * 2.0, G.W + 80, G.H * 0.6);

    /* 2. the pocket, built once this frame into a Path2D so steps 3 and 4
       can clip to it too. fleshPath only ever calls beginPath/moveTo/
       lineTo/closePath, so a Path2D with a stub beginPath stands in for
       the ctx it expects, and records the outline straight into it. */
    const pocket = new Path2D();
    pocket.beginPath = () => {};
    fleshPath(pocket, dx, dy, G.W * 0.36, G.H * 0.30, 0.7, 3);
    ctx.fillStyle = "rgba(92,32,14,0.9)";
    ctx.fill(pocket);
    ctx.save();
    ctx.clip(pocket);
    ctx.translate(G.W * 0.045, G.H * 0.05);
    ctx.fillStyle = "rgba(150,60,24,0.88)";
    ctx.fill(pocket);
    ctx.restore();

    /* 3. molten veins, clipped so they stay inside the cavity */
    ctx.save();
    ctx.clip(pocket);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 1.6;
    for (let k = 0; k < 12; k++) {
      const va = k * 0.5236 + 0.3;
      const x0 = dx + Math.cos(va) * G.W * 0.30, y0 = dy + Math.sin(va) * G.H * 0.26;
      const x1 = dx + Math.cos(va) * G.W * 0.75, y1 = dy + Math.sin(va) * G.H * 0.62;
      const mx = (x0 + x1) * 0.5 + Math.sin(G.t * 0.5 + k) * span * 0.04;
      const my = (y0 + y1) * 0.5 + Math.sin(G.t * 0.5 + k) * span * 0.04;
      ctx.strokeStyle = `rgba(245,138,52,${0.16 + 0.08 * Math.sin(G.t * 1.1 + k)})`;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(mx, my, x1, y1);
      ctx.stroke();
    }
    ctx.restore();

    /* 4. ribs, stalactites and stalagmites, also clipped to the pocket */
    ctx.save();
    ctx.clip(pocket);
    for (let k = 0; k < 5; k++) {
      const rcx = dx + (k - 2) * 0.17 * G.W, rcy = dy - 0.05 * G.H;
      const Rk = (0.26 + 0.03 * (k % 2)) * G.H, Ri = Rk - 0.032 * G.H;
      litShade(ctx, () => {
        ctx.beginPath();
        ctx.arc(rcx, rcy, Rk, 0, Math.PI, false);
        ctx.arc(rcx, rcy, Ri, Math.PI, 0, true);
        ctx.closePath();
      }, rcx - 0.3 * Rk, "#3a2418", "#221510");
    }
    const ceilY = dy - 0.30 * G.H, floorY = dy + 0.30 * G.H;
    for (let k = 0; k < 6; k++) {
      const tx = dx + (k - 2.5) * 0.13 * G.W, half = 0.0175 * G.W;
      const drop = mix(0.06, 0.13, hash1(k * 7)) * G.H;
      litShade(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(tx - half, ceilY);
        ctx.lineTo(tx + half, ceilY);
        ctx.lineTo(tx, ceilY + drop);
        ctx.closePath();
      }, tx - 0.3 * half, "#3a2418", "#221510");
    }
    for (let k = 0; k < 4; k++) {
      const sgx = dx + (k - 1.5) * 0.2 * G.W + 0.04 * G.W, half = 0.02 * G.W;
      const stalagH = mix(0.05, 0.10, hash1(k * 7 + 3)) * G.H;
      litShade(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(sgx - half, floorY);
        ctx.lineTo(sgx + half, floorY);
        ctx.lineTo(sgx, floorY - stalagH);
        ctx.closePath();
      }, sgx - 0.3 * half, "#3a2418", "#221510");
    }
    ctx.restore();

    /* 5. chaos crawling on the walls, along the cavity rim */
    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 6; k++) {
      const a0 = k * 1.047 + G.t * 0.12;
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const ang = a0 + i * 0.06;
        const rf = 0.97 + 0.03 * Math.sin(G.t * 5 + i + k);
        const px = dx + Math.cos(ang) * G.W * 0.36 * rf;
        const py = dy + Math.sin(ang) * G.H * 0.30 * rf;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.strokeStyle = `rgba(200,36,40,${0.35 + 0.25 * Math.sin(G.t * 7 + k)})`;
      ctx.stroke();
    }

    /* 6. Obrokxus */
    let ox = dx + Math.sin(G.t * 0.9) * span * 0.03, oy = dy + Math.cos(G.t * 1.1) * span * 0.02;
    const rise = inSlip ? smooth(clamp((slipLin - 0.40) / 0.50, 0, 1)) : 0;
    ox = mix(ox, sx(BURY_U), rise); oy = mix(oy, rexSurfY(BURY_U) + G.H * 0.03, rise);

    /* 7. phases */
    const grip = inSlip ? mix(0.35, 0, smooth(clamp(slipLin / 0.40, 0, 1))) : mix(1, 0.35, deepLin);
    const bind = inSlip ? smooth(clamp(slipLin / 0.40, 0, 1)) : 0;
    const grow = clamp((deepLin - 0.22) / 0.60, 0, 1);
    const ex = sx(BURY_U), ey = rexSurfY(BURY_U) + G.H * 0.08;

    /* the gods' positions, needed both by the brothers (their bound orbit
       target) and by the drawing loop in step 9 */
    const gods = [];
    for (let i = 0; i < SIEGE_GODS.length; i++) {
      const g = SIEGE_GODS[i];
      const desc = smooth(clamp((deepLin - i * 0.04) / 0.30, 0, 1));
      const ga = g.ang + G.t * 0.22 + Math.sin(G.t * 0.4 + g.ph) * 0.3;
      const R = mix(span * (0.30 + 0.04 * Math.sin(G.t * 0.5 + g.ph)), span * 0.44, bind);
      const ringX = dx + Math.cos(ga) * R * 1.3, ringY = dy + Math.sin(ga) * R * 0.85;
      // Kaelum does not fight: she only orbits
      const strike = g.kind === "kaelum" ? 0
        : Math.pow(Math.max(0, Math.sin(G.t * 1.7 + g.ph)), 6) * (1 - bind) * desc;
      const gx = mix(ex, mix(ringX, ox, strike * 0.88), desc), gy = mix(ey, mix(ringY, oy, strike * 0.88), desc);
      gods.push({ g, gx, gy, amt: clamp(desc * 3, 0, 1), strike });
    }

    /* 8. the brothers: crawl in from the pocket wall onto the orbit around
       Obrokxus, then (in slip) onto a tight orbit around one of the gods */
    for (let i = 0; i < DEPTH_BROTHERS.length; i++) {
      const o = DEPTH_BROTHERS[i];
      if (o.birth > grow) continue;
      const appear = clamp((grow - o.birth) / 0.08, 0, 1);
      const edgeX = dx + Math.cos(o.ang) * G.W * 0.36, edgeY = dy + Math.sin(o.ang) * G.H * 0.30;
      const ba = o.ang + G.t * o.sp * 0.35, fr = span * (0.10 + o.rad * 0.27);
      const orbX = ox + Math.cos(ba) * fr * 1.3 + Math.sin(G.t * 3.1 + o.ph) * 4;
      const orbY = oy + Math.sin(ba) * fr * 0.85 + Math.cos(G.t * 2.7 + o.ph) * 4;
      const freeX = mix(edgeX, orbX, smooth(appear)), freeY = mix(edgeY, orbY, smooth(appear));
      const tg = gods[i % gods.length];
      const boundX = tg.gx + Math.cos(o.ph + G.t * 2.2 * o.sp) * span * 0.05,
            boundY = tg.gy + Math.sin(o.ph + G.t * 2.2 * o.sp) * span * 0.05;
      const bx = mix(freeX, boundX, bind), by = mix(freeY, boundY, bind);
      const alpha = clamp(appear * 2, 0, 1) * (0.6 + 0.4 * Math.sin(G.t * 5 + o.ph));
      if (alpha < 0.03) continue;
      ctx.globalAlpha = alpha;
      O.drawKind(ctx, o.kind, o, bx, by, o.hf * G.H, { phase: G.t * 4 * o.gait + o.ph, look: ox, sy: 1, kneel: 0 });
    }

    ctx.restore(); // end the rock clip opened in step 1 — the gods, Obrokxus
                    // and the labels below must never be clipped

    /* 9. the five gods */
    for (const e of gods) {
      if (e.amt <= 0.02) continue;
      const g = e.g, x = e.gx, y = e.gy, a = e.amt, strike = e.strike;
      const h = G.GOD_H * G.H;
      const face = ox > x ? 1 : -1;
      const yFoot = y + 0.45 * h;
      // where this god's beam leaves it: hand, snout or jaws at full reach
      const hand = F.godHand(g.kind, x, yFoot, h, { face }, ox, oy);
      if (strike > 0.05) drawTintBeam(ctx, hand.x, hand.y, ox, oy, g.rgb, strike);
      F.drawGod(ctx, x, yFoot, h, ORB_STYLE[g.kind], {
        a, face, kind: g.kind, crown: CROWN[g.kind], wings: g.kind === "ava",
        reach: { x: ox, y: oy, amt: strike }, ph: g.ph,
        // her colour is her mood: settling in, then the siege angers her, then her brothers turn
        mood: G.beat >= G.idxOf("slip") ? "sad" : G.linear("deep") > 0.5 ? "angry" : "ok",
      });
      if (strike > 0.8 && a > 0.3 && G.clashCool <= 0 && Math.hypot(x - ox, y - oy) < span * 0.12) {
        G.flash = Math.max(G.flash, 0.5);
        G.shake = Math.max(G.shake, 0.5);
        G.clashCool = 0.14;
        G.zoomKick = Math.max(G.zoomKick, 0.02);
        G.rings.push({ x: (x + ox) * 0.5, y: (y + oy) * 0.5, r: 10, a: 1 });
      }
      drawName(ctx, x, yFoot + 12, a, g.name, 0);
    }

    /* 10. Obrokxus, held in Rex's grip, facing whichever god is nearest */
    const hT = 0.34 * G.H;
    let near = gods[0], nearD = Infinity;
    for (const e of gods) {
      const d = Math.hypot(e.gx - ox, e.gy - oy);
      if (d < nearD) { nearD = d; near = e; }
    }
    drawRexGrip(ctx, ox, oy, grip, span * 0.13);
    F.drawTitan(ctx, ox, oy + 0.45 * hT, hT, "obrokxus", {
      a: 1,
      face: near.gx > ox ? 1 : -1,
      pose: rise > 0.05 ? "climb" : "stand",
      look: { x: near.gx, y: near.gy },
      ph: 0.7,
    });
    drawName(ctx, ox, oy + 0.45 * hT + 12, 1, "OBROKXUS", 0);

    /* 11. rings, year counter, shake floor */
    drawRings(ctx);
    const years = inSlip ? 9000 + slipLin * 940 : deepLin * 9000;
    const n = Math.floor(years / 10) * 10;
    ctx.font = '500 11px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = `rgba(245,190,140,${0.7 * dive})`;
    ctx.fillText("YEAR " + n.toLocaleString("en-US"), G.W * 0.5, G.H * 0.08 + diveY);

    G.shake = Math.max(G.shake, 0.16 * dive);
    if (rise > 0.02 && rise < 0.98) G.shake = Math.max(G.shake, 0.35);

    ctx.restore();
  }

  return { drawDepths };
})();
