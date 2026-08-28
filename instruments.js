/* ===========================================================
   INSTRUMENTS

   Four readings for the voidship bridge:

     RADAR   contacts — beacons by bearing/range, nearest callout
     SIGNAL  field    — local spectrum, chaos, unformed
     DRIVE   tanks    — fuel, thrust, cruise, burn budget
     NAV     course   — speed, bearing, span, lock status

   All four share one canvas. Feed it a readings object each
   frame; it owns everything else.
   =========================================================== */

window.Instruments = (function () {

  const LAMP = "245,208,107";
  const COLD = "143,176,184";
  const DIM  = "125,135,131";
  const BAD  = "196,74,68";
  const GOOD = "120,170,140";

  const CELL_W = 168, CELL_H = 132, GAP = 16;
  const PANELS = [
    { key: "radar",  col: 0, row: 0, label: "RADAR"  },
    { key: "signal", col: 1, row: 0, label: "SIGNAL" },
    { key: "phase",  col: 0, row: 1, label: "DRIVE"  },
    { key: "rec",    col: 1, row: 1, label: "NAV"    },
  ];
  PANELS.forEach(p => { p.w = CELL_W; p.h = CELL_H; });
  const TOTAL_W = CELL_W * 2 + GAP;
  const TOTAL_H = CELL_H * 2 + GAP;

  let cv, ctx, dpr = 1, t = 0;
  let focusKey = null;
  let uiScale = 1;

  const BANDS = 28;
  const bars = new Float32Array(BANDS);
  const peaks = new Float32Array(BANDS);
  let sweep = 0;
  const blips = new Map();
  const strip = [];
  let stripAcc = 0;
  let fuelNeedle = 1;
  let thrustNeedle = 0;
  let cruiseNeedle = 0;
  let chaosNeedle = 0;
  let futureNeedle = 0;

  const VOICES = {
    mainland: { c: 0.42, w: 0.55, a: 0.80, rough: 0.55, name: "dense · many sources" },
    rex:      { c: 0.10, w: 0.22, a: 0.70, rough: 0.10, name: "sub · one source" },
    root:     { c: 0.20, w: 0.75, a: 0.85, rough: 0.95, name: "wet · irregular" },
    watcher:  { c: 0.62, w: 0.07, a: 0.66, rough: 0.04, name: "tone · sustained" },
    bridge:   { c: 0.35, w: 0.90, a: 0.22, rough: 0.30, name: "broadband · faint" },
    future:   { c: 0.88, w: 0.14, a: 0.10, rough: 0.12, name: "near silence" },
    void:     { c: 0.50, w: 1.00, a: 0.05, rough: 0.40, name: "silent · floor only" },
  };

  function mount(canvas) {
    cv = canvas;
    if (!cv) return;
    ctx = cv.getContext("2d");
    resize();
    addEventListener("resize", resize);

    cv.addEventListener("pointerdown", e => {
      e.stopPropagation();
      const r = cv.getBoundingClientRect();
      if (focusKey) { focusKey = null; return; }
      const px = (e.clientX - r.left) / r.width  * TOTAL_W;
      const py = (e.clientY - r.top)  / r.height * TOTAL_H;
      for (const p of PANELS) {
        const x0 = p.col * (CELL_W + GAP), y0 = p.row * (CELL_H + GAP);
        if (px >= x0 && px <= x0 + CELL_W && py >= y0 && py <= y0 + CELL_H) {
          focusKey = p.key; return;
        }
      }
    });
  }

  function setScale(v) {
    uiScale = Math.max(0.7, Math.min(2.0, v));
    resize();
    return uiScale;
  }
  const getScale = () => uiScale;
  const focus = k => { focusKey = k; };

  function resize() {
    if (!cv || !ctx) return;
    dpr = Math.min(devicePixelRatio || 1, 2);
    const fit = uiScale;
    const dispW = Math.round(TOTAL_W * fit);
    const dispH = Math.round(TOTAL_H * fit);
    cv.style.width = dispW + "px";
    cv.style.height = dispH + "px";
    cv.width = Math.max(1, Math.round(TOTAL_W * dpr * fit));
    cv.height = Math.max(1, Math.round(TOTAL_H * dpr * fit));
    ctx.setTransform(dpr * fit, 0, 0, dpr * fit, 0, 0);
    ctx.imageSmoothingEnabled = true;
  }

  /* cell → focused panel: scale drawing so labels/gauges grow with the tile */
  function ps(p) { return Math.min(p.w / CELL_W, p.h / CELL_H); }
  function cellPanel(p) {
    const s = ps(p);
    if (s === 1) return p;
    return { key: p.key, label: p.label, w: p.w / s, h: p.h / s, focused: p.focused };
  }

  function drawPanel(p, r, dt) {
    const s = ps(p);
    ctx.save();
    if (s !== 1) ctx.scale(s, s);
    const q = cellPanel(p);
    chrome(q);
    paint(q, r, dt);
    ctx.restore();
  }

  function draw(dt, r) {
    if (!ctx) return;
    t += dt;
    ctx.clearRect(0, 0, TOTAL_W, TOTAL_H);

    if (focusKey) {
      const p = PANELS.find(q => q.key === focusKey);
      if (p) {
        drawPanel({ key: p.key, label: p.label, w: TOTAL_W, h: TOTAL_H, focused: true }, r, dt);
        return;
      }
    }

    for (const p of PANELS) {
      ctx.save();
      ctx.translate(p.col * (CELL_W + GAP), p.row * (CELL_H + GAP));
      drawPanel(p, r, dt);
      ctx.restore();
    }
  }

  function paint(p, r, dt) {
    if (p.key === "radar")  radar(p, r, dt);
    if (p.key === "signal") signal(p, r, dt);
    if (p.key === "phase")  drive(p, r, dt);
    if (p.key === "rec")    nav(p, r, dt);
  }

  function chrome(p) {
    ctx.fillStyle = "rgba(9,13,15,0.86)";
    ctx.fillRect(0, 0, p.w, p.h - 14);
    ctx.strokeStyle = "rgba(198,204,198,0.18)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, p.w - 1, p.h - 15);
    // corner ticks
    ctx.strokeStyle = `rgba(${LAMP},0.35)`;
    ctx.beginPath();
    ctx.moveTo(0, 8); ctx.lineTo(0, 0); ctx.lineTo(8, 0);
    ctx.moveTo(p.w, 8); ctx.lineTo(p.w, 0); ctx.lineTo(p.w - 8, 0);
    ctx.stroke();

    ctx.font = mono(9);
    ctx.fillStyle = "rgba(125,135,131,1)";
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText(p.label, 0, p.h - 3);

    const gx = p.w - 11, gy = 7;
    ctx.strokeStyle = `rgba(${LAMP},0.5)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (p.focused) {
      ctx.moveTo(gx, gy + 5); ctx.lineTo(gx + 5, gy + 5); ctx.lineTo(gx + 5, gy);
      ctx.moveTo(gx + 5, gy + 5); ctx.lineTo(gx - 1, gy - 1);
    } else {
      ctx.moveTo(gx, gy); ctx.lineTo(gx + 5, gy); ctx.lineTo(gx + 5, gy + 5);
      ctx.moveTo(gx + 5, gy); ctx.lineTo(gx - 1, gy + 6);
    }
    ctx.stroke();
  }

  function lerp(a, b, u) { return a + (b - a) * u; }
  function approach(cur, tgt, rate, dt) {
    return cur + (tgt - cur) * Math.min(1, dt * rate);
  }
  function fmtK(n) {
    const a = Math.abs(n);
    if (a >= 100000) return (n / 1000).toFixed(0) + "k";
    if (a >= 10000) return (n / 1000).toFixed(1) + "k";
    return Math.round(n).toLocaleString("en-US");
  }
  function mono(px, weight = "500") {
    return `${weight} ${px}px "IBM Plex Mono", monospace`;
  }

  /* =========================================================
     RADAR — contacts only. Nearest beacon named. Heading pip.
     ========================================================= */
  const RANGE = 22000;

  function radar(p, r, dt) {
    const inner = p.h - 15;
    const cx = p.w / 2, cy = inner * 0.52, R = Math.min(cx - 8, cy - 14);

    // range rings + labels
    for (let i = 1; i <= 3; i++) {
      ctx.strokeStyle = `rgba(${LAMP},${0.10 + i * 0.02})`;
      ctx.beginPath(); ctx.arc(cx, cy, R * i / 3, 0, 6.283); ctx.stroke();
    }
    ctx.fillStyle = `rgba(${DIM},0.7)`;
    ctx.font = mono(7);
    ctx.textAlign = "left";
    ctx.fillText("7k", cx + 3, cy - R * 0.33 + 3);
    ctx.fillText("14k", cx + 3, cy - R * 0.66 + 3);
    ctx.fillText("22k", cx + 3, cy - R + 3);

    // cross + compass
    ctx.strokeStyle = `rgba(${LAMP},0.12)`;
    ctx.beginPath();
    ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
    ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
    ctx.stroke();
    ctx.font = mono(8);
    ctx.fillStyle = `rgba(${DIM},0.85)`;
    ctx.textAlign = "center";
    ctx.fillText("W", cx - R + 7, cy + 3);
    ctx.fillText("E", cx + R - 7, cy + 3);

    sweep += dt * 1.35;
    const ang = sweep % 6.283;
    for (let i = 0; i < 16; i++) {
      const a = ang - i * 0.05;
      ctx.strokeStyle = `rgba(${LAMP},${0.28 * (1 - i / 16)})`;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      ctx.stroke();
    }
    ctx.strokeStyle = `rgba(${LAMP},0.9)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R);
    ctx.stroke();
    ctx.lineWidth = 1;

    let nearest = null, nearestD = Infinity;
    for (const m of (r.marks || [])) {
      const d = m.cam - r.camX;
      const ad = Math.abs(d);
      if (ad < nearestD) { nearestD = ad; nearest = m; }
      const rr = Math.min(1, ad / RANGE);
      if (rr >= 1) continue;
      const lift = (m.oy - 0.5) * 1.4;
      const base = d >= 0 ? 0 : Math.PI;
      const a = base + Math.atan2(lift, 0.001 + ad / RANGE) * (d >= 0 ? 1 : -1) * 0.5;
      const bx = cx + Math.cos(a) * rr * R;
      const by = cy + Math.sin(a) * rr * R;

      const diff = Math.abs(((a - ang + Math.PI * 3) % 6.283) - Math.PI);
      let lit = blips.get(m.id) || 0;
      if (diff > Math.PI - 0.12) lit = 1;
      lit = Math.max(0, lit - dt * 0.55);
      blips.set(m.id, lit);

      const locked = r.ship && r.ship.courseMark === m.id;
      const col = locked ? COLD : (m.claimed ? "150,164,160" : LAMP);
      const hg = ctx.createRadialGradient(bx, by, 0, bx, by, 10);
      hg.addColorStop(0, `rgba(${col},${0.55 * (0.35 + 0.65 * lit)})`);
      hg.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = hg; ctx.fillRect(bx - 10, by - 10, 20, 20);

      ctx.fillStyle = `rgba(${col},${0.55 + 0.45 * lit})`;
      ctx.beginPath(); ctx.arc(bx, by, m.claimed ? 2 : 3.2, 0, 6.283); ctx.fill();
      if (locked) {
        ctx.strokeStyle = `rgba(${COLD},0.9)`;
        ctx.strokeRect(bx - 5, by - 5, 10, 10);
      } else if (!m.claimed && lit > 0.2) {
        ctx.strokeStyle = `rgba(${LAMP},${lit * 0.75})`;
        ctx.beginPath(); ctx.arc(bx, by, 4 + (1 - lit) * 8, 0, 6.283); ctx.stroke();
      }
    }

    // ship heading pip
    const head = (r.ship && r.ship.angle != null) ? r.ship.angle : 0;
    ctx.strokeStyle = `rgba(${COLD},0.7)`;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(head) * 10, cy + Math.sin(head) * 10);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);

    const inRange = (r.marks || []).filter(m => Math.abs(m.cam - r.camX) < RANGE);
    const unclaimed = inRange.filter(m => !m.claimed).length;
    ctx.font = mono(9);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = `rgba(${DIM},1)`;
    ctx.fillText(inRange.length + " CONTACT", 5, 12);
    ctx.textAlign = "right";
    ctx.fillStyle = unclaimed ? `rgba(${LAMP},0.9)` : `rgba(${DIM},1)`;
    ctx.fillText(unclaimed ? unclaimed + " OPEN" : "FILED", p.w - 5, 12);

    // nearest callout
    if (nearest && nearestD < RANGE) {
      const label = (nearest.name || nearest.id || "mark").toUpperCase();
      const short = label.length > 14 ? label.slice(0, 13) + "…" : label;
      const side = nearest.cam >= r.camX ? "E" : "W";
      ctx.textAlign = "left";
      ctx.fillStyle = `rgba(${LAMP},0.85)`;
      ctx.font = mono(8);
      ctx.fillText(short, 5, inner - 4);
      ctx.textAlign = "right";
      ctx.fillStyle = `rgba(${COLD},0.9)`;
      ctx.fillText(side + " " + fmtK(nearestD), p.w - 5, inner - 4);
    }
  }

  /* =========================================================
     SIGNAL — spectrum + chaos / unformed meters + strength.
     ========================================================= */
  function signal(p, r, dt) {
    const v = VOICES[r.voice] || VOICES.void;
    const inner = p.h - 15;
    chaosNeedle = approach(chaosNeedle, r.chaos || 0, 4, dt);
    futureNeedle = approach(futureNeedle, r.future || 0, 4, dt);

    const spectrumTop = 16;
    const spectrumBot = inner - 28;
    const spectrumH = spectrumBot - spectrumTop;
    const bw = (p.w - 10) / BANDS;

    let peak = 0;
    for (let i = 0; i < BANDS; i++) {
      const u = i / (BANDS - 1);
      const near = Math.exp(-Math.pow((u - v.c) / (v.w * 0.6 + 0.02), 2));
      const grain = (Math.sin(t * (3 + i * 1.7) + i * 2.1) * 0.5 + 0.5);
      const churn = (Math.sin(t * 11 + i * 5.3) * 0.5 + 0.5) * v.rough;
      const target = Math.max(0.02, v.a * near * (0.55 + 0.45 * grain) * (1 - 0.35 * churn)
                    + 0.03 + chaosNeedle * 0.12 * churn);

      bars[i] += (target - bars[i]) * Math.min(1, dt * 9);
      peaks[i] = Math.max(peaks[i] - dt * 0.35, bars[i]);
      peak = Math.max(peak, bars[i]);

      const h = Math.max(1, bars[i] * (spectrumH - 4));
      const x = 5 + i * bw;
      ctx.fillStyle = `rgba(${COLD},${0.4 + 0.55 * bars[i]})`;
      ctx.fillRect(x, spectrumBot - h, bw - 1.4, h);
      ctx.fillStyle = `rgba(${LAMP},0.75)`;
      ctx.fillRect(x, spectrumBot - Math.max(1, peaks[i] * (spectrumH - 4)) - 1, bw - 1.4, 1);
    }

    // dual meters
    const mx = 5, mw = p.w - 10, my = inner - 18, mh = 5;
    ctx.fillStyle = `rgba(${DIM},0.25)`;
    ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = `rgba(${BAD},0.75)`;
    ctx.fillRect(mx, my, mw * chaosNeedle, mh);
    ctx.fillStyle = `rgba(${DIM},0.25)`;
    ctx.fillRect(mx, my + 8, mw, mh);
    ctx.fillStyle = `rgba(${COLD},0.8)`;
    ctx.fillRect(mx, my + 8, mw * futureNeedle, mh);

    ctx.font = mono(7);
    ctx.textAlign = "left";
    ctx.fillStyle = `rgba(${DIM},0.9)`;
    ctx.fillText("CHAOS", mx, my - 2);
    ctx.fillText("UNFORMED", mx, my + 6);
    ctx.textAlign = "right";
    ctx.fillStyle = `rgba(${BAD},0.85)`;
    ctx.fillText(chaosNeedle.toFixed(2), p.w - 5, my - 2);
    ctx.fillStyle = `rgba(${COLD},0.9)`;
    ctx.fillText(futureNeedle.toFixed(2), p.w - 5, my + 6);

    ctx.font = mono(9);
    ctx.textAlign = "left";
    ctx.fillStyle = `rgba(${DIM},1)`;
    ctx.fillText(v.name.toUpperCase(), 5, 12);
    ctx.textAlign = "right";
    ctx.fillStyle = `rgba(${LAMP},0.9)`;
    ctx.fillText("STR " + Math.round(peak * 100), p.w - 5, 12);
  }

  /* =========================================================
     DRIVE — tanks, thrust, cruise, burn budget, power.
     ========================================================= */
  function drive(p, r, dt) {
    const s = r.ship;
    const fuelN = s ? s.fuelN : 1;
    const thrust = s ? s.thrust : 0;
    const hold = s ? s.holdT : 0;
    const infinite = s && s.infinite;
    fuelNeedle = approach(fuelNeedle, fuelN, 8, dt);
    thrustNeedle = approach(thrustNeedle, thrust, 10, dt);
    cruiseNeedle = approach(cruiseNeedle, hold, 6, dt);

    const inner = p.h - 15;
    const pad = 6;
    const iconReserve = 14;          /* chrome expand glyph — keep text out of here */
    const headerY = 11;
    const cruiseBlock = 24;          /* label + bar + mode line */

    const tankW = Math.max(14, Math.round(p.w * 0.11));
    const tankX = pad;
    const tankTop = headerY + 5;
    const tankH = inner - tankTop - cruiseBlock;

    const zoneL = tankX + tankW + 8;
    const zoneR = p.w - pad - iconReserve;
    const zoneW = Math.max(40, zoneR - zoneL);
    const zoneCx = zoneL + zoneW * 0.5;
    const zoneTop = tankTop;
    const zoneBot = inner - cruiseBlock;
    const zoneCy = zoneTop + (zoneBot - zoneTop) * 0.44;
    const R = Math.min(zoneW * 0.34, (zoneBot - zoneTop) * 0.36);

    // fuel tank — left rail
    ctx.strokeStyle = `rgba(${LAMP},0.3)`;
    ctx.strokeRect(tankX + 0.5, tankTop + 0.5, tankW - 1, tankH - 1);
    for (let i = 1; i < 4; i++) {
      const y = tankTop + tankH * i / 4;
      ctx.strokeStyle = `rgba(${DIM},0.3)`;
      ctx.beginPath(); ctx.moveTo(tankX + 2, y); ctx.lineTo(tankX + tankW - 2, y); ctx.stroke();
    }
    const fillH = tankH * (infinite ? (0.85 + 0.15 * Math.sin(t * 2)) : fuelNeedle);
    const low = !infinite && fuelNeedle < 0.22;
    const col = low ? BAD : LAMP;
    const fg = ctx.createLinearGradient(0, tankTop + tankH - fillH, 0, tankTop + tankH);
    fg.addColorStop(0, `rgba(${col},0.95)`);
    fg.addColorStop(1, `rgba(${col},0.3)`);
    ctx.fillStyle = fg;
    ctx.fillRect(tankX + 2, tankTop + tankH - fillH, tankW - 4, fillH);

    // thrust arc
    ctx.strokeStyle = `rgba(${DIM},0.3)`;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(zoneCx, zoneCy, R, 0.75 * Math.PI, 2.25 * Math.PI); ctx.stroke();
    ctx.strokeStyle = `rgba(${LAMP},0.9)`;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(zoneCx, zoneCy, R, 0.75 * Math.PI, 0.75 * Math.PI + 1.5 * Math.PI * thrustNeedle);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.lineWidth = 1;

    ctx.font = mono(12, "600");
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(${LAMP},0.95)`;
    ctx.fillText(Math.round(thrustNeedle * 100) + "%", zoneCx, zoneCy + 2);
    ctx.font = mono(7);
    ctx.fillStyle = `rgba(${DIM},1)`;
    ctx.fillText("THRUST", zoneCx, zoneCy + 11);

    // burn + power — below arc, above cruise block
    const statY = zoneCy + R + 7;
    const statValY = statY + 10;
    ctx.font = mono(8);
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(${DIM},0.95)`;
    ctx.fillText("BURN", zoneCx - zoneW * 0.22, statY);
    ctx.fillText("PWR", zoneCx + zoneW * 0.22, statY);
    const burnRate = s && s.burning ? (7.5 * (s.power && s.power.burn || 1)) : 0;
    const secsLeft = (!infinite && burnRate > 0.1)
      ? (s.fuel / burnRate)
      : (infinite ? Infinity : (s ? s.fuel / 7.5 : 0));
    ctx.fillStyle = `rgba(${LAMP},0.9)`;
    if (infinite) ctx.fillText("∞", zoneCx - zoneW * 0.22, statValY);
    else if (s && s.burning) ctx.fillText("~" + secsLeft.toFixed(0) + "s", zoneCx - zoneW * 0.22, statValY);
    else ctx.fillText((s ? s.fuel : 100).toFixed(0) + "u", zoneCx - zoneW * 0.22, statValY);
    const pow = s && s.power ? s.power.accel : 1;
    ctx.fillStyle = `rgba(${COLD},0.9)`;
    ctx.fillText("×" + pow.toFixed(1), zoneCx + zoneW * 0.22, statValY);

    // cruise — bottom block, clear of burn/pwr
    const bx = zoneL;
    const by = inner - 10;
    const bw = zoneW;
    ctx.font = mono(7);
    ctx.textAlign = "left";
    ctx.fillStyle = `rgba(${DIM},1)`;
    ctx.fillText("CRUISE BUILD", bx, by - 5);
    ctx.textAlign = "right";
    ctx.fillStyle = `rgba(${COLD},0.9)`;
    ctx.fillText(Math.round(cruiseNeedle * 100) + "%", zoneR, by - 5);
    ctx.fillStyle = `rgba(${DIM},0.22)`;
    ctx.fillRect(bx, by, bw, 5);
    const cg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    cg.addColorStop(0, `rgba(${COLD},0.5)`);
    cg.addColorStop(1, `rgba(${LAMP},0.9)`);
    ctx.fillStyle = cg;
    ctx.fillRect(bx, by, bw * cruiseNeedle, 5);

    // header — fuel label + percent inline on the left (not under expand icon)
    ctx.textAlign = "left";
    ctx.font = mono(9);
    if (infinite) {
      ctx.fillStyle = `rgba(${LAMP},0.9)`;
      ctx.fillText("OPEN", zoneL, headerY);
    } else {
      ctx.fillStyle = low ? `rgba(${BAD},1)` : `rgba(${DIM},1)`;
      ctx.fillText(low ? "LOW" : "FUEL", zoneL, headerY);
      ctx.fillStyle = `rgba(${col},0.95)`;
      ctx.fillText(Math.round(fuelNeedle * 100) + "%", zoneL + 30, headerY);
    }

    const mode = s && s.burning ? "HARD BURN"
      : (s && s.courseMark ? "SEEK" : (cruiseNeedle > 0.05 ? "COAST" : "IDLE"));
    ctx.textAlign = "right";
    ctx.font = mono(8);
    ctx.fillStyle = s && s.burning ? `rgba(${LAMP},0.9)` : `rgba(${DIM},0.9)`;
    ctx.fillText(mode, zoneR, by + 12);
  }

  /* =========================================================
     NAV — speed history, bearing, span bar, course lock.
     ========================================================= */
  function nav(p, r, dt) {
    const inner = p.h - 15;
    const s = r.ship;
    const speedN = s ? s.speedN : r.speedN;
    stripAcc += dt;
    if (stripAcc > 0.045) {
      stripAcc = 0;
      strip.push([speedN, Math.min(1, Math.abs(r.vel) / 30000), r.chaos || 0]);
      if (strip.length > 160) strip.shift();
    }

    // big digital speed
    ctx.font = mono(18, "600");
    ctx.textAlign = "left";
    ctx.fillStyle = `rgba(${LAMP},0.95)`;
    ctx.fillText(Math.round(Math.abs(r.vel)).toLocaleString("en-US"), 5, 22);
    ctx.font = mono(8);
    ctx.fillStyle = `rgba(${DIM},1)`;
    ctx.fillText("U/S", 5, 32);

    ctx.textAlign = "right";
    ctx.font = mono(9);
    ctx.fillStyle = `rgba(${COLD},0.9)`;
    ctx.fillText("BRG " + fmtK(r.camX), p.w - 5, 14);
    ctx.fillStyle = `rgba(${DIM},1)`;
    ctx.fillText(r.spanPct.toFixed(1) + "% SPAN", p.w - 5, 26);

    // strip chart
    const chartTop = 38, chartBot = inner - 20;
    const chartH = chartBot - chartTop;
    ctx.strokeStyle = `rgba(${LAMP},0.08)`;
    for (let i = 1; i < 3; i++) {
      const y = chartTop + chartH * i / 3;
      ctx.beginPath(); ctx.moveTo(4, y); ctx.lineTo(p.w - 4, y); ctx.stroke();
    }
    const stepX = (p.w - 10) / Math.max(1, 159);
    ctx.strokeStyle = `rgba(${LAMP},0.8)`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    strip.forEach((sm, i) => {
      const x = 5 + i * stepX;
      const y = chartBot - sm[0] * (chartH - 2);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
    ctx.strokeStyle = `rgba(${COLD},0.4)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    strip.forEach((sm, i) => {
      const x = 5 + i * stepX;
      const y = chartBot - sm[1] * (chartH - 2) * 0.85;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
    if (strip.length) {
      const last = strip[strip.length - 1];
      const x = 5 + (strip.length - 1) * stepX;
      ctx.fillStyle = `rgba(${LAMP},0.95)`;
      ctx.beginPath();
      ctx.arc(x, chartBot - last[0] * (chartH - 2), 2, 0, 6.283);
      ctx.fill();
    }

    // span position bar
    const u = Math.min(1, Math.max(0, 1 - (r.spanPct || 0) / 100));
    // spanPct is "% crossed" from east-ish; bar shows you on the line
    const you = Math.min(1, Math.max(0, (r.spanPct || 0) / 100));
    const barY = inner - 10;
    ctx.fillStyle = `rgba(${DIM},0.25)`;
    ctx.fillRect(5, barY, p.w - 10, 3);
    ctx.fillStyle = `rgba(${LAMP},0.85)`;
    ctx.fillRect(5 + (p.w - 10) * you - 1, barY - 2, 2, 7);
    ctx.font = mono(7);
    ctx.fillStyle = `rgba(${DIM},0.8)`;
    ctx.textAlign = "left";
    ctx.fillText("W", 5, barY - 4);
    ctx.textAlign = "right";
    ctx.fillText("E", p.w - 5, barY - 4);

    // status line
    ctx.textAlign = "left";
    ctx.font = mono(8);
    if (s && s.courseName) {
      ctx.fillStyle = `rgba(${COLD},0.95)`;
      const nm = s.courseName.toUpperCase();
      ctx.fillText("LOCK " + (nm.length > 12 ? nm.slice(0, 11) + "…" : nm), 5, chartBot + 10);
    } else if (s && s.burning) {
      ctx.fillStyle = `rgba(${LAMP},0.85)`;
      ctx.fillText("BURNING", 5, chartBot + 10);
    } else if (r.region) {
      ctx.fillStyle = `rgba(${DIM},0.95)`;
      const reg = String(r.region).toUpperCase();
      ctx.fillText(reg.length > 18 ? reg.slice(0, 17) + "…" : reg, 5, chartBot + 10);
    }

    ctx.textAlign = "right";
    ctx.fillStyle = `rgba(${GOOD},0.85)`;
    if (r.travelled != null) ctx.fillText(fmtK(r.travelled) + " RUN", p.w - 5, chartBot + 10);

    void u; void lerp;
  }

  return { mount, draw, setScale, getScale, focus, TOTAL_W, TOTAL_H };
})();
