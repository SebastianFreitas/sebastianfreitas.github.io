/* genesis-rexout.js — Rex Immotus and Obrokxus come out of the womb already
   locked (beat `burst`), then fight in the open (beat `duel`); Rex dies sagging onto the womb, Obrokxus caged in his fist,
   and melts into it while the womb sinks (beat `drop`); the land then covers him (start of `land`). Drawn in the
   held outside view, in front of the womb and the old ones. Positions are
   fractions of the frame, like the old ones' march in genesis-oldones.js.
   Everything steps in held beats; reduced motion: settled poses, no shake. */
window.GenRexOut = (function () {
  const G = window.Gen;
  const { clamp, mix } = Util;
  const smooth = t => t * t * (3 - 2 * t);

  const BURST = 9, DUEL = 9, DROP = 6, LAND = 3;
  const DD = { cold: 0.6, sag: 1.6, melt: 3.5 };   // drop seconds: the fist locks and he goes cold, he sags onto the womb, the melt begins

  /* drop: Rex dies standing at the tear, sags onto the womb's flank, melts into it while the womb sinks;
     then (d past DROP) the land covers him: he sinks into the ground and is gone. d counts from the end of the duel */
  function drop(ctx, d) {
    const H = G.H, red = G.reduced, g = wombG(), gs = GenFlesh.fleshGeom(0), tx = gs.cx - 0.75 * gs.rx;
    const fin = stand(g), h = fin.h;
    const step = (t, a, b, n) => Math.floor(smooth(clamp((t - a) / (b - a), 0, 1)) * n) / n;
    const mk = red ? 1 : step(d, DD.melt, DROP, 6);
    G.wombSink = mk;
    const x = fin.x - 0.03 * h, y = fin.y;
    const sunk = red || d < DROP ? 0 : step(d, DROP, DROP + LAND, 10);
    const tu = red ? 0 : 1 - step(d, 0, 5.5, 12);
    if (tu > 0) bigTear(ctx, gs, tx, tu, 0);
    const dead = red || d >= DD.sag;
    DP.pose = dead ? "dead" : "slap";
    DP.fist = 1; DP.raise = 0;
    DP.cool = red ? 1 : 0.4 + 0.6 * step(d, DD.cold, DD.sag + 1.2, 8);   // from the duel's last 0.4 to cold
    DP.melt = 0.6 * mk;
    if (!red && d >= DD.sag && d < DD.sag + 0.25) G.shake = Math.max(G.shake, 0.5);   // he hits the womb
    ctx.save();
    if (sunk > 0) { ctx.beginPath(); ctx.rect(0, 0, G.W, fin.y); ctx.clip(); }
    const base = 0.56 * DP.melt * h;                       // the melt line is cut at 0.56 melt (h units) above his feet: he comes down by that much, so it stays on the ground line
    const yy = y + base + sunk * (1.05 * h - base);        // the land ends where it always did
    if (mk > 0) {                                          // the melted stone pooled at his base, wider than him, with a rim the womb does not have
      const pw = (0.24 + 0.2 * mk) * h, ph = (0.025 + 0.03 * mk) * h;
      ctx.beginPath(); ctx.ellipse(x + 0.05 * h, y, pw, ph, 0, 0, 6.2832);
      ctx.fillStyle = "#3a0a0e"; ctx.fill();
      ctx.lineWidth = 0.008 * h; ctx.strokeStyle = "#a4272d"; ctx.stroke();
    }
    const glow = red ? 0.2 : clamp(1 - 0.8 * ((G.zoom || 1) - 1) / Math.max(0.001, cam().z1 - 1), 0.2, 1);
    GenDuo.rexAnchors(x, yy, h, DP, ANC);   // after cam(), which fills the same ANC with the burst pose
    DP.warm = glow; DP.warmX = ANC.grip.x; DP.warmY = ANC.grip.y;
    GenDuo.drawRex(ctx, x, yy, h, DP);
    GenDuo.drawObrok1(ctx, ANC.grip.x, ANC.grip.y, OBS * h, { pose: "held", hang: 1, face: -1, glow, t: red ? 0 : G.t });
    GenDuo.drawRexFingers(ctx, x, yy, h, DP);
    ctx.restore();
    DP.melt = 0;
  }

  /* ---- burst: calm womb, the fist, the giant tear, Rex hauls out, the zoom in ---- */
  const BS = { fist: 1.5, haul: 5.7, out: 7.2, zoom: 7.5 };
  /* the rip, in held steps: [from s, tear length (0..1 of the womb's height), fist y (fraction of ry from the middle)] */
  const RIP = [[1.5, 0.12, 0], [2.4, 0.4, 0.32], [3.2, 0.62, 0.5], [4.0, 0.82, -0.2], [4.8, 0.95, -0.7], [5.4, 1, -0.85]];
  const GP = { pose: "grip", fist: 1, face: -1 };
  const ANC = {};
  const OBS = 0.24;   // Obrokxus's length in Rex's heights, the same in every shot of the fight (about 2.5 fist widths)

  function wombG() {   // the womb as drawFlesh gets it in burst, never sunk: Rex's place does not move while the womb sinks in drop
    const k = G.wombSink; G.wombSink = 0;
    const g = GenFlesh.fleshGeom(0);
    G.wombSink = k;
    return g;
  }
  function stand(g) {   // Rex out, feet just under the top edge of the foreground ground (the sea bed's line) so it overlaps his soles, as tall as the womb (within the frame); west of the womb's west face, facing west, a strip of open dark between his back and the womb
    const h = Math.min(2 * g.ry, 0.86 * G.H), x = g.cx - g.rx - 0.3 * h;
    const ln = window.GenElem && G.W > 0 && G.H > 0 ? GenElem.seaLine(G.W, G.H) : null;
    const gy = ln ? ln[Math.max(0, Math.min(120, Math.round(120 * x / G.W)))] : 0;
    return { x, y: gy > 0 ? gy + 0.006 * G.H : g.cy + g.ry, h };
  }

  function bigTear(ctx, g, tx, u, jolt) {
    const H = G.H, L = u * 0.88 * 2 * g.ry, Wd = 0.06 * L + 0.01 * H;
    const j = jolt * 0.008 * H;
    const left = [], right = [];
    for (let k = 0; k <= 8; k++) {
      const w = Wd * Math.sin(Math.PI * k / 8) * (k % 2 ? 0.7 : 1);
      const y = g.cy - L / 2 + L * k / 8, dx = (k % 3 - 1) * 0.03 * L;
      left.push([tx - w + dx + j, y]); right.push([tx + w * 0.9 + dx - j, y]);
    }
    const pts = left.concat(right.reverse());
    ctx.save();
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.closePath();
    ctx.lineWidth = 0.012 * H; ctx.lineJoin = "round";
    ctx.strokeStyle = "#a8402c"; ctx.stroke();
    ctx.fillStyle = "#150204"; ctx.fill();
    ctx.restore();
  }

  /* Rex, with Obrokxus coiled in the near fist (glowing); the fingers go over him */
  function body(ctx, x, y, h, glow, raise) {
    GP.raise = raise;
    const gr = GenDuo.rexAnchors(x, y, h, GP, ANC).grip;
    GP.warm = glow; GP.warmX = gr.x; GP.warmY = gr.y;
    GenDuo.drawRex(ctx, x, y, h, GP);
    GenDuo.drawObrok1(ctx, gr.x, gr.y, OBS * h, { pose: "held", face: GP.face, glow, t: G.reduced ? 0 : G.t });
    GenDuo.drawRexFingers(ctx, x, y, h, GP);
  }

  function burst(ctx, s) {
    const H = G.H, red = G.reduced, g = wombG(), tx = g.cx - 0.75 * g.rx;
    const fin = stand(g), h = fin.h;
    const kz = red ? 0 : Math.floor(smooth(clamp((s - BS.zoom) / (BURST - 0.3 - BS.zoom), 0, 1)) * 12) / 12;
    const glow = red ? 0.2 : mix(1, 0.2, kz);
    const jolt = t => (!red && s - t < 0.25) ? ((Math.floor(s * 12) % 2) * 2 - 1) : 0;
    if (red) { bigTear(ctx, g, tx, 1, 0); body(ctx, fin.x, fin.y, h, glow, 0); return; }
    if (s < BS.fist) return;                       // still and quiet: only the womb
    let k = 0;
    for (let i = 0; i < RIP.length; i++) if (s >= RIP[i][0]) k = i;
    const r = RIP[k];
    bigTear(ctx, g, tx, r[1], jolt(r[0]));
    if (s - r[0] < 0.25) G.shake = Math.max(G.shake, 0.4);
    ctx.save();
    if (s < BS.haul) {
      /* only the fist and forearm are out: the body stays behind the tear */
      ctx.beginPath(); ctx.rect(0, 0, tx + 0.01 * H, H); ctx.clip();
      const gx = tx - 0.2 * H, gy = g.cy + r[2] * 0.55 * g.ry;   // the fist breaks out through the west face, inside the frame
      GP.raise = 1;
      GenDuo.rexAnchors(0, 0, h, GP, ANC);
      body(ctx, gx - ANC.grip.x, gy - ANC.grip.y, h, 1, 1);
    } else {
      /* he hauls himself through in three steps; what has not passed the tear stays hidden */
      const q = s < BS.haul + 0.5 ? 0.2 : s < BS.haul + 1.0 ? 0.55 : 1;
      if (s - BS.haul < 1.0 && (s - BS.haul) % 0.5 < 0.25) G.shake = Math.max(G.shake, 0.4);
      if (q < 1) { ctx.beginPath(); ctx.rect(0, 0, tx + 0.01 * H, H); ctx.clip(); }
      body(ctx, mix(tx + 0.25 * h, fin.x, q), fin.y, h, glow, q < 0.5 ? 1 : q < 1 ? 0.5 : 0);   // the arm comes down in the same steps
    }
    ctx.restore();
  }

  /* ---- duel: Obrokxus climbs Rex along his surface, Rex swats and cannot crush him ---- */
  const PULL = [4.4, 6.0];                       // the pull-back to the wide shot, in duel seconds
  const EV = [0.8, 2.6, 3.9, 6.9, 7.6];          // the jolts: slips out, slap late, strike, slap misses, the catch
  const RUNS = [[0.8, 1.3, 0, 1.5], [2.0, 2.5, 1.5, 3], [6.1, 6.7, 3, 5.8]];   // [from d, to d, from q, to q]: q is a node of the route
  const RN = ["grip", "wristF", "elbowF", "shoulderF", "collar", "chest", "waist"];
  const DP = { pose: "grip", fist: 1, face: -1, raise: 0, cool: 0 };
  const RT = RN.map(() => ({ x: 0, y: 0 })), CL = new Float64Array(RN.length), TP = [];
  for (let i = 0; i < 16; i++) TP.push(0, 0);

  function qOf(d) {
    let q = 0;
    for (const r of RUNS) if (d >= r[0]) q = mix(r[2], r[3], smooth(clamp((d - r[0]) / (r[1] - r[0]), 0, 1)));
    return q;
  }
  function atQ(q, out) {
    const i = Math.min(RT.length - 2, Math.floor(q)), f = q - i;
    out.x = mix(RT[i].x, RT[i + 1].x, f); out.y = mix(RT[i].y, RT[i + 1].y, f);
  }
  function atLen(len, out) {
    let i = 0;
    while (i < RT.length - 2 && len > CL[i + 1]) i++;
    const f = clamp((len - CL[i]) / Math.max(1e-6, CL[i + 1] - CL[i]), 0, 1);
    out.x = mix(RT[i].x, RT[i + 1].x, f); out.y = mix(RT[i].y, RT[i + 1].y, f);
  }
  const PT = { x: 0, y: 0 };
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

  function duel(ctx, d) {
    const H = G.H, red = G.reduced, g = wombG(), tx = g.cx - 0.75 * g.rx;
    const fin = stand(g), h = fin.h, z1 = cam().z1;
    const glow = red ? 0.2 : clamp(1 - 0.8 * ((G.zoom || 1) - 1) / Math.max(0.001, z1 - 1), 0.2, 1);   // near 1 wide, about 0.2 close
    bigTear(ctx, g, tx, 1, 0);
    if (!red) for (const t of EV) if (d >= t && d - t < 0.25) G.shake = Math.max(G.shake, 0.35);   // each exchange lands with a jolt
    const late = red ? 3 : (d >= EV[3] ? 1 : 0) + (d >= EV[1] ? 1 : 0) + (d >= EV[4] ? 1 : 0);      // Rex steps heavily
    const x = fin.x - (red ? 0.03 : late * 0.01) * h, y = fin.y;
    DP.pose = red || d >= EV[3] ? "slap" : "grip";
    DP.fist = red || d >= EV[4] ? 1 : d < EV[0] ? 1 : 0;
    DP.cool = red ? 0.4 : d >= EV[4] ? 0.4 : d >= 6.6 ? 0.25 : d >= EV[2] ? 0.125 : 0;
    GenDuo.rexAnchors(x, y, h, DP, ANC);
    DP.warm = DP.fist > 0 && (red || d >= EV[4] || d < EV[0]) ? glow : 0; DP.warmX = ANC.grip.x; DP.warmY = ANC.grip.y;
    GenDuo.drawRex(ctx, x, y, h, DP);
    for (let i = 0; i < RN.length; i++) { RT[i].x = ANC[RN[i]].x; RT[i].y = ANC[RN[i]].y; }
    RT[3].x = mix(ANC.shoulderF.x, ANC.elbowF.x, 0.45); RT[3].y = mix(ANC.shoulderF.y, ANC.elbowF.y, 0.45);   // the shoulder stop sits on the upper arm, well off the neck stub
    RT[4].x = mix(RT[3].x, ANC.chest.x, 0.5); RT[4].y = mix(RT[3].y, ANC.chest.y, 0.5) + 0.03 * h;         // the crawl runs across the upper chest, not over the collar
    for (let i = 1; i < RN.length; i++) CL[i] = CL[i - 1] + Math.hypot(RT[i].x - RT[i - 1].x, RT[i].y - RT[i - 1].y);
    const sc = OBS * h, tk = red ? 0 : G.t;
    if (DP.fist >= 1 && (red || d >= EV[4])) {                     // caught against the chest, the fist closed round him
      GenDuo.drawObrok1(ctx, ANC.grip.x, ANC.grip.y, sc, { pose: "held", face: -1, glow, t: tk });
    } else if (d < EV[0]) {                                        // still in the near fist
      GenDuo.drawObrok1(ctx, ANC.grip.x, ANC.grip.y, sc, { pose: "held", face: -1, glow, t: tk });
    } else {
      const q = qOf(d);
      atQ(q, PT);
      if (d >= 2.3 && d < 3.0) {                                   // Rex's other hand slaps the forearm a beat late: half way, then the blow
        const hit = d >= EV[1], mx = (ANC.elbowF.x + ANC.wristF.x) / 2, my = (ANC.elbowF.y + ANC.wristF.y) / 2;
        const f = hit ? 1 : 0.5, ex = mix(ANC.shoulderB.x, mx, f), ey = mix(ANC.shoulderB.y, my, f) - (hit ? 0 : 0.05 * h);
        ctx.save(); ctx.lineCap = "round";
        ctx.strokeStyle = "#b4461e"; ctx.lineWidth = 0.07 * h;
        ctx.beginPath(); ctx.moveTo(ANC.shoulderB.x, ANC.shoulderB.y); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.fillStyle = "#f58a34"; ctx.beginPath(); ctx.arc(ex, ey, 0.05 * h, 0, 6.2832); ctx.fill();
        ctx.restore();
      }
      if (q >= 3 && d >= 3.2 && d < 3.9 || q >= 3 && d >= 4.3 && d < RUNS[2][0]) {   // coiled at the shoulder
        GenDuo.drawObrok1(ctx, PT.x, PT.y, sc, { pose: "coil", face: -1, glow });
      } else if (d >= 3.9 && d < 4.3) {                            // he strikes up at the broken top course
        for (let i = 0; i < 16; i++) { const t = i / 15; TP[i * 2] = PT.x - 0.12 * h * t - 0.06 * h * Math.sin(Math.PI * t); TP[i * 2 + 1] = PT.y - 0.216 * h * t; }
        GenDuo.drawObrok1(ctx, 0, 0, sc, { path: TP, face: -1, glow });
      } else {                                                     // a run along the surface: the body trails along the route
        const lh = mix(CL[Math.floor(q)], CL[Math.min(RN.length - 1, Math.floor(q) + 1)], q - Math.floor(q));
        for (let i = 0; i < 16; i++) { atLen(Math.max(0, lh - sc * (15 - i) / 15), PT); TP[i * 2] = PT.x; TP[i * 2 + 1] = PT.y; }
        GenDuo.drawObrok1(ctx, 0, 0, sc, { path: TP, face: -1, glow });
      }
      if (!red) {
        atQ(3, PT); stones(ctx, PT.x, PT.y, h, d, EV[2]);
        stones(ctx, ANC.chest.x, ANC.chest.y, h, d, EV[3]);
      }
    }
    if (DP.fist > 0) GenDuo.drawRexFingers(ctx, x, y, h, DP);
  }

  /* zoom and its focus (the fist, once it is out and Rex stands) for genesis.js, burst and duel */
  function cam() {
    const g = wombG(), W = G.W, H = G.H, s = G.secs("burst");
    if (!(g.ry > 0 && W > 0 && H > 0)) return { z: 1, z0: 1, z1: 1, fx: W / 2, fy: H / 2 };   // before the first resize a NaN here would stick in G.zoom for good
    const fin = stand(g), h = fin.h;
    GP.raise = 0;
    const gr = GenDuo.rexAnchors(fin.x, fin.y, h, GP, ANC).grip;
    /* the wide view is the 1x frame; the push-in to the fist is done 0.3 s before the beat ends */
    const z0 = 1, z1 = clamp(1.7 * H / h, 1, 2.2);
    let k = Math.floor(smooth(clamp((s - BS.zoom) / (BURST - 0.3 - BS.zoom), 0, 1)) * 12) / 12;
    if (s >= BURST) k = (s - BURST >= PULL[0] && s - BURST < PULL[1]) ? 0 : 1;   // the duel: close, one pull-back to the wide shot, close again (the camera eases to it)
    if (s >= BURST + DUEL) k = 1 - Math.floor(smooth(clamp((s - BURST - DUEL - DD.cold) / (DD.melt - DD.cold), 0, 1)) * 12) / 12;   // drop: starts where the duel ends, pulls back to the wide shot as he goes cold and sags
    /* the close view: the pivot that puts the fist in the middle of the frame at z1 (fx, fy are that pivot) */
    /* a pivot outside the frame pulls the view past the painted scene: clamp it, the fist then sits off-centre */
    const px = clamp((0.5 * W - z1 * gr.x) / (1 - z1), 0, W), py = clamp((0.45 * H - z1 * gr.y) / (1 - z1), 0, H);
    return { z: mix(z0, z1, k), z0, z1, fx: px, fy: py, gx: gr.x, gy: gr.y };
  }

  function draw(ctx) {
    const s = G.secs("burst"), W = G.W, H = G.H, red = G.reduced;
    if (s <= 0) { G.wombSink = 0; return; }
    if (s >= BURST + DUEL + DROP + LAND) { G.wombSink = 1; return; }   // the womb stays low after the land
    if (s >= BURST + DUEL) { drop(ctx, s - BURST - DUEL); return; }   // drop, then the land covering him
    if (s < BURST) { burst(ctx, s); return; }
    duel(ctx, s - BURST);
  }

  return { draw, cam };
})();
