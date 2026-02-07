// ================================================================
// Benchmark: Evolvable Pheromone Deposition Rate
//
// Tests whether the phDeposit gene evolves meaningfully and doesn't
// regress ecosystem health. 10 trials x 54000 ticks.
//
// Usage: node scripts/benchmark-phdep.js
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

    let genSum = 0, phSum = 0, phSum2 = 0, phMin = 1, phMax = 0;
    let sizeSum = 0, brainSum = 0, senseSum = 0, speedSum = 0;
    let shareSum = 0;

    for (let i = 0; i < n; i++) {
      const c = creatures[i];
      const g = c.genes;
      genSum += c.generation;
      phSum += g.phDeposit;
      phSum2 += g.phDeposit * g.phDeposit;
      if (g.phDeposit < phMin) phMin = g.phDeposit;
      if (g.phDeposit > phMax) phMax = g.phDeposit;
      sizeSum += g.size;
      brainSum += g.brainSize;
      senseSum += g.senseRange;
      speedSum += g.speedGene;
      shareSum += c.shareOut;
    }

    const phMean = phSum / n;
    const phVariance = phSum2 / n - phMean * phMean;

    const speciesBuckets = new Set();
    for (let i = 0; i < n; i++) {
      speciesBuckets.add(Math.floor(creatures[i].genes.hue / 30) % 12);
    }

    return {
      tick: w.tick,
      population: n,
      speciesCount: speciesBuckets.size,
      meanGeneration: genSum / n,
      phMean,
      phVariance,
      phMin,
      phMax,
      phRange: phMax - phMin,
      sizeMean: sizeSum / n,
      brainMean: brainSum / n,
      senseMean: senseSum / n,
      speedMean: speedSum / n,
      shareMean: shareSum / n,
      births: w.births || 0,
      deaths: w.deaths || 0,
    };
  });
}

async function runTrial(trialIndex) {
  console.log(`\n--- Trial ${trialIndex + 1}/${NUM_TRIALS} ---`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();
  page.on('pageerror', () => {});

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
          `pop=${sample.population} gen=${sample.meanGeneration.toFixed(1)} ` +
          `ph=${sample.phMean.toFixed(3)} var=${sample.phVariance.toFixed(5)} ` +
          `range=[${sample.phMin.toFixed(2)}, ${sample.phMax.toFixed(2)}]`
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

function linearSlope(values) {
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i; sumY += values[i]; sumXY += i * values[i]; sumX2 += i * i;
  }
  return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
}

function analyzeResults(allTrials) {
  console.log('\n' + '='.repeat(76));
  console.log('  EVOLVABLE PHEROMONE DEPOSITION BENCHMARK RESULTS');
  console.log('='.repeat(76));

  const numTrials = allTrials.length;
  const numSamples = Math.min(...allTrials.map(t => t.length));

  if (numSamples < 2) {
    console.log('\nInsufficient samples.');
    return false;
  }

  // Aggregate
  const avgByIndex = [];
  for (let s = 0; s < numSamples; s++) {
    const agg = {
      tick: 0, population: 0, speciesCount: 0, meanGeneration: 0,
      phMean: 0, phVariance: 0, phMin: 0, phMax: 0, phRange: 0,
      sizeMean: 0, brainMean: 0, senseMean: 0, speedMean: 0, shareMean: 0,
    };
    for (let t = 0; t < numTrials; t++) {
      const sample = allTrials[t][s];
      for (const key of Object.keys(agg)) agg[key] += sample[key];
    }
    for (const key of Object.keys(agg)) agg[key] /= numTrials;
    avgByIndex.push(agg);
  }

  // Print time series
  console.log('\nTime Series (averaged across ' + numTrials + ' trials):');
  console.log('-'.repeat(76));
  console.log(
    'Sam'.padEnd(5) + 'Tick'.padEnd(8) + 'Pop'.padEnd(6) + 'Gen'.padEnd(7) +
    'phMean'.padEnd(8) + 'phVar'.padEnd(9) + 'phMin'.padEnd(7) + 'phMax'.padEnd(7) +
    'brain'.padEnd(7) + 'share'.padEnd(7)
  );
  console.log('-'.repeat(76));

  for (let s = 0; s < avgByIndex.length; s++) {
    const a = avgByIndex[s];
    console.log(
      `${s + 1}`.padEnd(5) +
      `${Math.round(a.tick)}`.padEnd(8) +
      `${Math.round(a.population)}`.padEnd(6) +
      `${a.meanGeneration.toFixed(1)}`.padEnd(7) +
      `${a.phMean.toFixed(4)}`.padEnd(8) +
      `${a.phVariance.toFixed(5)}`.padEnd(9) +
      `${a.phMin.toFixed(2)}`.padEnd(7) +
      `${a.phMax.toFixed(2)}`.padEnd(7) +
      `${a.brainMean.toFixed(1)}`.padEnd(7) +
      `${a.shareMean.toFixed(3)}`.padEnd(7)
    );
  }

  const first = avgByIndex[0];
  const last = avgByIndex[avgByIndex.length - 1];
  const phSlope = linearSlope(avgByIndex.map(a => a.phMean));
  const phVarSlope = linearSlope(avgByIndex.map(a => a.phVariance));

  // Per-trial final phDeposit stats
  const trialFinalPh = allTrials.map(t => t[t.length - 1].phMean);
  const trialFinalPhRange = allTrials.map(t => t[t.length - 1].phRange);
  const trialFinalGen = allTrials.map(t => t[t.length - 1].meanGeneration);

  console.log('\n' + '='.repeat(76));
  console.log('  KEY METRICS');
  console.log('='.repeat(76));

  console.log(`\n  phDeposit mean (first):           ${first.phMean.toFixed(4)}`);
  console.log(`  phDeposit mean (last):            ${last.phMean.toFixed(4)}`);
  console.log(`  phDeposit mean change:            ${(last.phMean - first.phMean) >= 0 ? '+' : ''}${(last.phMean - first.phMean).toFixed(4)}`);
  console.log(`  phDeposit slope:                  ${phSlope >= 0 ? '+' : ''}${phSlope.toFixed(6)}`);
  console.log(`\n  phDeposit variance (first):        ${first.phVariance.toFixed(5)}`);
  console.log(`  phDeposit variance (last):         ${last.phVariance.toFixed(5)}`);
  console.log(`  Variance slope:                    ${phVarSlope >= 0 ? '+' : ''}${phVarSlope.toFixed(6)}`);
  console.log(`\n  phDeposit range (last):            [${last.phMin.toFixed(2)}, ${last.phMax.toFixed(2)}]`);
  console.log(`  Mean generation (last):            ${last.meanGeneration.toFixed(1)}`);
  console.log(`  Population (last):                 ${Math.round(last.population)}`);
  console.log(`  Share mean (last):                 ${last.shareMean.toFixed(3)}`);
  console.log(`\n  Per-trial final phMean:    [${trialFinalPh.map(v => v.toFixed(3)).join(', ')}]`);
  console.log(`  Per-trial final phRange:   [${trialFinalPhRange.map(v => v.toFixed(2)).join(', ')}]`);
  console.log(`  Per-trial final gen:       [${trialFinalGen.map(v => v.toFixed(0)).join(', ')}]`);

  // Success criteria
  console.log('\n' + '='.repeat(76));
  console.log('  SUCCESS CRITERIA');
  console.log('='.repeat(76));

  const criteria = [];

  // 1. Gene evolves away from default (mean changes by > 0.02 from 0.25)
  const phChange = Math.abs(last.phMean - 0.25);
  criteria.push({
    name: 'phDeposit evolves away from default (0.25)',
    pass: phChange > 0.02,
    detail: `final mean=${last.phMean.toFixed(4)}, change from default=${phChange.toFixed(4)} (threshold: >0.02)`,
  });

  // 2. Gene shows variance (not converging to single value)
  criteria.push({
    name: 'phDeposit shows genetic diversity',
    pass: last.phVariance > 0.001,
    detail: `final variance=${last.phVariance.toFixed(5)} (threshold: >0.001)`,
  });

  // 3. Gene range is meaningful (min-max spread > 0.05)
  criteria.push({
    name: 'phDeposit range > 0.05 (phenotypic diversity)',
    pass: last.phRange > 0.05,
    detail: `range=${last.phRange.toFixed(3)} [${last.phMin.toFixed(2)}, ${last.phMax.toFixed(2)}]`,
  });

  // 4. No regression: generation > 30
  criteria.push({
    name: 'No regression: generation > 30',
    pass: last.meanGeneration > 30,
    detail: `final gen=${last.meanGeneration.toFixed(1)}`,
  });

  // 5. No regression: sharing maintained (>0.35)
  criteria.push({
    name: 'No regression: share mean > 0.35',
    pass: last.shareMean > 0.35,
    detail: `share mean=${last.shareMean.toFixed(3)}`,
  });

  // 6. Per-trial robustness: >70% of trials reach gen > 25
  const robustTrials = trialFinalGen.filter(g => g > 25).length;
  criteria.push({
    name: 'Robustness: >70% of trials reach gen > 25',
    pass: robustTrials >= numTrials * 0.7,
    detail: `${robustTrials}/${numTrials} trials`,
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
    console.log('  Evolvable pheromone deposition works and doesn\'t regress ecosystem.');
  } else {
    console.log(`  OVERALL: ${passCount}/${criteria.length} CRITERIA PASSED`);
  }
  console.log('='.repeat(76) + '\n');

  return allPass;
}

async function main() {
  console.log('Evolvable Pheromone Deposition Benchmark');
  console.log(`Trials: ${NUM_TRIALS}, Ticks: ${TOTAL_TICKS}, Interval: ${SAMPLE_INTERVAL}`);

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
