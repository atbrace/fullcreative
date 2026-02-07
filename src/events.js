// ================================================================
//  EVENT LOG
// ================================================================
class EventLog {
  constructor() {
    this.events = [];           // {type, text, hue, time}
    this._prevBuckets = new Int32Array(12);
    this._prevPop = 0;
    this._prevSeason = '';
    this._predationCount = 0;
    this._lastPopTick = 0;
    this._lastGenMilestone = 0;
    this._cooldowns = {};
    this._ready = false;
  }

  _canFire(key) {
    const now = Date.now();
    if (this._cooldowns[key] && now - this._cooldowns[key] < 1500) return false;
    this._cooldowns[key] = now;
    return true;
  }

  add(type, text, hue) {
    this.events.push({ type, text, hue, time: Date.now() });
    if (this.events.length > 30) this.events.shift();
  }

  notifyPredation() { this._predationCount++; }

  check(world) {
    const tick = world.tick;

    // Predation spree check (every 120 ticks)
    if (tick % 120 === 0) {
      if (this._predationCount >= 5 && this._canFire('predation'))
        this.add('predation', 'predation spree - ' + this._predationCount + ' kills', 0);
      this._predationCount = 0;
    }

    if (tick % 10 !== 0) return;

    const tracker = world.speciesTracker;
    if (tracker.history.length < 2) return;

    // First run: snapshot state without firing events
    if (!this._ready) {
      const cur = tracker.getCurrent();
      for (let i = 0; i < cur.length; i++) this._prevBuckets[cur[i].b] = cur[i].count;
      this._prevPop = world.creatures.length;
      this._lastPopTick = tick;
      this._lastGenMilestone = world.maxGen;
      const sp = world.seasonPhase;
      this._prevSeason = sp > 0.75 ? 'summer' : sp > 0.5 ? 'spring' : sp > 0.25 ? 'autumn' : 'winter';
      this._ready = true;
      return;
    }

    // Build current species snapshot
    const cur = tracker.getCurrent();
    const counts = new Int32Array(12);
    const hues = new Float64Array(12);
    for (let i = 0; i < cur.length; i++) {
      counts[cur[i].b] = cur[i].count;
      hues[cur[i].b] = cur[i].hue;
    }

    // Species extinction (was >= 3, now 0)
    for (let b = 0; b < 12; b++) {
      if (this._prevBuckets[b] >= 3 && counts[b] === 0 && this._canFire('ext' + b))
        this.add('extinction', SPECIES_NAMES[b] + ' went extinct', b * 30 + 15);
    }

    // Species emergence (was 0, now >= 2)
    for (let b = 0; b < 12; b++) {
      if (this._prevBuckets[b] === 0 && counts[b] >= 2 && this._canFire('emg' + b))
        this.add('emergence', SPECIES_NAMES[b] + ' emerged', hues[b] || b * 30 + 15);
    }

    // Population boom/crash (every 100 ticks)
    const pop = world.creatures.length;
    if (tick - this._lastPopTick >= 100) {
      if (this._prevPop > 10) {
        const ratio = pop / this._prevPop;
        if (ratio > 1.5 && this._canFire('boom'))
          this.add('boom', 'population boom - ' + pop + ' creatures', 140);
        else if (ratio < 0.6 && this._canFire('bust'))
          this.add('bust', 'population crash - ' + pop + ' creatures', 0);
      }
      this._prevPop = pop;
      this._lastPopTick = tick;
    }

    // Season change
    const sp = world.seasonPhase;
    const sn = sp > 0.75 ? 'summer' : sp > 0.5 ? 'spring' : sp > 0.25 ? 'autumn' : 'winter';
    if (sn !== this._prevSeason) {
      const sh = { spring: 120, summer: 45, autumn: 25, winter: 210 };
      this.add('season', sn, sh[sn]);
    }
    this._prevSeason = sn;

    // Generation milestones
    const gen = world.maxGen;
    if (gen > this._lastGenMilestone) {
      const ms = [10, 25, 50, 100, 200, 500, 1000];
      for (let i = 0; i < ms.length; i++) {
        if (gen >= ms[i] && this._lastGenMilestone < ms[i]) {
          if (this._canFire('gen')) this.add('milestone', 'generation ' + ms[i], 55);
          this._lastGenMilestone = ms[i];
          break;
        }
      }
    }

    // Save state for next comparison
    for (let b = 0; b < 12; b++) this._prevBuckets[b] = counts[b];
  }

  getVisible() {
    const now = Date.now();
    const result = [];
    for (let i = this.events.length - 1; i >= 0 && result.length < 6; i--) {
      const e = this.events[i];
      const age = now - e.time;
      if (age > 8000) break;
      const fi = Math.min(1, age / 400);
      const fo = age > 5000 ? Math.max(0, 1 - (age - 5000) / 3000) : 1;
      e._opacity = fi * fo;
      if (e._opacity > 0.01) result.unshift(e);
    }
    return result;
  }
}
