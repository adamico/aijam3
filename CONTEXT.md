# CONTEXT — obsi prototype

## Glossary

**World unit (wu)**
LittleJS spatial unit. At `cameraScale = 16`, one wu = 16px. All sizes, positions, and speeds are in world units or wu/frame. Never mix with pixel values.

**Play area**
The visible game field: `levelSize = vec2(60, 34)` world units. Bounded by `playMin` (top-left) and `playMax` (bottom-right).

**Formation**
The grid of enemies that moves as a unit. Dimensions derived from play area width. Bounces horizontally and drops one row on wall contact.

**Player config**
A single `PLAYER_CONFIG` object holding speed multipliers, size, and base tuning values. Speed values are expressed as `{ speed, speedCharging, speedBurst, speedBurnout }` where the latter three are multipliers of `speed`.

**Magic Combo**
The player's input mechanic: tap (press + release before charge threshold) = fires bullet + reverses direction; hold = charge, hold-to-full = charged state, release-from-charged = fires charged bullet + speed burst + reverses direction.

**Auto-Shoot**
[OBSOLETE] Removed in #18. Previously fired bullets automatically every ~20 frames while in `moving` state. Replaced by tap-to-shoot mechanic. Cooldown timer and warm-zone fire-rate bonus also removed.

**Weapon Temperature**
Heat mechanic tracking player weapon usage. Each tap-release or charged-bullet fires increments temperature by `TEMP_PER_SHOT` (10). Passive cooling reduces temperature by `TEMP_COOLING_RATE` (0.6) per frame. Temperature reaches overheat threshold at `TEMP_OVERHEAT` (100), triggering automatic `burnout` state and locking input. No warm-zone fire-rate bonus — overheat is the sole spam limiter.

**State machine (Player)**
The player's behavioral FSM: `pre_entry → pacifist → moving ↔ charging ↔ charged → speed_burst → moving`, with `burnout` reachable from `moving`/`charged` on overheat.

**Timer**
LittleJS `Timer` class. All durations in **seconds**. Never pass frame counts to `Timer.set()`.

**Frame counter**
Manual decrement pattern (`if (n > 0) n--`). Used for `cooldown` (player) and enemy shoot/dive/spit timers. Distinct from Timer objects — pending conversion to Timer (see tech debt).

**Enemy configs**
Flat `ENEMY_CONFIGS` object in `constants.js` holding per-type balance values. Frame-count fields (`shootRate`, `diveRate`, `spawnInterval`, `spitDelay`) are pending conversion to seconds when those counters migrate to Timer objects.

**Module system**
Sequential `<script>` tags, global scope. Matches LittleJS's own loading model. No ES module imports/exports.

**HitEvent**
The canonical result of a bullet striking a target. Shape: `{ kind, reflected, pos, scoreValue, spawned }`. `kind` is `'damaged'` (target survived), `'killed'` (target destroyed), or `'absorbed'` (damage negated). `scoreValue` is only non-zero for `kind: 'killed'` hits. `reflected` and `spawned` indicate post-hit behavior (reflection/splitting). Computed by pure function `computeHitEvent` from target health, damage amount, and hit metadata.
