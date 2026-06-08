import { describe, expect, it } from 'vitest';
import { createShot, SHOT_HEXES } from './shotTrajectory.js';
import { getRampShotConfig, getShotRampPlan } from './shotRamp.js';

const shotPhysics = {
  maxZ: 11,
  groundY: -5,
  radius: 0.45,
};

function targetDistanceFromCenter(config) {
  return Math.hypot(config.target.x, config.target.y - shotPhysics.groundY);
}

describe('shot difficulty ramp', () => {
  it('starts with legible shots near the keeper before reaching wide corners', () => {
    const plan = getShotRampPlan();
    const early = plan.slice(0, 3);
    const late = plan.slice(-3);

    expect(plan).toHaveLength(10);
    expect(early.every((shot) => targetDistanceFromCenter(shot) < 2.5)).toBe(true);
    expect(late.some((shot) => Math.abs(shot.target.x) >= 2.6)).toBe(true);
    expect(late.some((shot) => shot.target.y > -3.2)).toBe(true);
  });

  it('escalates from straight reads into faster and stranger hex behavior later', () => {
    const plan = getShotRampPlan();
    const firstHalf = plan.slice(0, 5);
    const secondHalf = plan.slice(5);

    expect(firstHalf.filter((shot) => shot.hex === 'standard')).toHaveLength(2);
    expect(secondHalf.filter((shot) => shot.hex === 'fireball')).toHaveLength(2);
    expect(secondHalf.some((shot) => shot.hex === 'curve' && shot.curveDirection === -1)).toBe(true);
    expect(secondHalf.some((shot) => Math.abs(shot.start.x - shot.target.x) > 5)).toBe(true);
  });

  it('keeps each hex variant on its fixed learned physics while the ramp changes placement', () => {
    for (const config of getShotRampPlan()) {
      const shot = createShot({ ...config, ...shotPhysics });

      expect(shot.spec).toBe(SHOT_HEXES[config.hex]);
      expect(shot.spec.duration).toBe(SHOT_HEXES[config.hex].duration);
      expect(shot.spec.curveAmplitude).toBe(SHOT_HEXES[config.hex].curveAmplitude);
      expect(shot.radius).toBeCloseTo(shotPhysics.radius * SHOT_HEXES[config.hex].radiusScale, 5);
    }
  });

  it('wraps by attempt index without exposing mutable plan state', () => {
    const first = getRampShotConfig(0);
    first.target.x = 99;

    expect(getRampShotConfig(0).target.x).not.toBe(99);
    expect(getRampShotConfig(10)).toEqual(getRampShotConfig(0));
    expect(() => getRampShotConfig(-1)).toThrow(/non-negative integer/);
  });
});
