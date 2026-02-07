// ================================================================
//  SPATIAL GRID
// ================================================================
class SpatialGrid {
  constructor(w, h, cell) {
    this.cell = cell;
    this.cols = Math.ceil(w / cell);
    this.rows = Math.ceil(h / cell);
    this.data = new Array(this.cols * this.rows);
    this.clear();
  }
  clear() { for (let i = 0; i < this.data.length; i++) this.data[i] = []; }
  insert(e) {
    const c = Math.floor(e.pos.x / this.cell), r = Math.floor(e.pos.y / this.cell);
    if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) this.data[r * this.cols + c].push(e);
  }
  query(x, y, radius) {
    const res = [];
    const c0 = Math.max(0, Math.floor((x - radius) / this.cell));
    const c1 = Math.min(this.cols - 1, Math.floor((x + radius) / this.cell));
    const r0 = Math.max(0, Math.floor((y - radius) / this.cell));
    const r1 = Math.min(this.rows - 1, Math.floor((y + radius) / this.cell));
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) {
        const cell = this.data[r * this.cols + c];
        for (let i = 0; i < cell.length; i++) res.push(cell[i]);
      }
    return res;
  }
}

// ================================================================
//  PARTICLE
// ================================================================
class Particle {
  constructor(x, y, vx, vy, hue, life, size) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.hue = hue; this.maxLife = life; this.life = life; this.size = size;
  }
  update() { this.x += this.vx; this.y += this.vy; this.vx *= 0.96; this.vy *= 0.96; this.life--; }
  get alive() { return this.life > 0; }
  get alpha() { return this.life / this.maxLife; }
}

// ================================================================
//  NUTRIENT HOTSPOT
// ================================================================
class Hotspot {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.strength = rand(0.6, 1.0);
  }
  drift(W, H) {
    this.vx += (Math.random() - 0.5) * 0.03;
    this.vy += (Math.random() - 0.5) * 0.03;
    this.vx *= 0.995; this.vy *= 0.995;
    this.x = clamp(this.x + this.vx, 60, W - 60);
    this.y = clamp(this.y + this.vy, 60, H - 60);
  }
}

// ================================================================
//  FOOD
// ================================================================
class Food {
  constructor(x, y, hue, energy, type) {
    this.pos = new Vec2(x, y); this.alive = true; this.pulse = Math.random() * 6.28;
    this.hue = hue !== undefined ? hue : null;
    this.energy = energy || CFG.FOOD_ENERGY;
    // type: 0=flora, 1=mineral, null=corpse (universal, no diet penalty)
    this.type = type !== undefined ? type : 0;
  }
}

// ================================================================
//  OBSTACLE
// ================================================================
class Obstacle {
  constructor(x, y, radius) {
    this.pos = new Vec2(x, y);
    this.radius = radius;
  }
}

// ================================================================
//  CURRENT ZONE (drift force)
// ================================================================
class CurrentZone {
  constructor(x, y, angle, strength, radius) {
    this.pos = new Vec2(x, y);
    this.angle = angle;
    this.strength = strength;
    this.radius = radius;
    this.rotSpeed = rand(-0.0004, 0.0004);
    this.vx = 0; this.vy = 0;
  }
  drift(W, H) {
    this.vx += (Math.random() - 0.5) * 0.015;
    this.vy += (Math.random() - 0.5) * 0.015;
    this.vx *= 0.997; this.vy *= 0.997;
    this.pos.x = clamp(this.pos.x + this.vx, 80, W - 80);
    this.pos.y = clamp(this.pos.y + this.vy, 80, H - 80);
    this.angle += this.rotSpeed;
  }
}
