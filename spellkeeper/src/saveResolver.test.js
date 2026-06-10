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
  it('registers a saved outcome when both gloves overlap the ball at the crossing frame', () => {
    const result = resolveCrossingSave({
      previousZ: 0.2,
      currentZ: 0,
      ball: { x: 1.2, y: -3.5, radius: 0.45 },
      segments: [glove, { ...glove, id: 'leftHand', center: { x: 0.8, y: -3.5 } }, arm],
    });

    expect(result.crossedGoalPlane).toBe(true);
    expect(result.outcome).toBe('saved');
    expect(result.saveQuality).toBe('clean-save');
    expect(result.isSave).toBe(true);
    expect(result.scoreDelta).toBe(100);
    expect(result.segmentId).toBe('rightHand');
    expect(result.contactSegments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'rightHand', segmentType: 'glove', isGlove: true }),
        expect.objectContaining({ id: 'leftHand', segmentType: 'glove', isGlove: true }),
      ]),
    );
  });

  it('counts a goal-plane crossing as deflected when a single glove contacts the ball', () => {
    const result = resolveCrossingSave({
      previousZ: 0.2,
      currentZ: 0,
      ball: { x: 1.2, y: -3.5, radius: 0.45 },
      segments: [glove, arm],
    });

    expect(result.crossedGoalPlane).toBe(true);
    expect(result.outcome).toBe('deflected');
    expect(result.saveQuality).toBe('deflection');
    expect(result.isSave).toBe(false);
    expect(result.scoreDelta).toBe(25);
    expect(result.segmentId).toBe('rightHand');
    expect(result.contactSegments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'rightHand', segmentType: 'glove', isGlove: true }),
        expect.objectContaining({ id: 'rightForearm', segmentType: 'body', isGlove: false }),
      ]),
    );
  });

  it('counts a goal-plane crossing as conceded when all body segments miss', () => {
    const result = resolveCrossingSave({
      previousZ: 0.2,
      currentZ: 0,
      ball: { x: -2, y: -2, radius: 0.45 },
      segments: [{ ...glove, center: { x: 1, y: -3.5 } }, { ...arm, start: { x: 0, y: -4 }, end: { x: 2, y: -4 } }],
    });

    expect(result.crossedGoalPlane).toBe(true);
    expect(result.outcome).toBe('conceded');
    expect(result.saveQuality).toBe('concession');
    expect(result.isSave).toBe(false);
    expect(result.scoreDelta).toBe(0);
    expect(result.segmentId).toBeNull();
    expect(result.contactSegments).toEqual([]);
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
    expect(result.saveQuality).toBe('in-flight');
    expect(result.scoreDelta).toBe(0);
    expect(result.contactSegments).toEqual([]);
  });

  it('treats tangent boundary contact as a deterministic deflection', () => {
    const ball = { x: 1.75, y: -3.5, radius: 0.45 };
    const result = resolveGoalPlaneSave({ ball, segments: [glove] });
    const overlap = segmentOverlapsBall(glove, ball);

    expect(overlap.distance).toBeCloseTo(0.75, 5);
    expect(overlap.overlaps).toBe(true);
    expect(result.outcome).toBe('deflected');
    expect(result.saveQuality).toBe('deflection');
  });

  it('uses capsule distance for arm and torso/body segment overlap', () => {
    const result = resolveGoalPlaneSave({
      ball: { x: 1, y: -4.55, radius: 0.4 },
      segments: [arm],
    });

    expect(result.outcome).toBe('deflected');
    expect(result.segmentId).toBe('rightForearm');
  });

  it('keeps lower-limb contacts tagged as deflections', () => {
    const foot = {
      id: 'leftFoot',
      type: 'deflection',
      center: { x: 0, y: -5.1 },
      radius: 0.18,
    };

    const result = resolveGoalPlaneSave({
      ball: { x: 0.05, y: -5.1, radius: 0.4 },
      segments: [foot],
    });

    expect(result.outcome).toBe('deflected');
    expect(result.segmentId).toBe('leftFoot');
    expect(result.contactSegments).toEqual([
      expect.objectContaining({ id: 'leftFoot', segmentType: 'deflection', isGlove: false }),
    ]);
  });
});
