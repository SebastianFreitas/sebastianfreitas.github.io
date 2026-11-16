/* voidscape-mapgen.js — the VoidScape map stage ("vs-map"): a run's map as flat blocks, climbing; a click rolls a new one. */
window.VoidMapgen = (function () {
  /* ---- the map stage ("vs-map", figure#vs-map-stage): a run's map as flat blocks, climbing ----
     The plan's main path (ForgeMissions.genPlan) gives the steps in order; this draws them as
     stairs at the bottom, then corridors and rooms joined doorway to doorway, the boss on top.
     A click rolls a new map: the blocks rise bottom to top in a short build-up, then rest. */
  const U = window.Util, P = window.Play;
  const BUILD = 0.05;   // seconds between one block and the next while a roll builds
  let SV = null, sRolls = 0, sDraws = 0, sT0 = 0, sKinds = [], sSeed = 1, sBlocks = [];

  function sRoll(v) {
    const n = 3 + Math.floor(v.rnd() * 3);
    sKinds = ForgeMissions.genPlan({ mods: [], len: n }).cells
      .filter(c => c.type !== "side").map(c => c.type);
    sSeed = 1 + Math.floor(v.rnd() * 1e9);
    sT0 = v.t;
    sLayout(v);
  }

  // blocks bottom to top, sized to fill the stage; widths and drift come from the roll's seed
  function sLayout(v) {
    SV = v;
    const rnd = U.mulberry(sSeed);
    const nb = sKinds.filter(k => k !== "corridor").length, nc = sKinds.length - nb;
    const bh = Math.min(0.13 * v.H, 0.86 * v.H / (nb + nc * 0.55)), ch = 0.55 * bh;
    let y = v.H / 2 + (nb * bh + nc * ch) / 2;
    const out = [];
    let prev = null;
    for (const kind of sKinds) {
      if (kind === "corridor") { out.push({ kind, h: ch }); continue; }
      const wu = kind === "start" ? 3 : kind === "boss" ? 4.4 : 2 + rnd() * 1.4;
      const w = wu * bh, lim = v.W / 2 - w / 2 - bh * 0.6;
      let cx = v.W / 2;
      if (prev) {
        const reach = (w + prev.w) / 2 - bh * 1.1;
        cx = prev.cx + (rnd() * 2 - 1) * reach;
      }
      cx = Math.max(v.W / 2 - lim, Math.min(v.W / 2 + lim, cx));
      const b = { kind, w, h: bh, cx };
      // the corridor before this block sits where it and the block below overlap
      const c = out[out.length - 1];
      if (c && c.kind === "corridor") {
        const lo = Math.max(prev.cx - prev.w / 2, cx - w / 2), hi = Math.min(prev.cx + prev.w / 2, cx + w / 2);
        c.cx = (lo + hi) / 2; c.w = bh * 0.5;
      }
      out.push(b); prev = b;
    }
    for (const b of out) { y -= b.h; b.y = y; b.x = b.cx - b.w / 2; }
    sBlocks = out;
  }

  function sSetup(v) { sRoll(v); }
  function sResize(v) { sLayout(v); }
  function sPress(x, y, v) { sRolls++; sRoll(v); return true; }
  function sMove(x, y, v) { v.cursor(true); return false; }
  function sDone(v) { return v.reduced || v.t - sT0 > sBlocks.length * BUILD + 0.05; }
  function sAtRest(v) { return sDone(v); }

  // boss pair is the range triangle's dark red (COLS.red in voidscape.js)
  const SHADE = { start: "#4e574e", corridor: "#363c36", room: "#aaa48f", boss: "#3a0609" };
  const BODY = { start: "#6f7a6f", corridor: "#4a524a", room: "#e4ddc6", boss: "#6a1a14" };

  // a flat block: hard shadow down-right, body lit from the left, a darker strip on its right edge
  function sBlock(g, b, k) {
    const sh = Math.max(2, Math.round(b.h * 0.14));
    g.fillStyle = "rgba(0,0,0,0.4)";
    g.fillRect(b.x + sh, b.y + sh, b.w, b.h);
    const strip = Math.max(2, Math.round(b.w * 0.14));
    if (b.kind === "start") {
      const sw = b.w / 3, sh3 = b.h / 3;
      for (let i = 0; i < 3; i++) {   // three stair steps climbing to the right
        const x = b.x + i * sw, top = b.y + b.h - (i + 1) * sh3;
        g.fillStyle = BODY.start; g.fillRect(x, top, sw, (i + 1) * sh3);
        g.fillStyle = SHADE.start; g.fillRect(x + sw - Math.max(2, sw * 0.12), top + sh3 * 0.2, Math.max(2, sw * 0.12), (i + 1) * sh3 - sh3 * 0.2);
      }
      return;
    }
    g.fillStyle = BODY[b.kind]; g.fillRect(b.x, b.y, b.w, b.h);
    g.fillStyle = SHADE[b.kind]; g.fillRect(b.x + b.w - strip, b.y, strip, b.h);
  }

  function sBracket(g, b) {
    const m = 8, L = 14, T = 3, l = b.x - m, t = b.y - m, r = b.x + b.w + m, bt = b.y + b.h + m;
    g.fillStyle = "#f1ecd8";
    for (const [x, y, dx, dy] of [[l, t, 1, 1], [r, t, -1, 1], [l, bt, 1, -1], [r, bt, -1, -1]]) {
      g.fillRect(dx > 0 ? x : x - L, dy > 0 ? y : y - T, L, T);
      g.fillRect(dx > 0 ? x : x - T, dy > 0 ? y : y - L, T, L);
    }
  }

  function sDraw(g, v) {
    sDraws++;
    const shown = v.reduced ? sBlocks.length : Math.floor((v.t - sT0) / BUILD) + 1;
    for (let i = 0; i < sBlocks.length && i < shown; i++) sBlock(g, sBlocks[i], i);
    if (!sRolls && sBlocks.length) sBracket(g, sBlocks[0]);
  }

  function sClient(px, py) {
    const r = SV.canvas.getBoundingClientRect();
    return { x: r.left + px, y: r.top + py };
  }
  function report() {
    if (!SV) return null;
    const pos = b => sClient(b.cx, b.y + b.h / 2);
    const steps = sBlocks.map(b => Object.assign({ kind: b.kind }, pos(b)));
    return {
      plan: steps, rolls: sRolls, marker: !sRolls, draws: sDraws,
      targets: { roll: sClient(SV.W / 2, SV.H / 2), steps: steps.map(s => ({ x: s.x, y: s.y })) },
    };
  }

  if (U && P && window.ForgeMissions) {
    P.register({ name: "vs-map", seed: 29, tick: 2147483647, setup: sSetup, draw: sDraw, resize: sResize, atRest: sAtRest, press: sPress, move: sMove });
    P.stage(document.getElementById("vs-map-stage"), "vs-map");
  }

  return { report };
})();
