/* js/genesis/genesis-ritual.js — the fifth spire's ritual: the pact rift,
   the blessing, the corrupting help, the drain of victims and souls into
   the newborn Hound, drawn from the same saga state S as genesis-saga.js. */
(function () {
  const G = window.Gen;
  const { clamp, mix, smooth, mulberry } = Util;

  /* ---- where the ritual's target sits: the nest pit, rising to the
     Hound's chest once it is born ---- */
  function target(S) {
    const x = G.sx(S.nestU);
    const y = mix(GenMain.surfY(x) + 4, S.hY - 0.40 * 0.085 * G.H, S.hBorn || 0);
    return { x, y };
  }

  /* ---- seeded rosters, fractions only: screen-space is applied at
     draw time, never baked in here ---- */
  const VICTIMS = (function () {
    const r = mulberry(7707);
    const list = [];
    for (let i = 0; i < 12; i++) {
      const side = i % 2 ? 1 : -1;
      const du = side * (0.06 + r() * 0.24);
      const lane = r() * 0.18;
      const hs = 0.075 + r() * 0.02;
      const delay = r() * 0.35;
      const spin = (r() < 0.5 ? -1 : 1) * (1 + r() * 1.5);
      const face = r() < 0.5 ? -1 : 1;
      list.push({ du, lane, hs, delay, spin, face });
    }
    return list;
  })();

  const SOULS = (function () {
    const r = mulberry(7711);
    const list = [];
    for (let i = 0; i < 56; i++) {
      const ang0 = r() * 6.283;
      const r0 = 0.10 + r() * 0.32;
      const delay = r() * 0.45;
      const kind = i % 2;
      const spin = 3 + r() * 3;
      const size = 1.6 + r() * 1.6;
      list.push({ ang0, r0, delay, kind, spin, size });
    }
    return list;
  })();

  const TAINT = { lit: "#6e0a10", shade: "#2a0407", glow: "200,36,40", core: "#e8b0a8" };

  const MOTES = (function () {
    const r = mulberry(7717);
    const list = [];
    for (let i = 0; i < 10; i++) {
      const ox = (r() - 0.5) * 0.9;
      const oy = r() * 1.1;
      const ph = r() * 6.283;
      const s = 2 + r() * 2;
      list.push({ ox, oy, ph, s });
    }
    return list;
  })();

  /* ---- a thorn shard flying from a drained spire toward the target,
     drawn as two triangles split along its spine ---- */
  function drawShard(ctx, g, j, T) {
    const pj = clamp(g.pulled * 1.6 - j * 0.2, 0, 1);
    if (pj <= 0 || pj >= 1) return;
    const q = 1 - j * 0.18;
    const x0 = g.x + g.ln * q, y0 = g.topY - g.th0 * q;
    const cx = (x0 + T.x) / 2, cy = Math.min(y0, T.y) - 0.10 * G.H;
    const u = 1 - pj;
    const px = u * u * x0 + 2 * u * pj * cx + pj * pj * T.x;
    const py = u * u * y0 + 2 * u * pj * cy + pj * pj * T.y;
    let tx = 2 * u * (cx - x0) + 2 * pj * (T.x - cx);
    let ty = 2 * u * (cy - y0) + 2 * pj * (T.y - cy);
    const tlen = Math.hypot(tx, ty) || 1;
    tx /= tlen; ty /= tlen;
    const perpx = -ty, perpy = tx;

    const L = Math.max(6, g.tw * 1.4) * (1 - 0.6 * pj);
    const halfW = 0.18 * L;
    const tipX = px + tx * L, tipY = py + ty * L;
    const lx = px + perpx * halfW, ly = py + perpy * halfW;
    const rx = px - perpx * halfW, ry = py - perpy * halfW;

    ctx.save();
    ctx.globalAlpha = 1 - pj * pj * pj;
    ctx.beginPath();
    ctx.moveTo(lx, ly); ctx.lineTo(tipX, tipY); ctx.lineTo(px, py); ctx.closePath();
    ctx.fillStyle = g.lit;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px, py); ctx.lineTo(tipX, tipY); ctx.lineTo(rx, ry); ctx.closePath();
    ctx.fillStyle = "#2a0407";
    ctx.fill();
    ctx.restore();
  }

  function drawUnder(ctx, S, F) {
    /* ---- the pact rift: the sinner Ormius locked away ---- */
    if (S.pact > 0.01) {
      const xr = G.sx(S.cU - 0.07), yr = GenMain.surfY(xr) + 3;
      const R = Math.min(G.W, G.H) * 0.05, p = S.pact;
      ctx.save();
      GenPaint.flatGlow(ctx, xr, yr - 0.1 * R, 1.6 * R, "150,20,30", 0.5 * p);
      ctx.beginPath();
      ctx.ellipse(xr, yr, 1.1 * R * p, 0.18 * R * p, 0, 0, 6.283);
      ctx.fillStyle = `rgba(6,0,2,${0.95 * p})`;
      ctx.fill();
      if (Math.sin(G.t * 0.9) >= -0.92) {
        ctx.fillStyle = `rgba(224,58,42,${p})`;
        ctx.beginPath();
        ctx.arc(xr - 0.35 * R * p, yr - 0.03 * R, 0.07 * R, 0, 6.283);
        ctx.arc(xr + 0.35 * R * p, yr - 0.03 * R, 0.07 * R, 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = p;
      for (let k = 0; k < 5; k++) {
        if (S.cadL > 0.50 + 0.03 * k) continue;
        const x = xr + (k - 2) * 0.4 * R * p;
        const w = 0.09 * R, x0 = x - w * 0.5, x1 = x + w * 0.5;
        const yTop = yr - 0.28 * R, yBot = yr + 0.22 * R;
        const splitX = x0 + 0.3 * w;
        ctx.fillStyle = "#d8b04a";
        ctx.fillRect(x0, yTop, splitX - x0, yBot - yTop);
        ctx.fillStyle = "#8a6424";
        ctx.fillRect(splitX, yTop, x1 - splitX, yBot - yTop);
      }
      ctx.restore();
    }

    /* ---- blessing ground glow ---- */
    if (S.bless > 0.01) {
      GenPaint.flatGlow(ctx, G.sx(S.aelU), S.aelY, 0.07 * G.H, "120,214,96", 0.35 * S.bless);
    }

    /* ---- mortal forms ---- */
    if (S.cMortal > 0.01) {
      F.drawMortal(ctx, G.sx(S.cU), S.cY, 0.10 * G.H, { a: S.cMortal, face: S.cFace, walk: 0 });
    }
    if (S.aelChild > 0.01) {
      F.drawMortal(ctx, G.sx(S.aelU), S.aelY, 0.06 * G.H, { a: S.aelChild, face: S.aelFace, walk: 0 });
    }
    if (S.vTaint > 0.01) {
      const flick = 0.75 + 0.25 * Math.sin(G.t * 23) * Math.sin(G.t * 7.3);
      const vx = G.sx(S.vU);
      F.drawWarlock(ctx, vx, S.vY, 0.13 * G.H, TAINT, {
        a: S.vTaint * flick, face: S.vFace, pose: "stand", walk: G.t * 140, tilt: 0.06 * Math.sin(G.t * 17),
      });
      for (let i = 0; i < MOTES.length; i++) {
        const m = MOTES[i];
        const x = vx + m.ox * 0.13 * G.H + 3 * Math.sin(G.t * 9 + m.ph);
        const y = S.vY - m.oy * 0.13 * G.H + 3 * Math.cos(G.t * 11 + m.ph);
        ctx.fillStyle = `rgba(200,36,40,${0.8 * S.vTaint})`;
        ctx.fillRect(x - m.s * 0.5, y - m.s * 0.5, m.s, m.s);
      }
    }

    /* ---- the drain: spires, victims and souls feeding the Hound ---- */
    if (S.fifthL > 0 && S.fifthL < 1) {
      const T = target(S);

      if (GenMain.spireGeom) {
        for (let k = 0; k < GenMain.SPIRES.length; k++) {
          const g = GenMain.spireGeom(k, S);
          if (!g || g.pulled <= 0.001) continue;
          for (let j = 0; j < 4; j++) drawShard(ctx, g, j, T);
        }
      }

      for (let i = 0; i < VICTIMS.length; i++) {
        const v = VICTIMS[i];
        const x0 = G.sx(S.nestU + v.du);
        const y0 = GenMain.surfY(x0) - 6 - v.lane * 0.06 * G.H;
        const a = clamp((S.fifthL - 0.10) / 0.10, 0, 1);
        const p = smooth(clamp((S.drain - v.delay) / 0.55, 0, 1));
        if (p >= 0.999 || a <= 0.01) continue;
        const x = mix(x0, T.x, p);
        const y = mix(y0, T.y, p) - Math.sin(Math.PI * p) * 0.12 * G.H;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(v.spin * p * Math.PI);
        F.drawMortal(ctx, 0, 0, v.hs * G.H * (1 - 0.75 * p), { a: a * (1 - p * p * p), face: v.face, walk: 0 });
        ctx.restore();
      }

      const vis = clamp((S.fifthL - 0.22) / 0.12, 0, 1);
      if (vis > 0) {
        for (let i = 0; i < SOULS.length; i++) {
          const s = SOULS[i];
          const p = clamp((S.drain - s.delay) / 0.55, 0, 1);
          if (p >= 1) continue;
          const pos = pp => {
            const r = s.r0 * G.H * Math.pow(1 - pp, 1.4);
            const ang = s.ang0 + s.spin * pp + G.t * 0.4;
            return { x: T.x + Math.cos(ang) * r * 1.2, y: T.y + (Math.sin(ang) * 0.35 - 0.45) * r };
          };
          const a = vis * (1 - Math.pow(p, 4));
          const head = pos(p);
          let tail;
          if (p === 0) {
            const r = s.r0 * G.H;
            const ang = s.ang0 + G.t * 0.4 - 0.25;
            tail = { x: T.x + Math.cos(ang) * r * 1.2, y: T.y + (Math.sin(ang) * 0.35 - 0.45) * r };
          } else {
            tail = pos(Math.max(0, p - 0.05));
          }
          if (s.kind === 0) {
            GenPaint.flatGlow(ctx, head.x, head.y, s.size * 3, "226,214,210", 0.35 * a);
            ctx.strokeStyle = `rgba(226,214,210,${0.6 * a})`;
            ctx.lineWidth = s.size * 0.6;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(tail.x, tail.y); ctx.lineTo(head.x, head.y); ctx.stroke();
            ctx.fillStyle = `rgba(240,232,228,${a})`;
            ctx.fillRect(head.x - s.size * 0.5, head.y - s.size * 0.5, s.size, s.size);
          } else {
            ctx.strokeStyle = `rgba(200,36,40,${0.9 * a})`;
            ctx.lineWidth = s.size * 0.8;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(tail.x, tail.y); ctx.lineTo(head.x, head.y); ctx.stroke();
          }
        }
      }
    }
  }

  /* ---- latched hits: each fires once as its threshold is crossed,
     resets once its state has fallen back well below it ---- */
  let pactLatch = false, aelLatch = false, velLatch = false, houndLatch = false;

  function drawOver(ctx, S, gems) {
    /* ---- teach: Meridian burns knowledge into Cadmus ---- */
    if (S.teach > 0.01 && S.mdAmt > 0.1) {
      GenVoid.drawTintBeam(ctx, gems.mdG.gx, gems.mdG.gy, G.sx(S.cU), S.cY - 0.06 * G.H, "200,32,40", S.teach * S.mdAmt * 0.8);
    }

    /* ---- pact tendrils: the rift reaches for Cadmus's chest ---- */
    if (S.pact > 0.2) {
      const xr = G.sx(S.cU - 0.07), yr = GenMain.surfY(xr) + 3;
      const cx = G.sx(S.cU), cy = S.cY - 0.08 * G.H;
      GenVoid.drawTintBeam(ctx, xr, yr, cx, cy, "120,10,20", S.pact * 0.9);
      ctx.save();
      ctx.strokeStyle = `rgba(10,0,3,${0.85 * S.pact})`;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      for (let i = 0; i < 3; i++) {
        const mx = (xr + cx) / 2, my = (yr + cy) / 2;
        const off = Math.sin(G.t * 3 + i * 2.1) * 0.04 * G.H;
        const dx = cx - xr, dy = cy - yr;
        const len = Math.hypot(dx, dy) || 1;
        const px = -dy / len, py = dx / len;
        ctx.beginPath();
        ctx.moveTo(xr, yr);
        ctx.quadraticCurveTo(mx + px * off, my + py * off, cx, cy);
        ctx.stroke();
      }
      ctx.restore();
    }

    /* ---- blessing: light falls on Aelius ---- */
    if (S.bless > 0.01) {
      const x = G.sx(S.aelU);
      GenVoid.drawTintBeam(ctx, x, -20, x, S.aelY - 0.03 * G.H, "120,214,96", S.bless);
      GenPaint.flatGlow(ctx, x, S.aelY - 0.04 * G.H, 0.06 * G.H, "200,255,210", 0.5 * S.bless);
    }

    /* ---- help: Cadmus's corrupting aid reaches Velindra ---- */
    if (S.vHelp > 0.01 && S.cAmt > 0.1) {
      const cx = G.sx(S.vU), cy = S.vY - 0.08 * G.H;
      GenVoid.drawTintBeam(ctx, gems.cG.gx, gems.cG.gy, cx, cy, "170,60,40", S.vHelp * 0.85);
      GenVoid.drawTintBeam(ctx, gems.cG.gx, gems.cG.gy, cx, cy, "140,70,210", S.vHelp * S.vAmt);
    }

    /* ---- weapons: Velindra forges orbiting blades ---- */
    if (S.vForge > 0.01 && S.vAmt > 0.1) {
      const cx = G.sx(S.vU), cy = S.vY - 0.19 * G.H;
      const amt = S.vForge * S.vAmt;
      for (let i = 0; i < 3; i++) {
        const ang = G.t * 1.2 + i * 2.094;
        const orbR = 0.05 * G.H;
        const bx = cx + Math.cos(ang) * orbR, by = cy + Math.sin(ang) * orbR;
        const len = 0.045 * G.H, w = 0.012 * G.H;
        const dx = Math.cos(ang), dy = Math.sin(ang);
        const px = -dy, py = dx;
        const tipX = bx + dx * len * 0.5, tipY = by + dy * len * 0.5;
        const backX = bx - dx * len * 0.5, backY = by - dy * len * 0.5;
        const lx = bx + px * w * 0.5, ly = by + py * w * 0.5;
        const rx = bx - px * w * 0.5, ry = by - py * w * 0.5;
        ctx.save();
        ctx.globalAlpha = amt;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY); ctx.lineTo(lx, ly); ctx.lineTo(backX, backY); ctx.closePath();
        ctx.fillStyle = "#b884f0";
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(tipX, tipY); ctx.lineTo(rx, ry); ctx.lineTo(backX, backY); ctx.closePath();
        ctx.fillStyle = "#56288a";
        ctx.fill();
        ctx.restore();
        GenPaint.flatGlow(ctx, bx, by, 0.02 * G.H, "140,70,210", 0.3 * amt);
      }
    }

    /* ---- ritual: all four warlocks' gems feed the target ---- */
    if (S.ritual > 0.01) {
      const T = target(S);
      const feeds = [
        [gems.mdG, S.mdAmt, "200,32,40"],
        [gems.cG, S.cAmt, "170,60,40"],
        [gems.aelG, S.aelAmt, "30,160,100"],
        [gems.vG, S.vAmt, "140,70,210"],
      ];
      for (let i = 0; i < feeds.length; i++) {
        const [gem, amt, rgb] = feeds[i];
        if (amt > 0.1) GenVoid.drawTintBeam(ctx, gem.gx, gem.gy, T.x, T.y, rgb, S.ritual * amt * 0.9);
      }
      GenPaint.flatGlow(ctx, T.x, T.y, 0.05 * G.H * (0.6 + 0.4 * S.drain), "200,36,40", 0.5 * S.ritual);
    }

    /* ---- latched hits ---- */
    if (S.pactHit > 0.5 && !pactLatch) {
      pactLatch = true;
      G.flash = Math.max(G.flash, 0.6);
      G.shake = Math.max(G.shake, 0.5);
      G.rings.push({ x: G.sx(S.cU), y: S.cY - 0.08 * G.H, r: 10, a: 1 });
    }
    if (S.cadL < 0.4) pactLatch = false;

    if (S.aelL >= 0.56 && S.aelL < 0.9 && !aelLatch) {
      aelLatch = true;
      G.flash = Math.max(G.flash, 0.45);
      G.rings.push({ x: G.sx(S.aelU), y: S.aelY - 0.07 * G.H, r: 8, a: 0.8 });
    }
    if (S.aelL < 0.4) aelLatch = false;

    if (S.velL >= 0.62 && S.velL < 0.9 && !velLatch) {
      velLatch = true;
      G.flash = Math.max(G.flash, 0.5);
      G.shake = Math.max(G.shake, 0.4);
      G.rings.push({ x: G.sx(S.vU), y: S.vY - 0.08 * G.H, r: 10, a: 1 });
    }
    if (S.velL < 0.4) velLatch = false;

    if (S.hBorn > 0.05 && S.fifthL < 1 && !houndLatch) {
      houndLatch = true;
      G.flash = Math.max(G.flash, 0.8);
      G.shake = Math.max(G.shake, 0.8);
      G.zoomKick = Math.max(G.zoomKick, 0.05);
      const T = target(S);
      G.rings.push({ x: T.x, y: T.y, r: 12, a: 1 });
    }
    if (S.fifthL < 0.5) houndLatch = false;
  }

  window.GenRitual = { target, drawUnder, drawOver };
})();
