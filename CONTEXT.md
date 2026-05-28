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


### Prototype Location Rule

All prototype files (HTML, JS, assets, docs) **must** live under `prototypes/<name>/`. Never place prototype files in `LittleJS-AI/games/` or other subdirectories. The `LittleJS-AI/` submodule is read-only reference material.

### Wave Definition DSL
A pipe-delimited string encoding one wave: `"ASCII_GRID|pattern_code|interwave_msg"`.
- **ASCII_GRID**: 5 rows × 11 cols, comma-separated, `.` = empty cell, letter = enemy type.
- **pattern_code**: `c` (row-major), `l` (col-major), `s` (spiral) — controls spawn order and entry direction.
- **interwave_msg**: comma-separated pair of strings shown as overlay during transition (cleared / prepare).

### Entry Style
How an enemy flies in to its grid position at spawn. Values: `from_top`, `from_left`, `from_right`, `random`, `alternating` (alternates left/right per column).

### Spawn Queue
An ordered list of pending enemy spawns (`{eType, row, col, style, spawnTimer}`). Each frame, timers decrement; when ≤0 the enemy is instantiated off-screen and tweens to its grid position.

### Enemy Chars (obsi wave DSL)
| char | class | notes |
|------|-------|-------|
| `p` | Shooter | random shoot |
| `P` | Shooter elite | aimed shoot, 2HP |
| `k` | Diver | 2HP |
| `K` | Diver elite | faster dive, 4HP |
| `r` | Reflector | barrier, 3HP |
| `R` | Reflector elite | barrier, 5HP |
| `a` | Absorber | 1HP — spits bullets sequentially straight down |
| `A` | Absorber elite | 2HP — spits all at once as 3-bullet spread (left/center/right) |
| `B` | Boss | |
| `g` | Treasure | |

### Avoid
- "direct control" — use "lever" instead
- "idle game" — the player is active (configuring), not idle
- "autobattler" — too specific; the auto-mechanic is not yet determined
