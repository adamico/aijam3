# Core Hybrid Controls (AI Driver & Human Gunner)
Status: completed

## What to build
Copy `robotron.html` to `autorobosurvivor.html`. Remove manual movement (WASD/gamepad) from the player and replace it with an AI steering system that uses weighted vectors for avoidance (from enemies/bullets) and attraction (towards EXP gems and humans). Retain manual mouse/stick aiming for the human gunner. Implement a 2-second idle "Auto-Aim Fallback" where the AI takes over aiming if the human stops firing, immediately returning manual control once input resumes.

## Acceptance criteria
- [x] `autorobosurvivor.html` exists as an independent file.
- [x] Character moves autonomously via AI steering (avoids enemies, moves towards points of interest).
- [x] Human player aims and shoots using mouse or right stick.
- [x] If human provides no shooting input for 2 seconds, auto-aim fallback engages and targets the nearest enemy.
- [x] Human shooting input immediately breaks auto-aim fallback.

## Blocked by
None - can start immediately
