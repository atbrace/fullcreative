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
- 23-12-5 recurrent neural network brains (19 sensory + 4 memory inputs,
  12 hidden, 5 outputs)
- Perception: nearest food (direction, distance), nearest creature (direction,
  distance, relative size, kin similarity), nearest signaler per channel
  (3 channels x direction + strength), own energy, bias
- Outputs: turn rate, speed, 3 signal channel strengths
- 4 recurrent memory neurons (hidden[0..3] fed back as input)
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
- 3 signal channels exist but creatures haven't evolved meaningful use yet
- Creature memory exists (4 recurrent neurons) but hasn't been observed producing
  complex temporal behavior yet - needs more evolution time
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

**Completed:**
- Recurrent connections (2026-02-06): 4 recurrent neurons feed hidden[0..3]
  back as input.
- Kin recognition input (2026-02-06): hue similarity to nearest creature.
- Multiple signal channels (2026-02-06): 3 independent channels with per-channel
  directional perception. Brain is now 23-12-5.
- Danger memory (2026-02-06): closed as by-design - recurrent connections and
  signal channels provide the substrate for evolved avoidance behavior.

**Phase 1 complete.** All items resolved.

### Phase 2: Environmental Richness
*Make the world worth navigating.*

A flat world with scattered food doesn't create enough selection pressure for
interesting navigation, territory, or migration strategies.

**Completed:**
- Terrain obstacles (2026-02-06): 4-7 rock formations of 2-5 overlapping circles.
  Dark formations with subtle edge glow. Creature collision with heading reflection.
  3 new brain inputs (ob.s, ob.c, ob.d) - brain now 26-12-5. Food spawn rejection
  inside obstacles. Population floor bumped to 10 (reseed 20) to compensate for
  larger brain search space.

**Remaining:** See GitHub Issues labeled `phase-2`.

### Phase 3: Social Dynamics
*Enable the emergence of cooperation, competition, and culture.*

This phase is only meaningful after Phase 1 (creatures need memory to have
social relationships) and Phase 2 (creatures need territory to compete over).

**Completed:**
- Corpse food (2026-02-06): Dead creatures drop food at their position
  colored by their hue. Only starvation deaths drop corpses.

**Remaining:** See GitHub Issues labeled `phase-3`.

### Phase 4: Spectator Intelligence
*Make the simulation legible, narratable, and shareable.*

The simulation produces emergent behavior, but the viewer needs help recognizing
and understanding it.

**Remaining:** See GitHub Issues labeled `phase-4`.

### Phase 5: Deep Evolution
*Let evolution reshape not just behavior but biology.*

**Remaining:** See GitHub Issues labeled `phase-5`.

### Phase 6: The Long Dream (far future)
*Aspirational features. May never be built. That's fine.*

**Ideas:** See GitHub Issues labeled `phase-6`.

---

## Ideas Backlog

See GitHub Issues labeled `idea`. Evaluate during PM review and promote to
roadmap if worthy: `gh issue edit <N> --add-label roadmap --remove-label idea`

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

### Session 4 - 2026-02-06
**Built:** Multiple signal channels (#1) and danger memory assessment (#2).
Completed Phase 1: Cognitive Depth.
1. Signal channels: expanded from 1 to 3 independent channels. Brain grew from
   17-12-3 to 23-12-5 (19 sensory + 4 memory inputs, 5 outputs). Each channel
   has its own directional perception (sin, cos, strength) - 9 signal inputs
   total. Universal channel colors: gold (ch0), blue (ch1), magenta (ch2) for
   visual legibility regardless of species hue. Concentric signal rings at
   different radii with phase-shifted pulsing. Brain viz colors signal
   input/output nodes by channel. Inspector shows 3 color-coded signal values.
2. Danger memory: closed as by-design. Recurrent memory + multi-channel signals
   provide the substrate for evolved predator-avoidance. An explicit "was attacked"
   input would bypass emergence. Will revisit if behavior stalls.
3. Set up GitHub Issues workflow with labels, hygiene hook, and /roadmap command.

**Learned:** Universal colors for signal channels (gold/blue/magenta) are more
legible than species-hue-colored rings. When channels have consistent colors,
viewers can learn the "visual language" and read inter-creature communication at
a glance. The decision to let danger memory emerge rather than engineer it was
the right call for this project's philosophy - every shortcut we add is one less
opportunity for evolution to surprise us. Phase 1 is now complete.

### Session 5 - 2026-02-06
**Built:** Population stability fix. Planned terrain obstacles (#3).
1. Discovered via Playwright visual QA that the ecosystem was collapsing -
   population would crash to 1 creature within 30 seconds and never recover.
   Root cause: auto-reseed only triggered at population 0, not near-extinction.
2. Added population floor: when pop drops below 5, reseed with 10 fresh
   random creatures. This single change transformed the simulation. Benchmarked
   across 3 trials: all recovered to 39-46 creatures within 60 seconds.
3. Tested increasing ENERGY_INITIAL from 80 to 100 - this was WORSE. Higher
   initial energy lets bad random brains linger longer, occupying population
   slots and slowing evolution. Reverted. Strong selection pressure is a feature.
4. Planned terrain obstacles (#3) for Phase 2. Full implementation plan written
   covering: Obstacle class, rock formation generation, creature collision,
   3 new brain perception inputs (ob.s/ob.c/ob.d), food spawn rejection,
   rendering as dark formations with edge glow, brain viz coloring.

**Learned:** Visual QA via Playwright headless browser is invaluable - the
population collapse was invisible from code review alone. Benchmark-driven
tuning (3 parallel trials, 5-second sampling) gives clear signal that intuition
misses. The counterintuitive finding about initial energy (lower is better
because it accelerates selection) reinforces the project philosophy: don't
engineer solutions, let evolution find them. The population floor provides a
safety net without weakening selection pressure.

### Session 6 - 2026-02-06
**Built:** Terrain obstacles (#3) - first Phase 2 feature.
1. Rock formation generation: 4-7 formations of 2-5 overlapping circles each,
   placed with margin constraints (away from edges, center, hotspots, each other).
   ~15-25 obstacle circles per world. Gaussian spread within formations creates
   natural-looking irregular rock clusters.
2. Creature perception: 3 new brain inputs (ob.s, ob.c, ob.d) for nearest obstacle
   surface direction and distance. Brain grew from 23-12-5 to 26-12-5 (22 sensory +
   4 recurrent). Obstacle inputs colored slate blue in brain visualization.
3. Creature collision: push-out to obstacle surface + heading reflection. Dot-product
   check prevents double-reflection when already moving away.
4. Food spawn rejection: retry loop (up to 10 attempts) rejects food positions
   inside any obstacle circle. Squared distance check avoids sqrt.
5. Rendering: dark radial gradient body (source-over) + subtle edge glow ring
   (lighter blend). Trail canvas masks obstacle interiors each frame.
6. Population floor bumped from 5/10 to 10/20 to compensate for the larger brain
   search space - random 26-input brains are less likely to stumble into food-seeking
   behavior than 23-input ones.

**Learned:** The Session 5 prediction was correct - going from 23 to 26 brain
inputs made evolution significantly harder to bootstrap. Initial benchmarks showed
population stuck at 5-8 (floor level). Bumping the population floor to 10/20 fixed
it: evolution now bootstraps in ~30 seconds, then population booms to 60-80 before
natural carrying capacity dynamics create boom-bust cycles. The boom-bust pattern is
actually more interesting to watch than a flat steady state - it creates narrative
(expansion, resource depletion, crash, recovery). Obstacle collision and food
rejection both verified via Playwright: 0 creatures and 0 food inside obstacles.
