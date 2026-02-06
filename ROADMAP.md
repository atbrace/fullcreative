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

**Completed:**
- Recurrent connections (2026-02-06): 4 recurrent neurons feed hidden[0..3]
  back as input. Brain is now 17-12-3 (13 sensory + 4 memory).
- Kin recognition input (2026-02-06): Brain input at index 12 for hue
  similarity to nearest creature (-1 = opposite, +1 = same).

**Remaining:** See GitHub Issues labeled `phase-1`.

### Phase 2: Environmental Richness
*Make the world worth navigating.*

A flat world with scattered food doesn't create enough selection pressure for
interesting navigation, territory, or migration strategies.

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
