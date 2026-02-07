// ================================================================
//  PHEROMONE GRID (Species-scented)
//  12-layer grid: one layer per species hue bucket. Creatures deposit
//  to their own species layer. Brain perceives kin vs foreign trails.
// ================================================================
class PheromoneGrid {
  constructor(w, h) {
    this.cellSize = CFG.PH_CELL;
    this.cols = Math.ceil(w / this.cellSize);
    this.rows = Math.ceil(h / this.cellSize);
    const n = this.cols * this.rows;
    this.data = new Float32Array(n);            // total pheromone (sum of species)
    this.speciesData = new Float32Array(n * 12); // per-species concentration
    this.speciesBuf = new Float32Array(n * 12);  // double buffer for diffusion
    this.mask = new Uint8Array(n);               // 1 = blocked (obstacle)
    // Offscreen canvas for rendering
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.cols;
    this.canvas.height = this.rows;
    this.imgCtx = this.canvas.getContext('2d');
    this.imgData = this.imgCtx.createImageData(this.cols, this.rows);
  }

  buildMask(obstacles) {
    this.mask.fill(0);
    const cs = this.cellSize;
    for (let r = 0; r < this.rows; r++) {
      const cy = (r + 0.5) * cs;
      for (let c = 0; c < this.cols; c++) {
        const cx = (c + 0.5) * cs;
        for (let i = 0; i < obstacles.length; i++) {
          const ob = obstacles[i];
          const dx = cx - ob.pos.x, dy = cy - ob.pos.y;
          if (dx * dx + dy * dy < ob.radius * ob.radius) {
            this.mask[r * this.cols + c] = 1;
            break;
          }
        }
      }
    }
  }

  deposit(x, y, amount, bucket) {
    const c = Math.floor(x / this.cellSize);
    const r = Math.floor(y / this.cellSize);
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return;
    const idx = r * this.cols + c;
    if (!this.mask[idx]) {
      this.data[idx] += amount;
      this.speciesData[idx * 12 + bucket] += amount;
    }
  }

  diffuseAndDecay() {
    const cols = this.cols, rows = this.rows;
    const d = CFG.PH_DIFFUSE;
    const keep = 1 - d;
    const spread = d * 0.25; // split among 4 neighbors
    const decay = CFG.PH_DECAY;
    const src = this.speciesData, dst = this.speciesBuf, mask = this.mask;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const si = idx * 12;
        if (mask[idx]) {
          for (let s = 0; s < 12; s++) dst[si + s] = 0;
          this.data[idx] = 0;
          continue;
        }
        let total = 0;
        for (let s = 0; s < 12; s++) {
          let val = src[si + s] * keep;
          if (r > 0 && !mask[(r - 1) * cols + c])
            val += src[((r - 1) * cols + c) * 12 + s] * spread;
          if (r < rows - 1 && !mask[(r + 1) * cols + c])
            val += src[((r + 1) * cols + c) * 12 + s] * spread;
          if (c > 0 && !mask[r * cols + c - 1])
            val += src[(r * cols + c - 1) * 12 + s] * spread;
          if (c < cols - 1 && !mask[r * cols + c + 1])
            val += src[(r * cols + c + 1) * 12 + s] * spread;
          val *= decay;
          dst[si + s] = val;
          total += val;
        }
        this.data[idx] = total;
      }
    }

    // Swap species buffers
    this.speciesData = dst;
    this.speciesBuf = src;
  }

  speciesGradient(x, y, bucket) {
    const c = Math.floor(x / this.cellSize);
    const r = Math.floor(y / this.cellSize);
    if (c < 1 || c >= this.cols - 1 || r < 1 || r >= this.rows - 1)
      return { kinDx: 0, kinDy: 0, kinVal: 0, forDx: 0, forDy: 0, forVal: 0 };

    const data = this.data, sd = this.speciesData, cols = this.cols;
    const idx = r * cols + c;

    // Total gradient
    const tgx = (data[idx + 1] - data[idx - 1]) * 0.5;
    const tgy = (data[idx + cols] - data[idx - cols]) * 0.5;

    // Kin gradient (single species layer)
    const kgx = (sd[(idx + 1) * 12 + bucket] - sd[(idx - 1) * 12 + bucket]) * 0.5;
    const kgy = (sd[(idx + cols) * 12 + bucket] - sd[(idx - cols) * 12 + bucket]) * 0.5;
    const kval = sd[idx * 12 + bucket];

    // Foreign = total - kin
    return {
      kinDx: kgx, kinDy: kgy, kinVal: kval,
      forDx: tgx - kgx, forDy: tgy - kgy, forVal: Math.max(0, data[idx] - kval)
    };
  }

  // Find dominant species bucket for a cell (for rendering)
  dominantSpecies(idx) {
    const si = idx * 12;
    const sd = this.speciesData;
    let best = 0, bestVal = 0;
    for (let s = 0; s < 12; s++) {
      if (sd[si + s] > bestVal) { bestVal = sd[si + s]; best = s; }
    }
    return best;
  }

  resize(w, h) {
    this.cols = Math.ceil(w / this.cellSize);
    this.rows = Math.ceil(h / this.cellSize);
    const n = this.cols * this.rows;
    this.data = new Float32Array(n);
    this.speciesData = new Float32Array(n * 12);
    this.speciesBuf = new Float32Array(n * 12);
    this.mask = new Uint8Array(n);
    this.canvas.width = this.cols;
    this.canvas.height = this.rows;
    this.imgCtx = this.canvas.getContext('2d');
    this.imgData = this.imgCtx.createImageData(this.cols, this.rows);
  }
}
