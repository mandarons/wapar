import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/e2e/**/*.test.ts'],
    exclude: ['tests/integration/**/*.test.ts'],
    globals: true,
    hookTimeout: 60000,
    testTimeout: 60000,
    // Setup files to run before tests
    setupFiles: ['./tests/setup.ts'],
    // Make tests run serially to avoid SQLITE_BUSY
    pool: 'threads',
    fileParallelism: false,
    isolate: true,
  },
});
