/* genesis-orb.js — cutscene painters: the rip, key lights, trails, the
   orb, rings, beams and names; second half of GenVoid */
(function () {
  const G = window.Gen;
  const { smooth, clamp, mix } = Util;
  const { ROOT_U, BURY_U, YELLOW_KEYS, RED_KEYS, ORB_STYLE, NAME_DELAY, NAME_FADE,
          linear, sx } = G;
  const { flatGlow, flatSphere, rexSurfY } = GenPaint;

  function drawRip(ctx, flesh, amt) {
    if (!flesh || amt < 0.02) return;
    const { cx, cy, rx, ry } = flesh;
    const x0 = cx - rx * 0.92;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(255,230,190,${0.85 * amt})`;
    ctx.lineWidth = 1.4 + amt * 2.2;
    ctx.beginPath();
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const x = x0 + Math.sin(u * 18 + G.t * 9) * (2 + amt * 5) + u * rx * 0.08;
      const y = cy - ry * 0.72 + u * ry * 1.44;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function keyAt(keys, u) {
    if (u <= keys[0].t) return { x: keys[0].x, y: keys[0].y };
    for (let i = 1; i < keys.length; i++) {
      if (u <= keys[i].t) {
        const a = keys[i - 1], b = keys[i];
        const span = Math.max(0.0001, b.t - a.t);
        const k = (u - a.t) / span;
        const s = span < 0.055 ? Math.pow(k, 0.38) : smooth(k);
        return { x: mix(a.x, b.x, s), y: mix(a.y, b.y, s) };
      }
    }
    const last = keys[keys.length - 1];
    return { x: last.x, y: last.y };
  }

  function lightsAt(uBirth, uFight, uLand, flesh) {
    const exitX = flesh ? flesh.cx - flesh.rx * 0.92 : sx(ROOT_U) - Math.min(G.W, G.H) * 0.28;
    const exitY = flesh ? flesh.cy + flesh.ry * 0.04 : G.H * 0.5;
    const west = flesh ? flesh.cx - flesh.rx - 22 : exitX;
    const arenaX = west - Math.min(G.W, G.H) * 0.16;
    const arenaY = G.H * 0.40;
    const span = Math.min(G.W, G.H);
    const emerge = clamp(uBirth * 1.35, 0, 1);
    const yK = keyAt(YELLOW_KEYS, uFight);
    const rK = keyAt(RED_KEYS, uFight);
    let yx = mix(exitX, arenaX + yK.x * span * 0.28, emerge);
    let yy = mix(exitY, arenaY + yK.y * span * 0.30, emerge);
    let rx = mix(exitX, arenaX + rK.x * span * 0.28, emerge);
    let ry = mix(exitY, arenaY + rK.y * span * 0.30, emerge);
    yx = Math.min(yx, west);
    rx = Math.min(rx, west);

    /* Rex's last act: he closes his whole body around Obrokxus, and
       the two of them go down together into what becomes the ground */
    const wrap = smooth(clamp((uFight - 0.80) / 0.10, 0, 1));
    const landLin = linear("land");
    const dropP = clamp((uFight - 0.88) / 0.12, 0, 1) * 0.35 + clamp(landLin / 0.45, 0, 1) * 0.65;
    const bx = sx(BURY_U);
    const by = rexSurfY(BURY_U) + G.H * 0.10;
    rx = mix(rx, bx, smooth(dropP));
    ry = mix(ry, by, dropP * dropP);
    yx = mix(yx, rx, wrap);
    yy = mix(yy, ry, wrap);
    const bury = smooth(clamp((landLin - 0.30) / 0.30, 0, 1));

    return {
      yx, yy, rx, ry,
      yAmt: emerge * (1 - wrap * 0.35) * (1 - bury),
      rAmt: emerge * (1 - bury * 0.6),
      originX: rx,
      originY: ry,
      die: dropP, wrap, bury, recede: 0,
    };
  }

  function pushTrail(list, x, y) {
    if (!G.tick60) return;
    list.push({ x, y });
    if (list.length > 16) list.shift();
  }

  function drawTrail(ctx, list, rgb, amt, dark) {
    if (amt < 0.02 || list.length < 2) return;
    ctx.save();
    if (!dark) ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (let i = 1; i < list.length; i++) {
      const u = i / list.length;
      ctx.strokeStyle = `rgba(${rgb},${(dark ? 0.42 : 0.55) * u * amt})`;
      ctx.lineWidth = mix(1.2, dark ? 5.5 : 7, u);
      ctx.beginPath();
      ctx.moveTo(list[i - 1].x, list[i - 1].y);
      ctx.lineTo(list[i].x, list[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawOrb(ctx, x, y, amt, kind, scale) {
    if (amt < 0.02) return;
    const s = scale == null ? 1 : scale;
    const big = kind === "obrokxus" || kind === "hound";
    const R = Math.min(G.W, G.H) * (kind === "hound" ? 0.055 : big ? 0.072 : 0.048) * s * (0.7 + amt * 0.5);
    ctx.save();
    if (kind === "rex") {
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.rex.glow, amt);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.rex.lit, ORB_STYLE.rex.shade, ORB_STYLE.rex.core, amt);
    } else if (kind === "ormius") {
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.ormius.glow, amt);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.ormius.lit, ORB_STYLE.ormius.shade, ORB_STYLE.ormius.core, amt);
    } else if (kind === "ava") {
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.ava.glow, amt);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.ava.lit, ORB_STYLE.ava.shade, ORB_STYLE.ava.core, amt);
    } else if (kind === "kaelum") {
      const a = amt;
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.kaelum.glow, a);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.kaelum.lit, ORB_STYLE.kaelum.shade, ORB_STYLE.kaelum.core, a);
    } else if (kind === "orochronus") {
      const a = amt;
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.orochronus.glow, a);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.orochronus.lit, ORB_STYLE.orochronus.shade, ORB_STYLE.orochronus.core, a);
      ctx.strokeStyle = `rgba(226,232,244,${0.55 * a})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(x, y, R * 1.15, 0, 6.283); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(G.t * 2.4) * R, y + Math.sin(G.t * 2.4) * R);
      ctx.stroke();
    } else if (kind === "kaeron") {
      const a = amt;
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.kaeron.glow, a);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.kaeron.lit, ORB_STYLE.kaeron.shade, ORB_STYLE.kaeron.core, a);
      ctx.fillStyle = `rgba(214,232,255,${0.8 * a})`;
      for (let k = 0; k < 3; k++) {
        const ang = G.t * 1.6 + k * 2.094;
        ctx.beginPath();
        ctx.arc(x + Math.cos(ang) * R * 1.3, y + Math.sin(ang) * R * 1.3, 1.6, 0, 6.283);
        ctx.fill();
      }
    } else if (kind === "mordrial") {
      flatGlow(ctx, x, y, R * 2.4, "190,30,36", amt);
      ctx.fillStyle = `rgba(18,8,12,${0.94 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.7, 0, 6.283); ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, R * 0.7, 0, 6.283); ctx.clip();
      ctx.fillStyle = `rgba(200,32,40,${0.78 * amt})`;
      ctx.fillRect(x - R, y - R, R, R * 2);
      ctx.fillStyle = `rgba(240,238,232,${0.78 * amt})`;
      ctx.fillRect(x, y - R, R, R * 2);
      ctx.restore();
      ctx.fillStyle = `rgba(255,250,245,${0.8 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.16, 0, 6.283); ctx.fill();
    } else if (kind === "cadmus") {
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.cadmus.glow, amt);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.cadmus.lit, ORB_STYLE.cadmus.shade, ORB_STYLE.cadmus.core, amt);
    } else if (kind === "aelius") {
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.aelius.glow, amt);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.aelius.lit, ORB_STYLE.aelius.shade, ORB_STYLE.aelius.core, amt);
    } else if (kind === "velindra") {
      ctx.globalCompositeOperation = "source-over";
      flatGlow(ctx, x, y, R * 2.2, ORB_STYLE.velindra.glow, amt);
      flatSphere(ctx, x, y, R * 0.62, ORB_STYLE.velindra.lit, ORB_STYLE.velindra.shade, ORB_STYLE.velindra.core, amt);
    } else if (kind === "hound") {
      flatGlow(ctx, x, y, R * 1.9, "110,10,16", amt);
      ctx.fillStyle = `rgba(16,2,4,${0.96 * amt})`;
      ctx.beginPath();
      ctx.ellipse(x, y, R * 0.85, R * 0.62, Math.sin(G.t * 1.3) * 0.12, 0, 6.283);
      ctx.fill();
      ctx.strokeStyle = `rgba(220,30,36,${0.85 * amt})`;
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      for (let i = 0; i < 7; i++) {
        const ang = G.t * 0.4 + i * (6.283 / 7);
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang) * R * 0.35, y + Math.sin(ang) * R * 0.28);
        ctx.lineTo(x + Math.cos(ang) * R * 0.95, y + Math.sin(ang) * R * 0.72);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(235,40,44,${0.75 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.18, 0, 6.283); ctx.fill();
    } else {
      flatGlow(ctx, x, y, R * 1.7, "120,12,18", amt);
      ctx.fillStyle = `rgba(22,3,5,${0.96 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.72, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(150,18,24,${0.55 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.22, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(8,1,2,${0.9 * amt})`;
      ctx.beginPath(); ctx.arc(x, y, R * 0.08, 0, 6.283); ctx.fill();
    }
    ctx.restore();
  }

  function drawRings(ctx) {
    if (!G.rings.length) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const r of G.rings) {
      ctx.strokeStyle = `rgba(255,180,140,${0.7 * r.a})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.283); ctx.stroke();
    }
    ctx.restore();
  }

  function drawBeam(ctx, ax, ay, bx, by, amt) {
    if (amt < 0.08) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(255,230,170,${0.55 * amt})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = `rgba(140,20,28,${0.28 * amt})`;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.restore();
  }

  function drawTintBeam(ctx, ax, ay, bx, by, rgb, amt) {
    if (amt < 0.06) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(${rgb},${0.58 * amt})`;
    ctx.lineWidth = 2.1;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = `rgba(${rgb},${0.16 * amt})`;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.restore();
  }

  function yWob(ph, amp) {
    return G.H * 0.36 + Math.sin(G.t * 1.35 + ph) * G.H * (amp || 0.018);
  }

  /* who is who. The lines name them once; the labels keep naming
     them, quietly, for as long as they are on the deck. */
  function drawName(ctx, x, y, amt, text, drop) {
    if (amt < 0.12 || !text) return;
    if (amt >= 0.5 && G.nameSeen[text] == null) G.nameSeen[text] = G.t;
    if (G.nameSeen[text] == null) return;
    if (x < -80 || x > G.W + 80) return;
    const late = clamp((G.t - G.nameSeen[text] - NAME_DELAY) / NAME_FADE, 0, 1);
    if (late <= 0) return;
    const a = clamp((amt - 0.12) / 0.35, 0, 1) * 0.72 * late;
    const dy = y + (drop == null ? 26 : drop);
    ctx.save();
    ctx.font = '500 10px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const w = ctx.measureText(text).width;
    ctx.fillStyle = `rgba(8,11,13,${0.62 * a})`;
    ctx.fillRect(x - w * 0.5 - 5, dy - 3, w + 10, 15);
    ctx.fillStyle = `rgba(220,230,232,${a})`;
    ctx.fillText(text, x, dy);
    ctx.restore();
  }

  window.GenVoid = Object.assign(window.GenVoid || {}, {
    drawRip, lightsAt, pushTrail, drawTrail, drawOrb, drawRings, drawBeam,
    drawTintBeam, yWob, drawName,
  });
})();
