const DEFAULT_EPSILON = 1e-6;

function normalize(vector, fallback = { x: 1, y: 0 }, epsilon = DEFAULT_EPSILON) {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= epsilon) return { x: fallback.x, y: fallback.y };
  return { x: vector.x / length, y: vector.y / length };
}

function signedAngle(vector) {
  return Math.atan2(vector.y, vector.x);
}

/**
 * Solve a stable two-bone 2D IK chain using the law of cosines.
 *
 * `target` is used as the hand position while reachable. If the target exceeds
 * max reach, the hand is clamped to full extension along the shoulder->target
 * ray. Degenerate targets fall back to a deterministic facing direction so the
 * output never contains NaN/Infinity.
 */
export function solveIkChain({
  shoulder,
  target,
  upperLength,
  lowerLength,
  elbowSign = 1,
  fallbackDirection = { x: 1, y: 0 },
  epsilon = DEFAULT_EPSILON,
}) {
  if (upperLength < 0 || lowerLength < 0) {
    throw new Error('IK segment lengths must be non-negative');
  }

  const maxReach = upperLength + lowerLength;
  const requested = { x: target.x - shoulder.x, y: target.y - shoulder.y };
  const requestedDistance = Math.hypot(requested.x, requested.y);
  const direction = normalize(requested, fallbackDirection, epsilon);
  const solveDistance = Math.min(requestedDistance, maxReach);
  const handDistance = maxReach <= epsilon ? 0 : solveDistance;
  const hand = {
    x: shoulder.x + direction.x * handDistance,
    y: shoulder.y + direction.y * handDistance,
  };

  if (upperLength <= epsilon) {
    return {
      shoulder: { ...shoulder },
      elbow: { ...shoulder },
      hand,
      requestedTarget: { ...target },
      clampedTarget: hand,
      requestedDistance,
      maxReach,
      isClamped: requestedDistance > maxReach + epsilon,
      angles: {
        upper: signedAngle({ x: hand.x - shoulder.x, y: hand.y - shoulder.y }),
        lower: signedAngle({ x: hand.x - shoulder.x, y: hand.y - shoulder.y }),
      },
    };
  }

  const safeDistance = Math.max(handDistance, epsilon);
  const cosShoulder = Math.clamp(
    (upperLength ** 2 + safeDistance ** 2 - lowerLength ** 2) / (2 * upperLength * safeDistance),
    -1,
    1,
  );
  const adjacent = upperLength * cosShoulder;
  const opposite = Math.sqrt(Math.max(0, upperLength ** 2 - adjacent ** 2)) * Math.sign(elbowSign || 1);
  const perp = { x: -direction.y, y: direction.x };
  const elbow = {
    x: shoulder.x + direction.x * adjacent + perp.x * opposite,
    y: shoulder.y + direction.y * adjacent + perp.y * opposite,
  };

  return {
    shoulder: { ...shoulder },
    elbow,
    hand,
    requestedTarget: { ...target },
    clampedTarget: hand,
    requestedDistance,
    maxReach,
    isClamped: requestedDistance > maxReach + epsilon,
    angles: {
      upper: signedAngle({ x: elbow.x - shoulder.x, y: elbow.y - shoulder.y }),
      lower: signedAngle({ x: hand.x - elbow.x, y: hand.y - elbow.y }),
    },
  };
}
