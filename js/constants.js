// World units: 1 wu = 16px at cameraScale 16
/* eslint-disable no-undef, no-unused-vars */

const CANVAS_SIZE = vec2(960, 540);
const LEVEL_SIZE = vec2(60, 34);
const CAMERA_SCALE = 16;
const PLAYER_Y = 3;

// Player configuration (speed* multipliers relative to speed, accel* in frames)
const PLAYER_CONFIG = {
    size: vec2(3.2, 1.4),
    speed: 0.15,
    speedCharging: 0.2,      // 0.03 / 0.15
    speedBurst: 4,           // 0.6 / 0.15
    speedBurnout: 2,         // 0.3 / 0.15
    accelNormal: 10,         // frames to reach target
    accelCharging: 20,       // frames to reach target
    accelBurst: 1,           // frames to reach target
    accelBurnout: 5,         // frames to reach target
    cooldownFrames: 20,      // frames between shots
    cooldownMin: 8,          // min frames (warm bonus cap)
    cooldownBonus: 0.6       // warm zone fire rate multiplier
};

// Grid layout derived from play area
const GRID_COLS = 11;
const GRID_ROWS = 5;
const GRID_WIDTH = LEVEL_SIZE.x * 0.85;
const GRID_SPACING = vec2(GRID_WIDTH / (GRID_COLS - 1), 2.3);
const GRID_START_Y_OFFSET = LEVEL_SIZE.y - 6;

// Weapon temperature constants
const TEMP_PER_SHOT = 10;
const TEMP_COOLING_RATE = 0.6;
const TEMP_WARM_MIN = 40;
const TEMP_WARM_MAX = 70;
const TEMP_OVERHEAT = 100;

// Enemy configurations (frame values converted to seconds)
const ENEMY_CONFIGS = {
    shooter: { shootRate: 1, score: 16, health: 1 },          // 60 frames → 1 second
    diver: { diveSpeed: 2, diveRate: 2, score: 32, health: 2 }, // 120 frames → 2 seconds
    reflector: { score: 160, health: 3 },
    absorber: { maxStored: 3, spitDelay: 1, score: 256, health: 1 }, // 60 frames → 1 second
    treasure: { health: 50, score: 500, spawnInterval: 30 },    // 1800 frames → 30 seconds
    boss: { health: 50, score: 800 },
};
