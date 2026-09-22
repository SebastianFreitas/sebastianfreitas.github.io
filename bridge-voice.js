/* bridge-voice.js — every line the readout can say, per region, with the
   odds of a warning, an error or a hull strike. Pure text and odds; the
   live numbers come from `S`, a view onto the bridge's state. */
window.BridgeVoice = (function () {
  const { fmt } = Util;
  function create(S) {
    // S: { get camX(), get vel(), get chaosNow(), get futureNow(), get ship(), get sceneMode(),
    //      get breaches(), activeMarks(), LAND, SLOT, CAM }
    const { LAND, SLOT, CAM, activeMarks } = S;

    const rnd = (a, b) => a + Math.random() * (b - a);
    const rint = (a, b) => Math.floor(rnd(a, b + 1));
    const pickOne = arr => arr[Math.floor(Math.random() * arr.length)];
    const spanPctNow = () => (CAM.max - S.camX) / (CAM.max - CAM.min) * 100;
    const f1 = (a, b) => rnd(a, b).toFixed(1);
    const f2 = (a, b) => rnd(a, b).toFixed(2);
    const f0 = (a, b) => rnd(a, b).toFixed(0);

    function fuelPool() {
      if (!S.ship) return [];
      return [() => S.ship.infinite
        ? "drive: unlimited · tanks open"
        : `fuel ${S.ship.fuel.toFixed(0)}/${S.ship.fuelMax.toFixed(0)} · burn nominal`];
    }

    /* true wherever we are */
    const ANY = [
      () => `bearing ${fmt(S.camX)} · drift ${Math.abs(S.vel).toFixed(0)} m/s`,
      () => `span ${spanPctNow().toFixed(1)}% crossed`,
      () => `sweep complete · ${activeMarks().filter(m => Math.abs(m.cam - S.camX) < 22000).length} in range`,
      () => `cabin ${f1(20.8, 21.5)}°c · rh ${f0(38, 46)}%`,
    ];

    /* what the instruments say, per region */
    const ZONES = {
      mainland: {
        p: { warn: 0, err: 0, crit: 0 },
        read: [
          () => `gravity ${f2(0.99, 1.01)}g · drift ±0.004 over 60s`,
          () => `pressure ${f1(100.8, 101.7)} kpa · rh ${f0(38, 48)}%`,
          () => `o2 ${f2(20.85, 21.05)}% · co2 ${rint(390, 520)} ppm`,
          () => `ambient ${f1(14, 23)}°c · hull ${f1(8, 19)}°c`,
          () => `field ${f1(46.8, 47.6)} µt · declination ${f1(1.1, 3.4)}°`,
          () => `dose ${f2(0.08, 0.16)} µsv/h · background`,
          () => `lane traffic ${rint(3, 14)} hulls · all transponding`,
          () => `rf floor -${rint(96, 112)} dbm · ${rint(40, 220)} carriers`,
          () => `lidar fix ±${f2(0.02, 0.18)} m at ${fmt(rint(2000, 9000))} m`,
          () => `particulate ${rint(2, 40)}/m²·h · clean lane`,
          () => `clock sync ±${rint(2, 18)} ppb to port time`,
          () => `hull strain ${rint(20, 90)} µε · within spec`,
        ],
        warn: [], err: [], crit: [],
      },

      rex: {
        p: { warn: 0, err: 0, crit: 0 },
        read: [
          () => `gravity ${f2(1.28, 1.46)}g · gradient flat`,
          () => `pressure ${f1(88, 97)} kpa · co2 ${fmt(rint(2000, 6000))} ppm`,
          () => `surface ${f1(-14, 41)}°c · thermals steady`,
          () => `field ${f0(210, 340)} µt · ferrous crust`,
          () => `dose ${f2(0.4, 1.2)} µsv/h · shielded`,
          () => `crust density ${fmt(rint(3100, 5400))} kg/m³`,
          () => `dock beacons ${rint(2, 7)} · handshake ${rint(88, 99)}%`,
          () => `seismic ${f1(0.4, 2.8)} hz · continuous`,
          () => `bus ${f1(27.4, 28.6)} v · draw ${f1(3.1, 6.8)} kw`,
          () => `three masses ranged · Δ ${fmt(rint(4000, 9000))} m`,
          () => `strain ${rint(60, 180)} µε · loaded, in spec`,
        ],
        warn: [], err: [], crit: [],
      },

      gamedev: {
        p: { warn: 0, err: 0, crit: 0 },
        read: [
          () => `orbit stable · period ${rint(4, 90)} h`,
          () => `atmosphere ${f1(0, 4)} kpa · thin`,
          () => `surface ${f0(-120, 60)}°c · albedo 0.${rint(10, 74)}`,
          () => `optical depth ${f2(0.02, 0.9)} · clear`,
          () => `no traffic · ${rint(1, 4)} bodies charted`,
          () => `field ${f1(0.2, 9)} µt · dose ${f2(0.2, 1.4)} µsv/h`,
        ],
        warn: [], err: [], crit: [],
      },

      void: {
        p: { warn: 0.34, err: 0.16, crit: 0.035 },
        read: [
          () => `gravity ${rnd(0, 0.04).toFixed(3)}g · free span`,
          () => `pressure ${rnd(0, 0.0004).toFixed(4)} pa · hard vacuum`,
          () => `hull ${f0(-118, -62)}°c · cabin ${f1(20.9, 21.4)}°c`,
          () => `field ${f1(0.2, 3.4)} µt · no anchor`,
          () => `dose ${f2(0.8, 3.2)} µsv/h · galactic`,
          () => `particle flux ${fmt(rint(400, 9000))}/cm²·s`,
          () => `plasma density ${f1(0.2, 9)}/cm³`,
          () => `chaos ${S.chaosNow.toFixed(2)} · unformed ${S.futureNow.toFixed(2)}`,
          () => `lidar to ${fmt(rint(40, 90) * 1000)} m · no return`,
          () => `strain ${rint(40, 180)} µε · hull quiet`,
        ],
        warn: [
          () => `gravity ${f1(2.4, 9.8)}g in a ${rint(3, 40)} m pocket`,
          () => `pressure ${f1(0.4, 12)} kpa spike on open vacuum`,
          () => `hull ${f0(-260, -180)}°c · ${f0(12, 60)}° below model`,
          () => `field ${rint(400, 2600)} µt · no mass to carry it`,
          () => `dose ${f0(40, 180)} µsv/h · rising ${rint(3, 22)}%/min`,
          () => `range finder Δ ${fmt(rint(200, 9000))} m between sweeps`,
          () => `echo back ${f1(0.2, 2.6)}s early · rechecking`,
          () => `strain ${fmt(rint(900, 2400))} µε · sector ${rint(1, 8)} loading`,
          () => `clock ${f1(1.2, 40)} ms behind fleet time`,
          () => `star count ${rint(2, 40)} · was ${rint(41, 900)} last sweep`,
          () => `thermal gradient ${rint(90, 400)}°c/m across 0 mass`,
          () => `bus sag ${f1(21.2, 25.9)} v · draw flat`,
        ],
        err: [
          () => `gravity ∞ at ${fmt(S.camX + rint(400, 9000))} · sensor clipped`,
          () => `pressure nan · barometer reset ${rint(2, 9)}x`,
          () => `dose ${fmt(rint(1200, 9000))} µsv/h · shield at ${rint(41, 88)}%`,
          () => `field ${fmt(rint(9000, 40000))} µt · magnetometer railed`,
          () => `lidar returns ${rint(2, 9)} hulls at this bearing`,
          () => `clock lost ${f1(1.4, 22)}s · the log kept writing`,
          () => `mass nan · bearing nan · return ${f1(0.4, 3)}s`,
          () => `strain ${fmt(rint(3200, 7400))} µε · yield rated 3,000`,
        ],
        crit: [
          { t: () => `impact ${f2(1.4, 6.2)}g · ${rint(2, 40)} mm at ${fmt(rint(4, 90) * 1000)} m/s`,
            label: "plating breach", sev: 0.5 },
          { t: () => `dose ${fmt(rint(12000, 60000))} µsv/h · burst ${f1(0.2, 2)}s`,
            label: "shielding burn-through", sev: 0.4 },
          { t: () => `strain ${fmt(rint(9000, 22000))} µε · frame past yield`,
            label: "frame deformation", sev: 0.6 },
        ],
      },

      bridge: {
        p: { warn: 0.34, err: 0.16, crit: 0.05 },
        read: [
          () => `span ranged ${fmt(rint(200, 900) * 1000)} m · both ends unlit`,
          () => `gravity ${f2(0.02, 0.4)}g along the deck`,
          () => `structure ringing at ${f1(0.2, 4)} hz`,
          () => `field ${rint(40, 220)} µt · follows the deck`,
          () => `deck temp ${f0(-90, -40)}°c · ours ${f0(-60, -20)}°c`,
          () => `dose ${f2(1.2, 4)} µsv/h · deck shadows it`,
        ],
        warn: [
          () => `deck harmonic ${f1(11, 48)} hz · hull matching it`,
          () => `strain ${fmt(rint(1200, 3400))} µε · frame in sympathy`,
          () => `gravity flips sign every ${f1(1.2, 9)}s`,
          () => `range to deck ${fmt(rint(40, 900))} m · was ${fmt(rint(1000, 9000))}`,
          () => `field rotates ${rint(20, 90)}° per span section`,
        ],
        err: [
          () => `deck has no underside · ${rint(2, 9)} returns, all near`,
          () => `resonance ${fmt(rint(200, 900))} hz · frame rated 120`,
          () => `gravity ${f1(4, 18)}g reported and not felt`,
        ],
        crit: [
          { t: () => `resonance ${fmt(rint(900, 2400))} hz · welds singing`,
            label: "weld seam split", sev: 0.6 },
          { t: () => `${f1(2, 9)}g slam · deck section passed ${fmt(rint(20, 400))} m`,
            label: "plating breach", sev: 0.5 },
        ],
      },

      watcher: {
        p: { warn: 0.34, err: 0.20, crit: 0.09 },
        read: [
          () => `standing field ${rint(600, 1400)} µt · no source ranged`,
          () => `tone ${f1(41.2, 41.9)} hz · unbroken ${rint(4, 90)} h`,
          () => `optical ${rint(2, 9)} lines at ${rint(486, 656)} nm · no body`,
          () => `dose ${f1(6, 22)} µsv/h · directional`,
          () => `skin charge +${f1(0.2, 2.4)} kv · steady`,
        ],
        warn: [
          () => `rf ${f1(1.2, 9.8)} ghz · ${rint(40, 90)} db over floor`,
          () => `field rotated ${rint(40, 180)}° · the ship did not`,
          () => `skin charge +${f1(2.4, 18)} kv · rising ${rint(4, 40)}%/min`,
          () => `cabin ${f1(24.1, 29.8)}°c · no heat input`,
          () => `dose ${f0(90, 600)} µsv/h · one bearing only`,
        ],
        err: [
          () => `rf ${fmt(rint(60, 180))} db over floor · front end saturated`,
          () => `field ${fmt(rint(9000, 30000))} µt · compass useless`,
          () => `${rint(2, 9)} of ${rint(9, 14)} sensors report being addressed`,
          () => `dose ${fmt(rint(1200, 6000))} µsv/h · collimated on us`,
        ],
        crit: [
          { t: () => `rf ${fmt(rint(120, 400))} db over floor · receivers gone`,
            label: "antenna array cooked", sev: 0.55 },
          { t: () => `skin charge ${fmt(rint(90, 400))} kv · arc to frame`,
            label: "bus arc-over", sev: 0.6 },
          { t: () => `field ${fmt(rint(60000, 200000))} µt · bearing locked on us`,
            label: "magnetometer destroyed", sev: 0.7 },
        ],
      },

      root: {
        p: { warn: 0.32, err: 0.24, crit: 0.11 },
        read: [
          () => `ambient ${rint(28, 39)}°c · rh ${rint(88, 99)}%`,
          () => `organics ${fmt(rint(200, 4000))} ppm · ${rint(4, 40)} amino signatures`,
          () => `tissue mass ${fmt(rint(200, 4000))} m across · contiguous`,
          () => `pressure ${f1(4, 19)} kpa · co2 ${fmt(rint(40000, 120000))} ppm`,
          () => `field ${rint(90, 400)} µt · organic, not ferrous`,
        ],
        warn: [
          () => `pulse ${rint(11, 48)} bpm · amplitude +${rint(4, 30)}%`,
          () => `ph ${f1(1.1, 3.4)} on outer plating · etching`,
          () => `cabin o2 ${f1(14.2, 18.9)}% · scrubbers at ${rint(80, 100)}%`,
          () => `field ${rint(200, 900)} µt · modulated at ${rint(11, 48)} bpm`,
          () => `hull ${f1(31, 44)}°c · the dark here is warm`,
        ],
        err: [
          () => `ph ${f1(0.4, 1.1)} · plating loss ${f2(0.1, 0.9)} mm/min`,
          () => `co2 ${fmt(rint(120000, 200000))} ppm · seal differential falling`,
          () => `${rint(2, 9)} masses closing · ${f1(0.4, 4)} m/s, coordinated`,
          () => `scan refused · the scan was noticed`,
        ],
        crit: [
          { t: () => `ph ${f1(0.1, 0.4)} · plating loss ${f1(1.2, 9)} mm/min`,
            label: "hull corrosion", sev: 0.65 },
          { t: () => `co2 ${fmt(rint(200000, 600000))} ppm · seal differential lost`,
            label: "eclss seal breach", sev: 0.7 },
          { t: () => `mass closed to ${fmt(rint(20, 400))} m at ${f1(2, 14)} m/s`,
            label: "grapple strike", sev: 0.8 },
          { t: () => `dose ${fmt(rint(40000, 120000))} µsv/h · biological, not decay`,
            label: "shielding burn-through", sev: 0.5 },
        ],
      },

      edgefall: {
        p: { warn: 0.38, err: 0.12, crit: 0.06 },
        read: [
          () => `gravity ${f2(1.1, 1.4)}g · gradient ${rint(40, 180)} mg/m`,
          () => `cliff face ranged ${fmt(rint(9000, 40000))} m · no floor`,
          () => `shadow side ${f0(-92, -41)}°c · hull ${f0(-70, -30)}°c`,
          () => `field ${rint(120, 380)} µt · ferrous, tilting`,
          () => `dose ${f2(0.6, 2.4)} µsv/h · mass shadow`,
        ],
        warn: [
          () => `tidal shear ${fmt(rint(400, 2400))} mg/m across the hull`,
          () => `gravity ${f1(2.8, 6.4)}g bow · ${f1(0.2, 0.9)}g stern`,
          () => `strain ${fmt(rint(1400, 4000))} µε · frame twisting`,
          () => `pressure ${f1(0.2, 6)} kpa · outgassing off the face`,
          () => `debris ${fmt(rint(400, 9000))}/m²·h · falling with us`,
        ],
        err: [
          () => `shear ${fmt(rint(4000, 9000))} mg/m · trim compensating`,
          () => `the face has been falling for ${fmt(rint(200, 9000))} m`,
          () => `gravity vector ${rint(90, 180)}° off nadir`,
        ],
        crit: [
          { t: () => `shear ${fmt(rint(9000, 26000))} mg/m · ${f1(2, 9)}g bow to stern`,
            label: "spine fracture", sev: 0.7 },
          { t: () => `debris ${fmt(rint(20, 90) * 1000)}/m²·h at ${f1(2, 9)} km/s`,
            label: "plating breach", sev: 0.5 },
        ],
      },

      unnamed: {
        p: { warn: 0.36, err: 0.18, crit: 0.06 },
        read: [
          () => `no survey on file · charting from ${fmt(rint(4, 90) * 1000)} m`,
          () => `gravity ${f2(0.8, 1.3)}g · unmodelled`,
          () => `field ${rint(90, 600)} µt · unmapped`,
          () => `albedo 0.0${rint(2, 9)} · absorbs ${rint(91, 99)}%`,
          () => `surface ${f0(-160, -90)}°c · pressure ${f2(0, 0.8)} kpa`,
        ],
        warn: [
          () => `${rint(2, 40)} returns from a body charted as 1`,
          () => `surface ${f0(-190, -160)}°c · colder than its own shadow`,
          () => `dose ${f0(60, 400)} µsv/h · from the surface, not the sky`,
          () => `field ${fmt(rint(1200, 4000))} µt · no core to make it`,
          () => `strain ${fmt(rint(800, 2200))} µε · something pulling`,
        ],
        err: [
          () => `terrain moved ${fmt(rint(200, 4000))} m between sweeps`,
          () => `lidar floor at ${fmt(rint(20, 400))} m · then none`,
          () => `mass ${fmt(rint(200, 9000))} kg · and ${fmt(rint(90000, 400000))} kg`,
          () => `${rint(2, 9)} horizons · one body`,
        ],
        crit: [
          { t: () => `dust ${fmt(rint(4, 40) * 1000)}/cm²·s at ${fmt(rint(4, 40))} km/s`,
            label: "sensor mast stripped", sev: 0.5 },
          { t: () => `gravity ${f1(6, 22)}g for ${f1(0.2, 1.4)}s · unmodelled`,
            label: "frame deformation", sev: 0.6 },
        ],
      },

      future: {
        p: { warn: 0.36, err: 0.20, crit: 0 },
        read: [
          () => `all instruments nominal · none agree`,
          () => `gravity ${f2(0, 0.9)}g · reread ${f2(0, 0.9)}g`,
          () => `dose ${f2(0, 0.4)} µsv/h · no source, no shield`,
          () => `field ${f2(0, 0.4)} µt · below noise floor`,
          () => `pressure ${rnd(0, 0.0002).toFixed(4)} pa · nothing to weigh`,
        ],
        warn: [
          () => `${rint(3, 9)} sweeps · ${rint(3, 9)} different distances`,
          () => `clock +${f1(0.4, 12)}s · then -${f1(0.4, 12)}s`,
          () => `pressure ${f1(0, 90)} kpa · ${rint(2, 9)} readings, one sensor`,
          () => `temperature ${f0(-270, 40)}°c · sampled ${rint(2, 9)}x, no median`,
          () => `strain ${rint(0, 40)} µε · the frame has not decided`,
        ],
        err: [
          () => `bearing nan · the chart ends ${fmt(rint(200, 9000))} m back`,
          () => `mass ${fmt(rint(200, 9000))} kg and 0 kg · both current`,
          () => `range ∞ · range 0 · same sweep`,
        ],
        crit: [],
      },
    };

    /* what the hull says back after a reading it can't use */
    const ERR_RESP = [
      () => `reading rejected · sensor ${rint(1, 9)} flagged for recal`,
      () => `filter reset · ${rint(2, 9)} samples discarded`,
      () => `holding last good fix · ${f0(2, 40)}s stale`,
      () => `cross-check on backup · ${rint(2, 6)} of ${rint(6, 9)} agree`,
      () => `channel muted ${f1(2, 20)}s · nav unaffected`,
    ];

    const DC_RESP = [
      sec => `dc team ${rint(1, 4)} to sector ${sec} · patch underway`,
      sec => `sector ${sec} isolated · pressure held ${f1(80, 101)} kpa`,
      sec => `bus rerouted around sector ${sec} · ${f1(0.4, 3)} kw lost`,
      sec => `spares drawn · ${rint(2, 9)} plates, ${rint(2, 4)} seals`,
    ];

    const REPAIR_STEP = [
      (sec, pct) => `repair · sector ${sec} · seal ${pct}%`,
      (sec, pct) => `sector ${sec} · integrity ${pct}% and climbing`,
      (sec, pct) => `patch cured ${pct}% · ${rint(1, 9)} min to nominal`,
      (sec, pct) => `sector ${sec} · weld pass ${rint(1, 4)} · ${pct}% closed`,
    ];

    const DEGRADED = [
      b => `running ${8 - S.breaches.length} of 8 sectors · sector ${b.sec} open`,
      b => `sector ${b.sec} at ${Math.round(b.integrity * 100)}% · hold under ${f1(2, 6)}g`,
      b => `sector ${b.sec} leak ${f2(0.02, 0.4)} kpa/min · within reserve`,
    ];

    /* where we are, as far as the instruments are concerned */
    function zoneAt(x) {
      if (S.sceneMode !== "void") return "gamedev";
      if (Math.abs(x - LAND.mainland) < SLOT * 1.6) return "mainland";
      if (x > LAND.root - SLOT * 1.4) return "root";
      if (Math.abs(x - LAND.rex) < SLOT * 1.5) return "rex";
      if (Math.abs(x - LAND.watcher) < SLOT * 1.5) return "watcher";
      if (Math.abs(x - LAND.bridge) < SLOT * 1.5) return "bridge";
      if (Math.abs(x - LAND.edgefall) < SLOT * 1.3) return "edgefall";
      if (Math.abs(x - LAND.unnamed) < SLOT * 1.3) return "unnamed";
      if (Math.abs(x - LAND.future) < SLOT * 2) return "future";
      return "void";
    }

    /* open span scales with how disturbed the dark is; a named bad place
       is always as bad as it is */
    function zoneHeat(zone) {
      if (zone !== "void") return 1;
      return Math.min(1, Math.max(0.45, S.chaosNow));
    }

    return { fuelPool, ANY, ZONES, ERR_RESP, DC_RESP, REPAIR_STEP, DEGRADED, zoneAt, zoneHeat, pickOne, rnd, rint, f0, f1, f2 };
  }
  return { create };
})();
