window.GenCircle = (function () {
  "use strict";

  let geo = null, geoKey = "";

  function hash(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function lerp(a, b, u) { return a + (b - a) * u; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function build(W, H) {
    const m = Math.min(W, H);
    const C = { x: 0.56 * W, y: 0.50 * H };
    const R = 0.15 * m;
    const P = { x: 0.30 * W, y: 0.24 * H };

    let pileTop;
    if (window.GenEye) {
      const p = GenEye.pile(W, H);
      pileTop = { x: p.x, y: p.y - p.h };
    } else {
      pileTop = { x: 0.5 * W, y: 0.80 * H };
    }
    const ringBot = { x: C.x, y: C.y + R };
    const pmid = {
      x: (pileTop.x + ringBot.x) / 2 - 0.04 * W,
      y: (pileTop.y + ringBot.y) / 2,
    };

    // colour thread: nearest ring point to P
    const dPx = P.x - C.x, dPy = P.y - C.y;
    const angP = Math.atan2(dPy, dPx);
    const ringPt = { x: C.x + Math.cos(angP) * R, y: C.y + Math.sin(angP) * R };
    const mid = { x: (P.x + ringPt.x) / 2, y: (P.y + ringPt.y) / 2 - 0.12 * H };

    // the life layer: a 2-arm spiral of dust specks, a handful of rose
    // sparks riding the arms, and four blue souls, all deterministic
    const life = { specks: [], sparks: [] , souls: [] };
    let idx = 0;
    for (let arm = 0; arm < 2; arm++) {
      for (let i = 0; i < 18; i++) {
        life.specks.push({
          arm, i,
          size: 0.003 + 0.003 * hash(idx * 3 + 701),
          alt: (idx % 3 === 0),
          hb: hash(idx * 3 + 700),
        });
        idx++;
      }
    }
    let sIdx = 0;
    for (let arm = 0; arm < 2; arm++) {
      for (let i = 0; i < 18; i += 4) {
        life.sparks.push({
          arm, i,
          ox: (hash(sIdx * 5 + 800) - 0.5) * 0.03,
          oy: (hash(sIdx * 5 + 801) - 0.5) * 0.03,
          hb: hash(sIdx * 5 + 802),
          order: sIdx,
        });
        sIdx++;
      }
    }
    for (let j = 0; j < 4; j++) {
      life.souls.push({
        angle: hash(j * 7 + 900) * Math.PI * 2,
        radFrac: 0.6 * hash(j * 7 + 901),
        hb: hash(j * 7 + 902),
      });
    }

    geo = { m, C, R, P, pileTop, ringBot, pmid, ringPt, mid, life };
  }

  function drawRing(ctx, geo, steps, m) {
    if (steps <= 0) return;
    ctx.strokeStyle = "#9a8f8c";
    ctx.lineWidth = Math.max(2, 0.012 * m);
    const seg = Math.PI * 2 / 8;
    for (let i = 0; i < steps; i++) {
      const a0 = Math.PI / 2 + i * seg;
      const a1 = a0 + seg;
      ctx.beginPath();
      ctx.arc(geo.C.x, geo.C.y, geo.R, a0, a1);
      ctx.stroke();
    }
  }

  function drawRimHighlight(ctx, geo, m) {
    ctx.strokeStyle = "#c4bab6";
    ctx.lineWidth = Math.max(2, 0.012 * m);
    ctx.beginPath();
    ctx.arc(geo.C.x, geo.C.y, geo.R, Math.PI, 1.5 * Math.PI);
    ctx.stroke();
  }

  function drawGreyThread(ctx, geo, t, m) {
    if (t < 0.2) return;
    const u = clamp((t - 0.2) / 1.8, 0, 1);
    const uq = Math.floor(u * 8) / 8;
    if (uq <= 0) return;
    ctx.strokeStyle = "#9a8f8c";
    ctx.lineWidth = Math.max(2, 0.005 * m);
    ctx.beginPath();
    ctx.moveTo(geo.pileTop.x, geo.pileTop.y);
    const cx = lerp(geo.pileTop.x, geo.pmid.x, uq);
    const cy = lerp(geo.pileTop.y, geo.pmid.y, uq);
    const ex = lerp(geo.pileTop.x, geo.ringBot.x, uq);
    const ey = lerp(geo.pileTop.y, geo.ringBot.y, uq);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
  }

  function drawRoseThread(ctx, geo, t, m) {
    if (t < 3.4) return;
    const u = clamp((t - 3.4) / 1.0, 0, 1);
    const uq = Math.floor(u * 6) / 6;
    if (uq > 0) {
      ctx.strokeStyle = "#b8525a";
      ctx.lineWidth = Math.max(2, 0.005 * m);
      ctx.beginPath();
      ctx.moveTo(geo.P.x, geo.P.y);
      const cx = lerp(geo.P.x, geo.mid.x, uq);
      const cy = lerp(geo.P.y, geo.mid.y, uq);
      const ex = lerp(geo.P.x, geo.ringPt.x, uq);
      const ey = lerp(geo.P.y, geo.ringPt.y, uq);
      ctx.quadraticCurveTo(cx, cy, ex, ey);
      ctx.stroke();
    }
    if (window.GenEye) {
      GenEye.drawPowerPoint(ctx, geo.P.x, geo.P.y, m, t);
    } else {
      ctx.fillStyle = "#b8525a";
      ctx.beginPath();
      ctx.arc(geo.P.x, geo.P.y, 0.012 * m, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawLifeLayer(ctx, geo, C, R, lt, m) {
    const q = Math.floor(lt / 0.2);
    const rot = Math.floor(lt / 0.4) * 0.12;

    for (const sp of geo.life.specks) {
      if (q < sp.i / 2) continue;
      if (Math.floor((lt + sp.hb * 3) / 0.6) % 5 === 0) continue;
      const r_i = R * (0.12 + 0.78 * sp.i / 17);
      const angle = sp.arm * Math.PI + 2.2 * (r_i / R) + rot;
      const x = C.x + Math.cos(angle) * r_i;
      const y = C.y + Math.sin(angle) * r_i;
      const size = m * sp.size;
      ctx.fillStyle = sp.alt ? "#9a8f8c" : "#6f6664";
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const sk of geo.life.sparks) {
      if (q < 6 + sk.order) continue;
      if (Math.floor((lt + sk.hb * 3) / 0.7) % 4 === 0) continue;
      const r_i = R * (0.12 + 0.78 * sk.i / 17);
      const angle = sk.arm * Math.PI + 2.2 * (r_i / R) + rot;
      const x = C.x + Math.cos(angle) * r_i + sk.ox * R;
      const y = C.y + Math.sin(angle) * r_i + sk.oy * R;
      const size = m * 0.004;
      ctx.fillStyle = "#b8525a";
      ctx.fillRect(x - size, y - size, size * 2, size * 2);
    }

    for (let k = 0; k < geo.life.souls.length; k++) {
      const so = geo.life.souls[k];
      if (q < 12 + k) continue;
      if (Math.floor((lt + so.hb * 3) / 0.8) % 6 === 0) continue;
      const rad = so.radFrac * R;
      const x = C.x + Math.cos(so.angle) * rad;
      const y = C.y + Math.sin(so.angle) * rad;
      const size = m * 0.004;
      ctx.fillStyle = "#5b8fd6";
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawUniverse(ctx, W, H, t, Cover, Rover) {
    if (!W || !H) return;
    const key = W + "x" + H;
    if (key !== geoKey) { geoKey = key; build(W, H); }
    if (!geo) return;
    const C = Cover || geo.C;
    const R = Rover || geo.R;

    ctx.fillStyle = "#5a4c4e";
    ctx.beginPath();
    ctx.arc(C.x, C.y, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(C.x, C.y, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#6e5e60";
    ctx.fillRect(C.x - R, C.y - R, 0.64 * R, 2 * R);
    drawLifeLayer(ctx, geo, C, R, t - 4.4, geo.m);
    ctx.restore();
  }

  function draw(ctx, W, H, t, reduced) {
    if (!W || !H) return;
    if (reduced) t = 99;
    if (t < 0) t = 0;

    const key = W + "x" + H;
    if (key !== geoKey) { geoKey = key; build(W, H); }
    if (!geo) return;

    const arcCount = t >= 2.0 ? clamp(Math.floor((t - 2.0) / 0.15) + 1, 0, 8) : 0;

    if (window.GenEye) { try { GenEye.setPileCut(arcCount); } catch (e) { /* skip cut */ } }
    if (window.GenRoles) {
      try { GenRoles.draw(ctx, W, H, 99, reduced); }
      catch (e) { /* skip backdrop */ }
      finally {
        if (window.GenEye) { try { GenEye.setPileCut(0); } catch (e) { /* skip cut */ } }
      }
    } else if (window.GenEye) {
      try { GenEye.setPileCut(0); } catch (e) { /* skip cut */ }
    }

    if (t >= 4.4) {
      drawUniverse(ctx, W, H, t);
    }

    drawRing(ctx, geo, arcCount, geo.m);

    if (t >= 4.4) {
      drawRimHighlight(ctx, geo, geo.m);
    }

    drawGreyThread(ctx, geo, t, geo.m);
    drawRoseThread(ctx, geo, t, geo.m);
  }

  return { draw, drawUniverse };
})();
