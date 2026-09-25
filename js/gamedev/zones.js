/* zones.js — ambient backdrop art for three Game Dev sector planets so each
   area feels like its game: Conclusus (real 32px sprites from the game,
   embedded as pixel data below), HeavyLight (real 16px sprites from the
   game: sewer slabs, spikes, crate, wall glyph, desk lamp and beam, red
   key, the red player with his lantern) and VoidScape (rising embers
   plus three lime shards). bridge.js draws this BEFORE the planets, storm,
   forge and ship, so it is pure backdrop and never has to hit-test. Every
   static thing is pre-rendered once to an offscreen canvas and blitted with
   drawImage; per frame there are only blits, a few dozen fillRects and two
   or three cached gradients. The one thing that crosses the deck line is
   the HeavyLight lamp's beam and the crates it carries: they run to the
   bottom of the screen on purpose. */
window.Zones = (function () {
  const { mix, mulberry, hash1 } = Util;

  const MIN_W = 900;   // same threshold forge.js uses: no zone art on narrow screens
  const OFF   = 900;   // skip a zone whose planet centre is further than this off the left/right screen edge
  const S     = 2;     // Conclusus sprites are 32px art drawn at 2x

  const DECK = 0.62;                                  // screen fraction of H where the bridge deck line is (same as storm.js FLOOR)
  const roomBelow = (env, at) => DECK * env.H - at.y; // px from a planet centre down to the deck line

  let T = 0;
  const canvases = new Map();   // name -> offscreen canvas (or null if it failed to build)
  let lastReport = {
    t: 0,
    zones: {
      conclusus:  { x: 0, y: 0, drawn: false },
      heavylight: { x: 0, y: 0, drawn: false },
      voidscape:  { x: 0, y: 0, drawn: false },
    },
  };

  /* ---- shared drifting-speck motion: x = bx + sin(T*w1+p1)*ax, etc ---- */
  function makeMotes(rnd, n, n2, bxr, byr, axr, ayr, avoid) {
    const arr = [];
    for (let i = 0; i < n; i++) {
      let bx, by;
      do {
        bx = mix(bxr[0], bxr[1], rnd());
        by = mix(byr[0], byr[1], rnd());
      } while (avoid && bx * bx + by * by < avoid * avoid);
      arr.push({
        bx, by,
        ax: mix(axr[0], axr[1], rnd()),
        ay: mix(ayr[0], ayr[1], rnd()),
        w1: mix(0.15, 0.40, rnd()),
        w2: mix(0.15, 0.40, rnd()),
        w3: mix(0.15, 0.40, rnd()),
        p1: rnd() * Math.PI * 2,
        p2: rnd() * Math.PI * 2,
        p3: rnd() * Math.PI * 2,
        size: i < n2 ? 2 : 3,
      });
    }
    return arr;
  }
  /* ================= Conclusus (seed 7) ================= */
  const CPAL = ["#b4c788","#62554c","#463c3c","#f7ffc5","#8b6a44","#312629","#d6f5e4","#8a8969"];
  const CSPR = {
    tileA: { w:32, h:14, ox:0, oy:12, px:"...................a..................a.............a..a....a....aa..aa..a...aa..a..a.aaa.aa...a.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaaabbaabbbbaabaabbaababbbaaaaaaababbbbbabbbababbbbbabbbbabaabaacabbbbbbbbbabbbbbbbabbbbbbbabbbacbbcbbbbbbbbbbbbbbbbbbbbbbbbabbaccbcbbcbbbbbbbbbbbbbbbbbbbbbbbbaccbbcbbcbcbbbcbbbbbbbbbbbbbbbbbc.cccccbcccccbbcbbbbbbbbbbbbbbbc.c.ccccccccccccccbccccbcccbcbcc.c....c.c...cc...cc....cc..c.c.............c............c........." },
    tileB: { w:32, h:14, ox:0, oy:12, px:"...................a................................a.......a....aa......a...aa.....a.....aa.....aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.aaabaaababbbbbaabaaababbbaabbaaaaababbabbbabbaabbbbaabbbabbbbabacabbabbbbabbbbbbbbbabbbbbabbbbaacbbbbbbbbbbbbbbbabbbabbbabbbbbbaccbbbccbbbbbbbbbbbbbbbbbbbbbbbbaccbbccbbcbbbcbbbbbbbbbbbbbbbbbbc.cccccbcbbcccbbbbbbbbbbbbbbbbbc.c.ccccccccccccccbccccbbccbcbcc.c....ccc..ccc..ccc.cc.cc..c.c..........c..c........c............." },
    door0: { w:28, h:31, ox:2, oy:1, px:"............dddd......................ddaaaadd..................ddaa.a..aadd..............ddaa.......aaadd............aaa.........a.aa...........ddaa........a..add...........da............ad..........ddda............addd.........aa.............aaa.........dd.a..............dd.........a...............aa..........da...............d..........aa..............aa.........dda...............dd.........a................a.........dda.............aadd.......d.da............a.ad.d........da............a.ad........d.aa..............aa.d.......dda..............add.........da..............ad........dddaa............aaddd........da.a............ad.........dda..............add.......dada..............adad....dd.ada..............ada.dd....dada......a.......adad.....aaada.....a.......aadaaa...dadddaa..a..a...a...adddad...aaada..a...aa...a.aadaaaa.aaddddaaaaaaaaaaaaaaaaddddaa" },
    door1: { w:30, h:32, ox:1, oy:0, px:"..............dd...........................dddd........................ddaaaadd..................d.ddaa.a..aadd.d..............ddaa.......aaadd..............aaa.........a.aa............dddaa........a..addd............da............ad............ddda............addd...........aa.............aaa...........dd.a..............dd...........a...............aa...........eea...............e............ea..............aae..........dda...............dd.........e.a................aaa.......e.eea.............aaeea.a....a.ddd.............a..ddda......aaaea............a.aee........addd................dd........aeeea..............ae...........eaa..............aeaa.......aeeeaa............aaeee......a.aaaa.a............aaea........aeea..............aeeaa........aaa..............aaae........aaea..............aeaa........eaaa......a.......aaeee......aaaea.....a.......aaeaa......eaeeeaa..a..a...a...aeee.....eaaaaaa..a...aa...a.aaaaaaea.eeaeeaeaaaaaaaaaaaaaaaaeaeeaee" },
    idle0: { w:8, h:26, ox:11, oy:6, px:"...b.......bbbb...bbbd.....dfd......dd.....gff...hhhgfg..hhhheg..hhhheh.hh.hheh.hh.hhbh.hh.hhbh.hhhhhbhhgghhhehg.dhhheed..hhhee...hhhee..hhhh.e..hhhh.e..hhhh.e..hhh..e...e...e...e...e...e...e...b...b...b...b." },
    idle1: { w:8, h:25, ox:11, oy:7, px:"...b.......bbbb...bbbd.....dfd......dd.....gff...hhhgfg..hhhheg..hhhheh.hh.hheh.hh.hhbh.hh.hhbhhgghhhbhg.dhhhehd..hhhee...hhhee...hhhee..hhhh.e..hhhh.e..hhhh.e..hhh..e...e...e...e...e...b...b...b...b." },
    sym0:  { w:10, h:10, ox:11, oy:11, px:"....dd..................dd.......dddd...d.dddddd.dd.dddddd.d...dddd.......dd..................dd...." },
    sym1:  { w:12, h:12, ox:10, oy:10, px:".....dd...................d..........................dd.....d...dddd...dd...dddd...d.....dd..........................d...................dd....." },
    shade0: { w:8, h:26, ox:13, oy:6, px:"....a....aaaa.....aaaa....aaa.....aa......aaa....aaaaaa..aaaaaa..aaaaaa..aaaa.aa.aaaa.aa.aaaa.aaaaaaaaaaaaaaaaaaaaaaaaa..aaaaa...aaaaa...a.aaaa..a.aaaa..a.aaaa..a..aaa..a...a...a...a...a...a...a...a...a...a.." },
    shade1: { w:8, h:25, ox:13, oy:7, px:"....a....aaaa.....aaaa....aaa.....aa......aaa....aaaaaa..aaaaaa..aaaaaa..aaaa.aa.aaaa.aaaaaaa.aaaaaaaaaaaaaaaaa..aaaaa...aaaaa...aaaaa...a.aaaa..a.aaaa..a.aaaa..a..aaa..a...a...a...a...a...a...a...a.." },
  };

  // a sprite lives in one of two tables, Conclusus (32px art) or HeavyLight
  // (16px art); both are drawn at S
  function spriteOf(name) {
    if (CSPR[name]) return { s: CSPR[name], pal: CPAL };
    if (HSPR[name]) return { s: HSPR[name], pal: HPAL };
    return null;
  }
  function spriteCanvas(name) {
    if (canvases.has(name)) return canvases.get(name);
    if (typeof document === "undefined") { canvases.set(name, null); return null; }
    const e = spriteOf(name); const s = e && e.s;
    if (!s || s.px.length !== s.w * s.h) {
      console.warn("zones: bad sprite " + name);
      canvases.set(name, null);
      return null;
    }
    const cv = document.createElement("canvas");
    cv.width = s.w * S;
    cv.height = s.h * S;
    const g = cv.getContext("2d");
    for (let y = 0; y < s.h; y++) {
      let x = 0;
      while (x < s.w) {
        const c = s.px[y * s.w + x];
        if (c === ".") { x++; continue; }
        let run = 1;
        while (x + run < s.w && s.px[y * s.w + x + run] === c) run++;
        g.fillStyle = e.pal[c.charCodeAt(0) - 97];
        g.fillRect(x * S, y * S, run * S, S);
        x += run;
      }
    }
    canvases.set(name, cv);
    return cv;
  }
  // blit sprite `name` with grid origin (gx, gy) already in screen px
  function blitSprite(ctx, name, gx, gy) {
    const cv = spriteCanvas(name);
    if (!cv) return;
    const s = spriteOf(name).s;
    ctx.drawImage(cv, Math.round(gx + s.ox * S), Math.round(gy + s.oy * S));
  }
  // platforms: grid origin (px from planet centre), row of tiles 64 zone units wide each, bob by k
  const CPLATS = [
    { k: 0, gx: -250, gy: 60,  tiles: ["tileA", "tileB"] },
    { k: 1, gx: -40,  gy: 110, tiles: ["tileB"] },
    { k: 2, gx: 90,   gy: 60,  tiles: ["tileA"] },
    { k: 3, gx: 180,  gy: -40, tiles: ["tileB", "tileA"] },
  ];

  let portalGlowGrad = null, symbolGlowGrad = null;
  function portalGlow(ctx) {
    if (!portalGlowGrad) {
      portalGlowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 70);
      portalGlowGrad.addColorStop(0, "rgba(247,255,197,0.30)");
      portalGlowGrad.addColorStop(1, "rgba(247,255,197,0)");
    }
    return portalGlowGrad;
  }
  function symbolGlow(ctx) {
    if (!symbolGlowGrad) {
      symbolGlowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
      symbolGlowGrad.addColorStop(0, "rgba(247,255,197,0.35)");
      symbolGlowGrad.addColorStop(1, "rgba(247,255,197,0)");
    }
    return symbolGlowGrad;
  }

  const conclususRnd = mulberry(7);
  // 16 motes, 12 of size 2 and 4 of size 3, kept clear of the planet's own halo
  const conclususMotes = makeMotes(conclususRnd, 16, 12, [-290, 290], [-140, 200], [8, 16], [6, 12], 120);
  const CC_LIFT = 172;   // lowest sprite bottom (k1 tile, 110 + 52) + bob 3 + 7, zone units

  function drawConclusus(ctx, ax, ay, env, at) {
    const z = ccZoom();
    ctx.save();
    ctx.translate(Math.round(ax), Math.round(ay));
    ctx.scale(z, z);
    ax = 0; ay = 0;
    const room = roomBelow(env, at) / z;
    const lift = Math.max(0, CC_LIFT - room);
    const oy = -lift;
    // the arch's lit fill breathes in and out (~4 s) instead of snapping frames
    const lit = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(T * 1.6));

    for (const p of conclususMotes) {
      const x = p.bx + Math.sin(T * p.w1 + p.p1) * p.ax;
      let y = p.by + Math.sin(T * p.w2 + p.p2) * p.ay + oy;
      y = Math.min(y, room - 8);
      const a = 0.20 + (0.75 - 0.20) * (0.5 + 0.5 * Math.sin(T * p.w3 + p.p3));
      ctx.fillStyle = "rgba(247,255,197," + a + ")";
      ctx.fillRect(Math.round(ax + x), Math.round(ay + y), p.size, p.size);
    }

    ctx.save();
    ctx.translate(ax + 244, ay - 42 + oy);
    ctx.globalAlpha = 0.6 + 0.4 * lit;
    ctx.fillStyle = portalGlow(ctx);
    ctx.fillRect(-70, -70, 140, 140);
    ctx.restore();

    for (const plat of CPLATS) {
      const bob = Math.sin(T * 0.45 + plat.k * 1.9) * 3;
      let tx = ax + plat.gx;
      const ty = ay + plat.gy + bob + oy;
      for (const tname of plat.tiles) {
        blitSprite(ctx, tname, tx, ty);
        tx += 64;
      }
      if (plat.k === 0) {
        const frame = Math.floor(T / 0.7) % 2;
        blitSprite(ctx, frame === 0 ? "idle0" : "idle1", ax - 234, ay + 26 + bob + oy);
      }
      if (plat.k === 2) {
        // the planted shadow: the game's flat-green twin, facing the player,
        // idling half a beat behind him
        const tframe = Math.floor(T / 0.7 + 0.5) % 2;
        blitSprite(ctx, tframe === 0 ? "shade0" : "shade1", ax + 88, ay + 26 + bob + oy);
      }
      if (plat.k === 3) {
        // door0 is the bare arch, door1 the arch with its lit fill: draw the
        // arch, then fade the lit frame over it with the breath
        const dx = ax + 212, dy = ay - 74 + bob + oy;
        blitSprite(ctx, "door0", dx, dy);
        ctx.globalAlpha = lit;
        blitSprite(ctx, "door1", dx, dy);
        ctx.globalAlpha = 1;
      }
    }

    const symBob = Math.sin(T * 0.8) * 4;
    const sx = ax - 96, sy = ay + 22 + symBob + oy;
    ctx.save();
    ctx.translate(sx + 16 * S, sy + 16 * S);
    ctx.fillStyle = symbolGlow(ctx);
    ctx.fillRect(-18, -18, 36, 36);
    ctx.restore();
    const sframe = Math.floor(T / 0.6) % 2;
    blitSprite(ctx, sframe === 0 ? "sym0" : "sym1", sx, sy);
    ctx.restore();
  }

  /* ================= HeavyLight (seed 11) ================= */
  /* real 16px sprites from the game: sewer slabs, spikes, a crate, a red wall
     glyph, the desk lamp and its beam, the red key, and the red player with
     his lantern. h_plat / h_wallDrip / h_pillarDrip are the game's tiles with
     airFloor1's dripping bottom four rows pasted on so the slabs can float.
     Every static group is pre-rendered once (groupCanvas) at 2x, then the
     whole zone is drawn 1.5x bigger through one canvas transform (hlZoom,
     which reads GdWorld.P.heavylight.px()) so it lands at 3 px per art
     pixel, matching the Game Dev backdrop; the layout below is compacted so
     it still fits between the ceiling and the deck line at that scale. Per
     frame there are four group blits, the player, the crate, two cached
     glows and the beam. */
  const HPAL = ["#04253c","#143f5e","#306082","#5a86a5","#2d546f","#961a1a","#ff0000","#b44545","#780b0b","#5a0e0e","#000000"];
  const HSPR = {
    h_floor1: { w:16, h:16, ox:0, oy:0, px:"cddddddddddddddccccccccccccccccdbbbbbbbbbbbbbbbbaabaaaaaaabaaaabbaabaaaaabbaaaaaaaaabaaaaaaaababaaabaaabaabaabaaaaaaaaabbaaaaaaaaaaaaaabbaaabaaaaaaaaaaaaaaabbaaaaaaaaaaaaaaabaaaaabaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
    h_floorL: { w:16, h:16, ox:0, oy:0, px:".ddddddddddddddddbcccccccccccccc.bbbbbbbbbbbbbbbdcbbaaaaaaaaabbadcbbaaaaaaaaabaa.bbaababaaaaaaaaddcbbaaaaaaabaaadccbbaaaaaaaaaaa.bbbaaaaaaabbaaaddcbbabbaaabbaaadccbbabbaaabaaaa.bbbaaaaaaaaaaaadddcbbaaaaaaaaaadcccbbaaaaaaaaaadcccbbabbaaaaaaa.bbbbabaaaaaaaaa" },
    h_floorR: { w:16, h:16, ox:0, oy:0, px:"ddddddddddddddd.ccccccccccccccbdbbbbbbbbbbbbbbb.abbaaaaaaaaabbcdaabaaaaaaaaabbcdaaaaaaaababaabb.aaabaaaaaaabbcddaaaaaaaaaaabbccdaaabbaaaaaaabbb.aaabbaaabbabbcddaaaabaaabbabbccdaaaaaaaaaaaabbb.aaaaaaaaaabbcdddaaaaaaaaaabbcccdaaaaaaabbabbcccdaaaaaaaaababbbb." },
    h_wall: { w:16, h:16, ox:0, oy:0, px:"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabaaaaaaabaaaabbaabaaaaabbaaaaaaaaabaaaaaaaababaaabaaabaabaabaaaaaaaaabbaaaaaaaaaaaaaabbaaabaaaaaaaaaaaaaaabbaaaaaaaaaaaaaaabaaaaabaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
    h_wallL: { w:16, h:16, ox:0, oy:0, px:"ddccbabbaaaaaaaaddccbbaaaaaaaaaa.bbbbaabaaaaaaaaddccbabbbaaaaaaadcccbbaabaaaaaaa.bbbbaaaaaaaaaaadccbaaaaaaaaaaaadccbabbaaaaaaaaaddcbbbbabaaaaaaa.bbbbaaaaaaaaaaadcccbaaaaaaaaaaaddccbbaaaaaaaaaa.bbbbabaaaaaaaaaddccbaaaaaaaaaaadcccbababaaaaaaa.bbbbbaaaaaaaaaa" },
    h_wallR: { w:16, h:16, ox:0, oy:0, px:"aaaaaaaabbabccddaaaaaaaaaabbccddaaaaaaaabaabbbb.aaaaaaabbbabccddaaaaaaabaabbcccdaaaaaaaaaaabbbb.aaaaaaaaaaaabccdaaaaaaaaabbabccdaaaaaaababbbbcddaaaaaaaaaaabbbb.aaaaaaaaaaabcccdaaaaaaaaaabbccddaaaaaaaaababbbb.aaaaaaaaaaabccddaaaaaaabababcccdaaaaaaaaaabbbbb." },
    h_wallDrip: { w:16, h:16, ox:0, oy:0, px:"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabaaaaaaabaaaabbaabaaaaabbaaaaaaaaabaaaaaaaababaaabaaabaabaabaaaaaaaaabbaaaaaaaaaaaaaabbaaabaaaaaaaaaaaaaaabbaaaaaaaaaaaaaaabaaaaabaaaaaaaaaaaabccbbbbccbccbcddbdcbccbcdbccbccdbdcbcdbcdbdcbccd.dd.dd.dd.dd.ddd" },
    h_dripL: { w:16, h:16, ox:0, oy:0, px:"dccccbaaabaaaaaadddccbabbaaaaaaa.bbbbbaabbaaaaaadddcbaaaaaaaaaaadcccbbaaaaaaaaaa.bbbbaabbaaaaaaaddcbaaaaabaaaaaadccbaaaaaaaaaaaa.bbbbaababaaabbadddcbbaaaaaaabbadcccbaaabaaaaaaa.bbbbbbbbbaabbbbddcbccbccbbbbccbdccbdcbdcbccbcdbdccbddbddbdcbcdbddd.dd.dd.dd.dd." },
    h_doubleFloor: { w:16, h:16, ox:0, oy:0, px:"aaaaaabaaabccccdaaaaaaabbabccdddaaaaaabbaabbbbb.aaaaaaaaaaabcdddaaaaaaaaaabbcccdaaaaaaabbaabbbb.aaaaaabaaaaabcddaaaaaaaaaaaabccdabbaaababaabbbb.abbaaaaaaabbcdddaaaaaaabaaabcccdbbbbaabbbbbbbbb.bccbbbbccbccbcddbdcbccbcdbcdbccdbdcbcdbddbddbccd.dd.dd.dd.dd.ddd" },
    h_symbol1: { w:16, h:16, ox:0, oy:0, px:"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaagaaaaaaaaaaaaaaagaaaaaaaaaaaggaagaaaaaaaaaaaaaaagaaaaaaaggggggaagaaaaaaaaaaagaaaaaaaaaaaaaaagaagaaaaaaaaggggggaggaaaaaaaaaaaaaaagaaaaaaaaaaagaaagaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
    h_spike: { w:16, h:12, ox:0, oy:4, px:"....a......a........a......a........a......a.......aba....aba......aba....aba.....abcba..abcba....abcba..abcba....abcba..abcba...abcccbaabcccba..abcdcbaabcdcba.abccdccabccdccbabcccdcabcccdcccb" },
    h_box: { w:14, h:14, ox:1, oy:1, px:"c.c.c.cc.c.c.c.cccccccccccc.cceeeeeeeeeecc.ceeeeeeeeeec.cceeeeeeeeeecc.ceeeeeeeeeec.cceeeeeeeeeecccceeeeeeeeeecc.ceeeeeeeeeec.cceeeeeeeeeecc.ceeeeeeeeeec.cceeeeeeeeeecc.cccccccccccc.c.c.c.cc.c.c.c" },
    h_plat: { w:16, h:16, ox:0, oy:0, px:"cddddddddddddddccccccccccccccccdbbbbbbbbbbbbbbbbaabaaaaaaabaaaabbaabaaaaabbaaaaaaaaabaaaaaaaababaaabaaabaabaabaaaaaaaaabbaaaaaaaaaaaaaabbaaabaaaaaaaaaaaaaaabbaaaaaaaaaaaaaaabaaaaabaaaaaaaaaaaabccbbbbccbccbcddbdcbccbcdbccbccdbdcbcdbcdbdcbccd.dd.dd.dd.dd.ddd" },
    h_platL: { w:16, h:16, ox:0, oy:0, px:".ddddddddddddddcdcccccccccccccbdbbbbbbbbbbbbbbbbdcccbaaaaaaaaaaaddccbbabbaaaaaaa.bbbbaabbaaaaaaaddcbaaaaaaaaaaaadccbaaaaaabaaaaa.bbbbaaabbbaabaaddccbbaaaaaaabbadcccbbaabaaaaaaa.bbbbbbbbbaabbbbddcbccbccbbbbccbdccbccbdcbccbcdbdccbcdbdcbdcbcdbddd.dd.dd.dd.dd." },
    h_airFloor1: { w:16, h:16, ox:0, oy:0, px:"cdddddddddddddd.dbcccccccccccccdbbbbbbbbbbbbbbbbaaaaaaaaaaabcccdaaaaaaabbabbccddaaaaaaabbaabbbb.aaaaaaaaaaaabcddaaaaabaaaaaabccdaabaabbbaaabbbb.abbaaaaaaabbccddaaaaaaabaabbcccdbbbbaabbbbbbbbb.bccbbbbccbccbcddbdcbccbcdbccbccdbdcbcdbcdbdcbccd.dd.dd.dd.dd.ddd" },
    h_lamp: { w:13, h:16, ox:0, oy:0, px:".......c...........ccccc.......ccccccc.......ccccccc.....ccccccc.....c.ccccc.....c...ccc.....c.....c......c............c............c............c............c............c..g........cccccc......cccccccc....." },
    h_pillarTop: { w:16, h:16, ox:0, oy:0, px:"ddddddddddddddd..bcccccbccccccbddcccbbbbbbbbbbb.dcccbbaaaaaabbcddddcbbaaaaaabbcd.bbbaaaababaabb.dccbbabbaaabbcddddcbbbbbaaabbccd.bbbaaaaaaaabbb.dccbbaaabbabbcddddcbbaabbbabbccd.bbaabbbaaaabbb.dcbbaaaaaabbcddddcbbaaaaaabbcccd.bbbbbbbbabbcccddbbbbbbbababbbb." },
    h_pillarBody: { w:16, h:16, ox:0, oy:0, px:"ddaaaaaaaaaaaad..bbbbaaaaaaaccbddcccbaaaaababbb.dcccbbaaaaaabbcddddcbbaaaaaabbcd.bbbaaaabaaaabb.dccbbaabaaaabcddddcbbbaaaaaabccd.bbbaaaaaaaaabb.dccbbaaaaaabacddddcbbaabaaaaaccd.bbaababaaaaabb.dcbbaaaaaaaaaddddcbbaaaaaaaaaccd.bbbbbbaaaaaaccddbcaaaaaaaaaaab." },
    h_pillarDrip: { w:16, h:16, ox:0, oy:0, px:"ddaaaaaaaaaaaad..bbbbaaaaaaaccbddcccbaaaaababbb.dcccbbaaaaaabbcddddcbbaaaaaabbcd.bbbaaaabaaaabb.dccbbaabaaaabcddddcbbbaaaaaabccd.bbbaaaaaaaaabb.dccbbaaaaaabacddddcbbaabaaaaaccd.bbaababaaaaabb.bccbbbbccbccbcddbdcbccbcdbccbccdbdcbcdbcdbdcbccd.dd.dd.dd.dd.ddd" },
    h_key5: { w:7, h:15, ox:5, oy:1, px:"..ggg...g...g.g.....gg.....g.g...g...ggg.....g......g......g......g......g.....gg......g....ggg......g..." },
    h_lan1: { w:8, h:13, ox:5, oy:3, px:"..fhh.....fhh.....fhh......j.....fffif..f.ffi.f.f.ffi.f.f.jjj.f.h.ffi.kk..f.i.....f.i.....f.i.....j.j..." },
    h_lan2: { w:8, h:13, ox:5, oy:3, px:"..fhh.....fhh.....fhh......j.....fffif..f.ffi.f.f.ffi.f.f.jjj.f..hffi.kk..f.i.....f.i.....f.i.....j.j..." },
    h_lan3: { w:7, h:12, ox:6, oy:4, px:".fhh....fhh....fhh.....j....fffif..fffi.f.fjjj.f.hffi.kk.f.i....f.i....f.i....j.j..." },
  };

  const HL = { cone: "110,160,240", key: "255,60,40", lamp: "170,215,240" };

  // static groups: tiles are [sprite, x, y] with x/y the 16-grid origin in px
  // from the planet centre (sprite grid cells are 32px on screen); k is the
  // bob phase shared by everything that rides on that group
  const HL_GROUPS = {
    slabL: { k: 0, tiles: [
      ["h_floorL", -350, 16], ["h_floor1", -318, 16], ["h_floor1", -286, 16], ["h_floor1", -254, 16], ["h_floorR", -222, 16],
      ["h_wallL", -350, 48], ["h_symbol1", -318, 48], ["h_wall", -286, 48], ["h_wall", -254, 48], ["h_wallR", -222, 48],
      ["h_dripL", -350, 80], ["h_wallDrip", -318, 80], ["h_wallDrip", -286, 80], ["h_wallDrip", -254, 80], ["h_doubleFloor", -222, 80],
      ["h_spike", -318, -16], ["h_spike", -286, -16], ["h_box", -230, -14],
    ] },
    platM: { k: 1, tiles: [
      ["h_platL", -96, 80], ["h_plat", -64, 80], ["h_plat", -32, 80], ["h_plat", 0, 80], ["h_airFloor1", 32, 80],
      ["h_lamp", 38, 48],
    ] },
    pillarR: { k: 2, tiles: [
      ["h_pillarTop", 230, -40], ["h_pillarBody", 230, -8], ["h_pillarDrip", 230, 24],
    ] },
    platR: { k: 3, tiles: [
      ["h_platL", 312, 60], ["h_airFloor1", 344, 60], ["h_spike", 344, 28],
    ] },
  };
  const HL_ORDER = ["slabL", "pillarR", "platR", "platM"];
  const CELL = 16 * S;

  // one offscreen canvas per group; cv._ox/_oy is the group's top-left in px
  // from the planet centre
  function groupCanvas(name) {
    const key = "hl:" + name;
    if (canvases.has(key)) return canvases.get(key);
    if (typeof document === "undefined") { canvases.set(key, null); return null; }
    const grp = HL_GROUPS[name];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [, x, y] of grp.tiles) {
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + CELL); maxY = Math.max(maxY, y + CELL);
    }
    const cv = document.createElement("canvas");
    cv.width = maxX - minX; cv.height = maxY - minY;
    const g = cv.getContext("2d");
    for (const [spr, x, y] of grp.tiles) blitSprite(g, spr, x - minX, y - minY);
    cv._ox = minX; cv._oy = minY;
    canvases.set(key, cv);
    return cv;
  }

  let keyGlowGrad = null, lampGlowGrad = null;
  function keyGlow(ctx) {
    if (!keyGlowGrad) {
      keyGlowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 22);
      keyGlowGrad.addColorStop(0, "rgba(" + HL.key + ",0.35)");
      keyGlowGrad.addColorStop(1, "rgba(" + HL.key + ",0)");
    }
    return keyGlowGrad;
  }
  function lampGlow(ctx) {
    if (!lampGlowGrad) {
      lampGlowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
      lampGlowGrad.addColorStop(0, "rgba(" + HL.lamp + ",0.28)");
      lampGlowGrad.addColorStop(1, "rgba(" + HL.lamp + ",0)");
    }
    return lampGlowGrad;
  }

  const heavylightRnd = mulberry(11);
  const hlDust = makeMotes(heavylightRnd, 10, 10, [-380, 380], [-100, 110], [6, 14], [5, 10], 120);
  const LANTERN = ["h_lan1", "h_lan2", "h_lan3", "h_lan2"];
  // the lamp's beam: source centred on the lamp head's lower-right face
  // (zone px before bob/lift), half the face width, aimed down-right, and it
  // runs past the deck line to just beyond the bottom of the screen
  const BEAM = { x: 58, y: 58, half: 6, ang: 42 * Math.PI / 180, spread: 6 * Math.PI / 180, over: 24 };
  // crates dropped in from above the screen when a HeavyLight beacon is
  // reached: they fall, the beam catches them and carries them down it
  const crates = [];
  const CRATE = { g: 420, fall: 240, ride: 300, ease: 0.06, max: 4, life: 10 };   // fall = terminal speed so the beam can catch it
  function dropCrate() {
    if (crates.length >= CRATE.max) crates.shift();
    crates.push({ x: 154 + Math.random() * 30, y: NaN, vx: 0, vy: 0, t: 0 });   // falls clear of the platform's right end (64) into the beam
  }
  // the backdrop's px scale (GdWorld.P.heavylight.px(), 2 or 3) over 2, the
  // zone units' own baseline scale, so the whole zone draws at the same
  // px-per-art-pixel as the Game Dev tiles behind it
  function hlZoom() {
    const g = window.GdWorld, h = g && g.P && g.P.heavylight;
    const p = h && typeof h.px === "function" ? h.px() : 3;
    return p / 2;
  }
  // Conclusus zone art shares the backdrop slabs' pixel scale (px()/2, since sprites are built at S = 2)
  function ccZoom() {
    const g = window.GdWorld, h = g && g.P && g.P.conclusus;
    const p = h && typeof h.px === "function" ? h.px() : 3;
    return p / 2;
  }
  const HL_LIFT = 120;   // lowest sprite bottom (112, zone units) + 8
  function stepCrates(dt, env) {
    if (!crates.length) return;
    const at = env && env.at && env.at.heavylight;
    if (!at || !isFinite(at.x)) { crates.length = 0; return; }
    const z = hlZoom();
    const room = roomBelow(env, at) / z;
    const lift = Math.max(0, HL_LIFT - room);
    const apexX = BEAM.x, apexY = BEAM.y - lift;
    const cosA = Math.cos(BEAM.ang), sinA = Math.sin(BEAM.ang);
    for (let i = crates.length - 1; i >= 0; i--) {
      const c = crates[i];
      if (!isFinite(c.y)) c.y = -at.y / z - 40;   // start just above the top edge of the screen
      c.t += dt;
      // along-beam distance t and perpendicular distance pd from the beam's centreline
      const dx = c.x - apexX, dy = c.y - apexY;
      const t = dx * cosA + dy * sinA;
      const pd = Math.abs(dx * sinA - dy * cosA);
      const inBeam = t > 0 && pd <= BEAM.half + t * Math.tan(BEAM.spread) + 8;
      if (inBeam) {
        const k = Math.min(1, dt / CRATE.ease);
        c.vx += (Math.cos(BEAM.ang) * CRATE.ride - c.vx) * k;
        c.vy += (Math.sin(BEAM.ang) * CRATE.ride - c.vy) * k;
      } else {
        c.vy = Math.min(c.vy + CRATE.g * dt, CRATE.fall);
      }
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      // gone only once it has left the screen at the bottom or the right
      if (at.y + c.y * z > env.H + 40 || c.t > CRATE.life || at.x + c.x * z > env.W + 80) crates.splice(i, 1);
    }
  }

  function drawHeavyLight(ctx, ax, ay, env, at) {
    const z = hlZoom();
    ctx.save();
    ctx.translate(Math.round(ax), Math.round(ay));
    ctx.scale(z, z);
    ax = 0; ay = 0;
    const room = roomBelow(env, at) / z;
    const lift = Math.max(0, HL_LIFT - room);   // lowest sprite bottom is 112 zone px below the centre
    const oy = -lift;
    const bob = k => Math.sin(T * 0.4 + k * 2.1) * 2;

    for (const p of hlDust) {
      const x = p.bx + Math.sin(T * p.w1 + p.p1) * p.ax;
      let y = p.by + Math.sin(T * p.w2 + p.p2) * p.ay + oy;
      y = Math.min(y, room - 8);
      const a = 0.12 + (0.35 - 0.12) * (0.5 + 0.5 * Math.sin(T * p.w3 + p.p3));
      ctx.fillStyle = "rgba(170,215,240," + a + ")";
      ctx.fillRect(Math.round(ax + x), Math.round(ay + y), p.size, p.size);
    }

    for (const name of HL_ORDER) {
      const cv = groupCanvas(name);
      if (!cv) continue;
      ctx.drawImage(cv, Math.round(ax + cv._ox), Math.round(ay + cv._oy + bob(HL_GROUPS[name].k) + oy));
    }

    // on the middle platform: the player with his lantern
    const bM = bob(1);
    const frame = Math.floor(T / 0.45) % 4;
    blitSprite(ctx, LANTERN[frame], ax - 84, ay + 48 + bM + oy);

    // crates riding the light (drawn under the beam so the light lies on them)
    for (const c of crates) {
      if (!isFinite(c.y)) continue;
      blitSprite(ctx, "h_box", ax + c.x - 16, ay + c.y - 16);
    }

    // the lamp head glows; its beam leaves the head's lower-right face as a
    // band as wide as the face and runs to just past the bottom of the screen
    const cosA = Math.cos(BEAM.ang), sinA = Math.sin(BEAM.ang);
    const cx0 = ax + BEAM.x + cosA * 2, cy0 = ay + BEAM.y + bM + oy + sinA * 2;   // nudged 2px off the face
    ctx.save();
    ctx.translate(cx0, cy0);
    ctx.fillStyle = lampGlow(ctx);
    ctx.fillRect(-26, -26, 52, 52);
    ctx.restore();
    const endY = (env.H - at.y) / z + BEAM.over;
    if (endY - cy0 > 12) {
      const ca = 0.20 + 0.03 * Math.sin(T * 3.1);
      const nx = -sinA * BEAM.half, ny = cosA * BEAM.half;   // half the face, perpendicular to the beam
      const ux = cx0 - nx, uy = cy0 - ny;                      // upper edge start
      const lx = cx0 + nx, ly = cy0 + ny;                      // lower edge start
      const hi = BEAM.ang - BEAM.spread, lo = BEAM.ang + BEAM.spread;
      const tu = (endY - uy) / Math.sin(hi), tl = (endY - ly) / Math.sin(lo);
      ctx.beginPath();
      ctx.moveTo(ux, uy);
      ctx.lineTo(ux + Math.cos(hi) * tu, endY);
      ctx.lineTo(lx + Math.cos(lo) * tl, endY);
      ctx.lineTo(lx, ly);
      ctx.closePath();
      ctx.fillStyle = "rgba(" + HL.cone + "," + ca + ")";
      ctx.fill();
    }

    // the red key floats above the pillar
    const ky = ay - 94 + Math.sin(T * 0.9) * 4 + oy;
    ctx.save();
    ctx.translate(ax + 247, ky + 17);
    ctx.fillStyle = keyGlow(ctx);
    ctx.fillRect(-22, -22, 44, 44);
    ctx.restore();
    blitSprite(ctx, "h_key5", ax + 230, ky);
    ctx.restore();
  }

  /* ================= VoidScape (seed 5) ================= */
  const voidscapeRnd = mulberry(5);
  const VS_COLORS = ["255,120,60", "240,80,40", "200,30,20"];
  const vsEmbers = [];
  for (let i = 0; i < 22; i++) {
    vsEmbers.push({
      bx: mix(-620, 820, voidscapeRnd()),
      sway: mix(5, 10, voidscapeRnd()),
      speed: mix(14, 26, voidscapeRnd()),
      phase: voidscapeRnd(),
      size: i < 10 ? 3 : 2,
      col: VS_COLORS[Math.floor(voidscapeRnd() * VS_COLORS.length)],
    });
  }
  const VS_SHARDS = [ { x: -560, y: 200 }, { x: 700, y: 150 }, { x: -660, y: -60 } ];

  function drawEmbers(ctx, ax, ay, env, at) {
    const yt = -150;
    const yb = Math.min(300, roomBelow(env, at) - 8);
    const L = yb - yt;
    for (const p of vsEmbers) {
      let u = (p.phase + T * p.speed / L) % 1;
      if (u < 0) u += 1;
      const y = yb - u * L;
      const x = p.bx + Math.sin(T * 0.7 + p.phase * 6.28) * p.sway;
      const a = 1.0 * Math.min(1, u * 4, (1 - u) * 3);
      ctx.fillStyle = "rgba(" + p.col + "," + a + ")";
      ctx.fillRect(Math.round(ax + x), Math.round(ay + y), p.size, p.size);
    }
  }
  function drawShards(ctx, ax, ay) {
    for (let i = 0; i < VS_SHARDS.length; i++) {
      const s = VS_SHARDS[i];
      const bob = Math.sin(T * 0.5 + i) * 3;
      const a = 0.30 + 0.35 * (0.5 + 0.5 * Math.sin(T * 0.9 + i * 2.1));
      const cx = ax + s.x, cy = ay + s.y + bob;
      ctx.fillStyle = "rgba(100,170,27," + a + ")";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx + 6, cy);
      ctx.lineTo(cx, cy + 8);
      ctx.lineTo(cx - 6, cy);
      ctx.closePath();
      ctx.fill();
    }
  }
  function drawVoidScape(ctx, ax, ay, env, at) {
    drawEmbers(ctx, ax, ay, env, at);
    drawShards(ctx, ax, ay);
  }

  /* ================= step / draw / report ================= */
  function step(dt, env) {
    if (typeof dt !== "number" || !isFinite(dt) || dt < 0) dt = 0;
    if (!(env && env.reduced)) T += dt;
    stepCrates(dt, env);
  }

  const ZONE_DRAW = { conclusus: drawConclusus, heavylight: drawHeavyLight, voidscape: drawVoidScape };

  function draw(ctx, env) {
    const zones = {
      conclusus:  { x: 0, y: 0, drawn: false },
      heavylight: { x: 0, y: 0, drawn: false },
      voidscape:  { x: 0, y: 0, drawn: false },
    };
    lastReport = { t: T, zones };
    if (!env || !(env.W >= MIN_W)) return;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const key in ZONE_DRAW) {
      const at = env.at && env.at[key];
      const info = zones[key];
      if (!at || !isFinite(at.x)) continue;
      info.x = at.x; info.y = at.y;
      if (at.x < -OFF || at.x > env.W + OFF) continue;
      ZONE_DRAW[key](ctx, at.x, at.y, env, at);
      info.drawn = true;
    }
    ctx.restore();
  }

  function report() { return lastReport; }

  return { step, draw, report, dropCrate };
})();
