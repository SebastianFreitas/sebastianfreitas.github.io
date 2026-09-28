# fixConclususPage 00: intake research (HeavyLight case page)

Web digest for the planning interview. Owner complaints: (1) corner tiles show
artifacts and the frame does not run around the whole border; (2) the three
ledges are the same tile repeated; (3) the lamp light does not look like the
game's; (4) only the first of three lamp/crate events makes sense.

## A. Framing the page with the game's tileset

1. **True 9-slice frame: corners are their own tiles.** Split the frame into four
   authored corner pieces, four edge strips that repeat, and an empty middle. Edges
   only ever repeat whole tiles, so a corner never gets built from a clipped edge tile.
   Precedent: CSS `border-image` 9-slice
   ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/border-image-slice),
   [9-slicer generator](https://leanrada.com/9-slicer/),
   [Pixel Art 9-Slicer 4-CSS](https://alanrobinsondev.itch.io/9slice-pixel-art-4css)).
   *On the page:* dedicated outer-corner tiles (rim on two sides, curved
   crenellation) at all four corners. Edge lengths snap to whole tiles; any
   leftover space goes into one "filler" tile in the middle of each edge, never
   into a corner. That fixes complaint 1.
2. **The border as autotiled terrain, not a picture frame.** Treat the frame as a
   solid mass in a tile grid and choose each cell's sprite from its neighbours, so
   inner corners, outer corners and rims come out right on their own. Precedent:
   blob/47-tile autotiling
   ([Red Blob autotile guide](https://www.redblobgames.com/articles/autotile/claude/),
   [why 47](https://blobsmith.itch.io/blobsmith-lite/devlog/1627776/why-a-blob-autotile-is-47-tiles-and-not-256-we-asked-godot-all-256-times)).
   *On the page:* one boolean grid the size of the viewport in 16 px cells, border
   cells solid, then an autotile pass. The rim shows up only on faces that touch
   the open middle. Corners stop being special cases.
3. **Irregular cave mouth instead of a clean rectangle.** Let the border thickness
   vary: 1 to 3 tiles deep, with stalactite bites and bumps, like a Hollow Knight or
   Celeste screen where rock reaches into the play space. Precedent: Hollow Knight's
   foreground framing layers ([art breakdown](https://medium.com/@hmfanatic13/the-art-of-hollow-knight-b69ec2c31280)).
   *On the page:* a seeded height map along each edge feeds the grid from A2. The
   text column still keeps a guaranteed safe margin.
4. **Near layer plus a darker far layer.** A second, dimmer copy of the frame sits
   behind and slightly inside, with parallax on scroll, so you feel inside a tunnel
   rather than behind glass. Precedent: Hollow Knight's foreground/midground/background
   split (same source), and pixel portfolios that frame content as a game window
   ([pixel-portfolio](https://github.com/miruniv/pixel-portfolio)).
   *On the page:* a back wall of dark sewer bricks with a lower-contrast palette,
   moving 0.9x the scroll speed.
5. **Crisp integer scaling.** Draw at native pixel size and scale by an integer
   with `image-rendering: pixelated`, so seams and half-pixels cannot appear.
   Precedent: [MDN crisp pixel art](https://developer.mozilla.org/de/docs/Games/Techniques/Crisp_pixel_art_look),
   [Belen Albeza](https://www.belenalbeza.com/articles/retro-crisp-pixel-art-in-html-5-games/).
   *On the page:* a likely cause of the corner artifacts. Snap the frame canvas
   to a devicePixelRatio-aware integer scale.

## B. Varied tile construction for the ledges

1. **Random edge variants.** Keep 2 to 4 versions of each straight-edge tile
   and pick one per cell. Precedent: Celeste has 1 to 4 variants per straight
   edge, chosen at random ([Aran P. Ink, Celeste tilesets](https://aran.ink/posts/celeste-tilesets));
   every Terraria piece has 3 variants ([Terrafirma UVs](https://seancode.com/terrafirma/uvs.html)).
   *On the page:* rim tiles with a chipped crenel, a missing block, or a crack.
   A seeded choice per cell keeps the layout stable between reloads.
2. **Room/chunk templates.** Hand-author a small library of ledge shapes as short
   ASCII grids and pick one per slot, with small random changes inside it.
   Precedent: Spelunky's 10x8 room templates plus in-template randomness
   ([explainer](https://gameasart.com/blog/2016/03/11/spelunkys-procedural-level-generation-explained/),
   [Spelunky Classic mods](https://takenapeveryday.wordpress.com/2016/04/14/spelunky-level-generation/)).
   *On the page:* three different templates, for example a flat shelf on a
   pillar, a stepped stair with an overhang, and a broken bridge with a gap.
   Each template also marks where its lamp and crate sit.
3. **Autotile the ledge silhouette.** Once a ledge is a grid shape (from B2),
   the 47-blob or corner-Wang rules draw its inner and outer corners, undersides
   and pillar sides correctly. Precedent: [Boris the Brave, tileset classification](https://www.boristhebrave.com/2021/11/14/classification-of-tilesets/),
   [corner Wang tiles](https://www.boristhebrave.com/permanent/24/06/cr31/stagecast/wang/2corn.html).
   *On the page:* an overhang shows a dark underside tile and a pillar shows
   side rims, so each ledge reads as built, not stamped.
4. **Decoration pass after the tiles.** A second layer places small props by
   rule: moss on top faces, drips and chains under overhangs, pipe stubs and
   grates on vertical faces, cracks on some cells. Precedent: Terraria's moss and
   background walls ([Moss](https://terraria.wiki.gg/wiki/Moss),
   [Background walls](https://terraria.wiki.gg/wiki/Background_walls)).
   *On the page:* sewer-flavoured props (a grate with dripping water, a rusted
   pipe, a hanging chain) drawn in the game's blue palette, about one prop per
   3 or 4 cells.
5. **Silhouette vocabulary.** Vary the outline itself, not only the surface:
   overhangs, stairs, pillars, broken ends, thin bridges. Precedent: Spelunky's
   template families (above) and Celeste's modular rooms
   ([Aran P. Ink, Celeste-like tilesets](https://aran.ink/metroidvania-generation-3/modular-rooms-sgg48)).
   *On the page:* no two ledges share a bounding shape. That answers complaint 2
   even before any decoration goes on.

## C. Lamp light that looks like the game's

1. **Hard-edged wedge, few bands.** A cone with crisp pixel edges and 2 or 3
   flat brightness bands from the lamp outward, instead of a smooth gradient.
   Precedent: posterizing light to a fixed palette keeps pixel lighting from going
   mushy ([HN discussion](https://news.ycombinator.com/item?id=18357749)).
   *On the page:* the translucent blue wedge from the game, stepped into 3
   alpha bands, each clipped to whole pixels.
2. **Dithered falloff.** Where bands meet, or at the tip, use ordered/Bayer dither
   rather than an alpha fade. Precedent: [pixel-art dithering guide](https://www.pixel-editor.com/articles/pixel-art-dithering),
   [pixelated god rays shader](https://godotshaders.com/shader/pixelated-god-rays-2/).
   *On the page:* the beam's far third breaks into a checkerboard, which reads
   as "game" at once.
3. **Beam stops at walls (visibility polygon).** Cast rays only toward segment
   endpoints, sort them by angle, and fill the polygon, clipped to the cone. Walls
   and crates then cast real shadows. Precedent: [ncase, Sight & Light](https://ncase.me/sight-and-light/),
   [Red Blob, 2D Visibility](https://www.redblobgames.com/articles/visibility/)
   (it covers flashlight cones directly); Celeste cuts light out with one shadow
   quad per wall face ([Noel Berry, Remaking Celeste's Lighting](https://noelberry.ca/posts/celeste_lighting/)).
   *On the page:* the beam cuts off at a crate and leaves a shadow behind it,
   which also shows that the crate is what the light is pushing.
4. **Additive glow on what the beam touches.** Draw the beam with additive or
   `lighter` compositing, and brighten the lit crate face and the rim tiles
   inside the cone. Precedent: god-ray compositing with additive blending
   ([moonjump](https://moonjump.com/game-dev-mechanics-volumetric-lighting-god-rays-how-it-works/),
   [Cyanilux](https://www.cyanilux.com/tutorials/god-rays-shader-breakdown/)).
   *On the page:* canvas `globalCompositeOperation = 'lighter'` for the wedge,
   plus a one-pixel highlight line on lit faces.
5. **Motes drifting along the beam.** A few pixel specks travel outward along
   the beam axis, so its direction and push show while nothing else moves.
   Precedent: dust in light shafts as particles or scrolling noise (Cyanilux,
   above). *On the page:* 6 to 10 motes per lamp, 1 px, moving at the push speed.
   They double as the "force" indicator.

## D. Three legible 10-second lamp/crate vignettes

1. **One new idea per event, escalating.** Show each concept alone first,
   then combine. Precedent: Portal teaches in isolated rooms and layers the
   complexity ([Portal as a game that teaches](https://battzcave.wordpress.com/2016/05/14/leveldesignofvideogames06-portal/));
   Blow on building puzzles from one mechanic's consequences
   ([IndieCade talk](https://www.gamedeveloper.com/design/indiecade-inside-jonathan-blow-s-puzzle-design-process)).
   *On the page:* (1) the lamp turns on and the crate slides; (2) the crate is
   pushed off a ledge edge and falls to the ledge below; (3) a pushed crate
   blocks a second beam or lands on a switch, so light causes light.
2. **Anticipation before action.** Every effect gets a visible wind-up: the lamp
   flickers twice before it fires, and the crate shudders before it slides.
   Precedent: animation principles, anticipation and staging
   ([StudioBinder](https://www.studiobinder.com/blog/what-are-the-12-principles-of-animation/)).
   *On the page:* 0.4 s of flicker plus 2 px of jitter, then the push.
3. **Cause strictly before effect, one mover at a time.** A chain reaction reads
   because each object's motion ends before the next one begins. Precedent:
   Fischli & Weiss, *The Way Things Go* ([MoMA](https://www.moma.org/collection/works/80908),
   [publicdelivery](https://publicdelivery.org/fischli-weiss-the-way-things-go/)).
   *On the page:* never two things moving at once, with a 200 ms beat between
   links.
4. **Staging: the goal shown before the attempt.** As in The Incredible
   Machine, the goal (the balloon to pop) is visible from the start, and the
   chain happens to reach it ([Wikipedia](https://en.wikipedia.org/wiki/The_Incredible_Machine)).
   *On the page:* each vignette opens on its endpoint already visible (a gap,
   a switch, a dark alcove), so the viewer reads it as "the crate needs to get
   there".
5. **Follow-through and settle, then a hold.** Let the result land with a
   small bounce or dust puff and hold for about 2 s before any reset, so the
   outcome registers. Precedent: follow-through and overlapping action (same
   animation sources, [Bloop](https://www.bloopanimation.com/the-12-principles-of-animation/)).
   *On the page:* the crate lands with a 1-tile dust puff, and the lamp dims
   to idle. The reset fades out, so it never plays backwards.
6. **Trigger on scroll-into-view, one at a time.** Start each event only when its
   ledge is fully in view and the previous one is idle, so the viewer is never
   splitting attention. Precedent: Portal's confined, single-focus test rooms
   (above). *On the page:* an IntersectionObserver-style threshold with a
   global "one vignette running" lock.
