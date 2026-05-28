╔════════════════════════════════════════════════════════════════════════════════╗
║                        INPUT & PLAYER LOGIC FLOW                               ║
║                              REFINED v3 - NO INPUT FSM                         ║
╚════════════════════════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────────────────────┐
│                         INPUT HANDLING                                       │
│                                                                              │
│  NO FSM - Simple edge detection with disable flag                            │
│                                                                              │
│  State:                                                                      │
│  - prev_button: boolean (was button pressed last frame?)                     │
│  - disabled: boolean (ignore all input?)                                     │
│                                                                              │
│  Update logic (called once per frame):                                       │
│    if disabled → return early                                                │
│    detect rising edge  (not pressed → pressed)  → on_press()                │
│    detect falling edge (pressed → not pressed)  → on_release()              │
│    store current state as prev_button                                        │
│                                                                              │
│  API:                                                                        │
│  - Input.setup(callbacks)  -- {on_press, on_release}                         │
│  - Input.update()          -- call once per frame                            │
│  - Input.disable()         -- set disabled = true, clear prev state          │
│  - Input.enable()          -- set disabled = false                           │
│                                                                              │
│  Callbacks route to Player FSM:                                              │
│  - on_press()   → Player.fsm:press_button()                                  │
│  - on_release() → Player.fsm:release_button()                                │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                      PLAYER FSM STATE MACHINE                                │
│                                                                              │
│  Single FSM handles: movement speed, direction, firing mode, input state     │
│                                                                              │
│  State properties (derived from current state):                              │
│  - Auto-shoot:  ON only in MOVING                                            │
│  - Input:       DISABLED only in BURNOUT (and entry/exit states)             │
│                                                                              │
│  FSM Events & Transitions:                                                   │
│  ─────────────────────────────────────────────────────────────────────────   │
│  - press_button:    moving       → charging                                  │
│  - release_button:  charging     → moving     (reverse dir)                  │
│  - release_button:  charged      → speed_burst (reverse dir, fire charged)   │
│  - charge_complete: charging     → charged    (same dir)                     │
│  - speed_burst_end: speed_burst  → moving                                    │
│  - burn:            charged      → burnout    (same dir, input disabled)     │
│  - cool:            burnout      → moving     (enable input)                 │
│  - exit:            *            → exiting                                   │
│  - complete_exit:   exiting      → pre_entry                                 │
│  - start_entry:     pre_entry    → pacifist                                  │
│  - start_firing:    pacifist     → moving                                    │
│                                                                              │
│  Direction tracking:                                                         │
│  - pre_press_dir: stored when entering CHARGING                              │
│  - Used to determine direction on state transitions                          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                         STATE TRANSITION DETAILS                             │
│                                                                              │
│  (a) PRESS BUTTON (moving → charging)                                        │
│  ────────────────────────────────────────────────────────────────────────    │
│  Movement: Decelerate to 0.2x speed (charging speed)                         │
│  Firing:   Stop auto-shooting (state-derived)                                │
│  Timer:    Start charge timer (60 frames)                                    │
│  Store:    pre_press_dir = current direction                                 │
│                                                                              │
│  (b) RELEASE BEFORE CHARGED (charging → moving)                              │
│  ────────────────────────────────────────────────────────────────────────    │
│  Movement: Accelerate to 1x speed, REVERSE direction (-pre_press_dir)        │
│  Firing:   Resume auto-shooting (state-derived)                              │
│                                                                              │
│  (c) CHARGE COMPLETE (charging → charged)                                    │
│  ────────────────────────────────────────────────────────────────────────    │
│  Movement: Accelerate to 1x speed, SAME direction (pre_press_dir)            │
│  Timer:    Start burnout timer (60 frames)                                   │
│                                                                              │
│  (d) RELEASE WHEN CHARGED (charged → speed_burst)                            │
│  ────────────────────────────────────────────────────────────────────────    │
│  Movement: Accelerate to 4x speed, REVERSE direction (-pre_press_dir)        │
│  Firing:   Fire charged shot (one-time)                                      │
│  Timer:    Start speed_burst timer (18 frames)                               │
│                                                                              │
│  (e) SPEED BURST ENDS (speed_burst → moving)                                 │
│  ────────────────────────────────────────────────────────────────────────    │
│  Movement: Decelerate to 1x speed (keep current direction)                   │
│  Firing:   Resume auto-shooting (state-derived)                              │
│                                                                              │
│  (f) BURNOUT (charged → burnout)                                             │
│  ────────────────────────────────────────────────────────────────────────    │
│  Movement: Accelerate to 2x speed, SAME direction (pre_press_dir)            │
│  Timer:    Start cooldown timer (60 frames)                                  │
│  Input:    Input.disable() called                                            │
│                                                                              │
│  (g) COOLDOWN ENDS (burnout → moving)                                        │
│  ────────────────────────────────────────────────────────────────────────    │
│  Movement: Decelerate to 1x speed (keep current direction)                   │
│  Firing:   Resume auto-shooting (state-derived)                              │
│  Input:    Input.enable() called                                             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                           VISUAL STATE DIAGRAM                               │
│                                                                              │
│           ┌──────────────────────────────────────────────┐                   │
│           │  PRE_ENTRY / PACIFIST (entry sequence)       │                   │
│           │  Input: disabled                             │                   │
│           └──────────────────────────────────────────────┘                   │
│                          │ start_firing                                      │
│                          ↓                                                   │
│  ┌─────────────────────────────────────────────────────────────┐             │
│  │                    NORMAL GAMEPLAY                          │             │
│  │                                                             │             │
│  │   ┌─────────┐  press_button (a)   ┌──────────┐              │             │
│  │   │ MOVING  │────────────────────→│ CHARGING │              │             │
│  │   │ 1x spd  │                     │ 0.2x spd │              │             │
│  │   │ auto-ON │                     │ auto-OFF │              │             │
│  │   └─────────┘                     │ charging │              │             │
│  │        ↑                          └────┬─────┘              │             │
│  │        │                               │                    │             │
│  │        │ release (b)                   │ charge_complete(c) │             │
│  │        │ [reverse dir]                 │ [same dir]         │             │
│  │        │                               ↓                    │             │
│  │        │                          ┌─────────┐               │             │
│  │        │                          │ CHARGED │               │             │
│  │        │                          │ 1x spd  │               │             │
│  │        │                          │ auto-OFF│               │             │
│  │        │                          │ burnout │               │             │
│  │        │                          └────┬────┘               │             │
│  │        │                               │                    │             │
│  │        │          ┌────────────────────┼────────────────┐   │             │
│  │        │          │                    │                │   │             │
│  │        │   release (d)           burn (f)               │   │             │
│  │        │   [reverse dir]         [same dir]             │   │             │
│  │        │   [fire charged]        [Input.disable()]      │   │             │
│  │        │          │                    │                │   │             │
│  │        │          ↓                    ↓                │   │             │
│  │        │   ┌─────────────┐      ┌─────────┐             │   │             │
│  │        │   │ SPEED_BURST │      │ BURNOUT │             │   │             │
│  │        │   │ 4x speed    │      │ 2x speed│             │   │             │
│  │        │   │ auto-OFF    │      │ auto-OFF│             │   │             │
│  │        │   │             │      │ inputOFF│             │   │             │
│  │        │   └──────┬──────┘      └────┬────┘             │   │             │
│  │        │          │                  │                  │   │             │
│  │        │   timer (e)           cool (g)                 │   │             │
│  │        │   [keep dir]          [Input.enable()]         │   │             │
│  │        │          │                  │                  │   │             │
│  │        └──────────┴──────────────────┘                  │   │             │
│  │                                                         │   │             │
│  └─────────────────────────────────────────────────────────┘   │             │
│                          ↓  (wave end: exit event)             │             │
│           ┌───────────────────────────────────────┐            │             │
│           │ EXITING (Input: disabled)             │            │             │
│           └───────────────────────────────────────┘            │             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                    MOVEMENT SPEED & DIRECTION SUMMARY                        │
│                                                                              │
│  State        │ Speed │ Direction                  │ Auto-shoot │ Input      │
│  ─────────────┼───────┼────────────────────────────┼────────────┼────────────│
│  MOVING       │ 1.0x  │ current (bounces at walls) │ ON         │ enabled    │
│  CHARGING     │ 0.2x  │ decelerating               │ OFF        │ enabled    │
│  CHARGED      │ 1.0x  │ pre_press_dir (same)       │ OFF        │ enabled    │
│  SPEED_BURST  │ 4.0x  │ -pre_press_dir (reversed)  │ OFF        │ enabled    │
│  BURNOUT      │ 2.0x  │ pre_press_dir (same)       │ OFF        │ DISABLED   │
│                                                                              │
│  Acceleration/Deceleration frames:                                           │
│  - normal:      accel=10, decel=3                                            │
│  - charging:    accel=20 (decel to slow)                                     │
│  - speed_burst: accel=1 (instant)                                            │
│  - burnout:     accel=5                                                      │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                          TIMER CONFIGURATION                                 │
│                                                                              │
│  Timer             │ Duration │ Triggers Event    │ Active In State          │
│  ──────────────────┼──────────┼───────────────────┼──────────────────────────│
│  timer_charge      │ 60f (1s) │ charge_complete   │ CHARGING                 │
│  timer_burnout     │ 60f (1s) │ burn              │ CHARGED                  │
│  timer_cooldown    │ 60f (1s) │ cool              │ BURNOUT                  │
│  timer_speed_burst │ 18f      │ speed_burst_end   │ SPEED_BURST              │
│  timer_pacifist    │ 30f      │ start_firing      │ PACIFIST                 │
│  timer_entry       │ varies   │ start_entry       │ PRE_ENTRY                │
│  timer_exit        │ 30f      │ complete_exit     │ EXITING                  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                         SHOOTING SYSTEM                                      │
│                                                                              │
│  Auto-shooting (normal bullets):                                             │
│  - Only active when state == "moving"                                        │
│  - Rate-limited by shoot timer                                               │
│                                                                              │
│  Charged shot:                                                               │
│  - Fired once on transition: charged → speed_burst                           │
│  - Large bullet with splash damage                                           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                    VISUAL FEEDBACK                                           │
│                                                                              │
│  Charging visuals:                                                           │
│  - Particles converge to center, color based on charged/warning state        │
│  - Orb radius grows with charge progress, pulses when fully charged          │
│  - Warning blinks red when burnout_warning (30f before auto-burnout)         │
│                                                                              │
│  Sprite animation:                                                           │
│  - Base sprite + powerup offset (none/pierce/rapid/both)                     │
│  - Charging/charged: use charging sprite variant                             │
│  - Speed_burst: animated burst sequence                                      │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                    DESIGN EVOLUTION: v1 → v2 → v3                           │
│                                                                              │
│  Component    │ v1                   │ v2                 │ v3 (Current)     │
│  ─────────────┼──────────────────────┼────────────────────┼──────────────────│
│  Input        │ FSM (5 states)       │ FSM (3 states)     │ NO FSM           │
│               │ tap/hold detection   │ press/release only │ edge detection   │
│  ─────────────┼──────────────────────┼────────────────────┼──────────────────│
│  Player FSM   │ 9 states             │ 7 states           │ 7 states         │
│               │ (incl. REVERSING)    │ (no REVERSING)     │ (same as v2)     │
│  ─────────────┼──────────────────────┼────────────────────┼──────────────────│
│  Complexity   │ Two FSMs interacting │ Two FSMs (simpler) │ One FSM + flags  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
