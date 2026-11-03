# Red side lines archive
Open only when the owner names this concept.

Seeded red line pieces along the left side of a plate, one flat red path per plate, following the plate's `::before` clip-path. Shown on the XP-10 rank card (every 10 levels), the glimpse card, the first-visit gate and the Work rows.

The owner: "i put a lot of work on ... archive it and save it, never delete". This is main's tuned version, taken before the Shapes changes on the white-tag branch.

- `js/redlines.js`: main's `js/site/redlines.js`, verbatim (`window.RedLines`). Presets `gate`, `item`, `obj`. Seed per plate; redrawn on size change.
- `css/redlines.css`: verbatim rules it needs, each preceded by a comment naming its source file and selector: `--type-red`, `--stroke`, `--tear`, the `--slab-scrape*` clips, `.slab`, `.redlines`, the Work row stagger (style.css), the rank card rules (beacon.css), `.gate-stage` (gate.css), `.redlines.bnote-red` (bridge.css).

Wired in (at main):
- `js/site/surge.js` rankUp and glimpse: `window.RedLines.draw(cardEl, { kind: "item" })`.
- `index.html`: `<div class="gate-stage slab" data-redlines="gate" data-redlines-kind="gate">`, `data-redlines` on each Work `.obj.slab`, and `<script src="js/site/redlines.js?v=229">`.
- API: `RedLines.draw(el, opts)`; it also self-inits on DOMContentLoaded for every `[data-redlines]` plate. `opts.kind` or `data-redlines-kind` picks the preset (default `obj`).

Built by (`git log --oneline main -- js/site/redlines.js`):
- fbad1c9 Dishonored pass for the site, plus the bridge pause and Work section lag fix
- 5fefab1 Name plate: mask position Firefox accepts, so the erased sides show there too
- 6d6de88 Game pages: folders put the clip beside the pitch and link on desktop
- b1ac733 Work rows: an open row stays as closed with a tilted torn page under it, and the row, page and next row join with no wall gap in colours that almost mix; the page stays clickable under the next row and the phone close label clears it

Never delete this folder or rewrite these files. Open only when the owner names it.
