/* eslint-disable no-undef, no-unused-vars */
class Shooter extends RectObject {
  constructor(pos, gridRow, gridCol, entryStyle, isEntering, isElite) {
    super(pos, vec2(2.3, 1.6), rgb(.95, .2, .2)); // Red, invader-like
    this.gridRow = gridRow;
    this.gridCol = gridCol;
    this.isElite = isElite || false;
    const cfg = this.isElite ? ENEMY_CONFIGS.shooterElite : ENEMY_CONFIGS.shooter;
    this.health = cfg.health;
    this.shootRate = cfg.shootRate;
    this.aimed = cfg.aimed || false;
    this.shootTimer = new Timer();
    this.renderOrder = 5;
    this.isEntering = isEntering || false;
    this.entryStyle = entryStyle || 'from_top';
    this.gridPos = pos.copy();
    this.entryStartPos = null;
    this.entryTimer = new Timer();

    if (this.isEntering) {
      this.entryStartPos = this.computeOffScreenPos();
      this.pos = this.entryStartPos.copy();
      this.entryTimer.set(0.4);
    }
  }

  computeOffScreenPos() {
    const offScreenDist = 5;
    let style = this.entryStyle;

    // Resolve random to one of the three directions
    if (style === 'random') {
      const options = ['from_top', 'from_left', 'from_right'];
      style = options[Math.floor(rand(0, 3))];
      this.entryStyle = style; // Store resolved style
    }

    if (style === 'from_top') {
      return vec2(this.gridPos.x, this.gridPos.y + offScreenDist);
    } else if (style === 'from_left') {
      return vec2(this.gridPos.x - offScreenDist, this.gridPos.y);
    } else if (style === 'from_right') {
      return vec2(this.gridPos.x + offScreenDist, this.gridPos.y);
    }
    return this.gridPos.copy();
  }

  update() {
    if (this.isEntering) {
      this.pos = this.entryStartPos.lerp(this.gridPos, 1 - (this.entryTimer.time / 0.4));

      if (this.entryTimer.elapsed()) {
        this.pos = this.gridPos.copy();
        this.isEntering = false;
      }
    }
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
  constructor(pos, gridRow, gridCol, entryStyle, isEntering, isElite) {
    super(pos, vec2(2.3, 1.6), rgb(.25, .85, .95)); // Cyan
    this.gridRow = gridRow;
    this.gridCol = gridCol;
    this.isElite = isElite || false;
    const cfg = this.isElite ? ENEMY_CONFIGS.diverElite : ENEMY_CONFIGS.diver;
    this.health = cfg.health;
    this.diveSpeed = cfg.diveSpeed;
    this.diveRate = cfg.diveRate;
    this.gridPos = pos.copy();
    this.originalPos = pos.copy();
    this.isDiving = false;
    this.divePhase = null;
    this.targetX = pos.x;
    this.diveRateTimer = new Timer();
    this.diveRateTimer.set(this.diveRate);
    this.renderOrder = 5;
    this.isEntering = isEntering || false;
    this.entryStyle = entryStyle || 'from_top';
    this.entryStartPos = null;
    this.entryTimer = new Timer();

    if (this.isEntering) {
      this.entryStartPos = this.computeOffScreenPos();
      this.pos = this.entryStartPos.copy();
      this.entryTimer.set(0.4);
    }
  }

  computeOffScreenPos() {
    const offScreenDist = 5;
    let style = this.entryStyle;

    if (style === 'random') {
      const options = ['from_top', 'from_left', 'from_right'];
      style = options[Math.floor(rand(0, 3))];
      this.entryStyle = style;
    }

    if (style === 'from_top') {
      return vec2(this.gridPos.x, this.gridPos.y + offScreenDist);
    } else if (style === 'from_left') {
      return vec2(this.gridPos.x - offScreenDist, this.gridPos.y);
    } else if (style === 'from_right') {
      return vec2(this.gridPos.x + offScreenDist, this.gridPos.y);
    }
    return this.gridPos.copy();
  }

  update() {
    if (this.isEntering) {
      this.pos = this.entryStartPos.lerp(this.gridPos, 1 - (this.entryTimer.time / 0.4));

      if (this.entryTimer.elapsed()) {
        this.pos = this.gridPos.copy();
        this.originalPos = this.gridPos.copy();
        this.isEntering = false;
      }
      return;
    }

    if (this.isDiving) {
      // Dive toward target, then return
      const diveSpeed = this.diveSpeed * 0.1; // Scale to world units
      const targetY = PLAYER_Y + 0.5; // Dive to player level

      if (this.divePhase !== 'ascending') {
        // Descending
        this.pos.y -= diveSpeed;
        this.pos.x = lerp(this.pos.x, this.targetX, 0.05); // Smooth X approach
        if (this.pos.y <= targetY) this.divePhase = 'ascending';
      }
      else {
        // Ascending back to formation — track drifted slot X
        this.pos.y += diveSpeed * 1.5;
        this.pos.x = lerp(this.pos.x, this.originalPos.x, 0.05);
        if (this.pos.y >= this.originalPos.y) {
          // Back at formation
          this.pos = this.originalPos.copy();
          this.isDiving = false;
          this.divePhase = null;
          this.diveRateTimer.set(this.diveRate);
        }
      }
    }
    else {
      // In formation, check dive trigger
      if (this.diveRateTimer.isSet() && this.diveRateTimer.elapsed()) {
        const difficulty = calcDifficulty(waveN);
        if (rand() < difficulty.diveChance) {
          this.isDiving = true;
          this.divePhase = 'descending';
          this.targetX = (this.isElite && player) ? player.pos.x : this.originalPos.x;
          this.diveRateTimer.set(this.diveRate);
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
  constructor(pos, gridRow, gridCol, entryStyle, isEntering, isElite) {
    super(pos, vec2(2.3, 1.6), rgb(.95, .95, .2)); // Yellow
    this.gridRow = gridRow;
    this.gridCol = gridCol;
    this.isElite = isElite || false;
    const cfg = this.isElite ? ENEMY_CONFIGS.reflectorElite : ENEMY_CONFIGS.reflector;
    this.health = cfg.health;
    this.renderOrder = 5;
    this.isEntering = isEntering || false;
    this.entryStyle = entryStyle || 'from_top';
    this.gridPos = pos.copy();
    this.entryStartPos = null;
    this.entryTimer = new Timer();

    if (this.isEntering) {
      this.entryStartPos = this.computeOffScreenPos();
      this.pos = this.entryStartPos.copy();
      this.entryTimer.set(0.4);
    }
  }

  computeOffScreenPos() {
    const offScreenDist = 5;
    let style = this.entryStyle;

    if (style === 'random') {
      const options = ['from_top', 'from_left', 'from_right'];
      style = options[Math.floor(rand(0, 3))];
      this.entryStyle = style;
    }

    if (style === 'from_top') {
      return vec2(this.gridPos.x, this.gridPos.y + offScreenDist);
    } else if (style === 'from_left') {
      return vec2(this.gridPos.x - offScreenDist, this.gridPos.y);
    } else if (style === 'from_right') {
      return vec2(this.gridPos.x + offScreenDist, this.gridPos.y);
    }
    return this.gridPos.copy();
  }

  update() {
    if (this.isEntering) {
      this.pos = this.entryStartPos.lerp(this.gridPos, 1 - (this.entryTimer.time / 0.4));

      if (this.entryTimer.elapsed()) {
        this.pos = this.gridPos.copy();
        this.isEntering = false;
      }
    }
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
  constructor(pos, gridRow, gridCol, entryStyle, isEntering, isElite) {
    super(pos, vec2(2.3, 1.6), rgb(.3, .3, .95)); // Dark blue
    this.gridRow = gridRow;
    this.gridCol = gridCol;
    this.isElite = isElite || false;
    const cfg = this.isElite ? ENEMY_CONFIGS.absorberElite : ENEMY_CONFIGS.absorber;
    this.health = cfg.health;
    this.spitDelay = cfg.spitDelay;
    this.spread = cfg.spread || false;
    this.storedCount = 0;
    this.spitTimer = new Timer();
    this.renderOrder = 5;
    this.isEntering = isEntering || false;
    this.entryStyle = entryStyle || 'from_top';
    this.gridPos = pos.copy();
    this.entryStartPos = null;
    this.entryTimer = new Timer();

    if (this.isEntering) {
      this.entryStartPos = this.computeOffScreenPos();
      this.pos = this.entryStartPos.copy();
      this.entryTimer.set(0.4);
    }
  }

  computeOffScreenPos() {
    const offScreenDist = 5;
    let style = this.entryStyle;

    if (style === 'random') {
      const options = ['from_top', 'from_left', 'from_right'];
      style = options[Math.floor(rand(0, 3))];
      this.entryStyle = style;
    }

    if (style === 'from_top') {
      return vec2(this.gridPos.x, this.gridPos.y + offScreenDist);
    } else if (style === 'from_left') {
      return vec2(this.gridPos.x - offScreenDist, this.gridPos.y);
    } else if (style === 'from_right') {
      return vec2(this.gridPos.x + offScreenDist, this.gridPos.y);
    }
    return this.gridPos.copy();
  }

  absorb() {
    const maxStored = ENEMY_CONFIGS.absorber.maxStored;
    if (this.storedCount < maxStored) {
      this.storedCount++;
      this.spitTimer.set(this.spitDelay);
      return true;
    } else {
      return false;
    }
  }

  spit() {
    if (this.storedCount <= 0) return;

    if (this.spread) {
      // Elite: spit all simultaneously as 3-bullet spread
      for (let i = -1; i <= 1; i++) {
        const vel = vec2(i * 0.3, -0.6);
        enemyBullets.push(new EnemyBullet(this.pos.copy(), vel));
      }
      this.storedCount = 0;
      this.spitTimer.set(0);
    } else {
      // Normal: spit one bullet straight down
      enemyBullets.push(new EnemyBullet(this.pos.copy(), vec2(0, -0.6)));
      this.storedCount--;
      if (this.storedCount > 0) {
        this.spitTimer.set(this.spitDelay);
      } else {
        this.spitTimer.set(0);
      }
    }
  }

  update() {
    if (this.isEntering) {
      this.pos = this.entryStartPos.lerp(this.gridPos, 1 - (this.entryTimer.time / 0.4));

      if (this.entryTimer.elapsed()) {
        this.pos = this.gridPos.copy();
        this.isEntering = false;
      }
      return;
    }

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
