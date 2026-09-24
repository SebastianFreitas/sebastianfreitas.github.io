# Sebastião Freitas — Portfolio

Software engineer, world builder, and designer. This site is a portfolio and a playable fragment of **The Warlocks** — an original setting rendered on canvas — with game case studies and experience below.

Focus right now: **systems design** (gameplay systems, reusable bases, and the glue between play and world).

**Live:** [sebastianfreitas.github.io](https://sebastianfreitas.github.io)

---

## What this repo is

| Layer | Role |
| --- | --- |
| Interactive hero | Canvas slice of The Warlocks: pan, landmarks, HUD, XP beacons |
| Work | Case studies for shipped / playable games |
| Experience | Short professional timeline + CV link |

Games featured:

- **Sector Zero** — Unreal 5 horror prototype; in-game Linux-style terminal as the main mechanic
- **VoidScape** — Unity first-person roguelike; skill-scaled second loop, 50+ modifiers
- **HeavyLight** — Unity WebGL puzzle platformer; light carries momentum
- **Conclusus** — 30 levels on the HeavyLight base (reuse exercise)

---

## Stack

No framework, no bundler, no npm.

- **HTML / CSS / vanilla JS** — site shell and interactions
- **Canvas 2D** — bridge hero (`js/bridge/`, `js/world/`, `js/hud/`, `js/genesis/`)
- **Python 3** — optional local server with cache disabled (`serve.py`)

Target engines for the games themselves (documented on each case study): Unity (C#), Unreal 5 (C++ / Blueprint).

---

## Run locally

```bash
# from the repo root
python serve.py
```

Open the URL it prints (default `http://127.0.0.1:8765/`). Add `?reset=1` once to clear your progress; it removes itself from the URL.

`serve.py` disables browser caching so script edits show up immediately. Plain `python -m http.server` also works if you do not care about cache.

Opening `index.html` as a file works for a quick look; use the server if itch embeds or caching act up.

### Check

```bash
py -3 tools/nav-flows.test.py          # navigation and state flows (Playwright)
py -3 tools/snap.py capture before     # deterministic screenshots of every scene
py -3 tools/snap.py compare before after
py -3 tools/gframes.py before          # genesis beat frame sheets for review
py -3 tools/jscheck.py js/genesis/genesis-figures.js --eval "return typeof GenFig"  # headless JS check, no node
```

---

## Layout

```
├── index.html          Homepage (hero + work + experience)
├── 404.html            Not-found page
├── serve.py            Local no-cache static server
├── css/
│   ├── style.css       Design tokens, layout and breakpoints
│   ├── gate.css        First-visit entry gate
│   ├── bridge.css      Hero cockpit: HUD, notes, overlays
│   └── beacon.css      Level chip and claim ceremony
├── js/
│   ├── lib/            util (maths, media queries, storage keys), paint (flat-art primitives), pacer (frame scheduler)
│   ├── site/            xp, entry, intro, surge, embed, lazy-video: progression, the entry gate, level-up light, embeds
│   ├── bridge/          The hero: bridge core, notes, input, marks, panel, depths, readout, loop; voice, log, marks roster, lamp, planet
│   ├── depths/          Beacon-gated node clusters: core plus one data file per planet and one for the lore beacons
│   ├── ship/             The voidship: motion and art
│   ├── gamedev/          Sector Zero storm, VoidScape forge (bench, guns, missions), game zones backdrop
│   ├── world/            Geography and one painter file per feature; art/ holds one file per Rex kingdom and Mainland faction
│   └── genesis/          genesis-state, -paint, -void, -flesh, -oldones, -figures, -titans, -mainland, -armies, -orb, -rex, -depths, -saga-state, -saga, genesis
├── tools/
│   ├── nav-flows.test.py   Browser test for navigation and state
│   ├── snap.py             Deterministic screenshots and a pixel compare
│   └── bump.py             Rewrites every ?v= cache-buster at once
├── projects/           Per-game case study pages
└── media/              Images and video for projects
```

Hero concerns are split on purpose: **world** (where things are and how they look) vs **bridge** (camera, pointer, beacons, HUD). That keeps the map readable without mixing input and scenery.

---

## Design notes (worth reading in the code)

- The hero is meant to feel like a playable fragment of The Warlocks, not a decorative particle background.
- Motion respects `prefers-reduced-motion` (travel softens; the loop still runs so the span does not blank).
- XP / beacons are a light progression layer across the page — small, optional, not a gated wall.
- Every drawn place uses one flat silhouette style with hard left-lit shadows (`paint.js`); the bridge canvas is opaque and the loop parks when nothing moves.
- Project pages follow the same shell as the homepage so the portfolio reads as one product, not a stack of templates.

---

## Author

**Sebastião Freitas** — software engineer · world builder · designer  
Current focus: systems design  

[GitHub](https://github.com/sebastianfreitas) · [LinkedIn](https://www.linkedin.com/in/sebastianfreitas/) · [sebsfrets@gmail.com](mailto:sebsfrets@gmail.com)

The Warlocks © Sebastião Freitas. Original setting, lore, characters, and written material.
