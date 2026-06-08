import { vi, describe, it, expect } from 'vitest';
import * as LJS from 'littlejsengine';

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
});
