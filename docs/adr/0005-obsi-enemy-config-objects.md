# ADR-0005: Enemy Behaviors as Config Objects, Not DSL

**Status:** Accepted

## Context

The original obsi implementation (PICO-8/Picotron) used a string-based Behavior DSL to define enemy behaviors concisely within token budget constraints. In the LittleJS port, there is no token budget.

Two options were considered:
1. Port the Behavior DSL to JavaScript (adds ~100 lines of parser, zero enemy behavior defined yet)
2. Hardcode behaviors as JavaScript update functions reading from config data objects

## Decision

Hardcode enemy update functions, but define all tunable parameters as data objects (`ENEMY_CONFIGS`). Update functions read from config; no magic numbers in logic.

```js
const ENEMY_CONFIGS = {
  shooter:   { shootRate: 60, score: 16,  health: 1, ... },
  diver:     { diveSpeed: 2, diveRate: 120, score: 32, health: 2, ... },
  reflector: { score: 160, health: 3, ... },
  absorber:  { maxStored: 3, spitDelay: 60, score: 256, health: 1, ... },
  treasure:  { health: 50, score: 500, spawnInterval: 1800, ... },
}
```

## Rationale

- Eliminates DSL parsing infrastructure with no gameplay benefit in JS
- Config objects are the natural target for a future visual behavior editor
- Update functions remain readable and debuggable
- Parameters are all in one place per enemy type — easy to tune

## Consequences

- No DSL compatibility with PICO-8/Picotron reference implementation
- Future behavior editor operates on `ENEMY_CONFIGS`, not DSL strings
- Adding a new enemy type = add a config entry + an update function
