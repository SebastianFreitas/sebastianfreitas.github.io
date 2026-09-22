/* paint.js — flat-art canvas primitives shared by every painter
   (landart.js, rexart-surface.js, rexart-deep.js, world.js, genesis.js).
   Light comes from the left: `litShade` fills a shape lit, then clips the
   same shape and floods everything right of xSplit with the shade colour,
   so shadows are hard flat cuts, never gradients. */
window.Paint = (function () {
  function poly(g, pts) {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
  }
  function line(g, pts, color, w) {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.strokeStyle = color;
    g.lineWidth = w;
    g.stroke();
  }
  function rect(g, x0, y0, x1, y1, fill) {
    g.fillStyle = fill;
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  function circle(g, x, y, r, fill) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = fill;
    g.fill();
  }
  function lin(g, x0, y0, x1, y1, stops) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    for (const [offset, color] of stops) gr.addColorStop(offset, color);
    return gr;
  }
  function rad(g, x, y, r0, r1, stops) {
    const gr = g.createRadialGradient(x, y, r0, x, y, r1);
    for (const [offset, color] of stops) gr.addColorStop(offset, color);
    return gr;
  }
  // fill lit, then clip to the shape and fill the hard shadow for x >= xSplit
  function litShade(g, trace, xSplit, lit, shade) {
    trace(); g.fillStyle = lit; g.fill();
    g.save(); trace(); g.clip();
    g.fillStyle = shade; g.fillRect(xSplit, -1e5, 2e5, 2e5);
    g.restore();
  }
  // gives a flat shape a hard shadow that follows its outline, lit from (dx, dy)
  function offsetShade(g, trace, dx, dy, lit, shade) {
    trace(); g.fillStyle = shade; g.fill();
    g.save(); trace(); g.clip();
    g.translate(dx, dy); trace(); g.fillStyle = lit; g.fill();
    g.restore();
  }
  /* battlement merlons centred on [x0, x1]; each is flat lit, or shade when its centre
     is at/past xSplit (xSplit or shade omitted => all lit). With `ledge`, a lit merlon
     also gets a shade band across its bottom 35% (the deep-cavern look). */
  function merlons(g, x0, x1, yTop, mw, mh, gap, lit, shade, xSplit, ledge) {
    const n = Math.max(1, Math.floor((x1 - x0 + gap) / (mw + gap)));
    const span = n * mw + (n - 1) * gap;
    const start = x0 + (x1 - x0 - span) / 2;
    for (let i = 0; i < n; i++) {
      const mx = start + i * (mw + gap);
      const useShade = shade !== undefined && xSplit !== undefined && (mx + mw / 2) >= xSplit;
      g.fillStyle = useShade ? shade : lit;
      g.fillRect(mx, yTop - mh, mw, mh);
      if (ledge && !useShade) { g.fillStyle = shade; g.fillRect(mx, yTop - 0.35 * mh, mw, 0.35 * mh); }
    }
  }
  /* a terrain mass lit from the left: the whole path in lit, then a copy shifted
     by (dx, dy) in shade, clipped to the path, leaving a hard lit cap on left-facing slopes */
  function fillRidge(g, path, lit, shade, dx, dy) {
    g.fillStyle = lit; g.fill(path);
    g.save();
    g.clip(path);
    g.translate(dx, dy);
    g.fillStyle = shade;
    g.fill(path);
    g.restore();
  }
  return { poly, line, rect, circle, lin, rad, litShade, offsetShade, merlons, fillRidge };
})();
