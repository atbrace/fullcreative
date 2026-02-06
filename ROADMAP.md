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
- 29-12-5 recurrent neural network brains (25 sensory + 4 memory inputs,
  12 hidden, 5 outputs)
- Perception: nearest food (direction, distance), nearest creature (direction,
  distance, relative size, kin similarity), nearest signaler per channel
  (3 channels x direction + strength), own energy, bias, nearest obstacle
  (direction, distance), pheromone gradient (direction, intensity)
- Outputs: turn rate, speed, 3 signal channel strengths
- 4 recurrent memory neurons (hidden[0..3] fed back as input)
- Genetic traits: hue (color lineage), body size, speed multiplier
- Organic body rendering with 5 trailing segments
- Food spawning clustered around 5 drifting nutrient hotspots (gaussian distribution)
- Predation: creatures 1.35x larger can eat smaller ones
- Asexual reproduction with brain mutation and gene drift
- Generative ambient audio (drone + birth/death/eat/predation sounds)
- Day/night cycle affecting food spawn rate and visual atmosphere
- Terrain obstacles (rock formations with collision and brain perception)
- Current zones (drift forces with quadratic falloff)
- Seasonal cycles (food abundance modulation over 14400-tick periods)
- Pheromone grid (chemical trails that persist, diffuse, and decay)
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
- Environmental richness (obstacles, currents, seasons) creates varied selection pressure
- Pheromone trails create landscape-scale chemical memory

### What Needs Improvement
- Creatures don't develop complex behaviors beyond basic foraging
- 3 signal channels exist but creatures haven't evolved meaningful use yet
- Pheromone inputs exist but evolved pheromone-following behavior not yet observed
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
- Corner-trapping fix (2026-02-06): Random heading perturbation on wall bounce +
  soft wall repulsion near edges. Prevents creatures from accumulating in corners.
- Current zones (2026-02-06): 2-4 drift force zones with quadratic falloff. Zones
  slowly drift and rotate. Creates migration highways and territory disruption.
  Subtle flow streak visualization.
- Seasonal cycles (2026-02-06): Long-period food abundance modulation (14400 ticks
  = 4 day cycles). Food spawn rate 0.5x in winter to 1.2x in summer. Hotspots drift
  faster in winter (resource instability). Seasonal color temperature shift. Season
  indicator in stats panel.

**Phase 2 complete.** Remaining items (#6 Toxic zones, #7 Food chain depth)
stashed as ideas - the environment is rich enough. Obstacles, currents, and
seasons create sufficient navigation pressure.

### Phase 3: Social Dynamics
*Enable the emergence of cooperation, competition, and culture.*

This phase is only meaningful after Phase 1 (creatures need memory to have
social relationships) and Phase 2 (creatures need territory to compete over).

**Completed:**
- Corpse food (2026-02-06): Dead creatures drop food at their position
  colored by their hue. Only starvation deaths drop corpses.
- Pheromone system (2026-02-06): Creatures deposit chemical trails that persist,
  diffuse, and decay. Grid-based system (~20px cells, double-buffered diffusion).
  3 new brain inputs (ph.s, ph.c, ph.v) for gradient direction and local
  intensity. Brain grew from 26-12-5 to 29-12-5 (25 sensory + 4 recurrent).
  Obstacle masking prevents pheromone diffusion through rocks. Rendered as warm
  amber glow overlay. Population floor bumped to 18/33 for larger brain.

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

### Session 7 - 2026-02-06
**Built:** Three Phase 2 features + a bug fix.
1. Corner-trapping fix (#40): Creatures were accumulating in wall corners due to
   axis-aligned bounce reflections creating deterministic oscillation loops. Fix:
   random heading perturbation on wall bounce (+/- 0.3 rad) breaks oscillation,
   plus soft wall repulsion within 30px of edges steers heading inward at 8%
   correction strength. Subtle enough to not override brain decisions.
2. Current zones (#4): 2-4 drift force zones generated at world seed. Each zone
   has position, radius, angle, and strength. Quadratic falloff (force * falloff^2)
   creates natural-feeling push. Zones slowly drift position and rotate direction
   over time. Creatures inside zones get pushed along the flow direction. Rendered
   as very subtle blue-tinted glow + animated flow streaks (5 per zone). No brain
   inputs added - creatures feel the physical push and adapt through natural
   selection rather than explicit perception.
3. Seasonal cycles (#5): Sinusoidal cycle over 14400 ticks (4x day period). Food
   spawn rate modulated from 0.5x (winter) to 1.2x (summer). Hotspot drift speed
   increases in winter (resource instability). Seasonal color temperature shift on
   trail canvas (warm amber in summer, cool blue in winter). Hotspot glow intensity
   dims in winter. Season name displayed in stats panel (spring/summer/autumn/winter).
4. Phase 2 now has 3 features complete (obstacles, currents, seasons) + bug fix.

**Tuning (post-benchmark):** Headless Playwright benchmark revealed critical issues.
A/B tested 4 configs x 3 trials each to isolate effects:
- Original current strength (0.35) suppressed evolution bootstrap in all configs.
  Root cause: even small position displacement disrupts random brains' already-slim
  chance of accidentally finding food during early evolution.
- Winter food reduction (0.5x) created survival bottlenecks that killed fragile
  early populations before they could evolve robust food-finding.
- Baseline (no currents/seasons) also had unreliable bootstrap - 26-input brains
  have a large random search space.
Fixes applied: (1) Current strength 0.35 -> 0.08 with larger radius (200-450px).
Gentle enough to not affect individual pathfinding but creates population-scale drift.
(2) Winter food rate 0.5x -> 0.7x. Still noticeable scarcity, no longer lethal.
(3) Population floor 10/20 -> 15/30 with smart reseeding: 50% mutated offspring
of highest-energy survivors, 50% random. This is more realistic (survivors
reproduce to fill niche) and dramatically improves evolution reliability. Avg max
generation jumped from 10.2 to 34.6 across 5 long-run trials.

**Learned:** Current zones without brain inputs is the right call for this project.
Benchmark-driven tuning is essential - the original parameters looked reasonable
in theory but measurably suppressed evolution. The smarter population floor was
the biggest improvement: survivor offspring build on whatever marginal advantages
evolution has found, so even without population explosions, genetic quality
steadily improves. An unexpected emergent dynamic: corpse food accumulates during
winter (more deaths, fewer consumers), so food count climbs from 180 to 230.
Surviving creatures benefit from abundant winter corpse food heading into spring.
Winter avg pop 21.4 vs summer avg pop 26.5 - a 24% seasonal difference.

### Session 8 - 2026-02-06
**Built:** Pheromone system (#8) - first Phase 3 feature. Closed Phase 2 by
stashing remaining items (#6, #7) as ideas.

1. PheromoneGrid class: Low-resolution grid (~20px cells, ~2500 cells for a
   1280x800 world). Double-buffered Float32Array for diffusion. Each tick,
   every creature deposits a fixed amount (0.25) at its position. Every 4 ticks,
   the grid diffuses (4% spread to 4 neighbors) and decays (1.2% per step).
   Obstacle masking prevents pheromone from accumulating or diffusing through
   rock formations - creates "pheromone shadows" behind obstacles.
2. Creature perception: 3 new brain inputs at indices 22-24:
   - ph.s: sin(relative angle to pheromone gradient)
   - ph.c: cos(relative angle to pheromone gradient)
   - ph.v: local pheromone intensity (0-1, clamped at PH_MAX_VIZ=8)
   Brain grew from 26-12-5 to 29-12-5 (25 sensory + 4 recurrent).
3. Rendering: Pheromone grid rendered as warm amber glow overlay via offscreen
   canvas at grid resolution, scaled up with bilinear interpolation. Uses
   'lighter' blend mode. Very subtle - visible but not distracting.
4. Brain visualization: Pheromone input nodes colored warm amber, distinct from
   memory (orange), obstacle (slate blue), and signal (channel-specific) nodes.
5. Phase 2 cleanup: Stashed #6 (toxic zones) and #7 (food chain depth) as ideas.
   The environment is rich enough with obstacles, currents, and seasons.

**Tuning:** Population floor bumped 15/30 -> 18/33 to compensate for larger
29-input brain search space. 3-trial benchmark confirmed: avg max gen jumped
from 15.3 (MIN_POP=15) to 28.0 (MIN_POP=18), avg births from 125 to 556.
Pheromone coverage stabilizes at ~77% of grid cells. Max pheromone values reach
15-26 in high-traffic areas.

**Learned:** The pattern continues: each brain size increase needs a proportional
population floor adjustment. 23 inputs needed floor 10, 26 needed floor 15, 29
needs floor 18. The relationship is roughly 5-6 extra floor per 3 inputs. This
is because random brains with more inputs have lower probability of accidentally
finding food - more weights initialized randomly means the useful signal-to-noise
ratio in the initial population drops. Smart reseeding (survivor offspring)
remains the key mechanism that makes this tractable at all. Two new ideas logged:
species-scented pheromones (#42) and evolvable deposition rate (#43).
