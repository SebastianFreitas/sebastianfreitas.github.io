/* tiles-sys.js — the SYS bank: tickSys, eclss, rad, hull, bus, impact,
   setRepair. instruments.js owns the banks, the layout, the alarms and the
   paint loop; this file owns what each tile draws and the readings it
   integrates. Register with the framework, which calls back with `F`, the
   shared kit it needs. */
(function () {
  const { approach, clamp, wrapPi } = Util;

  window.Instruments.registerTiles(function (F) {
    const { LAMP, COLD, DIM, BAD, WARN, GOOD, setFont, mono, spark } = F;

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
    const repairing = new Set();   // hull sectors the bridge log says are under patch
    let repairAge = 0;
    let impactCool = 2.4;
    let prevAng = 0, omega = 0;
    let sys = {
      o2: 20.95, co2: 420, kpa: 101.3, rh: 40,
      dose: 0.013, mag: 45.2, bx: 0, by: 0,
      hullT: -48, cabT: 21.2, hx: 0.12,
    };

    /* =========================================================
       SYS bank — cabin, dose, skin, bus. Numbers first.
       ========================================================= */
    function tickSys(dt, r) {
      repairAge = repairing.size ? repairAge + dt : 0;
      const chaos = r.chaos || 0;
      const future = r.future || 0;
      const s = r.ship;
      const thrust = s ? s.thrust : 0;
      const speedN = s ? s.speedN : 0;

      const o2T  = 20.95 + Math.sin(F.now() * 0.31) * 0.05 - chaos * 0.12 - thrust * 0.05;
      const co2T = 412 + Math.sin(F.now() * 0.17) * 24 + chaos * 180 + thrust * 90;
      const kpaT = 101.3 + Math.sin(F.now() * 0.22) * 0.11 - future * 6.2 - chaos * 0.35;
      const rhT  = 39.4 + Math.sin(F.now() * 0.41) * 2.2 + chaos * 3 - future * 4;
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
        + (Math.sin(F.now() * 2.4) * 0.5 + 0.5) * 0.002;
      sys.dose = approach(sys.dose, doseT, 5, dt);
      radAcc += dt;
      if (radAcc >= 0.05 - SAMPLE_SLACK) {
        radAcc = Math.min(radAcc - 0.05, 0.05);
        radStrip.push(sys.dose);
        if (radStrip.length > 80) radStrip.shift();
      }

      const magBase = 45.2 * (1 - future * 0.62) * (1 - chaos * 0.18);
      const wobble = 0.35 + chaos * 1.4 + future * 2.2;
      sys.bx = Math.sin(F.now() * 1.35 + future * F.now() * 0.4) * wobble;
      sys.by = Math.cos(F.now() * 1.08 + chaos * 2.1) * (0.3 + future * 1.1);
      sys.mag = approach(sys.mag, Math.max(0.4, magBase + sys.bx * 0.15), 4, dt);
      magAcc += dt;
      if (magAcc >= MAG_STEP - SAMPLE_SLACK) {
        magAcc = Math.min(magAcc - MAG_STEP, MAG_STEP);
        magTrace.push([sys.bx, sys.by]);
        if (magTrace.length > 40) magTrace.shift();
      }

      const hullT = -40 - future * 86 + thrust * 95 + Math.sin(F.now() * 0.48) * 1.6
        + (lastImpact && lastImpact.age < 2 ? 8 : 0);
      const cabT = 21.15 + Math.sin(F.now() * 0.29) * 0.22 + chaos * 0.7 - future * 0.4;
      const hxT = 0.09 + thrust * 0.68 + chaos * 0.08;
      sys.hullT = approach(sys.hullT, hullT, 2.5, dt);
      sys.cabT  = approach(sys.cabT,  cabT,  3, dt);
      sys.hx    = approach(sys.hx,   hxT,   4, dt);

      if (lastImpact) lastImpact.age += dt;
      impactCool -= dt;
      const pHit = dt * (0.008 + speedN * 0.09) * (0.03 + chaos * 0.4);
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
      const warn = sys.o2 < 19.6 || sys.co2 > 1200 || sys.kpa < 95.6;
      setFont(mono(9));
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = warn ? `rgba(${WARN},1)` : `rgba(${GOOD},0.9)`;
      ctx.fillText(warn ? "WARN" : "NOM", 5, 12);
      ctx.textAlign = "right";
      ctx.fillStyle = `rgba(${DIM},1)`;
      ctx.fillText("CABIN", p.w - 5, 12);

      const rows = [
        ["O2",  sys.o2.toFixed(2),  "%",   sys.o2 < 19.6],
        ["CO2", Math.round(sys.co2).toString(), "ppm", sys.co2 > 1200],
        ["P",   sys.kpa.toFixed(1), "kPa", sys.kpa < 95.6],
        ["RH",  sys.rh.toFixed(1),  "%",   false],
      ];
      const y0 = 28;
      rows.forEach(([lab, val, unit, hot], i) => {
        const y = y0 + i * 17;
        setFont(mono(8));
        ctx.textAlign = "left";
        ctx.fillStyle = `rgba(${DIM},0.95)`;
        ctx.fillText(lab, 5, y);
        setFont(mono(12, "600"));
        ctx.textAlign = "right";
        ctx.fillStyle = hot ? `rgba(${BAD},0.95)` : `rgba(${LAMP},0.95)`;
        ctx.fillText(val, p.w - 30, y);
        setFont(mono(7));
        ctx.fillStyle = `rgba(${DIM},0.85)`;
        ctx.fillText(unit, p.w - 5, y);
      });

      const chartTop = inner - 18, chartH = 12;
      ctx.fillStyle = `rgba(${DIM},0.18)`;
      ctx.fillRect(5, chartTop, p.w - 10, chartH);
      spark(co2Strip, 5, chartTop + chartH, p.w - 10, chartH, sys.co2 > 1200 ? BAD : COLD, 0.75);
      setFont(mono(7));
      ctx.textAlign = "left";
      ctx.fillStyle = `rgba(${DIM},0.75)`;
      ctx.fillText("CO2", 5, chartTop - 2);

      void r;
    }

    function rad(ctx, p, r) {
      const inner = p.h - 5;
      const event = sys.dose > 0.16;
      const evCol = sys.dose > 0.50 ? BAD : WARN;
      setFont(mono(18, "600"));
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = event ? `rgba(${evCol},0.95)` : `rgba(${LAMP},0.95)`;
      ctx.fillText(sys.dose < 0.1 ? sys.dose.toFixed(3) : sys.dose.toFixed(2), 5, 22);
      setFont(mono(8));
      ctx.fillStyle = `rgba(${DIM},1)`;
      ctx.fillText("mSv/h", 5, 32);

      ctx.textAlign = "right";
      setFont(mono(9));
      ctx.fillStyle = event ? `rgba(${evCol},0.95)` : `rgba(${DIM},1)`;
      ctx.fillText(event ? "EVENT" : "QUIET", p.w - 5, 14);
      ctx.fillStyle = `rgba(${COLD},0.85)`;
      ctx.fillText((sys.dose * 24).toFixed(2) + " /d", p.w - 5, 26);

      const chartTop = 38, chartBot = inner - 38, chartH = chartBot - chartTop;
      ctx.strokeStyle = `rgba(${LAMP},0.08)`;
      ctx.beginPath(); ctx.moveTo(4, chartTop + chartH * 0.5); ctx.lineTo(p.w - 4, chartTop + chartH * 0.5); ctx.stroke();
      spark(radStrip, 5, chartBot, p.w - 10, chartH, event ? evCol : LAMP, 0.85);

      const magHot = sys.mag < 14 || (r.future || 0) > 0.88;
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
      if (magTrace.length > 1) {
        ctx.strokeStyle = `rgba(${COLD},0.35)`;
        ctx.beginPath();
        magTrace.forEach((v, i) => {
          const x = mx + clamp(v[0], -1.2, 1.2) / 1.2 * (mR - 2);
          const y = my + clamp(v[1], -1.2, 1.2) / 1.2 * (mR - 2);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
      }
      const dx = mx + clamp(sys.bx, -1.2, 1.2) / 1.2 * (mR - 2);
      const dy = my + clamp(sys.by, -1.2, 1.2) / 1.2 * (mR - 2);
      ctx.fillStyle = magHot ? `rgba(${WARN},0.95)` : `rgba(${LAMP},0.95)`;
      ctx.fillRect(dx - 1.4, dy - 1.4, 2.8, 2.8);
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
      setFont(mono(9));
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      const patching = repairing.size > 0;
      ctx.fillStyle = live ? `rgba(${bigHit ? BAD : WARN},1)` : patching ? `rgba(${WARN},0.8)` : `rgba(${DIM},1)`;
      ctx.fillText(live ? "IMPACT" : patching ? "REPAIR" : "CLEAR", 5, 12);
      ctx.textAlign = "right";
      ctx.fillStyle = `rgba(${DIM},0.9)`;
      ctx.fillText(recent ? ("SEC " + lastImpact.sector) : "SKIN", p.w - 5, 12);

      const cx = 36, cy = 48, R = 22;
      for (let i = 0; i < 8; i++) {
        const a0 = -Math.PI / 2 + i * Math.PI / 4;
        const a1 = a0 + Math.PI / 4;
        const hot = lastImpact && lastImpact.sector === i + 1 && lastImpact.age < 4;
        const fix = !hot && repairing.has(i + 1);
        const fade = hot ? Math.max(0.25, 1 - lastImpact.age / 4) : 0;
        /* a patched sector holds amber until the bridge log clears it */
        const pulse = 0.55;
        ctx.strokeStyle = hot ? `rgba(${BAD},${0.45 + 0.55 * fade})`
          : fix ? `rgba(${WARN},${pulse})`
          : `rgba(${LAMP},0.22)`;
        ctx.lineWidth = hot || fix ? 2 : 1;
        ctx.beginPath();
        ctx.arc(cx, cy, R, a0 + 0.06, a1 - 0.06);
        ctx.stroke();
        ctx.lineWidth = 1;
        const mid = (a0 + a1) / 2;
        const tick = R + 3;
        ctx.strokeStyle = hot ? `rgba(${BAD},${0.8 * fade})` : fix ? `rgba(${WARN},0.7)` : `rgba(${DIM},0.4)`;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(mid) * (R - 2), cy + Math.sin(mid) * (R - 2));
        ctx.lineTo(cx + Math.cos(mid) * tick, cy + Math.sin(mid) * tick);
        ctx.stroke();
      }
      ctx.strokeStyle = `rgba(${COLD},0.45)`;
      ctx.strokeRect(cx - 7, cy - 4, 14, 8);
      ctx.fillStyle = `rgba(${LAMP},0.8)`;
      ctx.fillRect(cx + 7, cy - 1.5, 5, 3);

      setFont(mono(11, "600"));
      ctx.textAlign = "left";
      if (lastImpact) {
        ctx.fillStyle = live ? `rgba(${BAD},0.95)` : `rgba(${LAMP},0.9)`;
        ctx.fillText(lastImpact.g.toFixed(2) + "g", 68, 40);
        setFont(mono(8));
        ctx.fillStyle = `rgba(${DIM},0.95)`;
        ctx.fillText("SEC " + lastImpact.sector, 68, 52);
        ctx.fillStyle = `rgba(${COLD},0.85)`;
        ctx.fillText("T+" + lastImpact.age.toFixed(1) + "s", 68, 64);
      } else {
        ctx.fillStyle = `rgba(${DIM},0.7)`;
        setFont(mono(8));
        ctx.fillText("NO STRIKE", 68, 46);
        ctx.fillText("LISTEN", 68, 58);
      }

      const hy = inner - 4;
      setFont(mono(8));
      ctx.textAlign = "left";
      ctx.fillStyle = `rgba(${DIM},0.95)`;
      ctx.fillText("HULL", 5, hy - 12);
      ctx.fillStyle = `rgba(${LAMP},0.95)`;
      ctx.fillText((sys.hullT >= 0 ? "+" : "") + sys.hullT.toFixed(0) + "°C", 5, hy);
      ctx.textAlign = "center";
      ctx.fillStyle = `rgba(${DIM},0.95)`;
      ctx.fillText("CAB", p.w * 0.5, hy - 12);
      ctx.fillStyle = `rgba(${COLD},0.95)`;
      ctx.fillText(sys.cabT.toFixed(1) + "°C", p.w * 0.5, hy);
      ctx.textAlign = "right";
      ctx.fillStyle = `rgba(${DIM},0.95)`;
      ctx.fillText("HX", p.w - 5, hy - 12);
      ctx.fillStyle = `rgba(${LAMP},0.9)`;
      ctx.fillText(Math.round(sys.hx * 100) + "%", p.w - 5, hy);

      void r;
    }

    function bus(ctx, p, r) {
      const inner = p.h - 5;
      const s = r.ship;
      const thrust = s ? s.thrust : 0;
      const burning = !!(s && s.burning);
      const pitch = s && s.vy != null ? clamp(-s.vy / 9, -22, 22) : 0;
      const yawDeg = s && s.angle != null
        ? ((s.angle * 180 / Math.PI) % 360 + 360) % 360
        : 0;
      const roll = s && s.bank != null ? s.bank * 180 / Math.PI : 0;

      const vBus = 28.05 - thrust * 1.55 + Math.sin(F.now() * 4.1) * 0.04;
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
      ctx.fillStyle = vBus < 26.5 ? `rgba(${BAD},0.95)` : `rgba(${LAMP},0.9)`;
      ctx.fillText(vBus.toFixed(1) + " V", p.w - 5, 12);

      const row0 = 20, rowH = 13, barX = 36, barW = p.w - 72;
      loads.forEach((l, i) => {
        const y = row0 + i * rowH;
        setFont(mono(7));
        ctx.textAlign = "left";
        ctx.fillStyle = `rgba(${DIM},0.95)`;
        ctx.fillText(l.name, 5, y + 6);
        ctx.fillStyle = `rgba(${DIM},0.22)`;
        ctx.fillRect(barX, y, barW, 7);
        ctx.fillStyle = `rgba(${l.name === "DRV" && burning ? LAMP : COLD},0.85)`;
        ctx.fillRect(barX, y, barW * clamp(l.n, 0, 1), 7);
        ctx.textAlign = "right";
        ctx.fillStyle = `rgba(${LAMP},0.85)`;
        ctx.fillText((l.n * 8.4).toFixed(1), p.w - 5, y + 6);
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
        ctx.fillStyle = `rgba(${DIM},0.85)`;
        ctx.fillText(lab, x, imuY);
        ctx.fillStyle = `rgba(${col},0.9)`;
        ctx.fillText(val, x + 11, imuY);
      });

      const pc = 0.12 + thrust * 2.55;
      const flow = thrust * 16.8;
      const tvc = roll * 0.85;
      const py = inner - 4;
      setFont(mono(8));
      ctx.textAlign = "left";
      ctx.fillStyle = `rgba(${DIM},0.95)`;
      ctx.fillText("Pc", 5, py - 12);
      ctx.fillStyle = burning ? `rgba(${LAMP},0.95)` : `rgba(${DIM},0.9)`;
      ctx.fillText(pc.toFixed(2) + " MPa", 5, py);
      ctx.textAlign = "center";
      ctx.fillStyle = `rgba(${DIM},0.95)`;
      ctx.fillText("FLOW", p.w * 0.5, py - 12);
      ctx.fillStyle = burning ? `rgba(${LAMP},0.95)` : `rgba(${DIM},0.9)`;
      ctx.fillText(flow.toFixed(1) + " kg/s", p.w * 0.5, py);
      ctx.textAlign = "right";
      ctx.fillStyle = `rgba(${DIM},0.95)`;
      ctx.fillText("TVC", p.w - 5, py - 12);
      ctx.fillStyle = `rgba(${COLD},0.95)`;
      ctx.fillText((tvc >= 0 ? "+" : "") + tvc.toFixed(1) + "°", p.w - 5, py);
    }

    return {
      paintSys: { eclss, rad, hull, bus },
      tickSys, impact, setRepair,
      sys,
      repairState: () => ({ count: repairing.size, age: repairAge }),
    };
  });
})();
