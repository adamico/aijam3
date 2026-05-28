# Elite Enemies

Elite variants of existing enemies — same base type but with increased size, health, score, and unique behaviors.

## Elite Types

### Elite Absorber
- HP: 2, Score: 512, faster spit rate
- On death: explodes into 8 bullets in a radial pattern
- Punishes over-reliance on absorbers as "safe" targets

### Elite Reflector
- HP: 5, Score: 336
- On bullet reflection: splits into two reflected bullets instead of one
- Forces repositioning strategy

### Elite Shooter
- HP: 2, Score: 48
- Shoots ~20% faster than normal shooter
- Handled via wave config variable, no special logic needed

### Elite Diver
- HP: 4, Score: 64
- Targets player directly (no vertical offset) for more dangerous dives

## Design Rationale

**Why elite enemies over mini-games:**

1. **Design coherence** — elite variants fit naturally into the Space Invaders core loop
2. **Emergent complexity** — new tactical situations arise within existing mechanics (elite absorber explosions, reflector splits)
3. **Scales with difficulty** — elites appear in every playthrough, not sporadically
4. **Graceful degradation** — can ship with 2-3 elite types; mini-games require all pieces to feel complete
5. **Lower polish budget** — elites need sprite variants and tuning; mini-games need separate UI, transitions, and standalone balancing

## Wave Integration

- Elites are spawned via updated wave patterns
- Elite spawn logic is gated by wave/cycle number for progressive introduction
- Recommended order: Elite Absorber → Elite Reflector → Elite Shooter → Elite Diver

## Implementation Priority

1. **Elite Absorber** — highest impact, spectacular death moment
2. **Elite Reflector** — split reflections create new bullet patterns
3. **Elite Shooter** — easy win via DSL config, no extra logic
4. **Elite Diver** — optional, skip if scope is tight
