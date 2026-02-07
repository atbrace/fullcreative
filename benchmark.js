// Emergence headless benchmark
// Runs simulation through a full season cycle, sampling population dynamics,
// creature distribution, and feature health.
//
// Usage: node benchmark.js [--runs=N]
//   --runs=N  Run N independent simulations and aggregate (default: 1)
// Requires: playwright (npm install)

const { chromium } = require('playwright');
const path = require('path');

const TICKS_PER_SAMPLE = 600;   // sample every 600 ticks (~10 sim-seconds)
const TOTAL_TICKS = 18000;      // 1.25 season cycles (14400 = 1 full cycle)
const BATCH_SIZE = 300;         // ticks per evaluate call (avoid timeout)

// Parse --runs=N from argv
const runsArg = process.argv.find(a => a.startsWith('--runs='));
const NUM_RUNS = runsArg ? parseInt(runsArg.split('=')[1], 10) : 1;

// ---------------------------------------------------------------------------
// Single simulation run - returns structured results
// ---------------------------------------------------------------------------
async function runSingle(browser, runIndex) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const filePath = 'file://' + path.resolve(__dirname, 'emergence.html');
  await page.goto(filePath);

  // Click overlay to start simulation
  await page.click('#overlay');
  await page.waitForTimeout(200);

  // Verify world is exposed
  await page.evaluate(() => {
    const w = window.__world;
    if (!w) throw new Error('__world not exposed');
    return w.creatures.length;
  });

  const samples = [];

  for (let tick = 0; tick < TOTAL_TICKS; tick += BATCH_SIZE) {
    const batchTicks = Math.min(BATCH_SIZE, TOTAL_TICKS - tick);

    const sample = await page.evaluate(({ batchTicks, sampleInterval, currentTick }) => {
      const w = window.__world;
      const silentAudio = {
        eatClick() {}, birthPing() {}, deathThud() {},
        predationSweep() {}, setPopulation() {}, setEcosystemState() {}
      };

      const snapshots = [];

      for (let i = 0; i < batchTicks; i++) {
        w.update(silentAudio);

        const t = currentTick + i + 1;
        if (t % sampleInterval === 0) {
          const W = w.w, H = w.h;
          let wallCount = 0;
          let cornerCount = 0;
          const WALL_THRESH = 20;

          for (let j = 0; j < w.creatures.length; j++) {
            const c = w.creatures[j];
            const nearL = c.pos.x < WALL_THRESH;
            const nearR = c.pos.x > W - WALL_THRESH;
            const nearT = c.pos.y < WALL_THRESH;
            const nearB = c.pos.y > H - WALL_THRESH;
            if (nearL || nearR || nearT || nearB) wallCount++;
            if ((nearL || nearR) && (nearT || nearB)) cornerCount++;
          }

          let inCurrentZone = 0;
          for (let j = 0; j < w.creatures.length; j++) {
            const c = w.creatures[j];
            for (let k = 0; k < w.currents.length; k++) {
              const cz = w.currents[k];
              const dx = c.pos.x - cz.pos.x, dy = c.pos.y - cz.pos.y;
              if (dx * dx + dy * dy < cz.radius * cz.radius) {
                inCurrentZone++;
                break;
              }
            }
          }

          let sharingCount = 0, mateWillingCount = 0;
          let totalShareOut = 0, totalMateOut = 0;
          let totalBrainSize = 0, minBrain = 99, maxBrain = 0;
          let totalSenseRange = 0, minSense = 999, maxSense = 0;
          let oldestAge = 0;
          for (let j = 0; j < w.creatures.length; j++) {
            const c = w.creatures[j];
            totalShareOut += c.shareOut;
            totalMateOut += c.mateOut;
            if (c.shareOut > 0.1) sharingCount++;
            if (c.mateOut > 0.3) mateWillingCount++;
            const bs = c.genes.brainSize || c.brain.nh;
            totalBrainSize += bs;
            if (bs < minBrain) minBrain = bs;
            if (bs > maxBrain) maxBrain = bs;
            const sr = c.genes.senseRange || 130;
            totalSenseRange += sr;
            if (sr < minSense) minSense = sr;
            if (sr > maxSense) maxSense = sr;
            if (c.age > oldestAge) oldestAge = c.age;
          }
          const n = w.creatures.length || 1;

          snapshots.push({
            tick: t,
            pop: w.creatures.length,
            food: w.food.length,
            dayPhase: +w.dayPhase.toFixed(3),
            seasonPhase: +w.seasonPhase.toFixed(3),
            births: w.births,
            sexualBirths: w.sexualBirths || 0,
            deaths: w.deaths,
            maxGen: w.maxGen,
            species: w.countSpecies(),
            speciesDetail: w.speciesTracker.getCurrent().map(s => ({
              name: typeof SPECIES_NAMES !== 'undefined' ? SPECIES_NAMES[s.b] : 'B' + s.b,
              hue: Math.round(s.hue),
              count: s.count
            })),
            wallCount,
            cornerCount,
            inCurrentZone,
            numCurrents: w.currents.length,
            sharingCount,
            mateWillingCount,
            avgShareOut: +(totalShareOut / n).toFixed(3),
            avgMateOut: +(totalMateOut / n).toFixed(3),
            avgBrainSize: +(totalBrainSize / n).toFixed(1),
            minBrainSize: minBrain,
            maxBrainSize: maxBrain,
            avgSenseRange: +(totalSenseRange / n).toFixed(0),
            minSenseRange: minSense === 999 ? 130 : Math.round(minSense),
            maxSenseRange: maxSense === 0 ? 130 : Math.round(maxSense),
            oldestAge: Math.round(oldestAge / 60),
          });
        }
      }

      return snapshots;
    }, { batchTicks, sampleInterval: TICKS_PER_SAMPLE, currentTick: tick });

    samples.push(...sample);
  }

  await context.close();

  // Extract summary metrics from samples
  const pops = samples.map(s => s.pop);
  const cornerCounts = samples.map(s => s.cornerCount);
  const wallCounts = samples.map(s => s.wallCount);
  const oldestAges = samples.map(s => s.oldestAge);
  const winterSamples = samples.filter(s => s.seasonPhase <= 0.25);
  const summerSamples = samples.filter(s => s.seasonPhase >= 0.75);
  const finalSample = samples[samples.length - 1];

  const summary = {
    runIndex,
    samples,
    popMin: Math.min(...pops),
    popMax: Math.max(...pops),
    popAvg: +(pops.reduce((a, b) => a + b, 0) / pops.length).toFixed(1),
    winterAvgPop: winterSamples.length > 0
      ? +(winterSamples.reduce((a, s) => a + s.pop, 0) / winterSamples.length).toFixed(1)
      : null,
    summerAvgPop: summerSamples.length > 0
      ? +(summerSamples.reduce((a, s) => a + s.pop, 0) / summerSamples.length).toFixed(1)
      : null,
    cornerAvg: +(cornerCounts.reduce((a, b) => a + b, 0) / cornerCounts.length).toFixed(1),
    wallAvg: +(wallCounts.reduce((a, b) => a + b, 0) / wallCounts.length).toFixed(1),
    finalGen: finalSample.maxGen,
    finalSpecies: finalSample.species,
    totalBirths: finalSample.births,
    sexualBirths: finalSample.sexualBirths,
    totalDeaths: finalSample.deaths,
    avgShareOut: +(samples.reduce((a, s) => a + s.avgShareOut, 0) / samples.length).toFixed(3),
    avgMateOut: +(samples.reduce((a, s) => a + s.avgMateOut, 0) / samples.length).toFixed(3),
    avgSharing: +(samples.reduce((a, s) => a + s.sharingCount, 0) / samples.length).toFixed(1),
    avgMateWilling: +(samples.reduce((a, s) => a + s.mateWillingCount, 0) / samples.length).toFixed(1),
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
    maxOldest: Math.max(...oldestAges),
    avgOldest: +(oldestAges.reduce((a, b) => a + b, 0) / oldestAges.length).toFixed(1),
    floorHits: samples.filter(s => s.pop <= 12).length,
    totalSamples: samples.length,
    // Health check booleans
    popStable: Math.min(...pops) >= 8,
    noCornerTrapping: +(cornerCounts.reduce((a, b) => a + b, 0) / cornerCounts.length).toFixed(1) < 5,
    seasonalEffect: winterSamples.length > 0 && summerSamples.length > 0,
    evolved: finalSample.maxGen > 5,
  };

  summary.allPass = summary.popStable && summary.noCornerTrapping && summary.seasonalEffect && summary.evolved;
  return summary;
}

// ---------------------------------------------------------------------------
// Single-run detailed report (original format)
// ---------------------------------------------------------------------------
function reportSingle(result) {
  const { samples } = result;

  console.log('\n=== EMERGENCE BENCHMARK RESULTS ===\n');
  console.log(`Ticks simulated: ${TOTAL_TICKS}`);
  console.log(`Samples collected: ${samples.length}`);
  console.log(`Current zones: ${samples[0]?.numCurrents || '?'}\n`);

  // Population timeline
  console.log('--- Population Timeline ---');
  console.log('  tick   | pop  | food | season     | gen | species | shr | mat | sexB | wall | corner | oldest | brain(a/min/max) | vis(a/min/max)');
  console.log('  -------|------|------|------------|-----|---------|-----|-----|------|------|--------|--------|-----------------|---------------');
  for (const s of samples) {
    const sp = s.seasonPhase;
    const season = sp > 0.75 ? 'summer' : sp > 0.5 ? 'spring' : sp > 0.25 ? 'autumn' : 'winter';
    console.log(
      `  ${String(s.tick).padStart(6)} | ${String(s.pop).padStart(4)} | ${String(s.food).padStart(4)} | ` +
      `${season.padEnd(10)} | ${String(s.maxGen).padStart(3)} | ${String(s.species).padStart(7)} | ` +
      `${String(s.sharingCount).padStart(3)} | ${String(s.mateWillingCount).padStart(3)} | ` +
      `${String(s.sexualBirths).padStart(4)} | ${String(s.wallCount).padStart(4)} | ${String(s.cornerCount).padStart(6)} | ` +
      `${String(s.oldestAge).padStart(4)}s | ` +
      `${s.avgBrainSize}/${s.minBrainSize}/${s.maxBrainSize}`.padEnd(17) + '| ' +
      `${s.avgSenseRange}/${s.minSenseRange}/${s.maxSenseRange}`
    );
  }

  console.log('\n--- Summary ---');
  console.log(`  Population: min=${result.popMin}, max=${result.popMax}, avg=${result.popAvg}`);
  console.log(`  Winter avg pop: ${result.winterAvgPop ?? 'N/A'}`);
  console.log(`  Summer avg pop: ${result.summerAvgPop ?? 'N/A'}`);
  console.log(`  Corner creatures: avg=${result.cornerAvg}`);
  console.log(`  Wall creatures: avg=${result.wallAvg}`);
  console.log(`  Final generation: ${result.finalGen}`);
  console.log(`  Final species: ${result.finalSpecies}`);
  const finalSample = samples[samples.length - 1];
  if (finalSample.speciesDetail && finalSample.speciesDetail.length > 0) {
    const spStr = finalSample.speciesDetail.map(s => `${s.name}(${s.count})`).join(' ');
    console.log(`  Species breakdown: ${spStr}`);
  }
  console.log(`  Oldest creature: max=${result.maxOldest}s, avg=${result.avgOldest}s`);
  console.log(`  Total births: ${result.totalBirths}`);
  console.log(`  Sexual births: ${result.sexualBirths}`);
  console.log(`  Total deaths: ${result.totalDeaths}`);
  console.log(`  Avg share output: ${result.avgShareOut}`);
  console.log(`  Avg mate output: ${result.avgMateOut}`);
  console.log(`  Avg creatures sharing: ${result.avgSharing}`);
  console.log(`  Avg creatures mate-willing: ${result.avgMateWilling}`);
  console.log(`  Brain size: final avg=${result.finalAvgBrain}, range=[${result.brainRange[0]}, ${result.brainRange[1]}]`);
  console.log(`  Sense range: final avg=${result.finalAvgSense}, range=[${result.senseRange[0]}, ${result.senseRange[1]}]`);

  console.log('\n--- Health Checks ---');
  console.log(`  [${result.popStable ? 'PASS' : 'FAIL'}] Population stability (min >= 8): min=${result.popMin}`);
  console.log(`  [${result.noCornerTrapping ? 'PASS' : 'FAIL'}] No corner trapping (avg corner < 5): avg=${result.cornerAvg}`);
  console.log(`  [${result.seasonalEffect ? 'PASS' : 'FAIL'}] Seasonal cycle observed`);
  console.log(`  [${result.evolved ? 'PASS' : 'FAIL'}] Evolution progressing (gen > 5): gen=${result.finalGen}`);
  console.log(`  [INFO] Population floor hits (pop <= 12): ${result.floorHits}/${result.totalSamples} samples`);
  console.log(`\n  Overall: ${result.allPass ? 'PASS' : 'FAIL'}`);
  console.log('\n=== BENCHMARK COMPLETE ===\n');
}

// ---------------------------------------------------------------------------
// Multi-run aggregate report
// ---------------------------------------------------------------------------
function stat(values) {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / n;
  const stddev = Math.sqrt(variance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { mean: +mean.toFixed(1), stddev: +stddev.toFixed(1), min, max };
}

function reportMulti(results) {
  const n = results.length;
  console.log(`\n=== EMERGENCE BENCHMARK: ${n} RUNS ===\n`);
  console.log(`Ticks per run: ${TOTAL_TICKS}`);
  console.log(`Samples per run: ${results[0].totalSamples}\n`);

  // Per-run summary table
  console.log('--- Per-Run Summary ---');
  console.log('  run | pop(min/avg/max) | gen | spp | births(sex) | deaths | brain | sense | oldest | pass');
  console.log('  ----|------------------|-----|-----|-------------|--------|-------|-------|--------|-----');
  for (const r of results) {
    console.log(
      `  ${String(r.runIndex + 1).padStart(3)} | ` +
      `${String(r.popMin).padStart(3)}/${String(r.popAvg).padStart(5)}/${String(r.popMax).padStart(3)} | ` +
      `${String(r.finalGen).padStart(3)} | ` +
      `${String(r.finalSpecies).padStart(3)} | ` +
      `${String(r.totalBirths).padStart(5)}(${String(r.sexualBirths).padStart(3)}) | ` +
      `${String(r.totalDeaths).padStart(6)} | ` +
      `${String(r.finalAvgBrain).padStart(5)} | ` +
      `${String(r.finalAvgSense).padStart(5)} | ` +
      `${String(r.maxOldest).padStart(4)}s | ` +
      `${r.allPass ? 'PASS' : 'FAIL'}`
    );
  }

  // Aggregate statistics
  console.log('\n--- Aggregate Statistics (mean +/- stddev [min, max]) ---');

  const metrics = [
    ['Avg population',    results.map(r => r.popAvg)],
    ['Min population',    results.map(r => r.popMin)],
    ['Max population',    results.map(r => r.popMax)],
    ['Final generation',  results.map(r => r.finalGen)],
    ['Final species',     results.map(r => r.finalSpecies)],
    ['Total births',      results.map(r => r.totalBirths)],
    ['Sexual births',     results.map(r => r.sexualBirths)],
    ['Total deaths',      results.map(r => r.totalDeaths)],
    ['Corner avg',        results.map(r => +r.cornerAvg)],
    ['Wall avg',          results.map(r => +r.wallAvg)],
    ['Avg share output',  results.map(r => +r.avgShareOut)],
    ['Avg mate output',   results.map(r => +r.avgMateOut)],
    ['Final avg brain',   results.map(r => r.finalAvgBrain)],
    ['Final avg sense',   results.map(r => r.finalAvgSense)],
    ['Max oldest (s)',    results.map(r => r.maxOldest)],
    ['Floor hits',        results.map(r => r.floorHits)],
  ];

  for (const [label, values] of metrics) {
    const s = stat(values);
    console.log(`  ${label.padEnd(20)} ${String(s.mean).padStart(7)} +/- ${String(s.stddev).padStart(5)}  [${s.min}, ${s.max}]`);
  }

  // Winter/summer comparison
  const winterPops = results.filter(r => r.winterAvgPop !== null).map(r => r.winterAvgPop);
  const summerPops = results.filter(r => r.summerAvgPop !== null).map(r => r.summerAvgPop);
  if (winterPops.length > 0 && summerPops.length > 0) {
    const ws = stat(winterPops);
    const ss = stat(summerPops);
    console.log(`\n  Winter avg pop:  ${ws.mean} +/- ${ws.stddev}  [${ws.min}, ${ws.max}]`);
    console.log(`  Summer avg pop:  ${ss.mean} +/- ${ss.stddev}  [${ss.min}, ${ss.max}]`);
  }

  // Health check pass rates
  console.log('\n--- Health Check Pass Rates ---');
  const checks = [
    ['Population stability', results.filter(r => r.popStable).length],
    ['No corner trapping',   results.filter(r => r.noCornerTrapping).length],
    ['Seasonal effect',      results.filter(r => r.seasonalEffect).length],
    ['Evolution progressing', results.filter(r => r.evolved).length],
    ['Overall',              results.filter(r => r.allPass).length],
  ];
  for (const [label, passed] of checks) {
    console.log(`  ${label.padEnd(24)} ${passed}/${n} (${Math.round(passed / n * 100)}%)`);
  }

  const allPassCount = results.filter(r => r.allPass).length;
  console.log(`\n=== BENCHMARK COMPLETE: ${allPassCount}/${n} PASSED ===\n`);
  return allPassCount === n ? 0 : 1;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const browser = await chromium.launch({ headless: true });

  if (NUM_RUNS === 1) {
    const result = await runSingle(browser, 0);
    await browser.close();
    reportSingle(result);
    return result.allPass ? 0 : 1;
  }

  // Multi-run mode
  console.log(`Running ${NUM_RUNS} benchmark trials...`);
  const results = [];
  for (let i = 0; i < NUM_RUNS; i++) {
    const t0 = Date.now();
    const result = await runSingle(browser, i);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const tag = result.allPass ? 'PASS' : 'FAIL';
    console.log(`  Run ${i + 1}/${NUM_RUNS}: ${tag} (pop=${result.popAvg}, gen=${result.finalGen}, ${elapsed}s)`);
    results.push(result);
  }

  await browser.close();
  return reportMulti(results);
}

main().then(code => process.exit(code)).catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(2);
});
