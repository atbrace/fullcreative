// Emergence 15-minute ecosystem health assessment
// Deep telemetry benchmark: 54K ticks, enhanced behavioral metrics
//
// Usage: node benchmark-assess.js [--runs=N]
// Default: 10 runs

const { chromium } = require('playwright');
const path = require('path');

const TICKS_PER_SAMPLE = 600;
const TOTAL_TICKS = 54000;      // 15 minutes at 60fps
const BATCH_SIZE = 600;

const runsArg = process.argv.find(a => a.startsWith('--runs='));
const NUM_RUNS = runsArg ? parseInt(runsArg.split('=')[1], 10) : 10;

async function runSingle(browser, runIndex) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const filePath = 'file://' + path.resolve(__dirname, 'emergence.html');
  await page.goto(filePath);
  await page.click('#overlay');
  await page.waitForTimeout(200);

  // Inject predation counter
  await page.evaluate(() => {
    window.__predationKills = 0;
    const origNotify = window.__world.eventLog.notifyPredation.bind(window.__world.eventLog);
    window.__world.eventLog.notifyPredation = function() {
      window.__predationKills++;
      origNotify();
    };
  });

  const samples = [];

  for (let tick = 0; tick < TOTAL_TICKS; tick += BATCH_SIZE) {
    const batchTicks = Math.min(BATCH_SIZE, TOTAL_TICKS - tick);

    const sample = await page.evaluate(({ batchTicks, sampleInterval, currentTick }) => {
      const w = window.__world;
      const silentAudio = {
        eatClick() {}, birthPing() {}, deathThud() {},
        predationSweep() {}, setPopulation() {}
      };

      const snapshots = [];

      for (let i = 0; i < batchTicks; i++) {
        w.update(silentAudio);

        const t = currentTick + i + 1;
        if (t % sampleInterval === 0) {
          const W = w.w, H = w.h;
          let wallCount = 0, cornerCount = 0;
          const WALL_THRESH = 20;

          // Collect per-creature data
          const n = w.creatures.length || 1;
          let totalShareOut = 0, totalMateOut = 0;
          let sharingCount = 0, mateWillingCount = 0;
          let totalBrainSize = 0, minBrain = 99, maxBrain = 0;
          let totalSenseRange = 0, minSense = 999, maxSense = 0;
          let oldestAge = 0;
          let totalSize = 0, totalSpeed = 0;
          let minSize = 99, maxSize = 0, minSpeed = 99, maxSpeed = 0;
          let totalEnergy = 0, minEnergy = 999, maxEnergy = 0;
          let highEnergy = 0; // energy > 100
          let totalTurnOut = 0, totalSpdOut = 0;
          let totalSg0 = 0, totalSg1 = 0, totalSg2 = 0;
          // For output variance
          const turnOuts = [];
          const spdOuts = [];
          const shareOuts = [];
          const mateOuts = [];
          const sizes = [];
          const speeds = [];
          const brainSizes = [];
          const senseRanges = [];

          for (let j = 0; j < w.creatures.length; j++) {
            const c = w.creatures[j];
            const nearL = c.pos.x < WALL_THRESH;
            const nearR = c.pos.x > W - WALL_THRESH;
            const nearT = c.pos.y < WALL_THRESH;
            const nearB = c.pos.y > H - WALL_THRESH;
            if (nearL || nearR || nearT || nearB) wallCount++;
            if ((nearL || nearR) && (nearT || nearB)) cornerCount++;

            totalShareOut += c.shareOut;
            totalMateOut += c.mateOut;
            if (c.shareOut > 0.1) sharingCount++;
            if (c.mateOut > 0.3) mateWillingCount++;

            const bs = c.genes.brainSize || c.brain.nh;
            totalBrainSize += bs;
            if (bs < minBrain) minBrain = bs;
            if (bs > maxBrain) maxBrain = bs;
            brainSizes.push(bs);

            const sr = c.genes.senseRange || 130;
            totalSenseRange += sr;
            if (sr < minSense) minSense = sr;
            if (sr > maxSense) maxSense = sr;
            senseRanges.push(sr);

            if (c.age > oldestAge) oldestAge = c.age;

            const sz = c.genes.size;
            totalSize += sz;
            if (sz < minSize) minSize = sz;
            if (sz > maxSize) maxSize = sz;
            sizes.push(sz);

            const sp = c.genes.speedGene;
            totalSpeed += sp;
            if (sp < minSpeed) minSpeed = sp;
            if (sp > maxSpeed) maxSpeed = sp;
            speeds.push(sp);

            totalEnergy += c.energy;
            if (c.energy < minEnergy) minEnergy = c.energy;
            if (c.energy > maxEnergy) maxEnergy = c.energy;
            if (c.energy > 100) highEnergy++;

            // Brain outputs
            if (c.brain.lastOutput) {
              totalTurnOut += Math.abs(c.brain.lastOutput[0]);
              totalSpdOut += (c.brain.lastOutput[1] + 1) / 2; // map tanh to 0-1
              totalSg0 += (c.brain.lastOutput[2] + 1) / 2;
              totalSg1 += (c.brain.lastOutput[3] + 1) / 2;
              totalSg2 += (c.brain.lastOutput[4] + 1) / 2;
              turnOuts.push(c.brain.lastOutput[0]);
              spdOuts.push(c.brain.lastOutput[1]);
            }
            shareOuts.push(c.shareOut);
            mateOuts.push(c.mateOut);
          }

          // Compute variance of key outputs (behavioral diversity measure)
          function variance(arr) {
            if (arr.length < 2) return 0;
            const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
            return arr.reduce((a, v) => a + (v - mean) ** 2, 0) / arr.length;
          }

          snapshots.push({
            tick: t,
            pop: w.creatures.length,
            food: w.food.length,
            dayPhase: +w.dayPhase.toFixed(3),
            seasonPhase: +w.seasonPhase.toFixed(3),
            births: w.births,
            sexualBirths: w.sexualBirths || 0,
            deaths: w.deaths,
            predationKills: window.__predationKills,
            maxGen: w.maxGen,
            species: w.countSpecies(),
            speciesDetail: w.speciesTracker.getCurrent().map(s => ({
              name: typeof SPECIES_NAMES !== 'undefined' ? SPECIES_NAMES[s.b] : 'B' + s.b,
              hue: Math.round(s.hue),
              count: s.count,
              bucket: s.b
            })),
            wallCount,
            cornerCount,
            sharingCount,
            mateWillingCount,
            avgShareOut: +(totalShareOut / n).toFixed(3),
            avgMateOut: +(totalMateOut / n).toFixed(3),
            // Brain and sense
            avgBrainSize: +(totalBrainSize / n).toFixed(1),
            minBrainSize: minBrain === 99 ? 12 : minBrain,
            maxBrainSize: maxBrain === 0 ? 12 : maxBrain,
            avgSenseRange: +(totalSenseRange / n).toFixed(0),
            minSenseRange: minSense === 999 ? 130 : Math.round(minSense),
            maxSenseRange: maxSense === 0 ? 130 : Math.round(maxSense),
            // Body size and speed genes
            avgSize: +(totalSize / n).toFixed(3),
            minSize: minSize === 99 ? 1 : +minSize.toFixed(2),
            maxSize: maxSize === 0 ? 1 : +maxSize.toFixed(2),
            avgSpeedGene: +(totalSpeed / n).toFixed(3),
            minSpeedGene: minSpeed === 99 ? 1 : +minSpeed.toFixed(2),
            maxSpeedGene: maxSpeed === 0 ? 1 : +maxSpeed.toFixed(2),
            // Energy distribution
            avgEnergy: +(totalEnergy / n).toFixed(1),
            minEnergy: +(minEnergy === 999 ? 0 : minEnergy).toFixed(1),
            maxEnergy: +maxEnergy.toFixed(1),
            highEnergyPct: +(highEnergy / n * 100).toFixed(0),
            // Behavioral outputs (averages)
            avgAbsTurn: +(totalTurnOut / n).toFixed(3),
            avgSpdOutput: +(totalSpdOut / n).toFixed(3),
            avgSg0: +(totalSg0 / n).toFixed(3),
            avgSg1: +(totalSg1 / n).toFixed(3),
            avgSg2: +(totalSg2 / n).toFixed(3),
            // Behavioral diversity (output variance)
            turnVariance: +variance(turnOuts).toFixed(4),
            spdVariance: +variance(spdOuts).toFixed(4),
            shareVariance: +variance(shareOuts).toFixed(4),
            mateVariance: +variance(mateOuts).toFixed(4),
            // Gene diversity
            sizeVariance: +variance(sizes).toFixed(4),
            speedVariance: +variance(speeds).toFixed(4),
            brainVariance: +variance(brainSizes).toFixed(2),
            senseVariance: +variance(senseRanges).toFixed(1),
            oldestAge: Math.round(oldestAge / 60),
          });
        }
      }

      return snapshots;
    }, { batchTicks, sampleInterval: TICKS_PER_SAMPLE, currentTick: tick });

    samples.push(...sample);
  }

  await context.close();

  // Compute summary
  const pops = samples.map(s => s.pop);
  const cornerCounts = samples.map(s => s.cornerCount);
  const oldestAges = samples.map(s => s.oldestAge);
  const winterSamples = samples.filter(s => s.seasonPhase <= 0.25);
  const summerSamples = samples.filter(s => s.seasonPhase >= 0.75);
  const finalSample = samples[samples.length - 1];

  // Species persistence: track which species appear in which thirds
  const third = Math.floor(samples.length / 3);
  const earlySpecies = new Set();
  const midSpecies = new Set();
  const lateSpecies = new Set();
  for (let i = 0; i < third; i++)
    samples[i].speciesDetail.forEach(s => { if (s.count >= 2) earlySpecies.add(s.bucket); });
  for (let i = third; i < third * 2; i++)
    samples[i].speciesDetail.forEach(s => { if (s.count >= 2) midSpecies.add(s.bucket); });
  for (let i = third * 2; i < samples.length; i++)
    samples[i].speciesDetail.forEach(s => { if (s.count >= 2) lateSpecies.add(s.bucket); });

  // Trait trajectories: early/mid/late averages
  const earlySlice = samples.slice(0, third);
  const midSlice = samples.slice(third, third * 2);
  const lateSlice = samples.slice(third * 2);
  function avgField(arr, field) {
    return +(arr.reduce((a, s) => a + s[field], 0) / arr.length).toFixed(3);
  }

  const summary = {
    runIndex,
    samples,
    popMin: Math.min(...pops),
    popMax: Math.max(...pops),
    popAvg: +(pops.reduce((a, b) => a + b, 0) / pops.length).toFixed(1),
    winterAvgPop: winterSamples.length > 0
      ? +(winterSamples.reduce((a, s) => a + s.pop, 0) / winterSamples.length).toFixed(1) : null,
    summerAvgPop: summerSamples.length > 0
      ? +(summerSamples.reduce((a, s) => a + s.pop, 0) / summerSamples.length).toFixed(1) : null,
    cornerAvg: +(cornerCounts.reduce((a, b) => a + b, 0) / cornerCounts.length).toFixed(1),
    finalGen: finalSample.maxGen,
    finalSpecies: finalSample.species,
    totalBirths: finalSample.births,
    sexualBirths: finalSample.sexualBirths,
    totalDeaths: finalSample.deaths,
    predationKills: finalSample.predationKills,
    predationPct: finalSample.deaths > 0
      ? +(finalSample.predationKills / finalSample.deaths * 100).toFixed(1) : 0,
    // Gene evolution
    finalAvgBrain: finalSample.avgBrainSize,
    brainRange: [
      Math.min(...samples.map(s => s.minBrainSize)),
      Math.max(...samples.map(s => s.maxBrainSize))
    ],
    finalAvgSense: +finalSample.avgSenseRange,
    senseRange: [
      Math.min(...samples.map(s => s.minSenseRange)),
      Math.max(...samples.map(s => s.maxSenseRange))
    ],
    finalAvgSize: finalSample.avgSize,
    sizeRange: [
      Math.min(...samples.map(s => s.minSize)),
      Math.max(...samples.map(s => s.maxSize))
    ],
    finalAvgSpeed: finalSample.avgSpeedGene,
    speedRange: [
      Math.min(...samples.map(s => s.minSpeedGene)),
      Math.max(...samples.map(s => s.maxSpeedGene))
    ],
    // Behavioral metrics
    avgShareOut: +(samples.reduce((a, s) => a + s.avgShareOut, 0) / samples.length).toFixed(3),
    avgMateOut: +(samples.reduce((a, s) => a + s.avgMateOut, 0) / samples.length).toFixed(3),
    // Behavioral diversity (late-run averages)
    lateTurnVariance: avgField(lateSlice, 'turnVariance'),
    lateSpdVariance: avgField(lateSlice, 'spdVariance'),
    lateShareVariance: avgField(lateSlice, 'shareVariance'),
    lateMateVariance: avgField(lateSlice, 'mateVariance'),
    // Gene diversity (late-run averages)
    lateSizeVariance: avgField(lateSlice, 'sizeVariance'),
    lateSpeedVariance: avgField(lateSlice, 'speedVariance'),
    lateBrainVariance: avgField(lateSlice, 'brainVariance'),
    lateSenseVariance: avgField(lateSlice, 'senseVariance'),
    // Trait trajectories
    traitTrajectory: {
      early: {
        brain: avgField(earlySlice, 'avgBrainSize'),
        sense: avgField(earlySlice, 'avgSenseRange'),
        size: avgField(earlySlice, 'avgSize'),
        speed: avgField(earlySlice, 'avgSpeedGene'),
      },
      mid: {
        brain: avgField(midSlice, 'avgBrainSize'),
        sense: avgField(midSlice, 'avgSenseRange'),
        size: avgField(midSlice, 'avgSize'),
        speed: avgField(midSlice, 'avgSpeedGene'),
      },
      late: {
        brain: avgField(lateSlice, 'avgBrainSize'),
        sense: avgField(lateSlice, 'avgSenseRange'),
        size: avgField(lateSlice, 'avgSize'),
        speed: avgField(lateSlice, 'avgSpeedGene'),
      },
    },
    // Energy
    avgEnergy: avgField(samples, 'avgEnergy'),
    lateHighEnergyPct: avgField(lateSlice, 'highEnergyPct'),
    // Species dynamics
    speciesSeen: new Set([...earlySpecies, ...midSpecies, ...lateSpecies]).size,
    speciesPersisted: [...earlySpecies].filter(s => lateSpecies.has(s)).length,
    earlySpeciesCount: earlySpecies.size,
    lateSpeciesCount: lateSpecies.size,
    // Oldest creature
    maxOldest: Math.max(...oldestAges),
    avgOldest: +(oldestAges.reduce((a, b) => a + b, 0) / oldestAges.length).toFixed(1),
    floorHits: samples.filter(s => s.pop <= 12).length,
    totalSamples: samples.length,
    // Health checks
    popStable: Math.min(...pops) >= 8,
    noCornerTrapping: +(cornerCounts.reduce((a, b) => a + b, 0) / cornerCounts.length).toFixed(1) < 5,
    seasonalEffect: winterSamples.length > 0 && summerSamples.length > 0,
    evolved: finalSample.maxGen > 15,
  };
  summary.allPass = summary.popStable && summary.noCornerTrapping && summary.seasonalEffect && summary.evolved;
  return summary;
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------
function stat(values) {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / n;
  const stddev = Math.sqrt(variance);
  return { mean: +mean.toFixed(2), stddev: +stddev.toFixed(2), min: Math.min(...values), max: Math.max(...values) };
}

function fmtStat(s) {
  return `${String(s.mean).padStart(7)} +/- ${String(s.stddev).padStart(6)}  [${s.min}, ${s.max}]`;
}

function report(results) {
  const n = results.length;
  console.log(`\n${'='.repeat(72)}`);
  console.log(`  EMERGENCE ECOSYSTEM ASSESSMENT: ${n} RUNS x ${TOTAL_TICKS} TICKS (${(TOTAL_TICKS/3600).toFixed(1)} season cycles)`);
  console.log(`${'='.repeat(72)}\n`);

  // Per-run summary
  console.log('--- Per-Run Summary ---');
  console.log('  run | pop(min/avg/max) | gen | spp | births(sex) | pred | brain | sense | size  | speed | oldest | pass');
  console.log('  ----|------------------|-----|-----|-------------|------|-------|-------|-------|-------|--------|-----');
  for (const r of results) {
    console.log(
      `  ${String(r.runIndex + 1).padStart(3)} | ` +
      `${String(r.popMin).padStart(3)}/${String(r.popAvg).padStart(5)}/${String(r.popMax).padStart(3)} | ` +
      `${String(r.finalGen).padStart(3)} | ` +
      `${String(r.finalSpecies).padStart(3)} | ` +
      `${String(r.totalBirths).padStart(5)}(${String(r.sexualBirths).padStart(3)}) | ` +
      `${String(r.predationKills).padStart(4)} | ` +
      `${String(r.finalAvgBrain).padStart(5)} | ` +
      `${String(r.finalAvgSense).padStart(5)} | ` +
      `${String(r.finalAvgSize).padStart(5)} | ` +
      `${String(r.finalAvgSpeed).padStart(5)} | ` +
      `${String(r.maxOldest).padStart(4)}s | ` +
      `${r.allPass ? 'PASS' : 'FAIL'}`
    );
  }

  // Aggregate population and evolution
  console.log('\n--- Population & Evolution (mean +/- stddev [min, max]) ---');
  const popMetrics = [
    ['Avg population',     results.map(r => r.popAvg)],
    ['Min population',     results.map(r => r.popMin)],
    ['Max population',     results.map(r => r.popMax)],
    ['Winter avg pop',     results.filter(r => r.winterAvgPop !== null).map(r => r.winterAvgPop)],
    ['Summer avg pop',     results.filter(r => r.summerAvgPop !== null).map(r => r.summerAvgPop)],
    ['Final generation',   results.map(r => r.finalGen)],
    ['Total births',       results.map(r => r.totalBirths)],
    ['Sexual births',      results.map(r => r.sexualBirths)],
    ['Total deaths',       results.map(r => r.totalDeaths)],
    ['Predation kills',    results.map(r => r.predationKills)],
    ['Predation % deaths', results.map(r => r.predationPct)],
    ['Floor hits',         results.map(r => r.floorHits)],
    ['Max oldest (s)',     results.map(r => r.maxOldest)],
    ['Avg oldest (s)',     results.map(r => r.avgOldest)],
  ];
  for (const [label, values] of popMetrics) {
    if (values.length === 0) continue;
    console.log(`  ${label.padEnd(20)} ${fmtStat(stat(values))}`);
  }

  // Gene evolution
  console.log('\n--- Gene Evolution (mean +/- stddev [min, max]) ---');
  const geneMetrics = [
    ['Final brain size',   results.map(r => r.finalAvgBrain)],
    ['Brain range spread', results.map(r => r.brainRange[1] - r.brainRange[0])],
    ['Final sense range',  results.map(r => r.finalAvgSense)],
    ['Sense range spread', results.map(r => r.senseRange[1] - r.senseRange[0])],
    ['Final body size',    results.map(r => r.finalAvgSize)],
    ['Size range spread',  results.map(r => +(r.sizeRange[1] - r.sizeRange[0]).toFixed(2))],
    ['Final speed gene',   results.map(r => r.finalAvgSpeed)],
    ['Speed range spread', results.map(r => +(r.speedRange[1] - r.speedRange[0]).toFixed(2))],
  ];
  for (const [label, values] of geneMetrics) {
    console.log(`  ${label.padEnd(20)} ${fmtStat(stat(values))}`);
  }

  // Trait trajectories
  console.log('\n--- Trait Evolution Trajectories (avg across runs) ---');
  console.log('                     early (0-5m)    mid (5-10m)     late (10-15m)   direction');
  const traits = ['brain', 'sense', 'size', 'speed'];
  const traitLabels = ['Brain size', 'Sense range', 'Body size', 'Speed gene'];
  for (let i = 0; i < traits.length; i++) {
    const t = traits[i];
    const earlyAvg = +(results.reduce((a, r) => a + r.traitTrajectory.early[t], 0) / n).toFixed(2);
    const midAvg = +(results.reduce((a, r) => a + r.traitTrajectory.mid[t], 0) / n).toFixed(2);
    const lateAvg = +(results.reduce((a, r) => a + r.traitTrajectory.late[t], 0) / n).toFixed(2);
    const delta = lateAvg - earlyAvg;
    const dir = Math.abs(delta) < 0.01 ? 'stable' : delta > 0 ? 'UP' : 'DOWN';
    console.log(
      `  ${traitLabels[i].padEnd(20)} ${String(earlyAvg).padStart(8)}        ${String(midAvg).padStart(8)}        ${String(lateAvg).padStart(8)}        ${dir} (${delta > 0 ? '+' : ''}${delta.toFixed(2)})`
    );
  }

  // Behavioral diversity
  console.log('\n--- Behavioral Diversity (late-run output variance, higher = more diverse) ---');
  const behavMetrics = [
    ['Turn output var',    results.map(r => r.lateTurnVariance)],
    ['Speed output var',   results.map(r => r.lateSpdVariance)],
    ['Share output var',   results.map(r => r.lateShareVariance)],
    ['Mate output var',    results.map(r => r.lateMateVariance)],
  ];
  for (const [label, values] of behavMetrics) {
    console.log(`  ${label.padEnd(20)} ${fmtStat(stat(values))}`);
  }

  // Gene diversity
  console.log('\n--- Genetic Diversity (late-run gene variance) ---');
  const divMetrics = [
    ['Size gene var',      results.map(r => r.lateSizeVariance)],
    ['Speed gene var',     results.map(r => r.lateSpeedVariance)],
    ['Brain size var',     results.map(r => r.lateBrainVariance)],
    ['Sense range var',    results.map(r => r.lateSenseVariance)],
  ];
  for (const [label, values] of divMetrics) {
    console.log(`  ${label.padEnd(20)} ${fmtStat(stat(values))}`);
  }

  // Species dynamics
  console.log('\n--- Species Dynamics ---');
  const sppMetrics = [
    ['Species ever seen',  results.map(r => r.speciesSeen)],
    ['Species persisted',  results.map(r => r.speciesPersisted)],
    ['Early species',      results.map(r => r.earlySpeciesCount)],
    ['Late species',       results.map(r => r.lateSpeciesCount)],
    ['Final species',      results.map(r => r.finalSpecies)],
  ];
  for (const [label, values] of sppMetrics) {
    console.log(`  ${label.padEnd(20)} ${fmtStat(stat(values))}`);
  }

  // Energy
  console.log('\n--- Energy Economy ---');
  const energyMetrics = [
    ['Avg energy',          results.map(r => r.avgEnergy)],
    ['Late high-energy %',  results.map(r => r.lateHighEnergyPct)],
    ['Avg share output',    results.map(r => +r.avgShareOut)],
    ['Avg mate output',     results.map(r => +r.avgMateOut)],
  ];
  for (const [label, values] of energyMetrics) {
    console.log(`  ${label.padEnd(20)} ${fmtStat(stat(values))}`);
  }

  // Health checks
  console.log('\n--- Health Check Pass Rates ---');
  const checks = [
    ['Population stability (min>=8)', results.filter(r => r.popStable).length],
    ['No corner trapping',            results.filter(r => r.noCornerTrapping).length],
    ['Seasonal effect',               results.filter(r => r.seasonalEffect).length],
    ['Evolution (gen>15 at 54K)',      results.filter(r => r.evolved).length],
    ['Overall',                        results.filter(r => r.allPass).length],
  ];
  for (const [label, passed] of checks) {
    console.log(`  ${label.padEnd(36)} ${passed}/${n} (${Math.round(passed / n * 100)}%)`);
  }

  // Final species breakdown for each run
  console.log('\n--- Final Species Breakdown Per Run ---');
  for (const r of results) {
    const final = r.samples[r.samples.length - 1];
    const spStr = final.speciesDetail.map(s => `${s.name}(${s.count})`).join(' ');
    console.log(`  Run ${r.runIndex + 1}: ${spStr}`);
  }

  const allPassCount = results.filter(r => r.allPass).length;
  console.log(`\n${'='.repeat(72)}`);
  console.log(`  ASSESSMENT COMPLETE: ${allPassCount}/${n} PASSED`);
  console.log(`${'='.repeat(72)}\n`);
  return allPassCount === n ? 0 : 1;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const browser = await chromium.launch({ headless: true });
  console.log(`Running ${NUM_RUNS} assessment trials (${TOTAL_TICKS} ticks each)...`);
  const results = [];
  for (let i = 0; i < NUM_RUNS; i++) {
    const t0 = Date.now();
    const result = await runSingle(browser, i);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const tag = result.allPass ? 'PASS' : 'FAIL';
    console.log(`  Run ${i + 1}/${NUM_RUNS}: ${tag} (pop=${result.popAvg}, gen=${result.finalGen}, pred=${result.predationKills}, ${elapsed}s)`);
    results.push(result);
  }
  await browser.close();
  return report(results);
}

main().then(code => process.exit(code)).catch(err => {
  console.error('Assessment failed:', err);
  process.exit(2);
});
