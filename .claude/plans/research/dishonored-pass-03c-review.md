# dp-3c review

Verdict: 1 gap.

## Gap 1: Pause and Skip plates overlap
css/bridge.css:575 (with :561, :566, :639-640)

Spec item 2 asks for the skip and step buttons to grow about 1.3x as painted plates. It does not ask for the controls to collide. `* { box-sizing: border-box }` (style.css:91) applies, so `min-width` already includes the padding.
- Desktop: Pause runs from 50%+10.55rem to 50%+16.55rem (min-width 6rem), but Skip starts at 50%+15.7rem, so they overlap by 0.85rem. Before the change Pause ended at 15.15rem, which left a 0.55rem gap.
- At 760px and below: Pause runs from 0.85rem to 6.85rem, but Skip starts at 5.65rem, so they overlap by 1.2rem. Before the change Pause ended at 5.45rem.
- Result: Skip's plate (painted later) covers Pause's right edge and the end of the "PAUSE" label. Clicks near that seam go to Skip, which skips the whole cutscene instead of pausing it.

Smallest fix: move Skip right by the growth. For example, desktop `.genesis-skip { left: calc(50% + 17.1rem) }`, and in the 760px query `.genesis-skip { left: 7.2rem }`. Another option is to drop Pause's min-width back to about 4.6rem plus the added padding, so it still ends before Skip.

## Checked, no gap
- Tile: the `chrome()` strokeRect (the 1px grey frame) is removed. The corner ticks and the readings are untouched. The `::before` paint is rgb(64 62 57) at 0.85, which is inside the spec's range. The tilt and the reduced-motion 0deg rule are kept.
- Genesis bar: the dashed `::after` is removed. The bar is 5px, quiet tone with a cream fill, ragged at the ends through clip-path. JS still builds `.genesis-prog > i` (genesis.js:89-92). Step and skip plates have no border.
- Rotate notice: `.rotate-say` uses var(--type-serif) at 1.2rem/1.4 in --type-cream, the same as `.type-lead` (style.css:385-386).
- No other files are touched. No `?v=` edits.

## Card scenes (rank-card-desktop/phone, glimpse-card-phone)
Explained. `card_scene` (tools/snap.py:470) calls `enter_via_gate(#gate-world)`. That lands on the home page with the bridge hero, fires the card and takes a viewport screenshot. The hero behind and around the card contains #bridge-term, whose tiles are drawn by `chrome()` and backed by the changed `.tinst-wrap::before`. On a touch-portrait phone viewport it may instead show #bridge-rotate with the restyled `.rotate-say`. So these diffs are expected.

## Not checked
I did not re-run the snaps or flows, and I did not view the screenshots.
