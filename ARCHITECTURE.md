# Emergence - Architecture Map

Quick reference for navigating `emergence.html`. All code is in a single file.
Line numbers are approximate - check nearby if exact lines have shifted.

## File Structure

```
emergence.html (~ 1230 lines)
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
+-- <script>                 lines 206-1250
    +-- CFG (config)         210-253
    +-- INPUT_LABELS         255-256
    +-- Vec2 + utilities     260-276
    +-- Brain                281-334
    +-- SpatialGrid          339-365
    +-- Particle             370-378
    +-- Hotspot              383-396
    +-- Food                 401-407
    +-- Creature             412-530
    +-- AudioEngine          535-626
    +-- World                631-810
    +-- Renderer             815-1030
    +-- renderBrain()        1035-1115
    +-- Main IIFE            1120-1250
```

## Key Classes

### Brain (280-334)
Recurrent neural network. `forward(sensory)` appends memory to sensory inputs,
computes hidden+output activations, then feeds hidden[0..3] back as memory.
Stores `lastInput`, `lastHidden`, `lastOutput` for the inspector.
- Architecture: 23 inputs (19 sensory + 4 recurrent), 12 hidden (tanh), 5 outputs (tanh)
- Weights: `wih` (input-hidden), `who` (hidden-output), `bh`, `bo` (biases)
- `memory`: Float32Array(4) - recurrent state, zeroed in cloned children
- `clone()` + `mutate(rate, amount)` for reproduction

### Creature (400-540)
The main entity. Key methods:
- `perceive(foodGrid, creatureGrid)` [440-507]: Queries spatial grids for nearest
  food, nearest creature, and nearest signaler per channel. Returns 19-float
  sensory array. Also stores `_nfPos`, `_ncPos` for inspector visualization.
- `think(inputs)` [509-514]: Runs brain forward pass, sets heading, speed, 3 signals.
- `move(W, H)` [516-535]: Pushes body trail, updates position, bounces walls,
  deducts metabolism.
- `reproduce()` [537-551]: Creates child with mutated genes and brain.

**Brain inputs (23 = 19 sensory + 4 recurrent):**
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
| 19    | m.0    | recurrent memory 0 (from hidden[0])      |
| 20    | m.1    | recurrent memory 1 (from hidden[1])      |
| 21    | m.2    | recurrent memory 2 (from hidden[2])      |
| 22    | m.3    | recurrent memory 3 (from hidden[3])      |

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

### World (621-794)
Simulation state and update loop. Key methods:
- `seed()` [634-641]: Creates initial hotspots, creatures, food.
- `_spawnFood()` [643-658]: Gaussian distribution around random weighted hotspot.
- `update(audio)` [671-766]: **The main simulation tick.** Order: spawn food,
  rebuild grids, for each creature: perceive/think/move, check eat, check
  predation, check reproduce, check death. Then cleanup dead entities, update
  particles, record population history.
- `dayPhase` [669]: Getter, returns 0-1 sine wave over DAY_PERIOD ticks.
- `creatureAt(x,y)` [786-793]: Hit-test for mouse selection.

### Renderer (799-1012)
Canvas drawing. Uses two canvases:
- **Trail canvas** (behind): Semi-transparent fade + creature position dots each frame.
  Creates slowly fading light trails.
- **Main canvas** (front): Cleared each frame. Draws hotspot glows, food, creatures
  (body segments + signal rings + outer glow + core + heading dot + selection
  decorations), particles, vignette, population graph.
- Blend mode: `lighter` for simulation elements, `source-over` for UI.

### renderBrain() (1017-1094)
Draws the neural network visualization on the inspector's canvas. Three columns
(input, hidden, output) with colored connections (blue=positive, red=negative)
and activation-brightness nodes.

### AudioEngine (525-616)
Web Audio API. Drone: 4 detuned sine oscillators through low-pass filter with
LFO. Events: `birthPing()` (pentatonic sine), `eatClick()` (high sine),
`deathThud()` (low sine), `predationSweep()` (descending sawtooth).

## Data Flow (One Frame)

```
1. World.update()
   +-- Spawn food near hotspot (gaussian)
   +-- Rebuild SpatialGrids (food + creatures)
   +-- For each creature:
   |   +-- creature.perceive() -> 12 sensory inputs
   |   +-- creature.think(inputs) -> brain.forward() -> set heading/speed/signal
   |   +-- creature.move() -> update pos, push body trail, deduct metabolism
   |   +-- Check food eating (spatial query, distance check)
   |   +-- Check predation (spatial query, size ratio check)
   |   +-- Check reproduction (energy threshold)
   |   +-- Check death (energy <= 0)
   +-- Add newborns, remove dead
   +-- Update particles
   +-- Record population history

2. Renderer.render()
   +-- Trail canvas: fade overlay + creature position dots
   +-- Main canvas (lighter blend):
   |   +-- Hotspot glows
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
4. Brain weight arrays auto-size from constructor args

**Adding a new brain output:**
1. Increment `CFG.BRAIN_OUTPUTS`
2. Read output in `Creature.think()` (from `out[N]`)
3. Add label to `OUTPUT_LABELS` array

**Adding a new gene:**
1. Add to `genes` object in `Creature.createRandom()`
2. Add mutation in `Creature.reproduce()`
3. Use the gene value wherever it applies

**Adding a new environmental feature:**
1. Create class (like Hotspot)
2. Initialize in `World.seed()`
3. Update in `World.update()`
4. Render in `Renderer.render()`

**Adding a new audio event:**
1. Add method to `AudioEngine`
2. Call it from `World.update()` at the appropriate event
