# Phase 4 · The eldritch palette (research digest)

2026-09-25. Sources, and what we take from each (our own words).

## Victorian / Gilded Age winter cloth

- victorianweb.org, Nunn, *Men's Fashions 1850–1900: Outerwear* and *Coats
  and Jackets*: Inverness, Ulster, Chesterfield, Gladstone (short cape,
  astrakhan edge), Raglan, Covert, Mackintosh; smooth dark cloth, plaid
  wool, tweed, velvet collars, fur borders, frogging. → Outerwear is dark
  and plain; the interest is in the edge (fur, velvet, frogging), which
  suits "one trait, pushed" and scalloped fur edges.
- victorianweb.org, *Fabrics and Color*; Preston Pages, *The Winter Coat*:
  heavy milled cloth and tweed mostly black, dark blue, grey and brown;
  tan, navy and black coats. → `coal`, `slate`, `navy`, `tweed`, `camel`.
- vintagedancer.com, *Victorian Fashion Colors & Fabrics 1840s–1890s*:
  1870s winter mauve, slate grey, maroon; 1880s sapphire, plum, claret,
  ruby, bronze and gold trim, jet beads; 1890s every purple, black, dark
  green, navy, deep red, mohair and serge. → `plum`, `oxblood` (claret /
  maroon family), `bottle` (dark green), `brass` for trim.
- Ashmolean, *The colour revolution in Victorian fashion*; FIT Fashion
  History Timeline, *aniline dyes*; The Dreamstress on mauveine: after
  1856 aniline dyes made loud purples and magentas possible. → We do not
  take the loud end: rule "cloth darker and duller than its wearer" wins.
  Plum stays muted.
- Racked, *19th-century mourning veils*; Maryland Center for History and
  Culture, *The Dyes of Death*: mourning crape was an aniline black with a
  faint cast. → `mourning` is a violet-tinged black, set apart from the
  neutral `coal`.
- Click Americana, *Victorian winter fashion, 1891*: sealskin the most
  stylish fur, worn with sable; muffs, fur-trimmed wool. Vintage Fashion
  Guild, *Lamb*: astrakhan / Persian lamb in tight curls, black, grey or
  brown, the leather dyed dark. Styleforum on silk vs beaver top hats:
  "silk" hats replaced beaver felt from the 1830s. → `seal` (dark warm
  brown), `astrakhan` (neutral grey-black), `sable` (warm mid brown),
  `beaver` (hat felt brown).
- Starco Jewellers and arthistory.net on Victorian jewellery: jet for
  mourning, gunmetal (deep grey) late in the era, pewter, brass, garnet.
  → `gunmetal`, `pewter`, `brass`; jet dropped (it cannot read on a
  near-black sky, and the rule says metal never glows).

## Dishonored and Control

- PC Gamer, *Dishonored concept art with comments from Sébastien Mitton*;
  Shacknews, *The unmistakably English art of Dishonored*; Dishonored wiki
  on Viktor Antonov: a painted, oppressive city built from contrast (rich
  and poor, light and shadow), strong shadows, exaggerated proportions
  from pulp illustration, painters like Gérôme and Cortès. → Value
  contrast carries the read, not hue; hues stay few and dirty.
- Game Informer, *The mesmerizing art behind Control*; Game Developer on
  the Oldest House; Stuart Macdonald's brutalism notes: mass, stepped
  surfaces, attenuation; the fluid threat against hard geometry. →
  Tier 3's steps are few, flat and stepped (fog layers), shapes simple.

## What we built

`js/genesis/genesis-eldpal.js` (`window.GenEldPal`): 21 named tokens in
five groups (cloth, leather, fur, metal, snow), each a lit hex with mid
(×0.70, the optional third band) and shade (×0.45, the roster's split)
derived once; four tier-3 steps plus `under` (darker than the backdrop).

Contrast gates, checked by `GenEldPal.report()` (WCAG ratio):

- cloth, leather, fur, metal, snow: lit ≥ 1.5:1 on the lightest chaos
  (#1a1a22); shade ≥ 1.05:1 on the backdrop (#0d1114). Dark cloth sits
  near the floor (mourning 1.5, coal 1.6), so a dark garment reads by its
  lit side and outline, as the art-style rule "outline first" wants.
- tier 3: every step 1.02–1.15:1 on the backdrop, strictly rising; the
  caption step (t1) ≤ 1.05; `under` darker than the backdrop.

Check and review sheet:

    py -3 tools/jscheck.py js/genesis/genesis-eldpal.js --eval "return JSON.stringify(GenEldPal.report().fails)"
    py -3 tools/jscheck.py js/genesis/genesis-eldpal.js --eval "GenEldPal.swatchSheet(ctx, 1440, 900); return 1;" --shot <out.png>

Sources:
[victorianweb outerwear](https://www.victorianweb.org/art/costume/nunn24.html),
[victorianweb coats](https://www.victorianweb.org/art/costume/nunn18.html),
[victorianweb fabrics and color](https://victorianweb.org/art/costume/nunn13.html),
[Preston Pages winter coat](https://www.prestonpages.com/brightonhistory/winter-coat),
[Vintage Dancer colours](https://vintagedancer.com/victorian/victorian-fashion-colors-fabrics-1840s-1890s/),
[Ashmolean colour revolution](https://www.ashmolean.org/article/the-colour-revolution-in-victorian-fashion),
[FIT aniline dyes](https://fashionhistory.fitnyc.edu/aniline-dyes/),
[Racked mourning veils](https://www.racked.com/2018/3/29/17156818/19th-century-mourning-veil),
[MdHistory dyes of death](https://www.mdhistory.org/the-dyes-of-death/),
[Click Americana 1891](https://clickamericana.com/topics/beauty-fashion/victorian-ladys-way-keep-warm-fall-winter-clothing-1891),
[VFG lamb](https://vintagefashionguild.org/resources/item/fur/lamb-sheep/),
[Styleforum top hats](https://www.styleforum.net/threads/top-hats-beaver-or-silk.28143/),
[Starco metals](https://www.starcojewellers.com.au/m-jewelry/metals-used-in-victorian-jewelry.html),
[arthistory.net jet](https://www.arthistory.net/victorian-jet-jewelry/),
[PC Gamer Dishonored concept art](https://www.pcgamer.com/dishonored-3/),
[Shacknews Dishonored art](https://www.shacknews.com/article/73538/the-unmistakably-english-art-of-dishonored),
[Dishonored wiki Antonov](https://dishonored.fandom.com/wiki/Viktor_Antonov),
[Game Informer Control art](https://gameinformer.com/2019/03/27/the-mesmerizing-art-behind-control),
[Game Developer Oldest House](https://www.gamedeveloper.com/art/the-real-buildings-that-inspired-i-control-i-s-oldest-house),
[Macdonald brutalism](https://machinefire.artstation.com/projects/xzynYY).
