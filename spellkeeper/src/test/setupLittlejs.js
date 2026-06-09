import { vi } from 'vitest';

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

vi.mock('littlejsengine', () => ({
  clamp: (value, min = 0, max = 1) => (value < min ? min : value > max ? max : value),
  lerp: (valueA, valueB, percent) => valueA + Math.max(0, Math.min(1, percent)) * (valueB - valueA),
  vec2: (x, y) => new MockVector2(x, y),
  Ease: {
    POWER: (n) => (x) => x ** n,
    OUT: (f) => (x) => 1 - f(1 - x),
  },
}));
