/* genesis-armies.js — the everlasting war: angels and devils against
   abominations of bone and flesh, marching to a front that tides back and
   forth; they fight hand to hand and with spells, die, and are replaced.
   A tiny simulation stepped per frame from the saga clocks; corpses stay
   on the field. */
window.GenArmies = (function () {
  const G = window.Gen;
  const { clamp, mix, hash1, mulberry } = Util;

  const S0 = 0.028;
  let rnd = mulberry(9011);

  const TROOPS = [];
  (function seed() {
    const r = mulberry(9007);
    function host(fac, side, n, homeOf) {
      for (let i = 0; i < n; i++) {
        const homeU = homeOf(r());
        let form = null, fly = false;
        if (fac === "seraphin") {
          form = ["bird", "hound", "stag", "bird", "hound"][i % 5];
          const chance = { bird: 0.75, hound: 0.3, stag: 0.2 }[form];
          fly = hash1(i * 29 + 3) < chance;
        } else if (fac === "malgrur") {
          form = i % 10 === 4 ? "fiend" : (i % 4 === 1 ? "bat" : "gaunt");
          fly = form === "bat";
        }
        const alt = fly ? 1.7 + 1.5 * hash1(i * 41 + 9) : 0;
        TROOPS.push({
          fac, side, homeU, u: homeU,
          lane: r() * 2 - 1,
          s: 0.9 + 0.25 * r(),
          gait: 0.8 + 0.5 * r(),
          ph: r() * 6.28,
          variant: Math.floor(hash1(i * 7.31 + 3) * 6),
          caster: fac === "vorgath" ? r() < 0.15 : r() < 0.45,
          cd: 1 + 3 * r(),
          cast: 0,
          rank: i,
          state: "home", walk: 0, lunge: 0, deadT: 0, goneT: 0, alive: true, a: 0,
          form, alt,
        });
      }
    }
    host("vorgath",  1, 44, f => G.MAIN_U + 0.14 + f * 0.60);
    host("seraphin", -1, 26, f => G.MAIN_U - 0.14 - f * 0.60);
    host("malgrur",  -1, 24, f => G.MAIN_U - 0.10 - f * 0.62);
  })();
  /* draw back-to-front by lane; lane +1 sits higher and smaller (the back
     row) and must paint first */
  const DRAW_ORDER = TROOPS.map((_, i) => i).sort((a, b) => TROOPS[b].lane - TROOPS[a].lane);

  const CORPSES = [];   // {u, lane, fac, side, a, variant, s}
  const SPARKS = [];    // {u, lane, dy, t}
  const BOLTS = [];     // {fac, side, u0, lane0, dy0, u1, lane1, t, dur, h}
  const BURSTS = [];    // {u, lane, fac, t}

  function pushCap(arr, item, cap) {
    arr.push(item);
    if (arr.length > cap) arr.shift();
  }
  function footY(u, lane) {
    return GenMain.surfY(G.sx(u)) - 2 - lane * 0.018 * G.H;
  }
  function sizeOf(lane, s) {
    return S0 * G.H * s * (1 - 0.12 * lane);
  }
  function liftOf(T, s) {
    if (!T.alt) return 0;
    if (!T.alive) {
      const k = clamp(T.deadT * 1.8, 0, 1);
      return T.alt * s * (1 - k * k);
    }
    return T.alt * s * (T.state === "fight" ? 1 - 0.45 * T.lunge : 1) +
      Math.sin(G.t * 2.3 + T.ph) * 0.10 * s;
  }
  function paintOne(ctx, fac, x, y, s, o) {
    if (!window.GenHosts) return;
    if (fac === "seraphin") GenHosts.drawAngel(ctx, x, y, s, o);
    else if (fac === "malgrur") GenHosts.drawDevil(ctx, x, y, s, o);
    else GenHosts.drawAbom(ctx, x, y, s, o);
  }
  function drawTroop(ctx, T) {
    if (T.a < 0.02) return;
    if (!T.alive && T.deadT > 2.5) return;
    const x = G.sx(T.u);
    if (x < -60 || x > G.W + 60) return;
    const sz = sizeOf(T.lane, T.s);
    const y = footY(T.u, T.lane) - liftOf(T, sz);
    paintOne(ctx, T.fac, x, y, sz, {
      a: T.a,
      face: -T.side,
      walk: T.walk,
      pose: T.alive ? T.state : "dead",
      down: T.alive ? 0 : clamp(T.deadT * 3, 0, 1),
      lunge: T.lunge,
      cast: T.cast,
      ph: T.ph,
      variant: T.variant,
      form: T.form,
      fly: (T.alt && T.alive) ? 1 : 0,
    });
  }

  function step(dt, S) {
    dt = clamp(dt, 0, 0.05);
    const war = S.war, stall = S.stall, lock = S.lock, ret = S.ret;
    const march = war > 0 ? mix(1, 0.12, stall) : 0;
    const tide = 1 - stall;
    const death = war > 0 ? (1 - 0.7 * stall) * (1 - lock) : 0;
    const vis = S.army;
    const fighting = war > 0.02 && ret < 0.02;
    const front = G.MAIN_U + 0.045 * Math.sin(G.t * 0.35) * tide + 0.02 * Math.sin(G.t * 1.1) * tide;

    if (vis > 0.01) {
      for (let i = 0; i < TROOPS.length; i++) {
        const T = TROOPS[i];

        /* 1. spawn: the host grows with the war, eased */
        const tgt = hash1(i * 13) > vis * 1.15 ? 0 : vis;
        T.a += (tgt - T.a) * Math.min(1, dt * 2.5);

        /* 2. march to the front and fight */
        if (T.alive && fighting) {
          const tu = front - T.side * (0.014 + 0.006 * (T.rank % 10));
          const maxStep = 0.07 * T.gait * march * dt;
          const moved = clamp(tu - T.u, -maxStep, maxStep);
          T.u += moved;
          T.walk += Math.abs(moved) * G.W * 0.09;

          const nearTarget = Math.abs(T.u - tu) < 0.006;
          const nearFront = Math.abs(T.u - front) < 0.02;
          T.state = (nearTarget && nearFront) ? "fight" : "march";

          if (T.state === "fight") {
            T.lunge = Math.max(0, Math.sin(G.t * 6 + T.ph));
            if (T.lunge > 0.92 && G.tick60 && hash1(Math.floor(G.t * 60) + i) < 0.35) {
              const s = sizeOf(T.lane, T.s);
              pushCap(SPARKS, { u: T.u, lane: T.lane, off: -T.side * 0.35, s, t: 0 }, 40);
            }
            if (rnd() < death * dt * 0.20) {
              T.alive = false;
              T.deadT = 0;
              pushCap(CORPSES, { u: T.u, lane: T.lane, fac: T.fac, side: T.side, a: 1, variant: T.variant, s: T.s, form: T.form, hold: T.alt ? 0.56 : 0 }, 140);
            }
          }

          /* casting: spells replace arrows */
          if (T.caster && war > 0.10 && T.a > 0.3 && Math.abs(T.u - front) < 0.09) {
            T.cd -= dt;
            if (T.cd <= 0 && T.cast === 0) T.casting = true;
            if (T.casting) {
              T.cast = Math.min(1, T.cast + dt / 0.35);
              if (T.cast >= 1) {
                T.casting = false;
                T.cd = 2.2 + 3 * rnd();
                if (window.GenHosts) {
                  let best = null, bestD = 0.14;
                  for (let k = 0; k < TROOPS.length; k++) {
                    const T2 = TROOPS[k];
                    if (T2.side === T.side || T2.a <= 0.3) continue;
                    if ((T2.u - T.u) * -T.side <= 0) continue;
                    const d = Math.abs(T2.u - T.u);
                    if (d < bestD) { bestD = d; best = T2; }
                  }
                  let u1, lane1;
                  if (best) { u1 = best.u; lane1 = best.lane; }
                  else { u1 = T.u - T.side * (0.05 + 0.05 * rnd()); lane1 = rnd() * 2 - 1; }
                  const s = sizeOf(T.lane, T.s);
                  const dy1 = best ? liftOf(best, sizeOf(best.lane, best.s)) : 0;
                  pushCap(BOLTS, {
                    fac: T.fac, side: T.side, u0: T.u, lane0: T.lane,
                    hx: -T.side * GenHosts.HAND[0] * s, dy0: GenHosts.HAND[1] * s + liftOf(T, s),
                    u1, lane1, dy1, t: 0, dur: 0.40 + 0.25 * rnd(), h: 0.015 + 0.03 * rnd(),
                  }, 30);
                }
              }
            } else {
              T.cast = Math.max(0, T.cast - dt * 3);
            }
          }
          if (T.cast > 0 && T.state === "fight") T.lunge = 0;
        }

        /* not fighting (or dead): ease lunge/cast down and unfreeze state */
        if (!T.alive || !fighting) {
          T.lunge = Math.max(0, T.lunge * (1 - dt * 6));
          T.cast = Math.max(0, T.cast - dt * 3);
          if (T.state === "fight") T.state = "march";
        }

        /* 3. the dead lie 2.5s, then reinforcements retake the field */
        if (!T.alive) {
          T.deadT += dt;
          if (T.deadT > 2.5 && fighting && death > 0.05) {
            T.u = T.homeU; T.alive = true; T.a = 0; T.state = "march";
          }
        }
      }
    }

    /* 4. bolts: a fired spell flies to its target, then bursts */
    for (let j = BOLTS.length - 1; j >= 0; j--) {
      const B = BOLTS[j];
      B.t += dt;
      if (B.t >= B.dur) {
        BOLTS.splice(j, 1);
        pushCap(BURSTS, { u: B.u1, lane: B.lane1, fac: B.fac, t: 0 }, 30);
        if (rnd() < 0.5 * death) {
          let best = null, bestD = 0.012;
          for (let k = 0; k < TROOPS.length; k++) {
            const T2 = TROOPS[k];
            if (!T2.alive || T2.side === B.side) continue;
            const d = Math.abs(T2.u - B.u1);
            if (d < bestD) { bestD = d; best = T2; }
          }
          if (best) {
            best.alive = false; best.deadT = 0;
            pushCap(CORPSES, { u: best.u, lane: best.lane, fac: best.fac, side: best.side, a: 1, variant: best.variant, s: best.s, form: best.form, hold: best.alt ? 0.56 : 0 }, 140);
          }
        }
      }
    }

    /* 5. age sparks, bursts, and let corpses fade once the record returns */
    for (let j = SPARKS.length - 1; j >= 0; j--) {
      const sp = SPARKS[j];
      sp.t += dt;
      if (sp.t >= 0.16) SPARKS.splice(j, 1);
    }
    for (let j = BURSTS.length - 1; j >= 0; j--) {
      const b = BURSTS[j];
      b.t += dt;
      if (b.t >= 0.40) BURSTS.splice(j, 1);
    }
    for (let j = CORPSES.length - 1; j >= 0; j--) {
      const c = CORPSES[j];
      c.hold = Math.max(0, c.hold - dt);
      if (S.ret > 0) c.a -= dt * 0.5 * S.ret;
      if (c.a <= 0) CORPSES.splice(j, 1);
    }
  }

  function draw(ctx, S) {
    if (S.army < 0.01 && CORPSES.length === 0 && BOLTS.length === 0 && BURSTS.length === 0) return;
    ctx.save();

    /* 1. corpses first, insertion order */
    for (const c of CORPSES) {
      if (c.hold > 0) continue;
      paintOne(ctx, c.fac, G.sx(c.u), footY(c.u, c.lane), sizeOf(c.lane, c.s || 1),
        { pose: "dead", down: 1, face: -c.side, a: 0.45 * c.a, variant: c.variant, form: c.form, fly: 0 });
    }

    /* 2. troops, back-to-front by lane, grounded first, fliers overlap */
    for (const idx of DRAW_ORDER) {
      const T = TROOPS[idx];
      if (!T.alt) drawTroop(ctx, T);
    }
    for (const idx of DRAW_ORDER) {
      const T = TROOPS[idx];
      if (T.alt > 0) drawTroop(ctx, T);
    }

    const k = G.H / 900;

    /* 3. bolts: a flat spell riding the parabola, styled per host */
    for (const B of BOLTS) {
      const q = B.t / B.dur;
      const x0 = G.sx(B.u0) + B.hx, y0 = footY(B.u0, B.lane0) - B.dy0;
      const x1 = G.sx(B.u1), y1 = footY(B.u1, B.lane1) - 0.5 * S0 * G.H - (B.dy1 || 0);
      const x = mix(x0, x1, q);
      const y = mix(y0, y1, q) - G.H * 4 * q * (1 - q) * B.h;
      const dx = x1 - x0, dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      const dirx = dx / len, diry = dy / len;

      if (B.fac === "seraphin") {
        GenPaint.flatGlow(ctx, x, y, 10 * k, "255,226,140", 0.9);
        ctx.strokeStyle = "#fff2c0";
        ctx.lineWidth = Math.max(1, 2 * k);
        ctx.beginPath();
        ctx.moveTo(x - dirx * 12 * k, y - diry * 12 * k);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (B.fac === "malgrur") {
        GenPaint.flatGlow(ctx, x, y, 12 * k, "255,120,40", 0.9);
        Paint.circle(ctx, x, y, 3 * k, "#ffb24a");
        const trail = [[5, 2.4, 0.7], [10, 1.8, 0.45], [15, 1.2, 0.25]];
        for (const [d, rr, a] of trail) {
          Paint.circle(ctx, x - dirx * d * k, y - diry * d * k, rr * k, `rgba(255,106,42,${a})`);
        }
      } else {
        GenPaint.flatGlow(ctx, x, y, 9 * k, "200,30,50", 0.8);
        Paint.circle(ctx, x, y, 3 * k, "#7a1622");
        Paint.circle(ctx, x - dirx * 6 * k, y - diry * 6 * k, 2 * k, "rgba(122,22,34,0.5)");
      }
    }

    /* 4. bursts: a flat glow ring where a bolt landed */
    for (const b of BURSTS) {
      const p = b.t / 0.40;
      const x = G.sx(b.u), y = footY(b.u, b.lane) - 0.5 * S0 * G.H;
      const rgb = b.fac === "seraphin" ? "255,226,140" : b.fac === "malgrur" ? "255,130,40" : "200,30,50";
      GenPaint.flatGlow(ctx, x, y, (8 + 22 * p) * k, rgb, 0.9 * (1 - p));
      ctx.strokeStyle = `rgba(${rgb},${0.8 * (1 - p)})`;
      ctx.lineWidth = Math.max(1, 2 * k);
      ctx.beginPath();
      ctx.arc(x, y, (4 + 18 * p) * k, 0, 6.283);
      ctx.stroke();
    }

    /* 5. sparks: a flat cross where blades meet */
    for (const sp of SPARKS) {
      const a = 1 - sp.t / 0.16;
      if (a <= 0) continue;
      const x = G.sx(sp.u) + sp.off * sp.s;
      const y = footY(sp.u, sp.lane) - 0.55 * sp.s;
      ctx.fillStyle = `rgba(255,236,190,${a})`;
      ctx.fillRect(x - 1.5, y - 0.5, 3, 1);
      ctx.fillRect(x - 0.5, y - 1.5, 1, 3);
    }

    ctx.restore();
  }

  function reset() {
    CORPSES.length = 0;
    SPARKS.length = 0;
    BOLTS.length = 0;
    BURSTS.length = 0;
    rnd = mulberry(9011);
    for (const T of TROOPS) {
      T.u = T.homeU;
      T.state = "home";
      T.walk = 0;
      T.lunge = 0;
      T.deadT = 0;
      T.goneT = 0;
      T.alive = true;
      T.a = 0;
      T.cast = 0;
      T.casting = false;
      T.cd = 1 + 3 * hash1(T.rank * 7 + (T.side > 0 ? 1 : 2));
    }
  }

  return { step, draw, reset };
})();
