# Portfolio: what the reviewer checks besides the spec

No framework, no bundler, no `node`. Every JS file is an IIFE that
publishes one `window.X` global; the hero (`js/bridge/`) and the world
(`js/world/`) share one state object across files (`window.Bridge` as
`B`, `window.World` with `F` for per-frame values and `P` for painters).

Runtime pitfalls to look for (each breaks the page with no build step to
catch it):

- A renamed or missing `window.X` global that another file still calls
  (grep `X.` across `js/`).
- A field read as `B.x` / `F.x` that nothing writes, or written under a
  different name (grep the field across the folder).
- A `<script>` tag added out of load order (a file that uses `X` must load
  after the file that publishes it).
- A typo in a CSS selector, a `data-` attribute or a storage key that the
  other side spells differently.
- Code outside the IIFE, an unclosed brace or paren.
- A hand-edited `?v=` number: only `tools/bump.py` rewrites those.

Never open `cv.pdf`, `media/`, `Temporary VoidScape Media/` or
`snapshots/`. The largest files (500 to 850 lines) are listed in
`.claude/project/implementer.md`: read only around the diff's hunks.
