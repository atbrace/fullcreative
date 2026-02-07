// Focused follow-up: test the E+F hybrid and a more aggressive version
const { chromium } = require('playwright');
const path = require('path');

const TOTAL_TICKS = 54000;
const SAMPLE_INTERVAL = 600;
const BATCH_SIZE = 600;
const RUNS_PER_CONFIG = 5;

const CONFIGS = {
  A_baseline: {},
  G_hybrid_EF: {
    METABOLISM_BASE: 0.07,
    METABOLISM_SIZE_EXP: 1.2,
    FOOD_ENERGY: 35,
    REPRODUCE_KEEP: 0.45,
    REPRODUCE_GIVE: 0.32,
  },
  H_hybrid_EF_plus: {
    METABOLISM_BASE: 0.06,
    METABOLISM_SIZE_EXP: 1.2,
    FOOD_ENERGY: 35,
    REPRODUCE_KEEP: 0.48,
    REPRODUCE_GIVE: 0.30,
  },
};

async function runSingle(browser, configName, patches, runIndex) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const filePath = 'file://' + path.resolve(__dirname, 'emergence.html');
  await page.goto(filePath);
  if (Object.keys(patches).length > 0) {
    await page.evaluate((p) => { for (const [k, v] of Object.entries(p)) CFG[k] = v; }, patches);
  }
  await page.click('#overlay');
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    window.__predationKills = 0;
    const orig = window.__world.eventLog.notifyPredation.bind(window.__world.eventLog);
    window.__world.eventLog.notifyPredation = function() { window.__predationKills++; orig(); };
  });

  const samples = [];
  for (let tick = 0; tick < TOTAL_TICKS; tick += BATCH_SIZE) {
    const batchTicks = Math.min(BATCH_SIZE, TOTAL_TICKS - tick);
    const batch = await page.evaluate(({ batchTicks, sampleInterval, currentTick }) => {
      const w = window.__world;
      const sa = { eatClick(){}, birthPing(){}, deathThud(){}, predationSweep(){}, setPopulation(){}, setEcosystemState(){} };
      const snaps = [];
      for (let i = 0; i < batchTicks; i++) {
        w.update(sa);
        const t = currentTick + i + 1;
        if (t % sampleInterval === 0) {
          const n = w.creatures.length || 1;
          let totalEnergy = 0, highEnergy = 0, reproReady = 0;
          let totalSize = 0, totalSpeed = 0, totalBrain = 0, totalSense = 0;
          let oldestAge = 0;
          let totalShareOut = 0, totalMateOut = 0;
          const shareOuts = [], mateOuts = [], turnOuts = [];
          for (let j = 0; j < w.creatures.length; j++) {
            const c = w.creatures[j];
            totalEnergy += c.energy;
            if (c.energy > 100) highEnergy++;
            if (c.energy > 120) reproReady++;
            totalSize += c.genes.size;
            totalSpeed += c.genes.speedGene;
            totalBrain += (c.genes.brainSize || c.brain.nh);
            totalSense += (c.genes.senseRange || 130);
            if (c.age > oldestAge) oldestAge = c.age;
            totalShareOut += c.shareOut;
            totalMateOut += c.mateOut;
            shareOuts.push(c.shareOut);
            mateOuts.push(c.mateOut);
            if (c.brain.lastOutput) turnOuts.push(c.brain.lastOutput[0]);
          }
          function variance(arr) {
            if (arr.length < 2) return 0;
            const m = arr.reduce((a, b) => a + b, 0) / arr.length;
            return arr.reduce((a, v) => a + (v - m) ** 2, 0) / arr.length;
          }
          snaps.push({
            tick: t, pop: w.creatures.length, food: w.food.length,
            births: w.births, sexualBirths: w.sexualBirths || 0,
            deaths: w.deaths, predKills: window.__predationKills,
            maxGen: w.maxGen, species: w.countSpecies(),
            avgEnergy: +(totalEnergy / n).toFixed(1),
            highEnergyPct: +(highEnergy / n * 100).toFixed(0),
            reproReadyPct: +(reproReady / n * 100).toFixed(0),
            avgSize: +(totalSize / n).toFixed(3),
            avgSpeed: +(totalSpeed / n).toFixed(3),
            avgBrain: +(totalBrain / n).toFixed(1),
            avgSense: +(totalSense / n).toFixed(0),
            oldestAge: Math.round(oldestAge / 60),
            avgShareOut: +(totalShareOut / n).toFixed(3),
            avgMateOut: +(totalMateOut / n).toFixed(3),
            turnVar: +variance(turnOuts).toFixed(4),
            shareVar: +variance(shareOuts).toFixed(4),
            mateVar: +variance(mateOuts).toFixed(4),
          });
        }
      }
      return snaps;
    }, { batchTicks, sampleInterval: SAMPLE_INTERVAL, currentTick: tick });
    samples.push(...batch);
  }
  await context.close();

  const final = samples[samples.length - 1];
  const pops = samples.map(s => s.pop);
  const avgPop = +(pops.reduce((a, b) => a + b, 0) / pops.length).toFixed(1);
  const deathRate = final.deaths / TOTAL_TICKS;
  const avgLifespan = deathRate > 0 ? +(avgPop / deathRate).toFixed(0) : 0;
  const third = Math.floor(samples.length / 3);
  const late = samples.slice(third * 2);
  function avgF(arr, f) { return +(arr.reduce((a, s) => a + s[f], 0) / arr.length).toFixed(3); }

  return {
    configName, runIndex, avgPop,
    popMin: Math.min(...pops), popMax: Math.max(...pops),
    finalGen: final.maxGen,
    totalBirths: final.births, sexualBirths: final.sexualBirths,
    totalDeaths: final.deaths, predKills: final.predKills,
    predPct: final.deaths > 0 ? +(final.predKills / final.deaths * 100).toFixed(1) : 0,
    birthDeathRatio: final.deaths > 0 ? +(final.births / final.deaths).toFixed(2) : 0,
    avgLifespanSec: +(avgLifespan / 60).toFixed(1),
    avgEnergy: avgF(samples, 'avgEnergy'),
    lateHighEnergyPct: avgF(late, 'highEnergyPct'),
    lateReproReadyPct: avgF(late, 'reproReadyPct'),
    lateAvgSize: avgF(late, 'avgSize'),
    lateAvgSpeed: avgF(late, 'avgSpeed'),
    lateAvgBrain: avgF(late, 'avgBrain'),
    lateAvgSense: avgF(late, 'avgSense'),
    lateTurnVar: avgF(late, 'turnVar'),
    lateShareVar: avgF(late, 'shareVar'),
    lateMateVar: avgF(late, 'mateVar'),
    maxOldest: Math.max(...samples.map(s => s.oldestAge)),
    avgOldest: +(samples.reduce((a, s) => a + s.oldestAge, 0) / samples.length).toFixed(1),
    finalSpecies: final.species,
    floorHits: samples.filter(s => s.pop <= 22).length,
  };
}

function stat(vals) {
  const n = vals.length;
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / n);
  return { mean: +mean.toFixed(2), sd: +sd.toFixed(2), min: Math.min(...vals), max: Math.max(...vals) };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const names = Object.keys(CONFIGS);
  const all = {};

  for (const name of names) {
    all[name] = [];
    process.stdout.write(`\n  ${name}: `);
    for (let i = 0; i < RUNS_PER_CONFIG; i++) {
      const t0 = Date.now();
      const r = await runSingle(browser, name, CONFIGS[name], i);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      process.stdout.write(`life=${r.avgLifespanSec}s old=${r.maxOldest}s b/d=${r.birthDeathRatio} `);
      all[name].push(r);
    }
  }
  await browser.close();

  console.log(`\n\n${'='.repeat(95)}`);
  console.log(`  ENERGY ECONOMY A/B TEST (round 2): ${names.length} configs x ${RUNS_PER_CONFIG} runs`);
  console.log(`${'='.repeat(95)}`);

  console.log('\n--- Configurations ---');
  for (const name of names) {
    const p = CONFIGS[name];
    console.log(`  ${name.padEnd(25)} ${Object.keys(p).length === 0 ? '(baseline)' : Object.entries(p).map(([k,v])=>`${k}=${v}`).join(', ')}`);
  }

  console.log('\n--- Comparison ---');
  console.log('  ' + 'Config'.padEnd(25) +
    'Life   B/D   Floor Pop   Gen   HiNrg ReprR Pred%  MaxOld AvgOld Species TurnV  ShrV   MatV');
  console.log('  ' + '-'.repeat(120));

  for (const name of names) {
    const r = all[name];
    const s = (arr, f) => stat(arr.map(x => x[f])).mean;
    console.log(
      `  ${name.padEnd(25)}` +
      `${String(s(r,'avgLifespanSec')).padStart(4)}s ` +
      `${String(s(r,'birthDeathRatio')).padStart(5)} ` +
      `${String(s(r,'floorHits')).padStart(5)} ` +
      `${String(s(r,'avgPop')).padStart(5)} ` +
      `${String(s(r,'finalGen')).padStart(5)} ` +
      `${String(s(r,'lateHighEnergyPct')).padStart(5)} ` +
      `${String(s(r,'lateReproReadyPct')).padStart(5)} ` +
      `${String(s(r,'predPct')).padStart(5)} ` +
      `${String(s(r,'maxOldest')).padStart(6)}s ` +
      `${String(s(r,'avgOldest')).padStart(5)}s ` +
      `${String(s(r,'finalSpecies')).padStart(5)}   ` +
      `${String(s(r,'lateTurnVar')).padStart(5)} ` +
      `${String(s(r,'lateShareVar')).padStart(6)} ` +
      `${String(s(r,'lateMateVar')).padStart(6)}`
    );
  }

  // Per-run detail
  console.log('\n--- Per-Run Detail ---');
  for (const name of names) {
    console.log(`\n  ${name}:`);
    for (const r of all[name]) {
      console.log(
        `    Run ${r.runIndex+1}: life=${r.avgLifespanSec}s b/d=${r.birthDeathRatio} ` +
        `pop=${r.avgPop} gen=${r.finalGen} ` +
        `births=${r.totalBirths}(sex=${r.sexualBirths}) pred=${r.predKills} ` +
        `oldest=${r.maxOldest}s species=${r.finalSpecies} ` +
        `size=${r.lateAvgSize} spd=${r.lateAvgSpeed} brain=${r.lateAvgBrain}`
      );
    }
  }

  console.log(`\n${'='.repeat(95)}\n`);
}

main().catch(err => { console.error(err); process.exit(2); });
