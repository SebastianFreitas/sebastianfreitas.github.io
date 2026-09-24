/* genesis-armies.js — the everlasting war: two hosts march to a front
   that tides back and forth, fight, loose volleys, die, and are replaced.
   A tiny simulation stepped per frame from the saga clocks; corpses stay
   on the field. */
window.GenArmies = (function () {
  const G = window.Gen;
  const { clamp, mix, hash1, mulberry } = Util;

  const TROOPS = [];
  (function seed() {
    const r = mulberry(9007);
    function host(fac, side, n, homeOf) {
      for (let i = 0; i < n; i++) {
        const homeU = homeOf(r());
        TROOPS.push({
          fac, side, homeU, u: homeU,
          lane: r() * 2 - 1,
          s: 0.9 + 0.25 * r(),
          gait: 0.8 + 0.5 * r(),
          ph: r() * 6.28,
          shield: r() < 0.3,
          banner: i % 12 === 0,
          rank: i,
          state: "home", walk: 0, lunge: 0, deadT: 0, goneT: 0, alive: true, a: 0,
        });
      }
    }
    host("vorgath",  1, 65, f => G.MAIN_U + 0.14 + f * 0.60);
    host("seraphin", -1, 45, f => G.MAIN_U - 0.14 - f * 0.60);
    host("malgrur",  -1, 40, f => G.MAIN_U - 0.10 - f * 0.62);
  })();
  /* draw back-to-front by lane; lanes are fixed at seed time */
  const DRAW_ORDER = TROOPS.map((_, i) => i).sort((a, b) => TROOPS[a].lane - TROOPS[b].lane);

  const CORPSES = [];   // {u, lane, fac, side, a}
  const SPARKS = [];    // {x, y, t, dust}
  const ARROWS = [];    // {u0, u1, t, dur, h, side}
  let volleyT = 0;

  function pushCap(arr, item, cap) {
    arr.push(item);
    if (arr.length > cap) arr.shift();
  }
  function footY(u, lane) {
    return GenMain.surfY(G.sx(u)) - 2 - lane * 0.018 * G.H;
  }
  function rgbOf(fac) {
    return fac === "vorgath" ? "160,24,28" : fac === "seraphin" ? "214,230,222" : "255,176,90";
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

        /* 1. spawn: the host grows with the war */
        if (hash1(i * 13) > vis * 1.15) T.a = 0;
        else T.a += (vis - T.a) * Math.min(1, dt * 2);

        /* 2. march to the front and fight */
        if (T.alive && fighting) {
          const tu = front - T.side * (0.012 + 0.0045 * (T.rank % 14));
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
              const sc = 1 - 0.12 * T.lane;
              const s = 0.015 * G.H * T.s * sc;
              pushCap(SPARKS, { x: G.sx(T.u) - T.side * 0.35 * s, y: footY(T.u, T.lane) - 0.9 * s, t: 0 }, 40);
            }
            if (Math.random() < death * dt * 0.20) {
              T.alive = false;
              T.deadT = 0;
              pushCap(CORPSES, { u: T.u, lane: T.lane, fac: T.fac, side: T.side, a: 1 }, 140);
            }
          }
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

    /* 4. volleys: both hosts loose 9 arrows every 2.6s while the war is hot */
    if (fighting && war > 0.10) {
      volleyT += dt;
      if (volleyT >= 2.6) {
        volleyT -= 2.6;
        for (const side of [1, -1]) {
          for (let k = 0; k < 9; k++) {
            pushCap(ARROWS, {
              u0: front - side * (0.10 + 0.05 * Math.random()),
              u1: front + side * (0.02 + 0.06 * Math.random()),
              t: 0, dur: 1.15,
              h: 0.11 + 0.04 * Math.random(),
              side,
            }, 40);
          }
        }
      }
    }
    for (let j = ARROWS.length - 1; j >= 0; j--) {
      const A = ARROWS[j];
      A.t += dt;
      if (A.t >= A.dur) {
        ARROWS.splice(j, 1);
        pushCap(SPARKS, { x: G.sx(A.u1), y: footY(A.u1, 0), t: -0.05, dust: true }, 40);
        if (Math.random() < 0.5 * death) {
          let best = null, bestD = 0.012;
          for (let k = 0; k < TROOPS.length; k++) {
            const T2 = TROOPS[k];
            if (!T2.alive || T2.side === A.side) continue;
            const d = Math.abs(T2.u - A.u1);
            if (d < bestD) { bestD = d; best = T2; }
          }
          if (best) {
            best.alive = false; best.deadT = 0;
            pushCap(CORPSES, { u: best.u, lane: best.lane, fac: best.fac, side: best.side, a: 1 }, 140);
          }
        }
      }
    }

    /* 5. age sparks and let corpses fade once the record starts to return */
    for (let j = SPARKS.length - 1; j >= 0; j--) {
      const sp = SPARKS[j];
      sp.t += dt;
      if (sp.t >= (sp.dust ? 0.30 : 0.14)) SPARKS.splice(j, 1);
    }
    for (let j = CORPSES.length - 1; j >= 0; j--) {
      const c = CORPSES[j];
      if (S.ret > 0) c.a -= dt * 0.5 * S.ret;
      if (c.a <= 0) CORPSES.splice(j, 1);
    }
  }

  function draw(ctx, S) {
    if (S.army < 0.01 && CORPSES.length === 0) return;
    const s0 = 0.015 * G.H;

    /* 1. corpses first, insertion order */
    for (const c of CORPSES) {
      const sc = 1 - 0.12 * c.lane;
      GenFig.drawTroop(ctx, G.sx(c.u), footY(c.u, c.lane), s0 * sc, rgbOf(c.fac),
        { pose: "dead", down: 1, face: -c.side, a: 0.45 * c.a });
    }

    /* 2. troops, back-to-front by lane */
    for (const idx of DRAW_ORDER) {
      const T = TROOPS[idx];
      if (T.a < 0.02) continue;
      if (!T.alive && T.deadT > 2.5) continue;
      const x = G.sx(T.u);
      if (x < -40 || x > G.W + 40) continue;
      const sc = 1 - 0.12 * T.lane;
      GenFig.drawTroop(ctx, x, footY(T.u, T.lane), s0 * T.s * sc, rgbOf(T.fac), {
        a: T.a,
        face: -T.side,
        walk: T.walk,
        pose: T.alive ? T.state : "dead",
        down: T.alive ? 0 : clamp(T.deadT * 3, 0, 1),
        lunge: T.lunge,
        thrust: T.lunge,
        shield: T.shield,
        banner: T.banner,
        ph: T.ph,
      });
    }

    /* 3. arrows: a flat sliver riding the parabola, tipped lighter at the head */
    for (const A of ARROWS) {
      const q = A.t / A.dur;
      const x0 = G.sx(A.u0), x1 = G.sx(A.u1);
      const fy0 = footY(A.u0, 0), fy1 = footY(A.u1, 0);
      const x = mix(x0, x1, q);
      const y = mix(fy0, fy1, q) - G.H * 4 * q * (1 - q) * A.h;
      const dxdq = x1 - x0;
      const dydq = (fy1 - fy0) + G.H * 4 * A.h * (2 * q - 1);
      const len = Math.hypot(dxdq, dydq) || 1;
      const nx = dxdq / len, ny = dydq / len;
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(30,26,24,0.9)";
      ctx.beginPath();
      ctx.moveTo(x - nx * 3.5, y - ny * 3.5);
      ctx.lineTo(x + nx * 3.5, y + ny * 3.5);
      ctx.stroke();
      ctx.strokeStyle = "rgba(200,190,170,0.9)";
      ctx.beginPath();
      ctx.moveTo(x + nx * 1.5, y + ny * 1.5);
      ctx.lineTo(x + nx * 3.5, y + ny * 3.5);
      ctx.stroke();
    }

    /* 4. sparks: a flat cross; dust puffs: two flat dots */
    for (const sp of SPARKS) {
      if (sp.dust) {
        const a = 0.5 * (1 - sp.t / 0.30);
        if (a <= 0) continue;
        ctx.fillStyle = `rgba(120,110,100,${a})`;
        ctx.beginPath(); ctx.arc(sp.x - 1.5, sp.y, 1.5, 0, 6.283); ctx.fill();
        ctx.beginPath(); ctx.arc(sp.x + 1.5, sp.y, 1.5, 0, 6.283); ctx.fill();
      } else {
        const a = 1 - sp.t / 0.14;
        if (a <= 0) continue;
        ctx.fillStyle = `rgba(255,236,190,${a})`;
        ctx.fillRect(sp.x - 1.5, sp.y - 0.5, 3, 1);
        ctx.fillRect(sp.x - 0.5, sp.y - 1.5, 1, 3);
      }
    }
  }

  function reset() {
    CORPSES.length = 0;
    SPARKS.length = 0;
    ARROWS.length = 0;
    for (const T of TROOPS) {
      T.u = T.homeU;
      T.state = "home";
      T.walk = 0;
      T.lunge = 0;
      T.deadT = 0;
      T.goneT = 0;
      T.alive = true;
      T.a = 0;
    }
  }

  return { step, draw, reset };
})();
