/* tiles-nav.js — the NAV bank: radar, signal, pull, nav. instruments.js owns
   the banks, the layout, the alarms and the paint loop; this file owns what
   each tile draws and the readings it integrates. Register with the
   framework, which calls back with `F`, the shared kit it needs. */
(function () {
  const { approach } = Util;

  window.Instruments.registerTiles(function (F) {
    const { setFont, mono, fit, fmtK, now, meter, lvCol, blink } = F;
    let { LAMP, READ, COLD, DIM, BAD, WARN, GOOD, CLAIMED, GLINT, VEIL } = F;
    F.onPalette(() => ({ LAMP, READ, COLD, DIM, BAD, WARN, GOOD, CLAIMED, GLINT, VEIL } = F));

    const BANDS = 28;
    const bars = new Float32Array(BANDS);
    const peaks = new Float32Array(BANDS);
    let sweep = 0;
    const blips = new Map();
    const strip = [];
    let stripAcc = 0;
    let chaosNeedle = 0;
    let futureNeedle = 0;
    let nomicNeedle = 0;
    const blipGlow = new Map();

    const VOICES = {
      mainland: { c: 0.42, w: 0.55, a: 0.80, rough: 0.55, name: "dense · many sources" },
      rex:      { c: 0.10, w: 0.22, a: 0.70, rough: 0.10, name: "sub · one source" },
      root:     { c: 0.20, w: 0.75, a: 0.85, rough: 0.95, name: "wet · irregular" },
      watcher:  { c: 0.62, w: 0.07, a: 0.66, rough: 0.04, name: "tone · sustained" },
      bridge:   { c: 0.35, w: 0.90, a: 0.22, rough: 0.30, name: "broadband · faint" },
      future:   { c: 0.88, w: 0.14, a: 0.10, rough: 0.12, name: "near silence" },
      void:     { c: 0.50, w: 1.00, a: 0.05, rough: 0.40, name: "silent · floor only" },
      zero:     { c: 0.50, w: 0.85, a: 0.50, rough: 0.80, name: "STORM" },
      voidscape: { c: 0.78, w: 0.10, a: 0.82, rough: 0.06, name: "FURNACE" },
      heavylight: { c: 0.64, w: 0.12, a: 0.62, rough: 0.08, name: "LAMPS" },
      conclusus: { c: 0.28, w: 0.13, a: 0.60, rough: 0.07, name: "ECHO" },
    };

    /* =========================================================
       RADAR — contacts only. Nearest beacon named. Heading pip.
       ========================================================= */
    const RANGE = 22000;

    /* radar parts that never change: drawn once into the static layer */
    function radarStatic(ctx, p) {
      const inner = p.h - 5;
      const cx = p.w / 2, cy = inner * 0.52, R = Math.min(cx - 8, cy - 14);

      // range rings + labels
      for (let i = 1; i <= 3; i++) {
        ctx.strokeStyle = `rgba(${LAMP},${0.10 + i * 0.02})`;
        ctx.beginPath(); ctx.arc(cx, cy, R * i / 3, 0, 6.283); ctx.stroke();
      }
      ctx.fillStyle = `rgba(${DIM},0.7)`;
      setFont(mono(7));
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
      setFont(mono(7));
      ctx.fillStyle = `rgba(${DIM},0.85)`;
      ctx.textAlign = "center";
      ctx.fillText("W", cx - R + 7, cy + 3);
      ctx.fillText("E", cx + R - 7, cy + 3);
    }

    /* a soft round falloff, cached once per colour and reused for every
       blip of that colour so a paint with many contacts is not building
       a fresh CanvasGradient per blip; pulse is applied over it per draw */
    function blipGlowBitmap(col) {
      let bmp = blipGlow.get(col);
      if (!bmp) {
        bmp = document.createElement("canvas");
        bmp.width = bmp.height = 12;
        const g = bmp.getContext("2d");
        const hg = g.createRadialGradient(6, 6, 0, 6, 6, 6);
        hg.addColorStop(0, `rgba(${col},1)`);
        hg.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = hg;
        g.fillRect(0, 0, 12, 12);
        blipGlow.set(col, bmp);
      }
      return bmp;
    }

    function radar(ctx, p, r, dt) {
      const e = r.env || {};
      const gl = e.glare || 0;
      const jit = e.jitter || 0;
      const inner = p.h - 5;
      const cx = p.w / 2, cy = inner * 0.52, R = Math.min(cx - 8, cy - 14);

      sweep += dt * 1.35;
      const ang = sweep % 6.283;
      const wash = 1 - 0.6 * gl;
      for (let i = 0; i < 16; i++) {
        const a = ang - i * 0.05;
        ctx.strokeStyle = `rgba(${LAMP},${0.28 * (1 - i / 16) * wash})`;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        ctx.stroke();
      }
      ctx.strokeStyle = `rgba(${LAMP},${0.9 * wash})`;
      ctx.lineWidth = 1.6;
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
        let bx = cx + Math.cos(a) * rr * R;
        let by = cy + Math.sin(a) * rr * R;
        bx += (e.n1 || 0) * 4 * jit;
        by += (e.n2 || 0) * 4 * jit;

        const diff = Math.abs(((a - ang + Math.PI * 3) % 6.283) - Math.PI);
        let lit = blips.get(m.id) || 0;
        if (diff > Math.PI - 0.12) lit = 1;
        lit = Math.max(0, lit - dt * 0.55);
        blips.set(m.id, lit);

        const locked = r.ship && r.ship.courseMark === m.id;
        const col = locked ? COLD : (m.claimed ? CLAIMED : LAMP);

        const copies = 1 + Math.round(gl * 2);
        const div = copies * 0.8;
        for (let k = 0; k < copies; k++) {
          const ox = (k - (copies - 1) / 2) * (3 + 5 * gl);
          ctx.save();
          ctx.globalAlpha = (0.55 * (0.35 + 0.65 * lit)) / div;
          ctx.drawImage(blipGlowBitmap(col), bx + ox - 10, by - 10, 20, 20);
          ctx.restore();

          ctx.fillStyle = `rgba(${col},${(0.55 + 0.45 * lit) / div})`;
          ctx.beginPath(); ctx.arc(bx + ox, by, m.claimed ? 2 : 3.2, 0, 6.283); ctx.fill();
        }
        if (locked) {
          ctx.strokeStyle = `rgba(${COLD},0.9)`;
          ctx.strokeRect(bx - 5, by - 5, 10, 10);
        } else if (!m.claimed && lit > 0.2) {
          ctx.strokeStyle = `rgba(${LAMP},${lit * 0.75})`;
          ctx.beginPath(); ctx.arc(bx, by, 4 + (1 - lit) * 8, 0, 6.283); ctx.stroke();
        }
      }

      // a second contact: our own echo, a few px behind us on the sweep (Conclusus)
      const tw = e.twin || 0;
      if (tw > 0.02) {
        const beat = Math.floor((e.t || 0) / 1.2) % 2;   // the 1.2 s switch
        const gx = cx - 7 - beat * 2, gy = cy + 4;
        ctx.save();
        ctx.globalAlpha = tw * (beat ? 0.85 : 0.55);
        ctx.drawImage(blipGlowBitmap(COLD), gx - 10, gy - 10, 20, 20);
        ctx.fillStyle = `rgba(${COLD},0.9)`;
        ctx.beginPath(); ctx.arc(gx, gy, 2.4, 0, 6.283); ctx.fill();
        ctx.strokeStyle = `rgba(${COLD},0.6)`;
        ctx.beginPath(); ctx.arc(gx, gy, 5.5, 0, 6.283); ctx.stroke();
        ctx.restore();
      }

      // ship heading pip
      const head = (r.ship && r.ship.angle != null) ? r.ship.angle : 0;
      ctx.strokeStyle = `rgba(${COLD},0.7)`;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(head) * 10, cy + Math.sin(head) * 10);
      ctx.stroke();
      ctx.fillStyle = `rgba(${GLINT},0.9)`;
      ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);

      const inRange = (r.marks || []).filter(m => Math.abs(m.cam - r.camX) < RANGE);
      const unclaimed = inRange.filter(m => !m.claimed).length;
      setFont(mono(9));
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = `rgba(${DIM},1)`;
      ctx.fillText(inRange.length + " CONTACT", 5, 12);
      ctx.textAlign = "right";
      if (gl > 0.5) {
        ctx.fillStyle = `rgba(${lvCol(gl, 0.55, 0.8)},0.9)`;
        ctx.fillText(`WASH ${Math.round(gl * 100)}%`, p.w - 17, 12);
      } else {
        ctx.fillStyle = unclaimed ? `rgba(${READ},0.9)` : `rgba(${DIM},1)`;
        ctx.fillText(unclaimed ? unclaimed + " OPEN" : "FILED", p.w - 17, 12);
      }

      // nearest callout — the range readout is fixed width, the name takes the rest
      if (nearest && nearestD < RANGE) {
        const label = (nearest.name || nearest.id || "mark").toUpperCase();
        const side = nearest.cam >= r.camX ? "E" : "W";
        const range = side + " " + fmtK(nearestD);
        const baseY = inner - 5;
        setFont(mono(7));
        const rw = ctx.measureText(range).width;
        ctx.textAlign = "right";
        ctx.fillStyle = `rgba(${COLD},0.9)`;
        ctx.fillText(range, p.w - 5, baseY);
        ctx.textAlign = "left";
        ctx.fillStyle = `rgba(${LAMP},0.85)`;
        ctx.fillText(fit(label, p.w - 10 - rw - 6), 5, baseY);
      }

      // glare washes the whole display in a pale veil, over everything else
      if (gl > 0.02) {
        ctx.fillStyle = `rgba(${VEIL},${0.3 * gl})`;
        ctx.fillRect(0, 0, p.w, p.h - 4);
      }
    }

    /* =========================================================
       SIGNAL — spectrum + chaos / unformed / nomic meters + strength.
       ========================================================= */
    function signalStatic(ctx, p) {
      const inner = p.h - 5;
      const y1 = inner - 27, y2 = inner - 18, y3 = inner - 9;
      setFont(mono(7));
      ctx.textAlign = "left";
      ctx.fillStyle = `rgba(${DIM},0.9)`;
      ctx.fillText("CHAOS", 6, y1 + 5);
      ctx.fillText("UNFORMED", 6, y2 + 5);
      ctx.fillText("NOMIC", 6, y3 + 5);
    }

    function signal(ctx, p, r, dt) {
      const e = r.env || {};
      const v = VOICES[r.voice] || VOICES.void;
      const inner = p.h - 5;

      const nomic = e.nomic || 0;
      const contained = e.contained || 0;
      const jitter = e.jitter || 0;
      const frozen = e.frozen || 0;
      const sway = e.sway || 0;

      // the world curve, or a site that bends chaos (the alarm rule in instruments.js reads the same)
      chaosNeedle = approach(chaosNeedle, Math.max(r.chaos || 0, e.chaos || 0), 4, dt);
      futureNeedle = approach(futureNeedle, r.future || 0, 4, dt);
      nomicNeedle = approach(nomicNeedle, nomic, 4, dt);

      /* chaos is a reading, not a fault — it only takes a colour once it is high */
      const chaosCol = lvCol(chaosNeedle, 0.78, 0.92);
      const nomicCol = contained >= 0.5 ? LAMP : lvCol(nomic, 0.6, 0.85);

      const spectrumTop = 16;
      const spectrumBot = inner - 36;
      const spectrumH = spectrumBot - spectrumTop;
      const bw = (p.w - 10) / BANDS;

      // sway drifts the voice centre before it shapes the spectrum
      const c = v.c + sway * 6 * Math.sin(now() * 0.8) / (BANDS - 1);

      for (let i = 0; i < BANDS; i++) {
        const u = i / (BANDS - 1);
        const near = Math.exp(-Math.pow((u - c) / (v.w * 0.6 + 0.02), 2));
        const grain = (Math.sin(now() * (3 + i * 1.7) + i * 2.1) * 0.5 + 0.5) * (1 - frozen);
        const churn = (Math.sin(now() * 11 + i * 5.3) * 0.5 + 0.5) * v.rough;
        const target = Math.max(0.02, v.a * near * (0.55 + 0.45 * grain) * (1 - 0.35 * churn)
                      + 0.03 + chaosNeedle * 0.12 * churn);
        bars[i] += (target - bars[i]) * Math.min(1, dt * 9);
      }

      // nomic — a coherent field combs out four narrow, tall lines
      if (nomic > 0.02) for (const i of [5, 11, 17, 23])
        bars[i] = Math.max(bars[i], nomic * 0.92 + 0.06 * Math.sin(now() * 7 + i));

      // jitter dithers the whole spectrum
      if (jitter) for (let i = 0; i < BANDS; i++)
        bars[i] = Math.min(1, Math.max(0, bars[i] + jitter * 0.4 * (Math.random() - 0.5)));

      // echo mirrors the lower half into the upper, from a copy so it stays symmetric
      if ((e.echo || 0) > 0.5) {
        const copy = bars.slice();
        for (let i = 0; i < BANDS; i++) bars[i] = Math.max(bars[i], copy[27 - i] * 0.8);
      }

      let peak = 0;
      for (let i = 0; i < BANDS; i++) {
        peaks[i] = Math.max(peaks[i] - dt * 0.35, bars[i]);
        peak = Math.max(peak, bars[i]);

        const h = Math.max(1, bars[i] * (spectrumH - 4));
        const x = 5 + i * bw;
        ctx.fillStyle = `rgba(${COLD},${0.4 + 0.55 * bars[i]})`;
        ctx.fillRect(x, spectrumBot - h, bw - 1.4, h);
        const comb = nomic > 0.02 && (i === 5 || i === 11 || i === 17 || i === 23);
        ctx.fillStyle = comb ? `rgba(${nomicCol},0.75)` : `rgba(${LAMP},0.75)`;
        ctx.fillRect(x, spectrumBot - Math.max(1, peaks[i] * (spectrumH - 4)) - 1, bw - 1.4, 1);
      }

      // three meters — chaos / unformed / nomic; labels are static
      const mx = 52, mw = p.w - 86;
      const y1 = inner - 27, y2 = inner - 18, y3 = inner - 9;
      meter(mx, y1, mw, 5, chaosNeedle, chaosCol);
      meter(mx, y2, mw, 5, futureNeedle, COLD);
      meter(mx, y3, mw, 5, nomicNeedle, nomicCol);
      if (contained >= 0.5) {
        // the field is bounded — ring the nomic track to say so
        ctx.strokeStyle = `rgba(${COLD},0.7)`;
        ctx.strokeRect(mx + 0.5, y3 + 0.5, mw - 1, 4);
      }

      setFont(mono(7));
      ctx.textAlign = "right";
      ctx.fillStyle = `rgba(${chaosCol},0.85)`;
      ctx.fillText(chaosNeedle.toFixed(2), p.w - 6, y1 + 5);
      ctx.fillStyle = `rgba(${COLD},0.9)`;
      ctx.fillText(futureNeedle.toFixed(2), p.w - 6, y2 + 5);
      ctx.fillStyle = `rgba(${nomicCol},0.9)`;
      ctx.fillText(nomicNeedle.toFixed(2), p.w - 6, y3 + 5);

      setFont(mono(9));
      ctx.textAlign = "left";
      if (e.site && (e.w || 0) >= 0.5) {
        const siteName = e.siteName || "";
        const tag = e.tag;
        const tagW = ctx.measureText(tag).width;
        ctx.fillStyle = `rgba(${DIM},1)`;
        ctx.fillText(fit(String(siteName).toUpperCase(), p.w - 17 - tagW - 12), 5, 12);
        const cols = [chaosCol, COLD, nomicCol];
        const tagCol = cols.includes(BAD) ? BAD : cols.includes(WARN) ? WARN : LAMP;
        ctx.textAlign = "right";
        ctx.fillStyle = `rgba(${tagCol},0.9)`;
        ctx.fillText(tag, p.w - 17, 12);
      } else {
        const str = "STR " + Math.round(peak * 100);
        const strW = ctx.measureText(str).width;
        ctx.fillStyle = `rgba(${DIM},1)`;
        ctx.fillText(fit(v.name.toUpperCase(), p.w - 17 - strW - 12), 5, 12);
        ctx.textAlign = "right";
        ctx.fillStyle = `rgba(${READ},0.9)`;
        ctx.fillText(str,p.w - 17, 12);
      }
    }

    /* =========================================================
       NAV — speed history, bearing, span bar, course lock.
       ========================================================= */
    function navStatic(ctx, p) {
      const inner = p.h - 5;
      const chartBot = inner - 28;
      const barY = chartBot + 10;

      setFont(mono(7));
      ctx.textAlign = "left";
      ctx.fillStyle = `rgba(${DIM},1)`;
      ctx.fillText("U/S", 5, 32);

      setFont(mono(7));
      ctx.fillStyle = `rgba(${DIM},0.8)`;
      ctx.textAlign = "left";
      ctx.fillText("W", 5, barY - 4);
      ctx.textAlign = "right";
      ctx.fillText("E", p.w - 5, barY - 4);
    }

    function nav(ctx, p, r, dt) {
      const e = r.env || {};
      const inner = p.h - 5;
      const s = r.ship;
      const speedN = s ? s.speedN : r.speedN;
      stripAcc += dt;
      if (stripAcc > 0.045) {
        stripAcc = 0;
        const sn = Math.min(1, Math.max(0, speedN
          + (e.jitter || 0) * 0.25 * (Math.random() - 0.5)
          + (e.sway || 0) * 0.2 * Math.sin(now() * 1.1)));
        strip.push([sn, Math.min(1, Math.abs(r.vel) / 30000), r.chaos || 0]);
        if (strip.length > 160) strip.shift();
      }

      // big digital speed
      setFont(mono(18, "600"));
      ctx.textAlign = "left";
      const speedStr = Math.round(Math.abs(r.vel)).toLocaleString("en-US");
      ctx.fillStyle = `rgba(${READ},0.95)`;
      ctx.fillText(speedStr, 5, 22);

      // right column — camera position, gravity, medium; yields if the speed number runs wide. U/S label is static
      const speedRight = 5 + ctx.measureText(speedStr).width;
      if (speedRight < p.w - 62) {
        const g = e.g || 0;
        const rho = e.rho || 0;
        setFont(mono(9));
        ctx.textAlign = "right";
        ctx.fillStyle = `rgba(${COLD},0.9)`;
        ctx.fillText("X " + fmtK(r.camX), p.w - 6, 21);
        ctx.fillStyle = `rgba(${lvCol(e.gAnom || 0, 0.35, 0.8)},0.9)`;
        ctx.fillText("G " + g.toFixed(2), p.w - 6, 31);
        ctx.fillStyle = `rgba(${DIM},0.9)`;
        ctx.fillText("ρ " + rho.toFixed(2), p.w - 6, 41);
      }

      // strip chart
      const chartTop = 46, chartBot = inner - 28;
      const chartH = chartBot - chartTop;
      ctx.strokeStyle = `rgba(${LAMP},0.08)`;
      for (let i = 1; i < 3; i++) {
        const y = chartTop + chartH * i / 3;
        ctx.beginPath(); ctx.moveTo(4, y); ctx.lineTo(p.w - 4, y); ctx.stroke();
      }
      const stepX = (p.w - 10) / Math.max(1, 159);
      ctx.strokeStyle = `rgba(${LAMP},0.8)`;
      ctx.lineWidth = 1.6;
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

      // span position bar — W/E labels are static
      // spanPct is "% crossed" from east-ish; bar shows you on the line
      const you = Math.min(1, Math.max(0, (r.spanPct || 0) / 100));
      const barY = chartBot + 10;
      ctx.fillStyle = `rgba(${DIM},0.25)`;
      ctx.fillRect(5, barY, p.w - 10, 3);
      ctx.fillStyle = `rgba(${LAMP},0.85)`;
      ctx.fillRect(5 + (p.w - 10) * you - 1, barY - 2, 2, 7);

      // bottom line — RUN keeps its width, the status text gets what is left
      const baseY = inner - 4;
      setFont(mono(7));
      const run = r.travelled != null ? fmtK(r.travelled) + " RUN" : "";
      const rw = run ? ctx.measureText(run).width + 6 : 0;
      if (run) {
        ctx.textAlign = "right";
        ctx.fillStyle = `rgba(${GOOD},0.85)`;
        ctx.fillText(run, p.w - 5, baseY);
      }
      let stat = null, statCol = DIM;
      if (s && s.courseName) { stat = "LOCK " + s.courseName.toUpperCase(); statCol = COLD; }
      else if (s && s.burning) { stat = "BURNING"; statCol = LAMP; }
      else if (r.region) { stat = String(r.region).toUpperCase(); }
      if (stat) {
        ctx.textAlign = "left";
        ctx.fillStyle = `rgba(${statCol},0.95)`;
        ctx.fillText(fit(stat, p.w - 10 - rw), 5, baseY);
      }
    }

    /* =========================================================
       PULL — a ball drawn toward the nearest beacon; chevrons on the
       ring show the ship's real motion. One ring, no scale.
       ========================================================= */
    let ballX = 0, ballY = 0;
    const PULL_R = 44;

    function pullStatic(ctx, p) {
      const cx = p.w / 2, cy = (p.h - 5) / 2;
      ctx.strokeStyle = `rgba(${LAMP},0.3)`;
      ctx.beginPath(); ctx.arc(cx, cy, PULL_R, 0, 6.283); ctx.stroke();
    }

    function pull(ctx, p, r, dt) {
      const e = r.env || {};
      const gl = e.glare || 0;
      const jit = e.jitter || 0;
      const inner = p.h - 5;
      const cx = p.w / 2, cy = inner / 2, R = PULL_R;
      const marks = r.marks || [];

      // nearest beacon in range, and every one in range as a dot inside the ring
      let nearest = null, nearestD = RANGE, nearA = 0;
      for (let i = 0; i < marks.length; i++) {
        const m = marks[i];
        const d = m.cam - r.camX, ad = Math.abs(d);
        if (ad >= RANGE) continue;
        const a = (d >= 0 ? 0 : Math.PI) + Math.atan2((m.oy - 0.5) * 1.4, 0.001 + ad / RANGE) * (d >= 0 ? 1 : -1) * 0.5;
        if (ad < nearestD) { nearestD = ad; nearest = m; nearA = a; }
        const rr = ad / RANGE * (R - 6);
        const dx = cx + Math.cos(a) * rr + (e.n1 || 0) * 2 * jit;
        const dy = cy + Math.sin(a) * rr + (e.n2 || 0) * 2 * jit;
        ctx.beginPath(); ctx.arc(dx, dy, 2, 0, 6.283);
        if (m.claimed) {
          ctx.strokeStyle = `rgba(${CLAIMED},0.8)`; ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(${LAMP},0.8)`; ctx.fill();
        }
      }

      // the ball is eased toward its pull: 0 at the range edge, 0.85 R on arrival
      const mag = nearest ? (1 - nearestD / RANGE) * 0.85 * R : 0;
      const tx = nearest ? Math.cos(nearA) * mag : 0;
      const ty = nearest ? Math.sin(nearA) * mag : 0;
      ballX += (tx - ballX) * 0.12;
      ballY += (ty - ballY) * 0.12;
      const bx = cx + ballX + (e.n1 || 0) * 3 * jit;
      const by = cy + ballY + (e.n2 || 0) * 3 * jit;
      const bl = Math.hypot(ballX, ballY) || 1;
      const hx = ballX / bl, hy = ballY / bl;
      ctx.strokeStyle = `rgba(${nearest ? COLD : LAMP},0.95)`;
      ctx.fillStyle = `rgba(${LAMP},0.14)`;
      ctx.beginPath(); ctx.arc(bx, by, 7, 0, 6.283); ctx.fill(); ctx.stroke();
      if (nearest) {
        ctx.beginPath();
        ctx.moveTo(bx + hx * 7, by + hy * 7);
        ctx.lineTo(bx + hx * 11, by + hy * 11);
        ctx.stroke();
      }

      // chevrons: the ship's real velocity, count by speed, none when stopped
      const s = r.ship;
      const vy = s && s.vy ? s.vy : 0;
      const sp = Math.max(Math.abs(r.vel || 0) / 30000, Math.abs(vy) / 600);
      const n = sp < 0.04 ? 0 : sp < 0.3 ? 1 : sp < 0.65 ? 2 : 3;
      if (n) {
        const b = Math.atan2(vy / 600, (r.vel || 0) / 30000);
        const ux = Math.cos(b), uy = Math.sin(b);
        ctx.strokeStyle = `rgba(${READ},0.9)`;
        for (let k = 0; k < n; k++) {
          const rad = R + 5 + k * 4;
          const tx2 = cx + ux * rad, ty2 = cy + uy * rad;
          // wings sweep back from the tip, +-0.7 rad off the reverse direction
          const w1 = b + Math.PI - 0.7, w2 = b + Math.PI + 0.7;
          ctx.beginPath();
          ctx.moveTo(tx2 + Math.cos(w1) * 4, ty2 + Math.sin(w1) * 4);
          ctx.lineTo(tx2, ty2);
          ctx.lineTo(tx2 + Math.cos(w2) * 4, ty2 + Math.sin(w2) * 4);
          ctx.stroke();
        }
      }

      setFont(mono(9));
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      ctx.fillStyle = `rgba(${DIM},1)`;
      ctx.fillText("PULL", 5, 12);
      ctx.textAlign = "right";
      ctx.fillStyle = `rgba(${nearest ? LAMP : DIM},0.9)`;
      ctx.fillText(nearest ? fit((nearest.name || nearest.id || "mark").toUpperCase(), p.w - 40) : "NONE", p.w - 5, inner - 5);

      if (gl > 0.02) {
        ctx.fillStyle = `rgba(${VEIL},${0.3 * gl})`;
        ctx.fillRect(0, 0, p.w, p.h - 4);
      }
    }

    return {
      paint: { radar, signal, rec: nav, pull },
      paintStatic: { radar: radarStatic, signal: signalStatic, rec: navStatic, pull: pullStatic },
    };
  });
})();
