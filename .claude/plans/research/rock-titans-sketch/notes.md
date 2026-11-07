# Rock titans sketch: notes (phase 1)

Status: layout v3 written; `tools/titansheet.py` exits 0.

## What layout v1 holds
- Roots -0.60, -0.20, +0.20, +0.60 H (D30); families spires, rings, blocks, sheets; rocks 0-3; cores size 0.09 H at dy -0.36.
- Pieces per the m rule; wide painters (needle, slab, mound, crawler, veil, winged, slider, bloom) turned 90 degrees so their ink stays under 0.32 H wide.
- Filler: ribs (uneven broken bands), stalactite, metalrock, glass, cloud, flesh polygons above and between pieces, snaps 1-5.
- `shears` is one top-level list of four rows [pusher titan, piece, struck titan, piece] (spires>rings, rings>blocks, blocks>sheets, sheets>blocks), every piece <= 0.28 H.

## Tool numbers (`py -3 tools/titansheet.py %TEMP%/titans`)
- Filter probe: lit 42, shade 28 (no `D (auto)` needed).
- Shear pieces: 0.24/0.28, 0.24/0.22, 0.24/0.28, 0.27/0.24 H (all pass).
- Open fails: titan heights 0.42-0.43 H on some (core top too low: raise the core or add filler above 0.28 H); widths 0.32-0.39 H (titans 2, 3, 4); gaps 0.053-0.054 H (titans 2, 3); shares under 0.5 for gentleman .42, prism .32, chime .17, bloom .02, swarmling .14, husk .37, slab .38, mound .20, crawler .19, veil .20, floater .49, slider .29; hidden tops: knot, bloom, slider.
- Measured upright ink (w x h, H) for placing: gentleman .131x.417, tower .056x.401, strider .254x.364, prism .153x.286, pearl .253x.258, knot .186x.235, chime .189x.373 (hangs, top 0.446 above foot), swarmling .165x.216, husk .318x.271, mass .191x.148, floater and eye hang below the foot point.

## D (auto)
None taken yet.

## layout v2 (tools/titansheet.py exits 0)
Moved: titan 1 gentleman z5 and raised, prism z6 raised, strider/tower/needle shifted x; titan 2 chime x+0.06 raised, pearl m3.4, knot m3.5, bundle m2.5, swarmling m2.9, all re-spread vertically and re-z'd; titan 3 husk m2.2 z6, slab m2.5, mass m2.5 moved up, crawler z5; titan 4 veil m3.4 shifted and re-z'd, comb m2.5, winged moved right, eye/floater/blinker x and z changed.
Dropped (could not pass share/hidden-top): titan 2 roller and bloom (5 left), titan 3 mound (4 left), titan 4 veil and slider (5 left). Shears re-indexed: [0,3,1,4], [1,3,2,3], [2,1,3,2], [3,3,2,1]; snaps S5 for titan 2, S4 for titan 3, S5 for titan 4.
Printed table: heights 0.430/0.461/0.419/0.430 H; widths 0.310/0.317/0.303/0.306 H; gaps 0.093/0.107/0.080 H; every share >= 0.50 (lowest knot 0.50, tower 0.51, slab 0.51, strider 0.52); all tops shown; shear pieces 0.203-0.270 H.

## layout v3 (look-judge fix, p3)
Tool: each piece gets a 3 px near-black (#0d1114) rim, painted only over what is already drawn (source-atop, so widths do not change); the core is drawn at brightness 0.45 (darker than the pieces); leader lines end on the visible pixel nearest the piece's visible mean and the labels run in one staggered row sorted by that x (no crossings).
Layout: filler stalactite/triangle shapes are now many-point jagged lumps (metalrock, glass shards, cloud); ribs vary in width and x per band. Piece positions, sizes and z are unchanged, so the checks are as in v2 (min share 0.50 knot, probe 42/28). The octagon-with-legs (husk), the table (comb) and the skyline bars (gentleman, tower) are roster pieces, not filler, and remain.

## Layout v4 (D39, single pieces)
Changed from v3: v3 stacked whole bodies (rejected). Each piece now has `cut` (tool: polygon in fractions of its unrotated ink box, clipped in the local frame; all measures use the clipped piece, h = clipped ink height), keeping one part; positions, m and z re-spread, shears re-picked. Cut parts are guessed by ink-box region (shapes were not viewed alone), so the kept part may not always be the most telling one.
Format: kind, part kept (cut u0,v0-u1,v1 of ink box), m, h / share / top.
- Titan 1: gentleman head (0,0-1,.42) m2.6 .227/.88/.300; tower top (0,0-1,.42 slanted) m3 .320/.74/.340; needle one end (0,0-.5,1) m5 .206/.92/.389; prism upper facet (poly) m3.8 .209/.85/.316; strider left legs (0,.35-.55,1) m2.6 .303/.53/.394.
- Titan 2: chime lower ring (0,.5-1,1) m3.6 .215/.55/.383; pearl left-lower edge (0,.3-.55,1) m5.2 .207/.63/.385; knot upper-right (.4,0-1,.6) m6 .220/.63/.293; bundle left part (0,0-.6,1) m4.5 .210/1.00/.321; swarmling left half (0,0-.55,1) m4 .206/.72/.314.
- Titan 3: husk left half (0,0-.55,1) m2.6 .215/.86/.413; slab corner (.45,0-1,.8) m3 .220/.63/.349; mass left part (0,0-.65,1) m4.4 .207/.53/.285; crawler right end (.4,0-1,1) m5 .256/.85/.409.
- Titan 4: comb teeth (0,.3-.5,1) m4 .214/.75/.415; winged right part (.45,0-1,1) m4.6 .240/.65/.466; blinker top (0,0-1,.8) m6.4 .205/.94/.295; eye left (0,0-.65,1) m4.2 .292/.63/.297; floater bell edge (0,0-1,.5) m3.8 .207/.72/.311.
Table: titan heights 0.435/0.455/0.425/0.430 H; widths 0.280/0.316/0.287/0.274 H; gaps 0.098/0.123/0.124 H; every share >= 0.53 (lowest strider, mass .53); all tops shown; probe 42/28; shears [0,3,1,4] [1,0,2,1] [2,2,3,0] [3,0,2,3] at 0.206-0.256 H. Tool exits 0.

## Layout v5 (look-judge fix)
Cuts (fractions u0,v0-u1,v1 of the unrotated ink box): gentleman 0,.05-.5,.6; tower 0,0-1,.38; strider 0-.33 wide, one leg; pearl 0,0-.55,.95; knot 0,0-.85,.8; swarmling 0,0-.78,1; mass .1,0-.75,.7; comb 0,0-.55,.7; winged 0,0-.48,1; floater 0,.15-.5,.8; bundle .45,0-1,.75; husk .35,.1-.85,.8; eye .2,0-.8,.6; chime 0,.5-1,1 (unchanged).
Titan 2 pulled apart (cuts unchanged): chime dx .02 dy .1 z21; pearl dx -.01 dy 0 z19; knot dx -.02 dy -.08 z17; swarmling dx -.07 dy -.05 z22; bundle unchanged.
Final tool numbers: heights 0.435/0.455/0.425/0.430 H; widths 0.284/0.299/0.318/0.298 H; gaps east 0.116/0.101/0.098 H; min share 0.52 (mass), titan 2 shares chime .55, pearl .53, knot .71, bundle .58, swarmling 1.00; shear pieces 0.201-0.255 H (shears unchanged); probe 42/28; tool exits 0.

## Layout v6 (D40)
Each titan has a `body` (rocks, plus tentacles when floating) behind/around the v5 pieces; filler dropped. Titans 1 and 3 grounded (stacked rocks narrowing to a peak, front lip rocks over the lower inner pieces), titans 2 and 4 floating (rock mass underside at about -0.21 H, three tentacles). Piece kinds, m, cuts, snaps unchanged; titan 1 gentleman dx -0.027, prism dx 0.079. Tool: body rocks and tentacles drawn at brightness 0.75 (was 0.45, which vanished on #0d1114), tentacles use the rocks' own greys.
Tool exits 0: heights 0.459/0.438/0.434/0.440 H, widths 0.313/0.299/0.318/0.298 H, gaps 0.087/0.101/0.098 H. Look: the pieces still dominate; the mountains read weakly and the tentacles barely show (needs another pass).

## Layout v7 (D41)
Tool: piece height floor 0.20 -> 0.06 H; new `body share` (body pixels not covered by pieces / all titan ink) must be >= 0.55; tentacle root width >= 0.012 H checked (tentacles already use the body rocks' colours and brightness 0.75).
Layout: grounded titans 1 and 3 are a five-rock massif (broad base, narrowing to a peak at the top); floating titans 2 and 4 are one heavy four-rock mass at about -0.34 H with five tentacles of uneven length hanging under it. Pieces shrunk (m about 0.4x), single pieces placed at the sides, peak or among the tentacles; every piece 0.084-0.139 H tall, shear pieces 0.084-0.116 H.
Tool exits 0: heights 0.473/0.460/0.450/0.460 H; widths 0.315/0.292/0.312/0.308 H; gaps east 0.086/0.086/0.130 H; body share 0.83/0.66/0.68/0.75; min piece share 0.68 (titan 1 prism), then crawler 0.85.

## Layout v8 (D40)
Tool: body rocks and tentacles no longer dimmed (brightness 1.0; lit 42 / shade 28, as the pieces' probe). Layout: titan 1 a six-rock mountain on a wide base, pieces tilted out of the flanks and peak; titans 2 and 4 masses lowered to about -0.27 H, pieces buried in the sides, top and underside (underside ones rotated to hang down), four tentacles with a real S bend and uneven lengths; thin pieces raised a little in m (gentleman 1.4, strider 0.8, needle 2.4, winged 2.3, blinker 2.9, floater 1.9). Titan 3 unchanged.
Tool exits 0: heights 0.453/0.417/0.450/0.418 H; widths 0.315/0.295/0.312/0.276 H; gaps east 0.099/0.075/0.145 H; body share 0.80/0.59/0.68/0.71; min piece share 0.83; probe 42, 28.

## Layout v9 titan 1 (D42)
Titan 1 (spires) rebuilt on titan 3's pattern: the six-rock column replaced by titan 3's five-rock grounded massif (same rock sizes, sx/sy and offsets, so the same broad base narrowing to a broken summit, no knob). Pieces moved onto the rock flanks and shoulder, tilted out (gentleman dx .02 rot -.3, tower .06 rot .3, needle upright rot 1.2 at dy -.23 so its top clears 0.28 H, prism .05 rot .7, strider -.01 rot -.5); kinds unchanged. Titans 2, 3, 4 and the tool untouched.
Tool exits 0: titan 1 height 0.450 H, width 0.312 H, gap east 0.117 H, body share 0.85, min piece share 0.86 (tower).

## Layout v9 titan 2 (D42)
Titan 2 (rings) rebuilt on titan 3's pattern: the four-rock mass at -0.27 H replaced by titan 3's five-rock body shifted up to a floating mass (same sizes, sx/sy; rocks at dy -0.19 to -0.41, a small front lip rock over the lower pieces); four tentacles kept, hanging below the body only, no pieces among them. Pieces set into the rock and tilted out of its face (chime dx 0 dy -.25 rot -.9, pearl -.01/-.25/-.3, knot .02/-.24/.9, bundle 0/-.24/1.0, swarmling .02/-.21/-.5); kinds unchanged. Titans 1, 3, 4 and the tool untouched.
Tool exits 0: titan 2 height 0.458 H, width 0.310 H, gap east 0.080 H, body share 0.69, min piece share 0.73 (pearl); titan 1 gap 0.097 H, titans 3 and 4 as before.

## Layout v10 titans 1 and 3 (D50)
Titans 1 and 3 lose the narrow-cap-on-broad-body silhouette (read as hooded figures). Each body is now six rocks with the upper two broad rocks overlapped (no neck): titan 1 leans left (peak rock at dx -.1 dy -.37, a lower right shoulder at .07/-.27), titan 3 leans right (peak at .09/-.36, left shoulder at -.06/-.25, a slanted shear face). Titan 3 book (mass, right side) and door (slab, upper left): slab now rot Q+.6 at dx -.09 dy -.29 with an irregular polygon cut, mass rot .6 at dx .04 dy -.14 with an irregular polygon cut, husk (box-like) rot -.5 with an irregular cut; kinds unchanged. Titans 2 and 4 and the tool untouched.
Tool exits 0: titan 1 height 0.410 H, width 0.312 H, gap east 0.097 H, body share 0.88; titan 3 height 0.413 H, width 0.315 H, gap east 0.142 H, body share 0.77; shear pieces 0.074-0.116 H; probe 42/28. Look: no cap or neck left; both read as broken lopsided rock.

## Layout v10 titan 4 (D50)
Titan 4 comb piece no longer a hair comb: the even box cut (0,0-.55,.7) is replaced by a seven-point ragged polygon that keeps the spine end and two or three broken stubs of different lengths, and rot 2.9 becomes 1.5 so the stubs lie off any straight axis. Kind, m, dx, dy, z unchanged; other pieces, titans 1 to 3 and the tool untouched.
Tool exits 0: comb h 0.083 H, share 1.00, ink 0.118 x 0.083 H; titan 4 height 0.418 H, body share 0.75. Look: a few uneven broken bars stuck in the rock, no row of parallel teeth.

## Layout v10b fix round (D50)
Titan 1: top-left overhang rock narrowed (dx -.05, sx 1.0, sy 1.2, rot -.3) so it sits on the body; gentleman now a five-point ragged polygon, buried (dx .03 dy -.08 rot -.45), no striped rectangle. Titan 3: crawler sunk into the right flank (dx .08 dy -.1 rot 1.0, ragged four-point cut), top rock narrowed (dx .06 sx 1.0 sy 1.2). Titan 4: top lump lowered and widened to merge with the body (dx .03 dy -.36 sx 1.5 sy 1.3); comb a four-point stub, m 2.1, rot .5, buried at dy -.17; floater and eye ragged polygon cuts, floater rot -.7 buried at dy -.27, eye rot .9 (no bowl, no even bars). Kinds unchanged; titan 2 and tool untouched.
Tool exits 0: heights 0.401/0.458/0.404/0.408 H; widths 0.312/0.310/0.313/0.277 H; body share 0.90/0.69/0.78/0.85.

## No outlines (D52 auto)
Rim removed from sheet tool and cutscene module. Piece filter lightened one step to keep pieces off the body: sheet FILT brightness 0.24 -> 0.34, cutscene FILT 0.14 -> 0.20. Core/filler unchanged.
D52 (auto) round 2: sheet piece FILT 0.34 -> 0.5, core 0.45 -> 0.25; cutscene piece FILT 0.20 -> 0.30, core 0.27 -> 0.15 (same ratios). Filler untouched (flat #141414, no brightness filter).

## Darker bodies (D53 auto)
Sheet: body rocks and tentacles brightness 1.0 -> 0.5, core 0.25 -> 0.15, filler #141414/#111111 -> #101010/#0e0e0e. Cutscene (x0.6): body rocks and tentacles 0.6 -> 0.30, core 0.15 -> 0.09, filler same colours. Pieces untouched. Body and core are not cached, so no cache key change.
Measured piece mean / body mean luminance (background #0d1114 = 16.4):
- Body 0.5 (kept): ratios 1.80 / 2.00 / 1.65 / 1.91; body mean 18.1-18.8 (only about +2 over the background).
- Body 0.6 (tried, rejected): ratios 1.53 / 1.70 / 1.39 / 1.62; body mean 21.3-22.2.
Both targets (ratio >= 1.6 and body >= bg + 4) cannot hold at once; the owner's coordinator ruled the ratio wins and the floor is relaxed to "body mean above the background". Fallback 0.4 not used.
