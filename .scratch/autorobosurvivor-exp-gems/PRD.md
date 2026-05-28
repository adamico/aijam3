# EXP Gems and Leveling System
Status: completed

## What to build
Add an `ExpGem` class spawned whenever an enemy dies. These gems should drift slowly towards the player when within a specific magnet radius. Add global EXP tracking variables (`playerExp`, `playerMaxExp`, `playerLevel`) and draw a basic EXP bar on the screen UI.

## Acceptance criteria
- [x] `ExpGem` drops on enemy death.
- [x] Gems are pulled to the player within a set magnet radius.
- [x] Collecting a gem increases `playerExp`.
- [x] Global variables `playerExp`, `playerMaxExp`, and `playerLevel` exist and function.
- [x] EXP bar is rendered in the UI.

## Blocked by
- `.scratch/autorobosurvivor-hybrid-controls/PRD.md`
