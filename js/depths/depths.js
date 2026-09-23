/* ===========================================================
   DEPTHS — nodes that only exist once their prerequisites are
   claimed.

   Pure data, no DOM/canvas/listeners. Sector nodes are grouped
   into clusters, each hanging off a root beacon id. A node
   inside a cluster stays hidden until every id in its `after`
   has been claimed, at which point bridge.js is free to spawn
   it the same way it spawns any other beacon node.

   Node positions are never typed by hand: each cluster picks a
   layout shape (`rows`, `arc`, `chain` or `branch`) and every
   node's offset from its root is computed from that layout plus
   the node's wave — its distance, in claim-steps, from the root.
   This keeps clusters declarative: add a node, point its
   `after` at whatever gates it, and its place in the layout
   falls out automatically. `branch` anchors each later-wave node
   to the node that unlocked it, so children fan out beneath
   their own parent rather than sharing a row.

     Depths.nodes()     -> array of flattened node defs, one per
                           node, in cluster / wave / declaration
                           order (a copy, not the module's own
                           array)
     Depths.clusters()  -> array of the raw cluster defs (a copy)

     A cluster's optional `par` overrides the parallax its nodes
     spawn with (bridge.js falls back to the root beacon's own par
     when a cluster has none).

     Cluster data lives in the sibling files (zero, voidscape,
     heavylight, conclusus, lore), each registered with
     `Depths.add`; load order is cluster order.
   =========================================================== */

window.Depths = (function () {

  const CLUSTERS = [];

  function add(cluster) { CLUSTERS.push(cluster); }

  // waveOf: id -> wave number, computed to a fixed point. Root
  // is wave 0. A node's wave is 1 + the max wave of the ids in
  // its `after`; an id in `after` that isn't the root and isn't
  // in the cluster counts as wave 0.
  function waveOf(cluster) {
    const wave = new Map();
    wave.set(cluster.root, 0);
    cluster.nodes.forEach(function (n) { wave.set(n.id, 0); });

    let changed = true;
    while (changed) {
      changed = false;
      cluster.nodes.forEach(function (n) {
        let maxW = -1;
        n.after.forEach(function (id) {
          const w = wave.has(id) ? wave.get(id) : 0;
          if (w > maxW) maxW = w;
        });
        const newW = maxW + 1;
        if (wave.get(n.id) !== newW) {
          wave.set(n.id, newW);
          changed = true;
        }
      });
    }
    return wave;
  }

  const LAYOUTS = {
    rows: function (w, i, n, L, k, ctx) {
      const u = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
      const row = L.rows[Math.min(w, L.rows.length) - 1];
      const extra = Math.max(0, w - L.rows.length);
      const dx = (row.dx || 0) + u * row.spread / 2;
      const dy = row.dy + (row.arch || 0) * Math.abs(u) + 0.12 * extra;
      return { dx: dx, dy: dy };
    },
    arc: function (w, i, n, L, k, ctx) {
      const ring = L.rings[Math.min(w, L.rings.length) - 1];
      const extra = Math.max(0, w - L.rings.length);
      const r = ring.r + 0.08 * extra;
      const a = (n === 1 ? (ring.from + ring.to) / 2 : ring.from + (ring.to - ring.from) * i / (n - 1)) * Math.PI / 180;
      const dx = r * Math.cos(a);
      const dy = r * Math.sin(a) * (L.squash || 1.2);
      return { dx: dx, dy: dy };
    },
    chain: function (w, i, n, L, k, ctx) {
      const dx = k * L.step[0];
      const dy = k * L.step[1] + (L.zig ? (k % 2 ? L.zig : -L.zig) : 0);
      return { dx: dx, dy: dy };
    },
    // branch: roots off L.start/L.step like a mini chain, but every
    // later-wave node anchors to whichever node unlocked it, fanning
    // out beneath that parent instead of sharing a row with siblings.
    branch: function (w, i, n, L, k, ctx) {
      if (!ctx.parent) {
        return { dx: L.start[0] + i * L.step[0], dy: L.start[1] + i * L.step[1] };
      }
      return {
        dx: ctx.parent.dx + (ctx.j - (ctx.m - 1) / 2) * L.fan.gap,
        dy: ctx.parent.dy + L.fan.dy
      };
    }
  };

  function nodes() {
    const out = [];

    CLUSTERS.forEach(function (cluster) {
      const layoutFn = LAYOUTS[cluster.layout.shape];
      if (!layoutFn) {
        console.error("depths: unknown layout " + cluster.layout.shape);
        return;
      }

      const wave = waveOf(cluster);

      // Group nodes by wave, keeping declaration order within a wave.
      const waveGroups = new Map();
      cluster.nodes.forEach(function (n) {
        const w = wave.get(n.id);
        if (!waveGroups.has(w)) waveGroups.set(w, []);
        waveGroups.get(w).push(n);
      });

      const waveNums = Array.from(waveGroups.keys()).sort(function (a, b) { return a - b; });

      const posOf = new Map();

      // anchorOf: the id in node.after that belongs to this cluster
      // (present in `wave`, not the root) with the highest wave. Ties
      // go to the first such id in `after` order. null if there is none.
      function anchorOf(node) {
        let best = null;
        let bestW = -1;
        node.after.forEach(function (id) {
          if (id === cluster.root || !wave.has(id)) return;
          const w = wave.get(id);
          if (w > bestW) {
            bestW = w;
            best = id;
          }
        });
        return best;
      }

      let k = 0;
      waveNums.forEach(function (w) {
        const group = waveGroups.get(w);
        const n = group.length;

        // Sibling indices: nodes sharing an anchor (or the root, if
        // anchorless) get consecutive j's and share m, the count.
        const anchorCounts = new Map();
        const js = [];
        group.forEach(function (node) {
          const key = anchorOf(node) || cluster.root;
          const j = anchorCounts.get(key) || 0;
          anchorCounts.set(key, j + 1);
          js.push(j);
        });

        group.forEach(function (node, i) {
          k++;
          const a = anchorOf(node);
          const m = anchorCounts.get(a || cluster.root);
          const ctx = { parent: a ? posOf.get(a) || null : null, j: js[i], m: m };
          const pos = layoutFn(w, i, n, cluster.layout, k, ctx);
          const dx = Math.round(pos.dx * 1000) / 1000;
          const dy = Math.round(pos.dy * 1000) / 1000;
          const size = Math.round(cluster.size * Math.pow(0.92, w - 1) * 1000) / 1000;

          posOf.set(node.id, { dx: dx, dy: dy });

          out.push({
            id: node.id,
            root: cluster.root,
            from: a || cluster.root,
            after: node.after,
            dx: dx,
            dy: dy,
            theme: cluster.theme,
            size: size,
            par: cluster.par,
            xp: node.xp || 1,
            name: node.name,
            sub: node.sub,
            wide: !!node.wide,
            html: node.html,
            at: node.at || null
          });
        });
      });
    });

    return out;
  }

  return { nodes: nodes, clusters: function () { return CLUSTERS.slice(); }, add: add };
})();
