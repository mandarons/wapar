import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
    hookTimeout: 30000,
    testTimeout: 30000,
    // Make tests run serially to avoid D1 SQLITE_BUSY during local dev
    pool: 'threads',
    minThreads: 1,
    maxThreads: 1,
    fileParallelism: false,
    isolate: true,
  },
});
