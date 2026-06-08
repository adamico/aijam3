import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DIVE_CONFIG,
  advanceDiveState,
  createDiveState,
  isDiveActive,
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
