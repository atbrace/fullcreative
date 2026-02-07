// ================================================================
//  MAIN
// ================================================================
(function main() {
  const overlay = document.getElementById('overlay');
  const statsEl = document.getElementById('stats');
  const speedEl = document.getElementById('speed-controls');
  const helpEl = document.getElementById('help-panel');
  const inspEl = document.getElementById('inspector');
  const pauseEl = document.getElementById('pause-label');
  const eventLogEl = document.getElementById('event-log');
  const trailCanvas = document.getElementById('trail-canvas');
  const mainCanvas = document.getElementById('main-canvas');
  const brainCanvas = document.getElementById('brain-canvas');

  const renderer = new Renderer(trailCanvas, mainCanvas);
  let world = new World(renderer.w, renderer.h);
  window.__world = world; // debug accessor
  const audio = new AudioEngine();

  let started = false, showHelp = true, simSpeed = 1, frameCount = 0;

  const saveControlsEl = document.getElementById('save-controls');
  const fileInputEl = document.getElementById('file-input');

  // --- Save ecosystem ---
  function saveEcosystem() {
    if (!started) return;
    const wasPaused = world.paused;
    world.paused = true;
    const data = world.toJSON();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const t = Math.floor(world.tick / 60);
    const min = Math.floor(t / 60), sec = (t % 60).toString().padStart(2, '0');
    a.download = 'emergence-gen' + world.maxGen + '-' + min + 'm' + sec + 's.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    world.paused = wasPaused;
  }

  // --- Load ecosystem ---
  function loadEcosystem(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.version || !data.creatures) {
          console.error('Invalid ecosystem file');
          return;
        }
        world.paused = true;
        world.loadFromJSON(data);
        window.__world = world;
        // Clear trail canvas to avoid ghosting from old positions
        const tctx = renderer.tctx;
        const [r, g, b] = CFG.BG;
        tctx.fillStyle = `rgb(${r},${g},${b})`;
        tctx.fillRect(0, 0, renderer.w, renderer.h);
        // Reset camera
        renderer.cam.x = renderer.w / 2; renderer.cam.y = renderer.h / 2; renderer.cam.zoom = 1;
        renderer.camTarget.x = renderer.w / 2; renderer.camTarget.y = renderer.h / 2; renderer.camTarget.zoom = 1;
        world.paused = false;
        inspEl.classList.remove('visible');
      } catch (err) {
        console.error('Failed to load ecosystem:', err);
      }
    };
    reader.readAsText(file);
  }

  // Silent audio proxy for time-lapse speeds - keeps drone, mutes events
  const timelapsAudio = {
    eatClick() {}, birthPing() {}, deathThud() {}, predationSweep() {},
    setPopulation(p) { audio.setPopulation(p); },
    setEcosystemState(s) { audio.setEcosystemState(s); }
  };

  // --- Start ---
  overlay.addEventListener('click', () => {
    if (started) return;
    started = true;
    overlay.classList.add('hidden');
    statsEl.classList.add('visible');
    speedEl.classList.add('visible');
    helpEl.classList.add('visible');
    eventLogEl.classList.add('visible');
    saveControlsEl.classList.add('visible');
    audio.start();
    world.seed();
    setTimeout(() => { if (showHelp) { showHelp = false; helpEl.classList.remove('visible'); } }, 10000);
  });

  // --- Speed buttons ---
  function setSpeed(s) {
    simSpeed = s;
    document.querySelectorAll('.spd-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.speed) === s));
  }
  document.querySelectorAll('.spd-btn').forEach(b =>
    b.addEventListener('click', () => setSpeed(parseInt(b.dataset.speed)))
  );

  // --- Save/Load buttons ---
  document.getElementById('btn-save').addEventListener('click', saveEcosystem);
  document.getElementById('btn-load').addEventListener('click', () => fileInputEl.click());
  fileInputEl.addEventListener('change', (e) => {
    if (e.target.files.length > 0) loadEcosystem(e.target.files[0]);
    e.target.value = ''; // allow re-loading same file
  });

  // --- Keyboard ---
  document.addEventListener('keydown', (e) => {
    if (!started) return;
    const k = e.key.toLowerCase();
    if (k === ' ') {
      e.preventDefault(); world.paused = !world.paused;
      pauseEl.classList.toggle('visible', world.paused);
    }
    else if (k === 'h') { showHelp = !showHelp; helpEl.classList.toggle('visible', showHelp); }
    else if (k === 'm') { audio.toggleMute(); }
    else if (k === '1') { setSpeed(1); }
    else if (k === '2') { setSpeed(2); }
    else if (k === '4') { setSpeed(4); }
    else if (k === 't') { setSpeed(simSpeed === 16 ? 32 : 16); }
    else if (k === 'e') { renderer.showTraits = !renderer.showTraits; }
    else if (k === 's') { saveEcosystem(); }
    else if (k === 'l') { fileInputEl.click(); }
    else if (k === 'escape') { world.selected = null; inspEl.classList.remove('visible'); }
  });

  // --- Mouse ---
  mainCanvas.addEventListener('click', (e) => {
    if (!started) return;
    const wp = renderer.screenToWorld(e.clientX, e.clientY);
    if (e.shiftKey) {
      const c = Creature.createRandom(wp.x, wp.y);
      world.creatures.push(c);
      world.spawnP(wp.x, wp.y, c.genes.hue, 12, 3, 25, 2);
      return;
    }
    // Try to select creature
    const hit = world.creatureAt(wp.x, wp.y);
    if (hit) {
      world.selected = hit;
      inspEl.classList.add('visible');
    } else {
      world.selected = null;
      inspEl.classList.remove('visible');
      // Add food burst
      for (let i = 0; i < 8; i++) {
        if (world.food.length < CFG.MAX_FOOD + 25)
          world.food.push(new Food(wp.x + rand(-30, 30), wp.y + rand(-30, 30)));
      }
      world.spawnP(wp.x, wp.y, 140, 14, 2.5, 25, 1.5);
    }
  });

  // --- Resize ---
  window.addEventListener('resize', () => { renderer.resize(); world.resize(renderer.w, renderer.h); });

  // --- Inspector update ---
  function updateInspector() {
    const c = world.selected;
    if (!c) { inspEl.classList.remove('visible'); return; }
    if (!c.alive) { world.selected = null; inspEl.classList.remove('visible'); return; }

    document.getElementById('i-dot').style.background = `hsl(${c.genes.hue}, 70%, 55%)`;
    document.getElementById('i-title').textContent = `CREATURE #${c.id}`;
    const spBucket = world.speciesTracker.bucketOf(c);
    document.getElementById('i-species').textContent = SPECIES_NAMES[spBucket];
    document.getElementById('i-species').style.color = `hsl(${c.genes.hue}, 60%, 55%)`;
    document.getElementById('i-gen').textContent = c.generation;
    document.getElementById('i-age').textContent = (c.age / 60).toFixed(1) + 's';
    const ePct = Math.round(clamp(c.energy / CFG.ENERGY_MAX, 0, 1) * 100);
    document.getElementById('i-energy').textContent = ePct + '%';
    const bar = document.getElementById('i-ebar');
    bar.style.width = ePct + '%';
    const eHue = ePct > 50 ? 140 : ePct > 25 ? 45 : 0;
    bar.style.background = `hsl(${eHue}, 65%, 50%)`;
    document.getElementById('i-size').textContent = c.genes.size.toFixed(2);
    document.getElementById('i-spd').textContent = c.genes.speedGene.toFixed(2);
    for (let ch = 0; ch < CFG.SIGNAL_CHANNELS; ch++)
      document.getElementById('i-sg' + ch).textContent = c.signals[ch].toFixed(1);
    document.getElementById('i-shr').textContent = c.shareOut.toFixed(1);
    document.getElementById('i-mat').textContent = c.mateOut.toFixed(1);
    const dietVal = c.genes.diet;
    const dietEl = document.getElementById('i-diet');
    dietEl.textContent = dietVal.toFixed(2);
    dietEl.style.color = dietVal < 0.35 ? 'hsl(140,60%,55%)' : dietVal > 0.65 ? 'hsl(200,65%,60%)' : 'hsl(170,40%,50%)';
    document.getElementById('i-brain').textContent = c.genes.brainSize + 'h';
    document.getElementById('i-vis').textContent = Math.round(c.genes.senseRange);
    const phDepEl = document.getElementById('i-scent');
    if (phDepEl) phDepEl.textContent = c.genes.phDeposit.toFixed(2);
    const phdEl = document.getElementById('i-phd');
    if (phdEl) phdEl.textContent = c.phDepOut.toFixed(2);
    document.getElementById('i-brain-lbl').textContent = 'NEURAL NETWORK ' + c.brain.ni + '-' + c.brain.nh + '-' + c.brain.no;

    renderBrain(brainCanvas, c.brain);
  }

  // --- Stats ---
  function updateStats() {
    const t = Math.floor(world.tick / 60), min = Math.floor(t / 60), sec = (t % 60).toString().padStart(2, '0');
    document.getElementById('s-pop').textContent = world.creatures.length;
    document.getElementById('s-food').textContent = world.food.length;
    document.getElementById('s-gen').textContent = world.maxGen;
    document.getElementById('s-births').textContent = world.births;
    document.getElementById('s-deaths').textContent = world.deaths;
    const currentSp = world.speciesTracker.getCurrent();
    const spEl = document.getElementById('s-species');
    let spHtml = '';
    const maxShow = 3;
    for (let i = 0; i < Math.min(currentSp.length, maxShow); i++) {
      const s = currentSp[i];
      spHtml += '<span style="color:hsl(' + Math.round(s.hue) + ',60%,55%)">' + SPECIES_NAMES[s.b] + '</span> ';
      spHtml += '<span class="sv">' + s.count + '</span> ';
    }
    if (currentSp.length > maxShow) spHtml += '<span class="sl">+' + (currentSp.length - maxShow) + '</span>';
    if (currentSp.length === 0) spHtml = '<span class="sv">0</span>';
    spEl.innerHTML = spHtml;
    document.getElementById('s-oldest').textContent = (world.oldestAge() / 60).toFixed(0) + 's';
    const sp = world.seasonPhase;
    const seasonName = sp > 0.75 ? 'summer' : sp > 0.5 ? 'spring' : sp > 0.25 ? 'autumn' : 'winter';
    document.getElementById('s-season').textContent = seasonName;
    const eraEl = document.getElementById('s-era');
    eraEl.textContent = world.eventLog.era || '--';
    eraEl.style.color = world.eventLog.era
      ? 'hsl(' + world.eventLog.eraHue + ',45%,55%)'
      : '';
    document.getElementById('s-time').textContent = min + ':' + sec;
  }

  // --- Event log ---
  function eventColor(type, hue) {
    const h = Math.round(hue);
    switch (type) {
      case 'extinction': return 'hsl(' + h + ',30%,42%)';
      case 'emergence':  return 'hsl(' + h + ',55%,55%)';
      case 'boom':       return 'hsl(' + h + ',45%,50%)';
      case 'bust':       return 'hsl(' + h + ',50%,48%)';
      case 'season':     return 'hsl(' + h + ',35%,50%)';
      case 'predation':  return 'hsl(' + h + ',55%,50%)';
      case 'milestone':  return 'hsl(' + h + ',40%,55%)';
      case 'era':        return 'hsl(' + h + ',50%,58%)';
      default:           return 'hsl(' + h + ',40%,50%)';
    }
  }

  function updateEventLog() {
    const events = world.eventLog.getVisible();
    if (events.length === 0) { eventLogEl.innerHTML = ''; return; }
    let html = '';
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      html += '<div class="evt-line" style="opacity:' + e._opacity.toFixed(2) +
        ';color:' + eventColor(e.type, e.hue) + '">' + e.text + '</div>';
    }
    eventLogEl.innerHTML = html;
  }

  // --- Game loop ---
  function loop() {
    requestAnimationFrame(loop);
    if (!started) return;
    const useAudio = simSpeed > 4 ? timelapsAudio : audio;
    for (let i = 0; i < simSpeed; i++) world.update(useAudio);
    renderer.render(world, simSpeed);
    frameCount++;
    if (frameCount % 12 === 0) { updateStats(); updateInspector(); updateEventLog(); }
  }
  loop();
})();
