import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/e2e/**/*.test.ts'],
    globals: true,
    hookTimeout: 60000,
    testTimeout: 60000,
    // Make tests run serially to avoid D1 SQLITE_BUSY during local dev
    pool: 'threads',
    fileParallelism: false,
    isolate: true,
  },
});
