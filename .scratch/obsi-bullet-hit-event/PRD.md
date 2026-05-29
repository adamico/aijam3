# Obsi: Bullet→Target Hit Resolution via HitEvent

Status: ready-for-agent

## Problem Statement

In `prototypes/obsi/js/game.js`, bullet-vs-target collision is spread across three separate loops (enemies, treasure, boss) with two parallel `instanceof` ladders for enemy hits — one for behaviour (Reflector bounces, Absorber stores, default damages), one for score (per-type ENEMY_CONFIGS lookup). Adding a new enemy type forces edits in `game.js` far from the enemy's own class. SFX and VFX are imminent; under the current shape, every observer adds another branching ladder on top.

## Solution

Each target (enemies, boss, treasure) implements polymorphic `onBulletHit(bullet) → HitEvent`. The game loop collapses to one collision pass that fans the returned HitEvent to observers (audio, fx, score, spawned bullets). Per-target hit behaviour lives in the target's own class. New enemy types ship in one file.

## User Stories

1. As an obsi developer, I want to add a new enemy type without editing `game.js`, so that locality of change matches locality of concept.
2. As an obsi developer, I want bullet-hit behaviour for each target type to live in that target's class, so that I can reason about it in one place.
3. As an obsi developer, I want a single collision loop covering enemies, boss, and treasure, so that the hot path is uniform and short.
4. As an obsi developer, I want hit outcomes returned as data (HitEvent), so that I can plug in audio, particles, score, screen shake, and replay log as independent observers without re-branching.
5. As an obsi developer, I want pure unit tests for the hit-event computation, so that I can verify damage → kill → score transitions without running the engine.
6. As an obsi developer, I want Reflector's mirrored bullet to be emitted as data on the HitEvent rather than a side-effect inside the collision loop, so that the contract is uniform across target types.
7. As an obsi developer, I want Absorber's store-vs-overflow behaviour to live entirely inside `Absorber.onBulletHit`, so that the game loop doesn't know about absorption semantics.
8. As an obsi developer, I want Boss's hit handling to use the same interface as regular enemies, so that the special boss-kill state transition (`waveState = 'boss_defeated'`) is the only boss-specific branch left in the loop.
9. As an obsi developer, I want Treasure's bullet collision to use the same interface, so that the third duplicated loop is also removed.
10. As an obsi player, I want hit feedback (sound, particles) to be wired through a single seam, so that future polish passes don't require touching enemy code.
11. As an obsi developer, I want score lookup to come from a `scoreValue` field on the target (set in ctor from cfg), so that the second `instanceof` ladder disappears.
12. As an obsi developer, I want the HitEvent shape to be branchless for callers (always-present fields), so that observer code stays flat.

## Implementation Decisions

### HitEvent shape

Returned from every `onBulletHit` call. All fields always present.

```
{
  kind: 'killed' | 'damaged' | 'absorbed',
  reflected: boolean,            // orthogonal — can co-occur with damaged/killed
  pos: vec2,                     // impact location, for VFX
  scoreValue: number,            // 0 unless kind === 'killed'
  spawned: EnemyBullet[]         // empty unless reflected
}
```

Rules:
- `kind` is the primary lifecycle outcome of the target.
- `reflected` is orthogonal because reflection co-occurs with damage/kill in the same hit.
- `absorbed` is mutually exclusive with `damaged`/`killed`, so no separate flag.
- `kind === 'killed'` ⇒ `scoreValue > 0`.
- `reflected === true` ⇒ `spawned.length >= 1`.

### Target interface

Every target (Shooter, Diver, Reflector, Absorber, Boss, Treasure) gains:

- `this.scoreValue = cfg.score` in ctor (read from the same `ENEMY_CONFIGS.<type>` already used for `health`).
- `onBulletHit(bullet) → HitEvent`.

### Shared damage helper

Module-level `applyDamage(target, bullet, dmg=1) → HitEvent` in `enemies.js`. Wraps a pure `computeHitEvent` (in `pure.js`) that returns `{ newHealth, event }`. `applyDamage` performs the mutations: `bullet.destroy()`, decrement `target.health`, `target.destroy()` on kill. No base class — flat helper, consistent with the prototype-phase ergonomic style (ADR-0001).

Per-target methods:
- Shooter, Diver, Boss, Treasure → `return applyDamage(this, bullet);`
- Reflector → build mirrored EnemyBullet, call `applyDamage`, set `event.reflected = true`, `event.spawned = [mirrored]`.
- Absorber → if `absorb()` succeeds, destroy bullet and return `{kind:'absorbed', reflected:false, ...}`. Else `applyDamage(this, bullet)`.

### Game loop

Three separate loops collapse to one over `[...enemies, boss, treasure].filter(Boolean)`. Per overlap: call `target.onBulletHit(bullet)`, fan the returned event to:

- `playHitSound(ev)` — `audio.js`
- `spawnHitParticles(ev)` — `fx.js`
- `score += ev.scoreValue; hiScore = max(hiScore, score)`
- `enemyBullets.push(...ev.spawned)`
- `if (target === boss && ev.kind === 'killed') { waveState = 'boss_defeated'; bossDefeatedTimer.set(3); boss = null; }`

The boss-defeated state transition is the only target-specific branch retained in the loop. Old enemy/boss/treasure collision blocks and the second instanceof score ladder are deleted.

### New stub modules

- `js/audio.js` — `playHitSound(ev)` switches on `ev.kind` + `ev.reflected`. Empty bodies until LittleJS sound is integrated.
- `js/fx.js` — `spawnHitParticles(ev)` switches on `ev.kind` + `ev.reflected`. Empty bodies until particle calls are added.

Both loaded by sequential `<script>` tags in `obsi.html` per the "Module system" entry in `prototypes/obsi/CONTEXT.md`.

### Glossary update

Add **HitEvent** to `prototypes/obsi/CONTEXT.md`.

## Testing Decisions

A good test exercises external behaviour through the HitEvent contract, not internal mutation patterns. Use the existing vitest + `pure.js` factory pattern from `tests/smoke.test.js` (see `tickDiver` tests as prior art).

Tests to add for `computeHitEvent` (pure):
- Damage above 0 → `kind: 'damaged'`, `scoreValue: 0`.
- Damage reaches 0 → `kind: 'killed'`, `scoreValue: cfg.score`.
- Damage drops below 0 → still `kind: 'killed'`, `scoreValue: cfg.score`.
- `reflected`, `spawned`, `pos` pass through unchanged.

Light smoke tests (instance-level) for the type-specific augmentation:
- `Reflector.onBulletHit` returns `reflected: true` and `spawned.length === 1`.
- `Absorber.onBulletHit` returns `kind: 'absorbed'` when storage available, falls through to damage on overflow.
- `Boss.onBulletHit` returns `kind: 'killed'` with `scoreValue === ENEMY_CONFIGS.boss.score` when health drops to 0.

No new test infra. Same vitest invocation.

## Out of Scope

- Player damage handling: `player-vs-diver` (game.js l.241–257), `player-vs-treasure` (l.259–271), enemy-bullet-vs-player. These need a separate `PlayerHitEvent` (different shape — `lives` not `health`, game over not destroy, no score). Same fanout discipline; deferred to follow-up.
- Entry-flight animation duplication across enemy classes (Candidate 2 in the architecture review). Separate refactor.
- Actual SFX/VFX implementation. `audio.js` and `fx.js` ship as stubs.
- Restructuring `Treasure` into its own file. Stays in `enemies.js` for this PRD.

## Further Notes

- ADR-0001 (prototype-phase constraints) favours speed; the helper-function approach over class hierarchy is chosen to stay light.
- ADR-0005 (config-objects-not-DSL) supports per-target `scoreValue` field — cfg already lives per-type and `health` is read the same way.
- This is the "Strong" top-recommendation candidate from `improve-codebase-architecture` review on 2026-05-28. Candidate 2 (EntryAnimation extraction) is the natural follow-up.
