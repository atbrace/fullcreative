# Emergence - Architecture Map

Quick reference for navigating `emergence.html`. All code is in a single file.
Line numbers are approximate - check nearby if exact lines have shifted.

## File Structure

```
emergence.html (~ 1490 lines)
|
+-- HTML <head>              lines 1-6
+-- CSS                      lines 7-135
|   +-- Base/canvas          7-16
|   +-- Overlay (start)      18-50
|   +-- Stats panel          52-61
|   +-- Speed controls       63-80
|   +-- Inspector panel      82-111
|   +-- Help panel           113-125
|   +-- Pause indicator      127-134
|
+-- HTML <body>              lines 136-204
|   +-- #overlay             139-150
|   +-- #stats               152-161
|   +-- #speed-controls      163-167
|   +-- #inspector           169-191
|   +-- #help-panel          193-199
|   +-- #pause-label         201
|   +-- canvases             203-204
|
+-- <script>                 lines 206-1492
    +-- CFG (config)         210-265
    +-- INPUT_LABELS         267-268
    +-- Vec2 + utilities     272-290
    +-- Brain                295-350
    +-- SpatialGrid          353-380
    +-- Particle             384-392
    +-- Hotspot              397-412
    +-- Food                 415-422
    +-- Obstacle             426-432
    +-- Creature             438-612
    +-- AudioEngine          616-708
    +-- World                712-960
    +-- Renderer             964-1220
    +-- renderBrain()        1223-1353
    +-- Main IIFE            1357-1492
```

## Key Classes

### Brain (295-350)
Recurrent neural network. `forward(sensory)` appends memory to sensory inputs,
computes hidden+output activations, then feeds hidden[0..3] back as memory.
Stores `lastInput`, `lastHidden`, `lastOutput` for the inspector.
- Architecture: 26 inputs (22 sensory + 4 recurrent), 12 hidden (tanh), 5 outputs (tanh)
- Weights: `wih` (input-hidden), `who` (hidden-output), `bh`, `bo` (biases)
- `memory`: Float32Array(4) - recurrent state, zeroed in cloned children
- `clone()` + `mutate(rate, amount)` for reproduction

### Obstacle (426-432)
Simple circle: `pos` (Vec2) + `radius`. No methods - collision and perception
logic lives in Creature. Generated in formations by `World._generateObstacles()`.

### Creature (438-612)
The main entity. Key methods:
- `perceive(foodGrid, creatureGrid, obstacles)` [455-530]: Queries spatial grids
  for nearest food, nearest creature, nearest signaler per channel, and nearest
  obstacle surface. Returns 22-float sensory array.
  Also stores `_nfPos`, `_ncPos` for inspector visualization.
- `think(inputs)` [532-537]: Runs brain forward pass, sets heading, speed, 3 signals.
- `move(W, H, obstacles)` [539-580]: Pushes body trail, updates position, bounces
  walls, collides with obstacles (push-out + heading reflection), deducts metabolism.
- `reproduce()` [582-596]: Creates child with mutated genes and brain.

**Brain inputs (26 = 22 sensory + 4 recurrent):**
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
| 22    | m.0    | recurrent memory 0 (from hidden[0])      |
| 23    | m.1    | recurrent memory 1 (from hidden[1])      |
| 24    | m.2    | recurrent memory 2 (from hidden[2])      |
| 25    | m.3    | recurrent memory 3 (from hidden[3])      |

**Brain outputs (5):**
| Index | Name   | Description                       |
|-------|--------|-----------------------------------|
| 0     | turn   | turn rate (-1 to 1)               |
| 1     | spd    | speed factor (mapped to 0-1)      |
| 2     | sg0    | signal channel 0 strength (0-1)   |
| 3     | sg1    | signal channel 1 strength (0-1)   |
| 4     | sg2    | signal channel 2 strength (0-1)   |

**Signal channel colors (universal, not species-dependent):**
| Channel | Hue | Color   | Viz: ring radius |
|---------|-----|---------|------------------|
| 0       | 30  | Gold    | 2.8x body        |
| 1       | 200 | Blue    | 4.2x body        |
| 2       | 320 | Magenta | 5.6x body        |

**Brain viz node colors:**
| Input range | Color       | Description      |
|-------------|-------------|------------------|
| 0-6         | Blue/Red    | Food + creature  |
| 7-15        | Channel hue | Signal channels  |
| 16-18       | Blue/Red    | Energy, bias, kin|
| 19-21       | Slate blue  | Obstacle inputs  |
| 22-25       | Orange      | Recurrent memory |

### World (712-960)
Simulation state and update loop. Key methods:
- `seed()` [725-742]: Creates hotspots, generates obstacles, spawns creatures + food.
- `_generateObstacles()` [744-782]: 4-7 formations of 2-5 overlapping circles each.
  Placement rejects positions near edges, center, hotspots, other formations.
- `_spawnFood()` [784-808]: Gaussian distribution around random weighted hotspot.
  Retry loop rejects positions inside obstacles (up to 10 attempts).
- `update(audio)` [818-870]: **The main simulation tick.** Order: spawn food,
  rebuild grids, for each creature: perceive/think/move (with obstacles), check eat,
  check predation, check reproduce, check death. Then cleanup dead entities, update
  particles, population floor check, record population history.
- `dayPhase` [816]: Getter, returns 0-1 sine wave over DAY_PERIOD ticks.
- `creatureAt(x,y)` [940-950]: Hit-test for mouse selection.

### Renderer (964-1220)
Canvas drawing. Uses two canvases:
- **Trail canvas** (behind): Semi-transparent fade + obstacle masking + creature
  position dots each frame. Creates slowly fading light trails. Obstacles masked
  with background color to prevent trail bleed.
- **Main canvas** (front): Cleared each frame. Draws hotspot glows, obstacles
  (dark body + edge glow), food, creatures (body segments + signal rings + outer
  glow + core + heading dot + selection decorations), particles, vignette,
  population graph.
- Blend mode: `lighter` for simulation elements, `source-over` for UI + obstacles.

### renderBrain() (1223-1353)
Draws the neural network visualization on the inspector's canvas. Three columns
(input, hidden, output) with colored connections (blue=positive, red=negative)
and activation-brightness nodes. Obstacle inputs colored slate blue.

### AudioEngine (616-708)
Web Audio API. Drone: 4 detuned sine oscillators through low-pass filter with
LFO. Events: `birthPing()` (pentatonic sine), `eatClick()` (high sine),
`deathThud()` (low sine), `predationSweep()` (descending sawtooth).

## Data Flow (One Frame)

```
1. World.update()
   +-- Spawn food near hotspot (gaussian, reject inside obstacles)
   +-- Rebuild SpatialGrids (food + creatures)
   +-- For each creature:
   |   +-- creature.perceive() -> 22 sensory inputs (incl. nearest obstacle)
   |   +-- creature.think(inputs) -> brain.forward() -> set heading/speed/signal
   |   +-- creature.move() -> update pos, bounce walls, collide obstacles, metabolism
   |   +-- Check food eating (spatial query, distance check)
   |   +-- Check predation (spatial query, size ratio check)
   |   +-- Check reproduction (energy threshold)
   |   +-- Check death (energy <= 0)
   +-- Add newborns, remove dead
   +-- Update particles
   +-- Population floor (reseed if < 10)
   +-- Record population history

2. Renderer.render()
   +-- Trail canvas: fade overlay + obstacle masking + creature position dots
   +-- Main canvas (lighter blend):
   |   +-- Hotspot glows
   |   +-- Obstacles (source-over dark body, then lighter edge glow)
   |   +-- Food (pulsing glow + core dot)
   |   +-- Creatures (body segments, signal ring, outer glow, core, heading dot)
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
1. Increment `CFG.BRAIN_INPUTS`
2. Add perception logic in `Creature.perceive()` (set `inp[N]`)
3. Add label to `INPUT_LABELS` array
4. Update brain viz color functions in `renderBrain()` if needed
5. Brain weight arrays auto-size from constructor args

**Adding a new brain output:**
1. Increment `CFG.BRAIN_OUTPUTS`
2. Read output in `Creature.think()` (from `out[N]`)
3. Add label to `OUTPUT_LABELS` array

**Adding a new gene:**
1. Add to `genes` object in `Creature.createRandom()`
2. Add mutation in `Creature.reproduce()`
3. Use the gene value wherever it applies

**Adding a new environmental feature:**
1. Create class (like Hotspot or Obstacle)
2. Initialize in `World.seed()`
3. Update in `World.update()`
4. Render in `Renderer.render()`
5. If creatures should perceive it, add brain inputs

**Adding a new audio event:**
1. Add method to `AudioEngine`
2. Call it from `World.update()` at the appropriate event
