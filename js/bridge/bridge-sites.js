/* The places that bend the instruments. SITES is the physics: what each
   place does to the environment model in bridge-env.js. lines() is the
   copy: what the readout says while the ship sits in one. One entry per
   place so a place can be tuned in one screen. */
(() => {
  "use strict";

  const SITES = [
    { id: "nephilim", name: "The Nephilim", gate: "bnote-bridge-nephilim", x: 45357, r: 2600,
      f: { chaos: 0.75, nomic: 1, wear: 0, jitter: 0.12, sway: 0.25, rad: 0.12, contained: 0.7, g: 1, rho: 0.4 }, tag: "Σ 0.000" },
    { id: "shattered", name: "The Shattered", gate: "bnote-land-shattered", x: 58400, r: 2400,
      f: { chaos: 0.95, nomic: 0.3, wear: 0.7, jitter: 0.8, glare: 0.1, rad: 0.45, heat: 0.1 }, tag: "FRACTURE" },
    { id: "libertech", name: "LiberTech", gate: "bnote-land-libertech", x: 62300, r: 2200,
      f: { chaos: 0, jitter: 0, link: 1 }, tag: "UPLINK" },
    { id: "dawn", name: "The Sigil of the First Dawn", gate: "bnote-land-dawn", x: 65800, r: 2200,
      f: { chaos: 0, nomic: 1, contained: 1, jitter: 0, sway: 0, wear: 0 }, tag: "BOUNDED" },
    { id: "accord", name: "The Divine Accord", gate: "bnote-land-accord", x: 73400, r: 2400,
      f: { chaos: 0, nomic: 0.8, wear: -1, contained: 1, jitter: 0, sway: 0, glare: 0.2, rad: 0 }, tag: "RESTORING" },
    { id: "gore", name: "The Gore-Engine Legion", gate: "bnote-land-gore", x: 77900, r: 2600,
      f: { chaos: 0.8, nomic: 0.85, wear: 0.8, jitter: 0.7, sway: 0.5, rad: 0.6, heat: 0.3 }, tag: "SPASM",
      osc: { field: "jitter", period: 2.2, lo: 0.35, hi: 1, shape: "burst" } },
    { id: "admin", name: "The Administration", gate: "bnote-bridge-admin", x: 128000, r: 3200,
      f: { chaos: 1, nomic: 1, wear: 1, jitter: 1, sway: 0.8, glare: 0.5, rad: 0.9, heat: 0.4, rho: 0 },
      tags: ["UNDEFINED", "P < 0", "g < 0", "t < 0", "Σ ≠ Σ"], tagPeriod: 3.6,
      osc: { field: "g", period: 3.6, lo: -0.6, hi: 2.4, shape: "square" } },
    { id: "vikings", name: "The Void Vikings", gate: "bnote-bridge-vikings", x: 292000, r: 3000,
      f: { chaos: 0, nomic: 0.9, wear: -0.2, jitter: 0, sway: 0.35, contained: 0.85, g: 1, rho: 0.6 }, tag: "COHERENT" },
    { id: "watcher", name: "The Watcher", gate: "", x: 336000, r: 9000,
      f: { chaos: 1, glare: 0.8, wear: 0.3, jitter: 0.6, rad: 0.3 }, tag: "OVEREXPOSED" },
    { id: "redstar", name: "The Red Star", gate: "bnote-watcher-redstar", x: 334257, r: 6000,
      f: { glare: 0.95, nomic: 0.7, wear: 0.35, jitter: 0.3, rad: 0.4 }, tag: "LENSED" },
    { id: "firstlight", name: "The Kingdom of First Light", gate: "bnote-rex-firstlight", x: 357516, r: 3600,
      f: { chaos: 0, nomic: 0, wear: 0, jitter: 0, sway: 0, glare: 0, rad: 0, heat: 0, contained: 0, g: 1.3, rho: 1.1 }, tag: "SCREENED" },
    { id: "crimson", name: "The Crimson Court", gate: "bnote-rex-crimson", x: 364204, r: 3600,
      f: { nomic: 0.55, rho: 2.2, glare: 0.45, jitter: 0.1, wear: 0.1, g: 1.3 }, tag: "DENSE AIR" },
    { id: "bonespire", name: "The Bone Spire", gate: "bnote-rex-bonespire", x: 371462, r: 3600,
      f: { chaos: 1, nomic: 1, jitter: 0.9, sway: 0.9, rad: 0.5, heat: 0.4 }, tag: "CONTESTED",
      osc: { field: "wear", period: 1.6, lo: -1, hi: 1, shape: "sine" } },
    { id: "titans", name: "The Kingdom of Titans", gate: "bnote-rex-titans", x: 378900, r: 3600,
      f: { chaos: 0, nomic: 0.05, wear: -0.05, jitter: 0, sway: 0, glare: 0, rad: 0, heat: 0 }, tag: "QUIET" },
    { id: "hell", name: "Hell", gate: "", x: 389700, r: 7200,
      f: { chaos: 0.3, nomic: 0.7, wear: 0.75, jitter: 0.35, sway: 0.3, glare: 0.15, rad: 0.7, heat: 0.8, g: 1.3, rho: 1.4 }, tag: "CORROSIVE" },
    { id: "valkhar", name: "The Lost City of Valkhar", gate: "bnote-rex-valkhar", x: 386879, r: 3000,
      f: { chaos: 0.15, nomic: 0.8, wear: 0.6, jitter: 0.1, sway: 0.1, rad: 0.6, heat: 0.7 }, tag: "RESIDUAL HOLD" },
    { id: "law", name: "The City of Law", gate: "bnote-rex-law", x: 394368, r: 3000,
      f: { chaos: 0, nomic: 1, contained: 1, jitter: 0, sway: 0, wear: 0, rad: 0.1, heat: 0.3, frozen: 1, glare: 0 }, tag: "INVARIANT" },
    { id: "root", name: "The Root", gate: "", ramp: [398000, 430000],
      f: { chaos: 0, nomic: 1, wear: 0.9, jitter: 0, sway: 1, rad: 0.8, heat: 0.5, glare: 0.2, frozen: 0, contained: 0 }, tag: "SATURATED" },
  ];

  /* the four games. r 33000 so neighbouring fields meet halfway (planets are 66000 apart);
     each osc list is the game's own rhythm, timed so the lamps actually light
     (a warn needs 2.2 s, an err 0.9 s of dwell in instruments.js) */
  const GD_SITES = [
    { id: "zero", name: "Sector Zero", gate: "", x: 60000, r: 33000,
      f: { chaos: 0.55, jitter: 0.6, rad: 0.2, glare: 0.25, sway: 0.15, link: 1, g: 1, rho: 1 },
      tags: ["STORM CELL", "G RELEASED", "CLOCK +14 Y", "REALITY.TXT"], tagPeriod: 4,
      osc: [
        { field: "chaos", period: 14, lo: 0.45, hi: 0.95, shape: "pulse", duty: 0.22 },              // thunder rolls a strength: the signal tile goes red for 3 s
        { field: "g", period: 14, lo: 1, hi: 0, shape: "pulse", duty: 0.12, phase: 0.88 },          // the losers drop their gravity: G reads 0, NAV lights
        { field: "glare", period: 14, lo: 0.25, hi: 0.9, shape: "pulse", duty: 0.05, phase: 0.97 }, // lightning washes the radar
      ] },
    { id: "voidscape", name: "VoidScape", gate: "", x: 126000, r: 33000,
      f: { heat: 1, wear: 0.45, nomic: 0.62, rad: 0.32, jitter: 0.25, sway: 0.2, g: 1.05, rho: 1.3 },
      tags: ["FURNACE", "ONLY UP", "DEPTH +1", "REROLL ×3"], tagPeriod: 3.4,
      osc: [
        { field: "heat", period: 9, lo: 0.7, hi: 1, shape: "sine" },                                // heat waves off the ground
        { field: "wear", period: 13, lo: 0.3, hi: 0.72, shape: "pulse", duty: 0.3 },                // the run ages the hull: STRESS goes red for 4 s
        { field: "nomic", period: 6.5, lo: 0.5, hi: 0.75, shape: "square" },                        // the table rerolls: comb lines step
      ] },
    { id: "heavylight", name: "HeavyLight", gate: "", x: 192000, r: 33000,
      f: { glare: 0.3, nomic: 0.42, contained: 1, g: 1, rho: 0.9, frozen: 0.35 },
      tags: ["LAMP CYCLE", "G 1.60 ON BEAT", "PUSHES · NO PULL", "ROOM 20/20"], tagPeriod: 3.6,
      osc: [
        { field: "g", period: 7.2, lo: 1, hi: 1.6, shape: "square" },                                // the beam is on: light has weight
        { field: "glare", period: 7.2, lo: 0.15, hi: 0.62, shape: "square" },                        // the lamp washes the sweep while on
        { field: "rho", period: 7.2, lo: 0.9, hi: 1.4, shape: "square" },                            // light pressure: the medium reads denser
      ] },
    { id: "conclusus", name: "Conclusus", gate: "", x: 258000, r: 33000,
      f: { g: 0.85, rho: 0.75, jitter: 0, echo: 1, twin: 1, frozen: 0.5, nomic: 0.3, contained: 1 },
      tags: ["ECHO ×2", "SHADOW 1.20 S", "88 PINS", "SECOND HULL"], tagPeriod: 3.6,
      osc: [
        { field: "sway", period: 2.4, lo: 0, hi: 0.5, shape: "square" },                              // the silhouettes switch: the bus sags on the beat
        { field: "twin", period: 2.4, lo: 1, hi: 0.35, shape: "square", phase: 0.5 },                 // the second contact blinks in antiphase
      ] },
  ];

  function lines(S, h) {
    const { rnd, rint, f0, f1, f2, fmt, pickOne } = h;
    return {
      nephilim: {
        p: { warn: 0.3, err: 0.1, crit: 0 },
        read: [
          () => `three fields ranged · incoherent ${f2(0.7, 0.8)} · coherent ${f2(0.96, 1)} · sum 0.000`,
          () => `gravity ${f2(0.98, 1.02)}g · three sources · one resultant`,
          () => `dose ${f2(0.4, 0.9)} µsv/h · three spectra · cancelling`,
          () => `pressure ${f1(101.1, 101.5)} kpa · rh ${f0(40, 44)}% · habitable by cancellation`,
          () => `strain ${rint(20, 60)} µε · hull unloaded · three loads applied`,
        ],
        warn: [
          () => `resultant ${f2(0.001, 0.02)} · balance drifting · restored in ${f1(0.2, 1.4)}s`,
          () => `field vectors rotated ${rint(1, 9)}° · sum still 0.000`,
        ],
        err: [
          () => `cancellation lapsed ${rint(40, 300)} ms · every instrument railed · recovered`,
          () => `gravity ${f1(3, 12)}g for ${rint(20, 140)} ms · then 1.00g · sum restored`,
        ],
        crit: [],
      },
      shattered: {
        p: { warn: 0.4, err: 0.2, crit: 0.06 },
        read: [
          () => `incoherent ${f2(0.9, 1)} · range finder ${rint(3, 9)} answers per sweep`,
          () => `structure ranged ${fmt(rint(300, 900))} m · ${rint(2, 6)} of its faces face this hull`,
          () => `pressure ${f1(90, 101)} kpa · barometer ${rint(2, 8)}x reset this minute`,
          () => `strain ${fmt(rint(600, 1900))} µε · load with no source`,
        ],
        warn: [
          () => `gravity ${f1(1.4, 3.8)}g pocket · ${rint(2, 30)} m across · moving`,
          () => `dose ${f0(60, 300)} µsv/h · from the fracture · rising`,
          () => `field ${rint(300, 2200)} µt · sign flipping ${rint(2, 9)}x/s`,
        ],
        err: [
          () => `lidar returns before emission · ${rint(2, 7)} sweeps`,
          () => `hull ${f0(-90, -40)}°c and ${f0(40, 120)}°c · same plate · same second`,
        ],
        crit: [
          { t: () => `impact ${f2(1.2, 4)}g · debris from a structure that is still standing`,
            label: "plating breach", sev: 0.5 },
          { t: () => `strain ${fmt(rint(8000, 16000))} µε · frame past yield · no load found`,
            label: "frame deformation", sev: 0.6 },
        ],
      },
      libertech: {
        p: { warn: 0, err: 0, crit: 0 },
        read: [
          () => `uplink ${f1(12, 48)} kb/s · handshake ${rint(94, 100)}% · reciprocal`,
          () => `${rint(120, 900)} packets in · ${rint(120, 900)} out · checksum clean`,
          () => `their clock ${f1(0.2, 4)} ms from ours · agreed on port time`,
          () => `gravity 1.00g · rh ${f0(38, 46)}% · lane clean`,
          () => `chart delta received · ${rint(3, 40)} corrections · applied`,
          () => `dose ${f2(0.08, 0.16)} µsv/h · background · confirmed by the tower`,
        ],
        warn: [],
        err: [],
        crit: [],
      },
      dawn: {
        p: { warn: 0.15, err: 0, crit: 0 },
        read: [
          () => `coherent ${f2(0.96, 1)} · bounded · leak ${rnd(0, 0.004).toFixed(4)}`,
          () => `field edge ranged at ${fmt(rint(400, 1400))} m · ${f1(0.2, 1.8)} m thick · no gradient outside`,
          () => `gravity 1.00g · ${f2(0.998, 1.002)} inside the bound · same`,
          () => `constants nominal to ${rint(6, 9)} decimals · inside a field that should move them`,
          () => `strain ${rint(20, 70)} µε · hull unloaded`,
        ],
        warn: [
          () => `bound flexed ${f1(0.4, 3)} m · reading inside ${f2(0.99, 1.01)} · restored`,
          () => `coherent source ranged · ${fmt(rint(200, 900))}x this hull's rating · contained`,
        ],
        err: [],
        crit: [],
      },
      accord: {
        p: { warn: 0, err: 0, crit: 0 },
        read: [
          () => `hull integrity ${rint(96, 100)}% · climbing · ${rint(2, 6)} sectors rewritten to spec`,
          () => `fatigue log reset · cycles counted ${fmt(rint(4000, 20000))} · cycles found 0`,
          () => `coherent ${f2(0.7, 0.85)} · sign positive · applied to this hull`,
          () => `dose ${f2(0.01, 0.04)} µsv/h · below background · below the detector`,
          () => `cabin ${f1(21, 21.4)}°c · rh 42% · every reading centred in spec`,
          () => `paint restored on ${rint(1, 8)} plates · no work order`,
          () => `strain 0 µε · hull unloaded · at 1.00g`,
        ],
        warn: [],
        err: [],
        crit: [],
      },
      gore: {
        p: { warn: 0.42, err: 0.24, crit: 0.09 },
        read: [
          () => `incoherent ${f2(0.7, 0.9)} · coherent ${f2(0.8, 0.9)} · sign negative · both loaded`,
          () => `engine count ${rint(40, 400)} · none idling · exhaust ${f0(600, 1400)}°c`,
          () => `dose ${f1(3, 9)} µsv/h · spiking · ${rint(2, 9)} bursts/min`,
          () => `pressure ${f1(96, 104)} kpa · ${rint(3, 9)} kpa swings in ${rint(80, 400)} ms`,
        ],
        warn: [
          () => `gravity ${f1(1.4, 4)}g for ${rint(60, 400)} ms · then 1.00g · ${rint(2, 9)} events/min`,
          () => `strain ${fmt(rint(1200, 3000))} µε · sector ${rint(1, 8)} · impulse · no contact`,
          () => `field ${fmt(rint(800, 6000))} µt · polarity reversed for ${rint(20, 300)} ms`,
        ],
        err: [
          () => `hull ${f0(60, 240)}°c in sector ${rint(1, 8)} · ${rint(40, 300)} ms · no source ranged`,
          () => `time base skipped ${rint(20, 900)} ms · the counters disagree`,
          () => `mass ${fmt(rint(2000, 9000))} kg ranged at ${fmt(rint(200, 900))} m · then none`,
        ],
        crit: [
          { t: () => `impact ${f2(1.4, 5)}g · projectile ${rint(2, 40)} mm · engine debris`,
            label: "plating breach", sev: 0.5 },
          { t: () => `dose ${fmt(rint(9000, 30000))} µsv/h · ${f1(0.2, 1.5)}s burst · shield ${rint(40, 80)}%`,
            label: "shielding burn-through", sev: 0.45 },
          { t: () => `strain ${fmt(rint(9000, 20000))} µε · sector ${rint(1, 8)} · frame past yield`,
            label: "frame deformation", sev: 0.6 },
        ],
      },
      admin: {
        p: { warn: 0.4, err: 0.3, crit: 0.12 },
        read: [
          () => `pressure ${f1(-40, -3)} kpa · barometer below zero · reads it anyway`,
          () => `gravity ${f2(-1.4, -0.2)}g · toward the tear · then away · then both`,
          () => `dose reads ${fmt(rint(400, 9000))} µsv/h · dosimeter reports 0 · both logged`,
          () => `clock ${f1(-40, -2)}s · counting down · fleet time unreachable`,
          () => `hull mass ${fmt(rint(1200, 9000))} kg · was ${fmt(rint(9000, 14000))} at dock`,
        ],
        warn: [
          () => `strain ${fmt(rint(2000, 4000))} µε · plate ${rint(1, 8)} · reading its own shape wrong`,
          () => `lidar to the tear · ${fmt(rint(100, 900))} m · then ${fmt(rint(20, 90))} km · same sweep`,
          () => `o2 ${f1(19, 20)}% · cabin sealed · consumed by nothing aboard`,
        ],
        err: [
          () => `hull ${f0(-200, -80)}°c · sensor reports the number is wrong · number stands`,
          () => `sector ${rint(1, 8)} reports two plates · manifest says one`,
          () => `sweep returned ${rint(2, 9)} of this hull · bearings differ · all correct`,
          () => `field ∞ µt · magnetometer reads its own coil`,
        ],
        crit: [
          { t: () => `hull corrosion ${rint(3, 14)} mm/min · plate ${rint(1, 8)} · alloy reads older`,
            label: "hull corrosion", sev: 0.7 },
          { t: () => `seam ${rint(1, 8)} opened ${f1(0.2, 3)} mm · welds intact · gap present`,
            label: "weld seam split", sev: 0.6 },
          { t: () => `frame ${f1(0.2, 2.4)}° out of true · no load · no event`,
            label: "frame deformation", sev: 0.65 },
        ],
      },
      vikings: {
        p: { warn: 0.12, err: 0, crit: 0 },
        read: [
          () => `coherent ${f2(0.85, 0.95)} · sign positive · outside rating · no strain`,
          () => `medium density ${f2(0.5, 0.7)} · moving ${f1(2, 9)} m/s · laminar every turn`,
          () => `gravity ${f2(0.8, 1.2)}g · assisting · gradient follows the course`,
          () => `star field ${rint(40, 90)} points · fixed · charted nowhere`,
          () => `hull ${f1(-20, -4)}°c · warmer than the model · warmer than the medium`,
          () => `strain ${rint(0, 20)} µε · under a load the frame should feel`,
        ],
        warn: [
          () => `course change · gravity ${f2(1.2, 1.5)}g · in the direction chosen · then 1.00g`,
          () => `coherent source ranged · ${fmt(rint(400, 2000))}x rating · uninterested`,
        ],
        err: [],
        crit: [],
      },
      redstar: {
        p: { warn: 0.3, err: 0.18, crit: 0.05 },
        read: [
          () => `optics ${rint(70, 96)}% washed · red across every band · no red source`,
          () => `range to star ${fmt(rint(20, 90))} km · ${fmt(rint(900, 4000))} km · same sweep · bent`,
          () => `coherent ${f2(0.6, 0.75)} · sign negative · weak at this range`,
          () => `dose ${f1(1, 4)} µsv/h · photons that do not arrive in order`,
        ],
        warn: [
          () => `image doubled · ${rint(2, 5)} stars at one bearing`,
          () => `hull ${f0(40, 120)}°c sunward · no sun ranged`,
          () => `strain ${fmt(rint(800, 2000))} µε · light pressure · from a star reading 0 lux`,
        ],
        err: [
          () => `star ranged behind this hull · and ahead · one star`,
          () => `camera ${rint(1, 4)} reports the star is looking back`,
        ],
        crit: [
          { t: () => `antenna array cooked · ${f0(300, 900)}°c · in the shade`,
            label: "antenna array cooked", sev: 0.55 },
        ],
      },
      firstlight: {
        p: { warn: 0, err: 0, crit: 0 },
        read: [
          () => `incoherent 0.00 · coherent 0.00 · inside a place that should read high`,
          () => `gravity 1.30g · gradient flat · dose ${f2(0.4, 0.8)} µsv/h · shielded`,
          () => `every instrument nominal · every instrument agrees`,
          () => `constants nominal to ${rint(8, 11)} decimals · the wall holds them`,
          () => `strain ${rint(60, 140)} µε · loaded · in spec`,
          () => `cabin ${f1(21, 21.3)}°c · rh 41% · quiet`,
        ],
        warn: [],
        err: [],
        crit: [],
      },
      crimson: {
        p: { warn: 0.25, err: 0.1, crit: 0 },
        read: [
          () => `medium density ${f2(2, 2.4)} · pressure ${f1(88, 97)} kpa · gravity 1.30g · unchanged`,
          () => `air ${f1(2.1, 2.3)}x model mass · same composition · same gravity`,
          () => `optics ${rint(30, 50)}% bent · range short by ${rint(4, 14)}% · corrected`,
          () => `coherent ${f2(0.5, 0.6)} · sign negative · steady`,
          () => `drag ${f1(2, 2.4)}x · airframe loaded · thrust margin held`,
        ],
        warn: [
          () => `image drifts ${f1(0.2, 1.4)}° · the court is not where the court is`,
          () => `medium density ${f2(2.6, 3.4)} · rising with proximity`,
        ],
        err: [
          () => `air mass ${f1(2.4, 3)}x · at 1.30g · pressure unchanged · the air is heavier and nothing else is`,
        ],
        crit: [],
      },
      bonespire: {
        p: { warn: 0.4, err: 0.3, crit: 0.15 },
        read: [
          () => `incoherent ${f2(0.95, 1)} · coherent ${f2(0.95, 1)} · both railed · opposed`,
          () => `hull integrity ${rint(70, 99)}% · ${rint(70, 99)}% · ${rint(70, 99)}% · three samples · one second`,
          () => `constants moving ${rint(2, 9)}x/s · returning · moving`,
          () => `dose ${f1(2, 8)} µsv/h · gravity ${f1(0.9, 1.8)}g · both changing sign of gradient`,
        ],
        warn: [
          () => `sector ${rint(1, 8)} plate ${f1(0.2, 2)} mm thinner · then thicker · net 0`,
          () => `strain ${fmt(rint(1500, 3500))} µε · reversing at ${f1(0.4, 1.2)} hz`,
          () => `field ${fmt(rint(1000, 9000))} µt · the spire · ${rint(2, 9)} poles`,
        ],
        err: [
          () => `hull sector ${rint(1, 8)} lost · sector ${rint(1, 8)} restored · same second`,
          () => `clock ran ${f1(1.2, 4)}x · then ${f2(0.2, 0.6)}x · fleet time drifting`,
          () => `pressure ${f1(60, 140)} kpa · cabin · no valve moved`,
        ],
        crit: [
          { t: () => `plate ${rint(1, 8)} dissolved ${rint(20, 80)}% · reforming · ${f1(1, 4)}s`,
            label: "plating breach", sev: 0.5 },
          { t: () => `frame ${f1(0.5, 3)}° out of true · returning · out of true`,
            label: "frame deformation", sev: 0.6 },
          { t: () => `seam ${rint(1, 8)} split ${f1(0.4, 3)} mm · closing · split`,
            label: "weld seam split", sev: 0.55 },
        ],
      },
      titans: {
        p: { warn: 0, err: 0, crit: 0 },
        read: [
          () => `gravity 1.30g · seismic ${f1(0.2, 0.8)} hz · slow · deep`,
          () => `cavern ranged ${fmt(rint(900, 4000))} m · ${rint(3, 9)} masses · all still`,
          () => `pressure ${f1(94, 98)} kpa · air ${f1(9, 16)}°c · still`,
          () => `dose ${f2(0.3, 0.6)} µsv/h · shielded by ${fmt(rint(400, 1400))} m of crust`,
          () => `incoherent 0.00 · coherent ${f2(0.02, 0.08)} · old · idle`,
          () => `strain ${rint(60, 140)} µε · loaded · resting`,
        ],
        warn: [],
        err: [],
        crit: [],
      },
      hell: {
        p: { warn: 0.4, err: 0.25, crit: 0.12 },
        read: [
          () => `coherent ${f2(0.65, 0.75)} · sign negative · applied to this hull`,
          () => `hull ${f0(90, 240)}°c · cabin ${f1(23, 27)}°c · heat with no radiant source`,
          () => `dose ${f1(4, 12)} µsv/h · from the ground · from the air · from the hull`,
          () => `alloy reads ${rint(3, 14)} years older than at dock · ${rint(20, 90)} minutes ago`,
          () => `pressure ${f1(92, 106)} kpa · gravity 1.30g · air ${rint(2, 9)}% sulphur`,
        ],
        warn: [
          () => `fatigue ${fmt(rint(2000, 9000))} cycles logged this minute · ${rint(0, 3)} loads applied`,
          () => `paint gone on ${rint(2, 8)} plates · oxide ${rint(20, 300)} µm · growing`,
          () => `seal ${rint(1, 8)} hardened · leak ${f2(0.02, 0.3)} kpa/min · reserve holds`,
        ],
        err: [
          () => `plate ${rint(1, 8)} ${f1(0.4, 2.4)} mm thinner than the last sweep · ${rint(2, 20)} min ago`,
          () => `o2 ${f1(18.8, 19.6)}% · consumed faster than aboard · by the air itself`,
          () => `bearing ${rint(1, 6)} seized · lubricant read as ${rint(40, 400)} years old`,
        ],
        crit: [
          { t: () => `corrosion ${rint(2, 9)} mm/min · plate ${rint(1, 8)} · alloy failing`,
            label: "hull corrosion", sev: 0.65 },
          { t: () => `eclss seal ${rint(1, 8)} perished · leak ${f1(1, 6)} kpa/min`,
            label: "eclss seal breach", sev: 0.7 },
          { t: () => `plate ${rint(1, 8)} flaked through · ${rint(3, 30)} mm`,
            label: "plating breach", sev: 0.5 },
        ],
      },
      valkhar: {
        p: { warn: 0.3, err: 0.15, crit: 0.06 },
        read: [
          () => `coherent ${f2(0.75, 0.85)} · sign negative · and a second source · sign positive · old`,
          () => `incoherent ${f2(0.1, 0.2)} · lower than the ground it stands on`,
          () => `hull ${f0(70, 160)}°c · dose ${f1(2, 6)} µsv/h · corrosive · slower here`,
          () => `streets ranged · ${rint(40, 300)} structures · ${rint(0, 3)} standing · all charted`,
          () => `residual hold ${f2(0.1, 0.25)} · holding`,
        ],
        warn: [
          () => `residual dropped to ${f2(0.02, 0.08)} · incoherent up ${rint(20, 90)}% · recovered in ${f1(0.4, 3)}s`,
          () => `fatigue ${fmt(rint(900, 4000))} cycles/min · half the rate outside`,
        ],
        err: [
          () => `structure ranged intact · then ranged as it is · same building`,
          () => `o2 ${f1(19, 19.8)}% · consumed by the air · slowed by the hold`,
        ],
        crit: [
          { t: () => `plate ${rint(1, 8)} corroded through · ${rint(2, 12)} mm · hold did not cover it`,
            label: "hull corrosion", sev: 0.55 },
        ],
      },
      law: {
        p: { warn: 0.1, err: 0, crit: 0 },
        read: [
          () => `coherent 1.00 · sign none · bounded · leak 0.0000`,
          () => `gravity 1.3000g · pressure 96.000 kpa · dose 0.4000 µsv/h · same as last sweep · to the digit`,
          () => `constants nominal to 12 decimals · noise floor 0 · every channel`,
          () => `${rint(200, 900)} sweeps · ${rint(200, 900)} identical returns`,
          () => `strain 100 µε · exactly · for ${rint(40, 300)} sweeps`,
          () => `hull ${f0(30, 40)}°c · steady to 0.000° · cabin 21.000°c`,
        ],
        warn: [
          () => `a reading moved · ${f2(0.001, 0.004)} · corrected by the city · not by us`,
          () => `coherent source ranged · ${fmt(rint(2000, 9000))}x rating · every channel flat`,
        ],
        err: [],
        crit: [],
      },
      zero: {
        p: { warn: 0.32, err: 0.14, crit: 0.03 },
        read: [
          () => `storm cell ranged · ${fmt(rint(20, 90))} km · rotating · ${rint(40, 140)} m/s at the wall`,
          () => `static -${rint(40, 90)} dbm across every band · one voice under it`,
          () => `terminal handshake ${rint(60, 99)}% · a station is answering · login off a note`,
          () => `${rint(12, 60)} objects ranged · ${rint(1, 11)} registered · the rest drift when the thunder rolls`,
          () => `thunder rolled ${rint(1, 6)} · ${rint(2, 9)} objects lost · ${rint(0, 2)} came back changed`,
          () => `chair · unregistered · ${f1(0.4, 2.6)} m/s · sliding · nobody in it`,
          () => `lantern ranged · condition poor · held ${rint(3, 11)} s · dark again`,
          () => `a record for us in the filesystem · brian.txt · weight ${rint(70, 140)} kg · we did not write it`,
          () => `dose ${f2(0.2, 0.5)} µsv/h · lightning ${rint(2, 20)}/min · charting the strikes`,
        ],
        warn: [
          () => `gust ${rint(80, 200)} m/s · hull ringing ${f1(2, 9)} hz`,
          () => `lightning ${fmt(rint(400, 2000))} m · optics ${rint(30, 70)}% washed`,
          () => `gravity released · ${f1(1.2, 2.4)} s · every loose mass drifting · the ship among them`,
          () => `blackout ${rint(80, 400)} ms · every object home · one moved · not ranged which`,
          () => `mail · ${rint(1, 4)} unread · sender not in the crew list`,
        ],
        err: [
          () => `the station's clock is ahead of ours · by ${rint(2, 40)} years`,
          () => `our record edited · height ${f2(2.5, 2.9)} m · reverted · budget -1`,
          () => `something shares the sweep · ${rint(1, 3)} contacts · none when the sweep returns`,
          () => `progress deleted at the terminal · ${rint(2, 14)} files · we were not typing`,
        ],
        crit: [
          { t: () => `thrown mass · ${rint(2, 20)} kg at ${rint(8, 30)} m/s · no thrower ranged`,
            label: "plating breach", sev: 0.4 },
        ],
      },
      voidscape: {
        p: { warn: 0.34, err: 0.14, crit: 0.04 },
        read: [
          () => `hull ${f0(120, 300)}°c · sunward · no sun · the ground is the source`,
          () => `coherent ${f2(0.5, 0.75)} · a table rolled below · every row raises the payout`,
          () => `dose ${f1(1, 4)} µsv/h · ${rint(3, 40)} boons ranged · unclaimed · each one costs something`,
          () => `${rint(2, 9)} exits ranged · ${rint(1, 3)} open · all lead up · up is forward`,
          () => `rooms lit white ${rint(4, 18)} · red ${rint(0, 9)} · the red ones are done`,
          () => `air ${f1(1.2, 1.6)}x · pressure unchanged · the heat has mass`,
          () => `${rint(20, 90)} objects adrift in the room below · ${rint(1, 6)} canisters · ${rint(0, 2)} medkits`,
          () => `mission board · ${rint(1, 4)} of ${rint(3, 6)} modifiers unknown · danger · error · unknown x`,
          () => `depth ${rint(1, 12)} · the path out is bridge pieces · ${rint(0, 3)} missing`,
        ],
        warn: [
          () => `heat ${f0(300, 700)}°c at ${fmt(rint(200, 900))} m · a wave · passing`,
          () => `fatigue ${fmt(rint(900, 4000))} cycles/min · the run ages the hull`,
          () => `ricochet ranged · ${rint(3, 10)} bounces · force doubling · not slowing`,
          () => `lava rising in the room below · ${f1(0.2, 2)} m/min · the fight has not moved`,
          () => `board rerolled · price ${rint(2, 40)} parts · climbing`,
        ],
        err: [
          () => `floor plan changed since the last sweep · same coordinates`,
          () => `a whole damage type immune · ${pickOne(["fire", "cold", "poison", "physical"])} · nothing we carry`,
          () => `elite ranged · ${rint(2, 6)} · turning as we near the end`,
        ],
        crit: [
          { t: () => `blast plate · ${fmt(rint(400, 2000))} kpa · under the hull`,
            label: "shielding burn-through", sev: 0.5 },
        ],
      },
      heavylight: {
        p: { warn: 0.2, err: 0.05, crit: 0 },
        read: [
          () => `lamp cycle 7.2 s · gravity ${f2(1.4, 1.6)}g on the beat · 1.00g between`,
          () => `light pressure ${f1(2, 9)} n/m² · ${rint(2, 20)} lamps ranged · timed`,
          () => `${rint(18, 20)} rooms charted · ${rint(0, 3)} unlit · crates ${rint(2, 40)}`,
          () => `coherent ${f2(0.35, 0.45)} · bounded · pushes · does not pull`,
          () => `a beam across the sweep · ${f1(0.4, 3)} m/s along it · step out and it stops dead`,
          () => `crate ranged · falling ${pickOne(["sideways", "up", "down"])} · the beam is its floor`,
          () => `wisps ${rint(1, 6)} · ${rint(0, 2)} red · a different voice on the red ones`,
          () => `air ${f1(1.1, 1.5)}x on the beat · the light has mass · nothing else does`,
        ],
        warn: [
          () => `lamp out of phase ${rint(20, 400)} ms · beat missed · resumed`,
          () => `beam on the hull · ${f1(0.4, 2.2)} m/s sideways · course holding · position not`,
          () => `a lamp aimed down · ${f2(1.6, 2.4)}g in the beam · under it`,
        ],
        err: [
          () => `a door barred · something behind it made an offer · leave · fight · sign`,
        ],
        crit: [],
      },
      conclusus: {
        p: { warn: 0.24, err: 0.08, crit: 0 },
        read: [
          () => `every return doubled · ${rint(2, 40)} pins · ${rint(4, 80)} returns`,
          () => `switch 1.20 s · silhouettes ${rint(2, 9)} · in step · ${pickOne(["green", "silver"])} now`,
          () => `gravity ${f2(0.82, 0.88)}g · light platforms only · the rest is not ranged`,
          () => `a second hull on the sweep · this bearing · this heading · ${fmt(rint(4, 40))} m behind`,
          () => `pin ranged · ${rint(1, 88)} of 88 · pointing ${pickOne(["up", "up-left", "up-right", "down"])} · fall held ${f1(0.8, 1.2)} s after`,
          () => `platforms lit ${rint(1, 9)} of ${rint(9, 14)} · the first goes dark in ${f1(1, 5)} s`,
          () => `symbol ranged · ${rint(1, 3)} of 3 pieces · each a note · in order`,
          () => `rain ${f1(0.4, 2)} mm/h · through every level · ${rint(2, 20)}x at the chapter's end`,
          () => `a shadow planted · ${fmt(rint(4, 120))} m back · one at a time · walking into it uses it`,
        ],
        warn: [
          () => `the second hull moved first · ${rint(20, 300)} ms`,
          () => `silhouette silver · ${f1(0.2, 1.1)} s to the switch · not touching it`,
          () => `bloom ${f1(1.5, 50)} · half a second · a level ended below`,
        ],
        err: [
          () => `pin count ${rint(2, 40)} · twice · both correct`,
          () => `we are the second hull · the first is ${fmt(rint(4, 40))} m ahead · this heading`,
        ],
        crit: [],
      },
    };
  }

  window.BridgeSites = { SITES, GD_SITES, lines };
})();
