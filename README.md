# Portfolio — setup

## Files

```
portfolio/
├── index.html              homepage: hero demo + project list + experience
├── style.css               all styling, tokens at the top
├── light.js                the hero canvas demo
├── cv.pdf                  ← drop your compiled LaTeX CV here
├── media/                  ← MP4 clips go here
│   ├── terminal.mp4
│   └── chair.mp4
└── projects/
    ├── sector-zero.html    written — copy this for the others
    ├── heavylight.html     written — has the itch embed
    ├── voidscape.html      ← to write
    └── conclusus.html      ← to write
```

## Run it locally

Open `index.html` in a browser. That's it — no build step, no npm.

If you want a local server (the itch iframe behaves better over http):

```
python3 -m http.server 8000
```

Then go to `http://localhost:8000`.

## Deploy

You already have `sebastianfreitas.github.io`. Create (or reuse) the repo of that
exact name, put these files at the repo root, push. GitHub Pages serves it in
about a minute.

```
git init
git add .
git commit -m "portfolio"
git remote add origin git@github.com:sebastianfreitas/sebastianfreitas.github.io.git
git push -u origin main
```

## To do, in order

1. Record `media/terminal.mp4` and `media/chair.mp4`. 10–15 seconds each, muted,
   no UI overlay. OBS is fine. Keep each under ~5 MB or the page gets slow.
2. Get the itch embed ID for HeavyLight and Conclusus and paste them into the
   `iframe src` on those pages.
3. Write `voidscape.html` and `conclusus.html` — copy `sector-zero.html` and
   replace the content. Same three headings: what the problem was, what you
   built, what you'd change.
4. Compile the LaTeX CV to `cv.pdf` and drop it in the root.
5. Pick one repo, clean it up, add a README with a GIF at the top, link it.

## Tuning the hero demo

Constants at the top of `light.js`:

- `LIGHT_POWER` — how hard the light pushes
- `LIGHT_REACH` — how far it reaches, in pixels
- `CRATE_COUNT` — how many crates

## Colours

All at the top of `style.css` under `:root`. Change `--lamp` and the whole site
changes accent colour.
