// Energy economy A/B test
// Tests parameter variants to find sustainable ecosystem equilibrium
//
// Target state:
// - Avg lifespan 25-40s (currently ~10s)
// - Self-sustaining: births >= deaths (currently births/deaths = 0.70)
// - Floor hits rare (currently every ~14s)
// - Gen 80+ in 54K ticks
// - Avg energy 60-80, 15-25% above reproduce threshold

const { chromium } = require('playwright');
const path = require('path');

const TOTAL_TICKS = 54000;
const SAMPLE_INTERVAL = 600;
const BATCH_SIZE = 600;
const RUNS_PER_CONFIG = 5;

const CONFIGS = {
  A_baseline: {},
  B_lower_metabolism: {
    METABOLISM_BASE: 0.08,
  },
  C_more_food_value: {
    FOOD_ENERGY: 45,
  },
  D_combined_moderate: {
    METABOLISM_BASE: 0.09,
    FOOD_ENERGY: 35,
  },
  E_combined_aggressive: {
    METABOLISM_BASE: 0.07,
    FOOD_ENERGY: 40,
    METABOLISM_SIZE_EXP: 1.2,
  },
  F_repro_economics: {
    METABOLISM_BASE: 0.08,
    FOOD_ENERGY: 35,
    REPRODUCE_KEEP: 0.45,
    REPRODUCE_GIVE: 0.32,
  },
};

async function runSingle(browser, configName, patches, runIndex) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const filePath = 'file://' + path.resolve(__dirname, 'emergence.html');
  await page.goto(filePath);

  // Patch CFG before starting
  if (Object.keys(patches).length > 0) {
    await page.evaluate((p) => {
      for (const [k, v] of Object.entries(p)) CFG[k] = v;
    }, patches);
  }

  await page.click('#overlay');
  await page.waitForTimeout(200);

  // Inject predation counter
  await page.evaluate(() => {
    window.__predationKills = 0;
    const orig = window.__world.eventLog.notifyPredation.bind(window.__world.eventLog);
    window.__world.eventLog.notifyPredation = function() {
      window.__predationKills++;
      orig();
    };
  });

  const samples = [];

  for (let tick = 0; tick < TOTAL_TICKS; tick += BATCH_SIZE) {
    const batchTicks = Math.min(BATCH_SIZE, TOTAL_TICKS - tick);
    const batch = await page.evaluate(({ batchTicks, sampleInterval, currentTick }) => {
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
          const n = w.creatures.length || 1;
          let totalEnergy = 0, highEnergy = 0;
          let totalShareOut = 0, totalMateOut = 0;
          let sharingCount = 0, mateWilling = 0;
          let totalSize = 0, totalSpeed = 0, totalBrain = 0, totalSense = 0;
          let oldestAge = 0;
          const turnOuts = [], spdOuts = [], shareOuts = [], mateOuts = [];
          for (let j = 0; j < w.creatures.length; j++) {
            const c = w.creatures[j];
            totalEnergy += c.energy;
            if (c.energy > 100) highEnergy++;
            totalShareOut += c.shareOut;
            totalMateOut += c.mateOut;
            if (c.shareOut > 0.1) sharingCount++;
            if (c.mateOut > 0.3) mateWilling++;
            totalSize += c.genes.size;
            totalSpeed += c.genes.speedGene;
            totalBrain += (c.genes.brainSize || c.brain.nh);
            totalSense += (c.genes.senseRange || 130);
            if (c.age > oldestAge) oldestAge = c.age;
            if (c.brain.lastOutput) {
              turnOuts.push(c.brain.lastOutput[0]);
              spdOuts.push(c.brain.lastOutput[1]);
            }
            shareOuts.push(c.shareOut);
            mateOuts.push(c.mateOut);
          }
          function variance(arr) {
            if (arr.length < 2) return 0;
            const m = arr.reduce((a, b) => a + b, 0) / arr.length;
            return arr.reduce((a, v) => a + (v - m) ** 2, 0) / arr.length;
          }
          snaps.push({
            tick: t,
            pop: w.creatures.length,
            food: w.food.length,
            births: w.births,
            sexualBirths: w.sexualBirths || 0,
            deaths: w.deaths,
            predKills: window.__predationKills,
            maxGen: w.maxGen,
            species: w.countSpecies(),
            avgEnergy: +(totalEnergy / n).toFixed(1),
            highEnergyPct: +(highEnergy / n * 100).toFixed(0),
            avgShareOut: +(totalShareOut / n).toFixed(3),
            avgMateOut: +(totalMateOut / n).toFixed(3),
            sharingCount,
            mateWilling,
            avgSize: +(totalSize / n).toFixed(3),
            avgSpeed: +(totalSpeed / n).toFixed(3),
            avgBrain: +(totalBrain / n).toFixed(1),
            avgSense: +(totalSense / n).toFixed(0),
            oldestAge: Math.round(oldestAge / 60),
            turnVar: +variance(turnOuts).toFixed(4),
            shareVar: +variance(shareOuts).toFixed(4),
            mateVar: +variance(mateOuts).toFixed(4),
            floorHit: w.creatures.length <= 22 ? 1 : 0,
          });
        }
      }
      return snaps;
    }, { batchTicks, sampleInterval: SAMPLE_INTERVAL, currentTick: tick });
    samples.push(...batch);
  }

  await context.close();

  // Compute summary
  const final = samples[samples.length - 1];
  const pops = samples.map(s => s.pop);
  const avgPop = +(pops.reduce((a, b) => a + b, 0) / pops.length).toFixed(1);
  const deathRate = final.deaths / TOTAL_TICKS;
  const avgLifespan = deathRate > 0 ? +(avgPop / deathRate).toFixed(0) : 0;
  const birthDeathRatio = final.deaths > 0 ? +(final.births / final.deaths).toFixed(2) : 0;
  const third = Math.floor(samples.length / 3);
  const lateSlice = samples.slice(third * 2);
  function avgF(arr, f) { return +(arr.reduce((a, s) => a + s[f], 0) / arr.length).toFixed(3); }

  return {
    configName, runIndex,
    avgPop,
    popMin: Math.min(...pops),
    popMax: Math.max(...pops),
    finalGen: final.maxGen,
    totalBirths: final.births,
    sexualBirths: final.sexualBirths,
    totalDeaths: final.deaths,
    predKills: final.predKills,
    predPct: final.deaths > 0 ? +(final.predKills / final.deaths * 100).toFixed(1) : 0,
    birthDeathRatio,
    avgLifespanTicks: avgLifespan,
    avgLifespanSec: +(avgLifespan / 60).toFixed(1),
    floorHits: samples.filter(s => s.floorHit).length,
    avgEnergy: avgF(samples, 'avgEnergy'),
    lateHighEnergyPct: avgF(lateSlice, 'highEnergyPct'),
    lateAvgSize: avgF(lateSlice, 'avgSize'),
    lateAvgSpeed: avgF(lateSlice, 'avgSpeed'),
    lateAvgBrain: avgF(lateSlice, 'avgBrain'),
    lateAvgSense: avgF(lateSlice, 'avgSense'),
    lateTurnVar: avgF(lateSlice, 'turnVar'),
    lateShareVar: avgF(lateSlice, 'shareVar'),
    lateMateVar: avgF(lateSlice, 'mateVar'),
    maxOldest: Math.max(...samples.map(s => s.oldestAge)),
    avgOldest: +(samples.reduce((a, s) => a + s.oldestAge, 0) / samples.length).toFixed(1),
    finalSpecies: final.species,
  };
}

function stat(vals) {
  const n = vals.length;
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / n);
  return { mean: +mean.toFixed(2), sd: +sd.toFixed(2), min: Math.min(...vals), max: Math.max(...vals) };
}

function fmtS(s) { return `${s.mean} +/-${s.sd} [${s.min},${s.max}]`; }

async function main() {
  const browser = await chromium.launch({ headless: true });
  const configNames = Object.keys(CONFIGS);
  const allResults = {};

  for (const name of configNames) {
    allResults[name] = [];
    const patches = CONFIGS[name];
    process.stdout.write(`\n  ${name}: `);
    for (let i = 0; i < RUNS_PER_CONFIG; i++) {
      const t0 = Date.now();
      const r = await runSingle(browser, name, patches, i);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      process.stdout.write(`${r.avgLifespanSec}s `);
      allResults[name].push(r);
    }
  }
  await browser.close();

  // Report
  console.log(`\n\n${'='.repeat(90)}`);
  console.log(`  ENERGY ECONOMY A/B TEST: ${configNames.length} configs x ${RUNS_PER_CONFIG} runs x ${TOTAL_TICKS} ticks`);
  console.log(`${'='.repeat(90)}`);

  // Config descriptions
  console.log('\n--- Configurations ---');
  for (const name of configNames) {
    const patches = CONFIGS[name];
    const desc = Object.keys(patches).length === 0 ? '(no changes)' :
      Object.entries(patches).map(([k, v]) => `${k}=${v}`).join(', ');
    console.log(`  ${name.padEnd(25)} ${desc}`);
  }

  // Comparison table
  console.log('\n--- Key Metrics (mean across runs) ---');
  console.log('  ' + 'Config'.padEnd(25) + 'Life(s)  B/D    FloorH  AvgPop  Gen    HiNrg%  Pred%   TurnV   ShareV  MateV   MaxOld');
  console.log('  ' + '-'.repeat(25) + '-------  -----  ------  ------  -----  ------  ------  ------  ------  ------  ------');

  for (const name of configNames) {
    const runs = allResults[name];
    const life = stat(runs.map(r => r.avgLifespanSec));
    const bd = stat(runs.map(r => r.birthDeathRatio));
    const fh = stat(runs.map(r => r.floorHits));
    const pop = stat(runs.map(r => r.avgPop));
    const gen = stat(runs.map(r => r.finalGen));
    const he = stat(runs.map(r => r.lateHighEnergyPct));
    const pred = stat(runs.map(r => r.predPct));
    const tv = stat(runs.map(r => r.lateTurnVar));
    const sv = stat(runs.map(r => r.lateShareVar));
    const mv = stat(runs.map(r => r.lateMateVar));
    const mo = stat(runs.map(r => r.maxOldest));
    console.log(
      `  ${name.padEnd(25)}` +
      `${String(life.mean).padStart(5)}s  ` +
      `${String(bd.mean).padStart(5)}  ` +
      `${String(fh.mean).padStart(6)}  ` +
      `${String(pop.mean).padStart(6)}  ` +
      `${String(gen.mean).padStart(5)}  ` +
      `${String(he.mean).padStart(6)}  ` +
      `${String(pred.mean).padStart(6)}  ` +
      `${String(tv.mean).padStart(6)}  ` +
      `${String(sv.mean).padStart(6)}  ` +
      `${String(mv.mean).padStart(6)}  ` +
      `${String(mo.mean).padStart(6)}`
    );
  }

  // Detailed per-config stats
  console.log('\n--- Detailed Statistics Per Config ---');
  for (const name of configNames) {
    const runs = allResults[name];
    console.log(`\n  ${name}:`);
    const metrics = [
      ['Avg lifespan (s)',    runs.map(r => r.avgLifespanSec)],
      ['Birth/death ratio',   runs.map(r => r.birthDeathRatio)],
      ['Floor hits',          runs.map(r => r.floorHits)],
      ['Avg population',      runs.map(r => r.avgPop)],
      ['Final generation',    runs.map(r => r.finalGen)],
      ['Total births',        runs.map(r => r.totalBirths)],
      ['Sexual births',       runs.map(r => r.sexualBirths)],
      ['Predation kills',     runs.map(r => r.predKills)],
      ['Predation % deaths',  runs.map(r => r.predPct)],
      ['Avg energy',          runs.map(r => r.avgEnergy)],
      ['Late high-energy %',  runs.map(r => r.lateHighEnergyPct)],
      ['Late avg size',       runs.map(r => r.lateAvgSize)],
      ['Late avg speed',      runs.map(r => r.lateAvgSpeed)],
      ['Late avg brain',      runs.map(r => r.lateAvgBrain)],
      ['Late avg sense',      runs.map(r => r.lateAvgSense)],
      ['Late turn variance',  runs.map(r => r.lateTurnVar)],
      ['Late share variance', runs.map(r => r.lateShareVar)],
      ['Late mate variance',  runs.map(r => r.lateMateVar)],
      ['Max oldest (s)',      runs.map(r => r.maxOldest)],
      ['Avg oldest (s)',      runs.map(r => r.avgOldest)],
      ['Final species',       runs.map(r => r.finalSpecies)],
    ];
    for (const [label, vals] of metrics) {
      const s = stat(vals);
      console.log(`    ${label.padEnd(22)} ${fmtS(s)}`);
    }
  }

  console.log(`\n${'='.repeat(90)}`);
  console.log(`  A/B TEST COMPLETE`);
  console.log(`${'='.repeat(90)}\n`);
}

main().catch(err => { console.error('A/B test failed:', err); process.exit(2); });
