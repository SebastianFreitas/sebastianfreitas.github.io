/* genesis-eye.js — the "eye" beat: a tier-3 eye, never whole: a lidless
   arc cut by the frame edge. It shows only through what happens to the
   dots: no beam, no line, no visible wave. Held steps only. */
window.GenEye = (function () {
  "use strict";

  const PAL = {
    arc: "#120407",
    iris: "#1c060a",
    dust: "#5a4a4c",
    dustShade: "#3e3234",
    chip: "#d8707a",
    chipShade: "#9a3a44",
    floor: 0.84,
  };

  function hash(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function draw(ctx, W, H, t, reduced) {
    if (!W || !H || !window.GenSoup) return;
    if (t < 0) t = 0;

    const m = Math.min(W, H);
    GenSoup.drawBackdrop(ctx, W, H);
    const dots = GenSoup.finalReds(W, H);

    /* the eye: a lidless arc, only a sliver ever in frame */
    const E = { x: W * 1.05, y: -H * 0.35 };
    const R = H * 0.78;
    const s = t < 0.6 ? 0 : t < 1.0 ? 1 : t < 1.4 ? 2 : 3;
    const th = [0, 0.035, 0.07, 0.11][s] * H;

    if (s > 0) {
      ctx.fillStyle = PAL.arc;
      ctx.beginPath();
      ctx.arc(E.x, E.y, R, 0, Math.PI * 2);
      ctx.arc(E.x - th * 0.7, E.y - th * 0.7, R, 0, Math.PI * 2);
      ctx.fill("evenodd");
    }

    if (t >= 1.6) {
      ctx.fillStyle = PAL.iris;
      ctx.beginPath();
      ctx.arc(E.x, E.y, R - th * 0.35, 0, Math.PI * 2);
      ctx.arc(E.x - th * 0.45, E.y - th * 0.45, R - th * 0.35, 0, Math.PI * 2);
      ctx.fill("evenodd");
    }

    /* dust timing: nearest dots to the eye turn first */
    let maxD = 0;
    const dists = new Array(dots.length);
    for (let i = 0; i < dots.length; i++) {
      const dx = dots[i].x - E.x, dy = dots[i].y - E.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      dists[i] = d;
      if (d > maxD) maxD = d;
    }

    const P = { x: W * 0.30, y: H * 0.24 };
    let pr = 0;
    if (t >= 5.05) {
      const ps = Math.min(3, Math.floor((t - 5.05) / 0.45));
      pr = m * [0.012, 0.02, 0.028, 0.034][ps];
    }

    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      const x = dot.x, y = dot.y, r = dot.r;
      const ws = Math.min(4, Math.floor((dists[i] / maxD) * 5));
      const td = 2.0 + ws * 0.4;

      if (t < td) {
        GenSoup.shaded(ctx, x, y, r, GenSoup.PAL.rose, GenSoup.PAL.mid, m);
        continue;
      }

      const u = t - td;

      /* grey dust dot falls in held steps */
      const fs = Math.min(6, Math.floor(u / 0.3));
      const gy = Math.min(H * PAL.floor, y + fs * m * 0.03);
      GenSoup.shaded(ctx, x, gy, r * 0.8, PAL.dust, PAL.dustShade, m);

      /* colour chip rises, then gathers into the pool */
      const rs = Math.min(4, Math.floor(u / 0.3));
      const cx0 = x;
      const cy0 = y - r - rs * m * 0.02;

      let f = 0;
      if (t >= 4.6) {
        const ps = Math.min(4, 1 + Math.floor((t - 4.6) / 0.45));
        f = ps / 4;
      }

      if (f === 1) continue;

      const riseCy = y - r - 4 * m * 0.02;
      const cx = cx0 + (P.x - cx0) * f;
      const cy = riseCy + (P.y - riseCy) * f;
      const c = Math.max(2, r * 0.9);

      ctx.fillStyle = PAL.chip;
      ctx.fillRect(cx - c / 2, cy - c / 2, c, c);
      ctx.fillStyle = PAL.chipShade;
      ctx.fillRect(cx - c / 2 + c * 0.4, cy - c / 2, c * 0.6, c);
    }

    if (t >= 5.05) {
      GenSoup.shaded(ctx, P.x, P.y, pr, PAL.chip, PAL.chipShade, m);
    }
  }

  return { draw };
})();
