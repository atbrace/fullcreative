// ================================================================
//  WORLD
// ================================================================
class World {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.creatures = []; this.food = []; this.particles = [];
    this.foodGrid = new SpatialGrid(w, h, CFG.GRID_CELL);
    this.creatureGrid = new SpatialGrid(w, h, CFG.GRID_CELL);
    this.phGrid = new PheromoneGrid(w, h);
    this.hotspots = [];
    this.obstacles = [];
    this.currents = [];
    this.tick = 0; this.births = 0; this.sexualBirths = 0; this.deaths = 0; this.maxGen = 0;
    this.recentPredations = 0;
    this.popHistory = [];
    this.traitHistory = []; // [{brain, sense, size, speed}] sampled every 10 ticks
    this.speciesTracker = new SpeciesTracker();
    this.eventLog = new EventLog();
    this.paused = false;
    this.selected = null;
  }

  seed() {
    for (let i = 0; i < CFG.NUM_HOTSPOTS; i++)
      this.hotspots.push(new Hotspot(rand(100, this.w - 100), rand(100, this.h - 100)));
    this._generateObstacles();
    this.phGrid.buildMask(this.obstacles);
    this._generateCurrents();
    for (let i = 0; i < CFG.INITIAL_CREATURES; i++) {
      const pos = this._dietSpawnPos();
      this.creatures.push(Creature.createRandom(pos.x, pos.y));
    }
    for (let i = 0; i < CFG.INITIAL_FOOD; i++)
      this.food.push(this._spawnFood());
  }

  _generateObstacles() {
    const nFormations = randInt(CFG.OBS_FORMATIONS_MIN, CFG.OBS_FORMATIONS_MAX + 1);
    const cx = this.w / 2, cy = this.h / 2;
    const centers = []; // formation center points for spacing check

    for (let f = 0; f < nFormations; f++) {
      // Find valid formation center
      let fx, fy, valid, attempts = 0;
      do {
        fx = rand(CFG.OBS_MARGIN_EDGE, this.w - CFG.OBS_MARGIN_EDGE);
        fy = rand(CFG.OBS_MARGIN_EDGE, this.h - CFG.OBS_MARGIN_EDGE);
        valid = true;
        // Not too close to center
        if (Math.sqrt((fx - cx) * (fx - cx) + (fy - cy) * (fy - cy)) < CFG.OBS_MARGIN_CENTER) valid = false;
        // Not too close to hotspots
        if (valid) for (let i = 0; i < this.hotspots.length; i++) {
          const dx = fx - this.hotspots[i].x, dy = fy - this.hotspots[i].y;
          if (Math.sqrt(dx * dx + dy * dy) < CFG.OBS_MARGIN_HOTSPOT) { valid = false; break; }
        }
        // Not too close to other formations
        if (valid) for (let i = 0; i < centers.length; i++) {
          const dx = fx - centers[i].x, dy = fy - centers[i].y;
          if (Math.sqrt(dx * dx + dy * dy) < CFG.OBS_MARGIN_FORMATION) { valid = false; break; }
        }
        attempts++;
      } while (!valid && attempts < 60);
      if (!valid) continue; // skip this formation if no valid spot found

      centers.push({ x: fx, y: fy });
      const nCircles = randInt(CFG.OBS_CIRCLES_MIN, CFG.OBS_CIRCLES_MAX + 1);
      for (let c = 0; c < nCircles; c++) {
        const ox = fx + gaussRand() * CFG.OBS_SPREAD;
        const oy = fy + gaussRand() * CFG.OBS_SPREAD;
        const or = rand(CFG.OBS_RADIUS_MIN, CFG.OBS_RADIUS_MAX);
        this.obstacles.push(new Obstacle(ox, oy, or));
      }
    }
  }

  _generateCurrents() {
    const n = randInt(CFG.CURRENT_ZONES_MIN, CFG.CURRENT_ZONES_MAX + 1);
    for (let i = 0; i < n; i++) {
      const x = rand(120, this.w - 120);
      const y = rand(120, this.h - 120);
      const angle = Math.random() * Math.PI * 2;
      const strength = CFG.CURRENT_STRENGTH * rand(0.6, 1.0);
      const radius = rand(CFG.CURRENT_RADIUS_MIN, CFG.CURRENT_RADIUS_MAX);
      this.currents.push(new CurrentZone(x, y, angle, strength, radius));
    }
  }

  _spawnFood() {
    const isMineral = Math.random() < CFG.MINERAL_FOOD_RATIO;

    if (isMineral && this.obstacles.length > 0) {
      // Mineral food: spawn near a random obstacle surface
      for (let attempt = 0; attempt < 10; attempt++) {
        const ob = this.obstacles[randInt(0, this.obstacles.length)];
        const angle = Math.random() * Math.PI * 2;
        const dist = ob.radius + rand(8, 35); // just outside the obstacle
        const margin = 35;
        const fx = clamp(ob.pos.x + Math.cos(angle) * dist, margin, this.w - margin);
        const fy = clamp(ob.pos.y + Math.sin(angle) * dist, margin, this.h - margin);
        // Reject if inside another obstacle
        let blocked = false;
        for (let i = 0; i < this.obstacles.length; i++) {
          const o2 = this.obstacles[i];
          const dx = fx - o2.pos.x, dy = fy - o2.pos.y;
          if (dx * dx + dy * dy < o2.radius * o2.radius) { blocked = true; break; }
        }
        if (!blocked) return new Food(fx, fy, undefined, Math.round(CFG.FOOD_ENERGY * 1.2), 1);
      }
    }

    // Flora food: near a weighted random hotspot
    let total = 0;
    for (let i = 0; i < this.hotspots.length; i++) total += this.hotspots[i].strength;

    for (let attempt = 0; attempt < 10; attempt++) {
      let r = Math.random() * total;
      let hs = this.hotspots[0];
      for (let i = 0; i < this.hotspots.length; i++) {
        r -= this.hotspots[i].strength;
        if (r <= 0) { hs = this.hotspots[i]; break; }
      }
      const sp = CFG.HOTSPOT_SPREAD;
      const margin = 35;
      const fx = clamp(hs.x + gaussRand() * sp, margin, this.w - margin);
      const fy = clamp(hs.y + gaussRand() * sp, margin, this.h - margin);

      // Reject if inside an obstacle
      let blocked = false;
      for (let i = 0; i < this.obstacles.length; i++) {
        const ob = this.obstacles[i];
        const dx = fx - ob.pos.x, dy = fy - ob.pos.y;
        if (dx * dx + dy * dy < ob.radius * ob.radius) { blocked = true; break; }
      }
      if (!blocked) return new Food(fx, fy, undefined, undefined, 0);
    }
    // Fallback: random position flora
    return new Food(rand(35, this.w - 35), rand(35, this.h - 35), undefined, undefined, 0);
  }

  // Spawn position biased by food type: near hotspot (flora) or obstacle (mineral)
  _dietSpawnPos() {
    const nearObs = this.obstacles.length > 0 && Math.random() < CFG.MINERAL_FOOD_RATIO;
    for (let attempt = 0; attempt < 15; attempt++) {
      let x, y;
      if (nearObs) {
        const ob = this.obstacles[randInt(0, this.obstacles.length)];
        const angle = Math.random() * Math.PI * 2;
        const dist = ob.radius + rand(20, 60);
        x = ob.pos.x + Math.cos(angle) * dist;
        y = ob.pos.y + Math.sin(angle) * dist;
      } else {
        const hs = this.hotspots[randInt(0, this.hotspots.length)];
        x = hs.x + gaussRand() * CFG.HOTSPOT_SPREAD;
        y = hs.y + gaussRand() * CFG.HOTSPOT_SPREAD;
      }
      x = clamp(x, 40, this.w - 40);
      y = clamp(y, 40, this.h - 40);
      let blocked = false;
      for (let j = 0; j < this.obstacles.length; j++) {
        if (this.obstacles[j].pos.dist({ x, y }) < this.obstacles[j].radius + 15) { blocked = true; break; }
      }
      if (!blocked) return { x, y };
    }
    return { x: rand(40, this.w - 40), y: rand(40, this.h - 40) };
  }

  spawnP(x, y, hue, count, speed, life, size) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= CFG.MAX_PARTICLES) break;
      const a = Math.random() * 6.283;
      const s = Math.random() * speed;
      this.particles.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, hue, life, size));
    }
  }

  get dayPhase() { return (Math.sin(this.tick * (2 * Math.PI / CFG.DAY_PERIOD)) + 1) * 0.5; }
  get seasonPhase() { return (Math.sin(this.tick * (2 * Math.PI / CFG.SEASON_PERIOD)) + 1) * 0.5; }

  update(audio) {
    if (this.paused) return;
    this.tick++;

    // Day/night affects food spawn rate
    const dayMul = 0.6 + this.dayPhase * 0.8; // 0.6 to 1.4

    // Seasonal cycle modulates food abundance
    const seasonMul = 0.7 + this.seasonPhase * 0.45; // 0.7 (winter) to 1.15 (summer)

    // Hotspot drift (faster in winter - resource instability)
    const driftRate = this.seasonPhase < 0.3 ? 2 : 3;
    if (this.tick % driftRate === 0)
      for (let i = 0; i < this.hotspots.length; i++) this.hotspots[i].drift(this.w, this.h);

    // Current zone drift
    if (this.tick % 5 === 0)
      for (let i = 0; i < this.currents.length; i++) this.currents[i].drift(this.w, this.h);

    // Pheromone diffusion
    if (this.tick % CFG.PH_DIFFUSE_INTERVAL === 0) this.phGrid.diffuseAndDecay();

    // Spawn food (modulated by day + season)
    if (this.food.length < CFG.MAX_FOOD && Math.random() < CFG.FOOD_SPAWN_RATE * dayMul * seasonMul)
      this.food.push(this._spawnFood());

    // Rebuild grids
    this.foodGrid.clear(); this.creatureGrid.clear();
    for (let i = 0; i < this.food.length; i++) this.foodGrid.insert(this.food[i]);
    for (let i = 0; i < this.creatures.length; i++) this.creatureGrid.insert(this.creatures[i]);

    const newborns = [];
    for (let i = 0; i < this.creatures.length; i++) {
      const c = this.creatures[i];
      if (!c.alive) continue;

      const inp = c.perceive(this.foodGrid, this.creatureGrid, this.obstacles, this.phGrid);
      c.think(inp);
      c.move(this.w, this.h, this.obstacles, this.currents);
      if (c.huntCooldown > 0) c.huntCooldown--;

      // Deposit species-scented pheromone at current position
      this.phGrid.deposit(c.pos.x, c.pos.y, CFG.PH_DEPOSIT, Math.floor(c.genes.hue / 30) % 12);

      // Energy sharing
      if (c.shareOut > 0.1 && c._ncRef && c._ncRef.alive && c._ncDist < CFG.SHARE_RANGE) {
        const give = Math.min(c.shareOut * CFG.SHARE_RATE, c.energy - 1);
        if (give > 0) {
          c.energy -= give;
          c._ncRef.energy = Math.min(c._ncRef.energy + give * CFG.SHARE_EFFICIENCY, CFG.ENERGY_MAX);
          if (this.tick % 8 === 0)
            this.spawnP((c.pos.x + c._ncRef.pos.x) / 2, (c.pos.y + c._ncRef.pos.y) / 2, 140, 1, 0.6, 12, 1);
        }
      }

      // Eat food
      const nf = this.foodGrid.query(c.pos.x, c.pos.y, c.radius + CFG.EAT_RANGE);
      for (let j = 0; j < nf.length; j++) {
        const f = nf[j];
        if (!f.alive) continue;
        if (c.pos.dist(f.pos) < c.radius + CFG.FOOD_RADIUS) {
          f.alive = false;
          // Diet affinity: corpse food (type null) is universal, typed food depends on diet gene
          let gainedEnergy = f.energy;
          if (f.type !== null) {
            const affinity = 1 - Math.abs(f.type - c.genes.diet);
            gainedEnergy *= CFG.DIET_MIN_AFFINITY + (1 - CFG.DIET_MIN_AFFINITY) * affinity;
          }
          c.energy = Math.min(c.energy + gainedEnergy, CFG.ENERGY_MAX);
          const eatHue = f.type === 1 ? 190 : 140; // cyan for mineral, green for flora
          this.spawnP(f.pos.x, f.pos.y, eatHue, 4, 1.5, 20, 1.5);
          audio.eatClick();
        }
      }

      // Predation (skip if on hunt cooldown)
      if (c.huntCooldown <= 0) {
        const nc = this.creatureGrid.query(c.pos.x, c.pos.y, c.radius * CFG.PREDATION_RANGE);
        for (let j = 0; j < nc.length; j++) {
          const prey = nc[j];
          if (prey.id === c.id || !prey.alive) continue;
          if (c.pos.dist(prey.pos) >= c.radius + prey.radius * CFG.PREDATION_STRIKE) continue;

          // Kin proximity defense: nearby kin make prey harder to eat
          let effectiveRatio = CFG.PREDATION_RATIO;
          const kinNearby = this.creatureGrid.query(prey.pos.x, prey.pos.y, CFG.KIN_DEFENSE_RANGE);
          let kinCount = 0;
          const preyBucket = Math.floor(prey.genes.hue / 30) % 12;
          for (let k = 0; k < kinNearby.length; k++) {
            const ally = kinNearby[k];
            if (ally.id === prey.id || ally.id === c.id || !ally.alive) continue;
            if (Math.floor(ally.genes.hue / 30) % 12 === preyBucket) kinCount++;
          }
          effectiveRatio += Math.min(kinCount * CFG.KIN_DEFENSE_PER_KIN, CFG.KIN_DEFENSE_MAX);

          if (c.radius > prey.radius * effectiveRatio) {
            prey.alive = false;
            c.energy = Math.min(c.energy + prey.energy * CFG.PREDATION_EFFICIENCY, CFG.ENERGY_MAX);
            this.spawnP(prey.pos.x, prey.pos.y, prey.genes.hue, 12, 2.5, 35, 2);
            this.deaths++;
            this.recentPredations++;
            this.eventLog.notifyPredation();
            audio.predationSweep();
            c.huntCooldown = CFG.HUNT_COOLDOWN;
            break; // one kill per tick per predator
          }
        }
      }

      // Reproduce
      if (c.energy > CFG.ENERGY_REPRODUCE && this.creatures.length + newborns.length < CFG.MAX_CREATURES) {
        // Check for willing mate nearby
        let mate = null;
        if (c.mateOut > CFG.MATE_THRESHOLD) {
          const mn = this.creatureGrid.query(c.pos.x, c.pos.y, CFG.MATE_RANGE);
          for (let j = 0; j < mn.length; j++) {
            const m = mn[j];
            if (m.id === c.id || !m.alive) continue;
            if (m.mateOut > CFG.MATE_THRESHOLD && m.energy > CFG.MATE_ENERGY_MIN && c.pos.dist(m.pos) < CFG.MATE_RANGE) {
              mate = m; break;
            }
          }
        }
        const child = c.reproduce(mate);
        newborns.push(child);
        this.births++;
        if (mate) this.sexualBirths++;
        if (child.generation > this.maxGen) this.maxGen = child.generation;
        this.spawnP(c.pos.x, c.pos.y, c.genes.hue, 8, 2, 28, 2);
        if (mate) this.spawnP(mate.pos.x, mate.pos.y, mate.genes.hue, 6, 2, 28, 2);
        audio.birthPing();
      }

      // Death
      if (c.energy <= 0) {
        c.alive = false; this.deaths++;
        // Drop corpse food colored by creature's hue (type null = universal, no diet penalty)
        if (this.food.length < CFG.MAX_FOOD + 50)
          this.food.push(new Food(c.pos.x, c.pos.y, c.genes.hue, c.genes.size * 15, null));
        this.spawnP(c.pos.x, c.pos.y, c.genes.hue, 10, 1.5, 38, 1.5);
        audio.deathThud();
      }
    }

    for (let i = 0; i < newborns.length; i++) this.creatures.push(newborns[i]);
    this.creatures = this.creatures.filter(c => c.alive);
    this.food = this.food.filter(f => f.alive);

    for (let i = 0; i < this.particles.length; i++) this.particles[i].update();
    this.particles = this.particles.filter(p => p.alive);

    // Deselect if dead
    if (this.selected && !this.selected.alive) this.selected = null;

    // Population floor - prevent extinction spirals
    const MIN_POP = 21;
    if (this.creatures.length < MIN_POP) {
      const needed = MIN_POP + 15 - this.creatures.length;
      // Sort survivors by energy - best adapted get to seed offspring
      const alive = this.creatures.filter(c => c.alive);
      alive.sort((a, b) => b.energy - a.energy);
      for (let i = 0; i < needed; i++) {
        // Spawn near food matching the creature's diet preference
        const spawnPos = this._dietSpawnPos();
        // 85% mutated offspring of best survivors, 15% random (genetic diversity)
        if (alive.length > 0 && Math.random() < 0.85) {
          const parent = alive[i % alive.length];
          const childBrainSize = Creature._mutateBrainSize(parent.genes.brainSize);
          const genes = {
            hue: (parent.genes.hue + rand(-CFG.HUE_MUTATION * 2, CFG.HUE_MUTATION * 2) + 360) % 360,
            size: clamp(parent.genes.size + rand(-0.12, 0.12), 0.5, 2.0),
            speedGene: clamp(parent.genes.speedGene + rand(-0.12, 0.12), 0.5, 2.0),
            brainSize: childBrainSize,
            senseRange: clamp(parent.genes.senseRange + rand(-CFG.SENSE_MUTATION * 2, CFG.SENSE_MUTATION * 2), CFG.SENSE_RANGE_MIN, CFG.SENSE_RANGE_MAX),
            diet: clamp(parent.genes.diet + rand(-CFG.DIET_MUTATION * 2, CFG.DIET_MUTATION * 2), 0, 1),
          };
          const brain = parent.brain.resized(childBrainSize);
          brain.mutate(CFG.MUTATION_RATE * 1.5, CFG.MUTATION_AMOUNT * 1.5);
          this.creatures.push(new Creature(spawnPos.x, spawnPos.y, genes, brain, parent.generation + 1));
        } else {
          this.creatures.push(Creature.createRandom(spawnPos.x, spawnPos.y));
        }
      }
    }

    if (this.tick % 10 === 0) {
      this.popHistory.push(this.creatures.length);
      if (this.popHistory.length > 600) this.popHistory.shift();
      this.speciesTracker.update(this.creatures, this.tick);
      // Trait averages for trait timeline
      const nc = this.creatures.length || 1;
      let tb = 0, ts = 0, tsz = 0, tsp = 0;
      for (let i = 0; i < this.creatures.length; i++) {
        const g = this.creatures[i].genes;
        tb += g.brainSize; ts += g.senseRange; tsz += g.size; tsp += g.speedGene;
      }
      this.traitHistory.push({ brain: tb / nc, sense: ts / nc, size: tsz / nc, speed: tsp / nc });
      if (this.traitHistory.length > 600) this.traitHistory.shift();
    }
    if (this.tick % 30 === 0) audio.setPopulation(this.creatures.length);
    if (this.tick % 60 === 0) {
      audio.setEcosystemState({
        population: this.creatures.length,
        speciesCount: this.countSpecies(),
        predationRate: this.recentPredations / 60,
        era: this.eventLog.era,
      });
      this.recentPredations = 0;
    }
    this.eventLog.check(this);
  }

  resize(w, h) {
    this.w = w; this.h = h;
    this.foodGrid = new SpatialGrid(w, h, CFG.GRID_CELL);
    this.creatureGrid = new SpatialGrid(w, h, CFG.GRID_CELL);
    this.phGrid.resize(w, h);
    this.phGrid.buildMask(this.obstacles);
  }

  countSpecies() {
    const b = new Set();
    for (let i = 0; i < this.creatures.length; i++) b.add(Math.floor(this.creatures[i].genes.hue / 30));
    return b.size;
  }

  oldestAge() {
    let max = 0;
    for (let i = 0; i < this.creatures.length; i++) if (this.creatures[i].age > max) max = this.creatures[i].age;
    return max;
  }

  creatureAt(x, y) {
    let best = null, bestD = 20; // max click distance
    for (let i = 0; i < this.creatures.length; i++) {
      const d = this.creatures[i].pos.dist({ x, y });
      if (d < bestD) { bestD = d; best = this.creatures[i]; }
    }
    return best;
  }
}
