import { clamp, vec2 } from 'littlejsengine';

const DEFAULT_EPSILON = 1e-6;

function segmentDistanceSquared(point, start, end) {
  const pointVector = vec2(point.x, point.y);
  const startVector = vec2(start.x, start.y);
  const segmentVector = vec2(end.x - start.x, end.y - start.y);
  const lengthSquared = segmentVector.lengthSquared();

  if (lengthSquared <= DEFAULT_EPSILON) {
    return pointVector.distanceSquared(startVector);
  }

  const t = clamp(pointVector.subtract(startVector).dot(segmentVector) / lengthSquared);
  const closest = startVector.add(segmentVector.scale(t));
  return pointVector.distanceSquared(closest);
}

function normalizeSegment(segment) {
  if (!segment) throw new Error('SaveResolver segment is required');
  if (!Number.isFinite(segment.radius) || segment.radius < 0) {
    throw new Error('SaveResolver segment radius must be a non-negative number');
  }

  if (segment.start && segment.end) return segment;
  if (segment.center) {
    return {
      ...segment,
      start: segment.center,
      end: segment.center,
    };
  }

  throw new Error('SaveResolver segment requires start/end or center');
}

export function segmentOverlapsBall(segment, ball, epsilon = DEFAULT_EPSILON) {
  if (!Number.isFinite(ball.radius) || ball.radius < 0) {
    throw new Error('SaveResolver ball radius must be a non-negative number');
  }

  const capsule = normalizeSegment(segment);
  const combinedRadius = capsule.radius + ball.radius;
  const distanceSquared = segmentDistanceSquared(ball, capsule.start, capsule.end);
  const threshold = combinedRadius + epsilon;

  return {
    overlaps: distanceSquared <= threshold * threshold,
    distance: Math.sqrt(distanceSquared),
    overlapDepth: combinedRadius - Math.sqrt(distanceSquared),
  };
}

export function resolveGoalPlaneSave({ ball, segments, epsilon = DEFAULT_EPSILON }) {
  if (!ball) throw new Error('SaveResolver ball is required');
  if (!Array.isArray(segments)) throw new Error('SaveResolver segments must be an array');

  for (const segment of segments) {
    const overlap = segmentOverlapsBall(segment, ball, epsilon);
    if (overlap.overlaps) {
      return {
        outcome: 'save',
        isSave: true,
        segmentId: segment.id,
        distance: overlap.distance,
        overlapDepth: overlap.overlapDepth,
      };
    }
  }

  return {
    outcome: 'conceded',
    isSave: false,
    segmentId: null,
    distance: null,
    overlapDepth: null,
  };
}

export function resolveCrossingSave({ previousZ, currentZ, ball, segments, epsilon = DEFAULT_EPSILON }) {
  const crossedGoalPlane = previousZ > epsilon && currentZ <= epsilon;

  if (!crossedGoalPlane) {
    return {
      outcome: 'in-flight',
      isSave: false,
      segmentId: null,
      crossedGoalPlane: false,
    };
  }

  return {
    ...resolveGoalPlaneSave({ ball, segments, epsilon }),
    crossedGoalPlane: true,
  };
}
