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

// WAVE_DEFINITIONS, parseWaveDSL, and buildSpawnQueue are now in constants.js

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
