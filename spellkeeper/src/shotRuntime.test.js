import { describe, expect, it } from 'vitest';
import { DEFAULT_SHOT_PLAN_SEED, createShotPlan } from './shotPlan.js';
import {
  createShotRuntime,
  getActiveShot,
  getFeedbackState,
  getShotPose,
} from './shotRuntime.js';

const shotDimensions = {
  maxZ: 11,
  groundY: -5,
  radius: 0.45,
};

const shotTiming = {
  respawnDelay: 0.35,
  feedbackDuration: 0.9,
};

describe('shot runtime', () => {
  it('creates a runtime with the first shot spawned immediately', () => {
    const shotPlan = createShotPlan(DEFAULT_SHOT_PLAN_SEED, { totalShots: 30 });
    const runtime = createShotRuntime({ shotPlan, shotDimensions, shotTiming });

    expect(getActiveShot(runtime)?.shot.hex).toBe(shotPlan[0].shot.hex);
    expect(getActiveShot(runtime)?.shot.start).toEqual(shotPlan[0].shot.start);
    expect(getShotPose(runtime)?.hex).toBe(shotPlan[0].shot.hex);
    expect(getShotPose(runtime)?.x).toBeCloseTo(shotPlan[0].shot.start.x, 5);
    expect(getShotPose(runtime)?.y).toBeCloseTo(shotPlan[0].shot.start.y, 5);
  });

  it('keeps read helpers detached from the internal runtime shape', () => {
    const shotPlan = createShotPlan(DEFAULT_SHOT_PLAN_SEED, { totalShots: 30 });
    const runtime = createShotRuntime({ shotPlan, shotDimensions, shotTiming });

    const activeShot = getActiveShot(runtime);
    const shotPose = getShotPose(runtime);
    const feedback = getFeedbackState(runtime);

    activeShot.shot.start.x = 999;
    shotPose.shadow.scale = 999;
    feedback.timer = 999;

    expect(getActiveShot(runtime)?.shot.start.x).not.toBe(999);
    expect(getShotPose(runtime)?.shadow.scale).not.toBe(999);
    expect(getFeedbackState(runtime)?.timer).toBe(0);
  });

  it('rejects missing or empty Shot Plans at creation time', () => {
    expect(() => createShotRuntime({ shotDimensions, shotTiming })).toThrow(
      'Shot runtime requires a non-empty Shot Plan',
    );
    expect(() => createShotRuntime({ shotPlan: [], shotDimensions, shotTiming })).toThrow(
      'Shot runtime requires a non-empty Shot Plan',
    );
  });
});
