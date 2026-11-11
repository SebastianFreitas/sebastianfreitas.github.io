/* js/bridge/bridge-marks.js — beacons, planets, and the sector's ambient art */
(function () {
  const B = window.Bridge;
  if (!B) return;
  const {
    ctx, reduced, CUE_PULSE, ART_FADE, FLY_DUR,
    activeMarks, markScreen, onScreen, flyK, scale,
  } = B;
  const { approach } = Util;

  /* ---- markers ---- */
  let markDebug = 0;
  window.beaconReport = () => activeMarks().map(m => {
    const p = markScreen(m);
    return `${m.id}  x=${p.x.toFixed(0)} y=${p.y.toFixed(0)} vis=${(+m.vis).toFixed(2)} onscreen=${onScreen(p.x, 60)}`;
  }).join("\n") + `\ncamX=${B.camX.toFixed(0)} frozen=${B.frozen} W=${B.W} H=${B.H}`;

  /* the boxes the cues keep clear of: the Data Archive panel (left) and "The
     Work" tab (right), as bottoms in canvas pixels. Measured on resize, load
     and whenever either resizes or shows/hides, never per frame. */
  let archBot = 0, tabBot = 0;   // 0 = not showing
  function bottomOf(el) {
    const host = ctx.canvas.getBoundingClientRect();
    const r = el && el.getBoundingClientRect();
    return r && r.width > 0 && getComputedStyle(el).display !== "none" ? r.bottom - host.top : 0;
  }
  function measureBoxes() {
    archBot = bottomOf(document.getElementById("arch"));
    tabBot = bottomOf(document.querySelector(".bridge-scroll"));
  }
  addEventListener("resize", measureBoxes);
  addEventListener("load", measureBoxes);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureBoxes);
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(measureBoxes);
    for (const el of [document.getElementById("arch"), document.querySelector(".bridge-scroll")]) if (el) ro.observe(el);
  }
  measureBoxes();

  /* each side's cues live in one band, from the HUD piece on that edge (+14)
     down to the deck line (-14); ordered by beacon y, spread so neighbours
     are CUE_GAP apart, nearest beacons kept if the band is too short */
  const CUE_GAP = 13;
  const cueSide = { l: [], r: [] };
  function layCues(list, right, dt) {
    const n0 = list.length;
    if (!n0) return;
    const top = (right ? tabBot : archBot) ? (right ? tabBot : archBot) + 14 : 100;
    const bot = (World.DECK || 0.64) * B.H - 14;
    const cap = Math.max(0, Math.floor((bot - top) / CUE_GAP) + 1);
    // drop the farthest beacons until the rest fit
    while (list.length > cap) {
      let far = 0;
      for (let i = 1; i < list.length; i++) if (list[i].cueD > list[far].cueD) far = i;
      list[far].cueY = undefined;
      list.splice(far, 1);
    }
    // order by beacon y (insertion sort), clamp into the band
    for (let i = 1; i < list.length; i++) {
      const m = list[i];
      let j = i - 1;
      while (j >= 0 && list[j].cueBy > m.cueBy) { list[j + 1] = list[j]; j--; }
      list[j + 1] = m;
    }
    const n = list.length;
    for (let i = 0; i < n; i++) {
      const m = list[i];
      m.cueT = Math.min(bot, Math.max(top, m.cueBy));
      if (i && m.cueT < list[i - 1].cueT + CUE_GAP) m.cueT = list[i - 1].cueT + CUE_GAP;
    }
    if (n && list[n - 1].cueT > bot) {
      list[n - 1].cueT = bot;
      for (let i = n - 2; i >= 0; i--) if (list[i].cueT > list[i + 1].cueT - CUE_GAP) list[i].cueT = list[i + 1].cueT - CUE_GAP;
    }
    for (let i = 0; i < n; i++) {
      const m = list[i];
      m.cueY = m.cueY === undefined || reduced ? m.cueT : approach(m.cueY, m.cueT, 8, dt);
      drawCue(m, right);
    }
  }

  function drawCue(m, right) {
    const x = right ? B.W - 14 : 14, y = m.cueY;
    const hot = B.activeMark === m || B.hoverMark === m;
    const env = (m.cue < CUE_PULSE ? 0.75 + 0.25 * Math.sin(m.cue * 5) : 1) * Math.min(1, m.cue * 4);
    ctx.save();
    // a short gold hairline pointing toward the beacon, closed by an end tick
    const d = right ? 1 : -1;
    ctx.globalAlpha = (hot ? 1 : 0.42) * env;
    ctx.strokeStyle = "rgb(245,208,107)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - d * 5, y); ctx.lineTo(x + d * 4, y);
    ctx.moveTo(x + d * 4, y - 3); ctx.lineTo(x + d * 4, y + 3);
    ctx.stroke();
    ctx.globalAlpha = (hot ? 1 : 0.6) * env;
    ctx.fillStyle = hot ? "rgb(245,208,107)" : "rgb(238,230,208)";
    ctx.font = '500 9px "IBM Plex Mono", monospace';
    ctx.letterSpacing = "0.6px";
    ctx.textBaseline = "middle";
    ctx.textAlign = right ? "right" : "left";
    ctx.fillText(m.name.toUpperCase(), x - d * 9, y);
    ctx.letterSpacing = "0px";
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
    ctx.strokeStyle = "rgb(245,208,107)";
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
    cueSide.l.length = 0; cueSide.r.length = 0;
    for (const m of activeMarks()) {
      if (m.fly) {
        m.fly.t += dt;
        if (m.fly.t >= FLY_DUR) { m.fly = null; m.pop = 1; }   // lands with the claim burst
        else if (m.fly.t < 0) continue;                       // still waiting its turn inside the root
      }
      const p = markScreen(m);
      if (m.unseen) {
        if (p.x > 0 && p.x < B.W) m.unseen = false;   // first sight just drops the cue — the node was already there
        else {
          m.cue += dt; drawCueLine(m, p);
          const right = p.x >= B.W;
          m.cueBy = p.y; m.cueD = right ? p.x - B.W : -p.x;
          cueSide[right ? "r" : "l"].push(m);
        }
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
        ctx.strokeStyle = "rgb(245,208,107)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.restore();
      }
      if (m.art && window.BridgeMotifs) BridgeMotifs.draw(m.art, ctx, p.x, p.y, { t: B.t, dt, alpha: m.vis * (m.shown ?? 1), W: B.W, H: B.H });
      Beacon.draw(ctx, p.x, p.y, {
        t: B.t, phase: m.phase, alpha: m.vis,
        active: B.activeMark === m, hover: B.hoverMark === m,
        claimed: window.XP && XP.has("beacon-" + m.id),
        xp: m.xp, pop: m.pop, label: m.poi > 0 || B.activeMark === m ? null : m.name,
        cutscene: !!(B.beaconSegment && B.beaconSegment[m.id]),
      });
    }
    layCues(cueSide.l, false, dt);
    layCues(cueSide.r, true, dt);
    if (B.drawPoi) B.drawPoi(dt);
    // if none ever appear, say so once — beaconReport() has the detail
    if (!shown && markDebug < 4 && (markDebug += dt) >= 4)
      console.warn("no marks drawn in 4s — run beaconReport() for why");
  }
  B.drawMarks = drawMarks;

  /* a reveal keeps the loop awake until every part of it has played out:
     the flight, the landing burst, the art fade, and the pulse of a cue
     pointing at a node revealed off-screen. Parking during any of these
     would drop it to the idle 10 fps. */
  function marksSettled() {
    for (const m of activeMarks()) {
      if (m.fly || m.pop > 0) return false;
      if (m.art && m.vis >= 0.02) return false;   // the motif moves
      if (m.unseen ? m.cue < CUE_PULSE : m.shown < 1) return false;
    }
    return true;
  }
  B.marksSettled = marksSettled;
})();
