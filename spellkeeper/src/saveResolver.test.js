import { describe, expect, it } from 'vitest';
import { resolveCrossingSave, resolveGoalPlaneSave, segmentOverlapsBall } from './saveResolver.js';

const glove = {
  id: 'rightHand',
  center: { x: 1, y: -3.5 },
  radius: 0.3,
};
const arm = {
  id: 'rightForearm',
  start: { x: 0, y: -4 },
  end: { x: 2, y: -4 },
  radius: 0.15,
};

describe('SaveResolver', () => {
  it('registers a save when any body segment overlaps the ball at the crossing frame', () => {
    const result = resolveCrossingSave({
      previousZ: 0.2,
      currentZ: 0,
      ball: { x: 1.2, y: -3.5, radius: 0.45 },
      segments: [glove],
    });

    expect(result.crossedGoalPlane).toBe(true);
    expect(result.outcome).toBe('save');
    expect(result.isSave).toBe(true);
    expect(result.segmentId).toBe('rightHand');
  });

  it('counts a goal-plane crossing as conceded when all body segments miss', () => {
    const result = resolveCrossingSave({
      previousZ: 0.2,
      currentZ: 0,
      ball: { x: -2, y: -2, radius: 0.45 },
      segments: [glove, arm],
    });

    expect(result.crossedGoalPlane).toBe(true);
    expect(result.outcome).toBe('conceded');
    expect(result.isSave).toBe(false);
    expect(result.segmentId).toBeNull();
  });

  it('does not resolve shots that have not crossed the goal plane yet', () => {
    const result = resolveCrossingSave({
      previousZ: 0.8,
      currentZ: 0.4,
      ball: { x: 1, y: -3.5, radius: 0.45 },
      segments: [glove],
    });

    expect(result.crossedGoalPlane).toBe(false);
    expect(result.outcome).toBe('in-flight');
  });

  it('treats tangent boundary contact as a deterministic save', () => {
    const ball = { x: 1.75, y: -3.5, radius: 0.45 };
    const result = resolveGoalPlaneSave({ ball, segments: [glove] });
    const overlap = segmentOverlapsBall(glove, ball);

    expect(overlap.distance).toBeCloseTo(0.75, 5);
    expect(overlap.overlaps).toBe(true);
    expect(result.outcome).toBe('save');
  });

  it('uses capsule distance for arm and torso/body segment overlap', () => {
    const result = resolveGoalPlaneSave({
      ball: { x: 1, y: -4.55, radius: 0.4 },
      segments: [arm],
    });

    expect(result.outcome).toBe('save');
    expect(result.segmentId).toBe('rightForearm');
  });
});
