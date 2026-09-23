/* js/world/nephilim.js — the Nephilim, sprawled beside their beacon */
(function () {
  const { P, F, wx, onScreen, setA } = window.World;

  // The Void's peoples. x / oy is where each beacon was pinned in flight (NAV X / Y); `side` is how many radii left of the beacon the visual's centre sits so the beacon marks it rather than covering it.
  const NEPHILIM = { x: 45357, oy: 0.40, side: -2.9 };

  function nephRng(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let x = Math.imul(a ^ (a >>> 15), 1 | a);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  const NEPH_PAL = { lit: "#5a2230", shade: "#2a0c14", coreLit: "#6c2a38", coreShade: "#34111b", hole: "#080204" };

  const NEPH_LOBES = [[0, 0, 0.5], [-0.32, -0.22, 0.3], [0.3, -0.28, 0.32], [0.36, 0.2, 0.28], [-0.3, 0.26, 0.3], [0.02, 0.42, 0.26], [-0.05, -0.46, 0.24]];

  const NEPH_CELLS = [[-0.18, -0.12, 0.08], [0.08, -0.2, 0.07], [0.22, 0.02, 0.075], [-0.02, 0.12, 0.085], [-0.3, 0.14, 0.06], [0.3, -0.3, 0.055], [-0.28, -0.34, 0.05], [0.12, 0.34, 0.06], [0.4, 0.22, 0.05], [-0.1, -0.42, 0.045]];

  const NEPH_EYES = [0, 1, 2, 3, 4, 7];

  function buildNephArms() {
    const rnd = nephRng(7331);
    const arms = [];
    for (let i = 0; i < 18; i++) {
      const a0 = i / 18 * 6.283 + (rnd() - 0.5) * 0.25;
      const len = 2.2 + rnd() * 2.0;
      const w0 = 0.09 + rnd() * 0.05;
      const curl = (rnd() - 0.5) * 1.6;
      const sway = 0.25 + rnd() * 0.25;
      const phase = rnd() * 6.283;
      const nb = rnd() < 0.35 ? 0 : (rnd() < 0.7 ? 1 : 2);
      const branches = [];
      for (let b = 0; b < nb; b++) {
        branches.push({
          at: 0.3 + rnd() * 0.35,
          side: rnd() < 0.5 ? -1 : 1,
          len: 0.35 + rnd() * 0.3,
          curl: (rnd() - 0.5) * 2,
          phase: rnd() * 6.283
        });
      }
      const pods = rnd() < 0.5 ? [0.5 + rnd() * 0.3] : [];
      arms.push({ a0, len, w0, curl, sway, phase, branches, pods });
    }
    return arms;
  }
  const NEPH_ARMS = buildNephArms();

  function nephWalk(x, y, h0, len, w0, curl, sway, phase, n) {
    const { t } = F;
    const minW = Math.max(0.6, w0 * 0.04);
    const pts = [[x, y, w0 + minW, h0]];
    const step = len / n;
    let h = h0;
    for (let k = 1; k <= n; k++) {
      const f = k / n;
      h = h0 + curl * f + Math.sin(t * 0.5 + phase + f * 3.5) * sway * f;
      x += Math.cos(h) * step; y += Math.sin(h) * step;
      const hw = w0 * Math.pow(1 - f, 0.85) + minW;
      pts.push([x, y, hw, h]);
    }
    return pts;
  }

  function nephRibbon(path, pts) {
    const last = pts.length - 1;
    const norm = k => {
      const p0 = pts[Math.max(k - 1, 0)], p1 = pts[Math.min(k + 1, last)];
      const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
      const dl = Math.hypot(dx, dy) || 1;
      return [-dy / dl, dx / dl];
    };
    const n0 = norm(0);
    path.moveTo(pts[0][0] - n0[0] * pts[0][2], pts[0][1] - n0[1] * pts[0][2]);
    for (let k = 1; k <= last; k++) {
      const n = norm(k);
      path.lineTo(pts[k][0] - n[0] * pts[k][2], pts[k][1] - n[1] * pts[k][2]);
    }
    for (let k = last; k >= 0; k--) {
      const n = norm(k);
      path.lineTo(pts[k][0] + n[0] * pts[k][2], pts[k][1] + n[1] * pts[k][2]);
    }
    path.closePath();
  }

  function flatVolume(path, lit, shade, dx, dy) {
    const { ctx } = F;
    ctx.fillStyle = lit; ctx.fill(path);
    ctx.save(); ctx.clip(path); ctx.translate(dx, dy); ctx.fillStyle = shade; ctx.fill(path); ctx.restore();
  }

  function drawNephilim() {
    const { ctx, W, H, t } = F;
    const R = Math.min(W, H) * 0.16;
    const bx = wx(NEPHILIM.x, 0.94);
    const cx = bx + R * NEPHILIM.side;
    const cy = H * NEPHILIM.oy;
    if (!onScreen(cx, R * 4.8)) return;

    setA(1);
    const arms = new Path2D();
    const holes = new Path2D();
    const bases = [];

    const addPod = (x, y, r) => {
      arms.moveTo(x + r, y); arms.arc(x, y, r, 0, 6.283);
      holes.moveTo(x - r * 0.2 + r * 0.45, y - r * 0.1); holes.arc(x - r * 0.2, y - r * 0.1, r * 0.45, 0, 6.283);
    };

    for (let i = 0; i < 18; i++) {
      const A = NEPH_ARMS[i];
      const sx = cx + Math.cos(A.a0) * R * 0.35, sy = cy + Math.sin(A.a0) * R * 0.35;
      const pts = nephWalk(sx, sy, A.a0, A.len * R, A.w0 * R, A.curl, A.sway, A.phase, 22);
      nephRibbon(arms, pts);
      bases[i] = pts;

      for (const B of A.branches) {
        const kb = Math.round(B.at * 22);
        const P = pts[kb];
        const bp = nephWalk(P[0], P[1], P[3] + B.side * 0.7, A.len * R * (1 - B.at) * B.len, P[2] * 0.85, B.curl, A.sway, B.phase, 12);
        nephRibbon(arms, bp);
        addPod(P[0], P[1], P[2] * 1.7);
      }
      for (const f of A.pods) {
        const P = pts[Math.round(f * 22)];
        addPod(P[0], P[1], P[2] * 1.7);
      }
    }

    for (let i = 0; i < 18; i += 2) {
      const j = (i + 1) % 18;
      const p = bases[i][6], q = bases[j][7];
      const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      const ccx = mx + (cx - mx) * 0.25, ccy = my + (cy - my) * 0.25;
      const bridge = [];
      for (let s = 0; s <= 4; s++) {
        const u = s / 4;
        const iu = 1 - u;
        const x = iu * iu * p[0] + 2 * iu * u * ccx + u * u * q[0];
        const y = iu * iu * p[1] + 2 * iu * u * ccy + u * u * q[1];
        bridge.push([x, y, R * 0.016]);
      }
      nephRibbon(arms, bridge);
    }

    flatVolume(arms, NEPH_PAL.lit, NEPH_PAL.shade, R * 0.06, R * 0.03);
    ctx.fillStyle = NEPH_PAL.hole; ctx.fill(holes);

    const core = new Path2D();
    for (let li = 0; li < NEPH_LOBES.length; li++) {
      const [dx, dy, r] = NEPH_LOBES[li];
      const rr = r * R * (1 + 0.03 * Math.sin(t * 0.9 + li));
      core.moveTo(cx + dx * R + rr, cy + dy * R);
      core.arc(cx + dx * R, cy + dy * R, rr, 0, 6.283);
    }
    flatVolume(core, NEPH_PAL.coreLit, NEPH_PAL.coreShade, R * 0.18, R * 0.09);

    const cells = new Path2D();
    for (const [dx, dy, r] of NEPH_CELLS) {
      const hx = cx + dx * R, hy = cy + dy * R;
      for (let v = 0; v < 6; v++) {
        const a = v / 6 * 6.283 + 0.5;
        const px = hx + Math.cos(a) * r * R, py = hy + Math.sin(a) * r * R;
        if (v === 0) cells.moveTo(px, py); else cells.lineTo(px, py);
      }
      cells.closePath();
    }
    ctx.fillStyle = NEPH_PAL.hole; ctx.fill(cells);

    for (let j = 0; j < NEPH_EYES.length; j++) {
      const c = NEPH_CELLS[NEPH_EYES[j]];
      const ex = cx + c[0] * R, ey = cy + c[1] * R;
      setA(0.4 + 0.4 * Math.max(0, Math.sin(t * 0.7 + j * 2.1)));
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, R * 0.16);
      g.addColorStop(0, "rgba(255,120,90,0.5)");
      g.addColorStop(1, "rgba(255,120,90,0)");
      ctx.fillStyle = g;
      ctx.fillRect(ex - R * 0.16, ey - R * 0.16, R * 0.32, R * 0.32);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(255,230,210,0.9)";
      ctx.beginPath(); ctx.arc(ex, ey, R * 0.03, 0, 6.283); ctx.fill();
    }

    setA(1); ctx.globalCompositeOperation = "source-over"; ctx.lineWidth = 1;
  }

  P.drawNephilim = drawNephilim;
})();
