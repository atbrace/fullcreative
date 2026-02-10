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

    // Era detection state
    this.era = '';              // current era name
    this.eraHue = 0;           // current era color hue
    this._eraWindow = [];      // sliding window of snapshots
    this._eraDeaths = 0;       // deaths in current window period
    this._eraPredKills = 0;    // predation kills in current window period
    this._prevDeaths = 0;      // deaths at last era sample
    this._prevPredKills = 0;   // predation kills at last era sample
    this._eraHoldTicks = 0;    // ticks remaining to hold current era before change
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

    // --- Era detection (every 60 ticks = ~1 second) ---
    if (tick % 60 === 0) this._updateEra(world, counts, hues);
  }

  _updateEra(world, counts, hues) {
    // Sample current state
    const pop = world.creatures.length;
    const n = pop || 1;
    let totalSize = 0, totalSpeed = 0, totalBrain = 0, totalSense = 0;
    for (let i = 0; i < world.creatures.length; i++) {
      const g = world.creatures[i].genes;
      totalSize += g.size;
      totalSpeed += g.speedGene;
      totalBrain += g.brainSize;
      totalSense += g.senseRange;
    }

    // Predation rate: use delta since last sample
    const deaths = world.deaths - this._prevDeaths;
    const predKills = this._eraPredKills - this._prevPredKills + (world.deaths > this._prevDeaths ? 0 : 0);
    // Track via the notifyPredation counter
    const windowDeaths = world.deaths - this._prevDeaths;
    this._prevDeaths = world.deaths;

    // Count species with 3+ members
    let richSpecies = 0;
    let dominantBucket = -1, dominantCount = 0, totalPop = 0;
    for (let b = 0; b < 12; b++) {
      if (counts[b] >= 3) richSpecies++;
      totalPop += counts[b];
      if (counts[b] > dominantCount) { dominantCount = counts[b]; dominantBucket = b; }
    }

    this._eraWindow.push({
      avgSize: totalSize / n,
      avgSpeed: totalSpeed / n,
      avgBrain: totalBrain / n,
      avgSense: totalSense / n,
      pop,
      richSpecies,
      dominantPct: totalPop > 0 ? dominantCount / totalPop : 0,
      dominantBucket,
    });
    if (this._eraWindow.length > 30) this._eraWindow.shift();
    if (this._eraWindow.length < 5) return; // need minimum data

    // Compute window averages
    const w = this._eraWindow;
    const wn = w.length;
    let wSize = 0, wSpeed = 0, wBrain = 0, wSense = 0, wPop = 0;
    let wRich = 0, wDomPct = 0, wDomBucket = -1, domBucketCounts = new Int32Array(12);
    for (let i = 0; i < wn; i++) {
      wSize += w[i].avgSize;
      wSpeed += w[i].avgSpeed;
      wBrain += w[i].avgBrain;
      wSense += w[i].avgSense;
      wPop += w[i].pop;
      wRich += w[i].richSpecies;
      wDomPct += w[i].dominantPct;
      if (w[i].dominantBucket >= 0) domBucketCounts[w[i].dominantBucket]++;
    }
    wSize /= wn; wSpeed /= wn; wBrain /= wn; wSense /= wn;
    wPop /= wn; wRich /= wn; wDomPct /= wn;

    // Most frequent dominant species in window
    let maxDomCount = 0;
    for (let b = 0; b < 12; b++) {
      if (domBucketCounts[b] > maxDomCount) { maxDomCount = domBucketCounts[b]; wDomBucket = b; }
    }

    // Detect era (prioritized - first match wins)
    let newEra = '', newHue = 0;

    if (wDomPct > 0.55 && wPop > 25 && wDomBucket >= 0) {
      newEra = 'Dominion of ' + SPECIES_NAMES[wDomBucket];
      newHue = wDomBucket * 30 + 15;
    } else if (wPop < 27) {
      newEra = 'Famine';
      newHue = 0;
    } else if (wRich >= 5) {
      newEra = 'Cambrian Bloom';
      newHue = 160;
    } else if (wBrain > 12) {
      newEra = 'The Scholars';
      newHue = 50;
    } else if (wSize > 1.45) {
      newEra = 'Age of Giants';
      newHue = 270;
    } else if (wSpeed > 1.15) {
      newEra = 'The Swift';
      newHue = 120;
    } else if (wSense > 140) {
      newEra = 'Far Sight';
      newHue = 200;
    }

    // Hysteresis: hold current era for minimum 600 ticks (10 seconds) before switching
    if (newEra !== this.era) {
      this._eraHoldTicks -= 60;
      if (this._eraHoldTicks <= 0) {
        // Fire era transition event
        if (newEra && this._canFire('era'))
          this.add('era', newEra, newHue);
        this.era = newEra;
        this.eraHue = newHue;
        this._eraHoldTicks = 600;
      }
    } else {
      this._eraHoldTicks = 600; // reset hold timer while era is stable
    }
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
