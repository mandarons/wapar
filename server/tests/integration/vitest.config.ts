import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'integration',
    globals: true,
    testTimeout: 30000, // 30 seconds for API calls
    hookTimeout: 30000,
    environment: 'node',
  },
});
