// ================================================================
// Benchmark: Cooperative Sharing Economics
//
// Tests whether the redesigned sharing economics (kin-only sharing +
// cooperative foraging bonus) create selection pressure for shareOut
// to evolve upward.
//
// 10 trials x 54000 ticks (~15 min sim time), sampled every 6000 ticks.
//
// Usage: npx playwright test scripts/benchmark-coop.js
//   or:  node scripts/benchmark-coop.js
// ================================================================

const { chromium } = require('playwright');

const NUM_TRIALS = 10;
const TOTAL_TICKS = 54000;
const SAMPLE_INTERVAL = 6000;
const SAMPLES_PER_TRIAL = TOTAL_TICKS / SAMPLE_INTERVAL;
const SIM_SPEED = 32;
const POLL_INTERVAL_MS = 500;
const FILE_URL = 'file:///Users/austinbrace/Developer/fullcreative/emergence.html';

const HIGH_SHARE_THRESHOLD = 0.5;
const LOW_SHARE_THRESHOLD = 0.3;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function collectSample(page, lastPredationCount) {
  return page.evaluate(({ highThr, lowThr, lastPred }) => {
    const w = window.__world;
    if (!w) return null;

    const creatures = w.creatures.filter(c => c.alive);
    const n = creatures.length;
    if (n === 0) return null;

    let shareSum = 0, shareSum2 = 0;
    let mateSum = 0, mateSum2 = 0;
    let highShareCount = 0, lowShareCount = 0;
    let highShareEnergySum = 0, lowShareEnergySum = 0;
    let genSum = 0;
    let coopCreatureCount = 0;

    const _CFG = typeof CFG !== 'undefined' ? CFG : {};
    const COOP_RANGE = _CFG.COOP_RANGE || 50;
    const COOP_THRESHOLD = _CFG.COOP_SHARE_THRESHOLD || 0.1;

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

      // Check if this creature is receiving coop bonus right now
      if (c.shareOut > COOP_THRESHOLD) {
        const cBucket = Math.floor(c.genes.hue / 30) % 12;
        let hasCoopKin = false;
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          const ally = creatures[j];
          if (ally.shareOut <= COOP_THRESHOLD) continue;
          if (Math.floor(ally.genes.hue / 30) % 12 !== cBucket) continue;
          const dx = c.pos.x - ally.pos.x;
          const dy = c.pos.y - ally.pos.y;
          if (Math.sqrt(dx * dx + dy * dy) < COOP_RANGE) {
            hasCoopKin = true;
            break;
          }
        }
        if (hasCoopKin) coopCreatureCount++;
      }
    }

    const shareMean = shareSum / n;
    const shareVariance = shareSum2 / n - shareMean * shareMean;
    const mateMean = mateSum / n;
    const mateVariance = mateSum2 / n - mateMean * mateMean;

    // Species count
    const speciesBuckets = new Set();
    for (let i = 0; i < n; i++) {
      speciesBuckets.add(Math.floor(creatures[i].genes.hue / 30) % 12);
    }

    // Kin defense stats (passive, same as before)
    let kinDefenseSum = 0;
    for (let i = 0; i < n; i++) {
      const prey = creatures[i];
      const preyBucket = Math.floor(prey.genes.hue / 30) % 12;
      let kinCount = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const ally = creatures[j];
        if (Math.floor(ally.genes.hue / 30) % 12 !== preyBucket) continue;
        const dx = prey.pos.x - ally.pos.x;
        const dy = prey.pos.y - ally.pos.y;
        if (Math.sqrt(dx * dx + dy * dy) < (_CFG.KIN_DEFENSE_RANGE || 80)) kinCount++;
      }
      kinDefenseSum += Math.min(kinCount * (_CFG.KIN_DEFENSE_PER_KIN || 0.03), _CFG.KIN_DEFENSE_MAX || 0.15);
    }

    const currentDeaths = w.deaths;

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
      coopRate: coopCreatureCount / n,
      meanKinDefense: kinDefenseSum / n,
      totalDeaths: currentDeaths,
      deathsSinceLast: currentDeaths - lastPred,
    };
  }, { highThr: HIGH_SHARE_THRESHOLD, lowThr: LOW_SHARE_THRESHOLD, lastPred: lastPredationCount });
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
  let lastDeathCount = 0;
  let nextSampleTick = SAMPLE_INTERVAL;

  console.log(`  Running ${TOTAL_TICKS} ticks...`);

  while (true) {
    const currentTick = await page.evaluate(() => {
      const w = window.__world;
      return w ? w.tick : 0;
    });

    while (nextSampleTick <= TOTAL_TICKS && currentTick >= nextSampleTick) {
      const sample = await collectSample(page, lastDeathCount);
      if (sample) {
        lastDeathCount = sample.totalDeaths;
        samples.push(sample);
        console.log(
          `  [${samples.length}/${SAMPLES_PER_TRIAL}] tick=${sample.tick} ` +
          `pop=${sample.population} gen=${sample.meanGeneration.toFixed(1)} ` +
          `share=${sample.shareMean.toFixed(3)} var=${sample.shareVariance.toFixed(4)} ` +
          `coop=${(sample.coopRate * 100).toFixed(1)}%`
        );
      }
      nextSampleTick += SAMPLE_INTERVAL;
    }

    if (currentTick >= TOTAL_TICKS) break;
    await sleep(POLL_INTERVAL_MS);
  }

  if (samples.length < SAMPLES_PER_TRIAL) {
    const sample = await collectSample(page, lastDeathCount);
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
  console.log('  COOPERATIVE SHARING ECONOMICS BENCHMARK RESULTS');
  console.log('='.repeat(76));

  const numTrials = allTrials.length;
  const numSamples = Math.min(...allTrials.map(t => t.length));

  if (numSamples < 2) {
    console.log('\nInsufficient samples. Benchmark inconclusive.');
    return false;
  }

  // Aggregate by sample index
  const avgByIndex = [];
  for (let s = 0; s < numSamples; s++) {
    const agg = {
      tick: 0, population: 0, speciesCount: 0, meanGeneration: 0,
      shareMean: 0, shareVariance: 0, mateMean: 0, mateVariance: 0,
      highSharePct: 0, highShareMeanEnergy: 0, lowShareMeanEnergy: 0,
      coopRate: 0, meanKinDefense: 0,
    };
    let highETrials = 0, lowETrials = 0;

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
      agg.coopRate += sample.coopRate;
      agg.meanKinDefense += sample.meanKinDefense;
      if (sample.highShareCount > 0) { agg.highShareMeanEnergy += sample.highShareMeanEnergy; highETrials++; }
      if (sample.lowShareCount > 0) { agg.lowShareMeanEnergy += sample.lowShareMeanEnergy; lowETrials++; }
    }

    for (const key of Object.keys(agg)) {
      if (key === 'highShareMeanEnergy') agg[key] = highETrials > 0 ? agg[key] / highETrials : 0;
      else if (key === 'lowShareMeanEnergy') agg[key] = lowETrials > 0 ? agg[key] / lowETrials : 0;
      else agg[key] /= numTrials;
    }
    avgByIndex.push(agg);
  }

  // Print time series
  console.log('\nTime Series (averaged across ' + numTrials + ' trials):');
  console.log('-'.repeat(76));
  console.log(
    'Sam'.padEnd(5) + 'Tick'.padEnd(8) + 'Pop'.padEnd(6) + 'Gen'.padEnd(7) +
    'ShrM'.padEnd(8) + 'ShrV'.padEnd(8) + 'MatM'.padEnd(8) +
    'HiShr%'.padEnd(8) + 'Coop%'.padEnd(8) + 'KinDef'.padEnd(8)
  );
  console.log('-'.repeat(76));

  for (let s = 0; s < avgByIndex.length; s++) {
    const a = avgByIndex[s];
    console.log(
      `${s + 1}`.padEnd(5) +
      `${Math.round(a.tick)}`.padEnd(8) +
      `${Math.round(a.population)}`.padEnd(6) +
      `${a.meanGeneration.toFixed(1)}`.padEnd(7) +
      `${a.shareMean.toFixed(4)}`.padEnd(8) +
      `${a.shareVariance.toFixed(4)}`.padEnd(8) +
      `${a.mateMean.toFixed(4)}`.padEnd(8) +
      `${(a.highSharePct * 100).toFixed(1)}%`.padEnd(8) +
      `${(a.coopRate * 100).toFixed(1)}%`.padEnd(8) +
      `${a.meanKinDefense.toFixed(4)}`.padEnd(8)
    );
  }

  // Key metrics
  const first = avgByIndex[0];
  const last = avgByIndex[avgByIndex.length - 1];
  const shareMeans = avgByIndex.map(a => a.shareMean);
  const mateMeans = avgByIndex.map(a => a.mateMean);
  const shareSlope = linearSlope(shareMeans);
  const mateSlope = linearSlope(mateMeans);
  const shareMeanChange = last.shareMean - first.shareMean;
  const shareVarChange = last.shareVariance - first.shareVariance;

  // Energy advantage
  let energyAdvSum = 0, energyAdvN = 0;
  for (const a of avgByIndex) {
    if (a.highShareMeanEnergy > 0 && a.lowShareMeanEnergy > 0) {
      energyAdvSum += a.highShareMeanEnergy - a.lowShareMeanEnergy;
      energyAdvN++;
    }
  }
  const meanEnergyAdv = energyAdvN > 0 ? energyAdvSum / energyAdvN : 0;

  // Mean coop rate (last half of samples - after initial bootstrap)
  const lateCoopRates = avgByIndex.slice(Math.floor(numSamples / 2)).map(a => a.coopRate);
  const meanLateCoopRate = lateCoopRates.reduce((s, v) => s + v, 0) / lateCoopRates.length;

  // Per-trial slopes
  const trialShareSlopes = [];
  const trialFinalShareMeans = [];
  for (let t = 0; t < numTrials; t++) {
    const trial = allTrials[t];
    trialShareSlopes.push(linearSlope(trial.map(s => s.shareMean)));
    trialFinalShareMeans.push(trial[trial.length - 1].shareMean);
  }
  const positiveSlopes = trialShareSlopes.filter(s => s > 0).length;

  // Print analysis
  console.log('\n' + '='.repeat(76));
  console.log('  KEY METRICS');
  console.log('='.repeat(76));

  console.log(`\n  Share mean (first):               ${first.shareMean.toFixed(4)}`);
  console.log(`  Share mean (last):                ${last.shareMean.toFixed(4)}`);
  console.log(`  Share mean change:                ${shareMeanChange >= 0 ? '+' : ''}${shareMeanChange.toFixed(4)}`);
  console.log(`  Share slope (per sample):         ${shareSlope >= 0 ? '+' : ''}${shareSlope.toFixed(5)}`);
  console.log(`  Mate slope (control):             ${mateSlope >= 0 ? '+' : ''}${mateSlope.toFixed(5)}`);
  console.log(`\n  Share variance (first):           ${first.shareVariance.toFixed(4)}`);
  console.log(`  Share variance (last):            ${last.shareVariance.toFixed(4)}`);
  console.log(`  Share variance change:            ${shareVarChange >= 0 ? '+' : ''}${shareVarChange.toFixed(4)}`);
  console.log(`\n  High-share energy advantage:      ${meanEnergyAdv >= 0 ? '+' : ''}${meanEnergyAdv.toFixed(2)}`);
  console.log(`  Late-stage cooperation rate:      ${(meanLateCoopRate * 100).toFixed(1)}%`);
  console.log(`\n  Trials with positive share slope: ${positiveSlopes}/${numTrials}`);
  console.log(`  Per-trial slopes:   [${trialShareSlopes.map(s => s.toFixed(5)).join(', ')}]`);
  console.log(`  Per-trial final means: [${trialFinalShareMeans.map(m => m.toFixed(3)).join(', ')}]`);

  // Success criteria
  console.log('\n' + '='.repeat(76));
  console.log('  SUCCESS CRITERIA');
  console.log('='.repeat(76));

  const criteria = [];

  // 1. Share mean trends upward
  criteria.push({
    name: 'Share output mean trends upward',
    pass: shareSlope > 0,
    detail: `slope=${shareSlope.toFixed(5)} per sample`,
  });

  // 2. Share variance > 0.08 at end (behavioral diversity)
  criteria.push({
    name: 'Share variance shows behavioral diversity',
    pass: last.shareVariance > 0.08,
    detail: `final variance=${last.shareVariance.toFixed(4)} (threshold: >0.08)`,
  });

  // 3. High-share creatures have energy advantage
  criteria.push({
    name: 'High-share creatures have energy advantage',
    pass: meanEnergyAdv > 0,
    detail: `advantage=${meanEnergyAdv.toFixed(2)} energy units`,
  });

  // 4. Cooperation rate > 5% in late game
  criteria.push({
    name: 'Cooperation rate > 5% in late game',
    pass: meanLateCoopRate > 0.05,
    detail: `rate=${(meanLateCoopRate * 100).toFixed(1)}%`,
  });

  // 5. Majority of trials show positive share slope
  criteria.push({
    name: 'Majority of trials show positive share trend',
    pass: positiveSlopes >= numTrials * 0.6,
    detail: `${positiveSlopes}/${numTrials} trials (threshold: >=${Math.ceil(numTrials * 0.6)})`,
  });

  // 6. Share slope exceeds mate slope (differential selection)
  criteria.push({
    name: 'Share selection exceeds mate drift (control)',
    pass: shareSlope > mateSlope,
    detail: `share=${shareSlope.toFixed(5)} vs mate=${mateSlope.toFixed(5)}`,
  });

  // 7. No regression: final generation > 30
  const finalGen = last.meanGeneration;
  criteria.push({
    name: 'No regression: generation > 30',
    pass: finalGen > 30,
    detail: `final gen=${finalGen.toFixed(1)}`,
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
    console.log('  Cooperative sharing economics create selection for share output.');
  } else {
    console.log(`  OVERALL: ${passCount}/${criteria.length} CRITERIA PASSED`);
    if (passCount >= 5) {
      console.log('  Strong evidence of selection pressure. Minor criteria missed.');
    } else if (passCount >= 3) {
      console.log('  Partial evidence. May need parameter tuning.');
    } else {
      console.log('  Insufficient evidence. Redesign may need further changes.');
    }
  }
  console.log('='.repeat(76) + '\n');

  return allPass;
}

async function main() {
  console.log('Cooperative Sharing Economics Benchmark');
  console.log(`Trials: ${NUM_TRIALS}, Ticks: ${TOTAL_TICKS}, Interval: ${SAMPLE_INTERVAL}`);
  console.log(`Speed: ${SIM_SPEED}x, Samples/trial: ${SAMPLES_PER_TRIAL}`);
  console.log(`Share thresholds: high>${HIGH_SHARE_THRESHOLD}, low<${LOW_SHARE_THRESHOLD}`);

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
