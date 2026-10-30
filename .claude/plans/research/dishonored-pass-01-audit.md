# dishonored-pass · audit (phase 1, 2026-10-30)

Baseline: 23 views judged (each desktop and 390 shot; the -375 runs were checked only for overflow and clipping). Refs: dishonored-pause-1/-2. Not judged: top bar, bridge canvas/HUD, toys, genesis.

- **Statement 1 (pause-menu plates, wash, one cream strip): NO on 23/23.** No view has a torn black stroke or a painted grey wash. Plates are flat black/blue-grey boxes with 1 px grey borders, or there is nothing at all.
- **Statement 2 (cream serif on black, red only as hairline/mark/frame): yes on 8/23** (index-work x2, page-404 x2, glimpse-card x2, rank-card x2). No on gate, bridge chrome, rotate notice, experience, footer, sector-zero.
- **Statement 3 (nothing borrowed, a few big marks): NO on 23/23.** Reads as a dark-mode portfolio site: no ink marks anywhere, web modals, flat fills.
- **Verdict: FAIL** (expected for the baseline).

First reactions (one line each): gate = dark web landing hero with a bold sans headline; bridge chrome = clean sci-fi HUD, and the DOM bits are faint grey-gold UI text; rotate notice = generic app "please rotate" screen; index-work = boxed project cards with cream labels; experience/footer = plain résumé list on black; sector-zero = long dark blog article with boxed screenshots; 404 = plain text page; glimpse/rank = centred web modal with a glow.

## Checklist

### Piece 1: shared treatment (wash, torn tilted strokes, caps titles, ink clusters, cream key words)
- [ ] No ink-cluster marks anywhere; nothing big and dirty breaks the clean frame (st.3). Shots: every shot
- [ ] Section titles "Work" and "Experience" are mixed case and thin, with no stroke behind (st.1; st.2 caps). Shots: index-work-desktop/phone, index-experience-desktop/phone
- [ ] No warm grey wash under any section; the ground is flat pure black (st.1). Shots: index-work, index-experience, index-footer, page-404, page-sector-zero (desktop+phone)
- [ ] Text sits directly on the ground, never on a black stroke (st.1). Shots: index-experience, index-footer, page-404, gate-first-visit, gate-phone

### Piece 2: veils
- [ ] Gate veil is a flat dark blue-grey fill; the scene behind barely shows; no grey/blur wash (st.1 "no blue-grey fills"). Shots: gate-first-visit, gate-phone
- [ ] Glimpse veil is a near-opaque black dim, not a grey desaturated wash (st.1). Shots: glimpse-card-desktop/phone
- [ ] Rank veil is a dark olive tint with the HUD still legible behind, not a grey wash (st.1). Shots: rank-card-desktop/phone

### Piece 3: hero chrome (bridge DOM chrome)
- [ ] Folder/cutscenes button at top left is a grey rounded-square icon tile (st.1, rounded web button). Shots: bridge-void-unclaimed, bridge-void-bnote-*, bridge-phone-landscape(-bnote)
- [ ] "CUTSCENES" label sits loose beside the button with a thin dark-red underline and no stroke (st.1, st.2). Shots: bridge-phone-landscape, bridge-phone-landscape-bnote
- [ ] Log line "> open span · nothing charted here" is grey typewriter on a barely-there dark box, with a gold dash under the caret (st.1, st.2). Shots: bridge-void-unclaimed, bridge-void-bnote-void/rex/watcher, bridge-phone-landscape(-bnote)
- [ ] "HOLD ANYWHERE TO BURN THE VOIDSHIP TOWARD IT" floats mid-panel in small gold spaced caps (st.2, gold not cream). Shots: bridge-void-unclaimed, bridge-void-bnote-*
- [ ] Vertical "THE WORK" is a tiny grey label at the right edge with no plate (st.1, st.2). Shots: bridge-void-unclaimed, bridge-void-bnote-*
- [ ] Rotate notice: flat blue-grey screen, sans headline, gold typewriter "TURN YOUR PHONE SIDEWAYS.", gold rounded phone outline, no stroke behind any line (st.1, st.2, st.3). Shot: bridge-phone-portrait
- [ ] Rotate notice link "or skip to the work" has a solid grey underline, not a dotted cream link (st.2). Shot: bridge-phone-portrait

### Piece 4: work list and folders
- [ ] Each work row is a rectangle with a 1 px grey border (st.1 "no 1 px grey boxes"). Shots: index-work-desktop/phone
- [ ] Every row's OBJ tab is cream, so each view has three cream things instead of one (st.1). Shots: index-work-desktop/phone, page-sector-zero (rows at the foot)
- [ ] The second row (VoidScape) has a lighter blue-grey fill (st.1 "no blue-grey fills"). Shot: index-work-desktop
- [ ] Row titles are mixed-case serif with no stroke behind; reads as a card list (st.1, st.3). Shots: index-work-desktop/phone
- [ ] "Download on itch.io" is plain cream text with no link treatment (st.2). Shot: index-work-desktop
- [ ] Meta labels break inconsistently on phone: ENGINE/LANGUAGE share a line in row 2 but stack in row 1 (st.3, untidy). Shot: index-work-phone

### Piece 5: case pages
- [x] The open row header is framed by a thin olive/grey line, not the 2 px red open-file frame (st.2). Shots: page-sector-zero-desktop/phone Closed by phase 14 (c3f036d): plain 5 px mitred red frame on the clicked row and the open-file plate. Accepted gaps, D77: OBJ tag on the open row's frame, case head without red.
- [ ] The header band is not on a wash with a hard edge; the whole page is one dark ground (st.1). Shots: page-sector-zero-desktop/phone
- [ ] Small red key words are scattered through the running text of the body column (st.2 "never small running text"). Shots: page-sector-zero-desktop/phone
- [ ] Media frames are plain boxed screenshots with thin grey borders and tiny grey captions (st.1, st.3). Shots: page-sector-zero-desktop/phone
- [ ] Section headings ("Our room, on purpose", "Say nothing"...) are cream serif loose on black with no stroke (st.1). Shots: page-sector-zero-desktop/phone
- [ ] Note: the full-page shot displays at 246 px wide, too small to judge the right rail. Re-shoot as viewport crops in phase 5.

### Piece 6: experience and footer
- [ ] Experience rows are divided by full-width 1 px grey hairlines (st.1). Shots: index-experience-desktop/phone
- [ ] Job titles are bold sans, not cream serif items (st.2). Shots: index-experience-desktop/phone
- [ ] Footer sits on flat black under a 1 px grey rule (st.1). Shots: index-footer-desktop/phone
- [ ] Footer links (email, GitHub, LinkedIn, CV) have a solid cream underline, not quiet dotted (st.2). Shots: index-footer-desktop/phone, page-404-desktop/phone
- [ ] Copyright fine print is tiny and dim grey, nearly unreadable (st.3). Shots: index-footer-desktop/phone

### Piece 7: 404
- [ ] Flat black page with no wash and no stroke behind the title or body (st.1, st.3). Shots: page-404-desktop/phone
- [ ] "← BACK TO THE BRIDGE" and "STRAIGHT TO THE WORK →" are bare text, with no black stroke and no cream active strip (st.1). Shots: page-404-desktop/phone
- [ ] The spaced "OBJ_NULL" label and the title float with nothing painted around them (st.1). Shots: page-404-desktop/phone
- [ ] Footer fine print is larger and brighter here than on the index (st.3, inconsistent). Shots: page-404-desktop/phone

### Piece 8: the gate
- [ ] Headline is a heavy bold sans, not cream serif (st.2). Shots: gate-first-visit, gate-phone
- [ ] "systems" is set in red inside the headline (st.2, red only as hairline/mark/frame). Shots: gate-first-visit, gate-phone
- [ ] Headline, body and button float on the veil with no stroke or plate (st.1). Shots: gate-first-visit, gate-phone
- [ ] A gold horizontal glow line crosses the frame under the button (st.3). Shots: gate-first-visit, gate-phone
- [ ] Nothing Dishonored in frame; reads as a generic dark landing hero (st.3). Shots: gate-first-visit, gate-phone

### Piece 9: beacon popups
- [ ] No beacon popup is visible in any bnote shot. The "note" shows only as the log line and a beacon label, so popups cannot be judged (see New scenes). Shots: bridge-void-bnote-void/rex/watcher, bridge-phone-landscape-bnote
- [ ] The watcher flavour line "they stopped sending people out this far" is tiny grey typewriter loose on the canvas (st.2). Shot: bridge-void-bnote-watcher

### Piece 10: glimpse and rank card
- [x] Glimpse card is a straight rectangle with a 1 px grey border, a cream top hairline and a soft glow: a web modal (st.1, st.3). Shots: glimpse-card-desktop/phone Closed by phases 13 (039d2c5) and 14 (c3f036d): plate with rough top and bottom, straight sides, red lines. Accepted, D77: the card's wedge piece.
- [ ] Glimpse has two cream things: the "THE VOID" tag and the "SEE MY GAME PROJECTS" strip (st.1). Shot: glimpse-card-desktop
- [ ] On the glimpse phone shot the second button is bare text with no stroke (st.1). Shot: glimpse-card-phone
- [ ] Glimpse title "A glimpse of my world" is mixed case (caps rule). Shots: glimpse-card-desktop/phone
- [x] Rank card is the same boxed modal: 1 px grey border, cream top line, glow halo round the triangle (st.1, st.3). Shots: rank-card-desktop/phone Closed by phases 13 (039d2c5) and 14 (c3f036d): same plate and red lines as the glimpse card.
- [ ] Rank card lines are all centred loose text with no strokes; "Lamplighter" is mixed case (st.1, caps). Shots: rank-card-desktop/phone

### Piece 11: ladder leftovers
- [ ] Gold and grey typewriter text in the bridge log (st.2). Shots: bridge-void-unclaimed, bridge-void-bnote-*, bridge-phone-landscape(-bnote)
- [ ] Beacon labels "THE VOID", "THE SURFACE", "THE RED STAR" and "SERUS" are dim grey (st.2). Shots: bridge-void-bnote-rex/watcher, bridge-phone-landscape-bnote
- [ ] Small red key words sink into the dark (same as the piece 5 item). Shots: page-sector-zero-desktop/phone

## No piece

- [ ] Work-row media are saturated screenshots (VoidScape's green/red/blue UI). They pull the eye harder than anything else on the page and read as another game's UI (st.3). Shots: index-work-desktop/phone. This is content, so no piece covers it; the owner decides.
- [ ] Gate CONTINUE and glimpse KEEP EXPLORING are red blocks. The Constraints keep the ladder's red action block, so they are not failed here, but they are the brightest red on screen (st.2 borderline). Shots: gate-first-visit, gate-phone, glimpse-card-*
- [ ] The page-sector-zero full-page shots stitch a bridge HUD strip and a second top bar near the top. This is a capture artefact, not a look problem. Shots: page-sector-zero-desktop/phone/-375

## 375 px check

Nothing overflows, overlaps or clips text at 375 in any scene. gate-phone-375, page-404-phone-375, glimpse-card-phone-375, rank-card-phone-375, index-*-375 and bridge-phone-portrait-375 all fit. bridge-phone-landscape(-bnote)-375 are identical to the 390 runs.

## New scenes

- page-404: visible (OBJ_NULL, "Nothing at this bearing.", two nav lines, footer).
- glimpse-card: visible (card centred over the dimmed bridge).
- rank-card: visible ("RANK UP", triangle, "Lamplighter").
- index-footer: visible at the bottom (name/email, links, fine print). The desktop shot is the same frame as index-experience-desktop.
- gate-phone: visible (headline, body, CONTINUE).
- bridge-phone-portrait: rotate notice visible (phone outline, "TURN YOUR PHONE SIDEWAYS.", skip link).
- bridge-phone-landscape-bnote: a note is "open" only in that the log reads "entering the void" and THE VOID beacon is lit. **No popup card is in frame**, here or in the three desktop bnote shots, so piece 9 has nothing to judge. Re-shoot with the popup open before phase 9.

## No-piece decisions (phase 1, auto)

- Work-row media: content, Scope Out ("content, order and copy"): not changed (D42 auto).
- Red action blocks (gate CONTINUE, glimpse KEEP EXPLORING): kept by Constraints ("Ladder action buttons keep their red block") (D42 auto).
- page-sector-zero full-page stitch (HUD strip, second top bar): capture artefact of the full-page shot; judge the viewport `page-sector-zero-toy-top` beside it (D42 auto).

## Leftovers (piece 11; greps at the before run, 2026-10-30)

- [ ] css/bridge.css: `--lamp` 30, `--cold` 2, `#c2954e` 1, `#58635f` 1, `#3d4644` 1, `#7fa8b4` 1, `--display` 1 (`grep -nE` the pattern; canvas-fed rules stay, name them).
- [ ] css/gate.css:79 `border: 1px solid #3d4644` + `#1b2220` bar; :83 bar fill `var(--lamp)`; :114 `font-family: var(--display); font-weight: 800`.
- [x] js/bridge/lamp.js:19 `LAMP = "228,221,198"` is already cream; no grey beacon label left in the grep (phase 3 checks the label draw by eye).
- [ ] Link rules on `--lamp` (D32): style.css:86-87 `a` (hover `--type-red-text`), :504-505 `.xp-what a`, :519 `.case a:hover`, :622-623 `footer a`.
- [ ] `.key`: 75 spans in index.html (the plan's 66 counted lines; 66 lines carry them).

## Before numbers (dp-before, pagecheck; main 2026-10-30)

- snap: `dp-before` 79/79 scenes (68 existing + 11 new; the plan's 50/61 were stale), no `page-*` console error. `dp-before-375`: 14/14; full-page voidscape, conclusus, heavylight are 377 wide at 375 (2 px sideways overflow; phase 5).
- pagecheck index.html: html 71283, css 137203, js 1699856, font 209228, image 813873, video 2568443, total 5499886 B; LCP 2624 ms, CLS 0.0048, long 131 ms; scroll 0 hidden 0 clipped 0 bare 31 tilted 1; exit 1.
- index.html --phone: total 4235778 (video 1304335); LCP 2488, CLS 0.0345, long 57; bare 31 tilted 0; exit 1.
- index.html#sector-zero: total 7198269 (video 4343714); LCP 200, CLS 0.0032, long 124; bare 31 tilted 2; exit 1.
- index.html#sector-zero --phone: total 4031253; LCP 192, CLS 0.0342, long 57; bare 31 tilted 1; exit 1.
- index.html --reduced-motion: total 2931443 (video 0); LCP 296, CLS 0.0241, long 0; bare 31 tilted 0.

## Phase 8 checks (one line each, ticked there)

- [ ] (a) capture dp-final, compare dp-before: toy scenes per Constraints, genesis only overlay text colours.
- [ ] (b) nav-flows full suite: only `gate-exits`, `worklink` fail.
- [x] (c) greps `border-radius`, `dashed`, `rgb(var(--sage-rgb)`, `var(--display)` 0 in scope; `--lamp` only in canvas-fed rules. Phase 15: 0 hits for dashed, sage-rgb, display; border-radius only in Scope Out rules (style.css:316/321 inside 105-322, :679 is `0`); `--lamp` hits all resolve to cream (see p15 verify-v2.md).
- [x] (d) pagecheck both pages, 1440 and 375: exit 0 (bare 0), numbers beside the before ones above. 8 (see report). After: index 1440 total 4695445 B, LCP 3116, CLS 0.0162, long 229, bare 0, tilted 13 (before 5499886 / 2624 / 0.0048 / 131 / 31 / 1); index 375 total 3675044, LCP 2944, CLS 0.0944, long 56 (before 4235778 / 2488 / 0.0345 / 57); sector-zero 1440 total 5789224, LCP 428, CLS 0.0029, long 123 (before 7198269 / 200 / 0.0032 / 124); sector-zero 375 total 5198390, LCP 264, CLS 0.0480, long 62 (before 4031253 / 192 / 0.0342 / 57). All exit 0.
- [ ] (e) textures over 150 KB to WebP; contrast >= 4.5:1 on every text surface; reduced motion: dp-rm diffs only levelled strokes, tilted 0, clipped 0. Phase 15 (not ticked): no added image over 150 KB (largest 38 KB), contrast holds on strokes (cream 14.3, quiet 8.0 over the lightest wash), bare 0, index reduced-motion tilted 0 clipped 0; sector-zero reduced-motion tilted 1 (open row's OBJ tab, also 1 at dp-12); the dp-rm capture and compare were not run.
- [ ] Look-judge: all three statements PASS on the 23 judged views + 375 shots.
