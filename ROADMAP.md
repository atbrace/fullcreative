# Emergence - Product Roadmap

## Vision

Emergence is a digital aquarium for artificial life. The long-term goal is a
simulation where genuinely surprising complexity arises from simple evolutionary
pressure - where a viewer can watch for an hour and see behaviors they didn't
expect, didn't program, and couldn't have predicted.

The north star is not feature count. It is the moment when a viewer says:
"Wait - did that creature just...?" That moment of recognition, where evolved
behavior looks purposeful and intelligent, is what every feature should serve.

The ultimate aspiration: creatures that develop cooperative hunting strategies,
territorial wars, warning systems, migratory patterns, and proto-communication -
all from nothing but neural network mutation and survival pressure.

---

## Current State (v2)

### What's Built
- 12-12-3 feedforward neural network brains (12 inputs, 12 hidden, 3 outputs)
- Perception: nearest food (direction, distance), nearest creature (direction,
  distance, relative size), nearest signaling creature (direction, strength),
  own energy, bias
- Outputs: turn rate, speed, signal strength
- Genetic traits: hue (color lineage), body size, speed multiplier
- Organic body rendering with 5 trailing segments
- Food spawning clustered around 5 drifting nutrient hotspots (gaussian distribution)
- Predation: creatures 1.35x larger can eat smaller ones
- Asexual reproduction with brain mutation and gene drift
- Generative ambient audio (drone + birth/death/eat/predation sounds)
- Day/night cycle affecting food spawn rate and visual atmosphere
- Creature inspector with real-time neural network visualization
- Population graph, species count, stats overlay
- Speed controls (1x/2x/4x)
- Vignette, particle effects, glow rendering

### What Works Well
- Visuals are genuinely beautiful - the trails, glows, and color genetics create
  compelling compositions
- Creatures do evolve basic food-seeking within 30-60 seconds
- The neural network inspector is satisfying to watch
- Audio adds meaningful atmosphere
- Food hotspots create natural territories

### What Needs Improvement
- Creatures don't develop complex behaviors beyond basic foraging
- Signaling system exists but creatures rarely evolve meaningful use of it
- No creature memory - every decision is purely reactive to current frame
- Population dynamics can be monotonous (steady state or boom-bust with no variation)
- No environmental structure beyond hotspots - world is flat and featureless
- Species "speciation" is only by hue bucket, not behavioral divergence

---

## Roadmap Phases

### Phase 1: Cognitive Depth
*Give creatures the capacity for richer behavior.*

The current brain is memoryless - creatures can't learn temporal patterns, can't
remember where food was, can't develop sequential behaviors. This is the single
biggest bottleneck to emergent complexity.

- [x] **Recurrent connections** (2026-02-06): 4 recurrent neurons feed hidden[0..3]
  back as input. Brain is now 17-12-3 (13 sensory + 4 memory). Memory nodes shown
  in orange in brain viz. Children start with zeroed memory.
- [ ] **Multiple signal channels**: Instead of one signal output, give creatures
  2-3 signal channels (different "frequencies"). Others can sense each channel
  independently. This creates the substrate for differentiated communication -
  one channel for food, another for danger, etc. Evolution decides the meaning.
- [x] **Kin recognition input** (2026-02-06): Brain input at index 12 for hue
  similarity to nearest creature (-1 = opposite, +1 = same). Circular hue math.
- [ ] **Danger memory**: With recurrent connections, creatures could learn to
  associate certain directions with recent predation events. Verify this emerges
  naturally or consider adding a "was I recently attacked" input.

### Phase 2: Environmental Richness
*Make the world worth navigating.*

A flat world with scattered food doesn't create enough selection pressure for
interesting navigation, territory, or migration strategies.

- [ ] **Terrain obstacles**: Circular or polygonal obstacles that creatures
  bounce off. Creates chokepoints, sheltered areas, and line-of-sight barriers.
  Obstacles should be few (5-8) and large enough to matter.
- [ ] **Current zones**: Regions where creatures experience a constant drift
  force. Creates "rivers" that creatures can ride or fight against. Energy-efficient
  creatures might evolve to use currents for travel.
- [ ] **Seasonal cycles**: Longer than day/night (5-10 minute period). Hotspot
  strengths shift dramatically - some regions become barren while others bloom.
  Creates migration pressure: creatures that stay in one place eventually starve,
  creatures that move to new blooms survive.
- [ ] **Toxic zones**: Small areas that drain energy. Creates "forbidden zones"
  that separate populations, enabling geographic speciation (allopatric speciation).
- [ ] **Food chain depth**: Introduce a second food type - "plants" that grow
  slowly and "fruit" that appears in bursts. Different energy values create
  foraging strategy diversity.

### Phase 3: Social Dynamics
*Enable the emergence of cooperation, competition, and culture.*

This phase is only meaningful after Phase 1 (creatures need memory to have
social relationships) and Phase 2 (creatures need territory to compete over).

- [ ] **Pheromone system**: Creatures can deposit invisible chemical markers on a
  grid. Markers diffuse and decay over time. Other creatures can sense local
  pheromone concentration and gradient direction. This enables: trail following
  to food, territory marking, alarm pheromones, nest-like gathering points.
  Implementation: low-resolution grid (maybe 1/10th of screen resolution),
  diffuse + decay each tick, creatures deposit based on a brain output.
- [ ] **Energy sharing**: A brain output that, when activated near another
  creature, transfers a small amount of energy to it. This creates the
  substrate for altruism, parental care, or parasitism - evolution decides.
- [ ] **Mate selection**: Instead of purely asexual reproduction, creatures
  above the energy threshold must find a willing partner. Both parents contribute
  brain weights (crossover + mutation). This creates sexual selection pressure
  and accelerates evolution.
- [x] **Corpse food** (2026-02-06): Dead creatures drop food at their position
  colored by their hue (energy = size * 15). Food class extended with optional
  hue/energy. Renderer shows corpse food in creature's color vs green for plants.
  Only starvation deaths drop corpses (predation already transfers energy).

### Phase 4: Spectator Intelligence
*Make the simulation legible, narratable, and shareable.*

The simulation produces emergent behavior, but the viewer needs help recognizing
and understanding it.

- [ ] **Species auto-detection**: Cluster creatures by brain weight similarity
  (not just hue). Use a simple distance metric on flattened weight vectors.
  Species that are behaviorally distinct get distinct cluster IDs. Track species
  populations over time.
- [ ] **Species naming**: Auto-generate names for detected species using a
  simple syllable combiner (e.g., "Vorathi", "Celundra"). Names persist as long
  as the species exists. Display dominant species names on screen.
- [ ] **Stacked species chart**: Replace the simple population graph with a
  stacked area chart colored by species. Shows speciation events, extinctions,
  and population dynamics at a glance.
- [ ] **Event detection and log**: Detect notable events: mass extinction (>40%
  pop drop in 10s), speciation (new cluster emerges), invasion (species moves
  to new hotspot), predation chain (creature A eats B eats C in quick succession).
  Show events as brief toasts at bottom of screen.
- [ ] **Creature lineage view**: When a creature is selected, show its ancestry
  chain (parent, grandparent, etc.) with generation numbers and trait drift.
  Maybe a small family tree visualization.
- [ ] **Time-lapse mode**: 16x-32x speed with rendering optimizations (skip
  particle effects, reduce trail resolution) for watching long-term evolution
  in minutes.

### Phase 5: Deep Evolution
*Let evolution reshape not just behavior but biology.*

- [ ] **Evolvable brain size**: Brain hidden layer size becomes a gene (6-20
  neurons). Larger brains cost more energy (metabolism scales with neuron count).
  Creates a brain-size arms race with metabolic constraints.
- [ ] **Evolvable sensory range**: Vision range becomes a gene. Larger vision =
  higher metabolism. Creates specialists: myopic foragers vs far-sighted predators.
- [ ] **Evolvable body plan**: Number of body segments, turning agility, and
  maximum speed all become evolvable traits with metabolic trade-offs.
- [ ] **Reproductive strategies**: Evolve clutch size (1-3 offspring) with energy
  divided accordingly. Creates r-strategy (many cheap offspring) vs K-strategy
  (few expensive offspring) specialization.
- [ ] **Dormancy**: A brain output that puts the creature into a low-energy
  "sleep" state (very low metabolism, no movement, no perception). Could evolve
  as a starvation survival strategy.

### Phase 6: The Long Dream (far future)
*Aspirational features. May never be built. That's fine.*

- [ ] Working memory buffer (creature can "remember" last N perceptions)
- [ ] Imitation (creatures copy behaviors of nearby successful creatures)
- [ ] Environmental modification (push food, create barriers from corpses)
- [ ] Proto-language (signal patterns that carry semantic meaning)
- [ ] Multi-world instances with migration between them
- [ ] Procedural narrator that describes events in natural language
- [ ] Save/load ecosystem state
- [ ] Gallery mode: curate and share beautiful moments as screenshots/GIFs

---

## Ideas Backlog
*Unstructured ideas. Evaluate during PM review and promote to a phase if worthy.*

- Background music that evolves with the ecosystem (pitch mapped to dominant species hue)
- Heatmap overlay mode showing creature density, food density, or pheromone levels
- Creature "thoughts" tooltip - show the brain's strongest input and what it's doing
- Minimap in corner showing full world view when zoomed
- Camera/zoom system for following individual creatures
- "Genesis" mode where you manually place the first creatures and design the world
- Performance: use OffscreenCanvas + Web Workers for simulation (render on main thread)
- WebGL renderer as an optional upgrade path for 1000+ creatures
- Population carrying capacity that self-regulates based on food supply math
- Parasite creatures that are very small, attach to large creatures, drain energy slowly

---

## Session Log

### Session 1 - 2026-02-06
**Built:** Initial v1. Basic simulation with 9-10-2 brains, food foraging,
predation, reproduction, mutation. Canvas rendering with trails, glows, particle
effects. Generative audio (drone + birth pings + eat clicks). Population graph.
Stats overlay. Click to add food, shift+click to add creatures.

### Session 2 - 2026-02-06
**Built:** Major v2 upgrade. Expanded brain to 12-12-3 (added signaling inputs/output,
kin size, bias). Organic creature bodies with 5 trailing segments. Creature
selection + inspector panel with real-time neural network visualization. Food
nutrient hotspots (gaussian clustering around drifting sources). Day/night cycle.
Speed controls (1x/2x/4x). Death and predation audio. Vignette. Selection
decorations (vision range, attention lines, pulsing ring). Pause indicator.
Oldest creature stat.

**Learned:** The neural network visualization is the most compelling feature for
user engagement. Watching a creature's brain fire while it makes decisions creates
genuine connection with the simulation. Future features should prioritize things
that make the creatures feel more "alive" and their decisions more legible.

### Session 3 - 2026-02-06
**Built:** Phase 1 cognitive depth - three features in one pass:
1. Recurrent connections: 4 memory neurons (hidden[0..3] fed back as input).
   Brain is now 17-12-3. Memory nodes rendered in orange in brain viz.
2. Kin recognition: hue-similarity input at index 12. Circular distance on
   the hue wheel, normalized to -1 (opposite) to +1 (same species).
3. Corpse food (Phase 3 quick win): starvation deaths drop colored food at
   the death site. Food class extended with optional hue and energy fields.
   Renderer distinguishes plant food (green) from corpse food (creature hue).

**Learned:** All three features touch overlapping code paths (brain input array,
creature perception, world update loop), so batching them into one session was
the right call - doing them separately would have meant three passes through the
same functions. The recurrent memory spec in the roadmap was almost directly
translatable to code. Having detailed specs before implementation is valuable.
