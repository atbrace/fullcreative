// ================================================================
// Benchmark: Social Defense Selection Pressure
//
// Tests whether kin defense scaled by shareOut creates measurable
// selection pressure favoring higher share output over evolutionary time.
//
// Runs 5 trials of 54000 ticks (~15 min sim time), sampling every 6000 ticks.
// Measures shareOut evolution, fitness correlation, and effective kin defense.
//
// Usage: npx playwright test scripts/benchmark-social-defense.js
//   or:  node scripts/benchmark-social-defense.js
// ================================================================

const { chromium } = require('playwright');

const NUM_TRIALS = 5;
const TOTAL_TICKS = 54000;
const SAMPLE_INTERVAL = 6000;
const SAMPLES_PER_TRIAL = TOTAL_TICKS / SAMPLE_INTERVAL; // 9 samples (sampled at 6k, 12k, ..., 54k)
const SIM_SPEED = 32;
const POLL_INTERVAL_MS = 500;
const FILE_URL = 'file:///Users/austinbrace/Developer/fullcreative/emergence.html';

// Thresholds for success criteria
const MIN_SHARE_VARIANCE_INCREASE = 0.005; // variance should grow by at least this
const MIN_KIN_DEFENSE_BONUS = 0.02;        // mean effective kin defense bonus
const HIGH_SHARE_THRESHOLD = 0.6;
const LOW_SHARE_THRESHOLD = 0.4;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Collect a single sample from the running simulation
async function collectSample(page, lastPredationCount) {
  return page.evaluate(({ highThr, lowThr, lastPred }) => {
    const w = window.__world;
    if (!w) return null;

    const creatures = w.creatures.filter(c => c.alive);
    const n = creatures.length;
    if (n === 0) return null;

    // shareOut stats
    let shareSum = 0, shareSum2 = 0;
    let mateSum = 0, mateSum2 = 0;
    let highShareCount = 0, lowShareCount = 0;
    let highShareEnergySum = 0, lowShareEnergySum = 0;
    let genSum = 0;

    for (let i = 0; i < n; i++) {
      const c = creatures[i];
      shareSum += c.shareOut;
      shareSum2 += c.shareOut * c.shareOut;
      mateSum += c.mateOut;
      mateSum2 += c.mateOut * c.mateOut;
      genSum += c.generation;

      if (c.shareOut > highThr) {
        highShareCount++;
        highShareEnergySum += c.energy;
      }
      if (c.shareOut < lowThr) {
        lowShareCount++;
        lowShareEnergySum += c.energy;
      }
    }

    const shareMean = shareSum / n;
    const shareVariance = shareSum2 / n - shareMean * shareMean;
    const mateMean = mateSum / n;
    const mateVariance = mateSum2 / n - mateMean * mateMean;

    // Compute effective kin defense bonus across all creatures
    // Replicates the predation code logic for each creature as if it were prey
    const CFG = window.CFG || {
      KIN_DEFENSE_RANGE: 80,
      KIN_DEFENSE_PER_KIN: 0.03,
      KIN_DEFENSE_MAX: 0.15,
      KIN_DEFENSE_SHARE_FLOOR: 0.1,
    };
    let kinDefenseSum = 0;
    let kinDefenseCount = 0;

    for (let i = 0; i < n; i++) {
      const prey = creatures[i];
      const preyBucket = Math.floor(prey.genes.hue / 30) % 12;

      // Count kin within defense range
      let kinCount = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const ally = creatures[j];
        if (Math.floor(ally.genes.hue / 30) % 12 !== preyBucket) continue;
        const dx = prey.pos.x - ally.pos.x;
        const dy = prey.pos.y - ally.pos.y;
        if (Math.sqrt(dx * dx + dy * dy) < CFG.KIN_DEFENSE_RANGE) kinCount++;
      }

      const kinBonus = Math.min(kinCount * CFG.KIN_DEFENSE_PER_KIN, CFG.KIN_DEFENSE_MAX);
      const shareScale = Math.max(prey.shareOut, CFG.KIN_DEFENSE_SHARE_FLOOR);
      const effectiveBonus = kinBonus * shareScale;

      kinDefenseSum += effectiveBonus;
      kinDefenseCount++;
    }

    // Species count
    const speciesBuckets = new Set();
    for (let i = 0; i < n; i++) {
      speciesBuckets.add(Math.floor(creatures[i].genes.hue / 30) % 12);
    }

    const currentPredations = w.deaths; // total deaths as proxy (includes starvation)
    const predationsSinceLast = currentPredations - lastPred;

    return {
      tick: w.tick,
      population: n,
      speciesCount: speciesBuckets.size,
      meanGeneration: genSum / n,

      shareMean,
      shareVariance,
      mateMean,
      mateVariance,

      highSharePct: highShareCount / n,
      highShareMeanEnergy: highShareCount > 0 ? highShareEnergySum / highShareCount : 0,
      lowShareMeanEnergy: lowShareCount > 0 ? lowShareEnergySum / lowShareCount : 0,
      highShareCount,
      lowShareCount,

      meanKinDefenseBonus: kinDefenseCount > 0 ? kinDefenseSum / kinDefenseCount : 0,

      totalDeaths: currentPredations,
      predationsSinceLast: predationsSinceLast,
    };
  }, { highThr: HIGH_SHARE_THRESHOLD, lowThr: LOW_SHARE_THRESHOLD, lastPred: lastPredationCount });
}

async function runTrial(trialIndex) {
  console.log(`\n--- Trial ${trialIndex + 1}/${NUM_TRIALS} ---`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 },
  });
  const page = await context.newPage();

  // Suppress console noise from the simulation
  page.on('pageerror', () => {});

  await page.goto(FILE_URL, { waitUntil: 'load' });

  // Click overlay to start simulation
  await page.click('#overlay');
  await sleep(300);

  // Set simulation speed to max
  await page.evaluate((speed) => {
    // Directly set the speed variable in the main closure
    // The speed buttons use setSpeed() which is in an IIFE, so we click the button
    const btn = document.querySelector(`.spd-btn[data-speed="${speed}"]`);
    if (btn) btn.click();
  }, SIM_SPEED);

  await sleep(200);

  const samples = [];
  let lastDeathCount = 0;
  let nextSampleTick = SAMPLE_INTERVAL;

  console.log(`  Waiting for tick ${TOTAL_TICKS}...`);

  // Poll until we reach the total tick count, sampling at intervals
  while (true) {
    const currentTick = await page.evaluate(() => {
      const w = window.__world;
      return w ? w.tick : 0;
    });

    // Collect samples at each interval
    while (nextSampleTick <= TOTAL_TICKS && currentTick >= nextSampleTick) {
      const sample = await collectSample(page, lastDeathCount);
      if (sample) {
        lastDeathCount = sample.totalDeaths;
        samples.push(sample);
        const sampleNum = samples.length;
        console.log(
          `  Sample ${sampleNum}/${SAMPLES_PER_TRIAL} @ tick ${sample.tick}: ` +
          `pop=${sample.population}, share_mean=${sample.shareMean.toFixed(3)}, ` +
          `share_var=${sample.shareVariance.toFixed(4)}, kin_def=${sample.meanKinDefenseBonus.toFixed(4)}`
        );
      }
      nextSampleTick += SAMPLE_INTERVAL;
    }

    if (currentTick >= TOTAL_TICKS) break;

    await sleep(POLL_INTERVAL_MS);
  }

  // Collect final sample if we haven't yet
  if (samples.length < SAMPLES_PER_TRIAL) {
    const sample = await collectSample(page, lastDeathCount);
    if (sample) samples.push(sample);
  }

  await browser.close();
  return samples;
}

function analyzeResults(allTrials) {
  console.log('\n' + '='.repeat(72));
  console.log('  SOCIAL DEFENSE SELECTION PRESSURE BENCHMARK RESULTS');
  console.log('='.repeat(72));

  // Aggregate across trials
  const numTrials = allTrials.length;
  const numSamples = Math.min(...allTrials.map(t => t.length));

  if (numSamples < 2) {
    console.log('\nInsufficient samples collected. Benchmark inconclusive.');
    return false;
  }

  // Per-sample-index averages across trials
  const avgByIndex = [];
  for (let s = 0; s < numSamples; s++) {
    const agg = {
      tick: 0, population: 0, speciesCount: 0, meanGeneration: 0,
      shareMean: 0, shareVariance: 0, mateMean: 0, mateVariance: 0,
      highSharePct: 0, highShareMeanEnergy: 0, lowShareMeanEnergy: 0,
      meanKinDefenseBonus: 0, predationsSinceLast: 0,
    };
    let highEnergyTrials = 0, lowEnergyTrials = 0;

    for (let t = 0; t < numTrials; t++) {
      const sample = allTrials[t][s];
      agg.tick += sample.tick;
      agg.population += sample.population;
      agg.speciesCount += sample.speciesCount;
      agg.meanGeneration += sample.meanGeneration;
      agg.shareMean += sample.shareMean;
      agg.shareVariance += sample.shareVariance;
      agg.mateMean += sample.mateMean;
      agg.mateVariance += sample.mateVariance;
      agg.highSharePct += sample.highSharePct;
      agg.meanKinDefenseBonus += sample.meanKinDefenseBonus;
      agg.predationsSinceLast += sample.predationsSinceLast;
      if (sample.highShareCount > 0) {
        agg.highShareMeanEnergy += sample.highShareMeanEnergy;
        highEnergyTrials++;
      }
      if (sample.lowShareCount > 0) {
        agg.lowShareMeanEnergy += sample.lowShareMeanEnergy;
        lowEnergyTrials++;
      }
    }

    for (const key of Object.keys(agg)) {
      if (key === 'highShareMeanEnergy') {
        agg[key] = highEnergyTrials > 0 ? agg[key] / highEnergyTrials : 0;
      } else if (key === 'lowShareMeanEnergy') {
        agg[key] = lowEnergyTrials > 0 ? agg[key] / lowEnergyTrials : 0;
      } else {
        agg[key] /= numTrials;
      }
    }
    avgByIndex.push(agg);
  }

  // Print time series
  console.log('\nTime Series (averaged across ' + numTrials + ' trials):');
  console.log('-'.repeat(72));
  console.log(
    'Sample'.padEnd(8) +
    'Tick'.padEnd(8) +
    'Pop'.padEnd(6) +
    'Gen'.padEnd(7) +
    'ShareM'.padEnd(9) +
    'ShareV'.padEnd(9) +
    'MateM'.padEnd(9) +
    'HiShr%'.padEnd(9) +
    'KinDef'.padEnd(9)
  );
  console.log('-'.repeat(72));

  for (let s = 0; s < avgByIndex.length; s++) {
    const a = avgByIndex[s];
    console.log(
      `${s + 1}`.padEnd(8) +
      `${Math.round(a.tick)}`.padEnd(8) +
      `${Math.round(a.population)}`.padEnd(6) +
      `${a.meanGeneration.toFixed(1)}`.padEnd(7) +
      `${a.shareMean.toFixed(4)}`.padEnd(9) +
      `${a.shareVariance.toFixed(4)}`.padEnd(9) +
      `${a.mateMean.toFixed(4)}`.padEnd(9) +
      `${(a.highSharePct * 100).toFixed(1)}%`.padEnd(9) +
      `${a.meanKinDefenseBonus.toFixed(4)}`.padEnd(9)
    );
  }

  // Compute key metrics
  const first = avgByIndex[0];
  const last = avgByIndex[avgByIndex.length - 1];

  const shareVarianceChange = last.shareVariance - first.shareVariance;
  const shareMeanChange = last.shareMean - first.shareMean;
  const mateMeanChange = last.mateMean - first.mateMean;

  // Linear regression on shareMean over sample indices
  const n = avgByIndex.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += avgByIndex[i].shareMean;
    sumXY += i * avgByIndex[i].shareMean;
    sumX2 += i * i;
  }
  const shareSlope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  // Same for mateMean (control)
  let mateSumY = 0, mateSumXY = 0;
  for (let i = 0; i < n; i++) {
    mateSumY += avgByIndex[i].mateMean;
    mateSumXY += i * avgByIndex[i].mateMean;
  }
  const mateSlope = (n * mateSumXY - sumX * mateSumY) / (n * sumX2 - sumX * sumX);

  // Energy advantage: average across all samples of (high-share energy - low-share energy)
  let energyAdvantageSum = 0;
  let energyAdvantageSamples = 0;
  for (let s = 0; s < avgByIndex.length; s++) {
    const a = avgByIndex[s];
    if (a.highShareMeanEnergy > 0 && a.lowShareMeanEnergy > 0) {
      energyAdvantageSum += a.highShareMeanEnergy - a.lowShareMeanEnergy;
      energyAdvantageSamples++;
    }
  }
  const meanEnergyAdvantage = energyAdvantageSamples > 0
    ? energyAdvantageSum / energyAdvantageSamples : 0;

  // Mean kin defense bonus across all samples
  let totalKinDefense = 0;
  for (let s = 0; s < avgByIndex.length; s++) {
    totalKinDefense += avgByIndex[s].meanKinDefenseBonus;
  }
  const overallMeanKinDefense = totalKinDefense / avgByIndex.length;

  // Per-trial metrics for confidence
  const trialShareSlopes = [];
  const trialKinDefenses = [];
  for (let t = 0; t < numTrials; t++) {
    const trial = allTrials[t];
    const tn = trial.length;
    let tSumX = 0, tSumY = 0, tSumXY = 0, tSumX2 = 0;
    let tKinSum = 0;
    for (let i = 0; i < tn; i++) {
      tSumX += i;
      tSumY += trial[i].shareMean;
      tSumXY += i * trial[i].shareMean;
      tSumX2 += i * i;
      tKinSum += trial[i].meanKinDefenseBonus;
    }
    trialShareSlopes.push((tn * tSumXY - tSumX * tSumY) / (tn * tSumX2 - tSumX * tSumX));
    trialKinDefenses.push(tKinSum / tn);
  }

  const positiveSlopes = trialShareSlopes.filter(s => s > 0).length;

  // Print analysis
  console.log('\n' + '='.repeat(72));
  console.log('  KEY METRICS');
  console.log('='.repeat(72));

  console.log(`\n  Share output mean (first sample):     ${first.shareMean.toFixed(4)}`);
  console.log(`  Share output mean (last sample):      ${last.shareMean.toFixed(4)}`);
  console.log(`  Share output mean change:             ${shareMeanChange >= 0 ? '+' : ''}${shareMeanChange.toFixed(4)}`);
  console.log(`  Share output slope (per sample):      ${shareSlope >= 0 ? '+' : ''}${shareSlope.toFixed(5)}`);
  console.log(`  Mate output slope (control):          ${mateSlope >= 0 ? '+' : ''}${mateSlope.toFixed(5)}`);
  console.log(`\n  Share variance (first sample):        ${first.shareVariance.toFixed(4)}`);
  console.log(`  Share variance (last sample):         ${last.shareVariance.toFixed(4)}`);
  console.log(`  Share variance change:                ${shareVarianceChange >= 0 ? '+' : ''}${shareVarianceChange.toFixed(4)}`);
  console.log(`\n  Mean kin defense bonus (overall):      ${overallMeanKinDefense.toFixed(4)}`);
  console.log(`  High-share energy advantage:          ${meanEnergyAdvantage >= 0 ? '+' : ''}${meanEnergyAdvantage.toFixed(2)}`);
  console.log(`\n  Trials with positive share slope:     ${positiveSlopes}/${numTrials}`);
  console.log(`  Per-trial slopes:                     [${trialShareSlopes.map(s => s.toFixed(5)).join(', ')}]`);
  console.log(`  Per-trial kin defense:                [${trialKinDefenses.map(d => d.toFixed(4)).join(', ')}]`);

  // Evaluate success criteria
  console.log('\n' + '='.repeat(72));
  console.log('  SUCCESS CRITERIA');
  console.log('='.repeat(72));

  const criteria = [];

  // 1. Share variance should increase (evolution differentiating)
  const variancePass = shareVarianceChange > MIN_SHARE_VARIANCE_INCREASE;
  criteria.push({
    name: 'Share variance increases over time',
    pass: variancePass,
    detail: `change=${shareVarianceChange.toFixed(4)} (threshold: >${MIN_SHARE_VARIANCE_INCREASE})`,
  });

  // 2. Share mean should trend upward (selection favoring sharers)
  const shareTrendPass = shareSlope > 0;
  criteria.push({
    name: 'Share output mean trends upward',
    pass: shareTrendPass,
    detail: `slope=${shareSlope.toFixed(5)} per sample`,
  });

  // 3. High-shareOut creatures should have higher energy (fitness advantage)
  const fitnessPass = meanEnergyAdvantage > 0;
  criteria.push({
    name: 'High-share creatures have energy advantage',
    pass: fitnessPass,
    detail: `advantage=${meanEnergyAdvantage.toFixed(2)} energy units`,
  });

  // 4. Kin defense bonus should be non-trivial
  const kinDefensePass = overallMeanKinDefense > MIN_KIN_DEFENSE_BONUS;
  criteria.push({
    name: 'Kin defense bonus is non-trivial',
    pass: kinDefensePass,
    detail: `mean=${overallMeanKinDefense.toFixed(4)} (threshold: >${MIN_KIN_DEFENSE_BONUS})`,
  });

  // 5. Majority of trials show positive share slope (robustness)
  const majorityPass = positiveSlopes > numTrials / 2;
  criteria.push({
    name: 'Majority of trials show positive share trend',
    pass: majorityPass,
    detail: `${positiveSlopes}/${numTrials} trials`,
  });

  // 6. Share slope should exceed mate slope (differential selection, not drift)
  const differentialPass = shareSlope > mateSlope;
  criteria.push({
    name: 'Share selection exceeds mate (control) drift',
    pass: differentialPass,
    detail: `share_slope=${shareSlope.toFixed(5)} vs mate_slope=${mateSlope.toFixed(5)}`,
  });

  let allPass = true;
  for (const c of criteria) {
    const mark = c.pass ? 'PASS' : 'FAIL';
    console.log(`\n  [${mark}] ${c.name}`);
    console.log(`         ${c.detail}`);
    if (!c.pass) allPass = false;
  }

  console.log('\n' + '='.repeat(72));
  if (allPass) {
    console.log('  OVERALL: ALL CRITERIA PASSED');
    console.log('  Social defense creates measurable selection pressure for share output.');
  } else {
    const passCount = criteria.filter(c => c.pass).length;
    console.log(`  OVERALL: ${passCount}/${criteria.length} CRITERIA PASSED`);
    if (passCount >= 4) {
      console.log('  Partial evidence of selection pressure. May need longer runs or tuning.');
    } else {
      console.log('  Insufficient evidence of selection pressure from social defense mechanic.');
    }
  }
  console.log('='.repeat(72) + '\n');

  return allPass;
}

async function main() {
  console.log('Social Defense Selection Pressure Benchmark');
  console.log(`Trials: ${NUM_TRIALS}, Ticks per trial: ${TOTAL_TICKS}, Sample interval: ${SAMPLE_INTERVAL}`);
  console.log(`Sim speed: ${SIM_SPEED}x, Samples per trial: ${SAMPLES_PER_TRIAL}`);
  console.log(`High share threshold: >${HIGH_SHARE_THRESHOLD}, Low share threshold: <${LOW_SHARE_THRESHOLD}`);

  const allTrials = [];

  for (let t = 0; t < NUM_TRIALS; t++) {
    try {
      const samples = await runTrial(t);
      allTrials.push(samples);
      console.log(`  Trial ${t + 1} complete: ${samples.length} samples collected`);
    } catch (err) {
      console.error(`  Trial ${t + 1} failed: ${err.message}`);
      // Continue with remaining trials
    }
  }

  if (allTrials.length === 0) {
    console.error('All trials failed. No results to analyze.');
    process.exit(1);
  }

  const passed = analyzeResults(allTrials);
  process.exit(passed ? 0 : 1);
}

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
