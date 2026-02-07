// A/B diagnostic: run simulation with and without currents/seasons
// to isolate what's suppressing evolution

const { chromium } = require('playwright');
const path = require('path');

const TOTAL_TICKS = 10800; // 3 minutes sim time
const SAMPLE_INTERVAL = 900;
const BATCH = 300;
const TRIALS = 3;

async function runTrial(browser, label, setupFn) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const filePath = 'file://' + path.resolve(__dirname, 'emergence.html');
  await page.goto(filePath);
  await page.click('#overlay');
  await page.waitForTimeout(100);

  // Apply configuration override
  if (setupFn) {
    await page.evaluate(setupFn);
  }

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
            food: w.food.length,
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
  return { label, samples };
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  const configs = [
    {
      label: 'FULL (currents + seasons)',
      setup: null,
    },
    {
      label: 'NO CURRENTS (seasons only)',
      setup: `window.__world.currents = [];`,
    },
    {
      label: 'NO SEASONS (currents only)',
      setup: `
        // Override seasonPhase to always return 0.75 (perpetual summer)
        Object.defineProperty(window.__world.__proto__, 'seasonPhase', {
          get() { return 0.75; },
          configurable: true
        });
      `,
    },
    {
      label: 'BASELINE (no currents, no seasons)',
      setup: `
        window.__world.currents = [];
        Object.defineProperty(window.__world.__proto__, 'seasonPhase', {
          get() { return 0.75; },
          configurable: true
        });
      `,
    },
  ];

  console.log(`Running ${configs.length} configs x ${TRIALS} trials each (${TOTAL_TICKS} ticks per trial)...\n`);

  for (const cfg of configs) {
    const allPops = [];
    const allGens = [];
    const allBirths = [];

    for (let t = 0; t < TRIALS; t++) {
      const { samples } = await runTrial(browser, cfg.label, cfg.setup ? new Function(cfg.setup) : null);
      const finalPops = samples.map(s => s.pop);
      const finalSample = samples[samples.length - 1];
      allPops.push(...finalPops);
      allGens.push(finalSample.maxGen);
      allBirths.push(finalSample.births);
    }

    const avgPop = (allPops.reduce((a, b) => a + b, 0) / allPops.length).toFixed(1);
    const maxPop = Math.max(...allPops);
    const minPop = Math.min(...allPops);
    const avgGen = (allGens.reduce((a, b) => a + b, 0) / allGens.length).toFixed(1);
    const maxGen = Math.max(...allGens);
    const avgBirths = (allBirths.reduce((a, b) => a + b, 0) / allBirths.length).toFixed(0);

    console.log(`[${cfg.label}]`);
    console.log(`  Pop: min=${minPop}, max=${maxPop}, avg=${avgPop}`);
    console.log(`  Gen (3 trials): ${allGens.join(', ')} -> avg=${avgGen}, max=${maxGen}`);
    console.log(`  Births (3 trials): ${allBirths.join(', ')} -> avg=${avgBirths}`);
    console.log();
  }

  await browser.close();
  console.log('Done.');
}

run().catch(err => { console.error(err); process.exit(1); });
