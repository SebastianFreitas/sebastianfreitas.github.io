/* ===========================================================
   REXART SURFACE — the illustrated landmarks of the Rex map's
   surface: the Kingdom of First Light, the Crimson Court and
   the Bone Spire.

   Every painter works in "art units": the origin is the anchor,
   the base centre where the building meets the ground, +x runs
   right and +y runs DOWN (so heights are negative y). `paint`
   draws the static sprite once into an offscreen canvas; `under`
   and `live` are called every frame, before and after that
   sprite is copied onto the main canvas, in the same unit space.
   =========================================================== */

(function () {
  const RexArt = window.RexArt = window.RexArt || {};

  /* ---------------- shared drawing helpers ---------------- */

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

  function rect(g, x0, y0, x1, y1, fill) {
    g.fillStyle = fill;
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
  }

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

  function courses(g, x0, y0, x1, y1, rowH, brickW, color, px) {
    g.save();
    g.beginPath();
    g.rect(x0, y0, x1 - x0, y1 - y0);
    g.clip();
    g.beginPath();
    let r = 0;
    let y = y0 + (r + 1) * rowH;
    while (y < y1) {
      g.moveTo(x0, y);
      g.lineTo(x1, y);
      const jointBase = x0 + (r % 2) * brickW / 2;
      let k = 0;
      let x = jointBase;
      while (x < x1) {
        g.moveTo(x, y - rowH);
        g.lineTo(x, y);
        k++;
        x = jointBase + k * brickW;
      }
      r++;
      y = y0 + (r + 1) * rowH;
    }
    g.strokeStyle = color;
    g.lineWidth = px;
    g.stroke();
    g.restore();
  }

  function merlons(g, x0, x1, yTop, mw, mh, gap, fill) {
    const n = Math.max(1, Math.floor((x1 - x0 + gap) / (mw + gap)));
    const span = n * mw + (n - 1) * gap;
    const start = x0 + (x1 - x0 - span) / 2;
    g.fillStyle = fill;
    for (let i = 0; i < n; i++) {
      g.fillRect(start + i * (mw + gap), yTop - mh, mw, mh);
    }
  }

  function rimTL(g, x0, y0, x1, y1, color, px) {
    line(g, [[x0, y1], [x0, y0], [x1, y0]], color, px);
  }

  function archWin(g, cx, yTop, w, h) {
    g.beginPath();
    g.moveTo(cx - w / 2, yTop + h);
    g.lineTo(cx - w / 2, yTop + w / 2);
    g.arc(cx, yTop + w / 2, w / 2, Math.PI, 2 * Math.PI);
    g.lineTo(cx + w / 2, yTop + h);
    g.closePath();
  }

  function lancet(g, cx, w, yBottom, ySpring, yApex) {
    const q = ySpring + (yApex - ySpring) * 0.75;
    g.beginPath();
    g.moveTo(cx - w / 2, yBottom);
    g.lineTo(cx - w / 2, ySpring);
    g.quadraticCurveTo(cx - w / 2, q, cx, yApex);
    g.quadraticCurveTo(cx + w / 2, q, cx + w / 2, ySpring);
    g.lineTo(cx + w / 2, yBottom);
    g.closePath();
  }

  function fadeFoot(g, x0, x1, yFrom, yTo) {
    g.save();
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = lin(g, 0, yFrom, 0, yTo, [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,1)"]]);
    g.fillRect(x0, yFrom, x1 - x0, yTo - yFrom + 50);
    g.restore();
  }

  function haze(g, cx, cy, rx, ry, rgb, a0) {
    g.save();
    g.translate(cx, cy);
    g.scale(rx, ry);
    g.fillStyle = rad(g, 0, 0, 0, 1, [[0, `rgba(${rgb},${a0})`], [1, `rgba(${rgb},0)`]]);
    g.fillRect(-1, -1, 2, 2);
    g.restore();
  }

  // paint-only: tints only what is already painted, never call from under/live
  function light(g, grad, x0, y0, x1, y1) {
    g.save();
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = grad;
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
    g.restore();
  }

  /* ================= KINGDOM OF FIRST LIGHT ================= */

  const FL = { lit: "#eeede6", mid: "#d9d8cf", shade: "#aeb3b4", deep: "#7f878b", backLit: "#d3d6d4", backShade: "#9aa3a8", mortar: "rgba(96,104,110,0.30)", mortarBack: "rgba(96,104,110,0.16)", rim: "rgba(255,255,248,0.85)", roofLit: "#6b7986", roofShade: "#4a5663", roofRim: "rgba(230,236,240,0.5)", win: "#ffd98a", gold: "#f5d06b" };

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
    rect(g, -1.1, -25.2, 1.1, 2, lin(g, -1.1, 0, 1.1, 0, [[0, FL.backLit], [0.55, FL.backLit], [1, FL.backShade]]));
    courses(g, -1.1, -25.2, 1.1, 2, 0.6, 1.2, FL.mortarBack, px);
    rimTL(g, -1.1, -25.2, 1.1, 2, FL.rim, px);
    archWin(g, 0, -24.75, 1.1, 1.95);
    g.fillStyle = "#fff1c4";
    g.fill();
    rect(g, -1.45, -25.6, 1.45, -25.2, FL.lit);
    line(g, [[-1.45, -25.2], [1.45, -25.2]], FL.deep, px);
    poly(g, [[-1.45, -25.6], [0, -30], [0, -25.6]]);
    g.fillStyle = FL.roofLit;
    g.fill();
    poly(g, [[0, -25.6], [0, -30], [1.45, -25.6]]);
    g.fillStyle = FL.roofShade;
    g.fill();
    line(g, [[-1.45, -25.6], [0, -30]], FL.roofRim, px);
    g.beginPath();
    g.arc(0, -30.2, 0.22, 0, 2 * Math.PI);
    g.fillStyle = FL.gold;
    g.fill();

    // 2. Keep
    rect(g, -4, -19.5, 2.2, 2, lin(g, 0, -19.5, 0, 2, [[0, FL.lit], [1, FL.mid]]));
    rect(g, 2.2, -19.5, 4, 2, FL.shade);
    courses(g, -4, -19.5, 2.2, 2, 0.6, 1.3, FL.mortar, px);
    courses(g, 2.2, -19.5, 4, 2, 0.6, 1.3, FL.mortar, px);
    merlons(g, -4, 2.2, -19.5, 0.7, 0.8, 0.55, FL.lit);
    merlons(g, 2.2, 4, -19.5, 0.7, 0.8, 0.55, FL.shade);
    rimTL(g, -4, -19.5, 2.2, 2, FL.rim, px);
    line(g, [[2.2, -19.5], [2.2, 2]], "rgba(120,128,132,0.5)", px);

    g.globalAlpha = 0.9;
    for (const cx of [-2.9, -1.35, 0.2]) {
      archWin(g, cx, -16.8, 0.45, 1.2);
      g.fillStyle = FL.win;
      g.fill();
    }
    for (const cx of [-2.1, -0.6]) {
      archWin(g, cx, -15.0, 0.45, 1.0);
      g.fillStyle = FL.win;
      g.fill();
    }
    g.globalAlpha = 1;

    g.globalAlpha = 0.7;
    archWin(g, 3.1, -16.8, 0.3, 1.2);
    g.fillStyle = "#e8b86a";
    g.fill();
    g.globalAlpha = 1;

    rect(g, -4.7, -17.5, 4.7, -17.25, "rgba(80,88,94,0.45)");

    rect(g, -4.7, -21.5, -3.1, -17.5, lin(g, -4.7, 0, -3.1, 0, [[0, FL.lit], [0.5, FL.mid], [1, FL.shade]]));
    rect(g, 3.1, -21.5, 4.7, -17.5, lin(g, 3.1, 0, 4.7, 0, [[0, FL.lit], [0.5, FL.mid], [1, FL.shade]]));

    poly(g, [[-4.95, -21.5], [-3.9, -23.8], [-3.9, -21.5]]);
    g.fillStyle = FL.roofLit;
    g.fill();
    poly(g, [[-3.9, -21.5], [-3.9, -23.8], [-2.85, -21.5]]);
    g.fillStyle = FL.roofShade;
    g.fill();
    poly(g, [[2.85, -21.5], [3.9, -23.8], [3.9, -21.5]]);
    g.fillStyle = FL.roofLit;
    g.fill();
    poly(g, [[3.9, -21.5], [3.9, -23.8], [4.95, -21.5]]);
    g.fillStyle = FL.roofShade;
    g.fill();

    // 3. Inner wall
    rect(g, -9.5, -13, 9.5, 2, lin(g, 0, -13, 0, 2, [[0, FL.backLit], [1, FL.backShade]]));
    courses(g, -9.5, -13, 9.5, 2, 0.55, 1.2, FL.mortarBack, px);
    merlons(g, -9.5, 9.5, -13, 0.6, 0.7, 0.5, FL.backLit);

    rect(g, -10.7, -15.6, -8.3, 2, lin(g, -10.7, 0, -8.3, 0, [[0, FL.backLit], [0.5, "#c3c8c8"], [1, FL.backShade]]));
    rect(g, 8.3, -15.6, 10.7, 2, lin(g, 8.3, 0, 10.7, 0, [[0, FL.backLit], [0.5, "#c3c8c8"], [1, FL.backShade]]));
    courses(g, -10.7, -15.6, -8.3, 2, 0.55, 1.2, FL.mortarBack, px);
    courses(g, 8.3, -15.6, 10.7, 2, 0.55, 1.2, FL.mortarBack, px);
    merlons(g, -10.7, -8.3, -15.6, 0.55, 0.7, 0.45, FL.backLit);
    merlons(g, 8.3, 10.7, -15.6, 0.55, 0.7, 0.45, FL.backLit);

    rect(g, -10.7, -10.5, 10.7, -6, lin(g, 0, -10.5, 0, -6, [[0, "rgba(40,46,52,0)"], [1, "rgba(40,46,52,0.35)"]]));

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
      rect(g, x - w / 2, wallTop, x - w / 2 + 0.65 * w, -6, FL.mid);
      rect(g, x - w / 2 + 0.65 * w, wallTop, x + w / 2, -6, FL.shade);
      poly(g, [[x - w / 2 - 0.15, wallTop], [x, apex], [x, wallTop]]);
      g.fillStyle = FL.roofLit;
      g.fill();
      poly(g, [[x, wallTop], [x, apex], [x + w / 2 + 0.15, wallTop]]);
      g.fillStyle = FL.roofShade;
      g.fill();
      line(g, [[x - w / 2 - 0.15, wallTop], [x, apex]], FL.roofRim, px);
      g.globalAlpha = 0.85;
      rect(g, x - 0.175, wallTop + 0.35, x - 0.175 + 0.35, wallTop + 0.35 + 0.5, FL.win);
      g.globalAlpha = 1;
    }

    // 5. Outer curtain wall
    rect(g, -13, -8, 13, 2, lin(g, 0, -8, 0, 2, [[0, FL.lit], [1, FL.mid]]));
    courses(g, -13, -8, 13, 2, 0.55, 1.3, FL.mortar, px);
    rect(g, -13, -8, 13, -7.8, "rgba(90,98,104,0.35)");
    merlons(g, -13, 13, -8, 0.6, 0.7, 0.5, FL.lit);
    line(g, [[-13, -8], [13, -8]], FL.rim, px);
    for (const cx of [-9.8, -4.6, 4.6, 9.8]) {
      rect(g, cx - 0.075, -5.6, cx + 0.075, -4.8, "#4a545b");
    }

    // 6. Intermediate towers
    for (const c of [-7, 7]) {
      rect(g, c - 1.2, -10.2, c + 0.48, 2, lin(g, 0, -10.2, 0, 2, [[0, FL.lit], [1, FL.mid]]));
      rect(g, c + 0.48, -10.2, c + 1.2, 2, FL.shade);
      courses(g, c - 1.2, -10.2, c + 0.48, 2, 0.55, 1.2, FL.mortar, px);
      courses(g, c + 0.48, -10.2, c + 1.2, 2, 0.55, 1.2, FL.mortar, px);
      merlons(g, c - 1.2, c + 1.2, -10.2, 0.55, 0.7, 0.45, FL.lit);
      rimTL(g, c - 1.2, -10.2, c + 1.2, 2, FL.rim, px);
      g.globalAlpha = 0.8;
      rect(g, c - 0.4, -8.4, c - 0.4 + 0.25, -8.4 + 0.8, FL.win);
      g.globalAlpha = 1;
    }

    // 7. Corner towers
    for (const c of [-13, 13]) {
      rect(g, c - 1.7, -10.8, c + 1.7, 2, lin(g, c - 1.7, 0, c + 1.7, 0, [[0, FL.lit], [0.45, FL.mid], [1, FL.deep]]));
      courses(g, c - 1.7, -10.8, c + 1.7, 2, 0.55, 1.2, FL.mortar, px);
      rect(g, c - 1.95, -12, c + 1.95, -10.8, lin(g, c - 1.95, 0, c + 1.95, 0, [[0, FL.lit], [0.45, FL.mid], [1, FL.deep]]));
      rect(g, c - 1.95, -10.8, c + 1.95, -10.62, "rgba(80,88,94,0.45)");
      merlons(g, c - 1.95, c + 1.95, -12, 0.55, 0.7, 0.45, FL.lit);
      rimTL(g, c - 1.95, -12, c + 1.95, -10.8, FL.rim, px);
      g.globalAlpha = 0.8;
      rect(g, c - 0.15, -8.2, c - 0.15 + 0.3, -8.2 + 0.9, FL.win);
      g.globalAlpha = 1;
    }

    // 8. Gate towers
    for (const c of [-2.1, 2.1]) {
      rect(g, c - 1.1, -11.2, c + 1.1, 2, lin(g, c - 1.1, 0, c + 1.1, 0, [[0, FL.lit], [0.45, FL.mid], [1, FL.deep]]));
      courses(g, c - 1.1, -11.2, c + 1.1, 2, 0.55, 1.2, FL.mortar, px);
      merlons(g, c - 1.1, c + 1.1, -11.2, 0.5, 0.65, 0.4, FL.lit);
      rimTL(g, c - 1.1, -11.2, c + 1.1, 2, FL.rim, px);
    }

    gatePath();
    g.fillStyle = "#2e3438";
    g.fill();
    gatePath();
    g.fillStyle = lin(g, 0, 2, 0, -3.8, [[0, "rgba(255,210,130,0.55)"], [1, "rgba(255,210,130,0)"]]);
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
    g.strokeStyle = "rgba(40,44,48,0.8)";
    g.lineWidth = px;
    g.stroke();
    g.restore();

    // 9. Foot fade
    light(g, lin(g, -16, 0, 16, 0, [[0, "rgba(40,52,70,0)"], [0.45, "rgba(40,52,70,0.04)"], [1, "rgba(40,52,70,0.30)"]]), -16, -34, 16, 2);
    light(g, lin(g, 0, -12, 0, 2, [[0, "rgba(30,38,48,0)"], [1, "rgba(30,38,48,0.28)"]]), -16, -12, 16, 2);
    light(g, rad(g, 0, -23.6, 0, 12, [[0, "rgba(255,236,190,0.22)"], [1, "rgba(255,236,190,0)"]]), -16, -34, 16, 2);
    fadeFoot(g, -16, 16, -0.6, 1.6);

    // 10. Ground mist
    haze(g, 0, 0.4, 15.5, 2.2, "206,216,224", 0.13);
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
    g.fillStyle = FL.gold;
    g.fill();
  }

  RexArt.firstlight = { box: [-16, -34, 16, 2], paint: paintFirstLight, under: underFirstLight, live: liveFirstLight };

  /* ==================== CRIMSON COURT ==================== */

  const CC = { top: "#2b121b", bot: "#14070c", face: "#351620", towerTop: "#3a1823", side: "#1a0a10", roof: "#1d0b12", corner: "#3d1a25", rimRed: "rgba(255,92,78,0.75)", rimRedSoft: "rgba(255,92,78,0.36)", rimCool: "rgba(190,186,210,0.18)", glassHot: "#ff7a52", glassDeep: "#b3182a", tracery: "#12060a", detail: "rgba(255,120,100,0.22)" };

  function paintCrimson(g, px) {
    const body = lin(g, 0, -34, 0, 2, [[0, CC.top], [1, CC.bot]]);
    const glass = (yTop, yBot) => lin(g, 0, yTop, 0, yBot, [[0, CC.glassHot], [1, CC.glassDeep]]);
    const rimR = pts => line(g, pts, CC.rimRed, px * 1.2);
    const rimL = pts => line(g, pts, CC.rimCool, px);

    // 1. Fleche
    rect(g, -0.6, -23, 0.6, 2, body);
    poly(g, [[-0.6, -23], [0, -33], [0.6, -23]]);
    g.fillStyle = body;
    g.fill();
    for (let k = 1; k <= 5; k++) {
      const y = -23 - k * 1.7;
      const hw = 0.6 * (1 - k * 1.7 / 10);
      poly(g, [[-hw, y], [-hw - 0.3, y - 0.15], [-hw, y - 0.35]]);
      g.fillStyle = body;
      g.fill();
      poly(g, [[hw, y], [hw + 0.3, y - 0.15], [hw, y - 0.35]]);
      g.fillStyle = body;
      g.fill();
    }
    rimR([[0, -33], [0.6, -23], [0.6, -14.3]]);
    rimL([[0, -33], [-0.6, -23], [-0.6, -14.3]]);

    // 2. Wings
    for (const s of [-1, 1]) {
      const x0 = Math.min(s * 8.2, s * 14.5), x1 = Math.max(s * 8.2, s * 14.5);
      rect(g, x0, -8.5, x1, 2, body);
      poly(g, [[s * 14.5, -8.5], [s * 13.2, -11.5], [s * 8.2, -11.5], [s * 8.2, -8.5]]);
      g.fillStyle = CC.roof;
      g.fill();
      line(g, [[s * 13.2, -11.5], [s * 8.2, -11.5]], CC.rimRedSoft, px);
      if (s === 1) rimR([[s * 14.5, -8.5], [s * 13.2, -11.5]]);
      else rimL([[s * 14.5, -8.5], [s * 13.2, -11.5]]);

      for (const cx of [s * 9.5, s * 11.4, s * 13.2]) {
        lancet(g, cx, 0.9, -2.2, -6.2, -6.9);
        g.fillStyle = glass(-6.9, -2.2);
        g.fill();
        line(g, [[cx, -6.6], [cx, -2.2]], CC.tracery, px * 1.2);
        line(g, [[cx - 0.45, -4.4], [cx + 0.45, -4.4]], CC.tracery, px);
      }

      const piers = [
        { c: s * 10.45, hw: 0.275, top: -9.6, apex: -11.6, finial: -12.2 },
        { c: s * 12.3, hw: 0.275, top: -9.6, apex: -11.6, finial: -12.2 },
        { c: s * 14.9, hw: 0.5, top: -9.4, apex: -12.0, finial: -12.7 }
      ];
      for (const { c, hw, top, apex, finial } of piers) {
        rect(g, c - hw, top, c + hw, 2, CC.face);
        poly(g, [[c - hw, top], [c, apex], [c + hw, top]]);
        g.fillStyle = CC.face;
        g.fill();
        line(g, [[c, apex], [c, finial]], CC.rimRed, px);
        rimR([[c + hw, 2], [c + hw, top], [c, apex]]);
        rimL([[c - hw, 2], [c - hw, top], [c, apex]]);
      }

      g.beginPath();
      g.moveTo(s * 14.9, -9.2);
      g.quadraticCurveTo(s * 13.8, -15.4, s * 8.2, -15.8);
      g.strokeStyle = CC.face;
      g.lineWidth = 0.55;
      g.stroke();
      g.beginPath();
      g.moveTo(s * 14.9, -9.2);
      g.quadraticCurveTo(s * 13.8, -15.4, s * 8.2, -15.8);
      g.strokeStyle = s === 1 ? CC.rimRedSoft : CC.rimCool;
      g.lineWidth = px * 1.2;
      g.stroke();

      g.beginPath();
      g.moveTo(s * 12.3, -9.6);
      g.quadraticCurveTo(s * 11.2, -13.6, s * 8.2, -13.2);
      g.strokeStyle = CC.face;
      g.lineWidth = 0.4;
      g.stroke();
      g.beginPath();
      g.moveTo(s * 12.3, -9.6);
      g.quadraticCurveTo(s * 11.2, -13.6, s * 8.2, -13.2);
      g.strokeStyle = s === 1 ? CC.rimRedSoft : CC.rimCool;
      g.lineWidth = px * 1.2;
      g.stroke();
    }

    // 3. Towers
    for (const c of [-6.4, 6.4]) {
      const o = Math.sign(c);
      rect(g, c - 1.8, -21, c + 1.8, 2, lin(g, 0, -21, 0, 2, [[0, CC.towerTop], [1, CC.bot]]));
      if (o > 0) rect(g, c + 1.3, -21, c + 1.8, 2, CC.corner);
      else rect(g, c - 1.8, -21, c - 1.3, 2, CC.corner);

      line(g, [[c - 1.8, -8.5], [c + 1.8, -8.5]], CC.detail, px);
      line(g, [[c - 1.8, -15.5], [c + 1.8, -15.5]], CC.detail, px);

      for (const cx of [c - 0.6, c + 0.6]) {
        lancet(g, cx, 0.6, -10.4, -14.0, -14.6);
        g.fillStyle = glass(-14.6, -10.4);
        g.fill();
      }

      lancet(g, c, 1.2, -17.2, -19.6, -20.3);
      g.fillStyle = "#5a0e18";
      g.fill();
      g.save();
      lancet(g, c, 1.2, -17.2, -19.6, -20.3);
      g.clip();
      g.beginPath();
      for (const y of [-17.9, -18.5, -19.1]) {
        g.moveTo(c - 0.6, y);
        g.lineTo(c + 0.6, y);
      }
      g.strokeStyle = CC.tracery;
      g.lineWidth = px * 1.5;
      g.stroke();
      g.restore();

      poly(g, [[c + o * 1.8, -15.4], [c + o * 2.7, -15.1], [c + o * 2.5, -14.8], [c + o * 1.8, -14.9]]);
      g.fillStyle = CC.face;
      g.fill();
      if (o > 0) line(g, [[c + o * 1.8, -15.4], [c + o * 2.7, -15.1]], CC.rimRed, px * 1.2);
      else line(g, [[c + o * 1.8, -15.4], [c + o * 2.7, -15.1]], CC.rimCool, px);

      {
        const px0 = c - 1.8, px1 = c - 1.3, mid = (px0 + px1) / 2;
        poly(g, [[px0, -21], [mid, -23.7], [px1, -21]]);
        g.fillStyle = CC.face;
        g.fill();
      }
      {
        const px0 = c + 1.3, px1 = c + 1.8, mid = (px0 + px1) / 2;
        poly(g, [[px0, -21], [mid, -23.7], [px1, -21]]);
        g.fillStyle = CC.face;
        g.fill();
        line(g, [[mid, -23.7], [mid, -24.3]], CC.rimRed, px);
      }

      poly(g, [[c - 1.4, -21], [c, -30.5], [c + 1.4, -21]]);
      g.fillStyle = lin(g, c - 1.4, 0, c + 1.4, 0, [[0, CC.towerTop], [1, CC.side]]);
      g.fill();
      line(g, [[c, -30.5], [c, -32]], CC.rimRed, px * 1.2);

      for (let k = 1; k <= 6; k++) {
        const y = -21 - k * 1.35;
        const hw = 1.4 * (1 - k * 1.35 / 9.5);
        poly(g, [[c - hw, y], [c - hw - 0.3, y - 0.15], [c - hw + 0.02, y - 0.4]]);
        g.fillStyle = CC.face;
        g.fill();
        poly(g, [[c + hw, y], [c + hw + 0.3, y - 0.15], [c + hw - 0.02, y - 0.4]]);
        g.fillStyle = CC.face;
        g.fill();
      }

      g.globalAlpha = 0.8;
      rect(g, c - 0.25, -24.9, c + 0.25, -24.1, CC.glassDeep);
      g.globalAlpha = 1;
      poly(g, [[c - 0.35, -24.9], [c, -25.4], [c + 0.35, -24.9]]);
      g.fillStyle = CC.face;
      g.fill();

      rimR([[c + 1.8, 2], [c + 1.8, -21]]);
      rimR([[c + 1.4, -21], [c, -30.5]]);
      rimL([[c - 1.8, 2], [c - 1.8, -21]]);
      rimL([[c - 1.4, -21], [c, -30.5]]);
    }

    // 4. Facade
    rect(g, -4.6, -14.3, 4.6, 2, body);
    poly(g, [[-4.6, -14.3], [0, -20], [4.6, -14.3]]);
    g.fillStyle = body;
    g.fill();

    const gableApex = [0, -20];
    for (const base of [[-4.6, -14.3], [4.6, -14.3]]) {
      for (let k = 1; k <= 4; k++) {
        const qx = base[0] + (k / 5) * (gableApex[0] - base[0]);
        const qy = base[1] + (k / 5) * (gableApex[1] - base[1]);
        poly(g, [[qx - 0.12, qy], [qx, qy - 0.55], [qx + 0.12, qy]]);
        g.fillStyle = body;
        g.fill();
      }
    }

    poly(g, [[-0.2, -20], [0, -21.6], [0.2, -20]]);
    g.fillStyle = CC.face;
    g.fill();
    rimR([[0.2, -20], [0, -21.6]]);
    rimR([[4.6, -14.3], [0, -20]]);
    rimL([[-4.6, -14.3], [0, -20]]);

    for (const y of [-7.8, -9.2, -14.3]) {
      line(g, [[-4.6, y], [4.6, y]], CC.detail, px);
    }

    for (let i = 0; i <= 8; i++) {
      const cx = -3.9 + i * 0.975;
      lancet(g, cx, 0.5, -8.0, -8.6, -9.0);
      g.strokeStyle = CC.detail;
      g.lineWidth = px;
      g.stroke();
    }

    g.beginPath();
    g.arc(0, -11.6, 2.0, 0, 2 * Math.PI);
    g.fillStyle = rad(g, 0, -11.6, 0, 2.0, [[0, "#ffb38a"], [0.35, "#ff5a3c"], [1, "#8e0f22"]]);
    g.fill();

    g.strokeStyle = CC.tracery;
    g.beginPath();
    g.arc(0, -11.6, 2.0, 0, 2 * Math.PI);
    g.lineWidth = 0.2;
    g.stroke();
    g.beginPath();
    g.arc(0, -11.6, 0.65, 0, 2 * Math.PI);
    g.lineWidth = 0.14;
    g.stroke();

    g.beginPath();
    for (let k = 0; k < 12; k++) {
      const ang = k * Math.PI / 6;
      g.moveTo(0.65 * Math.cos(ang), -11.6 + 0.65 * Math.sin(ang));
      g.lineTo(2.0 * Math.cos(ang), -11.6 + 2.0 * Math.sin(ang));
    }
    g.lineWidth = 0.12;
    g.stroke();

    g.beginPath();
    for (let k = 0; k < 12; k++) {
      const ang = k * Math.PI / 6 + Math.PI / 12;
      const cx = 1.35 * Math.cos(ang), cy = -11.6 + 1.35 * Math.sin(ang);
      g.moveTo(cx + 0.33, cy);
      g.arc(cx, cy, 0.33, 0, 2 * Math.PI);
    }
    g.lineWidth = 0.09;
    g.stroke();

    g.beginPath();
    g.arc(0, -11.6, 2.3, 0, 2 * Math.PI);
    g.strokeStyle = CC.detail;
    g.lineWidth = px;
    g.stroke();

    lancet(g, 0, 4.6, 2, -3.4, -7.4);
    g.strokeStyle = CC.detail;
    g.lineWidth = px;
    g.stroke();
    lancet(g, 0, 4.0, 2, -3.4, -6.8);
    g.strokeStyle = CC.detail;
    g.lineWidth = px;
    g.stroke();

    lancet(g, 0, 3.4, 2, -3.4, -6.2);
    g.fillStyle = "#0c0407";
    g.fill();
    lancet(g, 0, 3.4, 2, -3.4, -6.2);
    g.fillStyle = lin(g, 0, 2, 0, -4, [[0, "rgba(255,70,50,0.35)"], [1, "rgba(255,70,50,0)"]]);
    g.fill();

    line(g, [[0, 2], [0, -5.4]], CC.tracery, px);

    // 5. Foot fade
    light(g, lin(g, 0, -14, 0, 2, [[0, "rgba(8,2,4,0)"], [1, "rgba(8,2,4,0.35)"]]), -16.5, -14, 16.5, 2);
    fadeFoot(g, -16.5, 16.5, -0.6, 1.6);

    // 6. Mist
    haze(g, 0, 0.4, 16, 2.2, "160,40,50", 0.12);
  }

  function liveCrimson(g, px, t, a) {
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = a * (0.7 + 0.3 * Math.sin(t * 1.1));
    g.fillStyle = rad(g, 0, -11.6, 0, 3.8, [[0, "rgba(255,80,60,0.22)"], [1, "rgba(255,80,60,0)"]]);
    g.fillRect(-3.8, -11.6 - 3.8, 7.6, 7.6);
    g.globalCompositeOperation = "source-over";
  }

  RexArt.crimson = { box: [-16.5, -34.5, 16.5, 2], paint: paintCrimson, live: liveCrimson };

  /* ===================== BONE SPIRE ===================== */
  // a flat, stylized silhouette tower — stacked arcaded tiers under cornice
  // bands, upright and tapering to a sharp pointed cone. Flat fills only.

  const BS = { lit: "#ece2c9", shade: "#a8977a", hole: "#3a3026" };
  // [height, half-width at bottom, half-width at top, arch count], bottom tier first
  const BS_TIERS = [[9.0, 4.6, 4.3, 5], [7.6, 4.0, 3.7, 4], [6.6, 3.4, 3.1, 4], [5.8, 2.8, 2.5, 3], [5.0, 2.2, 1.9, 3]];
  const BS_CORNICE = 0.8;   // cornice band height
  const BS_PLINTH = 0.9;    // plinth top is at y = -BS_PLINTH
  const BS_TIP = 54;        // cone apex at y = -BS_TIP

  function paintBoneSpire(g, px) {
    // 1. Plinth
    poly(g, [[-5.2, 0.6], [5.2, 0.6], [5.2, -BS_PLINTH], [-5.2, -BS_PLINTH]]);
    g.fillStyle = BS.lit;
    g.fill();

    poly(g, [[1.6, 0.6], [5.2, 0.6], [5.2, -BS_PLINTH], [1.6, -BS_PLINTH]]);
    g.fillStyle = BS.shade;
    g.fill();

    // 2. Tiers, bottom-first
    let yb = -BS_PLINTH;
    for (const [h, hwB, hwT, n] of BS_TIERS) {
      const yt = yb - h;

      poly(g, [[-hwB, yb], [hwB, yb], [hwT, yt], [-hwT, yt]]);
      g.fillStyle = BS.lit;
      g.fill();

      poly(g, [[0.3 * hwB, yb], [hwB, yb], [hwT, yt], [0.3 * hwT, yt]]);
      g.fillStyle = BS.shade;
      g.fill();

      // Arches
      g.save();
      poly(g, [[-hwB, yb], [hwB, yb], [hwT, yt], [-hwT, yt]]);
      g.clip();
      const hwM = (hwB + hwT) / 2;
      const span = 0.78 * hwM;
      const aw = 0.55 * span / n;
      const yBot = yb - 0.12 * h;
      const yApex = yt + 0.14 * h;
      const ySpring = yApex + aw;
      for (let j = 0; j < n; j++) {
        const cx = -span + (j + 0.5) * (2 * span / n);
        g.beginPath();
        g.moveTo(cx - aw, yBot);
        g.lineTo(cx - aw, ySpring);
        g.arc(cx, ySpring, aw, Math.PI, 0, false);
        g.lineTo(cx + aw, yBot);
        g.closePath();
        g.fillStyle = BS.hole;
        g.fill();
      }
      g.restore();

      // Cornice on top of the tier
      const cw = hwT + 0.5;
      const yc = yt - BS_CORNICE;

      poly(g, [[-cw, yt], [cw, yt], [cw, yc], [-cw, yc]]);
      g.fillStyle = BS.lit;
      g.fill();

      poly(g, [[-cw, yt], [cw, yt], [cw, yt - 0.35 * BS_CORNICE], [-cw, yt - 0.35 * BS_CORNICE]]);
      g.fillStyle = BS.shade;
      g.fill();

      poly(g, [[0.3 * hwT, yt], [cw, yt], [cw, yc], [0.3 * hwT, yc]]);
      g.fillStyle = BS.shade;
      g.fill();

      // Cornice thorns
      for (const s of [-1, 1]) {
        poly(g, [[s * (cw - 0.5), yc], [s * cw, yc], [s * (cw + 0.35), yc - 1.1]]);
        g.fillStyle = s === -1 ? BS.lit : BS.shade;
        g.fill();
      }

      yb = yc;
    }

    // 3. Cone
    const ybase = yb;
    poly(g, [[-2.0, ybase], [2.0, ybase], [0, -BS_TIP]]);
    g.fillStyle = BS.lit;
    g.fill();

    poly(g, [[0, ybase], [2.0, ybase], [0, -BS_TIP]]);
    g.fillStyle = BS.shade;
    g.fill();

    // 4. Collar at the cone base
    const cAw = 0.35, cYBot = ybase - 0.4, cYSpring = ybase - 1.6;
    g.beginPath();
    g.moveTo(-cAw, cYBot);
    g.lineTo(-cAw, cYSpring);
    g.arc(0, cYSpring, cAw, Math.PI, 0, false);
    g.lineTo(cAw, cYBot);
    g.closePath();
    g.fillStyle = BS.hole;
    g.fill();

    // 5. Foot fade
    fadeFoot(g, -6, 6, -0.8, 1.6);
  }

  function liveBoneSpire(g, px, t, a) {
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = a * (0.75 + 0.25 * Math.sin(t * 1.3));
    g.fillStyle = rad(g, 0, -BS_TIP, 0, 3.5, [[0, "rgba(255,240,200,0.30)"], [1, "rgba(255,240,200,0)"]]);
    g.fillRect(-3.5, -BS_TIP - 3.5, 7, 7);
    g.globalCompositeOperation = "source-over";
  }

  RexArt.bonespire = { box: [-6, -58, 6, 2], paint: paintBoneSpire, live: liveBoneSpire };
})();
