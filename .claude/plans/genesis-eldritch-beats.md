# The inspired ones: the new beats (Phase 25 design)

Design for phases 26–29 of `.claude/plans/genesis-eldritch.md`. Research
in `.claude/plans/research/25-inspired.md`; lore in
`.claude/lore/eldritch.md`. Status: **settled** (phase 25a, 2026-09-25;
the owner's answers are D17–D24 in the plan, summed up at the end).

## The idea in one paragraph

After the womb, the old ones do not stand and watch. They open the body,
build small worlds inside it by hand (law by law, no magic: Crede, ergo
magica est is exactly what these worlds lack), pull the devouring souls
apart, remake them from the pieces that hold, and send them through life
after life. After enough lives, two souls remember what nobody taught
them. Those two are the lights that tear out of the womb at `birth`:
Rex and Obrokxus. The old ones, their work done, have mostly gone; a
few powerful ones stay, having chosen to care for the soul kind forever.
This joins D16 to the existing story without changing a caption: the
womb caption becomes the question the new beats answer, and "first born"
stays true (the first *born*; everything before was made).

## Where they sit

Five beats between `womb` (X) and `birth`, about 38 s, taking the
cutscene from 225 s to about 264 s (D18).

| # | id | dur | tag | one idea on screen |
|---|---|---|---|---|
| XI | `dress` | 7.0 | XI · Borrowed shape | bodies snap to their evolved assets; the first clothes, self-made |
| XII | `worlds` | 8.5 | XII · The made worlds | the body opens; rows of tiny hand-cranked worlds inside |
| XIII | `remake` | 7.5 | XIII · Taken apart | a devouring clot pulled into threads; a soul rebuilt heart first |
| XIV | `lives` | 9.0 | XIV · Again | spin, measure, cut: lives dropped into the worlds; two souls change colour |
| XV | `leave` | 6.5 | XV · The hands | most lamps go out; the old ones scatter; a few stay lit |

`birth` and every later tag get renumbered: XI→XVI through
XXVIII→XXXIII (D19).

## Camera

Today the flesh centre sits on the right screen edge from `root` to
`land`, half the body off-screen. For `worlds` → `lives` the camera
eases left so the centre sits at about 0.72 W and the zoom climbs to
about 1.25, so we look *into* it; `leave` pulls back out to 1.00, and
`birth` resumes today's framing. Zoom stays one global value (the
existing ZOOM table gets five rows).

## Beat by beat

### XI · `dress` (Phase 26)

- **Shown.** The east-goers still kneel round the rim, still (womb's
  stillness carries over). One at a time, never two together, a bare
  body **snaps** to its evolved asset (no morph: a hold, a one-frame
  change, a hold, per "stillness is the uncanny"). The evolved asset is
  drawn on its own (D22): the inspired body and the clothes it made,
  not the bare sprite with cloth laid on. Between snaps a few are seen
  making: a length of cloth pulled taut, cut, wrapped against the cold
  of the void (D23): made by hand, not conjured, not copied from
  anyone. By the end about half are changed; the rest change
  off-screen (they come back dressed in `worlds`).
- **Body change rule.** The inspired body is the bare body pulled toward
  the soul kind's *upright*: it gains a vertical axis, a top a hat can
  sit on, a shoulder line cloth can hang from, and something that reads
  as a foot. It keeps its own kind (a roller is still round, a comb
  still toothed). Phase 5 casts each of the 16; four examples: the
  tower grows a narrower "neck" band under its top (the hat's seat);
  the roller rises onto one peg foot (one huge boot); the veil's hem
  lifts into a shoulder line (a cape); the mass grows a single ledge
  (a muffler slung on it).
- **Headless gentleman.** Bare among the east-goers from the emergence
  (D21), like everyone else. He changes here with the rest; his evolved
  asset is the tall, thin, fully tailored one with the very tall hat.
- **Flesh.** The gold seal holds; the eyes stay shut; souls keep their
  slow ring.

### XII · `worlds` (Phase 27)

- **Shown.** Two old ones draw the skin back like a tent flap: a
  lens-shaped cutaway opens in the flesh's left face. Inside: rows of
  tiny worlds, each a flat stack of discs (an orrery, a spindle of
  whorls), grey on grey with one muted tone each, ruled rings and tick
  marks, no glow. Old ones at the rim turn cranks; a chain of punched
  cards feeds a loom-like frame at the cutaway's edge, and each card
  that passes sets one law in the nearest world (a ring locks, a disc
  flattens, an orbit stops wobbling): a click and a stop, never light.
- **Without magic.** Every change has a visible cause: a crank, a card,
  a rod pushing a folded world through a slit (ship in a bottle) and a
  thread pulling it open inside. Nothing appears on its own.
- **Many, not one.** At least a dozen worlds in view, tiled like cells,
  so it reads as a works, not a miracle.
- **Cost.** Each world is one cached sprite rotated by `drawImage`; the
  card chain is a scrolling cached strip.

### XIII · `remake` (Phase 28, first half)

- **Shown.** The gold dots stop being a calm ring: close up they are
  clots, souls fused and eating each other (a lumpy gold mass with dots
  vanishing into it). Two old ones pull one clot apart with long tongs;
  it strings out into pale threads; some snap and fall away into the
  dark (the waste stays visible). One kept piece goes onto a flat
  counter: a small bright core first, then a lattice closes round it
  (too regular to be born), then a thin cloth over it, like a garment
  on a form. The soul is made the way their coats were made.
- **Cost.** Threads are a few line segments per frame; the lattice is a
  cached sprite revealed by a clip.

### XIV · `lives` (Phase 28, second half)

- **Shown.** Three old ones in a line: one spins a thread off a remade
  soul, one lays a rod along it, one closes shears. The cut end falls
  into a world below as a spark; the world turns; the spark comes back
  up paler with a faint ring round it (one life's trace). The line
  speeds up. Returning souls pass through a thin dark band (the
  forgetting) and come out blank, but the rings stay.
- **The end of it.** Two souls come back carrying many rings. One comes
  up warm, burning; one comes up wrong. They are the first colour inside
  a made world (neither the gold seal nor the rift light: Rex's warm
  white and Obrokxus's red). Every crank stops. Every old one turns
  toward them at the same moment. Hold.

### XV · `leave` (Phase 29)

- **Shown.** The old ones fold their tools; the cutaway closes; most of the
  work lamps along the rim go out one by one, left to right. Each old
  one's accent becomes one small pin of light; the pins run once back
  along the rim, then scatter outward across the void in every
  direction like ships' lamps leaving harbour, and fade. The last thing
  moving is the Primordisentia, turning, full of worlds, unwatched.
  The camera pulls back to `birth`'s framing.
- **Who stays (D20, D25).** Not every pin leaves. Three tier-2 old
  ones keep their lamps lit and stay on the rim: the ones who decided
  to care for the soul kind forever. Above them, two tier-3 beings of
  the sky do the same: two edges at the top of the frame stop drifting
  and hold over the womb, a pocket of far lights kept dark round them.
  Never half in frame, never light or contact (the tier-3 rules).
- **Consequence.** Only the three watch `birth` and `fight`: the 55 %
  watch stays, thinned to them (the `land` fade as today); the two
  tier-3 edges hold still through `birth`. The
  rest next appear only as the civilizations of Phase 19.

## Draft captions (the record's voice)

Placeholders for the whole plan (D24): the owner will replace the text
and how captions work later. Use these as they are; do not polish.

The record is written by the soul kind, and the soul kind lived these
beats from inside, so for the first time it can say "we". It sees hands
and work, never the sky; it says "they" for the old ones, as `swarm`
does; it never says "magic" (the womb's Latin already said it); no
"universe", no numbers.

- **XI · Borrowed shape.** "Binding it, they learned from it. They took
  our shape as far as they could bear it, and covered what they could
  not change."
- **XII · The made worlds.** "Inside the womb they made places for us,
  by hand, one law at a time. Nothing in them answered to belief."
- **XIII · Taken apart.** "We had been eating one another since before
  there was a before. They pulled us apart, kept what would hold, and
  made us again."
- **XIV · Again.** "We lived, and forgot, and were sent to live again,
  more times than anyone counted. Then two of us remembered what no
  one had taught."
- **XV · The hands.** "And the hands were gone. The worlds went on
  turning, and nothing watched them any more."

Then `birth` as it stands: "Two lights tore out of the womb."

## What the code change touches (for phases 26–29)

- `G.BEATS` in `js/genesis/genesis-state.js`: five entries after `womb`,
  every later tag renumbered, MAP.md "29 beats" → 34.
- `genesis.js`: five ZOOM rows, a camera aim for the new beats, and the
  env chain (pain, cry, patches, souls, cling/still/watch) extended so
  `womb`'s end state holds through the new beats.
- `genesis-oldones.js` `place()`: the new poses (crank, pull, line,
  leave); the watch thinned to the carers who stay (D20). Each
  east-goer needs a second painter for its evolved asset (D22).
- `genesis-flesh.js`: the cutaway, the clots, the souls' new motion.
- A new painter file for the works (worlds, cards, counter, threads)
  *(proposed)*: `js/genesis/genesis-works.js`, loaded after `genesis-flesh`.
- `snap.py` picks new scenes up by itself (`genesis-dress` …); old
  baselines have no match for them, and every later beat's scene shifts
  in time, so the first capture after the insert is the new baseline.

## The owner's answers (phase 25a, D17–D24)

- **Q1 · Story tie.** Yes: Rex and Obrokxus remembered first (D17).
- **Q2 · Beats.** Five, ~38 s (D18).
- **Q3 · Numbering.** Renumber: XI–XV new, `birth` XVI (D19).
- **Q4 · After the leaving.** Most gone before `birth`; a very small,
  powerful share stay to care for the soul kind forever and watch
  `birth` and `fight` (D20).
- **Q5 · Gentleman.** Bare from the emergence, changed at `dress` with
  the rest (D21). Every east-goer gets its own evolved asset: the
  roster's east-goer drawings double (D22).
- **Q6 · First clothes.** Inspired, they make their own at `dress`;
  winter clothes because the void is cold (D23). The copied-from-the-
  cold-world idea is dropped.
- **Q7 · Captions.** Kept as drafted, as placeholders for the whole
  plan (D24).
