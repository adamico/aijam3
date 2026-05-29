# obsi has graduated the prototype phase

The **obsi** LittleJS port (originally prototyped in `aijam3:prototypes/obsi/`) has completed its development cycle and been relocated to its own dedicated repository.

**Current location:** [`adamico/obsi:build/littlejs/`](https://github.com/adamico/obsi/tree/main/build/littlejs)

The move preserves full commit history (via `git subtree split`), including:
- All 40 implementation slices (#1–#40 in aijam3)
- ADR-0004, ADR-0005, ADR-0006 (obsi-specific decisions, now in the obsi repo)
- Architecture and design documentation
- Vitest test suite

**See also:**
- [aijam3 ADR-0007](../docs/adr/0007-obsi-exited-prototype-phase.md) — records this graduation
- [adamico/obsi](https://github.com/adamico/obsi) — canonical source
