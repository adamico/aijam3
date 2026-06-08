const DEFAULT_EPSILON = 1e-6;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function clampStep(current, target, maxDelta) {
  const delta = target - current;
  if (Math.abs(delta) <= maxDelta) return target;
  return current + Math.sign(delta) * maxDelta;
}

/**
 * Keep the torso planted while the target is reachable from every shoulder.
 * When the target leaves that shared reach envelope, slide the torso along the
 * goal line (x axis only) toward the nearest reachable x position, capped by a
 * velocity limit so the body reads as heavy instead of teleporting.
 */
export function solveTorsoDrag({
  torso,
  target,
  shoulders,
  maxReach,
  maxSpeed,
  dt,
  epsilon = DEFAULT_EPSILON,
}) {
  if (maxReach < 0) throw new Error('Torso drag reach must be non-negative');
  if (maxSpeed < 0) throw new Error('Torso drag speed must be non-negative');
  if (dt < 0) throw new Error('Torso drag dt must be non-negative');
  if (!shoulders?.length) throw new Error('Torso drag requires at least one shoulder');

  let reachableMin = -Infinity;
  let reachableMax = Infinity;
  let isTargetReachableAtCurrent = true;

  for (const shoulder of shoulders) {
    const shoulderY = torso.y + shoulder.y;
    const dy = target.y - shoulderY;
    const horizontalReach = Math.sqrt(Math.max(0, maxReach ** 2 - dy ** 2));
    const shoulderXAtCurrent = torso.x + shoulder.x;
    const distanceAtCurrent = Math.hypot(target.x - shoulderXAtCurrent, dy);

    if (distanceAtCurrent > maxReach + epsilon) {
      isTargetReachableAtCurrent = false;
    }

    reachableMin = Math.max(reachableMin, target.x - shoulder.x - horizontalReach);
    reachableMax = Math.min(reachableMax, target.x - shoulder.x + horizontalReach);
  }

  const desiredTorsoX = reachableMin <= reachableMax
    ? clamp(torso.x, reachableMin, reachableMax)
    : (reachableMin + reachableMax) / 2;
  const maxDelta = maxSpeed * dt;
  const nextTorsoX = clampStep(torso.x, desiredTorsoX, maxDelta);
  const velocityX = dt <= epsilon ? 0 : (nextTorsoX - torso.x) / dt;

  return {
    torso: { x: nextTorsoX, y: torso.y },
    desiredTorso: { x: desiredTorsoX, y: torso.y },
    reachableRange: { min: reachableMin, max: reachableMax },
    isTargetReachableAtCurrent,
    isDragging: Math.abs(desiredTorsoX - torso.x) > epsilon,
    velocity: { x: velocityX, y: 0 },
  };
}
