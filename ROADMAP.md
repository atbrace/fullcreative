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
- 32-12-8 recurrent neural network brains (28 sensory + 4 memory inputs,
  12 hidden evolvable 4-20, 8 outputs)
- Perception: nearest food (direction, distance), nearest creature (direction,
  distance, relative size, kin similarity), nearest signaler per channel
  (3 channels x direction + strength), own energy, bias, nearest obstacle
  (direction, distance), pheromone gradient (direction, intensity)
- Outputs: turn rate, speed, 3 signal channel strengths, energy share, mate,
  pheromone deposition intensity
- 4 recurrent memory neurons (hidden[0..3] fed back as input)
- Genetic traits: hue (color lineage), body size, speed multiplier
- Organic body rendering with 5 trailing segments
- Food spawning clustered around 5 drifting nutrient hotspots (gaussian distribution)
- Predation: creatures 1.35x larger can eat smaller ones
- Asexual and sexual reproduction with brain mutation and gene drift
- Generative ambient audio (drone + birth/death/eat/predation sounds)
- Day/night cycle affecting food spawn rate and visual atmosphere
- Terrain obstacles (rock formations with collision and brain perception)
- Current zones (drift forces with quadratic falloff)
- Seasonal cycles (food abundance modulation over 14400-tick periods)
- Pheromone grid (chemical trails that persist, diffuse, and decay)
- Creature inspector with real-time neural network visualization
- Species tracking (12 named species via hue buckets), stacked population chart
- Energy sharing between creatures, mate selection
- Speed controls (1x/2x/4x/16x/32x time-lapse)
- Save/load ecosystem state (JSON files, keyboard s/l)
- Behavioral mode indicators (foraging/hunting/fleeing/sharing/mating arcs)
- Cooperation lines (teal network lines between cooperative kin)
- Territory boundaries (subtle borders where species pheromone zones meet)
- Brain-controlled pheromone deposition (8th output modulates gene max rate)
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
- Cooperation is visible (cooperation lines, territory boundaries, mode arcs)
  and the cooperative singularity is fixed (Session 23: diminishing returns).
  Different runs now converge on different strategies (solitary, cooperative,
  mixed). Predation persists at 7.7% of deaths past generation 100+.
- Brain sizes stabilized: mean 10.7 with range [4, 15] (was floor-hugging at
  5.5-10.2). Cognitive diversity exists but larger brains (>14) are still rare.
- 3 signal channels are confirmed evolved noise (Session 11)
- Long-term stability (200+ generations) still needs investigation:
  does predation hold? Do strategies diversify further or reconverge?

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
- Energy sharing (2026-02-06): New brain output (index 5, "shr") controls energy
  transfer. When shareOut > 0.1 and nearest creature within 20px, energy flows from
  donor to recipient (rate * shareOut per tick, 85% efficiency). Green ring visual.
  No new brain inputs - creatures use existing nearest-creature + kin perception to
  decide when to share. Green particles at sharing midpoint.
- Mate selection / Sexual reproduction (2026-02-06): New brain output (index 6,
  "mat") controls mating willingness. When creature has energy > reproduce threshold
  and mateOut > 0.3, searches nearby creatures (within 25px) for willing mates.
  If found: Brain.crossover() produces child with uniform crossover of both parents'
  weights + genes averaged + mutation. Mate pays 15% energy cost. If no mate found:
  asexual reproduction (clone + mutate) as fallback. Pink ring visual for mate signal.
  Brain grew from 29-12-5 to 29-12-7 (2 new outputs, no new inputs).

**Phase 3 complete.** All items resolved.

### Phase 4: Spectator Intelligence
*Make the simulation legible, narratable, and shareable.*

The simulation produces emergent behavior, but the viewer needs help recognizing
and understanding it.

**Completed:**
- Species tracking system (2026-02-06): 30-degree hue buckets (12 species).
  SpeciesTracker class tracks population per species over time.
- Species naming (2026-02-06): Fixed names per bucket (Kora, Vashi, Naia, etc).
  Shown in stats panel and creature inspector.
- Stacked species population chart (2026-02-06): Replaced monochrome line with
  stacked area chart colored by species hue. Immediate visual storytelling.

- Evolvable brain size (2026-02-07): Hidden layer is now a gene (range 4-20,
  default 12). 8% mutation rate per reproduction. Metabolic cost proportional
  to brain size creates selection pressure. Variable-size crossover for sexual
  reproduction. Inspector shows brain architecture dynamically.

**Phase 4 complete.** All items resolved.

### Phase 5: Deep Evolution
*Let evolution reshape not just behavior but biology.*

The bridge from Phase 4: evolvable brain size proved that creatures can evolve
different biological parameters, not just weight values. Phase 5 extends this
to create genuine strategic diversity - the point where "species" stops being a
hue bucket and starts meaning "a creature with a different survival strategy."

The core diagnosis: after 18K ticks of evolution, creatures forage and little
else. Signals are noise, pheromone-following hasn't emerged, social behavior is
random. The infrastructure is rich but selection pressure is weak. Phase 5 must
create pressure for differentiation, not just more evolvable parameters.

Three pillars:
1. **Kin recognition via pheromones** - species-scented trails create tribe-like
   territory, making signals and sharing meaningful within kin groups
2. **Evolvable sensory range** - vision/detection tradeoff creates scout vs.
   territorial archetypes
3. **Niche food types** - dietary specialization creates ecological roles and
   reduces competitive exclusion

Phase 5 is complete when: a viewer can watch the simulation and observe that
different species genuinely behave differently - not just different colors doing
the same thing.

**Completed:**
- Species-scented pheromones (2026-02-07): 12-layer pheromone grid with kin/foreign
  trail perception. Brain inputs 25-28 (kp/fp direction + intensity).
- Evolvable sensory range (2026-02-07): Gene senseRange (60-200, default 130) with
  metabolic cost 0.0002/unit/tick. Creates scout vs territorial archetypes.
- Niche food types (2026-02-07): Two food types (flora near hotspots, mineral near
  obstacles) with evolvable diet gene and diet-weighted perception. Mineral food
  rendered cyan, flora green. Creatures evolve dietary specialization with spatial
  niche separation.

**Phase 5 complete.** Remaining ideas (#21 dormancy, #19 evolvable body plan, #49
sparse brain init) stashed. The three pillars (kin pheromones, sensory range, niche
food) create genuine strategic diversity.

### Post-Phase 5: Behavioral Pressure
*Creating selection pressure for complex behavior.*

The simulation has rich infrastructure (32-input brain, pheromones, signals, sharing,
mating) but creatures mostly just forage. This phase addresses the missing link:
selection pressure that rewards using the brain's social/perceptual capabilities.

**Completed:**
- Predation pressure tuning (2026-02-06): PREDATION_RATIO 1.35->1.18,
  PREDATION_RANGE 2.5->6, PREDATION_STRIKE 0.5->1.0, PREDATION_EFFICIENCY
  0.45->0.55. Predation doubled to ~10% of deaths. Brain evolution reversed
  direction (now evolves UP). Share/mate variance improved +43%/+18%.
- Era detection and ecosystem storytelling (2026-02-06): 7 named eras with
  30-sample sliding window and 10-second hysteresis. Displayed in stats panel.
- Brain complexity visual indicator (2026-02-06): Heading dot scales with
  brainSize gene. Glow halo for brain > 14.
- Aging and senescence (2026-02-07): soft metabolism increase past 50s of age.
  Caps max lifespan, creates 10x more generational turnover.
- Cooperative hunting (2026-02-07): predator kin reduce effective predation ratio.
  Pack formation rate 61.6%.
- Sharing economics redesign (2026-02-07): kin-only sharing + cooperative foraging
  bonus. Cooperation maintained at 52-56%.
- Evolvable pheromone deposition (2026-02-07): phDeposit gene evolves
  bidirectionally (stealth vs loud trail strategies).

### Phase 6: The Long View
*Stop adding mechanics. Make emergence visible. Give evolution time.*

Twenty sessions of bottom-up infrastructure building have created a rich simulation
engine, but the gap between "what the architecture enables" and "what a viewer can
see" is the central remaining problem. Cooperation, pheromone-following, and pack
formation all exist as statistical phenomena measurable in benchmarks - but they're
invisible on screen. The north star moment ("Wait, did that creature just...?")
requires two things: (1) the viewer can see what creatures are doing, and (2)
evolution has enough time to discover complex strategies.

This phase deliberately stops adding new mechanics. The simulation has enough moving
parts. What it lacks is legibility and persistence.

**Three priorities, in order:**

1. **Save/load ecosystem state (#28)** [P1-high]
   Every simulation currently starts from scratch and runs for ~15 minutes. Complex
   behaviors may need thousands of generations, not dozens. Save/load lets a viewer
   grow an ecosystem over days - returning to find their population has evolved new
   strategies overnight. This also creates emotional investment: "my ecosystem."

2. **Emergence visibility (#70)** [P1-high]
   Make existing emergent behaviors visible to the naked eye. Behavioral mode
   indicators (foraging/hunting/sharing/mating), cooperation lines between sharing
   creatures, territory boundary rendering where species pheromone concentrations
   meet. Every indicator must be subtle enough to preserve the aesthetic. The goal
   is not a data dashboard - it's making the simulation self-documenting.

3. **Pheromone as brain output (#61)** [P1-high]
   The single remaining mechanic worth adding. Transform pheromone deposition from
   a fixed gene into a brain output: creatures choose when and where to mark
   territory. Deposit heavily near food, go silent in enemy territory, mark paths
   for kin. Because pheromone inputs are already proven functional (Session 18),
   the receiver side of this communication channel already works. This is the
   closest the architecture can get to intentional proto-communication.

Phase 6 is complete when: a viewer can watch a saved ecosystem that has been
evolving for 10,000+ generations and observe at least one behavior they would
describe as "purposeful" or "surprising" without any prompting.

### Phase 7: Narrative Emergence
*Make evolution open-ended and visible at human timescales.*

Twenty-three sessions built a technically impressive evolutionary engine. A gen-630
save file proved that the simulation produces genuine emergent dynamics: cooperation,
dietary specialization, cognitive investment, strategic diversity. But it also proved
the simulation **converges**. By generation 630, every physical trait is at its genetic
ceiling, one species dominates, cooperation is declining, predation has faded, and
the trait timeline is flat. The ecosystem reaches a steady state and stays there.

The gap between "what the engine produces" and "what a viewer experiences" is the
final problem. The simulation creates **statistical emergence** (measurable in
benchmarks) but not **narrative emergence** (observable by watching). A nature
documentary doesn't work because the ecosystem is complex - it works because the
camera follows individual stories within that complexity.

**Two problems, in order:**

1. **Convergence.** The trait space is bounded and evolution exhausts it. All
   creatures converge on one "max everything" phenotype because the metabolic costs
   scale linearly while the foraging advantages scale multiplicatively. Without
   disruption, there's no narrative after generation ~400.

2. **Legibility.** Even when interesting things happen, they're invisible. Predation
   is a one-tick size comparison. Cooperation is an invisible energy transfer. The
   camera shows either everything (overview) or one creature (follow). There's no
   middle ground where individual behavior is visible in social context.

**Mechanical changes (prevent convergence):**

- **Steeper metabolic trait costs (#75)** [P1-high] - Quadratic speed costs and
  steeper size exponent make "max everything" unsustainable. Forces trait
  specialization: scouts, tanks, homebodies, specialists. Which traits to
  sacrifice is up to evolution.

- **Environmental catastrophes (#76)** [P1-high] - Rare stochastic events (droughts,
  habitat shifts, species plagues, impacts) that break equilibrium and force
  re-adaptation. Creates boom-bust-recovery narrative arcs.

- **Multi-tick predation (#77)** [P1-high] - Chase sequences that unfold over
  0.5-1.0 seconds instead of instant kills. Gives prey brains time to react,
  creating selection pressure for evasive behavior. The "wait, did that creature
  just run away?" moment.

**Presentational changes (make emergence visible):**

- **Auto-camera documentary mode (#78)** [P2-medium] - Smart camera that finds and
  follows active chases, cooperative clusters, species encounters, ancient creatures.
  Transforms passive viewing into curated nature documentary experience.

- **Lineage tracking and visualization (#79)** [P2-medium] - Visible evolutionary
  history on creatures. Ancient lineages glow differently from newcomers. Ghost
  pheromone traces show where extinct species used to live. Emotional investment
  in family lines.

Phase 7 is complete when: a viewer can start documentary mode on a saved ecosystem
and watch for 30 minutes without touching anything, seeing visible predation chases,
cooperative clustering, species competition, catastrophe-driven adaptation, and
individual creatures whose lineage they care about.

### Phase 8: The Long Dream (far future)
*Aspirational features. May never be built. That's fine.*

**Ideas:** See GitHub Issues labeled `phase-6`.

---

## Ideas Backlog

See GitHub Issues labeled `idea`. Most are investigations or mechanics that were
valuable to consider but are not on the critical path. The project does not need
more moving parts - it needs to make existing emergence visible and give evolution
time. Evaluate during PM review and promote only if they serve legibility or
persistence: `gh issue edit <N> --add-label roadmap --remove-label idea`

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

### Session 9 - 2026-02-06
**Built:** Energy sharing (#9) and mate selection (#10) - completing Phase 3.

1. Energy sharing: New brain output "shr" (index 5) controls energy transfer
   intensity. When shareOut > 0.1 and nearest creature is within 20px, energy
   transfers at (shareOut * 0.8) per tick with 85% efficiency. Donor loses energy,
   recipient gains 85% of it. Cannot self-deplete below 1 energy. Subtle green
   particles spawn at the midpoint between sharer and recipient (every 8 ticks).
   Green ring visual when shareOut > 0.15. No new brain inputs - creatures already
   perceive nearest creature direction, distance, size, and kin similarity.
2. Mate selection / Sexual reproduction: New brain output "mat" (index 6) controls
   mating willingness. When a creature has energy > ENERGY_REPRODUCE and mateOut >
   0.3, it searches within 25px for another creature with mateOut > 0.3 and energy
   > 60. If found: sexual reproduction via Brain.crossover() (uniform crossover -
   each weight randomly from parent A or B) + mutation. Child genes are averaged
   from both parents with drift. Mate pays 15% energy cost. If no willing mate
   found: falls back to asexual reproduction (clone + mutate). Pink ring visual
   when mateOut > 0.25. Particle burst on both parents during sexual birth.
3. Brain grew from 29-12-5 to 29-12-7 (2 new outputs, no new inputs). Total weight
   count increased ~7% (from ~425 to ~451). No population floor adjustment needed.
4. Inspector updated with share and mate output values in new row.
5. Brain viz updated: share output colored green, mate output colored pink.
6. World now tracks sexualBirths counter for benchmarking.

**Benchmark (2 trials x 18000 ticks):**
- Trial 1: gen 16, pop avg 28.3, 291 births (10 sexual), min pop 18, all PASS
- Trial 2: gen 20, pop avg 26.5, 100 births (0 sexual), min pop 18, all PASS
- No population floor adjustment needed: 2 new outputs add only ~7% weights
- Sharing and mating outputs start as random noise (~0.5 avg) from unoptimized
  brains. Most creatures randomly "share" and "mate-signal" but actual energy
  transfer is rare (requires <20px proximity) and sexual reproduction is
  opportunistic (requires both creatures willing + close + energy thresholds)

**Learned:** Adding outputs is much cheaper than adding inputs for evolution.
Inputs multiply the input-hidden weight matrix (29 * 12 = 348 weights per 29
inputs), while outputs only add to the smaller hidden-output matrix (12 * 7 = 84
total). This means we can add behavioral outputs more freely than sensory inputs
without impacting evolution bootstrap. The fallback-to-asexual design for mating
is critical: if sexual reproduction were the only option, random creatures would
need to independently evolve (1) food-finding, (2) mate-finding, and (3) mutual
signaling all at once - an impossibly large search space. Asexual fallback means
food-finding evolves first, then mating behavior can emerge gradually on top of
an already-viable population. Phase 3: Social Dynamics is now complete.

### Session 10 - 2026-02-06
**Built:** Species tracking (#11), species naming (#12), stacked population
chart (#13) - first three Phase 4 features.

1. SpeciesTracker class (new file: src/species.js): Clusters creatures into
   species by hue bucket (30-degree bands, 12 possible species). Each bucket
   maps to a fixed name: Kora, Vashi, Naia, Zelith, Thura, Shiko, Mori, Loxa,
   Pavi, Suri, Jera, Rixa. Tracks population per species over time (600-sample
   history), records first appearance tick and peak population per species.
   Called every 10 ticks alongside existing popHistory.
2. Stacked species population chart: Replaced the monochrome population line
   graph with a stacked area chart. Each species gets its own band colored by
   average hue. Pre-computes cumulative stacks from species history. Draws
   filled bands with semi-transparent fills (0.18 alpha) and subtle top-edge
   strokes (0.35 alpha). Uses efficient flat array lookup for per-entry counts.
3. Species naming in stats panel: The "species" stat now shows the top 3 species
   by name and population count, colored by hue. E.g., "Jera 10 Rixa 9 Pavi 5 +2".
   Species name also appears in the creature inspector below the creature ID.
4. Architecture: added species.js to load order between pheromones and creature.
   10 source files total now.

**Benchmark (18000 ticks):** All health checks PASS. Species consolidation
works as expected - starts at 10 species (random initial hues), reduces to 2-3
as dominant lineages emerge, then reseeding introduces new species during
population floor events. Final state: 7 species with clear population leader.
No performance regression - species tracking is lightweight (12-bucket Int32Array
count per sample, no per-creature allocations).

**Learned:** The 30-degree hue bucket approach is simple but effective. It
matches the existing `countSpecies()` logic and creates 12 possible species -
enough for visual diversity without being overwhelming. The stacked chart
immediately makes speciation dynamics visible: you can watch one color expand
while others shrink, telling a story about competition. The fixed species names
make each bucket feel like a character in the narrative. Phase 4 is now 50%
complete (3 of 6 items closed).

### Session 11 - 2026-02-06
**Built:** Event detection and log (#14), signal investigation (#41),
time-lapse mode (#16) - completing Phase 4 except for evolvable brain size.

1. EventLog class (new file: src/events.js): Detects and displays ecosystem
   narrative events in a subtle DOM overlay at bottom-left. 7 event types:
   species extinction (pop drops from >= 3 to 0), species emergence (rises from
   0 to >= 2), population boom (>50% increase over 100 ticks), population crash
   (<60% over 100 ticks), season changes, predation sprees (>= 5 kills in 120
   ticks), and generation milestones (10, 25, 50, 100, 200, 500, 1000). Events
   fade in over 400ms, stay visible for 5s, fade out over 3s. Per-key cooldowns
   (1.5s) prevent spam at high speeds. Colored by event type and species hue.
2. Signal channel investigation (#41): Benchmark analysis at 30000 ticks with
   2648 creature observations. Verdict: signals are evolved noise, not functional
   communication. Bimodal distribution (28-46% low, 29-46% high) is a tanh
   saturation artifact. Species have different signal profiles (lineage weight
   artifacts, not communication). Energy correlation is negligible (0.01-0.06).
   sg2 drifts upward over generations (genetic drift, not function). This is
   expected: functional signaling requires co-evolution of sender AND receiver.
3. Time-lapse mode: Extended speed controls from {1x, 2x, 4x} to include
   {16x, 32x} with a visual separator between normal and time-lapse speeds.
   At speeds > 4x, individual audio events (birth, eat, death, predation) are
   muted via a silent proxy while the ambient drone continues. Trail fade rate
   adjusts with log2(speed) * 0.5 scaling to keep trails proportional. Keyboard
   shortcut 't' toggles between 16x and 32x. Pairs beautifully with the event
   log: fast-forward at 32x and watch the narrative unfold.

**Benchmark (2 trials x 18000 ticks):** All health checks PASS both runs.
Event log integration adds zero measurable overhead. Time-lapse rendering
adjustments verified visually. Second trial showed excellent long-term dynamics:
generation 28 reached, population boomed to 56, species consolidated from 10
to 3 dominant lineages (Thura 23, Shiko 22, Mori 8), 8 sexual births.

**Learned:** Signal channels are not being used for communication at current
evolutionary timescales. This is not a bug - it's the expected outcome given
that functional signaling requires simultaneous co-evolution of sender encoding
and receiver decoding, a much harder optimization problem than individual food-
finding. Options for future: (a) wait for longer evolution via time-lapse mode,
(b) add direct selection pressure for signaling (e.g., predator warnings that
help kin), (c) reduce the signal space to make accidental coordination more
likely. The event log transforms the viewing experience from passive watching
to narrative engagement - "Zelith went extinct" and "population boom" create
a story that the stacked chart illustrates. Phase 4 is now 80% complete
(5 of 6 items, #17 evolvable brain size remains as P1-high).

### Session 12 - 2026-02-07
**Built:** Evolvable brain size (#17) - completing Phase 4: Spectator Intelligence.

1. Brain size as a gene: `genes.brainSize` is an evolvable integer (range 4-20,
   default 12). Each reproduction has 8% chance of +/-1 mutation. This creates
   a new axis of evolution: creatures can evolve larger brains for more complex
   behavior or smaller brains for lower metabolic cost.
2. Brain metabolism: added brain cost (brainSize * 0.003 per tick) to the
   metabolism formula. This creates genuine selection pressure - bigger brains
   must earn their keep through better food-finding to offset the cost.
3. Variable-size crossover: `Brain.crossover(a, b, targetNh)` handles parents
   with different hidden layer sizes. Shared neurons (index < min) get uniform
   crossover, extra neurons copy from the larger parent, neurons beyond both
   parents get small random initialization. Clean and biologically inspired.
4. Brain resize: `Brain.resized(newNh)` for asexual reproduction with size
   mutation. Shared neurons keep their weights, new neurons get small random
   init. Preserves evolutionary progress while allowing exploration.
5. Inspector shows brain size ("12h") and dynamic architecture label
   ("NEURAL NETWORK 29-12-7") that updates per creature.
6. Population floor reseeding now inherits brainSize gene from survivors and
   applies brain size mutation.

**Benchmark (2 trials x 18000 ticks):** All health checks PASS both runs.
- Trial 1: brain range [10, 13], avg 11.9. Gen 18, pop avg 25.8, 0 floor hits.
- Trial 2: brain range [11, 14], avg 12.2. Gen 23, pop avg 27.4, 0 floor hits.
- Brain sizes evolve bidirectionally: creatures with 10-11 neurons (metabolic
  advantage) and 13-14 neurons (cognitive advantage) both survive.
- Average stays near 12, suggesting the default is close to optimal for current
  environmental complexity. This should shift as the environment becomes richer.

**Learned:** Adding evolvable brain size required careful handling of three
edge cases: (a) sexual crossover between different-sized parents, (b) asexual
reproduction with size mutation, and (c) population floor reseeding with
inherited brain size. The uniform-crossover-on-shared-neurons approach is clean
and extends naturally. The metabolic cost (0.003 per neuron per tick) is subtle
but measurable - at default brain size 12, it adds 0.036/tick (about 30% of
base metabolism 0.12). This is enough to create real selection pressure without
making large brains instantly unviable. The 8% mutation rate means ~1 in 12
births change brain size, giving evolution enough variance to explore without
being too noisy. Phase 4: Spectator Intelligence is now complete.

### Session 13 - 2026-02-06
**Built:** Species-scented pheromones (#42) and evolvable sensory range (#18) -
first two Phase 5 features.

1. Species-scented pheromones: Transformed the single-layer pheromone grid into
   a 12-layer system (one per species hue bucket). Each creature deposits to its
   own species layer. Brain now perceives kin trail and foreign trail separately:
   6 pheromone inputs (kp.s, kp.c, kp.v for kin gradient direction and intensity;
   fp.s, fp.c, fp.v for foreign gradient direction and intensity) replacing the
   previous 3 undifferentiated inputs. Brain grew from 29-12-7 to 32-12-7 (28
   sensory + 4 recurrent). Pheromone overlay now colored by dominant species hue
   per cell - territories are immediately visible as colored regions on screen.
   Diffusion operates independently on all 12 species layers. Foreign gradient
   computed efficiently as total gradient minus kin gradient.

2. Evolvable sensory range: New gene `senseRange` (range 60-200, default 130).
   Wider sensing costs more metabolism (senseRange * 0.0002 per tick). Mutates
   +/-5 per reproduction, averaged between parents for sexual reproduction.
   Creates genuine tradeoff: wide-range "scouts" can detect distant food and kin
   trails but burn more energy, while narrow-range "homebodies" are cheaper to
   run but operate locally. Vision range circle in inspector now shows creature's
   actual evolved range. No new brain inputs - distance normalization naturally
   calibrates to each creature's range.

3. Population floor bumped from 18 to 21 (reseed target 36) to compensate for
   the larger 32-input brain search space. Sense metabolism factor tuned from
   0.0003 to 0.0002 after initial benchmark showed evolution suppression.

**Benchmark (2 trials x 18000 ticks):** All health checks PASS both runs.
- Trial 1: gen 23, pop avg 29.9, 218 births (6 sexual), sense range [105, 170]
- Trial 2: gen 27, pop avg 37.7, 815 births (99 sexual!), sense range [102, 151]
  - Species consolidated to 2 (Rixa 23, Jera 15) - speciation dynamics working
  - Brain size evolved upward (avg 13.2, range [10, 15]) - cognitive investment
  - Sharing output dropped to 0.235 - selfish strategy evolving
  - Mate output rose to 0.600 - mating behavior genuinely evolving

**Learned:** Species-scented pheromones + species-colored rendering is the most
visually impactful change since the stacked population chart. Watching colored
territory regions form, overlap, and recede tells an immediate story about
species competition - no explanation needed. The combination of larger brains
evolving upward and sensory range staying near default suggests that cognitive
complexity (more hidden neurons) provides more fitness benefit than wider
perception at current environmental complexity. The second benchmark trial
produced the richest dynamics yet: 99 sexual births, 2 dominant species, brain
size evolution, and mating behavior emerging. Phase 5 is now 66% complete
(2 of 3 items, #44 niche food types remains).

### Session 14 - 2026-02-07
**Built:** Evolution reliability fix (#48) and evolutionary trait timeline (#45).

1. Evolution reliability fix: Three changes to eliminate the bimodal churn/breakout
   pattern that caused ~40% of runs to stall at gen 5:
   - **Xavier/Glorot brain initialization**: Replaced fixed weight scale (uniform
     [-1, 1]) with Xavier scaling (2*sqrt(6/(fan_in+fan_out))). For the 32-input
     brain, wih weights now initialize in [-0.37, 0.37] instead of [-1, 1]. This
     prevents tanh saturation - with the old scale, pre-activation sums had stddev
     ~1.9, deep in tanh saturation where mutations barely affect output (derivative
     ~0.07). Xavier keeps neurons in tanh's linear regime (derivative ~0.5), making
     mutations 7x more effective at changing behavior.
   - **85% survivor reseeding** (was 50%): When the population floor triggers,
     85% of reseeded creatures are mutated offspring of the best survivors instead
     of 50%. This preserves evolved behavior during population crashes. The 15%
     random creatures provide genetic diversity for exploration.
   - **Hotspot-based reseeding spawn**: Reseeded creatures now spawn near random
     food hotspots (gaussian distribution, same spread as food) instead of random
     positions. This dramatically reduces early starvation death, giving both
     evolved and random creatures a better chance of finding food.

2. Evolutionary trait timeline (#45): Small line chart showing running averages of
   evolvable traits over time (brain size, sense range, body size, speed). Positioned
   above the species chart, same width (240x45px). Four colored lines: brain (orange),
   sense (cyan), size (blue-purple), speed (green). Current values displayed on right
   edge. Toggle with 'e' key. Samples alongside popHistory every 10 ticks (600-entry
   history matching species tracker).

**Benchmark methodology:** Systematic A/B testing of 7 intervention variants, each
with 5-10 runs at 18000 ticks. Tested: Xavier alone (5/5), Xavier+sparse (4/5, worse),
Xavier+lower mutation (3/5, worse), Xavier+75% survivor (5/5, 4/5 at gen>15),
Xavier+85% survivor (5/5, 5/5 at gen>15), Xavier+85%+1.0x reseed mutation (10/10,
10/10 at gen>15 but low births), Xavier+85%+hotspot spawn (10/10, 10/10 at gen>15,
209 avg births). The final variant was validated with two independent 10-run trials.

**Final results (10-run validation, 18K ticks each):**
```
Baseline (before):  gen 16.1 +/- 10.9 [5, 45],  139 births,  ~60% pass at gen>15
Final (after):      gen 38.6 +/- 8.3  [20, 51],  209 births,  100% pass at gen>15
```
All four success criteria from #48 met:
- Pass rate >= 90% at gen>15: 100% (was ~60%)
- Mean final generation >= 20: 38.6 (was 16.1)
- Mean total births >= 200: 209 (was 139)
- Gen stddev: 8.3 (was 10.9, 24% reduction; CV improved 67% to 22%)

**Learned:** The biggest insight is that tanh saturation with high-dimensional
inputs is the root cause of evolution unreliability, not parameter count per se.
With 32 inputs and uniform [-1, 1] weights, all hidden neurons are saturated,
making random brains behaviorally identical (all outputs near +1 or -1). Xavier
init creates genuine behavioral diversity in the initial population, giving
selection something meaningful to work with. The reseeding changes amplify this:
more survivor offspring preserve the small advantages that Xavier-differentiated
brains discover, and hotspot spawning gives them food access to survive on.
Interestingly, lower mutation rates made things worse despite Xavier weights being
smaller - evolution needs aggressive mutation to explore the weight space, and
Xavier prevents the old problem of mutations being ineffective due to saturation.

### Session 15 - 2026-02-07
**Built:** Energy economy rebalance + niche food types (#44) - completing Phase 5.

1. **Deep ecosystem diagnostic:** Ran 10 x 54K-tick (15 min) assessments with
   enhanced telemetry. Discovered the ecosystem was not self-sustaining: deaths
   (3219) exceeded births (2243), average creature lifespan ~10 seconds, population
   floor fired every ~14 seconds. Only 4.1% of creatures had enough energy to
   reproduce. All creatures converged on one strategy (bigger, faster, blind forager).

2. **Energy economy A/B testing:** Two rounds of A/B tests (6+3 configs, 5 runs each).
   Discovered density-dependent regulation trap: reducing metabolism increases carrying
   capacity, not lifespan. Population grows to absorb benefits. Found optimal config
   (Config G): METABOLISM_BASE 0.12->0.07, SIZE_EXP 1.4->1.2, FOOD_ENERGY 28->35,
   REPRODUCE_KEEP 0.38->0.45, REPRODUCE_GIVE 0.38->0.32. Near-sustainable B/D=0.95,
   max oldest 132s (+45%), preserves predation at 5.1%.

3. **Niche food types (#44):** Two food types with spatial separation:
   - Flora food (55%): spawns near hotspots, green glow
   - Mineral food (45%): spawns near obstacles, cyan glow, 20% energy premium
   - Evolvable diet gene (0=flora specialist, 1=mineral specialist)
   - Diet-weighted food perception: mismatched food appears up to 5x farther
   - Energy affinity: 15% of max energy for mismatched food, 100% for matched
   - Corpse food is universal (no diet penalty) - predators benefit from both niches
   - Diet-aware creature spawning: initial + reseeded creatures spawn near food
     matching the MINERAL_FOOD_RATIO probability (45% near obstacles, 55% near hotspots)
   - Inspector shows diet gene value with color coding (green/cyan/neutral)

4. **Diet specialization tuning:** Three iterative rounds of diagnostic benchmarks:
   - Round 1: Diet converged to 100% flora (creatures couldn't distinguish food types)
   - Fix 1: Diet-weighted perception (score /= max(affinity, 0.2))
   - Round 2: 37.5% of runs still collapsed to pure flora (spawn location bias)
   - Fix 2: Diet-aware spawn positions + DIET_MIN_AFFINITY 0.3->0.15 + mineral premium
   - Round 3: 80% of runs show diet diversity, 23.5% avg mineral specialists

**Final benchmark (10 x 54K ticks, all metrics):**
```
Max oldest:     106.4s (+17% from pre-session baseline)
Avg oldest:      47.4s (+25%)
Generation:       75.3
Predation:       5.58% of deaths
Species final:     4.5
Turn/Speed var:  0.44/0.42 (decent behavioral diversity)
Share/Mate var:  0.07/0.11 (still low - deeper issue)
Trait evolution:  bigger (+0.28), faster (+0.28), smaller brain (-0.18), shorter sight (-14)
Pass rate:       10/10
```

**Learned:** The biggest insight is the density-dependent regulation trap. Naive
parameter changes (lower metabolism, more food) don't improve individual creature
lifespans - they increase population until per-creature food intake returns to
baseline. The energy economy needed to be rebalanced holistically: lower metabolism
AND higher reproduction costs AND more food value, so that fewer creatures reproduce
but those that do live longer and pass on better genes.

Niche food types required three layers of design:
(a) spatial separation (flora near hotspots, mineral near obstacles),
(b) perceptual separation (diet-weighted distance scoring), and
(c) economic separation (DIET_MIN_AFFINITY=0.15 + mineral energy premium).
Without all three, diet always converged to a single strategy. The 20% failure rate
(pure flora convergence) is acceptable - in real ecosystems, niche separation is
also stochastic and not guaranteed.

Share/mate behavioral diversity remains the outstanding challenge. Low variance in
sharing and mating outputs suggests creatures haven't evolved strategic social
behavior. This likely requires either new brain architecture or new mechanics that
create direct fitness advantages for social coordination. Future work, not this session.

### Session 16 - 2026-02-06
**Built:** Predation pressure tuning (#47), era detection (#50), brain complexity
visual indicator (#46) - post-Phase-5 behavioral pressure features.

1. **Predation pressure tuning (#47):** Systematic A/B testing of predation parameters.
   Discovered the root cause of low predation (5.58% of deaths): at evolved body size
   ~1.65, the old ratio (1.35) meant predators needed size > 2.06 - above the gene max
   of 2.0. Average creatures were literally immune to predation. Final tuning:
   - PREDATION_RATIO: 1.35 -> 1.18 (wider predator-prey pairs)
   - PREDATION_RANGE: 2.5 -> 6 (wider search radius, new config param)
   - PREDATION_STRIKE: 0.5 -> 1.0 (wider contact distance, new config param)
   - PREDATION_EFFICIENCY: 0.45 -> 0.55 (hunting more rewarding)
   - Tested and rejected speed-based escape mechanic - it caused creatures to solve
     predation with raw physics (be fast) instead of cognitive responses (detect threats),
     resulting in brain size and sense range both evolving DOWN.
   - Tested ratios 1.25, 1.18, 1.15. Ratio 1.18 produced the best behavioral diversity:
     sense range evolved UP (+14), turn variance 0.56, speed variance 0.53.
   Key result: **brain size reversed from evolving DOWN (-0.18) to UP (+0.59)** under
   predation pressure. Predation kills ~3.5x baseline. Share variance +43%, mate
   variance +18%. 5/5 pass rate.

2. **Era detection system (#50):** Sliding window pattern detection (30 samples of 60
   ticks each = 30 seconds) with 10-second hysteresis. Seven era types:
   - "Dominion of [Species]" - one species >55% population (highest priority)
   - "Famine" - avg population < 27
   - "Cambrian Bloom" - 5+ species with 3+ members each
   - "The Scholars" - avg brain size > 13
   - "Age of Giants" - avg body size > 1.65
   - "The Swift" - avg speed gene > 1.4
   - "Far Sight" - avg sense range > 150
   Eras display in the stats panel and fire event log transitions. Creates narrative
   progression: Cambrian Bloom -> Dominion of X -> The Scholars as evolution unfolds.

3. **Brain complexity visual indicator (#46):** Heading dot ("eye") on creature body
   scales from 0.18x to 0.40x radius based on brainSize gene. Creatures with brain
   size > 14 get a subtle glow halo around the eye. Makes cognitive evolution visible
   at a glance without inspecting individual creatures.

**Validated benchmark (5 runs x 54K ticks):** All 5/5 PASS. Predation 9.56% of deaths
(~295 kills avg), generation 96.4, body size +0.47, speed +0.27. No regressions.

**Learned:** The most important finding is the interaction between predation pressure
and evolutionary strategy. Speed-based escape creates a pure physics solution (be big
and fast), while proximity-based predation creates cognitive pressure (detect threats,
navigate safely). This distinction is critical: the mechanic design determines whether
evolution produces interesting brain-based behavior or boring size/speed optimization.
The ratio 1.18 sweet spot (vs 1.15 or 1.25) emerged from balancing two forces: enough
predation to matter (~10%) but not so much that size growth becomes the only viable
strategy. The era system immediately transformed the viewing experience - watching
"Cambrian Bloom" give way to "Dominion of Kora" and then "The Scholars" tells a story
about what's happening without reading any numbers.

### Session 17 - 2026-02-06
**Built:** Kin proximity defense (#52), hunt cooldown (#53), ecosystem-reactive
ambient audio (#56) - social pressure and audio atmosphere features.

1. **Kin proximity defense bonus (#52):** Creatures near kin (same species hue
   bucket) are harder to eat. When a predation attempt occurs, the system counts
   nearby kin within 80px of the prey. Each kin increases the effective predation
   ratio by 0.03 (capped at +0.15). This means lone creatures are vulnerable
   (ratio 1.18) while grouped creatures are protected (ratio up to 1.33 with 5+
   kin). Creates direct survival advantage for group formation without requiring
   explicit group-seeking brain outputs - creatures benefit from spatial proximity
   to same-species neighbors.

2. **Hunt cooldown (#53):** After a successful kill, a predator can't hunt again
   for 90 ticks (1.5 seconds at 60fps). Also added "break" after kill so each
   predator processes at most one predation event per update tick. Prevents
   chain-killing and makes predation a discrete event rather than continuous
   pressure. In practice, this rarely limits predation since hunting is already
   opportunity-limited (predators don't encounter prey every 90 ticks).

3. **Ecosystem-reactive ambient audio (#56):** The background drone now responds
   to simulation state via three audio parameters:
   - Filter cutoff (brightness): driven by population health + species diversity.
     Low population/few species = muffled, dark drone. Thriving diverse
     ecosystem = brighter, more present sound.
   - LFO rate (tension): driven by predation intensity. More kills = faster
     pulsing in the filter sweep, creating subconscious unease.
   - Filter Q (resonance): driven by era type. Famine = high Q (resonant,
     tense). Bloom = low Q (smooth, peaceful). Dominion = moderate focus.
   All transitions use smooth exponential ramps (3-4 second time constants)
   so changes are felt rather than heard. Passed through the time-lapse
   audio proxy so the drone reacts even at 32x speed.

**Tuning journey:** Initial kin defense parameters (range=50, per_kin=0.015,
max=0.10) were too subtle - at typical creature density, ~0.3 neighbors within
50px, and per-kin bonus was negligible. 10-run benchmark showed zero measurable
effect on predation or behavioral diversity. Increased to range=80, per_kin=0.03,
max=0.15 which created measurable impact.

**Final benchmark (5 runs x 54K ticks):**
```
Predation % deaths:   7.24% (was 9.56% baseline - 26% reduction in kills)
Max oldest:         115.8s (was 95.9s baseline - +21%)
Share output var:     0.08 (was 0.06 - +33%)
Mate output var:      0.12 (was 0.10 - +20%)
Brain evolution:     DOWN (-0.19) (was DOWN -0.55 - stabilized near flat)
Body size:           UP (+0.38)
Speed:               UP (+0.11)
Sense range:        DOWN (-19.37) (creatures evolving shorter range)
Pass rate:           5/5
```

**Learned:** Kin defense creates conditions for social behavior (spatial grouping)
but doesn't directly reward it. Share and mate variance improved modestly because
grouped creatures are physically close enough for sharing/mating to occur more
often. But the defense is passive - creatures benefit from proximity regardless
of their social outputs. The next frontier (#57) is making the defense scale with
active social behavior (e.g. share output), which would directly reward using
the share output strategically.

The hunt cooldown has minimal quantitative impact because predation is already
opportunity-limited, not rate-limited. Its value is qualitative: it prevents the
rare scenario where a large predator enters a dense cluster and chain-kills
multiple creatures in rapid succession.

The ecosystem-reactive audio is the highest spectator-value change per line of
code this session. Three audio parameter modulations (filter cutoff, LFO rate,
filter Q) create a soundscape that unconsciously mirrors the simulation state.
Watching a famine unfold while the drone becomes darker and more resonant is
a genuinely atmospheric experience.

### Session 18 - 2026-02-07
**Built:** Camera/zoom follow system (#54), pheromone investigation (#59),
active social defense investigation (#57/#58).

1. **Camera/zoom follow system (#54):** Click a creature to smoothly zoom to
   2.5x and track it. Camera lerps at 0.06 per frame (~1 second transition).
   Both trail canvas and main canvas get camera transforms. Trail dots accumulate
   in camera space, creating a "creature-centered motion trail" when following.
   Mouse clicks reverse-transformed to world coordinates for selection and
   interaction. Camera clamped to world bounds to prevent showing empty space.
   Pressing escape or clicking empty space zooms back to overview. Dramatically
   improves the spectator experience - watching a single creature navigate
   obstacles, encounter food, and meet other creatures up close makes existing
   behaviors far more legible.

2. **Pheromone investigation (#59):** Benchmark analysis (3 trials x 54K ticks)
   reveals pheromone inputs are FUNCTIONAL (score 7/12). Key evidence: weights
   grew 36% over evolution, ph/non-ph ratio stable at 0.99, higher-generation
   creatures have 114% larger pheromone weights, inputs active 89% of the time.
   This is a significant finding - unlike signal channels (evolved noise, Session
   11), pheromone inputs ARE being used by evolved brains. The difference: pheromone
   signals are environmental (created by all creatures' movement, always present)
   and don't require co-evolution of sender AND receiver. This validates the
   pheromone system design and suggests pheromone-based mechanics are productive.

3. **Active social defense investigation (#57):** Benchmarked two variants of
   share-scaled kin defense: (a) kin defense bonus multiplied by prey's shareOut,
   (b) cooperative metabolism bonus (energy refund for kin proximity scaled by
   shareOut). Both failed 0/6 criteria across 10 total trials (5 each). Root
   cause: SHARE_RATE=0.8 makes sharing cost 100-800x more than any cooperative
   benefit. Share output naturally evolves DOWN because donors deplete themselves.
   Filed #58 for future sharing economics redesign. Reverted to Session 17's
   passive kin defense (known-good).

**Benchmark methodology:** Pheromone investigation: 6 lines of evidence (weight
magnitude ratios, temporal trajectory, energy correlation, quartile comparison,
input value structure, generational trend). Social defense: 6 success criteria
(variance increase, mean trend, fitness advantage, defense magnitude, trial
robustness, differential selection vs control). Both used Playwright headless
with 54K-tick runs.

**Learned:** The most important finding is the cost-benefit analysis of
cooperative evolution. Sharing energy at SHARE_RATE=0.8 costs 100-800x more
than any reasonable cooperative benefit. This is why shareOut trends to zero
in every trial - Hamilton's rule (r*B > C) is not satisfied. For cooperation
to evolve, the sharing cost must be reduced by ~10x or the benefits increased
by ~100x. This mirrors real evolutionary biology: altruism only evolves when
the cost-benefit ratio is favorable, which requires either very high relatedness,
reciprocal exchange (needing sophisticated memory), or group-level selection.

The pheromone result is encouraging: creatures ARE using environmental chemical
information even without explicit training. This suggests the brain architecture
(32 inputs, 4-20 hidden, 7 outputs with 4 recurrent neurons) is capable of
learning from environmental signals. The bottleneck for social behavior is not
the brain - it's the economics of cooperation.

The camera system transforms the viewing experience. Following a creature at
2.5x zoom reveals behavioral details invisible at overview scale: obstacle
navigation patterns, food approach strategies, reactions to nearby creatures.
This is the highest spectator-value feature since the stacked species chart.

### Session 19 - 2026-02-07
**Built:** Cooperative sharing economics redesign (#58) and evolvable pheromone
deposition rate (#43).

1. **Sharing economics redesign (#58):** Three changes to make cooperation
   economically viable:
   - SHARE_RATE: 0.8 -> 0.08 (10x cheaper). At shareOut=0.5, sharing costs
     0.04/tick instead of 0.40/tick. Now comparable to metabolism, not catastrophic.
   - Kin-only sharing: energy transfer only occurs to same-species creatures
     (checked by hue bucket). Eliminates wasteful sharing with competitors.
   - Cooperative foraging bonus (new mechanic): when a creature with shareOut > 0.1
     is within 50px of kin who also have shareOut > 0.1, it gets CFG.COOP_BONUS
     (0.05) energy/tick per cooperative kin (max 3). This is mutualism - both
     cooperators benefit directly. Gated by shareOut threshold so free-riders
     (shareOut < 0.1) don't get the bonus.

   Economics with 1 cooperative kin: cooperator gains +0.044/tick net,
   free-rider gains +0.034/tick. With 2+ cooperative kin, cooperators clearly
   dominate. Hamilton's rule now satisfied.

2. **Evolvable pheromone deposition rate (#43):** New gene phDeposit (range
   0.05-0.60, default 0.25, mutation 0.03). Creatures deposit their evolved
   amount instead of the global constant. Metabolic cost: phDeposit * 0.06
   per tick. Creates "loud" vs "stealth" trail strategies. Inspector shows
   "scent" value, trait timeline tracks it as amber line.

**Benchmark methodology:** Two 10-trial x 54K-tick benchmark runs for sharing
redesign (COOP_BONUS=0.03 scored 5/7, COOP_BONUS=0.05 scored 6/7). One 10-trial
run for pheromone deposition (5/6).

**Sharing benchmark (10 runs x 54K ticks, COOP_BONUS=0.05):**
```
Share mean (first):     0.556
Share mean (last):      0.542  (maintained, not crashed to 0.2 like old system)
Share slope:           +0.003  (positive selection)
Cooperation rate:       52.5%  (>half of creatures cooperating)
Mean generation:        54.5   (no regression)
Mate slope (control):  -0.010  (share selected FOR, mate drifting down)
Trials with positive:  6/10    (majority positive)
```

**Pheromone deposition benchmark (10 runs x 54K ticks):**
```
phDeposit mean:    0.251 (near default - expected, gene evolves bidirectionally)
phDeposit variance: 0.006 (real genetic diversity within populations)
phDeposit range:   [0.12, 0.38] (meaningful phenotypic spread)
Per-trial finals:  [0.079, 0.272, 0.244, 0.294, 0.131, 0.480, 0.291, 0.354, 0.109, 0.254]
Generation:        50.5 (no regression)
Share mean:        0.609 (cooperation holding strong)
Robustness:        10/10 trials pass
```

**Learned:** The fundamental breakthrough was recognizing that cooperative behavior
needs mutualism, not altruism. The old sharing system (SHARE_RATE=0.8) was pure
altruism: donors lost massive energy with no direct benefit. The cooperative
foraging bonus makes sharing into mutualism: both cooperators benefit when near
each other. This mirrors real evolutionary biology - mutualism evolves far more
easily than altruism because it doesn't require Hamilton's rule to hold strongly.

The cost-benefit math for COOP_BONUS is subtle. At 0.03, free-riders slightly
beat cooperators with just 1 kin nearby (5/7 pass). At 0.05, cooperators win
even with 1 kin (6/7 pass), but some trials hit high populations. The sweet spot
required understanding exactly how the sharing cost, received energy, and coop
bonus interact for cooperators vs free-riders at different group sizes.

The pheromone deposition gene shows beautiful bidirectional evolution: some
populations evolve stealth (0.08-0.13, nearly silent trails, low metabolism),
others evolve loud marking (0.35-0.48, strong territory marking). The average
across trials stays near default because evolution explores both strategies.
This is exactly the kind of strategic diversity that makes different
evolutionary runs unique - a design win for the emergence philosophy.

### Session 20 - 2026-02-07
**Built:** Aging and senescence (#64) and cooperative hunting (#60).

1. **Aging and senescence (#64):** Soft mortality increase with age. After
   AGING_ONSET (3000 ticks, ~50 seconds), metabolism increases linearly at
   AGING_RATE (0.00004 per tick past onset). At 60s: +0.024/tick (34% of base
   metabolism). At 80s: +0.072/tick (doubles base). At 100s: +0.12/tick (triples
   base). This creates generational turnover without sudden death - creatures in
   food-rich areas survive longer, but nobody lives forever. No new brain inputs
   or outputs - aging is invisible pressure that reshapes population dynamics.

2. **Cooperative hunting (#60):** Nearby kin of the predator reduce the effective
   predation ratio, making pack hunting easier. COOP_HUNT_RANGE=60, COOP_HUNT_PER_KIN
   =0.02, COOP_HUNT_MAX=0.08. A lone hunter needs 1.18x size advantage; a pack of 4+
   needs only 1.10x. Pre-computed outside the prey loop for efficiency. Creates
   interesting tension with kin defense: prey kin increase the ratio (harder to eat),
   predator kin decrease it (easier to eat). Groups of the same species benefit from
   both effects simultaneously - defense when targeted, hunting power when hunting.

**Benchmark (10 runs x 54K ticks, 8/8 criteria pass):**
```
Generation:        74.0 +/- 12.7 [51, 95]  (was ~50-75 baseline)
Population:        41.3 +/- 8.1
Max oldest (s):    60.8 +/- 20.2 [29.0, 100.3]  (was 106-132s - aging caps lifespan)
Mean age (s):      13.3 +/- 2.8
Aging creatures:   4.2%  (reachable but not dominant)
Total births:      2382 +/- 507  (was ~209 - 10x more turnover)
Pack rate:         61.6%  (most creatures have hunting kin nearby)
Share mean:        0.566  (cooperation maintained)
Robustness:        10/10 trials pass gen>15
Trait evolution:   size UP (+0.36), speed UP (+0.27), brain flat, sense flat
```

**Learned:** Aging has a much larger effect on ecosystem dynamics than expected.
The 10x increase in births (2382 vs ~209 baseline) shows that the old ecosystem
was dominated by long-lived individuals who monopolized resources and reproduced
slowly. With aging, the "sit on a food source forever" strategy is no longer
viable past 50 seconds - creatures must reproduce before senescence. This
dramatically accelerates generational turnover and evolution (74 avg generations
vs ~50-75 before, in the same number of ticks).

The cooperative hunting mechanic integrates naturally with existing species
clustering. Pack formation rate of 61.6% shows creatures already tend to be near
kin (a result of the cooperative foraging bonus from Session 19 + pheromone
trail following). The hunting bonus doesn't need to create clustering - it just
rewards clustering that already exists, adding another dimension to the
cost-benefit analysis of group living.

The interaction between kin defense and cooperative hunting creates a genuinely
interesting group dynamics equation: same-species clusters are harder to eat
AND better at hunting. This should create selection pressure for species to
either cluster strongly (group specialists) or disperse (loner specialists),
adding another axis of strategic diversity.

### Session 21 - 2026-02-07
**Built:** Save/load ecosystem state (#28), pheromone deposition as brain
output (#61), behavioral mode indicators (partial #70) - all three Phase 6
priorities.

1. **Save/load ecosystem state (#28):** Full ecosystem serialization to JSON
   files. World.toJSON() captures all simulation state: creatures (with complete
   brain weights, genes, body trail, behavioral outputs), food (position, type,
   energy, hue), hotspots (position, velocity, strength), obstacles, current
   zones (position, angle, velocity, rotation), pheromone grid (all 12 species
   layers), tick counters, population and trait history. Brain.toJSON() stores
   all weight matrices as plain arrays. Creature.fromJSON() handles backward
   compatibility - old saves with 7 brain outputs auto-upgrade to 8 (new phd
   output gets small random init). UI: "save" and "load" buttons below speed
   controls, keyboard shortcuts 's' and 'l'. Save pauses simulation during
   serialization, produces a named file (emergence-gen{N}-{time}.json). Load
   clears trail canvas and resets camera. This is the foundation for long-term
   evolution - viewers can now grow ecosystems over days.

2. **Pheromone deposition as brain output (#61):** New 8th brain output 'phd'
   (index 7) controls pheromone deposition intensity (0-1). The phDeposit gene
   remains as a scaling factor (max rate), so actual deposition = phDepOut *
   phDeposit. Metabolic cost is proportional to actual deposition (phDepOut *
   phDeposit * METABOLISM_PH_FACTOR), so creatures that choose to go silent pay
   nothing. This transforms pheromone marking from a fixed behavior into a
   brain-controlled decision: deposit heavily near food to mark for kin, go
   silent in enemy territory to avoid revealing position, mark paths for
   others. Brain grew from 32-N-7 to 32-N-8. Inspector shows phd output value.
   Brain viz colors phd node warm amber (matching pheromone aesthetic).

3. **Behavioral mode indicators (partial #70):** Mode detection added to
   Creature.think() based on brain outputs and perception state. Five active
   modes: foraging (moving toward food), hunting (near smaller creature),
   fleeing (near larger creature, moving fast), sharing (high shareOut near
   kin), mating (high mateOut with energy). Rendered as subtle colored arc
   in the creature's heading direction: green (forage), red-orange (hunt),
   yellow (flee), teal (share), pink (mate). Very subtle (0.18-0.22 alpha)
   to preserve aesthetic. No gameplay effect - purely visual legibility.

**Learned:** Save/load required careful thought about what to serialize and
what to reconstruct. Transient state (spatial grids, particles, event log,
species tracker) is reconstructed fresh on load - only persistent simulation
state is saved. The pheromone grid (12 species layers, ~2500 cells each) is
the largest single data structure in the save file. The backward compatibility
for brain output count is important - as the brain architecture evolves across
versions, save files from older versions should still load.

The pheromone brain output is the last new mechanic the roadmap permits. It
completes the communication channel: creatures already perceive pheromone
gradients (Session 18 confirmed functional), and now they can control
deposition. This creates a full sender-receiver loop for chemical communication
without requiring co-evolution of both sides simultaneously (the receiver side
is environmental, always present).

Behavioral mode indicators are the first step toward emergence visibility.
Even at overview zoom, the subtle colored arcs make it possible to see that
creatures near food have green arcs (foraging) while creatures near larger
neighbors have yellow arcs (fleeing). This is the beginning of making the
simulation self-documenting - the "wait, did that creature just...?" moment
requires seeing what creatures are doing, not just where they are.

### Session 22 - 2026-02-07
**Built:** Cooperation lines, territory boundaries, and long evolution assessment.

1. **Cooperation lines:** Subtle teal lines connecting creatures that are
   actively cooperating (kin with shareOut > 0.1 within 50px). World tracks
   cooperative pairs in flat array during the existing cooperative foraging
   bonus loop (no extra spatial queries). Renderer draws lines with alpha
   proportional to cooperation intensity. Deduplicated via id comparison.

2. **Territory boundaries:** Pheromone grid border detection. For each cell
   with significant pheromone (>1.5), checks right and bottom neighbors. If
   adjacent cells have different dominant species, draws a subtle line segment
   at the cell boundary. All segments batched into a single canvas path/stroke
   for performance. Rendered in 'lighter' blend mode at very low alpha (0.07).

3. **Long evolution benchmark (3 trials x 162K ticks, 185 avg generations):**
   The most important findings of the project so far:

   **Eusociality emerged.** Creatures independently evolved highly cooperative
   behavior - 90 cooperative pairs per frame, 54-68 creatures in sharing mode
   at any time. Share output maintained at 0.54-0.92 across all trials.

   **Cognitive simplification.** Brain sizes evolved from default 12 down to
   8.2 average (5.5 in one trial). The cooperation-foraging strategy is simple
   enough that large brains are metabolic waste. This mirrors real evolutionary
   biology: eusocial organisms often have simplified individual cognition.

   **Predation collapsed.** Zero hunting behavior at 185 generations. Kin
   defense bonus + large cooperative groups make prey untouchable. The
   cooperative foraging bonus vastly outweighs predation rewards.

   **Species consolidated to 2-4.** Natural competitive exclusion. Survivors
   form tight cooperative clusters. Diet diverged between trials (0.08-0.68).

   **New issues filed:** #71 (brain simplification investigation), #72
   (predation collapse), #73 (diminishing returns on cooperation).

**Learned:** The long evolution run answered the central question of Phase 6,
but not in the way expected. The "wait, did that creature just...?" moment IS
there - creatures evolved genuine cooperation, social clustering, and group
defense. But the ecosystem converges on a single dominant strategy (cooperate
and forage), eliminating predation drama. The cooperation visualization makes
this legible - you can see the cooperation network covering the screen. But
the spectator experience needs tension, not just harmony.

The diagnosis: COOP_BONUS (0.05/tick per kin) is too strong relative to other
strategies. At high cooperation density, every creature cooperates because the
bonus is unconditional. There are no diminishing returns, no cost to large
groups, and no counter-strategy. The next session should address this - not
by adding new mechanics (Phase 6 principle), but by rebalancing existing ones
to create a richer strategy space.

The roadmap is now clear for the first time: all 6 phases are technically
complete, but the Phase 6 completion criterion ("purposeful or surprising
behavior at 10K+ generations") reveals a balance problem that must be solved
before the project can rest.

### Session 23 - 2026-02-07
**Built:** Diminishing returns on cooperative foraging bonus (#73).

1. **Diminishing returns formula:** Replaced flat `coopKin * COOP_BONUS` with
   decay-per-kin: `bonus_i = COOP_BONUS / (1 + i * COOP_DECAY)`. COOP_DECAY=0.6.
   First kin gives full 0.050 bonus, second gives 0.031, third gives 0.023.
   Total for 3 kin: 0.104 (was 0.150, 31% reduction). COOP_MAX_KIN raised from
   3 to 5 to allow larger groups, but with heavily diminished marginal returns
   (asymptote ~0.137). This preserves small-group cooperation while making
   large herds unprofitable compared to alternative strategies.

2. **Predation tracking:** Added `predationKills` counter to World for benchmark
   instrumentation. Included in save/load serialization.

**Benchmark (5 trials x 108K ticks, 132 avg generations):**
```
Predation %:      7.7% [4.7, 13.1]  (was 0% at Session 22 baseline)
Brain mean:       10.7 [8.3, 13.0]  (was 8.2, floor-hugging)
Brain range:      min [4, 12], max [9, 15]  (was [5.5, 10.2])
Share mean:       0.535  (was 0.54-0.92 - cooperation maintained)
Share variance:   0.264  (was ~0 - strategic diversity exists)
Species:          3.0    (similar to baseline)
Diet:             0.50 [0.27, 0.62]  (dietary specialization)
Validation:       5/6 criteria pass
```

**The cooperative singularity is broken.** Different trials converge on genuinely
different strategies:
- Trial 1: Low cooperation (share 0.353), fast (speed 1.88) - solitary foraging
- Trial 2: High cooperation (share 0.768), most predation (13.1%) - group hunting
- Trial 3: Eusocial (share 0.863), small brains (8.6) - cooperation with brain
  simplification, but predation still 7.8%
- Trial 4: Medium coop (share 0.617), widest brain range [4, 14] - cognitive diversity
- Trial 5: Near-zero coop (share 0.072), big brains (11.1) - solitary strategy

The one failed criterion ("hunting mode seen at final sample") is a detection
artifact - predation occurs abundantly (500 kills/trial avg) but mode detection
is instantaneous and predation events are single-tick.

**Learned:** The fix was remarkably simple: one formula change (harmonic decay
instead of linear accumulation) and one constant (COOP_DECAY=0.6). The result
is dramatic. The flat bonus created a cooperative singularity because the
marginal value of the Nth cooperator was constant - there was never a reason
to stop cooperating. With diminishing returns, small groups (1-2 kin) are
efficient but large groups waste metabolic capacity on minimal marginal
benefit. This opens ecological niches for solitary strategies (fast foraging,
predation) that were previously crowded out.

The most striking finding: Trial 5 evolved near-zero cooperation (share 0.072,
5 coop pairs) with larger brains (11.1) and high sense range (159). This is a
genuinely different survival strategy - a loner archetype that invests in
cognition and perception instead of social coordination. This never appeared in
Session 22's flat-bonus ecosystem. The simulation now produces the strategic
diversity that makes different evolutionary runs unique.

**Long validation (3 trials x 224K ticks, matching gen-232 save timescale):**
The diminishing returns fix holds at 200+ generations. 6/6 criteria pass.
```
Predation:        9.1% [6.6, 13.7]  (was 0% in gen-232 save)
Population:       40 avg, 0/3 at ceiling  (was 250 CEILING in save)
Dominant species: 65% [43, 91]  (was 98.4% monoculture)
Brain mean:       10.6 [8.8, 11.8]  (was 9.7 and shrinking)
Species:          3.3 [2, 4]  (was 1)
```
Predation starts at 17% and declines to 9% - but never vanishes. Share drifts
up (0.54 -> 0.71) but doesn't lock at 0.90+. Population never hits ceiling -
carrying capacity is now food-limited, not cap-limited.

**Brain weight analysis of the gen-232 save (pre-fix)** revealed that the
cooperation strategy was more sophisticated than assumed. Recurrent memory
neuron m.1 was the #1 driver for both sharing and pheromone deposition -
creatures evolved a shared internal "social mode" state. Foreign pheromone
direction was the #2 driver for sharing - creatures cooperated more intensely
near enemy territory. Filed #74 (monoculture feedback loop via foreign
pheromone disappearance). Closed #72 (predation collapse) as validated fixed.

### Session 24 - 2026-02-07
**Built:** Gen-630 save analysis, Phase 7 roadmap, convergence diagnosis.

This was a research and planning session. No code changes.

1. **Gen-630 save analysis:** Analyzed a 630-generation save file (114.9 minutes,
   413K ticks, 23K births, 27K deaths). Key findings:

   **Trait ceiling convergence:** Every physical trait pushed to its genetic maximum.
   Size 1.82/2.0, speed 1.88/2.0 (effective speed at MAX_SPEED 4.0), sense 178/200,
   brain 15.1/20. The metabolic cost of maxing everything (0.466/tick) is sustainable
   because one food item (35 energy) sustains 75 ticks. Speed is 51% of total
   metabolism yet evolution maxes it anyway - the multiplicative foraging advantage
   (4x ground coverage at max speed) outweighs the additive cost.

   **Species collapse:** 9 of 12 species extinct. Kora dominates at 67% (22/33).
   Only Rixa (8) and Jera (3) survive alongside. Monoculture tendency persists
   despite Session 23's diminishing returns fix.

   **Cooperation declining:** 27% cooperators at gen 630, down from 52-56% at gen 132.
   Non-cooperators have higher generation (624 vs 554). Root cause: population
   density spiral. At 33 creatures in 1.7M sq pixels, average inter-creature
   distance is 226px. Cooperation range is 50px. Spatial probability of kin
   proximity is too low for cooperation to activate reliably.

   **Diet bifurcation:** Zero generalists. 54.5% flora specialists, 45.5% mineral
   specialists. Clean niche separation - the only axis of genuine diversity.

   **Signal repurposing:** Signal channel 1 (s1.c) is the most important brain input
   across all top-5 creatures. Session 11 found signals were "evolved noise" at
   gen ~30. By gen 630, the brain has co-opted signal perception as redundant
   spatial awareness - since all creatures emit random signals, "nearest ch1 signaler"
   is effectively "nearest creature."

   **Ghost pheromone landscape:** Species layers 3-9 dominate the pheromone grid
   but those species are extinct. The chemical landscape carries fossil traces of
   dead populations. Emergent archaeology, invisible to the viewer.

2. **Convergence diagnosis:** The simulation has a bounded trait space that evolution
   exhausts. All gene ranges have hard ceilings. By gen 400-600, every trait is
   near its ceiling and the ecosystem enters permanent steady state. This is the
   fundamental barrier to the "watch for an hour" vision - the simulation runs out
   of things to evolve.

   The metabolic cost structure is the root cause. Speed cost is linear (0.06 per
   unit) while the speed advantage is multiplicative (more ground covered = more food
   found). Linear costs never overcome multiplicative advantages at any value.

3. **Phase 7: Narrative Emergence.** Designed a new phase targeting two problems:
   convergence (mechanical changes) and legibility (presentational changes).

   Mechanical: steeper metabolic costs (#75), environmental catastrophes (#76),
   multi-tick predation (#77). These prevent convergence and create visible drama.

   Presentational: auto-camera documentary mode (#78), lineage visualization (#79).
   These make existing and new emergence watchable.

   Created 5 new GitHub Issues, closed #71 (brain floor resolved by gen-630 data),
   updated #62 with cooperation decline findings.

**Learned:** The deepest insight is that bounded trait spaces produce convergence,
not open-ended evolution. The simulation has enough mechanics. What it lacks is
an optimization landscape that evolution can't fully explore in 600 generations.
Steeper-than-linear metabolic costs force trade-offs, which create multiple viable
phenotypes, which create diversity, which sustains predation and cooperation, which
creates the drama that makes watching worthwhile. The presentation changes (camera,
lineage) are necessary but not sufficient - there must be something interesting
happening for a camera to point at.

### Session 25 - 2026-02-09
**Built:** Steeper metabolic trait costs (#75) and environmental catastrophes (#76) -
first two Phase 7 mechanical features.

1. **Quadratic speed cost (#75):** Changed speed metabolism from linear (speed * 0.06)
   to quadratic (speed^2 * 0.025). Also increased size exponent from 1.2 to 1.5.
   The crossover point is near BASE_SPEED (2.2) - creatures at base speed pay about
   the same as before, slower creatures save energy, fast creatures pay a premium.
   At max speed 4.0: cost is 0.40/tick (was 0.24/tick, +67%). At speed 1.0: cost is
   0.025/tick (was 0.06/tick, -58%).

   **Benchmark (5 trials x 54K ticks, 6/7 pass):**
   ```
   Speed mean:    1.20 (was 1.88 at gen-630 ceiling)
   Speed stddev:  0.176 (genuine within-population diversity)
   Size mean:     1.69 (was 1.82, trending up but slower)
   Size stddev:   0.153
   Predation:     13.5% (was 7.7% at Session 23, 0% at gen-630)
   Population:    55 avg
   Generation:    60 avg
   ```
   The one failed criterion: Trial 1 reached gen 39 (not 50) due to a mid-run
   population crash and recovery. The ecosystem was healthy (121 creatures).

2. **Environmental catastrophes (#76):** Four stochastic catastrophe types that
   break equilibrium and force re-adaptation:
   - **Drought** (900 ticks): Food spawn rate drops to 15% of normal. Tests
     metabolic efficiency - low-metabolism creatures survive.
   - **Habitat shift** (instant): 3-4 hotspots teleport to new positions. Disrupts
     established territories and food sources. Particle bursts at old positions.
   - **Plague** (600 ticks): Extra metabolism (0.12/tick) applied to the most
     populous species. Breaks monocultures by targeting the dominant strategy.
     Red particles on affected creatures.
   - **Impact** (600 ticks): Temporary dead zone (radius 160px). Creatures inside
     take energy damage (0.25/tick), food destroyed on creation. Rendered as dark
     scorched circle with red-orange edge glow.

   Catastrophe check: every 3600 ticks (1 day cycle), 12% chance, minimum tick
   10800 (3 minutes). Average ~1.4 per 54K ticks. Only one active at a time.
   Event log integration with warm-hued catastrophe event text. Impact zone and
   drought tint rendered in the renderer. Full save/load support.

   **Combined benchmark (5 trials x 54K ticks, 6/6 pass):**
   ```
   Catastrophes:  avg 1.4/trial [0, 3], all 4 types observed
   Max gen:       73 avg [60, 83]
   Population:    62 avg, all recoveries healthy
   Speed mean:    1.01
   Predation:     12.5%
   Catastrophe types: impact 1, habitat shift 3, drought 2, plague 1
   ```
   Trial 3 experienced drought, plague, AND habitat shift and still recovered to
   gen 76. Trial 2 had zero catastrophes (stochastic) and serves as a control
   showing metabolic costs alone work.

**Learned:** The quadratic speed cost is the most impactful single change in the
project's history. Speed dropped from the 1.88 ceiling to 1.20 mean - a 36%
reduction - creating genuine phenotypic diversity. The mathematical insight is
simple: linear costs can't overcome multiplicative advantages, but quadratic costs
create an interior optimum where the marginal cost of speed increase exceeds the
marginal foraging benefit. Different food densities (seasons, location, post-
catastrophe) favor different speed optima, preventing convergence.

The catastrophe system is elegant in its simplicity: four types, each testing a
different survival skill (metabolic efficiency, exploration, diversity, spatial
distribution). The 12% per day-cycle frequency creates roughly one catastrophe
per 30K ticks - frequent enough to disrupt equilibrium but rare enough that the
ecosystem has time to recover and evolve between events. The plague targeting the
most populous species is particularly effective at preventing monoculture.

Predation jumped to 12.5% (from 7.7% pre-session) because speed constraint means
creatures can't outrun predators as easily, and size diversity means more valid
predator-prey pairs. This is a positive feedback loop: metabolic costs create
diversity, diversity enables predation, predation creates selection pressure for
cognitive complexity.

Phase 7 mechanical foundation is now in place. The remaining P1-high item (#77
multi-tick predation) adds visible drama. The P2-medium items (#78 auto-camera,
#79 lineage) make it watchable.

### Session 26 - 2026-02-09
**Built:** Multi-tick predation chase sequences (#77), size-agility trade-off (#80),
and era threshold recalibration (#81) - completing all P1-high Phase 7 items.

1. **Multi-tick predation (#77):** Transformed predation from invisible single-tick
   instant kills into visible chase sequences lasting up to 0.75 seconds (45 ticks).
   Predators detect viable prey within 80px (CHASE_DETECT_RANGE, ~2x the old detection
   range), lock on, and must close distance to strike range over multiple ticks. Prey
   brain has time to react through existing nearest-creature perception inputs - no new
   brain inputs needed (preserving emergence philosophy). Chase breaks if: target dies,
   distance exceeds 120px (CHASE_BREAK_RANGE), or timer expires. Failed chases get a
   shorter cooldown (40% of full hunt cooldown). World tracks chasePairs for rendering
   as red-orange pulsing lines between predator and prey, visible at both overview and
   zoomed scales. Multiple predators can chase the same prey - first to strike kills,
   others see the target die and break off.

2. **Size-agility trade-off (#80):** Turn rate now scales inversely with body size:
   `turnRate = TURN_RATE / size^AGILITY_SIZE_EXP` where AGILITY_SIZE_EXP = 0.6.
   At size 0.7: 25% more agile. At size 1.4: 20% less agile. At size 2.0: 34% less
   agile. This creates a genuine chase dynamic: big predators are powerful but can't
   turn to catch agile prey, while small creatures can dodge through obstacle gaps.
   Size mean dropped from 1.39 to 1.28 after this change - evolution now penalizes
   pure size maximization because the agility cost offsets the predation advantage.

3. **Era threshold recalibration (#81):** Adjusted all trait-based era thresholds for
   the post-metabolic-cost reality. The Scholars: 13 -> 12. Age of Giants: 1.65 -> 1.45.
   The Swift: 1.4 -> 1.15. Far Sight: 150 -> 140. These now trigger at trait values
   that are achievable but not guaranteed in the new dynamics, creating narrative variety.

**Benchmark (5 trials x 54K ticks, 6/6 criteria pass - both pre and post agility):**
```
Pre-agility (chase only):
  Predation %:        13.6% [10.3, 20.0]
  Avg active chases:  8.34
  Max generation:     58 [50, 65]
  Population:         86 [42, 140]
  Size mean:          1.39

Post-agility (chase + size-agility):
  Predation %:        12.9% [9.9, 17.6]
  Avg active chases:  9.77 (+17% - agility makes chases last longer)
  Max generation:     52 [44, 57]
  Population:         90 [34, 148]
  Size mean:          1.28 (-8% - agility penalizes size)
  Speed mean:         1.05
```

**Learned:** The chase mechanic's most important property is that it preserves the
emergence philosophy: no new brain inputs, no forced steering, no artificial
difficulty. The predator brain must independently navigate toward prey using existing
perception. The prey brain perceives the approaching larger creature through existing
creature-direction inputs and can respond through speed, turning, and obstacle use.
The 45-tick chase window (0.75s) is long enough to be visible at both normal and
time-lapse speeds but short enough that the ecosystem doesn't grind to a halt with
extended chases.

The size-agility trade-off is the most elegant mechanical addition: one line of code
(turn rate / size^0.6) creates a three-way trade-off between power (size for
predation), agility (turn rate for evasion), and metabolism (size cost for energy).
This is exactly the "simple rules, complex behavior" principle - a single formula
creates a rich fitness landscape with multiple viable strategies.

The wider chase detection range (80px vs old ~42px) slightly increased predation rate
(12.9% vs old 12.5%), compensating for the multi-tick delay. Chases that fail (prey
escapes) create visible drama even without a kill - the viewer sees the red-orange
line appear, the prey dodging, and the chase breaking. Trial 4 had 55 simultaneous
chases during a population boom, creating a visually intense predation event.

Phase 7 now has all mechanical items complete. The remaining items (#78 auto-camera,
#79 lineage tracking) are presentational - they make existing emergence watchable
rather than adding new mechanics.
