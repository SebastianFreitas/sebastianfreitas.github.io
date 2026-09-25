/* genesis-rex.js — Rex the Surface: the two chases, the land itself,
   the hole, the grip, the birth of the gods and the depths inside him. */
window.GenRex = (function () {
  const G = window.Gen;
  const { smooth, clamp, mix, hash1, mulberry } = Util;
  const { offsetShade } = Paint;
  const { ROOT_U, EAST_U, ET_END_U, ET_START_U, FLEE_START_U, BURY_U, DEEP_U, DEEP_Y,
          FLEE_CAM_RATE, SIEGE_GODS, ORB_STYLE, REX_BANDS, REX_WEST, REX_EAST, brothers,
          idxOf, linear, since, sx, beatDur } = G;
  const { fillRidge, gridXs, mixHex, flatGlow, ease, easeV, rexLandHeight, rexSurfY } = GenPaint;
  const { drawRip, pushTrail, drawTrail, drawOrb, drawRings, drawTintBeam,
          drawName } = GenVoid;
  const { fleshPath } = GenFlesh;

  /* ---- the two chases ---------------------------------------
     Both are written as ONE path, with the followers placed at an
     offset from the runner — never as three separate paths that
     happen to be timed to agree. That is the whole fix: an offset
     cannot overtake the thing it is measured from, so no retiming
     can put a chaser in front again.

     ease/easeV are a position curve and its exact derivative. The
     camera uses the derivative to lead its own smoothing by exactly
     the distance that smoothing lags, which is what keeps the pair
     in the middle of the frame instead of sliding to an edge. */

  /* Obrokxus west (in front), Ormius then Ava behind him, closing. */
  function chaseAt(p) {
    const e = ease(p, 0.72);
    const k = smooth(p);
    const ou = mix(FLEE_START_U, EAST_U, e);
    return {
      ou,
      mu: ou + mix(0.46, 0.17, k),
      au: ou + mix(0.62, 0.30, k),
      cam: ou + mix(0.28, 0.16, k),
    };
  }
  function chaseCamLead(p) {
    return (EAST_U - FLEE_START_U) * easeV(p, 0.72)
         / beatDur("flee") / FLEE_CAM_RATE;
  }

  /* the chase is a fight on the move: the two lights keep catching
     him and striking, and he keeps breaking away west. Sines only, so
     nothing snaps; `w` is 0 at both ends of the beat, so it opens from
     the plain chase and hands the war the plain chase back. */
  function chaseFightAt(p) {
    const span = Math.min(G.W, G.H);
    const w = smooth(clamp((p - 0.04) / 0.16, 0, 1))
            * (1 - smooth(clamp((p - 0.84) / 0.16, 0, 1)));
    const ph = p * 16;
    const strikeM = Math.pow(Math.max(0, Math.sin(ph * 1.5)), 6);
    const strikeA = Math.pow(Math.max(0, Math.sin(ph * 1.5 + 2.2)), 6);
    return {
      w, strikeM, strikeA,
      ouOff: Math.sin(ph * 0.8) * 0.030,
      oyAbs: G.H * 0.34 + Math.sin(ph * 0.55 + 0.4) * span * 0.06,
      mGap: mix(0.12 + Math.sin(ph * 0.6) * 0.03, 0.006, strikeM),
      myOff: Math.sin(ph * 0.9 + 0.5) * span * 0.08 * (1 - strikeM * 0.85),
      aGap: mix(0.20 + Math.sin(ph * 0.7 + 1.0) * 0.04, 0.010, strikeA),
      ayOff: Math.sin(ph * 1.1 + 2.0) * span * 0.10 * (1 - strikeA * 0.85),
    };
  }

  /* The escape that has not ended. Obrokxus, a worm now, is in front
     and faster: he opens a gap, leaves the frame and does not come
     back. Ormius keeps going west after him and never slows — the
     position curve only speeds up, so there is no end to settle on.
     escapeG/escapeGV are the curve and its exact derivative, for the
     camera lead, as with the chase. */
  function escapeG(p) { return 0.5 * p + 0.5 * p * p; }
  function escapeGV(p) { return 0.5 + p; }
  function escapeDrift(p) { return mix(ET_START_U, ET_END_U, escapeG(p)); }
  /* the camera sits a little ahead of him, so the empty void he is
     flying into is what fills the frame */
  function escapeCam(p) { return escapeDrift(p) - 0.15; }
  function escapeCamLead(p, rate) {
    return (ET_END_U - ET_START_U) * escapeGV(p) / beatDur("eternity") / rate;
  }
  function escapeAt(p) {
    const span = Math.min(G.W, G.H);
    const mu = escapeDrift(p);
    const my = G.H * 0.38 + Math.sin(p * 7.0) * span * 0.03;
    const q = clamp(p / 0.60, 0, 1);
    const ou = mu - 0.30 - 1.0 * q * q;
    const oy = G.H * 0.33 + Math.sin(p * 8.0 + 0.6) * span * 0.04 - G.H * 0.06 * smooth(q);
    const oAmt = mix(0, 0.9, smooth(clamp(p / 0.12, 0, 1)))
               * (1 - smooth(clamp((p - 0.50) / 0.10, 0, 1)));
    const strike = Math.pow(Math.max(0, Math.sin(p * 34)), 5)
                 * (1 - smooth(clamp((p - 0.18) / 0.14, 0, 1)));
    const search = smooth(clamp((p - 0.38) / 0.20, 0, 1));
    return { ou, oy, oAmt, mu, my, strike, search };
  }

  /* one of the five warlocks circling Obrokxus in the air, diving in
     to strike on its own rhythm. i picks the slot and the rhythm;
     calm (0..1) scales the dives down, for Mordrial as he dies. */
  function ringFightAt(i, p, cu, cy, calm) {
    const span = Math.min(G.W, G.H);
    const dir = i % 2 ? -1 : 1;
    const ang = p * 7.0 * dir + i * 1.2566;
    const strike = Math.pow(Math.max(0, Math.sin(p * 22 + i * 1.9)), 4)
                 * (calm == null ? 1 : calm);
    const rU = mix(0.15, 0.012, strike);
    const rY = mix(span * 0.19, span * 0.014, strike);
    return { u: cu + Math.cos(ang) * rU, y: cy + Math.sin(ang) * rY * 0.8, strike };
  }

  /* fissures across Rex's back, built once: they glow through the crust
     while he cools from the fall */
  const REX_CRACKS = (function () {
    const r = mulberry(9011);
    const out = [];
    for (let i = 0; i < 9; i++) {
      out.push({
        u: REX_WEST + 0.08 + r() * (REX_EAST - REX_WEST - 0.16),
        len: 0.02 + r() * 0.05,
        seg: 4,
        ph: r() * 6.28,
        drop: 0.02 + r() * 0.05,
      });
    }
    return out;
  })();

  function drawRexLand(ctx, rise, originX, originY, floorY) {
    if (rise < 0.02) return;
    const cool = smooth(clamp((since("land") - 0.22) / 0.65, 0, 1));
    const lock = smooth(clamp((rise - 0.18) / 0.5, 0, 1));
    const xC = mix(originX, sx(mix(REX_WEST, REX_EAST, 0.72)), lock);
    const yC = mix(originY, G.H * 1.16, rise);
    const x0 = sx(REX_WEST) - 36;
    const x1 = sx(REX_EAST) + 80;
    if (x1 < -80 || x0 > G.W + 80) return;
    const bottom = floorY != null ? Math.min(G.H * 2.5, floorY) : G.H * 2.5;
    const baseY = G.H * 1.16;
    const step = 6;
    for (let bi = 0; bi < REX_BANDS.length; bi++) {
      const b = REX_BANDS[bi];
      const widen = (2 - bi) * 0.05;
      const pts = [];
      const left = Math.max(-56, sx(REX_WEST - widen) - 10);
      const right = Math.min(G.W + 80, sx(REX_EAST + 0.22 + widen * 0.15) + 10);
      for (const [px, wu] of gridXs(left, right, step)) {
        const h = rexLandHeight(wu, b);
        pts.push([px, mix(yC, baseY - h * G.H, rise)]);
      }
      if (pts.length < 2) continue;
      const last = pts[pts.length - 1];
      if (bottom - last[1] > 0) {
        const tailW = Math.max(40, (bottom - last[1]) * 0.9);
        pts.push([last[0] + tailW * 0.35, last[1] + (bottom - last[1]) * 0.45]);
        pts.push([last[0] + tailW, bottom]);
      }
      if (left > -56) {
        const first = pts[0];
        if (bottom - first[1] > 0) {
          const tailW = Math.max(40, (bottom - first[1]) * 0.9);
          pts.unshift([first[0] - tailW * 0.35, first[1] + (bottom - first[1]) * 0.45]);
          pts.unshift([first[0] - tailW, bottom]);
        }
      }
      const lit = cool >= 1 ? b.lit : mixHex("#c9581f", b.lit, cool);
      const shade = cool >= 1 ? b.shade : mixHex("#8a3512", b.shade, cool);
      ctx.globalAlpha = rise;
      fillRidge(ctx, pts, bottom, lit, shade);
      ctx.globalAlpha = 1;
    }
    if (cool < 0.98 && rise > 0.3) {
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = `rgba(255,150,60,${0.85 * (1 - cool) * rise})`;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = "round";
      for (let k = 0; k < REX_CRACKS.length; k++) {
        const c = REX_CRACKS[k];
        const cx = sx(c.u), cy = mix(yC, rexSurfY(c.u), rise) + 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        for (let i = 0; i < c.seg; i++) {
          const f = (i + 1) / c.seg;
          const ex = cx + f * c.len * G.W;
          const ey = cy + c.drop * G.H * f + (hash1(k * 13 + i) - 0.5) * 0.03 * G.H;
          ctx.lineTo(ex, ey);
        }
        ctx.stroke();
        flatGlow(ctx, cx, cy, 0.035 * G.H, "245,138,52", 0.5 * (1 - cool) * rise);
      }
      ctx.restore();
    }
    if (rise > 0.12 && rise < 0.92) {
      const glint = (1 - Math.abs(rise - 0.42) / 0.42) * (1 - rise * 0.35);
      if (glint > 0.02) {
        flatGlow(ctx, xC, yC, 80 + rise * 120, "245,138,52", glint);
      }
    }
  }

  function drawRexHole(ctx) {
    const iF = idxOf("flee");
    if (G.beat < iF) return;
    const fleeLin = G.beat === iF ? linear("flee") : 1;
    const hx = sx(FLEE_START_U);
    if (hx < -160 || hx > G.W + 160) return;
    const hy = rexSurfY(FLEE_START_U);
    const open = smooth(clamp(fleeLin / 0.05, 0, 1));
    const R = Math.min(G.W, G.H) * 0.06 * Math.max(open, 0.001);
    const erupt = G.beat === iF ? 1 - smooth(clamp(fleeLin / 0.14, 0, 1)) : 0;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";

    ctx.beginPath();
    ctx.moveTo(hx - R * 1.2, hy);
    ctx.lineTo(hx + R * 1.2, hy);
    ctx.lineTo(hx + R * 0.5, G.H * 1.45);
    ctx.lineTo(hx - R * 0.5, G.H * 1.45);
    ctx.closePath();
    ctx.fillStyle = `rgba(4,1,1,${0.9 * open})`;
    ctx.fill();

    ctx.fillStyle = `rgba(20,5,4,${0.85 * open})`;
    ctx.beginPath(); ctx.ellipse(hx, hy + R * 0.15, R * 1.6, R * 0.55, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = `rgba(4,1,1,${0.97 * open})`;
    ctx.beginPath(); ctx.ellipse(hx + R * 0.12, hy + R * 0.18, R * 1.1, R * 0.36, 0, 0, 6.283); ctx.fill();

    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(245,138,52,${(0.35 + 0.25 * erupt) * open})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(hx, hy + R * 0.15, R * 1.6, R * 0.55, 0, 0, 6.283); ctx.stroke();
    ctx.globalCompositeOperation = "source-over";

    if (erupt > 0.02) {
      drawTintBeam(ctx, hx, hy, hx, hy - G.H * 0.55, "200,40,40", erupt);
      const q = clamp(fleeLin / 0.14, 0, 1);
      for (let k = 0; k < 14; k++) {
        const vx = (k / 13 - 0.5) * 2;
        const px = hx + vx * R * 4 * q;
        const py = hy - (1.2 + (k % 3) * 0.4) * R * 3 * q + R * 6 * q * q;
        const sz = 3 + (k % 4);
        ctx.fillStyle = `rgba(60,24,12,${erupt})`;
        ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
      }
    }

    if (G.beat === iF && fleeLin < 0.05 && G.clashCool <= 0) {
      G.flash = Math.max(G.flash, 0.9);
      G.shake = Math.max(G.shake, 1.0);
      G.clashCool = 0.3;
      G.rings.push({ x: hx, y: hy, r: 10, a: 1 });
    }

    ctx.restore();
  }

  /* Rex's body closing around something, fingers of ground and ember
     curling in from all sides */
  function drawRexGrip(ctx, x, y, amt, R) {
    if (amt < 0.02) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    flatGlow(ctx, x, y, R * 1.6, "245,138,52", amt);

    for (let k = 0; k < 5; k++) {
      const a0 = k * 1.2566 + G.t * 0.35;
      ctx.strokeStyle = `rgba(255,176,96,${0.75 * amt})`;
      ctx.lineWidth = 3 + R * 0.06;
      ctx.beginPath();
      ctx.arc(x, y, R * (0.85 + 0.1 * Math.sin(G.t * 2 + k)), a0, a0 + 0.95);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255,226,190,${0.45 * amt})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(x, y, R * 0.62, a0 + 0.6, a0 + 1.4);
      ctx.stroke();
    }

    ctx.restore();
  }

  /* Obrokxus, held under the surface where Rex closed around him */
  function drawBuried(ctx) {
    const iL = idxOf("land"), iG = idxOf("gods");
    if (G.beat !== iL && G.beat !== iG) return;
    const amt = G.beat === iL
      ? smooth(clamp((linear("land") - 0.35) / 0.30, 0, 1))
      : 1 - smooth(clamp((linear("gods") - 0.70) / 0.30, 0, 1));
    if (amt < 0.02) return;
    const x = sx(BURY_U), y = rexSurfY(BURY_U) + G.H * 0.10;
    const R = Math.min(G.W, G.H) * 0.16 * (1 + 0.12 * Math.sin(G.t * 3.2));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    flatGlow(ctx, x, y, R, "200,36,40", amt);

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(150,18,24,${0.75 * amt})`;
    ctx.beginPath(); ctx.arc(x, y, 0.030 * G.H, 0, 6.283); ctx.fill();
    ctx.fillStyle = `rgba(8,1,2,${0.9 * amt})`;
    ctx.beginPath();
    ctx.arc(x + 0.006 * G.H * Math.sin(G.t * 0.7), y, 0.012 * G.H, 0, 6.283);
    ctx.fill();

    ctx.restore();
  }

  /* which crown each god wears, by kind */
  const CROWN = { ormius: "bars", ava: "rings", kaeron: "orbit", kaelum: "petals", orochronus: "clock" };

  /* the womb tears again, and the five gods come out over the buried
     ground, then dive down into it to join the war */
  function drawGodsBirth(ctx, flesh) {
    const F = window.GenFig;
    if (!F) return;
    if (G.beat !== idxOf("gods")) return;
    const p = linear("gods"), span = Math.min(G.W, G.H);
    const exitX = flesh ? flesh.cx - flesh.rx * 0.92 : sx(ROOT_U) - span * 0.28;
    const exitY = flesh ? flesh.cy + flesh.ry * 0.04 : G.H * 0.5;

    const rip = smooth(clamp(p / 0.08, 0, 1)) * (1 - smooth(clamp((p - 0.50) / 0.15, 0, 1)));
    drawRip(ctx, flesh, rip);
    if (rip > 0.1) G.shake = Math.max(G.shake, 0.32 * rip);

    const bx = sx(BURY_U), by = rexSurfY(BURY_U);

    for (let i = 0; i < SIEGE_GODS.length; i++) {
      const g = SIEGE_GODS[i];
      const out = smooth(clamp((p - 0.06 - i * 0.08) / 0.20, 0, 1));
      if (out <= 0) continue;
      const hoverX = exitX - span * (0.22 + i * 0.11);
      const hoverY = [0.18, 0.42, 0.26, 0.46, 0.34][i] * G.H + Math.sin(G.t * 1.3 + g.ph) * span * 0.02;
      let x = mix(exitX, hoverX, out), y = mix(exitY, hoverY, out);

      const dive = clamp((p - 0.60 - i * 0.05) / 0.25, 0, 1);
      const landX = bx + (i - 2) * span * 0.02;
      x = mix(x, landX, smooth(dive));
      y = mix(y, by + G.H * 0.08, dive * dive);

      const amt = clamp(out * 1.4, 0, 1) * (1 - smooth(clamp((dive - 0.85) / 0.15, 0, 1)));
      const h = Math.min(G.W, G.H) * G.GOD_H;
      F.drawGod(ctx, x, y + h * 0.45, h, ORB_STYLE[g.kind], {
        a: amt, face: -1, kind: g.kind, crown: CROWN[g.kind], wings: g.kind === "ava",
        tilt: -dive * 0.55 + 0.25 * (1 - out), ph: g.ph, mood: "happy",
      });
      drawName(ctx, x, y + h * 0.45 + 14, amt, g.name, 0);

      const fl = Math.sin(Math.PI * clamp((dive - 0.75) / 0.25, 0, 1));
      if (fl > 0.02) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        flatGlow(ctx, landX, by, span * 0.08, g.rgb, 0.5 * fl);
        ctx.restore();
        G.shake = Math.max(G.shake, 0.25 * fl);
      }
    }
  }

  /* the deepest pocket inside Rex, and the war fought there. Drawn in
     world space — the caller has already translated by -diveY, so
     what is here lines up with the buried scene above it. */
  function drawDepths(ctx, dive, diveY) {
    const iD = idxOf("deep"), iP = idxOf("slip");
    if ((G.beat !== iD && G.beat !== iP) || dive < 0.001) return;
    const inSlip = G.beat === iP;
    const deepLin = inSlip ? 1 : linear("deep");
    const slipLin = inSlip ? linear("slip") : 0;
    const span = Math.min(G.W, G.H), dx = sx(DEEP_U), dy = G.H * DEEP_Y;
    ctx.save();

    /* flat stepped rock, following the same surface as the land above */
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
    ctx.restore();

    /* molten veins */
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
    ctx.globalCompositeOperation = "source-over";

    /* the pocket */
    offsetShade(ctx, () => fleshPath(ctx, dx, dy, G.W * 0.36, G.H * 0.30, 0.7, 3),
      G.W * 0.045, G.H * 0.05, "rgba(150,60,24,0.88)", "rgba(92,32,14,0.9)");

    /* Obrokxus */
    let ox = dx + Math.sin(G.t * 0.9) * span * 0.03, oy = dy + Math.cos(G.t * 1.1) * span * 0.02;
    const rise = inSlip ? smooth(clamp((slipLin - 0.40) / 0.50, 0, 1)) : 0;
    ox = mix(ox, sx(BURY_U), rise); oy = mix(oy, rexSurfY(BURY_U) + G.H * 0.03, rise);

    /* phases */
    const grip = inSlip ? mix(0.35, 0, smooth(clamp(slipLin / 0.40, 0, 1))) : mix(1, 0.35, deepLin);
    const bind = inSlip ? smooth(clamp(slipLin / 0.40, 0, 1)) : 0;
    const grow = clamp((deepLin - 0.22) / 0.60, 0, 1);
    const ex = sx(BURY_U), ey = rexSurfY(BURY_U) + G.H * 0.08;

    /* gods */
    const gods = [];
    for (let i = 0; i < SIEGE_GODS.length; i++) {
      const g = SIEGE_GODS[i];
      const desc = smooth(clamp((deepLin - i * 0.04) / 0.30, 0, 1));
      const ga = g.ang + G.t * 0.22 + Math.sin(G.t * 0.4 + g.ph) * 0.3;
      const R = mix(span * (0.30 + 0.04 * Math.sin(G.t * 0.5 + g.ph)), span * 0.44, bind);
      const ringX = dx + Math.cos(ga) * R * 1.3, ringY = dy + Math.sin(ga) * R * 0.85;
      const strike = Math.pow(Math.max(0, Math.sin(G.t * 1.7 + g.ph)), 6) * (1 - bind) * desc;
      const gx = mix(ex, mix(ringX, ox, strike * 0.88), desc), gy = mix(ey, mix(ringY, oy, strike * 0.88), desc);
      gods.push({ g, gx, gy, amt: clamp(desc * 3, 0, 1), strike });
    }

    /* brothers */
    for (let i = 0; i < brothers.length; i++) {
      const b = brothers[i];
      if (b.born > grow) continue;
      const appear = clamp((grow - b.born) / 0.08, 0, 1);
      const edgeX = dx + Math.cos(b.ang) * G.W * 0.36, edgeY = dy + Math.sin(b.ang) * G.H * 0.30;
      const ba = b.ang + G.t * b.sp * 0.35, fr = span * (0.10 + b.rad * 0.27);
      const orbX = ox + Math.cos(ba) * fr * 1.3 + Math.sin(G.t * 3.1 + b.ph) * 4;
      const orbY = oy + Math.sin(ba) * fr * 0.85 + Math.cos(G.t * 2.7 + b.ph) * 4;
      const freeX = mix(edgeX, orbX, smooth(appear)), freeY = mix(edgeY, orbY, smooth(appear));
      const tg = gods[i % gods.length];
      const boundX = tg.gx + Math.cos(b.ph + G.t * 2.2 * b.sp) * span * 0.05, boundY = tg.gy + Math.sin(b.ph + G.t * 2.2 * b.sp) * span * 0.05;
      const bx = mix(freeX, boundX, bind), by = mix(freeY, boundY, bind);
      const al = clamp(appear * 2, 0, 1) * (0.6 + 0.4 * Math.sin(G.t * 5 + b.ph));
      if (al < 0.03) continue;
      const rgb = b.hue < 0.4 ? "150,20,60" : b.hue < 0.75 ? "120,40,140" : "90,12,18";
      ctx.globalCompositeOperation = "lighter";
      const glowR = b.size * 2.4;
      flatGlow(ctx, bx, by, glowR, rgb, al);
      ctx.globalCompositeOperation = "source-over";
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const ang = k * 1.2566 + G.t * b.sp;
        const r = b.size * (0.6 + 0.4 * Math.sin(G.t * 4 + b.ph + k * 1.7));
        const px = bx + Math.cos(ang) * r, py = by + Math.sin(ang) * r;
        k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(6,2,4,${0.9 * al})`;
      ctx.fill();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(${rgb},${0.85 * al})`;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    }

    /* gods draw */
    for (const e of gods) {
      drawTintBeam(ctx, e.gx, e.gy, ox, oy, e.g.rgb, e.strike * e.amt);
      if (e.strike > 0.8 && e.amt > 0.3 && G.clashCool <= 0 && Math.hypot(e.gx - ox, e.gy - oy) < span * 0.12) {
        G.flash = Math.max(G.flash, 0.5);
        G.shake = Math.max(G.shake, 0.5);
        G.clashCool = 0.14;
        G.rings.push({ x: (e.gx + ox) * 0.5, y: (e.gy + oy) * 0.5, r: 10, a: 1 });
      }
      drawOrb(ctx, e.gx, e.gy, e.amt, e.g.kind, 0.62);
    }

    /* Obrokxus and names */
    drawOrb(ctx, ox, oy, 1, "obrokxus");
    drawRexGrip(ctx, ox, oy, grip, span * 0.13);
    for (const e of gods) drawName(ctx, e.gx, e.gy, e.amt, e.g.name, 24);
    drawName(ctx, ox, oy, 1, "OBROKXUS", 34);
    drawRings(ctx);

    /* year counter */
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

  return {
    chaseAt, chaseCamLead, chaseFightAt, escapeDrift, escapeCam, escapeCamLead, escapeAt, ringFightAt,
    drawRexLand, drawRexHole, drawRexGrip, drawBuried, drawGodsBirth, drawDepths,
  };
})();
