---
paths:
  - "js/bridge/**/*.js"
  - "js/hud/**/*.js"
---

# Instrument readings

- Readings are visual first: a bar climbing or a tile blinking red, then a
  number, then a line in the log. Never a mechanic; nothing here costs the
  visitor anything.
- Every place that bends the instruments is one entry in
  `js/bridge/bridge-sites.js`, gated on its depth node (`gate`). The beacon
  marks nothing; the art does. Add a site, not a special case in a tile.
- Two axes: `chaos` is the incoherent one (noise, the world's `chaosAt`);
  `nomic` is the coherent one (constants displaced, in step). On the HUD
  and in the log say `incoherent` / `coherent` / `nomic`; never `magic`.
  Keep the voice's style: `value · unit · impossible clause`, lowercase,
  dry.
- Tiles read `r.env` only; they never reach into `Bridge`. Anything that
  does not change per paint goes in the tile's `paintStatic`.
- The implementer never sees this file: copy the rules that apply into
  the spec's Style section.
