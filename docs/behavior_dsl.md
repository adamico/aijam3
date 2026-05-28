# Behavior DSL

A concise string-based DSL for defining enemy behavior patterns without code.

## Basic Syntax

Behaviors are sequences of actions separated by commas:

```
action1:duration, action2:duration
```

- **action**: named action type (move, idle, shoot, sway, dive, etc.)
- **duration**: frames the action lasts; defaults to 1 if omitted; can reference a named variable (e.g. `shoot_rate`)

Example: `move:60, idle:30` → move 60 frames, then idle 30 frames.

## Cycles

Repeat a sequence using parentheses and an optional count:

```
(action1:duration, action2:duration)*count
```

Count defaults to infinite (9999) if omitted.

Example: `(sway:60, shoot:1)*5` → repeat "sway then shoot" 5 times.

## Initialization Phase

Use `+` to define a one-time init phase before a repeating loop:

```
init_action:duration + (loop_action:duration)
```

Example: `sway:600 + (sway:600, shoot:1)` → sway once, then loop sway+shoot forever.

## Action Types

- **Continuous** (e.g. `sway`, `move`): execute every frame for the duration
- **One-shot** (e.g. `shoot`, `dive`): execute once at the start of the duration window

## Variable Durations

Durations can reference variables defined in wave configuration:

```
sway:shoot_rate, shoot:1
```

This allows per-wave tuning without changing behavior strings.
