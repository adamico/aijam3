/* eslint-disable no-undef, no-unused-vars */

/* Pico8 definitions
wave_definitions = {
   ".p...p...p,..p.p.p.p.,.p.p...p.p,..p.p.p.p.,.p...p...p.|c|       \^o050\f8wave 1 cleared!,pREPARE fOR wAVE 2",
   "...p...p...,..p.ppp.p.,.k.k.k.k.k,p...p.p...p,.p..p.p..p.|c|       \^o050\f8wave 2 cleared!,pREPARE fOR wAVE 3",
   "..p.p.p.p.,.prk.k.krp,..p.p.p.p.,.prk...krp,..p.....p..|l|       \^o050\f8wave 3 cleared!,pREPARE fOR wAVE 4",
   "...p...p..,k..p...p..k,.k.r.p.r.k.,..k.p.p.k..,...a...a...|c|       \^o050\f8wave 4 cleared!,pREPARE fOR wAVE 5",
   "...p.p.p..,.pkpp.ppkp,p..r.p.r..p,..papkpap,.k.......k.|s|       \^o050\f8wave 5 cleared!,pREPARE fOR wAVE 6",
   ".p.p.p.p.p,..krp.prk.,.k.p.k.p.k,..a.k.k.a.,.p.p...p.p.|c|       \^o050\f8wave 6 cleared!,pREPARE fOR wAVE 7",
   "...k.P.k..,p.a.kpk.Ap,.RprpkprpR,p.k.ApA.kp,...k.p.k..|l|       \^o050\f8wave 7 cleared!,pREPARE fOR wAVE 8",
   "...r.k.r..,.Kpap.papK,pr...a...rp,.Pkp.p.pkP,.k.p.p.p.k|s|       \^o050\f8wave 8 cleared!,pREPARE fOR wAVE 9",
   "P.p.pPp.p.P,p.Rp.K.pR.p,pKk.rEr.kKp,p..A.k.A..p,pRpKpEpKpRp|c|       \^o050\f8wave 9 cleared!,pREPARE fOR bOSS fIGHT!",
   ".....B.....|c| ",
}
*/

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

function buildSpawnQueue(waveDef) {
  const { entities, pattern } = waveDef;

  // Collect all non-empty cells as { eType, row, col }
  const positions = [];
  for (let row = 0; row < entities.length; row++) {
    for (let col = 0; col < entities[row].length; col++) {
      const char = entities[row][col];
      if (char !== '.') {
        positions.push({ eType: char, row, col });
      }
    }
  }

  // Sort by order type
  if (pattern.order === 'row_major') {
    positions.sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });
  }
  else if (pattern.order === 'col_major') {
    positions.sort((a, b) => {
      if (a.col !== b.col) return a.col - b.col;
      return a.row - b.row;
    });
  }
  else if (pattern.order === 'spiral') {
    // Sort by Manhattan distance from center (5, 2) for 11×5 grid
    const centerCol = 5;
    const centerRow = 2;
    positions.sort((a, b) => {
      const distA = Math.abs(a.col - centerCol) + Math.abs(a.row - centerRow);
      const distB = Math.abs(b.col - centerCol) + Math.abs(b.row - centerRow);
      return distA - distB;
    });
  }

  // Build spawn queue with entry styles and timers
  const queue = positions.map((pos, index) => {
    let style = pattern.entry;

    // Resolve alternating entry style to left/right based on column parity
    if (pattern.entry === 'alternating') {
      style = pos.col % 2 === 0 ? 'from_left' : 'from_right';
    }

    const spawnTimer = (pattern.base + index * pattern.inc) / 60;

    return {
      eType: pos.eType,
      row: pos.row,
      col: pos.col,
      style,
      spawnTimer
    };
  });

  return queue;
}

function spawnEnemy(queueEntry) {
  const { eType, row, col, style } = queueEntry;
  const startX = LEVEL_SIZE.x / 2 - GRID_WIDTH / 2;
  const startY = GRID_START_Y_OFFSET;
  const pos = vec2(startX + col * GRID_SPACING.x, startY - row * GRID_SPACING.y);

  const isElite = eType === eType.toUpperCase() && eType !== 'B' && eType !== 'E';

  let enemy;
  switch (eType.toLowerCase()) {
    case 'p':
    case 'e':
      enemy = new Shooter(pos, row, col, style, true, isElite);
      break;
    case 'k':
      enemy = new Diver(pos, row, col, style, true, isElite);
      break;
    case 'r':
      enemy = new Reflector(pos, row, col, style, true, isElite);
      break;
    case 'a':
      enemy = new Absorber(pos, row, col, style, true, isElite);
      break;
    case 'b':
      boss = new Boss(pos);
      return;
    case 'g':
      enemy = new Treasure(pos);
      break;
    default:
      enemy = new Shooter(pos, row, col, style, true, false);
      break;
  }

  if (enemy) {
    enemies.push(enemy);
  }
}

function processSpawnQueue(dt) {
  for (let i = spawnQueue.length - 1; i >= 0; i--) {
    const entry = spawnQueue[i];
    entry.spawnTimer -= dt;

    if (entry.spawnTimer <= 0) {
      spawnEnemy(entry);
      spawnQueue.splice(i, 1);
    }
  }
}
