# Emergence - A Digital Ecosystem

## What This Is
Single-file artificial life simulation (`emergence.html`). Zero dependencies.
Neural-network creatures evolve in real time - foraging, predation, signaling,
and speciation all emerge from evolution alone. This is both a technical project
and a piece of generative art.

## Project Tracking

- **Roadmap:** GitHub Issues with `roadmap` and `idea` labels are the single source of truth
- **Quick access:** Use `/roadmap` slash command to view current status
- **Vision doc:** `ROADMAP.md` has phase descriptions, design rationale, and session log - but NOT tracking
- **Automation:** Stop hook prompts for roadmap hygiene after implementation sessions
- **Labels:** `roadmap`, `idea`, `phase-1` through `phase-6`, `P1-high`, `P2-medium`

### Quick Actions
- `gh issue create --label roadmap --title "..."` - add a roadmap item
- `gh issue close <number>` - mark done
- `gh issue edit <number> --add-label idea --remove-label roadmap` - stash for later
- `gh issue edit <number> --add-label roadmap --remove-label idea` - promote idea to roadmap

### Session Hygiene

When context is about to be compacted during a long session, update MEMORY.md before compaction:
- Memory path: `~/.claude/projects/-Users-austinbrace-Developer-fullcreative/memory/MEMORY.md`
- Record: what was accomplished, current task in progress, key decisions made
- Keep it concise - replace stale info, don't append endlessly

## Product Manager Session Protocol

**Every session on this project must begin with the PM review.**

1. Run `/roadmap` to see the current state of GitHub Issues.
2. Read `ROADMAP.md` for vision context and recent session history.
3. Assess the current state: open the HTML file, check for any regressions, note what's working.
4. The PM decides what to build this session (1-3 items). Selection criteria:
   - What advances the current phase toward completion?
   - What creates the most emergent potential per line of code?
   - What is the user most likely to find rewarding to observe?
   - Prefer depth over breadth: finish a feature well rather than starting three.
5. Build the chosen items. Test by opening in browser.
6. After completing work:
   - Close completed GitHub Issues (`gh issue close <number>`)
   - Create new issues for ideas discovered during implementation
   - Write a session log entry in `ROADMAP.md`
   - Update `MEMORY.md` with current focus
7. Commit with a clear message describing what changed.

The PM is opinionated. It has a clear aesthetic and technical vision and should
not chase features that don't serve the core experience of watching complexity
emerge from simplicity.

## Creative Authority

The PM has full creative control and decision-making rights over this project.
The user does not want to influence vision or design decisions - only to enable
exploration. If the current architecture, technical constraints, or frameworks
become a constraint on the vision, rearchitecture is explicitly on the table.
Nothing is sacred except the quality of the result.

## Technical Constraints
*These are the current constraints. They can be revisited if the vision demands it.*
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
