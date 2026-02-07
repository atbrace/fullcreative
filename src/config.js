// ================================================================
//  CONFIGURATION
// ================================================================
const CFG = {
  INITIAL_CREATURES: 30,
  INITIAL_FOOD: 100,
  MAX_CREATURES: 250,
  MAX_FOOD: 180,
  FOOD_SPAWN_RATE: 0.48,
  FOOD_ENERGY: 35,
  FOOD_RADIUS: 2.5,
  NUM_HOTSPOTS: 5,
  HOTSPOT_SPREAD: 90,

  BASE_RADIUS: 5,
  BASE_SPEED: 2.2,
  MAX_SPEED: 4.0,
  TURN_RATE: 0.12,
  ENERGY_INITIAL: 80,
  ENERGY_MAX: 200,
  ENERGY_REPRODUCE: 120,
  METABOLISM_BASE: 0.07,
  METABOLISM_SPEED_FACTOR: 0.06,
  METABOLISM_SIZE_EXP: 1.2,
  VISION_RANGE: 130,
  EAT_RANGE: 8,
  PREDATION_RATIO: 1.18,
  PREDATION_RANGE: 6,           // query radius multiplier (creature.radius * N)
  PREDATION_STRIKE: 1.0,        // strike distance: c.radius + prey.radius * N
  PREDATION_EFFICIENCY: 0.55,
  HUNT_COOLDOWN: 90,              // ticks after a kill before can hunt again

  // Kin proximity defense
  KIN_DEFENSE_RANGE: 80,          // radius to count nearby kin for defense
  KIN_DEFENSE_PER_KIN: 0.03,     // predation ratio increase per nearby kin
  KIN_DEFENSE_MAX: 0.15,         // cap on total kin defense bonus

  REPRODUCE_KEEP: 0.45,
  REPRODUCE_GIVE: 0.32,
  BODY_SEGMENTS: 5,

  BRAIN_INPUTS: 32,
  BRAIN_HIDDEN: 12,
  BRAIN_HIDDEN_MIN: 4,
  BRAIN_HIDDEN_MAX: 20,
  BRAIN_OUTPUTS: 7,
  BRAIN_RECURRENT: 4,
  SIGNAL_CHANNELS: 3,
  MUTATION_RATE: 0.12,
  MUTATION_AMOUNT: 0.25,
  BRAIN_SIZE_MUTATION_RATE: 0.08,
  HUE_MUTATION: 8,
  METABOLISM_BRAIN_FACTOR: 0.003,

  // Sensory range (evolvable)
  SENSE_RANGE_DEFAULT: 130,
  SENSE_RANGE_MIN: 60,
  SENSE_RANGE_MAX: 200,
  SENSE_MUTATION: 5,
  METABOLISM_SENSE_FACTOR: 0.0002,

  // Niche food types
  MINERAL_FOOD_RATIO: 0.45,   // fraction of spawned food that is mineral type
  DIET_MIN_AFFINITY: 0.15,    // minimum energy multiplier for mismatched food (0.15 = 15%)
  DIET_MUTATION: 0.05,        // diet gene mutation per reproduction

  TRAIL_FADE_BASE: 0.012,
  MAX_PARTICLES: 600,
  GRID_CELL: 70,
  DAY_PERIOD: 3600,

  OBS_FORMATIONS_MIN: 4,
  OBS_FORMATIONS_MAX: 7,
  OBS_CIRCLES_MIN: 2,
  OBS_CIRCLES_MAX: 5,
  OBS_RADIUS_MIN: 18,
  OBS_RADIUS_MAX: 42,
  OBS_SPREAD: 22,
  OBS_MARGIN_EDGE: 120,
  OBS_MARGIN_CENTER: 150,
  OBS_MARGIN_HOTSPOT: 100,
  OBS_MARGIN_FORMATION: 100,

  // Current zones
  CURRENT_ZONES_MIN: 2,
  CURRENT_ZONES_MAX: 4,
  CURRENT_RADIUS_MIN: 200,
  CURRENT_RADIUS_MAX: 450,
  CURRENT_STRENGTH: 0.08,

  // Pheromone grid
  PH_CELL: 20,
  PH_DEPOSIT: 0.25,           // default deposition rate (also gene default)
  PH_DEPOSIT_MIN: 0.05,       // gene range min (nearly silent trails)
  PH_DEPOSIT_MAX: 0.60,       // gene range max (very loud trails)
  PH_DEPOSIT_MUTATION: 0.03,  // mutation per reproduction
  METABOLISM_PH_FACTOR: 0.06, // metabolic cost per unit deposition rate per tick
  PH_DECAY: 0.988,
  PH_DIFFUSE: 0.04,
  PH_DIFFUSE_INTERVAL: 4,
  PH_MAX_VIZ: 8,

  // Energy sharing (kin-only with cooperative foraging bonus)
  SHARE_RANGE: 20,
  SHARE_RATE: 0.08,
  SHARE_EFFICIENCY: 0.85,

  // Cooperative foraging bonus (mutualism)
  COOP_RANGE: 50,
  COOP_BONUS: 0.05,
  COOP_MAX_KIN: 3,
  COOP_SHARE_THRESHOLD: 0.1,

  // Mating
  MATE_RANGE: 25,
  MATE_THRESHOLD: 0.3,
  MATE_ENERGY_MIN: 60,

  // Seasonal cycles
  SEASON_PERIOD: 14400,

  BG: [8, 8, 26],
};

const INPUT_LABELS = ['fd.s','fd.c','fd.d','cr.s','cr.c','cr.d','cr.z','s0.s','s0.c','s0.v','s1.s','s1.c','s1.v','s2.s','s2.c','s2.v','nrg','1.0','kin','ob.s','ob.c','ob.d','kp.s','kp.c','kp.v','fp.s','fp.c','fp.v','m.0','m.1','m.2','m.3'];
const OUTPUT_LABELS = ['turn','spd','sg0','sg1','sg2','shr','mat'];
const SIGNAL_HUES = [30, 200, 320]; // gold, blue, magenta - universal per channel

// Precomputed RGB colors for species-scented pheromone rendering (12 hue buckets)
const PH_SPECIES_RGB = (function() {
  const colors = [];
  for (let b = 0; b < 12; b++) {
    const h = (b * 30 + 15) / 360;
    const q = 0.45 * 1.55; // HSL: s=0.55, l=0.45, q = l*(1+s)
    const p = 0.9 - q;
    function f(t) {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }
    colors.push([Math.round(f(h + 1/3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1/3) * 255)]);
  }
  return colors;
})();

// ================================================================
//  MATH UTILITIES
// ================================================================
class Vec2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  copy() { return new Vec2(this.x, this.y); }
  dist(v) { const dx = this.x - v.x, dy = this.y - v.y; return Math.sqrt(dx * dx + dy * dy); }
}

function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
function randInt(lo, hi) { return Math.floor(rand(lo, hi)); }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function wrapAngle(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }

function gaussRand() {
  let u, v, s;
  do { u = Math.random() * 2 - 1; v = Math.random() * 2 - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
  return u * Math.sqrt(-2 * Math.log(s) / s);
}
