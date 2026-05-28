# CONTEXT.md — obsi

## Glossary

### Magic Combo
The single-button input system. Three gestures on one button:
- **Tap** (press + release under hold threshold): instant direction reversal, auto-shoot resumes
- **Hold** (press held past threshold): player decelerates to 0.2x speed, auto-shoot stops, charge builds
- **Charged Release** (release after full charge): fires charged shot, reverses direction, triggers speed burst

### Auto-Movement
The ship moves horizontally at all times, bouncing off screen edges. The player does not control horizontal direction directly — the Magic Combo reverses it as a side-effect of tap and charged release.

### Auto-Shoot
Normal bullets fired automatically while in `moving` state at a fixed cooldown. Stops during `charging`, `charged`, `speed_burst`, `burnout`.

### Weapon Temperature
Heat system on auto-shoot. Shooting raises temperature; cooling lowers it. A warm zone gives a fire-rate bonus. Overheating causes burnout lockout. Parameters are meta-progression upgrade targets.

### Charged Shot
High-damage piercing bullet fired once on transition `charged → speed_burst`. Reward for holding through the vulnerability window.

### Speed Burst
Brief high-speed (4x) phase after a charged release. Direction is reversed from pre-charge direction. Lasts 18 frames. The escape after committing to a charge.

### Burnout
Penalty state when the charge timer expires without release. Input disabled, 2x speed, same direction, 60-frame cooldown. The risk of holding too long.

### Player FSM
9-state machine governing the Magic Combo:
`pre_entry → pacifist → moving ↔ charging → charged → speed_burst → moving`
`charged → burnout → moving`
`moving → exiting → pre_entry`

### Pre-Entry
Wave-start gate state. Input disabled. Enemies finish entering formation before the player can act.

### Pacifist
Brief no-shoot window (30 frames) immediately after entry completes. Player moves but cannot shoot.

### Wave Cycle
10-wave repeating structure: waves 1–9 are regular combat, wave 10 is a boss wave. Difficulty scales via `calc_difficulty(wave_n)` using linear scaling for first 10 waves, sqrt-based diminishing returns after.

### Wave FSM
State machine governing wave flow:
`transition → combat → transition` (normal waves)
`combat → boss_defeated → cycle_transition → transition` (boss waves)

### Enemy Config
Data object defining all tunable parameters for an enemy type. Update functions read from config; no hardcoded literals. Structure is editor-friendly for future tooling.

### Shooter
Basic enemy. Stays in grid formation. Fires downward at rate defined by `shootRate` in its Enemy Config.

### Diver
Enemy that breaks formation and dives toward the player's position, then returns. Dive behavior defined by `diveSpeed` and `diveRate` in its Enemy Config.

### Reflector
Enemy that reflects player bullets back as enemy projectiles. A player bullet hitting a reflector reverses direction and becomes a hostile bullet. Higher HP than shooters.

### Absorber
Enemy that stores player bullets (up to `max_stored`), then spits them back as a burst after `spit_delay` frames. Absorbing is passive; spit is automatic when full or on a timer.

### Treasure
High-HP mini-boss that spawns periodically (every ~30 seconds). Moves diagonally, bouncing off screen edges like a pool ball. Guaranteed drop: weapon upgrade, new weapon, or passive item. Only one active at a time. Not tied to the wave grid — spawns independently.

### Boss
Wave-10 enemy. Stubbed as a tough shooter in v1; full multi-phase behavior (shoot phase, drop phase, move-only phase) in v2.

## Avoid
- "barriers" — not in obsi; removed from scope
- "DSL" — behavior DSL not ported; use Enemy Config objects instead
- "lever" — obsi uses direct control, not the aijam3 lever model (see ADR-0004)
- "idle" — the player is always active (auto-movement, constant decisions)
