// ================================================================
//  CREATURE
// ================================================================
let cidCounter = 0;

class Creature {
  constructor(x, y, genes, brain, generation) {
    this.id = cidCounter++;
    this.pos = new Vec2(x, y);
    this.heading = Math.random() * Math.PI * 2;
    this.speed = 0;
    this.signals = new Float32Array(CFG.SIGNAL_CHANNELS);
    this.genes = genes;
    this.brain = brain;
    this.generation = generation;
    this.energy = CFG.ENERGY_INITIAL;
    this.age = 0;
    this.alive = true;
    this.radius = CFG.BASE_RADIUS * this.genes.size;
    this.shareOut = 0;
    this.mateOut = 0;
    this.body = []; // trailing body positions
    this._nfPos = null; // nearest food position (for viz)
    this._ncPos = null; // nearest creature position (for viz)
    this._ncRef = null; // nearest creature reference (for sharing)
    this._ncDist = Infinity; // distance to nearest creature
  }

  static createRandom(x, y) {
    const genes = {
      hue: Math.random() * 360,
      size: rand(0.7, 1.4),
      speedGene: rand(0.7, 1.3),
      brainSize: CFG.BRAIN_HIDDEN,
    };
    return new Creature(x, y, genes, new Brain(CFG.BRAIN_INPUTS, CFG.BRAIN_HIDDEN, CFG.BRAIN_OUTPUTS).randomize(), 0);
  }

  // Mutate brain size by +/- 1 with small probability, clamped to range
  static _mutateBrainSize(parentSize) {
    if (Math.random() < CFG.BRAIN_SIZE_MUTATION_RATE) {
      const delta = Math.random() < 0.5 ? -1 : 1;
      return clamp(parentSize + delta, CFG.BRAIN_HIDDEN_MIN, CFG.BRAIN_HIDDEN_MAX);
    }
    return parentSize;
  }

  perceive(foodGrid, creatureGrid, obstacles, phGrid) {
    const vr = CFG.VISION_RANGE;
    const nSensory = CFG.BRAIN_INPUTS - CFG.BRAIN_RECURRENT;
    const inp = new Float32Array(nSensory);
    this._nfPos = null;
    this._ncPos = null;
    this._ncRef = null;
    this._ncDist = Infinity;

    // --- Nearest food ---
    let bfDist = Infinity, bfAngle = 0;
    const nf = foodGrid.query(this.pos.x, this.pos.y, vr);
    for (let i = 0; i < nf.length; i++) {
      const d = this.pos.dist(nf[i].pos);
      if (d < bfDist) { bfDist = d; bfAngle = Math.atan2(nf[i].pos.y - this.pos.y, nf[i].pos.x - this.pos.x); this._nfPos = nf[i].pos; }
    }
    if (bfDist < Infinity) {
      const ra = wrapAngle(bfAngle - this.heading);
      inp[0] = Math.sin(ra); inp[1] = Math.cos(ra); inp[2] = clamp(bfDist / vr, 0, 1);
    } else { inp[2] = 1; }

    // --- Nearest creature ---
    let bcDist = Infinity, bcAngle = 0, bcRelSize = 1, bcHue = 0;
    const nc = creatureGrid.query(this.pos.x, this.pos.y, vr);
    for (let i = 0; i < nc.length; i++) {
      if (nc[i].id === this.id) continue;
      const d = this.pos.dist(nc[i].pos);
      if (d < bcDist) {
        bcDist = d; bcAngle = Math.atan2(nc[i].pos.y - this.pos.y, nc[i].pos.x - this.pos.x);
        bcRelSize = nc[i].radius / this.radius; this._ncPos = nc[i].pos;
        this._ncRef = nc[i]; this._ncDist = d;
        bcHue = nc[i].genes.hue;
      }
    }
    if (bcDist < Infinity) {
      const ra = wrapAngle(bcAngle - this.heading);
      inp[3] = Math.sin(ra); inp[4] = Math.cos(ra); inp[5] = clamp(bcDist / vr, 0, 1);
      inp[6] = clamp(bcRelSize - 1, -1, 1);
      // Kin recognition: hue similarity (+1 = same hue, -1 = opposite)
      const hueDiff = Math.min(Math.abs(this.genes.hue - bcHue), 360 - Math.abs(this.genes.hue - bcHue));
      inp[18] = 1 - 2 * (hueDiff / 180);
    } else { inp[5] = 1; }

    // --- Nearest signaling creature per channel ---
    const nCh = CFG.SIGNAL_CHANNELS;
    const bsDist = new Float32Array(nCh).fill(Infinity);
    const bsAngle = new Float32Array(nCh);
    const bsSig = new Float32Array(nCh);
    for (let i = 0; i < nc.length; i++) {
      if (nc[i].id === this.id) continue;
      const d = this.pos.dist(nc[i].pos);
      const a = Math.atan2(nc[i].pos.y - this.pos.y, nc[i].pos.x - this.pos.x);
      for (let ch = 0; ch < nCh; ch++) {
        if (nc[i].signals[ch] < 0.15 || d >= bsDist[ch]) continue;
        bsDist[ch] = d; bsAngle[ch] = a; bsSig[ch] = nc[i].signals[ch];
      }
    }
    for (let ch = 0; ch < nCh; ch++) {
      const base = 7 + ch * 3;
      if (bsDist[ch] < Infinity) {
        const ra = wrapAngle(bsAngle[ch] - this.heading);
        inp[base] = Math.sin(ra); inp[base + 1] = Math.cos(ra); inp[base + 2] = clamp(bsSig[ch], 0, 1);
      }
    }

    // --- Nearest obstacle (surface distance) ---
    let boDist = Infinity, boAngle = 0;
    for (let i = 0; i < obstacles.length; i++) {
      const ob = obstacles[i];
      const dx = ob.pos.x - this.pos.x, dy = ob.pos.y - this.pos.y;
      const cd = Math.sqrt(dx * dx + dy * dy);
      const sd = cd - ob.radius; // surface distance
      if (sd < vr && sd < boDist) {
        boDist = sd; boAngle = Math.atan2(dy, dx);
      }
    }
    if (boDist < Infinity) {
      const ra = wrapAngle(boAngle - this.heading);
      inp[19] = Math.sin(ra); inp[20] = Math.cos(ra); inp[21] = clamp(boDist / vr, 0, 1);
    } else { inp[21] = 1; }

    // --- Pheromone gradient ---
    const phg = phGrid.gradient(this.pos.x, this.pos.y);
    const phMag = Math.sqrt(phg.dx * phg.dx + phg.dy * phg.dy);
    if (phMag > 0.001) {
      const phAngle = Math.atan2(phg.dy, phg.dx);
      const ra = wrapAngle(phAngle - this.heading);
      inp[22] = Math.sin(ra); inp[23] = Math.cos(ra);
    }
    inp[24] = clamp(phg.val / CFG.PH_MAX_VIZ, 0, 1);

    inp[16] = clamp(this.energy / CFG.ENERGY_MAX, 0, 1);
    inp[17] = 1; // bias
    return inp;
  }

  think(inputs) {
    const out = this.brain.forward(inputs);
    this.heading = wrapAngle(this.heading + out[0] * CFG.TURN_RATE);
    this.speed = clamp((out[1] + 1) * 0.5 * CFG.BASE_SPEED * this.genes.speedGene, 0, CFG.MAX_SPEED);
    for (let ch = 0; ch < CFG.SIGNAL_CHANNELS; ch++)
      this.signals[ch] = (out[2 + ch] + 1) * 0.5; // 0..1
    this.shareOut = (out[5] + 1) * 0.5; // 0..1
    this.mateOut = (out[6] + 1) * 0.5;  // 0..1
  }

  move(W, H, obstacles, currents) {
    // Store body trail (push before moving)
    this.body.push({ x: this.pos.x, y: this.pos.y });
    if (this.body.length > CFG.BODY_SEGMENTS) this.body.shift();

    this.pos.x += Math.cos(this.heading) * this.speed;
    this.pos.y += Math.sin(this.heading) * this.speed;

    // Current zone drift
    for (let i = 0; i < currents.length; i++) {
      const cz = currents[i];
      const dx = this.pos.x - cz.pos.x, dy = this.pos.y - cz.pos.y;
      const d2 = dx * dx + dy * dy;
      const r2 = cz.radius * cz.radius;
      if (d2 < r2) {
        const falloff = 1 - Math.sqrt(d2) / cz.radius;
        const force = cz.strength * falloff * falloff;
        this.pos.x += Math.cos(cz.angle) * force;
        this.pos.y += Math.sin(cz.angle) * force;
      }
    }

    const r = this.radius;
    if (this.pos.x < r) { this.pos.x = r; this.heading = Math.PI - this.heading + rand(-0.3, 0.3); }
    if (this.pos.x > W - r) { this.pos.x = W - r; this.heading = Math.PI - this.heading + rand(-0.3, 0.3); }
    if (this.pos.y < r) { this.pos.y = r; this.heading = -this.heading + rand(-0.3, 0.3); }
    if (this.pos.y > H - r) { this.pos.y = H - r; this.heading = -this.heading + rand(-0.3, 0.3); }

    // Soft wall repulsion - steer heading away from nearby walls
    const WR = 30;
    let wpx = 0, wpy = 0;
    if (this.pos.x < r + WR) wpx = 1 - (this.pos.x - r) / WR;
    if (this.pos.x > W - r - WR) wpx = -(1 - (W - r - this.pos.x) / WR);
    if (this.pos.y < r + WR) wpy = 1 - (this.pos.y - r) / WR;
    if (this.pos.y > H - r - WR) wpy = -(1 - (H - r - this.pos.y) / WR);
    if (wpx !== 0 || wpy !== 0) {
      const pushAngle = Math.atan2(wpy, wpx);
      this.heading += wrapAngle(pushAngle - this.heading) * 0.08;
    }

    // Obstacle collision
    for (let i = 0; i < obstacles.length; i++) {
      const ob = obstacles[i];
      const dx = this.pos.x - ob.pos.x, dy = this.pos.y - ob.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = ob.radius + r;
      if (dist < minDist && dist > 0) {
        // Push out to surface
        const nx = dx / dist, ny = dy / dist;
        this.pos.x = ob.pos.x + nx * minDist;
        this.pos.y = ob.pos.y + ny * minDist;
        // Reflect heading if moving toward obstacle
        const dot = Math.cos(this.heading) * nx + Math.sin(this.heading) * ny;
        if (dot < 0) {
          // Reflect: h = h - 2*(h.n)*n
          const hx = Math.cos(this.heading) - 2 * dot * nx;
          const hy = Math.sin(this.heading) - 2 * dot * ny;
          this.heading = Math.atan2(hy, hx);
        }
      }
    }

    this.heading = wrapAngle(this.heading);

    const sizeCost = Math.pow(this.genes.size, CFG.METABOLISM_SIZE_EXP);
    const brainCost = this.genes.brainSize * CFG.METABOLISM_BRAIN_FACTOR;
    this.energy -= (CFG.METABOLISM_BASE * sizeCost + this.speed * CFG.METABOLISM_SPEED_FACTOR + brainCost);
    this.age++;
  }

  reproduce(mate) {
    let cg, cb, gen;
    if (mate) {
      // Sexual reproduction: crossover genes and brain
      const childBrainSize = Creature._mutateBrainSize(
        Math.random() < 0.5 ? this.genes.brainSize : mate.genes.brainSize
      );
      cg = {
        hue: ((Math.random() < 0.5 ? this.genes.hue : mate.genes.hue) + rand(-CFG.HUE_MUTATION, CFG.HUE_MUTATION) + 360) % 360,
        size: clamp((this.genes.size + mate.genes.size) / 2 + rand(-0.08, 0.08), 0.5, 2.0),
        speedGene: clamp((this.genes.speedGene + mate.genes.speedGene) / 2 + rand(-0.08, 0.08), 0.5, 2.0),
        brainSize: childBrainSize,
      };
      cb = Brain.crossover(this.brain, mate.brain, childBrainSize);
      cb.mutate(CFG.MUTATION_RATE, CFG.MUTATION_AMOUNT);
      mate.energy *= 0.85; // mate pays 15% energy cost
      gen = Math.max(this.generation, mate.generation) + 1;
    } else {
      // Asexual reproduction: clone + mutate, possibly resize
      const childBrainSize = Creature._mutateBrainSize(this.genes.brainSize);
      cg = {
        hue: (this.genes.hue + rand(-CFG.HUE_MUTATION, CFG.HUE_MUTATION) + 360) % 360,
        size: clamp(this.genes.size + rand(-0.08, 0.08), 0.5, 2.0),
        speedGene: clamp(this.genes.speedGene + rand(-0.08, 0.08), 0.5, 2.0),
        brainSize: childBrainSize,
      };
      cb = this.brain.resized(childBrainSize);
      cb.mutate(CFG.MUTATION_RATE, CFG.MUTATION_AMOUNT);
      gen = this.generation + 1;
    }
    const tot = this.energy;
    this.energy = tot * CFG.REPRODUCE_KEEP;
    const child = new Creature(this.pos.x + rand(-10, 10), this.pos.y + rand(-10, 10), cg, cb, gen);
    child.energy = tot * CFG.REPRODUCE_GIVE;
    child.heading = this.heading + rand(-1, 1);
    return child;
  }
}
