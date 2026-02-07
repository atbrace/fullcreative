// ================================================================
//  RENDERER
// ================================================================
class Renderer {
  constructor(tc, mc) {
    this.tc = tc; this.mc = mc;
    this.tctx = tc.getContext('2d');
    this.mctx = mc.getContext('2d');
    this.showTraits = false;
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.w = window.innerWidth; this.h = window.innerHeight;
    for (const c of [this.tc, this.mc]) {
      c.width = this.w * dpr; c.height = this.h * dpr;
      c.style.width = this.w + 'px'; c.style.height = this.h + 'px';
    }
    this.tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const [r, g, b] = CFG.BG;
    this.tctx.fillStyle = `rgb(${r},${g},${b})`;
    this.tctx.fillRect(0, 0, this.w, this.h);
  }

  render(world, simSpeed) {
    simSpeed = simSpeed || 1;
    const tctx = this.tctx, ctx = this.mctx, W = this.w, H = this.h;

    // Day/night subtly affects trail fade
    const dayP = world.dayPhase;
    const seasonP = world.seasonPhase;
    // At high speeds, increase fade to keep trails proportional
    const speedFade = 1 + Math.log2(Math.max(simSpeed, 1)) * 0.5;
    const trailFade = CFG.TRAIL_FADE_BASE * (0.8 + dayP * 0.4) * speedFade;

    // --- Trail canvas ---
    const [br, bg, bb] = CFG.BG;
    // Seasonal color temperature: warm in summer, cool in winter
    const bgR = br + Math.round(dayP * 3) + Math.round(seasonP * 3);
    const bgG = bg + Math.round(dayP * 3) + Math.round(seasonP * 1);
    const bgB = bb + Math.round(dayP * 5) + Math.round((1 - seasonP) * 4);
    tctx.fillStyle = `rgba(${bgR},${bgG},${bgB},${trailFade})`;
    tctx.fillRect(0, 0, W, H);

    // Mask obstacle interiors on trail canvas
    tctx.fillStyle = `rgb(${br},${bg},${bb})`;
    for (let i = 0; i < world.obstacles.length; i++) {
      const ob = world.obstacles[i];
      tctx.beginPath(); tctx.arc(ob.pos.x, ob.pos.y, ob.radius, 0, 6.283); tctx.fill();
    }

    for (let i = 0; i < world.creatures.length; i++) {
      const c = world.creatures[i];
      const en = clamp(c.energy / CFG.ENERGY_MAX, 0, 1);
      tctx.fillStyle = `hsla(${c.genes.hue}, ${60 + en * 30}%, ${30 + en * 25}%, 0.3)`;
      tctx.beginPath();
      tctx.arc(c.pos.x, c.pos.y, 1.5, 0, 6.283);
      tctx.fill();
    }

    // --- Main canvas ---
    ctx.clearRect(0, 0, W, H);

    // Hotspot glow (modulated by season)
    ctx.globalCompositeOperation = 'lighter';
    const hsGlow = 0.015 + seasonP * 0.015; // dimmer in winter
    for (let i = 0; i < world.hotspots.length; i++) {
      const hs = world.hotspots[i];
      const grad = ctx.createRadialGradient(hs.x, hs.y, 0, hs.x, hs.y, CFG.HOTSPOT_SPREAD * 1.2);
      grad.addColorStop(0, `rgba(50, 120, 70, ${hsGlow * hs.strength})`);
      grad.addColorStop(1, 'rgba(30, 80, 50, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(hs.x, hs.y, CFG.HOTSPOT_SPREAD * 1.2, 0, 6.283);
      ctx.fill();
    }

    // Current zones - subtle flow indicators
    for (let i = 0; i < world.currents.length; i++) {
      const cz = world.currents[i];
      // Zone glow
      const zGrad = ctx.createRadialGradient(cz.pos.x, cz.pos.y, 0, cz.pos.x, cz.pos.y, cz.radius);
      zGrad.addColorStop(0, 'rgba(35, 55, 95, 0.012)');
      zGrad.addColorStop(0.6, 'rgba(30, 50, 85, 0.006)');
      zGrad.addColorStop(1, 'rgba(25, 40, 75, 0)');
      ctx.fillStyle = zGrad;
      ctx.beginPath(); ctx.arc(cz.pos.x, cz.pos.y, cz.radius, 0, 6.283); ctx.fill();
      // Animated flow streaks
      const fdx = Math.cos(cz.angle), fdy = Math.sin(cz.angle);
      const perpX = -fdy, perpY = fdx;
      ctx.strokeStyle = 'rgba(50, 70, 120, 0.035)';
      ctx.lineWidth = 0.8;
      for (let j = 0; j < 5; j++) {
        const phase = ((world.tick * 0.004 + j * 0.2 + i * 0.7) % 1) * 2 - 1;
        const spread = (j / 5 - 0.5) * cz.radius * 0.7;
        const sx = cz.pos.x + perpX * spread + fdx * phase * cz.radius * 0.4;
        const sy = cz.pos.y + perpY * spread + fdy * phase * cz.radius * 0.4;
        const len = 15 + cz.strength * 20;
        ctx.beginPath();
        ctx.moveTo(sx - fdx * len, sy - fdy * len);
        ctx.lineTo(sx + fdx * len, sy + fdy * len);
        ctx.stroke();
      }
    }

    // Pheromone grid overlay
    this._renderPheromones(ctx, world.phGrid);

    // Obstacles - dark body (source-over)
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < world.obstacles.length; i++) {
      const ob = world.obstacles[i];
      const grad = ctx.createRadialGradient(ob.pos.x, ob.pos.y, ob.radius * 0.3, ob.pos.x, ob.pos.y, ob.radius);
      grad.addColorStop(0, 'rgba(12, 12, 28, 0.9)');
      grad.addColorStop(0.7, 'rgba(15, 15, 32, 0.85)');
      grad.addColorStop(1, 'rgba(18, 18, 36, 0.6)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(ob.pos.x, ob.pos.y, ob.radius, 0, 6.283); ctx.fill();
    }
    // Obstacles - subtle edge glow (lighter)
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < world.obstacles.length; i++) {
      const ob = world.obstacles[i];
      const grad = ctx.createRadialGradient(ob.pos.x, ob.pos.y, ob.radius * 0.85, ob.pos.x, ob.pos.y, ob.radius * 1.15);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.5, 'rgba(35, 40, 70, 0.06)');
      grad.addColorStop(1, 'rgba(25, 30, 55, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(ob.pos.x, ob.pos.y, ob.radius * 1.15, 0, 6.283); ctx.fill();
    }

    // Food
    for (let i = 0; i < world.food.length; i++) {
      const f = world.food[i];
      f.pulse += f.type === 1 ? 0.07 : 0.05; // mineral pulses slightly faster
      const glow = 0.5 + Math.sin(f.pulse) * 0.2;
      const isCorpse = f.hue !== null;
      const isMineral = f.type === 1;
      const grad = ctx.createRadialGradient(f.pos.x, f.pos.y, 0, f.pos.x, f.pos.y, 7);
      if (isCorpse) {
        grad.addColorStop(0, `hsla(${f.hue}, 55%, 45%, ${0.55 * glow})`);
        grad.addColorStop(0.35, `hsla(${f.hue}, 45%, 35%, ${0.18 * glow})`);
        grad.addColorStop(1, `hsla(${f.hue}, 35%, 25%, 0)`);
      } else if (isMineral) {
        grad.addColorStop(0, `rgba(100, 200, 255, ${0.55 * glow})`);
        grad.addColorStop(0.35, `rgba(80, 170, 230, ${0.18 * glow})`);
        grad.addColorStop(1, 'rgba(60, 140, 200, 0)');
      } else {
        grad.addColorStop(0, `rgba(100, 230, 160, ${0.55 * glow})`);
        grad.addColorStop(0.35, `rgba(80, 200, 140, ${0.18 * glow})`);
        grad.addColorStop(1, 'rgba(60, 180, 120, 0)');
      }
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(f.pos.x, f.pos.y, 7, 0, 6.283); ctx.fill();
      ctx.fillStyle = isCorpse
        ? `hsla(${f.hue}, 65%, 55%, ${0.75 * glow})`
        : isMineral ? `rgba(130, 210, 255, ${0.75 * glow})`
        : `rgba(150, 255, 200, ${0.75 * glow})`;
      ctx.beginPath(); ctx.arc(f.pos.x, f.pos.y, CFG.FOOD_RADIUS, 0, 6.283); ctx.fill();
    }

    // Creatures
    for (let i = 0; i < world.creatures.length; i++) {
      const c = world.creatures[i];
      const en = clamp(c.energy / CFG.ENERGY_MAX, 0, 1);
      const hue = c.genes.hue, sat = 65 + en * 30, light = 35 + en * 30;
      const rad = c.radius;

      // Body segments (oldest to newest, small to large)
      for (let s = 0; s < c.body.length; s++) {
        const t = c.body[s];
        const prog = (s + 1) / (c.body.length + 1);
        const segR = rad * (0.2 + 0.55 * prog);
        const segA = (0.15 + 0.3 * prog) * (0.5 + en * 0.5);
        ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${segA})`;
        ctx.beginPath(); ctx.arc(t.x, t.y, segR, 0, 6.283); ctx.fill();
      }

      // Signal rings (one per channel, universal colors)
      for (let ch = 0; ch < CFG.SIGNAL_CHANNELS; ch++) {
        if (c.signals[ch] > 0.25) {
          const sa = (c.signals[ch] - 0.25) * 0.55;
          const sr = rad * (2.8 + ch * 1.4 + Math.sin(world.tick * 0.1 + c.id + ch * 2.1) * 0.5);
          ctx.strokeStyle = `hsla(${SIGNAL_HUES[ch]}, 75%, 60%, ${sa * 0.45})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.arc(c.pos.x, c.pos.y, sr, 0, 6.283); ctx.stroke();
        }
      }

      // Share ring (green)
      if (c.shareOut > 0.15) {
        const sa = (c.shareOut - 0.15) * 0.5;
        const sr = rad * (2.0 + Math.sin(world.tick * 0.08 + c.id) * 0.3);
        ctx.strokeStyle = `hsla(140, 70%, 55%, ${sa * 0.4})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(c.pos.x, c.pos.y, sr, 0, 6.283); ctx.stroke();
      }

      // Mate ring (pink)
      if (c.mateOut > 0.25) {
        const ma = (c.mateOut - 0.25) * 0.6;
        const mr = rad * (1.6 + Math.sin(world.tick * 0.12 + c.id * 1.5) * 0.25);
        ctx.strokeStyle = `hsla(340, 75%, 65%, ${ma * 0.35})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(c.pos.x, c.pos.y, mr, 0, 6.283); ctx.stroke();
      }

      // Outer glow
      const oGrad = ctx.createRadialGradient(c.pos.x, c.pos.y, 0, c.pos.x, c.pos.y, rad * 3.8);
      oGrad.addColorStop(0, `hsla(${hue}, ${sat}%, ${light}%, ${0.45 + en * 0.3})`);
      oGrad.addColorStop(0.25, `hsla(${hue}, ${sat}%, ${light}%, ${0.12 + en * 0.1})`);
      oGrad.addColorStop(1, `hsla(${hue}, ${sat}%, ${light}%, 0)`);
      ctx.fillStyle = oGrad;
      ctx.beginPath(); ctx.arc(c.pos.x, c.pos.y, rad * 3.8, 0, 6.283); ctx.fill();

      // Core
      const cGrad = ctx.createRadialGradient(c.pos.x, c.pos.y, 0, c.pos.x, c.pos.y, rad);
      cGrad.addColorStop(0, `hsla(${hue}, ${sat}%, ${Math.min(light + 25, 90)}%, 0.95)`);
      cGrad.addColorStop(0.65, `hsla(${hue}, ${sat}%, ${light + 10}%, 0.7)`);
      cGrad.addColorStop(1, `hsla(${hue}, ${sat}%, ${light}%, 0.25)`);
      ctx.fillStyle = cGrad;
      ctx.beginPath(); ctx.arc(c.pos.x, c.pos.y, rad, 0, 6.283); ctx.fill();

      // Heading dot
      const hx = c.pos.x + Math.cos(c.heading) * rad * 0.6;
      const hy = c.pos.y + Math.sin(c.heading) * rad * 0.6;
      ctx.fillStyle = `hsla(${hue}, 90%, ${Math.min(light + 35, 95)}%, 0.85)`;
      ctx.beginPath(); ctx.arc(hx, hy, rad * 0.25, 0, 6.283); ctx.fill();

      // --- Selection decorations ---
      if (world.selected === c) {
        ctx.globalCompositeOperation = 'source-over';
        // Vision range
        ctx.strokeStyle = 'rgba(200, 200, 255, 0.06)';
        ctx.lineWidth = 0.5; ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.arc(c.pos.x, c.pos.y, c.genes.senseRange, 0, 6.283); ctx.stroke();
        ctx.setLineDash([]);

        // Attention lines
        if (c._nfPos) {
          ctx.strokeStyle = 'rgba(100, 230, 160, 0.12)';
          ctx.lineWidth = 0.5; ctx.setLineDash([2, 5]);
          ctx.beginPath(); ctx.moveTo(c.pos.x, c.pos.y); ctx.lineTo(c._nfPos.x, c._nfPos.y); ctx.stroke();
          ctx.setLineDash([]);
        }
        if (c._ncPos) {
          ctx.strokeStyle = 'rgba(220, 140, 140, 0.1)';
          ctx.lineWidth = 0.5; ctx.setLineDash([2, 5]);
          ctx.beginPath(); ctx.moveTo(c.pos.x, c.pos.y); ctx.lineTo(c._ncPos.x, c._ncPos.y); ctx.stroke();
          ctx.setLineDash([]);
        }

        // Pulsing selection ring
        const sp = 0.6 + Math.sin(world.tick * 0.07) * 0.3;
        ctx.strokeStyle = `rgba(255, 255, 220, ${sp * 0.5})`;
        ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.arc(c.pos.x, c.pos.y, rad * 3.2, 0, 6.283); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalCompositeOperation = 'lighter';
      }
    }

    // Particles
    for (let i = 0; i < world.particles.length; i++) {
      const p = world.particles[i], a = p.alpha;
      ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${a * 0.65})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * a, 0, 6.283); ctx.fill();
    }

    // --- UI layer (source-over) ---
    ctx.globalCompositeOperation = 'source-over';

    // Vignette
    const maxDim = Math.max(W, H);
    const vGrad = ctx.createRadialGradient(W / 2, H / 2, maxDim * 0.22, W / 2, H / 2, maxDim * 0.72);
    vGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vGrad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, W, H);

    // Population graph
    this.drawGraph(ctx, world, W, H);

    // Trait timeline (toggle with 'e')
    if (this.showTraits) this.drawTraitGraph(ctx, world, W, H);
  }

  _renderPheromones(ctx, phGrid) {
    const data = phGrid.data, cols = phGrid.cols, rows = phGrid.rows;
    const pixels = phGrid.imgData.data;
    let hasAny = false;
    for (let i = 0, n = cols * rows; i < n; i++) {
      const v = data[i];
      const pi = i * 4;
      if (v > 0.05) {
        hasAny = true;
        const intensity = Math.min(v / CFG.PH_MAX_VIZ, 1);
        const a = intensity * 0.45;
        // Color by dominant species in this cell
        const rgb = PH_SPECIES_RGB[phGrid.dominantSpecies(i)];
        pixels[pi] = rgb[0];
        pixels[pi + 1] = rgb[1];
        pixels[pi + 2] = rgb[2];
        pixels[pi + 3] = Math.round(a * 255);
      } else {
        pixels[pi] = 0; pixels[pi + 1] = 0; pixels[pi + 2] = 0; pixels[pi + 3] = 0;
      }
    }
    if (!hasAny) return;
    phGrid.imgCtx.putImageData(phGrid.imgData, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(phGrid.canvas, 0, 0, cols, rows, 0, 0, this.w, this.h);
  }

  drawGraph(ctx, world, W, H) {
    const hist = world.speciesTracker.history;
    if (hist.length < 2) return;
    const gH = 50, gW = 240, gX = W - gW - 24, gY = H - gH - 16;

    // Background
    ctx.fillStyle = 'rgba(8, 8, 26, 0.45)';
    ctx.fillRect(gX, gY, gW, gH);
    ctx.strokeStyle = 'rgba(70, 70, 110, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(gX, gY, gW, gH);

    // Find max total and collect active buckets
    let maxP = 1;
    const seen = new Uint8Array(12);
    const lastHue = new Float64Array(12);
    for (let i = 0; i < hist.length; i++) {
      if (hist[i].total > maxP) maxP = hist[i].total;
      const bs = hist[i].buckets;
      for (let j = 0; j < bs.length; j++) {
        seen[bs[j].b] = 1;
        lastHue[bs[j].b] = bs[j].hue;
      }
    }
    const active = [];
    for (let b = 0; b < 12; b++) if (seen[b]) active.push(b);
    if (active.length === 0) return;

    const n = hist.length;
    const ns = active.length;
    const scale = (gH - 4) / maxP;
    const xStep = gW / (n - 1);

    // Build flat count lookup: counts[entry * 12 + bucket]
    const counts = new Int32Array(n * 12);
    for (let i = 0; i < n; i++) {
      const bs = hist[i].buckets;
      for (let j = 0; j < bs.length; j++) {
        counts[i * 12 + bs[j].b] = bs[j].count;
      }
    }

    // Draw stacked species bands (bottom to top)
    const prevTop = new Float64Array(n);
    const curTop = new Float64Array(n);

    for (let si = 0; si < ns; si++) {
      const bucket = active[si];
      const hue = lastHue[bucket];

      // Compute cumulative top for this species
      for (let i = 0; i < n; i++) {
        curTop[i] = prevTop[i] + counts[i * 12 + bucket];
      }

      // Filled band
      ctx.beginPath();
      ctx.moveTo(gX, gY + gH - curTop[0] * scale);
      for (let i = 1; i < n; i++) {
        ctx.lineTo(gX + i * xStep, gY + gH - curTop[i] * scale);
      }
      for (let i = n - 1; i >= 0; i--) {
        ctx.lineTo(gX + i * xStep, gY + gH - prevTop[i] * scale);
      }
      ctx.closePath();
      ctx.fillStyle = `hsla(${hue}, 60%, 45%, 0.18)`;
      ctx.fill();

      // Stroke top edge
      ctx.beginPath();
      ctx.moveTo(gX, gY + gH - curTop[0] * scale);
      for (let i = 1; i < n; i++) {
        ctx.lineTo(gX + i * xStep, gY + gH - curTop[i] * scale);
      }
      ctx.strokeStyle = `hsla(${hue}, 65%, 55%, 0.35)`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Copy curTop to prevTop for next species
      for (let i = 0; i < n; i++) prevTop[i] = curTop[i];
    }

    // Label
    ctx.font = '9px -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(90, 120, 170, 0.25)';
    ctx.fillText('species', gX + 4, gY + 10);
  }

  drawTraitGraph(ctx, world, W, H) {
    const hist = world.traitHistory;
    if (hist.length < 2) return;
    const gH = 45, gW = 240, gX = W - gW - 24, gY = H - 50 - 16 - gH - 6;

    // Background
    ctx.fillStyle = 'rgba(8, 8, 26, 0.45)';
    ctx.fillRect(gX, gY, gW, gH);
    ctx.strokeStyle = 'rgba(70, 70, 110, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(gX, gY, gW, gH);

    const n = hist.length;
    const xStep = gW / (n - 1);
    const pad = 3;
    const plotH = gH - pad * 2;

    // Trait definitions: key, min, max, color
    const traits = [
      { key: 'brain', lo: CFG.BRAIN_HIDDEN_MIN, hi: CFG.BRAIN_HIDDEN_MAX, color: '220, 160, 60' },
      { key: 'sense', lo: CFG.SENSE_RANGE_MIN, hi: CFG.SENSE_RANGE_MAX, color: '80, 170, 220' },
      { key: 'size',  lo: 0.5, hi: 2.0, color: '140, 140, 220' },
      { key: 'speed', lo: 0.5, hi: 2.0, color: '100, 200, 120' },
    ];

    for (let t = 0; t < traits.length; t++) {
      const tr = traits[t];
      const range = tr.hi - tr.lo;

      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const v = (hist[i][tr.key] - tr.lo) / range;
        const y = gY + gH - pad - v * plotH;
        if (i === 0) ctx.moveTo(gX, y);
        else ctx.lineTo(gX + i * xStep, y);
      }
      ctx.strokeStyle = `rgba(${tr.color}, 0.55)`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Current values on right edge
    if (hist.length > 0) {
      const last = hist[hist.length - 1];
      ctx.font = '7.5px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      const labels = [
        { val: last.brain.toFixed(1), color: '220, 160, 60', name: 'brain' },
        { val: Math.round(last.sense), color: '80, 170, 220', name: 'sense' },
        { val: last.size.toFixed(2), color: '140, 140, 220', name: 'size' },
        { val: last.speed.toFixed(2), color: '100, 200, 120', name: 'spd' },
      ];
      for (let i = 0; i < labels.length; i++) {
        const ly = gY + 9 + i * 9;
        ctx.fillStyle = `rgba(${labels[i].color}, 0.45)`;
        ctx.fillText(labels[i].name + ' ' + labels[i].val, gX + gW - 3, ly);
      }
      ctx.textAlign = 'start';
    }

    // Label
    ctx.font = '9px -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(90, 120, 170, 0.25)';
    ctx.fillText('traits', gX + 4, gY + 10);
  }
}

// ================================================================
//  BRAIN RENDERER (Inspector neural network visualization)
// ================================================================
function renderBrain(canvas, brain) {
  const dpr = 2; // always render brain at 2x
  const W = 248, H = 220;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const ni = brain.ni, nh = brain.nh, no = brain.no;
  const inp = brain.lastInput, hid = brain.lastHidden, out = brain.lastOutput;

  // Node positions
  const lx = [32, W / 2, W - 32];
  const pad = 7, avail = H - pad * 2;

  function nodeY(count, idx) { return pad + (count > 1 ? idx * avail / (count - 1) : avail / 2); }

  const nodes = [
    Array.from({ length: ni }, (_, i) => ({ x: lx[0], y: nodeY(ni, i), v: inp[i] })),
    Array.from({ length: nh }, (_, i) => ({ x: lx[1], y: nodeY(nh, i), v: hid[i] })),
    Array.from({ length: no }, (_, i) => ({ x: lx[2], y: nodeY(no, i), v: out[i] })),
  ];

  // Draw connections
  function drawConn(from, to, w, fromVal) {
    const aw = Math.abs(w);
    if (aw < 0.04) return;
    const activity = Math.abs(fromVal) * aw;
    const alpha = clamp(activity * 0.35 + aw * 0.06, 0.015, 0.45);
    const lw = clamp(aw * 1.2, 0.2, 2.2);
    ctx.strokeStyle = w > 0
      ? `rgba(70, 150, 255, ${alpha})`
      : `rgba(255, 80, 100, ${alpha})`;
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
  }

  // input -> hidden
  for (let i = 0; i < ni; i++)
    for (let j = 0; j < nh; j++)
      drawConn(nodes[0][i], nodes[1][j], brain.wih[i * nh + j], inp[i]);

  // hidden -> output
  for (let j = 0; j < nh; j++)
    for (let k = 0; k < no; k++)
      drawConn(nodes[1][j], nodes[2][k], brain.who[j * no + k], hid[j]);

  // Draw nodes
  const nr = 4;
  const memStart = ni - CFG.BRAIN_RECURRENT;
  const sigInputStart = 7, sigInputEnd = 7 + CFG.SIGNAL_CHANNELS * 3; // signal input range
  const obsInputStart = 19, obsInputEnd = 22; // obstacle input range
  const kinPhStart = 22, kinPhEnd = 25;  // kin pheromone input range
  const forPhStart = 25, forPhEnd = 28;  // foreign pheromone input range
  const sigOutputStart = 2; // signal output range starts at index 2

  function signalChannelColor(ch, alpha) {
    const h = SIGNAL_HUES[ch];
    return `hsla(${h}, 75%, 60%, ${alpha})`;
  }

  function getInputColor(i, av) {
    if (i >= memStart) return `rgba(220, 160, 60, ${Math.max(av, 0.15) * 0.85})`;
    if (i >= kinPhStart && i < kinPhEnd) return `rgba(160, 140, 70, ${Math.max(av, 0.15) * 0.85})`;
    if (i >= forPhStart && i < forPhEnd) return `rgba(130, 90, 160, ${Math.max(av, 0.15) * 0.85})`;
    if (i >= obsInputStart && i < obsInputEnd) return `rgba(120, 140, 180, ${Math.max(av, 0.15) * 0.85})`;
    if (i >= sigInputStart && i < sigInputEnd) {
      const ch = Math.floor((i - sigInputStart) / 3);
      return signalChannelColor(ch, Math.max(av, 0.15) * 0.85);
    }
    return av > 0 ? `rgba(70, 150, 255, ${av * 0.85})` : `rgba(255, 80, 100, ${av * 0.85})`;
  }

  function getOutputColor(i, v) {
    const av = Math.abs(v);
    if (i >= sigOutputStart && i < sigOutputStart + CFG.SIGNAL_CHANNELS) {
      const ch = i - sigOutputStart;
      return signalChannelColor(ch, Math.max(av, 0.15) * 0.85);
    }
    if (i === 5) return `rgba(100, 200, 120, ${Math.max(av, 0.15) * 0.85})`; // share
    if (i === 6) return `rgba(220, 120, 170, ${Math.max(av, 0.15) * 0.85})`; // mate
    return v >= 0 ? `rgba(70, 150, 255, ${av * 0.85})` : `rgba(255, 80, 100, ${av * 0.85})`;
  }

  function getStrokeColor(i, layer) {
    if (layer === 0 && i >= memStart) return 'rgba(180, 140, 50, 0.4)';
    if (layer === 0 && i >= kinPhStart && i < kinPhEnd) return 'rgba(140, 120, 60, 0.4)';
    if (layer === 0 && i >= forPhStart && i < forPhEnd) return 'rgba(110, 75, 140, 0.4)';
    if (layer === 0 && i >= obsInputStart && i < obsInputEnd) return 'rgba(100, 120, 160, 0.4)';
    if (layer === 0 && i >= sigInputStart && i < sigInputEnd) {
      const ch = Math.floor((i - sigInputStart) / 3);
      return signalChannelColor(ch, 0.35);
    }
    if (layer === 2 && i >= sigOutputStart && i < sigOutputStart + CFG.SIGNAL_CHANNELS) {
      const ch = i - sigOutputStart;
      return signalChannelColor(ch, 0.35);
    }
    if (layer === 2 && i === 5) return 'rgba(80, 180, 100, 0.4)';
    if (layer === 2 && i === 6) return 'rgba(200, 100, 150, 0.4)';
    return 'rgba(90, 90, 140, 0.35)';
  }

  for (let l = 0; l < 3; l++) {
    for (let i = 0; i < nodes[l].length; i++) {
      const n = nodes[l][i], av = Math.abs(n.v);
      ctx.fillStyle = 'rgba(18, 18, 40, 0.85)';
      ctx.beginPath(); ctx.arc(n.x, n.y, nr, 0, 6.283); ctx.fill();
      ctx.fillStyle = l === 0 ? getInputColor(i, av)
        : l === 2 ? getOutputColor(i, n.v)
        : (n.v >= 0 ? `rgba(70, 150, 255, ${av * 0.85})` : `rgba(255, 80, 100, ${av * 0.85})`);
      ctx.beginPath(); ctx.arc(n.x, n.y, nr * 0.75, 0, 6.283); ctx.fill();
      ctx.strokeStyle = getStrokeColor(i, l);
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.arc(n.x, n.y, nr, 0, 6.283); ctx.stroke();
    }
  }

  // Labels
  ctx.font = '7.5px -apple-system, sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i < ni; i++) {
    if (i >= memStart) ctx.fillStyle = 'rgba(220, 160, 60, 0.6)';
    else if (i >= kinPhStart && i < kinPhEnd) ctx.fillStyle = 'rgba(160, 140, 70, 0.6)';
    else if (i >= forPhStart && i < forPhEnd) ctx.fillStyle = 'rgba(130, 90, 160, 0.6)';
    else if (i >= obsInputStart && i < obsInputEnd) ctx.fillStyle = 'rgba(120, 140, 180, 0.6)';
    else if (i >= sigInputStart && i < sigInputEnd) {
      const ch = Math.floor((i - sigInputStart) / 3);
      ctx.fillStyle = signalChannelColor(ch, 0.55);
    }
    else ctx.fillStyle = 'rgba(100, 100, 155, 0.55)';
    ctx.fillText(INPUT_LABELS[i], nodes[0][i].x - nr - 3, nodes[0][i].y + 2.5);
  }

  ctx.textAlign = 'left';
  for (let i = 0; i < no; i++) {
    if (i >= sigOutputStart && i < sigOutputStart + CFG.SIGNAL_CHANNELS) ctx.fillStyle = signalChannelColor(i - sigOutputStart, 0.55);
    else if (i === 5) ctx.fillStyle = 'rgba(100, 200, 120, 0.55)';
    else if (i === 6) ctx.fillStyle = 'rgba(220, 120, 170, 0.55)';
    else ctx.fillStyle = 'rgba(100, 100, 155, 0.55)';
    ctx.fillText(OUTPUT_LABELS[i], nodes[2][i].x + nr + 3, nodes[2][i].y + 2.5);
  }

  ctx.textAlign = 'start';
}
