// Emergence headless benchmark
// Runs simulation through a full season cycle, sampling population dynamics,
// creature distribution, and feature health.
//
// Usage: node benchmark.js
// Requires: playwright (npm install)

const { chromium } = require('playwright');
const path = require('path');

const TICKS_PER_SAMPLE = 600;   // sample every 600 ticks (~10 sim-seconds)
const TOTAL_TICKS = 18000;      // 1.25 season cycles (14400 = 1 full cycle)
const BATCH_SIZE = 300;         // ticks per evaluate call (avoid timeout)

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const filePath = 'file://' + path.resolve(__dirname, 'emergence.html');
  await page.goto(filePath);

  // Click overlay to start simulation
  await page.click('#overlay');
  await page.waitForTimeout(200);

  // Mute audio to avoid headless audio issues
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
      // Create a silent audio stub for update calls
      const silentAudio = {
        eatClick() {}, birthPing() {}, deathThud() {},
        predationSweep() {}, setPopulation() {}
      };

      const snapshots = [];

      for (let i = 0; i < batchTicks; i++) {
        w.update(silentAudio);

        const t = currentTick + i + 1;
        if (t % sampleInterval === 0) {
          // Count creatures near walls (within 15px of any edge)
          const W = w.w, H = w.h;
          let wallCount = 0;
          let cornerCount = 0;
          const WALL_THRESH = 20;
          const CORNER_THRESH = 40;

          for (let j = 0; j < w.creatures.length; j++) {
            const c = w.creatures[j];
            const nearL = c.pos.x < WALL_THRESH;
            const nearR = c.pos.x > W - WALL_THRESH;
            const nearT = c.pos.y < WALL_THRESH;
            const nearB = c.pos.y > H - WALL_THRESH;
            if (nearL || nearR || nearT || nearB) wallCount++;
            // Corner = near two walls
            if ((nearL || nearR) && (nearT || nearB)) cornerCount++;
          }

          // Measure creature distribution in current zones
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

          // Sharing and mating activity + brain size stats
          let sharingCount = 0, mateWillingCount = 0;
          let totalShareOut = 0, totalMateOut = 0;
          let totalBrainSize = 0, minBrain = 99, maxBrain = 0;
          let totalSenseRange = 0, minSense = 999, maxSense = 0;
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
          });
        }
      }

      return snapshots;
    }, { batchTicks, sampleInterval: TICKS_PER_SAMPLE, currentTick: tick });

    samples.push(...sample);
  }

  await browser.close();

  // --- Analysis ---
  console.log('\n=== EMERGENCE BENCHMARK RESULTS ===\n');
  console.log(`Ticks simulated: ${TOTAL_TICKS}`);
  console.log(`Samples collected: ${samples.length}`);
  console.log(`Current zones: ${samples[0]?.numCurrents || '?'}\n`);

  // Population timeline
  console.log('--- Population Timeline ---');
  console.log('  tick   | pop  | food | season     | gen | species | shr | mat | sexB | wall | corner | brain(a/min/max) | vis(a/min/max)');
  console.log('  -------|------|------|------------|-----|---------|-----|-----|------|------|--------|-----------------|---------------');
  for (const s of samples) {
    const sp = s.seasonPhase;
    const season = sp > 0.75 ? 'summer' : sp > 0.5 ? 'spring' : sp > 0.25 ? 'autumn' : 'winter';
    console.log(
      `  ${String(s.tick).padStart(6)} | ${String(s.pop).padStart(4)} | ${String(s.food).padStart(4)} | ` +
      `${season.padEnd(10)} | ${String(s.maxGen).padStart(3)} | ${String(s.species).padStart(7)} | ` +
      `${String(s.sharingCount).padStart(3)} | ${String(s.mateWillingCount).padStart(3)} | ` +
      `${String(s.sexualBirths).padStart(4)} | ${String(s.wallCount).padStart(4)} | ${String(s.cornerCount).padStart(6)} | ` +
      `${s.avgBrainSize}/${s.minBrainSize}/${s.maxBrainSize}`.padEnd(17) + '| ' +
      `${s.avgSenseRange}/${s.minSenseRange}/${s.maxSenseRange}`
    );
  }

  // Summary stats
  const pops = samples.map(s => s.pop);
  const minPop = Math.min(...pops);
  const maxPop = Math.max(...pops);
  const avgPop = (pops.reduce((a, b) => a + b, 0) / pops.length).toFixed(1);

  const cornerCounts = samples.map(s => s.cornerCount);
  const maxCorner = Math.max(...cornerCounts);
  const avgCorner = (cornerCounts.reduce((a, b) => a + b, 0) / cornerCounts.length).toFixed(1);

  const wallCounts = samples.map(s => s.wallCount);
  const maxWall = Math.max(...wallCounts);
  const avgWall = (wallCounts.reduce((a, b) => a + b, 0) / wallCounts.length).toFixed(1);

  // Winter vs summer comparison
  const winterSamples = samples.filter(s => s.seasonPhase <= 0.25);
  const summerSamples = samples.filter(s => s.seasonPhase >= 0.75);
  const winterAvgPop = winterSamples.length > 0
    ? (winterSamples.reduce((a, s) => a + s.pop, 0) / winterSamples.length).toFixed(1)
    : 'N/A';
  const summerAvgPop = summerSamples.length > 0
    ? (summerSamples.reduce((a, s) => a + s.pop, 0) / summerSamples.length).toFixed(1)
    : 'N/A';

  const finalSample = samples[samples.length - 1];

  console.log('\n--- Summary ---');
  console.log(`  Population: min=${minPop}, max=${maxPop}, avg=${avgPop}`);
  console.log(`  Winter avg pop: ${winterAvgPop}`);
  console.log(`  Summer avg pop: ${summerAvgPop}`);
  console.log(`  Corner creatures: max=${maxCorner}, avg=${avgCorner}`);
  console.log(`  Wall creatures: max=${maxWall}, avg=${avgWall}`);
  console.log(`  Final generation: ${finalSample.maxGen}`);
  console.log(`  Final species: ${finalSample.species}`);
  if (finalSample.speciesDetail && finalSample.speciesDetail.length > 0) {
    const spStr = finalSample.speciesDetail.map(s => `${s.name}(${s.count})`).join(' ');
    console.log(`  Species breakdown: ${spStr}`);
  }
  console.log(`  Total births: ${finalSample.births}`);
  console.log(`  Sexual births: ${finalSample.sexualBirths}`);
  console.log(`  Total deaths: ${finalSample.deaths}`);

  // Social metrics
  const avgShare = (samples.reduce((a, s) => a + s.avgShareOut, 0) / samples.length).toFixed(3);
  const avgMate = (samples.reduce((a, s) => a + s.avgMateOut, 0) / samples.length).toFixed(3);
  const avgSharing = (samples.reduce((a, s) => a + s.sharingCount, 0) / samples.length).toFixed(1);
  const avgMateWilling = (samples.reduce((a, s) => a + s.mateWillingCount, 0) / samples.length).toFixed(1);
  console.log(`  Avg share output: ${avgShare}`);
  console.log(`  Avg mate output: ${avgMate}`);
  console.log(`  Avg creatures sharing: ${avgSharing}`);
  console.log(`  Avg creatures mate-willing: ${avgMateWilling}`);

  // Brain size metrics
  const avgBrainOverall = (samples.reduce((a, s) => a + s.avgBrainSize, 0) / samples.length).toFixed(1);
  const globalMinBrain = Math.min(...samples.map(s => s.minBrainSize));
  const globalMaxBrain = Math.max(...samples.map(s => s.maxBrainSize));
  const finalAvgBrain = samples[samples.length - 1].avgBrainSize;
  console.log(`  Brain size: overall avg=${avgBrainOverall}, range=[${globalMinBrain}, ${globalMaxBrain}]`);
  console.log(`  Final avg brain size: ${finalAvgBrain}`);

  // Sense range metrics
  const avgSenseOverall = (samples.reduce((a, s) => a + s.avgSenseRange, 0) / samples.length).toFixed(0);
  const globalMinSense = Math.min(...samples.map(s => s.minSenseRange));
  const globalMaxSense = Math.max(...samples.map(s => s.maxSenseRange));
  const finalAvgSense = samples[samples.length - 1].avgSenseRange;
  console.log(`  Sense range: overall avg=${avgSenseOverall}, range=[${globalMinSense}, ${globalMaxSense}]`);
  console.log(`  Final avg sense range: ${finalAvgSense}`);

  // Health checks
  console.log('\n--- Health Checks ---');
  const popStable = minPop >= 8;
  const noCornerTrapping = avgCorner < 5;
  const seasonalEffect = winterSamples.length > 0 && summerSamples.length > 0;
  const evolved = finalSample.maxGen > 5;

  console.log(`  [${popStable ? 'PASS' : 'FAIL'}] Population stability (min >= 8): min=${minPop}`);
  console.log(`  [${noCornerTrapping ? 'PASS' : 'FAIL'}] No corner trapping (avg corner < 5): avg=${avgCorner}`);
  console.log(`  [${seasonalEffect ? 'PASS' : 'FAIL'}] Seasonal cycle observed: ${winterSamples.length} winter samples, ${summerSamples.length} summer samples`);
  console.log(`  [${evolved ? 'PASS' : 'FAIL'}] Evolution progressing (gen > 5): gen=${finalSample.maxGen}`);

  // Check for population floor hits
  const floorHits = samples.filter(s => s.pop <= 12).length;
  console.log(`  [INFO] Population floor hits (pop <= 12): ${floorHits}/${samples.length} samples`);

  const allPass = popStable && noCornerTrapping && seasonalEffect && evolved;
  console.log(`\n  Overall: ${allPass ? 'PASS' : 'FAIL'}`);
  console.log('\n=== BENCHMARK COMPLETE ===\n');
  return allPass ? 0 : 1;
}

run().then(code => process.exit(code)).catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(2);
});
