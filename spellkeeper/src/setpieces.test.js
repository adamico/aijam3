import { describe, expect, it } from 'vitest';
import { SETPIECE_LIBRARY, instantiateSetpiece } from './setpieces.js';

describe('setpieces', () => {
  it('resolves relative lanes and mirrored curve directions from either side', () => {
    const template = SETPIECE_LIBRARY.readable[1];
    const left = instantiateSetpiece(template, 'left');
    const right = instantiateSetpiece(template, 'right');

    expect(left.side).toBe('left');
    expect(right.side).toBe('right');
    expect(left.mirrorSide).toBe('right');
    expect(right.mirrorSide).toBe('left');

    expect(left.shots[0].shot.originLane).toBe('outerLeft');
    expect(left.shots[0].shot.targetLane).toBe('innerLeft');
    expect(left.shots[0].shot.curveDirection).toBe(1);
    expect(right.shots[0].shot.originLane).toBe('outerRight');
    expect(right.shots[0].shot.targetLane).toBe('innerRight');
    expect(right.shots[0].shot.curveDirection).toBe(-1);

    expect(left.shots[1].shot.targetLane).toBe('innerRight');
    expect(right.shots[1].shot.targetLane).toBe('innerLeft');
  });
});
