// Long-run benchmark: 30000 ticks (8+ minutes sim time)
// Tests if evolution reliably bootstraps given enough time

const { chromium } = require('playwright');
const path = require('path');

const TOTAL_TICKS = 30000;
const SAMPLE_INTERVAL = 1500;
const BATCH = 300;
const TRIALS = 5;

async function runTrial(browser, trialNum) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('file://' + path.resolve(__dirname, 'emergence.html'));
  await page.click('#overlay');
  await page.waitForTimeout(100);

  const samples = [];
  for (let tick = 0; tick < TOTAL_TICKS; tick += BATCH) {
    const batchTicks = Math.min(BATCH, TOTAL_TICKS - tick);
    const result = await page.evaluate(({ batchTicks, sampleInterval, currentTick }) => {
      const w = window.__world;
      const audio = { eatClick(){}, birthPing(){}, deathThud(){}, predationSweep(){}, setPopulation(){}, setEcosystemState(){} };
      const snaps = [];
      for (let i = 0; i < batchTicks; i++) {
        w.update(audio);
        const t = currentTick + i + 1;
        if (t % sampleInterval === 0) {
          snaps.push({
            tick: t,
            pop: w.creatures.length,
            maxGen: w.maxGen,
            births: w.births,
            deaths: w.deaths,
            seasonPhase: +w.seasonPhase.toFixed(3),
          });
        }
      }
      return snaps;
    }, { batchTicks, sampleInterval: SAMPLE_INTERVAL, currentTick: tick });
    samples.push(...result);
  }

  await page.close();

  const final = samples[samples.length - 1];
  const pops = samples.map(s => s.pop);
  const maxPop = Math.max(...pops);
  const avgPop = (pops.reduce((a, b) => a + b, 0) / pops.length).toFixed(1);
  const bootstrapped = maxPop > 40;

  // Find bootstrap tick (first sample with pop > 35)
  const bootstrapSample = samples.find(s => s.pop > 35);
  const bootstrapTick = bootstrapSample ? bootstrapSample.tick : 'never';

  console.log(
    `  Trial ${trialNum}: pop avg=${avgPop}, max=${maxPop}, gen=${final.maxGen}, ` +
    `births=${final.births}, bootstrap=${bootstrapTick}`
  );

  return { samples, maxPop, avgPop: parseFloat(avgPop), maxGen: final.maxGen, births: final.births, bootstrapped };
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  console.log(`\n=== LONG RUN: ${TOTAL_TICKS} ticks x ${TRIALS} trials ===\n`);

  const results = [];
  for (let t = 0; t < TRIALS; t++) {
    results.push(await runTrial(browser, t + 1));
  }

  const bootstrapped = results.filter(r => r.bootstrapped).length;
  const avgMaxGen = (results.reduce((a, r) => a + r.maxGen, 0) / results.length).toFixed(1);
  const avgBirths = (results.reduce((a, r) => a + r.births, 0) / results.length).toFixed(0);

  console.log(`\n--- Summary ---`);
  console.log(`  Bootstrapped (pop > 40): ${bootstrapped}/${TRIALS} trials`);
  console.log(`  Avg max generation: ${avgMaxGen}`);
  console.log(`  Avg total births: ${avgBirths}`);

  await browser.close();
}

run().catch(err => { console.error(err); process.exit(1); });
