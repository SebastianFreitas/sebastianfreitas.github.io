/* genesis-rexout.js — Rex Immotus and Obrokxus come out of the womb already
   locked (beat `burst`), then fight in the open (beat `duel`); Rex dies wrapped round Obrokxus and the bundle falls
   to the ground (beat `drop`) and sinks into the land as it grows (start of `land`). Drawn in the
   held outside view, in front of the womb and the old ones. Positions are
   fractions of the frame, like the old ones' march in genesis-oldones.js.
   Everything steps in held beats; reduced motion: settled poses, no shake. */
window.GenRexOut = (function () {
  const G = window.Gen;
  const { clamp, mix } = Util;
  const smooth = t => t * t * (3 - 2 * t);

  const TEAR = { x: 0.83, y: 0.47 };   // the womb's torn flank
  const END = { x: 0.555, y: 0.37 };   // where the pair lands, and fights
  const HS = 0.38;                     // figure height, fraction of H
  const REST = { x: 0.58, y: 0.86 };   // where the bundle comes to rest
  const BURST = 5, DUEL = 7, DROP = 6;

  /* the duel's exchanges, in held steps: [from d (s), rex, obr, ...]; offsets in figure heights */
  const STEPS = [
    { t: 0,   rp: "grapple", op: "stand", rx: 0,    ry: 0,    ox: 0,     oy: 0,    tilt: 0,     cool: 0 },      // locked
    { t: 1.5, rp: "stand",   op: "lunge", rx: 0.16, ry: 0,    ox: -0.22,  oy: -0.04, tilt: -0.20, cool: 0.1 },   // he breaks free and strikes
    { t: 2.9, rp: "stand",   op: "lunge", rx: 0.22, ry: 0.07, ox: -0.06,  oy: 0,    tilt: -0.40, cool: 0.3 },   // Rex is wounded
    { t: 4.3, rp: "lunge",   op: "stand", rx: -0.05, ry: 0.03, ox: -0.20, oy: 0.02, tilt: 0,     cool: 0.45 },  // Rex lunges back
    { t: 5.6, rp: "grapple", op: "stand", rx: 0.02, ry: 0.04, ox: -0.03,  oy: 0,    tilt: 0,     cool: 0.6 },   // he catches him again
  ];

  function tear(ctx, u, jolt) {
    const W = G.W, H = G.H, cx = TEAR.x * W, cy = TEAR.y * H;
    const L = 0.24 * H * u, Wd = 0.05 * H * u;
    const j = jolt * 0.008 * H;
    const left = [], right = [];
    for (let k = 0; k <= 6; k++) {
      const w = Wd * Math.sin(Math.PI * k / 6) * (k % 2 ? 0.7 : 1);
      const y = cy - L / 2 + L * k / 6, dx = (k % 3 - 1) * 0.012 * H * u;
      left.push([cx - w + dx + j, y]); right.push([cx + w * 0.9 + dx - j, y]);
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

  function pair(ctx, px, py, st, scale, ph) {
    const H = G.H, h = HS * H * scale;
    const ft = py + 0.22 * H * scale;
    const rexX = px + (0.22 + st.rx) * h, obrX = px + (-0.22 + st.ox) * h;
    const rexY = ft + st.ry * h, obrY = ft + 0.02 * H * scale + st.oy * h;
    const obrC = { x: obrX, y: obrY - 0.42 * h }, rexC = { x: rexX, y: rexY - 0.62 * h };
    const T = GenFig.drawTitan;
    T(ctx, obrX, obrY, h, "obrokxus", { face: 1, ph: 1.3, pose: st.op, reach: rexC, look: rexC });
    T(ctx, rexX, rexY, h, "rex", { face: -1, pose: st.rp, reach: obrC, reachAmt: 1, tilt: st.tilt, cool: st.cool });
  }

  /* the bundle: Rex dead, wrapped round Obrokxus. (cx, cy) is Obrokxus's centre */
  function bundle(ctx, cx, cy, fold, cool) {
    const h = HS * G.H, ft = cy + 0.42 * h;
    GenFig.drawTitan(ctx, cx, ft, h, "obrokxus", { face: 1, ph: 1.3, pose: "stand" });
    GenFig.drawTitan(ctx, cx, ft, h, "rex", { face: 1, pose: "wrapped", fold, cool });
  }

  function drop(ctx, d) {
    const W = G.W, H = G.H, red = G.reduced;
    const h = HS * H;
    const x0 = END.x * W - 0.25 * h, y0 = END.y * H + 0.22 * H + 0.02 * H - 0.42 * h;   // Obrokxus's centre at the end of the duel
    const x1 = REST.x * W, y1 = REST.y * H;
    const fold = red ? 1 : Math.floor(smooth(clamp(d / 1.8, 0, 1)) * 8) / 8;           // limbs close in held steps
    const cool = red ? 1 : clamp((d - 1.2) / 1.2, 0, 1);                               // he goes still, then cold
    const fl = red ? 1 : clamp((d - 2.2) / 3.4, 0, 1);
    const t = red ? 1 : Math.floor(fl * fl * 30) / 30;                                 // slow at first
    tear(ctx, red ? 0 : 1 - Math.floor(smooth(clamp(d / 5.5, 0, 1)) * 12) / 12, 0);
    bundle(ctx, mix(x0, x1, t), mix(y0, y1, t), fold, cool);
    if (!red && fl >= 1 && d < 5.9) G.shake = Math.max(G.shake, 0.5);   // it hits the ground
  }

  function draw(ctx) {
    const s = G.secs("burst"), W = G.W, H = G.H, red = G.reduced;
    if (s <= 0 || s >= BURST + DUEL + DROP + 3) return;
    if (s >= BURST + DUEL + DROP) {
      /* the land grows from the body: it sinks under it and is gone */
      const q = (s - BURST - DUEL - DROP) / 3;
      const sink = red ? 0 : Math.floor(smooth(clamp(q, 0, 1)) * 10) / 10;
      bundle(ctx, G.sx(G.ROOT_U - 0.42), REST.y * H + sink * 0.3 * H, 1, 1);
      return;
    }
    if (s >= BURST + DUEL) { drop(ctx, s - BURST - DUEL); return; }
    const bs = clamp(s / BURST, 0, 1);
    const open = red ? 1 : s < 0.3 ? 0.35 : s < 0.6 ? 0.7 : 1;   // held steps
    const jolt = red ? 0 : s < 1.2 ? 1 : 0;
    tear(ctx, open, jolt * ((Math.floor(s * 12) % 2) * 2 - 1));
    if (!red && s < 1.2) G.shake = Math.max(G.shake, 0.4);

    if (s < BURST) {
      /* tumble out and left along a rising arc, in held steps, turning once */
      const u = red ? 1 : Math.floor(smooth(bs) * 20) / 20;
      const px = mix(TEAR.x, END.x, u) * W;
      const py = mix(TEAR.y, END.y, u) * H;
      const scale = red ? 1 : mix(0.3, 1, Math.min(1, u * 3));
      const ang = red ? 0 : -u * Math.PI * 2 * (u < 1 ? 1 : 0);
      ctx.save();
      ctx.translate(px, py); ctx.rotate(ang); ctx.translate(-px, -py);
      pair(ctx, px, py, STEPS[0], scale, 0);
      ctx.restore();
      return;
    }
    const d = s - BURST;
    let k = 0;
    for (let i = 0; i < STEPS.length; i++) if (d >= STEPS[i].t) k = i;
    const st = STEPS[k];
    if (!red && k > 0 && d - st.t < 0.25) G.shake = Math.max(G.shake, 0.35);   // each exchange lands with a jolt
    const jx = red ? 0 : ((Math.floor(d * 8) % 2) * 2 - 1) * 0.004 * W;       // the held struggle
    pair(ctx, END.x * W + jx, END.y * H, st, 1, 0);
  }

  return { draw };
})();
