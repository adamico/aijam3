# ADR-0004: Obsi is a Direct-Control Exception to ADR-0002

**Status:** Accepted

## Context

ADR-0002 defines the aijam3 interaction model: the game auto-executes and the player steers it via Levers, never via direct action buttons (attack, move, jump).

Obsi is a one-button Space Invaders / Galaga clone with a "Magic Combo" input system (tap = direction reversal, hold = charge, release = fire charged shot + speed burst). The player directly causes movement changes and attacks.

## Decision

Obsi is a deliberate exception to ADR-0002. It uses a direct-control model. The one-button constraint is its own design challenge, unrelated to the lever/auto-execution paradigm.

## Consequences

- Obsi prototypes in `prototypes/obsi/` and `LittleJS-AI/games/` do not need to conform to the lever model.
- The lever model remains the default for all other aijam3 prototypes.
- If a future prototype similarly departs from ADR-0002, it should record its own exception ADR.
