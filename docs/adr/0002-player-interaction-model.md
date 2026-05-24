# ADR-0002: Player Interaction Model

**Status:** Accepted

## Context

The core game idea is an auto-execution mechanic where the player does not act directly in the game world.

## Decision

- The game mechanic (Auto-Execution) runs automatically each frame/round without direct player input.
- The player interacts exclusively via Levers — configurable parameters that steer the Auto-Execution.
- Every prototype must have a Goal State (win/lose condition) so lever effectiveness is measurable.

## Consequences

- Prototypes that give the player direct action buttons (attack, move, jump) contradict this model.
- UI design centers on lever presentation, not action controls.
- The auto-mechanic itself is not yet determined; this ADR governs the interaction layer only.
