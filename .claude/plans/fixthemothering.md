# Fix the mothering

Stage: running
Started: 2026-09-26
Procedure: `.claude/skills/plan/SKILL.md` (planning loop, then "go").

## Brief (owner's words, verbatim)

First brief (superseded): in the cutscene we need to take a good look at the whole old ones helps the giant ball of flesh they found on right side of the bridge

Brief (2026-09-26, the one we build):

the mothering / semesis, the cutscene, the part where the old ones go to womb until the soul kind is born uncluding / we kinda need to rmeov ehwat we have and bring the camera inside the flesh blob that stand to the right of the bridge, once we come out it looks more peacfull like a floating womb idk a ball of sorts / we have the blob, we go inside of it and show, like a primordial soup, mostly red and a bit blue, the red is eating the blue away, an eldritch eye pops in does it magic and turns everything to dust, seperating the colour from the dots. the dots fall down dead, and the colour mixes all in a single point. and then the other old ones tier 2 apper and start wtsahcign taking notes, making walls around its, they take roles, the enforcers, the watchers, the mothers, the messengers, / anyway vissually they make a new circle someone builds it, and they maketons of onines where nthe uncolour cells follow into this new cirle like a pile of dust on the floot, and many thuser thin strands atachet to it traveling a long time in a siwrling string that all leads into this new circle, and from the single point where all the colour went a single thread connects also into the circle, and that circle becomes the first universe, with very litle emotion, or antyhing going on and without magic. but it doesnt git they cant continue pumping, so that circle births another circle, but these are like connected chainend togheetr like rings, and with time theres billion of these universes, theres many more initial chains and their are brithers with maghic, some go red and get corrupted, and the old ones cut them down, returning it to the base process but some of it cannot be returned the red doesnt come out, so they send it up and starts building up. / you can do that and then rex immotus appears, so big that he ripps appart the universe and his body keeps growing being bigger thatn many universers, hte stops, and the chains of univers start getting into peace with him like rivers. then a red dot comes out of a corrupted universe , rex moves to intercerpt it / they start clashing agaisnt the walls of the womb leaving the tier 0 dimension onto the tier 1 their bodies and souls gfighting agaisnt the corrupting of the chaos of the void chaging. / what happner here is that during this rex dies, before he even gets to trully leave the womb but his fist curls over obrokxus touching the void itself and then we can go onto the gods comming out, but instead of leaving the womb to the void, they travel trought rex, rex became the land, and the bridge bwteen the womb and the outside the world, he is absically the organ that helps birth be possible and all of soulking is made from his body, a litle piece of him goes with every new born so the cutscene part where the gods leave and then travel to rex is wrong get it?

## Scope

- In: beats swarm IX → gods XIX of `G.BEATS` (≈80 s) are replaced by the
  inside-the-womb story (D1); the dress assets move to the Roles moment
  (D2, D9); captions and numerals from here on (D7); one art-style rule
  line for the tier-3 eye (D8).
- Out (stays exactly as is): acts I–VIII (point → root); `deep` XX and
  every beat after it except its numeral; the bridge page outside the
  cutscene; tier 3 anywhere but the eye.

## Current state (explored 2026-09-26; anchors drift, grep the names)

- The ball: genesis-flesh.js (lobes, veins, eyes, mouths, `drawSeal`),
  centre sx(ROOT_U=4.0), 0.5H; camera aims ROOT_U-0.50 (genesis.js
  `camAim`), so the ball is half off screen.
- Old ones: genesis-oldones.js `place()`, `CARERS`; dress = clothed
  bodies in held steps. Worlds: genesis-works.js. Remake/lives:
  genesis-remake.js. Fight: genesis-titans.js. Land/gods:
  genesis-rex.js (`drawRexLand`, `drawGodsBirth`). `drawRip`: grep it.
- Tier 3: genesis-tier3.js; art-style.md says it never touches.

## Option map (planning only; struck lines are settled by a D)

Digest of the first brief: `research/fixthemothering-00-intake.md`
(mostly superseded). Digest of the new one:
`research/fixthemothering-01-inside.md` (sources and precedents there).

- Soup: flat maroon→rose blob layers, blue a small cool accent; a red blob
  grows a held step per blue it swallows (Scavengers Reign, Spore cell stage).
  Alt: dense dot field, red dots convert blue dots on contact (Life-like CA).
- Eye: lidless tier-3 arc cut by the frame edge, never beams; a stepped wave
  crosses the soup, each dot splits into a rising colour chip and a grey dot
  that drops (Bloodborne + the Thanos-snap dust + chromatography).
  Alt: the eye fills the frame and the dust happens under its gaze.
- Roles: two snaps (bare → in-between → role body), no morph; silhouette +
  one tool: enforcer oversized head/jaw + blade; watcher tall, hood with eye
  holes; mother low and wide, bustle and ring cradle; messenger lean, long
  shoes, spindle/reel (termite castes, the Moirai).
  Alt: keep today's dress bodies and assign them to roles by closest fit.
- Circle: dust pile creeps to the rim like a dune; pre-baked grey strands
  spiral in; one saturated thread from the colour point; snaps to a dull disc
  (accretion disk, Tyler Hobbs flow fields, Chiharu Shiota threads).
- Chains / billions: rings snap out interlinked; 3–4 held 10× zoom-out jumps;
  last shot one pre-rendered chain web stamped many times; magic rings carry
  one bright chip (Powers of Ten, galaxy filaments).
  Alt: no zoom, a counter-like caption carries "billions".
- Corruption: red arc spreads round a ring in steps; an enforcer cuts the
  links; mothers fold it back to grey dust; unreturnable red rises and
  thickens a red layer at the womb roof (efferocytosis, Atropos).
- Rex: pushes one ring apart into two arcs; grows in held steps matched to
  the zoom-out; only part of him in frame; chains settle round him as braided
  channels (Pangu, Shadow of the Colossus, braided rivers).
- Clash: flat stepped polygon rings snap out per blow, no glow; the womb wall
  bulges until a torn edge shows the tier-1 strata; fist closes over the red
  dot (Evangelion AT fields).
- Gods through Rex: his outline turns to terrain in steps (shoulder → ridge,
  arm → bridge); small god silhouettes pass one per held step through a
  channel inside him, each taking a chip of his colour (Ymir, Pangu).
  Alt: cutaway, Rex's body as a translucent tunnel the gods walk through.
- Calm womb: slow pull back to the ball; redrawn smoother, mouths shut, eyes
  closed, snapped in at the cut; still hold; faint darker band at the top from
  the red layer (2001 Star Child, Nilsson's womb photographs).
  Alt: today's ball unchanged, only its motion stilled.
- Performance: fixed typed arrays of ~800–1500 dots, one fill per group,
  integer-pixel rects; positions update 6–12×/s; strands one path per bundle;
  static layers baked offscreen once (MDN canvas optimisation).

## Open items

- None. Areas not asked (corruption, Rex's tear, the clash, performance)
  follow the digest's first direction; each phase's research may refine it.

## Decisions (owner answers; `(auto)` = taken while running, review at the end)

- D1 Replace swarm IX → gods XIX; `deep` XX onward stays.
- D2 (owner) "But the clothing stuff we need to keep, i forgot tos ay it would happen when the univeres come to be , because these old ones appear isnide the womb now, we shouldnt justbdelete them and remake them" → the old ones seen inside are the same old ones; nothing deleted and redrawn from scratch.
- D3 Runtime ~80–90 s, about one beat per moment.
- D4 The red dot is Obrokxus's first form.
- D5 The outside view returns only as the last shot, after the gods pass through Rex: calm ball right of the bridge, Rex's land running from it.
- D6 Roles = existing old ones grouped by task (walls, watching, carrying rings, running strands); one caption names the four roles.
- D7 New captions and Roman numerals; deep and later beats renumber.
- D8 The dust eye is tier 3: the one exception to tier-3 no-touch; art-style.md gets a matching line.
- D9 (owner) "when the old ones start taking the roles of enforcers and what not, thats the moment they chaneg their bodies to become those things and adquire clothes as well. we need to make tons of pahse sfor this i imaigne" → the dress moment is the Roles beat; each old one becomes a whole new role body with its clothes (never bare + overlay); one phase per role group.
- D10 Role bodies: reuse today's dress bodies, each assigned to the role it fits best (refines D9: no new role bodies drawn; the role phases become assignment + the snap).
- D11 Inside palette: flat flesh reds (maroon → rose) lit from the left, blue as a few small cool spots that the red swallows in held steps.
- D12 Billions: rings snap out linked like chain mail, then a stepped zoom-out of 3–4 held ~10× jumps, ending on one chain web stamped many times.
- D13 (owner) "the  current ouline of rex is perfecdt i dont wanna change it, the one where he is land, since the camera is inside the womb, we should be able to see the ouside, we can even make a new like schene inside to make sure, that thw womb stuf fis its own thing, we just ned to make them travel trought it i think, unless oyu think yoiu can do better" → Rex's land outline stays exactly as drawn today; the womb scenes are their own new scenes.
- D14 Gods staging: from inside, the wall where Rex died opens like a window onto today's land scene; the gods leave the womb into his body and travel along inside the land outline to the bridge; then the calm pull-out.
- D15 Calm womb: slow pull back; the ball snaps to a smoother version, mouths shut, eyes closed; still hold; faint darker band at the top (the red sent up).
- D16 The eye: only a lidless arc, cut by the frame edge; no beam; a stepped wave crosses the soup and turns it to dust.
- D17 Role change: the old ones gather in four groups by task; each group snaps bare → dressed in held steps, one group after another; the caption names the four roles.

## Constraints (every phase)

- `.claude/rules/art-style.md`; snap `same` outside each phase's scenes.
- Bridge loop cost: particles and strands stay cheap (memory: the rAF
  loop is the bill).

## Progress

| # | Phase | Kind | Rests on | Status |
|---|---|---|---|---|
| 1 | Beat table and stubs | code | D1 D3 D7 | done 7ac76ed |
| 2 | Enter the ball | code | D1 Brief | done d60af1e |
| 3 | Soup: red eats blue | code | D11 | done a60a975 |
| 4 | Tier-3 eye and dust | code | D8 D16 | done 62d13da |
| 5 | Roles: arrive, watch, walls | code | D2 D6 | done |
| 6 | Role map: dress bodies to roles | research+doc | D10 | done |
| 7 | Role change snap | code | D9 D10 D17 | done |
| 8 | Circle and first universe | code | Brief | done |
| 9 | Chains and billions | code | D12 | todo |
| 10 | Corruption: cut, return, sent up | code | Brief | todo |
| 11 | Rex: tear, growth, rivers | code | Brief D13 | todo |
| 12 | Red dot and intercept | code | D4 | todo |
| 13 | Clash at the womb walls | code | Brief | todo |
| 14 | Rex dies, fist over Obrokxus | code | D4 Brief | todo |
| 15 | Gods through Rex | code | D13 D14 | todo |
| 16 | Calm womb, then deep | code | D5 D15 | todo |
| 17 | Review | review | D1-D17 | todo |

## Phases

Every code phase: research its topics first (digest `research/fixthemothering-NN.md`),
verify with `py -3 tools/gframes.py <run> <its beats>` frame sheets read as PNGs,
snap compare `same` outside its scenes, and the genesis nav-flows.

1. **Beat table and stubs.** Replace swarm IX…gods XIX in `G.BEATS` with the new
   beats (enter, soup, eye, roles, circle, chains, corrupt, rex, dot, clash, death,
   gods, calm) totalling ~80–90 s; renumber deep XX onward; new captions; each new
   beat draws a flat placeholder. Retire the draws only the old beats used; keep
   dress assets, Rex's land draw and the ball.
2. **Enter the ball.** The camera pushes from the outside find into the ball
   (held zoom steps), cut to the inside scene frame.
3. **Soup.** Flesh-red blob layers, blue spots swallowed in held steps (D11);
   baked static layers, cheap particles.
4. **Tier-3 eye.** Edge arc (D16), stepped wave, dots split into colour chip up and
   grey dot down, colour pools to one point; add the D8 line to `.claude/rules/art-style.md`.
5. **Roles arrive.** The same old ones (D2) enter, watch, take notes, raise walls.
6. **Role map.** Read the dress bodies, assign each to enforcer / watcher / mother /
   messenger (D10), write the table into Carry forward. No code.
7. **Role change.** Four task groups, each snaps bare → dressed in held steps, one
   group after another; caption names the four roles (D17).
8. **Circle.** Dust creeps to a pile at the rim, baked grey strands spiral in, one
   saturated thread from the colour point, snap to a dull disc: the first universe.
9. **Chains.** Rings birth linked rings; 3–4 held ~10× zoom-outs to a stamped web;
   magic rings carry a bright chip (D12).
10. **Corruption.** Red spreads round a ring in steps, an enforcer cuts, mothers fold
    it back to dust; unreturnable red rises into a layer at the roof.
11. **Rex.** Tears one ring into two arcs, grows in held steps with the zoom, only
    part in frame; chains settle round him as braided channels (D13: inside scene
    is its own drawing; the land outline is untouched).
12. **Red dot.** A red dot (Obrokxus, D4) leaves a corrupted ring; Rex moves to cut it off.
13. **Clash.** Flat stepped polygon rings per blow, no glow; the womb wall bulges and
    tears to show tier-1 strata.
14. **Rex dies.** He dies before leaving the womb; his fist closes over the red dot
    at the torn wall.
15. **Gods through Rex.** The wall opens onto today's land scene, unchanged (D13,
    D14); the gods travel through his body along the land outline to the bridge,
    each taking a chip of his colour. Replaces the leave-then-travel route.
16. **Calm womb.** Pull back; the smoother ball, mouths shut, eyes closed, still
    hold, dark band on top (D15); hand to deep.
17. **Review.** Full-run frame sheets, full snap capture vs the plan's start,
    full nav-flows; fix gaps; list every `(auto)` D.

## Carry forward

- P1 remap: old swarm→enter, womb→soup, dress→roles, leave/land→gods (oldones, rex drawRexLand/drawBuried, orb, trade, elements, genesis.js camAim/sealAmt/shake/landRise). tier3 POSE has only gods + calm (= gods); no tier-3 draw on the inside beats yet.
- `drawInsidePlaceholder` in genesis.js covers enter..death (flat flesh ellipses, stepped alpha in enter): each inside phase narrows or replaces it; delete it by phase 14.
- Dormant, delete in their phases: GenWorks/GenRemake (phase 8); titan fight + drawRip behind `OLD_TITANS` const, watch pose and birth/fight shake entries (phase 13). uBirth/uFight = `pastBirth` (0/1 at gods) so lightsAt stays right in deep.
- `G.idxOf` returns BEATS.length for a missing id. gods is currently a stub mix (land rising + old gods birth); phase 15 rebuilds it.
- Snap baseline for the inside beats: `snapshots/mothering-p1` (genesis-gods DIFF vs before is expected).
- P2: enter = `ENTER_ZOOM` 4 held steps via `enterStep()`, hard cut to inside at linear 0.8; soup..death pin cam at ROOT_U. Inside scenes draw in screen space (`G.W`, `G.H`, `G.local`) after `drawInsidePlaceholder(ctx)` in genesis.js.
- P3: `js/genesis/genesis-soup.js` = `GenSoup.draw(ctx,W,H,t,reduced)`, called in soup only; PAL flesh reds + blue, hashed dots (90 red, 14 blue) cached per W×H, held drift every 0.5 s, all blue eaten by 5.8 s, frozen after 6 s. Phase 4 starts from that final soup (expose the dot list if the dust needs it). Polish for phase 17: lit sliver is a hard rectangle at the left edge; red dots read as thin crescents (shade circle too big). MAP.md row for genesis-soup.js still to add.
- P4: `js/genesis/genesis-eye.js` = `GenEye.draw` in `eye`; GenSoup now exports `drawBackdrop finalReds shaded PAL`. End state (t≥6): grey dust dots on/near the floor (≤0.84 H), one rose pool dot at (0.30 W, 0.24 H), eye arc top-right. Phase 5 and the circle (8) start from that: dust = finalReds positions fallen, pool = the colour point. Polish for 17: the pool point sits under the caption; move it (e.g. 0.30 W, 0.40 H). Snap compare vs mothering-p1 still not run: do it in 17.
- P5: `js/genesis/genesis-roles.js` = `GenRoles.draw` in `roles` (after GenEye in genesis.js). East-goers from `GenOld.ROSTER` (side 1) as shallow copies with `dressed:false`, slots across 0.10-0.90 W, two rows at 0.90/0.97 H; walk in 8 held steps from 0.15 i s; notes from 2.8 s; wall stacks at 0.02-0.12 W and 0.88-0.98 W snap up from 3.6 s. drawKind pose: phase in radians, gest 0..1, make -1 = not making. Phase 7 snaps these same copies to `dressed:true` per group. Polish for 17: figures read small and grey against the flesh; consider larger h or a lighter tint.
- P6 role map (17 east-goers, roster idx; groups snap in caption order, one after another; within a group in this order; the gentleman goes last of all watchers):
  | role | task in `roles` | kinds (idx) | why |
  |---|---|---|---|
  | enforcers | raise the walls | tower 10, slab 14, roller 7, comb 16 | heavy columns and found suits, the mass that holds a wall |
  | watchers | watch, take notes | blinker 6, needle 13, prism 21, gentleman 0 | deerstalker, veil, the watch and the headless stare |
  | mothers | carry rings (the carers stay) | eye 8, chime 20, mound 23, bundle 12, bloom 15 | CARERS plus the muff and the bonnet |
  | messengers | run strands | mass 9, veil 17, knot 18, swarmling 22 | trailing muffler, cape, wheel, umbrella: things that travel |
- P7 (genesis-roles.js): GROUPS = the P6 idx lists; snapAt(idx) = 4.6 + 0.8·group + 0.15·k; each figure goes bare → empty 0.2 s → dressed copy (obD). Figures ×1.35 taller. Dressed figures stop taking notes. Reduced motion: all dressed. Later beats that show these old ones inside must draw them dressed (dressed:true copies).
- P8 (genesis-circle.js): circle centre (0.56W, 0.50H), R = 0.15·min(W,H); pool P (0.30W, 0.24H); from 5.6 s a dull flat disc #5a4c4e (lit left #6e5e60) plus the rose thread from P. Chains (P9) should start from this disc. GenWorks and GenRemake deleted (soulAmt no longer scaled).
  West-goers stay bare and are not drawn inside. Phase 7 uses this table for the snap order and for which figures gesture which task.
