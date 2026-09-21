/* ===========================================================
   DEPTHS — nodes that only exist once their prerequisites are
   claimed.

   Pure data, no DOM/canvas/listeners. Sector nodes are grouped
   into clusters, each hanging off a root beacon id. A node
   inside a cluster stays hidden until every id in its `after`
   has been claimed, at which point bridge.js is free to spawn
   it the same way it spawns any other beacon node.

   Node positions are never typed by hand: each cluster picks a
   layout shape (`rows`, `arc`, `chain` or `branch`) and every
   node's offset from its root is computed from that layout plus
   the node's wave — its distance, in claim-steps, from the root.
   This keeps clusters declarative: add a node, point its
   `after` at whatever gates it, and its place in the layout
   falls out automatically. `branch` anchors each later-wave node
   to the node that unlocked it, so children fan out beneath
   their own parent rather than sharing a row.

     Depths.nodes()     -> array of flattened node defs, one per
                           node, in cluster / wave / declaration
                           order (a copy, not the module's own
                           array)
     Depths.clusters()  -> array of the raw cluster defs (a copy)
   =========================================================== */

window.Depths = (function () {

  // preload="none" and no autoplay: bridge.js runs a rAF loop
  // every frame and must not pay for video decode it never asked for.

  const CLUSTERS = [
    {
      root: "bnote-planet-zero",
      theme: "zeroDeep",
      size: 0.72,
      layout: {
        shape: "rows",
        rows: [
          { dy: 0.20, dx: 0, spread: 0.28 },
          { dy: -0.11, dx: 0, spread: 0.48, arch: 0.05 }
        ]
      },
      nodes: [
        {
          id: "bnote-sz-shell",
          after: ["bnote-planet-zero"],
          xp: 1,
          name: "The Shell",
          sub: "A parser, not a prop",
          html: `
        <p class="tag">Signal · sector zero / shell</p>
        <h3>The Shell</h3>
        <figure class="clipbox">
          <video class="clip" src="media/sector-zero/login.mp4" poster="media/sector-zero/login.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Credentials come off a note in the room. Tab completion, command history, and a real error on a bad path — the shell is a parser, not a prop.</figcaption>
        </figure>
        <p class="sub">A real shell, not a menu in disguise</p>
        <p class="body">RealityTXT runs <code>ls</code>, <code>cd</code>, <code>cat</code>, <code>create</code>, <code>edit</code>, <code>rm</code> and <code>mail</code> over a virtual filesystem. Anyone who has used a terminal already knows how to play. And because every mechanic is a text operation, a new feature costs a command instead of a UI.</p>
        <p class="sub">The terminal talks back</p>
        <p class="body">A mail client runs inside the shell. Messages arrive, you <code>read</code> them, and <code>reply</code> gives you numbered options — never one correct answer. It's the cheapest narrative surface in the game: a coworker who might still be alive, the company that sent you, or something that shouldn't have access to the inbox. It doubles as the hint system.</p>
      `
        },
        {
          id: "bnote-sz-chair",
          after: ["bnote-planet-zero"],
          xp: 1,
          name: "The Chair",
          sub: "The whole game, completable seated",
          html: `
        <p class="tag">Signal · sector zero / movement</p>
        <h3>The Chair</h3>
        <p class="sub">Movement</p>
        <p class="body">You can walk, or you can sit in the office chair and drive. Seated, locomotion switches to tank controls: you push off the floor in short impulses and steer directly. Rotation speed is dynamic — fast when you commit, precise at low speed — and hitting a wall makes you skid and bounce instead of stopping dead. The entire game can be completed from the chair.</p>
        <figure class="clipbox">
          <video class="clip" src="media/sector-zero/chairUseFinal.mp4" poster="media/sector-zero/chairUseFinal.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Leg impulses for thrust, tank controls, wall bounce.</figcaption>
        </figure>
      `
        },
        {
          id: "bnote-sz-storm",
          after: ["bnote-sz-shell", "bnote-sz-chair"],
          xp: 1,
          name: "The Storm",
          sub: "Gravity fails on a curve",
          html: `
        <p class="tag">Signal · sector zero / storm</p>
        <h3>The Storm</h3>
        <p class="sub">The storm</p>
        <p class="body">Every so often the room loses its grip. Gravity stops applying to a set of objects, each one takes a push, and what you were looking at a second ago is above you. Severity rolls on a curve — mild storms common, violent ones rare.</p>
        <p class="body">When it passes they drift back toward where they started, and don't quite make it. The lights cut, and in the dark everything is teleported the rest of the way home. The drift is what you see; the blackout hides the snap. Reality holds together only because you weren't looking.</p>
        <p class="body">One object is singled out each storm as a target. That's where the creature hooks in.</p>
      `
        },
        {
          id: "bnote-sz-catalogue",
          after: ["bnote-sz-shell", "bnote-sz-chair"],
          xp: 1,
          name: "The Catalogue",
          sub: "Attention is the currency",
          html: `
        <p class="tag">Signal · sector zero / catalogue</p>
        <h3>The Catalogue</h3>
        <p class="sub">Cataloguing is the counter-mechanic</p>
        <p class="body">Register an object and the storm can't touch it. The room starts unstable and goes solid one object at a time, at exactly the rate you're willing to pay attention. Nothing announces it — you notice because the corner you documented first is the corner that stopped moving.</p>
        <p class="body">Registering also makes an object <em>usable</em>. Gadgets — a bucket that shelters whatever you drop in it, scissors that work as a weapon but freeze in place after a hit — arrive with deliberately bad numbers. Fixing them, or breaking them further on purpose, is where the economy gets spent.</p>
        <p class="sub">The economy</p>
        <p class="body">Editing reality costs what you earn by looking at it.</p>
        <ul class="pts">
          <li>Registering an object earns <strong>1 point</strong>.</li>
          <li>Editing costs one point per character changed. Overspend and the file reverts.</li>
          <li>The balance lives inside the file you're editing.</li>
        </ul>
        <p class="body">Character count is what makes this a design problem instead of a cheat menu. <code>1</code> to <code>9</code> is one character. An absurd weight costs real budget.</p>
        <figure class="clipbox">
          <video class="clip" src="media/sector-zero/createEntryFinal.mp4" poster="media/sector-zero/createEntryFinal.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Creating an object after discovering it. Everything has size and weight; rarer objects carry extra attributes you can read and rewrite.</figcaption>
        </figure>
      `
        },
        {
          id: "bnote-sz-brian",
          after: ["bnote-sz-shell", "bnote-sz-chair"],
          xp: 1,
          name: "Brian",
          sub: "The player has a file too",
          html: `
        <p class="tag">Signal · sector zero / brian</p>
        <h3>Brian</h3>
        <p class="sub">Brian is an object</p>
        <p class="body">The player has a file too. Height rescales the character capsule, so a shelf out of reach isn't any more. Weight drives speed and gravity on a curve: near zero and you move 2.5× faster in near-freefall; past 120 and you crawl under 4× gravity.</p>
        <p class="body">Set the weight <strong>negative</strong> and gravity inverts. Brian falls upward. One character in a text file, and the ceiling becomes the floor.</p>
        <figure class="clipbox">
          <video class="clip" src="media/sector-zero/editplayerFinal.mp4" poster="media/sector-zero/editplayerFinal.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Editing the player's own record. A spatial problem becomes a text problem.</figcaption>
        </figure>
      `
        },
        {
          id: "bnote-sz-residue",
          after: ["bnote-sz-shell", "bnote-sz-chair"],
          xp: 1,
          name: "Residue",
          sub: "Found, not told",
          html: `
        <p class="tag">Signal · sector zero / residue</p>
        <h3>Residue</h3>
        <p class="sub">Found, not told</p>
        <p class="body">Objects carry an ID and, sometimes, one line from whoever used them last — a complaint about a blank disc, someone else's cold pizza. Nothing narrates who left them.</p>
        <figure class="clipbox">
          <video class="clip" src="media/sector-zero/checkItemsFinal.mp4" poster="media/sector-zero/checkItemsFinal.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Inspecting objects. Character comes out of the details, in whatever order the player finds them.</figcaption>
        </figure>
        <p class="sub">Where it goes</p>
        <p class="body">Everything above runs. The expensive part is already paid for: once the world is a filesystem and reality reads from it, a new mechanic is a new field in a text file. More gadgets, rarer storm events, a character writing to your inbox — each one slots into what already exists.</p>
      `
        }
      ]
    },
    {
      root: "bnote-planet-voidscape",
      theme: "voidscapeDeep",
      size: 0.7,
      layout: {
        shape: "arc",
        squash: 1.2,
        rings: [
          { r: 0.18, from: 90, to: 90 },
          { r: 0.25, from: 40, to: 140 },
          { r: 0.33, from: 20, to: 160 }
        ]
      },
      nodes: [
        {
          id: "bnote-vs-board",
          after: ["bnote-planet-voidscape"],
          name: "The Board",
          sub: "You write the difficulty",
          html: `
        <p class="tag">Signal · voidscape / board</p>
        <h3>The Board</h3>
        <!-- placeholder clip: media/voidscape/runs.mp4 is not recorded yet — drop it in and swap the poster for runs.jpg -->
        <figure class="clipbox">
          <video class="clip" src="media/voidscape/runs.mp4" poster="media/voidscape/voidscapeFrontPage.webp" muted loop playsinline preload="none" controls></video>
          <figcaption>Starting a run. Missions roll onto the monitors — every drawback on the board raises the payout.</figcaption>
        </figure>
        <p class="sub">The problem</p>
        <p class="body">Every roguelike I played had the same failure: the god run. The drops line up, damage goes exponential, and the boss you were supposed to fear dies in one shot. The run you waited ten hours for is the least interesting one you'll play, because the game stopped asking anything of you at exactly the moment it should have asked the most.</p>
        <p class="body">Stat scaling causes it. If power is a number and enemies are a number, one eventually runs away from the other. Tuning doesn't fix that — it just moves where the break happens.</p>
        <p class="sub">The answer: let the player set the terms</p>
        <p class="body">The run itself is a rolled item. Before entering, you stand at a bank of monitors, each showing a generated mission with its own set of modifiers — monster health, damage and action speed; reduced healing; grenades disabled; entire damage types made immune.</p>
        <p class="body">Every one of those drawbacks automatically raises elite chance, special-room frequency and drop rate, with a random component on top so two equally-loaded missions aren't equally worth taking. You read the board, weigh it, and choose. Missions can be rerolled or pushed further for a price.</p>
        <p class="body">Four of the modifiers don't explain themselves at all — <code>Danger</code>, <code>ERROR</code>, <code>UnknownX</code>, <code>UnknownY</code>. They carry the lowest weights in the table. The only way to find out is to take one.</p>
      `
        },
        {
          id: "bnote-vs-colour",
          after: ["bnote-vs-board"],
          name: "Red and Blue",
          sub: "Colour is a commitment",
          html: `
        <p class="tag">Signal · voidscape / colour</p>
        <h3>Red and Blue</h3>
        <!-- placeholder clip: media/voidscape/map.mp4 is not recorded yet — drop it in and swap the poster for map.jpg -->
        <figure class="clipbox">
          <video class="clip" src="media/voidscape/map.mp4" poster="media/voidscape/voidscapeFrontPage.webp" muted loop playsinline preload="none" controls></video>
          <figcaption>The map. Every boon you take pulls the dungeon's influence toward its colour.</figcaption>
        </figure>
        <p class="sub">Colour is a commitment</p>
        <p class="body">Boons drop as Red or Blue. Taking one shifts the dungeon's influence toward that colour — and the influence cuts both ways: <strong>lean into a colour and its rooms turn hostile, while the opposite colour's rooms turn generous.</strong></p>
        <p class="body">Blue turns monsters temporarily invisible and slows you when they connect. Red makes them faster and detonate on death. The compensation runs in the other direction: doubled monsters, doubled drops, higher elite chance. A dedicated room type lets you flip your influence mid-run, which makes it a decision you keep revisiting instead of one you make once.</p>
        <p class="sub">Fifty boons, and most of them cost something</p>
        <p class="body">Boons stack for the rest of the run and are weighted by rarity. The flat upgrades exist, but they're the boring ones. The interesting half are trades: lose 20 max HP for +10 fire damage. Shrink your explosion radius by 90% to double its damage. Deal all your poison damage instantly, at half value. Halve your bullet speed for +50 physical.</p>
        <p class="body">They also convert between elements — poison feeding fire, physical becoming cold on crits, chilled enemies taking more poison. Elements aren't separate lanes, so builds collide in ways I never wrote down. Every boon is implemented to be reversible, applying and unapplying through the same path, which is what lets the influence system move them around at runtime.</p>
      `
        },
        {
          id: "bnote-vs-bench",
          after: ["bnote-vs-board"],
          name: "The Bench",
          sub: "Weapons are rolled, not designed",
          html: `
        <p class="tag">Signal · voidscape / bench</p>
        <h3>The Bench</h3>
        <!-- placeholder clip: media/voidscape/crafting.mp4 is not recorded yet — drop it in and swap the poster for crafting.jpg -->
        <figure class="clipbox">
          <video class="clip" src="media/voidscape/crafting.mp4" poster="media/voidscape/voidscapeFrontPage.webp" muted loop playsinline preload="none" controls></video>
          <figcaption>Adding, removing, and scrapping mods at the bench.</figcaption>
        </figure>
        <p class="sub">Weapons are generated, not designed</p>
        <p class="body">A gun rolls a base type, a level, and a set of modifiers drawn from three grades: interior (damage), exterior (handling), and special (build-defining effects like ignite chance, freeze chance, or double damage).</p>
        <p class="body">The part that keeps them interesting is that grade weights decay per weapon as they roll. Land an interior mod and the next interior mod becomes far less likely on that gun; land a special and the odds barely move. Weapons come out mixed instead of stacking five of the same thing, and specials stay rare without needing a hard cap on them.</p>
        <p class="sub">Crafting gets more expensive the better you're doing</p>
        <p class="body">Gun parts drop from enemies and pay for adding mods, removing them, or scrapping a weapon outright. Price scales with both the weapon's level and how many mods it already carries — so pushing a good gun further costs progressively more, and a near-miss weapon is worth real money if you break it down instead. Weapons and layouts persist between runs, so building one is a decision with consequences past the session.</p>
      `
        },
        {
          id: "bnote-vs-loop",
          after: ["bnote-vs-colour", "bnote-vs-bench"],
          name: "The Second Loop",
          sub: "It scales on execution",
          html: `
        <p class="tag">Signal · voidscape / loop</p>
        <h3>The Second Loop</h3>
        <p class="sub">The second loop</p>
        <p class="body">Finishing a run doesn't end it. A second loop opens, and that one scales on execution rather than on numbers — the difficulty comes from what an encounter demands of the player, not from larger health bars. Points earned there persist into a skill tree, which attaches long-term progression to the part of the game that actually tests you.</p>
        <p class="body">This is where the god run gets its answer. A build that trivialises the first loop still has to be played in the second.</p>
        <p class="sub">Feel</p>
        <p class="body">Movement carries coyote time and jump buffering so inputs land when the player means them, side and jump dashes on independent cooldowns, and locked input direction during a dash so momentum carries instead of letting you steer mid-air. Enemy hits and explosions apply real knockback through a mass-weighted impact vector — and one boon turns being launched by your own fire explosion into a speed buff, which makes shooting the floor to travel a legitimate build.</p>
      `
        },
        {
          id: "bnote-vs-ledger",
          after: ["bnote-vs-colour", "bnote-vs-bench"],
          name: "The Ledger",
          sub: "What it cost, where it stands",
          html: `
        <p class="tag">Signal · voidscape / ledger</p>
        <h3>The Ledger</h3>
        <p class="sub">What it cost</p>
        <p class="body">Fifty interacting modifiers on top of rolled weapons and rolled missions means the combination space isn't testable by hand. Most of the work wasn't writing mechanics — it was making them compose without producing states I never anticipated, and accepting that some of those states are the reason the game is worth playing. A Red-heavy build inside a mission that rolled fire immunity is a problem nobody authored, and the player has to solve it with what they brought.</p>
        <p class="sub">Where it stands</p>
        <p class="body">Playable through two bosses. The generators are all in place — missions, weapons, mods, boons, rooms — and what's missing is content volume rather than architecture. Adding a new modifier means adding a row to a table; adding a new room means adding a prefab. That was the point of building it this way.</p>
        <p class="body"><a href="projects/voidscape.html">Open the full case →</a></p>
      `
        }
      ]
    },
    {
      root: "bnote-planet-heavylight",
      theme: "heavylightDeep",
      size: 0.62,
      layout: { shape: "chain", step: [-0.13, -0.065] },
      nodes: [
        {
          id: "bnote-hl-play",
          after: ["bnote-planet-heavylight"],
          wide: true,
          name: "Play HeavyLight",
          sub: "Shipped for WebGL",
          html: `
        <p class="tag">Signal · heavylight / play</p>
        <h3>Play HeavyLight</h3>
        <div class="embed embed-shell" data-src="https://itch.io/embed-upload/6434502?color=002f4b" data-title="Play HeavyLight in your browser" style="background-image:url('media/heavylight/heavylightFrontPage.webp')">
          <button type="button" class="embed-play">Play HeavyLight</button>
        </div>
        <p class="body">Playable here. Also on <a href="https://sebastianfreitas.itch.io/heavylight">itch.io</a>.</p>
        <p class="body">Click the frame to hand it the keyboard. Flying off closes the game.</p>
      `
        },
        {
          id: "bnote-hl-rule",
          after: ["bnote-hl-play"],
          name: "The Rule",
          sub: "Light carries momentum",
          html: `
        <p class="tag">Signal · heavylight / rule</p>
        <h3>The Rule</h3>
        <p class="body">A 2D puzzle platformer built on one rule: light has weight. Beams push crates, and if you stand in one, they push you. Every puzzle in the game is a consequence of that single rule.</p>
        <p class="sub">The rule</p>
        <p class="body">Light carries momentum proportional to its intensity, and the force falls off with distance. That means a beam is a physical object: it can hold a crate against a wall, lift you across a gap, or crush you if you let it build up.</p>
      `
        },
        {
          id: "bnote-hl-reuse",
          after: ["bnote-hl-play"],
          name: "Built to Be Reused",
          sub: "The base Conclusus stands on",
          html: `
        <p class="tag">Signal · heavylight / reuse</p>
        <h3>Built to Be Reused</h3>
        <p class="sub">Built to be reused</p>
        <p class="body">I wrote it as a base rather than a one-off. The follow-up, <a href="projects/conclusus.html">Conclusus</a>, reused it for 30 levels and four new mechanics and took less time to build than the original — which was the actual test of whether the base was any good.</p>
        <p class="body"><a href="projects/heavylight.html">Open the full case →</a></p>
      `
        }
      ]
    },
    {
      root: "bnote-planet-conclusus",
      theme: "conclususDeep",
      size: 0.66,
      layout: {
        shape: "rows",
        rows: [
          { dy: 0.17, dx: -0.14, spread: 0.18 },
          { dy: 0.29, dx: -0.05, spread: 0.18 }
        ]
      },
      nodes: [
        {
          id: "bnote-cc-play",
          after: ["bnote-planet-conclusus"],
          wide: true,
          name: "Play Conclusus",
          sub: "Thirty levels, in the browser",
          html: `
        <p class="tag">Signal · conclusus / play</p>
        <h3>Play Conclusus</h3>
        <div class="embed embed-shell" data-src="https://itch.io/embed-upload/14396412?color=141a1d" data-title="Play Conclusus in your browser" style="background-image:url('media/conclusus/conclususFrontPage.webp')">
          <button type="button" class="embed-play">Play Conclusus</button>
        </div>
        <p class="body">Playable here. Also on <a href="https://sebastianfreitas.itch.io/conlusus">itch.io</a>.</p>
        <p class="body">Click the frame to hand it the keyboard. Flying off closes the game.</p>
      `
        },
        {
          id: "bnote-cc-why",
          after: ["bnote-planet-conclusus"],
          name: "Why It Exists",
          sub: "Is reusable actually cheaper?",
          html: `
        <p class="tag">Signal · conclusus / why</p>
        <h3>Why It Exists</h3>
        <p class="body">Thirty levels and four new mechanics built on top of <a href="projects/heavylight.html">HeavyLight</a>, finished in less time than the original took. Proving that was the point of building it.</p>
        <p class="sub">Why it exists</p>
        <p class="body">I wrote HeavyLight as a base rather than a one-off, which is easy to claim and hard to prove. Conclusus was the test: take the same foundation, build something bigger on it, and find out whether the second project is genuinely cheaper or whether "reusable" code quietly costs more than starting over.</p>
      `
        },
        {
          id: "bnote-cc-mechanics",
          after: ["bnote-cc-play", "bnote-cc-why"],
          name: "Four Mechanics",
          sub: "What went on top",
          html: `
        <p class="tag">Signal · conclusus / mechanics</p>
        <h3>Four Mechanics</h3>
        <p class="sub">What went on top</p>
        <p class="body"><strong>Shadow.</strong> Plant a shadow on the ground, then teleport back to it at any point. Position and scale both transfer, so it's a checkpoint you place yourself and a way to undo a commitment you've already made.</p>
        <p class="body"><strong>Symbols.</strong> Collectibles that drift and spin on their own, with a rotation coroutine that stutters and reverses at random intervals so they never look scripted. Some are whole; others break into pieces that have to be gathered in sequence, each one chaining to the next.</p>
        <p class="body"><strong>Time dilation.</strong> A burst state that drops the timescale to 0.6 for a few seconds — the level slows down while your inputs don't.</p>
        <p class="body"><strong>Grid movement</strong> for the sections that switch from platforming to cell-by-cell positioning, snapping to tile centres with its own interpolation.</p>
      `
        },
        {
          id: "bnote-cc-reuse",
          after: ["bnote-cc-play", "bnote-cc-why"],
          name: "What Reuse Bought",
          sub: "Systems yes, content no",
          html: `
        <p class="tag">Signal · conclusus / reuse</p>
        <h3>What Reuse Bought</h3>
        <p class="sub">What the reuse actually bought</p>
        <p class="body">The character controller carried over untouched, and it's the expensive part: separate scripts for jump, movement, ground detection, hurt states and juice, with jump height, apex time, independent up and down gravity multipliers, jump cutoff, coyote time and jump buffering all exposed as tuned ranges. None of that had to be rebuilt or retuned.</p>
        <p class="body">Everything else came from one convention. Every mechanic implements its own <code>Reset()</code>, and levels live as objects in a single scene that get switched on and off rather than loaded. Adding a mechanic meant writing its behaviour and its reset, and level transitions kept working — no scene loading, no save plumbing, no restart bugs to chase.</p>
        <p class="sub">The result</p>
        <p class="body">Twenty levels became thirty. Four mechanics that didn't exist in the original went in without touching the light-weight rule underneath them. And it shipped faster, which is the number that settles the question.</p>
        <p class="sub">What I'd change</p>
        <p class="body">Reuse worked at the systems level and not at the content level — thirty levels were still hand-placed from nothing. The next version of this argument puts the same effort into authoring tools that went into the mechanics.</p>
        <p class="body"><a href="projects/conclusus.html">Open the full case →</a></p>
      `
        }
      ]
    },
    {
      root: "bnote-rex",
      theme: "void",
      size: 0.6,
      layout: {
        shape: "branch",
        start: [0.14, -0.18],
        step: [0.16, 0.13],
        fan: { dy: 0.14, gap: 0.12 }
      },
      // at: [worldX, oy] pins a node where it was measured in flight (NAV X / Y); it overrides the layout.
      nodes: [
        {
          id: "bnote-rex-surface",
          after: ["bnote-rex"],
          name: "The Surface",
          sub: "Where the void still falls",
          html: `
        <p class="tag">Rex · surface</p>
        <h3>The Surface</h3>
        <p class="body">The Fall broke the surface of Rex and it has not finished breaking. What the Fall began, the Watcher's gaze and the Void itself keep up: storms of void matter, ground that forgets its shape, air that is sometimes not air.</p>
        <p class="body">Life up here is almost impossible. Almost. Two banners fly above the ruin anyway.</p>
      `
        },
        {
          id: "bnote-rex-under",
          after: ["bnote-rex"],
          at: [377837, 0.30],
          name: "The Underground",
          sub: "Where most of Rex keeps",
          html: `
        <p class="tag">Rex · underground</p>
        <h3>The Underground</h3>
        <p class="body">Most of Rex's people live below, scattered through the deep in small and fiercely isolated civilizations. The tunnels between them are dangerous and travel is barely possible, so each pocket grew alone.</p>
        <p class="body">The result is a patchwork no map holds: countless cultures, races, magics and machines, most of which have never heard of each other.</p>
      `
        },
        {
          id: "bnote-rex-hell",
          after: ["bnote-rex"],
          at: [392889, 0.25],
          name: "Hell",
          sub: "The field of the first war",
          html: `
        <p class="tag">Rex · hell</p>
        <h3>Hell</h3>
        <p class="body">Beneath the underground lies the battlefield of the first war, fought for almost ten thousand years. It never really ended. It only emptied of everything but the Vorgath.</p>
        <p class="body">This is the one door Rex keeps to the Root, and the ground still remembers what came through it.</p>
      `
        },
        {
          id: "bnote-rex-firstlight",
          after: ["bnote-rex-surface"],
          at: [358041, 0.48],
          name: "The Kingdom of First Light",
          sub: "Ruled by Godrick",
          html: `
        <p class="tag">Rex · surface / first light</p>
        <h3>The Kingdom of First Light</h3>
        <p class="body">A city raised on ground that cannot hold a city. Through advances in technology and magic, the Kingdom of First Light was built on the unlivable surface and holds there still, under the rule of Godrick.</p>
        <p class="body">It brought many races together and led them up out of the underground, to witness the impossible sky for the first time.</p>
      `
        },
        {
          id: "bnote-rex-crimson",
          after: ["bnote-rex-surface"],
          at: [364671, 0.38],
          name: "The Crimson Court",
          sub: "Nocturnals under a red star",
          html: `
        <p class="tag">Rex · surface / crimson court</p>
        <h3>The Crimson Court</h3>
        <p class="body">A hidden, mostly secret society of nocturnals, ruled by an eternal queen. They climbed to the surface for one reason: to be closer to their god.</p>
        <p class="body">That god is a red star among the Watcher's eyes. From their red castle they keep vigil beneath it and commune with it.</p>
      `
        },
        {
          id: "bnote-rex-bonespire",
          after: ["bnote-rex-under"],
          at: [375479, 0.46],
          name: "The Bone Spire",
          sub: "Kingdom of the dragons",
          html: `
        <p class="tag">Rex · underground / bone spire</p>
        <h3>The Bone Spire</h3>
        <p class="body">The dragons' kingdom is built on a tower made from the bones of dragons. As time passes more are added, and the Spire grows.</p>
        <p class="body">No two dragons share a shape. Each gives its endless life to one purpose, and body and mind reshape around it. One that sought a cure for a plague becomes that cure, and its touch can heal. Most purposes are unattainable, and that is the point: a dragon that masters its purpose is a dead dragon.</p>
      `
        },
        {
          id: "bnote-rex-titans",
          after: ["bnote-rex-under"],
          at: [378762, 0.25],
          name: "The Kingdom of Titans",
          sub: "Direct descendants of Rex Immotus",
          html: `
        <p class="tag">Rex · underground / titans</p>
        <h3>The Kingdom of Titans</h3>
        <p class="body">Giants so vast their sense of time is nothing like ours. A single step of a titan can take long enough for a tree to grow and wither.</p>
        <p class="body">They are direct descendants of Rex Immotus himself, and they move through the deep like weather.</p>
      `
        },
        {
          id: "bnote-rex-valkhar",
          after: ["bnote-rex-hell"],
          at: [387467, 0.44],
          name: "The Lost City of Valkhar",
          sub: "Where the first souls were raised",
          html: `
        <p class="tag">Rex · hell / valkhar</p>
        <h3>The Lost City of Valkhar</h3>
        <p class="body">At the centre of hell stands Valkhar, a city built by the gods, where their children lived: the first mortals of the soul kind.</p>
        <p class="body">Now it is devastated and forgotten, empty of everything but monsters.</p>
      `
        },
        {
          id: "bnote-rex-seal",
          after: ["bnote-rex-hell"],
          at: [395393, 0.35],
          name: "The Great Seal",
          sub: "A wall against the Root",
          html: `
        <p class="tag">Rex · hell / great seal</p>
        <h3>The Great Seal</h3>
        <p class="body">A wall raised against the Root itself, built to stop the Vorgath from coming through.</p>
        <p class="body">Who built it, and what it costs to hold, is still to be written.</p>
      `
        },
        {
          id: "bnote-rex-law",
          after: ["bnote-rex-hell"],
          at: [393803, 0.30],
          name: "The City of Law",
          sub: "Where reality is written down",
          html: `
        <p class="tag">Rex · hell / city of law</p>
        <h3>The City of Law</h3>
        <p class="body">One of the remnants of Valkhar that still stands, filled with the children of Ormius. At its heart is a giant tower full of paperwork: the laws of reality, from how physics works to what a thing is allowed to be.</p>
        <p class="body">It is heavily protected. Should anyone change what is written there, the effect on life could be vast.</p>
      `
        }
      ]
    },
    {
      root: "bnote-watcher",
      theme: "void",
      size: 0.6,
      layout: {
        shape: "branch",
        start: [0.14, -0.18],
        step: [0.16, 0.13],
        fan: { dy: 0.14, gap: 0.12 }
      },
      nodes: [
        {
          id: "bnote-watcher-redstar",
          after: ["bnote-watcher"],
          at: [334257, 0.24],
          name: "The Red Star",
          sub: "Mother of the nocturnals",
          html: `
        <p class="tag">Watcher · red star</p>
        <h3>The Red Star</h3>
        <p class="body">The mother of the nocturnals and a friend of the Watcher. An ancient being of the soul kind, she keeps close to its side and helps defend it from the other eldritch entities of the Void.</p>
        <p class="body">She also bends the light the Watcher sends toward Rex. Those on the surface who receive it become nocturnals instead of complete monstrosities. Most believe it a curse. It is the lesser evil: a small price for the mortal life of the soul kind to exist within the Void.</p>
      `
        },
        {
          id: "bnote-watcher-serus",
          after: ["bnote-watcher"],
          at: [335882, 0.52],
          name: "Serus",
          sub: "Orochronus Serus Lustrum",
          html: `
        <p class="tag">Watcher · serus</p>
        <h3>Serus</h3>
        <p class="body">Orochronus Serus Lustrum: one of the gods, the father of dragons and the god of causality. He rests in front of the Watcher, his vast, dark, serpent-like body coiled into a shield against its glare.</p>
        <p class="body">By moving that body at set moments he makes the cycle of night and day; winter and the other seasons are his work too. By restraining the light, he gave the soul kind a way to perceive time, and much more.</p>
      `
        }
      ]
    }
  ];

  // waveOf: id -> wave number, computed to a fixed point. Root
  // is wave 0. A node's wave is 1 + the max wave of the ids in
  // its `after`; an id in `after` that isn't the root and isn't
  // in the cluster counts as wave 0.
  function waveOf(cluster) {
    const wave = new Map();
    wave.set(cluster.root, 0);
    cluster.nodes.forEach(function (n) { wave.set(n.id, 0); });

    let changed = true;
    while (changed) {
      changed = false;
      cluster.nodes.forEach(function (n) {
        let maxW = -1;
        n.after.forEach(function (id) {
          const w = wave.has(id) ? wave.get(id) : 0;
          if (w > maxW) maxW = w;
        });
        const newW = maxW + 1;
        if (wave.get(n.id) !== newW) {
          wave.set(n.id, newW);
          changed = true;
        }
      });
    }
    return wave;
  }

  const LAYOUTS = {
    rows: function (w, i, n, L, k, ctx) {
      const u = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
      const row = L.rows[Math.min(w, L.rows.length) - 1];
      const extra = Math.max(0, w - L.rows.length);
      const dx = (row.dx || 0) + u * row.spread / 2;
      const dy = row.dy + (row.arch || 0) * Math.abs(u) + 0.12 * extra;
      return { dx: dx, dy: dy };
    },
    arc: function (w, i, n, L, k, ctx) {
      const ring = L.rings[Math.min(w, L.rings.length) - 1];
      const extra = Math.max(0, w - L.rings.length);
      const r = ring.r + 0.08 * extra;
      const a = (n === 1 ? (ring.from + ring.to) / 2 : ring.from + (ring.to - ring.from) * i / (n - 1)) * Math.PI / 180;
      const dx = r * Math.cos(a);
      const dy = r * Math.sin(a) * (L.squash || 1.2);
      return { dx: dx, dy: dy };
    },
    chain: function (w, i, n, L, k, ctx) {
      const dx = k * L.step[0];
      const dy = k * L.step[1] + (L.zig ? (k % 2 ? L.zig : -L.zig) : 0);
      return { dx: dx, dy: dy };
    },
    // branch: roots off L.start/L.step like a mini chain, but every
    // later-wave node anchors to whichever node unlocked it, fanning
    // out beneath that parent instead of sharing a row with siblings.
    branch: function (w, i, n, L, k, ctx) {
      if (!ctx.parent) {
        return { dx: L.start[0] + i * L.step[0], dy: L.start[1] + i * L.step[1] };
      }
      return {
        dx: ctx.parent.dx + (ctx.j - (ctx.m - 1) / 2) * L.fan.gap,
        dy: ctx.parent.dy + L.fan.dy
      };
    }
  };

  function nodes() {
    const out = [];

    CLUSTERS.forEach(function (cluster) {
      const layoutFn = LAYOUTS[cluster.layout.shape];
      if (!layoutFn) {
        console.error("depths: unknown layout " + cluster.layout.shape);
        return;
      }

      const wave = waveOf(cluster);

      // Group nodes by wave, keeping declaration order within a wave.
      const waveGroups = new Map();
      cluster.nodes.forEach(function (n) {
        const w = wave.get(n.id);
        if (!waveGroups.has(w)) waveGroups.set(w, []);
        waveGroups.get(w).push(n);
      });

      const waveNums = Array.from(waveGroups.keys()).sort(function (a, b) { return a - b; });

      const posOf = new Map();

      // anchorOf: the id in node.after that belongs to this cluster
      // (present in `wave`, not the root) with the highest wave. Ties
      // go to the first such id in `after` order. null if there is none.
      function anchorOf(node) {
        let best = null;
        let bestW = -1;
        node.after.forEach(function (id) {
          if (id === cluster.root || !wave.has(id)) return;
          const w = wave.get(id);
          if (w > bestW) {
            bestW = w;
            best = id;
          }
        });
        return best;
      }

      let k = 0;
      waveNums.forEach(function (w) {
        const group = waveGroups.get(w);
        const n = group.length;

        // Sibling indices: nodes sharing an anchor (or the root, if
        // anchorless) get consecutive j's and share m, the count.
        const anchorCounts = new Map();
        const js = [];
        group.forEach(function (node) {
          const key = anchorOf(node) || cluster.root;
          const j = anchorCounts.get(key) || 0;
          anchorCounts.set(key, j + 1);
          js.push(j);
        });

        group.forEach(function (node, i) {
          k++;
          const a = anchorOf(node);
          const m = anchorCounts.get(a || cluster.root);
          const ctx = { parent: a ? posOf.get(a) || null : null, j: js[i], m: m };
          const pos = layoutFn(w, i, n, cluster.layout, k, ctx);
          const dx = Math.round(pos.dx * 1000) / 1000;
          const dy = Math.round(pos.dy * 1000) / 1000;
          const size = Math.round(cluster.size * Math.pow(0.92, w - 1) * 1000) / 1000;

          posOf.set(node.id, { dx: dx, dy: dy });

          out.push({
            id: node.id,
            root: cluster.root,
            after: node.after,
            dx: dx,
            dy: dy,
            theme: cluster.theme,
            size: size,
            xp: node.xp || 1,
            name: node.name,
            sub: node.sub,
            wide: !!node.wide,
            html: node.html,
            at: node.at || null
          });
        });
      });
    });

    return out;
  }

  return { nodes: nodes, clusters: function () { return CLUSTERS.slice(); } };
})();
