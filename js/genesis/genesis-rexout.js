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

  const BURST = G.BEATS[G.idxOf("burst")].dur, SHED = G.BEATS[G.idxOf("shed")].dur, DUEL = G.BEATS[G.idxOf("duel")].dur, DROP = G.BEATS[G.idxOf("drop")].dur;
  const VK = 1.21;   // the void Rex's drawn height over the orange womb Rex's in the shed beat
  const VBODY = 1.338;   // the void body drawn at k = 1 is 911 px where the orange Rex is 681 px at the same h, so o.k = VK / VBODY
  const VKF = VK / VBODY;
  function vsit(h, o) {   // how far the foot line sits above the void Rex's lowest stone point in pose o (what rexAnchors' melt.y was for the orange one): ay = floor - vsit puts his lowest stone on the floor
    let lo = 1e9; GenVoidForms.rexVoidPolys(o).polys.forEach(l => { if (!l[2]) l[1].forEach(p => { lo = Math.min(lo, p[1]); }); });
    return -lo * h * (o.k || VKF) / 1000;
  }
  const TL = BURST + SHED;   // burst and shed are one timeline on the clock s since burst began; the duel starts at TL
  const DD = { crushB: 2.0, dieA: 0.6, dieB: 3.4, venomB: 4.0, camB: 3.5, sinkA: 3.5, meltA: 1.2, meltB: 5.6, floorT: 2.4 };   // drop seconds: the crush ends, the poison kills him (cool, joints dim), the camera is back at 1, the womb starts to sink
  /* the places: landX and grabX are fractions of the frame width (landX where the raised fist is once he lands, grabX where the hand closes on Obrokxus), landY the fist's height as a fraction of the frame; holeX how far in from the womb's middle (fraction of rx) the tear and its belly sit; the hole's middle is the womb's middle in y */
  const PL = { landX: 0.13, landY: 0.16, grabX: 0.16, holeX: 0.46 };
  const tearX = g => g.cx - PL.holeX * g.rx;

  /* drop: the crush ends and Rex dies of the poison lying in the hole, with Obrokxus crushed beneath him; the womb sinks round him and the
     torn rim stays open and dark: he is the gate. From d 1.4 his own stones, moss and vines turn the land's molten orange where they stand
     until he is one orange silhouette (cell 27), held to DROP, when the ramp shows (d counts from the end of the duel, held at DROP) */
  function drop(ctx, d) {
    const red = G.reduced, H = G.H, gz = wombG(), h = Math.min(2 * gz.ry, 0.86 * H);
    const step = (t, a, b, n) => Math.floor(smooth(clamp((t - a) / (b - a), 0, 1)) * n) / n;
    if (red) d = DROP;
    const gs = placed(step(d, DD.sinkA, DROP, 6)), tx = tearX(gs);   // the womb as the places have it (sunk a little, as it always was): the hole and the body ride it; bigTear draws the dark cut on the deflating womb
    bigTear(ctx, gs, tx, 1, 0, gs.cy, gz.ry);   // the length stays what it was before the sink; the sunk womb's clip trims an end that would pass its outline
    DC.venomA = d < 2.8 ? 1 : 0;   // the seams stay lit while he is drawn
    DC.seamMix = step(d, 0.6, 1.4, 4);   // red to the land's molten orange, four held steps
    DC.cool = step(d, 0.6, 1.4, 8);   // the stones go cold between them, eight steps
    DC.crack = d < 0.6 ? (Math.floor(d * 12) === 0 || Math.floor(d * 12) === 3 || Math.floor(d * 12) === 6 ? 1 : 0.7) : 1;   // the seams pulse wider in two held steps before the cooling
    DC.melt = 0; DC.meltSink = false; DC.pose2 = undefined; DC.mix = 0; DC.rot = true;
    const glow = 0;
    DC.pose = "vBall"; DC.fist = 1;   // he stays the ball the duel ended in, wrapped round Obrokxus
    const tl = LV.kx * tx + LV.ex, ref = GenVoidForms.rexVoidAnchors(0, 0, h, DC, ANC), sitD = vsit(h, DC);
    let ax = tl - ref.waist.x, ay = 0.87 * G.H - sitD + 0.03 * h;   // the duel's last cell: the ball's place
    if (DL.bh === h) { ax = DL.bx; ay = DL.by; }   // the ball stays where the duel settled it (the live womb deflates each frame, so tl never repeats: matching on it fell back to the formula, a jump)
    GenVoidForms.rexVoidAnchors(ax, ay, h, DC, ANC);
    const sc = OBS * h;   // crushed under his fist, as on the duel's last frame (same place, facing and size)
    const F = 0.87 * G.H, sk = h * DC.k / 1000, ps = GenVoidForms.rexVoidPolys(DC).polys;
    foot();
    const cell = Math.floor(d * 12), amp = d < 1 / 12 ? 1 : d < 0.6 ? 0.5 : d < 1.4 ? (cell % 3 === 0 ? 0.5 : 0) : 0;   // thrash halves, then a twitch every 3rd cell, then still
    for (let i = 0; i < 16; i++) { const t = i / 15; TP[i * 2] = ANC.grip.x + (1 - t) * 0.9 * sc; TP[i * 2 + 1] = ANC.grip.y + amp * 0.09 * sc * Math.sin(Math.PI * t) * Math.sin(t * 6); }   // the duel's last spine (grip under the chest, tail ahead)
    const dc = Math.floor(d * 12) / 12, eF = Math.min(1, step(dc, 2.3, 5.4, 36) + (dc >= 3.3 ? 0.04 : 0) + (dc >= 4.3 ? 0.04 : 0));   // how far the molten figure has flowed into the ramp: held steps from cell 32, two lurches, 1 a little before d 5.4
    if (!red && (d < DROP || G.linear("land") <= 0)) {   // through the whole beat: the ramp covers it; while he flows in, not under the fill (the shards rest a little below the floor line), and once the ramp is closed only above F
      if (eF > 0 && eF < 1) {
        const fp = flowFrame(heatSrc(h, ax, ay, sk), cell, eF).fp;
        ctx.save();
        if (fp.length > 1) { ctx.beginPath(); ctx.rect(-1e4, -1e4, 2e4, 2e4); ctx.rect(fp[0][0], F, fp[fp.length - 1][0] - fp[0][0], 1e4); ctx.clip("evenodd"); }
        rubble(ctx, 1e3); ctx.restore();
      } else if (eF >= 1) { ctx.save(); ctx.beginPath(); ctx.rect(-1e4, -1e4, 2e4, 1e4 + F); ctx.clip(); rubble(ctx, 1e3); ctx.restore(); }
      else rubble(ctx, 1e3);
    }
    if ((G.beat === G.idxOf("drop") || G.linear("land") <= 0) && eF >= 1) mass(ctx, F);   // the land's ramp (land has it from then on)
    if (!red && d >= 0.6 && d < 2) {   // the three drips run from his stones down to the floor in held steps; from cell 20 each one's top runs down after its end (gone at d 2.0)
      const q = step(d, 0.6, 2.0, 8), u = clamp((cell - 20) / 4, 0, 1);
      ctx.fillStyle = "#c9581f";
      const bots = [];   // the lowest vertex of each stone, left to right: a drip starts on one and runs straight down to the floor
      ps.forEach(l => { if (!l[2]) { let b = null; l[1].forEach(p => { const y = ay - p[1] * sk; if (!b || y > b[1]) b = [ax - p[0] * sk, y]; }); if (b && b[0] < ax + 0.1 * h) bots.push(b); } });
      bots.sort((a, b) => a[0] - b[0]);
      DRIPS.forEach(dr => { const v = bots[Math.min(bots.length - 1, Math.floor(dr[0] * bots.length))], y0 = v[1], x = v[0], L = (F - y0) * Math.min(1, q * dr[2]), top = Math.round(y0 + u * L); ctx.fillRect(Math.round(x - 0.006 * h), top, Math.max(2, Math.round(0.012 * h)), Math.max(0, Math.round(y0 + L) - top)); });
    }
    if (!red && d < 1.4) rexAtCut(ctx, ax, ay, h, DC, sc, 1, glow, false);
    else if (!red && eF < 1) {   // he goes molten where he stands: his own stones, moss and vines take the land's orange a few at a time (3 held colour steps each, from d 1.4 to cell 27); the molten ones are one path, the rest stay stone over it
      const hs = heatSrc(h, ax, ay, sk); const n = hs.L.length, c0 = i => 17 + Math.floor(8 * i / n);
      if (eF > 0) {   // from cell 32 he flows into the ramp: one path, no cut clip; Obrokxus under it until the fill stands above his spine
        const fl = flowFrame(hs, cell, eF);
        let oT = 1e9; for (let i = 0; i < 16; i++) oT = Math.min(oT, TP[i * 2 + 1]);
        let cov = true;
        for (let i = 0; i < 16 && cov; i++) cov = flowTop(fl, TP[i * 2]) < oT - 0.15 * sc;
        if (!cov) for (let pass = 0; pass < 2; pass++) {
          cutClip(ctx, pass === 1, false);
          OBO.path = TP; OBO.face = 1; OBO.glow = glow; GenDuo.drawObrok1(ctx, 0, 0, sc, OBO);
          ctx.restore();
        }
        Paint.fillRidge(ctx, fl.path, "#c9581f", "#8a3512", G.H * 0.05, G.H * 0.035);
        return;
      }
      let nM = 0; while (nM < n && cell >= c0(nM) + 3) nM++;
      const vs = Math.max(0, cell - 27);   // cells 28 to 31: each vine stretches down to the floor (1, 2), then drains into it (3, 4)
      if (HS.nM !== nM || HS.vs !== vs) {
        const path = new Path2D();
        for (let i = 0; i < nM; i++) { const l = hs.L[i]; if (l.crack) continue; const q = l.hang && vs ? vineStep(l.pts, vs) : l.pts; if (!q) continue; path.moveTo(q[0][0], q[0][1]); for (let j = 1; j < q.length; j++) path.lineTo(q[j][0], q[j][1]); path.closePath(); }
        HS.path = path; HS.nM = nM; HS.vs = vs;
      }
      for (let pass = 0; pass < 2; pass++) {
        cutClip(ctx, pass === 1, false);
        OBO.path = TP; OBO.face = 1; OBO.glow = glow; GenDuo.drawObrok1(ctx, 0, 0, sc, OBO);
        Paint.fillRidge(ctx, HS.path, "#c9581f", "#8a3512", G.H * 0.05, G.H * 0.035);
        for (let i = nM; i < n; i++) {
          const l = hs.L[i], t = cell - c0(i);
          ctx.fillStyle = !l.crack && t >= 0 ? mixHex(l.c, "#8a3512", (t + 1) / 3) : l.c;
          ctx.beginPath(); ctx.moveTo(l.pts[0][0], l.pts[0][1]); for (let j = 1; j < l.pts.length; j++) ctx.lineTo(l.pts[j][0], l.pts[j][1]); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
    }
  }
  function vineStep(pts, vs) {   // a molten vine at step vs (1 to 4): stretched to the floor by 1 and 2 (half, whole), drained into it by 3 and 4 (half, gone: null); x never changes
    const F = 0.87 * G.H; let yT = 1e9, yB = -1e9;
    pts.forEach(p => { yT = Math.min(yT, p[1]); yB = Math.max(yB, p[1]); });
    const k = vs >= 2 ? 1 : 0.5, m = yB >= F - 1 || yB - yT < 1 ? 1 : mix(1, (F - yT) / (yB - yT), k), v = vs - 2;
    if (v >= 2) return null;
    return pts.map(p => { const y = yT + (p[1] - yT) * m; return [p[0], v > 0 ? Math.max(y, yT + v * 0.5 * (F - yT)) : y]; });
  }
  const HS = { key: "", L: null, nM: -1, vs: -1, path: null };   // Rex's polygons as he is held from d 1.4 (colour, hang, crack, screen points wound one way), rebuilt when the frame or his place changes
  function heatSrc(h, ax, ay, sk) {
    const key = [G.W, G.H, h, ax, ay].join();
    if (HS.key === key) return HS;
    DC.tint = ["#59606a", 0.6 * DC.cool];   // as rexAtCut sets it; his venom is whole (venomA taken as 1)
    HS.L = GenVoidForms.rexVoidPolys(DC).polys.map(l => {
      let c = l[0];
      if (c[0] !== "#") { const m = c.match(/[\d.]+/g).map(Number); c = "#" + m.slice(0, 3).map(v => ("0" + Math.round(v).toString(16)).slice(-2)).join(""); }
      let pts = l[1].map(p => [ax - p[0] * sk, ay - p[1] * sk]), A = 0;
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; A += a[0] * b[1] - b[0] * a[1]; }
      if (A < 0) pts = pts.reverse();
      return { c, hang: !!l[2], crack: c === "#c9581f", pts };
    });
    HS.key = key; HS.nM = -1;
    return HS;
  }
  /* the flow: his silhouette's columns come down and run out to the ramp place that needs that much of him (area-preserving map X1), east first; tables built once with the source */
  const FT = { key: "", fk: "" };
  function flowTabs(hs) {
    const key = hs.key + "," + G.cam;
    if (FT.key === key) return FT;
    const W = G.W, H = G.H, F = 0.87 * H, N = 96;
    let bL = 1e9, bR = -1e9, top = 1e9;
    hs.L.forEach(l => { if (!l.hang) l.pts.forEach(p => { bL = Math.min(bL, p[0]); bR = Math.max(bR, p[0]); top = Math.min(top, p[1]); }); });
    const S0 = new Array(N + 1).fill(0);
    hs.L.forEach(l => { if (l.hang) return; const q = l.pts; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length], c0 = (Math.min(a[0], b[0]) - bL) / (bR - bL) * N, c1 = (Math.max(a[0], b[0]) - bL) / (bR - bL) * N;
      for (let c = Math.max(0, Math.ceil(c0)); c <= Math.min(N, Math.floor(c1)); c++) { const x = bL + c / N * (bR - bL), u = b[0] === a[0] ? 0 : (x - a[0]) / (b[0] - a[0]); S0[c] = Math.max(S0[c], F - (a[1] + (b[1] - a[1]) * u)); } } });
    const r = 5, mx = S0.map((_, i) => { let m = 0; for (let j = Math.max(0, i - r); j <= Math.min(N, i + r); j++) m = Math.max(m, S0[j]); return m; });
    const E0 = mx.map((_, i) => { let s = 0, n = 0; for (let j = i - r; j <= i + r; j++) { s += mx[clamp(j, 0, N)]; n++; } return Math.max(0.06 * (F - top), s / n); });
    const T = x => Math.max(0, F - Math.min(F, GenPaint.rexSurfY(G.cam + (x - W * 0.5) / W)));
    const gx = GenPaint.gridXs(-56, W + 80, 6).map(q => q[0]);
    let iw = 0; while (iw < gx.length - 1 && T(gx[iw + 1]) <= 0) iw++;
    const dx = gx.slice(iw), eps = 0.002 * H, Ad = [0];
    for (let i = 1; i < dx.length; i++) Ad.push(Ad[i - 1] + (T(dx[i]) + T(dx[i - 1]) + 2 * eps) / 2 * (dx[i] - dx[i - 1]));
    const As = [0]; for (let i = 1; i <= N; i++) As.push(As[i - 1] + (E0[i] + E0[i - 1]) / 2 * (bR - bL) / N);
    const X1 = As.map(a => { const t = a / As[N] * Ad[Ad.length - 1]; let j = 1; while (j < Ad.length - 1 && Ad[j] < t) j++; return dx[j - 1] + (dx[j] - dx[j - 1]) * (t - Ad[j - 1]) / (Ad[j] - Ad[j - 1]); });
    Object.assign(FT, { key, fk: "", N, F, bL, bR, S0, E0, T, gx, dx, X1, areaS: As[N], areaD: Ad[Ad.length - 1] });
    return FT;
  }
  function flowFrame(hs, cell, e) {   // the cell's path (fill plus every warped polygon), cached per cell
    const ft = flowTabs(hs), fk = ft.key + "," + cell;
    if (ft.fk === fk) return ft;
    const { N, F, bL, bR, E0, T, gx, X1 } = ft, W = G.W, mixv = mix;
    const eL = [], X = [], lam = [];
    for (let i = 0; i <= N; i++) { const s = i / N, el = Math.min(1, e * (1 + 1.5 * smooth(clamp(s / 0.8, 0, 1)))); eL.push(el); X.push(mixv(bL + s * (bR - bL), X1[i], el)); lam.push(smooth(clamp((el - 0.05) / 0.4, 0, 1))); }
    for (let i = 1; i <= N; i++) X[i] = Math.max(X[i], X[i - 1]);
    const tw = 0.10 * W * 4 * e * (1 - e), tp = x => tw <= 0 ? 1 : smooth(clamp((x - X[0]) / tw, 0, 1));   // one wedge front: the west end is thin on the fill and on every warped point
    const at = (A, c) => { const i = clamp(Math.floor(c), 0, N - 1), u = clamp(c - i, 0, 1); return A[i] + (A[i + 1] - A[i]) * u; };
    const warp = p => {
      const c = clamp((p[0] - bL) / (bR - bL) * N, 0, N), x = at(X, c), el = at(eL, c), ev = Math.min(1, 1.6 * el), E = at(E0, c), hS = Math.max(0, F - p[1]), hh = hS > E ? mixv(hS, E, at(lam, c)) : hS;   // height leads the run (ev); a tip above the smoothed skyline settles to it as the fill rises
      return [x, F - hh * mixv(E, T(x), ev) / E * tp(x)];
    };
    const path = new Path2D();
    const add = q => {
      let A = 0; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; A += a[0] * b[1] - b[0] * a[1]; }
      if (A < 0) q = q.slice().reverse();
      path.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) path.lineTo(q[i][0], q[i][1]); path.closePath();
    };
    const fp = []; let c = 0;   // the fill on the ramp grid, tapering to nothing at its west end until the ramp's own toe is the end
    for (const x of gx) {
      if (x < X[0] || x > X[N]) continue;
      while (c < N - 1 && X[c + 1] < x) c++;
      const u = X[c + 1] > X[c] ? (x - X[c]) / (X[c + 1] - X[c]) : 0, cc = c + clamp(u, 0, 1);
      fp.push([x, F - at(lam, cc) * mixv(at(E0, cc), T(x), Math.min(1, 1.6 * at(eL, cc))) * tp(x)]);
    }
    if (fp.length > 1) add([[X[0], F]].concat(fp, [[fp[fp.length - 1][0], F]]));
    hs.L.forEach(l => {
      if (l.crack || l.hang) return;
      const q = [];
      for (let j = 0; j < l.pts.length; j++) { const a = l.pts[j], b = l.pts[(j + 1) % l.pts.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 12)); for (let k = 0; k < n; k++) q.push(warp([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n])); }
      add(q);
    });
    Object.assign(ft, { fk, path, fp, X, eL });
    return ft;
  }
  function flowTop(fl, x) {   // the fill's top at x (F where there is no fill)
    const fp = fl.fp;
    if (fp.length < 2 || x < fp[0][0] || x > fp[fp.length - 1][0]) return fl.F;
    let i = 1; while (i < fp.length - 1 && fp[i][0] < x) i++;
    const a = fp[i - 1], b = fp[i], u = b[0] > a[0] ? (x - a[0]) / (b[0] - a[0]) : 0;
    return a[1] + (b[1] - a[1]) * u;
  }
  /* the ramp: the land's band-0 surface, min(F, rexSurfY), drawn from the end of the drop on (land has it from then on) */
  function mass(ctx, F) {
    const W = G.W, pts = GenPaint.gridXs(-56, W + 80, 6).map(q => [q[0], Math.min(F, GenPaint.rexSurfY(G.cam + (q[0] - W * 0.5) / W))]);
    GenPaint.fillRidge(ctx, pts, F, "#c9581f", "#8a3512");
  }
  function mixHex(a, b, t) {
    const v = i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - t) + parseInt(b.substr(i, 2), 16) * t);
    return "rgb(" + v(1) + "," + v(3) + "," + v(5) + ")";
  }

  /* FOOT is where the cut meets the floor (cutGeom reports it) */
  const FOOT = { x: 0, y: 0, nx: 0, ny: 0 };   // nx, ny: where the stream starts, the neck's top
  const WG = { cx: 0, cy: 0, rx: 0, ry: 0 };
  const DRIPS = [[0.15, 1, 1], [0.5, -1, 1.5], [0.85, 1, 0.8]];   // which stone (fraction along the stones' lowest vertices, left to right), unused, length
  function foot() {   // where the cut meets the floor (cutGeom reads FOOT every frame)
    const W = G.W, H = G.H, fy = 0.87 * H;
    let tx = (CLX[CK] + CRX[CK]) / 2, ty = CY[CK];
    if (ty > fy - 2) {   // the tip is below the floor: the neck sits on the cut 0.12 H above where the cut meets the floor
      let k = CK;
      while (k > 0 && CY[k] > fy - 0.12 * H) k--;
      tx = (CLX[k] + CRX[k]) / 2; ty = CY[k];
      if (ty > fy - 2) ty = fy - 2;
    }
    FOOT.x = tx + 0.01 * W; FOOT.y = fy; FOOT.nx = tx; FOOT.ny = ty;
  }

  /* ---- burst: calm womb, the fist, the giant tear, Rex hauls out, the zoom in ---- */
  /* peek (the cut is open, he peeks), slip (slips out), fly (flies west, the camera pulls back), barge (Rex forces through), grab (the fist closes; stop: the hit-stop ends), land (he lands), set (close on the fist: strain),
     bite (the red starts), recoil (Rex rips the arm back), off (Obrokxus springs off), hover (he is where the duel finds him) */
  const TRY = 31 / 12;   // the try-out of his new body, ob1 to barge: 2.6 s rounded to a whole number of 1/12 s steps, so every 12 fps frame after it keeps its grid
  const BS = { peek: 1.4, slip: 2.5, fly: 4.0, ob0: 4.6, ob1: 7.4, calm: 7.9, hold: 7.7, pull: 8.3 + TRY, barge: 8.55 + TRY, chg0: 8.9 + TRY, chg1: 10.4 + TRY, grab: 10.6 + TRY, stop: 10.7 + TRY, land: 10.95 + TRY, rise: 11.25 + TRY, set: 11.55 + TRY, bite: 12.6 + TRY, recoil: 14.2 + TRY, off: 14.3 + TRY, hover: 15.0 + TRY, held: 15.6 + TRY, turn: 15.8 + TRY };   // ob0, ob1: Obrokxus's change (chaos 0 to 1); calm: he holds red until here; pull: the close camera is back at 1x; the peek ends in a short hold (PEEK_HOLD) with the head out   // chg0, chg1: Rex's change in the air; hover: Obrokxus is up and west; held: he has landed beside Rex; turn: he faces him
  const PH = BS.barge - 3.55, OSL = 1.8;   // from barge on every clock that feeds a drawing runs on what it was before the emergence was added: time after barge plus 3.55 (PH is a whole number of 1/12 s steps), his old slip OSL
  const WEST = 4.0;  // when Obrokxus reaches the west of the frame (his flight out of the tear lasts slip to here); he waits there until Rex barges
  const PEEK_HOLD = 0.2, RIM = 2;   // the head stays out this long at the end of the peek (s); his rim in lw units once the camera is back (about 2 px outside his edge at 1x, legs 3 px)
  const ST = { x: 0.09, y: 0.09 };   // where Obrokxus hangs as the burst ends and the duel opens (W, H fractions: up and west of the fist)
  const CUT_AT = 0.8, CUT_OPEN = 0.6;   // when the cut starts to open from a point (s) and how long it takes to its rest shape
  const GP = { pose: "grip", fist: 1, face: -1 };
  const ANC = {};
  const SW = T => 0.26 + 0.08 * Math.sin(2 * Math.PI * (T - 11.95 - TRY) / 1.4);   // the holding arm's bend (pose2 curl mix) once Obrokxus is off, by seconds from the start of burst: it keeps swinging in and out, never straight
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
  let CGAP = 0;   // the widest gap of the cut in units of Wm: max over the points of env * (CJ + CJR)
  for (let k = 0; k <= CK; k++) CGAP = Math.max(CGAP, Math.sin(Math.PI * Math.pow(k / CK, 1.159)) * (CJ[k] + CJR[k]));
  let CRK = 1;   // 0..1: 0 is the slit Obrokxus squeezes out of (2 of his thicknesses long, 0.6 of one wide), 1 the full cut; only burst sets it below 1
  function place(g, tx, u, bulge, by, ryL) {
    const H = G.H, ck = CRK, hh = Math.min(2 * (ryL || g.ry), 0.86 * H), LF = 0.88 * 2 * (ryL || g.ry), WF = 0.113 * hh, L = u * (ck >= 1 ? LF : 0.14 * OBS * hh + (LF - 0.14 * OBS * hh) * ck), Wm = u * (ck >= 1 ? WF : 0.042 * OBS * hh / CGAP + (WF - 0.042 * OBS * hh / CGAP) * ck), top = g.cy - L / 2;   // the slit: 2 of his thicknesses long (0.14 sc), 0.6 of one at its widest (0.042 sc); sc = OBS * hh
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
  const OBO = { path: null, face: 1, glow: 1, rimK: RIM };
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
  function rexAtCut(ctx, x, y, h, o, sc, face, glow, only, tf, tfR) {   // only: just inside the cut, none of him in the open; tf(ctx): a transform applied inside the clip; tfR(ctx): one applied to Rex alone, after Obrokxus is drawn
    for (let e = only ? 1 : 0; e < 2; e++) {
      cutClip(ctx, e === 1, !!only);
      if (tf) tf(ctx);
      if (sc) { OBO.path = TP; OBO.face = face; OBO.glow = glow; GenDuo.drawObrok1(ctx, 0, 0, sc, OBO); }
      if (tfR) tfR(ctx);
      if (o.k) {   // the void Rex: venom is red seams on his joins (his own venom times venomA), cool a flat tint of his stones
        o.tint = o.cool > 0 ? ["#59606a", 0.6 * o.cool] : undefined;
        const v0 = o.venom; o.venom = v0 * (o.venomA === undefined ? 1 : o.venomA);
        GenVoidForms.drawRexVoid(ctx, x, y, h, o);
        o.venom = v0;
      } else GenDuo.drawRex(ctx, x, y, h, o);
      ctx.restore();
    }
  }

  /* Rex, with Obrokxus coiled in the near fist (glowing); the fingers go over him */
  function body(ctx, o, gx, gy, h, glow, bite, gait, hd) {   // Rex in pose options o with his near fist at (gx, gy), Obrokxus gripped in it (bite: coiled round the wrist, legs running with gait; hd how high his head is held, 0.1 is down on the hand)
    const V = !!o.k;   // the void Rex: anchors and drawing from GenVoidForms, poison as red seams on his joins, no orange fingers
    if (V) GenVoidForms.rexVoidAnchors(0, 0, h, o, ANC); else GenDuo.rexAnchors(0, 0, h, o, ANC);
    const x = gx - ANC.grip.x, y = gy - ANC.grip.y, t = G.reduced ? 0 : G.t, sc = OBS * h;
    if (o.fist > 0) { o.warm = glow; o.warmX = gx; o.warmY = gy; } else o.warm = 0;
    if (V) { o.tint = undefined; GenVoidForms.drawRexVoid(ctx, x, y, h, o); } else GenDuo.drawRex(ctx, x, y, h, o);
    if (o.fist > 0) {
      if (bite) {
        for (let i = 0; i < 16; i++) {
          const v = (i / 15 - 0.5) * 2, a = Math.abs(v);
          if (v <= 0) { TP[i * 2] = gx - 0.1 * sc * a * a * Math.sin(3.4 * a + t * 7); TP[i * 2 + 1] = gy - v * 0.5 * sc; }
          else { TP[i * 2] = gx - 0.2 * sc * Math.sin(Math.PI * 0.85 * v); TP[i * 2 + 1] = gy - (hd || 0.4) * sc * Math.sin(Math.PI * 0.85 * v); }
          if (SQM.a > 0) { const e = Math.sin(Math.PI * i / 15) * SQM.a * 0.07 * sc; TP[i * 2] += e * Math.sin(SQM.p + i * 0.9); TP[i * 2 + 1] += e * Math.cos(SQM.p * 1.3 + i * 0.7); }   // the squirm: a body wave along the path
        }
        if ((SQM.k > 0 || SQM.w > 0) && V) {   // the strike: the tail whips round and the sting goes into Rex's wrist, the rest of the tail follows
          const wx = x + ANC.wristF.x - TP[0], wy = y + ANC.wristF.y - TP[1], k = SQM.k * SQM.k * (3 - 2 * SQM.k), wl = Math.hypot(wx, wy) || 1;
          const cx = -wx / wl * 0.3 * sc * SQM.w, cy = (-wy / wl * 0.3 - 0.12) * sc * SQM.w;   // the wind-up: the tail coils back from the wrist and up, the strike drives it from there
          for (let i = 0; i < 8; i++) { const w = (1 - i / 8) * (1 - i / 8); TP[i * 2] += w * (cx * (1 - k) + wx * k); TP[i * 2 + 1] += w * (cy * (1 - k) + wy * k); }
        }
        GenDuo.drawObrok1(ctx, 0, 0, sc, { path: TP, face: -1, glow, gait, rimK: RIM });
        if (SQM.k > 0 && V || SQM.w > 0) {   // the sting tip drawn 1.5x his normal tail tip, in his red with a dark edge, so it reads at the home camera
          let dx = TP[0] - TP[4], dy = TP[1] - TP[5]; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
          ctx.fillStyle = "#e8544e"; ctx.strokeStyle = "#3a1214"; ctx.lineWidth = Math.max(1, 0.006 * sc); ctx.lineJoin = "round";
          ctx.beginPath(); ctx.moveTo(TP[0] - dx * 0.04 * sc - dy * 0.045 * sc, TP[1] - dy * 0.04 * sc + dx * 0.045 * sc); ctx.lineTo(TP[0] + dx * 0.165 * sc, TP[1] + dy * 0.165 * sc);
          ctx.lineTo(TP[0] - dx * 0.04 * sc + dy * 0.045 * sc, TP[1] - dy * 0.04 * sc - dx * 0.045 * sc); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      } else GenDuo.drawObrok1(ctx, gx, gy, sc, { pose: "held", face: -1, glow, t, rimK: RIM });
      if (!V) GenDuo.drawRexFingers(ctx, x, y, h, o);
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
  const COILA = [];   // the sketch's coil (the curve of genesis-voidforms.js, y flipped so the tail coils low and torso and head rise, x mirrored for west) as 15 segment angles, tail first, at equal chord steps
  (function () {
    const C = [[0.50, 0.27], [0.66, 0.24], [0.72, 0.10], [0.58, 0.03], [0.38, 0.03], [0.14, 0.12], [0.05, 0.28], [0.14, 0.42], [0.36, 0.47],
      [0.58, 0.43], [0.69, 0.52], [0.65, 0.64], [0.56, 0.71], [0.42, 0.77], [0.30, 0.85], [0.30, 0.94], [0.42, 1.0]], d = [], per = 30;
    for (let i = 0; i < C.length - 1; i++) {
      const p0 = C[Math.max(i - 1, 0)], p1 = C[i], p2 = C[i + 1], p3 = C[Math.min(i + 2, C.length - 1)];
      for (let j = 0; j < per + (i === C.length - 2 ? 1 : 0); j++) {
        const t = j / per, t2 = t * t, t3 = t2 * t, q = [0, 0];
        for (let c = 0; c < 2; c++) q[c] = 0.5 * (2 * p1[c] + (p2[c] - p0[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * t3);
        d.push(q);
      }
    }
    const n = d.length, walk = D => { const o = [0]; let j = 0; for (let k = 0; k < 15; k++) { let m = j + 1; while (m < n - 1 && Math.hypot(d[m][0] - d[j][0], d[m][1] - d[j][1]) < D) m++; o.push(m); j = m; } return o; };
    let lo = 0.005, hi = 0.5;
    for (let it = 0; it < 40; it++) { const mid = (lo + hi) / 2; if (walk(mid)[15] >= n - 1) hi = mid; else lo = mid; }
    const ix = walk(hi);
    for (let k = 0; k < 15; k++) COILA.push(Math.atan2(-(d[ix[k + 1]][1] - d[ix[k]][1]), -(d[ix[k + 1]][0] - d[ix[k]][0])));
  })();
  const QL = new Float64Array(15), QS = new Float64Array(15), QA = new Float64Array(15), QB = new Float64Array(15),QC = new Float64Array(32), wrapA = a => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));
  function chain(ang, hx, hy, out) { out[30] = hx; out[31] = hy; for (let i = 14; i >= 0; i--) { out[i * 2] = out[i * 2 + 2] - QL[i] * Math.cos(ang[i]); out[i * 2 + 1] = out[i * 2 + 3] - QL[i] * Math.sin(ang[i]); } }
  const SPAS = [2.95, 3.6, 4.25, 4.95, 5.55, 6.3];   // his spasms (authored times, 0.55 to 0.75 s apart): each jack-knifes him toward the coil within 0.1 s and whips him open over 0.25 s
  function obPain(s) { return smooth(clamp((s - BS.slip - 0.15) / 0.55, 0, 1)) * (1 - smooth(clamp((s - BS.ob1 + 0.9) / 0.6, 0, 1))); }   // 0 until slip + 0.15, 1 by slip + 0.7, 1 until ob1 - 0.9, back to 0 at ob1 - 0.3 (the pain ends with the change)
  function obSpasm(s) { let m = 0; for (let k = 0; k < SPAS.length; k++) { const d = s - SPAS[k]; if (d > 0) m = Math.max(m, d < 0.1 ? smooth(d / 0.1) : 1 - smooth(clamp((d - 0.1) / 0.25, 0, 1))); } return m; }
  const SPE = [1.5, 1.9, 2.26], QD = new Float64Array(15);   // the early spasms, at the start of his three stalls in the tear (each lashes open as the stall ends); per segment, how far outside the tear it is (0 at the lips, 1 half a body length out)
  const obSpasmE = s => { let m = obSpasm(s); for (let k = 0; k < SPE.length; k++) { const d = s - SPE[k]; if (d > 0) m = Math.max(m, 0.67 * (d < 0.12 ? smooth(d / 0.12) : 1 - smooth(clamp((d - 0.12) / 0.25, 0, 1)))); } return m; };   // a third of the way to the coil (the later ones go half)
  const obPainE = s => Math.max(obPain(s), smooth(clamp((s - BS.peek) / (BS.slip - 0.3 - BS.peek), 0, 1)) * (1 - smooth(clamp((s - BS.slip - 0.05) / 0.35, 0, 1))));   // the pain while he comes through: 0 at the first frame his head is out, 1 by slip - 0.3, then it hands over to obPain by slip + 0.4 (0 there, so obPain alone from then on)
  function obOutW(sc) { for (let i = 0; i < 15; i++) QD[i] = smooth(clamp((BC.tx - 0.5 * (TP[i * 2] + TP[i * 2 + 2])) / (0.5 * sc), 0, 1)); }
  function obAdd(a, s, wsp, wt) {   // adds the pain to segment angles a (tail first): two waves travelling tail-ward (2.3 and 3.7 cycles a second), the spasms, the big convulsion at ob1; with wt (before slip + 0.4) the emergence's pain, each segment weighted by wt
    const pn = wt ? obPainE(s) : obPain(s), hs = 0.5 * (wt ? obSpasmE(s) : obSpasm(s)) * pn, sp = hs * wsp, u = (s - BS.ob1 + 0.95) / 0.35;
    const cv = u > 0 && u < 1 ? 0.6 * smooth(clamp(u / (0.08 / 0.35), 0, 1)) * (1 - smooth(clamp((u - 0.4) / 0.6, 0, 1))) : 0;
    for (let i = 0; i < 15; i++) {
      const am = 0.35 - 0.23 * i / 14, q = 14 - i, w = wt ? wt[i] : 1;
      a[i] += w * pn * am * (0.55 * Math.sin(14.45 * s - 0.45 * q) + 0.5 * Math.sin(23.25 * s - 0.7 * q + 1.3));
      if (sp > 0) a[i] += w * sp * wrapA(COILA[i] - a[i]);
      if (cv > 0) a[i] += cv * (0.45 * Math.sin(Math.PI * i / 14) + 0.5 * Math.sin(34 * (s - BS.ob1 + 0.95) - 0.6 * q) * (0.4 + 0.6 * (1 - i / 14)));
    }
    if (hs > 0) a[14] += (wt ? wt[14] : 1) * hs * (-0.7 + 0.25 * Math.sin(48 * s));   // the head throw and shake stay on every spasm, also at the spot where the body goes by the coil
  }
  const STK = [0, 0.10, 0.20, 0.28, 0.42, 0.50, 0.60, 0.68, 0.78, 0.86, 0.96, 1.04, 1.10], STV = [0.8, 0.18, 0.18, 1.8, 1.8, 0.18, 0.18, 1.8, 1.8, 0.18, 0.18, 1.8, 1.0];   // time after the peek, the warp's speed at each knot (eased between knots): he crawls at 0.10 to 0.20, 0.50 to 0.60 and 0.86 to 0.96 s and runs at 1.8 to catch up after each
  const STC = (() => { const c = new Float64Array(13); for (let k = 1; k < 13; k++) c[k] = c[k - 1] + (STK[k] - STK[k - 1]) * 0.5 * (STV[k - 1] + STV[k]); return c; })();   // the warp's progress at each knot (an eased run's mean is the middle of its ends); divided by the last it makes 1 at slip
  function obStall(s) { const t = s - BS.peek; if (t >= STK[12]) return 1; for (let k = 1; k < 13; k++) if (t < STK[k]) { const L = STK[k] - STK[k - 1], u = clamp((t - STK[k - 1]) / L, 0, 1); return (STC[k - 1] + L * (STV[k - 1] * u + (STV[k] - STV[k - 1]) * (u * u * u - 0.5 * u * u * u * u))) / STC[12]; } return 1; }
  function obEmerge(sc, s) {   // before slip: the peek's path (in TP, tail first, tail in the tear) thrashes outside the tear only; the tail end stays where the path puts it, so he stays held by the tear
    for (let i = 0; i < 15; i++) { const dx = TP[i * 2 + 2] - TP[i * 2], dy = TP[i * 2 + 3] - TP[i * 2 + 1]; QA[i] = Math.atan2(dy, dx); QL[i] = Math.hypot(dx, dy); }
    obOutW(sc); obAdd(QA, s, 1, QD);
    let x = TP[0], y = TP[1];
    for (let i = 0; i < 15; i++) { x += QL[i] * Math.cos(QA[i]); y += QL[i] * Math.sin(QA[i]); TP[i * 2 + 2] = x; TP[i * 2 + 3] = y; }
  }
  function obWrithe(sc, s) {   // the flight's path (in TP) with the pain on it, the head kept where the path puts it; every segment at its rest length (the one the pose uses), eased in over 0.2 s after slip
    const hx = TP[30], hy = TP[31], em = s < BS.slip + 0.4, tx0 = TP[0], ty0 = TP[1];
    for (let i = 0; i < 15; i++) { const dx = TP[i * 2 + 2] - TP[i * 2], dy = TP[i * 2 + 3] - TP[i * 2 + 1]; QA[i] = Math.atan2(dy, dx); QL[i] = Math.hypot(dx, dy); }
    if (em) obOutW(sc);
    obPath(0, 0, sc, 1, (BS.barge - PH) * 9);
    const k = smooth(clamp((s - BS.slip) / 0.2, 0, 1));
    for (let i = 0; i < 15; i++) QL[i] = mix(QL[i], Math.hypot(TP[i * 2 + 2] - TP[i * 2], TP[i * 2 + 3] - TP[i * 2 + 1]), k);
    if (em) {   // the first 0.4 s after slip: the emergence's thrash (outside-the-tear weights fading to 1, held by the tail end) hands over to the flight's, the head's place easing from the held one to the path's
      const kk = smooth(clamp((s - BS.slip) / 0.4, 0, 1));
      let ux = tx0, uy = ty0, px = tx0, py = ty0;
      for (let i = 0; i < 15; i++) { ux += QL[i] * Math.cos(QA[i]); uy += QL[i] * Math.sin(QA[i]); }
      for (let i = 0; i < 15; i++) QD[i] += (1 - QD[i]) * kk;
      obAdd(QA, s, 1, QD);
      for (let i = 0; i < 15; i++) { px += QL[i] * Math.cos(QA[i]); py += QL[i] * Math.sin(QA[i]); }
      chain(QA, hx + (1 - kk) * (px - ux), hy + (1 - kk) * (py - uy), TP);
      return;
    }
    obAdd(QA, s, 1);
    chain(QA, hx, hy, TP);
  }
  function coilR(s) {   // how far he has gathered into the coil: 0 in the flight; at the spot it breathes between 0.35 and 1 on the spasm rhythm (tight at each clench); the convulsion at ob1 throws him open, then he comes back to the old loosening for the last 0.3 s
    if (s < WEST || s >= BS.barge) return 0;
    if (s < BS.ob1) return smooth(clamp((s - WEST) / 0.4, 0, 1)) * (0.35 + 0.65 * obSpasm(s));
    return 0.35 * (1 - smooth(clamp((s - BS.ob1) / 0.6, 0, 1)));   // from ob1 he uncoils for good and flees
  }
  function obPeekBlend(sc, s) {   // slip to slip + 0.9: the flight's path (in TP) takes the peek's last pose over by segment angle (the way round fixed by the flight's angle), lengths blended, the head kept where the flight puts it, so nothing goes back toward the tear
    const hx = TP[30], hy = TP[31];
    for (let i = 0; i < 15; i++) { const dx = TP[i * 2 + 2] - TP[i * 2], dy = TP[i * 2 + 3] - TP[i * 2 + 1]; QS[i] = Math.atan2(dy, dx); QL[i] = Math.hypot(dx, dy); }
    obPath(0, 0, sc, 0, s * 9);
    const w = 1 - smooth(clamp((s - BS.slip) / 0.9, 0, 1));
    for (let i = 0; i < 15; i++) { const dx = TP[i * 2 + 2] - TP[i * 2], dy = TP[i * 2 + 3] - TP[i * 2 + 1]; QA[i] = QS[i] + w * wrapA(Math.atan2(dy, dx) - QS[i]); QL[i] = mix(QL[i], Math.hypot(dx, dy), w); }
    chain(QA, hx, hy, TP);
  }
  function obPose(c, sc, s) {   // his path from WEST - 0.4 to barge: the flight's stretched path blended by segment angle into the coil and back, lengths fixed to his stretched ones at barge (so nothing stretches and barge starts exactly as before); shudder before the first crack, a flex after the last
    obPath(c.x - 0.5 * sc, c.y, sc, 1, wph(s));
    const hx = TP[30], hy = TP[31];   // his head, the path's last point (turned back in the run)
    for (let i = 0; i < 15; i++) { const dx = TP[i * 2 + 2] - TP[i * 2], dy = TP[i * 2 + 3] - TP[i * 2 + 1]; QS[i] = Math.atan2(dy, dx); QL[i] = Math.hypot(dx, dy); }
    obPath(0, 0, sc, 1, (BS.barge - PH) * 9);
    const r = coilR(s);
    for (let i = 0; i < 15; i++) { const dx = TP[i * 2 + 2] - TP[i * 2], dy = TP[i * 2 + 3] - TP[i * 2 + 1]; QB[i] = Math.atan2(dy, dx); QL[i] = Math.hypot(dx, dy); }   // rest lengths from the start (the flight's own were stretched)
    for (let i = 0; i < 15; i++) {
      const w = smooth(clamp(r * 1.5 - 0.5 * i / 14, 0, 1));
      const su = QB[i] + wrapA(QS[i] - QB[i]);   // both ends unwound against the barge angle, so the way round is the same every frame
      QA[i] = su + w * (QB[i] + wrapA(COILA[i] - QB[i]) - su);
    }
    obAdd(QA, s, s < WEST ? 1 : 1 - smooth(clamp((s - WEST) / 0.4, 0, 1)));   // the clenches at the spot come from coilR
    { const gl = Math.sin(Math.PI * clamp((s - 8.0) / 0.3, 0, 1)); gl > 0 && (QA[14] -= 0.5 * gl * gl, QA[13] -= 0.2 * gl * gl); }   // once, at 8.0 to 8.3 s, he glances back toward the womb
    chain(COILA, 0, 0, QC);   // the coil at his lengths, head at the origin: where its middle falls puts the coil's head
    let cx = 0, cy = 0; for (let i = 0; i < 16; i++) { cx += QC[i * 2] / 16; cy += QC[i * 2 + 1] / 16; }
    const wh = smooth(clamp(r * 1.5 - 0.5, 0, 1));
    chain(QA, mix(hx, c.x - cx, wh), mix(hy, c.y - cy, wh), TP);
    const lim = s > BS.ob1 ? mix(Math.PI, 0.87, smooth(clamp((s - BS.ob1) / 0.2, 0, 1))) : Math.PI;   // in the try no joint turns more than 50 degrees (eased in over 0.2 s from the convulsion's coil)
    if (lim < Math.PI) bendClamp(lim);
    const fd = TP[30] < TP[16] ? -1 : 1;   // forward is the head minus the trunk behind it (west while he faces west; the neck alone is too short to read)
    if (s > BS.ob1) for (let j = 0; j < 16; j++) {   // the try's offset leads with the head: each segment further back follows 0.01 s later and moves less (the tail 0.4 of the head's), so the body stretches, then catches up
      const d = 15 - j, g = 1 - 0.6 * d / 15; tryMove(s - 0.01 * d, TOL);
      TP[j * 2] += (TOL.x + fd * TOL.f) * BC.W * g; TP[j * 2 + 1] += TOL.y * BC.H * g;
    }
    if (lim < Math.PI) bendClamp(lim);
  }
  function bendClamp(lim) {   // from the head back: each segment's angle is held within lim of the one ahead of it, lengths and head kept, so the front never folds over the trunk
    let pa = Math.atan2(TP[31] - TP[29], TP[30] - TP[28]);
    for (let i = 13; i >= 0; i--) {
      const dx = TP[i * 2 + 2] - TP[i * 2], dy = TP[i * 2 + 3] - TP[i * 2 + 1], l = Math.hypot(dx, dy), a = pa + clamp(wrapA(Math.atan2(dy, dx) - pa), -lim, lim);
      TP[i * 2] = TP[i * 2 + 2] - l * Math.cos(a); TP[i * 2 + 1] = TP[i * 2 + 3] - l * Math.sin(a); pa = a;
    }
  }
  const TOL = { x: 0, y: 0, k: 0, f: 0 };
  function gRate(t) { const b = clamp(0.5 + 0.75 * (0.6 * Math.sin(18.2 * t) + 0.4 * Math.sin(29.5 * t + 1.1)), 0, 1); return 1 + obPain(t) * (0.5 + 0.5 * b) * (1 - 0.7 * obSpasm(t)); }   // the leg clock's speed while he hurts: 1.5 to 2 times the run's in uneven bursts (two sines, about 2.9 and 4.7 a second), caught back toward the run's speed at each spasm
  let gEnd = null;
  function gExtra(t) { const n = Math.max(1, Math.ceil((t - BS.slip) * 90)), dt = (t - BS.slip) / n; let a = 0; for (let k = 0; k < n; k++) a += (gRate(BS.slip + (k + 0.5) * dt) - 1) * dt; return a; }   // the turns the pain has added to the run's clock by t
  function gRateE(t) { const b = clamp(0.5 + 0.75 * (0.6 * Math.sin(18.2 * t) + 0.4 * Math.sin(29.5 * t + 1.1)), 0, 1); return 1 + obPainE(t) * (0.5 + 0.5 * b) * (1 - 0.7 * obSpasmE(t)); }   // gRate with the emergence's pain
  function gIntE(a, b) { const n = Math.max(1, Math.ceil((b - a) * 90)), dt = (b - a) / n; let r = 0; for (let k = 0; k < n; k++) r += (gRateE(a + (k + 0.5) * dt) - 1) * dt; return r; }
  let gC = null;   // [scale, whole cycles]: the extra turns of the emergence's pain, scaled so that by slip + 0.4 they exceed the old ones by a whole number of 1/3 s cycles (same legs from then on)
  function gY(t) {
    if (gC === null) { const i1 = gIntE(BS.peek, BS.slip + 0.4), j = gExtra(BS.slip + 0.4), T = Math.max(1, Math.round((i1 - j) * 3)) / 3; gC = [(T + j) / i1, T]; }
    if (t >= BS.slip + 0.4) return gC[1];
    return gC[0] * gIntE(BS.peek, t) - (t > BS.slip ? gExtra(t) : 0);
  }
  function gaitAt(t) {   // his leg clock: the run (t - slip) with the pain's extra turns on it (never still), and a last small turn over the final 0.3 s so it meets the clock after barge exactly (a whole number of 1/3 s cycles apart)
    if (t >= BS.barge) return t - PH - OSL;
    if (t < BS.slip) return t - BS.slip + gY(t);
    if (gEnd === null) { const e = gExtra(BS.barge), d = BS.barge - PH - OSL - (BS.barge - BS.slip + e); gEnd = [e, d - Math.round(d * 3) / 3]; }
    return t - BS.slip + gExtra(t) + gY(t) + gEnd[1] * smooth(clamp((t - BS.barge + 0.3) / 0.3, 0, 1));
  }
  function wph(t) { const K = 2 * Math.PI * Math.round(PH * 9 / (2 * Math.PI)), o = PH * 9 - K; return t * 9 - K - o * smooth(clamp((t - BS.barge + 0.3) / 0.3, 0, 1)) - 0.48 * Math.sin(2 * Math.PI * clamp((t - BS.ob1) / 0.5, 0, 1)); }   // his body wave's phase before barge: the continuous clock, turned over the last 0.3 s onto the phase the wave had after barge before the emergence was added


  const RV = { pose: "reach", face: -1, fist: 0 };
  const SQM = { a: 0, k: 0, w: 0, p: 0 }, SPT = [12.65 + TRY, 12.75 + TRY, 12.97 + TRY, 13.18 + TRY, 13.79 + TRY], SPA = [0.012, 0.006, 0.006, 0.006, 0.006];   // (HIT0 12.65 + 1.45 s x each pool's seamArrive: wrist 0, elbow 0.0695, shoulder 0.2188, neck/chest 0.368, hip 0.7825)   // Obrokxus in the fist: a the squirm (0..1), k the strike (0..1, the tail tip on Rex's wrist), p its phase; the kicks in Rex's arm: when (the sting, the front at each joint) and how big (of H)
  const BC = { tx: 0, h: 0, M0: 0, M1: 0, M2: 0, YG: 0, cy: 0, H: 0, W: 0, sq: 0, sc: 0, gx: 0, gy: 0 }, BP = { x: 0, y: 0 }, BT = { x: 0, y: 0 };   // the burst's per-frame scratch: his path's anchors, and two points
  const RVK = { pose: "dive", face: -1, fist: 0, mix: 0, k: VKF }, CHG = { at: chgAt, ground: 0, dur: BS.chg1 - BS.chg0, key: 0 }, CO = [0, 0], FH = { x: 0, y: 0 }, CC = { x: 0, y: 0 };   // the void Rex in the flight; his change (RVK.chg); scratch
  const RVC = { pose: "dive", face: -1, fist: 0, mix: 0, venom: 0, warm: 0, k: VKF, g0: 1 / VK, chg: CHG }, RBL = { h: -1, fs: 0 };   // the change's own options (the flight's, never touched); the rubble's floor for one size
  const VGP = { k: VKF, pose: "grip", fist: 1, face: -1 }, VCR = { k: VKF, pose: "crouch", face: -1, fist: 1, raise: 0 }, VCL = { k: VKF, pose: "clutch", face: -1 };   // the void Rex from the grab on: the landing, hold and recoil; the crouch he lands in; the clutch the duel opens in
  RVK.chg = CHG;
  const sn12 = t => Math.floor(t * 12 + 1e-6) / 12;
  function flyHand(t, o, raw) {   // where his holding hand is at time t of the flight (barge to grab), on 1/12 s steps (raw: on the true clock)
    const q = raw ? t : sn12(t), u = clamp((q - BS.barge + 1 / 6) / (0.3 + 1 / 6), 0, 1), f = clamp((q - BS.barge - 0.3) / (BS.grab - BS.barge - 0.3), 0, 1);   // the first leg runs to where the second starts, never stopping between (it leaves at 0.4 of its start speed)
    o.x = f > 0 ? mix(BC.tx - 0.7 * BC.h, PL.grabX * BC.W, f) : mix(BC.tx - 0.05 * BC.h, BC.tx - 0.7 * BC.h, u * (1.6 - 0.6 * u)); o.y = mix(BC.cy, BC.YG, f) + 0.09 * BC.H * Math.sin(Math.PI * f); return o;
  }
  function chgAt(c) {   // the pivot he is drawn at for the change at c: his grip rides the hand's path across the break, so the change figure never jumps
    const t = BS.chg0 + c * (BS.chg1 - BS.chg0), hd = flyHand(t, FH), ch = GenVoidForms.rexChangeAnchor(BC.h, RVC, c, "grip", CC);
    CO[0] = hd.x - ch.x; CO[1] = hd.y - ch.y; return CO;
  }
  function rubbleFloor(L) { if (RBL.h !== L.h || RBL.y !== L.y) { RBL.h = L.h; RBL.y = L.y; RBL.fs = L.y + vsit(L.h, RC); } return RBL.fs; }   // keyed on L.y too: a height-only resize in a portrait frame moves the floor but not h
  function rubble(ctx, c) {   // the orange shards he shed in the change, from c 1 (rubble) on, at the place the change dropped them: everything from the womb and the frame size, so burst, duel and drop agree (c above 2 is at rest). Drawn behind both fighters
    const g = wombG(), L = landing(g), h = L.h, H = G.H;
    BC.tx = tearX(g); BC.h = h; BC.cy = g.cy; BC.YG = 0.42 * H; BC.H = H; BC.W = G.W;
    const key = G.W * 100003 + H + h;   // the frame size: the anchors, the floor and the shards' rest points hold while it does
    if (CHG.key !== key) {
      CHG.ground = rubbleFloor(L); CHG.key = key;
    }
    GenVoidForms.drawRexRubble(ctx, 0, 0, h, RVC, c);
  }
  const OB1 = { path: null, face: -1, glow: 1, gait: undefined, chaos: 1 };
  const ERP = [], ERO = { u: 1, t: 0, seed: 7, old: { base: "#653a8c", dark: "#241634", edge: "#523070" }, neu: { base: "#a4272d", dark: "#861f25", edge: "#2a080b" } };   // the void's bites: his purple set before, his red set after
  for (let i = 0; i < 15; i++) ERP.push({ x: 0, y: 0, ang: 0, len: 0, w0: 0, w1: 0, lv: 0, rd: 0, cf: 1 });
  const obReach = s => { const sw = obStall(s); return mix(0.15, 0.65, Math.min(1, sw * 2)) + 0.1 * Math.sin(Math.PI * sw); };   // how far west of the tear's lips his head is, in his lengths (as the peek's head path)
  function obOut0(need) {   // when a segment whose middle is `need` lengths behind the head passes the tear's lips (measured on the real path): in the peek while the head reaches it (the thrash moves the last of those, 0.7 lengths back, 0.065 lengths early), else in the flight just after slip
    if (need > 0.72) return BS.slip + 0.158 + (need - 0.767) * 0.525;
    let lo = BS.peek, hi = BS.slip;
    for (let i = 0; i < 14; i++) { const m = 0.5 * (lo + hi); if (obReach(m) >= need - (need > 0.68 ? 0.065 : 0)) hi = m; else lo = m; }
    return hi;
  }
  const obOW = u => u <= 0.6 ? 0.004 + 0.024 * Math.pow(u / 0.6, 0.8) : u <= 0.9 ? 0.028 + 0.009 * Math.sin((u - 0.6) / 0.3 * Math.PI) - 0.004 * (u - 0.6) / 0.3 : 0.024 - 0.012 * (u - 0.9) / 0.1;   // his half-width along him (in his lengths), as drawObrok1's
  function obErode(s, sc) {   // per segment from the tail: the void's hold (from the frame the segment passes the tear's lips, full in 1 s, head first out at the end) and his change to red; fills ERP from his spine TP
    const D = BS.ob1 - BS.ob0, d0 = BS.ob1 + 0.1, gap = (BS.barge - 0.5 - d0) / 14;
    for (let k = 0; k < 15; k++) {
      const um = (k + 0.5) / 15, tS = BS.ob0 + D * 0.6 * (1 - um), p = ERP[k], ax = TP[k * 2], ay = TP[k * 2 + 1], dx = TP[k * 2 + 2] - ax, dy = TP[k * 2 + 3] - ay;
      p.lv = Math.min(clamp((s - obOut0(1 - um)) / 1, 0, 1), 1 - clamp((s - d0 - (14 - k) * gap) / 0.35, 0, 1));
      p.rd = s >= BS.ob0 ? smooth(clamp((s - tS) / 0.15, 0, 1)) : 0;
      p.cf = 1 - clamp((s - tS) / 0.35, 0, 1);   // the chips' size: 1 while purple, to 0 over 0.35 s from the part's change to red (tS)
      p.x = ax + 0.5 * dx; p.y = ay + 0.5 * dy; p.ang = Math.atan2(dy, dx); p.len = Math.hypot(dx, dy); p.w0 = obOW((k + 1) / 15) * sc; p.w1 = obOW(k / 15) * sc;
    }
    ERO.u = Math.max(0.8, 0.01 * sc); ERO.t = s;
  }
  const RXP = [], RXE = { base: "#c9581f", dark: "#8a3512", edge: "#1c0f0b" }, RXO = { u: 1, t: 0, seed: 11, old: RXE, neu: RXE };   // Rex's erode: his 12 bones, his orange stone set, no change to a second colour
  for (let i = 0; i < 12; i++) RXP.push({ x: 0, y: 0, ang: 0, len: 0, w0: 0, w1: 0, lv: 0, rd: 0, cf: 1, tl: 1 });
  const RXT = ctx => GenVoidForms.voidErodeClip(ctx, RXP, RXO);
  function rexErode(sq, h, tx, gx, gy, pre) {   // from the barge (his fist in the void) to chg1: a bone is held once its middle is west of the tear; it lets go (bites close, chips shrink away in 0.35 s) at its plate's time, all gone by chg1; before chg0 the bones are the dive pose drawn at (gx, gy)
    const c = clamp((sq - BS.chg0) / (BS.chg1 - BS.chg0), 0, 1), p = chgAt(c);
    if (pre) { GenVoidForms.rexVoidAnchors(0, 0, h, RV, ANC); GenVoidForms.rexErodeParts(RXP, gx - ANC.grip.x, gy - ANC.grip.y, h, RV, 0); }
    else GenVoidForms.rexErodeParts(RXP, p[0], p[1], h, RVC, c);
    for (let k = 0; k < 12; k++) {
      const q = RXP[k], cf = 1 - clamp((sq - (BS.chg0 + q.tl * (BS.chg1 - BS.chg0))) / 0.35, 0, 1);
      q.lv = Math.min(clamp((tx - q.x) / (0.25 * h), 0, 1), cf); q.rd = 0; q.cf = cf;
    }
    RXO.u = Math.max(0.8, 0.006 * h); RXO.t = sq; RXO.nocut = sq >= BS.chg1;
  }
  function shk(s, t, v, d = 0.25) { if (s >= t && s - t < d) G.shake = Math.max(G.shake, v); }
  function cen(t, o) {   // his middle on the way west, then to where the hand closes
    if (t < BS.barge) {
      const u = clamp((t - BS.slip) / (WEST - BS.slip), 0, 1), pn = obPain(t), sc = BC.sc, on = smooth(clamp((t - WEST) / 0.3, 0, 1)), sp = obSpasm(t);
      o.x = mix(BC.M0, BC.M1, smooth(u)); o.y = BC.cy - 0.12 * BC.H * Math.sin(Math.PI * u);
      if (t < WEST) {   // he sinks at the first two spasms (0.05 and 0.045 of the frame, over 0.3 s) and catches himself with a jerk up over 0.1 s
        for (let k = 0; k < 2; k++) { const d = t - SPAS[k]; if (d > 0 && d < 0.4) o.y += pn * (k ? 0.045 : 0.05) * BC.H * (d < 0.3 ? smooth(d / 0.3) : 1 - smooth((d - 0.3) / 0.1)); }
      } else {   // at the spot he drifts and jolts with the spasms, easing back onto his point as the pain falls
        o.x += pn * sc * (on * (0.04 * Math.sin(5.1 * t + 0.4) + 0.02 * Math.sin(8.3 * t)) - 0.08 * sp);
        o.y += pn * sc * (on * (0.04 * Math.sin(4.3 * t + 2) + 0.02 * Math.sin(9.1 * t + 1)) + 0.06 * sp);
      }
      return o;   // the try's offset rides the body in obPose, head first
    }
    const p = fleeP(t); o.x = mix(BC.M1, BC.M2, p); o.y = mix(BC.cy, BC.YG, p); return o;
  }
  const TO = { x: 0, y: 0, k: 0, f: 0 };   // tryMove's result: the offset from his spot (x of W, y of H); f: the strike's reach along his facing (of W; obPose turns it into x from the head minus the neck)
  function tryMove(t, o) {   // from ob1 to barge he tries his new body at his spot, each part eased: 0 to 0.5 s a slow stretch; 0.5 to 1.3 two darts (0.06 W west, 0.04 W back east, a lift and an overshoot on each stop); 1.3 to 2.1 a test strike at nothing (coil back 0.35 s, head 0.05 W forward in 0.12 s, hold 0.1 s, recoil to the ready pose); then the ready pose with a small sway, nothing at barge
    o.x = o.y = o.k = o.f = 0;
    const a = t - BS.ob1;
    if (a <= 0 || t >= BS.barge) return o;
    const ez = u => 0.5 * (smooth(u) + u), ov = u => smooth(u) + 0.1 * Math.sin(Math.PI * u) * u;
    const u1 = clamp((a - 0.5) / 0.4, 0, 1), u2 = clamp((a - 0.9) / 0.4, 0, 1);
    const lu = smooth(clamp((a - 1.65) / 0.12, 0, 1)), re = ez(clamp((a - 1.87) / 0.23, 0, 1));
    const st = (-0.015 * smooth(clamp((a - 1.3) / 0.35, 0, 1)) + 0.065 * lu - 0.06 * re) * (1 - smooth(clamp((a - 2.1) / 0.8, 0, 1)));
    const es = smooth(clamp((a - 2.1) / 0.3, 0, 1)), out = 1 - smooth(clamp((t - (BS.barge - 0.3)) / 0.3, 0, 1));
    o.f = st * out;
    o.x = ((-0.06 * ov(u1) + 0.04 * ov(u2)) * (1 - smooth(clamp((a - 1.3) / 0.8, 0, 1))) + es * 0.004 * Math.sin(2.3 * (a - 2.1))) * out;
    o.y = (-0.005 * Math.sin(Math.PI * clamp(a / 0.5, 0, 1)) - 0.012 * Math.sin(Math.PI * u1) - 0.01 * Math.sin(Math.PI * u2) + es * 0.003 * Math.sin(1.7 * (a - 2.1))) * out;
    o.k = (lu - re) * out;
    return o;
  }
  function fleeP(t) {   // how far along from the spot to the catch he is: 0 until barge, then from rest the speed rises, holds, and eases to rest at the catch at grab
    if (t <= BS.barge) return 0;
    if (t >= BS.grab) return 1;
    const P = 0, V0 = 0, R = 0.5, E = 0.2;
    const T2 = BS.grab - BS.barge, VP = (1 - P - R * V0 / 2) / (T2 - R / 2 - E / 2), d = t - BS.barge;   // panic: the speed rises over R s after barge to VP, holds, then eases to rest over the last E s
    if (d < R) { const u = d / R; return P + V0 * d + (VP - V0) * R * (u * u * u - u * u * u * u / 2); }
    const pA = P + V0 * R + (VP - V0) * R / 2, c = d - R;
    if (c < T2 - R - E) return pA + VP * c;
    const w = (c - (T2 - R - E)) / E;
    return pA + VP * (T2 - R - E) + VP * E * (w - (w * w * w - w * w * w * w / 2));
  }
  function pos(t, o) {   // where he is once he springs off the fist, to where the duel finds him
    const f = smooth(clamp((t - BS.off) / (BS.hover - BS.off), 0, 1));
    o.x = mix(BC.gx, ST.x * BC.W, f); o.y = mix(BC.gy, ST.y * BC.H, f) + 0.04 * BC.H * Math.sin(Math.PI * f) * Math.sin(f * 15); return o;
  }
  const lipW = (x, tx, sc) => { const q = Math.abs(x - tx) / (0.2 * sc); return q < 1 ? 0.5 * (1 + Math.cos(Math.PI * q)) : 0; };   // the weight of the move at x
  function obLip(sc, tx, cy) {   // hold his spine to the slit's centre where it passes the lips: where it crosses x = tx (the tail's line extended once the tail has passed) it is moved to cy, the move easing out to nothing 0.2 sc either side; x untouched, so the times he crosses the lips are the same
    const gate = clamp(1 + (TP[0] - tx) / (0.1 * sc), 0, 1);   // lets go of the tail: full while the tail tip is at or east of the wall, nothing 0.1 sc past it
    if (gate <= 0) return;
    let k = 0, r = NaN;
    for (let j = 0; j < 15; j++) { const xa = TP[j * 2] - tx, xb = TP[j * 2 + 2] - tx; if (xa > 0 && xb <= 0) { k = j; r = xa / (xa - xb); break; } }
    if (r !== r) { const dx = TP[2] - TP[0]; if (Math.abs(dx) < 1e-6) return; r = (tx - TP[0]) / dx; }
    const y = TP[k * 2 + 1] + r * (TP[k * 2 + 3] - TP[k * 2 + 1]), f = Math.max(0.3, (1 - r) * lipW(TP[k * 2], tx, sc) + r * lipW(TP[k * 2 + 2], tx, sc)), off = gate * (y - cy) / f;   // f: how much of a move of the points shows at the crossing, so the crossing lands on cy
    for (let i = 0; i < 16; i++) TP[i * 2 + 1] -= off * lipW(TP[i * 2], tx, sc);
  }
  function burst(ctx, s) {
    const H = G.H, W = G.W, red = G.reduced, g = wombG(), tx = tearX(g);
    const h = Math.min(2 * g.ry, 0.86 * H);
    if (red) { bigTear(ctx, g, tx, 1, 0, g.cy); const L = landing(g); VGP.venom = 0.25; VGP.crack = 0; VGP.mix = 0; VGP.pose = "grip"; VGP.pose2 = undefined; VGP.raise = 1; VGP.fist = s >= BURST ? 0 : 1; const A = GenVoidForms.rexVoidAnchors(L.x, L.y + vsit(h, RC) - vsit(h, VGP), h, VGP, ANC); body(ctx, VGP, A.grip.x, A.grip.y, h, 0.2, false);
      if (s >= BURST) {   // the shed: he lies landed where the duel starts him, facing Rex
        const sc = OBS * h, hd = heldAt(L, sc), hx = hd.x + 0.5 * sc;
        for (let i = 0; i < 16; i++) { TP[i * 2] = hx - (1 - i / 15) * sc; TP[i * 2 + 1] = hd.y; }
        OB1.path = TP; OB1.face = 1; OB1.glow = 0.2; OB1.rimK = RIM; OB1.gait = undefined; GenDuo.drawObrok1(ctx, 0, 0, sc, OB1);
      }
      return; }
    const open = Math.floor(smooth(clamp((s - BS.peek + 0.1) / 0.1, 0, 1)) * 12) / 12;   // the wall is whole until 1.30 s; the slit opens in 0.1 s and is fully open when his head first shows (the camera still starts closing at CUT_AT)
    const pass = Math.min(clamp((s - BS.barge) / 0.4, 0, 1), clamp((BS.grab + 0.8 - s) / 0.8, 0, 1));   // open as wide as he is tall while he passes, eased back within 0.8 s
    const sb = Math.floor(s * 12 + 1e-6) / 12, byB = s < BS.barge ? g.cy : s < BS.grab ? mix(g.cy, 0.42 * H, (sb - BS.barge) / (BS.grab - BS.barge)) : mix(0.42 * H, 330 / 900 * H, clamp((sb - BS.grab) / 0.8, 0, 1));   // follows the hand up, then eases back with the bulge to where the duel holds the tear
    CRK = s < BS.barge ? 0 : clamp((Math.floor(s * 12 + 1e-6) / 12 - BS.barge + 1 / 6) / 0.3, 0, 1);   // closed as in the try until the barge; Rex is already 2/12 s into his arrival on the cut frame and rips it to the full cut within 0.15 s
    bigTear(ctx, g, tx, open, pass, byB, undefined);                         // and swells round him while Rex passes through
    CRK = 1;
    if (s < BS.peek) return;
    OB1.path = TP; OB1.face = -1;
    shk(s, BS.slip, 0.3); shk(s, BS.barge, 1.4, 0.35); shk(s, BS.grab, 0.6); shk(s, BS.land, 0.9); shk(s, BS.bite, 0.5); shk(s, BS.recoil, 0.9);
    const sq = Math.floor(s * 12 + 1e-6) / 12, sc = OBS * h, cy = g.cy, st = Math.floor(sq * 12) % 3;
    OB1.rimK = s < BS.barge ? RIM * clamp((1.3 - (G.zoom || 1)) / 0.15, 0, 1) : RIM;   // no rim while the camera is close, faded in as it pulls back
    const glow = s < BS.set ? 1 : clamp(1 - 0.8 * ((G.zoom || 1) - 1) / Math.max(0.001, clamp(1.7 * H / h, 1, 1.8) - 1), 0.2, 1);   // as the duel's, so the two match
    const M0 = tx + 0.05 * sc, M1 = 0.25 * W, M2 = PL.grabX * W, YG = 0.42 * H;   // where his middle is when he slips out, when Rex barges, when Rex's hand closes; the height of the hand at the grab
    BC.M0 = M0; BC.M1 = M1; BC.M2 = M2; BC.YG = YG; BC.cy = cy; BC.H = H; BC.W = W; BC.sq = sq; BC.sc = sc; BC.tx = tx; BC.h = h;
    if (s >= BS.chg1) {   // the shed stone lies behind both fighters (the part east of the cut only inside the tear until the grab)
      if (s < BS.grab) for (let e = 0; e < 2; e++) { cutClip(ctx, e === 1, false); rubble(ctx, 1 + (sq - BS.chg1) / CHG.dur); ctx.restore(); }
      else rubble(ctx, 1 + (sq - BS.chg1) / CHG.dur);
    }
    if (s < BS.grab) {
      for (let e = 0, ne = s < BS.barge ? 2 : 1; e < ne; e++) {   // before the barge in two passes: the part east of the cut shows only inside the tear
      if (ne === 2) cutClip(ctx, e === 1, false); else ctx.save();
      if (s < BS.slip) {   // peeking out: head swinging low, then high
        const sw = obStall(s);   // how far through the tear: uneven, three stalls and lurches, 1 at slip
        obPath(tx - mix(0.15, 0.65, Math.min(1, sw * 2)) * sc - 0.1 * sc * Math.sin(Math.PI * sw), cy + 0.07 * H * Math.cos(Math.PI * sw) * smooth(clamp(sw / 0.25, 0, 1)), sc, 0, s * 9);
        obEmerge(sc, s); obLip(sc, tx, cy);
        OB1.glow = glow; OB1.gait = gaitAt(s); OB1.chaos = 0;   // purple, as he was in the womb
        obErode(s, sc); ctx.save(); GenVoidForms.voidErodeClip(ctx, ERP, ERO);
        GenVoidForms.drawObrokVoid(ctx, 0, 0, sc, OB1);
        ctx.restore(); GenVoidForms.drawVoidErode(ctx, ERP, ERO);
      } else {
        const fl = s < BS.barge, c = cen(fl ? s : sq, BP);
        if (fl) { const p = smooth(clamp((s - BS.slip) / (WEST - BS.slip), 0, 1)); c.x -= 0.54 * sc * (1 - p); c.y += (0.18 * sc - 0.07 * H) * (1 - p); }   // the flight's head (the path's last point, turned back: 0.16 sc west of and 0.18 sc above its middle) starts at the peek's last head place and loses that offset by WEST, so the head only ever moves west
        if (s < WEST - 0.4 || s >= BS.barge) { obPath(c.x - 0.5 * sc, c.y, sc, 1, fl ? wph(s) : (sq - PH) * 9); if (s < BS.slip + 0.9) obPeekBlend(sc, s); if (s < BS.barge) obWrithe(sc, s); if (s < BS.slip + 1.2) obLip(sc, tx, cy); } else obPose(c, sc, s);
        OB1.glow = glow; OB1.gait = fl ? gaitAt(s) : sq - PH - OSL; OB1.chaos = clamp((s - BS.ob0) / (BS.ob1 - BS.ob0), 0, 1);   // the change runs on the continuous clock
        OB1.fall = 1.5 * H;   // his pieces fall this far, out of the frame
        const fire = fl && s < BS.barge - 0.1;
        if (fire) { obErode(s, sc); ctx.save(); GenVoidForms.voidErodeClip(ctx, ERP, ERO); }
        GenVoidForms.drawObrokVoid(ctx, 0, 0, sc, OB1);
        OB1.fall = 0;
        if (fire) { ctx.restore(); GenVoidForms.drawVoidErode(ctx, ERP, ERO); }
      }
      ctx.restore();
      }
    }
    if (s < BS.barge) return;
    RVK.k = VGP.k = VCR.k = VCL.k = VKF * (1 / VK + (1 - 1 / VK) * (s < BS.chg1 ? 0 : GenVoidForms.growK(BS.chg1, BS.bite, sq)));   // from chg1 he starts at the womb's size and grows to full by the bite (the grip stays put)
    const L = landing(g), SK = 0.05 * W, SH = 0.2 * W, OX = L.x - SK + SH;   // the floor origin where he lands, and where the skid leaves him; SH: the step east in the rise that brings the held fist and Obrokxus into the frame
    const Fs = L.y + vsit(h, RC), dFl = vsit(h, VCL) - vsit(h, RC);   // the floor the void body stands on (as the duel's Fs); dFl: what the clutch adds so the last frame is the duel's first
    let wFl = 0;
    const oy = o => Fs - vsit(h, o) + dFl * wFl;   // the origin height that puts his lowest stone on the floor
    const fistAt = (o, x) => { const a = GenVoidForms.rexVoidAnchors(x, oy(o), h, o, ANC); BT.x = a.grip.x; BT.y = a.grip.y; return BT; };
    VCR.face = -1; VCR.fist = 1; VGP.raise = 0;
    if (s < BS.grab) {   // Rex forces through the cut, fist, forearm, shoulder first (2.8-3.1, the body stays inside), then the dive carries him out; the leading arm is straight
      const u = clamp((sq - BS.barge + 1 / 6) / 0.3, 0, 1), f = clamp((sq - BS.barge - 0.3) / (BS.grab - BS.barge - 0.3), 0, 1);
      RV.pose = "dive"; RV.pose2 = undefined; RV.mix = 0; RV.fist = 0; RV.venom = 0; RV.warm = 0;
      RVK.pose2 = undefined; RVK.mix = 0; RVK.fist = 0; RVK.venom = 0; RVK.raise = undefined;
      const x0 = tx - 0.05 * h, x1 = tx - 0.7 * h; let gx = f > 0 ? mix(x1, PL.grabX * W, f) : mix(x0, x1, smooth(u)), gy = mix(cy, YG, f) + 0.09 * H * Math.sin(Math.PI * f);   // a long heavy leap: the arc rises high before the hand comes down on him
      let bm = 0;   // before chg0 he drives on the true clock (no held steps); over the last 0.18 s the fist comes to the change's hand and the body to the change's size, so the change takes over from an identical figure
      if (s < BS.chg0) {
        bm = smooth(clamp((s - (BS.chg0 - 0.18)) / 0.18, 0, 1));
        const a = flyHand(s, FH, true), b = flyHand(BS.chg0, CC, false);
        gx = mix(a.x, b.x, bm); gy = mix(a.y, b.y, bm);
      }
      const ero = sq < BS.chg1 + 0.6;   // past chg1 only the chips are drawn, shrinking away (the last bone lets go at about 10.25 s)
      if (ero) rexErode(sq, h, tx, gx, gy, s < BS.chg0);
      if (s < BS.chg0) {
        const m = mix(1, RVC.g0, bm), kb = smooth(clamp((s - (BS.chg0 - 0.2)) / 0.2, 0, 1)); ctx.save(); ctx.globalAlpha = 1 - kb * kb; ctx.translate(gx, gy); ctx.scale(m, m); ctx.translate(-gx, -gy);   // over the last 0.2 s the change fades in on top of the stone (rod arm to plated body, no pop)
        rexAtCut(ctx, gx - GenDuo.rexAnchors(0, 0, h, RV, ANC).grip.x, gy - ANC.grip.y, h, RV, 0, 1, glow, false, ero ? RXT : undefined); if (ero) GenVoidForms.drawVoidErode(ctx, RXP, RXO);
        ctx.restore();
        if (kb > 0) {
          CHG.key = 0; CHG.ground = rubbleFloor(L);
          for (let e = 0; e < 2; e++) {
            cutClip(ctx, e === 1, false);
            ctx.globalAlpha = kb; const p = chgAt(0); GenVoidForms.drawRexChange(ctx, p[0], p[1], h, RVC, 0);
            ctx.restore();
          }
        }
        return;
      }
      CHG.key = 0;   // this frame's anchors are the flight's, not the rubble's
      CHG.ground = rubbleFloor(L);   // the change in the air (his grip on the hand's path), then the void Rex
      for (let e = 0; e < 2; e++) {   // still through the cut as before: the part east of the cut shows only inside the tear
        cutClip(ctx, e === 1, false);
        if (sq < BS.chg1) RXT(ctx);
        if (s < BS.chg1) { const c = clamp((sq - BS.chg0) / (BS.chg1 - BS.chg0), 0, 1), p = chgAt(c); GenVoidForms.drawRexChange(ctx, p[0], p[1], h, RVC, c); }
        else body(ctx, RVK, gx, gy, h, glow, false, 0, 0);
        ctx.restore();
      }
      if (ero) GenVoidForms.drawVoidErode(ctx, RXP, RXO);
      return;
    }
    const HIT0 = BS.bite + 0.05, HIT1 = HIT0 + 0.08, STK = s < HIT0 + 0.35 ? clamp((s - (HIT0 - 0.2)) / 0.2, 0, 1) : 1 - clamp((s - (HIT0 + 0.35)) / 0.2, 0, 1);   // coil back 12.2 to 12.45, the strike 12.45 to HIT0 (0.2 s), held in 0.35 s, pulled out over 0.2 s; a hit-stop to HIT1
    VGP.venom = clamp((s - HIT0) / 1.45, 0, 1);   // the poison's front: 0 to 1 from the sting to 14.1 s, along the seams (hand, arm, shoulder, chest, belly, far arm)
    VGP.crack = clamp((s - HIT0) / 2.65, 0, 1);   // the seams split open: 0 at the sting to 1 at 1.2 s after the front reaches 1
    SQM.a = 0; SQM.k = 0; SQM.w = 0;
    VGP.pose2 = undefined; VGP.mix = 0; VGP.fist = 1;
    if (s < BS.land) {   // the fist closes on him in the air, a hit-stop, then the leap runs on and the feet hit
      const a = smooth(clamp((s - BS.grab) / (BS.land - BS.grab), 0, 1)), T = fistAt(VCR, L.x);   // on the real clock from the grab (0.35 s), not the 12 fps one: the dive to crouch and the fall to the floor are one continuous move
      RVK.pose = "dive"; RVK.pose2 = "crouch"; RVK.mix = a; RVK.fist = 1; RVK.venom = 0; RVK.raise = 0;
      const ap = 0.6 * clamp((s - BS.grab) / (BS.land - BS.grab), 0, 1) + 0.4 * a;   // the place eases less than the pose, so the fall stays under 0.04 h a frame
      const gx = mix(M2, T.x, ap), gy = mix(YG, T.y, ap) + 0.012 * H * (1 - a);   // lowered a few px so his top stays inside the frame in the first moments after the grab
      if (s < BS.grab + 0.2) { ctx.fillStyle = "rgba(245,138,52,0.35)"; ctx.beginPath(); ctx.arc(gx, gy, 0.09 * h, 0, 6.2832); ctx.fill(); }   // his glow flares
      SQM.a = 1; SQM.p = sq * 9;
      body(ctx, RVK, gx, gy, h, glow, true, sq - PH - OSL, 0.4);
      return;
    }
    if (s < BS.set) {   // the landing: crouched on the floor, skidding west with dust at the feet, then the rise
      const k = smooth(clamp((sq - BS.land) / (BS.rise - BS.land), 0, 1)), ro = clamp((sq - BS.rise) / (BS.set - BS.rise), 0, 1);
      VGP.pose = "crouch"; VGP.pose2 = ro > 0 ? "grip" : undefined; VGP.mix = smooth(ro); VGP.raise = 0;
      const ax = L.x - SK * k + SH * smooth(clamp((sq - BS.rise + 0.15) / (BS.set - BS.rise + 0.15), 0, 1)), T = fistAt(VGP, ax);
      SQM.a = 1; SQM.p = sq * 9;
      body(ctx, VGP, T.x, T.y, h, glow, true, sq - PH - OSL, 0.4);
      const a = s - BS.land;
      for (let i = 0; i < 7; i++) {
        const q = Math.floor(a * 12) / 12, r = (0.014 + 0.005 * (i % 3)) * h, x = ax + (0.05 + 0.1 * i * Math.min(q, 0.5)) * h, y = Fs - (0.02 + 0.04 * (i % 3)) * h * Math.min(q, 0.6);
        ctx.save(); ctx.translate(x, y); ctx.rotate(i + q * 3);
        ctx.fillStyle = i % 2 ? "#b4461e" : "#7a5a4a"; ctx.fillRect(-r, -r * 0.7, 2 * r, 1.4 * r);
        ctx.restore();
      }
      return;
    }
    const sg = (Math.floor(sq * 12) % 2) * 2 - 1;
    VGP.pose = "grip"; VGP.raise = 0; VGP.pose2 = "pry"; VGP.mix = 0;
    const HG = fistAt(VGP, OX); BC.gx = HG.x; BC.gy = HG.y;   // the held fist
    if (s < BS.recoil) {   // planted, one elbow bend, the fist before the chest; the arm trembles, the fingers flinch open; from the bite the free hand rises to pry
      const hold = s >= HIT0 && s < HIT1, tr = (s >= HIT1 && s < HIT0 + 0.35 ? 0.006 : 0.004) * H * (hold ? (Math.floor(HIT0 * 12 + 1e-6) % 2) * 2 - 1 : sg), gq = s < HIT0 ? sq : hold ? Math.floor(HIT0 * 12 + 1e-6) / 12 : sq - 1 / 12;   // hit-stop: his legs and Rex's tremble stand still for 0.08 s
      let kk = 0; for (let i = 0; i < SPT.length; i++) { const d = s - SPT[i]; if (d >= 0 && d < 0.17) kk += SPA[i] * H * (1 - d / 0.17) * (i % 2 ? -1 : 1); }   // the kick at the sting, then a small spasm as the front passes each joint
      SQM.a = 1 - clamp((s - (BS.bite - 0.5)) / 0.1, 0, 1); SQM.k = STK; SQM.w = s < HIT0 ? smooth(clamp((s - (HIT0 - 0.45)) / 0.25, 0, 1)) : 0; SQM.p = sq * 9;
      VGP.mix = smooth(clamp((sq - BS.bite) / 0.4, 0, 1));
      VGP.fist = (sq >= BS.bite + 0.7 && sq < BS.bite + 0.8) || (sq >= BS.bite + 1.0 && sq < BS.bite + 1.1) || (sq >= BS.bite + 1.25 && sq < BS.bite + 1.35) ? 0.55 : 1;
      body(ctx, VGP, HG.x + tr + kk, HG.y - 0.6 * tr + 0.7 * kk, h, glow, true, gq - PH - OSL, s < BS.bite - 0.4 ? 0.4 : 0.1);
      return;
    }
    /* the recoil: the arm is ripped back and the fist flies open, then he staggers a step east clutching the forearm; he springs off and flies up and west */
    const r = sq - BS.recoil, ox = OX + h * (0.12 * smooth(clamp(r / 0.4, 0, 1)) + 0.05 * smooth(clamp((r - 0.4) / 0.4, 0, 1)));
    if (r < 0.4) { VGP.pose = "pry"; VGP.pose2 = "recoil"; VGP.mix = smooth(r / 0.4); }
    else if (r < 0.8) { VGP.pose = "recoil"; VGP.pose2 = "clutch"; VGP.mix = smooth((r - 0.4) / 0.4); }
    else { VGP.pose = "clutch"; VGP.pose2 = undefined; VGP.mix = 0; }
    VGP.fist = s < BS.off ? 1 : 0; wFl = smooth(clamp(r / 0.8, 0, 1));
    SQM.k = 0; SQM.p = sq * 9;   // the tail let go of the wrist at 13.2 s
    const A0 = GenVoidForms.rexVoidAnchors(ox, oy(VGP), h, VGP, ANC);   // the same origin held or bare: after the spring-off body() draws him with no fist and no Obrokxus
    body(ctx, VGP, A0.grip.x, A0.grip.y + 0.009 * H * clamp(1 - Math.abs(r - 0.43) / 0.12, 0, 1), h, glow, true, sq - PH - OSL, 0.1);   // a few px lower while the recoil pose passes through its tallest moment (r 0.4 to 0.46), so his top stays in the frame
    if (s >= BS.off) {
      const wig = Math.floor((sq - PH) * 12 + 1e-6) * 1.7;
      if (sq < BS.hover) {
        const p = pos(sq, BP);
        for (let i = 0; i < 16; i++) { const t = i / 15; TP[i * 2] = p.x + (1 - t) * sc; TP[i * 2 + 1] = p.y + 0.1 * sc * Math.sin(Math.PI * t) * Math.sin(wig + t * 6); }
        OB1.glow = glow; OB1.gait = sq - PH - OSL;
      } else {   // he comes down on the floor west of Rex, then turns to face him in one step
        const u = smooth(clamp((sq - BS.hover) / (BS.held - BS.hover), 0, 1)), hd = heldAt(L, sc), dir = sq >= BS.turn ? 1 : -1;
        const cxs = mix(ST.x * W + 0.5 * sc, hd.x, u), cys = mix(ST.y * H, hd.y, u * u) - 0.1 * H * Math.sin(Math.PI * u), hx = cxs + dir * 0.5 * sc;
        for (let i = 0; i < 16; i++) { const q = i / 15; TP[i * 2] = hx - dir * (1 - q) * sc; TP[i * 2 + 1] = cys + (u >= 1 ? 0 : 0.1 * sc * Math.sin(Math.PI * q) * Math.sin(wig + q * 6)); }
        OB1.face = dir; OB1.glow = glow; OB1.gait = u < 1 ? sq - BS.hover : undefined;
      }
      GenDuo.drawObrok1(ctx, 0, 0, sc, OB1);
    }
  }

  /* ---- duel: Obrokxus poisons him and flees flying, Rex recoils, leaps, catches him, crashes, and drags himself back to the cut ---- */
  /* stagger (to wind), wind-up (to leap), leap (to catch), catch (hit-stop to hit, then pulled in to carry), crash (to fall), drag into the cut (to seat), collapsed */
  const TM = { open: 0.8, recoil: 1.2, step1: 1.0, step2: 1.6, brace: 3.1, wind: 3.3, leap: 40 / 12, catch: 3.7, hit: 3.7, carry: 3.8333, fall: 4.0, pin: 34 / 12, Q0: 31 / 12, coil: 35 / 12, lie: 5.05, drag: 5.85, seat: 8.85, wide0: 0.8, wide1: 2.0, gate0: 8.25, flee: 0.9, reach: 1.15, grab: 2.45, pull: 2.65 };   // r32: pin: the fist is hauled in and pins him on the floor; Q0 to coil: Rex drops into the coil (held five steps to leap, the wind-up; the pounce itself is eight fast steps); leap: the pounce; fall: he lands on the fist
  // flee: Obrokxus leaves west; reach: the near arm grows west in three heaves; grab: it holds out off screen; pull: it comes back in two steps with him coiled in the hand; brace: he kneels braced until here (the pull's end) and then crouches; wind: crouched; leap: he leaves the floor; catch: both arms close on Obrokxus; carry: the crash begins; fall: he lies on him; lie: the drag starts; seat: the drag ends
  const HOVER = { x: 0.1, y: 0.4 }, CATCH = { x: 0.1, y: 0.4 };   // where Obrokxus circles to and where Rex catches him (W, H fractions); duel sets CATCH from the leap each frame
  const DC = { k: VKF, pose: "crawl", face: 1, fist: 1, venom: 1, crack: 1, cool: 0, venomA: 1 };
  const TP = [];
  for (let i = 0; i < 16; i++) TP.push(0, 0);
  const DU = { k: VKF, pose: "grip", face: -1, fist: 0, raise: 1 }, AD = {}, AC = {}, AR = {}, AE = {};
  const hold = d => Math.floor(d * 12 + 1e-6) / 12;

  function fly(d, out) {   // where Obrokxus is, from the fist that opens at 0.8: one rippling arc out of Rex's reach to the catch point, where he hangs while Rex winds up and leaps
    const W = G.W, H = G.H, q = Math.min(Math.max(hold(d), TM.open), TM.wind), u = (q - TM.open) / (TM.wind - TM.open);   // before the open he hangs where the burst left him
    out.x = mix(ST.x, CATCH.x, u) * W; out.y = (mix(ST.y, CATCH.y, u) - 0.08 * Math.sin(Math.PI * u)) * H + 0.02 * H * Math.sin(Math.PI * u) * Math.sin(u * 15);
    return out;
  }
  const FP = { x: 0, y: 0 }, FQ = { x: 0, y: 0 }, CZ = { k: VKF, pose: "crawl", face: 1, fist: 1, venom: 1, crack: 1, cool: 0, venomA: 1 };
  const RC = { k: VKF, pose: "recoil", face: -1 }, RO = { k: VKF, pose: "crawl", face: 1 };

  const DL = { W: 0, H: 0, h: 0, Fs: 0, F1: 0, y0: 0, yL: 0, sitCl: 0, hP: 0, cPull: 0, cP: 0, hB0: 0, hB1: 0, cL1: 0, hvx: 0, hvy: 0, wP: 0, dK: [0, 0, 0, 0, 0, 0] };   // duel's layout values that change only with the frame size and Rex's height (the same key as CHG.key); the pose, time and venom never enter
  const MK = [1, 1, 1, 1, 1, 0.8], FK = [1, 1.1, 1.2, 1.35, 1.55, 1.8], nk = 6, sFK = 8.0;
  function duel(ctx, d) {
    const W = G.W, H = G.H, red = G.reduced, g = wombG(), tx = tearX(g);
    const L = landing(g), h = L.h, z1 = cam().z1;
    const glow0 = red ? 0.2 : clamp(1 - 0.8 * ((G.zoom || 1) - 1) / Math.max(0.001, z1 - 1), 0.2, 1);   // near 1 wide, about 0.2 close
    bigTear(ctx, g, tx, 1, red ? 0 : Math.min(clamp((d - TM.fall) / 0.4, 0, 1), clamp((TM.seat + 0.4 - d) / 0.4, 0, 1)), mix(330 / 900 * H, 0.8 * H, clamp((d - TM.carry) / (TM.fall - TM.carry), 0, 1)), undefined);   // the cut opens as wide as his chest at the floor while he is dragged in, eased back as he settles
    if (!red) rubble(ctx, 1e3);
    const q = red ? TM.seat + 2.6 : hold(d), sc = OBS * h, tk = red ? 0 : G.t;
    if (!red) for (const t of [TM.open, TM.step1, TM.step2]) if (d >= t && d - t < 0.25) G.shake = Math.max(G.shake, 0.35);   // each step lands with a jolt
    if (!red && d >= TM.pin && d < TM.pin + 0.25) G.shake = Math.max(G.shake, 0.7);                                            // the pin: the fist comes down
    if (!red && d >= 97 / 12 && d < 97 / 12 + 0.25) G.shake = Math.max(G.shake, 0.6);   // the knee gives
    if (!red && d >= 104 / 12 && d < 104 / 12 + 0.4) G.shake = Math.max(G.shake, 1.0);   // he settles into the ball
    const ven = 1;   // the shed's poison front has reached every seam by 14.1 s, so the duel starts from the full level
    let wig = red || q >= 103 / 12 - 0.04 ? 0 : Math.floor(q * 12) * 1.7;   // the tail goes still once he lies on it
    const spine = (hx, hy, dir, len) => { for (let i = 0; i < 16; i++) { const t = i / 15; TP[i * 2] = hx - dir * (1 - t) * len; TP[i * 2 + 1] = hy + 0.1 * len * Math.sin(Math.PI * t) * Math.sin(wig + t * 6); } };
    const rx = L.x - 0.05 * W + 0.2 * W + 0.17 * h, ry = L.y;   // Fs: the floor he stands on; F1: the floor he crashes onto
    const sit = o => vsit(h, o);
    const rel = (p1, p2, m, k, f) => { RO.pose = p1; RO.pose2 = p2; RO.mix = m; RO.rot = DU.rot; RO.face = f || 1; RO.raise = 1; return GenVoidForms.rexVoidAnchors(0, 0, h, RO, AE)[k].x; };   // an anchor's x from the origin, in a pose or a blend
    if (DL.W !== W || DL.H !== H || DL.h !== h) {   // a new frame size: the layout values again
      DL.W = W; DL.H = H; DL.h = h; DL.Fs = L.y + vsit(h, RC); DL.F1 = 0.87 * H;
      DL.y0 = DL.Fs - sit({ k: VKF, pose: "leap", face: -1 }); DL.yL = DL.F1 - sit({ k: VKF, pose: "prone", face: -1 }); DL.sitCl = sit({ k: VKF, pose: "clutch", face: -1 });
      DL.hP = rel("crawlPlant", undefined, 0, "handB"); DL.cPull = rel("crawlPull", "crawlPlant", 1 - MK[nk - 1], "collar"); DL.cP = rel("prone", undefined, 0, "collar");
      for (let k = 0; k < nk; k++) DL.dK[k] = DL.hP - rel("crawlPlant", "crawlPull", MK[k], "handB");
      let wP = 1e9; for (const l of GenVoidForms.rexVoidPolys({ k: VKF, pose: "prone", face: -1, rot: true, raise: 1 }).polys) for (const p of l[1]) wP = Math.min(wP, p[0]); DL.wP = wP * h * VKF / 1000;   // prone's west-most point from its origin (face -1)
      DL.hB0 = rel("prone", "lowCurl", 0, "handB", -1); DL.hB1 = rel("prone", "lowCurl", 1, "handB", -1); DL.cL1 = rel("prone", "lowCurl", 1, "collar", -1);
      const hv = GenVoidForms.rexVoidAnchors(0, 0, h, { k: VKF, pose: "leap", face: -1 }, AR).handF; DL.hvx = hv.x; DL.hvy = hv.y;   // the hand's offset from the origin; the origin itself moves with the drag
    }
    const Fs = DL.Fs, F1 = DL.F1;
    DU.venom = ven; DU.crack = 1; DU.fist = q >= TM.fall ? 1 : 0; DU.raise = 1; DU.face = -1; DU.cool = 0; DU.pose2 = undefined; DU.mix = 0; DU.rot = true; delete DU.warm;
    /* the drag's plan, from the cut back: the last pull ends with his collar at the cut where drop expects it; each pull moves the origin by what the fixed hand allows */
    const tl = LV.kx * tx + LV.ex;
    const hP = DL.hP, xEnd = tl + 0.02 * h - DL.cPull;
    let xs = xEnd; for (let k = 0; k < nk; k++) xs -= DL.dK[k];
    const cP = DL.cP, xL = xs;   // xL: where the drag starts (east-facing prone origin); xl: the same collar when he lies facing west
    const tT = TM.fall - TM.leap, PN = { x: 0, y: 0 }, HP = { x: 0, y: 0 }, PV = { x: 0, y: 0 };   // the pounce's flight (leap to fall); PN: where the fist pins him; HP: the hip's x at the start of the coil
    const hip0 = rx + rel("kneel", undefined, 0, "waist", -1);
    let xl = hip0 - 0.35 * h - rel("prone", undefined, 0, "waist", -1);   // where he lies at 5.05: the pounce carries his hip 0.35 h west (lowCurl's hip is prone's); prone's reaching hands then pass the left edge by about 0.1 W (0.04 * W - DL.wP would keep them in, but leaves no travel)
    let cx = xl + rel("prone", undefined, 0, "collar", -1);    // the collar's x from the landing to the lie
    PN.x = xl - 0.1 * h; PN.y = Fs - 0.03 * h;   // the fist 0.1 h west of his collar
    if (PN.x < 0.06 * W) { PN.x = 0.06 * W; xl = PN.x + 0.1 * h; cx = xl + rel("prone", undefined, 0, "collar", -1); }
    CATCH.x = PN.x / W; CATCH.y = PN.y / H;
    DU.face = -1;
    delete DU.reach;   // before any sit(DU): last frame's reach arm, aimed down at the pin, would count as his lowest stone and lift the whole body off the floor
    let ax, ay, ob = false, dirf = -1, th = 0;   // th: his pitch about the hip PV (canvas rotate, + = nose up, he faces west); the arm is solved against it and Obrokxus is drawn outside it
    const coilP = (m) => { DU.pose = "kneel"; DU.pose2 = "coil"; DU.mix = m; };
    const an = (p1, p2, m, k) => { RO.pose = p1; RO.pose2 = p2; RO.mix = m; RO.rot = true; RO.face = 1; RO.raise = 1; const a = GenVoidForms.rexVoidAnchors(0, 0, h, RO, AE)[k]; return { x: a.x, y: a.y }; };
    if (q < TM.Q0) {                                               // kneel with the poisoned arm hanging
      const u = smooth(Math.min(1, q / 0.7));
      if (q < TM.recoil) { DU.pose = "clutch"; DU.pose2 = "kneel"; DU.mix = u; } else { DU.pose = "kneel"; DU.pose2 = undefined; DU.mix = 0; }
      ob = q >= TM.grab;   // he is in the hand from the grab on
      ax = rx; ay = Fs - sit(DU) + (q < TM.recoil ? (ry - Fs + DL.sitCl) * (1 - u) : 0);   // frame 0 sits exactly where the burst's last frame stood
    } else {                                                       // coil over the pinned fist, rise and turn, the walk, then the fold into the ball
      ob = true;
      const kq = Math.round(q * 12);
      if (kq < 35) {   // down into the coil (k31-34): the approved start
        coilP(clamp((q - TM.Q0) / (TM.coil - TM.Q0), 0, 1));
        ax = hip0 - rel(DU.pose, DU.pose2, DU.mix, "waist", -1); ay = Fs - sit(DU);
      } else if (kq <= 44) {   // rise and turn (k35-44): [k, pose1, pose2, mix, hip dy up (h), pitch, face]
        const RT = [[35, "coil", "crouch", 0.5, 0.06, -0.05, -1], [36, "crouch", undefined, 0, 0, -0.08, -1], [37, "crouch", "wHold", 0.6, 0, -0.03, -1], [38, "wHold", undefined, 0, 0, 0.04, -1], [39, "wHold", undefined, 0, 0, 0, -1], [40, "wHold", undefined, 0, -0.02, 0, -1],
          [41, "wHold", undefined, 0, 0, 0, -1], [42, "wHug", undefined, 0, -0.01, 0, -1], [43, "wHug", undefined, 0, -0.01, 0, 1], [44, "wHug", "wContact", 0.5, -0.02, -0.04, 1]];
        const c = RT[clamp(kq, 35, 44) - 35];
        DU.pose = c[1]; DU.pose2 = c[2]; DU.mix = c[3]; DU.face = c[6]; dirf = c[6]; th = c[5]; DU.fist = 1;
        ax = hip0 - rel(DU.pose, DU.pose2, DU.mix, "waist", c[6]);   // the hip stays at hip0 through the mirror
        ay = Fs - sit(DU) - c[4] * h;
      } else if (kq <= 94) {   // the walk (k45-94): seven plain heavy steps east, a planted foot every cell
        if (DL.wk !== W + "," + H + "," + h + "," + hip0 + "," + tl) {   // solve the stride once per layout: bisect u so the k94 hip lands at the cut
          DL.wk = W + "," + H + "," + h + "," + hip0 + "," + tl;
          const CN = [6, 6, 6, 8, 7, 8, 9], WT = [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7];
          const sim = (u) => {
            const out = [], a0 = an("wHug", "wContact", 0.5, "footB"), w0 = an("wHug", "wContact", 0.5, "waist");
            let Xp = hip0 + (a0.x - w0.x) * Math.cos(-0.04) - (a0.y - w0.y) * Math.sin(-0.04), wax = 0;   // the k44 back foot's x
            for (let i = 0; i < 7; i++) {
              const S = i % 2 === 1, t = -0.06 - 0.08 * i / 6, wt = Math.min(1, u * WT[i]), cs = Math.cos(t), sn = Math.sin(t);
              const back = S ? "footF" : "footB", front = S ? "footB" : "footF";
              for (let c = 0; c < CN[i]; c++) {
                const p2 = (c === 0 ? "wContact" : c < 3 ? "wDown" : "wPass") + (S ? "S" : "");
                DU.pose = "wHug"; DU.pose2 = p2; DU.mix = wt; DU.face = 1;
                const wa = an("wHug", p2, wt, "waist"), fa = an("wHug", p2, wt, c < 2 ? back : front), dx = fa.x - wa.x, dy = fa.y - wa.y;
                if (c === 2) Xp = wax + wa.x + dx * cs - dy * sn;   // the front foot lands: ax holds, its ankle is the new plant
                else wax = Xp - wa.x - (dx * cs - dy * sn);
                out.push({ p2, wt, t, ax: wax, ay: Fs - sit(DU) + dy * (1 - cs) - dx * sn, hx: wax + wa.x, c });
              }
            }
            return out;
          };
          let lo = 0, hi = 1.5;
          for (let n = 0; n < 30; n++) { const m = (lo + hi) / 2; if (sim(m)[49].hx < tl) lo = m; else hi = m; }
          DL.u = (lo + hi) / 2; DL.walk = sim(DL.u);
        }
        const cw = DL.walk[clamp(kq, 45, 94) - 45];
        DU.pose = "wHug"; DU.pose2 = cw.p2; DU.mix = cw.wt; DU.face = 1; dirf = 1; th = cw.t; DU.fist = 1;
        ax = cw.ax; ay = cw.ay;
        if (!red && cw.c === 0 && kq <= 94) G.shake = Math.max(G.shake, 0.3);
      } else {   // the fold (k95-102) and the ball (k103 on): the knee gives, he sinks over his planted feet round Obrokxus and curls into a ball that stays a ball
        const FD = [[95, "wDown", "wBuckle", 0.5, -0.16], [96, "wBuckle", undefined, 0, -0.12], [97, "wBuckle", "vBall", 0.2, -0.08], [98, "wBuckle", "vBall", 0.4, -0.05], [99, "wBuckle", "vBall", 0.55, 0], [100, "wBuckle", "vBall", 0.7, 0], [101, "wBuckle", "vBall", 0.8, 0], [102, "wBuckle", "vBall", 0.9, 0], [103, "vBall", undefined, 0, 0]];
        const cw = DL.walk[49], cs0 = Math.cos(cw.t), sn0 = Math.sin(cw.t), fa = an("wHug", cw.p2, cw.wt, "footF"), wa0 = an("wHug", cw.p2, cw.wt, "waist");
        const Xp = cw.ax + wa0.x + (fa.x - wa0.x) * cs0 - (fa.y - wa0.y) * sn0;   // the planted ankle of the last step stays where it is
        const c = FD[clamp(kq, 95, 103) - 95];
        DU.pose = c[1]; DU.pose2 = c[2]; DU.mix = c[3]; DU.face = 1; dirf = 1; th = c[4]; DU.fist = 1;
        const wa = an(c[1], c[2], c[3], "waist"), fb = an(c[1], c[2], c[3], "footF"), cs = Math.cos(th), sn = Math.sin(th), dx = fb.x - wa.x, dy = fb.y - wa.y;
        ax = Xp - wa.x - (dx * cs - dy * sn);
        ay = mix(Fs, F1 + 0.03 * h, clamp((kq - 94) / 9, 0, 1)) - sit(DU) + dy * (1 - cs) - dx * sn;   // the floor eases from the walk's to the cut's
        if (kq >= 103) { DL.bx = ax; DL.by = ay; DL.bh = h; DL.btl = tl; }   // the ball's place: drop starts from it
      }
    }
    if (th) { const w = GenVoidForms.rexVoidAnchors(ax, ay, h, DU, AE).waist; PV.x = w.x; PV.y = w.y; }   // the pivot: his hip, without the reach arm
    DU.venomA = 1;   // the shed ends with the bite's 0.5 already on him, so the duel starts from it
    delete DU.reach;
    const RB = 0.3;   // the arm blends in over RB from the reach
    if (!red && q >= TM.reach && Math.round(q * 12) < 103) {                // the near arm aims west (face -1: the rig's +x) and grows off screen in pulses, snags, and is pulled back in two steps
      GenVoidForms.rexVoidAnchors(ax, ay, h, DU, AR);
      const nat = Math.atan2(AR.wristF.y - AR.elbowF.y, -(AR.wristF.x - AR.elbowF.x)), aim = -0.15, da = Math.atan2(Math.sin(aim - nat), Math.cos(aim - nat));   // the forearm's own angle now (the rig's convention), and the turn to the aim by the short way
      const bw = smooth(clamp((q - TM.reach) / RB, 0, 1));
      const ang = nat + da * bw, hp = DU.reach = { k: 1, ang: aim };   // kNeed is measured at the aim, so it does not move with the blend
      GenVoidForms.rexVoidAnchors(ax, ay, h, DU, AR);
      const hx1 = AR.handF.x, hl = Math.hypot(AR.handF.x - AR.wristF.x, AR.handF.y - AR.wristF.y);
      hp.k = 2; GenVoidForms.rexVoidAnchors(ax, ay, h, DU, AR);
      const per = AR.handF.x - hx1, kNeed = Math.min(8, 1 + Math.max(0, (-2.5 * hl - hx1) / (per || -1)));   // the hand ends 2.5 hand lengths past the left edge (the camera is wide, edge at x = 0)
      let k = kNeed;
      if (q < TM.reach + RB) k = 1;   // the first pulse starts once the arm lies straight
      else if (q < TM.grab) k = 1 + (kNeed - 1) * GenVoidForms.growK(TM.reach + RB, TM.grab, q);
      else k = q >= TM.grab + 1 / 12 && q < TM.grab + 2 / 12 ? 1 + 0.94 * (kNeed - 1) : kNeed;   // the snag: one step short, then out again
      hp.k = k; hp.ang = ang;
      if (q >= TM.Q0) {   // the yank: the fist is hauled in two steps from off screen to the floor west of his feet and stays there (k34-55), then eases back to his own hand (k56-58); the arm is solved to reach it from wherever the body is
        const kq = Math.round(q * 12), ra = v => Math.atan2(v.y, DU.face * v.x), ad = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b)), sl = h * VKF / 1000, ay0 = ay;
        delete DU.reach; const lp = GenVoidForms.rexVoidPolys(DU).lift; GenVoidForms.rexVoidAnchors(ax, ay, h, DU, AR);   // the plain pose: its own lift (sit() has it already) and arm lengths
        const CHx = AR.chest.x, CHy = AR.chest.y, Lu = Math.hypot(AR.elbowF.x - AR.shoulderF.x, AR.elbowF.y - AR.shoulderF.y), Lf = Math.hypot(AR.handF.x - AR.elbowF.x, AR.handF.y - AR.elbowF.y), PHx = AR.handF.x, PHy = AR.handF.y, SHx = AR.shoulderF.x, SHy = AR.shoulderF.y;
        DU.reach = hp; hp.k = kNeed; hp.ang = aim; GenVoidForms.rexVoidAnchors(ax, ay, h, DU, AR);
        const ho = { x: AR.handF.x, y: AR.handF.y }, e = clamp((q - TM.Q0) / (TM.pin - TM.Q0), 0, 1);
        let tx1 = mix(ho.x, PN.x, e), ty1 = mix(ho.y, PN.y, e);
        if (th && kq < 36) { const c = Math.cos(-th), sn = Math.sin(-th), vx = tx1 - PV.x, vy = ty1 - PV.y; tx1 = PV.x + vx * c - vy * sn; ty1 = PV.y + vx * sn + vy * c; }   // the body is drawn turned by th about PV: aim the unturned arm at the target turned back
        if (kq >= 35) {   // S6: from k35 he holds Obrokxus out in front of his chest (body frame, so no turn-back), sinking as the walk wears him down, pulled in to the chest as he folds
          const sk = 0.03 * h * clamp((kq - 56) / 38, 0, 1), fo = clamp((kq - 94) / 8, 0, 1);
          let hx = mix(SHx + dirf * (0.35 * Lu + 0.25 * Lf), CHx + dirf * 0.12 * h, fo), hy = mix(SHy + 0.75 * Lu - 0.8 * Lf, CHy + 0.06 * h, fo) + sk;   // held up close: upper arm hangs down and forward, forearm raised, fist in front of the shoulder (stays on screen as he walks to the east edge), pulled in to the chest at the fold
          if (kq === 35) { hx = mix(tx1, hx, 0.5); hy = mix(ty1, hy, 0.5); }
          tx1 = hx; ty1 = hy;
        }
        const lift = () => { ay = ay0 + (GenVoidForms.rexVoidPolys(DU).lift - lp) * sl; GenVoidForms.rexVoidAnchors(ax, ay, h, DU, AR); };   // the body lifts itself when the arm points below his stones: take that extra lift back off so the fist is solved where it will be drawn
        if (kq < 34 || kq === 34 && Math.hypot(tx1 - AR.shoulderF.x, ty1 - AR.shoulderF.y) >= Lu + Lf) {   // out of reach: the whole arm straight, stretched
          for (let it = 0; it < 6; it++) {
            lift();
            const vt = { x: tx1 - AR.shoulderF.x, y: ty1 - AR.shoulderF.y }, vh = { x: AR.handF.x - AR.shoulderF.x, y: AR.handF.y - AR.shoulderF.y };   // from the shoulder: the elbow anchor slides out with the reach, so measuring from it never settles (k ran away and the page froze)
            hp.ang += ad(ra(vt), ra(vh));
            hp.k = Math.max(1, hp.k * Math.hypot(vt.x, vt.y) / (Math.hypot(vh.x, vh.y) || 1));
            if (kq >= 34) hp.k = Math.min(3, hp.k);
          }
        } else {   // in reach: two bones, the elbow on the west/up side of the shoulder-to-fist line, a bent arm curled round him
          hp.k = 1; hp.up = hp.ang;
          for (let it = 0; it < 6; it++) {
            lift();
            const S = AR.shoulderF, lu = Math.hypot(AR.elbowF.x - S.x, AR.elbowF.y - S.y), lf = Math.hypot(AR.handF.x - AR.elbowF.x, AR.handF.y - AR.elbowF.y);
            let bx = tx1 - S.x, by = ty1 - S.y; const D0 = Math.hypot(bx, by) || 1; bx /= D0; by /= D0;
            const sg = kq >= 35 && bx < 0 ? -1 : 1;   // held: the elbow hangs below the shoulder-to-fist line (side n = (-by, bx) points down when bx >= 0)
            const D = clamp(D0, Math.abs(lu - lf) + 0.02 * h, lu + lf - 0.001), ca = clamp((lu * lu + D * D - lf * lf) / (2 * lu * D), -1, 1), sa = Math.sqrt(1 - ca * ca);
            const Ex = S.x + lu * (ca * bx - sg * sa * by), Ey = S.y + lu * (ca * by + sg * sa * bx);
            hp.up += ad(ra({ x: Ex - S.x, y: Ey - S.y }), ra({ x: AR.elbowF.x - S.x, y: AR.elbowF.y - S.y }));
            hp.ang += ad(ra({ x: tx1 - Ex, y: ty1 - Ey }), ra({ x: AR.handF.x - AR.elbowF.x, y: AR.handF.y - AR.elbowF.y }));
          }
        }
        lift();
      }
      if (!G.reduced && q >= TM.grab && q < TM.grab + 0.25) G.shake = Math.max(G.shake, 0.35);
    }
    GenVoidForms.rexVoidAnchors(ax, ay, h, DU, AR);
    if (q < TM.grab) {                                           // Obrokxus darts west on a low arc and leaves the screen; then the screen holds without him until the hand closes on him
      if (q < TM.flee) {
        const hd = heldAt(L, sc), u = q / TM.flee, dir = -1;
        FP.x = mix(hd.x - 0.5 * sc, -1.5 * sc, u); FP.y = mix(hd.y, 0.55 * H, u) - 0.08 * H * Math.sin(Math.PI * u) + 0.02 * H * Math.sin(Math.PI * u) * Math.sin(u * 15);
        spine(FP.x, FP.y, dir, sc);
        OB1.path = TP; OB1.face = dir; OB1.glow = glow0; OB1.rimK = RIM; OB1.gait = q;
        GenDuo.drawObrok1(ctx, 0, 0, sc, OB1);
      }
    } else {                                                     // caught, pulled to the chest, then under it: only his tail shows, lashing twice, then still; he travels with the chest
      const c = q >= TM.fall + 8 / 12 - 1e-6 ? 1 : 0, pk = Math.round(q * 12), la = q >= TM.fall && pk - 48 < 8 ? (pk - 48 === 2 || pk - 48 === 6 ? 1 : 0) : c ? 0 : q >= TM.pin ? (pk % 2 ? 1.5 : 0.5) : 0;   // the tail jerks up on each tightest squeeze; pinned under the fist it thrashes, high and low on alternate steps
      const ox = AR.grip.x, oy = AR.grip.y;   // dead: he stays pinned at PN through the press, then rides in the fist as it eases back to the hand (k56-58)
      if (pk >= 103) { for (let i = 0; i < 16; i++) { const t = i / 15; TP[i * 2] = ox + (1 - t) * 0.9 * sc; TP[i * 2 + 1] = oy + 0.09 * sc * Math.sin(Math.PI * t) * Math.sin(t * 6); } }   // inside the ball, still: drop's first spine
      else if (pk >= 35) {   // held up in the fist: head and front legs out of the top, the tail lashing below; a thrash every cell, bigger on the squeeze (k40), the walk's hard steps and the fold
        const cw = Math.cos(th), sw = Math.sin(th), gx = PV.x + (ox - PV.x) * cw - (oy - PV.y) * sw, gy = PV.y + (ox - PV.x) * sw + (oy - PV.y) * cw;   // the grip as drawn (Rex is turned by th about PV, Obrokxus is not)
        const TH = [0.25, -0.2, 0.35, -0.3], jk = pk === 40 || pk === 66 || pk === 96 ? 1.8 : 1, dm = pk >= 95 ? Math.max(0.3, 1 - (pk - 94) / 9) : 1;
        const a = th + dirf * (0.35 + TH[pk % 4] * jk * dm), len = 0.9 * sc, ux = Math.sin(a), uy = -Math.cos(a);   // the body axis, tail to head, leaning out over his knuckles
        for (let i = 0; i < 16; i++) { const t = i / 15, v = (t - 0.55) * len, w = 0.12 * len * Math.sin(Math.PI * t) * Math.sin(wig + t * 6) * dm, cu = (1 - t) * (1 - t) * 0.3 * len * TH[(pk + 1) % 4] * jk * dm * 3;
          TP[i * 2] = gx + ux * v - uy * (w + cu); TP[i * 2 + 1] = gy + uy * v + ux * (w + cu); }
      } else {
      spine(c ? ox : q >= TM.pin ? PN.x : AR.handF.x, c ? oy : q >= TM.pin ? PN.y : AR.handF.y, c ? -dirf : 1, 0.9 * sc);   // pinned under the fist from the grab until he lands, then under the chest; his body always trails west of the hand, clear of Rex's forearm, so he is seen
      for (let i = 0; i < 16; i++) { const t = i / 15; TP[i * 2 + 1] -= la * 0.35 * sc * (1 - t) * (1 - t); }   // the tail end (t = 0) lifts
      }
    }
    const fl = q < TM.catch ? glow0 : glow0 * (1 - 0.75 * clamp((q - TM.carry) / 1.2, 0, 1));   // the glow dims at the crush and stays dim
    rexAtCut(ctx, ax, ay, h, DU, ob ? sc : 0, dirf, fl, false, undefined, th ? (c2 => { c2.translate(PV.x, PV.y); c2.rotate(th); c2.translate(-PV.x, -PV.y); }) : undefined);
  }

  /* ---- where Obrokxus lands west of Rex and holds (burst's last part, and the duel's opening) ---- */
  const SE = { x: 0, y: 0 };
  const rexX = L => L.x - 0.05 * G.W + 0.2 * G.W + 0.17 * L.h;   // where burst's last frame stood Rex and where the duel opens him
  function heldAt(L, sc) {   // where Obrokxus holds, still, facing him: his middle x and spine y, on the floor west of the void Rex
    const W = G.W, cx = Math.max(0.5 * sc + 0.02 * W, rexX(L) - 0.55 * VK / VBODY * L.h - 0.03 * W - 0.5 * sc);
    SE.x = cx; SE.y = L.y - 0.05 * sc - 0.1 * G.H; return SE;
  }
  /* zoom and its focus for genesis.js, burst/shed (one timeline) and duel */
  function cam() {
    const s = G.secs("burst");
    if (s >= BS.barge && s <= BS.grab && !G.reduced) G.zoom = 1;   // the hard cut: the lagging zoom is exactly 1 from the barge on
    if (s < TL) return s <= BS.grab ? (s < CUT_AT || s >= BS.barge || G.reduced ? camAt(0) : emCam(s)) : tlCam(s);   // wide on the tear up to the grab, then the pull-back to the frame the void Rex needs
    const d = s - TL, c = camAt(s - SHED);
    if (d >= 1 || !(c.z1 > 1)) return c;
    const z = 1 + (tlCam(1e3).z - 1) * (1 - Math.floor(smooth(clamp(d, 0, 1)) * 12) / 12);   // the duel's opening: the void Rex is taller than the womb's, so no close frame; the zoom starts where shed's pull-back ended (pivot the frame's middle) and eases to 1 in the same steps
    return { z, z0: c.z0, z1: c.z1, fx: G.W / 2, fy: G.H / 2, gx: c.gx, gy: c.gy };
  }
  const EF = { x: 0, y: 0 };
  function emCam(s) {   // the emergence: push in on the tear from the cut's opening, follow Obrokxus (continuous clock) out and west, hold close for the change, pull back to 1x by BS.pull
    const c0 = camAt(0), g = wombG(), W = G.W, H = G.H;
    if (!(g.ry > 0 && W > 0 && H > 0)) return c0;
    const sc = OBS * Math.min(2 * g.ry, 0.86 * H), tx = tearX(g), M0 = tx + 0.05 * sc, M1 = 0.25 * W;
    const u = clamp((s - BS.slip) / (WEST - BS.slip), 0, 1);
    const WN = 0.17, NS = 8;   // the target is his place averaged over s +- WN (a function of s alone), so the clamp's knee never steps the camera's speed
    let ex = 0, ey = 0;
    for (let i = 0; i <= NS; i++) { const uu = clamp((s - WN + 2 * WN * i / NS - BS.slip) / (WEST - BS.slip), 0, 1); ex += mix(M0, M1, smooth(uu)); ey += g.cy - 0.12 * H * Math.sin(Math.PI * uu);
      const tt = s - WN + 2 * WN * i / NS, pf = fleeP(tt);   // he flees west from ob1: the focus follows, a little west of him (lead room)
      ex += pf * (PL.grabX * W - M1) - 0.03 * W * smooth(clamp((tt - BS.ob1) / 0.5, 0, 1)); ey += pf * (0.42 * H - g.cy);
    }
    EF.x = ex / (NS + 1); EF.y = ey / (NS + 1);   // the middle of his flight (u 0 before the slip)
    const zAt = t => t < BS.peek ? mix(1, 2.6, smooth(clamp((t - CUT_AT) / (BS.peek - CUT_AT), 0, 1)))
      : t < BS.ob0 ? mix(2.6, 3.0, smooth(clamp((t - BS.slip) / (BS.ob0 - BS.slip), 0, 1)))
      : 3.0;   // the zoom wanted on screen: held close until BS.hold (the finished red form is held close), then eased back to exactly 1 by pull
    const z = zAt(s), zd = z;
    G.zoom = z;   // genesis.js eases G.zoom towards the target at rate 3, which lags the pull-back by about a second: the emergence sets it, so the frame is the one described here
    if (!(z > 1.0001)) return { z, z0: c0.z0, z1: c0.z1, fx: W / 2, fy: H / 2, gx: c0.gx, gy: c0.gy };
    /* the world point at the frame's centre: his, easing to the frame's middle as the zoom eases to 1; clamped so the visible world stays in the frame (the centre, not the pivot) */
    const ze = zAt(Math.min(s, BS.hold)), kb = 1;   // the pull-back eases the centre home in time, not through the zoom: the centre at the hold times kb
    const a = smooth(clamp((s - CUT_AT) / 0.6, 0, 1)), mx = 0.5 * W * (1 - 1 / ze), my = 0.5 * H * (1 - 1 / ze);
    const soft = (v, lim) => { const k = 80, b = Math.max(0, lim - k), m = Math.abs(v); return m <= b ? v : Math.sign(v) * (b + (lim - b) * (1 - Math.exp(-(m - b) / Math.max(1, lim - b)))); };   // a knee of 80 px before the limit: same slope where it starts, never past the limit
    const dx = kb * soft(a * (EF.x - W / 2), mx), dy = kb * soft(a * (EF.y - H / 2), my);
    const px = W / 2 + zd * dx / (zd - 1), py = H / 2 + zd * dy / (zd - 1);   // the pivot that puts that point in the middle (inside the frame: |d| <= W/2 (1 - 1/Z))
    const f = Math.max(0.001, clamp((zd - c0.z0) / Math.max(0.001, c0.z1 - c0.z0), 0, 1));
    return { z, z0: c0.z0, z1: c0.z1, fx: W / 2 + (px - W / 2) / f, fy: H / 2 + (py - H / 2) / f, gx: c0.gx, gy: c0.gy };
  }
  let VTOP = null;
  function tlCam(s) {   // after the grab: the zoom eases by set to the one that keeps the void Rex's top 0.04 H inside the frame (never below 1), the pivot from the tear to the frame's middle, then holds
    const g = wombG(), W = G.W, H = G.H, c0 = camAt(BURST);
    if (!(g.ry > 0 && W > 0 && H > 0)) return c0;
    if (!VTOP) VTOP = Math.max.apply(null, GenVoidForms.rexVoidPolys({ pose: "clutch", face: -1, raise: 1 }).polys.map(l => Math.max.apply(null, l[1].map(p => p[1]))));
    const L = landing(g), yt = L.y - VTOP * L.h * VK / VBODY / 1000, dy = H / 2 - yt;
    const zs = clamp(dy > 0 ? 0.46 * H / dy : c0.z, 1, c0.z);
    const u = G.reduced ? 1 : smooth(clamp((s - BS.grab) / (BS.set - BS.grab), 0, 1)), z = mix(1, zs, u), f = clamp((z - c0.z0) / Math.max(0.001, c0.z1 - c0.z0), 0, 1);
    const px = mix(tearX(g), W / 2, u), py = mix(g.cy, H / 2, u), fo = Math.max(f, 0.001);
    return { z, z0: c0.z0, z1: c0.z1, fx: W / 2 + (px - W / 2) / fo, fy: H / 2 + (py - H / 2) / fo, gx: c0.gx, gy: c0.gy };
  }
  function camAt(s) {
    const g = wombG(), W = G.W, H = G.H;
    if (!(g.ry > 0 && W > 0 && H > 0)) return { z: s >= BURST + DUEL ? 1.25 : 1, z0: 1, z1: 1, fx: W / 2, fy: H / 2 };   // a seek straight to drop must not start at 1 and push in to the duel's 1.25; before the first resize a NaN here would stick in G.zoom for good
    const L = landing(g), h = L.h, gr = { x: (L.gx + L.cx) / 2, y: (L.gy + L.cy) / 2 };   // the camera closes between the landed fist and his chest
    /* the wide view is the 1x frame; the push-in to the fist is done 0.3 s before the beat ends */
    const z0 = 1, z1 = clamp(1.7 * H / h, 1, 1.8);   // 1.8 keeps the fist and the chest both in the close frame
    const hs = t => Math.floor(smooth(clamp(t, 0, 1)) * 12) / 12;
    const wide = mix(z1, 1, 0.3);   // the recoil's push-in stops here
    let k = 0, zg = 0;   // the 1x frame before the duel (burst and shed pull back in tlCam)
    const d = s - BURST;
    if (s >= BURST) { k = d < 1 ? ((wide - 1) / (z1 - 1)) * (1 - hs(d)) : 0; zg = d >= TM.gate0 ? 0.25 * hs((d - TM.gate0) / (DUEL - TM.gate0)) : 0; }   // the duel: close, the pull-back to the wide shot, wide to the slam, then in on the gate (at most 1.5)
    if (s >= BURST + DUEL) { k = 0; zg = 0.25 * Math.min(11 / 12, 1 - hs((s - BURST - DUEL - DD.dieA) / (DD.camB - DD.dieA))); }   // drop: starts where the duel ends (its last held step, 11/12 of the 0.25 push, 1.229, about the gate) and pulls back to 1 as he dies
    /* the close view: the pivot that puts the fist in the middle of the frame at z1 (fx, fy are that pivot) */
    /* a pivot outside the frame pulls the view past the painted scene: clamp it, the fist then sits off-centre */
    const px = clamp((0.5 * W - z1 * gr.x) / (1 - z1), 0, W), py = clamp((0.5 * H - z1 * gr.y) / (1 - z1), 0, H);
    let fx = px, fy = py;
    if (s < BURST && z1 > 1.001) {   // the peek and the pull-back pivot on the tear (genesis.js blends the pivot as W/2 + f (fx - W/2), f from the eased zoom)
      const fz = clamp(((G.zoom || 1) - z0) / (z1 - z0), 0, 1);
      if (fz > 0.05) { fx = 0.5 * W + (tearX(g) - 0.5 * W) / fz; fy = 0.5 * H + (g.cy - 0.5 * H) / fz; }
    }
    const zz = mix(z0, z1, k) + zg;
    if (s >= BURST && d >= TM.gate0 && zz > 1) {   // the push-in on the gate pivots on the east edge at the hole's height (genesis.js blends the pivot as W/2 + f (fx - W/2), f = (z - z0) / (z1 - z0)), so the body keeps its east cut and only grows west
      const zd = G.zoom > 1 ? G.zoom : zz;   // in the gate push-in and the drop genesis.js's blend uses the eased G.zoom, which lags the target: take f from it (in both, so the cut between them does not move the pivot), or the pivot slips east of W and the ground leaves a gap at the east edge
      const f = clamp((zd - z0) / Math.max(0.001, z1 - z0), 0, 1);
      if (f > 0) { fx = 0.5 * W + 0.5 * W / f; fy = 0.5 * H + (g.cy - 0.5 * H) / f; }
    }
    return { z: zz, z0, z1, fx, fy, gx: L.gx, gy: L.gy };
  }

  function draw(ctx) {
    const s = G.secs("burst"), W = G.W, H = G.H, red = G.reduced;
    if (s <= 0) return;
    if (s >= TL + DUEL) { drop(ctx, s - TL - DUEL); return; }   // drop, then the land and after: he stays in the hole
    if (s < TL) { burst(ctx, s); return; }   // burst and shed: one timeline
    duel(ctx, s - TL);
  }

  return { draw, cam, cutPath, cutGeom };
})();
