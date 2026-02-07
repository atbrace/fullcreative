// ================================================================
//  NEURAL NETWORK
// ================================================================
class Brain {
  constructor(ni, nh, no) {
    this.ni = ni; this.nh = nh; this.no = no;
    this.wih = new Float32Array(ni * nh);
    this.bh  = new Float32Array(nh);
    this.who = new Float32Array(nh * no);
    this.bo  = new Float32Array(no);
    this.lastInput  = new Float32Array(ni);
    this.lastHidden = new Float32Array(nh);
    this.lastOutput = new Float32Array(no);
    this.memory = new Float32Array(CFG.BRAIN_RECURRENT);
  }

  randomize() {
    const r = (a, s) => { for (let i = 0; i < a.length; i++) a[i] = (Math.random() - 0.5) * s; };
    // Xavier/Glorot initialization: scale = 2*sqrt(6/(fan_in+fan_out))
    // Prevents tanh saturation with high-dimensional inputs (32 inputs)
    const wihScale = 2 * Math.sqrt(6 / (this.ni + this.nh));
    const whoScale = 2 * Math.sqrt(6 / (this.nh + this.no));
    r(this.wih, wihScale); r(this.bh, 0.5); r(this.who, whoScale); r(this.bo, 0.5);
    return this;
  }

  forward(sensory) {
    // Build full input: sensory inputs + recurrent memory
    const full = this.lastInput;
    for (let i = 0; i < sensory.length; i++) full[i] = sensory[i];
    for (let i = 0; i < CFG.BRAIN_RECURRENT; i++) full[sensory.length + i] = this.memory[i];
    const h = this.lastHidden;
    for (let j = 0; j < this.nh; j++) {
      let s = this.bh[j];
      for (let i = 0; i < this.ni; i++) s += full[i] * this.wih[i * this.nh + j];
      h[j] = Math.tanh(s);
    }
    // Feed first hidden neurons back as memory for next tick
    for (let i = 0; i < CFG.BRAIN_RECURRENT; i++) this.memory[i] = h[i];
    const o = this.lastOutput;
    for (let k = 0; k < this.no; k++) {
      let s = this.bo[k];
      for (let j = 0; j < this.nh; j++) s += h[j] * this.who[j * this.no + k];
      o[k] = Math.tanh(s);
    }
    return o;
  }

  clone() {
    const b = new Brain(this.ni, this.nh, this.no);
    b.wih.set(this.wih); b.bh.set(this.bh);
    b.who.set(this.who); b.bo.set(this.bo);
    b.memory.fill(0); // clean slate - memory not inherited
    return b;
  }

  // Return a new brain with a different number of hidden neurons.
  // Shared neurons keep their weights; new neurons get small random init.
  resized(newNh) {
    if (newNh === this.nh) return this.clone();
    const b = new Brain(this.ni, newNh, this.no);
    const shared = Math.min(this.nh, newNh);
    // wih: layout is [input_i * nh + hidden_j]
    for (let i = 0; i < this.ni; i++) {
      for (let j = 0; j < shared; j++) {
        b.wih[i * newNh + j] = this.wih[i * this.nh + j];
      }
      // New neurons get small random weights
      for (let j = shared; j < newNh; j++) {
        b.wih[i * newNh + j] = (Math.random() - 0.5) * 0.5;
      }
    }
    // bh
    for (let j = 0; j < shared; j++) b.bh[j] = this.bh[j];
    for (let j = shared; j < newNh; j++) b.bh[j] = (Math.random() - 0.5) * 0.2;
    // who: layout is [hidden_j * no + output_k]
    for (let j = 0; j < shared; j++) {
      for (let k = 0; k < this.no; k++) {
        b.who[j * this.no + k] = this.who[j * this.no + k];
      }
    }
    for (let j = shared; j < newNh; j++) {
      for (let k = 0; k < this.no; k++) {
        b.who[j * this.no + k] = (Math.random() - 0.5) * 0.5;
      }
    }
    // bo: doesn't depend on nh
    b.bo.set(this.bo);
    b.memory.fill(0);
    return b;
  }

  mutate(rate, amount) {
    const m = (a) => { for (let i = 0; i < a.length; i++) if (Math.random() < rate) a[i] += (Math.random() - 0.5) * 2 * amount; };
    m(this.wih); m(this.bh); m(this.who); m(this.bo);
  }

  toJSON() {
    return {
      ni: this.ni, nh: this.nh, no: this.no,
      wih: Array.from(this.wih), bh: Array.from(this.bh),
      who: Array.from(this.who), bo: Array.from(this.bo),
    };
  }

  static fromJSON(d) {
    const b = new Brain(d.ni, d.nh, d.no);
    b.wih.set(d.wih); b.bh.set(d.bh);
    b.who.set(d.who); b.bo.set(d.bo);
    b.memory.fill(0);
    return b;
  }

  // Crossover two brains into a child with targetNh hidden neurons.
  // For shared neurons (index < min(a.nh, b.nh)): uniform crossover.
  // For neurons only one parent has: copy from that parent.
  // For neurons beyond both parents: small random init.
  static crossover(a, b, targetNh) {
    if (targetNh === undefined) targetNh = a.nh; // backward compat
    const child = new Brain(a.ni, targetNh, a.no);
    const minNh = Math.min(a.nh, b.nh);
    const maxNh = Math.max(a.nh, b.nh);
    const bigger = a.nh >= b.nh ? a : b;

    // wih: [input_i * nh + hidden_j]
    for (let i = 0; i < a.ni; i++) {
      for (let j = 0; j < targetNh; j++) {
        if (j < minNh) {
          // Both parents have this neuron - uniform crossover
          child.wih[i * targetNh + j] = Math.random() < 0.5
            ? a.wih[i * a.nh + j]
            : b.wih[i * b.nh + j];
        } else if (j < maxNh) {
          // Only one parent has this neuron - copy from the bigger
          child.wih[i * targetNh + j] = bigger.wih[i * bigger.nh + j];
        } else {
          // Beyond both parents - small random
          child.wih[i * targetNh + j] = (Math.random() - 0.5) * 0.5;
        }
      }
    }

    // bh
    for (let j = 0; j < targetNh; j++) {
      if (j < minNh) {
        child.bh[j] = Math.random() < 0.5 ? a.bh[j] : b.bh[j];
      } else if (j < maxNh) {
        child.bh[j] = bigger.bh[j];
      } else {
        child.bh[j] = (Math.random() - 0.5) * 0.2;
      }
    }

    // who: [hidden_j * no + output_k]
    for (let j = 0; j < targetNh; j++) {
      for (let k = 0; k < a.no; k++) {
        if (j < minNh) {
          child.who[j * a.no + k] = Math.random() < 0.5
            ? a.who[j * a.no + k]
            : b.who[j * b.no + k];
        } else if (j < maxNh) {
          child.who[j * a.no + k] = bigger.who[j * bigger.no + k];
        } else {
          child.who[j * a.no + k] = (Math.random() - 0.5) * 0.5;
        }
      }
    }

    // bo: uniform crossover (doesn't depend on nh)
    for (let k = 0; k < a.no; k++) {
      child.bo[k] = Math.random() < 0.5 ? a.bo[k] : b.bo[k];
    }

    return child;
  }
}
