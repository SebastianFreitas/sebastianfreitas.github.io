/* genesis-sky.js — the air half as a cracked pane: fractures run out of the explosion's point from the flash, shards are thrown and drift and stay to the end of birth, one catches the light now and then. Drawn from genesis-elements.js over the stars. Pure function of time. */
window.GenesisSky = (function () {
  const G = window.Gen;
  const { clamp, mulberry } = Util;
  const P = GenEldPal.LIT;
  const CRACK = P.light.rift, BODY = P.cloth.coal, FACE = P.cloth.slate;
  const GLASS_ON = false; // archived: owner removed the glass break 2026-10-27
  let geo = null, gW = 0, gH = 0;

  function build(ox, oy, W, H) {
    const r = mulberry(7731);
    const cracks = [], arcs = [], shards = [];
    const reach = Math.max(W * 0.5, oy) * 0.95;
    const nMain = 11;
    // a jagged polyline from (x, y) along ang; f0/f1 = growth fraction range it covers
    function line(x, y, ang, len, f0, f1) {
      const n = 6 + Math.floor(r() * 3), pts = [{ x, y, f: f0 }];
      let a = ang;
      for (let i = 1; i <= n; i++) {
        a += (r() - 0.5) * 0.35;
        const d = len / n * (0.7 + r() * 0.6);
        const p = pts[i - 1];
        pts.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, f: f0 + (f1 - f0) * i / n });
      }
      return { pts, ang: a };
    }
    for (let i = 0; i < nMain; i++) {
      const ang = -Math.PI + 0.1 + (i + (r() - 0.5) * 0.6) / (nMain - 1) * (Math.PI - 0.2);
      const len = reach * (0.8 + r() * 0.35), delay = r() * 0.15;
      const m = line(ox, oy, ang, len, delay, 1);
      m.pts.main = true;
      cracks.push(m.pts);
      const nb = 1 + (r() < 0.5 ? 1 : 0);
      for (let b = 0; b < nb; b++) {
        const k = 2 + Math.floor(r() * (m.pts.length - 4)), p = m.pts[k];
        const side = r() < 0.5 ? -1 : 1;
        cracks.push(line(p.x, p.y, ang + side * (0.45 + r() * 0.5), len * (0.2 + r() * 0.25), p.f, Math.min(1, p.f + 0.4)).pts);
      }
    }
    for (let i = 0; i < 4; i++) {
      const rad = H * (0.04 + i * 0.035 + r() * 0.015), a0 = -Math.PI + r() * 1.2, span = 0.9 + r() * 1.3, pts = [];
      const n = 7;
      for (let j = 0; j <= n; j++) {
        const a = a0 + span * j / n, rr = rad * (1 + (r() - 0.5) * 0.08);
        pts.push({ x: ox + Math.cos(a) * rr, y: oy + Math.sin(a) * rr, f: 0.1 + 0.1 * i + 0.5 * j / n });
      }
      arcs.push(pts);
    }
    const ns = 5 + Math.floor(r() * 5);
    for (let i = 0; i < ns; i++) {
      const ang = -Math.PI + 0.25 + (i + r() * 0.7) / ns * (Math.PI - 0.5);
      const dist = reach * (0.25 + r() * 0.65), sz = H * (0.02 + r() * 0.035);
      const nv = 4 + Math.floor(r() * 2), v = [];
      for (let j = 0; j < nv; j++) {
        const a = j / nv * Math.PI * 2 + r() * 0.5, rr = sz * (0.55 + r() * 0.6);
        v.push([Math.cos(a) * rr * 1.2, Math.sin(a) * rr]);
      }
      const rx = ox + Math.cos(ang) * dist, ry = Math.min(oy - sz * 2, oy + Math.sin(ang) * dist);
      shards.push({ v, rx, ry, rot: (r() - 0.5) * 2, spin: (r() - 0.5) * 6, ph: r() * 6.28, sp: 0.15 + r() * 0.2, am: 2 + r() * 3 });
    }
    return { cracks, arcs, shards };
  }

  function stroke(ctx, pts, g) {
    if (g <= pts[0].f) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      if (g >= b.f) { ctx.lineTo(b.x, b.y); continue; }
      const k = (g - a.f) / (b.f - a.f);
      ctx.lineTo(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k);
      break;
    }
    ctx.stroke();
  }

  function at(pts, f) {
    for (let i = 1; i < pts.length; i++) {
      if (f <= pts[i].f) {
        const a = pts[i - 1], b = pts[i], k = clamp((f - a.f) / (b.f - a.f), 0, 1);
        return [a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k];
      }
    }
    const l = pts[pts.length - 1];
    return [l.x, l.y];
  }

  function draw(ctx, s, ox, oy, W, H, k) {
    if (!GLASS_ON) return;
    const t = G.secs("break") - 0.4;   // real seconds since the flash
    if (t < 0) return;
    k = k == null ? 1 : k;
    if (!geo || gW !== W || gH !== H) { geo = build(ox, oy, W, H); gW = W; gH = H; }
    const red = G.reduced, dr = red ? 0 : G.t;
    const u = red ? 1 : clamp(t / 0.85, 0, 1), g = 1 - (1 - u) * (1 - u);
    const ue = red ? 1 : clamp(t / 1.5, 0, 1), e = 1 - (1 - ue) * (1 - ue) * (1 - ue);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, oy);   // nothing below the horizon
    ctx.clip();
    ctx.lineJoin = "round";
    ctx.strokeStyle = CRACK;
    const cap = capBox(ctx, W, H);
    ctx.save();
    if (cap) {   // the cracks stop at the caption box
      ctx.beginPath();
      ctx.rect(0, 0, W, oy);
      ctx.rect(cap.x0, cap.y0, cap.x1 - cap.x0, cap.y1 - cap.y0);
      ctx.clip("evenodd");
    }
    ctx.globalAlpha = 0.8 * k;
    for (const c of geo.cracks) { ctx.lineWidth = c.main ? 2.2 : 1.3; stroke(ctx, c, g); }
    ctx.lineWidth = 1.3;
    ctx.globalAlpha = 0.6 * k;
    for (const c of geo.arcs) stroke(ctx, c, g);
    // a faint glint crawls along one crack at a time
    if (!red && g >= 1) {
      const per = 4.5, kp = dr / per, n = Math.floor(kp), ph = kp - n;
      const c = geo.cracks[(n * 5 + 2) % geo.cracks.length];
      const f = ph * 1.15;
      const a = at(c, f), b = at(c, Math.max(0, f - 0.07));
      ctx.globalAlpha = Math.sin(Math.PI * clamp(ph, 0, 1)) * k;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(a[0], a[1]); ctx.stroke();
    }
    ctx.restore();
    // shards
    const turn = red ? -1 : Math.floor(dr / 3.2) % geo.shards.length, tph = dr / 3.2 - Math.floor(dr / 3.2);
    for (let i = 0; i < geo.shards.length; i++) {
      const sh = geo.shards[i];
      const x = ox + (sh.rx - ox) * e + (red ? 0 : Math.sin(dr * sh.sp + sh.ph) * sh.am * ue);
      const y = oy + (sh.ry - oy) * e + (red ? 0 : Math.cos(dr * sh.sp * 0.8 + sh.ph) * sh.am * 0.6 * ue);
      const hit = i === turn ? Math.sin(Math.PI * clamp(tph / 0.3, 0, 1)) : 0;
      const sc = 0.4 + 0.6 * e;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(sh.rot + sh.spin * (1 - e) + (red ? 0 : dr * 0.02 * sh.spin));
      ctx.scale(sc * (1 - 0.4 * hit), sc);
      ctx.globalAlpha = 0.85 * k;
      ctx.fillStyle = BODY;
      ctx.beginPath();
      ctx.moveTo(sh.v[0][0], sh.v[0][1]);
      for (let j = 1; j < sh.v.length; j++) ctx.lineTo(sh.v[j][0], sh.v[j][1]);
      ctx.closePath(); ctx.fill();
      // left face: the leftmost two vertices and their inward neighbours
      let li = 0;
      for (let j = 1; j < sh.v.length; j++) if (sh.v[j][0] < sh.v[li][0]) li = j;
      const nx = sh.v[(li + 1) % sh.v.length], pv = sh.v[(li + sh.v.length - 1) % sh.v.length], lv = sh.v[li];
      ctx.fillStyle = hit > 0.05 ? CRACK : FACE;
      ctx.globalAlpha = (hit > 0.05 ? 0.35 + 0.6 * hit : 0.8) * k;
      ctx.beginPath();
      ctx.moveTo(lv[0], lv[1]);
      ctx.lineTo((lv[0] + nx[0]) / 2, (lv[1] + nx[1]) / 2);
      ctx.lineTo(0, 0);
      ctx.lineTo((lv[0] + pv[0]) / 2, (lv[1] + pv[1]) / 2);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // the caption (DOM text) in canvas px, or null
  function capBox(ctx, W, H) {
    const a = document.getElementById("genesis-tag"), b = document.getElementById("genesis-line"), cvs = ctx.canvas;
    if (!b || !cvs) return null;
    const cr = cvs.getBoundingClientRect(), r1 = (a || b).getBoundingClientRect(), r2 = b.getBoundingClientRect();
    if (cr.height <= 0 || r2.height <= 0) return null;
    const pad = 0.02 * H;
    return { y0: (r1.top - cr.top) / cr.height * H - pad, y1: (r2.bottom - cr.top) / cr.height * H + pad,
      x0: (Math.min(r1.left, r2.left) - cr.left) / cr.width * W - pad, x1: (Math.max(r1.right, r2.right) - cr.left) / cr.width * W + pad };
  }

  return { draw };
})();
