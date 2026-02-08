// ================================================================
// Benchmark: Cooperative Foraging with Diminishing Returns
//
// Tests the diminishing returns change to COOP_BONUS.
// Runs 5 trials at 108000 ticks (~30 min sim time each) to verify:
// 1. Predation persists past generation 100 (was 0 at gen 185)
// 2. Brain sizes don't collapse to floor (was 5.5-10.2)
// 3. Multiple strategies coexist (share variance, mode diversity)
// 4. Cooperation still exists (not destroyed)
//
// Baseline (Session 22, old flat bonus):
//   share mean 0.54-0.92, zero hunting, brain 5.5-10.2,
//   2-4 species at 185 gen, 90+ coop pairs
//
// Usage: node scripts/benchmark-coop-diminishing.js
// ================================================================

const { chromium } = require('playwright');

const NUM_TRIALS = 5;
const TOTAL_TICKS = 108000;
const SAMPLE_INTERVAL = 18000;
const SIM_SPEED = 32;
const POLL_INTERVAL_MS = 500;
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

    let shareSum = 0, mateSum = 0, phdSum = 0;
    let genSum = 0, brainSum = 0, senseSum = 0, sizeSum = 0, speedSum = 0;
    let dietSum = 0, phDepositSum = 0;
    let shareVar = 0, mateVar = 0;
    let modeCount = [0, 0, 0, 0, 0, 0];
    let maxGen = 0;
    let brainMin = 99, brainMax = 0;

    for (let i = 0; i < n; i++) {
      const c = creatures[i];
      shareSum += c.shareOut;
      mateSum += c.mateOut;
      phdSum += c.phDepOut;
      genSum += c.generation;
      brainSum += c.genes.brainSize;
      senseSum += c.genes.senseRange;
      sizeSum += c.genes.size;
      speedSum += c.genes.speedGene;
      dietSum += c.genes.diet;
      phDepositSum += c.genes.phDeposit;
      if (c.generation > maxGen) maxGen = c.generation;
      if (c.genes.brainSize < brainMin) brainMin = c.genes.brainSize;
      if (c.genes.brainSize > brainMax) brainMax = c.genes.brainSize;
      if (c._mode >= 0 && c._mode <= 5) modeCount[c._mode]++;
    }

    const shareMean = shareSum / n;
    const mateMean = mateSum / n;
    for (let i = 0; i < n; i++) {
      const c = creatures[i];
      shareVar += (c.shareOut - shareMean) ** 2;
      mateVar += (c.mateOut - mateMean) ** 2;
    }

    const buckets = new Set();
    for (let i = 0; i < n; i++) buckets.add(Math.floor(creatures[i].genes.hue / 30));

    return {
      tick: w.tick,
      pop: n,
      maxGen,
      avgGen: genSum / n,
      births: w.births,
      sexualBirths: w.sexualBirths,
      deaths: w.deaths,
      predationKills: w.predationKills || 0,
      species: buckets.size,
      coopPairs: w.coopPairs ? w.coopPairs.length / 2 : 0,
      shareMean,
      mateMean,
      phDepOutMean: phdSum / n,
      shareVar: Math.sqrt(shareVar / n),
      mateVar: Math.sqrt(mateVar / n),
      brainMean: brainSum / n,
      brainMin,
      brainMax,
      senseMean: senseSum / n,
      sizeMean: sizeSum / n,
      speedMean: speedSum / n,
      dietMean: dietSum / n,
      phDepositMean: phDepositSum / n,
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

  // Set speed to 32x
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
    const predPct = sample.deaths > 0 ? ((sample.predationKills / sample.deaths) * 100).toFixed(1) : '0.0';
    process.stdout.write(`\r  Trial ${trialNum}: ${pct}% (tick ${sample.tick}, gen ${sample.maxGen}, pop ${sample.pop}, hunt ${sample.modeCount[2]}, pred ${predPct}%, brain ${sample.brainMean.toFixed(1)})`);
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
  console.log(`\n=== Coop Diminishing Returns Benchmark ===`);
  console.log(`${NUM_TRIALS} trials x ${TOTAL_TICKS} ticks at ${SIM_SPEED}x\n`);

  const results = [];

  for (let t = 0; t < NUM_TRIALS; t++) {
    const result = await runTrial(t + 1);
    results.push(result);

    const f = result.final;
    const predPct = f.deaths > 0 ? ((f.predationKills / f.deaths) * 100).toFixed(1) : '0.0';
    console.log(`  Trial ${t + 1} final: gen ${f.maxGen}, pop ${f.pop}, births ${f.births}, species ${f.species}`);
    console.log(`    predation: ${f.predationKills} kills (${predPct}% of deaths)`);
    console.log(`    share: ${f.shareMean.toFixed(3)} (var ${f.shareVar.toFixed(3)}), coop pairs: ${f.coopPairs}`);
    console.log(`    brain: ${f.brainMean.toFixed(1)} [${f.brainMin}, ${f.brainMax}], sense: ${f.senseMean.toFixed(0)}`);
    console.log(`    size: ${f.sizeMean.toFixed(2)}, speed: ${f.speedMean.toFixed(2)}, diet: ${f.dietMean.toFixed(2)}`);
    console.log(`    modes: idle=${f.modeCount[0]} forage=${f.modeCount[1]} hunt=${f.modeCount[2]} flee=${f.modeCount[3]} share=${f.modeCount[4]} mate=${f.modeCount[5]}`);
  }

  // Aggregate
  console.log('\n=== Aggregate Results ===');
  const finals = results.map(r => r.final);
  const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const range = (arr) => `[${Math.min(...arr)}, ${Math.max(...arr)}]`;
  const stddev = (arr) => { const m = avg(arr); return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length); };

  const maxGens = finals.map(f => f.maxGen);
  const pops = finals.map(f => f.pop);
  const predKills = finals.map(f => f.predationKills);
  const predPcts = finals.map(f => f.deaths > 0 ? (f.predationKills / f.deaths) * 100 : 0);
  const shareMs = finals.map(f => f.shareMean);
  const shareVs = finals.map(f => f.shareVar);
  const brains = finals.map(f => f.brainMean);
  const brainMins = finals.map(f => f.brainMin);
  const brainMaxs = finals.map(f => f.brainMax);
  const senses = finals.map(f => f.senseMean);
  const sizes = finals.map(f => f.sizeMean);
  const speeds = finals.map(f => f.speedMean);
  const diets = finals.map(f => f.dietMean);
  const species = finals.map(f => f.species);
  const coops = finals.map(f => f.coopPairs);
  const huntModes = finals.map(f => f.modeCount[2]);

  console.log(`Max generation:   ${avg(maxGens).toFixed(0)} +/- ${stddev(maxGens).toFixed(0)} ${range(maxGens)}`);
  console.log(`Population:       ${avg(pops).toFixed(0)} ${range(pops)}`);
  console.log(`Predation kills:  ${avg(predKills).toFixed(0)} ${range(predKills)}`);
  console.log(`Predation %:      ${avg(predPcts).toFixed(1)}% ${range(predPcts.map(v => +v.toFixed(1)))}`);
  console.log(`Hunt mode count:  ${avg(huntModes).toFixed(1)} ${range(huntModes)}`);
  console.log(`Species:          ${avg(species).toFixed(1)} ${range(species)}`);
  console.log(`Coop pairs:       ${avg(coops).toFixed(0)} ${range(coops)}`);
  console.log(`Share mean:       ${avg(shareMs).toFixed(3)} (var ${avg(shareVs).toFixed(3)})`);
  console.log(`Brain mean:       ${avg(brains).toFixed(1)} ${range(brains.map(v => +v.toFixed(1)))}`);
  console.log(`Brain range:      min ${range(brainMins)}, max ${range(brainMaxs)}`);
  console.log(`Sense:            ${avg(senses).toFixed(0)} ${range(senses.map(v => Math.round(v)))}`);
  console.log(`Size:             ${avg(sizes).toFixed(2)}`);
  console.log(`Speed:            ${avg(speeds).toFixed(2)}`);
  console.log(`Diet:             ${avg(diets).toFixed(2)} ${range(diets.map(v => +v.toFixed(2)))}`);

  // Trajectory
  console.log('\n=== Evolution Trajectory ===');
  const maxSamples = Math.max(...results.map(r => r.samples.length));
  for (let si = 0; si < maxSamples; si++) {
    const valids = results.filter(r => r.samples.length > si).map(r => r.samples[si]);
    if (valids.length === 0) continue;
    const tick = avg(valids.map(s => s.tick));
    const gen = avg(valids.map(s => s.maxGen));
    const pop = avg(valids.map(s => s.pop));
    const share = avg(valids.map(s => s.shareMean));
    const brain = avg(valids.map(s => s.brainMean));
    const pred = avg(valids.map(s => s.deaths > 0 ? (s.predationKills / s.deaths) * 100 : 0));
    const hunt = avg(valids.map(s => s.modeCount[2]));
    console.log(`  tick ${Math.round(tick)}: gen ${gen.toFixed(0)}, pop ${pop.toFixed(0)}, share ${share.toFixed(3)}, brain ${brain.toFixed(1)}, pred ${pred.toFixed(1)}%, hunt ${hunt.toFixed(0)}`);
  }

  // Validation against Session 22 baseline
  console.log('\n=== Validation vs Session 22 Baseline ===');
  const predExists = avg(predPcts) > 1.0;
  console.log(`Predation > 1%:       ${predExists ? 'PASS' : 'FAIL'} (${avg(predPcts).toFixed(1)}% vs 0% baseline)`);
  const brainNotFloor = avg(brains) > 8.0;
  console.log(`Brain mean > 8:       ${brainNotFloor ? 'PASS' : 'FAIL'} (${avg(brains).toFixed(1)} vs 8.2 baseline)`);
  const huntExists = finals.some(f => f.modeCount[2] > 0);
  console.log(`Hunting mode seen:    ${huntExists ? 'PASS' : 'FAIL'}`);
  const coopMaintained = avg(shareMs) > 0.2;
  console.log(`Share mean > 0.2:     ${coopMaintained ? 'PASS' : 'FAIL'} (${avg(shareMs).toFixed(3)} - coop not destroyed)`);
  const genHealthy = avg(maxGens) >= 50;
  console.log(`Gen >= 50:            ${genHealthy ? 'PASS' : 'FAIL'} (${avg(maxGens).toFixed(0)})`);
  const multiStrategy = avg(shareVs) > 0.05;
  console.log(`Share variance > 0.05: ${multiStrategy ? 'PASS' : 'FAIL'} (${avg(shareVs).toFixed(3)} - strategic diversity)`);

  const passCount = [predExists, brainNotFloor, huntExists, coopMaintained, genHealthy, multiStrategy].filter(Boolean).length;
  console.log(`\nTotal: ${passCount}/6 criteria pass`);
}

main().catch(err => { console.error(err); process.exit(1); });
