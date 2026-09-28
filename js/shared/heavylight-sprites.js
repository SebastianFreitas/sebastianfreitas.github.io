/* heavylight-sprites.js — the HeavyLight game's palette and its 16 px
   sprites (floor/wall/drip/pillar/plat tiles, spike, symbol, box, lamp,
   key, lantern), shared by the bridge (gamedev/zones.js) and the
   HeavyLight case page (pages/heavylight.js). Each sprite is
   {w, h, ox, oy, px}: px is w*h letters, "." transparent, letter "a"
   = HPAL[0]. Data only: no drawing, no state. */
window.HeavyLightSprites = (function () {
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
  return { HPAL, HSPR };
})();
