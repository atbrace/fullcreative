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
    this.popHistory = [];
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
      let x, y, ok;
      do {
        x = rand(40, this.w - 40); y = rand(40, this.h - 40); ok = true;
        for (let j = 0; j < this.obstacles.length; j++) {
          if (this.obstacles[j].pos.dist({ x, y }) < this.obstacles[j].radius + 15) { ok = false; break; }
        }
      } while (!ok);
      this.creatures.push(Creature.createRandom(x, y));
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
    // Weighted random hotspot
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
      const fx = clamp(hs.x + gaussRand() * sp, 8, this.w - 8);
      const fy = clamp(hs.y + gaussRand() * sp, 8, this.h - 8);

      // Reject if inside an obstacle
      let blocked = false;
      for (let i = 0; i < this.obstacles.length; i++) {
        const ob = this.obstacles[i];
        const dx = fx - ob.pos.x, dy = fy - ob.pos.y;
        if (dx * dx + dy * dy < ob.radius * ob.radius) { blocked = true; break; }
      }
      if (!blocked) return new Food(fx, fy);
    }
    // Fallback: random position
    return new Food(rand(8, this.w - 8), rand(8, this.h - 8));
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

      // Deposit pheromone at current position
      this.phGrid.deposit(c.pos.x, c.pos.y, CFG.PH_DEPOSIT);

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
          c.energy = Math.min(c.energy + f.energy, CFG.ENERGY_MAX);
          this.spawnP(f.pos.x, f.pos.y, 140, 4, 1.5, 20, 1.5);
          audio.eatClick();
        }
      }

      // Predation
      const nc = this.creatureGrid.query(c.pos.x, c.pos.y, c.radius * 2.5);
      for (let j = 0; j < nc.length; j++) {
        const prey = nc[j];
        if (prey.id === c.id || !prey.alive) continue;
        if (c.radius > prey.radius * CFG.PREDATION_RATIO && c.pos.dist(prey.pos) < c.radius + prey.radius * 0.5) {
          prey.alive = false;
          c.energy = Math.min(c.energy + prey.energy * CFG.PREDATION_EFFICIENCY, CFG.ENERGY_MAX);
          this.spawnP(prey.pos.x, prey.pos.y, prey.genes.hue, 12, 2.5, 35, 2);
          this.deaths++;
          this.eventLog.notifyPredation();
          audio.predationSweep();
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
        // Drop corpse food colored by creature's hue
        if (this.food.length < CFG.MAX_FOOD + 50)
          this.food.push(new Food(c.pos.x, c.pos.y, c.genes.hue, c.genes.size * 15));
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
    const MIN_POP = 18;
    if (this.creatures.length < MIN_POP) {
      const needed = MIN_POP + 15 - this.creatures.length;
      // Sort survivors by energy - best adapted get to seed offspring
      const alive = this.creatures.filter(c => c.alive);
      alive.sort((a, b) => b.energy - a.energy);
      for (let i = 0; i < needed; i++) {
        let x, y, ok;
        do {
          x = rand(40, this.w - 40); y = rand(40, this.h - 40); ok = true;
          for (let j = 0; j < this.obstacles.length; j++) {
            if (this.obstacles[j].pos.dist({ x, y }) < this.obstacles[j].radius + 15) { ok = false; break; }
          }
        } while (!ok);
        // 50% mutated offspring of best survivors, 50% random (genetic diversity)
        if (alive.length > 0 && Math.random() < 0.5) {
          const parent = alive[i % alive.length];
          const childBrainSize = Creature._mutateBrainSize(parent.genes.brainSize);
          const genes = {
            hue: (parent.genes.hue + rand(-CFG.HUE_MUTATION * 2, CFG.HUE_MUTATION * 2) + 360) % 360,
            size: clamp(parent.genes.size + rand(-0.12, 0.12), 0.5, 2.0),
            speedGene: clamp(parent.genes.speedGene + rand(-0.12, 0.12), 0.5, 2.0),
            brainSize: childBrainSize,
          };
          const brain = parent.brain.resized(childBrainSize);
          brain.mutate(CFG.MUTATION_RATE * 1.5, CFG.MUTATION_AMOUNT * 1.5);
          this.creatures.push(new Creature(x, y, genes, brain, parent.generation + 1));
        } else {
          this.creatures.push(Creature.createRandom(x, y));
        }
      }
    }

    if (this.tick % 10 === 0) {
      this.popHistory.push(this.creatures.length);
      if (this.popHistory.length > 600) this.popHistory.shift();
      this.speciesTracker.update(this.creatures, this.tick);
    }
    if (this.tick % 30 === 0) audio.setPopulation(this.creatures.length);
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
