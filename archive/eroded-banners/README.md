# Eroded banners archive
Open only when the owner names this concept.

Worn left and right ends for every box outside the bridge: erased polygon bites, cut inward only, stable per box. Nothing in this folder is loaded by any page; it is kept only so the code is not lost.

Rejected by the owner on 2026-11-01 ("looks awful"), at branch tip 4feeb5b. The site never shipped it.

- `tools/worn.py` draws `css/art/worn/` from seeded polygons at build time. Its docstring holds the recipe, taken from the name plate's mask. It writes to live paths, so move it back before running it.
- `css/art/worn/`: the caps. `plate-l/r.png` (name plate), `el1-5`, `er1-5` (tall 1:8 tiles, scaled whole, big boxes), `l1-5`, `r1-5`, `s1-5`, `t1-5`.
- `css/worn-css.diff.txt`: every CSS change the build made (`git diff 015b280 4feeb5b`), the `.worn` block in style.css and the `.obj` `--opl` text shift included.
