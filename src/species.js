// ================================================================
//  SPECIES TRACKER
// ================================================================
const SPECIES_NAMES = [
  'Kora','Vashi','Naia','Zelith','Thura','Shiko',
  'Mori','Loxa','Pavi','Suri','Jera','Rixa'
];

class SpeciesTracker {
  constructor() {
    this.history = [];      // [{buckets: [{b, hue, count}], total}]
    this.maxHistory = 600;
    this.species = new Map(); // bucket -> {firstTick, peakPop}
  }

  update(creatures, tick) {
    const counts = new Int32Array(12);
    const hueSum = new Float64Array(12);

    for (let i = 0; i < creatures.length; i++) {
      const b = Math.floor(creatures[i].genes.hue / 30) % 12;
      counts[b]++;
      hueSum[b] += creatures[i].genes.hue;
    }

    const buckets = [];
    for (let b = 0; b < 12; b++) {
      if (counts[b] > 0) {
        buckets.push({ b, hue: hueSum[b] / counts[b], count: counts[b] });
        if (!this.species.has(b)) {
          this.species.set(b, { firstTick: tick, peakPop: 0 });
        }
        const sp = this.species.get(b);
        if (counts[b] > sp.peakPop) sp.peakPop = counts[b];
      }
    }

    this.history.push({ buckets, total: creatures.length });
    if (this.history.length > this.maxHistory) this.history.shift();
  }

  // Return current species sorted by population (descending)
  getCurrent() {
    if (this.history.length === 0) return [];
    return this.history[this.history.length - 1].buckets
      .slice().sort((a, b) => b.count - a.count);
  }

  bucketOf(creature) {
    return Math.floor(creature.genes.hue / 30) % 12;
  }
}
