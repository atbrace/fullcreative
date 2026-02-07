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
    r(this.wih, 2); r(this.bh, 0.5); r(this.who, 2); r(this.bo, 0.5);
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

  mutate(rate, amount) {
    const m = (a) => { for (let i = 0; i < a.length; i++) if (Math.random() < rate) a[i] += (Math.random() - 0.5) * 2 * amount; };
    m(this.wih); m(this.bh); m(this.who); m(this.bo);
  }

  static crossover(a, b) {
    const child = new Brain(a.ni, a.nh, a.no);
    const mix = (dst, sa, sb) => { for (let i = 0; i < dst.length; i++) dst[i] = Math.random() < 0.5 ? sa[i] : sb[i]; };
    mix(child.wih, a.wih, b.wih); mix(child.bh, a.bh, b.bh);
    mix(child.who, a.who, b.who); mix(child.bo, a.bo, b.bo);
    return child;
  }
}
