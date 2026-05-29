// ES module export shim — pure functions only, no LittleJS deps.
// Used by tests. Browser loads constants.js (classic script) instead.
// RULE: Every function in this file MUST be mirrored as a classic-script copy in
// constants.js (no export keyword) or the browser will ReferenceError at script load.

export const WAVE_DEFINITIONS = [
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

export function parseWaveDSL(raw) {
  if (!raw || raw.trim() === '') {
    return { entities: [], pattern: null, cleared: '', prepare: '' };
  }

  const parts = raw.split('|');
  if (parts.length !== 3) {
    throw new Error(`Invalid DSL format: expected 3 pipe-delimited parts, got ${parts.length}`);
  }

  const gridStr = parts[0];
  const patternCode = parts[1];
  const msgPair = parts[2];

  const rows = gridStr.split(',');
  if (rows.length !== 5) {
    throw new Error(`Invalid grid: expected 5 rows, got ${rows.length}`);
  }
  const entities = rows.map(row => {
    const chars = row.split('');
    while (chars.length < 11) chars.push('.');
    return chars.slice(0, 11);
  });

  const commaIdx = msgPair.indexOf(',');
  const cleared = (commaIdx >= 0 ? msgPair.slice(0, commaIdx) : msgPair).trim();
  const prepare = (commaIdx >= 0 ? msgPair.slice(commaIdx + 1) : '').trim();

  let pattern;
  switch (patternCode) {
    case 'c': pattern = { order: 'row_major', entry: 'from_top', base: 0, inc: 2 }; break;
    case 'l': pattern = { order: 'col_major', entry: 'alternating', base: 0, inc: 2 }; break;
    case 's': pattern = { order: 'spiral', entry: 'random', base: 0, inc: 2 }; break;
    default: throw new Error(`Invalid pattern code: ${patternCode}`);
  }

  return { entities, pattern, cleared, prepare };
}

export function buildSpawnQueue(waveDef) {
  const { entities, pattern } = waveDef;

  const positions = [];
  for (let row = 0; row < entities.length; row++) {
    for (let col = 0; col < entities[row].length; col++) {
      const char = entities[row][col];
      if (char !== '.') positions.push({ eType: char, row, col });
    }
  }

  if (pattern.order === 'row_major') {
    positions.sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);
  } else if (pattern.order === 'col_major') {
    positions.sort((a, b) => a.col !== b.col ? a.col - b.col : a.row - b.row);
  } else if (pattern.order === 'spiral') {
    const centerCol = 5, centerRow = 2;
    positions.sort((a, b) =>
      (Math.abs(a.col - centerCol) + Math.abs(a.row - centerRow)) -
      (Math.abs(b.col - centerCol) + Math.abs(b.row - centerRow))
    );
  }

  return positions.map((pos, index) => {
    let style = pattern.entry;
    if (pattern.entry === 'alternating') style = pos.col % 2 === 0 ? 'from_left' : 'from_right';
    return { eType: pos.eType, row: pos.row, col: pos.col, style, spawnTimer: (pattern.base + index * pattern.inc) / 60 };
  });
}

const PLAYER_Y = 3;

// Pure diver state machine — no LittleJS deps.
// state: { posX, posY, originalPosX, originalPosY, targetX, isDiving, diveSpeed, diveRate, diveTimer }
// diveTimer: seconds remaining (<=0 = elapsed); null = unset
// Returns new state object (does not mutate).
export function tickDiver(state, randValue, diveChance, playerX = state.originalPosX) {
  const s = { ...state };
  const diveSpeedScaled = s.diveSpeed * 0.1;
  const targetY = PLAYER_Y + 0.5;

  if (s.isDiving) {
    if (s.divePhase !== 'ascending') {
      // Descending
      s.posY -= diveSpeedScaled;
      s.posX += (s.targetX - s.posX) * 0.05;
      if (s.posY <= targetY) s.divePhase = 'ascending';
    } else {
      // Ascending — track drifted slot X too
      s.posY += diveSpeedScaled * 0.5;
      s.posX += (s.originalPosX - s.posX) * 0.05;
      if (s.posY >= s.originalPosY) {
        s.posY = s.originalPosY;
        s.posX = s.originalPosX;
        s.isDiving = false;
        s.divePhase = null;
        s.diveTimer = s.diveRate;
      }
    }
  } else {
    if (s.diveTimer !== null && s.diveTimer <= 0) {
      if (randValue < diveChance) {
        s.isDiving = true;
        s.divePhase = 'descending';
        s.targetX = s.chasesPlayerX ? playerX : s.originalPosX;
        s.diveTimer = s.diveRate;
      } else {
        s.diveTimer = 0.5;
      }
    }
  }
  return s;
}

const BASE_FORMATION_SPEED = 0.08;
const SHOOTER_SHOOT_RATE = 1; // ENEMY_CONFIGS.shooter.shootRate

export function calcDifficulty(waveN) {
  const w = Math.min(waveN, 10);
  const l = waveN > 10 ? Math.sqrt(waveN - 10) : 0;
  const baseFactor = 0.8 + (w - 1) * 0.2 + l * 0.1;
  const shootRateMult = Math.min(baseFactor, 2.5);
  const formationSpeedMult = Math.min(baseFactor * 0.2, 3.5);
  return {
    shootRate: Math.max(20, SHOOTER_SHOOT_RATE / shootRateMult),
    formationSpeed: BASE_FORMATION_SPEED * formationSpeedMult,
    diveChance: Math.min(0.8 + (waveN - 1) * 0.05, 1.0),
  };
}

export function computeHitEvent({ health, scoreValue, dmg, bulletPos, reflected = false, spawned = [] }) {
  const newHealth = health - dmg;
  const kind = newHealth > 0 ? 'damaged' : 'killed';
  const event = {
    kind,
    reflected,
    pos: bulletPos,
    scoreValue: kind === 'killed' ? scoreValue : 0,
    spawned,
  };
  return { newHealth, event };
}
