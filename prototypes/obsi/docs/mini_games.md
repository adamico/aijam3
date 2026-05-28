# Mini-Games

Optional interlude games triggered between waves (~30% chance per wave transition).

## Dodge Asteroids

Player must avoid invincible asteroids falling from the top of the screen.

- Asteroids spawn at random horizontal positions, fall at varying speeds
- Collision with any asteroid fails the mini-game
- Duration: timed countdown; survive to complete

## Catch Bonus

Player must collect fast-falling bonus items before they exit the screen.

- Items spawn at random positions, fall faster than asteroids
- Each caught item awards score
- Items that reach the bottom are lost; mini-game ends when timer expires

## Integration

- Triggered by wave transition logic with configurable probability
- Mini-game FSM states: `waiting → dodge_game | catch_game → waiting`
- On completion (success or fail), returns to normal wave flow

## Design Note

See `elite_enemies.md` for the analysis of why elite enemies were preferred over mini-games for the core content roadmap. Mini-games add variety but require standalone tuning and UI that elites do not.
