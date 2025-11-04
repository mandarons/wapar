import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173
	},
	// Timeout per test
	timeout: 30 * 1000,
	testDir: 'tests',
	retries: 2,
	// Artifacts folder where screenshots, videos, and traces are stored.
	outputDir: 'test-results/',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/,
	// Exclude integration tests
	testIgnore: /tests\/integration\/.*/
};

export default config;
