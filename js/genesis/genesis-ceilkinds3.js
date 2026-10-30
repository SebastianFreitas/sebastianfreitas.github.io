/* Hanger and eyes for the Genesis ceiling. worm uses the same draw signature and look object as genesis-ceilkinds2.js (ctx, o, x, y, H, p, t, sc, pal):
   1-3 pale ringed worms, a travelling wave and a slow curl along each. eye / eyeSite draw a metal rock's eye sites: a hairline crack that now and then
   splits open into an almond (lids from the rock tones) with one of four looks inside, no glow. One eye open on screen at a time: a module-level
   scheduler picks which seen eye opens, every 3-6 s.
   Not registered in GenCeilKinds; genesis-ceiling.js reads GenCeilHang3.kinds[name] = { name, len, n, draw }. No per-frame allocation. */
(function () {
  "use strict";
  function rgba(h, a) { return "rgba(" + parseInt(h.slice(1, 3), 16) + "," + parseInt(h.slice(3, 5), 16) + "," + parseInt(h.slice(5, 7), 16) + "," + a + ")"; }
  function sm(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  const TAU = Math.PI * 2, SEG = 14, PX = new Float32Array(SEG + 1), PY = new Float32Array(SEG + 1);

  const WC = [4, 12, 9, 10], WR = [3, 5];
  // eye colours (the palette has no red): red, shaded red, gold, pale bluish white, dark socket
  const RED = "#a63a36", RED_SHADE = "#5c2020", GOLD = "#c49a3c", PALE = "#c9d3dc", EYE_DARK = "#0d1114";

  // a pale ringed worm hanging from (x, y): the wave runs down the body, the curl drifts slowly
  function body(ctx, x, y, L, w0, ring, curl, ph, sp, t, c, rc) {
    for (let i = 0; i <= SEG; i++) {
      const s = i / SEG;
      PX[i] = x + (Math.sin(s * 5 - t * sp + ph) * 0.09 * L + curl * L * s * s * Math.sin(t * 0.25 + ph * 0.7)) * s;
      PY[i] = y + L * s * (1 - 0.05 * s);
    }
    ctx.fillStyle = rgba(c, 0.95);
    ctx.beginPath();
    for (let i = 0; i <= SEG; i++) { const hw = w0 * (1 - 0.8 * i / SEG) / 2; if (i) ctx.lineTo(PX[i] - hw, PY[i]); else ctx.moveTo(PX[i] - hw, PY[i]); }
    const he = w0 * 0.2 / 2;
    ctx.arc(PX[SEG], PY[SEG], he, Math.PI, 0, true);
    for (let i = SEG; i >= 0; i--) ctx.lineTo(PX[i] + w0 * (1 - 0.8 * i / SEG) / 2, PY[i]);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(rc, 0.45); ctx.lineWidth = Math.max(0.6, w0 * 0.1); ctx.lineCap = "butt";
    ctx.beginPath();
    for (let i = 1; i < SEG; i += ring) {
      const dx = PX[i + 1] - PX[i - 1], dy = PY[i + 1] - PY[i - 1], d = Math.sqrt(dx * dx + dy * dy) || 1, hw = w0 * (1 - 0.8 * i / SEG) / 2;
      ctx.moveTo(PX[i] - dy / d * hw, PY[i] + dx / d * hw); ctx.lineTo(PX[i] + dy / d * hw, PY[i] - dx / d * hw);
    }
    ctx.stroke();
  }

  function worm(ctx, o, x, y, H, p, t, sc, pal) {
    const n = Math.max(1, Math.min(3, o.n | 0)), K = pal.kind, tk = o.tk || 1, L0 = o.len * H * p, c = K[WC[Math.floor(o.rnd(5) * 4)]], rc = K[WR[o.rnd(6) < 0.5 ? 0 : 1]];
    for (let j = 0; j < n; j++) {
      const r = o.rnd(40 + j), L = L0 * (0.5 + 0.5 * r), w0 = Math.min((7 + 5 * o.rnd(50 + j)) * (0.7 + 0.4 * tk) * sc, L / 6), ox = (j - (n - 1) / 2) * 7 * sc;
      body(ctx, x + ox, y - 3, L + 3, w0, 1 + Math.floor(o.rnd(60 + j) * 3), (o.rnd(70 + j) - 0.5) * 0.7, o.ph + j * 2.1 + o.rnd(80 + j) * 3, 0.9 + o.rnd(90 + j) * 1.1, t, c, rc);
    }
  }

  // colour + alpha strings for the eyes (hex or rgb() in), built once per pair
  const caCache = new Map();
  function ca(c, a) {
    let m = caCache.get(c);
    if (!m) { m = new Map(); caCache.set(c, m); }
    let s = m.get(a);
    if (!s) { s = c.charAt(0) === "#" ? rgba(c, a) : c.replace("rgb(", "rgba(").replace(")", "," + a + ")"); m.set(a, s); }
    return s;
  }

  // the eye scheduler: eyes report in as they draw; at each due time one eye seen in the last half second is chosen
  const cands = [];
  let nextAt = -1, cur = null, openAt = 0, ev = 0, glance = 0;
  const T_OPEN = 0.35, T_HOLD = 1.5, T_CLOSE = 0.3;
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function tick(t) {
    if (nextAt < 0 || t < nextAt - 40 || t > nextAt + 60) { nextAt = t + 5 + 20 * hash(++ev); cur = null; }
    if (cur && t > openAt + T_OPEN + T_HOLD + T_CLOSE) cur = null;
    if (!cur && t >= nextAt) {
      let k = 0;
      for (let i = 0; i < cands.length; i++) if (t - cands[i]._seen < 0.5) cands[k++] = cands[i]; else cands[i]._in = false;
      cands.length = k;
      if (k) { cur = cands[Math.floor(hash(++ev * 1.9) * k)]; openAt = t; nextAt = t + 25 + 15 * hash(++ev * 2.3); }   // one eye opens at most once in 25-40 s
      else nextAt = t + 0.5;
    }
  }

  // an eye in the rock's local space at (x, y), long axis rotated by ang. size = open almond height; open01 0 = hairline crack, 1 = open; look 0-3:
  // red iris + dark pupil + highlight, plain shaded red ball, pale eyeball + dark pupil, gold iris + vertical slit. glance (0-1 of the hold) slides the iris once.
  function eye(ctx, x, y, size, ang, open01, look, glanceU, lid, lip) {
    const hw = Math.max(size * 1.25, 15), hh = size / 2, o = open01;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (o <= 0.02) {
      const sh = Math.max(2.5, hh * 0.3);   // a shut eye: a dark almond lid with a faint lit rim below and a thin dull glow in its slit
      ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.quadraticCurveTo(0, -2 * sh, hw, 0); ctx.quadraticCurveTo(0, 2 * sh, -hw, 0); ctx.closePath();
      ctx.fillStyle = EYE_DARK; ctx.fill();
      ctx.strokeStyle = ca(lid, 1); ctx.lineWidth = 2.2; ctx.stroke();
      ctx.strokeStyle = ca(lip, 0.7); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-hw * 0.85, 3.4 + sh * 0.3); ctx.quadraticCurveTo(0, 2 * sh + 3.4, hw * 0.85, 3.4 + sh * 0.3); ctx.stroke();
      ctx.strokeStyle = ca(RED_SHADE, 0.7); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-hw * 0.5, 0); ctx.lineTo(hw * 0.5, 0); ctx.stroke();
      ctx.restore(); return;
    }
    const ah = hh * o;
    ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.quadraticCurveTo(0, -2 * ah, hw, 0); ctx.quadraticCurveTo(0, 2 * ah, -hw, 0); ctx.closePath();
    ctx.fillStyle = ca(lid, 1); ctx.fill();
    ctx.save(); ctx.clip();
    const r = hh * 0.95, cx = sm((glanceU - 0.35) / 0.15) * hw * 0.22 * (Math.sin(ang * 97 + look) < 0 ? -1 : 1);
    if (look === 0) {
      ctx.fillStyle = EYE_DARK; ctx.fillRect(-hw, -hh, hw * 2, size);
      ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(cx, 0, r, 0, TAU); ctx.fill();
      ctx.fillStyle = EYE_DARK; ctx.beginPath(); ctx.arc(cx, 0, r * 0.45, 0, TAU); ctx.fill();
      ctx.fillStyle = PALE; ctx.beginPath(); ctx.arc(cx - r * 0.3, -r * 0.3, r * 0.16, 0, TAU); ctx.fill();
    } else if (look === 1) {
      ctx.fillStyle = EYE_DARK; ctx.fillRect(-hw, -hh, hw * 2, size);
      ctx.fillStyle = RED_SHADE; ctx.beginPath(); ctx.arc(cx, 0, r, 0, TAU); ctx.fill();
      ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(cx - r * 0.14, -r * 0.1, r * 0.78, 0, TAU); ctx.fill();
    } else if (look === 2) {
      ctx.fillStyle = PALE; ctx.fillRect(-hw, -hh, hw * 2, size);
      ctx.fillStyle = EYE_DARK; ctx.beginPath(); ctx.arc(cx * 1.4, 0, r * 0.42, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = EYE_DARK; ctx.fillRect(-hw, -hh, hw * 2, size);
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(cx, 0, r, 0, TAU); ctx.fill();
      ctx.fillStyle = EYE_DARK; ctx.beginPath(); ctx.ellipse(cx, 0, r * 0.14, r * 0.8, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(-hw, 0); ctx.quadraticCurveTo(0, -2 * ah, hw, 0); ctx.quadraticCurveTo(0, 2 * ah, -hw, 0); ctx.closePath();
    ctx.strokeStyle = ca(lid, 1); ctx.lineWidth = 2.2; ctx.stroke();
    ctx.strokeStyle = ca(lip, 0.55); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-hw * 0.9, 2.6 + ah * 0.2); ctx.quadraticCurveTo(0, 2 * ah + 2.6, hw * 0.9, 2.6 + ah * 0.2); ctx.stroke();
    ctx.restore();
  }

  // one eye site e = {x, y, a, look} of a rock: reports to the scheduler when vis (on screen), works out its open amount, draws
  function eyeSite(ctx, e, size, t, vis, lid, lip) {
    if (vis) {
      if (!e._in) { e._in = true; cands.push(e); }
      e._seen = t;
    }
    tick(t);
    let a = 0;
    glance = 0;
    if (e.forceOpen !== undefined) { a = e.forceOpen; glance = a >= 1 ? 1 : 0; }
    else if (cur === e) {
      const d = t - openAt;
      a = d < T_OPEN ? sm(d / T_OPEN) : d < T_OPEN + T_HOLD ? 1 : sm(1 - (d - T_OPEN - T_HOLD) / T_CLOSE);
      if (d >= T_OPEN) glance = Math.min(1, (d - T_OPEN) / T_HOLD);   // stays slid through the close
    }
    eye(ctx, e.x, e.y, size, e.a, a, e.look | 0, glance, lid, lip);
  }

  window.GenCeilHang3 = {
    kinds: {
      worm: { name: "worm", len: [0.07, 0.14], n: [1, 3], draw: worm }
    },
    eye: eye,
    eyeSite: eyeSite
  };
})();
