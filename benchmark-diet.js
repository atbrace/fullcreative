// Diet specialization diagnostic
// Checks if the diet-weighted perception creates actual flora/mineral niche separation
//
// Usage: node benchmark-diet.js [--runs=N]

const { chromium } = require('playwright');
const path = require('path');

const runsArg = process.argv.find(a => a.startsWith('--runs='));
const NUM_RUNS = runsArg ? parseInt(runsArg.split('=')[1], 10) : 3;

const TOTAL_TICKS = 54000;
const BATCH_SIZE = 600;
const SAMPLE_INTERVAL = 1800; // every 30 sim-seconds

async function runSingle(browser, runIndex) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const filePath = 'file://' + path.resolve(__dirname, 'emergence.html');
  await page.goto(filePath);
  await page.click('#overlay');
  await page.waitForTimeout(200);

  const samples = [];

  for (let tick = 0; tick < TOTAL_TICKS; tick += BATCH_SIZE) {
    const batchTicks = Math.min(BATCH_SIZE, TOTAL_TICKS - tick);

    const result = await page.evaluate(({ batchTicks, sampleInterval, currentTick }) => {
      const w = window.__world;
      const silentAudio = {
        eatClick() {}, birthPing() {}, deathThud() {},
        predationSweep() {}, setPopulation() {}, setEcosystemState() {}
      };

      const snaps = [];

      for (let i = 0; i < batchTicks; i++) {
        w.update(silentAudio);
        const t = currentTick + i + 1;

        if (t % sampleInterval === 0) {
          const diets = [];
          let floraSpec = 0, mineralSpec = 0, generalist = 0;
          let totalEnergy = 0;

          // Track diet-energy correlation
          const dietEnergy = [];

          for (let j = 0; j < w.creatures.length; j++) {
            const c = w.creatures[j];
            const d = c.genes.diet;
            diets.push(d);
            dietEnergy.push({ diet: d, energy: c.energy });

            if (d < 0.35) floraSpec++;
            else if (d > 0.65) mineralSpec++;
            else generalist++;

            totalEnergy += c.energy;
          }

          // Compute diet stats
          const n = diets.length || 1;
          const avgDiet = diets.reduce((a, b) => a + b, 0) / n;
          const dietVar = diets.reduce((a, v) => a + (v - avgDiet) ** 2, 0) / n;

          // Food type counts
          let floraFood = 0, mineralFood = 0, corpseFood = 0;
          for (let j = 0; j < w.food.length; j++) {
            if (w.food[j].type === 0) floraFood++;
            else if (w.food[j].type === 1) mineralFood++;
            else corpseFood++;
          }

          // Diet histogram (10 bins)
          const bins = new Array(10).fill(0);
          for (let j = 0; j < diets.length; j++) {
            const bin = Math.min(9, Math.floor(diets[j] * 10));
            bins[bin]++;
          }

          snaps.push({
            tick: t,
            pop: w.creatures.length,
            avgDiet: +avgDiet.toFixed(3),
            dietVariance: +dietVar.toFixed(4),
            floraSpecialists: floraSpec,
            mineralSpecialists: mineralSpec,
            generalists: generalist,
            dietHistogram: bins,
            floraFood,
            mineralFood,
            corpseFood,
            avgEnergy: +(totalEnergy / n).toFixed(1),
            births: w.births,
            deaths: w.deaths,
            maxGen: w.maxGen,
            species: w.countSpecies(),
          });
        }
      }

      return snaps;
    }, { batchTicks, sampleInterval: SAMPLE_INTERVAL, currentTick: tick });

    samples.push(...result);
  }

  await context.close();
  return { runIndex, samples };
}

(async () => {
  const browser = await chromium.launch();
  const allRuns = [];

  for (let r = 0; r < NUM_RUNS; r++) {
    process.stdout.write(`Run ${r + 1}/${NUM_RUNS}...`);
    const result = await runSingle(browser, r);
    allRuns.push(result);
    const last = result.samples[result.samples.length - 1];
    console.log(` flora=${last.floraSpecialists} mineral=${last.mineralSpecialists} gen=${last.generalists} avgDiet=${last.avgDiet}`);
  }

  await browser.close();

  // Aggregate
  console.log('\n============================================================');
  console.log('DIET SPECIALIZATION DIAGNOSTIC');
  console.log('============================================================\n');

  // Time-series average across runs
  const numSamples = allRuns[0].samples.length;
  console.log('Time-series (averaged across runs):');
  console.log('Tick    | AvgDiet | DietVar | Flora% | Mineral% | Gen%   | FloraFd | MinFd | Pop');
  console.log('--------|---------|---------|--------|----------|--------|---------|-------|-----');

  for (let i = 0; i < numSamples; i++) {
    let totalAvgDiet = 0, totalDietVar = 0;
    let totalFlora = 0, totalMineral = 0, totalGen = 0;
    let totalFloraFd = 0, totalMinFd = 0, totalPop = 0;

    for (const run of allRuns) {
      const s = run.samples[i];
      totalAvgDiet += s.avgDiet;
      totalDietVar += s.dietVariance;
      const n = s.floraSpecialists + s.mineralSpecialists + s.generalists || 1;
      totalFlora += s.floraSpecialists / n * 100;
      totalMineral += s.mineralSpecialists / n * 100;
      totalGen += s.generalists / n * 100;
      totalFloraFd += s.floraFood;
      totalMinFd += s.mineralFood;
      totalPop += s.pop;
    }

    const nr = allRuns.length;
    const tick = allRuns[0].samples[i].tick;
    console.log(
      `${String(tick).padStart(7)} | ${(totalAvgDiet / nr).toFixed(3).padStart(7)} | ${(totalDietVar / nr).toFixed(4).padStart(7)} | ${(totalFlora / nr).toFixed(1).padStart(5)}% | ${(totalMineral / nr).toFixed(1).padStart(7)}% | ${(totalGen / nr).toFixed(1).padStart(5)}% | ${(totalFloraFd / nr).toFixed(0).padStart(7)} | ${(totalMinFd / nr).toFixed(0).padStart(5)} | ${(totalPop / nr).toFixed(0).padStart(4)}`
    );
  }

  // Final state summary
  console.log('\n--- Final state per run ---');
  for (const run of allRuns) {
    const last = run.samples[run.samples.length - 1];
    const hist = last.dietHistogram;
    const histStr = hist.map((v, i) => `${(i / 10).toFixed(1)}-${((i + 1) / 10).toFixed(1)}:${v}`).join(' ');
    console.log(`Run ${run.runIndex}: avgDiet=${last.avgDiet} var=${last.dietVariance} flora=${last.floraSpecialists} mineral=${last.mineralSpecialists} gen=${last.generalists} gen=${last.maxGen}`);
    console.log(`  histogram: ${histStr}`);
  }

  // Success criteria
  console.log('\n--- Assessment ---');
  const finalSamples = allRuns.map(r => r.samples[r.samples.length - 1]);
  const avgMineralPct = finalSamples.reduce((a, s) => {
    const n = s.floraSpecialists + s.mineralSpecialists + s.generalists || 1;
    return a + s.mineralSpecialists / n * 100;
  }, 0) / finalSamples.length;
  const avgDietVar = finalSamples.reduce((a, s) => a + s.dietVariance, 0) / finalSamples.length;

  console.log(`Avg mineral specialist %: ${avgMineralPct.toFixed(1)}%`);
  console.log(`Avg diet variance: ${avgDietVar.toFixed(4)}`);

  if (avgMineralPct > 10 && avgDietVar > 0.03) {
    console.log('PASS: Diet specialization is working - both niches are occupied');
  } else if (avgMineralPct > 5) {
    console.log('PARTIAL: Some mineral specialists exist but niche separation is weak');
  } else {
    console.log('FAIL: Diet converges to single strategy - niche separation not working');
  }
})();
