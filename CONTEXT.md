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
- **Magical Shootout** — Spell Keeper's penalty-shootout-like match fiction: each incoming shot is terminal when resolved, with no live attacking rebound phase.
- **Save** — reliable goalkeeper control of a shot by overlapping the ball with both gloves at the Goal Plane. One-glove contact and other body contact are less controlled and should not be treated as an equivalent clean Save.
- **Deflection** — contact with a shot that is not a two-glove Save in the Magical Shootout. One-glove, forearm, upper-arm, torso, head, legs, feet, and any other non-two-glove contact can end the current shot as a Deflection, but carry less control, score, or magical consequence than a Save.
- **Lower Limbs** — dangling thighs, shins, and feet belonging to the disguised Familiar goalkeeper. Lower Limbs are real collidable Deflection parts, not visual-only decoration, never clean Save parts, and not ground anchors for planted footwork.
- **Hex** — a magically modified shot type with fixed, learnable physics (e.g. fireball = fast, curve = swerving, heavy = slow/big). Player skill = reading the trajectory, not reacting to telegraphs.
- **Living Ball Hex** — a magically animated shot that can try to reach the goal again after a Deflection. It tests whether the Familiar controlled the ball with the hands or merely knocked it loose.
- **Heavy Hex** — a slow, heavy shot that earns its place by forcing committed low extreme-side coverage. It travels straight toward the Goal Plane, targets either the far-left or far-right goal edge, and stays low; its pressure comes from occupying the keeper before the next shot may punish overcommitment elsewhere.
- **Commitment Pressure** — difficulty that comes from choosing a save position early enough that a later read can punish overcommitment. Spell Keeper should challenge trajectory reading and recovery decisions more than cursor execution precision.
- **Sequence Pressure Pattern** — a learnable multi-shot pressure shape, such as heavy bait into opposite-side punish, curve bait into late correction, high/low alternation, or repeated same-side recovery pressure.
- **Pressure Setpiece** — a hand-authored sequence of shots using relative parameters to define a specific Sequence Pressure Pattern, allowing it to be mirrored and instantiated on a chosen side.
- **Relative Lanes** — lane targets for a Pressure Setpiece defined relative to a chosen side (`left` or `right`) to support mirroring (e.g., `same-outer`, `opposite-inner`).
- **Relative Curve Directions** — curve directions for a Pressure Setpiece defined relative to the target side (`inward` curving toward the goal center, `outward` curving away).
- **Calibration Shot Chain** — a fully hand-authored 30-shot sequence used to find the right difficulty threshold before extracting Pressure Setpieces or reintroducing random generation.
- **Visible Failure Mode** — an observable reason a shot sequence beat the player, such as overcommitment, late recovery, curve misread, high/low misread, or same-side pinning. Difficulty tuning should prioritize these failure modes over aggregate save rate.
- **Shot Plan** — the seeded 30-shot match sequence that defines each shot's Hex, origin, Goal Plane placement, difficulty band, and pressure tags before the match begins. Its difficulty should come primarily from sequence pressure, not from making single shots unreadable.
- **Shot Plan Difficulty Bands** — the three-act structure for the seeded 30-shot plan: readable variety, mixed pressure, and chaos-but-fair. Readable shots stay legible, mixed-pressure shots add tension without unfair high/wide fireball combinations, and chaos-but-fair shots can push into high-corner fireballs while staying on-target.
- **Phase Layout** — the scheduled pacing template of a match phase, defining the exact order of isolated and setpiece slots (e.g. `['isolated', 'setpiece', 'isolated']`) to guarantee structured difficulty beats.
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
