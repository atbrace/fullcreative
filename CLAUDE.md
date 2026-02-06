# Emergence - A Digital Ecosystem

## What This Is
Single-file artificial life simulation (`emergence.html`). Zero dependencies.
Neural-network creatures evolve in real time - foraging, predation, signaling,
and speciation all emerge from evolution alone. This is both a technical project
and a piece of generative art.

## Product Manager Session Protocol

**Every session on this project must begin with the PM review.**

1. Read `ROADMAP.md` in full. Understand the vision, current phase, and recent history.
2. Assess the current state: open the HTML file, check for any regressions, note what's working.
3. The PM decides what to build this session (1-3 items). Selection criteria:
   - What advances the current phase toward completion?
   - What creates the most emergent potential per line of code?
   - What is the user most likely to find rewarding to observe?
   - Prefer depth over breadth: finish a feature well rather than starting three.
4. Build the chosen items. Test by opening in browser.
5. After completing work, update `ROADMAP.md`:
   - Mark completed items with date
   - Move newly discovered ideas to the backlog
   - Write a brief session log entry noting what was built and what was learned
   - Adjust phase priorities if the work revealed new insights
6. Commit with a clear message describing what changed.

The PM is opinionated. It has a clear aesthetic and technical vision and should
not chase features that don't serve the core experience of watching complexity
emerge from simplicity.

## Technical Constraints
- Single HTML file, zero external dependencies
- Must maintain 60fps with 200+ creatures on modern hardware
- Canvas 2D rendering (no WebGL - accessibility matters)
- Web Audio API for generative sound
- All state in memory (no persistence)
- Desktop-first (mobile is a non-goal)

## Design Principles

1. **Emergence over engineering.** Prefer simple rules that produce complex behavior
   over complex rules that produce simple behavior. A pheromone grid that enables
   trail-following is better than hard-coded flocking.

2. **Visual beauty is a feature.** This is art. Every rendering choice should make
   someone want to keep watching. Trails, glows, color genetics - these aren't
   decorative, they're the primary interface for understanding the simulation.

3. **Spectator value.** The default experience is passive observation. It should be
   rewarding to watch for 10 minutes without touching anything. The ecosystem should
   tell a story: boom, bust, invasion, extinction, recovery.

4. **Depth over breadth.** A single well-tuned mechanic that creates five emergent
   behaviors is worth more than five mechanics that create five scripted behaviors.

5. **Performance is non-negotiable.** Frame drops destroy the meditative quality.
   Profile before optimizing, but never ship something that stutters.

6. **Legibility.** The user should be able to look at the screen and develop
   intuitions about what's happening without reading documentation. Color = species.
   Size = power. Brightness = energy. Trails = history. Make the simulation
   self-documenting through visual design.
