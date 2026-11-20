/* genesis-gods-beat.js — the "gods" beat: the close view on Rex's dead
   fist (the "death" beat, held) opens onto the live outdoor scene behind
   it. An octagonal hole grows from the tear's centre in four held steps,
   letting the world underneath show through; the death frame stays flat
   over what the hole has not yet reached. No fades, hard edge only. */
window.GenGodsBeat = (function () {
  "use strict";

  function draw(ctx, W, H, t, reduced) {
    if (!W || !H || !window.GenDeath || !window.GenClash) return;
    if (reduced) return;
    if (t < 0) t = 0;
    if (t >= 1.2) return;

    const g = GenClash.geom(W, H);
    const steps = [0.2, 0.5, 0.8, 1.1];
    let n = 0;
    for (let i = 0; i < steps.length; i++) if (t >= steps[i]) n++;
    const R = [0, 0.22, 0.45, 0.8, 1.5][n] * Math.max(W, H);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    if (R > 0) {
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI / 4) * i;
        const x = g.cx + R * Math.cos(a);
        const y = g.cy + R * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
    ctx.clip("evenodd");
    GenDeath.draw(ctx, W, H, 99, true);
    ctx.restore();
  }

  return { draw };
})();
