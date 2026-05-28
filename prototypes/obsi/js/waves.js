/* eslint-disable no-undef, no-unused-vars */

const WAVE_DEFINITIONS = [
  // Wave 1: Introduction - simple shooters
  "p.p.p.p.p,p.p.p.p.p,p.p.p.p.p,...........,..........|c|Wave 1 cleared!,Prepare for wave 2",
  ".p.p.p.p.,p.p.p.p.p,p.p.p.p.p,...........,..........|c|Wave 2 cleared!,Prepare for wave 3",

  // Wave 3: Introduction to divers
  "..p.p.p..,p.p.p.p.p,...........,...........,..........|c|Wave 3 cleared!,Prepare for wave 4",
  "p.k.k.k.p,k.k.k.k.k,p.k.k.k.p,...........,..........|c|Wave 4 cleared!,Prepare for wave 5",

  // Wave 5: Reflectors introduced
  "r...r...r,r...r...r,...........,...........,..........|c|Wave 5 cleared!,Prepare for wave 6",
  "p.r.p.r.p,r.p.r.p.r,p.r.p.r.p,...........,..........|c|Wave 6 cleared!,Prepare for wave 7",

  // Wave 7: Absorbers and mix
  "a...a...a,a...a...a,...........,...........,..........|c|Wave 7 cleared!,Prepare for wave 8",
  "p.k.r.a.p,k.r.a.p.k,r.a.p.k.r,...........,..........|l|Wave 8 cleared!,Prepare for wave 9",

  // Wave 9: Elite variants challenge
  "P.K.R.A.P,K.R.A.P.K,R.A.P.K.R,...........,..........|c|Wave 9 cleared!,Prepare for boss",

  // Wave 10: Boss wave
  "....B....,.........,.........,.........,.........|c|Boss defeated!,Cycle complete"
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
  const entities = rows.map(row => row.split(''));

  // Validate grid dimensions
  for (let i = 0; i < entities.length; i++) {
    if (entities[i].length !== 11) {
      throw new Error(`Invalid grid row ${i}: expected 11 chars, got ${entities[i].length}`);
    }
  }

  // Parse messages
  const msgs = msgPair.split(',');
  if (msgs.length !== 2) {
    throw new Error(`Invalid message pair: expected 2 comma-separated messages, got ${msgs.length}`);
  }
  const cleared = msgs[0].trim();
  const prepare = msgs[1].trim();

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
