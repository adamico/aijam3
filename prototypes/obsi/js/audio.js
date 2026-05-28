/* eslint-disable no-undef, no-unused-vars */
function playHitSound(ev) {
  switch (ev.kind) {
    case 'damaged':
      if (ev.reflected) {
        // Damage + reflected sound
      } else {
        // Damage sound
      }
      break;
    case 'killed':
      if (ev.reflected) {
        // Kill + reflected sound
      } else {
        // Kill sound
      }
      break;
    case 'absorbed':
      // Absorption sound
      break;
  }
}
