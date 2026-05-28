/* eslint-disable no-undef, no-unused-vars */
function spawnHitParticles(ev) {
  switch (ev.kind) {
    case 'damaged':
      if (ev.reflected) {
        // Damage + reflected particles
      } else {
        // Damage particles
      }
      break;
    case 'killed':
      if (ev.reflected) {
        // Kill + reflected particles
      } else {
        // Kill particles (explosion)
      }
      break;
    case 'absorbed':
      // Absorption particles
      break;
  }
}
