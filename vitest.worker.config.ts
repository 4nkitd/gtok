import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['worker/**/*.test.ts'],
    environment: 'node',
    restoreMocks: true,
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
