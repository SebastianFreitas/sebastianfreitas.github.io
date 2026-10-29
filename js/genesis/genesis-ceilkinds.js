/* Registry of the things that hang from the Genesis ceiling's solid washes. Family files
   (genesis-ceilkinds-plant/-metal/-cloud/-odd.js) call add(family, name, draw, opts) after this loads.
   draw(ctx, o, x, y, H, p, t, sc, pal): x,y the root, p growth 0..1 (slide-out), t time (slow sway), sc size scale;
   o carries the seeded fields (len, w, ph, amp, dir, n, rnd(i) -> 0..1); pal = { rgba(hex, a), hash(n), obj[], kind[] }.
   opts: len [min,max] (fraction of H), n [min,max] (integer count), big (rare large piece, at most 2 a screen). */
(function () {
  "use strict";
  const KINDS = [];

  function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function hexRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function rgba(h, a) { const c = hexRgb(h); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  function add(family, name, draw, opts) {
    const o = opts || {};
    const k = { family: family, name: name, draw: draw, len: o.len || [0.05, 0.12], n: o.n || [3, 5], big: !!o.big };
    KINDS.push(k);
    return k;
  }
  function list() { return KINDS.slice(); }

  // rnd in 0..1 (called in order): family first, equal weight per family, then a kind within it
  function pick(rnd, allowBig) {
    const pool = allowBig === false ? KINDS.filter(function (k) { return !k.big; }) : KINDS;
    const fams = [];
    for (let i = 0; i < pool.length; i++) if (fams.indexOf(pool[i].family) < 0) fams.push(pool[i].family);
    if (!fams.length) return null;
    const f = fams[Math.min(fams.length - 1, Math.floor(rnd() * fams.length))];
    const ks = pool.filter(function (k) { return k.family === f; });
    return ks[Math.min(ks.length - 1, Math.floor(rnd() * ks.length))];
  }

  // one card per registered kind (the ceiling sizes its cycle by list().length): two cards in three are the
  // originals (never the same twice running), the third an extra, and the last card is always an extra so the
  // seam to the next deck never repeats. Each card is a fresh object, so the ceiling's tail swap never fires.
  function deck(seed) {
    const n = KINDS.length, ex = [], d = [];
    for (let i = 0; i < EXTRAS.length; i++) {
      const f = EXTRAS[i].split(":");
      for (let j = 0; j < KINDS.length; j++) if (KINDS[j].family === f[0] && KINDS[j].name === f[1] && ORIG.indexOf(KINDS[j]) < 0) { ex.push(KINDS[j]); break; }
    }
    if (!ex.length) return KINDS.slice();
    let bag = [], prevO = -1, prevE = null;
    const fins = [];
    for (let i = 0; i < n; i++) {
      let k;
      if (i % 3 === 2 || i === n - 1) {
        if (!bag.length) {
          bag = ex.slice();
          for (let a = bag.length - 1; a > 0; a--) { const b = Math.floor(hash(seed * 53.9 + i * 7.1 + a * 2.3) * (a + 1)), x = bag[a]; bag[a] = bag[b]; bag[b] = x; }
        }
        let at = bag.length - 1;
        if (bag[at] === prevE && at > 0) at--;
        k = bag.splice(at, 1)[0]; prevE = k;
      } else {
        let q = Math.floor(hash(seed * 31.7 + i * 5.3) * ORIG.length);
        const finOk = !fins.some(function (j) { const g = Math.abs(i - j); return Math.min(g, n - g) < 6; });
        if ((ORIG[q].big && !finOk) || (i % 3 === 1 && q === prevO)) {
          const c = [];
          for (let a = 0; a < ORIG.length; a++) if (!(ORIG[a].big && !finOk) && !(i % 3 === 1 && a === prevO)) c.push(a);
          q = c[Math.floor(hash(seed * 11.1 + i) * c.length)];
        }
        if (ORIG[q].big) fins.push(i);
        prevO = q;
        k = ORIG[q];
      }
      d.push(Object.create(k));
    }
    return d;
  }

  function palette() {
    const P = window.GenEldPal;
    return { rgba: rgba, hash: hash, obj: P.CEILOBJ, kind: P.CEILKIND };
  }

  const TAU = Math.PI * 2;
  function blob(ctx, pts) {
    const n = pts.length, m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], s0 = m(pts[n - 1], pts[0]);
    ctx.beginPath(); ctx.moveTo(s0[0], s0[1]);
    for (let i = 0; i < n; i++) { const e = m(pts[i], pts[(i + 1) % n]); ctx.quadraticCurveTo(pts[i][0], pts[i][1], e[0], e[1]); }
    ctx.closePath(); ctx.fill();
  }
  function lump(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), rot || 0, 0, TAU); ctx.fill(); }

  // hanger colours from the washed palette: greens, teals, a dull ochre, a muted violet (o.ci picks one)
  const HUES = [(P) => "#7f9a7a", (P) => P.kind[0], (P) => P.kind[14], (P) => P.kind[15], (P) => P.obj[2], (P) => P.kind[12], (P) => P.kind[1]];
  function sprout(ctx, o, x, y, H, p, t, sc, pal) {
    const L = o.len * H * p, seg = 12, tk = o.tk || 1, w0 = Math.max(9 * sc, (5 + 3 * o.w) * tk * sc), w1 = Math.max(5 * sc, 3 * Math.min(tk, 1.4) * sc), wv = o.wv || 1, cv = o.cv === undefined ? 1 : o.cv;
    const c0 = hexRgb(o.ci === undefined ? "#7f9a7a" : HUES[o.ci % HUES.length](pal)), col = "#" + c0.map((v) => ("0" + Math.round(v + (255 - v) * 0.4).toString(16)).slice(-2)).join("");   // pulled toward white: a dark teal stem vanished against the navy lobe
    const pts = [];
    for (let i = 0; i <= seg; i++) {
      const s = i / seg;
      pts.push([x + (Math.sin(s * 4 + o.ph + t * 0.45) * 7 * wv + Math.sin(t * 0.3 + o.ph) * 8 * s) * o.amp * s * sc, y - 3 + (L + 3) * s]);
    }
    ctx.fillStyle = rgba(col, 0.85);
    ctx.beginPath();
    for (let i = 0; i <= seg; i++) { const hw = (w0 + (w1 - w0) * i / seg) / 2; if (i) ctx.lineTo(pts[i][0] - hw, pts[i][1]); else ctx.moveTo(pts[i][0] - hw, pts[i][1]); }
    for (let i = seg; i >= 0; i--) { const hw = (w0 + (w1 - w0) * i / seg) / 2; ctx.lineTo(pts[i][0] + hw, pts[i][1]); }
    ctx.closePath();
    ctx.fill();
    // curled tip: a small spiral winding in
    if (!cv) return;
    const e = pts[seg], r0 = (6 + o.w * 5) * sc * p, steps = [0, 18, 34, 52][cv];
    ctx.strokeStyle = rgba(col, 0.85); ctx.lineWidth = w1; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(e[0], e[1]);
    for (let q = 1; q <= steps; q++) {
      const th = (o.dir > 0 ? Math.PI : 0) - q * 0.32 * o.dir, rr = r0 * (1 - q / (steps + 4));
      ctx.lineTo(e[0] + r0 * o.dir + Math.cos(th) * rr, e[1] + Math.sin(th) * rr);
    }
    ctx.stroke();
  }

  function tuft(ctx, o, x, y, H, p, t, sc, pal) {
    for (let b = 0; b < o.n; b++) {
      const f = o.n > 1 ? (b / (o.n - 1) - 0.5) * (o.sp || 1) : 0, tcol = o.ci === undefined ? pal.obj[2] : HUES[o.ci % HUES.length](pal);
      const L = o.len * H * p * (0.75 + 0.25 * hash(o.ph + b)), bend = (hash(o.ph + b * 2.1) - 0.5) * 30 * sc + Math.sin(t * 0.5 + o.ph + b) * 3;
      const bx = x + f * 22 * sc, tx = bx + f * 14 * sc + bend, w = (1.5 + hash(b + o.ph)) * (o.tk || 1) * sc;
      ctx.fillStyle = rgba(tcol, b & 1 ? 0.95 : 0.8);
      ctx.beginPath();
      ctx.moveTo(bx - w, y - 4);
      ctx.quadraticCurveTo(bx - w * 0.5 + bend * 0.1, y + L * 0.6, tx, y + L);
      ctx.quadraticCurveTo(bx + w * 0.5 + bend * 0.9, y + L * 0.5, bx + w, y - 4);
      ctx.closePath();
      ctx.fill();
    }
  }

  const TONES = [[3, 4, 5, 6], [4, 3, 6, 5], [0, 3, 5, 6]];
  // nested metal arcs: concentric crescent bands hanging from the rim and curling back, flat light/dark steel facets, a thin highlight
  function fin(ctx, o, x, y, H, p, t, sc, pal) {
    const OBJ = pal.obj, TN = TONES[o.tone || 0], R0 = H * o.len * p, cx = x + R0 * 0.9, cy = y - 2, sw = Math.sin(t * 0.3 + o.ph) * 0.03;
    for (let i = 0; i < o.n; i++) {
      const ro = R0 * (1 - i * 0.15), wd = R0 * (0.075 + 0.02 * hash(i + o.ph)), ri = ro - wd;
      const a0 = Math.PI + sw, a1 = Math.PI * ((o.ang || 0.32) + 0.1 * hash(i + 4.4)) + sw, am = a0 + (a1 - a0) * 0.45;
      const band = (s, e, col) => {
        ctx.beginPath();
        ctx.arc(cx, cy, ro, s, e, true);
        ctx.arc(cx, cy, ri, e, s, false);
        ctx.closePath();
        ctx.fillStyle = col; ctx.fill();
      };
      band(a0, am, rgba(OBJ[i & 1 ? TN[1] : TN[0]], 0.96));
      band(am, a1, rgba(OBJ[i & 1 ? TN[3] : TN[2]], 0.96));
      ctx.strokeStyle = rgba(OBJ[5], 0.7); ctx.lineWidth = Math.max(1, sc); ctx.lineCap = "butt";
      ctx.beginPath(); ctx.arc(cx, cy, ro - wd * 0.15, a0 - 0.05, a0 + (am - a0) * 0.8, true); ctx.stroke();
    }
  }

  const ORIG = [
    add("plant", "sprout", sprout, { len: [0.08, 0.2] }),
    add("plant", "tuft", tuft, { len: [0.04, 0.07], n: [4, 6] }),
    add("metal", "fin", fin, { len: [0.08, 0.105], n: [2, 4], big: true })
  ];
  // the only other kinds ever dealt (family:name), one card in three; the rest stay registered but unused
  const EXTRAS = ["plant:pinchmass", "plant:lumpmass", "plant:lobecluster", "plant:crookedlobes",
    "metal:kinkbar", "metal:splitwedge", "metal:shearpair", "metal:gnarl",
    "cloud:swellrun", "cloud:sagmass", "cloud:bellymass", "cloud:cellmass"];

  window.GenCeilKinds = { hues: HUES, add: add, list: list, pick: pick, deck: deck, palette: palette };
})();
