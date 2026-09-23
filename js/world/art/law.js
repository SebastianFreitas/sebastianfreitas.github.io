/* ===========================================================
   LAW — black walls with red corners and flaming braziers
   around an obsidian archive tower, lit from below by hellfire.

   Coordinates are art units, origin at the hollow's centre, +x
   right, +y down. paint(g, px) draws the static art once into an
   offscreen sprite; live(g, px, t, a) draws motion on top of it,
   every frame, in the same unit transform.
   =========================================================== */

(function () {
  const RexArt = window.RexArt = window.RexArt || {};

  const { lin, rad, poly, line, merlons, litShade } = Paint;
  const { pocket, trace, spill, lip } = RexKit;
  const rng = Util.mulberry;

  /* ================================================================
     LAW — black walls with red corners and flaming braziers
     around an obsidian archive tower, lit from below by hellfire.
     ================================================================ */

  const LW_POCKET = pocket(4101, 11, 16, 0.9);
  const LW = { lit: "#3a3438", shade: "#1f1b1e", wall: "#332d31", wallShade: "#1c181a", hole: "#0b0809", quoin: "#9e2a22", quoinShade: "#6a1712", glow: "#ff8a3c", grille: "#5a4f52" };
  const LW_FIRES = [[-8.4, -1.95], [-3.4, -0.95], [3.4, -0.95], [8.4, -1.95], [-5.9, 1.25], [5.9, 1.25]];
  const LW_TOWERS = [[-8.4, -1.2], [-3.4, -0.2], [3.4, -0.2], [8.4, -1.2]];
  const LW_SPIKES = [1.4, 2.2, 3.6, 2.2, 1.4];

  function quoins(g, xEdge, dir, yTop, xSplit) {
    for (let j = 0; yTop + j * 0.5 < 14.5; j++) {
      const y = yTop + j * 0.5;
      const wq = j % 2 === 0 ? 0.55 : 0.35;
      const x0 = dir > 0 ? xEdge : xEdge - wq;
      g.fillStyle = x0 + wq / 2 >= xSplit ? LW.quoinShade : LW.quoin;
      g.fillRect(x0, y + 0.03, wq, 0.44);
    }
  }

  function paintLaw(g, px) {
    spill(g, 11, 16, "255,110,50", 0.12);

    g.save();
    trace(g, LW_POCKET);
    g.clip();

    // Hellfire backdrop
    g.fillStyle = "#1a0a0c"; g.fillRect(-12, -17, 24, 11);
    g.fillStyle = "#3a0f0e"; g.fillRect(-12, -6, 24, 9);
    g.fillStyle = "#8a2412"; g.fillRect(-12, 3, 24, 7);
    g.fillStyle = "#e0561c"; g.fillRect(-12, 10, 24, 7);
    g.fillStyle = rad(g, 0, 12, 0, 12, [[0, "rgba(255,140,60,0.35)"], [1, "rgba(255,140,60,0)"]]);
    g.fillRect(-12, 0, 24, 17);

    // Heat haze
    g.fillStyle = "rgba(255,120,60,0.06)";
    g.beginPath();
    g.ellipse(0, 6, 10, 1, 0, 0, 2 * Math.PI);
    g.fill();
    g.beginPath();
    g.ellipse(0, 9, 10, 1, 0, 0, 2 * Math.PI);
    g.fill();

    // The dark tower
    litShade(g, () => poly(g, [[-2.2, 6], [-1.6, -9.6], [1.6, -9.6], [2.2, 6]]), 0.66, LW.lit, LW.shade);

    litShade(g, () => poly(g, [[-1.6, -9.6], [-2.3, -10.4], [2.3, -10.4], [1.6, -9.6]]), 0.69, LW.lit, LW.shade);

    for (let i = 0; i <= 4; i++) {
      const x = -1.9 + i * 0.95;
      const h = LW_SPIKES[i];
      litShade(g, () => poly(g, [[x - 0.25, -10.4], [x, -10.4 - h], [x + 0.25, -10.4]]), x, LW.lit, LW.shade);
    }

    {
      const r = rng(4401);
      for (let j = 0; j <= 12; j++) {
        const y = -8.8 + j * 0.9;
        for (const x of [-0.9, -0.3, 0.3, 0.9]) {
          g.fillStyle = r() < 0.55 ? LW.glow : LW.hole;
          g.fillRect(x - 0.07, y, 0.14, 0.42);
        }
      }
    }

    // Walls
    const wallSplit = 0 + 0.3 * 9.2;
    litShade(g, () => { g.beginPath(); g.rect(-9.2, 2.0, 18.4, 15.0); }, wallSplit, LW.wall, LW.wallShade);
    merlons(g, -9.2, 9.2, 2.0, 0.55, 0.6, 0.45, LW.wall, LW.wallShade, wallSplit, true);
    quoins(g, -9.2, 1, 2.0, wallSplit);
    quoins(g, 9.2, -1, 2.0, wallSplit);

    for (const [cx, top] of LW_TOWERS) {
      const towerSplit = cx + 0.3 * 1.1;
      litShade(g, () => { g.beginPath(); g.rect(cx - 1.1, top, 2.2, 17 - top); }, towerSplit, LW.wall, LW.wallShade);
      merlons(g, cx - 1.1, cx + 1.1, top, 0.5, 0.6, 0.4, LW.wall, LW.wallShade, towerSplit, true);
      quoins(g, cx - 1.1, 1, top, towerSplit);
      quoins(g, cx + 1.1, -1, top, towerSplit);
      g.fillStyle = LW.glow;
      g.fillRect(cx - 0.1, top + 1.2, 0.2, 0.9);
    }

    for (const [bx, by] of LW_FIRES) {
      poly(g, [[bx - 0.55, by], [bx + 0.55, by], [bx + 0.3, by + 0.55], [bx - 0.3, by + 0.55]]);
      g.fillStyle = "#1b1d20";
      g.fill();
      g.fillRect(bx - 0.06, by + 0.55, 0.12, 0.2);
    }

    g.beginPath();
    g.moveTo(-1.1, 17);
    g.lineTo(-1.1, 7.5);
    g.arc(0, 7.5, 1.1, Math.PI, 2 * Math.PI);
    g.lineTo(1.1, 17);
    g.closePath();
    g.fillStyle = LW.hole;
    g.fill();

    g.save();
    g.beginPath();
    g.moveTo(-1.1, 17);
    g.lineTo(-1.1, 7.5);
    g.arc(0, 7.5, 1.1, Math.PI, 2 * Math.PI);
    g.lineTo(1.1, 17);
    g.closePath();
    g.clip();
    for (const x of [-0.55, 0, 0.55]) {
      line(g, [[x, 6.4], [x, 17]], LW.grille, 0.12);
    }
    for (const y of [8.5, 9.5, 10.5, 11.5]) {
      line(g, [[-1.1, y], [1.1, y]], LW.grille, 0.12);
    }
    g.restore();

    g.beginPath();
    g.arc(0, 7.5, 1.35, Math.PI, 2 * Math.PI);
    g.strokeStyle = LW.quoin;
    g.lineWidth = 0.5;
    g.stroke();

    for (let k = 1; k <= 5; k++) {
      const an = Math.PI + k * Math.PI / 6;
      line(g, [[1.1 * Math.cos(an), 7.5 + 1.1 * Math.sin(an)], [1.6 * Math.cos(an), 7.5 + 1.6 * Math.sin(an)]], LW.quoinShade, px);
    }

    g.restore();
    lip(g, LW_POCKET, 4404);
  }

  function liveLaw(g, px, t, a) {
    // Flames
    for (let i = 0; i < LW_FIRES.length; i++) {
      const [bx, by] = LW_FIRES[i];
      const f = 0.8 + 0.2 * Math.sin(t * 9 + i * 1.7) + 0.1 * Math.sin(t * 23 + i);

      g.globalCompositeOperation = "lighter";
      g.globalAlpha = a * f;
      g.fillStyle = rad(g, bx, by - 0.7, 0, 2.0, [[0, "rgba(255,140,60,0.35)"], [1, "rgba(255,140,60,0)"]]);
      g.fillRect(bx - 2, by - 2.7, 4, 4);
      g.globalCompositeOperation = "source-over";

      const hF = 1.3 * (0.85 + 0.15 * Math.sin(t * 11 + i * 2.3) + 0.08 * Math.sin(t * 27 + i));
      const s = 0.18 * Math.sin(t * 6 + i);

      g.globalAlpha = a;
      g.beginPath();
      g.moveTo(bx - 0.42, by);
      g.quadraticCurveTo(bx - 0.5, by - hF * 0.45, bx + s, by - hF);
      g.quadraticCurveTo(bx + 0.5, by - hF * 0.45, bx + 0.42, by);
      g.closePath();
      g.fillStyle = lin(g, 0, by, 0, by - hF, [[0, "rgba(255,236,160,0.95)"], [0.5, "rgba(255,140,40,0.85)"], [1, "rgba(200,40,20,0)"]]);
      g.fill();

      g.globalAlpha = a;
      g.beginPath();
      g.moveTo(bx - 0.21, by);
      g.quadraticCurveTo(bx - 0.25, by - hF * 0.6 * 0.45, bx + s * 0.6, by - hF * 0.6);
      g.quadraticCurveTo(bx + 0.25, by - hF * 0.6 * 0.45, bx + 0.21, by);
      g.closePath();
      g.fillStyle = "rgba(255,250,220,0.9)";
      g.fill();
    }

    // Pages rising off the archive
    for (let i = 0; i <= 8; i++) {
      const ph = (t * 0.07 + i / 9) % 1;
      const x = -2.8 + ((i * 0.71) % 5.6) + 0.6 * Math.sin(t * 0.6 + i * 2);
      const y = -9.8 - ph * 4.2;
      g.globalAlpha = a * 0.55 * Math.sin(ph * Math.PI);
      g.save();
      g.translate(x, y);
      g.rotate(t * (0.6 + 0.1 * i) + i);
      g.fillStyle = "#e9ecf2";
      g.fillRect(-0.16, -0.11, 0.32, 0.22);
      g.restore();
    }

    // Hellfire pulse
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = a * (0.7 + 0.3 * Math.sin(t * 0.9));
    g.fillStyle = rad(g, 0, 13, 0, 10, [[0, "rgba(255,120,50,0.15)"], [1, "rgba(255,120,50,0)"]]);
    g.fillRect(-10, 3, 20, 13);
    g.globalCompositeOperation = "source-over";
  }

  RexArt.law = { box: [-16, -21, 16, 21], paint: paintLaw, live: liveLaw };
})();
