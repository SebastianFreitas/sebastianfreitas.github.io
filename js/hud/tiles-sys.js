/* tiles-sys.js — the SYS bank: tickSys, eclss, rad, hull, bus, impact,
   setRepair. instruments.js owns the banks, the layout, the alarms and the
   paint loop; this file owns what each tile draws and the readings it
   integrates. Register with the framework, which calls back with `F`, the
   shared kit it needs. */
(function () {
  const { approach, clamp, wrapPi } = Util;

  window.Instruments.registerTiles(function (F) {
    const { LAMP, COLD, DIM, BAD, WARN, GOOD, setFont, mono, spark, meter, lvCol, blink } = F;

    const radStrip = [];
    let radAcc = 0;
    const co2Strip = [];
    let co2Acc = 0;
    const magTrace = [];
    let magAcc = 1 / 60;
    /* the strips and the scope trace sample on time, not on frames, so a
       high-refresh screen doesn't shorten them. A sample this close to due
       still counts, or timestamp jitter would skip one at 60 Hz. */
    const MAG_STEP = 1 / 60;
    const SAMPLE_SLACK = 0.002;
    let lastImpact = null;
    const TRACE_N = 56;
    const strikeTrace = new Float32Array(TRACE_N);   // newest sample last
    let traceAcc = 0;
    const repairing = new Set();   // hull sectors the bridge log says are under patch
    let repairAge = 0;
    let impactCool = 2.4;
    let prevAng = 0, omega = 0;
    let sys = {
      o2: 20.95, co2: 420, kpa: 101.3, rh: 40,
      dose: 0.013, mag: 45.2, bx: 0, by: 0,
      hullT: -48, cabT: 21.2, hx: 0.12, hullInt: 1, wear: 0,
    };

    /* =========================================================
       SYS bank — cabin, dose, skin, bus. Numbers first.
       ========================================================= */
    function tickSys(dt, r) {
      const e = r.env || {};
      const wp = Math.max(0, e.wear || 0), wn = Math.max(0, -(e.wear || 0));
      const jit = e.jitter || 0, fz = 1 - (e.frozen || 0);
      repairAge = repairing.size ? repairAge + dt : 0;
      const chaos = r.chaos || 0;
      const future = r.future || 0;
      const s = r.ship;
      const thrust = s ? s.thrust : 0;
      const speedN = s ? s.speedN : 0;

      const o2T  = 20.95 + Math.sin(F.now() * 0.31) * 0.05 * fz - chaos * 0.12 - thrust * 0.05
        - 1.4 * wp + 0.25 * jit * (e.n1 || 0);
      const co2T = 412 + Math.sin(F.now() * 0.17) * 24 * fz + chaos * 180 + thrust * 90
        + 1500 * wp + 120 * jit * (e.n2 || 0);
      const kpaT = 101.3 + Math.sin(F.now() * 0.22) * 0.11 - future * 6.2 - chaos * 0.35
        - 3.5 * wp + 1.5 * jit * (e.n3 || 0);
      const rhT  = 39.4 + Math.sin(F.now() * 0.41) * 2.2 * fz + chaos * 3 - future * 4;
      sys.o2  = approach(sys.o2,  o2T,  3, dt);
      sys.co2 = approach(sys.co2, co2T, 2.4, dt);
      sys.kpa = approach(sys.kpa, kpaT, 2.2, dt);
      sys.rh  = approach(sys.rh,  rhT,  2.6, dt);

      co2Acc += dt;
      if (co2Acc >= 0.06 - SAMPLE_SLACK) {
        // keep the leftover so the spacing averages 0.06 s; a stall adds one sample, not a burst
        co2Acc = Math.min(co2Acc - 0.06, 0.06);
        co2Strip.push(sys.co2);
        if (co2Strip.length > 72) co2Strip.shift();
      }

      /* a flare is a spike, not a season: a narrow peak, and only where the
         field is genuinely torn */
      const flare = chaos > 0.82
        ? Math.pow(Math.max(0, Math.sin(F.now() * 0.19)), 26) * chaos
        : 0;
      const doseT = 0.013 + chaos * 0.022 + flare * 1.65
        + (Math.sin(F.now() * 2.4) * 0.5 + 0.5) * 0.002
        + 0.9 * (e.rad || 0) + 0.05 * jit * Math.abs(e.n1 || 0);
      sys.dose = approach(sys.dose, doseT, 5, dt);
      radAcc += dt;
      if (radAcc >= 0.05 - SAMPLE_SLACK) {
        radAcc = Math.min(radAcc - 0.05, 0.05);
        radStrip.push(sys.dose);
        if (radStrip.length > 80) radStrip.shift();
      }

      const magBase = 45.2 * (1 - future * 0.62) * (1 - chaos * 0.18);
      const wobble = 0.35 + chaos * 1.4 + future * 2.2;
      sys.bx = Math.sin(F.now() * 1.35 + future * F.now() * 0.4) * wobble * fz;
      sys.by = Math.cos(F.now() * 1.08 + chaos * 2.1) * (0.3 + future * 1.1) * fz;
      const swayMag = 1 + 0.8 * (e.sway || 0) * Math.sin(F.now() * 0.9);
      sys.mag = approach(sys.mag, Math.max(0.4, (magBase + sys.bx * 0.15) * swayMag), 4, dt);
      magAcc += dt;
      if (magAcc >= MAG_STEP - SAMPLE_SLACK) {
        magAcc = Math.min(magAcc - MAG_STEP, MAG_STEP);
        magTrace.push([sys.bx, sys.by]);
        if (magTrace.length > 40) magTrace.shift();
      }

      const hullT = -40 - future * 86 + thrust * 95 + Math.sin(F.now() * 0.48) * 1.6
        + (lastImpact && lastImpact.age < 2 ? 8 : 0)
        + 120 * (e.heat || 0) + 25 * jit * (e.n1 || 0);
      const cabT = 21.15 + Math.sin(F.now() * 0.29) * 0.22 * fz + chaos * 0.7 - future * 0.4;
      const hxT = clamp(0.09 + thrust * 0.68 + chaos * 0.08 + 0.2 * (e.heat || 0), 0, 1);
      sys.hullT = approach(sys.hullT, hullT, 2.5, dt);
      sys.cabT  = approach(sys.cabT,  cabT,  3, dt);
      sys.hx    = approach(sys.hx,   hxT,   4, dt);

      sys.hullInt = clamp(sys.hullInt + dt * (-0.05 * wp + 0.12 * wn + (wp < 0.05 ? 0.006 : 0)), 0.3, 1);
      sys.wear = e.wear || 0;

      if (lastImpact) lastImpact.age += dt;
      traceAcc += dt;
      while (traceAcc >= 1 / 12) {
        traceAcc -= 1 / 12;
        const wp2 = Math.max(0, sys.wear);
        let v = (Math.random() - 0.5) * (0.05 + 0.3 * wp2);
        if (lastImpact && lastImpact.age < 1.6) {
          const a = lastImpact.age;
          v += Math.min(1, lastImpact.g / 2.5) * (1 - a / 1.6) * Math.sin(a * 38);
        }
        strikeTrace.copyWithin(0, 1);
        strikeTrace[TRACE_N - 1] = Math.max(-1, Math.min(1, v));
      }
      impactCool -= dt;
      const pHit = dt * (0.008 + speedN * 0.09) * (0.03 + chaos * 0.4) * (1 + 2 * wp);
      if (impactCool <= 0 && Math.random() < pHit) {
        lastImpact = {
          g: 0.06 + Math.random() * (0.12 + chaos * 0.85 + speedN * 0.25),
          sector: 1 + (Math.floor(Math.random() * 8)),
          age: 0,
        };
        impactCool = 4 + Math.random() * 7;
      }

      const ang = s && s.angle != null ? s.angle : 0;
      omega = dt > 0 ? wrapPi(ang - prevAng) / dt : 0;
      prevAng = ang;
    }

    function eclss(ctx, p, r) {
      const inner = p.h - 5;
      const barX = 30, barR = p.w - 46, barW = barR - barX;
      const rows = [
        { y: 26, val: sys.o2.toFixed(2),
          v: (sys.o2 - 17) / 6, col: sys.o2 < 19.0 ? BAD : sys.o2 < 19.6 ? WARN : LAMP,
          bLo: (20.4 - 17) / 6, bHi: (21.2 - 17) / 6 },
        { y: 41, val: Math.round(sys.co2).toString(),
          v: sys.co2 / 2400, col: sys.co2 > 1800 ? BAD : sys.co2 > 1200 ? WARN : LAMP,
          bLo: 0, bHi: 1000 / 2400 },
        { y: 56, val: sys.kpa.toFixed(1),
          v: (sys.kpa - 85) / 20, col: sys.kpa < 92 ? BAD : sys.kpa < 95.6 ? WARN : LAMP,
          bLo: (99 - 85) / 20, bHi: (103 - 85) / 20 },
        { y: 71, val: sys.rh.toFixed(1),
          v: (sys.rh - 20) / 50, col: (sys.rh < 30 || sys.rh > 55) ? WARN : LAMP,
          bLo: (35 - 20) / 50, bHi: (50 - 20) / 50 },
      ];
      const worst = rows.reduce((m, row) => Math.max(m, row.col === BAD ? 2 : row.col === WARN ? 1 : 0), 0);

      setFont(mono(9));
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = worst === 2 ? `rgba(${BAD},1)` : worst === 1 ? `rgba(${WARN},1)` : `rgba(${GOOD},0.9)`;
      ctx.fillText(worst === 2 ? "FAULT" : worst === 1 ? "WARN" : "NOM", 5, 12);

      rows.forEach(row => {
        ctx.fillStyle = `rgba(${COLD},0.25)`;
        ctx.fillRect(barX + row.bLo * barW, row.y - 0.5, (row.bHi - row.bLo) * barW, 6);
        meter(barX, row.y, barW, 5, row.v, row.col);
        setFont(mono(10, "600"));
        ctx.textAlign = "right";
        ctx.fillStyle = `rgba(${row.col},0.95)`;
        ctx.fillText(row.val, p.w - 6, row.y);
      });

      const chartTop = 84, chartBot = inner - 6, chartH = chartBot - chartTop;
      ctx.fillStyle = `rgba(${DIM},0.18)`;
      ctx.fillRect(5, chartTop, p.w - 10, chartH);
      spark(co2Strip, 5, chartBot, p.w - 10, chartH, sys.co2 > 1200 ? BAD : COLD, 0.75);

      void r;
    }

    /* row labels and the CABIN title never change: drawn once into the static layer */
    function eclssStatic(ctx, p) {
      setFont(mono(7));
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = `rgba(${DIM},0.95)`;
      ctx.fillText("O2",  6, 26);
      ctx.fillText("CO2", 6, 41);
      ctx.fillText("P",   6, 56);
      ctx.fillText("RH",  6, 71);
      setFont(mono(9));
      ctx.textAlign = "right";
      ctx.fillStyle = `rgba(${DIM},1)`;
      ctx.fillText("CABIN", p.w - 17, 12);
    }

    function rad(ctx, p, r) {
      const e = r.env || {};
      const inner = p.h - 5;
      const event = sys.dose > 0.16;
      const evCol = sys.dose > 0.50 ? BAD : WARN;
      setFont(mono(18, "600"));
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = `rgba(${lvCol(sys.dose, 0.16, 0.5)},0.95)`;
      ctx.fillText(sys.dose < 0.1 ? sys.dose.toFixed(3) : sys.dose.toFixed(2), 5, 22);

      ctx.textAlign = "right";
      setFont(mono(9));
      ctx.fillStyle = event ? `rgba(${evCol},0.95)` : `rgba(${DIM},1)`;
      ctx.fillText(event ? "EVENT" : "QUIET", p.w - 17, 14);
      ctx.fillStyle = `rgba(${COLD},0.85)`;
      ctx.fillText((sys.dose * 24).toFixed(2) + " /d", p.w - 5, 26);

      const chartTop = 38, chartBot = inner - 38, chartH = chartBot - chartTop;
      ctx.strokeStyle = `rgba(${LAMP},0.08)`;
      ctx.beginPath(); ctx.moveTo(4, chartTop + chartH * 0.5); ctx.lineTo(p.w - 4, chartTop + chartH * 0.5); ctx.stroke();
      spark(radStrip, 5, chartBot, p.w - 10, chartH, event ? evCol : LAMP, 0.85);

      const magHot = sys.mag < 14 || (r.future || 0) > 0.88 || (e.sway || 0) > 0.6;
      setFont(mono(8));
      ctx.textAlign = "left";
      ctx.fillStyle = magHot ? `rgba(${WARN},0.9)` : `rgba(${DIM},1)`;
      ctx.fillText("B " + sys.mag.toFixed(1) + " µT", 5, inner - 4);
      ctx.textAlign = "right";
      ctx.fillStyle = magHot ? `rgba(${WARN},0.85)` : `rgba(${COLD},0.85)`;
      ctx.fillText(magHot ? "SHEAR" : "MAG", p.w - 32, inner - 4);

      const mx = p.w - 18, my = inner - 16, mR = 11;
      ctx.strokeStyle = `rgba(${LAMP},0.22)`;
      ctx.beginPath(); ctx.arc(mx, my, mR, 0, 6.283); ctx.stroke();
      ctx.strokeStyle = `rgba(${DIM},0.25)`;
      ctx.beginPath();
      ctx.moveTo(mx - mR, my); ctx.lineTo(mx + mR, my);
      ctx.moveTo(mx, my - mR); ctx.lineTo(mx, my + mR);
      ctx.stroke();
      const traceR = (mR - 2) * (1 + 0.6 * (e.sway || 0));
      if (magTrace.length > 1) {
        ctx.strokeStyle = `rgba(${COLD},0.35)`;
        ctx.beginPath();
        magTrace.forEach((v, i) => {
          const x = mx + clamp(v[0], -1.2, 1.2) / 1.2 * traceR;
          const y = my + clamp(v[1], -1.2, 1.2) / 1.2 * traceR;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
      }
      const dx = mx + clamp(sys.bx, -1.2, 1.2) / 1.2 * traceR;
      const dy = my + clamp(sys.by, -1.2, 1.2) / 1.2 * traceR;
      ctx.fillStyle = magHot ? `rgba(${WARN},0.95)` : `rgba(${LAMP},0.95)`;
      ctx.fillRect(dx - 1.4, dy - 1.4, 2.8, 2.8);
    }

    /* the unit label under the dose reading never changes: drawn once into the static layer */
    function radStatic(ctx, p) {
      setFont(mono(8));
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = `rgba(${DIM},1)`;
      ctx.fillText("mSv/h", 5, 32);
      void p;
    }

    /* the bridge log drives real strikes and patches; the panel just shows them */
    function impact(sector, g) {
      const sec = Math.max(1, Math.min(8, Math.round(sector) || 1));
      lastImpact = { g: Math.max(0.02, g || 0.2), sector: sec, age: 0 };
      impactCool = 4;
    }

    function setRepair(sector, on) {
      const sec = Math.max(1, Math.min(8, Math.round(sector) || 1));
      const wasEmpty = repairing.size === 0;
      if (on) repairing.add(sec); else repairing.delete(sec);
      if (on && wasEmpty) repairAge = 0;
    }

    function hull(ctx, p, r) {
      const inner = p.h - 5;
      const live = lastImpact && lastImpact.age < 1.2;
      const bigHit = live && lastImpact.g > 1.1;
      const recent = lastImpact && lastImpact.age < 6;
      const patching = repairing.size > 0;
      const wear = sys.wear, wp = Math.max(0, wear), wn = Math.max(0, -wear);
      setFont(mono(9));
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = live ? `rgba(${bigHit ? BAD : WARN},1)`
        : patching ? `rgba(${WARN},0.8)`
        : wear > 0.3 ? `rgba(${lvCol(wear, 0.3, 0.65)},1)`
        : wear < -0.1 ? `rgba(${GOOD},0.9)`
        : `rgba(${DIM},1)`;
      ctx.fillText(live ? "IMPACT" : patching ? "REPAIR" : wear > 0.3 ? "STRESS" : wear < -0.1 ? "REGEN" : "CLEAR", 5, 12);
      ctx.textAlign = "right";
      ctx.fillStyle = `rgba(${DIM},0.9)`;
      ctx.fillText(recent ? ("SEC " + lastImpact.sector) : "SKIN", p.w - 17, 12);

      const intY = inner - 28;                 // the existing INT meter y — keep the existing meter line using it
      const traceBot = intY - 9, traceTop = traceBot - 24;
      const traceMid = (traceTop + traceBot) / 2, traceAmp = (traceBot - traceTop) / 2 - 1;
      const traceX0 = 6, traceX1 = p.w - 6;
      const labelY = traceTop - 4;             // baseline of the STRIKE row
      const shipTop = 18, shipBot = labelY - 9;
      const cy = (shipTop + shipBot) / 2;
      const maxHalf = Math.min(11, (shipBot - shipTop) / 2);
      const x0 = 14, x1 = p.w - 14;            // tail (left) .. nose (right)
      const halfH = (x) => { const u = (x - x0) / (x1 - x0); return 2 + (maxHalf - 2) * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u))), 0.6); };

      if (shipBot - shipTop >= 6) {
        for (let i = 0; i < 8; i++) {
          const sctr = i + 1;
          const c = i % 4;
          const top = i < 4;
          const hot = lastImpact && lastImpact.sector === sctr && lastImpact.age < 4;
          const fix = !hot && repairing.has(sctr);
          /* a patch under way, or the skin under load, always wins over the ambient flicker below */
          const stressed = !hot && !fix && wp > 0.05
            && Util.hash1(sctr * 131 + Math.floor(F.now() * 3)) < wp * 0.6;
          const regen = !hot && !fix && !stressed && wn > 0.05;
          const fade = hot ? Math.max(0.25, 1 - lastImpact.age / 4) : 0;
          const pulse = 0.35 + 0.3 * blink(0.7);
          const stressCol = wp > 0.65 ? BAD : WARN;
          const stressA = 0.35 + 0.25 * wp;
          const regenA = 0.22 + 0.25 * wn * blink(0.7);

          const xa = x1 - (c + 1) * (x1 - x0) / 4 + 1;
          const xb = x1 - c * (x1 - x0) / 4 - 1;
          ctx.beginPath();
          ctx.moveTo(xa, cy);
          for (let k = 0; k <= 5; k++) {
            const x = xa + (xb - xa) * k / 5;
            const h = halfH(x) - 1;
            ctx.lineTo(x, top ? cy - h : cy + h);
          }
          ctx.lineTo(xb, cy);
          ctx.closePath();
          ctx.fillStyle = hot ? `rgba(${BAD},${0.35 + 0.55 * fade})`
            : fix ? `rgba(${WARN},${pulse})`
            : stressed ? `rgba(${stressCol},${stressA})`
            : regen ? `rgba(${GOOD},${regenA})`
            : `rgba(${COLD},0.16)`;
          ctx.fill();
          ctx.strokeStyle = hot ? `rgba(${BAD},0.9)`
            : fix ? `rgba(${WARN},0.9)`
            : `rgba(${DIM},0.4)`;
          ctx.lineWidth = 1;
          ctx.stroke();

          if (hot && lastImpact.age < 1.2) {
            const bx = (xa + xb) / 2;
            const by = top ? cy - halfH(bx) * 0.5 : cy + halfH(bx) * 0.5;
            ctx.strokeStyle = `rgba(${BAD},${0.8 * (1 - lastImpact.age / 1.2)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(bx, by, 3 + lastImpact.age * 14, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        ctx.fillStyle = `rgba(${LAMP},0.8)`;
        ctx.fillRect(x0 - 5, cy - 1.5, 5, 3);
      }

      setFont(mono(7));
      ctx.textAlign = "left";
      ctx.fillStyle = lastImpact ? `rgba(${COLD},0.85)` : `rgba(${DIM},0.6)`;
      ctx.fillText(lastImpact ? "T+" + lastImpact.age.toFixed(1) + "s" : "NONE", 6 + 34, labelY);
      if (lastImpact) {
        setFont(mono(9, "600"));
        ctx.textAlign = "right";
        ctx.fillStyle = live ? `rgba(${BAD},0.95)` : `rgba(${LAMP},0.9)`;
        ctx.fillText(lastImpact.g.toFixed(2) + "g", p.w - 6, labelY);
      }

      ctx.fillStyle = `rgba(${DIM},0.08)`;
      ctx.fillRect(traceX0, traceTop, traceX1 - traceX0, traceBot - traceTop);
      ctx.strokeStyle = `rgba(${DIM},0.25)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(traceX0, traceMid);
      ctx.lineTo(traceX1, traceMid);
      ctx.stroke();
      ctx.strokeStyle = live ? `rgba(${BAD},0.9)` : `rgba(${COLD},0.85)`;
      ctx.beginPath();
      for (let k = 0; k < TRACE_N; k++) {
        const x = traceX0 + (traceX1 - traceX0) * k / (TRACE_N - 1);
        const y = traceMid - strikeTrace[k] * traceAmp;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      const hullInt = sys.hullInt;
      const intCol = hullInt < 0.6 ? BAD : hullInt < 0.85 ? WARN : LAMP;
      meter(30, intY, p.w - 40 - 30, 5, hullInt, intCol);
      setFont(mono(9, "600"));
      ctx.textAlign = "right";
      ctx.fillStyle = `rgba(${intCol},0.95)`;
      ctx.fillText(Math.round(hullInt * 100) + "%", p.w - 6, inner - 23);

      const rowBY = inner - 4;
      setFont(mono(9, "600"));
      ctx.textAlign = "left";
      ctx.fillStyle = `rgba(${LAMP},0.95)`;
      ctx.fillText(Math.round(sys.hullT) + "°", 6, rowBY);
      const wearTxt = wear > 0.05 ? "×" + (1 + 14 * wear).toFixed(1) : wear < -0.05 ? "REGEN" : "×1.0";
      const wearCol = wear > 0.05 ? lvCol(wear, 0.3, 0.65) : wear < -0.05 ? GOOD : LAMP;
      ctx.fillStyle = `rgba(${wearCol},0.95)`;
      ctx.fillText(wearTxt, 62, rowBY);
      ctx.fillStyle = `rgba(${LAMP},0.95)`;
      ctx.fillText(Math.round(sys.hx * 100) + "%", 118, rowBY);

      void r;
    }

    /* the ring's centre glyph is dynamic; only the bottom-row labels are fixed */
    function hullStatic(ctx, p) {
      const inner = p.h - 5;
      setFont(mono(7));
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = `rgba(${DIM},0.95)`;
      ctx.fillText("INT", 6, inner - 23);
      ctx.fillText("STRIKE", 6, (inner - 28) - 9 - 24 - 4);
      ctx.fillText("HULL", 6, inner - 13);
      ctx.fillText("WEAR", 62, inner - 13);
      ctx.fillText("HX", 118, inner - 13);
    }

    function bus(ctx, p, r) {
      const e = r.env || {};
      const inner = p.h - 5;
      const s = r.ship;
      const thrust = s ? s.thrust : 0;
      const burning = !!(s && s.burning);
      const pitch = s && s.vy != null ? clamp(-s.vy / 9, -22, 22) : 0;
      const yawDeg = s && s.angle != null
        ? ((s.angle * 180 / Math.PI) % 360 + 360) % 360
        : 0;
      const roll = s && s.bank != null ? s.bank * 180 / Math.PI : 0;

      const vBus = 28.05 - thrust * 1.55 + Math.sin(F.now() * 4.1) * 0.04
        - 2.6 * (e.sway || 0) * (0.5 + 0.5 * Math.sin(F.now() * 1.3));
      const jitterN = 0.15 * (e.jitter || 0) * (e.n2 || 0);
      const loads = [
        { name: "LIFE", n: 0.17 + 0.015 * Math.sin(F.now() * 0.55) },
        { name: "DRV",  n: 0.07 + thrust * 0.74 },
        { name: "THM",  n: 0.10 + sys.hx * 0.35 },
        { name: "GNC",  n: 0.06 + Math.min(0.18, Math.abs(omega) * 0.04) },
      ];

      setFont(mono(9));
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = `rgba(${DIM},1)`;
      ctx.fillText("LOAD", 5, 12);
      ctx.textAlign = "right";
      if ((e.link || 0) > 0.5) {
        ctx.fillStyle = `rgba(${COLD},0.95)`;
        ctx.fillText("UPLINK", p.w - 17, 12);
      } else {
        ctx.fillStyle = vBus < 26.5 ? `rgba(${BAD},0.95)` : `rgba(${LAMP},0.9)`;
        ctx.fillText(vBus.toFixed(1) + " V", p.w - 17, 12);
      }

      const row0 = 20, rowH = 13, barX = 36, barW = p.w - 72;
      loads.forEach((l, i) => {
        const y = row0 + i * rowH;
        const n = clamp(l.n + jitterN, 0, 1);
        ctx.fillStyle = `rgba(${DIM},0.22)`;
        ctx.fillRect(barX, y, barW, 7);
        ctx.fillStyle = `rgba(${l.name === "DRV" && burning ? LAMP : COLD},0.85)`;
        ctx.fillRect(barX, y, barW * n, 7);
        setFont(mono(7));
        ctx.textAlign = "right";
        ctx.fillStyle = `rgba(${LAMP},0.85)`;
        ctx.fillText((n * 8.4).toFixed(1), p.w - 5, y + 6);
      });

      const imuY = row0 + 4 * rowH + 11;
      const colW = (p.w - 10) / 3;
      const imu = [
        ["P", (pitch >= 0 ? "+" : "") + pitch.toFixed(1), LAMP],
        ["Y", yawDeg.toFixed(0), COLD],
        ["R", (roll >= 0 ? "+" : "") + roll.toFixed(1), LAMP],
      ];
      imu.forEach(([lab, val, col], i) => {
        const x = 5 + i * colW;
        setFont(mono(8));
        ctx.textAlign = "left";
        ctx.fillStyle = `rgba(${col},0.9)`;
        ctx.fillText(val, x + 11, imuY);
      });

      const pc = 0.12 + thrust * 2.55;
      const flow = thrust * 16.8;
      const tvc = roll * 0.85;
      const py = inner - 4;
      setFont(mono(8));
      ctx.textAlign = "left";
      ctx.fillStyle = burning ? `rgba(${LAMP},0.95)` : `rgba(${DIM},0.9)`;
      ctx.fillText(pc.toFixed(2) + " MPa", 5, py);
      ctx.textAlign = "center";
      ctx.fillStyle = burning ? `rgba(${LAMP},0.95)` : `rgba(${DIM},0.9)`;
      ctx.fillText(flow.toFixed(1) + " kg/s", p.w * 0.5, py);
      ctx.textAlign = "right";
      ctx.fillStyle = `rgba(${COLD},0.95)`;
      ctx.fillText((tvc >= 0 ? "+" : "") + tvc.toFixed(1) + "°", p.w - 5, py);
    }

    /* the LIFE/DRV/THM/GNC, P/Y/R and Pc/FLOW/TVC labels never move: drawn once into the static layer */
    function busStatic(ctx, p) {
      const inner = p.h - 5;
      setFont(mono(7));
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = `rgba(${DIM},0.95)`;
      const row0 = 20, rowH = 13;
      ["LIFE", "DRV", "THM", "GNC"].forEach((name, i) => {
        ctx.fillText(name, 5, row0 + i * rowH + 6);
      });

      const imuY = row0 + 4 * rowH + 11;
      const colW = (p.w - 10) / 3;
      setFont(mono(8));
      ctx.fillStyle = `rgba(${DIM},0.85)`;
      ["P", "Y", "R"].forEach((lab, i) => {
        ctx.fillText(lab, 5 + i * colW, imuY);
      });

      const py = inner - 4;
      ctx.fillStyle = `rgba(${DIM},0.95)`;
      ctx.textAlign = "left";
      ctx.fillText("Pc", 5, py - 12);
      ctx.textAlign = "center";
      ctx.fillText("FLOW", p.w * 0.5, py - 12);
      ctx.textAlign = "right";
      ctx.fillText("TVC", p.w - 5, py - 12);
    }

    return {
      paintSys: { eclss, rad, hull, bus },
      paintStatic: { eclss: eclssStatic, rad: radStatic, hull: hullStatic, bus: busStatic },
      tickSys, impact, setRepair,
      sys,
      repairState: () => ({ count: repairing.size, age: repairAge }),
    };
  });
})();
