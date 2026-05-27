# CONTEXT.md — aijam3

## Glossary

### Prototype Phase
The initial development phase during which multiple small, self-contained game prototypes are built to test a general game idea. Constraints are strict (see ADR-0001). Later phases relax these constraints.

### Lever
A player-controllable parameter or configuration option that influences how the auto-execution behaves. The player does not take direct actions in the game world — they manipulate levers to steer outcomes.

### Auto-Execution
The game mechanic that runs automatically without direct player input. The core loop plays itself; the player's role is to configure it via levers, not to execute it manually.

### Goal State
A win or lose condition that gives the player a measurable target. Prototypes must have a goal state so lever effectiveness can be evaluated.

### Cornered
A state where the Auto-Execution AI is surrounded by multiple imminent threats in close proximity, prompting defensive maneuvers like teleportation.


### Avoid
- "direct control" — use "lever" instead
- "idle game" — the player is active (configuring), not idle
- "autobattler" — too specific; the auto-mechanic is not yet determined
