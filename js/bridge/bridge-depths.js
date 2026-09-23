/* js/bridge/bridge-depths.js — nodes that come into range once what they hang off has been filed */
(function () {
  const B = window.Bridge;
  if (!B) return;
  const { MARKS, PLANETS, CAM, FLY_GAP, noteEls, onScreen, wx } = B;

  /* ---- the depths -------------------------------------------
     Some nodes are not on the map when you arrive. They come into
     range when the ones they hang off have been filed — one node,
     or several wired together. depths.js holds the graph; all this
     does is place what the graph says has been earned. Nodes hang
     off any beacon (root), placed relative to it; they fly out of
     it when earned live.
     State is the XP ledger, so it survives a reload for free. ---- */
  const spawned = new Set();
  const depthNodes = new Map();   // id -> spawned node, for depthAlpha()
  const DEPTH_OFF_MAX = 0.44, DEPTH_OY_MIN = 0.16, DEPTH_OY_MAX = 0.66;

  function spawnDepth(def, animate, delay) {
    const root = MARKS.concat(PLANETS).find(m => m.id === def.root);
    if (!root) return false;
    const origin = MARKS.concat(PLANETS).find(m => m.id === def.from) || root;   // the beacon that unlocked it, so the line leaves from there
    const list = MARKS.includes(root) ? MARKS : PLANETS;
    let off, oy, cam;
    if (def.at) {
      cam = def.at[0];
      off = 0;
      oy = def.at[1];
    } else {
      off = Math.min(DEPTH_OFF_MAX, Math.max(-DEPTH_OFF_MAX, root.off + def.dx));
      oy = Math.min(DEPTH_OY_MAX, Math.max(DEPTH_OY_MIN, root.oy + def.dy));
      cam = root.cam;
    }
    const node = {
      id: def.id, root: def.root, from: origin.id, cam: cam, off, oy, par: def.par || root.par,
      theme: def.theme, size: def.size, xp: def.xp,
      name: def.name, sub: def.sub,
    };
    node.x = node.cam + (off * CAM.viewUnits) / node.par;
    node.phase = list.length * 1.7 + 4;
    node.vis = 0;
    node.pop = 0;
    node.shown = animate ? 0 : 1;   // world-art alpha: a restore shows it at once, a live reveal fades it in
    if (animate) {
      if (onScreen(wx(node.x, node.par), 60)) node.fly = { from: origin, t: -(delay || 0) };
      else { node.shown = 1; node.cue = 0; node.unseen = true; node.cueFrom = origin; }   // off screen: the art is simply there; a cue points the way (see drawCue)
    }
    list.push(node);
    depthNodes.set(def.id, node);

    /* the panel is built here rather than sitting in index.html,
       so the markup can't be read ahead of being earned */
    const anchor = document.getElementById(def.root);
    if (anchor && anchor.parentNode && !document.getElementById(def.id)) {
      const aside = document.createElement("aside");
      aside.className = "bnote deep" + (def.wide ? " wide" : "");
      aside.id = def.id;
      aside.innerHTML = def.html;
      anchor.parentNode.appendChild(aside);
      noteEls[def.id] = aside;
    }
    spawned.add(def.id);
    return true;
  }
  B.spawnDepth = spawnDepth;

  /* run to a fixed point: a wave can satisfy the next one's
     prerequisites, which matters on a reload where the whole ledger
     is already there and every wave lands in the same pass */
  function revealDepths(animate) {
    if (!window.Depths) return;
    const defs = Depths.nodes();
    let added = 0, moved = true;
    while (moved) {
      moved = false;
      for (const d of defs) {
        if (spawned.has(d.id) || document.getElementById(d.id)) continue;
        if (!window.XP) return;
        if (!d.after.every(id => XP.has("beacon-" + id))) continue;
        if (spawnDepth(d, animate, added * FLY_GAP)) { moved = true; added++; }
      }
    }
    if (!added) return;
    B.rebuildTrack();
    if (animate) B.log.push(`signal resolved — ${added} contact${added > 1 ? "s" : ""} in range`, "good");
  }
  B.revealDepths = revealDepths;

  revealDepths(false);
  addEventListener("pageshow", e => { if (e.persisted) revealDepths(false); });
  addEventListener("storage", () => revealDepths(false));

  window.depthsReport = () => MARKS.concat(PLANETS).filter(m => m.root).map(m => ({
    id: m.id, root: m.root, from: m.from, off: m.off, oy: m.oy, x: m.x, flying: !!m.fly, cue: !!m.unseen,
    wide: !!(noteEls[m.id] && noteEls[m.id].classList.contains("wide")),
  }));
  window.depthsReveal = () => revealDepths(true);   // debug: replay a live reveal (fly-out) without flying the ship
  window.depthAlpha = id => { const m = depthNodes.get(id); if (!m || m.fly) return 0; const k = m.shown; return k * k * (3 - 2 * k); };   // world.js multiplies a node's art by this — 0 while it flies, then eases to 1 (off-screen reveals are already 1)
})();
