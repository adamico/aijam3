/* eslint-disable no-undef, no-unused-vars */
class Shooter extends RectObject {
  constructor(pos, gridRow, gridCol) {
    super(pos, vec2(2.3, 1.6), rgb(.95, .2, .2)); // Red, invader-like
    this.gridRow = gridRow;
    this.gridCol = gridCol;
    this.health = ENEMY_CONFIGS.shooter.health;
    this.shootTimer = new Timer();
    this.renderOrder = 5;
  }

  update() {
    // Movement handled by formation - just wait for shoot timer
  }

  render() {
    if (!this.destroyed) {
      const p = this.pos;
      const s = 0.22;
      // Simple invader sprite
      drawRect(p.add(vec2(0, .3)), vec2(s * 3, s), this.color);
      drawRect(p.add(vec2(-.6, .3)), vec2(s, s * 3), this.color);
      drawRect(p.add(vec2(.6, .3)), vec2(s, s * 3), this.color);
      drawRect(p, vec2(s * 6, s * 4), this.color);
      drawRect(p.add(vec2(-0.8, -.5)), vec2(s, s * 2), this.color);
      drawRect(p.add(vec2(-0.3, -.5)), vec2(s, s * 2), this.color);
      drawRect(p.add(vec2(0.3, -.5)), vec2(s, s * 2), this.color);
      drawRect(p.add(vec2(0.8, -.5)), vec2(s, s * 2), this.color);
    }
  }
}

class Diver extends RectObject {
  constructor(pos, gridRow, gridCol) {
    super(pos, vec2(2.3, 1.6), rgb(.25, .85, .95)); // Cyan
    this.gridRow = gridRow;
    this.gridCol = gridCol;
    this.health = ENEMY_CONFIGS.diver.health;
    this.originalPos = pos.copy();
    this.isDiving = false;
    this.targetX = pos.x;
    this.diveRateTimer = new Timer();
    this.renderOrder = 5;
  }

  update() {
    if (this.isDiving) {
      // Dive toward target, then return
      const diveSpeed = ENEMY_CONFIGS.diver.diveSpeed * 0.1; // Scale to world units
      const targetY = PLAYER_Y + 0.5; // Dive to player level

      if (this.pos.y > targetY) {
        // Descending
        this.pos.y -= diveSpeed;
        this.pos.x = lerp(this.pos.x, this.targetX, 0.05); // Smooth X approach
      }
      else {
        // Ascending back to formation
        this.pos.y += diveSpeed * 0.5; // Slower ascent
        if (this.pos.y >= this.originalPos.y) {
          // Back at formation
          this.pos = this.originalPos.copy();
          this.isDiving = false;
          this.diveRateTimer.set(ENEMY_CONFIGS.diver.diveRate);
        }
      }
    }
    else {
      // In formation, check dive trigger
      if (this.diveRateTimer.isSet() && this.diveRateTimer.elapsed()) {
        const difficulty = calcDifficulty(waveN);
        if (rand() < difficulty.diveChance) {
          this.isDiving = true;
          this.targetX = player ? player.pos.x : LEVEL_SIZE.x / 2;
          this.diveRateTimer.set(ENEMY_CONFIGS.diver.diveRate);
        }
        else {
          this.diveRateTimer.set(0.5); // Check again in 0.5 seconds
        }
      }
    }
  }

  render() {
    if (!this.destroyed) {
      const p = this.pos;
      const s = 0.22;
      // Cyan diver sprite (different from red shooter)
      drawRect(p.add(vec2(0, .5)), vec2(s * 4, s), this.color);
      drawRect(p.add(vec2(-0.8, .2)), vec2(s, s * 2), this.color);
      drawRect(p.add(vec2(0.8, .2)), vec2(s, s * 2), this.color);
      drawRect(p, vec2(s * 6, s * 3), this.color);
      drawRect(p.add(vec2(-0.6, -.5)), vec2(s * 2, s), this.color);
      drawRect(p.add(vec2(0.6, -.5)), vec2(s * 2, s), this.color);
    }
  }
}

class Reflector extends RectObject {
  constructor(pos, gridRow, gridCol) {
    super(pos, vec2(2.3, 1.6), rgb(.95, .95, .2)); // Yellow
    this.gridRow = gridRow;
    this.gridCol = gridCol;
    this.health = ENEMY_CONFIGS.reflector.health;
    this.renderOrder = 5;
  }

  render() {
    if (!this.destroyed) {
      const p = this.pos;
      const s = 0.22;
      // Yellow reflector sprite with angular design
      drawRect(p.add(vec2(0, .3)), vec2(s * 4, s), this.color);
      drawRect(p.add(vec2(-.8, 0)), vec2(s * 2, s * 3), this.color);
      drawRect(p.add(vec2(.8, 0)), vec2(s * 2, s * 3), this.color);
      drawRect(p, vec2(s * 6, s * 2), this.color);
      drawRect(p.add(vec2(-0.5, -.6)), vec2(s, s * 2), this.color);
      drawRect(p.add(vec2(0.5, -.6)), vec2(s, s * 2), this.color);
    }
  }
}

class Absorber extends RectObject {
  constructor(pos, gridRow, gridCol) {
    super(pos, vec2(2.3, 1.6), rgb(.3, .3, .95)); // Dark blue
    this.gridRow = gridRow;
    this.gridCol = gridCol;
    this.health = ENEMY_CONFIGS.absorber.health;
    this.storedCount = 0;
    this.spitTimer = new Timer();
    this.renderOrder = 5;
  }

  absorb() {
    if (this.storedCount < ENEMY_CONFIGS.absorber.maxStored) {
      this.storedCount++;
      this.spitTimer.set(ENEMY_CONFIGS.absorber.spitDelay);
      return true;
    } else {
      return false;
    }
  }

  spit() {
    if (this.storedCount > 0) {
      const spreadAngle = PI / 8;
      for (let i = 0; i < this.storedCount; i++) {
        const angle = -PI / 2 + (i - (this.storedCount - 1) / 2) * spreadAngle;
        const vel = vec2(Math.cos(angle) * 0.3, Math.sin(angle) * 0.6);
        enemyBullets.push(new EnemyBullet(this.pos.copy(), vel));
      }
      this.storedCount = 0;
      this.spitTimer.set(0);
    }
  }

  update() {
    if (this.storedCount > 0) {
      if (this.spitTimer.isSet() && this.spitTimer.elapsed()) this.spit();
    }
  }

  render() {
    if (!this.destroyed) {
      const p = this.pos;
      const s = 0.22;
      // Dark blue absorber sprite
      drawRect(p.add(vec2(0, .3)), vec2(s * 5, s), this.color);
      drawRect(p.add(vec2(-0.8, .1)), vec2(s, s * 3), this.color);
      drawRect(p.add(vec2(0.8, .1)), vec2(s, s * 3), this.color);
      drawRect(p, vec2(s * 6, s * 3), this.color);
      drawRect(p.add(vec2(-0.4, -.5)), vec2(s * 2, s), this.color);
      drawRect(p.add(vec2(0.4, -.5)), vec2(s * 2, s), this.color);

      // Draw stored count
      if (this.storedCount > 0) {
        drawText(String(this.storedCount), p.add(vec2(0, 1.2)), 1, rgb(.3, .3, .95), 0, rgb(1, 1, 1));
      }
    }
  }
}

class Boss extends RectObject {
  constructor(pos) {
    super(pos, vec2(5, 4), rgb(.95, .2, .2)); // Large red
    this.vel = vec2(-0.1, 0);
    this.shootTimer = new Timer();
    this.cycle = Math.floor((waveN - 1) / 10) + 1;
    this.baseBossHp = ENEMY_CONFIGS.boss.health;
    this.health = this.baseBossHp * (0.5 + this.cycle * 0.3); // Scale health by cycle
    this.renderOrder = 5;
  }

  update() {
    // Boss movement - side-to-side
    this.pos = this.pos.add(this.vel);

    const halfSize = this.size.x * 0.5;
    if (this.pos.x - halfSize <= 0 || this.pos.x + halfSize >= LEVEL_SIZE.x)
      this.vel.x *= -1;

    // Clamp to playfield
    this.pos.x = clamp(this.pos.x, 0 + halfSize, LEVEL_SIZE.x - halfSize);

    // Boss shooting - scaled with cycle
    const difficulty = calcDifficulty(waveN);
    const bossShootRate = Math.max(30, 60 / (0.8 + this.cycle * 0.4));
    if (!this.shootTimer.isSet()) {
      this.shootTimer.set(bossShootRate / 60);
    }
    if (this.shootTimer.elapsed()) {
      // Boss fires 3 bullets spread
      for (let i = -1; i <= 1; i++) {
        const vel = vec2(i * 0.2, -0.8);
        enemyBullets.push(new EnemyBullet(this.pos.add(vec2(0, -2)), vel));
      }
      this.shootTimer.set(bossShootRate / 60);
    }
  }

  render() {
    if (!this.destroyed) {
      const p = this.pos;
      const s = 0.3;
      // Large boss sprite
      drawRect(p.add(vec2(0, .3)), vec2(s * 6, s * 2), this.color);
      drawRect(p.add(vec2(-1.5, .1)), vec2(s, s * 3), this.color);
      drawRect(p.add(vec2(-0.5, .1)), vec2(s, s * 3), this.color);
      drawRect(p.add(vec2(0.5, .1)), vec2(s, s * 3), this.color);
      drawRect(p.add(vec2(1.5, .1)), vec2(s, s * 3), this.color);
      drawRect(p, vec2(s * 8, s * 3), this.color);
      drawRect(p.add(vec2(-2, -.5)), vec2(s * 2, s * 2), this.color);
      drawRect(p.add(vec2(2, -.5)), vec2(s * 2, s * 2), this.color);
    }
  }
}

class Treasure extends RectObject {
  constructor(pos) {
    super(pos, vec2(3, 3), rgb(.95, .85, .2)); // Gold/yellow
    this.vel = vec2(0.2 + rand(0, 0.1), 0.2 + rand(0, 0.1));
    this.health = ENEMY_CONFIGS.treasure.health;
    this.renderOrder = 7;
  }

  update() {
    // Move and bounce off walls
    this.pos = this.pos.add(this.vel);

    const halfSize = this.size.x * 0.5;
    if (this.pos.x - halfSize <= 0 || this.pos.x + halfSize >= LEVEL_SIZE.x)
      this.vel.x *= -1;
    if (this.pos.y - halfSize <= 0 || this.pos.y + halfSize >= LEVEL_SIZE.y)
      this.vel.y *= -1;

    // Clamp to playfield
    this.pos.x = clamp(this.pos.x, 0 + halfSize, LEVEL_SIZE.x - halfSize);
    this.pos.y = clamp(this.pos.y, 0 + halfSize, LEVEL_SIZE.y - halfSize);
  }

  render() {
    if (!this.destroyed) {
      const p = this.pos;
      const s = 0.3;
      // Gold treasure sprite
      drawRect(p.add(vec2(0, .2)), vec2(s * 5, s * 2), this.color);
      drawRect(p.add(vec2(-0.8, -.2)), vec2(s, s * 2), this.color);
      drawRect(p.add(vec2(0.8, -.2)), vec2(s, s * 2), this.color);
      drawRect(p, vec2(s * 6, s * 3), this.color);
      drawRect(p.add(vec2(-1, -.6)), vec2(s, s), this.color);
      drawRect(p.add(vec2(0, -.7)), vec2(s, s), this.color);
      drawRect(p.add(vec2(1, -.6)), vec2(s, s), this.color);
    }
  }
}
