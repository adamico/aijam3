import { vi, describe, it, expect } from 'vitest';

// Mock littlejsengine BEFORE importing main.js
vi.mock('littlejsengine', () => {
    class MockVector2 {
        constructor(x = 0, y = 0) {
            this.x = x;
            this.y = y;
        }
    }
    class MockColor {
        constructor(r = 1, g = 1, b = 1, a = 1) {
            this.r = r;
            this.g = g;
            this.b = b;
            this.a = a;
        }
        isValid() {
            return true;
        }
        setHex(hex) {
            this.hex = hex;
            return this;
        }
    }
    return {
        engineInit: vi.fn(),
        mousePos: new MockVector2(0, 0),
        timeDelta: 1 / 60,
        vec2: (x, y) => new MockVector2(x, y),
        rgb: (r, g, b, a) => new MockColor(r, g, b, a),
        Color: MockColor,
        setCameraPos: vi.fn(),
        setCameraScale: vi.fn(),
        setCanvasClearColor: vi.fn(),
        drawLine: vi.fn((start, end, width, color) => {
            if (!(color instanceof MockColor)) {
                throw new Error('Assertion failed: color is invalid');
            }
        }),
        drawCircle: vi.fn((pos, radius, color) => {
            if (!(color instanceof MockColor)) {
                throw new Error('Assertion failed: color is invalid');
            }
        }),
        drawTextScreen: vi.fn((text, pos, size, color) => {
            if (!(color instanceof MockColor)) {
                throw new Error('Assertion failed: text color is invalid');
            }
        }),
        mainCanvasSize: new MockVector2(1280, 720),
    };
});

describe('Spell Keeper basic gameplay scene', () => {
    it('should initialize and render the scene without throwing exceptions', async () => {
        const { gameInit, gameRender, gameRenderPost } = await import('./main.js');
        
        expect(() => gameInit()).not.toThrow();
        expect(() => gameRender()).not.toThrow();
        expect(() => gameRenderPost()).not.toThrow();
    });

    it('moves both hands toward the pointer target, not just the keeper-left glove', async () => {
        const { applyKeeperHandIk, getFamiliarPose } = await import('./main.js');
        const target = { x: 0, y: -3.3 };

        applyKeeperHandIk(target);
        const pose = getFamiliarPose();

        expect(pose.leftHand.x).toBeCloseTo(target.x, 5);
        expect(pose.leftHand.y).toBeCloseTo(target.y, 5);
        expect(pose.rightHand.x).toBeCloseTo(target.x, 5);
        expect(pose.rightHand.y).toBeCloseTo(target.y, 5);
        expect(pose.torso.x).toBeCloseTo(0, 5);
    });

    it('drags the torso gradually when the pointer pushes beyond arm reach', async () => {
        const { applyKeeperHandIk, getFamiliarPose } = await import('./main.js');
        const target = { x: 5, y: -3.8 };

        const result = applyKeeperHandIk(target, 0.1);
        const pose = getFamiliarPose();

        expect(result.body.isDragging).toBe(true);
        expect(pose.torso.x).toBeGreaterThan(0);
        expect(pose.torso.x).toBeLessThan(result.body.desiredTorso.x);
        expect(result.body.velocity.x).toBeLessThanOrEqual(2.2);
        expect(pose.head.x).toBeCloseTo(pose.torso.x, 5);
        expect(pose.rightShoulder.x).toBeCloseTo(pose.torso.x + 0.3, 5);
    });

    it('enters a committed lateral dive on a hard threatening reach while hands keep aiming live', async () => {
        const { gameInit, updateBallShot, applyKeeperHandIk, getDiveState, getFamiliarPose } = await import('./main.js');

        gameInit();
        updateBallShot(1.0);
        const firstTarget = { x: 4.4, y: -3.4 };
        const firstResult = applyKeeperHandIk(firstTarget, 0.1);
        const firstPose = getFamiliarPose();
        const activeDive = getDiveState();

        expect(activeDive.status).toBe('diving');
        expect(activeDive.direction.x).toBeGreaterThan(0);
        expect(firstResult.dive.isActive).toBe(true);
        expect(firstPose.torso.x).toBeGreaterThan(firstResult.body.torso.x);
        expect(firstPose.torso.y).toBeGreaterThan(firstResult.body.torso.y);
        expect(firstPose.head.x).toBeGreaterThan(firstPose.torso.x);
        expect(firstResult.left.requestedTarget).toEqual(firstTarget);
        expect(firstResult.right.requestedTarget).toEqual(firstTarget);
        expect(firstPose.leftHand.x).toBeGreaterThan(firstPose.leftShoulder.x);
        expect(firstPose.rightHand.x).toBeGreaterThan(firstPose.rightShoulder.x);

        const liveTarget = { x: -0.2, y: -3.2 };
        const correctedResult = applyKeeperHandIk(liveTarget, 0.05);
        const correctedPose = getFamiliarPose();
        const committedDive = getDiveState();

        expect(committedDive.direction.x).toBeCloseTo(activeDive.direction.x);
        expect(correctedPose.torso.x).toBeGreaterThan(firstResult.body.torso.x);
        expect(correctedResult.left.requestedTarget).toEqual(liveTarget);
        expect(correctedResult.right.requestedTarget).toEqual(liveTarget);
    });

    it('does not loop/retrigger while the same hard threatening reach is held', async () => {
        const { gameInit, updateBallShot, applyKeeperHandIk, getDiveState } = await import('./main.js');

        gameInit();
        updateBallShot(1.0);
        const heldTarget = { x: 4.4, y: -3.4 };

        applyKeeperHandIk(heldTarget, 0.1);
        const firstDive = getDiveState();
        applyKeeperHandIk(heldTarget, 0.3);
        const expiredDive = getDiveState();
        applyKeeperHandIk(heldTarget, 0.05);
        const heldAfterExpiry = getDiveState();

        expect(firstDive.status).toBe('diving');
        expect(expiredDive.status).toBe('expired');
        expect(heldAfterExpiry.status).toBe('expired');
        expect(heldAfterExpiry.triggerTarget).toEqual(firstDive.triggerTarget);
    });

    it('does not enter a dive from cursor strain without shot threat', async () => {
        const { gameInit, applyKeeperHandIk, getDiveState } = await import('./main.js');

        gameInit();
        applyKeeperHandIk({ x: -4.4, y: -3.4 }, 0.1);

        expect(getDiveState().status).toBe('idle');
    });

    it('updates the active shot with orthographic size and ground shadow cues', async () => {
        const { spawnShot, updateBallShot, getBallPose } = await import('./main.js');

        spawnShot(0);
        const start = getBallPose();
        updateBallShot(0.5);
        const later = getBallPose();

        expect(later.z).toBeLessThan(start.z);
        expect(later.scale).toBe(start.scale);
        expect(later.y).toBeGreaterThan(start.y);
        expect(later.shadow.y).toBe(-5);
        expect(later.shadow.opacity).toBeLessThan(start.shadow.opacity);
        expect(later.hex).toBe('standard');
    });

    it('resolves a goal-plane overlap as a save when the shot crosses', async () => {
        const engine = await import('littlejsengine');
        const { gameInit, gameRenderPost, applyKeeperHandIk, getSaveState, updateBallShot } = await import('./main.js');

        gameInit();
        applyKeeperHandIk({ x: -1.2, y: -3.7 });
        updateBallShot(999);
        const saves = getSaveState();

        expect(saves.saves).toBe(1);
        expect(saves.conceded).toBe(0);
        expect(saves.lastResult.outcome).toBe('save');
        expect(saves.lastResult.crossedGoalPlane).toBe(true);

        gameRenderPost();
        expect(engine.drawTextScreen).toHaveBeenCalledWith(
            'SAVE!',
            expect.anything(),
            56,
            expect.anything(),
            5,
            expect.anything(),
        );
    });

    it('ends the match and renders a final score after 3 concessions', async () => {
        const engine = await import('littlejsengine');
        const { gameInit, gameRenderPost, applyMatchShotOutcome, getMatchState } = await import('./main.js');

        gameInit();
        applyMatchShotOutcome('conceded');
        applyMatchShotOutcome('conceded');
        applyMatchShotOutcome('conceded');
        const match = getMatchState();

        expect(match.status).toBe('lost');
        expect(match.conceded).toBe(3);
        expect(match.shotsTaken).toBe(3);
        expect(match.score).toBe(0);

        gameRenderPost();
        expect(engine.drawTextScreen).toHaveBeenCalledWith(
            'MATCH LOST',
            expect.anything(),
            48,
            expect.anything(),
            5,
            expect.anything(),
        );
        expect(engine.drawTextScreen).toHaveBeenCalledWith(
            `Final Score ${match.score}`,
            expect.anything(),
            32,
            expect.anything(),
            4,
            expect.anything(),
        );
    });
});
