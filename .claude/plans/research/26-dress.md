# Phase 26 · `dress` (XI): research and anchors

Sources: plan `### 26`, D21–D23, D28; beats doc `genesis-eldritch-beats.md`
:29 (table row: `dress`, 7.0 s, "XI · Borrowed shape"), :49-74 (XI beat
by beat), :152 (caption draft), :168-183 (beat-insert touch list).

## Beats today
- `G.BEATS` genesis-state.js:22-80, fields `{id, dur, tag, line}`; `womb`
  :41 (7.0 s, "X · Crede, ergo magica est"), `birth` :43 ("XI · First
  born"). Womb line already names the binding ("They bound the wound in
  gold, and named the binding a womb."). Design caption for XI:
  tag "XI · Borrowed shape", line "Binding it, they learned from it. They
  took our shape as far as they could bear it, and covered what they could
  not change." (D24: placeholder, not polished.)
- `BEAT_INDEX` :82-83 and `G.BEAT_START` :85-89 derive from the array.
  `G.since(id)` :305 is 0/1 outside the beat, smoothed 0..1 inside; NOT
  seconds. `G.secs(id)` :331 is seconds (negative before). `G.idxOf` :301
  returns 0 for an unknown id, so `since("dress")` is 1 today: that is why
  `dressNow` (oldones:304) and `frostNow`/`_hasDress` (oldones:813-817)
  guard on the beat existing.
- Auto from the array: progress bar genesis.js:66-78, go/seek/step
  :80, :201-241, snap.py scene list :212-220 (`genesis-dress` appears by
  itself), gframes.py :20/:33, `?gbeat=` state.js:9. nav-flows.test.py
  lists no beats.
- Hand-kept: ZOOM table genesis.js:244-253 (missing key = [1,1]; womb
  ends 1.00, birth starts 1.00, so `dress: [1.00, 1.00]`). Camera
  genesis.js:313-318 holds from root to land (no change). Env chain
  genesis.js:402-473 reads since(womb)/since(birth), so womb's end state
  (seal, pain, cry, patches, souls, still=1, watch=0) holds through
  `dress` with no edit. MAP.md:187 "29 beats" → 30.
- Numerals: D19 wants birth = XVI once all five exist. Adding only `dress`
  means either renumber birth..eternity +1 now (XII..XXIX; phases 27-29
  each shift again) or jump to the final XVI..XXXIII now with a visible
  gap. Recommend +1 now (the record reads consecutive at every commit).

## Old ones at the womb
- `place()` oldones:163-273; env from genesis.js:467-473 (`still =
  uWomb`, `watch = uBirth*0.4 + uFight`), main layer (the "inside" layer
  :451 is only the emergence). Cling :222-238 still orbits at 15 % speed
  when still=1 (`G.t*o.spin*(1-0.85*still)`): not fully still.
- Kneel :251-256: three held poses over `womb`, bow rot 0 at still=1, so
  in `dress` every east-goer is fully knelt (p.kneel=1). Twitch :258-262
  (0.08 s every 6-9 s) and stutter :206-212 keep running.
- `p.gest` :250/:264-268: 0.4 s sine pulse every 9-13 s, gated by
  `o.dressed ?? dressNow()`. No painter reads it.
- `o.side` >0 east (17), <0 west (7); `o.bro` = Obrokxus's brothers
  (makeOne :157), painters force bare for bro. `o.dressed` is only set on
  jscheck copies; every painter does `o.dressed != null ? o.dressed :
  dressNow()`: oldones :312, :569, :611, :674, :783 and oldkin :22, :120,
  :216, :310, :417, :527, :620, :694, :813, :965, :1060, :1144 (310 has no
  bro guard, like gentleman :312).
- `dressNow()` is global: the moment `dress` starts, all 17 flip at once.

## Painters
- `PAINT` oldones:909, `drawKind(ctx,kind,o,x,y,h,p)` :913, draw loop
  `drawOldOnes` :919-941 calls `PAINT[o.kind](ctx,o,p.x,p.y,o.hf*H,p)`.
- `gentlemanDressed(ctx,o,x,y,h,p)` :369-447; hat last at :446
  `GA.draw(ctx,"hat",x,brimY,sHat,att.hat)`.
- `GenAttire.draw(ctx,piece,x,y,s,opt)` attire:127: `opt.rot`/`opt.lift`
  exist (:135-136) but are baked into the cache key (:173-175, cache
  clears past 96), so a per-frame tilt through opt thrashes the cache.
  The wind tip (:93) is applied at blit time. Tip the hat from the painter
  instead: ctx.save/translate(x,brimY)/rotate(-0.22*p.gest)/translate
  back, lift by 0.25*sHat*p.gest, around the one hat call.

## Recommended minimal design
1. state.js: insert `{id:"dress", dur:7.0, tag:"XI · Borrowed shape",
   line:<draft>}` after womb; renumber later tags +1. genesis.js: ZOOM
   `dress:[1.00,1.00]`. MAP.md row.
2. oldones: `DRESS_AT` per roster idx (seconds into `dress`), east-goers
   only, spaced ≥0.35 s so no two snap together, visible ones first, the
   gentleman last (~6.2 s, the tall hat as the finale); all ≤6.6 s so
   nobody snaps at the birth cut. `dressNow(o)`: with `o` → `o.side>0 &&
   !o.bro && G.secs("dress") >= DRESS_AT[o.idx]` (beat-exists guard kept);
   without `o` → today's meaning. Every call site passes `o` (22 edits of
   one token); the `o.dressed` override stays first.
3. place(): with `ds = G.secs("dress") - DRESS_AT[idx]`, a hold window
   ds ∈ [-0.35, 0.35]: freeze phase/rot, no twitch, gest 0 (stillness,
   one-frame change, stillness). No flash: a glow breaks "soft glow only
   for emitters"; at most one frame of the new silhouette in flat pale.
4. Making, ds ∈ [-1.8, -0.35]: `p.make` 0..1 in three held steps (pull
   taut, cut, wrap), drawn by a small `drawMaking(ctx,o,p,h)` after the
   bare painter in drawOldOnes: a flat cloth strip (GenEldPal cloth tone)
   held between two points above the body, never laid on it (D28).
5. gentlemanDressed reads p.gest (hat tip as above; cane grip nudge).

## Risks
- Snap scenes: `genesis-dress` is new; birth and fight change (everyone
  now dressed, frost=1 → snow caps) — expected, the new baseline. Other
  scenes should stay `same` (gbeat seeks by beat, G.secs is relative).
- 22 call sites: a missed one flips globally (checked by a frame sheet:
  `py -3 tools/gframes.py p26 womb dress birth`).
- Frost grows over dress (since, 0..1): snow bit flips at ~3.5 s, so
  early snaps are snowless, late ones snowy: fine, reads as cold setting in.
- Cling drift and stutter still run during holds unless frozen in (3).
- Off-screen east-goers: keep their DRESS_AT anyway (no second switch).
