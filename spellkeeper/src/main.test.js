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
});
