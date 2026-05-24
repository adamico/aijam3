# ADR-0001: Prototype Phase Technical Constraints

**Status:** Accepted  
**Phase:** Prototype only

## Context

During the Prototype Phase, multiple small prototypes are built rapidly to test the core game idea. Speed and portability matter more than architecture.

## Decision

Prototype Phase prototypes must:
- Be a single self-contained `.html` file in `games/`
- Use no external assets (no images, audio files, spritesheets)
- Use no bundler or build step
- Start from a template in `LittleJS-AI/templates/`
- Use `SoundGenerator` (from `LittleJS-AI/templates/soundGenerator.js`) for all sfx
- Use `textureGenerator` (from `LittleJS-AI/templates/textureGenerator.js`) for all sprites
- Use only the LittleJS engine (`LittleJS-AI/dist/littlejs.js`) — no other libraries

## Consequences

Later phases (post-prototype) are explicitly exempt from these constraints and may use multi-file architecture, external assets, and additional libraries.
