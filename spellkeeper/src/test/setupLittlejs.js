import { vi } from 'vitest';

vi.mock('littlejsengine', () => ({
  clamp: (value, min = 0, max = 1) => (value < min ? min : value > max ? max : value),
}));
