import { defineConfig } from 'vitest/config';

// Timeout for integration tests (30 seconds for API calls)
const INTEGRATION_TEST_TIMEOUT = 30000;

export default defineConfig({
  test: {
    name: 'integration',
    globals: true,
    testTimeout: INTEGRATION_TEST_TIMEOUT,
    hookTimeout: INTEGRATION_TEST_TIMEOUT,
    environment: 'node',
  },
});
