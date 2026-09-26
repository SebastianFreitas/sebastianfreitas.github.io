/* genesis-remake.js — the remake beat: the old ones tong a soul from the
   ring, snap its threads, and lay the kept core on a pewter counter, built
   card by card. Later: the lives beat, redone souls returned to the ring. */
window.GenRemake = (function () {
  const G = window.Gen;

  const REMAKE_DUR = 7.5, LIVES_DUR = 9.0, STEP = 0.35;
  const GOLD = "245,208,107";
  const PEWTER = "#8a8f94", PEWTER_D = "#5d6166";
  const COUNTER = "#3a2a22", CLOTH = "#c9b98f";
  const THREAD = (a) => `rgba(245,230,190,${a})`;

  let hasBeatsCache = null;
  function hasBeats() {
    if (hasBeatsCache === null) {
      hasBeatsCache = G.BEATS.some((b) => b.id === "remake") && G.BEATS.some((b) => b.id === "lives");
    }
    return hasBeatsCache;
  }

  function soulMul() {
    if (!hasBeats()) return 1;
    const r = G.secs("remake");
    if (r >= 0 && r < REMAKE_DUR) {
      const step = Math.min(3, Math.floor(r / STEP + 1)) / 3;
      return 1 - 0.65 * step;
    }
    const l = G.secs("lives");
    if (l >= 0 && l < LIVES_DUR) {
      if (l < LIVES_DUR - 1.2) return 0.35;
      const step = Math.min(3, Math.floor((l - (LIVES_DUR - 1.2)) / (1.2 / 3)) + 1) / 3;
      return 0.35 + 0.65 * step;
    }
    return 1;
  }

  function draw(ctx, W, H) {
    if (!hasBeats()) return;
    const GenFlesh = window.GenFlesh;
    if (!GenFlesh || !GenFlesh.fleshGeom || !GenFlesh.fleshPath) return;

    const r = G.secs("remake"), l = G.secs("lives");
    if (!(r >= 0 && r < REMAKE_DUR) && !(l >= 0 && l < LIVES_DUR)) return;

    const g = GenFlesh.fleshGeom(1);
    const { cx, cy, rx, ry } = g;

    ctx.save();
    GenFlesh.fleshPath(ctx, cx, cy, rx, ry, 0.4, 0);
    ctx.clip();

    if (r >= 0 && r < REMAKE_DUR) {
      drawRemake(ctx, g, r);
    } else {
      drawLives(ctx, g, l);
    }

    ctx.restore();
  }

  function ringPos(cx, cy, rx, ry, deg) {
    const ang = deg * Math.PI / 180;
    return { x: cx + Math.cos(ang) * rx * 0.5, y: cy + Math.sin(ang) * ry * 0.5 };
  }

  function drawClot(ctx, x, y, rx, grow) {
    const base = 1 + 0.08 * grow;
    const off = rx * 0.02;
    const lumps = [
      { dx: 0, dy: 0, r: rx * 0.035 },
      { dx: off, dy: -off * 0.6, r: rx * 0.028 },
      { dx: -off * 0.7, dy: off * 0.8, r: rx * 0.022 },
    ];
    ctx.fillStyle = `rgba(${GOLD},0.9)`;
    for (const p of lumps) {
      ctx.beginPath();
      ctx.arc(x + p.dx, y + p.dy * base, p.r * base, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawRemake(ctx, g, t) {
    const { cx, cy, rx, ry } = g;

    // three clots on the souls' ring, left side
    const angles = [150, 180, 210];
    const swallow = Math.floor(t / 0.7) % 4;
    const grow = Math.min(3, swallow);
    const pts = angles.map((a) => ringPos(cx, cy, rx, ry, a));

    drawClot(ctx, pts[0].x, pts[0].y, rx, grow);
    drawClot(ctx, pts[2].x, pts[2].y, rx, grow);

    // tongs reach for the middle clot
    const mid = pts[1];
    const anchorTop = { x: cx - 0.98 * rx, y: cy - 0.08 * ry };
    const anchorBot = { x: cx - 0.98 * rx, y: cy + 0.08 * ry };
    ctx.strokeStyle = PEWTER;
    ctx.lineWidth = Math.max(1, rx * 0.006);

    const sep = t >= 1.0 ? rx * 0.025 * Math.min(6, Math.floor((t - 1.0) / STEP)) : 0;

    for (const anc of [anchorTop, anchorBot]) {
      ctx.beginPath();
      ctx.moveTo(anc.x, anc.y);
      ctx.lineTo(mid.x - sep, mid.y);
      ctx.stroke();
      // short 90-degree hook
      ctx.beginPath();
      ctx.moveTo(mid.x - sep, mid.y);
      ctx.lineTo(mid.x - sep, mid.y + (anc === anchorTop ? -rx * 0.02 : rx * 0.02));
      ctx.stroke();
    }

    if (t >= 1.0) {
      // the middle clot's halves separate; threads span the gap
      drawClot(ctx, mid.x - sep, mid.y, rx, 0);
      drawClot(ctx, mid.x + sep, mid.y, rx, 0);

      for (let i = 0; i < 7; i++) {
        const yOff = -rx * 0.03 + (i / 6) * rx * 0.06;
        let y = mid.y + yOff;
        let a = 0.8;
        const snapped = t >= 2.8 && (i === 1 || i === 3 || i === 5);
        if (snapped) {
          const fall = rx * 0.01 * Math.min(8, Math.floor((t - 2.8) / STEP));
          a = 0.35;
          ctx.strokeStyle = THREAD(a);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(mid.x - sep, y);
          ctx.lineTo(mid.x - sep - rx * 0.015, y + fall);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(mid.x + sep, y);
          ctx.lineTo(mid.x + sep + rx * 0.015, y + fall);
          ctx.stroke();
        } else {
          ctx.strokeStyle = THREAD(a);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(mid.x - sep, y);
          ctx.lineTo(mid.x + sep, y);
          ctx.stroke();
        }
      }
    } else {
      drawClot(ctx, mid.x, mid.y, rx, grow);
    }

    // the counter: a flat rectangle, and the kept piece built up on it
    const counterX = cx - 0.32 * rx - rx * 0.09, counterY = cy + 0.30 * ry;
    ctx.fillStyle = COUNTER;
    ctx.fillRect(counterX, counterY, rx * 0.18, rx * 0.02);

    if (t >= 3.6) {
      const px = cx - 0.32 * rx, py = cy + 0.30 * ry - rx * 0.025;
      const stage = Math.min(3, Math.floor((t - 3.6) / 0.5));
      drawPiece(ctx, px, py, rx, stage);
    }
  }

  // the kept core, built up in three stages on the pewter counter
  function drawPiece(ctx, px, py, rx, stage) {
    ctx.fillStyle = `rgba(${GOLD},1)`;
    ctx.beginPath();
    ctx.arc(px, py, rx * 0.018, 0, Math.PI * 2);
    ctx.fill();

    if (stage >= 1) {
      ctx.strokeStyle = PEWTER_D;
      ctx.lineWidth = Math.max(1, rx * 0.006);
      const len = rx * 0.05;
      const diag = len * 0.7071;
      ctx.beginPath();
      ctx.moveTo(px - diag, py - diag);
      ctx.lineTo(px + diag, py + diag);
      ctx.moveTo(px - diag, py + diag);
      ctx.lineTo(px + diag, py - diag);
      ctx.moveTo(px - len, py);
      ctx.lineTo(px + len, py);
      ctx.moveTo(px, py - len);
      ctx.lineTo(px, py + len);
      ctx.stroke();
    }

    if (stage >= 2) {
      ctx.strokeStyle = PEWTER_D;
      ctx.lineWidth = Math.max(1, rx * 0.006);
      const s = rx * 0.03;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-s / 2, -s / 2, s, s);
      ctx.restore();
    }

    if (stage >= 3) {
      ctx.strokeStyle = CLOTH;
      ctx.lineWidth = Math.max(1, rx * 0.006);
      ctx.beginPath();
      ctx.arc(px, py, rx * 0.035, Math.PI, 0);
      ctx.stroke();
    }
  }

  const BAND = "#12040a", WORLD = "#1a0608", WORLD_RIM = "#5d6166";

  // where the loop is at step s (0..11) on world k's leg, bulging up on the
  // way out and down on the way back
  function loopPoint(P0, Wc, s, rx) {
    const u = s / 12;
    if (u < 0.5) {
      const f = u / 0.5;
      return {
        x: P0.x + (Wc.x - P0.x) * f,
        y: P0.y + (Wc.y - P0.y) * f - Math.sin(f * Math.PI) * rx * 0.06,
      };
    }
    const f = (u - 0.5) / 0.5;
    return {
      x: Wc.x + (P0.x - Wc.x) * f,
      y: Wc.y + (P0.y - Wc.y) * f + Math.sin(f * Math.PI) * rx * 0.06,
    };
  }

  function drawLives(ctx, g, t) {
    const { cx, cy, rx, ry } = g;

    // the counter and the finished piece, unchanged since the remake
    const counterX = cx - 0.32 * rx - rx * 0.09, counterY = cy + 0.30 * ry;
    ctx.fillStyle = COUNTER;
    ctx.fillRect(counterX, counterY, rx * 0.18, rx * 0.02);
    const P0 = { x: cx - 0.32 * rx, y: cy + 0.30 * ry - rx * 0.025 };
    drawPiece(ctx, P0.x, P0.y, rx, 3);

    // the three places lives are lived
    const worlds = [
      { x: cx - 0.62 * rx, y: cy - 0.22 * ry },
      { x: cx - 0.62 * rx, y: cy },
      { x: cx - 0.62 * rx, y: cy + 0.22 * ry },
    ];
    for (const w of worlds) {
      ctx.fillStyle = WORLD;
      ctx.strokeStyle = WORLD_RIM;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(w.x, w.y, rx * 0.045, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    const Lt = (tt) => 2.4 - 1.6 * Math.min(1, tt / 6);
    const frozen = t >= 6.5;
    const c = frozen ? 6.5 / Lt(6.5) : t / Lt(t);

    // the forgetting: a dark band astride the step-7 region of world 0's leg
    const band7 = loopPoint(P0, worlds[0], 7, rx);
    const band8 = loopPoint(P0, worlds[0], 8, rx);
    const bandX = (band7.x + band8.x) / 2, bandY = (band7.y + band8.y) / 2;
    ctx.fillStyle = BAND;
    ctx.fillRect(bandX - rx * 0.025, bandY - rx * 0.045, rx * 0.05, rx * 0.09);

    // six sparks cycling through the loop, two held over as Rex and Obrokxus
    const step0 = Math.floor(c * 12), cyc0 = Math.floor(c);
    for (let j = 0; j < 6; j++) {
      const s = (step0 + j * 2) % 12;
      const k = (cyc0 + j) % 3;
      const p = loopPoint(P0, worlds[k], s, rx);

      if (frozen && (j === 0 || j === 3)) {
        if (j === 0) {
          const style = G.ORB_STYLE.rex;
          if (window.GenPaint && window.GenPaint.flatSphere) {
            window.GenPaint.flatGlow(ctx, p.x, p.y, rx * 0.05, style.glow, 1);
            window.GenPaint.flatSphere(ctx, p.x, p.y, rx * 0.018, style.lit, style.shade, style.core, 1);
          } else {
            ctx.fillStyle = style.lit;
            ctx.beginPath();
            ctx.arc(p.x, p.y, rx * 0.018, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.fillStyle = "rgba(22,3,5,1)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, rx * 0.018, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(150,18,24,1)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, rx * 0.008, 0, Math.PI * 2);
          ctx.fill();
        }
        continue;
      }

      if (s === 7) continue; // passing through the forgetting band

      const onReturn = s >= 6, pastBand = s >= 8;
      const a = pastBand ? 0.55 : 0.9;
      ctx.fillStyle = `rgba(${GOLD},${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rx * 0.010, 0, Math.PI * 2);
      ctx.fill();

      if (onReturn && pastBand) {
        const n = Math.min(4, 1 + cyc0 % 4);
        ctx.strokeStyle = `rgba(${GOLD},0.5)`;
        ctx.lineWidth = 1;
        for (let i = 0; i < n; i++) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, rx * 0.014 + i * rx * 0.005, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // the visible means: hands change pose every step
    const pose = step0 % 3;
    ctx.strokeStyle = PEWTER;
    ctx.lineWidth = Math.max(1, rx * 0.005);

    const spinAng = pose * Math.PI / 3, spinLen = rx * 0.04;
    ctx.beginPath();
    ctx.moveTo(P0.x, P0.y);
    ctx.lineTo(P0.x + Math.cos(spinAng) * spinLen, P0.y + Math.sin(spinAng) * spinLen);
    ctx.stroke();

    const rodP = loopPoint(P0, worlds[0], 2, rx);
    const rodY = rodP.y + rx * 0.04 + pose * rx * 0.004;
    ctx.beginPath();
    ctx.moveTo(rodP.x - rx * 0.025, rodY);
    ctx.lineTo(rodP.x + rx * 0.025, rodY);
    ctx.stroke();

    const shearsP = loopPoint(P0, worlds[0], 4, rx);
    const openAng = 0.3 + 0.2 * pose, shearsLen = rx * 0.03;
    ctx.beginPath();
    ctx.moveTo(shearsP.x, shearsP.y);
    ctx.lineTo(shearsP.x + Math.cos(Math.PI / 2 - openAng / 2) * shearsLen,
               shearsP.y - Math.sin(Math.PI / 2 - openAng / 2) * shearsLen);
    ctx.moveTo(shearsP.x, shearsP.y);
    ctx.lineTo(shearsP.x + Math.cos(Math.PI / 2 + openAng / 2) * shearsLen,
               shearsP.y - Math.sin(Math.PI / 2 + openAng / 2) * shearsLen);
    ctx.stroke();
  }

  return { draw, soulMul };
})();
