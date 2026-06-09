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

### Spell Keeper (context-local terms)
Direct-control project; exempt from the Lever/Auto-Execution model — see ADR-0008.

- **Familiar** — the shapeshifting magical creature disguised as the goalkeeper; the player-controlled body (IK kinematic chain). The player controls both hands/gloves coordinated together using a single cursor target.
- **Goal Plane** — the 2D XY plane at the goal mouth at z = 0. The ball travels in explicit 3D space (x, y, z) towards the Goal Plane, projecting to the 2D viewport. Save logic is evaluated on the Goal Plane.
- **Save** — a familiar body segment (hand/arm/torso capsule) overlapping the ball's XY at the frame it crosses the Goal Plane (z <= 0). No 3D physics.
- **Reach** — max IK arm extension. Design rule: Goal-mouth width > Reach, so some shots force torso-drag (shifting the torso horizontally when the cursor target exceeds the arm limits).
- **Hex** — a magically modified shot type with fixed, learnable physics (e.g. fireball = fast, curve = swerving, heavy = slow/big). Player skill = reading the trajectory, not reacting to telegraphs.
- **Heavy Hex** — a slow, heavy shot that earns its place by forcing committed low extreme-side coverage. It travels straight toward the Goal Plane, targets either the far-left or far-right goal edge, and stays low; its pressure comes from occupying the keeper before the next shot may punish overcommitment elsewhere.
- **Shot Plan** — the seeded 30-shot match sequence that defines each shot's Hex, origin, Goal Plane placement, difficulty band, and pressure tags before the match begins. It is generated for debugging and design readability, not shown to the player as a preview.
- **Shot Placement Height** — where the ball is aimed vertically on the Goal Plane: low, middle, or high in the mouth of the goal. _Avoid_: altitude when referring to goal placement; altitude is reserved for trajectory/arc height.
- **Trajectory Height** — the ball's vertical arc through space before reaching the Goal Plane. This may vary for curved shots as part of making the trajectory more expressive, separate from Shot Placement Height.
- **Read cues** — the trajectory is judged from three converging signals: on-screen arc (primary), ball scale (ball shrinks as it recedes toward goal; best look is early/front-loaded), and ground shadow (always present; landing + timing). No per-shot reticle telegraph except in the opening tutorial shots.
- **Goalkeeper Move** — an expressive familiar body action that makes saves feel athletic and creature-like without changing the single-cursor control model.
- **Automatic Expressive Dive** — a brief full-body Goalkeeper Move triggered by hard lateral reach near a threatening shot; primarily visual, with a small save advantage from extra reach and a light timing commitment.
- **Familiar Trick** — a magical or creature-like ability that answers specific shot-sequence pressures without replacing the core save read. Tricks should be responses to Hex and sequence pressure, not generic power-ups.

### Avoid
- "direct control" — use "lever" instead
- "idle game" — the player is active (configuring), not idle
- "autobattler" — too specific; the auto-mechanic is not yet determined
