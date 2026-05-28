// World units: 1 wu = 16px at cameraScale 16
/* eslint-disable no-undef, no-unused-vars */

// Minimal Vector2 for ES module tests (will be overridden by LittleJS in browser)
if (typeof Vector2 === 'undefined') {
  class Vector2 {
    constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
    }
  }
  globalThis.Vector2 = Vector2;
  globalThis.vec2 = (x = 0, y) => new Vector2(x, y ?? x);
}

const CANVAS_SIZE = vec2(640, 480);
const LEVEL_SIZE = vec2(40, 30);
const CAMERA_SCALE = 16;
const PLAYER_Y = 3;

// Player configuration (speed* multipliers relative to speed, accel* in frames)
const PLAYER_CONFIG = {
  size: vec2(3.2, 1.4),
  speed: 0.3,
  speedCharging: 0.2,      // 0.03 / 0.15
  speedBurst: 4,           // 0.6 / 0.15
  speedBurnout: 2,         // 0.3 / 0.15
  accelNormal: 10,         // frames to reach target
  accelCharging: 20,       // frames to reach target
  accelBurst: 1,           // frames to reach target
  accelBurnout: 5          // frames to reach target
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
const TEMP_OVERHEAT = 100;

// Enemy configurations (frame values converted to seconds)
const ENEMY_CONFIGS = {
  shooter: { shootRate: 1, score: 16, health: 1 },          // 60 frames → 1 second
  shooterElite: { shootRate: 0.7, score: 32, health: 2, aimed: true },
  diver: { diveSpeed: 2, diveRate: 2, score: 32, health: 2 }, // 120 frames → 2 seconds
  diverElite: { diveSpeed: 1.6, diveRate: 1.6, score: 64, health: 4 },
  reflector: { score: 160, health: 3 },
  reflectorElite: { score: 320, health: 5 },
  absorber: { maxStored: 3, spitDelay: 1, score: 256, health: 1 }, // 60 frames → 1 second
  absorberElite: { maxStored: 3, spitDelay: 0.5, score: 512, health: 2, spread: true },
  treasure: { health: 50, score: 500, spawnInterval: 30 },    // 1800 frames → 30 seconds
  boss: { health: 50, score: 800 },
};

const WAVE_DEFINITIONS = [
  ".p...p...p,..p.p.p.p.,.p.p...p.p,..p.p.p.p.,.p...p...p.|c|Wave 1 cleared!,Prepare for wave 2",
  "...p...p...,..p.ppp.p.,.k.k.k.k.k,p...p.p...p,.p..p.p..p.|c|Wave 2 cleared!,Prepare for wave 3",
  "..p.p.p.p.,.prk.k.krp,..p.p.p.p.,.prk...krp,..p.....p..|l|Wave 3 cleared!,Prepare for wave 4",
  "...p...p..,k..p...p..k,.k.r.p.r.k.,..k.p.p.k..,...a...a...|c|Wave 4 cleared!,Prepare for wave 5",
  "...p.p.p..,.pkpp.ppkp,p..r.p.r..p,..papkpap,.k.......k.|s|Wave 5 cleared!,Prepare for wave 6",
  ".p.p.p.p.p,..krp.prk.,.k.p.k.p.k,..a.k.k.a.,.p.p...p.p.|c|Wave 6 cleared!,Prepare for wave 7",
  "...k.P.k..,p.a.kpk.Ap,.RprpkprpR,p.k.ApA.kp,...k.p.k..|l|Wave 7 cleared!,Prepare for wave 8",
  "...r.k.r..,.Kpap.papK,pr...a...rp,.Pkp.p.pkP,.k.p.p.p.k|s|Wave 8 cleared!,Prepare for wave 9",
  "P.p.pPp.p.P,p.Rp.K.pR.p,pKk.rEr.kKp,p..A.k.A..p,pRpKpEpKpRp|c|Wave 9 cleared!,Prepare for boss fight",
  ".....B.....,.........,.........,.........,.........|c|Boss defeated!,Cycle complete",
];

function parseWaveDSL(raw) {
  if (!raw || raw.trim() === '') {
    return {
      entities: [],
      pattern: null,
      cleared: '',
      prepare: ''
    };
  }

  const parts = raw.split('|');
  if (parts.length !== 3) {
    throw new Error(`Invalid DSL format: expected 3 pipe-delimited parts, got ${parts.length}`);
  }

  const gridStr = parts[0];
  const patternCode = parts[1];
  const msgPair = parts[2];

  // Parse grid
  const rows = gridStr.split(',');
  if (rows.length !== 5) {
    throw new Error(`Invalid grid: expected 5 rows, got ${rows.length}`);
  }
  const entities = rows.map(row => {
    const chars = row.split('');
    while (chars.length < 11) chars.push('.');
    return chars.slice(0, 11);
  });

  // Parse messages — split on first comma only
  const commaIdx = msgPair.indexOf(',');
  const cleared = (commaIdx >= 0 ? msgPair.slice(0, commaIdx) : msgPair).trim();
  const prepare = (commaIdx >= 0 ? msgPair.slice(commaIdx + 1) : '').trim();

  // Set pattern defaults
  let pattern;
  switch (patternCode) {
    case 'c':
      pattern = { order: 'row_major', entry: 'from_top', base: 0, inc: 2 };
      break;
    case 'l':
      pattern = { order: 'col_major', entry: 'alternating', base: 0, inc: 2 };
      break;
    case 's':
      pattern = { order: 'spiral', entry: 'random', base: 0, inc: 2 };
      break;
    default:
      throw new Error(`Invalid pattern code: ${patternCode}`);
  }

  return {
    entities,
    pattern,
    cleared,
    prepare
  };
}

export { WAVE_DEFINITIONS, parseWaveDSL };
