// ================================================================
// Benchmark: Long Evolution with Diminishing Returns
//
// Validates the diminishing returns fix at the same timescale as the
// gen-232 save file (224K ticks). Tests whether the fix holds at
// 200+ generations or whether cooperation reconverges.
//
// Key metrics:
// 1. Does predation persist past generation 200?
// 2. Does population hit MAX_CREATURES ceiling (250)?
// 3. Does species monoculture establish?
// 4. Do brain sizes stabilize or continue shrinking?
// 5. Does share variance remain (strategic diversity)?
//
// Usage: node scripts/benchmark-long-diminishing.js
// ================================================================

const { chromium } = require('playwright');

const NUM_TRIALS = 3;
const TOTAL_TICKS = 224000;
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

    // Species counting
    const bucketCounts = new Int32Array(12);

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
      bucketCounts[Math.floor(c.genes.hue / 30) % 12]++;
    }

    const shareMean = shareSum / n;
    const mateMean = mateSum / n;
    for (let i = 0; i < n; i++) {
      const c = creatures[i];
      shareVar += (c.shareOut - shareMean) ** 2;
      mateVar += (c.mateOut - mateMean) ** 2;
    }

    // Count species with >= 2 members
    let speciesCount = 0;
    let dominantPct = 0;
    for (let b = 0; b < 12; b++) {
      if (bucketCounts[b] >= 2) speciesCount++;
      if (bucketCounts[b] / n > dominantPct) dominantPct = bucketCounts[b] / n;
    }

    return {
      tick: w.tick,
      pop: n,
      atCeiling: n >= 245, // near MAX_CREATURES
      maxGen,
      avgGen: genSum / n,
      births: w.births,
      deaths: w.deaths,
      predationKills: w.predationKills || 0,
      species: speciesCount,
      dominantPct,
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
    process.stdout.write(`\r  Trial ${trialNum}: ${pct}% (tick ${sample.tick}, gen ${sample.maxGen}, pop ${sample.pop}${sample.atCeiling ? ' CEIL' : ''}, pred ${predPct}%, share ${sample.shareMean.toFixed(2)}, brain ${sample.brainMean.toFixed(1)}, dom ${(sample.dominantPct*100).toFixed(0)}%)`);
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
  console.log(`\n=== Long Diminishing Returns Benchmark ===`);
  console.log(`${NUM_TRIALS} trials x ${TOTAL_TICKS} ticks (matching gen-232 save timescale) at ${SIM_SPEED}x\n`);

  const results = [];

  for (let t = 0; t < NUM_TRIALS; t++) {
    const result = await runTrial(t + 1);
    results.push(result);

    const f = result.final;
    const predPct = f.deaths > 0 ? ((f.predationKills / f.deaths) * 100).toFixed(1) : '0.0';
    console.log(`  Trial ${t + 1} final: gen ${f.maxGen}, pop ${f.pop}${f.atCeiling ? ' CEILING' : ''}, species ${f.species}, dominant ${(f.dominantPct*100).toFixed(0)}%`);
    console.log(`    predation: ${f.predationKills} kills (${predPct}% of deaths)`);
    console.log(`    share: ${f.shareMean.toFixed(3)} (var ${f.shareVar.toFixed(3)}), coop pairs: ${f.coopPairs}`);
    console.log(`    brain: ${f.brainMean.toFixed(1)} [${f.brainMin}, ${f.brainMax}]`);
    console.log(`    size: ${f.sizeMean.toFixed(2)}, speed: ${f.speedMean.toFixed(2)}, diet: ${f.dietMean.toFixed(2)}, sense: ${f.senseMean.toFixed(0)}`);
  }

  // Aggregate
  console.log('\n=== Aggregate Results ===');
  const finals = results.map(r => r.final);
  const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const range = (arr) => `[${Math.min(...arr)}, ${Math.max(...arr)}]`;
  const stddev = (arr) => { const m = avg(arr); return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length); };

  const maxGens = finals.map(f => f.maxGen);
  const pops = finals.map(f => f.pop);
  const ceilings = finals.filter(f => f.atCeiling).length;
  const predPcts = finals.map(f => f.deaths > 0 ? (f.predationKills / f.deaths) * 100 : 0);
  const shareMs = finals.map(f => f.shareMean);
  const shareVs = finals.map(f => f.shareVar);
  const brains = finals.map(f => f.brainMean);
  const domPcts = finals.map(f => f.dominantPct * 100);
  const species = finals.map(f => f.species);
  const sizes = finals.map(f => f.sizeMean);

  console.log(`Max generation:   ${avg(maxGens).toFixed(0)} +/- ${stddev(maxGens).toFixed(0)} ${range(maxGens)}`);
  console.log(`Population:       ${avg(pops).toFixed(0)} ${range(pops)}`);
  console.log(`At ceiling:       ${ceilings}/${NUM_TRIALS} trials`);
  console.log(`Dominant species: ${avg(domPcts).toFixed(0)}% ${range(domPcts.map(v => +v.toFixed(0)))}`);
  console.log(`Species (>=2):    ${avg(species).toFixed(1)} ${range(species)}`);
  console.log(`Predation %:      ${avg(predPcts).toFixed(1)}% ${range(predPcts.map(v => +v.toFixed(1)))}`);
  console.log(`Share mean:       ${avg(shareMs).toFixed(3)} (var ${avg(shareVs).toFixed(3)})`);
  console.log(`Brain mean:       ${avg(brains).toFixed(1)} ${range(brains.map(v => +v.toFixed(1)))}`);
  console.log(`Size mean:        ${avg(sizes).toFixed(2)}`);

  // Evolution trajectory
  console.log('\n=== Evolution Trajectory (averaged across trials) ===');
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
    const ceil = valids.filter(s => s.atCeiling).length;
    const dom = avg(valids.map(s => s.dominantPct * 100));
    console.log(`  tick ${Math.round(tick).toString().padStart(6)}: gen ${gen.toFixed(0).padStart(3)}, pop ${pop.toFixed(0).padStart(3)}${ceil > 0 ? ' CEIL(' + ceil + ')' : '        '}, share ${share.toFixed(3)}, brain ${brain.toFixed(1)}, pred ${pred.toFixed(1)}%, dom ${dom.toFixed(0)}%`);
  }

  // Validation
  console.log('\n=== Validation vs Gen-232 Save Baseline ===');
  console.log('(Save baseline: pop 250 CEILING, 98.4% monoculture, share 0.82, brain 9.7, 0% predation)\n');

  const predPersists = avg(predPcts) > 2.0;
  console.log(`Predation > 2% at 200+ gen:  ${predPersists ? 'PASS' : 'FAIL'} (${avg(predPcts).toFixed(1)}%)`);

  const noCeiling = ceilings === 0;
  console.log(`Population not at ceiling:   ${noCeiling ? 'PASS' : 'FAIL'} (${ceilings}/${NUM_TRIALS} at ceiling)`);

  const noMonoculture = avg(domPcts) < 90;
  console.log(`No monoculture (<90% dom):   ${noMonoculture ? 'PASS' : 'FAIL'} (${avg(domPcts).toFixed(0)}% dominant)`);

  const brainHealthy = avg(brains) > 9.0;
  console.log(`Brain mean > 9.0:            ${brainHealthy ? 'PASS' : 'FAIL'} (${avg(brains).toFixed(1)})`);

  const stratDiversity = avg(shareVs) > 0.1;
  console.log(`Share variance > 0.1:        ${stratDiversity ? 'PASS' : 'FAIL'} (${avg(shareVs).toFixed(3)})`);

  const coopExists = avg(shareMs) > 0.15;
  console.log(`Cooperation persists (>0.15): ${coopExists ? 'PASS' : 'FAIL'} (${avg(shareMs).toFixed(3)})`);

  const passCount = [predPersists, noCeiling, noMonoculture, brainHealthy, stratDiversity, coopExists].filter(Boolean).length;
  console.log(`\nTotal: ${passCount}/6 criteria pass`);
}

main().catch(err => { console.error(err); process.exit(1); });
