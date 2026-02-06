#!/usr/bin/env node
// tools/observe.js - Emergence observation toolkit
//
// Runs the simulation headless, fast-forwarding to evolutionary timescales.
// Collects screenshots, position heatmaps, and behavioral telemetry.
//
// Usage: node tools/observe.js
// Output: /tmp/emergence-observe/

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = '/tmp/emergence-observe';
const HTML = path.resolve(__dirname, '..', 'emergence.html');
const CELL = 8;          // heatmap cell size (px)
const TRAIL_WAIT = 10000; // ms of real-time sim for trail accumulation

// ---------------------------------------------------------------------------
// Helpers injected into the browser
// ---------------------------------------------------------------------------
const INJECT = `
window.__ff = function(ticks) {
  const w = window.__world;
  const na = { eatClick(){}, birthPing(){}, deathThud(){},
               predationSweep(){}, setPopulation(){} };
  const p = w.paused; w.paused = false;
  for (let i = 0; i < ticks; i++) w.update(na);
  w.paused = p;
};

window.__ffRecord = function(ticks, cellSize) {
  const w = window.__world;
  const cols = Math.ceil(w.w / cellSize), rows = Math.ceil(w.h / cellSize);
  const grid = new Float32Array(cols * rows);
  const na = { eatClick(){}, birthPing(){}, deathThud(){},
               predationSweep(){}, setPopulation(){} };
  const p = w.paused; w.paused = false;
  let creatureTicks = 0;
  for (let t = 0; t < ticks; t++) {
    w.update(na);
    for (let i = 0; i < w.creatures.length; i++) {
      const c = w.creatures[i];
      const col = Math.floor(c.pos.x / cellSize);
      const row = Math.floor(c.pos.y / cellSize);
      if (col >= 0 && col < cols && row >= 0 && row < rows) grid[row * cols + col]++;
      creatureTicks++;
    }
  }
  w.paused = p;
  return { grid: Array.from(grid), cols, rows, creatureTicks };
};

window.__telemetry = function() {
  const w = window.__world;
  const n = w.creatures.length;
  let tE = 0, tA = 0, tS = 0, tOD = 0;
  const sig = [0, 0, 0];
  for (const c of w.creatures) {
    tE += c.energy; tA += c.age; tS += c.speed;
    for (let ch = 0; ch < 3; ch++) if (c.signals[ch] > 0.25) sig[ch]++;
    let minD = Infinity;
    for (const ob of w.obstacles) {
      const d = c.pos.dist(ob.pos) - ob.radius;
      if (d < minD) minD = d;
    }
    tOD += minD;
  }
  return {
    tick: w.tick, pop: n, food: w.food.length,
    maxGen: w.maxGen, births: w.births, deaths: w.deaths,
    species: w.countSpecies(),
    avgEnergy: n ? +(tE / n).toFixed(1) : 0,
    avgAge: n ? +(tA / n / 60).toFixed(1) : 0,
    avgSpeed: n ? +(tS / n).toFixed(2) : 0,
    sigFrac: sig.map(s => n ? +(s / n).toFixed(2) : 0),
    avgObsDist: n ? +(tOD / n).toFixed(1) : 0,
    obstacles: w.obstacles.length,
  };
};
`;

// ---------------------------------------------------------------------------
// Heatmap rendering (in-browser, then screenshot)
// ---------------------------------------------------------------------------
async function renderHeatmap(page, data, title, filename) {
  await page.evaluate(({ grid, cols, rows, cellSize, title, creatureTicks }) => {
    const el = document.createElement('canvas');
    el.id = '__hm';
    const W = window.innerWidth, H = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    el.width = W * dpr; el.height = H * dpr;
    el.style.cssText = 'position:fixed;top:0;left:0;z-index:999;width:' + W + 'px;height:' + H + 'px;';
    document.body.appendChild(el);
    const ctx = el.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = 'rgb(8,8,26)';
    ctx.fillRect(0, 0, W, H);

    let max = 0;
    for (let i = 0; i < grid.length; i++) if (grid[i] > max) max = grid[i];

    if (max > 0) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = grid[r * cols + c] / max;
          if (v < 0.005) continue;
          const hue = (1 - Math.pow(v, 0.6)) * 240; // blue -> red, gamma for contrast
          const light = 8 + Math.pow(v, 0.5) * 55;
          const alpha = Math.min(Math.pow(v, 0.4) * 1.2, 0.92);
          ctx.fillStyle = 'hsla(' + hue + ',90%,' + light + '%,' + alpha + ')';
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }
    }

    // Obstacle outlines
    const w = window.__world;
    ctx.strokeStyle = 'rgba(200,200,220,0.25)'; ctx.lineWidth = 1;
    for (const ob of w.obstacles) {
      ctx.beginPath(); ctx.arc(ob.pos.x, ob.pos.y, ob.radius, 0, 6.283); ctx.stroke();
    }
    // Hotspot markers
    ctx.strokeStyle = 'rgba(100,230,160,0.45)'; ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    for (const hs of w.hotspots) {
      ctx.beginPath(); ctx.arc(hs.x, hs.y, 12, 0, 6.283); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Title + metadata
    ctx.font = '13px -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(200,200,230,0.7)';
    ctx.fillText(title, 20, 28);
    ctx.font = '10px -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(140,140,170,0.5)';
    ctx.fillText(creatureTicks.toLocaleString() + ' creature-ticks recorded', 20, 44);
  }, {
    grid: data.grid, cols: data.cols, rows: data.rows,
    cellSize: CELL, title, creatureTicks: data.creatureTicks
  });

  await page.screenshot({ path: filename });
  await page.evaluate(() => { const el = document.getElementById('__hm'); if (el) el.remove(); });
}

// ---------------------------------------------------------------------------
// Main observation run
// ---------------------------------------------------------------------------
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  // Clean previous run
  for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('file://' + HTML);

  // Start sim
  await page.evaluate(() => document.getElementById('overlay').click());
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById('help-panel').classList.remove('visible'));

  // Inject observation helpers
  await page.evaluate(INJECT);

  console.log('Emergence Observation Run');
  console.log('='.repeat(80));
  const t0 = Date.now();

  // --- Initial screenshot ---
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/00-initial.png` });
  console.log('  [screenshot] initial layout');

  const telemetry = [];
  const heatmaps = [];

  // --- t=30s: Fast-forward past early chaos ---
  console.log('  [ff] 0 -> 30s (1800 ticks)...');
  await page.evaluate(t => window.__ff(t), 1800);
  let tm = await page.evaluate(() => window.__telemetry());
  telemetry.push({ label: 't=30s', ...tm });
  console.log('  [telemetry] pop=' + tm.pop + ' gen=' + tm.maxGen);

  // --- Heatmap: early phase (30s -> 2min) ---
  console.log('  [ff+record] 30s -> 2min (5400 ticks)...');
  let hm = await page.evaluate(({ t, c }) => window.__ffRecord(t, c), { t: 5400, c: CELL });
  heatmaps.push({ label: 'Early (30s - 2min)', data: hm });

  console.log('  [trails] accumulating 10s...');
  await page.waitForTimeout(TRAIL_WAIT);
  await page.screenshot({ path: `${OUT}/01-t2min.png` });
  tm = await page.evaluate(() => window.__telemetry());
  telemetry.push({ label: 't=2min', ...tm });
  console.log('  [screenshot] t~2min, pop=' + tm.pop + ' gen=' + tm.maxGen);

  // --- Heatmap: mid phase (2min -> 5min) ---
  console.log('  [ff+record] 2min -> 5min (10800 ticks)...');
  hm = await page.evaluate(({ t, c }) => window.__ffRecord(t, c), { t: 10800, c: CELL });
  heatmaps.push({ label: 'Mid (2 - 5min)', data: hm });

  console.log('  [trails] accumulating 10s...');
  await page.waitForTimeout(TRAIL_WAIT);
  await page.screenshot({ path: `${OUT}/02-t5min.png` });
  tm = await page.evaluate(() => window.__telemetry());
  telemetry.push({ label: 't=5min', ...tm });
  console.log('  [screenshot] t~5min, pop=' + tm.pop + ' gen=' + tm.maxGen);

  // --- Heatmap: late phase (5min -> 10min) ---
  console.log('  [ff+record] 5min -> 10min (18000 ticks)...');
  hm = await page.evaluate(({ t, c }) => window.__ffRecord(t, c), { t: 18000, c: CELL });
  heatmaps.push({ label: 'Late (5 - 10min)', data: hm });

  console.log('  [trails] accumulating 10s...');
  await page.waitForTimeout(TRAIL_WAIT);
  await page.screenshot({ path: `${OUT}/03-t10min.png` });
  tm = await page.evaluate(() => window.__telemetry());
  telemetry.push({ label: 't=10min', ...tm });
  console.log('  [screenshot] t~10min, pop=' + tm.pop + ' gen=' + tm.maxGen);

  // --- Render heatmaps ---
  console.log('\n  Rendering heatmaps...');
  for (let i = 0; i < heatmaps.length; i++) {
    await renderHeatmap(page, heatmaps[i].data, heatmaps[i].label, `${OUT}/heatmap-${i}-${['early','mid','late'][i]}.png`);
    console.log('  [heatmap] ' + heatmaps[i].label + ' (' + heatmaps[i].data.creatureTicks.toLocaleString() + ' creature-ticks)');
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  await browser.close();

  // --- Telemetry report ---
  console.log('\n' + '='.repeat(90));
  console.log('TELEMETRY REPORT');
  console.log('='.repeat(90));

  const cols = [
    ['Checkpoint', 10, 'label'],
    ['Tick', 8, 'tick'],
    ['Pop', 6, 'pop'],
    ['Food', 6, 'food'],
    ['Gen', 5, 'maxGen'],
    ['Births', 8, 'births'],
    ['Deaths', 8, 'deaths'],
    ['Spp', 5, 'species'],
    ['AvgNRG', 8, 'avgEnergy'],
    ['AvgAge', 8, 'avgAge'],
    ['AvgSpd', 8, 'avgSpeed'],
    ['ObsDist', 8, 'avgObsDist'],
  ];

  console.log(cols.map(([h, w]) => h.padStart(w)).join(''));
  console.log('-'.repeat(90));
  for (const r of telemetry) {
    console.log(cols.map(([, w, k]) => String(r[k]).padStart(w)).join(''));
  }

  console.log('\nSignal Activity (fraction of creatures signaling > 0.25 per channel):');
  console.log('  Checkpoint    Ch0 (gold)   Ch1 (blue)   Ch2 (magenta)');
  console.log('  ' + '-'.repeat(55));
  for (const r of telemetry) {
    console.log('  ' + r.label.padEnd(14) +
      r.sigFrac[0].toFixed(2).padStart(10) + '  ' +
      r.sigFrac[1].toFixed(2).padStart(10) + '  ' +
      r.sigFrac[2].toFixed(2).padStart(10));
  }

  console.log('\n' + '='.repeat(90));
  console.log('Wall time: ' + elapsed + 's');
  console.log('Output: ' + OUT + '/');
  for (const f of fs.readdirSync(OUT).sort()) console.log('  ' + f);
}

main().catch(e => { console.error(e); process.exit(1); });
