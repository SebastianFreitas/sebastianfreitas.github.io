# dishonored-pass · phase 8 checks (D27, D29; 2026-10-30)

Machine: no `node`, `npx` or `lighthouse` on PATH; Playwright for Python works, Pillow 11. The owner chose the stand-in below, no Lighthouse (D33, 2026-10-30).

## tools/pagecheck.py (phase 1 writes it; Python, borrows `nav.start_server` like snap.py)

`py -3 tools/pagecheck.py <page> [--phone] [--reduced-motion]` (page = `index.html` or `index.html#sector-zero`, which waits for `#sector-zero.open` like snap's `project_page`; `projects/*.html` are redirect stubs; `--phone` = 375x667; `--reduced-motion` = context `reduced_motion="reduce"`). Prints, one line each:
- weight: response bytes by type (html, css, js, font, image, video, total) from `page.on("response")` + `len(r.body())`, collected until `load` + 1500 ms.
- perf (Lighthouse stand-in): LCP ms and CLS from buffered `PerformanceObserver` entries (`largest-contentful-paint`, `layout-shift` without `hadRecentInput`), long-task ms (`longtask`).
- scroll: `document.documentElement.scrollWidth > innerWidth` (sideways scroll).
- hidden: `.obj h3, .obj-line, .obj-id, .xp-what strong, .xp-what a, footer a, .case h1` (open case only) with computed opacity < 0.9, visibility hidden, or a rect past the viewport width (readability without hover).
- clipped: a text element (`h1, h2, h3, p, li, a, strong, .key, .obj-id`) whose rect leaves the nearest ancestor with `overflow` not `visible` or a `clip-path`.
- bare: a text element inside `.work, .experience, footer, .page-case` with no `.slab` ancestor (text on the wash, not on a stroke); skips `.case` and `.folder-body` descendants (D9: see-through black over the toy, no wash) and elements not rendered (zero rect, `display: none`, `visibility: hidden`).
- tilted: elements whose `::before` computed `transform` is not `none` (0 expected under `--reduced-motion`).
Exit 1 on scroll, hidden, clipped or bare.

## Contrast (WCAG 2 relative luminance)

`L = 0.2126 R + 0.7152 G + 0.0722 B` with each channel linearised (`c/12.92` if c <= 0.03928 else `((c+0.055)/1.055)^2.4`); ratio `(L1+0.05)/(L2+0.05)`. Blend: `fg*a + bg*(1-a)` per channel. Lightest blotch pixel = wash top + alpha x (255 - wash top) (feTurbulence greyed, white at worst). With cream #e4ddc6, quiet #b0a78f, wash top #34373b, bottom #1f2226, stroke rgb(4,4,5) at 0.86:
- flat wash: cream 8.80 / 11.75, quiet 5.00 / 6.67, pale hover #f6f0da 10.48.
- stroke over flat wash (#0b0b0d): cream 14.47, quiet 8.21. Stroke vs wash 1.64.
- blotch 0.15: lightest #525558: cream 5.52, quiet 3.13 (fails); stroke over it #0f0f11: cream 14.09, quiet 8.00.
- blotch 0.3: lightest #717376: cream 3.50, quiet 1.99 (both fail); stroke over it #131415: cream 13.58, quiet 7.70.
Gate review 1 (2026-10-30): the wash is now warm #383633 / #22201d, same lightness; these values hold within rounding; phase 8 re-measures on the new lightest pixel.
So text passes AA only on a stroke, or cream on a flat/0.15 wash; hence the Constraint "no text directly on the wash" and the fallback (stroke, or alpha 0.15 for cream-only text).

## 375 px shots (D27)

`capture <run>-375 --only phone --phone-width 375` matches 14 scenes (snap.py:485-497 plus phase 1's new ones); 12 run at 375x667: `index-{work,experience,footer}-phone`, `page-{sector-zero,voidscape,conclusus,heavylight,404}-phone`, `gate-phone`, `glimpse-card-phone`, `rank-card-phone`, `bridge-phone-portrait` (the rotate notice: the bridge refuses portrait, bridge.css:614 `#bridge-rotate`); the two `bridge-phone-landscape*` stay 844x390 (nav.PHONE_LANDSCAPE) (the bridge's narrow side is its 390 px height). Phase 3: bridge portrait + landscape; 4: index; 5: pages + 404; 7: cards + landscape note.

## Textures and reduced motion

Added files: `git diff --name-only --diff-filter=A 5e2d495..HEAD`, then `wc -c`; an image over 150 KB: `py -3 -c "from PIL import Image; Image.open(p).save(q, 'WEBP', quality=85)"`, re-link, delete the original. Reduced motion: phase 2's `@media (prefers-reduced-motion: reduce) { .slab::before { transform: none } }`; checked by `capture dp-rm --reduced-motion` and `pagecheck.py --reduced-motion` (tilted 0).

## Phase 1: new scenes and flags (moved from the plan, 2026-10-30)

tools/snap.py `scenes()` (patterns `project_page`, `index_section`): `page-404-{desktop,phone}` = `goto(f"{base}/404.html")`, load, settle 1000, full page; `glimpse-card-{desktop,phone}` = `enter_via_gate`, `page.evaluate("Surge.glimpse()")` (surge.js:408), `wait_for_selector(".glimpse-card")`, settle 800, viewport shot; `rank-card-{desktop,phone}` = same with `Surge.rankUp({from: XP.rankOf(0), to: XP.rankOf(10)})` (xp.js:91, 452), wait `.rank-card`; `index-footer-{desktop,phone}` = `index_section` then `scrollTo(0, document.body.scrollHeight)`; `gate-phone` = `scene_gate` at nav.PHONE; `bridge-phone-portrait` = `scene_bridge_phone_landscape` (372) at nav.PHONE (shows `#bridge-rotate`); `bridge-phone-landscape-bnote` = that scene, then the void note opened as `bridge-void-bnote-void` opens it: 61 scenes. Flags: `--phone-width <px>` sets `nav.PHONE = {"width": px, "height": 667}` before `scenes()`; `--reduced-motion` makes `new_ctx` (142) pass `reduced_motion="reduce"` unless the scene sets it. Check: each new PNG shows its card or page (read once, one line each); a missing card: surge.js:285-293 guards (`glimpseOn`, a card open), settle 1500; a phone card under `#bridge-rotate`: that scene at nav.PHONE_LANDSCAPE.

## Phase 2: the options sheet (moved from the plan, 2026-10-30)

The sheet, outside the repo: `<scratchpad>/dp-sheet.html` linking `file:///<worktree>/css/style.css` and index.html's fonts link; 1440 px wide, three 440 px columns (3x440 + 2x40 gutters + 2x20 margins) on `--wash`, headed A/B/C, a left label column naming the rows with their values (D25): tears A/B/C = 8/25/45 px, ink A/B/C = 0/1/2 clusters, wash A/B/C = flat / blotches 0.15 / 0.3. Each column: a "WORK" title stroke (caps), three staggered row strokes (insets 0/0.6/0.2rem; lift 440 x 0.026 = 11 px against a 54 px gap) with cream Oranienbaum title and quiet Plex body, one closed OBJ tab (black stroke) and one open (cream strip, style.css:445-452), one `.key` word with the red underline, one 1 px red hairline; column A = tears A, ink A, wash A, and so on. Shot: a 6-line Playwright script in the scratchpad (`goto("file:///...")`, fonts ready, `screenshot(full_page=True)`) to `dp-sheet.png`. Check: B's notches measure about 25 px on the PNG; else the insets were rem, not px.

## Phase 8: textures, contrast, reduced motion (moved from the plan, gate review 1)

Textures: added files since 5e2d495 over 150 KB become WebP quality 85 and are re-linked (commands: research `-02-checks.md`). Contrast: the WCAG one-liner from research `-02-checks.md` § Contrast for `--type-cream` and `--type-quiet` on the stroke over the lightest wash pixel (D30's alpha) and on the bare wash (expected values there). Pass: every text-bearing surface >= 4.5:1 and pagecheck's bare count 0; else that text goes on a stroke, or (cream only) the blotch alpha drops to 0.15 (5.5:1), recorded `(auto)`. Reduced motion: `capture dp-rm --reduced-motion --only index` and `--only page-sector-zero`, `compare dp-final dp-rm`: diffs only where strokes went level; `pagecheck.py index.html --reduced-motion`: tilted 0, clipped 0.
