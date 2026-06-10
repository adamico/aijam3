import { vi, describe, it, expect } from 'vitest';
import { DEFAULT_SHOT_PLAN_SEED, createShotPlan } from './shotPlan.js';

// Mock littlejsengine BEFORE importing main.js
vi.mock('littlejsengine', () => {
    class MockVector2 {
        constructor(x = 0, y = 0) {
            this.x = x;
            this.y = y;
        }
        length() {
            return Math.hypot(this.x, this.y);
        }
        add(v) {
            return new MockVector2(this.x + v.x, this.y + v.y);
        }
        subtract(v) {
            return new MockVector2(this.x - v.x, this.y - v.y);
        }
        scale(s) {
            return new MockVector2(this.x * s, this.y * s);
        }
        lengthSquared() {
            return this.x ** 2 + this.y ** 2;
        }
        distanceSquared(v) {
            return (this.x - v.x) ** 2 + (this.y - v.y) ** 2;
        }
        dot(v) {
            return this.x * v.x + this.y * v.y;
        }
        normalize(length = 1) {
            const currentLength = this.length();
            return currentLength ? this.scale(length / currentLength) : new MockVector2(0, length);
        }
        angle() {
            return Math.atan2(this.x, this.y);
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
        clamp: (value, min = 0, max = 1) => (value < min ? min : value > max ? max : value),
        lerp: (valueA, valueB, percent) => valueA + Math.max(0, Math.min(1, percent)) * (valueB - valueA),
        Ease: {
            POWER: (n) => (x) => x ** n,
            OUT: (f) => (x) => 1 - f(1 - x),
        },
        engineInit: vi.fn(),
        mousePos: new MockVector2(0, 0),
        timeDelta: 1 / 60,
        vec2: (x, y) => new MockVector2(x, y),
        rgb: (r, g, b, a) => new MockColor(r, g, b, a),
        Color: MockColor,
        setCameraPos: vi.fn(),
        setCameraScale: vi.fn(),
        setCanvasClearColor: vi.fn(),
        setCanvasMinAspect: vi.fn(),
        setCanvasMaxAspect: vi.fn(),
        setCanvasMaxSize: vi.fn(),
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
    it('configures a 16:9 responsive canvas with a 4k backing-store cap before engine startup', async () => {
        vi.clearAllMocks();
        vi.resetModules();

        const engine = await import('littlejsengine');
        const previousWindow = globalThis.window;
        globalThis.window = {};

        try {
            await import('./main.js');
        } finally {
            if (previousWindow === undefined) {
                delete globalThis.window;
            } else {
                globalThis.window = previousWindow;
            }
        }

        expect(engine.setCanvasMinAspect).toHaveBeenCalledWith(16 / 9);
        expect(engine.setCanvasMaxAspect).toHaveBeenCalledWith(16 / 9);
        expect(engine.setCanvasMaxSize).toHaveBeenCalledWith(expect.objectContaining({ x: 3840, y: 2160 }));
        expect(engine.engineInit).toHaveBeenCalledTimes(1);
    });

    it('should initialize and render the scene without throwing exceptions', async () => {
        const { gameInit, gameRender, gameRenderPost } = await import('./main.js');
        
        expect(() => gameInit()).not.toThrow();
        expect(() => gameRender()).not.toThrow();
        expect(() => gameRenderPost()).not.toThrow();
    });

    it('derives camera scale from current canvas height on init and update', async () => {
        const engine = await import('littlejsengine');
        const { gameInit, gameUpdate } = await import('./main.js');
        vi.clearAllMocks();

        engine.mainCanvasSize.y = 720;
        gameInit({ shotPlanSeed: DEFAULT_SHOT_PLAN_SEED });
        expect(engine.setCameraScale).toHaveBeenLastCalledWith(720 / 10);

        engine.mainCanvasSize.y = 1080;
        gameUpdate();
        expect(engine.setCameraScale).toHaveBeenLastCalledWith(1080 / 10);
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

    it('shows dangling lower limbs that move with the torso instead of planting on the ground', async () => {
        const { gameInit, getFamiliarPose } = await import('./main.js');

        gameInit();
        const pose = getFamiliarPose();

        expect(pose.leftHip.x).toBeLessThan(pose.torso.x);
        expect(pose.rightHip.x).toBeGreaterThan(pose.torso.x);
        expect(pose.leftKnee.y).toBeLessThan(pose.leftHip.y);
        expect(pose.leftFoot.y).toBeLessThan(pose.leftKnee.y);
        expect(pose.rightKnee.y).toBeLessThan(pose.rightHip.y);
        expect(pose.rightFoot.y).toBeLessThan(pose.rightKnee.y);
    });

    it('exposes lower limbs as deflection save segments', async () => {
        const { gameInit, getFamiliarSaveSegments } = await import('./main.js');

        gameInit();
        expect(getFamiliarSaveSegments()).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'leftThigh', type: 'deflection' }),
            expect.objectContaining({ id: 'leftShin', type: 'deflection' }),
            expect.objectContaining({ id: 'leftFoot', type: 'deflection' }),
            expect.objectContaining({ id: 'rightThigh', type: 'deflection' }),
            expect.objectContaining({ id: 'rightShin', type: 'deflection' }),
            expect.objectContaining({ id: 'rightFoot', type: 'deflection' }),
        ]));
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
        expect(firstPose.head.y).toBeGreaterThan(firstPose.torso.y);
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

    it('spawns shots from the current match plan and advances to the next index after each resolution', async () => {
        const { gameInit, updateBallShot, getBallPose, getMatchState, getTutorialShotTelegraph } = await import('./main.js');
        const plan = createShotPlan(DEFAULT_SHOT_PLAN_SEED, { totalShots: 30 });

        gameInit({ shotPlanSeed: DEFAULT_SHOT_PLAN_SEED });

        const first = getBallPose();
        expect(first.hex).toBe(plan[0].shot.hex);
        expect(first.x).toBeCloseTo(plan[0].shot.start.x, 5);
        expect(first.y).toBeCloseTo(plan[0].shot.start.y, 5);
        expect(getMatchState().shotsTaken).toBe(0);
        expect(getTutorialShotTelegraph()).toMatchObject({
            shotIndex: 0,
            visibility: 1,
        });

        updateBallShot(999);
        expect(getMatchState().shotsTaken).toBe(1);
        expect(getTutorialShotTelegraph()).toBeNull();

        updateBallShot(0.35);
        const second = getBallPose();
        expect(second.hex).toBe(plan[1].shot.hex);
        expect(second.x).toBeCloseTo(plan[1].shot.start.x, 5);
        expect(second.y).toBeCloseTo(plan[1].shot.start.y, 5);

        expect(getTutorialShotTelegraph()).toMatchObject({
            shotIndex: 1,
        });

        updateBallShot(999);
        expect(getTutorialShotTelegraph()).toBeNull();
    });

    it('keeps shot lifecycle, aggregate counts, and score ownership separated through public orchestration', async () => {
        const {
            applyKeeperHandIk,
            applyMatchShotOutcome,
            gameInit,
            getBallPose,
            getMatchState,
            getSaveState,
            updateBallShot,
        } = await import('./main.js');
        const plan = createShotPlan(DEFAULT_SHOT_PLAN_SEED, { totalShots: 30 });

        gameInit({ shotPlanSeed: DEFAULT_SHOT_PLAN_SEED });

        const firstShot = getBallPose();
        expect(firstShot.hex).toBe(plan[0].shot.hex);
        expect(firstShot.x).toBeCloseTo(plan[0].shot.start.x, 5);
        expect(firstShot.y).toBeCloseTo(plan[0].shot.start.y, 5);

        applyKeeperHandIk({ x: -1.2, y: -3.7 });
        updateBallShot(999);

        expect(getSaveState()).toMatchObject({
            saves: 1,
            deflections: 0,
            conceded: 0,
            lastResult: {
                outcome: 'saved',
                crossedGoalPlane: true,
                saveQuality: 'clean-save',
                scoreDelta: 100,
                contactSegments: expect.arrayContaining([
                    expect.objectContaining({ id: 'leftHand', segmentType: 'glove' }),
                    expect.objectContaining({ id: 'rightHand', segmentType: 'glove' }),
                ]),
            },
            summary: {
                outcome: 'saved',
                isSave: true,
                isSaved: true,
                saveQuality: 'clean-save',
                scoreDelta: 100,
                isCleanSave: true,
                isDeflection: false,
                isConcession: false,
            },
        });
        expect(getMatchState()).toMatchObject({
            shotsTaken: 1,
            saves: 1,
            deflections: 0,
            conceded: 0,
            ongoingScore: 100,
            score: 0,
        });

        updateBallShot(0.35);

        expect(getBallPose().hex).toBe(plan[1].shot.hex);
        expect(getSaveState()).toMatchObject({
            saves: 1,
            deflections: 0,
            conceded: 0,
        });

        applyMatchShotOutcome('conceded');

        expect(getSaveState()).toMatchObject({
            saves: 1,
            deflections: 0,
            conceded: 1,
            summary: {
                outcome: 'conceded',
                isSave: false,
                isSaved: false,
                isDeflection: false,
                isConcession: true,
            },
        });
        expect(getMatchState()).toMatchObject({
            shotsTaken: 2,
            saves: 1,
            deflections: 0,
            conceded: 1,
            ongoingScore: 100,
            score: 0,
        });
    });

    it('exposes the active shot plan through a debug snapshot without rendering', async () => {
        const { gameInit, getMatchState, getShotPlanDebugInfo } = await import('./main.js');
        const expected = createShotPlan(DEFAULT_SHOT_PLAN_SEED, { totalShots: 30 });

        gameInit({ shotPlanSeed: DEFAULT_SHOT_PLAN_SEED });

        const debugPlan = getShotPlanDebugInfo();

        expect(debugPlan).toEqual(expected);
        expect(debugPlan[0].designer.label).toBe('straight warmup');
        expect(debugPlan[0].designer.pressureTags).toEqual(expect.arrayContaining(['readable', 'warmup']));

        debugPlan[0].designer.pressureTags.push('mutated');
        expect(getShotPlanDebugInfo()[0].designer.pressureTags).not.toContain('mutated');
        expect(getMatchState().shotsTaken).toBe(0);
    });

    it('uses runtime randomness only to choose the default match seed', async () => {
        const { gameInit, getShotPlanDebugInfo } = await import('./main.js');

        vi.spyOn(Date, 'now')
            .mockReturnValueOnce(1000)
            .mockReturnValueOnce(2000);
        vi.spyOn(Math, 'random')
            .mockReturnValueOnce(0.123456789)
            .mockReturnValueOnce(0.987654321);

        gameInit();
        const firstPlan = getShotPlanDebugInfo();
        gameInit();
        const secondPlan = getShotPlanDebugInfo();

        expect(firstPlan[0].designer.planId).toBeTypeOf('string');
        expect(firstPlan[0].designer.planId).not.toBe(secondPlan[0].designer.planId);
        expect(firstPlan).not.toEqual(secondPlan);

        vi.restoreAllMocks();
    });

    it('resolves a goal-plane overlap as a save when the shot crosses', async () => {
        const engine = await import('littlejsengine');
        const { gameInit, gameRenderPost, applyKeeperHandIk, getSaveState, getShotResultFeedback, updateBallShot } = await import('./main.js');

        gameInit();
        applyKeeperHandIk({ x: -1.2, y: -3.7 });
        updateBallShot(999);
        const saves = getSaveState();

        expect(saves.saves).toBe(1);
        expect(saves.conceded).toBe(0);
        expect(saves.lastResult.outcome).toBe('saved');
        expect(saves.lastResult.crossedGoalPlane).toBe(true);

        gameRenderPost();
        expect(engine.drawTextScreen).toHaveBeenCalledWith(
            'SAVE +100',
            expect.anything(),
            56,
            expect.anything(),
            5,
            expect.anything(),
        );

        expect(getShotResultFeedback('saved')).toMatchObject({ label: 'SAVE +100' });
        expect(getShotResultFeedback('deflected')).toMatchObject({ label: 'DEFLECTED +25' });
        expect(getShotResultFeedback('conceded')).toMatchObject({ label: 'GOAL +0' });
    });

    it('ends the match and renders a final score after 5 concessions', async () => {
        const engine = await import('littlejsengine');
        const { gameInit, gameRenderPost, applyMatchShotOutcome, getBallPose, getMatchState, updateBallShot } = await import('./main.js');

        gameInit();
        applyMatchShotOutcome('conceded');
        applyMatchShotOutcome('conceded');
        applyMatchShotOutcome('conceded');
        applyMatchShotOutcome('conceded');
        applyMatchShotOutcome('conceded');
        const match = getMatchState();
        const finalShot = getBallPose();

        expect(match.status).toBe('lost');
        expect(match.conceded).toBe(5);
        expect(match.shotsTaken).toBe(5);
        expect(match.score).toBe(0);

        updateBallShot(1);
        expect(getBallPose()).toEqual(finalShot);

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
