# ADR-0008: Paperkeeper Direct-Control Exception

**Status:** Accepted

**Date:** 2026-06-08

## Context

ADR-0002 establishes the project's core interaction model: the player acts
only via Levers, and Auto-Execution runs the game world without direct input.

Paperkeeper (`prototypes/paperkeeper/`) is a game-jam entry for the "Familiar"
theme whose entire hook is *direct* control: a mouse/touch/pointer cursor is a
telekinetic IK target that drags the shapeshifting familiar's hands (and, past
max reach, its torso) across the goal line to block hexed shots. The comedy and
the mechanical skill both live in moment-to-moment direct manipulation. A
lever-only redesign would destroy the idea.

Obsi set precedent: it ran under a direct-control exception (its own ADR-0004)
throughout its prototype life before graduating.

## Decision

- Paperkeeper is exempt from ADR-0002. Its interaction model is direct pointer
  control of an IK kinematic chain, not Levers.
- Paperkeeper **remains** in the Prototype Phase but with a relaxed ADR-0001:
  - **Allowed:** external image assets (hand-painted paper textures);
    multi-file JS modules.
  - **Still required:** LittleJS as the only engine/library (the IK is
    hand-rolled via the 2D law of cosines — no skeletal/physics/IK library);
    no bundler/build step (plain ESM `<script type=module>`); `SoundGenerator`
    for all sfx; lives under `prototypes/paperkeeper/`.
- A Goal State is still required (saves vs. goals conceded over a match).
- Graduation later still happens via a relocation ADR like obsi's ADR-0007.

## Consequences

- ADR-0002 continues to govern all other active prototypes.
- If paperkeeper ships, it graduates via a relocation ADR like obsi's ADR-0007.
- CONTEXT.md's "direct control → use lever instead" avoidance does not apply
  inside the paperkeeper context; its glossary terms (IK target, reach, save)
  are local to this prototype.
