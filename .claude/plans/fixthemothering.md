# Fix the mothering

Stage: planning
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
(mostly superseded). New areas to research (digest
`research/fixthemothering-01-inside.md`): inside palette and soup · the
eye and dust separation · role bodies and clothes (enforcers, watchers,
mothers, messengers) · the circle, strands and colour thread · chains of
rings and scale to billions · corruption cut/return/sent up · Rex's
scale and the tear · womb-wall clash tier 0 → 1 · gods passing through
Rex · the calm floating womb · performance of many particles.

## Open items

- Research round → option map per area above.
- Round 2 questions from it (e.g. look of each role body, inside palette,
  how "billions" reads, how the gods pass through Rex).
- Then write the phases (outline below) and the ready gate.

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

## Constraints (every phase)

- `.claude/rules/art-style.md`; snap `same` outside each phase's scenes.
- Bridge loop cost: particles and strands stay cheap (memory: the rAF
  loop is the bill).

## Phase outline (draft; becomes Phases after round 2)

1. Beat table: new beats replace IX–XIX, renumber the later beats, and
   add stub draws.
2. Camera: enter the ball.
3. Soup: red eats blue.
4. Tier-3 eye: dust, dead dots, colour point, plus the rule line.
5. Roles: the old ones arrive, watch, take notes and build walls.
6. Enforcer bodies and clothes.
7. Watcher bodies and clothes.
8. Mother bodies and clothes.
9. Messenger bodies and clothes.
10. The transformation moment.
11. The circle: dust pile, strands, colour thread, first universe.
12. Chains: births, billions, magic.
13. Corruption: cut, return, the red sent up.
14. Rex: appears, tears, grows, rivers of chains.
15. The red dot and the intercept.
16. The clash at the womb walls.
17. Rex dies with his fist over Obrokxus.
18. The gods through Rex.
19. Pull out to the calm floating womb, then deep.
20. Review: full frame sheets, snap, flows.

## Progress

| # | Phase | Kind | Rests on | Status |
|---|---|---|---|---|

## Phases

## Carry forward

-
