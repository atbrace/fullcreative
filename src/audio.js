// ================================================================
//  AUDIO ENGINE
// ================================================================
class AudioEngine {
  constructor() { this.ctx = null; this.started = false; this.muted = false; this._pings = 0; }

  start() {
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.25;
    this.master.connect(this.ctx.destination);

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass'; this.filter.frequency.value = 280; this.filter.Q.value = 0.8;
    this.filter.connect(this.master);

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0.06;
    this.droneGain.connect(this.filter);

    this._osc(55, 'sine', this.droneGain, 1);
    this._osc(55.4, 'sine', this.droneGain, 1);
    this._osc(82.5, 'sine', this.droneGain, 0.45);
    this._osc(110, 'sine', this.droneGain, 0.2);

    const lfo = this.ctx.createOscillator();
    const lg = this.ctx.createGain();
    lfo.type = 'sine'; lfo.frequency.value = 0.06; lg.gain.value = 90;
    lfo.connect(lg); lg.connect(this.filter.frequency); lfo.start();
    this.started = true;
  }

  _osc(freq, type, dest, gv) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = gv;
    o.connect(g); g.connect(dest); o.start(); return o;
  }

  birthPing() {
    if (!this.started || this.muted || this._pings > 8) return;
    this._pings++;
    const notes = [261.63, 311.13, 349.23, 392.00, 466.16, 523.25, 622.25];
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.value = notes[randInt(0, notes.length)];
    g.gain.setValueAtTime(0.035, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    o.connect(g); g.connect(this.master); o.start(now); o.stop(now + 2);
    o.onended = () => { this._pings--; };
  }

  eatClick() {
    if (!this.started || this.muted) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.value = rand(1200, 2400);
    g.gain.setValueAtTime(0.012, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    o.connect(g); g.connect(this.master); o.start(now); o.stop(now + 0.12);
  }

  deathThud() {
    if (!this.started || this.muted) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.value = rand(35, 70);
    g.gain.setValueAtTime(0.025, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    o.connect(g); g.connect(this.filter); o.start(now); o.stop(now + 0.3);
  }

  predationSweep() {
    if (!this.started || this.muted) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(180, now);
    o.frequency.exponentialRampToValueAtTime(55, now + 0.18);
    g.gain.setValueAtTime(0.018, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    o.connect(g); g.connect(this.filter); o.start(now); o.stop(now + 0.28);
  }

  setPopulation(pop) {
    if (!this.started) return;
    const v = clamp(Math.sqrt(pop / 80) * 0.065, 0.02, 0.14);
    this.droneGain.gain.setTargetAtTime(v, this.ctx.currentTime, 1.0);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (!this.started) return;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.25, this.ctx.currentTime, 0.15);
  }
}
