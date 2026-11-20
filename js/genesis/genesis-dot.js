window.GenDot = (function () {
  "use strict";

  function hash(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function lerp(a, b, k) { return a + (b - a) * k; }

  function reachLevel(t) {
    if (t < 2.0) return 0;
    if (t < 2.7) return 0.25;
    if (t < 3.4) return 0.5;
    if (t < 4.1) return 0.75;
    return 1.0;
  }

  function draw(ctx, W, H, t, reduced) {
    if (reduced) t = 99;
    if (t < 0) t = 0;
    if (!W || !H) return;

    const m = Math.min(W, H);
    const reach = reachLevel(t);

    // backdrop: giant Rex with his right arm reaching for Obrokxus
    if (window.GenRexIn) {
      try { GenRexIn.draw(ctx, W, H, 99, reduced, reach); } catch (e) {}
    } else {
      ctx.fillStyle = "#2a0a10";
      ctx.fillRect(0, 0, W, H);
    }

    const S0x = 0.84 * W, S0y = 0.70 * H;
    const Ex = 0.955 * W, Ey = 0.44 * H;

    // the corrupted ring Obrokxus slips out of
    if (t >= 0.6) {
      ctx.lineWidth = 0.008 * m;
      ctx.strokeStyle = "#e04848";
      ctx.beginPath();
      ctx.arc(S0x, S0y, 0.03 * m, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (t < 1.2) {
      // Obrokxus still inside the ring
      if (t >= 0.6) {
        ctx.fillStyle = "#f6c2b8";
        ctx.beginPath();
        ctx.arc(S0x, S0y, 0.4 * 0.03 * m, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    const k = Math.min(12, Math.floor((t - 1.2) / 0.35) + 1);
    let x = lerp(S0x, Ex, k / 12);
    let y = lerp(S0y, Ey, k / 12);
    if (k < 12) {
      x += (hash(k * 3 + 1) - 0.5) * 0.01 * m;
      y += (hash(k * 3 + 2) - 0.5) * 0.01 * m;
    }

    const r = 0.012 * m;

    // the dot: red, lit from the left with a hard shade on the right
    ctx.fillStyle = "#e04848";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#a02a2e";
    ctx.beginPath();
    ctx.arc(x + 0.35 * r, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#f6c2b8";
    ctx.beginPath();
    ctx.arc(x - 0.3 * r, y - 0.2 * r, 0.4 * r, 0, Math.PI * 2);
    ctx.fill();

    // caught in Rex's sight: a held ring round the dot, from t = 4.1
    if (t >= 4.1) {
      ctx.lineWidth = 0.005 * m;
      ctx.strokeStyle = "#f6c2b8";
      ctx.beginPath();
      ctx.arc(x, y, 0.02 * m, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  return { draw };
})();
