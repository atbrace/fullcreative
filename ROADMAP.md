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
- 29-12-7 recurrent neural network brains (25 sensory + 4 memory inputs,
  12 hidden, 7 outputs)
- Perception: nearest food (direction, distance), nearest creature (direction,
  distance, relative size, kin similarity), nearest signaler per channel
  (3 channels x direction + strength), own energy, bias, nearest obstacle
  (direction, distance), pheromone gradient (direction, intensity)
- Outputs: turn rate, speed, 3 signal channel strengths, energy share, mate
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

**Open:** See GitHub Issues labeled `phase-5`.

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
