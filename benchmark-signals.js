// Signal channel investigation (#41)
// Question: are creatures evolving meaningful signal use, or is it random noise?
//
// Methodology:
// 1. Run simulation for 30000 ticks (2+ season cycles)
// 2. Sample creature signal outputs periodically
// 3. Analyze: variance, species correlation, generation correlation,
//    situational correlation (near food vs near predator), bimodality
//
// Usage: node benchmark-signals.js

const { chromium } = require('playwright');
const path = require('path');

const TOTAL_TICKS = 30000;
const BATCH_SIZE = 300;
const SAMPLE_INTERVAL = 300; // sample every 300 ticks

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const filePath = 'file://' + path.resolve(__dirname, 'emergence.html');
  await page.goto(filePath);
  await page.click('#overlay');
  await page.waitForTimeout(200);

  // Verify world is accessible
  await page.evaluate(() => {
    if (!window.__world) throw new Error('__world not exposed');
  });

  const allSamples = [];

  for (let tick = 0; tick < TOTAL_TICKS; tick += BATCH_SIZE) {
    const batchTicks = Math.min(BATCH_SIZE, TOTAL_TICKS - tick);

    const samples = await page.evaluate(({ batchTicks, interval, currentTick }) => {
      const w = window.__world;
      const silentAudio = {
        eatClick() {}, birthPing() {}, deathThud() {},
        predationSweep() {}, setPopulation() {}
      };

      const snapshots = [];

      for (let i = 0; i < batchTicks; i++) {
        w.update(silentAudio);
        const t = currentTick + i + 1;

        if (t % interval === 0 && t > 1000) { // skip early bootstrap
          const creatures = [];
          for (let j = 0; j < w.creatures.length; j++) {
            const c = w.creatures[j];
            const b = c.brain;
            const out = b.lastOutput;
            if (!out || out.length < 5) continue;

            creatures.push({
              id: c.id,
              gen: c.generation,
              age: c.age,
              energy: c.energy,
              hue: c.genes.hue,
              size: c.genes.size,
              bucket: Math.floor(c.genes.hue / 30) % 12,
              sg0: +(((out[2] + 1) / 2).toFixed(4)), // tanh output -> 0-1
              sg1: +(((out[3] + 1) / 2).toFixed(4)),
              sg2: +(((out[4] + 1) / 2).toFixed(4)),
              shr: +(((out[5] + 1) / 2).toFixed(4)),
              mat: +(((out[6] + 1) / 2).toFixed(4)),
              spd: +(((out[1] + 1) / 2).toFixed(4)),
            });
          }

          snapshots.push({
            tick: t,
            pop: w.creatures.length,
            maxGen: w.maxGen,
            creatures
          });
        }
      }

      return snapshots;
    }, { batchTicks, interval: SAMPLE_INTERVAL, currentTick: tick });

    allSamples.push(...samples);
  }

  await browser.close();

  // --- Analysis ---
  console.log('\n=== SIGNAL CHANNEL INVESTIGATION ===\n');
  console.log(`Ticks: ${TOTAL_TICKS}, Samples: ${allSamples.length}`);

  // Aggregate all creature observations
  const allObs = [];
  for (const s of allSamples) {
    for (const c of s.creatures) {
      allObs.push({ ...c, tick: s.tick });
    }
  }
  console.log(`Total creature observations: ${allObs.length}\n`);

  // 1. Signal output distributions
  console.log('--- Signal Output Distributions ---');
  for (const ch of ['sg0', 'sg1', 'sg2']) {
    const vals = allObs.map(o => o[ch]);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length;
    const std = Math.sqrt(variance);

    // Histogram (10 bins from 0 to 1)
    const bins = new Array(10).fill(0);
    for (const v of vals) bins[Math.min(Math.floor(v * 10), 9)]++;
    const histStr = bins.map(b => String(b).padStart(5)).join(' ');

    // Bimodality: fraction below 0.2 or above 0.8
    const low = vals.filter(v => v < 0.2).length / vals.length;
    const high = vals.filter(v => v > 0.8).length / vals.length;
    const mid = vals.filter(v => v >= 0.35 && v <= 0.65).length / vals.length;

    console.log(`  ${ch}: mean=${mean.toFixed(3)}, std=${std.toFixed(3)}, var=${variance.toFixed(4)}`);
    console.log(`    Distribution: low(<0.2)=${(low * 100).toFixed(1)}% mid(0.35-0.65)=${(mid * 100).toFixed(1)}% high(>0.8)=${(high * 100).toFixed(1)}%`);
    console.log(`    Histogram [0..1]: ${histStr}`);
  }

  // 2. Compare signal variance with non-signal outputs
  console.log('\n--- Comparison: Signal vs Other Outputs ---');
  for (const ch of ['spd', 'shr', 'mat', 'sg0', 'sg1', 'sg2']) {
    const vals = allObs.map(o => o[ch]);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length;
    console.log(`  ${ch}: mean=${mean.toFixed(3)}, var=${variance.toFixed(4)}`);
  }

  // 3. Signal patterns by species (do species signal differently?)
  console.log('\n--- Signal by Species (top 5 by observation count) ---');
  const byBucket = {};
  for (const o of allObs) {
    if (!byBucket[o.bucket]) byBucket[o.bucket] = [];
    byBucket[o.bucket].push(o);
  }
  const speciesNames = ['Kora','Vashi','Naia','Zelith','Thura','Shiko','Mori','Loxa','Pavi','Suri','Jera','Rixa'];
  const sorted = Object.entries(byBucket).sort((a, b) => b[1].length - a[1].length).slice(0, 5);
  for (const [bucket, obs] of sorted) {
    const sg0 = obs.reduce((a, o) => a + o.sg0, 0) / obs.length;
    const sg1 = obs.reduce((a, o) => a + o.sg1, 0) / obs.length;
    const sg2 = obs.reduce((a, o) => a + o.sg2, 0) / obs.length;
    console.log(`  ${speciesNames[bucket].padEnd(8)} (n=${String(obs.length).padStart(4)}): sg0=${sg0.toFixed(3)} sg1=${sg1.toFixed(3)} sg2=${sg2.toFixed(3)}`);
  }

  // 4. Signal patterns by generation (do higher-gen creatures signal differently?)
  console.log('\n--- Signal by Generation ---');
  const maxGen = Math.max(...allObs.map(o => o.gen));
  const genRanges = [[0, 2], [3, 5], [6, 10], [11, maxGen]].filter(([lo, hi]) => hi >= lo);
  for (const [lo, hi] of genRanges) {
    const obs = allObs.filter(o => o.gen >= lo && o.gen <= hi);
    if (obs.length < 5) continue;
    const sg0 = obs.reduce((a, o) => a + o.sg0, 0) / obs.length;
    const sg1 = obs.reduce((a, o) => a + o.sg1, 0) / obs.length;
    const sg2 = obs.reduce((a, o) => a + o.sg2, 0) / obs.length;
    console.log(`  gen ${lo}-${hi} (n=${String(obs.length).padStart(4)}): sg0=${sg0.toFixed(3)} sg1=${sg1.toFixed(3)} sg2=${sg2.toFixed(3)}`);
  }

  // 5. Signal correlation with energy (fitness proxy)
  console.log('\n--- Signal vs Energy (fitness correlation) ---');
  const lowE = allObs.filter(o => o.energy < 40);
  const highE = allObs.filter(o => o.energy > 100);
  if (lowE.length > 10 && highE.length > 10) {
    for (const ch of ['sg0', 'sg1', 'sg2']) {
      const lowMean = lowE.reduce((a, o) => a + o[ch], 0) / lowE.length;
      const highMean = highE.reduce((a, o) => a + o[ch], 0) / highE.length;
      console.log(`  ${ch}: low-energy(n=${lowE.length})=${lowMean.toFixed(3)} high-energy(n=${highE.length})=${highMean.toFixed(3)} diff=${(highMean - lowMean).toFixed(3)}`);
    }
  } else {
    console.log('  Insufficient data for energy comparison');
  }

  // 6. Signal temporal evolution (do signals change over time?)
  console.log('\n--- Signal Evolution Over Time ---');
  const early = allSamples.filter(s => s.tick < 5000);
  const late = allSamples.filter(s => s.tick > 25000);
  function meanSignals(samples) {
    const all = samples.flatMap(s => s.creatures);
    if (all.length === 0) return { sg0: NaN, sg1: NaN, sg2: NaN, n: 0 };
    return {
      sg0: all.reduce((a, o) => a + o.sg0, 0) / all.length,
      sg1: all.reduce((a, o) => a + o.sg1, 0) / all.length,
      sg2: all.reduce((a, o) => a + o.sg2, 0) / all.length,
      n: all.length
    };
  }
  const earlyM = meanSignals(early);
  const lateM = meanSignals(late);
  console.log(`  Early (tick<5000, n=${earlyM.n}): sg0=${earlyM.sg0.toFixed(3)} sg1=${earlyM.sg1.toFixed(3)} sg2=${earlyM.sg2.toFixed(3)}`);
  console.log(`  Late (tick>25000, n=${lateM.n}): sg0=${lateM.sg0.toFixed(3)} sg1=${lateM.sg1.toFixed(3)} sg2=${lateM.sg2.toFixed(3)}`);

  // 7. Verdict
  console.log('\n--- VERDICT ---');
  const allSg0 = allObs.map(o => o.sg0);
  const allSg1 = allObs.map(o => o.sg1);
  const allSg2 = allObs.map(o => o.sg2);
  const avgVar = [allSg0, allSg1, allSg2].map(vals => {
    const m = vals.reduce((a, b) => a + b, 0) / vals.length;
    return vals.reduce((a, v) => a + (v - m) ** 2, 0) / vals.length;
  });
  const meanVar = avgVar.reduce((a, b) => a + b, 0) / 3;

  // Expected variance for uniform random on [0,1] is 1/12 = 0.0833
  // If variance is much lower, signals are converging to a fixed value (noise)
  // If variance is higher or bimodal, signals are being used
  const uniformVar = 1 / 12;
  const varRatio = meanVar / uniformVar;

  if (varRatio < 0.3) {
    console.log(`  Signal variance is ${(varRatio * 100).toFixed(0)}% of uniform random.`);
    console.log('  Signals have converged toward fixed values - likely evolved noise.');
    console.log('  Creatures are not using signals for communication.');
  } else if (varRatio < 0.7) {
    console.log(`  Signal variance is ${(varRatio * 100).toFixed(0)}% of uniform random.`);
    console.log('  Signals show some structure but no clear functional use.');
    console.log('  May be incidental - needs longer evolution or stronger selection pressure.');
  } else {
    console.log(`  Signal variance is ${(varRatio * 100).toFixed(0)}% of uniform random.`);
    console.log('  Signals retain high variance - consistent with random brain outputs.');
    console.log('  No evidence of evolved signaling behavior yet.');
  }

  console.log('\n=== INVESTIGATION COMPLETE ===\n');
}

run().catch(err => {
  console.error('Investigation failed:', err);
  process.exit(2);
});
