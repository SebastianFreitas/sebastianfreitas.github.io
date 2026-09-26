/* genesis-soup.js — the "soup" beat: inside the flesh womb, a primordial
   soup of dots, mostly red, some blue; red eats the blue in held steps.
   Flat fills only, light from the left, no gradients, no smooth motion. */
window.GenSoup = (function () {
  "use strict";

  const PAL = {
    deep: "#2a0a10",
    wall: "#4a141c",
    mid: "#6b2029",
    lit: "#8e3037",
    rose: "#b8525a",
    blue: "#3f6f9a",
    blueLit: "#7fb0d6",
  };

  const N_RED = 90;
  const N_BLUE = 14;

  function hash(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  let cacheKey = "";
  let reds = [];
  let blues = [];

  function build(W, H) {
    const m = Math.min(W, H);
    reds = [];
    blues = [];
    for (let i = 0; i < N_RED; i++) {
      const x = (0.12 + hash(i * 3 + 1) * 0.76) * W;
      const y = (0.18 + hash(i * 3 + 2) * 0.64) * H;
      const r = m * (0.006 + hash(i * 3 + 3) * 0.008);
      reds.push({ x, y, r, r0: r, eats: 0 });
    }
    for (let j = 0; j < N_BLUE; j++) {
      const i = N_RED + j;
      const x = (0.12 + hash(i * 3 + 1) * 0.76) * W;
      const y = (0.18 + hash(i * 3 + 2) * 0.64) * H;
      const r = m * (0.006 + hash(i * 3 + 3) * 0.008);
      /* nearest red dot is this blue dot's eater */
      let best = 0, bestD = Infinity;
      for (let k = 0; k < reds.length; k++) {
        const dx = reds[k].x - x, dy = reds[k].y - y;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = k; }
      }
      blues.push({ x, y, r, eater: best, te: 1.2 + j * (4.6 / N_BLUE) });
    }
  }

  function drawShaded(ctx, x, y, r, fill, shade, m) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(x + r * 0.35, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function ensure(W, H) {
    const key = W + "x" + H;
    if (key !== cacheKey) {
      cacheKey = key;
      build(W, H);
    }
  }

  function drawBackdrop(ctx, W, H) {
    /* backdrop: stacked flesh bands, lit from the left */
    ctx.fillStyle = PAL.deep;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = PAL.wall;
    ctx.beginPath();
    ctx.ellipse(W * 0.5, H * 0.5, W * 0.62, H * 0.60, 0, 0, Math.PI * 2);
    ctx.fill();

    const midCx = W * 0.46, midCy = H * 0.50, midRx = W * 0.46, midRy = H * 0.44;
    ctx.fillStyle = PAL.mid;
    ctx.beginPath();
    ctx.ellipse(midCx, midCy, midRx, midRy, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(midCx, midCy, midRx, midRy, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = PAL.lit;
    ctx.beginPath();
    ctx.ellipse(midCx - midRx * 0.62, midCy, midRx * 0.50, midRy * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function finalReds(W, H) {
    ensure(W, H);
    const m = Math.min(W, H);
    const k = 12;
    const out = [];
    for (let i = 0; i < reds.length; i++) {
      const d = reds[i];
      const x = d.x + (hash(i * 7 + k) - 0.5) * m * 0.012;
      const y = d.y + (hash(i * 7 + k + 1000) - 0.5) * m * 0.012;
      let eats = 0;
      for (let j = 0; j < blues.length; j++) {
        if (blues[j].eater === i) eats++;
      }
      const r = d.r0 * Math.pow(1.25, eats);
      out.push({ x, y, r });
    }
    return out;
  }

  function draw(ctx, W, H, t, reduced) {
    if (!W || !H) return;
    if (t < 0) t = 0;

    const m = Math.min(W, H);
    ensure(W, H);

    drawBackdrop(ctx, W, H);

    /* drift: held steps, a new pose every 0.5 s (frozen past t=6 or reduced) */
    const tDrift = Math.min(t, 6.0);
    const k = reduced ? 0 : Math.floor(tDrift * 2);

    /* reset per-frame red state derived from eating (radius grows once per
       eat, position snaps once before the eat lands) */
    for (let ri = 0; ri < reds.length; ri++) reds[ri].r = reds[ri].r0;

    const eaterGrows = new Array(reds.length).fill(0);
    const eaterSnap = new Array(reds.length).fill(null);
    const blueGone = new Array(blues.length).fill(false);

    for (let j = 0; j < blues.length; j++) {
      const b = blues[j];
      const e = reds[b.eater];
      if (t >= b.te) {
        blueGone[j] = true;
        eaterGrows[b.eater]++;
      } else if (t >= b.te - 0.5) {
        eaterSnap[b.eater] = {
          x: b.x + (b.r + e.r0) * 0.6 * -1,
          y: b.y,
        };
      }
    }

    for (let ri = 0; ri < reds.length; ri++) {
      if (eaterGrows[ri] > 0) reds[ri].r = reds[ri].r0 * Math.pow(1.25, eaterGrows[ri]);
    }

    /* draw reds */
    for (let i = 0; i < reds.length; i++) {
      const d = reds[i];
      const ox = (hash(i * 7 + k) - 0.5) * m * 0.012;
      const oy = (hash(i * 7 + k + 1000) - 0.5) * m * 0.012;
      let x = d.x + ox, y = d.y + oy;
      if (eaterSnap[i]) { x = eaterSnap[i].x; y = eaterSnap[i].y; }
      drawShaded(ctx, x, y, d.r, PAL.rose, PAL.mid, m);
    }

    /* draw remaining blues */
    for (let j = 0; j < blues.length; j++) {
      if (blueGone[j]) continue;
      const b = blues[j];
      const i = reds.length + j;
      const ox = (hash(i * 7 + k) - 0.5) * m * 0.012;
      const oy = (hash(i * 7 + k + 1000) - 0.5) * m * 0.012;
      drawShaded(ctx, b.x + ox, b.y + oy, b.r, PAL.blueLit, PAL.blue, m);
    }
  }

  return { draw, drawBackdrop, finalReds, shaded: drawShaded, PAL };
})();
