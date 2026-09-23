/* js/bridge/bridge-marks.js — beacons, planets, and the sector's ambient art */
(function () {
  const B = window.Bridge;
  if (!B) return;
  const {
    ctx, reduced, CUE_PULSE, ART_FADE, FLY_DUR,
    ZERO_MARK, VS_MARK, HL_MARK, CONC_MARK,
    activeMarks, markScreen, onScreen, flyK, scale,
  } = B;
  const { approach } = Util;

  /* ---- markers ---- */
  let markDebug = 0;
  window.beaconReport = () => activeMarks().map(m => {
    const p = markScreen(m);
    return `${m.id}  x=${p.x.toFixed(0)} y=${p.y.toFixed(0)} vis=${(+m.vis).toFixed(2)} onscreen=${onScreen(p.x, 60)}`;
  }).join("\n") + `\ncamX=${B.camX.toFixed(0)} mode=${B.sceneMode} frozen=${B.frozen} W=${B.W} H=${B.H}`;
  window.stormReport = () => Storm.report();
  window.forgeReport = () => Forge.report();
  window.zonesReport = () => Zones.report();

  function drawCue(m, p, stack) {
    const right = p.x >= B.W;
    const side = right ? "r" : "l";
    const i = stack[side]++;
    const x = right ? B.W - 22 : 22;
    const y = Math.min(B.H - 40, Math.max(40, p.y)) + i * 26;
    const a = (m.cue < CUE_PULSE ? 0.55 + 0.35 * Math.sin(m.cue * 5) : 0.35) * Math.min(1, m.cue * 4);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgb(198,204,198)";
    ctx.beginPath();
    if (right) {
      ctx.moveTo(x + 7, y);
      ctx.lineTo(x - 4, y - 7);
      ctx.lineTo(x - 4, y + 7);
    } else {
      ctx.moveTo(x - 7, y);
      ctx.lineTo(x + 4, y - 7);
      ctx.lineTo(x + 4, y + 7);
    }
    ctx.closePath();
    ctx.fill();
    ctx.font = "11px ui-monospace, monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = right ? "right" : "left";
    ctx.fillText(m.name.toLowerCase(), right ? x - 10 : x + 10, y);
    ctx.restore();
  }

  /* the dashed line from the origin beacon toward an off-screen cue —
     drawn whether or not the origin beacon is itself on screen; the
     canvas simply clips the part that would fall outside it */
  function drawCueLine(m, p) {
    const a = markScreen(m.cueFrom);
    const k = (m.cue < CUE_PULSE ? 0.35 : 0.2) * Math.min(1, m.cue * 4);
    ctx.save();
    ctx.globalAlpha = k;
    ctx.strokeStyle = "rgb(198,204,198)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.lineDashOffset = -Math.min(m.cue, CUE_PULSE) * 14;   // dashes crawl outward, then hold once the cue settles
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawMarks(dt) {
    let shown = 0;
    const gd = B.sceneMode === "gamedev";
    const cueStack = { l: 0, r: 0 };
    for (const m of activeMarks()) {
      if (m.fly) {
        m.fly.t += dt;
        if (m.fly.t >= FLY_DUR) { m.fly = null; m.pop = 1; }   // lands with the claim burst
        else if (m.fly.t < 0) continue;                       // still waiting its turn inside the root
      }
      const p = markScreen(m);
      if (m.unseen) {
        if (p.x > 0 && p.x < B.W) m.unseen = false;   // first sight just drops the cue — the node was already there
        else { m.cue += dt; drawCueLine(m, p); drawCue(m, p, cueStack); }
      }
      if (!m.fly && !m.unseen && m.shown < 1) m.shown = Math.min(1, m.shown + dt / ART_FADE);
      m.vis = approach(m.vis, onScreen(p.x, 60) ? 1 : 0, 3.2, dt);
      if (m.pop > 0) m.pop = Math.max(0, m.pop - dt * 1.6);
      if (m.vis < 0.02 && m.pop <= 0) continue;
      shown++;
      if (m.fly) {
        const a = markScreen(m.fly.from);
        ctx.save();
        ctx.globalAlpha = 0.35 * m.vis;
        ctx.strokeStyle = "rgb(198,204,198)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.restore();
      }
      if (gd && window.Planet) {
        Planet.draw(ctx, p.x, p.y, {
          t: B.t, phase: m.phase, alpha: m.vis,
          active: B.activeMark === m, hover: B.hoverMark === m,
          claimed: !!(window.XP && XP.has("beacon-" + m.id)),
          xp: m.xp,
          theme: m.theme, size: m.fly ? m.size * (0.35 + 0.65 * flyK(m)) : m.size, pop: m.pop, label: m.name,
        });
      } else if (!gd) {
        Beacon.draw(ctx, p.x, p.y, {
          t: B.t, phase: m.phase, alpha: m.vis,
          active: B.activeMark === m, hover: B.hoverMark === m,
          claimed: window.XP && XP.has("beacon-" + m.id),
          xp: m.xp, pop: m.pop, label: m.name,
        });
      }
    }
    // if none ever appear, say so once — beaconReport() has the detail
    if (!shown && markDebug < 4 && (markDebug += dt) >= 4)
      console.warn("no marks drawn in 4s — run beaconReport() for why");
  }
  B.drawMarks = drawMarks;

  // --- Sector Zero storm (storm.js): debris beside the planet, shoved by the ship ---
  function stormEnv() {
    const a = markScreen(ZERO_MARK);
    const sp = Voidship.screenPos(B.ship, B.W);
    return { ax: a.x, ay: a.y, W: B.W, H: B.H, sx: sp.x, sy: sp.y,
             svx: B.ship.vel * ZERO_MARK.par * scale(), svy: B.ship.vy, spitch: B.ship.pitch, reduced };
  }
  function drawStorm(dt) {
    const env = stormEnv();
    Storm.step(dt, env);
    Storm.draw(ctx, env);
  }
  B.drawStorm = drawStorm;

  // --- VoidScape bench and run console (forge.js): flat panels beside the planet ---
  function forgeEnv() {
    const a = markScreen(VS_MARK);
    return { ax: a.x, ay: a.y, W: B.W, H: B.H, reduced };
  }
  function drawForge(dt) {
    const env = forgeEnv();
    Forge.step(dt, env);
    Forge.draw(ctx, env);
  }
  B.drawForge = drawForge;

  // --- game zones (zones.js): ambient art around VoidScape, HeavyLight and Conclusus, painted under the planets ---
  function zonesEnv() {
    return { W: B.W, H: B.H, reduced,
             at: { voidscape: markScreen(VS_MARK), heavylight: markScreen(HL_MARK), conclusus: markScreen(CONC_MARK) } };
  }
  function drawZones(dt) {
    const env = zonesEnv();
    Zones.step(dt, env);
    Zones.draw(ctx, env);
  }
  B.drawZones = drawZones;

  /* a reveal keeps the loop awake until every part of it has played out:
     the flight, the landing burst, the art fade, and the pulse of a cue
     pointing at a node revealed off-screen. Parking during any of these
     would drop it to the idle 10 fps. */
  function marksSettled() {
    for (const m of activeMarks()) {
      if (m.fly || m.pop > 0) return false;
      if (m.unseen ? m.cue < CUE_PULSE : m.shown < 1) return false;
    }
    return true;
  }
  B.marksSettled = marksSettled;
})();
