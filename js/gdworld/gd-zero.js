/* gd-zero.js — Sector Zero's field: the room, unpicked. Wall panels with
   door frames and blinds, fluorescent tubes on wires, floorboards and
   ceiling tiles, filing cabinets, office chairs adrift, clocks running
   ahead, an EXIT sign, a security camera; papers and cables nearest; a
   green phosphor grade over it all; quiet so the marks read: clocks
   dimmed, everything thins round the marks (G.clearBox). Registers
   GdWorld.P.zero. */
(function () {
  const G = window.GdWorld; if (!G) return;
  const { F, sx, each, scatter, dens } = G;
  const { clamp, mix, smooth, hash1, TAU } = Util;
  const I = 0;
  const px = n => n * F.k;
  const clearBox = (x, y, hw, hh) => G.clearBox ? G.clearBox(x, y, hw, hh) : 1;
  const C = {
    wall: "#0f2016", wallLit: "#1e3a2a", base: "#1a2e22", door: "#050a07", frame: "#213a2b", blind: "#17281d", night: "#0b1220",
    floorA: "#141f17", floorB: "#111a13", seam: "#0d150f", ceil: "#0d1912", tile: "#152418",
    tube: "#d6ffe4", tubeOff: "#2a4a36", wire: "#233a2c", glow: "150,255,180",
    cab: "#2b3a30", cabLit: "#3a4c40", drawer: "#22302a", drawerSide: "#1a2620", handle: "#8ea394",
    paper: "#aebfad", ink: "#4d6150", chair: "#1e2a22", chairLit: "#2c3a30", steel: "#3a4440",
    clock: "#6f7d72", hand: "#2a332c", exit: "#ff5a48", exitBox: "#3a1410", cam: "#2a3430", lens: "#101614", led: "#ff3b2e", cable: "#1c2c22",
  };
  // element lists (built at load; F is not needed for these)
  const PANELS = scatter(11, I, 44, 0.18, 0.30, 0.55);
  const TUBES_FAR = scatter(12, I, 60, 0.18, 0.15, 0.24);
  const PROPS = scatter(13, I, 120, 0.42, 0.22, 0.60);
  const PAPERS = scatter(14, I, 80, 0.7, 0.14, 0.62);
  const CABLES = scatter(15, I, 35, 0.7, 0.16, 0.34);
  const TUBES_NEAR = scatter(16, I, 44, 0.7, 0.13, 0.21);
  let scanPat = null;

  function wash(w) {
    const { ctx, W, H } = F;
    const g1 = ctx.createRadialGradient(W / 2, 0.42 * H, 0.35 * H, W / 2, 0.42 * H, 0.85 * Math.max(W, H));
    g1.addColorStop(0, "rgba(0,6,2,0)");
    g1.addColorStop(1, `rgba(0,6,2,${0.55 * w})`);
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    const g2 = ctx.createLinearGradient(0, 0, 0, H);
    g2.addColorStop(0.2, "rgba(40,120,70,0)");
    g2.addColorStop(0.5, `rgba(40,120,70,${0.10 * w})`);
    g2.addColorStop(0.9, "rgba(40,120,70,0)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);
  }

  function far(w) {
    const { H } = F;
    each(PANELS, px(480), (e, s) => panel(e, s));
    each(TUBES_FAR, px(90), (e, s) => tube(s, e.fy * H, px(120), px(6), e, px(90), e.fy * H - px(70)));
  }

  function mid(w) {
    const { H, gy } = F;
    band(0.09 * H, 0.155 * H, 0.42, C.ceil, C.tile);
    band(gy, H, 0.42, null, C.seam);
    each(PROPS, px(90), (e, s) => {
      if (e.r4 < 0.30) cabinet(e, s);
      else if (e.r4 < 0.58) chair(e, s);
      else if (e.r4 < 0.70) clock(e, s);
      else if (e.r4 < 0.80) exitSign(e, s);
      else camera(e, s);
    });
  }

  function near(w) {
    const { ctx, H, t, red } = F;
    each(TUBES_NEAR, px(150), (e, s) => tube(s, e.fy * H, px(200), px(8), e, px(140), 0.09 * H));

    each(CABLES, px(40), (e, s) => {
      const y0 = 0.09 * H, y1 = e.fy * H;
      const ex = s + px(30) * (e.r1 - 0.5) + (red ? 0 : Math.sin(t * 0.5 + e.r2 * TAU) * px(8));
      const cx = s + px(40) * (e.r3 - 0.5), cy = (y0 + y1) / 2;
      const f = clearBox(ex, y1, px(3), px(3));
      ctx.globalAlpha = f;
      ctx.strokeStyle = C.cable;
      ctx.lineWidth = px(2);
      ctx.beginPath();
      ctx.moveTo(s, y0);
      ctx.quadraticCurveTo(cx, cy, ex, y1);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = C.steel;
      ctx.beginPath();
      ctx.arc(ex, y1, px(3), 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    each(PAPERS, px(30), (e, s) => {
      const cx = s, cy = e.fy * H + (red ? 0 : Math.sin(t * 0.4 + e.r2 * TAU) * px(6));
      const ang = e.r1 * TAU + (red ? 0 : t * 0.06 * (e.r3 - 0.5));
      const f = clearBox(cx, cy, px(11), px(15));
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.globalAlpha = 0.8 * f;
      ctx.fillStyle = C.paper;
      ctx.fillRect(-px(11), -px(15), px(22), px(30));
      ctx.globalAlpha = f;
      ctx.fillStyle = C.ink;
      ctx.fillRect(-px(8), -px(8), px(14), px(2));
      ctx.fillRect(-px(8), -px(2), px(14), px(2));
      ctx.fillRect(-px(8), px(4), px(14), px(2));
      ctx.restore();
      ctx.globalAlpha = 1;
    });
  }

  function grade(w) {
    const { ctx, W, H, t, red } = F;
    if (!scanPat) {
      const c = document.createElement("canvas");
      c.width = 1; c.height = 3;
      const pc = c.getContext("2d");
      pc.fillStyle = "rgba(0,0,0,1)";
      pc.fillRect(0, 0, 1, 1);
      scanPat = ctx.createPattern(c, "repeat");
    }
    ctx.globalAlpha = 0.16 * w;
    ctx.fillStyle = scanPat;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    const seed = red ? 0 : Math.floor(t / 0.12);
    ctx.fillStyle = `rgba(160,255,190,${0.12 * w})`;
    for (let i = 0; i < 90; i++) {
      const x = hash1((seed * 997 + i * 31) | 0) * W;
      const y = hash1((seed * 131 + i * 77 + 7) | 0) * H;
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    ctx.fillStyle = `rgba(30,90,50,${0.06 * w})`;
    ctx.fillRect(0, 0, W, H);
  }

  // helpers: tube(s, y, len, thick, e, glowR, wireTop), panel(e, s), cabinet(e, s), chair(e, s), clock(e, s), exitSign(e, s), camera(e, s), band(y0, y1, par, fill, seamFill)
  function tube(s, y, len, thick, e, glowR, wireTop) {
    const { ctx, t, red } = F;
    ctx.strokeStyle = C.wire;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s - len * 0.33, y); ctx.lineTo(s - len * 0.33, wireTop);
    ctx.moveTo(s + len * 0.33, y); ctx.lineTo(s + len * 0.33, wireTop);
    ctx.stroke();

    let on;
    if (e.r3 < 0.66) on = true;
    else if (e.r3 < 0.86) on = red || (hash1((Math.floor(t * 13) * 131 + Math.floor(e.r4 * 1000)) | 0) > 0.45);
    else on = false;

    if (on) {
      ctx.globalAlpha = 0.85 * 0.55;
      ctx.fillStyle = C.tube;
      ctx.fillRect(s - len / 2, y - thick / 2, len, thick);
      const gr = ctx.createRadialGradient(s, y + thick, 0, s, y + thick, glowR);
      gr.addColorStop(0, `rgba(${C.glow},${0.14 * 0.5})`);
      gr.addColorStop(1, `rgba(${C.glow},0)`);
      ctx.fillStyle = gr;
      ctx.fillRect(s - glowR, y - glowR * 0.3, glowR * 2, glowR * 1.3);
    } else {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = C.tubeOff;
      ctx.fillRect(s - len / 2, y - thick / 2, len, thick);
    }
    ctx.globalAlpha = 1;
  }

  function panel(e, s) {
    const { ctx, gy } = F;
    const wd = px(260 + 300 * e.r1), ht = px(200 + 200 * e.r2);
    const yb = gy + px(20 * e.r3), yt = yb - ht, xl = s - wd / 2;
    const f = clearBox(s, yt + ht / 2, wd / 2, ht / 2);
    ctx.globalAlpha = 0.4 + 0.6 * f;

    ctx.fillStyle = C.wall;
    ctx.fillRect(xl, yt, wd, ht);
    ctx.fillStyle = C.wallLit;
    ctx.fillRect(xl, yt, wd, px(4));
    ctx.fillStyle = C.base;
    ctx.fillRect(xl, yb - px(6), wd, px(6));

    if (e.r4 < 0.45) {
      const dw = px(90), dh = px(220);
      const dx = clamp(xl + wd * (0.2 + 0.6 * e.r2) - px(45), xl + px(12), xl + wd - px(102)), dy = yb - dh;
      ctx.fillStyle = C.door;
      ctx.fillRect(dx, dy, dw, dh);
      const fr = px(6);
      ctx.fillStyle = C.frame;
      ctx.fillRect(dx - fr, dy, fr, dh);
      ctx.fillRect(dx - fr, dy - fr, dw + 2 * fr, fr);
      ctx.fillRect(dx + dw, dy, fr, dh);
    } else {
      const ww = px(170), wh = px(120);
      const wx = clamp(s + (e.r2 - 0.5) * wd * 0.5 - ww / 2, xl + px(12), xl + wd - px(182));
      const wy = ht < px(200) ? yt + px(30) : yt + px(60);
      ctx.fillStyle = C.night;
      ctx.fillRect(wx, wy, ww, wh);
      ctx.fillStyle = C.blind;
      for (let i = 0; i < 9; i++) ctx.fillRect(wx, wy + i * px(13), ww, px(10));
      const fr = px(4);
      ctx.fillStyle = C.frame;
      ctx.fillRect(wx - fr, wy - fr, ww + 2 * fr, fr);
      ctx.fillRect(wx - fr, wy + wh, ww + 2 * fr, fr);
      ctx.fillRect(wx - fr, wy, fr, wh);
      ctx.fillRect(wx + ww, wy, fr, wh);
    }
    ctx.globalAlpha = 1;
  }

  function cabinet(e, s) {
    const { ctx, H, gy } = F;
    const w = px(46), h = px(120);
    let cy, ang;
    if (e.r2 < 0.6) { cy = gy - h / 2; ang = 0; }
    else { cy = e.fy * H; ang = (e.r3 - 0.5) * 0.9; }
    const f = clearBox(s, cy, w / 2, h / 2);
    if (f < 0.03) return;

    ctx.save();
    ctx.translate(s, cy);
    ctx.rotate(ang);
    ctx.globalAlpha = f;

    ctx.fillStyle = C.cab;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = C.cabLit;
    ctx.fillRect(-w / 2, -h / 2, w * 0.3, h);

    const dw = w - px(8), dh = px(34), gap = px(4);
    let dy = -h / 2 + px(6);
    for (let i = 0; i < 3; i++) {
      const dx = -w / 2 + px(4);
      if (i === 1) {
        const shift = px(14);
        const fx = dx - shift;
        ctx.fillStyle = C.drawerSide;
        ctx.fillRect(fx + dw, dy, shift, dh);
        ctx.fillStyle = C.drawer;
        ctx.fillRect(fx, dy, dw, dh);
        ctx.fillStyle = C.handle;
        ctx.fillRect(fx + dw / 2 - px(7), dy + dh / 2 - px(1), px(14), px(2));
        ctx.fillStyle = C.paper;
        ctx.save(); ctx.translate(fx + dw * 0.3, dy); ctx.rotate(-0.2);
        ctx.fillRect(-px(9), -px(4), px(18), px(4)); ctx.restore();
        ctx.save(); ctx.translate(fx + dw * 0.65, dy); ctx.rotate(0.2);
        ctx.fillRect(-px(9), -px(4), px(18), px(4)); ctx.restore();
      } else {
        ctx.fillStyle = C.drawer;
        ctx.fillRect(dx, dy, dw, dh);
        ctx.fillStyle = C.handle;
        ctx.fillRect(dx + dw / 2 - px(7), dy + dh / 2 - px(1), px(14), px(2));
      }
      dy += dh + gap;
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function chair(e, s) {
    const { ctx, H, t, red } = F;
    const cy = e.fy * H;
    const ang = e.r1 * TAU + (red ? 0 : t * 0.06 * (e.r2 - 0.5));
    const f = clearBox(s, cy, px(24), px(75));
    if (f < 0.03) return;

    ctx.save();
    ctx.translate(s, cy);
    ctx.rotate(ang);
    ctx.globalAlpha = f;

    const legLen = px(22);
    ctx.strokeStyle = C.steel;
    ctx.lineWidth = px(3);
    for (let k = 0; k < 5; k++) {
      const a = k * TAU / 5 + 0.3;
      const lx = Math.cos(a) * legLen, ly = Math.sin(a) * legLen;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(lx, ly);
      ctx.stroke();
      ctx.fillStyle = C.steel;
      ctx.beginPath();
      ctx.arc(lx, ly, px(3), 0, TAU);
      ctx.fill();
    }
    ctx.lineWidth = 1;

    ctx.fillStyle = C.steel;
    ctx.fillRect(-px(2), -px(26), px(4), px(26));

    ctx.fillStyle = C.chair;
    ctx.fillRect(-px(20), -px(38), px(40), px(12));
    ctx.fillStyle = C.chairLit;
    ctx.fillRect(-px(20), -px(38), px(40) * 0.3, px(12));

    ctx.fillStyle = C.chair;
    ctx.fillRect(px(12), -px(78), px(12), px(42));

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function clock(e, s) {
    const { ctx, H, t, red } = F;
    const cx = s, cy = e.fy * H, r = px(18) * 0.7;
    const f = clearBox(cx, cy, r, r);
    if (f < 0.03) return;

    ctx.globalAlpha = 0.9 * f;
    ctx.fillStyle = C.clock;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = f;

    ctx.strokeStyle = C.hand;
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12;
      const x0 = cx + Math.cos(a) * r, y0 = cy + Math.sin(a) * r;
      const x1 = cx + Math.cos(a) * (r - px(3)), y1 = cy + Math.sin(a) * (r - px(3));
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    const mAng = red ? e.r1 * TAU : (t / 6 + e.r1) * TAU;
    const hAng = red ? e.r2 * TAU : (t / 72 + e.r2) * TAU;
    ctx.lineWidth = px(2);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(mAng) * px(14) * 0.7, cy + Math.sin(mAng) * px(14) * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(hAng) * px(9) * 0.7, cy + Math.sin(hAng) * px(9) * 0.7);
    ctx.stroke();
    ctx.lineWidth = 1;

    ctx.fillStyle = C.hand;
    ctx.beginPath();
    ctx.arc(cx, cy, px(1.5), 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function exitSign(e, s) {
    const { ctx, H, t, red } = F;
    const cx = s, cy = e.fy * H;
    const f = clearBox(cx, cy, px(34), px(34));
    if (f < 0.03) return;
    ctx.globalAlpha = f;

    const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, px(34));
    gr.addColorStop(0, "rgba(255,80,60,0.125)");
    gr.addColorStop(1, "rgba(255,80,60,0)");
    ctx.fillStyle = gr;
    ctx.fillRect(cx - px(34), cy - px(34), px(68), px(68));

    const bw = px(44), bh = px(16);
    ctx.fillStyle = C.exitBox;
    ctx.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);

    let show = true;
    if (e.r3 < 0.3 && !red) show = hash1((Math.floor(t * 9) * 17 + Math.floor(e.r4 * 1000)) | 0) >= 0.15;
    if (show) {
      const b1 = px(12), b2 = px(18), bhh = px(4);
      const bx = cx - (b1 + b2) / 2;
      ctx.fillStyle = C.exit;
      ctx.fillRect(bx, cy - bhh / 2, b1, bhh);
      ctx.fillRect(bx + b1, cy - bhh / 2, b2, bhh);
    }
    ctx.globalAlpha = 1;
  }

  function camera(e, s) {
    const { ctx, H, t, red } = F;
    const y = e.fy * H;
    const f = clearBox(s + px(10), y - px(10), px(30), px(20));
    if (f < 0.03) return;
    ctx.globalAlpha = f;

    ctx.strokeStyle = C.cam;
    ctx.lineWidth = px(3);
    ctx.beginPath();
    ctx.moveTo(s, y);
    ctx.lineTo(s + px(10), y - px(6));
    ctx.stroke();
    ctx.lineWidth = 1;

    const bw = px(26), bh = px(12);
    ctx.save();
    ctx.translate(s + px(20), y - px(10));
    ctx.rotate(-0.35);
    ctx.fillStyle = C.cam;
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.fillStyle = C.lens;
    ctx.fillRect(bw / 2 - px(6), -bh / 2, px(6), bh);

    ctx.fillStyle = C.led;
    ctx.beginPath();
    ctx.arc(-bw / 2, 0, px(2.5), 0, TAU);
    ctx.fill();

    const on = red || ((t + e.r2 * 1.6) % 1.6) < 0.2;
    if (on) {
      const gr = ctx.createRadialGradient(-bw / 2, 0, 0, -bw / 2, 0, px(8));
      gr.addColorStop(0, "rgba(255,60,50,0.35)");
      gr.addColorStop(1, "rgba(255,60,50,0)");
      ctx.fillStyle = gr;
      ctx.fillRect(-bw / 2 - px(8), -px(8), px(16), px(16));
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function band(y0, y1, par, fill, seamFill) {
    const { ctx, W, camX, sc } = F;
    const cw = 200;
    const CU = cw / (par * sc);
    const j0 = Math.floor((camX - (W / 2 + cw) / (par * sc)) / CU);
    const count = Math.ceil(W / cw) + 3;
    for (let j = j0; j < j0 + count; j++) {
      const xw = j * CU;
      const s = sx(xw, par);
      const a = dens(I, xw + CU / 2);
      if (a < 0.01) continue;
      ctx.globalAlpha = 0.95 * a;
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fillRect(s, y0, cw + 1, y1 - y0);
      } else {
        const ph = px(22);
        let i = 0;
        for (let py = y0; py < y1; py += ph) {
          ctx.fillStyle = (i % 2 === 0) ? C.floorA : C.floorB;
          ctx.fillRect(s, py, cw + 1, ph);
          i++;
        }
      }
      ctx.fillStyle = seamFill;
      ctx.fillRect(s, y0, 1, y1 - y0);
      ctx.fillRect(s + cw / 2, y0, 1, y1 - y0);
      if (fill) ctx.fillRect(s, y1 - 1, cw + 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  G.P.zero = { base: [4, 12, 8], wash, layers: [{ par: 0.18, paint: far }, { par: 0.42, paint: mid }, { par: 0.7, paint: near }], grade };
})();
