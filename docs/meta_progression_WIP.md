# Obsi - Meta Progression Design

This document describes the planned meta-progression systems for Obsi, integrating permanent upgrades with the existing game mechanics.

---

## Status

> [!NOTE]
> Meta progression is **not yet implemented**. This document captures design decisions for future development.

---

## Core Concept

Meta progression provides permanent upgrades that persist between runs, creating long-term goals and meaningful choices. Currency is earned during gameplay and spent on upgrades that modify game parameters.

---

## Currency System

### Earning Currency

> [!NOTE]
> Currency sources are not yet finalized. The following is an example structure.

| Source | Amount (example) |
|--------|------------------|
| Wave cleared | 10 × wave_number |
| Enemy killed | score_value ÷ 10 |
| Boss defeated | 100 |
| First-time milestones | +50 bonus |

### Spending Currency

Currency is spent on permanent upgrades in the upgrade shop between runs.

---

## Upgrade Categories

### Weapon Heat Upgrades

The weapon temperature system (already implemented) has several parameters that can be upgraded:

| Parameter | Default | Upgrade Effect | Max Level |
|-----------|---------|----------------|-----------|
| `TEMP_PER_SHOT` | 10.0 | -1.0 per level | 3 |
| `TEMP_COOLING_RATE` | 0.6 | +0.1 per level | 3 |
| `WARM_ZONE_COOLDOWN_MULT` | 0.5 | -0.05 per level | 2 |
| `TEMP_WARM_MAX` | 70.0 | +5.0 per level | 2 |

**Design Rationale:**
- Lower heat per shot → more bullets before overheat
- Faster cooling → shorter lockout periods
- Better warm zone multiplier → stronger fire rate bonus
- Extended warm zone → easier to maintain bonus

### Combat Upgrades

| Upgrade | Effect | Max Level |
|---------|--------|-----------|
| Base Damage | +1 bullet damage | 3 |
| Pierce | +1 base pierce count | 2 |
| Fire Rate | -5 frames between shots | 2 |
| Charged Shot Power | +1 charged damage | 2 |

### Survivability Upgrades

| Upgrade | Effect | Max Level |
|---------|--------|-----------|
| Starting Health | +1 max health | 2 |
| Shield Duration | +60 frames | 2 |
| Invincibility Frames | +15 frames after hit | 2 |

---

## Enemy Reference (from Architecture)

Current enemy types and their stats (for balancing meta upgrades):

| Enemy | HP | Score | Drop Chance | Notes |
|-------|-----|-------|-------------|-------|
| Shooter | 1 | 16 | 5% | Basic shooter |
| Diver | 2 | 32 | 8% | Dives and returns |
| Reflector | 3 | 160 | 15% | Reflects bullets |
| Absorber | 1 | 256 | 15% | Stores/spits bullets |
| **Treasure** | 15 | 500 | 100% | Mini-boss, drops weapons/items |
| Boss | 50 | 800 | - | Multi-phase |

**Elite variants** (same enemies with +elite tag):
- Elite Shooter: HP 2, Score 48, aimed shots
- Elite Diver: HP 4, Score 64, faster dive
- Elite Reflector: HP 5, Score 336
- Elite Absorber: HP 2, Score 512, faster spit

### Treasure Mini-Boss

The **Treasure** enemy (formerly "Gift") is the primary source of weapons and passive items. It behaves like Vampire Survivors mini-bosses.

**Spawn Rules:**
- Spawns at fixed intervals during a run (e.g., every 60 seconds)
- Spawn position is random but far from the player's current position
- Only one Treasure can be active at a time

**Movement Pattern:**
- Chooses a random diagonal direction on spawn (±1, ±1 velocity)
- Moves continuously at moderate speed
- Bounces off screen edges like a pool ball (reflects velocity component)
- Never stops moving

**Stats:**
- Base HP: 50 (high health, requires sustained fire)
- Score: 500
- Drop: 100% guaranteed weapon or passive item

**Drop Table:**
| Drop | Weight |
|------|--------|
| Weapon upgrade | 40% |
| New weapon | 30% |
| Passive item | 30% |

---

## Pickups

| Pickup | Duration | Effect |
|---------|----------|--------|
| Exp crystal | instant | grants experience |
| Coin(s) | instant | grants currency |
| Rapid Fire | ~5s | faster fire rate |
| Piercing | ~4s | bonus pierce count |
| Smart bomb | instant | explodes on collection, deals damage to all enemies |
| Shield | ~6s | Absorbs all hits |
| Health | instant | heals a % of max health |
| coin frenzy | ~10s | coin multiplier (same as vampire survivors) |
| magnet | 5s | attracts all collectibles to the player |
| slow-mo | 5s | time slow effect |

Meta upgrades can extend pickup durations or enhance their effects.

---

## Implementation Notes

### Data Storage

```pseudo
meta_profile = {
    currency = 0,
    upgrades = {
        heat_per_shot_level = 0,
        cooling_rate_level = 0,
        warm_zone_mult_level = 0,
        base_damage_level = 0,
        max_health_level = 0,
        -- ...
    },
    unlocks = {
        hard_mode = false,
        nightmare_mode = false,
    },
    statistics = {
        total_runs = 0,
        best_wave = 0,
        total_kills = 0,
    }
}
```

### Applying Upgrades

At game start, meta upgrades are applied to game constants:

```pseudo
function apply_meta_upgrades(profile)
    TEMP_PER_SHOT = 10.0 - profile.upgrades.heat_per_shot_level
    TEMP_COOLING_RATE = 0.6 + (profile.upgrades.cooling_rate_level * 0.1)
    -- etc.
end
```

---

## Future Considerations

### Difficulty Modes

| Mode | Unlock | Enemy Multiplier | Currency Bonus |
|------|--------|------------------|----------------|
| Normal | Default | 1.0x | 1.0x |
| Hard | Beat wave 5 | 1.3x | 1.5x |
| Nightmare | Beat wave 10 | 1.6x | 2.0x |

### Time-Based Difficulty Scaling

For roguelike/endless modes:
- Difficulty coefficient increases over time
- Faster enemy spawns
- Higher HP scaling
- Elite enemy introduction

### Diminishing Returns

To prevent power creep:

```pseudo
function effective_bonus(base, meta_bonus)
    diminished = meta_bonus * (1 / (1 + meta_bonus * 0.01))
    return base + diminished
end
```

---

## Summary

| System | Status | Notes |
|--------|--------|-------|
| Currency earning | Not implemented | Based on score/waves |
| Currency spending | Not implemented | Upgrade shop UI needed |
| Weapon heat upgrades | Designed | Parameters defined in architecture |
| Combat upgrades | Designed | Damage/pierce/rate |
| Difficulty modes | Not implemented | Normal only currently |
| Save/Load | Not implemented | Profile persistence needed |