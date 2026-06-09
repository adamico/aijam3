import { describe, expect, it } from 'vitest';
import { DEFAULT_SHOT_PLAN_SEED, createShotPlan } from './shotPlan.js';

describe('shot plan generator', () => {
  it('creates the same 30-shot plan for the same seed', () => {
    const first = createShotPlan(DEFAULT_SHOT_PLAN_SEED);
    const second = createShotPlan(DEFAULT_SHOT_PLAN_SEED);

    expect(first).toHaveLength(30);
    expect(second).toHaveLength(30);
    expect(first).toEqual(second);
    expect(first.map((entry) => entry.index)).toEqual(Array.from({ length: 30 }, (_, index) => index));
  });

  it('keeps the first three opener shots fixed while different seeds diverge later', () => {
    const alpha = createShotPlan('alpha-seed');
    const beta = createShotPlan('beta-seed');

    expect(alpha.slice(0, 3)).toEqual(beta.slice(0, 3));
    expect(alpha).not.toEqual(beta);
    expect(alpha[0].designer.opener).toBe(true);
    expect(alpha[1].designer.opener).toBe(true);
    expect(alpha[2].designer.opener).toBe(true);
    expect(alpha[3].designer.opener).toBe(false);
  });

  it('attaches readable designer metadata and gameplay config to every shot', () => {
    const plan = createShotPlan('metadata-seed');

    for (const entry of plan) {
      expect(entry.shot.hex).toBeTypeOf('string');
      expect(entry.shot.originLane).toBeTypeOf('string');
      expect(entry.shot.targetLane).toBeTypeOf('string');
      expect(entry.shot.placementHeight).toBeTypeOf('string');
      expect(entry.shot.start).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
      expect(entry.shot.target).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
      expect(entry.shot.target.x).toBeGreaterThanOrEqual(-3.05);
      expect(entry.shot.target.x).toBeLessThanOrEqual(3.05);
      expect(entry.shot.target.y).toBeGreaterThanOrEqual(-4.85);
      expect(entry.shot.target.y).toBeLessThanOrEqual(-2.7);
      expect(entry.designer).toEqual(
        expect.objectContaining({
          label: expect.any(String),
          difficultyBand: expect.any(String),
          pressureTags: expect.any(Array),
          opener: expect.any(Boolean),
          originLane: expect.any(String),
          targetLane: expect.any(String),
          placementHeight: expect.any(String),
        }),
      );
    }

    expect(plan[0].designer.difficultyBand).toBe('opener');
    expect(plan[0].designer.label).toBe('straight warmup');
    expect(plan[5].designer.pressureTags.length).toBeGreaterThan(0);
    expect(new Set(plan.map((entry) => entry.designer.difficultyBand)).size).toBeGreaterThan(1);
  });

  it('includes every current hex and keeps heavy shots low and extreme-side', () => {
    const plan = createShotPlan('hex-coverage-seed');
    const hexes = new Set(plan.map((entry) => entry.shot.hex));

    expect(hexes).toEqual(new Set(['standard', 'curve', 'fireball', 'heavy']));

    for (const entry of plan.filter((shot) => shot.shot.hex === 'heavy')) {
      expect(entry.shot.originLane).toBe(entry.shot.targetLane);
      expect(entry.shot.placementHeight).toBe('low');
      expect(entry.shot.start.x).toBeCloseTo(entry.shot.target.x, 10);
      expect(['outer-left', 'outer-right']).toContain(entry.shot.targetLane);
    }
  });

  it('rejects invalid generation inputs predictably', () => {
    expect(() => createShotPlan(null)).toThrow(/seed/);
    expect(() => createShotPlan('seed', { totalShots: 2 })).toThrow(/at least 3/);
    expect(() => createShotPlan('seed', { totalShots: 30.5 })).toThrow(/integer/);
  });
});
