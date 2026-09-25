/* gd-voidscape.js — VoidScape's field: the run, only up. Concrete corridor
   modules tilted and chained by stairs, rooms lit white until done and red
   after, pipes with valve wheels, rotating red beacons, triangular portals,
   and the things that float about: dice, canisters, medkits. Red cloud
   banks behind, the heat of the ground below. Registers GdWorld.P.voidscape. */
(function () {
  const G = window.GdWorld; if (!G) return;
  const { F, sx, each, scatter } = G;
  const { mix, TAU, mulberry } = Util;
  const I = 1;
  const px = n => n * F.k;
  const C = {
    cloud: "110,16,22", cloud2: "60,8,14", ground: "200,40,20",
    body: "#1e1e21", lit: "#2d2d30", seam: "#2c2c2e", mouth: "#111113", white: "240,235,220", red: "255,60,40", strip: "#ff3a2a",
    grate: "#141416", pipe: "#2a2224", valve: "#7a1a1a", spoke: "#b23a2a", beacon: "#ff2a1a",
    portalOuter: "#ff6a1a", portalMid: "#ffa02a", portalInner: "#ffd23a", core: "255,240,180",
    die: "#d92b2b", dieTop: "#f04a3a", dieSide: "#a01e1e", pip: "#ffe9e0",
    can: "#b8251c", canLit: "#d0352a", cap: "#e8e6e0", hazard: "#1a1a1a", med: "#e8e6e0", cross: "#d92b2b",
  };
  const FAR = scatter(21, I, 52, 0.2, 0.14, 0.58);
  const MID = scatter(22, I, 96, 0.42, 0.16, 0.60);
  const PORTALS = scatter(23, I, 28, 0.7, 0.16, 0.58);
  const DICE = scatter(24, I, 60, 0.7, 0.15, 0.60);
  const CANS = scatter(25, I, 56, 0.7, 0.14, 0.62);
  const MEDS = scatter(26, I, 30, 0.7, 0.16, 0.60);
  const CLOUDS = (() => { const rng = mulberry(27), a = []; for (let i = 0; i < 5; i++) a.push({ fx: rng(), fy: 0.1 + 0.7 * rng(), r: 0.16 + 0.16 * rng(), c: rng() < 0.5 ? C.cloud : C.cloud2, ph: rng() * TAU }); return a; })();
  // die pip layouts, in units of d/3 from the die's centre
  const PIPS = {
    1: [[0, 0]],
    2: [[-1, -1], [1, 1]],
    3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    5: [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]],
    6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]],
  };

  /* screen-space: red cloud banks drifting behind the run, the ground's heat rising off the floor line */
  function wash(w) {
    const { ctx, W, H, camX, t, red, sc } = F;
    const span = W * 1.4;
    for (const c of CLOUDS) {
      const x = ((c.fx * span - camX * 0.03 * sc + (red ? 0 : Math.sin(t * 0.05 + c.ph) * W * 0.03)) % span + span) % span - W * 0.2;
      const y = c.fy * H, r = c.r * Math.max(W, H);
      const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r);
      const x1 = Math.min(W, x + r), y1 = Math.min(H, y + r);
      if (x1 <= x0 || y1 <= y0) continue;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${c.c},${0.30 * w})`);
      g.addColorStop(1, `rgba(${c.c},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }

    const gg = ctx.createLinearGradient(0, 0.62 * H, 0, H);
    gg.addColorStop(0, `rgba(${C.ground},0)`);
    gg.addColorStop(1, `rgba(${C.ground},${0.30 * w})`);
    ctx.fillStyle = gg;
    ctx.fillRect(0, 0.62 * H, W, H - 0.62 * H);
  }

  /* one concrete corridor piece: body, seams, a lit-or-done mouth at one end,
     a strip light along the top, and (when detailed) a grating and vent */
  function module(s, y, wd, ht, rot, e, detailed) {
    const { ctx } = F;
    ctx.save();
    ctx.translate(s, y);
    ctx.rotate(rot);

    ctx.fillStyle = C.body;
    ctx.fillRect(-wd / 2, -ht / 2, wd, ht);
    ctx.fillStyle = C.lit;
    ctx.fillRect(-wd / 2, -ht / 2, wd * 0.3, ht);

    ctx.strokeStyle = C.seam;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let lx = -wd / 2 + px(48); lx < wd / 2; lx += px(48)) {
      ctx.moveTo(lx, -ht / 2);
      ctx.lineTo(lx, ht / 2);
    }
    ctx.stroke();

    const left = e.r2 < 0.5;
    const mw = px(52), mh = ht * 0.62, mBot = ht / 2 - px(4), mTop = mBot - mh;
    const mx = left ? -wd / 2 : wd / 2 - mw;
    ctx.fillStyle = C.mouth;
    ctx.fillRect(mx, mTop, mw, mh);
    const col = e.r3 >= 0.55 ? C.white : C.red;
    const mcx = mx + mw / 2, mcy = mTop + mh / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(mx, mTop, mw, mh);
    ctx.clip();
    const mg = ctx.createRadialGradient(mcx, mcy, 0, mcx, mcy, ht * 0.5);
    mg.addColorStop(0, `rgba(${col},0.35)`);
    mg.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = mg;
    ctx.fillRect(mx, mTop, mw, mh);
    ctx.restore();
    ctx.fillStyle = `rgba(${col},0.7)`;
    ctx.fillRect(mx, mBot - px(2), mw, px(2));

    const stX = -wd / 2 + px(8), stY = -ht / 2 + px(3), stW = wd - px(16);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = C.strip;
    ctx.fillRect(stX, stY, stW, px(2));
    ctx.globalAlpha = 1;
    const sg = ctx.createLinearGradient(0, stY + px(2), 0, stY + px(2) + px(18));
    sg.addColorStop(0, `rgba(${C.red},0.18)`);
    sg.addColorStop(1, `rgba(${C.red},0)`);
    ctx.fillStyle = sg;
    ctx.fillRect(stX, stY + px(2), stW, px(18));

    if (detailed) {
      const grx = -wd * 0.1, gry = ht / 2 - px(14), grw = px(60), grh = px(10);
      ctx.fillStyle = C.grate;
      ctx.fillRect(grx, gry, grw, grh);
      ctx.strokeStyle = C.seam;
      ctx.beginPath();
      for (let i = 1; i <= 5; i++) {
        const glx = grx + grw * i / 6;
        ctx.moveTo(glx, gry);
        ctx.lineTo(glx, gry + grh);
      }
      ctx.stroke();
      if (e.r4 < 0.5) {
        const vx = wd / 2 - px(30), vy = -ht / 2 + px(12), vs = px(16);
        ctx.fillStyle = C.grate;
        ctx.fillRect(vx, vy, vs, vs);
        ctx.strokeStyle = C.seam;
        ctx.beginPath();
        for (let i = 1; i <= 3; i++) {
          const vly = vy + vs * i / 4;
          ctx.moveTo(vx, vly);
          ctx.lineTo(vx + vs, vly);
        }
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /* par 0.2: the furthest modules, plain, joined by the odd flight of stairs */
  function far(w) {
    const { ctx, W, H } = F;
    const pad = px(400), padStep = px(600);
    for (let j = 0; j < FAR.length; j++) {
      const e = FAR[j];
      const s = sx(e.x, 0.2);
      const wd = px(220 + 140 * e.r1), ht = px(90 + 50 * e.r2);
      const rot = (e.r3 - 0.5) * 0.24, y = e.fy * H;
      if (s > -pad && s < W + pad) module(s, y, wd, ht, rot, e, false);

      const e2 = FAR[j + 1];
      if (e2) {
        const s2 = sx(e2.x, 0.2), y2 = e2.fy * H, wd2 = px(220 + 140 * e2.r1);
        const inView1 = s > -padStep && s < W + padStep;
        const inView2 = s2 > -padStep && s2 < W + padStep;
        if ((s2 - s) < px(520) && y2 < y && (inView1 || inView2)) {
          const sw = px(16), sh = px(6);
          ctx.fillStyle = C.lit;
          for (let k = 0; k < 5; k++) {
            const u = (k + 0.5) / 5;
            const cx = mix(s + wd / 2, s2 - wd2 / 2, u), cy = mix(y, y2, u);
            ctx.fillRect(cx - sw / 2, cy - sh / 2, sw, sh);
          }
        }
      }
    }
  }

  /* par 0.42: detailed modules, pipes with valve wheels between them, and the odd rotating beacon */
  function mid(w) {
    const { ctx, W, H, t, red } = F;
    const pad = px(400), padPipe = px(800);
    for (let j = 0; j < MID.length; j++) {
      const e = MID[j];
      const s = sx(e.x, 0.42);
      const wd = px(260 + 160 * e.r1), ht = px(110 + 60 * e.r2);
      const rot = (e.r3 - 0.5) * 0.2, y = e.fy * H;
      if (s > -pad && s < W + pad) module(s, y, wd, ht, rot, e, true);

      const e2 = MID[j + 1];
      if (e2) {
        const s2 = sx(e2.x, 0.42), y2 = e2.fy * H, wd2 = px(260 + 160 * e2.r1);
        const inView1 = s > -padPipe && s < W + padPipe;
        const inView2 = s2 > -padPipe && s2 < W + padPipe;
        if ((s2 - s) < px(700) && (inView1 || inView2)) {
          const p0x = s + wd / 2, p0y = y, p1x = s2 - wd2 / 2, p1y = y2;
          const ccx = (p0x + p1x) / 2, ccy = (p0y + p1y) / 2 + px(30);
          ctx.strokeStyle = C.pipe;
          ctx.lineWidth = px(6);
          ctx.beginPath();
          ctx.moveTo(p0x, p0y);
          ctx.quadraticCurveTo(ccx, ccy, p1x, p1y);
          ctx.stroke();

          const vx = 0.25 * p0x + 0.5 * ccx + 0.25 * p1x;
          const vy = 0.25 * p0y + 0.5 * ccy + 0.25 * p1y;
          ctx.fillStyle = C.valve;
          ctx.beginPath(); ctx.arc(vx, vy, px(9), 0, TAU); ctx.fill();
          ctx.strokeStyle = C.spoke;
          ctx.lineWidth = px(2);
          const base = red ? e.r1 * TAU : t * 0.6 + e.r1 * TAU;
          ctx.beginPath();
          for (let k = 0; k < 4; k++) {
            const a = k * TAU / 4 + base;
            ctx.moveTo(vx, vy);
            ctx.lineTo(vx + Math.cos(a) * px(8), vy + Math.sin(a) * px(8));
          }
          ctx.stroke();
        }
      }

      if (e.r4 < 0.35) {
        const bx = s, by = y - ht / 2 - px(4);
        ctx.fillStyle = "rgba(255,42,26,0.25)";
        ctx.beginPath(); ctx.arc(bx, by, px(14), 0, TAU); ctx.fill();

        ctx.globalAlpha = 0.9;
        ctx.fillStyle = C.beacon;
        ctx.beginPath(); ctx.arc(bx, by, px(5), 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;

        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(red ? e.r1 * TAU : t * 1.4 + e.r1 * TAU);
        ctx.fillStyle = "rgba(255,42,26,0.12)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(px(150), -px(14));
        ctx.lineTo(px(150), px(14));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.lineWidth = 1;
  }

  /* par 0.7: the things up close — glowing portals, and dice, canisters, medkits adrift */
  function near(w) {
    const { ctx, H, t, red } = F;

    each(PORTALS, px(200), (e, s) => {
      const sz = px(90 + 50 * e.r1);
      const cy = e.fy * H;
      const rot = red ? 0 : t * 0.15 * (e.r2 < 0.5 ? 1 : -1);
      const a = red ? 0.9 : 0.75 + 0.25 * Math.sin(t * 1.7 + e.r3 * TAU);

      const gr = ctx.createRadialGradient(s, cy, 0, s, cy, 1.4 * sz);
      gr.addColorStop(0, `rgba(255,140,40,${0.22 * a})`);
      gr.addColorStop(1, "rgba(255,140,40,0)");
      ctx.fillStyle = gr;
      ctx.fillRect(s - 1.4 * sz, cy - 1.4 * sz, 2.8 * sz, 2.8 * sz);

      ctx.save();
      ctx.translate(s, cy);
      ctx.rotate(rot);
      ctx.lineWidth = px(3);
      const tri = r => {
        ctx.beginPath();
        for (let k = 0; k < 3; k++) {
          const ang = -Math.PI / 2 + k * TAU / 3;
          const tx = Math.cos(ang) * r, ty = Math.sin(ang) * r;
          if (k === 0) ctx.moveTo(tx, ty); else ctx.lineTo(tx, ty);
        }
        ctx.closePath();
      };
      ctx.strokeStyle = C.portalOuter; tri(sz * 0.58); ctx.stroke();
      ctx.strokeStyle = C.portalMid;   tri(sz * 0.38); ctx.stroke();
      ctx.strokeStyle = C.portalInner; tri(sz * 0.19); ctx.stroke();
      ctx.fillStyle = `rgba(${C.core},${0.35 * a})`;
      tri(sz * 0.19); ctx.fill();
      ctx.restore();
    });

    each(DICE, px(30), (e, s) => {
      const d = px(18);
      const cy = e.fy * H + (red ? 0 : Math.sin(t * 0.9 + e.r1 * TAU) * px(4));
      ctx.save();
      ctx.translate(s, cy);

      ctx.fillStyle = C.die;
      ctx.fillRect(-d / 2, -d / 2, d, d);

      ctx.fillStyle = C.dieTop;
      ctx.beginPath();
      ctx.moveTo(-d / 2, -d / 2);
      ctx.lineTo(-d / 2 + d * 0.4, -d / 2 - d * 0.4);
      ctx.lineTo(d / 2 + d * 0.4, -d / 2 - d * 0.4);
      ctx.lineTo(d / 2, -d / 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = C.dieSide;
      ctx.beginPath();
      ctx.moveTo(d / 2, -d / 2);
      ctx.lineTo(d / 2 + d * 0.4, -d / 2 - d * 0.4);
      ctx.lineTo(d / 2 + d * 0.4, d / 2 - d * 0.4);
      ctx.lineTo(d / 2, d / 2);
      ctx.closePath();
      ctx.fill();

      const n = 1 + Math.floor(e.r3 * 6);
      const u = d / 3;
      ctx.fillStyle = C.pip;
      for (const [ux, uy] of PIPS[n]) {
        ctx.beginPath();
        ctx.arc(ux * u, uy * u, px(1.8), 0, TAU);
        ctx.fill();
      }

      ctx.restore();
    });

    each(CANS, px(30), (e, s) => {
      const cy = e.fy * H + (red ? 0 : Math.sin(t * 0.7 + e.r3 * TAU) * px(5));
      const rot = e.r1 * TAU + (red ? 0 : t * 0.25 * (e.r2 - 0.5));
      ctx.save();
      ctx.translate(s, cy);
      ctx.rotate(rot);
      const cw = px(12), ch = px(26);
      ctx.fillStyle = C.can;
      ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
      ctx.fillStyle = C.canLit;
      ctx.fillRect(-cw / 2, -ch / 2, cw * 0.3, ch);
      ctx.fillStyle = C.cap;
      ctx.fillRect(-cw / 2, -ch / 2, cw, px(4));
      ctx.fillStyle = C.hazard;
      ctx.fillRect(-cw / 2, -ch / 2 + ch * 0.6, cw, px(3));
      ctx.restore();
    });

    each(MEDS, px(30), (e, s) => {
      const cy = e.fy * H + (red ? 0 : Math.sin(t * 0.6 + e.r2 * TAU) * px(4));
      const rot = (e.r1 - 0.5) * 0.6;
      ctx.save();
      ctx.translate(s, cy);
      ctx.rotate(rot);
      const bw = px(16), bh = px(12);
      ctx.fillStyle = C.med;
      ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
      ctx.fillStyle = C.cross;
      const xw = px(8), xt = px(2.4);
      ctx.fillRect(-xw / 2, -xt / 2, xw, xt);
      ctx.fillRect(-xt / 2, -xw / 2, xt, xw);
      ctx.restore();
    });
  }

  /* screen-space: a red vignette over everything, the run closing in */
  function grade(w) {
    const { ctx, W, H } = F;
    const cx = W / 2, cy = 0.45 * H;
    const g = ctx.createRadialGradient(cx, cy, 0.3 * H, cx, cy, 0.8 * Math.max(W, H));
    g.addColorStop(0, "rgba(30,0,4,0)");
    g.addColorStop(1, `rgba(30,0,4,${0.5 * w})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  G.P.voidscape = { base: [23, 5, 7], wash, layers: [{ par: 0.2, paint: far }, { par: 0.42, paint: mid }, { par: 0.7, paint: near }], grade };
})();
