import { describe, expect, it } from 'vitest';
import { solveTorsoDrag } from './bodyRig.js';

const shoulders = [
  { x: -0.3, y: 0.2 },
  { x: 0.3, y: 0.2 },
];

const baseRig = {
  torso: { x: 0, y: -4 },
  shoulders,
  maxReach: 1.1,
  maxSpeed: 2,
  dt: 0.25,
};

describe('solveTorsoDrag', () => {
  it('keeps the torso planted while the target is inside the shared arm reach', () => {
    const pose = solveTorsoDrag({
      ...baseRig,
      target: { x: 0, y: -3.4 },
    });

    expect(pose.torso.x).toBeCloseTo(0, 5);
    expect(pose.desiredTorso.x).toBeCloseTo(0, 5);
    expect(pose.isTargetReachableAtCurrent).toBe(true);
    expect(pose.isDragging).toBe(false);
  });

  it('drags the torso when the pointer exceeds reach', () => {
    const pose = solveTorsoDrag({
      ...baseRig,
      target: { x: 2.2, y: -3.8 },
    });

    expect(pose.isTargetReachableAtCurrent).toBe(false);
    expect(pose.isDragging).toBe(true);
    expect(pose.desiredTorso.x).toBeGreaterThan(0);
    expect(pose.torso.x).toBeGreaterThan(0);
  });

  it('limits drag velocity so the body does not teleport to the target', () => {
    const pose = solveTorsoDrag({
      ...baseRig,
      target: { x: 5, y: -3.8 },
    });

    expect(pose.torso.x).toBeCloseTo(baseRig.maxSpeed * baseRig.dt, 5);
    expect(Math.abs(pose.velocity.x)).toBeLessThanOrEqual(baseRig.maxSpeed);
    expect(pose.torso.x).toBeLessThan(pose.desiredTorso.x);
  });
});
