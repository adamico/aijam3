# ADR-0008: Spellkeeper Direct-Control & Vite Migration Exception

**Status:** Accepted

**Date:** 2026-06-08

## Context

ADR-0002 establishes the project's core interaction model: the player acts
only via Levers, and Auto-Execution runs the game world without direct input.

Paperkeeper (originally `prototypes/paperkeeper/`) was conceived as a game-jam entry for the "Familiar"
theme whose entire hook is *direct* control: a mouse/touch/pointer cursor is a
telekinetic IK target that drags the shapeshifting familiar's hands (and, past
max reach, its torso) across the goal line to block hexed shots. The comedy and
the mechanical skill both live in moment-to-moment direct manipulation. A
lever-only redesign would destroy the idea.

Obsi set precedent: it ran under a direct-control exception (its own ADR-0004)
throughout its prototype life before graduating.

To facilitate rapid iteration, the project was renamed to **Spell Keeper** (located at `/spellkeeper/` at the root) and migrated to a Vite template. This enables Hot Module Replacement (HMR), package management, and modern ESM importing.

## Decision

- Spellkeeper is exempt from ADR-0002. Its interaction model is direct pointer
  control of an IK kinematic chain, not Levers.
- Spellkeeper is relocated to the top-level `/spellkeeper/` directory and transitioned from a prototype template to a Vite project.
- **Allowed:**
  - Using Vite as a dev server, bundler, and for HMR.
  - Importing `littlejsengine` via NPM.
  - External image assets (hand-painted paper textures).
  - Multi-file JS modules under `spellkeeper/src/`.
- **Still required:**
  - LittleJS as the only engine/library (the IK is hand-rolled via the 2D law of cosines — no skeletal/physics/IK library).
  - `SoundGenerator` for all sfx.
- A Goal State is still required (saves vs. goals conceded over a match).
- Graduation later still happens via a relocation ADR like obsi's ADR-0007.

## Consequences

- ADR-0002 continues to govern all other active prototypes.
- If spellkeeper ships, it graduates via a relocation ADR like obsi's ADR-0007.
- CONTEXT.md's "direct control → use lever instead" avoidance does not apply
  inside the spellkeeper context; its glossary terms (IK target, reach, save)
  are local to this prototype.
- Development iteration is drastically accelerated thanks to Vite's instant HMR.

