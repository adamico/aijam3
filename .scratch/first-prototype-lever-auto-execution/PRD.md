# First Prototype: Lever-Based Auto-Execution Proof of Concept

Status: ready-for-agent

## Problem Statement

The game concept — player manipulates levers to steer an auto-executing mechanic toward a goal state — has not been validated in a playable form. Without a working prototype, it's impossible to know whether the interaction model is fun, readable, or worth developing further.

## Solution

Build the smallest possible single-HTML LittleJS prototype that demonstrates the lever/auto-execution loop with a clear goal state. The mechanic itself is a placeholder — the point is to validate the interaction model, not the theme.

## User Stories

1. As a player, I want to see the game mechanic executing automatically so that I can observe what I'm steering.
2. As a player, I want to see at least two levers I can adjust so that I feel like I have meaningful agency.
3. As a player, I want to see a clear goal state so that I know what I'm aiming for.
4. As a player, I want to receive immediate visual feedback when I adjust a lever so that I can understand the causal relationship.
5. As a player, I want to reach a win or lose condition so that the stakes of lever choices feel real.
6. As a player, I want to restart quickly after a game over so that I can iterate on my lever strategy.
7. As a developer, I want the prototype to be a single self-contained HTML file so that it can be opened directly in a browser with no setup.

## Implementation Decisions

- Start from `LittleJS-AI/templates/menuGame.html` — provides title screen, pause, and game-over flow out of the box.
- Use `tweakables.js` for lever UI during development (press ~ to toggle panel); consider replacing with in-game canvas UI if levers need to be first-class gameplay elements.
- Auto-execution runs in `gameUpdate()` each frame — no player input drives the mechanic directly.
- Levers are global variables modified by player interaction (click, drag, or keyboard); their values are read by the auto-execution each tick.
- Goal state is a simple counter or threshold — e.g. survive N seconds, reach score X, or prevent a value from hitting zero.
- Use `SoundGenerator` for at least one sfx tied to a lever change and one tied to the goal state resolving.
- No external assets. Sprites via `textureGenerator` or solid-color primitives.

## Testing Decisions

- No automated tests for this prototype — it is a throwaway proof of concept.
- Manual test: open HTML in browser, adjust levers, verify auto-execution responds, reach win/lose condition.
- The prototype is considered validated when a second person can play it for 2 minutes without explanation and understand what the levers do.

## Out of Scope

- Specific game theme or mechanic (TBD after prototype validates interaction model)
- Polished art or audio
- Multi-file architecture
- External assets
- Mobile/touch support

## Further Notes

- See ADR-0001 (prototype-phase-constraints) and ADR-0002 (player-interaction-model).
- The placeholder mechanic should be simple enough to implement in under 100 lines — the lever UI and feedback loop are what matter.
- After this prototype, run a grilling session to decide the actual auto-mechanic theme.
