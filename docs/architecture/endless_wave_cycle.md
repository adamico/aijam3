# Endless Wave Cycle Architecture

## Overview

Infinite gameplay via cycling through 9 regular waves + 1 boss wave, with smoothly scaling difficulty.

## Wave Structure

```
Cycle 1: Waves 1-9 → Boss (Wave 10)
Cycle 2: Waves 11-19 → Boss (Wave 20)
Cycle N: Waves (N-1)*10+1 to N*10-1 → Boss (Wave N*10)
```

- **wave_n**: Absolute wave counter (never resets)
- **cycle**: `floor((wave_n - 1) / 10) + 1`
- **wave_in_cycle**: `((wave_n - 1) % 10) + 1`
- Boss appears every 10th wave

## Wave FSM

```
┌─────────────┐  start_wave   ┌────────┐  wave_clear   ┌─────────────┐
│ transition  │──────────────▶│ combat │──────────────▶│ transition  │
└─────────────┘               └────────┘               └─────────────┘
       ▲                           │
       │                           │ boss_defeated (wave_n % 10 == 0)
       │                           ▼
       │                    ┌───────────────┐
       │                    │ boss_defeated │
       │                    └───────────────┘
       │                           │ celebration_done
       │                           ▼
       │                    ┌──────────────────┐
       │◀───────────────────│ cycle_transition │
       │    cycle_ready     └──────────────────┘
```

States: `transition → combat → transition` (normal) or `combat → boss_defeated → cycle_transition → transition` (boss wave).

## Difficulty Scaling

Factors scale across waves using a linear phase (first 10 waves) then sqrt-based diminishing returns:

| Factor | Base | Max | Scales Per |
|--------|------|-----|------------|
| `dive_chance` | 0.15 | 0.8 | Wave (linear) + Cycle (sqrt) |
| `dive_rate` | 360 frames | 60 frames | Wave + Cycle |
| `shoot_chance` | 0.2 | 0.7 | Wave + Cycle |
| `shoot_rate` | 720 frames | 180 frames | Wave + Cycle |
| `dive_speed` | 1.5 | 4.0 | Wave + Cycle |
| `bullet_speed` | 2.0 | 4.0 | **Cycle only** |
| `boss_hp` | 1.0x | unbounded | Cycle only |
| `boss_atk` | 1.0x | 0.5x (faster) | Cycle only |

**Key design decisions:**
- Enemy bullet speed increases only between cycles (not per wave) — keeps gameplay fair within a cycle
- Sqrt-based scaling after wave 10 gives diminishing returns to prevent unplayable difficulty
- All factors have caps

## Wave Definitions

### Entity Grid

Waves are defined as grids of enemy types:

```
p = shooter, k = diver, r = reflector, a = absorber, B = boss
```

### Spawn Patterns

| Key | Order | Entry |
|-----|-------|-------|
| `c` (classic) | row-major | from top |
| `l` (left-right) | col-major | alternating |
| `s` (spiral) | spiral | random |

### Wave Config

Each wave merges:
- Entity grid (cycling through 10 definitions)
- Spawn pattern
- Interwave message
- Difficulty params for wave_n

## Timers

| Timer | Duration | Purpose |
|-------|----------|---------|
| `transition_timer` | 120 frames (2s) | Normal wave transition |
| `celebration_timer` | 180 frames (3s) | Boss defeat celebration |
| `cycle_timer` | 60 frames (1s) | Cycle transition message |
| `gift_timer` | 1800 frames (30s) | Treasure enemy spawn interval |

## Core Subsystems

### Wave Update Loop (per frame)
1. Enemy census: count `population` and `entering_count`
2. Detect wave clear (all enemies dead + spawn queue empty)
3. Trigger FSM: `boss_defeated` (wave_n % 10 == 0) or `wave_clear`
4. Update wave timer + sway animation
5. Spawn gift/treasure enemy periodically

### Wave Progression (timer-driven)
- `transition`: countdown → `start_wave`
- `boss_defeated`: celebration → `celebration_done`
- `cycle_transition`: pause → `cycle_ready`

## Integration Points

- **Player**: `exit` event called on wave/boss transitions; player entry timer set after enemies settle
- **Powerups/Shields**: cleared on wave transition
- **Scoring**: wave bonus = `max(200 - wave_timer / 60) * min(wave_n, 10)` — scales with wave, capped at wave 10

## Visual Feedback

### Boss Defeat
- Camera shake
- Particle effects during celebration
- Special music track
- 3-second celebration duration

### Wave Transition
- Transition music
- Interwave message display
- Player enters "exiting" FSM state

## Game Manager Architecture

Two valid approaches for coordinating player/enemy/wave timing:

### Distributed (simpler, pragmatic)
- Coordination logic lives in the main game loop update
- Low complexity, quick to implement
- Harder to maintain as wave features grow

### Game Manager module (recommended long-term)
- Dedicated module owns: wave FSM, enemy census, player entry timing, inter-wave transitions
- Single source of truth for game flow
- Easier to debug, extend, and save/load state
- Mirrors the wave_fsm pattern used in reference implementation

**Recommended**: start distributed, refactor to Game Manager when adding more wave types or if coordination logic becomes complex.
