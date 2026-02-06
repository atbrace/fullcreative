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

          snapshots.push({
            tick: t,
            pop: w.creatures.length,
            food: w.food.length,
            dayPhase: +w.dayPhase.toFixed(3),
            seasonPhase: +w.seasonPhase.toFixed(3),
            births: w.births,
            deaths: w.deaths,
            maxGen: w.maxGen,
            species: w.countSpecies(),
            wallCount,
            cornerCount,
            inCurrentZone,
            numCurrents: w.currents.length,
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
  console.log('  tick   | pop  | food | season     | gen | species | wall | corner | inCurrent');
  console.log('  -------|------|------|------------|-----|---------|------|--------|----------');
  for (const s of samples) {
    const sp = s.seasonPhase;
    const season = sp > 0.75 ? 'summer' : sp > 0.5 ? 'spring' : sp > 0.25 ? 'autumn' : 'winter';
    console.log(
      `  ${String(s.tick).padStart(6)} | ${String(s.pop).padStart(4)} | ${String(s.food).padStart(4)} | ` +
      `${season.padEnd(10)} | ${String(s.maxGen).padStart(3)} | ${String(s.species).padStart(7)} | ` +
      `${String(s.wallCount).padStart(4)} | ${String(s.cornerCount).padStart(6)} | ${String(s.inCurrentZone).padStart(9)}`
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
  console.log(`  Total births: ${finalSample.births}`);
  console.log(`  Total deaths: ${finalSample.deaths}`);

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

  console.log('\n=== BENCHMARK COMPLETE ===\n');
}

run().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
