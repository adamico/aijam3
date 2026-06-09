import { vi } from 'vitest';

vi.mock('littlejsengine', () => ({
  clamp: (value, min = 0, max = 1) => (value < min ? min : value > max ? max : value),
  lerp: (valueA, valueB, percent) => valueA + Math.max(0, Math.min(1, percent)) * (valueB - valueA),
  Ease: {
    POWER: (n) => (x) => x ** n,
    OUT: (f) => (x) => 1 - f(1 - x),
  },
}));
