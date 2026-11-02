/* js/bridge/bridge-poi.js — point of interest, then scan: an unread beacon is bracketed when the ship nears it, scanned on contact, and only then opens its note and awards its XP */
(function () {
  const B = window.Bridge;
  if (!B) return;
  const { ctx, SLOT } = B;

  const SCAN_SECS = 1;
  const SCAN_DRIFT = 250;   // camera units it may wander from where the scan began
  const LOCK_SECS = 0.35;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const unread = m => !!(window.XP && !XP.has("beacon-" + m.id));

  /* the HUD's main colour, re-read only when the palette switches (h key, ?hud=) */
  let rgb = "228,221,198";
  function readPalette() {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--hud-lamp-rgb").trim();
    if (v) rgb = v.replace(/\s+/g, ",");
  }
  readPalette();
  new MutationObserver(readPalette).observe(document.documentElement, { attributes: true, attributeFilter: ["data-hud"] });

  /* contact on an unread beacon starts the scan; false means file it at once */
  B.poiScan = function (m, done) {
    if (!unread(m) || reduced.matches) return false;
    if (B.scan && B.scan.m === m) { B.scan.done = done; return true; }
    B.scan = { m, t: 0, done, x0: B.camX };
    B.startLoop();
    return true;
  };

  /* once a frame from the travel step: time the scan, cancel it when the camera leaves */
  B.poiStep = function (dt) {
    const s = B.scan;
    if (!s) return;
    if (Math.abs(B.camX - s.x0) > SCAN_DRIFT) { B.scan = null; return; }
    s.t += dt;
    if (s.t >= SCAN_SECS) { B.scan = null; s.done(); }
  };

  function bracket(x, y, r) {
    const a = r * 0.45;
    ctx.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      ctx.moveTo(x + sx * r, y + sy * (r - a));
      ctx.lineTo(x + sx * r, y + sy * r);
      ctx.lineTo(x + sx * (r - a), y + sy * r);
    }
    ctx.stroke();
  }

  /* called at the end of drawMarks: brackets on unread beacons in range, the readout while scanning */
  B.drawPoi = function (dt) {
    const range = Math.min(B.W * 0.42, 560);
    const still = reduced.matches;
    for (const m of B.activeMarks()) {
      const scanning = B.scan && B.scan.m === m;
      if (!scanning && (m.vis < 0.5 || m.fly || !unread(m))) { m.poi = 0; continue; }
      const p = B.markScreen(m);
      const near = scanning || (Math.abs(p.x - B.W / 2) < range && p.y > 0 && p.y < B.H);
      if (!near) { m.poi = 0; continue; }
      m.poi = still ? 1 : Math.min(1, (m.poi || 0) + dt / LOCK_SECS);
      const k = 1 - m.poi;
      const r = (scanning ? 64 : 30) + 40 * k * k;
      const frac = scanning ? Math.min(1, B.scan.t / SCAN_SECS) : 0;
      ctx.save();
      ctx.strokeStyle = `rgb(${rgb})`;
      ctx.fillStyle = `rgb(${rgb})`;
      ctx.textAlign = "center";
      ctx.globalAlpha = 0.9 * m.poi;
      ctx.lineWidth = scanning ? 2.5 : 1.5;
      bracket(p.x, p.y, r);
      if (!scanning) {
        /* the spotted beacon: caption above, its name below the brackets, never through them */
        ctx.font = "10px ui-monospace, monospace";
        ctx.fillText("POINT OF INTEREST", p.x, p.y - r - 8);
        ctx.font = "11px ui-monospace, monospace";
        ctx.fillText(m.name.toUpperCase(), p.x, p.y + r + 16);
      } else {
        /* a sweep line crossing the bracketed box, then the plate: clear of the ship, above the beacon (below it when the bar is in the way) */
        const sy = p.y - r + 2 * r * (still ? frac : (B.scan.t * 2.2) % 1);
        ctx.globalAlpha = 0.55;
        ctx.fillRect(p.x - r, sy, 2 * r, 2);
        ctx.globalAlpha = 1;
        const pw = 220, ph = 62;
        const px = Math.max(8, Math.min(B.W - pw - 8, p.x - pw / 2));
        const py = p.y - r - 14 - ph > 80 ? p.y - r - 14 - ph : p.y + r + 14;
        ctx.fillStyle = "rgba(4,4,5,0.88)";
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = `rgb(${rgb})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
        ctx.fillStyle = `rgb(${rgb})`;
        ctx.textAlign = "left";
        ctx.font = "bold 13px ui-monospace, monospace";
        ctx.fillText("SCANNING", px + 12, py + 22);
        ctx.font = "11px ui-monospace, monospace";
        ctx.fillText(m.name.toUpperCase(), px + 12, py + 38);
        ctx.textAlign = "right";
        ctx.font = "bold 26px ui-monospace, monospace";
        ctx.fillText(Math.round(frac * 100) + "%", px + pw - 12, py + 30);
        const bx = px + 12, bw = pw - 24, by = py + ph - 14;
        ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, 8);
        ctx.fillRect(bx + 2, by + 2, (bw - 4) * frac, 5);
      }
      ctx.restore();
    }
  };
})();
