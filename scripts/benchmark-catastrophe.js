// ================================================================
// Benchmark: Environmental Catastrophes (#76) + Metabolic Costs (#75)
//
// Validates that catastrophes fire, create visible disruptions,
// and the ecosystem recovers. Also checks that combined with
// steeper metabolic costs, the ecosystem remains healthy.
//
// Success criteria:
// 1. At least 1 catastrophe fires per trial (mean > 0.5)
// 2. Population recovers after catastrophes (no permanent extinction)
// 3. Max generation > 40 (evolution not stalled)
// 4. Population avg > 20 (ecosystem viable)
// 5. Speed mean < 1.7 (metabolic costs still working)
// 6. Predation > 3% (not collapsed)
//
// Usage: node scripts/benchmark-catastrophe.js
// ================================================================

const { chromium } = require('playwright');

const NUM_TRIALS = 5;
const TOTAL_TICKS = 54000;
const SAMPLE_INTERVAL = 6000;
const POLL_INTERVAL_MS = 400;
const FILE_URL = 'file:///Users/austinbrace/Developer/fullcreative/emergence.html';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function collectSample(page) {
  return page.evaluate(() => {
    const w = window.__world;
    if (!w) return null;

    const creatures = w.creatures.filter(c => c.alive);
    const n = creatures.length;
    if (n === 0) return null;

    let sizeSum = 0, speedSum = 0, brainSum = 0, senseSum = 0;
    let shareSum = 0, maxGen = 0;

    for (let i = 0; i < n; i++) {
      const c = creatures[i];
      sizeSum += c.genes.size;
      speedSum += c.genes.speedGene;
      brainSum += c.genes.brainSize;
      senseSum += c.genes.senseRange;
      shareSum += c.shareOut;
      if (c.generation > maxGen) maxGen = c.generation;
    }

    const buckets = new Set();
    for (let i = 0; i < n; i++) buckets.add(Math.floor(creatures[i].genes.hue / 30));

    return {
      tick: w.tick,
      pop: n,
      maxGen,
      births: w.births,
      deaths: w.deaths,
      predationKills: w.predationKills || 0,
      species: buckets.size,
      sizeMean: sizeSum / n,
      speedMean: speedSum / n,
      brainMean: brainSum / n,
      senseMean: senseSum / n,
      shareMean: shareSum / n,
      catastrophe: w.catastrophe ? w.catastrophe.type : null,
    };
  });
}

async function countCatastropheEvents(page) {
  return page.evaluate(() => {
    const w = window.__world;
    if (!w) return { count: 0, types: {} };
    let count = 0;
    const types = {};
    for (let i = 0; i < w.eventLog.events.length; i++) {
      if (w.eventLog.events[i].type === 'catastrophe') {
        count++;
        const text = w.eventLog.events[i].text;
        const t = text.split(' - ')[0];
        types[t] = (types[t] || 0) + 1;
      }
    }
    return { count, types };
  });
}

async function runTrial(trialNum) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });

  await page.click('#overlay');
  await sleep(500);
  await page.keyboard.press('t');
  await sleep(200);

  const samples = [];
  let lastTick = 0;
  let minPop = Infinity;

  while (lastTick < TOTAL_TICKS) {
    await sleep(POLL_INTERVAL_MS);
    const sample = await collectSample(page);
    if (!sample) continue;
    if (sample.pop < minPop) minPop = sample.pop;
    if (sample.tick < lastTick + SAMPLE_INTERVAL) continue;
    lastTick = sample.tick;
    samples.push(sample);
    const pct = Math.round((sample.tick / TOTAL_TICKS) * 100);
    const catStr = sample.catastrophe ? ` [${sample.catastrophe}]` : '';
    process.stdout.write(`\r  Trial ${trialNum}: ${pct}% (tick ${sample.tick}, gen ${sample.maxGen}, pop ${sample.pop}${catStr})`);
  }

  const final = await collectSample(page);
  if (final && (samples.length === 0 || final.tick > samples[samples.length - 1].tick)) {
    samples.push(final);
  }

  const catEvents = await countCatastropheEvents(page);

  await browser.close();
  process.stdout.write('\n');
  return { samples, final: samples[samples.length - 1], catEvents, minPop };
}

async function main() {
  console.log(`\n=== Catastrophe + Metabolic Benchmark (#75 + #76) ===`);
  console.log(`${NUM_TRIALS} trials x ${TOTAL_TICKS} ticks at 32x\n`);

  const results = [];

  for (let t = 0; t < NUM_TRIALS; t++) {
    const result = await runTrial(t + 1);
    results.push(result);

    const f = result.final;
    const predPct = f.deaths > 0 ? (f.predationKills / f.deaths * 100) : 0;
    console.log(`  Trial ${t + 1}: gen ${f.maxGen}, pop ${f.pop}, minPop ${result.minPop}`);
    console.log(`    size: ${f.sizeMean.toFixed(2)}, speed: ${f.speedMean.toFixed(2)}, brain: ${f.brainMean.toFixed(1)}`);
    console.log(`    pred: ${predPct.toFixed(1)}%, share: ${f.shareMean.toFixed(3)}, species: ${f.species}`);
    console.log(`    catastrophes: ${result.catEvents.count} (${JSON.stringify(result.catEvents.types)})`);
  }

  // Aggregate
  console.log('\n=== Aggregate Results ===');
  const finals = results.map(r => r.final);
  const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;

  const maxGens = finals.map(f => f.maxGen);
  const pops = finals.map(f => f.pop);
  const speeds = finals.map(f => f.speedMean);
  const sizes = finals.map(f => f.sizeMean);
  const predPcts = finals.map(f => f.deaths > 0 ? f.predationKills / f.deaths * 100 : 0);
  const catCounts = results.map(r => r.catEvents.count);

  console.log(`Max generation:   ${avg(maxGens).toFixed(0)} [${Math.min(...maxGens)}, ${Math.max(...maxGens)}]`);
  console.log(`Population:       ${avg(pops).toFixed(0)} [${Math.min(...pops)}, ${Math.max(...pops)}]`);
  console.log(`Speed mean:       ${avg(speeds).toFixed(2)}`);
  console.log(`Size mean:        ${avg(sizes).toFixed(2)}`);
  console.log(`Predation %:      ${avg(predPcts).toFixed(1)}%`);
  console.log(`Catastrophes/trial: ${avg(catCounts).toFixed(1)} [${Math.min(...catCounts)}, ${Math.max(...catCounts)}]`);

  // Aggregate catastrophe types
  const allTypes = {};
  for (const r of results) {
    for (const [t, c] of Object.entries(r.catEvents.types)) {
      allTypes[t] = (allTypes[t] || 0) + c;
    }
  }
  console.log(`Catastrophe types: ${JSON.stringify(allTypes)}`);

  // Validation
  console.log('\n=== Validation ===');
  let passes = 0;
  const total = 6;

  const catOk = avg(catCounts) > 0.5;
  console.log(`1. Catastrophes fire:    ${catOk ? 'PASS' : 'FAIL'} (avg ${avg(catCounts).toFixed(1)}/trial)`);
  if (catOk) passes++;

  const recovers = results.every(r => r.final.pop > 10);
  console.log(`2. Pop recovers:         ${recovers ? 'PASS' : 'FAIL'} (final pops: ${pops.join(', ')})`);
  if (recovers) passes++;

  const genOk = avg(maxGens) > 40;
  console.log(`3. Avg gen > 40:         ${genOk ? 'PASS' : 'FAIL'} (${avg(maxGens).toFixed(0)})`);
  if (genOk) passes++;

  const popOk = avg(pops) > 20;
  console.log(`4. Avg pop > 20:         ${popOk ? 'PASS' : 'FAIL'} (${avg(pops).toFixed(0)})`);
  if (popOk) passes++;

  const speedOk = avg(speeds) < 1.7;
  console.log(`5. Speed mean < 1.7:     ${speedOk ? 'PASS' : 'FAIL'} (${avg(speeds).toFixed(2)})`);
  if (speedOk) passes++;

  const predOk = avg(predPcts) > 3;
  console.log(`6. Predation > 3%:       ${predOk ? 'PASS' : 'FAIL'} (${avg(predPcts).toFixed(1)}%)`);
  if (predOk) passes++;

  console.log(`\nResult: ${passes}/${total} criteria pass`);
}

main().catch(err => { console.error(err); process.exit(1); });
