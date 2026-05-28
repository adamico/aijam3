# Diegetic Weapon Temperature Indicator
Status: ready-for-agent

## Problem Statement

The current Weapon Temperature indicator is a screen-space HUD bar (rectangle at the bottom of the screen with a numeric `TEMP` label). It feels disconnected from the ship — it belongs to the dashboard, not the game world. This breaks the arcade feel where everything visible should feel physically part of the action.

## Solution

Replace the HUD temperature bar with a diegetic gun barrel rendered directly on the player ship. The barrel is a small rect at the ship's nose (top, +y direction) that smoothly shifts color from green (cool) → yellow (warm) → red (overheating) as Weapon Temperature rises. No numeric label, no screen-space element — the ship itself communicates heat.

## User Stories

1. As a player, I want to see the weapon heat state on the ship itself, so that I never have to look away from the action to check my heat level.
2. As a player, I want the gun barrel color to clearly signal when I'm approaching overheat, so that I can pace my shots before burnout locks my input.
3. As a player, I want the heat indicator to feel like part of the ship, not a HUD overlay, so that the game world feels coherent and arcade-authentic.
4. As a player, I want the color transition to be smooth (not stepped), so that I get a continuous sense of how hot my weapon is.
5. As a player, I want the barrel to be visually distinct from the rest of the ship body, so that I can identify it instantly as the weapon.
6. As a player, I want the HUD bar and TEMP label removed, so that the screen is less cluttered.
7. As a player, I want the barrel to return to green as the ship cools down, so that I know when it's safe to fire freely again.
8. As a player, I want the barrel to be clearly red at full overheat, so that burnout is visually foreshadowed before it triggers.

## Implementation Decisions

- **Ship orientation**: The player ship faces +y (up). Bullets spawn at `player.pos + vec2(0, 0.5)`. The barrel rect is placed at the nose, centered around `pos + vec2(0, ~0.62)`.
- **Barrel geometry**: A narrow rect (`vec2(s * 0.6, s * 1.2)` where `s = 0.22`) drawn above the cockpit tip. This makes it visually narrow and gun-like, distinct from the wide cyan fuselage.
- **Color interpolation**: `tempColor()` method on `Player` returns interpolated color across two thresholds:
  - 0–40: green → yellow lerp
  - 40–100: yellow → red lerp
  Smooth lerp avoids the stepped 3-color logic currently in `renderShootTemperature()`.
- **LittleJS color**: Use `colorLerp(a, b, t)` or `new Color().lerp()` per LittleJS API to produce the interpolated color value passed to `drawRect`.
- **Barrel is always drawn** (not only when temperature > 0), so the player always sees the gun. At temperature 0 it is green.
- **Remove `renderShootTemperature()`**: Delete the function and its call site entirely. No numeric label replacement needed — color alone is sufficient feedback.
- **Module**: All changes are confined to `Player` (barrel render + `tempColor()`) and `game.js` (remove old function).

## Testing Decisions

- No automated tests — this is a visual/rendering change with no logic branch complexity beyond the color lerp.
- Manual verification: fire shots, observe barrel shifts green → yellow → red; let ship cool, observe return to green; trigger burnout, confirm barrel is red at threshold.

## Out of Scope

- Pulsing/flashing animation on the barrel at high heat (can be added later)
- Changing the ship body color
- Any numeric or text temperature readout

## Further Notes

The barrel position (`vec2(0, 0.62)`) should be tweaked in-engine for visual fit — the exact value depends on perceived alignment with the cockpit tip. The bullet spawn point `vec2(0, 0.5)` is the reference; barrel should appear to be the source of those bullets.
