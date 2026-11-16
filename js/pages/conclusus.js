/* conclusus.js — the Conclusus case page's toy: the game's shadow on the inline stage beside
   "The shadow" (Play.stage). The man stands on a ledge of a three-tier field of ledges.
   Hover and a dim green copy of him shows on the nearest ledge; click and he teleports into
   it, as S does in the game (S places one green copy, S again teleports him into it). No
   levels, no deaths: just a little thing to play with. */
(function () {
  "use strict";
  const U = window.Util, P = window.Play;
  if (!U || !P) return;

  const VW = 256, VH = 144;            // the level's grid; drawn at an integer scale
  const SOLID_ROW = [2, 3, 3, 3, 2];   // first solid grass art row per platform sprite
  const PW = 32, MAN_H = 26;           // platform sprite width, the man's height
  const CPAL = ["#b4c788", "#62554c", "#463c3c", "#f7ffc5", "#8b6a44", "#312629", "#d6f5e4", "#8a8969"];

  const DEFS = {
    cc_idle1: {w:8, h:26, ox:11, oy:6, px:'...b.......bbbb...bbbd.....dfd......dd.....gff...hhhgfg..hhhheg..hhhheh.hh.hheh.hh.hhbh.hh.hhbh.hhhhhbhhgghhhehg.dhhheed..hhhee...hhhee..hhhh.e..hhhh.e..hhhh.e..hhh..e...e...e...e...e...e...e...b...b...b...b.'},
    cc_greenA: {w:8, h:26, ox:11, oy:6, px:'...a.......aaaa...aaaa.....aaa......aa.....aaa...aaaaaa..aaaaaa..aaaaaa.aa.aaaa.aa.aaaa.aa.aaaa.aaaaaaaaaaaaaaaa.aaaaaaa..aaaaa...aaaaa..aaaa.a..aaaa.a..aaaa.a..aaa..a...a...a...a...a...a...a...a...a...a...a.'},
    cc_plat_f3g2: {w:32, h:13, ox:0, oy:13, px:'......a................a.............aa..a.......a....aaa......a.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaaaabbaaabbbaabbbaaaabaabaabaaabaaaabbbabbabbabbabbabaababbbaacbbbabbbbbabbabbabbbabbbbbbbabaaccbbbbbbbbabbbbbbbbbbbbbbbbbbbbaccbcbbbbcbbbbbbbbbbbbbbbbbbbbbbaccccbbbbcbccbbbbbbbcbcbbbbbbbbbc.cccccbbbcccccbbbbccbcbbbbbbbbc.c.ccccccccccccccbccccbcccbcbcc.c....c.cc..cc...cc....cc..ccc...........c..c.....................'},
    cc_plat_f4g4: {w:32, h:14, ox:0, oy:12, px:'a....a....a.....a..a.........a..a...a...a.a.a..aa...a..a....aa...a.aa.aa..a.a.aaaaa.aa..a.a.aa.a.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aababaaaabaabaaabbaaabbbbaabaaaaababbbbababbbaabbbaabbbbababbbbacbbbbbabbbbbbbbbbaabbbbbbbbbbbaacbbbbbbbbbbbbbabbbbbbbbbbbbbbbbaccbbcbbcbbbbbbbcbbbbbbbbbbbbbbbaccbccbbcccbbbbbbcccbbbbbbbbbbbbc.cccccbbcccbbbbbbccbbbbbbbbbbbc.c.cccccccccccccccccccbbccbcbcc.c.cccc.c..ccc...ccc..ccc..c.c.....c.c..c...c......c..c...........'},
    cc_plat_f1g5: {w:32, h:14, ox:0, oy:12, px:'.....a..............................a...a....a......a..a.....a..a..aa.a..a..a.....a.aa.aa.a.a....aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaabbaabbbbaabaabbaababbbaaaaaaababbbbbabbbababbbbbabbbbabaabaacabbbbbbbbbabbbbbbbabbbbbbbabbbacbbcbbbbbbbbbbbbbbbbbbbbbbbbabbaccbcbbcbbbbbbbbbbbbbbbbbbbbbbbbaccbbcbbcbcbbbcbbbbbbbbbbbbbbbbbc.cccccbcccccbbcbbbbbbbbbbbbbbbc.c.ccccccccccccccbccccbcccbcbcc.c....c.c...cc...cc....cc..c.c.............c............c.........'},
    cc_plat_f3g5: {w:32, h:14, ox:0, oy:12, px:'.....a..............................a...a....a......a..a.....a..a..aa.a..a..a.....a.aa.aa.a.a....aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaaaabbaaabbbaabbbaaaabaabaabaaabaaaabbbabbabbabbabbabaababbbaacbbbabbbbbabbabbabbbabbbbbbbabaaccbbbbbbbbabbbbbbbbbbbbbbbbbbbbaccbcbbbbcbbbbbbbbbbbbbbbbbbbbbbaccccbbbbcbccbbbbbbbcbcbbbbbbbbbc.cccccbbbcccccbbbbccbcbbbbbbbbc.c.ccccccccccccccbccccbcccbcbcc.c....c.cc..cc...cc....cc..ccc...........c..c.....................'},
    cc_plat_f2g2: {w:32, h:13, ox:0, oy:13, px:'......a................a.............aa..a.......a....aaa......a.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaabaaababbbbbaabaaababbbaabbaaaaababbabbbabbaabbbbaabbbabbbbabacabbabbbbabbbbbbbbbabbbbbabbbbaacbbbbbbbbbbbbbbbabbbabbbabbbbbbaccbbbccbbbbbbbbbbbbbbbbbbbbbbbbaccbbccbbcbbbcbbbbbbbbbbbbbbbbbbc.cccccbcbbcccbbbbbbbbbbbbbbbbbc.c.ccccccccccccccbccccbbccbcbcc.c....ccc..ccc..ccc.cc.cc..c.c..........c..c........c.............'},
  };

  // fixed ledges: left grid x, top line, number of platform sprites; tiers near 22%, 50% and 80% of the height
  const LEDGES = [
    { x: 4, y: 32, n: 2 }, { x: 108, y: 32, n: 1 }, { x: 192, y: 32, n: 2 },
    { x: 24, y: 72, n: 2 }, { x: 160, y: 72, n: 3 },
    { x: 8, y: 115, n: 2 }, { x: 96, y: 115, n: 2 }, { x: 192, y: 115, n: 2 },
  ];
  const START = 6, TL = 0, TR = 2;     // the man's ledge, the top-left and top-right ledges
  for (const l of LEDGES) l.w = l.n * PW;

  let V = null, S = 2, OX = 0, OY = 0, SPR = null;
  let man = null, ghost = null, ghostKey = "", bursts = [];
  let teleports = 0, draws = 0;

  function layout(v) {
    V = v;
    S = Math.max(1, Math.floor(Math.min(V.W / VW, V.H / VH)));
    OX = Math.floor((V.W - VW * S) / 2);
    OY = Math.floor((V.H - VH * S) / 2);
    const sp = d => P.sprite(CPAL, d, S);
    const flip = d => {
      let px = "";
      for (let r = 0; r < d.h; r++) px += d.px.slice(r * d.w, (r + 1) * d.w).split("").reverse().join("");
      return Object.assign({}, d, { px });
    };
    SPR = {
      idle: [sp(DEFS.cc_idle1), sp(flip(DEFS.cc_idle1))],   // facing right, facing left
      green: sp(DEFS.cc_greenA),
      plats: [DEFS.cc_plat_f3g2, DEFS.cc_plat_f4g4, DEFS.cc_plat_f1g5, DEFS.cc_plat_f3g5, DEFS.cc_plat_f2g2].map(sp),
    };
  }

  function setup(v) {
    layout(v);
    const l = LEDGES[START];
    man = { x: l.x + l.w / 2, y: l.y, face: 1 };
    ghost = null; ghostKey = ""; bursts = [];
    teleports = 0; draws = 0;
  }

  // the spot for a pointer position: the ledge whose top-line segment is nearest, x clamped onto it, whole grid units
  function spotAt(x, y) {
    const gx = (x - OX) / S, gy = (y - OY) / S;
    let best = 0, bd = Infinity;
    LEDGES.forEach((l, i) => {
      const dx = gx < l.x ? l.x - gx : gx > l.x + l.w ? gx - l.x - l.w : 0, dy = gy - l.y;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    });
    const l = LEDGES[best];
    return { ledge: best, x: Math.round(Math.min(l.x + l.w - 4, Math.max(l.x + 4, gx))), y: l.y };
  }

  function burst(x, y) {
    for (let i = 0; i < 10; i++) {
      const a = V.rnd() * U.TAU, sp = 14 + V.rnd() * 36;
      bursts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, c: i % 2 });
    }
  }

  function step(dt) {
    for (const b of bursts) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; }
    bursts = bursts.filter(b => b.life > 0);
  }

  function press(x, y) {
    const s = spotAt(x, y);
    burst(man.x, man.y - 13);
    burst(s.x, s.y - 13);
    if (s.x !== man.x) man.face = s.x > man.x ? 1 : -1;
    man.x = s.x; man.y = s.y;
    ghost = null;                      // used up; the next hover on a new spot makes a new copy
    ghostKey = s.ledge + ":" + s.x;
    if (teleports++ === 0 && P.award) P.award('play-conclusus', 'Conclusus shadow', x, y);
    V.cursor(true);
    return true;
  }

  function move(x, y) {
    V.cursor(x >= 0 && y >= 0);
    if (x < 0 && y < 0) { const had = !!ghost; ghost = null; ghostKey = ""; return had; }
    const s = spotAt(x, y), key = s.ledge + ":" + s.x;
    if (key === ghostKey) return false;
    ghostKey = key;
    const was = !!ghost;
    ghost = (s.x === man.x && s.y === man.y) ? null : s;
    return was || !!ghost;
  }

  // at rest nothing moves: only live bursts need frames
  function atRest() { return bursts.length === 0; }

  // a sprite with its bottom edge on grid row y, left edge on grid x
  function put(ctx, s, x, y) { P.blit(ctx, s, OX + x * S, OY + y * S - s.h); }

  function marker() {
    if (teleports) return null;
    const l = LEDGES[TL], cx = l.x + l.w / 2;
    return { l: cx - 7, t: l.y - MAN_H - 3, r: cx + 7, b: l.y + 3 };
  }

  function bracket(ctx, r) {
    const L = 3 * S, T = Math.max(1, Math.round(S / 2));
    const l = OX + r.l * S, t = OY + r.t * S, rr = OX + r.r * S, b = OY + r.b * S;
    ctx.fillStyle = "#f1ecd8";
    for (const [x, y, dx, dy] of [[l, t, 1, 1], [rr, t, -1, 1], [l, b, 1, -1], [rr, b, -1, -1]]) {
      ctx.fillRect(dx > 0 ? x : x - L, dy > 0 ? y : y - T, L, T);
      ctx.fillRect(dx > 0 ? x : x - T, dy > 0 ? y : y - L, T, L);
    }
  }

  function draw(ctx) {
    draws++;
    LEDGES.forEach((l, i) => {
      for (let j = 0; j < l.n; j++) {
        const k = (i + j) % 5;
        P.blit(ctx, SPR.plats[k], OX + (l.x + j * PW) * S, OY + (l.y - SOLID_ROW[k]) * S);
      }
    });
    if (ghost) {
      ctx.globalAlpha = 0.4;
      put(ctx, SPR.green, ghost.x - 4, ghost.y);
      ctx.globalAlpha = 1;
    }
    put(ctx, SPR.idle[man.face > 0 ? 0 : 1], man.x - 4, man.y);
    for (const b of bursts) {
      ctx.fillStyle = b.c ? "#f7ffc5" : "#b4c788";
      ctx.fillRect(OX + Math.round(b.x) * S, OY + Math.round(b.y) * S, S, S);
    }
    const r = marker();
    if (r) bracket(ctx, r);
  }

  function client(vx, vy) {
    const r = V.canvas.getBoundingClientRect(), k = r.width / V.W;
    return { x: r.left + (OX + vx * S) * k, y: r.top + (OY + vy * S) * k };
  }

  // test hook, every position in viewport CSS px: man and ghost = feet centre; a ledge = left, top line, width;
  // targets = click points on each ledge's top-line centre (tl, tr = the top-left and top-right ledges)
  function report() {
    if (!V || !man) return null;
    const k = V.canvas.getBoundingClientRect().width / V.W;
    const mid = l => client(l.x + l.w / 2, l.y);
    return {
      man: Object.assign(client(man.x, man.y), { face: man.face }),
      ghost: ghost ? Object.assign(client(ghost.x, ghost.y), { ledge: ghost.ledge }) : null,
      marker: !!marker(),
      teleports, bursts: bursts.length, draws,
      ledges: LEDGES.map(l => Object.assign(client(l.x, l.y), { w: l.w * S * k })).map(o => ({ x: o.x, y: o.y, w: o.w })),
      targets: { tl: mid(LEDGES[TL]), tr: mid(LEDGES[TR]), ledges: LEDGES.map(mid) },
    };
  }

  P.register({ name: "conclusus", seed: 17, tick: 2147483647, setup, step, draw, resize: layout, atRest, press, move });
  window.PlayConclusus = { report };
})();
