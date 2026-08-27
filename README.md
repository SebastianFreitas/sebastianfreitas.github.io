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
- **Canvas 2D** — bridge hero (`bridge.js`, `world.js`, instruments)
- **Three.js** (CDN) — used on select project pages
- **Python 3** — optional local server with cache disabled (`serve.py`)

Target engines for the games themselves (documented on each case study): Unity (C#), Unreal 5 (C++ / Blueprint).

---

## Run locally

```bash
# from the repo root
python serve.py
```

Open the URL it prints (default `http://127.0.0.1:8765/?reset=1`).

`serve.py` disables browser caching so script edits show up immediately. Plain `python -m http.server` also works if you do not care about cache.

Opening `index.html` as a file works for a quick look; use the server if itch embeds or caching act up.

---

## Layout

```
├── index.html          Homepage (hero + work + experience)
├── style.css           Design tokens and layout
├── bridge.js           Hero: camera, input, landmarks, HUD wiring
├── world.js            Geography and drawing of the bridge world
├── instruments.js      HUD instrument panel
├── xp.js / surge.js / lamp.js / beacon.css
├── light.js            Standalone light-momentum demo (HeavyLight page)
├── serve.py            Local no-cache static server
├── projects/           Per-game case study pages
└── media/              Images and video for projects
```

Hero concerns are split on purpose: **world** (where things are and how they look) vs **bridge** (camera, pointer, beacons, HUD). That keeps the map readable without mixing input and scenery.

---

## Design notes (worth reading in the code)

- The hero is meant to feel like a playable fragment of The Warlocks, not a decorative particle background.
- Motion respects `prefers-reduced-motion` (travel softens; the loop still runs so the span does not blank).
- XP / beacons are a light progression layer across the page — small, optional, not a gated wall.
- Project pages follow the same shell as the homepage so the portfolio reads as one product, not a stack of templates.

---

## Author

**Sebastião Freitas** — software engineer · world builder · designer  
Current focus: systems design  

[GitHub](https://github.com/sebastianfreitas) · [LinkedIn](https://www.linkedin.com/in/sebastianfreitas/) · [sebsfrets@gmail.com](mailto:sebsfrets@gmail.com)

The Warlocks © Sebastião Freitas. Original setting, lore, characters, and written material.
