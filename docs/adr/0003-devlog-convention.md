# ADR-0003: Devlog Convention

**Status:** Accepted

## Context

Development decisions benefit from a personal narrative layer that captures thinking, uncertainty, and intent — things ADRs don't record.

## Decision

- Devlog entries live in `devlog/` at the repo root
- Filename: `YYYY-MM-DD-slug.md`
- Format: date + slug header, then free-form first-person prose. No required structure.
- Trigger: during grilling sessions, the agent flags decisions that feel devlog-worthy and asks if an entry should be written. Not every ADR gets one.
- Tone: personal diary — raw, informal, captures dead ends and uncertainty.

## Consequences

- Devlog is not a spec or reference doc — don't cite it in ADRs or code.
- Entries are written at decision time, not retroactively.
