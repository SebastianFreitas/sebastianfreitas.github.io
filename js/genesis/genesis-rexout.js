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
    DC.cool = 1;   // the duel ends with him cold, wedged and his glow out: the drop starts there
    DC.venomA = 1 - 0.75 * step(d, DD.dieA, DD.venomB, 3);
    const mt = step(d, DD.meltA, DD.meltB, 16);   // the melt: 0 to 1, the body goes soft and sinks inside the cut
    DC.melt = mt; DC.meltSink = true;
    stream(ctx, d, mt);
    if (d >= DD.meltB) return;   // no body, no Obrokxus: the cut dark and empty
    const glow = 0;
    const tl = LV.kx * tx + LV.ex, ref = GenDuo.rexAnchors(0, 0, h, DC, ANC);   // he lies where the drag left him: the collar at the live cut, the chest on the floor
    const ax = tl - ref.collar.x + 0.02 * h, ay = 0.87 * G.H - ref.melt.y + 0.03 * h;
    GenDuo.rexAnchors(ax, ay, h, DC, ANC);
    const sc = OBS * h;   // crushed under his fist, as on the duel's last frame (same place, facing and size)
    for (let i = 0; i < 16; i++) { const t = i / 15; TP[i * 2] = ANC.grip.x + 0.4 * sc - (1 - t) * 0.8 * sc; TP[i * 2 + 1] = ANC.grip.y; }
    rexAtCut(ctx, ax, ay, h, DC, sc, 1, glow, false);
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
  const BS = { peek: 0.7, slip: 1.8, fly: 2.2, barge: 3.4, grab: 4.2, stop: 4.3, land: 4.6, set: 5.2, bite: 6.0, recoil: 7.0, off: 7.15, hover: 8.2 };
  const ZP = 1.7;   // the zoom while he peeks, about the tear
  const ST = { x: 0.09, y: 0.09 };   // where Obrokxus hangs as the burst ends and the duel opens (W, H fractions: up and west of the fist)
  const CUT_OPEN = 0.7;   // seconds from the start of burst for the cut to open from a point to its rest shape
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
  function rexAtCut(ctx, x, y, h, o, sc, face, glow, only) {   // only: just inside the cut, none of him in the open
    for (let e = only ? 1 : 0; e < 2; e++) {
      cutClip(ctx, e === 1, !!only);
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


  const RV = { pose: "reach", face: -1, fist: 0 };
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
  function trail(ctx, mode, from) {   // a short fading trail of flat embers along where he was (mode 0: the run to the grab, 1: the flight off)
    ctx.fillStyle = "#f58a34";
    for (let i = 1; i <= 5; i++) {
      const t = Math.floor((BC.sq - i * 0.1) * 12 + 1e-6) / 12; if (t < from) break;
      const p = mode ? pos(t, BT) : cen(t, BT), px = p.x + (mode ? BC.sc : 0.5 * BC.sc), r = 0.011 * BC.H * (1 - i * 0.12);
      ctx.globalAlpha = 0.6 - 0.1 * i; ctx.fillRect(px - r, p.y - r, 2 * r, 2 * r);
    }
    ctx.globalAlpha = 1;
  }
  function burst(ctx, s) {
    const H = G.H, W = G.W, red = G.reduced, g = wombG(), tx = tearX(g);
    const h = Math.min(2 * g.ry, 0.86 * H);
    if (red) { bigTear(ctx, g, tx, 1, 0, g.cy); const L = landing(g); GP.venom = 0.25; GP.mix = 0; body(ctx, GP, L.gx, L.gy, h, 0.2, false); return; }
    const open = Math.floor(smooth(clamp(s / CUT_OPEN, 0, 1)) * 12) / 12;   // the cut opens once, from a point, before the peek
    const pass = Math.min(clamp((s - BS.barge) / 0.4, 0, 1), clamp((BS.grab + 0.8 - s) / 0.8, 0, 1));   // open as wide as he is tall while he passes, eased back within 0.8 s
    const sb = Math.floor(s * 12 + 1e-6) / 12, byB = s < BS.barge ? g.cy : s < BS.grab ? mix(g.cy, 0.42 * H, (sb - BS.barge) / (BS.grab - BS.barge)) : mix(0.42 * H, g.cy, clamp((sb - BS.grab) / 0.8, 0, 1));   // follows the hand up, then eases back with the bulge
    CRK = clamp((Math.floor(s * 12 + 1e-6) / 12 - BS.barge) / 0.25, 0, 1);   // a tiny slit until Rex barges, then he rips it to the full cut in three held frames
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
        if (s >= BS.fly) trail(ctx, 0, BS.fly);
        const c = cen(sq, BP);
        obPath(c.x - 0.5 * sc, c.y, sc, 1, sq * 9);
        OB1.glow = glow; OB1.gait = sq - BS.slip;
        GenDuo.drawObrok1(ctx, 0, 0, sc, OB1);
      }
      ctx.restore();
    }
    if (s < BS.barge) return;
    const L = landing(g);
    if (s < BS.grab) {   // Rex forces through the cut, hand, arm, shoulder, from reach into the dive
      const a = (sq - BS.barge) / (BS.grab - BS.barge);
      RV.pose = "reach"; RV.pose2 = "dive"; RV.mix = a; RV.fist = 0; RV.venom = 0; RV.warm = 0;
      const gx = mix(tx - 0.1 * h, PL.grabX * W, a), gy = mix(cy, YG, a);
      rexAtCut(ctx, gx - GenDuo.rexAnchors(0, 0, h, RV, ANC).grip.x, gy - ANC.grip.y, h, RV, 0, 1, glow);
      return;
    }
    GP.venom = 0.5 * clamp((s - BS.bite) / 3, 0, 1);
    GP.pose2 = "curl"; GP.mix = 0; GP.fist = 1;
    if (s < BS.land) {   // the fist closes on him in the air, a hit-stop, then the leap runs on to the landing
      const a = clamp((sq - BS.stop) / (BS.land - BS.stop), 0, 1);
      RV.pose = "dive"; RV.pose2 = "grip"; RV.mix = a; RV.fist = 1; RV.venom = 0;
      const gx = mix(M2, L.gx, a), gy = mix(YG, L.gy, a);
      if (s < BS.grab + 0.2) { ctx.fillStyle = "rgba(245,138,52,0.35)"; ctx.beginPath(); ctx.arc(gx, gy, 0.09 * h, 0, 6.2832); ctx.fill(); }   // his glow flares
      body(ctx, RV, gx, gy, h, glow, true, sq - BS.slip, 0.4);
      return;
    }
    if (s < BS.set) {   // the landing: the body drops and compresses, then rises; a few flat shards fly
      const u = (sq - BS.land) / (BS.set - BS.land), v = Math.sin(Math.PI * u);
      const e = clamp(0.7 + 2 * u, 0, 1);   // the elbow bends as he lands: never a straight arm
      GP.raise = 1 - 0.3 * e; GP.mix = 0.14 * e + 0.2 * v;
      body(ctx, GP, L.gx, L.gy + 0.05 * H * v, h, glow, true, sq - BS.slip, 0.4);
      const a = s - BS.land;
      for (let i = 0; i < 6; i++) {
        const k = Math.floor(a * 12) / 12, r = (0.012 + 0.004 * (i % 3)) * h, x = L.cx + (i - 2.5) * 0.09 * h * k, y = 0.78 * H - (0.35 + 0.1 * (i % 3)) * h * k + 1.6 * h * k * k;
        ctx.save(); ctx.translate(x, y); ctx.rotate(i + k * 3);
        ctx.fillStyle = "#b4461e"; ctx.fillRect(-r, -r * 0.7, 2 * r, 1.4 * r);
        ctx.fillStyle = "#f58a34"; ctx.fillRect(-r, -r * 0.7, 0.8 * r, 1.4 * r);
        ctx.restore();
      }
      return;
    }
    const sg = (Math.floor(sq * 12) % 2) * 2 - 1;
    if (s < BS.recoil) {   // close on the fist: he coils round the wrist, legs working; the arm strains and trembles, the fingers flinch open
      const u = (sq - BS.set) / (BS.recoil - BS.set), tr = 0.004 * H * sg;
      const fl = Math.sin(Math.PI * clamp((sq - BS.bite) / 0.4, 0, 1));   // the bite: the arm flinches out, then the poison drags it in, shaking and sagging
      GP.pose2 = "curl"; GP.mix = 0.14 + 0.16 * u + 0.03 * sg - 0.07 * fl; GP.raise = 0.7 - 0.025 * st - 0.12 * clamp((sq - BS.bite - 0.3) / 0.7, 0, 1);
      GP.fist = (sq >= 6.3 && sq < 6.4) || (sq >= 6.6 && sq < 6.7) || (sq >= 6.85 && sq < 6.95) ? 0.55 : 1;
      body(ctx, GP, L.gx + tr, L.gy - 0.6 * tr, h, glow, true, sq - BS.slip, s < BS.bite ? 0.4 : 0.1);
      return;
    }
    /* the recoil: the arm is ripped back past its place and settles; he springs off and flies up and west, the red climbing */
    const u = clamp((sq - BS.recoil) / 1.2, 0, 1), ox = L.x + 0.1 * h * Math.sin(Math.PI * u), oy = L.y;
    if (u < 1) {   // the curl lets go to the plain grip, which rips back to the recoil past its place and settles (each blend finishes before the next; a pose is swapped only where the picture is identical), then the swing eases in
      GP.pose = "grip"; GP.raise = mix(0.58, 1, smooth(u));
      if (u < 0.4) { GP.pose2 = "curl"; GP.mix = 0.3 * (1 - smooth(u / 0.4)); }
      else { const w = (u - 0.4) / 0.6; GP.pose2 = "recoil"; GP.mix = smooth(w); }
    } else { GP.pose = "recoil"; GP.pose2 = "curl"; GP.mix = SW(s) * smooth(clamp((sq - BS.recoil - 1.2) / 0.8, 0, 1)); GP.raise = 1; }
    GP.fist = s < BS.off ? 1 : 0;
    const A0 = GenDuo.rexAnchors(0, 0, h, GP, ANC);
    const A7 = GenDuo.rexAnchors(0, 0, h, { pose: "grip", pose2: "curl", mix: 0.3, raise: 0.58, fist: 1, face: -1 }, {});   // the pose at the end of the bite: its origin, where the fist is held
    const e0 = smooth(u), px = mix(L.gx - A7.grip.x, ox, e0), py = mix(L.gy - A7.grip.y, oy, e0);   // the body starts from that origin and the swing's origin takes over
    if (GP.fist > 0) body(ctx, GP, px + A0.grip.x, py + A0.grip.y, h, glow, true, sq - BS.slip, 0.1);
    else { GP.warm = 0; GenDuo.drawRex(ctx, px, py, h, GP); }
    if (s >= BS.off) {
      BC.gx = L.gx; BC.gy = L.gy;
      trail(ctx, 1, BS.off);
      const p = pos(sq, BP), wig = Math.floor(sq * 12) * 1.7;
      for (let i = 0; i < 16; i++) { const t = i / 15; TP[i * 2] = p.x + (1 - t) * sc; TP[i * 2 + 1] = p.y + 0.1 * sc * Math.sin(Math.PI * t) * Math.sin(wig + t * 6); }
      OB1.glow = glow; OB1.gait = sq - BS.slip;
      GenDuo.drawObrok1(ctx, 0, 0, sc, OB1);
    }
  }

  /* ---- duel: Obrokxus poisons him and flees flying, Rex recoils, leaps, catches him, crashes, and drags himself back to the cut ---- */
  /* stagger (to wind), wind-up (to leap), leap (to catch), catch (hit-stop to hit, then pulled in to carry), crash (to fall), drag into the cut (to seat), collapsed */
  const TM = { open: 0.8, recoil: 1.2, step1: 1.0, step2: 1.6, wind: 2.0, leap: 2.8, catch: 3.8, hit: 3.92, carry: 4.3, fall: 5.0, seat: 8.6, wide0: 0.8, wide1: 2.0, gate0: 8.0 };   // carry: the crash begins; fall: he lies on the floor; seat: the drag ends, collapsed in the cut
  const HOVER = { x: 0.58, y: 0.26 }, CATCH = { x: 0.62, y: 0.4 };   // where Obrokxus's circling ends (out of reach) and where Rex catches him (W, H fractions)
  const DC = { pose: "crawl", face: 1, fist: 1, venom: 1, cool: 0, venomA: 1 };
  const TP = [];
  for (let i = 0; i < 16; i++) TP.push(0, 0);
  const DU = { pose: "grip", face: -1, fist: 0, raise: 1 }, AD = {}, AC = {}, AR = {}, AE = {};
  const hold = d => Math.floor(d * 12 + 1e-6) / 12;

  function stones(ctx, ox, oy, h, d, t0) {   // stones cracked loose, falling in held steps
    for (let i = 0; i < 4; i++) {
      const a = d - t0 - i * 0.12;
      if (a < 0 || a > 1.5) continue;
      const u = Math.floor(a * 12) / 12, x = ox + (i - 1.5) * 0.035 * h + u * (i % 2 ? -0.05 : 0.04) * h, y = oy + 0.8 * 1.6 * h * u * u, r = (0.022 + 0.006 * (i % 3)) * h, an = i + u * 3;
      ctx.save(); ctx.translate(x, y); ctx.rotate(an);
      ctx.fillStyle = "#b4461e"; ctx.fillRect(-r, -r * 0.7, 2 * r, 1.4 * r);
      ctx.fillStyle = "#f58a34"; ctx.fillRect(-r, -r * 0.7, 0.8 * r, 1.4 * r);
      ctx.restore();
    }
  }
  function fly(d, out) {   // where Obrokxus is, from the fist that opens at 0.8: one rippling arc out of Rex's reach to the hover, a slow drift while Rex winds up and leaps, where he is caught
    const W = G.W, H = G.H, q = Math.min(Math.max(hold(d), TM.open), TM.catch);   // before the open he hangs where the burst left him
    if (q < TM.leap) {
      const u = (q - TM.open) / (TM.leap - TM.open);
      out.x = mix(ST.x, HOVER.x, u) * W; out.y = (mix(ST.y, HOVER.y, u) - 0.08 * Math.sin(Math.PI * u)) * H + 0.02 * H * Math.sin(Math.PI * u) * Math.sin(u * 15);
    } else {
      const u = (q - TM.leap) / (TM.catch - TM.leap);
      out.x = mix(HOVER.x, CATCH.x, u) * W; out.y = mix(HOVER.y, CATCH.y, u) * H;
    }
    return out;
  }
  const FP = { x: 0, y: 0 }, FQ = { x: 0, y: 0 }, CZ = { pose: "crawl", face: 1, fist: 1, venom: 1, cool: 0, venomA: 1 };
  const RC = { pose: "recoil", face: -1 };

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
    const wig = red ? 0 : Math.floor(q * 12) * 1.7;
    const spine = (hx, hy, dir, len) => { for (let i = 0; i < 16; i++) { const t = i / 15; TP[i * 2] = hx - dir * (1 - t) * len; TP[i * 2 + 1] = hy + 0.1 * len * Math.sin(Math.PI * t) * Math.sin(wig + t * 6); } };
    const stag = q < TM.step1 ? 0 : q < TM.step2 ? 0.04 : 0.08;   // two heavy steps back
    const rx = L.x + stag * h, ry = L.y, chY = GenDuo.rexAnchors(L.x, L.y, h, RC, AE).chest.y;   // chY: the chest's height through the reel and the lunge's start
    DU.venom = ven; DU.fist = 0; DU.raise = 1; DU.face = -1; delete DU.warm;
    if (q < TM.catch) {                            // Obrokxus flying, legs running; his head leads
      fly(q, FP); fly(q + 0.1, FQ);
      const dir = q < TM.open ? -1 : FQ.x >= FP.x ? 1 : -1;
      spine(FP.x, FP.y, dir, sc);
      OB1.path = TP; OB1.face = dir; OB1.glow = glow0; OB1.gait = q - TM.open;
      GenDuo.drawObrok1(ctx, 0, 0, sc, OB1);
    }
    const A8 = GenDuo.rexAnchors(L.x + 0.08 * h, L.y, h, RC, AE), csx = A8.chest.x, csy = A8.chest.y;   // the chest where the stagger ends: the wind-up and the leap start from it
    DV.face = 1; DV.venom = 1; DV.fist = 0;
    const aD = GenDuo.rexAnchors(0, 0, h, DV, AD), Pc = fly(TM.catch, FQ);
    const ox0 = csx - aD.chest.x, oy0 = csy - aD.chest.y, ox3 = Pc.x - aD.grip.x, oy3 = Pc.y - aD.grip.y;   // the leap's start and the catch, as the dive's origin (he then sags 0.02 h as he pulls Obrokxus in)
    if (q < TM.wind) {                                             // staggering: the dead arm hangs, west-facing from the poison
      DU.pose = "recoil"; DU.pose2 = "curl"; DU.mix = SW(BURST + q); GenDuo.drawRex(ctx, rx, ry, h, DU); DU.pose2 = undefined;
    } else if (q < TM.leap) {                                      // wind-up: he turns east, sinks toward the curl and draws the good arm back
      const u = (q - TM.wind) / (TM.leap - TM.wind);
      DU.pose = "recoil"; DU.face = 1; DU.pose2 = "curl"; DU.mix = mix(SW(BURST + TM.wind), 0.4, u); DU.raise = 1 - 0.6 * u;
      const A0 = GenDuo.rexAnchors(0, 0, h, DU, AE);
      GenDuo.drawRex(ctx, csx - A0.chest.x, csy - A0.chest.y + 0.03 * h * u, h, DU);
      DU.pose2 = undefined; DU.raise = 1;
    } else if (q < TM.carry) {                                     // the leap in the dive, then the catch: the good arm clamps him to the chest
      const u = clamp((q - TM.leap) / (TM.catch - TM.leap), 0, 1), e = 1 - (1 - u) * (1 - u), c = clamp((q - TM.hit) / (TM.carry - TM.hit), 0, 1);   // e: most of the way in the first 60%; c: pulled in after the hit-stop
      const cx = mix(ox0, ox3, e), cy = mix(oy0, oy3, e) - 0.05 * H * Math.sin(Math.PI * u) + 0.02 * h * c;
      DV.fist = q >= TM.catch ? 1 : 0;
      GenDuo.rexAnchors(cx, cy, h, DV, AR);
      DV.warm = DV.fist ? 1 : 0; DV.warmX = AR.grip.x; DV.warmY = AR.grip.y;   // his glow flares at the catch
      GenDuo.drawRex(ctx, cx, cy, h, DV);
      if (DV.fist) { spine(mix(AR.grip.x, AR.chest.x, c), mix(AR.grip.y, AR.chest.y, c), 1, sc); GenDuo.drawObrok1(ctx, 0, 0, sc, { path: TP, face: 1, glow: 1 }); GenDuo.drawRexFingers(ctx, cx, cy, h, DV); }
      DV.warm = 0;
    } else {                                                       // the crash to the floor, then the drag: pulls on one arm, the fist clenched on Obrokxus, into the live cut
      const cr = q < TM.fall, tl = LV.kx * tx + LV.ex, T1 = TM.seat - 0.6, np = 4;
      const wk = clamp((q - TM.fall) / (T1 - TM.fall), 0, 1) * np, kk = Math.min(np - 1, Math.floor(wk)), hp = clamp((wk - kk - 0.45) / 0.55, 0, 1);   // each pull: reach and grip (0 to 0.45), then the haul slides him
      const prog = q >= T1 ? 1 : (kk + smooth(hp)) / np, sl = clamp((q - T1) / (TM.seat - T1), 0, 1);
      CZ.pose = "crawl"; CZ.pose2 = undefined; CZ.mix = 0;
      const ref = GenDuo.rexAnchors(0, 0, h, CZ, AR), xE = tl - ref.collar.x + 0.02 * h, xS = Math.min(Pc.x - ref.collar.x, xE - 0.5 * h), yF = 0.87 * H - ref.melt.y;
      let ax, ay;
      if (cr) {   // the drop from the catch: the dive lets go into the crawl as he hits the floor
        const u = (q - TM.carry) / (TM.fall - TM.carry);
        CZ.pose = "dive"; CZ.pose2 = "crawl"; CZ.mix = smooth(clamp(u / 0.8, 0, 1));
        ax = mix(ox3, xS, u * u); ay = mix(oy3 + 0.02 * h, yF, u * u);
        if (!red && u >= 0.95) G.shake = Math.max(G.shake, 1.0);
      } else {
        CZ.pose2 = "curl"; CZ.mix = q < T1 ? 0.1 * Math.sin(Math.PI * hp) : 0;
        ax = mix(xS, xE, prog) + (q < T1 ? 0.012 * h * Math.sin(Math.PI * hp) : 0); ay = yF + 0.03 * h * smooth(sl);   // the collapse: he settles onto his fist
        if (!red && q >= TM.seat) G.shake = Math.max(G.shake, 0.6 * (1 - clamp((d - TM.seat) / 0.4, 0, 1)));
      }
      CZ.cool = cr ? 0 : clamp((q - TM.fall) / (TM.seat - TM.fall), 0, 1);
      GenDuo.rexAnchors(ax, ay, h, CZ, AR);
      const fl = cr ? glow0 : glow0 * (1 - clamp((q - T1) / (TM.seat - T1), 0, 1));   // the glow dies as he comes down on it
      spine(AR.grip.x + 0.4 * sc, AR.grip.y, 1, 0.8 * sc);
      rexAtCut(ctx, ax, ay, h, CZ, sc, 1, fl, false);
      if (!red && q >= TM.seat) stones(ctx, tl, g.cy - 0.3 * H, h, d, TM.seat);
    }
  }

  /* zoom and its focus (the fist, once it is out and Rex stands) for genesis.js, burst and duel */
  function cam() {
    const g = wombG(), W = G.W, H = G.H, s = G.secs("burst");
    if (!(g.ry > 0 && W > 0 && H > 0)) return { z: 1, z0: 1, z1: 1, fx: W / 2, fy: H / 2 };   // before the first resize a NaN here would stick in G.zoom for good
    const L = landing(g), h = L.h, gr = { x: (L.gx + L.cx) / 2, y: (L.gy + L.cy) / 2 };   // the camera closes between the landed fist and his chest
    /* the wide view is the 1x frame; the push-in to the fist is done 0.3 s before the beat ends */
    const z0 = 1, z1 = clamp(1.7 * H / h, 1, 1.8);   // 1.8 keeps the fist and the chest both in the close frame
    const hs = t => Math.floor(smooth(clamp(t, 0, 1)) * 12) / 12;
    const zp = Math.min(ZP, z1), wide = mix(z1, 1, 0.3);   // the peek's close zoom about the tear; the recoil's widening stops here
    let k = s < BS.fly ? (zp - 1) / (z1 - 1) : s < BS.barge ? mix(zp - 1, 0, hs((s - BS.fly) / (BS.barge - BS.fly))) / (z1 - 1) : s < BS.set ? 0 : s < BS.bite ? hs((s - BS.set) / (BS.bite - BS.set)) : s < BS.recoil ? 1 : (mix(z1, wide, hs((s - BS.recoil) / 1.6)) - 1) / (z1 - 1), zg = 0;
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
