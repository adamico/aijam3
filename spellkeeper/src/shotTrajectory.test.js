import { describe, expect, it } from 'vitest';
import { createShot, sampleShot, sampleShotPath, SHOT_HEXES } from './shotTrajectory.js';

const shotConfig = {
  start: { x: -2, y: -4.4 },
  target: { x: 1.5, y: -3.2 },
  maxZ: 11,
  groundY: -5,
  radius: 0.45,
};

describe('shot trajectory', () => {
  it('samples deterministic positions for the same shot and elapsed time', () => {
    const shot = createShot({ ...shotConfig, hex: 'standard' });

    expect(sampleShot(shot, 0.75)).toEqual(sampleShot(shot, 0.75));
  });

  it('travels from camera depth to the goal plane with a readable arc', () => {
    const shot = createShot({ ...shotConfig, hex: 'standard' });
    const start = sampleShot(shot, 0);
    const mid = sampleShot(shot, SHOT_HEXES.standard.duration / 2);
    const end = sampleShot(shot, SHOT_HEXES.standard.duration);

    expect(start.z).toBeCloseTo(11, 5);
    expect(end.z).toBeCloseTo(0, 5);
    expect(mid.y).toBeGreaterThan(start.y);
    expect(mid.y).toBeGreaterThan(end.y);
    expect(end.isComplete).toBe(true);
  });

  it('keeps orthographic ball size constant and keeps a ground shadow under the ball', () => {
    const shot = createShot({ ...shotConfig, hex: 'standard' });
    const start = sampleShot(shot, 0);
    const end = sampleShot(shot, SHOT_HEXES.standard.duration);

    expect(end.scale).toBe(start.scale);
    expect(end.scale).toBe(1);
    expect(end.shadow.y).toBe(shotConfig.groundY);
    expect(end.shadow.scale).toBeLessThanOrEqual(start.shadow.scale);
    expect(end.shadow.opacity).toBeGreaterThan(0);
  });

  it('makes fixed hex types distinct and learnable', () => {
    const standard = createShot({ ...shotConfig, hex: 'standard' });
    const fireball = createShot({ ...shotConfig, hex: 'fireball' });
    const curve = createShot({ ...shotConfig, hex: 'curve' });
    const heavy = createShot({ ...shotConfig, hex: 'heavy' });

    const standardMid = sampleShot(standard, standard.spec.duration / 2);
    const curveMid = sampleShot(curve, curve.spec.duration / 2);

    expect(fireball.spec.duration).toBeLessThan(SHOT_HEXES.standard.duration);
    expect(heavy.spec.duration).toBeGreaterThan(SHOT_HEXES.standard.duration);
    expect(heavy.radius).toBeGreaterThan(fireball.radius);
    expect(curve.spec.color).not.toBe(standard.spec.color);
    expect(curveMid.x - standardMid.x).toBeGreaterThan(2);
  });

  it('samples a telegraph path from launch to landing for tutorial cues', () => {
    const shot = createShot({ ...shotConfig, hex: 'standard' });
    const path = sampleShotPath(shot, 4);

    expect(path).toHaveLength(5);
    expect(path[0].x).toBeCloseTo(shot.start.x, 5);
    expect(path[0].y).toBeCloseTo(shot.start.y, 5);
    expect(path.at(-1)?.x).toBeCloseTo(shot.target.x, 5);
    expect(path.at(-1)?.y).toBeCloseTo(shot.target.y, 5);
  });
});
