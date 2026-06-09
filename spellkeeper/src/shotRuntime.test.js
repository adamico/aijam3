import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SHOT_PLAN_SEED, createShotPlan } from './shotPlan.js';
import {
  advanceShotRuntime,
  createShotRuntime,
  getActiveShot,
  getFeedbackState,
  getShotPose,
  recordShotRuntimeOutcome,
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

  it('advances in flight without resolving before the goal plane crossing', () => {
    const shotPlan = createShotPlan(DEFAULT_SHOT_PLAN_SEED, { totalShots: 30 });
    const runtime = createShotRuntime({ shotPlan, shotDimensions, shotTiming });
    const resolveSave = vi.fn();

    const { runtime: advanced, events } = advanceShotRuntime(runtime, {
      dt: 0.1,
      saveSegments: [],
      resolveSave,
    });

    expect(events).toEqual([]);
    expect(resolveSave).not.toHaveBeenCalled();
    expect(advanced.activeShot.sample.progress).toBeGreaterThan(0);
    expect(advanced.activeShot.sample.isComplete).toBe(false);
  });

  it('emits a save resolution event through the injected resolver', () => {
    const shotPlan = createShotPlan(DEFAULT_SHOT_PLAN_SEED, { totalShots: 30 });
    const runtime = createShotRuntime({ shotPlan, shotDimensions, shotTiming });
    const resolveSave = vi.fn(() => ({
      outcome: 'save',
      isSave: true,
      segmentId: 'rightHand',
      distance: 0.5,
      overlapDepth: 0.2,
      crossedGoalPlane: true,
    }));

    const { runtime: advanced, events } = advanceShotRuntime(runtime, {
      dt: 999,
      saveSegments: [{ id: 'rightHand', center: { x: 0, y: 0 }, radius: 0.3 }],
      resolveSave,
    });

    expect(resolveSave).toHaveBeenCalledWith({
      previousZ: 11,
      currentZ: 0,
      ball: expect.objectContaining({ radius: expect.any(Number) }),
      segments: [{ id: 'rightHand', center: { x: 0, y: 0 }, radius: 0.3 }],
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'shot-resolved',
      result: {
        outcome: 'save',
        isSave: true,
        segmentId: 'rightHand',
      },
    });
    expect(advanced.feedback.lastResult).toMatchObject({ outcome: 'save' });
    expect(advanced.respawnTimer).toBeCloseTo(0.35);
    expect(advanced.activeShot.sample.saveResult).toMatchObject({ outcome: 'save' });
  });

  it('emits a conceded resolution event when the resolver reports a miss', () => {
    const shotPlan = createShotPlan(DEFAULT_SHOT_PLAN_SEED, { totalShots: 30 });
    const runtime = createShotRuntime({ shotPlan, shotDimensions, shotTiming });
    const resolveSave = vi.fn(() => ({
      outcome: 'conceded',
      isSave: false,
      segmentId: null,
      distance: null,
      overlapDepth: null,
      crossedGoalPlane: true,
    }));

    const { runtime: advanced, events } = advanceShotRuntime(runtime, {
      dt: 999,
      saveSegments: [],
      resolveSave,
    });

    expect(events).toHaveLength(1);
    expect(events[0].result).toMatchObject({
      outcome: 'conceded',
      isSave: false,
      segmentId: null,
    });
    expect(advanced.feedback.lastResult).toMatchObject({ outcome: 'conceded' });
    expect(advanced.activeShot.sample.saveResult).toMatchObject({ outcome: 'conceded' });
  });

  it('keeps feedback alive for the configured duration and respawns after the delay', () => {
    const shotPlan = createShotPlan(DEFAULT_SHOT_PLAN_SEED, { totalShots: 30 });
    const runtime = createShotRuntime({ shotPlan, shotDimensions, shotTiming });
    const resolveSave = vi.fn(() => ({
      outcome: 'save',
      isSave: true,
      segmentId: 'rightHand',
      distance: 0.5,
      overlapDepth: 0.2,
      crossedGoalPlane: true,
    }));

    const resolved = advanceShotRuntime(runtime, {
      dt: 999,
      saveSegments: [{ id: 'rightHand', center: { x: 0, y: 0 }, radius: 0.3 }],
      resolveSave,
    }).runtime;
    const queued = recordShotRuntimeOutcome(resolved, {
      nextShotIndex: 1,
      matchComplete: false,
    });

    const beforeRespawn = advanceShotRuntime(queued, { dt: 0.34 }).runtime;
    const respawned = advanceShotRuntime(beforeRespawn, { dt: 0.01 }).runtime;
    const feedbackExpired = advanceShotRuntime(respawned, { dt: 0.55 }).runtime;

    expect(beforeRespawn.respawnTimer).toBeCloseTo(0.01, 2);
    expect(beforeRespawn.feedback.timer).toBeCloseTo(0.56, 2);
    expect(respawned.activeShotIndex).toBe(1);
    expect(respawned.feedback.timer).toBeGreaterThan(0);
    expect(feedbackExpired.feedback.timer).toBe(0);
    expect(feedbackExpired.activeShotIndex).toBe(1);
  });

  it('does not respawn after orchestration marks the match complete', () => {
    const shotPlan = createShotPlan(DEFAULT_SHOT_PLAN_SEED, { totalShots: 30 });
    const runtime = createShotRuntime({ shotPlan, shotDimensions, shotTiming });
    const resolveSave = vi.fn(() => ({
      outcome: 'conceded',
      isSave: false,
      segmentId: null,
      distance: null,
      overlapDepth: null,
      crossedGoalPlane: true,
    }));

    const resolved = advanceShotRuntime(runtime, {
      dt: 999,
      saveSegments: [],
      resolveSave,
    }).runtime;
    const completed = recordShotRuntimeOutcome(resolved, {
      nextShotIndex: 1,
      matchComplete: true,
    });
    const advanced = advanceShotRuntime(completed, { dt: 10 }).runtime;

    expect(advanced.matchComplete).toBe(true);
    expect(advanced.shotResolved).toBe(true);
    expect(advanced.respawnTimer).toBe(0);
    expect(advanced.activeShotIndex).toBe(0);
    expect(advanced.feedback.timer).toBe(0);
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
