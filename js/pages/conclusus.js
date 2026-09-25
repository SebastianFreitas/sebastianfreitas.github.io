/* conclusus.js — the Conclusus case page becomes a vertical platformer level in
   the free space beside the text: grass platforms with planted shadow twins,
   silhouette enemies on a green/silver cycle, spinning pins, a turning key
   symbol and an exit arch. The player teleports between shadows; when his
   platform scrolls out of view he teleports into whichever shadow sits
   nearest the middle of the screen, following the reader down the page. */
(function () {
  "use strict";
  const U = window.Util, P = window.Play;
  if (!U || !P) return;

  const GREEN = "180,199,136", PALE = "247,255,197", RAIN = "175,192,132";
  const PLAT_W = 64, PLAT_H = 28;      // 32x14 art at 2x
  const MAN_W = 16, MAN_H = 52;
  const SWAP = 0.25;                   // shadow/silhouette frame swap (game)
  const CYCLE = 1.2;                   // silhouette state length (game: 0.2 s + 1 s)
  const COOL = 0.7;                    // seconds between camera-follow teleports
  const GRAV = 1400;
  const CPAL = ["#b4c788", "#62554c", "#463c3c", "#f7ffc5", "#8b6a44", "#312629", "#d6f5e4", "#8a8969"];
  const MODES = [{ spin: 60, dur: 3 }, { spin: 120, dur: 1.5 }, { spin: 240, dur: 0.5 }, { spin: 300, dur: 0.8 }];
  const PIN_FRAMES = [6, 5, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5];

  const DEFS = {
    cc_idle1: {w:8, h:26, ox:11, oy:6, px:'...b.......bbbb...bbbd.....dfd......dd.....gff...hhhgfg..hhhheg..hhhheh.hh.hheh.hh.hhbh.hh.hhbh.hhhhhbhhgghhhehg.dhhheed..hhhee...hhhee..hhhh.e..hhhh.e..hhhh.e..hhh..e...e...e...e...e...e...e...b...b...b...b.'},
    cc_idle2: {w:8, h:25, ox:11, oy:7, px:'...b.......bbbb...bbbd.....dfd......dd.....gff...hhhgfg..hhhheg..hhhheh.hh.hheh.hh.hhbh.hh.hhbhhgghhhbhg.dhhhehd..hhhee...hhhee...hhhee..hhhh.e..hhhh.e..hhhh.e..hhh..e...e...e...e...e...b...b...b...b.'},
    cc_greenA: {w:8, h:26, ox:11, oy:6, px:'...a.......aaaa...aaaa.....aaa......aa.....aaa...aaaaaa..aaaaaa..aaaaaa.aa.aaaa.aa.aaaa.aa.aaaa.aaaaaaaaaaaaaaaa.aaaaaaa..aaaaa...aaaaa..aaaa.a..aaaa.a..aaaa.a..aaa..a...a...a...a...a...a...a...a...a...a...a.'},
    cc_greenB: {w:8, h:25, ox:11, oy:7, px:'...a.......aaaa...aaaa.....aaa......aa.....aaa...aaaaaa..aaaaaa..aaaaaa.aa.aaaa.aa.aaaa.aa.aaaaaaaaaaaaa.aaaaaaa..aaaaa...aaaaa...aaaaa..aaaa.a..aaaa.a..aaaa.a..aaa..a...a...a...a...a...a...a...a...a.'},
    cc_silverA: {w:8, h:26, ox:11, oy:6, px:'...g.......gggg...gggg.....ggg......gg.....ggg...gggggg..gggggg..gggggg.gg.gggg.gg.gggg.gg.gggg.gggggggggggggggg.ggggggg..ggggg...ggggg..gggg.g..gggg.g..gggg.g..ggg..g...g...g...g...g...g...g...g...g...g...g.'},
    cc_silverB: {w:8, h:25, ox:11, oy:7, px:'...g.......gggg...gggg.....ggg......gg.....ggg...gggggg..gggggg..gggggg.gg.gggg.gg.gggg.gg.ggggggggggggg.ggggggg..ggggg...ggggg...ggggg..gggg.g..gggg.g..gggg.g..ggg..g...g...g...g...g...g...g...g...g.'},
    cc_plat_f3g2: {w:32, h:13, ox:0, oy:13, px:'......a................a.............aa..a.......a....aaa......a.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaaaabbaaabbbaabbbaaaabaabaabaaabaaaabbbabbabbabbabbabaababbbaacbbbabbbbbabbabbabbbabbbbbbbabaaccbbbbbbbbabbbbbbbbbbbbbbbbbbbbaccbcbbbbcbbbbbbbbbbbbbbbbbbbbbbaccccbbbbcbccbbbbbbbcbcbbbbbbbbbc.cccccbbbcccccbbbbccbcbbbbbbbbc.c.ccccccccccccccbccccbcccbcbcc.c....c.cc..cc...cc....cc..ccc...........c..c.....................'},
    cc_plat_f4g4: {w:32, h:14, ox:0, oy:12, px:'a....a....a.....a..a.........a..a...a...a.a.a..aa...a..a....aa...a.aa.aa..a.a.aaaaa.aa..a.a.aa.a.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aababaaaabaabaaabbaaabbbbaabaaaaababbbbababbbaabbbaabbbbababbbbacbbbbbabbbbbbbbbbaabbbbbbbbbbbaacbbbbbbbbbbbbbabbbbbbbbbbbbbbbbaccbbcbbcbbbbbbbcbbbbbbbbbbbbbbbaccbccbbcccbbbbbbcccbbbbbbbbbbbbc.cccccbbcccbbbbbbccbbbbbbbbbbbc.c.cccccccccccccccccccbbccbcbcc.c.cccc.c..ccc...ccc..ccc..c.c.....c.c..c...c......c..c...........'},
    cc_plat_f1g5: {w:32, h:14, ox:0, oy:12, px:'.....a..............................a...a....a......a..a.....a..a..aa.a..a..a.....a.aa.aa.a.a....aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaabbaabbbbaabaabbaababbbaaaaaaababbbbbabbbababbbbbabbbbabaabaacabbbbbbbbbabbbbbbbabbbbbbbabbbacbbcbbbbbbbbbbbbbbbbbbbbbbbbabbaccbcbbcbbbbbbbbbbbbbbbbbbbbbbbbaccbbcbbcbcbbbcbbbbbbbbbbbbbbbbbc.cccccbcccccbbcbbbbbbbbbbbbbbbc.c.ccccccccccccccbccccbcccbcbcc.c....c.c...cc...cc....cc..c.c.............c............c.........'},
    cc_plat_f3g5: {w:32, h:14, ox:0, oy:12, px:'.....a..............................a...a....a......a..a.....a..a..aa.a..a..a.....a.aa.aa.a.a....aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaaaabbaaabbbaabbbaaaabaabaabaaabaaaabbbabbabbabbabbabaababbbaacbbbabbbbbabbabbabbbabbbbbbbabaaccbbbbbbbbabbbbbbbbbbbbbbbbbbbbaccbcbbbbcbbbbbbbbbbbbbbbbbbbbbbaccccbbbbcbccbbbbbbbcbcbbbbbbbbbc.cccccbbbcccccbbbbccbcbbbbbbbbc.c.ccccccccccccccbccccbcccbcbcc.c....c.cc..cc...cc....cc..ccc...........c..c.....................'},
    cc_plat_f2g2: {w:32, h:13, ox:0, oy:13, px:'......a................a.............aa..a.......a....aaa......a.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaabaaababbbbbaabaaababbbaabbaaaaababbabbbabbaabbbbaabbbabbbbabacabbabbbbabbbbbbbbbabbbbbabbbbaacbbbbbbbbbbbbbbbabbbabbbabbbbbbaccbbbccbbbbbbbbbbbbbbbbbbbbbbbbaccbbccbbcbbbcbbbbbbbbbbbbbbbbbbc.cccccbcbbcccbbbbbbbbbbbbbbbbbc.c.ccccccccccccccbccccbbccbcbcc.c....ccc..ccc..ccc.cc.cc..c.c..........c..c........c.............'},
    cc_pin: {w:8, h:8, ox:12, oy:12, px:'a..aa..a...........aa...a.aaaa.aa.aaaa.a...aa...........a..aa..a'},
    cc_pin2: {w:10, h:10, ox:11, oy:11, px:'....aa.....a......a...............aa....a..aaaa..aa..aaaa..a....aa...............a......a.....aa....'},
    cc_pin3: {w:10, h:10, ox:11, oy:11, px:'....aa................a....a......aa....a..aaaa..aa..aaaa..a....aa......a....a................aa....'},
    cc_pin4: {w:8, h:8, ox:12, oy:12, px:'...aa.............aaaa..a.aaaa.aa.aaaa.a..aaaa.............aa...'},
    cc_pin5: {w:6, h:6, ox:13, oy:13, px:'..aa...aaaa.aaaaaaaaaaaa.aaaa...aa..'},
    cc_pin6: {w:8, h:8, ox:12, oy:11, px:'...aa..............aa.....aaaa..aaaaaaaaaaaaaaaa..aaaa.....aa...'},
    cc_pin7: {w:10, h:11, ox:11, oy:8, px:'....aa..................aa.......a..a.................aa.......aaaa...a.aaaaaa.aa.aaaaaa.a...aaaa.......aa....'},
    cc_symbol3: {w:16, h:16, ox:8, oy:8, px:'.......dd..............dd..................................................d...........................dd.......dd....dddd....dddd....dddd....dd.......dd...........................d..................................................dd..............dd.......'},
    cc_door_new: {w:28, h:31, ox:2, oy:1, px:'............dddd......................ddaaaadd..................ddaa.a..aadd..............ddaa.......aaadd............aaa.........a.aa...........ddaa........a..add...........da............ad..........ddda............addd.........aa.............aaa.........dd.a..............dd.........a...............aa..........da...............d..........aa..............aa.........dda...............dd.........a................a.........dda.............aadd.......d.da............a.ad.d........da............a.ad........d.aa..............aa.d.......dda..............add.........da..............ad........dddaa............aaddd........da.a............ad.........dda..............add.......dada..............adad....dd.ada..............ada.dd....dada......a.......adad.....aaada.....a.......aadaaa...dadddaa..a..a...a...adddad...aaada..a...aa...a.aadaaaa.aaddddaaaaaaaaaaaaaaaaddddaa'},
    cc_door_new2: {w:30, h:32, ox:1, oy:0, px:'..............dd...........................dddd........................ddaaaadd..................d.ddaa.a..aadd.d..............ddaa.......aaadd..............aaa.........a.aa............dddaa........a..addd............da............ad............ddda............addd...........aa.............aaa...........dd.a..............dd...........a...............aa...........eea...............e............ea..............aae..........dda...............dd.........e.a................aaa.......e.eea.............aaeea.a....a.ddd.............a..ddda......aaaea............a.aee........addd................dd........aeeea..............ae...........eaa..............aeaa.......aeeeaa............aaeee......a.aaaa.a............aaea........aeea..............aeeaa........aaa..............aaae........aaea..............aeaa........eaaa......a.......aaeee......aaaea.....a.......aaeaa......eaeeeaa..a..a...a...aeee.....eaaaaaa..a...aa...a.aaaaaaea.eeaeeaeaaaaaaaaaaaaaaaaeaeeaee'},
    cc_spikeball: {w:17, h:17, ox:7, oy:7, px:'........g................g...............ggg..............ggg.............ggggg.............ggg...........g..ggg..g......gggggfffggggg..gggggggfffggggggg..gggggfffggggg......g..ggg..g...........ggg.............ggggg.............ggg..............ggg...............g................g........'},
  };

  let V;                       // the shared frame-state object, captured once in setup
  let SPR = {};                 // cached sprites, built in setup
  let plats = [], sils = [], pins = [], spikes = [], rain = [], bursts = [];
  let sym = null, door = null;
  let player = { plat: -1, x: 0, y: 0, face: 1, air: null, first: false };
  let placed = false, cool = 0, hover = null, sig = "", hintEl = null;

  function inBox(px, py, bx, by, bw, bh) {
    return px >= bx && px < bx + bw && py >= by && py < by + bh;
  }

  // is a document y outside the drawable band around the viewport?
  function culled(y, V) {
    return y < V.sy - 120 || y > V.sy + V.H + 120;
  }

  function rectHitsBlocks(x, y, w, h, blocks) {
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y) return true;
    }
    return false;
  }

  function pointHitsBlocks(x, y, blocks) {
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) return true;
    }
    return false;
  }

  function silGreen(t) {
    return Math.floor((t + 0.2) / CYCLE) % 2 === 0;
  }

  // a 0/1 toggle every half-period; normalised because V.t can be a hair negative
  // on the first painted frame (the rAF timestamp can lag the pacer's start() clock)
  function frame01(t, period) {
    return ((Math.floor(t / period) % 2) + 2) % 2;
  }

  // a pin's current sprite index: -1 flash is the resting frame (6)
  function pinFrame(p) {
    if (p.flash < 0) return 6;
    const idx = Math.floor(p.flash / 0.02);
    return idx < PIN_FRAMES.length ? PIN_FRAMES[idx] : 6;
  }

  function sigOf(V) {
    return V.blocks.length + "/" + Math.round(V.docH) + "/" + Math.round(V.main.w) + "/" + V.W;
  }

  // (re)build every platform, silhouette, pin, the symbol, the door and the spikes from
  // V.blocks; called from setup, resize, and from step whenever the page signature changes
  function layout(V) {
    const rnd = U.mulberry(23);           // local: layouts are identical on every run
    const arr = [];
    for (let i = 0; i < V.blocks.length && arr.length < 40; i++) {
      const b = V.blocks[i];
      const free = V.W - 24 - (b.x + b.w);
      if (free < 100) continue;
      const ys = (b.media && b.h > 300) ? [b.y + b.h * 0.3, b.y + b.h * 0.85] : [b.y + b.h - 4];
      const xmin = b.x + b.w + (b.media ? 24 : 40), xmax = V.W - 24 - PLAT_W;
      if (xmax < xmin) continue;
      for (let j = 0; j < ys.length && arr.length < 40; j++) {
        const y = ys[j];
        if (arr.length && y - arr[arr.length - 1].y < 90) continue;
        let x = xmin + rnd() * (xmax - xmin);
        const rect = { x, y: y - MAN_H, w: PLAT_W, h: PLAT_H + MAN_H };
        const hits = V.blocks.filter(h => rect.x < h.x + h.w && rect.x + rect.w > h.x && rect.y < h.y + h.h && rect.y + rect.h > h.y);
        if (hits.length) {
          x = Math.max(...hits.map(h => h.x + h.w)) + 24;
          if (x > xmax) continue;
          rect.x = x;
          if (V.blocks.some(h => rect.x < h.x + h.w && rect.x + rect.w > h.x && rect.y < h.y + h.h && rect.y + rect.h > h.y)) continue;
        }
        arr.push({ x, y, spr: Math.floor(rnd() * 5), twin: true, lit: 0, left: 0 });
      }
    }
    plats = arr;

    if (!plats.length) {
      player.plat = -1;
    } else if (!placed) {
      player.plat = 0;
      player.x = plats[0].x + 24;
      player.y = plats[0].y + 2;
      player.face = 1; player.air = null; player.first = true;
      plats[0].twin = false;
      placed = true;
    } else if (player.plat >= 0) {
      if (player.plat >= plats.length) player.plat = plats.length - 1;
      player.x = plats[player.plat].x + 24;
      player.y = plats[player.plat].y + 2;
      plats[player.plat].twin = false;
    }

    sils = [];
    for (let i = 3; i < plats.length && sils.length < 5; i += 4) {
      const x = plats[i].x + 96, y = plats[i].y - 6;
      if (x + 16 < V.W - 8 && !rectHitsBlocks(x, y, MAN_W, MAN_H, V.blocks)) sils.push({ x, y, gone: false, fade: 1, shake: 0 });
    }

    pins = [];
    for (let i = 2; i < plats.length && pins.length < 4; i += 5) {
      const x = plats[i].x + 80, y = plats[i].y - 34;
      if (!pointHitsBlocks(x, y, V.blocks)) pins.push({ x, y, ang: 0, flash: -1, plat: i });
    }

    sym = { x: V.band.w > 80 ? V.band.x0 + 40 : V.W - 100, y: V.main.y + 60, ang: 0, mode: 0, left: 3 };

    if (plats.length) {
      const last = plats.length - 1;
      door = { x: plats[last].x + PLAT_W - 60, y: plats[last].y - 62, lit: 0 };
    } else door = null;

    spikes = [];
    for (let i = 0; i < 2; i++) {
      const x = V.W - 60 - i * 70;
      const idx = Math.floor(plats.length * 0.5) + i;
      const y = (plats[idx] && plats[idx].y - 80) || V.main.y + 300;
      if (x < V.main.x + 200 || pointHitsBlocks(x, y, V.blocks)) continue;
      spikes.push({ x, y, amp: 5 + i * 3, ph: i * 1.7 });
    }

    sig = sigOf(V);
  }

  // the game's DestroyEffct: 30 short-lived particles, ambient (V.rnd(), not the layout rnd)
  function burst(x, y) {
    for (let i = 0; i < 30; i++) {
      const a = V.rnd() * U.TAU, sp = 30 + V.rnd() * 120;
      bursts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 2, max: 2, size: 2 + V.rnd() });
    }
  }

  // jump into a known platform index, planting a shadow where he stood
  function teleportTo(i) {
    if (i === player.plat) return;
    burst(player.x, player.y - 26);
    if (!player.air) plats[player.plat].twin = true;
    player.plat = i;
    player.air = null;
    player.x = plats[i].x + 24 + (V.rnd() * 16 - 8);
    player.y = plats[i].y + 2;
    plats[i].twin = false;
    plats[i].lit = Math.max(plats[i].lit, 0.001);
    burst(player.x, player.y - 26);
    cool = COOL;
  }

  // jump to an arbitrary point (a silhouette or a pin's pop) and fall from there
  function warp(x, y) {
    burst(player.x, player.y - 26);
    if (!player.air) plats[player.plat].twin = true;
    player.plat = -1;
    player.x = x;
    player.y = y;
    player.air = { vy: 0 };
    burst(x, y - 26);
    cool = COOL;
  }

  // where to land when he falls past the bottom of the page: the visible twin nearest mid-screen
  function nearestVisibleTwin() {
    const vt = V.sy + V.top, vb = V.sy + V.H;
    const mid = vt + (vb - vt) * 0.5;
    let best = -1, bd = Infinity;
    for (let i = 0; i < plats.length; i++) {
      const p = plats[i];
      if (!p.twin || p.y - MAN_H < vt + 40 || p.y > vb - 30) continue;
      const d = Math.abs(p.y - mid);
      if (d < bd) { bd = d; best = i; }
    }
    return best >= 0 ? best : 0;
  }

  function setup(v) {
    V = v;
    SPR = {
      idle: [P.sprite(CPAL, DEFS.cc_idle1), P.sprite(CPAL, DEFS.cc_idle2)],
      green: [P.sprite(CPAL, DEFS.cc_greenA), P.sprite(CPAL, DEFS.cc_greenB)],
      silver: [P.sprite(CPAL, DEFS.cc_silverA), P.sprite(CPAL, DEFS.cc_silverB)],
      plats: [DEFS.cc_plat_f3g2, DEFS.cc_plat_f4g4, DEFS.cc_plat_f1g5, DEFS.cc_plat_f3g5, DEFS.cc_plat_f2g2].map(d => P.sprite(CPAL, d)),
      pins: [DEFS.cc_pin, DEFS.cc_pin2, DEFS.cc_pin3, DEFS.cc_pin4, DEFS.cc_pin5, DEFS.cc_pin6, DEFS.cc_pin7].map(d => P.sprite(CPAL, d)),
      sym: P.sprite(CPAL, DEFS.cc_symbol3),
      door: P.sprite(CPAL, DEFS.cc_door_new),
      doorLit: P.sprite(CPAL, DEFS.cc_door_new2),
      spike: P.sprite(CPAL, DEFS.cc_spikeball),
    };
    layout(v);
    const rrnd = U.mulberry(5);
    rain = [];
    for (let i = 0; i < 24; i++) {
      rain.push({ x: v.W * 0.55 + rrnd() * (v.W * 0.45), y: rrnd() * v.H, vy: 24 + rrnd() * 24, vx: -4 + rrnd() * 8 });
    }
    hintEl = document.createElement("p");
    hintEl.className = "play-hint";
    hintEl.textContent = "shadows · click one";
    document.body.appendChild(hintEl);
  }

  function step(dt, V) {
    const s = sigOf(V);
    if (s !== sig) layout(V);

    cool -= dt;
    const vt = V.sy + V.top, vb = V.sy + V.H;

    if (player.air) {
      const oldY = player.y;
      player.air.vy += GRAV * dt;
      player.y += player.air.vy * dt;
      let landed = -1;
      for (let i = 0; i < plats.length; i++) {
        const p = plats[i];
        if (player.x >= p.x && player.x <= p.x + PLAT_W && oldY <= p.y + 2 && player.y >= p.y + 2) { landed = i; break; }
      }
      if (landed >= 0) {
        player.plat = landed;
        player.y = plats[landed].y + 2;
        player.air = null;
        plats[landed].twin = false;
        plats[landed].lit = Math.max(plats[landed].lit, 0.001);
        burst(player.x, player.y - 26);
      } else if (player.y > V.docH + 100) {
        teleportTo(nearestVisibleTwin());
      }
    }

    if (player.plat >= 0 && cool <= 0) {
      const py = plats[player.plat].y;
      const visible = py - MAN_H > vt - 30 && py < vb + 30;
      if (!visible) {
        const mid = vt + (vb - vt) * 0.5;
        let best = -1, bd = Infinity;
        for (let i = 0; i < plats.length; i++) {
          const p = plats[i];
          if (p.y - MAN_H >= vt + 40 && p.y <= vb - 30) {
            const d = Math.abs(p.y - mid);
            if (d < bd) { bd = d; best = i; }
          }
        }
        if (best < 0) {
          for (let i = 0; i < plats.length; i++) {
            const p = plats[i];
            if (p.y - MAN_H >= vt + 10 && p.y <= vb - 10) {
              const d = Math.abs(p.y - mid);
              if (d < bd) { bd = d; best = i; }
            }
          }
        }
        if (best >= 0) teleportTo(best);
      }
    }

    for (let i = 0; i < plats.length; i++) {
      const p = plats[i];
      if (player.plat === i) p.lit = Math.min(1, p.lit + dt * 5);
      else if (p.lit > 0) p.lit = Math.max(0, p.lit - dt / 5);
    }

    for (let i = 0; i < sils.length; i++) {
      const sl = sils[i];
      if (sl.gone) sl.fade = Math.max(0, sl.fade - dt / 0.5);
      if (sl.shake > 0) sl.shake = Math.max(0, sl.shake - dt);
    }

    for (let i = 0; i < pins.length; i++) {
      const p = pins[i];
      p.ang += dt * 60;
      if (p.flash >= 0) {
        p.flash += dt;
        if (p.flash >= 0.24) p.flash = -1;
      }
    }

    const mode = MODES[sym.mode];
    sym.ang += mode.spin * dt;
    sym.left -= dt;
    if (sym.left <= 0) {
      sym.mode = (sym.mode + 1) % MODES.length;
      sym.left = MODES[sym.mode].dur;
    }

    for (let i = 0; i < rain.length; i++) {
      const r = rain[i];
      r.y += r.vy * dt;
      r.x += r.vx * dt;
      if (r.y > V.H) r.y = 0;
      if (r.x < V.W * 0.5) r.x = V.W;
      else if (r.x > V.W) r.x = V.W * 0.5;
    }

    if (door) {
      const last = plats.length - 1;
      if (player.plat === last) door.lit = U.approach(door.lit, 1, 3, dt);
      else door.lit = U.approach(door.lit, 0.35 + 0.35 * Math.sin(V.t * 1.5), 2, dt);
    }

    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0) bursts.splice(i, 1);
    }

    hover = null;
    if (V.pointer.has) {
      const px = V.pointer.x, py = V.pointer.y + V.sy;
      for (let i = 0; i < plats.length && !hover; i++) {
        const p = plats[i];
        if (p.twin && i !== player.plat && inBox(px, py, p.x + 16, p.y - 54, 32, 56)) hover = { kind: "twin", i };
      }
      for (let i = 0; i < sils.length && !hover; i++) {
        const sl = sils[i];
        if (!sl.gone && inBox(px, py, sl.x - 8, sl.y - 4, 32, 60)) hover = { kind: "sil", i };
      }
      for (let i = 0; i < pins.length && !hover; i++) {
        const p = pins[i];
        if (inBox(px, py, p.x - 6, p.y - 6, 32, 34)) hover = { kind: "pin", i };
      }
    }
  }

  // pointer moved: hover the same targets step() checks against V.pointer, for the cursor
  function move(x, y, V) {
    const px = x, py = y + V.sy;
    let hover = null;
    for (let i = 0; i < plats.length && !hover; i++) {
      const p = plats[i];
      if (p.twin && i !== player.plat && inBox(px, py, p.x + 16, p.y - 54, 32, 56)) hover = { kind: "twin", i };
    }
    for (let i = 0; i < sils.length && !hover; i++) {
      const sl = sils[i];
      if (!sl.gone && inBox(px, py, sl.x - 8, sl.y - 4, 32, 60)) hover = { kind: "sil", i };
    }
    for (let i = 0; i < pins.length && !hover; i++) {
      const p = pins[i];
      if (inBox(px, py, p.x - 6, p.y - 6, 32, 34)) hover = { kind: "pin", i };
    }
    V.cursor && V.cursor(!!hover);
  }

  function press(x, y, V) {
    const px = x, py = y + V.sy;
    for (let i = 0; i < plats.length; i++) {
      const p = plats[i];
      if (p.twin && i !== player.plat && inBox(px, py, p.x + 16, p.y - 54, 32, 56)) {
        teleportTo(i);
        hit(x, y);
        return true;
      }
    }
    for (let i = 0; i < sils.length; i++) {
      const s = sils[i];
      if (!s.gone && inBox(px, py, s.x - 8, s.y - 4, 32, 60)) {
        if (silGreen(V.t)) { s.gone = true; s.fade = 1; warp(s.x + 8, s.y + 52); }
        else s.shake = 0.3;
        hit(x, y);
        return true;
      }
    }
    for (let i = 0; i < pins.length; i++) {
      const p = pins[i];
      if (inBox(px, py, p.x - 6, p.y - 6, 32, 34)) {
        p.flash = 0;
        warp(p.x + 10, p.y + 12);
        player.air.vy = -620;
        hit(x, y);
        return true;
      }
    }
    return false;
  }

  // the first successful click: award the XP tick and hide the "shadows · click one" hint
  function hit(x, y) {
    P.award("play-conclusus", "Conclusus shadow", x, y);
    if (hintEl) hintEl.hidden = true;
  }

  function atRest(V) {
    return bursts.length === 0 && !player.air && cool <= 0 && !hover && !V.pointer.down;
  }

  function draw(ctx, V) {
    const oy = -V.sy;

    ctx.fillStyle = "rgba(" + RAIN + ",0.35)";
    for (let i = 0; i < rain.length; i++) {
      ctx.fillRect(Math.round(rain[i].x), Math.round(rain[i].y), 2, 2);
    }

    for (let i = 0; i < plats.length; i++) {
      const p = plats[i];
      if (culled(p.y, V)) continue;
      P.blit(ctx, SPR.plats[p.spr], p.x, p.y + oy);
      if (p.lit > 0) {
        P.glow(ctx, p.x + 32, p.y + PLAT_H + 7 + oy, 30, PALE, 0.18 * p.lit);
        ctx.fillStyle = "#f7ffc5";
        const lineY = p.y + PLAT_H + 6 + oy, w = 56 * p.lit, x0 = p.x + 32 - w / 2;
        for (let dx = 0; dx < w; dx += 10) ctx.fillRect(Math.round(x0 + dx), Math.round(lineY), Math.min(8, w - dx), 2);
      }
    }

    if (door && !culled(door.y, V)) {
      P.glow(ctx, door.x + 28, door.y + 40 + oy, 60 + 60 * door.lit, PALE, 0.10 + 0.25 * door.lit);
      P.blit(ctx, SPR.door, door.x, door.y + oy);
      ctx.globalAlpha = door.lit;
      P.blit(ctx, SPR.doorLit, door.x - 2, door.y - 2 + oy);
      ctx.globalAlpha = 1;
    }

    const sf = frame01(V.t, SWAP);
    for (let i = 0; i < plats.length; i++) {
      const p = plats[i];
      if (!p.twin || culled(p.y, V)) continue;
      const spr = SPR.green[sf];
      const hovered = hover && hover.kind === "twin" && hover.i === i;
      P.glow(ctx, p.x + 24 + MAN_W / 2, p.y + 2 + oy, 22, GREEN, hovered ? 0.22 : 0.10);
      P.blit(ctx, spr, p.x + 24, p.y + 2 - spr.h + oy, true);
    }

    for (let i = 0; i < sils.length; i++) {
      const s = sils[i];
      if (s.fade <= 0 || culled(s.y, V)) continue;
      const green = silGreen(V.t);
      const spr = green ? SPR.green[sf] : SPR.silver[sf];
      P.glow(ctx, s.x + MAN_W / 2, s.y + MAN_H / 2 + oy, 22, green ? GREEN : "214,245,228", green ? 0.12 : 0.08);
      ctx.globalAlpha = s.fade;
      P.blit(ctx, spr, s.x + (s.shake ? Math.sin(V.t * 80) * 2 : 0), s.y + oy);
      ctx.globalAlpha = 1;
    }

    for (let i = 0; i < pins.length; i++) {
      const p = pins[i];
      if (culled(p.y, V)) continue;
      const cx = p.x + 10, cy = p.y + 11 + oy;
      P.glow(ctx, cx, cy, 18, GREEN, 0.14);
      const spr = SPR.pins[pinFrame(p)];
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(p.ang * Math.PI / 180);
      P.blit(ctx, spr, -spr.w / 2, -spr.h / 2);
      ctx.restore();
    }

    for (let i = 0; i < spikes.length; i++) {
      const sp = spikes[i];
      if (culled(sp.y, V)) continue;
      const cx = sp.x + 17, cy = sp.y + 17 + Math.sin(V.t * 1.3 + sp.ph) * sp.amp + oy;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(V.t * 90 * Math.PI / 180);
      P.blit(ctx, SPR.spike, -17, -17);
      ctx.restore();
    }

    if (sym && !culled(sym.y, V)) {
      const cx = sym.x + 16, cy = sym.y + 16 + oy;
      P.glow(ctx, cx, cy, 40, PALE, 0.22);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(sym.ang * Math.PI / 180);
      P.blit(ctx, SPR.sym, -16, -16);
      ctx.restore();
    }

    if ((player.plat >= 0 || player.air) && !culled(player.y, V)) {
      const spr = player.air ? SPR.idle[0] : SPR.idle[frame01(V.t, 0.5)];
      P.blit(ctx, spr, player.x - 8, player.y - spr.h + oy, player.face < 0);
    }

    for (let i = 0; i < bursts.length; i++) {
      const b = bursts[i];
      if (culled(b.y, V)) continue;
      const t = 1 - b.life / b.max;
      const r = U.mix(175, 26, t), g = U.mix(192, 26, t), bl = U.mix(132, 18, t);
      const a = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
      ctx.fillStyle = "rgba(" + (r | 0) + "," + (g | 0) + "," + (bl | 0) + "," + a + ")";
      ctx.fillRect(Math.round(b.x), Math.round(b.y + oy), b.size, b.size);
    }
  }

  function report() {
    return { plats, sils, pins, player: { plat: player.plat, x: player.x, y: player.y }, bursts };
  }

  const H = P.start({ name: "conclusus", seed: 17, setup, step, draw, atRest, press, move, resize: layout });
  window.PlayConclusus = { report };
})();
