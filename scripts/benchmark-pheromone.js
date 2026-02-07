// Pheromone input investigation
// Question: are creatures evolving functional use of pheromone inputs,
// or are the pheromone weights just evolved noise?
//
// Methodology:
// 1. Run simulation for 54000 ticks (15 min equivalent), 3 trials
// 2. Sample creature brain data at ticks 18000, 36000, 54000
// 3. Analyze pheromone input weights vs non-pheromone weights
// 4. Correlate pheromone weight magnitudes with fitness (energy)
// 5. Check pheromone input value distributions for structure
//
// Brain input layout (28 sensory + 4 recurrent = 32 total):
//   0-2:   food (fd.s, fd.c, fd.d)
//   3-6:   creature (cr.s, cr.c, cr.d, cr.z)
//   7-15:  signal channels (s0.s,c,v, s1.s,c,v, s2.s,c,v)
//   16:    energy (nrg)
//   17:    bias (1.0)
//   18:    kin recognition (kin)
//   19-21: obstacle (ob.s, ob.c, ob.d)
//   22-27: pheromone (kp.s, kp.c, kp.v, fp.s, fp.c, fp.v) <-- target
//   28-31: recurrent memory (m.0, m.1, m.2, m.3)
//
// Usage: node scripts/benchmark-pheromone.js [--trials=N]

const { chromium } = require('playwright');
const path = require('path');

const TOTAL_TICKS = 54000;
const BATCH_SIZE = 600;
const SAMPLE_TICKS = [18000, 36000, 54000];
const PHEROMONE_INDICES = [22, 23, 24, 25, 26, 27];
const PHEROMONE_LABELS = ['kp.s', 'kp.c', 'kp.v', 'fp.s', 'fp.c', 'fp.v'];
// Non-pheromone sensory inputs (excluding recurrent memory and bias)
const NON_PHEROMONE_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21];

const trialsArg = process.argv.find(a => a.startsWith('--trials='));
const NUM_TRIALS = trialsArg ? parseInt(trialsArg.split('=')[1], 10) : 3;

async function runTrial(browser, trialIndex) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const filePath = 'file://' + path.resolve(__dirname, '..', 'emergence.html');
  await page.goto(filePath);
  await page.click('#overlay');
  await page.waitForTimeout(200);

  // Verify world is accessible
  await page.evaluate(() => {
    if (!window.__world) throw new Error('__world not exposed');
  });

  const samples = [];

  for (let tick = 0; tick < TOTAL_TICKS; tick += BATCH_SIZE) {
    const batchTicks = Math.min(BATCH_SIZE, TOTAL_TICKS - tick);

    const result = await page.evaluate(({ batchTicks, currentTick, sampleTicks, phIndices, nonPhIndices }) => {
      const w = window.__world;
      const silentAudio = {
        eatClick() {}, birthPing() {}, deathThud() {},
        predationSweep() {}, setPopulation() {}, setEcosystemState() {}
      };

      const snapshots = [];

      for (let i = 0; i < batchTicks; i++) {
        w.update(silentAudio);
        const t = currentTick + i + 1;

        if (sampleTicks.includes(t)) {
          const creatures = [];
          for (let j = 0; j < w.creatures.length; j++) {
            const c = w.creatures[j];
            const b = c.brain;
            const nh = b.nh;
            const ni = b.ni;

            // Extract pheromone input weights (all weights from pheromone inputs to hidden)
            // wih layout: weight[input_i * nh + hidden_j]
            const phWeights = [];
            for (const idx of phIndices) {
              const row = [];
              for (let h = 0; h < nh; h++) {
                row.push(b.wih[idx * nh + h]);
              }
              phWeights.push(row);
            }

            // Extract non-pheromone input weights for comparison
            const nonPhWeights = [];
            for (const idx of nonPhIndices) {
              const row = [];
              for (let h = 0; h < nh; h++) {
                row.push(b.wih[idx * nh + h]);
              }
              nonPhWeights.push(row);
            }

            // Pheromone input values from lastInput
            const phInputValues = phIndices.map(idx => b.lastInput[idx]);

            creatures.push({
              id: c.id,
              gen: c.generation,
              energy: c.energy,
              age: c.age,
              bucket: Math.floor(c.genes.hue / 30) % 12,
              nh: nh,
              phWeights: phWeights,         // 6 x nh
              nonPhWeights: nonPhWeights,   // 21 x nh
              phInputValues: phInputValues,  // 6 values
            });
          }

          snapshots.push({
            tick: t,
            pop: w.creatures.length,
            maxGen: w.maxGen,
            creatures: creatures,
          });
        }
      }

      return snapshots;
    }, {
      batchTicks,
      currentTick: tick,
      sampleTicks: SAMPLE_TICKS,
      phIndices: PHEROMONE_INDICES,
      nonPhIndices: NON_PHEROMONE_INDICES,
    });

    samples.push(...result);
  }

  await context.close();
  return samples;
}

// ---------------------------------------------------------------------------
// Statistical utilities
// ---------------------------------------------------------------------------

function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return arr.reduce((a, v) => a + (v - m) ** 2, 0) / arr.length;
}

function std(arr) {
  return Math.sqrt(variance(arr));
}

function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function pearsonCorrelation(x, y) {
  const n = x.length;
  if (n < 3) return NaN;
  const mx = mean(x), my = mean(y);
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}

// Mean absolute value of a flat array of weights
function meanAbsWeight(weightRows) {
  let sum = 0, count = 0;
  for (const row of weightRows) {
    for (const w of row) {
      sum += Math.abs(w);
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

function analyzeTrial(samples, trialIndex) {
  const result = { trialIndex, snapshots: [] };

  for (const sample of samples) {
    const tick = sample.tick;
    const creatures = sample.creatures;
    const n = creatures.length;
    if (n === 0) continue;

    // 1. Pheromone weight magnitudes per creature
    const phWeightMags = creatures.map(c => meanAbsWeight(c.phWeights));
    const nonPhWeightMags = creatures.map(c => meanAbsWeight(c.nonPhWeights));

    // 2. Pheromone input values
    const phInputsByChannel = PHEROMONE_LABELS.map((_, i) =>
      creatures.map(c => c.phInputValues[i])
    );

    // 3. Energy-weight correlation
    const energies = creatures.map(c => c.energy);
    const corr = pearsonCorrelation(energies, phWeightMags);

    // 4. Top 25% vs bottom 25% by energy
    const sorted = [...creatures].sort((a, b) => a.energy - b.energy);
    const q1Idx = Math.floor(n * 0.25);
    const q3Idx = Math.floor(n * 0.75);
    const bottom25 = sorted.slice(0, q1Idx);
    const top25 = sorted.slice(q3Idx);

    const top25PhMag = mean(top25.map(c => meanAbsWeight(c.phWeights)));
    const bottom25PhMag = mean(bottom25.map(c => meanAbsWeight(c.phWeights)));
    const top25NonPhMag = mean(top25.map(c => meanAbsWeight(c.nonPhWeights)));
    const bottom25NonPhMag = mean(bottom25.map(c => meanAbsWeight(c.nonPhWeights)));

    // 5. Per-channel input value distributions
    const channelStats = PHEROMONE_LABELS.map((label, i) => {
      const vals = phInputsByChannel[i];
      const m = mean(vals);
      const s = std(vals);
      const low = vals.filter(v => v < -0.3).length / vals.length;
      const mid = vals.filter(v => v >= -0.3 && v <= 0.3).length / vals.length;
      const high = vals.filter(v => v > 0.3).length / vals.length;
      const zero = vals.filter(v => Math.abs(v) < 0.01).length / vals.length;
      return { label, mean: m, std: s, low, mid, high, zeroPct: zero, n: vals.length };
    });

    // 6. Per-pheromone-input weight stats
    const perInputWeightStats = PHEROMONE_LABELS.map((label, i) => {
      const allWeights = creatures.flatMap(c => c.phWeights[i]);
      return {
        label,
        meanAbs: mean(allWeights.map(Math.abs)),
        mean: mean(allWeights),
        std: std(allWeights),
        median: median(allWeights.map(Math.abs)),
      };
    });

    // 7. Generation breakdown
    const gens = creatures.map(c => c.gen);
    const maxGen = Math.max(...gens);
    const highGen = creatures.filter(c => c.gen >= maxGen * 0.7);
    const lowGen = creatures.filter(c => c.gen <= Math.max(1, maxGen * 0.3));
    const highGenPhMag = highGen.length > 0 ? mean(highGen.map(c => meanAbsWeight(c.phWeights))) : NaN;
    const lowGenPhMag = lowGen.length > 0 ? mean(lowGen.map(c => meanAbsWeight(c.phWeights))) : NaN;

    result.snapshots.push({
      tick,
      pop: n,
      maxGen: sample.maxGen,
      meanPhWeightMag: mean(phWeightMags),
      meanNonPhWeightMag: mean(nonPhWeightMags),
      phToNonPhRatio: mean(phWeightMags) / mean(nonPhWeightMags),
      energyPhWeightCorr: corr,
      top25PhMag,
      bottom25PhMag,
      top25NonPhMag,
      bottom25NonPhMag,
      top25VsBottom25: top25.length > 0 && bottom25.length > 0
        ? top25PhMag / Math.max(bottom25PhMag, 0.001)
        : NaN,
      channelStats,
      perInputWeightStats,
      highGenPhMag,
      lowGenPhMag,
      highGenCount: highGen.length,
      lowGenCount: lowGen.length,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function report(allTrials) {
  const n = allTrials.length;
  console.log(`\n${'='.repeat(76)}`);
  console.log(`  PHEROMONE INPUT INVESTIGATION: ${n} TRIALS x ${TOTAL_TICKS} TICKS`);
  console.log(`${'='.repeat(76)}\n`);

  // Per-trial, per-snapshot detail
  for (const trial of allTrials) {
    console.log(`--- Trial ${trial.trialIndex + 1} ---`);
    for (const snap of trial.snapshots) {
      console.log(`\n  Tick ${snap.tick} (pop=${snap.pop}, maxGen=${snap.maxGen}):`);
      console.log(`    Weight magnitudes:`);
      console.log(`      Pheromone inputs (22-27):  mean|w| = ${snap.meanPhWeightMag.toFixed(4)}`);
      console.log(`      Non-pheromone inputs:      mean|w| = ${snap.meanNonPhWeightMag.toFixed(4)}`);
      console.log(`      Ratio (ph/non-ph):         ${snap.phToNonPhRatio.toFixed(3)}`);

      console.log(`    Energy-weight correlation:    r = ${isNaN(snap.energyPhWeightCorr) ? 'N/A' : snap.energyPhWeightCorr.toFixed(4)}`);

      console.log(`    Top 25% energy vs bottom 25% energy:`);
      console.log(`      Ph weight mag:   top=${snap.top25PhMag.toFixed(4)}  bottom=${snap.bottom25PhMag.toFixed(4)}  ratio=${isNaN(snap.top25VsBottom25) ? 'N/A' : snap.top25VsBottom25.toFixed(3)}`);
      console.log(`      Non-ph weight:   top=${snap.top25NonPhMag.toFixed(4)}  bottom=${snap.bottom25NonPhMag.toFixed(4)}`);

      console.log(`    Generation breakdown:`);
      console.log(`      High-gen (n=${snap.highGenCount}): ph|w|=${isNaN(snap.highGenPhMag) ? 'N/A' : snap.highGenPhMag.toFixed(4)}`);
      console.log(`      Low-gen  (n=${snap.lowGenCount}):  ph|w|=${isNaN(snap.lowGenPhMag) ? 'N/A' : snap.lowGenPhMag.toFixed(4)}`);

      console.log(`    Per-input weight stats:`);
      for (const s of snap.perInputWeightStats) {
        console.log(`      ${s.label.padEnd(5)}: mean|w|=${s.meanAbs.toFixed(4)}  mean(w)=${s.mean.toFixed(4)}  std=${s.std.toFixed(4)}  median|w|=${s.median.toFixed(4)}`);
      }

      console.log(`    Pheromone input value distributions:`);
      for (const s of snap.channelStats) {
        console.log(`      ${s.label.padEnd(5)}: mean=${s.mean.toFixed(3)}  std=${s.std.toFixed(3)}  zero(<0.01)=${(s.zeroPct * 100).toFixed(0)}%  low(<-0.3)=${(s.low * 100).toFixed(0)}%  mid=${(s.mid * 100).toFixed(0)}%  high(>0.3)=${(s.high * 100).toFixed(0)}%`);
      }
    }
    console.log('');
  }

  // -----------------------------------------------------------------------
  // Aggregate across trials at each sample tick
  // -----------------------------------------------------------------------
  console.log(`${'='.repeat(76)}`);
  console.log(`  AGGREGATE ANALYSIS (${n} trials)`);
  console.log(`${'='.repeat(76)}\n`);

  for (const targetTick of SAMPLE_TICKS) {
    const snaps = allTrials
      .map(t => t.snapshots.find(s => s.tick === targetTick))
      .filter(Boolean);
    if (snaps.length === 0) continue;

    console.log(`--- Tick ${targetTick} (${(targetTick / 3600).toFixed(0)} min equivalent) ---`);
    console.log(`  Ph weight mag:       ${mean(snaps.map(s => s.meanPhWeightMag)).toFixed(4)} +/- ${std(snaps.map(s => s.meanPhWeightMag)).toFixed(4)}`);
    console.log(`  Non-ph weight mag:   ${mean(snaps.map(s => s.meanNonPhWeightMag)).toFixed(4)} +/- ${std(snaps.map(s => s.meanNonPhWeightMag)).toFixed(4)}`);
    console.log(`  Ph/non-ph ratio:     ${mean(snaps.map(s => s.phToNonPhRatio)).toFixed(3)} +/- ${std(snaps.map(s => s.phToNonPhRatio)).toFixed(3)}`);
    console.log(`  Energy-weight corr:  ${mean(snaps.map(s => isNaN(s.energyPhWeightCorr) ? 0 : s.energyPhWeightCorr)).toFixed(4)} +/- ${std(snaps.map(s => isNaN(s.energyPhWeightCorr) ? 0 : s.energyPhWeightCorr)).toFixed(4)}`);

    const topRatios = snaps.map(s => s.top25VsBottom25).filter(v => !isNaN(v));
    if (topRatios.length > 0) {
      console.log(`  Top25/Bottom25 ph:   ${mean(topRatios).toFixed(3)} +/- ${std(topRatios).toFixed(3)}`);
    }
    console.log('');
  }

  // -----------------------------------------------------------------------
  // Temporal trajectory: are pheromone weights growing or shrinking?
  // -----------------------------------------------------------------------
  console.log('--- Pheromone Weight Trajectory Over Time ---');
  for (const targetTick of SAMPLE_TICKS) {
    const snaps = allTrials
      .map(t => t.snapshots.find(s => s.tick === targetTick))
      .filter(Boolean);
    if (snaps.length === 0) continue;
    const phMag = mean(snaps.map(s => s.meanPhWeightMag));
    const ratio = mean(snaps.map(s => s.phToNonPhRatio));
    console.log(`  Tick ${String(targetTick).padStart(5)}: ph|w|=${phMag.toFixed(4)}  ratio=${ratio.toFixed(3)}`);
  }

  // Direction of change
  const earlySnaps = allTrials.map(t => t.snapshots.find(s => s.tick === SAMPLE_TICKS[0])).filter(Boolean);
  const lateSnaps = allTrials.map(t => t.snapshots.find(s => s.tick === SAMPLE_TICKS[SAMPLE_TICKS.length - 1])).filter(Boolean);
  if (earlySnaps.length > 0 && lateSnaps.length > 0) {
    const earlyRatio = mean(earlySnaps.map(s => s.phToNonPhRatio));
    const lateRatio = mean(lateSnaps.map(s => s.phToNonPhRatio));
    const delta = lateRatio - earlyRatio;
    const dir = Math.abs(delta) < 0.02 ? 'STABLE' : delta > 0 ? 'AMPLIFYING' : 'PRUNING';
    console.log(`  Direction: ${dir} (${earlyRatio.toFixed(3)} -> ${lateRatio.toFixed(3)}, delta=${delta > 0 ? '+' : ''}${delta.toFixed(3)})`);
  }
  console.log('');

  // -----------------------------------------------------------------------
  // Input value bimodality analysis
  // -----------------------------------------------------------------------
  console.log('--- Pheromone Input Value Structure (late sample, all trials) ---');
  const finalSnaps = allTrials
    .map(t => t.snapshots.find(s => s.tick === SAMPLE_TICKS[SAMPLE_TICKS.length - 1]))
    .filter(Boolean);

  for (let i = 0; i < PHEROMONE_LABELS.length; i++) {
    const label = PHEROMONE_LABELS[i];
    const avgZero = mean(finalSnaps.map(s => s.channelStats[i].zeroPct));
    const avgStd = mean(finalSnaps.map(s => s.channelStats[i].std));
    const avgHigh = mean(finalSnaps.map(s => s.channelStats[i].high));
    const avgLow = mean(finalSnaps.map(s => s.channelStats[i].low));
    console.log(`  ${label.padEnd(5)}: zero=${(avgZero * 100).toFixed(0)}%  std=${avgStd.toFixed(3)}  low(<-0.3)=${(avgLow * 100).toFixed(0)}%  high(>0.3)=${(avgHigh * 100).toFixed(0)}%`);
  }

  // Compare with signal investigation methodology: are values bimodal?
  // sin/cos inputs (kp.s, kp.c, fp.s, fp.c) should be non-zero if creatures
  // are near pheromone gradients; value inputs (kp.v, fp.v) reflect concentration.
  // If most are zero, pheromones simply aren't in the environment.
  // If non-zero but weights are tiny, brains are ignoring them.
  console.log('');

  // -----------------------------------------------------------------------
  // VERDICT
  // -----------------------------------------------------------------------
  console.log(`${'='.repeat(76)}`);
  console.log('  VERDICT');
  console.log(`${'='.repeat(76)}\n`);

  // Collect evidence
  const evidence = [];
  let functionalScore = 0;

  // Evidence 1: Weight magnitude ratio
  if (lateSnaps.length > 0) {
    const lateRatio = mean(lateSnaps.map(s => s.phToNonPhRatio));
    if (lateRatio > 0.85) {
      evidence.push(`[+] Ph/non-ph weight ratio = ${lateRatio.toFixed(3)} (near parity - not being pruned)`);
      functionalScore += 2;
    } else if (lateRatio > 0.5) {
      evidence.push(`[~] Ph/non-ph weight ratio = ${lateRatio.toFixed(3)} (somewhat reduced)`);
      functionalScore += 1;
    } else {
      evidence.push(`[-] Ph/non-ph weight ratio = ${lateRatio.toFixed(3)} (substantially pruned by evolution)`);
      functionalScore -= 2;
    }
  }

  // Evidence 2: Weight trajectory over time
  if (earlySnaps.length > 0 && lateSnaps.length > 0) {
    const earlyMag = mean(earlySnaps.map(s => s.meanPhWeightMag));
    const lateMag = mean(lateSnaps.map(s => s.meanPhWeightMag));
    const change = (lateMag - earlyMag) / earlyMag;
    if (change > 0.1) {
      evidence.push(`[+] Ph weights grew ${(change * 100).toFixed(0)}% over evolution (amplification)`);
      functionalScore += 2;
    } else if (change > -0.1) {
      evidence.push(`[~] Ph weights changed ${(change * 100).toFixed(0)}% (roughly stable)`);
    } else {
      evidence.push(`[-] Ph weights shrank ${(change * 100).toFixed(0)}% over evolution (being pruned)`);
      functionalScore -= 1;
    }
  }

  // Evidence 3: Correlation with fitness
  if (lateSnaps.length > 0) {
    const avgCorr = mean(lateSnaps.map(s => isNaN(s.energyPhWeightCorr) ? 0 : s.energyPhWeightCorr));
    if (Math.abs(avgCorr) > 0.15) {
      evidence.push(`[+] Energy-weight correlation r=${avgCorr.toFixed(3)} (ph weights linked to fitness)`);
      functionalScore += 2;
    } else if (Math.abs(avgCorr) > 0.05) {
      evidence.push(`[~] Energy-weight correlation r=${avgCorr.toFixed(3)} (weak link to fitness)`);
      functionalScore += 1;
    } else {
      evidence.push(`[-] Energy-weight correlation r=${avgCorr.toFixed(3)} (no fitness link)`);
      functionalScore -= 1;
    }
  }

  // Evidence 4: Top vs bottom quartile
  if (lateSnaps.length > 0) {
    const topRatios = lateSnaps.map(s => s.top25VsBottom25).filter(v => !isNaN(v));
    if (topRatios.length > 0) {
      const avgRatio = mean(topRatios);
      if (avgRatio > 1.15) {
        evidence.push(`[+] Top-25% energy creatures have ${((avgRatio - 1) * 100).toFixed(0)}% larger ph weights`);
        functionalScore += 2;
      } else if (avgRatio > 1.05) {
        evidence.push(`[~] Top-25% energy creatures have ${((avgRatio - 1) * 100).toFixed(0)}% larger ph weights (marginal)`);
        functionalScore += 1;
      } else if (avgRatio < 0.9) {
        evidence.push(`[-] Top-25% energy creatures have SMALLER ph weights (${((1 - avgRatio) * 100).toFixed(0)}% less)`);
        functionalScore -= 1;
      } else {
        evidence.push(`[-] No meaningful difference between high and low energy ph weights (ratio=${avgRatio.toFixed(3)})`);
      }
    }
  }

  // Evidence 5: Input value structure
  if (finalSnaps.length > 0) {
    // kp.v and fp.v are the concentration channels - if mostly zero, pheromones
    // aren't really present in the environment to be used
    const kpvZero = mean(finalSnaps.map(s => s.channelStats[2].zeroPct));
    const fpvZero = mean(finalSnaps.map(s => s.channelStats[5].zeroPct));
    const avgZero = (kpvZero + fpvZero) / 2;
    if (avgZero > 0.8) {
      evidence.push(`[-] Pheromone concentration inputs are zero ${(avgZero * 100).toFixed(0)}% of the time (sparse signal)`);
      functionalScore -= 1;
    } else if (avgZero > 0.5) {
      evidence.push(`[~] Pheromone concentration inputs are zero ${(avgZero * 100).toFixed(0)}% of the time (moderate sparsity)`);
    } else {
      evidence.push(`[+] Pheromone concentration inputs are active ${((1 - avgZero) * 100).toFixed(0)}% of the time`);
      functionalScore += 1;
    }

    // Check direction inputs (sin/cos) - if they have variance, gradients exist
    const dirStd = mean([
      ...finalSnaps.map(s => s.channelStats[0].std), // kp.s
      ...finalSnaps.map(s => s.channelStats[1].std), // kp.c
      ...finalSnaps.map(s => s.channelStats[3].std), // fp.s
      ...finalSnaps.map(s => s.channelStats[4].std), // fp.c
    ]);
    if (dirStd > 0.3) {
      evidence.push(`[+] Pheromone direction inputs show high variance (std=${dirStd.toFixed(3)} - diverse gradients)`);
      functionalScore += 1;
    } else if (dirStd > 0.1) {
      evidence.push(`[~] Pheromone direction inputs show moderate variance (std=${dirStd.toFixed(3)})`);
    } else {
      evidence.push(`[-] Pheromone direction inputs have low variance (std=${dirStd.toFixed(3)} - near-zero signal)`);
      functionalScore -= 1;
    }
  }

  // Evidence 6: High-gen vs low-gen weight comparison
  if (lateSnaps.length > 0) {
    const highGenMags = lateSnaps.map(s => s.highGenPhMag).filter(v => !isNaN(v));
    const lowGenMags = lateSnaps.map(s => s.lowGenPhMag).filter(v => !isNaN(v));
    if (highGenMags.length > 0 && lowGenMags.length > 0) {
      const highMean = mean(highGenMags);
      const lowMean = mean(lowGenMags);
      const genDelta = (highMean - lowMean) / lowMean;
      if (genDelta > 0.1) {
        evidence.push(`[+] Higher-generation creatures have ${(genDelta * 100).toFixed(0)}% larger ph weights (evolutionary amplification)`);
        functionalScore += 2;
      } else if (genDelta < -0.1) {
        evidence.push(`[-] Higher-generation creatures have ${(-genDelta * 100).toFixed(0)}% smaller ph weights (evolutionary pruning)`);
        functionalScore -= 2;
      } else {
        evidence.push(`[~] No generational trend in ph weight magnitude (delta=${(genDelta * 100).toFixed(0)}%)`);
      }
    }
  }

  // Print evidence
  for (const e of evidence) {
    console.log(`  ${e}`);
  }

  console.log('');
  console.log(`  Functional score: ${functionalScore} (range: roughly -8 to +12)`);
  console.log('');

  if (functionalScore >= 5) {
    console.log('  VERDICT: FUNCTIONAL');
    console.log('  Pheromone inputs show clear signs of evolved utility.');
    console.log('  Creatures with larger pheromone weights tend to be fitter,');
    console.log('  and evolution is amplifying rather than pruning these connections.');
  } else if (functionalScore >= 2) {
    console.log('  VERDICT: WEAKLY FUNCTIONAL');
    console.log('  Pheromone inputs show some structure but evidence is mixed.');
    console.log('  They may provide marginal benefit or be in the early stages');
    console.log('  of being recruited for functional use.');
  } else if (functionalScore >= -1) {
    console.log('  VERDICT: INCONCLUSIVE');
    console.log('  Cannot distinguish pheromone inputs from neutral drift.');
    console.log('  Weights are neither clearly amplified nor clearly pruned.');
    console.log('  Longer evolution time or stronger selection pressure may be needed.');
  } else {
    console.log('  VERDICT: EVOLVED NOISE');
    console.log('  Pheromone inputs are being treated as noise by evolution.');
    console.log('  Weights are being pruned, show no fitness correlation,');
    console.log('  and higher-generation creatures use them less.');
  }

  console.log(`\n${'='.repeat(76)}`);
  console.log('  INVESTIGATION COMPLETE');
  console.log(`${'='.repeat(76)}\n`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const browser = await chromium.launch({ headless: true });
  console.log(`Running ${NUM_TRIALS} trials (${TOTAL_TICKS} ticks each, sampling at ${SAMPLE_TICKS.join(', ')})...`);

  const allTrials = [];
  for (let i = 0; i < NUM_TRIALS; i++) {
    const t0 = Date.now();
    const samples = await runTrial(browser, i);
    const analysis = analyzeTrial(samples, i);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    const lastSnap = analysis.snapshots[analysis.snapshots.length - 1];
    const ratio = lastSnap ? lastSnap.phToNonPhRatio.toFixed(3) : 'N/A';
    const corr = lastSnap ? (isNaN(lastSnap.energyPhWeightCorr) ? 'N/A' : lastSnap.energyPhWeightCorr.toFixed(3)) : 'N/A';
    console.log(`  Trial ${i + 1}/${NUM_TRIALS}: ph/non-ph=${ratio}, energy-corr=${corr}, ${elapsed}s`);

    allTrials.push(analysis);
  }

  await browser.close();
  report(allTrials);
}

main().catch(err => {
  console.error('Investigation failed:', err);
  process.exit(2);
});
