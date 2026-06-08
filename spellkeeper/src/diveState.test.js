import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DIVE_CONFIG,
  advanceDiveState,
  createDiveState,
  deriveEffectiveReach,
  getShotTimeToGoal,
  isDiveActive,
  shouldTriggerDive,
  startDive,
} from './diveState.js';

describe('DiveState', () => {
  it('starts idle with the default tuning knobs exposed', () => {
    const state = createDiveState();

    expect(DEFAULT_DIVE_CONFIG.threatWindow).toBe(0.34);
    expect(DEFAULT_DIVE_CONFIG.triggerMarginScale).toBe(1.15);
    expect(DEFAULT_DIVE_CONFIG.reachBonusScale).toBe(0.22);
    expect(DEFAULT_DIVE_CONFIG.duration).toBe(0.28);
    expect(DEFAULT_DIVE_CONFIG.poseEasing).toEqual({
      windup: 0.16,
      commit: 0.52,
      recovery: 0.32,
    });

    expect(state.status).toBe('idle');
    expect(state.elapsed).toBe(0);
    expect(state.direction).toBeNull();
    expect(isDiveActive(state)).toBe(false);
  });

  it('derives effective reach from body dimensions', () => {
    const compactReach = deriveEffectiveReach({
      torso: { x: 0, y: -4 },
      shoulders: [{ x: -0.2, y: -3.8 }, { x: 0.2, y: -3.8 }],
      upperArmLength: 0.5,
      forearmLength: 0.5,
      handRadius: 0.2,
    });
    const broadReach = deriveEffectiveReach({
      torso: { x: 0, y: -4 },
      shoulders: [{ x: -0.6, y: -3.8 }, { x: 0.6, y: -3.8 }],
      upperArmLength: 0.7,
      forearmLength: 0.7,
      handRadius: 0.3,
    });

    expect(compactReach).toBeCloseTo(Math.hypot(0.2, 0.2) + 1.2);
    expect(broadReach).toBeGreaterThan(compactReach);
  });

  it('bases shot threat on remaining time to goal rather than raw progress', () => {
    const fastHalfwayShot = {
      elapsed: 0.45,
      spec: { duration: 0.7 },
      sample: { progress: 0.5 },
    };
    const slowHalfwayShot = {
      elapsed: 1.075,
      spec: { duration: 2.15 },
      sample: { progress: 0.5 },
    };

    expect(getShotTimeToGoal(fastHalfwayShot)).toBeCloseTo(0.25);
    expect(getShotTimeToGoal(slowHalfwayShot)).toBeCloseTo(1.075);
    expect(shouldTriggerDive({
      cursorTarget: { x: 2.4, y: 0 },
      origin: { x: 0, y: 0 },
      body: {
        torso: { x: 0, y: 0 },
        shoulders: [{ x: 0, y: 0 }],
        upperArmLength: 0.7,
        forearmLength: 0.7,
        handRadius: 0.2,
      },
      shot: fastHalfwayShot,
      config: { threatWindow: 0.34 },
    }).shouldTrigger).toBe(true);
    expect(shouldTriggerDive({
      cursorTarget: { x: 2.4, y: 0 },
      origin: { x: 0, y: 0 },
      body: {
        torso: { x: 0, y: 0 },
        shoulders: [{ x: 0, y: 0 }],
        upperArmLength: 0.7,
        forearmLength: 0.7,
        handRadius: 0.2,
      },
      shot: slowHalfwayShot,
      config: { threatWindow: 0.34 },
    }).shouldTrigger).toBe(false);
  });

  it('requires cursor strain and shot threat together before triggering', () => {
    const body = {
      torso: { x: 0, y: 0 },
      shoulders: [{ x: 0, y: 0 }],
      upperArmLength: 0.7,
      forearmLength: 0.7,
      handRadius: 0.2,
    };
    const threatShot = { elapsed: 0.98, spec: { duration: 1.3 } };
    const safeShot = { elapsed: 0.4, spec: { duration: 1.3 } };

    expect(shouldTriggerDive({
      cursorTarget: { x: 2.4, y: 0 },
      origin: body.torso,
      body,
      shot: safeShot,
    }).shouldTrigger).toBe(false);
    expect(shouldTriggerDive({
      cursorTarget: { x: 1.2, y: 0 },
      origin: body.torso,
      body,
      shot: threatShot,
    }).shouldTrigger).toBe(false);
    expect(shouldTriggerDive({
      cursorTarget: { x: 2.4, y: 0 },
      origin: body.torso,
      body,
      shot: threatShot,
    }).shouldTrigger).toBe(true);
  });

  it('locks direction from the cursor target at trigger time', () => {
    const idle = createDiveState();
    const dive = startDive(idle, {
      cursorTarget: { x: 3, y: 4 },
    });

    expect(dive.status).toBe('diving');
    expect(dive.direction.x).toBeCloseTo(0.6);
    expect(dive.direction.y).toBeCloseTo(0.8);
    expect(dive.triggerTarget).toEqual({ x: 3, y: 4 });
    expect(dive.triggerOrigin).toEqual({ x: 0, y: 0 });

    const advanced = advanceDiveState(dive, 0.1);
    expect(advanced.direction).toBe(dive.direction);
    expect(advanced.triggerTarget).toBe(dive.triggerTarget);
    expect(advanced.pose.phase).toBe('commit');
    expect(advanced.pose.progress).toBeGreaterThan(0);
  });

  it('stays expired after the fixed duration elapses', () => {
    const dive = startDive(createDiveState(), {
      cursorTarget: { x: -2, y: 0 },
    });
    const expired = advanceDiveState(dive, DEFAULT_DIVE_CONFIG.duration);
    const stillExpired = advanceDiveState(expired, 0.5);

    expect(expired.status).toBe('expired');
    expect(expired.elapsed).toBe(DEFAULT_DIVE_CONFIG.duration);
    expect(expired.pose.phase).toBe('expired');
    expect(isDiveActive(expired)).toBe(false);
    expect(stillExpired).toBe(expired);
  });

  it('keeps idle state untouched when advanced without an active dive', () => {
    const idle = createDiveState();
    const advanced = advanceDiveState(idle, 0.25);

    expect(advanced).toBe(idle);
    expect(advanced.pose.phase).toBe('idle');
  });
});
