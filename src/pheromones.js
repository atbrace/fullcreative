// ================================================================
//  PHEROMONE GRID
// ================================================================
class PheromoneGrid {
  constructor(w, h) {
    this.cellSize = CFG.PH_CELL;
    this.cols = Math.ceil(w / this.cellSize);
    this.rows = Math.ceil(h / this.cellSize);
    const n = this.cols * this.rows;
    this.data = new Float32Array(n);
    this.buf = new Float32Array(n);
    this.mask = new Uint8Array(n); // 1 = blocked (obstacle)
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

  deposit(x, y, amount) {
    const c = Math.floor(x / this.cellSize);
    const r = Math.floor(y / this.cellSize);
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return;
    const idx = r * this.cols + c;
    if (!this.mask[idx]) this.data[idx] += amount;
  }

  diffuseAndDecay() {
    const cols = this.cols, rows = this.rows;
    const d = CFG.PH_DIFFUSE;
    const keep = 1 - d;
    const spread = d * 0.25; // split among 4 neighbors
    const decay = CFG.PH_DECAY;
    const src = this.data, dst = this.buf, mask = this.mask;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (mask[idx]) { dst[idx] = 0; continue; }
        let val = src[idx] * keep;
        // Add diffusion from neighbors
        if (r > 0 && !mask[(r - 1) * cols + c]) val += src[(r - 1) * cols + c] * spread;
        if (r < rows - 1 && !mask[(r + 1) * cols + c]) val += src[(r + 1) * cols + c] * spread;
        if (c > 0 && !mask[r * cols + c - 1]) val += src[r * cols + c - 1] * spread;
        if (c < cols - 1 && !mask[r * cols + c + 1]) val += src[r * cols + c + 1] * spread;
        dst[idx] = val * decay;
      }
    }

    // Swap buffers
    this.data = dst;
    this.buf = src;
  }

  gradient(x, y) {
    const c = Math.floor(x / this.cellSize);
    const r = Math.floor(y / this.cellSize);
    if (c < 1 || c >= this.cols - 1 || r < 1 || r >= this.rows - 1)
      return { dx: 0, dy: 0, val: 0 };
    const data = this.data, cols = this.cols;
    const idx = r * cols + c;
    const gx = (data[idx + 1] - data[idx - 1]) * 0.5;
    const gy = (data[idx + cols] - data[idx - cols]) * 0.5;
    return { dx: gx, dy: gy, val: data[idx] };
  }

  resize(w, h) {
    this.cols = Math.ceil(w / this.cellSize);
    this.rows = Math.ceil(h / this.cellSize);
    const n = this.cols * this.rows;
    this.data = new Float32Array(n);
    this.buf = new Float32Array(n);
    this.mask = new Uint8Array(n);
    this.canvas.width = this.cols;
    this.canvas.height = this.rows;
    this.imgCtx = this.canvas.getContext('2d');
    this.imgData = this.imgCtx.createImageData(this.cols, this.rows);
  }
}
