# obsi Game Architecture

**Version:** 1.1.0  
**Status:** Specification  
**Author:** Architecture Team  
**Last Updated:** 2025-11-27

---

## Table of Contents

1. [Overview](#overview)
2. [Game Modes](#game-modes)
3. [Engine-Agnostic Core Architecture](#engine-agnostic-core-architecture)
4. [Design Philosophy](#design-philosophy)
5. [Architectural Patterns](#architectural-patterns)
6. [Core Systems](#core-systems)
   - [Boss System](#boss-system)
   - [Reflector and Absorber Enemies](#reflector-and-absorber-enemies)
   - [Input System (Magic Combo)](#input-system-magic-combo)
   - [Player System](#player-system)
   - [Enemy System](#enemy-system)
   - [Wave System](#wave-system)
   - [Combat System](#combat-system)
   - [Weapon Temperature System](#weapon-temperature-system)
   - [Meta Progression System](#meta-progression-system)
   - [Visual Feedback System](#visual-feedback-system)
   - [Burnout & Charge Mechanics](#burnout--charge-mechanics)
7. [Entity Definitions](#entity-definitions)
8. [State Machines](#state-machines)
9. [Game Loop Integration](#game-loop-integration)
10. [Testing Architecture](#testing-architecture)
11. [Implementation Notes](#implementation-notes)
12. [References](#references)
13. [References](#references)

---

## Overview

**obsi** is a one-button space invaders game that revolutionizes classic arcade gameplay through an innovative input mechanic called the "Magic Combo". Instead of traditional directional controls and fire buttons, the entire game is controlled through a single button with three distinct gestures: **tap**, **hold**, and **release**.

The game challenges players to master timing and risk management within a familiar space invaders framework. Players control a ship at the bottom of the screen, facing waves of descending enemies. The Magic Combo system transforms simple button interactions into a sophisticated control scheme where every decision carries strategic weight.

This architecture document provides an **engine-agnostic specification** of obsi's core systems and patterns. While the reference implementation uses PICO-8, all patterns documented here can be implemented in any game engine supporting basic programming constructs. The design emphasizes state-driven logic, finite state machines (FSMs), and an Entity-Component-System (ECS) architecture for maximum flexibility, testability, and portability.

**Key Innovation:** The Magic Combo input system creates emergent gameplay through three gesture types:

- **Tap** (quick press/release, ~0.2s): Emergency dodge with direction reversal
- **Hold** (sustained press, ~1s charge): Slows movement to 20% speed while charging a power shot
- **Release** (from charged state): Fires devastating charged shot and grants 4x speed burst

The architecture ensures these mechanics interact seamlessly through dual FSMs, acceleration curves, and precise state management.

---

## Game Modes

### Arcade Mode

**Arcade Mode** is the classic "beat the highscore" mode. Each run consists of waves of enemies, culminating in a boss fight.

#### Structure

| Wave | Description |
|------|-------------|
| 1-9 | Normal waves with increasing enemy variety and difficulty |
| 10 | Boss fight |

**One cycle = 10 waves**. Players can unlock additional cycles through meta progression (see below).

#### Wave FSM States

```
transition → combat → boss_defeated → victory
     ↑          ↓
     └── wave_clear
```

- **transition**: Interwave message, time bonus calculation
- **combat**: Active wave gameplay
- **boss_defeated**: Celebration sequence (~3s)
- **victory**: Win screen

#### Scoring

- **Wave Time Bonus**: `max(200 - seconds) × wave_n × multiplier`
  - 3x multiplier: cleared in < 10 + wave_n × 1.5 seconds
  - 2x multiplier: cleared in < 15 + wave_n × 2 seconds
  - 1x multiplier: otherwise
- **Combo System**: Consecutive kills without missing increase combo multiplier
- **Leaderboard**: High scores persisted locally

#### Wave Cycle Unlock System

Players start with 1 cycle (waves 1-10). Completing a cycle unlocks the next:

| Unlock Level | Cycles | Total Waves | Notes |
|--------------|--------|-------------|-------|
| 1 (default) | 1 | 10 | Starting progression |
| 2 | 2 | 20 | First unlock |
| 3+ | N | N×10 | Max cycles TBD |

Each subsequent cycle increases difficulty (enemy speed, aggression, HP scaling). Meta coins earned scale with waves cleared.

---

## Engine-Agnostic Core Architecture

This section documents the core architectural patterns of obsi in a platform-independent manner. These patterns can be implemented in any game engine that supports basic programming constructs (functions, tables/objects, loops).

**Timing Convention**: All timing values in this document are expressed as approximate durations (e.g., ~0.2s, ~1.0s) rather than frame counts. Implementations should convert these to appropriate values based on their target framerate. For a 60fps engine, ~1.0s equals 60 frames.

### Finite State Machine (FSM) Pattern

The FSM pattern is the foundation of obsi's state management. All major game entities (player, input, waves, game flow) use FSMs to manage their behavior.

#### FSM Core Concepts

**State**: A named mode of operation with specific behavior
**Transition**: A named event that moves from one state to another
**Callback**: A function executed when entering or exiting a state

#### FSM Structure

```pseudo
FSM = {
  state: string              -- Current state name
  transitions: {             -- Map of event → state transitions
    event_name: {
      source_state: destination_state,
      ...
    }
  }
}
```

#### FSM Operations

**Create FSM**: Initialize with starting state and transition rules

```pseudo
fsm = create_fsm(initial_state, transition_spec)
```

**Trigger Event**: Attempt state transition

```pseudo
new_state = fsm:trigger(event_name, ...args)
-- Returns new state if transition occurred, nil otherwise
```

**State Callbacks**: Execute code on state entry/exit

```pseudo
fsm.on_enter_<state_name> = function(self, prev_state)
  -- Initialize state-specific data
end

fsm.on_exit_<state_name> = function(self, prev_state)
  -- Clean up state-specific data
end
```

#### FSM Transition Rules

1. **Explicit Transitions**: `{source_state = destination_state}`
2. **Multi-Source**: `{"state1,state2,state3" = destination}` (comma-separated)
3. **Wildcard**: `{"*" = destination}` (from any state)
4. **Conditional**: `{source = function(prev, ...args) return new_state end}`

#### Example: Input FSM

```pseudo
input_fsm = create_fsm("idle", {
  press = { idle = "timing" },
  tap = { timing = "cooldown" },
  hold = { timing = "holding" },
  release = { holding = "cooldown" },
  cooldown_end = { cooldown = "idle" }
})

-- Callbacks
input_fsm.on_enter_timing = function(self)
  self.press_start_time = current_time()
end

input_fsm.on_enter_cooldown = function(self)
  self.cooldown_timer = 15  -- frames
  emit_event("start_reverse")
end
```

---

### Entity-Component-System (ECS) Pattern

The ECS pattern separates data (components) from behavior (systems), enabling flexible entity composition through tags.

#### ECS Core Concepts

**Entity**: A unique object in the game world (player, enemy, bullet, particle)
**Component**: Data attached to an entity (position, velocity, health)
**Tag**: A string label categorizing entities ("player", "enemy", "drawable", "vel")
**System**: A function that processes all entities with specific tags

#### Entity Structure

Entities are tables with:

- **Tags**: String labels (comma-separated internally)
- **Data**: Component properties (x, y, health, config, etc.)
- **No methods**: Behavior comes from systems, not entity methods

```pseudo
entity = {
  -- Component data
  x = 64,
  y = 32,
  health = 3,
  velocity_x = 1.5,
  
  -- Configuration
  config = { ... },
  
  -- FSM (if stateful)
  fsm = create_fsm(...),
  
  -- Tags (managed by ECS, not stored directly on entity)
  -- Example tags: "enemy,drawable,pos,vel,vulnerable"
}
```

#### ECS Operations

**Create World**: Initialize ECS container

```pseudo
world = create_ecs_world()
```

**Spawn Entity**: Create entity with tags

```pseudo
entity = world.spawn("player,drawable,pos,vel", {
  x = 64,
  y = 112,
  health = 3,
  config = player_config
})
```

**Tag Entity**: Add tags to existing entity

```pseudo
world.tag(entity, "charging")
world.tag(entity, "vulnerable,splashable")
```

**Untag Entity**: Remove tags

```pseudo
world.untag(entity, "charging")
world.untag(entity, "vel")  -- Stop processing by velocity systems
```

**Create System**: Define behavior for tagged entities

```pseudo
update_position = world.system("pos,vel", function(e)
  e.x = e.x + e.velocity_x
  e.y = e.y + e.velocity_y
end)
```

**Run System**: Execute system on all matching entities

```pseudo
update_position()  -- Runs for all entities tagged "pos" AND "vel"
```

**Delete Entity**: Remove from world

```pseudo
world.delete(entity)
```

#### Tag Categories

obsi uses three categories of tags:

1. Identity Tags** (what the entity is)

- `player` - The player ship
- `enemy` - Enemy entities
- `bullet` - Projectiles
- `barrier` - Defensive obstacles
- `boss` - Boss entity
- `particle` - Visual effects

2. Component Tags** (what data the entity has)

- `pos` - Has position (x, y)
- `vel` - Has velocity (velocity_x, velocity_y)
- `drawable` - Should be rendered
- `vulnerable` - Can take damage
- `splashable` - Affected by shockwaves
- `flash` - Hit flash animation active

3. State Tags** (what state the entity is in)

- `entering` - Entry animation playing
- `hover` - Hovering movement pattern
- `diving` - Diving attack pattern
- `returning` - Returning to home position
- `settling` - Settling into position
- `ready` - Ready to act
- `charging` - Player charging shot
- `dead` - Marked for deletion
- `boss_entering` - Boss entry animation
- `boss_settling` - Boss settling animation
- `boss_shooter` - Boss in shooting phase
- `absorb` - Absorb barrier type

---

### Component Definitions

Components are data properties attached to entities. obsi uses the following components:

#### Universal Components

```pseudo
x, y: number           -- Position in world space
s: number              -- Size/radius for collision
type: string           -- Entity type identifier
config: table          -- Immutable configuration
```

#### Movement Components

```pseudo
velocity_x, velocity_y: number     -- Current velocity
dir: number                        -- Direction (-1 or 1)
current_speed: number              -- Current movement speed
target_speed: number               -- Target speed for acceleration
accel_rate: number                 -- Acceleration per frame
accel_timer: number                -- Frames remaining in acceleration
```

#### Combat Components

```pseudo
health: number                     -- Current health
max_health: number                 -- Maximum health
dmg: number                        -- Damage dealt
invincible_timer: number           -- Invincibility frames
hit_flash: number                  -- Hit flash animation timer
```

#### Visual Components

```pseudo
sp: number                         -- Sprite index (platform-specific)
sw, sh: number                     -- Sprite width/height in tiles
ox, oy: number                     -- Sprite offset from position
color: number|string               -- Primary color (index or name)
```

#### Grid Components (Enemies)

```pseudo
grid_row, grid_col: number         -- Grid position
home_x, home_y: number             -- Home position in formation
```

#### Timer Components

```pseudo
shoot_timer: number                -- Shooting cooldown
charge_timer: number               -- Charge progress
burnout_timer: number              -- Burnout duration
cooldown_timer: number             -- Cooldown duration
pacifist_timer: number             -- Pacifist mode duration
speed_burst_timer: number          -- Speed burst duration
```

---

### System Architecture

Systems are pure functions that process entities with specific tags. Systems are executed in a defined order each frame.

#### System Execution Order

**Update Phase** (60 times per second):

1. Input systems (gesture recognition)
2. Player systems (movement, timers, state transitions)
3. Enemy systems (AI, movement patterns)
4. Boss systems (phase management, dropping, shooting)
5. Bullet systems (movement, collision)
6. Barrier systems (absorption, reflection)
7. Wave systems (spawning, progression)
8. Collision systems (bullet vs enemy, bullet vs barrier)
9. Cleanup systems (remove dead entities, update timers)

**Draw Phase** (60 times per second):

1. Background rendering
2. Entity rendering (sorted by layer)
3. Particle rendering
4. UI rendering (score, health, wave timer)
5. Screen shake effects

#### System Patterns

**Query System**: Count entities matching tags

```pseudo
count_enemies = world.system("enemy", function(e)
  enemy_count = enemy_count + 1
end)

enemy_count = 0
count_enemies()
-- enemy_count now contains total
```

**Update System**: Modify entity state

```pseudo
update_timers = world.system("player", function(e)
  if e.shoot_timer > 0 then
    e.shoot_timer = e.shoot_timer - 1
  end
end)
```

**Conditional System**: Process based on entity state

```pseudo
update_charging = world.system("player,charging", function(e)
  e.charge_timer = e.charge_timer + 1
  if e.charge_timer >= e.config.charge_duration then
    e.fsm:charge_complete()
  end
end)
```

**Interaction System**: Process pairs of entities

```pseudo
-- Not a direct ECS pattern, but common in obsi
function check_bullet_enemy_collision()
  for bullet in all_bullets() do
    for enemy in all_enemies() do
      if collide(bullet, enemy) then
        hit_entity(enemy, bullet)
      end
    end
  end
end
```

---

### Platform Abstraction Layer

obsi's core logic is platform-independent, but requires these capabilities from the host engine:

#### Required Capabilities

1. Data Structures

- Tables/Objects (key-value maps)
- Arrays (indexed lists)
- Strings

2. Control Flow

- Functions (first-class, closures)
- Loops (for, while)
- Conditionals (if/else)

3. Math Operations

- Basic arithmetic (+, -, *, /, %)
- Trigonometry (sin, cos)
- Random number generation
- Min/max/abs/floor/ceil

4. Input

- Button state (pressed/released)
- Frame timing (delta time or fixed timestep)

5. Rendering

- Draw sprites at position
- Draw shapes (circles, rectangles, lines)
- Draw text
- Color palette support

6. Audio

- Play sound effects
- Play/stop music

#### Platform-Specific Adaptations

Different engines will implement these differently:

**PICO-8**: `btn(4)`, `spr()`, `sfx()`, `music()`, fixed 60fps
**Picotron**: Similar API with enhanced capabilities
**Love2D**: `love.keyboard.isDown()`, `love.graphics.draw()`, `love.audio.play()`
**Unity**: Input system, SpriteRenderer, AudioSource

The core FSM and ECS logic remains identical across platforms.

---

## Design Philosophy

### One-Button Magic Combo

The entire game revolves around extracting maximum depth from minimal input. A single button supports three distinct gestures (tap, hold, release), each with different timing thresholds and state transitions. This constraint forces elegant design where every button interaction has multiple potential meanings based on duration and context.

The Magic Combo creates natural tension between safety (frequent tapping for mobility) and power (risky charging for damage). Players must constantly evaluate whether to tap for positioning or commit to a slow, vulnerable charge state for greater offensive capability.

### Risk/Reward Balance

Every decision point in the Magic Combo system involves trade-offs:

- **Tapping** provides instant mobility and safety but no offensive advantage
- **Holding** builds charge for powerful shots but drastically reduces movement speed (20%)
- **Releasing** delivers maximum damage and speed burst (400%) but requires surviving the vulnerable charge period

Enemy behaviors and wave patterns are designed to pressure players into choosing between safe tapping and risky charging, creating dynamic moment-to-moment gameplay decisions.

### State-Driven Design

All game entities are modeled as finite state machines with explicit state transitions and callbacks. This architectural choice provides:

- **Predictability**: Every entity behavior is defined by its current state and valid transitions
- **Debuggability**: State history and transition logs enable precise debugging
- **Testability**: Individual states and transitions can be unit tested in isolation

The dual FSM architecture (Player FSM + Input FSM) separates gameplay state from input recognition, allowing independent evolution of control feel and character behavior.

### Test-Driven Development Workflow

The architecture supports TDD through:

- **Isolated Systems**: ECS patterns enable testing individual systems without full game context
- **State Verification**: FSM state transitions provide clear assertions for test cases
- **Mock-Friendly**: Entity configuration patterns separate initial state from runtime behavior

The testing architecture includes specialized test cartridges that exercise specific systems (player movement, enemy AI, collision detection) independently before integration.

### Entity Configuration Pattern

All dynamic entities (player, enemies, bullets, particles) follow a consistent configuration pattern:

- Immutable `config` table defines initial/default values
- Mutable runtime properties track current state
- `reset()` method restores entity to initial configuration

This pattern enables:

- **Predictable Resets**: Entities return to known states after death/respawn
- **Clear Separation**: Initial values never mutate, preventing configuration drift
- **Easy Tuning**: Configuration tables serve as single source of truth for game balance

---

## Architectural Patterns

The obsi architecture is built on four core patterns that provide structure and maintainability across all game systems. These patterns work together to create a flexible, testable, and extensible codebase.

### Foundational Patterns

These two patterns establish conventions used throughout the codebase:

1. Entity Configuration Pattern

Every dynamic entity maintains separation between immutable configuration and mutable runtime state:

```pseudo
entity = {
  -- Immutable configuration (never changes after initialization)
  config = {
    max_health = 3,
    speed = 1.0,
    color = 8,
    size = 4
  },
  
  -- Mutable runtime state (changes during gameplay)
  x = 64,
  y = 64,
  health = 3,
  velocity_x = 0,
  velocity_y = 0,
  
  -- Reset method restores initial state
  reset = function(self)
    self.x = self.config.spawn_x
    self.y = self.config.spawn_y
    self.health = self.config.max_health
    self.velocity_x = 0
    self.velocity_y = 0
  end
}
```

**Benefits:**

- Configuration drift is impossible (config table is read-only by convention)
- Reset behavior is explicit and testable
- Game balance tuning has a single source of truth
- Save/load systems can serialize config separately from runtime state

2. FSM Callback Pattern

All FSM state transitions execute callbacks with consistent signatures:

```pseudo
-- Transition callbacks receive (self, prev_state)
on_enter_state = function(self, prev_state)
  -- Initialize state-specific data
  -- Set up timers, flags, or visual effects
end

on_exit_state = function(self, prev_state)
  -- Clean up state-specific data
  -- Reset flags or stop effects
end
```

The first parameter (`self`) provides access to the entity's data. The second parameter (`prev_state`) enables transition-specific logic (e.g., different behavior when entering "moving" from "reversing" vs. "charging").

**Benefits:**

- Consistent callback signatures across all FSMs
- Proper encapsulation (callbacks operate on entity state)
- Transition history enables complex state-dependent behaviors
- Easy to add logging/debugging to state changes

### System-Specific Patterns

These two patterns define the architecture of major game systems:

3. Dual FSM Architecture

The player control system uses two independent finite state machines working in concert:

```pseudo
┌─────────────────────────────────────────────────┐
│                  INPUT FSM                      │
│  (Recognizes button gestures)                   │
│                                                 │
│  [idle] → [timing] → [holding] → [cooldown]     │
│             ↓           ↓                       │
│           [tap]      [release]                  │
│                                                 │
│         Emits Events:                           │
│         • start_reverse (tap detected)          │
│         • start_charge (hold detected)          │
│         • fire_charged (release detected)       │
└─────────────────────────────────────────────────┘
                        ↓ events
┌─────────────────────────────────────────────────┐
│                 PLAYER FSM                      │
│  (Manages gameplay state)                       │
│                                                 │
│  [moving] ⇄ [reversing]                         │
│      ↓                                          │
│  [charging] → [charged] → [speed_burst]         │
│                                                 │
│  Listens to Events:                             │
│  • start_reverse → transition to [reversing]    │
│  • start_charge → transition to [charging]      │
│  • fire_charged → transition to [speed_burst]   │
└─────────────────────────────────────────────────┘
```

**Separation of Concerns:**

- Input FSM handles low-level timing and gesture recognition
- Player FSM handles high-level gameplay state and mechanics
- Events provide loose coupling between the two systems

**Benefits:**

- Independent tuning of input feel vs. gameplay mechanics
- Input gestures can trigger different gameplay responses based on context
- Easy to add new gestures without touching gameplay code
- Clear testability boundaries (test gesture recognition separately from gameplay)

4. ECS Entity Tagging

The Entity-Component-System uses tags (string labels) to categorize entities and drive system execution:

```pseudo
-- Create enemy entity
enemy = world.spawn()

-- Tag entity with behavioral characteristics
world.tag(enemy, "enemy")      -- All enemies have this
world.tag(enemy, "hover")      -- Movement pattern
world.tag(enemy, "shooter")    -- Combat behavior

-- Systems process entities by tag
update_hover = world.sys("hover", function(e)
  -- This runs for all entities tagged "hover"
  e.x = e.x + e.velocity_x
  e.y = e.y + sin(time() + e.wave_offset)
end)

update_shooter = world.sys("shooter", function(e)
  -- This runs for all entities tagged "shooter"
  e.shoot_timer = e.shoot_timer - 1
  if e.shoot_timer <= 0 then
    spawn_enemy_bullet(e.x, e.y)
    e.shoot_timer = e.config.shoot_rate
  end
end)
```

**Tag Categories:**

- **Identity Tags**: `"enemy"`, `"bullet"`, `"particle"` (what it is)
- **Behavior Tags**: `"hover"`, `"diver"`, `"shooter"` (how it acts)
- **State Tags**: `"entering"`, `"active"`, `"exiting"` (lifecycle phase)

**Benefits:**

- Mix-and-match behaviors without inheritance hierarchies
- Systems are pure functions operating on tagged entity subsets
- Add new behaviors by creating new tags + systems
- Performance-friendly (systems only process relevant entities)

### Pattern Interactions

These four patterns work together to create a cohesive architecture:

1. **Entity Configuration** provides the data layer for all entities
2. **FSM Callback** defines how entities transition between states
3. **Dual FSM** applies FSM pattern to input + gameplay domains
4. **ECS Tagging** organizes entities and drives system execution

Example: An enemy entity uses **Entity Configuration** for its stats, **FSM Callback** for state transitions (entering → hovering → diving), and **ECS Tagging** to determine which systems process it each frame.

---

## Core Systems

### Boss System

The Boss System introduces a multi-phase encounter that serves as the climactic wave 4 experience. The boss uses a 3-phase behavior cycle (dropping, pause, shooting) with visual indicators, health management, and dynamic enemy spawning.

#### Boss Entity Configuration

```pseudo
boss = {
  type = "boss"
  health = 100
  max_health = 100
  size = 15
  base_color = 10
  score = 500
  
  -- Position
  x, y: number
  home_x = 64, home_y = 40
  
  -- Phase management
  phase: number                    -- 1=dropping, 2=pause, 3=shooting
  phase_timer: number              -- Frames remaining in current phase
  drop_phase_duration = 120        -- ~2.0s dropping enemies
  pause_phase_duration = 120       -- ~2.0s pause between phases
  shoot_phase_duration = 120       -- ~2.0s shooting at player
  
  -- Behavior timers
  drop_timer: number               -- Countdown to spawn next enemy
  drop_rate = 30                   -- Base frames between spawns
  shoot_timer: number              -- Shooting cooldown (managed by shooter system)
  
  -- Entry animation
  entry_speed = 0.5                -- Slow dramatic descent
  entry_sway: number               -- Looming sway timer
  settle_timer: number             -- Pause before combat begins
  grace_period = 120               -- Initial grace before dropping starts
  
  -- Movement
  sway_timer: number               -- Sinusoidal weaving pattern
}
```

#### Boss Lifecycle States

Boss uses ECS tags to manage its lifecycle:

1. **boss_entering**: Slow dramatic descent with subtle sway
2. **boss_settling**: Brief pause at home position before combat (~2s)
3. **boss**: Active combat state, cycling through 3 phases
4. **dead**: Triggered when health reaches 0

#### Boss Phase System

```pseudo
-- Phase cycle: 1 (drop) → 2 (pause) → 3 (shoot) → 1 (repeat)

update_boss_phase = world.sys("boss", function(b)
  -- Skip during entry/settling
  if is_entering_or_settling(b) then return end
  
  -- Decrement phase timer
  b.phase_timer -= 1
  
  -- Transition when timer expires
  if b.phase_timer <= 0 then
    b.phase = (b.phase % 3) + 1  -- Cycle through 1, 2, 3
    
    -- Reset timer based on new phase
    if b.phase == 1 then
      b.phase_timer = b.drop_phase_duration
    elseif b.phase == 2 then
      b.phase_timer = b.pause_phase_duration
    elseif b.phase == 3 then
      b.phase_timer = b.shoot_phase_duration
    end
  end
end)
```

**Phase Behaviors:**

- **Phase 1 (Dropping)**: Boss spawns enemies below its position at health-scaled intervals
  - Drop timer formula: `max(10, drop_rate * (health / max_health))`
  - Accelerates spawning as boss health decreases
  - Spawns into "dropper zone" (rows 4-5, columns 0-10)
  - Enemy types: Popcorn or Kamikaze (50/50 random)

- **Phase 2 (Pause)**: Brief respite, no actions
  - Visual indicator: Blue outer ring
  - Allows player to reposition and assess threats

- **Phase 3 (Shooting)**: Boss becomes a "shooter" entity
  - Visual indicator: Red outer ring
  - Boss tags itself with "shooter" to use existing enemy shooting system
  - Uses wave 4 config: shoot_chance=1.0, shoot_rate=30 (aggressive)
  - Boss config: intent_warn_time=0 (instant shooting, no telegraph)

#### Boss Movement Pattern

```pseudo
update_boss_movement = world.sys("boss", function(b)
  if is_entering_or_settling(b) then return end
  
  -- Sinusoidal weaving across screen
  b.sway_timer += 0.005
  b.x = 64 + sin(b.sway_timer) * 40  -- Oscillates ±40 pixels from center
end)
```

#### Boss Entry Animation

```pseudo
update_boss_entering = world.sys("boss_entering", function(b)
  -- Slow descent
  b.y += b.entry_speed  -- 0.5 pixels per frame
  
  -- Menacing sway (slower/smaller than combat sway)
  b.entry_sway += 0.003
  b.x = b.home_x + sin(b.entry_sway) * 8
  
  -- Check arrival at home position
  if b.y >= b.home_y then
    b.y = b.home_y
    b.x = b.home_x
    untag(b, "boss_entering")
    tag(b, "boss_settling")
    b.settle_timer = 120  -- ~2.0s pause
    play_sound("boss_arrival")
    screen_shake(6)
  end
end)

update_boss_settling = world.sys("boss_settling", function(b)
  b.settle_timer -= 1
  if b.settle_timer <= 0 then
    untag(b, "boss_settling")
    -- Initialize phase 1 (dropping)
    b.phase = 1
    b.phase_timer = b.grace_period
  end
end)
```

#### Boss Enemy Dropper System

```pseudo
update_boss_dropper = world.sys("boss", function(b)
  if is_entering_or_settling(b) or b.phase != 1 then return end
  
  b.drop_timer -= 1
  
  if b.drop_timer <= 0 then
    local row, col = find_free_dropper_position()  -- Grid check
    
    if row and col then
      local enemy_type = rnd() > 0.5 and "p" or "k"
      
      -- Set global position for spawn animation
      boss_drop_x = b.x
      boss_drop_y = b.y
      
      spawn_enemy_with_entry(enemy_type, row, col, "from_boss")
    end
    
    -- Health-scaled drop rate
    local health_pct = b.health / b.max_health
    b.drop_timer = max(10, flr(b.drop_rate * health_pct))
  end
end)

-- Find free position in dropper zone (rows 4-5, cols 0-10)
function find_free_dropper_position()
  local attempts = {}
  for row = 4, 5 do
    for col = 0, 10 do
      add(attempts, {row=row, col=col})
    end
  end
  
  -- Shuffle for randomness
  shuffle(attempts)
  
  -- Return first free position
  for attempt in attempts do
    if not is_grid_occupied(attempt.row, attempt.col) then
      return attempt.row, attempt.col
    end
  end
  
  return nil, nil  -- All occupied
end
```

#### Boss Shooting System

```pseudo
update_boss_shooting = world.sys("boss", function(b)
  if is_entering_or_settling(b) then return end
  
  -- Phase 3: Add shooter tag
  if b.phase == 3 then
    if not has_tag(b, "shooter") then
      tag(b, "shooter")
      b.shoot_timer = 0  -- Trigger immediate shot on phase start
    end
  else
    -- Other phases: Remove shooter tag
    if has_tag(b, "shooter") then
      untag(b, "shooter")
    end
  end
end)

-- Boss uses existing enemy shooter system
-- Wave 4 config: shoot_chance=1.0, shoot_rate=30
-- Boss config: intent_warn_time=0 (instant shooting)
```

#### Boss Visual Feedback

```pseudo
draw_boss = world.sys("boss", function(b)
  -- Core UFO sprite
  circfill(b.x, b.y, b.size, b.base_color)
  circ(b.x, b.y, b.size, "white")  -- Outer ring
  
  -- Phase indicators
  if b.phase == 2 then
    circ(b.x, b.y, b.size + 2, "blue")   -- Blue ring (pause)
  elseif b.phase == 3 then
    circ(b.x, b.y, b.size + 2, "red")    -- Red ring (shooting)
  end
end)

draw_boss_healthbar = world.sys("boss", function(b)
  local bar_x = 14, bar_y = 16
  local bar_w = 100, bar_h = 4
  local health_pct = b.health / b.max_health
  
  -- Background
  rectfill(bar_x, bar_y, bar_x + bar_w, bar_y + bar_h, "black")
  
  -- Health fill
  local health_w = bar_w * health_pct
  rectfill(bar_x, bar_y, bar_x + health_w, bar_y + bar_h, "red")
  
  -- Border
  rect(bar_x - 1, bar_y - 1, bar_x + bar_w + 1, bar_y + bar_h + 1, "white")
end)
```

#### Boss Defeat

```pseudo
kill_boss = world.sys("boss", function(boss)
  tag(boss, "dead")
  score += boss.score
  shake = 8
  kill_all_enemies()  -- Clear all spawned enemies
  wave_fsm:boss_defeated()  -- Trigger victory screen
end)
```

**Design Notes:**

1. **Dynamic Difficulty**: Drop rate accelerates as boss health decreases, increasing pressure
2. **Phase Clarity**: Visual indicators (colored rings) communicate current phase to player
3. **System Reuse**: Boss uses existing "shooter" system during phase 3, avoiding duplicate code
4. **Instant Shooting**: Boss config sets intent_warn_time=0 to bypass telegraph system for aggressive feel
5. **Wave Config Integration**: Shooter system dynamically reads wave_n config, so boss gets wave 4 settings
6. **Spatial Management**: Dropper zone uses grid occupancy checks to prevent overlapping spawns

---

### Reflector and Absorber Enemies

The Reflector and Absorber enemies provide defensive obstacles that interact with bullets in two distinct ways: **Reflectors** bounce bullets back at the player, and **Absorbers** store bullets then spit them back.

#### Enemy Types

**Reflector:**

- Health: 3
- Speed: 0 (stationary)
- Color: Pink/highlight color
- Behavior: Reflects player bullets downward (inverts velocity)
- Takes 1 damage per reflection
- Tags: `["enemy", "reflector", "splashable"]`

**Absorber:**

- Health: 1
- Speed: 0 (stationary)
- Color: Dark/muted color
- Behavior: Stores up to 3 bullets, spits them back at player
- Displays stored bullet count on sprite
- Takes 1 damage when storage overflows (>3 bullets)
- Spit rate: ~1.0s between spits
- Tags: `["enemy", "absorber", "splashable"]`

#### Enemy Configuration

```pseudo
enemy_configs = {
  reflector = {
    health = 3,
    speed = 0,
    color = "pink",
    size = 6,
    score = 100,
    tags = {"enemy", "reflector", "splashable"}
  },
  
  absorber = {
    health = 1,
    speed = 0,
    color = "dark_gray",
    size = 6,
    score = 150,
    max_stored = 3,
    spit_rate = 60,  -- ~1.0s at 60fps
    tags = {"enemy", "absorber", "splashable"}
  }
}
```

#### Collision Handling

```pseudo
function handle_reflector_collision(enemy, bullet)
  -- Invert bullet velocity (send downward)
  bullet.vy = -bullet.vy
  bullet.y = enemy.y + enemy.size/2 + bullet.size
  
  damage_enemy(enemy, 1)
  shake = 2
end

function handle_absorber_collision(enemy, bullet)
  store_bullet_in_absorber(enemy)
  tag(bullet, "dead")  -- Remove bullet
  
  -- Spawn absorption particles
  spawn_particles(3, bullet.x, bullet.y, enemy.base_color)
end

function store_bullet_in_absorber(enemy)
  enemy.stored_bullets = min(enemy.stored_bullets + 1, enemy.max_stored)
  
  -- Overload damage if full
  if enemy.stored_bullets >= enemy.max_stored then
    damage_enemy(enemy, 1)
  end
end

-- Absorber system: spit bullets back at player
update_absorbers = world.sys("absorber", function(e)
  if e.stored_bullets <= 0 then return end
  
  -- Handle overflow
  if e.stored_bullets > e.max_stored then
    damage_enemy(e, 1)
    return
  end
  
  e.spit_timer -= 1
  if e.spit_timer <= 0 then
    spawn_enemy_bullet(e.x, e.y)
    e.stored_bullets -= 1
    e.spit_timer = enemy_configs.absorber.spit_rate
  end
end)
```

#### Shockwave Interaction

Charged bullets create expanding shockwaves that interact with these enemies:

```pseudo
function splash_special_enemy(enemy)
  if has_tag(enemy, "reflector") then
    damage_enemy(enemy, 1)
  elseif has_tag(enemy, "absorber") then
    store_bullet_in_absorber(enemy)
  end
end

update_shockwaves = world.sys("shockwave", function(sw)
  sw.radius += sw.growth_rate
  
  -- Track hit entities to prevent double-hitting
  if not sw.hit_entities then
    sw.hit_entities = {}
  end
  
  -- Check collision with splashable entities
  for entity in world.tagged("splashable") do
    if sw.hit_entities[entity] then continue end
    
    if collide_circle(sw.x, sw.y, sw.radius, entity.x, entity.y, 3) then
      sw.hit_entities[entity] = true
      
      if has_tag(entity, "reflector") or has_tag(entity, "absorber") then
        splash_special_enemy(entity)
      else
        damage_enemy(entity, 1)
      end
    end
  end
  
  -- Remove when fully expanded
  if sw.radius >= sw.max_radius then
    del(shockwaves, sw)
  end
end)
```

**Design Notes:**

1. **Stationary Obstacles**: Both Reflector and Absorber have speed=0, acting as static obstacles in formations
2. **Risk/Reward**: Reflectors punish careless shooting, Absorbers punish sustained fire
3. **Splashable Tag**: Both are tagged "splashable" for unified shockwave interaction
4. **Visual Clarity**: Absorbers show stored count on sprite, health bars appear when damaged
5. **Overflow Mechanic**: Absorbers take damage when overfilled, rewarding precise burst fire

---

### Input System (Magic Combo)

The Magic Combo system is the heart of obsi's innovation—a single button that recognizes distinct gestures. The implementation uses **simple edge detection**, with gesture recognition handled by the Player FSM.

#### Input Architecture

The input system detects button press/release edges and forwards them directly to the Player FSM:

```pseudo
prev_button = false
input_disabled = false

function update_input()
    if input_disabled then return end
    
    button = is_button_held()
    
    if button and not prev_button then
        -- Rising edge: button just pressed
        on_press()
    elseif not button and prev_button then
        -- Falling edge: button just released
        on_release()
    end
    
    prev_button = button
end

function on_press()
    player.fsm:press_button()
end

function on_release()
    state = player.fsm.state
    
    -- Reverse direction on release from charging/charged states
    if state == "charging" or state == "charged" then
        player.dir = -player.pre_press_dir
        
        if state == "charged" then
            shoot(player, "charged")
            player.speed_burst_timer = config.speed_burst_duration
            player.fsm:fire_charged()
        end
    end
    
    player.fsm:release_button()
end

function input_disable()
    input_disabled = true
    prev_button = false  -- Prevent stale state on re-enable
end

function input_enable()
    input_disabled = false
end
```

#### Input-to-Player FSM Mapping

| Button Event | Player FSM Trigger | Effect |
|--------------|-------------------|--------|
| Press | `press_button` | Starts charging (moving → charging) |
| Release (charging) | `release_button` | Returns to moving, reverses direction |
| Release (charged) | `fire_charged` → `release_button` | Fires charged shot, starts speed burst, reverses direction |

#### Direction Reversal Logic

Direction reversal happens on **button release**, not press:

1. **On Press**: Store current direction in `pre_press_dir`
2. **On Release**: Set `dir = -pre_press_dir`

This means:
- If moving right, press+release → now moving left
- If charged, fire + speed burst happens in new direction

#### Input Enable/Disable

Input is disabled during:
- `pre_entry` state (spawn animation)
- `exiting` state (death animation)
- `pacifist` state initial frames

```pseudo
-- Player FSM callbacks
on_enter_exiting = function()
    input_disable()
    exit_timer = 30
end

on_enter_moving = function()
    input_enable()
    start_acceleration("normal")
end
```

**Key Design Principle**: The input layer is minimal—it only detects edges and forwards to the Player FSM. All gesture interpretation (what constitutes a "tap" vs "hold") happens via Player FSM state and timers.

---

### Player System

The Player FSM manages high-level gameplay state in response to Input FSM events. It coordinates movement speed, shooting mechanics, and state-dependent behaviors.

#### Player FSM States

```pseudo
┌──────────────────────────────────────────────────────────────┐
│                       PLAYER FSM                             │
│                                                              │
│  [pre_entry] (spawning animation)                            │
│      ↓                                                       │
│  [pacifist] (invincible warmup, no shooting)                 │
│      ↓                                                       │
│  [moving] ◄──┐                                               │
│      ↓       │                                               │
│  (start_reverse event)                                       │
│      ↓       │                                               │
│  [reversing]─┘ (decel to 0, flip dir, accel to normal)       │
│                                                              │
│  [moving]                                                    │
│      ↓                                                       │
│  (start_charge event)                                        │
│      ↓                                                       │
│  [charging] (speed: 1.0 → 0.2, timer increments)             │
│      ↓                                                       │
│  (timer >= charge_time)                                      │
│      ↓                                                       │
│  [charged] (speed: 0.2, ready to fire)                       │
│      ↓                                                       │
│  (fire_charged event)                                        │
│      ↓                                                       │
│  [speed_burst] (speed: 0.2 → 4.0, duration ~0.5s)            │
│      ↓                                                       │
│  (timer expires)                                             │
│      ↓                                                       │
│  [moving] (speed: 4.0 → 1.0)                                 │
│                                                              │
│  [exiting] (death animation)                                 │
└──────────────────────────────────────────────────────────────┘
```

**State Definitions:**

- **pre_entry**: Spawn animation plays, player not yet controllable
- **pacifist**: Brief invincibility period after spawning, shooting disabled
- **moving**: Normal state, full control and shooting enabled
- **reversing**: Direction change in progress (decelerate → flip → accelerate)
- **charging**: Holding button, movement slowed, charge timer incrementing
- **charged**: Charge complete, player can release for powered shot
- **speed_burst**: Post-shot speed boost active, rapid movement
- **exiting**: Death animation plays, player losing control

#### Player FSM Pseudo-Code

```pseudo
-- Player configuration (Entity Configuration Pattern)
player = {
  config = {
    spawn_x = 64,
    spawn_y = 112,
    size = 4,
    color = 8,
    max_health = 3,
    
    -- Speed values
    speed_normal = 1.0,
    speed_charging = 0.2,
    speed_burst = 4.0,
    
    -- Acceleration rates (frames to complete transition)
    accel_to_charging = 10,    -- ~0.17s to slow down
    accel_to_burst = 5,         -- ~0.08s to speed up
    accel_to_normal = 15,       -- ~0.25s to normalize
    accel_reverse = 8,          -- ~0.13s for direction change
    
    -- Charge timing
    charge_time = 60,           -- ~1.0s to fully charge
    burst_duration = 30,        -- ~0.5s speed burst
    
    -- Shooting
    shoot_rate_normal = 15,     -- ~0.25s between shots
    shoot_rate_burst = 6        -- ~0.1s during speed burst
  },
  
  -- Runtime state
  x = 64,
  y = 112,
  direction = 1,              -- 1 = right, -1 = left
  current_speed = 0,
  target_speed = 1.0,
  accel_timer = 0,
  accel_duration = 0,
  
  charge_timer = 0,
  burst_timer = 0,
  shoot_timer = 0,
  
  health = 3,
  invincible = false,
  
  fsm = FSM:new("pre_entry")
}

-- FSM Transition definitions
player.fsm:add_transition("pre_entry", "entry_complete", "pacifist")
player.fsm:add_transition("pacifist", "warmup_complete", "moving")
player.fsm:add_transition("moving", "start_reverse", "reversing")
player.fsm:add_transition("reversing", "reverse_complete", "moving")
player.fsm:add_transition("moving", "start_charge", "charging")
player.fsm:add_transition("charging", "charge_complete", "charged")
player.fsm:add_transition("charging", "charge_interrupted", "moving")
player.fsm:add_transition("charged", "fire_charged", "speed_burst")
player.fsm:add_transition("speed_burst", "burst_complete", "moving")
player.fsm:add_transition("*", "player_death", "exiting")

-- State callbacks (FSM Callback Pattern)

function on_enter_moving(self, prev_state)
  if prev_state == "speed_burst" then
    start_acceleration(self, "burst_to_normal")
  elseif prev_state == "reversing" then
    -- Already at target speed from reversing
  else
    start_acceleration(self, "to_normal")
  end
  self.shoot_timer = self.config.shoot_rate_normal
end

function on_enter_reversing(self, prev_state)
  -- Decelerate to zero, then flip direction, then accelerate
  start_acceleration(self, "reverse")
end

function on_enter_charging(self, prev_state)
  self.charge_timer = 0
  start_acceleration(self, "to_charging")
  play_sound("charge_start")
end

function on_exit_charging(self, prev_state)
  if self.charge_timer < self.config.charge_time then
    -- Charge interrupted before completion
    start_acceleration(self, "to_normal")
  end
end

function on_enter_charged(self, prev_state)
  play_sound("charge_ready")
  screen_flash()  -- Visual feedback
end

function on_enter_speed_burst(self, prev_state)
  spawn_charged_bullet(self.x, self.y, self.direction)
  start_acceleration(self, "to_burst")
  self.burst_timer = self.config.burst_duration
  self.shoot_timer = self.config.shoot_rate_burst
  play_sound("charged_shot")
  screen_shake(8)  -- Strong visual feedback
end

function on_enter_burnout(self, prev_state)
  -- Disable shooting and show visual feedback
  self.can_shoot = false
  self.burnout_timer = self.config.burnout_cooldown
  play_sound("burnout_start")
  start_visual_burnout_indicator(self)
end

-- Acceleration system
function start_acceleration(self, profile)
  if profile == "to_charging" then
    self.target_speed = self.config.speed_charging
    self.accel_duration = self.config.accel_to_charging
  elseif profile == "to_burst" then
    self.target_speed = self.config.speed_burst
    self.accel_duration = self.config.accel_to_burst
  elseif profile == "to_normal" or profile == "burst_to_normal" then
    self.target_speed = self.config.speed_normal
    self.accel_duration = self.config.accel_to_normal
  elseif profile == "reverse" then
    self.target_speed = 0  -- First stop
    self.accel_duration = self.config.accel_reverse
  end
  
  self.accel_timer = 0
  self.accel_start_speed = self.current_speed
end

function update_acceleration(self)
  if self.accel_timer < self.accel_duration then
    self.accel_timer = self.accel_timer + 1
    local t = self.accel_timer / self.accel_duration
    
    -- Smooth interpolation (ease-in-out)
    t = t * t * (3 - 2 * t)
    
    self.current_speed = lerp(self.accel_start_speed, self.target_speed, t)
  else
    self.current_speed = self.target_speed
  end
end

-- Main player update
function update_player()
  local state = player.fsm:current()
  
  -- State-specific updates
  if state == "moving" then
    update_acceleration(player)
    update_movement(player)
    update_shooting(player)
    
  elseif state == "reversing" then
    update_acceleration(player)
    
    -- Check if deceleration to zero is complete
    if player.current_speed <= 0.01 and player.accel_timer >= player.accel_duration then
      -- Flip direction and start accelerating
      player.direction = -player.direction
      start_acceleration(player, "to_normal")
      player.fsm:trigger("reverse_complete")
    end
    
  elseif state == "charging" then
    update_acceleration(player)
    update_movement(player)
    player.charge_timer = player.charge_timer + 1
    
    if player.charge_timer >= player.config.charge_time then
      player.fsm:trigger("charge_complete")
    end
    
  elseif state == "charged" then
    update_movement(player)
    -- Speed remains at charging speed, waiting for release
    
  elseif state == "speed_burst" then
    update_acceleration(player)
    update_movement(player)
    update_shooting(player)  -- Rapid fire during burst
    
    player.burst_timer = player.burst_timer - 1
    if player.burst_timer <= 0 then
      player.fsm:trigger("burst_complete")
    end
  end
  
  -- Collision and boundary checks
  check_screen_bounds(player)
  check_enemy_collisions(player)
end

function update_movement(player)
  player.x = player.x + (player.direction * player.current_speed)
end

function update_shooting(player)
  player.shoot_timer = player.shoot_timer - 1
  -- Shooting is blocked while player is charging, charged, pacifist, pre_entry, exiting, or in burnout
  if player.shoot_timer <= 0 and not cannot_shoot() then
    spawn_bullet(player.x, player.y, "normal")
    player.shoot_timer = (player.fsm:current() == "speed_burst") 
                         and player.config.shoot_rate_burst 
                         or player.config.shoot_rate_normal
  end
end

-- Burnout behavior
-- The Player FSM updates `burnout_timer` during `charged` and transitions to `burnout` via the `burn` event when `burnout_time` is exceeded. The `cooldown_timer` is incremented in the `burnout` state until `cool` is triggered and the player returns to `moving`.

-- Update cycle (implementation mirrors `src/player.lua`)
function update_burnout()
  if player.fsm:current() ~= "charged" then return end
  player.burnout_timer += 1
  if player.burnout_timer >= player.config.burnout_time then
    player.fsm:trigger("burn")
    player.burnout_timer = 0
  end
end

function update_cooldown()
  if player.fsm:current() ~= "burnout" then return end
  player.cooldown_timer += 1
  if player.cooldown_timer >= player.config.cooldown_timer then
    player.fsm:trigger("cool")
    player.cooldown_timer = 0
  end
end

-- Timers are reset using `reset_timers()` at crucial transitions (e.g., after firing charged shot or re-entering moving) which clears `charge_timer`, `burnout_timer`, and `cooldown_timer`.
```

#### Acceleration System Details

The acceleration system provides smooth speed transitions critical to game feel:

**Smooth Curves**: Uses ease-in-out interpolation (smoothstep) rather than linear interpolation to avoid jarring speed changes.

**State-Dependent Rates**: Different transitions have different acceleration durations:

- **to_charging** (~0.17s): Quick enough to feel responsive, slow enough to emphasize vulnerability
- **to_burst** (~0.08s): Nearly instant to reward successful charge
- **to_normal** (~0.25s): Gradual return to baseline prevents disorientation
- **reverse** (~0.13s): Fast enough for emergency dodges, slow enough to feel intentional

**Direction Changes**: Reversing decelerates to zero before flipping direction, preventing instant 180° turns that would look unnatural.

**Integration with FSM**: Acceleration profiles are triggered by state transitions, ensuring speed always matches gameplay state.

---

### Enemy System

The enemy system combines ECS entity tagging with the **Strategy Pattern** to manage complex behaviors efficiently. Instead of having separate systems for each enemy type, a generic `EnemyBehaviorSystem` delegates update logic to behavior strategies defined in the enemy's breed configuration (`Type Object`).

#### Behavior Strategies

Behaviors are encapsulated in stateless modules (e.g., `AbsorberBehavior`, `DiverBehavior`) that implement a common interface (`update(entity, world)`).

- **Generic Runner**: `EnemyBehaviorSystem` iterates all enemies and calls `entity.breed.behavior.update(entity, world)`.
- **Extensibility**: New enemy types can be added by creating a new behavior strategy and mapping it in `enemies.json`, without modifying the core system code.
- **Composition**: Behaviors can manage their own internal state (like FSMs) or delegate sub-behaviors.

#### Enemy Configuration

Enemy types are defined as configuration objects with the following properties:

```pseudo
enemy_configs = {
    shooter = {
        category = "enemy",
        health = 1,
        size = 3,
        score = 16,
        sprite = "shooter",
        drop_chance = 0.05,
        behavior = { idle = "shoot_rate", shoot = 1 }
    },
    
    diver = {
        category = "enemy",
        health = 2,
        size = 4,
        score = 32,
        sprite = "diver",
        drop_chance = 0.08,
        dive_speed = 0.5,
        behavior = { idle = "dive_rate", dive = 1 }
    },
    
    reflector = {
        category = "barrier",
        tags = { "barrier" },
        health = 3,
        size = 3,
        score = 160,
        sprite = "reflector",
        drop_chance = 0.15
    },
    
    absorber = {
        category = "barrier",
        tags = { "barrier", "absorber" },
        health = 1,
        size = 3,
        score = 256,
        sprite = "absorber",
        drop_chance = 0.15,
        max_stored = 3,
        spit_delay = 90,
        spit_interval = 15
    },
    
    treasure = {
        category = "miniboss",
        tags = { "miniboss" },
        health = 15,
        size = 5,
        score = 500,
        sprite = "treasure",
        drop_chance = 1.0,
        speed = 1.5,
        movement = "bouncing",  -- Diagonal bouncing like pool ball
        spawn_interval = 3600,  -- Spawns every 60 seconds (at 60fps)
        spawn_distance_min = 40 -- Minimum distance from player on spawn
    },
    
    boss = {
        category = "enemy",
        tags = { "boss" },
        health = 50,
        size = 8,
        score = 800,
        sprite = "boss",
        home_x = 62,
        home_y = 42,
        speed = 1,
        shoot_rate = 30,
        spawn_rate = 45,
        behavior = { idle = 60, shoot_loop = 120, spawn_minions = 120 }
    }
}

-- Elite variants inherit from base and override specific properties
elite_configs = {
    elite_shooter = extend(enemy_configs.shooter, {
        tags = { "elite" },
        health = 2,
        score = 48,
        behavior = { idle = "shoot_rate * 0.7", shoot_aimed = 1 }
    }),
    
    elite_diver = extend(enemy_configs.diver, {
        tags = { "elite" },
        health = 4,
        size = 5,
        score = 64
    }),
    
    elite_reflector = extend(enemy_configs.reflector, {
        tags = { "barrier", "elite" },
        health = 5,
        size = 4,
        score = 336
    }),
    
    elite_absorber = extend(enemy_configs.absorber, {
        tags = { "barrier", "absorber", "elite" },
        health = 2,
        size = 4,
        score = 512,
        spit_interval = 8
    })
}
```

#### Enemy Type Reference

| Type | Name | HP | Score | Behavior | Notes |
|------|------|-----|-------|----------|-------|
| `p` | Shooter | 1 | 16 | Idle → Shoot (downward) | Basic shooter |
| `k` | Diver | 2 | 32 | Idle → Dive (returns to home) | Fast diver |
| `r` | Reflector | 3 | 160 | N/A | Reflects bullets back |
| `a` | Absorber | 1 | 256 | Stores → Spits bullets | Max 3 stored |
| `t` | Treasure | 15 | 500 | Bouncing (pool ball) | Mini-boss, drops weapons/items |
| `B` | Boss | 50 | 800 | Shoot loop + Spawn minions | Multi-phase |
| `P` | Elite Shooter | 2 | 48 | Idle → Aimed shot | Targets player |
| `K` | Elite Diver | 4 | 64 | Faster dive rate | Homing on vertical |
| `R` | Elite Reflector | 5 | 336 | N/A | Splits reflected bullets |
| `A` | Elite Absorber | 2 | 512 | Faster spit interval | More dangerous |

#### Behavior System

Behaviors are defined using a DSL that specifies action sequences:

```pseudo
-- Behavior format: "(state:duration,state:duration,...)"
-- Duration can reference wave config: "shoot_rate", "dive_rate"
-- Duration can use multipliers: "shoot_rate*0.7"

behavior_actions = {
    shoot = { warn = "shoot", run = fire_downward },
    shoot_aimed = { warn = "shoot", run = fire_at_player },
    shoot_loop = { cont = true, run = continuous_shooting },
    dive = { 
        warn = "dive", 
        check = function(e) return random() < wcfg.dive_chance end,
        run = start_dive 
    },
    spawn_minions = { cont = true, run = spawn_minion },
}

function parse_behavior(behavior_string, wave_config)
    -- Parse "(idle:60,shoot:1)" into steps
    steps = {}
    for each match of "action:duration" in behavior_string:
        duration = evaluate_duration(duration_str, wave_config)
        add(steps, { action = action, duration = duration })
    return steps
end

function execute_behavior_step(entity)
    state = entity.behavior_state
    if not state then return end
    
    state.timer = state.timer - 1
    if state.timer <= 0 then
        current_step = state.steps[state.idx]
        action = behavior_actions[current_step.action]
        
        -- Check action preconditions
        if action.check and not action.check(entity) then
            state.idx = 1  -- Reset to idle
            state.timer = state.steps[1].duration
            return
        end
        
        -- Run action
        action.run(entity)
        
        -- Advance to next step (loop)
        if not action.cont then
            state.idx = (state.idx % #state.steps) + 1
            state.timer = state.steps[state.idx].duration
        end
    end
end
```

#### Enemy Spawning

```pseudo
spawn_queue = {}  -- Queued spawns with delays

function spawn_enemy_with_entry(type, row, col, style)
    config = enemy_configs[type]
    if type(config) == "string" then
        config = parse_stat_dsl(config, enemy_defaults)
        enemy_configs[type] = config  -- Cache parsed config
    end
    
    home_x = config.home_x or (grid_start_x + col * grid_spacing_x)
    home_y = config.home_y or (grid_start_y + row * grid_spacing_y)
    
    entity = {
        config = config,
        type = type,
        grid_row = row,
        grid_col = col,
        home_x = home_x,
        home_y = home_y,
        x = home_x,
        y = home_y,
        health = config.health,
        max_health = config.health,
        size = config.size,
        sprite = config.sprite,
        score = config.score,
        sway = config.sway,
        fsm = fsm("entering", "reached_home:entering>waiting,all_settled:waiting>active")
    }
    
    assign_entry_style(entity, style)
    add_entity("enemy", entity)
    tag(entity, (config.tags or "") .. ",entering,drawable,bg,pos,vel,splashable,vulnerable,timers")
    grid[row][col] = entity
    
    return entity
end

-- Entry animation styles
function assign_entry_style(entity, style)
    home_x, home_y = entity.home_x, entity.home_y
    if style == "from_top" then
        entity.x, entity.y, entity.fly_speed = home_x, -10, 2.5
    elseif style == "from_left" then
        entity.x, entity.y, entity.fly_speed = -10, home_y, 5
    elseif style == "from_right" then
        entity.x, entity.y, entity.fly_speed = 127 + 10, home_y, 5
    elseif style == "random" then
        entity.x, entity.y, entity.fly_speed = random(127), -10, 5
    elseif style == "center" then
        entity.x, entity.y, entity.fly_speed = home_x, home_y, 3
    end
end
```

#### Enemy Movement Systems

```pseudo
-- Diver behavior: dive down, then return to home
update_diver = system("diving", function(entity)
    -- Elite diver tracks player horizontally
    entity.vx = entity.type == "K" and sign(player.x - entity.x) * 0.6 or 0
    entity.vy = entity.dive_speed
    tag(entity, "vel")
    
    if entity.y > bottom_edge - 4 then
        untag(entity, "diving,vel")
        tag(entity, "returning")
    end
end)

update_returner = system("returning", function(entity)
    target_x = entity.home_x + sway_x
    dx, dy = target_x - entity.x, entity.home_y - entity.y
    dist = sqrt(dx * dx + dy * dy)
    
    if dist < 2 then
        entity.x, entity.y = target_x, entity.home_y
        entity.vx, entity.vy = 0, 0
        untag(entity, "returning,vel")
        tag(entity, "active")
    else
        entity.vx, entity.vy = dx / dist * 2, dy / dist * 2
        tag(entity, "vel")
    end
end)
```

#### Absorber System

```pseudo
update_absorber = system("absorber", function(entity)
    entity.stored_queue = entity.stored_queue or {}
    
    -- Spit delay after absorption
    if entity.spit_delay_timer and entity.spit_delay_timer > 0 then
        entity.spit_delay_timer = entity.spit_delay_timer - 1
        if entity.spit_delay_timer == 0 and #entity.stored_queue > 0 then
            entity.spit_interval_timer = 0
            entity.is_spitting = true
        end
    end
    
    -- Spit bullets back
    if entity.is_spitting and #entity.stored_queue > 0 then
        entity.spit_interval_timer = (entity.spit_interval_timer or 0) - 1
        if entity.spit_interval_timer <= 0 then
            spawn_bullet(entity.x, entity.y + entity.size + 2, "normal")
            remove(entity.stored_queue, 1)
            entity.spit_interval_timer = entity.config.spit_interval or 15
            
            if #entity.stored_queue == 0 then
                entity.is_spitting = false
            end
        end
    end
end)

function store_bullet_in_absorber(entity, bullet)
    entity.stored_queue = entity.stored_queue or {}
    
    if #entity.stored_queue < entity.config.max_stored then
        -- Charged bullets count as 2
        count = bullet.type == "charged" and 2 or 1
        for i = 1, count do
            add(entity.stored_queue, "normal")
        end
        entity.spit_delay_timer = entity.config.spit_delay or 90
        set_hit_flash(entity, 4)
    else
        -- Overflow destroys absorber
        kill_entity(entity)
        create_shockwave({ x = entity.x, y = entity.y, splash_radius = 20 })
    end
end
```

-- System: Intent warning visual
draw_intent_warning = world.sys("intent_warning", function(e)
  if not e.dive_started then return end
  
  -- Draw line from enemy to target
  draw_line(e.x, e.y, e.target_x, e.target_y, "warning_color")
  
  -- Flash warning indicator
  if (current_time() * 8) % 2 < 1 then
    draw_circle(e.target_x, e.target_y, 4, "warning_color")
  end
end)
```

#### Intent Warning System

Kamikaze enemies use the **intent warning** pattern to telegraph attacks before they occur. This gives players time to react while maintaining challenge:

1. **Detection Phase**: Kamikaze detects dive trigger (proximity, timer, wave pattern)
2. **Warning Phase**: Visual indicator shows dive target location (~0.5s)
3. **Execution Phase**: Enemy dives toward target at high speed
4. **Counterplay**: Player can tap to reverse direction away from target zone


The intent warning respects player agency—telegraphed attacks are never unfair because players always have opportunity to respond.

---

### Wave System

The wave system manages enemy formation spawning using pattern-based definitions and a wave FSM for game flow control.

#### Wave Definitions

Waves are defined as ASCII grids where each character represents an enemy type:

```pseudo
wave_patterns = {
    c = "order:row_major entry:from_top base:0 inc:1",      -- Cascade
    l = "order:col_major entry:alternating base:0 inc:2 per:column",  -- Line/column
    s = "order:spiral entry:random base:0 inc:2"            -- Spiral from center
}

wave_definitions = {
    -- Wave 1: Simple shooter grid
    ".p...p...p,..p.p.p.p.,.p.p...p.p,..p.p.p.p.,.p...p...p.|c|wave 1 cleared!,pREPARE fOR wAVE 2",
    
    -- Wave 2: Introduce divers
    "...p...p...,..p.ppp.p.,.k.k.k.k.k,p...p.p...p,.p..p.p..p.|c|wave 2 cleared!,pREPARE fOR wAVE 3",
    
    -- Wave 3: Reflectors and divers
    "..p.p.p.p.,.prk.k.krp,..p.p.p.p.,.prk...krp,..p.....p..|l|wave 3 cleared!,pREPARE fOR wAVE 4",
    
    -- Wave 4: Absorbers
    "...p...p..,k..p...p..k,.k.r.p.r.k.,..k.p.p.k..,...a...a...|c|wave 4 cleared!,pREPARE fOR wAVE 5",
    
    -- ... more waves ...
    
    -- Wave 10: Boss fight
    ".....B.....|c|",
}

function get_wave_config(n)
    raw = wave_definitions[n]
    if not raw then return nil end
    
    parts = split(raw, "|")
    cfg = {
        entities = parts[1],    -- ASCII grid
        pattern = parts[2],     -- Spawn pattern (c/l/s)
        interwave = parts[3]    -- Message between waves
    }
    
    -- Merge difficulty scaling
    for key, value in difficulty_config(n) do
        cfg[key] = value
    end
    
    return cfg
end
```

#### Wave Pattern System

```pseudo
function execute_pattern(config)
    pattern = wave_patterns[config.pattern or "c"]
    entities = config.entities
    
    positions = collect_positions(entities)
    positions = sort_by_order(positions, pattern.order)
    spawn_positions(positions, pattern)
end

function collect_positions(entities)
    positions = {}
    for row = 1, #entities do
        line = entities[row]
        for col = 1, #line do
            char = line[col]
            if enemy_configs[char] then
                add(positions, { r = row - 1, c = col - 1, t = char })
            end
        end
    end
    return positions
end

function spawn_positions(positions, pattern)
    delay = pattern.base
    last_col = -1
    
    for each pos in positions do
        -- Increment delay based on pattern
        if pattern.per == "column" and pos.c != last_col then
            delay = delay + pattern.inc
            last_col = pos.c
        else
            delay = delay + pattern.inc
        end
        
        -- Determine entry style
        entry = pattern.entry
        if entry == "alternating" then
            entry = (pos.c % 2 == 0) and "from_left" or "from_right"
        end
        
        add(spawn_queue, {
            e_type = pos.t,
            row = pos.r,
            col = pos.c,
            style = entry,
            spawn_timer = delay
        })
    end
end
```

#### Wave FSM

```pseudo
wave_fsm = fsm("transition", 
    "wave_clear:combat>transition,start_wave:transition>combat,boss_defeated:combat>boss_defeated,celebration_done:boss_defeated>victory,reset:*>transition"
)

wave_fsm.on_enter_transition = function()
    -- Calculate wave bonus
    if wave_n >= selected_wave then
        time_sec = wave_timer / 60
        bonus_mult = time_sec < 10 + wave_n * 1.5 and 3 
                  or time_sec < 15 + wave_n * 2 and 2 
                  or 1
        wave_bonus = max(200 - time_sec) * wave_n * bonus_mult
        add_score(wave_bonus)
    end
    
    -- Clean up
    delete_all("powerup")
    delete_all("shield")
    wave_timer_active = false
    transition_timer = 120  -- ~2s
    player.fsm:exit()
end

wave_fsm.on_enter_combat = function()
    wave_n = wave_n + 1
    wave_timer = 0
    gift_timer = configured_gift_timer
    sway_x, sway_dir = 0, 1
    
    wcfg = get_wave_config(wave_n)
    if not wcfg then
        game_fsm:win()
        return
    end
    
    execute_pattern(wcfg)
    all_enemies_in_position = false
end

function update_waves()
    population = count_entities("enemy")
    entering_count = count_entities("entering")
    
    -- Check if all enemies settled
    if wave_fsm.state == "combat" and not all_enemies_in_position then
        if entering_count < 1 and #spawn_queue < 1 then
            all_enemies_in_position = true
            player.entry_timer = 30
            wave_timer_active = true
        end
    end
    
    -- Check wave clear
    if population < 1 and #spawn_queue < 1 and wave_fsm.state == "combat" then
        if wave_n == 10 then
            wave_fsm:boss_defeated()
        else
            wave_fsm:wave_clear()
        end
    end
    
    -- Update sway for active enemies
    if wave_timer_active then
        wave_timer = wave_timer + 1
        sway_x = sway_x + sway_dir * 0.15
        if abs(sway_x) > 4 then sway_dir = -sway_dir end
    end
end
```

---

### Combat System

Combat combines bullet management, collision detection, and damage resolution.

#### Bullet Configuration (DSL)

Bullets are configured using the same DSL format as enemies:

```pseudo
bullet_config = {
    normal = "vy:2 size:2 dmg:1 pierce_count:0 rate:30 sfx:0",
    charged = "vy:1 size:4 dmg:2 pierce_count:0 splash_radius:30 sfx:1",
    rapid_fire = "vy:2 size:1 dmg:1 pierce_count:0 rate:8 sfx:29",
    piercing = "vy:3 size:2 dmg:1 pierce_count:2 rate:30 sfx:28",
    rapid_piercing = "vy:2 size:2 dmg:1 pierce_count:2 rate:15 sfx:28",
}
```

#### Bullet Types

**Normal Bullets** (Player):

- Shoot rate: 30 frames (~0.5s)
- Speed: 2 pixels/frame upward
- Damage: 1

**Charged Bullets** (Player):

- Speed: 1 pixel/frame (slower for visibility)
- Damage: 2
- Creates shockwave with 30px splash radius

**Powered-Up Bullets**:

- **Rapid Fire**: Rate × 0.5 (faster), size 1
- **Piercing**: Pierce count +2, speed 3
- **Rapid Piercing**: Combined effects

#### Powerup System

Powerups drop from killed enemies based on their `drop` chance:

```pseudo
powerups_config = {
    rapid_fire = "type:rapid_fire duration:300 shoot_rate_bonus:0.5 sprite:34",
    piercing = "type:piercing duration:240 pierce_bonus:2 sprite:35",
    shield = "type:shield duration:360 sprite:36",
    health = "type:health health_up:1 sprite:37",
}

function spawn_powerup(x, y, enemy_config)
    if random() > enemy_config.drop then return end
    
    type = weighted_random(powerup_weights)
    config = powerups_config[type]
    
    entity = {
        type = type,
        config = parse_stat_dsl(config),
        x = x,
        y = y,
        vy = 0.5,  -- Slow fall
    }
    add_entity("powerup", entity)
end

-- Powerup collection
update_powerup_collision = system("powerup", function(pup)
    if not collides(pup, player) then return end
    
    config = pup.config
    if config.health_up then
        player.health = player.health + config.health_up
    elseif config.duration then
        powerup_tag = "powerup_" .. pup.type
        player[powerup_tag] = (player[powerup_tag] or 0) + config.duration
        player.timers[powerup_tag] = function(e) untag(e, powerup_tag) end
        tag(player, powerup_tag)
        
        if pup.type == "shield" then
            spawn_player_shield(player.x, player.y)
        end
    end
    
    delete(pup)
end)
```

#### Timer System

Entities use named timers that automatically decrement each frame and trigger callbacks on expiration:

**Timer Properties:**
- `invincible_timer`: Immunity frames after taking damage
- `shoot_timer`: Cooldown between shots
- `charge_timer`: Time to reach fully charged state → triggers `charge_complete` event
- `burnout_timer`: Time before burnout → triggers `burn` event
- `cooldown_timer`: Recovery time after burnout → triggers `cool` event
- `pacifist_timer`: Invincibility period at spawn → triggers `start_firing` event
- `speed_burst_timer`: Duration of speed boost → triggers `end_speed_burst` event

**Powerup Timers:**
- `powerup_rapid_fire`: Duration of rapid fire effect → removes powerup tag on expiry
- `powerup_piercing`: Duration of piercing effect → removes powerup tag on expiry
- `powerup_shield`: Duration of shield → destroys shield entity on expiry

Each timer is stored as a frame count on the entity. The timer system iterates all active timers each frame, decrements non-zero values, and invokes the associated callback when a timer reaches zero.

### Weapon Temperature System

The Weapon Temperature System is a heat-based anti-spam mechanic that rewards skilled rhythm-based play with bonus fire rate while punishing button mashing through overheat lockout.

#### Temperature Zones

```
Temperature Range: 0.0 to 100.0

┌────────────────────────────────────────────────────────────────────┐
│  COLD      │    WARM (BONUS)    │    HOT     │   OVERHEAT   │
│  0% - 30%  │     30% - 70%      │  70% - 90% │   90% - 100% │
│            │                    │            │              │
│  Base Rate │   +50% Fire Rate   │  Base Rate │  LOCKED OUT  │
└────────────────────────────────────────────────────────────────────┘
```

| Zone | Temp Range | Fire Rate | Cooling Rate |
|------|------------|-----------|--------------|
| Cold | 0-30% | 1.0x | 0.6/frame |
| Warm | 30-70% | 1.5x (50% bonus) | 0.78/frame |
| Hot | 70-90% | 1.0x | 0.6/frame |
| Overheat | 90-100% | 0x (locked) | 0.2/frame |

#### Mechanics

- Each bullet adds `+10.0` heat
- Charged shots do NOT generate heat
- Continuous passive cooling each frame

#### Hysteresis States

To prevent oscillation at zone boundaries:

| State | Enter | Exit | Purpose |
|-------|-------|------|---------|
| `is_in_warm_zone` | heat ≥ 30 | heat < 15 | Smooth cooling |
| `is_overheated` | heat ≥ 90 | heat < 70 | Prevent re-overheat |
| `bonus_disabled` | heat ≥ 70 | heat < 15 | No reward for overshooting |

#### Design Decision: Bonus on Cooldown

Three options were considered:

1. **Require entry from cold** - Only give bonus if heating up from cold
2. **No bonus after hot zone ✓** - Once touched ≥70, no bonus until fully cooled
3. **Keep bonus on cooldown** - Allow bonus when cooling through warm zone

**Chosen: Option 2** - Creates strongest incentive to maintain the warm zone sweet spot. Players who overshoot learn precision.

#### Player Attributes

```ruby
weapon_heat: 0.0        # Current temperature (0-100)
is_overheated: false    # Locked out from shooting
is_in_warm_zone: false  # Using warm zone cooling rate  
bonus_disabled: false   # Lost bonus from overshooting
```

#### Constants

```ruby
TEMP_COLD_MAX = 30.0           # Warm zone starts
TEMP_WARM_MAX = 70.0           # Hot zone starts
TEMP_HOT_MAX = 90.0            # Overheat starts
TEMP_RECOVERY_THRESHOLD = 70.0 # Exit overheat
TEMP_WARM_EXIT_THRESHOLD = 15.0 # Exit warm zone / re-enable bonus

TEMP_PER_SHOT = 10.0           # Heat per bullet
TEMP_COOLING_RATE = 0.6        # Cold/hot zones
TEMP_WARM_COOLING = 0.78       # Warm zone (faster)
TEMP_OVERHEAT_COOLING = 0.2    # Overheat (slow)

WARM_ZONE_COOLDOWN_MULT = 0.5  # 50% faster fire rate
```

#### Expected Durations

| Scenario | Duration |
|----------|----------|
| Warm zone bonus | ~6 seconds |
| Overheat lockout | ~2-3 seconds |
| Full cooldown (100→0) | ~8-10 seconds |


### Meta Progression System (not implemented)

The Meta Progression System provides persistent player upgrades across play sessions. It separates immutable game configuration from mutable player stats that can be permanently upgraded through meta-progression mechanics.

#### Architecture Overview

```pseudo
┌─────────────────────────────────────────────────────────────────┐
│                    STATS ARCHITECTURE                           │
│                                                                 │
│  ┌─────────────────────┐     ┌─────────────────────┐            │
│  │   Config Defaults   │     │   Saved Profile     │            │
│  │   (Immutable)       │     │   (Meta Stats)      │            │
│  │                     │     │                     │            │
│  │  shoot_rate: 30     │───▶│  shoot_rate: 25     │ (upgraded) │
│  │  damage: 1          │     │  damage: 2          │ (upgraded) │
│  │  pierce: 0          │     │  pierce: 1          │ (upgraded) │
│  │  health: 3          │     │  health: 4          │ (upgraded) │
│  └─────────────────────┘     └──────────┬──────────┘            │
│                                         │                       │
│                                         ▼                       │
│                           ┌─────────────────────┐               │
│                           │  firing_stats       │               │
│                           │  (ECS Component)    │               │
│                           │                     │               │
│                           │  Session base stats │               │
│                           └──────────┬──────────┘               │
│                                      │                          │
│                                      ▼ + powerups (temporary)   │
│                           ┌─────────────────────┐               │
│                           │  Final Stats        │               │
│                           │  (At shoot time)    │               │
│                           │                     │               │
│                           │  Applied to bullets │               │
│                           └─────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

> [!NOTE]
> Meta progression system is not yet implemented. See `meta_progression_2.md` for the design document.

---

### Visual Feedback System

Visual feedback reinforces player actions and game state through particles, screen effects, and UI indicators.

#### Particle Effects

Particles provide impact feedback and visual polish:

- **Impact particles**: Spawn on bullet collisions
- **Explosion particles**: Spawn on enemy death
- **Charge trail**: Visual trail while charging
- **Shield particles**: Feedback when shield absorbs damage

#### Screen Effects

Global screen effects for emphasis:

- **Screen shake**: Camera offset with decay, triggered by damage or explosions
- **Screen flash**: Brief white overlay for major events

#### UI Indicators

State visualization for player awareness:

- **Charge indicator**: Progress bar showing charge state
- **Burnout indicator**: Warning flash during cooldown
- **Health display**: Current health visualization
- **Score display**: Current and combo scores

> [!TIP]
> Additional effects can be added as needed (slowdown, color grading, vignette, etc.)

---

### Burnout & Charge Mechanics

The Burnout & Charge Mechanics extend the Magic Combo system with risk/reward depth by introducing an overcharge penalty for holding the charged state too long. This prevents players from indefinitely camping in the charged state, forcing strategic timing decisions.

#### Burnout Mechanism

**Overcharge Timer**: While the player is in the `charged` state (ready to fire), a `burnout_timer` increments each frame. If this timer reaches `config.burnout_time` (default ~2.0s), the Player FSM triggers a `burn` event, transitioning to the `burnout` state.

**Burnout State**: In `burnout`, the player:

- Uses the `burnout` speed profile (2.0, slower than normal 1.0 but faster than charging 0.2)
- Cannot spawn bullets (both regular and charged)
- Displays visual feedback (flashing sprite, cooldown timer display)
- Plays burnout sound effect

**Cooldown Recovery**: A `cooldown_timer` increments while in `burnout`. When it reaches `config.cooldown_timer` (default ~1.0s), the FSM triggers a `cool` event, returning to `moving` and resetting all timers via `reset_timers()`.

**Timer Reset**: Timers are reset at key transitions (e.g., after firing charged shot or re-entering moving) to prevent immediate retriggering of charge/burnout cycles.

#### Charge Progression

**Charging State**: Button held beyond tap threshold enters `charging`, slowing speed to 0.2 and incrementing `charge_timer`.

**Charged State**: When `charge_timer >= config.charge_time` (~1.0s), transitions to `charged` via `charge_complete` event. Speed remains at 0.2, ready for release.

**Release**: Releasing button in `charged` fires charged shot, enters `speed_burst` (4.0 speed), and resets timers.

#### Visual/Audio Feedback

- **Charging/Charged**: Charge bar above player, fills over time
- **Burnout**: Player sprite flashes red every 5 frames, cooldown timer displayed above player
- **Audio**: Burnout sound on entering burnout state

#### Integration with Combat

The `cannot_shoot()` function blocks bullet spawning in `charging`, `charged`, `pacifist`, `pre_entry`, `exiting`, and `burnout` states. This ensures no shots during burnout recovery.

---

## Entity Definitions

### Player Entity

```pseudo
Player {
  -- Configuration (immutable)
  config: {
    spawn_x, spawn_y: number
    size, color: number
    max_health: number
    speeds: { normal, charging, burst }
    acceleration: { to_charging, to_burst, to_normal, reverse }
    charge_time, burst_duration: number
    shoot_rates: { normal, burst }
  }
  
  -- Runtime State (mutable)
  x, y: number                    -- Position
  direction: number               -- 1 or -1
  current_speed: number           -- Current movement speed
  target_speed: number            -- Acceleration target
  accel_timer, accel_duration: number
  
  charge_timer: number            -- Charging progress
  burst_timer: number             -- Speed burst remaining
  shoot_timer: number             -- Cooldown until next shot
  burnout_timer: number           -- Burnout timer (counts while charged; triggers burn)
  cooldown_timer: number          -- Cooldown countdown in `burnout` state
  
  health: number
  invincible: boolean
  invincible_timer: number
  
  fsm: FSM                        -- Player state machine
  
  -- Methods
  reset(): void
  update(): void
  draw(): void
}
```

### Enemy Entity

```pseudo
Enemy {
  -- Configuration (immutable)
  config: {
    health, size, color: number
    score: number
    tags: string[]
  }
  
  -- Runtime State (mutable)
  type: string                    -- Enemy type key
  x, y: number                    -- Current position
  spawn_x, spawn_y: number        -- Formation position
  health: number
  
  -- Behavior-specific state
  hover_time: number              -- For sine wave movement
  wave_offset: number             -- Phase offset for formation
  shoot_timer: number             -- Shooting cooldown
  splash_timer: number            -- Splash shooting cooldown
  dive_started: boolean           -- Kamikaze dive flag
  target_x, target_y: number      -- Kamikaze target
  entry_delay: number             -- Entry animation delay
}
```

### Bullet Entity

```pseudo
Bullet {
  -- Configuration (immutable)
  config: {
    speed, size, color: number
    damage: number
    piercing: boolean
  }
  
  -- Runtime State (mutable)
  x, y: number
  velocity_x, velocity_y: number
  active: boolean
  enemy_bullet: boolean           -- Identifies source
  hit_count: number               -- For piercing bullets
  max_hits: number                -- Pierce limit
  -- Player-specific or related tracking
  source_player_id?: number
}
```

### Particle Entity

```pseudo
Particle {
  x, y: number
  velocity_x, velocity_y: number
  life: number                    -- Frames remaining
  color: number
}
```

---

---

## References

### FSM (Finite State Machine) Pattern

State machines provide explicit state transitions and lifecycle callbacks, enabling predictable and testable entity behaviors.

**Resources:**

- *Game Programming Patterns* by Robert Nystrom, Chapter "State"
- *AI Game Programming Wisdom*, "Finite State Machines" by Mat Buckland

### ECS (Entity-Component-System) Pattern

ECS architecture separates data (components/tags) from behavior (systems), enabling flexible entity composition and efficient processing.

**Resources:**

- *Game Programming Patterns* by Robert Nystrom, Chapter "Component"
- Overwatch GDC Talk: "ECS Architecture at Scale"

### Entity Configuration Pattern

Also known as "Type Object" or "Prototype" pattern, separates mutable runtime state from immutable configuration data.

**Resources:**

- *Game Programming Patterns* by Robert Nystrom, Chapter "Type Object"

### One-Button Control Design

Designing depth through constraint, extracting multiple mechanics from minimal input surface.

**Resources:**

- *The Art of Game Design* by Jesse Schell, Lens #27: "The Lens of Skill"
- Classic examples: *Flappy Bird*, *Downwell*, *Ridiculous Fishing*

---

END OF ARCHITECTURE DOCUMENT

<!--
## Platform Implementation Notes (removed — platform-specific)
### PICO-8 Implementation

**Engine Constraints:**

- Lua 5.2 dialect with 8192 token limit
- 60fps fixed update rate, 128x128 resolution
- Character limit: 65535
- 16-color palette (indexed 0-15)

**ECS Library (eggs.p8):**

- Entity-Component-System architecture via tagging
- Systems defined with `world.sys(tags, function)`
- Dynamic behavior composition via `world.tag()` / `world.unt()`
- Mask checking for multi-tag queries

**FSM Library (lib/fsm.lua):**

- Finite state machine with event-driven transitions
- Callback support: `on_enter_state(self, prev_state)`, `on_exit_state(self, prev_state)`

**Platform Functions:**

| Abstract Operation | PICO-8 Function |
|-------------------|----------------|
| Check button held | `btn(4)` |
| Draw sprite | `spr(n, x, y)` |
| Draw circle | `circfill(x, y, r, c)` |
| Draw rectangle | `rectfill(x0, y0, x1, y1, c)` |
| Play sound effect | `sfx(n)` |
| Random number | `rnd(n)` |
| Sine function | `sin(x)` (0-1 range, inverted) |

**Project Structure:**

```
obsi.p8                    -- Main cartridge
lib/
  fsm.lua                  -- FSM library
  eggs.p8/eggs.lua         -- ECS library
src/
  *.lua                    -- Game systems (included via #include)
tests/
  cases/                   -- Individual test cases
  suites/                  -- Test suite runners
```

### Picotron Implementation

*(Planned port - similar API with enhanced capabilities)*

**Key Differences:**

- Higher resolution support (480x270)
- More colors and transparency
- Larger code/data limits
- File-based project structure

### DragonRuby GTK Implementation

**Status:** In Progress (partial implementation)

The current project (`obsi-drgtk`) is a DragonRuby GTK port with:

**Implemented:**
- Player entity with FSM (pre_entry, pacifist, moving, charging, charged, speed_burst, burnout, exiting)
- Weapon temperature system with warm zone bonus and overheat lockout
- Shooter and Diver enemy breeds (Diver with FSM: idle → diving → returning)
- Reflector enemy (reflects bullets back)
- Absorber enemy (stores bullets, spits them back)
- Bullet spawn system with collision layers
- Basic gameplay loop

**Not Yet Implemented:**
- Wave system with pattern-based spawning (Arcade Mode)
- Powerup system
- Boss fight
- Leaderboard system
- Meta progression (including wave cycle unlocks)

**Project Structure:**
```
mygame/
  app/
    entities/       -- Entity definitions (player.rb, enemy.rb, etc.)
    systems/        -- ECS systems (player_input_system.rb, etc.)
    worlds/         -- World setup (eggs_world.rb)
  docs/             -- Architecture and design docs
```

### Other Platforms

For other engines (Love2D, Unity, Godot, etc.), implement the Platform Abstraction Layer requirements documented in the [Engine-Agnostic Core Architecture](#platform-abstraction-layer) section.

---

## Version History

| Version | Date | Changes |
|---------|------|--------|
| 1.0.0 | 2025-01-14 | Initial architecture specification |
| 1.1.0 | 2025-11-27 | Extracted engine-agnostic patterns, added platform implementation notes |
| 1.1.1 | 2025-11-28 | Added detailed Input Update Logic Flow with decision tables for porting |
| 1.2.0 | 2025-12-12 | Simplified to match PICO-8 prototype; removed implementation-specific pseudo-code; added Wave System, Powerup System; reclassified Reflector/Absorber as enemies; added DragonRuby GTK implementation status |

---

END OF ARCHITECTURE DOCUMENT
-->
