/* js/world/art/land-kit.js — shared helpers for the Mainland faction painters */
(function () {
  "use strict";

  const { poly, litShade } = Paint;

  // A ledge/cornice band from y (bottom) to y - h, spanning cx-hw..cx+hw.
  function band(g, cx, hw, y, h, pal) {
    const xSplit = cx + 0.3 * hw;
    litShade(g, () => poly(g, [[cx - hw, y], [cx + hw, y], [cx + hw, y - h], [cx - hw, y - h]]), xSplit, pal.lit, pal.shade);

    poly(g, [[cx - hw, y], [cx + hw, y], [cx + hw, y - 0.35 * h], [cx - hw, y - 0.35 * h]]);
    g.fillStyle = pal.shade;
    g.fill();
  }

  // A round-topped opening: rect plus semicircle cap.
  function arch(g, cx, yb, w, h, colour) {
    const r = w / 2;
    const yShoulder = yb - h + r;
    g.beginPath();
    g.moveTo(cx - r, yb);
    g.lineTo(cx - r, yShoulder);
    g.arc(cx, yShoulder, r, Math.PI, 0, false);
    g.lineTo(cx + r, yb);
    g.closePath();
    g.fillStyle = colour;
    g.fill();
  }

  function litRect(g, x0, y0, x1, y1, lit, shade) {
    litShade(g, () => poly(g, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]), x0 + 0.65 * (x1 - x0), lit, shade);
  }

  window.LandKit = { band, arch, litRect };
})();
