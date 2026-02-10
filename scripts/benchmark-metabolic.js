// ================================================================
// Benchmark: Steeper Metabolic Costs (#75)
//
// Validates that quadratic speed cost and steeper size exponent
// prevent trait ceiling convergence and create phenotypic diversity.
//
// Success criteria (vs gen-630 baseline where everything converged):
// 1. Speed gene mean < 1.7 (was 1.88 at ceiling)
// 2. Size gene mean < 1.7 (was 1.82 at ceiling)
// 3. Speed gene stddev > 0.05 (within-population diversity)
// 4. Size gene stddev > 0.05
// 5. Population avg > 20 (ecosystem viable)
// 6. Max generation > 50 (evolution progressing)
// 7. Predation > 3% of deaths (not collapsed)
//
// Usage: node scripts/benchmark-metabolic.js
// ================================================================

const { chromium } = require('playwright');

const NUM_TRIALS = 5;
const TOTAL_TICKS = 54000;  // ~15 min sim, ~100+ generations with aging
const SAMPLE_INTERVAL = 6000;
const POLL_INTERVAL_MS = 400;
const FILE_URL = 'file:///Users/austinbrace/Developer/fullcreative/emergence.html';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function collectSample(page) {
  return page.evaluate(() => {
    const w = window.__world;
    if (!w) return null;

    const creatures = w.creatures.filter(c => c.alive);
    const n = creatures.length;
    if (n === 0) return null;

    let shareSum = 0, genSum = 0, brainSum = 0, senseSum = 0;
    let sizeSum = 0, speedSum = 0, dietSum = 0;
    let sizeArr = [], speedArr = [], brainArr = [], senseArr = [];
    let maxGen = 0;
    let modeCount = [0, 0, 0, 0, 0, 0];

    for (let i = 0; i < n; i++) {
      const c = creatures[i];
      shareSum += c.shareOut;
      genSum += c.generation;
      brainSum += c.genes.brainSize;
      senseSum += c.genes.senseRange;
      sizeSum += c.genes.size;
      speedSum += c.genes.speedGene;
      dietSum += c.genes.diet;
      sizeArr.push(c.genes.size);
      speedArr.push(c.genes.speedGene);
      brainArr.push(c.genes.brainSize);
      senseArr.push(c.genes.senseRange);
      if (c.generation > maxGen) maxGen = c.generation;
      if (c._mode >= 0 && c._mode <= 5) modeCount[c._mode]++;
    }

    function stddev(arr, mean) {
      let s = 0;
      for (let i = 0; i < arr.length; i++) s += (arr[i] - mean) ** 2;
      return Math.sqrt(s / arr.length);
    }

    const sizeMean = sizeSum / n;
    const speedMean = speedSum / n;
    const brainMean = brainSum / n;
    const senseMean = senseSum / n;

    // Count species
    const buckets = new Set();
    for (let i = 0; i < n; i++) buckets.add(Math.floor(creatures[i].genes.hue / 30));

    return {
      tick: w.tick,
      pop: n,
      maxGen,
      avgGen: genSum / n,
      births: w.births,
      deaths: w.deaths,
      predationKills: w.predationKills || 0,
      species: buckets.size,
      shareMean: shareSum / n,
      sizeMean, speedMean, brainMean, senseMean,
      sizeStd: stddev(sizeArr, sizeMean),
      speedStd: stddev(speedArr, speedMean),
      brainStd: stddev(brainArr, brainMean),
      senseStd: stddev(senseArr, senseMean),
      sizeMin: Math.min(...sizeArr),
      sizeMax: Math.max(...sizeArr),
      speedMin: Math.min(...speedArr),
      speedMax: Math.max(...speedArr),
      dietMean: dietSum / n,
      modeCount,
    };
  });
}

async function runTrial(trialNum) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });

  await page.click('#overlay');
  await sleep(500);
  await page.keyboard.press('t');
  await sleep(200);

  const samples = [];
  let lastTick = 0;

  while (lastTick < TOTAL_TICKS) {
    await sleep(POLL_INTERVAL_MS);
    const sample = await collectSample(page);
    if (!sample) continue;
    if (sample.tick < lastTick + SAMPLE_INTERVAL) continue;
    lastTick = sample.tick;
    samples.push(sample);
    const pct = Math.round((sample.tick / TOTAL_TICKS) * 100);
    process.stdout.write(`\r  Trial ${trialNum}: ${pct}% (tick ${sample.tick}, gen ${sample.maxGen}, pop ${sample.pop}, size ${sample.sizeMean.toFixed(2)}, speed ${sample.speedMean.toFixed(2)})`);
  }

  const final = await collectSample(page);
  if (final && (samples.length === 0 || final.tick > samples[samples.length - 1].tick)) {
    samples.push(final);
  }

  await browser.close();
  process.stdout.write('\n');
  return { samples, final: samples[samples.length - 1] };
}

async function main() {
  console.log(`\n=== Metabolic Cost Benchmark (#75) ===`);
  console.log(`${NUM_TRIALS} trials x ${TOTAL_TICKS} ticks at 32x\n`);

  const results = [];

  for (let t = 0; t < NUM_TRIALS; t++) {
    const result = await runTrial(t + 1);
    results.push(result);

    const f = result.final;
    const predPct = f.deaths > 0 ? (f.predationKills / f.deaths * 100) : 0;
    console.log(`  Trial ${t + 1}: gen ${f.maxGen}, pop ${f.pop}, births ${f.births}, deaths ${f.deaths}, pred ${predPct.toFixed(1)}%`);
    console.log(`    size: ${f.sizeMean.toFixed(2)} +/- ${f.sizeStd.toFixed(3)} [${f.sizeMin.toFixed(2)}, ${f.sizeMax.toFixed(2)}]`);
    console.log(`    speed: ${f.speedMean.toFixed(2)} +/- ${f.speedStd.toFixed(3)} [${f.speedMin.toFixed(2)}, ${f.speedMax.toFixed(2)}]`);
    console.log(`    brain: ${f.brainMean.toFixed(1)}, sense: ${f.senseMean.toFixed(0)}, diet: ${f.dietMean.toFixed(2)}`);
    console.log(`    share: ${f.shareMean.toFixed(3)}, species: ${f.species}`);
    console.log(`    modes: idle=${f.modeCount[0]} forage=${f.modeCount[1]} hunt=${f.modeCount[2]} flee=${f.modeCount[3]} share=${f.modeCount[4]} mate=${f.modeCount[5]}`);
  }

  // Aggregate
  console.log('\n=== Aggregate Results ===');
  const finals = results.map(r => r.final);
  const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const range = (arr) => `[${Math.min(...arr).toFixed(2)}, ${Math.max(...arr).toFixed(2)}]`;

  const maxGens = finals.map(f => f.maxGen);
  const pops = finals.map(f => f.pop);
  const sizes = finals.map(f => f.sizeMean);
  const speeds = finals.map(f => f.speedMean);
  const sizeStds = finals.map(f => f.sizeStd);
  const speedStds = finals.map(f => f.speedStd);
  const brains = finals.map(f => f.brainMean);
  const senses = finals.map(f => f.senseMean);
  const predPcts = finals.map(f => f.deaths > 0 ? f.predationKills / f.deaths * 100 : 0);

  console.log(`Max generation:   ${avg(maxGens).toFixed(0)} ${range(maxGens)}`);
  console.log(`Population:       ${avg(pops).toFixed(0)} ${range(pops)}`);
  console.log(`Size mean:        ${avg(sizes).toFixed(2)} ${range(sizes)}`);
  console.log(`Size stddev:      ${avg(sizeStds).toFixed(3)} ${range(sizeStds)}`);
  console.log(`Speed mean:       ${avg(speeds).toFixed(2)} ${range(speeds)}`);
  console.log(`Speed stddev:     ${avg(speedStds).toFixed(3)} ${range(speedStds)}`);
  console.log(`Brain mean:       ${avg(brains).toFixed(1)} ${range(brains)}`);
  console.log(`Sense mean:       ${avg(senses).toFixed(0)} ${range(senses)}`);
  console.log(`Predation %:      ${avg(predPcts).toFixed(1)}% ${range(predPcts)}`);

  // Trait trajectory
  console.log('\n=== Trait Evolution Trajectory ===');
  const maxSamples = Math.max(...results.map(r => r.samples.length));
  for (let si = 0; si < maxSamples; si++) {
    const valids = results.filter(r => r.samples.length > si).map(r => r.samples[si]);
    if (valids.length === 0) continue;
    console.log(`  tick ${Math.round(avg(valids.map(s => s.tick)))}: ` +
      `gen ${avg(valids.map(s => s.maxGen)).toFixed(0)}, ` +
      `size ${avg(valids.map(s => s.sizeMean)).toFixed(2)}, ` +
      `speed ${avg(valids.map(s => s.speedMean)).toFixed(2)}, ` +
      `brain ${avg(valids.map(s => s.brainMean)).toFixed(1)}, ` +
      `sense ${avg(valids.map(s => s.senseMean)).toFixed(0)}`);
  }

  // Validation
  console.log('\n=== Validation ===');
  let passes = 0;
  const total = 7;

  const speedBelow = avg(speeds) < 1.7;
  console.log(`1. Speed mean < 1.7:     ${speedBelow ? 'PASS' : 'FAIL'} (${avg(speeds).toFixed(2)})`);
  if (speedBelow) passes++;

  const sizeBelow = avg(sizes) < 1.7;
  console.log(`2. Size mean < 1.7:      ${sizeBelow ? 'PASS' : 'FAIL'} (${avg(sizes).toFixed(2)})`);
  if (sizeBelow) passes++;

  const speedDiv = avg(speedStds) > 0.05;
  console.log(`3. Speed stddev > 0.05:  ${speedDiv ? 'PASS' : 'FAIL'} (${avg(speedStds).toFixed(3)})`);
  if (speedDiv) passes++;

  const sizeDiv = avg(sizeStds) > 0.05;
  console.log(`4. Size stddev > 0.05:   ${sizeDiv ? 'PASS' : 'FAIL'} (${avg(sizeStds).toFixed(3)})`);
  if (sizeDiv) passes++;

  const popOk = avg(pops) > 20;
  console.log(`5. Population > 20:      ${popOk ? 'PASS' : 'FAIL'} (${avg(pops).toFixed(0)})`);
  if (popOk) passes++;

  const genOk = finals.every(f => f.maxGen > 50);
  console.log(`6. All gen > 50:         ${genOk ? 'PASS' : 'FAIL'} (${maxGens.join(', ')})`);
  if (genOk) passes++;

  const predOk = avg(predPcts) > 3;
  console.log(`7. Predation > 3%:       ${predOk ? 'PASS' : 'FAIL'} (${avg(predPcts).toFixed(1)}%)`);
  if (predOk) passes++;

  console.log(`\nResult: ${passes}/${total} criteria pass`);
}

main().catch(err => { console.error(err); process.exit(1); });
