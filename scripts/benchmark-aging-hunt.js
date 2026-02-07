// ================================================================
// Benchmark: Aging/Senescence + Cooperative Hunting
//
// Tests that aging creates generational turnover without crashing
// the ecosystem, and that cooperative hunting produces measurable
// pack predation. 10 trials x 54000 ticks.
//
// Usage: node scripts/benchmark-aging-hunt.js
// ================================================================

const { chromium } = require('playwright');

const NUM_TRIALS = 10;
const TOTAL_TICKS = 54000;
const SAMPLE_INTERVAL = 6000;
const SAMPLES_PER_TRIAL = TOTAL_TICKS / SAMPLE_INTERVAL;
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

    let genSum = 0, ageSum = 0, maxAge = 0;
    let sizeSum = 0, brainSum = 0, senseSum = 0, speedSum = 0;
    let shareSum = 0, phDepositSum = 0;
    let agingCreatures = 0; // creatures past AGING_ONSET

    const _CFG = typeof CFG !== 'undefined' ? CFG : {};
    const AGING_ONSET = _CFG.AGING_ONSET || 3000;
    const COOP_HUNT_RANGE = _CFG.COOP_HUNT_RANGE || 60;

    for (let i = 0; i < n; i++) {
      const c = creatures[i];
      const g = c.genes;
      genSum += c.generation;
      ageSum += c.age;
      if (c.age > maxAge) maxAge = c.age;
      if (c.age > AGING_ONSET) agingCreatures++;
      sizeSum += g.size;
      brainSum += g.brainSize;
      senseSum += g.senseRange;
      speedSum += g.speedGene;
      shareSum += c.shareOut;
      phDepositSum += g.phDeposit;
    }

    // Count pack hunting potential: for each creature, count how many
    // have kin within COOP_HUNT_RANGE (pack formation metric)
    let packCreatures = 0;
    for (let i = 0; i < n; i++) {
      const c = creatures[i];
      const cBucket = Math.floor(c.genes.hue / 30) % 12;
      let hasPackKin = false;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const ally = creatures[j];
        if (Math.floor(ally.genes.hue / 30) % 12 !== cBucket) continue;
        const dx = c.pos.x - ally.pos.x;
        const dy = c.pos.y - ally.pos.y;
        if (Math.sqrt(dx * dx + dy * dy) < COOP_HUNT_RANGE) {
          hasPackKin = true;
          break;
        }
      }
      if (hasPackKin) packCreatures++;
    }

    // Species count
    const speciesBuckets = new Set();
    for (let i = 0; i < n; i++) {
      speciesBuckets.add(Math.floor(creatures[i].genes.hue / 30) % 12);
    }

    return {
      tick: w.tick,
      population: n,
      speciesCount: speciesBuckets.size,
      meanGeneration: genSum / n,
      maxGeneration: w.maxGen,
      meanAge: ageSum / n,
      maxAge,
      maxAgeSeconds: maxAge / 60,
      agingPct: agingCreatures / n,
      births: w.births,
      sexualBirths: w.sexualBirths,
      deaths: w.deaths,
      packRate: packCreatures / n,
      shareMean: shareSum / n,
      sizeMean: sizeSum / n,
      brainMean: brainSum / n,
      senseMean: senseSum / n,
      speedMean: speedSum / n,
      phDepositMean: phDepositSum / n,
    };
  });
}

async function runTrial(trialIndex) {
  console.log(`\n--- Trial ${trialIndex + 1}/${NUM_TRIALS} ---`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();
  page.on('pageerror', (err) => console.error(`  Page error: ${err.message}`));

  await page.goto(FILE_URL, { waitUntil: 'load' });
  await page.click('#overlay');
  await sleep(300);

  await page.evaluate((speed) => {
    const btn = document.querySelector(`.spd-btn[data-speed="${speed}"]`);
    if (btn) btn.click();
  }, SIM_SPEED);
  await sleep(200);

  const samples = [];
  let nextSampleTick = SAMPLE_INTERVAL;

  console.log(`  Running ${TOTAL_TICKS} ticks...`);

  while (true) {
    const currentTick = await page.evaluate(() => {
      const w = window.__world;
      return w ? w.tick : 0;
    });

    while (nextSampleTick <= TOTAL_TICKS && currentTick >= nextSampleTick) {
      const sample = await collectSample(page);
      if (sample) {
        samples.push(sample);
        console.log(
          `  [${samples.length}/${SAMPLES_PER_TRIAL}] tick=${sample.tick} ` +
          `pop=${sample.population} gen=${sample.maxGeneration} ` +
          `maxAge=${sample.maxAgeSeconds.toFixed(1)}s ` +
          `aging=${(sample.agingPct * 100).toFixed(1)}% ` +
          `pack=${(sample.packRate * 100).toFixed(1)}%`
        );
      }
      nextSampleTick += SAMPLE_INTERVAL;
    }

    if (currentTick >= TOTAL_TICKS) break;
    await sleep(POLL_INTERVAL_MS);
  }

  if (samples.length < SAMPLES_PER_TRIAL) {
    const sample = await collectSample(page);
    if (sample) samples.push(sample);
  }

  await browser.close();
  return samples;
}

function analyzeResults(allTrials) {
  console.log('\n' + '='.repeat(76));
  console.log('  AGING + COOPERATIVE HUNTING BENCHMARK RESULTS');
  console.log('='.repeat(76));

  const numTrials = allTrials.length;
  const numSamples = Math.min(...allTrials.map(t => t.length));

  if (numSamples < 2) {
    console.log('\nInsufficient samples. Benchmark inconclusive.');
    return false;
  }

  // Per-trial final stats
  const trialFinals = allTrials.map(t => t[t.length - 1]);

  const finalGens = trialFinals.map(s => s.maxGeneration);
  const finalPops = trialFinals.map(s => s.population);
  const finalMaxAges = trialFinals.map(s => s.maxAgeSeconds);
  const finalMeanAges = trialFinals.map(s => s.meanAge / 60); // convert to seconds
  const finalAgingPcts = trialFinals.map(s => s.agingPct);
  const finalBirths = trialFinals.map(s => s.births);
  const finalDeaths = trialFinals.map(s => s.deaths);
  const finalPackRates = trialFinals.map(s => s.packRate);
  const finalShareMeans = trialFinals.map(s => s.shareMean);
  const finalSpecies = trialFinals.map(s => s.speciesCount);

  const avg = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
  const stddev = arr => { const m = avg(arr); return Math.sqrt(arr.reduce((s, v) => s + (v - m) * (v - m), 0) / arr.length); };
  const min = arr => Math.min(...arr);
  const max = arr => Math.max(...arr);

  // Time series averages
  console.log('\nTime Series (averaged across ' + numTrials + ' trials):');
  console.log('-'.repeat(76));
  console.log(
    'Sam'.padEnd(5) + 'Tick'.padEnd(8) + 'Pop'.padEnd(6) + 'Gen'.padEnd(7) +
    'MaxAge'.padEnd(8) + 'MnAge'.padEnd(8) + 'Aging%'.padEnd(8) +
    'Pack%'.padEnd(8) + 'Share'.padEnd(8) + 'Births'.padEnd(8)
  );
  console.log('-'.repeat(76));

  for (let s = 0; s < numSamples; s++) {
    const vals = allTrials.map(t => t[s]);
    const aPop = avg(vals.map(v => v.population));
    const aTick = avg(vals.map(v => v.tick));
    const aGen = avg(vals.map(v => v.maxGeneration));
    const aMaxAge = avg(vals.map(v => v.maxAgeSeconds));
    const aMeanAge = avg(vals.map(v => v.meanAge / 60));
    const aAging = avg(vals.map(v => v.agingPct));
    const aPack = avg(vals.map(v => v.packRate));
    const aShare = avg(vals.map(v => v.shareMean));
    const aBirths = avg(vals.map(v => v.births));

    console.log(
      `${s + 1}`.padEnd(5) +
      `${Math.round(aTick)}`.padEnd(8) +
      `${Math.round(aPop)}`.padEnd(6) +
      `${aGen.toFixed(0)}`.padEnd(7) +
      `${aMaxAge.toFixed(1)}s`.padEnd(8) +
      `${aMeanAge.toFixed(1)}s`.padEnd(8) +
      `${(aAging * 100).toFixed(1)}%`.padEnd(8) +
      `${(aPack * 100).toFixed(1)}%`.padEnd(8) +
      `${aShare.toFixed(3)}`.padEnd(8) +
      `${Math.round(aBirths)}`.padEnd(8)
    );
  }

  // Summary stats
  console.log('\n' + '='.repeat(76));
  console.log('  SUMMARY (final sample, across ' + numTrials + ' trials)');
  console.log('='.repeat(76));

  console.log(`\n  Generation:        ${avg(finalGens).toFixed(1)} +/- ${stddev(finalGens).toFixed(1)} [${min(finalGens)}, ${max(finalGens)}]`);
  console.log(`  Population:        ${avg(finalPops).toFixed(1)} +/- ${stddev(finalPops).toFixed(1)} [${min(finalPops)}, ${max(finalPops)}]`);
  console.log(`  Max oldest (s):    ${avg(finalMaxAges).toFixed(1)} +/- ${stddev(finalMaxAges).toFixed(1)} [${min(finalMaxAges).toFixed(1)}, ${max(finalMaxAges).toFixed(1)}]`);
  console.log(`  Mean age (s):      ${avg(finalMeanAges).toFixed(1)} +/- ${stddev(finalMeanAges).toFixed(1)}`);
  console.log(`  Aging creatures:   ${(avg(finalAgingPcts) * 100).toFixed(1)}%`);
  console.log(`  Total births:      ${avg(finalBirths).toFixed(0)} +/- ${stddev(finalBirths).toFixed(0)}`);
  console.log(`  Total deaths:      ${avg(finalDeaths).toFixed(0)} +/- ${stddev(finalDeaths).toFixed(0)}`);
  console.log(`  B/D ratio:         ${(avg(finalBirths) / avg(finalDeaths)).toFixed(3)}`);
  console.log(`  Pack rate:         ${(avg(finalPackRates) * 100).toFixed(1)}%`);
  console.log(`  Share mean:        ${avg(finalShareMeans).toFixed(3)}`);
  console.log(`  Species:           ${avg(finalSpecies).toFixed(1)}`);

  // Per-trial details
  console.log(`\n  Per-trial generations: [${finalGens.join(', ')}]`);
  console.log(`  Per-trial max age (s): [${finalMaxAges.map(a => a.toFixed(1)).join(', ')}]`);
  console.log(`  Per-trial pack rate:   [${finalPackRates.map(r => (r * 100).toFixed(1) + '%').join(', ')}]`);
  console.log(`  Per-trial births:      [${finalBirths.join(', ')}]`);

  // Trait evolution (first vs last sample averages)
  const firstTraits = allTrials.map(t => t[0]);
  const lastTraits = allTrials.map(t => t[t.length - 1]);
  console.log('\n  Trait evolution (first -> last):');
  console.log(`    Brain:   ${avg(firstTraits.map(s => s.brainMean)).toFixed(2)} -> ${avg(lastTraits.map(s => s.brainMean)).toFixed(2)}`);
  console.log(`    Size:    ${avg(firstTraits.map(s => s.sizeMean)).toFixed(2)} -> ${avg(lastTraits.map(s => s.sizeMean)).toFixed(2)}`);
  console.log(`    Speed:   ${avg(firstTraits.map(s => s.speedMean)).toFixed(2)} -> ${avg(lastTraits.map(s => s.speedMean)).toFixed(2)}`);
  console.log(`    Sense:   ${avg(firstTraits.map(s => s.senseMean)).toFixed(1)} -> ${avg(lastTraits.map(s => s.senseMean)).toFixed(1)}`);
  console.log(`    phDep:   ${avg(firstTraits.map(s => s.phDepositMean)).toFixed(3)} -> ${avg(lastTraits.map(s => s.phDepositMean)).toFixed(3)}`);

  // Success criteria
  console.log('\n' + '='.repeat(76));
  console.log('  SUCCESS CRITERIA');
  console.log('='.repeat(76));

  const criteria = [];

  // 1. Generation advancement: >= 30 (no regression from baseline ~50-75)
  criteria.push({
    name: 'Generation advancement >= 30',
    pass: avg(finalGens) >= 30,
    detail: `avg gen=${avg(finalGens).toFixed(1)} (threshold: >=30)`,
  });

  // 2. Max oldest should be capped by aging (< 120s, was 106-132s without aging)
  criteria.push({
    name: 'Aging caps maximum lifespan',
    pass: avg(finalMaxAges) < 120,
    detail: `avg max oldest=${avg(finalMaxAges).toFixed(1)}s (threshold: <120s)`,
  });

  // 3. Some creatures reach aging onset (aging is reachable, not too aggressive)
  criteria.push({
    name: 'Aging onset is reachable (>0.5% aging)',
    pass: avg(finalAgingPcts) > 0.005,
    detail: `avg aging pct=${(avg(finalAgingPcts) * 100).toFixed(2)}%`,
  });

  // 4. Population stable (no crashes): avg pop > 20
  criteria.push({
    name: 'Population stability (avg > 20)',
    pass: avg(finalPops) > 20,
    detail: `avg pop=${avg(finalPops).toFixed(1)}`,
  });

  // 5. Pack formation rate > 10% (creatures have hunting kin nearby)
  criteria.push({
    name: 'Pack formation rate > 10%',
    pass: avg(finalPackRates) > 0.10,
    detail: `avg pack rate=${(avg(finalPackRates) * 100).toFixed(1)}%`,
  });

  // 6. Births > 150 (turnover is healthy)
  criteria.push({
    name: 'Healthy turnover (births > 150)',
    pass: avg(finalBirths) > 150,
    detail: `avg births=${avg(finalBirths).toFixed(0)}`,
  });

  // 7. All trials produce gen > 15 (robustness)
  const robustTrials = finalGens.filter(g => g > 15).length;
  criteria.push({
    name: 'Robustness: all trials gen > 15',
    pass: robustTrials === numTrials,
    detail: `${robustTrials}/${numTrials} trials pass`,
  });

  // 8. Cooperation rate maintained (share mean > 0.3)
  criteria.push({
    name: 'Cooperation maintained (share > 0.3)',
    pass: avg(finalShareMeans) > 0.3,
    detail: `avg share mean=${avg(finalShareMeans).toFixed(3)}`,
  });

  let allPass = true;
  for (const c of criteria) {
    const mark = c.pass ? 'PASS' : 'FAIL';
    console.log(`\n  [${mark}] ${c.name}`);
    console.log(`         ${c.detail}`);
    if (!c.pass) allPass = false;
  }

  const passCount = criteria.filter(c => c.pass).length;
  console.log('\n' + '='.repeat(76));
  if (allPass) {
    console.log('  OVERALL: ALL CRITERIA PASSED');
  } else {
    console.log(`  OVERALL: ${passCount}/${criteria.length} CRITERIA PASSED`);
  }
  console.log('='.repeat(76) + '\n');

  return allPass;
}

async function main() {
  console.log('Aging + Cooperative Hunting Benchmark');
  console.log(`Trials: ${NUM_TRIALS}, Ticks: ${TOTAL_TICKS}, Interval: ${SAMPLE_INTERVAL}`);
  console.log(`Speed: ${SIM_SPEED}x, Samples/trial: ${SAMPLES_PER_TRIAL}`);

  const allTrials = [];

  for (let t = 0; t < NUM_TRIALS; t++) {
    try {
      const samples = await runTrial(t);
      allTrials.push(samples);
      console.log(`  Trial ${t + 1} done: ${samples.length} samples`);
    } catch (err) {
      console.error(`  Trial ${t + 1} FAILED: ${err.message}`);
    }
  }

  if (allTrials.length === 0) {
    console.error('All trials failed.');
    process.exit(1);
  }

  const passed = analyzeResults(allTrials);
  process.exit(passed ? 0 : 1);
}

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
