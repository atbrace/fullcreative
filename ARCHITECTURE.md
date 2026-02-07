# Emergence - Architecture Map

Quick reference for navigating the Emergence codebase. Code is split across 11
files in `src/`, loaded via plain `<script>` tags in dependency order.

## File Structure

```
emergence.html          HTML + CSS + script tags
src/
  config.js             CFG object, label arrays, Vec2, math utilities
  brain.js              Brain class (neural network)
  entities.js           SpatialGrid, Particle, Hotspot, Food, Obstacle, CurrentZone
  pheromones.js         PheromoneGrid class
  species.js            SPECIES_NAMES array, SpeciesTracker class
  events.js             EventLog class (ecosystem narrative events)
  creature.js           cidCounter, Creature class
  world.js              World class (simulation state + update loop)
  audio.js              AudioEngine class
  renderer.js           Renderer class + renderBrain() function
  main.js               Bootstrap IIFE, event handlers, game loop
```

### Load Order (dependency chain)

```
config -> brain -> entities -> pheromones -> species -> events -> creature -> world -> audio -> renderer -> main
```

Each file can reference classes/functions from all files loaded before it.
Plain `<script>` tags share the global scope - no ES modules, no bundler, no
CORS issues with `file://`.

## File Details

### emergence.html
HTML structure + CSS only. Contains:
- `<head>`: CSS for overlay, stats, speed controls, inspector, help, pause
- `<body>`: DOM elements (#overlay, #stats, #speed-controls, #inspector, #help-panel, #pause-label, canvases)
- Script tags loading `src/*.js` in dependency order

### src/config.js
- `CFG` object: all tuning constants (population, physics, brain, rendering, etc.)
- `INPUT_LABELS`, `OUTPUT_LABELS`, `SIGNAL_HUES`: label/color arrays
- `Vec2` class: 2D vector with `copy()` and `dist()`
- Utility functions: `rand`, `randInt`, `clamp`, `wrapAngle`, `gaussRand`

### src/brain.js
Recurrent neural network. `forward(sensory)` appends memory to sensory inputs,
computes hidden+output activations, then feeds hidden[0..3] back as memory.
Stores `lastInput`, `lastHidden`, `lastOutput` for the inspector.
- Architecture: 32 inputs (28 sensory + 4 recurrent), 4-20 hidden (tanh, evolvable), 7 outputs (tanh)
- Default hidden size: 12. Evolved via `genes.brainSize` (range CFG.BRAIN_HIDDEN_MIN to CFG.BRAIN_HIDDEN_MAX)
- Weights: `wih` (input-hidden), `who` (hidden-output), `bh`, `bo` (biases)
- `memory`: Float32Array(4) - recurrent state, zeroed in cloned/resized children
- `randomize()` uses Xavier/Glorot initialization: scale = 2*sqrt(6/(fan_in+fan_out)). Prevents tanh saturation with 32 inputs.
- `clone()` + `mutate(rate, amount)` for reproduction
- `resized(newNh)` - returns a new brain with adjusted hidden layer size (shared neurons keep weights, new neurons get small random init)
- `static crossover(a, b, targetNh)` - uniform crossover that handles different-sized parents. Shared neurons (index < min) get crossover, extra neurons copy from larger parent, beyond-both neurons get random init

### src/entities.js
Small data classes grouped together:
- **SpatialGrid**: Grid-based spatial index for O(1) neighbor queries. `clear()`, `insert(e)`, `query(x, y, radius)`.
- **Particle**: Visual-only effect particle with velocity, hue, life, size.
- **Hotspot**: Nutrient source that drifts slowly. `drift(W, H)`.
- **Food**: Position + alive flag + pulse animation + optional hue (corpse food).
- **Obstacle**: Circle with `pos` (Vec2) + `radius`. No methods - collision logic lives in Creature.
- **CurrentZone**: Drift force zone. `pos` + `angle` + `strength` + `radius`. Slowly drifts and rotates via `drift()`.

### src/pheromones.js
Species-scented chemical trail system. Low-resolution grid (~20px cells) with 12 species layers.
- `data`: Float32Array - total pheromone per cell (sum of species layers)
- `speciesData`: Float32Array(n * 12) - per-species pheromone concentrations
- `speciesBuf`: Float32Array(n * 12) - double-buffer for species diffusion
- `mask`: Uint8Array - obstacle mask (1 = blocked, prevents diffusion through rocks)
- `deposit(x, y, amount, bucket)`: Add pheromone at world position to specific species layer
- `diffuseAndDecay()`: 4-neighbor diffusion + decay on all 12 species layers. Reconstructs total. Called every 4 ticks.
- `speciesGradient(x, y, bucket)`: Returns { kinDx, kinDy, kinVal, forDx, forDy, forVal } - kin and foreign gradient directions and intensities. Foreign = total - kin.
- `dominantSpecies(idx)`: Returns bucket with highest concentration at cell (for rendering)
- `buildMask(obstacles)`: Pre-computes which cells are inside obstacle circles
- `canvas`/`imgData`: Offscreen rendering surface for species-colored pheromone overlay

### src/species.js
Species identification and population tracking.
- `SPECIES_NAMES`: Array of 12 names (one per 30-degree hue bucket): Kora, Vashi, Naia, Zelith, Thura, Shiko, Mori, Loxa, Pavi, Suri, Jera, Rixa
- **SpeciesTracker** class:
  - `update(creatures, tick)`: Counts creatures per hue bucket (30-degree bands), records snapshot to history. Called every 10 ticks alongside popHistory.
  - `getCurrent()`: Returns current species sorted by population (descending). Each entry: `{b, hue, count}`.
  - `bucketOf(creature)`: Returns bucket index (0-11) for a creature.
  - `history`: Array of snapshots (max 600), each with `{buckets: [{b, hue, count}], total}`. Used by stacked species chart in renderer.
  - `species`: Map of bucket -> `{firstTick, peakPop}` for species metadata.

### src/events.js
Ecosystem narrative event detection and display.
- **EventLog** class:
  - `check(world)`: Called every tick. Detects species extinction (population drops from >= 3 to 0), species emergence (rises from 0 to >= 2), population boom/crash (>50%/<60% change over 100 ticks), season changes, predation sprees (>= 5 kills in 120 ticks), and generation milestones (10, 25, 50, 100, 200, 500, 1000).
  - `_updateEra(world, counts, hues)`: Called every 60 ticks. Sliding window of 30 samples detects named eras: Dominion of [Species] (>55% pop), Famine (<27 pop), Cambrian Bloom (5+ rich species), The Scholars (brain>13), Age of Giants (size>1.65), The Swift (speed>1.4), Far Sight (sense>150). 10-second hysteresis prevents flicker.
  - `era` / `eraHue`: Current era name and color hue. Read by main.js for stats display.
  - `notifyPredation()`: Called from world on each predation kill. Accumulates count for spree detection.
  - `add(type, text, hue)`: Pushes a new event with real-time timestamp.
  - `getVisible()`: Returns events with computed fade opacity (400ms fade-in, 5s visible, 3s fade-out). Max 6 visible at once.
  - Cooldown system: per-event-key cooldown (1.5s) prevents spam at high speeds.
  - Events rendered as DOM elements in `#event-log` div, styled by type and species hue.

### src/creature.js
The main entity. Key methods:
- `perceive(foodGrid, creatureGrid, obstacles, phGrid)`: Queries spatial grids for nearest food, nearest creature, nearest signaler per channel, nearest obstacle surface, and species-scented pheromone gradients (kin + foreign). Returns 28-float sensory array. Uses `genes.senseRange` for perception radius. Also stores `_nfPos`, `_ncPos` for viz, `_ncRef`/`_ncDist` for sharing.
- `think(inputs)`: Runs brain forward pass, sets heading, speed, 3 signals, shareOut, mateOut.
- `move(W, H, obstacles, currents)`: Pushes body trail, updates position, applies current zone drift, bounces walls with random perturbation, soft wall repulsion, collides with obstacles (push-out + heading reflection), deducts metabolism (including brain size cost and sensory range cost).
- `reproduce(mate)`: Creates child with possible brain size mutation (+/-1, 8% chance). If mate provided, uses Brain.crossover at child's brain size for sexual reproduction. Otherwise asexual (clone + resize if mutated + mutate). Mate pays 15% energy cost.
- `static _mutateBrainSize(parentSize)`: Returns parent size with 8% chance of +/-1, clamped to [4, 20].

**Brain inputs (32 = 28 sensory + 4 recurrent):**
| Index | Name   | Description                              |
|-------|--------|------------------------------------------|
| 0     | fd.s   | sin(relative angle to nearest food)      |
| 1     | fd.c   | cos(relative angle to nearest food)      |
| 2     | fd.d   | distance to nearest food (0-1)           |
| 3     | cr.s   | sin(relative angle to nearest creature)  |
| 4     | cr.c   | cos(relative angle to nearest creature)  |
| 5     | cr.d   | distance to nearest creature (0-1)       |
| 6     | cr.z   | relative size of nearest creature (-1,1) |
| 7     | s0.s   | sin(angle to nearest ch0 signaler)       |
| 8     | s0.c   | cos(angle to nearest ch0 signaler)       |
| 9     | s0.v   | ch0 signal strength (0-1)                |
| 10    | s1.s   | sin(angle to nearest ch1 signaler)       |
| 11    | s1.c   | cos(angle to nearest ch1 signaler)       |
| 12    | s1.v   | ch1 signal strength (0-1)                |
| 13    | s2.s   | sin(angle to nearest ch2 signaler)       |
| 14    | s2.c   | cos(angle to nearest ch2 signaler)       |
| 15    | s2.v   | ch2 signal strength (0-1)                |
| 16    | nrg    | own energy (0-1)                         |
| 17    | 1.0    | bias                                     |
| 18    | kin    | hue similarity to nearest creature (-1,1)|
| 19    | ob.s   | sin(relative angle to nearest obstacle)  |
| 20    | ob.c   | cos(relative angle to nearest obstacle)  |
| 21    | ob.d   | surface distance to nearest obstacle(0-1)|
| 22    | kp.s   | sin(relative angle to kin pheromone gradient)     |
| 23    | kp.c   | cos(relative angle to kin pheromone gradient)     |
| 24    | kp.v   | kin pheromone local intensity (0-1)               |
| 25    | fp.s   | sin(relative angle to foreign pheromone gradient) |
| 26    | fp.c   | cos(relative angle to foreign pheromone gradient) |
| 27    | fp.v   | foreign pheromone local intensity (0-1)           |
| 28    | m.0    | recurrent memory 0 (from hidden[0])      |
| 29    | m.1    | recurrent memory 1 (from hidden[1])      |
| 30    | m.2    | recurrent memory 2 (from hidden[2])      |
| 31    | m.3    | recurrent memory 3 (from hidden[3])      |

**Brain outputs (7):**
| Index | Name   | Description                       |
|-------|--------|-----------------------------------|
| 0     | turn   | turn rate (-1 to 1)               |
| 1     | spd    | speed factor (mapped to 0-1)      |
| 2     | sg0    | signal channel 0 strength (0-1)   |
| 3     | sg1    | signal channel 1 strength (0-1)   |
| 4     | sg2    | signal channel 2 strength (0-1)   |
| 5     | shr    | energy share intensity (0-1)      |
| 6     | mat    | mating willingness (0-1)          |

**Signal channel colors (universal, not species-dependent):**
| Channel | Hue | Color   | Viz: ring radius |
|---------|-----|---------|------------------|
| 0       | 30  | Gold    | 2.8x body        |
| 1       | 200 | Blue    | 4.2x body        |
| 2       | 320 | Magenta | 5.6x body        |

**Brain viz node colors:**
| Input range  | Color       | Description      |
|--------------|-------------|------------------|
| 0-6          | Blue/Red    | Food + creature  |
| 7-15         | Channel hue | Signal channels  |
| 16-18        | Blue/Red    | Energy, bias, kin|
| 19-21        | Slate blue  | Obstacle inputs  |
| 22-24        | Warm amber  | Kin pheromone    |
| 25-27        | Purple      | Foreign pheromone|
| 28-31        | Orange      | Recurrent memory |
| Output 0-1   | Blue/Red    | Turn, speed      |
| Output 2-4   | Channel hue | Signal channels  |
| Output 5     | Green       | Energy sharing   |
| Output 6     | Pink        | Mating signal    |

### src/world.js
Simulation state and update loop. Key methods:
- `seed()`: Creates hotspots, generates obstacles, builds pheromone obstacle mask, generates currents, spawns creatures + food.
- `_generateObstacles()`: 4-7 formations of 2-5 overlapping circles each. Placement rejects positions near edges, center, hotspots, other formations.
- `_generateCurrents()`: 2-4 current zones with random position, angle, strength, and radius.
- `_spawnFood()`: Gaussian distribution around random weighted hotspot. Retry loop rejects positions inside obstacles (up to 10 attempts).
- `update(audio)`: **The main simulation tick.** Order: compute day/season multipliers, drift hotspots (faster in winter) + currents, diffuse pheromones (every 4 ticks), spawn food (modulated by day+season), rebuild grids, for each creature: perceive/think/move (with obstacles+currents+pheromone grid), decrement hunt cooldown, deposit pheromone, energy sharing (if shareOut > 0.1 and nearest creature within 20px), check eat, check predation (with kin defense bonus + hunt cooldown gate), check reproduce (with mate search if mateOut > 0.3, fallback to asexual), check death. Then cleanup dead entities, update particles, population floor check (MIN_POP=21), record population + trait history, ecosystem audio state (every 60 ticks).
- `dayPhase`: Getter, returns 0-1 sine wave over DAY_PERIOD ticks.
- `seasonPhase`: Getter, returns 0-1 sine wave over SEASON_PERIOD ticks.
- `creatureAt(x,y)`: Hit-test for mouse selection.

### src/audio.js
Web Audio API. Drone: 4 detuned sine oscillators through low-pass filter with
LFO. Events: `birthPing()` (pentatonic sine), `eatClick()` (high sine),
`deathThud()` (low sine), `predationSweep()` (descending sawtooth).
- `setPopulation(pop)`: Modulates drone gain by population (every 30 ticks).
- `setEcosystemState(state)`: Modulates filter cutoff (population + species diversity), LFO rate (predation intensity), and filter Q (era type). Smooth exponential ramps with 2-4s time constants. Called every 60 ticks.

### src/renderer.js
Canvas drawing. Uses two canvases:
- **Trail canvas** (behind): Semi-transparent fade with seasonal color temperature (warm amber in summer, cool blue in winter) + obstacle masking + creature position dots each frame. Creates slowly fading light trails.
- **Main canvas** (front): Cleared each frame. Draws hotspot glows (dimmed in winter), current zone indicators (subtle glow + animated flow streaks), pheromone grid overlay (warm amber glow via offscreen canvas), obstacles (dark body + edge glow), food, creatures (body segments + signal rings + outer glow + core + heading dot + selection decorations), particles, vignette, population graph.
- `_renderPheromones(ctx, phGrid)`: Builds RGBA image data from pheromone grid, puts it on offscreen canvas, draws scaled up with bilinear interpolation.
- `drawTraitGraph(ctx, world, W, H)`: Line chart of evolvable trait averages (brain size, sense range, body size, speed) over time. 240x45px, positioned above species chart. Toggle via `renderer.showTraits` (key 'e').
- `renderBrain(canvas, brain)`: Draws the neural network visualization on the inspector's canvas. Three columns (input, hidden, output) with colored connections and activation-brightness nodes.
- Blend mode: `lighter` for simulation elements, `source-over` for UI + obstacles.

### src/main.js
Bootstrap IIFE. Initializes Renderer, World, AudioEngine. Wires up:
- Overlay click to start simulation
- Speed buttons (1x, 2x, 4x | 16x, 32x time-lapse)
- Keyboard shortcuts (space, h, m, e=trait timeline, 1/2/4, t=time-lapse toggle, escape)
- Mouse click (creature inspect, shift+click add creature, empty click add food)
- Window resize
- Inspector update (every 12 frames)
- Stats + event log update (every 12 frames)
- Game loop via requestAnimationFrame
- Time-lapse audio proxy (mutes individual events, keeps drone) for speeds > 4x
- `window.__world` debug accessor

## Data Flow (One Frame)

```
1. World.update()
   +-- Compute day/season multipliers
   +-- Drift hotspots (faster in winter) + current zones
   +-- Diffuse + decay pheromone grid (every 4 ticks)
   +-- Spawn food near hotspot (gaussian, reject inside obstacles, rate * day * season)
   +-- Rebuild SpatialGrids (food + creatures)
   +-- For each creature:
   |   +-- creature.perceive() -> 25 sensory inputs (incl. obstacle + pheromone)
   |   +-- creature.think(inputs) -> brain.forward() -> set heading/speed/signal/share/mate
   |   +-- creature.move() -> update pos, apply current drift, bounce walls, collide obstacles, metabolism
   |   +-- Deposit pheromone at current position
   |   +-- Energy sharing (if shareOut > 0.1, nearest creature < 20px, transfer energy)
   |   +-- Check food eating (spatial query, distance check)
   |   +-- Check predation (spatial query, size ratio check)
   |   +-- Check reproduction (energy threshold, mate search if mateOut > 0.3)
   |   +-- Check death (energy <= 0)
   +-- Add newborns, remove dead
   +-- Update particles
   +-- Population floor (reseed if < 18: 50% survivor offspring, 50% random)
   +-- Record population history

2. Renderer.render()
   +-- Trail canvas: seasonal color temp fade overlay + obstacle masking + creature dots
   +-- Main canvas (lighter blend):
   |   +-- Hotspot glows (dimmed in winter)
   |   +-- Current zone indicators (glow + animated flow streaks)
   |   +-- Pheromone grid overlay (warm amber, offscreen canvas scaled up)
   |   +-- Obstacles (source-over dark body, then lighter edge glow)
   |   +-- Food (pulsing glow + core dot)
   |   +-- Creatures (body segments, signal rings, share ring, mate ring, outer glow, core, heading dot)
   |   +-- Selection decorations (vision range, attention lines, pulsing ring)
   |   +-- Particles
   +-- Main canvas (source-over):
       +-- Vignette
       +-- Population graph

3. updateInspector() (every 12 frames)
   +-- Update stats DOM elements
   +-- renderBrain() on inspector canvas
```

## Extension Points

**Adding a new brain input:**
1. Increment `CFG.BRAIN_INPUTS` in `src/config.js`
2. Add perception logic in `Creature.perceive()` in `src/creature.js` (set `inp[N]`)
3. Add label to `INPUT_LABELS` array in `src/config.js`
4. Update brain viz color functions in `renderBrain()` in `src/renderer.js` if needed
5. Brain weight arrays auto-size from constructor args

**Adding a new brain output:**
1. Increment `CFG.BRAIN_OUTPUTS` in `src/config.js`
2. Read output in `Creature.think()` in `src/creature.js` (from `out[N]`)
3. Add label to `OUTPUT_LABELS` array in `src/config.js`

**Adding a new gene:**
1. Add to `genes` object in `Creature.createRandom()` in `src/creature.js`
2. Add mutation in `Creature.reproduce()` in `src/creature.js`
3. Use the gene value wherever it applies

**Adding a new environmental feature:**
1. Create class in `src/entities.js` (or new file if substantial)
2. Initialize in `World.seed()` in `src/world.js`
3. Update in `World.update()` in `src/world.js`
4. Render in `Renderer.render()` in `src/renderer.js`
5. If creatures should perceive it, add brain inputs

**Adding a new audio event:**
1. Add method to `AudioEngine` in `src/audio.js`
2. Call it from `World.update()` in `src/world.js` at the appropriate event
