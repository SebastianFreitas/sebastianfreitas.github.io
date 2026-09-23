/* ===========================================================
   FIRSTLIGHT — the Kingdom of First Light.

   Every painter works in "art units": the origin is the anchor,
   the base centre where the building meets the ground, +x runs
   right and +y runs DOWN (so heights are negative y). `paint`
   draws the static sprite once into an offscreen canvas; `under`
   and `live` are called every frame, before and after that
   sprite is copied onto the main canvas, in the same unit space.
   =========================================================== */

(function () {
  const RexArt = window.RexArt = window.RexArt || {};

  const { lin, rad, rect, poly, line, litShade, merlons } = Paint;
  const { archWin, cutFoot } = RexKit;

  /* ================= KINGDOM OF FIRST LIGHT ================= */

  const FL = { lit: "#e6e4df", shade: "#a3a6ab", roof: "#8a93a0", roofShade: "#5b6370", hole: "#2a2e35", glow: "#f3c969", flag: "#e8c24a" };

  function paintFirstLight(g, px) {
    const gatePath = () => {
      g.beginPath();
      g.moveTo(-1, 2);
      g.lineTo(-1, -2.8);
      g.arc(0, -2.8, 1, Math.PI, 2 * Math.PI);
      g.lineTo(1, 2);
      g.closePath();
    };

    // 1. Lantern tower
    litShade(g, () => { g.beginPath(); g.rect(-1.1, -25.2, 2.2, 27.2); }, 0.33, FL.lit, FL.shade);
    archWin(g, 0, -24.75, 1.1, 1.95);
    g.fillStyle = FL.glow;
    g.fill();
    litShade(g, () => { g.beginPath(); g.rect(-1.45, -25.6, 2.9, 0.4); }, 0.435, FL.lit, FL.shade);
    poly(g, [[-1.45, -25.6], [0, -30], [0, -25.6]]);
    g.fillStyle = FL.roof;
    g.fill();
    poly(g, [[0, -25.6], [0, -30], [1.45, -25.6]]);
    g.fillStyle = FL.roofShade;
    g.fill();
    g.beginPath();
    g.arc(0, -30.2, 0.22, 0, 2 * Math.PI);
    g.fillStyle = FL.glow;
    g.fill();

    // 2. Keep
    rect(g, -4, -19.5, 2.2, 2, FL.lit);
    rect(g, 2.2, -19.5, 4, 2, FL.shade);
    merlons(g, -4, 2.2, -19.5, 0.7, 0.8, 0.55, FL.lit);
    merlons(g, 2.2, 4, -19.5, 0.7, 0.8, 0.55, FL.shade);

    for (const cx of [-2.9, -1.35, 0.2]) {
      archWin(g, cx, -16.8, 0.45, 1.2);
      g.fillStyle = FL.glow;
      g.fill();
    }
    for (const cx of [-2.1, -0.6]) {
      archWin(g, cx, -15.0, 0.45, 1.0);
      g.fillStyle = FL.glow;
      g.fill();
    }

    archWin(g, 3.1, -16.8, 0.3, 1.2);
    g.fillStyle = FL.glow;
    g.fill();

    rect(g, -4.7, -17.5, 4.7, -17.25, FL.shade);

    litShade(g, () => { g.beginPath(); g.rect(-4.7, -21.5, 1.6, 4); }, -3.66, FL.lit, FL.shade);
    litShade(g, () => { g.beginPath(); g.rect(3.1, -21.5, 1.6, 4); }, 4.14, FL.lit, FL.shade);

    poly(g, [[-4.95, -21.5], [-3.9, -23.8], [-3.9, -21.5]]);
    g.fillStyle = FL.roof;
    g.fill();
    poly(g, [[-3.9, -21.5], [-3.9, -23.8], [-2.85, -21.5]]);
    g.fillStyle = FL.roofShade;
    g.fill();
    poly(g, [[2.85, -21.5], [3.9, -23.8], [3.9, -21.5]]);
    g.fillStyle = FL.roof;
    g.fill();
    poly(g, [[3.9, -21.5], [3.9, -23.8], [4.95, -21.5]]);
    g.fillStyle = FL.roofShade;
    g.fill();

    // 3. Inner wall
    litShade(g, () => { g.beginPath(); g.rect(-9.5, -13, 19, 15); }, 2.85, FL.lit, FL.shade);
    merlons(g, -9.5, 9.5, -13, 0.6, 0.7, 0.5, FL.lit, FL.shade, 2.85);

    litShade(g, () => { g.beginPath(); g.rect(-10.7, -15.6, 2.4, 17.6); }, -9.14, FL.lit, FL.shade);
    litShade(g, () => { g.beginPath(); g.rect(8.3, -15.6, 2.4, 17.6); }, 9.86, FL.lit, FL.shade);
    merlons(g, -10.7, -8.3, -15.6, 0.55, 0.7, 0.45, FL.lit, FL.shade, -9.14);
    merlons(g, 8.3, 10.7, -15.6, 0.55, 0.7, 0.45, FL.lit, FL.shade, 9.86);

    rect(g, -10.7, -10.5, 10.7, -6, FL.shade);

    // 4. Houses
    const houses = [
      [-11.3, 1.8, -9.0, -10.5],
      [-9.2, 2.2, -9.5, -11.2],
      [-4.8, 1.6, -8.8, -10.1],
      [4.9, 1.8, -9.2, -10.6],
      [9.0, 2.4, -9.8, -11.5],
      [11.4, 1.7, -8.9, -10.3]
    ];
    for (const [x, w, wallTop, apex] of houses) {
      rect(g, x - w / 2, wallTop, x - w / 2 + 0.65 * w, -6, FL.lit);
      rect(g, x - w / 2 + 0.65 * w, wallTop, x + w / 2, -6, FL.shade);
      poly(g, [[x - w / 2 - 0.15, wallTop], [x, apex], [x, wallTop]]);
      g.fillStyle = FL.roof;
      g.fill();
      poly(g, [[x, wallTop], [x, apex], [x + w / 2 + 0.15, wallTop]]);
      g.fillStyle = FL.roofShade;
      g.fill();
      rect(g, x - 0.175, wallTop + 0.35, x - 0.175 + 0.35, wallTop + 0.35 + 0.5, FL.glow);
    }

    // 5. Outer curtain wall
    litShade(g, () => { g.beginPath(); g.rect(-13, -8, 26, 10); }, 3.9, FL.lit, FL.shade);
    rect(g, -13, -8, 13, -7.8, FL.shade);
    merlons(g, -13, 13, -8, 0.6, 0.7, 0.5, FL.lit, FL.shade, 3.9);
    for (const cx of [-9.8, -4.6, 4.6, 9.8]) {
      rect(g, cx - 0.075, -5.6, cx + 0.075, -4.8, "#4a545b");
    }

    // 6. Intermediate towers
    for (const c of [-7, 7]) {
      rect(g, c - 1.2, -10.2, c + 0.48, 2, FL.lit);
      rect(g, c + 0.48, -10.2, c + 1.2, 2, FL.shade);
      merlons(g, c - 1.2, c + 1.2, -10.2, 0.55, 0.7, 0.45, FL.lit, FL.shade, c + 0.48);
      rect(g, c - 0.4, -8.4, c - 0.4 + 0.25, -8.4 + 0.8, FL.glow);
    }

    // 7. Corner towers
    for (const c of [-13, 13]) {
      litShade(g, () => { g.beginPath(); g.rect(c - 1.7, -10.8, 3.4, 12.8); }, c + 0.51, FL.lit, FL.shade);
      litShade(g, () => { g.beginPath(); g.rect(c - 1.95, -12, 3.9, 1.2); }, c + 0.585, FL.lit, FL.shade);
      rect(g, c - 1.95, -10.8, c + 1.95, -10.62, FL.shade);
      merlons(g, c - 1.95, c + 1.95, -12, 0.55, 0.7, 0.45, FL.lit, FL.shade, c + 0.585);
      rect(g, c - 0.15, -8.2, c - 0.15 + 0.3, -8.2 + 0.9, FL.glow);
    }

    // 8. Gate towers
    for (const c of [-2.1, 2.1]) {
      litShade(g, () => { g.beginPath(); g.rect(c - 1.1, -11.2, 2.2, 13.2); }, c + 0.33, FL.lit, FL.shade);
      merlons(g, c - 1.1, c + 1.1, -11.2, 0.5, 0.65, 0.4, FL.lit, FL.shade, c + 0.33);
    }

    gatePath();
    g.fillStyle = FL.hole;
    g.fill();
    g.save();
    gatePath();
    g.clip();
    g.beginPath();
    for (const x of [-0.5, 0, 0.5]) {
      g.moveTo(x, -3.8);
      g.lineTo(x, 2);
    }
    for (const y of [-1, -2]) {
      g.moveTo(-1, y);
      g.lineTo(1, y);
    }
    g.strokeStyle = FL.shade;
    g.lineWidth = px;
    g.stroke();
    g.restore();

    // 9. Foot cut
    cutFoot(g, -16, 16, 0.5);
  }

  function underFirstLight(g, px, t, a) {
    const k = 0.75 + 0.25 * Math.sin(t * 0.5);
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = a * k;
    poly(g, [[-0.6, -23.6], [0.6, -23.6], [2.6, -70], [-2.6, -70]]);
    g.fillStyle = lin(g, 0, -23.6, 0, -70, [[0, "rgba(255,244,214,0.06)"], [1, "rgba(255,244,214,0)"]]);
    g.fill();
    g.globalCompositeOperation = "source-over";

    const rr = 18 * (1 + 0.03 * Math.sin(t * 0.7));
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = a;
    g.fillStyle = rad(g, 0, -23.6, 0, rr, [[0, "rgba(255,244,214,0.22)"], [0.3, "rgba(255,236,190,0.07)"], [1, "rgba(255,236,190,0)"]]);
    g.fillRect(-rr, -23.6 - rr, 2 * rr, 2 * rr);
    g.globalCompositeOperation = "source-over";
  }

  function liveFirstLight(g, px, t, a) {
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = a * (0.85 + 0.15 * Math.sin(t * 2.3));
    g.fillStyle = rad(g, 0, -23.6, 0, 1.6, [[0, "rgba(255,246,220,0.55)"], [1, "rgba(255,246,220,0)"]]);
    g.fillRect(-1.6, -25.2, 3.2, 3.2);
    g.globalCompositeOperation = "source-over";

    g.globalAlpha = a;
    g.beginPath();
    g.arc(0, -23.7, 0.32, 0, 2 * Math.PI);
    g.fillStyle = "#fffaf0";
    g.fill();

    g.globalAlpha = a;
    line(g, [[0, -30.4], [0, -32.4]], "rgba(230,230,220,0.8)", px * 1.2);

    const s1 = Math.sin(t * 3 - 0.9);
    const s2 = Math.sin(t * 3 - 1.8);
    const s3 = Math.sin(t * 3 - 2.7);
    g.globalAlpha = a * 0.9;
    poly(g, [[0, -32.4], [0.8, -32.3 + 0.15 * s1], [1.6, -32.2 + 0.2 * s2], [2.4, -31.95 + 0.25 * s3], [1.6, -31.7 + 0.2 * s2], [0.8, -31.5 + 0.15 * s1], [0, -31.4]]);
    g.fillStyle = FL.flag;
    g.fill();
  }

  RexArt.firstlight = { box: [-16, -34, 16, 2], paint: paintFirstLight, under: underFirstLight, live: liveFirstLight };
})();
