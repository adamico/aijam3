import { describe, expect, it } from 'vitest';
import {
  SETPIECE_LIBRARY,
  instantiateSetpiece,
} from './setpieces.js';

describe('setpieces', () => {
  it('exports the canonical blueprints', () => {
    expect(Object.keys(SETPIECE_LIBRARY)).toEqual([
      'heavy-bait-opposite-punish',
      'curve-bait-switch',
      'same-side-pin',
      'high-low-alternation',
    ]);
  });

  it('resolves relative lanes and curve directions from either side', () => {
    const leftHeavy = instantiateSetpiece(SETPIECE_LIBRARY['heavy-bait-opposite-punish'], 'left');
    const rightHeavy = instantiateSetpiece(SETPIECE_LIBRARY['heavy-bait-opposite-punish'], 'right');

    expect(leftHeavy.shots[0].shot.originLane).toBe('outerLeft');
    expect(leftHeavy.shots[0].shot.targetLane).toBe('outerLeft');
    expect(rightHeavy.shots[0].shot.originLane).toBe('outerRight');
    expect(rightHeavy.shots[0].shot.targetLane).toBe('outerRight');

    expect(leftHeavy.shots[1].shot.originLane).toBe('innerRight');
    expect(leftHeavy.shots[1].shot.targetLane).toBe('outerRight');
    expect(rightHeavy.shots[1].shot.originLane).toBe('innerLeft');
    expect(rightHeavy.shots[1].shot.targetLane).toBe('outerLeft');

    const leftCurve = instantiateSetpiece(SETPIECE_LIBRARY['curve-bait-switch'], 'left');
    const rightCurve = instantiateSetpiece(SETPIECE_LIBRARY['curve-bait-switch'], 'right');

    expect(leftCurve.shots[0].shot.originLane).toBe('outerLeft');
    expect(leftCurve.shots[0].shot.targetLane).toBe('innerLeft');
    expect(leftCurve.shots[0].shot.curveDirection).toBe(1);
    expect(rightCurve.shots[0].shot.originLane).toBe('outerRight');
    expect(rightCurve.shots[0].shot.targetLane).toBe('innerRight');
    expect(rightCurve.shots[0].shot.curveDirection).toBe(-1);

    expect(leftCurve.shots[1].shot.originLane).toBe('outerRight');
    expect(leftCurve.shots[1].shot.targetLane).toBe('innerRight');
    expect(leftCurve.shots[1].shot.curveDirection).toBe(-1);
    expect(rightCurve.shots[1].shot.originLane).toBe('outerLeft');
    expect(rightCurve.shots[1].shot.targetLane).toBe('innerLeft');
    expect(rightCurve.shots[1].shot.curveDirection).toBe(1);

    const leftCenter = instantiateSetpiece(SETPIECE_LIBRARY['high-low-alternation'], 'left');
    const rightCenter = instantiateSetpiece(SETPIECE_LIBRARY['high-low-alternation'], 'right');

    expect(leftCenter.shots[0].shot.originLane).toBe('center');
    expect(leftCenter.shots[0].shot.targetLane).toBe('center');
    expect(rightCenter.shots[0].shot.originLane).toBe('center');
    expect(rightCenter.shots[0].shot.targetLane).toBe('center');

    const leftPin = instantiateSetpiece(SETPIECE_LIBRARY['same-side-pin'], 'left');
    const rightPin = instantiateSetpiece(SETPIECE_LIBRARY['same-side-pin'], 'right');

    expect(leftPin.shots[0].shot.originLane).toBe('innerLeft');
    expect(leftPin.shots[1].shot.targetLane).toBe('outerLeft');
    expect(rightPin.shots[0].shot.originLane).toBe('innerRight');
    expect(rightPin.shots[1].shot.targetLane).toBe('outerRight');
  });
});
