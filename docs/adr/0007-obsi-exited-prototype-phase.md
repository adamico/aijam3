# ADR-0007: Obsi Exited Prototype Phase and Relocated

**Status:** Accepted

**Date:** 2026-05-29

## Context

Obsi has been prototyped in `aijam3:prototypes/obsi/` through 40 implementation slices, achieving full gameplay, AI, input system, wave DSL, and visual polish. The prototype demonstrated:

- Direct-control input model (Magic Combo: tap, hold/charge, release-to-fire)
- Formation-based enemy AI with elite variants
- Wave progression with interwave transitions
- Diegetic UI (barrel heat indicator, no screen-space HUD)
- Modular JavaScript architecture (constants, player, enemies, bullets, waves, game loop)

Both aijam3 and adamico/obsi (the dedicated obsi repo) have confirmed parity of the LittleJS port. The prototype phase is complete.

## Decision

Graduate obsi from the prototype phase and relocate it to its own repository (`adamico/obsi`):

1. Delete `prototypes/obsi/` from aijam3 (git history preserved via subtree split branch `obsi-port`)
2. Treat obsi as a shipped title, not an internal prototype
3. Future obsi development happens in `adamico/obsi:build/littlejs/`
4. Obsi-specific ADRs (0004, 0005, 0006) are now maintained in the obsi repository
5. aijam3 ADR-0001 (prototype-phase principles) no longer applies to obsi

## Consequences

- **aijam3 scope narrowed:** Remaining active prototypes are `auto-defender` and `autorobosurvivor`. ADR-0001 applies to these only.
- **ADR succession:** ADR-0004 (direct-control exception), ADR-0005 (enemy config objects), ADR-0006 (tap-to-shoot) are deleted from aijam3 `docs/adr/` and now live in the obsi repository under its own ADR numbering.
- **Documentation unified:** Obsi's CONTEXT.md, architecture docs, and behavior documentation are maintained in `adamico/obsi/docs/`.
- **Module system evolution:** The `pure.js` / `constants.js` duplication pattern (required to support both ESM and classic <script> module systems) is a temporary measure. Once the obsi repo migrates to Vite + ESM-only, this pattern is retired.
- **Devlog:** All obsi-subject entries from aijam3's devlog have been migrated to the obsi repo's project board and are deleted from aijam3 once the migration issue (adamico/obsi#27) is complete.

## References

- obsi relocation planning: `.scratch/obsi-esm-migration-relocation/PRD.md`
- Relocated code: `adamico/obsi:build/littlejs/`
- Subtree history preserved: `git log obsi-port --oneline`
- Pointer file: `prototypes/obsi-MOVED.md`
