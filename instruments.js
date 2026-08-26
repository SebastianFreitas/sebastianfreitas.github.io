/* ===========================================================
   INSTRUMENTS

   Four readings, four different domains, so a glance tells you
   something a number never would:

     RADAR      space     — what's around you and how far
     SIGNAL     frequency — what this place sounds like
     PHASE      shape     — the character of the local field
     RECORDER   time      — where you've just been

   All four share one canvas. Feed it a readings object each
   frame; it owns everything else.
   =========================================================== */

window.Instruments = (function () {

  const LAMP = "245,208,107";
  const COLD = "143,176,184";
  const DIM  = "125,135,131";
  const BAD  = "196,74,68";

  /* two by two, big enough to actually read at a glance */
  const CELL_W = 168, CELL_H = 132, GAP = 16;
  const PANELS = [
    { key: "radar",  col: 0, row: 0, label: "RADAR"    },
    { key: "signal", col: 1, row: 0, label: "SIGNAL"   },
    { key: "phase",  col: 0, row: 1, label: "PHASE"    },
    { key: "rec",    col: 1, row: 1, label: "RECORDER" },
  ];
  PANELS.forEach(p => { p.w = CELL_W; p.h = CELL_H; });
  const TOTAL_W = CELL_W * 2 + GAP;
  const TOTAL_H = CELL_H * 2 + GAP;

  let cv, ctx, dpr = 1, t = 0;
  let focusKey = null;          // when set, that panel fills the whole rig
  let uiScale = 1;              // the -/+ control

  /* ---- persistent instrument state ---- */
  const BANDS = 24;
  const bars = new Float32Array(BANDS);
  const peaks = new Float32Array(BANDS);
  let sweep = 0;
  const blips = new Map();          // mark id -> freshness
  const trace = [];                 // phase plot points
  const strip = [];                 // recorder samples
  let stripAcc = 0;

  /* what each place sounds like: [centre band, width, amplitude, roughness] */
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

    // click a panel to blow it up, click again to drop back
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
    uiScale = Math.max(0.7, Math.min(1.7, v));
    if (cv) cv.style.width = Math.round(TOTAL_W * uiScale) + "px";
    return uiScale;
  }
  const getScale = () => uiScale;
  const focus = k => { focusKey = k; };

  function resize() {
    if (!cv) return;
    dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width  = Math.round(TOTAL_W * dpr);
    cv.height = Math.round(TOTAL_H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---- frame ---- */
  function draw(dt, r) {
    if (!ctx) return;
    t += dt;
    ctx.clearRect(0, 0, TOTAL_W, TOTAL_H);

    if (focusKey) {
      const p = PANELS.find(q => q.key === focusKey);
      if (p) {
        const big = { key: p.key, label: p.label, w: TOTAL_W, h: TOTAL_H, focused: true };
        ctx.save();
        chrome(big, r);
        paint(big, r, dt);
        ctx.restore();
        return;
      }
    }

    for (const p of PANELS) {
      ctx.save();
      ctx.translate(p.col * (CELL_W + GAP), p.row * (CELL_H + GAP));
      chrome(p, r);
      paint(p, r, dt);
      ctx.restore();
    }
  }

  function paint(p, r, dt) {
    if (p.key === "radar")  radar(p, r, dt);
    if (p.key === "signal") signal(p, r, dt);
    if (p.key === "phase")  phase(p, r, dt);
    if (p.key === "rec")    recorder(p, r, dt);
  }

  /* the frame and caption every panel shares */
  function chrome(p, r) {
    // a panel you can actually read against a moving scene
    ctx.fillStyle = "rgba(9,13,15,0.82)";
    ctx.fillRect(0, 0, p.w, p.h - 14);
    ctx.strokeStyle = "rgba(198,204,198,0.16)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, p.w - 1, p.h - 15);
    ctx.font = '500 8px "IBM Plex Mono", monospace';
    ctx.fillStyle = "rgba(125,135,131,1)";
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText(p.label, 0, p.h - 3);

    // expand / collapse affordance
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

  /* =========================================================
     RADAR — a sweep, and everything worth reaching plotted by
     bearing and range. Blips light as the line passes them.
     ========================================================= */
  const RANGE = 22000;

  function radar(p, r, dt) {
    const cx = p.w / 2, cy = (p.h - 15) / 2, R = Math.min(cx, cy) - 10;

    ctx.strokeStyle = `rgba(${LAMP},0.16)`;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath(); ctx.arc(cx, cy, R * i / 3, 0, 6.283); ctx.stroke();
    }
    ctx.strokeStyle = `rgba(${LAMP},0.11)`;
    ctx.beginPath();
    ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
    ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
    ctx.stroke();

    sweep += dt * 1.5;
    const ang = sweep % 6.283;

    // the lit wedge trailing the line
    for (let i = 0; i < 14; i++) {
      const a = ang - i * 0.055;
      ctx.strokeStyle = `rgba(${LAMP},${0.26 * (1 - i / 14)})`;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      ctx.stroke();
    }
    ctx.strokeStyle = `rgba(${LAMP},0.85)`;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R);
    ctx.stroke();

    for (const m of (r.marks || [])) {
      const d = m.cam - r.camX;
      const rr = Math.min(1, Math.abs(d) / RANGE);
      if (rr >= 1) continue;
      // west sits left, east right; height on screen tilts it up or down
      const lift = (m.oy - 0.5) * 1.4;
      const base = d >= 0 ? 0 : Math.PI;
      const a = base + Math.atan2(lift, 0.001 + Math.abs(d) / RANGE) * (d >= 0 ? 1 : -1) * 0.5;
      const bx = cx + Math.cos(a) * rr * R;
      const by = cy + Math.sin(a) * rr * R;

      // freshness: bright the moment the sweep crosses it
      const diff = Math.abs(((a - ang + Math.PI * 3) % 6.283) - Math.PI);
      let lit = blips.get(m.id) || 0;
      if (diff > Math.PI - 0.12) lit = 1;
      lit = Math.max(0, lit - dt * 0.55);
      blips.set(m.id, lit);

      const col = m.claimed ? "150,164,160" : LAMP;
      // a soft halo so a blip reads even sitting on a grid line
      const hg = ctx.createRadialGradient(bx, by, 0, bx, by, 9);
      hg.addColorStop(0, `rgba(${col},${0.5 * (0.35 + 0.65 * lit)})`);
      hg.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = hg; ctx.fillRect(bx - 9, by - 9, 18, 18);

      ctx.fillStyle = `rgba(${col},${0.55 + 0.45 * lit})`;
      ctx.beginPath(); ctx.arc(bx, by, m.claimed ? 2 : 3.1, 0, 6.283); ctx.fill();
      if (!m.claimed && lit > 0.2) {
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = `rgba(${LAMP},${lit * 0.75})`;
        ctx.beginPath(); ctx.arc(bx, by, 4 + (1 - lit) * 9, 0, 6.283); ctx.stroke();
        ctx.lineWidth = 1;
      }
    }

    // you, at the centre
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);

    const inRange = (r.marks || []).filter(m => Math.abs(m.cam - r.camX) < RANGE);
    const unclaimed = inRange.filter(m => !m.claimed).length;
    ctx.font = '500 8px "IBM Plex Mono", monospace';
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = `rgba(${DIM},1)`;
    ctx.fillText(inRange.length + " IN RANGE", 5, 12);
    if (unclaimed) {
      ctx.textAlign = "right";
      ctx.fillStyle = `rgba(${LAMP},0.9)`;
      ctx.fillText(unclaimed + " UNFILED", p.w - 5, 12);
      ctx.textAlign = "left";
    }
  }

  /* =========================================================
     SIGNAL — what this place sounds like. Mostly a noise floor
     out in the dark; each landmark has its own shape.
     ========================================================= */
  function signal(p, r, dt) {
    const v = VOICES[r.voice] || VOICES.void;
    const inner = p.h - 15;
    const bw = (p.w - 10) / BANDS;

    for (let i = 0; i < BANDS; i++) {
      const u = i / (BANDS - 1);
      // a band's loudness: distance from this voice's centre, plus its roughness
      const near = Math.exp(-Math.pow((u - v.c) / (v.w * 0.6 + 0.02), 2));
      const grain = (Math.sin(t * (3 + i * 1.7) + i * 2.1) * 0.5 + 0.5);
      const churn = (Math.sin(t * 11 + i * 5.3) * 0.5 + 0.5) * v.rough;
      const target = Math.max(0.02, v.a * near * (0.55 + 0.45 * grain) * (1 - 0.35 * churn)
                    + 0.03 + r.chaos * 0.10 * churn);

      bars[i] += (target - bars[i]) * Math.min(1, dt * 9);
      peaks[i] = Math.max(peaks[i] - dt * 0.35, bars[i]);

      const h = Math.max(1, bars[i] * (inner - 16));
      const x = 5 + i * bw;
      ctx.fillStyle = `rgba(${COLD},${0.45 + 0.5 * bars[i]})`;
      ctx.fillRect(x, inner - 6 - h, bw - 1.6, h);
      ctx.fillStyle = `rgba(${LAMP},0.7)`;
      ctx.fillRect(x, inner - 6 - Math.max(1, peaks[i] * (inner - 16)) - 1, bw - 1.6, 1);
    }

    ctx.font = '500 8px "IBM Plex Mono", monospace';
    ctx.fillStyle = `rgba(${DIM},1)`;
    ctx.textAlign = "left";
    ctx.fillText(v.name.toUpperCase(), 5, 12);
  }

  /* =========================================================
     PHASE — x against y. The shape closes into a clean figure
     where the world is calm and tangles where it isn't.
     ========================================================= */
  function phase(p, r, dt) {
    const cx = p.w / 2, cy = (p.h - 15) / 2, R = Math.min(cx, cy) - 12;

    ctx.strokeStyle = `rgba(${LAMP},0.10)`;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * R * 0.6, cy - R); ctx.lineTo(cx + i * R * 0.6, cy + R);
      ctx.moveTo(cx - R, cy + i * R * 0.6); ctx.lineTo(cx + R, cy + i * R * 0.6);
      ctx.stroke();
    }

    // ratio drifts with chaos, so a stable place draws a stable figure
    const a = 2 + r.chaos * 1.6;
    const b = 3 + Math.sin(r.camX * 0.00002) * 0.5 + r.speedN * 2.2;
    const wob = 0.25 + r.chaos * 1.5;

    trace.length = 0;
    for (let i = 0; i <= 110; i++) {
      const u = i / 110 * 6.283;
      trace.push([
        cx + Math.sin(a * u + t * 0.6) * R * (0.82 + Math.sin(t + u) * 0.05 * wob),
        cy + Math.sin(b * u + t * 0.35) * R * 0.82,
      ]);
    }
    ctx.strokeStyle = `rgba(${LAMP},0.8)`;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    trace.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
    ctx.stroke();

    // the live point running the figure
    const hu = (t * 0.9 % 6.283);
    ctx.fillStyle = "rgba(255,245,220,0.9)";
    ctx.beginPath();
    ctx.arc(cx + Math.sin(a * hu + t * 0.6) * R * 0.82,
            cy + Math.sin(b * hu + t * 0.35) * R * 0.82, 1.6, 0, 6.283);
    ctx.fill();
  }

  /* =========================================================
     RECORDER — the last half minute, scrolling. Two pens:
     speed on top, disturbance beneath.
     ========================================================= */
  function recorder(p, r, dt) {
    const inner = p.h - 15;
    stripAcc += dt;
    if (stripAcc > 0.05) {
      stripAcc = 0;
      strip.push([r.speedN, r.chaos]);
      if (strip.length > 150) strip.shift();
    }

    ctx.strokeStyle = `rgba(${LAMP},0.09)`;
    for (let i = 1; i < 4; i++) {
      const y = inner * i / 4;
      ctx.beginPath(); ctx.moveTo(2, y); ctx.lineTo(p.w - 2, y); ctx.stroke();
    }

    const stepX = (p.w - 8) / 149;
    for (const pen of [0, 1]) {
      ctx.strokeStyle = pen === 0 ? `rgba(${LAMP},0.75)` : `rgba(${BAD},0.55)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      strip.forEach((sm, i) => {
        const x = 4 + i * stepX;
        const y = inner - 5 - sm[pen] * (inner - 14);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    }

    // the live edge
    if (strip.length) {
      const lastS = strip[strip.length - 1];
      const x = 4 + (strip.length - 1) * stepX;
      ctx.fillStyle = `rgba(${LAMP},0.95)`;
      ctx.beginPath();
      ctx.arc(x, inner - 5 - lastS[0] * (inner - 14), 1.7, 0, 6.283);
      ctx.fill();
    }

    ctx.font = '500 8px "IBM Plex Mono", monospace';
    ctx.textAlign = "right";
    ctx.fillStyle = `rgba(${LAMP},0.85)`;
    ctx.fillText(Math.round(Math.abs(r.vel)) + " U/S", p.w - 5, 12);
    ctx.textAlign = "left";
    ctx.fillStyle = `rgba(${DIM},1)`;
    ctx.fillText(r.spanPct.toFixed(1) + "% CROSSED", 5, 12);
  }

  return { mount, draw, setScale, getScale, focus, TOTAL_W, TOTAL_H };
})();
