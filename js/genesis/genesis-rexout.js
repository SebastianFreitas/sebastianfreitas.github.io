/* genesis-rexout.js — Rex Immotus and Obrokxus come out of the womb already
   locked (beat `burst`), then fight in the open (beat `duel`); Rex crashes, drags himself to the cut and dies there, Obrokxus crushed beneath him,
   in the hole he tore, where he dies and stays as the gate while the womb sinks (beat `drop`, and after). Drawn in the
   held outside view, in front of the womb and the old ones. Positions are
   fractions of the frame, like the old ones' march in genesis-oldones.js.
   Everything steps in held beats; reduced motion: settled poses, no shake. */
window.GenRexOut = (function () {
  const G = window.Gen;
  const { clamp, mix } = Util;
  const smooth = t => t * t * (3 - 2 * t);

  const BURST = 9, DUEL = 9, DROP = 6;
  const DD = { crushB: 2.0, dieA: 0.6, dieB: 3.4, venomB: 4.0, camB: 3.5, sinkA: 3.5, meltA: 1.2, meltB: 5.6, floorT: 2.4 };   // drop seconds: the crush ends, the poison kills him (cool, joints dim), the camera is back at 1, the womb starts to sink
  /* the places: landX and grabX are fractions of the frame width (landX where the raised fist is once he lands, grabX where the hand closes on Obrokxus), landY the fist's height as a fraction of the frame; holeX how far in from the womb's middle (fraction of rx) the tear and its belly sit; the hole's middle is the womb's middle in y */
  const PL = { landX: 0.13, landY: 0.16, grabX: 0.16, holeX: 0.46 };
  const tearX = g => g.cx - PL.holeX * g.rx;

  /* drop: the crush ends and Rex dies of the poison lying in the hole, with Obrokxus crushed beneath him; the womb sinks round him and the
     torn rim stays open and dark: he is the gate. From the land on he stays there, cold (d counts from the end of the duel, held at DROP) */
  function drop(ctx, d) {
    const red = G.reduced, H = G.H, gz = wombG(), h = Math.min(2 * gz.ry, 0.86 * H);
    const step = (t, a, b, n) => Math.floor(smooth(clamp((t - a) / (b - a), 0, 1)) * n) / n;
    if (red) d = DROP;
    const gs = placed(step(d, DD.sinkA, DROP, 6)), tx = tearX(gs);   // the womb as the places have it (sunk a little, as it always was): the hole and the body ride it; bigTear draws the dark cut on the deflating womb
    bigTear(ctx, gs, tx, 1, 0, gs.cy, gz.ry);   // the length stays what it was before the sink; the sunk womb's clip trims an end that would pass its outline
    DC.venomA = 1 - step(d, 0, 0.8, 4);   // the duel's last frame is orange with red seams: the seams go out first, in four steps
    DC.cool = step(d, 0.8, 1.6, 8);   // then the stones cool from orange to grey in eight steps
    DC.melt = 0; DC.meltSink = false; DC.pose2 = undefined; DC.mix = 0;
    const sg = smooth(clamp((d - 0.8) / (DD.meltB - 0.8), 0, 1)), mt = sg;   // the sag: 0 to 1, the whole body lowers and spreads as one mass
    stream(ctx, d, mt);
    const glow = 0;
    const tl = LV.kx * tx + LV.ex, ref = GenDuo.rexAnchors(0, 0, h, DC, ANC);   // he lies where the drag left him: the collar at the live cut, the chest on the floor
    let ax = tl - ref.collar.x + 0.02 * h, ay = 0.87 * G.H - ref.melt.y + 0.03 * h;
    GenDuo.rexAnchors(ax, ay, h, DC, ANC);
    if (d < 0.8) {   // the last effort: the free arm pushes down on the lip and the chest rises (the hand stays planted), then the arm gives and he falls back
      const hx = ANC.handB.x, hy = ANC.handB.y;
      DC.pose2 = "crawlPlant"; DC.mix = 0.5 * (d < 0.4 ? smooth(d / 0.4) : 1 - smooth((d - 0.4) / 0.4));
      GenDuo.rexAnchors(ax, ay, h, DC, ANC);
      ax += hx - ANC.handB.x; ay += hy - ANC.handB.y;
      GenDuo.rexAnchors(ax, ay, h, DC, ANC);
    }
    const sc = OBS * h;   // crushed under his fist, as on the duel's last frame (same place, facing and size)
    for (let i = 0; i < 16; i++) { const t = i / 15; TP[i * 2] = ANC.grip.x + 0.4 * sc - (1 - t) * 0.8 * sc; TP[i * 2 + 1] = ANC.grip.y; }
    const py = 0.87 * G.H, W = G.W, xb = gs.cx - gs.rx, N = 24;
    const bodyClip = c => { c.beginPath(); c.rect(-G.W, -G.H, 3 * G.W, py + G.H); c.clip(); };
    if (d < 3.0) rexAtCut(ctx, ax, ay, h, DC, sc, 1, glow, false, bodyClip);   // rigid where he lies; the mass covers him, then he is not drawn
    if (!red && d >= 0.4 && d < 1.2) {   // 8 dim brown chips kicked up where the chest falls back: rise, drift out, fade (gone by 1.2)
      const a = (d - 0.4) / 0.8;
      ctx.fillStyle = "rgba(92,70,56," + (0.5 * (1 - a)).toFixed(2) + ")";
      for (let i = -1; i <= 1; i += 2) for (let j = 0; j < 4; j++) {
        const s = Math.sin(j * 12.9898 + 4.1), u = s * 43758.5453 % 1, v = Math.abs(u), r = (0.012 + 0.02 * v) * h * (1 - 0.4 * a), th = (j * 2.4 + a * (2 + v * 3)) * i;
        const x = ANC.chest.x + i * (0.1 + 0.05 * j + (0.3 + 0.4 * v) * a) * h, y = py - (0.01 + 0.1 * v) * h - (0.05 + 0.12 * v) * h * a;
        ctx.beginPath(); ctx.moveTo(x + r * Math.cos(th), y + r * Math.sin(th)); ctx.lineTo(x + r * 0.8 * Math.cos(th + 2.1), y + r * 0.8 * Math.sin(th + 2.1)); ctx.lineTo(x + r * 1.2 * Math.cos(th + 4.0), y + r * 1.2 * Math.sin(th + 4.0)); ctx.closePath(); ctx.fill();
      }
    }
    /* the mass: a flat level rises from the floor over the body (clamped to its outline), then slumps east into the final wedge; grey, then brown, then the land's orange */
    if (d >= 1.6) {
      const key = [ax, ay, h, W, G.H].join();
      if (!BODY || BODY.key !== key) BODY = sampleBody(key, ax, ay, h, sc, glow, bodyClip, py, W, xb, N);
      const xa = BODY.xa, H0 = BODY.H0, maxH0 = BODY.maxH0, pad = 0.006 * h;
      const r = step(d, 1.6, 3.0, 9), u = step(d, 3.0, 5.4, 8), k = step(d, 1.6, 4.2, 9);
      const top = [], xs = [];
      for (let i = 0; i <= N + 1; i++) {   // the last point runs on under the womb's base
        const x = i <= N ? mix(xa, xb, i / N) : xb + 0.05 * W, bh = i <= N ? H0[i] : 0;
        const hr = Math.min(bh + pad, r * (maxH0 + pad)), F = clamp((x - (xb - 0.40 * W)) / (0.40 * W), 0, 1) * 0.065 * H;
        const xc = mix(xa, xb - 0.40 * W, u);   // the west end retreats east to the wedge's foot; west of it the mass is 0
        xs.push(x); top.push(mix(hr, F, u) * clamp((x - xc) / (0.05 * W), 0, 1));
      }
      const grey = ["#39485a", "#26313d"], brown = ["#5a4636", "#3a2c21"], org = ["#c9581f", "#8a3512"];
      const col = j => k < 0.5 ? mixHex(grey[j], brown[j], 2 * k) : mixHex(brown[j], org[j], 2 * k - 1);
      const n = top.length, first = u > 0 ? top.findIndex(t => t > 0.5) : 0, s0 = Math.max(0, first);
      ctx.fillStyle = col(1); ctx.beginPath(); ctx.moveTo(xs[s0], py);
      for (let i = s0; i < n; i++) ctx.lineTo(xs[i], py - top[i]);
      ctx.lineTo(xs[n - 1], py); ctx.closePath(); ctx.fill();
      ctx.fillStyle = mixHex(rgbHex(col(1)), "#ffffff", 0.15); ctx.beginPath(); ctx.moveTo(xs[s0], py - top[s0]);
      for (let i = s0 + 1; i < n; i++) ctx.lineTo(xs[i], py - top[i]);
      for (let i = n - 1; i >= s0; i--) ctx.lineTo(xs[i], py - top[i] + 0.008 * h);
      ctx.closePath(); ctx.fill();
    }
  }
  let BODY = null;
  function rgbHex(s) { const m = s.match(/\d+/g); return "#" + m.map(v => ("0" + (+v).toString(16)).slice(-2)).join(""); }
  function sampleBody(key, ax, ay, h, sc, glow, bodyClip, py, W, xb, N) {   // the lying body's outline at 1.6, drawn once off screen: its height over the floor in N+1 columns, smoothed 3 wide
    const cv = document.createElement("canvas"); cv.width = Math.ceil(W); cv.height = Math.ceil(G.H);
    const c = cv.getContext("2d"); rexAtCut(c, ax, ay, h, DC, sc, 1, glow, false, bodyClip);
    const rows = Math.floor(py), img = c.getImageData(0, 0, cv.width, rows).data, colTop = x => {
      for (let y = 0; y < rows; y++) if (img[(y * cv.width + x) * 4 + 3] > 8) return py - y;
      return 0;
    };
    let xa = xb; for (let x = 0; x < xb; x++) if (colTop(x) > 0) { xa = x; break; }
    xa = Math.max(0, Math.min(xa, xb - 0.40 * W));   // the columns also cover the wedge's whole span
    const raw = [], H0 = [];
    for (let i = 0; i <= N; i++) {
      const x0 = Math.floor(mix(xa, xb, i / N)), x1 = Math.max(x0 + 1, Math.floor(mix(xa, xb, (i + 1) / N)));
      let m = 0; for (let x = x0; x < x1 && x < cv.width; x++) m = Math.max(m, colTop(x));
      raw.push(m);
    }
    let maxH0 = 0;
    for (let i = 0; i <= N; i++) { H0.push((raw[Math.max(0, i - 1)] + raw[i] + raw[Math.min(N, i + 1)]) / 3); maxH0 = Math.max(maxH0, H0[i]); }
    return { key, xa, H0, maxH0 };
  }
  function mixHex(a, b, t) {
    const v = i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - t) + parseInt(b.substr(i, 2), 16) * t);
    return "rgb(" + v(1) + "," + v(3) + "," + v(5) + ")";
  }

  /* the pour: from the cut's lower tip a flat ribbon of molten stone (the land's first orange) runs down the womb's face to the floor, reaching it at DD.floorT;
     uneven straight edges, a few drips, a small pool at the foot; it thickens as the melt goes on. FOOT is where it meets the floor (cutGeom reports it) */
  const FOOT = { x: 0, y: 0, nx: 0, ny: 0 };   // nx, ny: where the stream starts, the neck's top
  const WG = { cx: 0, cy: 0, rx: 0, ry: 0 };
  const SJ = [0, 0.3, -0.25, 0.35, -0.3, 0.2, 0], SN = 6;
  const DRIPS = [[0.3, 1, 1], [0.52, -1, 1.5], [0.74, 1, 0.8]];   // along the stream, side, length
  function stream(ctx, d, mt) {
    if (d < DD.meltA) return;
    const W = G.W, H = G.H, fy = 0.87 * H;
    let tx = (CLX[CK] + CRX[CK]) / 2, ty = CY[CK];
    if (ty > fy - 2) {   // the tip is below the floor: the stream starts on the cut 0.12 H above where the cut meets the floor
      let k = CK;
      while (k > 0 && CY[k] > fy - 0.12 * H) k--;
      tx = (CLX[k] + CRX[k]) / 2; ty = CY[k];
      if (ty > fy - 2) ty = fy - 2;
    }
    FOOT.x = tx + 0.01 * W; FOOT.y = fy; FOOT.nx = tx; FOOT.ny = ty;
    const len = G.reduced ? 1 : smooth(clamp((d - DD.meltA) / (DD.floorT - DD.meltA), 0, 1)), ye = ty + (fy - ty) * len;
    const dr = G.reduced ? 1 : smooth(clamp((d - DD.floorT) / 1.2, 0, 1)), ts = ty + (fy - ty) * dr;   // once it has reached the floor the pour drains from the top down: no upright piece is left, only the flat pool
    const half = 0.5 * W * (0.006 + 0.03 * mt);
    ctx.fillStyle = "#c9581f";
    ctx.beginPath();
    for (let i = 0; i <= SN; i++) { const t = i / SN, x = tx + (FOOT.x - tx) * t - half * (1 + SJ[i]), y = ts + (ye - ts) * t; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    for (let i = SN; i >= 0; i--) { const t = i / SN; ctx.lineTo(tx + (FOOT.x - tx) * t + half * (1 + SJ[SN - i]), ts + (ye - ts) * t); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#8a3512";   // the shade: the right third of the ribbon
    ctx.beginPath();
    for (let i = 0; i <= SN; i++) { const t = i / SN, x = tx + (FOOT.x - tx) * t + 0.35 * half, y = ts + (ye - ts) * t; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    for (let i = SN; i >= 0; i--) { const t = i / SN; ctx.lineTo(tx + (FOOT.x - tx) * t + half * (1 + SJ[SN - i]), ts + (ye - ts) * t); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#c9581f";
    for (let k = 0; k < 3; k++) {
      const t = DRIPS[k][0], y0 = ty + (fy - ty) * t, grow = G.reduced ? 1 : smooth(clamp((ye - y0) / (0.3 * (fy - ty) / (DD.floorT - DD.meltA)), 0, 1));   // grows in over about 0.3 s once the stream passes it
      const dl = Math.min(DRIPS[k][2] * 0.05 * H * (0.4 + 0.6 * mt) * grow, fy - 2 - y0), dw = Math.max(2, 0.5 * half);
      if (dl <= 0 || y0 > ye || y0 < ts) continue;
      ctx.fillRect(tx + (FOOT.x - tx) * t + DRIPS[k][1] * half - dw / 2, y0, dw, dl);
    }
    if (len >= 1) {   // the pool at the foot: at most 0.15 W wide by the end
      const pw = 0.07 * W * smooth(clamp((d - DD.floorT) / (DROP - DD.floorT), 0, 1)), ph = 0.012 * H;
      ctx.beginPath(); ctx.moveTo(FOOT.x - pw, fy); ctx.lineTo(FOOT.x - 0.6 * pw, fy - ph); ctx.lineTo(FOOT.x + 0.5 * pw, fy - 0.8 * ph); ctx.lineTo(FOOT.x + pw, fy); ctx.closePath(); ctx.fill();
    }
  }

  /* ---- burst: calm womb, the fist, the giant tear, Rex hauls out, the zoom in ---- */
  /* peek (the cut is open, he peeks), slip (slips out), fly (flies west, the camera pulls back), barge (Rex forces through), grab (the fist closes; stop: the hit-stop ends), land (he lands), set (close on the fist: strain),
     bite (the red starts), recoil (Rex rips the arm back), off (Obrokxus springs off), hover (he is where the duel finds him) */
  const BS = { peek: 1.4, slip: 1.8, fly: 2.2, barge: 2.8, grab: 3.6, stop: 3.7, land: 3.95, rise: 4.25, set: 4.55, bite: 5.6, recoil: 7.2, off: 7.3, hover: 8.6 };
  const ST = { x: 0.09, y: 0.09 };   // where Obrokxus hangs as the burst ends and the duel opens (W, H fractions: up and west of the fist)
  const CUT_AT = 0.8, CUT_OPEN = 0.6;   // when the cut starts to open from a point (s) and how long it takes to its rest shape
  const GP = { pose: "grip", fist: 1, face: -1 };
  const ANC = {};
  const SW = T => 0.26 + 0.08 * Math.sin(2 * Math.PI * (T - 7) / 1.4);   // the holding arm's bend (pose2 curl mix) once Obrokxus is off, by seconds from the start of burst: it keeps swinging in and out, never straight
  const OBS = 0.24;  // Obrokxus's length in Rex's heights, the same in every shot of the fight (about 2.5 fist widths)

  function wombG() {   // the womb as drawFlesh gets it in burst, not deflated: the fight's places do not move
    const k = G.wombDeflate; G.wombDeflate = 0;
    const g = GenFlesh.fleshGeom(0);
    G.wombDeflate = k;
    return g;
  }
  function placed(sink) {   // the womb the places (cut, neck, foot) are laid out on: wombG with the top dropped 15% of the height, the base kept, 10% wider (sink 0..1)
    const g = wombG();
    if (!sink) return g;
    const ry2 = g.ry * (1 - 0.15 * sink);
    return { cx: g.cx, cy: g.cy + (g.ry - ry2), rx: g.rx * (1 + 0.10 * sink), ry: ry2 };
  }
  function landing(g) {   // where he lands holding Obrokxus: origin (x, y), the fist (gx, gy) and the chest (cx, cy); fills ANC. The fist is placed in the frame (his legs are cropped by the bottom edge)
    const h = Math.min(2 * g.ry, 0.86 * G.H);
    GP.pose = "grip"; GP.raise = 1; GP.pose2 = undefined; GP.mix = 0;
    const a = GenDuo.rexAnchors(0, 0, h, GP, ANC), x = PL.landX * G.W - a.grip.x, y = PL.landY * G.H - a.grip.y;
    const gr = GenDuo.rexAnchors(x, y, h, GP, ANC);
    return { x, y, h, gx: gr.grip.x, gy: gr.grip.y, cx: gr.chest.x, cy: gr.chest.y };
  }

  /* the cut: one tall pointed gash of straight segments, one flat red-black fill, no stroke. place() lays it out for this frame (u: how far it has opened along its
     length, 0..1; bulge 0..1 pushes the edges apart round screen height by, up to the old belly's width); cutPath traces it, cutGeom reports it */
  const CK = 12, CLX = new Float32Array(CK + 1), CRX = new Float32Array(CK + 1), CY = new Float32Array(CK + 1);
  const CJ = [1, 0.8, 1.1, 0.7, 1.05, 0.85, 1.15, 0.75, 1, 0.8, 1.1, 0.9, 1], CJR = [1, 1.1, 0.8, 1.05, 0.75, 1.1, 0.9, 1.15, 0.8, 1, 0.85, 1.1, 1];
  const CUT = { x: 0, w: 0 };
  let CRK = 1;   // 0..1: 0 is the tiny slit Obrokxus squeezes out of (0.18 of the length, 0.27 of the width), 1 the full cut; only burst sets it below 1
  function place(g, tx, u, bulge, by, ryL) {
    const H = G.H, ck = CRK, L = u * 0.88 * 2 * (ryL || g.ry) * (0.18 + 0.82 * ck), hh = Math.min(2 * (ryL || g.ry), 0.86 * H), Wm = 0.113 * hh * u * (0.27 + 0.73 * ck), top = g.cy - L / 2;
    let w = 0;
    for (let k = 0; k <= CK; k++) {
      const t = k / CK, env = Math.sin(Math.PI * Math.pow(t, 1.159));   // widest a little below the middle
      const y = top + L * t + (k % 3 - 1) * 0.012 * L * env, dx = (k % 4 - 1.5) * 0.02 * L * env + 0.03 * L * (t - 0.5) * env;
      const e = (y - by) / (0.2 * L), bg = bulge > 0 && L > 0 ? bulge * 0.23 * hh * Math.exp(-e * e) * env : 0;
      CLX[k] = tx - (Wm * env * CJ[k] + bg) + dx; CRX[k] = tx + (Wm * env * CJR[k] + bg) + dx; CY[k] = y;
      w = Math.max(w, CRX[k] - CLX[k]);
    }
    CUT.x = tx; CUT.w = w;
  }
  function cutPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(CLX[0], CY[0]);
    for (let k = 1; k <= CK; k++) ctx.lineTo(CLX[k], CY[k]);
    for (let k = CK; k >= 0; k--) ctx.lineTo(CRX[k], CY[k]);
    ctx.closePath();
  }
  function cutGeom(out) {
    out.x = CUT.x; out.top = CY[0]; out.bot = CY[CK]; out.w = CUT.w; out.tipX = (CLX[CK] + CRX[CK]) / 2; out.tipY = CY[CK];
    out.footX = FOOT.x; out.footY = FOOT.y; out.neckX = FOOT.nx; out.neckY = FOOT.ny;
    out.wcx = WG.cx; out.wcy = WG.cy; out.wrx = 0.94 * WG.rx; out.wry = 0.94 * WG.ry;   // the womb's clip, as bigTear draws it
    return out;
  }
  function bigTear(ctx, g, tx, u, bulge, by, ryL) {
    if (!(u > 0)) return;
    WG.cx = g.cx; WG.cy = g.cy; WG.rx = g.rx; WG.ry = g.ry;
    place(g, tx, u, bulge, by, ryL);
    ctx.save();
    const lv = GenFlesh.fleshGeom(0);   // the live womb: the dark cut is painted on it, so it sags and slides with it (the places above stay put)
    LV.kx = 1; LV.ky = 1; LV.ex = 0; LV.ey = 0;
    if (lv.cx !== g.cx || lv.cy !== g.cy || lv.rx !== g.rx || lv.ry !== g.ry) {
      const kx = lv.rx / g.rx, ky = lv.ry / g.ry;
      LV.kx = kx; LV.ky = ky; LV.ex = lv.cx - g.cx * kx; LV.ey = lv.cy - g.cy * ky;
      ctx.transform(kx, 0, 0, ky, LV.ex, LV.ey);
    }
    ctx.beginPath(); ctx.ellipse(g.cx, g.cy, 0.94 * g.rx, 0.94 * g.ry, 0, 0, 6.2832); ctx.clip();   // never outside the womb
    ctx.fillStyle = "#150204";
    cutPath(ctx); ctx.fill();
    ctx.restore();
  }
  /* what of Rex is still inside the womb shows only through the cut: east of the cut's centre line is clipped to the cut, west of it is out in the open.
     ob (optional, with sc): Obrokxus on the path TP drawn behind him inside the same clips */
  const OBO = { path: null, face: 1, glow: 1 };
  const LV = { kx: 1, ky: 1, ex: 0, ey: 0 };   // how bigTear moved the cut onto the live womb this frame (identity when the womb is not deflating)
  function cutClip(ctx, east, whole) {   // ctx.save() then the clip; the caller restores. whole: seated, clipped by the cut alone. The clip is the live cut, as bigTear paints it
    ctx.save();
    const m0 = ctx.getTransform();
    ctx.transform(LV.kx, 0, 0, LV.ky, LV.ex, LV.ey);
    ctx.beginPath();
    if (whole) cutPath(ctx), ctx.clip();
    else if (east) { ctx.rect(CUT.x, -G.H, G.W, 3 * G.H); ctx.clip(); cutPath(ctx); ctx.clip(); }
    else { ctx.rect(-G.W, -G.H, G.W + CUT.x, 3 * G.H); ctx.clip(); }
    ctx.setTransform(m0);
  }
  function rexAtCut(ctx, x, y, h, o, sc, face, glow, only, tf) {   // only: just inside the cut, none of him in the open; tf(ctx): a transform applied inside the clip
    for (let e = only ? 1 : 0; e < 2; e++) {
      cutClip(ctx, e === 1, !!only);
      if (tf) tf(ctx);
      if (sc) { OBO.path = TP; OBO.face = face; OBO.glow = glow; GenDuo.drawObrok1(ctx, 0, 0, sc, OBO); }
      GenDuo.drawRex(ctx, x, y, h, o);
      ctx.restore();
    }
  }

  /* Rex, with Obrokxus coiled in the near fist (glowing); the fingers go over him */
  function body(ctx, o, gx, gy, h, glow, bite, gait, hd) {   // Rex in pose options o with his near fist at (gx, gy), Obrokxus gripped in it (bite: coiled round the wrist, legs running with gait; hd how high his head is held, 0.1 is down on the hand)
    GenDuo.rexAnchors(0, 0, h, o, ANC);
    const x = gx - ANC.grip.x, y = gy - ANC.grip.y, t = G.reduced ? 0 : G.t, sc = OBS * h;
    if (o.fist > 0) { o.warm = glow; o.warmX = gx; o.warmY = gy; } else o.warm = 0;
    GenDuo.drawRex(ctx, x, y, h, o);
    if (o.fist > 0) {
      if (bite) {
        for (let i = 0; i < 16; i++) {
          const v = (i / 15 - 0.5) * 2, a = Math.abs(v);
          if (v <= 0) { TP[i * 2] = gx - 0.1 * sc * a * a * Math.sin(3.4 * a + t * 7); TP[i * 2 + 1] = gy - v * 0.5 * sc; }
          else { TP[i * 2] = gx - 0.2 * sc * Math.sin(Math.PI * 0.85 * v); TP[i * 2 + 1] = gy - (hd || 0.4) * sc * Math.sin(Math.PI * 0.85 * v); }
        }
        GenDuo.drawObrok1(ctx, 0, 0, sc, { path: TP, face: -1, glow, gait });
      } else GenDuo.drawObrok1(ctx, gx, gy, sc, { pose: "held", face: -1, glow, t });
      GenDuo.drawRexFingers(ctx, x, y, h, o);
    }
  }
  const DV = { pose: "dive", face: -1, fist: 0 };
  function obPath(hx, hy, sc, mode, wig) {   // Obrokxus's spine, tail tip first, the head at (hx, hy): mode 0 peeking out west, tail inside; 1 running west, head turned back
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      let x = hx + (1 - t) * sc, y = hy + (1 - t) * 0.04 * sc + 0.1 * sc * Math.sin(Math.PI * t) * Math.sin(wig + t * 6);
      if (mode && t > 0.8) { const u = (t - 0.8) / 0.2; x = hx + 0.2 * sc + 0.14 * sc * u * u; y = hy - 0.02 * sc - 0.16 * sc * u; }
      TP[i * 2] = x; TP[i * 2 + 1] = y;
    }
  }


  const RV = { pose: "reach", face: -1, fist: 0 }, CR = { pose: "crouch", face: -1, fist: 1, raise: 0 };
  const BC = { M0: 0, M1: 0, M2: 0, YG: 0, cy: 0, H: 0, W: 0, sq: 0, sc: 0, gx: 0, gy: 0 }, BP = { x: 0, y: 0 }, BT = { x: 0, y: 0 };   // the burst's per-frame scratch: his path's anchors, and two points
  const OB1 = { path: null, face: -1, glow: 1, gait: undefined };
  function shk(s, t, v) { if (s >= t && s - t < 0.25) G.shake = Math.max(G.shake, v); }
  function cen(t, o) {   // his middle on the way west, then to where the hand closes
    if (t < BS.barge) { const u = clamp((t - BS.slip) / (BS.barge - BS.slip), 0, 1); o.x = mix(BC.M0, BC.M1, smooth(u)); o.y = BC.cy - 0.12 * BC.H * Math.sin(Math.PI * u); return o; }
    const f = (t - BS.barge) / (BS.grab - BS.barge); o.x = mix(BC.M1, BC.M2, f); o.y = mix(BC.cy, BC.YG, f); return o;
  }
  function pos(t, o) {   // where he is once he springs off the fist, to where the duel finds him
    const f = smooth(clamp((t - BS.off) / (BS.hover - BS.off), 0, 1));
    o.x = mix(BC.gx, ST.x * BC.W, f); o.y = mix(BC.gy, ST.y * BC.H, f) + 0.04 * BC.H * Math.sin(Math.PI * f) * Math.sin(f * 15); return o;
  }
  function burst(ctx, s) {
    const H = G.H, W = G.W, red = G.reduced, g = wombG(), tx = tearX(g);
    const h = Math.min(2 * g.ry, 0.86 * H);
    if (red) { bigTear(ctx, g, tx, 1, 0, g.cy); const L = landing(g); GP.venom = 0.25; GP.mix = 0; body(ctx, GP, L.gx, L.gy, h, 0.2, false); return; }
    const open = Math.floor(smooth(clamp((s - CUT_AT) / CUT_OPEN, 0, 1)) * 12) / 12;   // the cut opens once, from a point, before the peek
    const pass = Math.min(clamp((s - BS.barge) / 0.4, 0, 1), clamp((BS.grab + 0.8 - s) / 0.8, 0, 1));   // open as wide as he is tall while he passes, eased back within 0.8 s
    const sb = Math.floor(s * 12 + 1e-6) / 12, byB = s < BS.barge ? g.cy : s < BS.grab ? mix(g.cy, 0.42 * H, (sb - BS.barge) / (BS.grab - BS.barge)) : mix(0.42 * H, g.cy, clamp((sb - BS.grab) / 0.8, 0, 1));   // follows the hand up, then eases back with the bulge
    CRK = clamp((Math.floor(s * 12 + 1e-6) / 12 - BS.barge) / 0.3, 0, 1);   // a tiny slit until Rex's fist arrives, then he rips it to the full cut within 0.3 s
    bigTear(ctx, g, tx, open, pass, byB, undefined);                         // and swells round him while Rex passes through
    CRK = 1;
    if (s < BS.peek) return;
    OB1.path = TP;
    shk(s, BS.slip, 0.3); shk(s, BS.barge, 1); shk(s, BS.grab, 0.6); shk(s, BS.land, 0.9); shk(s, BS.bite, 0.5); shk(s, BS.recoil, 0.9);
    const sq = Math.floor(s * 12 + 1e-6) / 12, sc = OBS * h, cy = g.cy, st = Math.floor(sq * 12) % 3;
    const glow = s < BS.set ? 1 : clamp(1 - 0.8 * ((G.zoom || 1) - 1) / Math.max(0.001, clamp(1.7 * H / h, 1, 1.8) - 1), 0.2, 1);   // as the duel's, so the two match
    const M0 = tx + 0.05 * sc, M1 = 0.25 * W, M2 = PL.grabX * W, YG = 0.42 * H;   // where his middle is when he slips out, when Rex barges, when Rex's hand closes; the height of the hand at the grab
    BC.M0 = M0; BC.M1 = M1; BC.M2 = M2; BC.YG = YG; BC.cy = cy; BC.H = H; BC.W = W; BC.sq = sq; BC.sc = sc;
    if (s < BS.grab) {
      ctx.save();
      if (s < BS.barge) { ctx.beginPath(); ctx.rect(0, 0, tx + 0.01 * H, H); ctx.clip(); }   // what has not passed the tear stays inside
      if (s < BS.slip) {   // peeking out: head swinging low, then high
        const sw = (sq - BS.peek) / (BS.slip - BS.peek);
        obPath(tx - mix(0.15, 0.65, Math.min(1, sw * 2)) * sc - 0.1 * sc * Math.sin(Math.PI * sw), cy + 0.07 * H * Math.cos(Math.PI * sw), sc, 0, sq * 9);
        OB1.glow = glow; OB1.gait = undefined;
        GenDuo.drawObrok1(ctx, 0, 0, sc, OB1);
      } else {
        const c = cen(sq, BP);
        obPath(c.x - 0.5 * sc, c.y, sc, 1, sq * 9);
        OB1.glow = glow; OB1.gait = sq - BS.slip;
        GenDuo.drawObrok1(ctx, 0, 0, sc, OB1);
      }
      ctx.restore();
    }
    if (s < BS.barge) return;
    const L = landing(g), SK = 0.05 * W, SH = 0.2 * W, OX = L.x - SK + SH;   // the floor origin where he lands, and where the skid leaves him; SH: the step east in the rise that brings the held fist and Obrokxus into the frame
    const fistAt = (o, x) => { const a = GenDuo.rexAnchors(x, L.y, h, o, ANC); BT.x = a.grip.x; BT.y = a.grip.y; return BT; };
    CR.face = -1; CR.fist = 1; GP.raise = 0;
    if (s < BS.grab) {   // Rex forces through the cut, fist, forearm, shoulder first (2.8-3.1, the body stays inside), then the dive carries him out; the leading arm is straight
      const u = clamp((sq - BS.barge) / 0.3, 0, 1), f = clamp((sq - BS.barge - 0.3) / (BS.grab - BS.barge - 0.3), 0, 1);
      RV.pose = "dive"; RV.pose2 = undefined; RV.mix = 0; RV.fist = 0; RV.venom = 0; RV.warm = 0;
      const x0 = tx - 0.05 * h, x1 = tx - 0.7 * h, gx = f > 0 ? mix(x1, PL.grabX * W, f) : mix(x0, x1, smooth(u)), gy = mix(cy, YG, f);
      rexAtCut(ctx, gx - GenDuo.rexAnchors(0, 0, h, RV, ANC).grip.x, gy - ANC.grip.y, h, RV, 0, 1, glow);
      return;
    }
    GP.venom = 0.5 * clamp((s - BS.bite) / 1.6, 0, 1);
    GP.pose2 = undefined; GP.mix = 0; GP.fist = 1;
    if (s < BS.land) {   // the fist closes on him in the air, a hit-stop, then the leap runs on and the feet hit
      const a = smooth(clamp((sq - BS.stop) / (BS.land - BS.stop), 0, 1)), T = fistAt(CR, L.x);
      RV.pose = "dive"; RV.pose2 = "crouch"; RV.mix = a; RV.fist = 1; RV.venom = 0; RV.raise = 0;
      const gx = mix(M2, T.x, a), gy = mix(YG, T.y, a);
      if (s < BS.grab + 0.2) { ctx.fillStyle = "rgba(245,138,52,0.35)"; ctx.beginPath(); ctx.arc(gx, gy, 0.09 * h, 0, 6.2832); ctx.fill(); }   // his glow flares
      body(ctx, RV, gx, gy, h, glow, true, sq - BS.slip, 0.4);
      return;
    }
    if (s < BS.set) {   // the landing: crouched on the floor, skidding west with dust at the feet, then the rise
      const k = smooth(clamp((sq - BS.land) / (BS.rise - BS.land), 0, 1)), ro = clamp((sq - BS.rise) / (BS.set - BS.rise), 0, 1);
      GP.pose = "crouch"; GP.pose2 = ro > 0 ? "grip" : undefined; GP.mix = smooth(ro); GP.raise = 0;
      const ax = L.x - SK * k + SH * smooth(clamp((sq - BS.rise + 0.15) / (BS.set - BS.rise + 0.15), 0, 1)), T = fistAt(GP, ax);
      body(ctx, GP, T.x, T.y, h, glow, true, sq - BS.slip, 0.4);
      const a = s - BS.land;
      for (let i = 0; i < 7; i++) {
        const q = Math.floor(a * 12) / 12, r = (0.014 + 0.005 * (i % 3)) * h, x = ax + (0.05 + 0.1 * i * Math.min(q, 0.5)) * h, y = L.y - (0.02 + 0.04 * (i % 3)) * h * Math.min(q, 0.6);
        ctx.save(); ctx.translate(x, y); ctx.rotate(i + q * 3);
        ctx.fillStyle = i % 2 ? "#b4461e" : "#7a5a4a"; ctx.fillRect(-r, -r * 0.7, 2 * r, 1.4 * r);
        ctx.restore();
      }
      return;
    }
    const sg = (Math.floor(sq * 12) % 2) * 2 - 1;
    GP.pose = "grip"; GP.raise = 0; GP.pose2 = "pry"; GP.mix = 0;
    const HG = fistAt(GP, OX); BC.gx = HG.x; BC.gy = HG.y;   // the held fist
    if (s < BS.recoil) {   // planted, one elbow bend, the fist before the chest; the arm trembles, the fingers flinch open; from the bite the free hand rises to pry
      const tr = 0.004 * H * sg;
      GP.mix = smooth(clamp((sq - BS.bite) / 0.4, 0, 1));
      GP.fist = (sq >= BS.bite + 0.7 && sq < BS.bite + 0.8) || (sq >= BS.bite + 1.0 && sq < BS.bite + 1.1) || (sq >= BS.bite + 1.25 && sq < BS.bite + 1.35) ? 0.55 : 1;
      body(ctx, GP, HG.x + tr, HG.y - 0.6 * tr, h, glow, true, sq - BS.slip, s < BS.bite ? 0.4 : 0.1);
      return;
    }
    /* the recoil: the arm is ripped back and the fist flies open, then he staggers a step east clutching the forearm; he springs off and flies up and west */
    const r = sq - BS.recoil, ox = OX + h * (0.12 * smooth(clamp(r / 0.4, 0, 1)) + 0.05 * smooth(clamp((r - 0.4) / 0.4, 0, 1)));
    if (r < 0.4) { GP.pose = "pry"; GP.pose2 = "recoil"; GP.mix = smooth(r / 0.4); }
    else if (r < 0.8) { GP.pose = "recoil"; GP.pose2 = "clutch"; GP.mix = smooth((r - 0.4) / 0.4); }
    else { GP.pose = "clutch"; GP.pose2 = undefined; GP.mix = 0; }
    GP.fist = s < BS.off ? 1 : 0;
    if (GP.fist > 0) { const A0 = GenDuo.rexAnchors(ox, L.y, h, GP, ANC); body(ctx, GP, A0.grip.x, A0.grip.y, h, glow, true, sq - BS.slip, 0.1); }
    else { GP.warm = 0; GenDuo.drawRex(ctx, ox, L.y, h, GP); }
    if (s >= BS.off) {
      const p = pos(sq, BP), wig = Math.floor(sq * 12) * 1.7;
      for (let i = 0; i < 16; i++) { const t = i / 15; TP[i * 2] = p.x + (1 - t) * sc; TP[i * 2 + 1] = p.y + 0.1 * sc * Math.sin(Math.PI * t) * Math.sin(wig + t * 6); }
      OB1.glow = glow; OB1.gait = sq - BS.slip;
      GenDuo.drawObrok1(ctx, 0, 0, sc, OB1);
    }
  }

  /* ---- duel: Obrokxus poisons him and flees flying, Rex recoils, leaps, catches him, crashes, and drags himself back to the cut ---- */
  /* stagger (to wind), wind-up (to leap), leap (to catch), catch (hit-stop to hit, then pulled in to carry), crash (to fall), drag into the cut (to seat), collapsed */
  const TM = { open: 0.8, recoil: 1.2, step1: 1.0, step2: 1.6, wind: 2.0, leap: 2.2, catch: 3.2, hit: 3.2, carry: 3.4, fall: 3.8, lie: 4.8, drag: 5.6, seat: 8.6, wide0: 0.8, wide1: 2.0, gate0: 8.0 };   // wind: crouch; leap: he leaves the floor; catch: both arms close on Obrokxus; carry: the crash begins; fall: he lies on him; lie: the drag starts; seat: the drag ends
  const HOVER = { x: 0.1, y: 0.4 }, CATCH = { x: 0.1, y: 0.4 };   // where Obrokxus circles to and where Rex catches him (W, H fractions); duel sets CATCH from the leap each frame
  const DC = { pose: "crawl", face: 1, fist: 1, venom: 1, cool: 0, venomA: 1 };
  const TP = [];
  for (let i = 0; i < 16; i++) TP.push(0, 0);
  const DU = { pose: "grip", face: -1, fist: 0, raise: 1 }, AD = {}, AC = {}, AR = {}, AE = {};
  const hold = d => Math.floor(d * 12 + 1e-6) / 12;

  function fly(d, out) {   // where Obrokxus is, from the fist that opens at 0.8: one rippling arc out of Rex's reach to the catch point, where he hangs while Rex winds up and leaps
    const W = G.W, H = G.H, q = Math.min(Math.max(hold(d), TM.open), TM.wind), u = (q - TM.open) / (TM.wind - TM.open);   // before the open he hangs where the burst left him
    out.x = mix(ST.x, CATCH.x, u) * W; out.y = (mix(ST.y, CATCH.y, u) - 0.08 * Math.sin(Math.PI * u)) * H + 0.02 * H * Math.sin(Math.PI * u) * Math.sin(u * 15);
    return out;
  }
  const FP = { x: 0, y: 0 }, FQ = { x: 0, y: 0 }, CZ = { pose: "crawl", face: 1, fist: 1, venom: 1, cool: 0, venomA: 1 };
  const RC = { pose: "recoil", face: -1 }, RO = { pose: "crawl", face: 1 };

  const SH = 0.23;   // the leap's origin is carried this far east of the crouch (W) so the stretched body and its reaching arms stay on screen
  function duel(ctx, d) {
    const W = G.W, H = G.H, red = G.reduced, g = wombG(), tx = tearX(g);
    const L = landing(g), h = L.h, z1 = cam().z1;
    const glow0 = red ? 0.2 : clamp(1 - 0.8 * ((G.zoom || 1) - 1) / Math.max(0.001, z1 - 1), 0.2, 1);   // near 1 wide, about 0.2 close
    bigTear(ctx, g, tx, 1, red ? 0 : Math.min(clamp((d - TM.fall) / 0.4, 0, 1), clamp((TM.seat + 0.4 - d) / 0.4, 0, 1)), mix(330 / 900 * H, 0.8 * H, clamp((d - TM.carry) / (TM.fall - TM.carry), 0, 1)), undefined);   // the cut opens as wide as his chest at the floor while he is dragged in, eased back as he settles
    const q = red ? TM.seat + 2.6 : hold(d), sc = OBS * h, tk = red ? 0 : G.t;
    if (!red) for (const t of [TM.open, TM.step1, TM.step2]) if (d >= t && d - t < 0.25) G.shake = Math.max(G.shake, 0.35);   // each step lands with a jolt
    if (!red && d >= TM.hit && d < TM.hit + 0.25) G.shake = Math.max(G.shake, 0.7);                                           // the catch: a small jolt after the hit-stop
    if (!red && d >= TM.seat && d < TM.seat + 0.4) G.shake = Math.max(G.shake, 1.4);                                           // the wedge: the hardest of the fight
    const ven = q < TM.recoil ? 0.5 : q < TM.wind ? 0.5 + 0.5 * (q - TM.recoil) / (TM.wind - TM.recoil) : 1;   // the red reaches the chest by the wind-up
    let wig = red || q >= TM.fall ? 0 : Math.floor(q * 12) * 1.7;   // the tail goes still once he lies on it
    const spine = (hx, hy, dir, len) => { for (let i = 0; i < 16; i++) { const t = i / 15; TP[i * 2] = hx - dir * (1 - t) * len; TP[i * 2 + 1] = hy + 0.1 * len * Math.sin(Math.PI * t) * Math.sin(wig + t * 6); } };
    const rx = L.x - 0.05 * W + 0.2 * W + 0.17 * h, ry = L.y, Fs = L.y + GenDuo.rexAnchors(0, 0, h, RC, AE).melt.y, F1 = 0.87 * H;   // Fs: the floor he stands on; F1: the floor he crashes onto
    const sit = o => GenDuo.rexAnchors(0, 0, h, o, AE).melt.y;
    const rel = (p1, p2, m, k, f) => { RO.pose = p1; RO.pose2 = p2; RO.mix = m; RO.face = f || 1; RO.raise = 1; return GenDuo.rexAnchors(0, 0, h, RO, AE)[k].x; };   // an anchor's x from the origin, in a pose or a blend
    DU.venom = ven; DU.fist = q >= TM.fall ? 1 : 0; DU.raise = 1; DU.face = -1; DU.cool = 0; DU.pose2 = undefined; DU.mix = 0; delete DU.warm;
    /* the drag's plan, from the cut back: the last pull ends with his collar at the cut where drop expects it; each pull moves the origin by what the fixed hand allows */
    const tl = LV.kx * tx + LV.ex, MK = [1, 1, 1, 1, 1, 0.8], FK = [1, 1.1, 1.2, 1.35, 1.55, 1.8], nk = 6, sFK = 8.0;
    const hP = rel("crawlPlant", undefined, 0, "handB"), xEnd = tl + 0.02 * h - rel("crawlPull", "crawlPlant", 1 - MK[nk - 1], "collar");
    let xs = xEnd; for (let k = 0; k < nk; k++) xs -= hP - rel("crawlPlant", "crawlPull", MK[k], "handB");
    const cP = rel("prone", undefined, 0, "collar"), xL = xs, xl = xL + 2 * cP;   // xL: where the drag starts (east-facing prone origin); xl: the same collar when he lies facing west
    const tT = TM.fall - TM.leap, tC = TM.catch - TM.leap, x0 = rx + SH * W, y0 = Fs - sit({ pose: "leap", face: -1 }), yL = F1 - sit({ pose: "prone", face: -1 });   // the flight from leaving the floor to touching it (leap to fall)
    const pA = 0.5 / tT, fp = t => { const p = t / tT, v = p < pA ? (p - pA) / pA : (p - pA) / (1 - pA); return 1 - v * v; };   // the arc peaks at 2.7: it rises on a decelerating curve, then falls ever faster
    const fx = t => mix(x0, xl, t / tT) + 0.16 * W * Math.sin(Math.PI * t / tT), fy = t => mix(y0, yL, t / tT) - 0.36 * h * fp(t);
    const hv = GenDuo.rexAnchors(fx(tC), fy(tC), h, { pose: "leap", face: -1 }, AR).handF;
    CATCH.x = hv.x / W; CATCH.y = hv.y / H;
    DU.face = -1;
    let ax, ay, ob = false, dirf = -1;
    if (q < TM.wind) {                                             // kneel with the poisoned arm hanging, then crouch low facing west, weight back
      const u = q < TM.recoil ? smooth(Math.min(1, q / 0.7)) : smooth((q - TM.recoil) / (TM.wind - TM.recoil));
      if (q < TM.recoil) { DU.pose = "clutch"; DU.pose2 = "kneel"; DU.mix = u; } else { DU.pose = "kneel"; DU.pose2 = "crouch"; DU.mix = u; }
      ax = rx; ay = Fs - sit(DU) + (q < TM.recoil ? (ry - Fs + sit({ pose: "clutch", face: -1 })) * (1 - u) : 0);   // frame 0 sits exactly where the burst's last frame stood
    } else if (q < TM.fall) {                                      // leap, catch, pull in, crash
      const t = q < TM.leap ? 0 : q - TM.leap, u = clamp((q - TM.catch) / (TM.carry - TM.catch), 0, 1);
      if (q < TM.leap) { DU.pose = "crouch"; DU.pose2 = "leap"; DU.mix = smooth((q - TM.wind) / (TM.leap - TM.wind)); }
      else if (q < TM.catch) { DU.pose = "leap"; }
      else if (q < TM.carry) { DU.pose = "leap"; DU.pose2 = "curl"; DU.mix = smooth(u); }
      else { DU.pose = "curl"; DU.pose2 = "prone"; DU.mix = smooth((q - TM.carry) / (TM.fall - TM.carry)); }
      if (!red && q >= TM.catch && q < TM.catch + 0.25) G.shake = Math.max(G.shake, 0.7);
      if (!red && q >= TM.fall - 0.1 && q < TM.fall + 0.25) G.shake = Math.max(G.shake, 1.0);
      ax = q < TM.leap ? rx + (q < TM.wind ? 0 : SH * W * DU.mix) : fx(t); ay = q < TM.leap ? Fs - sit(DU) : fy(t);   // the feet stay on the floor through the push-off (the blend's own floor line)
      ob = q >= TM.catch;
    } else {                                                       // he lies on him, then the drag: reach, plant, pull
      ob = true;
      if (q < TM.lie) {
        DU.pose = "prone"; ax = xl; ay = F1 - sit(DU);
        const b = clamp((q - TM.fall) / 0.2, 0, 1); ay += -0.03 * h * Math.sin(Math.PI * b);   // one small bounce
      } else if (q < TM.drag) {                                    // the turn: up onto knees and the free hand, curled small, mirrored at the most compact frame, down onto his chest facing east; the collar stays put
        const tu = (q - TM.lie) / (TM.drag - TM.lie), cc = xL + cP, mir = tu >= 0.5;
        DU.face = mir ? 1 : -1; dirf = DU.face;
        const hB = (m) => rel("prone", "lowCurl", m, "handB", -1), cM = xl + hB(0) - hB(1) + rel("prone", "lowCurl", 1, "collar", -1);   // the free hand stays planted while the body draws in; cM: the collar at the mirror
        if (tu < 0.5) { DU.pose = "prone"; DU.pose2 = "lowCurl"; DU.mix = smooth(tu / 0.5); }   // low and heavy: the knees draw under him into a low curl, the chest stays down, the free hand pushes
        else { DU.pose = "lowCurl"; DU.pose2 = "prone"; DU.mix = smooth((tu - 0.5) / 0.5); }   // the mirror is at the low curl; the legs push out west, he settles prone facing east
        if (!mir) ax = xl + hB(0) - hB(DU.mix);
        else ax = mix(cM, cc, DU.mix) - rel(DU.pose, DU.pose2, DU.mix, "collar", DU.face);
        ay = F1 - sit(DU);
      } else if (q < TM.seat) {
        DU.face = 1; dirf = 1;
        let k = 0, s0 = TM.drag, dur = 0; const span = TM.seat - TM.drag;
        for (let i = 0, a = 0; i < nk; i++) { const d0 = TM.drag + span * a / sFK; a += FK[i]; dur = span * FK[i] / sFK; k = i; s0 = d0; if (q < TM.drag + span * a / sFK) break; }
        let xo = xL; for (let i = 0; i < k; i++) xo += hP - rel("crawlPlant", "crawlPull", MK[i], "handB");
        const tr = clamp((q - s0) / dur, 0, 1), from = k === 0 ? "prone" : "crawlPull";
        if (tr < 0.3) { DU.pose = from; DU.pose2 = "crawlReach"; DU.mix = smooth(tr / 0.3); ax = xo; }
        else if (tr < 0.38) { DU.pose = "crawlReach"; DU.pose2 = "crawlPlant"; DU.mix = (tr - 0.3) / 0.08; ax = xo; }
        else {
          const m = MK[k] * smooth(clamp((tr - 0.38) / 0.43, 0, 1));
          DU.pose = "crawlPlant"; DU.pose2 = "crawlPull"; DU.mix = m;
          ax = xo + hP - rel("crawlPlant", "crawlPull", m, "handB");   // the planted hand stays where it is; the body comes to it
        }
        ay = F1 - sit(DU);
      } else {                                                     // the last frames: the collar stays at the cut while he settles into drop's crawl, sunk 0.03 h
        const u = smooth(clamp((q - TM.seat) / (DUEL - TM.seat), 0, 1));
        DU.face = 1; dirf = 1; DU.pose = "crawlPull"; DU.pose2 = "crawl"; DU.mix = u;
        ax = tl + 0.02 * h - rel("crawlPull", "crawl", u, "collar"); ay = F1 - sit(DU) + 0.03 * h * u;
      }
    }
    DU.venomA = 1;
    GenDuo.rexAnchors(ax, ay, h, DU, AR);
    if (q < TM.catch) {                                          // Obrokxus flying, legs running; his head leads
      fly(q, FP); fly(q + 0.1, FQ);
      let dir = q < TM.open ? -1 : FQ.x >= FP.x ? 1 : -1;
      if (q >= TM.wind) {   // he flees west and up just ahead of the hands; the lead closes to nothing at the catch
        const lw = Math.pow(1 - (q - TM.wind) / (TM.catch - TM.wind), 1.5);
        FP.x = AR.handF.x - (0.03 + 0.05 * lw) * W; FP.y = AR.handF.y - 0.25 * h * lw; dir = -1;
      }
      spine(FP.x, FP.y, dir, sc);
      OB1.path = TP; OB1.face = dir; OB1.glow = glow0; OB1.gait = q - TM.open;
      GenDuo.drawObrok1(ctx, 0, 0, sc, OB1);
    } else {                                                       // caught, pulled to the chest, then under it: only his tail shows, lashing twice, then still; he travels with the chest
      const c = clamp((q - TM.catch) / (TM.carry - TM.catch), 0, 1), la = q >= TM.fall && q < TM.fall + 0.9 ? Math.max(0, Math.sin(2 * Math.PI * (q - TM.fall) / 0.45)) : 0;
      const dn = smooth(clamp((q - TM.carry) / (TM.fall - TM.carry), 0, 1));   // once he lies, the tail sticks out ahead from under the chest (0.3 h from it) and rides with the chest, held by the curled arm
      const gh = clamp((q - TM.fall) / (TM.lie - TM.fall), 0, 1);   // dead: from the lie on he rides in the poisoned hand (the near hand's grip)
      const ox = mix(AR.chest.x + 0.084 * h * dirf, AR.grip.x, gh), oy = mix(AR.chest.y + (0.02 + 0.1 * dn) * h, AR.grip.y, gh);
      spine(mix(AR.handF.x, ox, c), mix(AR.handF.y, oy, c), -dirf, 0.9 * sc);
      for (let i = 0; i < 16; i++) { const t = i / 15; TP[i * 2 + 1] -= la * 0.35 * sc * (1 - t) * (1 - t); }   // the tail end (t = 0) lifts
    }
    const fl = q < TM.catch ? glow0 : glow0 * (1 - 0.75 * clamp((q - TM.carry) / 1.2, 0, 1));   // the glow dims at the crush and stays dim
    rexAtCut(ctx, ax, ay, h, DU, ob ? sc : 0, dirf, fl, false);
    if (!red && q >= TM.fall - 0.05 && q < TM.fall + 0.55) {       // 24 dim brown chips kicked up at the crash: rise, drift out, fade (0.6 s)
      const a = clamp((q - TM.fall + 0.05) / 0.6, 0, 1);
      ctx.fillStyle = "rgba(92,70,56," + (0.5 * (1 - a)).toFixed(2) + ")";
      for (let i = -1; i <= 1; i += 2) for (let j = 0; j < 12; j++) {
        const s = Math.sin(j * 12.9898 + 4.1), u = s * 43758.5453 % 1, v = Math.abs(u), r = (0.012 + 0.02 * v) * h * (1 - 0.4 * a), th = (j * 2.4 + a * (2 + v * 3)) * i;
        const x = AR.chest.x + i * (0.1 + 0.05 * j + (0.3 + 0.4 * v) * a) * h, y = F1 - (0.01 + 0.1 * v) * h - (0.05 + 0.12 * v) * h * a;
        ctx.beginPath(); ctx.moveTo(x + r * Math.cos(th), y + r * Math.sin(th)); ctx.lineTo(x + r * 0.8 * Math.cos(th + 2.1), y + r * 0.8 * Math.sin(th + 2.1)); ctx.lineTo(x + r * 1.2 * Math.cos(th + 4.0), y + r * 1.2 * Math.sin(th + 4.0)); ctx.closePath(); ctx.fill();
      }
    }
  }

  /* zoom and its focus (the fist, once it is out and Rex stands) for genesis.js, burst and duel */
  function cam() {
    const g = wombG(), W = G.W, H = G.H, s = G.secs("burst");
    if (!(g.ry > 0 && W > 0 && H > 0)) return { z: s >= BURST + DUEL ? 1.25 : 1, z0: 1, z1: 1, fx: W / 2, fy: H / 2 };   // a seek straight to drop must not start at 1 and push in to the duel's 1.25; before the first resize a NaN here would stick in G.zoom for good
    const L = landing(g), h = L.h, gr = { x: (L.gx + L.cx) / 2, y: (L.gy + L.cy) / 2 };   // the camera closes between the landed fist and his chest
    /* the wide view is the 1x frame; the push-in to the fist is done 0.3 s before the beat ends */
    const z0 = 1, z1 = clamp(1.7 * H / h, 1, 1.8);   // 1.8 keeps the fist and the chest both in the close frame
    const hs = t => Math.floor(smooth(clamp(t, 0, 1)) * 12) / 12;
    const wide = mix(z1, 1, 0.3);   // the recoil's push-in stops here
    let k = s < BS.recoil ? 0 : (mix(1, wide, hs((s - BS.recoil) / (BURST - BS.recoil))) - 1) / (z1 - 1), zg = 0;   // wide until the recoil, then the push to the duel's opening frame (never just an arm)
    const d = s - BURST;
    if (s >= BURST) { k = d < 1 ? ((wide - 1) / (z1 - 1)) * (1 - hs(d)) : 0; zg = d >= TM.gate0 ? 0.25 * hs((d - TM.gate0) / (DUEL - TM.gate0)) : 0; }   // the duel: close, the pull-back to the wide shot, wide to the slam, then in on the gate (at most 1.5)
    if (s >= BURST + DUEL) { k = 0; zg = 0.25 * (1 - hs((s - BURST - DUEL - DD.dieA) / (DD.camB - DD.dieA))); }   // drop: starts where the duel ends (1.25, about the gate) and pulls back to 1 as he dies
    /* the close view: the pivot that puts the fist in the middle of the frame at z1 (fx, fy are that pivot) */
    /* a pivot outside the frame pulls the view past the painted scene: clamp it, the fist then sits off-centre */
    const px = clamp((0.5 * W - z1 * gr.x) / (1 - z1), 0, W), py = clamp((0.5 * H - z1 * gr.y) / (1 - z1), 0, H);
    let fx = px, fy = py;
    if (s < BS.set && z1 > 1.001) {   // the peek and the pull-back pivot on the tear (genesis.js blends the pivot as W/2 + f (fx - W/2), f from the eased zoom)
      const fz = clamp(((G.zoom || 1) - z0) / (z1 - z0), 0, 1);
      if (fz > 0.05) { fx = 0.5 * W + (tearX(g) - 0.5 * W) / fz; fy = 0.5 * H + (g.cy - 0.5 * H) / fz; }
    }
    if (s >= BS.recoil && s < BURST && z1 > 1.001) {   // the push-in only as far as his whole head (0.1 H below the top edge) and Obrokxus stay in frame: the duel's opening zoom takes the rest
      const f2 = smooth(clamp((s - BS.off) / (BS.hover - BS.off), 0, 1)), ox = mix(L.gx, ST.x * W, f2), oy = mix(L.gy, ST.y * H, f2), hy = L.y - 1.02 * h;
      for (; k > 0; k -= 0.02) {
        const z = mix(z0, z1, k), fxe = 0.5 * W + k * (fx - 0.5 * W), fye = 0.5 * H + k * (fy - 0.5 * H);
        if (fye + z * (hy - fye) >= 0.1 * H && fxe + z * (ox - fxe) >= 0.05 * W && fye + z * (oy - fye) >= 0.04 * H) break;
      }
      k = Math.max(k, 0);
    }
    const zz = mix(z0, z1, k) + zg;
    if (s >= BURST && d >= TM.gate0 && zz > 1) {   // the push-in on the gate pivots on the east edge at the hole's height (genesis.js blends the pivot as W/2 + f (fx - W/2), f = (z - z0) / (z1 - z0)), so the body keeps its east cut and only grows west
      const zd = s >= BURST + DUEL && G.zoom > 1 ? G.zoom : zz;   // in the drop genesis.js's blend uses the eased G.zoom, which lags the target: take f from it, or the pivot slips east of W and the ground leaves a gap at the east edge
      const f = clamp((zd - z0) / Math.max(0.001, z1 - z0), 0, 1);
      if (f > 0) { fx = 0.5 * W + 0.5 * W / f; fy = 0.5 * H + (g.cy - 0.5 * H) / f; }
    }
    return { z: zz, z0, z1, fx, fy, gx: L.gx, gy: L.gy };
  }

  function draw(ctx) {
    const s = G.secs("burst"), W = G.W, H = G.H, red = G.reduced;
    if (s <= 0) return;
    if (s >= BURST + DUEL) { drop(ctx, s - BURST - DUEL); return; }   // drop, then the land and after: he stays in the hole
    if (s < BURST) { burst(ctx, s); return; }
    duel(ctx, s - BURST);
  }

  return { draw, cam, cutPath, cutGeom };
})();
