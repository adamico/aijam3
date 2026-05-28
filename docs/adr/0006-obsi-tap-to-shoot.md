# ADR-0006: OBSI: Tap-to-Shoot Replaces Auto-Shoot

**Status:** Accepted

## Context

The original obsi design auto-fired bullets every ~20 frames while the player was in the `moving` state. This created two distinct fire mechanisms:
1. Automatic fire (spam-limited by a cooldown timer with warm-zone fire-rate bonus)
2. Charged-release fire (from the Magic Combo hold-release action)

The automatic fire mechanic decoupled shooting from player action — bullets flew without input, and Magic Combo presses only reversed direction and enabled charging. The warm-zone bonus (`40 ≤ temperature < 70`) provided a fire-rate boost, rewarding sustained play at moderate heat.

## Decision

Remove auto-fire entirely. Tap-release (press button, release before 1-second charge threshold) now fires a bullet and reverses direction. Every shot — whether from tap or charged release — increments temperature by `TEMP_PER_SHOT` (10). No cooldown gate; no warm-zone bonus. Overheat at `TEMP_OVERHEAT` (100) is the sole spam limiter.

## Rationale

**Why surprising:** Magic Combo tap previously had no offensive effect. Every bullet came from either auto-fire (player-passive) or charged-release (player-initiated after 1s hold). Tap now fires immediately, making every button press tactically meaningful and coupling shooting tightly to input.

**Trade-off:** Simplified mechanics. Cooldown timer removed (1 state variable, 1 initialization, 4 references scattered through code). Warm-zone bonus removed (2 config parameters, 2 threshold constants, conditional firing logic). Weapon temperature is simpler: every action heats equally; overheat is the only threshold. Players learn one mechanic, not two.

**Cost:** No sustained-fire advantage for patient play. Rapid tapping (≈10 taps in succession) hits overheat and locks input for burnout duration. Future design must account for this: powerups that increase heat capacity or rate, or alter overheat threshold, become the levers for extended offensive play.

## Consequences

- Tap and charged-release are now both offensive actions with identical heat cost, making them tactically equivalent (tap is fast, charged-release is slower but carries a speed burst).
- Pacifist and pre-entry states remain non-firing: input is locked or disabled.
- Rapid-fire powerups (from prior prototypes) are incompatible with tap-to-shoot. Future powerups should be effect-based (pierce, spread, damage, homing) rather than rate-based.
- Weapon temperature bar remains a core HUD element, but the warm-zone visual cue (orange, 40–70) is now purely informational — it no longer confers gameplay advantage.

## References

- Issue #17: Tap-to-Shoot epic
- Issue #18: Remove Auto-Shoot and cooldown system
- Issue #19: Add tap-release bullet firing to Magic Combo
