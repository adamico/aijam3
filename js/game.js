/* eslint-disable no-undef, no-unused-vars */
// engine settings
debugWatermark = false;
showEngineVersion = false;
debugKey = 'Backquote';

// Global game state
let player;
let bullets = [];
let enemies = [];
let boss = null;
let enemyBullets = [];
let treasure = null;
let waveN = 1;
let waveState = 'transition';
let transitionTimer = new Timer();
let bossDefeatedTimer = new Timer();
let cycleTransitionTimer = new Timer();

// Formation state
let formationDir = 1;
let formationSpeed = 0.08;
let formationShootTimer = new Timer();
let isBossWave = false;

// Treasure state
let treasureSpawnTimer = new Timer();

let score = 0;
let hiScore = 0;
let lives = 3;
let currentLevel = 1;

let gameOver = false;
let titleScreen = true;

// Helpers
const btnPressed = () => mouseWasPressed(0) || keyWasPressed('Space');
const btnReleased = () => mouseWasReleased(0) || keyWasReleased('Space');
const btnDown = () => mouseIsDown(0) || keyIsDown('Space');

function clampToPlayfield(pos, halfSize) {
  pos.x = clamp(pos.x, 0 + halfSize, LEVEL_SIZE.x - halfSize);
  pos.y = clamp(pos.y, 0 + halfSize, LEVEL_SIZE.y - halfSize);
  return pos;
}

// Difficulty scaling
function calcDifficulty(waveN) {
  const c = Math.floor((waveN - 1) / 10) + 1; // Cycle number
  const w = Math.min(waveN, 10); // Linear phase
  const l = waveN > 10 ? Math.sqrt(waveN - 10) : 0; // Sqrt phase

  const baseFactor = 0.8 + (w - 1) * 0.2 + l * 0.1; // Range [0.8, 2.0+]
  const shootRateMult = Math.min(baseFactor, 2.5); // Cap at 2.5x
  const formationSpeedMult = Math.min(baseFactor * 0.2, 3.5); // Faster scaling

  return {
    shootRate: Math.max(20, ENEMY_CONFIGS.shooter.shootRate / shootRateMult),
    formationSpeed: formationSpeed * formationSpeedMult,
    diveChance: Math.min(0.8 + (waveN - 1) * 0.05, 1.0),
  };
}

function spawnEnemyGrid() {
  boss = null;
  isBossWave = waveN % 10 === 0;

  if (isBossWave) {
    // Boss wave - spawn single boss
    enemies = [];
    boss = new Boss(vec2(LEVEL_SIZE.x / 2, LEVEL_SIZE.y - 5));
  }
  else {
    // Normal wave - spawn grid
    enemies = [];
    formationDir = 1;
    formationSpeed = calcDifficulty(waveN).formationSpeed;
    formationShootTimer.set(0);

    const startX = LEVEL_SIZE.x / 2 - GRID_WIDTH / 2;
    const startY = GRID_START_Y_OFFSET;

    for (let r = 0; r < GRID_ROWS; r++)
      for (let c = 0; c < GRID_COLS; c++) {
        const pos = vec2(startX + c * GRID_SPACING.x, startY - r * GRID_SPACING.y);
        // Spawn mix: row 0 = shooter, row 1 = diver, row 2 = reflector, row 3 = absorber, row 4 = shooter
        if (r === 1) enemies.push(new Diver(pos, r, c));
        else if (r === 2) enemies.push(new Reflector(pos, r, c));
        else if (r === 3) enemies.push(new Absorber(pos, r, c));
        else enemies.push(new Shooter(pos, r, c));
      }
  }
}

// Game loop
function gameInit() {
  setCanvasFixedSize(CANVAS_SIZE);
  setCameraPos(LEVEL_SIZE.scale(.5));
  cameraScale = CAMERA_SCALE;

  // Create player
  player = new Player(vec2(LEVEL_SIZE.x / 2, -2));
  player.state = 'pre_entry';
  player.entryTimer.set(1);

  // Initialize HUD
  score = 0;
  hiScore = 0;
  lives = 3;
  currentLevel = 1;
  gameOver = false;
  titleScreen = false;

  // Initialize wave state and spawn initial enemies
  waveState = 'combat';
  spawnEnemyGrid();
  treasureSpawnTimer.set(ENEMY_CONFIGS.treasure.spawnInterval);
}

function gameUpdate() {
  // Update bullets and remove destroyed ones
  bullets = bullets.filter(b => !b.destroyed);
  enemyBullets = enemyBullets.filter(b => !b.destroyed);

  // Update treasure
  if (treasure && treasure.destroyed)
    treasure = null;

  // Treasure spawning
  if (waveState === 'combat' && !treasure && treasureSpawnTimer.isSet() && treasureSpawnTimer.elapsed()) {
    // Spawn treasure away from player
    let spawnPos = vec2(rand(10, 50), rand(15, 25));
    if (player) {
      while (spawnPos.distance(player.pos) < 15)
        spawnPos = vec2(rand(10, 50), rand(15, 25));
    }
    treasure = new Treasure(spawnPos);
    treasureSpawnTimer.set(ENEMY_CONFIGS.treasure.spawnInterval);
  }

  // Update enemies
  enemies = enemies.filter(e => !e.destroyed);

  // Bullet-treasure collision
  for (const bullet of bullets) {
    if (bullet.destroyed || !treasure) continue;
    if (isOverlapping(bullet.pos, bullet.size, treasure.pos, treasure.size)) {
      bullet.destroy();
      treasure.health--;
      if (treasure.health <= 0) {
        treasure.destroy();
        score += ENEMY_CONFIGS.treasure.score;
        hiScore = max(hiScore, score);
      }
    }
  }

  // Bullet-enemy collisions
  for (const bullet of bullets) {
    if (bullet.destroyed) continue;
    for (const enemy of enemies) {
      if (enemy.destroyed) continue;
      if (isOverlapping(bullet.pos, bullet.size, enemy.pos, enemy.size)) {
        if (enemy instanceof Reflector) {
          // Reflect the bullet
          bullet.vel.y *= -1;
          bullets.push(new EnemyBullet(bullet.pos.copy(), bullet.vel));
          bullet.destroy();
          enemy.health--;
        }
        else if (enemy instanceof Absorber) {
          // Absorb the bullet
          bullet.destroy();
          if (enemy.absorb()) {
            break;
          } else {
            enemy.health--;
          }
        }
        else {
          // Normal bullet hit
          bullet.destroy();
          enemy.health--;
        }

        // Check if enemy defeated
        if (!enemy.destroyed && enemy.health <= 0) {
          enemy.destroy();
          let scoreValue = ENEMY_CONFIGS.shooter.score;
          if (enemy instanceof Diver) scoreValue = ENEMY_CONFIGS.diver.score;
          else if (enemy instanceof Reflector) scoreValue = ENEMY_CONFIGS.reflector.score;
          else if (enemy instanceof Absorber) scoreValue = ENEMY_CONFIGS.absorber.score;
          score += scoreValue;
          hiScore = max(hiScore, score);
        }
        break;
      }
    }
  }

  // Player-diver collision
  if (player && !player.destroyed) {
    for (const enemy of enemies) {
      if (enemy instanceof Diver && enemy.isDiving && !enemy.destroyed) {
        if (isOverlapping(player.pos, player.size, enemy.pos, enemy.size)) {
          // Player loses a life
          lives--;
          if (lives <= 0) {
            gameOver = true;
          }
          enemy.isDiving = false;
          enemy.pos = enemy.originalPos.copy();
          break;
        }
      }
    }
  }

  // Boss or formation movement
  if (waveState === 'combat') {
    if (boss) {
      // Check boss-bullet collision
      for (const bullet of bullets) {
        if (bullet.destroyed || !boss) continue;
        if (isOverlapping(bullet.pos, bullet.size, boss.pos, boss.size)) {
          bullet.destroy();
          boss.health--;
          if (boss.health <= 0) {
            score += ENEMY_CONFIGS.boss.score;
            hiScore = max(hiScore, score);
            waveState = 'boss_defeated';
            bossDefeatedTimer.set(3);
            boss.destroy();
            boss = null;
          }
        }
      }
    }
    else if (enemies.length > 0) {
      updateFormation();
    }
  }

  // Wave FSM
  updateWaveFSM();
}

function updateFormation() {
  if (enemies.length === 0) return;

  // Calculate formation bounds
  let minX = Infinity, maxX = -Infinity;
  for (const e of enemies) {
    const half = e.size.x / 2;
    minX = Math.min(minX, e.pos.x - half);
    maxX = Math.max(maxX, e.pos.x + half);
  }

  // Check for wall hit
  if ((formationDir < 0 && minX < 0 + 1) || (formationDir > 0 && maxX > LEVEL_SIZE.x - 1)) {
    formationDir *= -1;
  }

  // Move formation
  for (const e of enemies)
    e.pos.x += formationDir * formationSpeed;

  // Enemy shooting
  const difficulty = calcDifficulty(waveN);
  if (!formationShootTimer.isSet()) {
    formationShootTimer.set(difficulty.shootRate / 60);
  }
  if (formationShootTimer.elapsed()) {
    // Find lowest enemy in a random column
    const randomCol = Math.floor(Math.random() * GRID_COLS);
    let lowestEnemy = null;
    for (const e of enemies) {
      if (e.gridCol === randomCol && (!lowestEnemy || e.pos.y < lowestEnemy.pos.y))
        lowestEnemy = e;
    }
    if (lowestEnemy) {
      enemyBullets.push(new EnemyBullet(lowestEnemy.pos.add(vec2(0, -0.8)), vec2(0, -0.6)));
    }
    formationShootTimer.set(difficulty.shootRate / 60);
  }
}

function updateWaveFSM() {
  if (waveState === 'transition') {
    if (!transitionTimer.isSet()) {
      transitionTimer.set(2);
    }
    if (transitionTimer.elapsed()) {
      waveState = 'combat';
      spawnEnemyGrid();
      treasure = null;
      treasureSpawnTimer.set(ENEMY_CONFIGS.treasure.spawnInterval);
      if (player) {
        player.pos = vec2(LEVEL_SIZE.x / 2, -2);
        player.state = 'pre_entry';
        player.entryTimer.set(1);
      }
    }
  }
  else if (waveState === 'combat') {
    // Check wave clear: all enemies dead + spawn queue empty
    if (enemies.length === 0) {
      if (waveN % 10 === 0) {
        // Boss defeated
        waveState = 'boss_defeated';
        bossDefeatedTimer.set(3);
      }
      else {
        // Normal wave clear
        waveState = 'transition';
        transitionTimer.set(2);
        waveN++;
        if (player) {
          player.state = 'exiting';
        }
      }
    }
  }
  else if (waveState === 'boss_defeated') {
    if (bossDefeatedTimer.elapsed()) {
      waveState = 'cycle_transition';
      cycleTransitionTimer.set(1);
    }
  }
  else if (waveState === 'cycle_transition') {
    if (cycleTransitionTimer.elapsed()) {
      waveState = 'transition';
      transitionTimer.set(2);
      waveN++;
      if (player) {
        player.state = 'exiting';
      }
    }
  }
}

function gameUpdatePost() {
  setCameraPos(LEVEL_SIZE.scale(.5));
}

function gameRender() {
  // Black playfield background
  drawRect(cameraPos, LEVEL_SIZE.add(vec2(20, 20)), rgb(0, 0, 0));
  drawRect(cameraPos, LEVEL_SIZE, rgb(0, 0, 0));
}

function gameRenderPost() {
  // HUD
  const hudY = 30;
  const color = rgb(.2, .95, .25);

  // SCORE at top left
  drawTextScreen('SCORE', vec2(80, hudY), 26, color);
  drawTextScreen(String(score).padStart(4, '0'), vec2(80, hudY + 32), 26, rgb(.95, .95, .95));

  // HI-SCORE on top right
  drawTextScreen('HI-SCORE', vec2(mainCanvasSize.x - 100, hudY), 26, color);
  drawTextScreen(String(hiScore).padStart(4, '0'), vec2(mainCanvasSize.x - 100, hudY + 32), 26, rgb(.95, .95, .95));

  // Lives indicator at bottom left
  const livesY = mainCanvasSize.y - 18;
  for (let i = 0; i < lives - 1 && i < 5; i++) {
    const px = 50 + i * 45;
    const py = livesY;
    const shipColor = rgb(.2, .9, .95);
    mainContext.fillStyle = shipColor.toString();
    mainContext.fillRect(px - 2, py - 8, 4, 6);
    mainContext.fillRect(px - 12, py - 2, 24, 8);
    mainContext.fillRect(px - 16, py + 2, 6, 4);
    mainContext.fillRect(px + 10, py + 2, 6, 4);
  }

  // Wave indicator at bottom right
  let waveLabel = `WAVE ${waveN}`;
  if (waveN % 10 === 0)
    waveLabel += ' (BOSS)';
  drawTextScreen(waveLabel, vec2(mainCanvasSize.x - 120, livesY + 3), 26, rgb(.2, .9, .95));
}

// Start engine
engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost);
