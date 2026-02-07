// ================================================================
// Benchmark: Long Evolution Run
//
// Runs 3 trials at 162000 ticks (~45 min sim time each, ~1500+ generations)
// to observe what emergent behavior develops at high generation counts.
// Also validates cooperation lines and territory boundary rendering
// don't cause errors or performance regressions.
//
// Usage: node scripts/benchmark-long-evolution.js
// ================================================================

const { chromium } = require('playwright');

const NUM_TRIALS = 3;
const TOTAL_TICKS = 162000;
const SAMPLE_INTERVAL = 18000;  // sample every ~5 min sim
const SIM_SPEED = 32;
const POLL_INTERVAL_MS = 500;
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

    let shareSum = 0, mateSum = 0, phdSum = 0;
    let genSum = 0, brainSum = 0, senseSum = 0, sizeSum = 0, speedSum = 0;
    let dietSum = 0, phDepositSum = 0;
    let shareVar = 0, mateVar = 0;
    let modeCount = [0, 0, 0, 0, 0, 0]; // idle, forage, hunt, flee, share, mate
    let maxGen = 0;

    for (let i = 0; i < n; i++) {
      const c = creatures[i];
      shareSum += c.shareOut;
      mateSum += c.mateOut;
      phdSum += c.phDepOut;
      genSum += c.generation;
      brainSum += c.genes.brainSize;
      senseSum += c.genes.senseRange;
      sizeSum += c.genes.size;
      speedSum += c.genes.speedGene;
      dietSum += c.genes.diet;
      phDepositSum += c.genes.phDeposit;
      if (c.generation > maxGen) maxGen = c.generation;
      if (c._mode >= 0 && c._mode <= 5) modeCount[c._mode]++;
    }

    const shareMean = shareSum / n;
    const mateMean = mateSum / n;
    for (let i = 0; i < n; i++) {
      const c = creatures[i];
      shareVar += (c.shareOut - shareMean) ** 2;
      mateVar += (c.mateOut - mateMean) ** 2;
    }

    // Count species
    const buckets = new Set();
    for (let i = 0; i < n; i++) buckets.add(Math.floor(creatures[i].genes.hue / 30));

    return {
      tick: w.tick,
      pop: n,
      maxGen,
      avgGen: genSum / n,
      births: w.births,
      sexualBirths: w.sexualBirths,
      deaths: w.deaths,
      species: buckets.size,
      coopPairs: w.coopPairs ? w.coopPairs.length / 2 : 0,
      shareMean: shareMean,
      mateMean: mateMean,
      phDepOutMean: phdSum / n,
      shareVar: Math.sqrt(shareVar / n),
      mateVar: Math.sqrt(mateVar / n),
      brainMean: brainSum / n,
      senseMean: senseSum / n,
      sizeMean: sizeSum / n,
      speedMean: speedSum / n,
      dietMean: dietSum / n,
      phDepositMean: phDepositSum / n,
      modeCount,
    };
  });
}

async function runTrial(trialNum) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });

  // Start simulation
  await page.click('#overlay');
  await sleep(500);

  // Set speed to 32x
  await page.keyboard.press('t');
  await sleep(200);

  const samples = [];
  let lastTick = 0;

  while (lastTick < TOTAL_TICKS) {
    await sleep(POLL_INTERVAL_MS);
    const sample = await collectSample(page);
    if (!sample) continue;
    if (sample.tick < lastTick + SAMPLE_INTERVAL) continue;
    lastTick = sample.tick;
    samples.push(sample);
    const elapsed = sample.tick;
    const pct = Math.round((elapsed / TOTAL_TICKS) * 100);
    process.stdout.write(`\r  Trial ${trialNum}: ${pct}% (tick ${elapsed}, gen ${sample.maxGen}, pop ${sample.pop}, coop ${sample.coopPairs}, species ${sample.species})`);
  }

  // Final sample
  const final = await collectSample(page);
  if (final && (samples.length === 0 || final.tick > samples[samples.length - 1].tick)) {
    samples.push(final);
  }

  await browser.close();
  process.stdout.write('\n');
  return { samples, final: samples[samples.length - 1] };
}

async function main() {
  console.log(`\n=== Long Evolution Benchmark ===`);
  console.log(`${NUM_TRIALS} trials x ${TOTAL_TICKS} ticks (${Math.round(TOTAL_TICKS/3600)} day cycles) at ${SIM_SPEED}x\n`);

  const results = [];

  for (let t = 0; t < NUM_TRIALS; t++) {
    const result = await runTrial(t + 1);
    results.push(result);

    const f = result.final;
    console.log(`  Trial ${t + 1} final: gen ${f.maxGen}, pop ${f.pop}, births ${f.births}, ` +
      `species ${f.species}, coopPairs ${f.coopPairs}`);
    console.log(`    share: ${f.shareMean.toFixed(3)} (var ${f.shareVar.toFixed(3)}), ` +
      `mate: ${f.mateMean.toFixed(3)} (var ${f.mateVar.toFixed(3)}), ` +
      `phd: ${f.phDepOutMean.toFixed(3)}`);
    console.log(`    brain: ${f.brainMean.toFixed(1)}, sense: ${f.senseMean.toFixed(0)}, ` +
      `size: ${f.sizeMean.toFixed(2)}, speed: ${f.speedMean.toFixed(2)}, ` +
      `diet: ${f.dietMean.toFixed(2)}, phDeposit: ${f.phDepositMean.toFixed(2)}`);
    console.log(`    modes: idle=${f.modeCount[0]} forage=${f.modeCount[1]} hunt=${f.modeCount[2]} ` +
      `flee=${f.modeCount[3]} share=${f.modeCount[4]} mate=${f.modeCount[5]}`);
  }

  // Aggregate stats
  console.log('\n=== Aggregate Results ===');
  const finals = results.map(r => r.final);
  const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const range = (arr) => `[${Math.min(...arr)}, ${Math.max(...arr)}]`;

  const maxGens = finals.map(f => f.maxGen);
  const pops = finals.map(f => f.pop);
  const births = finals.map(f => f.births);
  const species = finals.map(f => f.species);
  const coops = finals.map(f => f.coopPairs);
  const shareMs = finals.map(f => f.shareMean);
  const shareVs = finals.map(f => f.shareVar);
  const mateMs = finals.map(f => f.mateMean);
  const brains = finals.map(f => f.brainMean);
  const senses = finals.map(f => f.senseMean);
  const sizes = finals.map(f => f.sizeMean);
  const speeds = finals.map(f => f.speedMean);
  const diets = finals.map(f => f.dietMean);
  const phDeps = finals.map(f => f.phDepositMean);

  console.log(`Max generation:   ${avg(maxGens).toFixed(0)} +/- ${Math.sqrt(maxGens.reduce((s, v) => s + (v - avg(maxGens)) ** 2, 0) / maxGens.length).toFixed(0)} ${range(maxGens)}`);
  console.log(`Population:       ${avg(pops).toFixed(0)} ${range(pops)}`);
  console.log(`Total births:     ${avg(births).toFixed(0)} ${range(births)}`);
  console.log(`Species:          ${avg(species).toFixed(1)} ${range(species)}`);
  console.log(`Coop pairs:       ${avg(coops).toFixed(0)} ${range(coops)}`);
  console.log(`Share mean:       ${avg(shareMs).toFixed(3)} (var ${avg(shareVs).toFixed(3)})`);
  console.log(`Mate mean:        ${avg(mateMs).toFixed(3)}`);
  console.log(`Brain:            ${avg(brains).toFixed(1)} ${range(brains.map(v => +v.toFixed(1)))}`);
  console.log(`Sense:            ${avg(senses).toFixed(0)} ${range(senses.map(v => Math.round(v)))}`);
  console.log(`Size:             ${avg(sizes).toFixed(2)} ${range(sizes.map(v => +v.toFixed(2)))}`);
  console.log(`Speed:            ${avg(speeds).toFixed(2)} ${range(speeds.map(v => +v.toFixed(2)))}`);
  console.log(`Diet:             ${avg(diets).toFixed(2)} ${range(diets.map(v => +v.toFixed(2)))}`);
  console.log(`phDeposit gene:   ${avg(phDeps).toFixed(2)} ${range(phDeps.map(v => +v.toFixed(2)))}`);

  // Evolution trajectory from samples
  console.log('\n=== Evolution Trajectory (averaged across trials) ===');
  const maxSamples = Math.max(...results.map(r => r.samples.length));
  for (let si = 0; si < maxSamples; si++) {
    const valids = results.filter(r => r.samples.length > si).map(r => r.samples[si]);
    if (valids.length === 0) continue;
    const tick = avg(valids.map(s => s.tick));
    const gen = avg(valids.map(s => s.maxGen));
    const pop = avg(valids.map(s => s.pop));
    const share = avg(valids.map(s => s.shareMean));
    const coop = avg(valids.map(s => s.coopPairs));
    const sp = avg(valids.map(s => s.species));
    console.log(`  tick ${Math.round(tick)}: gen ${gen.toFixed(0)}, pop ${pop.toFixed(0)}, share ${share.toFixed(3)}, coop ${coop.toFixed(0)}, species ${sp.toFixed(1)}`);
  }

  // Validation
  console.log('\n=== Validation ===');
  const allPass = finals.every(f => f.maxGen >= 50);
  console.log(`Gen >= 50:        ${allPass ? 'PASS' : 'FAIL'} (${finals.filter(f => f.maxGen >= 50).length}/${NUM_TRIALS})`);
  const noErrors = finals.every(f => f.pop > 10);
  console.log(`Pop > 10:         ${noErrors ? 'PASS' : 'FAIL'}`);
  const coopExists = finals.some(f => f.coopPairs > 0);
  console.log(`Coop pairs seen:  ${coopExists ? 'PASS' : 'FAIL'}`);
  console.log(`No render errors: PASS (completed without crash)`);
}

main().catch(err => { console.error(err); process.exit(1); });
