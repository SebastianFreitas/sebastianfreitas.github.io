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

     A cluster's optional `par` overrides the parallax its nodes
     spawn with (bridge.js falls back to the root beacon's own par
     when a cluster has none).
   =========================================================== */

window.Depths = (function () {

  // preload="none" and no autoplay: bridge.js runs a rAF loop
  // every frame and must not pay for video decode it never asked for.

  const CLUSTERS = [
    {
      root: "bnote-planet-zero",
      theme: "zeroDeep",
      size: 0.72,
      // Ten notes in six waves, alternating below and above the planet so
      // every node stays inside off ±0.44 / 0.16 ≤ oy ≤ 0.66 and at least
      // 0.06 from its neighbours (see nav-flows bounds check). The planet is
      // at off -0.06 / oy 0.34; rings 1, 2, 4 hang below it, 3, 5, 6 sit
      // above. The storm debris beside the planet is painted before the
      // marks and never hit-tests, so nodes may cross it.
      layout: {
        shape: "arc",
        squash: 1.2,
        rings: [
          { r: 0.17, from: 90, to: 90 },
          { r: 0.26, from: 35, to: 145 },
          { r: 0.18, from: -50, to: -130 },
          { r: 0.34, from: 15, to: 165 },
          { r: 0.30, from: -20, to: -160 },
          { r: 0.14, from: -90, to: -90 }
        ]
      },
      nodes: [
        {
          id: "bnote-sz-room",
          after: ["bnote-planet-zero"],
          xp: 1,
          name: "One Room",
          sub: "Small on purpose",
          html: `
        <p class="tag">Signal · sector zero / room</p>
        <h3>One Room</h3>
        <p class="sub">Everything happens here</p>
        <p class="body">Sector Zero is a first-person horror game set in a single room. That limit is the design. A big map spreads the budget thin. One room lets every object get the time it needs, so nothing in it is a generic interact prompt.</p>
        <p class="sub">The chair is the proof</p>
        <p class="body">The office chair was built until it felt real, and once it did, a chair became something to play with. That is the bar for everything in the room. Even objects that will never matter carry a line of lore, so a dull object still holds weight for anyone who reads.</p>
      `
        },
        {
          id: "bnote-sz-quiet",
          after: ["bnote-sz-room"],
          xp: 1,
          name: "Say Nothing",
          sub: "A sandbox, not a script",
          html: `
        <p class="tag">Signal · sector zero / quiet</p>
        <h3>Say Nothing</h3>
        <figure class="clipbox">
          <video class="clip" src="media/sector-zero/checkItemsFinal.mp4" poster="media/sector-zero/checkItemsFinal.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Every object has a three-character ID and a note left by whoever handled it last. Read it, or do not.</figcaption>
        </figure>
        <p class="sub">Found, not told</p>
        <p class="body">The game explains almost nothing. Objects carry IDs and notes from the people who had them before you. You read, you try things, you draw your own conclusions. Most problems have more than one answer, and the game never waits for you to find the one it wanted.</p>
        <p class="sub">Do not expect the obvious</p>
        <p class="body">Scissors are sharp, and used as a weapon they cut. But nothing here has to be what it looks like. A floppy disk could be a teleporter. Once you learn that, the most ordinary object in the room is worth a second look.</p>
      `
        },
        {
          id: "bnote-sz-storm",
          after: ["bnote-sz-room"],
          xp: 1,
          name: "The Storm",
          sub: "Register it or lose it",
          html: `
        <p class="tag">Signal · sector zero / storm</p>
        <h3>The Storm</h3>
        <p class="sub">Chaos on a timer</p>
        <p class="body">The room starts broken. Thunder rolls a strength, and every loose object rolls against it. The ones that lose drop their gravity and drift. Seconds later the screen blinks black and they snap home. One caught object comes back changed. Strong thunder means the next one comes sooner.</p>
        <p class="sub">The loop</p>
        <p class="body">Your job is to register things before the storm takes them. A registered object is stable, readable and usable. Session by session the room gets calmer and starts to make sense. That is the whole arc: chaos first, then an order you built yourself.</p>
      `
        },
        {
          id: "bnote-sz-shell",
          after: ["bnote-sz-quiet", "bnote-sz-storm"],
          xp: 1,
          name: "The Shell",
          sub: "A parser, not a prop",
          html: `
        <p class="tag">Signal · sector zero / shell</p>
        <h3>The Shell</h3>
        <figure class="clipbox">
          <video class="clip" src="media/sector-zero/login.mp4" poster="media/sector-zero/login.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Credentials come off a note in the room. Tab completion, command history, and a real error on a bad path.</figcaption>
        </figure>
        <p class="sub">A real terminal</p>
        <p class="body">RealityTXT is a working shell over a virtual filesystem: <code>ls</code>, <code>cd</code>, <code>cat</code>, <code>create</code>, <code>edit</code>, <code>rm</code>, <code>mail</code>. Your login is a line in a file, so editing the file changes your password. <code>help</code> does not list every command. Anyone who has used a terminal already knows how to play.</p>
        <p class="sub">Friction, then less of it</p>
        <p class="body">Typing is slow, and early on that is the point. It makes the room feel like a workplace, not a menu. But typing gets tedious, so the terminal is kept for the moments that need it, and later tools will register objects for you. The friction is meant to fade.</p>
      `
        },
        {
          id: "bnote-sz-register",
          after: ["bnote-sz-quiet", "bnote-sz-storm"],
          xp: 1,
          name: "The Register",
          sub: "A file is the object",
          html: `
        <p class="tag">Signal · sector zero / register</p>
        <h3>The Register</h3>
        <figure class="clipbox">
          <video class="clip" src="media/sector-zero/createEntryFinal.mp4" poster="media/sector-zero/createEntryFinal.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Look at an object, read its ID, type create. The object is now a text file, and the text file is now the object.</figcaption>
        </figure>
        <p class="sub">create, then edit</p>
        <p class="body">Point at anything, read its three-character ID, and <code>create</code> writes it into the filesystem as a text file. Edit that file and the object follows: rename it, rewrite its note, change what it is. Every save spends from a budget, so attention is the currency.</p>
        <p class="sub">Gadgets come broken</p>
        <p class="body">The lantern's record reads Condition: Poor, and it plays the part. It flickers, dies, and wants a smack. Half the time you switch it on it holds steady for ten seconds, then goes back to being itself. A better lantern is one whose file says so.</p>
      `
        },
        {
          id: "bnote-sz-chair",
          after: ["bnote-sz-shell", "bnote-sz-register"],
          xp: 1,
          name: "The Chair",
          sub: "The whole game, completable seated",
          html: `
        <p class="tag">Signal · sector zero / chair</p>
        <h3>The Chair</h3>
        <figure class="clipbox">
          <video class="clip" src="media/sector-zero/chairUseFinal.mp4" poster="media/sector-zero/chairUseFinal.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Kick, slide, spin, bounce. Tank controls on an office chair.</figcaption>
        </figure>
        <p class="sub">Kicks, not wheels</p>
        <p class="body">Sit and the chair turns to meet you, then eases you in over half a second. Forward is a kick in three beats: weak, strong, weak, then a pause. It keeps sliding, spins with real inertia, and bounces off walls with a little extra speed, so you can work the whole room without standing up.</p>
        <p class="sub">Why it matters</p>
        <p class="body">None of it was required. A chair could have been a static prop. It got a sit blend, a push rhythm and a wall bounce because in one room a chair is a tenth of the furniture. Polish is the content.</p>
      `
        },
        {
          id: "bnote-sz-brian",
          after: ["bnote-sz-shell", "bnote-sz-register"],
          xp: 1,
          name: "Brian",
          sub: "The player has a file too",
          html: `
        <p class="tag">Signal · sector zero / brian</p>
        <h3>Brian</h3>
        <figure class="clipbox">
          <video class="clip" src="media/sector-zero/editplayerFinal.mp4" poster="media/sector-zero/editplayerFinal.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Weight, height, sex, age, password. Save the file and Brian changes.</figcaption>
        </figure>
        <p class="sub">A middle-aged man in a text file</p>
        <p class="body">Brian is heavy and out of shape, so he walks slowly and crouching is slow and uncomfortable. His worker record lists his weight and height. Weight drives speed, jump and gravity. Height rescales him. Past two and a half metres the file kills him.</p>
        <p class="sub">Mass, not fat</p>
        <p class="body">Find the medical records and you can rewrite him. Type a lower weight and he moves like a healthy man and fits where he could not before. Type a negative one and he falls onto the ceiling. The number is his mass, not his shape. What the file says, he is.</p>
      `
        },
        {
          id: "bnote-sz-dark",
          after: ["bnote-sz-chair", "bnote-sz-brian"],
          xp: 1,
          name: "The Dark",
          sub: "Something shares the room",
          html: `
        <p class="tag">Signal · sector zero / dark</p>
        <h3>The Dark</h3>
        <p class="sub">You know this room</p>
        <p class="body">The horror comes from familiarity. You never leave, so you learn where everything sits, and a mug that moved reads louder than a jump scare. Something shares the room. It is hard to see and never fully shown. Maybe it is one of the others. The game will not say.</p>
        <p class="sub">It gets easier</p>
        <p class="body">It throws things. It reaches the terminal and deletes or corrupts your work. No music tells you it is there. Hit it with something thrown and it goes still for a while, the only safe minutes you get. Later, better tools and traps push it back, maybe for good. Brian starts as a victim and ends as the master of the room.</p>
      `
        },
        {
          id: "bnote-sz-crew",
          after: ["bnote-sz-chair", "bnote-sz-brian"],
          xp: 1,
          name: "Obscura",
          sub: "The company is the villain",
          html: `
        <p class="tag">Signal · sector zero / crew</p>
        <h3>Obscura</h3>
        <p class="sub">Anomium</p>
        <p class="body">Obscura Dynamics hunts anomalies. Decades in, they found a property behind them that is not matter, light or sound, and named it Anomium. Touch it and things burn, change or vanish. Their answer was RealityTXT: a terminal where typing <code>static</code> on an object makes it hold, even against chaos.</p>
        <p class="sub">Four people in debt</p>
        <p class="body">When Sector Zero went silent, Obscura sent the people it could afford to lose. Brian, a teacher who lost his job to anxiety. Amy, his partner, a manager ruined by a corruption charge. Laura, a nurse after one bad night. Jason, a mechanic with gambling debts. The game opens with the four split up and Brian alone, with no memory. The creature is the threat. The company is the antagonist.</p>
      `
        },
        {
          id: "bnote-sz-stands",
          after: ["bnote-sz-dark", "bnote-sz-crew"],
          xp: 1,
          name: "Where It Stands",
          sub: "Built, next, and the page",
          html: `
        <p class="tag">Signal · sector zero / stands</p>
        <h3>Where It Stands</h3>
        <p class="sub">Built</p>
        <p class="body">The shell and its filesystem, the login off a file, the register and edit loop with its budget, the worker record with weight, height and inverted gravity, the storm cycle with the blackout snap, the chair, a screwdriver that charges and flies back, a lantern that lies about working.</p>
        <p class="sub">Next</p>
        <p class="body">The creature, the traps, the tools that register for you, the medical records. Sector Zero is a proof of concept on purpose: prove one room can carry a game, then fill it.</p>
        <p class="body"><a href="projects/sector-zero.html">Open project →</a></p>
      `
        }
      ]
    },
    {
      root: "bnote-planet-voidscape",
      theme: "voidscapeDeep",
      size: 0.7,
      // Ten notes in six waves. Rings 4 to 6 sit below the first fan so every
      // node stays inside off ±0.44 / oy ≤ 0.66 and at least 0.06 from its
      // neighbours (see nav-flows bounds check); the bench and map nodes go
      // under the planet so the forge panels beside it stay clear.
      layout: {
        shape: "arc",
        squash: 1.2,
        rings: [
          { r: 0.18, from: 90, to: 90 },
          { r: 0.25, from: 40, to: 140 },
          { r: 0.33, from: 20, to: 160 },
          { r: 0.30, from: 110, to: 70 },
          { r: 0.416, from: 33, to: 147 },
          { r: 0.275, from: 90, to: 90 }
        ]
      },
      nodes: [
        {
          id: "bnote-vs-godrun",
          after: ["bnote-planet-voidscape"],
          name: "The God Run",
          sub: "The problem, and two answers",
          html: `
        <p class="tag">Signal · voidscape / god run</p>
        <h3>The God Run</h3>
        <p class="sub">The problem</p>
        <p class="body">Every roguelike I played had the same failure: the god run. The drops line up, damage goes exponential, and the boss you were supposed to fear dies in one shot. The run you waited ten hours for is the least interesting one you will play, because the game stopped asking anything of you at exactly the moment it should have asked the most.</p>
        <p class="body">Stat scaling causes it. If power is a number and enemies are a number, one eventually runs away from the other. Tuning does not fix that. It only moves where the break happens.</p>
        <p class="sub">Two answers</p>
        <p class="body">The classic answer is to let the player pick a harder difficulty, and VoidScape has that. The run itself is rolled on a board of missions, each with its own modifiers, and every modifier raises the payout. It is a good answer, but it is not a new one. Numbers against numbers still break eventually.</p>
        <p class="body">The new answer is the special run. Once a run is done you can attempt to go deeper, onto a path that scales on execution rather than on numbers: longer, more broken, more elites, a boss group waiting at the end. A build that trivialises the normal run still has to be played out there, and it is the only place skill points come from.</p>
      `
        },
        {
          id: "bnote-vs-board",
          after: ["bnote-vs-godrun"],
          name: "The Board",
          sub: "You write the difficulty",
          html: `
        <p class="tag">Signal · voidscape / board</p>
        <h3>The Board</h3>
        <figure class="clipbox">
          <video class="clip" src="media/voidscape/missions.mp4" poster="media/voidscape/missions.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Choosing a run. Every modifier on a mission raises the payout.</figcaption>
        </figure>
        <p class="sub">Rolled, not authored</p>
        <p class="body">Before entering, you stand at a bank of monitors. Each one searches for a mission and shows what it found: a rolled set of modifiers and the payout they earn. Modifiers cut both ways. Some make things worse: more monster health, damage or action speed, halved healing, grenades disabled, slower movement, a whole damage type made immune. Some make things better: a higher weapon level, extra gun parts per kill, more boon rooms, every side room special.</p>
        <p class="body">Every modifier on the list, good or bad, raises elite chance, special room frequency and drop rate, with a random component on top so two equally loaded missions are not equally worth taking. You read the board, weigh it, and choose. A mission can be pushed further or the whole board rerolled, paid in gun parts, and the price climbs each time.</p>
        <p class="sub">The four that do not explain themselves</p>
        <p class="body"><code>Danger</code>, <code>ERROR</code>, <code>UnknownX</code> and <code>UnknownY</code> carry the lowest weights in the table. The only way to find out is to take one.</p>
        <p class="sub">The cap</p>
        <p class="body">How many modifiers a mission can carry is capped by the skill tree. A fresh save gets one. Deeper special runs raise the cap, so the biggest payouts sit behind the part of the game that tests you.</p>
      `
        },
        {
          id: "bnote-vs-deeper",
          after: ["bnote-vs-godrun"],
          name: "Going Deeper",
          sub: "The special run",
          html: `
        <p class="tag">Signal · voidscape / deeper</p>
        <h3>Going Deeper</h3>
        <figure class="clipbox">
          <video class="clip" src="media/voidscape/deeper.mp4" poster="media/voidscape/deeper.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Attempting to go deeper. Special runs are the only source of skill points. 0:41.</figcaption>
        </figure>
        <p class="sub">Not a mission</p>
        <p class="body">The special run is a path built from bridge pieces out in the void, each one shifted and tilted at random, with a chance for any piece to be missing. Monsters wait on every other piece, turning elite as you near the end, and a boss group holds the last one. Every completed run makes the next one longer and harder, and each level of depth is worth one skill point.</p>
        <p class="sub">Skill points</p>
        <p class="body">They buy the only permanent upgrades in the game: max life, weapon drop level, boon drop chance, the chance to locate missions, and the cap on modifiers a mission can carry. The tree is small on purpose. Its job is to attach long-term progression to the part of the game that a lucky build cannot cheese.</p>
      `
        },
        {
          id: "bnote-vs-progress",
          after: ["bnote-vs-board", "bnote-vs-deeper"],
          name: "Two Progressions",
          sub: "What a run keeps",
          html: `
        <p class="tag">Signal · voidscape / progress</p>
        <h3>Two Progressions</h3>
        <figure class="clipbox">
          <img class="clip" src="media/voidscape/skilltree.webp" alt="The skill tree: five rows of plus and minus buttons for max life, chance to locate paths, item drop level, boon drop chance and maximum path mods" width="1600" height="978" loading="lazy">
          <figcaption>The skill tree. Five upgrades, paid only with special runs.</figcaption>
        </figure>
        <p class="sub">One run, or forever</p>
        <p class="body">Two kinds of progression run through a save, and they last different lengths of time. Boons last one run. They are by far the strongest modifiers in the game, and they are gone when you die. Weapons and the skill tree last forever. A gun you build stays in the inventory across runs, with its layouts saved, and skill points never expire. Those two are what make it a roguelike rather than a series of unrelated attempts.</p>
        <p class="sub">Built to need each other</p>
        <p class="body">Most boons are flat numbers, not multipliers: +50 physical damage, +10 fire, +1% freeze chance. A boon is only as good as the gun that scales it, and +10 fire damage is worth nothing on a gun that never sets anything alight. So the long game is keeping a spread of guns in the inventory, so that whatever a run rolls, there is a weapon that turns those boons into something.</p>
      `
        },
        {
          id: "bnote-vs-boons",
          after: ["bnote-vs-board", "bnote-vs-deeper"],
          name: "The Boons",
          sub: "Fifty-odd, and most of them cost something",
          html: `
        <p class="tag">Signal · voidscape / boons</p>
        <h3>The Boons</h3>
        <figure class="clipbox">
          <video class="clip" src="media/voidscape/boons.mp4" poster="media/voidscape/boons.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>A boon offer after a fight. Take it, turn it down for 10 health, or pay gun parts to reroll.</figcaption>
        </figure>
        <p class="sub">Trades</p>
        <p class="body">Boons are weighted by rarity and stack for the rest of the run. One you take or refuse leaves the pool, so a run never sees the same offer twice.</p>
        <p class="body">The flat upgrades exist, but the interesting half are trades. Lose 20 max health for +10 fire damage. Shrink your explosion radius by 90% to double its damage. Deal all your poison damage instantly, at half value. Halve your bullet speed for +50 physical.</p>
        <p class="sub">The ones that change the gun</p>
        <p class="body">Ricochet force doubles on every bounce. Ricochets home onto poisoned enemies. Every bounce spawns a cold shot. Enemies killed by cold burst into eight more. Fire bullets survive their own explosion, or explode a second time a moment later, or pull instead of push. One turns being launched by your own fire blast into a speed buff, which makes shooting the floor to travel a legitimate build. Elements are not separate lanes, so builds collide in ways I never wrote down.</p>
      `
        },
        {
          id: "bnote-vs-bench",
          after: ["bnote-vs-progress", "bnote-vs-boons"],
          name: "The Bench",
          sub: "Weapons are rolled, not designed",
          html: `
        <p class="tag">Signal · voidscape / bench</p>
        <h3>The Bench</h3>
        <figure class="clipbox">
          <img class="clip" src="media/voidscape/shop.webp" alt="Shop screen for a rolled machinegun: base stats and four rolled mods" width="1482" height="988" loading="lazy">
          <figcaption>A rolled machinegun in the shop. Base stats on the left, one rolled mod per row.</figcaption>
        </figure>
        <p class="sub">Generated, not designed</p>
        <p class="body">A gun rolls a base type, a level and a set of modifiers. There are four base types, basic, shotgun, machine gun and sniper, each with an elemental variant in physical, fire, cold and poison. The sniper round leaves at twice the speed of anything else and bounces ten times.</p>
        <p class="body">Modifiers come in three grades: interior for damage, exterior for handling, and special for the build-defining effects like ignite chance, freeze chance, double damage and bleeding. Each grade has a weight that drops by half when it lands and to nothing the second time, so a gun carries at most two of any grade and comes out mixed instead of stacking five of the same thing. Specials start at a hundredth of the weight of the others, which keeps them rare without a hard cap.</p>
        <figure class="clipbox">
          <video class="clip" src="media/voidscape/crafting.mp4" poster="media/voidscape/crafting.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>Adding, removing, and scrapping mods at the bench.</figcaption>
        </figure>
        <p class="sub">Crafting</p>
        <p class="body">Gun parts drop from enemies and pay for adding mods, removing them, or scrapping a weapon outright. Adding costs the weapon's level times its mod count, and the bench raises its price every time you use it, so pushing a good gun further costs progressively more. Scrapping refunds twice the base price of a mod, so a near miss is worth real money if you break it down instead.</p>
        <p class="body">Four weapon slots and eight saved layouts persist between runs. Building a gun is a decision with consequences past the session.</p>
      `
        },
        {
          id: "bnote-vs-map",
          after: ["bnote-vs-progress", "bnote-vs-boons"],
          name: "The Map",
          sub: "It only goes up",
          html: `
        <p class="tag">Signal · voidscape / map</p>
        <h3>The Map</h3>
        <figure class="clipbox">
          <img class="clip" src="media/voidscape/room.webp" alt="A generated room with catwalks and railings over a lower floor" width="1600" height="904" loading="lazy">
          <figcaption>One generated room. Catwalks and drops give the dashes somewhere to go.</figcaption>
        </figure>
        <p class="sub">Always up</p>
        <p class="body">Every step of a run climbs: a flight of stairs, a corridor, a room, joined doorway to doorway. A mission is ten to twenty main rooms plus whatever depth the modifiers add, and the last room is always the boss.</p>
        <p class="body">Because the path only ever goes up, the space around a new room is almost always empty, and that is what gives the generator its freedom. Tiles that were never designed to sit next to each other can be chained anyway, because nothing occupies the space they need. There is an overlap check, but it rarely has to say no, and when a layout fails ten times the whole level is thrown away and rolled again.</p>
        <p class="body">Spare doorways grow side rooms: encounters, specials, and a rotating set of shops and reward rooms, with a symbol on the door saying which.</p>
        <p class="sub">Finding your way</p>
        <p class="body">Generated rooms can all look the same, and getting lost was one of the first problems players hit. Two rules fix it. Up is always forward, so the next room is wherever the stairs are. And every room is lit white until you complete it, then its lights turn red. At a glance you know where you have been and where you have not.</p>
      `
        },
        {
          id: "bnote-vs-rooms",
          after: ["bnote-vs-bench", "bnote-vs-map"],
          name: "The Rooms",
          sub: "Every room has versions",
          html: `
        <p class="tag">Signal · voidscape / rooms</p>
        <h3>The Rooms</h3>
        <figure class="clipbox">
          <img class="clip" src="media/voidscape/enemy.webp" alt="Mid-fight in a generated corridor, a red enemy taking hits" width="1600" height="986" loading="lazy">
          <figcaption>Mid-fight in a generated corridor.</figcaption>
        </figure>
        <p class="sub">Versions</p>
        <p class="body">Every room carries optional pieces that each roll their own chance to exist, so the same room comes back different. The trapped versions matter most: laser beams that sweep the floor, spikes with a short warning, blast plates, lava that rises while you fight. In a game where movement is the best defence, a trap forces you to plan your movement instead of spending it, which makes an encounter genuinely hard without making a single enemy stronger. A few of those variants roll so rarely that finding them takes many runs.</p>
        <p class="sub">Things floating about</p>
        <p class="body">Rooms are also full of floating objects, drifting and spinning at random, and some of them matter. Canisters detonate when a bullet touches them and set off their neighbours. Medkits drift past the walkway. The point is rarity: something useful can turn up anywhere, so even an empty room with nothing to fight is worth a look.</p>
      `
        },
        {
          id: "bnote-vs-feel",
          after: ["bnote-vs-bench", "bnote-vs-map"],
          name: "The Feel",
          sub: "Movement, shooting, camera",
          html: `
        <p class="tag">Signal · voidscape / feel</p>
        <h3>The Feel</h3>
        <p class="sub">Movement</p>
        <p class="body">Movement is snappy and forgiving, and most of the work is in the small things. Coyote time and jump buffering, so inputs land when the player means them. Three separate ground checks, so a landing never gets missed. Gravity that triples past the apex of a jump, which makes it feel heavier without cutting its height. A side dash that cuts gravity and makes you invulnerable while it lasts, plus one air dash per landing. Input direction locks after a jump or dash until you press the opposite key, so momentum carries instead of letting you steer mid-air. Enemy hits and explosions apply real knockback through a mass-weighted impact vector.</p>
        <p class="sub">Shooting and the camera</p>
        <p class="body">Bullets are physics bodies that bounce. A sniper round leaves at 5000 units a second and ricochets ten times, and boons can double the bounce force on every hit. Keeping that stable when stats go extreme, so nothing falls apart or feels wrong at the top end, took longer than any other system in the game. Every enemy has a floor on how fast it can act, so speed modifiers push right up to the edge and no further.</p>
        <p class="body">The camera alone took weeks. Mouse look runs through framerate-independent exponential smoothing, so it feels the same at 60 and at 240 frames a second.</p>
      `
        },
        {
          id: "bnote-vs-ledger",
          after: ["bnote-vs-rooms", "bnote-vs-feel"],
          name: "The Ledger",
          sub: "What it cost, where it stands",
          html: `
        <p class="tag">Signal · voidscape / ledger</p>
        <h3>The Ledger</h3>
        <figure class="clipbox">
          <video class="clip" src="media/voidscape/run.mp4" poster="media/voidscape/run.jpg" muted loop playsinline preload="none" controls></video>
          <figcaption>One full run on a short mission, from the hub out and back. 1:43, uncut.</figcaption>
        </figure>
        <p class="sub">What it cost</p>
        <p class="body">Fifty interacting boons on top of rolled weapons and rolled missions means the combination space is not testable by hand. Most of the work was not writing mechanics. It was making them compose without producing states I never anticipated, and accepting that some of those states are the reason the game is worth playing. A fire build inside a mission that rolled fire immunity is a problem nobody authored, and the player has to solve it with what they brought.</p>
        <p class="body">This was my first project, and I wrote it without AI tools.</p>
        <p class="sub">Where it stands</p>
        <p class="body">Playable through two bosses. The generators are all in place, missions, weapons, mods, boons, rooms, and what is missing is content volume rather than architecture. Adding a modifier means adding a row to a table. Adding a room means adding a prefab. That was the point of building it this way.</p>
        <p class="body"><a href="https://sebastianfreitas.itch.io/voidscape-prototype">Download the prototype on itch.io →</a></p>
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
          after: ["bnote-rex-surface"],
          at: [371857, 0.25],
          name: "The Bone Spire",
          sub: "Kingdom of the dragons",
          html: `
        <p class="tag">Rex · surface / bone spire</p>
        <h3>The Bone Spire</h3>
        <p class="body">The dragons' kingdom is built on a tower made from the bones of dragons. As time passes more are added, and the Spire grows.</p>
        <p class="body">No two dragons share a shape. Each gives its endless life to one purpose, and body and mind reshape around it. One that sought a cure for a plague becomes that cure, and its touch can heal. Most purposes are unattainable, and that is the point: a dragon that masters its purpose is a dead dragon.</p>
      `
        },
        {
          id: "bnote-rex-titans",
          after: ["bnote-rex-under"],
          at: [379543, 0.18],
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
          at: [334257, 0.40],
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
    },
    // The Void beacon opens the peoples that live in it: the Nephilim, the Administration and the Void Vikings.
    {
      root: "bnote-void",
      par: 0.94,
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
          id: "bnote-bridge-nephilim",
          after: ["bnote-void"],
          at: [45357, 0.40],
          name: "The Nephilim",
          sub: "Be not afraid",
          html: `
        <p class="tag">Void · nephilim</p>
        <h3>The Nephilim</h3>
        <p class="body">Born of a forbidden union between angels and the influence of Obox-ob. Heaven's beauty, turned. They do not plan; they happen, and only the 3rd Warlock holds them back from the MainLand. Placeholder — lore to come.</p>
      `
        },
        {
          id: "bnote-bridge-admin",
          after: ["bnote-void"],
          at: [128000, 0.34],
          name: "The Administration",
          sub: "The tear is the only proof",
          html: `
        <p class="tag">Void · administration</p>
        <h3>The Administration</h3>
        <p class="body">A council of eldritch beings, perhaps older than soulkind, that set out to order the chaos of the void and give time a meaning. Their enforcers are the Colors. When an Old One descends, the hole it leaves is theirs to mend. Placeholder — lore to come.</p>
      `
        },
        {
          id: "bnote-bridge-vikings",
          after: ["bnote-void"],
          at: [292000, 0.30],
          name: "The Void Vikings",
          sub: "Reavers & Sentinels",
          html: `
        <p class="tag">Void · void vikings</p>
        <h3>The Void Vikings</h3>
        <p class="body">Two halves of one people descended from the Old Ones. The Reavers sail the void to the edge of their minds; the Sentinels stay, guard and remember. Placeholder — lore to come.</p>
      `
        }
      ]
    },
    // The Mainland beacon opens the factions that shape it, each pinned out in the empty space.
    {
      root: "bnote-land",
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
          id: "bnote-land-shattered",
          after: ["bnote-land"],
          at: [58400, 0.30],
          name: "The Shattered",
          sub: "Seek the unspoken",
          html: `
        <p class="tag">Runaways · The western fringe</p>
        <h3>The Shattered</h3>
        <p class="body">They were the Mainland's scholars, until one of them reached too deep into the chaos and something reached back. The affliction took the whole circle. Now the Mainland's forces hunt them as runaways.</p>
        <p class="body">They travel in stolen ships, on captured eldritch mounts and through portals torn open by ritual. The Abyssal Scholars still take notes. The Void Cultists pray to the dark. The Fragmented Minds came back remade, and they hear the Outsiders.</p>
      `
        },
        {
          id: "bnote-land-libertech",
          after: ["bnote-land"],
          at: [62300, 0.26],
          name: "LiberTech",
          sub: "Stars guide us",
          html: `
        <p class="tag">Starforgers · Founded by Elara Starshade</p>
        <h3>LiberTech</h3>
        <p class="body">Born among discarded tech and debris, they build Starcrafts that run on starlight and stubbornness, first to carry people away from the Sigil's dominion and now to explore the Far Realms.</p>
        <p class="body">Nothing is junk to them. They honour whoever built a machine and defend the machine itself: a conscious machine cannot be made to obey. Some are Technomorphs, rebuilt with their own salvage.</p>
      `
        },
        {
          id: "bnote-land-dawn",
          after: ["bnote-land"],
          at: [65800, 0.20],
          name: "The Sigil of the First Dawn",
          sub: "Mordrial's vision guides",
          html: `
        <p class="tag">Nobility · Followers of Mordrial the Fallen</p>
        <h3>The Sigil of the First Dawn</h3>
        <p class="body">The Mainland's oldest money and deepest arcana. They revere the first warlock, who froze the elder evils in time and space, and they rule the greatest metropolis known, home to a quindecillion souls.</p>
        <p class="body">Their galleons sail the ethereal winds on sails that drink magic and demand sacrifice. Serve them well and you may rise until you are demon-born, strong enough to fight the demon-born yourself.</p>
      `
        },
        {
          id: "bnote-land-accord",
          after: ["bnote-land"],
          at: [73400, 0.22],
          name: "The Divine Accord",
          sub: "In life's embrace, we find strength",
          html: `
        <p class="tag">Pacifists · Warden: Aelius Luxent, the Third Warlock</p>
        <h3>The Divine Accord</h3>
        <p class="body">The left hand of Mordrial chose the slow road. His peers took their power from darkness; Aelius took his from faith in something greater, and became the first cleric.</p>
        <p class="body">The Accord heals, shelters and feeds whoever needs it. Its scripture, the Luminous Path, teaches that even the Five were born of flesh, and that the power to sustain life lives in everyone.</p>
      `
        },
        {
          id: "bnote-land-gore",
          after: ["bnote-land"],
          at: [77900, 0.30],
          name: "The Gore-Engine Legion",
          sub: "Destruction before creation",
          html: `
        <p class="tag">War-machines · Architect: Velindra, the Fourth Warlock</p>
        <h3>The Gore-Engine Legion</h3>
        <p class="body">Velindra forced a pact on the Queen of Chaos and fused the demon's corrupted arcana with cold machinery. Her twisted spires rise in the corners of the Mainland.</p>
        <p class="body">From them walk the war-machines that stalk its battlefields, and the hulls of the Harrowhammer Armada. Her creed is controlled chaos: destruction must come before creation.</p>
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
            from: a || cluster.root,
            after: node.after,
            dx: dx,
            dy: dy,
            theme: cluster.theme,
            size: size,
            par: cluster.par,
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
