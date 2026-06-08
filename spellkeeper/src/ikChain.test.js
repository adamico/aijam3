import { describe, expect, it } from 'vitest';
import { solveIkChain } from './ikChain.js';

const closeTo = (actual, expected, precision = 5) => expect(actual).toBeCloseTo(expected, precision);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

describe('solveIkChain', () => {
    it('places the hand on a reachable target with stable segment lengths', () => {
        const pose = solveIkChain({
            shoulder: { x: 0, y: 0 },
            target: { x: 1, y: 1 },
            upperLength: 1,
            lowerLength: 1,
        });

        closeTo(pose.hand.x, 1);
        closeTo(pose.hand.y, 1);
        closeTo(distance(pose.shoulder, pose.elbow), 1);
        closeTo(distance(pose.elbow, pose.hand), 1);
        expect(pose.isClamped).toBe(false);
        expect(Number.isFinite(pose.angles.upper)).toBe(true);
        expect(Number.isFinite(pose.angles.lower)).toBe(true);
    });

    it('clamps targets beyond max reach at full extension', () => {
        const pose = solveIkChain({
            shoulder: { x: 0, y: 0 },
            target: { x: 4, y: 0 },
            upperLength: 1,
            lowerLength: 1,
        });

        closeTo(pose.hand.x, 2);
        closeTo(pose.hand.y, 0);
        closeTo(distance(pose.shoulder, pose.hand), 2);
        expect(pose.isClamped).toBe(true);
    });

    it('returns a deterministic finite pose when target sits on the shoulder', () => {
        const pose = solveIkChain({
            shoulder: { x: 2, y: 3 },
            target: { x: 2, y: 3 },
            upperLength: 1,
            lowerLength: 1,
            fallbackDirection: { x: 0, y: 1 },
        });

        closeTo(pose.hand.x, 2);
        closeTo(pose.hand.y, 3);
        closeTo(distance(pose.shoulder, pose.elbow), 1);
        expect(Number.isFinite(pose.elbow.x)).toBe(true);
        expect(Number.isFinite(pose.elbow.y)).toBe(true);
        expect(Number.isFinite(pose.angles.upper)).toBe(true);
        expect(Number.isFinite(pose.angles.lower)).toBe(true);
    });

    it('keeps a fully extended edge case finite', () => {
        const pose = solveIkChain({
            shoulder: { x: 0, y: 0 },
            target: { x: 2, y: 0 },
            upperLength: 1,
            lowerLength: 1,
        });

        closeTo(pose.hand.x, 2);
        closeTo(pose.hand.y, 0);
        closeTo(pose.elbow.x, 1);
        closeTo(pose.elbow.y, 0);
        expect(pose.isClamped).toBe(false);
    });
});
