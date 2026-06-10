import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SHOT_PLAN_SEED,
  PHASE_LAYOUTS,
  createCalibrationShotChain,
  createShotPlan,
  getCandidateSelectionWeight,
  pickSetpieceEntries,
  resolveSetpieceSlot,
} from './shotPlan.js';
import { SETPIECE_LIBRARY } from './setpieces.js';

describe('shot plan generator', () => {
  it('uses the authored phase pacing templates for each act', () => {
    expect(PHASE_LAYOUTS.readable).toEqual(['isolated', 'isolated', 'setpiece', 'isolated', 'setpiece', 'isolated']);
    expect(PHASE_LAYOUTS.mixed).toEqual(['isolated', 'setpiece', 'isolated', 'setpiece', 'isolated', 'isolated']);
    expect(PHASE_LAYOUTS.chaos).toEqual(['setpiece', 'isolated', 'setpiece', 'isolated', 'setpiece']);
  });

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

    expect(alpha.slice(0, 3).map((entry) => entry.shot)).toEqual(beta.slice(0, 3).map((entry) => entry.shot));
    expect(alpha.slice(0, 3).map((entry) => entry.designer.label)).toEqual(beta.slice(0, 3).map((entry) => entry.designer.label));
    expect(alpha).not.toEqual(beta);
    expect(alpha[0].designer.opener).toBe(true);
    expect(alpha[1].designer.opener).toBe(true);
    expect(alpha[2].designer.opener).toBe(true);
    expect(alpha[3].designer.opener).toBe(false);
  });

  it('attaches readable designer metadata and gameplay config to every shot', () => {
    const plan = createShotPlan('metadata-seed');
    const difficultyBands = new Set(plan.map((entry) => entry.designer.difficultyBand));

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
          intendedFailureMode: expect.any(String),
          planId: expect.any(String),
          opener: expect.any(Boolean),
          originLane: expect.any(String),
          targetLane: expect.any(String),
          placementHeight: expect.any(String),
        }),
      );
    }

    expect(new Set(plan.map((entry) => entry.designer.planId)).size).toBe(1);
    expect(plan[0].designer.difficultyBand).toBe('opener');
    expect(plan[0].designer.label).toBe('straight warmup');
    expect(plan[5].designer.pressureTags.length).toBeGreaterThan(0);
    expect(plan[5].designer.intendedFailureMode).toBeTypeOf('string');
    expect(difficultyBands).toEqual(new Set(['opener', 'readable variety', 'mixed pressure', 'chaos-but-fair']));
    expect(plan.slice(3, 12).every((entry) => entry.designer.difficultyBand === 'readable variety')).toBe(true);
    expect(plan.slice(12, 21).every((entry) => entry.designer.difficultyBand === 'mixed pressure')).toBe(true);
    expect(plan.slice(21).every((entry) => entry.designer.difficultyBand === 'chaos-but-fair')).toBe(true);
  });

  it('creates the authored calibration chain with the intended sequence pressure families', () => {
    const chain = createCalibrationShotChain();

    expect(chain).toHaveLength(30);
    expect(chain.map((entry) => entry.index)).toEqual(Array.from({ length: 30 }, (_, index) => index));
    expect(chain[0].designer.difficultyBand).toBe('opener');
    expect(chain[0].designer.intendedFailureMode).toBe('setup');
    expect(chain[0].designer.pressureTags).toEqual(expect.arrayContaining(['readable', 'warmup']));
    expect(chain.some((entry) => entry.designer.pressureTags.includes('heavy-bait'))).toBe(true);
    expect(chain.some((entry) => entry.designer.pressureTags.includes('curve-bait'))).toBe(true);
    expect(chain.some((entry) => entry.designer.pressureTags.includes('high-low'))).toBe(true);
    expect(chain.some((entry) => entry.designer.pressureTags.includes('same-side'))).toBe(true);
    expect(chain.some((entry) => entry.designer.intendedFailureMode === 'opposite-side-punish')).toBe(true);
    expect(chain.slice(0, 3).every((entry) => entry.designer.difficultyBand === 'opener')).toBe(true);
    expect(chain.slice(3, 12).every((entry) => entry.designer.difficultyBand === 'readable variety')).toBe(true);
    expect(chain.slice(12, 21).every((entry) => entry.designer.difficultyBand === 'mixed pressure')).toBe(true);
    expect(chain.slice(21).every((entry) => entry.designer.difficultyBand === 'chaos-but-fair')).toBe(true);
  });

  it('keeps fireballs fair in readable and mixed acts while allowing a high-corner finale', () => {
    const plan = createShotPlan('fireball-fairness-seed');
    const readableFireballs = plan.filter((entry) => entry.designer.difficultyBand === 'readable variety' && entry.shot.hex === 'fireball');
    const mixedFireballs = plan.filter((entry) => entry.designer.difficultyBand === 'mixed pressure' && entry.shot.hex === 'fireball');
    const chaosFireballs = plan.filter((entry) => entry.designer.difficultyBand === 'chaos-but-fair' && entry.shot.hex === 'fireball');

    for (const entry of readableFireballs) {
      expect(entry.shot.placementHeight).not.toBe('high');
      expect(['outer-left', 'outer-right']).not.toContain(entry.shot.originLane);
      expect(['outer-left', 'outer-right']).not.toContain(entry.shot.targetLane);
    }

    for (const entry of mixedFireballs.filter((shot) => shot.designer.intendedFailureMode === 'read-check')) {
      expect(entry.shot.placementHeight).toBe('high');
      expect(entry.shot.originLane).toBe('center');
      expect(entry.shot.targetLane).toBe('center');
    }

    const finale = chaosFireballs.at(-1);
    expect(finale).toBeDefined();
    expect(finale.shot.placementHeight).toBe('high');
    expect(['outer-left', 'outer-right']).toContain(finale.shot.originLane);
    expect(['outer-left', 'outer-right']).toContain(finale.shot.targetLane);
  });

  it('avoids back-to-back repeated hexes, lanes, and shot signatures', () => {
    const plan = createShotPlan('anti-repeat-seed');

    for (let index = 2; index < plan.length; index += 1) {
      const current = plan[index];
      const previous = plan[index - 1];
      const beforePrevious = plan[index - 2];

      expect(current.shot.hex === previous.shot.hex && previous.shot.hex === beforePrevious.shot.hex).toBe(false);
      expect(current.shot.targetLane === previous.shot.targetLane && previous.shot.targetLane === beforePrevious.shot.targetLane).toBe(false);
    }

    for (let index = 1; index < plan.length; index += 1) {
      const current = plan[index];
      const previous = plan[index - 1];
      expect([
        current.shot.hex,
        current.shot.originLane,
        current.shot.targetLane,
        current.shot.placementHeight,
      ]).not.toEqual([
        previous.shot.hex,
        previous.shot.originLane,
        previous.shot.targetLane,
        previous.shot.placementHeight,
      ]);
    }
  });

  it('includes every current hex and keeps heavy shots low and extreme-side', () => {
    const plan = createShotPlan('hex-coverage-seed');
    const hexes = new Set(plan.map((entry) => entry.shot.hex));

    expect(hexes).toEqual(new Set(['standard', 'curve', 'fireball', 'heavy']));

    const hexCounts = plan.reduce((counts, entry) => ({
      ...counts,
      [entry.shot.hex]: (counts[entry.shot.hex] ?? 0) + 1,
    }), {});

    expect(hexCounts.standard).toBeGreaterThanOrEqual(8);
    expect(hexCounts.standard).toBeLessThanOrEqual(10);
    expect(hexCounts.curve).toBeGreaterThanOrEqual(7);
    expect(hexCounts.curve).toBeLessThanOrEqual(9);
    expect(hexCounts.fireball).toBeGreaterThanOrEqual(6);
    expect(hexCounts.fireball).toBeLessThanOrEqual(8);
    expect(hexCounts.heavy).toBeGreaterThanOrEqual(4);
    expect(hexCounts.heavy).toBeLessThanOrEqual(6);
    expect(hexCounts.heavy).toBeLessThan(hexCounts.standard);
    expect(hexCounts.heavy).toBeLessThan(hexCounts.curve);
    expect(hexCounts.heavy).toBeLessThan(hexCounts.fireball);

    for (const entry of plan.filter((shot) => shot.shot.hex === 'heavy')) {
      expect(entry.shot.originLane).toBe(entry.shot.targetLane);
      expect(entry.shot.placementHeight).toBe('low');
      expect(entry.shot.start.x).toBe(entry.shot.target.x);
      expect(['outer-left', 'outer-right']).toContain(entry.shot.targetLane);
      expect(entry.designer.pressureTags).toEqual(expect.arrayContaining(['low', 'extreme-side', 'commitment']));
    }
  });

  it('keeps the seeded plan within the PRD scope', () => {
    const plan = createShotPlan('scope-check-seed');

    expect(plan).toHaveLength(30);

    for (const entry of plan) {
      expect(entry).not.toHaveProperty('seed');
      expect(entry).not.toHaveProperty('preview');
      expect(entry).not.toHaveProperty('adaptiveDifficulty');
      expect(entry.shot).not.toHaveProperty('trajectoryHeight');
      expect(entry.designer).not.toHaveProperty('seed');
      expect(entry.designer).not.toHaveProperty('preview');
      expect(entry.designer).not.toHaveProperty('familiarTrick');
    }
  });

  it('biases post-heavy follow-ups toward the opposite side without forcing them', () => {
    const lastHeavyLeft = [{ shot: { hex: 'heavy', targetLane: 'outer-left' } }];
    const opposite = { shot: { hex: 'standard', targetLane: 'outer-right' } };
    const sameSide = { shot: { hex: 'standard', targetLane: 'outer-left' } };
    const center = { shot: { hex: 'standard', targetLane: 'center' } };

    expect(getCandidateSelectionWeight(opposite, lastHeavyLeft, 'mixed pressure')).toBeGreaterThan(getCandidateSelectionWeight(sameSide, lastHeavyLeft, 'mixed pressure'));
    expect(getCandidateSelectionWeight(opposite, lastHeavyLeft, 'chaos-but-fair')).toBeGreaterThan(getCandidateSelectionWeight(sameSide, lastHeavyLeft, 'chaos-but-fair'));
    expect(getCandidateSelectionWeight(opposite, lastHeavyLeft, 'readable variety')).toBe(1);
    expect(getCandidateSelectionWeight(center, lastHeavyLeft, 'mixed pressure')).toBeGreaterThan(1);
    expect(getCandidateSelectionWeight(sameSide, lastHeavyLeft, 'mixed pressure')).toBeLessThan(1);
  });

  it('tries the mirrored setpiece side before moving to another template', () => {
    const validator = vi.fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true);

    const entries = pickSetpieceEntries({
      index: 3,
      band: 'readable variety',
      plan: [
        { shot: { hex: 'standard', targetLane: 'inner-left' } },
        { shot: { hex: 'curve', targetLane: 'outer-left' } },
      ],
      rng: () => 0,
      planId: 'test-plan',
      hexCounts: new Map(),
      hexCountTarget: null,
      validator,
      templates: [SETPIECE_LIBRARY['curve-bait-switch'], SETPIECE_LIBRARY['same-side-pin']],
      shuffle: (items) => items,
    });

    expect(entries).not.toBeNull();
    expect(entries[0].designer.label).toBe('pin high');
    expect(entries[1].designer.label).toBe('pin low');
    expect(validator).toHaveBeenCalledTimes(6);
    expect(validator.mock.calls.map(([candidate]) => candidate.designer.label)).toEqual([
      'curve bait',
      'switchback',
      'curve bait',
      'switchback',
      'pin high',
      'pin low',
    ]);
  });

  it('keeps validating both shots before accepting a mirrored setpiece', () => {
    const validator = vi.fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true);

    const entries = pickSetpieceEntries({
      index: 3,
      band: 'readable variety',
      plan: [
        { shot: { hex: 'standard', targetLane: 'inner-left' } },
        { shot: { hex: 'curve', targetLane: 'outer-left' } },
      ],
      rng: () => 0,
      planId: 'test-plan',
      hexCounts: new Map(),
      hexCountTarget: null,
      validator,
      templates: [SETPIECE_LIBRARY['curve-bait-switch']],
      shuffle: (items) => items,
    });

    expect(entries).not.toBeNull();
    expect(entries[0].designer.label).toBe('curve bait');
    expect(entries[1].designer.label).toBe('switchback');
    expect(validator).toHaveBeenCalledTimes(4);
    expect(validator.mock.calls.map(([candidate]) => candidate.designer.label)).toEqual([
      'curve bait',
      'switchback',
      'curve bait',
      'switchback',
    ]);
  });

  it('falls back to a single isolated shot when both setpiece sides fail validation', () => {
    const validator = vi.fn().mockReturnValue(false);
    const buildIsolated = vi.fn().mockReturnValue({
      index: 4,
      shot: {
        hex: 'standard',
        originLane: 'inner-left',
        targetLane: 'inner-left',
        placementHeight: 'low',
      },
      designer: {
        label: 'fallback isolated',
      },
    });

    const slot = resolveSetpieceSlot({
      index: 4,
      band: 'readable variety',
      plan: [
        { shot: { hex: 'standard', targetLane: 'inner-left' } },
        { shot: { hex: 'curve', targetLane: 'outer-left' } },
      ],
      rng: () => 0,
      planId: 'test-plan',
      hexCounts: new Map(),
      hexCountTarget: null,
      validator,
      instantiate: () => ({
        shots: [
          {
            shot: {
              hex: 'curve',
              originLane: 'outerLeft',
              targetLane: 'innerRight',
              placementHeight: 'middle',
            },
            designer: {
              label: 'setpiece first',
              difficultyBand: 'readable variety',
              pressureTags: ['setpiece'],
              intendedFailureMode: 'fail',
            },
          },
          {
            shot: {
              hex: 'curve',
              originLane: 'outerRight',
              targetLane: 'innerLeft',
              placementHeight: 'middle',
            },
            designer: {
              label: 'setpiece second',
              difficultyBand: 'readable variety',
              pressureTags: ['setpiece'],
              intendedFailureMode: 'fail',
            },
          },
        ],
      }),
      templates: [{ shots: [] }],
      shuffle: (items) => items,
      buildIsolated,
    });

    expect(slot).toEqual({
      entries: [expect.objectContaining({ designer: expect.objectContaining({ label: 'fallback isolated' }) })],
      shotsConsumed: 1,
      slotType: 'isolated',
    });
    expect(validator).toHaveBeenCalledTimes(4);
    expect(buildIsolated).toHaveBeenCalledWith(
      4,
      'readable variety',
      expect.any(Array),
      expect.any(Function),
      'test-plan',
      expect.any(Map),
      null,
    );
  });

  it('rejects invalid generation inputs predictably', () => {
    expect(() => createShotPlan(null)).toThrow(/seed/);
    expect(() => createShotPlan('seed', { totalShots: 2 })).toThrow(/at least 3/);
    expect(() => createShotPlan('seed', { totalShots: 30.5 })).toThrow(/integer/);
  });
});
