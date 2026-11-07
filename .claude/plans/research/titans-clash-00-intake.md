# titans-clash · 00 intake research (2026-11-07)

Web results were thin on the exact "bodies collide, shatter, creatures born from the wreckage" beat; what held is below, in our words.

## Precedents (what we take)

- Stop-motion explosions (Howcast via recapio.com/digest/how-to-animate-an-explosion-stop-motion-by-howcast): every piece moves outward from the centre, each frame faster and larger; the burst is capped by an "empty" frame, then the leftovers are cleared. Take: a held-step burst of 3-4 snaps, each spread larger than the last, then one quiet frame before the births.
- Bloop Animation particle lesson (bloopanimation.com/lesson/particle-systems-2): debris must pop out of ONE impact frame, low counts, little randomness. Take: all debris born on the burst snap, seeded, about 60-80 bodies, never a continuous emitter.
- Layered confetti canvas demo (codepen.io/matt-cannon/pen/vEGqmPq) and a scale-parallax gist (gist.github.com/thykka/b52fa356fd98953ce836): near/mid/far layers with speed and scale multipliers; sprites pre-baked once, drawn by drawImage; blur never per frame. Take: three depth bands (behind the span / on the deck / in front), chips as cached sprites like genesis-rocktitans.js `sprite()`, size doubles as depth; no filters per chip per frame.
- Shadow of the Colossus deaths (teamico.fandom.com/wiki/The_Colossi; avclub.com review): what leaves the dying body (black tendrils) is the payload of the death, drawn larger than the wound. Take: the debris IS the event, drawn bigger and more than the contact itself; the contact can be one dark snap.
- Hellboy 2004 climax (monsterlegacy.net/2020/04/19/hellboy-ogdru-jahad-behemoth/): the Behemoth bursts out of Rasputin's body and grows. Take: a being born of another body's wreck reads when it GROWS out of the heap in steps, not when it appears beside it.
- Princess Mononoke's Forest Spirit death (tvtropes.org/pmwiki/pmwiki.php/Anime/PrincessMononoke): after the fall a small kodama walks out at the pool; life survives the body. Take: the births start after a beat of stillness, smallest first; the fall itself never shows the new life.
- Akira's Tetsuo (looper.com/432035/we-finally-understand-the-ending-of-akira): bodies merging read as one amorphous mass before the light. Take: when the four overlap at the centre, draw them as one dark lump for the hold (no four readable silhouettes), then the burst.

## Techniques for our loop

- Every chip is a cached sprite (a crop of a titan's body rock or a piece sprite, `sprite()`/`titanCache()` pattern); the burst frame computes each chip's path once (seeded), each held snap just draws.
- Depth: behind-the-span chips draw in the titan slot (genesis.js:668, before drawSpan), so the slab (0.58 H) and ceiling (0.28 H) cut them for free; deck and floating chips draw in the front old-one layer (:701) so they sit over the span.
- Cost: with ~80 drawImage calls per frame and no filters this stays far under the bridge loop's own cost; measure once with the frame-time print in jscheck (--eval) and cap at 100 chips.
