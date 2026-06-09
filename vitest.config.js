import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['spellkeeper/src/**/*.test.js'],
    setupFiles: './spellkeeper/src/test/setupLittlejs.js',
  },
});

